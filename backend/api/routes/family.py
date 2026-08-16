"""
Family profile routes.

WHY: Coverage is household-level. Members must exist before we can map
'my father' in a scenario to a policy.
"""

import shutil

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from api.schemas import FamilyCreate, MemberCreate
from config import get_settings
from db.database import get_db
from db.models import (
    Family, FamilyMember, Policy, PolicyFacts, PolicyExclusion,
    PolicySublimit, ProtectionFlag, ScenarioResult,
)
from services.serialize import family_dict, member_dict, policy_dict

router = APIRouter(tags=["family"])


@router.get("/family")
def list_families(db: Session = Depends(get_db)):
    families = db.query(Family).order_by(Family.created_at.desc()).all()
    return [family_dict(f) for f in families]


@router.post("/family")
def create_family(body: FamilyCreate, db: Session = Depends(get_db)):
    family = Family(name=body.name.strip())
    db.add(family)
    db.commit()
    db.refresh(family)
    return family_dict(family)


@router.post("/family/{family_id}/members")
def add_member(family_id: str, body: MemberCreate, db: Session = Depends(get_db)):
    family = db.get(Family, family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    conditions = body.known_conditions
    if isinstance(conditions, list):
        conditions = ", ".join(conditions)
    member = FamilyMember(
        family_id=family_id,
        name=body.name.strip(),
        relationship=body.relationship.strip(),
        age=body.age,
        city=body.city,
        known_conditions=conditions,
        annual_income=body.annual_income,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member_dict(member)


@router.get("/family/{family_id}")
def get_family(family_id: str, db: Session = Depends(get_db)):
    family = (
        db.query(Family)
        .options(selectinload(Family.members), selectinload(Family.policies))
        .filter(Family.id == family_id)
        .one_or_none()
    )
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return {
        "family": family_dict(family),
        "members": [member_dict(m) for m in family.members],
        "policies": [policy_dict(p) for p in family.policies],
    }


@router.delete("/reset")
def reset_all_data(db: Session = Depends(get_db)):
    """Wipe all families, members, policies, facts, flags, scenarios, uploads, and vectors."""
    settings = get_settings()

    db.query(ScenarioResult).delete()
    db.query(ProtectionFlag).delete()
    db.query(PolicySublimit).delete()
    db.query(PolicyExclusion).delete()
    db.query(PolicyFacts).delete()
    db.query(Policy).delete()
    db.query(FamilyMember).delete()
    db.query(Family).delete()
    db.commit()

    upload_dir = settings.upload_dir
    if upload_dir:
        import pathlib
        p = pathlib.Path(upload_dir)
        if p.exists():
            shutil.rmtree(p)
            p.mkdir(parents=True, exist_ok=True)

    chroma_dir = settings.chroma_path
    if chroma_dir:
        import pathlib
        p = pathlib.Path(chroma_dir)
        if p.exists():
            shutil.rmtree(p)
            p.mkdir(parents=True, exist_ok=True)

    return {"status": "ok", "message": "All data cleared"}

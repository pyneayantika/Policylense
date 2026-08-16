"""
Policy upload and fact-read routes.

WHY: Upload returns the policy_id immediately and runs the pipeline in a
background task so the frontend can poll /status for real progress.
"""

import asyncio

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from db.database import get_db
from db.models import Policy
from services.ingestion_service import IngestionService
from services.serialize import exclusion_dict, facts_dict, policy_dict, sublimit_dict

router = APIRouter(tags=["policy"])


@router.post("/family/{family_id}/policies/upload")
async def upload_policy(
    family_id: str,
    file: UploadFile = File(...),
    member_id: str = Form(...),
    policy_type: str = Form("health"),
):
    pdf_bytes = await file.read()
    filename = file.filename or "upload.pdf"

    svc = IngestionService()
    policy_stub = await svc.register_upload(
        family_id=family_id,
        member_id=member_id,
        policy_type=policy_type,
        pdf_data=pdf_bytes,
        filename=filename,
    )

    asyncio.create_task(
        svc.run_pipeline(policy_stub["id"], family_id)
    )

    return policy_stub


@router.get("/policies/{policy_id}/status")
def get_policy_status(policy_id: str, db: Session = Depends(get_db)):
    policy = db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return {
        "status": policy.ingestion_status,
        "error": policy.ingestion_error,
        "policy_id": policy.id,
    }


@router.get("/policies/{policy_id}/facts")
def get_policy_facts(policy_id: str, db: Session = Depends(get_db)):
    policy = (
        db.query(Policy)
        .options(
            selectinload(Policy.facts),
            selectinload(Policy.exclusions),
            selectinload(Policy.sublimits),
        )
        .filter(Policy.id == policy_id)
        .one_or_none()
    )
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    facts = policy.facts[0] if policy.facts else None
    return {
        "policy_facts": facts_dict(facts) if facts else None,
        "exclusions": [exclusion_dict(x) for x in policy.exclusions],
        "sublimits": [sublimit_dict(s) for s in policy.sublimits],
        "extraction_confidence": facts.confidence if facts else 0,
        "ingestion_status": policy.ingestion_status,
    }

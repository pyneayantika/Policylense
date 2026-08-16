"""
Protection dashboard orchestration.

WHY: The UI needs one JSON blob — score, members, flags — not three tables.
"""

from __future__ import annotations

from sqlalchemy.orm import selectinload

from core.rules.benchmarks import get_benchmark
from core.rules.coverage_rules import _covers_member, _health_policies, _life_policies
from core.rules.engine import RulesEngine
from db.database import SessionLocal
from db.models import Family, Policy, ProtectionFlag
from services.serialize import flag_dict, member_dict


class AnalysisService:
    """Assemble ProtectionSummary from SQLite facts and flags."""

    def get_protection_summary(self, family_id: str) -> dict:
        db = SessionLocal()
        try:
            family = (
                db.query(Family)
                .options(
                    selectinload(Family.members),
                    selectinload(Family.policies).selectinload(Policy.facts),
                    selectinload(Family.flags),
                )
                .filter(Family.id == family_id)
                .one_or_none()
            )
            if not family:
                raise ValueError(f"Family {family_id} was not found")

            flags = (
                db.query(ProtectionFlag)
                .filter(ProtectionFlag.family_id == family_id)
                .all()
            )
            if not flags:
                flags = RulesEngine(db).evaluate(family_id)

            score = RulesEngine(db).protection_score(family_id)
            names = {m.id: m.name for m in family.members}
            policies = list(family.policies)

            members_out = []
            for member in family.members:
                health = [
                    p
                    for p in _health_policies(policies)
                    if _covers_member(member, p) and p.facts
                ]
                life = [
                    p
                    for p in _life_policies(policies)
                    if _covers_member(member, p) and p.facts
                ]
                si = max((p.facts[0].sum_insured or 0) for p in health) if health else None
                sa = max((p.facts[0].sum_assured or p.facts[0].sum_insured or 0) for p in life) if life else None
                bench = get_benchmark(member.age, member.city)
                health_status = "gap_detected"
                if health and si:
                    health_status = "moderate" if bench and si < bench else "strong"
                    if any((p.facts[0].copay_percent or 0) >= 20 for p in health):
                        health_status = "moderate"
                life_status = "strong" if life else (
                    "gap_detected"
                    if (member.relationship or "").lower() in {"self", "spouse"}
                    else "moderate"
                )
                if health_status == "gap_detected" or life_status == "gap_detected":
                    overall = "gap_detected"
                elif health_status == "moderate" or life_status == "moderate":
                    overall = "moderate"
                else:
                    overall = "strong"
                members_out.append(
                    {
                        **member_dict(member),
                        "member_id": member.id,
                        "health_cover": {"sum_insured": si, "status": health_status},
                        "life_cover": {"sum_assured": sa, "status": life_status},
                        "protection_status": overall,
                    }
                )

            return {
                "overall_score": score["score"],
                "members": members_out,
                "flags": [flag_dict(f, names.get(f.member_id)) for f in flags],
                "score_breakdown": score["dimensions"],
            }
        finally:
            db.close()

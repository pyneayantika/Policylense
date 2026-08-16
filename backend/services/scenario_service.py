"""
What-if simulation orchestration.

WHY: Parse (LLM) → policies (SQLite) → clauses (RAG) → math (rules) →
narration (LLM). Mixing those in a route would let the LLM invent rupees.
"""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy.orm import selectinload

from core.llm.prompts.scenario import (
    P6_SYSTEM_PROMPT,
    P6_TEMPERATURE,
    P7_SYSTEM_PROMPT,
    P7_TEMPERATURE,
    build_narration_user_prompt,
    build_parser_user_prompt,
)
from core.llm.response_parser import parse_json_response
from core.rag.context_builder import ContextBuilder
from core.rag.runtime import get_llm_router, get_retriever
from core.rules.coverage_rules import _covers_member, _health_policies
from core.rules.financial_rules import ScenarioCalculator
from db.database import SessionLocal
from db.models import Family, FamilyMember, Policy, ScenarioResult, new_id

FATHER_KEYS = {"father", "dad", "papa", "papa ji"}
MOTHER_KEYS = {"mother", "mom", "maa", "mummy"}
SPOUSE_KEYS = {"wife", "spouse", "husband", "partner"}
CHILD_KEYS = {"child", "son", "daughter", "kid"}
SELF_KEYS = {"self", "me", "i", "myself"}


class ScenarioService:
    """Run a hospitalization (or similar) projection for a family member."""

    async def simulate(self, family_id: str, scenario_text: str) -> dict:
        return await self.simulate_scenario(family_id, scenario_text)

    async def simulate_scenario(self, family_id: str, scenario_text: str) -> dict:
        db = SessionLocal()
        try:
            family = (
                db.query(Family)
                .options(
                    selectinload(Family.members),
                    selectinload(Family.policies).selectinload(Policy.facts),
                )
                .filter(Family.id == family_id)
                .one_or_none()
            )
            if not family:
                raise ValueError(f"Family {family_id} was not found")

            parsed = await self._parse(scenario_text)
            member = _resolve_member(parsed.get("member_keyword"), list(family.members), scenario_text)
            if not member:
                raise ValueError("Could not match a family member in that scenario")

            event_type = parsed.get("event_type") or "hospitalization"
            amount = parsed.get("amount") or _heuristic_amount(scenario_text)
            if not amount:
                raise ValueError("Could not find a rupee amount in that scenario")

            policies = [
                p
                for p in _health_policies(list(family.policies))
                if _covers_member(member, p) and p.facts
            ]
            if not policies:
                policies = [p for p in _health_policies(list(family.policies)) if p.facts]
            if not policies:
                raise ValueError("No health policy facts are available for this scenario")
            policy = policies[0]
            facts = policy.facts[0]

            retriever = get_retriever()
            chunks = retriever.retrieve_with_reranking(scenario_text, family_id, k=5)
            evidence_text = ContextBuilder().build_context(chunks)
            projection = ScenarioCalculator().calculate_hospitalization(float(amount), facts)
            explanation = await self._narrate(member, event_type, amount, projection, evidence_text)

            evidence = [
                {
                    "clause": c.clause_number,
                    "text": c.text[:400],
                    "section": c.section_type,
                }
                for c in chunks
            ]
            result = {
                "scenario_type": event_type,
                "scenario_params": {
                    "member": member.name,
                    "member_id": member.id,
                    "event_type": event_type,
                    "amount": amount,
                    "treatment": parsed.get("treatment"),
                },
                "financial_projection": {
                    "eligible_amount": projection.eligible_amount,
                    "sum_insured_cap": projection.sum_insured_cap,
                    "copay_deduction": projection.copay_deduction,
                    "estimated_insurer_payout": projection.estimated_insurer_payout,
                    "estimated_out_of_pocket": projection.estimated_out_of_pocket,
                },
                "result_data": projection.as_dict(),
                "explanation": explanation,
                "caveats": projection.caveats,
                "evidence_clauses": evidence,
                "confidence": projection.confidence,
            }
            row = ScenarioResult(
                id=new_id(),
                family_id=family_id,
                scenario_type=event_type,
                scenario_params=json.dumps(result["scenario_params"]),
                result_data=json.dumps(result["financial_projection"]),
                explanation=explanation,
                evidence_clauses=json.dumps(evidence),
            )
            db.add(row)
            db.commit()
            result["id"] = row.id
            result["family_id"] = family_id
            return result
        finally:
            db.close()

    async def _parse(self, scenario_text: str) -> dict[str, Any]:
        try:
            router = get_llm_router()
            if router.has_any_provider():
                response = await router.complete(
                    P6_SYSTEM_PROMPT,
                    build_parser_user_prompt(scenario_text),
                    temperature=P6_TEMPERATURE,
                    max_tokens=400,
                    json_mode=True,
                )
                return parse_json_response(response.text)
        except Exception as exc:
            print(f"[scenario] P6 parse fallback: {exc}")
        return {
            "member_keyword": _heuristic_member_keyword(scenario_text),
            "event_type": "hospitalization"
            if "hospital" in scenario_text.lower() or "surgery" not in scenario_text.lower()
            else "surgery",
            "amount": _heuristic_amount(scenario_text),
            "treatment": None,
            "additional_context": None,
        }

    async def _narrate(self, member: FamilyMember, event_type: str, amount: float, projection, evidence: str) -> str:
        user = build_narration_user_prompt(
            member_name=member.name,
            relationship=member.relationship,
            age=member.age if member.age is not None else "unknown",
            event_type=event_type,
            amount=int(amount),
            eligible=int(projection.eligible_amount),
            si_cap=int(projection.sum_insured_cap),
            copay_pct=projection.copay_percent,
            copay_ded=int(projection.copay_deduction),
            payout=int(projection.estimated_insurer_payout),
            oop=int(projection.estimated_out_of_pocket),
            caveats="; ".join(projection.caveats),
            clauses=evidence[:2500],
        )
        try:
            router = get_llm_router()
            if router.has_any_provider():
                response = await router.complete(
                    P7_SYSTEM_PROMPT,
                    user,
                    temperature=P7_TEMPERATURE,
                    max_tokens=900,
                )
                text = (response.text or "").strip()
                if text:
                    if "indicative estimate" not in text.lower():
                        text += (
                            " This is an indicative estimate based on the policy terms identified. "
                            "Actual claim payouts are determined by the insurer during claim "
                            "adjudication and may differ."
                        )
                    return text
        except Exception as exc:
            print(f"[scenario] P7 fallback: {exc}")
        return (
            f"For {member.name}, a hospital bill of Rs {int(amount):,} may first be capped at the "
            f"extracted sum insured of Rs {int(projection.sum_insured_cap):,}. A co-payment of "
            f"{projection.copay_percent:g}% could then reduce the insurer share by "
            f"Rs {int(projection.copay_deduction):,}, leaving an indicative payout of "
            f"Rs {int(projection.estimated_insurer_payout):,} and out-of-pocket of "
            f"Rs {int(projection.estimated_out_of_pocket):,}. "
            + " ".join(projection.caveats)
            + " This is an indicative estimate based on the policy terms identified. "
            "Actual claim payouts are determined by the insurer during claim adjudication and may differ."
        )


def _heuristic_member_keyword(text: str) -> str | None:
    lowered = text.lower()
    for keys, label in (
        (FATHER_KEYS, "father"),
        (MOTHER_KEYS, "mother"),
        (SPOUSE_KEYS, "wife"),
        (CHILD_KEYS, "child"),
        (SELF_KEYS, "self"),
    ):
        if any(re.search(rf"\b{re.escape(k)}\b", lowered) for k in keys):
            return label
    return None


def _heuristic_amount(text: str) -> float | None:
    lowered = text.lower().replace(",", "")
    crore = re.search(r"(\d+(?:\.\d+)?)\s*(?:cr|crore)\b", lowered)
    if crore:
        return float(crore.group(1)) * 10_000_000
    lakh = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)\b", lowered)
    if lakh:
        return float(lakh.group(1)) * 100_000
    rupee = re.search(r"(?:₹|rs\.?)\s*([\d,]+)", text, re.I)
    if rupee:
        return float(rupee.group(1).replace(",", ""))
    plain = re.search(r"\b(\d{5,8})\b", lowered)
    if plain:
        return float(plain.group(1))
    return None


def _resolve_member(keyword: str | None, members: list[FamilyMember], text: str) -> FamilyMember | None:
    key = (keyword or _heuristic_member_keyword(text) or "").lower()
    by_rel = { (m.relationship or "").lower(): m for m in members }

    def parents():
        return [m for m in members if (m.relationship or "").lower().startswith("parent")]

    if key in FATHER_KEYS or key == "father":
        return by_rel.get("parent_1") or (parents()[0] if parents() else None)
    if key in MOTHER_KEYS or key == "mother":
        return by_rel.get("parent_2") or (parents()[-1] if parents() else None)
    if key == "husband":
        return by_rel.get("self") or by_rel.get("spouse")
    if key in SPOUSE_KEYS or key in {"wife", "spouse"}:
        return by_rel.get("spouse")
    if key in CHILD_KEYS or key == "child":
        return by_rel.get("child") or next(
            (m for m in members if (m.relationship or "").lower() == "child"), None
        )
    if key in SELF_KEYS or key == "self":
        return by_rel.get("self")
    lowered = text.lower()
    for member in members:
        if member.name.lower() in lowered:
            return member
    return by_rel.get("self") or (members[0] if members else None)

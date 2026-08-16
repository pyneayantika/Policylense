"""
LLM structured extraction from key policy chunks.

WHY: Prose is not computable. This step is the only place the LLM is allowed
to turn wording into numbers — still extract-only, never calculate.
"""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy.orm import Session

from core.chunking.models import PolicyChunk
from core.extraction.schemas import ExclusionItem, PolicyFactsRaw, PolicyFactsValidated, SublimitItem
from core.extraction.validator import ExtractionValidator
from core.llm.exceptions import ExtractionError
from core.llm.prompts.extraction import (
    P1_SYSTEM_PROMPT,
    P1_TEMPERATURE,
    P1_USER_TEMPLATE,
    P3_SYSTEM_PROMPT,
    P3_TEMPERATURE,
    P4_SYSTEM_PROMPT,
    P4_TEMPERATURE,
)
from core.llm.provider import LLMRouter
from core.llm.response_parser import parse_json_array, parse_json_response
from db.models import PolicyExclusion, PolicyFacts, PolicySublimit, new_id

SECTION_PRIORITY = [
    "coverage",
    "copay",
    "waiting_period",
    "sublimits",
    "exclusions",
    "renewal",
]


def _tokens(text: str) -> int:
    return max(1, len(text.split()))


class PolicyFactExtractor:
    """Select coverage/copay/waiting chunks, call P1, parse JSON, persist."""

    def __init__(self, router: LLMRouter | None = None) -> None:
        self.router = router or LLMRouter()
        self.validator = ExtractionValidator()

    def select_text(self, chunks: list[Any], max_tokens: int) -> str:
        ordered = sorted(
            chunks,
            key=lambda c: (
                SECTION_PRIORITY.index(self._section_type(c))
                if self._section_type(c) in SECTION_PRIORITY
                else 99
            ),
        )
        parts: list[str] = []
        used = 0
        for chunk in ordered:
            text = self._text(chunk).strip()
            if not text:
                continue
            n = _tokens(text)
            if used + n > max_tokens and parts:
                break
            header = self._section_type(chunk)
            parts.append(f"[{header}]\n{text}")
            used += n
        return "\n\n".join(parts)

    async def extract_facts(
        self, policy_id: str, chunks: list[Any]
    ) -> PolicyFactsValidated:
        budget = self.router.token_budget()
        section_text = self.select_text(chunks, budget)
        if not section_text:
            raise ExtractionError("No chunk text to extract from", raw_text="")

        last_error: Exception | None = None
        for attempt in range(1, 4):
            user = P1_USER_TEMPLATE.format(policy_section_text=section_text)
            if attempt > 1:
                user += "\n\nIMPORTANT: Return ONLY a valid JSON object. No markdown fences."
            try:
                response = await self.router.complete(
                    P1_SYSTEM_PROMPT,
                    user,
                    temperature=P1_TEMPERATURE,
                    max_tokens=2000,
                    json_mode=True,
                )
                parsed = parse_json_response(response.text)
                raw = PolicyFactsRaw.model_validate(parsed)
                validated = self.validator.validate(raw)
                print(
                    f"[extract] P1 attempt {attempt} ok "
                    f"band={validated.confidence_band} confidence={validated.confidence:.2f}"
                )
                return validated
            except (ExtractionError, Exception) as exc:
                last_error = exc
                preview = ""
                if hasattr(exc, "raw_text") and exc.raw_text:
                    preview = repr(exc.raw_text[:240])
                print(f"[extract] P1 attempt {attempt} failed: {exc} {preview}")
        print("[extract] LLM JSON failed; using clause-text heuristic fallback")
        try:
            heur = _heuristic_facts(section_text)
            raw = PolicyFactsRaw.model_validate(heur)
            return self.validator.validate(raw)
        except Exception:
            raise ExtractionError(
                f"Fact extraction failed after 3 attempts: {last_error}",
                raw_text=getattr(last_error, "raw_text", ""),
            ) from last_error

    async def extract_exclusions(self, chunks: list[Any]) -> list[ExclusionItem]:
        text = self.select_text(
            [c for c in chunks if self._section_type(c) in {"exclusions", "waiting_period"}],
            4000,
        ) or self.select_text(chunks, 4000)
        response = await self.router.complete(
            P3_SYSTEM_PROMPT,
            f"Extract exclusions from:\n{text}",
            temperature=P3_TEMPERATURE,
            max_tokens=2500,
            json_mode=True,
        )
        items = parse_json_array(response.text)
        return [ExclusionItem.model_validate(item) for item in items if isinstance(item, dict)]

    async def extract_sublimits(self, chunks: list[Any]) -> list[SublimitItem]:
        text = self.select_text(
            [c for c in chunks if self._section_type(c) in {"sublimits", "coverage", "copay"}],
            4000,
        ) or self.select_text(chunks, 4000)
        response = await self.router.complete(
            P4_SYSTEM_PROMPT,
            f"Extract sub-limits from:\n{text}",
            temperature=P4_TEMPERATURE,
            max_tokens=1500,
            json_mode=True,
        )
        items = parse_json_array(response.text)
        return [SublimitItem.model_validate(item) for item in items if isinstance(item, dict)]

    def persist(
        self,
        db: Session,
        policy_id: str,
        facts: PolicyFactsValidated,
        exclusions: list[ExclusionItem] | None = None,
        sublimits: list[SublimitItem] | None = None,
    ) -> PolicyFacts:
        db.query(PolicyFacts).filter(PolicyFacts.policy_id == policy_id).delete()
        row = PolicyFacts(
            id=new_id(),
            policy_id=policy_id,
            fact_type=facts.policy_type or "health",
            # Health fields
            sum_insured=facts.sum_insured,
            room_rent_limit=facts.room_rent_limit,
            room_rent_type=facts.room_rent_type,
            copay_percent=facts.copay_percent,
            copay_condition=facts.copay_condition,
            deductible=facts.deductible,
            ped_waiting_months=facts.ped_waiting_months,
            initial_waiting_months=facts.initial_waiting_months,
            specific_waiting_months=facts.specific_disease_waiting_months,
            icu_limit=facts.icu_limit,
            icu_limit_type=facts.icu_limit_type,
            network_required=bool(facts.network_hospital_required),
            pre_auth_required=bool(facts.pre_authorization_required),
            covers_members=json.dumps(facts.covers_members) if facts.covers_members else None,
            cover_basis=facts.cover_basis,
            cumulative_bonus_percent=facts.cumulative_bonus_percent,
            cumulative_bonus_max_percent=facts.cumulative_bonus_max_percent,
            restoration_benefit=facts.restoration_benefit,
            pre_hospitalization_days=facts.pre_hospitalization_days,
            post_hospitalization_days=facts.post_hospitalization_days,
            day_care_covered=facts.day_care_covered,
            ambulance_cover=facts.ambulance_cover,
            ayush_covered=facts.ayush_covered,
            modern_treatments_covered=facts.modern_treatments_covered,
            # Life fields
            sum_assured=facts.sum_assured,
            cover_type=facts.cover_type,
            payout_type=facts.payout_type,
            policy_term_years=facts.policy_term_years,
            premium_paying_term_years=facts.premium_paying_term_years,
            riders=json.dumps(facts.riders) if facts.riders else None,
            premium_waiver=facts.premium_waiver,
            accidental_death_benefit=facts.accidental_death_benefit,
            critical_illness_cover=facts.critical_illness_cover,
            maturity_benefit=facts.maturity_benefit,
            surrender_value_available=facts.surrender_value_available,
            loan_available=facts.loan_available,
            confidence=facts.confidence,
            extraction_notes=facts.extraction_notes,
        )
        db.add(row)

        if exclusions is not None:
            db.query(PolicyExclusion).filter(PolicyExclusion.policy_id == policy_id).delete()
            for item in exclusions:
                db.add(
                    PolicyExclusion(
                        id=new_id(),
                        policy_id=policy_id,
                        exclusion_text=item.exclusion_text,
                        exclusion_type=item.exclusion_type,
                        waiting_months=item.waiting_months,
                        waiting_tier=item.waiting_tier,
                        condition=item.condition,
                        source_clause=item.source_clause,
                        confidence=facts.confidence,
                    )
                )
        if sublimits is not None:
            db.query(PolicySublimit).filter(PolicySublimit.policy_id == policy_id).delete()
            for item in sublimits:
                db.add(
                    PolicySublimit(
                        id=new_id(),
                        policy_id=policy_id,
                        treatment_type=item.treatment_type,
                        limit_amount=item.limit_amount,
                        limit_type=item.limit_type,
                        limit_value=item.limit_value,
                        description=item.description,
                        source_clause=item.source_clause,
                        confidence=facts.confidence,
                    )
                )
        db.commit()
        db.refresh(row)
        print(f"[extract] stored facts id={row.id} for policy {policy_id}")
        return row

    def _section_type(self, chunk: Any) -> str:
        if isinstance(chunk, PolicyChunk):
            return chunk.section_type or ""
        if isinstance(chunk, dict):
            return str(chunk.get("section_type") or "")
        return getattr(chunk, "section_type", "") or ""

    def _text(self, chunk: Any) -> str:
        if isinstance(chunk, PolicyChunk):
            return chunk.text
        if isinstance(chunk, dict):
            return str(chunk.get("text") or "")
        return getattr(chunk, "text", "") or ""


def _detect_policy_type(text: str) -> str:
    tl = text.lower()
    life_signals = sum(1 for kw in [
        "sum assured", "death benefit", "maturity benefit", "policy term",
        "nominee", "mortality", "surrender value", "life assured",
    ] if kw in tl)
    health_signals = sum(1 for kw in [
        "sum insured", "hospitalization", "room rent", "copay", "co-pay",
        "cashless", "waiting period", "day care", "network hospital",
    ] if kw in tl)
    return "life" if life_signals > health_signals else "health"


def _heuristic_facts(text: str) -> dict:
    """Last-resort numbers from clause text when the LLM returns non-JSON."""
    policy_type = _detect_policy_type(text)

    if policy_type == "life":
        sa = None
        match = re.search(r"sum assured[^\d]{0,30}₹?\s*([\d,]+)", text, re.I)
        if not match:
            match = re.search(r"death benefit[^\d]{0,30}₹?\s*([\d,]+)", text, re.I)
        if match:
            sa = float(match.group(1).replace(",", ""))
        term = None
        match = re.search(r"policy term[^\d]{0,20}(\d+)\s*years", text, re.I)
        if match:
            term = int(match.group(1))
        cover_type = None
        tl = text.lower()
        if "term" in tl and "endowment" not in tl:
            cover_type = "term"
        elif "endowment" in tl:
            cover_type = "endowment"
        elif "whole life" in tl:
            cover_type = "whole_life"
        elif "ulip" in tl:
            cover_type = "ulip"
        return {
            "policy_type": "life",
            "sum_assured": sa,
            "cover_type": cover_type,
            "policy_term_years": term,
            "maturity_benefit": "maturity" in tl,
            "premium_waiver": "waiver of premium" in tl or "premium waiver" in tl,
            "confidence": 0.5,
            "extraction_notes": "Heuristic fallback for life policy after LLM JSON parse failure.",
        }

    si = None
    match = re.search(r"sum insured of\s*₹?\s*([\d,]+)", text, re.I)
    if not match:
        match = re.search(r"₹\s*([\d,]{5,})", text)
    if match:
        si = float(match.group(1).replace(",", ""))
    copay = None
    match = re.search(r"co-payment of\s*(\d+(?:\.\d+)?)\s*%", text, re.I)
    if match:
        copay = float(match.group(1))
    room = None
    match = re.search(r"₹\s*([\d,]+)\s*per day", text, re.I)
    if match:
        room = float(match.group(1).replace(",", ""))
    ped = None
    match = re.search(r"(\d+)\s*consecutive months", text, re.I)
    if match:
        ped = int(match.group(1))
    initial = 1 if re.search(r"30 days", text, re.I) else None
    specific = None
    match = re.search(r"expiry of\s*(\d+)\s*months", text, re.I)
    if match:
        specific = int(match.group(1))
    ambulance = None
    match = re.search(r"ambulance[^\d]{0,40}₹\s*([\d,]+)", text, re.I)
    if match:
        ambulance = float(match.group(1).replace(",", ""))
    pre_h = None
    match = re.search(r"(\d+)\s*days prior", text, re.I)
    if match:
        pre_h = int(match.group(1))
    return {
        "policy_type": "health",
        "sum_insured": si,
        "copay_percent": copay,
        "room_rent_limit": room,
        "room_rent_type": "per_day" if room else None,
        "ped_waiting_months": ped,
        "initial_waiting_months": initial,
        "specific_disease_waiting_months": specific,
        "ambulance_cover": ambulance,
        "pre_hospitalization_days": pre_h,
        "network_hospital_required": "network" in text.lower(),
        "pre_authorization_required": "pre-authorization" in text.lower()
        or "pre-authorisation" in text.lower(),
        "cashless_available": "cashless" in text.lower(),
        "confidence": 0.7,
        "extraction_notes": "Heuristic fallback after LLM JSON parse failure.",
    }

"""Turn ORM rows into JSON the frontend already expects."""

from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from db.models import Family, FamilyMember, Policy, PolicyExclusion, PolicyFacts, PolicySublimit, ProtectionFlag


def _parse_json_field(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _iso(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return value.isoformat()


def family_dict(family: Family) -> dict[str, Any]:
    return {
        "id": family.id,
        "name": family.name,
        "created_at": _iso(family.created_at),
        "updated_at": _iso(family.updated_at),
    }


def member_dict(member: FamilyMember) -> dict[str, Any]:
    return {
        "id": member.id,
        "family_id": member.family_id,
        "name": member.name,
        "relationship": member.relationship,
        "age": member.age,
        "city": member.city,
        "known_conditions": member.known_conditions,
        "annual_income": member.annual_income,
        "created_at": _iso(member.created_at),
    }


def policy_dict(policy: Policy) -> dict[str, Any]:
    return {
        "id": policy.id,
        "family_id": policy.family_id,
        "member_id": policy.member_id,
        "policy_type": policy.policy_type,
        "insurer_name": policy.insurer_name,
        "product_name": policy.product_name,
        "policy_number": policy.policy_number,
        "start_date": _iso(policy.start_date),
        "end_date": _iso(policy.end_date),
        "premium": policy.premium,
        "status": policy.status,
        "pdf_filename": policy.pdf_filename,
        "ingestion_status": policy.ingestion_status,
        "ingestion_error": getattr(policy, "ingestion_error", None),
        "created_at": _iso(policy.created_at),
    }


def facts_dict(facts: PolicyFacts) -> dict[str, Any]:
    covers = facts.covers_members
    if covers:
        try:
            covers = json.loads(covers)
        except json.JSONDecodeError:
            pass
    return {
        "id": facts.id,
        "policy_id": facts.policy_id,
        "fact_type": facts.fact_type,
        "sum_insured": facts.sum_insured,
        "room_rent_limit": facts.room_rent_limit,
        "room_rent_type": facts.room_rent_type,
        "copay_percent": facts.copay_percent,
        "copay_condition": facts.copay_condition,
        "deductible": facts.deductible,
        "ped_waiting_months": facts.ped_waiting_months,
        "initial_waiting_months": facts.initial_waiting_months,
        "specific_waiting_months": facts.specific_waiting_months,
        "icu_limit": facts.icu_limit,
        "icu_limit_type": facts.icu_limit_type,
        "network_required": facts.network_required,
        "pre_auth_required": facts.pre_auth_required,
        "sum_assured": facts.sum_assured,
        "cover_type": facts.cover_type,
        "payout_type": facts.payout_type,
        "policy_term_years": facts.policy_term_years,
        "premium_paying_term_years": facts.premium_paying_term_years,
        "riders": _parse_json_field(facts.riders),
        "premium_waiver": facts.premium_waiver,
        "accidental_death_benefit": facts.accidental_death_benefit,
        "critical_illness_cover": facts.critical_illness_cover,
        "maturity_benefit": facts.maturity_benefit,
        "surrender_value_available": facts.surrender_value_available,
        "loan_available": facts.loan_available,
        "covers_members": covers,
        "cover_basis": facts.cover_basis,
        "confidence": facts.confidence,
        "extraction_notes": facts.extraction_notes,
        "ambulance_cover": facts.ambulance_cover,
        "pre_hospitalization_days": facts.pre_hospitalization_days,
        "post_hospitalization_days": facts.post_hospitalization_days,
    }


def exclusion_dict(item: PolicyExclusion) -> dict[str, Any]:
    return {
        "id": item.id,
        "policy_id": item.policy_id,
        "exclusion_text": item.exclusion_text,
        "exclusion_type": item.exclusion_type,
        "waiting_months": item.waiting_months,
        "waiting_tier": item.waiting_tier,
        "condition": item.condition,
        "source_clause": item.source_clause,
        "confidence": item.confidence,
    }


def sublimit_dict(item: PolicySublimit) -> dict[str, Any]:
    return {
        "id": item.id,
        "policy_id": item.policy_id,
        "treatment_type": item.treatment_type,
        "limit_amount": item.limit_amount,
        "limit_type": item.limit_type,
        "limit_value": item.limit_value,
        "description": item.description,
        "source_clause": item.source_clause,
        "confidence": item.confidence,
    }


def flag_dict(flag: ProtectionFlag, member_name: str | None = None) -> dict[str, Any]:
    data = flag.calculated_data
    if data:
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            pass
    return {
        "id": flag.id,
        "family_id": flag.family_id,
        "member_id": flag.member_id,
        "policy_id": flag.policy_id,
        "flag_type": flag.flag_type,
        "severity": flag.severity,
        "title": flag.title,
        "description": flag.description,
        "evidence_clauses": flag.evidence_clauses,
        "calculated_data": data,
        "member_name": member_name,
        "created_at": _iso(flag.created_at),
    }

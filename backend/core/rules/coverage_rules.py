"""
Coverage existence rules.

WHY: A member with no health policy is a different problem from a low sum
insured. Flag 'no cover' first.
"""

from __future__ import annotations

import json
from typing import Any

from core.rules.benchmarks import get_benchmark
from db.models import FamilyMember, Policy, PolicyFacts


def _covers_member(member: FamilyMember, policy: Policy) -> bool:
    if policy.member_id and policy.member_id == member.id:
        return True
    facts = policy.facts[0] if policy.facts else None
    if facts and facts.cover_basis == "floater" and policy.family_id == member.family_id:
        return True
    if facts and facts.covers_members:
        try:
            names = json.loads(facts.covers_members)
        except json.JSONDecodeError:
            names = [p.strip() for p in facts.covers_members.split(",")]
        rel = (member.relationship or "").lower()
        aliases = {rel, rel.replace("_1", "").replace("_2", "")}
        if rel.startswith("parent"):
            aliases.add("parent")
        return any(str(n).lower() in aliases for n in names)
    return False


def _health_policies(policies: list[Policy]) -> list[Policy]:
    return [p for p in policies if (p.policy_type or "").lower() == "health" and p.status != "inactive"]


def _life_policies(policies: list[Policy]) -> list[Policy]:
    return [p for p in policies if (p.policy_type or "").lower() == "life" and p.status != "inactive"]


def _flag(
    flag_type: str,
    severity: str,
    title: str,
    description: str,
    member: FamilyMember,
    policy: Policy | None = None,
    calculated: dict | None = None,
    evidence: str | None = None,
) -> dict[str, Any]:
    return {
        "flag_type": flag_type,
        "severity": severity,
        "title": title,
        "description": description,
        "member_id": member.id,
        "policy_id": policy.id if policy else None,
        "calculated_data": json.dumps(calculated) if calculated else None,
        "evidence_clauses": evidence,
    }


class CoverageGapRules:
    """Detect missing health cover and missing life cover for earners."""

    def no_health_cover(self, member: FamilyMember, policies: list[Policy]) -> dict | None:
        covered = [p for p in _health_policies(policies) if _covers_member(member, p)]
        if covered:
            return None
        return _flag(
            "no_health_cover",
            "critical",
            f"No health policy appears to cover {member.name}",
            (
                f"{member.name} ({member.relationship}) may not currently be listed on an "
                f"active health policy in this household. This is a potential coverage gap "
                f"to verify against the policy schedule."
            ),
            member,
        )

    def no_life_cover_for_earner(self, member: FamilyMember, policies: list[Policy]) -> dict | None:
        rel = (member.relationship or "").lower()
        is_earner_role = rel in {"self", "spouse"}
        has_income = bool(member.annual_income and member.annual_income > 0)
        if not is_earner_role:
            return None
        if not has_income and rel != "spouse":
            return None
        covered = [p for p in _life_policies(policies) if _covers_member(member, p)]
        if covered:
            return None
        severity = "critical" if has_income else "warning"
        return _flag(
            "no_life_cover",
            severity,
            f"No life policy appears to cover {member.name}",
            (
                f"{member.name} is listed as {member.relationship}"
                f"{' with reported income' if has_income else ''}. "
                f"No life cover was found for this member. This may be a potential gap "
                f"to confirm against existing life policies not yet uploaded."
            ),
            member,
            calculated={"annual_income": member.annual_income},
        )

    def life_cover_adequacy(
        self,
        member: FamilyMember,
        facts: PolicyFacts,
        policy: Policy,
    ) -> dict | None:
        sa = facts.sum_assured or facts.sum_insured
        if sa is None or not member.annual_income:
            return None
        multiple = sa / member.annual_income
        if multiple >= 10:
            return None
        severity = "critical" if multiple < 5 else "warning"
        return _flag(
            "life_cover_low",
            severity,
            f"Life cover for {member.name} may be below recommended level",
            (
                f"The extracted sum assured is ₹{int(sa):,}, which is roughly "
                f"{multiple:.1f}x annual income. A common guideline suggests "
                f"10-15x annual income. Actual needs depend on liabilities and "
                f"dependants; this is an indicative flag."
            ),
            member,
            policy,
            calculated={
                "sum_assured": sa,
                "annual_income": member.annual_income,
                "multiple": round(multiple, 1),
            },
        )

    def life_missing_riders(
        self,
        member: FamilyMember,
        facts: PolicyFacts,
        policy: Policy,
    ) -> list[dict]:
        flags = []
        riders_raw = facts.riders
        rider_names = []
        if riders_raw:
            try:
                rider_names = [r.lower() for r in json.loads(riders_raw)]
            except json.JSONDecodeError:
                rider_names = [riders_raw.lower()]

        has_waiver = facts.premium_waiver or any("waiver" in r for r in rider_names)
        has_accident = (facts.accidental_death_benefit is not None) or any(
            "accidental" in r or "accident" in r for r in rider_names
        )

        if not has_waiver:
            flags.append(_flag(
                "no_premium_waiver",
                "info",
                f"No premium waiver rider found for {member.name}",
                (
                    "A waiver of premium rider ensures the policy stays active if the "
                    "policyholder becomes disabled or critically ill and cannot pay premiums. "
                    "Check if this rider is available with your insurer."
                ),
                member,
                policy,
            ))
        if not has_accident:
            flags.append(_flag(
                "no_accidental_death_rider",
                "info",
                f"No accidental death benefit rider found for {member.name}",
                (
                    "An accidental death benefit rider provides additional payout beyond "
                    "the base sum assured in case of accidental death. This is a commonly "
                    "recommended add-on for term policies."
                ),
                member,
                policy,
            ))
        return flags

    def sum_insured_vs_benchmark(
        self,
        member: FamilyMember,
        facts: PolicyFacts,
        city: str | None,
        policy: Policy | None = None,
    ) -> dict | None:
        if facts.sum_insured is None:
            return None
        benchmark = get_benchmark(member.age, city or member.city)
        if benchmark is None:
            return None
        if facts.sum_insured >= benchmark:
            return None
        return _flag(
            "si_below_benchmark",
            "warning",
            f"Sum insured for {member.name} may sit below an indicative benchmark",
            (
                f"The extracted sum insured is ₹{int(facts.sum_insured):,}. An indicative "
                f"benchmark for age {member.age} in this city tier is ₹{benchmark:,}. "
                f"Actual needs may differ; this is not a finding that cover is inadequate."
            ),
            member,
            policy,
            calculated={
                "sum_insured": facts.sum_insured,
                "benchmark": benchmark,
                "age": member.age,
                "city": city or member.city,
            },
            evidence="Sum Insured clause / policy schedule",
        )

"""
Rules engine orchestrator.

WHY: Gap detection must be deterministic and testable. The LLM explains flags;
it does not decide them.
"""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session, selectinload

from core.rules.claim_readiness import ClaimReadinessRules
from core.rules.coverage_rules import CoverageGapRules, _covers_member, _health_policies, _life_policies
from core.rules.financial_rules import CopayRules, WaitingPeriodRules
from core.rules.benchmarks import get_benchmark
from db.database import SessionLocal
from db.models import Family, Policy, ProtectionFlag, new_id

SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}

WEIGHTS = {
    "health_exists": 25,
    "life_exists": 20,
    "si_adequacy": 20,
    "low_copay": 10,
    "no_active_waiting": 10,
    "low_sublimit": 10,
    "claim_ready": 5,
}


class RulesEngine:
    """Load family + facts, run rule sets, persist ProtectionFlags, score 0-100."""

    def __init__(self, db: Session | None = None) -> None:
        self._db = db
        self.coverage = CoverageGapRules()
        self.copay = CopayRules()
        self.waiting = WaitingPeriodRules()
        self.claim = ClaimReadinessRules()

    def evaluate(self, family_id: str) -> list[ProtectionFlag]:
        db = self._db or SessionLocal()
        owns = self._db is None
        try:
            family = (
                db.query(Family)
                .options(
                    selectinload(Family.members),
                    selectinload(Family.policies).selectinload(Policy.facts),
                    selectinload(Family.policies).selectinload(Policy.sublimits),
                )
                .filter(Family.id == family_id)
                .one()
            )
            flags: list[dict[str, Any]] = []
            policies = list(family.policies)
            copay_done: set[str] = set()
            waiting_done: set[str] = set()
            claim_done: set[str] = set()
            for member in family.members:
                gap = self.coverage.no_health_cover(member, policies)
                if gap:
                    flags.append(gap)
                life = self.coverage.no_life_cover_for_earner(member, policies)
                if life:
                    flags.append(life)
                for policy in _health_policies(policies):
                    if not _covers_member(member, policy):
                        continue
                    facts = policy.facts[0] if policy.facts else None
                    if not facts:
                        continue
                    si_flag = self.coverage.sum_insured_vs_benchmark(
                        member, facts, member.city, policy
                    )
                    if si_flag:
                        flags.append(si_flag)
                    if policy.id not in copay_done:
                        copay_flag = self.copay.copay_exposure(facts, member, policy)
                        if copay_flag:
                            flags.append(copay_flag)
                        copay_done.add(policy.id)
                    if policy.id not in waiting_done:
                        wait_flag = self.waiting.ped_waiting_active(facts, policy, member)
                        if wait_flag:
                            flags.append(wait_flag)
                        waiting_done.add(policy.id)
                    if policy.id not in claim_done:
                        flags.extend(self.claim.evaluate(facts, member, policy))
                        claim_done.add(policy.id)
                life_done: set[str] = set()
                for policy in _life_policies(policies):
                    if not _covers_member(member, policy):
                        continue
                    facts = policy.facts[0] if policy.facts else None
                    if not facts:
                        continue
                    if policy.id not in life_done:
                        adequacy = self.coverage.life_cover_adequacy(member, facts, policy)
                        if adequacy:
                            flags.append(adequacy)
                        flags.extend(self.coverage.life_missing_riders(member, facts, policy))
                        life_done.add(policy.id)

            flags.sort(key=lambda f: SEVERITY_ORDER.get(f["severity"], 9))
            db.query(ProtectionFlag).filter(ProtectionFlag.family_id == family_id).delete()
            rows: list[ProtectionFlag] = []
            for item in flags:
                row = ProtectionFlag(
                    id=new_id(),
                    family_id=family_id,
                    member_id=item.get("member_id"),
                    policy_id=item.get("policy_id"),
                    flag_type=item["flag_type"],
                    severity=item["severity"],
                    title=item["title"],
                    description=item.get("description"),
                    evidence_clauses=item.get("evidence_clauses"),
                    calculated_data=item.get("calculated_data"),
                )
                db.add(row)
                rows.append(row)
            db.commit()
            for row in rows:
                db.refresh(row)
            print(f"[rules] {len(rows)} flags for family {family_id}")
            return rows
        finally:
            if owns:
                db.close()

    def calculate_score(self, family_id: str) -> int:
        return int(self.protection_score(family_id)["score"])

    def protection_score(self, family_id: str) -> dict[str, Any]:
        db = self._db or SessionLocal()
        owns = self._db is None
        try:
            family = (
                db.query(Family)
                .options(
                    selectinload(Family.members),
                    selectinload(Family.policies).selectinload(Policy.facts),
                    selectinload(Family.policies).selectinload(Policy.sublimits),
                )
                .filter(Family.id == family_id)
                .one()
            )
            members = list(family.members)
            policies = list(family.policies)
            dims = {
                "health_exists": _health_cover_dimension(members, policies),
                "life_exists": _life_cover_dimension(members, policies),
                "si_adequacy": _si_dimension(members, policies),
                "low_copay": _copay_dimension(policies),
                "no_active_waiting": _waiting_dimension(policies),
                "low_sublimit": _sublimit_dimension(policies),
                "claim_ready": _claim_dimension(policies),
            }
            score = round(sum(dims[k] * WEIGHTS[k] / 100 for k in WEIGHTS))
            return {"score": int(score), "dimensions": dims, "weights": WEIGHTS}
        finally:
            if owns:
                db.close()


def _health_cover_dimension(members, policies) -> float:
    if not members:
        return 0
    covered = sum(
        1
        for m in members
        if any(_covers_member(m, p) for p in _health_policies(policies))
    )
    return 100.0 * covered / len(members)


def _life_cover_dimension(members, policies) -> float:
    earners = [
        m
        for m in members
        if (m.relationship or "").lower() in {"self", "spouse"}
        and m.annual_income
        and m.annual_income > 0
    ]
    if not earners:
        return 100.0
    scores: list[float] = []
    for m in earners:
        life = [p for p in _life_policies(policies) if _covers_member(m, p)]
        if not life:
            scores.append(0.0)
            continue
        best_sa = max(
            (p.facts[0].sum_assured or p.facts[0].sum_insured or 0)
            for p in life if p.facts
        ) if any(p.facts for p in life) else 0
        if best_sa and m.annual_income:
            multiple = best_sa / m.annual_income
            scores.append(min(100.0, 100.0 * multiple / 10))
        else:
            scores.append(50.0)
    return sum(scores) / len(scores) if scores else 0.0


def _si_dimension(members, policies) -> float:
    scores: list[float] = []
    for member in members:
        for policy in _health_policies(policies):
            if not _covers_member(member, policy) or not policy.facts:
                continue
            facts = policy.facts[0]
            bench = get_benchmark(member.age, member.city)
            if facts.sum_insured and bench:
                scores.append(min(100.0, 100.0 * facts.sum_insured / bench))
    return sum(scores) / len(scores) if scores else 0.0


def _copay_dimension(policies) -> float:
    copays = [
        p.facts[0].copay_percent
        for p in _health_policies(policies)
        if p.facts and p.facts[0].copay_percent is not None
    ]
    if not copays:
        return 80.0
    worst = max(copays)
    if worst <= 0:
        return 100.0
    if worst < 10:
        return 80.0
    if worst < 20:
        return 50.0
    return 20.0


def _waiting_dimension(policies) -> float:
    from core.rules.financial_rules import _months_elapsed

    active = 0
    total = 0
    for policy in _health_policies(policies):
        if not policy.facts:
            continue
        waiting = policy.facts[0].ped_waiting_months
        if not waiting or not policy.start_date:
            continue
        total += 1
        if _months_elapsed(policy.start_date) < waiting:
            active += 1
    if total == 0:
        return 70.0
    return 100.0 if active == 0 else 30.0


def _sublimit_dimension(policies) -> float:
    for policy in _health_policies(policies):
        if policy.sublimits:
            return 50.0
        if policy.facts and policy.facts[0].room_rent_limit:
            return 50.0
    return 80.0


def _claim_dimension(policies) -> float:
    for policy in _health_policies(policies):
        if policy.facts and (policy.facts[0].pre_auth_required or policy.facts[0].network_required):
            return 60.0
    return 80.0

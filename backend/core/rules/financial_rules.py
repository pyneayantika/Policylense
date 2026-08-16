"""
Co-pay, waiting period, and hospitalization math.

WHY: LLMs hallucinate rupees. Every financial figure in the product is
computed here, then handed to the LLM to narrate.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Any

from db.models import Policy, PolicyFacts


@dataclass
class ScenarioResult:
    """In-memory hospitalization projection. confidence is always indicative."""

    eligible_amount: float
    sum_insured_cap: float
    capped: bool
    copay_percent: float
    copay_deduction: float
    estimated_insurer_payout: float
    estimated_out_of_pocket: float
    caveats: list[str] = field(default_factory=list)
    confidence: str = "indicative"

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


class CopayRules:
    """Flag when co-pay creates out-of-pocket sharing the user may not expect."""

    def copay_exposure(self, policy_facts: PolicyFacts, member=None, policy: Policy | None = None) -> dict | None:
        copay = policy_facts.copay_percent
        if copay is None or copay <= 0:
            return None
        example_bill = policy_facts.sum_insured or 500_000
        share = example_bill * (copay / 100)
        severity = "warning" if copay >= 20 else "info"
        title = "Co-payment may increase out-of-pocket cost"
        description = (
            f"A co-payment of {copay:.0f}% appears in the policy terms"
            f"{' (' + policy_facts.copay_condition + ')' if policy_facts.copay_condition else ''}. "
            f"On an illustrative hospital bill of ₹{int(example_bill):,}, the co-pay share "
            f"could be about ₹{int(share):,} before other deductions. This is indicative only."
        )
        return {
            "flag_type": "copay_exposure",
            "severity": severity,
            "title": title,
            "description": description,
            "member_id": getattr(member, "id", None),
            "policy_id": policy.id if policy else policy_facts.policy_id,
            "calculated_data": json.dumps(
                {
                    "copay_percent": copay,
                    "example_bill": example_bill,
                    "example_copay_share": share,
                }
            ),
            "evidence_clauses": "Co-payment clause",
        }


class WaitingPeriodRules:
    """Flag if PED waiting period has not elapsed."""

    def ped_waiting_active(self, policy_facts: PolicyFacts, policy: Policy, member=None) -> dict | None:
        waiting = policy_facts.ped_waiting_months
        if not waiting or not policy.start_date:
            return None
        elapsed = _months_elapsed(policy.start_date)
        if elapsed >= waiting:
            return None
        remaining = waiting - elapsed
        return {
            "flag_type": "waiting_period_risk",
            "severity": "warning",
            "title": "Pre-existing condition waiting period may still be active",
            "description": (
                f"The policy's PED waiting period appears to be {waiting} months. "
                f"About {elapsed} months may have elapsed since the recorded start date, "
                f"so roughly {remaining} months could remain. Claims related to "
                f"pre-existing conditions may not be payable until that period ends."
            ),
            "member_id": getattr(member, "id", None),
            "policy_id": policy.id,
            "calculated_data": json.dumps(
                {
                    "waiting_months": waiting,
                    "months_elapsed": elapsed,
                    "months_remaining": remaining,
                }
            ),
            "evidence_clauses": "Waiting Period III / PED",
        }


class ScenarioCalculator:
    """Deterministic hospitalization projection: cap → copay → payout + OOP."""

    def calculate_hospitalization(self, amount: float, policy_facts: Any) -> ScenarioResult:
        """Return indicative numbers plus caveats. Never 'guaranteed'."""
        si = getattr(policy_facts, "sum_insured", None)
        copay = getattr(policy_facts, "copay_percent", None) or 0
        cap = min(amount, si) if si else amount
        copay_deduction = cap * (copay / 100)
        payout = cap - copay_deduction
        oop = amount - payout

        caveats = [
            "Non-medical expenses, consumables, and items outside policy coverage are not included in this estimate.",
            "Actual payout depends on claim adjudication by the insurer.",
        ]
        if copay:
            caveats.insert(
                0,
                f"Co-pay of {copay:g}% has been applied to the capped amount.",
            )
        if getattr(policy_facts, "room_rent_limit", None) or getattr(
            policy_facts, "ambulance_cover", None
        ):
            caveats.insert(
                1 if copay else 0,
                "Sub-limits may further reduce the insurer's contribution for specific treatment types.",
            )

        return ScenarioResult(
            eligible_amount=amount,
            sum_insured_cap=cap,
            capped=bool(si and amount > si),
            copay_percent=float(copay),
            copay_deduction=copay_deduction,
            estimated_insurer_payout=payout,
            estimated_out_of_pocket=oop,
            caveats=caveats,
            confidence="indicative",
        )


def _months_elapsed(start: date, today: date | None = None) -> int:
    today = today or date.today()
    return max(0, (today.year - start.year) * 12 + (today.month - start.month))

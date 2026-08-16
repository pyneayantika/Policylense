"""Lightweight claim-readiness flags: pre-auth and network hospital."""

from __future__ import annotations

import json

from db.models import PolicyFacts


class ClaimReadinessRules:
    """Info-level flags; full checklist is post-MVP."""

    def evaluate(self, policy_facts: PolicyFacts, member=None, policy=None) -> list[dict]:
        flags: list[dict] = []
        if policy_facts.pre_auth_required:
            flags.append(
                {
                    "flag_type": "pre_auth_required",
                    "severity": "info",
                    "title": "Pre-authorization may be required for cashless treatment",
                    "description": (
                        "The policy terms appear to require pre-authorization for cashless "
                        "hospitalization. Planned admissions may need insurer approval first."
                    ),
                    "member_id": getattr(member, "id", None),
                    "policy_id": policy.id if policy else policy_facts.policy_id,
                    "calculated_data": json.dumps({"pre_auth_required": True}),
                    "evidence_clauses": "Claim procedure / pre-authorization",
                }
            )
        if policy_facts.network_required:
            flags.append(
                {
                    "flag_type": "network_hospital",
                    "severity": "info",
                    "title": "Cashless facility may be limited to network hospitals",
                    "description": (
                        "Cashless treatment may depend on using a network / empanelled hospital. "
                        "Reimbursement terms can differ outside the network."
                    ),
                    "member_id": getattr(member, "id", None),
                    "policy_id": policy.id if policy else policy_facts.policy_id,
                    "calculated_data": json.dumps({"network_required": True}),
                    "evidence_clauses": "Network hospital / cashless clause",
                }
            )
        return flags

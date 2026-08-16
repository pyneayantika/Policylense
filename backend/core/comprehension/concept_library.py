"""
Static concept library (15 IRDAI-relevant terms).

WHY: Definitions are product content, not LLM improvisation. The personalizer
injects the user's numbers into these templates.
"""

CONCEPTS: dict[str, dict] = {
    "copay": {
        "title": "Co-Payment",
        "category": "cost_sharing",
        "difficulty": "medium",
        "one_line": "The percentage of every claim YOU pay from your pocket, even with insurance.",
        "misconception": "People think insurance pays full bill. With co-pay, you always share.",
    },
    "sum_insured": {
        "title": "Sum Insured",
        "category": "coverage_limit",
        "difficulty": "easy",
        "one_line": "The maximum your insurer will pay in a policy year. The ceiling, not a guarantee.",
        "misconception": "People assume SI = amount received. Co-pay, sub-limits, exclusions reduce it.",
    },
    "sub_limit": {
        "title": "Sub-Limit",
        "category": "coverage_limit",
        "difficulty": "hard",
        "one_line": "A hidden cap on specific treatments INSIDE your sum insured.",
        "misconception": "Most don't know sub-limits exist. ₹10L SI doesn't mean ₹10L for every treatment.",
    },
    "waiting_period": {
        "title": "Waiting Period (PED)",
        "category": "coverage_condition",
        "difficulty": "medium",
        "one_line": "A time window after buying when certain conditions are NOT covered.",
        "misconception": "People think they're covered immediately. PED may not be covered for 2-4 years.",
    },
    "room_rent_limit": {
        "title": "Room Rent Limit",
        "category": "cost_sharing",
        "difficulty": "hard",
        "one_line": "A daily cap. If you exceed it, ALL charges may be reduced proportionally — not just room.",
        "misconception": "Most misunderstood term. Exceeding room rent can reduce surgeon fees, medicines, everything.",
    },
    "exclusion": {"title": "Exclusion", "category": "coverage_condition", "difficulty": "easy", "one_line": "Treatments or situations your policy will never cover."},
    "pre_authorization": {"title": "Pre-Authorization", "category": "process", "difficulty": "easy", "one_line": "Insurer approval before a planned hospitalization, needed for cashless claims."},
    "network_hospital": {"title": "Network Hospital", "category": "process", "difficulty": "easy", "one_line": "Hospitals with an insurer agreement — cashless there, reimbursement elsewhere."},
    "deductible": {"title": "Deductible", "category": "cost_sharing", "difficulty": "medium", "one_line": "A fixed amount you pay first before insurance kicks in, unlike co-pay which is a percentage."},
    "no_claim_bonus": {"title": "No-Claim Bonus", "category": "benefit", "difficulty": "easy", "one_line": "A reward for not claiming: sum insured can increase after a claim-free year."},
    "restoration_benefit": {"title": "Restoration Benefit", "category": "benefit", "difficulty": "medium", "one_line": "Refills sum insured for later claims in the same year after it is exhausted."},
    "cashless_claim": {"title": "Cashless Claim", "category": "process", "difficulty": "easy", "one_line": "Insurer pays the hospital directly at a network hospital with pre-authorization."},
    "claim_settlement_ratio": {"title": "Claim Settlement Ratio", "category": "evaluation", "difficulty": "easy", "one_line": "Share of claims an insurer pays; useful context, not a guarantee for your claim."},
    "portability": {"title": "Portability", "category": "policy_management", "difficulty": "medium", "one_line": "Right to switch insurers without restarting waiting-period credit."},
    "proportionate_deduction": {"title": "Proportionate Deduction", "category": "cost_sharing", "difficulty": "hard", "one_line": "When room rent exceeds the limit, the insurer may cut every charge by the same ratio."},
}


def get_concept(concept_id: str) -> dict | None:
    """Lookup by id, or None if unknown."""
    return CONCEPTS.get(concept_id)

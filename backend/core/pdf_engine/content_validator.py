"""
Validate that extracted PDF text is an insurance policy document.

WHY: users may upload random documents (resumes, invoices, academic papers).
The pipeline should reject non-insurance content early with a clear message
instead of producing garbage extraction results.
"""

from __future__ import annotations

import re

INSURANCE_SIGNALS: list[tuple[str, int]] = [
    (r"\b(?:sum\s+(?:insured|assured))\b", 3),
    (r"\b(?:policy\s*holder|policyholder|insured\s+person|life\s+assured)\b", 3),
    (r"\b(?:premium|annualized\s+premium)\b", 2),
    (r"\b(?:coverage|covered|indemnity|indemnify)\b", 2),
    (r"\b(?:exclusion|excluded|not\s+(?:covered|payable))\b", 3),
    (r"\b(?:claim|claims?\s+(?:procedure|process|settlement))\b", 2),
    (r"\b(?:co-?pay|co-?payment|deductible)\b", 3),
    (r"\b(?:waiting\s+period|moratorium)\b", 3),
    (r"\b(?:hospitali[sz]ation|in-?patient|out-?patient)\b", 3),
    (r"\b(?:sub-?limit|room\s+rent)\b", 3),
    (r"\b(?:cashless|reimbursement|TPA|third\s+party\s+administrator)\b", 3),
    (r"\b(?:IRDAI|IRDA|Insurance\s+Regulatory)\b", 4),
    (r"\b(?:nominee|beneficiary|assignee)\b", 2),
    (r"\b(?:maturity\s+benefit|death\s+benefit|survival\s+benefit)\b", 3),
    (r"\b(?:health\s+insurance|life\s+insurance|term\s+(?:plan|insurance))\b", 4),
    (r"\b(?:underwriting|underwriter)\b", 2),
    (r"\b(?:renewal|reinstatement|grace\s+period)\b", 2),
    (r"\b(?:pre-?existing\s+(?:disease|condition)|PED)\b", 3),
    (r"\b(?:network\s+hospital|empanelled)\b", 2),
    (r"\b(?:insurance\s+(?:company|policy|contract|certificate))\b", 3),
]

SCORE_THRESHOLD = 8
SAMPLE_CHARS = 15000


def validate_insurance_content(raw_text: str) -> tuple[bool, str]:
    """Check if text looks like an insurance policy.

    Returns (is_valid, reason). On rejection, reason is a user-friendly message.
    """
    sample = raw_text[:SAMPLE_CHARS].lower()
    if len(sample.strip()) < 200:
        return False, "The document contains too little text to analyze."

    total_score = 0
    matched_categories: list[str] = []
    for pattern, weight in INSURANCE_SIGNALS:
        if re.search(pattern, sample, re.IGNORECASE):
            total_score += weight
            matched_categories.append(pattern)

    if total_score >= SCORE_THRESHOLD:
        return True, ""

    return (
        False,
        "This document does not appear to be an insurance policy. "
        "Please upload a health insurance or life insurance policy PDF "
        "(e.g., policy wording, certificate of insurance, or policy schedule).",
    )

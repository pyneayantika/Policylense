"""
Tag chunks so retrieval can filter by intent (coverage vs exclusion vs limit).

WHY: semantic search alone confuses 'not covered' with 'covered'. Metadata
lets the retriever boost the right section.
"""

from __future__ import annotations

import re

from core.chunking.models import PolicyChunk

CONTENT_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("exclusion", ("not covered", "excluded", "not payable", "shall not be liable")),
    ("limit", ("maximum", "limit", "up to", "cap", "sub-limit", "sublimit", "per day")),
    ("condition", ("subject to", "provided that", "condition", "waiting period")),
    ("process", ("claim", "submit", "notify", "intimate", "pre-author", "cashless")),
    ("definition", ("means", "refers to", "shall mean", "definition")),
    ("benefit", ("benefit", "bonus", "restoration", "wellness")),
    ("coverage", ("covered", "payable", "eligible", "indemnify", "we will pay")),
]

ENTITY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "room_rent": ("room rent", "room/icu", "boarding", "accommodation"),
    "copay": ("co-pay", "copay", "co-payment", "cost sharing"),
    "waiting_period": ("waiting period", "moratorium", "pre-existing", "ped"),
    "sublimit": ("sub-limit", "sublimit", "internal limit", "capping"),
    "pre_auth": ("pre-authorization", "pre-authorisation", "prior approval"),
    "network": ("network hospital", "empanelled", "cashless facility", "in-network"),
    "ambulance": ("ambulance",),
    "icu": ("icu", "intensive care"),
    "daycare": ("day care", "daycare"),
    "maternity": ("maternity", "pregnancy", "childbirth"),
    "cataract": ("cataract",),
    "modern_treatment": ("modern treatment", "robotic", "immunotherapy", "oral chemotherapy"),
    "ayush": ("ayush", "ayurveda", "unani", "siddha", "homeopathy"),
}

AMOUNT_RE = re.compile(r"₹[\d,]+(?:\.\d+)?")
PERCENT_RE = re.compile(r"\d+(?:\.\d+)?%")


class MetadataEnricher:
    """Attach content_type, financial_values, and entity tags to each chunk."""

    def enrich(self, chunks: list[PolicyChunk]) -> list[PolicyChunk]:
        for chunk in chunks:
            lowered = chunk.text.lower()
            chunk.content_type = self._content_type(lowered, chunk.section_type)
            chunk.financial_values = AMOUNT_RE.findall(chunk.text) + PERCENT_RE.findall(
                chunk.text
            )
            chunk.entities = [
                name
                for name, needles in ENTITY_KEYWORDS.items()
                if any(n in lowered for n in needles)
            ]
        tagged = sum(1 for c in chunks if c.entities or c.financial_values)
        print(f"[enrich] tagged {tagged}/{len(chunks)} chunks with entities or amounts")
        return chunks

    def _content_type(self, lowered: str, section_type: str) -> str:
        for label, needles in CONTENT_KEYWORDS:
            if any(n in lowered for n in needles):
                return label
        fallback = {
            "exclusions": "exclusion",
            "coverage": "coverage",
            "definitions": "definition",
            "claim_process": "process",
            "waiting_period": "condition",
            "copay": "limit",
            "sublimits": "limit",
            "renewal": "benefit",
            "modern_treatments": "coverage",
            "network_hospitals": "process",
            "general_conditions": "condition",
        }
        return fallback.get(section_type, "coverage")

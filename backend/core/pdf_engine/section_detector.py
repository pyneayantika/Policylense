"""
Detect section boundaries in IRDAI policy text.

WHY: four filing styles (Star, HDFC ERGO, SBI, Arogya Sanjeevani) must map to
the same section_type labels so later RAG can filter by coverage vs exclusions.
Body sentences also contain words like 'claim' — only title-like lines start a section.
"""

from __future__ import annotations

import re

from core.pdf_engine.models import Section


class PolicySectionDetector:
    """Detects sections in IRDAI policy text. Handles 4 formatting styles."""

    KNOWN_SECTIONS: dict[str, list[str]] = {
        "coverage": [
            "coverage",
            "benefits",
            "what is covered",
            "scope of cover",
            "the company agrees as under",
            r"^II\.?\s*Coverage",
            r"^B\.?\s*COVERAGE",
            r"^I\.?\s*COVERAGE",
            r"Section\s+(?:I|1)\b.*?cover",
            r"Section\s+\d+",
            "in-patient hospitalization",
            "day care procedures",
            "domiciliary hospitalization",
            "pre-hospitalization",
            "post-hospitalization",
            "organ donor",
            "ambulance",
            "ayush treatment",
            "modern treatment",
        ],
        "exclusions": [
            "exclusion",
            "what is not covered",
            "not payable",
            "general exclusion",
            "specific exclusion",
            "the company shall not be liable",
            r"^III\.?\s*(?:EXCLUSION|Exclusion)",
            r"^IV\.?\s*(?:EXCLUSION|Exclusion)",
            "permanent exclusion",
        ],
        "waiting_period": [
            "waiting period",
            "moratorium",
            "pre-existing disease",
            "pre existing disease",
            "PED",
            r"\d+\s*months?\s*of\s*continuous\s*coverage",
            "initial waiting period",
            "specific disease waiting period",
            "30 days waiting",
            "24 months waiting",
            "36 months",
            "48 months",
        ],
        "copay": [
            "co-pay",
            "copay",
            "co-payment",
            "cost sharing",
            r"co-?payment\s+of\s+\d+%",
            "borne by the insured",
            "5% applicable to claim amount",
        ],
        "sublimits": [
            "sub-limit",
            "sublimit",
            "capping",
            "internal limit",
            "room rent",
            "icu charges",
            "subject to a maximum of",
            "per day",
            "proportionate deduction",
            "2% of the sum insured",
            "5% of sum insured",
            "25% of the sum insured",
            "50% of the sum insured",
        ],
        "claim_process": [
            "claim",
            "how to claim",
            "claim procedure",
            "intimation",
            "pre-authorization",
            "pre-authorisation",
            "cashless claim",
            "reimbursement claim",
            "TPA",
        ],
        "network_hospitals": [
            "network",
            "cashless",
            "empanelled hospital",
            "network hospital",
            "cashless facility",
        ],
        "definitions": [
            "definition",
            "glossary",
            "interpretation",
            r"^Def\.\s*\d+",
            r"^DEFINITIONS",
            "means and includes",
            "shall mean",
        ],
        "general_conditions": [
            "general condition",
            "terms and condition",
            "cancellation",
            "free look period",
            "arbitration",
            "grievance redressal",
            "ombudsman",
        ],
        "renewal": [
            "renewal",
            "premium",
            "grace period",
            "portability",
            "cumulative bonus",
            "no claim bonus",
            "lifelong renewal",
            "portability norms",
        ],
        "modern_treatments": [
            "modern treatment",
            "robotic surgery",
            "stem cell therapy",
            "immunotherapy",
            "oral chemotherapy",
        ],
    }

    # Specific types before generic 'coverage' / 'claim' / 'renewal' keywords.
    _TYPE_ORDER = [
        "exclusions",
        "waiting_period",
        "copay",
        "sublimits",
        "modern_treatments",
        "definitions",
        "general_conditions",
        "network_hospitals",
        "claim_process",
        "renewal",
        "coverage",
    ]

    def detect(self, cleaned_text: str) -> list[Section]:
        lines = cleaned_text.splitlines()
        hits: list[tuple[int, str, str]] = []

        for i, line in enumerate(lines):
            stripped = line.strip()
            if not self._looks_like_header(stripped):
                continue
            match = self._classify_header(stripped)
            if not match:
                continue
            section_type, section_name = match
            if hits and hits[-1][1] == section_type and not self._is_major_header(stripped):
                continue
            hits.append((i, section_type, section_name))

        if not hits:
            print("Detected 0 sections: []")
            return []

        sections: list[Section] = []
        for idx, (start, section_type, name) in enumerate(hits):
            end = hits[idx + 1][0] - 1 if idx + 1 < len(hits) else len(lines) - 1
            body = "\n".join(lines[start : end + 1]).strip()
            sections.append(
                Section(
                    section_name=name,
                    section_type=section_type,
                    start_line=start,
                    end_line=end,
                    text=body,
                )
            )

        types = [s.section_type for s in sections]
        print(f"Detected {len(sections)} sections: {types}")
        return sections

    def _classify_header(self, line: str) -> tuple[str, str] | None:
        for section_type in self._TYPE_ORDER:
            for pattern in self.KNOWN_SECTIONS[section_type]:
                if self._pattern_matches(pattern, line):
                    return section_type, line.strip()
        return None

    def _pattern_matches(self, pattern: str, line: str) -> bool:
        if any(ch in pattern for ch in r"^$.*+?[]()\\|"):
            return re.search(pattern, line, flags=re.IGNORECASE) is not None
        return pattern.lower() in line.lower()

    def _is_major_header(self, line: str) -> bool:
        return bool(
            re.match(
                r"^(section\s+[ivx\d]+|[ivx]+\.|definitions?|exclusions?|"
                r"waiting period|co-?payment|general conditions?|"
                r"claim procedure|renewal|coverage)\b",
                line,
                flags=re.IGNORECASE,
            )
        )

    def _looks_like_header(self, line: str) -> bool:
        if len(line) < 4 or len(line) > 120:
            return False
        if line.count(" ") > 14:
            return False
        if line.endswith(".") and not line.isupper():
            return False
        if re.search(r":\s*[₹\d]", line):
            return False
        if re.search(
            r"\b(shall|means and includes|hereby|whereas|may apply)\b",
            line,
            re.I,
        ):
            return False
        if re.match(
            r"^(section\s+)?([ivxlc]+|\d{1,2})[\.\):\-—–]\s+",
            line,
            flags=re.IGNORECASE,
        ):
            return True
        if re.match(r"^def\.\s*\d+", line, flags=re.IGNORECASE):
            return True
        letters = [c for c in line if c.isalpha()]
        if letters and sum(c.isupper() for c in letters) / len(letters) > 0.55:
            return True
        return len(line.split()) <= 8

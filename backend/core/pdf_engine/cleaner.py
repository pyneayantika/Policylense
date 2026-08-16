"""
IRDAI-specific text cleaning for insurance policy PDFs.

WHY this order: ligatures first so later regexes see 'first' not 'ﬁrst'.
Letterhead and page numbers must go before whitespace collapse.
"""

from __future__ import annotations

import re
from collections import Counter


class PolicyTextCleaner:
    """IRDAI-specific text cleaning pipeline."""

    LIGATURES = {
        "ﬁ": "fi",
        "ﬂ": "fl",
        "ﬀ": "ff",
        "ﬃ": "ffi",
        "ﬄ": "ffl",
    }

    def clean(self, raw_text: str) -> str:
        orig = len(raw_text)
        text = raw_text
        text = self.fix_ligatures(text)
        text = self.remove_irdai_headers(text)
        text = self.remove_insurer_letterhead(text)
        text = self.remove_page_numbers(text)
        text = self.normalize_whitespace(text)
        text = self.fix_hyphenation(text)
        text = self.normalize_currency(text)
        text = self.remove_disclaimer_footers(text)
        text = self.normalize_whitespace(text)

        clean_len = len(text)
        pct = round((1 - clean_len / orig) * 100) if orig else 0
        print(f"Cleaned: {orig} -> {clean_len} chars ({pct}% reduced)")
        return text

    def fix_ligatures(self, text: str) -> str:
        for bad, good in self.LIGATURES.items():
            text = text.replace(bad, good)
        return text

    def remove_irdai_headers(self, text: str) -> str:
        text = re.sub(r"IRDAI\s*Reg.*?No.*?:\s*\d+", "", text, flags=re.IGNORECASE)
        text = re.sub(r"UIN\s*:?\s*\w+", "", text, flags=re.IGNORECASE)
        text = re.sub(r"CIN\s*:\s*\w+", "", text, flags=re.IGNORECASE)
        text = re.sub(
            r"^.*Regd\.?\s*&?\s*Corporate Office.*$",
            "",
            text,
            flags=re.IGNORECASE | re.MULTILINE,
        )
        return text

    def remove_insurer_letterhead(self, text: str) -> str:
        kept: list[str] = []
        for line in text.splitlines():
            lower = line.lower()
            hits = sum(
                token in lower
                for token in ("phone", "email", "website", "www.", "e-mail")
            )
            if hits >= 2:
                continue
            kept.append(line)

        counts = Counter(ln.strip() for ln in kept if ln.strip())
        insurer_like = re.compile(
            r"(insurance|insurer|allied|\bco\.?\s*ltd|\blimited\b)",
            re.IGNORECASE,
        )
        drop = {
            name
            for name, n in counts.items()
            if n > 3 and insurer_like.search(name) and len(name) < 80
        }
        if drop:
            kept = [ln for ln in kept if ln.strip() not in drop]
        return "\n".join(kept)

    def remove_page_numbers(self, text: str) -> str:
        text = re.sub(r"^\s*\d{1,3}\s*$", "", text, flags=re.MULTILINE)
        text = re.sub(
            r"^\s*(?:page\s+)?\d{1,3}\s+of\s+\d{1,3}\s*$",
            "",
            text,
            flags=re.IGNORECASE | re.MULTILINE,
        )
        text = re.sub(r"Page\s+\d{1,3}\s+of\s+\d{1,3}", "", text, flags=re.IGNORECASE)
        return text

    def normalize_whitespace(self, text: str) -> str:
        lines = [re.sub(r"[ \t]{2,}", " ", line).strip() for line in text.splitlines()]
        text = "\n".join(lines)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def fix_hyphenation(self, text: str) -> str:
        return re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)

    def normalize_currency(self, text: str) -> str:
        text = re.sub(r"Rs\./-", "₹", text, flags=re.IGNORECASE)
        text = re.sub(r"Rs\.\s*", "₹", text, flags=re.IGNORECASE)
        text = re.sub(r"\bRs\s+", "₹", text, flags=re.IGNORECASE)
        text = re.sub(r"\bINR\s+", "₹", text, flags=re.IGNORECASE)
        return text

    def remove_disclaimer_footers(self, text: str) -> str:
        text = re.sub(
            r"^.*For and on behalf of.*$",
            "",
            text,
            flags=re.IGNORECASE | re.MULTILINE,
        )
        text = re.sub(
            r"^.*Authorised Signatory.*$",
            "",
            text,
            flags=re.IGNORECASE | re.MULTILINE,
        )
        return text

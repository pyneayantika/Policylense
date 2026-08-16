"""
Small text helpers used by cleaning and section detection.

WHY: IRDAI PDFs repeat the same messy patterns (ligatures, Indian number
formats). Isolating them here keeps the cleaner readable.
"""

import re

LIGATURE_MAP = {
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬀ": "ff",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
}


def fix_ligatures(text: str) -> str:
    """IRDAI PDFs often emit 'ﬁrst' instead of 'first'. Normalize those glyphs."""
    for bad, good in LIGATURE_MAP.items():
        text = text.replace(bad, good)
    return text


def normalize_currency_symbols(text: str) -> str:
    """Treat Rs. / INR / ₹ as one symbol so later regexes can find amounts."""
    text = re.sub(r"\bRs\.?\s*", "₹", text, flags=re.IGNORECASE)
    text = re.sub(r"\bINR\s*", "₹", text, flags=re.IGNORECASE)
    return text

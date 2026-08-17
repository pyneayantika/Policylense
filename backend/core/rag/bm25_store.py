"""
BM25 keyword index per family for hybrid retrieval.

WHY: vector search misses exact term matches ('Clause 4.2', 'room rent ₹5000').
BM25 catches these, and RRF fusion combines both signals.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from rank_bm25 import BM25Okapi


@dataclass
class BM25Hit:
    index: int
    score: float


_TOKENIZE_RE = re.compile(r"[a-zA-Z0-9₹%]+")


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKENIZE_RE.findall(text)]


class FamilyBM25Index:
    """In-memory BM25 index built from chunk texts."""

    def __init__(self, texts: list[str]) -> None:
        self._texts = texts
        corpus = [_tokenize(t) for t in texts]
        self._index = BM25Okapi(corpus) if corpus else None

    def search(self, query: str, k: int = 10) -> list[BM25Hit]:
        if not self._index or not self._texts:
            return []
        tokens = _tokenize(query)
        if not tokens:
            return []
        scores = self._index.get_scores(tokens)
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return [BM25Hit(index=idx, score=sc) for idx, sc in ranked[:k] if sc > 0]

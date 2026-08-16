"""
Two-stage retrieval: broad vector search, then metadata rerank.

WHY: recall first (k=10), then precision (section-type bonus) so
'what is co-pay' does not return a random coverage paragraph.
"""

from __future__ import annotations

from dataclasses import dataclass

from core.rag.embedder import ChunkEmbedder
from core.rag.vector_store import PolicyVectorStore

INTENT_MAP: list[tuple[str, tuple[str, ...]]] = [
    ("copay", ("co-pay", "copay", "co-payment", "out of pocket", "cost sharing")),
    ("exclusions", ("exclude", "exclusion", "not covered", "not payable")),
    ("waiting_period", ("waiting", "wait", "pre-existing", "ped", "moratorium")),
    ("claim_process", ("claim", "file a claim", "intimation", "pre-auth")),
    ("sublimits", ("limit", "cap", "maximum", "room rent", "sub-limit")),
    ("coverage", ("cover", "benefit", "eligible", "what is covered")),
]


@dataclass
class RetrievedChunk:
    text: str
    section_type: str
    clause_number: str
    similarity_score: float
    final_score: float
    policy_id: str
    content_type: str
    has_financial_value: bool


class PolicyRetriever:
    """Similarity search over a family's policy chunks."""

    def __init__(self, embedder: ChunkEmbedder, store: PolicyVectorStore) -> None:
        self.embedder = embedder
        self.store = store

    def detect_intent(self, query: str) -> str | None:
        lowered = query.lower()
        for section_type, needles in INTENT_MAP:
            if any(n in lowered for n in needles):
                return section_type
        return None

    def retrieve(
        self,
        query: str,
        family_id: str,
        k: int = 10,
    ) -> list[RetrievedChunk]:
        embedding = self.embedder.embed(query)
        hits = self.store.query(family_id, embedding, k=k)
        return [
            RetrievedChunk(
                text=h["text"],
                section_type=h["section_type"],
                clause_number=h["clause_number"],
                similarity_score=h["similarity"],
                final_score=h["similarity"],
                policy_id=h["policy_id"],
                content_type=h["content_type"],
                has_financial_value=h["has_financial_value"],
            )
            for h in hits
        ]

    def retrieve_with_reranking(
        self,
        query: str,
        family_id: str,
        k: int = 5,
    ) -> list[RetrievedChunk]:
        candidates = self.retrieve(query, family_id, k=10)
        intent = self.detect_intent(query)
        mentions_amount = any(ch.isdigit() for ch in query) or "₹" in query or "%" in query

        ranked: list[RetrievedChunk] = []
        for hit in candidates:
            bonus = 0.0
            if intent and hit.section_type == intent:
                bonus += 0.15
            if mentions_amount and hit.has_financial_value:
                bonus += 0.10
            ranked.append(
                RetrievedChunk(
                    text=hit.text,
                    section_type=hit.section_type,
                    clause_number=hit.clause_number,
                    similarity_score=hit.similarity_score,
                    final_score=hit.similarity_score + bonus,
                    policy_id=hit.policy_id,
                    content_type=hit.content_type,
                    has_financial_value=hit.has_financial_value,
                )
            )
        ranked.sort(key=lambda r: r.final_score, reverse=True)
        return ranked[:k]

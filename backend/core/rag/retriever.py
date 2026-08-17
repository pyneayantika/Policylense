"""
Three-stage retrieval: broad vector + BM25 → RRF fusion → cross-encoder rerank.

WHY: vector search alone misses exact terms; BM25 alone misses semantics.
RRF merges both recall signals, then a cross-encoder scores query-chunk pairs
for final precision.
"""

from __future__ import annotations

from dataclasses import dataclass

from core.rag.bm25_store import FamilyBM25Index
from core.rag.embedder import ChunkEmbedder
from core.rag.vector_store import PolicyVectorStore

RRF_K = 60

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


def _rrf_fuse(
    vector_ranks: dict[int, int],
    bm25_ranks: dict[int, int],
    all_indices: set[int],
) -> dict[int, float]:
    """Reciprocal Rank Fusion across two ranked lists."""
    scores: dict[int, float] = {}
    for idx in all_indices:
        s = 0.0
        if idx in vector_ranks:
            s += 1.0 / (RRF_K + vector_ranks[idx])
        if idx in bm25_ranks:
            s += 1.0 / (RRF_K + bm25_ranks[idx])
        scores[idx] = s
    return scores


class PolicyRetriever:
    """Hybrid retrieval with optional cross-encoder reranking."""

    def __init__(self, embedder: ChunkEmbedder, store: PolicyVectorStore) -> None:
        self.embedder = embedder
        self.store = store
        self._reranker = None
        self._reranker_loaded = False

    def _get_reranker(self):
        if not self._reranker_loaded:
            self._reranker_loaded = True
            try:
                from sentence_transformers import CrossEncoder
                self._reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
                print("[rerank] Cross-encoder loaded")
            except Exception as exc:
                print(f"[rerank] Cross-encoder unavailable, skipping: {exc}")
                self._reranker = None
        return self._reranker

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
        # Stage 1: broad recall from vector store
        embedding = self.embedder.embed(query)
        vector_hits = self.store.query(family_id, embedding, k=15)
        if not vector_hits:
            return []

        all_texts = [h["text"] for h in vector_hits]

        # Stage 2: BM25 keyword search over the same chunk pool
        bm25_index = FamilyBM25Index(all_texts)
        bm25_hits = bm25_index.search(query, k=15)

        # Build rank maps for RRF
        vector_ranks = {i: rank for rank, i in enumerate(range(len(vector_hits)))}
        bm25_ranks = {h.index: rank for rank, h in enumerate(bm25_hits)}
        all_indices = set(vector_ranks.keys()) | set(bm25_ranks.keys())

        rrf_scores = _rrf_fuse(vector_ranks, bm25_ranks, all_indices)

        # Apply intent and financial bonuses
        intent = self.detect_intent(query)
        mentions_amount = any(ch.isdigit() for ch in query) or "₹" in query or "%" in query

        candidates: list[tuple[int, float, dict]] = []
        for idx in all_indices:
            h = vector_hits[idx]
            score = rrf_scores[idx]
            if intent and h.get("section_type") == intent:
                score += 0.005
            if mentions_amount and h.get("has_financial_value"):
                score += 0.003
            candidates.append((idx, score, h))

        candidates.sort(key=lambda x: x[1], reverse=True)
        top_candidates = candidates[:10]

        # Stage 3: cross-encoder reranking
        reranker = self._get_reranker()
        if reranker and top_candidates:
            pairs = [(query, c[2]["text"]) for c in top_candidates]
            try:
                ce_scores = reranker.predict(pairs)
                reranked = []
                for i, (idx, rrf_sc, h) in enumerate(top_candidates):
                    combined = float(ce_scores[i])
                    reranked.append((idx, combined, h))
                reranked.sort(key=lambda x: x[1], reverse=True)
                top_candidates = reranked
            except Exception as exc:
                print(f"[rerank] Cross-encoder scoring failed: {exc}")

        results: list[RetrievedChunk] = []
        for idx, score, h in top_candidates[:k]:
            results.append(
                RetrievedChunk(
                    text=h["text"],
                    section_type=h.get("section_type", ""),
                    clause_number=h.get("clause_number", "N/A"),
                    similarity_score=h.get("similarity", 0.0),
                    final_score=score,
                    policy_id=h.get("policy_id", ""),
                    content_type=h.get("content_type", ""),
                    has_financial_value=bool(h.get("has_financial_value")),
                )
            )
        return results

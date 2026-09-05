"""Process-wide RAG + LLM objects so MiniLM is not reloaded per request."""

from __future__ import annotations

from core.llm.provider import LLMRouter
from core.rag.embedder import ChunkEmbedder
from core.rag.retriever import PolicyRetriever
from core.rag.vector_store import PolicyVectorStore

_embedder: ChunkEmbedder | None = None
_store: PolicyVectorStore | None = None
_router: LLMRouter | None = None


def get_embedder() -> ChunkEmbedder:
    global _embedder
    if _embedder is None:
        _embedder = ChunkEmbedder()
    return _embedder


def get_vector_store() -> PolicyVectorStore:
    global _store
    if _store is None:
        _store = PolicyVectorStore()
    return _store


def reset_vector_store() -> None:
    """Wipe vector storage and reopen it (clears Chroma's client cache correctly)."""
    global _store
    if _store is not None:
        _store.hard_reset()
    else:
        _store = PolicyVectorStore()


def get_llm_router() -> LLMRouter:
    global _router
    if _router is None:
        _router = LLMRouter()
    return _router


def get_retriever() -> PolicyRetriever:
    return PolicyRetriever(get_embedder(), get_vector_store())

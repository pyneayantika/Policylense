"""
ChromaDB wrapper (embedded PersistentClient, not a server).

WHY: vector search is a different job from SQLite facts. One collection per
family keeps demo queries simple. Metadata values must be str/int/float/bool.
"""

from __future__ import annotations

from pathlib import Path

import chromadb

from config import get_settings
from core.chunking.models import PolicyChunk


def _safe_name(family_id: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in family_id)
    return f"policy_chunks_{cleaned[:60]}"


class PolicyVectorStore:
    """Persistent Chroma collections keyed by family_id."""

    def __init__(self, persist_path: str | None = None) -> None:
        path = persist_path or get_settings().chroma_path
        Path(path).mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=path)
        print(f"[chroma] PersistentClient at {path}")

    def get_or_create_collection(self, family_id: str):
        return self._client.get_or_create_collection(
            name=_safe_name(family_id),
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(self, family_id: str, chunks: list[PolicyChunk]) -> None:
        if not chunks:
            return
        collection = self.get_or_create_collection(family_id)
        ids = [c.chunk_id for c in chunks]
        documents = [c.text for c in chunks]
        embeddings = [c.embedding for c in chunks]
        if any(e is None for e in embeddings):
            raise ValueError("All chunks must have embeddings before add_chunks")
        metadatas = [
            {
                "policy_id": c.policy_id,
                "section_type": c.section_type or "",
                "clause_number": c.clause_number or "N/A",
                "content_type": c.content_type or "",
                "has_financial_value": bool(c.financial_values),
                "section_name": (c.section_name or "")[:200],
            }
            for c in chunks
        ]
        # Chroma has a max batch; 100 is safe on free-tier RAM.
        batch = 100
        for i in range(0, len(ids), batch):
            collection.upsert(
                ids=ids[i : i + batch],
                documents=documents[i : i + batch],
                embeddings=embeddings[i : i + batch],
                metadatas=metadatas[i : i + batch],
            )
        print(f"[chroma] upserted {len(chunks)} chunks into {_safe_name(family_id)}")

    def delete_policy_chunks(self, family_id: str, policy_id: str) -> None:
        collection = self.get_or_create_collection(family_id)
        try:
            collection.delete(where={"policy_id": policy_id})
        except Exception:
            pass
        print(f"[chroma] deleted chunks for policy {policy_id}")

    def count(self, family_id: str) -> int:
        return self.get_or_create_collection(family_id).count()

    def query(
        self,
        family_id: str,
        query_embedding: list[float],
        k: int = 10,
    ) -> list[dict]:
        collection = self.get_or_create_collection(family_id)
        if collection.count() == 0:
            return []
        n = min(k, collection.count())
        result = collection.query(
            query_embeddings=[query_embedding],
            n_results=n,
            include=["documents", "metadatas", "distances"],
        )
        hits: list[dict] = []
        docs = (result.get("documents") or [[]])[0]
        metas = (result.get("metadatas") or [[]])[0]
        dists = (result.get("distances") or [[]])[0]
        ids = (result.get("ids") or [[]])[0]
        for i, doc in enumerate(docs):
            distance = float(dists[i]) if i < len(dists) else 1.0
            meta = metas[i] if i < len(metas) else {}
            hits.append(
                {
                    "chunk_id": ids[i] if i < len(ids) else "",
                    "text": doc,
                    "distance": distance,
                    "similarity": 1.0 - distance,
                    "policy_id": meta.get("policy_id", ""),
                    "section_type": meta.get("section_type", ""),
                    "clause_number": meta.get("clause_number", "N/A"),
                    "content_type": meta.get("content_type", ""),
                    "has_financial_value": bool(meta.get("has_financial_value")),
                    "section_name": meta.get("section_name", ""),
                }
            )
        return hits

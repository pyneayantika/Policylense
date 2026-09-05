"""
ChromaDB wrapper (embedded PersistentClient, not a server).

WHY: vector search is a different job from SQLite facts. One collection per
family keeps demo queries simple. Metadata values must be str/int/float/bool.

RECOVERY: Chroma 1.x keeps its metadata in a SQLite file inside chroma_path
and manages that schema with its own migrations (the `acquire_write` table is
one of them). If that file gets out of step with the installed Chroma version,
every write fails with "no such table: acquire_write". Chroma also caches one
client per path for the life of the process, so deleting the directory and
reopening it reuses the stale connection and recreates an EMPTY database
without migrations, which reproduces the same error forever. The only safe
reset is: clear Chroma's client cache, wipe the directory, reopen. A plain
heartbeat() never touches SQLite, so health is checked with a real write.
"""

from __future__ import annotations

import shutil
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

import chromadb

from config import get_settings
from core.chunking.models import PolicyChunk

T = TypeVar("T")

_PROBE_COLLECTION = "policylens_healthcheck"


def _safe_name(family_id: str) -> str:
    cleaned = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in family_id)
    return f"policy_chunks_{cleaned[:60]}"


def is_schema_error(exc: BaseException) -> bool:
    """True for Chroma's internal SQLite schema failures (not for bad input)."""
    msg = str(exc).lower()
    return "acquire_write" in msg or "no such table" in msg


def _clear_chroma_client_cache() -> None:
    """Drop Chroma's process-wide cached client so a reopened path gets fresh migrations."""
    try:
        from chromadb.api.client import SharedSystemClient

        SharedSystemClient.clear_system_cache()
    except Exception as exc:  # pragma: no cover - older chroma versions
        print(f"[chroma] could not clear client cache: {exc}")


class PolicyVectorStore:
    """Persistent Chroma collections keyed by family_id, self-healing on schema errors."""

    def __init__(self, persist_path: str | None = None) -> None:
        self._path = persist_path or get_settings().chroma_path
        Path(self._path).mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=self._path)
        print(f"[chroma] PersistentClient at {self._path}")
        self.ensure_healthy()

    # ------------------------------------------------------------------ health

    def ensure_healthy(self) -> None:
        """Run a real write through Chroma; rebuild storage if its schema is broken."""
        try:
            self._write_probe()
            print("[chroma] write probe OK")
        except Exception as exc:
            if not is_schema_error(exc):
                raise
            print(f"[chroma] schema broken ({exc}); rebuilding storage")
            self.hard_reset()
            self._write_probe()
            print("[chroma] storage rebuilt, write probe OK")

    def _write_probe(self) -> None:
        col = self._client.get_or_create_collection(name=_PROBE_COLLECTION)
        col.upsert(ids=["probe"], documents=["probe"], embeddings=[[0.0, 0.0, 0.0, 1.0]])
        col.delete(ids=["probe"])

    def hard_reset(self) -> None:
        """Wipe ALL vector data and reopen a fresh store. Policy rows in SQLite survive."""
        print(f"[chroma] hard reset of {self._path}")
        _clear_chroma_client_cache()
        shutil.rmtree(self._path, ignore_errors=True)
        Path(self._path).mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=self._path)

    def _with_recovery(self, op: Callable[[], T]) -> T:
        try:
            return op()
        except Exception as exc:
            if not is_schema_error(exc):
                raise
            print(f"[chroma] schema error during operation ({exc}); resetting and retrying once")
            self.hard_reset()
            return op()

    # -------------------------------------------------------------- operations

    def get_or_create_collection(self, family_id: str):
        return self._with_recovery(
            lambda: self._client.get_or_create_collection(
                name=_safe_name(family_id),
                metadata={"hnsw:space": "cosine"},
            )
        )

    def add_chunks(self, family_id: str, chunks: list[PolicyChunk]) -> None:
        if not chunks:
            return
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

        def _upsert_all() -> None:
            collection = self.get_or_create_collection(family_id)
            # Chroma has a max batch; 100 is safe on free-tier RAM.
            batch = 100
            for i in range(0, len(ids), batch):
                collection.upsert(
                    ids=ids[i : i + batch],
                    documents=documents[i : i + batch],
                    embeddings=embeddings[i : i + batch],
                    metadatas=metadatas[i : i + batch],
                )

        self._with_recovery(_upsert_all)
        print(f"[chroma] upserted {len(chunks)} chunks into {_safe_name(family_id)}")

    def delete_policy_chunks(self, family_id: str, policy_id: str) -> None:
        collection = self.get_or_create_collection(family_id)
        try:
            collection.delete(where={"policy_id": policy_id})
        except Exception as exc:
            if is_schema_error(exc):
                raise
            # Nothing to delete for a brand-new policy; not an error.
        print(f"[chroma] deleted chunks for policy {policy_id}")

    def count(self, family_id: str) -> int:
        return self._with_recovery(lambda: self.get_or_create_collection(family_id).count())

    def query(
        self,
        family_id: str,
        query_embedding: list[float],
        k: int = 10,
    ) -> list[dict]:
        collection = self.get_or_create_collection(family_id)
        total = self._with_recovery(collection.count)
        if total == 0:
            return []
        n = min(k, total)
        result = self._with_recovery(
            lambda: collection.query(
                query_embeddings=[query_embedding],
                n_results=n,
                include=["documents", "metadatas", "distances"],
            )
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

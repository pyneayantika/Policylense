"""
Local MiniLM embeddings.

WHY: Chroma needs vectors. MiniLM runs on CPU, costs ₹0, and is small enough
for Railway RAM. The same model must embed both chunks and queries.
"""

from __future__ import annotations

from config import get_settings


class ChunkEmbedder:
    """Load all-MiniLM-L6-v2 ONCE at init; embed() and embed_batch() reuse it."""

    def __init__(self, model_name: str | None = None) -> None:
        from sentence_transformers import SentenceTransformer

        name = model_name or get_settings().embedding_model
        print(f"[embed] Loading {name} (first run may download ~80MB)...")
        self.model_name = name
        self._model = SentenceTransformer(name)
        dim_fn = getattr(self._model, "get_embedding_dimension", None) or getattr(
            self._model, "get_sentence_embedding_dimension"
        )
        dim = dim_fn()
        print(f"[embed] Ready — {dim}-dim vectors")

    def embed(self, text: str) -> list[float]:
        vector = self._model.encode(text, show_progress_bar=False)
        return vector.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        matrix = self._model.encode(texts, show_progress_bar=False, batch_size=32)
        return matrix.tolist()

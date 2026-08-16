"""
Turn retrieved chunks into labeled POLICY EVIDENCE for the LLM.

WHY: the model must cite Clause 4.2. If we dump raw text, it cannot tell
which clause a sentence came from.
"""

from __future__ import annotations

from core.rag.retriever import RetrievedChunk


class ContextBuilder:
    """Assemble retrieved chunks into a cited prompt block."""

    def build_context(self, retrieved_chunks: list[RetrievedChunk]) -> str:
        if not retrieved_chunks:
            return "POLICY EVIDENCE:\n(none retrieved)"

        parts = ["POLICY EVIDENCE:"]
        for i, chunk in enumerate(retrieved_chunks, start=1):
            parts.append(
                f"[Evidence {i} | {chunk.section_type} — Clause {chunk.clause_number}]\n"
                f"{chunk.text}"
            )
        return "\n\n".join(parts)

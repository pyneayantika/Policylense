"""
Structure-aware chunking.

WHY: a 500-token window can split a co-pay clause from the sentence that
defines it. We cut on IRDAI clause markers so RAG retrieves a complete unit.
"""

from __future__ import annotations

import re
import uuid

from core.chunking.models import PolicyChunk
from core.pdf_engine.models import Section

CLAUSE_SPLIT = re.compile(
    r"(?=(?:\d+\.\d+)|(?:\([a-zA-Z]\))|(?:\([ivxIVX]+\))|(?:Clause\s+\d+)|(?:Section\s+\d+))",
    re.IGNORECASE,
)
CLAUSE_NUM = re.compile(
    r"^\s*(?:Clause\s+(\d+)|Section\s+(\d+)|(\d+\.\d+)|\(([a-zA-Z])\)|\(([ivxIVX]+)\))",
    re.IGNORECASE,
)

MAX_TOKENS = 1000
MIN_TOKENS = 50
OVERLAP_SENTENCES = 2


def _tokens(text: str) -> int:
    return max(1, len(text.split()))


class StructureAwareChunker:
    """Split each detected Section on clause patterns, then apply the size guard."""

    def chunk(
        self,
        cleaned_text: str,
        sections: list[Section],
        policy_id: str,
    ) -> list[PolicyChunk]:
        if not sections:
            sections = [
                Section(
                    section_name="document",
                    section_type="coverage",
                    start_line=0,
                    end_line=0,
                    text=cleaned_text,
                )
            ]

        raw: list[PolicyChunk] = []
        for section in sections:
            raw.extend(self._chunk_section(section, policy_id, cleaned_text))

        sized = self._apply_size_guard(raw)
        print(
            f"[chunk] {len(sized)} chunks from {len(sections)} sections "
            f"(avg {_avg_tokens(sized)} tokens)"
        )
        return sized

    def _chunk_section(
        self, section: Section, policy_id: str, cleaned_text: str
    ) -> list[PolicyChunk]:
        body = (section.text or "").strip()
        if not body:
            return []

        parts = [p.strip() for p in CLAUSE_SPLIT.split(body) if p and p.strip()]
        if len(parts) <= 1:
            parts = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
        if not parts:
            parts = [body]

        level = "clause" if len(parts) > 1 else (
            "paragraph" if "\n\n" in body else "section"
        )
        chunks: list[PolicyChunk] = []
        for part in parts:
            clause = self._clause_number(part)
            chunks.append(
                PolicyChunk(
                    chunk_id=uuid.uuid4().hex,
                    policy_id=policy_id,
                    text=part,
                    level=level if clause != "N/A" else (
                        "paragraph" if level == "clause" else level
                    ),
                    section_name=section.section_name,
                    section_type=section.section_type,
                    clause_number=clause,
                    page_number=self._estimate_page(part, cleaned_text),
                )
            )
        return chunks

    def _clause_number(self, text: str) -> str:
        match = CLAUSE_NUM.search(text[:80])
        if not match:
            return "N/A"
        return next(g for g in match.groups() if g)

    def _estimate_page(self, chunk_text: str, cleaned_text: str) -> int:
        needle = chunk_text[:80]
        idx = cleaned_text.find(needle) if needle else -1
        if idx < 0:
            return 1
        prefix = cleaned_text[:idx]
        breaks = prefix.lower().count("page break") + prefix.count("\f")
        return breaks + 1

    def _apply_size_guard(self, chunks: list[PolicyChunk]) -> list[PolicyChunk]:
        expanded: list[PolicyChunk] = []
        for chunk in chunks:
            if _tokens(chunk.text) > MAX_TOKENS:
                expanded.extend(self._split_sentences(chunk))
            else:
                expanded.append(chunk)

        merged: list[PolicyChunk] = []
        i = 0
        while i < len(expanded):
            current = expanded[i]
            if (
                _tokens(current.text) < MIN_TOKENS
                and i + 1 < len(expanded)
                and expanded[i + 1].section_type == current.section_type
                and expanded[i + 1].section_name == current.section_name
            ):
                nxt = expanded[i + 1]
                current.text = f"{current.text}\n{nxt.text}".strip()
                if current.clause_number == "N/A":
                    current.clause_number = nxt.clause_number
                i += 2
                merged.append(current)
                continue
            merged.append(current)
            i += 1

        if (
            len(merged) >= 2
            and _tokens(merged[-1].text) < MIN_TOKENS
            and merged[-1].section_type == merged[-2].section_type
        ):
            merged[-2].text = f"{merged[-2].text}\n{merged[-1].text}".strip()
            merged.pop()

        return merged

    def _split_sentences(self, chunk: PolicyChunk) -> list[PolicyChunk]:
        sentences = re.split(r"(?<=\.)\s+", chunk.text)
        pieces: list[PolicyChunk] = []
        buf: list[str] = []
        for sentence in sentences:
            trial = " ".join(buf + [sentence]).strip()
            if buf and _tokens(trial) > MAX_TOKENS:
                pieces.append(self._clone(chunk, " ".join(buf).strip()))
                overlap = buf[-OVERLAP_SENTENCES:] if len(buf) >= OVERLAP_SENTENCES else buf[:]
                buf = overlap + [sentence]
            else:
                buf.append(sentence)
        if buf:
            pieces.append(self._clone(chunk, " ".join(buf).strip()))
        return pieces or [chunk]

    def _clone(self, chunk: PolicyChunk, text: str) -> PolicyChunk:
        return PolicyChunk(
            chunk_id=uuid.uuid4().hex,
            policy_id=chunk.policy_id,
            text=text,
            level="paragraph",
            section_name=chunk.section_name,
            section_type=chunk.section_type,
            clause_number=chunk.clause_number,
            page_number=chunk.page_number,
        )


def _avg_tokens(chunks: list[PolicyChunk]) -> int:
    if not chunks:
        return 0
    return round(sum(_tokens(c.text) for c in chunks) / len(chunks))

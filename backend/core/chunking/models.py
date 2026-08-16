"""PolicyChunk — one retrieval unit with IRDAI section/clause metadata."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PolicyChunk:
    chunk_id: str
    policy_id: str
    text: str
    level: str  # section | clause | paragraph
    section_name: str
    section_type: str
    clause_number: str
    page_number: int
    content_type: str = ""
    entities: list[str] = field(default_factory=list)
    financial_values: list[str] = field(default_factory=list)
    embedding: list[float] | None = None

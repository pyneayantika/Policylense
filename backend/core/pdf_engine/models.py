"""
Shapes returned by the PDF pipeline before anything hits the database.

WHY dataclasses: extract → clean → detect is a local pipeline, not an HTTP
schema. A frozen-friendly dataclass is enough and matches the Phase 2 spec.
"""

from dataclasses import dataclass, field


@dataclass
class ExtractionResult:
    """Raw PyMuPDF output. has_text=False means a scanned PDF we cannot ingest."""

    raw_text: str
    page_count: int
    has_text: bool
    metadata: dict = field(default_factory=dict)
    filename: str | None = None


@dataclass
class Section:
    """One detected heading region (coverage, exclusions, waiting period, ...)."""

    section_name: str
    section_type: str
    start_line: int
    end_line: int
    text: str
    start_char: int = 0
    end_char: int = 0


# Alias used by earlier Phase 1 code.
PolicySection = Section

"""
Pull text out of digitally generated IRDAI policy PDFs.

WHY PyMuPDF (not OCR): IRDAI-filed wordings are born digital. If we get almost
no characters, we reject the file as scanned rather than inventing coverage.
"""

from __future__ import annotations

from pathlib import Path

import pymupdf as fitz

from core.pdf_engine.models import ExtractionResult
from utils.constants import MIN_DIGITAL_PDF_CHARS


class PolicyPDFExtractor:
    """Extracts text from IRDAI policy PDFs using PyMuPDF."""

    def extract(self, pdf_path: str) -> ExtractionResult:
        path = Path(pdf_path)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        try:
            doc = fitz.open(path)
        except PermissionError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not open PDF (corrupted or unreadable): {pdf_path}") from exc

        try:
            pages = [page.get_text("text") or "" for page in doc]
            raw_text = "\n".join(pages)
            has_text = len(raw_text.strip()) >= MIN_DIGITAL_PDF_CHARS
            meta_src = doc.metadata or {}
            metadata = {
                "title": meta_src.get("title") or None,
                "author": meta_src.get("author") or None,
            }
            print(f"Extracted {len(raw_text)} chars from {doc.page_count} pages")
            return ExtractionResult(
                raw_text=raw_text,
                page_count=doc.page_count,
                has_text=has_text,
                metadata=metadata,
                filename=path.name,
            )
        finally:
            doc.close()

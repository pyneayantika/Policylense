"""
Run extract → clean → detect on every PDF in backend/data/sample_policies/.

  python test_pdf_pipeline.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from core.pdf_engine.cleaner import PolicyTextCleaner
from core.pdf_engine.extractor import PolicyPDFExtractor
from core.pdf_engine.section_detector import PolicySectionDetector

BACKEND_DIR = Path(__file__).resolve().parent
SAMPLE_DIR = BACKEND_DIR / "data" / "sample_policies"
POLICY_DIR = BACKEND_DIR.parent / "Policy"


def sync_irdai_pdfs() -> list[Path]:
    """Copy IRDAI filings from Policy/ into data/sample_policies/ if needed."""
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    if POLICY_DIR.is_dir():
        for src in POLICY_DIR.glob("*.pdf"):
            dest = SAMPLE_DIR / src.name
            if not dest.exists() or dest.stat().st_size != src.stat().st_size:
                shutil.copy2(src, dest)
                print(f"Copied {src.name} -> data/sample_policies/")
    pdfs = sorted(SAMPLE_DIR.glob("*.pdf"))
    if not pdfs:
        print("No PDFs in data/sample_policies/ — generating a local sample...")
        from scripts.generate_sample_policy import build_sample_pdf

        build_sample_pdf()
        pdfs = sorted(SAMPLE_DIR.glob("*.pdf"))
    print(f"Using {len(pdfs)} PDF(s) from {SAMPLE_DIR}")
    return pdfs


def main() -> None:
    pdfs = sync_irdai_pdfs()
    extractor = PolicyPDFExtractor()
    cleaner = PolicyTextCleaner()
    detector = PolicySectionDetector()

    rows: list[tuple[str, int, int, int, int, str]] = []
    weak: list[str] = []

    print("=" * 88)
    for pdf in pdfs:
        print(f"\n>>> {pdf.name}")
        result = extractor.extract(str(pdf))
        if not result.has_text:
            print("  SKIP: scanned/image PDF (has_text=False)")
            rows.append((pdf.name, result.page_count, len(result.raw_text), 0, 0, "SCANNED"))
            weak.append(pdf.name)
            continue

        cleaned = cleaner.clean(result.raw_text)
        sections = detector.detect(cleaned)
        types = [s.section_type for s in sections]
        rows.append(
            (
                pdf.name,
                result.page_count,
                len(result.raw_text),
                len(cleaned),
                len(sections),
                ", ".join(dict.fromkeys(types)) if types else "-",
            )
        )
        if len(sections) < 3:
            weak.append(pdf.name)
            print(f"  FLAG: fewer than 3 sections detected ({len(sections)})")

        for section in sections[:15]:
            preview = " ".join(section.text.split())[:80]
            print(
                f"  [{section.section_type}] lines {section.start_line}-{section.end_line} | {preview}"
            )
        if len(sections) > 15:
            print(f"  ... {len(sections) - 15} more sections")

    print("\n" + "=" * 88)
    print(f"{'PDF':<48} {'Pages':>5} {'Raw':>8} {'Clean':>8} {'Secs':>5}  Types")
    print("-" * 88)
    for name, pages, raw, clean, nsec, types in rows:
        print(f"{name:<48} {pages:>5} {raw:>8} {clean:>8} {nsec:>5}  {types[:70]}")

    if weak:
        print(f"\nFLAGGED ({len(weak)}): {', '.join(weak)}")
        sys.exit(1)

    print("\nAll sample PDFs produced >= 3 sections.")


if __name__ == "__main__":
    main()

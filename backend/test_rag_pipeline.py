"""
Chunk → embed → Chroma → retrieve on one policy PDF.

  python test_rag_pipeline.py
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from core.chunking.metadata_enricher import MetadataEnricher
from core.chunking.structure_chunker import StructureAwareChunker
from core.pdf_engine.cleaner import PolicyTextCleaner
from core.pdf_engine.extractor import PolicyPDFExtractor
from core.pdf_engine.section_detector import PolicySectionDetector
from core.rag.context_builder import ContextBuilder
from core.rag.embedder import ChunkEmbedder
from core.rag.retriever import PolicyRetriever
from core.rag.vector_store import PolicyVectorStore

SAMPLE_DIR = Path(__file__).parent / "data" / "sample_policies"
FAMILY_ID = "rag_test_family"

QUERIES: list[tuple[str, set[str]]] = [
    ("What is the co-payment percentage?", {"copay"}),
    ("What is not covered under this policy?", {"exclusions"}),
    (
        "How long is the waiting period for pre-existing diseases?",
        {"waiting_period"},
    ),
    ("What is the room rent limit?", {"sublimits", "coverage"}),
    ("How do I file a claim?", {"claim_process"}),
]


def pick_pdf() -> Path:
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    preferred = SAMPLE_DIR / "ramesh_star_health_sample.pdf"
    if preferred.exists():
        return preferred
    pdfs = sorted(SAMPLE_DIR.glob("*.pdf"))
    if pdfs:
        return pdfs[0]
    from scripts.generate_sample_policy import build_sample_pdf

    return build_sample_pdf()


def main() -> None:
    pdf = pick_pdf()
    policy_id = uuid.uuid4().hex
    print(f"PDF: {pdf.name}")
    print(f"policy_id: {policy_id}\n")

    extracted = PolicyPDFExtractor().extract(str(pdf))
    if not extracted.has_text:
        print("FAIL: scanned PDF")
        sys.exit(1)

    cleaned = PolicyTextCleaner().clean(extracted.raw_text)
    sections = PolicySectionDetector().detect(cleaned)
    chunks = StructureAwareChunker().chunk(cleaned, sections, policy_id)
    chunks = MetadataEnricher().enrich(chunks)

    print("\nSample chunks:")
    for chunk in chunks[:5]:
        preview = " ".join(chunk.text.split())[:70]
        print(
            f"  [{chunk.section_type} | {chunk.clause_number} | {chunk.content_type}] {preview}"
        )

    embedder = ChunkEmbedder()
    vectors = embedder.embed_batch([c.text for c in chunks])
    for chunk, vector in zip(chunks, vectors):
        chunk.embedding = vector

    store = PolicyVectorStore()
    store.delete_policy_chunks(FAMILY_ID, policy_id)
    store.add_chunks(FAMILY_ID, chunks)
    print(f"[chroma] collection count = {store.count(FAMILY_ID)}")

    retriever = PolicyRetriever(embedder, store)
    builder = ContextBuilder()

    print("\n" + "=" * 72)
    hits_ok = 0
    for query, expected_types in QUERIES:
        intent = retriever.detect_intent(query)
        results = retriever.retrieve_with_reranking(query, FAMILY_ID, k=5)
        top3 = results[:3]
        top1_type = top3[0].section_type if top3 else ""
        ok = top1_type in expected_types
        hits_ok += int(ok)
        mark = "OK" if ok else "MISS"
        print(f"\nQ: {query}")
        print(f"   intent={intent}  top-1 section={top1_type}  [{mark}]")
        for i, hit in enumerate(top3, start=1):
            preview = " ".join(hit.text.split())[:90]
            print(
                f"   {i}. score={hit.final_score:.3f} sim={hit.similarity_score:.3f} "
                f"section={hit.section_type} clause={hit.clause_number}"
            )
            print(f"      {preview}")
        if top3:
            print("\n" + builder.build_context(top3[:2])[:400] + "...")

    print("\n" + "=" * 72)
    print(f"Top-1 section accuracy: {hits_ok}/{len(QUERIES)}")
    if hits_ok < 4:
        print("FAIL: need at least 4/5 queries with the expected section in top-1")
        sys.exit(1)
    print("PASS")


if __name__ == "__main__":
    main()

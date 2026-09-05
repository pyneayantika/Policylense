"""
End-to-end policy ingestion.

WHY: Routes must not know the 11 pipeline steps. This service sequences
extract → clean → chunk → embed → extract facts → rules.
"""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from fastapi import UploadFile

from config import get_settings
from core.chunking.metadata_enricher import MetadataEnricher
from core.chunking.structure_chunker import StructureAwareChunker
from core.extraction.policy_extractor import PolicyFactExtractor
from core.pdf_engine.cleaner import PolicyTextCleaner
from core.pdf_engine.content_validator import validate_insurance_content
from core.pdf_engine.extractor import PolicyPDFExtractor
from core.pdf_engine.section_detector import PolicySectionDetector
from core.rag.runtime import get_embedder, get_llm_router, get_vector_store, reset_vector_store
from core.rules.engine import RulesEngine
from db.database import SessionLocal
from db.models import Family, FamilyMember, Policy, new_id
from services.serialize import policy_dict


class IngestionService:
    """Upload PDF and run the intelligence pipeline for one policy."""

    async def register_upload(
        self,
        family_id: str,
        member_id: str,
        policy_type: str,
        pdf_data: bytes,
        filename: str,
    ) -> dict:
        """Validate and persist the upload row — returns immediately."""
        settings = get_settings()
        db = SessionLocal()
        try:
            family = db.get(Family, family_id)
            if not family:
                raise ValueError(f"Family {family_id} was not found")
            member = db.get(FamilyMember, member_id)
            if not member or member.family_id != family_id:
                raise ValueError("Member was not found in this family")

            max_bytes = settings.max_pdf_size_mb * 1024 * 1024
            if len(pdf_data) > max_bytes:
                raise ValueError(f"PDF exceeds {settings.max_pdf_size_mb} MB limit")
            if not pdf_data.startswith(b"%PDF"):
                raise ValueError("Uploaded file does not look like a PDF")

            Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
            policy_id = new_id()
            dest = Path(settings.upload_dir) / f"{policy_id}_{filename}"
            dest.write_bytes(pdf_data)

            policy = Policy(
                id=policy_id,
                family_id=family_id,
                member_id=member_id,
                policy_type=policy_type or "health",
                pdf_filename=filename,
                status="active",
                ingestion_status="uploaded",
                start_date=date.today() - timedelta(days=180),
            )
            db.add(policy)
            db.commit()
            return policy_dict(policy)
        finally:
            db.close()

    async def run_pipeline(self, policy_id: str, family_id: str) -> None:
        """Heavy processing — meant to run as a background task."""
        settings = get_settings()
        db = SessionLocal()
        try:
            policy = db.get(Policy, policy_id)
            if not policy:
                return

            dest = Path(settings.upload_dir) / f"{policy_id}_{policy.pdf_filename}"

            self._status(db, policy, "extracting")
            extracted = PolicyPDFExtractor().extract(str(dest))
            if not extracted.has_text:
                self._fail(db, policy, "This PDF appears scanned. Digital text PDFs only.")
                return

            self._status(db, policy, "cleaning")
            cleaned = PolicyTextCleaner().clean(extracted.raw_text)

            self._status(db, policy, "validating_content")
            is_insurance, rejection_msg = validate_insurance_content(cleaned)
            if not is_insurance:
                self._fail(db, policy, rejection_msg)
                return

            policy.raw_text = cleaned
            db.commit()

            self._status(db, policy, "detecting_sections")
            sections = PolicySectionDetector().detect(cleaned)

            self._status(db, policy, "chunking")
            chunks = StructureAwareChunker().chunk(cleaned, sections, policy_id)
            chunks = MetadataEnricher().enrich(chunks)
            chunks = chunks[: settings.max_chunks_per_policy]

            self._status(db, policy, "embedding")
            embedder = get_embedder()
            vectors = embedder.embed_batch([c.text for c in chunks])
            for chunk, vector in zip(chunks, vectors):
                chunk.embedding = vector
            try:
                store = get_vector_store()
                store.delete_policy_chunks(family_id, policy_id)
                store.add_chunks(family_id, chunks)
            except Exception as vec_exc:
                if "acquire_write" in str(vec_exc) or "no such table" in str(vec_exc):
                    print(f"[ingest] ChromaDB corrupt, resetting: {vec_exc}")
                    reset_vector_store()
                    store = get_vector_store()
                    store.delete_policy_chunks(family_id, policy_id)
                    store.add_chunks(family_id, chunks)
                else:
                    raise

            self._status(db, policy, "extracting_facts")
            extractor = PolicyFactExtractor(get_llm_router())
            facts = await extractor.extract_facts(policy_id, chunks)
            extractor.persist(db, policy_id, facts)
            policy = db.get(Policy, policy_id)
            if policy and facts.policy_type:
                policy.policy_type = facts.policy_type
                db.commit()

            self._status(db, policy, "evaluating_rules")
            RulesEngine(db).evaluate(family_id)

            self._status(db, policy, "completed")
            print(f"[ingest] completed policy {policy_id}")
        except Exception as exc:
            print(f"[ingest] failed: {exc}")
            if policy is not None:
                msg = str(exc)
                if "acquire_write" in msg or "no such table" in msg:
                    msg = "Vector database was reset due to corruption. Please re-upload this policy."
                self._fail(db, policy, msg)
        finally:
            db.close()

    async def upload_and_analyze(
        self,
        family_id: str,
        member_id: str,
        policy_type: str,
        pdf_file: UploadFile | str | Path | bytes,
    ) -> dict:
        """Legacy synchronous path — kept for non-HTTP callers."""
        data, filename = await _read_pdf(pdf_file)
        stub = await self.register_upload(family_id, member_id, policy_type, data, filename)
        await self.run_pipeline(stub["id"], family_id)
        db = SessionLocal()
        try:
            policy = db.get(Policy, stub["id"])
            return policy_dict(policy) if policy else stub
        finally:
            db.close()

    def _status(self, db, policy: Policy, status: str) -> None:
        policy.ingestion_status = status
        policy.ingestion_error = None
        db.commit()
        print(f"[ingest] {policy.id} -> {status}")

    def _fail(self, db, policy: Policy, message: str) -> None:
        policy.ingestion_status = "failed"
        policy.ingestion_error = message[:2000]
        db.commit()


async def _read_pdf(pdf_file: UploadFile | str | Path | bytes) -> tuple[bytes, str]:
    if isinstance(pdf_file, bytes):
        return pdf_file, "upload.pdf"
    if isinstance(pdf_file, (str, Path)):
        path = Path(pdf_file)
        return path.read_bytes(), path.name
    filename = pdf_file.filename or "upload.pdf"
    data = await pdf_file.read()
    return data, filename

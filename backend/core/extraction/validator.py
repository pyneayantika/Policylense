"""
Sanity-check extracted facts before SQLite persist.

WHY: A copay of 200% or a missing sum_insured should be flagged low-confidence,
not silently used in a ₹7L scenario.
"""

from __future__ import annotations

from core.extraction.schemas import PolicyFactsRaw, PolicyFactsValidated


class ExtractionValidator:
    """Range checks + overall confidence band (high / medium / low)."""

    def validate(self, raw: PolicyFactsRaw) -> PolicyFactsValidated:
        notes: list[str] = []
        if raw.extraction_notes:
            notes.append(raw.extraction_notes)

        if raw.sum_insured is not None and raw.sum_insured <= 0:
            notes.append("sum_insured was not a positive number; stored as null")
            raw.sum_insured = None
        if raw.copay_percent is not None and not (0 <= raw.copay_percent <= 100):
            notes.append("copay_percent outside 0-100; stored as null")
            raw.copay_percent = None
        for field in (
            "ped_waiting_months",
            "initial_waiting_months",
            "specific_disease_waiting_months",
        ):
            value = getattr(raw, field)
            if value is not None and value < 0:
                notes.append(f"{field} was negative; stored as null")
                setattr(raw, field, None)

        waiting_found = raw.ped_waiting_months is not None or (
            raw.initial_waiting_months is not None
            and raw.specific_disease_waiting_months is not None
        )
        si_ok = raw.sum_insured is not None
        copay_ok = raw.copay_percent is not None
        if si_ok and copay_ok and waiting_found:
            score = max(float(raw.confidence or 0), 0.85)
            band = "high"
        elif sum([si_ok, copay_ok, waiting_found]) >= 2:
            score = max(float(raw.confidence or 0), 0.65)
            if score >= 0.8:
                score = 0.79
            band = "medium"
        else:
            score = min(float(raw.confidence or 0), 0.49) if raw.confidence else 0.3
            band = "low"

        data = raw.model_dump()
        data["confidence"] = score
        data["extraction_notes"] = "; ".join(notes) if notes else raw.extraction_notes
        validated = PolicyFactsValidated(**data)
        validated.confidence_band = band
        return validated

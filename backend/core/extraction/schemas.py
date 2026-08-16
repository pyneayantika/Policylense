"""
Pydantic shapes for LLM extraction output.

WHY: The LLM returns JSON. Validation here is what stops garbage from
reaching the rules engine.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ExclusionItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    exclusion_text: str
    exclusion_type: str | None = None
    waiting_months: int | None = None
    waiting_tier: str | None = None
    condition: str | None = None
    source_clause: str | None = None


class SublimitItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    treatment_type: str
    limit_amount: float | None = None
    limit_type: str | None = None
    limit_value: float | None = None
    description: str | None = None
    source_clause: str | None = None


class PolicyFactsRaw(BaseModel):
    """Mirrors P1 JSON. Null means 'not stated' — never guessed."""

    model_config = ConfigDict(extra="ignore")

    policy_type: str | None = None
    product_category: str | None = None

    # --- Health fields ---
    sum_insured: float | None = None
    copay_percent: float | None = None
    copay_condition: str | None = None
    deductible: float | None = None
    room_rent_limit: float | None = None
    room_rent_type: str | None = None
    icu_limit: float | None = None
    icu_limit_type: str | None = None
    ped_waiting_months: int | None = None
    initial_waiting_months: int | None = None
    specific_disease_waiting_months: int | None = None
    network_hospital_required: bool | None = None
    pre_authorization_required: bool | None = None
    cashless_available: bool | None = None
    covers_members: list[str] | None = None
    cover_basis: str | None = None
    no_claim_bonus: str | None = None
    cumulative_bonus_percent: float | None = None
    cumulative_bonus_max_percent: float | None = None
    restoration_benefit: bool | None = None
    pre_hospitalization_days: int | None = None
    post_hospitalization_days: int | None = None
    day_care_covered: bool | None = None
    ambulance_cover: float | None = None
    ayush_covered: bool | None = None
    modern_treatments_covered: bool | None = None

    # --- Life fields ---
    sum_assured: float | None = None
    cover_type: str | None = None
    payout_type: str | None = None
    policy_term_years: int | None = None
    premium_paying_term_years: int | None = None
    riders: list[str] | None = None
    premium_waiver: bool | None = None
    accidental_death_benefit: float | None = None
    critical_illness_cover: float | None = None
    maturity_benefit: bool | None = None
    surrender_value_available: bool | None = None
    loan_available: bool | None = None

    confidence: float = 0.0
    extraction_notes: str | None = None
    exclusions: list[ExclusionItem] = Field(default_factory=list)
    sublimits: list[SublimitItem] = Field(default_factory=list)


class PolicyFactsValidated(PolicyFactsRaw):
    """Same fields after ExtractionValidator has scored confidence."""

    confidence_band: str = "low"

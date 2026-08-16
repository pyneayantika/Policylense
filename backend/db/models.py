"""
SQLAlchemy models — structured half of the hybrid store.

WHY: RAG holds clause text. The rules engine needs typed numbers (sum insured,
co-pay %). These tables are that machine-readable layer. Column `relationship`
on FamilyMember is a string field; ORM links use `orm_relationship` so the
name does not collide with SQLAlchemy's relationship().
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.orm import relationship as orm_relationship


def new_id() -> str:
    """SQLite has no UUID type; a hex string is portable and URL-safe."""
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class Family(Base):
    """One household. Dashboard score and scenarios hang off this row."""

    __tablename__ = "family"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    members: Mapped[list[FamilyMember]] = orm_relationship(back_populates="family")
    policies: Mapped[list[Policy]] = orm_relationship(back_populates="family")
    flags: Mapped[list[ProtectionFlag]] = orm_relationship(back_populates="family")
    scenarios: Mapped[list[ScenarioResult]] = orm_relationship(back_populates="family")


class FamilyMember(Base):
    """A person whose coverage we evaluate (self, spouse, child, parent)."""

    __tablename__ = "family_member"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    family_id: Mapped[str] = mapped_column(String, ForeignKey("family.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    relationship: Mapped[str] = mapped_column(String, nullable=False)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    known_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    annual_income: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    family: Mapped[Family] = orm_relationship(back_populates="members")
    policies: Mapped[list[Policy]] = orm_relationship(back_populates="member")
    flags: Mapped[list[ProtectionFlag]] = orm_relationship(back_populates="member")


class Policy(Base):
    """One uploaded contract. raw_text lets us re-chunk without the PDF."""

    __tablename__ = "policy"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    family_id: Mapped[str] = mapped_column(String, ForeignKey("family.id"), nullable=False, index=True)
    member_id: Mapped[str | None] = mapped_column(String, ForeignKey("family_member.id"), nullable=True, index=True)
    policy_type: Mapped[str] = mapped_column(String, nullable=False)
    insurer_name: Mapped[str | None] = mapped_column(String, nullable=True)
    product_name: Mapped[str | None] = mapped_column(String, nullable=True)
    policy_number: Mapped[str | None] = mapped_column(String, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    premium: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")
    pdf_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingestion_status: Mapped[str] = mapped_column(String, default="pending")
    ingestion_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    family: Mapped[Family] = orm_relationship(back_populates="policies")
    member: Mapped[FamilyMember | None] = orm_relationship(back_populates="policies")
    facts: Mapped[list[PolicyFacts]] = orm_relationship(back_populates="policy")
    exclusions: Mapped[list[PolicyExclusion]] = orm_relationship(back_populates="policy")
    sublimits: Mapped[list[PolicySublimit]] = orm_relationship(back_populates="policy")
    flags: Mapped[list[ProtectionFlag]] = orm_relationship(back_populates="policy")


class PolicyFacts(Base):
    """Extracted numbers the rules engine computes on — never re-parsed from prose."""

    __tablename__ = "policy_facts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    policy_id: Mapped[str] = mapped_column(String, ForeignKey("policy.id"), nullable=False, index=True)
    fact_type: Mapped[str] = mapped_column(String, nullable=False, default="health")
    sum_insured: Mapped[float | None] = mapped_column(Float, nullable=True)
    room_rent_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    room_rent_type: Mapped[str | None] = mapped_column(String, nullable=True)
    copay_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    copay_condition: Mapped[str | None] = mapped_column(Text, nullable=True)
    deductible: Mapped[float | None] = mapped_column(Float, nullable=True)
    ped_waiting_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    initial_waiting_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    specific_waiting_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    icu_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    icu_limit_type: Mapped[str | None] = mapped_column(String, nullable=True)
    network_required: Mapped[bool] = mapped_column(Boolean, default=False)
    pre_auth_required: Mapped[bool] = mapped_column(Boolean, default=False)
    sum_assured: Mapped[float | None] = mapped_column(Float, nullable=True)
    cover_type: Mapped[str | None] = mapped_column(String, nullable=True)
    payout_type: Mapped[str | None] = mapped_column(String, nullable=True)
    policy_term_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    premium_paying_term_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    riders: Mapped[str | None] = mapped_column(Text, nullable=True)
    premium_waiver: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    accidental_death_benefit: Mapped[float | None] = mapped_column(Float, nullable=True)
    critical_illness_cover: Mapped[float | None] = mapped_column(Float, nullable=True)
    maturity_benefit: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    surrender_value_available: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    loan_available: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    covers_members: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_basis: Mapped[str | None] = mapped_column(String, nullable=True)
    cumulative_bonus_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    cumulative_bonus_max_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    restoration_benefit: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    pre_hospitalization_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    post_hospitalization_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    day_care_covered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    ambulance_cover: Mapped[float | None] = mapped_column(Float, nullable=True)
    ayush_covered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    modern_treatments_covered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    domiciliary_covered: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    extraction_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    policy: Mapped[Policy] = orm_relationship(back_populates="facts")


class PolicyExclusion(Base):
    """What the contract will not pay — needed for flags and chat."""

    __tablename__ = "policy_exclusions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    policy_id: Mapped[str] = mapped_column(String, ForeignKey("policy.id"), nullable=False, index=True)
    exclusion_text: Mapped[str] = mapped_column(Text, nullable=False)
    exclusion_type: Mapped[str | None] = mapped_column(String, nullable=True)
    waiting_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    waiting_tier: Mapped[str | None] = mapped_column(String, nullable=True)
    condition: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_clause: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    policy: Mapped[Policy] = orm_relationship(back_populates="exclusions")


class PolicySublimit(Base):
    """Internal caps (cataract, room rent) that cut payout below sum insured."""

    __tablename__ = "policy_sublimits"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    policy_id: Mapped[str] = mapped_column(String, ForeignKey("policy.id"), nullable=False, index=True)
    treatment_type: Mapped[str] = mapped_column(String, nullable=False)
    limit_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    limit_type: Mapped[str | None] = mapped_column(String, nullable=True)
    limit_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_clause: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    policy: Mapped[Policy] = orm_relationship(back_populates="sublimits")


class ProtectionFlag(Base):
    """Deterministic finding from the rules engine, later explained by the LLM."""

    __tablename__ = "protection_flags"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    family_id: Mapped[str] = mapped_column(String, ForeignKey("family.id"), nullable=False, index=True)
    member_id: Mapped[str | None] = mapped_column(String, ForeignKey("family_member.id"), nullable=True, index=True)
    policy_id: Mapped[str | None] = mapped_column(String, ForeignKey("policy.id"), nullable=True)
    flag_type: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_clauses: Mapped[str | None] = mapped_column(Text, nullable=True)
    calculated_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    family: Mapped[Family] = orm_relationship(back_populates="flags")
    member: Mapped[FamilyMember | None] = orm_relationship(back_populates="flags")
    policy: Mapped[Policy | None] = orm_relationship(back_populates="flags")


class ScenarioResult(Base):
    """Saved what-if projection so the UI can reload without recomputing."""

    __tablename__ = "scenario_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    family_id: Mapped[str] = mapped_column(String, ForeignKey("family.id"), nullable=False)
    scenario_type: Mapped[str] = mapped_column(String, nullable=False)
    scenario_params: Mapped[str] = mapped_column(Text, nullable=False)
    result_data: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_clauses: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())

    family: Mapped[Family] = orm_relationship(back_populates="scenarios")

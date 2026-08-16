"""Request/response shapes for FastAPI routes."""

from __future__ import annotations

from pydantic import BaseModel, Field


class FamilyCreate(BaseModel):
    name: str


class MemberCreate(BaseModel):
    name: str
    relationship: str
    age: int | None = None
    city: str | None = None
    known_conditions: str | list[str] | None = None
    annual_income: float | None = None


class ScenarioRequest(BaseModel):
    scenario_text: str


class ChatRequest(BaseModel):
    question: str
    policy_id: str | None = Field(default=None)

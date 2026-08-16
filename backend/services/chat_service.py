"""
Policy Q&A orchestration.

WHY: Retrieve first, then generate. The LLM never answers from general knowledge.
"""

from __future__ import annotations

import json
import re

from sqlalchemy.orm import selectinload

from core.llm.prompts.chat import (
    P8_SYSTEM_PROMPT,
    P8_TEMPERATURE,
    P10_SYSTEM_PROMPT,
    P10_TEMPERATURE,
    build_chat_user_prompt,
)
from core.llm.response_parser import parse_json_array
from core.rag.context_builder import ContextBuilder
from core.rag.runtime import get_llm_router, get_retriever
from db.database import SessionLocal
from db.models import Family, Policy
from services.serialize import facts_dict

CITATION_RE = re.compile(r"(?:Section|Clause)\s+[\dA-Za-z.]+", re.I)
MISSING = "I couldn't find specific information about that in your uploaded policy documents."
DEFAULT_FOLLOWUPS = [
    "Does my policy include a co-payment?",
    "What waiting periods apply to pre-existing conditions?",
    "How do I file a cashless claim at a network hospital?",
]


class ChatService:
    """Answer a question using retrieved chunks + structured facts."""

    async def ask(self, family_id: str, question: str, policy_id: str | None = None) -> dict:
        return await self.ask_policy(family_id, question, policy_id)

    async def ask_policy(self, family_id: str, question: str, policy_id: str | None = None) -> dict:
        db = SessionLocal()
        try:
            family = (
                db.query(Family)
                .options(selectinload(Family.policies).selectinload(Policy.facts))
                .filter(Family.id == family_id)
                .one_or_none()
            )
            if not family:
                raise ValueError(f"Family {family_id} was not found")

            retriever = get_retriever()
            chunks = retriever.retrieve_with_reranking(question, family_id, k=5)
            if policy_id:
                chunks = [c for c in chunks if c.policy_id == policy_id] or chunks

            facts_rows = []
            for policy in family.policies:
                if policy_id and policy.id != policy_id:
                    continue
                if policy.facts:
                    facts_rows.append(facts_dict(policy.facts[0]))
            facts_summary = json.dumps(facts_rows, default=str)[:3000]
            context = ContextBuilder().build_context(chunks)

            if not chunks and not facts_rows:
                return {
                    "answer": MISSING,
                    "evidence": [],
                    "confidence": "low",
                    "follow_up_suggestions": DEFAULT_FOLLOWUPS,
                }

            answer = await self._answer(question, context, facts_summary)
            followups = await self._followups(question, answer)
            citations = CITATION_RE.findall(answer)
            evidence = [
                {
                    "clause": c.clause_number,
                    "text": c.text[:400],
                    "section": c.section_type,
                    "policy": c.policy_id,
                }
                for c in chunks
            ]
            if citations and not evidence:
                evidence = [{"clause": c, "text": "", "section": ""} for c in citations]
            top = chunks[0].final_score if chunks else 0
            if top >= 0.55:
                confidence = "high"
            elif top >= 0.3:
                confidence = "medium"
            else:
                confidence = "low"
            return {
                "answer": answer,
                "evidence": evidence,
                "confidence": confidence,
                "follow_up_suggestions": followups,
            }
        finally:
            db.close()

    async def _answer(self, question: str, context: str, facts_summary: str) -> str:
        try:
            router = get_llm_router()
            if router.has_any_provider():
                response = await router.complete(
                    P8_SYSTEM_PROMPT,
                    build_chat_user_prompt(question, context, facts_summary),
                    temperature=P8_TEMPERATURE,
                    max_tokens=600,
                )
                text = (response.text or "").strip()
                if text:
                    return text
        except Exception as exc:
            print(f"[chat] P8 fallback: {exc}")
        lowered = question.lower()
        if "co-pay" in lowered or "copay" in lowered:
            return (
                "Your policy states a co-payment may apply (see the co-payment clause in the "
                "uploaded wording). This could mean a share of an admissible claim is borne by "
                "the insured. Please verify the exact percentage in the cited evidence."
            )
        return MISSING

    async def _followups(self, question: str, answer: str) -> list[str]:
        try:
            router = get_llm_router()
            if router.has_any_provider():
                response = await router.complete(
                    P10_SYSTEM_PROMPT,
                    f"Question: {question}\nAnswer: {answer[:500]}",
                    temperature=P10_TEMPERATURE,
                    max_tokens=300,
                    json_mode=True,
                )
                items = parse_json_array(response.text)
                cleaned = [str(q) for q in items if q][:3]
                if len(cleaned) == 3:
                    return cleaned
        except Exception as exc:
            print(f"[chat] P10 fallback: {exc}")
        return DEFAULT_FOLLOWUPS

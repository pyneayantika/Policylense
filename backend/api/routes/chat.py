"""Policy Q&A. Answers must cite retrieved clauses or say evidence was missing."""

from fastapi import APIRouter

from api.schemas import ChatRequest
from services.chat_service import ChatService

router = APIRouter(tags=["chat"])


@router.post("/family/{family_id}/chat")
async def ask_policy(family_id: str, body: ChatRequest):
    return await ChatService().ask(family_id, body.question, body.policy_id)

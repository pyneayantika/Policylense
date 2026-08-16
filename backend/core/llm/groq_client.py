"""Groq Llama 3.1 8B client (fallback, 30 RPM free)."""

from __future__ import annotations

from config import get_settings
from core.llm.exceptions import RateLimitExceeded
from core.llm.provider import LLMProvider, LLMResponse

GROQ_MODEL = "llama-3.1-8b-instant"


class GroqProvider(LLMProvider):
    """Used when Gemini is rate-limited. Same complete() contract."""

    name = "groq"

    def __init__(self, rpm_limit: int | None = None) -> None:
        super().__init__(rpm_limit=rpm_limit)
        settings = get_settings()
        self._api_key = settings.groq_api_key.strip()
        self._configured = bool(self._api_key)

    def is_configured(self) -> bool:
        return self._configured

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 2000,
        json_mode: bool = False,
    ) -> LLMResponse:
        if not self._configured:
            raise RuntimeError("GROQ_API_KEY is not set")
        self._record_call()
        from groq import AsyncGroq, RateLimitError

        client = AsyncGroq(api_key=self._api_key)
        try:
            kwargs: dict = {
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            response = await client.chat.completions.create(**kwargs)
        except RateLimitError as exc:
            raise RateLimitExceeded(str(exc)) from exc
        except Exception as exc:
            lowered = str(exc).lower()
            if "429" in lowered or "rate" in lowered:
                raise RateLimitExceeded(str(exc)) from exc
            raise

        choice = response.choices[0].message.content or ""
        usage = getattr(response, "usage", None)
        tokens = int(getattr(usage, "total_tokens", 0) or 0) if usage else 0
        return LLMResponse(
            text=choice,
            tokens_used=tokens,
            provider_name=f"groq:{GROQ_MODEL}",
        )

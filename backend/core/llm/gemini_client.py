"""Google Gemini Flash client (primary, 15 RPM free)."""

from __future__ import annotations

import asyncio

from config import get_settings
from core.llm.exceptions import RateLimitExceeded
from core.llm.provider import LLMProvider, LLMResponse

GEMINI_MODELS = ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash")


class GeminiProvider(LLMProvider):
    """Call gemini-2.5-flash (or 2.0-flash); track RPM so the router can fail over."""

    name = "gemini"

    def __init__(self, rpm_limit: int | None = None) -> None:
        super().__init__(rpm_limit=rpm_limit)
        settings = get_settings()
        self._api_key = settings.gemini_api_key.strip()
        self._model_name = GEMINI_MODELS[0]
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
            raise RuntimeError("GEMINI_API_KEY is not set")
        self._record_call()
        return await asyncio.to_thread(
            self._complete_sync,
            system_prompt,
            user_prompt,
            temperature,
            max_tokens,
            json_mode,
        )

    def _complete_sync(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_tokens: int,
        json_mode: bool = False,
    ) -> LLMResponse:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self._api_key)
        last_error: Exception | None = None
        for model_name in GEMINI_MODELS:
            try:
                config: dict = {
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                }
                if json_mode:
                    config["response_mime_type"] = "application/json"
                if "2.5" in model_name:
                    config["thinking_config"] = types.ThinkingConfig(
                        thinking_budget=0
                    )
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        **config,
                    ),
                )
                text = getattr(response, "text", None) or ""
                if not text and getattr(response, "candidates", None):
                    parts = []
                    for cand in response.candidates:
                        content = getattr(cand, "content", None)
                        if content:
                            for part in getattr(content, "parts", []) or []:
                                parts.append(getattr(part, "text", "") or "")
                    text = "".join(parts)
                usage = getattr(response, "usage_metadata", None)
                tokens = 0
                if usage is not None:
                    tokens = int(
                        getattr(usage, "total_token_count", 0)
                        or getattr(usage, "total_tokens", 0)
                        or 0
                    )
                self._model_name = model_name
                return LLMResponse(
                    text=text,
                    tokens_used=tokens,
                    provider_name=f"gemini:{model_name}",
                )
            except Exception as exc:
                last_error = exc
                lowered = str(exc).lower()
                if "429" in lowered or "resource exhausted" in lowered or "rate" in lowered:
                    raise RateLimitExceeded(str(exc)) from exc
                if "not found" in lowered or "404" in lowered:
                    continue
                raise
        raise last_error or RuntimeError("Gemini call failed")

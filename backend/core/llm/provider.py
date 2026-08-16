"""
LLM provider abstraction + Gemini → Groq router.

WHY: Free-tier rate limits will be hit in a demo. Business code should not
import Gemini or Groq directly.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass

from config import get_settings
from core.llm.exceptions import RateLimitExceeded


@dataclass
class LLMResponse:
    text: str
    tokens_used: int = 0
    provider_name: str = ""


class LLMProvider(ABC):
    """Swap Gemini / Groq / a local model without changing callers."""

    name: str = "unknown"
    rpm_limit: int = 15

    def __init__(self, rpm_limit: int | None = None) -> None:
        if rpm_limit is not None:
            self.rpm_limit = rpm_limit
        self._call_times: list[float] = []

    def _prune(self) -> None:
        cutoff = time.time() - 60
        self._call_times = [t for t in self._call_times if t > cutoff]

    def is_available(self) -> bool:
        """False when RPM budget is exhausted."""
        self._prune()
        return len(self._call_times) < self.rpm_limit

    def _record_call(self) -> None:
        self._prune()
        self._call_times.append(time.time())

    def rpm_used(self) -> int:
        self._prune()
        return len(self._call_times)

    @abstractmethod
    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 2000,
        json_mode: bool = False,
    ) -> LLMResponse:
        pass


class LLMRouter:
    """Try Gemini first; fall back to Groq on 429 / rate limit."""

    def __init__(self) -> None:
        from core.llm.gemini_client import GeminiProvider
        from core.llm.groq_client import GroqProvider

        settings = get_settings()
        self.gemini = GeminiProvider(rpm_limit=settings.gemini_rpm_limit)
        self.groq = GroqProvider(rpm_limit=settings.groq_rpm_limit)

    def get_provider(self) -> LLMProvider:
        """Return the first provider still under its RPM cap."""
        if self.gemini.is_configured() and self.gemini.is_available():
            return self.gemini
        if self.groq.is_configured() and self.groq.is_available():
            return self.groq
        raise RuntimeError("No LLM provider available (missing keys or RPM exhausted)")

    def has_any_provider(self) -> bool:
        return self.gemini.is_configured() or self.groq.is_configured()

    def token_budget(self) -> int:
        """Gemini context is larger; Groq-only runs stay tighter."""
        if self.gemini.is_configured() and self.gemini.is_available():
            return 8000
        return 5000

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 2000,
        json_mode: bool = False,
    ) -> LLMResponse:
        errors: list[str] = []
        for provider in (self.gemini, self.groq):
            if not provider.is_configured():
                continue
            if not provider.is_available():
                print(
                    f"[llm] skip {provider.name}: RPM {provider.rpm_used()}/{provider.rpm_limit}"
                )
                continue
            try:
                print(
                    f"[llm] call {provider.name} temp={temperature} "
                    f"rpm={provider.rpm_used() + 1}/{provider.rpm_limit} json={json_mode}"
                )
                response = await provider.complete(
                    system_prompt,
                    user_prompt,
                    temperature,
                    max_tokens,
                    json_mode=json_mode,
                )
                print(
                    f"[llm] ok {response.provider_name} tokens={response.tokens_used} "
                    f"chars={len(response.text)}"
                )
                return response
            except RateLimitExceeded as exc:
                print(f"[llm] {provider.name} rate-limited, trying fallback: {exc}")
                errors.append(f"{provider.name}: {exc}")
                continue
            except Exception as exc:
                print(f"[llm] {provider.name} error, trying fallback: {exc}")
                errors.append(f"{provider.name}: {exc}")
                continue
        raise RuntimeError("All LLM providers failed: " + "; ".join(errors))

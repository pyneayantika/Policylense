"""Errors that extraction and the LLM router can recover from."""


class RateLimitExceeded(Exception):
    """Provider returned 429 / resource exhausted — router should fall back."""


class ExtractionError(Exception):
    """LLM output could not be parsed as JSON. Includes the raw text."""

    def __init__(self, message: str, raw_text: str = "") -> None:
        super().__init__(message)
        self.raw_text = raw_text

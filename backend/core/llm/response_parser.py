"""
Strip markdown fences and parse JSON from LLM output.

WHY: Models wrap JSON in ```json even when told not to. Extraction must not
crash the ingestion pipeline on that.
"""

from __future__ import annotations

import json
from typing import Any

from core.llm.exceptions import ExtractionError


def parse_json_response(raw: str) -> dict:
    """Parse a JSON object from model output. Retry-safe on failure."""
    text = _strip_fences(raw)
    text = (
        text.replace("\ufeff", "")
        .replace("“", '"')
        .replace("”", '"')
        .replace("‘", "'")
        .replace("’", "'")
        .replace("｛", "{")
        .replace("｝", "}")
    )
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ExtractionError("No JSON object found in LLM response", raw_text=raw)
    snippet = text[start : end + 1]
    try:
        data = json.loads(snippet)
    except json.JSONDecodeError as exc:
        raise ExtractionError(f"Invalid JSON: {exc}", raw_text=raw) from exc
    if not isinstance(data, dict):
        raise ExtractionError("Parsed JSON is not an object", raw_text=raw)
    return data


def parse_json_array(raw: str) -> list:
    """Parse a JSON array (exclusions / sub-limits / follow-ups)."""
    text = _strip_fences(raw)
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        raise ExtractionError("No JSON array found in LLM response", raw_text=raw)
    snippet = text[start : end + 1]
    try:
        data = json.loads(snippet)
    except json.JSONDecodeError as exc:
        raise ExtractionError(f"Invalid JSON array: {exc}", raw_text=raw) from exc
    if not isinstance(data, list):
        raise ExtractionError("Parsed JSON is not an array", raw_text=raw)
    return data


def _strip_fences(raw: str) -> str:
    text = (raw or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
        if text.lower().startswith("json"):
            text = text[4:].lstrip()
    return text.replace("```json", "").replace("```", "").strip()


class ResponseParser:
    """Find the first { ... } or [ ... ] and json.loads it."""

    def parse_json_object(self, raw_response: str) -> dict[str, Any]:
        return parse_json_response(raw_response)

    def parse_json_array(self, raw_response: str) -> list[Any]:
        return parse_json_array(raw_response)

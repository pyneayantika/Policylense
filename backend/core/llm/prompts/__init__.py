"""LLM prompts package (P1–P11)."""

from core.llm.prompts.chat import P8_SYSTEM_PROMPT, P8_USER_TEMPLATE, P10_SYSTEM_PROMPT
from core.llm.prompts.explanation import P5_SYSTEM_PROMPT, P5_USER_TEMPLATE, P11_SYSTEM_PROMPT
from core.llm.prompts.extraction import (
    P1_SYSTEM_PROMPT,
    P1_USER_TEMPLATE,
    P2_SYSTEM_PROMPT,
    P3_SYSTEM_PROMPT,
    P4_SYSTEM_PROMPT,
    P9_SYSTEM_PROMPT,
)
from core.llm.prompts.scenario import P6_SYSTEM_PROMPT, P7_SYSTEM_PROMPT, P7_USER_TEMPLATE

__all__ = [
    "P1_SYSTEM_PROMPT",
    "P1_USER_TEMPLATE",
    "P2_SYSTEM_PROMPT",
    "P3_SYSTEM_PROMPT",
    "P4_SYSTEM_PROMPT",
    "P5_SYSTEM_PROMPT",
    "P5_USER_TEMPLATE",
    "P6_SYSTEM_PROMPT",
    "P7_SYSTEM_PROMPT",
    "P7_USER_TEMPLATE",
    "P8_SYSTEM_PROMPT",
    "P8_USER_TEMPLATE",
    "P9_SYSTEM_PROMPT",
    "P10_SYSTEM_PROMPT",
    "P11_SYSTEM_PROMPT",
]

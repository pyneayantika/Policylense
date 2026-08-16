"""
Fill concept templates with this member's policy numbers.

WHY: 'Co-pay is 20%' is a definition. 'Ramesh pays ₹1L on a ₹5L claim' is
comprehension. Math still comes from facts/rules, not the LLM.
"""

from typing import Any


class ConceptPersonalizer:
    """Inject member name, copay, SI, waiting months into explainer JSON."""

    def personalize(self, concept_id: str, member: Any, policy_facts: Any) -> dict:
        """Return title, explanation, visual_data, optional check_question."""
        pass

"""
Highlight insurance terms in UI copy.

WHY: Users should tap 'co-pay' on the dashboard, not leave the app to Google it.
"""


class TermDetector:
    """Regex-scan text and return marked spans with concept ids."""

    def detect_and_mark(self, text: str) -> dict:
        """Return original_text, marked_text, detected_terms, term_positions."""
        pass

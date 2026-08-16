"""Comprehension layer: concept library, personalizer, term detector."""

from core.comprehension.concept_library import CONCEPTS, get_concept
from core.comprehension.personalizer import ConceptPersonalizer
from core.comprehension.term_detector import TermDetector

__all__ = ["CONCEPTS", "get_concept", "ConceptPersonalizer", "TermDetector"]

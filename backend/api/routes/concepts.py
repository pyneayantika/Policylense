"""Comprehension-layer concept explainers."""

from fastapi import APIRouter, HTTPException

from core.comprehension.concept_library import CONCEPTS, get_concept

router = APIRouter(tags=["concepts"])


@router.get("/concepts")
def list_concepts():
    return [
        {
            "concept_id": cid,
            "title": data["title"],
            "category": data.get("category", ""),
            "difficulty": data.get("difficulty", ""),
            "one_line": data["one_line"],
        }
        for cid, data in CONCEPTS.items()
    ]


@router.get("/concepts/{concept_id}")
def get_concept_detail(concept_id: str):
    data = get_concept(concept_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Concept '{concept_id}' not found")
    return {
        "concept_id": concept_id,
        "title": data["title"],
        "one_line": data["one_line"],
        "explanation": data["one_line"],
        "misconception": data.get("misconception"),
        "related_concepts": [],
    }

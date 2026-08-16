"""Family protection dashboard payload."""

from fastapi import APIRouter

from services.analysis_service import AnalysisService

router = APIRouter(tags=["protection"])


@router.get("/family/{family_id}/protection")
def get_protection(family_id: str):
    return AnalysisService().get_protection_summary(family_id)

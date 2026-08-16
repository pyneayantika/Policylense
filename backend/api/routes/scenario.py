"""What-if scenario simulation. Numbers come from the rules engine, not the LLM."""

from fastapi import APIRouter

from api.schemas import ScenarioRequest
from services.scenario_service import ScenarioService

router = APIRouter(tags=["scenario"])


@router.post("/family/{family_id}/scenarios")
async def simulate_scenario(family_id: str, body: ScenarioRequest):
    return await ScenarioService().simulate(family_id, body.scenario_text)

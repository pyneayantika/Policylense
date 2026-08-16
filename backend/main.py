"""
HTTP entry point.

WHY: This file only wires the app — CORS, error handlers, routers, health.
Business logic lives in services/ and core/, so routes stay thin later.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware.error_handler import register_error_handlers
from api.routes import chat, concepts, family, policy, protection, scenario
from config import get_settings
from db.database import create_all_tables

settings = get_settings()

app = FastAPI(
    title="Policy Intelligence",
    description="Family protection visibility from uploaded insurance PDFs. Indicative analysis, not advice.",
    version="0.1.0",
)

register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(family.router, prefix="/api/v1")
app.include_router(policy.router, prefix="/api/v1")
app.include_router(protection.router, prefix="/api/v1")
app.include_router(scenario.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(concepts.router, prefix="/api/v1")


@app.on_event("startup")
def on_startup() -> None:
    """Create tables if missing so a fresh Railway container still boots."""
    create_all_tables()
    print("Policy Intelligence backend started")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check for local dev and Railway."""
    return {"status": "ok", "version": "0.1.0"}

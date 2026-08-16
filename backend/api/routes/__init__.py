"""Shared 501 stub until a phase fills the real handler."""

from fastapi.responses import JSONResponse


def not_implemented(endpoint: str) -> JSONResponse:
    """Honest placeholder: the route exists so the frontend can be wired early."""
    return JSONResponse(
        status_code=501,
        content={"status": "not_implemented", "endpoint": endpoint},
    )

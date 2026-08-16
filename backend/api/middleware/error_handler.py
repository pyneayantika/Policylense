"""
Turn exceptions into structured JSON (Arch §11.2).

WHY: A traceback in the browser looks like the product is broken. A code +
message tells the UI what to show (re-upload, invalid input, retry).
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError


def _error_body(code: str, message: str, details: dict | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or {}}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception(_request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body("HTTP_ERROR", str(exc.detail), {"status_code": exc.status_code}),
        )

    @app.exception_handler(FileNotFoundError)
    async def missing_file(_request: Request, exc: FileNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content=_error_body("FILE_NOT_FOUND", str(exc) or "The requested file was not found."),
        )

    @app.exception_handler(ValueError)
    async def bad_value(_request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_body("INVALID_VALUE", str(exc)),
        )

    @app.exception_handler(ValidationError)
    async def pydantic_error(_request: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_body("VALIDATION_ERROR", "Request data did not match the expected schema.", {"errors": exc.errors()}),
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=_error_body("VALIDATION_ERROR", "Request data did not match the expected schema.", {"errors": exc.errors()}),
        )

    @app.exception_handler(Exception)
    async def unhandled(_request: Request, exc: Exception) -> JSONResponse:
        print(f"[error] Unhandled: {exc!r}")
        return JSONResponse(
            status_code=500,
            content=_error_body("INTERNAL_ERROR", "Something went wrong while processing your request.", {"type": type(exc).__name__}),
        )

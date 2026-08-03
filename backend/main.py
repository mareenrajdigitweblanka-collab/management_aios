"""FastAPI application entrypoint for the member dashboard schedule API.

Local draft only — see backend/README.md for the testing/demo truth boundary
this service is designed to preserve. This app does not create or migrate any
database schema on startup; apply database/member_schedule_events_schema.sql
manually against your own PostgreSQL instance first.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import (
    ALLOWED_ORIGIN_REGEX,
    ALLOWED_ORIGINS,
    SERVICE_NAME,
    load_calendar_auth_token_hashes,
)
from backend.routers.calendar_auth import router as calendar_auth_router
from backend.routers.member_leave import router as member_leave_router
from backend.routers.member_schedules import router as member_schedules_router
from backend.routers.staff import router as staff_router
from backend.routers.staff_review_summaries import router as staff_review_summaries_router
from backend.schemas import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail closed (Calendar member-token authorization, 2026-07-29):
    # refuse to start serving traffic if the five per-member
    # CALENDAR_AUTH_TOKEN_HASH_* values are not safely configured — see
    # backend/config.py load_calendar_auth_token_hashes for exactly what
    # "safely configured" requires (all five present, valid SHA-256 hex,
    # unique). A misconfigured deployment must never silently serve
    # traffic with authorization disabled or broken.
    load_calendar_auth_token_hashes()
    yield


app = FastAPI(title="Management AIOS — Member Schedule API", lifespan=lifespan)

# CORS: ALLOWED_ORIGINS (backend/config.py) is an explicit, env-configurable
# list that defaults to the production dashboard origin
# (https://management-aios.vercel.app). ALLOWED_ORIGIN_REGEX separately
# allows any localhost/127.0.0.1 port for local static-server/file-based
# development. Neither is a wildcard ("*"). allow_credentials stays False —
# the Calendar member-token authorization feature (2026-07-29) sends its
# token via a plain Authorization: Bearer header, which is not a credentialed
# (cookie-based) request and does not require allow_credentials=True; keeping
# it False is also what keeps the regex-based localhost-any-port allowance
# safe. allow_headers now includes Authorization alongside the pre-existing
# Content-Type so the browser's CORS preflight (OPTIONS) for a mutation
# request carrying that header succeeds.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(member_schedules_router)
app.include_router(member_leave_router)
app.include_router(staff_router)
app.include_router(calendar_auth_router)
app.include_router(staff_review_summaries_router)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok", "service": SERVICE_NAME}

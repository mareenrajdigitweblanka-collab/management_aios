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
from backend.routers.knowledge_documents import router as knowledge_documents_router
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
#
# expose_headers=["Content-Disposition"] (REQ-CAL-REV-PDF-003-FIX-02,
# 2026-08-06) — proven root cause of the production "review-summaries.pdf"
# filename defect: the frontend (management-aios.vercel.app) and backend
# (management-aios-api.vercel.app) are different origins, and a browser's
# fetch() Response.headers only exposes a small CORS-safelisted set of
# response headers to JavaScript by default (Cache-Control, Content-
# Language, Content-Length, Content-Type, Expires, Last-Modified, Pragma).
# Content-Disposition is not in that list, so res.headers.get('Content-
# Disposition') silently returned null even though the header was present
# on the wire — this single missing entry, not the filename-generation
# logic itself, was the entire defect. Only this one header is exposed;
# every other CORS setting (origins, methods, allow_headers, credentials)
# is unchanged.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=False,
    # PATCH added (REQ-KM-CRUD-003) for the Knowledge Management metadata-
    # update route (PATCH /api/knowledge-documents/{document_id}) — no
    # other existing route uses PATCH, so this is additive only.
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Disposition"],
)

app.include_router(member_schedules_router)
app.include_router(member_leave_router)
app.include_router(staff_router)
app.include_router(calendar_auth_router)
app.include_router(staff_review_summaries_router)
app.include_router(knowledge_documents_router)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok", "service": SERVICE_NAME}

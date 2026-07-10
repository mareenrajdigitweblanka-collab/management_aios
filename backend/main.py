"""FastAPI application entrypoint for the member dashboard schedule API.

Local draft only — see backend/README.md for the testing/demo truth boundary
this service is designed to preserve. This app does not create or migrate any
database schema on startup; apply database/member_schedule_events_schema.sql
manually against your own PostgreSQL instance first.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import SERVICE_NAME
from backend.routers.member_schedules import router as member_schedules_router
from backend.schemas import HealthResponse

app = FastAPI(title="Management AIOS — Member Schedule API")

# Local-development-only CORS: the dashboard is opened from a local static
# server (e.g. `python -m http.server` on 127.0.0.1/localhost), never from a
# production origin. No credentialed (cookie/auth-header) cross-origin
# requests are made by this frontend, so allow_credentials stays False —
# that keeps the regex-based localhost/127.0.0.1-any-port allowance safe.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(member_schedules_router)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok", "service": SERVICE_NAME}

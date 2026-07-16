"""FastAPI application entrypoint for the member dashboard schedule API.

Local draft only — see backend/README.md for the testing/demo truth boundary
this service is designed to preserve. This app does not create or migrate any
database schema on startup; apply database/member_schedule_events_schema.sql
manually against your own PostgreSQL instance first.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import ALLOWED_ORIGIN_REGEX, ALLOWED_ORIGINS, SERVICE_NAME
from backend.routers.member_leave import router as member_leave_router
from backend.routers.member_schedules import router as member_schedules_router
from backend.routers.staff import router as staff_router
from backend.schemas import HealthResponse

app = FastAPI(title="Management AIOS — Member Schedule API")

# CORS: ALLOWED_ORIGINS (backend/config.py) is an explicit, env-configurable
# list that defaults to the production dashboard origin
# (https://management-aios.vercel.app). ALLOWED_ORIGIN_REGEX separately
# allows any localhost/127.0.0.1 port for local static-server/file-based
# development. Neither is a wildcard ("*"), and no credentialed
# (cookie/auth-header) cross-origin requests are made by this frontend, so
# allow_credentials stays False — that is what keeps the regex-based
# localhost-any-port allowance safe.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(member_schedules_router)
app.include_router(member_leave_router)
app.include_router(staff_router)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok", "service": SERVICE_NAME}

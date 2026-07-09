"""FastAPI application entrypoint for the member dashboard schedule API.

Local draft only — see backend/README.md for the testing/demo truth boundary
this service is designed to preserve. This app does not create or migrate any
database schema on startup; apply database/member_schedule_events_schema.sql
manually against your own PostgreSQL instance first.
"""

from fastapi import FastAPI

from backend.config import SERVICE_NAME
from backend.routers.member_schedules import router as member_schedules_router
from backend.schemas import HealthResponse

app = FastAPI(title="Management AIOS — Member Schedule API")

app.include_router(member_schedules_router)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok", "service": SERVICE_NAME}

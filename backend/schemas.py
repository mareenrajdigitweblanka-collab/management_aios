"""Pydantic request/response schemas for the member schedule API.

Validation rules implemented here (per implementation requirements):
- title required, max 60 characters
- notes max 240 characters
- priority must be High / Medium / Low
- date must be a valid date
- start/end optional; if both present, end must be greater than start
- source_scope and is_official_truth are never accepted from create/update
  request bodies — they are server-controlled only.

Category (2026-07-14): create requests accept only the two permanent
values (VALID_SCHEDULE_CATEGORIES) — the requested value is a hint the
router's classify_schedule_category() may still override to "Unscheduled
Task" for a late-created task (see backend/routers/member_schedules.py).
Update requests keep `category` as a loosely-typed optional field on
purpose: the router compares any supplied value against the row's stored
category and rejects a mismatch with 422 rather than silently applying it
(see update_member_schedule_event) — the field is not validated against
the enum here so that message is the one the client sees, not a generic
Pydantic enum error. MemberScheduleEventOut.category stays a plain `str`
(not the enum) so existing pre-migration rows with an old placeholder
category value can still be read/serialized without breaking GET.
"""

from datetime import date as date_type, datetime, time as time_type
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from backend.config import DEFAULT_SCHEDULE_CATEGORY, VALID_PRIORITIES

ScheduleCategory = Literal["Scheduled Task", "Unscheduled Task"]


class MemberScheduleEventCreate(BaseModel):
    date: date_type
    title: str = Field(..., max_length=60, min_length=1)
    category: ScheduleCategory = DEFAULT_SCHEDULE_CATEGORY
    priority: str = Field(default="Medium")
    start: Optional[time_type] = None
    end: Optional[time_type] = None
    notes: Optional[str] = Field(default=None, max_length=240)

    @field_validator("priority")
    @classmethod
    def priority_must_be_valid(cls, value: str) -> str:
        if value not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of {VALID_PRIORITIES}")
        return value

    @model_validator(mode="after")
    def end_after_start(self) -> "MemberScheduleEventCreate":
        if self.start is not None and self.end is not None and self.end <= self.start:
            raise ValueError("end must be greater than start when both are provided")
        return self


class MemberScheduleEventUpdate(BaseModel):
    """Editable fields only. source_scope and is_official_truth are
    intentionally absent from this model so they can never be set via the
    update endpoint, regardless of request body content.

    `category` is intentionally kept as a loosely-typed Optional[str], not
    the ScheduleCategory enum — it exists only so the router can detect a
    client attempting to change it and reject with a clear 422 message
    (see update_member_schedule_event). It is never assigned to the ORM
    row in this router regardless of value."""

    date: Optional[date_type] = None
    title: Optional[str] = Field(default=None, max_length=60, min_length=1)
    category: Optional[str] = None
    priority: Optional[str] = None
    start: Optional[time_type] = None
    end: Optional[time_type] = None
    notes: Optional[str] = Field(default=None, max_length=240)

    @field_validator("priority")
    @classmethod
    def priority_must_be_valid(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of {VALID_PRIORITIES}")
        return value

    @model_validator(mode="after")
    def end_after_start(self) -> "MemberScheduleEventUpdate":
        if self.start is not None and self.end is not None and self.end <= self.start:
            raise ValueError("end must be greater than start when both are provided")
        return self


class MemberScheduleEventOut(BaseModel):
    id: UUID
    member_key: str
    member_label: str
    date: date_type = Field(validation_alias="event_date")
    title: str
    category: str
    priority: str
    start: Optional[time_type] = Field(default=None, validation_alias="start_time")
    end: Optional[time_type] = Field(default=None, validation_alias="end_time")
    notes: Optional[str] = None
    source_scope: str
    is_official_truth: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class HealthResponse(BaseModel):
    status: str
    service: str


class DailyScheduleReportOut(BaseModel):
    member_key: str
    date: date_type
    scheduled_count: int
    unscheduled_count: int
    total_count: int
    scheduled_percentage: int
    unscheduled_percentage: int


class WeeklyScheduleReportOut(BaseModel):
    member_key: str
    week_start: date_type
    week_end: date_type
    scheduled_count: int
    unscheduled_count: int
    total_count: int
    scheduled_percentage: int
    unscheduled_percentage: int


class StaffRecordOut(BaseModel):
    """Dashboard-facing staff record shape — exactly the 16 approved fields
    (member-aios/staff-data/data-maps/staff-field-map-draft.md). Internal
    bookkeeping columns (source_record_key, source_hash, source_status,
    is_current, imported_at, imported_by, created_at, updated_at) are
    intentionally not exposed here — this is a read-only dashboard
    projection, not a full table dump. No salary/address/email/phone/
    guardian field exists on the ORM model this is built from, so none can
    appear here regardless of this schema's definition."""

    employee_number: Optional[str] = None
    epf_number: Optional[str] = None
    date_of_joining: Optional[date_type] = None
    full_name: Optional[str] = None
    calling_name: Optional[str] = None
    location: Optional[str] = None
    staff_status: Optional[str] = None
    department_team: Optional[str] = None
    designation: Optional[str] = None
    cv_reference: Optional[str] = None
    nic: Optional[str] = None
    remarks: Optional[str] = None
    employment_stage: Optional[str] = None
    source_file: Optional[str] = None
    source_page: Optional[int] = None
    source_row_reference: Optional[str] = None

    model_config = {"from_attributes": True}


class StaffListResponse(BaseModel):
    records: list[StaffRecordOut]
    total: int
    limit: int
    offset: int
    filters: dict


class StaffSummaryResponse(BaseModel):
    total: int
    active: int
    inactive: int
    ph: int
    permanent: int
    probation: int
    training_7_day: int
    verify: int


class StaffFilterOptionsResponse(BaseModel):
    teams: list[str]
    staff_statuses: list[str]
    employment_stages: list[str]
    locations: list[str]

"""SQLAlchemy ORM model for management_aios.member_schedule_events.

This model mirrors database/member_schedule_events_schema.sql exactly. It
does not create or alter the table itself — the SQL file is the source of
truth for schema DDL; this class is only the Python-side mapping used by
the API.

2026-07-13: the member_key CHECK constraint below has been updated to
include 'paraparan', matching the target state defined in
database/member_schedule_events_schema.sql and the draft migration at
database/migrations/2026-07-13-add-paraparan-member-key.sql. This
CheckConstraint is inert against an already-existing table (it only takes
effect if Base.metadata.create_all() were run against a fresh database,
which this codebase never does) — the actual deployed table's constraint
is not changed until that migration is explicitly applied. Until then, a
live create/update request with member_key='paraparan' will be accepted by
this API's Python-level validation (backend/config.py VALID_MEMBER_KEYS)
but rejected by PostgreSQL's still-unmigrated CHECK constraint.
"""

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Integer,
    String,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from backend.database import Base


class MemberScheduleEvent(Base):
    __tablename__ = "member_schedule_events"
    __table_args__ = (
        CheckConstraint(
            "member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')",
            name="member_schedule_events_member_key_check",
        ),
        CheckConstraint(
            "priority IN ('High', 'Medium', 'Low')",
            name="member_schedule_events_priority_check",
        ),
        CheckConstraint(
            "source_scope IN ('dashboard_testing', 'pilot', 'approved_live')",
            name="member_schedule_events_source_scope_check",
        ),
        CheckConstraint(
            "start_time IS NULL OR end_time IS NULL OR end_time > start_time",
            name="member_schedule_events_time_check",
        ),
        {"schema": "management_aios"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    member_key = Column(String, nullable=False)
    member_label = Column(String, nullable=False)

    event_date = Column(Date, nullable=False)
    title = Column(String(60), nullable=False)
    category = Column(String, nullable=False, server_default="Sample Task")
    priority = Column(String, nullable=False, server_default="Medium")
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    notes = Column(String(240), nullable=True)

    source_scope = Column(String, nullable=False, server_default="dashboard_testing")
    is_official_truth = Column(Boolean, nullable=False, server_default=text("false"))

    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class StaffDashboardRecord(Base):
    """SQLAlchemy ORM model for management_aios.staff_dashboard_records.

    Mirrors database/migrations/2026-07-13-create-staff-dashboard-records.sql
    exactly. A read-model dashboard projection only — HR remains the
    authoritative staff-record source (CLAUDE.md §9.1). The only write path
    to this table is scripts/import_staff_dashboard_csv.py; this API is
    read-only for staff records (no create/update/delete route exists for
    this model).

    Deliberately has no salary/home_address/personal_email/personal_phone/
    contact_number/guardian_phone/guardian_number column — not filtered at
    query time, simply absent from the schema.
    """

    __tablename__ = "staff_dashboard_records"
    __table_args__ = (
        CheckConstraint(
            "staff_status IS NULL OR staff_status IN ('Active', 'Inactive')",
            name="staff_dashboard_records_staff_status_check",
        ),
        CheckConstraint(
            "employment_stage IS NULL OR employment_stage IN "
            "('Permanent', 'Probation', 'training_7_day', '[VERIFY]')",
            name="staff_dashboard_records_employment_stage_check",
        ),
        CheckConstraint(
            "source_status IN ('imported', 'superseded')",
            name="staff_dashboard_records_source_status_check",
        ),
        {"schema": "management_aios"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Deterministic, not employee_number alone — the HR source has reused
    # employee_number values across distinct people (see
    # member-aios/staff-data/evidence/hr-duplicate-employee-id-review-2026-07-13.md).
    source_record_key = Column(String, nullable=False, unique=True)

    employee_number = Column(String, nullable=True)
    epf_number = Column(String, nullable=True)
    date_of_joining = Column(Date, nullable=True)
    full_name = Column(String, nullable=True)
    calling_name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    staff_status = Column(String, nullable=True)
    department_team = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    cv_reference = Column(String, nullable=True)
    nic = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    employment_stage = Column(String, nullable=True)
    source_file = Column(String, nullable=True)
    source_page = Column(Integer, nullable=True)
    source_row_reference = Column(String, nullable=True)

    source_hash = Column(String, nullable=False)
    source_status = Column(String, nullable=False, server_default="imported")
    is_current = Column(Boolean, nullable=False, server_default=text("true"))
    imported_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    imported_by = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

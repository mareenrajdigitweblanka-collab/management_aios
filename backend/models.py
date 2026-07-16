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

2026-07-14: same pattern applies to the new category CheckConstraint below
— it reflects the target state adopted by
database/member_schedule_events_schema.sql and applied to the live table
by database/migrations/2026-07-14-schedule-task-category-classification.sql.
It has no effect on the already-existing live table until that migration
runs; Python-level enforcement (backend/schemas.py ScheduleCategory,
backend/routers/member_schedules.py classify_schedule_category and the
update-lock check) is what actually protects the API in the meantime.
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
            "category IN ('Scheduled Task', 'Unscheduled Task')",
            name="member_schedule_events_category_check",
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
    category = Column(String, nullable=False, server_default="Scheduled Task")
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


class MemberLeaveRecord(Base):
    """SQLAlchemy ORM model for management_aios.member_leave_records
    (REQ-LEAVE-COPY-001). Mirrors database/member_leave_records_schema.sql
    exactly — same "Python mapping only, SQL file is DDL truth" convention
    as MemberScheduleEvent above.

    This table is a calendar coordination copy of leave, never official HR
    leave truth. coordination_copy_only is fixed TRUE at both the DB
    (CheckConstraint) and API layers and is never client-settable. No
    field on this model calculates or claims official leave balance,
    payroll, no-pay status, disciplinary status, or medical truth.
    created_by/updated_by are optional, unauthenticated free-text labels —
    this feature has no auth/session/role model, matching
    MemberScheduleEvent.
    """

    __tablename__ = "member_leave_records"
    __table_args__ = (
        CheckConstraint(
            "member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')",
            name="member_leave_records_member_key_check",
        ),
        CheckConstraint(
            "leave_type IN ('Short Leave', 'Half-Day First', 'Half-Day Second', "
            "'Full-Day', 'Multi-Day')",
            name="member_leave_records_leave_type_check",
        ),
        CheckConstraint(
            "status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')",
            name="member_leave_records_status_check",
        ),
        CheckConstraint(
            "(leave_type IN ('Half-Day First', 'Half-Day Second') "
            "AND half_day_period IS NOT NULL) "
            "OR (leave_type NOT IN ('Half-Day First', 'Half-Day Second') "
            "AND half_day_period IS NULL)",
            name="member_leave_records_half_day_period_pairing_check",
        ),
        CheckConstraint(
            "half_day_period IS NULL OR half_day_period IN ('First', 'Second')",
            name="member_leave_records_half_day_period_value_check",
        ),
        CheckConstraint(
            "end_date >= start_date",
            name="member_leave_records_date_range_check",
        ),
        CheckConstraint(
            "leave_type = 'Multi-Day' OR end_date = start_date",
            name="member_leave_records_single_day_range_check",
        ),
        CheckConstraint(
            "leave_type != 'Short Leave' "
            "OR (start_time IS NOT NULL AND end_time IS NOT NULL)",
            name="member_leave_records_short_leave_time_required_check",
        ),
        CheckConstraint(
            "leave_type = 'Short Leave' "
            "OR (start_time IS NULL AND end_time IS NULL)",
            name="member_leave_records_non_short_leave_no_time_check",
        ),
        CheckConstraint(
            "start_time IS NULL OR end_time IS NULL OR end_time > start_time",
            name="member_leave_records_time_check",
        ),
        CheckConstraint(
            "coordination_copy_only = TRUE",
            name="member_leave_records_coordination_copy_check",
        ),
        {"schema": "management_aios"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    member_key = Column(String, nullable=False)
    member_label = Column(String, nullable=False)

    leave_type = Column(String, nullable=False)
    half_day_period = Column(String, nullable=True)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    status = Column(String, nullable=False, server_default="Pending")

    purpose = Column(String(240), nullable=True)
    external_reference = Column(String(120), nullable=True)

    coordination_copy_only = Column(Boolean, nullable=False, server_default=text("true"))
    policy_source_id = Column(String, nullable=False, server_default="SRC-POLICY-001")

    # Snapshotted once, at the moment status becomes Approved. NULL until
    # then. Never recomputed from live configuration afterward — see
    # backend/routers/leave_logic.py snapshot_effective_leave_minutes().
    effective_leave_minutes = Column(Integer, nullable=True)

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

    # Per-update actor, distinct from imported_by (set once, at import time).
    # Added by database/migrations/2026-07-13-add-updated-by-to-staff-dashboard-records.sql
    # for scripts/update_staff_locations_from_hr_sources.py. Not part of the
    # 16-field dashboard API contract (StaffRecordOut) — bookkeeping only.
    updated_by = Column(String, nullable=True)

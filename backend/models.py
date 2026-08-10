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
runs; Python-level enforcement (the two allowed values in
backend/config.py VALID_SCHEDULE_CATEGORIES, and
backend/routers/member_schedules.py classify_new_task/classify_updated_task,
which are the only functions that ever assign this column) is what
actually protects the API in the meantime.

2026-07-24: same pattern again for the new outcome/outcome_reason/
outcome_updated_at/outcome_updated_by columns and their two CheckConstraints
(CONFIRMED UNTOUCHED-TASK OUTCOME task, extended same-day by the FINAL
CONFIRMED REASON-TRANSITION RULE) — target state mirrored in
database/member_schedule_events_schema.sql and applied to the live table
by database/migrations/2026-07-24-add-task-outcome-column.sql. As of this
task, that migration is a reviewed DRAFT only — confirmed NOT yet executed
against the live production database (verified directly via the Neon SQL
Editor: the live table has 17 columns, none named outcome*, and neither
outcome CheckConstraint exists there yet). All four columns and both
constraints are therefore inert against the live table until the migration
is explicitly applied. Python-level enforcement in the meantime is
backend/schemas.py TaskOutcomeUpdate (the only schema that accepts an
outcome/reason value) plus
backend/routers/member_schedules.py update_member_schedule_event_outcome
(the only endpoint that ever assigns any of these four columns).
"""

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
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
            "outcome IS NULL OR outcome IN ('Completed', 'Uncompleted')",
            name="member_schedule_events_outcome_check",
        ),
        # FINAL CONFIRMED REASON-TRANSITION RULE (2026-07-24). Pairs
        # outcome_reason to outcome — exactly one of the three branches must
        # hold for any row. Mirrors the existing
        # member_leave_records_half_day_period_pairing_check pattern below
        # (MemberLeaveRecord) — a multi-column CHECK is the established way
        # this codebase pairs an optional detail column to its parent enum
        # column. trim()/length() (standard SQL, not the Postgres-specific
        # btrim()/char_length() spellings) are a defense-in-depth backstop
        # (the API layer — backend/schemas.py TaskOutcomeUpdate — is what
        # actually trims/validates on every write path); this constraint
        # protects against any write that bypasses that layer. Using the
        # portable spellings (valid on both Postgres and SQLite) is what
        # lets backend/tests/test_task_outcome_endpoint.py exercise this
        # exact constraint against a real, ephemeral SQLite database.
        CheckConstraint(
            "(outcome = 'Uncompleted' AND outcome_reason IS NOT NULL "
            "AND trim(outcome_reason) <> '' "
            "AND length(trim(outcome_reason)) <= 250) "
            "OR (outcome = 'Completed' AND outcome_reason IS NULL) "
            "OR (outcome IS NULL AND outcome_reason IS NULL)",
            name="member_schedule_events_outcome_reason_pairing_check",
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
    title = Column(String(120), nullable=False)
    category = Column(String, nullable=False, server_default="Scheduled Task")
    priority = Column(String, nullable=False, server_default="Medium")
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    notes = Column(String(240), nullable=True)

    # CONFIRMED UNTOUCHED-TASK OUTCOME (2026-07-24). NULL until a user
    # explicitly marks a task Completed or Uncompleted via PUT
    # /{member_key}/{event_id}/outcome — the only write path for this
    # column. The 'Pending'/'No response' display states are never stored
    # here; they are derived at read time (see backend/time_utils.py
    # derive_task_outcome and backend/schemas.py MemberScheduleEventOut).
    outcome = Column(String, nullable=True)

    # FINAL CONFIRMED REASON-TRANSITION RULE (2026-07-24). outcome_reason is
    # required (trimmed, nonblank, <=250 chars) exactly when
    # outcome='Uncompleted', and NULL in every other case — enforced by
    # member_schedule_events_outcome_reason_pairing_check above and by
    # backend/schemas.py TaskOutcomeUpdate on every write. A transition to
    # Completed always clears this column to NULL in the same write —
    # nothing ever retains a stale reason as hidden text.
    outcome_reason = Column(String(250), nullable=True)

    # Dedicated outcome audit pair — deliberately separate from the general
    # updated_at/updated_by above, which remain reserved for actual
    # title/date/priority/time/notes content edits (see the general PUT
    # handler in backend/routers/member_schedules.py). outcome_updated_at is
    # the authoritative server-side UTC instant of the last outcome write;
    # outcome_updated_by is the canonical member_key (from the URL path,
    # never client-supplied) that made it. Both are set atomically, in the
    # same transaction as outcome/outcome_reason, only by
    # update_member_schedule_event_outcome.
    outcome_updated_at = Column(DateTime(timezone=True), nullable=True)
    outcome_updated_by = Column(String, nullable=True)

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

    Lifecycle (2026-07-16 simplification amendment): there is no approval/
    status workflow. A row is active the moment it is created and stays
    active until soft-deleted — deleted_at IS NULL is the row's only
    lifecycle signal, matching MemberScheduleEvent's own soft-delete
    convention. No status/active-inactive enum column exists.
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

    purpose = Column(String(240), nullable=True)
    external_reference = Column(String(120), nullable=True)

    coordination_copy_only = Column(Boolean, nullable=False, server_default=text("true"))
    policy_source_id = Column(String, nullable=False, server_default="SRC-POLICY-001")

    # Snapshotted once, at creation, and recalculated in the same
    # transaction whenever a date/time field is edited (see
    # backend/routers/member_leave.py). Never recomputed from live
    # configuration on GET/report read.
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


class StaffReviewSummary(Base):
    """SQLAlchemy ORM model for management_aios.staff_review_summaries
    (REQ-CAL-REV-001 — Reviewer-Owned Staff Review Meeting Summaries).
    Mirrors database/migrations/<date>-create-staff-review-summaries.sql
    and database/staff_review_summaries_schema.sql exactly, following the
    same "Python mapping only, SQL file is DDL truth" convention as
    MemberScheduleEvent/MemberLeaveRecord above.

    Ownership: reviewer_member_key is the sole owner of every row — always
    server-derived from the validated Calendar token
    (backend/routers/calendar_auth.py get_verified_member), never accepted
    from a request body. Only the owning reviewer may ever read, update, or
    soft-delete a given row (backend/routers/staff_review_summaries.py) —
    other reviewers and the reviewed staff member have no access in Phase 1.

    reviewed_staff_id is a UUID FK to staff_dashboard_records.id — the
    approved stable identifier (see StaffRecordOut docstring above);
    employee_number is prohibited as an identifier and is never used here.

    No reviewed_staff_name_snapshot column exists by design (approved
    technical design, docs/2026-08-03_calendar-review-summaries-technical-
    design.md §5) — display always live-joins to staff_dashboard_records,
    since staff rows are never hard-deleted and a snapshot would show a
    stale name after an HR correction.

    Soft delete only (deleted_at) — matching MemberLeaveRecord's identical
    convention; no hard DELETE statement is ever issued by this feature."""

    __tablename__ = "staff_review_summaries"
    __table_args__ = (
        CheckConstraint(
            "reviewer_member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')",
            name="staff_review_summaries_reviewer_member_key_check",
        ),
        CheckConstraint(
            "length(trim(summary_text)) > 0",
            name="staff_review_summaries_summary_text_nonblank_check",
        ),
        CheckConstraint(
            "length(summary_text) <= 10000",
            name="staff_review_summaries_summary_text_max_length_check",
        ),
        {"schema": "management_aios"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    reviewer_member_key = Column(String, nullable=False)
    reviewed_staff_id = Column(
        UUID(as_uuid=True),
        ForeignKey("management_aios.staff_dashboard_records.id"),
        nullable=False,
    )

    meeting_date = Column(Date, nullable=False)
    summary_text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class KnowledgeDocument(Base):
    """SQLAlchemy ORM model for management_aios.knowledge_documents
    (REQ-KM-CRUD-002/003). Mirrors
    database/migrations/2026-08-10-create-knowledge-documents.sql exactly —
    same "Python mapping only, SQL file is DDL truth" convention as every
    other model above. That migration has already been executed against
    the live database (validation/knowledge-management-migration-execution-
    check-2026-08-10.md) — this class does NOT create or alter that table;
    Base.metadata.create_all() is never called against production anywhere
    in this codebase, only against an isolated in-memory SQLite database in
    tests (backend/tests/calendar_auth_test_support.py).

    Permission model (locked, REQ-KM-CRUD-002 rule 1): unlike
    StaffReviewSummary's creator-only-update lock, ANY authenticated
    Management Team member may create/edit/version/archive/soft-delete/
    restore ANY document — there is no per-owner scoping column or check
    anywhere for this table. Actor identity (created_by/updated_by/
    deleted_by) is always server-derived from
    backend/routers/calendar_auth.py's get_verified_member, never accepted
    from a request body — see backend/routers/knowledge_documents.py.

    google_ownership_status intentionally permits 'Verified' at the CHECK-
    constraint level (extensible-but-validated design,
    docs/knowledge-management-crud-design-2026-08-10.md §6) even though no
    application code path ever writes it — enforcement of "no fake
    ownership verification" is an application-layer guarantee
    (KnowledgeDocumentMetadataUpdate never accepts 'Verified' as input),
    not a database-layer one.

    detail on KnowledgeDocumentAuditLog below is mapped as generic `JSON`
    (not `postgresql.JSONB`, which the live column's DDL actually is) —
    deliberate: JSON is understood by every dialect, including the SQLite
    engine backend/tests/calendar_auth_test_support.py creates for tests,
    while JSONB has no SQLite DDL-compilation fallback and would break
    Base.metadata.create_all() there. This is a Python-mapping-only
    choice — Postgres accepts and stores standard JSON text into a JSONB
    column identically either way; the live column's physical type is
    untouched."""

    __tablename__ = "knowledge_documents"
    __table_args__ = (
        CheckConstraint(
            "document_type IN ('Google Sheet', 'Google Doc', 'Google Drive File', "
            "'PDF', 'Word Document', 'Excel File', 'ZIP File', 'Skill File', "
            "'Image', 'Video', 'External URL', 'Internal Documentation Link')",
            name="knowledge_documents_document_type_check",
        ),
        CheckConstraint(
            "lifecycle_status IN ('Active', 'Archived')",
            name="knowledge_documents_lifecycle_status_check",
        ),
        CheckConstraint(
            "compliance_status IN ('Pending', 'Completed')",
            name="knowledge_documents_compliance_status_check",
        ),
        CheckConstraint(
            "google_ownership_status IN ('Not Applicable', 'Not Verified', 'Verified')",
            name="knowledge_documents_google_ownership_status_check",
        ),
        CheckConstraint(
            "compliance_status = 'Pending' "
            "OR document_type NOT IN ('Google Sheet', 'Google Doc', 'Google Drive File') "
            "OR google_ownership_status = 'Verified'",
            name="knowledge_documents_compliance_google_gate_check",
        ),
        CheckConstraint(
            "(deleted_at IS NULL AND deleted_by IS NULL AND delete_reason IS NULL) "
            "OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND delete_reason IS NOT NULL)",
            name="knowledge_documents_soft_delete_pairing_check",
        ),
        # Partial unique index — the primary duplicate-prevention control is
        # the application-layer pre-check in knowledge_document_logic.py
        # (returns a clean 409 before any write); this index is
        # defense-in-depth, matching the already-executed live migration
        # exactly. Declared for BOTH dialects (postgresql_where +
        # sqlite_where) so tests against the in-memory SQLite database
        # exercise genuinely partial-unique behavior too — without
        # sqlite_where, SQLite would enforce a table-wide unique
        # constraint instead, incorrectly blocking a soft-deleted
        # document's URL from ever being reused by a later registration.
        Index(
            "idx_knowledge_documents_active_source_url_normalized",
            "source_url_normalized",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
            sqlite_where=text("deleted_at IS NULL"),
        ),
        {"schema": "management_aios"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String(200), nullable=False)
    team = Column(String(120), nullable=False)
    document_type = Column(String(40), nullable=False)
    job_role = Column(String(120), nullable=True)
    document_category = Column(String(120), nullable=True)
    creator = Column(String(200), nullable=True)

    source_url = Column(String(2048), nullable=False)
    # Computed server-side by knowledge_document_logic.normalize_source_url
    # on every write — never client-supplied directly. See that module for
    # the normalization algorithm.
    source_url_normalized = Column(String(2048), nullable=False)
    current_version = Column(String(20), nullable=False, server_default="1.0")

    lifecycle_status = Column(String(20), nullable=False, server_default="Active")
    compliance_status = Column(String(20), nullable=False, server_default="Pending")
    google_ownership_status = Column(String(20), nullable=False, server_default="Not Applicable")

    created_by = Column(String(80), nullable=False)
    updated_by = Column(String(80), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # Soft-delete state — all three populated together or all three NULL
    # together (knowledge_documents_soft_delete_pairing_check above).
    # Cleared together on RESTORE; the historical fact of the deletion
    # survives only in KnowledgeDocumentAuditLog, never here.
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(String(80), nullable=True)
    delete_reason = Column(String(500), nullable=True)


class KnowledgeDocumentVersion(Base):
    """SQLAlchemy ORM model for management_aios.knowledge_document_versions.
    Append-only by construction (REQ-KM-CRUD-002 rule 16) — no route in
    backend/routers/knowledge_documents.py ever issues an UPDATE or DELETE
    against this table; the only write path is
    create_knowledge_document_version (POST .../versions), which inserts
    exactly one row per call, plus the initial v1.0 row inserted atomically
    by CREATE."""

    __tablename__ = "knowledge_document_versions"
    __table_args__ = ({"schema": "management_aios"},)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("management_aios.knowledge_documents.id"),
        nullable=False,
    )

    version_label = Column(String(20), nullable=False)
    source_url = Column(String(2048), nullable=False)
    change_note = Column(String(500), nullable=True)

    created_by = Column(String(80), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class KnowledgeDocumentAuditLog(Base):
    """SQLAlchemy ORM model for management_aios.knowledge_document_audit_log.
    Immutable by construction (REQ-KM-CRUD-002 rule 17) — no route ever
    issues an UPDATE or DELETE against this table; every mutating action on
    a KnowledgeDocument (create/update_metadata/create_version/archive/
    unarchive/soft_delete/restore) appends exactly one row here, in the
    same transaction as the primary mutation, and never edits an existing
    row afterward. `detail` is mapped as generic JSON — see the
    KnowledgeDocument class docstring above for why."""

    __tablename__ = "knowledge_document_audit_log"
    __table_args__ = (
        CheckConstraint(
            "action IN ('create', 'update_metadata', 'create_version', "
            "'archive', 'unarchive', 'soft_delete', 'restore')",
            name="knowledge_document_audit_log_action_check",
        ),
        {"schema": "management_aios"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("management_aios.knowledge_documents.id"),
        nullable=False,
    )

    action = Column(String(30), nullable=False)
    actor_member_key = Column(String(80), nullable=False)
    detail = Column(JSON, nullable=True)

    occurred_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

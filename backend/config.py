"""Configuration for the member schedule API.

DATABASE_URL, ALLOWED_ORIGINS, and ENVIRONMENT are read from the environment
only. No credentials are hardcoded here or anywhere else in this backend, and
none are logged or printed. See .env.example for the expected variable names
and formats (placeholder values only).
"""

import os
from datetime import time

from dotenv import load_dotenv

load_dotenv()


def _normalize_database_url(raw_url):
    """Neon (and most managed Postgres providers) issue plain
    postgresql:// connection strings. SQLAlchemy resolves that scheme to the
    psycopg2 driver by default, which this backend does not install (see
    requirements.txt, which installs psycopg v3 only). Rewriting the scheme
    to postgresql+psycopg:// selects the installed v3 driver explicitly, so a
    Neon-issued value can be used as-is without manual editing."""
    if raw_url is None:
        return None
    prefix = "postgresql://"
    if raw_url.startswith(prefix):
        return "postgresql+psycopg://" + raw_url[len(prefix):]
    return raw_url


DATABASE_URL = _normalize_database_url(os.environ.get("DATABASE_URL"))

# Comma-separated list of extra allowed CORS origins, e.g.
# "https://management-aios.vercel.app,https://staging.example.com".
# Whitespace around each entry is trimmed. Falls back to the known production
# frontend origin if unset, so a missing env var does not silently open CORS
# to everything (see main.py: this list is combined with, not a replacement
# for, allow_credentials=False and the localhost-only dev regex).
_allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [
    origin.strip() for origin in _allowed_origins_env.split(",") if origin.strip()
] or ["https://management-aios.vercel.app"]

# Localhost/127.0.0.1 development origins on any port. Kept as an explicit,
# documented regex (not a wildcard) so local static-server/file-based
# development keeps working without needing ALLOWED_ORIGINS set. Safe only
# because allow_credentials=False (see main.py).
ALLOWED_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"

ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")

SERVICE_NAME = "management-aios-member-schedules"

VALID_MEMBER_KEYS = ("mayurika", "suman", "arun", "rajiv", "paraparan")
VALID_PRIORITIES = ("High", "Medium", "Low")
VALID_SOURCE_SCOPES = ("dashboard_testing", "pilot", "approved_live")

DEFAULT_SOURCE_SCOPE = "dashboard_testing"

# ── Schedule task classification ─────────────────────────────────────────
# Two-category system (originally introduced 2026-07-14, replacing the four
# "Sample ..." placeholder categories via
# database/migrations/2026-07-14-schedule-task-category-classification.sql).
# The classification RULE that assigns these values was replaced 2026-07-22
# — see backend/routers/member_schedules.py:classify_new_task/
# classify_updated_task for the current weekly-cutoff, backend-only,
# never-user-selectable rule. This allowed-value list and default are
# unaffected by that rule change.
VALID_SCHEDULE_CATEGORIES = (
    "Scheduled Task",
    "Unscheduled Task",
)

DEFAULT_SCHEDULE_CATEGORY = "Scheduled Task"

# Same-day Bulk Tasks (2026-07-23) — the maximum number of NONBLANK rows
# accepted by POST /api/member-schedules/{member_key}/bulk in a single
# submission, counted after blank rows are discarded (see the blank-row
# rule in backend/routers/member_schedules.py). Confirmed business decision
# (business decision #4) — this is the only row-count limit that exists;
# there is no separate raw-payload-size cap.
MAX_BULK_TASK_ROWS = 30

# Named IANA zone (not a fixed +05:30 offset) so classification stays
# self-documenting even though Sri Lanka has used a fixed UTC+05:30 offset
# with no DST since 2006.
SCHEDULE_TIMEZONE = "Asia/Colombo"

MEMBER_LABELS = {
    "mayurika": "Mayurika — HR",
    "suman": "Suman — Recruiting Officer",
    "arun": "Arun — Implementation Officer",
    "rajiv": "Rajiv — Admin Manager",
    # Paraparan's designation is currently unresolved between sources
    # (External Auditor per SRC-ARUN-CONF-001 vs. Accountant in the
    # HR-provided PDF) — see
    # member-aios/staff-data/evidence/paraparan-designation-review-2026-07-13.md.
    # This label uses a neutral form pending that resolution; it is not a
    # decision about which designation is correct.
    "paraparan": "Paraparan",
}

# ── Staff Data dashboard constants (2026-07-13) ──────────────────────────
# Shared between backend/routers/staff.py and scripts/import_staff_dashboard_csv.py
# so the two never drift apart. See
# member-aios/staff-data/data-maps/staff-field-map-draft.md for the
# approved 16-column field list this mirrors.

VALID_STAFF_STATUSES = ("Active", "Inactive")

# 'training_7_day' and the literal '[VERIFY]' are real, expected stored
# values — no HR-approved rule exists to resolve '[VERIFY]' rows (see
# member-aios/staff-data/source-maps/hr-staff-source-map-draft.md §6). This
# AIOS must not invent that rule; '[VERIFY]' stays a valid, queryable value.
VALID_EMPLOYMENT_STAGES = ("Permanent", "Probation", "training_7_day", "[VERIFY]")

# Controlled vocabulary observed in the HR source (see
# member-aios/staff-data/data-maps/staff-field-map-draft.md §1). Used to
# validate the ?location= filter param; not used to reject/alter stored
# values that fall outside this set.
VALID_LOCATIONS = ("Jaffna", "Nelliyadi", "Chankanai", "WFH")

STAFF_APPROVED_COLUMNS = (
    "employee_number",
    "epf_number",
    "date_of_joining",
    "full_name",
    "calling_name",
    "location",
    "staff_status",
    "department_team",
    "designation",
    "cv_reference",
    "nic",
    "remarks",
    "employment_stage",
    "source_file",
    "source_page",
    "source_row_reference",
)

# Defense-in-depth only — these columns must never exist on
# StaffDashboardRecord or in the approved CSV. Used by the import script to
# reject a source file that somehow contains one of these headers.
STAFF_EXCLUDED_COLUMNS = (
    "salary",
    "home_address",
    "personal_email",
    "personal_phone",
    "contact_number",
    "guardian_phone",
    "guardian_number",
)

# ── Member Leave Coordination Copy (REQ-LEAVE-COPY-001, 2026-07-16) ──────
# Source contract: docs/2026-07-16_management-calendar-leave-copy-requirement.md
# and docs/management-calendar-leave-copy-design.md. This feature is a
# calendar coordination copy only — the separate official HR leave system
# remains the source of truth for leave balance, payroll, no-pay, and
# disciplinary determinations. Nothing below claims otherwise.

VALID_LEAVE_TYPES = (
    "Short Leave",
    "Half-Day First",
    "Half-Day Second",
    "Full-Day",
    "Multi-Day",
)

# Only populated (as "First"/"Second") for the two half-day leave types;
# NULL for every other leave type. Redundant with leave_type by design —
# kept as its own column so half-day rows can be filtered/reported on
# without string-matching leave_type (see the design document's table §4).
VALID_HALF_DAY_PERIODS = ("First", "Second")

LEAVE_POLICY_SOURCE_ID = "SRC-POLICY-001"

LEAVE_COORDINATION_COPY_NOTICE = (
    "Calendar coordination copy only. The separate HR leave system remains "
    "official."
)

SHORT_LEAVE_MAX_REQUEST_MINUTES = 120
SHORT_LEAVE_MONTHLY_CAP_MINUTES = 120

# Leave-system time periods (mirrored from the separate official leave
# system — NOT derived from ACTUAL_OFFICE_BREAK_START/END below). These are
# the confirmed values from the approved requirement document §6.1/§8.5.
# The three *_DEDUCTION_MINUTES constants are "leave deduction minutes" /
# "leave-system credited minutes" — the official leave system's own
# credited figures for a half-day or full-day absence. They must never be
# described or reasoned about as independently verified actual productive
# working time.
LEAVE_HALF_DAY_FIRST_START = time(8, 30)
LEAVE_HALF_DAY_FIRST_END = time(13, 0)
LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES = 270

LEAVE_HALF_DAY_SECOND_START = time(13, 30)
LEAVE_HALF_DAY_SECOND_END = time(18, 0)
LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES = 270

LEAVE_FULL_DAY_START = time(8, 30)
LEAVE_FULL_DAY_END = time(18, 0)
LEAVE_FULL_DAY_DEDUCTION_MINUTES = 540

# The actual company office break. A separate, physical-schedule fact —
# informational only. Never used to calculate, adjust, or validate any
# leave-deduction value above (requirement §6.2, design §7.1).
ACTUAL_OFFICE_BREAK_START = time(12, 45)
ACTUAL_OFFICE_BREAK_END = time(13, 30)

# Maximum leave-deduction minutes any single calendar date may accumulate,
# even if multiple overlapping Approved leave records cover it (design §9 —
# interval-based overlap deduplication; a Full-Day/Multi-Day weekday
# dominates any partial-day leave on the same date).
LEAVE_MAX_DAILY_DEDUCTION_MINUTES = LEAVE_FULL_DAY_DEDUCTION_MINUTES

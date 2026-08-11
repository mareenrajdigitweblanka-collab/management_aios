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

# Read-only connection to the Ledsone operational Postgres (the `ledsone`
# database on the VPS, `tech_user` role — SELECT-only across all schemas
# including employee_management, sslmode=require). Added 2026-08-11 for
# scripts/sync_staff_dashboard_from_ledsone.py, which is the only consumer
# of this variable. Distinct from DATABASE_URL (management_aios) — there is
# no cross-server SQL join between the two Postgres instances, so that
# script reads this connection and writes DATABASE_URL as two explicit
# steps. Unset by default; the sync script fails fast with a clear error
# rather than silently skipping the read if this is missing.
LEDSONE_DATABASE_URL = _normalize_database_url(os.environ.get("LEDSONE_DATABASE_URL"))

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

# ── Management Team member identity — structured registry (REQ-CAL-REV-
# PDF-003 Gate B correction, 2026-08-06) ─────────────────────────────────
# The single authoritative backend structure for {displayName, role} per
# member key. Replaces an isolated `if member_key == "paraparan": role =
# "Auditor"` special case that had been added directly inside
# backend/review_summary_pdf_export.py — any backend module that needs a
# member's display name and role as separate fields (not the combined
# string MEMBER_LABELS below provides) reads THIS registry, never
# re-derives or independently invents its own copy.
#
# Paraparan's role here ("Auditor") is a DISPLAY-terminology decision only
# — the same one already used by web-view/index.html's sidebar sub-label
# and Paraparan's own tab header, and already mirrored into
# web-view/js/member-registry.js. It is explicitly NOT a resolution of the
# still-open External Auditor vs. Accountant designation dispute (see the
# MEMBER_LABELS comment below and
# member-aios/staff-data/evidence/paraparan-designation-review-2026-07-13.md)
# — that HR/business-fact question remains open and is untouched by this
# registry.
MEMBER_DIRECTORY = {
    "mayurika": {"displayName": "Mayurika", "role": "HR"},
    "suman": {"displayName": "Suman", "role": "Recruiting Officer"},
    "arun": {"displayName": "Arun", "role": "Implementation Officer"},
    "rajiv": {"displayName": "Rajiv", "role": "Admin Manager"},
    "paraparan": {"displayName": "Paraparan", "role": "Auditor"},
}

# MEMBER_LABELS — preserved for full backward compatibility with every
# existing consumer (backend/routers/calendar_auth.py's /verify endpoint,
# member_schedules.py, member_leave.py, and their test suites). Derived
# from MEMBER_DIRECTORY above — not a second, independently-maintained
# role map — but every value is byte-for-byte identical to this constant's
# own pre-2026-08-06 literal values, INCLUDING Paraparan's: the combined
# label deliberately does NOT append "Auditor" here, because doing so
# would silently imply the still-open External Auditor vs. Accountant
# designation dispute (SRC-ARUN-CONF-001 vs. the HR-provided PDF) had been
# resolved, which it has not. Only MEMBER_DIRECTORY's per-field role
# carries the approved "Auditor" DISPLAY decision, for newer per-field
# consumers (e.g. the Review Summary PDF export) built after that
# distinction was made explicit.
MEMBER_LABELS = {
    key: (
        entry["displayName"] if key == "paraparan"
        else entry["displayName"] + " — " + entry["role"]
    )
    for key, entry in MEMBER_DIRECTORY.items()
}

# ── Staff Data dashboard constants (2026-07-13; re-sourced 2026-08-11) ───
# Shared between backend/routers/staff.py and
# scripts/sync_staff_dashboard_from_ledsone.py so the two never drift apart.
#
# 2026-08-11: staff_dashboard_records was re-sourced from the HR-provided
# CSV to employee_management.staff (Ledsone) — see backend/models.py
# StaffDashboardRecord docstring and member-aios/staff-data/README.md.
# epf_number/calling_name/location/staff_status/cv_reference/nic/remarks/
# employment_stage were dropped: Ledsone has no equivalent for any of them.
# VALID_STAFF_STATUSES/VALID_EMPLOYMENT_STAGES/VALID_LOCATIONS are removed
# along with the columns and filters they validated.
#
# scripts/import_staff_dashboard_csv.py and
# scripts/update_staff_locations_from_hr_sources.py are superseded (their
# module docstrings explain why) but kept for history — STAFF_EXCLUDED_COLUMNS
# below still backs their defense-in-depth header check, unchanged.

STAFF_APPROVED_COLUMNS = (
    "employee_number",
    "date_of_joining",
    "full_name",
    "department_team",
    "designation",
    "source_file",
    "source_page",
    "source_row_reference",
)

# Defense-in-depth only — these columns must never exist on
# StaffDashboardRecord or in any source feeding it. Referenced by the
# superseded scripts/import_staff_dashboard_csv.py to reject a source file
# that somehow contains one of these headers.
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

# ── Calendar member-token authorization (2026-07-29) ─────────────────────
# Approved requirement: a valid per-member token is required for every
# Task/Leave mutation (create/update/delete/outcome/clear-testing-data);
# viewing and reports stay unauthenticated. See
# backend/routers/calendar_auth.py for the token-validation logic that
# consumes this configuration, and docs/2026-07-29_calendar-member-token-
# authorization-requirement.md for the full approved requirement.
#
# Each member's token hash lives in its own backend-only environment
# variable (never a database row, never a frontend-visible value, never
# committed to this or any tracked file) — see .env.example for the
# placeholder-only documentation of these names.
CALENDAR_AUTH_TOKEN_ENV_VARS = {
    "mayurika": "CALENDAR_AUTH_TOKEN_HASH_MAYURIKA",
    "suman": "CALENDAR_AUTH_TOKEN_HASH_SUMAN",
    "arun": "CALENDAR_AUTH_TOKEN_HASH_ARUN",
    "rajiv": "CALENDAR_AUTH_TOKEN_HASH_RAJIV",
    "paraparan": "CALENDAR_AUTH_TOKEN_HASH_PARAPARAN",
}

_SHA256_HEX_DIGEST_LENGTH = 64


def _looks_like_sha256_hex_digest(value: str) -> bool:
    """True only for a 64-character hexadecimal string — the exact shape
    of hashlib.sha256(...).hexdigest(). Does not (and cannot) confirm the
    value is actually a SHA-256 digest of anything in particular; it only
    rejects blank, truncated, or non-hex configuration values before they
    are ever compared against a submitted token."""
    if len(value) != _SHA256_HEX_DIGEST_LENGTH:
        return False
    try:
        int(value, 16)
    except ValueError:
        return False
    return True


def load_calendar_auth_token_hashes(environ=None):
    """Fail-closed loader for the five per-member Calendar auth token
    hashes. Raises RuntimeError — NEVER silently disables authorization —
    when any of the five CALENDAR_AUTH_TOKEN_ENV_VARS is missing, blank,
    not a 64-character SHA-256 hexadecimal digest, or duplicated across
    members.

    Called once at application startup (backend/main.py's lifespan
    handler) so a misconfigured deployment fails to start rather than
    silently serving traffic with authorization disabled or broken, and
    again on every request by backend/routers/calendar_auth.py — this
    function deliberately does no caching, so a token hash rotated after
    startup (a fresh deployment picks up new env vars) is honored
    immediately by both paths without a stale in-memory copy; the
    per-call cost is five environment-variable reads plus a hex-shape
    check, not a database or network call.

    `environ` defaults to os.environ. Tests pass an isolated mapping of
    their own test-only hashes here (see backend/tests/test_calendar_auth.py)
    — production secrets are never read by, or needed for, any test."""
    source = os.environ if environ is None else environ
    hashes = {}
    for member_key, env_var in CALENDAR_AUTH_TOKEN_ENV_VARS.items():
        raw = (source.get(env_var) or "").strip()
        if not raw:
            raise RuntimeError(
                f"{env_var} is not configured. All five "
                "CALENDAR_AUTH_TOKEN_HASH_* variables must be set for "
                "Calendar member-token authorization to start."
            )
        normalized = raw.lower()
        if not _looks_like_sha256_hex_digest(normalized):
            raise RuntimeError(
                f"{env_var} must be a 64-character SHA-256 hexadecimal digest."
            )
        hashes[member_key] = normalized

    if len(set(hashes.values())) != len(hashes):
        raise RuntimeError(
            "CALENDAR_AUTH_TOKEN_HASH_* values must be unique per member — "
            "a duplicate hash was found across two or more members."
        )

    return hashes


# ── MD read-only Review Summary authorization (REQ-CAL-REV-MD-READ-006,
# 2026-08-06) ─────────────────────────────────────────────────────────────
# MD is a separate, additive, READ-ONLY Review Summary viewer identity — NOT
# a Management Team member. Deliberately kept OUT of VALID_MEMBER_KEYS,
# CALENDAR_AUTH_TOKEN_ENV_VARS, and MEMBER_DIRECTORY/MEMBER_LABELS above:
# those three structures are what member_schedules.py/member_leave.py's
# _validate_member_key and require_matching_member(...) use to decide
# whether a token may own/mutate a Task, Leave record, or become a
# reviewer_member_key on a Review Summary (including the DB CHECK
# constraint on that column — backend/models.py). Keeping "md" out of all
# three means MD can never pass any of those checks — there is no per-route
# bypass to maintain and no risk of MD acquiring an owned Task/Leave slot
# via require_matching_member's own-key match.
#
# MD's token is verified through the exact same single comparison loop the
# five Management Team tokens already use (see
# backend/routers/calendar_auth.py validate_calendar_auth_token) — never a
# second, parallel token resolver. The only difference is that MD's env var
# is OPTIONAL: load_md_review_summary_token_hash below never raises, unlike
# load_calendar_auth_token_hashes above, so an unset/placeholder MD token
# never crashes startup and never affects the five existing members.
MD_MEMBER_KEY = "md"
MD_DISPLAY_LABEL = "MD — Read-only"

MD_CALENDAR_AUTH_TOKEN_ENV_VAR = "CALENDAR_AUTH_TOKEN_HASH_MD"

# Recognized placeholder values that must never be accepted as a real
# configured hash, even if a deployment forgets to replace them. Both forms
# this project has used for placeholder documentation are covered.
_MD_TOKEN_PLACEHOLDER_VALUES = frozenset(
    {"set_a_real_token_hash_here", "<set-in-deployment-environment>", "set-in-deployment-environment"}
)


def load_md_review_summary_token_hash(environ=None):
    """Optional-config loader for MD's single read-only Review Summary
    token hash. Unlike load_calendar_auth_token_hashes (which raises
    RuntimeError — fails closed at STARTUP — when any of the five required
    hashes is missing/invalid), this function never raises: it returns None
    whenever CALENDAR_AUTH_TOKEN_HASH_MD is absent, blank, a known
    placeholder value, or not a 64-character SHA-256 hex digest. None means
    "MD authorization is unavailable" — every MD-token request then fails
    closed with 401 (validate_calendar_auth_token never treats "MD not
    configured" as "no auth required"); the backend never crashes at
    startup over this, and the five existing member tokens — validated
    exclusively by load_calendar_auth_token_hashes above — are completely
    unaffected either way.

    `environ` defaults to os.environ; tests pass an isolated mapping (see
    backend/tests/calendar_auth_test_support.py) — production secrets are
    never read by, or needed for, any test."""
    source = os.environ if environ is None else environ
    raw = (source.get(MD_CALENDAR_AUTH_TOKEN_ENV_VAR) or "").strip()
    if not raw:
        return None
    normalized = raw.lower()
    if normalized in _MD_TOKEN_PLACEHOLDER_VALUES:
        return None
    if not _looks_like_sha256_hex_digest(normalized):
        return None
    return normalized


def member_display_label(member_key: str) -> str:
    """The one place that resolves a verified member_key to a safe display
    label, for both the five Management Team members (MEMBER_LABELS) and
    MD (MD_DISPLAY_LABEL) — used by
    backend/routers/calendar_auth.py's /verify endpoint and
    require_matching_member so neither ever does a raw MEMBER_LABELS[...]
    lookup that would KeyError for "md". Never raises for any member_key
    that validate_calendar_auth_token could actually return."""
    if member_key == MD_MEMBER_KEY:
        return MD_DISPLAY_LABEL
    return MEMBER_LABELS[member_key]


# ── Knowledge Management (REQ-KM-CRUD-002/003) ───────────────────────────
# Mirrors the CHECK constraints already applied by
# database/migrations/2026-08-10-create-knowledge-documents.sql — kept as
# an independently-maintained Python-side list, same accepted convention
# as VALID_SCHEDULE_CATEGORIES/VALID_LEAVE_TYPES above vs. their own DB
# CHECK constraint text in backend/models.py.

VALID_KNOWLEDGE_DOCUMENT_TYPES = (
    "Google Sheet", "Google Doc", "Google Drive File", "PDF",
    "Word Document", "Excel File", "ZIP File", "Skill File",
    "Image", "Video", "External URL", "Internal Documentation Link",
)

VALID_KNOWLEDGE_LIFECYCLE_STATUSES = ("Active", "Archived")

VALID_KNOWLEDGE_COMPLIANCE_STATUSES = ("Pending", "Completed")

# The three Google document types the compliance/ownership gate (design
# doc §3.1's knowledge_documents_compliance_google_gate_check) applies to.
KNOWLEDGE_GOOGLE_DOCUMENT_TYPES = ("Google Sheet", "Google Doc", "Google Drive File")

# Client-settable subset only — 'Verified' is a legal DB value (extensible-
# but-validated design, docs/knowledge-management-crud-design-2026-08-10.md
# §6) but is deliberately EXCLUDED here: no request schema in
# backend/schemas.py ever accepts it as input, so no route can ever write
# it until a dedicated, future, real Google-verification feature exists.
VALID_KNOWLEDGE_GOOGLE_OWNERSHIP_STATUSES_CLIENT_SETTABLE = ("Not Applicable", "Not Verified")

KNOWLEDGE_DOCUMENT_AUDIT_ACTIONS = (
    "create", "update_metadata", "create_version",
    "archive", "unarchive", "soft_delete", "restore",
)

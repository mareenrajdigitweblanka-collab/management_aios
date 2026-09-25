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


# ── Local-development-only Calendar auth bypass (2026-09-23) ─────────────
# A single, optional, fail-closed shortcut so a developer running the API
# locally (python -m uvicorn backend.main:app --reload) can authorize as one
# real Management Team member without needing that member's actual token
# hash. Folded into the EXACT SAME comparison mechanism
# validate_calendar_auth_token already uses for the five mandatory member
# tokens and the optional MD token (backend/routers/calendar_auth.py) —
# never a second endpoint, never a query-string/header shortcut. All four
# of the following must hold simultaneously or the bypass is entirely
# unavailable — a missing/blank/malformed value never weakens normal
# authentication and never crashes startup (same optional-config shape as
# load_md_review_summary_token_hash above, not the fail-closed-at-STARTUP
# shape load_calendar_auth_token_hashes uses for the five mandatory
# tokens):
#
#   1. ENVIRONMENT (normalized strip().lower()) is not "production" — a
#      production deployment ignores every bypass variable completely,
#      even if all three below happen to be present and well-formed.
#   2. DEV_AUTH_BYPASS is the exact literal "true" (see _strict_true) —
#      no existing boolean-env-var convention exists elsewhere in this
#      backend, so this parser is deliberately narrow rather than
#      guessing at "1"/"yes"/etc.
#   3. DEV_AUTH_BYPASS_MEMBER_KEY names one of VALID_MEMBER_KEYS — the
#      bypass always resolves to a REAL Management Team member's identity
#      (never a synthetic one), so every existing per-member authorization
#      rule (require_matching_member, reviewer ownership, the
#      reviewer_member_key DB CHECK constraint, etc.) applies to a
#      bypass-authorized request exactly as it would to that member's own
#      real token — there is nothing downstream to special-case.
#   4. CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH is a 64-character SHA-256 hex
#      digest (same shape check as _looks_like_sha256_hex_digest above).
#
# Called on every request, never cached — identical reasoning to
# load_calendar_auth_token_hashes' own no-caching design, so disabling any
# one of the four conditions after startup (e.g. flipping DEV_AUTH_BYPASS
# to false, or deploying with ENVIRONMENT=production) takes effect
# immediately with no stale in-memory copy.
DEV_AUTH_BYPASS_ENV_VAR = "DEV_AUTH_BYPASS"
DEV_AUTH_BYPASS_MEMBER_KEY_ENV_VAR = "DEV_AUTH_BYPASS_MEMBER_KEY"
CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH_ENV_VAR = "CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH"


def _strict_true(value: str) -> bool:
    """Strict boolean parser for DEV_AUTH_BYPASS. Only the exact literal
    "true" (after strip().lower()) is True — "1", "yes", "TRUE " with
    trailing content, blank, and "false" are all False. Deliberately
    narrow for a security-sensitive flag rather than guessing at a looser
    convention that does not exist anywhere else in this backend."""
    return value.strip().lower() == "true"


def load_dev_auth_bypass(environ=None):
    """Fail-closed, optional loader for the local-development Calendar
    auth bypass described above. Returns (member_key, hash) only when all
    four gating conditions hold; returns None (bypass unavailable) in
    every other case, including a misconfigured or absent value — never
    raises. `environ` defaults to os.environ; tests pass an isolated
    mapping of their own test-only values (see
    backend/tests/calendar_auth_test_support.py) — this repo's real
    CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH value is never read by, or needed
    for, any test using this."""
    source = os.environ if environ is None else environ

    environment = (source.get("ENVIRONMENT") or "").strip().lower()
    if not environment:
        environment = "development"  # mirrors ENVIRONMENT's own default above
    if environment == "production":
        return None

    if not _strict_true(source.get(DEV_AUTH_BYPASS_ENV_VAR) or ""):
        return None

    member_key = (source.get(DEV_AUTH_BYPASS_MEMBER_KEY_ENV_VAR) or "").strip().lower()
    if member_key not in VALID_MEMBER_KEYS:
        return None

    raw_hash = (source.get(CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH_ENV_VAR) or "").strip().lower()
    if not _looks_like_sha256_hex_digest(raw_hash):
        return None

    return member_key, raw_hash


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


# ── Review Summary Attachments (REQ-CAL-REV-ATTACH-001, 2026-09-23) ──────
# Attachments were explicitly out of scope for Phase 1 (docs/2026-08-03_
# calendar-review-summaries-requirement.md), so no prior source/documented
# size or type limit exists anywhere in this repo. The limits below are an
# assumed, clearly-flagged business decision (not confirmed by a
# Management Team/domain owner) — this is the single place they are
# defined; both backend/routers/staff_review_summaries.py and the frontend
# (web-view/js/review-summaries.js, which mirrors these same numbers for
# client-side UX only — the server-side check here is the one that is
# actually enforced) read from here. Adjust in one place if a different
# limit is ever approved.
MAX_ATTACHMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB per file
MAX_ATTACHMENTS_PER_SUMMARY = 10
# How long a "pending" attachment (uploaded, never attached to a summary —
# browser closed, network drop, etc.) is kept before
# scripts/cleanup_pending_review_summary_attachments.py treats it as an
# abandoned partial upload and deletes both the storage-provider asset and
# this row.
PENDING_ATTACHMENT_CLEANUP_AGE_HOURS = 24

# Image/PDF attachments larger than this are never embedded/merged into the
# PDF export (backend/review_summary_pdf_export.py) — listed by filename
# only instead, with a note that the original file is in the ZIP download.
# Keeps a single export's memory/PDF size bounded regardless of how many or
# how large the underlying attachments are. Word/Excel/audio attachments
# are never embedded regardless of size (see ATTACHMENT_EXTENSION_TYPES
# comment above) so this cap does not apply to them.
MAX_EMBEDDABLE_ATTACHMENT_BYTES_FOR_PDF = 15 * 1024 * 1024  # 15 MB

# ── "Download all reviews as one PDF" limits (REQ-CAL-REV-HISTORY-PDF-001,
# 2026-09-23) ──────────────────────────────────────────────────────────
# Combining EVERY matching review (across all result pages, never just the
# first 50 — see backend/routers/staff_review_summaries.py
# export_all_reviews_pdf) plus every one of their attachments converted to
# PDF pages has no natural upper bound the way a single review's own
# /export/pdf does. These are assumed, clearly-flagged business decisions
# (not confirmed by a Management Team/domain owner) — this is the single
# place they are defined; adjust here if a different limit is ever
# approved. Each is enforced with a clear, specific error message (never a
# silent truncation) — see that route for where each is checked.
MAX_HISTORY_PDF_EXPORT_RECORDS = 300
MAX_HISTORY_PDF_EXPORT_ATTACHMENT_BYTES = 300 * 1024 * 1024  # 300 MB combined
MAX_HISTORY_PDF_EXPORT_TOTAL_PAGES = 1000
# Wall-clock budget for the whole request handler (attachment fetch +
# Word/Excel conversion + PDF assembly) — well under common reverse-proxy/
# serverless gateway timeouts, so a runaway export fails with this route's
# own clear message instead of an opaque gateway timeout the frontend can't
# distinguish from a dropped connection.
HISTORY_PDF_EXPORT_TIME_BUDGET_SECONDS = 45

# ── Local Prototype Attachment mode (REQ-CAL-REV-ATTACH-001-LOCAL-PROTO,
# 2026-09-23) ──────────────────────────────────────────────────────────
# The real PostgreSQL attachment migration (database/migrations/2026-09-23-
# create-staff-review-summary-attachments.sql) is blocked in this local
# environment by a privilege gap (the configured role lacks REFERENCES on
# staff_review_summaries — see the conversation record for the dry-run that
# discovered this; nothing here works around that or touches PostgreSQL at
# all). This mode lets Cloudinary attachment upload/download/PDF/ZIP be
# exercised locally anyway by keeping attachment METADATA (never file
# bytes, never staff review text/summary content — that stays exactly
# where it already is, in PostgreSQL) in a separate, local-only SQLite
# file instead. Explicitly opt-in and OFF by default — the existing
# PostgreSQL-backed implementation (backend/routers/
# staff_review_summaries.py's original attachment code, unchanged and
# fully intact) remains the only path when this is unset, so a future
# real migration+privilege-grant needs zero code changes to switch back.
#
# NEVER used as a silent substitute for the database, and NEVER a browser-
# side cache — see backend/local_attachment_metadata.py's own module
# docstring for the full local-only-persistence caveat and the
# export/transition plan to PostgreSQL once the real migration lands.
LOCAL_PROTOTYPE_ATTACHMENTS_ENV_VAR = "LOCAL_PROTOTYPE_ATTACHMENTS"

# Where the local-only SQLite file lives — inside .gitignore'd local_data/,
# never committed, never transfers with the repo to another machine or
# deployment (see docs/2026-09-23_local-prototype-attachment-metadata.md).
LOCAL_ATTACHMENT_METADATA_DB_PATH = "local_data/local_prototype_attachments.db"


def is_local_prototype_attachments_enabled(environ=None) -> bool:
    """Fail-closed (defaults to False/off) — same _strict_true parser as
    DEV_AUTH_BYPASS above: only the exact literal "true" turns this on,
    never a guessed-at "1"/"yes". `environ` defaults to os.environ; tests
    pass an isolated mapping of their own (see
    backend/tests/test_local_attachment_metadata.py) — this never reads or
    needs any real credential."""
    source = os.environ if environ is None else environ
    # 2026-09-25: the shared PostgreSQL table now exists and is the only
    # attachment mapping a deployment may use. A production deployment
    # ignores this flag completely (same rule as DEV_AUTH_BYPASS above), so
    # a stray LOCAL_PROTOTYPE_ATTACHMENTS=true can never route deployed
    # traffic to a machine-local SQLite file. Non-production use stays
    # available as the documented rollback (docs/2026-09-24_review-summary-
    # attachments-postgres-cutover.md).
    environment = (source.get("ENVIRONMENT") or "development").strip().lower()
    if environment == "production":
        return False
    return _strict_true(source.get(LOCAL_PROTOTYPE_ATTACHMENTS_ENV_VAR) or "")


# File extension (lowercase, with leading dot) -> coarse attachment_type
# category (backend/models.py StaffReviewSummaryAttachment CHECK
# constraint; also drives export rendering rules in
# backend/review_summary_pdf_export.py — image/pdf embedded, word/excel/
# audio listed by filename only, audio never embedded or transcribed).
# This — never the client-declared Content-Type header, which is never
# trusted for this decision — is the sole source of truth for what kind of
# file was uploaded; content_type actually stored is server-derived via
# Python's own mimetypes module (backend/routers/staff_review_summaries.py),
# not accepted from the request.
ATTACHMENT_EXTENSION_TYPES = {
    ".mp3": "audio",
    ".wav": "audio",
    ".m4a": "audio",
    ".ogg": "audio",
    ".doc": "word",
    ".docx": "word",
    ".xls": "excel",
    ".xlsx": "excel",
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".gif": "image",
    ".webp": "image",
    ".pdf": "pdf",
}

VALID_ATTACHMENT_TYPES = ("audio", "word", "excel", "image", "pdf")

# Cloudinary resource_type each attachment_type must be uploaded/addressed
# under — Cloudinary's own taxonomy, not this app's attachment_type. Word/
# Excel files are uploaded as 'raw' (Cloudinary applies no
# image/video-specific processing to them); PDFs as 'image' (Cloudinary can
# rasterize PDF pages, which backend/attachment_storage.py never relies on,
# but 'image' is still the correct resource_type for PDF bytes on
# Cloudinary); audio as 'video' (Cloudinary's own audio/video resource
# type — there is no separate 'audio' resource_type in Cloudinary's API).
ATTACHMENT_TYPE_STORAGE_RESOURCE_TYPE = {
    "audio": "video",
    "word": "raw",
    "excel": "raw",
    "image": "image",
    "pdf": "image",
}


def load_cloudinary_config(environ=None):
    """Fail-closed, optional loader for the three Cloudinary credentials
    (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET). Returns None — "attachment
    storage is unavailable" — unless all three are present and non-blank;
    never raises, mirroring load_md_review_summary_token_hash's shape.
    Attachment upload/download routes must treat None as a clean 503, never
    a crash and never a silent no-op that pretends to succeed. `environ`
    defaults to os.environ; tests pass an isolated mapping of their own
    test-only (never real) values — see backend/attachment_storage.py's
    FakeAttachmentStorage, which is used by every automated test instead of
    ever calling the real Cloudinary API."""
    source = os.environ if environ is None else environ
    cloud_name = (source.get("CLOUDINARY_CLOUD_NAME") or "").strip()
    api_key = (source.get("CLOUDINARY_API_KEY") or "").strip()
    api_secret = (source.get("CLOUDINARY_API_SECRET") or "").strip()
    if not cloud_name or not api_key or not api_secret:
        return None
    return {"cloud_name": cloud_name, "api_key": api_key, "api_secret": api_secret}


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

# ── Announcements realtime WebSocket ticket (Stage B, 2026-08-12) ────────
# Short-lived signed ticket, NOT a session token: a browser cannot attach
# the existing Authorization header to a WebSocket handshake the way it
# can to a normal fetch() request, so an already-authenticated HTTP call
# (POST /api/announcements/ws-ticket, guarded by the existing
# get_verified_member dependency — same auth as every other Announcement
# route) issues a ticket scoped to that one verified member, which is then
# passed in the WebSocket URL's query string INSTEAD OF the raw long-lived
# member bearer token. See backend/routers/announcements.py
# _issue_ws_ticket/_validate_ws_ticket for the HMAC-SHA256 signing/
# verification (same hashlib/hmac primitives calendar_auth.py already uses
# for its own token comparisons — no new cryptographic dependency).
#
# Optional-but-fail-closed, same shape as MD_CALENDAR_AUTH_TOKEN_ENV_VAR
# (load_md_review_summary_token_hash above) rather than the five mandatory
# CALENDAR_AUTH_TOKEN_HASH_* (which crash the whole app at startup if
# missing): the WebSocket fast path is additive, delivery-only
# infrastructure with an HTTP-polling fallback already in place
# (REQ-ANN-001 Stage A) — an unconfigured secret must never crash the rest
# of the application (every other Task/Leave/Announcements HTTP route is
# unrelated to this), but it must also never fall back to a default or
# guessable secret. Missing/blank means "the realtime fast path is
# unavailable": ticket issuance returns 503 and no ticket can ever be
# produced or validated, so the feature fails closed by simply never
# working, not by ever accepting an unsigned/weakly-signed ticket.
ANNOUNCEMENT_WS_TICKET_ENV_VAR = "ANNOUNCEMENT_WS_TICKET_SECRET"
ANNOUNCEMENT_WS_TICKET_TTL_SECONDS = 60


def load_announcement_ws_ticket_secret(environ=None):
    """Returns the raw signing secret string, or None if unset/blank —
    never a placeholder/default value. `environ` defaults to os.environ;
    tests pass an isolated mapping of their own test-only secret (see
    backend/tests/test_announcements.py) — production secrets are never
    read by, or needed for, any test using this."""
    source = os.environ if environ is None else environ
    raw = (source.get(ANNOUNCEMENT_WS_TICKET_ENV_VAR) or "").strip()
    return raw or None

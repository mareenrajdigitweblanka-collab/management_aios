"""Configuration for the member schedule API.

DATABASE_URL, ALLOWED_ORIGINS, and ENVIRONMENT are read from the environment
only. No credentials are hardcoded here or anywhere else in this backend, and
none are logged or printed. See .env.example for the expected variable names
and formats (placeholder values only).
"""

import os

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

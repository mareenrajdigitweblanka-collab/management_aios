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

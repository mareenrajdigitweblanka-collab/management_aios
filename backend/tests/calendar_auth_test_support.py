"""Shared test support for Calendar member-token authorization TestClient
tests (test_calendar_auth.py and test_calendar_mutation_authorization.py in
this directory). NOT itself a test file — contains no TestCase classes, so
`python -m unittest discover` finds nothing to run here.

These tests exercise the REAL FastAPI app (backend.main.app) through
fastapi.testclient.TestClient (httpx-backed — see backend/requirements.txt),
with get_db overridden to an isolated, in-memory SQLite database per test —
the same StaticPool + `ATTACH DATABASE ':memory:' AS management_aios`
pattern backend/tests/test_task_outcome_endpoint.py already uses for its
direct-call tests — so these are genuine HTTP-level requests through
FastAPI's own routing, dependency injection, and CORS middleware, never
direct Python function calls.

Five fixed plaintext test tokens (used nowhere else, never production
secrets) are hashed with the exact same hashlib.sha256(...).hexdigest()
backend/config.py's loader expects, then injected via
unittest.mock.patch.dict(os.environ, ...) for the lifetime of each test.
"""

import hashlib
from contextlib import contextmanager
from unittest import mock

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.config import (
    CALENDAR_AUTH_TOKEN_ENV_VARS,
    MD_CALENDAR_AUTH_TOKEN_ENV_VAR,
    MD_MEMBER_KEY,
)
from backend.database import Base

TEST_TOKENS = {
    "mayurika": "test-only-token-mayurika-never-a-real-secret",
    "suman": "test-only-token-suman-never-a-real-secret",
    "arun": "test-only-token-arun-never-a-real-secret",
    "rajiv": "test-only-token-rajiv-never-a-real-secret",
    "paraparan": "test-only-token-paraparan-never-a-real-secret",
}

# MD (REQ-CAL-REV-MD-READ-006, 2026-08-06) — kept as a separate constant,
# not merged into TEST_TOKENS above: MD is not a Management Team member and
# its env var is OPTIONAL (see backend/config.py
# load_md_review_summary_token_hash), unlike the five mandatory
# CALENDAR_AUTH_TOKEN_ENV_VARS entries TEST_TOKENS mirrors. test_token_env
# only includes it when a test explicitly opts in via include_md=True, so
# every pre-existing call site (patched_calendar_auth_env(),
# test_token_env()) is byte-for-byte unaffected by MD's addition.
MD_TEST_TOKEN = "test-only-token-md-never-a-real-secret"


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def test_token_env(extra_overrides=None, include_md=False) -> dict:
    """The full CALENDAR_AUTH_TOKEN_HASH_* -> hash mapping for TEST_TOKENS,
    optionally overridden per-variable (e.g. to inject a malformed or
    duplicate value for a single member in a specific test) — production
    secrets are never read by, or needed for, any test using this.

    include_md=True additionally sets CALENDAR_AUTH_TOKEN_HASH_MD to
    MD_TEST_TOKEN's hash — omitted by default so every existing five-member
    test is unaffected by MD's optional env var existing at all."""
    env = {
        env_var: sha256_hex(TEST_TOKENS[member_key])
        for member_key, env_var in CALENDAR_AUTH_TOKEN_ENV_VARS.items()
    }
    if include_md:
        env[MD_CALENDAR_AUTH_TOKEN_ENV_VAR] = sha256_hex(MD_TEST_TOKEN)
    if extra_overrides:
        env.update(extra_overrides)
    return env


@contextmanager
def patched_calendar_auth_env(extra_overrides=None, include_md=False):
    with mock.patch.dict("os.environ", test_token_env(extra_overrides, include_md), clear=False):
        yield


def bearer_header(member_key: str) -> dict:
    if member_key == MD_MEMBER_KEY:
        return {"Authorization": "Bearer " + MD_TEST_TOKEN}
    return {"Authorization": "Bearer " + TEST_TOKENS[member_key]}


def _attach_schema(dbapi_conn, connection_record):
    dbapi_conn.execute("ATTACH DATABASE ':memory:' AS management_aios")

    # Leave create/update (backend/routers/leave_logic.py
    # acquire_member_leave_lock) issues the Postgres-only
    # `SELECT pg_advisory_xact_lock(hashtext(:member_key))` to serialize
    # concurrent writes for one member. SQLite has neither function; these
    # two stand-ins are registered ONLY so that real SQL statement can run
    # unmodified against SQLite in tests (matching this repo's existing
    # "same SQL text on both dialects" convention — see backend/models.py's
    # portable trim()/length() CHECK constraints). Locking semantics are
    # NOT being tested here — hashtext only needs to be a deterministic
    # int for a given string, and the lock stand-in is a no-op (a single
    # in-memory SQLite connection under StaticPool has no real concurrent-
    # connection model to lock against anyway).
    dbapi_conn.create_function("hashtext", 1, lambda value: hash(value) % (2**31))
    dbapi_conn.create_function("pg_advisory_xact_lock", 1, lambda _key: None)


def make_sqlite_engine_and_session_factory():
    """Fresh, isolated in-memory SQLite database — same pattern
    test_task_outcome_endpoint.py uses for its direct-call tests, reused
    here so the real app's get_db dependency can be overridden to point
    at it for one test at a time."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    event.listen(engine, "connect", _attach_schema)
    Base.metadata.create_all(engine)
    return engine, sessionmaker(bind=engine, autocommit=False, autoflush=False)

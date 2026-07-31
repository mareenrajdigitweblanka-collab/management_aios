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

from backend.config import CALENDAR_AUTH_TOKEN_ENV_VARS
from backend.database import Base

TEST_TOKENS = {
    "mayurika": "test-only-token-mayurika-never-a-real-secret",
    "suman": "test-only-token-suman-never-a-real-secret",
    "arun": "test-only-token-arun-never-a-real-secret",
    "rajiv": "test-only-token-rajiv-never-a-real-secret",
    "paraparan": "test-only-token-paraparan-never-a-real-secret",
}


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def test_token_env(extra_overrides=None) -> dict:
    """The full CALENDAR_AUTH_TOKEN_HASH_* -> hash mapping for TEST_TOKENS,
    optionally overridden per-variable (e.g. to inject a malformed or
    duplicate value for a single member in a specific test) — production
    secrets are never read by, or needed for, any test using this."""
    env = {
        env_var: sha256_hex(TEST_TOKENS[member_key])
        for member_key, env_var in CALENDAR_AUTH_TOKEN_ENV_VARS.items()
    }
    if extra_overrides:
        env.update(extra_overrides)
    return env


@contextmanager
def patched_calendar_auth_env(extra_overrides=None):
    with mock.patch.dict("os.environ", test_token_env(extra_overrides), clear=False):
        yield


def bearer_header(member_key: str) -> dict:
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

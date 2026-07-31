"""HTTP-level tests for Calendar member-token authorization's shared
verification surface: POST /api/calendar-auth/verify, the fail-closed
startup configuration validator (backend/config.py
load_calendar_auth_token_hashes, wired into backend/main.py's lifespan),
and the CORS preflight for the Authorization header.

Uses fastapi.testclient.TestClient against the real app (backend.main.app)
— see backend/tests/calendar_auth_test_support.py for why, and for the
shared fixed test-only tokens/hashes used throughout (never production
secrets).

Run with: python -m unittest backend.tests.test_calendar_auth
"""

import unittest
from unittest import mock

from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.tests.calendar_auth_test_support import (
    TEST_TOKENS,
    bearer_header,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
    sha256_hex,
    test_token_env,
)


class VerifyEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def test_valid_token_returns_member_key_and_display_label(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post(
                    "/api/calendar-auth/verify", headers=bearer_header("mayurika")
                )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["memberKey"], "mayurika")
        self.assertEqual(body["displayLabel"], "Mayurika — HR")
        self.assertEqual(set(body.keys()), {"memberKey", "displayLabel"})

    def test_each_configured_member_verifies_to_itself(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                for member_key in TEST_TOKENS:
                    response = client.post(
                        "/api/calendar-auth/verify", headers=bearer_header(member_key)
                    )
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json()["memberKey"], member_key)

    def test_missing_authorization_header_rejected(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post("/api/calendar-auth/verify")
        self.assertEqual(response.status_code, 401)

    def test_non_bearer_scheme_rejected(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post(
                    "/api/calendar-auth/verify",
                    headers={"Authorization": "Basic " + TEST_TOKENS["mayurika"]},
                )
        self.assertEqual(response.status_code, 401)

    def test_prefix_only_bearer_with_no_token_rejected(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post(
                    "/api/calendar-auth/verify", headers={"Authorization": "Bearer "}
                )
        self.assertEqual(response.status_code, 401)

    def test_bearer_with_only_whitespace_rejected(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post(
                    "/api/calendar-auth/verify", headers={"Authorization": "Bearer    "}
                )
        self.assertEqual(response.status_code, 401)

    def test_invalid_token_rejected(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post(
                    "/api/calendar-auth/verify",
                    headers={"Authorization": "Bearer this-is-not-a-configured-token"},
                )
        self.assertEqual(response.status_code, 401)

    def test_one_members_token_never_verifies_as_another_member(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post(
                    "/api/calendar-auth/verify", headers=bearer_header("mayurika")
                )
        self.assertEqual(response.json()["memberKey"], "mayurika")
        self.assertNotEqual(response.json()["memberKey"], "suman")


class TokenExposureTests(unittest.TestCase):
    """Requirement: never return the token or hashes; never log the token,
    hash, prefix, or partial token."""

    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def test_successful_verify_response_never_contains_token_or_hash(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post(
                    "/api/calendar-auth/verify", headers=bearer_header("mayurika")
                )
        raw_body = response.text
        self.assertNotIn(TEST_TOKENS["mayurika"], raw_body)
        self.assertNotIn(sha256_hex(TEST_TOKENS["mayurika"]), raw_body)

    def test_failed_verify_response_never_contains_token(self):
        submitted_token = "some-invalid-candidate-token-value"
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.post(
                    "/api/calendar-auth/verify",
                    headers={"Authorization": "Bearer " + submitted_token},
                )
        self.assertEqual(response.status_code, 401)
        self.assertNotIn(submitted_token, response.text)
        self.assertNotIn(sha256_hex(submitted_token), response.text)


class StartupConfigurationValidationTests(unittest.TestCase):
    """Fail-closed startup validation (backend/config.py
    load_calendar_auth_token_hashes, wired into backend/main.py's lifespan).
    Each test enters TestClient's `with` block, which runs the app's
    lifespan startup handler — a misconfigured environment must raise
    before any request could ever be served."""

    def test_missing_variable_fails_closed(self):
        env = test_token_env()
        del env["CALENDAR_AUTH_TOKEN_HASH_PARAPARAN"]
        with mock.patch.dict("os.environ", env, clear=False):
            with self.assertRaises(RuntimeError):
                with TestClient(app):
                    pass

    def test_blank_variable_fails_closed(self):
        with patched_calendar_auth_env({"CALENDAR_AUTH_TOKEN_HASH_RAJIV": "   "}):
            with self.assertRaises(RuntimeError):
                with TestClient(app):
                    pass

    def test_malformed_non_hex_hash_fails_closed(self):
        with patched_calendar_auth_env({"CALENDAR_AUTH_TOKEN_HASH_ARUN": "z" * 64}):
            with self.assertRaises(RuntimeError):
                with TestClient(app):
                    pass

    def test_malformed_wrong_length_hash_fails_closed(self):
        with patched_calendar_auth_env({"CALENDAR_AUTH_TOKEN_HASH_SUMAN": "abc123"}):
            with self.assertRaises(RuntimeError):
                with TestClient(app):
                    pass

    def test_duplicate_hash_across_members_fails_closed(self):
        duplicate = sha256_hex(TEST_TOKENS["mayurika"])
        with patched_calendar_auth_env({"CALENDAR_AUTH_TOKEN_HASH_SUMAN": duplicate}):
            with self.assertRaises(RuntimeError):
                with TestClient(app):
                    pass

    def test_valid_configuration_starts_cleanly(self):
        with patched_calendar_auth_env():
            with TestClient(app):
                pass  # no exception


class CorsPreflightTests(unittest.TestCase):
    """Approved requirement: browser requests from the approved frontend
    origin must be able to send the Authorization header and complete
    OPTIONS preflight successfully; the production origin allowlist must
    not be broadened, and allow_credentials must stay False."""

    def test_preflight_allows_authorization_header_from_production_origin(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.options(
                    "/api/member-schedules/mayurika",
                    headers={
                        "Origin": "https://management-aios.vercel.app",
                        "Access-Control-Request-Method": "POST",
                        "Access-Control-Request-Headers": "authorization,content-type",
                    },
                )
        self.assertEqual(response.status_code, 200)
        allow_headers = response.headers.get("access-control-allow-headers", "")
        self.assertIn("authorization", allow_headers.lower())
        self.assertIn("content-type", allow_headers.lower())
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "https://management-aios.vercel.app",
        )
        # allow_credentials=False must be preserved — bearer tokens do not
        # need cookies, and broadening this would also make the separate
        # localhost-any-port dev regex unsafe.
        self.assertIsNone(response.headers.get("access-control-allow-credentials"))

    def test_preflight_still_works_for_untouched_get_routes(self):
        """Confirms the CORS header change (adding Authorization) did not
        regress the pre-existing Content-Type-only preflight path used by
        every unauthenticated read/report route."""
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.options(
                    "/api/member-schedules/mayurika",
                    headers={
                        "Origin": "https://management-aios.vercel.app",
                        "Access-Control-Request-Method": "GET",
                        "Access-Control-Request-Headers": "content-type",
                    },
                )
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()

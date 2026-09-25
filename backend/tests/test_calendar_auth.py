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


class CorsExposeHeadersTests(unittest.TestCase):
    """REQ-CAL-REV-PDF-003-FIX-02 — proven root cause of the production
    "review-summaries.pdf" filename defect: Content-Disposition was not in
    CORSMiddleware's expose_headers, so the cross-origin frontend's
    res.headers.get('Content-Disposition') always returned null even
    though the header was present on the wire. Access-Control-Expose-
    Headers is only set by Starlette on the actual response, not on an
    OPTIONS preflight — so this exercises a real GET with an Origin
    header, not client.options(...)."""

    def test_actual_response_exposes_content_disposition_header(self):
        with patched_calendar_auth_env():
            with TestClient(app) as client:
                response = client.get(
                    "/health",
                    headers={"Origin": "https://management-aios.vercel.app"},
                )
        self.assertEqual(response.status_code, 200)
        exposed = response.headers.get("access-control-expose-headers", "")
        self.assertIn("content-disposition", exposed.lower())


class DevAuthBypassTests(unittest.TestCase):
    """Local-development-only Calendar auth bypass (backend/config.py
    load_dev_auth_bypass, folded into backend/routers/calendar_auth.py
    validate_calendar_auth_token's existing comparison loop).

    A fixed, test-only bypass token/hash — never this developer's real
    CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH value from .env, which is never
    read by any test here. Every test explicitly sets (never merely
    omits) all four bypass-related environment variables, so a real,
    already-configured .env value on the machine running these tests can
    never leak in and change the outcome — patched_calendar_auth_env's
    mock.patch.dict(..., clear=False) only overrides the keys it is given;
    an omitted key would fall through to whatever the real process
    environment already has, which is exactly what these tests must not
    depend on."""

    DEV_BYPASS_TEST_TOKEN = "test-only-token-dev-bypass-never-a-real-secret"
    DEV_BYPASS_TEST_HASH = sha256_hex(DEV_BYPASS_TEST_TOKEN)
    DEV_BYPASS_MEMBER_KEY = "arun"

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

    def _bypass_env(self, **overrides):
        env = {
            "ENVIRONMENT": "development",
            "DEV_AUTH_BYPASS": "true",
            "DEV_AUTH_BYPASS_MEMBER_KEY": self.DEV_BYPASS_MEMBER_KEY,
            "CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH": self.DEV_BYPASS_TEST_HASH,
        }
        env.update(overrides)
        return env

    def _bypass_bearer(self):
        return {"Authorization": "Bearer " + self.DEV_BYPASS_TEST_TOKEN}

    def _post_verify(self, env, headers):
        with patched_calendar_auth_env(env):
            with TestClient(app) as client:
                return client.post("/api/calendar-auth/verify", headers=headers)

    # 1. development + explicitly enabled + matching token + valid member key
    def test_enabled_bypass_with_matching_token_succeeds(self):
        resp = self._post_verify(self._bypass_env(), self._bypass_bearer())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["memberKey"], self.DEV_BYPASS_MEMBER_KEY)

    # 2. wrong raw token
    def test_wrong_token_rejected(self):
        resp = self._post_verify(
            self._bypass_env(),
            {"Authorization": "Bearer this-token-does-not-match-the-bypass-hash"},
        )
        self.assertEqual(resp.status_code, 401)

    # 3. DEV_AUTH_BYPASS missing or false
    def test_bypass_flag_missing_rejected(self):
        resp = self._post_verify(
            self._bypass_env(DEV_AUTH_BYPASS=""), self._bypass_bearer()
        )
        self.assertEqual(resp.status_code, 401)

    def test_bypass_flag_false_rejected(self):
        resp = self._post_verify(
            self._bypass_env(DEV_AUTH_BYPASS="false"), self._bypass_bearer()
        )
        self.assertEqual(resp.status_code, 401)

    def test_bypass_flag_loose_truthy_value_rejected(self):
        """Strict parser: only the exact literal "true" enables anything —
        "1"/"yes" are not guessed at."""
        resp = self._post_verify(
            self._bypass_env(DEV_AUTH_BYPASS="1"), self._bypass_bearer()
        )
        self.assertEqual(resp.status_code, 401)

    # 4. bypass hash missing
    def test_bypass_hash_missing_rejected(self):
        resp = self._post_verify(
            self._bypass_env(CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH=""),
            self._bypass_bearer(),
        )
        self.assertEqual(resp.status_code, 401)

    # 5. bypass hash malformed or not 64 hexadecimal characters
    def test_bypass_hash_wrong_length_rejected(self):
        resp = self._post_verify(
            self._bypass_env(CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH="abc123"),
            self._bypass_bearer(),
        )
        self.assertEqual(resp.status_code, 401)

    def test_bypass_hash_non_hex_rejected(self):
        resp = self._post_verify(
            self._bypass_env(CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH="z" * 64),
            self._bypass_bearer(),
        )
        self.assertEqual(resp.status_code, 401)

    # 6. bypass member key missing
    def test_bypass_member_key_missing_rejected(self):
        resp = self._post_verify(
            self._bypass_env(DEV_AUTH_BYPASS_MEMBER_KEY=""), self._bypass_bearer()
        )
        self.assertEqual(resp.status_code, 401)

    # 7. bypass member key invalid
    def test_bypass_member_key_invalid_rejected(self):
        resp = self._post_verify(
            self._bypass_env(DEV_AUTH_BYPASS_MEMBER_KEY="not_a_real_member"),
            self._bypass_bearer(),
        )
        self.assertEqual(resp.status_code, 401)

    def test_bypass_member_key_md_rejected(self):
        """MD is deliberately not in VALID_MEMBER_KEYS — the bypass must
        not become a backdoor into the separate MD identity."""
        resp = self._post_verify(
            self._bypass_env(DEV_AUTH_BYPASS_MEMBER_KEY="md"), self._bypass_bearer()
        )
        self.assertEqual(resp.status_code, 401)

    # 8. ENVIRONMENT=production with every bypass variable configured
    def test_production_environment_ignores_fully_configured_bypass(self):
        resp = self._post_verify(
            self._bypass_env(ENVIRONMENT="production"), self._bypass_bearer()
        )
        self.assertEqual(resp.status_code, 401)

    def test_production_environment_normalization_is_case_and_whitespace_insensitive(self):
        resp = self._post_verify(
            self._bypass_env(ENVIRONMENT="  PRODUCTION  "), self._bypass_bearer()
        )
        self.assertEqual(resp.status_code, 401)

    # 9. existing normal member token authentication still succeeds
    def test_normal_member_token_still_succeeds_with_bypass_enabled(self):
        resp = self._post_verify(self._bypass_env(), bearer_header("mayurika"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["memberKey"], "mayurika")

    def test_bypass_members_own_real_token_still_succeeds_independently(self):
        """The bypass is configured for "arun" here — Arun's own real
        token must keep working exactly as before, side by side with the
        bypass token, never overwritten by it."""
        resp = self._post_verify(self._bypass_env(), bearer_header("arun"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["memberKey"], "arun")

    # 10. existing MD-token behavior remains unchanged
    def test_md_token_still_succeeds_with_bypass_enabled(self):
        with patched_calendar_auth_env(self._bypass_env(), include_md=True):
            with TestClient(app) as client:
                resp = client.post(
                    "/api/calendar-auth/verify", headers=bearer_header("md")
                )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["memberKey"], "md")

    # Collision defense-in-depth: a bypass hash equal to an already-
    # configured real hash must never be added as a second candidate.
    def test_bypass_hash_colliding_with_a_real_member_hash_is_not_added(self):
        colliding_hash = sha256_hex(TEST_TOKENS["suman"])
        env = self._bypass_env(CALENDAR_AUTH_DEV_BYPASS_TOKEN_HASH=colliding_hash)
        # The bypass token itself (whose hash does NOT equal the collision)
        # must not verify — the colliding hash was skipped, not added.
        resp = self._post_verify(env, self._bypass_bearer())
        self.assertEqual(resp.status_code, 401)
        # Suman's own real token still works normally either way.
        resp2 = self._post_verify(env, bearer_header("suman"))
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["memberKey"], "suman")

    def test_bypass_response_never_contains_token_or_hash(self):
        resp = self._post_verify(self._bypass_env(), self._bypass_bearer())
        raw_body = resp.text
        self.assertNotIn(self.DEV_BYPASS_TEST_TOKEN, raw_body)
        self.assertNotIn(self.DEV_BYPASS_TEST_HASH, raw_body)


if __name__ == "__main__":
    unittest.main()

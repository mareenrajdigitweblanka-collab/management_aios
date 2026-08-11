"""HTTP-level auth tests for the Staff Data dashboard endpoints
(REQ-AUTH-MODULES-007, 2026-08-10).

Staff Data (GET /api/staff, GET /api/staff/filter-options) was previously
fully public. This file exercises the new requirement — every read now
requires the existing Calendar member token (Depends(get_verified_member),
backend/routers/staff.py) — through the real app (backend.main.app), same
isolated in-memory SQLite convention as test_knowledge_documents.py.

GET /api/staff/summary was removed 2026-08-11 along with
staff_status/employment_stage (its entire logic depended on them — see
backend/routers/staff.py module docstring); its auth tests were removed
with it.

2026-08-11: seed_staff rebuilt for the exact-Ledsone-mirror shape — id is
now an explicit integer (StaffDashboardRecord.id has no autoincrement
default; matches employee_management.staff.id on Ledsone in production)
instead of a generated UUID, and the old CSV-provenance bookkeeping fields
(source_record_key/employee_number/full_name/department_team/source_hash/
source_status/is_current/imported_at) no longer exist — see
backend/models.py StaffDashboardRecord docstring.

Run with: python -m unittest backend.tests.test_staff_auth
"""

import unittest
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.models import StaffDashboardRecord
from backend.tests.calendar_auth_test_support import (
    bearer_header,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)


class StaffAuthTestCase(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.env_ctx = patched_calendar_auth_env()
        self.env_ctx.__enter__()
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self.env_ctx.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    def seed_staff(self, **overrides):
        session = self.SessionLocal()
        now = datetime.now(timezone.utc)
        fields = dict(
            id=overrides.pop("id", 1),
            staff_code=overrides.pop("staff_code", "DWL-AUTH-001"),
            name=overrides.pop("name", "Auth Test Staff"),
            designation=overrides.pop("designation", "Test Role"),
            team_id=overrides.pop("team_id", None),
            # Explicit values (not the Postgres-only server_default=now()) —
            # same reasoning as test_staff_review_summaries.py's own
            # seed_staff helper, so this row can be seeded against SQLite.
            synced_at=overrides.pop("synced_at", now),
            created_at=overrides.pop("created_at", now),
            updated_at=overrides.pop("updated_at", now),
        )
        fields.update(overrides)
        row = StaffDashboardRecord(**fields)
        session.add(row)
        session.commit()
        session.close()


class ListAuthTests(StaffAuthTestCase):
    def test_1_unauthenticated_list_rejected(self):
        self.seed_staff()
        response = self.client.get("/api/staff")
        self.assertEqual(response.status_code, 401)

    def test_2_authenticated_list_succeeds(self):
        self.seed_staff()
        response = self.client.get("/api/staff", headers=bearer_header("mayurika"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["records"]), 1)

    def test_3_invalid_token_rejected(self):
        self.seed_staff()
        response = self.client.get("/api/staff", headers={"Authorization": "Bearer not-a-real-token"})
        self.assertEqual(response.status_code, 401)


class FilterOptionsAuthTests(StaffAuthTestCase):
    def test_4_unauthenticated_filter_options_rejected(self):
        response = self.client.get("/api/staff/filter-options")
        self.assertEqual(response.status_code, 401)

    def test_5_authenticated_filter_options_succeeds(self):
        self.seed_staff(team_id=7)
        response = self.client.get("/api/staff/filter-options", headers=bearer_header("arun"))
        self.assertEqual(response.status_code, 200)
        self.assertIn(7, response.json()["team_ids"])


class CrossMemberReadTests(StaffAuthTestCase):
    """Staff Data has no per-member ownership (unlike Task/Leave) — any
    authenticated Management Team member, or MD, may read it. This is a
    deliberate contrast with require_matching_member's own-member-only
    mutation lock; there is nothing to "own" in a read-only dashboard
    projection."""

    def test_8_every_management_team_member_can_read(self):
        self.seed_staff()
        for member in ("mayurika", "suman", "arun", "rajiv", "paraparan"):
            response = self.client.get("/api/staff", headers=bearer_header(member))
            self.assertEqual(response.status_code, 200, member)

    def test_9_md_can_read(self):
        self.seed_staff()
        with patched_calendar_auth_env(include_md=True):
            with TestClient(app) as client:
                response = client.get("/api/staff", headers=bearer_header("md"))
                self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()

"""HTTP-level authorization tests for all nine Calendar Task/Leave mutation
routes (Calendar member-token authorization, 2026-07-29 approved
requirement):

  1. POST   /api/member-schedules/{member_key}
  2. POST   /api/member-schedules/{member_key}/bulk
  3. PUT    /api/member-schedules/{member_key}/{event_id}
  4. DELETE /api/member-schedules/{member_key}/{event_id}
  5. PUT    /api/member-schedules/{member_key}/{event_id}/outcome
  6. DELETE /api/member-schedules/{member_key}/clear-testing-data
  7. POST   /api/member-leave/{member_key}
  8. PUT    /api/member-leave/{member_key}/{leave_id}
  9. DELETE /api/member-leave/{member_key}/{leave_id}

Uses fastapi.testclient.TestClient against the real app (backend.main.app)
— see backend/tests/calendar_auth_test_support.py — so every request here
goes through FastAPI's real routing and dependency injection (including
the require_matching_member 403 check), never a direct Python function
call. Setup-only data (seeding a Task/Leave row to update/delete) is
written directly via a SQLAlchemy session against the same in-memory
SQLite database the TestClient's overridden get_db serves, matching the
existing backend/tests/test_task_outcome_endpoint.py convention.

Run with: python -m unittest backend.tests.test_calendar_mutation_authorization
"""

import unittest
from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient

from backend.config import MEMBER_LABELS
from backend.database import get_db
from backend.main import app
from backend.models import MemberLeaveRecord, MemberScheduleEvent
from backend.tests.calendar_auth_test_support import (
    bearer_header,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)
from backend.time_utils import colombo_today


class CalendarMutationAuthorizationTestCase(unittest.TestCase):
    """Fresh, isolated in-memory SQLite database per test method, wired
    into the real app via a get_db dependency override — no cross-test
    data leakage, no shared state, no real network connection."""

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
        self.today = colombo_today()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self.env_ctx.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    def make_session(self):
        return self.SessionLocal()

    def seed_task(self, member_key="mayurika", event_date=None, title="Seed task", outcome=None):
        session = self.make_session()
        now = datetime.now(timezone.utc)
        task = MemberScheduleEvent(
            member_key=member_key,
            member_label=MEMBER_LABELS[member_key],
            event_date=event_date or self.today,
            title=title,
            category="Scheduled Task",
            priority="Medium",
            source_scope="dashboard_testing",
            is_official_truth=False,
            outcome=outcome,
            created_at=now,
            updated_at=now,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        task_id = task.id
        session.close()
        return task_id

    def seed_leave(self, member_key="mayurika", start_date=None):
        session = self.make_session()
        now = datetime.now(timezone.utc)
        record = MemberLeaveRecord(
            member_key=member_key,
            member_label=MEMBER_LABELS[member_key],
            leave_type="Full-Day",
            start_date=start_date or (self.today + timedelta(days=10)),
            end_date=start_date or (self.today + timedelta(days=10)),
            coordination_copy_only=True,
            policy_source_id="SRC-POLICY-001",
            effective_leave_minutes=540,
            created_at=now,
            updated_at=now,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        leave_id = record.id
        session.close()
        return leave_id

    def load_task(self, task_id):
        session = self.make_session()
        task = session.get(MemberScheduleEvent, task_id)
        session.expunge(task)
        session.close()
        return task

    def load_leave(self, leave_id):
        session = self.make_session()
        record = session.get(MemberLeaveRecord, leave_id)
        session.expunge(record)
        session.close()
        return record

    def count_tasks(self, member_key):
        session = self.make_session()
        count = (
            session.query(MemberScheduleEvent)
            .filter(
                MemberScheduleEvent.member_key == member_key,
                MemberScheduleEvent.deleted_at.is_(None),
            )
            .count()
        )
        session.close()
        return count

    def count_leave(self, member_key):
        session = self.make_session()
        count = (
            session.query(MemberLeaveRecord)
            .filter(
                MemberLeaveRecord.member_key == member_key,
                MemberLeaveRecord.deleted_at.is_(None),
            )
            .count()
        )
        session.close()
        return count


# ── 1. Task create ───────────────────────────────────────────────────────
class TaskCreateAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def test_own_member_create_succeeds(self):
        response = self.client.post(
            "/api/member-schedules/mayurika",
            json={"date": str(self.today), "title": "Own-member task", "priority": "Medium"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.count_tasks("mayurika"), 1)

    def test_cross_member_create_denied_and_creates_nothing(self):
        response = self.client.post(
            "/api/member-schedules/suman",
            json={"date": str(self.today), "title": "Cross-member task", "priority": "Medium"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.count_tasks("suman"), 0)

    def test_missing_token_create_rejected_with_401_and_creates_nothing(self):
        response = self.client.post(
            "/api/member-schedules/mayurika",
            json={"date": str(self.today), "title": "No token task", "priority": "Medium"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.count_tasks("mayurika"), 0)


# ── 2. Bulk Task create ──────────────────────────────────────────────────
class BulkTaskCreateAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def _bulk_payload(self):
        return {
            "tasks": [
                {"date": str(self.today), "title": "Bulk row 1", "priority": "Medium"},
                {"date": str(self.today), "title": "Bulk row 2", "priority": "Low"},
            ]
        }

    def test_own_member_bulk_create_succeeds(self):
        response = self.client.post(
            "/api/member-schedules/mayurika/bulk",
            json=self._bulk_payload(),
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.count_tasks("mayurika"), 2)

    def test_cross_member_bulk_create_denied_with_zero_inserts(self):
        response = self.client.post(
            "/api/member-schedules/suman/bulk",
            json=self._bulk_payload(),
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.count_tasks("suman"), 0)
        self.assertEqual(self.count_tasks("mayurika"), 0)


# ── 3. Task update ────────────────────────────────────────────────────────
class TaskUpdateAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def test_own_member_update_succeeds(self):
        task_id = self.seed_task(member_key="mayurika", title="Original title")
        response = self.client.put(
            f"/api/member-schedules/mayurika/{task_id}",
            json={"title": "Updated title"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.load_task(task_id).title, "Updated title")
        self.assertEqual(self.load_task(task_id).updated_by, "mayurika")

    def test_cross_member_update_denied_and_row_unchanged(self):
        task_id = self.seed_task(member_key="mayurika", title="Original title")
        response = self.client.put(
            f"/api/member-schedules/mayurika/{task_id}",
            json={"title": "Hijacked title"},
            headers=bearer_header("suman"),
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.load_task(task_id).title, "Original title")

    def test_genuine_404_preserved_for_own_member_missing_task(self):
        import uuid

        response = self.client.put(
            f"/api/member-schedules/mayurika/{uuid.uuid4()}",
            json={"title": "Does not exist"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 404)


# ── 4. Task delete ────────────────────────────────────────────────────────
class TaskDeleteAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def test_own_member_delete_succeeds(self):
        task_id = self.seed_task(member_key="mayurika")
        response = self.client.delete(
            f"/api/member-schedules/mayurika/{task_id}", headers=bearer_header("mayurika")
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.count_tasks("mayurika"), 0)

    def test_cross_member_delete_denied_and_row_survives(self):
        task_id = self.seed_task(member_key="mayurika")
        response = self.client.delete(
            f"/api/member-schedules/mayurika/{task_id}", headers=bearer_header("arun")
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.count_tasks("mayurika"), 1)

    def test_existing_409_outcome_recorded_immutable_preserved(self):
        task_id = self.seed_task(member_key="mayurika", outcome="Completed")
        response = self.client.delete(
            f"/api/member-schedules/mayurika/{task_id}", headers=bearer_header("mayurika")
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("outcome_recorded_immutable", response.text)
        self.assertEqual(self.count_tasks("mayurika"), 1)


# ── 5. Task outcome ───────────────────────────────────────────────────────
class TaskOutcomeAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def test_own_member_outcome_update_succeeds(self):
        task_id = self.seed_task(member_key="mayurika", event_date=self.today)
        response = self.client.put(
            f"/api/member-schedules/mayurika/{task_id}/outcome",
            json={"outcome": "Completed"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 200)
        reloaded = self.load_task(task_id)
        self.assertEqual(reloaded.outcome, "Completed")
        self.assertEqual(reloaded.outcome_updated_by, "mayurika")

    def test_cross_member_outcome_update_denied_and_row_unchanged(self):
        task_id = self.seed_task(member_key="mayurika", event_date=self.today)
        response = self.client.put(
            f"/api/member-schedules/mayurika/{task_id}/outcome",
            json={"outcome": "Completed"},
            headers=bearer_header("rajiv"),
        )
        self.assertEqual(response.status_code, 403)
        self.assertIsNone(self.load_task(task_id).outcome)

    def test_existing_409_outcome_locked_preserved(self):
        task_id = self.seed_task(
            member_key="mayurika", event_date=self.today - timedelta(days=1)
        )
        response = self.client.put(
            f"/api/member-schedules/mayurika/{task_id}/outcome",
            json={"outcome": "Completed"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("outcome_locked", response.text)


# ── 6. Clear testing data ────────────────────────────────────────────────
class ClearTestingDataAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def test_own_member_clear_succeeds(self):
        self.seed_task(member_key="mayurika")
        response = self.client.delete(
            "/api/member-schedules/mayurika/clear-testing-data",
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["cleared_count"], 1)
        self.assertEqual(self.count_tasks("mayurika"), 0)

    def test_cross_member_clear_denied_and_data_survives(self):
        self.seed_task(member_key="mayurika")
        response = self.client.delete(
            "/api/member-schedules/mayurika/clear-testing-data",
            headers=bearer_header("suman"),
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.count_tasks("mayurika"), 1)


# ── 7. Leave create ───────────────────────────────────────────────────────
class LeaveCreateAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def _leave_payload(self):
        target = self.today + timedelta(days=20)
        return {"leave_type": "Full-Day", "start_date": str(target), "end_date": str(target)}

    def test_own_member_create_succeeds(self):
        response = self.client.post(
            "/api/member-leave/mayurika", json=self._leave_payload(), headers=bearer_header("mayurika")
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.count_leave("mayurika"), 1)

    def test_cross_member_create_denied_and_creates_nothing(self):
        response = self.client.post(
            "/api/member-leave/suman", json=self._leave_payload(), headers=bearer_header("mayurika")
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.count_leave("suman"), 0)

    def test_missing_token_create_rejected_with_401(self):
        response = self.client.post("/api/member-leave/mayurika", json=self._leave_payload())
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.count_leave("mayurika"), 0)


# ── 8. Leave update ───────────────────────────────────────────────────────
class LeaveUpdateAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def test_own_member_update_succeeds(self):
        leave_id = self.seed_leave(member_key="mayurika")
        response = self.client.put(
            f"/api/member-leave/mayurika/{leave_id}",
            json={"purpose": "Updated purpose"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 200)
        reloaded = self.load_leave(leave_id)
        self.assertEqual(reloaded.purpose, "Updated purpose")
        self.assertEqual(reloaded.updated_by, "mayurika")

    def test_cross_member_update_denied_and_row_unchanged(self):
        leave_id = self.seed_leave(member_key="mayurika")
        response = self.client.put(
            f"/api/member-leave/mayurika/{leave_id}",
            json={"purpose": "Hijacked purpose"},
            headers=bearer_header("arun"),
        )
        self.assertEqual(response.status_code, 403)
        self.assertIsNone(self.load_leave(leave_id).purpose)

    def test_genuine_404_preserved_for_own_member_missing_leave(self):
        import uuid

        response = self.client.put(
            f"/api/member-leave/mayurika/{uuid.uuid4()}",
            json={"purpose": "Does not exist"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 404)


# ── 9. Leave delete ───────────────────────────────────────────────────────
class LeaveDeleteAuthorizationTests(CalendarMutationAuthorizationTestCase):
    def test_own_member_delete_succeeds(self):
        leave_id = self.seed_leave(member_key="mayurika")
        response = self.client.delete(
            f"/api/member-leave/mayurika/{leave_id}", headers=bearer_header("mayurika")
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.count_leave("mayurika"), 0)

    def test_cross_member_delete_denied_and_row_survives(self):
        leave_id = self.seed_leave(member_key="mayurika")
        response = self.client.delete(
            f"/api/member-leave/mayurika/{leave_id}", headers=bearer_header("paraparan")
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.count_leave("mayurika"), 1)

    def test_missing_token_delete_rejected_with_401_and_row_survives(self):
        leave_id = self.seed_leave(member_key="mayurika")
        response = self.client.delete(f"/api/member-leave/mayurika/{leave_id}")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.count_leave("mayurika"), 1)


# ── Public reads remain unauthenticated ──────────────────────────────────
class PublicReadTests(CalendarMutationAuthorizationTestCase):
    def test_list_tasks_requires_no_token(self):
        self.seed_task(member_key="mayurika")
        response = self.client.get("/api/member-schedules/mayurika")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_list_leave_requires_no_token(self):
        self.seed_leave(member_key="mayurika")
        response = self.client.get("/api/member-leave/mayurika")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_weekly_report_requires_no_token(self):
        self.seed_task(member_key="mayurika")
        monday = self.today - timedelta(days=self.today.weekday())
        response = self.client.get(
            "/api/member-schedules/mayurika/reports/weekly",
            params={"week_start": str(monday)},
        )
        self.assertEqual(response.status_code, 200)

    def test_leave_summary_requires_no_token(self):
        response = self.client.get(
            "/api/member-leave/mayurika/summary", params={"month": self.today.strftime("%Y-%m")}
        )
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()

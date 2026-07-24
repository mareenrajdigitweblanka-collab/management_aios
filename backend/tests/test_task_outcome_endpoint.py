"""Endpoint-level tests for the Task Outcome feature — the first tests in
this repository to exercise backend/routers/member_schedules.py's outcome-
related route FUNCTIONS (update_member_schedule_event_outcome,
update_member_schedule_event, delete_member_schedule_event) against a real,
running database, rather than the pure-function/schema-only tests every
other file in this directory is limited to.

WHY A NEW PATTERN, AND WHY IT LOOKS LIKE THIS (read before assuming a live
Postgres/Neon TestClient run was skipped without cause):

1. This workstation cannot reach the live Neon database directly (SSL/
   protocol handshake hangs — see
   backend/tests/test_schedule_classification.py's module docstring and
   handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md
   §7 for the confirmed history). That limitation is unchanged.

2. fastapi.testclient.TestClient requires the `httpx` package, which is
   NOT installed in this environment (confirmed by import failure) and is
   NOT in backend/requirements.txt. Adding a new dependency was judged out
   of scope for a closure-review pass and was not requested — so this file
   does not use TestClient.

3. Instead, this file calls the route functions DIRECTLY (no HTTP/ASGI
   layer) — one of the patterns this task explicitly asked to be
   considered ("direct async/sync route invocation patterns"). Route
   functions decorated with @router.put/@router.delete are still plain
   Python functions; `db: Session = Depends(get_db)` is just a default
   value unless FastAPI's own dependency-injection system resolves it —
   passing `db=<a real Session>` as an explicit keyword argument bypasses
   that resolution cleanly and runs the exact same function body FastAPI
   would have run for a real HTTP request.

4. The database behind that Session is a real, ephemeral, in-memory
   SQLite database (SQLAlchemy `sqlite:///:memory:` + StaticPool so every
   Session in one test shares the same connection/data) — created fresh
   per test method via setUp() and discarded in tearDown(). Nothing here
   writes to any shared, local-file, staging, or production database.
   backend/models.py's CheckConstraint definitions were written using
   portable trim()/length() (not the Postgres-specific btrim()/
   char_length() spellings) specifically so the SAME constraint text is
   valid SQL on both SQLite and Postgres — the pairing CHECK constraint
   (member_schedule_events_outcome_reason_pairing_check) is therefore
   genuinely exercised here, not merely asserted by inspection.

   SQLite's dialect differs from Postgres/Neon in ways this file does NOT
   claim to have verified: native TIMESTAMPTZ semantics (SQLite stores
   DateTime as ISO text; Python-side timezone-awareness is preserved but
   there is no native tz-aware column type to diverge from), and any kind
   of true concurrent-connection behavior (a single in-memory SQLite
   database under StaticPool has no meaningful concurrency model to test).
   Final confirmation against the real Neon/Postgres deployment target
   still requires running this migration on a Neon branch and re-running
   (or manually walking) these same scenarios there — see the handover
   document for this task.

5. member_schedule_events is declared with schema="management_aios"
   (backend/models.py). SQLite has no native multi-schema model the way
   Postgres does; `ATTACH DATABASE ':memory:' AS management_aios` on
   every new connection (see _attach_schema below) gives SQLite an
   in-memory database it will accept the "management_aios." qualifier
   against, so the exact same table/column DDL backend/models.py declares
   runs unmodified.

Run with: python -m unittest backend.tests.test_task_outcome_endpoint
"""

import unittest
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.config import MEMBER_LABELS
from backend.database import Base
from backend.models import MemberScheduleEvent
from backend.routers.member_schedules import (
    delete_member_schedule_event,
    update_member_schedule_event,
    update_member_schedule_event_outcome,
)
from backend.schemas import MemberScheduleEventUpdate, TaskOutcomeUpdate
from backend.time_utils import colombo_today


def _attach_schema(dbapi_conn, connection_record):
    dbapi_conn.execute("ATTACH DATABASE ':memory:' AS management_aios")


class TaskOutcomeEndpointTestCase(unittest.TestCase):
    """Fresh, isolated in-memory SQLite database per test method — no
    cross-test data leakage, no shared state, no real network connection."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        event.listen(self.engine, "connect", _attach_schema)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.today = colombo_today()

    def tearDown(self):
        self.engine.dispose()

    def make_session(self):
        return self.SessionLocal()

    def make_task(self, session, event_date, member_key="mayurika", title="Test task"):
        # created_at/updated_at/category/priority are set explicitly here
        # (never relying on the model's server_default="now()"/etc.)
        # because SQLite has no now() function — this exactly matches how
        # the real create_member_schedule_event endpoint already behaves
        # in production: it always computes created_at/updated_at in
        # Python and always assigns category via classify_new_task()/
        # priority via the request payload, never actually relying on a
        # DB-level default either.
        now = datetime.now(timezone.utc)
        task = MemberScheduleEvent(
            member_key=member_key,
            member_label=MEMBER_LABELS[member_key],
            event_date=event_date,
            title=title,
            category="Scheduled Task",
            priority="Medium",
            source_scope="dashboard_testing",
            is_official_truth=False,
            created_at=now,
            updated_at=now,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        return task

    def reload(self, session, task_id):
        session.expire_all()
        return session.get(MemberScheduleEvent, task_id)


# ── 1-2: basic on-date transitions ──────────────────────────────────────
class OnDateTransitionTests(TaskOutcomeEndpointTestCase):
    def test_1_pending_to_completed(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        result = update_member_schedule_event_outcome(
            member_key="mayurika",
            event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"),
            db=session,
        )
        self.assertEqual(result.outcome, "Completed")
        self.assertIsNone(result.outcome_reason)

    def test_2_pending_to_uncompleted_with_reason(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        result = update_member_schedule_event_outcome(
            member_key="mayurika",
            event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Uncompleted", reason="Waiting for approval"),
            db=session,
        )
        self.assertEqual(result.outcome, "Uncompleted")
        self.assertEqual(result.outcome_reason, "Waiting for approval")


# ── 3-5: reason length/blank validation (schema layer, exercised here too
#    so this file's own numbered scenario list is self-contained) ────────
class ReasonValidationTests(TaskOutcomeEndpointTestCase):
    def test_3_blank_reason_rejected(self):
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Uncompleted", reason="   ")

    def test_4_250_chars_accepted(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        reason = "x" * 250
        result = update_member_schedule_event_outcome(
            member_key="mayurika",
            event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Uncompleted", reason=reason),
            db=session,
        )
        self.assertEqual(result.outcome_reason, reason)
        # Confirm the DB round-trip, not just the returned Python object.
        reloaded = self.reload(session, task.id)
        self.assertEqual(reloaded.outcome_reason, reason)

    def test_5_251_chars_rejected(self):
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Uncompleted", reason="x" * 251)


# ── 6-7: future/past rejection ───────────────────────────────────────────
class DateWindowRejectionTests(TaskOutcomeEndpointTestCase):
    def test_6_future_action_rejected(self):
        session = self.make_session()
        task = self.make_task(session, self.today + timedelta(days=1))
        result = update_member_schedule_event_outcome(
            member_key="mayurika",
            event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"),
            db=session,
        )
        self.assertEqual(result.status_code, 409)
        self.assertIn(b"outcome_not_available_yet", result.body)
        reloaded = self.reload(session, task.id)
        self.assertIsNone(reloaded.outcome)

    def test_7_past_action_rejected(self):
        session = self.make_session()
        task = self.make_task(session, self.today - timedelta(days=1))
        result = update_member_schedule_event_outcome(
            member_key="mayurika",
            event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"),
            db=session,
        )
        self.assertEqual(result.status_code, 409)
        self.assertIn(b"outcome_locked", result.body)
        reloaded = self.reload(session, task.id)
        self.assertIsNone(reloaded.outcome)


# ── 8-10: transitions, reason clearing, reason editing ───────────────────
class TransitionAndReasonLifecycleTests(TaskOutcomeEndpointTestCase):
    def test_8_completed_to_uncompleted(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
        )
        result = update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Uncompleted", reason="Blocked on review"),
            db=session,
        )
        self.assertEqual(result.outcome, "Uncompleted")
        self.assertEqual(result.outcome_reason, "Blocked on review")

    def test_9_uncompleted_to_completed_clears_reason(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Uncompleted", reason="Waiting for approval"),
            db=session,
        )
        result = update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
        )
        self.assertEqual(result.outcome, "Completed")
        self.assertIsNone(result.outcome_reason)
        # The old reason must be genuinely gone at the storage layer, not
        # merely absent from this one response object.
        reloaded = self.reload(session, task.id)
        self.assertIsNone(reloaded.outcome_reason)

    def test_10_reason_edit(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Uncompleted", reason="First reason"),
            db=session,
        )
        result = update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Uncompleted", reason="Revised reason"),
            db=session,
        )
        self.assertEqual(result.outcome_reason, "Revised reason")


# ── 11-12: audit fields ───────────────────────────────────────────────────
class AuditFieldTests(TaskOutcomeEndpointTestCase):
    def test_11_timestamp_written(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        before = datetime.now(timezone.utc)
        result = update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
        )
        after = datetime.now(timezone.utc)
        self.assertIsNotNone(result.outcome_updated_at)
        stamp = result.outcome_updated_at
        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=timezone.utc)
        self.assertGreaterEqual(stamp, before - timedelta(seconds=2))
        self.assertLessEqual(stamp, after + timedelta(seconds=2))

    def test_12_member_actor_written(self):
        session = self.make_session()
        task = self.make_task(session, self.today, member_key="arun")
        result = update_member_schedule_event_outcome(
            member_key="arun", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
        )
        self.assertEqual(result.outcome_updated_by, "arun")
        # Structural guarantee, not just this one assertion: TaskOutcomeUpdate
        # has no client-settable actor field at all, so it can never be
        # spoofed by request body content.
        self.assertNotIn("outcome_updated_by", TaskOutcomeUpdate.model_fields)


# ── 13-14: date-change and delete locks ───────────────────────────────────
class ImmutabilityTests(TaskOutcomeEndpointTestCase):
    def test_13_date_change_blocked_after_outcome(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
        )
        result = update_member_schedule_event(
            member_key="mayurika", event_id=task.id,
            payload=MemberScheduleEventUpdate(date=self.today + timedelta(days=3)),
            db=session,
        )
        self.assertEqual(result.status_code, 409)
        self.assertIn(b"outcome_recorded_immutable", result.body)
        reloaded = self.reload(session, task.id)
        self.assertEqual(reloaded.event_date, self.today)

    def test_13b_non_date_edit_still_allowed_after_outcome(self):
        # Carve-out: title/notes/priority/time editing must keep working
        # even once an outcome is recorded — only the date is immutable.
        session = self.make_session()
        task = self.make_task(session, self.today)
        update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
        )
        result = update_member_schedule_event(
            member_key="mayurika", event_id=task.id,
            payload=MemberScheduleEventUpdate(title="Renamed task"),
            db=session,
        )
        self.assertEqual(result.title, "Renamed task")
        self.assertEqual(result.outcome, "Completed")

    def test_14_delete_blocked_after_outcome(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Uncompleted", reason="Needs follow-up"),
            db=session,
        )
        result = delete_member_schedule_event(member_key="mayurika", event_id=task.id, db=session)
        self.assertEqual(result.status_code, 409)
        self.assertIn(b"outcome_recorded_immutable", result.body)
        reloaded = self.reload(session, task.id)
        self.assertIsNone(reloaded.deleted_at)

    def test_14b_delete_still_allowed_without_outcome(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        result = delete_member_schedule_event(member_key="mayurika", event_id=task.id, db=session)
        self.assertEqual(result["deleted"], True)


# ── 15: member isolation ──────────────────────────────────────────────────
class MemberIsolationTests(TaskOutcomeEndpointTestCase):
    def test_15_cross_member_update_rejected(self):
        session = self.make_session()
        task = self.make_task(session, self.today, member_key="mayurika")
        with self.assertRaises(HTTPException) as ctx:
            update_member_schedule_event_outcome(
                member_key="arun", event_id=task.id,
                payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
            )
        self.assertEqual(ctx.exception.status_code, 404)


# ── 16: idempotent same-value resubmission ────────────────────────────────
class SameValueTests(TaskOutcomeEndpointTestCase):
    def test_16_same_value_resubmission(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
        )
        result = update_member_schedule_event_outcome(
            member_key="mayurika", event_id=task.id,
            payload=TaskOutcomeUpdate(outcome="Completed"), db=session,
        )
        self.assertEqual(result.outcome, "Completed")


# ── 17: failed validation never reaches the database ──────────────────────
class ValidationFailureAtomicityTests(TaskOutcomeEndpointTestCase):
    def test_17_failed_validation_leaves_outcome_fields_unchanged(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Uncompleted", reason="")
        # A ValidationError prevents TaskOutcomeUpdate from ever being
        # constructed, so update_member_schedule_event_outcome's body never
        # runs at all for this request -- confirm nothing changed.
        reloaded = self.reload(session, task.id)
        self.assertIsNone(reloaded.outcome)
        self.assertIsNone(reloaded.outcome_reason)
        self.assertIsNone(reloaded.outcome_updated_at)
        self.assertIsNone(reloaded.outcome_updated_by)


# ── Rollback/atomicity: a real commit-time failure, not just a
#    validation-time one — bypasses TaskOutcomeUpdate entirely and mutates
#    the ORM object directly into a state that violates the live pairing
#    CHECK constraint, forcing db.commit() itself to raise. ─────────────
class CommitFailureRollbackTests(TaskOutcomeEndpointTestCase):
    def test_commit_failure_leaves_all_four_outcome_fields_unchanged(self):
        session = self.make_session()
        task = self.make_task(session, self.today)
        task_id = task.id

        # Deliberately invalid combination: outcome='Uncompleted' with
        # outcome_reason left NULL violates
        # member_schedule_events_outcome_reason_pairing_check. This can
        # never happen through the real API (TaskOutcomeUpdate always
        # normalizes/validates first) -- it is manufactured here purely to
        # force a real, live CHECK-constraint failure at commit time.
        task.outcome = "Uncompleted"
        task.outcome_reason = None
        task.outcome_updated_at = datetime.now(timezone.utc)
        task.outcome_updated_by = "mayurika"
        with self.assertRaises(IntegrityError):
            session.commit()
        session.rollback()
        session.close()

        # Fresh session, fresh query -- proves nothing partially persisted,
        # not merely that the in-memory object was reverted.
        verify_session = self.make_session()
        reloaded = verify_session.get(MemberScheduleEvent, task_id)
        self.assertIsNone(reloaded.outcome)
        self.assertIsNone(reloaded.outcome_reason)
        self.assertIsNone(reloaded.outcome_updated_at)
        self.assertIsNone(reloaded.outcome_updated_by)
        verify_session.close()


if __name__ == "__main__":
    unittest.main()

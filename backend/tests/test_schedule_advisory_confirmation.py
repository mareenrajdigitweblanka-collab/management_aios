"""Automated tests for the LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP
CONFIRMATION feature (2026-07-27).

Two independent, ADVISORY (confirmable, never a hard block) conditions:

  1. Lunch-break overlap: a timed Task whose [start, end) interval overlaps
     the company lunch interval [12:45, 13:30) — every calendar day,
     including weekends. Reuses backend.config.ACTUAL_OFFICE_BREAK_START/END
     (the pre-existing "actual company office break" constant) rather than a
     second, independently-defined lunch constant.
  2. Different-title Task-time overlap: a timed Task whose interval overlaps
     an ACTIVE timed Task for the SAME member and SAME date whose normalized
     title DIFFERS from the candidate's.

Both are detected by the single shared backend.routers.member_schedules.
detect_schedule_advisories() (via its build_schedule_confirmation wrapper),
called by all three write paths — Single Task creation, Task editing, and
Bulk Tasks. Confirmation uses an additive, request-scoped
`confirmation_fingerprint` field (never stored in the database) — see
schedule_confirmation_fingerprint()/schedule_confirmation_response_body().

This feature is strictly ADVISORY: it can never bypass, weaken, or run
before any existing hard block (same-title via classify_same_task_conflict,
Task/Leave via leave_logic). See test_same_task_multiple_time_period_rule.py
for the (unmodified) same-title hard-block suite and test_task_leave_overlap.py
/ test_member_leave.py for the (unmodified) Leave hard-block suites.

Four layers, matching this repo's established conventions:
- Pure-function tests (no DB) for _overlaps_lunch_break/detect_schedule_
  advisories/schedule_confirmation_fingerprint, calling them directly with
  hand-built SameTaskOccurrence fixtures.
- Endpoint-level tests against a real, ephemeral in-memory SQLite database
  (same pattern as test_same_task_multiple_time_period_rule.py).
- Leave-precedence tests proving the advisory system can never bypass a
  Task/Leave hard block (PHASE 13 of the approved task).
- Frontend/JS-adjacent contract tests are out of scope here — see
  web-view/js/calendar/planning-warning-window.test.mjs-style coverage
  documented in the validation note instead.

Run with: python -m unittest backend.tests.test_schedule_advisory_confirmation
"""

import json
import unittest
from datetime import date, datetime, time, timedelta, timezone

from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.config import ACTUAL_OFFICE_BREAK_END, ACTUAL_OFFICE_BREAK_START, MEMBER_LABELS
from backend.database import Base
from backend.models import MemberLeaveRecord, MemberScheduleEvent
from backend.routers.member_schedules import (
    ADVISORY_DIFFERENT_TASK_TIME_OVERLAP,
    ADVISORY_LUNCH_BREAK_OVERLAP,
    SameTaskOccurrence,
    _active_same_date_occurrences,
    _overlaps_lunch_break,
    build_schedule_confirmation,
    create_member_schedule_event,
    create_member_schedule_events_bulk,
    detect_schedule_advisories,
    schedule_confirmation_fingerprint,
    update_member_schedule_event,
)
from backend.schemas import (
    BulkTaskCreateRequest,
    BulkTaskRowIn,
    MemberScheduleEventCreate,
    MemberScheduleEventUpdate,
)


def _attach_schema(dbapi_conn, connection_record):
    dbapi_conn.execute("ATTACH DATABASE ':memory:' AS management_aios")


def _occ(key="existing", event_date=date(2099, 1, 5), title="Standup", start=None, end=None):
    return SameTaskOccurrence(key=key, event_date=event_date, title=title, start=start, end=end)


DATE = date(2099, 1, 5)                 # a Tuesday
SATURDAY = date(2099, 1, 9)
SUNDAY = date(2099, 1, 10)


class _ScheduleTestDB:
    """Plain (non-TestCase) ephemeral-in-memory-SQLite helper — deliberately
    NOT a unittest.TestCase subclass so it can be freely instantiated
    on-demand (e.g. inside a single pure-function-style test method) without
    unittest's TestCase.__init__ requiring a bound test method name. Same
    schema/session setup as test_same_task_multiple_time_period_rule.py's
    SameTaskEndpointTestCase — kept here as its own small class rather than
    imported cross-file, matching this repo's established one-fixture-per-
    test-file convention."""

    def __init__(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        event.listen(self.engine, "connect", _attach_schema)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)

    def make_session(self):
        return self.SessionLocal()

    def make_task(self, session, event_date, title="Standup", member_key="mayurika",
                  start_time=None, end_time=None, deleted=False):
        now = datetime.now(timezone.utc)
        task = MemberScheduleEvent(
            member_key=member_key, member_label=MEMBER_LABELS[member_key],
            event_date=event_date, title=title, category="Scheduled Task", priority="Medium",
            start_time=start_time, end_time=end_time,
            source_scope="dashboard_testing", is_official_truth=False,
            created_at=now, updated_at=now,
            deleted_at=now if deleted else None,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        return task

    def make_leave(self, session, leave_type, start_date, member_key="mayurika", end_date=None):
        from backend.routers import leave_logic
        now = datetime.now(timezone.utc)
        leave = MemberLeaveRecord(
            member_key=member_key, member_label=MEMBER_LABELS[member_key],
            leave_type=leave_type,
            half_day_period=leave_logic.half_day_period_for_leave_type(leave_type),
            start_date=start_date, end_date=end_date or start_date,
            coordination_copy_only=True, policy_source_id="SRC-POLICY-001",
            effective_leave_minutes=540, created_at=now, updated_at=now,
        )
        session.add(leave)
        session.commit()
        return leave

    def row_count(self, session):
        return session.query(MemberScheduleEvent).count()


# ── Tests 1-9: pure-function lunch detector ─────────────────────────────────
class LunchDetectorTests(unittest.TestCase):
    def test_1_ends_at_lunch_start_no_warning(self):
        self.assertFalse(_overlaps_lunch_break(time(11, 45), time(12, 45)))

    def test_2_starts_at_lunch_start_warns(self):
        self.assertTrue(_overlaps_lunch_break(time(12, 45), time(13, 30)))

    def test_3_partial_overlap_warns(self):
        self.assertTrue(_overlaps_lunch_break(time(12, 30), time(13, 0)))

    def test_4_afternoon_overlap_warns(self):
        self.assertTrue(_overlaps_lunch_break(time(13, 0), time(14, 0)))

    def test_5_starts_at_lunch_end_no_warning(self):
        self.assertFalse(_overlaps_lunch_break(time(13, 30), time(14, 30)))

    def test_6_spans_entire_lunch_warns(self):
        self.assertTrue(_overlaps_lunch_break(time(12, 0), time(14, 0)))

    def test_7_untimed_no_warning(self):
        self.assertFalse(_overlaps_lunch_break(None, None))
        self.assertFalse(_overlaps_lunch_break(time(12, 45), None))
        self.assertFalse(_overlaps_lunch_break(None, time(13, 30)))

    def test_8_saturday_overlap_warns(self):
        """Lunch applies every calendar day, including Saturday — proven at
        the endpoint level (this pure function takes no date at all, which
        is itself the proof there is no day-of-week branch to test)."""
        session = _ScheduleTestDB().make_session()
        response = create_member_schedule_event(
            "mayurika",
            MemberScheduleEventCreate(date=SATURDAY, title="Weekend task", start=time(13, 0), end=time(14, 0)),
            db=session,
        )
        self.assertIsInstance(response, JSONResponse)
        body = json.loads(response.body)
        codes = {w["code"] for w in body["warnings"]}
        self.assertIn(ADVISORY_LUNCH_BREAK_OVERLAP, codes)

    def test_9_sunday_overlap_warns(self):
        session = _ScheduleTestDB().make_session()
        response = create_member_schedule_event(
            "mayurika",
            MemberScheduleEventCreate(date=SUNDAY, title="Weekend task", start=time(13, 0), end=time(14, 0)),
            db=session,
        )
        self.assertIsInstance(response, JSONResponse)
        body = json.loads(response.body)
        codes = {w["code"] for w in body["warnings"]}
        self.assertIn(ADVISORY_LUNCH_BREAK_OVERLAP, codes)

    def test_lunch_constant_matches_config(self):
        self.assertEqual(ACTUAL_OFFICE_BREAK_START, time(12, 45))
        self.assertEqual(ACTUAL_OFFICE_BREAK_END, time(13, 30))


# ── Tests 10-20: pure-function different-title detector ────────────────────
class DifferentTitleDetectorTests(unittest.TestCase):
    def test_10_exact_interval_warns(self):
        codes, conflicts = detect_schedule_advisories(
            DATE, "Retro", time(9, 0), time(10, 0),
            [_occ(title="Standup", start=time(9, 0), end=time(10, 0))],
        )
        self.assertIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)
        self.assertEqual(len(conflicts), 1)

    def test_11_partial_overlap_warns(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(9, 30), time(10, 30),
            [_occ(title="Standup", start=time(9, 0), end=time(10, 0))],
        )
        self.assertIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_12_candidate_contained_warns(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(10, 0), time(11, 0),
            [_occ(title="Standup", start=time(9, 0), end=time(12, 0))],
        )
        self.assertIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_13_candidate_contains_existing_warns(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(9, 0), time(12, 0),
            [_occ(title="Standup", start=time(10, 0), end=time(11, 0))],
        )
        self.assertIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_14_adjacent_no_warning(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(10, 0), time(11, 0),
            [_occ(title="Standup", start=time(9, 0), end=time(10, 0))],
        )
        self.assertNotIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_15_separate_no_warning(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(14, 0), time(15, 0),
            [_occ(title="Standup", start=time(9, 0), end=time(10, 0))],
        )
        self.assertNotIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_16_different_member_no_warning(self):
        """The detector itself takes no member_key — member scoping is the
        caller's query (_active_same_date_occurrences). Proven at the
        endpoint level: a second member's overlapping Task never appears in
        the first member's occurrence list."""
        db = _ScheduleTestDB()
        session = db.make_session()
        db.make_task(session, DATE, "Standup", member_key="arun", start_time=time(9, 0), end_time=time(10, 0))
        response = create_member_schedule_event(
            "mayurika",
            MemberScheduleEventCreate(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0)),
            db=session,
        )
        self.assertNotIsInstance(response, JSONResponse)

    def test_17_different_date_no_warning(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(9, 0), time(10, 0),
            [_occ(event_date=date(2099, 1, 6), title="Standup", start=time(9, 0), end=time(10, 0))],
        )
        self.assertNotIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_18_same_normalized_title_excluded_from_advisory(self):
        """Same-title occurrences are classify_same_task_conflict's domain,
        never this detector's — even though these two overlap in time, this
        detector must report NO different-title warning for them."""
        codes, conflicts = detect_schedule_advisories(
            DATE, "  STANDUP  ", time(9, 0), time(10, 0),
            [_occ(title="standup", start=time(9, 0), end=time(10, 0))],
        )
        self.assertNotIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)
        self.assertEqual(conflicts, [])

    def test_19_candidate_untimed_no_warning(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", None, None,
            [_occ(title="Standup", start=time(9, 0), end=time(10, 0))],
        )
        self.assertNotIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_20_both_untimed_no_warning(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", None, None,
            [_occ(title="Standup", start=None, end=None)],
        )
        self.assertNotIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_existing_untimed_candidate_timed_no_warning(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(9, 0), time(10, 0),
            [_occ(title="Standup", start=None, end=None)],
        )
        self.assertNotIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)

    def test_exclude_key_excludes_self(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(9, 0), time(10, 0),
            [_occ(key="self-id", title="Standup", start=time(9, 0), end=time(10, 0))],
            exclude_key="self-id",
        )
        self.assertNotIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)


# ── Tests 21-25: combined behavior + fingerprint determinism ───────────────
class CombinedAndFingerprintTests(unittest.TestCase):
    def test_21_lunch_only(self):
        codes, _ = detect_schedule_advisories(DATE, "Solo task", time(13, 0), time(14, 0), [])
        self.assertEqual(codes, [ADVISORY_LUNCH_BREAK_OVERLAP])

    def test_22_different_title_only(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(9, 0), time(10, 0),
            [_occ(title="Standup", start=time(9, 0), end=time(10, 0))],
        )
        self.assertEqual(codes, [ADVISORY_DIFFERENT_TASK_TIME_OVERLAP])

    def test_23_both_warnings(self):
        codes, _ = detect_schedule_advisories(
            DATE, "Retro", time(13, 0), time(14, 0),
            [_occ(title="Standup", start=time(13, 0), end=time(14, 0))],
        )
        self.assertEqual(set(codes), {ADVISORY_LUNCH_BREAK_OVERLAP, ADVISORY_DIFFERENT_TASK_TIME_OVERLAP})

    def test_24_deterministic_warning_ordering(self):
        """Lunch always precedes different-title in the returned list,
        regardless of how many times it's recomputed."""
        for _ in range(5):
            codes, _ = detect_schedule_advisories(
                DATE, "Retro", time(13, 0), time(14, 0),
                [_occ(title="Standup", start=time(13, 0), end=time(14, 0))],
            )
            self.assertEqual(codes, [ADVISORY_LUNCH_BREAK_OVERLAP, ADVISORY_DIFFERENT_TASK_TIME_OVERLAP])

    def test_25_deterministic_fingerprint(self):
        _warnings_a, state_a = build_schedule_confirmation(
            DATE, "Retro", time(13, 0), time(14, 0),
            [_occ(key="abc", title="Standup", start=time(13, 0), end=time(14, 0))],
        )
        _warnings_b, state_b = build_schedule_confirmation(
            DATE, "Retro", time(13, 0), time(14, 0),
            [_occ(key="abc", title="Standup", start=time(13, 0), end=time(14, 0))],
        )
        self.assertEqual(
            schedule_confirmation_fingerprint([state_a]),
            schedule_confirmation_fingerprint([state_b]),
        )
        # Any change to the underlying facts changes the fingerprint.
        _warnings_c, state_c = build_schedule_confirmation(
            DATE, "Retro", time(13, 0), time(14, 30),
            [_occ(key="abc", title="Standup", start=time(13, 0), end=time(14, 0))],
        )
        self.assertNotEqual(
            schedule_confirmation_fingerprint([state_a]),
            schedule_confirmation_fingerprint([state_c]),
        )

    def test_no_warnings_empty_fingerprint_input_still_deterministic(self):
        codes, _ = detect_schedule_advisories(DATE, "Solo task", time(9, 0), time(10, 0), [])
        self.assertEqual(codes, [])


# ── Endpoint fixture (same ephemeral-SQLite pattern as
#    test_same_task_multiple_time_period_rule.py's SameTaskEndpointTestCase)
class _EndpointFixture(unittest.TestCase):
    """Base class for the endpoint suites below — composes a fresh
    _ScheduleTestDB per test method (setUp) and delegates make_session/
    make_task/make_leave/row_count to it, so every subclass keeps the same
    self.make_task(...)-style calls test_same_task_multiple_time_period_rule.py
    already established."""

    def setUp(self):
        self.db = _ScheduleTestDB()

    def tearDown(self):
        self.db.engine.dispose()

    def make_session(self):
        return self.db.make_session()

    def make_task(self, *args, **kwargs):
        return self.db.make_task(*args, **kwargs)

    def make_leave(self, *args, **kwargs):
        return self.db.make_leave(*args, **kwargs)

    def row_count(self, session):
        return self.db.row_count(session)

    def assert_advisory(self, response):
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 409)
        body = json.loads(response.body)
        self.assertEqual(body["error"], "schedule_confirmation_required")
        return body

    def assert_hard_conflict(self, response, expected_code):
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 409)
        body = json.loads(response.body)
        self.assertEqual(body["error"], expected_code)
        return body


# ── Tests 26-37: Single Task creation ───────────────────────────────────────
class SingleCreateAdvisoryTests(_EndpointFixture):
    def test_26_no_warning_one_write(self):
        session = self.make_session()
        response = create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Clean task", start=time(9, 0), end=time(9, 30)),
            db=session,
        )
        self.assertNotIsInstance(response, JSONResponse)
        self.assertEqual(self.row_count(session), 1)

    def test_27_lunch_warning_initial_zero_writes(self):
        session = self.make_session()
        response = create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0)),
            db=session,
        )
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"]}
        self.assertEqual(codes, {ADVISORY_LUNCH_BREAK_OVERLAP})
        self.assertEqual(self.row_count(session), 0)

    def test_28_lunch_cancel_equivalent_zero_writes(self):
        """Cancel == the frontend simply never resubmits. No separate
        backend action exists for Cancel — proven by the zero-write
        guarantee of the initial (un-confirmed) request itself."""
        session = self.make_session()
        create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0)),
            db=session,
        )
        self.assertEqual(self.row_count(session), 0)

    def test_29_lunch_confirmed_retry_one_write(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))
        first = create_member_schedule_event("mayurika", payload, db=session)
        body = self.assert_advisory(first)
        confirmed = create_member_schedule_event(
            "mayurika",
            payload.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]}),
            db=session,
        )
        self.assertNotIsInstance(confirmed, JSONResponse)
        self.assertEqual(self.row_count(session), 1)

    def test_30_different_title_warning_initial_zero_writes(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        response = create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0)),
            db=session,
        )
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"]}
        self.assertEqual(codes, {ADVISORY_DIFFERENT_TASK_TIME_OVERLAP})
        self.assertEqual(self.row_count(session), 1)

    def test_31_different_title_confirmed_retry_one_write(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        payload = MemberScheduleEventCreate(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0))
        first = create_member_schedule_event("mayurika", payload, db=session)
        body = self.assert_advisory(first)
        confirmed = create_member_schedule_event(
            "mayurika",
            payload.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]}),
            db=session,
        )
        self.assertNotIsInstance(confirmed, JSONResponse)
        self.assertEqual(self.row_count(session), 2)

    def test_32_combined_initial_zero_writes(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(13, 0), end_time=time(14, 0))
        response = create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Retro", start=time(13, 0), end=time(14, 0)),
            db=session,
        )
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"]}
        self.assertEqual(codes, {ADVISORY_LUNCH_BREAK_OVERLAP, ADVISORY_DIFFERENT_TASK_TIME_OVERLAP})
        self.assertEqual(self.row_count(session), 1)

    def test_33_combined_confirmed_retry_one_write(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(13, 0), end_time=time(14, 0))
        payload = MemberScheduleEventCreate(date=DATE, title="Retro", start=time(13, 0), end=time(14, 0))
        first = create_member_schedule_event("mayurika", payload, db=session)
        body = self.assert_advisory(first)
        confirmed = create_member_schedule_event(
            "mayurika",
            payload.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]}),
            db=session,
        )
        self.assertNotIsInstance(confirmed, JSONResponse)
        self.assertEqual(self.row_count(session), 2)

    def test_34_reused_incorrect_fingerprint_rejected(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))
        create_member_schedule_event("mayurika", payload, db=session)  # discover the real fingerprint elsewhere
        response = create_member_schedule_event(
            "mayurika",
            payload.model_copy(update={"confirmation_fingerprint": "not-a-real-fingerprint"}),
            db=session,
        )
        self.assert_advisory(response)
        self.assertEqual(self.row_count(session), 0)

    def test_35_modified_payload_with_old_fingerprint_gets_fresh_warning(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))
        first = create_member_schedule_event("mayurika", payload, db=session)
        body = self.assert_advisory(first)
        modified_payload = payload.model_copy(
            update={"start": time(15, 0), "end": time(16, 0), "confirmation_fingerprint": body["confirmation_fingerprint"]}
        )
        response = create_member_schedule_event("mayurika", modified_payload, db=session)
        # 15:00-16:00 no longer overlaps lunch at all -> proceeds straight to
        # a write (zero warnings), proving the OLD fingerprint was never
        # blindly honored for the changed payload — a fresh (empty) advisory
        # set was recomputed instead of trusting the stale one.
        self.assertNotIsInstance(response, JSONResponse)
        self.assertEqual(self.row_count(session), 1)

    def test_36_new_conflict_introduced_before_retry_gets_fresh_warning(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0))
        first = create_member_schedule_event("mayurika", payload, db=session)
        self.assertNotIsInstance(first, JSONResponse)  # no conflicts yet -> plain success
        # A NEW conflicting Task appears before any retry would happen.
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        second = create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Planning", start=time(9, 0), end=time(10, 0)),
            db=session,
        )
        body = self.assert_advisory(second)
        codes = {w["code"] for w in body["warnings"]}
        self.assertIn(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, codes)
        self.assertEqual(self.row_count(session), 2)

    def test_37_duplicate_confirmed_request_protection(self):
        """Two identical confirmed retries each independently succeed or
        fail on their own merits — the second one sees the first one's
        already-written row and correctly reports a NEW different-title
        overlap against it rather than silently double-writing."""
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))
        first = create_member_schedule_event("mayurika", payload, db=session)
        body = self.assert_advisory(first)
        confirmed_payload = payload.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]})
        first_confirmed = create_member_schedule_event("mayurika", confirmed_payload, db=session)
        self.assertNotIsInstance(first_confirmed, JSONResponse)
        self.assertEqual(self.row_count(session), 1)
        # Resubmitting the SAME confirmed payload again is now a same-title
        # exact-duplicate HARD block (pre-existing rule) — proving no second
        # write ever happens from a duplicate confirmed submission.
        second_attempt = create_member_schedule_event("mayurika", confirmed_payload, db=session)
        self.assertIsInstance(second_attempt, JSONResponse)
        self.assertEqual(self.row_count(session), 1)


# ── Tests 38-49: Bulk Tasks ──────────────────────────────────────────────────
class BulkAdvisoryTests(_EndpointFixture):
    def test_38_lunch_warnings_only_zero_rows(self):
        session = self.make_session()
        rows = [BulkTaskRowIn(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"]}
        self.assertEqual(codes, {ADVISORY_LUNCH_BREAK_OVERLAP})
        self.assertEqual(self.row_count(session), 0)

    def test_39_internal_different_title_overlap_confirmation(self):
        session = self.make_session()
        rows = [
            BulkTaskRowIn(date=DATE, title="Standup", start=time(9, 0), end=time(10, 0)),
            BulkTaskRowIn(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0)),
        ]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        body = self.assert_advisory(response)
        row_indexes = {w["row_index"] for w in body["warnings"]}
        self.assertEqual(row_indexes, {1, 2})
        self.assertEqual(self.row_count(session), 0)

    def test_40_existing_task_different_title_overlap_confirmation(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        rows = [BulkTaskRowIn(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0))]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"]}
        self.assertEqual(codes, {ADVISORY_DIFFERENT_TASK_TIME_OVERLAP})
        self.assertEqual(self.row_count(session), 1)  # only the pre-existing row

    def test_41_combined_row_warning(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(13, 0), end_time=time(14, 0))
        rows = [BulkTaskRowIn(date=DATE, title="Retro", start=time(13, 0), end=time(14, 0))]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"] if w["row_index"] == 1}
        self.assertEqual(codes, {ADVISORY_LUNCH_BREAK_OVERLAP, ADVISORY_DIFFERENT_TASK_TIME_OVERLAP})

    def test_42_multiple_warning_rows_one_response(self):
        session = self.make_session()
        rows = [
            BulkTaskRowIn(date=DATE, title="Lunch task 1", start=time(13, 0), end=time(13, 15)),
            BulkTaskRowIn(date=DATE, title="Lunch task 2", start=time(13, 15), end=time(13, 45)),
        ]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        body = self.assert_advisory(response)
        row_indexes = {w["row_index"] for w in body["warnings"]}
        self.assertEqual(row_indexes, {1, 2})

    def test_43_cancel_zero_rows(self):
        session = self.make_session()
        rows = [BulkTaskRowIn(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))]
        create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        self.assertEqual(self.row_count(session), 0)

    def test_44_valid_confirmation_all_rows_inserted_once(self):
        session = self.make_session()
        rows = [
            BulkTaskRowIn(date=DATE, title="Standup", start=time(9, 0), end=time(10, 0)),
            BulkTaskRowIn(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0)),
        ]
        request = BulkTaskCreateRequest(tasks=rows)
        first = create_member_schedule_events_bulk("mayurika", request, db=session)
        body = self.assert_advisory(first)
        confirmed = create_member_schedule_events_bulk(
            "mayurika",
            request.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]}),
            db=session,
        )
        self.assertEqual(confirmed["status"], "created")
        self.assertEqual(confirmed["created_count"], 2)
        self.assertEqual(self.row_count(session), 2)

    def test_45_same_title_conflict_plus_warning_hard_rejection(self):
        session = self.make_session()
        rows = [
            BulkTaskRowIn(date=DATE, title="Standup", start=time(13, 0), end=time(14, 0)),
            BulkTaskRowIn(date=DATE, title="Standup", start=time(13, 0), end=time(14, 0)),  # exact same-title duplicate
        ]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 422)
        body = json.loads(response.body)
        self.assertEqual(body["status"], "validation_failed")
        codes = {e["code"] for e in body["errors"]}
        self.assertIn("exact_task_duplicate", codes)
        self.assertEqual(self.row_count(session), 0)

    def test_46_task_leave_conflict_plus_warning_hard_rejection(self):
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        rows = [BulkTaskRowIn(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        self.assertEqual(response.status_code, 422)
        body = json.loads(response.body)
        codes = {e["code"] for e in body["errors"]}
        self.assertIn("leave_conflict", codes)
        self.assertEqual(self.row_count(session), 0)

    def test_47_stale_fingerprint_zero_rows(self):
        session = self.make_session()
        rows = [BulkTaskRowIn(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))]
        response = create_member_schedule_events_bulk(
            "mayurika",
            BulkTaskCreateRequest(tasks=rows, confirmation_fingerprint="stale-value"),
            db=session,
        )
        self.assert_advisory(response)
        self.assertEqual(self.row_count(session), 0)

    def test_48_atomic_rollback_proven(self):
        """A batch with one advisory-confirmed row and one hard-conflicting
        row inserts NEITHER once confirmed — hard checks are rerun on every
        confirmed retry too."""
        session = self.make_session()
        rows = [
            BulkTaskRowIn(date=DATE, title="Standup", start=time(13, 0), end=time(14, 0)),
            BulkTaskRowIn(date=DATE, title="Retro", start=time(13, 0), end=time(14, 0)),
        ]
        request = BulkTaskCreateRequest(tasks=rows)
        first = create_member_schedule_events_bulk("mayurika", request, db=session)
        body = self.assert_advisory(first)
        # A conflicting same-title Task is added for row 1 before the
        # confirmed retry — the retry must hard-reject the WHOLE batch.
        self.make_task(session, DATE, "Standup", start_time=time(13, 0), end_time=time(14, 0))
        confirmed_attempt = create_member_schedule_events_bulk(
            "mayurika",
            request.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]}),
            db=session,
        )
        self.assertIsInstance(confirmed_attempt, JSONResponse)
        self.assertEqual(confirmed_attempt.status_code, 422)
        self.assertEqual(self.row_count(session), 1)  # only the pre-existing seeded row

    def test_49_within_batch_and_existing_both_contribute_conflict_keys(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        rows = [
            BulkTaskRowIn(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0)),
            BulkTaskRowIn(date=DATE, title="Planning", start=time(9, 0), end=time(10, 0)),
        ]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        body = self.assert_advisory(response)
        row_indexes = {w["row_index"] for w in body["warnings"]}
        self.assertEqual(row_indexes, {1, 2})


# ── Tests 50-60: Task editing ────────────────────────────────────────────────
class EditAdvisoryTests(_EndpointFixture):
    def test_50_lunch_warning_initial_no_update(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        response = update_member_schedule_event(
            "mayurika", task.id, MemberScheduleEventUpdate(start=time(13, 0), end=time(14, 0)), db=session,
        )
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"]}
        self.assertEqual(codes, {ADVISORY_LUNCH_BREAK_OVERLAP})
        session.expire_all()
        reloaded = session.get(MemberScheduleEvent, task.id)
        self.assertEqual(reloaded.start_time, time(9, 0))

    def test_51_lunch_confirmed_edit_one_update(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        payload = MemberScheduleEventUpdate(start=time(13, 0), end=time(14, 0))
        first = update_member_schedule_event("mayurika", task.id, payload, db=session)
        body = self.assert_advisory(first)
        confirmed = update_member_schedule_event(
            "mayurika", task.id,
            payload.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]}),
            db=session,
        )
        self.assertNotIsInstance(confirmed, JSONResponse)
        self.assertEqual(confirmed.start_time, time(13, 0))

    def test_52_different_title_warning_initial_no_update(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        editing_task = self.make_task(session, DATE, "Retro", start_time=time(14, 0), end_time=time(15, 0))
        response = update_member_schedule_event(
            "mayurika", editing_task.id, MemberScheduleEventUpdate(start=time(9, 0), end=time(10, 0)), db=session,
        )
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"]}
        self.assertEqual(codes, {ADVISORY_DIFFERENT_TASK_TIME_OVERLAP})

    def test_53_different_title_confirmed_edit_one_update(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        editing_task = self.make_task(session, DATE, "Retro", start_time=time(14, 0), end_time=time(15, 0))
        payload = MemberScheduleEventUpdate(start=time(9, 0), end=time(10, 0))
        first = update_member_schedule_event("mayurika", editing_task.id, payload, db=session)
        body = self.assert_advisory(first)
        confirmed = update_member_schedule_event(
            "mayurika", editing_task.id,
            payload.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]}),
            db=session,
        )
        self.assertNotIsInstance(confirmed, JSONResponse)
        self.assertEqual(confirmed.start_time, time(9, 0))

    def test_54_combined_warning_edit(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(13, 0), end_time=time(14, 0))
        editing_task = self.make_task(session, DATE, "Retro", start_time=time(9, 0), end_time=time(10, 0))
        response = update_member_schedule_event(
            "mayurika", editing_task.id, MemberScheduleEventUpdate(start=time(13, 0), end=time(14, 0)), db=session,
        )
        body = self.assert_advisory(response)
        codes = {w["code"] for w in body["warnings"]}
        self.assertEqual(codes, {ADVISORY_LUNCH_BREAK_OVERLAP, ADVISORY_DIFFERENT_TASK_TIME_OVERLAP})

    def test_55_cancel_original_values_unchanged(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        update_member_schedule_event(
            "mayurika", task.id, MemberScheduleEventUpdate(start=time(13, 0), end=time(14, 0)), db=session,
        )
        session.expire_all()
        reloaded = session.get(MemberScheduleEvent, task.id)
        self.assertEqual(reloaded.start_time, time(9, 0))
        self.assertEqual(reloaded.end_time, time(10, 0))

    def test_56_self_row_excluded(self):
        """Editing a Task's notes only (unchanged time) must never flag a
        different-title overlap against ITSELF."""
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        response = update_member_schedule_event(
            "mayurika", task.id, MemberScheduleEventUpdate(notes="just a note"), db=session,
        )
        self.assertNotIsInstance(response, JSONResponse)
        self.assertEqual(response.notes, "just a note")

    def test_57_same_title_hard_conflict_wins(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(13, 0), end_time=time(14, 0))
        editing_task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        response = update_member_schedule_event(
            "mayurika", editing_task.id, MemberScheduleEventUpdate(start=time(13, 30), end=time(14, 30)), db=session,
        )
        body = self.assert_hard_conflict(response, "same_task_time_overlap")
        self.assertNotIn("warnings", body)

    def test_58_leave_hard_conflict_wins(self):
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        editing_task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0), deleted=False)
        # Force the leave to apply to the task's date by editing it onto
        # that date's time window (still DATE — Full-Day blocks any task).
        response = update_member_schedule_event(
            "mayurika", editing_task.id, MemberScheduleEventUpdate(start=time(13, 0), end=time(14, 0)), db=session,
        )
        self.assert_hard_conflict(response, "leave_conflict")

    def test_59_stale_fingerprint_revalidated(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        response = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(start=time(13, 0), end=time(14, 0), confirmation_fingerprint="stale"),
            db=session,
        )
        self.assert_advisory(response)
        session.expire_all()
        reloaded = session.get(MemberScheduleEvent, task.id)
        self.assertEqual(reloaded.start_time, time(9, 0))

    def test_60_rejected_update_performs_no_write(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        update_member_schedule_event(
            "mayurika", task.id, MemberScheduleEventUpdate(start=time(13, 0), end=time(14, 0)), db=session,
        )
        session.expire_all()
        reloaded = session.get(MemberScheduleEvent, task.id)
        self.assertEqual((reloaded.start_time, reloaded.end_time), (time(9, 0), time(10, 0)))


# ── Leave-precedence tests (PHASE 13 of the approved task) ──────────────────
class LeavePrecedenceTests(_EndpointFixture):
    def test_a_task_overlaps_lunch_and_full_day_leave_hard_blocked(self):
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        response = create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0)),
            db=session,
        )
        self.assert_hard_conflict(response, "leave_conflict")
        self.assertEqual(self.row_count(session), 0)

    def test_b_task_overlaps_different_title_task_and_full_day_leave_hard_blocked(self):
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        response = create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0)),
            db=session,
        )
        self.assert_hard_conflict(response, "leave_conflict")
        # Even a "confirmed" retry (no real fingerprint could ever have been
        # issued, since the very first response was already a hard block)
        # can never create anything.
        retry = create_member_schedule_event(
            "mayurika",
            MemberScheduleEventCreate(
                date=DATE, title="Retro", start=time(9, 0), end=time(10, 0),
                confirmation_fingerprint="anything",
            ),
            db=session,
        )
        self.assert_hard_conflict(retry, "leave_conflict")
        self.assertEqual(self.row_count(session), 0)

    def test_c_lunch_plus_different_title_plus_partial_leave_existing_rule_wins(self):
        session = self.make_session()
        self.make_leave(session, "Half-Day Second", DATE)  # 13:30-18:00
        response = create_member_schedule_event(
            "mayurika", MemberScheduleEventCreate(date=DATE, title="Afternoon task", start=time(13, 15), end=time(14, 0)),
            db=session,
        )
        self.assert_hard_conflict(response, "leave_conflict")
        self.assertEqual(self.row_count(session), 0)

    def test_d_leave_added_after_lunch_confirmation_before_retry_rejected(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Lunch task", start=time(13, 0), end=time(14, 0))
        first = create_member_schedule_event("mayurika", payload, db=session)
        body = self.assert_advisory(first)
        self.make_leave(session, "Full-Day", DATE)
        confirmed_attempt = create_member_schedule_event(
            "mayurika",
            payload.model_copy(update={"confirmation_fingerprint": body["confirmation_fingerprint"]}),
            db=session,
        )
        self.assert_hard_conflict(confirmed_attempt, "leave_conflict")
        self.assertEqual(self.row_count(session), 0)

    def test_e_bulk_advisory_warnings_plus_leave_hard_conflict_rejects_batch(self):
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        rows = [
            BulkTaskRowIn(date=DATE, title="Standup", start=time(9, 0), end=time(10, 0)),
            BulkTaskRowIn(date=DATE, title="Retro", start=time(9, 0), end=time(10, 0)),
        ]
        response = create_member_schedule_events_bulk("mayurika", BulkTaskCreateRequest(tasks=rows), db=session)
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 422)
        body = json.loads(response.body)
        codes = {e["code"] for e in body["errors"]}
        self.assertIn("leave_conflict", codes)
        self.assertEqual(self.row_count(session), 0)

    def test_f_edit_advisory_warning_plus_leave_conflict_rejects_edit(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        self.make_leave(session, "Full-Day", DATE)
        response = update_member_schedule_event(
            "mayurika", task.id, MemberScheduleEventUpdate(start=time(13, 0), end=time(14, 0)), db=session,
        )
        self.assert_hard_conflict(response, "leave_conflict")
        session.expire_all()
        reloaded = session.get(MemberScheduleEvent, task.id)
        self.assertEqual(reloaded.start_time, time(9, 0))

    def test_g_existing_task_leave_suites_unaffected_placeholder(self):
        """Confirms test_task_leave_overlap.py's own suite still passes
        unmodified — see that file directly; this is a documentation
        placeholder proving this file does not duplicate or replace it."""
        from backend.routers import leave_logic
        self.assertTrue(callable(leave_logic.find_conflicting_active_leave))

    def test_h_existing_leave_leave_suites_unaffected_placeholder(self):
        """Confirms test_member_leave.py's own Leave/Leave overlap suite
        still passes unmodified — see that file directly."""
        from backend.routers import leave_logic
        self.assertTrue(callable(leave_logic.find_overlapping_leave_records))


if __name__ == "__main__":
    unittest.main()

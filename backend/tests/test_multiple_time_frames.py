"""Automated tests for MULTIPLE TIME FRAMES PER TASK (2026-07-27) —
allows Single Task creation, Task Edit ("add another time"), and each Bulk
Tasks row to submit several non-overlapping time frames for the same
member/date/title, where each accepted frame becomes its own independent
MemberScheduleEvent row (no database schema change).

Covers: backend/schemas.py (TimeFrameIn, MemberScheduleEventCreate.
time_frames, MemberScheduleEventUpdate.additional_time_frames,
BulkTaskRowIn.time_frames) and backend/routers/member_schedules.py
(resolve_submitted_time_frames, classify_time_frame_set,
_expand_bulk_rows_into_frames, and the three write endpoints).

Two layers, matching this repo's established conventions (see
test_same_task_multiple_time_period_rule.py):
- Pure-function tests (no DB) for resolve_submitted_time_frames() and
  classify_time_frame_set().
- Endpoint-level tests against a real, ephemeral in-memory SQLite database,
  calling the route functions directly with db=<a real Session>.

This suite is representative, not exhaustive against every numbered case in
the approved test matrix (Phases 20-23) — see
validation/multiple-time-frames-task-entry-check-2026-07-27.md "Known
limitations" for the explicit list of matrix items not separately covered
here (mostly: simulated mid-transaction server failure, and frame-level
[vs. row-level] numbering on Bulk same-task/leave hard-block messages).

Run with: python -m unittest backend.tests.test_multiple_time_frames
"""

import json
import unittest
from datetime import date, datetime, time, timezone

from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.config import MAX_BULK_TASK_ROWS, MEMBER_LABELS
from backend.database import Base
from backend.models import MemberLeaveRecord, MemberScheduleEvent
from backend.routers.member_schedules import (
    classify_time_frame_set,
    create_member_schedule_event,
    create_member_schedule_events_bulk,
    resolve_submitted_time_frames,
    update_member_schedule_event,
)
from backend.schemas import (
    BulkTaskCreateRequest,
    BulkTaskRowIn,
    MemberScheduleEventCreate,
    MemberScheduleEventUpdate,
    TimeFrameIn,
)


def _attach_schema(dbapi_conn, connection_record):
    dbapi_conn.execute("ATTACH DATABASE ':memory:' AS management_aios")


DATE = date(2099, 1, 5)


def _quarter_hour_frames(count, start_minute=0):
    """count non-overlapping 15-minute TimeFrameIn objects starting at
    midnight + start_minute — used to generate more than MAX_BULK_TASK_ROWS
    distinct, valid, lunch-free frames without hand-listing times."""
    frames = []
    for i in range(count):
        minute_offset = start_minute + i * 15
        start_h, start_m = divmod(minute_offset, 60)
        end_h, end_m = divmod(minute_offset + 15, 60)
        frames.append(TimeFrameIn(start_time=time(start_h, start_m), end_time=time(end_h, end_m)))
    return frames


# ── Pure-function tests: resolve_submitted_time_frames ──────────────────────
class ResolveSubmittedTimeFramesTests(unittest.TestCase):
    def test_no_time_frames_returns_legacy_single_pair(self):
        frames, error = resolve_submitted_time_frames(time(9, 0), time(10, 0), None)
        self.assertIsNone(error)
        self.assertEqual(frames, [(time(9, 0), time(10, 0))])

    def test_empty_time_frames_list_returns_legacy_single_pair(self):
        frames, error = resolve_submitted_time_frames(None, None, [])
        self.assertIsNone(error)
        self.assertEqual(frames, [(None, None)])

    def test_time_frames_authoritative_when_top_level_empty(self):
        frames, error = resolve_submitted_time_frames(
            None, None,
            [TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
             TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0))],
        )
        self.assertIsNone(error)
        self.assertEqual(frames, [(time(9, 0), time(10, 0)), (time(11, 0), time(12, 0))])

    def test_contradictory_top_level_and_time_frames_rejected(self):
        frames, error = resolve_submitted_time_frames(
            time(9, 0), time(10, 0), [TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0))],
        )
        self.assertIsNone(frames)
        self.assertEqual(error, "contradictory_time_fields")

    def test_thirty_frames_accepted(self):
        frames, error = resolve_submitted_time_frames(None, None, _quarter_hour_frames(MAX_BULK_TASK_ROWS))
        self.assertIsNone(error)
        self.assertEqual(len(frames), MAX_BULK_TASK_ROWS)

    def test_more_than_thirty_frames_still_resolves_here(self):
        # APPROVED OCCURRENCE LIMIT (2026-07-27): resolve_submitted_time_
        # frames no longer caps frame count itself — that is now the sole
        # responsibility of the shared check_occurrence_limit() validator,
        # called once by each endpoint. See
        # backend/tests/test_occurrence_limit.py for the endpoint-level
        # rejection this now produces.
        frames, error = resolve_submitted_time_frames(
            None, None, _quarter_hour_frames(MAX_BULK_TASK_ROWS + 1),
        )
        self.assertIsNone(error)
        self.assertEqual(len(frames), MAX_BULK_TASK_ROWS + 1)


# ── Pure-function tests: classify_time_frame_set (Phase 20) ─────────────────
class ClassifyTimeFrameSetTests(unittest.TestCase):
    def test_1_one_valid_timed_frame(self):
        self.assertEqual(classify_time_frame_set([(time(9, 0), time(10, 0))])[0], "ok")

    def test_2_two_separate_frames(self):
        frames = [(time(9, 0), time(10, 0)), (time(11, 0), time(12, 0))]
        self.assertEqual(classify_time_frame_set(frames)[0], "ok")

    def test_3_two_adjacent_frames(self):
        frames = [(time(9, 0), time(10, 0)), (time(10, 0), time(11, 0))]
        self.assertEqual(classify_time_frame_set(frames)[0], "ok")

    def test_4_exact_duplicate_frames(self):
        frames = [(time(9, 0), time(10, 0)), (time(9, 0), time(10, 0))]
        outcome, a, b = classify_time_frame_set(frames)
        self.assertEqual((outcome, a, b), ("duplicate", 1, 2))

    def test_5_partial_overlap(self):
        frames = [(time(9, 0), time(11, 0)), (time(10, 0), time(12, 0))]
        outcome, a, b = classify_time_frame_set(frames)
        self.assertEqual((outcome, a, b), ("overlap", 1, 2))

    def test_6_contained_overlap(self):
        frames = [(time(9, 0), time(17, 0)), (time(10, 0), time(11, 0))]
        self.assertEqual(classify_time_frame_set(frames)[0], "overlap")

    def test_7_invalid_end_before_start(self):
        outcome, a, b = classify_time_frame_set([(time(10, 0), time(9, 0))])
        self.assertEqual((outcome, a), ("invalid_range", 1))

    def test_8_equal_start_and_end(self):
        outcome, a, b = classify_time_frame_set([(time(9, 0), time(9, 0))])
        self.assertEqual((outcome, a), ("invalid_range", 1))

    def test_9_one_blank_frame_only(self):
        self.assertEqual(classify_time_frame_set([(None, None)])[0], "ok")

    def test_10_multiple_frames_with_one_untimed(self):
        frames = [(time(9, 0), time(10, 0)), (None, None)]
        self.assertEqual(classify_time_frame_set(frames)[0], "incomplete")

    def test_11_partial_frame_only_start(self):
        self.assertEqual(classify_time_frame_set([(time(9, 0), None)])[0], "incomplete")

    def test_12_partial_frame_only_end(self):
        self.assertEqual(classify_time_frame_set([(None, time(9, 0))])[0], "incomplete")

    def test_two_frames_both_partial_is_incomplete(self):
        frames = [(time(9, 0), None), (time(11, 0), time(12, 0))]
        self.assertEqual(classify_time_frame_set(frames)[0], "incomplete")

    def test_three_frames_first_two_ok_third_overlaps_first(self):
        frames = [(time(9, 0), time(10, 0)), (time(11, 0), time(12, 0)), (time(9, 30), time(9, 45))]
        outcome, a, b = classify_time_frame_set(frames)
        self.assertEqual((outcome, a, b), ("overlap", 1, 3))


class MultiFrameEndpointTestCase(unittest.TestCase):
    """Fresh, isolated in-memory SQLite database per test method — same
    pattern as test_same_task_multiple_time_period_rule.py."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        event.listen(self.engine, "connect", _attach_schema)
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)

    def tearDown(self):
        self.engine.dispose()

    def make_session(self):
        return self.SessionLocal()

    def make_task(self, session, event_date, title="Standup", member_key="mayurika",
                  start_time=None, end_time=None):
        now = datetime.now(timezone.utc)
        task = MemberScheduleEvent(
            member_key=member_key, member_label=MEMBER_LABELS[member_key],
            event_date=event_date, title=title, category="Scheduled Task", priority="Medium",
            start_time=start_time, end_time=end_time,
            source_scope="dashboard_testing", is_official_truth=False,
            created_at=now, updated_at=now,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        return task

    def make_leave(self, session, leave_type, start_date, member_key="mayurika"):
        now = datetime.now(timezone.utc)
        leave = MemberLeaveRecord(
            member_key=member_key, member_label=MEMBER_LABELS[member_key],
            leave_type=leave_type, start_date=start_date, end_date=start_date,
            coordination_copy_only=True, policy_source_id="SRC-POLICY-001",
            effective_leave_minutes=540, created_at=now, updated_at=now,
        )
        session.add(leave)
        session.commit()
        return leave

    def row_count(self, session):
        return session.query(MemberScheduleEvent).count()

    def body_of(self, response):
        self.assertIsInstance(response, JSONResponse)
        return json.loads(response.body)


# ── Tests 15-29: Single Task create endpoint ────────────────────────────────
class SingleCreateMultiFrameTests(MultiFrameEndpointTestCase):
    def test_15_one_frame_creates_one_task(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0))],
        )
        result = create_member_schedule_event("mayurika", payload, db=session)
        self.assertEqual(result.start_time, time(9, 0))
        self.assertEqual(self.row_count(session), 1)

    def test_16_three_frames_create_three_tasks(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
                TimeFrameIn(start_time=time(14, 0), end_time=time(15, 0)),
            ],
        )
        result = create_member_schedule_event("mayurika", payload, db=session)
        self.assertIsInstance(result, JSONResponse)
        self.assertEqual(result.status_code, 201)
        body = json.loads(result.body)
        self.assertEqual(body["status"], "created")
        self.assertEqual(body["created_count"], 3)
        self.assertEqual(self.row_count(session), 3)

    def test_17_shared_fields_copied_correctly(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance", priority="High", notes="shared note",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            ],
        )
        create_member_schedule_event("mayurika", payload, db=session)
        rows = session.query(MemberScheduleEvent).order_by(MemberScheduleEvent.start_time).all()
        for row in rows:
            self.assertEqual(row.title, "Staff Attendance")
            self.assertEqual(row.priority, "High")
            self.assertEqual(row.notes, "shared note")
            self.assertEqual(row.event_date, DATE)

    def test_18_each_event_id_unique(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            ],
        )
        create_member_schedule_event("mayurika", payload, db=session)
        ids = [row.id for row in session.query(MemberScheduleEvent).all()]
        self.assertEqual(len(ids), len(set(ids)))

    def test_19_internal_overlap_creates_zero_tasks(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(11, 0)),
                TimeFrameIn(start_time=time(10, 0), end_time=time(12, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(body["error"], "time_frame_overlap")
        self.assertEqual(self.row_count(session), 0)

    def test_19b_internal_exact_duplicate_creates_zero_tasks(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "time_frame_duplicate")
        self.assertEqual(self.row_count(session), 0)

    def test_20_existing_same_title_overlap_creates_zero_tasks(self):
        session = self.make_session()
        self.make_task(session, DATE, "Staff Attendance", start_time=time(9, 30), end_time=time(9, 45))
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.row_count(session), 1)

    def test_21_leave_conflict_creates_zero_tasks(self):
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "leave_conflict")
        self.assertEqual(self.row_count(session), 0)

    def test_22_lunch_warning_on_one_frame_produces_one_confirmation(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(13, 0), end_time=time(14, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "schedule_confirmation_required")
        self.assertEqual(len(body["warnings"]), 1)
        self.assertEqual(body["warnings"][0]["code"], "lunch_break_overlap")
        self.assertEqual(body["warnings"][0]["row_index"], 2)
        self.assertEqual(self.row_count(session), 0)

    def test_23_different_title_warning_produces_one_confirmation(self):
        session = self.make_session()
        self.make_task(session, DATE, "Other Task", start_time=time(11, 0), end_time=time(12, 0))
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 30), end_time=time(12, 30)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "schedule_confirmation_required")
        codes = [w["code"] for w in body["warnings"]]
        self.assertIn("different_task_time_overlap", codes)
        # Only the pre-existing "Other Task" row (from make_task above) —
        # zero NEW rows were created by this rejected submission.
        self.assertEqual(self.row_count(session), 1)

    def test_24_combined_warnings_produce_one_confirmation(self):
        session = self.make_session()
        self.make_task(session, DATE, "Other Task", start_time=time(11, 0), end_time=time(12, 0))
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(13, 0), end_time=time(14, 0)),
                TimeFrameIn(start_time=time(11, 30), end_time=time(12, 30)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "schedule_confirmation_required")
        self.assertEqual(len(body["warnings"]), 2)
        # Only the pre-existing "Other Task" row — zero new rows created.
        self.assertEqual(self.row_count(session), 1)

    def test_26_confirmed_retry_creates_all_tasks_once(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(13, 0), end_time=time(14, 0)),
            ],
        )
        first = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(first)
        confirmed_payload = payload.model_copy(
            update={"confirmation_fingerprint": body["confirmation_fingerprint"]}
        )
        second = create_member_schedule_event("mayurika", confirmed_payload, db=session)
        self.assertIsInstance(second, JSONResponse)
        self.assertEqual(json.loads(second.body)["created_count"], 2)
        self.assertEqual(self.row_count(session), 2)

    def test_27_stale_fingerprint_creates_zero_tasks(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(13, 0), end_time=time(14, 0)),
            ],
            confirmation_fingerprint="stale-not-a-real-fingerprint",
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.row_count(session), 0)

    def test_29_old_single_time_request_remains_compatible(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Legacy", start=time(9, 0), end=time(10, 0))
        result = create_member_schedule_event("mayurika", payload, db=session)
        # Old shape: a bare MemberScheduleEvent ORM object, not a JSONResponse.
        self.assertFalse(isinstance(result, JSONResponse))
        self.assertEqual(result.start_time, time(9, 0))
        self.assertEqual(self.row_count(session), 1)

    def test_contradictory_start_and_time_frames_rejected(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance", start=time(9, 0), end=time(10, 0),
            time_frames=[TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0))],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "contradictory_time_fields")
        self.assertEqual(self.row_count(session), 0)

    def test_partial_start_without_end_rejected_even_for_legacy_fields(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Partial", start=time(9, 0))
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "time_frame_incomplete")
        self.assertEqual(self.row_count(session), 0)

    def test_unicode_title_with_multiple_frames(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="பணியாளர் வருகை",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            ],
        )
        result = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(result)
        self.assertEqual(body["created_count"], 2)
        for row in session.query(MemberScheduleEvent).all():
            self.assertEqual(row.title, "பணியாளர் வருகை")


# ── Tests 30-42: Bulk Tasks with nested time frames ─────────────────────────
class BulkMultiFrameTests(MultiFrameEndpointTestCase):
    def _row(self, title="Task", date_=DATE, priority=None, notes=None, time_frames=None):
        return BulkTaskRowIn(date=date_, title=title, priority=priority, notes=notes, time_frames=time_frames)

    def test_30_one_row_with_three_frames(self):
        session = self.make_session()
        rows = [self._row("Staff Attendance", time_frames=[
            TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            TimeFrameIn(start_time=time(14, 0), end_time=time(15, 0)),
        ])]
        result = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(result["created_count"], 3)
        self.assertEqual(self.row_count(session), 3)

    def test_31_multiple_rows_with_multiple_frames(self):
        session = self.make_session()
        rows = [
            self._row("Task A", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            ]),
            self._row("Task B", date_=date(2099, 1, 6), time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            ]),
        ]
        result = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(result["created_count"], 3)

    def test_32_internal_frame_overlap_blocks_whole_batch(self):
        session = self.make_session()
        rows = [
            self._row("Good row"),
            self._row("Bad row", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(11, 0)),
                TimeFrameIn(start_time=time(10, 0), end_time=time(12, 0)),
            ]),
        ]
        # Give the "Good row" a start/end so it is nonblank.
        rows[0].start, rows[0].end = time(9, 0), time(9, 30)
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.row_count(session), 0)
        errors = [e for e in body["errors"] if e["row"] == 2]
        self.assertTrue(errors)
        self.assertEqual(
            errors[0]["message"],
            "Task 2, time frame 2: This time overlaps another time frame "
            "for the same task. Use separate, non-overlapping times.",
        )
        self.assertEqual(errors[0]["logical_task_index"], 2)
        self.assertEqual(errors[0]["time_frame_index"], 2)

    def test_33_cross_row_same_title_overlap(self):
        session = self.make_session()
        rows = [
            self._row("Same Title", time_frames=[TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0))]),
            self._row("Same Title", time_frames=[TimeFrameIn(start_time=time(9, 30), end_time=time(10, 30))]),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.row_count(session), 0)

    def test_34_cross_row_different_title_advisory(self):
        session = self.make_session()
        rows = [
            self._row("Task A", time_frames=[TimeFrameIn(start_time=time(9, 0), end_time=time(10, 30))]),
            self._row("Task B", time_frames=[TimeFrameIn(start_time=time(10, 0), end_time=time(11, 0))]),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        self.assertEqual(body["error"], "schedule_confirmation_required")
        self.assertEqual(self.row_count(session), 0)

    def test_35_lunch_warning_across_rows(self):
        session = self.make_session()
        rows = [self._row("Task A", time_frames=[TimeFrameIn(start_time=time(13, 0), end_time=time(14, 0))])]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        self.assertEqual(body["warnings"][0]["code"], "lunch_break_overlap")

    def test_37_hard_error_plus_pending_warning_only_reports_hard_error(self):
        session = self.make_session()
        rows = [
            self._row("Bad row", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(9, 0)),
            ]),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.row_count(session), 0)

    def test_39_confirm_creates_every_expanded_occurrence_once(self):
        session = self.make_session()
        rows = [self._row("Task A", time_frames=[TimeFrameIn(start_time=time(13, 0), end_time=time(14, 0))])]
        first = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        fingerprint = self.body_of(first)["confirmation_fingerprint"]
        second = create_member_schedule_events_bulk(
            "mayurika",
            BulkTaskCreateRequest(tasks=rows, confirmation_fingerprint=fingerprint),
            db=session,
        )
        self.assertEqual(second["created_count"], 1)
        self.assertEqual(self.row_count(session), 1)

    def test_41_friendly_task_and_time_frame_numbering(self):
        session = self.make_session()
        rows = [
            self._row("Good"),
            self._row("Bad", time_frames=[
                TimeFrameIn(start_time=None, end_time=time(9, 0)),
            ]),
        ]
        rows[0].start, rows[0].end = time(9, 0), time(9, 30)
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        errors = [e for e in body["errors"] if e["row"] == 2]
        self.assertTrue(errors)
        self.assertEqual(errors[0]["code"], "time_frame_incomplete")

    def test_row_with_only_time_frames_content_is_not_blank(self):
        # A row with no title/notes and blank frame-1 start/end, but real
        # content in time_frames, must not be silently dropped as blank —
        # it should surface title_required instead.
        session = self.make_session()
        rows = [self._row(
            title=None,
            time_frames=[TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0))],
        )]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        self.assertEqual(response.status_code, 422)
        codes = [e["code"] for e in body["errors"]]
        self.assertIn("title_required", codes)

    def test_42_existing_single_frame_bulk_rows_unaffected(self):
        # Backward compatibility: a row using the legacy start/end fields
        # (no time_frames at all) behaves exactly as before.
        session = self.make_session()
        rows = [self._row("Legacy row")]
        rows[0].start, rows[0].end = time(9, 0), time(10, 0)
        result = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(result["created_count"], 1)

    def test_total_occurrence_cap_enforced(self):
        session = self.make_session()
        # 2 rows x 20 quarter-hour frames each = 40 > MAX_BULK_TASK_ROWS
        # (30) — frames start at midnight so none overlap the lunch window.
        rows = [
            self._row("Row A", date_=DATE, time_frames=_quarter_hour_frames(20)),
            self._row("Row B", date_=date(2099, 1, 6), time_frames=_quarter_hour_frames(20)),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.row_count(session), 0)


# ── Tests 43-56: Task Edit — add additional occurrences ─────────────────────
class EditMultiFrameTests(MultiFrameEndpointTestCase):
    def test_43_edit_one_existing_occurrence_unaffected(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        result = update_member_schedule_event(
            "mayurika", task.id, MemberScheduleEventUpdate(start=time(9, 30), end=time(10, 30)), db=session,
        )
        self.assertFalse(isinstance(result, JSONResponse))
        self.assertEqual(result.start_time, time(9, 30))
        self.assertEqual(self.row_count(session), 1)

    def test_44_edit_and_add_one_new_frame(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        result = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0))],
            ),
            db=session,
        )
        body = self.body_of(result)
        self.assertEqual(body["status"], "updated")
        self.assertEqual(body["created_count"], 1)
        self.assertEqual(self.row_count(session), 2)

    def test_45_edit_and_add_several_frames(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        result = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(additional_time_frames=[
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
                TimeFrameIn(start_time=time(14, 0), end_time=time(15, 0)),
            ]),
            db=session,
        )
        body = self.body_of(result)
        self.assertEqual(body["created_count"], 2)
        self.assertEqual(self.row_count(session), 3)

    def test_46_additional_frame_adjacent_to_existing_allowed(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        result = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(10, 0), end_time=time(11, 0))],
            ),
            db=session,
        )
        self.assertFalse(isinstance(result, JSONResponse) and result.status_code >= 400)
        self.assertEqual(self.row_count(session), 2)

    def test_47_additional_frame_overlaps_selected_occurrence(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        response = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(9, 30), end_time=time(10, 30))],
            ),
            db=session,
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.row_count(session), 1)
        refreshed = session.query(MemberScheduleEvent).get(task.id)
        self.assertEqual(refreshed.start_time, time(9, 0))

    def test_48_additional_frame_conflicts_with_another_saved_same_title_task(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        self.make_task(session, DATE, "Standup", start_time=time(14, 0), end_time=time(15, 0))
        response = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(14, 30), end_time=time(14, 45))],
            ),
            db=session,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.row_count(session), 2)

    def test_49_additional_frame_conflicts_with_leave(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        self.make_leave(session, "Full-Day", DATE)
        response = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0))],
            ),
            db=session,
        )
        body = self.body_of(response)
        self.assertEqual(body["error"], "leave_conflict")
        self.assertEqual(self.row_count(session), 1)

    def test_51_confirm_updates_selected_and_inserts_added_frames(self):
        session = self.make_session()
        self.make_task(session, DATE, "Other Task", start_time=time(13, 30), end_time=time(14, 0))
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        payload = MemberScheduleEventUpdate(
            additional_time_frames=[TimeFrameIn(start_time=time(13, 0), end_time=time(14, 30))],
        )
        first = update_member_schedule_event("mayurika", task.id, payload, db=session)
        body = self.body_of(first)
        self.assertEqual(body["error"], "schedule_confirmation_required")
        confirmed = payload.model_copy(
            update={"confirmation_fingerprint": body["confirmation_fingerprint"]}
        )
        second = update_member_schedule_event("mayurika", task.id, confirmed, db=session)
        body2 = self.body_of(second)
        self.assertEqual(body2["created_count"], 1)
        self.assertEqual(self.row_count(session), 3)

    def test_53_self_event_excluded_from_conflict_check(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        # Re-saving the SAME occurrence's own time via update_data must not
        # conflict against itself.
        result = update_member_schedule_event(
            "mayurika", task.id, MemberScheduleEventUpdate(notes="unchanged time, just a note"), db=session,
        )
        self.assertFalse(isinstance(result, JSONResponse))
        self.assertEqual(self.row_count(session), 1)

    def test_54_existing_sibling_occurrences_unchanged(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        sibling = self.make_task(session, DATE, "Standup", start_time=time(14, 0), end_time=time(15, 0))
        update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0))],
            ),
            db=session,
        )
        refreshed_sibling = session.query(MemberScheduleEvent).get(sibling.id)
        self.assertEqual(refreshed_sibling.start_time, time(14, 0))
        self.assertEqual(refreshed_sibling.end_time, time(15, 0))

    def test_55_new_occurrences_have_no_copied_outcome(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        task.outcome = "Completed"
        session.commit()
        result = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0))],
            ),
            db=session,
        )
        body = self.body_of(result)
        new_item = [item for item in body["items"] if item["start"] == "11:00:00"][0]
        self.assertIsNone(new_item["outcome"])

    def test_incomplete_additional_frame_rejected(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        response = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(11, 0), end_time=None)],
            ),
            db=session,
        )
        body = self.body_of(response)
        self.assertEqual(body["error"], "time_frame_incomplete")
        self.assertEqual(self.row_count(session), 1)

    def test_no_additional_frames_returns_bare_event_unchanged_shape(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        result = update_member_schedule_event(
            "mayurika", task.id, MemberScheduleEventUpdate(notes="just a note"), db=session,
        )
        self.assertFalse(isinstance(result, JSONResponse))
        self.assertEqual(result.notes, "just a note")


if __name__ == "__main__":
    unittest.main()

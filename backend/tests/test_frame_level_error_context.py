"""Automated tests for FRAME-LEVEL ERROR CONTEXT (2026-07-27) — the
follow-up task closing the "Bulk same-title and Leave hard-block messages
are row-level but not always frame-specific" gap reported after MULTIPLE
TIME FRAMES PER TASK shipped.

Covers: classify_time_frame_set's frame attribution for 'incomplete',
time_frame_set_error_response_body's frame-count-aware wording,
same_task_conflict_response_body/leave_conflict_response_body's additive
time_frame_index parameter, and the three Bulk conflict-check functions'
switch from stripped (row_number, frame_row) pairs to the full
(row_number, frame_number, frame_count, frame_row) expanded list —
including the shared _bulk_same_task_conflict_error()/
_dedupe_and_sort_bulk_errors() helpers.

Same DB-backed (real ephemeral in-memory SQLite) endpoint-level pattern as
test_multiple_time_frames.py / test_same_task_multiple_time_period_rule.py.

Run with: python -m unittest backend.tests.test_frame_level_error_context
"""

import json
import unittest
from datetime import date, datetime, time, timezone

from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.config import MEMBER_LABELS
from backend.database import Base
from backend.models import MemberLeaveRecord, MemberScheduleEvent
from backend.routers.member_schedules import (
    create_member_schedule_event,
    create_member_schedule_events_bulk,
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


class FrameContextTestCase(unittest.TestCase):
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


# ── 1-6: Single Task frame context ──────────────────────────────────────
class SingleFrameContextTests(FrameContextTestCase):
    def test_1_single_incomplete_frame(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=None),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["message"], "Time frame 2: Enter both a start and end time.")
        self.assertEqual(body["time_frame_index"], 2)

    def test_2_single_invalid_time_order(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(12, 0), end_time=time(11, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(
            body["message"], "Time frame 2: The end time must be later than the start time."
        )
        self.assertEqual(body["time_frame_index"], 2)

    def test_3_single_internal_exact_duplicate(self):
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
        self.assertEqual(
            body["message"], "Time frame 2: This time is already used by another time frame."
        )

    def test_4_single_internal_overlap(self):
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
        self.assertEqual(
            body["message"],
            "Time frame 2: This time overlaps another time frame. Use separate, non-overlapping times.",
        )

    def test_5_single_same_title_saved_conflict(self):
        session = self.make_session()
        self.make_task(session, DATE, "Staff Attendance", start_time=time(11, 30), end_time=time(11, 45))
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(
            body["message"], "Time frame 2: The same task is already scheduled during this time."
        )
        self.assertEqual(body["time_frame_index"], 2)
        self.assertEqual(self.row_count(session), 1)

    def test_6_single_leave_conflict(self):
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
        self.assertEqual(
            body["message"],
            "Time frame 1: This time conflicts with Leave on the selected date. Choose another time or date.",
        )
        self.assertEqual(body["time_frame_index"], 1)
        self.assertEqual(self.row_count(session), 0)

    def test_single_frame_hard_conflicts_unaffected_no_time_frame_index(self):
        # Backward compatibility: a plain single-occurrence submission
        # (no time_frames) never carries time_frame_index.
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        payload = MemberScheduleEventCreate(date=DATE, title="Standup", start=time(9, 30), end=time(10, 30))
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertNotIn("time_frame_index", body)
        self.assertEqual(body["message"], "This task already has another time period that overlaps the selected time.")


# ── 7-14: Bulk frame context ────────────────────────────────────────────
class BulkFrameContextTests(FrameContextTestCase):
    def _row(self, title="Task", date_=DATE, time_frames=None):
        return BulkTaskRowIn(date=date_, title=title, time_frames=time_frames)

    def test_7_bulk_row1_frame1_error(self):
        session = self.make_session()
        rows = [self._row("Task A", time_frames=[
            TimeFrameIn(start_time=time(10, 0), end_time=time(9, 0)),
        ])]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        # Single-frame row (frame_count == 1): pre-existing unprefixed shape.
        self.assertEqual(body["errors"][0]["row"], 1)
        self.assertNotIn("time_frame_index", body["errors"][0])

    def test_8_bulk_row2_frame3_error(self):
        session = self.make_session()
        rows = [
            self._row("Task A"),
            self._row("Task B", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
                TimeFrameIn(start_time=time(9, 30), end_time=time(9, 45)),
            ]),
        ]
        rows[0].start, rows[0].end = time(9, 0), time(9, 30)
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        errors = [e for e in body["errors"] if e["row"] == 2]
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["logical_task_index"], 2)
        self.assertEqual(errors[0]["time_frame_index"], 3)
        self.assertEqual(
            errors[0]["message"],
            "Task 2, time frame 3: This time overlaps another time frame "
            "for the same task. Use separate, non-overlapping times.",
        )

    def test_9_multiple_errors_across_several_logical_tasks(self):
        session = self.make_session()
        rows = [
            self._row("Task A", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(9, 0)),  # invalid range
            ]),
            self._row("Task B", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),  # duplicate
            ]),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        rows_seen = sorted(set(e["row"] for e in body["errors"]))
        self.assertEqual(rows_seen, [1, 2])

    def test_10_error_sorting_by_logical_task_then_frame(self):
        session = self.make_session()
        rows = [
            self._row("Task A", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),  # row 1 frame 2 dup
            ]),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        # Only one row here; verify a broader batch sorts row-then-frame.
        rows2 = [
            self._row("B", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            ]),
            self._row("A", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            ]),
        ]
        response2 = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows2), db=session
        )
        body2 = self.body_of(response2)
        rows_order = [e["row"] for e in body2["errors"]]
        self.assertEqual(rows_order, sorted(rows_order))

    def test_11_error_deduplication(self):
        # A frame that conflicts with BOTH an in-batch frame AND an
        # existing saved Task with the identical resulting classification
        # must appear only once in the final errors list.
        session = self.make_session()
        self.make_task(session, DATE, "Task A", start_time=time(9, 0), end_time=time(9, 30))
        rows = [
            self._row("Task A", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(9, 30)),
            ]),
            self._row("Task A", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(9, 30)),
            ]),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        seen = set()
        for e in body["errors"]:
            key = (e["row"], e["field"], e["code"], e["message"])
            self.assertNotIn(key, seen, "duplicate error entry found: %r" % (key,))
            seen.add(key)

    def test_12_bulk_same_title_saved_conflict_retains_frame_number(self):
        session = self.make_session()
        self.make_task(session, DATE, "Staff Attendance", start_time=time(11, 15), end_time=time(11, 30))
        rows = [self._row("Staff Attendance", time_frames=[
            TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
        ])]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        self.assertEqual(body["errors"][0]["logical_task_index"], 1)
        self.assertEqual(body["errors"][0]["time_frame_index"], 2)
        self.assertEqual(
            body["errors"][0]["message"],
            "Task 1, time frame 2: The same task is already scheduled during this time.",
        )

    def test_13_bulk_leave_conflict_retains_frame_number(self):
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        rows = [self._row("Task A", time_frames=[
            TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
        ])]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        self.assertEqual(body["errors"][0]["logical_task_index"], 1)
        self.assertEqual(body["errors"][0]["time_frame_index"], 1)
        self.assertEqual(
            body["errors"][0]["message"],
            "Task 1, time frame 1: This time conflicts with Leave on the selected date. "
            "Choose another time or date.",
        )
        self.assertEqual(self.row_count(session), 0)

    def test_14_bulk_timed_untimed_conflict_retains_frame_number(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup")  # untimed saved occurrence
        rows = [self._row("Standup", time_frames=[
            TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
        ])]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        self.assertEqual(body["errors"][0]["time_frame_index"], 1)
        self.assertIn("untimed", body["errors"][0]["message"])
        self.assertTrue(body["errors"][0]["message"].startswith("Task 1, time frame 1:"))


# ── 15-16: Edit frame context ───────────────────────────────────────────
class EditFrameContextTests(FrameContextTestCase):
    def test_15_edit_selected_occurrence_error_maps_to_frame_1(self):
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        response = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(
                additional_time_frames=[TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0))],
            ),
            db=session,
        )
        body = self.body_of(response)
        self.assertEqual(body["time_frame_index"], 1)
        self.assertTrue(body["message"].startswith("Time frame 1:"))
        self.assertNotIn("Task ", body["message"])  # PHASE 6: never "Task 1" for Edit

    def test_16_edit_added_occurrence_error_maps_to_correct_frame(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        self.make_task(session, DATE, "Standup", start_time=time(14, 15), end_time=time(14, 30))
        response = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(additional_time_frames=[
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
                TimeFrameIn(start_time=time(14, 0), end_time=time(15, 0)),
            ]),
            db=session,
        )
        body = self.body_of(response)
        self.assertEqual(body["time_frame_index"], 3)
        self.assertTrue(body["message"].startswith("Time frame 3:"))
        self.assertEqual(self.row_count(session), 2)  # nothing new written


# ── 17-20: Precedence, atomicity, rollback, compatibility ───────────────
class PrecedenceAndAtomicityTests(FrameContextTestCase):
    def test_17_hard_error_plus_advisory_returns_hard_errors_only(self):
        # Frame 1 is during lunch (advisory) AND frame 2 conflicts with
        # Leave (hard) — the response must be the hard leave_conflict, not
        # a schedule_confirmation_required advisory.
        session = self.make_session()
        self.make_leave(session, "Full-Day", DATE)
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance",
            time_frames=[
                TimeFrameIn(start_time=time(13, 0), end_time=time(14, 0)),  # lunch overlap
                TimeFrameIn(start_time=time(15, 0), end_time=time(16, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "leave_conflict")
        self.assertNotEqual(body["error"], "schedule_confirmation_required")

    def test_18_any_hard_error_produces_zero_writes(self):
        session = self.make_session()
        self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(10, 0))
        payload = MemberScheduleEventCreate(
            date=DATE, title="Standup",
            time_frames=[
                TimeFrameIn(start_time=time(9, 30), end_time=time(10, 30)),  # overlaps saved
                TimeFrameIn(start_time=time(11, 0), end_time=time(12, 0)),
            ],
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.row_count(session), 1)  # only the pre-existing row

    def test_19_atomic_rollback_still_valid_bulk_multi_row(self):
        session = self.make_session()
        rows = [
            BulkTaskRowIn(date=DATE, title="Good", time_frames=[
                TimeFrameIn(start_time=time(9, 0), end_time=time(10, 0)),
            ]),
            BulkTaskRowIn(date=DATE, title="Bad", time_frames=[
                TimeFrameIn(start_time=time(11, 0), end_time=time(11, 0)),  # invalid
            ]),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.row_count(session), 0)  # "Good" row never written either

    def test_20_old_single_time_request_remains_compatible(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Legacy", start=time(9, 0), end=time(10, 0))
        result = create_member_schedule_event("mayurika", payload, db=session)
        self.assertFalse(isinstance(result, JSONResponse))
        self.assertEqual(result.start_time, time(9, 0))
        self.assertEqual(self.row_count(session), 1)


if __name__ == "__main__":
    unittest.main()

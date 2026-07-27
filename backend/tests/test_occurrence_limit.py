"""Automated tests for the APPROVED OCCURRENCE LIMIT (2026-07-27 owner
approval): "Maximum 30 total Task occurrences per submission after
time-frame expansion." An occurrence is one Task database record. Applies
consistently, via the ONE shared backend validator
(check_occurrence_limit, backend/routers/member_schedules.py), to Single
Task creation, all Bulk Task rows combined, and Task Edit (selected
occurrence + additional time frames).

Covers the required test list from the approval task (items 1-16 —
17-22 are "same-title/Leave/classification/outcome/Summary/XLSX
unchanged" regression items, already exhaustively covered by the rest of
this test suite, which continues to pass unmodified — see
backend/tests/test_same_task_multiple_time_period_rule.py,
test_task_leave_overlap.py, test_schedule_classification.py,
test_task_outcome.py, test_schedule_duration_reports.py,
test_weekly_schedule_xlsx_export.py).

Same DB-backed (real ephemeral in-memory SQLite) endpoint-level pattern as
test_multiple_time_frames.py / test_frame_level_error_context.py.

Run with: python -m unittest backend.tests.test_occurrence_limit
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
from backend.models import MemberScheduleEvent
from backend.routers.member_schedules import (
    MAX_TASK_OCCURRENCES_PER_SUBMISSION,
    check_occurrence_limit,
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


def _quarter_hour_frames(count, start_minute=0):
    """count non-overlapping 15-minute TimeFrameIn objects starting at
    midnight + start_minute, avoiding the 12:45-13:30 lunch window as long
    as start_minute/count stay within one half of the day."""
    frames = []
    for i in range(count):
        minute_offset = start_minute + i * 15
        start_h, start_m = divmod(minute_offset, 60)
        end_h, end_m = divmod(minute_offset + 15, 60)
        frames.append(TimeFrameIn(start_time=time(start_h, start_m), end_time=time(end_h, end_m)))
    return frames


class OccurrenceLimitTestCase(unittest.TestCase):
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

    def row_count(self, session):
        return session.query(MemberScheduleEvent).count()

    def body_of(self, response):
        self.assertIsInstance(response, JSONResponse)
        return json.loads(response.body)


# ── Pure-function: the shared validator itself ──────────────────────────
class CheckOccurrenceLimitTests(unittest.TestCase):
    def test_boundary_is_exactly_thirty(self):
        self.assertEqual(MAX_TASK_OCCURRENCES_PER_SUBMISSION, 30)
        self.assertIsNone(check_occurrence_limit(30, for_bulk=False))
        self.assertIsNone(check_occurrence_limit(30, for_bulk=True))
        self.assertIsNotNone(check_occurrence_limit(31, for_bulk=False))
        self.assertIsNotNone(check_occurrence_limit(31, for_bulk=True))

    def test_14_single_edit_message(self):
        error = check_occurrence_limit(31, for_bulk=False)
        self.assertEqual(error["error"], "too_many_task_occurrences")
        self.assertEqual(
            error["message"],
            "You can add up to 30 task time frames in one submission. Remove some time frames and try again.",
        )

    def test_15_bulk_message(self):
        error = check_occurrence_limit(31, for_bulk=True)
        self.assertEqual(
            error["message"],
            "You can add up to 30 task time frames across all Bulk Task rows. "
            "Remove some time frames and try again.",
        )

    def test_9_one_occurrence_never_rejected(self):
        self.assertIsNone(check_occurrence_limit(1, for_bulk=False))
        self.assertIsNone(check_occurrence_limit(1, for_bulk=True))


# ── 1-2: Single Task ─────────────────────────────────────────────────────
class SingleOccurrenceLimitTests(OccurrenceLimitTestCase):
    def test_1_single_thirty_frames_allowed(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance", time_frames=_quarter_hour_frames(30)
        )
        result = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(result)
        self.assertEqual(body["created_count"], 30)
        self.assertEqual(self.row_count(session), 30)

    def test_2_single_thirty_one_frames_blocked(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(
            date=DATE, title="Staff Attendance", time_frames=_quarter_hour_frames(31)
        )
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(body["error"], "too_many_task_occurrences")
        self.assertEqual(
            body["message"],
            "You can add up to 30 task time frames in one submission. Remove some time frames and try again.",
        )
        # 11: limit rejection creates zero rows.
        self.assertEqual(self.row_count(session), 0)
        # 5 no-write rule: no fingerprint/warnings key present at all.
        self.assertNotIn("confirmation_fingerprint", body)
        self.assertNotIn("warnings", body)

    def test_9_old_single_time_request_counts_as_one(self):
        session = self.make_session()
        payload = MemberScheduleEventCreate(date=DATE, title="Legacy", start=time(9, 0), end=time(10, 0))
        result = create_member_schedule_event("mayurika", payload, db=session)
        self.assertFalse(isinstance(result, JSONResponse))
        self.assertEqual(self.row_count(session), 1)


# ── 3-6, 10: Bulk ─────────────────────────────────────────────────────────
class BulkOccurrenceLimitTests(OccurrenceLimitTestCase):
    def _row(self, title="Task", date_=DATE, time_frames=None):
        return BulkTaskRowIn(date=date_, title=title, time_frames=time_frames)

    def test_3_bulk_ten_rows_three_frames_allowed(self):
        session = self.make_session()
        rows = [
            self._row("Task " + str(i), time_frames=_quarter_hour_frames(3, start_minute=i * 60))
            for i in range(10)
        ]
        result = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(result["created_count"], 30)
        self.assertEqual(self.row_count(session), 30)

    def test_4_bulk_ten_rows_four_frames_blocked(self):
        session = self.make_session()
        rows = [
            self._row("Task " + str(i), time_frames=_quarter_hour_frames(4, start_minute=i * 60))
            for i in range(10)
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        body = self.body_of(response)
        self.assertEqual(response.status_code, 422)
        errors = [e for e in body["errors"] if e["code"] == "too_many_task_occurrences"]
        self.assertEqual(len(errors), 1)
        self.assertEqual(
            errors[0]["message"],
            "You can add up to 30 task time frames across all Bulk Task rows. "
            "Remove some time frames and try again.",
        )
        self.assertEqual(self.row_count(session), 0)

    def test_5_bulk_mixed_row_sizes_totaling_thirty_allowed(self):
        session = self.make_session()
        rows = [
            self._row("A", time_frames=_quarter_hour_frames(5, start_minute=0)),
            self._row("B", time_frames=_quarter_hour_frames(10, start_minute=200)),
            self._row("C", time_frames=_quarter_hour_frames(15, start_minute=500)),
        ]
        result = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(result["created_count"], 30)

    def test_6_bulk_mixed_row_sizes_totaling_thirty_one_blocked(self):
        session = self.make_session()
        rows = [
            self._row("A", time_frames=_quarter_hour_frames(5, start_minute=0)),
            self._row("B", time_frames=_quarter_hour_frames(10, start_minute=200)),
            self._row("C", time_frames=_quarter_hour_frames(16, start_minute=500)),
        ]
        response = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.row_count(session), 0)

    def test_10_blank_placeholder_rows_not_miscounted(self):
        session = self.make_session()
        # 30 real frames across 2 rows, plus 3 fully-blank rows that must
        # never count toward expanded_count.
        rows = [
            self._row("A", time_frames=_quarter_hour_frames(15, start_minute=0)),
            self._row("B", time_frames=_quarter_hour_frames(15, start_minute=300)),
            BulkTaskRowIn(date=None, title=None, priority=None, start=None, end=None, notes=None),
            BulkTaskRowIn(date=None, title=None, priority=None, start=None, end=None, notes=None),
            BulkTaskRowIn(date=None, title=None, priority=None, start=None, end=None, notes=None),
        ]
        result = create_member_schedule_events_bulk(
            "mayurika", BulkTaskCreateRequest(tasks=rows), db=session
        )
        self.assertEqual(result["created_count"], 30)


# ── 7-8, 12-13: Edit ──────────────────────────────────────────────────────
class EditOccurrenceLimitTests(OccurrenceLimitTestCase):
    def test_7_edit_selected_plus_29_additional_allowed(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(9, 15))
        additional = _quarter_hour_frames(29, start_minute=60)
        result = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(additional_time_frames=additional),
            db=session,
        )
        body = self.body_of(result)
        self.assertEqual(body["created_count"], 29)
        self.assertEqual(self.row_count(session), 30)

    def test_8_edit_selected_plus_30_additional_blocked(self):
        session = self.make_session()
        task = self.make_task(session, DATE, "Standup", start_time=time(9, 0), end_time=time(9, 15))
        additional = _quarter_hour_frames(30, start_minute=60)
        response = update_member_schedule_event(
            "mayurika", task.id,
            MemberScheduleEventUpdate(additional_time_frames=additional),
            db=session,
        )
        body = self.body_of(response)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(body["error"], "too_many_task_occurrences")
        # 12: limit rejection performs no update.
        self.assertEqual(self.row_count(session), 1)
        refreshed = session.query(MemberScheduleEvent).filter_by(id=task.id).one()
        # 13: form/selected-occurrence values remain exactly as they were.
        self.assertEqual(refreshed.start_time, time(9, 0))
        self.assertEqual(refreshed.end_time, time(9, 15))
        self.assertEqual(refreshed.title, "Standup")


# ── 16: hard limit precedence over advisory confirmation ─────────────────
class PrecedenceTests(OccurrenceLimitTestCase):
    def test_16_occurrence_limit_precedes_advisory_confirmation(self):
        # Every one of these 31 frames overlaps the lunch break (would
        # ordinarily trigger a schedule_confirmation_required advisory) —
        # the occurrence limit must still win, with zero fingerprint ever
        # computed.
        session = self.make_session()
        # 31 distinct, non-overlapping 1-minute frames, all inside the
        # 12:45-13:30 lunch window (comfortably fits 31 x 1-minute slices
        # starting at 12:45).
        frames = []
        for i in range(31):
            minute = 45 + i
            hour = 12 + minute // 60
            minute = minute % 60
            end_minute = minute + 1
            end_hour = hour
            if end_minute >= 60:
                end_minute -= 60
                end_hour += 1
            frames.append(TimeFrameIn(
                start_time=time(hour, minute), end_time=time(end_hour, end_minute)
            ))
        payload = MemberScheduleEventCreate(date=DATE, title="Lunch Task", time_frames=frames)
        response = create_member_schedule_event("mayurika", payload, db=session)
        body = self.body_of(response)
        self.assertEqual(body["error"], "too_many_task_occurrences")
        self.assertNotEqual(body["error"], "schedule_confirmation_required")
        self.assertNotIn("confirmation_fingerprint", body)
        self.assertEqual(self.row_count(session), 0)


if __name__ == "__main__":
    unittest.main()

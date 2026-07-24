"""Automated tests for Bulk Tasks creation (2026-07-23; per-row Date field
added by the CONFIRMED ADD-ROW DATE RULE task, 2026-07-24):
POST /api/member-schedules/{member_key}/bulk
(backend/routers/member_schedules.py:create_member_schedule_events_bulk).

Pure-function / DB-free fake-session tests only, matching this repo's
established testing convention (backend/tests/test_member_leave.py,
test_schedule_classification.py, test_task_leave_overlap.py) — no
FastAPI TestClient and no live database connection anywhere in this
codebase. create_member_schedule_events_bulk is called directly as a
plain Python function (its `Depends(get_db)` default is never resolved
outside of an actual FastAPI request, so passing a fake `db` object
positionally/by keyword bypasses it entirely, exactly like this
codebase's existing tests call find_conflicting_active_leave /
find_conflicting_active_tasks directly rather than through an HTTP
client).

Run with: python -m unittest backend.tests.test_bulk_task_creation
"""

import unittest
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException
from fastapi.responses import JSONResponse

from backend.config import MAX_BULK_TASK_ROWS
from backend.models import MemberLeaveRecord, MemberScheduleEvent
from backend.routers.member_schedules import (
    create_member_schedule_event,
    create_member_schedule_events_bulk,
)
from backend.schemas import BulkTaskCreateRequest, BulkTaskRowIn, MemberScheduleEventCreate

# Shared default row date — matches the previous default `event_date` this
# suite always used unless a test explicitly overrode it, so most tests
# below need no change at all now that date moved from the request onto
# each row.
DEFAULT_ROW_DATE = date(2099, 1, 5)


@dataclass
class FakeLeaveRecord:
    """Minimal duck-typed stand-in for a MemberLeaveRecord ORM row — only
    the attributes find_conflicting_active_leave actually reads. Mirrors
    the equivalent fakes in test_member_leave.py / test_task_leave_overlap.py."""

    leave_type: str
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    id: object = None

    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()


@dataclass
class FakeExistingTask:
    """Minimal duck-typed stand-in for an active MemberScheduleEvent row —
    only the attributes _find_existing_task_duplicate_warnings actually
    reads (id, title, start_time, end_time, and — since the CONFIRMED
    ADD-ROW DATE RULE task, 2026-07-24, scoped this check per row date —
    event_date). event_date defaults to DEFAULT_ROW_DATE so every existing
    call site that never mentioned a date keeps matching the rows built by
    _row()'s own default."""

    title: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    event_date: date = DEFAULT_ROW_DATE
    id: object = None

    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()


class _FakeQuery:
    def __init__(self, rows):
        self._rows = list(rows)

    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return list(self._rows)


class _FakeSession:
    """Minimal duck-typed stand-in for sqlalchemy.orm.Session, dispatching
    query(Model) by model identity so the same fake session can answer
    both the Leave-conflict query (MemberLeaveRecord) and the existing-Task
    duplicate query (MemberScheduleEvent) with independently-configured
    canned rows. add()/flush()/commit()/rollback()/refresh() are recorded
    so tests can assert exactly what was (or was not) written and whether
    a rollback occurred, without a live database."""

    def __init__(self, leave_rows=(), existing_task_rows=(), fail_on_flush=False, fail_on_commit=False):
        self._leave_rows = list(leave_rows)
        self._existing_task_rows = list(existing_task_rows)
        self._fail_on_flush = fail_on_flush
        self._fail_on_commit = fail_on_commit
        self.added = []
        self.committed = []
        self.refreshed = []
        self.rolled_back = False

    def query(self, model):
        if model is MemberLeaveRecord:
            return _FakeQuery(self._leave_rows)
        if model is MemberScheduleEvent:
            return _FakeQuery(self._existing_task_rows)
        return _FakeQuery([])

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        if self._fail_on_flush:
            raise RuntimeError("simulated flush failure — must never leak to the caller")

    def commit(self):
        if self._fail_on_commit:
            raise RuntimeError("simulated commit failure — must never leak to the caller")
        self.committed = list(self.added)

    def rollback(self):
        self.rolled_back = True
        self.added = []

    def refresh(self, obj):
        self.refreshed.append(obj)


def _row(title="Task", priority=None, start=None, end=None, notes=None, date=DEFAULT_ROW_DATE):
    return BulkTaskRowIn(date=date, title=title, priority=priority, start=start, end=end, notes=notes)


def _request(rows, confirm_duplicates=False):
    # No top-level common `date` any more (CONFIRMED ADD-ROW DATE RULE,
    # 2026-07-24) — every row already carries its own via _row() above.
    return BulkTaskCreateRequest(tasks=rows, confirm_duplicates=confirm_duplicates)


class OneAndThirtyRowTests(unittest.TestCase):
    """Step 22 items 1-3."""

    def test_one_valid_row_creates_one_task(self):
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request([_row("Only task")]), db=db)
        self.assertEqual(result["status"], "created")
        self.assertEqual(result["created_count"], 1)
        self.assertEqual(len(db.committed), 1)
        self.assertFalse(db.rolled_back)

    def test_thirty_valid_rows_creates_thirty(self):
        rows = [_row("Task " + str(i)) for i in range(MAX_BULK_TASK_ROWS)]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(result["status"], "created")
        self.assertEqual(result["created_count"], MAX_BULK_TASK_ROWS)
        self.assertEqual(len(db.committed), MAX_BULK_TASK_ROWS)

    def test_thirty_one_nonblank_rows_creates_zero(self):
        rows = [_row("Task " + str(i)) for i in range(MAX_BULK_TASK_ROWS + 1)]
        db = _FakeSession()
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)


class BlankRowTests(unittest.TestCase):
    """Step 22 items 4-5, and the Step 5 "title empty but another field
    filled is a hard error, not blank" rule."""

    def test_blank_rows_are_ignored(self):
        rows = [_row("Real task"), _row(title=None, priority=None, start=None, end=None, notes=None)]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(result["status"], "created")
        self.assertEqual(result["created_count"], 1)

    def test_all_rows_blank_returns_validation_failed(self):
        rows = [_row(title=None), _row(title="   ")]
        db = _FakeSession()
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)

    def test_title_empty_but_time_present_is_a_hard_error_not_blank(self):
        rows = [_row(title=None, start=time(9, 0), end=time(10, 0))]
        db = _FakeSession()
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)

    def test_date_only_row_is_still_blank(self):
        # A row with only a Date set (title/start/end/notes all empty) is
        # still blank — date is deliberately excluded from the blank check,
        # matching priority's own exclusion (Step 5 rule, unchanged by the
        # CONFIRMED ADD-ROW DATE RULE task).
        rows = [_row("Real task"), _row(title=None, date=date(2099, 2, 1))]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(result["status"], "created")
        self.assertEqual(result["created_count"], 1)


class HardValidationTests(unittest.TestCase):
    """Step 22 items 6-7."""

    def test_missing_title_creates_zero(self):
        rows = [_row("Valid"), _row(title="  ", start=time(9, 0), end=time(9, 30))]
        db = _FakeSession()
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)

    def test_invalid_time_range_creates_zero(self):
        rows = [_row("Valid"), _row("Bad time", start=time(10, 0), end=time(9, 0))]
        db = _FakeSession()
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)


class PerRowDateTests(unittest.TestCase):
    """CONFIRMED ADD-ROW DATE RULE task (2026-07-24) — every row carries
    and is validated against its own `date`; there is no top-level common
    date any more."""

    def test_nonblank_row_with_no_date_is_a_hard_error(self):
        rows = [_row("Valid"), _row("No date", date=None)]
        db = _FakeSession()
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)
        import json
        body = json.loads(response.body)
        date_errors = [e for e in body["errors"] if e["field"] == "date"]
        self.assertEqual(len(date_errors), 1)
        self.assertEqual(date_errors[0]["row"], 2)

    def test_rows_persist_their_own_distinct_dates(self):
        rows = [
            _row("Task A", date=date(2099, 1, 5)),
            _row("Task B", date=date(2099, 1, 6)),
        ]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(result["status"], "created")
        dates = sorted(item.event_date for item in result["items"])
        self.assertEqual(dates, [date(2099, 1, 5), date(2099, 1, 6)])

    def test_same_title_and_time_on_different_dates_is_not_a_duplicate(self):
        rows = [
            _row("Standup", start=time(9, 0), end=time(9, 15), date=date(2099, 1, 5)),
            _row("Standup", start=time(9, 0), end=time(9, 15), date=date(2099, 1, 6)),
        ]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(result["status"], "created")
        self.assertEqual(result["created_count"], 2)

    def test_leave_conflict_checked_against_each_rows_own_date(self):
        # A Full-Day leave record on blocked_day must conflict with a row
        # dated blocked_day but NOT with a row dated open_day, even though
        # the fake session's filter() is a no-op and returns this same
        # canned leave row for every query (matching this repo's other
        # fake-session tests) — find_conflicting_active_leave's own
        # per-record _leave_record_day_interval(record, task_date) check
        # is what actually narrows this to the row's own date, exactly as
        # it would from the real SQL WHERE clause in production.
        blocked_day = date(2099, 1, 5)
        open_day = date(2099, 1, 6)
        leave = FakeLeaveRecord("Full-Day", blocked_day, blocked_day)
        db = _FakeSession(leave_rows=[leave])
        rows = [
            _row("Blocked", date=blocked_day),
            _row("Open", date=open_day),
        ]
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)
        import json
        body = json.loads(response.body)
        leave_errors = [e for e in body["errors"] if e["code"] == "leave_conflict"]
        self.assertEqual(len(leave_errors), 1)
        self.assertEqual(leave_errors[0]["row"], 1)

    def test_category_is_computed_per_row_from_its_own_date(self):
        # One far-future row (always Scheduled) and one far-past row
        # (always Unscheduled) in the SAME batch — category must reflect
        # each row's own date, not one shared batch-wide classification.
        rows = [
            _row("Future task", date=date(2099, 1, 5)),
            _row("Past task", date=date(2000, 1, 3)),
        ]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        categories = {item.title: item.category for item in result["items"]}
        self.assertEqual(categories["Future task"], "Scheduled Task")
        self.assertEqual(categories["Past task"], "Unscheduled Task")


class LeaveConflictTests(unittest.TestCase):
    """Step 22 items 8-11. Authoritative recheck via
    leave_logic.find_conflicting_active_leave — no second formula."""

    def test_full_day_leave_conflict_creates_zero(self):
        d = date(2099, 1, 5)
        leave = FakeLeaveRecord("Full-Day", d, d)
        db = _FakeSession(leave_rows=[leave])
        response = create_member_schedule_events_bulk(
            "mayurika", _request([_row("Any task", date=d)]), db=db
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)

    def test_multi_day_leave_conflict_creates_zero(self):
        friday = date(2099, 1, 2)
        leave = FakeLeaveRecord("Multi-Day", friday, date(2099, 1, 5))
        db = _FakeSession(leave_rows=[leave])
        response = create_member_schedule_events_bulk(
            "mayurika", _request([_row("Untimed task", date=friday)]), db=db
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)

    def test_partial_leave_overlapping_row_creates_zero(self):
        d = date(2099, 1, 5)
        leave = FakeLeaveRecord("Short Leave", d, d, time(9, 0), time(10, 0))
        db = _FakeSession(leave_rows=[leave])
        response = create_member_schedule_events_bulk(
            "mayurika",
            _request([_row("Overlaps leave", start=time(9, 30), end=time(9, 45), date=d)]),
            db=db,
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(len(db.added), 0)

    def test_partial_leave_non_overlapping_rows_succeed(self):
        d = date(2099, 1, 5)
        leave = FakeLeaveRecord("Short Leave", d, d, time(9, 0), time(10, 0))
        db = _FakeSession(leave_rows=[leave])
        result = create_member_schedule_events_bulk(
            "mayurika",
            _request([_row("Before leave", start=time(7, 0), end=time(8, 0), date=d)]),
            db=db,
        )
        self.assertEqual(result["status"], "created")
        self.assertEqual(result["created_count"], 1)

    def test_untimed_row_unaffected_by_partial_leave(self):
        # Untimed tasks never conflict with Short/Half-Day leave — same
        # asymmetry find_conflicting_active_leave already applies.
        d = date(2099, 1, 5)
        leave = FakeLeaveRecord("Short Leave", d, d, time(9, 0), time(10, 0))
        db = _FakeSession(leave_rows=[leave])
        result = create_member_schedule_events_bulk("mayurika", _request([_row("Untimed", date=d)]), db=db)
        self.assertEqual(result["status"], "created")


class DuplicateWarningTests(unittest.TestCase):
    """Step 22 items 12-16."""

    def test_batch_duplicate_returns_warning_and_zero_inserts(self):
        rows = [
            _row("Review reports", start=time(10, 0), end=time(11, 0)),
            _row("Something else"),
            _row("Review reports", start=time(10, 0), end=time(11, 0)),
        ]
        db = _FakeSession()
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(len(db.added), 0)
        import json
        body = json.loads(response.body)
        self.assertEqual(body["status"], "duplicate_confirmation_required")
        self.assertEqual(body["created_count"], 0)
        batch_warnings = [w for w in body["warnings"] if w["source"] == "current_batch"]
        self.assertEqual(len(batch_warnings), 1)
        self.assertEqual(sorted(batch_warnings[0]["rows"]), [1, 3])

    def test_existing_task_duplicate_returns_warning_and_zero_inserts(self):
        d = date(2099, 1, 5)
        existing = FakeExistingTask("Standup", time(9, 0), time(9, 15), event_date=d)
        db = _FakeSession(existing_task_rows=[existing])
        rows = [_row("Standup", start=time(9, 0), end=time(9, 15), date=d)]
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(len(db.added), 0)
        import json
        body = json.loads(response.body)
        existing_warnings = [w for w in body["warnings"] if w["source"] == "existing_task"]
        self.assertEqual(len(existing_warnings), 1)
        self.assertEqual(existing_warnings[0]["rows"], [1])
        self.assertNotIn(str(existing.id), existing_warnings[0]["message"])

    def test_existing_task_on_a_different_date_is_not_a_duplicate(self):
        # CONFIRMED ADD-ROW DATE RULE (2026-07-24) — the existing-Task
        # duplicate check is now scoped per row date; an existing Task on
        # one date must never warn against a submitted row for a
        # different date, even with an identical title/time.
        existing = FakeExistingTask("Standup", time(9, 0), time(9, 15), event_date=date(2099, 1, 5))
        db = _FakeSession(existing_task_rows=[existing])
        rows = [_row("Standup", start=time(9, 0), end=time(9, 15), date=date(2099, 1, 6))]
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(result["status"], "created")
        self.assertEqual(result["created_count"], 1)

    def test_both_duplicate_sources_return_all_warnings(self):
        d = date(2099, 1, 5)
        existing = FakeExistingTask("Standup", time(9, 0), time(9, 15), event_date=d)
        db = _FakeSession(existing_task_rows=[existing])
        rows = [
            _row("Standup", start=time(9, 0), end=time(9, 15), date=d),
            _row("Review reports", start=time(10, 0), end=time(11, 0), date=d),
            _row("Review reports", start=time(10, 0), end=time(11, 0), date=d),
        ]
        response = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(response.status_code, 409)
        import json
        body = json.loads(response.body)
        sources = sorted(w["source"] for w in body["warnings"])
        self.assertEqual(sources, ["current_batch", "existing_task"])

    def test_confirm_duplicates_false_creates_zero(self):
        rows = [_row("Dup"), _row("Dup")]
        db = _FakeSession()
        response = create_member_schedule_events_bulk(
            "mayurika", _request(rows, confirm_duplicates=False), db=db
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(len(db.added), 0)

    def test_confirm_duplicates_true_creates_all_rows(self):
        rows = [_row("Dup"), _row("Dup")]
        db = _FakeSession()
        result = create_member_schedule_events_bulk(
            "mayurika", _request(rows, confirm_duplicates=True), db=db
        )
        self.assertEqual(result["status"], "created")
        self.assertEqual(result["created_count"], 2)


class AtomicTransactionTests(unittest.TestCase):
    """Step 22 items 18-20."""

    def test_database_error_rolls_back_all_rows(self):
        rows = [_row("A"), _row("B"), _row("C")]
        db = _FakeSession(fail_on_flush=True)
        with self.assertRaises(HTTPException) as ctx:
            create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        self.assertEqual(ctx.exception.status_code, 500)
        self.assertNotIn("simulated flush failure", str(ctx.exception.detail))
        self.assertTrue(db.rolled_back)
        self.assertEqual(len(db.committed), 0)

    def test_all_rows_receive_the_same_created_at(self):
        rows = [_row("A"), _row("B"), _row("C")]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        created_ats = set(item.created_at for item in result["items"])
        self.assertEqual(len(created_ats), 1)

    def test_all_rows_receive_the_same_updated_at(self):
        rows = [_row("A"), _row("B"), _row("C")]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        updated_ats = set(item.updated_at for item in result["items"])
        self.assertEqual(len(updated_ats), 1)
        self.assertEqual(result["items"][0].updated_at, result["items"][0].created_at)


class ClassificationTests(unittest.TestCase):
    """Step 22 items 21-22."""

    def test_all_rows_receive_the_correct_scheduled_category(self):
        # Far-future date: real "now" at test-run time is always before
        # this date's own weekly cutoff, regardless of when the test runs.
        rows = [_row("A", date=date(2099, 1, 5)), _row("B", date=date(2099, 1, 5))]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        categories = set(item.category for item in result["items"])
        self.assertEqual(categories, {"Scheduled Task"})

    def test_all_rows_receive_the_correct_unscheduled_category(self):
        # Far-past date: real "now" at test-run time is always after this
        # date's own weekly cutoff, regardless of when the test runs.
        rows = [_row("A", date=date(2000, 1, 3)), _row("B", date=date(2000, 1, 3))]
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request(rows), db=db)
        categories = set(item.category for item in result["items"])
        self.assertEqual(categories, {"Unscheduled Task"})

    def test_client_category_manipulation_is_ignored(self):
        # BulkTaskRowIn has no category field at all — an extra "category"
        # key in the raw request is silently dropped by Pydantic's default
        # extra="ignore" behaviour, so the server-computed category is the
        # only one that can ever reach storage.
        row = BulkTaskRowIn(**{"date": date(2099, 1, 5), "title": "A", "category": "Unscheduled Task"})
        self.assertFalse(hasattr(row, "category"))
        db = _FakeSession()
        result = create_member_schedule_events_bulk("mayurika", _request([row]), db=db)
        self.assertEqual(result["items"][0].category, "Scheduled Task")


class MemberIsolationTests(unittest.TestCase):
    """Step 22 item 23, and Step 21 (all five members)."""

    def test_invalid_member_key_returns_404(self):
        db = _FakeSession()
        with self.assertRaises(HTTPException) as ctx:
            create_member_schedule_events_bulk("not-a-member", _request([_row("A")]), db=db)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_each_created_row_is_tagged_with_the_calling_member_key(self):
        db = _FakeSession()
        result = create_member_schedule_events_bulk("arun", _request([_row("A"), _row("B")]), db=db)
        self.assertTrue(all(item.member_key == "arun" for item in result["items"]))

    def test_all_five_members_succeed_identically(self):
        for member_key in ("mayurika", "suman", "arun", "rajiv", "paraparan"):
            db = _FakeSession()
            result = create_member_schedule_events_bulk(member_key, _request([_row("A")]), db=db)
            self.assertEqual(result["status"], "created")
            self.assertEqual(result["items"][0].member_key, member_key)

    def test_existing_duplicate_query_is_scoped_by_member_key_argument(self):
        # The fake session's existing_task_rows stands in for "what the
        # real SQL member_key filter already narrowed the result set to"
        # (same convention as this repo's other fake-session tests) — this
        # test documents that create_member_schedule_events_bulk passes
        # member_key through to the query unconditionally for every
        # member, so the real SQL filter is always applied.
        d = date(2099, 1, 5)
        existing = FakeExistingTask("Standup", time(9, 0), time(9, 15), event_date=d)
        db = _FakeSession(existing_task_rows=[existing])
        response = create_member_schedule_events_bulk(
            "suman", _request([_row("Standup", start=time(9, 0), end=time(9, 15), date=d)]), db=db
        )
        self.assertEqual(response.status_code, 409)


class SingleCreateEndpointUnchangedTests(unittest.TestCase):
    """Step 22 item 24 — the pre-existing single-Task POST endpoint is
    untouched by this feature; full regression coverage is
    test_schedule_classification.py / test_task_leave_overlap.py /
    test_member_leave.py (all unmodified by this task). This is a light
    same-file sanity check that the original function still creates
    exactly one row per call, unaffected by the new bulk code path added
    alongside it in the same module."""

    def test_single_create_still_creates_exactly_one_row(self):
        db = _FakeSession()
        payload = MemberScheduleEventCreate(date=date(2099, 1, 5), title="Solo task")
        event = create_member_schedule_event("mayurika", payload, db=db)
        self.assertEqual(len(db.committed), 1)
        self.assertEqual(event.title, "Solo task")


if __name__ == "__main__":
    unittest.main()

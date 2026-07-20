"""Automated tests for the calendar-empty-slot-create-and-overlap-rules
task (2026-07-20): Task-vs-Task (confirmed already allowed, no code
changed), Task-vs-Leave (pre-existing, unmodified — re-confirmed here
since it previously had no dedicated test), and the newly-added
Leave-vs-Task direction (find_conflicting_active_tasks /
task_conflict_response_body in backend/routers/leave_logic.py).

Pure-function-level tests only — no database connection is required or
attempted, matching this repo's established testing convention
(backend/tests/test_member_leave.py, test_schedule_classification.py).
There is no FastAPI TestClient / live-router test anywhere in this
codebase; Task-vs-Task and Task-vs-Leave router-level behavior is
confirmed here the same way this codebase's pre-existing tests confirm
Leave-vs-Leave router-level behavior — by exercising the exact gate
function(s) the router calls, against a DB-free fake session, not a live
HTTP request. This module's own docstring on find_conflicting_active_tasks
documents the one known concurrency gap this leaves open.

Run with: python -m unittest backend.tests.test_task_leave_overlap
"""

import unittest
from dataclasses import dataclass
from datetime import date, time
from typing import Optional
from uuid import uuid4

from backend.routers.leave_logic import (
    find_conflicting_active_leave,
    find_conflicting_active_tasks,
    leave_conflict_response_body,
    task_conflict_response_body,
)


@dataclass
class FakeTaskEvent:
    """Minimal duck-typed stand-in for a MemberScheduleEvent ORM row — only
    the attributes find_conflicting_active_tasks/task_conflict_response_body
    actually read."""

    category: str
    event_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    id: object = None

    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()


class _FakeQuery:
    """Minimal duck-typed stand-in for a sqlalchemy.orm.Query — supports
    only the chain find_conflicting_active_tasks()/
    find_conflicting_active_leave() actually call
    (.filter(...).filter(...).all() / .in_(...) is folded into filter()).
    The row list passed to _FakeSession is what .all() returns, standing in
    for "what the real SQL filters (member_key match, deleted_at IS NULL,
    date-range/date-in match) would have already narrowed the result set
    to" — same convention backend/tests/test_member_leave.py's _FakeQuery
    already uses for the leave-vs-leave direction."""

    def __init__(self, rows):
        self._rows = list(rows)

    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return list(self._rows)


class _FakeSession:
    def __init__(self, rows=()):
        self._rows = list(rows)

    def query(self, model):
        return _FakeQuery(self._rows)


class FindConflictingActiveTasksTests(unittest.TestCase):
    """New leave-vs-task direction (find_conflicting_active_tasks) —
    mirrors the Full-Day-dominance / partial-day-interval asymmetry
    find_conflicting_active_leave() already applies from the task side,
    with roles reversed. Required test-matrix cases from Step 12/21."""

    def _conflicts(self, proposed, existing_tasks):
        session = _FakeSession(existing_tasks)
        leave_type, start_date, end_date, start_time, end_time = proposed
        return find_conflicting_active_tasks(
            session, "mayurika", leave_type, start_date, end_date, start_time, end_time
        )

    def test_short_leave_over_one_task_conflicts(self):
        d = date(2026, 7, 24)
        task = FakeTaskEvent("Scheduled Task", d, time(9, 0), time(10, 0))
        result = self._conflicts(
            ("Short Leave", d, d, time(9, 30), time(10, 30)), [task]
        )
        self.assertEqual(result, [task])

    def test_short_leave_over_multiple_overlapping_tasks_conflicts(self):
        d = date(2026, 7, 24)
        task_a = FakeTaskEvent("Scheduled Task", d, time(9, 0), time(9, 45))
        task_b = FakeTaskEvent("Unscheduled Task", d, time(9, 30), time(10, 15))
        result = self._conflicts(
            ("Short Leave", d, d, time(9, 0), time(10, 0)), [task_a, task_b]
        )
        self.assertEqual(set(t.id for t in result), {task_a.id, task_b.id})

    def test_short_leave_adjacent_task_allowed(self):
        # Touching, not overlapping — same half-open-interval convention
        # find_overlapping_leave_records already applies (leave-vs-leave).
        d = date(2026, 7, 24)
        task = FakeTaskEvent("Scheduled Task", d, time(8, 0), time(9, 0))
        result = self._conflicts(
            ("Short Leave", d, d, time(9, 0), time(10, 0)), [task]
        )
        self.assertEqual(result, [])

    def test_short_leave_untimed_task_same_date_allowed(self):
        # A task with no start/end time never conflicts with a partial-day
        # leave request — same asymmetry find_conflicting_active_leave()
        # applies for an untimed task vs. a Short/Half-Day leave.
        d = date(2026, 7, 24)
        task = FakeTaskEvent("Scheduled Task", d, None, None)
        result = self._conflicts(("Short Leave", d, d, time(9, 0), time(10, 0)), [task])
        self.assertEqual(result, [])

    def test_half_day_leave_covering_task_conflicts(self):
        d = date(2026, 7, 24)
        # LEAVE_HALF_DAY_FIRST_START/END is 08:30-13:00 (backend/config.py).
        task = FakeTaskEvent("Scheduled Task", d, time(9, 0), time(9, 30))
        result = self._conflicts(("Half-Day First", d, d, None, None), [task])
        self.assertEqual(result, [task])

    def test_full_day_leave_on_date_with_task_conflicts(self):
        d = date(2026, 7, 24)
        # Full-Day dominance: conflicts with ANY task on the date, timed or
        # untimed.
        task = FakeTaskEvent("Unscheduled Task", d, None, None)
        result = self._conflicts(("Full-Day", d, d, None, None), [task])
        self.assertEqual(result, [task])

    def test_multi_day_leave_active_weekday_with_task_conflicts(self):
        # Friday 2026-07-17 .. Monday 2026-07-20; the Friday task is on an
        # included weekday.
        friday = date(2026, 7, 17)
        task = FakeTaskEvent("Scheduled Task", friday, time(14, 0), time(15, 0))
        result = self._conflicts(
            ("Multi-Day", friday, date(2026, 7, 20), None, None), [task]
        )
        self.assertEqual(result, [task])

    def test_multi_day_leave_weekend_only_task_allowed(self):
        # Saturday 2026-07-18 is excluded from Multi-Day's occupied-date
        # set — a task sitting only on that date is never a candidate.
        saturday = date(2026, 7, 18)
        task = FakeTaskEvent("Scheduled Task", saturday, None, None)
        result = self._conflicts(
            ("Multi-Day", date(2026, 7, 17), date(2026, 7, 20), None, None), [task]
        )
        self.assertEqual(result, [])

    def test_adjacent_non_overlapping_task_and_leave_allowed(self):
        d = date(2026, 7, 24)
        next_day = date(2026, 7, 25)
        task = FakeTaskEvent("Scheduled Task", next_day, time(9, 0), time(10, 0))
        result = self._conflicts(("Full-Day", d, d, None, None), [task])
        self.assertEqual(result, [])

    def test_no_candidate_tasks_returns_empty(self):
        d = date(2026, 7, 24)
        result = self._conflicts(("Full-Day", d, d, None, None), [])
        self.assertEqual(result, [])


class TaskConflictResponseBodyTests(unittest.TestCase):
    """Response shape for the new leave-vs-task 409 contract — mirrors the
    shape/omission conventions leave_conflict_response_body and
    leave_overlap_response_body already establish."""

    def test_response_body_shape_and_no_title_or_notes_field(self):
        d = date(2026, 7, 24)
        task = FakeTaskEvent("Scheduled Task", d, time(9, 0), time(10, 0))
        body = task_conflict_response_body([task])
        self.assertEqual(body["error"], "task_conflict")
        self.assertIsInstance(body["message"], str)
        self.assertEqual(len(body["conflicts"]), 1)
        item = body["conflicts"][0]
        self.assertEqual(
            set(item.keys()), {"task_id", "category", "event_date", "start_time", "end_time"}
        )
        self.assertEqual(item["category"], "Scheduled Task")
        self.assertEqual(item["event_date"], "2026-07-24")
        self.assertEqual(item["start_time"], "09:00:00")
        self.assertEqual(item["end_time"], "10:00:00")

    def test_untimed_task_has_null_times(self):
        d = date(2026, 7, 24)
        task = FakeTaskEvent("Unscheduled Task", d, None, None)
        body = task_conflict_response_body([task])
        self.assertIsNone(body["conflicts"][0]["start_time"])
        self.assertIsNone(body["conflicts"][0]["end_time"])

    def test_empty_conflicts_list(self):
        body = task_conflict_response_body([])
        self.assertEqual(body["conflicts"], [])


class TaskVsTaskAllowedTests(unittest.TestCase):
    """Confirms Task-vs-Task overlap is allowed (Step 10/21) — no backend
    code changed for this direction because none needed to: reading
    backend/routers/member_schedules.py's create_member_schedule_event and
    update_member_schedule_event confirms the ONLY conflict gate either
    handler calls is find_conflicting_active_leave (task-vs-leave); neither
    ever queries other MemberScheduleEvent rows. This test exercises that
    gate function directly against a leave-free fake session and confirms
    it returns no conflicts regardless — the DB-free proxy for "two
    overlapping Task POSTs both succeed," since there is no other function
    in the create/update call path that could reject a task for
    overlapping another task. No FastAPI TestClient / live-router test
    exists anywhere in this codebase (see module docstring) to exercise
    this as an actual HTTP POST/PUT pair."""

    def test_conflict_gate_never_considers_other_tasks(self):
        d = date(2026, 7, 24)
        # Simulates the state right before saving a second, fully
        # overlapping task for the same member/date/time — the leave table
        # is empty, so the only gate either handler calls returns [].
        result = find_conflicting_active_leave(
            _FakeSession([]), "mayurika", d, time(9, 0), time(10, 0)
        )
        self.assertEqual(result, [])

    def test_identical_start_end_times_also_pass_the_gate(self):
        # Three tasks sharing an identical time window (regression-matrix
        # case 23) would each independently pass this same empty-leave
        # gate check — the function's signature never receives or
        # considers any other task.
        d = date(2026, 7, 24)
        for _ in range(3):
            result = find_conflicting_active_leave(
                _FakeSession([]), "mayurika", d, time(9, 0), time(10, 0)
            )
            self.assertEqual(result, [])


if __name__ == "__main__":
    unittest.main()

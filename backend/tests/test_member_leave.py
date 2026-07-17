"""Automated tests for the member leave coordination-copy feature
(REQ-LEAVE-COPY-001, 2026-07-16 simplification amendment — approval/status
workflow removed).

Pure-function / schema-level tests only — no database connection is
required or attempted, matching this session's confirmed workstation
limitation (direct Neon access hangs at the SSL/protocol handshake layer;
see handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md
§7) and this repo's established testing convention
(backend/tests/test_schedule_classification.py,
backend/tests/test_schedule_duration_reports.py).

Functions in backend/routers/leave_logic.py that require a live db.Session
(compute_short_leave_active_minutes_for_month,
compute_active_leave_minutes_for_period, find_conflicting_active_leave)
are exercised here only through their DB-free building blocks
(_leave_record_day_interval, merge_intervals, active_leave_minutes_for_date,
compute_effective_leave_minutes, expand_weekdays) using lightweight fake
leave-record objects rather than ORM rows — the query construction itself
is not covered by an automated test in this environment (documented as a
known limitation in the implementation validation evidence).

Run with: python -m unittest backend.tests.test_member_leave
"""

import unittest
from dataclasses import dataclass
from datetime import date, time
from typing import Optional
from uuid import uuid4

from pydantic import ValidationError

from backend.config import (
    ACTUAL_OFFICE_BREAK_END,
    ACTUAL_OFFICE_BREAK_START,
    LEAVE_FULL_DAY_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES,
    LEAVE_MAX_DAILY_DEDUCTION_MINUTES,
    SHORT_LEAVE_MAX_REQUEST_MINUTES,
    SHORT_LEAVE_MONTHLY_CAP_MINUTES,
)
from backend.routers.leave_logic import (
    LeaveOverlapError,
    _leave_record_day_interval,
    acquire_member_leave_lock,
    active_leave_minutes_for_date,
    assert_no_leave_overlap,
    compute_effective_leave_minutes,
    expand_weekdays,
    find_overlapping_leave_records,
    half_day_period_for_leave_type,
    leave_conflict_response_body,
    leave_overlap_response_body,
    merge_intervals,
    validate_leave_dates_and_times,
    validate_short_leave_duration_minutes,
)
from backend.schemas import MemberLeaveRecordCreate, MemberLeaveRecordOut, MemberLeaveRecordUpdate


@dataclass
class FakeLeaveRecord:
    """Minimal duck-typed stand-in for a MemberLeaveRecord ORM row — only
    the attributes _leave_record_day_interval / leave_conflict_response_body
    actually read."""

    leave_type: str
    start_date: date
    end_date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    id: object = None

    def __post_init__(self):
        if self.id is None:
            self.id = uuid4()


class _FakeQuery:
    """Minimal duck-typed stand-in for a sqlalchemy.orm.Query — supports
    only the chain find_overlapping_leave_records() actually calls
    (.filter(...).filter(...).with_for_update().all()). filter() and
    with_for_update() are no-ops that return self; the row list passed to
    _FakeSession is what .all() returns, standing in for "what the real SQL
    filters (member_key match, deleted_at IS NULL, exclude_leave_id,
    date-range overlap) would have already narrowed the result set to" —
    matching this repo's established convention that DB-free tests exercise
    a function's own decision logic, not SQL construction itself (see the
    module docstring above and find_conflicting_active_leave's equivalent
    testing gap)."""

    def __init__(self, rows):
        self._rows = list(rows)

    def filter(self, *args, **kwargs):
        return self

    def with_for_update(self):
        return self

    def all(self):
        return list(self._rows)


class _FakeSession:
    """Minimal duck-typed stand-in for sqlalchemy.orm.Session — records
    every raw SQL string passed to execute() (for asserting
    acquire_member_leave_lock's statement without a live Postgres
    connection) and returns a fixed candidate row list from query()."""

    def __init__(self, rows=()):
        self._rows = list(rows)
        self.executed = []

    def query(self, model):
        return _FakeQuery(self._rows)

    def execute(self, statement, params=None):
        self.executed.append((str(statement), params))
        return None


class ConfigurationValueTests(unittest.TestCase):
    """Confirms the exact leave-system time values (requirement §6.1) —
    the actual office break must never factor into any deduction value."""

    def test_half_day_first_deduction_is_270(self):
        self.assertEqual(LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES, 270)

    def test_half_day_second_deduction_is_270(self):
        self.assertEqual(LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES, 270)

    def test_full_day_deduction_is_540(self):
        self.assertEqual(LEAVE_FULL_DAY_DEDUCTION_MINUTES, 540)

    def test_actual_break_recorded_but_distinct_from_deductions(self):
        # The actual office break is a separate, informational-only fact —
        # it must never equal, derive, or be substituted into any of the
        # three deduction constants above.
        self.assertEqual(ACTUAL_OFFICE_BREAK_START, time(12, 45))
        self.assertEqual(ACTUAL_OFFICE_BREAK_END, time(13, 30))
        break_minutes = (
            ACTUAL_OFFICE_BREAK_END.hour * 60 + ACTUAL_OFFICE_BREAK_END.minute
        ) - (ACTUAL_OFFICE_BREAK_START.hour * 60 + ACTUAL_OFFICE_BREAK_START.minute)
        self.assertEqual(break_minutes, 45)
        self.assertNotEqual(break_minutes, LEAVE_FULL_DAY_DEDUCTION_MINUTES)
        self.assertNotEqual(break_minutes, LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES)

    def test_short_leave_max_request_is_120(self):
        self.assertEqual(SHORT_LEAVE_MAX_REQUEST_MINUTES, 120)

    def test_short_leave_monthly_cap_is_120(self):
        self.assertEqual(SHORT_LEAVE_MONTHLY_CAP_MINUTES, 120)


class WeekdayExpansionTests(unittest.TestCase):
    """Central reusable weekday-expansion helper — required matrix:
    Friday-Monday, weekend-only range, month rollover, year rollover."""

    def test_friday_to_monday_includes_only_friday_and_monday(self):
        # 2026-07-17 is a Friday, 2026-07-20 is a Monday.
        result = expand_weekdays(date(2026, 7, 17), date(2026, 7, 20))
        self.assertEqual(result, [date(2026, 7, 17), date(2026, 7, 20)])

    def test_weekend_only_range_returns_empty(self):
        # 2026-07-18 (Sat) - 2026-07-19 (Sun).
        result = expand_weekdays(date(2026, 7, 18), date(2026, 7, 19))
        self.assertEqual(result, [])

    def test_month_rollover_range(self):
        # 2026-07-30 (Thu) .. 2026-08-03 (Mon): Thu, Fri, Mon (Sat/Sun excluded).
        result = expand_weekdays(date(2026, 7, 30), date(2026, 8, 3))
        self.assertEqual(
            result, [date(2026, 7, 30), date(2026, 7, 31), date(2026, 8, 3)]
        )

    def test_year_rollover_range(self):
        # 2026-12-30 (Wed) .. 2027-01-02 (Sat): Wed, Thu, Fri (Sat excluded).
        result = expand_weekdays(date(2026, 12, 30), date(2027, 1, 2))
        self.assertEqual(
            result, [date(2026, 12, 30), date(2026, 12, 31), date(2027, 1, 1)]
        )

    def test_reversed_range_returns_empty(self):
        result = expand_weekdays(date(2026, 7, 20), date(2026, 7, 17))
        self.assertEqual(result, [])

    def test_single_weekday_returns_that_day(self):
        result = expand_weekdays(date(2026, 7, 17), date(2026, 7, 17))
        self.assertEqual(result, [date(2026, 7, 17)])


class ShortLeaveDurationValidationTests(unittest.TestCase):
    def test_valid_under_cap_request(self):
        minutes = validate_short_leave_duration_minutes(time(9, 0), time(10, 30))
        self.assertEqual(minutes, 90)

    def test_exactly_120_minutes_allowed(self):
        minutes = validate_short_leave_duration_minutes(time(9, 0), time(11, 0))
        self.assertEqual(minutes, 120)

    def test_over_120_minutes_rejected(self):
        with self.assertRaises(ValueError):
            validate_short_leave_duration_minutes(time(9, 0), time(11, 1))

    def test_zero_duration_rejected(self):
        with self.assertRaises(ValueError):
            validate_short_leave_duration_minutes(time(9, 0), time(9, 0))

    def test_end_before_start_rejected(self):
        with self.assertRaises(ValueError):
            validate_short_leave_duration_minutes(time(11, 0), time(9, 0))


class EffectiveLeaveMinutesSnapshotTests(unittest.TestCase):
    """Config Snapshot Rule (requirement §8.5 / design §7)."""

    def test_short_leave_uses_exact_request_duration(self):
        minutes = compute_effective_leave_minutes(
            "Short Leave", date(2026, 7, 17), date(2026, 7, 17), time(9, 0), time(10, 0)
        )
        self.assertEqual(minutes, 60)

    def test_half_day_first_is_270(self):
        minutes = compute_effective_leave_minutes(
            "Half-Day First", date(2026, 7, 17), date(2026, 7, 17), None, None
        )
        self.assertEqual(minutes, 270)

    def test_half_day_second_is_270(self):
        minutes = compute_effective_leave_minutes(
            "Half-Day Second", date(2026, 7, 17), date(2026, 7, 17), None, None
        )
        self.assertEqual(minutes, 270)

    def test_full_day_is_540(self):
        minutes = compute_effective_leave_minutes(
            "Full-Day", date(2026, 7, 17), date(2026, 7, 17), None, None
        )
        self.assertEqual(minutes, 540)

    def test_multi_day_is_540_times_included_weekdays(self):
        # Friday-Monday -> 2 included weekdays -> 1080.
        minutes = compute_effective_leave_minutes(
            "Multi-Day", date(2026, 7, 17), date(2026, 7, 20), None, None
        )
        self.assertEqual(minutes, 1080)

    def test_multi_day_weekend_only_is_zero(self):
        minutes = compute_effective_leave_minutes(
            "Multi-Day", date(2026, 7, 18), date(2026, 7, 19), None, None
        )
        self.assertEqual(minutes, 0)


class SimplifiedLifecycleTests(unittest.TestCase):
    """2026-07-16 simplification amendment — there is no approval/status
    workflow anywhere in this feature. These tests confirm the status
    concept has been fully removed from the schema layer (the ORM/DB layer
    is confirmed by the migration's own validation queries — see
    evidence/database/member-leave-status-removal-migration-execution-2026-07-16.md)."""

    def test_leave_record_out_has_no_status_field(self):
        self.assertNotIn("status", MemberLeaveRecordOut.model_fields)

    def test_leave_record_update_has_no_status_field(self):
        self.assertNotIn("status", MemberLeaveRecordUpdate.model_fields)

    def test_leave_record_create_has_no_status_field(self):
        self.assertNotIn("status", MemberLeaveRecordCreate.model_fields)


class HalfDayPeriodMappingTests(unittest.TestCase):
    def test_half_day_first_maps_to_first(self):
        self.assertEqual(half_day_period_for_leave_type("Half-Day First"), "First")

    def test_half_day_second_maps_to_second(self):
        self.assertEqual(half_day_period_for_leave_type("Half-Day Second"), "Second")

    def test_other_types_map_to_none(self):
        for leave_type in ("Short Leave", "Full-Day", "Multi-Day"):
            self.assertIsNone(half_day_period_for_leave_type(leave_type))


class OverlapDeduplicationTests(unittest.TestCase):
    """Interval-based overlap deduplication (design §9) — a date-only union
    is insufficient for overlapping Short/Half-Day periods; this must merge
    actual time intervals and cap at 540 minutes/day, with Full-Day/
    Multi-Day dominating partial-day overlaps."""

    def test_merge_intervals_combines_overlapping(self):
        merged = merge_intervals([(60, 120), (90, 150)])
        self.assertEqual(merged, [(60, 150)])

    def test_merge_intervals_keeps_disjoint_separate(self):
        merged = merge_intervals([(60, 120), (200, 260)])
        self.assertEqual(merged, [(60, 120), (200, 260)])

    def test_two_overlapping_short_leaves_not_double_counted(self):
        target = date(2026, 7, 17)
        rows = [
            FakeLeaveRecord("Short Leave", target, target, time(9, 0), time(10, 30)),
            FakeLeaveRecord("Short Leave", target, target, time(10, 0), time(11, 0)),
        ]
        # Union of 09:00-10:30 and 10:00-11:00 is 09:00-11:00 = 120 minutes,
        # not 90+60=150.
        self.assertEqual(active_leave_minutes_for_date(rows, target), 120)

    def test_full_day_dominates_overlapping_short_leave(self):
        target = date(2026, 7, 17)
        rows = [
            FakeLeaveRecord("Full-Day", target, target),
            FakeLeaveRecord("Short Leave", target, target, time(9, 0), time(10, 0)),
        ]
        self.assertEqual(active_leave_minutes_for_date(rows, target), 540)

    def test_half_day_pair_sums_to_540_without_exceeding_cap(self):
        target = date(2026, 7, 17)
        rows = [
            FakeLeaveRecord("Half-Day First", target, target),
            FakeLeaveRecord("Half-Day Second", target, target),
        ]
        self.assertEqual(active_leave_minutes_for_date(rows, target), 540)

    def test_daily_cap_enforced_even_if_intervals_would_exceed_it(self):
        target = date(2026, 7, 17)
        # Contrived: two non-overlapping 300-minute intervals would sum to
        # 600 without a cap. The cap must bring this down to 540.
        rows = [
            FakeLeaveRecord("Short Leave", target, target, time(0, 0), time(5, 0)),
            FakeLeaveRecord("Short Leave", target, target, time(6, 0), time(11, 0)),
        ]
        self.assertEqual(
            active_leave_minutes_for_date(rows, target), LEAVE_MAX_DAILY_DEDUCTION_MINUTES
        )

    def test_multi_day_included_weekday_contributes_full_day_interval(self):
        # Friday of a Friday-Monday Multi-Day request.
        friday = date(2026, 7, 17)
        rows = [FakeLeaveRecord("Multi-Day", date(2026, 7, 17), date(2026, 7, 20))]
        self.assertEqual(active_leave_minutes_for_date(rows, friday), 540)

    def test_multi_day_weekend_date_contributes_nothing(self):
        saturday = date(2026, 7, 18)
        rows = [FakeLeaveRecord("Multi-Day", date(2026, 7, 17), date(2026, 7, 20))]
        self.assertEqual(active_leave_minutes_for_date(rows, saturday), 0)

    def test_leave_record_day_interval_short_leave(self):
        target = date(2026, 7, 17)
        row = FakeLeaveRecord("Short Leave", target, target, time(9, 0), time(10, 0))
        self.assertEqual(_leave_record_day_interval(row, target), (540, 600))

    def test_leave_record_day_interval_none_when_date_not_covered(self):
        row = FakeLeaveRecord(
            "Short Leave", date(2026, 7, 17), date(2026, 7, 17), time(9, 0), time(10, 0)
        )
        self.assertIsNone(_leave_record_day_interval(row, date(2026, 7, 18)))


class ConflictResponseBodyTests(unittest.TestCase):
    def test_response_body_shape_and_no_purpose_field(self):
        target = date(2026, 7, 17)
        record = FakeLeaveRecord("Full-Day", target, target)
        body = leave_conflict_response_body([record])
        self.assertEqual(body["error"], "leave_conflict")
        self.assertIn("message", body)
        self.assertEqual(len(body["conflicts"]), 1)
        conflict = body["conflicts"][0]
        self.assertEqual(
            set(conflict.keys()),
            {"leave_id", "leave_type", "start_date", "end_date", "start_time", "end_time"},
        )
        self.assertNotIn("purpose", conflict)
        self.assertNotIn("status", conflict)

    def test_empty_conflicts_list(self):
        body = leave_conflict_response_body([])
        self.assertEqual(body["conflicts"], [])


class ValidateLeaveDatesAndTimesTests(unittest.TestCase):
    def test_short_leave_valid(self):
        validate_leave_dates_and_times(
            "Short Leave", date(2026, 7, 17), date(2026, 7, 17), time(9, 0), time(10, 0)
        )  # does not raise

    def test_short_leave_missing_time_rejected(self):
        with self.assertRaises(ValueError):
            validate_leave_dates_and_times(
                "Short Leave", date(2026, 7, 17), date(2026, 7, 17), None, None
            )

    def test_full_day_with_time_rejected(self):
        with self.assertRaises(ValueError):
            validate_leave_dates_and_times(
                "Full-Day", date(2026, 7, 17), date(2026, 7, 17), time(9, 0), time(10, 0)
            )

    def test_full_day_mismatched_end_date_rejected(self):
        with self.assertRaises(ValueError):
            validate_leave_dates_and_times(
                "Full-Day", date(2026, 7, 17), date(2026, 7, 18), None, None
            )

    def test_multi_day_reversed_range_rejected(self):
        with self.assertRaises(ValueError):
            validate_leave_dates_and_times(
                "Multi-Day", date(2026, 7, 20), date(2026, 7, 17), None, None
            )

    def test_multi_day_weekend_only_rejected(self):
        with self.assertRaises(ValueError):
            validate_leave_dates_and_times(
                "Multi-Day", date(2026, 7, 18), date(2026, 7, 19), None, None
            )

    def test_multi_day_with_at_least_one_weekday_allowed(self):
        validate_leave_dates_and_times(
            "Multi-Day", date(2026, 7, 17), date(2026, 7, 20), None, None
        )  # does not raise


class MemberLeaveRecordCreateSchemaTests(unittest.TestCase):
    """DATA VALIDATION test matrix: all leave types, conditional fields,
    invalid date range, invalid time range, weekend-only Multi-Day
    rejected (rejected at the router level via
    leave_logic.validate_leave_dates_and_times — see
    ValidateLeaveDatesAndTimesTests above; the Pydantic schema itself only
    enforces date/time shape, not the weekday-count business rule)."""

    def test_short_leave_valid(self):
        payload = MemberLeaveRecordCreate(
            leave_type="Short Leave",
            start_date=date(2026, 7, 17),
            start_time=time(9, 0),
            end_time=time(10, 0),
        )
        self.assertEqual(payload.end_date, date(2026, 7, 17))

    def test_short_leave_without_times_rejected(self):
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(leave_type="Short Leave", start_date=date(2026, 7, 17))

    def test_short_leave_end_before_start_rejected(self):
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(
                leave_type="Short Leave",
                start_date=date(2026, 7, 17),
                start_time=time(11, 0),
                end_time=time(9, 0),
            )

    def test_half_day_first_valid_no_times(self):
        payload = MemberLeaveRecordCreate(
            leave_type="Half-Day First", start_date=date(2026, 7, 17)
        )
        self.assertEqual(payload.end_date, date(2026, 7, 17))

    def test_half_day_second_with_times_rejected(self):
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(
                leave_type="Half-Day Second",
                start_date=date(2026, 7, 17),
                start_time=time(9, 0),
                end_time=time(10, 0),
            )

    def test_full_day_valid(self):
        payload = MemberLeaveRecordCreate(leave_type="Full-Day", start_date=date(2026, 7, 17))
        self.assertEqual(payload.end_date, date(2026, 7, 17))

    def test_full_day_mismatched_end_date_rejected(self):
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(
                leave_type="Full-Day",
                start_date=date(2026, 7, 17),
                end_date=date(2026, 7, 18),
            )

    def test_multi_day_valid(self):
        payload = MemberLeaveRecordCreate(
            leave_type="Multi-Day",
            start_date=date(2026, 7, 17),
            end_date=date(2026, 7, 20),
        )
        self.assertEqual(payload.end_date, date(2026, 7, 20))

    def test_multi_day_missing_end_date_rejected(self):
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(leave_type="Multi-Day", start_date=date(2026, 7, 17))

    def test_multi_day_reversed_range_rejected(self):
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(
                leave_type="Multi-Day",
                start_date=date(2026, 7, 20),
                end_date=date(2026, 7, 17),
            )

    def test_invalid_leave_type_rejected(self):
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(leave_type="Sick Leave", start_date=date(2026, 7, 17))

    def test_purpose_and_external_reference_optional(self):
        payload = MemberLeaveRecordCreate(
            leave_type="Full-Day",
            start_date=date(2026, 7, 17),
            purpose="Family event",
            external_reference="HR-2026-001",
        )
        self.assertEqual(payload.purpose, "Family event")
        self.assertEqual(payload.external_reference, "HR-2026-001")

    def test_purpose_limit_unchanged_at_240_by_schedule_item_title_increase(self):
        # The Schedule Item title limit was raised to 120 (2026-07-16) —
        # this must not have touched the unrelated Leave purpose limit,
        # which stays at 240.
        payload = MemberLeaveRecordCreate(
            leave_type="Full-Day", start_date=date(2026, 7, 17), purpose="D" * 240
        )
        self.assertEqual(len(payload.purpose), 240)
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(
                leave_type="Full-Day", start_date=date(2026, 7, 17), purpose="D" * 241
            )

    def test_external_reference_limit_unchanged_at_120(self):
        # external_reference's limit (120) is unrelated to and unchanged by
        # the Schedule Item title limit increase, even though both now
        # happen to be 120 — this confirms it is still independently
        # enforced, not accidentally removed.
        payload = MemberLeaveRecordCreate(
            leave_type="Full-Day", start_date=date(2026, 7, 17), external_reference="E" * 120
        )
        self.assertEqual(len(payload.external_reference), 120)
        with self.assertRaises(ValidationError):
            MemberLeaveRecordCreate(
                leave_type="Full-Day", start_date=date(2026, 7, 17), external_reference="E" * 121
            )


class LeaveOverlapMatrixTests(unittest.TestCase):
    """member-leave-overlap-prevention (2026-07-17) — the approved OVERLAP
    MATRIX, exercised end-to-end through find_overlapping_leave_records()
    against a _FakeSession (DB-free, per this module's established
    convention). Required test matrix cases 1-14."""

    def _overlap(self, proposed, existing_rows, exclude_leave_id=None):
        session = _FakeSession(existing_rows)
        leave_type, start_date, end_date, start_time, end_time = proposed
        return find_overlapping_leave_records(
            session, "mayurika", leave_type, start_date, end_date, start_time, end_time,
            exclude_leave_id=exclude_leave_id,
        )

    # 1. Full-Day + Full-Day same member/date -> conflict.
    def test_full_day_vs_full_day_same_date_conflicts(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Full-Day", d, d)
        result = self._overlap(("Full-Day", d, d, None, None), [existing])
        self.assertEqual(result, [existing])

    # 2. Full-Day + Short Leave same member/date -> conflict.
    def test_full_day_vs_short_leave_same_date_conflicts(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Short Leave", d, d, time(9, 0), time(10, 0))
        result = self._overlap(("Full-Day", d, d, None, None), [existing])
        self.assertEqual(result, [existing])

    # 3. Full-Day + First-Half same member/date -> conflict.
    def test_full_day_vs_half_day_first_same_date_conflicts(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Half-Day First", d, d)
        result = self._overlap(("Full-Day", d, d, None, None), [existing])
        self.assertEqual(result, [existing])

    # 4. Full-Day + Second-Half same member/date -> conflict.
    def test_full_day_vs_half_day_second_same_date_conflicts(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Half-Day Second", d, d)
        result = self._overlap(("Full-Day", d, d, None, None), [existing])
        self.assertEqual(result, [existing])

    # 5. Multi-Day covering date + Full-Day -> conflict.
    def test_multi_day_covering_date_vs_full_day_conflicts(self):
        # Friday 2026-07-17 .. Monday 2026-07-20.
        existing = FakeLeaveRecord("Full-Day", date(2026, 7, 17), date(2026, 7, 17))
        result = self._overlap(
            ("Multi-Day", date(2026, 7, 17), date(2026, 7, 20), None, None), [existing]
        )
        self.assertEqual(result, [existing])

    # 6. Multi-Day covering date + Short Leave -> conflict.
    def test_multi_day_covering_date_vs_short_leave_conflicts(self):
        existing = FakeLeaveRecord(
            "Short Leave", date(2026, 7, 20), date(2026, 7, 20), time(9, 0), time(10, 0)
        )
        result = self._overlap(
            ("Multi-Day", date(2026, 7, 17), date(2026, 7, 20), None, None), [existing]
        )
        self.assertEqual(result, [existing])

    # 7. Multi-Day weekend-only non-overlap case -> allowed.
    def test_multi_day_weekend_only_range_never_conflicts(self):
        # 2026-07-18 (Sat) - 2026-07-19 (Sun): expand_weekdays() is empty,
        # so this proposal occupies zero dates and can never conflict.
        existing = FakeLeaveRecord("Full-Day", date(2026, 7, 18), date(2026, 7, 18))
        result = self._overlap(
            ("Multi-Day", date(2026, 7, 18), date(2026, 7, 19), None, None), [existing]
        )
        self.assertEqual(result, [])

    def test_multi_day_only_shared_date_is_excluded_weekend_allowed(self):
        # Multi-Day Fri(17)-Mon(20) occupies {17, 20} only (18/19 excluded).
        # An existing Full-Day sitting only on Saturday the 18th shares no
        # occupied date with the proposal, even though the raw date ranges
        # overlap (matrix "Allow" case 4).
        existing = FakeLeaveRecord("Full-Day", date(2026, 7, 18), date(2026, 7, 18))
        result = self._overlap(
            ("Multi-Day", date(2026, 7, 17), date(2026, 7, 20), None, None), [existing]
        )
        self.assertEqual(result, [])

    # 8. First-Half + First-Half -> conflict.
    def test_half_day_first_vs_half_day_first_conflicts(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Half-Day First", d, d)
        result = self._overlap(("Half-Day First", d, d, None, None), [existing])
        self.assertEqual(result, [existing])

    # 9. Second-Half + Second-Half -> conflict.
    def test_half_day_second_vs_half_day_second_conflicts(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Half-Day Second", d, d)
        result = self._overlap(("Half-Day Second", d, d, None, None), [existing])
        self.assertEqual(result, [existing])

    # 10. First-Half + Second-Half -> allowed.
    def test_half_day_first_vs_half_day_second_allowed(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Half-Day Second", d, d)
        result = self._overlap(("Half-Day First", d, d, None, None), [existing])
        self.assertEqual(result, [])

    # 11. Short 09:00-10:00 + Short 09:30-10:30 -> conflict.
    def test_short_leave_overlapping_intervals_conflict(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Short Leave", d, d, time(9, 0), time(10, 0))
        result = self._overlap(
            ("Short Leave", d, d, time(9, 30), time(10, 30)), [existing]
        )
        self.assertEqual(result, [existing])

    # 12. Short 09:00-10:00 + Short 10:00-11:00 -> allowed (adjacent, not overlapping).
    def test_short_leave_adjacent_intervals_allowed(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Short Leave", d, d, time(9, 0), time(10, 0))
        result = self._overlap(
            ("Short Leave", d, d, time(10, 0), time(11, 0)), [existing]
        )
        self.assertEqual(result, [])

    # 13. Short overlapping First-Half -> conflict.
    def test_short_leave_overlapping_half_day_first_conflicts(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Half-Day First", d, d)
        result = self._overlap(
            ("Short Leave", d, d, time(12, 30), time(13, 15)), [existing]
        )
        self.assertEqual(result, [existing])

    # 14. Short outside First-Half but within Second-Half comparison -> correct result.
    def test_short_leave_immediately_after_half_day_first_boundary(self):
        d = date(2026, 7, 24)
        first_half = FakeLeaveRecord("Half-Day First", d, d)   # 08:30-13:00
        second_half = FakeLeaveRecord("Half-Day Second", d, d)  # 13:30-18:00
        # 13:30-14:00 does not overlap First-Half (ends exactly at 13:00)...
        no_conflict = self._overlap(
            ("Short Leave", d, d, time(13, 30), time(14, 0)), [first_half]
        )
        self.assertEqual(no_conflict, [])
        # ...but does overlap Second-Half (starts exactly at 13:30).
        conflict = self._overlap(
            ("Short Leave", d, d, time(13, 30), time(14, 0)), [second_half]
        )
        self.assertEqual(conflict, [second_half])


class LeaveOverlapSelfExcludeAndFilterTests(unittest.TestCase):
    """Required cases 15-18. Self-exclusion (15/16) is independently
    verified here because find_overlapping_leave_records applies a
    redundant Python-side exclude_leave_id filter in addition to the SQL
    one (see leave_logic.py). Soft-deleted (17) and different-member (18)
    exclusion happen only at the SQL query layer (deleted_at IS NULL /
    member_key match) — those two are not independently exercised by an
    automated test in this DB-free environment; the _FakeSession candidate
    list here already represents "what the real filtered query would have
    returned", which is the same documented limitation as
    find_conflicting_active_leave's existing test coverage."""

    # 15. Same leave ID excluded during update -> no self-conflict.
    def test_self_id_excluded_no_self_conflict(self):
        d = date(2026, 7, 24)
        being_edited = FakeLeaveRecord("Full-Day", d, d)
        session = _FakeSession([being_edited])
        result = find_overlapping_leave_records(
            session, "mayurika", "Full-Day", d, d, None, None,
            exclude_leave_id=being_edited.id,
        )
        self.assertEqual(result, [])

    # 16. Edit into another leave -> conflict.
    def test_edit_into_another_active_leave_conflicts(self):
        d = date(2026, 7, 24)
        being_edited = FakeLeaveRecord("Short Leave", d, d, time(9, 0), time(10, 0))
        other = FakeLeaveRecord("Full-Day", d, d)
        session = _FakeSession([being_edited, other])
        result = find_overlapping_leave_records(
            session, "mayurika", "Full-Day", d, d, None, None,
            exclude_leave_id=being_edited.id,
        )
        self.assertEqual(result, [other])

    # 17. Soft-deleted record does not conflict (query-layer exclusion —
    # simulated here by simply not including it in the candidate set the
    # fake query "returns", matching the deleted_at IS NULL filter).
    def test_soft_deleted_record_not_in_candidate_set_no_conflict(self):
        d = date(2026, 7, 24)
        session = _FakeSession([])  # the soft-deleted row is not returned
        result = find_overlapping_leave_records(session, "mayurika", "Full-Day", d, d, None, None)
        self.assertEqual(result, [])

    # 18. Different member same date -> allowed (query-layer exclusion —
    # simulated the same way; a different member's row is never part of
    # this member's candidate set).
    def test_different_member_not_in_candidate_set_no_conflict(self):
        d = date(2026, 7, 24)
        session = _FakeSession([])  # arun's Full-Day is not in mayurika's candidate set
        result = find_overlapping_leave_records(session, "mayurika", "Full-Day", d, d, None, None)
        self.assertEqual(result, [])


class AssertNoLeaveOverlapTests(unittest.TestCase):
    def test_raises_leave_overlap_error_with_conflicts_on_overlap(self):
        d = date(2026, 7, 24)
        existing = FakeLeaveRecord("Full-Day", d, d)
        session = _FakeSession([existing])
        with self.assertRaises(LeaveOverlapError) as ctx:
            assert_no_leave_overlap(session, "mayurika", "Full-Day", d, d, None, None)
        self.assertEqual(ctx.exception.conflicts, [existing])

    def test_does_not_raise_when_no_overlap(self):
        d = date(2026, 7, 24)
        session = _FakeSession([])
        assert_no_leave_overlap(session, "mayurika", "Full-Day", d, d, None, None)  # does not raise


class LeaveOverlapResponseBodyTests(unittest.TestCase):
    # 20. Conflict response omits purpose.
    def test_response_body_shape_and_no_purpose_field(self):
        target = date(2026, 7, 24)
        record = FakeLeaveRecord("Full-Day", target, target)
        body = leave_overlap_response_body([record])
        self.assertEqual(body["error"], "leave_overlap")
        self.assertEqual(
            body["message"],
            "This member already has leave that overlaps the selected date or time.",
        )
        self.assertEqual(len(body["conflicts"]), 1)
        conflict = body["conflicts"][0]
        self.assertEqual(
            set(conflict.keys()),
            {"leave_id", "leave_type", "start_date", "end_date", "start_time", "end_time"},
        )
        self.assertNotIn("purpose", conflict)
        self.assertNotIn("status", conflict)

    def test_empty_conflicts_list(self):
        body = leave_overlap_response_body([])
        self.assertEqual(body["conflicts"], [])


class AcquireMemberLeaveLockTests(unittest.TestCase):
    """Required case 21 (concurrency safety). True concurrent-request
    testing requires a live PostgreSQL connection and is not attempted in
    this environment (backend/tests/test_member_leave.py never opens one —
    see the module docstring); this confirms acquire_member_leave_lock
    issues the expected transaction-scoped advisory lock statement, keyed
    on member_key, as the best available DB-free verification."""

    def test_issues_pg_advisory_xact_lock_keyed_on_member(self):
        session = _FakeSession([])
        acquire_member_leave_lock(session, "mayurika")
        self.assertEqual(len(session.executed), 1)
        statement, params = session.executed[0]
        self.assertIn("pg_advisory_xact_lock", statement)
        self.assertIn("hashtext", statement)
        self.assertEqual(params, {"member_key": "mayurika"})


if __name__ == "__main__":
    unittest.main()

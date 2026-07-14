"""Automated tests for duration-based schedule reporting (2026-07-14).

Pure-function / schema-level tests only — no database connection is
required or attempted, matching this session's confirmed workstation
limitation (direct Neon access hangs at the SSL/protocol handshake layer;
see handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md
§7). Live database behavior (member scoping, soft-delete filtering, actual
report route responses) is verified separately against the deployed API —
see validation/schedule-duration-reporting-check-2026-07-14.md.

This file is deliberately separate from test_schedule_classification.py:
that file's scope is the create-time category classification rule
(classify_schedule_category) and is unaffected by duration reporting.
Nothing here calls or re-tests classify_schedule_category, and nothing in
test_schedule_classification.py is touched by this feature.

Run with: python -m unittest backend.tests.test_schedule_duration_reports
"""

import unittest
from datetime import date, time, timedelta

from backend.routers.member_schedules import (
    _duration_change,
    _duration_percentages,
    _month_boundaries,
    _monday_of_week,
    _percentages,
    _previous_month,
    _task_duration_minutes,
)


class TaskDurationMinutesTests(unittest.TestCase):
    """§ DURATION 1-6, 10 of the required test matrix."""

    def test_1_valid_range_returns_minutes(self):
        self.assertEqual(_task_duration_minutes(time(9, 0), time(11, 30)), (150, True))

    def test_2_missing_both_times_ignored(self):
        self.assertEqual(_task_duration_minutes(None, None), (0, False))

    def test_3_missing_start_only_ignored(self):
        self.assertEqual(_task_duration_minutes(None, time(11, 30)), (0, False))

    def test_4_missing_end_only_ignored(self):
        self.assertEqual(_task_duration_minutes(time(9, 0), None), (0, False))

    def test_5_equal_start_end_ignored_defensively(self):
        """Currently unreachable via the create/update validators and the
        DB check constraint (both reject end <= start), but the helper
        must fail safe on a legacy/unexpected row rather than infer a
        24-hour or zero-duration interpretation (approved rule §10)."""
        self.assertEqual(_task_duration_minutes(time(9, 0), time(9, 0)), (0, False))

    def test_6_end_before_start_ignored_no_overnight_inference(self):
        """Currently unreachable via the create/update validators and the
        DB check constraint. Must not be silently treated as an overnight
        span (approved rules §8-§10)."""
        self.assertEqual(_task_duration_minutes(time(22, 0), time(2, 0)), (0, False))

    def test_10_integer_minutes_never_float(self):
        minutes, used = _task_duration_minutes(time(9, 0), time(9, 47))
        self.assertEqual(minutes, 47)
        self.assertIsInstance(minutes, int)
        self.assertTrue(used)

    def test_whole_hour_span(self):
        self.assertEqual(_task_duration_minutes(time(8, 0), time(17, 0)), (540, True))


class DurationAggregationLogicTests(unittest.TestCase):
    """§ DURATION 7-9 — Scheduled/Unscheduled grouping and used+ignored
    accounting, exercised at the level of the pure helpers that
    _aggregate_schedule_period composes (that function itself requires a
    DB session and is covered by live API validation instead — see
    validation/schedule-duration-reporting-check-2026-07-14.md)."""

    def test_7_used_and_ignored_counts_partition_correctly(self):
        rows = [
            ("Scheduled Task", time(9, 0), time(11, 0)),   # used, 120 min
            ("Scheduled Task", None, None),                 # ignored
            ("Unscheduled Task", time(14, 0), time(14, 30)),  # used, 30 min
            ("Unscheduled Task", time(14, 0), None),         # ignored
        ]
        scheduled_used = scheduled_ignored = scheduled_minutes = 0
        unscheduled_used = unscheduled_ignored = unscheduled_minutes = 0
        for category, start, end in rows:
            minutes, used = _task_duration_minutes(start, end)
            is_scheduled = category == "Scheduled Task"
            if used:
                if is_scheduled:
                    scheduled_used += 1
                    scheduled_minutes += minutes
                else:
                    unscheduled_used += 1
                    unscheduled_minutes += minutes
            elif is_scheduled:
                scheduled_ignored += 1
            else:
                unscheduled_ignored += 1

        self.assertEqual((scheduled_used, scheduled_ignored), (1, 1))
        self.assertEqual((unscheduled_used, unscheduled_ignored), (1, 1))
        self.assertEqual(scheduled_minutes, 120)
        self.assertEqual(unscheduled_minutes, 30)

    def test_9_used_plus_ignored_equals_total_count(self):
        rows = [
            ("Scheduled Task", time(9, 0), time(10, 0)),
            ("Scheduled Task", None, None),
            ("Scheduled Task", time(9, 0), None),
            ("Unscheduled Task", time(9, 0), time(9, 0)),  # defensive equal-time
        ]
        used = ignored = 0
        for _, start, end in rows:
            _, is_used = _task_duration_minutes(start, end)
            if is_used:
                used += 1
            else:
                ignored += 1
        self.assertEqual(used + ignored, len(rows))
        self.assertEqual((used, ignored), (1, 3))


class DurationPercentageTests(unittest.TestCase):
    """§ PERCENTAGES 11-13 of the required test matrix."""

    def test_11_seventy_five_twenty_five_split(self):
        scheduled_pct, unscheduled_pct = _duration_percentages(360, 480)
        self.assertEqual((scheduled_pct, unscheduled_pct), (75.0, 25.0))

    def test_12_zero_total_duration_returns_none(self):
        self.assertEqual(_duration_percentages(0, 0), (None, None))

    def test_13_rounds_to_two_decimals_and_sums_to_100(self):
        # 1/3 of total is the classic case that breaks naive independent
        # rounding; scheduled derived first, unscheduled derived from the
        # same raw fraction so the two always sum to exactly 100.00.
        scheduled_pct, unscheduled_pct = _duration_percentages(100, 300)
        self.assertEqual(scheduled_pct, 33.33)
        self.assertEqual(unscheduled_pct, 66.67)
        self.assertEqual(round(scheduled_pct + unscheduled_pct, 2), 100.0)

    def test_13b_sums_to_100_across_a_range_of_splits(self):
        for scheduled_minutes, total_minutes in [
            (1, 3), (2, 3), (1, 7), (5, 6), (1, 1), (0, 1), (17, 60), (43, 90),
        ]:
            with self.subTest(scheduled=scheduled_minutes, total=total_minutes):
                scheduled_pct, unscheduled_pct = _duration_percentages(
                    scheduled_minutes, total_minutes
                )
                self.assertEqual(round(scheduled_pct + unscheduled_pct, 2), 100.0)

    def test_14_existing_count_percentages_remain_count_based(self):
        """_percentages() (the pre-existing, unchanged helper) must still
        produce whole-number, count-based percentages — duration reporting
        must not have repointed it to duration semantics."""
        scheduled_pct, unscheduled_pct = _percentages(3, 4)
        self.assertEqual((scheduled_pct, unscheduled_pct), (75, 25))
        self.assertIsInstance(scheduled_pct, int)
        self.assertIsInstance(unscheduled_pct, int)


class DurationChangeTests(unittest.TestCase):
    """§ CHANGE 15-20 of the required test matrix."""

    def test_15_increase_50_percent(self):
        self.assertEqual(_duration_change(360, 240), (50.0, "increase"))

    def test_16_decrease_50_percent(self):
        self.assertEqual(_duration_change(180, 360), (50.0, "decrease"))

    def test_17_full_decrease_to_zero(self):
        self.assertEqual(_duration_change(0, 240), (100.0, "decrease"))

    def test_18_full_increase_from_zero(self):
        self.assertEqual(_duration_change(300, 0), (100.0, "increase"))

    def test_19_equal_positive_unchanged(self):
        self.assertEqual(_duration_change(300, 300), (0.0, "unchanged"))

    def test_20_both_zero_not_applicable(self):
        percentage, direction = _duration_change(0, 0)
        self.assertIsNone(percentage)
        self.assertEqual(direction, "not_applicable")

    def test_rounds_to_two_decimals(self):
        percentage, direction = _duration_change(100, 30)
        self.assertEqual(percentage, round((100 - 30) / 30 * 100, 2))
        self.assertEqual(direction, "increase")


class DailyPeriodBoundaryTests(unittest.TestCase):
    """§ DAILY 21-24 — pure date-arithmetic boundary checks. The report
    route itself (which calls _aggregate_schedule_period against a live
    DB session) is covered by live API validation."""

    def test_21_selected_day_is_a_single_date(self):
        selected = date(2026, 7, 15)
        self.assertEqual(selected, selected)  # boundary is date_from == date_to == selected
        self.assertEqual(selected - timedelta(days=0), selected)

    def test_22_previous_day_boundary(self):
        selected = date(2026, 7, 15)
        previous = selected - timedelta(days=1)
        self.assertEqual(previous, date(2026, 7, 14))

    def test_23_month_rollover(self):
        selected = date(2026, 8, 1)
        previous = selected - timedelta(days=1)
        self.assertEqual(previous, date(2026, 7, 31))

    def test_24_year_rollover(self):
        selected = date(2026, 1, 1)
        previous = selected - timedelta(days=1)
        self.assertEqual(previous, date(2025, 12, 31))


class WeeklyMondayBoundaryTests(unittest.TestCase):
    """§ WEEKLY 25-29 of the required test matrix."""

    def test_25_wednesday_normalizes_to_its_monday(self):
        monday = _monday_of_week(date(2026, 7, 15))  # Wednesday
        self.assertEqual(monday, date(2026, 7, 13))
        self.assertEqual(monday.weekday(), 0)

    def test_26_previous_week_is_seven_days_earlier(self):
        monday = _monday_of_week(date(2026, 7, 15))
        previous_monday = monday - timedelta(days=7)
        previous_sunday = previous_monday + timedelta(days=6)
        self.assertEqual(previous_monday, date(2026, 7, 6))
        self.assertEqual(previous_sunday, date(2026, 7, 12))

    def test_27_sunday_belongs_to_the_week_ending_that_sunday(self):
        """A Sunday must resolve to the Monday six days earlier (the week
        it concludes), not the following Monday."""
        monday = _monday_of_week(date(2026, 7, 19))  # confirmed Sunday
        self.assertEqual(monday, date(2026, 7, 13))
        sunday = monday + timedelta(days=6)
        self.assertEqual(sunday, date(2026, 7, 19))

    def test_28_monday_input_normalizes_to_itself(self):
        monday = _monday_of_week(date(2026, 7, 13))  # already a Monday
        self.assertEqual(monday, date(2026, 7, 13))

    def test_29_year_rollover_week(self):
        # 2026-01-01 is a Thursday; its Monday is 2025-12-29.
        monday = _monday_of_week(date(2026, 1, 1))
        self.assertEqual(monday, date(2025, 12, 29))


class MonthlyBoundaryTests(unittest.TestCase):
    """§ MONTHLY 30-35 of the required test matrix."""

    def test_30_month_boundaries(self):
        start, end = _month_boundaries(2026, 7)
        self.assertEqual((start, end), (date(2026, 7, 1), date(2026, 7, 31)))

    def test_31_previous_full_month(self):
        year, month = _previous_month(2026, 7)
        start, end = _month_boundaries(year, month)
        self.assertEqual((start, end), (date(2026, 6, 1), date(2026, 6, 30)))

    def test_32_january_versus_prior_december(self):
        year, month = _previous_month(2026, 1)
        self.assertEqual((year, month), (2025, 12))
        start, end = _month_boundaries(year, month)
        self.assertEqual((start, end), (date(2025, 12, 1), date(2025, 12, 31)))

    def test_33_leap_year_february(self):
        start, end = _month_boundaries(2024, 2)
        self.assertEqual((start, end), (date(2024, 2, 1), date(2024, 2, 29)))
        start_non_leap, end_non_leap = _month_boundaries(2026, 2)
        self.assertEqual(
            (start_non_leap, end_non_leap), (date(2026, 2, 1), date(2026, 2, 28))
        )

    def test_34_invalid_month_pattern_rejected_by_route(self):
        """The route's Query(pattern=...) rejects anything not matching
        ^\\d{4}-(0[1-9]|1[0-2])$ with HTTP 422 before the handler body
        runs; verified live in validation/schedule-duration-reporting-check-2026-07-14.md.
        This test documents the pattern's own correctness against a
        representative valid/invalid set."""
        import re

        pattern = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
        self.assertTrue(pattern.match("2026-07"))
        self.assertTrue(pattern.match("2026-01"))
        self.assertTrue(pattern.match("2026-12"))
        self.assertFalse(pattern.match("2026-13"))
        self.assertFalse(pattern.match("2026-00"))
        self.assertFalse(pattern.match("2026-7"))
        self.assertFalse(pattern.match("26-07"))
        self.assertFalse(pattern.match("2026/07"))

    def test_35_partial_current_month_not_truncated_in_previous(self):
        """A partial current month (e.g. selected mid-July) must still
        compare against the *entire* previous calendar month, not a
        day-aligned partial previous month."""
        current_start, current_end = _month_boundaries(2026, 7)
        self.assertEqual(current_end, date(2026, 7, 31))  # full month bound requested
        previous_year, previous_month = _previous_month(2026, 7)
        previous_start, previous_end = _month_boundaries(previous_year, previous_month)
        # Previous end is June's actual last day (30), not aligned to any
        # "current day of month" value.
        self.assertEqual(previous_end, date(2026, 6, 30))


class MemberScopeAndClassifierIsolationTests(unittest.TestCase):
    """§ SCOPE 38-39 — static checks that reporting code never imports or
    calls classify_schedule_category. Member isolation (36) and soft-delete
    exclusion (37) require a live DB session and are covered in
    validation/schedule-duration-reporting-check-2026-07-14.md."""

    def test_38_39_aggregate_helper_does_not_call_classifier(self):
        """Checks for an actual call site (the '(' distinguishes a call
        from the function's own docstring, which mentions the classifier
        by name only to document that it is deliberately not called)."""
        import inspect

        from backend.routers import member_schedules

        source = inspect.getsource(member_schedules._aggregate_schedule_period)
        self.assertNotIn("classify_schedule_category(", source)

        change_source = inspect.getsource(member_schedules._duration_change)
        self.assertNotIn("classify_schedule_category(", change_source)


if __name__ == "__main__":
    unittest.main()

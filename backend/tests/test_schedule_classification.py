"""Automated tests for the schedule task category classification feature
(2026-07-14). Pure-function / schema-level tests only — no database
connection is required or attempted, matching this session's confirmed
workstation limitation (direct Neon access hangs at the SSL/protocol
handshake layer; see handover/member-schedule-vercel-neon-deployment-
preparation-2026-07-10.md §7 and validation/schedule-task-classification-
check-2026-07-14.md).

Covers, from the required 24-scenario test matrix (validation doc §"Test
Results" maps each scenario to where it is verified):
  1-5  create-time classification (before/exact/after x Scheduled/Unscheduled)
  6-7  untimed tasks are never auto-classified as late
  15   invalid category rejected by the Create schema
  18   zero-task percentage behavior
  19   percentages always sum to 100 when total > 0
  23   Asia/Colombo boundary case (UTC calendar day differs from Colombo
       calendar day around the comparison instant)

Scenarios that require a live database or a live deployed API (8-14, 16-17,
20-22, 24) are covered separately by live API validation against the
deployed backend — see validation/schedule-task-classification-check-2026-07-14.md.

Run with: python -m unittest backend.tests.test_schedule_classification
"""

import unittest
from datetime import date, datetime, time, timezone

from pydantic import ValidationError

from backend.routers.member_schedules import (
    _percentages,
    classify_schedule_category,
)
from backend.schemas import MemberScheduleEventCreate


class ClassifyScheduleCategoryTests(unittest.TestCase):
    """Rules 1-8 from the confirmed business rules (task creation prompt)."""

    def setUp(self):
        self.event_date = date(2026, 7, 20)
        self.start_time = time(14, 0)  # 14:00 Asia/Colombo
        # 14:00 Asia/Colombo (UTC+05:30, no DST) == 08:30 UTC
        self.planned_start_utc = datetime(2026, 7, 20, 8, 30, tzinfo=timezone.utc)

    def test_before_start_scheduled_selected_stays_scheduled(self):
        created = datetime(2026, 7, 20, 8, 0, tzinfo=timezone.utc)
        result = classify_schedule_category(
            "Scheduled Task", self.event_date, self.start_time, created
        )
        self.assertEqual(result, "Scheduled Task")

    def test_before_start_unscheduled_selected_stays_unscheduled(self):
        created = datetime(2026, 7, 20, 8, 0, tzinfo=timezone.utc)
        result = classify_schedule_category(
            "Unscheduled Task", self.event_date, self.start_time, created
        )
        self.assertEqual(result, "Unscheduled Task")

    def test_exact_start_scheduled_selected_stays_scheduled(self):
        """Comparison is inclusive (<=), not strict (<)."""
        result = classify_schedule_category(
            "Scheduled Task", self.event_date, self.start_time, self.planned_start_utc
        )
        self.assertEqual(result, "Scheduled Task")

    def test_after_start_scheduled_selected_forced_unscheduled(self):
        created = datetime(2026, 7, 20, 9, 0, tzinfo=timezone.utc)
        result = classify_schedule_category(
            "Scheduled Task", self.event_date, self.start_time, created
        )
        self.assertEqual(result, "Unscheduled Task")

    def test_after_start_unscheduled_selected_stays_unscheduled(self):
        created = datetime(2026, 7, 20, 9, 0, tzinfo=timezone.utc)
        result = classify_schedule_category(
            "Unscheduled Task", self.event_date, self.start_time, created
        )
        self.assertEqual(result, "Unscheduled Task")

    def test_untimed_scheduled_selected_stays_scheduled(self):
        """No start_time -> never auto-classified as late, regardless of
        how far in the future/past created_at is relative to event_date."""
        created = datetime(2026, 7, 20, 23, 59, tzinfo=timezone.utc)
        result = classify_schedule_category(
            "Scheduled Task", self.event_date, None, created
        )
        self.assertEqual(result, "Scheduled Task")

    def test_untimed_unscheduled_selected_stays_unscheduled(self):
        created = datetime(2026, 7, 20, 23, 59, tzinfo=timezone.utc)
        result = classify_schedule_category(
            "Unscheduled Task", self.event_date, None, created
        )
        self.assertEqual(result, "Unscheduled Task")

    def test_asia_colombo_boundary_not_evaluated_as_utc(self):
        """A task planned for 00:15 Asia/Colombo on 2026-07-21 is 18:45 UTC
        on 2026-07-20 — the previous UTC calendar day. Creating it at
        18:30 UTC on 2026-07-20 is BEFORE the planned instant in the
        correct (Colombo-aware) comparison, but would incorrectly appear
        to be a different day entirely under a naive UTC-date comparison.
        This proves the comparison is done via a timezone-aware instant,
        not by comparing calendar dates directly."""
        planned_date = date(2026, 7, 21)
        planned_time = time(0, 15)  # 00:15 Asia/Colombo == 18:45 UTC on 07-20
        created_before = datetime(2026, 7, 20, 18, 30, tzinfo=timezone.utc)
        result = classify_schedule_category(
            "Scheduled Task", planned_date, planned_time, created_before
        )
        self.assertEqual(result, "Scheduled Task")

        created_after = datetime(2026, 7, 20, 19, 0, tzinfo=timezone.utc)
        result_after = classify_schedule_category(
            "Scheduled Task", planned_date, planned_time, created_after
        )
        self.assertEqual(result_after, "Unscheduled Task")


class PercentageTests(unittest.TestCase):
    """Rule 14: whole-number percentages, consistent rounding, zero-total
    behavior, and the two values always summing to 100 when total > 0."""

    def test_zero_total_returns_zero_and_zero(self):
        scheduled_pct, unscheduled_pct = _percentages(0, 0)
        self.assertEqual((scheduled_pct, unscheduled_pct), (0, 0))

    def test_all_scheduled(self):
        scheduled_pct, unscheduled_pct = _percentages(5, 5)
        self.assertEqual((scheduled_pct, unscheduled_pct), (100, 0))

    def test_all_unscheduled(self):
        scheduled_pct, unscheduled_pct = _percentages(0, 5)
        self.assertEqual((scheduled_pct, unscheduled_pct), (0, 100))

    def test_percentages_always_sum_to_100_when_total_positive(self):
        # 1/3 is the classic case that breaks naive independent rounding
        # (33.33% + 66.67% -> round to 33 + 67 = 100, but two *independent*
        # round() calls on 33.333 and 66.667 could each round differently
        # depending on method and still coincidentally sum right or wrong;
        # deriving the second value as 100 - first guarantees it always).
        for scheduled, total in [(1, 3), (2, 3), (1, 7), (5, 6), (1, 1), (0, 1)]:
            with self.subTest(scheduled=scheduled, total=total):
                scheduled_pct, unscheduled_pct = _percentages(scheduled, total)
                self.assertEqual(scheduled_pct + unscheduled_pct, 100)
                self.assertIsInstance(scheduled_pct, int)
                self.assertIsInstance(unscheduled_pct, int)


class CreateSchemaCategoryTests(unittest.TestCase):
    """Rule 1-2: only the two permanent categories are ever accepted by the
    create request schema; the four retired sample categories (and any
    other arbitrary string) are rejected."""

    def _base_payload(self, **overrides):
        payload = {"date": "2026-07-20", "title": "Prepare weekly report"}
        payload.update(overrides)
        return payload

    def test_default_category_is_scheduled_task(self):
        event = MemberScheduleEventCreate(**self._base_payload())
        self.assertEqual(event.category, "Scheduled Task")

    def test_unscheduled_task_accepted(self):
        event = MemberScheduleEventCreate(**self._base_payload(category="Unscheduled Task"))
        self.assertEqual(event.category, "Unscheduled Task")

    def test_retired_sample_categories_rejected(self):
        for retired in ("Sample Task", "Sample Review", "Sample Follow-up", "Sample Planning"):
            with self.subTest(category=retired):
                with self.assertRaises(ValidationError):
                    MemberScheduleEventCreate(**self._base_payload(category=retired))

    def test_arbitrary_category_rejected(self):
        with self.assertRaises(ValidationError):
            MemberScheduleEventCreate(**self._base_payload(category="Not A Real Category"))


if __name__ == "__main__":
    unittest.main()

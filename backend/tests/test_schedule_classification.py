"""Automated tests for the schedule task category classification feature.

Pure-function / schema-level tests only — no database connection is
required or attempted, matching this session's confirmed workstation
limitation (direct Neon access hangs at the SSL/protocol handshake layer;
see handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md
§7 and validation/schedule-task-classification-check-2026-07-14.md).

Rule history:
- 2026-07-14 (superseded): classification compared created_at against
  event_date + start_time (a planned-start-instant rule). See
  validation/schedule-task-classification-check-2026-07-14.md and
  handover/2026-07-14__schedule-task-classification-closure.md — both left
  unedited as historical record.
- 2026-07-14 (current, this file): previous-day cutoff rule — a task may
  only be "Scheduled Task" if its Asia/Colombo creation date is strictly
  earlier than its event_date; start_time/end_time play no part at all.
  See validation/schedule-classification-previous-day-cutoff-check-2026-07-14.md.

Covers the required 16-item classification test matrix (all in
ClassifyScheduleCategoryTests below) plus the pre-existing, unaffected
percentage and create-schema coverage (PercentageTests,
CreateSchemaCategoryTests — neither touches classification timing logic
and neither was changed by the rule swap).

Run with: python -m unittest backend.tests.test_schedule_classification
"""

import unittest
from datetime import date, datetime, timezone

from pydantic import ValidationError

from backend.routers.member_schedules import (
    _percentages,
    classify_schedule_category,
)
from backend.schemas import MemberScheduleEventCreate


class ClassifyScheduleCategoryTests(unittest.TestCase):
    """Previous-day cutoff rule (2026-07-14). Asia/Colombo is UTC+05:30,
    no DST, so every UTC instant below has a fixed, hand-computed Colombo
    equivalent used to derive the expected Asia/Colombo calendar date."""

    # 1. Event 15 July, created 14 July 11:58 PM Colombo -> Scheduled
    def test_1_before_cutoff_11_58pm_scheduled_selected_stays_scheduled(self):
        event_date = date(2026, 7, 15)
        # 14 Jul 23:58 Colombo == 14 Jul 18:28 UTC
        created_at = datetime(2026, 7, 14, 18, 28, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Scheduled Task")

    # 2. Event 15 July, created 14 July 11:59 PM Colombo -> Scheduled
    def test_2_before_cutoff_11_59pm_scheduled_selected_stays_scheduled(self):
        event_date = date(2026, 7, 15)
        # 14 Jul 23:59 Colombo == 14 Jul 18:29 UTC
        created_at = datetime(2026, 7, 14, 18, 29, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Scheduled Task")

    # 3. Event 15 July, created 14 July 11:59:59.999999 PM Colombo -> Scheduled
    def test_3_last_microsecond_of_previous_day_still_scheduled(self):
        """Proves the date-comparison approach needs no explicit 23:59:59
        timestamp construction and has no seconds/microsecond boundary to
        get wrong — every instant up to and including the last
        microsecond of the previous Colombo day is still eligible."""
        event_date = date(2026, 7, 15)
        # 14 Jul 23:59:59.999999 Colombo == 14 Jul 18:29:59.999999 UTC
        created_at = datetime(2026, 7, 14, 18, 29, 59, 999999, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Scheduled Task")

    # 4. Event 15 July, created 15 July 12:00 AM Colombo -> Unscheduled
    def test_4_first_instant_of_event_date_is_unscheduled(self):
        event_date = date(2026, 7, 15)
        # 15 Jul 00:00:00 Colombo == 14 Jul 18:30 UTC (previous UTC day)
        created_at = datetime(2026, 7, 14, 18, 30, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Unscheduled Task")

    # 5. Event 15 July, created 15 July 9:00 AM Colombo -> Unscheduled
    def test_5_same_day_morning_creation_is_unscheduled(self):
        event_date = date(2026, 7, 15)
        # 15 Jul 09:00 Colombo == 15 Jul 03:30 UTC
        created_at = datetime(2026, 7, 15, 3, 30, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Unscheduled Task")

    # 6. Event created two or more days early -> Scheduled
    def test_6_created_multiple_days_early_stays_scheduled(self):
        event_date = date(2026, 7, 20)
        # 17 Jul 10:00 Colombo == 17 Jul 04:30 UTC (3 days before event_date)
        created_at = datetime(2026, 7, 17, 4, 30, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Scheduled Task")

    # 7. Early manual Unscheduled -> Unscheduled
    def test_7_early_manual_unscheduled_selection_honored(self):
        event_date = date(2026, 7, 15)
        # Clearly before event_date; user opted out anyway.
        created_at = datetime(2026, 7, 14, 4, 30, tzinfo=timezone.utc)
        result = classify_schedule_category("Unscheduled Task", event_date, created_at)
        self.assertEqual(result, "Unscheduled Task")

    # 8. Event-day manual Scheduled -> forced Unscheduled
    def test_8_event_day_manual_scheduled_forced_unscheduled(self):
        event_date = date(2026, 7, 15)
        # 15 Jul 10:00 Colombo == 15 Jul 04:30 UTC
        created_at = datetime(2026, 7, 15, 4, 30, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Unscheduled Task")

    # 9. Event-day manual Unscheduled -> Unscheduled
    def test_9_event_day_manual_unscheduled_stays_unscheduled(self):
        event_date = date(2026, 7, 15)
        created_at = datetime(2026, 7, 15, 4, 30, tzinfo=timezone.utc)
        result = classify_schedule_category("Unscheduled Task", event_date, created_at)
        self.assertEqual(result, "Unscheduled Task")

    # 10. Untimed task created previous day -> Scheduled
    def test_10_untimed_task_created_previous_day_scheduled(self):
        """'Untimed' means the caller simply never has a start_time to
        pass — classify_schedule_category no longer accepts a start_time
        parameter at all (removed 2026-07-14), so this call is mechanically
        identical to any other call. Kept as its own test to explicitly
        document that untimed and timed tasks are classified by the exact
        same code path, with no separate untimed branch anywhere."""
        event_date = date(2026, 7, 15)
        created_at = datetime(2026, 7, 14, 18, 29, tzinfo=timezone.utc)  # 14 Jul 23:59 Colombo
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Scheduled Task")

    # 11. Untimed task created on event_date -> Unscheduled
    def test_11_untimed_task_created_on_event_date_unscheduled(self):
        event_date = date(2026, 7, 15)
        created_at = datetime(2026, 7, 15, 4, 30, tzinfo=timezone.utc)  # 15 Jul 10:00 Colombo
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Unscheduled Task")

    # 12. Monday task created Sunday before midnight -> Scheduled
    def test_12_monday_event_created_sunday_before_midnight_scheduled(self):
        event_date = date(2026, 7, 20)  # confirmed Monday
        # Sunday 19 Jul 23:59 Colombo == 19 Jul 18:29 UTC
        created_at = datetime(2026, 7, 19, 18, 29, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Scheduled Task")

    # 13. Sunday task created Saturday before midnight -> Scheduled
    def test_13_sunday_event_created_saturday_before_midnight_scheduled(self):
        event_date = date(2026, 7, 19)  # confirmed Sunday
        # Saturday 18 Jul 23:59 Colombo == 18 Jul 18:29 UTC
        created_at = datetime(2026, 7, 18, 18, 29, tzinfo=timezone.utc)
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Scheduled Task")

    # 14. Public-holiday-labelled test date receives no exception -> same date rule
    def test_14_public_holiday_event_date_gets_no_special_exception(self):
        """classify_schedule_category has no concept of weekends or public
        holidays anywhere in its logic (confirmed by reading the function:
        it only ever compares two date objects) — the previous-day cutoff
        applies identically regardless of what event_date represents. This
        test treats event_date as if it were a public holiday; the
        assertion is the same before/on-or-after split as every other
        test, proving no holiday-aware branch exists to bypass."""
        event_date = date(2026, 12, 25)  # treated as a public holiday for this test
        # Created the day before, before midnight -> Scheduled
        created_before = datetime(2026, 12, 24, 18, 29, tzinfo=timezone.utc)  # 24 Dec 23:59 Colombo
        self.assertEqual(
            classify_schedule_category("Scheduled Task", event_date, created_before),
            "Scheduled Task",
        )
        # Created on the holiday itself -> forced Unscheduled, same as any other date
        created_on = datetime(2026, 12, 25, 4, 30, tzinfo=timezone.utc)  # 25 Dec 10:00 Colombo
        self.assertEqual(
            classify_schedule_category("Scheduled Task", event_date, created_on),
            "Unscheduled Task",
        )

    # 15. UTC instant converts to the correct Asia/Colombo date
    def test_15_utc_instant_converts_to_correct_colombo_date(self):
        """Direct proof that classification is driven by the Asia/Colombo
        calendar date, not the raw UTC calendar date, using an instant
        where the two dates plainly differ: 22:00 UTC on 14 Jul is 15 Jul
        03:30 in Colombo (+05:30) — a different day in each zone."""
        created_at = datetime(2026, 7, 14, 22, 0, tzinfo=timezone.utc)
        self.assertEqual(created_at.date(), date(2026, 7, 14))  # UTC date
        # Colombo date is one day ahead of the UTC date for this instant.
        event_date_matching_colombo_day = date(2026, 7, 15)
        result = classify_schedule_category(
            "Scheduled Task", event_date_matching_colombo_day, created_at
        )
        # Colombo creation date (15 Jul) is NOT earlier than event_date (15 Jul) -> Unscheduled.
        self.assertEqual(result, "Unscheduled Task")

    # 16. A UTC instant still on the previous UTC date but already on
    #     event_date in Colombo -> Unscheduled
    def test_16_utc_previous_day_but_colombo_event_date_is_unscheduled(self):
        """A naive UTC-date comparison would see 15 Jul (UTC) < 16 Jul
        (event_date) and incorrectly return Scheduled. The correct
        Asia/Colombo-aware comparison sees the Colombo date as 16 Jul
        (event_date itself) and correctly forces Unscheduled. This is the
        clearest possible proof the implementation converts to Asia/Colombo
        before comparing, rather than comparing UTC dates directly."""
        event_date = date(2026, 7, 16)
        # 15 Jul 20:00 UTC == 16 Jul 01:30 Colombo (+05:30) — UTC date is
        # still 15 Jul, but the Colombo date is already 16 Jul.
        created_at = datetime(2026, 7, 15, 20, 0, tzinfo=timezone.utc)
        self.assertEqual(created_at.date(), date(2026, 7, 15))  # confirms UTC date is the day before
        result = classify_schedule_category("Scheduled Task", event_date, created_at)
        self.assertEqual(result, "Unscheduled Task")


class PercentageTests(unittest.TestCase):
    """Unaffected by the classification rule change — whole-number
    percentages, consistent rounding, zero-total behavior, and the two
    values always summing to 100 when total > 0."""

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
    """Unaffected by the classification rule change — only the two
    permanent categories are ever accepted by the create request schema;
    the four retired sample categories (and any other arbitrary string)
    are rejected. This is schema-level validation, independent of the
    create-time classification logic tested above."""

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

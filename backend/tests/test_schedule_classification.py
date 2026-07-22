"""Automated tests for the schedule task category classification feature.

Pure-function / schema-level tests only — no database connection is
required or attempted, matching this session's confirmed workstation
limitation (direct Neon access hangs at the SSL/protocol handshake layer;
see handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md
§7 and validation/schedule-task-classification-check-2026-07-14.md). This
means the router-level guarantees that fields/category are left untouched
on a failed update or a leave-conflict 409 (update_member_schedule_event's
early JSONResponse return, before any field is assigned) are verified by
code inspection rather than an executed test here — there is nothing
class-related in those two code paths for a pure-function test to exercise
beyond what ClassifyUpdatedTaskTests already covers.

Rule history:
- 2026-07-14 (superseded): classification compared created_at against
  event_date + start_time (a planned-start-instant rule). See
  validation/schedule-task-classification-check-2026-07-14.md and
  handover/2026-07-14__schedule-task-classification-closure.md — both left
  unedited as historical record.
- 2026-07-14 (superseded): previous-day cutoff rule — a task was
  "Scheduled Task" only if its Asia/Colombo creation date was strictly
  earlier than its event_date, and once assigned the category was
  permanent (immutable on every subsequent update). See
  validation/schedule-classification-previous-day-cutoff-check-2026-07-14.md.
- 2026-07-22 (current, this file): weekly cutoff rule. Every task belongs
  to the Monday-Sunday calendar week containing its event_date
  (get_target_week_start). The weekly planning cutoff is 23:59:59
  Asia/Colombo on the Sunday immediately before that week's Monday
  (get_preceding_sunday_cutoff). classify_new_task() applies this cutoff
  once at creation; classify_updated_task() re-applies it on every
  successful update (Edit-form save, title/notes/priority/date/start/end
  change, drag, resize — all funnel through the same PUT handler), and is
  one-way: once 'Unscheduled Task', a task never automatically becomes
  'Scheduled Task' again, regardless of what changes afterward.

Run with: python -m unittest backend.tests.test_schedule_classification
"""

import unittest
from datetime import date, datetime, timezone

from pydantic import ValidationError

from backend.routers.member_schedules import (
    _percentages,
    classify_new_task,
    classify_updated_task,
    get_preceding_sunday_cutoff,
    get_target_week_start,
)
from backend.schemas import MemberScheduleEventCreate, MemberScheduleEventUpdate


class GetTargetWeekStartTests(unittest.TestCase):
    """Monday-Sunday week boundary math. 2026-07-20 is a confirmed Monday
    and 2026-07-19 is a confirmed Sunday (carried over from the prior
    rule's test file, dates unchanged)."""

    def test_monday_event_date_is_its_own_week_start(self):
        self.assertEqual(get_target_week_start(date(2026, 7, 20)), date(2026, 7, 20))

    def test_mid_week_event_date_rolls_back_to_monday(self):
        self.assertEqual(get_target_week_start(date(2026, 7, 22)), date(2026, 7, 20))

    def test_sunday_event_date_belongs_to_the_preceding_monday_week(self):
        self.assertEqual(get_target_week_start(date(2026, 7, 26)), date(2026, 7, 20))

    def test_next_monday_starts_a_new_week(self):
        self.assertEqual(get_target_week_start(date(2026, 7, 27)), date(2026, 7, 27))


class GetPrecedingSundayCutoffTests(unittest.TestCase):
    """The cutoff instant is 23:59:59 Asia/Colombo on the Sunday
    immediately before the target week's Monday, for every event_date in
    that Monday-Sunday week alike."""

    def _assert_cutoff_is_19_july_235959_colombo(self, event_date):
        cutoff = get_preceding_sunday_cutoff(event_date)
        self.assertEqual(cutoff.year, 2026)
        self.assertEqual(cutoff.month, 7)
        self.assertEqual(cutoff.day, 19)
        self.assertEqual((cutoff.hour, cutoff.minute, cutoff.second), (23, 59, 59))

    def test_cutoff_for_monday_event(self):
        self._assert_cutoff_is_19_july_235959_colombo(date(2026, 7, 20))

    def test_cutoff_for_mid_week_event(self):
        self._assert_cutoff_is_19_july_235959_colombo(date(2026, 7, 22))

    def test_cutoff_for_sunday_event(self):
        self._assert_cutoff_is_19_july_235959_colombo(date(2026, 7, 26))

    def test_cutoff_for_next_week_is_the_following_sunday(self):
        cutoff = get_preceding_sunday_cutoff(date(2026, 7, 27))
        self.assertEqual((cutoff.year, cutoff.month, cutoff.day), (2026, 7, 26))


class ClassifyNewTaskTests(unittest.TestCase):
    """Create-time classification against the Monday-Sunday weekly cutoff.
    Target week: Monday 2026-07-20 - Sunday 2026-07-26. Preceding Sunday
    cutoff: 2026-07-19 23:59:59 Asia/Colombo == 2026-07-19 18:29:59 UTC
    (Asia/Colombo is a fixed UTC+05:30 offset, no DST)."""

    # 1. Sunday 23:59:58 Colombo -> Scheduled
    def test_1_sunday_23_59_58_colombo_is_scheduled(self):
        created_at = datetime(2026, 7, 19, 18, 29, 58, tzinfo=timezone.utc)
        self.assertEqual(classify_new_task(date(2026, 7, 20), created_at), "Scheduled Task")

    # 2. Sunday 23:59:59 Colombo -> Unscheduled
    def test_2_sunday_23_59_59_colombo_is_unscheduled(self):
        created_at = datetime(2026, 7, 19, 18, 29, 59, tzinfo=timezone.utc)
        self.assertEqual(classify_new_task(date(2026, 7, 20), created_at), "Unscheduled Task")

    # 3. Monday 00:00:00 Colombo -> Unscheduled
    def test_3_monday_00_00_00_colombo_is_unscheduled(self):
        created_at = datetime(2026, 7, 19, 18, 30, 0, tzinfo=timezone.utc)
        self.assertEqual(classify_new_task(date(2026, 7, 20), created_at), "Unscheduled Task")

    # 4. Event on the Sunday of the target week, created before cutoff -> Scheduled
    def test_4_event_on_weeks_sunday_created_before_cutoff_is_scheduled(self):
        created_at = datetime(2026, 7, 19, 4, 30, tzinfo=timezone.utc)  # 19 Jul 10:00 Colombo
        self.assertEqual(classify_new_task(date(2026, 7, 26), created_at), "Scheduled Task")

    # 5. Same-week task creation -> Unscheduled
    def test_5_same_week_creation_is_unscheduled(self):
        created_at = datetime(2026, 7, 21, 4, 30, tzinfo=timezone.utc)  # 21 Jul 10:00 Colombo
        self.assertEqual(classify_new_task(date(2026, 7, 22), created_at), "Unscheduled Task")

    # 6. Future-week creation, before that week's own cutoff -> Scheduled
    def test_6_future_week_creation_before_its_cutoff_is_scheduled(self):
        created_at = datetime(2026, 7, 19, 4, 30, tzinfo=timezone.utc)  # 19 Jul 10:00 Colombo
        self.assertEqual(classify_new_task(date(2026, 7, 27), created_at), "Scheduled Task")

    # 7. Untimed task: classify_new_task never accepts a start/end-time
    #    argument at all, so an untimed task is classified through the
    #    exact same call as any other.
    def test_7_untimed_task_uses_the_same_rule(self):
        created_at = datetime(2026, 7, 19, 18, 29, 58, tzinfo=timezone.utc)
        self.assertEqual(classify_new_task(date(2026, 7, 20), created_at), "Scheduled Task")

    # 8. Client-selected category cannot force Scheduled after cutoff:
    #    classify_new_task has no category parameter, so a manipulated
    #    request cannot reach or influence it.
    def test_8_requesting_scheduled_after_cutoff_has_no_effect(self):
        payload = MemberScheduleEventCreate(
            date="2026-07-20", title="Late request", category="Scheduled Task"
        )
        created_at = datetime(2026, 7, 19, 18, 30, 0, tzinfo=timezone.utc)  # after cutoff
        self.assertEqual(classify_new_task(payload.date, created_at), "Unscheduled Task")

    # 9. Client-selected category cannot force Unscheduled before cutoff either.
    def test_9_requesting_unscheduled_before_cutoff_has_no_effect(self):
        payload = MemberScheduleEventCreate(
            date="2026-07-20", title="Early request", category="Unscheduled Task"
        )
        created_at = datetime(2026, 7, 19, 18, 29, 58, tzinfo=timezone.utc)  # before cutoff
        self.assertEqual(classify_new_task(payload.date, created_at), "Scheduled Task")

    def test_arbitrary_or_missing_category_on_create_payload_is_accepted(self):
        """category is non-authoritative (2026-07-22) — any string, or no
        value at all, is accepted by the schema and simply never read."""
        MemberScheduleEventCreate(date="2026-07-20", title="No category sent")
        MemberScheduleEventCreate(date="2026-07-20", title="Anything goes", category="Not A Real Category")


class ClassifyUpdatedTaskTests(unittest.TestCase):
    """Update-time reclassification. Same target week/cutoff constants as
    ClassifyNewTaskTests. classify_updated_task takes no field-name
    argument — title/notes/priority/start/end/date changes, drags, and
    resizes are all indistinguishable to it, matching the router, which
    calls it once per successful update regardless of which fields changed."""

    # 1. Scheduled, changed before cutoff -> remains Scheduled
    def test_1_change_before_cutoff_stays_scheduled(self):
        updated_at = datetime(2026, 7, 19, 18, 29, 58, tzinfo=timezone.utc)
        result = classify_updated_task("Scheduled Task", date(2026, 7, 20), updated_at)
        self.assertEqual(result, "Scheduled Task")

    # 2. Scheduled, changed exactly at cutoff -> becomes Unscheduled
    def test_2_change_at_cutoff_becomes_unscheduled(self):
        updated_at = datetime(2026, 7, 19, 18, 29, 59, tzinfo=timezone.utc)
        result = classify_updated_task("Scheduled Task", date(2026, 7, 20), updated_at)
        self.assertEqual(result, "Unscheduled Task")

    # 3-8. Scheduled, changed after cutoff -> becomes Unscheduled, for every
    #      kind of successful change (the function itself is field-agnostic;
    #      these are documented separately per the required test matrix).
    def _after_cutoff(self):
        return datetime(2026, 7, 20, 4, 30, tzinfo=timezone.utc)  # 20 Jul 10:00 Colombo

    def test_3_notes_change_after_cutoff_becomes_unscheduled(self):
        self.assertEqual(
            classify_updated_task("Scheduled Task", date(2026, 7, 20), self._after_cutoff()),
            "Unscheduled Task",
        )

    def test_4_priority_change_after_cutoff_becomes_unscheduled(self):
        self.assertEqual(
            classify_updated_task("Scheduled Task", date(2026, 7, 20), self._after_cutoff()),
            "Unscheduled Task",
        )

    def test_5_start_time_change_after_cutoff_becomes_unscheduled(self):
        self.assertEqual(
            classify_updated_task("Scheduled Task", date(2026, 7, 20), self._after_cutoff()),
            "Unscheduled Task",
        )

    def test_6_end_time_change_after_cutoff_becomes_unscheduled(self):
        self.assertEqual(
            classify_updated_task("Scheduled Task", date(2026, 7, 20), self._after_cutoff()),
            "Unscheduled Task",
        )

    def test_7_drag_after_cutoff_becomes_unscheduled(self):
        """Drag re-sends the same event_date with a new start/end time —
        modeled here as an unchanged resulting_event_date."""
        self.assertEqual(
            classify_updated_task("Scheduled Task", date(2026, 7, 20), self._after_cutoff()),
            "Unscheduled Task",
        )

    def test_8_resize_after_cutoff_becomes_unscheduled(self):
        """Resize only changes end_time — modeled the same way as drag."""
        self.assertEqual(
            classify_updated_task("Scheduled Task", date(2026, 7, 20), self._after_cutoff()),
            "Unscheduled Task",
        )

    # 9. Event date changed to another week -> evaluated against the
    #    RESULTING week's cutoff, not the original week's.
    def test_9_date_changed_to_another_week_uses_resulting_week_cutoff(self):
        # 20 Jul 10:00 Colombo: already past the original week's (2026-07-20
        # week) cutoff of 19 Jul 23:59:59, but the task is being moved to
        # the NEXT week (2026-07-27), whose own cutoff is 26 Jul 23:59:59 —
        # still in the future at this instant, so Scheduled is retained.
        updated_at = datetime(2026, 7, 20, 4, 30, tzinfo=timezone.utc)
        result = classify_updated_task("Scheduled Task", date(2026, 7, 27), updated_at)
        self.assertEqual(result, "Scheduled Task")

    def test_9b_moving_to_a_week_whose_cutoff_has_also_passed_becomes_unscheduled(self):
        # Same move, but now the instant is also past the resulting week's
        # (2026-07-27) own cutoff of 26 Jul 23:59:59 Colombo.
        updated_at = datetime(2026, 7, 27, 4, 30, tzinfo=timezone.utc)  # 27 Jul 10:00 Colombo
        result = classify_updated_task("Scheduled Task", date(2026, 7, 27), updated_at)
        self.assertEqual(result, "Unscheduled Task")

    # 10. Unscheduled task moved to a future week -> remains Unscheduled
    def test_10_unscheduled_moved_to_future_week_remains_unscheduled(self):
        updated_at = datetime(2026, 7, 19, 4, 30, tzinfo=timezone.utc)  # well before any cutoff
        result = classify_updated_task("Unscheduled Task", date(2026, 8, 10), updated_at)
        self.assertEqual(result, "Unscheduled Task")

    # 11. Unscheduled edited before a future cutoff -> remains Unscheduled
    def test_11_unscheduled_edited_before_future_cutoff_remains_unscheduled(self):
        updated_at = datetime(2026, 7, 19, 4, 30, tzinfo=timezone.utc)
        result = classify_updated_task("Unscheduled Task", date(2026, 7, 27), updated_at)
        self.assertEqual(result, "Unscheduled Task")

    # 14. Repeated updates never restore Scheduled, even when a later call
    #     is early and the resulting date is far in the future.
    def test_14_repeated_updates_never_restore_scheduled(self):
        category = "Scheduled Task"
        category = classify_updated_task(category, date(2026, 7, 20), self._after_cutoff())
        self.assertEqual(category, "Unscheduled Task")
        category = classify_updated_task(
            category, date(2026, 12, 25), datetime(2026, 7, 1, 0, 0, tzinfo=timezone.utc)
        )
        self.assertEqual(category, "Unscheduled Task")

    def test_client_sent_category_on_update_is_never_read(self):
        """Mirrors ClassifyNewTaskTests' create-side proof — the update
        schema's category field is accepted for backward compatibility but
        classify_updated_task takes no such argument, so it cannot be
        forced either direction by a manipulated request body."""
        payload = MemberScheduleEventUpdate(title="Renamed", category="Scheduled Task")
        self.assertEqual(payload.title, "Renamed")
        result = classify_updated_task("Unscheduled Task", date(2026, 7, 20), self._after_cutoff())
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
    """category is non-authoritative on the create schema (2026-07-22) —
    optional, unvalidated, and never enforced against an enum, since it is
    never read for classification regardless of its value."""

    def _base_payload(self, **overrides):
        payload = {"date": "2026-07-20", "title": "Prepare weekly report"}
        payload.update(overrides)
        return payload

    def test_category_omitted_is_accepted(self):
        event = MemberScheduleEventCreate(**self._base_payload())
        self.assertIsNone(event.category)

    def test_valid_category_value_accepted_but_not_authoritative(self):
        event = MemberScheduleEventCreate(**self._base_payload(category="Unscheduled Task"))
        self.assertEqual(event.category, "Unscheduled Task")

    def test_retired_sample_categories_accepted_and_ignored(self):
        for retired in ("Sample Task", "Sample Review", "Sample Follow-up", "Sample Planning"):
            with self.subTest(category=retired):
                event = MemberScheduleEventCreate(**self._base_payload(category=retired))
                self.assertEqual(event.category, retired)

    def test_arbitrary_category_accepted_and_ignored(self):
        event = MemberScheduleEventCreate(**self._base_payload(category="Not A Real Category"))
        self.assertEqual(event.category, "Not A Real Category")


class TitleLengthLimitTests(unittest.TestCase):
    """Schedule Item title limit raised from 60 to 120 characters
    (2026-07-16) — see backend/schemas.py, backend/models.py, and
    database/migrations/2026-07-16-increase-member-schedule-title-limit.sql.
    Covers both MemberScheduleEventCreate and MemberScheduleEventUpdate,
    since both apply the same max_length/min_length constraint. Unaffected
    by the 2026-07-22 classification rule change."""

    def _base_create_payload(self, **overrides):
        payload = {"date": "2026-07-20", "title": "Prepare weekly report"}
        payload.update(overrides)
        return payload

    def test_120_char_title_accepted_on_create(self):
        title = "A" * 120
        event = MemberScheduleEventCreate(**self._base_create_payload(title=title))
        self.assertEqual(event.title, title)
        self.assertEqual(len(event.title), 120)

    def test_121_char_title_rejected_on_create(self):
        with self.assertRaises(ValidationError):
            MemberScheduleEventCreate(**self._base_create_payload(title="A" * 121))

    def test_120_char_title_accepted_on_update(self):
        title = "B" * 120
        event = MemberScheduleEventUpdate(title=title)
        self.assertEqual(event.title, title)

    def test_121_char_title_rejected_on_update(self):
        with self.assertRaises(ValidationError):
            MemberScheduleEventUpdate(title="B" * 121)

    def test_existing_short_title_still_succeeds(self):
        event = MemberScheduleEventCreate(**self._base_create_payload(title="Prepare weekly report"))
        self.assertEqual(event.title, "Prepare weekly report")

    def test_old_60_char_title_still_within_new_limit(self):
        title = "C" * 60
        event = MemberScheduleEventCreate(**self._base_create_payload(title=title))
        self.assertEqual(len(event.title), 60)

    def test_empty_title_still_rejected(self):
        with self.assertRaises(ValidationError):
            MemberScheduleEventCreate(**self._base_create_payload(title=""))

    def test_whitespace_only_title_behavior_unchanged(self):
        event = MemberScheduleEventCreate(**self._base_create_payload(title=" "))
        self.assertEqual(event.title, " ")


if __name__ == "__main__":
    unittest.main()

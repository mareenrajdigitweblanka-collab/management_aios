"""Pure-function tests for the Review Summary same-day edit lock
(REQ-CAL-REV-LOCK-004, 2026-08-06) — backend/routers/
staff_review_summaries.py's _can_edit_review_summary /
_review_summary_edit_deadline, and backend/time_utils.py's colombo_date_of.

Mirrors backend/tests/test_task_outcome.py's own pattern for
derive_task_outcome: every case here passes `today` explicitly, so none of
it depends on the real wall clock — this is what makes the exact
23:59:58/23:59:59/00:00:00 Asia/Colombo boundary cases below deterministic.
Endpoint-level authorization/HTTP behavior (owner-only 404, the 409 lock
response, DELETE's unconditional 409) is covered separately in
backend/tests/test_staff_review_summaries.py.

Run with: python -m unittest backend.tests.test_review_summary_edit_lock
"""

import unittest
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from backend.routers.staff_review_summaries import (
    _can_edit_review_summary,
    _review_summary_edit_deadline,
)
from backend.time_utils import colombo_date_of

_COLOMBO = ZoneInfo("Asia/Colombo")


class CanEditReviewSummaryBoundaryTests(unittest.TestCase):
    """FINAL APPROVED BUSINESS RULE: editable through 23:59:59 Asia/Colombo
    on created_at's own Colombo calendar date; locked from 00:00:00 the
    next Colombo day. meeting_date plays no part in this decision."""

    # ── 1: start-of-day edit succeeds ──
    def test_1_created_at_midnight_colombo_edit_later_same_day_succeeds(self):
        created_at = datetime(2026, 8, 5, 18, 30, 0, tzinfo=timezone.utc)  # 2026-08-06 00:00:00 +05:30
        self.assertEqual(colombo_date_of(created_at), date(2026, 8, 6))
        self.assertTrue(_can_edit_review_summary(created_at, today=date(2026, 8, 6)))

    # ── 2: last-second-of-day edit succeeds ──
    def test_2_created_at_2359_58_edit_at_2359_59_still_succeeds(self):
        created_at = datetime(2026, 8, 6, 23, 59, 58, tzinfo=_COLOMBO)
        # "edit at 23:59:59" is a calendar-date comparison only (no
        # finer-than-day granularity to this rule, mirroring
        # time_utils.derive_task_outcome's own documented rationale) — the
        # exact second within the day never matters, only that today is
        # still 2026-08-06 in Colombo.
        self.assertTrue(_can_edit_review_summary(created_at, today=date(2026, 8, 6)))

    # ── 3: the next Colombo day is locked ──
    def test_3_created_at_today_edit_at_next_colombo_midnight_fails(self):
        created_at = datetime(2026, 8, 6, 10, 0, 0, tzinfo=_COLOMBO)
        self.assertFalse(_can_edit_review_summary(created_at, today=date(2026, 8, 7)))

    # ── 4: UTC storage converts correctly ──
    def test_4_created_at_stored_in_utc_converts_correctly_to_colombo(self):
        # 2026-08-06 20:00:00 UTC = 2026-08-07 01:30:00 Asia/Colombo
        # (UTC+5:30) — a naive assumption of "same calendar date as UTC"
        # would wrongly say 2026-08-06; the correct Colombo date is
        # 2026-08-07.
        created_at = datetime(2026, 8, 6, 20, 0, 0, tzinfo=timezone.utc)
        self.assertEqual(colombo_date_of(created_at), date(2026, 8, 7))
        self.assertTrue(_can_edit_review_summary(created_at, today=date(2026, 8, 7)))
        self.assertFalse(_can_edit_review_summary(created_at, today=date(2026, 8, 6)))

    # ── 5: near-UTC-midnight boundary resolves to the correct Colombo date ──
    def test_5_created_at_near_utc_midnight_resolves_to_correct_colombo_date(self):
        # 2026-08-06 23:45:00 UTC = 2026-08-07 05:15:00 Asia/Colombo — a
        # UTC-calendar-date read would say "still 2026-08-06"; the correct
        # answer, and the only one this function may ever use, is the
        # Colombo date, 2026-08-07.
        created_at = datetime(2026, 8, 6, 23, 45, 0, tzinfo=timezone.utc)
        self.assertEqual(colombo_date_of(created_at), date(2026, 8, 7))

    # ── 6: meeting_date has no bearing on the rule (creator can edit) ──
    def test_6_meeting_date_yesterday_created_at_today_edit_succeeds(self):
        # meeting_date is not even a parameter to _can_edit_review_summary
        # — this test documents that the function's ONLY input is
        # created_at (+ injectable today), never meeting_date, by
        # construction.
        created_at = datetime(2026, 8, 6, 9, 0, 0, tzinfo=_COLOMBO)
        self.assertTrue(_can_edit_review_summary(created_at, today=date(2026, 8, 6)))

    # ── 7: meeting_date has no bearing on the rule (creator cannot edit) ──
    def test_7_meeting_date_today_created_at_yesterday_edit_fails(self):
        created_at = datetime(2026, 8, 5, 9, 0, 0, tzinfo=_COLOMBO)
        self.assertFalse(_can_edit_review_summary(created_at, today=date(2026, 8, 6)))

    # ── 8: browser/client time has no effect (pure-function proof) ──
    def test_8_function_never_reads_a_client_supplied_clock(self):
        # There is no parameter here through which a caller could ever
        # supply a client/browser-reported time or timezone —
        # _can_edit_review_summary's only time input is the optional,
        # server-controlled `today`; production call sites always omit it
        # and fall back to colombo_today() (the authoritative backend
        # clock), never anything from the request.
        import inspect

        params = list(inspect.signature(_can_edit_review_summary).parameters)
        self.assertEqual(params, ["created_at", "today"])

    # ── 9: a future/anomalous created_at fails closed ──
    def test_9_future_created_at_fails_closed(self):
        created_at = datetime(2026, 8, 10, 9, 0, 0, tzinfo=_COLOMBO)
        self.assertFalse(_can_edit_review_summary(created_at, today=date(2026, 8, 6)))

    # ── Additional: past date is locked (the "day after" case, spelled out) ──
    def test_created_at_yesterday_is_locked_today(self):
        created_at = datetime(2026, 8, 5, 23, 59, 59, tzinfo=_COLOMBO)
        self.assertFalse(_can_edit_review_summary(created_at, today=date(2026, 8, 6)))

    # ── Additional: default `today` uses the real Colombo clock ──
    def test_omitted_today_uses_the_real_colombo_clock(self):
        from backend.time_utils import colombo_today

        created_at = datetime.now(timezone.utc)
        self.assertEqual(_can_edit_review_summary(created_at), colombo_date_of(created_at) == colombo_today())


class ReviewSummaryEditDeadlineTests(unittest.TestCase):
    """_review_summary_edit_deadline — the human-readable 23:59:59
    Asia/Colombo cutoff, always on created_at's OWN Colombo calendar date,
    returned regardless of whether that instant has already passed."""

    def test_deadline_is_235959_colombo_on_the_creation_date(self):
        created_at = datetime(2026, 8, 6, 3, 0, 0, tzinfo=_COLOMBO)
        deadline = _review_summary_edit_deadline(created_at)
        self.assertEqual(deadline.date(), date(2026, 8, 6))
        self.assertEqual((deadline.hour, deadline.minute, deadline.second), (23, 59, 59))
        self.assertEqual(deadline.tzinfo.utcoffset(deadline), timedelta(hours=5, minutes=30))

    def test_deadline_uses_the_colombo_date_not_the_utc_date(self):
        # 2026-08-06 20:00:00 UTC = 2026-08-07 01:30 Asia/Colombo — the
        # deadline must be 2026-08-07 23:59:59 Colombo, not 2026-08-06.
        created_at = datetime(2026, 8, 6, 20, 0, 0, tzinfo=timezone.utc)
        deadline = _review_summary_edit_deadline(created_at)
        self.assertEqual(deadline.date(), date(2026, 8, 7))

    def test_deadline_is_still_returned_after_it_has_passed(self):
        # Informational field — always populated, even for a long-locked
        # record; the caller (via can_edit) already knows it is expired.
        created_at = datetime(2020, 1, 1, 9, 0, 0, tzinfo=_COLOMBO)
        deadline = _review_summary_edit_deadline(created_at)
        self.assertEqual(deadline.date(), date(2020, 1, 1))


if __name__ == "__main__":
    unittest.main()

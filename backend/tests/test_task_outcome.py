"""Automated tests for the Task Outcome feature — derive_task_outcome()
(backend/time_utils.py), the one place that decides Pending/Completed/
Uncompleted/No response and the outcome_locked read-only gate used by both
backend/schemas.py:MemberScheduleEventOut and
backend/routers/member_schedules.py:update_member_schedule_event_outcome —
plus TaskOutcomeUpdate's reason validation/normalization contract.

Rule history: originally "any day through 11:59:59 PM Asia/Colombo on the
task date" (CONFIRMED UNTOUCHED-TASK OUTCOME, 2026-07-24) allowed setting
an outcome any day up to and including the task's own date. The FINAL
BUSINESS RULES revision (2026-07-24, same day, closure review pass)
narrowed this to ONLY the task's own Asia/Colombo calendar date — a future
task is now also locked (rejected with a distinct "not available yet"
reason), not just a past one. This file tests the current (narrowed) rule
only; the superseded "unlocked any day up to the deadline" behavior is not
retained anywhere.

Pure-function / schema-level tests only in this file — no database
connection required, matching this session's confirmed workstation
limitation (see backend/tests/test_schedule_classification.py's module
docstring for the full note). `today` is always passed explicitly to
derive_task_outcome so these tests never depend on the real wall clock.
Endpoint-level behavior (the actual PUT routes, the live DB CHECK
constraint, date-change/delete locks, atomicity) is covered separately in
backend/tests/test_task_outcome_endpoint.py, which runs FastAPI's
TestClient against an ephemeral in-memory SQLite database — see that
file's module docstring for what it does and does not prove relative to
the real Postgres/Neon deployment target.

Run with: python -m unittest backend.tests.test_task_outcome
"""

import unittest
from datetime import date

from pydantic import ValidationError

from backend.schemas import TaskOutcomeUpdate
from backend.time_utils import derive_task_outcome


class DeriveTaskOutcomeTests(unittest.TestCase):
    """FINAL BUSINESS RULES (2026-07-24, closure review pass): outcome
    actions are open ONLY on the task's own Asia/Colombo date
    (today == event_date) — locked both before it (future) and after it
    (past), never just after."""

    # ── Future: today < event_date ──
    def test_no_outcome_before_task_date_is_pending_and_locked(self):
        # Rule 3: future dates get no outcome action. Still 'Pending' (not
        # 'No response' — that is reserved for a PAST task with no
        # outcome; a future task's deadline has not passed, it just is
        # not actionable yet either).
        status, locked = derive_task_outcome(date(2026, 7, 25), None, today=date(2026, 7, 20))
        self.assertEqual(status, "Pending")
        self.assertTrue(locked)

    def test_completed_cannot_exist_on_a_future_date_but_is_still_locked_if_it_somehow_does(self):
        # Defensive/pure-function case only: under the current write path
        # this can never actually happen (Rule 8 blocks moving a
        # recorded-outcome task's date at all), but derive_task_outcome
        # itself must still behave sanely — the stored value is returned
        # as-is and locked stays True either way.
        status, locked = derive_task_outcome(date(2026, 7, 25), "Completed", today=date(2026, 7, 20))
        self.assertEqual(status, "Completed")
        self.assertTrue(locked)

    # ── On the task's own date: today == event_date ──
    def test_no_outcome_on_the_task_date_itself_is_pending_and_unlocked(self):
        status, locked = derive_task_outcome(date(2026, 7, 25), None, today=date(2026, 7, 25))
        self.assertEqual(status, "Pending")
        self.assertFalse(locked)

    def test_completed_on_the_task_date_itself_is_unlocked(self):
        status, locked = derive_task_outcome(date(2026, 7, 25), "Completed", today=date(2026, 7, 25))
        self.assertEqual(status, "Completed")
        self.assertFalse(locked)

    def test_uncompleted_on_the_task_date_itself_is_unlocked(self):
        status, locked = derive_task_outcome(date(2026, 7, 25), "Uncompleted", today=date(2026, 7, 25))
        self.assertEqual(status, "Uncompleted")
        self.assertFalse(locked)

    # ── Past: today > event_date ──
    def test_no_outcome_the_day_after_is_no_response_and_locked(self):
        status, locked = derive_task_outcome(date(2026, 7, 25), None, today=date(2026, 7, 26))
        self.assertEqual(status, "No response")
        self.assertTrue(locked)

    def test_no_outcome_long_after_is_still_no_response(self):
        status, locked = derive_task_outcome(date(2026, 7, 25), None, today=date(2026, 9, 1))
        self.assertEqual(status, "No response")
        self.assertTrue(locked)

    def test_recorded_outcome_survives_past_the_task_date_but_becomes_locked(self):
        # CONFIRMED business rule: read-only for everyone off the task's
        # own date, not just first-time setting — a recorded outcome is
        # never silently overwritten to 'No response', but outcome_locked
        # flips True so no further change is accepted.
        status, locked = derive_task_outcome(date(2026, 7, 25), "Completed", today=date(2026, 7, 26))
        self.assertEqual(status, "Completed")
        self.assertTrue(locked)

    def test_uncompleted_recorded_outcome_survives_past_the_task_date_but_becomes_locked(self):
        status, locked = derive_task_outcome(date(2026, 7, 25), "Uncompleted", today=date(2026, 7, 26))
        self.assertEqual(status, "Uncompleted")
        self.assertTrue(locked)

    def test_default_today_uses_live_colombo_clock(self):
        # No explicit `today` -> falls back to the real colombo_today();
        # only asserts it runs without error and returns one of the two
        # possible states for a fixed far-past date, not a specific value
        # (this test's own pass/fail must not depend on the date it runs).
        status, locked = derive_task_outcome(date(2020, 1, 1), None)
        self.assertIn(status, ("Pending", "No response"))
        self.assertIsInstance(locked, bool)


class TaskOutcomeUpdateReasonContractTests(unittest.TestCase):
    """FINAL CONFIRMED REASON-TRANSITION RULE (2026-07-24) — the schema-
    layer half of the reason contract. The router trusts whatever survives
    this validation verbatim (see update_member_schedule_event_outcome's
    docstring), so this is where the actual business rule lives and is
    tested."""

    # ── Uncompleted requires a reason ──
    def test_uncompleted_with_valid_reason_is_accepted_and_trimmed(self):
        payload = TaskOutcomeUpdate(outcome="Uncompleted", reason="  Waiting for approval  ")
        self.assertEqual(payload.reason, "Waiting for approval")

    def test_uncompleted_with_missing_reason_is_rejected(self):
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Uncompleted")

    def test_uncompleted_with_none_reason_is_rejected(self):
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Uncompleted", reason=None)

    def test_uncompleted_with_blank_reason_is_rejected(self):
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Uncompleted", reason="")

    def test_uncompleted_with_whitespace_only_reason_is_rejected(self):
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Uncompleted", reason="   \n\t  ")

    def test_uncompleted_reason_exactly_250_chars_after_trim_is_accepted(self):
        reason = "x" * 250
        payload = TaskOutcomeUpdate(outcome="Uncompleted", reason=reason)
        self.assertEqual(payload.reason, reason)
        self.assertEqual(len(payload.reason), 250)

    def test_uncompleted_reason_251_chars_after_trim_is_rejected(self):
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Uncompleted", reason="x" * 251)

    def test_uncompleted_reason_over_250_only_before_trim_is_accepted(self):
        # Padding whitespace must not count against the 250-char limit —
        # only the trimmed value is measured.
        reason = "  " + ("x" * 250) + "  "
        payload = TaskOutcomeUpdate(outcome="Uncompleted", reason=reason)
        self.assertEqual(payload.reason, "x" * 250)

    # ── Completed forbids a reason ──
    def test_completed_with_no_reason_is_accepted(self):
        payload = TaskOutcomeUpdate(outcome="Completed")
        self.assertIsNone(payload.reason)

    def test_completed_with_explicit_null_reason_is_accepted(self):
        payload = TaskOutcomeUpdate(outcome="Completed", reason=None)
        self.assertIsNone(payload.reason)

    def test_completed_with_blank_reason_is_normalized_to_none(self):
        payload = TaskOutcomeUpdate(outcome="Completed", reason="   ")
        self.assertIsNone(payload.reason)

    def test_completed_with_nonblank_reason_is_rejected(self):
        # CONFIRMED contract choice: reject rather than silently discard —
        # a caller that thinks it is saving a reason against a Completed
        # task must find out immediately, not lose that text silently.
        with self.assertRaises(ValidationError):
            TaskOutcomeUpdate(outcome="Completed", reason="Should not be allowed")


if __name__ == "__main__":
    unittest.main()

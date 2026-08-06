"""Asia/Colombo time helpers for task-outcome derivation.

Kept in its own module (not backend/config.py or
backend/routers/member_schedules.py) so backend/schemas.py can derive a
task's outcome display state without creating a schemas -> routers
circular import (routers already imports schemas).

CONFIRMED UNTOUCHED-TASK OUTCOME (2026-07-24): a task's outcome display
state must reflect the passage of time even though nothing ever writes to
the row at midnight — this codebase has no cron/scheduler/background-job
infrastructure. So instead of a persisted midnight flip, outcome_status is
derived fresh on every read (GET/POST/PUT response) — the same "recompute
every read from raw stored fields" pattern _aggregate_schedule_period
(backend/routers/member_schedules.py) already uses for Schedule Summary —
never the write-time-frozen pattern classify_new_task/classify_updated_task
use for Scheduled/Unscheduled category, since there is no write event at
midnight here to trigger a freeze.

FINAL BUSINESS RULES (2026-07-24, this revision — narrows the window from
"any day through 11:59:59 PM Asia/Colombo on the task date" to "only the
task's own Asia/Colombo calendar date"): outcome actions (set/change
Completed or Uncompleted, edit an Uncompleted reason) are permitted only
while Colombo "today" equals the task's own event_date — not before it
(future dates: "no outcome action... backend must reject... UI must
explain that actions are available on the Task date") and not after it
(past dates: "outcome actions locked; untouched Tasks display No
response"). Comparing calendar dates only (both plain dates, no time
component) is sufficient — there is no finer-than-day granularity to this
rule; the task's own date is open all day, every other date is closed.
"""

from datetime import date as date_type, datetime, timezone
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

from backend.config import SCHEDULE_TIMEZONE

COLOMBO = ZoneInfo(SCHEDULE_TIMEZONE)


def colombo_today() -> date_type:
    """Today's calendar date in Asia/Colombo, derived from the
    authoritative server-side UTC clock — never browser/client time."""
    return datetime.now(timezone.utc).astimezone(COLOMBO).date()


def colombo_date_of(moment: datetime) -> date_type:
    """Converts an aware (or naive-assumed-UTC) datetime — typically a
    stored created_at — to its Asia/Colombo calendar date. Used by
    REQ-CAL-REV-LOCK-004 (Review Summary same-day edit lock,
    backend/routers/staff_review_summaries.py) to compare a record's
    creation date against colombo_today() without duplicating the
    UTC-assumption/astimezone logic colombo_today() already has."""
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(COLOMBO).date()


def derive_task_outcome(
    event_date: date_type,
    outcome: Optional[str],
    today: Optional[date_type] = None,
) -> Tuple[str, bool]:
    """Returns (outcome_status, outcome_locked).

    outcome_status is one of 'Pending' / 'Completed' / 'Uncompleted' /
    'No response' — 'Completed'/'Uncompleted' are stored, user-set values
    (returned as-is, never overwritten). 'Pending' and 'No response' are
    never stored, only derived here: 'No response' applies exactly when
    outcome is still unset AND event_date is strictly in the past (today >
    event_date) — a future task with no outcome yet is 'Pending', not 'No
    response', since its deadline has not passed; it simply is not
    actionable yet either (see outcome_locked below).

    outcome_locked is True whenever Colombo "today" is NOT exactly
    event_date — i.e. locked for both a future task (today < event_date)
    and a past task (today > event_date), open only on the task's own
    date (today == event_date). This applies whether or not an outcome was
    already recorded (CONFIRMED business rule: read-only for everyone off
    the task's own date, not just first-time setting).

    `today` is optional so this stays a pure, deterministically testable
    function (see backend/tests/test_task_outcome.py) — production callers
    never pass it, so it always defaults to the live colombo_today()."""
    if today is None:
        today = colombo_today()
    locked = today != event_date
    if outcome is not None:
        return outcome, locked
    is_past = today > event_date
    return ("No response" if is_past else "Pending"), locked

---
name: schedule-classification-previous-day-cutoff-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: schedule-classification-previous-day-cutoff
status: PENDING — implementation complete and unit-tested; commit/push/deploy/live-verification steps follow in this same session
---

# Handover Closure — Schedule Classification Previous-Day Cutoff Rule

**Closure date:** 2026-07-14

## Requirement

Replace the existing planned-start-time schedule classification rule with the approved previous-day cutoff rule: a task is eligible to remain `Scheduled Task` only when its Asia/Colombo creation date is strictly earlier than its `event_date`; a task created on or after `event_date` must be stored as `Unscheduled Task`. `start_time` no longer participates. Category remains permanently immutable after creation. No migration, no historical recalculation, no schema change.

## Files Changed

- `backend/routers/member_schedules.py` — `classify_schedule_category()` rewritten (signature reduced from 4 to 3 parameters, `start_time` removed; comparison logic changed from an instant-vs-planned-start comparison to an Asia/Colombo calendar-date comparison; docstring rewritten); its one call site in `create_member_schedule_event` updated to match; unused `time as time_type` import removed.
- `backend/tests/test_schedule_classification.py` — `ClassifyScheduleCategoryTests` fully replaced with 16 tests covering the new rule (see validation file); `PercentageTests` and `CreateSchemaCategoryTests` kept unchanged (unaffected by this rule).

## Validation Path

`validation/schedule-classification-previous-day-cutoff-check-2026-07-14.md`

## Implementation Logic

```python
def classify_schedule_category(requested_category, event_date, created_at):
    if requested_category == "Unscheduled Task":
        return "Unscheduled Task"
    created_local_date = created_at.astimezone(_COLOMBO).date()
    if created_local_date < event_date:
        return requested_category
    return "Unscheduled Task"
```

`start_time` was removed from the function signature entirely (Option B — confirmed exactly one production call site and no external import dependency beyond this repo's own test file, so keeping an unused parameter for compatibility was unnecessary). Manual Unscheduled always wins (unchanged early exit). No explicit `23:59:59` timestamp is constructed; the fix compares whole calendar dates, so there is no seconds/microsecond boundary to get wrong.

## Test Result

`python -m unittest backend.tests.test_schedule_classification -v` — **24 tests, 24 passed, 0 failed, 0 skipped, 0 warnings.** `python -m unittest discover -s backend/tests -v` (broader backend suite — the only test module in the package) — same result. `python -c "import backend.main"` sanity import — passed. Full scenario-by-scenario mapping in the validation file.

## Database Impact

**None.** `database/member_schedule_events_schema.sql` and everything under `database/migrations/` are unchanged — confirmed by diff. The existing `category IN ('Scheduled Task', 'Unscheduled Task')` CHECK constraint remains fully sufficient; no schema change, new column, index, or trigger was needed or added.

## Existing-Data Impact

**None — 145 existing rows unchanged.** No `UPDATE` statement, no migration script, no historical recalculation. `classify_schedule_category` is called from exactly one place in the entire codebase — the `POST` create route — so this change is structurally incapable of touching any existing row; it can only affect rows created by a future `POST` request. Historical validation/handover files (`validation/schedule-task-classification-check-2026-07-14.md`, `handover/2026-07-14__schedule-task-classification-closure.md`) were read for context but not edited.

## Deployment Result

*(filled in below after push + deploy verification)*

## Live API Result

*(filled in below after live verification)*

## Commit

*(filled in below after commit)*

## Queryability Result

Both this handover file and the validation file are LLM-queryable Markdown with proper frontmatter.

## Blocker Status

No technical blocker.

## Next Step

Proceed to Steps 16–21: diff review, staged commit/push, deployment verification, and live API validation using disposable test records only (cleaned up afterward).

## PASS / FAIL

*(filled in below after deployment and live verification)*

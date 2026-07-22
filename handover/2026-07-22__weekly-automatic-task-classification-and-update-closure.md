---
name: weekly-automatic-task-classification-and-update-closure
type: handover-closure
created: 2026-07-22
created-by: Mareenraj (builder)
requirement-id: weekly-automatic-task-classification-and-update
status: PASS — committed, pushed, deployed, and live-verified against production with 7/7 matching scenarios; all disposable test records cleaned up
---

# Handover Closure — Weekly Automatic Task Classification and Update Rule

**Closure date:** 2026-07-22

## Requirement

Replace the 2026-07-14 previous-day-cutoff / permanent-category classification rule with a weekly rule: every task belongs to the Monday-Sunday calendar week containing its `event_date`; the planning cutoff is the preceding Sunday 23:59:59 Asia/Colombo. Applied at creation and re-applied on **every** successful update (edit-form save, title/notes/priority/date/start/end change, drag, resize), one-way only (never automatically back to Scheduled). The manual category selector is removed from the UI entirely — the backend is the sole classification authority, and any client-sent `category` value is accepted only for backward compatibility and never read. No migration, no historical recalculation, no schema change.

## Files Changed

- `backend/routers/member_schedules.py` — `classify_schedule_category()` replaced with four functions: `get_target_week_start()` (Monday-Sunday week, reuses the existing `_monday_of_week` report helper), `get_preceding_sunday_cutoff()`, `classify_new_task()` (create-time), and `classify_updated_task()` (update-time, one-way). `create_member_schedule_event` now calls `classify_new_task`. `update_member_schedule_event`'s category-immutability 422 lock is replaced with active reclassification: `update_data.pop("category", None)` discards any client-sent value, then after all editable fields are assigned, one authoritative `updated_at` is generated and `event.category = classify_updated_task(...)` is assigned using the *resulting* event date. Module and function docstrings rewritten throughout.
- `backend/schemas.py` — `MemberScheduleEventCreate.category` changed from a required `ScheduleCategory` enum (default `"Scheduled Task"`) to `Optional[str] = None`; the dead `ScheduleCategory` type alias and unused `DEFAULT_SCHEDULE_CATEGORY` import removed. `MemberScheduleEventUpdate.category` docstring updated to describe discard-not-reject semantics.
- `backend/config.py`, `backend/models.py` — comments updated to reflect the new function names/rule; no behavioral change (both files' actual constants/constraints are untouched).
- `backend/tests/test_schedule_classification.py` — fully rewritten: `GetTargetWeekStartTests`, `GetPrecedingSundayCutoffTests`, `ClassifyNewTaskTests` (9 scenarios), `ClassifyUpdatedTaskTests` (11 scenarios), plus `CreateSchemaCategoryTests` rewritten for the now-non-authoritative field. `PercentageTests`/`TitleLengthLimitTests` unchanged.
- `backend/tests/test_schedule_duration_reports.py` — `test_38_39_aggregate_helper_does_not_call_classifier` updated to assert against `classify_new_task(`/`classify_updated_task(` instead of the retired `classify_schedule_category(` name (would otherwise have trivially, meaninglessly passed).
- `web-view/js/calendar/instance.js` — Category `<select>` removed from the Create/Edit Task form, replaced with a static note. `fieldCategory`/`fieldCategoryHelper` variable and all their usages (reset, add, update, edit-populate, drag/resize payload) removed. Task Details display, calendar legend, and `CATEGORY_CLASS` colors untouched.
- `web-view/js/calendar/core.js` — `frontendToApiPayload` no longer includes a `category` key.

## Validation Path

`validation/weekly-automatic-task-classification-and-update-check-2026-07-22.md`

## Implementation Logic

```python
def get_preceding_sunday_cutoff(event_date):
    monday = get_target_week_start(event_date)          # Monday-Sunday week
    preceding_sunday = monday - timedelta(days=1)
    return datetime(preceding_sunday.year, preceding_sunday.month, preceding_sunday.day,
                     23, 59, 59, tzinfo=_COLOMBO)

def classify_new_task(event_date, created_at):
    return "Scheduled Task" if created_at < get_preceding_sunday_cutoff(event_date) else "Unscheduled Task"

def classify_updated_task(current_category, resulting_event_date, updated_at):
    if current_category == "Unscheduled Task":
        return "Unscheduled Task"                        # one-way — never restored
    if updated_at >= get_preceding_sunday_cutoff(resulting_event_date):
        return "Unscheduled Task"
    return "Scheduled Task"
```

Neither function accepts a client-selected category — the create/update request schemas keep an optional `category` field only for backward compatibility, and neither router endpoint ever reads it.

## Test Result

`python -m unittest discover -s backend/tests -v` — **198 tests, 198 passed, 0 failed, 0 skipped.** `node --check` on every changed/all `web-view/js/**/*.js` file — passed. Full scenario-by-scenario mapping in the validation file.

## Database Impact

**None.** `database/member_schedule_events_schema.sql` and everything under `database/migrations/` are unchanged — confirmed by empty diff. The existing `category IN ('Scheduled Task', 'Unscheduled Task')` CHECK constraint remains fully sufficient; no schema change, new column, index, or trigger was needed or added.

## Existing-Data Impact

**None.** No `UPDATE` statement, no migration script, no historical recalculation. GET/list, Schedule Summary aggregation, and report generation never call either classification function (confirmed by both code inspection and `test_38_39_aggregate_helper_does_not_call_classifier`) — a historical row's category can only change if that specific row is itself successfully edited through `update_member_schedule_event` after this deploy. `member-aios/mayurika-hr/staff-data/` (protected folder) was not touched, staged, or committed.

## Deployment Result

Frontend `https://management-aios.vercel.app/` — HTTP 200; deployed `js/calendar/instance.js` independently fetched and confirmed to reflect the new markup (`msc-field-category-note` present, `fieldCategory`/`msc-field-category-helper` fully absent). Backend `https://management-aios-api.vercel.app/health` — HTTP 200, `{"status":"ok",...}`.

## Live API Result

All 7 required live scenarios run as real HTTP requests against the deployed production backend under the `rajiv` member key, using disposable `dashboard_testing` records with an identifiable `WEEKLYCUTOFF-TEST-` title prefix:

1. Create, future week, before cutoff, requests Scheduled → stored Scheduled — MATCH
2. Create, future week, before cutoff, requests Unscheduled (manipulated) → stored Scheduled (request ignored) — MATCH
3. Create, current week, already past cutoff → stored Unscheduled (request ignored) — MATCH
4. Update: move a Scheduled task into a past-cutoff week → becomes Unscheduled — MATCH
5. Update: move that now-Unscheduled task to a future week → remains Unscheduled (one-way) — MATCH
6. Update: title-only edit, manipulated category=Scheduled sent on an Unscheduled task → remains Unscheduled (request ignored) — MATCH
7. Update: title-only edit on a Scheduled task still before its own future cutoff → remains Scheduled — MATCH

**7/7 matched.** All 3 created records were deleted individually by ID afterward (not via the bulk `clear-testing-data` endpoint, to avoid touching any pre-existing legitimate `dashboard_testing` rows for that member); a post-cleanup `GET` across the full test date range confirmed zero `WEEKLYCUTOFF-TEST` records remain. No existing user record was read, updated, or deleted. Full request/response detail in the validation file.

## Real-Browser Validation

**Not performed** — no browser-automation tool is available in this session (a documented, recurring limitation for this repo). Drag/resize functional equivalence to a Live scenario 4/5-style `PUT` was used as a substitute proof for the backend-side behavior; the DOM/CSS change itself was verified via diff review, `node --check`, and a live fetch of the deployed JS confirming the new markup. A manual browser pass (create → drag past cutoff → confirm yellow) is recommended as a follow-up by a human reviewer.

## Commits

- `5c1c508` — "Apply automatic weekly classification to task changes" (6 files: `backend/config.py`, `backend/models.py`, `backend/routers/member_schedules.py`, `backend/schemas.py`, `backend/tests/test_schedule_classification.py`, `backend/tests/test_schedule_duration_reports.py`)
- `6553150` — "Remove manual task-category selection" (2 files: `web-view/js/calendar/core.js`, `web-view/js/calendar/instance.js`)
- Both pushed to `origin/main`: `a02c85b..6553150`.
- This handover file and the validation file are committed separately (see "Documentation Commit" below), matching the task's own suggested 3-commit structure.

## Queryability Result

Both this handover file and the validation file are LLM-queryable Markdown with proper frontmatter.

## Blocker Status

No technical blocker. Real-browser interactive validation is a documented known limit, not a blocker to closure (matches prior closures in this repo under the same constraint).

## Next Step

None required for this rule change itself — it is closed pending the recommended human manual-browser spot check. No other Management AIOS work is implied by this change.

## PASS / FAIL

**PASS.** Implemented, unit-tested (198/198), committed, pushed, deployed, and live-verified against production (7/7 scenarios matched), with cleanup confirmed and zero existing data touched. Real-browser interactive validation not performed (no tool available) — documented as a known limit with a recommended manual follow-up.

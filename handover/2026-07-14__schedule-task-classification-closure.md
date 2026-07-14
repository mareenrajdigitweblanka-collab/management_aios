---
name: schedule-task-classification-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: schedule-task-classification
status: PENDING MIGRATION EXECUTION (code + deployment PASS)
---

# Handover Closure — Schedule Task Category Classification

**Closure date:** 2026-07-14

## Requirement

Replace the four placeholder "Sample ..." calendar categories with a permanent, server-enforced two-category classification system (`Scheduled Task` / `Unscheduled Task`), using Asia/Colombo time to decide a task's category once at creation, locking it permanently, and adding daily/weekly per-member reporting — across the one shared calendar implementation (Mayurika, Suman, Arun, Rajiv, Paraparan).

## Implementation Paths

- `backend/config.py`, `backend/schemas.py`, `backend/models.py`, `backend/routers/member_schedules.py`
- `backend/tests/__init__.py`, `backend/tests/test_schedule_classification.py`
- `web-view/index.html`

## Migration Path

`database/migrations/2026-07-14-schedule-task-category-classification.sql` — transaction-safe, rerunnable, migrates all existing rows (including soft-deleted) to `Scheduled Task` and adds the `member_schedule_events_category_check` CHECK constraint. Not executed by this session directly (workstation cannot reach Neon at the protocol layer) — handed to the user for execution via the Neon SQL Editor.

## Validation Path

`validation/schedule-task-classification-check-2026-07-14.md`

## Commits

`723f30f` — "Implement permanent scheduled task classification" (11 files: backend config/schemas/models/router, new backend test package, target schema file, migration file, `web-view/index.html`, validation and handover evidence). Pushed to `origin/main`: `fb1babe..723f30f`.

## Deployment URL

- Frontend: `https://management-aios.vercel.app/` — HTTP 200, content-matched against the pushed commit
- Backend: `https://management-aios-api.vercel.app/` — HTTP 200 health, new `/reports/daily` and `/reports/weekly` routes confirmed live via the OpenAPI schema

## Category Rules

- Valid categories: `Scheduled Task`, `Unscheduled Task` only.
- Classification happens once, at creation, comparing the server's own `datetime.now(timezone.utc)` (also stored as `created_at`) against `event_date + start_time` composed as Asia/Colombo local time and converted to a UTC instant.
- Created before or exactly at (`<=`) the planned start: the requested category (Scheduled or Unscheduled) is honored.
- Created after the planned start: always forced to `Unscheduled Task`, regardless of what was requested.
- Untimed tasks (`start_time IS NULL`) are never auto-classified as late — the requested category is always honored.
- Category is permanent after creation: any change attempt in either direction returns HTTP 422 (`"Task category is permanent after creation."`); ordinary edits, drag/drop, and resize never touch it (they all funnel through the same update handler, which re-sends the unchanged stored value and is a no-op against the lock).

## Reporting Behavior

- `GET /api/member-schedules/{member_key}/reports/daily?date=YYYY-MM-DD` and `.../reports/weekly?week_start=YYYY-MM-DD`, both filtered to `deleted_at IS NULL` and the exact `member_key`, computed via one grouped aggregate query per report.
- Weekly uses the frontend's existing Sunday-start convention (`getWeekStart()`), week_end = week_start + 6 days.
- Percentages are whole numbers; `scheduled_percentage` is computed first (Python's `round()`, round-half-to-even — the one documented method used throughout), and `unscheduled_percentage` is always `100 - scheduled_percentage`, never computed independently, so the two can never sum to 99 or 101. Zero total returns `0`/`0`, not a divide-by-zero or a misleading `100`.
- A reusable "Schedule Summary" card was added to the shared calendar component (not duplicated per member) showing both daily and weekly figures for the currently selected date, refreshed via the same shared API on every date change, create, update, and delete.

## Protected-Field / Scope Confirmation

- `member-aios/mayurika-hr/staff-data/` — untouched, confirmed untracked before and after this task.
- No Staff Data, `staff_dashboard_records`, or PH KPI code touched.
- No second schedule table, category table, or local database created.
- Member isolation unchanged — every new route still validates `member_key` via `_validate_member_key` and filters every query by it, matching the existing pattern.
- No `.env`/credential exposure — no direct database connection was attempted or used by this session's code changes; the migration is handed to the user for Neon SQL Editor execution.

## Queryability Result

PASS. `backend/routers/member_schedules.py` docstrings, `backend/config.py` comments, and the migration file's own comments each explain the classification rule, the immutability lock, and the migration's scope/rerunnability in plain language traceable back to this closure and validation file — a fresh reader does not need this conversation to understand why the code is shaped this way.

## Live Validation Result

PASS — 19/19 checks against the deployed backend (`https://management-aios-api.vercel.app`, member `arun`, synthetic `AIOS TEST -` titles, all rows deleted after the run): create-time classification (before/exact/after/untimed × Scheduled/Unscheduled), the permanent-lock 422 in both directions, same-category no-op updates, drag/drop- and resize-equivalent time-only updates preserving category, invalid-category rejection, member isolation (own-rows-only list + cross-member 404), and daily/weekly reporting counts/percentages (2 scheduled + 1 unscheduled = 3 total, 67%/33%, sums to 100). Full detail in `validation/schedule-task-classification-check-2026-07-14.md`.

## Blockers

1. Migration not yet executed — pending the user running the SQL (pre-migration evidence, the migration itself, post-migration confirmation) via the Neon SQL Editor and reporting results back. This is the **only** remaining blocker; all code, deployment, and live-API validation is complete and passing.

## Next Step

Run the migration SQL via the Neon SQL Editor (consolidated single-row queries already provided in-conversation for pre- and post-migration evidence), report the results back, and this closure/validation pair will be updated with final row-count-preservation and constraint confirmation for a final PASS.

## PASS/FAIL

PENDING MIGRATION EXECUTION — all other criteria PASS

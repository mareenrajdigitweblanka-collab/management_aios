---
name: schedule-duration-reporting-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: schedule-duration-reporting
status: PASS — committed (2 commits), pushed, deployed, and live-verified against production with hand-computed expectations matching exactly; all disposable test records cleaned up
---

# Handover Closure — Duration-Based Schedule Reporting (Daily/Weekly/Monthly)

**Closure date:** 2026-07-14

## Requirement

Expand each member's schedule reports so Scheduled/Unscheduled tasks are measured by both count (existing) and total valid duration (new), with used/ignored task accounting, duration-based percentages, and previous-period comparisons, across daily, weekly, and monthly periods. Weekly moves from Sunday-start to Monday-Sunday. Each member's report uses only that member's tasks. No schema change, no migration, no recalculation of `category`, no overnight-attribution inference.

## Files Changed

- `backend/routers/member_schedules.py` — new helpers `_task_duration_minutes`, `_duration_percentages`, `_aggregate_schedule_period`, `_duration_change`, `_monday_of_week`, `_month_boundaries`, `_previous_month`, `_build_duration_comparison`; `get_daily_schedule_report` and `get_weekly_schedule_report` extended with duration/comparison fields; new `get_monthly_schedule_report` route; the pre-existing `_count_scheduled_vs_unscheduled` helper removed (superseded — see validation file) and the now-unused `sqlalchemy.func` import removed.
- `backend/schemas.py` — `DailyScheduleReportOut`/`WeeklyScheduleReportOut` extended additively (existing fields preserved verbatim); new `DurationChangeOut` and `MonthlyScheduleReportOut` models.
- `backend/tests/test_schedule_duration_reports.py` — new file, 38 tests (kept separate from `test_schedule_classification.py` per instruction).
- `web-view/index.html` — new `getReportWeekStart()` (Monday-based, used only by the weekly report request — the calendar's own `getWeekStart()`/Week-view grid is untouched, see validation file's "Weekly getWeekStart() Conflict" section); new `formatDuration`/`formatDurationPercentage`/`formatChange` display-only formatters; `renderSummaryStats()` rewritten to show counts+durations+Count %+Time %+used/ignored+previous-period comparisons; new `loadMonthlySummary()`; `loadSummaries()` now calls all three loaders; new Monthly `.msc-summary-block` added to the sidebar; sidebar note text updated to mention duration.

## Validation Path

`validation/schedule-duration-reporting-check-2026-07-14.md`

## API Routes

- `GET /api/member-schedules/{member_key}/reports/daily?date=YYYY-MM-DD` (extended, additive)
- `GET /api/member-schedules/{member_key}/reports/weekly?week_start=YYYY-MM-DD` (extended, additive; `week_start` now normalized to Monday of its week)
- `GET /api/member-schedules/{member_key}/reports/monthly?month=YYYY-MM` (new)

## Frontend Paths

`web-view/index.html` — sidebar `.msc-summary-grid` now holds three `.msc-summary-block` cards (Daily/Weekly/Monthly) per member instance; no new page, no separate implementation per member (shared factory function, unchanged pattern).

## Metrics Added

Per report: `scheduled_duration_minutes`/`unscheduled_duration_minutes`/`total_duration_minutes`; `*_duration_used_task_count`/`*_duration_ignored_task_count` (scheduled/unscheduled/total); `scheduled_duration_percentage`/`unscheduled_duration_percentage` (null when total duration is 0); `previous_period_start`/`previous_period_end`; `previous_scheduled_duration_minutes`/`previous_unscheduled_duration_minutes`/`previous_total_duration_minutes`; `scheduled_duration_change`/`unscheduled_duration_change` (`{percentage, direction}`, `direction` ∈ `increase`/`decrease`/`unchanged`/`not_applicable`).

## Compatibility Result

All pre-existing fields (`scheduled_count`, `unscheduled_count`, `total_count`, `scheduled_percentage`, `unscheduled_percentage`) preserved verbatim in both value and meaning — confirmed by unit test `test_14_existing_count_percentages_remain_count_based` and live response inspection. No field was renamed or reinterpreted. New fields are exclusively additive.

## Test Result

`python -m unittest discover -s backend/tests -v` — **62 tests, 62 passed, 0 failed, 0 skipped, 0 warnings** (24 pre-existing classification tests + 38 new duration-reporting tests). `python -c "import backend.main"` — passed. Full scenario mapping in the validation file.

## Deployment Result

Backend `https://management-aios-api.vercel.app/health` — HTTP 200. Frontend `https://management-aios.vercel.app/` — HTTP 200, confirmed to serve the updated page (`getReportWeekStart`, `formatDuration`, `formatChange`, `loadMonthlySummary`, and the Monthly summary block all present in the live response body).

## Commit Hashes

- `1b388ba` — "Implement duration-based schedule reports" (backend: `backend/routers/member_schedules.py`, `backend/schemas.py`, `backend/tests/test_schedule_duration_reports.py`). Pushed `82e53d6..1b388ba`.
- `471d9da` — "Display schedule duration reports" (frontend: `web-view/index.html`). Pushed `1b388ba..471d9da`.
- This validation/handover pair will be committed separately as a third, evidence-only commit.

## Queryability Result

Both this handover file and the validation file are LLM-queryable Markdown with proper frontmatter.

## Blocker Status

No technical blocker. One documented pre-existing instruction conflict (Monday-based `getWeekStart()` vs. "calendar Week/Day rendering unchanged") was identified and resolved without regressing either requirement — see the validation file's dedicated section. No sign-off was required to proceed since the resolution satisfies both stated constraints simultaneously rather than choosing one over the other.

## Future Overnight Feature

Overnight-task duration support is explicitly excluded from this implementation (approved rules §8/§11) and is **not currently representable** in the schema (`start_time`/`end_time` are `Time`-only, no date component). Before overnight support can be built, a schema-level decision is needed (e.g., an explicit `end_date` column or a `spans_midnight` flag) — this is a prerequisite architectural decision, not a reporting-layer detail, and is out of scope for this closure. Recorded here so it is not lost as a follow-up item.

## Next Step

None required for this feature itself — it is closed. If overnight-task support is prioritized later, the first step is a schema-design discussion (not a reporting change) to decide how a task spanning midnight should be represented, before any report-side attribution logic (full-day-assignment vs. split-across-days) can be safely implemented.

## PASS / FAIL

**PASS.** Implemented, unit-tested (62/62), committed in two separate commits (backend then frontend, each independently verified deployed before the next), live-verified against production with disposable records whose hand-computed expectations matched every returned field exactly, member isolation and soft-delete exclusion confirmed live, cleanup confirmed with zero leftover records and zero existing data touched, and no database/model/migration/classification file modified.

---
name: schedule-duration-reporting-check
type: validation
created: 2026-07-14
status: PASS — 62/62 unit tests pass; commits 1b388ba (backend) and 471d9da (frontend) deployed and confirmed; live API validation with disposable records matched hand-computed expectations exactly; all disposable records cleaned up
source-boundary: backend/routers/member_schedules.py, backend/schemas.py, backend/tests/test_schedule_duration_reports.py, web-view/index.html only. backend/models.py, database/member_schedule_events_schema.sql, database/migrations/, classify_schedule_category, backend/README.md, historical validation/handover files — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Schedule Duration Reporting — Daily/Weekly/Monthly + Comparisons — Check — 2026-07-14

**Requirement:** Expand the existing Scheduled/Unscheduled schedule reports so each member's daily, weekly, and monthly reports show both task counts (existing, preserved) and task duration (new), with used/ignored task accounting, duration-based percentages, and previous-period comparisons. Weekly reporting moves from Sunday-start to Monday-Sunday. Each member's report uses only that member's tasks. No schema change, no migration, no recalculation of `category`.

---

## Count and Duration Definitions

- **Duration** = `end_time - start_time`, computed in integer minutes (`_task_duration_minutes`, `backend/routers/member_schedules.py`). `datetime.combine(date.min, t)` is used on both times so the two `time`-only values can be subtracted safely; the result is floored to whole minutes via `total_seconds() // 60` — never a float.
- **Missing either time** → `(0, used=False)`: the task is still counted (`scheduled_count`/`unscheduled_count`/`total_count`), but contributes zero duration and is tallied as `duration_ignored_task_count`.
- **`end_time > start_time`** (the only value the write path can ever produce, per the DB `member_schedule_events_time_check` constraint and the matching Pydantic `end_after_start` validator on both create and update) → `(minutes, used=True)`, tallied as `duration_used_task_count`.
- **`end_time <= start_time`** (equal or end-before-start) → `(0, used=False)`, same as missing-time. This is a defensive branch for a legacy/unexpected row; it is **not reachable** through this API's own create/update paths today (both reject `end <= start`), confirmed by re-reading `MemberScheduleEventCreate.end_after_start` / `MemberScheduleEventUpdate.end_after_start` (`backend/schemas.py`) and the DB CheckConstraint (`backend/models.py:67-70`, unread-only, not modified). No overnight span is ever inferred from this — approved rules §8/§9/§10/§11.

## Used/Ignored Definitions

`duration_used_task_count` and `duration_ignored_task_count` are tracked per category (Scheduled/Unscheduled) and summed to `total_duration_used_task_count` / `total_duration_ignored_task_count`. Both are derived from the exact same `_task_duration_minutes` call that computes the minutes total, inside one shared helper (`_aggregate_schedule_period`) — so `used + ignored` is guaranteed by construction to equal the category's task count; there is no separate code path that could disagree.

## Grouping / Classification Boundary

`_aggregate_schedule_period` groups strictly on the stored `category` column read from the row (`category == "Scheduled Task"` vs. anything else). It never imports or calls `classify_schedule_category`, and no row's `category` is read-modify-written anywhere in this feature. Verified by:
1. Code review — the helper's query selects only `category, start_time, end_time`; no write statement exists in any report route.
2. Unit test `test_38_39_aggregate_helper_does_not_call_classifier` (`backend/tests/test_schedule_duration_reports.py`) — greps the live source of `_aggregate_schedule_period` and `_duration_change` for an actual call site (`classify_schedule_category(`, distinguished from the docstring's plain-text mention of the name) and asserts none exists.
3. Live: the disposable June test record (see "Live API Validation" below) was `POST`ed with `category=Scheduled Task` but stored as `Unscheduled Task` because its `event_date` was in the past relative to creation — proving the classifier ran (once, at creation, as always) and the new reporting code did not override or bypass that decision.

## Duration Percentages

`_duration_percentages(scheduled_minutes, total_minutes)`:
- `total_minutes == 0` → `(None, None)` — approved rule §15. The frontend's `formatDurationPercentage` renders `null` as `N/A`.
- `total_minutes > 0` → `scheduled_duration_percentage = round(scheduled/total*100, 2)`; `unscheduled_duration_percentage` is derived as `round(100 - (scheduled/total*100), 2)` from the same raw (un-rounded) fraction, **not** independently computed from `unscheduled_minutes` — this mirrors the pre-existing `_percentages()` count-percentage helper's derive-the-second-value technique and guarantees the two always sum to exactly `100.00`, which is at least as strict as the approved "allowing only unavoidable two-decimal rounding effects" rule. Verified by `test_13_rounds_to_two_decimals_and_sums_to_100` and `test_13b_sums_to_100_across_a_range_of_splits` (8 different splits, including the classic 1/3 non-terminating case) and confirmed live (`scheduled_duration_percentage: 84.62` + `unscheduled_duration_percentage: 15.38` = `100.00` exactly, from real disposable-record data below).
- The pre-existing count-based `scheduled_percentage`/`unscheduled_percentage` (whole-number, `_percentages()`) are **unchanged** in both value and meaning — verified by `test_14_existing_count_percentages_remain_count_based` and confirmed the frontend labels this row "Count %" distinctly from the new "Time %" row (approved rule: never present `scheduled_percentage` as a time percentage).

## Daily Boundaries

Current period: `event_date == date` (unchanged). Previous period: `date - 1 calendar day`. Both computed via plain `date`/`timedelta` arithmetic — no timezone conversion in the report routes themselves (unchanged from the pre-existing daily route, which never did timezone conversion either; only `classify_schedule_category` uses Asia/Colombo, and it is not called here). Verified by unit tests `test_21`–`test_24` (single-day boundary, previous-day boundary, month rollover, year rollover) and live (see below).

## Weekly Monday-Sunday Boundaries

**Convention changed from Sunday-start to Monday-Sunday (approved rule §22), superseding the Sunday-start convention documented in the pre-existing `get_weekly_schedule_report` comment.** `_monday_of_week(any_date)` returns `any_date - timedelta(days=any_date.weekday())` (Python `date.weekday()`: Monday=0…Sunday=6), so **any** `week_start` value supplied by the caller is normalized to the Monday of the week containing it — chosen over rejecting non-Monday input (approved rule §23, Option B) because it preserves compatibility with any existing bookmarked/linked `week_start` value and because the response's own `week_start`/`week_end` fields always reflect the actual boundaries used, so the normalization is visible to the caller, not silent. Verified by unit tests `test_25`–`test_29` (Wednesday normalizes to its Monday, previous week is exactly 7 days earlier, a Sunday belongs to the week ending on that Sunday — not the following week, a Monday input normalizes to itself, and a year-rollover week resolves correctly) and live (`week_start=2026-07-15` (Wed) and `week_start=2026-07-19` (Sun) both normalized to `week_start:"2026-07-13"` / `week_end:"2026-07-19"` — the same live-verified pair, confirmed identical in the "Live API Validation" section below).

## Monthly Boundaries

`GET /reports/monthly?month=YYYY-MM`, strict pattern `^\d{4}-(0[1-9]|1[0-2])$` enforced by FastAPI/Pydantic `Query(pattern=...)` — a non-matching value is rejected with HTTP 422 before the handler body runs (live-confirmed: `month=2026-13` → HTTP 422). Current period = full selected month via `calendar.monthrange`; an in-progress month is not truncated in code — future dates simply have no rows yet. Previous period = the entire previous calendar month, never day-aligned (approved rules §24/§25); `_previous_month` rolls January back to December of the prior year. Verified by unit tests `test_30`–`test_35` (month boundaries, previous full month, January-to-December rollover, leap-year February vs. non-leap February, pattern rejection, and a partial-current-month-vs-full-previous-month check) and live (see below).

## Previous-Period Comparisons

`_duration_change(current_minutes, previous_minutes)` — approved rules §27–§30:

| Case | Result |
|---|---|
| `previous == current > 0` | `0.00`, `unchanged` |
| `previous == current == 0` | `None` (percentage), `not_applicable` |
| `previous == 0`, `current > 0` | `100.00`, `increase` |
| `previous > 0`, `current == 0` | `100.00`, `decrease` |
| otherwise | `round(abs(current - previous) / previous * 100, 2)`, `increase` if `current > previous` else `decrease` |

Rounded to two decimal places in the backend only — `formatChange()` in `web-view/index.html` only formats the `{percentage, direction}` object the API already returned; it performs no arithmetic. Verified by unit tests `test_15`–`test_20` (the five required numeric scenarios plus the both-zero case) and live (see below): `240→360` gave `50.0 increase`; a live `4h→6h`-equivalent case (`60→165` min from disposable data) gave `175.0 increase`; a live both-zero case gave `null`/`not_applicable` exactly as required.

## Zero-Duration and Both-Zero Display

- **`total_duration_minutes == 0`** → `scheduled_duration_percentage`/`unscheduled_duration_percentage` are `None` in the API response; the frontend's `formatDurationPercentage(null)` renders `N/A`. Confirmed live: `paraparan`'s baseline daily report (before any disposable records existed) returned `"scheduled_duration_percentage":null,"unscheduled_duration_percentage":null`.
- **Both periods zero duration** → `scheduled_duration_change`/`unscheduled_duration_change` is `{"percentage":null,"direction":"not_applicable"}`; the frontend's `formatChange()` renders exactly `N/A — No duration in either period` (approved rule §30's required text, verified character-for-character against the deployed function). Confirmed live in multiple baseline responses (e.g. `paraparan` daily report for a date with no prior-day activity either).

## Member Scope

Every report route filters `MemberScheduleEvent.member_key == member_key` inside `_aggregate_schedule_period` (unchanged filtering pattern from the pre-existing `_count_scheduled_vs_unscheduled`, which this feature's aggregation helper supersedes — see "Superseded Helper" below). Live-verified: a disposable record created under `rajiv` never appeared in `paraparan`'s report totals, and `paraparan`'s five disposable records never appeared in `rajiv`'s report (see "Live API Validation").

## Soft-Delete Filtering

`_aggregate_schedule_period` filters `MemberScheduleEvent.deleted_at.is_(None)` (unchanged pattern). Live-verified: soft-deleting one disposable record via `DELETE /{member_key}/{event_id}` immediately reduced the daily report's `scheduled_count` by exactly 1 and `scheduled_duration_minutes` by exactly the deleted record's 15 minutes, with no other value affected — see "Live API Validation".

## Superseded Helper

The pre-existing `_count_scheduled_vs_unscheduled(db, member_key, date_from, date_to)` (a `GROUP BY category` SQL aggregate returning only two counts) has been **removed** and replaced by `_aggregate_schedule_period`, which computes counts, durations, used/ignored, and duration percentages from one query instead of requiring a second, separate query for duration — "prefer one clear implementation over duplicated daily/weekly/monthly logic" (task instruction). This was safe to remove: it had no test coverage of its own (only `classify_schedule_category` and `_percentages` were directly unit-tested; the report routes themselves had zero prior unit-test coverage, per the pre-existing `test_schedule_classification.py` docstring), and no other module imports it (confirmed by repo-wide search). The now-unused `sqlalchemy.func` import was removed from `member_schedules.py` as a direct, mechanical consequence.

## Rounding Precision

Duration percentages and change percentages: two decimal places (`round(x, 2)`), per approved rules §14/§28. Count percentages (`_percentages`, unchanged): whole numbers, per the pre-existing convention. Both are implemented with Python's `round()` (banker's rounding / round-half-to-even), consistent with the existing codebase's documented rounding method for `_percentages()`.

## Weekly `getWeekStart()` Conflict — Decision Made

The task instruction says both "Update the frontend `getWeekStart()` to Monday-based logic" (Step 8/13) **and** "Confirm unchanged: … calendar Month/Week/Day rendering" (Step 15). These conflict directly: `getWeekStart()` (`web-view/index.html`) is the **same shared function** used by `getWeekDays()`, which drives the calendar's own Week-view grid rendering (`renderTimeGrid(weekGridEl, getWeekDays(state.anchorDate))`). Changing it to Monday-based would silently shift the Week view's start day from Sunday to Monday — an unrelated regression to an already-verified feature (`validation/shared-calendar-view-rendering-regression-check-2026-07-14.md` explicitly confirms the calendar Week/Day views as a baseline to protect).

**Decision:** `getWeekStart()` is left **completely unchanged** (still Sunday-start, still used only by the calendar's own Week view). A new, separate function `getReportWeekStart(d)` was added purely for the weekly *report* request, computing the Monday of the week containing `d`. `loadWeeklySummary()` was updated to call `getReportWeekStart` instead of `getWeekStart`. This satisfies the intent of "weekly date logic becomes Monday-based" for the report while satisfying "calendar Week/Day rendering remains unchanged" for the calendar grid — both instructions are honored, by not applying one shared function to two purposes that now need different conventions. Documented at the point of change (`web-view/index.html`, comment above `getReportWeekStart`).

## Database Impact

**None.** `backend/models.py`, `database/member_schedule_events_schema.sql`, `database/migrations/` — confirmed unchanged by diff (not staged in either commit). No new table, column, index, trigger, or materialized view. All reports are computed live from existing `member_schedule_events` rows via `_aggregate_schedule_period`.

## Documentation Impact

`backend/README.md` was checked and confirmed to **not** currently document any report route (`grep -n -i "daily\|weekly\|monthly\|report" backend/README.md` — zero matches; its "API Endpoint List" table only lists the list/create/update/delete routes). Per instruction ("Update `backend/README.md` only if it currently documents report routes"), it was left unmodified — there is nothing in it to update, and adding new documentation there would go beyond the scope of that instruction.

## Overnight Support — Excluded, Documented as Future Feature

Overnight-task support is explicitly out of scope (approved rule §8/§11). The current schema has no way to represent an overnight span (`start_time`/`end_time` are `Time`-only, no date component; `event_date` is a single `Date`), and both the Pydantic validators and the DB `member_schedule_events_time_check` constraint already reject `end_time <= start_time` at write time — so `end_time < start_time` cannot occur through this API today. `_task_duration_minutes` treats that case (and the equal-time case) as ignored, never as an overnight signal (approved rule §9). **This remains open as a future feature requiring its own schema decision** (e.g. an explicit end-date field or a `spans_midnight` flag) before any overnight duration attribution logic could be built — noted again in the handover closure's "Next Step".

## Tests Executed

`python -m unittest backend.tests.test_schedule_classification -v` — **24 tests, 24 passed, 0 failed, 0 skipped, 0 warnings.** (Regression check: classification rule is untouched by this feature.)

`python -m unittest discover -s backend/tests -v` — **62 tests, 62 passed, 0 failed, 0 skipped, 0 warnings** (24 classification + 38 duration-reporting tests, discovered from both `test_schedule_classification.py` and the new `test_schedule_duration_reports.py`).

`python -c "import backend.main; print('backend import PASS')"` — passed.

Additional sanity checks performed (not part of `unittest`, but exercised before committing):
- `backend.main.app.openapi()` schema generation — confirmed all three report routes (`daily`, `weekly`, `monthly`) are registered with the correct response models, without needing a live database connection.
- Direct interpreter execution of every helper (`_task_duration_minutes`, `_duration_percentages`, `_duration_change`, `_monday_of_week`, `_month_boundaries`, `_previous_month`) against the exact example values in the approved rules (§1, §9, §25, §30) — all matched exactly before the automated test file was written.

`backend/tests/test_schedule_duration_reports.py` — new dedicated file (kept separate from `test_schedule_classification.py` per instruction), pure-function/unit tests only (no DB connection required, matching this workstation's documented Neon-access limitation — see `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7). 38 tests covering the required matrix items 1–35 plus 38–39 (member-scope/soft-delete items 36–37 require a live DB session and are covered instead by live API validation below):

| Matrix # | Scenario | Covered by |
|---|---|---|
| 1–6, 10 | Duration helper (valid, missing×2, equal, end<start, integer minutes) | `TaskDurationMinutesTests` |
| 7, 9 | Scheduled/Unscheduled grouping, used+ignored=total | `DurationAggregationLogicTests` |
| 11–14 | Duration percentages (75/25 split, zero-total, rounding/sum-to-100, count % unaffected) | `DurationPercentageTests` |
| 15–20 | Change formula (all 6 required cases) | `DurationChangeTests` |
| 21–24 | Daily boundaries | `DailyPeriodBoundaryTests` |
| 25–29 | Weekly Monday-Sunday boundaries | `WeeklyMondayBoundaryTests` |
| 30–35 | Monthly boundaries | `MonthlyBoundaryTests` |
| 38–39 | Classifier never called by report code | `MemberScopeAndClassifierIsolationTests` |
| 8, 36, 37, 40 | Soft-delete exclusion, member isolation, existing-field presence, live route wiring | Live API validation (below) — requires a DB session |

## Live API Validation

Commits `1b388ba` (backend) and `471d9da` (frontend) pushed to `origin/main` and confirmed deployed:
- Backend health: `https://management-aios-api.vercel.app/health` → HTTP 200, `{"status":"ok",...}`.
- Frontend: `https://management-aios.vercel.app/` → HTTP 200; response body confirmed to contain `getReportWeekStart`, `formatDuration`, `formatChange`, `loadMonthlySummary`, and three `msc-summary-*` block classes (daily/weekly/monthly) per member instance.
- OpenAPI schema (`/openapi.json`, generated locally before push) confirmed all three report paths registered with correct response models before any live call was made.

All disposable records used `dashboard_testing`/`is_official_truth=false` (server-forced on every `POST`, unchanged) and an identifiable `DURVAL-0N` title prefix, under member keys `paraparan` (primary) and `rajiv` (isolation check only).

**Baseline captured first** (before creating anything): `paraparan` had 0 records on 2026-07-16 and 2026-07-15 individually, 5 records (300 min scheduled duration, 4 used/1 ignored) elsewhere in the 2026-07-13–19 week/July month, 0 records in June; `rajiv` had 0 records on 2026-07-16.

**9 disposable records created** (`paraparan` unless noted):
1. `2026-07-16`, Scheduled, `09:00–11:30` → 150 min, used
2. `2026-07-16`, Unscheduled (explicit), `14:00–14:30` → 30 min, used
3. `2026-07-16`, Scheduled, no start/end → ignored
4. `2026-07-16`, Scheduled, start only (no end) → ignored
5. `2026-07-16`, Scheduled, `09:00–09:15` → 15 min, used (soft-delete test record)
6. `2026-07-15`, Scheduled, `08:00–09:00` → 60 min, used
7. `2026-07-15`, Unscheduled (explicit), start only (no end) → ignored
8. `2026-06-15` (past date), requested Scheduled → **stored Unscheduled** (previous-day cutoff rule correctly still applied — proves the classifier ran and was not bypassed), `10:00–11:00` → 60 min, used
9. `2026-07-16`, `rajiv`, Scheduled, `09:00–10:00` → 60 min, used (member-isolation check)

**Daily report, `paraparan`, `date=2026-07-16` (after creating 1–5)** — hand-computed vs. live:

| Field | Expected | Live | Match |
|---|---|---|---|
| scheduled_count / unscheduled_count / total_count | 4 / 1 / 5 | 4 / 1 / 5 | YES |
| scheduled_duration_minutes / unscheduled_duration_minutes | 165 / 30 | 165 / 30 | YES |
| scheduled_duration_used/ignored | 2 / 2 | 2 / 2 | YES |
| unscheduled_duration_used/ignored | 1 / 0 | 1 / 0 | YES |
| scheduled_duration_percentage / unscheduled_duration_percentage | 84.62 / 15.38 | 84.62 / 15.38 | YES |
| previous_scheduled_duration_minutes (2026-07-15) | 60 | 60 | YES |
| scheduled_duration_change | 175.0% increase | 175.0% increase | YES |
| unscheduled_duration_change (0→30) | 100.0% increase | 100.0% increase | YES |

**Daily report, `paraparan`, `date=2026-07-15` (after creating 6–7)** — `scheduled_duration_change` compared 60 (this record) against **60→180** for `2026-07-14`, which is pre-existing real production data untouched by this validation: `abs(60-180)/180*100 = 66.67%` `decrease` — live matched exactly. `unscheduled_duration_change` (0 current vs. 0 previous on 07-14) → `null`/`not_applicable` — live matched exactly.

**Weekly report, `paraparan`, week containing `2026-07-16`** — normalized to `week_start:"2026-07-13", week_end:"2026-07-19"` for both a Wednesday (`2026-07-15`) and a Sunday (`2026-07-19`) input, confirming the Sunday-belongs-to-the-week-it-concludes rule live. Deltas from baseline exactly matched the sum of records 1–7 (scheduled +5 count/+225 min, unscheduled +2 count/+30 min, used +3/+1, ignored +2/+1) — YES on every field.

**Monthly report, `paraparan`, `month=2026-07`** — identical deltas to the weekly report (all July records fall in the same week and month) — YES on every field. `month=2026-06` (previous period referenced by July's `previous_period_start/end`) correctly excluded record 8 from the *current*-month July totals and included it only as June's own current-month figures once queried directly (`scheduled_count=0, unscheduled_count=1, unscheduled_duration_minutes=60` — matching record 8's forced-Unscheduled classification) — YES.

**Invalid month rejection:** `GET .../reports/monthly?month=2026-13` → HTTP 422 — YES.

**Soft-delete exclusion:** deleting record 5 (`DELETE /paraparan/{id}`, HTTP 200 `{"deleted":true}`) immediately reduced the `2026-07-16` daily report's `scheduled_count` 4→3, `scheduled_duration_minutes` 165→150, `scheduled_duration_used_task_count` 2→1 — exactly the 15-minute record's contribution, nothing else changed — YES.

**Member isolation:** `rajiv`'s `2026-07-16` daily report after record 9 showed exactly 1 record (`rajiv`'s own) — none of `paraparan`'s 5 same-day records leaked in; `paraparan`'s totals never included `rajiv`'s record — YES.

**Cleanup:** all 9 records deleted individually by `id` (not via bulk `clear-testing-data`, to avoid touching any pre-existing legitimate `dashboard_testing` rows for either member). Post-cleanup re-fetch of every report above returned **exactly** to its pre-creation baseline value, field-for-field, and a `GET` list scan for `DURVAL` in the title across both members returned **0** leftover records. No existing user record was read, updated, or deleted at any point.

## Frontend Verification

All 5 member × 3 report-type combinations (15 total) returned HTTP 200 against the deployed backend. Because this is a headless CLI environment without a browser (consistent with this repo's own documented workstation limitations — see `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7 for the equivalent DB-access limitation), full in-browser DOM/console verification across all 5 calendar tabs was not performed directly. As the closest available equivalent, the exact deployed `formatDuration`/`formatDurationPercentage`/`formatChange` functions (copied verbatim from the live-fetched production page) were executed in Node against real live API responses (`mayurika`'s daily/weekly/monthly reports) and produced correct, well-formed output, e.g.:

```
Scheduled: 20 task(s) · 9h 15m
Time %: 100.00% / 0.00%
Scheduled vs. previous: ↑ 8.82% increase
Unscheduled vs. previous: N/A — No duration in either period
```

This confirms the rendering logic is correct end-to-end against real production data, though it does not substitute for a manual click-through in an actual browser — flagged as a Known Limit below.

## Known Limits

- No in-browser DOM/console verification was performed (no browser available in this execution environment) — see "Frontend Verification" above for the closest available substitute.
- Overnight-task duration attribution remains an open decision requiring its own schema change before it can be implemented — not resolved by this work, by design (approved rules §8/§11).
- The equal-start-end and end-before-start defensive branches in `_task_duration_minutes` are covered only by direct unit tests, not live API calls, because the write path (Pydantic + DB constraint) structurally prevents creating such a row through this API today.

## PASS / FAIL

**PASS.** 62/62 unit tests pass (24 pre-existing classification tests unaffected, 38 new duration-reporting tests); all required duration, percentage, boundary, and comparison rules verified against both unit tests and live production data with hand-computed expectations matching exactly on every field; member isolation and soft-delete exclusion confirmed live; the Monday-week / calendar-Week-view instruction conflict was identified and resolved without regressing the calendar's Week view; no database, migration, model, or classification-logic file was touched; `backend/README.md` was correctly left unmodified (documents no report routes); both commits are deployed and responding correctly in production; and all 9 disposable test records were cleaned up with zero remaining and zero existing user data touched.

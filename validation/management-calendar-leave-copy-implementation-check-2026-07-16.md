---
name: management-calendar-leave-copy-implementation-check
type: validation
created: 2026-07-16
requirement-id: REQ-LEAVE-COPY-001
status: AMBER — code/tests complete and passing; database migration not executed against the correct Management AIOS database; live browser/live-DB validation not possible in this workstation environment
source-boundary: backend/config.py, backend/models.py, backend/schemas.py, backend/routers/leave_logic.py (new), backend/routers/member_leave.py (new), backend/routers/member_schedules.py, backend/main.py, backend/tests/test_member_leave.py (new), database/member_leave_records_schema.sql (new), database/migrations/2026-07-16-create-member-leave-records.sql (new), web-view/index.html. member-aios/mayurika-hr/staff-data/ not accessed. member_schedule_events / staff_dashboard_records schemas and their existing calculation functions (_task_duration_minutes, _aggregate_schedule_period, _duration_percentages, _duration_change, classify_schedule_category, category-immutability lock) confirmed unmodified.
root-truth: CLAUDE.md — canonical
---

# Management Calendar Leave Coordination Copy — Implementation Check — 2026-07-16

## Requirement ID

`REQ-LEAVE-COPY-001`

## Source Documents (treated as the implementation contract)

- `docs/2026-07-16_management-calendar-leave-copy-requirement.md`
- `docs/management-calendar-leave-copy-design.md`
- `validation/management-calendar-leave-copy-requirement-readiness-check-2026-07-16.md`
- `handover/2026-07-16__management-calendar-leave-copy-requirement-closure.md`

**Authorization note:** per this task's explicit instruction, implementation proceeded before formal Mayurika/Arun reviewer sign-off, which is recorded as a pending governance follow-up (see §"Reviewer Sign-Off Status" below), not an implementation blocker.

## Files Changed

**New:**
- `backend/routers/leave_logic.py` — weekday expansion, short-leave cap/duration validation, effective-minutes snapshot computation, status-transition legality, interval-based overlap deduplication, conflict-detection query and response-body builder.
- `backend/routers/member_leave.py` — the 6 required routes.
- `backend/tests/test_member_leave.py` — 66 new unit tests.
- `database/member_leave_records_schema.sql` — companion fresh-install schema file.
- `database/migrations/2026-07-16-create-member-leave-records.sql` — additive migration (not yet executed — see database evidence file).
- `evidence/database/management-calendar-leave-copy-migration-execution-2026-07-16.md` — this feature's database pre-check/execution evidence.

**Modified (additive only, confirmed via `git diff --stat`):**
- `backend/config.py` (+66 lines) — leave-type/status enums, leave-system time periods and confirmed deduction minutes (270/270/540), actual office break constants (informational only), short-leave cap constants, coordination-copy notice text.
- `backend/models.py` (+104 lines) — `MemberLeaveRecord` ORM class; `MemberScheduleEvent`/`StaffDashboardRecord` untouched.
- `backend/schemas.py` (+188 lines) — leave create/update/out/summary/configuration schemas; existing schemas untouched except additive fields on `DailyScheduleReportOut`/`WeeklyScheduleReportOut`/`MonthlyScheduleReportOut`.
- `backend/routers/member_schedules.py` (+69 lines) — conflict check call in `create_member_schedule_event`/`update_member_schedule_event`; `_leave_report_additions` helper called from all three report routes. `classify_schedule_category`, `_task_duration_minutes`, `_aggregate_schedule_period`, `_duration_percentages`, `_duration_change`, and the category-immutability lock are byte-for-byte unmodified (confirmed by diff review).
- `backend/main.py` (+2 lines) — mounts `member_leave_router`.
- `web-view/index.html` (+479 lines) — leave CSS, leave HTML template block, leave state/render/CRUD/status-action JS, Month/Week/Day leave rendering, leave-deduction report rows, task-conflict message handling.

**Untouched (confirmed):** `member-aios/mayurika-hr/staff-data/` (not accessed at any point), `.env`/`.env.example`, `database/member_schedule_events_schema.sql`, `database/migrations/2026-07-13-*`/`2026-07-14-*`, `backend/routers/staff.py`, `backend/tests/test_schedule_classification.py`, `backend/tests/test_schedule_duration_reports.py`.

## Migration Path

`database/migrations/2026-07-16-create-member-leave-records.sql` (additive `CREATE TABLE IF NOT EXISTS`, wrapped in `BEGIN`/`COMMIT`, with 6 post-migration validation queries and a documented, non-destructive rollback comment).

## Live Database Result

**Not executed.** See `evidence/database/management-calendar-leave-copy-migration-execution-2026-07-16.md` for the full pre-check: the only database connection available in this session (via the connected Postgres MCP server) was confirmed, by listing its schemas, to be an **unrelated company database** with no `management_aios` schema and no `member_schedule_events` table. Per the task's explicit instruction, no SQL was run against it. No other database connection was reachable from this workstation (a pre-existing, previously-documented Neon SSL-handshake limitation — see `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7).

## Table / Constraint / Index Checks

Not live-verified (no correct database connection available). Verified instead by direct code review:
- `backend/models.py`'s `MemberLeaveRecord.__table_args__` and `database/migrations/2026-07-16-create-member-leave-records.sql` define identical CHECK constraints (member_key roster, leave_type, status, half_day_period pairing/value, date range, single-day-type equality, Short-Leave time requirement, non-Short-Leave time prohibition, time ordering, `coordination_copy_only = TRUE`).
- Three indexes defined identically in both the ORM-adjacent schema file and the migration: `(member_key, start_date)` partial on `deleted_at IS NULL`, `(member_key, status)` partial on `deleted_at IS NULL`, `(member_key, start_date, end_date)` partial on `deleted_at IS NULL AND status = 'Approved'`.
- The migration is idempotent (`IF NOT EXISTS` throughout) and additive-only — no `ALTER`/`DROP` of any existing table.

## API Checks

`app.openapi()` was generated successfully after mounting `member_leave_router` in `backend/main.py`. Confirmed routes present, matching the required set exactly:
```
GET  /api/member-leave/{member_key}
GET  /api/member-leave/{member_key}/history
POST /api/member-leave/{member_key}
PUT  /api/member-leave/{member_key}/{leave_id}
POST /api/member-leave/{member_key}/{leave_id}/cancel
GET  /api/member-leave/{member_key}/summary
```
`python -c "import backend.main"` succeeds with no errors. Live HTTP request/response testing was not performed — `fastapi.testclient`/`httpx` are not installed in this environment (`pip install httpx2` would be required; not installed without explicit approval, consistent with not making unauthorized dependency changes) and no live database is reachable regardless.

## Short-Leave Cap Checks

Verified by unit test (`backend/tests/test_member_leave.py`, `ShortLeaveDurationValidationTests`, `ConfigurationValueTests`):
- Valid under-cap request, exactly-120-minute request (boundary-allowed), over-120-minute request (rejected), zero-duration and end-before-start (rejected).
- `SHORT_LEAVE_MAX_REQUEST_MINUTES == 120`, `SHORT_LEAVE_MONTHLY_CAP_MINUTES == 120` confirmed directly against `backend/config.py`.
- Transaction/locking strategy (row-lock via `SELECT ... FOR UPDATE`, `leave_logic.compute_short_leave_approved_minutes_for_month(lock=True)` called from `assert_short_leave_monthly_cap_not_exceeded`) is implemented and code-reviewed but **not exercised under real concurrency** — that requires a live database with two genuinely concurrent transactions, which this environment cannot provide. This is recorded as a known limitation, not a false claim of concurrency-tested behavior.
- Pending/Rejected/Cancelled/soft-deleted exclusion from the cap sum is enforced by the SQL filter `status == 'Approved'` in `compute_short_leave_approved_minutes_for_month` (code-reviewed; not live-queried).

## Conflict Checks

Verified by unit test (`OverlapDeduplicationTests`, `ConflictResponseBodyTests` in `backend/tests/test_member_leave.py`) at the pure-function level (`_leave_record_day_interval`, `merge_intervals`, `approved_leave_minutes_for_date`, `leave_conflict_response_body`):
- Full-Day dominates an overlapping Short Leave on the same date (merged interval = 540 minutes, not summed).
- Two overlapping Short Leave intervals merge instead of summing (09:00–10:30 + 10:00–11:00 → 120 minutes, not 150).
- Half-Day First + Half-Day Second on the same date sum to exactly 540 (the daily cap), not exceeding it.
- A contrived pair of intervals that would sum past 540 is capped at `LEAVE_MAX_DAILY_DEDUCTION_MINUTES` (540).
- 409 response body shape confirmed: `error`/`message`/`conflicts` keys only, each conflict item limited to `leave_id`/`leave_type`/`status`/`start_date`/`end_date`/`start_time`/`end_time` — `purpose` is confirmed absent.
- The actual `find_conflicting_approved_leave` function (which queries the DB) and the wiring into `create_member_schedule_event`/`update_member_schedule_event` in `backend/routers/member_schedules.py` were code-reviewed (both routes call it before any write, both return the 409 `JSONResponse` before mutating anything) but **not exercised end-to-end against a live database** — same environment limitation as above.
- Drag/resize: confirmed by code review that both funnel through the same `PUT` route (`update_member_schedule_event`), which contains the conflict check — no separate bypass path exists (unchanged from the pre-existing architecture map).

## Status Checks

Verified by unit test (`StatusTransitionTests`): all 4 allowed transitions return `True` from `is_transition_allowed`; all 3 disallowed transitions (`Rejected→Pending`, `Cancelled→Pending`, `Approved→Rejected`) return `False`; both terminal states (`Rejected`, `Cancelled`) reject every outbound transition. The router's enforcement (`backend/routers/member_leave.py`, `update_member_leave_record`/`cancel_member_leave_record`) was code-reviewed to confirm it calls this function before ever mutating `status`.

## Weekend / Multi-Day Checks

Verified by unit test (`WeekdayExpansionTests`): Friday–Monday (2 weekdays), weekend-only range (0 weekdays), month rollover (Jul 30–Aug 3), year rollover (Dec 30–Jan 2), reversed range, single weekday. `ValidateLeaveDatesAndTimesTests.test_multi_day_weekend_only_rejected` confirms a weekend-only Multi-Day request is rejected (zero included weekdays) both via `leave_logic.validate_leave_dates_and_times` and (redundantly, defense-in-depth) via the Pydantic-schema-adjacent router check in `create_member_leave_record`. Public holidays receive no special handling anywhere in `expand_weekdays` — confirmed by code review (the function only checks `weekday() < 5`).

## Reporting Checks

Verified by unit test (`EffectiveLeaveMinutesSnapshotTests`, `OverlapDeduplicationTests`) at the pure-function level: Short Leave snapshots its exact request duration; Half-Day First/Second snapshot 270; Full-Day snapshots 540; Multi-Day snapshots `540 × included weekdays`. The additive report fields (`base_leave_deduction_reference_minutes`, `approved_leave_minutes`, `adjusted_expected_work_minutes`, `task_coverage_percentage`) were code-reviewed in `backend/routers/member_schedules.py`'s `_leave_report_additions` and confirmed wired into all three report routes (`get_daily_schedule_report`, `get_weekly_schedule_report`, `get_monthly_schedule_report`) as pure additions — the pre-existing `_aggregate_schedule_period`/`_task_duration_minutes`/`_duration_percentages`/`_duration_change` functions are untouched (confirmed via `git diff` showing no lines removed from those functions). Member isolation is structural (every leave query filters by `member_key`), confirmed by code review, not by a live multi-member query.

## Existing-Test Regression

`python -m unittest discover -s backend/tests -v` — **128 tests, 128 passed, 0 failed, 0 skipped** (62 pre-existing + 66 new in `test_member_leave.py`). `python -c "import backend.main"` — passed. No pre-existing test was modified.

## Frontend Checks

Static checks only (no browser automation tool available in this environment, and no live API to exercise against):
- JS syntax: the entire schedule-calendar `<script>` block (91,189 characters, including all new leave code) was extracted and validated with `node --check` — **passed, no syntax errors**.
- HTML structure: the full file was parsed with Python's `html.parser` for tag balance — **0 errors, 0 unclosed tags**.
- Code review confirms: leave chips/blocks use dedicated CSS classes (`msc-cal-chip-leave`, `msc-tg-allday-chip-leave`, `msc-tg-leave-block`) never selected by `wireTimeGridInteractions`'s drag/resize wiring (which only selects `.msc-tg-event`/`.msc-tg-allday-chip`) — leave blocks are structurally non-draggable/non-resizable, not just visually styled differently.
- The one shared `mountScheduleCalendarInstance` factory (unchanged pattern) was extended, not duplicated — all five member instances get the leave feature automatically with no per-member code.
- **Not verified in this session** (no browser tool, no live backend+DB to talk to): actual rendering in a browser, Create Task/Create Leave working end-to-end, Month/Week/Day visual correctness, mobile/narrow-layout behavior, absence of horizontal overflow, and Schedule Summary responsive behavior. These require either a browser-automation tool or a running local stack with a reachable database, neither of which was available. This is recorded as a known limitation, not claimed as passing.

## Official-Truth Boundary

Confirmed by code review across every layer:
- `coordination_copy_only` is DB-CHECK-enforced `TRUE` (`member_leave_records_coordination_copy_check`) and never set to any other value in `MemberLeaveRecordCreate`/`MemberLeaveRecordUpdate` (absent from both schemas) or in `member_leave.py` (hardcoded `True` at creation, never reassigned).
- Every `MemberLeaveRecordOut` response includes `official_truth_notice` (constant `LEAVE_COORDINATION_COPY_NOTICE`) and `coordination_copy_only=True`.
- No field, calculation, or response anywhere claims official leave balance, payroll, no-pay status, disciplinary status, medical truth, verified approval identity, or HR-system synchronization. `created_by`/`updated_by` are optional free-text strings with no verification.
- The frontend displays a persistent "Calendar coordination copy only..." banner in the new Leave Coordination card, and the leave-deduction report rows are explicitly labeled to avoid implying attendance/productivity truth (tooltips on "Leave-deduction reference basis" and "Adjusted reference (after leave)").

## Sensitive-Data Check

- No employee number or general staff-directory dependency anywhere in `MemberLeaveRecord`/schemas/router (uses only the existing 5-value `member_key` roster).
- No authentication, session, or role-based permission code added anywhere.
- No medical, payroll, disciplinary, or attachment field exists in the schema, API, or UI.
- No historical leave-note import exists or is claimed.
- No credentials were logged, printed, or exposed in this session (confirmed in the database evidence file).

## Known Limitations

1. **Database not executed** — see database evidence file; the only reachable connection was an unrelated company database.
2. **No live concurrency test** for the short-leave cap's row-locking strategy — code-reviewed only.
3. **No live browser/UI test** — no browser-automation tool was available in this session; frontend correctness is verified by static JS/HTML validation and code review only.
4. **No live end-to-end API test** (create → approve → conflict → report) — `httpx`/`fastapi.testclient` not installed and no reachable database regardless.
5. `leave_type` is immutable after creation (no update path changes it) — a deliberate design choice mirroring the existing task category-immutability convention, not explicitly mandated by the source documents but consistent with their spirit; documented here for reviewer awareness.
6. The frontend does not provide an "edit dates/times of a Pending leave request" UI action — only create, and status transitions (Approve/Reject/Cancel) — a deliberate scope reduction given the source documents require "status actions" but do not explicitly require a full inline-edit UI; the backend `PUT` route does support field edits, so this can be added to the frontend later without a backend change.
7. Public-holiday handling remains explicitly out of scope, per the approved requirement.

## Reviewer Sign-Off Status

**Not yet recorded.** Per this task's explicit authorization, implementation proceeded ahead of formal Mayurika (HR/leave-policy) and Arun (KPI/reporting-adjacent) sign-off. This is a governance follow-up to complete before promoting this feature beyond a coordination-copy draft, not an implementation blocker per the user's explicit instruction.

## PASS / AMBER / FAIL

**AMBER.**

All backend code, schemas, migration/schema SQL files, and 66 new unit tests are complete and passing (128/128 total, 0 regressions). Frontend code is written, statically validated (JS syntax + HTML balance), and code-reviewed for the required behaviors. The result is AMBER rather than PASS strictly because:
- The database migration was not executed against the correct Management AIOS database (only an unrelated company database was reachable) — the feature is therefore not yet live/deployed.
- Live browser and live end-to-end API validation could not be performed in this environment (no browser tool, no reachable correct database, `httpx` not installed).

Per the task's explicit instruction, this AMBER result reflects "complete all code and migration files, return AMBER, do not claim the database is deployed" — it is not a FAIL, since no part of the required implementation was skipped; the gap is entirely in this environment's ability to execute/verify against live infrastructure.

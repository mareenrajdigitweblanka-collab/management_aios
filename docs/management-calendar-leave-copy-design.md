---
name: management-calendar-leave-copy-design
type: design-document
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: REQ-LEAVE-COPY-001
status: DESIGN ONLY — NOT IMPLEMENTED
---

# Design — Management Calendar Leave Coordination Copy (2026-07-16)

**This is a design document only. No backend code, no SQL migration files, no changes to
`web-view/index.html` have been made as part of this document.** Companion requirement:
`docs/2026-07-16_management-calendar-leave-copy-requirement.md` (REQ-LEAVE-COPY-001).

---

## 1. Current Architecture (as of commit `73e0dc8`)

- **`backend/models.py`** — `MemberScheduleEvent` (`management_aios.member_schedule_events`): `id`, `member_key`, `member_label`, `event_date` (DATE), `title`, `category` (CHECK: `Scheduled Task`|`Unscheduled Task`, immutable after create), `priority`, `start_time`/`end_time` (TIME, nullable, CHECK `end_time > start_time`), `notes`, `source_scope`, `is_official_truth`, `created_by`/`updated_by` (present, never populated), `created_at`/`updated_at`, `deleted_at` (soft delete).
- **`backend/schemas.py`** — `MemberScheduleEventCreate`/`Update`/`Out`; `DailyScheduleReportOut`/`WeeklyScheduleReportOut`/`MonthlyScheduleReportOut` with counts, duration minutes, used/ignored counts, percentages, previous-period comparison.
- **`backend/routers/member_schedules.py`** — `GET /api/member-schedules/{member_key}` (list, optional date range, unused by the frontend today), `GET .../reports/daily|weekly|monthly`, `POST`, `PUT .../{event_id}` (category-change rejected with 422), `DELETE .../{event_id}` (soft delete), `DELETE .../clear-testing-data`. **No conflict/overlap detection exists anywhere in this router.** Authoritative duration logic: `_task_duration_minutes` (integer minutes, TIME-only, no overnight inference), `_aggregate_schedule_period` (binary Scheduled/Unscheduled partition), `_duration_percentages`, `_duration_change`.
- **`backend/config.py`** — plain module constants (no Pydantic `Settings` class): `VALID_MEMBER_KEYS`, `MEMBER_LABELS`, `VALID_PRIORITIES`, `VALID_SOURCE_SCOPES`, `VALID_SCHEDULE_CATEGORIES`.
- **`web-view/index.html`** — one JS factory `mountScheduleCalendarInstance(container)` mounted per `.msc-instance` container (one per member), fully container-scoped IDs. Month/Week/Day toggle with drag/resize funneling through the same `PUT` route. `CATEGORY_CLASS`/`PRIORITY_BADGE` badge-class conventions. `renderSummaryStats()` — one shared, purely-formatting function for all three report periods.
- **Documented, directly relevant gap**: `handover/2026-07-14__schedule-duration-reporting-closure.md` flags overnight/multi-day task spans as unimplemented and schema-blocked ("a schema-level decision is needed... before overnight support can be built"). Multi-day leave hits the identical structural limit (single `event_date`, TIME-only fields, `end_time > start_time` CHECK) — this design avoids the limit by using a dedicated table with its own `start_date`/`end_date`, rather than solving the underlying task-schema gap.

## 2. Selected Architecture

**Dedicated table: `management_aios.member_leave_records`.** New, additive-only; `member_schedule_events` is not altered. Leave rows and task rows never share a table.

## 3. Rejected Options

| Option | Rejected because |
|---|---|
| B. Leave rows inside `member_schedule_events` | `category` is a CHECK-constrained binary enum, actively enforced immutable-after-create in `update_member_schedule_event` (422 on change) — adding a third value requires widening that constraint and auditing `_aggregate_schedule_period`'s binary partition (`is_scheduled = category == "Scheduled Task"`; anything else silently falls into "unscheduled"), risking corruption of the existing, 62-test-covered report calculations. The single-`event_date`/TIME-only schema also structurally cannot represent Multi-Day leave (same gap already blocking overnight tasks). |
| C. Display-only, no local storage | Fails the explicit "preserve a coordination history" requirement outright — no status lifecycle, no history view, no conflict-check data source. |

## 4. Table Design

```sql
CREATE TABLE IF NOT EXISTS management_aios.member_leave_records (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_key            TEXT NOT NULL,
    member_label          TEXT NOT NULL,
    leave_type            TEXT NOT NULL,
    half_day_period       TEXT NULL,
    start_date            DATE NOT NULL,
    end_date              DATE NOT NULL,
    start_time            TIME NULL,
    end_time              TIME NULL,
    status                TEXT NOT NULL DEFAULT 'Pending',
    purpose               VARCHAR(240) NULL,
    external_reference    VARCHAR(120) NULL,
    coordination_copy_only BOOLEAN NOT NULL DEFAULT TRUE,
    policy_source_id      TEXT NOT NULL DEFAULT 'SRC-POLICY-001',
    effective_leave_minutes INTEGER NULL,
    created_by            TEXT NULL,
    updated_by            TEXT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ NULL,

    CONSTRAINT member_leave_records_member_key_check
        CHECK (member_key IN ('mayurika','suman','arun','rajiv','paraparan')),
    CONSTRAINT member_leave_records_leave_type_check
        CHECK (leave_type IN ('Short Leave','Half-Day First','Half-Day Second','Full-Day','Multi-Day')),
    CONSTRAINT member_leave_records_status_check
        CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
    CONSTRAINT member_leave_records_half_day_period_pairing_check
        CHECK (
            (leave_type IN ('Half-Day First','Half-Day Second') AND half_day_period IS NOT NULL)
            OR (leave_type NOT IN ('Half-Day First','Half-Day Second') AND half_day_period IS NULL)
        ),
    CONSTRAINT member_leave_records_date_range_check
        CHECK (end_date >= start_date),
    CONSTRAINT member_leave_records_time_check
        CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),
    CONSTRAINT member_leave_records_coordination_copy_check
        CHECK (coordination_copy_only = TRUE)
);
```

**Not enforceable by CHECK constraint (documented, not attempted):** the 2-hour monthly Approved short-leave cap is a cross-row aggregate — see §6.

## 5. Indexes

```sql
CREATE INDEX idx_member_leave_records_member_date
    ON management_aios.member_leave_records (member_key, start_date)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_member_leave_records_member_status
    ON management_aios.member_leave_records (member_key, status)
    WHERE deleted_at IS NULL;
```

The first mirrors the existing `idx_member_schedule_events_member_date` convention (calendar-range queries); the second supports the cap-sum query and the normal-vs-history status filter efficiently.

## 6. Transaction Strategy — Short-Leave Monthly Cap

**Pending does not consume the cap** (requirement §8.2) — only `status = 'Approved'` rows count. Rejected, Cancelled, and soft-deleted rows are always excluded.

Cap query (conceptual):

```sql
SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60
), 0) AS approved_minutes
FROM management_aios.member_leave_records
WHERE member_key = :member_key
  AND leave_type = 'Short Leave'
  AND status = 'Approved'
  AND deleted_at IS NULL
  AND date_trunc('month', start_date) = date_trunc('month', :target_date)
  AND id != :excluded_id;   -- excluded_id = the record being edited/approved, when applicable
```

**Why not a CHECK constraint:** PostgreSQL CHECK constraints evaluate a single row against a fixed expression; they cannot reference other rows or aggregate across a table. A monthly total is inherently cross-row.

**Recommended enforcement — application-level, transaction-scoped:**

1. Open a single DB transaction for both the cap check and the write.
2. Take a row lock on the affected member+month's existing Approved short-leave rows: `SELECT id FROM member_leave_records WHERE member_key = :member_key AND leave_type = 'Short Leave' AND status = 'Approved' AND deleted_at IS NULL AND date_trunc('month', start_date) = date_trunc('month', :target_date) FOR UPDATE;` This serializes concurrent transactions touching the same member/month so two simultaneous approvals cannot both read a stale under-cap sum.
3. Compute the cap-query sum (excluding the record's own prior contribution when editing) inside the same transaction.
4. If `sum + proposed_minutes > 120`, roll back and return a clear cap-exceeded error; otherwise commit the write.

**Save-time check** (creating/editing a Short Leave row, any status): only relevant once the record *would* become Approved — for a Pending save, no cap check is required (§8.2). The **duration-only** check (single request ≤ 120 minutes) applies to every Short Leave save regardless of status, and is a simple single-row validation (`end_time - start_time <= 120 minutes`), not a cross-row cap check.

**Approval-time check:** re-run the transaction above whenever a `PUT` moves a record's `status` to `Approved`, or whenever an already-Approved record's `start_date`/`start_time`/`end_time` is edited (destination month is always the *new* `start_date`'s month, not the original).

**Cancelling an Approved record:** frees capacity; no cap check needed on cancellation itself, since the query is always computed live from current Approved rows, not cached.

## 7. Half-Day / Full-Day / Multi-Day Configuration Handling

### 7.1 Actual Office Break vs. Leave-System Periods (do not conflate)

The actual company break is `ACTUAL_OFFICE_BREAK_START=12:45` / `ACTUAL_OFFICE_BREAK_END=13:30` (a 45-minute physical-schedule fact). It is a **separate concept** from the official leave system's own period boundaries and is never used to calculate, adjust, or validate any leave-deduction value below. The leave system's periods are mirrored as-is:

| Leave type | Leave-system period | Configuration constant | Confirmed value |
|---|---|---|---|
| Half-Day First | 08:30–13:00 | `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES` | 270 |
| Half-Day Second | 13:30–18:00 | `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES` | 270 |
| Full-Day | 08:30–18:00 | `LEAVE_FULL_DAY_DEDUCTION_MINUTES` | 540 |

### 7.2 Configuration Mechanism

- New `backend/config.py` constants, environment-variable-driven, each `Optional[int]` (minutes): `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES`, `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES`, `LEAVE_FULL_DAY_DEDUCTION_MINUTES`. Values are now confirmed (§7.1) — no hardcoded fallback is needed once the environment variables are set to these confirmed values, but the router must still treat the constant as `Optional[int]` and apply the missing-configuration behavior below for defense-in-depth (e.g. a deployment environment where the variable was not yet set).
- **Pending save:** allowed even when the relevant constant is `None`.
- **Approval:** the router must read the relevant config constant at approval time; if `None`, reject the status-change request with a configuration error (e.g. 422/503, error code `leave_configuration_missing`) rather than approving with an undefined deduction.
- **Snapshot on Approval:** when a status change to `Approved` succeeds, `effective_leave_minutes` is set once, from the config value read at that moment, and never recomputed from current config afterward. This guarantees a later config change cannot silently rewrite an already-Approved record's historical reporting contribution — reports always read `effective_leave_minutes` from the row, never the live config value, once a record is Approved.
- **API metadata:** leave-creation and summary responses should include a `configuration` object, e.g. `{"full_day_configured": true, "full_day_deduction_minutes": 540}` or, if unset, `{"full_day_configured": false, "notice": "configuration not yet set — approval blocked until confirmed"}`, so the frontend can render the configured leave-deduction minutes without hardcoding its own numbers.
- **Terminology:** `effective_leave_minutes` and the three `*_DEDUCTION_MINUTES` constants are **leave-deduction minutes** / **leave-system credited minutes** — the official leave system's own credited figures, mirrored for coordination purposes. They must never be labeled or reasoned about in code comments, API docs, or UI copy as verified actual productive working minutes or actual office minutes.

## 8. Expected-Hours Algorithm

Additive fields layered onto the existing report schemas, computed by new, separate helper functions (parallel to, but never modifying, `_aggregate_schedule_period` et al.):

```
base_expected_work_minutes        = full_day_expected_minutes × count_of_weekdays_in_report_period
approved_leave_minutes            = see deduplication algorithm below
adjusted_expected_work_minutes    = base_expected_work_minutes - approved_leave_minutes
task_coverage_percentage          = scheduled_task_minutes / adjusted_expected_work_minutes  (guard divide-by-zero → null)
```

**Per-type deduction basis (leave-deduction minutes, not measured productive time):**

| Leave type | Minutes source | Confirmed minutes |
|---|---|---|
| Short Leave | Exact Approved request minutes (`end_time - start_time`) | Up to 120 (request-specific) |
| Half-Day First | `effective_leave_minutes` (snapshotted from `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES`) | 270 |
| Half-Day Second | `effective_leave_minutes` (snapshotted from `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES`) | 270 |
| Full-Day | `effective_leave_minutes` (snapshotted from `LEAVE_FULL_DAY_DEDUCTION_MINUTES`) | 540 |
| Multi-Day | `effective_leave_minutes` (540) × count of included Monday–Friday dates overlapping the report's own date range (partial-period overlap handled by intersecting `[start_date, end_date]` with the report window before counting weekdays) | 540 per included weekday |

## 9. Overlap Deduplication Algorithm

To prevent double-deduction from overlapping or duplicate Approved leave copies for the same member:

1. Collect all Approved leave rows for the member whose `[start_date, end_date]` intersects the report period.
2. Expand each row to its individual set of affected calendar dates (weekday-filtered for Multi-Day; single date for the other four types).
3. Take the **union** of dates across all expanded rows (a Python `set` union, or an equivalent `DISTINCT` date list from a SQL `generate_series` expansion) — this collapses any duplicate/overlapping coverage of the same date to one entry.
4. Sum one Full-Day-equivalent deduction per unique date in the union (using each date's own leave type's `effective_leave_minutes` when types differ on the same date — the higher-precedence full-day-equivalent value wins if two different Approved records somehow cover the same date, since a date cannot be "double leave").
5. This union-based sum becomes `approved_leave_minutes` for the report period — never the naive per-row sum, which would double-count overlapping coverage.

## 10. Conflict Algorithm

Applies inside `create_member_schedule_event` and `update_member_schedule_event` (`backend/routers/member_schedules.py`) — both routes already receive every task mutation, including drag/resize (confirmed: drag/resize funnel through the same `PUT` route, so one check point covers all four cases in requirement §8.7).

```
on task create/update with (member_key, event_date, start_time, end_time):
    1. query Approved leave rows for member_key where the task's event_date falls
       within [start_date, end_date] (Multi-Day: also confirm event_date is an
       included weekday, i.e. not a Sat/Sun inside the range)
    2. for Short Leave / Half-Day rows (Half-Day's period is the leave-system
       period mirrored in §7.1 — First Half 08:30-13:00, Second Half 13:30-18:00 —
       not derived from the actual 12:45-13:30 office break): additionally require
       a time-range overlap against the task's start_time/end_time (if the task
       is untimed, any same-date Short/Half-Day Approved leave is itself a
       conflict per requirement case 7)
    3. for Full-Day / Multi-Day rows: any task on that date is a conflict
       regardless of the task's own start_time/end_time (untimed or timed)
    4. if any conflict row found:
           return HTTP 409, body:
             { "error": "leave_conflict",
               "message": "<human-readable>",
               "conflicts": [{ "leave_id", "leave_type", "status": "Approved",
                                "start_date", "end_date", "start_time", "end_time" }] }
           (no "purpose" field in the response)
       else:
           proceed with the existing create/update logic, unmodified
```

Pending leave rows are explicitly excluded from this query (requirement §8.6) — they may optionally be surfaced as a non-blocking warning in a separate, non-409 response field, but must never trigger the 409 path.

## 11. Status Workflow

State machine (requirement §7), enforced in the `PUT`/`cancel` route handlers:

```
Pending ──approve──> Approved ──cancel──> Cancelled
   │                     
   ├──reject──> Rejected
   │
   └──cancel──> Cancelled
```

`Rejected`, `Cancelled` are terminal — any transition attempt out of them is rejected with 422 and a message directing the caller to create a new record instead. `Approved → Rejected` is rejected with 422 directing the caller to use `Approved → Cancelled` instead.

## 12. API Flow

```
GET    /api/member-leave/{member_key}                    -> Pending + Approved rows, deleted_at IS NULL
GET    /api/member-leave/{member_key}/history             -> all 4 statuses, deleted_at IS NULL
POST   /api/member-leave/{member_key}                     -> create; server forces status=Pending,
                                                              coordination_copy_only=true, effective_leave_minutes=NULL
PUT    /api/member-leave/{member_key}/{leave_id}           -> field edits and/or status transition;
                                                              re-runs §6 cap check and §7 config check as applicable
POST   /api/member-leave/{member_key}/{leave_id}/cancel    -> status -> Cancelled (only from Pending/Approved)
GET    /api/member-leave/{member_key}/summary              -> current month cap usage + expected-minutes contribution
```

Both list routes accept optional `start_date`/`end_date` filters, mirroring the existing `member_schedules` list route's convention.

## 13. Frontend Integration Points

- Extend the existing `.msc-instance` factory (`mountScheduleCalendarInstance` in `web-view/index.html`) with a leave sub-module, keeping the single-shared-implementation-for-five-members pattern intact — no per-member duplication.
- New "Create Leave" button beside "Create Task"; leave form fields conditional on `leave_type` (JS-side conditional rendering only — validation is still backend-authoritative).
- New leave-status badge classes, distinct from `CATEGORY_CLASS`/`PRIORITY_BADGE`.
- Leave blocks in Week/Day time-grid views are rendered non-draggable (no drag/resize handlers attached) — editing goes through the leave form only.
- History view: a toggle within the same per-member instance, following the existing `msc-view-btn`/`active` visual convention.
- Conflict messages: rendered from the 409 body in a form-inline error surface, matching the existing validation-error UI pattern.
- Official-copy banner: persistent, using existing `.hr-table-card` surface tokens (`var(--surface)`/`var(--border)`/`var(--radius)`).
- New report rows added to the existing shared `renderSummaryStats()` function — purely formatting, no client-side calculation, matching its existing design.

## 14. Test Matrix

**Short Leave:** valid under-cap request; request >120 min blocked; monthly Approved total >120 min blocked (multi-row); edit causing cap excess blocked; edit moving `start_date` into an already-full month blocked; approval causing cap excess blocked; Rejected/Cancelled/soft-deleted excluded from cap sum; month-boundary rollover between two separate requests.

**Half-Day:** first-half selection stores correct `half_day_period`; second-half selection; Pending save succeeds with missing config; approval blocked with missing config; approval succeeds and snapshots `effective_leave_minutes` once config exists; later config change does not alter an already-Approved record's snapshotted value.

**Full-Day:** single-date creation; Pending save with missing config; approval blocked with missing config; snapshot behavior identical to Half-Day.

**Multi-Day:** date-range creation; reversed range (`end_date < start_date`) rejected; weekend exclusion verified (e.g. Fri–Mon request deducts only Fri+Mon, 540 minutes each = 1080 total, not counting Sat/Sun); month/year rollover range computes correctly; public holiday within range receives no special handling (deducted as a normal weekday at 540 minutes).

**Status:** every allowed transition succeeds; every disallowed transition (Rejected→Pending, Cancelled→Pending, Approved→Rejected) returns 422 and leaves status unchanged; Rejected/Cancelled hidden from normal list; history returns all four statuses.

**Conflict:** timed task overlapping Approved Short/Half-Day leave blocked; untimed task on Approved Full-Day/Multi-Day leave blocked; task create blocked; task edit into a leave period blocked; drag blocked; resize blocked; existing task never auto-cancelled/reclassified/date-shifted after a rejected conflicting save attempt; task `category` unchanged.

**Pending:** Pending leave visible in normal calendar; does not consume cap; does not reduce expected minutes; does not block a conflicting task save (only an optional non-blocking warning).

**Reporting:** leave rows never appear in Scheduled/Unscheduled counts or duration totals; Approved leave reduces `adjusted_expected_work_minutes`; Pending/Rejected/Cancelled leave has no expected-minutes impact; each member's figures isolated from the other four; overlapping/duplicate Approved leave copies for the same date deduct only once (§9 union safeguard).

**Boundary:** every leave API response includes the coordination-copy flag/banner data; no authentication/session/role check anywhere in the leave code path; no employee-number field accepted or stored; no medical/payroll/disciplinary/attachment field accepted or stored.

## 15. Migration Plan (not executed)

1. New companion schema file `database/member_leave_records_schema.sql` (fresh-install target state, matching the `member_schedule_events_schema.sql` precedent).
2. New migration file `database/migrations/2026-07-16-create-member-leave-records.sql`, wrapped in `BEGIN`/`COMMIT`, `CREATE TABLE IF NOT EXISTS` — purely additive, no existing table touched.
3. Apply manually to Neon per this repo's existing migration convention (no automatic `Base.metadata.create_all()` — confirmed in `backend/models.py`'s module docstring).
4. No data backfill required — this is a new, empty table.

## 16. Rollback Plan (not executed)

Because the migration is additive-only (`CREATE TABLE IF NOT EXISTS`, no existing table/constraint modified), rollback is a simple `DROP TABLE management_aios.member_leave_records;` with no impact on `member_schedule_events`, `staff_dashboard_records`, or any existing report route — none of those are touched by this feature's schema. No existing application code path depends on this table's existence, so the new leave router can also be un-mounted from `backend/main.py` independently of any schema rollback.

## 17. Risks

- **Cap race condition** — mitigated by the `SELECT ... FOR UPDATE` transaction strategy in §6; without it, concurrent approvals could exceed the 2-hour cap.
- **Category-constraint temptation** — the path of least resistance (adding "Leave" as a third `category` value on the existing table) would corrupt the existing binary Scheduled/Unscheduled partition; this design avoids it entirely by using a separate table.
- **Config-drift risk** — mitigated by snapshotting `effective_leave_minutes` at Approval time rather than recomputing live from current config on every report.
- **Duplicate/overlap double-deduction** — mitigated by the date-union deduplication algorithm in §9.
- **Unauthenticated `created_by`/`updated_by`** — documentation-discipline risk only; must never be presented as verified identity in any future UI or report.
- **Multi-day + future holiday interaction** — deferring public holidays now is acceptable per requirement §8.4; the weekday-expansion logic should remain a single, isolated function so a future holiday-exclusion rule is a pure addition, not a rearchitecture.

## 18. Parent-Truth Safeguards

- `coordination_copy_only` is DB CHECK-enforced `TRUE` and never client-settable — the official-truth boundary is structurally guaranteed, not just documented.
- `external_reference` is optional free text only; never validated against or synchronized with the official HR system.
- No official leave-balance, payroll, no-pay, disciplinary, or medical field or calculation exists anywhere in this schema.
- No historical leave notes are imported from any external system.
- Every UI surface displaying leave data carries a persistent official-copy disclaimer (design §13).
- Leave data lives exclusively in `member_leave_records` — never inside `member_schedule_events` — preserving that table's task-only semantics and its existing, already-locked `category` CHECK constraint untouched.
- Per CLAUDE.md §13, this design does not promote any content to parent-AIOS truth; it remains a Foundation Draft item pending the relevant Management Team/domain owner sign-off (§15 of the requirement document).

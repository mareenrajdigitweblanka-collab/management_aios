---
name: management-calendar-leave-copy-design
type: design-document
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: REQ-LEAVE-COPY-001
status: IMPLEMENTED — approval/status workflow removed 2026-07-16 (SIMPLIFICATION AMENDMENT, user decision); see §0
---

# Design — Management Calendar Leave Coordination Copy (2026-07-16)

**This design document was originally authored, then implemented, and has since been amended by an explicit user decision to remove the approval/status workflow described in the original §6, §8, §10–§13. §0 below is the current, authoritative design. Sections below it are preserved for historical record but must be read through the §0 amendment — do not treat any "Approved"/status-transition language below as current behavior.** Companion requirement: `docs/2026-07-16_management-calendar-leave-copy-requirement.md` (REQ-LEAVE-COPY-001), also amended.

---

## 0. SIMPLIFICATION AMENDMENT (2026-07-16) — Current Authoritative Design

**User decision:** remove the approval/status workflow entirely. This supersedes every Pending/Approved/Rejected/Cancelled reference below (originally in the table design §4, the transaction strategy §6, the conflict algorithm §10, the status workflow §11, the API flow §12, and the frontend integration points §13).

**New rule:** every saved leave record is immediately active. Active = `deleted_at IS NULL`. The only lifecycle event after creation is soft-deletion via `DELETE /api/member-leave/{member_key}/{leave_id}`. No replacement status/active-inactive enum column was added.

**What changed, concretely:**

- **Schema:** `status` column and its CHECK constraint dropped by `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql`. Two of the three original indexes (`idx_member_leave_records_member_status`, `idx_member_leave_records_approved_conflict`) dropped and replaced with `idx_member_leave_records_short_leave_active` and `idx_member_leave_records_active_conflict` (both keyed on `deleted_at IS NULL` instead of a status value).
- **`backend/models.py`:** `MemberLeaveRecord.status` column and its CHECK constraint removed.
- **`backend/schemas.py`:** `LeaveStatus` literal removed; `status` removed from `MemberLeaveRecordUpdate`/`MemberLeaveRecordOut`/`LeaveConflictItemOut`; `LeaveSummaryOut.short_leave_approved_minutes` renamed `short_leave_active_minutes`; `Daily/Weekly/MonthlyScheduleReportOut.approved_leave_minutes` renamed `active_leave_minutes`.
- **`backend/routers/leave_logic.py`:** `ALLOWED_STATUS_TRANSITIONS`/`is_transition_allowed`/`LEAVE_STATUSES_EXCLUDED_FROM_CAP` removed. `compute_short_leave_approved_minutes_for_month` → `compute_short_leave_active_minutes_for_month` (filters `deleted_at IS NULL` instead of `status == 'Approved'`). `assert_short_leave_monthly_cap_not_exceeded` → `assert_active_short_leave_monthly_cap_not_exceeded`. `approved_leave_minutes_for_date` → `active_leave_minutes_for_date`. `compute_approved_leave_minutes_for_period` → `compute_active_leave_minutes_for_period`. `find_conflicting_approved_leave` → `find_conflicting_active_leave`. `leave_conflict_response_body` no longer includes a `status` key.
- **`backend/routers/member_leave.py`:** `GET /history` and `POST /{leave_id}/cancel` removed. `POST` now computes and snapshots `effective_leave_minutes` and runs the Short Leave cap check immediately at creation (previously deferred to approval). `PUT` no longer accepts or validates a status transition; it revalidates and re-snapshots `effective_leave_minutes` whenever a date/time field changes, and re-checks the cap for Short Leave. New `DELETE /{member_key}/{leave_id}` route soft-deletes (same 404-on-repeat convention as `member_schedules`).
- **`backend/routers/member_schedules.py`:** both `find_conflicting_approved_leave(...)` call sites renamed to `find_conflicting_active_leave(...)`; `_leave_report_additions` renamed its local variable and returned key from `approved_leave_minutes` to `active_leave_minutes`.
- **Frontend (`web-view/index.html`):** `LEAVE_STATUS_CLASS` map removed — leave chips/blocks use one fixed `--draft` visual treatment instead of a per-status color. Show History button, history panel, `loadLeaveHistory`, `renderLeaveHistoryList`, and all associated state (`leaveHistoryItems`, `leaveHistoryVisible`, `leaveHistoryWrapEl`, `leaveHistoryListEl`, `leaveHistoryToggleBtn`) removed. `allowedLeaveTransitions`/`applyLeaveStatusChange` replaced by a single `deleteLeaveRecord(leaveId, btn)` function (confirms via `window.confirm`, calls `DELETE`, refreshes calendar/list/reports). `renderLeaveList` no longer renders a status badge or Approve/Reject/Cancel buttons — it renders one "Delete Leave" button per item. The Schedule Summary panel's leave-deduction row was repointed from `report.approved_leave_minutes` to `report.active_leave_minutes` and relabeled "Leave deduction" (was "Approved leave (deduction minutes)").
- **Migration mapping** (destructive, one-way, explicit business decision — not a lossless data transform): Pending and Approved rows become active rows (no `deleted_at` change); Rejected and Cancelled rows are soft-deleted (`deleted_at` populated via `COALESCE(deleted_at, now())`, so an already-deleted row's original `deleted_at` is preserved rather than overwritten).

See `validation/leave-status-workflow-removal-check-2026-07-16.md` and `handover/2026-07-16__leave-status-workflow-removal-closure.md` for verification evidence.

---

## 1. Current Architecture (as of commit `73e0dc8`, prior to this feature's own implementation)

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
| C. Display-only, no local storage | Fails the explicit "preserve a coordination record" requirement outright — no lifecycle persistence, no conflict-check data source. |

## 4. Table Design (as currently deployed, post-2026-07-16 amendment)

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

**No `status` column exists (amended — removed 2026-07-16).** There is no replacement active/inactive enum; `deleted_at IS NULL` is the sole activity signal.

**Not enforceable by CHECK constraint (documented, not attempted):** the 2-hour monthly active short-leave cap is a cross-row aggregate — see §6.

## 5. Indexes (as currently deployed, post-2026-07-16 amendment)

```sql
CREATE INDEX idx_member_leave_records_member_date
    ON management_aios.member_leave_records (member_key, start_date)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_member_leave_records_short_leave_active
    ON management_aios.member_leave_records (member_key, start_date)
    WHERE deleted_at IS NULL AND leave_type = 'Short Leave';

CREATE INDEX idx_member_leave_records_active_conflict
    ON management_aios.member_leave_records (member_key, start_date, end_date)
    WHERE deleted_at IS NULL;
```

The first mirrors the existing `idx_member_schedule_events_member_date` convention (calendar-range queries). The second and third (amended — replace the original status-keyed `idx_member_leave_records_member_status` and `idx_member_leave_records_approved_conflict`) support the cap-sum query and the conflict query respectively, now keyed on `deleted_at IS NULL` instead of a status value.

## 6. Transaction Strategy — Short-Leave Monthly Cap (amended)

**Every active row counts** (amended — was "only `status = 'Approved'` rows"; there is no Pending/Approved distinction anymore). A soft-deleted row never counts. The cap check now runs at **creation time** as well as edit time (amended — previously deferred entirely to a separate approval step that no longer exists).

Cap query (conceptual, amended):

```sql
SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60
), 0) AS active_minutes
FROM management_aios.member_leave_records
WHERE member_key = :member_key
  AND leave_type = 'Short Leave'
  AND deleted_at IS NULL
  AND date_trunc('month', start_date) = date_trunc('month', :target_date)
  AND id != :excluded_id;   -- excluded_id = the record being edited, when applicable
```

**Why not a CHECK constraint:** PostgreSQL CHECK constraints evaluate a single row against a fixed expression; they cannot reference other rows or aggregate across a table. A monthly total is inherently cross-row.

**Enforcement — application-level, transaction-scoped (amended: runs at creation and edit, not only at a separate approval step):**

1. Open a single DB transaction for both the cap check and the write.
2. Take a row lock on the affected member+month's existing active short-leave rows: `SELECT id FROM member_leave_records WHERE member_key = :member_key AND leave_type = 'Short Leave' AND deleted_at IS NULL AND date_trunc('month', start_date) = date_trunc('month', :target_date) FOR UPDATE;` This serializes concurrent transactions touching the same member/month so two simultaneous creates/edits cannot both read a stale under-cap sum.
3. Compute the cap-query sum (excluding the record's own prior contribution when editing) inside the same transaction.
4. If `sum + proposed_minutes > 120`, roll back and return a clear cap-exceeded error; otherwise commit the write.

**Save-time check** (creating/editing a Short Leave row): the duration-only check (single request ≤ 120 minutes) applies to every Short Leave save. The cross-row monthly cap check (amended) now applies at **every** creation and at every edit that changes date/time — not only "once approved", since there is no longer a separate approval step.

**Deleting an active record:** frees capacity; no cap check needed on deletion itself, since the query is always computed live from current active rows, not cached.

## 7. Half-Day / Full-Day / Multi-Day Configuration Handling

### 7.1 Actual Office Break vs. Leave-System Periods (do not conflate)

The actual company break is `ACTUAL_OFFICE_BREAK_START=12:45` / `ACTUAL_OFFICE_BREAK_END=13:30` (a 45-minute physical-schedule fact). It is a **separate concept** from the official leave system's own period boundaries and is never used to calculate, adjust, or validate any leave-deduction value below. The leave system's periods are mirrored as-is:

| Leave type | Leave-system period | Configuration constant | Confirmed value |
|---|---|---|---|
| Half-Day First | 08:30–13:00 | `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES` | 270 |
| Half-Day Second | 13:30–18:00 | `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES` | 270 |
| Full-Day | 08:30–18:00 | `LEAVE_FULL_DAY_DEDUCTION_MINUTES` | 540 |

### 7.2 Configuration Mechanism (amended)

- `backend/config.py` constants, environment-variable-driven, each `Optional[int]` (minutes): `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES`, `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES`, `LEAVE_FULL_DAY_DEDUCTION_MINUTES`. All three are confirmed values (§7.1) and always present in this deployment.
- **Creation (amended — was "Pending save," now the only save path):** the router reads the relevant config constant at creation time; if missing, creation itself is rejected with a configuration error (e.g. 422/503, error code `leave_configuration_missing`) rather than storing an undefined deduction. This is defense-in-depth only, since all three values are confirmed and present.
- **Snapshot at creation, recompute on edit (amended — was "snapshot at Approval"):** `effective_leave_minutes` is computed and set once at creation from the config value read at that moment, and recomputed (from the record's own possibly-edited date/time fields, calling the same `compute_effective_leave_minutes` helper) whenever a date/time field is edited in the same transaction. Reports always read `effective_leave_minutes` from the row, never the live config value.
- **API metadata:** leave-creation and summary responses include a `configuration` object via `LeaveConfigurationOut`, so the frontend can render the configured leave-deduction minutes without hardcoding its own numbers.
- **Terminology:** `effective_leave_minutes` and the three `*_DEDUCTION_MINUTES` constants are **leave-deduction minutes** / **leave-system credited minutes** — the official leave system's own credited figures, mirrored for coordination purposes. They must never be labeled or reasoned about in code comments, API docs, or UI copy as verified actual productive working minutes or actual office minutes.

## 8. Expected-Hours Algorithm

Additive fields layered onto the existing report schemas, computed by new, separate helper functions (parallel to, but never modifying, `_aggregate_schedule_period` et al.):

```
base_expected_work_minutes        = full_day_expected_minutes × count_of_weekdays_in_report_period
active_leave_minutes               = see deduplication algorithm below (amended — renamed from approved_leave_minutes)
adjusted_expected_work_minutes    = base_expected_work_minutes - active_leave_minutes
task_coverage_percentage          = scheduled_task_minutes / adjusted_expected_work_minutes  (guard divide-by-zero → null)
```

**Per-type deduction basis (leave-deduction minutes, not measured productive time):**

| Leave type | Minutes source | Confirmed minutes |
|---|---|---|
| Short Leave | Exact active request minutes (`end_time - start_time`) | Up to 120 (request-specific) |
| Half-Day First | `effective_leave_minutes` (snapshotted from `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES`) | 270 |
| Half-Day Second | `effective_leave_minutes` (snapshotted from `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES`) | 270 |
| Full-Day | `effective_leave_minutes` (snapshotted from `LEAVE_FULL_DAY_DEDUCTION_MINUTES`) | 540 |
| Multi-Day | `effective_leave_minutes` (540) × count of included Monday–Friday dates overlapping the report's own date range (partial-period overlap handled by intersecting `[start_date, end_date]` with the report window before counting weekdays) | 540 per included weekday |

## 9. Overlap Deduplication Algorithm (amended — "Approved" → "active")

To prevent double-deduction from overlapping or duplicate active leave copies for the same member:

1. Collect all active leave rows (`deleted_at IS NULL`) for the member whose `[start_date, end_date]` intersects the report period.
2. Expand each row to its individual set of affected calendar dates (weekday-filtered for Multi-Day; single date for the other four types).
3. Take the **union** of dates across all expanded rows (a Python `set` union, or an equivalent `DISTINCT` date list from a SQL `generate_series` expansion) — this collapses any duplicate/overlapping coverage of the same date to one entry.
4. Sum one Full-Day-equivalent deduction per unique date in the union (using each date's own leave type's `effective_leave_minutes` when types differ on the same date — the higher-precedence full-day-equivalent value wins if two different active records somehow cover the same date, since a date cannot be "double leave").
5. This union-based sum becomes `active_leave_minutes` for the report period (amended — was `approved_leave_minutes`) — never the naive per-row sum, which would double-count overlapping coverage.

Implemented in `backend/routers/leave_logic.py` as `merge_intervals` / `active_leave_minutes_for_date` / `compute_active_leave_minutes_for_period` (renamed 2026-07-16 from `approved_leave_minutes_for_date` / `compute_approved_leave_minutes_for_period`).

## 10. Conflict Algorithm (amended — "Approved" → "active")

Applies inside `create_member_schedule_event` and `update_member_schedule_event` (`backend/routers/member_schedules.py`) — both routes already receive every task mutation, including drag/resize (confirmed: drag/resize funnel through the same `PUT` route, so one check point covers all four cases).

```
on task create/update with (member_key, event_date, start_time, end_time):
    1. query active leave rows (deleted_at IS NULL) for member_key where the task's
       event_date falls within [start_date, end_date] (Multi-Day: also confirm
       event_date is an included weekday, i.e. not a Sat/Sun inside the range)
    2. for Short Leave / Half-Day rows (Half-Day's period is the leave-system
       period mirrored in §7.1 — First Half 08:30-13:00, Second Half 13:30-18:00 —
       not derived from the actual 12:45-13:30 office break): additionally require
       a time-range overlap against the task's start_time/end_time (if the task
       is untimed, any same-date active Short/Half-Day leave is itself a conflict)
    3. for Full-Day / Multi-Day rows: any task on that date is a conflict
       regardless of the task's own start_time/end_time (untimed or timed)
    4. if any conflict row found:
           return HTTP 409, body:
             { "error": "leave_conflict",
               "message": "<human-readable>",
               "conflicts": [{ "leave_id", "leave_type",
                                "start_date", "end_date", "start_time", "end_time" }] }
           (no "purpose" field in the response; no "status" field — amended,
            there is no status to report)
       else:
           proceed with the existing create/update logic, unmodified
```

Implemented as `leave_logic.find_conflicting_active_leave` (renamed 2026-07-16 from `find_conflicting_approved_leave`) and `leave_logic.leave_conflict_response_body`.

## 11. Lifecycle (amended — supersedes the original "Status Workflow" state machine)

There is no status state machine. The lifecycle has exactly two states, both derived from `deleted_at`:

```
(created) ──immediately active──> Active ──DELETE──> Deleted (soft, terminal)
```

- **Active** (`deleted_at IS NULL`): visible in the normal calendar; blocks conflicting task saves; contributes leave-deduction minutes; editable via `PUT`.
- **Deleted** (`deleted_at IS NOT NULL`): excluded from the normal calendar; does not block tasks; does not contribute to reporting; not editable (`PUT`/`DELETE` on a deleted id return 404, matching `_get_active_event_or_404`'s convention in `member_schedules`).

There is no reactivation path — a deleted record cannot become active again; a new record must be created instead. Enforced in `backend/routers/member_leave.py` via `_get_active_record_or_404`, which every mutating route calls first.

## 12. API Flow (amended)

```
GET    /api/member-leave/{member_key}                    -> every active row (deleted_at IS NULL)
POST   /api/member-leave/{member_key}                     -> create; immediately active;
                                                              coordination_copy_only=true,
                                                              effective_leave_minutes computed at creation
PUT    /api/member-leave/{member_key}/{leave_id}           -> field edits; re-runs §6 cap check and
                                                              §7 config check when date/time changes
DELETE /api/member-leave/{member_key}/{leave_id}           -> soft-delete (amended — new route,
                                                              replaces the removed /cancel action and
                                                              the removed Rejected/Cancelled status values)
GET    /api/member-leave/{member_key}/summary              -> current month cap usage + expected-minutes contribution
```

Removed (amended, 2026-07-16): `GET /api/member-leave/{member_key}/history` (no status history to serve) and `POST /api/member-leave/{member_key}/{leave_id}/cancel` (no cancel transition — `DELETE` replaces it).

`GET` accepts optional `start_date`/`end_date` filters, mirroring the existing `member_schedules` list route's convention.

## 13. Frontend Integration Points (amended)

- Extends the existing `.msc-instance` factory (`mountScheduleCalendarInstance` in `web-view/index.html`) with a leave sub-module, keeping the single-shared-implementation-for-five-members pattern intact — no per-member duplication.
- "Create Leave" button beside "Create Task"; leave form fields conditional on `leave_type` (JS-side conditional rendering only — validation is still backend-authoritative).
- **Removed (amended):** the per-status leave-badge classes (`LEAVE_STATUS_CLASS`), the status action buttons (Approve/Reject/Cancel, `allowedLeaveTransitions`/`applyLeaveStatusChange`), the Show History toggle, the history panel, and all associated state.
- **Added (amended):** a single "Delete Leave" button per leave-list item (`deleteLeaveRecord`), gated behind a `window.confirm` prompt, calling `DELETE`; on success, the calendar view, the leave list, and the schedule-summary report all refresh.
- Leave blocks in Week/Day time-grid views are rendered non-draggable (no drag/resize handlers attached) — editing goes through the leave form; removal goes through Delete Leave.
- Official-copy banner: persistent, using existing `.hr-table-card` surface tokens (`var(--surface)`/`var(--border)`/`var(--radius)`); its text no longer references status-based approval identity (amended wording, 2026-07-16 label-wording cleanup + this amendment).
- New report rows added to the existing shared `renderSummaryStats()` function — purely formatting, no client-side calculation; the leave-deduction row now reads `report.active_leave_minutes` and is labeled "Leave deduction" (amended — was `report.approved_leave_minutes` / "Approved leave (deduction minutes)").

## 14. Test Matrix (amended)

**Short Leave:** valid under-cap request; request >120 min blocked; monthly active total >120 min blocked (multi-row); edit causing cap excess blocked; edit moving `start_date` into an already-full month blocked; creation causing cap excess blocked (amended — was "approval causing cap excess blocked"); deleted rows excluded from cap sum; month-boundary rollover between two separate requests.

**Half-Day:** first-half selection stores correct `half_day_period`; second-half selection; creation blocked with missing config (amended — was "Pending save succeeds with missing config; approval blocked"); snapshot behavior on creation; later config change does not alter an already-created record's snapshotted value.

**Full-Day:** single-date creation; creation blocked with missing config (amended); snapshot behavior identical to Half-Day.

**Multi-Day:** date-range creation; reversed range (`end_date < start_date`) rejected; weekend exclusion verified (e.g. Fri–Mon request deducts only Fri+Mon, 540 minutes each = 1080 total, not counting Sat/Sun); month/year rollover range computes correctly; public holiday within range receives no special handling (deducted as a normal weekday at 540 minutes).

**Lifecycle (amended — replaces "Status"):** creation is immediately active; `DELETE` soft-deletes; repeated `DELETE` returns 404; a deleted record cannot be edited (`PUT` on a deleted id returns 404); no status field appears anywhere in schema, API, or UI (`SimplifiedLifecycleTests` in `backend/tests/test_member_leave.py`).

**Conflict:** timed task overlapping active Short/Half-Day leave blocked; untimed task on active Full-Day/Multi-Day leave blocked; task create blocked; task edit into a leave period blocked; drag blocked; resize blocked; existing task never auto-cancelled/reclassified/date-shifted after a rejected conflicting save attempt; task `category` unchanged; conflict payload contains no `status` key.

**Reporting:** leave rows never appear in Scheduled/Unscheduled counts or duration totals; active leave reduces `adjusted_expected_work_minutes`; deleted leave has no expected-minutes impact; each member's figures isolated from the other four; overlapping/duplicate active leave copies for the same date deduct only once (§9 union safeguard); no `approved_leave_minutes` field remains anywhere.

**Boundary:** every leave API response includes the coordination-copy flag/banner data; no authentication/session/role check anywhere in the leave code path; no employee-number field accepted or stored; no medical/payroll/disciplinary/attachment field accepted or stored.

## 15. Migration Plan (executed 2026-07-16, then amended same day)

1. `database/member_leave_records_schema.sql` (fresh-install target state) and `database/migrations/2026-07-16-create-member-leave-records.sql` (original creation migration, additive-only) established the table with the original `status` column.
2. `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql` (this amendment's migration) drops the `status` column, its CHECK constraint, and the two status-keyed indexes; migrates existing Rejected/Cancelled rows to soft-deleted (`deleted_at` populated); adds two `deleted_at`-keyed replacement indexes. Wrapped in `BEGIN`/`COMMIT`, idempotent (guarded `IF EXISTS`/`IF NOT EXISTS` throughout).
3. `database/member_leave_records_schema.sql` was updated in the same amendment to reflect the target (no-status) state for any future fresh install.
4. Apply manually to Neon per this repo's existing migration convention (no automatic `Base.metadata.create_all()`).

## 16. Rollback Plan (amended)

Because the removal migration drops a column and a constraint (not purely additive), rollback is **not** a simple reverse-migration. Preferred rollback:

- Redeploy the prior application commit (which still expects the `status` column/constraint).
- The database itself would then need a **separate, explicitly reviewed** migration to re-add a `status` column — but the exact prior value (Pending vs. Approved) for rows that remained active after this amendment's migration is **not recoverable** from `deleted_at` alone. Do not auto-reintroduce a guessed status value.
- Do **not** drop `management_aios.member_leave_records` under any circumstance as part of this rollback.
- See `handover/2026-07-16__leave-status-workflow-removal-closure.md` for the full rollback procedure.

## 17. Risks (amended)

- **Cap race condition** — mitigated by the `SELECT ... FOR UPDATE` transaction strategy in §6 (now also exercised at creation time, not only at a former approval step); without it, concurrent creates/edits could exceed the 2-hour cap.
- **Category-constraint temptation** — the path of least resistance (adding "Leave" as a third `category` value on the existing table) would corrupt the existing binary Scheduled/Unscheduled partition; this design avoids it entirely by using a separate table.
- **Config-drift risk** — mitigated by snapshotting `effective_leave_minutes` at creation (amended — was Approval time) and recomputing only when the record's own date/time fields are edited, never from a later, unrelated configuration change.
- **Duplicate/overlap double-deduction** — mitigated by the date-union deduplication algorithm in §9.
- **Unauthenticated `created_by`/`updated_by`** — documentation-discipline risk only; must never be presented as verified identity in any future UI or report.
- **Multi-day + future holiday interaction** — deferring public holidays now is acceptable; the weekday-expansion logic should remain a single, isolated function so a future holiday-exclusion rule is a pure addition, not a rearchitecture.
- **(2026-07-16) Lossy migration mapping** — the Rejected/Cancelled → soft-deleted mapping is a one-way business decision; if a future reviewer disagrees with that mapping for specific historical rows, those rows cannot be un-soft-deleted with their original semantics restored automatically (they can be manually reactivated by clearing `deleted_at`, but that reactivation itself would need explicit review, since the row would then re-enter the active/conflict/reporting surface).

## 18. Parent-Truth Safeguards

- `coordination_copy_only` is DB CHECK-enforced `TRUE` and never client-settable — the official-truth boundary is structurally guaranteed, not just documented.
- `external_reference` is optional free text only; never validated against or synchronized with the official HR system.
- No official leave-balance, payroll, no-pay, disciplinary, or medical field or calculation exists anywhere in this schema.
- No historical leave notes are imported from any external system.
- Every UI surface displaying leave data carries a persistent official-copy disclaimer (design §13).
- Leave data lives exclusively in `member_leave_records` — never inside `member_schedule_events` — preserving that table's task-only semantics and its existing, already-locked `category` CHECK constraint untouched.
- Per CLAUDE.md §13, this design does not promote any content to parent-AIOS truth; it remains a Foundation Draft item pending the relevant Management Team/domain owner sign-off (§15 of the requirement document).
- (2026-07-16) Removing the approval/status workflow does not weaken this boundary — the removed "Approved" status was never an HR-system approval, and its removal is a pure simplification of the calendar-coordination UX, not a change to what this feature is authoritative for.

---
name: leave-status-workflow-removal-check-2026-07-16
type: validation-check
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: REQ-LEAVE-COPY-001-SIMPLIFICATION-AMENDMENT
status: PASS — code, database migration, deployment, and live API/frontend smoke test all confirmed
---

# Validation Check — Remove Leave Approval Workflow and Simplify Leave Lifecycle

**Check date:** 2026-07-16

## Requirement

User decision: remove the approval/status workflow (Pending/Approved/Rejected/Cancelled, Approve/Reject/Cancel actions, status-based history, status-based normal-calendar filtering) from the Management AIOS calendar leave-copy feature entirely, across backend, database, schemas, API, tests, reporting, conflict logic, and frontend. New rule: every saved leave record is immediately active (appears in calendar, blocks conflicting tasks, contributes leave-deduction minutes) until soft-deleted via a single Delete Leave action (`deleted_at`). No replacement active/inactive/status enum. Preserve leave types, leave-system time periods, and the Short Leave 120-minute cap rules (only the cap-membership condition changes, from status='Approved' to deleted_at IS NULL).

## Old Lifecycle

`Pending → Approved | Rejected | Cancelled`, with `Approved → Cancelled` as the only post-approval transition. Rejected/Cancelled were terminal and excluded from the normal calendar (visible only in a separate history view). Only `status='Approved'` rows consumed the Short Leave cap, contributed to reporting, or blocked task conflicts.

## New Lifecycle

`Create → Active → Delete (soft)`. Every row with `deleted_at IS NULL` is active — visible in the calendar, cap-consuming (Short Leave), reporting-contributing, and conflict-blocking. `DELETE /api/member-leave/{member_key}/{leave_id}` is the only removal mechanism (soft delete). No history view; no status field anywhere in the schema, API, or UI.

## Schema Changes

- New migration `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql`: soft-deletes existing Rejected/Cancelled rows (`COALESCE(deleted_at, now())` — only touches rows where `deleted_at IS NULL`, so an already-deleted row's original timestamp is preserved), drops the `status` column and its CHECK constraint, drops the two status-keyed indexes (`idx_member_leave_records_member_status`, `idx_member_leave_records_approved_conflict`), adds two `deleted_at`-keyed replacement indexes (`idx_member_leave_records_short_leave_active`, `idx_member_leave_records_active_conflict`). Wrapped in `BEGIN`/`COMMIT`, idempotent (`IF EXISTS`/`IF NOT EXISTS` guards throughout).
- `database/member_leave_records_schema.sql` (fresh-install target) updated to the no-status shape, matching the migration's end state.
- `backend/models.py`: `MemberLeaveRecord.status` column and its CHECK constraint removed. `deleted_at` and `coordination_copy_only` preserved unchanged.
- No new lifecycle/status/active-inactive enum column was introduced anywhere — confirmed by inspecting the final model and schema files.

## Migration Mapping

| Original status | Migration result |
|---|---|
| Pending | Active row (no `deleted_at` change) |
| Approved | Active row (no `deleted_at` change) |
| Rejected | Soft-deleted (`deleted_at` populated) |
| Cancelled | Soft-deleted (`deleted_at` populated) |

Confirmed as a documented, one-way business decision (not a lossless transform) in both the migration file's own comments and the design document §0/§16 rollback notes — a soft-deleted row's original Pending/Approved distinction is not reconstructable from `deleted_at` alone.

## API Changes

**Routes remaining (confirmed via `app.openapi()` — see Tests section):**

```
GET    /api/member-leave/{member_key}
POST   /api/member-leave/{member_key}
PUT    /api/member-leave/{member_key}/{leave_id}
DELETE /api/member-leave/{member_key}/{leave_id}
GET    /api/member-leave/{member_key}/summary
```

**Routes removed:** `GET /api/member-leave/{member_key}/history`, `POST /api/member-leave/{member_key}/{leave_id}/cancel` — confirmed absent from the OpenAPI schema.

**Schema field changes (confirmed via `MemberLeaveRecordOut`/`Create`/`Update`/`LeaveSummaryOut`/`LeaveConflictItemOut` `model_fields` inspection — see Tests section):**
- `status` removed from `MemberLeaveRecordOut`, `MemberLeaveRecordUpdate`, `LeaveConflictItemOut`.
- `LeaveSummaryOut.short_leave_approved_minutes` renamed `short_leave_active_minutes`.
- `DailyScheduleReportOut`/`WeeklyScheduleReportOut`/`MonthlyScheduleReportOut.approved_leave_minutes` renamed `active_leave_minutes` (all three report schemas).

**Behavior changes:** `POST` now computes and snapshots `effective_leave_minutes` and runs the Short Leave cap check immediately at creation (previously deferred until a separate approval step that no longer exists). `PUT` no longer accepts or validates a status transition; recalculates `effective_leave_minutes` and re-checks the cap whenever a date/time field changes. `DELETE` soft-deletes and returns `{"id": ..., "deleted": true}`, matching the existing `member_schedules` delete convention (404 on repeat, via `_get_active_record_or_404`).

## Frontend Changes

`web-view/index.html`:
- `LEAVE_STATUS_CLASS` map removed; leave chips/blocks (`.msc-cal-chip-leave`, `.msc-tg-allday-chip-leave`, `.msc-tg-leave-block`) now use one fixed `--draft` visual treatment instead of a per-status color variant.
- Show History button, history panel, `loadLeaveHistory`, `renderLeaveHistoryList`, and all associated state (`leaveHistoryItems`, `leaveHistoryVisible`, `leaveHistoryWrapEl`, `leaveHistoryListEl`, `leaveHistoryToggleBtn`) removed.
- `allowedLeaveTransitions`/`applyLeaveStatusChange` replaced with a single `deleteLeaveRecord(leaveId, btn)` function — confirms via `window.confirm`, calls `DELETE`, then refreshes the calendar, the leave list, and the leave-deduction report.
- `renderLeaveList` no longer renders a status badge or Approve/Reject/Cancel buttons; renders one "Delete Leave" button per leave item instead.
- The leave-conflict error-message builder no longer reads `c.status` (removed from the 409 body).
- The Schedule Summary panel's leave-deduction row reads `report.active_leave_minutes` (was `report.approved_leave_minutes`) and is labeled "Leave deduction" (was "Approved leave (deduction minutes)").
- Leave-coordination notice text no longer references "status" as a stand-in for HR approval identity.
- Confirmed via grep: zero occurrences of `lv.status`, `LEAVE_STATUS_CLASS`, `leave-pending`/`leave-approved`/`leave-rejected`/`leave-cancelled`, `data-leave-action`, `/history`, or `/cancel` remain anywhere in the file.

## Cap Behavior

`compute_short_leave_approved_minutes_for_month` renamed `compute_short_leave_active_minutes_for_month`; filter changed from `status == 'Approved'` to `deleted_at IS NULL` (leave_type='Short Leave' filter unchanged). `assert_short_leave_monthly_cap_not_exceeded` renamed `assert_active_short_leave_monthly_cap_not_exceeded`; same `SELECT ... FOR UPDATE` row-locking transaction strategy preserved, now invoked at both creation and edit (previously only at the former approval step). Confirmed no `status` reference remains in `leave_logic.py` via grep (only explanatory comments confirming the removal).

## Conflict Behavior

`find_conflicting_approved_leave` renamed `find_conflicting_active_leave`; filter changed from `status == 'Approved'` to `deleted_at IS NULL`. Both call sites in `backend/routers/member_schedules.py` (`create_member_schedule_event`, `update_member_schedule_event`) updated. `leave_conflict_response_body` no longer includes a `status` key in each conflict entry — confirmed by the updated `ConflictResponseBodyTests.test_response_body_shape_and_no_purpose_field` test, which now explicitly asserts `assertNotIn("status", conflict)`.

## Reporting Behavior

`approved_leave_minutes_for_date`/`compute_approved_leave_minutes_for_period` renamed `active_leave_minutes_for_date`/`compute_active_leave_minutes_for_period`; the underlying interval-merge/overlap-deduplication/daily-cap-540 algorithm is byte-for-byte unchanged — confirmed by running the existing `OverlapDeduplicationTests` suite (9 tests, renamed calls only, same assertions/expected values) with zero failures. `_leave_report_additions` in `member_schedules.py` renamed its local variable and returned dict key from `approved_leave_minutes` to `active_leave_minutes`, matching the renamed schema field.

## Deletion Behavior

`DELETE /api/member-leave/{member_key}/{leave_id}` added to `backend/routers/member_leave.py`, using the same `_get_active_record_or_404` pre-check used by `GET`/`PUT` (so a soft-deleted or nonexistent id returns 404 on repeat delete, matching `member_schedules`'s existing single-delete convention exactly — no idempotent-200-on-repeat behavior was introduced, since that repo convention does not use one).

## Tests

- `backend/tests/test_member_leave.py` updated: `StatusTransitionTests` replaced with `SimplifiedLifecycleTests` (asserts `status` absent from `MemberLeaveRecordOut`/`Create`/`Update` via Pydantic `model_fields`); `FakeLeaveRecord.status` field removed; all `approved_leave_minutes_for_date` calls renamed `active_leave_minutes_for_date`; `ConflictResponseBodyTests` updated to assert no `status` key.
- **62/62 tests pass** in `backend.tests.test_member_leave` (`python -m unittest backend.tests.test_member_leave -v`).
- **132/132 tests pass** across the full backend suite (`python -m unittest discover -s backend/tests -p "test_*.py"`) — confirms zero regression in unrelated schedule-classification and duration-reporting test suites.
- `python -c "from backend.main import app"` succeeds (no import errors from the renamed/removed symbols).
- `app.openapi()` inspected directly: confirmed exact route set (`GET`/`POST`/`PUT`/`DELETE`/`GET .../summary`, no `/history`, no `/cancel`) and confirmed `status` absent from every leave-related schema's `properties`.

## Live Validation

**Database:** connected successfully to the live Neon database (`management_aios` schema confirmed present, `member_leave_records` table confirmed present, 3 existing rows: 2 Approved + 1 Cancelled, 0 already-deleted). The user ran `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql` manually. The assistant reconnected afterward and independently verified: `status` column absent, `status` CHECK constraint absent, 2 active rows, 1 soft-deleted row (matches the expected mapping exactly), the three intended indexes present and the two dropped status-keyed indexes absent, and `member_schedule_events` unchanged at 195 rows. See `evidence/database/member-leave-status-removal-migration-execution-2026-07-16.md` for the full pre- and post-migration record. **Database migration: PASS.**

**API/frontend live smoke test (Steps 19–20):** performed against the deployed production API/frontend after push, using disposable records, all cleaned up afterward:

1. `POST /api/member-leave/paraparan` (Full-Day, 2027-03-15, far-future date) → 201, immediately returned with `effective_leave_minutes: 540` and no `status` field.
2. `GET /api/member-leave/paraparan?start_date=2027-03-15&end_date=2027-03-15` → the new record appeared immediately.
3. `POST /api/member-schedules/paraparan` (a task on the same date) → 409 `leave_conflict`, message "This task conflicts with active leave.", conflict entry has no `status` key.
4. `GET /api/member-schedules/paraparan/reports/daily?date=2027-03-15` → `active_leave_minutes: 540`, no `approved_leave_minutes` key present, `adjusted_expected_work_minutes: 0`.
5. `DELETE /api/member-leave/paraparan/{leave_id}` → 200, `{"deleted": true}`.
6. Repeat GET → the record no longer appears.
7. Repeat the same task `POST` → now succeeds (201) — the conflict is gone after deletion. This disposable test task was then deleted via `DELETE /api/member-schedules/paraparan/{event_id}` → 200.
8. Deployed frontend HTML fetched and grepped: zero occurrences of `Show history`, `leave-status-badge`, `data-leave-action`, or `LEAVE_STATUS_CLASS`; 5 occurrences of `Delete Leave`/`deleteLeaveRecord`; 2 occurrences of `active_leave_minutes`.
9. Deployed `app.openapi()` (`https://management-aios-api.vercel.app/openapi.json`) confirmed the exact route set and confirmed `status` absent from `MemberLeaveRecordOut`/`MemberLeaveRecordUpdate`/`LeaveConflictItemOut`.

All disposable records were deleted after verification; no leftover test data remains in the production database.

## Known Limitations

- The Rejected/Cancelled → soft-deleted migration mapping is a one-way, explicit business decision (see design doc §17) — not reversible to the original per-row status without a separately reviewed migration, and even then only for whichever rows a reviewer manually reclassifies.
- `backend/routers/leave_logic.py`'s DB-dependent functions (`compute_short_leave_active_minutes_for_month`, `compute_active_leave_minutes_for_period`, `find_conflicting_active_leave`) are exercised in the automated test suite only through their DB-free building blocks (matching this repo's pre-existing testing convention for this module) — the actual SQLAlchemy query construction is covered indirectly by the live production smoke test above, but not by a dedicated automated integration test in this environment.

## PASS / AMBER / FAIL

**PASS.** Code-level implementation (backend, schema files, frontend, tests, docs) is complete and internally consistent — all automated tests pass, the OpenAPI contract matches the required route/field set exactly, and static analysis confirms zero remaining approval-workflow references anywhere in the changed files. The migration ran successfully against the live database (user-executed, assistant-verified). The code was pushed, deployed, and directly smoke-tested end-to-end against the live production API and frontend using disposable records, all of which were cleaned up afterward.

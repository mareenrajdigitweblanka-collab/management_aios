---
name: leave-status-workflow-removal-closure
type: handover-closure
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: REQ-LEAVE-COPY-001-SIMPLIFICATION-AMENDMENT
status: PASS — code, migration, deployment, and live smoke test all confirmed
---

# Handover Closure — Remove Leave Approval Workflow and Simplify Leave Lifecycle

**Closure date:** 2026-07-16

## Requirement

User decision: remove the Pending/Approved/Rejected/Cancelled approval/status workflow from the Management AIOS calendar leave-copy feature entirely — backend, database, schemas, API, tests, reporting, conflict logic, and frontend all simplified consistently. New rule: every saved leave record is immediately active until soft-deleted (`deleted_at`) via a single Delete Leave action. No replacement status/active-inactive enum. Leave types, leave-system time periods, and the Short Leave 120-minute cap rules preserved (only the cap-membership condition changed).

## Files Changed

| File | Action |
|---|---|
| `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql` | CREATED — status-removal migration (soft-delete Rejected/Cancelled, drop status column/constraint/indexes, add replacement indexes) |
| `database/member_leave_records_schema.sql` | Modified — fresh-install schema updated to the no-status target state |
| `backend/models.py` | Modified — `MemberLeaveRecord.status` column and CHECK constraint removed |
| `backend/schemas.py` | Modified — `LeaveStatus` removed; `status` removed from `MemberLeaveRecordUpdate`/`Out`/`LeaveConflictItemOut`; `short_leave_approved_minutes` → `short_leave_active_minutes`; `approved_leave_minutes` → `active_leave_minutes` (×3 report schemas) |
| `backend/routers/leave_logic.py` | Modified — status-transition state machine removed; cap/reporting/conflict functions renamed and re-filtered on `deleted_at IS NULL` instead of `status == 'Approved'`; `status` key removed from conflict response body |
| `backend/routers/member_leave.py` | Modified — `/history` and `/cancel` routes removed; new `DELETE` route added; `POST`/`PUT` rewritten for immediate-active creation and edit-time recalculation |
| `backend/routers/member_schedules.py` | Modified — renamed `leave_logic` function calls; `_leave_report_additions` field renamed |
| `backend/config.py` | Modified — `VALID_LEAVE_STATUSES` removed |
| `backend/tests/test_member_leave.py` | Modified — `StatusTransitionTests` replaced with `SimplifiedLifecycleTests`; renamed function calls; `FakeLeaveRecord.status` removed; conflict-body test updated |
| `web-view/index.html` | Modified — `LEAVE_STATUS_CLASS` and per-status CSS variants removed; Show History UI and state removed; Approve/Reject/Cancel replaced with Delete Leave; Schedule Summary leave-deduction field/label updated |
| `docs/2026-07-16_management-calendar-leave-copy-requirement.md` | Modified — §0 amendment added; status-dependent sections (§7–§13, §18) rewritten |
| `docs/management-calendar-leave-copy-design.md` | Modified — §0 amendment added; status-dependent sections (§4–§13, §16–§18) rewritten |
| `validation/leave-status-workflow-removal-check-2026-07-16.md` | CREATED (this closure's paired validation file) |
| `handover/2026-07-16__leave-status-workflow-removal-closure.md` | CREATED (this file) |
| `evidence/database/member-leave-status-removal-migration-execution-2026-07-16.md` | CREATED |

## New API Routes

`DELETE /api/member-leave/{member_key}/{leave_id}` — soft-deletes an active leave record; 404 on repeat (matching the `member_schedules` delete convention).

## Removed API Routes

`GET /api/member-leave/{member_key}/history`, `POST /api/member-leave/{member_key}/{leave_id}/cancel` — confirmed absent from `app.openapi()`.

## Migration

`database/migrations/2026-07-16-remove-member-leave-status-workflow.sql`. Mapping: Pending/Approved → active row (unchanged); Rejected/Cancelled → soft-deleted (`deleted_at` populated via `COALESCE`, preserving any already-deleted row's original timestamp). Drops `status` column, its CHECK constraint, and two status-keyed indexes; adds two `deleted_at`-keyed replacement indexes. Idempotent, wrapped in `BEGIN`/`COMMIT`.

**Execution status:** connected to the live Neon database and completed a read-only pre-migration inspection (3 existing rows: 2 Approved, 1 Cancelled, 0 already-deleted — see the paired evidence file). The user ran the mutating migration manually. The assistant reconnected afterward and independently confirmed: `status` column absent, `status` CHECK constraint absent, 2 active rows, 1 soft-deleted row (exact expected mapping), correct index set, `member_schedule_events` unaffected (195 rows, unchanged). **Migration confirmed successful.**

## Rollback

Not a simple reverse-migration, since this migration drops a column and a constraint (not purely additive) and mutates existing rows. Preferred rollback:

1. Redeploy the prior application commit (`4244c06` or earlier, which still expects the `status` column/constraint).
2. Any database-side rollback (re-adding a `status` column) requires a **separately reviewed** migration — the exact prior value (Pending vs. Approved) for rows that remained active after this migration is **not recoverable** from `deleted_at` alone. Do not auto-reintroduce a guessed status value.
3. Do **not** drop `management_aios.member_leave_records` under any circumstance.
4. If only the application code needs rolling back (database migration not yet run, or already run and left in place): the new code is backward-compatible with the pre-migration table shape (SQLAlchemy's `MemberLeaveRecord` model simply no longer maps the `status` column; Postgres's own `DEFAULT 'Pending'` continues to satisfy inserts), so reverting only `backend/`/`web-view/index.html` without touching the database is safe in either direction.

## Deployment

Pushed to `origin/main` after the user confirmed the migration ran successfully; Vercel auto-deployed both the frontend (`management-aios.vercel.app`) and backend API (`management-aios-api.vercel.app`) projects. Confirmed live: backend `/health` → HTTP 200; frontend → HTTP 200; deployed `app.openapi()` shows the exact new route set (no `/history`, no `/cancel`, `DELETE` present) and confirms `status` absent from every leave-related schema.

## Commit Hashes

`b2280b8` "Remove leave approval workflow" (backend + database), `99fd0a8` "Simplify leave calendar UI" (frontend), `74da817` "Add migration and validation evidence" (docs + validation + handover + DB evidence), `ba6d335` "Record post-migration database verification" (evidence update after the user confirmed the migration ran). Pushed to `origin/main`: `4244c06..ba6d335 main -> main`.

## Queryability Result

PASS — this closure file, its paired validation file, the database evidence file, and both amended docs are plain-English Markdown, each stating the requirement, what changed, and why, so a future query can answer "why does leave no longer have a status" without re-reading the diff.

## PASS / FAIL

**PASS** (see paired validation file for the full breakdown) — code complete and tested, migration executed and verified, code deployed, and a live end-to-end smoke test (create → appears in GET → blocks a conflicting task → contributes to reporting → delete → disappears → conflict clears) performed against production with disposable records, all cleaned up afterward.

## One Next Step

Ask Mayurika and Arun (per §15 of the requirement document) to review the amended requirement/design docs and confirm the simplified create-active-delete lifecycle meets their operational expectations, since the original approval-workflow design was never formally signed off before this amendment superseded it.

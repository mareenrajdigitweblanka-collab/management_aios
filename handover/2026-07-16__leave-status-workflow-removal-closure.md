---
name: leave-status-workflow-removal-closure
type: handover-closure
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: REQ-LEAVE-COPY-001-SIMPLIFICATION-AMENDMENT
status: AMBER — code complete and tested; live DB migration execution and post-deploy live validation pending
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

**Execution status:** connected to the live Neon database and completed a read-only pre-migration inspection (3 existing rows: 2 Approved, 1 Cancelled, 0 already-deleted — see the paired evidence file). The user chose to run the mutating migration manually rather than have it executed by the assistant in this session. **The migration has not yet been confirmed as run** as of this closure.

## Rollback

Not a simple reverse-migration, since this migration drops a column and a constraint (not purely additive) and mutates existing rows. Preferred rollback:

1. Redeploy the prior application commit (`4244c06` or earlier, which still expects the `status` column/constraint).
2. Any database-side rollback (re-adding a `status` column) requires a **separately reviewed** migration — the exact prior value (Pending vs. Approved) for rows that remained active after this migration is **not recoverable** from `deleted_at` alone. Do not auto-reintroduce a guessed status value.
3. Do **not** drop `management_aios.member_leave_records` under any circumstance.
4. If only the application code needs rolling back (database migration not yet run, or already run and left in place): the new code is backward-compatible with the pre-migration table shape (SQLAlchemy's `MemberLeaveRecord` model simply no longer maps the `status` column; Postgres's own `DEFAULT 'Pending'` continues to satisfy inserts), so reverting only `backend/`/`web-view/index.html` without touching the database is safe in either direction.

## Deployment

**Held, per the task's own instruction not to deploy application changes until the status-removal database migration has successfully run.** Push to `origin/main` (which triggers Vercel's existing auto-deploy) is deferred until the user confirms the migration has been executed. See the final report for the actual commit hash(es) and current push/deploy status at the time this session ends.

## Commit Hashes

Recorded in `git log` as the commit(s) introducing these files, made after this closure file. See the final report delivered alongside this closure for the exact short hash(es) captured at commit time (not embedded here to avoid a self-referential value inside a file whose own content determines that hash).

## Queryability Result

PASS — this closure file, its paired validation file, the database evidence file, and both amended docs are plain-English Markdown, each stating the requirement, what changed, and why, so a future query can answer "why does leave no longer have a status" without re-reading the diff.

## PASS / FAIL

**AMBER** (see paired validation file for the detailed breakdown) — code complete, tested, and internally consistent; live database migration execution and post-deploy live validation are the two remaining steps before this closes as a full PASS.

## One Next Step

After running `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql` against the live Neon database, run its embedded post-`COMMIT` validation queries, record the results in a follow-up update to `evidence/database/member-leave-status-removal-migration-execution-2026-07-16.md`, then push/deploy and perform the live create → get → conflict → delete smoke test described in the validation file's "Live Validation" section before upgrading this closure's status to PASS.

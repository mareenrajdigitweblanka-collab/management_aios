---
name: member-leave-status-removal-migration-execution
type: database-execution-evidence
created: 2026-07-16
requirement-id: REQ-LEAVE-COPY-001-SIMPLIFICATION-AMENDMENT
status: AMBER — connected to the correct database, pre-migration inspection completed; mutating migration NOT executed by the assistant (user opted to run it manually)
---

# Database Migration Execution Evidence — Status Workflow Removal — 2026-07-16

## Migration Under Evaluation

`database/migrations/2026-07-16-remove-member-leave-status-workflow.sql`

## Database Connection Used

`backend/config.DATABASE_URL` (read from the repository's own `.env`, git-ignored, never logged or printed). Connected via SQLAlchemy with a 10-second `connect_timeout`.

Unlike the prior recorded environment limitation (`evidence/database/management-calendar-leave-copy-migration-execution-2026-07-16.md` — direct Neon access previously hung at the SSL/TLS handshake layer from this workstation), the connection succeeded in this session.

## Pre-Migration Inspection (read-only, performed before any write)

Schemas present on this connection: `information_schema`, `management_aios`, `pg_catalog`, `pg_toast`, `public`.

- `management_aios` schema: **confirmed present.**
- `management_aios.member_leave_records` table: **confirmed present.**
- `management_aios.member_schedule_events` table: **confirmed present.**
- This is confirmed as the correct Management AIOS database (matching the requirement's own table/schema names), not the unrelated company database flagged in the prior evidence file.

`management_aios.member_leave_records` column list (pre-migration): `id`, `member_key`, `member_label`, `leave_type`, `half_day_period`, `start_date`, `end_date`, `start_time`, `end_time`, `status`, `purpose`, `external_reference`, `coordination_copy_only`, `policy_source_id`, `effective_leave_minutes`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`.

**Pre-migration active-row counts grouped by status** (`WHERE deleted_at IS NULL GROUP BY status`):

| status | count |
|---|---|
| Approved | 2 |
| Cancelled | 1 |

(No `Pending` or `Rejected` rows present.)

- Already soft-deleted rows (`deleted_at IS NOT NULL`) before this migration: **0**.
- Total row count in `member_leave_records`: **3**.
- `member_schedule_events` row count (baseline, to confirm this migration does not affect it): **195**.

No row content beyond aggregate counts and column names was read, logged, or printed — no `purpose`, `external_reference`, `member_label`, or date/time value from any individual row was retrieved or displayed at any point in this session.

## Execution Decision

Given this is the live database backing the deployed production application, and the migration drops a column and a CHECK constraint and soft-deletes the 1 `Cancelled` row (a schema change plus a data mutation, not purely additive), the assistant paused and asked the user for explicit confirmation before running it. **The user chose to run the migration manually themselves** rather than have the assistant execute it directly.

**Result: the mutating migration (`BEGIN...COMMIT` body of `2026-07-16-remove-member-leave-status-workflow.sql`) was NOT executed by the assistant in this session.** No column was dropped, no constraint was removed, no row was soft-deleted, and no index was created or dropped as a result of this evidence-gathering pass.

## What Must Happen Before This Feature Is Considered Fully Deployed

1. The user runs `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql` against the same Neon database confirmed above (e.g. `psql "$DATABASE_URL" -f database/migrations/2026-07-16-remove-member-leave-status-workflow.sql`, or pasted into the Neon SQL console).
2. The migration's own embedded post-`COMMIT` validation queries are run and their results recorded (status column absent, status constraint absent, active row count, soft-deleted row count, index list, unaffected `member_schedule_events` count).
3. This evidence file (or a dated follow-up) is updated with those post-migration results before the AMBER status is upgraded to PASS.
4. Only after the migration has run: deploy/confirm the backend application code (already committed) against this database, since the new backend code no longer references the `status` column at all (it is backward-compatible with the pre-migration table shape — the column simply becomes unused dead weight until the migration runs) but the task's own instruction is not to claim full deployment until the migration has succeeded.

## Sensitive-Data Confirmation

No credentials, connection strings, or `.env` contents were logged, printed, or included in this file or anywhere else in this session's output. No individual leave record's `purpose`, `external_reference`, or personally-identifying content was read or displayed.

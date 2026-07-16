---
name: member-leave-status-removal-migration-execution
type: database-execution-evidence
created: 2026-07-16
requirement-id: REQ-LEAVE-COPY-001-SIMPLIFICATION-AMENDMENT
status: PASS — migration executed by the user against the live database; post-migration state independently verified by the assistant
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

Given this is the live database backing the deployed production application, and the migration drops a column and a CHECK constraint and soft-deletes the 1 `Cancelled` row (a schema change plus a data mutation, not purely additive), the assistant paused and asked the user for explicit confirmation before running it. **The user chose to run the migration manually themselves** rather than have the assistant execute it directly, and confirmed it completed successfully.

## Post-Migration Verification (performed by the assistant, read-only)

Reconnected to the same database and independently re-queried its state after the user ran the migration:

| Check | Result |
|---|---|
| `status` column present in `member_leave_records`? | **No** — absent from the column list |
| `member_leave_records_status_check` constraint present? | **No** — 0 rows in `pg_constraint` |
| Active row count (`deleted_at IS NULL`) | **2** |
| Soft-deleted row count (`deleted_at IS NOT NULL`) | **1** |
| Indexes on `member_leave_records` | `idx_member_leave_records_active_conflict`, `idx_member_leave_records_member_date`, `idx_member_leave_records_short_leave_active`, `member_leave_records_pkey` — matches the migration's intended end state exactly; the two dropped status-keyed indexes are absent |
| `member_schedule_events` row count | **195** — unchanged from the pre-migration baseline, confirming no cross-table effect |

This matches the pre-migration state exactly as predicted by the mapping rule: the 2 `Approved` rows became active (unchanged `deleted_at`), and the 1 `Cancelled` row became soft-deleted. No `Pending`/`Rejected` rows existed to migrate.

**Result: the migration executed successfully.** The `status` column and its CHECK constraint are gone, the intended replacement indexes exist, row counts match the expected mapping, and `member_schedule_events` is confirmed untouched.

## What Happens Next

With the migration confirmed, the application code (already committed: `b2280b8`, `99fd0a8`, `74da817`) can be pushed and deployed — the new backend code maps exactly to this post-migration table shape (no `status` column reference anywhere).

## Sensitive-Data Confirmation

No credentials, connection strings, or `.env` contents were logged, printed, or included in this file or anywhere else in this session's output. No individual leave record's `purpose`, `external_reference`, or personally-identifying content was read or displayed.

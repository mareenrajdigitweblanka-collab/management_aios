---
name: schedule-item-title-limit-120-migration-execution
type: database-execution-evidence
created: 2026-07-16
status: PASS — migration applied to the correct Management AIOS Neon database ("schedule"); title column confirmed widened to VARCHAR(120)
---

# Database Migration Execution Evidence — Schedule Item Title Limit Increase — 2026-07-16

## Migration Under Evaluation

- `database/migrations/2026-07-16-increase-member-schedule-title-limit.sql`
- Companion schema: `database/member_schedule_events_schema.sql`

## Database Identity Confirmation

Executed by the user directly via the Neon SQL Editor (VS Code Neon extension), connected to Neon project **AIOS**, branch **production**, database **`schedule`** — the same database previously confirmed (in the REQ-LEAVE-COPY-001 migration) to contain the `management_aios` schema with `member_schedule_events`, `staff_dashboard_records`, and `member_leave_records` tables (all visible in the Neon object-browser sidebar tree throughout this session).

**Important correction recorded during this session:** an MCP-connected Postgres tool available in this environment reports `current_database() = 'order_management_copy'` — this is a *different* database from the one this migration was applied to. The user explicitly confirmed the correct database is the Neon `schedule` database (accessed via the Neon VS Code extension SQL Editor), not the MCP-connected `order_management_copy` database. No SQL was executed against the MCP connection in this session; all statements below were run directly by the user in the Neon SQL Editor against `schedule`.

## Pre-Check

Prior to this migration, `management_aios.member_schedule_events` was already confirmed present on the `schedule` database (established in the prior REQ-LEAVE-COPY-001 database evidence). The `title` column's pre-migration state (`character_maximum_length = 60`) is the documented starting point per `backend/models.py`/`database/member_schedule_events_schema.sql` prior to this change.

## Migration Result

```sql
BEGIN;
ALTER TABLE management_aios.member_schedule_events
    ALTER COLUMN title TYPE VARCHAR(120);
COMMIT;
```

Executed successfully by the user (Neon SQL Editor, `schedule` database) — completed in 443ms with no error, consistent with the expected "0 rows" DDL result (an `ALTER COLUMN ... TYPE` widening operation is metadata-only in PostgreSQL; it does not rewrite or touch any row).

## Column Result (Confirmed)

Post-migration query, run and screenshotted by the user:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'member_schedule_events'
  AND column_name = 'title';
```

**Result: 1 row —** `column_name = title`, `data_type = character varying`, `character_maximum_length = 120`. This directly confirms the column now accepts up to 120 characters.

## No-Truncation Check

```sql
SELECT id, length(title) AS title_length
FROM management_aios.member_schedule_events
WHERE length(title) > 120;
```

Result: **0 rows** — confirmed by the user's screenshot. No existing title exceeds 120 characters (expected, since every row was created under the previous 60-character limit), and this migration cannot truncate data regardless (widening only).

## Row-Count / Existing-Data Confirmation

A dedicated "row count before vs. after" comparison was not separately captured as an isolated result in this session (the Neon SQL Editor's multi-statement result display only surfaces the last statement's output when queries are batched — the same documented UI behavior encountered during the REQ-LEAVE-COPY-001 migration). This is not treated as a gap: `ALTER COLUMN ... TYPE VARCHAR(120)` widening an already-`VARCHAR(60)` column is a metadata-only change in PostgreSQL — it structurally cannot insert, delete, or modify any row (there is no `USING` clause performing a data transformation here, just a length-constraint relaxation), so no row-count drift is possible from this specific operation by construction, independent of any query confirming it.

## API Boundary Validation

A live round-trip through the deployed/local API (POST with a 121-character title and confirming a 422) was not performed in this session — this workstation has a previously documented limitation connecting live to Neon for running the local FastAPI server against this exact database (see `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7). Confidence in correct end-to-end behavior instead comes from the combination of:
1. The database column now accepts up to 120 characters (confirmed above).
2. `backend/schemas.py`'s `MemberScheduleEventCreate`/`MemberScheduleEventUpdate` both enforce `max_length=120` (unit-tested — see `validation/schedule-item-title-limit-120-check-2026-07-16.md`), which rejects any 121+ character title with an HTTP 422 *before* a database write is attempted, regardless of what the database column itself would tolerate.

Since the schema layer's ceiling (120) now exactly matches the database column's ceiling (120), there is no request that could reach the database with a title the column would reject, and no valid ≤120-character request that the schema would block that the database would have accepted.

## Cleanup

No disposable rows were inserted directly against the database as part of this validation — every check used read-only `information_schema`/`length()` queries. No cleanup is required.

## PASS / FAIL

**PASS.** The migration was applied to the confirmed-correct Management AIOS Neon database (`schedule` project, `management_aios` schema) and the `title` column is confirmed, via direct query result, to now be `VARCHAR(120)`. No existing row's title required truncation. No credentials were exposed at any point in this exchange.

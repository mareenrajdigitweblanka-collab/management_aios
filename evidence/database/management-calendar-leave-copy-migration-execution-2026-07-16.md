---
name: management-calendar-leave-copy-migration-execution
type: database-execution-evidence
created: 2026-07-16
requirement-id: REQ-LEAVE-COPY-001
status: AMBER — migration authored and reviewed; NOT executed against the correct Management AIOS database in this session
---

# Database Migration Execution Evidence — REQ-LEAVE-COPY-001 — 2026-07-16

## Migration Under Evaluation

- `database/migrations/2026-07-16-create-member-leave-records.sql`
- Companion schema file: `database/member_leave_records_schema.sql`

## Available Database Connection in This Session

An MCP Postgres connection (`mcp__claude_ai_postgres__*` tools) was available in this session. Before attempting any pre-check or execution, its identity was confirmed via `list_schemas`.

**Result: this connection is an unrelated company database, not the Management AIOS database.**

Schemas present: `analytics`, `audit`, `blos`, `business_intelligence`, `cppc_intelligence`, `cppc_staff_ui`, `daily_task`, `development`, `google_search_console`, `governance`, `growth_protection_engine`, `listing_generator`, `message`, `message_claude_reply`, `message_submission`, `ph_action_board`, `public`, `raw_data`, `sandbox`, `staging_ai`, `supplier`, `tech_team_projects`, `tech_team_outputs`, `validation`, `wayfair_catalog` (plus system schemas).

**Pre-check confirmation (per task instructions):**

- `management_aios` schema: **NOT present.**
- `management_aios.member_schedule_events` table: **NOT present** (no `management_aios` schema exists at all on this connection).
- Conclusion: this is **not** the approved Management AIOS PostgreSQL database — it is a separate, unrelated company database (evidently a broader analytics/operations warehouse). Per the task's explicit instruction ("do not use an unrelated company PostgreSQL connection"), **no SQL was executed against this connection** — not the migration, not even a read-only `SELECT`.

No credentials were logged, printed, or exposed at any point during this check.

## Why No Other Connection Was Available

This repository's own `backend/database.py` reads `DATABASE_URL` from the environment (`.env`, git-ignored) to reach the actual Neon-hosted `management_aios` schema. Prior sessions in this repository (see `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7 and the test-suite docstrings in `backend/tests/`) have already documented that direct Neon access from this workstation hangs at the SSL/TLS handshake layer — a pre-existing, previously-confirmed environment limitation, not something introduced by this task. This session did not attempt to re-trigger that hang (no value in repeating an already-documented failure mode), and did not attempt to read or print the `.env` file's contents.

## Result

**The migration was authored, reviewed against the existing `database/member_schedule_events_schema.sql`/migration conventions, and is ready to apply — but it was NOT executed against the correct `management_aios` database in this session.**

Per the task's explicit instruction for this scenario:

> If the correct database connection is unavailable: complete all code and migration files, return AMBER, do not claim the database is deployed.

This evidence file records that outcome. No table was created. No constraint, index, or row exists yet for `management_aios.member_leave_records` anywhere.

## What Must Happen Before This Feature Is Considered Deployed

1. Connect to the actual Management AIOS Neon Postgres instance (the one `backend/database.py`/`DATABASE_URL` in the real deployment environment points to — not the MCP connection checked above).
2. Confirm `management_aios` schema and `management_aios.member_schedule_events` exist on that connection (the pre-check this task required).
3. Run `database/migrations/2026-07-16-create-member-leave-records.sql` inside its own transaction (already wrapped in `BEGIN`/`COMMIT` in the file).
4. Run the six validation queries embedded at the bottom of that migration file (column list, CHECK constraints, indexes, `coordination_copy_only` default, row count, and unaffected `member_schedule_events` row count).
5. Record the actual results of those queries in a follow-up update to this evidence file (or a new dated evidence file) before removing the AMBER status.
6. Only after that: run a live insert/read/status-transition smoke test through the deployed API (`POST`/`GET`/`PUT`/`cancel` on `/api/member-leave/{member_key}`), then remove any disposable test rows.

## Sensitive-Data Confirmation

No credentials, connection strings, or `.env` contents were logged, printed, or included in this file or anywhere else in this session's output.

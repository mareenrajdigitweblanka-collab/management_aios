# Announcement & Notification Migration — Live Execution Verification (2026-08-12)

**Requirement ID:** REQ-ANN-001
**Purpose:** Read-only, post-hoc verification that `database/migrations/2026-08-12-create-announcements.sql` was correctly applied to the live database, and that no unrelated production data was disturbed.
**Database:** `order_management_copy`
**Schema:** `management_aios`

---

## 1. Execution Status

**EXECUTED.** The migration file was originally authored and committed as a DRAFT — NOT EXECUTED design artifact, with an explicit instruction that Claude Code must not run it. Claude Code never executed this file at any point. Execution was carried out manually by the user/admin, outside Claude Code, via a manual DB client (Beekeeper), after the required schema privilege (`CREATE` on `management_aios`) was confirmed present for the executing role.

- **Execution date:** 2026-08-12
- **Execution authority:** User/admin, manual, human-authorized
- **Execution channel:** Manual DB client (Beekeeper) — not Claude Code, not an application code path
- **Whether the file ran verbatim (including `CREATE EXTENSION`/`CREATE SCHEMA`) or a trimmed block:** Not independently evidenced. `pgcrypto` was already installed and `management_aios` already existed prior to this migration, so both statements are no-ops either way (`IF NOT EXISTS`) — the resulting DB state is identical under both paths, so this cannot be distinguished after the fact. Recorded as unknown rather than guessed.

## 2. Live Table Existence

```sql
SELECT
    to_regclass('management_aios.announcements') AS announcements,
    to_regclass('management_aios.announcement_mentions') AS announcement_mentions;
```

Result: both resolved (`management_aios.announcements`, `management_aios.announcement_mentions`). **PASS.**

## 3. Live Columns

**`management_aios.announcements`** — confirmed present: `id` (uuid), `title` (varchar), `body` (text), `status` (varchar), `created_by` (varchar), `created_at` (timestamptz), `updated_at` (timestamptz), `published_at` (timestamptz), `deleted_at` (timestamptz), `deleted_by` (varchar). Matches the design exactly. **PASS.**

**`management_aios.announcement_mentions`** — confirmed present: `id` (uuid), `announcement_id` (uuid), `mentioned_member_key` (varchar), `created_at` (timestamptz), `notified_at` (timestamptz), `read_at` (timestamptz). Matches the design exactly. **PASS.**

## 4. Live Constraints

**`announcements`** (7 CHECK + 1 PK, all present and matching):
- `announcements_status_check` — status IN ('Draft','Published')
- `announcements_published_at_pairing_check` — Draft⇒published_at NULL / Published⇒published_at NOT NULL
- `announcements_delete_only_while_draft_check` — deleted_at IS NULL OR status='Draft'
- `announcements_soft_delete_pairing_check` — deleted_at/deleted_by paired
- `announcements_title_nonblank_check` — trim(title) length > 0
- `announcements_body_nonblank_check` — trim(body) length > 0
- `announcements_body_max_length_check` — length(body) <= 10000
- `announcements_pkey` — PRIMARY KEY (id)

**`announcement_mentions`** (2 CHECK + 1 PK + 1 FK, all present and matching):
- `announcement_mentions_read_requires_notified_check` — read_at IS NULL OR notified_at IS NOT NULL
- `announcement_mentions_read_not_before_notified_check` — read_at IS NULL OR notified_at IS NULL OR read_at >= notified_at
- `announcement_mentions_pkey` — PRIMARY KEY (id)
- `announcement_mentions_announcement_id_fkey` — FOREIGN KEY (announcement_id) REFERENCES announcements(id)

All constraint definitions verified via `pg_constraint` / `pg_get_constraintdef`. **PASS.**

## 5. Live Indexes

**`announcements`:** `announcements_pkey`, `idx_announcements_published` (published_at DESC WHERE Published, not deleted), `idx_announcements_creator_drafts` (created_by, created_at DESC WHERE Draft, not deleted). **PASS.**

**`announcement_mentions`:** `announcement_mentions_pkey`, `idx_announcement_mentions_unique_target` (UNIQUE announcement_id, mentioned_member_key), `idx_announcement_mentions_announcement` (announcement_id), `idx_announcement_mentions_member_notified` (mentioned_member_key, notified_at DESC WHERE notified_at NOT NULL), `idx_announcement_mentions_member_unread` (mentioned_member_key WHERE notified_at NOT NULL AND read_at IS NULL). **PASS.**

All indexes verified via `pg_indexes`. **PASS.**

## 6. Initial Row Counts

```sql
SELECT count(*) FROM management_aios.announcements;          -- 0
SELECT count(*) FROM management_aios.announcement_mentions;   -- 0
```

Both tables contain **0 rows**. No seed or business data was introduced by this migration. **PASS.**

## 7. Existing Tables Unaffected

Read-only recount after execution, confirming no pre-existing table was dropped, altered, or emptied:

| Table | Row Count |
|---|---|
| `management_aios.knowledge_documents` | 1 |
| `management_aios.staff_review_summaries` | 6 |
| `management_aios.staff_dashboard_records` | 312 |
| `management_aios.member_leave_records` | 42 |
| `management_aios.member_schedule_events` | 1083 |

All queried successfully and contain non-zero pre-existing data. **PASS — unaffected.**

## 8. `test_table` — Unrelated Existing Object

`management_aios.test_table` exists live. Read-only inspection only, no modification:

- **Owner:** `temp_user`
- **Columns:** `id` (integer) — single column
- **Row count:** 0

**Classification: UNRELATED EXISTING OBJECT — NOT TOUCHED.** Not part of REQ-ANN-001 or this migration. Not referenced anywhere in `database/migrations/2026-08-12-create-announcements.sql`, `backend/routers/announcements.py`, or `backend/models.py`. Most plausibly a manual privilege-verification artifact created by `temp_user` after `CREATE` was granted on the schema/database (see §9). Not dropped, altered, or written to by this task. Recorded as a follow-up item only — does not block REQ-ANN-001 closure.

## 9. `temp_user` Privilege State (environment/privilege change record)

```sql
SELECT
    has_schema_privilege('temp_user','management_aios','USAGE')  AS schema_usage,
    has_schema_privilege('temp_user','management_aios','CREATE') AS schema_create,
    has_database_privilege('temp_user','order_management_copy','CREATE') AS database_create;
```

Result: `schema_usage = true`, `schema_create = true`, `database_create = true`.

This is a known environment/privilege change, not part of the REQ-ANN-001 migration file itself:
- `temp_user` schema-level USAGE + CREATE on `management_aios` was already in place prior to this closure task (verified in an earlier read-only inspection session).
- `temp_user` database-level CREATE on `order_management_copy` was granted separately, in this working session, via explicit user authorization (`GRANT CREATE ON DATABASE order_management_copy TO temp_user;`), after the user was asked to confirm and explicitly answered "Yes, execute it now." This is broader than the minimum required for REQ-ANN-001 (which only ever needed schema-level CREATE) — flagged at the time as an intentional but non-minimal grant.

No privilege changes were made during this closure task. **Read-only confirmation only.**

## 10. No Seed Announcement Data

Confirmed by §6 — both `announcements` and `announcement_mentions` contain 0 rows. No Draft, no Published announcement, and no mention row exists in the live database as a result of this migration or this verification task.

## 11. PASS/FAIL

**PASS.** Live schema (tables, columns, constraints, indexes) matches the design exactly. No pre-existing data disturbed. No seed data introduced. `test_table` is an unrelated object, correctly left untouched.

## 12. Known Limits

- Exact manual-execution SQL text (verbatim file vs. trimmed block) is not independently evidenced — see §1.
- `test_table` origin/purpose is inferred, not confirmed by the user — see §8.
- `temp_user` database-level CREATE is broader than the REQ-ANN-001 minimum and was not reverted as part of this task.
- Production UI acceptance has not yet occurred — see the Phase-1 validation asset.

## 13. Reviewer

Mareenraj (build) — Management AIOS Announcement & Notification feature owner. Domain routing per CLAUDE.md §18: cross-management/technical build items — no specific Management Team domain owner sign-off required for this read-only DB verification step itself.

## 14. Next Step

Proceed to REQ-ANN-001 commit + push per the closure task. User to perform production UI acceptance check post-deployment (see `validation/announcement-notification-phase1-check-2026-08-12.md`).

## 15. Queryability Result

A clean LLM reading this file alone can answer: whether the migration executed, when, by whom/how, what the live schema looks like, whether it matches design, whether any pre-existing data was disturbed, what `test_table` is, and what the current `temp_user` privilege state is. **YES.**

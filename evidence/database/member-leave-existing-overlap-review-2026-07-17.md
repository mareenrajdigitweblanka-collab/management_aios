---
name: member-leave-existing-overlap-review
type: database-review-evidence
created: 2026-07-17
requirement-id: member-leave-overlap-prevention
status: AMBER — one real duplicate confirmed; cleanup not performed, pending explicit user approval
---

# Database Review Evidence — Existing Leave-Versus-Leave Duplicate Records — 2026-07-17

## Purpose

Read-only inspection of `management_aios.member_leave_records` for existing overlapping/duplicate active leave rows, performed before writing the overlap-prevention fix, per the task's "EXISTING DUPLICATE RECORDS" and "DATABASE VALIDATION" requirements. No row was modified, deleted, or created by this inspection.

## Database Connection Used

`backend/config.DATABASE_URL` (read from the repository's own `.env`, git-ignored, never logged or printed). Connected via SQLAlchemy with an 8-second `connect_timeout` and an 8-second `statement_timeout`. Connection succeeded on the first attempt from this workstation.

## Query

Read-only self-join over `management_aios.member_leave_records`, restricted to active rows (`deleted_at IS NULL`) of the same `member_key`, where the two rows' `[start_date, end_date]` ranges intersect (`a.start_date <= b.end_date AND a.end_date >= b.start_date`), `a.id < b.id` to avoid duplicate pairs:

```sql
SELECT a.member_key, a.id AS id_a, a.leave_type AS type_a,
       a.start_date AS start_a, a.end_date AS end_a,
       a.start_time AS stime_a, a.end_time AS etime_a, a.created_at AS created_a,
       b.id AS id_b, b.leave_type AS type_b,
       b.start_date AS start_b, b.end_date AS end_b,
       b.start_time AS stime_b, b.end_time AS etime_b, b.created_at AS created_b
FROM management_aios.member_leave_records a
JOIN management_aios.member_leave_records b
  ON a.member_key = b.member_key
 AND a.id < b.id
 AND a.deleted_at IS NULL
 AND b.deleted_at IS NULL
 AND a.start_date <= b.end_date
 AND a.end_date >= b.start_date
ORDER BY a.member_key, a.start_date
```

This is a **date-range** candidate query (matches the OVERLAP MATRIX's coarse first filter, the same one `find_overlapping_leave_records` uses); every candidate pair returned was then manually checked against the exact overlap matrix (leave_type dominance / time-interval rules) to confirm it is a true overlap and not merely a date-range false positive (e.g. two First-Half/Second-Half rows on the same date would appear as a candidate pair here but are not a true overlap).

## Result

**Total active leave rows in the table at inspection time: 3.**

**Candidate same-member overlapping-date-range pairs found: 1.**

| member_key | id (older) | type (older) | date | created_at (older, UTC) | id (newer) | type (newer) | date | created_at (newer, UTC) |
|---|---|---|---|---|---|---|---|---|
| mayurika | `6121ffc1-bec2-4220-a14e-c4079824ac0e` | Full-Day | 2026-07-24 | 2026-07-16 08:42:39 | `dacdca5d-3510-4b53-abfc-3d54810cc3c8` | Full-Day | 2026-07-24 | 2026-07-16 11:26:58 |

Matrix check: Full-Day versus Full-Day, same date → **true overlap** (matrix row 1). This is the exact duplicate visible in the reported bug screenshot (two "Full-Day Leave" chips for one member on 2026-07-24).

No other candidate pairs were found. The two other active rows in the table do not share a date range with any other active row for the same member.

## Recommendation (not executed)

The two records are identical in every overlap-relevant field (member, leave type, date). The **newer** record (`dacdca5d-...`, created 2026-07-16 11:26:58, ~2h44m after the first) is the more likely duplicate write — the older record (`6121ffc1-...`, created 08:42:39) is recommended to be **kept** and the newer one **removed**, on the assumption the first save is the intended one and the second is an accidental re-submission (no UI/API safeguard existed to prevent it before this fix). This is a recommendation only; the assistant cannot independently confirm user intent from timestamps alone.

## Cleanup SQL Draft (NOT executed — requires explicit user approval)

```sql
-- Soft-deletes the newer of the two duplicate Full-Day rows for mayurika
-- on 2026-07-24, keeping the older row as the surviving active record.
-- Uses soft-delete (deleted_at), the only removal mechanism this table
-- supports — matches every other delete path in this feature. Restricted
-- by exact id so it cannot affect any other row even if run again later.
UPDATE management_aios.member_leave_records
SET deleted_at = now()
WHERE id = 'dacdca5d-3510-4b53-abfc-3d54810cc3c8'
  AND deleted_at IS NULL;

-- Verification query — expect exactly 1 active Full-Day row for mayurika
-- on 2026-07-24 after running the UPDATE above.
SELECT id, leave_type, start_date, end_date, created_at
FROM management_aios.member_leave_records
WHERE member_key = 'mayurika'
  AND start_date = '2026-07-24'
  AND deleted_at IS NULL;
```

**This SQL was not run.** Per the task's explicit instruction, neither record was deleted or modified — cleanup is deferred until the user (or Mayurika, the domain owner for HR/leave records per CLAUDE.md §18) explicitly approves which record to remove.

## Disposable-Record Live Validation (separate from the above — see paired validation file)

After the fix was implemented, disposable records were created under `member_key='paraparan'` on far-future dates (2099-12-28 through 2099-12-31) to confirm the new overlap rejection and edit-into-overlap rejection behavior end-to-end against this same live database, then soft-deleted immediately after. None of those disposable records remain active. Full transcript in `validation/member-leave-overlap-prevention-check-2026-07-17.md` §Live API Validation.

## Sensitive-Data Confirmation

No credentials, connection strings, or `.env` contents were logged, printed, or included in this file or anywhere else in this session's output. No `purpose`, `external_reference`, or other free-text/personally-identifying field from any row was read or displayed — only `id`, `member_key`, `leave_type`, `start_date`/`end_date`, `start_time`/`end_time`, and `created_at`, all of which are process-level/non-sensitive per CLAUDE.md §6.

## PASS / AMBER / FAIL

**AMBER.** The existing duplicate is fully identified and documented with a safe, non-destructive cleanup draft ready for approval — no data was altered. This file stays AMBER until the user approves and the cleanup SQL above is executed and independently re-verified.

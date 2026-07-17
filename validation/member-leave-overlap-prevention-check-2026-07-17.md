---
name: member-leave-overlap-prevention-check-2026-07-17
type: validation-check
created: 2026-07-17
created-by: Mareenraj (builder)
requirement-id: member-leave-overlap-prevention
status: PASS — code, tests, and live API validation confirmed; one pre-existing duplicate documented and AMBER pending cleanup approval
---

# Validation Check — Prevent Overlapping Member Leave Records

**Check date:** 2026-07-17

## Requirement

The same member could receive two active leave records covering the same date/time (reported bug: two "Full-Day Leave" chips for one member on 2026-07-24). Add backend-authoritative validation so a member cannot hold two overlapping active leave records — the API/database write transaction must reject an overlapping create/edit with HTTP 409 before it is stored. Frontend-only validation is explicitly insufficient.

## Screenshot Bug

Two `Full-Day` leave chips rendered for one member on 2026-07-24 in the calendar UI. Confirmed as a real, currently-stored duplicate (not a rendering artifact) — see the Existing Duplicate Records section below and the paired evidence file.

## Root Cause

`backend/routers/member_leave.py`'s `create_member_leave_record` and `update_member_leave_record` validated leave shape (dates/times), the Short Leave monthly cap, and leave-versus-**task** conflicts (`leave_logic.find_conflicting_active_leave`), but never checked a proposed leave against the member's **other existing active leave records**. Nothing in the write path — API or database — prevented two overlapping (or byte-for-byte identical) active leave rows for the same member. No unique constraint existed either, and a plain unique constraint on `(member_key, date, leave_type)` would not have been sufficient regardless (see Database Constraint Analysis below).

## Active-Leave Definition Used

`deleted_at IS NULL`. Confirmed by reading `backend/models.py`, `database/member_leave_records_schema.sql`, and `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql` — the Pending/Approved/Rejected/Cancelled status workflow was already removed on 2026-07-16 (REQ-LEAVE-COPY-001-SIMPLIFICATION-AMENDMENT). No status field was reintroduced anywhere in this fix.

## Overlap Matrix Implemented

`backend/routers/leave_logic.py` — `_leave_dates()`, `_partial_day_minutes_interval()`, `_leave_pair_overlaps_on_shared_date()`:

- **Full-Day dominance:** a Full-Day date, or a Multi-Day's included Monday–Friday date, conflicts with ANY other active leave on that date, regardless of the other record's leave_type or time — checked explicitly, not derived from a plain 08:30–18:00 interval comparison (an untimed/out-of-window Short Leave request must still be treated as a same-date duplicate against a Full-Day row).
- **Partial-day (Short Leave / Half-Day First / Half-Day Second):** half-open time-interval overlap — `new_start < existing_end AND new_end > existing_start`. Half-Day windows use the fixed configured clock period (08:30–13:00 / 13:30–18:00); Short Leave uses its own requested start/end. Adjacent periods (e.g. 09:00–10:00 touching 10:00–11:00) are correctly **not** an overlap. First-Half and Second-Half never overlap each other (their configured windows do not touch).
- **Multi-Day:** expands to its included Monday–Friday dates (`expand_weekdays`, already existed and reused unchanged) — Saturday/Sunday dates are never occupied, so a Multi-Day request that spans only a weekend occupies zero dates and can never conflict with anything.
- **Self-exclusion (edits):** `exclude_leave_id` is filtered both at the SQL layer and redundantly in Python (for independent DB-free testability).
- **Soft-deleted / different-member rows:** excluded by the existing query filters (`deleted_at IS NULL`, `member_key` match) — unchanged convention from every other query in this router.

This matches every row of the approved OVERLAP MATRIX and every "Allow" case in the task specification exactly (verified by the test matrix below).

## Central Helper

`backend/routers/leave_logic.py`:

- `find_overlapping_leave_records(db, member_key, leave_type, start_date, end_date, start_time, end_time, exclude_leave_id=None, lock=False)` — the one place the overlap matrix is implemented. Queries active candidate rows for the member whose date range could intersect, then applies the matrix per candidate. Does not mutate any row. Both `create_member_leave_record` (POST) and `update_member_leave_record` (PUT) in `backend/routers/member_leave.py` call this exclusively — no duplicated overlap logic exists in either route.
- `assert_no_leave_overlap(...)` — calls `find_overlapping_leave_records(..., lock=True)` and raises `LeaveOverlapError(conflicts)` if any are found.
- `leave_overlap_response_body(conflicts)` — builds the exact 409 body (`error: "leave_overlap"`, the specified message, `conflicts: [...]` with `leave_id`/`leave_type`/`start_date`/`end_date`/`start_time`/`end_time` only — no `purpose`).
- `acquire_member_leave_lock(db, member_key)` — see Transaction/Locking Strategy below.

## Transaction / Locking Strategy

Both POST and PUT, inside the single request's existing transaction (no separate transaction is opened or committed early):

1. Validate payload shape (`validate_leave_dates_and_times` — unchanged, pre-existing).
2. Acquire `acquire_member_leave_lock(db, member_key)` — a **transaction-scoped PostgreSQL advisory lock** (`pg_advisory_xact_lock(hashtext(member_key))`), released automatically at commit/rollback.
3. `assert_no_leave_overlap(...)` (which itself also takes `SELECT ... FOR UPDATE` on the candidate rows, `lock=True`) → 409 + `db.rollback()` if a conflict is found, before anything is written.
4. Short Leave monthly cap check (unchanged existing function/locking).
5. Insert/apply edit, `db.commit()`.

**Why an advisory lock in addition to `SELECT ... FOR UPDATE`:** this codebase's pre-existing locking convention (`assert_active_short_leave_monthly_cap_not_exceeded`) uses only a row lock. A row lock can only lock rows that already exist — it cannot close the race between two concurrent requests creating a member's very first leave record (or two brand-new records that would only overlap each other), since neither request's overlap `SELECT` finds any existing row to lock. The task explicitly rules out "a normal SELECT followed by INSERT without locking" as insufficient. The advisory lock is member-scoped, not row-scoped: a second concurrent transaction for the same `member_key` blocks at step 2 until the first transaction commits or rolls back, so its own overlap check in step 3 always sees the first transaction's already-committed (or already-rolled-back) state. This closes the gap the row lock alone leaves.

**Not used:** a plain SELECT-then-INSERT with no locking (explicitly disallowed by the task), and a plain UNIQUE constraint on `(member_key, date, leave_type)` (see next section for why it is insufficient even as a supplement).

## Database Constraint / Exclusion Analysis

**No PostgreSQL exclusion constraint (`EXCLUDE USING gist`) was added. No migration was made. Migration required: NONE.**

Reasoning: a `range` + `EXCLUDE` constraint would need to encode, at the SQL level: Full-Day/Multi-Day date-level dominance over partial-day time intervals, Multi-Day's Monday–Friday-only expansion (excluding weekends from the excluded range), and per-leave-type-conditional time ranges (Short Leave's arbitrary times vs. Half-Day's two fixed windows vs. Full-Day/Multi-Day's whole-day dominance) — all in one constraint expression, against a table whose `start_time`/`end_time` are `NULL` for three of the five leave types. This is expressible in principle (e.g. a computed `tstzrange` column per leave_type) but is a materially riskier, harder-to-review change than the existing table shape supports safely today, and the existing `idx_member_leave_records_active_conflict` index (member_key, start_date, end_date, `WHERE deleted_at IS NULL`) already gives the application-level query everything it needs with no new index. Application-level transaction validation (the approach implemented here) is explicitly acceptable per the task instructions and is the lower-risk choice for this schema. No `database/migrations/` file was added or is needed for this fix.

## API 409 Behavior

```json
{
  "error": "leave_overlap",
  "message": "This member already has leave that overlaps the selected date or time.",
  "conflicts": [
    {
      "leave_id": "...",
      "leave_type": "...",
      "start_date": "...",
      "end_date": "...",
      "start_time": null,
      "end_time": null
    }
  ]
}
```

No `purpose` or other free-text field is included, matching the existing `leave_conflict` (task-vs-leave) contract's convention exactly. Confirmed both by unit test (`LeaveOverlapResponseBodyTests`) and live API call (see Live API Validation below).

## Frontend Behavior

`web-view/index.html`:
- `leaveApiRequest` now detects `errBody.error === 'leave_overlap'` and throws a tagged `Error` (`isLeaveOverlap`, `conflicts`) carrying the backend's exact message — mirrors the existing `leave_conflict` handling in the unrelated `apiRequest` (task) helper.
- The leave-create click handler shows this message inline in a new `.msc-leave-form-status` element next to the Create Leave form (reusing the existing `.msc-api-status`/`--error` visual language, `role="alert"`), instead of a blocking `window.alert`.
- On a `leave_overlap` rejection: the form is **not** reset (`resetLeaveForm()` is only called on success), no chip/list entry is created (`leaveItems.push` only runs on success), and focus moves to the start-date field.
- No second client-side business-rule implementation was added — the frontend does not re-derive the overlap matrix; it only surfaces the backend's verdict.

## Tests

`backend/tests/test_member_leave.py` — all additions are DB-free (pure-function / fake-session level), matching this repo's established testing convention for `backend/routers/leave_logic.py` (no test in this repository opens a live database connection):

- `LeaveOverlapMatrixTests` — required cases 1–14 (Full-Day/Multi-Day dominance in both directions, Half-Day First/Second self- and cross-pairing, Short Leave overlapping/adjacent/boundary cases, Multi-Day weekend-only non-conflict), run end-to-end through `find_overlapping_leave_records` against a minimal fake SQLAlchemy session.
- `LeaveOverlapSelfExcludeAndFilterTests` — required cases 15–18 (self-exclude on edit, edit-into-conflict, soft-deleted/different-member documented as query-layer exclusions, matching the same documented limitation as `find_conflicting_active_leave`'s pre-existing test coverage).
- `AssertNoLeaveOverlapTests` — `LeaveOverlapError` raised with the correct `.conflicts` on overlap, not raised otherwise.
- `LeaveOverlapResponseBodyTests` — required case 20 (no `purpose`/`status` key; exact message/error value).
- `AcquireMemberLeaveLockTests` — required case 21's DB-free portion: confirms the exact `pg_advisory_xact_lock(hashtext(:member_key))` statement and parameter are issued. True concurrent-request testing requires a live PostgreSQL connection and is documented as a known limitation (see below), consistent with this repo's existing convention.
- Required case 19 (monthly Short Leave cap still enforced): unchanged — `assert_active_short_leave_monthly_cap_not_exceeded` and its existing tests (`ShortLeaveDurationValidationTests`, `EffectiveLeaveMinutesSnapshotTests`) were not modified; the cap check still runs, unconditionally, after the new overlap check, in both POST and PUT.
- Required cases 22/23 (existing task-conflict and reporting tests remain passing): confirmed by running the full suite below with zero modifications to `OverlapDeduplicationTests`, `ConflictResponseBodyTests`, or any `test_schedule_*.py` file.

**Result: 86/86 tests pass** in `backend.tests.test_member_leave` (`python -m unittest backend.tests.test_member_leave -v`). **156/156 tests pass** across the full backend suite (`python -m unittest discover -s backend/tests -p "test_*.py"`) — zero regressions in schedule-classification or duration-reporting tests.

## Existing Duplicate Records

One real duplicate found and documented, **not deleted**: two `Full-Day` rows for `mayurika` on 2026-07-24 (`6121ffc1-...` created 08:42:39 UTC, `dacdca5d-...` created 11:26:58 UTC, 2026-07-16) — this is the exact pair visible in the reported bug screenshot. Full query, matrix confirmation, and a non-destructive cleanup SQL draft (soft-delete the newer row) are in `evidence/database/member-leave-existing-overlap-review-2026-07-17.md`. **Cleanup was not executed** — held for explicit user approval per the task's instructions.

## Database Validation

Connected successfully to the live Neon database (`backend/config.DATABASE_URL`). `management_aios.member_leave_records` confirmed present, 3 active rows at inspection time, 1 duplicate pair found (above). **Migration required: NONE** (see Database Constraint / Exclusion Analysis).

## Live API Validation

Performed against the local backend (`uvicorn backend.main:app --port 8000`) connected to the same live Neon database, using disposable records under `member_key='paraparan'` on far-future dates (2099-12-28 .. 2099-12-31), all soft-deleted immediately after:

1. `POST /api/member-leave/paraparan` (Full-Day, 2099-12-31) → **201**, `effective_leave_minutes: 540`.
2. `POST /api/member-leave/paraparan` (Full-Day, 2099-12-31, again) → **409** `leave_overlap`, conflict references the first record's id.
3. `GET /api/member-leave/paraparan?start_date=2099-12-31&end_date=2099-12-31` → exactly **1** active row.
4. `POST /api/member-leave/paraparan` (Short Leave, 2099-12-30, 09:00–10:00) → 201.
5. `PUT /api/member-leave/paraparan/{short_leave_id}` (start_date/end_date → 2099-12-31, into the Full-Day) → **409** `leave_overlap`.
6. `GET /api/member-leave/paraparan?start_date=2099-12-30&end_date=2099-12-31` → confirmed the Short Leave record's date is **unchanged** (2099-12-30) — the rejected edit was never applied.
7. `POST /api/member-leave/paraparan` (Half-Day First, 2099-12-29) → 201; `POST` (Half-Day Second, same date 2099-12-29) → **201** (allowed, matrix "Allow" case 1).
8. Existing task-vs-leave conflict unaffected: `POST /api/member-leave/paraparan` (Full-Day, 2099-12-28) → 201; `POST /api/member-schedules/paraparan` (task, same date) → **409** `leave_conflict` (unchanged pre-existing behavior).
9. Existing reporting unaffected: `GET /api/member-schedules/paraparan/reports/daily?date=2099-12-28` → 200, `active_leave_minutes: 540` (reflects the disposable Full-Day leave correctly).
10. All 5 disposable leave records deleted (`DELETE /api/member-leave/paraparan/{id}` → 200 each); confirmed empty on re-fetch.

All disposable records were removed after verification; no leftover test data remains from this session's live validation.

## Known Limitations

- True concurrent-request (two simultaneous HTTP requests racing) testing was not performed — this environment does not support firing two genuinely simultaneous requests against the live database in a way that would prove the advisory lock's serialization behavior beyond the unit-level confirmation that the correct lock statement is issued (`AcquireMemberLeaveLockTests`). This matches the repo's existing documented limitation for all DB-dependent `leave_logic.py` functions.
- The pre-existing duplicate (mayurika, 2026-07-24) remains in the database — cleanup SQL is drafted and ready but not executed, pending explicit user approval.
- `assert_active_short_leave_monthly_cap_not_exceeded`'s own row lock has the same "zero pre-existing rows" race gap the advisory lock now closes for overlap — the advisory lock incidentally also serializes the cap check (since it now runs inside the same member-scoped lock), but this was not the primary target of this fix and is not independently re-tested beyond the existing cap tests continuing to pass unmodified.

## PASS / AMBER / FAIL

**PASS** for the overlap-prevention fix itself — code complete, 156/156 tests pass, live API validation against the real database confirms every required behavior (create-blocks-duplicate, edit-blocks-into-overlap, allowed cases remain allowed, existing task-conflict/reporting behavior unaffected). **AMBER** carried specifically for the pre-existing duplicate record cleanup, which is documented and drafted but intentionally not executed without user approval (see paired evidence file).

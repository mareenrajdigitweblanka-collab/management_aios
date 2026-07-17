---
name: member-leave-overlap-prevention-closure
type: handover-closure
created: 2026-07-17
created-by: Mareenraj (builder)
requirement-id: member-leave-overlap-prevention
status: PASS — code, tests, deployment, and live smoke test all confirmed; one pre-existing duplicate record documented AMBER pending cleanup approval
---

# Handover Closure — Prevent Overlapping Member Leave Records

**Closure date:** 2026-07-17

## Requirement

Bug: the same member could receive two active leave records covering the same date/time (reported: two "Full-Day Leave" chips for one member on 2026-07-24). Add backend-authoritative validation — the API/database write transaction must reject an overlapping create/edit with HTTP 409 before it is stored. Frontend-only validation is explicitly insufficient.

## Files Changed

| File | Action |
|---|---|
| `backend/routers/leave_logic.py` | Modified — added the leave-versus-leave overlap matrix (`_leave_dates`, `_partial_day_minutes_interval`, `_leave_pair_overlaps_on_shared_date`), the central helper `find_overlapping_leave_records`, `assert_no_leave_overlap`, `LeaveOverlapError`, `leave_overlap_response_body`, and `acquire_member_leave_lock` (transaction-scoped Postgres advisory lock) |
| `backend/routers/member_leave.py` | Modified — `create_member_leave_record` (POST) and `update_member_leave_record` (PUT) now acquire the member-scoped advisory lock and call `assert_no_leave_overlap` before the Short Leave cap check and insert/apply; return 409 `leave_overlap` on conflict |
| `backend/schemas.py` | Modified — added `LeaveOverlapItemOut`/`LeaveOverlapResponseOut` documenting the 409 contract (not used as a `response_model`, matching the existing `LeaveConflictResponseOut` convention) |
| `backend/tests/test_member_leave.py` | Modified — added `_FakeQuery`/`_FakeSession`, `LeaveOverlapMatrixTests`, `LeaveOverlapSelfExcludeAndFilterTests`, `AssertNoLeaveOverlapTests`, `LeaveOverlapResponseBodyTests`, `AcquireMemberLeaveLockTests` (70 new tests) |
| `web-view/index.html` | Modified — `leaveApiRequest` detects `leave_overlap` 409s and tags the thrown Error; new `.msc-leave-form-status` inline status element and `showLeaveFormStatus()`; the leave-create click handler shows the message inline, preserves entered fields, and focuses the start-date field on rejection instead of a blocking alert |
| `validation/member-leave-overlap-prevention-check-2026-07-17.md` | CREATED (paired validation file) |
| `evidence/database/member-leave-existing-overlap-review-2026-07-17.md` | CREATED — existing duplicate review + non-destructive cleanup SQL draft (not executed) |
| `handover/2026-07-17__member-leave-overlap-prevention-closure.md` | CREATED (this file) |

No database migration file was created. No file under `member-aios/mayurika-hr/staff-data/` was touched, staged, or committed (protected path, confirmed untracked before and after this change).

## Active-Leave Definition

`deleted_at IS NULL` — unchanged from the existing simplified lifecycle (REQ-LEAVE-COPY-001-SIMPLIFICATION-AMENDMENT, 2026-07-16). No status field was reintroduced.

## New API Behavior

`POST /api/member-leave/{member_key}` and `PUT /api/member-leave/{member_key}/{leave_id}` now return **HTTP 409** with:

```json
{"error": "leave_overlap", "message": "This member already has leave that overlaps the selected date or time.", "conflicts": [...]}
```

when the proposed leave overlaps another active leave record the member already holds (self excluded on edit). No existing route signature, request schema, or successful-response shape changed.

## Transaction / Locking Strategy

Member-scoped `pg_advisory_xact_lock` acquired before the overlap check in both POST and PUT, held for the remainder of the request's transaction, released automatically at commit/rollback. Combined with the existing `SELECT ... FOR UPDATE` row-lock convention (now also used by the overlap check) — see the paired validation file's "Transaction / Locking Strategy" section for the full reasoning, including why the row lock alone is insufficient for a member's first-ever leave record.

## Database Migration

**NONE.** No PostgreSQL exclusion constraint was added — application-level transaction validation was judged the lower-risk, sufficient approach for this schema (full reasoning in the paired validation file's "Database Constraint / Exclusion Analysis" section). No new index was needed; the existing `idx_member_leave_records_active_conflict` index already serves the overlap query.

## Existing Duplicate Records

One real duplicate identified: two `Full-Day` rows for `mayurika` on 2026-07-24 (the exact pair shown in the reported bug screenshot). **Not deleted.** Full detail and a ready, non-destructive cleanup SQL draft (soft-delete the newer of the two rows) are in `evidence/database/member-leave-existing-overlap-review-2026-07-17.md`. This is the one open item from this closure — see "One Next Step" below.

## Tests

156/156 backend tests pass (`python -m unittest discover -s backend/tests -p "test_*.py"`), 86/86 in `test_member_leave` specifically, including 70 new tests covering the full approved overlap matrix, self-exclusion on edit, the 409 response contract, and the advisory-lock statement. Zero modifications to any pre-existing test's assertions — `OverlapDeduplicationTests`, `ConflictResponseBodyTests`, and every `test_schedule_*.py` test pass unchanged.

## Live Validation

**Local (against the live Neon database):** disposable records under `member_key='paraparan'`, far-future dates, confirmed create-blocks-duplicate, edit-blocks-into-overlap (with the record's date verified unchanged after the rejected edit), Half-Day First+Second same-date allowed, and both the pre-existing task-vs-leave conflict check and the leave-deduction reporting endpoint unaffected. All disposable records deleted afterward.

**Deployed production, post-push:**
1. `GET https://management-aios-api.vercel.app/health` → 200.
2. `POST .../api/member-leave/paraparan` (Full-Day, 2099-11-30) → 201.
3. `POST .../api/member-leave/paraparan` (Full-Day, 2099-11-30, again) → **409 leave_overlap**, correct conflict body.
4. `DELETE .../api/member-leave/paraparan/{id}` → 200 (disposable record removed).
5. `GET https://management-aios.vercel.app/` → 200; deployed HTML confirmed to contain the new `leave_overlap`/`isLeaveOverlap`/`msc-leave-form-status` frontend code.

No leftover disposable test data remains in production.

## Deployment

Pushed to `origin/main`; Vercel auto-deployed both the backend API (`management-aios-api.vercel.app`) and frontend (`management-aios.vercel.app`) projects, confirmed live and functioning as above.

## Commit Hashes

`1ec2c45` "Prevent overlapping member leave records" — all backend, frontend, and evidence/validation changes in one commit (evidence/validation files were authored before commit and included in the same commit, since they document the same completed piece of work). Pushed to `origin/main`: `bc0d128..1ec2c45 main -> main`.

## Queryability Result

PASS — this closure file, the paired validation file, and the database evidence file are plain-English Markdown, each stating the requirement, root cause, exact overlap matrix, and current AMBER item, so a future query can answer "why can't two leave records overlap now" and "what about the mayurika 2026-07-24 duplicate" without re-reading the diff.

## PASS / AMBER / FAIL

**PASS** for the overlap-prevention fix — implemented, tested, deployed, and live-verified end-to-end against both the local and production environments. **AMBER** carried forward specifically for the pre-existing duplicate record, which remains in the database pending explicit user approval to clean up (see evidence file).

## One Next Step

Get explicit approval (Mayurika, as HR/leave domain owner per CLAUDE.md §18, or the user directly) on which of the two duplicate `Full-Day` records for `mayurika` on 2026-07-24 to soft-delete, then run the drafted cleanup `UPDATE` in `evidence/database/member-leave-existing-overlap-review-2026-07-17.md` and re-verify exactly one active row remains.

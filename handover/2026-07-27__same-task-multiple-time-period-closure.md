---
name: same-task-multiple-time-period-handover
type: handover
scope: management_aios calendar — same-Task multiple-time-period conflict rule (exact duplicate / overlap / both-untimed / timed-vs-untimed)
created: 2026-07-27
status: AMBER (release pass, 2026-07-27) — implemented, tested (357/357), committed (de015fc), pushed to origin/main, and confirmed live on both Vercel deployments via read-only checks; AMBER only because live interactive write validation could not be performed (no browser tool, no owner-approved safe test data this session) — see §8
owner: builder, per this task's correction and release instructions
reviewer: pending owner-run live click-through (§8.4)
---

# Same-Task Multiple-Time-Period Rule — Handover — 2026-07-27

## 1. What this task was

A correction pass. A prior implementation ("FINAL CONFIRMED TIMED-VERSUS-UNTIMED RULE")
only caught a timed Task conflicting with an untimed Task of the same member/normalized
title/date. This pass completes the full **FINAL AUTHORITATIVE RULE**: exact-duplicate and
timed-overlap detection were added, both-untimed was corrected from "allowed" to "blocked",
and all three write paths (Single Task create, Bulk Tasks, Task edit) were refactored onto
one shared backend classifier. Full technical detail:
`validation/same-task-multiple-time-period-check-2026-07-27.md`.

## 2. Files changed

| File | Change |
|---|---|
| `backend/routers/member_schedules.py` | Replaced the narrow timed-vs-untimed-only helpers with one shared classifier (`classify_same_task_conflict`, `_classify_time_pair`, `SameTaskOccurrence`, `SAME_TASK_CONFLICT_*` constants, `SAME_TASK_CONFLICT_INFO` code/message table). Rewired `create_member_schedule_event`, `create_member_schedule_events_bulk` (`_bulk_within_batch_time_conflicts`, `_bulk_existing_task_time_conflict_errors`), and `update_member_schedule_event` to call it. |
| `web-view/js/ui/error-mapper.js` | Added `exact_task_duplicate` and `same_task_time_overlap` KNOWN_ERRORS entries (alongside the pre-existing `same_task_time_required`). |
| `web-view/js/calendar/instance.js` | `apiRequest`'s raw-body error recognition list now includes all three same-task codes. |
| `backend/tests/test_same_task_multiple_time_period_rule.py` (new) | 48 tests — replaces the deleted `backend/tests/test_same_task_timed_untimed_rule.py` (23 tests), whose narrower coverage is fully subsumed. |
| `backend/tests/test_bulk_task_creation.py` | 5 tests in `DuplicateWarningTests` + 1 in `MemberIsolationTests` updated: these exercised the exact-duplicate/both-untimed domain, which is now correctly hard-blocked (422) instead of soft-warned (409) — an intentional behavior change, not a regression. |

No file under `member-aios/mayurika-hr/staff-data/` (protected) was touched. No file under
`database/` was touched.

## 3. Authoritative helper path

**`backend/routers/member_schedules.py:classify_same_task_conflict`** is the one function
every write path calls (directly or via `_bulk_within_batch_time_conflicts`/
`_bulk_existing_task_time_conflict_errors`, which are themselves thin adapters over it — see
`_active_same_date_occurrences` for the database-row adapter). The underlying pairwise logic
lives in `_classify_time_pair`, a pure function with no DB/model dependency. Do not add a
second conflict-detection formula anywhere in this file — extend `_classify_time_pair`/
`classify_same_task_conflict` instead.

## 4. How to extend tests

`backend/tests/test_same_task_multiple_time_period_rule.py` is organized in four blocks:
`ClassifySameTaskConflictTests` (pure, no DB — add new time-pair scenarios here first, it's
the fastest and most direct place to prove a classification decision), `SingleCreateTests`,
`BulkTests`, `EditTests` (all three use the same `SameTaskEndpointTestCase` fixture — a
fresh ephemeral in-memory SQLite database per test, `make_task`/`make_leave` helpers, and
`assert_conflict` for asserting a 409 + code), and `RegressionTests` (soft-delete, member
isolation, Unicode, and cross-feature checks). Add a new scenario to whichever block matches
its shape; there is no need to touch the classifier's wiring itself unless the underlying
rule changes.

## 5. Known limitations

- No live Neon/Postgres re-run — same pre-existing, documented workstation limitation as
  every other 2026-07 validation note in this repo (direct Neon access hangs at the SSL
  handshake layer). SQLite endpoint tests prove the query/filter/classification/no-write
  logic; not native `TIMESTAMPTZ` wire-format behavior against the real database — this
  feature adds no new column/timestamp behavior, so the risk surface here is small.
- No live browser click-through of the three new toast messages — no browser automation
  tool is available in this session. The frontend change was verified by (a) `node --check`
  syntax validation, (b) a direct Node-side call of `mapApiError()` for all three codes
  confirming exact title/message match, and (c) code-reading confirmation that `apiRequest`
  now tags all three raw error codes and that neither the single-create nor edit catch
  handlers special-case them away from the default toast path (they fall to the same
  generic `else { showToast(...) }` branch `leave_conflict` is the only exception to).
- The soft duplicate-warning system (`_find_batch_duplicate_warnings`/
  `_find_existing_task_duplicate_warnings`) is left in place, unmodified, but is now
  structurally unreachable for the same-title/date/time domain (see validation doc §10) —
  it was not deleted since removing established code without a reproducible defect
  requiring it was judged out of scope for a correction pass; a future cleanup pass could
  consider removing it if a maintainer confirms no other domain depends on it.

## 6. Deployment status (superseded — see §8)

~~Not committed, not pushed, not deployed.~~ Committed, pushed, and confirmed live on both
Vercel deployments as of the 2026-07-27 release pass — see §8. No schema/migration change
was made at any point (Database changes: NONE).

## 7. One next action (superseded — see §8.5)

~~Repository owner reviews the diff... and, if approved, requests a commit/push
explicitly.~~ — done, at the user's explicit request. See §8.5 for the current next action.

## 8. Release record (2026-07-27, same day, release pass)

### 8.1 Implementation commit and push

- Commit: `de015fc` — "Enforce same-task time conflict rules".
- Files: the 5 approved implementation files (`backend/routers/member_schedules.py`,
  `backend/tests/test_bulk_task_creation.py`, `backend/tests/test_same_task_multiple_time_period_rule.py`,
  `web-view/js/calendar/instance.js`, `web-view/js/ui/error-mapper.js`) plus the two
  evidence files (this handover and the validation doc's implementation-pass content).
- The obsolete `backend/tests/test_same_task_timed_untimed_rule.py` was never part of git
  history (confirmed via `git log --all`) — there was no tracked deletion to stage; its
  absence from disk already matched the intended state.
- Push: `d6c01b4..de015fc  main -> main`. Local HEAD and `origin/main` confirmed matching.

### 8.2 Deployment ownership and verification

Both Vercel projects (`management-aios` frontend, `management-aios-api` backend) deploy
automatically from GitHub on every push to `main` (per `backend/README.md`) — no manual
Vercel CLI action was taken or needed. Read-only verification (no writes):

- Backend: `/health` → 200 OK; Task list, weekly summary, and weekly XLSX export endpoints
  all readable and correct against real existing data; full route inventory (`/openapi.json`)
  unchanged — no route disappeared.
- Frontend: live-fetched `js/ui/error-mapper.js` and `js/calendar/instance.js` both confirmed
  to contain the exact new code — `exact_task_duplicate`/`same_task_time_overlap` do not
  exist in any commit before `de015fc`, so their presence in the live-fetched asset is direct
  proof the frontend is serving this commit.
- No production Task was created, updated, or deleted during any of these checks.

Full detail: `validation/same-task-multiple-time-period-check-2026-07-27.md` §16.

### 8.3 Deployed-commit note

Neither service exposes a version/commit metadata endpoint. The frontend's deployed commit
is directly confirmed (§8.2). The backend's is inferred (same GitHub push, same auto-deploy
event) rather than independently confirmed byte-for-byte, since the new rule only manifests
on a write request and no such request was made.

### 8.4 Live interactive write validation — AMBER

Not performed. No browser automation tool is available in this session, and no user-approved
safe testing member/date or explicit approval for a production write attempt was given.
Recorded honestly as AMBER, per this task's own explicit instruction to prefer AMBER over
fabricated evidence.

### 8.5 Evidence-only closure commit

A second commit (`git commit -m "Close same-task time conflict validation"`) follows this
one, containing only this handover file and the validation file's release-pass updates.

## 9. One next action (final)

A maintainer with browser access and either a pre-approved disposable testing member/date,
or explicit sign-off to reuse the existing `paraparan` disposable-testing convention (see
the 2026-07-24 Task Outcome closure precedent), should click through the six same-task
conflict scenarios against the live production app and confirm the toasts, no-write outcome,
form-value preservation, and Bulk row-error readability — then this closes from AMBER to
PASS.

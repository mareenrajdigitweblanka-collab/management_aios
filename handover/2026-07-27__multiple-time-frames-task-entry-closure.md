---
name: multiple-time-frames-task-entry-handover
type: handover
scope: management_aios backend + web-view — multiple non-overlapping time frames per Task (Single Task, Bulk Tasks, Task Edit)
created: 2026-07-27
updated: 2026-07-27 — FRAME-LEVEL ERROR CONTEXT follow-up correction (§19); APPROVED OCCURRENCE LIMIT finalization (§20); then committed (c141064) and pushed to origin/main, deployment verified via read-only checks (§21)
status: AMBER — implemented, unit-tested (533 backend / 87 frontend), committed, pushed, deployment verified via read-only HTTP checks; occurrence limit APPROVED and enforced; AMBER only because live-browser manual QA (mobile/zoom/keyboard/actual Create-Bulk-Edit flows) was not performed — no browser-automation tool available in this session, honestly disclosed rather than fabricated (§21.3)
owner: Mareenraj (build); relevant Management Team member per CLAUDE.md §18 for review/sign-off
reviewer: pending
---

# Multiple Time Frames Per Task — Handover — 2026-07-27

## 1. What this task was

Allow a user to enter several separate, non-overlapping time frames for the same Task on the same date from the existing Create popup (e.g. "Staff Attendance" 09:00–10:00, 11:00–12:00, 14:00–15:00) — each valid time frame creates one independent Task database record, sharing the same member/date/title/priority/notes/source-scope but keeping its own event ID, start/end time, category, timestamps, and outcome. Applied to Single Task creation, Bulk Tasks, and Task Edit ("add another time"). No database schema change.

## 2. Written requirement

Full task brief (28 phases, 75 required test cases, PASS conditions AH–AQ) supplied directly by the user in this session — not a separate intelligence-inbox document. See this repository's session transcript / the user's own message for the verbatim brief; this handover and `validation/multiple-time-frames-task-entry-check-2026-07-27.md` are its closure record.

## 3. Screenshot-derived current limitation

Not applicable — this task started from a written brief, not a screenshot. The pre-existing limitation it addresses: the Create Task popup had exactly one Start time/End time pair; entering a second time period for the same title/date required either a second full round-trip through the popup (with the same-title hard-block rule already correctly allowing it as long as it was submitted separately) or Bulk Tasks with a duplicated title/date/priority/notes across rows.

## 4. Separate-record design

Confirmed and implemented exactly as instructed: no multi-time-range column, no JSON blob column, no new table. Each accepted time frame is its own `MemberScheduleEvent` row. Verified via `backend/models.py` (unchanged) and the atomic multi-insert code paths in `backend/routers/member_schedules.py`.

## 5. Request contract (additive)

- `MemberScheduleEventCreate.time_frames: Optional[List[{start_time, end_time}]]` — authoritative when present; old `start`/`end` fields still work unchanged when absent.
- `MemberScheduleEventUpdate.additional_time_frames: Optional[List[{start_time, end_time}]]` — the edited occurrence stays "Time frame 1" via the pre-existing fields; this lists brand-new sibling occurrences to insert atomically.
- `BulkTaskRowIn.time_frames: Optional[List[{start_time, end_time}]]` — same authoritative-when-present contract, per row.

## 6. Behavior summary

| Surface | Result |
|---|---|
| Single Task, 3 valid frames | 1 request → 3 rows, one atomic transaction, one combined advisory confirmation if needed |
| Single Task, internal overlap/duplicate | 422, zero rows created, exact frame numbers named in the error |
| Bulk row, multiple frames | Row expands server-side into N occurrences; existing Bulk validation/duplicate/advisory pipeline reused with zero changes to its own logic |
| Task Edit, add frames | Selected occurrence updated + new occurrences inserted, one transaction; any hard conflict rolls back both; existing sibling occurrences (any other same-title/date row not loaded into this edit) are never touched |
| New occurrences' outcome | Always `None` (Pending) — never copied from the edited occurrence |
| Backward compatibility | A request that never sends `time_frames`/`additional_time_frames` behaves byte-for-byte as before this task |

## 7. Internal-overlap validation

`classify_time_frame_set()` (backend, `member_schedules.py`) / `classifyTimeFrameSet()` (frontend, `core.js`) — one shared half-open-interval formula (`candidate_start < existing_end AND existing_start < candidate_end`) reused from the pre-existing `_classify_time_pair`. Exact duplicates and overlaps blocked; exactly-adjacent frames allowed; a single blank frame allowed (untimed Task); 2+ frames with any incomplete/untimed frame blocked ("Complete the task times").

## 8. Atomicity

Every multi-record write (Single multi-frame create, Bulk frame expansion, Edit-with-added-frames) uses the same pattern already proven by the pre-existing Bulk endpoint: validate everything first (zero writes on any failure), then one `db.add()` loop → `flush()` → `commit()`, with `except: db.rollback(); raise 500` on any failure. Confirmed by tests exercising internal overlap, existing-task conflict, Leave conflict, and stale-fingerprint rejection all resulting in zero rows created/updated.

## 9. Confirmation integration

Reuses `detect_schedule_advisories`/`build_schedule_confirmation`/`schedule_confirmation_fingerprint` completely unchanged in their core logic — extended only with an additive optional `frame_index` parameter so a warning can name "Time frame N" (Single/Edit) or "Task N, time frame M" (Bulk) instead of just a row. One combined popup per submission, never one per frame; stale confirmations are rejected the same way they always were (fingerprint recomputed from scratch every request).

## 10. Outcome ownership

Each created occurrence is fully independent for outcome purposes — Pending/Completed/Uncompleted/No response all apply per-row, per the pre-existing `derive_task_outcome`/`TaskOutcomeUpdate` machinery, untouched by this task.

## 11. Summary behavior

`_aggregate_schedule_period` (Schedule Summary) and `build_weekly_schedule_rows` (XLSX export) both already iterate one row per active database record — **zero code changes needed**; multiple time frames are automatically reflected as multiple counted/exported occurrences.

## 12. XLSX behavior

Unchanged workbook structure; one row per occurrence, verified by reading (not by a new test, since no logic changed).

## 13. Database impact

None. `git diff --stat -- database/ database/migrations/` is empty.

## 14. Tests (superseded by §20.5 — final counts below)

Backend: **533 passed** (435 original + 62 in `test_multiple_time_frames.py` + 21 in `test_frame_level_error_context.py` + 15 in `test_occurrence_limit.py`). Frontend: **87 passed** across 6 `node:test` files (25 in `multi-time-frame.test.mjs` + 13 in `frame-level-error-context.test.mjs` + 3 in `occurrence-limit.test.mjs` + 46 pre-existing). `node --check` clean on every changed `.js` file. Full breakdown in `validation/multiple-time-frames-task-entry-check-2026-07-27.md` §8/§14.6.

## 15. Known limitations

See `validation/multiple-time-frames-task-entry-check-2026-07-27.md` §9 — summarized: (1) representative rather than all-75-numbered test coverage; (2) ~~Bulk same-title/Leave hard-block messages are row-level, not always frame-level~~ **RESOLVED 2026-07-27, see §19**; (3) no live-browser manual pass performed in this session — still open, see §20.7 checklist; (4) ~~the 30-occurrence caps reuse the existing `MAX_BULK_TASK_ROWS` constant... not a separately-approved number~~ **APPROVED 2026-07-27, see §20** — now its own independent, owner-approved constant enforced by one shared validator; (5) duplicate-*warning* (soft, confirmable) messages remain row-level, not frame-level — out of scope, targeted hard-block messages only per the original reported gap.

## 16. Reviewer

Per CLAUDE.md §18, this is a shared Task-creation UX/API change with no single domain owner — route to whichever Management Team member next exercises the updated Create/Edit forms live. This assistant has not promoted this work to `is_official_truth` or approved operational status (CLAUDE.md §13).

## 17. PASS / AMBER / FAIL (superseded — see §20's frontmatter status)

~~AMBER — see `validation/multiple-time-frames-task-entry-check-2026-07-27.md` §11 for the full rationale (backend/automated-test PASS including the 2026-07-27 correction; manual browser checklist not yet run; 30-occurrence limit `[VERIFY]` pending owner approval).~~

**Current: AMBER, on exactly one remaining item** — the live-browser manual pass (§20.7). The occurrence limit is APPROVED and enforced; backend/frontend automated coverage is PASS.

## 18. One next step (superseded — see §19.7)

~~Run a live-browser pass of the Create Task popup (Single, Bulk, Edit) at mobile width and 200% zoom, confirm the exact toast/dialog copy, then update this handover's status to PASS.~~

## 19. Frame-level error context correction (2026-07-27 follow-up)

A follow-up review reported the exact gap anticipated in §15 item 2 above: Bulk same-title/Leave hard-block messages named the row but not the specific time frame within a multi-frame Bulk row. Root-cause review additionally found Single Task and Task Edit's own hard-conflict responses never carried frame identity at all, and the frontend discarded the backend's message text for these codes in favor of generic mapped copy.

### 19.1 Fix

Backend: the three Bulk conflict-check functions now consume the full `(row_number, frame_number, frame_count, frame_row)` list instead of a stripped `(row_number, frame_row)` list; `same_task_conflict_response_body()`/`leave_conflict_response_body()` gained an optional `time_frame_index` parameter (`None` by default — byte-identical body for a single-frame submission). Frontend: `err.timeFrameIndex` is now threaded from the response body through to the Single/Edit catch handlers, which show the backend's actual frame-specific message (and highlight the correct nested input) instead of generic mapped text whenever it is set; Bulk's `applyBulkRowErrors` gained `bulkFrameFieldElement()` to target the exact nested time-frame row.

### 19.2 Wording (verified against every example in the brief)

- Single: `Time frame 2: Enter both a start and end time.` / `Time frame 3: This time overlaps another time frame. Use separate, non-overlapping times.` / `Time frame 2: This time conflicts with Leave on the selected date. Choose another time or date.`
- Bulk: `Task 2, time frame 3: The same task is already scheduled during this time.` / `...This time conflicts with Leave...` / `...This task already exists without a separate time, or an untimed version is included...`
- Edit: `Time frame 1: ...` — never `Task 1` (no logical-task-row concept for a single occurrence being edited).

### 19.3 Precedence and atomicity

Verified unchanged and correct: hard validation → same-title → Leave → advisory (only once every hard check clears), one atomic transaction per surface, zero writes on any hard error. New test `test_17_hard_error_plus_advisory_returns_hard_errors_only` confirms a hard conflict can never be bypassed via "Continue anyway."

### 19.4 Occurrence limit — `[VERIFY]` at the time of this correction (2026-07-27)

Per the brief's explicit instruction, the 30-occurrence limit's enforcement and numeric value were **not** changed and were **not** independently confirmed as approved. Both `MAX_TIME_FRAMES_PER_TASK` and the Bulk total-occurrence check now carry an explicit `[VERIFY — OCCURRENCE LIMIT GOVERNANCE, 2026-07-27]` code comment naming the exact pending decision: *"Maximum 30 total Task occurrences per submission after time-frame expansion."* Phase 11 tests 21–25 (which would assert this as an approved business rule) were deliberately not added.

> **STATUS UPDATE (2026-07-27, same day): APPROVED — see §20.** Preserved verbatim as the historical record.

### 19.5 Test evidence

`backend/tests/test_frame_level_error_context.py` (21 new) + `web-view/js/calendar/frame-level-error-context.test.mjs` (13 new). Combined: 518 backend / 84 frontend, zero regressions.

### 19.6 Database / dependency impact

None — `git diff --stat -- database/ database/migrations/ backend/requirements.txt pyproject.toml package.json package-lock.json` all empty, same as the original task.

### 19.7 One next step (superseded — see §20.9)

~~Two independent items: (1) explicit repository-owner approval or revision of the 30-occurrence-limit statement in §19.4; (2) the live-browser manual pass from §18 above, now additionally confirming the new frame-specific error text displays/highlights correctly. Full detail: `validation/multiple-time-frames-task-entry-check-2026-07-27.md` §13.~~

## 20. Approved occurrence limit — finalization (2026-07-27, same day)

The repository owner approved the statement pending since §19.4 verbatim: **"Maximum 30 total Task occurrences per submission after time-frame expansion."**

### 20.1 Central limit owner

`check_occurrence_limit(expanded_count, for_bulk)` (`backend/routers/member_schedules.py`) — the ONE shared backend validator Single Task create, Task edit, and Bulk Tasks all call with their own already-computed `expanded_count`. The old per-row cap inside `resolve_submitted_time_frames()` was removed (fully subsumed by the submission-wide check). `MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30` is its own constant, independent of the pre-existing, unrelated `MAX_BULK_TASK_ROWS` row-count cap.

### 20.2 Counting rules

Single = number of resolved time frames. Bulk = sum across every logical row. Edit = 1 (selected occurrence) + additional time frames. A backward-compatible one-time request always counts as one.

### 20.3 Approved wording (verified byte-for-byte)

Title "Too many task times" everywhere. Single/Edit: "You can add up to 30 task time frames in one submission. Remove some time frames and try again." Bulk: "You can add up to 30 task time frames across all Bulk Task rows. Remove some time frames and try again."

### 20.4 Precedence and no-write rule

The occurrence-limit check runs before shape validation, same-title checks, Leave checks, and advisory detection in all three endpoints — structurally guaranteed to reject before any fingerprint is computed or any write happens. Confirmed by `test_16_occurrence_limit_precedes_advisory_confirmation` (31 lunch-overlapping frames still produce the hard limit error, never the advisory).

### 20.5 Test evidence

Backend: `backend/tests/test_occurrence_limit.py` (15 new) + one pre-existing test updated (`test_thirty_one_frames_rejected` → `test_more_than_thirty_frames_still_resolves_here`, reflecting the centralized check). **533 backend passed.** Frontend: `web-view/js/calendar/occurrence-limit.test.mjs` (3 new). **87 frontend passed** across 6 files. Zero regressions either language.

### 20.6 Database / dependency impact

None — same empty diff as §13/original task.

### 20.7 Live-browser validation plan (prepared, not fabricated)

See `validation/multiple-time-frames-task-entry-check-2026-07-27.md` §14.7 for the full 9-item checklist (Single/Bulk/Edit occurrence-limit UX, mobile width, zoom, keyboard, focus, form preservation). Not run in this session — no browser available.

### 20.8 Reviewer

Unchanged from §16 — no single domain owner; route to whichever Management Team member next exercises the updated forms live.

### 20.9 One next step (superseded — see §21)

~~Only one item remains: the live-browser manual pass (§20.7). The occurrence limit itself is no longer pending any approval.~~

## 21. Commit, push, deployment verification, and honest live-QA status (2026-07-27, same day)

### 21.1 Implementation commit and push

- Commit `c141064` — "Add multiple time frame task entry" — 13 files (all of §14 implementation/tests), 4,073 insertions / 287 deletions.
- Pushed: `git push origin main` → `f7c7b9a..c141064 main -> main`, accepted, no force. `origin/main` confirmed at `c141064` via `git fetch`.

### 21.2 Deployment verification (read-only checks actually run)

Backend `https://management-aios-api.vercel.app`: `/health` → 200 OK; `/openapi.json` → 200 OK, contains `TimeFrameIn`/`time_frames`/`additional_time_frames`, all 16 pre-existing routes present (bulk, weekly export/XLSX, outcome, member-leave, etc.), none missing or unexpectedly added. Frontend `https://management-aios.vercel.app`: loads 200 OK; deployed `instance.js` contains "Add another time" and "Time frame" strings, `Last-Modified` header recent; deployed `error-mapper.js` contains "Too many task times" and "up to 30 task time frames". No commit SHA is exposed via HTTP headers by Vercel's default config, so deployed-commit correlation is by content match + timestamp, not a direct SHA comparison — stated honestly rather than implied as exact.

### 21.3 What was NOT done — explicit, non-fabricated disclosure

This session's environment has no browser-automation tool. Phases 9–19 of the calling task (live Single/Bulk/Edit Task creation and error UX, live occurrence-limit UX, live advisory confirmation flow, 390px mobile rendering, 200% zoom, keyboard/focus tracing, screenshots, disposable-record creation and cleanup) were **not performed** and are not reported as observed. Full detail and the outstanding checklist: `validation/multiple-time-frames-task-entry-check-2026-07-27.md` §15.

### 21.4 Cleanup

Nothing to clean up — no live disposable records were created in this session.

### 21.5 PASS / AMBER / FAIL

**AMBER.** Implementation, automated tests (533 backend / 87 frontend), and read-only deployment verification are all PASS. The sole open item is the live-browser manual QA pass, honestly disclosed as not performed rather than fabricated.

### 21.6 One next step

A person with browser access (or a future browser-capable session) should run the checklist in `validation/multiple-time-frames-task-entry-check-2026-07-27.md` §15.8 against the live deployment, then update both this document and the validation doc from AMBER to PASS.

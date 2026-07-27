---
name: multiple-time-frames-task-entry-check
type: validation
scope: management_aios backend + web-view — multiple non-overlapping time frames per Task across Single Task creation, Bulk Tasks, and Task Edit
created: 2026-07-27
updated: 2026-07-27 — FRAME-LEVEL ERROR CONTEXT follow-up correction (§13); APPROVED OCCURRENCE LIMIT finalization (§14); then COMMIT/PUSH/DEPLOYMENT VERIFICATION (§15) — implementation committed (c141064) and pushed to origin/main, live deployment confirmed via read-only checks; live-browser manual QA explicitly NOT PERFORMED (no browser-automation tool available in this environment — not fabricated)
status: PASS for implementation, automated tests (533 backend / 87 frontend), and read-only deployment verification. AMBER remains on exactly one item: the full live-browser manual QA checklist (mobile/200% zoom/keyboard/live Create-Bulk-Edit flows) has not been run by anyone yet — see §15.6 for what was and was not verified, and §15.8 for the prepared (not fabricated) checklist a human or browser-capable environment must still complete
reviewer: pending — Mayurika/Suman/Arun per CLAUDE.md §18 reviewer routing (this is a shared Task-creation UX/API change, not owned by one domain; route to whichever team member first exercises the updated Create/Edit forms)
---

# Multiple Time Frames Per Task — Validation Check — 2026-07-27

## 1. Requirement

From the existing Create popup, a user must be able to enter several separate, non-overlapping time frames for the same Task on the same date — each becoming an independent Task occurrence (separate database record). Applies to Single Task creation, Bulk Tasks, and Task Edit ("add another time"). No database schema change; additive request/API contract only.

## 2. Repository safety (Phase 1)

Starting branch `main`, HEAD `f7c7b9a`, working tree clean, nothing staged, no unrelated overlapping changes in Task form/endpoint files. `member-aios/mayurika-hr/staff-data/` was never inspected, staged, or committed at any point in this task.

## 3. Discovery findings (Phase 2)

| Ownership | Location |
|---|---|
| Single Task form renderer | `web-view/js/calendar/instance.js` (Create Task popup markup + scoped field refs) |
| Single Task payload builder | `web-view/js/calendar/core.js` `frontendToApiPayload()` (unchanged; new `frontendToMultiFramePayload()`/`frontendToEditPayload()` added alongside it) |
| Single Task create endpoint | `POST /api/member-schedules/{member_key}` → `create_member_schedule_event` (`backend/routers/member_schedules.py`); request schema `MemberScheduleEventCreate` |
| Bulk row renderer | `bulkRowMarkup()` (`instance.js`) |
| Bulk payload builder | `rowElToPayloadRow()` + `performBulkSubmit()` (`instance.js`) |
| Bulk create endpoint | `POST /api/member-schedules/{member_key}/bulk` → `create_member_schedule_events_bulk`; schema `BulkTaskCreateRequest`/`BulkTaskRowIn` |
| Task Edit form/payload | Same physical form as Single Task create; `editItem()`/`performTaskUpdate()` (`instance.js`) |
| Task Edit endpoint | `PUT /api/member-schedules/{member_key}/{event_id}` → `update_member_schedule_event`; schema `MemberScheduleEventUpdate` |
| Same-title classifier | `classify_same_task_conflict()` (`member_schedules.py`) — already allows separate non-overlapping/adjacent same-title occurrences as distinct DB rows; reused **unchanged**. |
| Advisory detector | `detect_schedule_advisories()` / `build_schedule_confirmation()` — reused, extended with an additive optional `frame_index` parameter only. |
| Fingerprint builder | `schedule_confirmation_fingerprint()` — reused unchanged (still one SHA-256 over a list of per-candidate states; a per-frame state is just one more entry in that list). |
| Existing atomic Bulk transaction | One shared `created_at`, `db.add()` loop, single `flush()`/`commit()`, `except: db.rollback(); raise 500` — this exact pattern is what every new multi-record write path (Single multi-frame create, Bulk frame expansion, Edit-with-added-frames) reuses. |
| Bulk row cap | `MAX_BULK_TASK_ROWS = 30` (`backend/config.py`) — reused as the new per-task time-frame cap (`MAX_TIME_FRAMES_PER_TASK`) and as the new Bulk total-occurrence cap, rather than inventing a second constant. |

**Key finding that shaped the whole design**: the backend's same-title hard-block rule already treats two non-overlapping (or exactly-adjacent) same-title, same-date occurrences as **allowed, separate rows** — this feature is therefore primarily an additive request-shaping layer over already-correct backend logic, not a new conflict-detection system.

## 4. Additive request contract

`TimeFrameIn = {start_time, end_time}` (both optional, backend schemas.py).

| Endpoint | New field | Behavior |
|---|---|---|
| `POST /{member_key}` | `MemberScheduleEventCreate.time_frames: Optional[List[TimeFrameIn]]` | Absent/empty → old single `start`/`end` behavior, byte-identical. Nonempty → authoritative; top-level `start`/`end` must both be `None` or the request is rejected `contradictory_time_fields`. |
| `PUT /{member_key}/{event_id}` | `MemberScheduleEventUpdate.additional_time_frames: Optional[List[TimeFrameIn]]` | The edited occurrence (`event_id`) is always "Time frame 1", edited via the pre-existing `date`/`title`/`priority`/`start`/`end`/`notes` fields exactly as before. `additional_time_frames` lists brand-new sibling occurrences to create atomically alongside that update. |
| `POST /{member_key}/bulk` | `BulkTaskRowIn.time_frames: Optional[List[TimeFrameIn]]` | Same authoritative-when-present contract, per row. |

No database column added. No migration. No dependency added.

## 5. Backend implementation

New shared helpers in `backend/routers/member_schedules.py` (all pure, DB-free, unit-testable):

- `resolve_submitted_time_frames(top_start, top_end, time_frames)` — adapts one call site's (start, end, time_frames) triple into one ordered `[(start, end), ...]` list, or a `contradictory_time_fields`/`too_many_time_frames` error code.
- `classify_time_frame_set(frames)` — the one shared shape/internal-overlap classifier (`'ok' | 'incomplete' | 'invalid_range' | 'duplicate' | 'overlap'`, with 1-indexed frame position(s)), reused identically by Single create, Task edit, and each Bulk row.
- `_expand_bulk_rows_into_frames(nonblank_rows)` — resolves/validates every Bulk row's frame(s) and expands them into `(row_number, frame_number, frame_count, frame_row)` tuples. Deliberately keeps the **same `row_number`** as the shared key for every frame belonging to one row, so every pre-existing Bulk helper (`_bulk_within_batch_time_conflicts`, `_bulk_existing_task_time_conflict_errors`, `_bulk_leave_conflict_errors`, `_find_batch_duplicate_warnings`, `_find_existing_task_duplicate_warnings`) needed **zero code changes** — they already accept a plain `List[Tuple[int, BulkTaskRowIn]]`, and a real `BulkTaskRowIn` carrying one frame's own start/end is exactly what they expect. When every row has exactly one frame, the expanded list is byte-for-byte identical to the pre-existing single-frame-per-row shape.

All three endpoints (`create_member_schedule_event`, `create_member_schedule_events_bulk`, `update_member_schedule_event`) now: (1) resolve/shape-validate every frame first (zero writes on failure), (2) run the **unmodified** `classify_same_task_conflict`/`leave_logic.find_conflicting_active_leave` once per frame (first hard conflict rejects the whole submission), (3) build **one combined** advisory/fingerprint response covering every frame (never one popup per frame), (4) on success, insert every frame in **one atomic transaction** (`db.add()` loop → `flush()` → `commit()`, `except: rollback()`).

Single-create/Edit response shape: a submission that results in exactly one Task record returns the pre-existing bare `MemberScheduleEventOut` object (byte-identical to before this feature — old callers unaffected). A submission resulting in 2+ records returns `{"status": "created"|"updated", "created_count": N, "items": [...]}`, mirroring the shape Bulk Tasks already used.

## 6. Frontend implementation

- `web-view/js/calendar/core.js` — `classifyTimeFrameSet()` (pure client-side mirror of the backend classifier, using `timeToMinutes()`), `TIME_FRAME_VALIDATION_COPY` (exact approved title/message pairs), `frontendToMultiFramePayload()`, `frontendToEditPayload()`. `buildScheduleConfirmationDialogContent()` extended: a single-frame submission (`row_index` always `null`) still uses the original `buildSingleDialogContent`; 2+ frames route through a new `buildMultiFrameDialogContent()` grouped per frame ("Time frame N …"); Bulk's `buildBulkDialogContent()` now groups by `(row_index, frame_index)` so two frames of the same multi-frame Bulk row never collapse into one warning group ("Task N, time frame M …").
- `web-view/js/calendar/instance.js` — the Single Task form's Start/End pair is now "Time frame 1" inside a `.msc-time-frames-section`, with a `+ Add another time` button that appends additional `.msc-time-frame-row` rows (Start/End/Remove), fully removable (Remove deletes the row outright — frame 1 itself is not removable via this UI, mirroring how Task Edit's own frame 1 is always the occurrence being edited). Each Bulk row gets its **own independent** nested time-frame list (same markup/behavior, scoped per row). Task Edit reuses the identical Single-form widget; opening Edit always clears any leftover additional-frame rows from a previous session (`resetTimeFrames()`), so Edit never auto-discovers or pre-loads any other same-title/date occurrence.
- `web-view/js/ui/error-mapper.js` — added `time_frame_incomplete`/`time_frame_invalid_range`/`time_frame_duplicate`/`time_frame_overlap`/`contradictory_time_fields`/`too_many_time_frames`/`too_many_task_occurrences` entries (server-side backstop; the primary UX path is the client-side `classifyTimeFrameSet()` check before any request is sent).
- `web-view/css/calendar.css` — `.msc-time-frames-section`/`.msc-time-frame-row` etc.: flexbox rows that wrap (never a table), explicit full-width stacking below 768px, reuses existing `.msc-btn-ghost`/`.msc-form-full` tokens.

## 7. Edge case found and fixed during implementation

`_is_blank_bulk_row` (backend) and `isBulkRowBlank` (frontend) only ever checked the row's own `title`/`start`/`end`/`notes` for "is this row blank" — a row with real content **only** inside `time_frames` (frame 1 and title/notes left blank) would have been silently classified as blank and dropped before title-required validation ever ran. Fixed on both sides (backend: `_is_blank_bulk_row` now also checks `bool(row.time_frames)`; frontend: `isBulkRowBlank` now also checks whether any additional frame row has a value) and covered by a regression test (`test_row_with_only_time_frames_content_is_not_blank`).

## 8. Test evidence

**Backend** (`python -m pytest backend/tests/`): **518 passed** (435 original + 62 in `test_multiple_time_frames.py` + 21 new in `test_frame_level_error_context.py`, 26 subtests), zero regressions, zero skips. Covers: `classify_time_frame_set` shape/overlap/duplicate/incomplete rules (pure function, Phase 20 items 1–14 + extra cases, now including frame-attributed `incomplete`); `resolve_submitted_time_frames` contradiction/cap; Single create atomicity (3-frame create, shared-field copy, unique IDs, internal overlap/duplicate rejection, existing-task/Leave hard block, lunch/different-title/combined advisory with one fingerprint, confirmed retry, stale-fingerprint rejection, old single-time backward compatibility, Unicode title); Bulk expansion (one row/3 frames, multiple rows, internal frame overlap blocking the whole batch, cross-row same-title/different-title, total-occurrence cap, friendly row/frame numbering, backward-compatible single-frame rows, the blank-row edge case above); Edit atomicity (add one/several frames, adjacent-allowed, overlap-with-self/leave/other-task rejected with the original occurrence left untouched, confirmed retry inserts once, self-exclusion, sibling occurrences unchanged, new occurrences carry no copied outcome); **frame-level error context** (§13) — Single/Bulk/Edit hard-conflict frame attribution, exact Phase 4/5 wording, sorting, deduplication, hard-error-before-advisory precedence, zero-write on any hard error, backward compatibility for single-frame submissions.

**Frontend** (`node --test <file>.test.mjs`): **87 passed** across 6 files — 25 in `multi-time-frame.test.mjs` (client-side classifier parity, payload-builder shape, multi-frame/Bulk dialog-content grouping) + 13 in `frame-level-error-context.test.mjs` (§13 — `describeTimeFrameValidation` Single/Edit vs Bulk wording, frame-count-gated backward compatibility, never-zero-based numbering) + 3 new in `occurrence-limit.test.mjs` (§14 — approved title/message wording) + 46 pre-existing (`schedule-confirmation-message`, `planning-warning-window`, `summary-helpers`), zero regressions. `node --check` passes on every changed `.js` file (`core.js`, `instance.js`, `error-mapper.js`).

**Backend total after §14**: **533 passed** (§8's original 518 + 15 new in `test_occurrence_limit.py`, minus zero net — one pre-existing test was updated in place, not removed; see §14.6).

## 9. Known limitations (honest scope disclosure)

1. **Not every one of the 75 enumerated Phase 20–24 test cases has a dedicated automated test.** The suite above is representative and exercises every distinct *rule* (shape validation, atomicity, hard blocks, advisories, backward compatibility, edge cases) at least once per surface, but does not enumerate all 75 by number. No case was found to fail during ad hoc exploration beyond what is listed in §7.
2. ~~Bulk same-title/Leave hard-block error messages are row-level, not always frame-level...~~ **RESOLVED 2026-07-27 — see §13.** Same-title and Leave hard-conflict messages across Single, Bulk, and Edit now carry full frame-level attribution (`time_frame_index`, and `logical_task_index` for Bulk) whenever a submission genuinely has more than one time frame, with the exact wording specified in the follow-up brief. A single-frame submission is byte-identical to before this correction.
3. **No browser automation tool was available in this session** — mobile stacking, 200% zoom, keyboard operability, and screen-reader labeling were implemented per the CSS/ARIA conventions already established elsewhere in this codebase (flexbox wrap, explicit `aria-label`s on frame inputs/remove buttons, reused `.msc-btn-ghost`/`.msc-form-grid` tokens) and are structurally sound, but were not visually verified in a live browser. Recommend a manual pass before promoting this to `is_official_truth`. Still open after the 2026-07-27 correction.
4. ~~Total-occurrence Bulk cap (30) and per-task time-frame cap (30) are a deliberate, conservative reuse of the existing `MAX_BULK_TASK_ROWS` constant, not a separately-approved number... Pending: repository-owner confirmation.~~ **APPROVED 2026-07-27 — see §14.** The repository owner approved "Maximum 30 total Task occurrences per submission after time-frame expansion" verbatim. The limit is now enforced by one shared backend validator (`check_occurrence_limit`, §14.1) with its own independent constant (`MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30`), consistently across Single Task, Bulk (summed across all rows), and Task Edit (selected occurrence + additional frames) — no longer counted independently per surface, and no longer conflated with the unrelated, pre-existing `MAX_BULK_TASK_ROWS` row-count cap.
5. **XLSX export and Schedule Summary required zero code changes** — both already iterate one row per active `MemberScheduleEvent` database record, so multiple time frames (multiple records) are automatically reflected without any new logic. Verified by reading `backend/xlsx_export.py:build_weekly_schedule_rows` and `backend/routers/member_schedules.py:_aggregate_schedule_period`, not by a new test (none was needed — no behavior changed). Unaffected by the 2026-07-27 correction.
6. **New, narrower limitation from the 2026-07-27 correction**: duplicate-warning messages (`_find_batch_duplicate_warnings`/`_find_existing_task_duplicate_warnings` — the SOFT, confirmable "this looks like an accidental duplicate" system, not a hard block) still key off the Task row number only, not the specific time frame within a multi-frame row — out of scope for this correction, which targeted hard-block (same-title/Leave) messages specifically, per the reported gap. Same-row sibling frames cannot collide in this system by construction (already validated distinct by `classify_time_frame_set` before expansion), so this only affects which of several possibly-duplicate frames within one row a duplicate warning's row-level message implicitly refers to — never a correctness or atomicity issue, only a minor wording-granularity gap.

## 10. Database / migration / dependency impact

`git diff --stat -- database/ database/migrations/ backend/requirements.txt pyproject.toml package.json package-lock.json` — all empty. No schema, migration, or dependency change of any kind.

## 11. PASS / AMBER / FAIL (superseded by §14 — see below)

~~**PASS** for backend correctness, atomicity, and automated test coverage (both languages), including the 2026-07-27 frame-level error context correction (§13). **AMBER** on two specific items: (1) a manual browser pass (mobile/zoom/keyboard/screen-reader) has not been run; (2) the 30-occurrence limit's exact business meaning is `[VERIFY]` pending explicit repository-owner approval (§13.4) — the current numeric value and enforcement are unchanged and were not touched by this correction.~~

**Current (post-§14): PASS** for backend correctness, atomicity, and automated test coverage (both languages), including the now-APPROVED occurrence limit. **AMBER** on exactly one remaining item: a manual browser pass (mobile/zoom/keyboard/screen-reader — §14.7 checklist) has not been run. Relevant Management Team/domain owner review is still required before this is treated as approved operational truth, per CLAUDE.md's Reviewer Routing Rule (§18) and Assistant Forbidden Actions (§13 — this assistant does not unilaterally promote work to parent-AIOS truth).

## 12. Next step (superseded — see §13.6 for the current next step)

~~A relevant Management Team member (or whoever next opens the Create/Edit Task popup in a real browser) should run the manual checklist in §9 item 3 and confirm the exact toast/dialog copy reads correctly end-to-end; no code changes are expected to be required based on the automated coverage above.~~

## 13. Frame-level error context correction (2026-07-27 follow-up)

A follow-up review reported: "Bulk same-title and Leave hard-block messages are row-level but are not always specific to the affected time frame. This is confusing for non-technical users when one logical Bulk Task contains several time frames." A second, related gap was found during root-cause review: Single Task's and Task Edit's own hard-conflict responses never carried frame identity at all (not even row-level), and the frontend's Single/Edit error-display path discarded the backend's message text in favor of generic mapped copy even when frame context was available.

### 13.1 Root cause

Two backend locations discarded frame identity:
- **Bulk**: `_bulk_within_batch_time_conflicts`/`_bulk_existing_task_time_conflict_errors`/`_bulk_leave_conflict_errors` were called with `expanded_rows` — a list stripped down to `(row_number, frame_row)` pairs — even though the richer `(row_number, frame_number, frame_count, frame_row)` tuples existed one call frame earlier in `_expand_bulk_rows_into_frames`'s `expanded` list.
- **Single/Edit**: the same-title and Leave conflict loops (`for start, end in frames:`) never used `enumerate`, and `same_task_conflict_response_body`/`leave_conflict_response_body` never accepted a frame-identity parameter at all.

On the frontend, `mapApiError()` for these codes returns fixed `KNOWN_ERRORS` title/message text, ignoring the backend's actual `message` — so even a frame-indexed backend response would have shown generic text in Single/Edit's toast/status line.

**Narrowest shared correction point**: (a) the three Bulk conflict-check functions now accept the full `expanded` list instead of the stripped `expanded_rows`, via one shared `_bulk_same_task_conflict_error()` builder; (b) `same_task_conflict_response_body()`/`leave_conflict_response_body()` gained an optional `time_frame_index` parameter, `None` by default (byte-identical body for a single-frame submission); (c) the frontend now shows `err.message` instead of the generic mapped text whenever `err.timeFrameIndex` is set.

### 13.2 Structured error contract

Every frame-attributable hard error now additionally carries (Bulk) `logical_task_index` + `time_frame_index`, or (Single/Edit) `time_frame_index` alone — always 1-indexed, never a database id, never present at all for a single-frame submission (exact pre-existing body preserved). Shape errors (`incomplete`/`invalid_range`/`duplicate`/`overlap`) already had partial frame numbering from the original task; `incomplete` now also identifies the offending frame once 2+ frames are submitted (it previously always returned `None`).

### 13.3 Wording (verified byte-for-byte against the brief's examples)

| Surface | Example |
|---|---|
| Single — incomplete | `Time frame 2: Enter both a start and end time.` |
| Single — overlap | `Time frame 3: This time overlaps another time frame. Use separate, non-overlapping times.` |
| Single — Leave conflict | `Time frame 2: This time conflicts with Leave on the selected date. Choose another time or date.` |
| Bulk — internal overlap | `Task 2, time frame 3: This time overlaps another time frame for the same task. Use separate, non-overlapping times.` |
| Bulk — saved same-title conflict | `Task 2, time frame 3: The same task is already scheduled during this time.` |
| Bulk — Leave conflict | `Task 2, time frame 3: This time conflicts with Leave on the selected date. Choose another time or date.` |
| Bulk — timed/untimed conflict | `Task 2, time frame 3: This task already exists without a separate time, or an untimed version is included. Use one untimed task or complete, non-overlapping time frames.` |
| Edit — selected occurrence | `Time frame 1: ...` — never `Task 1` (Edit has no logical-task-row concept) |

Duplicate/overlap messages name only the LATER of the two conflicting frames (matches every given example, which names exactly one frame number) — a deliberate simplification from this feature's original implementation, which named both.

### 13.4 Occurrence limit governance — `[VERIFY]` at the time of this correction (2026-07-27)

Per the brief's explicit instruction, this correction did **not** enforce, retain-as-confirmed, or independently redefine the 30-occurrence limit's business meaning. `MAX_TIME_FRAMES_PER_TASK`/the Bulk total-occurrence check in `backend/routers/member_schedules.py` are functionally unchanged; both now carry an explicit `[VERIFY — OCCURRENCE LIMIT GOVERNANCE, 2026-07-27]` code comment stating the pending decision verbatim: *"Maximum 30 total Task occurrences per submission after time-frame expansion."* This is this implementation's own conservative reuse of the pre-existing `MAX_BULK_TASK_ROWS` constant, not a confirmed business rule — per CLAUDE.md's Source Discipline (§2), it must not be treated as operational truth until a relevant Management Team/domain owner explicitly confirms or revises it. Per the brief's Phase 11, tests 21–25 (asserting the 30/31 boundary as an approved business rule) were deliberately **not** added in this correction; the pre-existing tests from the original task (which assert the *current implementation's* boundary, not a confirmed business rule) were left as regression coverage only.

> **STATUS UPDATE (2026-07-27, same day — see §14): APPROVED.** The repository owner explicitly approved this exact statement: *"Maximum 30 total Task occurrences per submission after time-frame expansion."* This paragraph is preserved verbatim as the historical record of the `[VERIFY]` state; §14 documents the finalization work this approval unlocked.

### 13.5 Precedence, atomicity, and form preservation — verified, not changed

Hard validation → same-title hard conflicts → Leave hard conflicts → advisory confirmation (only once every hard check passes) was already the correct order in all three endpoints before this correction; confirmed by new tests (`test_17_hard_error_plus_advisory_returns_hard_errors_only`) that a hard conflict can never be bypassed via the advisory "Continue anyway" path. Atomicity (Bulk, Single multi-frame, Edit-with-added-frames) was not touched — all writes remain gated behind every check passing, in one transaction. Frontend form preservation was already correct (no `resetForm()`/`resetBulkForm()` call on any rejection path); this correction only improves *which* field gets highlighted and *what* message is shown, via `bulkFrameFieldElement()` (Bulk) and the shared `inputForFrame()` (Single/Edit) now also being used by the server-error catch handlers, not just client-side pre-validation.

### 13.6 Automated test evidence for this correction

Backend: `backend/tests/test_frame_level_error_context.py` — 21 new tests (Phase 11 items 1–20; items 21–25 intentionally not added, see §13.4). Frontend: `web-view/js/calendar/frame-level-error-context.test.mjs` — 13 new tests (pure-function coverage of `describeTimeFrameValidation`/`classifyTimeFrameSet`'s frame attribution; DOM-dependent items — focus, mobile stacking, 200% zoom, keyboard reach, Tamil/Unicode layout — are structural/CSS-conventions-based, consistent with how the original task handled the same category of item, and were not newly automated in this correction either). Combined suite: 518 backend / 84 frontend, zero regressions (§8).

### 13.7 One next step (superseded — see §14)

~~Two independent items remain before this can move past AMBER: (1) a relevant Management Team/domain owner should explicitly approve or revise the 30-occurrence-limit statement in §13.4 — until then it stays `[VERIFY]`; (2) a live-browser manual pass (mobile width, 200% zoom, keyboard, screen reader) of the Create/Edit Task popups, confirming the new frame-specific error text displays and highlights correctly. Neither is expected to require further code changes based on the automated coverage in this document.~~

## 14. Approved occurrence limit — finalization (2026-07-27, same day)

The repository owner approved the exact statement pending since §13.4: **"Maximum 30 total Task occurrences per submission after time-frame expansion."** An occurrence is one Task database record. This section documents applying that approval.

### 14.1 Central limit owner

One shared validator, `check_occurrence_limit(expanded_count, for_bulk)` (`backend/routers/member_schedules.py`), is now the SOLE place any endpoint compares against the approved limit. Single Task create, Task edit, and Bulk Tasks each compute their own `expanded_count` and call this one function — none of them independently counts or compares against the limit itself. The retired per-row cap that previously lived inside `resolve_submitted_time_frames()` (`too_many_time_frames`, checked one row/task at a time) has been removed entirely — a submission's total can never be smaller than any one row's own frame count, so the shared submission-wide check subsumes it without loss of protection. `MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30` is its own literal constant, deliberately not derived from the pre-existing (and conceptually different) `MAX_BULK_TASK_ROWS` row-count cap — the two now share a numeric value because they were approved independently, not because one implies the other.

### 14.2 Counting rules (as implemented)

| Surface | expanded_count |
|---|---|
| Single Task | number of resolved time frames (`len(frames)`) |
| Bulk | sum of resolved time frames across every logical row (`len(expanded_rows)`, post-expansion, blank rows already excluded by the pre-existing `_is_blank_bulk_row` filter) |
| Task Edit | 1 (the selected occurrence) + number of additional time frames |

A backward-compatible one-time request (no `time_frames`/`additional_time_frames`) always resolves to exactly one frame, so it always counts as exactly one occurrence.

### 14.3 Placement and precedence

In all three endpoints, `check_occurrence_limit()` is called immediately after frames are resolved/expanded and BEFORE shape validation (`classify_time_frame_set`), same-title conflict checks, Leave conflict checks, and advisory detection — structurally guaranteeing (not just by convention) that an oversized submission is rejected before any `schedule_confirmation_fingerprint()` call could ever happen, and before any database write. Verified by `test_16_occurrence_limit_precedes_advisory_confirmation` (`backend/tests/test_occurrence_limit.py`) — 31 frames that would each individually trigger a lunch-break advisory still produce the hard occurrence-limit error, never `schedule_confirmation_required`.

### 14.4 User-facing wording (verified byte-for-byte)

| Title | Surface | Message |
|---|---|---|
| Too many task times | Single / Edit | You can add up to 30 task time frames in one submission. Remove some time frames and try again. |
| Too many task times | Bulk | You can add up to 30 task time frames across all Bulk Task rows. Remove some time frames and try again. |

Backend: `check_occurrence_limit()` selects the Bulk-specific message via `for_bulk=True`; the title is a frontend-only concern (this module's existing convention), supplied by `ui/error-mapper.js`'s `too_many_task_occurrences` entry (Single/Edit) or `applyBulkRowErrors()`'s explicit title override (Bulk, since Bulk shows the backend's own `message` directly and needed its own title match).

### 14.5 No-write rule

Confirmed structurally and by test: on rejection, zero Tasks are created (Single, Bulk), zero Tasks are updated (Edit — the selected occurrence's stored fields are read back unchanged by `test_8_edit_selected_plus_30_additional_blocked`), no `confirmation_fingerprint` or `warnings` key is ever present in the rejection body, and no Continue-anyway bypass exists for this error (it is a plain 422, not the 409 `schedule_confirmation_required` advisory contract).

### 14.6 Test evidence

**Backend**: `backend/tests/test_occurrence_limit.py` — 15 new tests covering brief items 1–16 (30/31 boundary for Single, Bulk uniform×10, Bulk mixed row sizes, Edit selected+additional, blank-placeholder exclusion, backward-compatible one-time-counts-as-one, zero-write/zero-update, form-value preservation, both approved messages, hard-limit-precedes-advisory). Items 17–22 (same-title/Leave/classification/outcomes/Summary/XLSX unchanged) are not separately re-tested — they are proven by the rest of this suite continuing to pass unmodified (the code paths for those rules were not touched by this finalization). One pre-existing test (`test_thirty_one_frames_rejected`) was updated to `test_more_than_thirty_frames_still_resolves_here`, reflecting that `resolve_submitted_time_frames()` itself no longer rejects on frame count — legitimate test churn from centralizing the check, not a weakened guarantee (the endpoint-level rejection is now covered by `test_occurrence_limit.py` instead). **Full backend suite: 533 passed**, zero regressions.

**Frontend**: `web-view/js/calendar/occurrence-limit.test.mjs` — 3 new tests confirming `mapApiError('too_many_task_occurrences')` returns the approved Single/Edit title/message word-for-word. **Full frontend suite: 87 passed** across 6 files, zero regressions. `node --check` clean on every changed `.js` file.

### 14.7 Live-browser validation plan (prepared, not fabricated — no browser available in this session)

The following have NOT been visually verified and must not be read as observed results:

1. Single Task form: add time frames up to and past 30 (client-side "+ Add another time" caps at 30 as early feedback; confirm the cap itself renders correctly and the Add button disables at the limit).
2. Bulk: nested time frames across multiple rows summing past 30; confirm the toast title reads "Too many task times" and the Bulk-specific message body.
3. Task Edit: selected occurrence + additional frames past 30; confirm no update is visually applied and existing values remain in the form.
4. A frame-specific hard error (from §13) alongside an occurrence-limit rejection in the same session, confirming the two error styles are visually distinguishable.
5. 390px mobile width: confirm the occurrence-limit toast/status text wraps without overflow.
6. 200% zoom: confirm the same.
7. Keyboard-only operation: reach and dismiss the occurrence-limit toast/status without a mouse.
8. Focus behavior on rejection (occurrence-limit errors have no single "first invalid frame" — confirm focus lands somewhere sensible, e.g. the status message or the last-added frame's Remove button).
9. Form preservation: confirm every entered date/title/priority/notes/time value is still present after an occurrence-limit rejection, exactly as the backend test suite already proves the request itself would produce.

None of the above is expected to require further code changes based on the automated coverage in §14.6 — this list exists so the eventual manual pass has a concrete checklist rather than starting from nothing.

### 14.8 Database / dependency impact

None. `git diff --stat -- database/ database/migrations/ backend/requirements.txt pyproject.toml package.json package-lock.json` — all empty, unchanged from §10.

### 14.9 One next step (superseded — see §15)

~~A relevant Management Team member (or whoever next opens the Create/Edit/Bulk Task popups in a real browser) should run the checklist in §14.7. No further owner approval is pending — the occurrence limit is now APPROVED, not `[VERIFY]`.~~

## 15. Commit, push, deployment verification, and honest live-QA status (2026-07-27, same day)

The implementation was committed and pushed to `origin/main`. Deployment was verified via read-only HTTP checks. **Live-browser manual QA (mobile viewport, 200% zoom, keyboard navigation, actual Create/Bulk/Edit interactions, screenshots) was explicitly NOT performed** — this session's environment has no browser-automation tool (no Playwright/Puppeteer/computer-use capability), and rather than fabricate that evidence, this section documents exactly what was and was not done, and why.

### 15.1 Implementation commit

- Hash: `c141064`
- Subject: `Add multiple time frame task entry`
- Parent: `f7c7b9a`
- Files (13, exactly the approved implementation/test scope — the two evidence docs were deliberately excluded from this commit and are committed separately, see §15.9): `backend/routers/leave_logic.py`, `backend/routers/member_schedules.py`, `backend/schemas.py`, `backend/tests/test_frame_level_error_context.py` (new), `backend/tests/test_multiple_time_frames.py` (new), `backend/tests/test_occurrence_limit.py` (new), `web-view/css/calendar.css`, `web-view/js/calendar/core.js`, `web-view/js/calendar/frame-level-error-context.test.mjs` (new), `web-view/js/calendar/instance.js`, `web-view/js/calendar/multi-time-frame.test.mjs` (new), `web-view/js/calendar/occurrence-limit.test.mjs` (new), `web-view/js/ui/error-mapper.js`.
- 4,073 insertions, 287 deletions.

### 15.2 Push

`git push origin main` → `f7c7b9a..c141064  main -> main` (accepted, no rejection, no force). `git fetch origin main` afterward confirmed `origin/main` at `c141064`, matching local `HEAD` exactly.

### 15.3 Automated test re-confirmation (post-push, same commit)

Backend: **533 passed**, 0 failed (`python -m pytest backend/tests/`) — matches the expected baseline exactly. Frontend: **87 passed**, 0 failed across 6 `node --test` files — matches the expected baseline exactly. `node --check` clean on every changed `.js` file.

### 15.4 Deployment verification — read-only checks actually performed

| Check | Result |
|---|---|
| Backend `GET /health` | `200 OK` — `{"status":"ok","service":"management-aios-member-schedules"}` |
| Backend `GET /openapi.json` | `200 OK`, 60,645 bytes; contains `TimeFrameIn`, `time_frames`, `additional_time_frames` |
| Backend route inventory | 16 routes present, including `/api/member-schedules/{member_key}/bulk`, `/api/member-schedules/{member_key}/reports/weekly/export` (XLSX), `/api/member-schedules/{member_key}/{event_id}/outcome`, and every `member-leave` route — no route missing, none unexpectedly added |
| Frontend `GET /` | `200 OK` |
| Deployed `GET /js/calendar/instance.js` | `200 OK`, 311,928 bytes; contains "Add another time" (×4), "Time frame" (×21) |
| Deployed `GET /js/ui/error-mapper.js` | `200 OK`; contains "Too many task times" (×1), "up to 30 task time frames" (×1) |
| Deployed asset freshness | `instance.js` response header `Last-Modified: Mon, 27 Jul 2026 11:13:28 GMT` — recent, consistent with this session's push having triggered a rebuild |
| Migration requested | No — this session never touched `database/`, confirmed again via `git diff --stat -- database/` (empty) |

**Not available and not fabricated**: no git-commit-SHA header is exposed by Vercel's default configuration for either deployment, so the deployed commit cannot be directly correlated to `c141064` by SHA — only inferred from content match (the exact new schema names/strings above are unique to this implementation) and timestamp recency.

### 15.5 Phases NOT performed (honest disclosure)

The following require an actual browser (viewport control, zoom, keyboard focus tracing, click/type interaction, screenshot capture) or live production database writes/deletes, neither of which this session's tooling supports:

- Live Single Task three-frame creation, adjacent-frame acceptance, internal exact-duplicate/overlap/incomplete-frame hard-error UX.
- Live Bulk nested time-frame creation (2+ rows) and the `Task 2, time frame 3`-style hard-error UX.
- Live Task Edit with additional frames, and the rollback-on-invalid-added-frame UX.
- Live occurrence-limit UX (30 allowed / 31 blocked) as experienced through the actual popup.
- Live lunch/different-title combined advisory confirmation flow (Go back / Confirm).
- 390px mobile viewport rendering.
- 200% browser zoom rendering.
- Keyboard-only operation and focus-order tracing.
- Screenshot capture of any of the above.
- Creation and cleanup of any disposable live Task records under `paraparan`/`dashboard_testing`.

None of this was invented, approximated, or reported as observed. The automated backend test suite (`test_multiple_time_frames.py`, `test_frame_level_error_context.py`, `test_occurrence_limit.py` — 98 tests combined) already exercises the underlying logic for every one of these scenarios end-to-end against a real (in-memory) database, which is why implementation confidence is PASS even though visual/UX confidence is not yet independently confirmed.

### 15.6 What this means for the PASS conditions

Of the 16 PASS conditions in the calling brief, 1–11 and 13–16 are satisfied by the combination of code review, the automated test suite, and the read-only deployment checks above. Condition 12 ("Mobile, zoom, keyboard, and accessibility checks pass") is **not yet independently verified** — it remains exactly where §14.7's prepared checklist left it, now consolidated into §15.8 below.

### 15.7 Cleanup

No disposable live records were created (Phases 9–19 were not performed), so there is nothing to clean up and no residue exists from this session's live-verification work.

### 15.8 Live-browser validation checklist (still outstanding — supersedes §14.7, unchanged in substance)

A human, or an environment with browser automation, should still run:

1. Single Task: 3 adjacent frames (09:00–10:00, 10:00–11:00, 14:00–15:00) → 3 records, one success toast, Calendar/My Tasks/Schedule Summary/XLSX all reflect 3 occurrences.
2. Single Task: exact-duplicate frames, overlapping frames, one incomplete frame → each blocked, zero writes, frame-specific message, form values retained.
3. Bulk: 2 rows (2 frames + 3 frames) → 5 records atomically; then a hard error in Task 2/time frame 3 → whole batch rejected, zero rows, all values retained, message names "Task 2, time frame 3".
4. Edit: add 2 frames to an existing occurrence → atomic update + 2 inserts, siblings untouched, new occurrences have no copied outcome; then an invalid added frame → original occurrence unchanged, zero inserts.
5. A submission exceeding 30 occurrences (Single, Bulk, and Edit each) → "Too many task times" with the correct surface-specific message, zero writes, no advisory popup, values retained.
6. A combined lunch + different-title advisory (no hard conflict) → one popup, Go back = zero writes, Confirm = all created once, stale-fingerprint revalidation intact.
7. 390px mobile width and 200% zoom across all of the above — no horizontal overflow, controls remain reachable, long messages wrap.
8. Keyboard-only: add/remove frames, submit, reach frame-specific errors, operate confirmation dialogs, confirm visible focus and no focus leak.
9. Tamil/Unicode title through the same flows — labels/layout undamaged.
10. Disposable-record cleanup under `paraparan`/`dashboard_testing` on a date with zero pre-existing Tasks/Leave, verifying the Task count returns to baseline afterward.

### 15.9 Evidence commit

This document and `handover/2026-07-27__multiple-time-frames-task-entry-closure.md` are committed and pushed together, separately from the implementation commit (§15.1), as an evidence-only closure commit — see both files' own record of that commit hash, added immediately after this section is written.

### 15.10 PASS / AMBER / FAIL (current, supersedes §11 and §14's own restatement)

**AMBER.** Implementation: PASS (code review, 533+87 automated tests, read-only deployment verification all clean). Live-browser manual QA: **not performed**, honestly disclosed rather than fabricated — this is the sole reason full PASS is not declared.

### 15.11 One next step

A person with access to a real browser (or a future session with browser-automation tooling) should run the §15.8 checklist against `https://management-aios.vercel.app`, using a disposable date for member `paraparan` with `dashboard_testing` scope, and then update this document's status from AMBER to PASS.

# Same-Day Bulk Task Creation — Validation Check (2026-07-23)

## 1. Confirmed business decisions (source: user task instructions, 2026-07-23)

1. Bulk Tasks is available from both the main `+ Create` interface and the date-cell Create dialog.
2. Every Task in one batch uses one common date.
3. Title, Start time, End time, Priority, and Notes are entered separately per row.
4. Maximum 30 nonblank rows per submission.
5. Creation is all-or-nothing: any hard validation or Leave-conflict error creates zero Tasks and identifies every failing row/field.
6. A date covered by active Full-Day or Multi-Day leave blocks Bulk Tasks (opening at the date-cell entry point; submission/adding-rows at the main `+Create` entry point) with the approved blocked-date message.
7. Duplicate title/time combinations (within the batch, and against existing active Tasks for the same member/date) produce warnings, not hard errors.
8. Blank rows are ignored; a row with any nonblank field (including a filled time with an empty title) is treated as a hard error, not blank.
9. Priority is selected independently per row.
10. Manual rows only — no CSV/Excel/paste import exists anywhere in this feature.
11. No Scheduled/Unscheduled selector exists on the form.
12. No database table, column, constraint, or migration change was made.

## 2. Endpoint

`POST /api/member-schedules/{member_key}/bulk` — additive; the existing `POST /api/member-schedules/{member_key}` single-create route is unmodified (verified: same file, same function, same request/response schema, same behavior — see §12 below and the full pytest regression run).

## 3. Request contract

```json
{
  "date": "YYYY-MM-DD",
  "tasks": [
    { "title": "...", "start": "HH:MM or null", "end": "HH:MM or null", "priority": "High|Medium|Low", "notes": "... or null" }
  ],
  "confirm_duplicates": false
}
```

Field names (`start`/`end`, not `start_time`/`end_time`) deliberately match the existing single-Task-create convention (`MemberScheduleEventCreate`) rather than the task brief's illustrative example — "use actual existing field naming conventions" was the controlling instruction. No `category`, `created_at`, `updated_at`, or per-row `member_key` field exists on the request, by design.

## 4. Response contract — three outcomes

- **A. `validation_failed` (HTTP 422)** — `created_count: 0`, `errors: [{row, field, code, message}]`. `row` is the 1-indexed position in the *original* submitted `tasks` array (including any blank rows), so a reported row number always matches what the user sees as "Row N" — never shifted by earlier blank rows.
- **B. `duplicate_confirmation_required` (HTTP 409)** — `created_count: 0`, `warnings: [{source, rows, title, start, end, existing_task_id, message}]`. `source` is `current_batch` or `existing_task`.
- **C. `created` (HTTP 201)** — `created_count`, `items: [MemberScheduleEventOut, ...]` — the exact same output shape the single-create endpoint already returns.

No raw database or exception text is ever exposed in any of the three outcomes (confirmed: the one server-error catch path returns a fixed generic message, never the underlying exception).

## 5. Atomicity proof

`create_member_schedule_events_bulk` (`backend/routers/member_schedules.py`) builds every `MemberScheduleEvent` row first, then calls `db.add()` for each, a single `db.flush()`, and a single `db.commit()` — one transaction, one commit, for the whole batch. On any exception during `flush()`/`commit()`, `db.rollback()` runs and a generic `HTTPException(500, ...)` is raised — no partial commit is possible. Verified by `AtomicTransactionTests.test_database_error_rolls_back_all_rows` (simulated flush failure via a fake session — `db.rolled_back is True`, `db.committed == []`, and the real exception text never reaches the response).

## 6. Zero-write failure proof

Every failing path (`no_tasks_submitted`, `too_many_rows`, per-row field errors, Leave conflicts, `duplicate_confirmation_required`) returns *before* any `MemberScheduleEvent` object is constructed or `db.add()` is called. Verified directly: every failure-path test in `backend/tests/test_bulk_task_creation.py` asserts `len(db.added) == 0`.

## 7. Shared timestamp / classification proof

One `created_at = datetime.now(timezone.utc)` is captured once per request and reused for every row's `created_at`/`updated_at`; `category = classify_new_task(event_date, created_at)` — reusing the existing, unmodified classification function — is likewise computed once and assigned to every row in the batch. This is what prevents mixed Scheduled/Unscheduled classification inside one successfully committed batch at the Sunday 23:59:59 Asia/Colombo cutoff. Verified by `test_all_rows_receive_the_same_created_at`, `test_all_rows_receive_the_same_updated_at`, `test_all_rows_receive_the_correct_scheduled_category`, `test_all_rows_receive_the_correct_unscheduled_category`, and `test_client_category_manipulation_is_ignored` (an extra `category` field on a submitted row is silently dropped by Pydantic — never read).

Live confirmation (curl against the real backend + Neon database, 2026-07-23): two rows submitted together on `2099-01-05` both returned `"created_at":"2026-07-23T11:20:28.511958Z"` — identical to the microsecond.

## 8. Duplicate definition

Same member + common date + normalized title (trimmed, case-folded) + normalized time (`HH:MM`, or both absent for untimed rows). Title-only similarity with differing time combinations is never treated as a duplicate. Implemented once, in `backend/routers/member_schedules.py` (`_bulk_duplicate_key` and friends), and mirrored — never re-derived independently — by the frontend's early, non-blocking hint (`bulkDuplicateKey` in `instance.js`), which never overrides the backend's authoritative decision.

## 9. Current-batch duplicate result

Verified: two (or more) nonblank rows sharing the same normalized title/time inside one submission produce exactly one `current_batch` warning naming every matching row (e.g. "Rows 2 and 6 match..."). Zero rows are inserted. `test_batch_duplicate_returns_warning_and_zero_inserts`.

## 10. Existing-Task duplicate result

Verified: a submitted row matching an active (`deleted_at IS NULL`) Task already saved for the same member and common date produces an `existing_task` warning identifying the submitted row number, the existing Task's title/time, and its id (`existing_task_id`) for internal correlation only — the id is never interpolated into the user-facing `message` string. Soft-deleted Tasks never trigger a warning; Leave records never participate in Task duplicate detection (the query is `MemberScheduleEvent` only). Live-confirmed against the real database: resubmitting an identical row after creating it returned exactly this warning shape.

## 11. Confirmation flow

Initial submission always sends `confirm_duplicates: false`. If warnings exist and no hard error exists, zero rows are inserted and `duplicate_confirmation_required` is returned. The frontend shows a "Possible duplicate tasks" confirmation (reusing the shared `confirmDestructive` dialog from `ui/dialog.js`, extended with a new `confirmVariant: 'primary'` option so "Create tasks anyway" — which creates data, not destroys it — never wears the dialog's default red delete-style button). "Go back and review" creates nothing, keeps every row/value, and focuses the first warned row. "Create tasks anyway" resubmits the identical batch with `confirm_duplicates: true`; the backend revalidates hard rules, Leave conflicts, and duplicates entirely from scratch (nothing from the earlier response is trusted) and only then creates all rows atomically. Live-confirmed in a real browser: the dialog rendered with title "Possible duplicate tasks", confirm button "Create tasks anyway" (class `msc-btn-primary`, not `msc-btn-danger`), cancel button "Go back and review"; clicking "Go back and review" left zero rows in the database.

## 12. Full-Day / Multi-Day Leave result

Reuses `leave_logic.find_conflicting_active_leave` — the exact same function the single-create/update endpoints already call — with zero new formula. A Full-Day or Multi-Day-covered date conflicts with every row (timed or untimed) in the batch; the conflict is folded into the same `validation_failed` error contract as field errors (e.g. "Row 7 — This date is covered by Full-Day Leave."), since Bulk Tasks has only three response outcomes and no separate fourth "leave_conflict" shape. Frontend gate: the date-cell entry point's existing `isDateFullyLeaveBlocked()` pre-open check (unchanged) blocks the whole dialog — including the Bulk tab — from opening at all. The main `+Create` entry point has no date yet at open time, so a new `applyBulkLeaveGate()` disables "Create tasks" and further row-adding, and shows the approved blocked-date note, the moment a fully-blocked date is entered — without closing the dialog or discarding entered rows. The backend always rechecks regardless of this client-side gate.

## 13. Partial-Leave (Short / Half-Day First / Half-Day Second) result

Unchanged rule, reused verbatim: conflicts only with a timed row whose `[start,end)` window overlaps the leave's own interval; an untimed row never conflicts with a partial-day leave. Verified: `test_partial_leave_overlapping_row_creates_zero`, `test_partial_leave_non_overlapping_rows_succeed`, `test_untimed_row_unaffected_by_partial_leave`.

## 14. 30-row limit

Enforced after blank rows are discarded (`MAX_BULK_TASK_ROWS = 30`, `backend/config.py`, mirrored client-side in `instance.js` for immediate feedback). 30 nonblank rows succeed; 31 nonblank rows create zero with a single request-level error (`too_many_rows`). Verified: `test_thirty_valid_rows_creates_thirty`, `test_thirty_one_nonblank_rows_creates_zero`.

## 15. Blank-row behavior

A row is blank only when title, start, end, and notes are *all* empty — priority is deliberately excluded from the check (every row always carries a default priority value), matching the approved rule exactly, on both backend (`_is_blank_bulk_row`) and frontend (`isBulkRowBlank`). A row with an empty title but a filled time or note is a hard error (`title_required`), never treated as blank. Verified: `test_blank_rows_are_ignored`, `test_all_rows_blank_returns_validation_failed`, `test_title_empty_but_time_present_is_a_hard_error_not_blank`.

## 16. All-five-member result

Verified programmatically for mayurika, suman, arun, rajiv, and paraparan (`test_all_five_members_succeed_identically`) and manually for mayurika via the live backend + browser. Member isolation is enforced by the `member_key` path parameter exactly as the single-create endpoint already does; the existing-Task duplicate query is always scoped by the calling member's key.

## 17. Calendar / Schedule Summary refresh result

The frontend's success handler calls `selectDate(dateVal)` — the exact same single-call refresh entry point the single-Task form already uses — once, regardless of how many rows were just created. This re-renders the calendar grid, the Priority Queue preview, the Tasks workspace (if active), and Schedule Summary, all exactly once. Confirmed live: the calendar navigated to and highlighted the submitted date, and exactly one success toast ("2 tasks created") appeared — never one toast per row.

## 18. Database / migration proof

```
git diff -- database/            → (empty)
git diff -- database/migrations/ → (empty)
git status --short database/     → (empty)
```

No table, column, constraint, or migration was added or changed.

## 19. Automated test results

- `python -m unittest backend.tests.test_bulk_task_creation` — 29/29 passed.
- `python -m unittest discover -s backend/tests` (full existing suite + new file) — **227/227 passed**, confirming zero regressions to existing single-Task, Leave, classification, and duration-report behavior.

## 20. Live verification (this session, 2026-07-23)

Backend (uvicorn against the real configured Neon database, local-only, `127.0.0.1:8000`):
- Validation-failure round trip (missing title, invalid time range) — zero writes, correct row/field/code/message.
- Invalid `member_key` — 404, unchanged shape.
- Successful 2-row creation on a safe far-future test date (`2099-01-05`) — confirmed shared `created_at`, correct category, `source_scope: "dashboard_testing"`, `is_official_truth: false`.
- Existing-Task duplicate detection against the just-created rows — confirmed warning shape, zero further writes.
- All test rows deleted immediately after (`DELETE /api/member-schedules/mayurika/{id}`) — confirmed zero rows remain. No pre-existing data was touched.

Frontend (headless Chrome via a one-off CDP driver script, since no Playwright/chromium-cli/project run-skill existed in this environment — see §21):
- Sidebar `+ Create` → Bulk Tasks tab renders with heading "Create multiple tasks", 2 initial rows, visible common Date field (screenshot-confirmed).
- Add another task / Remove row worked (row count 2 → 3 → 2).
- Submission created exactly the submitted rows, closed the dialog, showed one toast ("2 tasks created"), and the calendar navigated to and highlighted the submitted date (screenshot-confirmed).
- Duplicate-confirmation dialog rendered with the approved title/copy/button labels, `msc-btn-primary` (not danger) styling on "Create tasks anyway"; "Go back and review" created zero rows (confirmed against the live database).
- Date-cell entry point (`.msc-cal-cell--actionable` click) opened the dialog with the Bulk Tasks tab present and the clicked date correctly propagated into the Bulk tab's common date field on tab switch.
- All rows created during verification were deleted immediately after each check.

## 21. Known limitations

- No project-level browser-automation skill existed for this app; a one-off Python/CDP driver script was written for this session only (not committed to the repo) to drive headless Chrome. Recommend `/run-skill-generator` if repeat frontend verification is expected.
- The early, client-side duplicate hint (Step 17) is a non-blocking visual aid only, not a full pre-submit confirmation flow — the authoritative duplicate check is always the backend's `duplicate_confirmation_required` response, by design.
- This feature inherits the pre-existing absence of any idempotency guard (no unique constraint, no idempotency key) — a genuine double-click race was not newly introduced, but is not newly closed either; double-submission is mitigated client-side only (button disable + explicit in-flight flag), matching the task's explicit instruction not to add a database uniqueness constraint.

## 22. PASS / AMBER / FAIL

**PASS.** All 21 PASS conditions from the task instructions are met: both entry points expose Bulk Tasks, one common date, 30-row cap, blank-row handling, independent per-row values, all-or-nothing hard-error behavior with exact row/field identification, both duplicate sources warned, confirmation flow correct, Full-Day/Multi-Day opening gate correct, backend Leave revalidation confirmed, one shared authoritative timestamp/category, single Calendar/Summary refresh, existing single-Task creation unchanged (full regression suite green), zero database/migration changes, all five members verified, protected folder untouched, and evidence/handover are complete.

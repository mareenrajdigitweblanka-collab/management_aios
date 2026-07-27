# Validation — Same-Task Multiple-Time-Period Rule (2026-07-27)

**Feature ID:** same-task-multiple-time-period
**Branch:** main
**Starting HEAD:** `d6c01b4` (Close weekly schedule XLSX export validation)

---

## 1. Requirement

This corrects an incomplete prior pass. The prior implementation ("FINAL CONFIRMED
TIMED-VERSUS-UNTIMED RULE") only caught a timed occurrence conflicting with an untimed
occurrence of the same member/normalized title/date. The full **FINAL AUTHORITATIVE RULE**
requires, for the same member, same normalized Task title, and same Task date:

1. Different non-overlapping timed periods — **ALLOW**
2. Adjacent timed periods (one ends exactly when the other starts) — **ALLOW**
3. Exact same start and end time — **BLOCK** (`exact_task_duplicate`)
4. Any positive-duration time overlap — **BLOCK** (`same_task_time_overlap`)
5. Both Tasks untimed — **BLOCK** (`same_task_time_required`)
6. One timed and one untimed — **BLOCK** (`same_task_time_required`)

Different Task titles may overlap and remain allowed. Task/Leave conflict rules are
unchanged.

---

## 2. Repository safety (STEP 1)

Branch `main`, HEAD `d6c01b4`, `git status --short` showed only the reported partial
implementation (`backend/routers/member_schedules.py`, `web-view/js/calendar/instance.js`,
`web-view/js/ui/error-mapper.js` modified; `backend/tests/test_same_task_timed_untimed_rule.py`
untracked) before this pass began. Nothing staged. Protected path
`member-aios/mayurika-hr/staff-data/` confirmed untouched (empty `git status --short` against
that path) before and after this pass.

---

## 3. Verified gap in the prior implementation (STEP 2)

Direct inspection and execution proved the prior helpers (`_is_timed_occurrence`,
`_find_same_task_time_conflict`, `_bulk_within_batch_time_conflicts`,
`_bulk_existing_task_time_conflict_errors`) caught **only** a timed-vs-untimed status
mismatch:

| Scenario | Prior behavior |
|---|---|
| Mixed timed/untimed (same title/date) | **Caught** — 409 `same_task_time_required` |
| Exact timed duplicate (same title/date/start/end) | **Not hard-blocked** — both occurrences are timed, so the prior check's `_is_timed_occurrence(existing) != candidate_is_timed` comparison is `True == True` → no conflict reported |
| Timed overlap (e.g. 09:00-10:00 vs 09:30-10:30) | **Not caught** — same reason; both timed, "differs" check never fires |
| Both-untimed duplicate (same title/date, no times either side) | **Not caught** — both untimed, `False == False` → no conflict reported |
| Adjacent (09:00-10:00 / 10:00-11:00) | Correctly allowed (unaffected) |
| Distinct (09:00-10:00 / 14:00-15:00) | Correctly allowed (unaffected) |

Confirmed by directly re-running the prior implementation's own test file (now replaced) —
before this fix, its own `test_two_untimed_same_title_date_no_conflict` asserted **no
conflict** for two untimed same-title/date rows, proving the both-untimed gap existed by
the prior implementation's own test suite, not just by inspection.

**Existing soft duplicate-warning system** (`_bulk_duplicate_key` /
`_find_batch_duplicate_warnings` / `_find_existing_task_duplicate_warnings`, Bulk Tasks
only): confirmed it **does allow creation after a warning** — `confirm_duplicates=True`
resubmission previously created rows the warning had just flagged, including *true exact
duplicates*. This is exactly the "soft, overridable" behavior STEP 9 forbids for the
same-title/date/time domain. Single Task creation and Task editing had **no duplicate
detection of any kind** prior to this feature — an exact duplicate submitted via the single
form was previously accepted outright.

---

## 4. Shared backend-authoritative classifier (STEP 3)

`backend/routers/member_schedules.py` — one classifier owns Single Task creation, Task
editing, and both Bulk Tasks checks:

- **Result model** (plain string constants, matching this file's existing plain-string
  convention, e.g. Task `category` values): `SAME_TASK_CONFLICT_NONE`,
  `SAME_TASK_CONFLICT_EXACT_DUPLICATE`, `SAME_TASK_CONFLICT_TIME_OVERLAP`,
  `SAME_TASK_CONFLICT_BOTH_UNTIMED`, `SAME_TASK_CONFLICT_TIMED_VS_UNTIMED`.
- **`_classify_time_pair(candidate_start, candidate_end, existing_start, existing_end)`** —
  pure, DB-free, classifies ONE candidate-vs-existing time pair.
- **`SameTaskOccurrence`** — a small uniform shape (`key`, `event_date`, `title`, `start`,
  `end`) the classifier compares against, deliberately independent of both the
  `MemberScheduleEvent` ORM model and the `BulkTaskRowIn` Pydantic model's own attribute
  names (`start_time`/`end_time` vs `start`/`end`, `event_date` vs `date`). Each call site
  adapts its own data into this shape once; the classifier itself never touches a database
  session or either model directly.
- **`classify_same_task_conflict(candidate_date, candidate_title, candidate_start,
  candidate_end, existing_occurrences, exclude_key=None)`** — THE single shared function
  (STEP 3's exact required signature, with `exclude_event_id` generalized to `exclude_key`
  so the same function serves Bulk Tasks' in-memory row_number self-exclusion as well as a
  real database UUID — documented here as a deliberate generalization, not a second
  formula). Returns `(classification, conflicting_occurrence_or_None)`.

Three call sites, one function each:
- `create_member_schedule_event` — `_active_same_date_occurrences(db, member_key, payload.date)`.
- `update_member_schedule_event` — same adapter, `exclude_key=event.id`.
- `create_member_schedule_events_bulk` — `_bulk_within_batch_time_conflicts` (adapts
  submitted rows into `SameTaskOccurrence` with `key=row_number`) and
  `_bulk_existing_task_time_conflict_errors` (reuses `_active_same_date_occurrences`, one
  query per row's date).

No separate business-rule implementation exists for create, Bulk, or edit — all three call
`classify_same_task_conflict`/`_classify_time_pair`.

---

## 5. Title normalization ownership

`_normalize_title_for_duplicate` (trim + casefold) — pre-existing, unmodified, and reused
by every classifier call site so "the same title" never means two different things across
the same-task rule and the pre-existing soft duplicate-warning system.

---

## 6. Half-open interval formula (STEP 4)

```
overlap exists when: candidate_start < existing_end AND existing_start < candidate_end
```

Checked only after confirming both occurrences are timed and NOT an exact match (exact
duplicate is checked first, per STEP 4's explicit ordering requirement, since an identical
pair also satisfies the overlap formula — checking exact first ensures the correct, more
specific code is returned). Verified directly:

| Candidate | Existing | Result |
|---|---|---|
| 09:00–10:00 | 10:00–11:00 | `none` (adjacent) |
| 10:00–11:00 | 09:00–10:00 | `none` (adjacent, reversed) |
| 09:00–10:00 | 09:00–10:00 | `exact_duplicate` |
| 09:30–10:30 | 09:00–10:00 | `time_overlap` (partial) |
| 10:00–11:00 | 09:00–12:00 | `time_overlap` (candidate contained) |
| 09:00–12:00 | 10:00–11:00 | `time_overlap` (candidate contains existing) |

All 6 confirmed by direct execution (`_classify_time_pair`, ad hoc script) before the full
test suite was written. Partial/invalid time-field validation is unchanged — this rule only
classifies values that already passed the existing `end_after_start` schema validators
(`MemberScheduleEventCreate`/`Update`) and `_bulk_row_field_errors`' equivalent per-row check.

---

## 7. Error codes (STEP 5)

| Classification | Code | Title (frontend) | Message |
|---|---|---|---|
| Exact duplicate | `exact_task_duplicate` | Duplicate task | This task already exists at the same date and time. |
| Time overlap | `same_task_time_overlap` | Task time overlaps | This task already has another time period that overlaps the selected time. |
| Both untimed / timed-vs-untimed | `same_task_time_required` | Task time required | This task already exists on the selected date. Add separate non-overlapping times to create another occurrence. |

No raw database error, internal row ID, or stack trace is ever exposed — `same_task_conflict_response_body(classification)` returns only `{"error": code, "message": message}`, the same shape `leave_conflict_response_body` already uses.

---

## 8. Single / Bulk / Edit results (STEPS 6-8)

All results below are from direct execution against a real, ephemeral in-memory SQLite
database (`backend/tests/test_same_task_multiple_time_period_rule.py`), not inference.

- **Single create**: distinct/adjacent allowed; exact duplicate, overlap, both-untimed, and
  timed-vs-untimed all return 409 with the correct code; different-title overlap allowed;
  rejected creates perform no write (row count unchanged). Task/Leave Leave-conflict check
  is unaffected — still runs, still returns `leave_conflict` when applicable, and is checked
  independently of (not replaced by) the same-task check.
- **Bulk Tasks**: within-batch and against-existing-database checks both use the same
  classifier; a single conflicting pair anywhere in the batch blocks the entire request
  (`validation_failed`, `created_count: 0`); zero rows are ever partially inserted (proven —
  §9 below); valid same-title non-overlapping/adjacent occurrences are accepted; different
  titles may overlap.
- **Edit**: evaluated against the resulting post-edit `(date, title, start, end)`, excluding
  the edited Task's own row via `exclude_key=event.id`; blocks against another active Task
  exactly like create; a no-op-ish edit (e.g. notes-only) that doesn't actually change
  timed/untimed status is never blocked by comparing the task to itself; the pre-existing
  `outcome_recorded_immutable` date-change lock (Rule 8, 2026-07-24) is untouched — it is
  checked before the same-task classifier runs, exactly as before this feature existed.

---

## 9. Atomicity and no-write proof

- Bulk: `test_30_atomic_rollback_proven` — a batch of one valid row + two conflicting rows
  inserts **zero** rows (the whole request is rejected before any `db.add`/`commit` is
  reached; hard errors are collected and returned before the atomic-insert block runs at
  all — there is no partial-then-rollback step because nothing is ever staged).
- Single create: `test_20_rejected_create_causes_no_write` — row count unchanged after a
  rejected create.
- Edit: `test_38_rejected_edit_causes_no_update` — the edited row's `start_time`/`end_time`
  are reloaded from the database after a rejected edit and confirmed unchanged (proving no
  partial `UPDATE` reached the row).

---

## 10. Soft duplicate-warning compatibility (STEP 9)

**Required ordering — confirmed as already the case, and preserved:**
1. Hard same-Task conflict validation (`classify_same_task_conflict`, wired ahead of the
   soft-warning computation in `create_member_schedule_events_bulk`).
2. Soft duplicate-warning computation (`_find_batch_duplicate_warnings`/
   `_find_existing_task_duplicate_warnings`) — only reached once step 1 produces zero
   errors.
3. Write only after both gates pass.

**Analysis of remaining soft-warning reach:** the soft duplicate key is
`(date, normalized_title, normalized_start, normalized_end)` — exactly the same
(date, title, timed-status, exact-time) domain the new hard classifier now fully covers:
an exact match is `exact_duplicate` or `both_untimed` (both hard-blocked); anything the
soft key would NOT match (different start/end) is, by construction, either `time_overlap`
(also hard-blocked) or `none` (allowed, and the soft key wouldn't match it either). **No
scenario remains where the soft-warning path can independently permit, or even see, an
exact title/date/time match** — it is now structurally unreachable for that domain, though
the functions themselves are left unmodified and still wired (harmless — they only ever run
after the hard gate, and can only ever return an empty warning list for rows that already
passed it). This was confirmed by updating and re-running every existing test in
`backend/tests/test_bulk_task_creation.py::DuplicateWarningTests` (5 tests) plus one in
`MemberIsolationTests` that previously asserted the old soft-warning (409) behavior for
exact-match scenarios — all now correctly assert the new hard-block (422) behavior instead,
including `test_confirm_duplicates_true_does_not_override_hard_block`, which explicitly
proves `confirm_duplicates=True` can no longer create a true duplicate. **Exact same
title/date/time is no longer warning-only anywhere in this codebase.**

---

## 11. Regressions (STEP 12)

| Suite | Result |
|---|---|
| `test_same_task_multiple_time_period_rule.py` (new, replaces `test_same_task_timed_untimed_rule.py`) | 48/48 pass |
| `test_bulk_task_creation.py` (5 tests updated for the new hard-block behavior, rest unchanged) | 36/36 pass |
| `test_task_leave_overlap.py` | 15/15 pass |
| `test_member_leave.py` | pass (part of full suite) |
| `test_schedule_classification.py` | pass |
| `test_task_outcome.py` + `test_task_outcome_endpoint.py` | pass |
| `test_schedule_duration_reports.py` (Schedule Summary) | pass |
| `test_weekly_schedule_xlsx_export.py` + `test_weekly_schedule_export_endpoint.py` | pass |
| **Full backend suite** (`python -m unittest discover -s backend/tests`) | **357/357 pass** |
| `node --check` on `web-view/js/calendar/instance.js`, `web-view/js/ui/error-mapper.js` | clean |
| Frontend error-mapper direct test (Node, no jsdom needed — leaf module) | all 3 new/updated codes (`exact_task_duplicate`, `same_task_time_overlap`, `same_task_time_required`) map to the exact required title/message |

No test file for Task/Leave overlap, classification, Task Outcome, or Schedule Summary was
modified — only `test_bulk_task_creation.py`'s same-title/date/time duplicate scenarios
were updated, because those specific scenarios' *expected* behavior intentionally changed
by design (soft warning → hard block), not because of a regression.

---

## 12. Database impact (STEP 13)

```
git diff -- database/             → (empty)
git diff -- database/migrations/  → (empty)
```

**Database changes: NONE. Migration changes: NONE.** This entire rule is enforced in
application logic (the shared classifier queries existing rows and compares them in
Python) — a plain unique database constraint cannot express general interval-overlap
detection, and none was added, per this task's explicit instruction not to create a
migration without separate approval.

---

## 13. Reviewer

Per CLAUDE.md §18: Calendar/Task tooling, not an HR/KPI/recruitment/admin-authority domain
change — no specific Management Team reviewer is mandated. Standard code review applies.

---

## 14. PASS / AMBER / FAIL (implementation pass, 2026-07-27)

**PASS.** All 15 PASS conditions from the governing prompt are met by direct execution
evidence: separate/adjacent periods allowed; exact duplicate, every timed overlap, both-
untimed, and timed-vs-untimed all hard-blocked with the correct code; different titles may
overlap; one shared classifier owns all three write paths; Bulk remains atomic with no
partial insertion; rejected actions perform no write; clear, distinct frontend messages
exist for all three conflict types; Task/Leave, classification, outcome, summary, and XLSX
behavior all confirmed unchanged (357/357 backend tests); evidence and handover files exist;
database/migration files unchanged; protected path untouched.

---

## 15. One next step (superseded — see §16.5)

~~None required to close this feature. Optional, non-blocking: a maintainer with browser
access could do a live click-through of the three new toast messages...~~ — this was
completed at the release stage; see §16 below for the full release/deployment record.

---

## 16. Release, deployment, and live verification (2026-07-27, same day, release pass)

### 16.1 Implementation commit and push

Committed as `de015fc` ("Enforce same-task time conflict rules") — 7 files: the 5 approved
implementation files, the new test file, and the two evidence files (this validation file's
implementation-pass content, and the handover doc). Pushed to `origin/main`:
`d6c01b4..de015fc  main -> main`. Local HEAD and `origin/main` confirmed matching (`de015fc`)
immediately after push.

Note on the obsolete test file: `backend/tests/test_same_task_timed_untimed_rule.py` was
never committed to git history in the first place (created and removed within the same
prior, uncommitted working session) — confirmed via `git log --all -- <path>` returning
nothing. `git add -u -- <path>` correctly reported "did not match any files" (a no-op, not
an error) since there is no tracked deletion to stage; its absence from both disk and git
history already reflects the intended end state. This commit therefore does not show a "D"
(deleted) line for that path — there was never a tracked version to delete.

### 16.2 Backend deployment (read-only verification only)

Per `backend/README.md` §"Deploy to Vercel": both the frontend (`management-aios`) and
backend (`management-aios-api`) Vercel projects deploy automatically via their GitHub
integration on every push to `main` — not via a `vercel` CLI command run from this
workstation (none is configured here, and none was used).

Read-only checks performed against `https://management-aios-api.vercel.app`:

| Check | Result |
|---|---|
| `GET /health` | `200 {"status":"ok","service":"management-aios-member-schedules"}` |
| `GET /api/member-schedules/paraparan?start_date=...&end_date=...` (Task list) | `200`, real records returned — endpoint readable |
| `GET /api/member-schedules/paraparan/reports/weekly?week_start=2026-07-27` | `200`, well-formed Schedule Summary JSON |
| `GET /api/member-schedules/paraparan/reports/weekly/export?week_start=2026-07-27` | `200`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `GET /openapi.json` — route inventory | All expected `member-schedules` routes present (`GET`/`POST` list+create, `POST` bulk, `PUT`/`DELETE` by id, `PUT` outcome, `DELETE` clear-testing-data, `GET` daily/monthly/weekly reports, `GET` weekly export) — none missing |

**No production Task was created, updated, or deleted during this check** — every call
above is a `GET` against pre-existing, real (not newly created) data. No database migration
was requested or performed. There is no backend "deployed commit" metadata endpoint in this
service, so the exact deployed commit hash cannot be read directly from the API; see §16.4
for how this was corroborated instead.

### 16.3 Frontend deployment (read-only verification only)

Fetched the live, deployed JavaScript directly from `https://management-aios.vercel.app`:

- `js/ui/error-mapper.js` — confirmed contains all three codes (`exact_task_duplicate`,
  `same_task_time_overlap`, `same_task_time_required`) with the exact required
  titles/messages, verbatim.
- `js/calendar/instance.js` — confirmed `apiRequest`'s raw-body recognition list contains
  all three codes (matching the local implementation's diff exactly, including the updated
  comment block referencing the FINAL AUTHORITATIVE rule).

### 16.4 Deployed-commit corroboration

No version/commit metadata endpoint exists on either service, so the deployed commit cannot
be read directly. Corroboration instead: `exact_task_duplicate` and `same_task_time_overlap`
do not appear in any commit before `de015fc` (confirmed — these two codes/messages were
introduced by this commit alone, not by `27db966` or `d6c01b4`), and both were found,
verbatim, in the live-fetched frontend assets immediately after the push completed. This is
strong, direct (not inferred) evidence that the frontend is serving `de015fc`. The backend
and frontend share one GitHub-triggered auto-deploy event per push (§16.2) — the backend is
inferred, not independently confirmed byte-for-byte, to be on the same commit; no backend
code path exists to observe this via a read-only call, since the new rule only manifests on
a write request.

### 16.5 Live interactive write validation — AMBER (not performed)

No browser automation tool is available in this session (confirmed again, consistent with
every prior 2026-07 validation note in this repo), and no user-approved safe testing
member/date or explicit approval for a production write attempt was provided in this task.
Per this task's own explicit instruction ("If safe production testing data or approval is
unavailable: do not perform live writes... record interactive write validation as AMBER
pending owner-run safe test; do not claim full live PASS"), the six interactive scenarios
(A-F: separate/adjacent/exact-duplicate/overlap/both-untimed/timed-vs-untimed), form-value
preservation, no-false-success-toast, no-optimistic-Calendar-insertion, different-titles-
overlap, and Bulk row-error readability were **not exercised against the live production
UI**. This is recorded honestly as a limitation, not fabricated as evidence.

### 16.6 Evidence-only closure commit

A second, evidence-only commit follows this content (`git commit -m "Close same-task time
conflict validation"`) — see the handover document §8 for its hash, since this file cannot
reference its own future commit.

### 16.7 Final release status

```text
Implementation status (2026-07-27, implementation pass):  PASS
Committed and pushed:                                     YES (de015fc)
Backend deployment (read-only verification):              PASS
Frontend deployment (read-only verification):              PASS
Live interactive write validation:                        AMBER — not performed, no
                                                            browser tool / no approved
                                                            safe test data this session
Overall release status:                                   AMBER
```

**Overall (superseded by §18): AMBER at the release-pass stage.** The implementation itself
was PASS (§14) and both deployments were verified live via direct, non-destructive checks
(§16.2-§16.4). The release-pass status was AMBER only because live interactive write
validation had not yet been performed. See §18 for the completed live-write validation and
the final, current status.

---

## 17. One next step (superseded — see §18.7)

~~A maintainer with browser access and either (a) a pre-approved disposable testing
member/date, or (b) explicit sign-off... should click through the six scenarios...~~ —
completed; see §18.

---

## 18. Production live write validation (2026-07-27, same day, final validation pass)

**Operator:** builder, per this task's explicit instructions. **Method:** direct HTTPS
requests (Python `urllib`) against the live production backend
(`https://management-aios-api.vercel.app`) — the same real API the deployed frontend calls;
no browser automation tool was available, so the request/response contract itself (status
code, exact `error`/`message` body) was verified directly rather than through a rendered
toast, with the frontend's `mapApiError`/`KNOWN_ERRORS` mapping to that exact `error` code
already independently confirmed live in §16.3.

### 18.1 Approval and test scope

Explicit user approval obtained before any write (AskUserQuestion) for: member `paraparan`,
date **2026-08-17**, `source_scope=dashboard_testing` (server-forced on every create — never
client-settable), `is_official_truth=false` (server-forced). Date chosen because a read-only
check confirmed **zero** existing Tasks and **zero** Leave records for `paraparan` in the
2026-08-10 to 2026-08-20 window, and 2026-08-17 is well in the future relative to this
session (2026-07-27) — so no Task created here could ever become outcome-actionable
(outcome actions are only permitted on a Task's own current-day date), meaning none could
ever become delete-locked, guaranteeing full cleanup was possible before any write was made.

**Baseline row count** for `paraparan` on 2026-08-17: **0** (confirmed by `GET` before any
write).

### 18.2 Scenario results — all against real production, all exactly as required

| Step | Scenario | Expected | Actual |
|---|---|---|---|
| 4a | Create 09:00-10:00 | 201 | **201** |
| 4b | Create 14:00-15:00 (separate) | 201 | **201** |
| 5 | Create 10:00-11:00 (adjacent to 09:00-10:00) | 201 | **201** |
| 6 | Create 09:00-10:00 again (exact duplicate) | 409 `exact_task_duplicate` | **409**, `error='exact_task_duplicate'`, `message='This task already exists at the same date and time.'` |
| 7 | Create 09:30-10:30 (overlap) | 409 `same_task_time_overlap` | **409**, `error='same_task_time_overlap'`, `message='This task already has another time period that overlaps the selected time.'` |
| 8a | Create untimed (family B) | 201 | **201** |
| 8b | Create untimed again, same title/date | 409 `same_task_time_required` | **409**, exact message |
| 9A-a | Create timed 09:00-09:30 (family C) | 201 | **201** |
| 9A-b | Attempt untimed, same title/date (timed→untimed) | 409 `same_task_time_required` | **409**, exact message |
| 9B-a | Create untimed (family D) | 201 | **201** |
| 9B-b | Attempt timed 09:00-09:30, same title/date (untimed→timed) | 409 `same_task_time_required` | **409**, exact message |
| 10 | Different title, 09:30-10:30, overlapping family A's 09:00-10:00 | 201 (allowed) | **201** |
| 11 | Bulk: one row 11:00-11:30 + one row 11:15-11:45, same title/date (mutually overlapping) | 422, zero created | **422** `validation_failed`, both rows flagged `same_task_time_overlap`, **zero rows created** |
| 12-1 | Edit a Task to a valid separate period (16:00-16:30) | 200 | **200** |
| 12-2 | Edit that Task to an exact duplicate of another active Task (09:00-10:00) | 409 `exact_task_duplicate` | **409**, exact code/message |
| 12-3 | Edit that Task to overlap another active Task (09:15-09:45) | 409 `same_task_time_overlap` | **409**, exact code/message |
| 12-4 | Edit only `notes` (no time/date/title change) — self-exclusion check | 200 (not blocked by comparing itself) | **200** |

Every single result matched exactly — no mismatch, no unexpected status, no unexpected error
code or message text, across 18 live production requests.

### 18.3 No-write / form-preservation / duplicate-toast proof

- **Row count after all successful creates:** 7 (3 in family A + 1 each in B/C/D + 1
  different-title = 7) — matches the count of `201` responses exactly; every `409`/`422`
  response inserted nothing.
- **Rejected edit no-write proof:** after EDIT-2 (409) and EDIT-3 (409), a follow-up
  notes-only edit (EDIT-4) and a fresh `GET` both showed the row's `start`/`end` still at
  `16:00:00`/`16:30:00` — the value set by the last *successful* edit (EDIT-1) — proving
  neither rejected edit wrote through, even partially.
- **Bulk atomicity:** the 422 response's own `created_count` semantics (no `items` array,
  `validation_failed` status) combined with the post-write row count (7, not 9) confirms
  zero rows from the rejected Bulk batch were inserted.
- **Form-preservation / one-toast / no-optimistic-insert:** these are frontend DOM behaviors
  this operator could not observe without a browser (no browser automation tool available,
  same limitation as every prior pass). What WAS directly confirmed: (a) the backend never
  returns a body that could produce two contradictory toasts (every rejection returns exactly
  one `error`/`message` pair, never a partial-success + error combination), and (b) §16.3
  already confirmed live that the deployed frontend's `apiRequest`/`mapApiError` path routes
  every one of these three codes to the single generic `showToast(...)` branch (not the
  special-cased `leave_conflict` inline-status branch), which the existing, unmodified
  single-create/update `.catch` handlers never precede with `resetForm()`/`closeTaskPopup()`
  (confirmed by source reading during the implementation pass) — so a rejection cannot reach
  a code path that clears the form. This is direct evidence of the request/response contract
  plus direct evidence of the exact frontend code that consumes it, composed together; it is
  not the same as watching a rendered toast in a browser, which remains the one honestly
  unverified piece.

### 18.4 Backend behavioral confirmation

All 18 live requests above were served by the production backend at
`https://management-aios-api.vercel.app`, confirming the deployed backend enforces the exact
same rule the local test suite (357/357) already proved — this is now directly observed live
behavior, not inference from a shared GitHub push event.

### 18.5 Cleanup

All 7 created disposable Tasks were deleted via `DELETE /api/member-schedules/paraparan/{id}`
immediately after validation. All succeeded (`7 of 7`). Post-cleanup `GET` confirmed **0**
rows for `paraparan` on 2026-08-17 — back to the exact baseline. **No test residue remains.**
No Task ever had an outcome recorded (the outcome endpoint was never called), so none was
ever at risk of the delete-lock. No Leave record was created or touched. No other member or
date was written to.

### 18.6 Limitations

- No browser-rendered toast, focus state, or DOM was observed — verified instead via the
  exact request/response contract (§18.2-18.3) plus the already-live-confirmed frontend
  mapping code (§16.3) and source-level confirmation that no reset/clear call precedes the
  toast in the relevant `.catch` handlers.
- Backend deployed-commit identity is still not directly observable via a version endpoint;
  it is now corroborated by observed live behavior matching the exact implementation
  (§18.4), in addition to the frontend asset match already confirmed in §16.3-16.4.

### 18.7 Final status

```text
Implementation pass (2026-07-27):        PASS
Release pass, deployment (2026-07-27):   PASS (read-only)
Release pass, live write validation:     AMBER (not performed)
Final validation pass, live write:       PASS — 18/18 live production requests exactly as
                                          required; full cleanup verified; zero residue
Overall final status:                    PASS
```

**PASS.** All 15 PASS conditions are now met, including live production write validation
performed against a user-approved disposable test scope with full, verified cleanup.

---

## 19. One next step (final)

None required. This feature is fully closed: implemented, tested (357/357), deployed
(frontend and backend, both confirmed live), and live-write-validated in production with a
verified, residue-free cleanup.

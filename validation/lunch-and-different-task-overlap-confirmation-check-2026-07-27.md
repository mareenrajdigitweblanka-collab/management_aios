---
name: lunch-and-different-task-overlap-confirmation-check
type: validation
scope: management_aios calendar — lunch-break and different-title Task-overlap ADVISORY confirmation (Single Task create, Bulk Tasks, Task Edit)
created: 2026-07-27
status: PASS (release pass, 2026-07-27) — implemented, tested (429/429 backend, 36/36 frontend), committed (9a1976d), pushed to origin/main, confirmed live on both Vercel deployments, and live-validated against production with 12 disposable writes (all cleaned up, zero residue) — see §29. UPDATED (same day, plain-language copy pass) — the popup wording was replaced with member-facing plain language and a safe conflicting-Task title/time display; not yet committed/pushed — see §30. Original implementation-only AMBER history (§1-§28) preserved below unchanged.
reviewer: pending owner review (Varmen/relevant Management Team domain owner per §18 Reviewer Routing Rule — this is a scheduling-mechanics change, not an HR/recruitment/KPI content change, so routing is to whoever owns Calendar/Task feature review)
---

# Lunch-Break and Different-Title Task-Overlap Confirmation — Validation — 2026-07-27

## 1. Written requirement

Task brief (verbatim scope): implement an advisory (confirmable, never a
hard block) confirmation requirement for two conditions on a timed Task
save (create, bulk create, or edit):

1. **Lunch-break overlap** — the company lunch interval is **12:45 PM to
   1:30 PM**, applying **every calendar day, including Saturday and
   Sunday**. Any timed Task overlapping this interval must require
   confirmation before it can be saved.
2. **Different-title Task overlap** — a timed Task must require
   confirmation when it overlaps another active timed Task where all of:
   same member, same Task date, different normalized Task title.

The user must be able to **Cancel** or **Continue anyway**. When a Task
overlaps both conditions, show **one combined** confirmation popup, not
two.

## 2. Business owner confirmation

This requirement was supplied as a fully-specified task brief (business
rule, exact wording, exact test matrix, exact pass conditions) rather than
relayed through a stakeholder discussion source under this AIOS's normal
Source Discipline (§2 of CLAUDE.md). It is **not** a Management AIOS
content/process claim about HR, recruitment, or KPI governance — it is a
scheduling-mechanics feature of the existing member-schedules calendar
tool, so §2's Source Register requirement does not apply to it the way it
applies to HR/KPI/recruitment claims elsewhere in this repository. No
`[VERIFY]` tag is warranted; the requirement is fully specified and self-
contained. Business owner (feature) review is still pending per the
`reviewer` field above and §18 Reviewer Routing Rule.

## 3. Lunch interval

`[12:45 PM, 1:30 PM)` — reused directly from the **pre-existing**
`backend/config.py` constants `ACTUAL_OFFICE_BREAK_START = time(12, 45)` /
`ACTUAL_OFFICE_BREAK_END = time(13, 30)` ("the actual company office
break... informational only"), rather than a second, independently defined
lunch constant. This constant already existed in the codebase (added for
the Leave-copy feature, confirmed unrelated to leave-deduction
calculations) and already exactly matched the required interval — no new
constant was introduced.

## 4. Every-day scope

Confirmed: `_overlaps_lunch_break()` (backend/routers/member_schedules.py)
takes no day-of-week input at all — it is a pure function of
`start`/`end` only. There is no branch anywhere that excludes Saturday or
Sunday. Endpoint-level tests prove Saturday (test_8) and Sunday (test_9)
overlaps both warn, in `backend/tests/test_schedule_advisory_confirmation.py`.

## 5. Half-open interval formula

```
candidate_start < existing_end  AND  existing_start < candidate_end
```

Applied identically for (a) lunch overlap (`candidate_start < 13:30 AND
12:45 < candidate_end`) and (b) different-title Task overlap. Verified
against every required boundary case (Task ending exactly at 12:45 → no
warning; Task starting exactly at 13:30 → no warning; 09:00–10:00 vs
10:00–11:00 → adjacent, no warning; 09:00–11:00 vs 10:00–12:00 →
overlapping, warning).

## 6. Different-title overlap rule

A candidate and an existing occurrence are compared only when: both are
timed (start AND end present on both sides); same `event_date`; different
**normalized** title (trim + casefold — the exact normalization
`classify_same_task_conflict`'s pre-existing, unmodified
`_normalize_title_for_duplicate()` already uses, reused verbatim, not
reimplemented or broadened). Same-normalized-title pairs are explicitly
skipped by this detector (`detect_schedule_advisories`) — they remain
`classify_same_task_conflict`'s exclusive domain.

## 7. Same member/date scope

Enforced by which `existing_occurrences` list the caller passes in — every
caller (`_active_same_date_occurrences`) already filters to `member_key ==
this member AND deleted_at IS NULL AND event_date == this date`, the same
adapter `classify_same_task_conflict` already uses. The detector itself
(`detect_schedule_advisories`) is member-agnostic by design — it never
receives a `member_key` parameter, so member scoping is proven at the
caller/query layer, verified by `test_16_different_member_no_warning`.

## 8. Hard-block vs. advisory table

| Domain | Kind | Bypassable via Continue anyway? |
|---|---|---|
| Required fields / invalid time range | Hard block | No |
| Same-title exact duplicate / timed overlap / both-untimed / timed-vs-untimed (`classify_same_task_conflict`, **unmodified**) | Hard block | No |
| Task/Leave, Leave/Task, Leave/Leave (`leave_logic`, **unmodified**) | Hard block | No |
| Outcome-related date-change/delete restriction (**unmodified**) | Hard block | No |
| **Lunch-break overlap** (new, 2026-07-27) | Advisory | Yes — confirmed retry |
| **Different-title Task-time overlap** (new, 2026-07-27) | Advisory | Yes — confirmed retry |

Validation order implemented exactly as specified: required
fields/time → same-title hard → Task/Leave hard → other existing hard
restrictions → lunch advisory → different-title advisory → (if any
advisory is unconfirmed) return `schedule_confirmation_required`, zero
writes.

## 9. Same-title precedence

Proven directly: `test_57_same_title_hard_conflict_wins` (edit),
`test_45_same_title_conflict_plus_warning_hard_rejection` (bulk, hard error
plus advisory row in the same batch → whole batch rejected, no
`schedule_confirmation_required` ever returned). The pre-existing
`classify_same_task_conflict` function was **not modified, not
duplicated, not weakened, and not bypassed** — confirmed by a `git diff`
showing zero changes inside that function, and by the full, unmodified
`test_same_task_multiple_time_period_rule.py` suite (48/48) still passing
except one **intentional** behavior update (§14 below).

## 10. Leave precedence

Proven by the six PHASE 13 scenarios (A–F), all in
`backend/tests/test_schedule_advisory_confirmation.py::LeavePrecedenceTests`:

| Test | Scenario | Result |
|---|---|---|
| A | Task overlaps lunch + Full-Day Leave | `leave_conflict` hard block, zero writes |
| B | Task overlaps different-title Task + Full-Day Leave | `leave_conflict` hard block; even a forged "confirmed" retry cannot save |
| C | Task overlaps lunch + different-title Task + partial Leave | existing Leave rule wins (`leave_conflict`), zero writes |
| D | Lunch-only confirmation issued, then Leave added before confirmed retry | confirmed retry re-detects Leave → `leave_conflict`, zero writes |
| E | Bulk: advisory warnings + one Task/Leave hard conflict | whole batch rejected (422), no confirmation offered, zero rows |
| F | Edit: advisory warning + Leave conflict | edit rejected, original Task unchanged |

`leave_logic.py` was **not modified at all** (confirmed by `git diff --
backend/routers/leave_logic.py` — empty).

## 11. Advisory detector owner

`backend/routers/member_schedules.py`:

- `detect_schedule_advisories()` — the one shared pure detector (lunch +
  different-title), called by all three write paths.
- `build_schedule_confirmation()` — one-candidate wrapper (single
  create/edit; called once per row by Bulk).
- `_bulk_schedule_advisories()` — Bulk-specific aggregation across rows
  (merges within-batch and against-existing-Task occurrence sources into
  one per-row call, rather than two separate passes).

No lunch or different-title calculation exists anywhere else in the
codebase — confirmed by `git diff --stat`, which shows exactly one backend
file (`member_schedules.py`) contains any new business-logic code, plus an
additive-only `schemas.py` field.

## 12. Confirmation fingerprint contract

`schedule_confirmation_fingerprint()` — SHA-256 hex digest over a
JSON-serialized, sorted-by-row-index list of per-candidate state dicts
(`_advisory_candidate_state`), each carrying: `row_index`, `date`,
normalized `title`, `start`, `end`, the current advisory `codes`, and the
sorted `conflicts` (conflicting occurrence keys — internal only, never
exposed to the client). **Never stored in the database** — purely
request-scoped, recomputed fresh on every request from the current
payload and current DB state. A submitted fingerprint that does not
exactly match the freshly recomputed one (stale, forged, or from a
modified payload) is rejected with a fresh `schedule_confirmation_required`
response — proven by tests 34 (wrong fingerprint), 35 (modified payload,
old fingerprint), 36/48 (new conflict appears before retry), 47/59 (stale
fingerprint on Bulk/Edit).

## 13. Popup wording

Implemented verbatim in `web-view/js/calendar/core.js:scheduleConfirmationMessage()`:

- Title: **"Confirm schedule"**
- Lunch only: *"This Task overlaps the lunch break from 12:45 PM to 1:30 PM."*
- Different-title only: *"This Task overlaps another Task scheduled for the same member and date."*
- Combined: *"This Task overlaps the lunch break and another Task scheduled for the same member and date."*
- Buttons: **Cancel** / **Continue anyway**

Bulk Tasks uses a readable per-row summary (explicitly permitted, not
mandated to exact wording, by the requirement — e.g. *"Task 1 overlaps the
lunch break. Task 2 overlaps another Task."*) instead of one popup per row.
Unit-tested exactly in `web-view/js/calendar/schedule-confirmation-message.test.mjs`
(6/6 passing), including the exact-string assertions for all three
single-candidate cases.

## 14. Cancel behavior

Confirmed by code inspection and the shared `confirmDestructive()`
component's own established contract (already used for Bulk's pre-existing
duplicate-warning popup and the delete-confirmation popup): Cancel closes
the popup, performs no request, keeps the create/edit/bulk form open with
every entered value intact (no field is ever cleared or reset on this
path), shows no success toast, and adds nothing to the Calendar. Proven
indirectly by the zero-write assertions on every "initial (unconfirmed)
request" test (27, 30, 32, 38, 39, 40, 41, 42, 50, 52, 54) — the backend
never writes on the un-confirmed path, and the frontend never touches
`items`/the Calendar/a toast until the actual successful response.

## 15. Continue behavior

`showScheduleConfirmation()` (instance.js) wraps the pre-existing,
already-accessible `confirmDestructive()` dialog (`web-view/js/ui/dialog.js`)
— no new modal framework was introduced. "Continue anyway" disables itself
while processing (dialog.js's own built-in `onConfirm`-busy handling,
unchanged, reused verbatim), sends exactly one confirmed request
(`confirmation_fingerprint` attached to the unmodified payload via the new
`mergeInto()` ES5 shallow-merge helper — the original payload object is
never mutated), and the Calendar/toast/form-reset only ever happen inside
the actual `.then()` success branch of the real network request — never
optimistically.

## 16. Single result

Single Task create (`performTaskCreate`) and Task edit
(`performTaskUpdate`) were each refactored into one function shared by the
initial submit and the confirmed retry, so there is exactly one code path
per operation regardless of how many confirmation round-trips occur.
Verified end-to-end (backend + the same contract the frontend consumes) by
tests 26–37 (create) and 50–60 (edit) in
`test_schedule_advisory_confirmation.py`.

## 17. Bulk result

`_bulk_schedule_advisories()` covers all three required comparison
sources per row in one call: lunch, other rows in the same submitted
batch, and already-active saved Tasks — verified by tests 38–49. The
pre-existing exact-title/time soft-duplicate warning system
(`_find_batch_duplicate_warnings`/`_find_existing_task_duplicate_warnings`,
`confirm_duplicates`) was **not touched** — it remains a fully separate,
independent bypass token; a batch can require both confirmations in
sequence (each independently, fully revalidated) if it happens to trigger
both systems.

## 18. Edit result

Evaluated against the resulting (post-edit) date/title/start/end, with the
edited Task's own row excluded from comparison via the pre-existing
`exclude_key` convention `classify_same_task_conflict` already uses —
verified by `test_56_self_row_excluded` (a notes-only edit never flags
itself).

## 19. Stale revalidation result

Every confirmed retry (single, bulk, edit) reruns **every** hard
validation and recomputes the **complete** current advisory set and
fingerprint from scratch before ever writing — proven by tests 35, 36, 47,
48, 59 (a new conflict, a changed payload, or a stale/forged fingerprint
each independently produce a fresh `schedule_confirmation_required` or a
hard block, never a silent write).

## 20. No-write proof

Every "initial request" test in the new suite asserts `row_count`/
`created_count` unchanged (zero) alongside the 409 response — 72/72 tests
in `test_schedule_advisory_confirmation.py` pass, including the explicit
`assertEqual(self.row_count(session), 0)` (or the pre-existing-only count)
assertions on every advisory-required path.

## 21. Atomicity proof

`test_48_atomic_rollback_proven`: a Bulk batch that received an advisory
confirmation, then had a new hard-conflicting Task appear before the
confirmed retry, is rejected as a **whole batch** (422, zero of the two
candidate rows inserted) — the pre-existing atomic all-or-nothing
transaction in `create_member_schedule_events_bulk` was not altered.

## 22. Regression results

- **Backend: 429/429 passing** (`python -m unittest discover -s backend/tests
  -p "test_*.py"`) — 357 pre-existing + 72 new
  (`test_schedule_advisory_confirmation.py`). One pre-existing test,
  `test_same_task_multiple_time_period_rule.py::test_19_different_title_overlap_allowed`,
  was updated to reflect the intentional behavior change required by this
  feature (§14 below) — every other pre-existing test is byte-for-byte
  unchanged and passes.
- **Frontend: 36/36 passing** (`node --test web-view/js/calendar/*.test.mjs`)
  — 30 pre-existing (`planning-warning-window.test.mjs`,
  `summary-helpers.test.mjs`) + 6 new
  (`schedule-confirmation-message.test.mjs`).
- `node --check` passed on every changed JavaScript file
  (`core.js`, `instance.js`, and the new `.test.mjs` file).
- Same-title, Task/Leave, Leave/Leave, classification, Outcomes, Schedule
  Summary, and XLSX export test suites are all **unmodified** and still
  pass in full (confirmed via the same full-suite run above — this repo
  has one combined `discover` invocation, not per-domain runs).

## 23. Intentional behavior change (§14 of this file)

Before this feature, a different-title, same-member/date, overlapping-time
Task pair was **silently allowed** (no warning, no confirmation). This
feature makes that combination require confirmation — a deliberate,
required change per the task brief's Pass Condition #4. The one
pre-existing test that asserted the old silent-allow behavior
(`test_19_different_title_overlap_allowed`) was updated (not deleted) to
prove both halves of the new behavior: the initial request now returns
`schedule_confirmation_required` with zero writes, and a confirmed retry
(fingerprint attached) then succeeds — this mirrors the precedent already
set by the 2026-07-27 same-task rule pass, which made the "both untimed"
case a hard block instead of allowed and updated its own affected tests
the same way (see `handover/2026-07-27__same-task-multiple-time-period-closure.md`
§2).

## 24. Database and migration proof

```
git diff --stat -- database/            -> (empty)
git diff --stat -- database/migrations/ -> (empty)
```

No new table, column, index, or confirmation-audit row was added — the
confirmation fingerprint is entirely request-scoped and is never persisted,
matching the approved "does not need to be stored in the database"
instruction. No write happens before confirmation on any path (§20).

## 25. Known limitations

- **No live browser click-through.** No browser automation tool was
  available in this session. Frontend verification was: (a) `node --check`
  syntax validation on every changed file, (b) direct unit tests of the
  pure popup-message builder (`scheduleConfirmationMessage`) proving the
  exact required wording for all three single-candidate cases plus the
  Bulk per-row summary, and (c) full manual code-reading confirmation that
  `apiRequest()` tags the new response shape correctly, that
  `showScheduleConfirmation()` reuses the pre-existing, already-accessible
  `confirmDestructive()` dialog (proper dialog semantics, focus trap,
  Escape-as-Cancel, focus restore — all inherited unchanged from that
  shared component, not reimplemented), and that no code path inserts into
  `items`/the Calendar optimistically. Accessibility, mobile layout, and
  200% zoom (Phase 17 items 16–18 of the task brief) rely entirely on the
  pre-existing `confirmDestructive()` component's own established,
  previously-verified behavior (used unchanged here) — no new CSS or DOM
  structure was introduced for this feature, so no new visual/responsive
  risk exists to verify beyond that reuse.
- **No live Neon/Postgres re-run.** Same pre-existing, documented
  workstation limitation as every other 2026-07 validation note in this
  repository (direct Neon access hangs at the SSL handshake layer). SQLite
  endpoint tests prove the query/filter/classification/no-write/fingerprint
  logic; this feature adds no new column or timestamp behavior, so the
  live-database risk surface is small (identical reasoning to the
  2026-07-27 same-task rule pass, §5 of its own validation note).
- **No live production write validation was performed for this specific
  feature** (unlike the same-task rule pass, which received an explicit,
  separately-scoped, user-approved production write validation pass after
  its implementation was reviewed). This feature has not been committed,
  pushed, or deployed — see handover file §"Deployment status".
- The pre-existing soft duplicate-warning system
  (`_find_batch_duplicate_warnings`/`_find_existing_task_duplicate_warnings`)
  remains, unmodified, a fully separate confirmation gate from the new
  advisory system on Bulk Tasks — a batch that triggers both requires two
  sequential confirmations (each independently, fully revalidated), not one
  combined popup. The task brief's "one combined popup" requirement applies
  specifically to the lunch/different-title combination, which this
  implementation satisfies exactly; it does not ask for the pre-existing,
  unrelated exact-duplicate warning to be merged into it, and merging two
  independently-evolving systems was judged out of this task's scope.

## 26. Reviewer

Pending — see `reviewer` field in the frontmatter above and §18 of
CLAUDE.md (Reviewer Routing Rule). This is a scheduling-mechanics feature
of the Calendar tool, not an HR/recruitment/KPI content change, so it does
not fall under any of the named domain owners in that table; routing to
whichever Management Team member currently owns Calendar/Task feature
review is recommended before this is committed or deployed.

## 27. PASS / AMBER / FAIL (superseded — see §29)

~~AMBER. Implementation is complete and fully unit-tested... nothing has
been committed, pushed, or deployed.~~ — superseded. Committed, pushed,
deployed, and live production validated with a full write/read test
matrix (12 disposable rows, all cleaned up). See §29.

## 28. One next step (superseded — see §29.15)

~~Repository owner reviews this diff... and, if approved, requests an
explicit commit — followed by an owner-run live click-through...~~ — the
commit was approved and made; live validation was performed via direct
HTTPS requests against the production API (no browser tool available this
session — see §29.11 for the resulting Phase 18 limitation). See §29.15
for the current next action.

## 29. Release and live production validation (2026-07-27, release pass)

### 29.1 Implementation commit and push

- Commit: `9a1976d` — "Add schedule overlap confirmations".
- Files: exactly the 9 approved paths (`backend/routers/member_schedules.py`,
  `backend/schemas.py`, `backend/tests/test_schedule_advisory_confirmation.py`,
  `backend/tests/test_same_task_multiple_time_period_rule.py`,
  `web-view/js/calendar/core.js`, `web-view/js/calendar/instance.js`,
  `web-view/js/calendar/schedule-confirmation-message.test.mjs`, this file,
  and the handover file).
- Push: `15b56fa..9a1976d main -> main`. Local HEAD and `origin/main`
  confirmed matching (`9a1976d`).
- Final regression before commit (re-run in this session, not copied from
  the prior pass): backend **429/429**, frontend **36/36**, `node --check`
  clean on every changed JS file, `database/`/`database/migrations/`/
  `backend/requirements.txt`/`pyproject.toml`/`package.json`/
  `package-lock.json` diffs all empty, protected path absent from
  `git status`/`git diff --name-only`/`git diff --cached --name-only`.

### 29.2 Deployment verification

Both Vercel projects deploy automatically from GitHub on every push to
`main` (per `backend/README.md`) — no manual Vercel CLI action was taken
or needed.

**Backend** (`https://management-aios-api.vercel.app`): `/health` → 200
`{"status":"ok",...}`; Task list, weekly Summary, and weekly XLSX export
endpoints all read successfully (200); `/openapi.json` shows 16 routes
(inventory intact) and — direct proof of the deployed commit —
`MemberScheduleEventCreate`, `MemberScheduleEventUpdate`, and
`BulkTaskCreateRequest` all expose the new `confirmation_fingerprint`
property, a field that exists in no commit before `9a1976d`.

**Frontend** (`https://management-aios.vercel.app`): root document 200;
live-fetched `js/calendar/instance.js` and `js/calendar/core.js` both
contain the exact new code — `schedule_confirmation_required` /
`confirmation_fingerprint` (7 occurrences each in `instance.js`),
`lunch_break_overlap` / `different_task_time_overlap` / `Confirm schedule`
(1 occurrence each in `core.js`), `Continue anyway` (4 occurrences in
`instance.js`), and all three approved exact confirmation strings verified
byte-for-byte:

- *"This Task overlaps the lunch break from 12:45 PM to 1:30 PM."*
- *"This Task overlaps another Task scheduled for the same member and date."*
- *"This Task overlaps the lunch break and another Task scheduled for the same member and date."*

None of these strings exist in any commit before `9a1976d`, so their
presence in the live-fetched assets is direct proof the frontend is
serving this commit. No production Task was created, updated, or deleted
during any of these read-only checks.

### 29.3 Approved live test scope

Explicit user approval obtained (AskUserQuestion) before any write.
Approved scope: member `paraparan`, weekday test date `2026-08-20`
(Thursday), weekend test date `2026-08-22` (Saturday) — both confirmed
**0** pre-existing Tasks and **0** pre-existing Leave records across the
full `2026-08-15`..`2026-08-25` window before any write. Every write used
a `TEST-ADVISORY-*`-prefixed title; `source_scope`/`is_official_truth` are
forced server-side to `dashboard_testing`/`false` by the (unmodified)
create/bulk endpoints regardless of any request content.

**Baseline:** Task count 0, Leave count 0 (both dates, both confirmed
before any write).

**Method:** direct HTTPS requests (Python `urllib`, no browser automation
tool available this session) against the live production backend,
tracking every created row's id in a manifest for guaranteed cleanup —
same method used for the 2026-07-27 same-task rule pass's own live
validation.

### 29.4 Lunch live result

- **No-warning boundary A** (11:45–12:45): direct `201` success, no
  advisory. ✔
- **Warning boundary B** (12:45–13:30): initial request → `409
  schedule_confirmation_required`, `{lunch_break_overlap}` only, zero
  write. Cancel (no resubmit) → confirmed 0 rows with that title.
  Reopen/resubmit (unconfirmed) → identical fresh `409`. Continue anyway
  (fingerprint attached) → `201`, exactly one write. ✔
- **C** (12:30–13:00) and **D** (13:00–14:00): both `409` with a lunch
  warning present (proof-only, no write attempted — automated coverage
  already proves the full confirm cycle via B). ✔
- **E** (13:30–14:30): direct `201` success, no advisory. ✔
- **F, weekend** (`2026-08-22`, 13:00–14:00): `409` with
  `lunch_break_overlap` present — confirms the every-calendar-day rule
  live on a Saturday. ✔

### 29.5 Different-title live result

- **Baseline "Title A"** (09:00–10:00): direct `201` success (no other
  Task yet).
- **"Title B" exact overlap, different title** (09:00–10:00): initial
  `409` → `{different_task_time_overlap}` only, zero write → Cancel (0
  rows) → reopen/resubmit (fresh identical `409`) → Continue anyway →
  `201`, one write. ✔
- **"Title C" partial overlap** (09:30–10:30): `409` with
  `different_task_time_overlap` (proof-only). ✔
- **"Title D" adjacent** (10:00–11:00): direct `201` success, no
  advisory — proves the half-open adjacency rule live. ✔
- **Different member / different date:** not live-write-tested this
  session (writing a disposable row onto a second real staff member's
  live calendar was judged outside the explicitly approved scope, which
  named `paraparan` only) — fully covered instead by the automated suite
  (`test_16_different_member_no_warning`, `test_17_different_date_no_warning`,
  both passing, both exercising the identical production code path since
  no separate "live" code path exists for this check).

### 29.6 Combined popup live result

Built "Combo-A" (12:30–13:15) — itself required confirmation (it
overlapped both lunch **and** the earlier different-titled `LunchA` task
at 11:45–12:45, a real, correct combined case) — confirmed and created.
Then attempted "Combo-B" (13:00–14:00): initial request → `409` with
**exactly** `{lunch_break_overlap, different_task_time_overlap}` — one
response, one popup contract, zero write. Cancel → 0 rows. Reopen →
identical combined warning set (same one popup, not two). Continue anyway
→ `201`, exactly one write. ✔ This also incidentally live-proved that two
independent advisory sources correctly combine into the single documented
contract rather than two separate responses.

### 29.7 Cancel result

Every "initial" request in this validation pass returned zero writes,
confirmed by a follow-up `GET` showing 0 matching rows before any
resubmission — proven for Single create (lunch, different-title,
combined), Bulk (warnings-only batch), and Edit (lunch overlap). No
success toast/Calendar concept applies at the API layer; the zero-write
guarantee is the backend-side half of Cancel's contract and is what this
session could directly verify.

### 29.8 Continue result

Every confirmed retry (fingerprint attached, unmodified payload) produced
exactly one write — verified by response `201`/`200` plus a follow-up
state check (row now present, or the edited field now holding the new
value) — for Single create (×4: LunchB, TitleB, ComboA, ComboB), Bulk
(×1 batch, 2 rows), Edit (×2 confirmed edits), and the stale-fingerprint
recovery flow (×1). No duplicate write was ever observed.

### 29.9 Same-title hard-block precedence (live)

- **14A** — re-submitting `ComboA`'s exact title+time → `409
  exact_task_duplicate` (no `warnings` key, no `schedule_confirmation_required`
  contract at all — the advisory system was never reached). ✔
- **14B** — a different, overlapping time for the same title → `409
  same_task_time_overlap`, same no-advisory-contract proof. ✔
- Additional live finding (Bulk, §29.13): two rows sharing an exact
  title+time within one Bulk batch are intercepted by this same hard
  classifier (`exact_task_duplicate`, `422`) before even the pre-existing
  soft-duplicate-warning gate is reached — confirming live that the hard
  same-title system runs strictly first on every code path, exactly as
  designed.

### 29.10 Leave hard-block precedence (live limitation)

**Not repeated live this session.** Creating a disposable Leave record
was not part of the explicitly approved test scope (the approval covered
Task writes for `paraparan`; Phase 14's own instructions require separate
explicit approval before any Leave record is created, and state "If Leave
live testing is not approved, retain automated evidence and record that
live Leave precedence was not repeated" — that fallback is taken here).
Full coverage remains in place from the automated suite: all 6 of
`LeavePrecedenceTests` (A–F) pass, covering Task-overlaps-Full-Day-Leave,
Task-overlaps-different-title-Task-and-Leave, lunch+different-title+partial-Leave,
Leave-added-before-a-confirmed-retry, Bulk-advisory-plus-Leave-hard-conflict,
and Edit-advisory-plus-Leave-conflict — none of these code paths differ
between the test-SQLite session and the live Postgres session (no
Leave-specific branch exists anywhere in this feature's new code).

### 29.11 Bulk old-warning-system interaction result

Live finding (see §29.9): the pre-existing exact-title/time soft-duplicate
warning system (`_find_batch_duplicate_warnings`) is now **structurally
unreachable** for its own domain — two rows sharing an exact title+time in
one Bulk batch are always intercepted first by the hard same-title
classifier (`exact_task_duplicate`, `422`), which the prior 2026-07-27
same-task rule pass had already made true (documented in that pass's own
handover note as "structurally unreachable for the same-title/date/time
domain"). This is a **stronger** guarantee than "the two systems don't
collide" — they cannot collide, because the old gate can no longer fire
at all for this input shape. Separately, a genuine warnings-only Bulk
batch (one lunch-overlap row + one different-title-overlap row, no hard
errors) correctly produced **one** combined `schedule_confirmation_required`
response naming both row indices, zero writes on Cancel, and both rows
created in one atomic write on Continue (`created_count: 2`). A batch
combining one hard error (`exact_task_duplicate`) with one otherwise-valid
advisory row was hard-rejected (`422`) with **zero** rows and **no**
confirmation offered — even a forged `confirmation_fingerprint` on retry
could not bypass this. ✔

### 29.12 Edit result

Using a disposable Task: (a) edited into lunch overlap → `409`, original
row confirmed unchanged via `GET`; confirmed retry → `200`, new time
stored. (b) Edited further to overlap a different-titled Task → `409`
`different_task_time_overlap`; confirmed retry → `200`. (c) Self-exclusion:
a notes-only edit at a genuinely isolated time slot → `200`, no warning —
proving the edited Task never flags against its own prior/unchanged
occurrence. (An earlier attempt at this same self-exclusion check, at a
time slot that happened to coincide with an unrelated earlier test Task
of a different title, correctly returned `409` — proving the *different*
overlap detector, not a self-exclusion failure; corrected by moving to an
isolated slot before asserting the no-warning case.) ✔

### 29.13 Stale confirmation live result

Reproduced the exact scenario `test_36`/`test_59` cover automatically,
live: (1) triggered an advisory (`StaleB` overlapping `TitleA`), captured
its fingerprint. (2) Introduced a genuinely new conflicting Task
(`StaleC`, confirmed and created) before retrying. (3) Resubmitted `StaleB`
with the **original, now-stale** fingerprint → rejected with a **fresh**
`409` carrying a **different** fingerprint value (`assert fp_fresh !=
fp_stale` held) and zero write, confirmed via `GET`. (4) Resubmitted with
the fresh fingerprint → `201`, exactly one write. A stale confirmation
never silently succeeded at any point. ✔

### 29.14 Form preservation, duplicate-popup, and no-optimistic-update

Not independently browser-verified this session (no browser tool) —
these are frontend-only concerns (`instance.js` never touches `items`,
the Calendar render, or a success toast outside the real request's
`.then()` success branch — confirmed by code reading, unchanged since the
implementation pass) and are covered by direct evidence at the API layer:
every "initial/unconfirmed" request in §§29.4–29.8, 29.12–29.13 produced
zero writes, and the frontend's `performTaskCreate`/`performTaskUpdate`/
`performBulkSubmit` functions call the Calendar-refresh/toast code only
inside the successful-response branch (verified in the diff, §2 of the
original review). No duplicate confirmed request was observed at the API
layer in any of the ×7 confirm cycles run this session.

### 29.15 Accessibility, mobile, 200% zoom

**AMBER — not live-verified.** No browser automation tool was available
in this session (same limitation as the original implementation pass).
Code-level confirmation only: the deployed `js/ui/dialog.js` asset was
fetched directly and confirmed to contain `role="dialog"`, `aria-modal`,
`aria-labelledby`, `aria-describedby`, the focus trap (`trapTab`), focus
restore (`returnFocus`), and Escape-to-Cancel handling — this is the
pre-existing `confirmDestructive()` component, reused verbatim (not new
code introduced by this feature), already serving the live delete- and
Bulk-duplicate-confirmation flows in production before this release. No
new CSS or DOM structure was added for this feature, so no new
mobile/zoom risk surface exists beyond that already-live component's own
established behavior — but this reasoning was not independently
confirmed by an actual rendered click-through, mobile viewport, or 200%
zoom check.

### 29.16 Cleanup

12 disposable rows created across §§29.4–29.13 (all `TEST-ADVISORY-*`
titles, all `source_scope=dashboard_testing`/`is_official_truth=false`,
all future-dated, none ever had an outcome recorded so none was ever at
risk of the delete-lock). All 12 deleted (`12 of 12` succeeded, 0
failures). Follow-up `GET` across `2026-08-15`..`2026-08-25` confirmed
**0** Tasks and **0** Leave records — exactly matching the pre-write
baseline. **Zero test residue remains.**

### 29.17 Remaining residue

None.

### 29.18 Final status (supersedes §27)

**PASS.** Implementation (429/429 backend, 36/36 frontend), release
(commit `9a1976d` pushed, both services confirmed live and serving the
new commit), and live production validation (12/12 writes and reads
behaved exactly as required, 12/12 disposable rows cleaned, 0 residue)
are all complete. The only open item is Phase 18 (§29.15) — accessibility/
mobile/zoom could not be independently confirmed in an actual rendered
browser this session; this is a documented limitation, not a failed
check, and rests on a pre-existing, already-live, unmodified component.

### 29.19 One next action (supersedes §28)

A maintainer with browser access should, at convenience, click through
the "Confirm schedule" popup once on a mobile viewport (~390px) and once
at 200% zoom to close out §29.15 — no further backend or write validation
is required; everything reachable via direct API testing has been
confirmed live.

## 30. Plain-language confirmation copy pass (2026-07-27, same day)

### 30.1 Screenshot-derived usability problem

A Management AIOS member reported the popup wording as confusing —
non-technical staff could not tell what was wrong, which existing Task
was involved, what time it occupied, or what would happen if they
proceeded. The old wording never named the conflicting Task or its time
at all, and used system-facing phrasing ("Task", "advisory", implicit
"member"/"date" framing) rather than plain language.

### 30.2 Old technical wording (replaced)

- Lunch only: *"This Task overlaps the lunch break from 12:45 PM to 1:30 PM."*
- Different-title only: *"This Task overlaps another Task scheduled for the same member and date."*
- Combined: *"This Task overlaps the lunch break and another Task scheduled for the same member and date."*
- Title: "Confirm schedule". Buttons: "Cancel" / "Continue anyway" (identical for Single create, Task edit, and Bulk Tasks — no context-specific wording at all).

None of the old wording named the conflicting Task's title or time —
the backend never sent that information to the frontend in the first
place (§30.5).

### 30.3 Final plain-language wording (implemented)

Title: **"Check this task time"**. Exact copy, verified byte-for-byte by
`schedule-confirmation-message.test.mjs` (16 tests):

- **Lunch only:** *"This task is during the lunch break, from 12:45 PM to 1:30 PM."* — closing question (create): *"Do you still want to add it?"*
- **One different-title conflict:** *"Another task is already scheduled during this time:"* + a semantic list item *"“`existing Task title`” — `start time` to `end time`"* — closing question (create): *"Do you still want to add this task?"*
- **Combined, one conflict:** *"This task is during the lunch break, from 12:45 PM to 1:30 PM, and it also overlaps:"* + the same conflict list item — closing question (create): *"Do you still want to add it?"*
- **Multiple conflicts:** *"This time overlaps `count` other scheduled tasks."* + *"Please review the conflicting task times before continuing."* + up to 5 list items, each *"`Task title` — `start` to `end`"*, plus *"And `N` more scheduled tasks."* when more than 5 exist.
- **Missing-title fallback:** *"Another task — `start time` to `end time`"* (no quotes, never `undefined`/`null`/blank punctuation).
- **Times** are formatted 12-hour (`formatTimeAmPm` in core.js), e.g. `12:30` → `12:30 PM`, `13:15` → `1:15 PM`.
- No mention anywhere of "member", "date", "advisory", "interval", "fingerprint", "validation", "request", or "backend" — confirmed by direct string inspection of every built message/list/footer value across all 16 tests.

### 30.4 Button-label changes

| Context | Secondary (was "Cancel") | Primary (was "Continue anyway") |
| --- | --- | --- |
| Single Task create | Go back | Add task anyway |
| Task edit | Go back | Save changes anyway |
| Bulk Tasks | Go back | Add all tasks anyway |

The Close (X) control is untouched — it already resolved exactly like
Cancel/Go back in the pre-existing `confirmDestructive()` component
(`settle(false)`, zero write) before this task, and still does.

### 30.5 Conflict-detail display (backend + frontend)

**Backend** (`backend/routers/member_schedules.py:build_schedule_confirmation`):
the `different_task_time_overlap` warning entry now additionally carries
a `conflicts` array — `[{"title", "start_time", "end_time"}]` — built by
cross-referencing the detector's existing `conflict_keys` back against
`existing_occurrences` (already in scope; **no second DB query**), deduped
and sorted (`_dedupe_and_sort_conflict_details`, start time then end time
then title) before being attached. This is purely additive:

- `detect_schedule_advisories()` itself was **not touched** — same
  signature, same return shape, all 15+ existing direct callers in the
  test suite untouched.
- `_advisory_candidate_state()`/`schedule_confirmation_fingerprint()`
  were **not touched** — the fingerprint still hashes only
  `conflict_keys` (opaque internal keys), never the new title/start/end
  display strings. Proven directly by `test_24_fingerprint_unaffected_by_
  display_context`: two occurrences producing the identical
  `conflict_keys` but different display titles fingerprint identically;
  a genuinely different key changes it. Confirmed byte-for-byte stale-
  fingerprint behavior unchanged by `test_25_stale_confirmation_behavior_
  unchanged` (a live-style end-to-end run through the real endpoint).
- No internal database ID, member key, `source_scope`,
  `is_official_truth`, or created-by identifier is ever included —
  proven by `test_23_internal_ids_and_unsafe_fields_excluded`, which
  serializes the full response body and asserts the internal occurrence
  key string never appears in it.
- An old client that only reads `{code, row_index}` (ignoring the new
  `conflicts` key) sees every field it already relied on, unchanged in
  shape — proven by `test_27_old_client_without_display_context_handling_
  remains_safe`.
- No database column, migration, or schema change of any kind — the
  `conflicts` array is computed in memory per-request from data the
  backend already had in scope.

**Frontend** (`web-view/js/calendar/core.js`): the conflict list is
rendered as real `<li>` elements (`web-view/js/ui/dialog.js`, additive
`listItems`/`footer` options — every pre-existing caller, e.g. delete
confirmation and Bulk's own pre-existing duplicate-warning popup, is
completely unaffected since neither ever supplies these two new options).
The frontend never infers conflicts from stale local Calendar data — it
only ever renders exactly what the backend's `conflicts` array (freshly
computed on every request/retry) supplies.

### 30.6 Single/Bulk/Edit results

- **Single create:** title/times/list/footer render per §30.3; primary
  button "Add task anyway"; confirmed by unit tests + code-reading of
  `performTaskCreate`'s `showScheduleConfirmation(..., 'create', 'Add
  task anyway')` call site.
- **Bulk:** friendly 1-indexed "Task N" numbering (never 0-based —
  `test_bulk_never_shows_a_zero-based_row_index`); every warned row's
  block folded into **one** combined message (never one popup per row,
  never sequential popups — unchanged from the pre-existing
  architecture, which already never opened more than one dialog per
  submission); ends with *"Do you still want to add all these tasks?"*;
  primary button "Add all tasks anyway".
- **Edit:** closing question is **always** *"Do you still want to save
  these changes?"*, overriding whatever Create's own closing question
  would have been, for every warning shape including the multiple-
  conflict case — proven by the dedicated `edit context` test (4
  sub-assertions: lunch-only, one-overlap, multiple, combined); primary
  button "Save changes anyway". Cancel/Go back leaves the stored Task
  unchanged and preserves the edited form values — unaffected by this
  task, since Cancel is still a zero-request no-op (unchanged control
  flow from the original advisory feature).

### 30.7 Accessibility result

Code-level only (no browser tool available this session, same limitation
as both prior passes on this feature — see §29.15). `web-view/js/ui/
dialog.js` was extended, not replaced: `role="dialog"`, `aria-modal`,
`aria-labelledby`, the focus trap, Escape-to-Cancel, and focus restore
are all the pre-existing, unmodified provisions. New this pass:
`aria-describedby` now lists three ids (`ui-dialog-message ui-dialog-list
ui-dialog-footer`) so the conflict list and closing question are announced
in reading order even though hidden/empty for every pre-existing caller;
conflicting Tasks render as real `<li>` elements inside a `<ul>` (a
genuine semantic list, not styled `<div>`s); the list/footer are fully
rebuilt on every `open()` call so no stale content can ever be announced,
and since this is a single-Promise, open-once-per-call dialog with no
re-render loop, "no repeated announcement after a harmless re-render"
holds structurally. Not independently confirmed with an actual screen
reader or rendered click-through.

### 30.8 Mobile result

Code-level only. `.msc-modal`'s existing `max-width:420px; width:100%`
(calendar.css, unchanged) already fits a 390px viewport with the overlay's
20px padding. New CSS (`web-view/css/ui.css`): `.ui-dialog-list li` and
`.ui-dialog-message` both get `overflow-wrap: break-word` (long Task
titles wrap rather than clip or force horizontal scroll); the list uses
`display:flex; flex-direction:column; gap:6px`, a layout that degrades
identically at any viewport width. Not independently confirmed in an
actual rendered mobile viewport.

### 30.9 200% zoom result

Code-level only. `.ui-dialog` is now `display:flex; flex-direction:column;
max-height:calc(100vh - 40px)`, with `.ui-dialog-body` (message + list +
footer) as the sole `flex:1 1 auto; overflow-y:auto; min-height:0` scroll
region and `.ui-dialog-head`/`.ui-dialog-actions` both `flex-shrink:0` —
the same scroll-containment shape as the pre-existing
`.msc-view-modal-inner` pattern (calendar.css) already used and
presumably already verified for the Task/Leave detail popup. This means
Go back and the primary action always stay visible even when the
conflict list would otherwise overflow a zoomed/short viewport, and no
text is reduced below its normal size to compensate (no new `font-size`
override was introduced anywhere in this pass). Not independently
confirmed at an actual 200% browser zoom level.

### 30.10 Regression results

Full backend suite: **435/435 passing** (429 pre-existing + 6 new
`ConflictDisplayContextTests`). Full frontend suite: **46/46 passing**
(30 pre-existing + 16 new in the rewritten
`schedule-confirmation-message.test.mjs`). `node --check` clean on all 4
changed JavaScript files
(`core.js`, `instance.js`, `web-view/js/ui/dialog.js`,
`schedule-confirmation-message.test.mjs`). Specifically confirmed
unchanged: lunch boundaries (`LunchDetectorTests`, all passing
unmodified), different-title overlap detection
(`DifferentTitleDetectorTests`, all passing unmodified, plus
`detect_schedule_advisories` itself has zero diff lines), same-title hard
blocks (`test_same_task_multiple_time_period_rule.py`, 48/48, zero diff
in `classify_same_task_conflict`/`_classify_time_pair`), Leave hard
blocks (`test_task_leave_overlap.py` 15/15, `test_member_leave.py` 86/86,
`leave_logic.py` has zero diff), Bulk atomicity
(`test_bulk_task_creation.py` 36/36), classification
(`test_schedule_classification.py` 48/48), Outcomes
(`test_task_outcome.py` + `test_task_outcome_endpoint.py`, 42/42),
Schedule Summary (`test_schedule_duration_reports.py` 49/49), XLSX export
(`test_weekly_schedule_export_endpoint.py` +
`test_weekly_schedule_xlsx_export.py`, 33/33).

### 30.11 Database impact

None. `git diff -- database/ database/migrations/` both empty. The
`conflicts` display array is computed in memory per-request; no schema,
migration, or dependency file was touched
(`backend/requirements.txt`/`pyproject.toml`/`package.json`/
`package-lock.json` diffs all empty).

### 30.12 Known limitations

- No live browser click-through, screen reader, mobile-viewport, or
  200%-zoom verification this session (no browser automation tool
  available) — same limitation as both prior passes on this feature.
  Everything reachable via pure-function unit tests and backend
  endpoint tests has been verified exactly.
- Not committed, not pushed, not deployed as part of this pass — per
  this task's explicit instruction not to stage, commit, push, deploy,
  or migrate.
- Bulk's per-row conflict details are rendered as inline text lines
  within the message (never a semantic `<ul>`), unlike the single-
  candidate case — a deliberate scoping decision: Bulk's structure
  (multiple rows, each with its own optional conflict sub-list) doesn't
  reduce to one flat list the way a single candidate's conflicts do, and
  forcing it into one would either lose the "Task N" grouping or require
  nested lists. This is documented as "where possible" semantic-list
  usage per the approved requirement, not a gap against it.

### 30.13 PASS / AMBER / FAIL

**AMBER.** All required copy, button-label, conflict-detail-display,
dedup/sort/cap, and backend-contract changes are implemented and fully
unit-tested (435/435 backend, 46/46 frontend, `node --check` clean,
database/migration/dependency diffs empty, protected path untouched).
AMBER rather than PASS only because (a) no live interactive browser/
screen-reader/mobile/zoom validation was performed (no browser tool
available this session) and (b) nothing from this pass has been
committed, pushed, or deployed yet.

### 30.14 One next step

Repository owner reviews this diff
(`git diff -- backend/ web-view/ validation/ handover/`) and, if
approved, requests an explicit commit — followed by an owner-run live
click-through of the "Check this task time" popup (lunch-only,
one-overlap, combined, and one multiple-conflict case; Single create,
Task edit, and Bulk) to close out the remaining accessibility/mobile/
zoom AMBER items from both this pass and the original feature (§29.15).

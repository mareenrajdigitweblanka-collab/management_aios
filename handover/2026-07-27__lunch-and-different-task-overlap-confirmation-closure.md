---
name: lunch-and-different-task-overlap-confirmation-handover
type: handover
scope: management_aios calendar — lunch-break and different-title Task-overlap ADVISORY confirmation (Single Task create, Bulk Tasks, Task Edit)
created: 2026-07-27
status: PASS (release pass, 2026-07-27) — implemented, tested (429/429 backend, 36/36 frontend), committed (9a1976d), pushed to origin/main, confirmed live on both Vercel deployments, and live-validated against production (12 disposable writes, all cleaned up, zero residue) — see §13. Original implementation-only AMBER history (§1-§12) preserved below unchanged.
owner: builder, per this task's implementation instructions
reviewer: pending owner review — see validation note §26
---

# Lunch-Break and Different-Title Task-Overlap Confirmation — Handover — 2026-07-27

## 1. Requirement summary

Two new ADVISORY (confirmable, never a hard block) conditions on a timed
Task save:

1. **Lunch-break overlap** — any timed Task overlapping `12:45 PM–1:30 PM`,
   every calendar day including weekends.
2. **Different-title Task overlap** — a timed Task overlapping another
   active timed Task for the same member and date, with a different
   normalized title.

Either or both may apply to one candidate. The user sees one **"Confirm
schedule"** popup with **Cancel** / **Continue anyway**. Applies to Single
Task creation, Bulk Tasks, and Task Edit. All pre-existing hard blocks
(same-title exact-duplicate/overlap/both-untimed/timed-vs-untimed via
`classify_same_task_conflict`; Task/Leave, Leave/Task, Leave/Leave via
`leave_logic`) are completely unmodified and can never be bypassed by
"Continue anyway." Full detail: `validation/lunch-and-different-task-overlap-confirmation-check-2026-07-27.md`.

## 2. Files changed

| File | Change |
|---|---|
| `backend/routers/member_schedules.py` | Added the shared advisory detector (`detect_schedule_advisories`, `_overlaps_lunch_break`, `_timed_intervals_overlap`), the fingerprint contract (`build_schedule_confirmation`, `schedule_confirmation_fingerprint`, `schedule_confirmation_response_body`, `_advisory_candidate_state`), and the Bulk-specific aggregator (`_bulk_schedule_advisories`). Wired into `create_member_schedule_event`, `update_member_schedule_event`, and `create_member_schedule_events_bulk` — each now runs the advisory check after every existing hard check has already passed, reusing the same `_active_same_date_occurrences()` query the same-title classifier already runs (no second query). `classify_same_task_conflict`/`_classify_time_pair` were **not touched**. |
| `backend/schemas.py` | Added one additive, optional `confirmation_fingerprint: Optional[str] = None` field to `MemberScheduleEventCreate`, `MemberScheduleEventUpdate`, and `BulkTaskCreateRequest`. No existing field changed. |
| `backend/tests/test_schedule_advisory_confirmation.py` (new) | 72 tests — pure-function lunch/different-title detector tests, fingerprint determinism, and full endpoint-level (real ephemeral SQLite) coverage for Single create, Bulk, Edit, and the six Leave-precedence scenarios. |
| `backend/tests/test_same_task_multiple_time_period_rule.py` | One test updated (`test_19_different_title_overlap_allowed`) — an **intentional** behavior change: a different-title overlapping-time pair, previously silently allowed, now requires confirmation. Every other test in this file is unchanged and passes. |
| `web-view/js/calendar/core.js` | Added `SCHEDULE_ADVISORY_LUNCH`/`SCHEDULE_ADVISORY_DIFFERENT_TITLE` code constants and the pure, exported `scheduleConfirmationMessage(warnings)` popup-text builder (same file/pattern as this codebase's other pure calendar helpers — `formatPercentage`, `getSplitWarningState`, etc. — each independently unit-tested). |
| `web-view/js/calendar/instance.js` | Added `showScheduleConfirmation()` (wraps the pre-existing `confirmDestructive()` dialog — no new modal framework) and `mergeInto()` (ES5 shallow-merge, matching this file's `var`/`function`-only style). `apiRequest()` now tags a `{"error":"schedule_confirmation_required",...}` 409 body with `.code`/`.warnings`/`.confirmationFingerprint`. Single create and Task edit were each refactored into a shared `performTaskCreate`/`performTaskUpdate` function used by both the initial submit and the confirmed retry. `performBulkSubmit()` gained a `confirmationFingerprint` parameter and a new catch branch for the same error code. |
| `web-view/js/calendar/schedule-confirmation-message.test.mjs` (new) | 6 tests — exact popup wording for lunch-only/different-title-only/combined single-candidate cases, the Bulk per-row summary, and ordering determinism. |

No file under `member-aios/mayurika-hr/staff-data/` (protected) was
touched. No file under `database/` was touched. No dependency file was
touched.

## 3. Shared backend helper paths

- `backend/routers/member_schedules.py:detect_schedule_advisories` — the
  one pure detector (lunch + different-title), called by every write path.
- `backend/routers/member_schedules.py:build_schedule_confirmation` —
  one-candidate wrapper (single create/edit; Bulk calls it once per row via
  `_bulk_schedule_advisories`).
- `backend/routers/member_schedules.py:schedule_confirmation_fingerprint` /
  `schedule_confirmation_response_body` — the fingerprint/response contract,
  shared verbatim by all three endpoints.

Do not add a second lunch or different-title formula anywhere in this
file — extend `detect_schedule_advisories` instead, the same convention
this file already documents for `classify_same_task_conflict`.

## 4. Frontend popup owner

`web-view/js/ui/dialog.js:confirmDestructive()` — the same shared,
accessible, focus-trapped modal already used for delete confirmation and
Bulk's pre-existing duplicate-warning popup. `instance.js:showScheduleConfirmation()`
is a thin wrapper supplying the title/message/button labels; the message
text itself is built by the pure, independently-tested `core.js:scheduleConfirmationMessage()`.

## 5. API request/response contract

**Additive request field** (Single create, Task edit, Bulk — same field
name, same semantics on all three):

```json
{ "...normal payload fields...", "confirmation_fingerprint": "<opaque-string-or-omitted>" }
```

**409 response** (returned only when at least one advisory warning applies
and the submitted `confirmation_fingerprint` does not match the freshly
recomputed one):

```json
{
  "error": "schedule_confirmation_required",
  "warnings": [
    { "code": "lunch_break_overlap", "row_index": null },
    { "code": "different_task_time_overlap", "row_index": null }
  ],
  "confirmation_fingerprint": "<sha256-hex>"
}
```

`row_index` is always `null` for Single create/Edit; it is the row's own
1-indexed submitted position for Bulk. No internal database ID ever
appears in `warnings` or in any user-visible text — the fingerprint is an
opaque SHA-256 digest that may internally reference conflicting Task IDs,
but those are never returned in plaintext.

**Confirmed retry**: resubmit the exact same payload with
`confirmation_fingerprint` set to the value just received. The backend
always reruns every hard check and recomputes the complete current
advisory set + fingerprint from scratch before ever writing.

## 6. How Bulk warnings work

`_bulk_schedule_advisories()` checks every nonblank row against three
sources in one pass: the lunch interval, every OTHER row in the same
submitted batch sharing that row's date, and every already-active saved
Task for that member/date. All rows' warnings are returned in one combined
`schedule_confirmation_required` response (never one popup per row) with
zero writes. This is fully independent of the pre-existing exact-title/
time soft-duplicate system (`confirm_duplicates`) — a batch can require
both confirmations in sequence, each fully revalidated on its own. Bulk
remains atomic: a confirmed retry either creates every nonblank row or
none (proven by `test_48_atomic_rollback_proven`).

## 7. How stale confirmation is handled

The fingerprint is a SHA-256 digest over the current candidate's (or, for
Bulk, every row's) date/normalized-title/start/end, current advisory
codes, and current conflicting-Task keys — recomputed fresh on every
request, never stored anywhere. Any change to the payload, or any change
in the underlying database state (a new conflicting Task or Leave record
appearing) between the advisory response and the confirmed retry, changes
the recomputed fingerprint, so a stale or forged confirmation can never
silently succeed — it instead either produces a fresh
`schedule_confirmation_required` (if only advisories changed) or a hard
block (if a hard-conflict domain now applies, e.g. Leave).

## 8. Hard conflicts that must never be bypassed

- Same-title exact duplicate / timed overlap / both-untimed /
  timed-vs-untimed (`classify_same_task_conflict` — completely unmodified).
- Task/Leave, Leave/Task, Leave/Leave (`leave_logic.py` — completely
  unmodified, confirmed by an empty `git diff`).
- The outcome-recorded date-change/delete immutability rule (unmodified).

None of these can be reached via `confirmation_fingerprint` — the advisory
check runs strictly after every one of them has already passed, on every
code path (initial request and confirmed retry alike, since a confirmed
retry reruns the entire function from the top).

## 9. Test locations

- `backend/tests/test_schedule_advisory_confirmation.py` — 72 tests (new).
- `backend/tests/test_same_task_multiple_time_period_rule.py` — 48 tests
  (1 updated, 47 unchanged).
- `web-view/js/calendar/schedule-confirmation-message.test.mjs` — 6 tests
  (new).
- Run backend: `python -m unittest discover -s backend/tests -p "test_*.py"`
  → **429/429 passing**.
- Run frontend: `node --test web-view/js/calendar/*.test.mjs` →
  **36/36 passing**.

## 10. Deployment status (superseded — see §13.1-13.2)

~~Not committed, not pushed, not deployed.~~ Committed (`9a1976d`),
pushed, and confirmed live on both Vercel deployments as of the 2026-07-27
release pass — see §13. No schema/migration change was made at any point
(Database changes: NONE).

## 11. Known limits

- No live browser click-through was performed (no browser automation tool
  available this session) — see validation note §25 for the full detail
  on what was verified instead (syntax checks, pure-function popup-text
  unit tests, and code-reading confirmation of the reused accessible
  dialog component). **Still true after the release pass** — see §13.10;
  full live functional validation was performed instead via direct API
  requests (§13.4-13.9).
- No live Neon/Postgres re-run (same pre-existing workstation limitation
  documented across every 2026-07 validation note in this repository).
  Superseded in effect — §13's live validation ran directly against the
  production Postgres/Neon-backed API, not SQLite, closing this gap for
  every code path this feature touches.
- The pre-existing Bulk exact-title/time soft-duplicate warning system is
  a separate, independent confirmation gate from this feature — not
  merged into the new "Confirm schedule" popup, since the task's
  "one combined popup" requirement is scoped to the lunch/different-title
  combination specifically. **Live finding (§13.9):** this old gate is in
  fact structurally unreachable for its own exact title+time domain now
  (the hard same-title classifier always intercepts first) — so "separate
  confirmation gate" is more theoretical than practical at this point.

## 12. Next action (superseded — see §13.12)

~~Repository owner reviews the diff... and, if approved, requests an
explicit commit. After commit/push/deploy, an owner-run live
click-through...~~ — the commit was approved and made; live functional
validation was completed via direct production API requests. See §13.12
for the current, narrower next action (accessibility/mobile/zoom only).

## 13. Release and live production validation (2026-07-27, release pass)

### 13.1 Implementation commit and push

- Commit: `9a1976d` — "Add schedule overlap confirmations".
- Push: `15b56fa..9a1976d main -> main`. Local HEAD and `origin/main`
  confirmed matching.
- Final regression re-run before commit: backend 429/429, frontend 36/36,
  `node --check` clean, database/migration/dependency diffs all empty.

### 13.2 Deployment ownership and verification

Both Vercel projects deploy automatically from GitHub on push to `main` —
no manual action taken. Backend: `/health` 200; Task list, weekly Summary,
XLSX export all readable; `/openapi.json` shows the new
`confirmation_fingerprint` field on all three request schemas (direct
proof of the deployed commit, since that field exists in no earlier
commit). Frontend: live-fetched `core.js`/`instance.js` contain every
required advisory code, the fingerprint field name, and all three exact
confirmation strings byte-for-byte. Full detail:
`validation/lunch-and-different-task-overlap-confirmation-check-2026-07-27.md`
§29.2.

### 13.3 Approved live test scope

Member `paraparan`, dates `2026-08-20` (weekday) and `2026-08-22`
(weekend), both confirmed 0 pre-existing Tasks/Leave before any write.
Explicit user approval obtained before any write. `TEST-ADVISORY-*`
title prefix used throughout; every write forced server-side to
`dashboard_testing`/`is_official_truth=false`.

### 13.4-13.9 Live results summary

Every required live scenario passed exactly as specified: lunch boundary
(no-warning at 11:45-12:45 and 13:30-14:30; warning at 12:45-13:30,
12:30-13:00, 13:00-14:00, and on a Saturday); different-title overlap
(exact/partial → warning, adjacent → none); combined popup (one response,
both codes, one popup); Cancel (zero write, verified via GET); Continue
(exactly one write per confirmation, 7 confirm cycles run, zero duplicates);
same-title/Leave hard blocks (unreachable via any fingerprint, forged or
real); Bulk (warnings-only → one combined response → all-or-nothing
create; hard error + advisory → 422, zero rows, no bypass even with a
forged fingerprint); stale confirmation (old fingerprint rejected with a
fresh, different one after a new conflict appeared; zero write until the
fresh one was submitted). Full scenario-by-scenario detail, including the
exact request/response pairs: `validation/lunch-and-different-task-overlap-confirmation-check-2026-07-27.md`
§§29.4-29.13.

### 13.10 Accessibility/mobile/zoom — not live-verified

No browser automation tool was available this session. Confirmed only at
the code level: the deployed `dialog.js` asset contains the expected
ARIA/focus-trap/Escape provisions — but this is the pre-existing,
already-live `confirmDestructive()` component, reused unchanged, not new
code from this feature.

### 13.11 Cleanup

12 disposable Tasks created during live validation; all 12 deleted
(`12 of 12` succeeded). A follow-up read confirmed the test window
(`2026-08-15`..`2026-08-25`) returned to its exact baseline of **0** Task
rows and **0** Leave rows. No outcome was ever recorded on any of them, so
none was ever at risk of the delete-lock. **Zero test residue remains.**

### 13.12 Final status

**PASS.** Implementation (429/429 tests), deployment (both services
confirmed live), and live production functional validation (12/12 writes
and reads behaved exactly as required, verified clean cleanup) are all
complete. The only remaining open item is an owner-run accessibility/
mobile/200%-zoom click-through of the "Confirm schedule" popup (§13.10) —
no further backend or write validation is required.

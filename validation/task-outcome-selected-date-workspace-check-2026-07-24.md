---
name: task-outcome-selected-date-workspace-check
type: validation
scope: management_aios calendar — Task Outcome (Completed/Uncompleted/reason/audit) + "My Tasks" selected-date workspace
created: 2026-07-24
status: BLOCKED (browser validation) — implementation + real-Postgres endpoint evidence complete; migration applied to production; browser validation blocked because the deployed frontend/backend do not contain this implementation and deploying was out of scope for this task
reviewer: pending
---

# Task Outcome + Selected-Date Tasks Workspace — Validation Check — 2026-07-24

## 1. Purpose

Closure review and narrow completion pass on the Task Outcome feature and the "My Tasks" selected-date workspace, following a read-only gap review earlier the same day. That review found: (a) the previously-shipped outcome code allowed setting an outcome on any day up to and including the task's date, not only the task's own date; (b) Mark Completed only asked for confirmation when clearing a reason, not in every case; (c) nothing blocked a date change or deletion once an outcome was recorded; (d) the Tasks workspace still showed the full-history "All tasks" view with no date scoping. This task fixes all four, plus the previously-flagged gaps (Uncompleted reason, outcome audit fields) that a prior pass already closed.

## 2. Source of the final business rules

Provided verbatim in this task's instructions ("FINAL BUSINESS RULES", 10 numbered rules). No external source document exists for this revision — it supersedes the two same-day-earlier prior rule sets (CONFIRMED UNTOUCHED-TASK OUTCOME, then FINAL CONFIRMED REASON-TRANSITION RULE) in this same engagement.

## 3. Database fields (unchanged column set from the prior pass — logic-only revision)

`management_aios.member_schedule_events` gains, in the still-unexecuted draft migration:

| Column | Type | Nullable | Write owner |
|---|---|---|---|
| `outcome` | `TEXT` | yes | `PUT .../outcome` only |
| `outcome_reason` | `VARCHAR(250)` | yes | `PUT .../outcome` only |
| `outcome_updated_at` | `TIMESTAMPTZ` | yes | `PUT .../outcome` only |
| `outcome_updated_by` | `TEXT` | yes | `PUT .../outcome` only |

Two CHECK constraints: `member_schedule_events_outcome_check` (`outcome IS NULL OR outcome IN ('Completed','Uncompleted')`) and `member_schedule_events_outcome_reason_pairing_check` (Uncompleted requires a trimmed, nonblank, ≤250-char reason; Completed and NULL both require `outcome_reason IS NULL`). The pairing constraint's `trim()`/`length()` functions were rewritten this pass from the Postgres-only `btrim()`/`char_length()` spellings to the portable standard-SQL spellings — valid on Postgres unchanged, and now also valid on SQLite, which is what let this pass build a real executable test harness (see §9).

No new column was added this pass — Rules 3, 7, and 8 (the actual scope of this closure pass) are enforced entirely in application logic against the existing four columns, not by new DDL.

## 4. API contract changes this pass

### 4.1 `derive_task_outcome()` (`backend/time_utils.py`) — narrowed window

Previously: locked once `today > event_date` (open any day up to and including the task's date). Now: locked whenever `today != event_date` — a **future** task is also locked (new), with a distinct message from a **past** one.

```python
def derive_task_outcome(event_date, outcome, today=None):
    if today is None:
        today = colombo_today()
    locked = today != event_date
    if outcome is not None:
        return outcome, locked
    is_past = today > event_date
    return ("No response" if is_past else "Pending"), locked
```

### 4.2 `PUT /{member_key}/{event_id}/outcome` — distinct future/past 409s

- `today < event_date` → `409 {"error": "outcome_not_available_yet", ...}`
- `today > event_date` → `409 {"error": "outcome_locked", ...}`
- Both leave `outcome`/`outcome_reason`/`outcome_updated_at`/`outcome_updated_by` completely untouched — the function returns before any assignment.

### 4.3 `PUT /{member_key}/{event_id}` (general update) — date-change block

New guard, inserted before the leave-conflict check: if `event.outcome is not None` and the request would change `event_date`, reject with `409 {"error": "outcome_recorded_immutable", ...}`. Title/priority/start/end/notes edits remain fully allowed on a task with a recorded outcome — only an actual date change is blocked. Drag and resize funnel through this same handler (per the router's own docstring), so a hypothetical cross-day drag would be blocked here too — see §7 for why no such interaction exists in the current frontend to actually exercise this against.

### 4.4 `DELETE /{member_key}/{event_id}` — permanent delete block

New guard: if `event.outcome is not None`, reject with `409 {"error": "outcome_recorded_immutable", ...}` before touching `deleted_at`. One-way and permanent — no rule in this codebase ever clears `outcome` back to `NULL`.

### 4.5 Mark Completed confirmation (frontend, `web-view/js/calendar/instance.js`)

Previously: `confirmDestructive()` only shown when the current outcome was `'Uncompleted'` (about to clear a reason). Now: shown unconditionally for every Mark Completed click — Pending→Completed and Completed→Completed (resubmit) now also confirm, with a non-destructive `primary`-styled dialog (vs. the `danger`-styled one used when an existing reason is actually about to be cleared). Cancel never sends a request.

## 5. Selected-date "My Tasks" workspace

Full rebuild of the Tasks-mode pane (`web-view/js/calendar/instance.js`, `web-view/css/calendar.css`):

- Heading changed from "All tasks" to "My Tasks"; the former single-item "All tasks" nav list was removed entirely (there was nothing else to navigate to).
- New `Task date: [date input]` control (`state.tasksDate`, `setTasksDate()`) — defaults to Asia/Colombo "today" via the existing `getColomboTodayStr()` helper (same helper Schedule Summary's own date default already uses), independent of `state.summaryDate` and `state.selectedDate` (Calendar's own selection) — verified by construction: three separate state keys, three separate setter functions, no cross-references between them.
- `renderTasksWorkspace()` now filters through `itemsForDate(state.tasksDate)` — the exact same date-filter helper Month/Week/Day cell rendering already uses — instead of rendering the entire `items` array. The full-history fetch itself (`loadItems()` → `GET /api/member-schedules/{member_key}`, no date params) is unchanged — Tasks workspace now filters that same already-loaded array down to one date client-side, the same pattern the Calendar side has always used; no second API call was added.
- Each row now shows: title, time, priority, and category as separate metadata (date itself is dropped from the row — redundant once the whole list is scoped to one date), an outcome status badge (reusing the existing generic `.badge`/`.badge-pass`/`.badge-amber`/`.badge-pending`/`.badge-viewonly` system from `components.css` — no new badge language), and, for Completed/Uncompleted rows, an outcome-updated-at (Asia/Colombo, via the existing `formatTaskTimestamp()`)/actor detail line, plus the reason for Uncompleted rows.
- `dateRelation` (`future`/`today`/`past`) is computed once per render from `state.tasksDate` vs. `getColomboTodayStr()` — since every row in a given render shares the same selected date, this is a property of the whole render, not of individual rows. Future-date rows show the literal "Available on the Task date" label instead of the technically-accurate-but-misleading "Pending"; past rows show the real recorded outcome or "No response", read-only (no row-level action affordance — actions live in Task Details, which independently disables its own controls via `outcome_locked`).

## 6. Task Details — Step 5 additions

`viewOutcome`/`viewOutcomeReasonDisplay`/`viewOutcomeUpdatedAt`/`viewOutcomeUpdatedBy` are now four separate `<p>` elements (previously reason was appended inline to the status line). Each is independently hidden when it has nothing to show. `outcome_reason` is always `NULL` at the API layer once `outcome` is `null`/`'Completed'` (backend-enforced), so "never display a stale Uncompleted reason when outcome is Completed" holds by construction — the element is hidden because the field it reads is empty, not because of any special-cased browser logic. Timestamp is Colombo-converted via the pre-existing `formatTaskTimestamp()`; actor is rendered exactly as the API returned it (the raw `member_key` string) — never inferred from the local calendar instance's own `memberKey`.

A visible character counter (`X / 250`) was added next to the Uncompleted reason textarea, mirroring the existing Title-field counter pattern (`updateTitleCounter()`) exactly.

## 7. Date-change / drag / delete locks — what actually exists to lock

Backend enforcement (§4.3, §4.4) is unconditional and applies regardless of which UI path reaches it. On the frontend:

- **Date field**: `editItem()` now sets `fieldDate.disabled = !!it.outcome` with an explanatory `title` tooltip; `resetForm()` unconditionally re-enables it so the disabled state can never leak into a later Add-task flow (which reuses the same DOM form).
- **Delete**: `viewDeleteBtn.disabled = !!it.outcome` in `viewItem()`, with the same tooltip pattern. The existing `deleteItem()` catch-path already maps any 409 through `mapApiError()`, so even a stale-UI attempt is rejected with the new clear message.
- **Drag "to another date"**: investigated directly — `commitItemTimeChange(it, newDateStr, newStart, newEnd)` (`instance.js`) is the one function capable of sending a changed `date`, and its signature supports it, but **both of its two actual call sites** (Week/Day time-grid vertical drag, and resize) always pass `it.date` unchanged — they only ever move start/end time within the same day. There is no Month-view or any other cross-day drag-and-drop interaction anywhere in this codebase today. So "drag to another date" is not a reachable frontend action to lock right now; the backend guard (§4.3) would reject it the moment such a feature is ever added, and both existing drag/resize call sites already have generic `.catch()` handlers that show the mapped error and call `renderActiveView()` to revert the visual position — this generic path already satisfies "restored safely after rejection" for any error, including the new one, with no drag-specific code needed. Documented here rather than building a cross-day drag feature that does not currently exist, which would have been out of scope for a closure/completion pass.

## 8. Migration status

Still DRAFT, still unexecuted. Column/constraint shape is unchanged from the prior pass (no new columns this revision) — the only migration-file change this pass is the `btrim`/`char_length` → `trim`/`length` portability fix (§3), documented as a new dated entry in the migration file's own revision-history header. Confirmed via the Neon SQL Editor in the immediately preceding review turn of this same engagement that the live `production` branch had 17 columns and neither outcome CHECK constraint — not re-verified independently this turn (no live DB connection available from this environment; see the handover doc for the full evidence chain and its limits).

## 9. Test evidence

### 9.1 Pure-function / schema-level (`backend/tests/test_task_outcome.py`)

22 tests — `DeriveTaskOutcomeTests` rewritten this pass for the narrowed on-date-only window (future/on-date/past × no-outcome/Completed/Uncompleted); `TaskOutcomeUpdateReasonContractTests` (12 tests, unchanged) covers the reason validation contract.

### 9.2 Endpoint-level, executed against a real database (`backend/tests/test_task_outcome_endpoint.py`, new this pass)

20 tests. `fastapi.testclient.TestClient` was investigated and found unusable — it requires `httpx`, which is not installed and not in `backend/requirements.txt`; adding a new dependency was judged out of scope for a closure pass. Instead, the route **functions** (`update_member_schedule_event_outcome`, `update_member_schedule_event`, `delete_member_schedule_event`) are invoked **directly** (no HTTP layer — one of the patterns this task's instructions explicitly named), each passed a real SQLAlchemy `Session` bound to a fresh, isolated, in-memory SQLite database (`StaticPool`, schema-attached via `ATTACH DATABASE ':memory:' AS management_aios` so the `management_aios.`-qualified table name resolves). Every one of the 17 numbered scenarios in this task's STEP 9, plus a genuine forced-commit-failure rollback test, executed and passed:

| # | Scenario | Result |
|---|---|---|
| 1 | Pending → Completed | PASS |
| 2 | Pending → Uncompleted with reason | PASS |
| 3 | Blank reason rejected | PASS |
| 4 | 250 chars accepted (DB round-trip confirmed) | PASS |
| 5 | 251 chars rejected | PASS |
| 6 | Future action rejected (`outcome_not_available_yet`, DB unchanged) | PASS |
| 7 | Past action rejected (`outcome_locked`, DB unchanged) | PASS |
| 8 | Completed → Uncompleted | PASS |
| 9 | Uncompleted → Completed clears reason (DB round-trip confirmed NULL) | PASS |
| 10 | Reason edit (resubmit while Uncompleted) | PASS |
| 11 | Timestamp written (bounded against real wall clock at call time) | PASS |
| 12 | Member actor written (+ structural check: no client-settable actor field exists) | PASS |
| 13 | Date change blocked after outcome (+ companion: non-date edits still allowed) | PASS |
| 14 | Delete blocked after outcome (+ companion: delete still works without one) | PASS |
| 15 | Cross-member update rejected (404, not 409 — task not visible to the wrong member) | PASS |
| 16 | Same-value resubmission | PASS |
| 17 | Failed validation leaves all four outcome fields unchanged | PASS |
| — | **Rollback**: a manufactured commit-time CHECK-constraint violation (bypassing the API validation layer entirely) leaves all four fields unchanged, verified via a fresh session/query after rollback | **PASS — genuinely executed, not reasoned about** |

This is the first genuinely-executed proof in this codebase's history that the pairing CHECK constraint and the atomicity guarantee both hold against a real, running (if non-Postgres) database — not merely inspected/reasoned about.

**What this does NOT prove**: true Postgres/Neon-specific behavior (native `TIMESTAMPTZ` storage semantics, real concurrent-connection behavior) — SQLite's dialect differs in ways this harness cannot exercise. Final confirmation against the real deployment target still requires applying the migration to a Neon branch and re-running these scenarios there.

### 9.3 Full regression

`python -m unittest discover -s backend/tests` — **276/276 pass**, including:
- `test_schedule_classification` (48/48) — Scheduled/Unscheduled classification unchanged.
- `test_schedule_duration_reports` (49/49) — Schedule Summary formulas unchanged.
- `test_bulk_task_creation` (36/36), `test_member_leave` (86/86), `test_task_leave_overlap` (15/15) — unaffected.

`node --check` clean on `instance.js`, `core.js`, `error-mapper.js`, `dialog.js`. `python -c "import backend.main"` clean.

### 9.4 Not performed this session — browser/manual verification

No live browser session, no Playwright, no manual click-through was performed this pass (unlike the referenced `handover/2026-07-24__bulk-tasks-modal-scroll-and-first-row-alignment-closure.md`, which did have that tooling available). Every frontend claim in this document is source-inspection-verified (syntax-checked, logic traced against the actual code), not browser-executed. This is marked as a known limitation, not silently assumed to pass — see the handover doc's PASS/AMBER breakdown.

## 10. Protected path

`member-aios/mayurika-hr/staff-data/` — confirmed untouched via `git status --short` / `git diff --stat` before and after every pass in this multi-session engagement (no output any time).

## 11. Reviewer

Per CLAUDE.md §18: this is calendar/Task tooling, not an HR/KPI/recruitment/admin-authority domain change — no specific Management Team reviewer is mandated by that table. Standard code review applies; recommend the repository owner (Mareen) review the diff and the migration's deploy-order requirement before applying it.

## 12. Migration applied; real-Postgres endpoint re-validation (later same day)

The user applied the migration (§8's script, unedited except the same-day `trim()`/`length()` portability fix) to the live Neon `schedule` database (org `mareenraj`, project `AIOS`, branch `production`) via the Neon SQL Editor, and confirmed via direct query: 21 columns (17 original + 4 outcome columns), both CHECK constraints present.

With the migration live, the local backend was started against this real database (explicit user approval obtained first) and all 17 STEP 9 scenarios plus extras were re-executed as genuine HTTP requests against the real FastAPI/Postgres stack — not SQLite — using disposable `dashboard_testing` Tasks on member `paraparan`, individually tracked (no bulk `clear-testing-data` used, to avoid any risk to that member's real existing rows). All passed, including:

- The pre-existing read path (previously broken by the schema mismatch) now returns 200 with correctly-derived `outcome_status`/`outcome_locked` for legacy pre-migration rows.
- The portable `trim()`/`length()` pairing CHECK constraint genuinely enforced by real Postgres: 250-char reason accepted and round-tripped exactly; 251-char rejected (422, schema layer, never reached the DB).
- Reason-clearing on Uncompleted→Completed confirmed via a **separate, fresh GET request** — proving the value is `NULL` in the database itself, not merely absent from one response.
- Date-change block, delete block, non-date-edit carve-out, cross-member 404, same-value resubmission, future/past rejection — all confirmed with real 409/404/200 responses and real audit timestamps/actor values.

**Residue**: 3 disposable Tasks now permanently remain in production (by design — Rule 8 makes any outcome-recorded Task undeletable). All titled `ZZZ-BROWSER-VALIDATION-DELETE-ME (...)`, `source_scope=dashboard_testing`, `is_official_truth=false`, on member `paraparan`, dated 2026-07-24. IDs: `403915f0-6651-4b36-aeae-7e22d11c73c7`, `3cce627b-2257-41fc-8408-bc2b1d608ee6`, `fdbd8a0e-0b64-473e-b5cc-af58d0e80c87`. Not deleted (by design, and per explicit instruction in the subsequent task not to delete them) — flagged for separate cleanup approval if desired; never classified as official business records.

The local backend was stopped after testing; no code was staged/committed at any point.

## 13. Browser validation — BLOCKED (later same day, third pass)

A dedicated manual-browser-validation pass was requested. Two independent blockers were found, either of which alone would prevent it:

1. **No browser automation tool is available in this session** (checked twice via tool search — no Playwright, no screenshot/computer-use capability). Only HTTP-level tools (`curl`, `WebFetch`) are available.
2. **The deployed production frontend and backend do not contain this implementation at all** — confirmed directly, read-only, no deployment performed:
   - `GET https://management-aios-api.vercel.app/api/member-schedules/paraparan` (the real deployed backend) returns Task objects with **no** `outcome`/`outcome_status`/`outcome_locked`/`outcome_reason`/`outcome_updated_at`/`outcome_updated_by` fields at all — the deployed Pydantic schema predates this feature entirely, even though the database migration is live.
   - `GET https://management-aios.vercel.app/js/calendar/instance.js` (the real deployed frontend bundle) is **4506 lines** and contains the literal string `"All tasks"` — it does not contain `"My Tasks"`, `msc-tasks-date-input`, `setTasksDate`, `outcome_recorded_immutable`, or any other marker of this pass's work. The local working-tree file is 4909 lines. This is the old, pre-implementation bundle, byte-for-byte consistent with `HEAD` (`8252175`) never having received any of this engagement's changes (nothing was ever committed or pushed).

Per this task's own explicit instruction ("If the deployed frontend/backend are older than the current implementation, mark browser validation BLOCKED rather than deploying"), STEPs 3–13 of the browser-validation procedure were not attempted against the live site — doing so would only demonstrate the absence of the feature, not validate it, and deploying to fix that was explicitly out of scope. No code, database, or deployment change was made to work around this.

## 14. PASS / AMBER / FAIL

**Backend/database: PASS.** Migration applied and confirmed live on production. All 20 endpoint scenarios (17 required + rollback + companions) pass against real Postgres, not just SQLite. Zero regression across 276 pre-existing/updated tests. Protected path untouched throughout.

**Browser/frontend: BLOCKED, not AMBER, not PASS.** Two independent hard blockers (no browser tool available; deployed frontend/backend are the pre-implementation version) prevent any live browser evidence from being gathered without either adding new tooling or deploying — both out of scope for this validation pass. Frontend correctness remains verified only by source inspection, as in the two prior passes.

**Overall status for this document: BLOCKED**, pending either (a) a session with browser automation tooling plus an explicit decision to deploy this implementation first, or (b) the repository owner performing their own manual click-through against a deployed instance.

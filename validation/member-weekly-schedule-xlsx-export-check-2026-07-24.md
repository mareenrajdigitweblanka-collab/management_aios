# Validation — Member Weekly Schedule .xlsx Export (2026-07-24)

**Feature ID:** member-weekly-schedule-xlsx-export
**Branch:** main
**Starting HEAD:** `07b86d0` (Add clear Task outcome availability toasts)

---

## 1. Requirement

A user can download the currently selected member's weekly schedule (Tasks + Leave) as a
two-worksheet `.xlsx` file — "Weekly Schedule" and "Weekly Summary" — scoped to the inclusive
Monday-Sunday week containing a **manually selected** Calendar date. Today, the visible Calendar
month/week, the My Tasks date, and the Schedule Summary date must never be silently substituted.
The workbook is a point-in-time export; nothing in Excel/Google Sheets writes back to Management
AIOS. Full requirement text is the governing prompt for this task; not reproduced here.

---

## 2. Repository safety (STEP 1)

Branch `main`, HEAD `07b86d0`, `git status --short` clean, no overlapping unrelated work, protected
path `member-aios/mayurika-hr/staff-data/` untouched (confirmed again at closure — §11).

---

## 3. XLSX generation ownership decision (STEP 2 — AMBER stop, resolved)

No XLSX/SheetJS/openpyxl/ExcelJS existed anywhere in this repository (exhaustive grep — zero
matches; no root `package.json`/bundler; backend deps were `fastapi`/`uvicorn`/`sqlalchemy`/
`psycopg`/`pydantic`/`python-dotenv` only). Per this task's own instructions, this required a stop
before touching any dependency file. The two options (backend + `openpyxl` vs. frontend + vendored
SheetJS) were presented to the user with a recommendation; **the user confirmed backend +
`openpyxl`.** Rationale: the authoritative Weekly Summary math already lives server-side
(`_aggregate_schedule_period`, `backend/routers/member_schedules.py`) and every existing comment in
that file insists "server-authoritative, never recompute in JS" — generating the workbook
server-side reuses that function directly instead of re-deriving it in JavaScript, and `openpyxl`
needs no build step (`web-view` has none) while still supporting every required formatting feature
(frozen panes, autofilter, real date/time cell types, wrapped text, bold headers, no macros).

`openpyxl>=3.1` added to `backend/requirements.txt` and `pyproject.toml`, mirroring the existing
version-pin style.

---

## 4. Files created / modified

| File | Change |
|---|---|
| `backend/requirements.txt`, `pyproject.toml` | Added `openpyxl>=3.1`. |
| `backend/xlsx_export.py` (new) | Row-shaping (`task_row`, `leave_rows_for_record`, `build_weekly_schedule_rows`), sorting, and openpyxl workbook formatting (`build_weekly_schedule_workbook`) + filename builder (`build_export_filename`). Pure/testable — never opens a DB session. |
| `backend/routers/member_schedules.py` | New `GET /{member_key}/reports/weekly/export` route (`export_weekly_schedule`) — read-only queries only (no `db.add`/`db.commit` anywhere in the new code), reuses `_monday_of_week`/`_aggregate_schedule_period` unchanged. |
| `backend/tests/test_weekly_schedule_xlsx_export.py` (new) | 22 pure-function/workbook-structure tests (no DB). |
| `backend/tests/test_weekly_schedule_export_endpoint.py` (new) | 11 endpoint-level tests against a real, ephemeral in-memory SQLite database (same pattern as `test_task_outcome_endpoint.py`) — member isolation (all 5 members), empty-week JSON path, deleted-record exclusion, month/year boundaries, filename correctness, no-write proof. |
| `web-view/js/calendar/core.js` | Added `formatDDMMYYYY(d)` (pure formatter, exported). |
| `web-view/js/calendar/instance.js` | New `dateManuallySelected` state flag; toolbar "Download weekly schedule" icon button + `downloadWeeklySchedule()`/`setExportButtonBusy()`. |
| `web-view/css/calendar.css` | Busy-state styling for the new toolbar button (`.msc-cal-export-busy`), reusing the existing shared `ui-spin` keyframe. |

No file under `member-aios/mayurika-hr/staff-data/` was read, staged, or modified. No file under
`database/` was touched (`git diff -- database/` empty — no such directory exists in this repo, same
as prior validation notes have confirmed).

---

## 5. Selected-date ownership (STEP 4) — the `dateManuallySelected` decision

`state.selectedDate` (the Calendar's own clicked/mini-picker/Today-button date) is set by
`selectDate()`, called from every genuine selection path **and once automatically at page
mount** (`selectDate(toDateStr(t0))` after `loadItems()`/`loadLeaveItems()` resolve — pre-existing
behavior, unchanged). That means `state.selectedDate` alone can never distinguish "the user actually
picked a date" from "the calendar defaulted to today on load" — and the requirement explicitly
forbids silently treating an unselected date as today.

**Resolution:** a new boolean, `state.dateManuallySelected`, set `true` inside `selectDate()` itself,
then explicitly reset to `false` immediately after the one automatic bootstrap call. Every later call
to `selectDate()` (Month cell, mini-picker, Week/Day slot, Today button, or a post-save
re-affirmation) is a real user/save-driven action and leaves the flag `true`. The weekly export
(`downloadWeeklySchedule()`) is the only reader of this flag; every other `selectedDate` consumer
(create-form sync, Priority Queue preview, Tasks workspace, Month/Week/Day rendering) is unaffected.

This was verified live, not just read — see §9, TEST 1/2.

---

## 6. No-date result (STEP 4)

Clicking "Download weekly schedule" while `dateManuallySelected` is `false` (or `selectedDate` is
null): zero `fetch` calls, no workbook, no Blob, no download, exactly one toast — title "Select a
date", message "Select a date in the Calendar before downloading the weekly schedule." Confirmed
live (§9, TEST 1: 0 fetch calls, toast shown, button correctly not left disabled).

---

## 7. Week calculation (STEP 5)

Reuses the existing, unchanged `getReportWeekStart()` (Monday-start; `core.js`) client-side to
derive Monday/Sunday for the request URL and filename, and the existing, unchanged `_monday_of_week()`
(`member_schedules.py`) server-side to independently re-normalize `week_start` — the same
dual-computation contract every other weekly report endpoint already uses, so a caller passing a
non-Monday date always gets back exactly the week that was used. Verified: month-boundary week
(`test_month_boundary_week`), year-boundary week (`test_year_boundary_week`), non-Monday
`week_start` normalization (`test_non_monday_week_start_normalizes_to_monday`) — all pass (§10).

---

## 8. Filename result (STEP 6)

`xlsx_export.build_export_filename(member_key, week_start, week_end)` is the single place this is
assembled — both the backend's `Content-Disposition` header and the frontend's independently
re-derived `a.download` value are built from the same `(monday, sunday, memberKey)` inputs via the
same `DD-MM-YYYY` formatting convention, so they can never disagree.

```
27-07-2026_to_02-08-2026_mayurika_weekly_schedule.xlsx
28-12-2026_to_03-01-2027_arun_weekly_schedule.xlsx
```

Both required examples reproduced exactly — confirmed by unit test and live jsdom download
(`downloadClicks[0].download`, §9 TEST 3).

---

## 9. Live frontend behavioral verification (real DOM, real production code)

This workstation has no local browser or browser-automation tool (same documented, pre-existing
limitation as prior 2026-07-24 validation notes in this repo). Instead of relying on static reading
alone, `web-view/js/calendar/instance.js` was mounted **unmodified** in a real `jsdom` DOM
(`npm install jsdom` in an isolated scratch directory — not added to this repo's dependencies), with
`fetch`/`URL.createObjectURL`/`HTMLAnchorElement.prototype.click` mocked/instrumented. A real member
instance was mounted via the actual, unmodified `initAllScheduleCalendars()`, and real DOM `click`
events were dispatched against the real rendered toolbar button and mini-picker cells.

```
TEST1 fetch calls after click with NO manual selection: 0 (expect 0)
TEST1 "Select a date" toast shown: true
TEST1 export button re-enabled: true
TEST2 fetch calls after click WITH manual selection: 1 (expect 1)
TEST2 requested URL: http://127.0.0.1:8000/api/member-schedules/mayurika/reports/weekly/export?week_start=2026-06-22
TEST2 "No schedule found" toast shown (empty JSON path): true
TEST2 no download triggered on empty path: true
TEST3 download triggered: true
TEST3 download filename: 22-06-2026_to_28-06-2026_mayurika_weekly_schedule.xlsx
TEST3 success toast shown: true
TEST4 fetch calls fired despite 3 rapid clicks: 1 (expect 1)
TEST4 button disabled while in flight: true
TEST4 button re-enabled after resolve: true
TEST5 "Download failed" toast shown: true
TEST5 no download attempted on failure: true
TEST5 button re-enabled after failure: true
TEST6 "Download failed" toast shown: true
```

This directly exercises (not infers): the no-manual-selection guard, the Monday-week URL
construction, the empty-week JSON short-circuit (no Blob/download), a real Blob-download trigger
with the exact required filename format, the duplicate-click guard, and both failure paths
(network rejection and HTTP error status) landing on the generic "Download failed" toast rather than
a raw exception.

---

## 10. Backend test evidence

- **Pure-function/workbook-structure** (`backend/tests/test_weekly_schedule_xlsx_export.py`):
  **22/22 pass** — filename builder (basic/year-boundary/no-spaces), task-row outcome derivation
  (Pending/Completed/Uncompleted+reason/No response), untimed-task blank start/end, every Leave
  type's label and blank-vs-populated time, Multi-Day weekend exclusion, Multi-Day clamping to the
  requested week, out-of-week single-day leave producing zero rows, stable sort order, and a full
  workbook round-trip via `openpyxl.load_workbook` (both worksheet names, header row, freeze panes,
  autofilter, point-in-time notice text, Weekly Summary field values).
- **Endpoint-level, real database** (`backend/tests/test_weekly_schedule_export_endpoint.py`, same
  ephemeral in-memory SQLite + direct-route-function-call pattern as
  `test_task_outcome_endpoint.py` — no `httpx`/`TestClient` dependency added): **11/11 pass** —
  empty week (JSON, no workbook), deleted-only week still counts as empty, another member's records
  don't prevent an empty result, task-only/leave-only weeks, deleted-task exclusion, non-Monday
  `week_start` normalization, month- and year-boundary weeks, **all 5 members' isolation**
  (mayurika/suman/arun/rajiv/paraparan — each sees only its own task, filename contains the correct
  member key), and a no-write proof (`MemberScheduleEvent`/`MemberLeaveRecord` row counts unchanged
  before/after two export calls, one non-empty and one empty).
- **Full backend regression**: `python -m unittest discover -s backend/tests` — **309/309 pass**,
  zero regressions (Schedule Summary, classification, Bulk Tasks, Leave, Task/Leave overlap, Task
  Outcome all unaffected).
- **Structural workbook checks** (ad hoc script, not committed): generated workbook is a
  well-formed ZIP (`zipfile.testzip()` → `None`/valid) containing the expected OOXML parts; Tamil
  text (`கூட்டம் தயாரிப்பு`) and a 240-character Notes string round-trip exactly through
  `openpyxl.load_workbook`; Date/Start Time cells read back as real `datetime`/`time` objects, not
  strings.
- **Syntax**: `node --check` clean on `core.js`/`instance.js`; CSS brace-balance check on
  `calendar.css` (400 open == 400 close); `python -c "import ast; ast.parse(...)"` clean on both new
  Python files; live import of `backend.routers.member_schedules` confirms the new route registers
  at `/api/member-schedules/{member_key}/reports/weekly/export`.

---

## 11. No-write proof (STEP 18)

```
git diff -- database/            → (empty; no database/ directory in this repo)
git diff -- database/migrations/ → (empty)
git status --short -- "member-aios/mayurika-hr/staff-data/" → (empty)
```

`export_weekly_schedule()` contains no `db.add`/`db.commit`/`db.flush`/`.update(...)` call anywhere
— confirmed by reading the function and independently by `NoWriteProofTests` (§10), which asserts
row counts are identical before and after two export calls made against the same session.

**Database changes: NONE. Migration changes: NONE. Historical-data updates: NO.**

---

## 12. Known limitations (AMBER at time of implementation — see §16 for resolution)

1. ~~**No real Microsoft Excel or Google Sheets open was performed**~~ — **RESOLVED 2026-07-27,
   see §16.1.** This workstation still has neither installed; the closest proof available from this
   environment remained: (a) a well-formed-ZIP/valid-OOXML structural check, (b) a full
   `openpyxl.load_workbook()` round-trip confirming every worksheet name, header row, frozen pane,
   autofilter reference, and cell value/type is exactly as written, and (c) no macros, external
   links, protected-workbook features, or formulas are ever written (only static values). The
   repository owner (Mareen) then performed the real open/import pass — see §16.
2. **No live Neon/Postgres re-run** — still open. Same documented, pre-existing workstation
   limitation as prior 2026-07-24 validation notes in this repo (direct Neon access hangs at the
   SSL/protocol handshake layer). SQLite endpoint tests prove query/filter/no-write logic; they do
   not prove native `TIMESTAMPTZ` wire-format behavior against the real production database. Partially
   mitigated by §16.2's real-production download evidence (real Mayurika data, deployed backend, real
   Neon-backed request) — that download succeeded, but was not re-run against an ephemeral/disposable
   dataset the way the SQLite tests were.
3. ~~**Mobile / 200% zoom**~~ — **RESOLVED 2026-07-27, see §16.2.** Not independently screenshotted
   from this workstation (no local browser in this session, same limitation prior passes have
   documented) — the repository owner performed this check directly against the deployed production
   app.
4. **Leave Count on the Weekly Summary sheet** is a simple count of the active leave records included
   in the export (not an authoritative Summary field — none currently exists for this), per this
   task's own explicit fallback instruction. Documented here as the chosen source of truth for that
   one field. Not a limitation — a recorded design decision.

---

## 13. Reviewer routing

Per CLAUDE.md §18: Calendar/Task/Leave tooling, not an HR/KPI/recruitment/admin-authority domain
change — no specific Management Team reviewer is mandated. Standard code review applies. The
repository owner (Mareen) performed the external validation pass in §16.

---

## 14. PASS / AMBER / FAIL

**Code-level + behavioral (SQLite-driven + jsdom-driven): PASS.** All 14 PASS conditions from the
governing prompt are met by direct execution evidence (not inference): manual-selection requirement
enforced and live-tested; no-date toast confirmed with zero requests; Monday-Sunday week calculated
and cross-checked client+server; filename format matches both required examples exactly; both
worksheets present with the required columns/fields; empty week confirmed live (no workbook/Blob/
download); member isolation confirmed for all 5 members; deleted and cross-member records excluded;
no database write (structural + row-count proof); Scheduled/Unscheduled classification and Schedule
Summary formulas untouched (`_aggregate_schedule_period` reused, not reimplemented); protected path
untouched.

**Rendered file / real-application open (Excel, Google Sheets, mobile, 200% zoom) — status at time
of implementation: AMBER** — see §12 (original wording preserved above) for exactly what could and
could not be verified from this workstation, and why.

**Final external validation status (2026-07-27): PASS.** See §16 for the full external validation
record — Google Sheets, mobile-width, and 200% zoom were all confirmed clean by the repository owner
against the deployed production application. No Microsoft Excel open was separately reported; not
blocking (not one of the STEP 8/PASS-condition requirements, which specify Google Sheets).

---

## 15. One next step

Closed for this feature's core scope. Optional, non-blocking follow-up: when Neon/Postgres access
becomes available from an automated session, re-run the endpoint test scenarios (§10) as genuine
HTTP requests against the real database (as was done for the Task Outcome feature's own follow-up
pass — see `handover/2026-07-24__task-outcome-selected-date-workspace-closure.md` §5.1) to additionally
confirm native `TIMESTAMPTZ` wire-format behavior, not just SQLite's approximation of it.

---

## 16. External validation — Google Sheets, mobile, 200% zoom (2026-07-27)

**Date:** 2026-07-27
**Reviewer / maintainer:** Mareen (repository owner)
**Method:** Manual, performed directly by the repository owner against the real deployed
application (`https://management-aios.vercel.app`) and a maintainer-provided synthetic workbook —
not performed by the assistant, which has no browser or Google Sheets access in this environment
(confirmed again this pass — no Playwright/browser MCP tool present).

### 16.1 Google Sheets result

The repository owner opened/imported the generated `.xlsx` in Google Sheets and reported: **opened
cleanly, no repair or corruption warning.** This confirms PASS conditions 1–2 (opens successfully,
no repair/corruption warning) and, taken together with the already-verified `openpyxl` round-trip
structure (§10 — exact worksheet names, header row/order, frozen panes, autofilter, real date/time
cell types, Tamil-text round-trip, point-in-time notice, Weekly Summary field values), constitutes
external confirmation of PASS conditions 3–13 for the Google Sheets requirement (both worksheet
names present; all 12 Weekly Schedule columns present and ordered; header/filter/date/time/long-text/
Tamil rendering; no macro/external-link warnings; Weekly Summary fields present and visible; correct
member/week; Weekly Summary values matching source data).

### 16.2 Mobile-width and 200% zoom result

Performed using Chrome DevTools' responsive-design mode at **400 × 915** (close to the required
~390×844) against the **live production app**, on the Mayurika Calendar tab. Screenshot evidence
(provided by the maintainer, reviewed by the assistant):

- Toolbar renders correctly at this width — sidebar toggle, Calendar identity, Today/Prev/Next,
  utility icon group (Search/Help/Settings/**Download weekly schedule**), Month/Week/Day dropdown,
  and the Calendar/Tasks mode switch are all visible with no visible overlap or horizontal page
  overflow.
- A real download was exercised end-to-end against the live production backend: clicking "Download
  weekly schedule" on Mayurika's real Calendar (populated with real scheduled tasks, per the visible
  month grid) produced a genuine Chrome "Save As" dialog for
  **`27-07-2026_to_02-08-2026_mayurika_weekly_schedule.xlsx`** — exact required filename pattern,
  correct member key, correct Monday-Sunday week (2026-07-27 to 2026-08-02, the week containing
  2026-07-27, "today" at the time of this validation pass). This is real, non-synthetic evidence:
  the live Neon-backed backend, the deployed frontend bundle, and a real button click all
  participated — not a mock or a local test harness.
- Repository owner's own summary: **"It is responsive, 200% also ok"** — confirmed on follow-up
  question: no issues at either size (no button overlap, no clipped tooltip, no focus-ring
  legibility problem, no duplicate download on repeated taps).

This resolves PASS conditions 8–11 (mobile-width layout usable, 200% zoom layout usable, keyboard
focus remains visible, no duplicate download) via real production evidence rather than the
CSS-inheritance reasoning originally offered as a stand-in (§12, item 3, original wording).

### 16.3 Progression

```text
Initial status (implementation pass, 2026-07-24):        AMBER
Final external validation status (2026-07-27):           PASS
```

No application-code defect was found during external validation — no code, backend rule,
spreadsheet structure, or dependency was changed as part of this validation pass.

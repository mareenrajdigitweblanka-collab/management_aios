---
name: calendar-bulk-task-multi-date-technical-design
type: technical-design-document
created: 2026-08-03
created-by: Mareenraj (builder)
status: READY FOR IMPLEMENTATION — discovery-verified, zero backend/database change, approved business decisions incorporated
requirement-id: REQ-CAL-BULK-DATES-001
---

# Technical Design — Calendar Bulk Task Multi-Date Creation (2026-08-03)

## 0. Requirement metadata / source

| Field | Value |
|---|---|
| Requirement ID | REQ-CAL-BULK-DATES-001 |
| Source | Business requirement + mandatory scope questions supplied directly in this session's discovery task (no separate `docs/*-requirement.md` file was requested or created) |
| Discovery report | This session's prior turn — read-only investigation of `web-view/js/calendar/instance.js`, `web-view/js/calendar/core.js`, `backend/routers/member_schedules.py`, `backend/schemas.py`, `backend/models.py`, `database/member_schedule_events_schema.sql`, and the existing `same-day-bulk-task-creation`/`per-row-date`/`multiple-time-frames` evidence trail |
| Baseline | `main` == `origin/main` == `3e1eed7` |
| This document | `docs/2026-08-03_calendar-bulk-task-multi-date-technical-design.md` |
| Companion validation | `validation/calendar-bulk-task-multi-date-design-check-2026-08-03.md` |

This is a design document only. No application code, migration, or database object was created or executed while producing it. The protected path `member-aios/mayurika-hr/staff-data/` was never opened.

## 1. Purpose

Let a Management Team member enter one task definition (title, priority, notes, time frame(s)) once inside a single `.msc-bulk-row` card, then generate that same task across several dates — a single date, a weekday-filtered date range, or a manually picked set of individual dates — instead of duplicating the full task definition across separate rows via repeated "Add another task" clicks. Each generated date becomes one independent, normal `MemberScheduleEvent` row, created through the existing Bulk Tasks endpoint, with no new backend contract, no new database object, and no change to authorization.

## 2. Business scenario

Management Team members frequently need to create the same task, at the same time, on several working days (e.g. "Staff Attendance 09:00–10:00" on every weekday of a sprint). Today this requires re-entering the full task definition once per date via repeated "Add another task" clicks — tedious and error-prone for a task that logically has one definition and many dates. This feature collapses that into: enter the task once, choose the dates, submit once.

## 3. Approved decisions

| # | Decision | Approved answer |
|---|---|---|
| 1 | Scope | Current selected Management Team member only — no multi-member assignment |
| 2 | Date-range default | Monday–Friday selected by default |
| 3 | Weekends | Saturday/Sunday may be selected manually; off by default |
| 4 | Duplicate handling | Preserve all current production rules unchanged — hard same-task/time/date conflicts remain blocked; existing soft-warning confirmation flow remains; generated dates receive no special bypass |
| 5 | Maximum | Preserve the existing maximum of 30 generated task occurrences per submission (`MAX_TASK_OCCURRENCES_PER_SUBMISSION`) |
| 6 | Past dates | Preserve current task-creation behavior — discovery confirmed no past-date restriction exists today at creation time (`MemberScheduleEventCreate`/`BulkTaskRowIn` have no date-in-the-past validator; the only "past" logic found governs the unrelated outcome-update window). This requirement does not introduce one. |
| 7 | Empty time | Untimed tasks remain allowed — `start`/`end` (and every `time_frames` entry) are nullable in the existing model |

No answer above was invented by this design — all seven were supplied as approved business decisions in this session's task instructions.

## 4. Current architecture (discovery summary)

- **Frontend**: `web-view/js/calendar/instance.js` owns the entire Bulk Tasks modal — markup (`instance.js:883-1009`), per-row markup (`bulkRowMarkup`, `:2613-2656`), row add/remove (`addBulkRow`/`removeBulkRow`, `:2771-2787`), per-row validation (`bulkRowFieldErrors`, `:2881-2926`), payload construction (`rowElToPayloadRow`, `:2972-3000`), and submission (`performBulkSubmit`, `:3194-3250`). There is no separate bulk-tasks file and no bulk markup in `index.html`. A row's current state lives entirely in its own DOM (no parallel JS object).
- **Backend**: `POST /api/member-schedules/{member_key}/bulk` (`backend/routers/member_schedules.py:2643-2657`) accepts `BulkTaskCreateRequest { tasks: List[BulkTaskRowIn], confirm_duplicates, confirmation_fingerprint? }`. Each `BulkTaskRowIn` already carries its **own** `date` (per the 2026-07-24 "CONFIRMED ADD-ROW DATE RULE", commit `0a77f8b`) and an optional `time_frames: List[TimeFrameIn]` (per the 2026-07-27 "multiple time frames" feature). Authorization: `Depends(get_verified_member)` + `require_matching_member(member_key, acting_member)` — identity from the bearer token only, 403 with zero rows on mismatch. Transaction: every row built first, one `db.add()` loop, one `db.flush()`/`db.commit()`, `except: db.rollback()` — fully atomic. Two independent caps already enforced: `MAX_BULK_TASK_ROWS = 30` (row count) and `MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30` (total expanded occurrences, rows × their resolved time frames), via the shared `check_occurrence_limit()`. Duplicate detection: a hard, non-bypassable block (`classify_same_task_conflict` — same member + normalized title + date + time overlap) plus a legacy soft warning/confirmation layer now largely superseded by the hard block for exact duplicates.
- **Database**: `management_aios.member_schedule_events` — plain `event_date DATE`, no time-of-day/timezone stored on it, no UNIQUE constraint or index relevant to duplicates (application-layer only).
- **Existing reusable date helper**: `web-view/js/calendar/core.js` already has `expandWeekdaysClientSide(startDateStr, endDateStr)` (`core.js:35-46`) — a Monday–Friday-only, display-purpose mirror of the server's Multi-Day-Leave weekday expansion, built on `parseDateStr`/`toDateStr` (`core.js:89-90`, both **local-calendar-day**, never UTC/timezone-converting — construction via `new Date(dateStr + 'T00:00:00')`, reading via `.getFullYear()/.getMonth()/.getDate()`, always paired, never mixed with UTC getters/setters). `isValidDateStr(s)` (`core.js:141-145`) already validates a `YYYY-MM-DD` string. This design's new expansion helper reuses this exact pattern rather than inventing a second one.
- **Recurrence**: confirmed absent anywhere in this repository (backend or frontend) — this feature introduces no recurrence concept and does not touch or resemble one.

## 5. Selected Option A architecture

**Frontend expansion into the existing, unmodified Bulk Tasks endpoint.** The browser converts one task definition plus a set of user-selected dates into N `BulkTaskRowIn`-shaped objects (or fewer if generation produces zero, which is blocked pre-submit), then sends them through `POST /api/member-schedules/{member_key}/bulk` exactly as today — no request/response shape change, no new endpoint, no new schema field.

Why this was selected over Option B (backend date-range expansion) and Option C (recurring task record) — full comparative assessment already recorded in this session's discovery report:

- **Zero backend/database exposure** — the receiving endpoint already accepts precisely this shape; nothing server-side needs to change for a first implementation.
- **Fully inherits already-tested, atomic, duplicate-checked, leave-conflict-checked, occurrence-capped backend behavior** — nothing new to validate server-side.
- **All new logic is pure and client-side** (date-range→date-list expansion, weekday filtering, preview), matching this codebase's existing convention of pure/exported/independently-tested helpers in `core.js` (`classifyTimeFrameSet`, `expandWeekdaysClientSide`, etc.).
- **Backend already independently re-validates everything it receives** regardless of which side expanded the dates (this codebase's established "never trust the client" pattern — see `backend/routers/member_schedules.py`'s per-row/per-frame revalidation on every mutation route) — so Option B's "centralize validation server-side" benefit does not materialize into a real safety gain here.
- Option C (a recurring task record) is explicitly not pursued: no approved recurrence model exists in this repository, it would create a second source of truth for scheduled tasks, and it directly conflicts with the requirement's own instruction to create one normal task instance per generated date.

## 6. UI states

Within each `.msc-bulk-row` card, a new date-selection-mode control (e.g. a 3-way segmented control or `<select>`, styled consistently with the existing priority `<select>`) offers:

### 6.1 Single date (default, current behavior retained)

The existing `.msc-bulk-row-date` `<input type="date">` — unchanged. A row created via "Add another task" still seeds from the previous row's current date value, per the existing rule.

### 6.2 Date range

- Start-date input (`<input type="date">`)
- End-date input (`<input type="date">`)
- Weekday chips, Monday through Sunday, each independently toggleable — **Monday–Friday pre-checked, Saturday/Sunday unchecked**, per approved decision §3.2/§3.3
- Live generated-date count ("5 dates selected")
- A compact generated-date preview (e.g. first/last date plus a short inline list or a "show all" expandable list — exact list-truncation length is a UI-polish decision, not gating; recommend showing all dates inline up to 10, then "and N more" beyond that, to keep the card compact without hiding information)
- Warning when the range + weekday combination generates zero dates (e.g. an all-weekend range with weekends unchecked) — "This range and weekday selection produces no dates. Adjust the range or include a weekend day."
- Warning when generated occurrences (this row's dates × this row's resolved time-frame count) exceed 30 — reusing wording consistent with the existing `too_many_task_occurrences` copy (`ui/error-mapper.js:120-123`): "This task would create N occurrences, which is more than the 30 allowed in one submission. Reduce the date range, weekdays, or time frames."

### 6.3 Multiple dates

- An add-date control (a date `<input type="date">` plus an explicit "Add date" button — not free-text entry, matching the existing manual-only convention already established for Bulk Tasks rows)
- Selected-date chips/rows, each independently removable
- Deduplication: adding a date already present in this task definition's selection is a silent no-op (the date already appears once) — never a duplicate chip, never an error toast, consistent with "deduplication of the same date within that task definition" and "do not silently skip duplicates" (the latter refers to *backend* duplicate detection across different tasks/dates, not to a user re-clicking the same date twice within one picker, which is not a "duplicate task" at all)
- Generated-date count
- Same maximum-occurrence warning as §6.2

### 6.4 Common task fields (unchanged placement/behavior)

Title, priority, notes, and time frame(s) (including "Add another time") are entered once per `.msc-bulk-row` card exactly as today, and are copied verbatim to every date this card's date-selection mode generates.

### 6.5 "Add another task" (unchanged)

Still creates a new, independent `.msc-bulk-row` card — a different task definition, not another date for the same one. No behavior change; this button and its per-row-date-carry-forward rule are untouched by this design.

## 7. Date-expansion algorithm

New pure, exported helper in `web-view/js/calendar/core.js`, alongside `expandWeekdaysClientSide`/`isValidDateStr` (reusing their exact date-handling idiom, never introducing a second timezone-handling approach in this file):

```js
/* expandTaskDates({ mode, singleDate, rangeStart, rangeEnd, weekdays, selectedDates })
   -> { dates: string[], errors: [{code, message}] }

   Pure. No DOM access, no network, no mutation of any input (weekdays/
   selectedDates arrays are read, never written back into). Deterministic —
   same input always produces the same output. Uses the exact same
   local-calendar-day date handling already established by
   expandWeekdaysClientSide/parseDateStr/toDateStr above — dates are always
   constructed via `new Date(dateStr + 'T00:00:00')` and always read back via
   local getters (.getFullYear()/.getMonth()/.getDate()/.getDay()), never
   mixed with UTC getters/setters, so there is no timezone-conversion drift
   regardless of the browser's local timezone. */
export function expandTaskDates(params) {
  params = params || {};
  var errors = [];

  if (params.mode === 'single') {
    if (!params.singleDate || !isValidDateStr(params.singleDate)) {
      errors.push({ code: 'date_required', message: 'Choose a date.' });
      return { dates: [], errors: errors };
    }
    return { dates: [params.singleDate], errors: [] };
  }

  if (params.mode === 'range') {
    var start = params.rangeStart, end = params.rangeEnd;
    if (!start || !isValidDateStr(start)) { errors.push({ code: 'start_date_required', message: 'Choose a start date.' }); }
    if (!end || !isValidDateStr(end)) { errors.push({ code: 'end_date_required', message: 'Choose an end date.' }); }
    if (errors.length) { return { dates: [], errors: errors }; }
    if (start > end) {
      return { dates: [], errors: [{ code: 'range_inverted', message: 'End date must not be before start date.' }] };
    }
    var weekdaySet = (params.weekdays && params.weekdays.length) ? params.weekdays : DEFAULT_RANGE_WEEKDAYS; // [1,2,3,4,5] Mon-Fri
    var out = [];
    var cur = parseDateStr(start);
    var endDate = parseDateStr(end);
    while (cur <= endDate) {
      if (weekdaySet.indexOf(cur.getDay()) !== -1) { out.push(toDateStr(cur)); }
      cur.setDate(cur.getDate() + 1);
    }
    if (out.length === 0) {
      return { dates: [], errors: [{ code: 'empty_range', message: 'This range and weekday selection produces no dates. Adjust the range or include a weekend day.' }] };
    }
    return { dates: out, errors: [] }; // already ascending — built by forward iteration
  }

  if (params.mode === 'multiple') {
    var selected = params.selectedDates || [];
    var invalid = selected.filter(function (d) { return !isValidDateStr(d); });
    if (invalid.length) {
      return { dates: [], errors: [{ code: 'invalid_date_in_list', message: 'One or more selected dates is invalid.' }] };
    }
    var unique = selected.filter(function (d, i) { return selected.indexOf(d) === i; }).sort();
    if (unique.length === 0) {
      return { dates: [], errors: [{ code: 'no_dates_selected', message: 'Add at least one date.' }] };
    }
    return { dates: unique, errors: [] };
  }

  return { dates: [], errors: [{ code: 'invalid_mode', message: 'Choose a date selection mode.' }] };
}
```

Required properties, and how each is met:

| Property | How met |
|---|---|
| Deterministic | Pure function of its arguments only; no `Date.now()`/`Math.random()`/network |
| No timezone conversion | Reuses `parseDateStr`/`toDateStr`'s local-calendar-day-only idiom, exactly as `expandWeekdaysClientSide` already does — never touches a UTC getter/setter |
| Inclusive start/end range | `while (cur <= endDate)` — both endpoints included when they match the weekday filter |
| Weekday filtering | `weekdaySet.indexOf(cur.getDay()) !== -1`, configurable (not hard-coded Mon–Fri like `expandWeekdaysClientSide`, since weekends must be optionally includable per approved decision §3) |
| Unique dates | Range mode is unique by construction (one calendar-day iteration, no duplicate visits); multiple-dates mode explicitly dedupes via `indexOf(d) === i` |
| Ascending order | Range mode is ascending by construction (forward iteration); multiple-dates mode explicitly `.sort()`s (ISO `YYYY-MM-DD` strings sort correctly lexicographically = chronologically) |
| No mutation of input | `selected.filter(...)` returns a new array; `params.weekdays`/`params.selectedDates` are only read, never assigned into |
| Clear validation errors | Every failure path returns a structured `{code, message}` array, never a thrown exception, never a silent empty result with no explanation |

## 8. Payload-generation rules

For one `.msc-bulk-row` card:

1. Call `expandTaskDates(...)` with that card's current mode/inputs. If `errors.length > 0`, surface them inline on the card (§13) and do not include this card in the submission payload at all.
2. For every date in the returned `dates` array, construct one payload row using the **existing, unmodified** `rowElToPayloadRow`-equivalent logic — i.e. `{ date: <generated date>, title, priority, notes, start, end }` or, when 2+ time frames exist, `{ date: <generated date>, title, priority, notes, time_frames: [...] }` — with `title`/`priority`/`notes`/time-frame data copied **verbatim** from the one entry point on the card (never re-read per generated date, so all generated rows for one card are guaranteed field-identical apart from `date`).
3. Concatenate every card's generated rows (in card order, then date order within each card) into the top-level `tasks` array of the existing `BulkTaskCreateRequest` shape — the exact same array that today holds one entry per manually-added row. A single-date-mode card contributes exactly one row, identical to today's behavior.
4. Submit via the existing `performBulkSubmit()` → `POST /api/member-schedules/{member_key}/bulk` — **completely unmodified** request construction/response handling beyond how the `tasks` array is built.

## 9. Occurrence-limit calculation

The combined count that must be checked before submission is:

```
total_occurrences = Σ over every non-blank card ( generated_date_count(card) × resolved_time_frame_count(card) )
```

Example from the task brief: 5 dates × 2 time frames = 10 occurrences for that one card; this sums across every card in the submission exactly as the backend's own `check_occurrence_limit()` already does today for manually-entered rows (row count × that row's frame count, summed).

**Frontend pre-submit block**: if `total_occurrences > 30` (mirroring the existing, unmodified `MAX_TASK_OCCURRENCES_PER_SUBMISSION`), disable "Create tasks" and show the warning copy from §6.2/§6.3, with the exact count, before any network request is sent. **This is an early user-facing check only — it does not replace backend enforcement.** The backend's existing `check_occurrence_limit()` remains the sole authoritative gate; a client that somehow bypasses the frontend check (stale JS, direct API call) is still rejected server-side with the existing `too_many_task_occurrences` response, exactly as it is today for a manually-built oversized batch.

## 10. Duplicate behavior

No new duplicate-identity logic is introduced. Every generated row flows through the existing, unmodified backend pipeline exactly as a manually-typed row would:

- **Hard block** (`classify_same_task_conflict`, unchanged): a generated date whose (member, normalized title, date, time) collides with an existing active task or another row/generated-date in the same submission is blocked with a 422 — not bypassable via `confirm_duplicates`.
- **Soft warning** (unchanged): remaining duplicate-adjacent cases still surface the existing `duplicate_confirmation_required` (409) confirmation dialog, resubmitted with `confirm_duplicates: true` exactly as today.
- **No special bypass for generated dates** — a generated row is, to the backend, indistinguishable from a manually-entered row with the same field values; this is intentional and required by approved decision §4.

The one new frontend-only behavior is the **within-card selected-date deduplication** in Multiple Dates mode (§6.3, §7) — this prevents the *same date being picked twice for the same task definition* from ever reaching the payload as two identical rows, which is a UI input-hygiene concern, not a cross-task duplicate-detection rule. It is not a "duplicate bypass" — an identical date+title+time combination arising from **two different cards** (e.g. two separate task definitions that happen to overlap) is never deduplicated and correctly reaches the existing backend duplicate pipeline unchanged.

## 11. Authorization preservation

Completely unchanged. `guardMutationAccess(memberKey)` still gates opening the Create dialog at all (`instance.js:1603-1607`); `apiRequest()` still attaches `Authorization: Bearer <token>` and still routes 401/403 through the existing handlers; the backend's `Depends(get_verified_member)` + `require_matching_member(member_key, acting_member)` on the bulk route is untouched — no request/response shape change means no authorization-surface change. This design adds zero new API calls, zero new auth-relevant fields, and zero new member-identity concept (approved decision §1 confirms current-member-only scope, matching the existing single-`{member_key}`-path-segment design exactly).

## 12. Atomic transaction behavior

Documented, not changed: the existing `POST /api/member-schedules/{member_key}/bulk` endpoint provides exactly one database transaction per submission — every row in the payload's `tasks` array is either fully committed together, or (on any validation/leave-conflict/duplicate/server error) zero rows are committed at all (`db.add()` loop → one `db.flush()`/`db.commit()`, `except: db.rollback()`). A submission that expands to, say, 12 generated rows across 3 cards is one HTTP request, one transaction — never split into per-card or per-date sub-requests. The frontend must never retry a partially-acknowledged submission by re-sending only the "missing" rows — on any error the entire submission (all cards, all generated dates) must be resubmitted as one request exactly as `performBulkSubmit`'s existing retry/duplicate-confirmation flow already does today (resubmits the full, identical `tasks` array with `confirm_duplicates: true`, never a subset).

## 13. Error and warning states

| State | Trigger | Surface | Blocks submission? |
|---|---|---|---|
| Missing/invalid single date | Single mode, empty date | Inline field error under the date input (existing `setFieldError` pattern) | Yes |
| Missing start/end date | Range mode | Inline field error under the relevant input | Yes |
| Inverted range (end before start) | Range mode | Inline error on the card | Yes |
| Empty-range warning | Range + weekday filter produces zero dates | Inline warning on the card (§6.2) | Yes |
| No dates selected | Multiple mode, zero chips | Inline warning on the card (§6.3) | Yes |
| Per-card occurrence overflow / combined overflow | Any mode, computed count > 30 | Inline warning on the card + disabled "Create tasks" (§9) | Yes (frontend pre-block) |
| Backend `validation_failed` (422) | Existing hard-validation/leave-conflict/same-task-conflict response, now potentially naming a generated date | Existing `applyBulkRowErrors` flow — unchanged, since each generated date is just another row in the existing per-row error contract | Yes (zero rows created, per existing atomicity) |
| Backend `duplicate_confirmation_required` (409) | Existing soft-warning path, potentially referencing a generated date | Existing `showBulkDuplicateConfirmation` dialog — unchanged | Yes, until confirmed |
| Backend `too_many_task_occurrences` | Existing occurrence-limit response — the authoritative backstop if the frontend check is ever bypassed | Existing `mapApiError`/`error-mapper.js` copy — unchanged | Yes |

No new error/warning state reaches the network layer with different semantics than today — every backend-originated state above is already fully implemented and tested; this design adds only the four frontend-only, pre-network states (missing/invalid input, empty range, no dates, occurrence overflow).

## 14. Accessibility requirements

- Date-selection-mode control: a real `<fieldset>`/`<legend>` or labelled `<select>` — never a div-only custom widget with no accessible name, matching the existing `.msc-bulk-row` field-labelling convention already used for title/priority/notes.
- Weekday chips: real `<button type="button" aria-pressed="true|false">` toggles (or checkboxes with visible labels) — never color-only state, consistent with existing toggle patterns in this codebase (e.g. `review-summaries.js`'s `includeInactiveCheckbox` uses a real `<input type="checkbox">` under a `<label>`).
- Generated-date preview and count: rendered as visible text (not `aria-hidden`), so a screen-reader user gets the same "5 dates selected" confirmation a sighted user sees.
- Date chips in Multiple Dates mode: each remove control gets an explicit `aria-label` naming the specific date being removed (e.g. `aria-label="Remove 2026-08-10"`), not a bare "×" with no accessible name.
- Warnings (empty range, occurrence overflow): rendered with `role="alert"` or in a live region already established for this modal's existing error/warning banners (`.msc-bulk-row-error`, `.msc-bulk-row-duplicate-warning` already exist as a pattern to extend, not replace).
- Focus order: new controls must sit in a logical tab order within the card (mode selector → mode-specific inputs → common fields), and a validation error must move focus to the first invalid new control exactly as `focusFirstInvalid()` already does for existing fields.

## 15. Responsive requirements

- Reuses the existing `.msc-bulk-row`/`.msc-bulk-rows` card layout and the existing `@media (max-width: 900px)` breakpoint already defined for Bulk Tasks (`calendar.css:3122-3241`) — new controls (mode selector, weekday chips, date-add row, date chips) must stack single-column at that breakpoint exactly as existing row fields already do, not introduce a second breakpoint.
- Weekday chips must remain individually tappable at a touch-friendly size on a 390px-wide viewport (the same mobile width already validated for this modal in the 2026-07-24 scroll/heading fix's live-browser pass) — wrap onto multiple lines rather than shrinking below a legible/tappable size.
- Generated-date preview must not force horizontal scrolling of the card at any validated width (desktop, ~900px tablet breakpoint, 390px mobile) — truncate/collapse (§6.2) rather than overflow.
- 200%-zoom-equivalent (the same standards-correct viewport+`deviceScaleFactor` emulation already used and documented in the 2026-07-24 fix's evidence) must keep the mode selector, weekday chips, and "Create tasks" button all reachable without being clipped under the modal's existing sticky header (`resetCreatePopupScroll()`/`scroll-padding-top` already solve this generically for any card content, including this feature's new controls, since they operate on the shared scroll container, not per-field).

## 16. Files to change

| File | Change |
|---|---|
| `web-view/js/calendar/core.js` | Add `expandTaskDates()` (pure, exported) alongside the existing `expandWeekdaysClientSide`/`isValidDateStr`/date helpers |
| `web-view/js/calendar/instance.js` | Add the date-selection-mode UI per card, weekday-chip wiring, multi-date add/remove wiring, generated-date preview/count rendering, occurrence-count aggregation, and payload-generation changes in the function that currently maps rows to `rowElToPayloadRow` output (now: map cards × generated dates to that same row shape) |
| `web-view/css/calendar.css` | New styles for the mode selector, weekday chips, date-add control, date chips, and the empty-range/occurrence-overflow warning banners — reusing existing tokens/patterns (`.msc-bulk-row-error`, `.msc-bulk-row-duplicate-warning`, toggle styles) rather than inventing a new visual language |
| A new focused frontend test file for date expansion | Pure-function tests for `expandTaskDates()` — single/range/multiple modes, inclusive boundaries, weekday filtering (default and custom), dedup, sort order, no-mutation, every documented error code |
| A new DOM test file for modal behavior | Mode switching, weekday-chip toggling, date add/remove, generated-count/preview rendering, occurrence-overflow disabling "Create tasks", payload shape produced for a multi-date card |
| `validation/calendar-bulk-task-multi-date-design-check-2026-08-03.md` | This design's companion validation record (see below) |
| `handover/` (a new closure document, at implementation time, not this design phase) | Not created by this design-only task |

## 17. Files not to change

Backend and database files are **not** expected to change under this design:

- `backend/routers/member_schedules.py` — the bulk route, its schemas, its validation/duplicate/occurrence-limit/transaction logic are all reused unmodified.
- `backend/schemas.py` — `BulkTaskCreateRequest`/`BulkTaskRowIn`/`TimeFrameIn` already have every field this feature needs.
- `backend/models.py`, `database/member_schedule_events_schema.sql`, and any file under `database/migrations/` — no schema/column/constraint change.
- `backend/config.py` — `MAX_BULK_TASK_ROWS`/`MAX_TASK_OCCURRENCES_PER_SUBMISSION` are reused at their current approved value (30); this design does not propose changing either number.
- `backend/routers/calendar_auth.py` — authorization is unchanged.
- `member-aios/mayurika-hr/staff-data/` — protected; unrelated to this feature; not opened during this design.

If implementation discovers a previously undocumented blocker that requires touching any file in this section, that must be raised and separately approved before proceeding — it is out of this design's scope as written.

## 18. Test plan

Numeric, binary PASS/FAIL conditions (mirrors the discovery report's proposed rule):

| # | Condition | Type |
|---|---|---|
| 1 | A Monday–Friday range produces exactly 5 task instances for a 1-week range | Binary — exact count |
| 2 | No weekend instance is produced when weekends are unselected | Binary — zero Sat/Sun dates in output |
| 3 | Five manually selected dates produce exactly 5 instances | Binary — exact count |
| 4 | Shared task fields (title/priority/notes/time_frames) match byte-for-byte across every generated instance from one card | Binary |
| 5 | Unauthorized creation (missing/invalid/cross-member token) is rejected | Binary — 401/403, zero rows created |
| 6 | A batch failure (validation/leave-conflict/duplicate/occurrence-limit/server error) creates zero partial records | Binary — row count unchanged |
| 7 | Duplicate behavior matches the unchanged, existing approved rule (hard block never bypassable; soft warning confirmable) | Binary, against existing backend test suite behavior |
| 8 | Existing single-date Bulk/Single Task creation still passes its full existing test suite unchanged | Binary — 0 regressions |
| 9 | Existing Calendar/Task/Leave/Review-Summaries test suites show no new failure | Binary — only the 2 documented pre-existing baseline failures may remain |
| 10 | `expandTaskDates()` returns dates in ascending, unique order for every mode | Binary |
| 11 | `expandTaskDates()` never mutates its input arguments | Binary |
| 12 | An inclusive range (`rangeStart === rangeEnd`) with a matching weekday produces exactly 1 date | Binary — boundary case |
| 13 | A range/weekday combination producing zero dates returns a structured error, never an empty array with no explanation | Binary |
| 14 | A combined occurrence count of exactly 30 is allowed; 31 is blocked pre-submit by the frontend | Binary — boundary case, mirrors backend's own 30/31 boundary tests |

No numeric test count is committed in this design document — actual test counts will be reported in the implementation session's validation/handover evidence, consistent with how every prior feature in this repository (Bulk Tasks, multiple time frames, Review Summaries) reports literal runner totals only after tests are written and run, not predicted in advance.

## 19. Rollout plan

1. Implement `expandTaskDates()` in `core.js` with its dedicated pure-function test file — no UI change required to land and test this in isolation.
2. Implement the UI (mode selector, weekday chips, multi-date picker, preview, occurrence-count warning) in `instance.js`/`calendar.css`, wired to the existing card and existing `performBulkSubmit` payload-construction path.
3. Run the full existing backend and frontend suites to confirm zero regression (backend is untouched, so this is a pure confirmation step, not expected to require any backend test changes).
4. Local/manual verification (per this repository's established pattern for Calendar features — no committed browser-automation tooling exists) before any commit is proposed for review.
5. Commit and push only after explicit review, per this repository's established direct-main workflow for this domain — this design document does not authorize implementation, commit, or push; it authorizes design only.
6. No database migration step exists in this rollout, since none is required (§17).

## 20. Known limits

- This design does not address a possible future "edit all generated occurrences at once" or "delete all occurrences generated from one submission" convenience — each generated date becomes a fully independent, individually editable/deletable task record (as required), with no linkage/grouping identifier retained anywhere (no new column, per §17) — a user who wants to bulk-edit/delete a whole generated set later must do so per-record, exactly as any other set of individually-created tasks today. This is a direct, intentional consequence of "one normal task instance per generated date" and "existing task table as the only task truth," not an oversight.
- The 30-occurrence combined limit is a hard ceiling on how large a single date range or multi-date selection can practically be for one task definition in one submission — a legitimately larger recurring need (e.g. an entire quarter of weekdays) is out of scope for this design and would require either multiple submissions or a future, separately-approved feature (potentially Option C, revisited with its own approval).
- No live-browser verification is included in this design-only phase — per this repository's consistent, honestly-disclosed limitation (no browser-automation tool available in this environment for prior Calendar features either), any implementation session's evidence will need to state plainly whether a live-browser pass was performed, not imply one from automated tests alone.

## 21. PASS/FAIL rule

This design document is **PASS** for the design phase when:

- Every one of the 7 approved business decisions (§3) is reflected exactly, with no invented answer.
- No backend, database, or migration file is proposed for change (§17), and the one exception path (a discovered blocker) is explicitly called out, not silently assumed away.
- The existing `POST /api/member-schedules/{member_key}/bulk` contract is reused with zero shape change (§5, §8).
- The existing 30-occurrence limit is preserved, unmodified, with the frontend check explicitly documented as non-authoritative (§9).
- The existing duplicate-detection logic (hard block + soft warning) is preserved unmodified, with no new bypass (§10).
- Authorization is unchanged (§11).
- No recurrence/parallel-truth model is introduced (§4, §5, §20).
- The date-expansion algorithm's required properties (deterministic, no timezone conversion, inclusive range, weekday filtering, unique, ascending, no mutation, clear errors) are each explicitly designed and traceable to a concrete implementation detail (§7).
- The test plan (§18) is numeric and binary, not vague.

It is **FAIL** if any of the above is missing, contradicted, or if a database/schema change is silently introduced.

## 22. Owner / reviewer / status / next step

- **Owner (builder)**: Mareenraj, per this session's direct-main design-authoring authorization (design-only — no implementation authorized by this document).
- **Reviewer**: per CLAUDE.md §18, this is shared Calendar/Task UX/API design work with no single HR/KPI/recruitment/admin-authority domain owner mandated by that table — route to whichever Management Team member next exercises the Bulk Tasks feature live, consistent with the routing already used for the 2026-07-27 multiple-time-frames feature.
- **Status**: READY FOR IMPLEMENTATION — all 7 business decisions are approved, discovery is complete and cited throughout, and the design introduces zero backend/database risk.
- **One next step**: Implement `expandTaskDates()` in `core.js` with its dedicated pure-function test file first (§19 step 1), since it can be built and fully tested in isolation before any UI work begins.

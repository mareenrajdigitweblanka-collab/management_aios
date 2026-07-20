# Validation — Calendar Task-Detail Popup & Month "+N more" Popup (2026-07-20)

**Feature ID:** calendar-task-detail-and-more-popup
**Requirement source:** User-confirmed requirement, 2026-07-20 (this session)
**Branch:** main (pre-change HEAD `d7eb417`)
**Scope:** Frontend only (`web-view/js/calendar/instance.js`, `web-view/css/calendar.css`).
No backend, database, migration, API, task-classification, or conflict-logic change.

---

## 1. Confirmed requirement

1. Remove the visible lower-page "Schedule Items" list.
2. Clicking any Task (Month/Week/Day/all-day) opens a Google-style task-detail popup.
3. The popup shows existing Task data and provides Edit / Delete / Close.
4. Clicking "+N more" in Month view opens a compact date-specific popup listing that
   date's Tasks (never Leave).
5. Clicking a Task inside the "+N more" popup opens the same shared task-detail popup.
6. No page redirect/scroll to another section.
7. No new Task fields invented.
8. Backend, database, APIs, business rules, Task/Leave creation, conflicts, and Schedule
   Summary preserved unchanged.

---

## 2. Repository safety (Step 1)

- Branch: `main`. Pre-change HEAD: `d7eb417`.
- `git status --short` before starting showed only the pre-existing untracked, protected
  `member-aios/mayurika-hr/staff-data/` — no unexpected tracked changes.
- Protected path `member-aios/mayurika-hr/staff-data/` was never read, inspected for
  modification, staged, or committed during this task.

---

## 3. Discovery (Step 2) — what already existed vs. what was added

| Element | Pre-existing (reused) | New |
|---|---|---|
| Task-detail modal shell (`.msc-view-modal`, `viewItem()`) | Yes — Week/Day timed blocks and all-day chips already called `viewItem()` | Header restructured (color dot + × close), Edit/Delete action row added |
| Edit flow (`editItem()`, Task popup, category-lock) | Yes, verbatim | Wired as a button inside the detail popup |
| Delete flow (`deleteItem()`, confirm dialog) | Yes, verbatim logic | Changed to return `Promise<boolean>` so the popup can close only after a confirmed, successful delete |
| Month chip click | Called `navigateToScheduleItemListForDate()` (scroll to list) | Now calls `viewItem()` directly (chip markup gained `data-id`) |
| "+N more" click | Called `navigateToScheduleItemListForDate()` | Now calls new `openMorePopup()` |
| Lower "Schedule Items" list (`.msc-list-card` #1, `renderList()`) | — | **Removed** |
| "+N more" date popup (`.msc-more-popup`, `openMorePopup`/`closeMorePopup`) | — | **New**, reusing the existing `positionCreateMenu`/document-click-outside pattern already used by the "+ Create" dropdown |

No existing View/Edit/Delete logic was rebuilt — `editItem()` and `deleteItem()` are called
verbatim from the new popup buttons.

---

## 4. Lower Schedule Items list removal (Step 3)

- Removed the `.msc-list-card` block containing the `msc-list-heading` ("Schedule Items —
  \[date\]") and the `.msc-list` container from the HTML template in `instance.js`.
- Removed the now-orphaned `listEl` / `listDateLabel` element refs.
- Removed `renderList()` entirely; its only non-list responsibility (`renderPriorityPreview()`)
  is now called directly from `selectDate()`, `deleteItem()`, and the "Clear Testing Data"
  handler — so Priority Preview keeps rendering unchanged.
- Removed the dead `.msc-list-heading { scroll-margin-top }` CSS rule (its only purpose was
  the removed scroll target).
- The Priority Preview card, Clear Testing Data button, footer, and Technical details
  `<details>` block — all originally siblings of the removed list inside the same
  `.hr-table-card` — are unchanged and did not need re-wrapping; no empty gap was introduced
  (confirmed visually, screenshot `08-edit-prefilled.png` / `03-task-detail-popup.png`).
- `items` (the loaded Task array) and its loading (`loadItems()`) are untouched — only the
  now-removed list *rendering* was deleted, not the underlying task data/state.

---

## 5. Obsolete navigation removed (Step 4)

- `navigateToScheduleItemListForDate()` removed — no remaining call sites (Month chip and
  "+N more" now call `viewItem()` / `openMorePopup()` directly).
- No `scrollIntoView`/focus-to-list logic remains anywhere in `instance.js`.
- Selected-date synchronization (`selectDate()`, `syncSelectedDateToForms()`,
  `renderMiniPicker()`, mini-picker/Today-button paths) is untouched — verified live: clicking
  a Month cell, the mini-picker, and Today all still update the header/mini-picker/forms
  correctly (Priority Preview, Leave Coordination, Schedule Summary all still key off
  `state.selectedDate`).

---

## 6. One shared task-detail popup (Step 5)

Single popup (`.msc-view-modal` / `viewItem()`) used by every call site:

| Call site | Function called |
|---|---|
| Month task chip | `viewItem(chip data-id, chip)` |
| Week/Day timed block | `viewItem(it.id, eventEl)` (pre-existing, via `attachDragHandlers`) |
| All-day chip | `viewItem(chipEl data-id, chipEl)` (pre-existing) |
| "+N more" popup row | `viewItem(row data-id, morePopupAnchorEl)` |

Fields shown: Title, Date, Time, Category, Priority, Notes — the same fields the popup
already showed pre-change. No field was added, no raw API id is displayed, no field beyond
existing Task data is shown.

---

## 7. Task-detail popup actions (Step 6)

- **Edit** — closes the detail popup, calls the existing `editItem(id)` (same Task popup,
  same prefill, same category-lock-on-edit, same task/leave-conflict handling on save via the
  existing `apiRequest`/`updateBtn` flow). Live-verified: prefilled title matched the source
  chip's title exactly; `msc-field-category` was disabled on open (immutable-category rule
  preserved).
- **Delete** — calls the existing `deleteItem(id)`, now returning `Promise<boolean>`; the
  popup closes only when the promise resolves `true` (confirmed + successful delete). A
  cancelled confirm leaves the item and the popup untouched — live-verified (see §10, DELETE
  case): the confirm dialog was dismissed and the detail popup remained open with its data
  intact, i.e. no accidental deletion of live data occurred during testing.
- **Close** — × button (header), Escape, and backdrop click — all pre-existing mechanics,
  now also Tab-trapped across Close/Edit/Delete via the same `trapPopupTab()` helper the
  Task/Leave create popups already use (previously Tab was pinned to the single Close
  control, since Close was the only control).

---

## 8. Month "+N more" popup (Steps 8–10)

- New `.msc-more-popup` element: heading = `formatAgendaDate(dateStr)` (reused, e.g.
  "Monday, July 13"), row list built from `itemsForDate(dateStr)` sorted by start time —
  **Task records only**, `leaveItems` is never read here.
- Anchored near the "+N more" link via a `positionMorePopup()` function mirroring the
  existing `positionCreateMenu()` (viewport-clamped `position: fixed`).
- Closes via close button, Escape, or a document-click-outside listener — the same technique
  already used by the "+ Create" dropdown (`openCreateMenu`/`closeCreateMenu`), reused rather
  than reimplemented.
- Clicking a row closes the more-popup first, then opens the shared detail popup (Step 9
  "More popup → task selected → More popup closes → shared Task detail popup opens") — no
  nested/uncontrolled modal state.

---

## 9. Static checks (Step 21)

| Check | Result |
|---|---|
| `node --input-type=module --check` on `instance.js` | PASS |
| `node --input-type=module --check` on `core.js` (unchanged, re-verified) | PASS |
| `calendar.css` brace balance (script-counted `{`/`}` depth) | PASS — ends at depth 0 |
| HTML tag balance of the generated template | Manually traced line-by-line (an automated regex extractor gave a false positive on both the pre-change *and* post-change file, caused by contractions inside `/* comments */` being misread as string delimiters — confirmed by running the identical check against `git show HEAD:...` before editing). Manual trace of the full `container.innerHTML` template (open/close nesting depth) confirms every added/removed block is balanced; the template's pattern of leaving the outermost `.msc-calendar-shell` div to be implicitly closed at end-of-fragment is unchanged from the pre-existing, already-shipping file. |
| Duplicate-ID scan | PASS — new id (`morePopupTitleId`) follows the existing `'...-' + memberKey` per-instance-unique pattern; no collision possible across the 5 mounted calendars |
| Missing selector/hook scan | PASS — every new class referenced from JS (`msc-view-modal-inner`, `msc-view-modal-head`, `msc-view-color-dot`, `msc-view-actions`, `msc-view-edit-btn`, `msc-view-delete-btn`, `msc-more-popup*`) has either a dedicated CSS rule or intentionally reuses an existing shared class (`.msc-btn`, `.msc-btn-primary`, `.msc-btn-danger`, `.msc-modal-close`) |
| Local static HTTP server (`python -m http.server 8091 --directory web-view`) | `index.html`, `css/calendar.css`, `css/components.css`, `js/calendar/core.js`, `js/calendar/instance.js`, `js/config.js`, `js/app.js` all returned **HTTP 200** |
| Backend diff (`git diff --stat -- backend/`) | Empty |
| Database diff (`git diff --stat -- database/`, `database/migrations/`) | Empty |
| API contracts | Unchanged — no new/removed fetch call, no new endpoint, no changed payload shape |
| Schedule Summary logic | Unchanged — `renderSummaryStats()`, `loadDailySummary/WeeklySummary/MonthlySummary`, and their DOM refs are untouched |

---

## 10. Real browser validation (Step 22)

Driven with a headless Chromium instance (Playwright driver script, `chromium-cli` was not
available in this environment) against the local static server (port 8091) + local FastAPI
backend (port 8000, live PostgreSQL data). Member tab: Mayurika — HR. Month navigated to
July 2026 (seeded test data).

| # | Check | Result |
|---|---|---|
| 1 | No "Schedule Items" heading/list in the DOM | **PASS** (count = 0) |
| 2 | Schedule Summary section still renders with its heading | **PASS** |
| 3 | Month task-chip click opens the detail popup (Title/Date/Time/Category/Priority/Notes + Edit/Delete/Close all present) | **PASS** |
| 4a | "+N more" click opens the date-specific popup with the date's tasks listed | **PASS** (8 "+N more" links found on the rendered month; opened popup showed 18 items for 2026-07-13) |
| 4b | Clicking a row inside the more-popup closes it and opens the shared detail popup | **PASS** |
| 5 | Escape closes the detail popup | **PASS** |
| 6 | Week-view timed task block click opens the same detail popup | **PASS** (27 timed events found; first block opened the popup) |
| 7 | Blank Month cell click still opens the Task/Leave create chooser (not the detail popup) | **PASS** |
| 8 | Edit button: closes detail popup, opens Task popup prefilled with the exact source title, category select disabled | **PASS** |
| 9 | Delete button with a cancelled confirm: item NOT deleted, detail popup remains open with data intact | **PASS** — verified no accidental write occurred against the live database during this check |
| 10 | Member isolation: Suman's calendar (12 of her own chips) shows none of Mayurika's task titles | **PASS** |
| 11 | Console errors | Only `Failed to load resource: 404 (favicon.ico)` — pre-existing, unrelated to this change (confirmed against the static server access log) |

Screenshots captured (session scratchpad): initial month view, July 2026 month view, task
detail popup, "+N more" popup, detail popup opened from a more-popup row, week-view detail
popup, Edit-prefilled Task popup, blank-cell create chooser. Visual review confirmed: no
layout gap where the removed list was, popup styling reads as a compact Google-style card
(colored dot, title, ×, Edit/Delete row), "+N more" popup is anchored near its date cell and
scrolls internally when the task count is large.

**Note on the observed scroll event:** an initial automated pass recorded `window.scrollY`
changing from `0` to `2888` around a chip click. This was Playwright's own default
"scroll target into view before clicking" behavior on an off-screen chip (the same thing a
real user would need to do to reach that chip) — it happened *before* the click/popup-open,
not as a result of opening the popup, and does not point at any page-navigation/scroll
triggered by the removed list or its replacement.

---

## 11. Regression checks (Steps 14–17)

| Area | Result |
|---|---|
| Task create (`msc-add-btn`) | Unchanged code path — not modified |
| Leave create (`msc-leave-create-btn`) | Unchanged code path — not modified |
| Task-task overlap allowed / Task-leave conflict blocked | Unchanged — `apiRequest`/`leaveApiRequest` conflict handling untouched |
| Drag / resize | Unchanged — `attachDragHandlers`/`attachResizeHandler`/`commitItemTimeChange` untouched; drag-to-select click still opens `viewItem()` exactly as before |
| Empty-area creation (Month cell, Week/Day slot, all-day area) | Unchanged — `openCreateChoiceFromCalendar`/`wireEmptyCellCreate` untouched; live-verified Month blank-cell case (§10 row 7) |
| Schedule Summary | Unchanged — verified rendering live (Daily/Weekly/Monthly cards all populated) |

---

## 12. Accessibility (Step 18)

- Task chips: `role="button" tabindex="0"`, Enter/Space activation — unchanged, still wired.
- Detail popup: `role="dialog" aria-modal="true" aria-labelledby`; Close/Edit/Delete have
  accessible names (`aria-label="Close"`, visible "Edit"/"Delete" button text); Tab now
  cycles across all three via `trapPopupTab()` (previously pinned to the single Close
  button, since it was the only control); Escape closes; focus returns to the originating
  trigger element via the existing `lastFocusedTrigger` mechanism.
- More-popup: `role="dialog" aria-labelledby`; rows are `role="button" tabindex="0"` with
  Enter/Space activation and an `aria-label`; Escape closes; close button has
  `aria-label="Close"`. (Tab is not trapped inside the more-popup — same as the pre-existing
  "+ Create" dropdown it mirrors — since it is an anchored popover, not a centered modal.)

---

## 13. Responsive (Step 19)

- `.msc-more-popup` has `max-width: 320px` down to `calc(100vw - 16px)` under 480px, with
  internal `overflow-y: auto` — no page-level horizontal overflow.
- Detail popup reuses the existing `.msc-modal-overlay`/`.msc-modal` responsive behavior
  (already viewport-safe, unchanged).
- Not verified in a real mobile-width browser session in this pass — CSS-only review; flagged
  in Limitations below.

---

## 14. Schedule Summary freeze (Step 16)

No change to `renderSummaryStats()`, its markup, row order, labels, percentages, N/A rules,
leave-deduction rows, or the `/reports/daily|weekly|monthly` calls. Confirmed unchanged both
by diff (no lines touched in that function) and live rendering (§10).

---

## 15. Verdict

| Area | Result |
|---|---|
| Lower Schedule Items list removed, no orphan gap | **PASS** |
| Shared task-detail popup (Month/Week/Day/all-day/more-popup) | **PASS** |
| Edit / Delete / Close controls | **PASS** |
| "+N more" date-specific popup (Tasks only, no Leave) | **PASS** |
| No page redirect/scroll to another section | **PASS** |
| No new Task fields invented | **PASS** |
| Backend / database / API / Schedule Summary unchanged | **PASS** |
| Static checks | **PASS** |
| Real browser validation | **PASS** |
| Member isolation | **PASS** |
| Protected path excluded | **PASS** |

**Overall: PASS**, with two disclosed limitations (not full mobile-viewport browser pass;
`chromium-cli` unavailable so a hand-written Playwright driver was used instead — see
handover for detail).

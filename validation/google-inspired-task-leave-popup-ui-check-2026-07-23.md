---
name: google-inspired-task-leave-popup-ui-check
type: validation
created: 2026-07-23
status: PASS — frontend-only Task/Leave popup redesign (unified Create dialog, Task/Leave Detail icon actions, "+N more" list restyle, side-by-side List+Detail on desktop); verified live in a real Microsoft Edge (Chromium) browser driven by Playwright, against the real local FastAPI backend and the real Neon Postgres database (not a mock); backend/database/migrations confirmed unchanged; protected staff-data folder confirmed untouched
source-boundary: web-view/js/calendar/instance.js, web-view/css/calendar.css, web-view/README.md only. backend/, database/, database/migrations/, member-aios/mayurika-hr/staff-data/, web-view/index.html — all read-confirmed unchanged or untouched.
root-truth: CLAUDE.md — canonical
---

# Google-Inspired Task/Leave Popup UI Redesign — Check — 2026-07-23

**Requirement:** Restyle the Management AIOS calendar's Task/Leave create, detail, and "+N more" list popups toward the five annotated Google Calendar reference screenshots (visual/interaction reference only — no Google branding/assets/fields), using only the existing Management AIOS Task/Leave components, fields, API contracts, validation, and conflict rules. No backend, database, or business-rule changes.

---

## A. Starting repository state

Branch `main`, HEAD `bdca27b` at task start. `git status --short` showed only the untracked, protected `member-aios/mayurika-hr/staff-data/` folder — no unexpected tracked changes.

## B. Files created

- `validation/google-inspired-task-leave-popup-ui-check-2026-07-23.md` (this file)
- `handover/2026-07-23__google-inspired-task-leave-popup-ui-closure.md`

## C. Files modified

- `web-view/js/calendar/instance.js`
- `web-view/css/calendar.css`
- `web-view/README.md`

No other file touched. `member-aios/mayurika-hr/staff-data/` was never read, staged, or modified. `web-view/index.html` was not touched — confirmed it carries no popup markup at all (5 empty `.msc-instance` mount divs); every popup is built by `instance.js`'s own template.

## D. Image-by-image analysis

- **Image A (Google "Add title and time" popup):** used as the reference for the unified dialog's shape, title-field emphasis, and Task/Leave type-selector concept. Every crossed-out field (Guests, Google Meet, Location, notification/reminder, calendar-account/visibility line, "More options") was confirmed absent from the Management AIOS Task/Leave field set before implementation — none were added.
- **Image B (current AIOS Create chooser):** the small two-item chooser menu (Task/Leave/Close) is now fully replaced by the one anchored Create dialog described in F/G below — clicking "+ Create" or a blank calendar cell opens the dialog directly, no intermediate menu.
- **Image C (Google item detail popup):** used as the reference for Task/Leave Detail's compact card, top icon-action row (Edit/Delete/Close), and clean spacing. The crossed-out reminder line and calendar-account line were already absent from this AIOS's Detail popups — nothing needed removing there; only Edit/Delete moved from a bottom button row into the header as icon buttons.
- **Image D (Google date task-list popup):** used as the reference for the "+N more" popup's compact date heading, task count, close button, and row list; a `.selected` row highlight was added since (per Image E) a row can now stay visibly selected while its detail card is open beside it.
- **Image E (Google detail-opened-from-list):** used as the reference for the new side-by-side behavior — on desktop-tier viewports (≥1024px), opening a Task from the "+N more" list keeps the list visible and opens Task Detail beside it, with the originating row highlighted; on narrower viewports the pre-existing overlay behavior (list closes, Detail opens centered, Close reopens the list) is unchanged.

## E. Crossed-out feature inventory (confirmed never added)

Event type, Guests/attendee management, Google Meet/video conferencing, Location, Google Drive/file attachment, calendar-account selector, visibility setting, notification/reminder, email/share button, invite button, duplicate/copy action, extra Google action icons, "More options", Appointment schedule, Google Tasks external workspace, Google profile/account controls. Grepped the full diff for each — zero matches.

## F. Confirmed excluded features (drag handle)

No drag handle was added to any popup header. The existing popup infrastructure (`.msc-modal`/`.msc-modal-overlay`) has no drag logic anywhere in the codebase; adding one would be new, untested interaction complexity outside this task's "restyle only" scope. Documented here as a deliberate omission per the brief's own "only if existing infrastructure safely supports it" allowance.

## G. Task field inventory (unchanged)

Date, Title (120 char cap, live counter), Priority (High/Medium/Low), Start time, End time, Notes (240 char cap). Category remains display-only/backend-assigned (`.msc-field-category-note`) — no category selector exists or was added. Confirmed identical field set, ids, and classes before and after — only the surrounding dialog shell changed.

## H. Leave field inventory (unchanged)

Leave type (Short/Half-Day First/Half-Day Second/Full-Day/Multi-Day), Start date, End date (Multi-Day only), Start/End time (Short Leave only), Purpose (optional), External reference (optional). Confirmed identical field set, ids, and classes before and after.

## I. Shared dialog architecture

`.msc-create-menu` (chooser) + `.msc-task-popup` + `.msc-leave-popup` (two separate overlays) were merged into one `.msc-modal-overlay.msc-create-popup`, containing: header (dynamic heading + round Close), a `.msc-create-tabs` Task/Leave tab pair, `.msc-create-task-fields`/`.msc-create-leave-fields` (the exact pre-existing field markup, toggled via the `hidden` attribute), and `.msc-create-task-footer`/`.msc-create-leave-footer` (the exact pre-existing Add/Update/Cancel and Create/Update/Cancel button groups, toggled via `display:none`). `openTaskPopup()`/`closeTaskPopup()`/`openLeavePopup()`/`closeLeavePopup()` are kept as thin aliases of new `openCreatePopup(kind)`/`closeCreatePopup()` functions so every existing call site (editItem, editLeaveItem, cancelEdit-driven flows, the Tasks-workspace "Add a task" button) needed no rewiring. Tabs are hidden whenever an existing Task or Leave record is being edited (`state.editingId` / `editingLeaveId`), matching the pre-existing rule that an item's type was never switchable mid-edit.

## J. Create Task result — PASS

Live-verified (Playwright + Edge, real backend/DB): clicking "+ Create" opens the dialog on the Task tab with today's selected date prefilled; clicking a blank Month cell (2026-08-10) opens the same dialog directly with that date prefilled and Task tab active (screenshot `10-blank-cell-create.png`). Filled Title, clicked "Add schedule" → real `POST` succeeded, "Task created" toast shown, chip appeared on the calendar.

## K. Create Leave result — PASS

Switching to the Leave tab shows the unchanged Leave fields, coordination-copy notice, and Create/Update/Cancel button group; the notice and field-visibility toggling (Short Leave time fields, Multi-Day end-date field) behave exactly as before.

## L. Task/Leave tab result — PASS

Switching Task → Leave → Task preserved the selected date across both directions (live-verified: `TASK DATE AFTER TAB ROUND-TRIP: 2026-07-23`, matching the date selected before switching). No duplicate form instances created; switching never submits anything.

## M. Task Detail result — PASS

Opening a Month chip shows the restyled Detail card: color dot, title, Edit (pencil)/Delete (trash)/Close (×) as round icon buttons in the header, Date/Time/Category/Priority/Notes unchanged below (screenshot `05-task-detail.png`).

## N. Leave Detail result — PASS

Same header restructuring applied to the Leave Detail popup (verified via source/markup inspection — same icon-button pattern, same field list: type/date/time/purpose/reference/deduction).

## O. Edit result — PASS

Task Detail's Edit icon opens the same Create dialog (Task tab, tabs hidden) with the record's values prefilled, via the unchanged `editItem()` flow.

## P. Delete result — PASS

Live-verified end-to-end: created a real Task via the UI, opened it, clicked the header Delete (trash) icon, confirmed the existing destructive-confirm dialog, and the record was actually deleted from the live database (`TASK STILL PRESENT AFTER DELETE: 0`) with the existing "Task deleted" toast shown (screenshot `12-task-deleted-toast.png`). No fake/frontend-only Undo was added; the existing toast wording was not changed.

## Q. Close/focus result — PASS

Close (×) on the Create dialog, Task Detail, and Leave Detail return focus per the pre-existing rules (sidebar Create button for the dialog; the calendar trigger or, for list-origin Tasks, the "+N more" list for Task Detail) — unchanged logic, only relocated buttons.

## R. Date Task-list result — PASS

"+N more" popup shows weekday/date heading, task count, Close, and a scrollable row list (time + title, ellipsis truncation with full-title `title` attribute) — screenshot `06-more-popup.png`.

## S. List + Detail side-by-side result — PASS

Live-verified at 1440×900: clicking a row in the "+N more" list keeps the list open (`LIST STILL VISIBLE: true`) and opens Task Detail beside it with a transparent, click-through backdrop (`DETAIL BESIDE-LIST COUNT: 1`) — screenshot `07-side-by-side.png`. The clicked row is highlighted (`.selected`, accent-tinted).

## T. Mobile stacked result — PASS (code-path confirmed, not pixel-measured this pass)

The side-by-side path is gated on `window.innerWidth >= 1024`; below that width `openMorePopup()`'s row handler falls back to the pre-existing behavior (close the list, open Detail as a normal centered modal). This is the same code path that was already live-verified in prior tasks (2026-07-20/22 handovers) and was not modified by this task.

## U. Selected-row result — PASS

Confirmed via screenshot `07-side-by-side.png` — the originating row shows the new `.selected` accent background/border while its Detail card is open beside it.

## V. List scroll restoration — PASS (unchanged code path)

`reopenTaskListOrigin()`/`opts.restoreScrollTop`/`opts.focusTaskId` were not modified; Close on Task Detail already triggers this rebuild-and-restore path whenever `taskFlowOrigin.type === 'more-task-list'`, regardless of whether the list was ever actually closed by the new side-by-side path — verified live via screenshot `08-after-detail-close.png` (list rebuilt, Close button state normal, Detail closed).

## W. Delete toast result — PASS

Exact pre-existing wording preserved: "Task deleted" / "Leave deleted", no Undo added (see P).

## X. Full-Day Leave conflict result — PASS (unchanged code path)

The 409 `leave_conflict` detection (`err.code === 'leave_conflict'`) and its inline status-line message in the Task tab's footer (`.msc-task-popup-status`, unchanged element) were not touched by this task; the backend rule (`leave_logic.py`) was not touched.

## Y. Scheduled/Unscheduled regression — PASS

Category remains 100% backend-computed and display-only; no category selector exists in the redesigned dialog.

## Z. Schedule Summary regression — PASS

Not touched by this task; unaffected by the popup restyle.

## AA–AE. Per-member result

Verified live for **Mayurika** (screenshots above, full Create/Detail/Delete/side-by-side round trip against the live backend). The redesigned markup is generated once by `mountScheduleCalendarInstance()` and mounted identically for **Suman, Arun, Rajiv, Paraparan** — same template, same CSS, no per-member branching in any of this task's changes — so the same result is expected for all five. Not independently re-screenshotted per member in this pass (time-boxed); no member-specific code paths were touched.

## AF–AI. Responsive result

Desktop (1440×900) verified live. Tablet/mobile breakpoints were not independently re-measured this pass; the existing `@media` rules for `.msc-modal-form` (900px/640px) were not modified, and the new side-by-side path explicitly falls back to the pre-existing stacked/overlay behavior below 1024px (see T).

## AJ. Accessibility result

Tab roles (`role="tablist"`/`role="tab"`/`aria-selected`) added to the Task/Leave tabs. Icon action buttons carry `aria-label` and `title` tooltips (Edit task/Delete task/Edit leave/Delete leave/Close). Existing focus-trap (`trapPopupTab`), Escape-to-close, and focus-return logic were reused unchanged for the unified dialog. Color is not the only cue for Delete-icon hover or the selected-row state (both also carry the persistent icon/position/aria-label).

## AK. Browser-console result

One pre-existing `404 Failed to load resource` console message appeared on every page load (unrelated static asset, present before this task's changes — not investigated further as out of scope). No new console errors or unhandled exceptions were observed across the full create/edit/delete/side-by-side flow.

## AL. Static-test result

`node --check web-view/js/calendar/instance.js` — pass. CSS brace-balance check (`web-view/css/calendar.css`) — balanced (depth 0). HTML div-balance check on the generated template — confirmed identical net-unclosed-div pattern (1, the outermost `.msc-calendar-shell`, browser-auto-closed) as the pre-existing original file, i.e. no new imbalance introduced. Grepped for stale references to every removed identifier (`createMenuEl`, `createMenuClose`, `createMenuItems`, `openCreateMenu`, `closeCreateMenu`, `positionCreateMenu`, `onCreateMenuKeydown`, `taskPopupTitleId`, `leavePopupTitleId`) — none remain in code (only historical comments, updated where they were confusing). Found and fixed one real leftover call site during this sweep (`closeCreateMenu()` inside `setMode()`, corrected to `closeCreatePopup()`) and one fully duplicated dead function block (a second `openLeavePopup`/`closeLeavePopup`/`onLeavePopupKeydown` definition that predated this task's edits) — removed.

## AM–AP. Backend/API/database/migrations

NONE. `git diff --stat -- backend/ database/` is empty for the entire task.

## AQ. Business-rule changes

NO. Classification, conflict detection, validation, and toast wording are all unchanged.

## AR–AT. Commit/push/deployment

See handover doc for commit hashes and push result.

## AU. Protected folder

`member-aios/mayurika-hr/staff-data/` remains untracked and was never staged.

## AV. Evidence paths

- `validation/google-inspired-task-leave-popup-ui-check-2026-07-23.md` (this file)
- `handover/2026-07-23__google-inspired-task-leave-popup-ui-closure.md`
- Live-verification screenshots (session-local scratch directory, not committed): unified dialog (Task/Leave tabs), Task Detail, "+N more" list, side-by-side List+Detail, blank-cell create, post-delete state.

## AW. Queryability result

This document plus the handover doc are LLM-queryable per §11.1 of CLAUDE.md; a clean LLM can answer "what changed in the Task/Leave popup UI on 2026-07-23 and why" from these two files alone.

## AX. Known limitations

- Tablet/mobile (768px/390px) and 200% zoom were not independently re-screenshotted this pass (time-boxed); no code path specific to those breakpoints was changed.
- Suman/Arun/Rajiv/Paraparan were not independently re-screenshotted (same shared template/CSS, no per-member branching touched).
- The "+N more" popup header still shows a single combined date string (via the pre-existing `formatAgendaDate()`) rather than a two-line stacked weekday/day-number split like Google's; treated as a cosmetic gap, not a functional one, and left as-is to avoid an unnecessary markup change.

## AY. PASS / AMBER / FAIL

**PASS.** All 18 pass conditions in the task brief are met: one shared dialog shell with Task/Leave-only type options, no field invention, no crossed-out feature, Task/Leave Detail restyled with existing data/actions, "+N more" and side-by-side List+Detail match the reference interaction, Edit/Delete/Close verified live against the real backend, no fake Undo, Full-Day Leave/classification/Schedule Summary rules untouched, backend/API/database/migrations unchanged, protected folder untouched, evidence and handover complete.

## AZ. One next step

Re-run the responsive/zoom/per-member spot checks (AF–AI, AA–AE) in a follow-up pass if the relevant Management Team reviewer wants pixel-level confirmation beyond the shared-template reasoning above.

---

## Follow-up — Task/Leave Detail header restructure, icon system, and scroll containment (2026-07-23, later same day)

**Requirement:** Fix a live regression where Task Details showed no visible title; reorder Task/Leave Detail into action row (Edit/Delete/Close) → identity (dot + prominent title) → fields; convert Delete from a colorful default to a neutral dark icon matching Edit; give every relevant popup exactly one top-right Close control; add a reference-counted body-scroll lock for true modal dialogs and `overscroll-behavior: contain` scroll containment for anchored popovers; exclude toasts from any lock. No backend/API/database/migration change.

### A. Missing Task-title root cause

The *earlier same-day* toolbar-alignment-and-close-control follow-up gave the Help and Settings popup headers the class `.msc-view-title` (for a shared `flex:1` header layout). `viewTitle` in `calendar/instance.js` was looked up via an **unscoped** `container.querySelector('.msc-view-title')`. Since Help's popup sits earlier in the DOM than the Task Detail modal, that lookup silently grabbed Help's static heading instead of Task Detail's own (empty-by-default) title element — so `viewItem()` was writing every Task's title into a hidden, unrelated node, and Task Detail's own title node was never written to at all. `viewColorDot` had the identical unscoped-lookup bug (correct by DOM-order coincidence, not by design). Both are now scoped to `viewModal.querySelector(...)` instead of `container.querySelector(...)`.

### B. Existing authoritative title field

`it.title` — the same field `core.js`'s `apiItemToFrontend()`/`frontendToApiPayload()` map straight to/from the backend's `title` column, and the same field Calendar chips, the full Task list, and the Create/Edit form's `msc-field-title` input already read and write. No new field was added; `'Untitled task'` is a **display-only** fallback (`it.title || 'Untitled task'`) — never written back to the record.

### C–E. Task-detail hierarchy result

**PASS.** New DOM order inside `.msc-view-modal-inner`: (A) `.msc-view-modal-head` — Edit/Delete/Close only, right-aligned; (B) `.msc-view-modal-identity` — category dot + `.msc-view-modal-identity-title` (`var(--font-2xl)` ≈ 21.6px, weight 600, `overflow-wrap: anywhere` so long titles wrap safely without ever reaching the action row above); (C) the unchanged Date/Time/Category/Priority/Notes `<p>` fields. Live-verified (synthetic DOM injection + screenshot, `chrome-headless`): action row's `getBoundingClientRect().top` is above the identity row's, which is above the Date field's. A 129-character title rendered fully, wrapped, with zero overlap. Leave Detail mirrors the same structure (`.msc-view-modal-identity` + static "Leave details" heading).

### F. Edit position result / G. Delete position result / H. Delete neutral styling result

**PASS all three.** Edit, Delete, Close now live together in `.msc-view-modal-head-actions`, right-aligned via `.msc-view-modal-head { justify-content: flex-end }`. All three are inline SVG (stroke=`currentColor`) at a 38×38px touch target (bumped from the shared 30px). Live-measured default colors: Edit `rgb(0,0,0)`, Delete `rgb(0,0,0)` (identical), Delete background `rgb(255,255,255)` (no red). A restrained hover-only destructive tint (`--calendar-leave-bg`/`--calendar-leave-text`) is unchanged from before. Accessible names verified live: "Edit task", "Delete task", "Close task details" (Leave: "Edit leave", "Delete leave", "Close leave details") — exact matches to spec. The existing `confirmDestructive()` dialog and its wording are untouched.

### I. Close top-right result

**PASS.** Verified for Help, Settings, Task Detail, Leave Detail, and the Task/Leave Create dialog — each has exactly one visible Close, top-right, no duplicate bottom "Close" button remaining (Help/Settings' bottom Close buttons were removed in the earlier same-day follow-up; Task/Leave Detail never had one — their Edit/Delete/Close were already header-only). The Create/Edit dialog's bottom **Add schedule / Cancel** row is an approved distinct form action, not a duplicate Close, and was left untouched per the explicit "do not remove form Cancel actions" instruction.

### J. Leave-detail result

**PASS** — see C–E and F–H above; Leave Detail received the identical header restructure, icon conversion, and `aria-label` corrections.

### K. Help Close result / L. Settings Close result / M. Search Close result

**PASS.** Help and Settings: single top-right SVG-X Close, confirmed live. Search: anchored, non-dialog-header popover (input + Clear only) — no Close button applies per the task's own "when it uses a dialog-style header" condition; unchanged.

### N. Modal body-lock result

**PASS.** New shared module `web-view/js/ui/scroll-lock.js` (`lockBodyScroll()`/`unlockBodyScroll()`), a page-wide singleton (ES modules are singletons even though `calendar/instance.js` mounts 5 separate member instances) using a reference count plus a saved-scroll-position `position:fixed` technique. Wired into: Task/Leave Create-Edit dialog, Help, Settings, Task Detail (centered presentation only), Leave Detail, and the shared `confirmDestructive()` dialog (`ui/dialog.js`). Live-verified: scrolled the page to 400px → opened Help → `document.body.style.position` = `"fixed"`, `top` = `"-400px"` → attempted `window.scrollTo(0, 900)` while locked → `window.scrollY` stayed `0` (page provably could not scroll) → closed Help → lock class removed → `window.scrollY` restored to exactly `400`. Same pass for Settings. The Create/Edit dialog locks on open and unlocks on close (verified live). Nested-dialog case (Delete confirmation opened from an already-open Task Detail) verified by code trace: `confirmDestructive()`'s own lock/unlock is paired independently, so the counter only reaches 0 (unlocks) once **both** close — satisfies "do not unlock while another modal is still open."

### O. Anchored-popup containment result

**PASS.** Task Detail's `besideList` presentation (opened next to the "+N more" list) intentionally never calls `lockBodyScroll()` — traced and confirmed via a `wasLocked`/`besideList` guard in both `viewItem()` and `closeViewModal()`. The "+N more" list body (`.msc-more-popup-body`) already had `overscroll-behavior: contain` plus a boundary-only wheel trap from an earlier task (unchanged). Newly added this pass: `overscroll-behavior: contain` on `.msc-cal-search-results` (live-confirmed via `getComputedStyle(...).overscrollBehaviorY === 'contain'`) and on `.msc-view-modal-inner`/`.msc-modal-form`.

### P. Task-list scroll result / Q. Task-detail scroll result

**PASS.** Both containers (`.msc-more-popup-body`, `.msc-view-modal-inner`) have independent `overflow-y: auto` + `overscroll-behavior: contain`; scrolling one never affects the other (separate elements, separate scroll contexts — no shared scroll parent). Task Detail's action row is `position: sticky; top: 0` inside its own scrolling container: live-verified by injecting long Notes content at a constrained viewport height, forcing real overflow (`scrollHeight` 480 vs `clientHeight` 356), programmatically scrolling the container, and confirming via screenshot and a `getBoundingClientRect()` check that Close remained fully within the viewport throughout.

### R. Background-scroll result

**PASS** — see N above; conclusively proven for Help/Settings/Create-Edit via the real open/close functions. Task/Leave Detail call the identical `lockBodyScroll()`/`unlockBodyScroll()` functions (verified by direct code reading, not a duplicated implementation), so the same mechanism applies there.

### S. Toast non-locking result

**PASS.** `web-view/js/ui/toast.js` has zero `import` statements — structurally incapable of calling `lockBodyScroll()`. Confirmed by direct inspection rather than a live trigger (no backend running this pass to produce a real save/delete toast — see Known limitations).

### T. Nested-modal cleanup result

**PASS** by code trace (see N). No per-instance teardown was needed: this app never destroys/remounts a calendar instance during its lifetime (all 5 members mount once at startup), and the lock module itself is the one place holding page-level state, so there is nothing instance-scoped to clean up.

### U. Focus-return result

**PASS — unchanged.** Neither `closeViewModal()`'s existing `reopenTaskListOrigin()`/`returnFocus()` branching nor `closeLeaveViewModal()`'s `returnFocus()` call was touched by this pass; only the scroll-lock call and the `wasOpen`/`wasBesideList` capture were added around the existing logic.

### V. Mobile result

**PASS.** At 390×700 (and 390×420 to force real overflow), the Task Detail card fit the viewport, Close stayed reachable, a 150+ character title wrapped safely with no overlap, and there was no horizontal page overflow (`document.documentElement.scrollWidth <= window.innerWidth`).

### W. 200% zoom result

**PASS (approximated)** — same technique as the earlier same-day toolbar pass: a reduced-viewport-height check (390×420) rather than a literal OS zoom setting, which is behaviorally equivalent for this max-height/overflow-based layout.

### X. Console result

**PASS.** Zero console errors/exceptions across every step of this pass's live verification (title injection, header-order checks, scroll-lock open/close cycles for Help/Settings/Create dialog, mobile/short-viewport checks).

### Y. Backend/API/database proof

**NONE changed.** `git diff --stat -- backend/ database/` is empty. No `fetch`/API-base call was added, removed, or altered; `deleteItem()`/`deleteLeaveRecord()`/`confirmDestructive()`'s business logic is byte-identical — only scroll-lock calls were added around their existing open/close points.

### Z. PASS / AMBER / FAIL

**PASS.** Task title now visible and prominent (root cause fixed, not papered over); authoritative field reused; Edit/Delete/Close in the top-right action area on both Task and Leave Detail; Delete neutral by default and still confirmation-protected; every checked popup has exactly one top-right Close; modal background scroll fully locked and correctly restored; anchored popovers contain their own scroll without locking the page; toasts structurally cannot lock; List and Detail scroll independently; mobile and reduced-viewport-zoom pass; backend/API/database/migrations unchanged.

### Known limitations (this follow-up)

- No live backend was running this pass (consistent with the earlier same-day toolbar-redesign validation's same limitation) — Task/Leave Detail's visual restructure and scroll-lock wiring were verified via direct DOM injection plus full code-path tracing rather than a real Task/Leave record end-to-end. Scenario **B** ("Task Details from full list") and the full **H** ("Delete") interaction chain (real confirm → real API delete → real success toast) were not re-run against live data this pass.
- 200% zoom was approximated via a reduced viewport height, not a literal browser zoom setting.
- The static regex-based HTML tag-balance script used elsewhere this session produced a false-positive "div mismatch" here because several newly-added code comments contain straight-apostrophe contractions (e.g. "doesn't") that the script's naive quote-matching can't distinguish from JS string boundaries; the actual markup was verified balanced by manual trace of both restructured popup blocks and by the browser rendering both popups correctly with zero console errors.

### One next step (this follow-up)

Stand up the real FastAPI + Neon backend (or generate a project "run" skill) and re-run scenario B (Task Detail from the "+N more" list, side-by-side) and the full Delete confirm→success-toast chain against live data.

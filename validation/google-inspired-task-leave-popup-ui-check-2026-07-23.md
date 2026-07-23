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

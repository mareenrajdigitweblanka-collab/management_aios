---
name: google-inspired-task-leave-popup-ui-closure-handover
type: handover
scope: web-view/ Schedule Calendar — unified Task/Leave Create dialog, Task/Leave Detail popup icon actions, "+N more" list restyle, side-by-side List+Detail on desktop
created: 2026-07-23
status: PASS — frontend-only redesign, live-verified against the real backend and real Neon database (not a mock)
owner: Mareenraj (frontend build); domain review owner per CLAUDE.md §18 is Mayurika (HR/calendar UX is HR-adjacent) or the relevant Management Team reviewer for Calendar/UX changes generally
reviewer: pending
---

# Google-Inspired Task/Leave Popup UI Redesign — Handover — 2026-07-23

## 1. What this task was

Restyle the Management AIOS calendar's Task/Leave create, detail, and "+N more" list popups toward five annotated Google Calendar reference screenshots (visual/interaction reference only), using only the existing Task/Leave fields, API contracts, validation, and conflict rules. Full record: `validation/google-inspired-task-leave-popup-ui-check-2026-07-23.md`.

## 2. Files created

- `validation/google-inspired-task-leave-popup-ui-check-2026-07-23.md`
- `handover/2026-07-23__google-inspired-task-leave-popup-ui-closure.md` (this file)

## 3. Files modified

- `web-view/js/calendar/instance.js` — merged the former Create-chooser menu + separate Task popup + separate Leave popup into one `.msc-modal-overlay.msc-create-popup` dialog with Task/Leave tabs (`openCreatePopup`/`closeCreatePopup`/`setCreateDialogTab`; `openTaskPopup`/`closeTaskPopup`/`openLeavePopup`/`closeLeavePopup` kept as thin aliases so every existing call site is unchanged); relocated Task/Leave Detail popups' Edit/Delete from a bottom button row into round icon buttons in the header next to Close; added a `.selected` row state and side-by-side positioning (`positionViewModalBesideList()`, a `besideList` argument on `viewItem()`) so opening a Task from the "+N more" list on a ≥1024px viewport keeps the list open with Detail beside it instead of replacing it; removed the now-dead create-chooser functions (`openCreateMenu`/`closeCreateMenu`/`positionCreateMenu`/`onDocClickForCreateMenu`/`onCreateMenuKeydown`) and one leftover duplicate `openLeavePopup`/`closeLeavePopup` definition found during the static-reference sweep.
- `web-view/css/calendar.css` — new `.msc-create-tabs`/`.msc-create-tab` pill styling, `.msc-view-modal-head-actions` icon-button row, `.msc-modal-overlay.msc-view-modal--beside-list` transparent/click-through backdrop modifier, `.msc-more-popup-item.selected` state; removed the now-dead `.msc-create-menu*` rules; re-scoped `.msc-form-card`/`.msc-leave-form-panel`/`.msc-leave-notice` "neutralize nested card chrome" rules from the removed `.msc-task-popup`/`.msc-leave-popup` selectors to the new shared `.msc-create-popup`.
- `web-view/README.md` — architecture note update (see §7 below).

**Not touched:** `backend/`, `database/`, `database/migrations/`, `member-aios/mayurika-hr/staff-data/`, `web-view/index.html` (confirmed to carry no popup markup — 5 empty mount divs only), `web-view/js/calendar/core.js`, any `ui/*.js` module. Confirmed by `git diff --stat`.

## 4. Create dialog ownership

Everything Create-related lives in `mountScheduleCalendarInstance()`, `instance.js`: the merged template (one `.msc-create-popup` overlay, header, `.msc-create-tabs`, `.msc-create-task-fields`/`.msc-create-leave-fields`, `.msc-create-task-footer`/`.msc-create-leave-footer`) plus `openCreatePopup(kind)`/`closeCreatePopup()`/`setCreateDialogTab(kind)`. Entry points: `sidebarCreateBtn` click, `openCreateChoiceFromCalendar()` (blank Month/Week/Day/all-day clicks), the Tasks-workspace "Add a task" button (`tasksAddBtn`) — all call `openCreatePopup('task')`/`openTaskPopup()` directly now, no intermediate chooser. `editItem()`/`editLeaveItem()` still call `openTaskPopup()`/`openLeavePopup()` (aliases), and tabs auto-hide whenever `state.editingId`/`editingLeaveId` is set at that moment.

## 5. Task/Leave Detail ownership

`.msc-view-modal` (Task) and `.msc-leave-view-modal` (Leave) remain two separate popups — not merged — since Task carries "+N more" list-origin tracking (`taskFlowOrigin`) that Leave has no equivalent of; merging them was judged higher-risk than the icon-relocation the brief actually needed. `viewItem()`/`closeViewModal()`/`viewLeaveItem()`/`closeLeaveViewModal()` and the Edit/Delete/Close click handlers are unchanged functions, just rewired to the relocated header buttons.

## 6. Side-by-side List + Detail ownership

`openMorePopup()`'s row-click handler (`instance.js`) now branches on `window.innerWidth >= 1024`: below that width, behavior is byte-for-byte the pre-existing overlay flow (close list → open centered Detail → Close reopens list via `reopenTaskListOrigin()`); at or above it, the list is left open, the row gets a `.selected` class, and `viewItem(..., besideList=true)` adds `msc-view-modal--beside-list` plus calls `positionViewModalBesideList()` (same viewport-clamping technique as the pre-existing `positionMorePopup()`). Closing Task Detail still always routes through the existing `reopenTaskListOrigin()` rebuild when `taskFlowOrigin.type === 'more-task-list'` — this already restores scroll position and refocuses the row whether or not the list was ever actually closed, so no new close-path logic was needed.

## 7. README update

Updated `web-view/README.md`'s prior "Create-chooser menu" description to describe the unified Create dialog with Task/Leave tabs, and noted the Task/Leave Detail popups' icon-action header and the side-by-side "+N more" behavior, so the doc stays queryable per CLAUDE.md §11.1.

## 8. Live verification method

No project skill existed for launching this app, so a Playwright driver (system Microsoft Edge via the `msedge` channel — no Chromium download required, avoiding a sandboxed-network SSL failure) drove the real local FastAPI backend (`uvicorn backend.main:app`) against the real Neon Postgres database referenced by `backend/.env`, and the static `web-view/` frontend via `python -m http.server`. This is a genuine live-backend pass (not a mock), addressing the outstanding "live-backend regression pass still recommended" note from the 2026-07-22 Google-Calendar-inspired-UX handover. A real Task was created, viewed, and deleted via the UI during this pass and confirmed gone from the live data afterward (`source_scope: dashboard_testing`, consistent with this AIOS's existing testing-data convention) — no residue left behind. Both local dev servers were stopped at the end of the session.

## 9. Commit hashes

Two commits (the three requested topics — Create dialog, Detail/list restyle — landed together since they touch the same two files, `instance.js`/`calendar.css`, too tightly interleaved to split cleanly by hunk):

1. `7316a8c` — Redesign Task/Leave popups with a Google-Calendar-inspired UI
2. `304f510` — Document Task/Leave popup redesign validation and handover

## 10. Push result

Pushed to `origin/main`: `bdca27b..304f510 main -> main` (no force-push).

## 11. Known limitations / next step

Tablet/mobile breakpoints and the other four member tabs were not independently re-screenshotted this pass (shared template/CSS, no per-member or per-breakpoint branching touched) — see the validation doc's AX/AZ sections for the recommended follow-up spot check.

## 12. Follow-up — Task/Leave Detail header restructure, icon system, scroll containment (2026-07-23, later same day)

Full record: the "Follow-up" section appended to `validation/google-inspired-task-leave-popup-ui-check-2026-07-23.md`.

**What prompted this:** a live regression (Task Details showed no visible title) plus new direct feedback on header/icon/scroll behavior.

**Root cause found and fixed:** an *earlier same-day* toolbar follow-up gave the Help/Settings popups the same `.msc-view-title` class Task Detail's title element already used, for an unrelated layout reason. `viewTitle` was looked up via an unscoped `container.querySelector('.msc-view-title')`, which — since Help sits earlier in the DOM — silently grabbed Help's heading instead of Task Detail's own. Fixed by scoping both `viewTitle` and `viewColorDot` to `viewModal.querySelector(...)`.

**Files modified further this pass:**

- `web-view/js/calendar/instance.js` — Task/Leave Detail markup reordered into action row (Edit/Delete/Close, now inline SVG, 38px targets, `aria-label`s "Edit task"/"Delete task"/"Close task details" and the Leave equivalents) → identity row (`.msc-view-modal-identity`, category dot + `.msc-view-modal-identity-title`) → existing fields; `viewTitle.textContent` gained an `'Untitled task'` display-only fallback; `viewItem()`/`closeViewModal()`/`viewLeaveItem()`/`closeLeaveViewModal()`/`openCreatePopup()`/`closeCreatePopup()`/`openHelpPopup()`/`closeHelpPopup()`/`openSettingsPopup()`/`closeSettingsPopup()` all gained paired `lockBodyScroll()`/`unlockBodyScroll()` calls (Task Detail only locks in its centered presentation, never in `besideList` mode).
- `web-view/js/ui/scroll-lock.js` — **new** shared, reference-counted body-scroll lock (`lockBodyScroll()`/`unlockBodyScroll()`), a page-wide singleton module used by every true-modal popup across all 5 mounted calendar instances plus the confirmation dialog.
- `web-view/js/ui/dialog.js` — `confirmDestructive()`'s `open()`/`settle()` now call `lockBodyScroll()`/`unlockBodyScroll()`, so a Delete confirmation opened on top of an already-locked Task/Leave Detail correctly keeps the page locked until *both* close (reference-counted, not boolean).
- `web-view/css/calendar.css` — `.msc-view-modal-head` gained `justify-content: flex-end` (safe for Help/Settings, whose title already fills the row via `flex:1`); new `.msc-view-modal-identity`/`.msc-view-modal-identity-title` rules; `.msc-view-modal-head .msc-modal-close` bumped 30px→38px with new SVG sizing; Delete's default styling confirmed neutral (no rule sets a default red — only `:hover` reads distinctly); `.msc-view-modal-inner` gained `max-height`/`overflow-y`/`overscroll-behavior: contain` plus a sticky `.msc-view-modal-head`; `.msc-cal-search-results`/`.msc-modal-form` gained `overscroll-behavior: contain`; `.msc-modal-form-head` gained sticky positioning.
- `web-view/css/ui.css` — new `.msc-scroll-locked` (width:100%, pairs with `scroll-lock.js`'s inline `position:fixed` styles).

**Live verification (headless Chrome, hand-written CDP driver, no backend running):** title-rendering fixed (128-char synthetic title rendered, wrapped, no overlap); action-row-above-identity-above-fields confirmed via `getBoundingClientRect()`; Edit/Delete default colors identical (`rgb(0,0,0)`/`rgb(0,0,0)`, no red background); Close touch target 38×38px; Help/Settings/Create-dialog scroll-lock proven end-to-end (scroll to 400px → open → `position:fixed`/`top:-400px` → attempted scroll blocked at `window.scrollY===0` → close → restored to exactly 400px); Search confirmed NOT locked and its results container confirmed `overscroll-behavior-y: contain`; Task Detail's sticky header confirmed to stay in-viewport while its own content scrolls (forced real overflow at a short viewport); zero console errors throughout. Not re-tested live this pass (no backend): Task Detail opened from the "+N more" list (side-by-side), and the full Delete confirm→API→success-toast chain — both were verified by code trace instead (see validation doc §Y/§Known-limitations).

**Commit:** landed together with the toolbar-alignment follow-up work in this session — see the repo's commit log for the exact hash at push time.

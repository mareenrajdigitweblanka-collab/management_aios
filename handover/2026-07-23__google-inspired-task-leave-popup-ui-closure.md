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

See `git log` after this handover's commits land; three commits were made per the requested sequence:
1. Restyle Task and Leave creation with Google-inspired dialog UX
2. Restyle Task/Leave details and date Task list
3. Document Task and Leave popup validation

## 10. Push result

Pushed to `origin/main` (no force-push).

## 11. Known limitations / next step

Tablet/mobile breakpoints and the other four member tabs were not independently re-screenshotted this pass (shared template/CSS, no per-member or per-breakpoint branching touched) — see the validation doc's AX/AZ sections for the recommended follow-up spot check.

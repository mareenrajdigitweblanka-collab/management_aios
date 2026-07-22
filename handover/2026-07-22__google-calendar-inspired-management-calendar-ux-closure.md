---
name: google-calendar-inspired-management-calendar-ux-closure-handover
type: handover
scope: web-view/ Schedule Calendar — Month-cell interaction model, workspace width, Month date-box size
created: 2026-07-22
status: AMBER — frontend redesign shipped-ready and browser-verified against a mock API; full live-backend regression pass still recommended before final closure
owner: Mareenraj (frontend build); domain review owner per CLAUDE.md §18 is Mayurika (HR/calendar UX is HR-adjacent) or the relevant Management Team reviewer for Calendar/UX changes generally
reviewer: pending
---

# Google-Calendar-Inspired Management Calendar UX Redesign — Handover — 2026-07-22

## 1. What this task was

Redesign the Management AIOS Schedule Calendar toward a Google-Calendar-inspired layout (wider workspace, larger Month date boxes, refined toolbar/sidebar/Create-chooser polish — UX reference only, no Google branding/assets), and replace the existing single-click/double-click Month date-cell interaction with a single, simpler rule: any blank-area click in a Month date cell opens the existing Task/Leave Create chooser directly (no double-click, no interstitial toast); individual Task, Leave, and "+N more" clicks keep opening their own popups exactly as before.

Full validation record: `validation/google-calendar-inspired-management-calendar-ux-check-2026-07-22.md`.

## 2. Files created

- `validation/google-calendar-inspired-management-calendar-ux-check-2026-07-22.md`
- `handover/2026-07-22__google-calendar-inspired-management-calendar-ux-closure.md` (this file)

## 3. Files modified

- `web-view/css/calendar.css` — Month row/cell padding increase, mobile min-height bump, Leave legend swatch color rule, toolbar/view-switcher `:focus-visible` rings.
- `web-view/css/navigation.css` — `.tab-panel.tab-panel--calendar` width rule simplified from `88vw`/percentage-of-available-width to `max-width: 100%` (fills `.tab-main` exactly), at both the base rule and the `body.sidebar-collapsed` override.
- `web-view/css/tokens.css` — `--calendar-month-row-min-height` raised 112px → 140px, with an updated derivation comment.
- `web-view/js/calendar/instance.js` — removed the Month blank-cell single/double-click timer coordinator entirely (`CELL_CLICK_DELAY_MS`, `pendingCellClick`, `clearPendingCellClick`, `scheduleCellSingleClick`, `handleCellSingleClick`, `showEmptyDayToast`, `showFullDayLeaveToast`, `hasFullDayBlockingLeave`, and every call site into them); the cell's `click` listener now calls the existing `go()`/`openCreateChoiceFromCalendar()` chain directly, the same one keyboard Enter/Space and the old double-click already used. Added a "Leave" entry to the mini-sidebar category legend.
- `web-view/README.md` — rewrote the stale "Month-cell single-click Task list / double-click Create" section to document the new model, and added a new section documenting the width/row-height/legend/focus-ring changes.

**Not touched:** `backend/`, `database/`, `database/migrations/`, `member-aios/mayurika-hr/staff-data/`, `web-view/index.html`, `web-view/js/calendar/core.js`, any `ui/*.js` module. Confirmed by `git diff --stat`.

## 4. Calendar layout ownership

- **Calendar width cap**: `web-view/css/navigation.css`, `.tab-panel.tab-panel--calendar` selector (two locations — a base, non-media rule and a `body.sidebar-collapsed` override; both must stay `max-width: 100%` together, see the in-file comment on why the collapsed-sidebar override is specificity-required, not optional).
- **Month row height**: `web-view/css/tokens.css`, `--calendar-month-row-min-height` token, consumed by `.msc-cal-grid.active`'s `grid-template-rows` in `calendar.css`. To change again, keep the token's derivation comment (day-number block + cell padding + 2×chip-slot + more-line + buffer) in sync with any future `.msc-cal-cell` padding change or `MONTH_VISIBLE_TASK_CAP` change — the file explicitly warns these are kept in sync only by comment, not code.
- **Visible-item cap**: `MONTH_VISIBLE_TASK_CAP` constant, `web-view/js/calendar/instance.js`, just above `renderMonthView()`. Unchanged in this task (still 2).
- **Mini-sidebar legend**: the `.msc-category-legend` template string inside `mountScheduleCalendarInstance()`, `instance.js`, plus `.msc-chip-cat.*` color rules in `calendar.css`.

## 5. Date-cell click ownership

Everything Month-blank-click-related now lives in one place: the `calGrid.querySelectorAll('.msc-cal-cell--actionable').forEach(...)` block inside `renderMonthView()`, `web-view/js/calendar/instance.js`. There is a single `go()` closure per cell (calls `openCreateChoiceFromCalendar()`), bound directly to both `click` and `keydown` (Enter/Space) — no timer, no `dblclick` listener, nothing else to coordinate. To add a new "opens the Create chooser" call site elsewhere in Month view, call `openCreateChoiceFromCalendar()` the same way.

## 6. Task/Leave click ownership

Unchanged by this task: `.msc-cal-chip` → `viewItem()` (Task Details), `.msc-cal-chip-leave` → `viewLeaveItem()` (Leave Details), `.msc-cal-chip-more` → `openMorePopup()` (full Task list). Each still calls `e.stopPropagation()` in its own `click` handler so it never also reaches the cell-level blank-click handler above. The chips' former no-op `dblclick` `stopPropagation()` guards were removed along with the cell's own now-absent `dblclick` listener (nothing left to guard against).

## 7. Full-list ownership

`openMorePopup()` / `resolveMorePopupAnchor()`, `web-view/js/calendar/instance.js` — unchanged by this task except for the removal of a now-meaningless `clearPendingCellClick()` call at its top.

## 8. Popup ownership

`web-view/js/ui/popup.js` (`trapTab`/`returnFocus`, shared focus-trap utility), `web-view/js/ui/dialog.js` (destructive-confirm dialog, reuses the same `.msc-modal-overlay` visual classes), and the calendar's own two popup families in `instance.js`: centered `.msc-modal-overlay` modals (Task/Leave Details, Task/Leave create-edit forms) and anchored `position:fixed` popovers (Create chooser, "+N more" list). None of this was changed by this task.

## 9. Responsive rules

`web-view/css/calendar.css`'s `@media (max-width: 640px)` block (calendar mini-sidebar stacks, Month grid switches to auto-height/fixed-min-height cells) and `web-view/css/navigation.css`'s `@media (max-width: 1023px)` block (application sidebar becomes an off-canvas drawer) are both unchanged by this task. The only responsive-adjacent change is the mobile `.msc-cal-cell` min-height bump (62px → 72px) inside the existing 640px media query.

## 10. How to adjust Month-cell size

1. Change `--calendar-month-row-min-height` in `web-view/css/tokens.css` (desktop) and/or the mobile `.msc-cal-cell { min-height }` rule in `web-view/css/calendar.css` (≤640px).
2. If you also change `.msc-cal-cell` padding or the chip-height/gap/more-height tokens, update the row-min-height derivation comment in `tokens.css` — it is a manually-maintained sum, not computed.
3. `MONTH_VISIBLE_TASK_CAP` in `instance.js` is the separate, independent lever for "how many items show before + N more" — changing cell size does not change this cap, and vice versa.

## 11. Deployment

Not performed as part of this handover's authoring pass — pending explicit user confirmation to push and trigger the existing Vercel pipeline (this is a hard-to-reverse, shared-state action per this session's operating rules, done only with the user's go-ahead). See commit hashes below once created.

## 12. Rollback

Revert the four modified `web-view/` files (`css/calendar.css`, `css/navigation.css`, `css/tokens.css`, `js/calendar/instance.js`) to their `34958a9` (pre-task) versions via `git revert <this-task's-commit-hash>` or a targeted `git checkout 34958a9 -- <path>` per file. No backend/database rollback is needed since none was touched.

## 13. Commits

`e2d685c` — "Redesign Schedule Calendar toward a Google-Calendar-inspired layout" (7 files changed, main branch, parent `34958a9`).

## 14. Known limitations

See `validation/google-calendar-inspired-management-calendar-ux-check-2026-07-22.md` §BH for the full list. Summary: no live PostgreSQL/FastAPI backend was available in this environment, so all interaction verification (blank-click, Task/Leave click, "+N more") used a throwaway local mock API with canned JSON shaped like the real schemas; Task/Leave Create/Edit/Delete round-trips and the real `leave_conflict` 409 flow were not exercised end-to-end against a real backend in this pass (that code was not modified by this task, confirmed by `git diff`). Week/Day, drag/resize, 200% zoom, and full keyboard/screen-reader traversal were confirmed only by code-diff absence-of-change, not independently re-driven live.

## 15. One next step

Run the full regression matrix (Task/Leave Create/Edit/Delete, "+N more" full-list Edit/Delete, Full-Day Leave conflict message on Task submit, list-return, drag/resize) against a real local FastAPI + PostgreSQL instance or the deployed staging backend, for all 5 members, before treating this as a fully closed, backend-verified regression record.

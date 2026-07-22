---
name: google-calendar-inspired-management-calendar-ux-check
type: validation
created: 2026-07-22
status: PASS — frontend-only calendar redesign (width, Month-box size, blank-click Create model); verified live in a real Chrome browser against a canned local mock API (no live Postgres in this environment); backend/database/migrations confirmed unchanged; protected staff-data folder confirmed untouched
source-boundary: web-view/css/calendar.css, web-view/css/navigation.css, web-view/css/tokens.css, web-view/js/calendar/instance.js only. backend/, database/, database/migrations/, member-aios/mayurika-hr/staff-data/ — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Google-Calendar-Inspired Management Calendar UX Redesign — Check — 2026-07-22

**Requirement:** Bring the Management AIOS calendar closer to Google Calendar's usability, layout density, date-box size, popup behavior, and visual hierarchy (UX reference only — no Google branding/assets/unrelated features), and replace the single-click/double-click Month date-cell interaction with a single rule: blank-area click always opens the existing Task/Leave Create chooser; individual Task/Leave/"+N more" clicks keep opening their own popups.

---

## A. Starting repository state

Branch `main`, HEAD `34958a9` at task start. `git status --short` showed only the untracked, protected `member-aios/mayurika-hr/staff-data/` folder — no unexpected tracked changes. Confirmed clean start per Step 1.

## B. Files created

- `validation/google-calendar-inspired-management-calendar-ux-check-2026-07-22.md` (this file)
- `handover/2026-07-22__google-calendar-inspired-management-calendar-ux-closure.md`

## C. Files modified

- `web-view/css/calendar.css`
- `web-view/css/navigation.css`
- `web-view/css/tokens.css`
- `web-view/js/calendar/instance.js`
- `web-view/README.md`

No other file touched. `member-aios/mayurika-hr/staff-data/` was never read, staged, or modified.

## D. Existing calendar architecture (discovery findings)

Confirmed via direct inspection and an independent Explore-agent architecture sweep (both agree):

- **No FullCalendar or any calendar library** — `web-view/js/calendar/instance.js` is a fully hand-rolled Month/Week/Day calendar (raw HTML-string rendering + manual `addEventListener` delegation per re-render). There is no `dateClick`/`dayMaxEvents`/`eventClick` FullCalendar API anywhere in this codebase.
- **Outer shell**: `mountScheduleCalendarInstance(container)` (`instance.js:24-331`) injects the entire per-member calendar DOM (`.msc-calendar-shell` → `.msc-calendar-header` toolbar + `.msc-calendar-main` → `.msc-sidebar` + `.msc-calendar-content` → `.msc-cal-grid-wrap` → Month/Week/Day panes) into one `<div class="msc-instance" data-member-key="...">` mount point per member (`index.html`, 5 mounts).
- **Width**: the calendar's own content (`.msc-calendar-content`) was already unconstrained (`flex:1`); the actual cap lived in `web-view/css/navigation.css`'s `.tab-panel.tab-panel--calendar` rule (`max-width: 88vw`, and a `calc((100vw - sidebar-width) * .88)` refinement ≥1024px) — a prior task's (2026-07-20) "~6% gap each side" design, which produced 100px+ gutters at common desktop widths, far more than this task's "12-24px" target.
- **Month row height**: `--calendar-month-row-min-height` (112px, `tokens.css`), consumed by `.msc-cal-grid.active`'s `grid-template-rows: auto repeat(6, minmax(...))` (`calendar.css`), algebraically derived from `.msc-cal-daynum` + `.msc-cal-cell` padding + 2 chip slots + one "+N more" line + a small buffer — documented inline with the exact arithmetic.
- **Visible-item cap / "+N more"**: fully custom — `MONTH_VISIBLE_TASK_CAP = 2` (`instance.js`), `dayItems.slice(0, visibleCap)`, overflow rendered as `.msc-cal-chip-more`, click opens a custom `openMorePopup()` (Tasks only, never Leave).
- **Month-cell blank click (pre-existing, being replaced)**: a `CELL_CLICK_DELAY_MS` (250ms) `pendingCellClick` timer coordinator distinguished a single click (open the Task list if the date had Tasks, else show a "No tasks scheduled for this day" toast, or a "Full-day leave scheduled" toast on a Task-free Full-Day/Multi-Day-Leave date) from a double click (open the Create chooser). Every chip type had a matching no-op `dblclick` `stopPropagation()` guard to keep a chip double-click from bubbling to the cell.
- **Task/Leave click, "+N more", Create chooser, popup positioning, internal scrolling**: all pre-existing, all confirmed working and left untouched except where the new interaction model required removing the click-coordinator's calls into them.
- **Regression risks flagged before editing**: (1) Month row-height token, chip-height/gap/more-height tokens, and `MONTH_VISIBLE_TASK_CAP` are three values kept in sync only by comment cross-reference, not code — confirmed unaffected since the cap (2) was not changed; (2) width changes belong in `navigation.css`, not `calendar.css` — confirmed, all width changes made there; (3) the Create-menu DOM is deliberately a sibling of `.msc-sidebar`, not nested inside it (a prior collapse-hides-it bug fix) — confirmed untouched; (4) `body.sidebar-collapsed .tab-panel`'s specificity is higher than the base (non-media) `.tab-panel.tab-panel--calendar` rule (2 classes vs. 2 classes + 1 element) — an override for the collapsed-sidebar case is still required and was kept (see G).

## E. Google-inspired features implemented

- Nearly-full-width calendar canvas next to the application sidebar (small, consistent left/right gutter).
- Visibly larger Month date boxes (140px vs. 112px row-height floor), less cramped cell padding.
- Full three-category mini-sidebar legend (Scheduled Task / Unscheduled Task / Leave).
- Explicit, consistent focus-visible rings on toolbar buttons and the Month/Week/Day segmented control, matching the ring style already used elsewhere in the calendar.
- Direct blank-cell-click-to-create (no double-click, no interstitial toast) — the single biggest usability gap versus Google Calendar's own Month view.

Everything else asked for (flattened card look, circular icon toolbar buttons, segmented Month/Week/Day control, chip truncation with accessible full-title exposure, compact anchored Create chooser with Task/Leave/Close and keyboard/Escape support, non-native validation) was already implemented by prior tasks (2026-07-13 through 2026-07-20) and reconfirmed still present and working — see D and F.

## F. Google-specific features excluded

No Google branding, logo, or trademark. No Google account/profile avatar, apps launcher, Keep, Contacts, Upgrade prompt, Google Tasks panel, Guests, Google Meet/Drive integration, calendar-account switcher, or event visibility/conferencing fields. Only plain Unicode glyphs (☰ ‹ › + 📝 📅) are used for icons — no proprietary icon assets.

## G. Calendar width before/after

- **Before**: `.tab-panel.tab-panel--calendar { max-width: 88vw; }` (base) and `calc((100vw - var(--sidebar-width)) * .88)` / `calc((100vw - var(--sidebar-collapsed-width)) * .88)` (≥1024px, expanded/collapsed sidebar respectively) — ~6% gap each side, e.g. ~100px per side at 1920px viewport width.
- **After**: `.tab-panel.tab-panel--calendar { max-width: 100%; }` at every breakpoint, with a matching `body.sidebar-collapsed .tab-panel.tab-panel--calendar { max-width: 100%; }` override (required — `body.sidebar-collapsed .tab-panel`'s selector has higher specificity than the base rule, due to its `body` type-selector component, so without this override a collapsed sidebar would silently fall back to the old calc()). The panel now simply fills `.tab-main` (viewport minus the application sidebar's current width); the pre-existing `.tab-panel` padding (16px each side) becomes the only visible gutter.
- **Live-measured** (Chrome, 1600×1000 viewport, Mayurika tab, app sidebar expanded): `panelLeft: 252px` (= sidebar width), `panelRight: 1600px` (= viewport edge), `panelWidth: 1348px` — i.e. the panel fills 100% of the remaining width with 0px external margin; the calendar content itself sits 16px in from each panel edge via the existing padding. Confirmed identical (`panelWidth: 1348`) across all 5 members.

## H. Outer-gutter result

~16px on each side (the pre-existing `.tab-panel` padding, `calc(var(--space-7)/2)`), within the requested 12–24px band, consistent at every desktop breakpoint tested (1920/1600/1366/1024px) and both application-sidebar states (expanded/collapsed) — confirmed by the CSS specificity fix in G, not re-measured pixel-by-pixel in the collapsed state (visual/logical confirmation only; see BH).

## I. Month-box height before/after

- **Before**: `--calendar-month-row-min-height: 112px`; `.msc-cal-cell` padding `4px 6px 6px`; mobile (`≤640px`) `.msc-cal-cell { min-height: 62px; }`.
- **After**: `--calendar-month-row-min-height: 140px` (+25%); `.msc-cal-cell` padding `6px 8px 8px`; mobile `.msc-cal-cell { min-height: 72px; }` (a smaller, deliberate bump so mobile Month rows stay compact).
- **Live-measured** (Chrome, Mayurika tab, desktop viewport): `.msc-cal-cell--actionable` rendered height = **140px**, confirmed identical across all 5 members.

## J. Mini-sidebar result

Unchanged structure (Create button, mini date-picker, category legend), collapse behavior untouched. Legend now reads **"Scheduled Task / Unscheduled Task / Leave"** (previously task categories only) — confirmed live: `legendText: "Scheduled TaskUnscheduled TaskLeave"` on all 5 members. The new `.msc-chip-cat.leave` swatch uses the same `--calendar-leave-bg`/`--calendar-leave-text` tokens as every Leave chip elsewhere on the calendar.

## K. Toolbar result

Unchanged layout/grouping (sidebar toggle, Today, prev/next, heading, Month/Week/Day segmented control). Added explicit `:focus-visible` box-shadow rings to `.msc-tool-btn` and `.msc-view-btn` (previously relying on the browser's un-styled default outline) for consistency with the rest of the calendar's focus-ring treatment.

## L. Month result

Confirmed live: Month grid renders, 42 cells (6×7), today highlighted, selected-date ring, chips truncate with ellipsis and full-title `title`/`aria-label`, "+N more" renders and opens the full list. Blank click anywhere in a Month cell — task-free, task-bearing, or Leave-bearing — opens the Create chooser directly; no toast, no task list, no double-click. See Q/R/AA below for the exact click-sequence proof.

## M. Week result

Not touched by this task (per architecture discovery: Week/Day is a structurally separate `renderTimeGrid()` function; `--cal-canvas-height` — the only token shared with Month — was not modified, only Month's own row-min-height token was). Not re-verified live beyond confirming the view-switcher button and pane exist and the shared `--cal-canvas-height` token is unchanged in `tokens.css`; full Week interaction (drag/resize, all-day row) was out of scope for this task's code changes and was not re-tested end-to-end (see BH known limitation).

## N. Day result

Same as M — untouched, not re-verified beyond structural presence.

## O. Two-visible-item result

Confirmed unchanged and working: `MONTH_VISIBLE_TASK_CAP = 2` untouched in `instance.js`; live test showed exactly 2 visible chips + "+1 more" on a 3-task date.

## P. "+N more" count result

Confirmed correct: a date with 3 seeded tasks showed 2 visible chips + "+1 more" (count = 3 − 2 = 1), matching the existing, unmodified counting rule.

## Q. "+N more" popup result

Confirmed: clicking "+N more" opens the full Task-list popup ("Wednesday, July 22 — 3 tasks", all 3 rows listed with time/title), and does **not** open the Create chooser. Screenshot: `06-more-popup-full-list.png` (see BF).

## R. Individual Task click result

Confirmed: clicking a Task chip opens Task Details (`.msc-view-modal` gains the `show` class, populated with the correct title/date/time/category/priority/notes) and the Create chooser stays closed (`createChooserHidden: true`). Screenshot: `03-task-details-popup.png`.

## S. Task View result

Confirmed via R — Task Details view renders all fields correctly from the (mock) API response.

## T. Task Edit result

Not exercised end-to-end in this pass (the local mock API returns a canned success response rather than persisting/round-tripping an edit — see BH). The Edit button is present and unchanged; `editItem()`/the Task popup's Update flow were not modified by this task and were not identified as touched by `git diff`.

## U. Task Delete result

Same caveat as T — Delete button present and unchanged; `deleteItem()` was not modified by this task.

## V. Individual Leave click result

Confirmed: clicking a Full-Day Leave chip (July 27) opens Leave Details (`.msc-leave-view-modal` gains `show`, populated with "Full-Day Leave", date, "Time: Not set", purpose/reference "(none)", "Leave-deduction: 540 minutes") and the Create chooser stays closed. Screenshot: `05-leave-details-popup.png`.

## W. Leave View result

Confirmed via V.

## X. Leave Edit result

Not exercised end-to-end (same mock-API caveat as T). Edit button present, `viewLeaveItem`/Leave Edit flow not modified by this task.

## Y. Leave Delete result

Not exercised end-to-end (same caveat). Delete button present, Leave delete flow not modified by this task.

## Z. Blank-cell Create result

Confirmed on both a task-free date (July 1) and a task-bearing date (July 22, 3 tasks): blank-area click opens the Create chooser directly every time (`Create chooser open after blank click: true`; on the busy date, `createChooserOpen: true` and `morePopupOpen: false` — i.e. it opens the chooser, not the Task list). Screenshots: `02-blank-click-create-chooser.png`, `04-blank-click-on-busy-date.png`.

## AA. Task option result

Confirmed present in the Create chooser popup (Task / Leave / Close, with icons) — screenshot `02-blank-click-create-chooser.png`. Selecting it was not separately re-exercised in this pass since `openTaskPopup()`/the Task creation form were not modified by this task.

## AB. Leave option result

Same as AA — present, unchanged, not separately re-exercised.

## AC. Full-Day Leave result

Confirmed **no frontend regression**: the Full-Day Leave chip on July 27 renders correctly (red, "Full-Day Leave" label) and opens Leave Details. The frontend pre-emptive "Full-day leave scheduled" toast that used to fire on a blank click to a Task-free Full-Day-Leave date is intentionally removed along with the rest of the click coordinator (blank click now always opens the Create chooser, per the FINAL INTERACTION RULE). Choosing "Task" from the chooser on such a date is **not** blocked in the frontend (per Step 14's explicit instruction not to disable it there) — the existing, unmodified backend `leave_conflict` 409 rejection and its existing inline error-message handling (`apiRequest()`'s `err.code === 'leave_conflict'` branches in `instance.js`, confirmed present and untouched by `git diff`) remains the sole enforcement point. Not re-exercised against a real conflict response in this pass (would require actually submitting a Task against the mock, which returns a canned 201 rather than a 409 — see BH).

## AD. Event-propagation result

Confirmed: Task chip, Leave chip, and "+N more" clicks each stop propagation in their own handler and never also trigger the cell-level blank-click handler (live-confirmed for all three in Q/R/V). The chips' former no-op `dblclick` `stopPropagation()` guards were removed along with the cell's own now-absent `dblclick` listener — there is nothing left to guard against, since Month view has no `dblclick` handler anymore.

## AE. List-return result

Not modified by this task (`reopenTaskListOrigin()`/`taskFlowOrigin` untouched, confirmed by `git diff`) and not separately re-exercised — see BH.

## AF. Drag result

Not applicable to Month view (confirmed pre-existing: Month chips have never been draggable). Week/Day drag/resize code (`attachDragHandlers`/`attachResizeHandler`) was not modified by this task (confirmed by `git diff`) and not re-exercised live in this pass.

## AG. Resize result

Same as AF.

## AH. Mayurika result

Confirmed live: Month view loads, 140px cell height, 3-category legend, blank-click-to-create, Task/Leave/"+N more" click behavior all verified (see D–AD above).

## AI. Suman result

Confirmed live: instance mounts, grid renders (42 cells), cell height 140px, legend includes Leave, panel width matches Mayurika's exactly (1348px) — no per-member drift. Interaction clicks (blank/chip/leave/+more) were verified in depth only on Mayurika; Suman's calendar runs through the identical shared `mountScheduleCalendarInstance()` factory with no per-member branching in the changed code paths, so behavioral parity is expected but not independently click-tested in this pass.

## AJ. Arun result

Same structural confirmation as AI.

## AK. Rajiv result

Same structural confirmation as AI.

## AL. Paraparan result

Same structural confirmation as AI.

## AM. Desktop result

Confirmed at 1920×1080 and 1600×1000: no horizontal page overflow (`scrollWidth === clientWidth` at every tested width), calendar fills available width, 140px Month boxes.

## AN. Laptop result

Confirmed at 1366×768: no horizontal overflow; layout unchanged from desktop tier.

## AO. Tablet result

Confirmed at 1024×800 and 768×1024: no horizontal page overflow. At 768px the calendar mini-sidebar has not yet stacked (that happens at the existing `≤640px` breakpoint, unchanged by this task) — Month grid's own `min-width: 630px` floor (pre-existing, unchanged) means the 7-column grid scrolls horizontally *inside* `.msc-cal-grid-wrap` at this width, which is the existing, unmodified, intentional behavior (internal scroll, not page scroll).

## AP. Mobile result

Confirmed at 390×844: no horizontal page overflow. Confirmed pre-existing (unmodified) behavior: below 640px the calendar defaults to Day view at load (`instance.js`'s `window.innerWidth <= 640` check, not touched by this task) rather than Month — this is existing mobile UX, not a regression. Switching to Month view manually on this viewport was not separately re-tested in this pass.

## AQ. 200% zoom result

Not tested in this pass (headless Chrome viewport-based testing only, no zoom emulation attempted) — see BH.

## AR. Keyboard/accessibility result

Confirmed structurally: Month cells keep `role="button" tabindex="0"` and keyboard Enter/Space still opens the Create chooser (unchanged code path, `isKeyActivation()`/`go()`); Task/Leave chips and "+N more" keep their own `keydown` handlers (unchanged). Added explicit `:focus-visible` rings on toolbar buttons and the view-switcher. Not independently re-verified via actual Tab-key traversal or a screen reader in this pass — see BH.

## AS. Performance result

No new library added; no new per-cell listener beyond what existed before (the click-coordinator's `dblclick` listeners were *removed*, net reducing listener count per cell/chip). No additional data fetch introduced.

## AT. Browser-console result

Confirmed clean across every check in this pass except one pre-existing, unrelated 404 for `/favicon.ico` (present before this task, not introduced by it, not part of `web-view/`'s file set).

## AU. Static-check result

- `node --check web-view/js/calendar/instance.js` — **pass**.
- Brace-balance check (custom script) on `calendar.css`, `navigation.css`, `tokens.css` — **balanced** (depth 0) in all three.
- Grep-confirmed **zero remaining references** anywhere in `web-view/` to the removed symbols (`clearPendingCellClick`, `pendingCellClick`, `CELL_CLICK_DELAY_MS`, `scheduleCellSingleClick`, `handleCellSingleClick`, `showEmptyDayToast`, `showFullDayLeaveToast`, `hasFullDayBlockingLeave`) after the README.md rewrite (documented in D/README, not left as stale prose).
- ES-module import-resolution / circular-import check: no import statements were added, removed, or changed in `instance.js`; the existing import list (`core.js`, `ui/popup.js`, `ui/toast.js`, `ui/dialog.js`, `ui/loading.js`, `ui/form-feedback.js`, `ui/error-mapper.js`) is untouched.
- HTML tag-balance / duplicate-ID scan: `index.html` was not modified by this task; the only markup change is a new `<span class="msc-chip-cat leave">` inside a template string in `instance.js`, which carries no `id` attribute (no collision risk, per the file's existing "no ids for repeated elements" convention).
- Unused import/export scan: no exports were added or removed from `core.js`/`instance.js` in this task.
- Frontend asset HTTP 200 check: confirmed live — every `web-view/css/*.css` and `web-view/js/**/*.js` file requested by `index.html` returned 200 from a local static server during browser verification (see BF/BG).
- Full backend regression suite: **not run** — no backend file was changed (confirmed by `git diff --stat -- backend/` returning no output), so there is nothing for a backend test run to regress against; running the existing suite was out of scope for a frontend-only change and no backend test tooling was invoked in this pass.

## AV. Backend changes: NONE

`git diff --stat -- backend/` returns no output.

## AW. API changes: NONE

No route, request/response schema, or status-code contract was touched.

## AX. Database changes: NONE

`git diff --stat -- database/` returns no output.

## AY. Migration changes: NONE

No file under `database/migrations/` was touched.

## AZ. Business-rule changes: NO

Classification (Scheduled/Unscheduled), Leave conflict/overlap rules, Schedule Summary formulas, and AXIOM/KPI logic are all backend-owned and untouched.

## BA. Backend regression result

Not run — no backend code changed (see AU).

## BB. Commit hashes

`e2d685c` — "Redesign Schedule Calendar toward a Google-Calendar-inspired layout" (7 files changed, 600 insertions, 268 deletions; parent `34958a9`).

## BC. Push result

Not pushed yet as of this writing — pending explicit user confirmation (push to `origin/main` is a shared-state action requiring go-ahead per this session's operating rules).

## BD. Deployment result

Not performed by this document's author independently — see handover for Vercel-deploy status and whether/when it was confirmed with the user.

## BE. Protected folder excluded

Confirmed via `git status --short -- member-aios/mayurika-hr/staff-data/` at both the start and end of this task: the folder shows only as untracked (`??`), never staged, read, or modified by any tool call in this task.

## BF. Evidence paths

Local-only verification artifacts (not part of the repository, not committed):

- `chromium screenshots` — captured under a session-scratch `verify/screenshots/` directory (Month view, Create chooser, Task Details, blank-click-on-busy-date, Leave Details, "+N more" full list) and `verify/screenshots/responsive/` (1920×1080, 1366×768, 1024, 768, 390 viewports).
- `verify/mock_api.py` — throwaway local mock of the FastAPI member-schedule/leave API (canned JSON matching the real `MemberScheduleEventOut`/`MemberLeaveRecordOut`/`*ScheduleReportOut` schemas), used only because no local PostgreSQL instance was available in this environment (see BH). Never part of the repository.
- `verify/check.js`, `verify/members.js`, `verify/responsive.js` — puppeteer-core driver scripts used for the interaction/structural/responsive checks summarized in this document.

## BG. Queryability result

This document plus the updated `web-view/README.md` sections ("Month-cell click model: direct blank-click Create, no double-click" and "Google-Calendar-inspired wider layout and larger Month boxes") make every change in this task traceable from a clean read of the repository, per §11.1 (LLM-Queryable Documentation Standard, SRC-MD-HR-001) referenced by CLAUDE.md.

## BH. Known limitations

- **No live PostgreSQL/FastAPI backend was available in this environment.** All interaction verification used a throwaway local mock API returning canned JSON shaped like the real schemas (see BF). This proves the frontend's click/render/popup logic correctly, but Task/Leave Create/Edit/Delete round-trips, the real `leave_conflict`/`leave_overlap`/`task_conflict` 409 responses, and the real Schedule Summary formulas were **not** exercised end-to-end against a real backend in this pass — that code was not modified by this task and `git diff` confirms it, but a full live-backend regression pass (Steps 19's items 9/10/12/13/16-19 in the requested matrix, and Task/Leave Edit/Delete specifically) is recommended before this is treated as a fully closed regression check.
- Week/Day views, drag/resize, and 200% zoom/screen-reader keyboard traversal were confirmed structurally/by code-diff absence-of-change only, not independently re-driven live in this pass.
- Suman/Arun/Rajiv/Paraparan were confirmed structurally identical to Mayurika (same shared factory, same measured cell height/legend/panel width) but were not independently click-tested item-by-item — see AI–AL.
- The local mock API's task `category` values ("task"/"followup") do not exactly match the real backend's category strings ("Scheduled Task"/"Unscheduled Task"), so one seeded Unscheduled-Task chip rendered with the Scheduled (green) color class in the mock-driven screenshots — this is a mock-data inaccuracy only, not a frontend bug (`CATEGORY_CLASS` mapping itself was not modified by this task).

## BI. PASS / AMBER / FAIL

**PASS** for the frontend redesign itself (width, Month-box size, blank-click Create model, legend, focus states) — verified live against a real browser and confirmed backend/database/migrations/protected-folder untouched. **AMBER** overall pending a full live-backend regression pass (see BH) before promotion to a fully closed, backend-verified regression record.

## BJ. One next step

Run the full regression matrix (Task/Leave Create/Edit/Delete, "+N more" full-list Edit/Delete, Full-Day Leave conflict message, list-return, drag/resize) against a real local FastAPI + PostgreSQL instance (or the deployed staging backend) for all 5 members, and fold the results into this document before treating the task as fully closed.

---
name: calendar-form-section-order-check
type: validation
created: 2026-07-16
requirement-id: REQ-LEAVE-COPY-001
status: PASS — Schedule Item now appears before Leave Coordination in the shared calendar template; no markup duplicated, no logic changed
source-boundary: web-view/index.html only (49 insertions, 49 deletions — a pure reorder). backend/, database/ — confirmed unchanged. member-aios/mayurika-hr/staff-data/ not accessed.
root-truth: CLAUDE.md — canonical
---

# Calendar Form Section Reorder — Validation Check — 2026-07-16

## Requirement

Reorder the two calendar sections inside the shared `mountScheduleCalendarInstance` template so that Schedule Item appears first and Leave Coordination (including its active list and history panel) appears second — a pure markup reorder, with no change to any leave/task business logic, API, or database.

## Old Order

1. Leave Coordination (header, notice, New Leave Request form, Create Leave / Show History buttons, active leave list, history panel)
2. Schedule Item (form, Schedule Items list, Priority Preview, Clear Testing Data, footer, view modal)

## New Order

1. Schedule Item (form, Schedule Items list, Priority Preview, Clear Testing Data, footer, view modal)
2. Leave Coordination (header, notice, New Leave Request form, Create Leave / Show History buttons, active leave list, history panel)

## Files Changed

`web-view/index.html` only. `git diff --stat` shows 49 insertions / 49 deletions — the exact same line count moved, confirming this is a pure reorder of existing lines with no new or duplicated markup.

## DOM Boundaries Moved

Both top-level sections are self-contained `<div class="hr-table-card">` blocks directly inside `container.innerHTML`, each individually balanced (verified by counting `<div`/`</div>` occurrences within each block before moving):

- **Leave Coordination block** — `<div class="hr-table-card msc-leave-card">` … its matching closing `</div>` — 14 opening / 14 closing divs, net 0. Contains, in order: `.msc-leave-card-head` (title + subtitle), `.msc-leave-notice`, a `.msc-leave-section` wrapping the `.msc-leave-form-panel` (New Leave Request form + Create Leave/Show History buttons), a second `.msc-leave-section` (active `.msc-leave-list`), and a third `.msc-leave-section.msc-leave-history-wrap` (`.msc-leave-history-panel` → `.msc-leave-history-list`). All three subsections moved together as one unit — the leave list and history panel were never separated from the rest of the Leave Coordination block.
- **Schedule Item block** — `<div class="hr-table-card">` … its matching closing `</div>` (immediately preceding the moved Leave Coordination block in the new order) — 14 opening / 14 closing divs, net 0. Contains, in order: `.msc-form-card` (task form + Add/Update/Cancel buttons), two `.msc-list-card`s (Schedule Items list, Priority Preview), the Clear Testing Data button, the footer, the technical-details `<details>`, and the task view modal (`.msc-modal-overlay.msc-view-modal`) — all moved together as one unit, so the task list/footer/modal boundary was preserved exactly.

Both blocks were individually verified balanced (net 0) before the swap, so exchanging their order could not alter the file's overall tag structure — confirmed after the edit: the whole `container.innerHTML` template still shows the same 58 opening / 57 closing div count as before this change (the single pre-existing +1 net, attributable to the outer `.msc-calendar-shell` wrapper relying on the browser's standard trailing-tag auto-closing behavior for `innerHTML` fragments, was not introduced by this change and is unrelated to it — confirmed unchanged before and after).

Only the trailing string-concatenation operator at the swap boundary was adjusted (the line that used to end the whole `container.innerHTML` assignment with `;` now ends with `+` since another block follows it, and vice versa for the block that is now last) — a mechanical JavaScript-syntax necessity of the reorder, not a markup or logic change.

## Task Functionality Result

Unchanged — confirmed by code review: no line inside the Schedule Item block's form, list, modal, or their associated JS handlers (`addBtn`, `updateBtn`, `cancelBtn`, `editItem`, `deleteItem`, drag/resize wiring, `classify_schedule_category` call site, leave-conflict check call site in `member_schedules.py` — unmodified, backend not touched) was altered. All references are `container.querySelector(...)` class-based lookups, which resolve identically regardless of the elements' position in the DOM.

## Leave Functionality Result

Unchanged — confirmed by code review: no line inside the Leave Coordination block's form, buttons, list, or history panel, and none of their associated JS (`leaveCreateBtn`, `leaveHistoryToggleBtn`, `applyLeaveStatusChange`, `renderLeaveList`, `renderLeaveHistoryList`, `updateLeaveFormFieldVisibility`) was altered. All leave type/date/time fields, Purpose/External reference, Approve/Reject/Cancel actions, Pending/Approved normal visibility, Rejected/Cancelled history-only visibility, and the coordination-copy notice text are untouched.

## Leave List/History Placement

Confirmed: the active leave list (`.msc-leave-list`) and the history panel (`.msc-leave-history-panel`/`.msc-leave-history-list`) remain inside the same Leave Coordination `hr-table-card msc-leave-card` block that moved as a single unit — they were never left behind or separated from the rest of the Leave Coordination section.

## Selected-Date Synchronization Result

Unchanged — `syncSelectedDateToForms()` and `selectDate()` (added/fixed in the prior task) were not touched by this reorder. Since both `fieldDate` (Schedule Item date) and `leaveFieldStartDate`/`leaveFieldEndDate` (Leave form dates) are obtained via `container.querySelector(...)` at mount time and cached in local variables, their behavior is completely independent of where their parent markup sits in the DOM — reordering the sections has no effect on which elements those variables reference or on the synchronization logic. Verified by code review: no selector or reference required adjustment.

## Responsive Result

No CSS rule was added, removed, or altered — `.hr-table-card` (the shared wrapping treatment used by both sections) already applies consistent margin/border/radius regardless of position, so the same responsive stacking behavior (single column on narrow widths, no fixed pixel widths, no overflow) that applied to each section individually before this change applies identically now, just in the new order. No live-browser check was performed in this session (no browser-automation tool available, same documented limitation as prior sessions) — verified instead by confirming no styling rule references sibling order or position-dependent selectors (`:first-child`/`:last-child`/`nth-child`) for either section.

## All-Five-Member Result

Confirmed: the reorder is entirely inside the single shared `container.innerHTML` template inside `mountScheduleCalendarInstance` — there is no per-member branch anywhere in this diff. Since this factory mounts once per `.msc-instance` (mayurika, suman, arun, rajiv, paraparan — unchanged in `initAllScheduleCalendars`), all five member calendars now show Schedule Item before Leave Coordination identically, with zero additional code.

## Backend/Database Unchanged

Confirmed via `git diff --stat`: the only modified file is `web-view/index.html`. No file under `backend/` or `database/` appears in the diff. No API route, request/response shape, validation rule, conflict rule, reporting calculation, or classification logic was touched. `member-aios/mayurika-hr/staff-data/` remains untracked and was not accessed.

## Static Checks

- `node --check` on the extracted schedule-calendar `<script>` block (93,763 characters — identical length to before this change, confirming no code was added or removed, only reordered) — **passed, no syntax errors**.
- Python `html.parser` full-file tag-balance check — **0 errors, 0 unclosed tags**.
- Programmatic scan of the `container.innerHTML` template string confirmed: exactly one "Schedule Item —" occurrence, exactly one "Leave Coordination" occurrence, exactly one `hr-table-card msc-leave-card` occurrence, exactly one `msc-form-card` occurrence, exactly one `msc-leave-history-list` occurrence (no duplication), and that "Schedule Item —" occurs at an earlier string index than "Leave Coordination" (confirming the new order). Total div open/close counts for the whole template are unchanged from before this edit (58/57, net +1 — the same pre-existing, unrelated imbalance).

## PASS / FAIL

**PASS.** Schedule Item now appears before Leave Coordination (with its list and history panel intact as one unit) in the single shared calendar template; no markup was duplicated; no leave/task logic, selector, or DOM hook was altered; static syntax and structural checks both pass; no backend or database file was changed.

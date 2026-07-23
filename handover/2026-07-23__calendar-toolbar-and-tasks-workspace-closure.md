---
name: calendar-toolbar-and-tasks-workspace-closure-handover
type: handover
scope: web-view/ Schedule Calendar — toolbar identity/search/help/settings, Calendar/Tasks mode switch, member-scoped Tasks workspace
created: 2026-07-23
status: AMBER — Calendar toolbar portion shipped-ready and browser-verified; Tasks workspace shipped for All-Tasks/Add/View/Edit/Delete only, Completion/Starred/Lists blocked pending schema approval
owner: Mareenraj (frontend build); domain review owner per CLAUDE.md §18 is the relevant Management Team reviewer for Calendar/UX changes generally
reviewer: pending
---

# Google-Calendar-Inspired Toolbar and Tasks Workspace — Handover — 2026-07-23

## 1. What this task was

Add a Google-Calendar-inspired toolbar cluster (identity, calendar-scoped search, help, settings, Calendar/Tasks mode switch) to the Management AIOS Schedule Calendar, and — only for the data the existing Task schema already supports — a dedicated per-member Tasks workspace (All tasks list, Add a task, View/Edit/Delete), reusing the same Task records the calendar already uses. Completion, Starred, and Lists were evaluated against the real backend schema and found to require an unapproved migration, so they were deliberately not built.

Full validation record: `validation/calendar-toolbar-and-tasks-workspace-check-2026-07-23.md`.

## 2. Files created

- `validation/calendar-toolbar-and-tasks-workspace-check-2026-07-23.md`
- `handover/2026-07-23__calendar-toolbar-and-tasks-workspace-closure.md` (this file)

## 3. Files modified

- `web-view/css/calendar.css` — toolbar identity/search/help/settings/mode-switch styling, `.msc-mode-hidden`/`.msc-mode-active` mode-visibility classes, full Tasks-workspace layout (sidebar/nav/rows/empty state), help/settings popup content styling.
- `web-view/js/calendar/instance.js` — new toolbar markup (identity, search panel, help popup, settings popup, mode switch), new Tasks-workspace markup and `renderTasksWorkspace()`, `setMode()`, search open/close/render, help/settings open/close, a shared `applySidebarCollapsed()` helper, and hooks into the existing post-mutation render paths (`selectDate()`, `deleteItem()`) so the Tasks workspace stays in sync with Task Create/Update/Delete.

**Not touched:** `backend/`, `database/`, `database/migrations/`, `member-aios/mayurika-hr/staff-data/`, `web-view/index.html`, `web-view/js/calendar/core.js`, any `ui/*.js` module, `web-view/css/navigation.css`, `web-view/css/tokens.css`. Confirmed by `git diff --stat`.

## 4. Calendar toolbar ownership

All new toolbar markup lives inside `mountScheduleCalendarInstance()`'s `container.innerHTML` template string in `web-view/js/calendar/instance.js`, in the `.msc-cal-toolbar-left` (identity) and new `.msc-cal-toolbar-right` (search/help/settings/view-switcher/mode-switch) blocks. Corresponding CSS is in `web-view/css/calendar.css` directly after the existing `.msc-cal-heading`/`.msc-view-switcher` rules.

## 5. Mode-switch ownership

`setMode(mode)` in `instance.js` is the single function that toggles Calendar vs. Tasks visibility. It uses a dedicated `.msc-mode-hidden` class (not the native `hidden` attribute) on `.msc-calendar-main` and `.msc-view-switcher`, because both already carry an unconditional `display` value in `calendar.css` that a same-specificity `[hidden]` rule cannot reliably beat — see the CSS comment at `.msc-calendar-main.msc-mode-hidden, .msc-view-switcher.msc-mode-hidden` for the exact specificity reasoning. `.msc-tasks-main` follows the inverse, existing `.msc-view-pane`/`.active` idiom (`display:none` by default, `.msc-mode-active` shows it). `.msc-summary-section`/`.msc-list-card` (Today's Priorities) use the plain `hidden` attribute safely, since neither carries its own conflicting `display` rule.

## 6. Tasks workspace ownership

`renderTasksWorkspace()` in `instance.js` — reads the same `items` closure array Month/Week/Day already read (no second fetch, no second Task truth). Rows are native `<button>` elements wired to the existing `viewItem()` (Task Details/Edit/Delete, unchanged). "Add a task" calls the existing `openTaskPopup()` after clearing the date field, per Step 15's "no silent stale-date default" requirement.

## 7. Data-source ownership

Unchanged: `apiBase = MEMBER_SCHEDULE_API_BASE + '/' + memberKey`, the same `loadItems()`/`items` array the calendar has always used. No new endpoint, no new fetch call, no client-side cache separate from `items`.

## 8. Completion ownership

**Not implemented — blocked.** No `completed`/`completed_at` column exists in `management_aios.member_schedule_events` (confirmed by reading `backend/models.py`). Implementing this requires (a) a schema migration, and (b) a business decision on how a completed Task should be counted in Schedule Summary's Scheduled/Unscheduled totals — neither exists today. Owner of that decision: the relevant Management Team reviewer per CLAUDE.md §18, not this task.

## 9. Starred ownership

**Not implemented — blocked.** No `starred` column exists anywhere. Omitted from the UI entirely (not shown disabled) per Step 17's own fallback instruction.

## 10. Lists ownership

**Not implemented — blocked.** No list/group table or field exists anywhere. A real implementation needs persistent storage, member ownership, duplicate-name handling, and delete/rename rules — none of which exist today. Omitted from the UI; a short in-context note in the Tasks-workspace left nav tells the user why, in plain language.

## 11. Known unsupported features

Completion, Starred, Lists (see 8–10). Everything else in the task brief (identity, toolbar search/help/settings, Calendar/Tasks mode switch, All Tasks, Add Task, View/Edit/Delete, Calendar synchronization) is implemented and browser-verified.

## 12. Deployment

Not performed as part of this handover's authoring pass — pending explicit user confirmation to push and trigger the existing Vercel pipeline, same as the prior redesign task's handover.

## 13. Rollback

Revert `web-view/css/calendar.css` and `web-view/js/calendar/instance.js` to their pre-this-task versions via `git revert <this-task's-commit-hash>` or a targeted `git checkout <prior-commit> -- <path>` per file. No backend/database rollback needed since none was touched.

## 14. Commits

`233c79c` — "Add Calendar toolbar identity/search/help/settings and a Tasks workspace" (5 files changed, main branch, parent `80c973a`).

## 15. One next step

Get an explicit business decision on the Completion business rule and Management Team approval for the `completed`/`completed_at`, `starred`, and list/group schema additions, then implement Completion/Starred/Lists as a separate, explicitly-approved follow-up task with its own migration — do not retrofit them into this task's shipped scope without that approval.

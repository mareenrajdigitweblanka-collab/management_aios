---
name: calendar-toolbar-and-tasks-workspace-check
type: validation
created: 2026-07-23
status: AMBER — Calendar toolbar/identity/search/help/settings/mode-switch PASS; Tasks workspace ships All-Tasks/Add/View/Edit/Delete only (PASS for that scope) with Completion/Starred/Lists explicitly out of scope per the data gate, not silently omitted
source-boundary: web-view/css/calendar.css, web-view/js/calendar/instance.js only. backend/, database/, database/migrations/, member-aios/mayurika-hr/staff-data/ — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Google-Calendar-Inspired Toolbar and Tasks Workspace — Check — 2026-07-23

**Requirement:** Add a Calendar identity/search/help/settings cluster and a Calendar/Tasks mode switch to the toolbar (Image 1 reference), and a dedicated per-member Tasks workspace (Image 2 reference) that reuses the existing Task data — with no schema change, no second Task truth, and Completion/Starred/Lists implemented only if the existing Task schema already supports them.

---

## Three-image analysis

**Image 1 (Google Calendar Month view, marked controls):**
- Circled: app icon + "Calendar" wordmark (top-left identity), "Month ⌄" dropdown, and a calendar-icon/checkmark-icon pair at top-right (the Calendar/Tasks mode toggle).
- Also visible, not circled but relevant: Today, ‹ ›, search, help (?), settings (gear) — all in the same toolbar row.
- Excluded as Google-only: Upgrade button, 9-dot apps launcher, round profile avatar, "Search for people"/"Booking pages", "Other calendars" multi-account checkboxes. None map to a Management AIOS concept (single member, single calendar, no external accounts).

**Image 2 (Google Tasks, opened via the checkmark toggle):**
- Same top identity/toggle bar carries over — confirms the mode switch swaps only the workspace, not the page chrome.
- Left nav: Create, All tasks (active), Starred, Lists → My Tasks, Create new list.
- Main panel: title + `⋮` menu, Add a task, empty-state illustration, collapsible Completed (N) section with reopen control.

**Image 3 (current Management AIOS calendar, pre-this-task):**
- Global app header/sidebar are the application shell, distinct from the calendar's own toolbar.
- Calendar toolbar had only: sidebar-toggle, Today, ‹ ›, heading, Month/Week/Day — no identity, search, help, settings, or mode switch existed. Confirms Steps 5–7 were purely additive.
- Wide layout and large Month boxes (from the 2026-07-22 redesign task) were already in place and required no further change here.

Screenshots referenced throughout this document are session-local (see Evidence paths) and not part of the repository.

## Architecture discovery (Step 3)

Confirmed via direct inspection and an independent Explore-agent sweep:

- **Global search** (`web-view/index.html:42-57`, `js/navigation.js` `doSearch()`) only shows/hides static `[data-searchable]` DOM sections — it never sees calendar Task/Leave data (`.msc-instance` mount points carry no `data-searchable`). A calendar-scoped search does not duplicate it.
- **Tab switching** (`js/navigation.js` `activatePanel()`) is pure class-toggling — no `history.pushState`, no URL. The new Calendar/Tasks mode switch follows the identical "toggle a class on sibling panels via a data-attribute click handler" pattern; there is no existing back/forward behavior to match.
- **No reusable help/settings popup component** exists anywhere in `web-view/js/ui/`. Both new popups reuse the calendar's own `.msc-modal-overlay`/`.msc-modal` convention plus `trapTab`/`returnFocus` from `ui/popup.js` — the same pattern the Task/Leave detail popups already use.
- **Backend list endpoints** (`GET /api/member-schedules/{member}`, `GET /api/member-leave/{member}`) support only `start_date`/`end_date`, no text search — confirmed by reading `backend/routers/member_schedules.py` and `backend/routers/member_leave.py`. The new search filters client-side over the already-loaded `items`/`leaveItems` arrays, the same convention `itemsForDate()`/`leaveItemsForDate()` already use.
- **No dormant Starred/Lists/Completion UI** anywhere in `web-view/` or `backend/` — grepped for `Starred`, `completed_at`, `is_complete`, `list_id`, `task_list`: zero matches in both trees.

## Tasks data-gate result (Step 4)

Read directly from `backend/models.py`'s `MemberScheduleEvent` ORM class and `backend/schemas.py`'s `MemberScheduleEventCreate`/`Update`/`Out`:

```
id, member_key, member_label, event_date, title, category, priority,
start_time, end_time, notes, source_scope, is_official_truth,
created_by, updated_by, created_at, updated_at, deleted_at
```

No `completed`/`completed_at`, `starred`, or `list_id`/`list_name` column exists, and no such table exists anywhere in the schema.

| Feature | Classification | Reason |
|---|---|---|
| All Tasks list, Add Task, Task View/Edit/Delete | **GREEN** | 100% existing CRUD (`GET`/`POST`/`PUT`/`DELETE /api/member-schedules/{member}`) — a new UI surface over data that already exists, no new endpoint, no new field. |
| Completion | **RED** | No `completed`/`completed_at` field anywhere; no approved source defines how a completed Task should affect Schedule Summary (Step 16's own stop condition). |
| Starred | **RED** | No `starred` field anywhere (Step 17's own stop condition). |
| Lists / Create new list | **RED** | No list/group table or field anywhere; a real list feature requires persistent storage, member ownership, duplicate-name handling, and delete/rename rules — none exist (Step 18's own stop condition). |

Per the task's own PASS CONDITIONS ("If Tasks completion, Starred, or Lists require database changes: Calendar portion may PASS; Tasks portion must remain AMBER; stop before schema implementation."), this task ships the GREEN scope only and documents the three RED items as blockers rather than inventing a schema change or faking the feature in the frontend.

## Google-inspired features adopted

Compact toolbar identity, calendar-scoped search popover, help popup, settings popup, Month/Week/Day segmented control (unchanged, pre-existing), Calendar/Tasks mode switch, and a left-nav + main-panel Tasks workspace shell (Add a task, All tasks list, empty/loading/error states).

## Google-specific features excluded

No Google branding, logo, or trademark. No account/profile avatar, apps launcher, Upgrade prompt, Google Meet/Guests/Drive/Keep/Contacts/Maps integration, calendar-account switcher, or Starred/Lists/Completion (all three explicitly out of scope per the data gate above, not a Google-exclusion decision). Every new icon is an original inline SVG authored in this task, in the same 20×20/`stroke="currentColor"`/1.8px style `index.html`'s app sidebar already uses (search icon reuses the topbar's exact existing SVG path for consistency) — generic UI iconography (magnifying glass, circle-question, gear, checkmark-in-circle, calendar grid), not a copied Google asset.

## Calendar identity result

`.msc-cal-identity` (icon + "Calendar" label) added to the toolbar's left cluster, `aria-hidden="true"` (purely presentational — the toolbar's other controls already carry their own accessible names). Hidden below 900px viewport width so it never crowds out the functional controls on a narrow toolbar — confirmed via live viewport test at 768px and 390px (`identityVisible: false` at both, `true` at 1024px and above).

## Toolbar result

New right-hand cluster (`.msc-cal-toolbar-right`): search trigger, help trigger, settings trigger, the existing Month/Week/Day switcher (unchanged), and the new Calendar/Tasks mode switch. Left cluster gained the identity block ahead of the existing sidebar-toggle/Today/prev/next/heading (all unchanged). Confirmed live: all five new elements present and correctly ordered on all 5 members.

## Search result

Confirmed live: clicking the search icon opens an anchored popover (same `position:fixed`/viewport-clamp technique as the Create chooser); typing "Morning" returned `"Morning mail check and HR communication  task — 2026-07-22 09:00"` (title + category + date/time); clicking the result closed the popover and opened Task Details (`taskDetailsOpened: true`). Member-isolated by construction — reads only this instance's own `items`/`leaveItems` closures. No new API call, no database write. Clear button and Escape both close it.

## Help result

Confirmed live: opens via mouse click and via keyboard (focus + Enter); content is plain-language (Task colors, Leave color, `+N more`, blank-cell Create, automatic classification, Full-Day Leave conflict behavior) with no technical/database wording. Escape closes and returns focus to the trigger button (confirmed: `document.activeElement` after Escape is the Help trigger).

## Settings result

Confirmed live: opens/closes correctly; contains exactly one control — "Show the Calendar sidebar … by default" — mirroring the existing `sidebarCollapsed` state via a new shared `applySidebarCollapsed()` helper, so the toolbar toggle button and this checkbox can never disagree. No business-rule setting (classification cutoff, Leave rules, Schedule Summary formulas, member access) is exposed, per the requirement.

## View-selector result

Unchanged (Month/Week/Day segmented control, same markup/behavior as before this task) while in Calendar mode. Now hidden in Tasks mode (`.msc-view-switcher.msc-mode-hidden`) — it has no meaning there, matching the Google Tasks reference where the equivalent period selector disappears once Tasks is active.

## Calendar/Tasks switch result

Confirmed live: clicking (and keyboard Enter on) the "Tasks" button hides `.msc-calendar-main` and shows `.msc-tasks-main`, toggles `aria-pressed` on both buttons correctly, hides the Month/Week/Day switcher, Schedule Summary, and Today's Priorities (all three are date-scoped concepts the Tasks workspace has no equivalent for), and calls `renderTasksWorkspace()` to refresh from current data. Switching back to "Calendar" correctly restores all of the above. No page reload — pure DOM show/hide, consistent with the rest of this app's navigation. Verified this does not regress the app-level member-tab switching (that remains `js/navigation.js`'s own unrelated mechanism).

**Implementation note on a real bug caught during this task:** `.msc-calendar-main` and `.msc-view-switcher` both already carry an unconditional `display` value in `calendar.css`, which a same-specificity native `[hidden]` attribute cannot reliably override (attribute selectors and class selectors have equal specificity; author-stylesheet cascade order would let the existing `display:flex`/`display:inline-flex` rule win). Visibility is instead driven by a dedicated, higher-specificity `.msc-mode-hidden` class (and, for the new `.msc-tasks-main`, the existing `.msc-view-pane`/`.active` idiom already used by Month/Week/Day) — confirmed correct via live `getComputedStyle(...).display` checks at every mode transition.

## Calendar interactions result

Re-verified unaffected by this task (blank-click Create chooser, Task/Leave chip clicks, "+N more", Month row height) on all 5 members — no regression. Two visible items + "+N more" cap, Month/Week/Day, Schedule Summary formulas, drag/resize, and Full-Day Leave conflict handling were not touched by this task's diff (`git diff` confirms only `calendar.css`/`instance.js` toolbar and Tasks-workspace additions).

## Tasks data-gate result

See table above — GREEN for All Tasks/Add/View/Edit/Delete, RED for Completion/Starred/Lists.

## All Tasks result

Confirmed live: `renderTasksWorkspace()` reads the same `items` array Month/Week/Day already read (no second fetch, no second truth), sorted by date then start time; renders title, date (via the existing `formatAgendaDate()`), time, category, and priority per row; shows a count ("4 tasks"); each row is a native `<button>` (keyboard-reachable with no extra wiring) that opens the real Task Details popup. Empty state ("All tasks complete" / "There are no active tasks for this member.") wired but not exercised live in this pass (the mock always seeded 4 tasks) — the empty-state branch itself was code-reviewed, not click-tested against a genuinely empty member.

## Add Task result

Confirmed live: "+ Add a task" opens the existing Create Task popup (same form, same validation, same automatic classification — no category selector added) with the Date field genuinely empty (`dateFieldValue: ""`), per Step 15's explicit instruction not to silently default to a stale or incorrect date. The field remains `required` (unchanged), so the form cannot be submitted without an explicit date choice.

## Task View/Edit/Delete result

View confirmed live from both search results and Tasks-workspace rows (`Task Details opened: true` in both cases). Edit/Delete themselves reuse `editItem()`/`deleteItem()` verbatim (untouched by this task's diff) — the same functions the Month/Week/Day calendar already used before this task, so no new update/delete logic was written or is needed. After any successful Create/Update/Delete, `selectDate()`/`deleteItem()`'s existing post-mutation hooks now also call `renderTasksWorkspace()` when Tasks mode is active, keeping the workspace list in sync with the same data the Calendar side just changed.

## Completion result

**Not implemented.** No `completed`/`completed_at` field exists anywhere in the schema (backend or frontend), and no approved source defines the required business rule for how a completed Task should be counted in Schedule Summary. Per Step 16's own instruction, this stops short of inventing that rule rather than guessing. Documented here and in the handover as an explicit blocker requiring a business decision, not a silent omission.

## Starred result

**Not implemented, not shown even disabled.** No `starred` field exists anywhere. Per Step 17's fallback ("omit it and document the blocker"), the "Starred" nav item from the Image 2 reference does not appear in this Tasks workspace at all — showing it disabled would tease a feature that can never work without a schema change.

## Lists result

**Not implemented, not shown even disabled.** No list/group table or field exists anywhere, and a real list feature needs persistent storage, member ownership, duplicate-name handling, and delete/rename rules — none of which exist. Per Step 18's fallback, "Lists"/"Create new list" are omitted from the UI. A short note in the Tasks workspace's own left nav ("Starred and custom Lists need additional data fields that are not yet approved for this AIOS, so they are not shown here.") documents the blocker to the user directly, in plain language, rather than only in developer-facing docs.

## Calendar synchronization result

Confirmed live: Task mutations that happen while Tasks mode is active (via `viewItem`'s Edit/Delete, reached from a Tasks-workspace row) flow through the exact same `selectDate()`/`deleteItem()` success paths the Calendar side already used, which now also refresh `renderTasksWorkspace()`. No duplicate request is issued — both the Calendar grid and the Tasks list read the same in-memory `items` array. Category colors stay in sync automatically since both surfaces use the same `CATEGORY_CLASS` mapping.

## All-five-member result

Confirmed live on Mayurika, Suman, Arun, Rajiv, Paraparan: identical structure (140px Month cell height unchanged from the prior task, identity/search/help/settings/mode-switch all present, no per-member drift). Deep interaction testing (search, help, settings, mode switch, Tasks workspace, Add-a-task-empty-date) was done in depth on Mayurika; the other four were confirmed structurally identical via the same shared `mountScheduleCalendarInstance()` factory with no per-member branching in any of this task's changed code paths, so behavioral parity is expected but not independently click-tested item-by-item for all five.

## Responsive matrix

Confirmed live, both Calendar mode and Tasks mode, at 1920×1080 / 1600×900 / 1440×900 / 1366×768 / 1024×800 / 768×1024 / 390×844: **zero horizontal page overflow** at every width in either mode (`document.documentElement.scrollWidth === clientWidth` at all 14 combinations tested). Calendar identity hides below 900px (confirmed `false` at 768/390, `true` at ≥1024). Toolbar wraps via its existing `flex-wrap` (unchanged) rather than overflowing on narrow widths. 200% zoom was not separately emulated in this pass (see Known limitations).

## Accessibility result

Confirmed live: `aria-label` present on search/help/settings triggers ("Search this calendar", "Calendar help", "Calendar settings"); `aria-pressed` on both mode-switch buttons toggles correctly whether triggered by mouse or keyboard (`Enter` on a focused button); Help popup opens via keyboard, closes via Escape, and returns focus to its own trigger (`document.activeElement` confirmed); Tasks-workspace rows are native `<button>` elements (no custom `tabindex`/keydown wiring needed — keyboard reachability and Enter/Space activation come from the native element). Focus-visible rings on the new toolbar buttons reuse the existing `.msc-tool-btn:focus-visible` rule (already added in the prior redesign task) — no new focus-ring CSS needed for search/help/settings triggers themselves. Category is still never conveyed by color alone anywhere new (Tasks-workspace rows show the category as text in the meta line, same as the Month legend's text labels).

## Browser-console result

Clean across every check in this pass except the same pre-existing, unrelated `favicon.ico` 404 confirmed in the prior task's validation record — not introduced by this task, not part of `web-view/`'s file set.

## Automated/static tests

- `node --check web-view/js/calendar/instance.js` — **pass**.
- Brace-balance check on `web-view/css/calendar.css` — **balanced** (depth 0).
- No import/export changes in `instance.js` (verified by diff — only new local functions and DOM refs were added, no new `import`/`export` statement).
- `index.html` was not touched by this task — no duplicate-ID risk from this change (all new markup is inside per-instance template strings using the existing `memberKey`-suffixed unique-id convention, e.g. `searchPanelId`, `helpPopupTitleId`, `settingsPopupTitleId`).
- Frontend asset HTTP 200 check: confirmed live during browser verification — every requested CSS/JS asset returned 200.
- Full backend regression suite: **not run** — no backend file changed (`git diff --stat -- backend/` returns no output), so there is nothing for it to regress against.

## Backend/API/database proof

`git diff --stat -- backend/` and `git diff --stat -- database/` both return no output. Only `web-view/css/calendar.css` and `web-view/js/calendar/instance.js` changed (412 and 494 insertions respectively, 2 deletions total — confirmed via `git diff --stat -- web-view/`).

- Calendar frontend changes: identity/search/help/settings/mode-switch toolbar additions (documented above).
- Tasks frontend changes: new Tasks workspace shell reading existing Task data (documented above).
- Backend changes: **NONE**.
- API changes: **NONE**.
- Database changes: **NONE**.
- Migration changes: **NONE**.
- Business-rule changes: **NO** — classification, Leave conflict/overlap rules, and Schedule Summary formulas are all backend-owned and untouched.

## Known limitations

- No live PostgreSQL/FastAPI backend was available in this environment (same constraint as the prior redesign task) — all verification used a throwaway local mock API with canned JSON. Task/Leave Create/Edit/Delete round-trips through a real backend, and the real `leave_conflict` 409 flow reached via "Add a task" from the Tasks workspace, were not exercised end-to-end against a real backend in this pass (that underlying code was not modified by this task, confirmed by `git diff`).
- 200% zoom and reduced-motion emulation were not separately tested in this pass.
- The Tasks-workspace empty state was code-reviewed but not click-tested against a genuinely task-free member (the mock always seeded data).
- Deep interaction testing (search, help, settings, mode switch, Add-a-task) was performed in depth only on Mayurika; Suman/Arun/Rajiv/Paraparan were confirmed structurally identical but not independently click-tested feature-by-feature.
- Completion, Starred, and Lists remain unimplemented pending a schema-change approval and, for Completion specifically, a business decision on its Schedule Summary interaction — see the "Completion/Starred/Lists result" sections above.

## PASS / AMBER / FAIL

**PASS** for the Calendar toolbar/identity/search/help/settings/mode-switch portion — verified live in a real browser, no backend/database/migration change, no regression to existing Calendar interactions, confirmed across all 5 members structurally and in depth on Mayurika.

**AMBER** for the Tasks portion, by design per the task's own PASS CONDITIONS: All-Tasks/Add/View/Edit/Delete is a clean PASS for that scope; Completion/Starred/Lists are explicitly out of scope pending schema approval, documented rather than silently skipped or faked.

## One next step

Get an explicit business decision on the Completion business rule (does a completed Task still count in Schedule Summary's Scheduled/Unscheduled totals, and for how long) and Management Team approval for the `completed`/`completed_at`, `starred`, and list/group schema additions this would require — then implement Completion/Starred/Lists as a separate, explicitly-approved follow-up task with its own migration.

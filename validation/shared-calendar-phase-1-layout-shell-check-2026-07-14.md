---
name: shared-calendar-phase-1-layout-shell-check
type: validation
created: 2026-07-14
status: PASS — code-level review, static structural validation, JS syntax check, plus post-deploy live-artifact verification (commit 1fe7d6e, deployed and confirmed byte-identical). Interactive pointer-driven click-through (drag/resize/create/edit) not performed in this sandbox — see §18.
source-boundary: web-view/index.html (shared member-schedule calendar factory) only. backend/routers/member_schedules.py, backend/schemas.py, backend/models.py, backend/config.py, backend/main.py, database/*, member-aios/mayurika-hr/staff-data/ — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Shared Calendar — Phase 1 Layout Shell — Check — 2026-07-14

**Requirement:** Begin the approved Google-Calendar-inspired UI/UX redesign of the shared member-schedule calendar without changing backend behavior, database structure, access rules, classification logic, or event ownership. Phase 1 scope: shared layout shell, header/toolbar refinement, new collapsible left sidebar, relocation of the existing mini-calendar and daily/weekly report summary into the sidebar, a sidebar "Create task" button that focuses/scrolls to the existing create form, safe Agenda-view removal, and the narrow-screen fallback change from Agenda to Day.

**Scope:** Frontend-only. Single file changed: `web-view/index.html`. No backend, database, migration, `member-aios/`, Staff Data, or PH KPI file touched or staged.

**Architecture preserved:** The single shared factory `mountScheduleCalendarInstance(container)` is still mounted identically for all five `.msc-instance` containers (mayurika, suman, arun, rajiv, paraparan) via `initAllScheduleCalendars()`. All new and existing element lookups remain `container.querySelector(...)`-scoped — no global calendar element IDs were introduced. The two new per-instance-unique IDs (`viewTitleId`, pre-existing, and `sidebarId`, new) both follow the established `'msc-<thing>-' + memberKey` pattern so they remain unique per mounted instance, consistent with the existing rule documented in the code comment above `viewTitleId`. No separate markup or JavaScript implementation was created per member.

---

## 1. Repository safety (Step 1)

Confirmed before any edit:
- Branch: `main`
- Commit: `95ab618` (matches the authorized starting commit)
- `git status --short`: only `?? member-aios/mayurika-hr/staff-data/` (untracked, protected, unrelated) — no unexpected tracked changes. No AMBER condition triggered.

## 2. Current-structure capture (Step 2)

Read and recorded before editing (all in `web-view/index.html`, pre-change line numbers): `mountScheduleCalendarInstance` (5281–6299), the `innerHTML` template (5295–5406) including `.msc-cal-toolbar`, `.msc-cal-body-layout`, `.msc-mini-picker`, `.msc-cal-grid-wrap`, `.msc-summary-grid`, `.msc-form-card`, the Month/Week/Day/Agenda view-switcher buttons and `.msc-agenda-list` pane, `renderAgendaView()` (5859–5911, pre-edit numbering), `renderActiveView()` (5958–5968), `updateHeading()` (5935–5945), and the mobile `currentView = 'agenda'` fallback (6282–6284). CSS sections read in full: 1569–2400 (banner/toolbar/mini-picker/time-grid/agenda/month-grid/form/summary/chip CSS) and the two pre-existing `@media` blocks touching the calendar (640px and 768px).

## 3. Shared shell (Step 3)

New structure inside `mountScheduleCalendarInstance`'s generated markup:

```
.msc-calendar-shell
  (banner / notes / api-status / rajiv-note — unchanged position, unchanged content)
  .hr-table-card
    .msc-calendar-header
      .msc-cal-toolbar (sidebar-toggle + Previous/Today/Next + heading + Month/Week/Day switcher)
    .msc-calendar-main
      .msc-sidebar (Create task button, mini-calendar, category legend, Schedule Summary)
      .msc-calendar-content
        .msc-cal-grid-wrap (Month/Week/Day view panes)
  .msc-form-card / .msc-list-card (Schedule Items) / .msc-list-card (Priority Preview) /
  Clear Testing Data / footer / details / view modal — unchanged position and content
```

One shell per mounted instance (built fresh by each call to `mountScheduleCalendarInstance`). No global IDs — `sidebarId` follows the existing per-instance-unique-ID convention. Banner/notes/API-status/Rajiv-note remain in their original position ahead of the card, unchanged — all still visible. The Rajiv-only warning banner (`data-rajiv-note="true"`, only on Rajiv's `.msc-instance`) is untouched and still conditionally rendered exactly as before.

## 4. Header toolbar (Step 4)

Retained: Today, Previous, Next, current period heading (`updateHeading()`, unchanged logic apart from dropping the Agenda branch), Month/Week/Day switcher (`syncViewSwitcherButtons()`, unchanged logic — now iterates 3 buttons instead of 4). Agenda button removed from the switcher markup and from `updateHeading()`/`renderActiveView()`/prev/next branch conditions.

Sidebar toggle added: `<button class="msc-tool-btn msc-sidebar-toggle" aria-expanded="true" aria-controls="{sidebarId}" aria-label="Toggle sidebar">`. Click handler toggles a per-instance closure variable `sidebarCollapsed` and the `.msc-sidebar`'s `collapsed` class, updates `aria-expanded` accordingly, and — before collapsing — moves focus to the toggle button itself if focus was inside the sidebar, so collapsing never leaves focus on a now-hidden element (see §13). Each of the 5 mounted instances has its own `sidebarToggleBtn`/`sidebarEl`/`sidebarCollapsed` closure variables (declared inside `mountScheduleCalendarInstance`), so toggling one member's sidebar cannot affect another's — confirmed by code inspection (all refs are `container.querySelector`, and `container` is a distinct DOM node per instance).

## 5. Sidebar (Step 5)

`.msc-sidebar` contains, in order: (1) `.msc-sidebar-create` "Create task" button, (2) the relocated `.msc-mini-picker`, (3) `.msc-category-legend` with two `<span class="msc-chip-cat task/followup">` pills reusing the existing `CATEGORY_CLASS`-driven chip CSS (no new color values introduced — `Scheduled Task` uses the existing `.task` amber pill, `Unscheduled Task` uses the existing `.followup` green pill, both already defined at CSS lines ~2360–2380 pre-edit), (4) the relocated Schedule Summary block (Daily/Weekly, `.msc-summary-daily`/`.msc-summary-weekly` unchanged class names).

**Create button behavior (Phase 1, no popup):** `sidebarCreateBtn` click handler calls `formCardEl.scrollIntoView({behavior:'smooth', block:'start'})` then `fieldTitle.focus()`. No new form, no modal, no change to `addBtn`'s existing click handler — this is purely a navigation shortcut to the pre-existing persistent form, exactly as scoped for Phase 1.

## 6. Mini-calendar relocation (Step 6)

`renderMiniPicker()`, `buildMonthGridCells()`, and `selectDate()` are byte-for-byte unchanged (confirmed by diff — no lines inside these three functions were touched). Only the mini-picker's DOM *location* changed (moved from being a flex sibling of `.msc-cal-grid-wrap` inside `.msc-cal-body-layout`, to a child of `.msc-sidebar`) and its CSS sizing rule changed (see §12 — the `flex: 0 0 200px` declaration was removed since it is no longer a flex-row item). `miniPickerEl = container.querySelector('.msc-mini-picker')` is unchanged, so the existing wiring finds the relocated element with no code change. `renderActiveView()` still calls `renderMiniPicker()` unconditionally on every render, so it remains synchronized with Month, Week, Day, toolbar Prev/Next/Today, and the selected form date exactly as before — no second date state was introduced.

## 7. Report summary relocation (Step 7)

`renderSummaryStats()`, `loadDailySummary()`, `loadWeeklySummary()`, and `loadSummaries()` are byte-for-byte unchanged. Only the two summary-block `<div>`s' DOM location changed (moved into `.msc-sidebar`, and the duplicate copy that previously lived in a separate `.msc-list-card` in the main content column was deleted so it is not rendered twice). `dailySummaryEl`/`weeklySummaryEl`/etc. selectors are unchanged class names, so they resolve correctly in the new location. Both report endpoints (`GET .../reports/daily`, `GET .../reports/weekly`) and their request/response handling are untouched — confirmed no changes appear in the diff outside `web-view/index.html`, and no lines inside `loadDailySummary`/`loadWeeklySummary`/`renderSummaryStats` were touched.

## 8. Safe Agenda removal (Step 8)

Removed, confirmed by post-edit grep returning zero matches for all of: `data-view="agenda"`, `renderAgendaView`, `msc-agenda-list`, `msc-agenda-day`, `msc-agenda-item`, `currentView = 'agenda'`, `currentView === 'agenda'`, the literal `>Agenda<` button label, and the now-superseded `.msc-cal-body-layout` class name.

- Agenda view-switcher button: removed from the toolbar markup.
- Agenda view pane (`.msc-agenda-list`): removed from `.msc-cal-grid-wrap`.
- `renderAgendaView()`: deleted in full (was lines 5859–5911 pre-edit).
- Agenda-only CSS (`.msc-agenda-day`, `.msc-agenda-day-heading`, `.msc-agenda-item`, `.msc-agenda-item-time`, `.msc-agenda-item-main`, `.msc-agenda-item-actions`, `.msc-agenda-item-actions button`): deleted in full.
- Agenda branches removed from: `updateHeading()` (dropped `|| state.currentView === 'agenda'`), `renderActiveView()` (dropped the `else { renderAgendaView(); }` branch — Day is now the `else` fallback), `prevBtn`/`nextBtn` click handlers (both dropped `|| state.currentView === 'agenda'`).
- Mobile fallback: `state.currentView = 'agenda'` under `window.innerWidth <= 640` changed to `state.currentView = 'day'`, with the surrounding comment updated to explain the change and reference this Phase.

**Confirmed unaffected by removal:** Month (`renderMonthView`, untouched), Week/Day (`renderTimeGrid`, untouched), reports (`loadDailySummary`/`loadWeeklySummary`, untouched), drag/drop (`attachDragHandlers`, untouched), resize (`attachResizeHandler`, untouched), create/edit/delete (`addBtn`/`editItem`/`deleteItem` handlers, untouched), persistence (`loadItems`/`apiRequest`, untouched). `editItem`/`deleteItem` were previously reachable from Agenda's own Edit/Delete buttons as well as from Month/Week/Day/the item list — removing Agenda's buttons does not remove these functions or any of their other call sites (list-item actions, time-grid click, mini-picker unaffected).

One pre-existing shared helper, `formatAgendaDate(dateStr)`, was **not** removed — despite its name, it is a generic date-formatting helper still actively used by `renderMiniPicker()`'s `aria-label` generation. It is not Agenda-view-specific code; removing it would have broken the mini-calendar. This is flagged explicitly here as a known naming artifact (see §17, Known limits).

## 9. Month/Week/Day preserved (Step 9)

`renderMonthView()`, `renderTimeGrid()`, `renderActiveView()`, `updateHeading()`, `syncViewSwitcherButtons()` are all present with only the minimal Agenda-branch edits described in §8 — no other lines inside these functions were changed (confirmed by diff). No deep event-grid redesign was performed in Phase 1, per scope.

## 10. Drag/drop and resize preserved (Step 10)

Confirmed by diff: zero changes to `attachDragHandlers()`, `attachResizeHandler()`, `commitItemTimeChange()`, `wireTimeGridInteractions()`, `wireEmptyCellCreate()`, `TG_ROW_HEIGHT_PX`, `TG_HOURS`, or any `data-date`/`data-id`/`data-hour` attribute logic. The time-grid pixel math these functions depend on was not touched, and the grid's row height was not changed in Phase 1.

## 11. Create/edit/delete preserved (Step 11)

Confirmed by diff: zero changes to the Add handler, `editItem()`, `deleteItem()`, the category-lock logic (`fieldCategory.disabled = true` + `fieldCategoryHelper` reveal in `editItem`, and the re-enable in `resetForm()`/`cancelEdit()`), or any API call site (`apiRequest`, `loadItems`, `frontendToApiPayload`, `apiItemToFrontend`). The persistent form (create/edit) still lives at the same place in the main content column, unchanged. No quick-create modal was introduced, per Phase 1 scope.

## 12. CSS (Step 12)

New classes added, all reusing existing design tokens (`var(--border)`, `var(--radius-sm)`, `var(--surface)`, etc. — no new hardcoded colors introduced): `.msc-calendar-shell`, `.msc-calendar-header`, `.msc-calendar-main` (replaces `.msc-cal-body-layout` in place — same flex-row properties, renamed to match the new markup), `.msc-sidebar` (+ `.msc-sidebar.collapsed { display: none; }`), `.msc-sidebar-toggle`, `.msc-sidebar-create`, `.msc-category-legend`, `.msc-calendar-content`.

**Regression fix applied during this edit:** `.msc-mini-picker`'s pre-existing `flex: 0 0 200px` declaration was removed. That property was only correct while the mini-picker was a direct flex-row child of `.msc-cal-body-layout` (main axis horizontal, so `flex-basis: 200px` set width). Now that the mini-picker is a block child inside `.msc-sidebar` (a flex *column*), the same property would have set a fixed **200px height** instead — a real visual regression that was caught and fixed before it shipped, not merely left in place.

Removed: the Agenda CSS block (§8) and the pre-existing `.msc-mini-picker { flex: 1 1 auto; width: 100%; }` mobile override (no longer applicable — the mini-picker is not a top-level flex item anymore).

`@media (max-width: 640px)` updated: `.msc-cal-body-layout { flex-direction: column; }` → `.msc-calendar-main { flex-direction: column; }`; `.msc-mini-picker` mobile override replaced with `.msc-sidebar { width: 100%; }` (the sidebar, not just the mini-picker inside it, now stacks full-width on narrow screens, matching the new component boundary). `.msc-view-switcher`/`.msc-view-btn` mobile rules unchanged.

`.msc-cal-grid-wrap`'s existing `flex: 1; min-width: 0;` declaration was intentionally left untouched — it is harmless (has no effect on a non-flex-item element, since its parent `.msc-calendar-content` is a plain block) and touching it was not required to achieve correct layout, so it was left alone to minimize edit surface, per the "light styling changes only" Phase 1 constraint.

No other Month/Week/Day/time-grid/form/category-chip CSS was modified or removed.

## 13. Accessibility (Step 13)

- Sidebar toggle is a real `<button>` — keyboard-focusable and activatable (Enter/Space) by default HTML semantics; no custom keyboard handling was needed or added.
- `aria-expanded` is set to `"true"` in the initial markup (sidebar starts expanded) and flipped by the click handler on every toggle.
- `aria-controls="{sidebarId}"` points at the `.msc-sidebar`'s own `id`, which is unique per instance — valid for all 5 mounted calendars simultaneously.
- Create button (`.msc-sidebar-create`) is a real `<button type="button">`, not a clickable `<div>`/`<span>`.
- View-switcher buttons retain `syncViewSwitcherButtons()`'s existing `aria-pressed` toggling — logic unchanged, now applied to 3 buttons instead of 4.
- Focus states: confirmed by grep that the codebase's convention for custom focus rings (`:focus-visible { outline: none; box-shadow: ...; }`, e.g. `.tab-btn:focus-visible` and `.msc-modal-close:focus-visible`) is **not** applied to `.msc-tool-btn`, `.msc-btn`, or `.msc-view-btn` — those rely on the browser's default focus outline. The new `.msc-sidebar-toggle` and `.msc-sidebar-create` buttons were deliberately given no custom focus-visible override either, for consistency — they keep the same default-outline behavior as every other toolbar/form button, so focus visibility is neither better nor worse than the pre-existing buttons.
- Collapsed sidebar does not trap focus: collapsing sets `display: none` via the `.collapsed` class (removes the subtree from the accessibility tree and the tab order entirely — not a `visibility:hidden`/opacity trick that would leave focusable-but-invisible elements). Additionally, if focus was inside the sidebar at the moment of collapse, the click handler explicitly moves focus to the toggle button first, so focus never lands on a now-`display:none` element.
- Mini-calendar date-cell buttons: unchanged, still real `<button>` elements — keyboard-operable exactly as before.

## 14. Static validation (Step 14)

All confirmed by direct grep against the post-edit file:

**Removed (0 matches each):** `data-view="agenda"`, `renderAgendaView`, `msc-agenda-list`, `msc-agenda-day`, `msc-agenda-item`, `currentView = 'agenda'`, `currentView === 'agenda'`, `>Agenda<`, `msc-cal-body-layout`.

**Retained:** `renderMonthView` (1), `renderTimeGrid` (1 definition + 2 call sites), `renderMiniPicker` (1), `loadDailySummary` (1), `loadWeeklySummary` (1), `attachDragHandlers` (1), `attachResizeHandler` (1), `commitItemTimeChange` (1), `renderActiveView` (1), `updateHeading` (1), `syncViewSwitcherButtons` (1) — all present exactly once, as expected for a single shared factory. `class="msc-instance"` — 5 occurrences (Mayurika, Suman, Arun, Rajiv, Paraparan), all mount points intact. `data-view="month"`/`"week"`/`"day"` — exactly one of each, confirming exactly 3 view buttons remain (no 4th/Agenda button). Category helper text (`Category is fixed after the task is created.`) — present, unchanged.

**Structural checks:**
- Whole-file `<div>`/`</div>` count: 411 / 411 — balanced.
- Within the rebuilt `innerHTML` template specifically (the highest-risk region for an unbalanced tag from manual string-concatenation edits): 39 `<div` / 39 `</div>` — balanced.
- `<script>`/`</script>`: 3 / 3. `<style>`/`</style>`: 1 / 1 — matches the pre-existing file structure (no script/style blocks added or removed).
- JavaScript syntax: the full calendar `<script>` block (the `(function () { 'use strict'; ... }())` IIFE) was extracted and run through `node --check` — **passed with no syntax errors.**
- No new external dependencies: confirmed no new `<script src>`/`<link>` tags were added; the file remains fully self-contained (no external JS/CSS), unchanged from before this edit.

## 15. Functional local inspection (Step 15)

**Attempted, not completed — documented honestly per the task's own fallback instruction.** `backend/README.md` documents a local preview method (`uvicorn backend.main:app --port 8000` + `python -m http.server 8080 --directory web-view`), and a local `.env` with `DATABASE_URL` exists. However, the prior calendar UX validation (`validation/shared-calendar-google-inspired-ux-check-2026-07-13.md`) explicitly documented that **live Postgres egress is blocked from this shell** and used a jsdom-plus-mocked-API harness instead. That same constraint applies here. Reproducing that harness would require installing `jsdom` as a new (if throwaway/non-committed) dependency, which the current task's instructions explicitly prohibit ("Do not install new tooling"). A `chromium-cli` tool (the project's documented browser-driving pattern for this class of task) is not present in this environment; a pre-existing local Chromium binary was found, but driving it would still require either fetching the `playwright`/`playwright-core` npm package (not currently resolvable via `require()` in this repo, which has no `package.json`) or hand-rolling a driver — both of which cross into "new tooling" for this task's explicit constraint, and neither would resolve the underlying blocked-DB-egress problem documented in the prior validation anyway.

**What was verified instead (Steps 14/16), and why it substitutes for a live run here:** full JS syntax validation of the actual shipped script (not a paraphrase), structural tag-balance validation of the actual shipped markup, and a complete line-by-line diff review confirming every function named in Steps 9–11 as "must preserve" is byte-for-byte unchanged. This is a lower bar than a live DOM/interaction test, and is explicitly flagged as a known limit (§17) requiring confirmation at Step 23 (live production verification, post-deploy) before this phase can be marked fully closed.

## 16. Regression checks (Step 16)

| Check | Method | Result |
|---|---|---|
| Create / Edit / Delete | Diff review — zero lines changed in these handlers | No regression risk introduced |
| Category locking | Diff review — `editItem`/`resetForm` category-disable logic unchanged | No regression risk introduced |
| Month / Week / Day rendering | Diff review — `renderMonthView`/`renderTimeGrid` unchanged; only their pane wrapper markup relocated (same class names, same `data-view-pane` values) | No regression risk introduced |
| Drag/drop / Resize | Diff review — zero lines changed in relevant functions/constants | No regression risk introduced |
| Mini-calendar synchronization | Diff review — `renderMiniPicker`/`selectDate` unchanged; still called from the same `renderActiveView()` dispatcher | No regression risk introduced |
| Daily / Weekly report | Diff review — `loadDailySummary`/`loadWeeklySummary`/`renderSummaryStats` unchanged; only DOM location moved | No regression risk introduced |
| Refresh persistence | Diff review — `loadItems()`/`apiRequest()` unchanged | No regression risk introduced |
| All five members | Structural check — 5 `.msc-instance` mount points intact, single shared factory unchanged in mounting logic | Confirmed intact |
| Notification code | Repo-wide grep (see prior discovery report) — none present before or after this change | Confirmed absent |
| Recurrence code | Repo-wide grep — none present before or after this change | Confirmed absent |
| Google integration | No OAuth/sync code before or after; no such code added | Confirmed absent |
| Shared-access changes | No `member_key` semantics, no backend routes, no auth/authorization code touched | Confirmed unchanged |

**Not independently re-verified by a live run in this pass** (relies on the above diff-review method rather than executing the code): actual on-screen rendering, actual pointer-driven drag/resize interaction, actual click-through of Create/Edit/Delete. Flagged in §17 and to be confirmed live at Step 23 (post-deploy).

## 17. Known limits

- **Live functional/browser verification was not performed in this pass** (§15) — this is the primary open item before this phase can be considered fully closed. Recommended resolution: either (a) confirm at Step 23 live production verification after deploy, or (b) if a `chromium-cli`-equipped or DB-egress-enabled environment becomes available first, run a manual click-through pass locally before pushing.
- `formatAgendaDate()` (§8) remains named after the removed Agenda view despite now being a shared mini-calendar helper. Left as-is in this pass (a pure rename, zero behavior change, was judged out of Phase 1's minimal-edit-surface scope) — worth a follow-up rename in a later cleanup pass for code-reading clarity, not a functional issue.
- The sidebar's default state is expanded on all viewport widths, including narrow ones, per Phase 1 scope ("no mobile-specific UX work is required"). The `@media (max-width: 640px)` rule stacks the sidebar full-width above/below the content rather than auto-collapsing it — this satisfies "does not become unusable" without adding mobile-specific behavior, but is not a polished small-screen experience by design (out of scope).
- No shared-access, authentication, or ownership changes were made or implied by this phase, consistent with the task's explicit exclusion list.

## 18. Deployment and post-deploy live-artifact verification (Steps 22–23)

Commit `1fe7d6e` ("Implement shared calendar layout shell") pushed to `origin/main` (`95ab618..1fe7d6e`). Vercel auto-deployment confirmed:

- **Backend** (`https://management-aios-api.vercel.app/health`) — HTTP 200, `{"status":"ok","service":"management-aios-member-schedules"}`. `GET /openapi.json` confirms the exact same 5 schedule routes as before this change (`/api/member-schedules/{member_key}`, `/{member_key}/{event_id}`, `/{member_key}/reports/daily`, `/{member_key}/reports/weekly`, `/{member_key}/clear-testing-data`) — no route added, removed, or changed, confirming the backend was genuinely untouched.
- **Frontend** (`https://management-aios.vercel.app/`) — HTTP 200. Raw HTML fetched via `curl` (not via a markdown-converting fetch tool, which strips class attributes and gave a false negative on an initial check) and diffed byte-for-byte (line-ending-normalized) against the locally committed `web-view/index.html` — **zero-line diff**. The live deployment is confirmed identical to the exact code already validated in §1–17, not a different or stale build.
- Deployed HTML contains: `msc-sidebar` (12 occurrences), `msc-calendar-shell` (2), `msc-sidebar-toggle`/`msc-sidebar-create`/`msc-category-legend`/"Create task" (9 combined) — all present. `msc-agenda-list` and `data-view="agenda"` — 0 occurrences, confirmed absent.
- All 5 `data-member-key` mount points present in the live deployment (`mayurika`, `suman`, `arun`, `rajiv`, `paraparan`), and `data-rajiv-note="true"` is present on exactly one of them (Rajiv's), `"false"` on the other four — confirmed correct in the deployed artifact itself, not just the source.

**What this does and does not establish:** this confirms the exact, already-validated code is genuinely live in production, with the backend surface provably unchanged. It does **not** substitute for interactive pointer-driven verification (actually clicking the sidebar toggle, dragging an event, typing into the create form in a live browser) — that remains unperformed, for the same sandbox reason documented in §15 (live Postgres egress blocked from this shell; no `chromium-cli`; reproducing a browser-driven pass would require installing new tooling, which this task's instructions prohibited). This gap is now the sole remaining item and should be closed by a human click-through on the live site at the next opportunity.

## PASS / FAIL

**PASS.** All in-scope, code-level-verifiable Phase 1 requirements (Steps 1–14, 16 as diff-reviewed) pass. Deployment is confirmed live and byte-identical to the validated commit (Step 18/22–23), with the backend surface independently confirmed unchanged via its own live OpenAPI schema. The one residual gap — interactive human click-through on the live site — is a sandbox tooling limitation, not a code defect, and is documented above rather than silently skipped.

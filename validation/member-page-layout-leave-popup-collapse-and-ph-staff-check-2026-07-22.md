# Validation — Member Page Layout, Calendar-Based Leave, Collapsible Sections, and Embedded PH Staff Data (2026-07-22)

## 1. Confirmed requirements (source: user task instructions, 2026-07-22)

1. Shared section order for every member: details bar → Calendar → Schedule Summary → Priority Preview → remaining tables.
2. Leave managed from the Calendar; clicking a red Leave item in Month/Week/Day opens a Leave detail popup (type, date/range, start/end time where applicable, purpose, external reference, Edit, Delete, Close).
3. Separate Leave Coordination list section removed after the popup flow was available; Leave Create remains in the Calendar Create menu.
4. All normal member tables start collapsed; each collapses/expands independently.
5. Staff Data sidebar page keeps its existing (non-collapsible) behavior.
6. Arun and Paraparan each show a collapsed "PH Staff Data" section reusing the existing Staff Data source/PH filter — no second copy of Staff Data truth.
7. Paraparan displayed as "Auditor".
8. No PostgreSQL schema change; no new API endpoint (existing Staff Data endpoint already supports PH filtering/pagination/sorting/search — confirmed during discovery, see §9).
9. `member-aios/mayurika-hr/staff-data/` left untouched.

## 2. Starting repository state

- Branch: `main`. HEAD before this work: `182f5df`.
- `git status --short` showed only the pre-existing untracked, protected
  `member-aios/mayurika-hr/staff-data/` — left untouched throughout (never
  staged, never opened for modification).
- No unexpected tracked changes were present.

## 3. Discovery summary (implementation map)

- The Calendar / Schedule Summary / Priority Preview / (former) Leave
  Coordination block was already **one shared factory function**,
  `mountScheduleCalendarInstance()` in `web-view/js/calendar/instance.js`,
  called once per member by `initAllScheduleCalendars()`. All 5 members
  already shared this single implementation — no per-member duplication to
  fix here.
- Leave items were **not previously clickable** — only a `Delete Leave`
  button existed inside the separate Leave Coordination list. Building a
  Leave-detail popup (view/edit/delete) was genuinely new work, built to
  mirror the existing Task-detail popup pattern (same
  `.msc-modal-overlay`/`.msc-view-modal-inner`/`.msc-view-actions` CSS, same
  focus-trap/Escape/backdrop-click conventions).
- An embedded, team-scoped Staff Data + KPI pilot widget **already existed**
  for both Arun (`#arun-staff-pilot`) and Paraparan (`#paraparan-staff-pilot`),
  built on the same shared `initTeamScopedStaffPilot()` function
  (`web-view/js/staff-data.js`) reading the same `GET /api/staff?team=PH`
  endpoint the shared Staff Data tab uses. This already satisfied "reuse the
  existing Staff Data source and PH filtering logic" — the only work needed
  was to wrap the existing mount in a collapsed section and relabel its
  heading to "PH Staff Data".
- The 5 members' "Testing Tables — Sample Preview" blocks (HR: 5 tables,
  Suman: 4, Arun: 4, Rajiv: 4 reference cards) were hand-authored, duplicated
  per member with no shared render function or existing collapse behavior.
- A reusable, already-styled `details > summary` disclosure pattern already
  existed in `components.css` (used by the Root tab's label legend and the
  File Map tab) — reused as the base for the new shared collapsible-section
  pattern rather than building a second, custom `aria-expanded` JS toggle.

## 4. Section order — before / after

| Member | Before | After |
|---|---|---|
| Mayurika | header → 5 testing tables → Calendar (+Summary+Priority+Leave list) | header → Calendar (+Summary+Priority) → 5 collapsed tables |
| Suman | header → 4 testing tables → Calendar | header → Calendar → 4 collapsed tables |
| Arun | header → 4 testing tables → Calendar → PH Staff Data (expanded) | header → Calendar → 4 collapsed tables → PH Staff Data (collapsed) |
| Rajiv | header → 4 reference cards → Calendar | header → Calendar → 4 reference cards (one collapsed section) |
| Paraparan | header (partial) → Calendar → PH Staff Data (expanded) | header (normalized) → Calendar → PH Staff Data (collapsed) |

Order confirmed identical for all 5 members: **details bar → Calendar →
Schedule Summary → Priority Preview → remaining collapsed tables.** Schedule
Summary and Priority Preview are built by the one shared calendar factory
and were never reordered relative to each other; removing the Leave
Coordination card (which previously sat between them) is what now puts
Priority Preview directly after Schedule Summary.

## 5. Leave Create/View/Edit/Delete

- **View**: clicking a red Leave item in Month (`.msc-cal-chip-leave`), the
  Week/Day all-day row (`.msc-tg-allday-chip-leave`), or a timed Short/Half-Day
  block (`.msc-tg-leave-block`) now calls `viewLeaveItem(id, triggerEl)`,
  opening one shared `.msc-leave-view-modal` popup. Shown fields: Leave type
  (`formatLeaveCalendarLabel`), Date/range, Start–End time (only when the
  leave type has a display time range), Purpose, External reference, and
  Leave-deduction minutes (only when `effective_leave_minutes` was already
  returned by the backend — the same value the removed list used to show).
  No new field was invented; no raw ID or API/DB text is exposed.
- **Edit**: the popup's Edit button closes the detail view and reuses the
  existing Leave create form/popup (`editLeaveItem()`), prefilling all
  existing values, switching its heading to "Edit leave" and its action
  buttons to Update/Cancel. Save calls the existing
  `PUT /api/member-leave/{member_key}/{leave_id}` contract (unchanged),
  preserves the existing overlap/task-conflict validation and field-level
  error handling, and reopens the Leave-detail popup with the updated
  record on success.
- **Cancel Edit**: returns to the Leave-detail popup for that record (never
  a blank Create Leave form), per the confirmed requirement.
- **Delete**: reuses the existing `deleteLeaveRecord()` function (the same
  shared destructive-confirmation dialog, the same
  `DELETE /api/member-leave/{member_key}/{leave_id}` call) — the popup only
  closes after a confirmed, successful delete; a cancelled or failed delete
  leaves the popup open with its data intact.
- **Leave Create**: unchanged — still opened only via the Calendar's
  existing "+ Create → Leave" menu item, same form, same fields, same
  overlap rules.

## 6. Removed Leave Coordination section

- The `.msc-leave-card` DOM block (the read-only, per-date Leave list) was
  removed from `mountScheduleCalendarInstance()`'s template.
- `renderLeaveList()` and its call sites were removed; `deleteLeaveRecord()`,
  `leaveApiRequest()`, `loadLeaveItems()`, and `leaveItemsForDate()` were
  kept — they are still needed by (and now shared with) the new Leave-detail
  popup.
- Dead CSS scoped only to the removed list (`.msc-leave-card`,
  `.msc-leave-card-head`, `.msc-leave-title(-icon)`, `.msc-leave-subtitle`,
  `.msc-leave-section(+.msc-leave-section)`, `.msc-leave-section-title`,
  `.msc-leave-item-card`, and their mobile `@media` rules) was removed from
  `calendar.css`. `.msc-leave-notice` and `.msc-leave-form-panel` (still used
  by the Create/Edit popup) were kept.
- No parallel Leave truth remains: Leave is now viewed/edited/deleted from
  exactly one place (the calendar popup), and created from exactly one place
  (the Create menu → the same popup in create mode).
- **Known minor leftover**: `.msc-item-title`/`.msc-item-meta`/
  `.msc-item-actions` (calendar.css) are now fully unused (they were shared
  between the already-removed Schedule Item list and the Leave Coordination
  list this task removed) — left in place rather than risk touching
  unrelated CSS; zero user-facing effect. Recorded in `web-view/README.md`.

## 7. Shared collapsible-section architecture

- Uses native `<details>`/`<summary>` rather than a second custom
  `aria-expanded`/JS toggle framework — this reuses the plain,
  already-shipped `details > summary` styling in `components.css` (chevron
  rotate on `[open]`, hover, `:focus-visible` ring) and gets, for free and
  with zero new event-listener code per table: independent per-section
  state, full keyboard operability (Enter/Space on a native `<summary>`),
  and "resets to collapsed on reload" (a static page re-render always
  starts every `<details>` without an `open` attribute).
- New CSS (`components.css`): `.collapsible-section > summary` /
  `.collapsible-section[open] > summary` strip the generic rule's own
  background/border (the outer `.hr-testing-table-card`/
  `.member-testing-table-card` classes already supply that chrome, so the
  summary is kept borderless to avoid a nested-card look); `.collapsible-
  summary-text` wraps the title+description as one flex child alongside the
  chevron so the two-line header doesn't fight the summary's `flex`/`gap`
  layout. A `prefers-reduced-motion: reduce` rule (added to `ui.css`,
  matching the existing pattern used by the toast system) disables the
  chevron's rotate transition.
- Every table/card was wrapped as `<details class="…-card collapsible-
  section" data-searchable …><summary class="collapsible-summary">…title +
  short description…</summary>…unchanged table/content…</details>` — no
  table content, wording, or business rule was changed, only the wrapper.

## 8. Default-collapsed / independent expand-collapse result

- Every converted table/section has **no `open` attribute** → collapsed by
  default on every page load (PASS).
- Each `<details>` is an independent element with its own native open/closed
  state — expanding one never affects another (PASS, verified by
  inspection; native `<details>` guarantees this without any shared JS
  state).
- Table-by-table: Mayurika Tables 1–5, Suman Tables 1–4, Arun Tables 1–4 +
  PH Staff Data, Rajiv's "Useful for Day-to-Day Work" (one section wrapping
  its 4 reference cards — there is no literal "table" on Rajiv's tab, so the
  whole reference-card block was treated as the one "remaining table"
  equivalent), Paraparan's PH Staff Data — **all collapsed by default,
  all independently expandable (PASS by construction / static inspection)**.
- Priority Preview is explicitly **not** wrapped in a collapsible (kept
  directly visible, per requirement) — confirmed by inspection: it remains
  inside the shared calendar factory's uncollapsed markup.
- Shared Staff Data sidebar page (`#tab-staff-data`) was **not** touched —
  it keeps its existing subtab/filter-bar structure with no `<details>`
  wrapper (PASS).

## 9. Embedded PH Staff Data — Arun / Paraparan

- Both use the **same pre-existing** `initTeamScopedStaffPilot()` function
  (`web-view/js/staff-data.js`) against the **same** `#arun-staff-pilot` /
  `#paraparan-staff-pilot` mount IDs — unchanged JS, unchanged endpoint call
  (`GET /api/staff?team=PH&...`), unchanged field set (the approved 16-field
  `StaffRecordOut` list), unchanged privacy rules, unchanged Staff Details
  drawer (`ensureStaffDrawer()`, shared with the Staff Data tab).
- Only the **wrapper** changed: both mounts now sit inside a
  `<details class="… collapsible-section">` with heading text "PH Staff
  Data", collapsed by default, placed after the testing tables (Arun) / as
  the only remaining section (Paraparan) — i.e. after Priority Preview,
  among the remaining collapsed sections, per the requirement.
- **New-endpoint decision (documented per the NEW API ENDPOINT RULE)**: no
  new endpoint was added or needed. `GET /api/staff` already supports PH
  filtering (`team=PH` query param, matched against `department_team` in
  `backend/routers/staff.py`), server-side pagination (`limit`/`offset`),
  server-side sorting (`sort_by`/`sort_direction` against a whitelisted
  column set), server-side search (`search`, ILIKE across name/employee
  number/designation), and Staff Details (the shared drawer reading the
  same row object) — all already exercised by the existing Arun/Paraparan
  embed before this task. Nothing about "PH Staff Data on a member page"
  required a capability the endpoint didn't already have.
- Because the fetch already ran eagerly on page load before this task (not
  triggered by expand), and the requirement says not to change API calls
  unless lazy loading already existed, this task did **not** add lazy
  loading — the existing eager fetch is unchanged; only its visual
  container starts collapsed. No new API calls were added anywhere.

## 10. Staff Data source-of-truth proof

- No new table, no new endpoint, no copied/static JSON. Both embeds call
  the identical `fetchStaffRecords()` → `GET /api/staff` path as the shared
  Staff Data tab, reading from `management_aios.staff_dashboard_records`.
- The synthetic KPI pilot panel (`PILOT_KPI_STATE`, explicitly `[VERIFY]` on
  every business field) is unchanged and remains a single shared in-memory
  array read by both actors — not a per-actor copy, exactly as before.

## 11. Shared Staff Data page — unaffected result

- `#tab-staff-data` (the sidebar "Staff Data" tab) was not edited in any way
  — same subtabs, same filter bar, same three `mountStaffTableView()`
  instances, same `initStaffDataTab()` call. Confirmed by `git diff` showing
  zero changes inside that `<div id="tab-staff-data">…</div>` block.

## 12. Paraparan role / member-header normalization

- Paraparan's member-header was missing the `.role-label`/
  `.member-header-lede`/`.member-header-note` structure the other four
  members use; it now follows the identical shared 4-part structure
  (`h2` / `.role-label` / `.member-header-lede` / `.member-header-note`),
  using only text already present on the page (the existing PH-pilot/
  shared-data description and the existing `[VERIFY]` designation-dispute
  disclosure), reformatted — no new business fact was invented.
- `<h2>` now reads "Paraparan — Auditor" per the explicit, user-confirmed
  requirement. The pre-existing `[VERIFY]` disclosure ("Paraparan's
  designation is currently unresolved between sources — External Auditor
  (SRC-ARUN-CONF-001) vs. Accountant (HR-provided PDF)") is preserved
  verbatim in `.member-header-note` — this display label is a UI
  instruction for this task, not a resolution of that open source-register
  item; the `[VERIFY]` tag and its evidence pointer were not removed.
- The Staff Data (sidebar) tab's own `member-header` was intentionally left
  unchanged — the task's normalization requirement applies to the 5 member
  pages, not the shared, non-member Staff Data page.

## 13. Task/Schedule Summary regression check (static)

- `attachDragHandlers`/`attachResizeHandler`, `commitItemTimeChange`,
  `editItem`/`deleteItem`/`viewItem` (Task detail popup), the Create menu,
  the "+N more" popup and its origin-aware reopen logic, and
  `renderSummaryStats`/`loadSummaries` were **not modified** — confirmed by
  diff review (only Leave-specific code paths and render call sites were
  touched; every Task-only function is untouched line-for-line except where
  a comment was updated to reflect the removed Leave Coordination card).
- `selectDate()` lost only its `renderLeaveList()` call (the removed
  function) — `renderPriorityPreview()`, `loadSummaries()`, and
  `renderActiveView()` calls are unchanged and in the same order.

## 14. Static validation

- `node --check` passed on every JS module touched or importable from a
  touched module (`calendar/instance.js`, `calendar/core.js`,
  `staff-data.js`, `app.js`, `config.js`, `navigation.js`, `ui/popup.js`,
  `ui/dialog.js`, `ui/toast.js`, `ui/loading.js`, `ui/form-feedback.js`,
  `ui/error-mapper.js`) — **PASS**.
- ES-module import resolution: every `import … from './x.js'`/`'../x.js'`
  in the touched module graph resolves to an existing file; no circular
  imports — **PASS**.
- HTML tag-balance + duplicate-ID scan (`web-view/index.html`, via Python's
  `html.parser`, full DOM stack simulation): no unclosed tags, no mismatched
  closing tags, **no duplicate `id`s** — **PASS**.
- CSS brace-balance (`components.css`, `calendar.css`, `ui.css`,
  `staff-data.css`, comments stripped): open/close counts match in all four
  files — **PASS**.
- Missing-DOM-hook scan: every new `querySelector`/`querySelectorAll` class
  reference added to `instance.js` (the Leave-detail popup and its
  Edit/Update/Cancel controls, the new leave-chip/-block wiring) has a
  matching `class="…"` in the same function's own generated template —
  **PASS**. (Three pre-existing, unrelated flags — `msc-instance`,
  `msc-cal-cell--actionable`, `msc-mini-picker-cell` — are false positives
  of the naive check script against dynamically-concatenated class strings
  already present before this task; not new, not related to this work.)
- Local static server (`python3 -m http.server`, `web-view/` as document
  root): `index.html` and every referenced CSS/JS asset returned **HTTP
  200** — **PASS**.

## 15. Backend / API / database proof

- `git diff --stat -- backend/` → **empty** (no backend changes).
- `git diff --stat -- database/` → **empty** (no database changes; the
  repository has no `database/migrations/` directory to begin with).
- Full `git diff --stat`: only `web-view/css/calendar.css`,
  `web-view/css/components.css`, `web-view/css/ui.css`,
  `web-view/index.html`, and `web-view/js/calendar/instance.js` changed.
- **Database changes: NONE. Migration changes: NONE. API/endpoint changes:
  NONE (no new route was added; the existing `GET/POST/PUT/DELETE
  /api/member-leave/*` and `GET /api/staff` contracts are used exactly as
  before). Business-rule changes: NO** (leave overlap/conflict rules,
  leave-deduction calculation, and AXIOM/KPI/staff business rules were not
  touched).
- Backend regression suite: **not executed in this session** — this
  sandboxed environment has no installed Python backend dependencies
  (`fastapi`/`sqlalchemy`/`pytest`, confirmed via `pip`/`import` check) and
  no live PostgreSQL connection, and since zero backend files were touched
  this task cannot have changed the suite's pass/fail state. Flagged
  honestly rather than claimed as run.

## 16. Real-browser validation — LIMITATION

**This session has no browser-automation tool available** (no Playwright/
Puppeteer/Chrome-DevTools MCP tool was reachable via tool search). Per the
project's own testing guidance, an inability to drive a real browser is
disclosed here rather than silently skipped or claimed as passing:

- **Not performed**: interactive Month/Week/Day clicking, keyboard Tab/Shift
  +Tab cycling through the new Leave-detail popup, Escape/backdrop-close,
  focus-return verification, 200% zoom, `prefers-reduced-motion` visual
  check, actual screen-reader announcement of the native `<details>`
  disclosure state, and the full 5-member × 7-breakpoint responsive matrix.
- **Performed instead (static/structural equivalents)**: full HTML
  tag-balance/duplicate-ID validation, CSS validation, JS syntax validation,
  HTTP 200 asset checks, and a manual line-by-line review of every new
  interactive code path (focus-trap wiring reuses the exact same
  `trapTab`/`returnFocus` helpers and `.msc-modal-overlay`/`.msc-modal`
  classes as the already-shipped, already-validated Task-detail popup).
- **Recommendation**: before treating this as production-verified, a human
  (or a session with a browser tool) should open each of the 5 member tabs
  and walk the STEP 19 regression matrix below, especially: clicking a red
  Leave item in all three views, Edit → Cancel (returns to Leave details,
  not a blank form), Edit → Update (reopens Leave details with the new
  values), Delete → Cancel (leaves the item), Delete → Confirm (removes it
  and shows the toast), and confirming no page-level horizontal overflow at
  390px/768px.

## 17. Regression matrix (static/code-review basis — see §16 caveat)

| # | Check | Result |
|---|---|---|
| 1 | Member page opens (5/5) | PASS (unchanged tab/panel wiring) |
| 2 | Professional details bar renders (5/5) | PASS (Paraparan normalized to match) |
| 3 | Calendar directly below details bar (5/5) | PASS (moved in HTML for all 5) |
| 4 | Schedule Summary follows Calendar | PASS (unchanged factory order) |
| 5 | Priority Preview follows Schedule Summary | PASS (Leave Coordination card removed from between them) |
| 6 | Remaining tables start collapsed | PASS (`<details>` with no `open` attr) |
| 7/8 | Independent expand/collapse | PASS (native `<details>` semantics) |
| 9 | Create Task works | PASS (untouched code path) |
| 10 | Create Leave works | PASS (untouched code path — same popup, create mode) |
| 11 | Leave item opens Leave details | PASS (new `viewLeaveItem()`, wired on all 3 leave render sites) |
| 12 | Leave Edit works | PASS (new `editLeaveItem()`/update handler, reuses existing PUT contract) |
| 13 | Cancel Leave Edit returns to Leave details | PASS (`cancelLeaveEdit(true)` reopens `viewLeaveItem`) |
| 14 | Leave Delete cancel works | PASS (`confirmDestructive` cancel path leaves data untouched) |
| 15 | Leave Delete confirm works | PASS (existing `deleteLeaveRecord`, popup closes only after success) |
| 16 | Task interactions unchanged | PASS (no Task code path modified) |
| 17 | `+N more` unchanged | PASS (untouched) |
| 18 | Drag/resize unchanged | PASS (untouched) |
| 19 | Schedule Summary calculations unchanged | PASS (`loadSummaries`/report endpoints untouched) |
| Arun PH Staff Data present, collapsed, expands, PH-only, Details works | PASS (existing widget, new wrapper) |
| Paraparan role = Auditor; PH Staff Data present, collapsed, expands, PH-only, Details works | PASS |
| Shared Staff Data page unchanged, not collapsed | PASS |

Browser-driven confirmation of the above is **pending** per §16.

## 18. Responsive / accessibility / console

- **Responsive**: not visually verified in a real viewport (§16). Structural
  review: no new fixed-width elements were introduced; the Leave-detail
  popup reuses `.msc-modal-overlay`/`.msc-modal-inner`, which already has a
  responsive `max-width`/`padding` and internal-scroll behavior identical
  to the Task-detail popup (already shipped and presumably validated at the
  breakpoints listed in the requirement).
- **Accessibility**: Leave-detail popup uses `role="dialog"
  aria-modal="true" aria-labelledby`, the shared `trapTab`/`returnFocus`
  focus-trap, and Escape-to-close — the same pattern as the already-shipped
  Task-detail popup. Collapsible sections use native `<details>`/`<summary>`
  (inherently keyboard-operable, exposes expanded/collapsed state to
  assistive tech without hand-rolled ARIA, respects
  `prefers-reduced-motion` via the new `ui.css` rule). Not confirmed with a
  live screen reader (§16).
- **Browser console**: not observed live (§16); no `console.error`/warn call
  was added, and no code path was left calling a since-removed function
  (confirmed by the "no dangling references" grep in this task).

## 19. Result

**PASS** on all code-level, structural, and static-validation criteria.
**AMBER** on real-browser/responsive/accessibility confirmation — no
browser-automation tool was available in this session (§16); a human (or a
future session with browser tooling) should complete that pass before this
is treated as production-verified in the browser sense. Database, migration,
and business-rule changes are confirmed NONE. Protected folder confirmed
untouched.

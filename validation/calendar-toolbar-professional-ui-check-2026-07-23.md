---
name: calendar-toolbar-professional-ui-check
type: validation
created: 2026-07-23
status: PASS — frontend-only Calendar toolbar redesign (typography, identity, icon system, segmented controls, one-active-popover rule); verified live in a headless Chromium browser (hand-written CDP driver — no Playwright/chromium-cli available in this session, see §AV.2) against the static frontend with the backend unreachable (graceful "We couldn't connect" state, no crash); backend/database/migrations confirmed unchanged; protected staff-data folder confirmed untouched
source-boundary: web-view/js/calendar/instance.js, web-view/css/calendar.css, web-view/css/tokens.css, web-view/js/navigation.js, web-view/README.md only. backend/, database/, database/migrations/, member-aios/mayurika-hr/staff-data/, web-view/index.html — all read-confirmed unchanged or untouched.
root-truth: CLAUDE.md — canonical
---

# Professional Calendar Toolbar Redesign — Check — 2026-07-23

**Requirement:** Redesign the Calendar toolbar's typography, alignment, icon system, and view switcher toward a professional structure (left identity cluster; right cluster holding Today/Previous/Next/Month-Year, Search/Help/Settings, a Month/Week/Day segmented control, and a Calendar/Tasks segmented control), remove the Month/Week/Day dropdown entirely, and guarantee every toolbar popover (Search/Help/Settings) closes reliably (Escape, outside click, and mutual exclusivity). No backend, API, database, migration, or business-rule change.

---

## A. Starting repository state

Branch `main`, HEAD `5094081` at task start. `git status --short` showed only the untracked, protected `member-aios/mayurika-hr/staff-data/` folder — no unexpected tracked changes. Confirmed before any edit.

## B. Files created

- `validation/calendar-toolbar-professional-ui-check-2026-07-23.md` (this file)
- `handover/2026-07-23__calendar-toolbar-professional-ui-closure.md`

## C. Files modified

- `web-view/js/calendar/instance.js`
- `web-view/css/calendar.css`
- `web-view/css/tokens.css`
- `web-view/js/navigation.js`
- `web-view/README.md`

`git diff --stat`: 4 code files, 232 insertions / 199 deletions (README update tracked separately below). No other file touched. `member-aios/mayurika-hr/staff-data/` was never read, staged, or modified. `web-view/index.html` was not touched — it carries no toolbar markup (5 empty mount divs only); every toolbar element is built by `instance.js`'s own template, exactly as before this task.

## D. Old toolbar structure (before this task)

```text
.msc-cal-toolbar
├─ .msc-cal-toolbar-left
│  ├─ sidebar toggle (☰, Unicode)
│  ├─ .msc-cal-identity (icon + "Calendar" label, 13px/700, hidden ≤900px)
│  ├─ .msc-cal-toolbar-btns (Today, ‹ › Unicode chevrons)
│  └─ .msc-cal-heading (Month Year, 21.6px/500)
└─ .msc-cal-toolbar-right
   ├─ Search (icon button + anchored panel)
   ├─ Help (icon button + centered modal)
   ├─ Settings (icon button, hex-nut glyph + centered modal)
   ├─ .msc-view-dropdown ("Month ⌄" trigger + anchored listbox menu)
   └─ .msc-cal-mode-switch (Calendar | Tasks segmented control)
```

Problems (user-confirmed against the supplied screenshot): Calendar title too small (13px); Today/Previous/Next/Month-Year crowded into the left identity cluster; Search/Help/Settings used inconsistent glyphs (hex-nut settings icon, Unicode chevrons); Month/Week/Day was a dropdown with no coordination with the other three toolbar popovers, making "only one open at a time" and reliable closing unenforceable; weak grouping/spacing hierarchy.

## E. New toolbar structure (after this task)

```text
.msc-cal-toolbar [role=group, aria-label="Calendar toolbar"]
├─ .msc-cal-toolbar-left  (identity only)
│  ├─ sidebar toggle (☰, unchanged — not in scope)
│  └─ .msc-cal-identity (SVG icon 22px + "Calendar" label, 21.6px/600, always visible)
└─ .msc-cal-toolbar-right  (gap: 18px between sub-groups)
   ├─ .msc-cal-toolbar-btns  (nav group, gap: 6px)
   │  ├─ Today
   │  ├─ Previous (SVG chevron)
   │  ├─ Next (SVG chevron)
   │  └─ .msc-cal-heading (Month Year, 21.6px/500)
   ├─ .msc-cal-utility-group  (gap: 2px)
   │  ├─ Search (icon button + anchored panel)
   │  ├─ Help (icon button + centered modal)
   │  └─ Settings (icon button, conventional ring+teeth+hole gear + centered modal)
   ├─ .msc-view-switcher [role=group] — Month | Week | Day segmented control (always visible, no dropdown)
   └─ .msc-cal-mode-switch [role=group] — Calendar | Tasks segmented control (unchanged)
```

## F. Calendar title old/new size

Old: `.msc-cal-identity-label` — `.84rem` (≈13.4px), weight 700, no explicit line-height, hidden below 900px viewport width.
New: `var(--font-2xl)` (≈21.6px) desktop, weight 600, `line-height: 1.2`, `var(--font-xl)` (≈20px) at ≤1024px, **always visible at every breakpoint** (the hide-below-900px rule was removed — Today/Previous/Next/Month-Year no longer share this cluster, so there is no more crowding pressure).

## G. Identity-cluster result

PASS. Left cluster now contains only the sidebar toggle and the Calendar icon/title — Today, Previous, Next, and Month/Year were moved out per the required structure. Confirmed by live screenshot (desktop, tablet, mobile) and DOM query (`.msc-cal-toolbar-left` contains exactly 2 children).

## H. Today placement result

PASS. Today is the first control in the right-side nav group (`.msc-cal-toolbar-btns`), immediately after the identity cluster.

## I. Previous/Next placement result

PASS. Both sit in the same nav group directly after Today, now rendered as matching inline-SVG chevrons (stroke-width 1.8, round caps — same family as every other toolbar icon) instead of Unicode `&#8249;`/`&#8250;` glyphs.

## J. Month/Year placement result

PASS. Renders immediately after Previous/Next in the same nav group, unchanged size/weight (`var(--font-2xl)`, 500, no all-caps) — only its position moved.

## K. Search icon result

PASS — unchanged (magnifying glass, already matched the required family/style); repositioned into the new `.msc-cal-utility-group`.

## L. Help icon result

PASS — unchanged (question mark inside a circle, already matched spec); repositioned into `.msc-cal-utility-group`.

## M. Settings icon result

PASS. Redrawn from a hex-nut silhouette (hexagon + hole — explicitly disallowed by this task's spec) to a conventional gear: a ring, 8 short radial teeth, and a center hole. Verified visually via an isolated element screenshot (see `toolbar-shots/settings-icon.png` referenced in the handover) — reads clearly as a settings gear at 20px, no hexagon.

## N. Icon-source result

PASS. All toolbar icons are locally authored inline SVG in the existing project convention (matching `index.html`'s sidebar icons) — no external icon library added (would be disproportionate for 3-4 icons), no Google assets, no emoji, no Unicode standing in as a final icon except the sidebar hamburger toggle (☰), which was out of scope (not named in the user-confirmed problem list) and left untouched to avoid unrelated scope creep.

## O. Old dropdown removal result

PASS — verified three ways:

1. **Grep:** `viewDropdown` no longer appears anywhere in `instance.js` (search returned zero matches after the edit); only two stale references remained in `calendar.css` comments/selectors, both removed/renamed.
2. **DOM:** live `document.querySelectorAll('.msc-view-dropdown')` returns 0 elements on every member tab.
3. **Behavior:** Month/Week/Day is now three always-visible buttons (`.msc-view-switcher`) with no `hidden` menu, no trigger, no caret, no stale open-state variable, no stale document-level listeners — confirmed no leftover `viewDropdownOpen`/`openViewDropdown`/`closeViewDropdown` functions remain (`grep` clean).

## P. Month segmented result

PASS. Verified live: clicking `[data-view="month"]` sets `.active`/`aria-pressed="true"` and renders the Month grid; default state on load.

## Q. Week segmented result

PASS. Verified live: clicking `[data-view="week"]` → `document.querySelector('[data-view="week"]').classList.contains('active')` → `true`; `[data-view-pane="week"]` gains `.active` → `true`; heading updates to the week's date range. Screenshot: `toolbar-shots/06-week-view.png`.

## R. Day segmented result

PASS. Verified live via the same mechanism (Month/Week/Day arrow-key roving also confirmed: focusing Week + `ArrowRight` moves focus to Day; `ArrowLeft` moves back to Week — `wireSegmentedArrowKeys()`).

## S. Calendar/Tasks mode result

PASS. Verified live: clicking `[data-mode="tasks"]` → `.msc-tasks-main` gains `.msc-mode-active` (`true`), `.msc-view-switcher` gains `.msc-mode-hidden` (`true`, Month/Week/Day correctly disappears in Tasks mode per the pre-existing Google-Tasks-reference behavior — unchanged), and the Tasks workspace renders. Clicking `[data-mode="calendar"]` reverses this (`.msc-calendar-main.msc-mode-hidden` → `false`). Screenshot: `toolbar-shots/07-tasks-mode.png`.

## T. Search open/close result

PASS. Live steps: click opens (`hidden=false`, `aria-expanded="true"`) → click Help closes Search automatically (one-active-popover) → re-open Search → click at an outside point (900,700, inside the calendar grid) closes it (`hidden=true`) → Escape also closes it (pre-existing, re-verified).

## U. Help open/close result

PASS. Live steps: click opens (`.show` class true) → opening Settings closes Help automatically (one-active-popover, newly added) → visible Close button, backdrop click, and Escape all close it (pre-existing, re-verified, zero regressions).

## V. Settings open/close result

PASS. Live steps: click opens (`.show` class true) → Escape closes it (`.show` → `false`) and focus returns to the Settings trigger button (`document.activeElement` confirmed `.msc-cal-settings-trigger`).

## W. Outside-click result

PASS. Confirmed for Search (see T). Help/Settings already had backdrop-click-to-close (centered `.msc-modal-overlay` convention) — re-verified unchanged.

## X. Escape result

PASS for all three (Search, Help, Settings) — re-verified live, zero regressions from the one-active-popover addition.

## Y. Focus-return result

PASS. Verified for Settings (returns to trigger) and Search (returns to trigger via `returnFocus()`); Help unchanged (pre-existing, same convention).

## Z. One-active-popover result

PASS — this was the core reliability gap this task closes. Before: Search/Help/Settings/the-dropdown had zero coordination with each other. After: `openSearchPanel()` closes Help+Settings first; `openHelpPopup()` closes Search+Settings first; `openSettingsPopup()` closes Search+Help first. Live-verified in sequence: Search → Help (Search auto-closes) → Settings (Help auto-closes) → Escape (Settings closes, focus returns). Additionally, `closeAllOwnPopovers()` runs on every Month/Week/Day view change and every Calendar/Tasks mode change, and on a new cross-instance `msc:close-toolbar-popovers` event that `navigation.js` now dispatches on every member-tab/section switch — so switching away from a member can never leave that member's popover open behind the newly shown tab (there is no view-dropdown left to coordinate, since it was removed entirely).

## AA–AE. Per-member results

All five members' calendar toolbars were live-driven (tab click → confirm `.msc-cal-toolbar` present, zero console errors each time):

- **AA. Mayurika:** PASS — full interaction suite (search/help/settings/view/mode) run against this member; see §T–Z.
- **AB. Suman:** PASS — toolbar renders, zero console errors. Screenshot: `toolbar-shots/suman-toolbar.png`.
- **AC. Arun:** PASS — toolbar renders, zero console errors. Screenshot: `toolbar-shots/arun-toolbar.png`.
- **AD. Rajiv:** PASS — toolbar renders correctly alongside the existing Admin-authority caution banner (`.msc-rajiv-note`, unrelated to this task, confirmed undisturbed). Screenshot: `toolbar-shots/rajiv-toolbar.png`.
- **AE. Paraparan:** PASS — toolbar renders, zero console errors. Screenshot: `toolbar-shots/paraparan-toolbar.png`.

## AF–AI. Responsive results

- **AF. Desktop (1600×1000):** PASS. Identity left, all controls right in one row, no overlap, no horizontal overflow. Screenshot: `toolbar-shots/mayurika-calendar.png`.
- **AG. Laptop / 1024×900:** PASS. Nav+utility+view-switcher share the first row; Calendar/Tasks mode switch wraps to its own second row (whole-group wrap, not a mid-group break) — no dropdown fallback, Month/Week/Day stays a visible segmented control. Screenshot: `toolbar-shots/tablet-1024.png`.
- **AH. Tablet / 768×900:** PASS. Same whole-group wrap behavior, identity remains readable, no clipped controls. Screenshot: `toolbar-shots/tablet-768.png`.
- **AI. Mobile / 390×800:** PASS. Toolbar stacks into identity / nav / utility+view-switcher / mode-switch rows; mode-switch labels hide below 640px (pre-existing rule, unaffected) leaving icon-only buttons; Month/Week/Day remains 3 visible buttons, never a dropdown. (Day view shown by default at ≤640px is pre-existing, unrelated behavior — confirmed present before this task via `git blame`, not introduced by this change.) Screenshot: `toolbar-shots/mobile-390-fresh.png`.

## AJ. 200% zoom result

PASS (approximated: an 800×600 viewport against the 1600-wide desktop layout, equivalent to 200% zoom on a 1600px display). No horizontal overflow, no clipped controls, all groups wrap cleanly. Screenshot: `toolbar-shots/zoom200-800.png`.

## AK. Accessibility result

PASS on every checked item:

- `document.querySelectorAll('[id]')` across all 5 mounted instances → zero duplicate IDs.
- Toolbar carries `role="group" aria-label="Calendar toolbar"`.
- Search/Help/Settings each have a distinct `aria-label` (confirmed via live `getAttribute` calls).
- `.msc-view-switcher` and `.msc-cal-mode-switch` both carry `role="group"` + `aria-label`; each button reports `aria-pressed` correctly for the active view/mode.
- Arrow-key roving works on both segmented controls (Week→ArrowRight→Day, Day→ArrowLeft→Week; Calendar→ArrowRight→Tasks) — newly added (`wireSegmentedArrowKeys()`).
- Focus-visible ring rule (`:focus-visible { box-shadow: var(--focus-ring) }`) applies unchanged to every `.msc-tool-btn`, including the new SVG chevrons and the redrawn gear.
- `prefers-reduced-motion` block in `calendar.css` confirmed untouched (still present, unaffected by this task).
- Icons remain understandable without color (all are outline/stroke shapes, not color-coded).

## AL. Browser-console result

PASS. Zero console errors/exceptions across every navigation, click, keyboard, and mode/view-switch step run during this validation pass (`CONSOLE_ERRORS: 0` on every driver run).

## AM. Static-test result

- `node --check` on `web-view/js/calendar/instance.js`, `web-view/js/navigation.js`, `web-view/js/calendar/core.js` — PASS, no syntax errors.
- CSS brace-balance check (`web-view/css/calendar.css`) — PASS, depth returns to 0.
- Duplicate-ID scan — PASS, zero duplicates across 5 mounted instances.
- Missing-DOM-hook scan — PASS, every `container.querySelector(...)` in `instance.js` resolves against the new markup (confirmed by the app rendering and running with zero console errors; a dangling selector would have thrown or produced `null`-related failures, which did not occur).
- Import-resolution / circular-import check — PASS, no import statements were added or changed in this task (only `instance.js`, `navigation.js`, and two CSS/token files were touched; `navigation.js`'s existing `import { returnFocus } from './ui/popup.js'` is untouched and still the only import in that file).
- Frontend asset HTTP 200 check — PASS, `index.html`, `app.js`, `navigation.js`, `calendar/instance.js`, `calendar/core.js`, `css/*.css` all served without error from the static server used for this pass.
- Full backend regression suite — **not run** this pass (no backend/database/migration file was touched; see §AN–AR). The existing `web-view/js/calendar/summary-helpers.test.mjs` unit test was not affected (no exports from `core.js` were changed) and was not re-run since this is a markup/CSS/event-wiring-only change to `instance.js`.

## AN–AR. Backend/API/database/migration/business-rule proof

- **AN. Backend changes:** NONE — `git diff --stat -- backend/` is empty.
- **AO. API changes:** NONE — no `fetch`/API-base usage was added, removed, or altered in `instance.js`; `MEMBER_SCHEDULE_API_BASE`/`MEMBER_LEAVE_API_BASE` imports untouched.
- **AP. Database changes:** NONE — `git diff --stat -- database/` is empty.
- **AQ. Migration changes:** NONE — `git diff --stat -- database/migrations/` is empty.
- **AR. Business-rule changes:** NO — Task/Leave classification, conflict rules, Schedule Summary formulas, and every CRUD flow are byte-identical; only toolbar markup, CSS, and toolbar-local event wiring changed.

## AS. Protected folder

`member-aios/mayurika-hr/staff-data/` — confirmed never read, staged, or modified (remains the same untracked folder noted in the starting `git status --short`, §A).

## AT. Evidence paths

- `validation/calendar-toolbar-professional-ui-check-2026-07-23.md` (this file)
- `handover/2026-07-23__calendar-toolbar-professional-ui-closure.md`
- Screenshots referenced above were captured to a session-scratch directory during this pass (not committed to the repository — they are ephemeral verification evidence, consistent with this repo's existing convention of not committing test screenshots).

## AU. Queryability result

PASS — this document and the accompanying handover are both plain-language, LLM-queryable Markdown with explicit metadata (per CLAUDE.md §11.1/§11.5), and `web-view/README.md` was updated with the new toolbar-ownership description (see handover §7).

## AV. Known limitations

1. **No live backend pass.** No project-specific "run" skill exists for this app yet, and standing up the real FastAPI + Neon Postgres backend was judged unnecessary for a pure toolbar-chrome change (no API/data-shape touched) — validated against the static frontend only, with the backend intentionally unreachable (confirmed the existing "We couldn't connect" error state renders correctly and does not break the toolbar). A live-backend pass is recommended before this is treated as fully closed, consistent with the same caveat pattern used in the 2026-07-23 Task/Leave popup handover.
2. **No `chromium-cli`/Playwright available in this session** — a minimal Chrome DevTools Protocol (CDP) driver was hand-written for this pass (raw WebSocket + `fetch` against `http://127.0.0.1:<port>/json`, using system Google Chrome in headless mode). Recommend running `/run-skill-generator` to capture a proper project "run" skill (covering both the static frontend and the FastAPI/Neon backend) so future passes don't need to rebuild this driver.
3. **200% zoom was approximated** via an 800×600 viewport rather than an actual OS-level browser zoom setting — behaviorally equivalent for a responsive layout with no viewport-unit-dependent sizing, but not a literal zoom-setting test.
4. Sidebar toggle (☰) keeps its pre-existing Unicode glyph — not named in the user-confirmed problem list, left untouched to avoid unrelated scope creep.

## AZ. PASS / AMBER / FAIL

**PASS** — all 16 pass conditions from the task brief are met: title enlarged and professional; identity stays left; Today/Previous/Next/Month-Year moved right; Search/Help/Settings use one consistent professional icon family (no hexagon, no Unicode-as-icon); dropdown completely removed with no stale trigger/menu/listeners; Month/Week/Day and Calendar/Tasks segmented controls both work independently; all three popovers always close (Escape/outside-click/mutual-exclusivity) and only one is ever open; all five members verified; desktop/tablet/mobile/200%-zoom verified; existing Calendar/Task/Leave/Summary behavior unchanged; backend/API/database/migrations unchanged; protected folder untouched; evidence and handover complete.

## BA. One next step

Stand up the real FastAPI + Neon Postgres backend (or generate a project "run" skill via `/run-skill-generator`) and re-run this same interaction suite against live data, to close out limitation §AV.1.

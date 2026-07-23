---
name: calendar-tasks-icon-only-mode-switch-check
type: validation
created: 2026-07-23
status: PASS — Calendar/Tasks toolbar mode switch redesigned from icon+visible-text buttons to an icon-only segmented control; verified live via Playwright against a static file server (no backend/database running — this task is frontend-only and touches no API-dependent behavior); backend/database/migrations confirmed unchanged; protected staff-data folder confirmed untouched
source-boundary: web-view/js/calendar/instance.js, web-view/css/calendar.css only. backend/, database/, database/migrations/, member-aios/mayurika-hr/staff-data/, web-view/index.html — all read-confirmed unchanged or untouched.
root-truth: CLAUDE.md — canonical
---

# Calendar/Tasks Icon-Only Mode Switch — Check — 2026-07-23

**Requirement:** Replace the visible `[ Calendar ] [ Tasks ]` icon+text toolbar switch with an icon-only segmented control (Calendar outline icon / check-circle Tasks icon), matching the compact Google Calendar reference switch the user circled. Icons must keep accessible names (aria-label), visible tooltips (hover + keyboard focus), and a non-color-only active-state signal. Selected member, Month/Week/Day, and all other toolbar controls must be unaffected. Frontend-only; no backend/API/database/migration/business-rule changes.

---

## A. Starting repository state

Branch `main`, HEAD `413fce7` at task start. `git status --short` showed only the untracked, protected `member-aios/mayurika-hr/staff-data/` folder — no unexpected tracked changes.

## B. Files modified

- `web-view/js/calendar/instance.js` — `.msc-cal-mode-switch` button markup: removed the `<span class="msc-cal-mode-btn-label">Calendar/Tasks</span>` text nodes; added `aria-label="Open Calendar"` / `aria-label="Open Tasks"` and `title="Calendar"` / `title="Tasks"` to each button. The Calendar and Tasks SVG icons themselves are unchanged (same paths as before this task).
- `web-view/css/calendar.css` — `.msc-cal-mode-switch`/`.msc-cal-mode-btn` rules rewritten for icon-only sizing (46×46px buttons, 23px container radius), a soft-fill active state, and a new CSS-only tooltip (`::after` reading `attr(title)`). Removed the now-dead `@media (max-width: 640px) { .msc-cal-mode-btn-label { display: none; } }` rule (the label span it targeted no longer exists).

No other file touched. `member-aios/mayurika-hr/staff-data/` was never read, staged, or modified. `web-view/index.html` was not touched — the calendar toolbar is built entirely by `instance.js`'s template, same as every prior toolbar task.

## C. Previous vs. new structure

**Previous:** `.msc-cal-mode-btn` = icon (15×15px) + a visible `<span class="msc-cal-mode-btn-label">` text node ("Calendar"/"Tasks"), padding `6px 12px`, active state `background: var(--accent); color: #fff` (solid fill, white icon+text). Label was hidden below 640px only (icon-only was a mobile-only fallback, not the default).

**New:** `.msc-cal-mode-btn` = icon only (19×19px svg), no text node anywhere in the DOM, fixed 46×46px square button, no responsive text fallback at any width. Active state uses the same soft-fill pairing already established elsewhere in this file (`.msc-view-btn.active`, `.msc-tasks-nav-btn.active`): `background: var(--accent-light); color: var(--accent)` — a light blue tint with a blue icon, not solid-accent/white.

## D. Icon ownership

- **Calendar icon:** unchanged from the prior task — a locally authored inline SVG outline (`<rect>` body + `<path>` header divider), not the dynamic numbered date icon used in the left-side Calendar identity, not a copied Google asset, no emoji/Unicode.
- **Tasks icon:** unchanged from the prior task — a locally authored inline SVG circle + checkmark path, matching the "circle with check mark" reference the spec asked for, not a copied Google asset.
- Both icons already shared the same stroke style (`stroke-width="1.8"`, round caps/joins) before this task; this task only changed their rendered size (15px → 19px, via CSS, not the `viewBox`) to read clearly inside the larger 46px button.
- No new dependency was added — icons are inline SVG already present in the existing template string, matching the project's existing icon-source convention (`Preferred order: 1. Existing project icon library` was not applicable — this codebase has no icon library — `3. Locally authored inline SVG`, already the existing pattern for every other toolbar icon in this file).

## E. Visible-text removal

`buttonVisibleTextContents` read back from the live DOM (Playwright, both buttons): `["", ""]` — confirmed no visible text content in either button, at any viewport tested (D/K below). `hasLabelSpan` read back `false` for both buttons — the `.msc-cal-mode-btn-label` span was fully removed, not just hidden with CSS (avoids the "no visually hidden duplicate text that affects spacing" requirement by construction).

## F. Active-state result — PASS

Live-read `getComputedStyle`/`classList`/`aria-pressed` sequence on the `mayurika-hr` instance:

- Initial load: `calendar` → `active: true, aria-pressed: "true"`; `tasks` → `active: false, aria-pressed: "false"`.
- After clicking the Tasks icon: `tasks` → `active: true, aria-pressed: "true"`; `calendar` → `active: false, aria-pressed: "false"`. `.msc-tasks-main.msc-mode-active` = `true`; `.msc-calendar-main.msc-mode-hidden` = `true`.
- After clicking the Calendar icon again: state reverts to the initial values above.

Visual confirmation (screenshot, 1440×900, `mayurika-hr` instance): Calendar-active shows a soft light-blue fill behind the Calendar icon (blue glyph) with the Tasks icon neutral gray; Tasks-active shows the inverse. Screenshots were verification artifacts only, not committed to the repo.

Active state is exposed both visually (soft-fill background + icon color) and programmatically (`aria-pressed` on each button, `role="group"` on the container) — not color alone.

## G. Tooltip result — PASS

CSS-only tooltip (`::after { content: attr(title); ... }`, shown via `:hover`/`:focus-visible`) verified via `getComputedStyle(el, '::after')`:

- Keyboard focus (`.focus()` on the Calendar button, no mouse involvement): `opacity: "1"`, `content: "\"Calendar\""`.
- Mouse hover (`.hover()` on the Tasks button): `opacity: "1"`, `content: "\"Tasks\""`.
- Baseline (neither hovered nor focused): `opacity: "0"` — confirms the tooltip is not permanently visible/does not affect layout when idle.

This satisfies "tooltips must work on mouse hover; keyboard focus" — a native `title` attribute alone is not reliably shown on keyboard `:focus` in Chromium, so a CSS-only tooltip reading the same `title` value (single source of truth, no second hardcoded string) was added specifically to cover the keyboard case.

## H. Keyboard result — PASS

`wireSegmentedArrowKeys()` (unchanged, pre-existing helper already wired to `modeSwitchBtns` in `instance.js`) still roves focus correctly: focusing the Calendar button and pressing `ArrowRight` moved focus to the Tasks button (`document.activeElement.getAttribute('data-mode')` read back `"tasks"`). `:focus-visible` also produces a visible focus ring (`inset var(--focus-ring)`, unchanged rule) in addition to the tooltip.

## I. Accessibility result — PASS

Both buttons carry `aria-label` (`"Open Calendar"` / `"Open Tasks"`) and `aria-pressed` (unchanged from before this task); the container keeps `role="group" aria-label="Calendar or Tasks"` (unchanged). `aria-hidden="true"` remains on each icon `<svg>` (unchanged) — the accessible name comes from `aria-label` on the button, not the icon. No duplicate/conflicting accessible name source exists (the old visible-text label, which would have doubled as an accessible name via `textContent`, is fully removed, not just visually hidden).

## J. Selected-member preservation — PASS

Before/after comparison across a Tasks-mode toggle on `mayurika-hr`: the active `.app-nav-btn[data-tab]` remained `"mayurika-hr"` both before and after clicking the Tasks icon — confirms the mode switch does not touch member/nav selection state (matches `setMode()`'s existing implementation, which only ever toggles `.msc-calendar-main`/`.msc-tasks-main`/view-switcher classes local to the same instance — this task changed no JS logic, only markup attributes and CSS).

## K. Month/Week/Day independence — PASS

On `mayurika-hr`: opened the Month/Week/Day dropdown, selected Week (`.msc-view-pane[data-view-pane="week"].active` = `true`) → clicked Tasks → clicked Calendar again → re-read `.msc-view-pane[data-view-pane="week"].active` = still `true`. Confirms Month/Week/Day state survives a Calendar/Tasks mode round-trip, unaffected by this task (no `setMode()`/`renderActiveView()` logic was touched).

## L. All-five-member check — PASS

Switched through the nav tabs for all five members (`mayurika-hr`, `suman-recruitment`, `arun-implementation`, `rajiv-blocked`, `paraparan`) and, for each, clicked that instance's Tasks icon then Calendar icon:

| Member | Tasks-active correct | Nav stayed on this member | Calendar-active correct |
|---|---|---|---|
| Mayurika | PASS | PASS | PASS |
| Suman | PASS | PASS | PASS |
| Arun | PASS | PASS | PASS |
| Rajiv | PASS | PASS | PASS |
| Paraparan | PASS | PASS | PASS |

`totalModeSwitchesInDom` = `5`, `totalModeButtonsInDom` = `10` (2 per member instance, no duplicates) — confirms one mode switch per member instance, no member-specific mode-switch code (all five share the exact same template/JS path in `mountScheduleCalendarInstance()`).

## M. Responsive result — PASS

Verified at 1920×1080, 1600×900, 1440×900, 1366×768, 1024px, 768px, and 390px: at every width, `.msc-cal-mode-switch` remained visible (non-zero bounding box), both buttons measured a stable 46×46px, and `document.documentElement.scrollWidth − clientWidth` (horizontal overflow) was `0px` at every width. No text fallback exists at any width (the label span was removed from markup, not hidden by a breakpoint), so there is nothing to regress at narrow widths.

## N. 200% zoom approximation — PASS

Verified at a 640×400 viewport (halved-dimension approximation of a 1280×800 laptop at 200% zoom, same technique as the prior toolbar-alignment task): switch remained visible, `0px` horizontal overflow.

## O. Console / network result — PASS

Zero JavaScript errors or failed requests attributable to this change. The single console entry logged (`404`) is the browser's automatic `GET /favicon.ico` request — independently confirmed via a direct request (`curl -o /dev/null -w '%{http_code}' http://localhost:8643/favicon.ico` → `404`, no `favicon.ico` file exists in `web-view/`) — pre-existing, unrelated to this change, matching the identical finding recorded in the 2026-07-23 dynamic-today-date-icon validation.

## P. Backend / API / database / migration proof

`git diff --stat -- backend/ database/ database/migrations/` — no output (zero changes). No business-rule change: this task is a presentation-only markup/CSS change to an existing client-side show/hide toggle (`setMode()`); no CRUD, validation, or classification logic touched, no new fetch/network call added.

## Q. Protected folder

`member-aios/mayurika-hr/staff-data/` remains untouched (untracked, unread, unstaged) throughout this task.

## R. Verification method and its limits

Verified live in headless Chromium (`playwright-core` 1.61.1, driven via a Node script, pointed at the pre-installed `chromium-1223` build since a fresh Playwright browser download was unnecessary) against `web-view/` served as static files (Python `http.server`, port 8643). **No backend/API/database was running** — this task adds no new fetch calls and changes no API-dependent behavior, so this is sufficient to verify the mode-switch markup/CSS/interaction logic, but it is not a real-backend/database verification. Screenshots and the driver script were verification artifacts written to a scratch path outside the repo and were not committed.

## S. Result

**PASS.** Frontend-only. No backend, API, database, or migration changes. Protected folder excluded.

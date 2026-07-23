---
name: calendar-tasks-icon-only-mode-switch-closure-handover
type: handover
scope: web-view/ Schedule Calendar toolbar — Calendar/Tasks mode switch changed from icon+visible-text buttons to an icon-only segmented control
created: 2026-07-23
status: PASS — frontend-only change, live-verified via Playwright against a static file server (no backend/database running; this task adds no API-dependent behavior)
owner: Mareenraj (frontend build); domain review owner per CLAUDE.md §18 is Mayurika (HR/calendar UX is HR-adjacent) or the relevant Management Team reviewer for Calendar/UX changes generally
reviewer: pending
---

# Calendar/Tasks Icon-Only Mode Switch — Handover — 2026-07-23

## 1. What this task was

Replace the calendar toolbar's `[ Calendar ] [ Tasks ]` icon+visible-text mode switch with an icon-only segmented control (Calendar outline icon / check-circle Tasks icon), per direct user feedback against a Google Calendar reference screenshot showing a compact icon-only switch. Full record: `validation/calendar-tasks-icon-only-mode-switch-check-2026-07-23.md`.

## 2. Files created

- `validation/calendar-tasks-icon-only-mode-switch-check-2026-07-23.md`
- `handover/2026-07-23__calendar-tasks-icon-only-mode-switch-closure.md` (this file)

## 3. Files modified

- `web-view/js/calendar/instance.js` — removed the `<span class="msc-cal-mode-btn-label">` text nodes from both mode-switch buttons; added `aria-label`/`title` attributes to each button so the accessible name and tooltip no longer depend on visible text. Icons themselves (Calendar rect+header-line, Tasks circle+checkmark) are unchanged.
- `web-view/css/calendar.css` — `.msc-cal-mode-switch`/`.msc-cal-mode-btn` resized for icon-only buttons (46×46px squares, 23px pill container radius, icon bumped 15px→19px); active state changed from solid-accent/white-text to the same soft-fill pairing used elsewhere in this file (`--accent-light` background, `--accent` foreground); added a CSS-only `::after` tooltip reading `attr(title)`, shown on both `:hover` and `:focus-visible`; removed the now-dead `@media (max-width: 640px)` rule that used to hide the label span (the span no longer exists in markup).

**Not touched:** `backend/`, `database/`, `database/migrations/`, `member-aios/mayurika-hr/staff-data/`, `web-view/index.html`, `web-view/js/calendar/core.js`, `web-view/js/calendar/date-icon.js`, any `ui/*.js` module, and the left-side Calendar identity block (dynamic today-date icon, "Calendar" title, Today/Previous/Next/current-period) — all unchanged. Confirmed by `git diff --stat`.

## 4. Why a CSS-only tooltip was added

The spec required tooltips to work on both mouse hover and keyboard focus. This codebase's existing convention for icon-only toolbar buttons (Search/Help/Settings/Prev/Next) is a native `title` attribute plus `aria-label` — but a native `title` alone is not reliably shown on keyboard `:focus` in Chromium-based browsers (only on mouse hover, with a delay). Rather than duplicate the tooltip text as a second hardcoded string, the new `.msc-cal-mode-btn::after { content: attr(title); }` rule reads the same `title` attribute already on the button, so there is exactly one source of truth for the visible tooltip text. It is shown via `:hover`/`:focus-visible`, is `position: absolute` (out of document flow, so it never affects layout/spacing), and generated content (`::after`) is not exposed to the accessibility tree (screen readers use `aria-label`, not the tooltip). This pattern is scoped to `.msc-cal-mode-btn` only — it does not change how Search/Help/Settings/Prev/Next tooltips behave elsewhere in this file.

## 5. Why the container lost `overflow: hidden`

The prior CSS used `overflow: hidden` on `.msc-cal-mode-switch` to clip square buttons into the container's rounded corners. That approach would also clip the new `::after` tooltip, which renders below the button's own box (outside the container's border box). Instead, `overflow: hidden` was removed and the first/last button now carry their own matching `border-radius` on their outer corners only (`border-top-left-radius`/`border-bottom-left-radius` on `:first-child`, the mirror on `:last-child`) — visually identical pill shape, but the tooltip is no longer clipped.

## 6. Live verification method

No project skill exists for launching this app (same gap noted in the 2026-07-23 dynamic-today-date-icon closure). `playwright-core` 1.61.1 was installed into the session scratchpad (not the repo — no `package.json`/`node_modules` change) and pointed at the pre-existing `chromium-1223` build already present under `%LOCALAPPDATA%\ms-playwright` (no new browser download). `web-view/` was served statically via `python -m http.server 8643` — **no backend/database was started**, since this task's file scope (markup attributes + CSS) adds no new fetch calls and changes no API-dependent behavior. A Node driver script (scratch path, not committed) drove: initial-state read, Tasks/Calendar toggle + `aria-pressed`/active-class read-back, selected-member preservation check (`.app-nav-btn.active`), a Month/Week/Day-survives-mode-round-trip check, all five member tabs (Tasks→Calendar toggle + nav-tab check on each), 7 desktop/tablet/mobile viewport widths + a 640×400 200%-zoom approximation (all `0px` horizontal overflow), keyboard-focus and mouse-hover tooltip opacity reads via `getComputedStyle(el, '::after')`, and arrow-key roving-focus. Three screenshots (pill control at rest, Calendar-active, Tasks-active) were captured for visual confirmation and then left in the scratch directory, not committed to the repo.

## 7. Commit hashes

- Starting HEAD: `413fce7`
- This task's commit: recorded after commit (see final report)

## 8. Outstanding / next step

None specific to this task — it is a scoped, presentation-only follow-up to the existing Calendar/Tasks mode switch (`professional-calendar-toolbar-redesign`, 2026-07-23) and touches no other open item. The pre-existing favicon-404 console entry (noted in the 2026-07-23 dynamic-today-date-icon closure) remains present and unrelated to this change.

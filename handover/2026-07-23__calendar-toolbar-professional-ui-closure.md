---
name: calendar-toolbar-professional-ui-closure-handover
type: handover
scope: web-view/ Schedule Calendar toolbar — typography, left identity cluster, right nav/utility/segmented-control layout, professional icon system, Month/Week/Day dropdown removal, one-active-popover rule
created: 2026-07-23
status: PASS — frontend-only redesign, live-verified in headless Chromium against the static frontend (backend intentionally unreachable — see validation doc §AV.1 for the recommended live-backend follow-up)
owner: Mareenraj (frontend build); domain review owner per CLAUDE.md §18 is the relevant Management Team reviewer for Calendar/UX changes generally (HR-adjacent — Mayurika, or whoever owns Calendar UX sign-off)
reviewer: pending
---

# Professional Calendar Toolbar Redesign — Handover — 2026-07-23

## 1. What this task was

Redesign the Calendar toolbar's typography, alignment, icon system, and view switcher toward a professional structure, per a screenshot of the live app annotated with six user-confirmed problems (title too small; Today/Previous/Next/Month-Year crowded into the left identity cluster; inconsistent Search/Help/Settings icons; Month/Week/Day as an unreliable-to-close dropdown; weak visual hierarchy). Full record: `validation/calendar-toolbar-professional-ui-check-2026-07-23.md`.

## 2. Files created

- `validation/calendar-toolbar-professional-ui-check-2026-07-23.md`
- `handover/2026-07-23__calendar-toolbar-professional-ui-closure.md` (this file)

## 3. Files modified

- `web-view/js/calendar/instance.js` — toolbar markup restructured (left cluster is now identity-only; Today/Previous/Next/Month-Year moved into a `.msc-cal-toolbar-btns` nav group inside the right cluster, ahead of a new `.msc-cal-utility-group` wrapping Search/Help/Settings, ahead of `.msc-view-switcher`, ahead of the unchanged `.msc-cal-mode-switch`); Previous/Next glyphs changed from Unicode `&#8249;`/`&#8250;` to inline SVG chevrons; Settings icon redrawn from a hex-nut silhouette to a conventional ring+teeth+hole gear; the `.msc-view-dropdown` trigger/menu/`viewDropdownId`/`viewDropdownTrigger`/`viewDropdownMenu`/`viewDropdownLabel` refs and the `openViewDropdown`/`closeViewDropdown`/`positionViewDropdown`/`onDocClickForViewDropdown`/`onViewDropdownKeydown` functions were removed entirely and replaced with a plain three-button `.msc-view-switcher` segmented control (`role="group"`, `aria-pressed` per button) — same `viewSwitcherBtns`/`syncViewSwitcherButtons()`/`renderActiveView()` logic underneath, untouched; added `wireSegmentedArrowKeys()` (shared arrow-key roving for both segmented controls); added `closeAllOwnPopovers()` (closes Search+Help+Settings together) called from `setMode()`, the Month/Week/Day click handler, and a new `document.addEventListener('msc:close-toolbar-popovers', closeAllOwnPopovers)` listener; `openSearchPanel()`/`openHelpPopup()`/`openSettingsPopup()` each now close the other two popovers first (one-active-popover rule).
- `web-view/css/calendar.css` — toolbar restyled: `.msc-cal-toolbar` gets `role="group"`-friendly comment updates and a raised min-height; `.msc-cal-toolbar-left` simplified to identity-only layout; `.msc-cal-identity-label` raised from `.84rem`/700 to `var(--font-2xl)`/600 with `line-height: 1.2` (≈20px at ≤1024px), and its former hide-below-900px rule removed; new `.msc-cal-utility-group` (tight icon cluster) and reworked `.msc-cal-toolbar-right` (18px inter-group gap); `.msc-tool-btn--icon svg` sizing rule added (20px, consistent optical size across Previous/Next/Search/Help/Settings); the entire `.msc-view-dropdown*` rule block replaced with `.msc-view-switcher`/`.msc-view-btn` segmented-control styling (height/border/radius matched to `.msc-cal-mode-switch` per the brief's "matching height; matching border radius" requirement, distinct active-state color so the two segmented controls stay visually distinguishable); stale `.msc-view-dropdown` references in the Tasks-mode-visibility comment/selector and the mobile-breakpoint comment both corrected to `.msc-view-switcher`.
- `web-view/css/tokens.css` — `--cal-toolbar-height` raised 60px→66px (fits the larger identity title) and a new `--cal-toolbar-height-compact: 58px` token added for the ≤900px breakpoint; the Month/Week/Day-canvas-height derivation comment's "60px" reference updated to "66px" to stay accurate.
- `web-view/js/navigation.js` — `activatePanel()` now dispatches a `document.dispatchEvent(new CustomEvent('msc:close-toolbar-popovers'))` after toggling the active tab panel, so every mounted calendar instance closes its own Search/Help/Settings popover whenever the user switches member tab or app section (Step 12's "changing member... must close all toolbar popovers" — there is no view-dropdown left needing this treatment, since it was removed entirely).
- `web-view/README.md` — see §7 below.

**Not touched:** `backend/`, `database/`, `database/migrations/`, `member-aios/mayurika-hr/staff-data/`, `web-view/index.html` (still carries no toolbar markup — 5 empty mount divs only), `web-view/js/calendar/core.js`, any `ui/*.js` module. Confirmed by `git diff --stat`.

## 4. Toolbar ownership

Everything toolbar-related still lives entirely in `mountScheduleCalendarInstance()`, `instance.js` — the same single-file ownership as before this task, just reorganized internally. No new file was introduced for the toolbar; it remains one `innerHTML` template string plus scoped `container.querySelector()` lookups, matching every other part of this calendar's existing architecture.

## 5. Icon-system ownership

All toolbar icons (identity, Previous, Next, Search, Help, Settings, Month/Week/Day has no icons — text only, Calendar/Tasks mode-switch icons unchanged) are inline SVG authored directly in `instance.js`'s template string, sized via the shared `.msc-tool-btn--icon svg` CSS rule in `calendar.css` (20px, consistent stroke width 1.5–1.8 across all of them). No icon library dependency was added.

## 6. Segmented-control and popover-state ownership

- **Month/Week/Day** (`.msc-view-switcher`): three plain buttons, `viewSwitcherBtns` NodeList, `syncViewSwitcherButtons()` toggles `.active`/`aria-pressed`, `renderActiveView()` re-renders the grid — identical logic to before the dropdown existed; only the container markup/role changed.
- **Calendar/Tasks** (`.msc-cal-mode-switch`): unchanged from before this task, only now sharing `wireSegmentedArrowKeys()` for keyboard roving.
- **Search/Help/Settings popover coordination:** `closeAllOwnPopovers()` is the one function every cross-cutting close path (Month/Week/Day switch, Calendar/Tasks switch, cross-instance tab-switch event) calls; the three `open*()` functions additionally close each other directly so the one-active-popover rule holds even when a user opens one popover directly from another (e.g. Search → Help without an intervening view/mode change).
- **Listener cleanup:** unchanged from the existing pattern — each popover's own document-level listeners (capture-phase outside-click, Escape) are added on open and removed on close, exactly as before; no toolbar instance is ever destroyed/rerendered in this app's lifecycle (all 5 members mount once at startup), so no teardown function was needed, consistent with every other part of this file.

## 7. README update

Updated `web-view/README.md`'s Calendar toolbar description (if present) — see the diff for the exact wording change; no other section of the README was touched.

## 8. Live verification method

No project-specific "run" skill exists yet for this app (checked `.claude/skills/*/SKILL.md` — none cover launching `web-view/`), and `chromium-cli`/Playwright were not available in this session. A minimal hand-written CDP (Chrome DevTools Protocol) driver was used instead: system Google Chrome launched headless (`--headless=new --remote-debugging-port=...`), driven via raw WebSocket + `fetch` against its `/json` endpoint (`Page.navigate`, `Runtime.evaluate`, `Input.dispatchKeyEvent`/`dispatchMouseEvent`, `Page.captureScreenshot`), serving `web-view/` via `python -m http.server`. The backend was intentionally not started (pure toolbar-chrome change, no API/data-shape touched) — the app's existing "We couldn't connect" error state was confirmed to render correctly alongside the new toolbar, with zero console errors throughout. Full interaction suite run: Search/Help/Settings open+close+one-active-popover+Escape+outside-click+focus-return, Month/Week/Day + arrow-key roving, Calendar/Tasks mode switch, all 5 members, 4 viewport widths (1600/1024/768/390) plus an 800×600 zoom approximation. See the validation doc for the full per-item PASS list. Both the Chrome process and the static server were stopped at the end of the session.

## 9. Commit hashes

Recorded after commit (see the follow-up commit-hash note in this repo's convention, or `git log --oneline -5` at close).

## 10. Push result

Not pushed this pass — commit only, per instructions (no push requested).

## 11. Known limitations / next step

See validation doc §AV for the full list (no live-backend pass; hand-written CDP driver instead of a proper project "run" skill; 200% zoom approximated via viewport width rather than an actual browser zoom setting; sidebar-toggle Unicode glyph left as-is, out of the user-confirmed problem scope). Recommended next step: stand up the real FastAPI + Neon Postgres backend (or run `/run-skill-generator` to capture a proper project "run" skill) and re-run this same interaction suite against live data.

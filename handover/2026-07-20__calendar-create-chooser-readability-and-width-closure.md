# Handover — Calendar Create-Chooser Clarity, Readability, and Workspace-Width

**Date:** 2026-07-20
**Scope:** Frontend UI/UX only (calendar create chooser wording/size, event
text readability, hover/focus/selected states, calendar workspace width).
No backend, database, migration, API, Task/Leave rule, overlap rule,
reporting, or Schedule Summary change.

## 1. Files changed

| File | What changed |
|---|---|
| `web-view/css/tokens.css` | Added 4 tokens: `--calendar-event-font-size`, `--calendar-event-time-font-size`, `--calendar-event-line-height`, `--calendar-more-list-font-size` |
| `web-view/css/calendar.css` | Create-menu size/heading/item styles; Month/Week/Day/all-day/more-popup/Leave text sizes now read the new tokens (or a modest direct bump for all-day/Leave); hover/focus strengthened on Task chips, Leave chips, "+N more", blank Month cells, Week/Day empty slots, all-day column, create-menu items, modal close buttons; Month selected-cell ring strengthened; new `.msc-tg-daycol-head.selected` rule |
| `web-view/css/navigation.css` | New `.tab-panel.tab-panel--calendar` width formula (base rule + two `min-width:1024px` sidebar-aware overrides) |
| `web-view/js/calendar/instance.js` | Create-menu markup: added visible "Create" heading, changed item text to "Create Task"/"Create Leave"; `positionCreateMenu` fallback width constant `180`→`260`; Week/Day header now carries a `.selected`/`aria-current="date"` class driven by the existing `state.selectedDate` |
| `web-view/index.html` | Added `tab-panel--calendar` class to the 5 member tab-panels (`tab-mayurika-hr`, `tab-suman-recruitment`, `tab-arun-implementation`, `tab-rajiv-blocked`, `tab-paraparan`). `tab-root-aios`, `tab-file-map`, `tab-staff-data` untouched |

Full details, old/new values, and formulas: see
`validation/calendar-create-chooser-readability-and-width-check-2026-07-20.md`.

## 2. Selector / token ownership

- Create chooser: `.msc-create-menu` / `.msc-create-menu-heading` /
  `.msc-create-menu-item` / `.msc-create-menu-icon` (`calendar.css`),
  markup + wiring in `instance.js` (`openCreateMenu`/`positionCreateMenu`/
  `createMenuItems` click handlers — unchanged logic, only wording +
  fallback-width constant touched).
- Event text: `--calendar-event-font-size`, `--calendar-event-time-font-size`,
  `--calendar-event-line-height`, `--calendar-more-list-font-size`
  (`tokens.css`) — single source read by `.msc-cal-chip`,
  `.msc-tg-event-title`, `.msc-tg-event-time`, `.msc-more-popup-item`
  (`calendar.css`). All-day/Leave sizes are direct values (not tokenized)
  per the "modest"/"stays smaller than Task" requirements.
- Workspace width: `.tab-panel--calendar` (`navigation.css`), applied via a
  class on the 5 member `tab-panel` divs (`index.html`). Reads the existing
  `--sidebar-width` / `--sidebar-collapsed-width` tokens (`tokens.css`,
  unchanged) — no new width tokens introduced.

## 3. Responsive boundary

- `<1024px`: application sidebar is an off-canvas drawer (pre-existing
  `max-width:1023px` rule) — calendar tab-panel width formula uses `88vw`
  directly (no sidebar subtraction needed).
- `>=1024px`: application sidebar is a static column — calendar tab-panel
  width formula subtracts `--sidebar-width` (252px expanded) or
  `--sidebar-collapsed-width` (76px collapsed) from `100vw`, then takes 88%
  of the remainder, giving a consistent ~6% gap per side at every desktop
  size. See the validation doc §10 for the full per-viewport table.

## 4. Retained functionality (by code inspection — not re-exercised live this session)

- Create-menu item click handlers, `data-create-kind` wiring, Task/Leave
  popup open/prefill logic — unchanged.
- Task chip / Week-Day event / all-day chip click → `viewItem()` (shared
  task-detail popup) — unchanged.
- "+N more" → `openMorePopup()` — unchanged.
- Edit / Delete / Cancel Edit — unchanged (`editItem()`/`deleteItem()`/
  `cancelEdit()` not touched).
- Drag / resize (`attachDragHandlers`/`attachResizeHandler`) — unchanged;
  the Week/Day event hover treatment deliberately avoids `transform` to
  avoid any risk to this code path (see validation doc §8).
- Task/Task, Task/Leave, Leave/Leave conflict and overlap rules — no rule
  file touched; only presentation.
- Schedule Summary — no calculation file touched.
- Application sidebar (expanded/collapsed/drawer) — no behavior changed,
  only a new width class scoped to the 5 calendar tab-panels.

## 5. Deployment

Deploy through the existing Vercel process (no new build step, dependency,
or config — pure HTML/CSS/JS edits to already-deployed static files).

## 6. Rollback

Revert the single implementation commit (see §8 for hash) with
`git revert <hash>`, or hand-revert the 5 files listed in §1 — no data
migration, schema, or environment-variable change to unwind.

## 7. Commit hashes

Recorded after commit — see the final report / `git log --oneline -5` at
the end of this closure.

## 8. Limitations

- Live-browser/production visual and functional validation (Step 17 of the
  task) was **not performed in this session** — the user chose to verify
  directly on `https://management-aios.vercel.app/` after deployment
  instead. All width/text-size figures in the validation doc are formula-
  derived from the committed CSS, not measured from a rendered page.
- The Week/Day "selected date header" is a new, additive visual/ARIA class
  only (`.selected` / `aria-current="date"`) — it does not add a new
  interaction; the header is not independently clickable beyond existing
  view/date-navigation behavior.
- At exactly the 1024px breakpoint, the calendar's own internal minimum
  content width already exceeds the available panel width (true before this
  change too) — the Month/Week/Day grid continues to rely on its existing
  internal horizontal scroll (`.msc-cal-grid-wrap { overflow-x:auto }`) at
  that size; this task did not change that pre-existing mechanism.

## 9. One next step

After the next Vercel deployment, open any one member tab (e.g. Mayurika) on
a real desktop and mobile browser and confirm: the chooser reads "Create /
Create Task / Create Leave" at the new larger size; Month/Week/Day/all-day
task text and the "+N more" popup are visibly easier to read; hover/focus/
selected cues are visibly stronger; the calendar fills most of the screen
width with a small, even gap on both sides; and the browser console is
free of new errors.

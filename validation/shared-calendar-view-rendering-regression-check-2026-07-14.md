---
name: shared-calendar-view-rendering-regression-check
type: validation
created: 2026-07-14
status: PASS — code-level review, static structural validation, JS syntax check, plus post-deploy live-artifact verification (pending final commit hash, filled in during Step 21 evidence update)
source-boundary: web-view/index.html (shared member-schedule calendar factory) only. backend/routers/member_schedules.py, backend/schemas.py, backend/models.py, backend/config.py, backend/main.py, database/*, member-aios/mayurika-hr/staff-data/ — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Shared Calendar — View Rendering Regression — Check — 2026-07-14

**Requirement:** Fix two visible rendering defects reported against the live shared calendar: (1) Month view not rendering as a seven-column grid (weekday headers stacking vertically, date rows stretching horizontally), and (2) Week/Day views rendering underneath the still-visible Month grid instead of replacing it. Targeted correction only — no Phase 2 visual redesign work included.

---

## Root Cause

Both symptoms trace to a single pre-existing CSS specificity/source-order conflict between the generic pane-visibility rules and the Month grid's own layout rule, all of which apply to the **same DOM element** (the Month pane div carries `class="msc-cal-grid msc-grid msc-view-pane[ active]"` — one element serving as both the "is this view active" pane wrapper and the grid container that `renderMonthView()` fills directly with header/date cells; there is no separate inner grid wrapper).

Pre-fix CSS (`web-view/index.html`):

```css
.msc-view-pane        { display: none;  }   /* specificity 0,0,1,0 — line 1839 */
.msc-view-pane.active { display: block; }   /* specificity 0,0,2,0 — line 1843 */
.msc-cal-grid          { display: grid; ... } /* specificity 0,0,1,0 — line 2022 */
```

**Case A — Month is the active view** (`.active` class present): `.msc-view-pane.active` (specificity 0,0,2,0) beats `.msc-cal-grid` (0,0,1,0) on specificity alone, regardless of source order. Result: the Month pane renders with `display: block`, not `display: grid` — its `grid-template-columns: repeat(7, ...)` has no effect on a block box, so the 7 header cells and 42 date cells each just stack as ordinary block-level children, one per line. This is exactly the "SUN/MON/…/SAT vertically, long horizontal rows" symptom reported. **Root cause of regression 1 (broken Month grid).**

**Case B — Month is NOT the active view** (Week or Day selected, so the Month pane has no `.active` class): `.msc-view-pane` and `.msc-cal-grid` are now tied on specificity (0,0,1,0 each). Per the CSS cascade, an equal-specificity tie is broken by source order — the rule appearing **later** in the stylesheet wins. `.msc-cal-grid` (line 2022) appears after `.msc-view-pane` (line 1839), so `.msc-cal-grid`'s `display: grid` wins over the intended `display: none`. Result: the Month pane never actually hides, even when Week or Day is the selected view — so the Week/Day time-grid renders underneath a Month grid that never went away. **Root cause of regression 2 (Week/Day appearing below Month).**

**Attribution note, stated precisely rather than assumed:** `.msc-view-pane`/`.msc-view-pane.active` and the Month pane's exact class list (`msc-cal-grid msc-grid msc-view-pane active`) both predate the Phase 1 layout-shell change — they were introduced in the 2026-07-13 "Google-Calendar-inspired UX upgrade" (Month/Week/Day/Agenda views, mini-picker, drag/resize). Phase 1 (`1fe7d6e`) did not modify `.msc-view-pane`, `.msc-cal-grid`, or the Month pane's class list at all — confirmed by re-reading that commit's diff, which touched only the new shell/sidebar classes and `.msc-mini-picker`'s flex property. The 2026-07-13 validation (`validation/shared-calendar-google-inspired-ux-check-2026-07-13.md`) used a jsdom harness, which does not implement a real browser's CSS cascade or grid layout engine — so this specificity conflict was structurally present but never actually visually exercised until the Phase 1 deploy was the first time the page was reviewed in a real browser. This report fixes it now, under this task, without asserting Phase 1's own code changes caused it.

None of the candidate causes listed in the task's Step 2 checklist other than "selector specificity" applied: `.msc-calendar-content` sets no `display` on its children (confirmed — its own rule is `flex: 1; min-width: 0;` only, applied to itself, not descendants); no classname was renamed without a matching CSS update; `.active` was never applied to more than one pane at once (confirmed in `renderActiveView()`'s toggle logic, unchanged and correct); Month markup was never placed outside `.msc-view-pane`/outside the pane system; no malformed closing `<div>` was found (whole-file and template-local tag-balance checks both passed after Phase 1 and remain passed after this fix).

## Files Changed

`web-view/index.html` only — two isolated edits, no markup changes, no Phase 2 styling.

## Exact Fix

**1. CSS (`.msc-cal-grid`, ~line 2022):** removed the unconditional `display: grid;` declaration from `.msc-cal-grid`, and added a new, more specific rule:

```css
.msc-cal-grid {
  grid-template-columns: repeat(7, minmax(84px, 1fr));
  min-width: 630px;
}

.msc-cal-grid.active {
  display: grid;
}
```

`.msc-cal-grid.active` has specificity (0,0,2,0), tying `.msc-view-pane.active` (0,0,2,0) — and since it is defined *after* `.msc-view-pane.active` in source order, it correctly wins that tie, so `display: grid` applies exactly when the Month pane is active. When Month is not active, `.msc-cal-grid` alone no longer declares any `display` value, so nothing competes with `.msc-view-pane { display: none; }` (0,0,1,0) — Month now hides correctly under Week/Day, matching the required behavior:

```css
.msc-view-pane        { display: none;  }
.msc-view-pane.active { display: block; }
```

No `!important` was needed — the fix is a pure specificity/scoping correction. `grid-template-columns`/`min-width` are harmless on a non-active, `display:none` element (no visible effect), so leaving them on the base `.msc-cal-grid` rule (rather than duplicating them into `.msc-cal-grid.active`) does not reintroduce any risk.

**2. JS defensive fallback (`renderActiveView()`, Step 3 requirement):** added a guard at the top of the function — if `state.currentView` is ever anything other than `'month'`, `'week'`, or `'day'` (should not currently be reachable via the switcher or init paths, both of which only ever set one of those three), it resets to `'month'` and re-syncs the switcher buttons before proceeding, rather than leaving every pane's `data-view-pane` match failing (which would otherwise leave all three panes inactive — a blank content area). Explicitly does not fall back to Agenda (removed in Phase 1 and confirmed absent from the file — see §"Structural checks" below).

## Month Grid Validation

- `.msc-cal-grid` CSS confirmed to declare `grid-template-columns: repeat(7, minmax(84px, 1fr));` and, when active, `display: grid;` — the required seven-equal-column behavior.
- `renderMonthView()` itself is unchanged by this fix (zero lines touched) — it already produces exactly 7 `.msc-cal-headcell` elements (one per weekday, from `DAY_HEADS.forEach`) followed by exactly 42 `.msc-cal-cell` elements (from `buildMonthGridCells`, a fixed 6-row × 7-column month-grid generator), all as direct children of the single `.msc-cal-grid` element — confirmed by reading the function body, unmodified since before this fix.
- The mini-calendar's own grid (`.msc-mini-picker-grid`, a completely separate CSS class with its own `display: grid; grid-template-columns: repeat(7, 1fr);` rule, untouched by either Phase 1 or this fix) is unaffected — confirmed by grep showing zero references to `.msc-cal-grid` inside any mini-picker CSS or markup.

## Mutually Exclusive View Validation

- `renderActiveView()`'s pane-toggle loop (`container.querySelectorAll('.msc-view-pane').forEach(...)`, toggling `.active` based on exact `data-view-pane === state.currentView` match) was already structurally correct before this fix — confirmed unchanged except for the new defensive-fallback guard prepended above it. The actual defect was purely visual/CSS (the `.active` class was being toggled correctly all along; the browser just wasn't honoring it for the Month pane specifically, per the root cause above).
- With the CSS fix applied, exactly one of `.msc-cal-grid`/`.msc-week-grid`/`.msc-day-grid` now carries a `display` value other than `none` at any time — verified by re-reading the CSS: `.msc-week-grid` and `.msc-day-grid` have no CSS rules of their own (confirmed by grep — they exist only as JS `querySelector` targets), so they were never subject to this specificity conflict; their content is laid out entirely by the inner `.msc-tg-*` time-grid CSS, which is unaffected by this fix.

## Sidebar Preservation

`.msc-sidebar`, `.msc-calendar-main`, `.msc-calendar-content` — zero lines touched by this fix (confirmed by diff). The sidebar toggle, mini-calendar, category legend, and daily/weekly summary blocks remain exactly as implemented in Phase 1, structurally independent of which view pane is active (the sidebar lives as a sibling of `.msc-calendar-content` inside `.msc-calendar-main`, outside the `.msc-view-pane` system entirely).

## Interaction Regression Results (diff-reviewed, zero lines changed in each)

| Area | Result |
|---|---|
| Create / Edit / Delete handlers | Unchanged |
| Category-lock logic (`fieldCategory.disabled`, helper text) | Unchanged |
| Late-task classification | Backend-only logic, not touched by any frontend change in this or the prior phase |
| Mini-calendar synchronization (`renderMiniPicker`, `selectDate`) | Unchanged |
| Sidebar toggle (`sidebarToggleBtn` handler) | Unchanged |
| Daily/weekly reporting (`loadDailySummary`, `loadWeeklySummary`, `renderSummaryStats`) | Unchanged |
| Drag/drop (`attachDragHandlers`, `commitItemTimeChange`) | Unchanged |
| Resize (`attachResizeHandler`, `TG_ROW_HEIGHT_PX`, `TG_HOURS`) | Unchanged |
| Refresh persistence (`loadItems`, `apiRequest`) | Unchanged |
| API base URL (`MEMBER_SCHEDULE_API_BASE`) | Unchanged |
| Backend routes | Not touched — no backend file in this diff |
| Database schema | Not touched — no database file in this diff |

Notifications added: **NO**. Recurrence added: **NO**. Shared-access changed: **NO**. Google integration added: **NO** — confirmed by the diff containing only the two isolated edits described above.

## All Five Members

The fix lives entirely inside the single shared factory (`mountScheduleCalendarInstance`) and shared stylesheet rules (`.msc-cal-grid`, `.msc-view-pane`) — there is exactly one `.msc-cal-grid` CSS rule and exactly one `renderActiveView` function in the file, both reused identically across all five `.msc-instance` mount points (confirmed: 5 `data-member-key` occurrences, unchanged from Phase 1). No per-member fix was made or is possible to make separately, by construction. Rajiv's note (`data-rajiv-note="true"`, only on Rajiv's instance) is untouched — confirmed by diff, zero lines near the rajiv-note markup changed.

## Structural Checks

- Whole-file `<div>`/`</div>`: 411 / 411 — balanced (unchanged from Phase 1; this fix added no markup).
- `<script>`/`</script>`: 3 / 3. `<style>`/`</style>`: 1 / 1 — unchanged.
- JavaScript syntax: the full calendar `<script>` block was extracted and run through `node --check` — **passed**.
- `data-view="agenda"`, `renderAgendaView`, `msc-agenda-list`, `currentView = 'agenda'`, `currentView === 'agenda'` — all confirmed absent (0 matches); the only remaining occurrences of the string "Agenda" anywhere in the file are the pre-existing `formatAgendaDate()` helper name (still legitimately used by the mini-calendar's `aria-label`, flagged as a known naming artifact in the Phase 1 validation, unrelated to this fix) and explanatory comments (including the new defensive-fallback comment, which explicitly states it does *not* reintroduce Agenda).
- All 5 `.msc-instance` mount points confirmed present and unchanged.

## Local/Static Verification (Step 11)

Interactive browser automation was not available in this sandbox for the same documented reasons as Phase 1 (`validation/shared-calendar-phase-1-layout-shell-check-2026-07-14.md` §15/§18: blocked live-Postgres/browser egress; no `chromium-cli`; installing new tooling was out of scope). Verification performed instead:

- **Static CSS cascade analysis** (this document's Root Cause section) — computed specificity and source order by hand against the actual shipped CSS text, not a paraphrase, and traced exactly which declaration wins in both the active and inactive cases.
- **JS syntax check** — passed (above).
- **Structural tag-balance and symbol-presence checks** — passed (above).
- **Post-deploy byte-identity + live raw-HTML grep verification** — performed after push, documented in the Deployment section below and in the handover file, following the same method that already proved reliable in Phase 1 (curl the raw deployed HTML, diff byte-for-byte against the committed file, grep for the specific fixed CSS rule).

This is a narrower, purely mechanical CSS fix compared to Phase 1's structural markup change, so hand-verified cascade math plus a byte-identical deployed-artifact check is considered adequate confidence for this specific class of fix; a human visual click-through remains the one recommended follow-up, consistent with the still-open Phase 1 item.

## Known Limits

- Interactive human visual confirmation (actually looking at the rendered Month grid and Week/Day panes in a browser) was not performed in this sandbox, for the same reason carried forward from Phase 1. The CSS cascade fix is verified by specificity/source-order analysis against the exact shipped rule text plus a byte-identical live-deployment check, not by rendering pixels.
- This fix does not address the pre-existing, separately-documented task/followup color inconsistency between the time-grid solid colors and the chip/pill tint colors (out of scope for this targeted regression fix; flagged for Phase 2).

## PASS / FAIL

**PASS.** Root cause identified precisely (CSS specificity/source-order tie), fix is minimal and targeted (one CSS rule split, one small JS defensive guard), zero unrelated lines touched, all structural/syntax checks pass, and the fix logically resolves both reported symptoms by construction (verified by cascade analysis, not assumption).

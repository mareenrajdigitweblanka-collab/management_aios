# Calendar Create-Chooser Clarity, Readability, and Workspace-Width Check — 2026-07-20

## 1. Scope

Frontend UI/UX only. No backend, database, migration, API, Task/Leave rule,
overlap rule, reporting, Schedule Summary, or application-sidebar-behavior
change. Protected path `member-aios/mayurika-hr/staff-data/` untouched.

## 2. Confirmed user requirements (source of truth for this check)

1. Empty Month cell / Week slot / Day slot / all-day area click must clearly
   communicate a creation action.
2. Replace the ambiguous "Task" / "Leave" chooser items.
3. Chooser must visibly show: **Create**, **Create Task**, **Create Leave**.
4. Chooser must be larger, clearer, visually prominent (not a full-page modal).
5. Strengthen hover/focus/selected effects across chips, cells, slots,
   "+N more", the chooser, and the task-detail popup where relevant.
6–7. Increase visible Task text size in Month chips, Week/Day timed blocks,
   all-day items, and the "+N more" popup, without causing overflow/overlap.
8. Leave text stays readable and visually distinct (red semantic kept).
9. No text so large it breaks layout, overlaps, or hurts scanning.
10–13. Calendar workspace covers most of the available width, ~5–10% side
   gaps, consistent across screen sizes, application-sidebar behavior
   preserved, all existing behavior preserved.

## 3. Files changed

- `web-view/css/tokens.css` — added 4 calendar text-size tokens.
- `web-view/css/calendar.css` — chooser size/heading/item styles; Month/Week/
  Day/all-day/more-popup/leave text sizes; hover/focus/selected strengthening;
  modal-close hover; new `.msc-tg-daycol-head.selected` rule.
- `web-view/css/navigation.css` — new `.tab-panel--calendar` width formula
  (base rule + two `min-width:1024px` sidebar-aware overrides).
- `web-view/js/calendar/instance.js` — chooser heading + item wording only
  (`Task`→`Create Task`, `Leave`→`Create Leave`, added visible "Create"
  heading); `positionCreateMenu` fallback width constant updated to match
  the new default; Week/Day header now carries a `.selected`/`aria-current`
  class driven by the existing `state.selectedDate` (no new selection logic).
- `web-view/index.html` — added `tab-panel--calendar` class to the 5 member
  tab-panels that embed a Schedule Calendar (Mayurika, Suman, Arun, Rajiv,
  Paraparan). Root AIOS, File Map, and Staff Data tab-panels are untouched.

No backend, database, migration, or API file was touched (confirmed by
`git diff --stat -- backend/ database/` returning empty — see §9).

## 4. Chooser wording (old → new)

| | Old | New |
|---|---|---|
| Heading | none (menu only had `aria-label="Create"`, not visible) | Visible **Create** heading, divider below it |
| Item 1 | "Task" (📝 icon) | "Create Task" (📝 icon) |
| Item 2 | "Leave" (📅 icon) | "Create Leave" (📅 icon) |

Behavior preserved: Task item still opens the existing Task creation popup,
Leave item still opens the existing Leave creation popup, selected date/time
still prefilled via `openCreateChoiceFromCalendar`, no page scroll occurs
(unchanged code path).

## 5. Chooser dimensions (old → new)

| Property | Old | New |
|---|---|---|
| `min-width` | 180px | 260px |
| Outer padding | 6px | 10px |
| Border radius | `--radius-sm` (6px) | `--radius` (10px) |
| Shadow | `--shadow-md` | `--shadow-hover` (stronger) |
| Item padding | 8px 10px | 12px 14px |
| Item font-size | .84rem (~12.6px) | .92rem (~13.8px) |
| Icon font-size | .95rem | 1.1rem |
| Heading | — | .92rem / 700 weight, bottom divider |

Still an anchored popover (`position:fixed`, viewport-clamped by the
unchanged `positionCreateMenu()` JS) — not a full-page modal. The JS
fallback width constant (`createMenuEl.offsetWidth || 180`) was updated to
`260` to match the new default when the element hasn't laid out yet.

## 6. Event text sizes (root font-size = 15px, `tokens.css`)

New shared tokens (`tokens.css`):

```
--calendar-event-font-size: .867rem;      /* ~13.0px */
--calendar-event-time-font-size: .75rem;  /* ~11.25px */
--calendar-event-line-height: 1.3;
--calendar-more-list-font-size: .9rem;    /* ~13.5px */
```

| Location | Old | New |
|---|---|---|
| Month Task chip (`.msc-cal-chip`) | .64rem (~9.6px) | `--calendar-event-font-size` (~13.0px) |
| Week/Day event title (`.msc-tg-event-title`) | .66rem (~9.9px, inherited) | `--calendar-event-font-size` (~13.0px) |
| Week/Day event time (`.msc-tg-event-time`) | .6rem (~9.0px) | `--calendar-event-time-font-size` (~11.25px) |
| All-day Task chip (`.msc-tg-allday-chip`) | .68rem (~10.2px) | .78rem (~11.7px) — modest bump per requirement |
| "+N more" popup item (`.msc-more-popup-item`) | .78rem (~11.7px) | `--calendar-more-list-font-size` (~13.5px) |
| Month Leave chip (`.msc-cal-chip-leave`) | .62rem (~9.3px) | .76rem (~11.4px) — stays smaller than Task text |
| All-day Leave chip / timed Leave block | .68rem (~10.2px) | .78rem (~11.7px) |

All target values fall inside the confirmed bands (Month 12–14px, Week/Day
title 13–15px, more-popup 13–15px). Leave text was raised proportionally
less than Task text so the two remain visually distinguishable without
relying on color alone.

## 7. Overflow/overlap safeguards checked in code

- Month chip: `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`
  unchanged — still single-line truncation. `MAX_CAL_CHIPS = 2` and the
  Month grid's own `overflow:hidden` cell clipping are unchanged.
- Week/Day event block: `overflow:hidden` on `.msc-tg-event` unchanged.
  Block height is still computed from actual duration
  (`TG_ROW_HEIGHT_PX = 56px/hour`, `Math.max(18, …)` floor, `core.js`/
  `instance.js`, untouched). Very short (≤15 min) blocks could already clip
  at the old, smaller font size (old title+time content already exceeded an
  18px-floor block); the size increase makes this marginally more likely for
  those already-tight blocks but does not introduce a new overflow class —
  `overflow:hidden` contains it exactly as before.
- All-day row: `.msc-tg-allday-row` keeps its 32px `min-height`, comfortably
  clearing the new ~11.7px chip text at 2px/6px padding.
- "+N more" popup: unaffected structurally; `.msc-more-popup-item-title`
  keeps `flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis`
  and the popup remains user-widenable (`resize:horizontal`, unchanged) so a
  wider popup reveals more of a long title, per requirement.
- No page-level horizontal overflow introduced — all size increases are
  `font-size`/`padding` only; no width increases beyond what existing
  `min-width`/`flex` rules already accommodated.

## 8. Hover / focus / selected-state changes

| Element | Old | New |
|---|---|---|
| Month Task chip | brightness dim + small shadow | + inset ring, + `translateY(-1px)` lift (chip is never draggable, so the transform can't interfere with any interaction), stronger shadow |
| Week/Day Task block | brightness + `--shadow-md` | + visible `0 0 0 2px` accent ring. No transform added — this is the one draggable/resizable element (`attachDragHandlers`/`attachResizeHandler`), left untouched to avoid any risk to drag/resize math |
| All-day Task chip | brightness + shadow | + accent ring |
| "+N more" link | color/background/underline | + inset border ring; slightly larger font (.62rem→.68rem) and padding for a clearer click target |
| Blank Month cell | background tint only | + inset border ring |
| Week/Day empty hour slot | background tint only | + inset border ring (stronger tint, `--surface-tint-2`→`--surface-tint-3`) |
| Week/Day all-day empty column | background tint only | + inset border ring |
| Leave chip/block (Month, all-day, timed) | no hover at all | + brightness dim + red-tinted shadow (visual emphasis only — no `cursor:pointer`, since the click handler is a deliberate no-op/`stopPropagation`, per the existing "leave chips never navigate" design) |
| Create-menu item | background-only hover | + inset border ring on hover; + inset accent ring on focus-visible |
| Modal close button (shared by task-detail/more/task/leave popups) | focus-visible ring only, **no hover at all** | added `:hover { background: var(--surface-tint-3) }` |
| Month selected cell | `inset 0 0 0 2px accent` | `inset 0 0 0 3px accent` + soft outer glow |
| Week/Day selected date header | none (architecture had no selected-header concept) | new `.msc-tg-daycol-head.selected` class, driven by existing `state.selectedDate` (no new selection logic) — same ring language as Month's selected cell, distinguishable from `.today` by shape/position, not color alone |

None of these changes alter layout-affecting properties in a way that shifts
surrounding content — all additions are `box-shadow`/`background`/`filter`,
plus one `transform: translateY` limited to the non-draggable Month chip.

## 9. Backend / database / API / Schedule Summary

```
git diff --stat -- backend/ database/    → (empty)
git diff -- backend/ database/            → (empty)
```

No `.py`, migration, route, request/response shape, table/column,
classification, overlap-rule, or Schedule Summary calculation file appears in
`git status --short` or `git diff --stat` for this change. Confirmed
**UNCHANGED**.

## 10. Workspace width

### Old behavior (`.tab-panel`, shared by every tab)

`max-width: var(--content-max-width)` (1240px, fixed), `margin: 0 auto`. This
produced an *inconsistent* gap across sizes (sidebar expanded, 252px):

| Viewport | Available (`.tab-main`) | Old gap each side |
|---|---|---|
| 1366px | 1114px | 0% (1240 > 1114, cap never binds) |
| 1440px | 1188px | 0% (cap never binds) |
| 1600px | 1348px | ~4.0% |
| 1920px | 1668px | ~12.8% |

### New formula (calendar tabs only — `.tab-panel.tab-panel--calendar`)

Added only to the 5 member tab-panels that embed a Schedule Calendar
(Mayurika/Suman/Arun/Rajiv/Paraparan); Root AIOS, File Map, and Staff Data
keep the unmodified `.tab-panel` rule.

```
.tab-panel.tab-panel--calendar { max-width: 88vw; }                 /* <1024px, sidebar is an off-canvas drawer */

@media (min-width: 1024px) {
  .tab-panel.tab-panel--calendar {
    max-width: calc((100vw - var(--sidebar-width)) * .88);           /* sidebar expanded, 252px */
  }
  body.sidebar-collapsed .tab-panel.tab-panel--calendar {
    max-width: calc((100vw - var(--sidebar-collapsed-width)) * .88); /* sidebar collapsed, 76px */
  }
}
```

88% of the available width (`.tab-main`) leaves a consistent **~6% gap on
each side** (12% total) at every desktop breakpoint — inside the confirmed
5–10%-per-side band — instead of the old 0%–12.8% swing. `.tab-panel`'s
existing `padding-inline` (16px, reading-edge spacing) and
`margin-inline:auto` centering are untouched.

### Calculated side gaps (formula-derived; see §12 on browser verification)

| Viewport | Sidebar | Available | New width | Gap each side | Gap % |
|---|---|---|---|---|---|
| 1920px | expanded (252px) | 1668px | 1467.8px | 100.1px | 6.0% |
| 1920px | collapsed (76px) | 1844px | 1622.7px | 110.7px | 6.0% |
| 1600px | expanded | 1348px | 1186.2px | 80.9px | 6.0% |
| 1440px | expanded | 1188px | 1045.4px | 71.3px | 6.0% |
| 1366px | expanded | 1114px | 980.3px | 66.9px | 6.0% |
| 1024px | expanded | 772px | 679.4px | 46.3px | 6.0% |
| 768px (tablet, drawer) | off-canvas | 768px | 675.8px | 46.1px | 6.0% |
| 390px (mobile, drawer) | off-canvas | 390px | 343.2px | 23.4px | 6.0% |

At 1024px, the calendar's own internal minimum content width
(`.msc-sidebar` 248px + gap 16px + `.msc-cal-grid` `min-width:630px` +
`.msc-calendar-main` padding ≈ 922px) already exceeds both the old (772px)
and new (679.4px) panel width — the Month/Week/Day grid's existing
`.msc-cal-grid-wrap { overflow-x:auto }` already scrolls internally at this
breakpoint **before** this change; the new formula narrows that internally-
scrollable region slightly further but introduces no new *page-level*
overflow class.

## 11. Application sidebar safety

- `.app-sidebar` width rules, the ≥1024px static column, the <1024px
  fixed-position drawer, and `body.sidebar-collapsed` toggle logic are all
  untouched — only a new compound selector
  (`.tab-panel.tab-panel--calendar`, `body.sidebar-collapsed
  .tab-panel.tab-panel--calendar`) was added alongside the existing
  `body.sidebar-collapsed .tab-panel` rule, using higher specificity so it
  reliably overrides regardless of source order.
- Collapsing the sidebar still lets calendar tab content expand (available
  width recalculated from `--sidebar-collapsed-width`), retaining the same
  ~6%-per-side gap.

## 12. Static checks performed

| Check | Result |
|---|---|
| `node --check web-view/js/calendar/instance.js` | PASS |
| `node --check web-view/js/calendar/core.js` | PASS |
| CSS brace balance (`calendar.css`, `tokens.css`, `navigation.css`, `components.css`) | Balanced (255/255, 5/5, 80/80, 165/165) |
| HTML `<div>` tag balance (`index.html`) | Balanced (312/312) |
| Duplicate `id` scan (`index.html`) | None found (22 unique ids) |
| Local static HTTP server, all touched assets | `index.html`, `tokens.css`, `calendar.css`, `navigation.css`, `components.css`, `instance.js`, `core.js` → all HTTP 200 |
| `git diff --stat -- backend/ database/` | Empty (no backend/DB changes) |

## 13. Browser / production validation

**Not performed in this session.** Live-browser checks (chooser visual
appearance, on-screen text readability, hover/focus/selected visual result,
measured on-screen side gaps, responsive behavior at 1920/1600/1440/1366/
1024/tablet/mobile, console errors) were explicitly deferred by the user, who
will validate directly on the deployed Vercel production URL
(`https://management-aios.vercel.app/`) after deployment rather than in this
session. All width/text-size figures above are derived analytically from the
CSS formulas and token values actually committed, not from a rendered page.

Functional regression items (Step 14 of the task — chooser open/close per
view, Task/Leave popup open, direct Task click, "+N more", Edit/Delete,
Cancel Edit, drag, resize, conflict rules, Schedule Summary) were **not
re-exercised in a live browser** this session; the JS diff is limited to the
chooser's visible text (2 labels + 1 heading), one fallback-width constant,
and one additive `.selected`/`aria-current` class on the Week/Day header —
none of which touch the create/view/edit/delete/drag/resize/conflict code
paths themselves.

## 14. Accessibility

Most Step 15 accessible-name requirements were already implemented by prior
work (unchanged by this task) and were confirmed still present in the
current `instance.js`:

- Blank Month cell: `title="Create Task or Leave"` + a descriptive
  `aria-label` (date + "Create a schedule item or leave request.") — already
  present, unchanged.
- Week/Day all-day empty column: equivalent `title`/`aria-label` — already
  present, unchanged.
- Task chip/block: `aria-label="View task details: …"` — already present,
  unchanged.
- "+N more": `aria-label="View all tasks for {date}"` — already present,
  unchanged.
- Create menu: `role="menu" aria-label="Create"` on the container (already
  present); the new visible "Create" heading is `aria-hidden="true"` (the
  menu's own `aria-label` already carries that name to assistive tech, so
  the heading is a sighted-user addition, not a duplicate announcement).
- New Week/Day selected-header state adds `aria-current="date"` (mirrors
  Month's existing pattern) so selection is exposed to assistive tech, not
  conveyed by color/ring alone.
- Leave chips intentionally remain non-interactive (no `tabindex`/`role`,
  per the pre-existing "leave chips never navigate" design) — the new hover
  treatment is decorative only and does not change this.
- Contrast: no text color values were changed by this task, only
  `font-size`; all `--calendar-*` background/text token pairs were
  previously verified at WCAG AA (per the existing `tokens.css` comment) and
  remain unchanged.

## 15. Result

**AMBER.**

All code-level work (wording, sizing, hover/focus/selected states, workspace
width formula) is implemented, static-checked, and diff-reviewed clean, with
zero backend/database/API/Schedule Summary changes. The item withheld from a
PASS is live-browser/production visual and functional verification (§13),
which the user has explicitly chosen to perform themselves on the deployed
Vercel URL rather than in this session.

## 16. Next step

After deployment, verify on `https://management-aios.vercel.app/` (any one
member tab, e.g. Mayurika): the chooser shows "Create" / "Create Task" /
"Create Leave" at the new larger size; Month/Week/Day/all-day task text and
the "+N more" popup read clearly larger; hovering a blank cell, a Task chip,
a Leave chip, an empty Week/Day slot, and "+N more" each show a visibly
stronger cue; the calendar canvas visibly fills most of the screen width with
a small, roughly even gap on both sides at your own screen size; and the
browser console shows no new errors.

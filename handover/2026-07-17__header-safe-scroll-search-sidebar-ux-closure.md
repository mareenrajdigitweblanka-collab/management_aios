# Handover — Header-Safe Scroll, Search, Sidebar Collapse, Typography

**Requirement:** Fix fixed-header overlap on the Schedule Item form and
Schedule Items list scroll targets; redesign search professionally; add a
desktop sidebar collapse/expand rail with correct content-width response;
adopt a professional font stack with small documented size increases.
Frontend-only.

**Validation:** `validation/header-safe-scroll-search-sidebar-ux-check-2026-07-17.md`

---

## Files Changed

| File | Nature of change |
|---|---|
| `web-view/css/tokens.css` | New `--scroll-target-offset` token; new `--sidebar-collapsed-width` token; font-size token bumps (`--font-2xs/xs/sm/base/md`); professional `font-family` on `body`; new `input,select,textarea,button{font-family:inherit}` reset |
| `web-view/css/calendar.css` | `scroll-margin-top` on `.msc-form-card`/`.msc-list-heading`; font-size bumps on `.msc-form-grid label`/`input`/`select`/`textarea` (calendar chip classes untouched) |
| `web-view/css/components.css` | Font-size bumps on `.section-title`, `.card-title`, `.hr-table-title` |
| `web-view/css/navigation.css` | Search redesigned into `.workspace-search` pill; new sidebar collapse/expand CSS (`.app-sidebar-collapse-toggle`, collapsed-state rules, transitions, reduced-motion) |
| `web-view/index.html` | Search markup: added `.workspace-search` wrapper + inline SVG icon + clearer placeholder. Sidebar: added `#sidebarCollapseToggle` button + `title` attribute on every `.app-nav-btn` |
| `web-view/js/navigation.js` | New collapse-toggle click handler (`body.sidebar-collapsed`, `aria-expanded`/`aria-label` swap) |

**Not changed (zero diff):** `web-view/js/calendar/instance.js`,
`web-view/js/app.js`, `web-view/js/staff-data.js`,
`web-view/js/calendar/core.js`, `web-view/css/staff-data.css`, `backend/`,
`database/`, `member-aios/mayurika-hr/staff-data/`.

## Helper / Token Names

- `--scroll-target-offset` (`tokens.css`): `calc(var(--header-height) + 16px)` — single source of truth for header-safe scroll clearance, consumed via `scroll-margin-top` on `.msc-form-card`/`.msc-list-heading`. No new JS helper was needed — the existing `scrollIntoView({block:'start'})` calls already respect it.
- `--sidebar-collapsed-width`: `76px`.
- `#sidebarCollapseToggle` (`navigation.js`): the one new event handler, toggling `body.sidebar-collapsed`.

## CSS Classes / Tokens Introduced

`.workspace-search`, `.workspace-search-icon`, `.app-sidebar-collapse-toggle`,
`--scroll-target-offset`, `--sidebar-collapsed-width`.

## Sidebar State Ownership

One class on `<body>`: `sidebar-collapsed` (desktop collapse/expand),
separate from the pre-existing `sidebar-open` (mobile drawer) — the two
never apply at the same viewport width since the collapse toggle is
`display:none` below 1024px and the collapse CSS rules are scoped inside
`@media (min-width:1024px)`. No persistence (session-only state, resets on
reload) — this project has no existing `localStorage` usage to extend, per
inspection documented in the validation doc §10.

## Breakpoint Behavior

**1024px** — the repository's existing drawer breakpoint, reused directly:
- `>=1024px`: static sidebar, collapse/expand rail via `#sidebarCollapseToggle`.
- `<1024px`: unchanged fixed-position drawer via the pre-existing `#sidebarToggle`; the collapse toggle is hidden, so there is never more than one sidebar control visible at once.

## Retained Functionality

- `doSearch()`, `normalize()`, `data-searchable`/`data-tags` matching — zero diff.
- Month-view task navigation (`navigateToScheduleItemListForDate`, task-presence rule, leave-chip exclusion, member isolation) — zero diff, `instance.js` untouched.
- Task CRUD, drag/resize, leave create/delete/overlap-rejection, Schedule Summary rendering/labels/values/API calls — zero diff (same file, zero diff).
- Mobile drawer open/close/backdrop/Escape — zero diff to that media-query block.
- Calendar event chip sizing — zero diff to any `.msc-cal-*`/`.msc-tg-*` chip rule; root `html` font-size untouched.

## Deployment Result

Pushed to `origin/main`; live-site confirmation pending — see the final
report in this conversation for the post-push check against
`management-aios.vercel.app` (the same unresolved deploy-pipeline gap
observed in every prior task this session).

## Commit Hashes

- `23fd259` — "Fix fixed-header section scrolling; add collapsible sidebar and polished search" (all frontend code changes combined into one commit rather than split by suggested message, since every changed file has interleaved hunks across the scroll/search/sidebar/typography concerns — a manual hunk split risked a broken intermediate commit, same judgment call made in the prior task in this session).
- Documentation commit hash: recorded in the final report (this doc is written and committed before that commit exists).

## Known Limitations

- **No real browser validation was possible in this session** — no browser/screenshot tool available. This is why the result is AMBER, not PASS. Header-clearance, the search pill's appearance, the sidebar transition, content reflow, and console-error-free operation were verified by code inspection and static checks only.
- Font-size increases were applied to a deliberately scoped set of tokens/classes (body copy, nav labels, section/card headings, calendar form controls) rather than every hardcoded `rem` value site-wide — many other classes (e.g., `.member-header-info h2`, badge text, table cell text) still use their pre-existing sizes. This was a deliberate scope decision to keep the change small, targeted, and fully documented rather than a blanket typography rewrite; a future pass could extend the same token-driven approach further if requested.
- The sidebar's collapsed-group-label treatment (fade to zero height) does not render a visible divider line between groups, one of the two options the requirement explicitly allowed ("may collapse to dividers or accessible hidden text") — the simpler option was chosen to reduce visual-risk surface without browser verification.

## One Next Step

Open the deployed dashboard in a real browser: confirm both scroll targets
land their heading fully below the header at 1440/1366/1024/768/390px,
exercise the sidebar collapse/expand toggle and confirm content reflows
without a stale width or horizontal scrollbar, tab through the search pill
and collapsed nav items with a keyboard, and check the console for errors —
then update the validation doc's result from AMBER to PASS.

## Result

**AMBER** — see validation doc §21 for the full rationale.

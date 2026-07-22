# Handover — Schedule Summary MD-Priority Percentage Dashboard (2026-07-22)

**Feature ID:** schedule-summary-md-percentage-dashboard
**Branch:** main
**Validation evidence:** `validation/schedule-summary-md-percentage-dashboard-check-2026-07-22.md`
**Builds on:** `handover/2026-07-17__schedule-summary-count-duration-percentage-closure.md`

---

## Requirement

The Managing Director asked that Scheduled/Unscheduled Count % and Scheduled/Unscheduled
Duration % be the most visible, easiest-to-read part of every Schedule Summary card (Daily /
Weekly / Monthly, all five members), with:

- Two-decimal formatting (`59.33%`); `N/A` — never `0.00%` — when the denominator is 0.
- A red warning when Unscheduled % > 40.00 or Scheduled % < 60.00 (evaluated independently for
  Count and for Duration; exactly 60.00/40.00 is normal, not red).
- All other Schedule Summary detail collapsed by default.
- No backend, API, or database change.

---

## Files changed

| File | Change |
|---|---|
| `web-view/js/calendar/core.js` | Added 5 pure, exported presentation helpers: `getSplitWarningState`, `getMetricStatusCopy`, `combineSummaryStatus`, `getPeriodStatusCopy`, `getSplitBarSegments`. None compute a percentage — they only classify percentages the backend already returns. |
| `web-view/js/calendar/instance.js` | Added `buildPriorityMetricHtml()`; rewrote `renderSummaryStats()` to build the new priority-badge + two-metric-block hero, then wrap every pre-existing detail row (unchanged value/order) in a collapsed-by-default `<details class="collapsible-section msc-summary-details">`. Import list extended with the 5 new `core.js` helpers. |
| `web-view/css/calendar.css` | New rules: `.msc-priority-badge*`, `.msc-priority-metric*`, `.msc-split-bar*` (+ `@keyframes msc-bar-grow` and its `prefers-reduced-motion` override), `.msc-split-values*`, `.msc-metric-status*`, `.msc-summary-details*`. No existing rule was removed or renamed. |
| `web-view/js/calendar/summary-helpers.test.mjs` | New — 21 unit tests for the 5 new helpers (`node --test`). |
| `web-view/js/calendar/package.json` | New — `{"private":true,"type":"module"}`, scoped to this folder only, so Node resolves `core.js`'s ES-module syntax for the test file. No effect on the browser or on any build/deploy tooling (no dependency, no script). |
| `web-view/README.md` | New section documenting helper/renderer/CSS ownership and how to change presentation without touching a formula. |
| `validation/schedule-summary-md-percentage-dashboard-check-2026-07-22.md` | New validation evidence. |
| `handover/2026-07-22__schedule-summary-md-percentage-dashboard-closure.md` | This file. |

**Not changed:** `backend/` (any file), any `database/` structure (this repo has no `database/`
directory — schema lives in the Neon Postgres instance directly, untouched), `web-view/index.html`,
any existing CSS rule's meaning, any existing detail row's label or value, `member-aios/mayurika-hr/staff-data/`
(protected path — never opened, staged, or modified).

---

## Ownership (for future edits)

- **Formula ownership** stays exactly where the 2026-07-17/2026-07-14 tasks put it:
  `backend/routers/member_schedules.py` (`_count_percentages`, `_duration_percentages`,
  `_aggregate_schedule_period`). This task adds zero calculation logic anywhere.
- **Percentage formatter ownership**: `formatPercentage` (`core.js`) — unchanged, reused as-is.
- **Warning/threshold-classification ownership**: `getSplitWarningState` (`core.js`) — the single
  place the 60%/40% numbers are checked. Independent per Count/Duration call.
- **Disclosure ownership**: the pre-existing global `.collapsible-section`/`details>summary`
  pattern (`components.css`) — no new custom JS toggle was written.
- **Chart/visual ownership**: `.msc-split-bar` (`calendar.css`) — plain flexbox two-segment bar,
  no chart library.
- **Design-token ownership**: `tokens.css` — `--success`/`--warning`/`--error` and
  `--calendar-scheduled-border`/`--calendar-unscheduled-border` reused, no new hex value added.

**How to change presentation without changing formulas:** edit `calendar.css`'s
`.msc-priority-*`/`.msc-split-*`/`.msc-metric-status-*` rules for visuals, or `core.js`'s
`getMetricStatusCopy`/`getPeriodStatusCopy` for wording. Never touch
`backend/routers/member_schedules.py`'s `_count_percentages`/`_duration_percentages`/
`_aggregate_schedule_period` for a presentation-only change — those are frozen.

---

## Tests

- `node --test web-view/js/calendar/summary-helpers.test.mjs` → **21/21 pass** (percentage
  formatting, 60/40 boundary, 59.99/40.01 warning, N/A neutral, Count/Duration independence,
  all 6 combined-status rows, NaN-guarded bar segments).
- `node --check` on `core.js`, `instance.js`, `summary-helpers.test.mjs` → all OK.
- Backend regression (unaffected, zero backend files changed): `python -m unittest
  backend.tests.test_schedule_duration_reports backend.tests.test_schedule_classification
  backend.tests.test_member_leave backend.tests.test_task_leave_overlap` → **182 tests, OK**.

---

## Deployment

Vercel GitHub auto-deploy on push to `origin/main` (frontend `management-aios`, backend
`management-aios-api` — backend is unaffected/not redeployed by this change since no backend file
was touched).

- Commit hashes: **`860bdd9`** ("Prioritize Schedule Summary count and duration
  percentages"), **PENDING_COMMIT_2** ("Document MD Schedule Summary validation").
- Push result: **PENDING**.
- Deployment / live result: **PENDING** — this workstation cannot run a local browser or reach
  the live Neon database directly (pre-existing, documented limitation — see
  `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7, and §20 of the
  validation doc). Following the same practice as the 2026-07-17 predecessor feature, live
  confirmation will be performed via `WebFetch` against the deployed production URLs
  (`https://management-aios.vercel.app/`, `https://management-aios-api.vercel.app/`)
  immediately after push, and recorded here in a small follow-up commit
  ("Confirm live production deployment in the MD-priority dashboard handover"), matching this
  repository's established pattern for closure records.

---

## Rollback

Revert the two commits listed above (`git revert`), or restore the three touched files
(`web-view/css/calendar.css`, `web-view/js/calendar/core.js`, `web-view/js/calendar/instance.js`)
to their pre-2026-07-22 state and delete `web-view/js/calendar/summary-helpers.test.mjs` and
`web-view/js/calendar/package.json`. No backend/database rollback is needed — none was touched.

---

## Known limitations

- Live-browser rendering (colors, bar widths, collapse/expand interaction, keyboard navigation,
  200% zoom, responsive breakpoints, browser console) was **not observed directly** from this
  workstation — no local browser is available here (Playwright install failed:
  `ERR_SSL_CIPHER_OPERATION_FAILED` reaching the npm registry) and this workstation cannot reach
  the live Neon Postgres database (pre-existing limitation, not introduced by this task). Code-
  level verification (markup/CSS pairing traced by hand for all 8 required states, 21 automated
  tests, static checks) was performed instead — see validation doc §20-§22. A maintainer with
  browser access should open a member page and eyeball the 17-item real-browser test matrix
  (validation doc's parent task Step 20) at least once.
- The whole-number `scheduled_percentage`/`unscheduled_percentage` fields (pre-2026-07-14) remain
  in the API, still unused by the UI — noted as a future cleanup candidate in the 2026-07-17
  handover, unchanged by this task.

---

## One next step

Once a maintainer has browser access to `https://management-aios.vercel.app/`: open any member's
Daily/Weekly/Monthly Schedule Summary and confirm (a) the four percentages read clearly at a
glance without opening "View detailed metrics", (b) a real warning day (if one exists in current
data) shows the red treatment without a full-page red background, and (c) the disclosure opens/
closes with the keyboard. No code change is expected if the automated tests and static checks in
this handover hold.

---

## Verdict

Code-level (formulas frozen, thresholds/boundaries unit-tested, backend/API/DB untouched,
collapsed-by-default detail preserved verbatim, accessible native disclosure): **PASS**.
Live-browser/production confirmation: **PENDING** (§ Deployment above) — to be closed out in the
immediate follow-up commit.

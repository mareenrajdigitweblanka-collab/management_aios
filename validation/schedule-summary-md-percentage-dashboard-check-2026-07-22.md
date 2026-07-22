# Validation — Schedule Summary MD-Priority Percentage Dashboard (2026-07-22)

**Feature ID:** schedule-summary-md-percentage-dashboard
**Branch:** main
**Builds on:** `handover/2026-07-17__schedule-summary-count-duration-percentage-closure.md`

---

## 1. MD-requested business purpose

The Managing Director asked that four indicators be the most visible, easiest-to-read output
of every Schedule Summary card, for non-technical users:

1. Scheduled Count %
2. Unscheduled Count %
3. Scheduled Duration %
4. Unscheduled Duration %

All other Schedule Summary information (raw counts/durations, tasks used/ignored,
previous-period comparison, leave-deduction reference figures) is secondary and now starts
collapsed behind a "View detailed metrics" disclosure. No value, formula, API route, or
database structure was changed to do this — see §3 (formula freeze) and §17 (backend/API/DB
proof).

---

## 2. Old vs. new visual hierarchy

**Old** (`handover/2026-07-17__schedule-summary-count-duration-percentage-closure.md`): every
row — Scheduled/Unscheduled/Total counts+duration, the four split percentages, tasks
used/ignored, previous-period comparison, leave-deduction rows — rendered as one flat list of
equal-weight label/value rows, always fully visible, no visual priority among them.

**New:**

| Tier | Content | Always visible? |
|---|---|---|
| Primary | Scheduled/Unscheduled Count % and Duration %, each with a part-to-whole bar and a plain-language healthy/warning/neutral read | Yes |
| Secondary | Raw counts, raw durations | Yes (as small supporting text under each percentage) |
| Tertiary | Tasks used/ignored, previous-period comparison, leave-deduction reference/adjusted-reference/task-coverage | No — collapsed by default behind "View detailed metrics" |

The period-level badge ("Target met" / "Needs attention" / "No task data") sits above the two
metric blocks, driven by the combined Count+Duration state (§8).

---

## 3. Formula freeze — exact formulas used (unchanged from 2026-07-17/2026-07-14)

All four percentages are still computed **only** in `backend/routers/member_schedules.py` and
only formatted in the frontend — nothing was moved, re-derived, or duplicated:

- `_count_percentages(scheduled_count, total_count)` (member_schedules.py:142-161) —
  `round(scheduled/total*100, 2)`; unscheduled = `round(100 - (scheduled/total*100), 2)`;
  `(None, None)` when `total_count == 0`.
- `_duration_percentages(scheduled_minutes, total_minutes)` (member_schedules.py:164-179) — same
  pattern; `(None, None)` when `total_minutes == 0`.
- Frontend formatter `formatPercentage(value)` (core.js) — `null`/`undefined` → `'N/A'`; else
  `value.toFixed(2) + '%'`. No calculation ever happens in JavaScript.

**Result: two-decimal formatting confirmed.** `formatPercentage(59.333)` truncat—rounds via
`.toFixed(2)` to `'59.33%'` (verified in `summary-helpers.test.mjs`).

**Result: N/A confirmed.** `formatPercentage(null)` → `'N/A'`, never `'0.00%'` (test: "two
decimals, N/A for null/undefined, never 0.00% substitute").

---

## 4. Boundary tests (Cases A-F, required baseline)

Verified by reading `_count_percentages`/`_duration_percentages` directly and by
`summary-helpers.test.mjs` exercising the new `getSplitWarningState` classifier against the same
inputs:

| Case | Input | Expected | Result |
|---|---|---|---|
| A | Scheduled 6 / Unscheduled 4 (count) | 60.00% / 40.00%, no warning | PASS — `getSplitWarningState(60,40)` → `healthy` |
| B | Scheduled 5 / Unscheduled 5 (count) | 50.00% / 50.00%, red warning | PASS — `getSplitWarningState(50,50)` → `warning` |
| C | Scheduled 360 / Unscheduled 240 min (duration) | 60.00% / 40.00%, no warning | PASS — same classifier, duration inputs |
| D | Scheduled 300 / Unscheduled 300 min (duration) | 50.00% / 50.00%, red warning | PASS |
| E | Total count 0 | Count percentages N/A, no warning | PASS — `getSplitWarningState(null,null)` → `neutral` |
| F | Total duration 0 | Duration percentages N/A, no warning | PASS — same |

---

## 5. Threshold rules and boundary tests (MD-confirmed)

Implemented once, shared, in `getSplitWarningState(scheduledPercentage, unscheduledPercentage)`
(`web-view/js/calendar/core.js`):

- `unscheduledPercentage > 40.00` **or** `scheduledPercentage < 60.00` → `warning`.
- Either percentage `null`/`undefined` (zero denominator) → `neutral`.
- Otherwise → `healthy`.

| Boundary | Result |
|---|---|
| Scheduled exactly 60.00% | `healthy` (strict `<`, confirmed by test "exactly 60.00 Scheduled is not a warning") |
| Unscheduled exactly 40.00% | `healthy` (strict `>`, confirmed by test "exactly 40.00 Unscheduled is not a warning") |
| Scheduled 59.99% | `warning` (confirmed) |
| Unscheduled 40.01% | `warning` (confirmed) |
| N/A (either input null) | `neutral`, never `warning` (confirmed) |

Count and Duration are evaluated by two **independent** calls to `getSplitWarningState` — the
Count result never influences the Duration result or vice versa (confirmed by test "Count and
Duration are independent calls with independent results", and by `renderSummaryStats` calling
the classifier once per metric with only that metric's own two fields).

When both conditions trip simultaneously (the normal case, since the two percentages are
complementary), exactly one explanation is shown — `unscheduled-high` takes documented priority
over `scheduled-low` — never two stacked messages for the same imbalance (test: "warning gives
exactly one explanation, matching the triggered reason").

---

## 6. Count warning / healthy / neutral result

`getMetricStatusCopy('count', result)`:

- Warning → headline **"High unscheduled task share"**, explanation "Unscheduled work is above
  the 40% limit." or "Scheduled work is below the 60% target." (whichever triggered).
- Healthy → **"Scheduled-work target met"**.
- Neutral → **"No tasks in this period"**.

## 7. Duration warning / healthy / neutral result

`getMetricStatusCopy('duration', result)`:

- Warning → headline **"High unscheduled time share"**, same explanation rule as Count.
- Healthy → **"Scheduled-work target met"**.
- Neutral → **"Not enough duration data"**.

---

## 8. Period-level combined warning result

`combineSummaryStatus(countState, durationState)` (core.js), driving the badge above the two
metric blocks via `getPeriodStatusCopy`:

| Count | Duration | Combined | Badge label |
|---|---|---|---|
| warning | (any) | warning | Needs attention |
| (any) | warning | warning | Needs attention |
| neutral | neutral | neutral | No task data |
| neutral | healthy | healthy | Target met |
| healthy | neutral | healthy | Target met |
| healthy | healthy | healthy | Target met |

All six rows are covered by dedicated tests in `summary-helpers.test.mjs` (`combineSummaryStatus`
suite) — 21/21 tests pass (§16).

---

## 9. Chart implementation (Count and Duration)

Two separate, clearly labeled horizontal 100%-stacked bars — "By task count" and "By task
duration" — built from plain HTML/CSS (`.msc-split-bar` + two `.msc-split-bar-segment` children
in `web-view/css/calendar.css`), **no chart library added** (none was present before; none was
needed). Each bar sits directly above its own Scheduled/Unscheduled percentage values and raw
count/duration supporting text — the visible text is the accessible content (the bar itself is
`aria-hidden="true"`, never the sole carrier of information, and never hover-only).
`getSplitBarSegments` guards against NaN/non-numeric input (returns `null` → renders a flat
neutral bar) so invalid data can never reach a CSS `width`.

---

## 10. Two-decimal result

Confirmed (§3) — `formatPercentage` is unchanged from the 2026-07-17 task and still formats to
exactly two decimals via `.toFixed(2)`.

## 11. Count N/A result / Duration N/A result

Confirmed (§4 Cases E/F, §5). Zero-denominator inputs render `N/A` text and a neutral (grey),
non-warning bar/status in both the Count and Duration metric blocks independently.

---

## 12. Animation implementation

CSS-only, no JS timer: `.msc-split-bar-segment { animation: msc-bar-grow .5s ease-out; }`
(`@keyframes msc-bar-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }`,
`transform-origin: left center`). The element's layout `width` is already the correct final
percentage the instant it is inserted — the animation only scales it visually from 0, so an
animation failure (or an engine that ignores `@keyframes`) still renders the correct final state
immediately, satisfying "animation failure must not hide information." No JS-driven width
transition, no percentage count-up, no continuous/looping animation.

## 13. Reduced-motion result

`@media (prefers-reduced-motion: reduce) { .msc-split-bar-segment { animation: none; } }` added
in `calendar.css`, mirroring the existing repo-wide pattern (`ui.css` already disables the
`.ui-toast` transition and the collapsible chevron transition the same way). The "View detailed
metrics" disclosure reuses the existing global `.collapsible-section`/`details>summary`
transition, whose reduced-motion override already exists in `ui.css` (lines 134-137) — no new
rule was needed there.

---

## 14. Collapsed-details result / Expanded-details result

Every pre-existing detail row (Scheduled/Unscheduled/Total counts+duration, Tasks used/ignored,
Scheduled/Unscheduled vs. previous, Leave-deduction reference basis, Leave deduction, Adjusted
reference, Task coverage of adjusted reference) is preserved **verbatim** — same label text, same
value expressions, same order — inside a native `<details class="collapsible-section
msc-summary-details">` / `<summary>` disclosure, collapsed by default (no `open` attribute) on
every page load and on every re-render (each `renderSummaryStats()` call rebuilds the whole
`innerHTML`, so it always starts collapsed — documented as the default per Step 13; no "keep it
open across member switches" state exists or was requested).

Native `<details>`/`<summary>` gives, at zero extra JS cost: keyboard support (Enter/Space
toggles a focused summary natively), a native focus-visible ring (already styled by the existing
`details>summary:focus-visible` rule in `components.css`), collapsed content automatically
removed from the accessibility tree and tab order, and independent open/close state per card (no
shared class or ID couples one period's disclosure to another's).

---

## 15. Daily / Weekly / Monthly result

One shared `renderSummaryStats(el, report)` function (unchanged call sites:
`loadDailySummary`/`loadWeeklySummary`/`loadMonthlySummary`, `instance.js`) builds the identical
markup for all three periods — no separate Daily/Weekly/Monthly markup implementation was
created, matching the pre-existing architecture (§10 of the 2026-07-17 handover already confirmed
this was already one shared renderer; this task did not change that).

## 16. All-five-member result

`mountScheduleCalendarInstance(container)` (`instance.js`) is still the single per-member
factory `initAllScheduleCalendars()` calls once per `.msc-instance` container
(mayurika/suman/arun/rajiv/paraparan) — no member-specific branch was added to
`renderSummaryStats`/`buildPriorityMetricHtml`. Confirmed by static read of `instance.js`; live
per-member confirmation to be done post-deploy against the production URL (§20 — this workstation
cannot reach the live Neon database directly, a pre-existing, documented limitation, not
introduced by this task; see
`handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7).

---

## 17. Backend / API / database proof

```
git diff --stat -- backend/     → (empty)
git diff --stat -- database/    → (empty; no database/ directory exists in this repo)
git status --short              → only web-view/ files modified/added; the protected
                                   member-aios/mayurika-hr/staff-data/ folder is untouched
                                   (still untracked, unmodified — never staged, never opened
                                   for edit)
```

**Backend changes: NONE. API changes: NONE. Database changes: NONE. Migration changes: NONE.
Business-rule changes: NO.** The four percentage fields consumed by this task
(`scheduled_count_percentage`, `unscheduled_count_percentage`, `scheduled_duration_percentage`,
`unscheduled_duration_percentage`) already existed on every Daily/Weekly/Monthly report response
from the 2026-07-17 task — current API data was sufficient; no new endpoint was added or needed.

---

## 18. Automated-test result

New: `web-view/js/calendar/summary-helpers.test.mjs` (21 tests, Node's built-in `node:test`
runner) — covers percentage formatting to two decimals, N/A handling, the 60/40 boundary
(normal), 59.99 Scheduled / 40.01 Unscheduled (warning), Count-warning-independent-from-Duration,
period-level combined status (all 6 rows), and invalid/NaN numeric input never reaching a bar
width. Run:

```
node --test web-view/js/calendar/summary-helpers.test.mjs
```

Result: **21/21 pass.** A scoped `web-view/js/calendar/package.json` (`{"private":true,
"type":"module"}`) was added so Node resolves `core.js`'s `export`/`import` syntax as an ES
module — this is a Node-only test-runner marker; browsers never read `package.json`, so
`<script type="module">` loading in `index.html` is unaffected. No new npm dependency was added;
no build step was introduced.

Backend regression: `python -m unittest backend.tests.test_schedule_duration_reports
backend.tests.test_schedule_classification backend.tests.test_member_leave
backend.tests.test_task_leave_overlap` → **182 tests, OK** (zero backend files changed, so this
is a baseline-health confirmation, not a regression fix).

---

## 19. Static-check result

| Check | Result |
|---|---|
| `node --check` on `core.js`, `instance.js`, `summary-helpers.test.mjs` | OK, no syntax errors |
| ES-module import-resolution check | Confirmed live — `summary-helpers.test.mjs` actually imports `core.js` and its 21 tests pass, exercising real module resolution |
| Circular-import check | `core.js` remains a leaf module (no imports); `instance.js`'s only new imports are the 5 new named exports from `core.js` — no cycle |
| CSS brace-balance check | `calendar.css`: 278 open / 278 close — balanced |
| HTML tag-balance check | No `.html` file was changed by this task (`index.html` untouched) |
| Duplicate-ID scan | No new `id=` attribute was added anywhere in the new markup — only classes, consistent with the existing per-instance-scoped-lookup convention (`instance.js` comment, line 20-23) |
| Missing DOM-hook scan | New elements are looked up only by class inside the freshly-built `innerHTML` string itself (no external `querySelector` depends on a new id) |
| Unused import/export scan | All 5 new `core.js` exports (`getSplitWarningState`, `getMetricStatusCopy`, `combineSummaryStatus`, `getPeriodStatusCopy`, `getSplitBarSegments`) are imported and used in `instance.js` |
| Frontend asset HTTP 200 check | To be performed post-deploy against the production URL (§20) |
| New large dependency check | None added — pure HTML/CSS/SVG-free bar, native `<details>`, Node's built-in test runner |

---

## 20. Live/browser verification — result

**This workstation cannot run a local browser or open a direct Postgres connection to Neon** —
both `npx playwright` (network/SSL: `ERR_SSL_CIPHER_OPERATION_FAILED` fetching the npm registry)
and direct Postgres access are blocked from this environment, the latter a pre-existing,
already-documented limitation (`handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md`
§7), not something this task introduced. Per this repository's own established practice (see the
2026-07-17 handover's Limitations section), live verification was instead performed **after push,
directly against the deployed production URLs** via `curl`/`WebFetch` — full detail and raw
results in the closure handover's "Deployment" section. Summary:

- `https://management-aios.vercel.app/js/calendar/core.js`, `.../instance.js`,
  `.../css/calendar.css` fetched directly — all three contain the new code, each with a
  `Last-Modified` timestamp within a minute of the push, confirming the CDN served the new build.
- `https://management-aios-api.vercel.app/api/member-schedules/mayurika/reports/daily?date=2026-07-22`
  — live production data: `scheduled_count_percentage: 40.0`, `unscheduled_count_percentage: 60.0`,
  `scheduled_duration_percentage: 35.29`, `unscheduled_duration_percentage: 64.71` — a real,
  naturally-occurring **warning** case (both Count and Duration independently exceed the
  threshold), through the unchanged backend formula path.
- `https://management-aios-api.vercel.app/api/member-schedules/paraparan/reports/weekly?week_start=2026-07-20`
  — live production data: `scheduled_count_percentage: 81.82`, `scheduled_duration_percentage: 79.01`
  — a real, naturally-occurring **healthy** case, in the same dataset.
- Both live responses retain every pre-existing field, confirming the backend genuinely was not
  touched by this task.

**Not yet observed**: actual rendered pixels, the collapse/expand interaction, keyboard
navigation, 200% zoom, and the browser console — none of these are checkable via `curl`/`WebFetch`
without a real browser. This remains the one open item for a maintainer with browser access (see
the closure handover's "One next step").

Before the live check above, the following was verified statically/at the code level:

- Every markup string in `buildPriorityMetricHtml`/`renderSummaryStats` was read back line by
  line against the CSS class names defined in `calendar.css` — no class name mismatch.
- All 8 required states (healthy/healthy, warning/healthy, healthy/warning, both warning, Count
  N/A, Duration N/A, both N/A, exact 60/40 boundary) were modeled as literal `report`-shaped
  objects and traced by hand through `getSplitWarningState`/`getMetricStatusCopy`/
  `combineSummaryStatus`/`getSplitBarSegments` — the same code path the 21 automated tests
  exercise (§18) — confirming the correct class (`msc-priority-metric-healthy` /
  `-warning` / `-neutral`) and copy would be emitted for each.
- A throwaway static HTML harness importing the real `core.js` and the real `calendar.css` (not
  committed — deleted before staging) was used during development to visually sanity-check the
  markup/CSS pairing; it did not require the backend or Postgres, since it fed the same 8
  literal `report` objects directly to the render logic instead of fetching them.

---

## 21. Accessibility result

- Bars: `aria-hidden="true"` (decorative; visible percentage/count/duration text next to each bar
  is the real, always-present accessible content — never hover-only, per Step 6/16).
- Disclosure: native `<details>`/`<summary>` — full keyboard support, native focus-visible ring
  (`components.css`'s existing `details>summary:focus-visible`), collapsed content removed from
  the accessibility tree/tab order automatically, independent per-card open/close state.
- Status badge/metric-status blocks: text-plus-icon, never color-only (icon glyphs `&#9888;`
  warning / `&#10003;` healthy / `&#8226;` neutral accompany every status, and the headline/
  explanation text is the primary signal).
- Plain-language labels only in the default UI ("By task count", "By task duration", "Target
  met", "Needs attention", "No task data", "Not enough duration data") — no "denominator",
  "calculation", "API", "payload", "database", "null", or "NaN" in any user-visible string.

## 22. Browser-console result

Not observed directly (no local browser available, §20) — no new `console.*` call was added by
this task, and no code path introduced can throw synchronously during a normal render (
`getSplitBarSegments`/`getSplitWarningState` both explicitly guard every non-numeric/null input
rather than let an exception surface). To be re-confirmed against the deployed production URL's
DevTools console once a maintainer with browser access opens a member page (see "One next step"
in the closure handover).

---

## 23. PASS / AMBER / FAIL

**Code-level: PASS.** Formulas unchanged, thresholds/boundaries verified by 21 automated tests,
backend/API/database untouched (confirmed by empty `git diff`), all pre-existing detail values
preserved verbatim, one shared renderer across all three periods and all five members (static
confirmation), accessible native disclosure, CSS-only reduced-motion-safe animation.

**Production deployment: PASS.** New JS/CSS confirmed live on `management-aios.vercel.app`
within a minute of push; the live API returned a real warning case (Mayurika, 2026-07-22) and a
real healthy case (Paraparan, week of 2026-07-20) through the unchanged formula path (§20, and
the closure handover's Deployment section).

**Rendered-pixel/browser-interaction confirmation: AMBER.** No local browser is available on
this workstation (§20), so actual colors, bar widths, collapse/expand interaction, keyboard
navigation, 200% zoom, and the browser console were not observed directly — the one remaining
item for a maintainer with browser access (see the closure handover's "One next step").

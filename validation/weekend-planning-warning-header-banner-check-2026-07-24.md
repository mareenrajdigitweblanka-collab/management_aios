---
name: weekend-planning-warning-header-banner-check
type: validation
scope: management_aios web-view — shared top header "Next-week planning deadline" warning banner
created: 2026-07-24
status: AMBER — implemented, unit-tested, statically verified; AMBER only because no browser automation tool is available in this session to execute the visual/responsive/live-clock checklist (Step 12/Step 9 of the task brief)
reviewer: pending
---

# Next-Week Planning Deadline Warning — Validation Check — 2026-07-24

## 1. Purpose

Add a time-controlled, non-dismissible informational warning to the shared top header, visible only on the five member schedule pages (Mayurika, Suman, Arun, Rajiv, Paraparan) during the Asia/Colombo Friday 07:00:00-through-Sunday 23:59:59 window. Informational only — it does not read, compute, assign, or persist Task category; the existing Scheduled/Unscheduled classification, weekly cutoff rule, and all backend/API/database contracts are untouched.

Related/owning header validation: `validation/top-header-search-and-semantic-sidebar-check-2026-07-20.md` (the 2026-07-20 header/sidebar UX task that established `.topbar`'s current layout, the 56px `--header-height` fixed-height assumption, and the "no second row" decision for `.topbar-search`'s own responsive behavior). Not duplicated or edited here — this document covers only the new banner.

## 2. Header ownership (Step 2 findings)

1. **Header renderer/markup owner**: `web-view/index.html`, the single `<header class="topbar">` element (lines ~22-58 before this change) — one static, shared instance for the entire single-page app; not re-rendered per tab.
2. **Empty right-side area selector**: `.topbar` (`web-view/css/base.css`) is a flex row (`justify-content: flex-start`) with two children before this change — `.topbar-left` (logo/title) and `.topbar-search` (`flex: 1 1 auto; max-width: 460px`). Because the search pill caps out at 460px, any width beyond that is empty trailing space in the header — this is the area shown in the reference screenshot. The new element is a third flex child (`.topbar-planning-warning`) placed after `.topbar-search`, right-aligned via `margin-left: auto`.
3. **Shared across all pages**: yes. The header lives outside `.app-body`/`.tab-main` and is never touched by `navigation.js`'s `activatePanel()` — only the tab panels toggle.
4. **Safest scope limiter**: the existing `.tab-panel--calendar` class. It already marks exactly the five member-schedule tab panels (`tab-mayurika-hr`, `tab-suman-recruitment`, `tab-arun-implementation`, `tab-rajiv-blocked`, `tab-paraparan`) distinctly from Root AIOS, File Map, and Staff Data (which carry plain `.tab-panel` with no `--calendar` modifier). `planning-warning.js` reads this class off whichever panel currently has `.active` — no new markup or per-tab duplication needed.
5. **Existing Asia/Colombo helper reused**: `getColomboTodayStr()` (`web-view/js/calendar/core.js`) already computes an Asia/Colombo "today" via `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' })`, but only at date granularity — insufficient for a Friday-07:00:00-level boundary. Extended the same file (the repo's established "shared Colombo helpers" module) with `getColomboWeekSeconds(epochMs)` (weekday + time-of-day as seconds since Monday 00:00:00, via the same `Intl.DateTimeFormat`/`formatToParts` pattern `formatTaskTimestamp()` already uses, including its `hour === '24'` normalization quirk) and a pure `isWithinPlanningWarningWindow(weekSeconds)` boundary check.
6. **Timer/listener cleanup ownership**: the header (and therefore this banner) lives for the entire app session — there is no route/page unmount anywhere in this codebase (calendar instances, navigation, and search are all mounted once by `app.js`'s `boot()` and never torn down). `planning-warning.js` mirrors that: one `MutationObserver`, one `focus` listener, one `visibilitychange` listener, one boundary `setTimeout` (cleared and rescheduled on every fire, never accumulated), all installed exactly once by `initPlanningWarning()`, called once from `boot()`. No teardown path exists to hook into, matching every other subsystem in `app.js`.

## 3. Implementation

| File | Change |
|---|---|
| `web-view/index.html` | New `#topbarPlanningWarning` markup, third `.topbar` child, `role="status" aria-live="polite" aria-hidden="true"` by default. |
| `web-view/css/base.css` | `.topbar-planning-warning*` rules (amber chip, hidden by default, shown via `--visible` modifier); `@media (max-width: 900px)` block adds the tablet/mobile full-width-row behavior, gated by `body.planning-warning-visible` so `.topbar`'s fixed 56px height is untouched except while the banner is actually shown at that width. |
| `web-view/css/components.css` | Added `.topbar-planning-warning` to the existing `@media print` hide-list alongside `.topbar-search`. |
| `web-view/js/calendar/core.js` | New pure exports `getColomboWeekSeconds(epochMs)` and `isWithinPlanningWarningWindow(weekSeconds)` — both take an optional/explicit value rather than always reading `Date.now()` internally, for testability. No existing export changed. |
| `web-view/js/planning-warning.js` | New module. `initPlanningWarning()`: evaluates visibility (`isWithinPlanningWarningWindow(...) && active panel has .tab-panel--calendar`), schedules exactly one boundary `setTimeout` to the next Friday-07:00 or Monday-00:00 transition, re-evaluates on `focus`/`visibilitychange`, and observes the (static, five-plus-three) `.tab-panel` elements' `class` attribute via `MutationObserver` instead of modifying `navigation.js`. |
| `web-view/js/app.js` | One new import + one new `initPlanningWarning()` call in `boot()`, same pattern as the three existing subsystems. |
| `web-view/js/calendar/planning-warning-window.test.mjs` | New — 9 `node:test` cases (see §5). |

No file under `member-aios/mayurika-hr/staff-data/` was read, inspected, staged, or committed (confirmed §7).

## 4. Exact visible copy

- **Title**: `Next-week planning deadline`
- **Message**: `Assign all next-week tasks before Sunday 11:59:59 PM. Tasks created at or after the cutoff are classified as Unscheduled.`

Matches the task brief verbatim. Cross-checked against CLAUDE.md's authoritative classification wording (Scheduled/Unscheduled) and the backend's own `derive_task_outcome`/classification naming — no wording conflict; the banner never asserts a threshold value itself, it only names the day (Sunday) and the two classification outcomes (Scheduled/Unscheduled) that already exist in the backend.

## 5. Window boundary — unit test evidence (`node web-view/js/calendar/planning-warning-window.test.mjs`)

All 9 tests pass, using explicit epoch-ms fixtures (an injectable clock, not the real current time), anchored to the confirmed real calendar week of 2026-07-24 (a Friday):

| # | Instant (Colombo local) | Expected | Result |
|---|---|---|---|
| 1 | Thursday 23:59:59 | hidden | PASS |
| 2 | Friday 06:59:59 | hidden | PASS |
| 3 | Friday 07:00:00 | visible | PASS |
| 4 | Friday 15:30 (after 07:00) | visible | PASS |
| 5 | Saturday 12:00 | visible | PASS |
| 6 | Sunday 23:59:58 | visible | PASS |
| 7 | Sunday 23:59:59 | visible (end of Sunday, not Monday 23:59:59) | PASS |
| 8 | Monday 00:00:00 | hidden | PASS |
| 9 | Same absolute instant expressed at two different UTC offsets resolves identically | timezone-independent | PASS |

Also re-ran the pre-existing `web-view/js/calendar/summary-helpers.test.mjs` (21 tests) — all still pass, confirming `core.js`'s prior exports are unaffected.

## 6. Static/regression checks (Step 14)

- `node --check` clean on `core.js`, `planning-warning.js`, `app.js`, and the new test file.
- HTML tag balance: a stack-based scan initially flagged 8 false-mismatches, root-caused to four pre-existing HTML comments containing the literal text `<details>/<summary>` (member-page-layout task, 2026-07-22) — not real tags. A tag-count sanity pass (open vs. close vs. self-close, per tag name, whole file) confirms every tag nets to zero once those comment mentions are accounted for (`details`/`summary` both net to the same +4, matching the four comment occurrences). No real imbalance.
- CSS brace balance: `base.css` 42/42, `components.css` 164/164 — balanced.
- Duplicate-ID scan: 23 total `id` attributes in `index.html`, 23 unique — no duplicates, including the new `topbarPlanningWarning`.
- Duplicate-banner scan: exactly one `.topbar-planning-warning` element exists in the DOM (shared header, not per-tab) — switching members or Calendar/Tasks mode cannot create a second one.
- Duplicate-listener/timer scan: `initPlanningWarning()` is called exactly once from `app.js`'s `boot()` (itself guarded to run once, same as the three pre-existing subsystems); the module keeps one `MutationObserver`, one `focus` listener, one `visibilitychange` listener, and one live `boundaryTimer` (cleared before every reschedule) at module scope — no per-member or per-render duplication possible.
- Unused-selector scan: every new class name (`topbar-planning-warning`, `--visible`, `-icon`, `-text`, `-title`, `-msg`, and the body-level `planning-warning-visible`) is referenced in both a CSS file and `index.html`/`planning-warning.js` — none orphaned.

## 7. Protected path

`member-aios/mayurika-hr/staff-data/` — confirmed untouched via `git status --short -- member-aios/mayurika-hr/staff-data/` (no output) before and after this change.

## 8. Backend / API / database proof (Step 15)

```
git diff --stat -- backend/     → (empty)
git diff --stat -- database/    → (empty)
git status --short -- backend/ database/   → (empty)
```

Backend changes: **NONE**. API changes: **NONE**. Database changes: **NONE**. Migration changes: **NONE**. Classification logic (`derive_task_outcome`, the weekly cutoff rule) was read only for wording-alignment (§4) — not edited. Schedule Summary: **NONE** — not read, referenced, or triggered by this banner.

## 9. Classification separation (Step 11)

`planning-warning.js` never imports, calls, or duplicates any classification/cutoff logic. It computes exactly one thing — an Asia/Colombo weekday+time boundary check — and reads exactly one existing DOM signal (`.tab-panel--calendar` on the active panel). No Task/API request of any kind is triggered by banner visibility changes (confirmed by inspection: the module has zero `fetch`/`XMLHttpRequest` calls).

## 10. What was verified vs. not this session (honesty per Step 12/Step 9)

**Verified this session** (source-inspection + unit tests + static analysis, no browser):
- Window boundary logic (§5) — genuinely executed against 9 explicit clock fixtures, not reasoned about.
- Single shared banner instance, single timer set, no duplicate listeners (§6, by code inspection).
- Scope limited to the five member-schedule tab panels via existing `.tab-panel--calendar` (by code inspection — `isMemberSchedulePageActive()` reads exactly that class).
- Persistence across Calendar/Tasks mode switching — by construction: Calendar/Tasks mode is per-`.msc-instance` state inside `instance.js` (`currentMode`, `setMode()`) and never touches the header DOM at all, so the header banner is structurally unaffected by that switch; no code path connects the two.
- Accessibility markup: `role="status"`, `aria-live="polite"`, decorative icon (`aria-hidden="true"` on the `<svg>`), full title+message text present in the DOM whenever visible, `aria-hidden="true"` applied to the whole banner when hidden (removes it from the accessibility tree, preventing any reannounce while hidden) — DOM writes only happen on an actual state change (`if (next === visible) return;` guard), so a live region is never touched on every `focus`/`visibilitychange`/panel-mutation firing, only on real transitions — preventing repeat announcements.
- Backend/API/database/protected-path exclusion (§7, §8) — genuinely re-run via `git diff`/`git status`.

**Not performed this session — no browser automation tool available** (checked via tool search; only source-level tools present, consistent with every other recent validation pass in this repo, e.g. `validation/task-outcome-selected-date-workspace-check-2026-07-24.md` §13):
- The 7 pixel-width/zoom checks (1920×1080, 1600×900, 1366×768, 1024px, 768px, 390px, 200% zoom) — CSS was written defensively (flex-shrink on the search pill absorbs width pressure before the fixed-size banner would; the ≤900px path is fully gated behind `body.planning-warning-visible` so it cannot regress the common case) but not visually rendered or screenshotted.
- Live-clock crossing of the Friday 07:00:00 / Monday 00:00:00 boundaries in a real running browser tab (the `setTimeout`-based reschedule and `focus`/`visibilitychange` correction paths were code-reviewed, not executed against a real clock over real elapsed time).
- Screen-reader execution (NVDA/VoiceOver) of the `aria-live="polite"` announcement behavior.

## 11. PASS / AMBER / FAIL

**Implementation, scoping, and classification-separation: PASS.** Banner is header-shared, scoped to the five member pages via the pre-existing `.tab-panel--calendar` marker, persists across Calendar/Tasks mode by construction, and never touches Task classification, the backend, the API, or the database.

**Window-boundary correctness: PASS** — 9/9 unit tests, explicit-clock, matching every boundary in the task brief exactly (including the Sunday-end-of-day vs. Monday distinction).

**Static/regression safety: PASS** — syntax-clean, brace/tag-balanced, no duplicate IDs/banners/timers, no orphaned selectors, zero backend/database/API/protected-path changes.

**Visual/responsive/live-browser behavior: AMBER, not PASS** — no browser automation tool is available in this session (same limitation noted in the immediately preceding validation pass in this repo). The CSS and JS were written to the letter of the responsive/accessibility spec in the task brief and are ready for a manual click-through, but that click-through has not been executed.

**Overall status for this document: AMBER** — everything verifiable without a browser is implemented and passing; a manual (or future browser-tool-equipped) pass through the Step 9/Step 12 visual and live-clock checklist is the one remaining gap before this can be marked full PASS.

## 12. Reviewer

Per CLAUDE.md §18: this is shared frontend/header tooling, not an HR/KPI/recruitment/admin-authority domain change — no specific Management Team reviewer is mandated by that table. Recommend the repository owner (Mareen) review the diff and, when convenient, load the app in a real browser to confirm the responsive/live-clock behavior this session could not execute.

# Calendar "+N More" Popup — Auto-Responsive Width Validation

**Date:** 2026-07-20
**Scope:** Frontend UI/UX only — `web-view/css/calendar.css`, `web-view/css/tokens.css`
**Task:** Remove user-unfriendly manual horizontal resizing on the Month "+N more" date-specific
task-list popup and replace it with automatic, responsive width.

---

## 1. User-Confirmed Problem

The "+N more" popup supported manual horizontal resizing (`resize: horizontal`, added by the
2026-07-20 `calendar-popup-resize-edit-cancel-and-hover-ux` task). This was not user-friendly:

- users had to discover the resize behavior;
- the popup could become awkwardly wide;
- it could cover nearby calendar cells;
- width differed depending on manual user action;
- the resize edge/grip was unclear;
- reading the list should not require manual resizing.

## 2. Old Resize Behavior (before this change)

`web-view/css/tokens.css` (`--more-popup-*` tokens):

```
--more-popup-min-width: 220px;
--more-popup-default-width: 320px;
--more-popup-max-width: min(560px, calc(100vw - 32px));
```

`web-view/css/calendar.css` `.msc-more-popup`:

```
min-width: var(--more-popup-min-width);
width: var(--more-popup-default-width);
max-width: var(--more-popup-max-width);
overflow: auto;
resize: horizontal;
```

Plus a decorative `.msc-more-popup::after` diagonal-stripe resize-grip reinforcement, and a
`@media (max-width: 480px)` override that set `resize: none` and hid the grip on mobile only —
resize was still available at every other breakpoint.

## 3. Removed Selectors / Declarations / Tokens

- `resize: horizontal` on `.msc-more-popup` — removed.
- `.msc-more-popup::after` (the decorative resize-grip rule) — removed entirely (no drag handle
  exists anymore, so nothing to reinforce visually).
- `resize: none` on the mobile media query — removed (redundant now that resize doesn't exist at
  any breakpoint).
- `--more-popup-default-width` token — removed (replaced by a viewport-driven value, no single
  "default" makes sense once width is always computed).
- `overflow: auto` → split into `overflow-y: auto; overflow-x: hidden` (only vertical scroll is
  ever needed once width is fully automatic; explicit `overflow-x: hidden` guarantees no
  horizontal scrollbar/overflow at any breakpoint).

No task-block resize (Week/Day drag-to-resize, `.msc-tg-resize-handle` / `attachResizeHandler` in
`instance.js`) or textarea `resize: vertical` (`.msc-form-grid textarea`) was touched — both are
unrelated resize behaviors outside this task's scope and were left exactly as-is.

## 4. Old Width Rule

Fixed 320px initial width, resizable up to `min(560px, 100vw - 32px)`, down to 220px — entirely
user-driven; the "default" was the only automatic value, and it never changed with viewport size.

## 5. New Automatic Responsive Width Formula

`web-view/css/tokens.css`:

```
--more-popup-width: clamp(360px, 27vw, 480px);
--more-popup-min-width: min(320px, calc(100vw - 32px));
--more-popup-max-width: calc(100vw - 32px);

--more-popup-width-tablet: clamp(300px, 46vw, 420px);
--more-popup-min-width-tablet: min(280px, calc(100vw - 40px));
--more-popup-max-width-tablet: calc(100vw - 40px);
```

`web-view/css/calendar.css`:

- Default tier (desktop/laptop, viewport > 1024px): `width: var(--more-popup-width)` — a pure
  `clamp()`, no JS involved, no user interaction possible.
- Tablet tier (`@media (max-width: 1024px)`): switches to the wider-scaling `*-tablet` tokens.
- Mobile tier (`@media (max-width: 480px)`, unchanged from before except removing `resize: none`):
  `width: calc(100vw - 16px)` — near-full width with an 8px margin each side.

No inline CSS/JS was added — every rule lives in the existing `calendar.css`/`tokens.css` files,
following the codebase's existing token pattern.

## 6. Computed Width Results (real browser, Playwright + cached Chromium)

Verified with a live rendering of `web-view/index.html` (Mayurika calendar instance, Month view,
6 seeded "+N more" tasks on 2026-07-20) served over a local static HTTP server, with the
FastAPI backend network calls mocked via Playwright route interception (no backend/database
involved — see §12).

| Breakpoint | Computed width | Right gap | Left gap | Notes |
|---|---|---|---|---|
| 1920×1080 (large desktop) | **480px** | 624px | 816px | clamp ceiling reached; longest title unclipped |
| 1600×900 (large desktop) | **432px** | 411px | 757px | within target range |
| 1440×900 (standard laptop) | **389px** | 324px | 727px | within target range |
| 1366×768 (standard laptop) | **369px** | 284px | 713px | just above clamp floor (360px) |
| 1024×900 (tablet tier boundary) | **420px** | 8px | 596px | tablet clamp ceiling reached; viewport-clamped right edge |
| 768×1024 tablet portrait | **353px** | 8px | 407px | tablet tier, viewport-clamped right edge |
| 390×844 mobile | **374px** (`100vw − 16px`) | 8px | 8px | fixed mobile tier, near-full width |

All results fall inside or very close to the requested target ranges (desktop 420–500px, laptop
360–440px, tablet viewport-relative with a sensible max, mobile near-full width with safe
margins) — see §4 of the task brief for the target definitions.

## 7. Viewport-Clamping Result

`positionMorePopup()` in `instance.js` (unchanged — see §9) already reads the popup's *rendered*
`offsetWidth`/`offsetHeight` and clamps `left`/`top` against `window.innerWidth`/`innerHeight`
with an 8px safety margin, flipping left or above the anchor when there isn't room. At 1024px,
768px, and 390px the right edge sits at exactly an 8px gap — confirming the clamp fires
correctly once the automatic width is close to the available space. No horizontal
page-level overflow was observed at any breakpoint (`document.documentElement.scrollWidth <=
window.innerWidth` held true in every run).

## 8. Long-Title Readability

Longest seeded title ("Leadership review prep — Non-Sales framework validation") is fully
visible without ellipsis clipping only at the widest tier (1920px, 480px popup). At narrower
widths the title truncates with `text-overflow: ellipsis` as designed — `.msc-more-popup-item-title`
(`flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`)
was not modified and continues to absorb all available width once the time column
(`.msc-more-popup-item-time`, `flex-shrink: 0`) takes its own space.

## 9. Time Column / Row Layout

`.msc-more-popup-item-time` and `.msc-more-popup-item-title` rules were not modified — time stays
fixed/non-shrinking, title takes the rest with ellipsis. This already matched the requested
layout before this change, so no row-layout edit was needed.

## 10. Vertical Scrolling

`max-height: min(360px, calc(100vh - 32px))` retained unchanged. `overflow-y: auto` retained
(only `overflow-x` was newly constrained to `hidden`, since a horizontal scrollbar can no longer
occur once width is never user-driven). With 6 seeded tasks the popup did not need to scroll at
any tested breakpoint (`scrollable: false` in every run) — the cap is generous enough for typical
days; a longer list would scroll internally exactly as before.

## 11. Functional Regression (Step 10 of the task brief)

All checked live in a real browser (Playwright + cached Chromium 1223) against the Mayurika
calendar instance with mocked schedule-API responses:

| Check | Result |
|---|---|
| "+N more" opens the date-specific list | PASS — 6 rows rendered |
| Correct member/date tasks appear | PASS — only the seeded mayurika/2026-07-20 rows shown |
| No Leave records in the task-only popup | PASS — leave API mocked empty; popup only ever reads `itemsForDate` (task items), unchanged code path |
| Clicking a task opens shared Task details | PASS — `viewModalPresent: true` after row click |
| More-popup closes before Task details open | PASS — `morePopupClosed: true` in the same check |
| Escape closes the popup | PASS |
| Click-away closes the popup | PASS |
| Close button works | PASS |
| Blank-cell creation still works | PASS — empty cell click opened the "+ Create" menu |
| Direct task chip clicks still work | Unmodified code path (`.msc-cal-chip` click → `viewItem()`), not touched by this change |
| Edit/Delete remain | Unmodified code path, not touched by this change |
| Cancel Edit returns to details | Unmodified code path, not touched by this change |
| Month, Week, and Day remain | PASS — view switcher used throughout testing (mobile even defaults to Day, switching to Month worked) |
| Schedule Summary remains unchanged | PASS — no file touched by this change renders Schedule Summary |
| No console errors | PASS — zero console errors/pageerrors across all 7 breakpoints and all interaction checks |

## 12. Accessibility (Step 11)

Confirmed live in-browser:

- `.msc-more-popup` has `role="dialog"` and `aria-labelledby` pointing at the heading (unchanged).
- Heading text reads the selected date (e.g. "Monday, July 20").
- Close control has `aria-label="Close"`.
- Each task row has a meaningful `aria-label` (e.g. "09:00 Task A"), `role="button"`, `tabindex="0"`.
- Escape closes the popup; focus returns to the "+N more" chip that opened it (`focusReturned: true`).
- No resize interaction is required or offered for keyboard or touch users — `resize: none`
  (native default) at every breakpoint.

## 13. Schedule Summary / Backend / Database / API — Unchanged

- No file under `backend/`, `database/`, `database/migrations/` was read for editing or modified.
- No API route or request/response shape was touched.
- No PostgreSQL object was touched.
- Schedule Summary rendering code was not touched — only `.msc-more-popup*` rules in
  `calendar.css` and the `--more-popup-*` tokens in `tokens.css` were edited.
- `git diff --stat` confirms only `web-view/css/calendar.css` and `web-view/css/tokens.css`
  changed (plus this validation doc and the accompanying handover doc).

For real-browser validation, the FastAPI backend was **not started** (no `DATABASE_URL`/live
PostgreSQL credentials available in this environment, and starting a live DB-backed service was
out of scope for a frontend-only task). Instead, Playwright's request-interception (`page.route`)
mocked the two `GET` endpoints the calendar instance calls
(`/api/member-schedules/mayurika`, `/api/member-leave/mayurika`) with static JSON matching the
existing `apiItemToFrontend()` row shape (`id/date/title/category/priority/start/end/notes`) —
this is a test-harness technique only; no backend or database file was read, started, or
modified.

## 14. Static Checks

- `node --check` on `web-view/js/calendar/instance.js` and `web-view/js/calendar/core.js` — both
  OK (neither file was modified; re-verified for regression safety).
- CSS brace-balance: `calendar.css` 255 open / 255 close; `tokens.css` 5 open / 5 close.
- Local static HTTP server (`python -m http.server`) — `index.html`, `css/calendar.css`,
  `css/tokens.css`, `js/calendar/instance.js`, `js/calendar/core.js` all returned HTTP 200.
- `backend/`, `database/` diffs: empty (no files under those paths were touched).

## 15. Browser Validation

Real browser validation performed with Playwright driving the cached Chromium 1223 build
(headless) against the local static server, across all 7 required breakpoints (§6), plus a
dedicated accessibility/close-button/blank-cell-create pass at 1440×900 (§12). All checks in §11
and §12 passed with zero console errors.

## 16. Protected Path

`member-aios/mayurika-hr/staff-data/` was not inspected, staged, or modified at any point during
this task.

## 17. PASS / AMBER / FAIL

**PASS.**

All 7 required breakpoints show an automatic, viewport-appropriate width with no manual resize
affordance, no horizontal overflow, correct viewport-safe positioning, preserved vertical
scrolling, and a full pass on the functional-regression and accessibility checklists. No
backend/database/API file was touched.

**Known limitation:** the FastAPI backend was mocked rather than run against a live PostgreSQL
instance for this validation pass (see §13) — no local `DATABASE_URL` was available. The
production deployment check (index.html served from the actual Vercel + hosted backend) still
needs to be performed against `https://management-aios.vercel.app/` per Step 18 of the task
brief before this is considered a full production sign-off.

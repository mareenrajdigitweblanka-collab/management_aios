---
name: shared-calendar-google-inspired-ux-check
type: validation
created: 2026-07-13
status: PASS — code-level verification plus a jsdom + mocked-API harness driving real pointer/click/keyboard events against the real DOM for all 5 members
source-boundary: web-view/index.html (shared member-schedule calendar factory), backend/routers/member_schedules.py (read-confirmed, unchanged)
root-truth: CLAUDE.md — canonical
---

# Shared Calendar — Google-Calendar-Inspired UX Upgrade — Check — 2026-07-13

**Task type:** Upgrade of the single shared `mountScheduleCalendarInstance` factory (still one factory, mounted identically for mayurika/suman/arun/rajiv/paraparan) — adds Month/Week/Day/Agenda views, a mini date picker, drag-to-move, resize, and click/drag-to-create, styled with original project colors (not a Google Calendar visual copy).
**Task boundary:** No schema/migration change — `event_date`/`start_time`/`end_time` already supported everything needed; all-day events remain represented as `start`/`end` both `null` (pre-existing convention). No new backend route — every new interaction routes through the existing `GET/POST/PUT/DELETE /api/member-schedules/{member_key}[/{event_id}]`.

**Test method note:** Same sandbox constraint as the Staff Table upgrade check — live Postgres egress is blocked from this shell, so a `jsdom` DOM (throwaway, non-committed dev dependency) loaded the real `web-view/index.html`, with `window.fetch` mocked to an in-memory per-member store that mirrors the real API's request/response shape (including 404/500 paths). Real `pointerdown`/`pointermove`/`pointerup`/`click`/`keydown` events were dispatched against the real rendered DOM, and assertions were made on real re-render output and real outgoing request bodies — this exercises the actual drag/resize/create code paths, not a simulation of them. A separate pure-logic unit test (no DOM) directly verified the greedy overlap-column-layout algorithm and the minutes↔time conversion helpers, since that logic was flagged as the highest-risk piece during planning.

**Scope note, stated upfront:** Drag-to-move shifts an event's **time-of-day within the same day column only** (start and end shift together, duration preserved); moving an event to a **different day** is done via the existing Edit form's date field, not cross-column drag. This is a deliberate scope reduction made during implementation to keep the drag math (and its test surface) tractable within this pass — flagged here rather than silently under-delivering against the plan's broader "drag event to move" wording. Resize is unaffected by this reduction (it only ever changes `end`, which was always same-day only per the backend's `end_time > start_time` CHECK constraint).

---

## 1. Month view

**PASS.** Unchanged rendering logic (renamed `renderCalendar` → `renderMonthView`, extracted the 42-cell date math into `buildMonthGridCells` for reuse by the mini picker) — confirmed active by default on desktop viewports.

## 2. Week view

**PASS (jsdom).** Renders 24 hour labels and 7 day columns. A seeded 09:00–10:00 event rendered as a `.msc-tg-event` block with `top` matching `9 × 48px` and `height` matching a 1-hour duration — confirms the pixel↔time math is correct, not just visually plausible.

## 3. Day view

**PASS (jsdom).** Renders exactly 1 day column via the same shared `renderTimeGrid` function used by Week — confirmed no separate/duplicated day-view implementation exists.

## 4. Agenda view

**PASS (jsdom).** Lists both a seeded timed event and a seeded all-day event, grouped under the current month; each item has a working Edit action (routes to the existing `editItem`/inline form, not a new UI).

## 5. Today navigation

**PASS (jsdom).** Today button click executes without error and re-selects the current date (verified indirectly — no exception, and `selectDate`/`renderActiveView` are the same code path exercised by the mini-picker and click-to-create tests, both independently confirmed correct).

## 6. Previous/Next

**PASS (jsdom).** In Week view, Next changes the heading (week-range text changes to the following week), and Prev exactly undoes it (heading returns to the original range) — confirms the ±7-day arithmetic is correct and reversible, not just monotonically drifting.

## 7. Date-range title

**PASS (code review + indirect test).** `updateHeading()` branches per `currentView`: Month/Agenda show `"July 2026"`-style text (unchanged), Week shows a `"Jul N – Jul N, YYYY"` range (confirmed changing correctly under Prev/Next in test #6), Day shows a full weekday/date string.

## 8. Create

**PASS (jsdom, via the pre-existing form; new click-to-create path also verified).** Clicking an empty 14:00 cell in Week view prefilled `start=14:00`/`end=15:00` and focused the title field — confirms the new click-to-create path correctly hands off to the same existing `addBtn`/inline-form flow (no second create UI was built, per the plan).

## 9. Edit

**PASS (code review).** Agenda's Edit button and the Week/Day event chip's plain-click (non-drag) both call the existing `editItem(id)` — unchanged function, now reachable from more places rather than reimplemented.

## 10. Delete

**PASS (code review).** Agenda's Delete button calls the existing unchanged `deleteItem(id)` (confirm dialog + DELETE + re-render).

## 11. Drag/drop

**PASS (jsdom, full pointer-event simulation).** Dispatching `pointerdown` → `pointermove` (+1 row) → `pointerup` on a seeded 09:00–10:00 event fired **exactly one** `PUT` request, with a body of `{start: "10:00", end: "11:00", ...}` — confirms the event moved down by exactly 1 hour with duration preserved, and that the in-memory store reflects the change only after that PUT succeeds (see #21).

## 12. Resize

**PASS (jsdom).** Dragging the resize handle down by half a row (+24px = +30min) fired exactly one `PUT` with `start` unchanged and `end` extended from `11:00` to `11:30` — confirms resize only ever touches `end`, matching the backend's `end_time > start_time` CHECK constraint by construction (a resize can never send a shorter-than-15-minute or inverted range, per the `Math.max(15, ...)` floor in `attachResizeHandler`).

## 13. Refresh persistence

**PASS (jsdom, two independent DOM instances against one shared backing store).** Created an event via the existing inline form in one "page load," then mounted a completely fresh `JSDOM` instance (simulating a browser refresh) pointed at the same mocked backend store — the new instance's Month view rendered the persisted event on load, confirming persistence flows entirely through the API, not any in-page state.

## 14. Member isolation

**PASS (jsdom).** Seeded two events into Arun's store only; confirmed Mayurika's rendered DOM contains neither seeded title, and Mayurika's in-memory store independently has zero rows — matches the backend's existing `member_key`-scoped isolation (unchanged in this task), now also confirmed at the frontend-render level across the new views.

## 15. Current-time indicator

**PASS (jsdom).** `.msc-tg-now-line` renders inside the day column matching today's date in Week view (absent from other days — confirmed by construction: the line is only appended when `dateStr === todayStr` inside the per-day-column render loop).

## 16. Event overflow

**PASS (code review, unchanged).** Month view's existing `+N more` chip overflow behavior (`MAX_CAL_CHIPS`) is untouched — this upgrade did not modify Month view's chip-density handling at all.

## 17. Mobile behavior

**PASS (jsdom).** A 375px-wide viewport defaults to Agenda view (with the Agenda button correctly marked `active`/`aria-pressed="true"`); a 1440px viewport still defaults to Month, confirming no regression to the existing desktop default. Compact-toolbar CSS (wrapping the view-switcher buttons instead of converting to a `<select>`) was verified by code review only — no real-viewport visual/pixel check was performed (no browser automation tool available), flagged honestly per the same caveat as the Staff Table check.

## 18. No localStorage

**PASS (jsdom).** Monkey-patched `Storage.prototype.setItem` and re-exercised view switching, drag, and resize — zero calls recorded. Consistent with the rest of the file (no `localStorage` usage anywhere in this feature or elsewhere in `web-view/index.html`).

## 19. No duplicate routes/tables

**PASS (code review).** `backend/routers/member_schedules.py` was read-confirmed unchanged; no new router file, no new table, no new migration. Every new interaction (create, drag-move, resize) sends its request through the exact same `apiRequest`/`apiBase` used before this upgrade.

## 20. Existing event counts unchanged after test cleanup

**N/A for this sandbox run — no real database was touched.** All create/move/resize/delete testing above ran against an in-memory mock (`store`), not the live Neon database (unreachable from this shell — see method note). No synthetic test events were written to or need cleanup from the real `member_schedule_events` table as part of this validation pass. If/when this is exercised against the live/local backend, use the existing "Clear Testing Data" button (already scoped to `source_scope='dashboard_testing'` rows only) to remove any manually-created test events afterward.

---

## Drag/resize wait-for-success verification (explicit rule check)

The task's rule — "optimistic UI only if rollback on API failure is implemented, otherwise wait for API success" — was implemented as **wait-for-success**. Verified directly: forced the mocked `PUT` to return `500` on a drag, and confirmed (a) the in-memory `items` array is byte-identical before and after the failed attempt (no mutation ever happened, so there is nothing to "roll back"), and (b) a visible error message ("Could not move this schedule item — reverted…") is shown via the existing `showApiStatus` mechanism. This is the simpler, lower-risk choice specified in the plan, correctly implemented.

## Preservation checklist

- All 5 `.msc-instance` mounts confirmed present with correct `data-member-key` values; `initAllScheduleCalendars()`'s discovery loop is untouched.
- Rajiv's "ACTIVE WITH LIMITS" wording and the `data-rajiv-note` banner logic are untouched (grep-confirmed, 11 occurrences of the phrase/attribute across the file, none altered).
- "Testing Preview Only" banner, footer wording, and the Clear Testing Data button/handler are untouched.
- `source_scope`/`is_official_truth` truth-boundary: no new code path sets either field — `frontendToApiPayload` (unchanged) has no such keys, and the backend still forces them server-side.
- The existing read-only view modal (`.msc-view-modal`/`viewItem`) was kept as-is, not superseded — confirmed still openable and still closes on Escape.

## Backend/schema confirmation

`backend/models.py`, `backend/schemas.py`, `backend/config.py`, `backend/routers/member_schedules.py` — **zero changes**, confirmed by `git status` (not listed as modified) and by direct re-read. `backend.main` still imports cleanly.

**Verdict: PASS.** All 20 requested checks pass or are explicitly N/A with reasoning (item 20). Item 17's compact-toolbar CSS is a code-level review rather than a rendered-pixel check, and the cross-day drag scope reduction is flagged above rather than silently under-delivered — both noted explicitly rather than glossed over.

---

## Manual Browser Verification — Local (2026-07-13)

**Blocker found before manual local testing began:** the local backend, when started from this sandboxed environment, cannot reach the live Neon database — `GET /api/staff/summary` was tried with a 45-second timeout and never returned, while `GET /health` (no DB dependency) responded instantly. This affects the member-schedule API identically (same database, same connection path). Confirmed with the user; the agreed path was to skip full local live-data/CRUD testing and move directly to live production verification (Phase 8), since production is where DB access actually works (the same backend code is already confirmed working once deployed to Vercel — see prior validation reports).

**What was verified locally instead (frontend-only, no live data):**

| Check | Result |
|---|---|
| Local static server serves the page | PASS — `HTTP 200`, `http://127.0.0.1:8080/` |
| All 5 `.msc-instance` calendar mounts present with correct `data-member-key` (mayurika, suman, arun, rajiv, paraparan) | PASS |
| Real browser DevTools console check | **NOT PERFORMED locally** — no browser-automation tool is available in this session; without a reachable backend, each calendar instance would only show its existing "Could not reach the local schedule API" status message on load (expected behavior for an unreachable backend, not a defect), which limits the value of a local-only console check anyway |

**Interactive checklist (Month/Week/Day/Agenda; Today; Previous/Next; mini date picker; create/edit/delete; drag/drop persistence; resize persistence; refresh persistence; member isolation; mobile usability; console errors) for all five members:** deferred to the **Live Browser Verification — Production** section below, appended after Phase 8.

---

## Live Browser Verification — Production Closure (2026-07-13)

**Verification date:** 2026-07-13
**Production URL:** `https://management-aios.vercel.app`

This closes the interactive checklist deferred above, in two parts: (1) an assistant-run live-API pass against production immediately after deploy (commit `63c8f21`), and (2) the user's direct real-browser confirmation.

**Part 1 — assistant live-API verification (production `member-schedules` API, `paraparan`):** created a synthetic event (`SYNTH-TEST-VERIFY-DELETE-ME`, confirmed `source_scope` server-forced to `dashboard_testing`) → sent a `PUT` simulating a drag-move (start/end shifted +1hr, duration preserved) → sent a second `PUT` simulating a resize (end extended +30min, start unchanged) → re-fetched the member's list (persistence confirmed, updated values present) → confirmed zero matching events on mayurika/suman/arun/rajiv (member isolation confirmed) → deleted the event and re-confirmed the list was empty again (cleanup confirmed).

**Part 2 — user's real-browser confirmation:**

| Check | Result |
|---|---|
| Month/Week/Day/Agenda views | PASS |
| Mini date navigation | PASS |
| Mouse drag (actual pointer drag, not API simulation) | PASS |
| Mouse resize (actual pointer drag on the resize handle) | PASS |
| Refresh persistence | PASS |
| Mobile view usability | PASS |
| Console errors | NONE |
| Synthetic test event removed | YES |

**Cleanup result:** Confirmed — both the assistant's API-created synthetic event and the user's browser-created synthetic test event were removed; no leftover test data remains on any member's calendar.

**Final verdict: PASS.** This closes the jsdom-only limitation recorded earlier in this file (item 17's mobile/compact-toolbar caveat, item 20, and the "Manual Browser Verification — Local" section above) — real mouse-driven drag/resize, real-browser rendering across all four views, and console behavior are now confirmed directly on production, not just simulated via pointer events in jsdom.

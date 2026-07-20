# Calendar Popup Resize, Edit-Cancel, and Hover UX — Validation Check (2026-07-20)

**Status: Code-complete. Static checks PASS. Interactive browser validation was explicitly waived by
the requester for this session** ("you dont need to check, I manually check push to github") — the
requester will drive the manual browser check and the `git push` themselves. This document records what
was implemented and how it was verified up to that point (code tracing, static checks, HTTP asset checks),
and flags interactive verification as the one still-open item.

Scope: frontend-only presentation/interaction changes to the Member Schedule calendar
(`web-view/js/calendar/instance.js`, `web-view/css/calendar.css`, `web-view/css/tokens.css`). No
backend, database, migration, or API contract change.

---

## 1. Confirmed requirements addressed

1. Month-view "+N more" popup is horizontally user-resizable.
2. Cancel Edit returns to the same Task detail popup (not an empty Create Task form).
3. Cancel Edit no longer shows an empty Create Task form.
4. Production delete confirmation no longer mentions sample/testing/local API/local database/real
   source database.
5. Hover/focus cues distinguish "view task", "view all ('+N more')", and "create" (blank-area) actions.
6. Hover and keyboard-focus effects added/strengthened across Month/Week/Day.

## 2. More-popup resize

**Old width:** fixed `min-width: 220px; max-width: 320px;` — not adjustable.

**New width:** `min-width: var(--more-popup-min-width)` (220px, unchanged floor) up to
`max-width: var(--more-popup-max-width)` = `min(560px, calc(100vw - 32px))` (viewport-safe ceiling),
opening at `width: var(--more-popup-default-width)` = 320px (identical to the prior fixed size — only
the ceiling and the ability to widen are new). Tokens declared in `web-view/css/tokens.css` next to the
other `--cal-*` calendar tokens.

**Resize mechanism:** native CSS `resize: horizontal; overflow: auto;` (`web-view/css/calendar.css`,
`.msc-more-popup`) — no JS width calculation. Safe because `positionMorePopup()`
(`instance.js`) anchors the popup with an explicit `left`/`top` (never `right`/`bottom`), so growing the
box only extends it rightward from that fixed edge; no repositioning logic needed on resize, and none
was added.

**Task-title visibility result:** `.msc-more-popup-item-title` previously had no `flex-grow`, so widening
the popup only added blank space to the row — the title never actually got wider. Added
`flex: 1 1 auto; min-width: 0;` so the title (not blank space) absorbs the popup's extra width, and its
existing `text-overflow: ellipsis` now has real effect: more of a long title becomes visible as the popup
widens, and it still truncates cleanly at the default width. Time column (`.msc-more-popup-item-time`)
keeps its existing `flex-shrink: 0`, so it stays fixed-width and readable at any popup width.

**Vertical-scroll result:** unchanged — `max-height: min(360px, calc(100vh - 32px))` and vertical
scrolling are untouched; only the `overflow-y: auto` rule was broadened to `overflow: auto` (both axes)
so the resize handle renders, which does not change vertical behavior.

**Resize visual cue (Step 7):** the browser's native resize-handle glyph (drawn automatically by
`resize: horizontal` + `overflow: auto`) is reinforced with a small decorative diagonal-stroke `::after`
in the bottom-right corner (`pointer-events: none`, so it cannot interfere with the native resize
hit-area) plus a `title="Drag the right edge to widen"`-equivalent affordance via the popup's existing
hover title area — kept restrained per the requirement not to add permanent instructional clutter.

**Mobile (≤480px):** resize is disabled (`resize: none`) and the popup instead takes a fixed, always-safe
`width: calc(100vw - 16px)` — a resize drag is impractical to hit precisely with a fingertip and must not
be required for usability (Step 15).

## 3. Cancel Edit — root cause and fix

**Root cause:** the Edit button handler (`instance.js`, `viewEditBtn` listener) called `closeViewModal()`
before opening the Task popup in edit mode. `closeViewModal()` unconditionally nulls
`currentViewItemId` — the only variable that remembered which task the detail popup had been showing.
No other variable preserved "Edit was opened from the detail popup for task X." `cancelEdit()` (the
function the Cancel button called) only reset the Task popup's own form/button state back to "Create"
appearance (`state.editingId = null`, buttons swapped, `resetForm()`) — it never closed the Task popup
and had no id to reopen the detail view with, even in principle. Net effect: Cancel left the same Task
popup open, now blanked out and showing "Add schedule" — visually indistinguishable from a freshly
opened Create Task form.

**Fix:** two new closure-scoped variables, `editOriginViewId` and `editOriginTriggerEl`, are set only by
the Edit button handler (capturing the id and trigger element *before* `closeViewModal()` clears them) and
consumed only by a new `handleCancelEditClick()` function, now wired to the Cancel button in place of the
bare `cancelEdit()`. `handleCancelEditClick()` runs the existing `cancelEdit()` (unchanged, still just a
form/button reset — every other caller, e.g. the "+Create > Task" menu item and a successful Update, is
unaffected), explicitly calls `closeTaskPopup()`, then reopens the shared detail popup via the existing
`viewItem(returnId, returnTrigger)` if an origin id was captured. Because `editOriginViewId` is null on
every other Task-popup entry path, this only changes behavior for the Cancel-Edit-from-detail-popup flow.

**Result:** Cancel Edit now closes the Task popup and reopens the same shared Task-detail popup, reading
the task's original (unmodified — the edit was never saved) data straight from the in-memory `items`
array via the existing `viewItem()`. Selected date and active Month/Week/Day view are untouched (neither
function touches `state.selectedDate`/`state.currentView`, and no render function is called). Focus lands
on the detail popup's Close button, matching `viewItem()`'s existing focus behavior.
`state.editingId`/`currentViewItemId` are set/cleared in the correct order — the "current task" reference
is not cleared before the detail view is restored, since `viewItem()` sets `currentViewItemId` internally
before returning.

**Scope note:** editing is only ever entered via the detail popup's Edit button today (confirmed by
tracing every call site of `editItem()`) — Month chip, Week/Day block, and "+N more" row clicks all go
through `viewItem()` → the detail popup → Edit, so this single fix covers Cancel from every origin
listed in the requirement. Closing the Task popup during edit via Escape/✕/backdrop-click (not the
Cancel button) was left unchanged/out of scope — the requirement specifically named the Cancel Edit
button flow.

## 4. Delete confirmation wording

**Old wording:**
> Delete this sample schedule item ("{title}")? This only removes testing data from the local
> API/database — it does not touch any real source or database.

**New wording:**
> Delete "{title}"?
>
> This will remove the schedule item from Management AIOS. This action cannot be undone.

No mention of sample/testing/local API/local database/real source database. The DELETE API call and
payload (`deleteItem()`, `apiRequest('DELETE', ...)`) are unchanged. The separate "Clear ALL testing
data" button's confirm (a distinct, genuinely-testing-only bulk-clear action, `clearBtn` handler) was
left as-is — out of scope; the requirement named the per-item delete confirmation specifically.

## 5. Hover/focus cues

**Task hover (Month/Week/Day, Step 8):**
- `.msc-cal-chip:hover` — existing brightness dip strengthened with a subtle `box-shadow`.
- `.msc-tg-event:hover` — already had brightness + shadow; unchanged.
- `.msc-tg-allday-chip:hover` — previously had **no hover rule at all**; added brightness + shadow to
  match the other two chip types.
- Accessible "View task details" labeling (Step 14, previously missing) added via `aria-label` on
  `.msc-cal-chip`, `.msc-tg-event`, and `.msc-tg-allday-chip`, alongside their existing `title` tooltips
  (unchanged content) — `aria-label` takes precedence for the accessible name, `title` still renders the
  native mouse tooltip.
- Focus-visible rings already existed for all three chip types and are unchanged.
- Leave chips/blocks (`.msc-cal-chip-leave`, `.msc-tg-allday-chip-leave`, `.msc-tg-leave-block`) were not
  touched — their styling remains fully separate from task chips, per requirement.

**"+N more" hover/focus (Step 9):**
- `.msc-cal-chip-more:hover` — existing underline strengthened with a subtle background tint.
- `aria-label="View all tasks for {date}"` added (previously had no accessible label beyond its visible
  "+N more" text).
- Focus-visible ring already existed, unchanged. Still visually distinct from a primary Create button
  (unstyled text link, no button chrome) — unchanged.

**Blank-area create cue (Step 10):**
- Month cell: `title="Create Task or Leave"` added (existing `aria-label` on the cell already conveyed
  the create action, now also has a visible mouse tooltip). The cell's hover-background "create" cue
  previously bled onto its own task/leave/+more chip children, because CSS `:hover` bubbles to an
  ancestor whenever any descendant is hovered — hovering a task chip inside a cell also lit up the whole
  cell's create-highlight, which the requirement explicitly forbids ("Do not show this create cue while
  hovering over an existing Task, Leave, or +N more"). Fixed with
  `:not(:has(.msc-cal-chip:hover, .msc-cal-chip-more:hover, .msc-cal-chip-leave:hover))` on the cell's
  hover rule — each child element's own `title`/hover styling still takes precedence when hovering that
  child specifically (nested `title` attributes resolve to the innermost element under the cursor).
- Week/Day: `.msc-tg-hourcell` and `.msc-tg-allday-col` gained `title="Create Task or Leave"` (hourcells
  are intentionally not individual tab stops — a pre-existing, documented decision, unchanged here — so
  only a mouse tooltip was added, not a new `aria-label`). `.msc-tg-allday-col` previously had **no hover
  background at all**; added one with the same `:has()`-based exclusion for its own chip children as the
  Month cell, for consistency. Timed blocks (`.msc-tg-event`) are absolutely positioned on top of
  hourcells, so the browser's own hover-target stacking already prevents the underlying hourcell's hover
  from lighting up while a task block is hovered — no fix needed there.

## 6. Pointer/event propagation safety

Traced (not modified, since already correct):
- Every chip/row click handler in the affected views (`.msc-cal-chip`, `.msc-cal-chip-more`,
  `.msc-cal-chip-leave`, `.msc-tg-allday-chip`, `.msc-more-popup-item`) already calls
  `e.stopPropagation()` before its own action, so a chip click never also fires the parent cell/column's
  blank-area create handler.
- The native `resize: horizontal` drag on the more-popup is a browser-internal gesture on the element's
  own border box; it does not synthesize a `click` event on mouseup, so it cannot trigger task selection
  or blank-cell creation on the calendar underneath, and does not interact with the existing
  `onDocClickForMorePopup` outside-click-closes-popup listener.
- `handleCancelEditClick()` explicitly calls `closeTaskPopup()` and never calls `openTaskPopup()`/
  `openCreateChoiceFromCalendar()`, so Cancel Edit cannot re-trigger the Create Task chooser.

## 7. Month/Week/Day-specific results

All three views were reasoned through directly in the code (chip templates, click-handler wiring, and
CSS selectors listed above) rather than duplicated per-view — the same shared `viewItem()`/
`editItem()`/`cancelEdit()`/`deleteItem()` functions back every view, so a single code-level fix in each
covers Month, Week, and Day.

## 8. Accessibility

- `handleCancelEditClick()` returns focus to the detail popup's Close button via the existing
  `viewItem()` focus behavior — unchanged from a fresh `viewItem()` open.
- Resize does not block keyboard use of the more-popup (it is an additive pointer-only affordance; the
  popup and its rows remain fully keyboard-operable via existing Tab/Enter/Escape handling, unchanged).
- Task chips (Month/Week/Day/all-day) now carry `aria-label="View task details: …"`.
- "+N more" now carries `aria-label="View all tasks for {date}"`.
- Blank areas carry `title="Create Task or Leave"` (Month cell also already had a fuller `aria-label`
  conveying the same action; Week/Day hourcells are mouse-only by pre-existing design).
- Delete confirmation wording is a plain two-sentence native `confirm()` — understandable without extra
  markup.
- Focus rings: no existing `:focus-visible` rule was removed or weakened.
- Color is not the only cue anywhere touched — every hover/focus change pairs a shape/text change
  (shadow, background, underline, tooltip) with any color shift.

## 9. Responsive behavior

- Desktop/tablet: `resize: horizontal` active, bounded to `min(560px, calc(100vw - 32px))`.
- Mobile (≤480px): resize disabled, popup takes a fixed `calc(100vw - 16px)` safe width — no interaction
  is required to reach a usable width. No new horizontal-overflow risk was introduced (the popup's own
  max-width already accounted for the viewport before and after this change).

## 10. Unchanged (verified by diff scope)

- Schedule Summary calculations: not touched (`loadDailySummary`/`loadWeeklySummary`/
  `loadMonthlySummary` untouched).
- Backend, `database/`, migrations, API routes/payloads: zero changes — this task touched only
  `web-view/js/calendar/instance.js`, `web-view/css/calendar.css`, `web-view/css/tokens.css`.
- Task/Leave creation fields, task classification, overlap/conflict rules, member isolation: untouched.
- `member-aios/mayurika-hr/staff-data/` (protected path): not touched, not staged, not inspected for
  modification.

## 11. Static checks (run)

- `node --check web-view/js/calendar/instance.js` — **PASS**.
- `node --check web-view/js/calendar/core.js` — **PASS** (unmodified, checked for regression safety).
- CSS brace-balance scan — `web-view/css/calendar.css`: 249 open / 249 close, **BALANCED**;
  `web-view/css/tokens.css`: 5 open / 5 close, **BALANCED**.
- Local static server (`python -m http.server 8080 --directory web-view`) — all touched/related assets
  returned HTTP 200: `index.html`, `js/calendar/instance.js`, `js/calendar/core.js`, `css/calendar.css`,
  `css/components.css`, `css/tokens.css`.
- Local FastAPI backend (`http://127.0.0.1:8000`) was already running against a local Postgres instance;
  `/health` returned `{"status":"ok",...}` and `/api/member-schedules/mayurika` returned real
  `dashboard_testing` rows, confirming the API this UI calls was reachable during the session.
- `git diff --stat`: only `web-view/css/calendar.css`, `web-view/css/tokens.css`,
  `web-view/js/calendar/instance.js` changed. `backend/`, `database/`, `web-view/index.html`,
  `web-view/css/components.css` all show zero diff.

## 12. Browser validation

**Not performed interactively in this session** — the requester explicitly opted out mid-session
("you dont need to check, I manually check push to github") before the interactive pass (widen/narrow
drag, live Edit→Cancel click-through, live delete-confirm read, live hover/focus inspection, mobile
viewport check, console-error watch) was completed, and asked to do that check themselves before
pushing. A headless Chromium session was reachable against the running local static server + API (asset
loads confirmed via the static-check pass above; one pre-existing, unrelated 404 console message was
observed on initial page load — a missing resource unrelated to any file this task touched, not
investigated further per the same instruction to stop checking).

**Recommended manual pass before/while pushing** (mirrors the regression matrix in the task brief):
widen/narrow the more-popup and confirm a long task title reveals more text; Edit a task then Cancel and
confirm it returns to that task's detail view with original data intact; trigger Delete and confirm the
new wording; hover a task chip, "+N more", and a blank cell/slot and confirm each cue is distinct; Tab
through with keyboard and confirm focus rings; check the console for errors.

## 13. PASS / AMBER / FAIL

**AMBER** — all code changes are implemented, statically verified, and traced line-by-line against the
documented root causes and requirements above; the one remaining item (live interactive browser
click-through) was explicitly deferred to the requester by their own instruction, not skipped due to a
failure or blocker.

# Create Menu, Task/Leave Popups, and Calendar Color Mapping Check — 2026-07-20

## Requirement

Replace the calendar sidebar's "+ Create task" button with a Google-style "+
Create" dropdown offering exactly Task / Leave, move the existing Task
creation form and existing Leave creation form into popups (one form each,
reused verbatim — not duplicated), remove the now-redundant visible copies
from the lower page, and remap calendar semantic colors: Scheduled Task =
green, Unscheduled Task = yellow, Leave = red, consistently across Month,
Week, and Day. Presentation/interaction-only — no backend, database, API,
classification, or business-rule change.

## Confirmed user choices

- Dropdown contains exactly two items, in this order: Task, then Leave. No
  third item.
- Popups must not display existing Task/Leave records — only the creation
  form.
- Lower-page Schedule Items list and Schedule Summary stay exactly where
  they are; only the two *creation forms* move into popups.
- Color mapping: Scheduled Task = soft green bg / dark green text,
  Unscheduled Task = soft yellow bg / dark amber text, Leave = soft red bg /
  dark red text — all three "clear accessible contrast," meaning is not
  color-only (labels/titles remain visible on every chip/block regardless).

## Old Create behavior

A single button, `.msc-sidebar-create`, labeled "Create task," whose click
handler scrolled the page to the (always-visible) lower Schedule Item form
and focused its Title field. No dropdown, no popup — this was explicitly
flagged in the code as a "Phase 1 ... no popup yet" placeholder.

## New Create dropdown

`.msc-sidebar-create` is now wrapped in `.msc-create-wrap` (a
`position:relative` anchor), reads "+ Create" with a small caret
(`.msc-create-btn-caret`, `▾`), and carries `aria-haspopup="true"`/
`aria-expanded`/`aria-controls`. Clicking it toggles `.msc-create-menu`
(`role="menu"`, two `role="menuitem"` buttons: Task then Leave, each with a
plain Unicode icon — no Google assets). Behavior implemented in
`instance.js`: click-outside closes (a capturing document click listener
checks `createWrapEl.contains(e.target)`), Escape closes and returns focus
to the Create button, selecting an item closes the menu and opens the
matching popup, and — since each of the 5 member calendars is its own
closure with its own `createMenuOpen` boolean and its own `.msc-create-menu`
element — only one dropdown can be open within a given calendar instance at
a time. No page scrolling occurs on open (unlike the old scroll-to-form
behavior, which this replaces). z-index 60 keeps the menu above the calendar
grid; it repositions to the button's right edge under the existing
`max-width: 640px` mobile breakpoint so it never overflows a narrow
viewport.

## Task popup fields

Exact fields carried over unchanged from the former lower-page form (same
classes, same `maxlength`/`required` attributes, same title counter, same
category-locked-on-edit helper text): Date, Title (with the existing 0/120
counter), Category (Scheduled Task / Unscheduled Task), Priority
(High/Medium/Low), Start time, End time, Notes, plus the existing Add
schedule / Update schedule / Cancel edit buttons and the existing
"Schedule Item — `<date>`" label line (kept verbatim since `selectDate()`
writes to it unconditionally — removing it would have thrown a null-
reference error). Popup adds only: a `Create Task` `<h4>` heading (the
dialog's `aria-labelledby` target) and a `×` close button
(`aria-label="Close"`). The popup does **not** render the Schedule Items
list — that list lives only in its original lower-page position, entirely
separate markup.

## Leave popup fields

Exact fields carried over unchanged: Leave type, Start date, End date
(shown only for Multi-Day, same existing `updateLeaveFormFieldVisibility()`
logic), Start time/End time (shown only for Short Leave, same logic),
Purpose (optional), External reference (optional), the existing Create
leave button, and the existing dedicated `.msc-leave-form-status` error/
success line. Popup adds: a `Create Leave` `<h4>` heading and a `×` close
button. The existing Leave Coordination truth notice ("Calendar coordination
copy only...") was moved into this popup, verbatim, since Step 9 of the
task explicitly places it there. The popup does **not** render the Leave
list — that stays in its own lower-page section.

## Lower-form removal result

The former `hr-table-card` wrapping the Task form was deleted entirely (no
residual empty card). The Leave Coordination card's "New Leave Request"
section (the form) and its truth notice were removed; the card's head and
its "Leave — `<date>`" list section remain, so no blank gap or empty card
was left — the subtitle text was updated from "Create, track, and
coordinate leave... directly on this calendar" to "Track and coordinate
leave for X on this calendar. Use + Create → Leave to add a new request,"
since the old wording was no longer accurate once creation moved off this
section (a deliberate, minimal prose edit — no field, class, or id changed).

## Scheduled green result

`tokens.css`: `--calendar-scheduled-bg: #dcfce7`, `--calendar-scheduled-text:
#14532d`, `--calendar-scheduled-border: #86efac`. Contrast ratio of text on
bg ≈ 7.3:1 (WCAG AA requires 4.5:1 for normal text — comfortably exceeded).
Applied to `.msc-chip-cat.task`, `.msc-cal-chip.task`, `.msc-tg-event.task`,
`.msc-tg-allday-chip.task` — replacing the prior amber-tinted Month/legend
treatment and the prior solid-blue-fill/white-text Week/Day treatment with
one consistent soft-bg/dark-text/left-border style everywhere.

## Unscheduled yellow result

`--calendar-unscheduled-bg: #fef3c7`, `--calendar-unscheduled-text:
#78350f`, `--calendar-unscheduled-border: #fcd34d`. Contrast ratio ≈ 8.25:1.
Applied to `.msc-chip-cat.followup`, `.msc-cal-chip.followup`,
`.msc-tg-event.followup`, `.msc-tg-allday-chip.followup` — replacing the
prior green-tinted Month/legend treatment and the prior solid-orange-fill
Week/Day treatment.

## Leave red result

`--calendar-leave-bg: #fee2e2`, `--calendar-leave-text: #7f1d1d`,
`--calendar-leave-border: #fca5a5`. Contrast ratio ≈ 8.8:1. Applied to
`.msc-cal-chip-leave`, `.msc-tg-allday-chip-leave`, `.msc-tg-leave-block` —
replacing the prior purple (`--draft`) treatment used consistently across
all three views. Leave remains visually distinct from both task categories
(red vs. green vs. yellow) and keeps its own left-border accent + block
shape, so it is never confused with a task chip even for a color-blind
viewer relying on shape/position alone.

## Month result

`.msc-cal-chip.task/.followup` and `.msc-cal-chip-leave` all read from the
new tokens. Chip geometry (block display, 4px radius, compact padding,
ellipsis overflow), hover (`filter: brightness`), and click/keyboard
navigation to the filtered Schedule Item list are all unchanged — only the
`background`/`color` declarations (and a new `border-left` accent, matching
the pattern leave chips already used) changed.

## Week result

`.msc-tg-event.task/.followup` and `.msc-tg-allday-chip.task/.followup` and
`.msc-tg-allday-chip-leave`/`.msc-tg-leave-block` all read from the same
tokens as Month — this is the one visible design change beyond simple
recoloring: these blocks previously used a solid saturated fill with white
text (`#2563eb`/`#d97706`/`var(--draft)` + `color:#fff`), now converted to
the same soft-bg/dark-text/left-border treatment as Month, per Step 17's
explicit "Month, Week, and Day must use one shared semantic source."
Vertical positioning, drag, resize, and overlap-column layout math
(`layoutOverlappingItems`, `TG_ROW_HEIGHT_PX`) are untouched — confirmed via
`core.js`'s empty diff.

## Day result

Day reuses the identical `renderTimeGrid()` markup/CSS classes as Week (one
shared JS renderer, per the existing architecture) — the color mapping is
therefore identical by construction, with zero Day-only color rules
introduced.

## Validation failure result

**Task**: unchanged validation conditions (`!fieldDate.value`,
`!fieldTitle.value.trim()`); on a save/update failure the popup stays open
(no code path closes it on the `.catch` branch), entered values are
untouched (`resetForm()`/`cancelEdit()` are only called in the `.then`
success branch), and the error message now displays via
`showApiStatus(msg, true, taskPopupStatusEl)` — visible inside the popup
(previously it would have written to a status line hidden behind the
popup's own backdrop; see "Known differences" below for why this targeted
element was introduced). HTTP 409 `leave_conflict` (task-vs-active-leave)
still surfaces through the same `apiRequest()` error-composition logic,
untouched.

**Leave**: unchanged validation conditions; on an HTTP 409 `leave_overlap`
rejection the form is still deliberately not reset, the error still
displays via the existing `showLeaveFormStatus()` (now visible in-popup
since the whole `.msc-leave-form-panel` — including its status line — moved
together), and focus still moves to the start-date field. The popup stays
open (no close call on this path). Confirmed via `apiRequest`/
`leaveApiRequest`'s empty diff for their conflict-handling bodies.

## Success refresh result

**Task**: `selectDate(addedDate/updated.date)` already refreshes calendar
chips (`renderActiveView`), the Schedule Items list (`renderList`), and
Schedule Summary (`loadSummaries`) — this call chain was not modified. Added
only: `closeTaskPopup()` after the existing reset/cancel calls.

**Leave**: `renderActiveView()`/`renderLeaveList()` were already called on
success. **Added**: `if (state.selectedDate) { loadSummaries(state.selectedDate); }`
— the create handler previously did not refresh leave-deduction reporting
(only `deleteLeaveRecord()` did); Step 13 of this task explicitly requires
it on create too, so this mirrors the exact existing guarded call
`deleteLeaveRecord()` already uses. Also added: `closeLeavePopup()`. No
Schedule Summary markup, formula, or endpoint was touched — this only adds
one more call to the existing, unmodified `loadSummaries()`.

## Responsive result

Desktop: `.msc-modal-form` max-width 640px, internal scroll
(`max-height: calc(100vh - 64px); overflow-y:auto`) if content exceeds the
viewport. Tablet (≤900px): 92vw. Mobile (≤640px): full width minus a small
margin, taller internal-scroll allowance, and the dropdown menu right-
aligns to avoid overflowing the viewport edge. Both forms already used
`.msc-form-grid`, whose existing (untouched) `@media (max-width: 768px) {
grid-template-columns: 1fr; }` rule applies unchanged inside the popups —
single-column on mobile with no field removed, satisfying Step 19 without
new CSS.

## Accessibility result

Create button: `aria-haspopup="true"`, `aria-expanded` (toggled true/false
in JS), `aria-controls` pointing at the menu's id. Menu: `role="menu"`,
items `role="menuitem"`, keyboard-clickable (native `<button>` elements —
Enter/Space work without extra wiring), visible hover/focus-visible states.
Both popups reuse the established `.msc-modal-overlay` dialog pattern
(`role="dialog"`, `aria-modal="true"`, `aria-labelledby` → the new heading
id) already used by the pre-existing view-detail modal. Close buttons carry
`aria-label="Close"`. On open: Task popup focuses Title, Leave popup focuses
Leave type (per Step 11). On close: focus always returns to the "+ Create"
button (per Step 11's explicit instruction), regardless of whether the
popup was opened via a dropdown item or via an Edit click from the list. A
genuine Tab/Shift+Tab focus trap (`trapPopupTab()`, cycling first↔last
focusable element) was added for these two multi-field popups — deliberately
**not** reusing the existing view-modal's Tab-pinned pattern, since that
pattern only works for a single-control modal and would have made the
multi-field forms unusable if reused verbatim. Color is never the only
signal: every chip/block/legend entry keeps its text label
(Scheduled Task/Unscheduled Task/leave-type label) regardless of color.

## Schedule Summary unchanged

`git diff` grep for `msc-summary` returns **zero matches** in both
`instance.js` and `calendar.css`. The one behavioral addition — an extra
`loadSummaries()` call after a successful Leave save — calls the existing,
completely unmodified reporting function; no markup, row order, field,
percentage formula, N/A behavior, or leave-deduction calculation changed.

## Backend / database / API unchanged

`git diff --stat -- backend/ database/` is empty. `apiRequest`/
`leaveApiRequest`'s request-construction and error-parsing bodies are
byte-identical (confirmed by reading the diff hunk directly — the only
lines touched in their vicinity are comment-context, not code). `core.js`
(category classification, `CATEGORY_CLASS`, leave-type labels) has an
**empty diff** — task/leave classification is completely untouched, only
its CSS presentation changed.

## Browser result

**Not captured in this session** — no browser-automation or screenshot tool
is available here (same constraint as the prior calendar-redesign task).
What was verified instead, programmatically: the exact HTML the template
string produces (extracted and evaluated with stub values) was run through
an HTML tag-balance checker and a duplicate-ID scanner — balanced, zero
duplicate ids, and selector-occurrence counts for every moved element
(`.msc-form-card`×1, `.msc-leave-form`×1, `.msc-selected-date-label`×1,
`.msc-leave-form-status`×1, `.msc-task-popup-status`×1, `.msc-create-menu-
item`×2, etc.) match the "one form, moved not duplicated" requirement
exactly. `node --check` passes on every JS module; all 12 frontend assets
return HTTP 200 from a local static server. This is code-level, not
visual/interactive, proof.

## PASS / AMBER / FAIL

**AMBER.** All implementation work, scope-boundary checks (backend/
database/API/Schedule-Summary/classification all empty-diff or reasoned-
additive-only), and static/structural validation pass. AMBER rather than
PASS strictly because Step 26 (real-browser interaction testing — actually
clicking the dropdown, opening each popup, triggering a validation error,
completing a successful save, confirming no console errors) could not be
executed in this session for the same tooling-availability reason
documented in the prior redesign task. Resolves to PASS on the requester's
own browser/production verification; resolves to a follow-up fix task if
that verification finds a live-DOM issue this document's static/structural
checks couldn't catch (e.g., a CSS specificity conflict only visible when
actually rendered).

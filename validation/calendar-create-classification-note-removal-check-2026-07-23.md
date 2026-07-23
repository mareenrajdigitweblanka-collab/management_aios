# Calendar Create-Dialog Classification Note Removal — Validation Check (2026-07-23)

## 1. Confirmed business decision (source: user task instructions, 2026-07-23)

Remove the visible automatic-classification helper sentence from both the single-Task tab and the Bulk Tasks tab of the unified Create dialog. Text only — the underlying automatic Scheduled/Unscheduled classification logic is unchanged and is not surfaced in any other form (no tooltip, aria-label, hidden text, toast, or help popup).

## 2. Ownership found before editing

Both removed sentences shared one CSS class, `msc-field-category-note`, applied alongside the layout-only `msc-form-full` (full grid-column span) class:

- Single-Task tab: `web-view/js/calendar/instance.js` — a `<p class="msc-form-full msc-field-category-note">` between the Title field and the Priority field, inside `.msc-form-grid` (a 2-column CSS grid).
- Bulk Tasks tab: `web-view/js/calendar/instance.js` — a `<p class="msc-form-full msc-field-category-note">` between the common Date field and the (normally-hidden) `msc-bulk-leave-blocked-note`, inside `.msc-bulk-form` (flex/block layout, not a grid).

`grep -rn "msc-field-category-note" web-view/` before editing confirmed exactly these two markup occurrences plus two explanatory code comments referencing the class name — no CSS rule in `web-view/css/calendar.css` targeted `.msc-field-category-note` specifically (only the shared `.msc-form-full { grid-column: 1 / -1; }` rule, which the Notes field also uses and must stay). No JS read, wrote, or toggled this element. Confirmed no dedicated wrapper or reserved-height element existed beyond the `<p>` itself.

## 3. Change made

- Removed both `<p class="msc-form-full msc-field-category-note">...</p>` lines from `web-view/js/calendar/instance.js`.
- Updated the two nearby code comments that referenced `msc-field-category-note` by name (both were stale documentation pointers, not functional code) so they no longer point at a removed element.
- No CSS was removed, because none existed solely for this class (the shared `.msc-form-full` rule is untouched, still used by Notes).
- No other markup, class, id, or JS behavior touched.

## 4. Alignment result (static/structural verification — see §7)

**Single-Task tab** (`.msc-form-grid`, 2-column CSS grid, auto-placed in document order): removing the full-span `<p>` row means Priority/Start time (both normal, non-full-span labels) now immediately follow Date/Title in the grid's row order — no blank grid row is introduced. End time (a normal label) falls into the next row's column 1, directly under Priority's column, preserving "End time aligned under Priority." Notes keeps its own full-span row (unaffected, since its own `msc-form-full` class is separate markup, not shared for removal).

**Bulk Tasks tab** (flex/block `.msc-bulk-form`): `.msc-bulk-date-field` already carries `margin-bottom: 10px`, and `.msc-bulk-rows` carries its own `gap: 12px`/`margin-bottom: 12px`. The removed `<p>` had no dedicated spacing rule of its own, so removing it leaves the existing Date-field margin as the only gap before the first Task row — no reserved blank space remains.

## 5. Functional regression scan

- `grep -rn "msc-field-category-note" web-view/` after editing → no matches (confirmed fully removed, markup and stale comments).
- `grep -rln "assigned automatically based on when" web-view/` after editing → no matches.
- No other code path references `.msc-field-category-note` (only an unrelated `.msc-view-category` selector exists elsewhere, for the Task detail view's category display — untouched).
- Automatic classification (`classify_new_task`), shared bulk timestamp/category, atomic bulk creation, duplicate warnings, and Leave-conflict checking are backend logic, entirely untouched — confirmed by `git diff -- backend/` and `git diff -- database/` both empty (see §6).

## 6. Backend / database proof

```
git diff -- backend/            → (empty)
git diff -- database/           → (empty)
git diff -- database/migrations/ → (empty)
```

Only `web-view/js/calendar/instance.js` changed (5 insertions, 7 deletions — net removal of 2 markup lines plus 2 comment-wording updates).

## 7. Static checks performed

- `node --check web-view/js/calendar/instance.js` → syntax OK.
- CSS brace-balance scan of `web-view/css/calendar.css` → balanced (this file was not edited, checked defensively).
- Duplicate literal-ID scan of `instance.js` → no duplicate static ids; only per-row/per-item template placeholders (`it.id`, `lv.id`), which are expected to repeat as template patterns and are distinct per rendered instance.
- Removed-class reference scan → zero remaining references (see §5).

## 8. Live browser verification — not performed this session

No project run-skill exists for launching/driving this app (`.claude/skills/` has none), and no browser-automation tooling (Playwright/CDP/chromium-cli) is available in this session's environment. The prior `same-day-bulk-task-creation` task used a one-off CDP script for this purpose; that script was not committed to the repo (by design) and was not available here.

Given this is a text-only removal with no backend/CSS/business-logic change, and given the structural/grid-math verification in §4 plus the zero-reference confirmation in §5, the user was asked whether to invest in standing up a full live backend + browser driver (against the real configured Neon database) for this change, and confirmed that static verification is sufficient. Live visual/browser confirmation and disposable-data submission testing were explicitly deferred at the user's direction — not silently skipped.

## 9. PASS / AMBER / FAIL

**PASS on all code-level conditions**: both helper texts removed, no dangling wrapper/CSS, no leftover references, no blank reserved space (by grid/layout math), backend/database/migrations untouched, protected `member-aios/mayurika-hr/staff-data/` path untouched.

**Not independently confirmed in a live browser this session** (user-accepted deferral, §8): pixel-level rendering at each breakpoint, actual console-error absence, and end-to-end disposable Task/Bulk Task submission. Recommend a quick manual look in a real browser before/shortly after deploy, or `/run-skill-generator` if repeat frontend verification is expected going forward.

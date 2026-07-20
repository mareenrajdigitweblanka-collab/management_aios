# Calendar Legend Color Fix — 2026-07-20

**Status: PASS**

## Bug

The "What the labels mean"-style category legend below the mini-calendar
(`.msc-category-legend`, rendered in `web-view/js/calendar/instance.js`)
showed the **Scheduled Task** chip with a white/transparent background
and default body text color, while the Month/Week/Day event chips for
the same category already rendered correctly in green. The
**Unscheduled Task** legend chip rendered correctly (yellow) throughout.

## Investigation

Static review of `web-view/css/calendar.css` showed the `.msc-chip-cat.task`
rule (line 1330) already wired to the correct tokens:

```css
.msc-chip-cat.task {
  background: var(--calendar-scheduled-bg);
  color: var(--calendar-scheduled-text);
}
```

No competing selector, specificity conflict, or duplicate rule was found
by static inspection or by grepping the CSS folder for `.task`/`.followup`
selectors. This did not match a normal "wrong selector" bug, so the app
was launched with a local static server (`python -m http.server`, matching
the pattern used in `validation/calendar-empty-cell-chooser-open-fix-2026-07-20.md`)
and driven with headless Chromium (Playwright) to inspect the **live
parsed CSSOM**, not just the source text.

`document.styleSheets` confirmed the rule was silently dropped by the
browser's CSS parser: `.msc-chip-cat`, `.msc-chip-cat.review`,
`.msc-chip-cat.followup`, and `.msc-chip-cat.planning` were all present
in `cssRules`, but `.msc-chip-cat.task` was **completely absent** —
even though it is present, byte-for-byte correct, in the source file.

## Root Cause

The doc-comment directly above the rule (calendar.css line 1322-1329)
contained a literal `*/` sequence inside its prose, used as a slash
separator between two token names:

```
--calendar-scheduled-*/--calendar-unscheduled-* tokens
```

`*/` is the CSS comment-terminator token. The comment closed early, at
that point, instead of at its intended end on line 1329. Everything from
there — the rest of the intended comment text, the stray real `*/` on
line 1329, and the entire `.msc-chip-cat.task { ... }` rule immediately
after it — was parsed by the browser as one invalid qualified rule and
discarded under standard CSS error recovery. Parsing recovered cleanly
at the next valid rule, `.msc-chip-cat.review { ... }`, which is why
only the Scheduled Task legend chip was affected and every other rule
(including all Month/Week/Day event-chip rules using the same tokens)
was unaffected.

Confirmed via a raw comment-marker count on the file: 41 `/*` vs 42 `*/`
(one unmatched literal `*/`) before the fix; 41/41 after.

## Fix

One-line comment-only edit — no CSS rule, selector, or token was
changed:

```diff
-       --calendar-scheduled-*/--calendar-unscheduled-* tokens
+       --calendar-scheduled-* / --calendar-unscheduled-* tokens
```

Adding a space breaks the literal `*/` token so the comment closes where
intended, letting the browser parse `.msc-chip-cat.task` as written.

**File changed:** `web-view/css/calendar.css` (1 line)
**Selector affected:** `.msc-chip-cat.task`
**Tokens used (unchanged):** `--calendar-scheduled-bg`, `--calendar-scheduled-text` (defined in `web-view/css/tokens.css`)

## Verification (headless Chromium, live computed styles)

| Element | Before | After |
|---|---|---|
| Scheduled Task legend chip | `background-color: rgba(0, 0, 0, 0)`, `color: rgb(30, 41, 59)` (default text, no rule applied) | `background-color: rgb(187, 247, 208)` (`--calendar-scheduled-bg` #bbf7d0), `color: rgb(20, 83, 45)` (`--calendar-scheduled-text` #14532d) |
| Unscheduled Task legend chip | `background-color: rgb(254, 243, 199)`, `color: rgb(120, 53, 15)` | Unchanged — `rgb(254, 243, 199)` / `rgb(120, 53, 15)` |

Re-parsed `cssRules` confirmed all category-color rules present and
correctly wired after the fix, with no other rule dropped or altered:

- `.msc-chip-cat.task`, `.msc-chip-cat.followup`, `.msc-chip-cat.review`, `.msc-chip-cat.planning`
- `.msc-cal-chip.task`, `.msc-cal-chip.followup` (Month view chips)
- `.msc-tg-event.task`, `.msc-tg-event.followup` (Week/Day timed blocks)
- `.msc-tg-allday-chip.task`, `.msc-tg-allday-chip.followup` (Week/Day all-day chips)

Screenshot of the sidebar (`.msc-instance[data-member-key="mayurika"] .msc-sidebar`)
confirms: Scheduled Task legend chip is green, Unscheduled Task legend
chip is yellow, labels remain readable, no layout shift.

Month/Week/Day event chips were not re-checked against live data (no
backend was started — out of scope per task instructions: backend/API/
database untouched). Static confirmation above (all category-color
rules present and correctly wired in the parsed CSSOM, identical to
their pre-fix state except for the previously-dropped `.msc-chip-cat.task`
rule) is sufficient since the fix touched only a comment, not any
selector or declaration used by those rules.

No `console --errors`-equivalent JS errors were observed (Playwright
`requestfailed`/4xx/5xx listeners returned empty on reload).

## Scope confirmation

- Backend changes: NONE
- Database changes: NONE
- API changes: NONE
- Task classification / leave logic / popup logic / calendar click behavior / Schedule Summary: untouched
- `member-aios/mayurika-hr/staff-data/`: untouched, not staged

## Result: PASS

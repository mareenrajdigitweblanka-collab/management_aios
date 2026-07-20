---
name: remove-member-testing-and-technical-ui-closure
type: handover
created: 2026-07-20
created-by: Mareenraj (builder)
status: PASS — local, verified, staged for commit
---

# Handover — Remove Testing/Technical/Clear-Data/Internal-Build UI From All Member Panels (2026-07-20)

## What Was Done

Removed the visible testing-preview banner, its tied testing/local-
backend explanation, the "Clear Testing Data" button and its technical
storage/API explanation, the expandable "Technical details" section,
and the dark internal page footer from all five member panels
(Mayurika, Suman, Arun, Rajiv, Paraparan). Also removed a static
" — Testing Preview" heading suffix found during browser verification
that wasn't in the original item list but clearly belonged to the same
testing-preview messaging. Full detail, per-item evidence, and the
retained/out-of-scope items: `validation/remove-member-testing-and-technical-ui-check-2026-07-20.md`.

## Files changed

| File | What changed |
|---|---|
| `web-view/js/calendar/instance.js` | Removed banner + 2 testing notes + Clear Testing Data button + technical footer + Technical-details `<details>`; removed the now-dead `clearBtn` variable and its click listener |
| `web-view/index.html` | Removed " — Testing Preview" from all 5 member section headings; removed the page-level `<footer class="dashboard-footer">` |
| `web-view/css/calendar.css` | Removed unused `.msc-banner`/`.msc-banner-icon`/`.msc-banner strong` rules |
| `web-view/css/components.css` | Removed unused `.dashboard-footer*` rules (incl. its media query) and `.hr-cal-footer` |
| `web-view/css/tokens.css` | Removed unused `--panel-dark-amber`/`--panel-dark-amber-text` tokens; updated a stale derivation comment (doc-only) |

No other files changed (`git diff --stat` confirmed — exactly these
5).

## Removed UI ownership

All removed markup lived in **one shared factory function**,
`mountScheduleCalendarInstance()` in `web-view/js/calendar/instance.js`
— the same function every one of the 5 `.msc-instance` containers in
`index.html` (`data-member-key="mayurika"/"suman"/"arun"/"rajiv"/"paraparan"`)
is mounted through. One edit to this function applied identically to
all 5 members; no per-member conditionals were added. The page footer
was a single, page-level `<footer>` (not per-member) removed once.

## Retained backend ownership

Nothing under `backend/` or `database/` was touched
(`git diff --stat -- backend/ database/` is empty). The
`DELETE {apiBase}/clear-testing-data` route still exists server-side —
only its frontend caller (the button + click listener) was removed, as
instructed. No clear/delete operation was executed against any stored
data during this task.

## Shared member implementation

Confirmed via `git diff` — the entire change is contained in the
single shared calendar factory plus one shared page footer. No
member-specific HTML/CSS/JS branches were introduced.

## Removed selectors / listeners

| Selector / identifier | What it was | Status |
|---|---|---|
| `.msc-banner`, `.msc-banner-icon` | Testing-preview warning banner | Removed (markup + CSS) |
| `.msc-form-actions` (the one wrapping `.msc-clear-btn`) | Clear Testing Data button wrapper | Removed (markup) |
| `.msc-clear-btn` | Clear Testing Data button | Removed (markup); its `click` listener and the `var clearBtn = container.querySelector(...)` declaration were also removed from `instance.js` |
| `.hr-cal-footer` | Technical storage/API explanation | Removed (markup + CSS) |
| `<details>` (Technical details, no class) | Technical details expandable | Removed (markup) |
| `.dashboard-footer`, `.dashboard-footer-left`, `.dashboard-footer-badge`, `.dashboard-footer-right` | Dark internal page footer | Removed (markup + CSS, incl. its `@media (max-width:640px)` rule) |
| `--panel-dark-amber`, `--panel-dark-amber-text` | CSS tokens only consumed by `.msc-banner` | Removed (now-orphaned) |

**Not removed** (retained, see validation doc §4 for rationale):
`.msc-rajiv-note` (Rajiv's Admin Manager disclaimer — a governance
caveat, not testing messaging), `.msc-priority-list`/"Priority Preview
(Sample/Demo)" card, and the separate "HR/Suman/Arun Testing Tables —
Sample Preview" sections (a distinct feature, not named in the item
list).

## Responsive boundary

Verified clean (no banner/Clear-Data/Technical-details/footer, no
horizontal overflow) at 1920×1080, 1600×900, 1440×900, 1366×768,
1024px, tablet 834px (drawer nav), and mobile 390px (drawer nav) — all
5 members at every breakpoint. See validation doc §16.

## Deployment

**Not yet deployed.** This handover covers the local, verified
change only. Deployment follows the existing Vercel process (auto-
deploy on push to `origin/main`, per the repo's established pattern —
no Vercel CLI or credentials were invoked from this environment).
Once pushed, confirm at `https://management-aios.vercel.app/` that:
the testing banner, Clear Testing Data, Technical details, and the
internal footer are absent; all five member calendars still render;
browser console is clean. This live-production confirmation could not
be performed from this sandboxed environment (no outbound HTTPS to
Vercel/GitHub confirmed available — see §Known limitations) and is the
one next step (below).

## Rollback

Single-purpose commit(s) touching only the 5 files listed above. To
roll back: `git revert <implementation-commit-sha>` (and
`<evidence-commit-sha>` if the docs commit is also to be reverted), or
`git checkout <previous-sha> -- web-view/js/calendar/instance.js web-view/index.html web-view/css/calendar.css web-view/css/components.css web-view/css/tokens.css`
to restore just the frontend files without touching the validation/
handover docs. No backend/database state changed, so no data rollback
is needed.

## Commit hashes

Filled in after commit (see final report). Repo `HEAD` before this
task's edits: `697e821`.

## Known limitations

- `--cal-canvas-height` (`tokens.css`) still reserves its original
  ~300px buffer above the calendar grid, sized for the now-removed
  banner + 2 notes. Actual content above the calendar shrank by
  roughly 150-190px, so the buffer is now conservative — the calendar
  canvas may render marginally shorter than the viewport could allow.
  This is not a visible defect (confirmed via screenshots and the
  7-viewport responsive matrix — no gap, no overflow), just a missed
  tightening opportunity, intentionally left untouched rather than
  guessed at without a dedicated visual A/B pass.
- Playwright's own bundled Chromium could not be downloaded in this
  sandboxed environment (blocked HTTPS download); browser validation
  used the machine's installed system Google Chrome via
  `playwright-core`'s `executablePath` instead — functionally
  equivalent, noted for transparency (same approach used in the prior
  sidebar-polish task).
- Items 9-13 and 16 of the functional-regression checklist (task
  details/`+N more`/Edit/Delete/Cancel-Edit/Search) were not clicked
  live in this pass because they need either a seeded schedule item or
  a live FastAPI backend, which was intentionally not started for this
  frontend-only visible-UI check. Their code paths are outside every
  diff hunk in this change (confirmed via `git diff`).
- Two retained items are flagged for a domain-owner decision, not
  silently resolved: the Rajiv Admin Manager disclaimer, and the HR/
  Suman/Arun "Testing Tables — Sample Preview" sections (see
  validation doc §4).

## One next step

Push this change to `origin/main` (pending user confirmation per this
task's STEP 19) and confirm the live result at
`https://management-aios.vercel.app/` — banner/Clear-Data/Technical-
details/footer absent, all five calendars render, console clean —
since that live check could not be performed from this environment.

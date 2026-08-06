---
name: review-summary-ui-ux-refresh-check
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-UX-005
---

# Review Summary Professional UI/UX Refresh — Implementation Check — 2026-08-06

## Requirement ID

REQ-CAL-REV-UX-005.

## Repository gate

Starting branch `main`, local HEAD 1 commit ahead of `origin/main` (an unpushed, unrelated deployment-evidence commit from the prior REQ-CAL-REV-LOCK-004 deployment session — not behind, no unrelated *tracked* work, protected path and Issues-module paths absent). This work adds new commits on top without touching that prior commit.

## Status wording (exact copy used)

| State | Badge | Message |
|---|---|---|
| Owned, editable | `Editable today` | `Editable today until 11:59 PM (Asia/Colombo).` |
| Owned, locked | `Read-only` | `Read-only — the same-day editing window has ended.` |
| Other reviewer | `Read-only` | `Read-only — only the reviewer who created this summary can edit it.` |

Never implies an Admin override exists (confirmed by an explicit test asserting the other-reviewer message never contains "Admin"). All eligibility comes from the backend-derived `record.can_edit` and `isOwnedRecord()` only — `reviewSummaryStatusInfo()` (`review-summaries.js`) is the single source of truth for both the badge and the message, so they can never disagree with each other or with the actual enforced rule.

## PDF progress wording (exact copy, exported as testable constants)

| State | Copy |
|---|---|
| Button default | `Download PDF` |
| Button while preparing | `Preparing PDF…` |
| Accessible status (in flight) | `Preparing your PDF. The browser save window may take a few seconds to open.` |
| Success (toast) | `PDF ready. Your browser may ask where to save it or save it automatically.` |
| 404 (unchanged) | `No review summaries match the selected filters.` |
| Generic failure (toast) | `The PDF could not be prepared. Please try again.` |

Never claims the app itself controls the browser's save location. Never exposes a backend stack trace or raw status code. The PDF endpoint, its query parameters, and its response handling (401/404/blob/filename) are byte-for-byte unchanged — only the presentation around that same request is new. `setButtonBusy()` (`ui/loading.js`, unmodified, already used elsewhere in this app) supplies the spinner/disabled/`aria-busy` mechanics; a new `aria-live="polite"` paragraph (`.review-summaries-export-status`) supplies the longer explanatory sentence next to the button.

**Testing note:** the exact wording is asserted via three exported constants (`PDF_PREPARING_MESSAGE`, `PDF_SUCCESS_MESSAGE`, `PDF_GENERIC_FAILURE_MESSAGE`) rather than by scraping the rendered toast DOM. `ui/toast.js`'s notification region is a module-level singleton created once and bound to whichever fake document created it first; this repo's hand-rolled test-DOM stand-in (no jsdom dependency available) cannot re-target it across multiple tests in one file run, so DOM-level toast-content assertions are unreliable here regardless of which test writes them (confirmed empirically — the two toast-content tests failed non-deterministically-by-position on first attempt). The constants make the literal approved copy directly, deterministically testable without depending on that pipeline; the same behavioral outcome (button restored, status cleared, correct call made) is still verified via DOM/state assertions.

## Accessibility behavior

- Status badge meaning never depends on color alone — badge text ("Editable today" vs "Read-only") differs, and a leading glyph (● filled / ○ hollow, `aria-hidden="true"`) adds a shape distinction on top of both text and color.
- Card metadata uses `<dl>/<dt>/<dd>` (Reviewed by / Reviewer role / Meeting date), a standard label/value structure understood by assistive technology, instead of the prior single "Label: value" text run.
- Card employee name is an `<h6>` — logical heading hierarchy under the existing `<h2>` workspace title → `<h5>` step titles → `<h6>` card titles (no heading level is skipped relative to what this app already does elsewhere).
- PDF preparing state: `aria-live="polite"` region (`.review-summaries-export-status`) announces without stealing focus; the button itself carries `aria-busy="true"` and native `disabled` (via the existing `setButtonBusy`), both natively announced by assistive tech.
- Every new color pairing reuses this app's existing design tokens (`tokens.css`) and was checked for WCAG AA contrast (4.5:1 normal text) by direct relative-luminance calculation, since no live browser/contrast-checker tool was available in this session:
  - `--pass` (#15803d) on `--pass-bg` (#dcfce7) — the "Editable today" badge: **≈4.57:1**, passes.
  - `--amber` (#b45309) on `--amber-bg` (#fef3c7) — the "Read-only"/locked-message accent: **≈4.51:1**, passes.
  - `--text-secondary` (#44403c) on `--surface`/`--surface-tint-2` — meta values, status message: **≈10:1**, passes comfortably.
  - `--muted` (#78716c) on `--surface` — footer/meta labels/"Updated" label: **≈4.80:1**, passes.
  - The green/amber pairings are the exact same token pairs `staff-data.css`'s pre-existing `.hr-pill-green`/`.hr-pill-amber` pill convention already uses — no new color risk introduced.
- No global dashboard theme change — only `web-view/css/review-summaries.css` was touched.

## Responsive result

Verified by direct CSS/flex-math inspection (no live browser session available — see "Known limitation" below):

- Desktop (>640px): `.review-summaries-toolbar` is one flex row — Reviewer | From | To | Download PDF, export block pinned right via `margin-left: auto`.
- Narrow (≤640px): the existing single breakpoint (`@media (max-width: 640px)`, already used by every other responsive rule in this file) forces, via explicit `nth-child` flex-basis rules on the toolbar's fixed child order: Reviewer full-width (1st child, 100%) → From/To share the next row (2nd/3rd children, ~50% each) → Download PDF full-width (4th child/export group, 100%, button itself `width: 100%`). This matches the required narrow structure exactly.
- `.review-summary-text` uses `white-space: pre-wrap`, `overflow-wrap: break-word` (kept for older engine support) with `overflow-wrap: anywhere` layered on top via `@supports` for modern engines, plus `word-break: break-word` — an unbroken long token (e.g. a URL with no spaces) wraps inside the card rather than causing horizontal overflow.
- No fixed pixel widths were introduced anywhere in the new CSS that could force horizontal scroll at 390px or at 200% zoom (all new layout uses `flex`/`gap`/relative units on top of the existing token scale).
- Card header uses `flex-wrap: wrap` so the status badge drops below the employee name rather than overlapping it if the two don't fit on one line at narrow widths.

## Known limitation — visual/browser validation not performed

No browser or screenshot tool was available in this environment/session. Phase 11's fabricated-data visual inspection (editable/locked/other-reviewer cards, long multi-paragraph summary, long-URL summary, PDF preparing/success/failure states, desktop/mobile/200%-zoom layouts, keyboard focus flow) was **not** performed against an actual rendered page. What this report instead provides, as a substitute:

- Full DOM-structure and exact-copy verification via the automated test suite (below) — proves every element/class/text this design specifies actually renders in the real code path (`mountReviewSummariesWorkspace` → `renderHistoryCard`/toolbar building), using the project's existing hand-rolled DOM test stand-in.
- Direct CSS reasoning for the responsive breakpoint (above) and contrast-ratio calculation (above).

**Recommended before this is considered fully closed:** open `web-view/index.html` in a real browser (or the project's own `run` workflow, if one exists) at the desktop/≈768px/≈390px/200%-zoom checkpoints and visually confirm the layout — this is the one item this report cannot itself certify.

## Test totals (literal, this session)

| Suite | Result |
|---|---|
| `web-view/js/review-summaries.test.mjs` (targeted — was 107 before this task) | 115 passed, 0 failed |
| `web-view/js/navigation-structure.test.mjs` | 16 passed, 0 failed |
| `web-view/js/calendar/*.test.mjs` | 179 passed, 0 failed |

Backend tests were not run — zero backend files changed (see below), consistent with the instruction that backend tests are only required if a backend file unexpectedly changes.

No new test failure. No navigation regression. No PDF functional regression (endpoint/params/filename/content untouched — confirmed by `git diff` touching neither `backend/review_summary_pdf_export.py` nor the export route). No edit-lock regression (`can_edit`/ownership logic untouched — `reviewSummaryStatusInfo()` only reads those existing values, never recomputes them). No Delete-control regression (0 Delete buttons, 0 Delete modals, 0 DELETE requests — same as before this task, re-verified by the existing and new tests).

## Files changed

`web-view/js/review-summaries.js`, `web-view/js/review-summaries.test.mjs`, `web-view/css/review-summaries.css`. `web-view/index.html` was **not** modified — the accessible PDF-progress status region is built the same way every other dynamic element in this workspace already is (via `mountReviewSummariesWorkspace`'s `el()`/`appendChild` pattern), so no static markup addition was needed.

## Backend files changed

0.

## Database/schema changes

0.

## Production writes

0. This is a presentation-only change; no request behavior, authorization check, or database interaction was altered. All test coverage runs against the existing hand-rolled fetch-mock/DOM stand-in — no live backend or database connection was made this session.

## Production records changed

0.

## Protected path

`member-aios/mayurika-hr/staff-data/` — not opened, not referenced, not touched.

## Unrelated work excluded

- Issues module / `varman_aios.issues` / issue-tracker frontend — not present in this diff.
- `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` — pre-existing, unrelated, untracked; not opened or staged.
- An unrelated, pre-existing uncommitted change to `.env.example` (adds one placeholder `CALENDAR_AUTH_TOKEN_HASH_MD` line, no secret value) was found on disk at the start of this session, not created by this task — left untouched and not staged.
- Attachment upload functionality — not implemented (out of scope).
- PDF redesign — not touched (`backend/review_summary_pdf_export.py` unmodified).

## Verdict

**PASS**, with the one documented limitation above (no live-browser visual confirmation was possible in this session — static/structural verification substitutes for it).

## Next step

A Management Team member (or the repository owner) opens the Review Summaries tab in a real browser at desktop, ≈768px, ≈390px, and 200% zoom to visually confirm the layout described in this report before treating Phase 11 as fully closed.

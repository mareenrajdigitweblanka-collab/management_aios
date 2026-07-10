---
name: dashboard-tab-removal-and-file-map-check
type: validation
created: 2026-07-10
created-by: Mareenraj (builder)
status: PASS
---

# Validation — Dashboard Tab Removal and File Map Alignment (2026-07-10)

## A. Requirement

Completely remove 8 dashboard tabs (Skills Register, Handover Preview, Overview, Recurring Issues,
Blocked/Gated Modules, Review Queue, Markdown Viewer, Document Register) from `web-view/index.html` —
navigation, panels, exclusive CSS, and stale cross-references — without hiding them via CSS, without deleting
underlying repository files, and without touching the 6 retained tabs (Root AIOS, Mayurika HR, Suman
Recruitment, Arun Implementation, Rajiv/Admin, File Map), member content, calendars, or backend/API code.
Then update the File Map tab to reflect the reduced structure.

## B. Tabs Removed (nav + panel + badge)

| Tab | data-tab | Nav badge removed |
|---|---|---|
| Review Queue | `review-queue` | (none) |
| Markdown Viewer | `md-viewer` | `tab-badge-info` "6 Files" |
| Document Register | `doc-register` | `tab-badge-preview` "PREVIEW" |
| Skills Register | `skills-register` | `tab-badge-preview` "PREVIEW" |
| Handover Preview | `handover-preview` | `tab-badge-preview` "PREVIEW" |
| Overview | `overview-preview` | `tab-badge-preview` "PREVIEW" |
| Recurring Issues | `recurring-issues` | `tab-badge-preview` "PREVIEW" |
| Blocked / Gated Modules | `gated-modules` | `tab-badge-blocked` "6 Locked" |

## C. Navigation Elements Removed

All 8 corresponding `<button class="tab-btn" data-tab="...">` entries removed from the `<nav class="tab-bar">`
block. Confirmed via `grep 'class="tab-btn'` — exactly 6 buttons remain (root-aios, mayurika-hr,
suman-recruitment, arun-implementation, rajiv-blocked, file-map).

## D. Panel Elements Removed

All 8 corresponding `<div class="tab-panel" id="tab-...">...</div>` blocks removed in full (from comment
header through closing `</div><!-- /tab-xxx -->`), including all nested content (cards, tables, `how-to-box`
sections, `data-searchable` entries). Confirmed via `grep '<!-- /tab-'` — exactly 6 panel-close comments
remain (root-aios, mayurika-hr, suman-recruitment, arun-implementation, rajiv-blocked, file-map). No empty
placeholder `<div class="tab-panel">` remains for any removed tab.

## E. JavaScript / Search References Removed

- No dedicated JS existed for any of the 8 tabs (confirmed by pre-edit dependency mapping) — the tab
  activation function (`activateTab()`, in the script block near the end of the file) is fully generic: it
  drives off live `document.querySelectorAll('.tab-btn')` / `.tab-panel'` with no hardcoded tab-id
  switch/case or array. No code changes were required or made to this function.
- Search (`doSearch()`) is fully dynamic — it scans `document.querySelectorAll('[data-searchable]')` at
  call time with no static index array. Removing the 8 panels automatically removed their `data-searchable`
  elements from the DOM; no separate search-index code change was needed or made.
- The `[data-goto]` handler and all 4 `.msc-instance` calendar mounts were confirmed to target only retained
  tabs (mayurika-hr, suman-recruitment, arun-implementation, rajiv-blocked) both before and after the edit —
  unaffected.
- Post-edit: both remaining `<script>` blocks were parsed with Node (`new Function(script)`) — both parse
  without syntax errors.

## F. Exclusive CSS Removed

Verified each class had zero remaining HTML usage after panel removal (via `grep`) before deleting its CSS
rule:

- `.review-table` (+ th/td/nth-child/hover variants) and `.mono` — shared only across the removed-tab group.
- `.amber-list`, `.amber-item` (+ hover/title/body/action variants) — Review Queue only.
- `.scope-box` (+ h4/ul/li::before/p variants) — Recurring Issues only.
- `.tab-badge-draft`, `.tab-badge-blocked`, `.tab-badge-info`, `.tab-badge-preview` — nav-badge classes used
  only by removed tabs' badges (kept `.tab-badge-amber` and `.tab-badge-active`, both still used by retained
  tabs' nav badges).
- `.md-card-path`, `.md-card-check` (+ strong), `.md-card-meta`, `.md-viewonly-notice` — Markdown Viewer only.
- `.handover-summary-grid`, `.hov-card` (+ all `-pass/-amber/-blocked/-verify/-meta/-label/-number/-desc`
  variants), `.hov-amber-notice` — Handover Preview only, including its one exclusive rule inside the shared
  `@media (max-width:640px)` block (the block itself, and its other rules for `.dashboard-footer`,
  `.safety-strip`, `.topbar-right`, `.topbar-logo::before`, were kept — those are shared/global).

**Deliberately retained (shared with retained tabs, confirmed via cross-check):** `.cards` (used in
rajiv-blocked), `badge-blocked`/`badge-amber`/`badge-draft`/`badge-pass`/`badge-source` (generic card-level
badge classes, distinct from the removed `tab-badge-*` nav classes, used throughout retained tabs and File
Map), `.warning-box`, `.card`, `.status-bar`, `.details-body`, `.file-map-section`, `.file-list-box`,
`.how-to-box`, `.next-step-box` — none of these were touched.

Post-edit check: `style` block brace count is balanced (323 open / 323 close). Both `<script>` blocks parse
without error under Node.

## G. Final Retained Tabs

Confirmed exactly 6, in order: Root AIOS, Mayurika HR, Suman Recruitment, Arun Implementation, Rajiv / Admin,
File Map. Verified via `grep 'class="tab-btn'` and `grep 'class="tab-panel'` (6 matches each, ids
root-aios/mayurika-hr/suman-recruitment/arun-implementation/rajiv-blocked/file-map).

## H. File Map Changes

- Added an explicit note to the intro: *"The File Map lists relevant repository assets. Not every file or
  function has a dedicated dashboard tab."* — plus a sentence stating the 2026-07-10 tab reduction did not
  delete or invalidate the underlying repository files those tabs referenced.
- Added a new "Dashboard Structure — Remaining Tabs" section listing all 6 retained tabs, what each shows,
  and its backing workbench folder, distinguishing dashboard-visible sections from source files, and noting
  evidence/validation/context files exist independently of any dashboard tab.
- Corrected the stale `rajiv-admin-manager/` entry (previously: `BLOCKED` badge, "Not created — awaiting
  SRC-ADMIN-001") to `rajiv-admin/` with an `ACTIVE WITH LIMITS` badge and file entries for WORKBENCH.md,
  quick-reference-sources.md, governance-framework-draft-map.md, admin-manager-responsibility-map-draft.md,
  admin-manager-query-pack-draft.md, and the SRC-ADMIN-001 confirmation evidence file — all described as
  REGISTERED / VERSION 1.0 WORKING DRAFT / PARTLY APPROVED, PARTLY DRAFT, not parent-AIOS truth.
- No file counts were invented — the only counts touched were the removed nav badges ("6 Files", "6 Locked",
  "PREVIEW") which were deleted along with their tabs; no new counts were fabricated for File Map content.
- No wording anywhere claims the dashboard testing/sample schedule calendars are official HR/Admin truth —
  none was added, and the existing Rajiv testing-preview disclaimer block (`msc-instance` section) was left
  untouched.

## I. Source Files Not Deleted

No files were deleted from the repository. Only HTML/CSS content inside `web-view/index.html` was removed.
All referenced repository files (e.g., `member-aios/rajiv-admin/*.md`, evidence/validation files previously
described in the removed Handover Preview / Skills Register / Document Register panels) remain on disk,
untouched by this task (only `web-view/index.html` and this validation file were in the allowed-edit list).

## J. Member-Tab Content Changed

None. Mayurika HR, Suman Recruitment, and Arun Implementation panels were not opened for edits. Rajiv/Admin
panel content (introduction, workbench files, day-to-day cards, schedule calendar) was not modified in this
task — only its File Map *entry* (a separate section) was corrected, per the explicit "Rajiv File Map entries
reflect current registered-but-limited status" requirement.

## K. Calendar / FastAPI Code Changed

None. All 4 `.msc-instance` mount points (mayurika, suman, arun, rajiv) and both `<script>` blocks
(tab-activation/search, and the schedule-calendar factory `mountScheduleCalendarInstance` /
`initAllScheduleCalendars`) are unchanged except for the removal of nothing — no code in either script
referenced any of the 8 removed tabs, so zero lines of script logic were touched.

## L. Rajiv Status Unchanged

Nav badge remains `tab-badge-amber` "ACTIVE WITH LIMITS"; Rajiv tab introduction, workbench file list, and
day-to-day cards (as aligned in the prior 2026-07-10 task) are unchanged. The only Rajiv-related edit in this
task was to the separate File Map entry, updated to match the same registered-but-limited status.

## M. Parent-Truth / Boundary Preservation

No source was promoted to parent-AIOS truth. No `[VERIFY]` item was closed. `evidence/source-register.md`,
`context/verify-register.md`, and `CLAUDE.md` were not opened or edited. No `member-aios/` files were edited.
No backend, FastAPI, database, or deployment file was opened or edited.

## N. Stale References Remaining

One intentional historical note remains in the Root AIOS panel's "Evidence / Technical Details" changelog
(originally referenced "Blocked/Gated Modules tab added..."); it was rewritten to state that the preview-only
tabs (naming all 8) were removed from navigation on 2026-07-10 and that their underlying repository files were
not deleted. This is a deliberate historical/changelog record, not a live nav/panel reference, and is
documented here per the verification instructions. No other occurrence of the 8 removed tab labels remains
anywhere in the file.

## O. Files Changed

- `web-view/index.html` — modified (2,214 lines touched: 66 insertions, 2,148 deletions per `git diff --stat`).
- `validation/dashboard-tab-removal-and-file-map-check-2026-07-10.md` — created (this file).

## P. Git Status

```
M web-view/index.html
```
(plus this new untracked validation file). Working tree otherwise clean before this task began.

## Q. Commit / Push

**NONE.** No `git add`, `git commit`, or `git push` was run.

## R. Pass/Fail Rule

**PASS** if: exactly 6 tabs remain (nav + panels); no removed tab is hidden via CSS (display:none etc. — none
was added, panels were deleted outright); no exclusive CSS orphaned; no underlying repository file deleted;
no member-tab content changed; no calendar/FastAPI logic changed; File Map accurately reflects the 6-tab
structure and correct Rajiv status without inventing counts or claiming parent-AIOS truth; no commit/push.

**FAIL** if any of the above is violated.

## S. Verdict

**PASS**

---
name: bulk-tasks-modal-scroll-and-first-row-alignment-handover
type: handover
scope: management_aios calendar Create dialog — Bulk Tasks modal scroll/header/heading fix (frontend only)
created: 2026-07-24
status: PASS — fix shipped and live-verified; no backend/API/database change
owner: builder (Mareen), per screenshot-derived defect report in this task's instructions
reviewer: pending
---

# Bulk Tasks Modal Scroll and First-Row Alignment — Handover — 2026-07-24

## 1. What this task was

A user-supplied screenshot showed the Bulk Tasks tab (in the unified Task/Bulk Tasks/Leave Create dialog) rendering with its title and Close button visible, but the tabs and the top of TASK 1 (including its Date label) clipped/hidden beneath the modal header, with TASK 2 rendering normally further down. The task required inspecting the DOM/CSS/JS first (no assumed cause), fixing the actual scroll/layout ownership bug, and proving no regression to Bulk Tasks' existing behavior, the Task/Leave tabs, or the backend/API/database.

## 2. Verified root cause

`.msc-modal-form` (the dialog card) is the single `overflow-y:auto` scroll container, and `.msc-modal-form-head` (title + Close button) is `position:sticky; top:0` **inside that same element**. Nothing reset that element's `scrollTop` to `0` on dialog open or on Task/Bulk Tasks/Leave tab switch, so a scroll position left over from a previous tab/session carried forward — at a nonzero `scrollTop`, the sticky header visually pins itself over whatever content now sits at that same offset in the freshly-shown tab, exactly reproducing the screenshot. A second, independent defect was also found: the Bulk Tasks tab rendered its own static "Create multiple tasks" heading (`.hr-table-title`), duplicating the sticky dialog header's own heading text whenever that tab is active.

Full root-cause trace, fix rationale, and verification detail: `validation/same-day-bulk-task-creation-check-2026-07-23.md` §23.

## 3. Files changed

| File | Change |
|---|---|
| `web-view/js/calendar/instance.js` | Added `createPopupCard` ref and `resetCreatePopupScroll()`, called from `setCreateDialogTab()` (covers every open + every tab switch from one place) and again in `openCreatePopup()` as a belt-and-braces re-assertion after `.show` is applied. Removed the Bulk Tasks tab's duplicate static `.hr-table-title` "Create multiple tasks" heading. |
| `web-view/css/calendar.css` | Added `scroll-padding-top: 44px` to `.msc-modal-form`, sized to the sticky header's own rendered box, so native focus-driven scroll-into-view (`focusFirstInvalid()`) always lands a target fully below the sticky header. |

No file under `backend/`, `database/`, or `database/migrations/` was touched. `member-aios/mayurika-hr/staff-data/` (protected) was not touched — confirmed untracked/unmodified before and after this task.

## 4. Test results

- `node --check web-view/js/calendar/instance.js` — pass.
- CSS brace-balance check on `web-view/css/calendar.css` — 375 open / 375 close, balanced.
- `python -m unittest discover -s backend/tests` — 234/234 passed (pre-existing suite; this task made no backend change, run only to reconfirm zero regression from an unrelated frontend edit).
- `git diff -- backend/ database/ database/migrations/` — all empty.

## 5. Live verification performed this session

Backend + static frontend served locally (`python -m uvicorn backend.main:app --port 8000`, `python -m http.server 8081 --directory web-view`) against the real configured Neon database. Playwright (`playwright-core`, driving the machine's already-installed Chrome — the Playwright-bundled Chromium download was unreachable from this environment) was installed into a scratch/temp directory for this session only, not committed to the repo.

Verified, each screenshot-confirmed:
- A forced stale `scrollTop` (400) before switching Task → Bulk Tasks resets to `0` on switch; only one "Create multiple tasks" heading renders; TASK 1 sits entirely below the header and tabs, no overlap.
- Bulk → Task → Bulk cycling keeps `scrollTop === 0`.
- Close (with a forced stale scroll of 500) → reopen directly onto Bulk Tasks resets to `0`.
- Main `+ Create` entry opens at the top with the complete TASK 1 card visible.
- Calendar date-cell entry (clicking 2026-07-28) correctly seeds the first row's Date with the clicked date.
- A real validation error on a row scrolled out of view (row 5 of 6, invalid time range) receives focus fully below the sticky header (`top≈282px` vs. header bottom `≈102px`).
- The duplicate-confirmation "Go back and review" path returns to a fully-visible, correctly-scrolled-to-top warned row.
- TASK 1 and later rows are visually identical (same markup, no special-cased offsets).
- 1600×900, 1366×768, 1024×900, and 390×844 (mobile) all show no horizontal overflow and a fully visible dialog; a standards-correct 200%-zoom-equivalent viewport (800×450 @ `deviceScaleFactor:2`) shows the header, Close button, and TASK 1 fully visible.
- The only browser console message across every run was an unrelated, pre-existing `favicon.ico` 404 (no favicon file is served by `web-view/`).
- Exactly one `POST .../bulk` call occurred during the whole session (the duplicate-warning test) and it returned `409` (duplicate_confirmation_required) — zero rows were ever created; no test-data cleanup was required.

No pre-existing data for any member was read destructively, modified, or left behind by this verification.

## 6. Database / migration proof

```text
git diff -- database/            → (empty)
git diff -- database/migrations/ → (empty)
```

Confirmed NONE: new table, new column, new constraint, historical data update.

## 7. Business-rule changes

NONE. Per-row Date/copy-on-add, 30-row cap, blank-row ignoring, all-or-nothing creation, duplicate warnings, row-level errors, Leave validation, automatic classification, the shared authoritative batch timestamp, and the Task/Leave tabs are all reused unmodified.

## 8. Known limitations

- No project run-skill exists yet for browser-driven verification of this app; Playwright was installed into a scratch directory for this session only (not committed). Recommend `/run-skill-generator` if frontend verification will be needed again.
- An initial zoom-emulation attempt using `document.documentElement.style.zoom = '2'` produced a misleading clipped-title screenshot — a known limitation of that specific technique in headless Chromium, not a real defect; re-verified with a standards-correct viewport+`deviceScaleFactor` zoom emulation, which passed.
- The `scroll-padding-top: 44px` value is derived from the sticky header's current rendered height; it should be revisited if that header's own height changes in a future task.

## 9. Outstanding before this is "done"

- User review of the diff (2 frontend files) before commit/push.
- Vercel deployment verification after push (this fix is frontend-only static assets; the FastAPI backend deployment is unaffected).

## 10. Reviewer routing

Per CLAUDE.md §18: this is calendar/Task tooling UI, not an HR/KPI/recruitment/admin-authority domain change — no specific Management Team reviewer is mandated by that table. Standard code review applies.

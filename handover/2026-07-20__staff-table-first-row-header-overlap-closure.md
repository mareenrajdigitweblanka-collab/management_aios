# Handover — Staff Table First-Row / Header Overlap Closure

**Date:** 2026-07-20
**Type:** Frontend bug fix (CSS-only)

---

## Files changed

- `web-view/css/staff-data.css` — 1 rule modified (added `background: var(--surface-tint-4);` to `.staff-table thead th:first-child`). +11/-0 lines (comment + 1 declaration).

## Files created

- `validation/staff-table-first-row-header-overlap-check-2026-07-20.md`
- `handover/2026-07-20__staff-table-first-row-header-overlap-closure.md` (this file)

## Shared table ownership

All three affected panels (Staff Data, Arun, Paraparan) render their staff table through one shared controller: `mountStaffTableView()` in `web-view/js/staff-data.js`, styled by the shared `.staff-table` rule set in `web-view/css/staff-data.css`. This fix touches exactly one shared selector (`.staff-table thead th:first-child`) — no panel-specific CSS was added, and none was needed, because the three panels use identical markup/classes.

## Root cause (one line)

The header's first (`Employee`) cell inherited `background: inherit` from the higher-specificity sticky-left-column rule (`.staff-table th:first-child`), making it transparent — the only header cell without an opaque background — so scrolled row content (name / preferred name / employee number, which live in that same first column) visually showed through it.

## CSS variable / offset used

`--surface-tint-4` (existing token, `tokens.css`) — the same value every other header cell already uses. No new variable, no hardcoded/magic value, no offset math was needed; this was a missing-background bug, not a geometry/offset bug.

## Deployment result

Not yet pushed/deployed as of writing this handover — see commit hash and rollback below for local state. Deploy is via the existing Vercel Git-integration process (push to `main` triggers it); no manual `vercel deploy` was run from this environment.

## Commit hash

See `git log -1` after the commit step in this same session. (Recorded here at commit time; if this file is read before that commit lands, no commit hash exists yet for this change.)

## Rollback

Single-file, single-rule change. To roll back: revert the one hunk in `web-view/css/staff-data.css` that adds `background: var(--surface-tint-4);` to `.staff-table thead th:first-child` (or `git revert` the commit). No data migration, no other file touched, nothing else depends on this change.

## Known limitations

1. Validated against a local static server with a **mocked** Staff API (synthetic `VALTEST-####` records), not the live deployed app with real backend/database — per CLAUDE.md §6/§13 (no connection to live HR systems from this environment). See validation doc §11/§13 for full detail.
2. No headless-browser tooling was preinstalled in this environment; validation used `playwright-core` driving the machine's already-installed Google Chrome rather than a project-standard browser-automation setup. If this project wants repeatable browser-driven validation going forward, running `/run-skill-generator` to capture a working driver as a project skill is recommended (flagged per the `run` skill's own guidance).
3. Tablet-width and the full 1600/1440/1366 viewport matrix from the task brief were not individually screenshotted — the fix is a `background-color` value with no layout/breakpoint dependency, and the mobile breakpoint hides the header entirely, so this is a low-risk gap, not a skipped functional check.

## One next step

After this deploys, spot-check the real `https://management-aios.vercel.app/` Staff Data / Arun / Paraparan tabs with real data and a normal browser scroll — confirm the first row is visible below the header there too, closing out the limitation noted above.

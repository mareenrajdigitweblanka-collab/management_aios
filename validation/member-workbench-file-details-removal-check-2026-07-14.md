---
name: member-workbench-file-details-removal-check
type: validation
created: 2026-07-14
created-by: Mareenraj (builder)
status: PENDING LIVE VERIFICATION
---

# Member Workbench File Details Removal Validation

## Requirement

Remove the main Workbench File Details sections from the user-facing Mayurika, Suman, Arun, and Rajiv member tabs while preserving underlying repository assets and all operational content.

## Scope

Changed:

- web-view/index.html

Removed:

- Mayurika Workbench File Details block
- Suman Workbench File Details block
- Arun Workbench File Details block
- Rajiv Workbench File Details block

Retained:

- Suman Workbench Usage Guide table
- Arun Workbench Usage Guide table
- Root Member Workbenches tile
- Root member-aios file-map appendix
- actual member-aios Markdown files
- testing/sample tables
- efficiency cards
- calendars
- Staff Data
- PH KPI logic

## Evidence

- **Base commit:** 866cb90
- **Final commit:** PENDING — to be recorded after Step 6 commit
- **Diff:** 0 insertions / 156 deletions, 1 file changed (`web-view/index.html`), four bounded deletion hunks only (confirmed via `git diff -- web-view/index.html`)
- **Structural tag balance:**
  - div: 400 / 400
  - table: 15 / 15
  - details: 17 / 17
  - malformed HTML: NO

**Search results confirming the four target headings are absent** (`grep` against `web-view/index.html`, 0 matches for all of):

- `Files Mayurika uses`
- `Files Suman uses`
- `Files Arun uses`
- `Rajiv Workbench Files — Registered Source, Mixed Status`
- `Workbench File Details`

**Search results confirming retained content remains** (line numbers as of this check):

| String | Line | Present |
|---|---|---|
| `Member Workbenches` (root status tile) | 3480 | YES |
| `HR Testing Tables — Sample Preview` | 3666 / 3670 | YES |
| `Mayurika Schedule Calendar — Testing Preview` | 3932 | YES |
| `Suman Testing Tables — Sample Preview` | 3964 / 3968 | YES |
| `Table 4 — Suman Workbench Usage Guide` | 4141 | YES |
| `Suman Schedule Calendar — Testing Preview` | 4181 | YES |
| `Arun Testing Tables — Sample Preview` | 4214 / 4218 | YES |
| `Table 4 — Arun Workbench Usage Guide` | 4383 | YES |
| `Arun Schedule Calendar — Testing Preview` | 4430 | YES |
| `Useful for Day-to-Day Work` (Rajiv) | 4479 | YES |
| `Rajiv Schedule Calendar — Testing Preview` | 4534 | YES |
| `Paraparan Schedule Calendar — Testing Preview` | 4619 | YES (unaffected tab) |
| `member-aios/ — Member Workbenches` (root file-map appendix) | 4697 | YES |

**Protected untracked folder excluded:** `member-aios/mayurika-hr/staff-data/` — confirmed untracked (`??`) before and after this change; not read, edited, staged, or referenced in any evidence gathering beyond confirming its status line.

## Validation Result

PASS only if:

- exactly one implementation file changed — CONFIRMED (`web-view/index.html` only)
- all four target sections are absent — CONFIRMED
- retained content remains — CONFIRMED
- no protected or unrelated files are included — CONFIRMED
- live deployment verification passes — PENDING

## Known Limit

No local browser preview command was documented in the repository. Pre-deployment verification used structural and textual inspection. Final visual confirmation must be completed on the live deployment.

## Review

- Coordinator: required
- Queryability: confirm underlying files remain
- Technical: confirm HTML structure and diff
- Business: confirm user-facing cleanup

## Status

PENDING LIVE VERIFICATION

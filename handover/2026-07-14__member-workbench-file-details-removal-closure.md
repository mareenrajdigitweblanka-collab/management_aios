---
name: member-workbench-file-details-removal-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: member-workbench-file-details-removal
status: PENDING LIVE VERIFICATION
---

# Handover Closure — Member Workbench File Details Removal

**Closure date:** 2026-07-14

## Requirement

Remove the user-facing "Workbench File Details" section from the four member tabs (Mayurika HR, Suman Recruitment, Arun Implementation, Rajiv / Admin) in the dashboard, without deleting, editing, or reinterpreting any real `member-aios/` file, and without touching unrelated dashboard content (testing tables, efficiency cards, calendars, Staff Data, PH KPI logic, status badges, root file-map/status content).

## Asset Path

`web-view/index.html` — the single static HTML dashboard file. No other file required editing to satisfy the requirement (no shared JS renderer exists; each tab's block was independent, static, duplicated markup).

## Validation Evidence Path

`validation/member-workbench-file-details-removal-check-2026-07-14.md`

## Protected Unrelated Folder

`member-aios/mayurika-hr/staff-data/` — pre-existing untracked folder, out of scope for this task. Confirmed untracked before this task, not edited, not staged, not committed, not included in any evidence file.

## Implementation Result

- 1 file changed: `web-view/index.html`
- 0 insertions / 156 deletions
- Four bounded deletion hunks — one per member tab (Mayurika, Suman, Arun, Rajiv)
- Structural balance: div 400/400, table 15/15, details 17/17
- Malformed HTML: NO

## Retained Content

- Table 4 — Suman Workbench Usage Guide
- Table 4 — Arun Workbench Usage Guide
- Root "Member Workbenches" status tile
- Root `member-aios/ — Member Workbenches` file-map appendix
- All actual `member-aios/*/WORKBENCH.md`, `quick-reference-sources.md`, and related Markdown files (untouched on disk)
- HR / Suman / Arun Testing Tables — Sample Preview sections
- Rajiv "Useful for Day-to-Day Work" efficiency cards
- All four member schedule calendars, plus Paraparan's (unaffected tab)
- Staff Data, PH KPI pilot mounts/logic, member descriptions and status badges

## Commit Hash

PENDING — to be recorded after Step 6 commit.

## Deployment Result

PENDING.

## Live Verification Result

PENDING.

## Queryability Result

PENDING — to be confirmed once live verification is complete (underlying `member-aios/` files must remain independently queryable regardless of dashboard display changes).

## Blocker Status

None. This is a UI-only cleanup; no `[VERIFY]` item, source registration, or backend logic is affected.

## Next Step

Proceed with commit, push, deployment, and live verification (Steps 5–9 of this task); update this file and the validation file with final results.

## PASS/FAIL

PENDING LIVE VERIFICATION

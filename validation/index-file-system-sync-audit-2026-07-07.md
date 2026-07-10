# Index.html File-System Sync Audit — 2026-07-07

## Audit Date

2026-07-07

## Scope

This is a **read-only synchronization audit only**. No file other than this report was created or modified. The audit checked whether `web-view/index.html` accurately reflects current file-system truth across the following areas:

1. Source register count / status vs. `evidence/source-register.md`
2. [VERIFY] item count / status vs. `context/verify-register.md`
3. Mayurika HR workbench status, source count, latest confirmation ID
4. Suman recruitment workbench status and candidate-source handling
5. Arun implementation workbench status, ACTIVE claim, PH live-report AMBER accuracy
6. Rajiv/Admin workbench existence and blocked-state naming
7. HR schedule pilot scope, status, sign-off state, open-question count
8. Latest validation/handover state vs. what index.html surfaces
9. Git branch/commit/date shown in index.html vs. actual repo state
10. Duplicate/parent-truth risk (full source tables reproduced inline vs. summarized)

No `[VERIFY]` item was resolved, evaluated for resolution, or altered. No file listed under "Files intentionally untouched" was edited.

## Files Inspected

- `web-view/index.html` (read via targeted Grep + Read, file is 7,233 lines / ~357KB)
- `evidence/source-register.md` (full read)
- `context/verify-register.md` (full read)
- `member-aios/mayurika-hr/WORKBENCH.md` (full read)
- `member-aios/mayurika-hr/quick-reference-sources.md` (full read)
- `member-aios/suman-recruitment/WORKBENCH.md` (full read)
- `member-aios/arun-implementation/WORKBENCH.md` (full read)
- `evidence/stakeholder-confirmations/hr-schedule-pilot-confirmation-request-2026-07-06.md` (full read)
- `evidence/stakeholder-confirmations/hr-schedule-pilot-role-desk-calendar-ui-signoff-request-2026-07-07.md` (full read)
- `validation/hr-schedule-pilot-role-desk-calendar-ui-match-check-2026-07-07.md` (full read)
- `schedules/hr/` directory listing
- `handover/` directory listing (by modified date)
- `validation/` directory listing (sorted by modified date)
- Glob searches: `member-aios/mayurika-hr/**`, `member-aios/suman-recruitment/**`, `member-aios/arun-implementation/**`, `member-aios/rajiv*/**`, `**/rajiv*`
- `git log --oneline -10`, `git log --oneline -- web-view/index.html`, `git branch --show-current`, `git status --short`, `git show -s --format=%ci` (for commit 98644e2 and HEAD)

## Current Branch

`individual-aios` — matches the branch name shown in `index.html` (topbar line 2077, footer line 7156, line 2493). No mismatch on branch name.

## Latest Commit Hash

`91e70e8` (HEAD, "Request HR schedule calendar UI sign-off"). `index.html` displays commit `98644e2` (topbar line 2080; landing hero line 2188) with date `2026-07-06`. `98644e2` is **13 commits behind HEAD** and dated 2026-07-06 15:59:15 — HEAD is dated 2026-07-07 11:36:07. Notably, `index.html` itself was modified by at least 5 of those 13 later commits (`ad7f3ab`, `3cb4d48`, `ec6354b`, `63572b8`, `99c35c1`, `a31718b`, `542d800` all touch `web-view/index.html` per `git log -- web-view/index.html`), so the file's own visible content (e.g., the Role Desk month-view calendar, validation file `hr-schedule-pilot-role-desk-calendar-ui-match-check-2026-07-07.md` referenced at line 3804) is newer than the commit hash/date the file displays about itself.

## Sync Table

| # | Area | File-system truth | index.html display | Sync result | Fix needed |
|---|------|--------------------|---------------------|--------------|------------|
| 1 | Source register count | `evidence/source-register.md` Source Count Summary: TOTAL = **40** (14 READY-Full, 2 SUPERSEDED, 2 PENDING, 1 ACTIVE FOLDER STANDARD, 1 READY-HR-Confirmed, 21 READY-Confirmation Sources, 1 ACTIVE). Last real register edit 2026-07-07 (SRC-MAYU-CONF-007–020 batch). | "Sources Registered: **26**" (lines 2400-2402, 6580-6582); Document Register row says "26 sources registered" (line 5798) dated 2026-06-30 | **MISMATCH — STALE** | Update all three "26" occurrences to 40 (or a maintained live count) and refresh the "Last Updated: 2026-06-30" stamp on the source-register document-register row |
| 2 | [VERIFY] item count | `context/verify-register.md`: 9 open, 5 resolved, 14 total, last-updated 2026-06-30, PASS result | "9 open" shown consistently everywhere checked (status bar, landing hero, Document Register, Overview tab, Handover Preview) | **MATCH** | None |
| 3 | Mayurika workbench status | `WORKBENCH.md` frontmatter: `status: ACTIVE — Mayurika Reviewed 2026-07-03`; source-boundary lists only `SRC-MAYU-CONF-002 through CONF-006` (does not include CONF-007–020, registered 2026-07-07); `quick-reference-sources.md` line 62 says "context/verify-register.md — All **12** open [VERIFY] items" (stale — should be 9) | index.html shows "ACTIVE — Mayurika Reviewed 2026-07-03" consistently (lines 2540, 2549, 5115-5119, 5604-5605) and separately correctly shows "9 open" for the root VERIFY count | **PARTIAL MATCH / SOURCE FILE STALE** — index.html's own VERIFY count is correct (9), but it inherits the ACTIVE/2026-07-03 status label from a Mayurika workbench file that itself has not been updated to reference the 2026-07-07 confirmation batch (CONF-007–020) or fix its own stale "12 open" internal reference | Not an index.html defect per se, but index.html's Mayurika status card does not surface that 14 new Mayurika confirmation sources were registered after her 2026-07-03 sign-off — flag as a missing update |
| 4 | Suman workbench / candidate sources | `WORKBENCH.md` §13a (added 2026-07-07): two new raw documents (`On Boarding gaps by Suman.md`, `Quaryable gaps by Suman.md`) are candidate sources `SRC-SUMAN-ONBOARD-001` / `SRC-SUMAN-QUERY-001`, explicitly "AWAITING SUMAN CONFIRMATION," **not registered** in `evidence/source-register.md`. Same file's own §14 "Next Step" still says "Suman review required... DRAFT pending Suman's review," contradicting the frontmatter `status: ACTIVE — Suman Reviewed 2026-06-30` | index.html shows Suman as "ACTIVE — Suman Reviewed 2026-06-30" and "Next action: Review complete — no open action until MD review" (line 2252); **zero mentions** anywhere of SRC-SUMAN-ONBOARD-001, SRC-SUMAN-QUERY-001, or the 2026-07-07 source-intake candidates | **CORRECT ON ONE AXIS, STALE ON ANOTHER** — index.html correctly does NOT show the candidate-only sources as "registered" (good — no overclaim). But it also fails to surface that Suman has a new, real, open action item (confirming two pending candidate sources) as of 2026-07-07 | Update Suman's "Next action" snapshot line — it is no longer accurate that there is "no open action" |
| 5 | Arun workbench / PH live-report AMBER | `WORKBENCH.md` §17: "AMBER — factual sources missing... 6 of 8 areas MISSING, 1 PARTIAL, 1 BLOCKED, 0 of 8 confirmed" | index.html Table 2 footnote (lines 4416-4422) and member snapshot (line 2278: "Live PH report is AMBER — 6 of 8 data sources missing") both accurately reproduce this AMBER state | **MATCH** | None |
| 6 | Rajiv/Admin workbench existence | No `member-aios/rajiv*` folder exists anywhere in the repo (confirmed via glob); only `intelligence-inbox/management-action-records/rajiv-admin-manager/` exists (ongoing action-records folder per CLAUDE.md §16, a different layer) | index.html tab labeled "Rajiv / Admin" (BLOCKED badge); snapshot card explicitly states "Not created — workbench intentionally not built" (line 2292); a "Next steps" list item at line 5051 references creating `member-aios/rajiv-admin-manager/` as a future action, and line 5334 references the `rajiv-admin-manager/` action-records folder correctly | **MATCH** | None — naming and blocked state are both accurate |
| 7 | HR schedule pilot | `schedules/hr/` exists (README, priority-queue.md, mayurika.md, recurring-templates/, archive/); confirmation request `hr-schedule-pilot-confirmation-request-2026-07-06.md` lists exactly **8** open items; a second, separate sign-off request `hr-schedule-pilot-role-desk-calendar-ui-signoff-request-2026-07-07.md` (commit 91e70e8, the latest HEAD commit) asks 8 *additional* Q1–Q8 visual-signoff questions and is explicitly "AWAITING_MAYURIKA_VARMEN_VISUAL_SIGNOFF" | index.html's "Still awaiting confirmation" checklist (lines 3747-3757) correctly lists the same 8 schedule-fact items; status footer correctly shows `HR_SCHEDULE_PILOT_INTERNAL_BUILD_PENDING_MAYURIKA_CONFIRMATION`; scope correctly stated as HR/Mayurika-only; **no mention anywhere** of the newer 2026-07-07 visual-signoff request or its Q1–Q8 questions | **MOSTLY MATCH, ONE OMISSION** — the 8 schedule-fact VERIFY items are accurately shown and not overclaimed as resolved. However, the newest sign-off request (the literal HEAD commit, "Request HR schedule calendar UI sign-off") is not referenced in index.html's Evidence/Technical Details section at all | Add the 2026-07-07 sign-off request file path to the Evidence/Technical Details block, or at minimum note that a second visual sign-off request is pending in addition to the 8 fact-confirmation items |
| 8 | Latest validation/handover state | Most recent validation files (by mtime) are all dated 2026-07-07: `hr-schedule-pilot-role-desk-calendar-ui-match-check-2026-07-07.md`, `mayurika-conf-id-batch-registration-check-2026-07-07.md`, `mayurika-conf-id-chronological-batch-numbering-plan-2026-07-07.md`, `gap-42-src-mayu-conf-007-mapping-check-2026-07-07.md`, `suman-source-intake-candidate-check-2026-07-07.md` | index.html contains zero mentions of "GAP-42," "chronological batch," or the Mayurika confirmation ID batch-registration/renumbering event; the Role Desk calendar match check IS referenced (line 3804) | **PARTIAL MATCH** — the UI-facing 2026-07-07 work (calendar match) is reflected; the evidence/source-governance 2026-07-07 work (GAP-42 batch registration of 14 new Mayurika confirmation sources) is completely absent from the dashboard | Add a status card/note surfacing the GAP-42 batch registration event and the resulting jump in registered source count |
| 9 | Git branch/commit/date | Branch `individual-aios` (matches); HEAD `91e70e8` dated 2026-07-07 11:36 | Branch matches; commit shown is stale `98644e2` / date `2026-07-06` (see "Latest Commit Hash" section above) | **MISMATCH — STALE** | Update topbar commit hash + date and the landing-hero "Last sync" pill to reflect current HEAD, or convert to a build-time-injected value so it cannot drift |
| 10 | Duplicate/parent-truth risk | CLAUDE.md contains full KPI/AXIOM band tables, PRC membership, escalation tables, etc. | index.html was checked for reproduced full tables (searched "Individual Staff Net Sales Bands," "NNV Bands," "Band" patterns) — only one incidental "AXIOM Band Reference" table-header cell was found; no full CLAUDE.md table appears to be duplicated verbatim in the reviewed sections | **LOW RISK — NO ACTION NEEDED NOW** | No fix needed; recommend continuing the existing pattern of summarizing + linking rather than reproducing full source tables, especially as new sections (NSLP tables, Arun day-to-day tables) are added |

## Stale Values Found

- "Sources Registered: 26" appears in 3 places (lines 2400-2402, 6580-6582, and the Document Register row at line 5798) — actual total per `evidence/source-register.md` is **40**.
- Document Register row for `evidence/source-register.md` shows "Last Updated: 2026-06-30" — the file was actually last substantively updated 2026-07-07 (GAP-42 batch of 14 new SRC-MAYU-CONF-* entries).
- Topbar/landing-hero commit hash `98644e2` and date `2026-07-06` are 13 commits and roughly 20 hours stale versus HEAD `91e70e8` (2026-07-07 11:36) — and index.html's own content was edited by several of those intervening commits, meaning the file is inconsistent with itself.
- Suman member-snapshot "Next action: Review complete — no open action until MD review" is stale as of 2026-07-07 — two new candidate sources are now awaiting her confirmation per her own WORKBENCH.md §13a.
- (Context, not index.html's fault, but affects what index.html inherits) Mayurika's own `quick-reference-sources.md` line 62 still says "All 12 open [VERIFY] items" — the register has said 9 since 2026-06-30. index.html itself correctly shows 9, so this stale reference has not (yet) propagated into the dashboard, but it is a latent risk if that file is used as a source for a future index.html update.

## Missing Dashboard Updates

- No surfacing of the 2026-07-07 GAP-42 Mayurika confirmation ID batch registration (14 new sources: SRC-MAYU-CONF-007 through SRC-MAYU-CONF-020).
- No surfacing of the 2026-07-07 Suman source-intake candidates (SRC-SUMAN-ONBOARD-001, SRC-SUMAN-QUERY-001) or the fact that a confirmation request is open for them.
- No reference to the newest HR schedule sign-off request file (`hr-schedule-pilot-role-desk-calendar-ui-signoff-request-2026-07-07.md`), which is the literal HEAD commit's subject.

## Overclaim / Duplicate-Truth Risks

- None found. index.html does not claim any [VERIFY] item as resolved beyond what `context/verify-register.md` supports (Arun items 8–10 are correctly shown as resolved 2026-06-30, and all 9 remaining are correctly shown open).
- index.html does not claim the HR schedule pilot is ACTIVE or resolved — it correctly keeps it in a pending/AMBER-equivalent state.
- index.html does not show Suman's unregistered candidate sources as "registered."
- Full CLAUDE.md source tables (KPI bands, PRC membership, escalation ladders) do not appear to be duplicated verbatim in the sections reviewed — low duplicate-truth risk at present.

## Safe Update Recommendation (not performed now)

The following could be safely updated in `web-view/index.html` later, without resolving any [VERIFY] item or touching any blocked file:

- Refresh the "Sources Registered" count from 26 to 40 in the three locations identified, and update the associated "Last Updated" stamp.
- Refresh the topbar commit hash/date (or wire it to a build-time git-describe injection so this class of drift stops recurring).
- Update Suman's member-snapshot "Next action" line to reflect the open 2026-07-07 source-intake confirmation request.
- Add a short status line noting the GAP-42 batch registration event and its effect on the source count, with a link to `validation/mayurika-conf-id-batch-registration-check-2026-07-07.md`.
- Add the 2026-07-07 Role Desk calendar sign-off request file path to the HR Schedule Pilot's "Evidence / Technical Details" block.

All of the above are additive/refresh-only changes; none require resolving a [VERIFY] item, writing to `CLAUDE.md`, `evidence/source-register.md`, `context/verify-register.md`, or `schedules/hr/`.

## Files Intentionally Untouched

Per task instructions, the following were read-only inspected and NOT edited, staged, or committed:

- `web-view/index.html`
- `evidence/source-register.md`
- `CLAUDE.md`
- `context/verify-register.md`
- `schedules/hr/` (all contents)
- `member-aios/` (all contents)
- `evidence/source-intake/`
- `evidence/stakeholder-confirmations/`

## Overall Result

**AMBER** — index.html is not badly broken (branch name, [VERIFY] count, Arun AMBER state, Rajiv blocked state, and the 8-item HR schedule checklist are all accurate and not overclaiming), but it is running on a stale snapshot: the registered-source count is off by 14 (26 shown vs. 40 actual), the topbar commit hash/date is 13 commits and about 20 hours behind HEAD (and inconsistent with the file's own later-edited content), and the two newest pieces of 2026-07-07 work (the GAP-42 Mayurika confirmation batch and the Suman source-intake candidates) are entirely absent from the dashboard. No item was found where index.html falsely claims a [VERIFY] item is resolved or falsely claims a blocked/candidate source is registered — the errors found are all staleness/omission, not fabrication.

## Next Step Recommendation

Route this audit to Mareenraj (or whoever performs the next index.html maintenance pass) to apply the "Safe Update Recommendation" list above as a single refresh commit, then re-run this same audit method after the refresh to confirm the sync gaps are closed.

## Final `git status --short` (post-write validation)

```
?? validation/index-file-system-sync-audit-2026-07-07.md
```

Working tree was clean (`git status --short` returned nothing) immediately before this file was written. After writing, the only change is this new untracked report file — no blocked file was touched.

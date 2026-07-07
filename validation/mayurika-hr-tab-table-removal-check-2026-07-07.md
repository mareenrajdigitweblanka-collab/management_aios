---
name: mayurika-hr-tab-table-removal-check
type: validation
created: 2026-07-07
checked-by: Mareenraj (builder)
scope: web-view/index.html — Mayurika HR tab, "HR Tables" placeholder section
status: PASS
---

# Mayurika HR Tab Table Removal — Validation Check (2026-07-07)

## Requirement

Per user instruction relayed 2026-07-07: Mayurika will create her own HR table formats and send them to MD. Only after MD confirms will MD or Varmen provide the confirmed tables back for AIOS/dashboard use. Until then, the Mayurika HR tab in `web-view/index.html` must show no unapproved HR table preview implying a final or usable HR table structure — only a simple, non-technical placeholder notice. No new HR table format may be invented or implied.

## Files Changed

| File | Action |
|---|---|
| `web-view/index.html` | EDITED — Mayurika HR tab section title, placeholder notice body, evidence path presentation, snapshot card line, and next-step box line updated |
| `validation/web-view-html-dashboard-check.md` | EDITED — §45 appended |
| `handover/2026-06-30__web-view-dashboard-closure.md` | EDITED — new closure record appended |
| `evidence/stakeholder-confirmations/mayurika-hr-tables-md-review-pending-removal-request-2026-07-07.md` | CREATED |
| `validation/mayurika-hr-tab-table-removal-check-2026-07-07.md` | CREATED (this file) |

## HR Table Sections Removed

None were removed as live table markup in this pass, because none existed at the time of inspection: the 5 original HR data-table previews (Leave Notice Periods, Leave Types, Employment Status Reference, Staff Review Milestone Calendar, Probation Record Monitoring) were already removed from the dashboard on 2026-07-06 (`validation/mayurika-hr-tables-preview-removal-check.md`) and replaced with a "pending Mayurika input" placeholder box.

This task updates that existing placeholder's **wording** to reflect the newly reported MD/Varmen confirmation flow (Mayurika → MD → MD/Varmen confirmation → dashboard), and corrects two other stale references to the same fact for consistency (Mayurika snapshot card "Gated" line; Mayurika tab "What should I do next?" step 3). No `<table>` element was added, removed, or altered by this change.

## Sections Intentionally Preserved

| Section | Reason |
|---|---|
| NSLP Control System — Internal Build (6 tables: Skill Register Control, and 5 others under `SRC-MAYURIKA-NSLP-001`) | Separately registered/approved source; task instruction explicitly excludes it ("NSLP is separate from future HR table formats if already approved") |
| HR Schedule Pilot — Internal Calendar Preview (month-view calendar, Priority Queue table, Recurring Templates Register table) | A schedule-pilot preview, not a Mayurika HR data table; still its own separate AMBER item pending Mayurika/Varmen visual sign-off; task instruction explicitly excludes it unless "clearly inside the unnecessary HR table area" — it is not |
| HR Daily Control Panel (12 placeholder screen cards) | Screen-list navigation cards, not data tables; not part of this instruction |

## Evidence Note Path

`evidence/stakeholder-confirmations/mayurika-hr-tables-md-review-pending-removal-request-2026-07-07.md`

## No New HR Table Structure Invented

Confirmed. The only content change is to notice/wording text and the placement of existing evidence-path text into a collapsed `<details>` element. No column names, table headers, row structures, or data fields were added, implied, or approved anywhere in `web-view/index.html` as part of this task.

## Source-Register Untouched

Confirmed — `git status --short evidence/source-register.md` returns no output.

## CLAUDE.md Untouched

Confirmed — `git status --short CLAUDE.md` returns no output.

## Verify-Register Untouched

Confirmed — `git status --short context/verify-register.md` returns no output.

## Member-AIOS Untouched

Confirmed — `git status --short member-aios/` returns no output.

## Schedules/HR Untouched

Confirmed — `git status --short schedules/hr/` returns no output.

## [VERIFY] Preservation Check

No `[VERIFY]` item was resolved, closed, or altered in count by this task. The dashboard's "9 open" [VERIFY] figure is unchanged. This task did not touch `context/verify-register.md` or any [VERIFY]-tagged content outside the Mayurika HR Tables placeholder wording.

**Result: PASS**

## Additional Safety Checks

| Check | Result |
|---|---|
| Sensitive HR/staff/candidate/salary/health/PDPA data added | NOT PRESENT |
| Duplicate truth introduced | NOT PRESENT |
| `evidence/source-intake/` edited | NO |
| `intelligence-inbox/raw-stakeholder-documents/` edited | NO |
| `HR.Mayu.Skill.md` edited | NO |
| Arun files edited | NO |
| Suman files edited | NO |
| BLOS / thresholds / KPI / AXIOM files edited | NO |
| PostgreSQL objects / production database touched | NOT APPLICABLE — no database connection exists in this static dashboard |
| Dashboard remains read-only (no forms, fetch, backend) | YES — unchanged |
| Netlify deployment wording preserved | YES |

## PASS/AMBER Result

**PASS** — Mayurika HR tab shows no unapproved HR table preview; existing placeholder notice updated to the MD/Varmen confirmation wording requested; no new HR table format invented; NSLP and HR Schedule Pilot sections untouched; all blocked files confirmed untouched via `git status --short`.

## Next Step

When Mayurika sends her HR table formats to MD and MD or Varmen confirms them, register the confirmation as a stakeholder-confirmation source, then build only the confirmed table structure into this section — replacing the placeholder notice with the approved tables.

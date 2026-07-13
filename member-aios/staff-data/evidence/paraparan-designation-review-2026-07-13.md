---
name: paraparan-designation-review
type: evidence-review
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
status: OPEN — awaiting HR/Arun confirmation
source-boundary: SRC-ARUN-CONF-001, HR-provided PDF (unregistered)
root-truth: CLAUDE.md — canonical; this file is a review request, not a decision
---

# Paraparan Designation — Review — 2026-07-13

## Purpose

Two registered/parsed sources give Paraparan two different designations. This file asks Arun (KPI/AXIOM domain owner) and Mayurika (HR) to confirm which is current, since the PH Team KPI shared-model design references Paraparan by role.

## Source

| | Value A | Value B |
|---|---|---|
| Source | SRC-ARUN-CONF-001 (Arun-confirmed, 2026-06-30) | HR-provided PDF (unregistered) |
| Path | `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md` | `Personal Target - HRD - 2 Total Staffs.pdf` |
| Page/row evidence | — (confirmation record, not paginated) | Page 4, `source_row_reference = page4-row42-DWL310` |

## Evidence

| Field | Value A (SRC-ARUN-CONF-001) | Value B (HR PDF, row DWL310) |
|---|---|---|
| Designation | **External Auditor** | **Accountant** |
| Context | CLAUDE.md §7.4 review inputs: "Auditor Feedback (External Auditor: Paraparan)" — Arun-confirmed 2026-06-30, replacing prior "ROI Officer" wording | Normalized CSV row `DWL310`: `full_name = "Ganeshanathan Paraparan"`, `calling_name = "Paraparan G"`, `designation = "Accountant"`, `department_team` = blank in source, `date_of_joining = 11/05/2026`, `staff_status = Active` |
| Registration status | Registered, Arun-confirmed | Unregistered (HR PDF as a whole is unregistered — see source reconciliation review) |

Both designations are shown here exactly as they appear in their respective sources. **Neither is corrected, merged, or preferred by this review.**

## Issue

CLAUDE.md §7.4 and `data-maps/ph-team-kpi-shared-data-map-draft.md` §2 both rely on "External Auditor" as Paraparan's role for KPI review-input purposes. If the HR PDF's "Accountant" designation is the current, correct one, either:

1. Paraparan holds both roles concurrently (External Auditor function + Accountant designation), or
2. "External Auditor" was a role description rather than a formal designation and should not be read as conflicting with "Accountant", or
3. One of the two sources is stale/incorrect and needs correction.

This review does not assume any of the three.

## Decision Required

- [ ] Arun to confirm: is "External Auditor" still the correct KPI-review-input role for Paraparan?
- [ ] Mayurika to confirm: is "Accountant" the correct current HR designation for Paraparan (employee_number `DWL310`)?
- [ ] If both are correct simultaneously, confirm this explicitly so the KPI shared-model design (`data-maps/ph-team-kpi-shared-data-map-draft.md`) can reference the auditor *function* without implying it is Paraparan's sole or primary job title.

## Owner

Arun (KPI/AXIOM domain, confirms the External Auditor role reference) and Mayurika (HR designation of record).

## Reviewer

Mareenraj (builder) — facilitates only; does not choose between the two values.

## Status

**OPEN.**

## Pass/Fail Rule

PASS if Arun and/or Mayurika provide an explicit confirmation resolving or explaining the conflict. FAIL if any downstream document (including the PH KPI staging schema or dashboard) silently picks one designation without this review being closed, or if this review itself is read as having already decided the answer.

## Next Step

Route to Arun first (since the External Auditor role reference is his confirmed source), then to Mayurika for the HR designation side. Record the outcome as a stakeholder confirmation and update `data-maps/ph-team-kpi-shared-data-map-draft.md` §2 accordingly.

## Known Limits

- Does not resolve which designation is correct.
- Does not affect the shared-KPI-model schema design, which references Paraparan by `actor_role` (not a fixed job-title string) specifically so this conflict does not block the design (see `database-design/staff-ph-kpi-staging-schema-draft.md`).
- Depends in part on the outcome of the source reconciliation review (if the HR PDF is later deprioritized in favor of a different/updated source, this designation conflict may need re-evaluation against that source instead).

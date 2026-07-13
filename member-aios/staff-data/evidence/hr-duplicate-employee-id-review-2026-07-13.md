---
name: hr-duplicate-employee-id-review
type: evidence-review
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
status: OPEN — awaiting HR decision per ID
source-boundary: HR-provided PDF (unregistered), member-aios/staff-data/source/normalized/hr-staff-dashboard.csv
root-truth: CLAUDE.md — canonical; this file is a review request, not a decision
---

# HR Duplicate Employee ID — Review — 2026-07-13

## Purpose

Five `employee_number` values in the normalized staff CSV are each attached to more than one row (11 rows total). This file asks Mayurika to classify each occurrence so `employee_number` can eventually be used as a reliable key. No record has been renumbered, merged, or removed.

## Source

`member-aios/staff-data/source/normalized/hr-staff-dashboard.csv`, traceable via `source_row_reference` back to `Personal Target - HRD - 2 Total Staffs.pdf` (pages 3–4).

## Evidence

Only the fields needed to distinguish the four cases are shown (`employee_number`, `source_row_reference`, `date_of_joining`, `staff_status`) — full name is included only where necessary to show whether the two rows plausibly refer to the same person.

| employee_number | source_row_reference | date_of_joining | staff_status | Same person as the other row in this group? |
|---|---|---|---|---|
| DWL296 | page4-row24-DWL296 | 24/03/2026 | Inactive | No — different names on the two rows |
| DWL296 | page4-row25-DWL296 | 25/03/2026 | Inactive | No |
| DWL302 | page3-row12-DWL302 | 06/02/2025 | Inactive | No — three distinct names across the group |
| DWL302 | page4-row31-DWL302 | 06/04/2026 | Inactive | No |
| DWL302 | page4-row33-DWL302 | 08/04/2026 | Active | Department/team text for this row reads "...rejoiner" — see note below |
| DWL303 | page4-row32-DWL303 | 07/04/2026 | Inactive | No — different names |
| DWL303 | page4-row35-DWL303 | 15/04/2026 | Active | No |
| DWL305 | page4-row34-DWL305 | 09/04/2026 | Inactive | No — different names |
| DWL305 | page4-row37-DWL305 | 22/04/2026 | Active | No |
| DWL319 | page4-row51-DWL319 | 28/05/2026 | Inactive | No — different names, **identical join date** |
| DWL319 | page4-row52-DWL319 | 28/05/2026 | Active | No |

**Cross-reference note (DWL302, third row only):** the full name on `page4-row33-DWL302` also appears, under the same spelling, at a separate employee_number (`page3-row30-DWL205`, date of joining 28/04/2025, status Inactive) elsewhere in the same source. This is consistent with a genuine rejoiner being assigned a new code (`DWL302`) that happens to collide with two unrelated people already recorded under that same code — but this is a read of the evidence, not a confirmed classification.

## Issue

None of the 11 rows can currently be treated as a unique-keyed record. `employee_number` alone cannot support joins, foreign keys, or dashboard row identity until each group below is classified.

## Classification (Evidence-Based Read — Not a Decision)

| employee_number | Rows | Suggested classification | Basis | Final classification |
|---|---|---|---|---|
| DWL296 | 2 | Likely **source typo / entry collision** | Different names, consecutive dates (1 day apart), both Inactive — consistent with a sequential-entry ID slip during batch intern intake | `[VERIFY]` |
| DWL302 | 3 | Mixed — rows 1–2 likely **source typo / ID reuse**; row 3 possibly **genuine rejoiner** (reused code) | Row 3's department text says "rejoiner" and its name matches a separate, earlier `DWL205` entry under the same spelling | `[VERIFY]` |
| DWL303 | 2 | Likely **source typo / entry collision** | Different names, 8 days apart | `[VERIFY]` |
| DWL305 | 2 | Likely **source typo / entry collision** | Different names, 13 days apart | `[VERIFY]` |
| DWL319 | 2 | Likely **source typo / entry collision** | Different names, **identical** join date — strongest collision signal in this set | `[VERIFY]` |

**No group in this set was classified as "duplicate record" (the same person recorded twice under matching names)** — every group involves distinct full names. This review does not select a final classification for any group; the "Suggested classification" column is offered only to help HR's review, not as an approved outcome.

## Decision Required

For each of the 5 employee_number values, Mayurika (or Rajiv, if this touches canonical ID assignment authority — CLAUDE.md §5) must confirm:

- [ ] DWL296 — typo, duplicate record, genuine rejoiner, or unknown?
- [ ] DWL302 — classify each of the 3 rows individually; confirm/deny the DWL205 rejoiner link
- [ ] DWL303 — typo, duplicate record, genuine rejoiner, or unknown?
- [ ] DWL305 — typo, duplicate record, genuine rejoiner, or unknown?
- [ ] DWL319 — typo, duplicate record, genuine rejoiner, or unknown?
- [ ] What corrected employee_number(s) should replace the colliding codes, if any (to be applied by HR's own process — not by this AIOS)?

## Owner

Mayurika (HR Officer). Rajiv (canonical ID/name-spelling authority, CLAUDE.md §5) if renumbering is required.

## Reviewer

Mareenraj (builder) — facilitates, does not classify or renumber.

## Status

**OPEN** — 5 of 5 groups awaiting classification.

## Pass/Fail Rule

PASS if every group above receives an explicit classification from HR/Rajiv. FAIL if this AIOS renumbers, merges, or deletes any of the 11 rows without that confirmation, or if `employee_number` is treated as a safe unique key anywhere before this review closes.

## Next Step

Route to Mayurika. Any corrected employee ID must be issued by HR's own record-keeping process (Rajiv's canonical authority) — this AIOS will re-import the corrected value once provided, not invent one.

## Known Limits

- Classification suggestions are inference from date proximity and name distinctness only — no interview or HR record was consulted.
- Does not renumber, merge, or delete any row (explicitly out of scope).
- Does not resolve the two-source reconciliation question (separate review file) — a resolved reconciliation might surface additional evidence relevant to these 5 groups.

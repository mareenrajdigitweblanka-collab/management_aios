---
name: mayurika-hr-tables-future-format-update
type: stakeholder-confirmation
date: 2026-07-06
stakeholder: Mayurika (HR Officer)
received-via: User (Mareenraj)
recorded-by: Mareenraj (builder)
status: CONFIRMED SCOPE UPDATE — HR useful table previews removed pending future Mayurika table format
sensitive-data-check: NONE — no staff names, salary, health, PDPA personal data, leave records, onboarding records, KPI scores, disciplinary data, candidate data, or employee IDs included
---

# Stakeholder Update — Mayurika HR Tables: Future Format Pending (2026-07-06)

## Date

2026-07-06

## Stakeholder Context

Mayurika is the HR Officer and primary domain owner of the Mayurika HR tab in the Management AIOS Dashboard (`web-view/index.html`).

## Update Received (via User)

> "Table format and tables She will give in future, so remove existing HR tables."

## Interpretation

Mayurika will provide the exact table format and table content in the future. The existing HR useful table previews (5 tables previously shown in the Mayurika HR tab) were built as read-only previews for Mayurika's review. Since Mayurika will supply the actual format and content herself, these preview tables should be removed from the visible dashboard.

No replacement HR tables are to be built at this time. No table format is to be invented. The dashboard placeholder note confirms tables are pending Mayurika's input.

## Scope of This Update

- Mayurika HR dashboard visible table previews only
- The following 5 preview tables were removed from `web-view/index.html`:
  1. Table 1 — Leave Notice Periods & Approval Levels
  2. Table 2 — Leave Types at a Glance
  3. Table 3 — Employment Status Reference & PDPA Compliance Indicator
  4. Table 4 — Staff Review Milestone Calendar
  5. Table 5 — Probation Record Monitoring
- The "Not Built — Month 1 Status Categories" amber note was also removed (part of the same preview block)

## Decision

Existing HR useful table previews removed from visible dashboard.

Future HR tables will be built only after Mayurika provides exact format and content.

A placeholder note has been added to the Mayurika HR tab confirming this status.

## Boundary

- This does NOT remove HR processes from company truth (CLAUDE.md §9, §10 remain canonical)
- This does NOT delete historical evidence or validation files
- This does NOT approve any replacement table format
- This does NOT resolve any [VERIFY] item
- This does NOT change Mayurika's ACTIVE workbench status
- This does NOT affect source-register.md, CLAUDE.md, or context/verify-register.md

## Historical Evidence Retained

The following historical files are preserved and must not be deleted:

| File | Purpose |
|---|---|
| `evidence/stakeholder-confirmations/mayurika-hr-useful-tables-preview-build-note-2026-07-02.md` | Original build note for the 5 preview tables — historical record |
| `validation/mayurika-hr-useful-tables-preview-build-check.md` | Original build check for the 5 preview tables — superseded, historical record |
| `evidence/table-discovery/mayurika-hr-useful-tables-source-check-2026-07-02.md` | Source discovery check — historical record |
| `validation/mayurika-hr-useful-tables-discovery-check.md` | Discovery validation — historical record |

## Sensitive-Data Check

| Data Type | Present? |
|---|---|
| Staff names | NO |
| Salary or compensation data | NO |
| Health or medical data | NO |
| PDPA personal data | NO |
| Individual AXIOM scores or KPI scores | NO |
| Recruitment candidate personal data | NO |
| Disciplinary case details | NO |
| Leave records (individual) | NO |
| Onboarding records (individual) | NO |
| Employee IDs | NO |

**Sensitive-data check: PASS — no sensitive data present**

## [VERIFY] Status

No [VERIFY] items resolved or affected by this update.

All 9 open [VERIFY] items in `context/verify-register.md` remain open and unchanged.

## Status

**CONFIRMED SCOPE UPDATE** — HR useful table previews removed from visible dashboard pending future Mayurika table format and content.

## Next Step

Wait for Mayurika to provide exact table format and content before building any HR tables in the dashboard.

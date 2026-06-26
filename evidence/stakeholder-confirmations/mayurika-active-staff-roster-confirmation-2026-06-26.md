---
name: mayurika-active-staff-roster-confirmation
type: stakeholder-confirmation
source-id: SRC-MAYU-CONF-002
related-source: SRC-STAFF-001
confirmed-by: Mayurika / HR owner
confirmation-date: 2026-06-26
created: 2026-06-26
status: READY — HR Owner Confirmed
---

# Mayurika Confirmation — Active Staff Roster

## Source ID
SRC-MAYU-CONF-002

## Related Source
SRC-STAFF-001

## Confirmation Topic
Active staff status of uploaded staff roster CSV.

## Confirmed Statement
Mayurika / HR owner confirmed that the uploaded staff roster CSV registered as SRC-STAFF-001 (`intelligence-inbox/raw-stakeholder-documents/staff-data/Digitweblanka Staffs Data - Overall Staffs.csv`) contains active staff only.

## Confirmed By
Mayurika / Mayuri — HR owner (HR Officer)

## Confirmation Date
2026-06-26

## Confirmation Method
Direct confirmation from Mayurika / HR owner as relayed in project session — 2026-06-26.

---

## Impact on SRC-STAFF-001

This confirmation resolves the primary CONDITIONAL PASS block on SRC-STAFF-001. Specifically:

| Prior Warning | Resolution |
|---------------|------------|
| "Cumulative historical roster — year separator rows indicate this covers all staff who ever joined, not current employees only" | RESOLVED — Mayurika confirms roster contains active staff only. Year separator rows are formatting artefacts from the original spreadsheet, not departed-staff indicators. |
| "Roster spans 11 years — employment status not captured; departed staff cannot be distinguished from current staff" | RESOLVED — Mayurika confirms all entries are active staff. |

**SRC-STAFF-001 status change:** CONDITIONAL PASS → READY — HR-Confirmed Active Staff Roster Evidence

---

## Use Decision
SRC-STAFF-001 may now be used as HR-confirmed active staff roster evidence for:
- Aggregate active staff count validation
- Active staff location distribution analysis
- Active staff department/team distribution analysis (with naming-variant normalization caution — see data quality warnings in validation/staff-roster-raw-source-check.md)
- Organization-structure validation support at aggregate level
- HR staff record completeness checks

---

## Limits
This confirmation does not prove or grant:
- Reporting-line authority or management hierarchy
- Admin Manager authority — [VERIFY] items 1–5 remain open, awaiting SRC-ADMIN-001
- KPI or AXIOM performance status
- HR policy or entitlement rules
- Salary or compensation information
- Final organization chart approval
- Parent AIOS truth or v0.2 promotion

---

## Remaining Data Quality Warnings (still active after confirmation)
The following data quality warnings from the original parsed check remain and are NOT resolved by this confirmation:

1. **Leading space in Designation column header** — Column name is ` Designation` (with a leading space). Parsers must strip leading whitespace.
2. **Year-separator rows in data body** — 10 rows use the Employee ID field for year markers (2015–2026). These must still be excluded from staff-count or data analysis even though the roster is confirmed as active-staff only.
3. **Embedded sub-header rows** — `Department / Team` and `O/Emp.No.` appear as data values in rows that are formatting artefacts. Must be excluded from analysis.
4. **Department naming inconsistencies** — Multiple variants exist for the same functional teams. Normalization required before department-level aggregation. Canonical team names still need HR/Management confirmation.
5. **2 rows missing Location** — Requires HR clarification.
6. **1 row missing Designation** — Requires HR clarification or correction.

---

## Sensitivity Boundary
SRC-STAFF-001 contains sensitive internal staff data (employee IDs, full names, locations, designations, departments/teams). This confirmation does not change the sensitivity level.

- Use aggregate summaries unless full names are explicitly required and approved.
- Do not copy the full staff name list into context or summary files.
- PDPA-related handling remains with Mayurika.

---

## Pass/Fail Rule
PASS if SRC-STAFF-001 is used as HR-confirmed active staff roster evidence within the stated boundaries.
FAIL if the roster is treated as reporting authority, final org chart, policy truth, or performance evidence.

## Next Step
1. Update evidence/source-register.md — change SRC-STAFF-001 status to READY — HR-Confirmed Active Staff Roster Evidence.
2. Register SRC-MAYU-CONF-002 in evidence/source-register.md.
3. Update validation/staff-roster-raw-source-check.md to reflect HR confirmation and update status to PASS.
4. Create validation/staff-roster-active-confirmation-impact-check.md.
5. Do not update context/organization-structure.md until department naming variants are normalized and confirmed — that step requires further HR/Management input.

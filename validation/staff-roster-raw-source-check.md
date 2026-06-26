---
name: staff-roster-raw-source-check
type: validation
source-id: SRC-STAFF-001
created: 2026-06-26
last-updated: 2026-06-26
status: PASS — HR-Confirmed Active Staff Roster Evidence
hr-owner-review-required: NO — confirmed by Mayurika 2026-06-26 (SRC-MAYU-CONF-002)
---

# Staff Roster Raw Source Check

## Status
**PASS** — File registered as HR-confirmed active staff roster evidence. Mayurika confirmed 2026-06-26 that SRC-STAFF-001 contains active staff only (SRC-MAYU-CONF-002). Active-staff CONDITIONAL PASS block resolved.

## Source ID
SRC-STAFF-001

## Raw CSV
intelligence-inbox/raw-stakeholder-documents/staff-data/Digitweblanka Staffs Data - Overall Staffs.csv

---

## Parsed Result

| Field | Value |
|-------|-------|
| Total CSV lines (including header, separators, blank) | 140 |
| Total data rows parsed (after header row) | 135 |
| Meaningful staff rows | 125 |
| Year / separator rows inside data | 10 |
| Duplicate Employee IDs | `O/Emp.No.` appears in 2 rows — appears to be embedded sub-header label, not a valid staff ID; no genuine employee ID duplicates found |
| Missing Employee ID | 0 |
| Missing Full Name | 0 |
| Missing Location | 2 |
| Missing Designation | 1 |
| Missing Department / Team | 0 |

**Location counts:**

| Location | Count |
|----------|-------|
| Jaffna | 89 |
| Nelliyadi | 23 |
| Chankanai | 7 |
| WFH | 4 |
| Blank / missing | 2 |
| **Total (staff rows)** | **125** |

**Department naming inconsistencies (examples):**

| Team (as-is in CSV) | Variants Found | Issue |
|---------------------|----------------|-------|
| Portfolio team | `Portfolio team`, `portfolio team` | Case inconsistency |
| eBay | `EBAY`, `EBay`, `Ebay`, `eBay` | Four case variants |
| Digital Marketing | `Digital Marketing`, `Digital marketing` | Case inconsistency |
| Technical | `Technical`, `Technical Team`, `Technical team` | Three variants |
| Development | `Development team`, `Development`, `Developing` | Three variants |
| Customer Service | `Customer Service Team`, `Customer service team`, `CST` | Three variants (including abbreviation) |
| Accounts | `Accounts`, `Accounts department`, `Accountant` | May or may not be same unit |
| Data Analysis | `Data Analysis`, `Data Analysis(nelliyadi)` | Location embedded in team name |
| `Department / Team` | Appears as a data value in 2 rows | Likely embedded sub-header rows |

---

## Sensitivity Check

| Check | Result |
|-------|--------|
| Staff names present in raw CSV? | YES — full names present; not copied into this validation file |
| Employee IDs present in raw CSV? | YES — present; not listed individually in this file |
| Only aggregate summary copied into validation? | YES — no individual staff names or IDs reproduced here |
| Full staff name list copied into context files? | NO — prohibited; aggregate use only |
| CSV placed in restricted raw-stakeholder-documents folder? | YES |
| Source note created with sensitivity warning? | YES |
| Source registered in evidence/source-register.md? | YES |

---

## HR Active Staff Confirmation

| Field | Value |
|-------|-------|
| Status | CONFIRMED |
| Confirmation Source | SRC-MAYU-CONF-002 |
| Confirmed By | Mayurika / HR owner |
| Confirmation Date | 2026-06-26 |
| Confirmed Statement | SRC-STAFF-001 contains active staff only |
| Confirmation Note | evidence/stakeholder-confirmations/mayurika-active-staff-roster-confirmation-2026-06-26.md |

**Resolved by SRC-MAYU-CONF-002:**

- Prior Warning #1 (Cumulative historical roster / employment status unknown) — RESOLVED. Mayurika confirmed all 125 meaningful staff rows represent active staff. Year separator rows are spreadsheet formatting artefacts only.
- Prior Warning #8 (Roster spans 11 years; departed staff cannot be distinguished) — RESOLVED. Active-staff status confirmed by HR owner.

---

## Data Quality Warnings

The following warnings were not resolved by the active-staff confirmation and remain active:

1. **Leading space in Designation column header** — Column name is ` Designation` (with a leading space). Any parsing or query tool must strip leading whitespace from column names before use or queries will fail silently.

2. **10 year-separator rows inside data body** — Rows for 2015–2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, and 2026 appear in the Employee ID field as data-separating markers. These are formatting artefacts and must be excluded from any staff count or data analysis.

3. **Embedded sub-header rows** — "Department / Team" appears as a value in 2 data rows and `O/Emp.No.` appears as an Employee ID value in 2 rows. These are row-header artefacts from the original spreadsheet and must be excluded from analysis.

4. **Department naming inconsistency** — At least 10 team names have multiple variants (case differences, abbreviations, partial names). Normalization is required before any department-level aggregation. Canonical team names have not yet been confirmed by HR/Management.

5. **2 rows missing Location** — Two active staff rows have a blank Location field. Requires HR clarification before use in location-based distribution analysis.

6. **1 row missing Designation** — One active staff row has a blank Designation field. Requires HR clarification or correction.

---

## Claude Usage Boundary

| Allowed | Not Allowed |
|---------|-------------|
| Aggregate staff-count analysis | Treating as final staff master |
| Location distribution summary | Treating as current-employees-only list |
| Department distribution analysis (after normalization) | Copying full staff name lists into context files |
| Cross-referencing employee IDs against action records | Making HR decisions based on this file |
| Organization structure support at aggregate level | Treating as reporting authority proof |
| Flagging data quality gaps for HR review | Resolving Admin Manager [VERIFY] items 1–5 |
| Evidence only — record of what was uploaded | Treating as policy truth |

---

## Pass/Fail Rule

| Scenario | Result |
|----------|--------|
| File preserved and registered safely as sensitive raw staff data | PASS |
| HR owner confirmation still needed for current-staff use | CONDITIONAL PASS (current status) |
| Personal data copied unsafely or file treated as final staff master | FAIL |

**Result: CONDITIONAL PASS**

The file has been:
- Copied to the correct restricted folder
- Registered in evidence/source-register.md as SRC-STAFF-001
- Covered by a source note with full sensitivity warnings
- Parsed at aggregate level only (no individual names reproduced)

HR owner (Mayurika) confirmation is still required before this source can be used as current staff structure evidence or for active headcount validation.

---

## Next Action
Obtain HR owner (Mayurika) confirmation that:
1. This CSV represents current active staff (or clarify which year/rows represent current staff).
2. The file may be used for organization structure validation within this AIOS.
3. Department naming variants have been reviewed and a canonical name list is available.
4. Rows with missing Location and missing Designation have been investigated.

Once confirmed, update SRC-STAFF-001 status in evidence/source-register.md from CONDITIONAL PASS to READY, and only then proceed with using the source for organization-structure context updates.

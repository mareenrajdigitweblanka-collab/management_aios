---
name: staff-roster-source-note
type: source-note
source-id: SRC-STAFF-001
created: 2026-06-26
status: READY — HR-Confirmed Active Staff Roster Evidence (SRC-MAYU-CONF-002, 2026-06-26)
sensitivity: HIGH — Internal Staff Personal Data
hr-owner-review-required: YES
---

# Staff Roster Source Note

## Source ID

SRC-STAFF-001

## Status

READY — HR-Confirmed Active Staff Roster Evidence (SRC-MAYU-CONF-002, 2026-06-26)

## Raw CSV Path

intelligence-inbox/raw-stakeholder-documents/staff-data/Digitweblanka Staffs Data - Overall Staffs.csv

## Source Owner

Mayurika / HR owner (confirmed 2026-06-26)

## Domain

HR / Organization Structure / Staff Records / Management

## Purpose

This source records staff roster data including employee IDs, locations, full names, designations, and department/team names. It can support organization structure validation, HR record checks, staff distribution analysis, and management data quality review.

---

## What This Source Can Prove
- Staff entries existed in the uploaded roster as of the date provided.
- Employee IDs, locations, designations, and departments/teams were recorded in the CSV.
- The file can support staff distribution and organization-structure validation at aggregate level.
- The file can be used for cross-referencing against HR records and management action records.

## What This Source Cannot Prove
- Current employment status without HR confirmation from Mayurika.
- Final organization chart or authoritative reporting lines.
- Reporting line authority or management hierarchy.
- Admin Manager authority (all Admin Manager [VERIFY] items 1–5 remain open — awaiting SRC-ADMIN-001).
- KPI, AXIOM band, or performance status.
- HR policy or entitlements.
- Final staff master truth — this is a raw upload, not a validated staff master.

---

## Sensitivity Check
This file contains personal staff information:
- Employee IDs
- Full names
- Locations (Jaffna, Nelliyadi, Chankanai, WFH)
- Designations
- Departments / team names

**Use only internally.** Do not copy full staff names into general context files unless required and approved by the HR owner (Mayurika). Aggregate summaries only should appear in context or validation files.

---

## Parsed Summary (Aggregate Only)

| Field | Count |
|-------|-------|
| Total CSV rows (including header, separators, blank) | 140 |
| Meaningful staff rows | 125 |
| Year / separator rows | 10 |
| Total data rows parsed (after header) | 135 |

**Location distribution:**

| Location | Count |
|----------|-------|
| Jaffna | 89 |
| Nelliyadi | 23 |
| Chankanai | 7 |
| WFH | 4 |
| Blank / missing | 2 |

**Duplicate Employee IDs:** `O/Emp.No.` appears in 2 rows — this value appears to be a sub-header or separator label within the data body, not a valid employee ID. No genuine duplicate employee IDs identified from valid ID entries.

**Missing key fields:**

| Field | Missing Count |
|-------|---------------|
| Employee ID | 0 |
| Full Name | 0 |
| Location | 2 |
| Designation | 1 |
| Department / Team | 0 |

---

## Data Quality Notes

1. **Leading space in Designation column name:** The CSV column header is ` Designation` (with a leading space) rather than `Designation`. Any parser or query tool must account for this or strip leading whitespace from column names before use.

2. **Year separator rows inside data:** 10 rows use the Employee ID field to record year markers (2015–2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026). These are not staff rows and must be excluded from any staff count or analysis. The roster appears to be a cumulative historical list, not a current-employees-only extract.

3. **Department / Team naming inconsistencies:** Multiple naming variants exist for the same functional team. Examples include:
   - `Portfolio team`, `portfolio team` (case inconsistency)
   - `EBAY`, `EBay`, `Ebay`, `eBay` (four variants of the same team)
   - `Digital Marketing`, `Digital marketing` (case inconsistency)
   - `Technical`, `Technical Team`, `Technical team` (three variants)
   - `Development team`, `Development`, `Developing` (three variants)
   - `Customer Service Team`, `Customer service team`, `CST` (three variants)
   - `Accounts`, `Accounts department`, `Accountant` (may or may not refer to the same unit)
   - `Data Analysis`, `Data Analysis(nelliyadi)` (location embedded in team name)
   - `Department / Team` appears as a value in 2 rows — possible embedded sub-header rows in the data

   This inconsistency means department-level analysis requires normalization before use. Do not use raw department strings for counts without cleaning.

4. **Possible embedded header rows:** `Department / Team` appears as a data value in 2 rows, suggesting those rows may be duplicate header rows embedded mid-file, consistent with a year-grouped copy-paste format.

5. **Historical roster, not current-staff extract:** The year separators (2015–2026) indicate this file covers all staff who joined over an 11-year period. It is not confirmed to reflect only current employees. HR owner (Mayurika) must confirm which rows represent currently active staff before this file is used for headcount or org structure validation.

6. **2 rows missing location:** Two staff rows have a blank Location field. This may indicate data entry gaps or WFH/remote arrangements not captured in the Location column.

7. **1 row missing designation:** One staff row has a blank Designation field. This may be a data entry gap requiring HR correction.

---

## Claude Usage Rule
Claude may use this source for:
- Aggregate staff-data validation
- Organization structure support at process level
- Department distribution analysis (after normalization)
- Cross-referencing employee IDs against management action records

Claude must not treat this source as:
- Final staff master or current-employees list
- Policy truth or HR entitlement reference
- Final reporting authority or org chart
- Employment status proof
- Performance, KPI, or AXIOM band proof
- Admin Manager authority proof
- Parent AIOS truth

All use of this source must remain at aggregate or process level. Full staff name lists must not be copied into context files or external summaries.

---

## Pass/Fail Rule
PASS if the file is registered as sensitive raw staff roster evidence only.
CONDITIONAL PASS if HR owner confirmation is still needed (current status).
FAIL if the file is treated as final staff master or copied broadly into context.

**Current Status: CONDITIONAL PASS** — file registered as sensitive raw evidence; HR owner (Mayurika) confirmation required before use as current staff structure evidence.

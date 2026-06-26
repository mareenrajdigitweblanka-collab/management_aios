---
name: staff-roster-active-confirmation-impact-check
type: validation
sources: SRC-STAFF-001, SRC-MAYU-CONF-002
created: 2026-06-26
status: PASS
---

# Staff Roster Active Confirmation Impact Check

## Status
**PASS** — Active-staff confirmation captured safely. SRC-STAFF-001 status updated to READY — HR-Confirmed Active Staff Roster Evidence. No authority expanded beyond what the confirmation supports.

## Sources
- SRC-STAFF-001 — DigitWebLanka Staff Roster CSV
- SRC-MAYU-CONF-002 — Mayurika confirmation of active-staff status (2026-06-26)

---

## Confirmation Result

Mayurika / HR owner confirmed on 2026-06-26 that the uploaded staff roster CSV (SRC-STAFF-001) contains active staff only.

| Prior Status | New Status |
|---|---|
| CONDITIONAL PASS — HR confirmation required | READY — HR-Confirmed Active Staff Roster Evidence |

---

## What Can Now Be Used

| Use | Basis |
|-----|-------|
| Active staff aggregate count (125 staff rows) | SRC-STAFF-001 confirmed active by SRC-MAYU-CONF-002 |
| Active staff location distribution (Jaffna 89, Nelliyadi 23, Chankanai 7, WFH 4) | SRC-STAFF-001 confirmed active by SRC-MAYU-CONF-002 |
| Active staff department/team distribution — with naming-variant caution | SRC-STAFF-001; normalization required before aggregation |
| Organization-structure validation support at aggregate level | SRC-STAFF-001 cross-referenced with SRC-MAYU-001, SRC-MAYU-002 |
| HR staff record completeness checks | SRC-STAFF-001 as evidence layer; HR decisions remain with Mayurika |

---

## What Still Cannot Be Used

| Prohibited Use | Reason |
|----------------|--------|
| Reporting-line authority or management hierarchy | Not established by a roster CSV |
| Final organization chart | Requires dedicated org-chart source and Management confirmation |
| Admin Manager authority | [VERIFY] items 1–5 remain open; awaiting SRC-ADMIN-001 |
| KPI or AXIOM performance status | Not in scope of staff roster data |
| HR policy or entitlement rules | Source of policy is SRC-POLICY-001, not staff roster |
| Salary or compensation data | Out of scope for this AIOS at all times |
| Parent AIOS truth | Requires full Management Team / domain owner sign-off |

---

## Safety Check

| Check | Result |
|-------|--------|
| Full staff names copied into context files? | NO — aggregate use only; no names reproduced in any file |
| HR decision made based on this confirmation? | NO |
| Reporting authority created? | NO |
| [VERIFY] items 1–5 (Admin Manager) affected? | NO — remain open; awaiting SRC-ADMIN-001 |
| Any other [VERIFY] item resolved? | NO — this confirmation is scoped to active-staff status only |
| Policy changed? | NO |
| Sensitive personal data exposed? | NO — aggregate summaries only in all output files |
| Sensitivity level of SRC-STAFF-001 changed? | NO — remains HIGH / Sensitive Internal Staff Data |

---

## Files Updated by This Confirmation

| File | Change |
|------|--------|
| evidence/stakeholder-confirmations/mayurika-active-staff-roster-confirmation-2026-06-26.md | Created — SRC-MAYU-CONF-002 confirmation note |
| evidence/source-register.md | SRC-STAFF-001 status updated to READY — HR-Confirmed; SRC-MAYU-CONF-002 row added; total updated to 18 |
| validation/staff-roster-raw-source-check.md | Status updated to PASS; HR Active Staff Confirmation section added; Warnings #1 and #8 marked resolved; remaining 6 warnings preserved |
| validation/staff-roster-active-confirmation-impact-check.md | This file — created |

---

## Remaining Data Quality Warnings (not resolved by confirmation)

1. Leading space in Designation column header — parsers must strip whitespace
2. 10 year-separator rows in data body — exclude from staff counts
3. Embedded sub-header rows ("Department / Team" and `O/Emp.No.` as data values) — exclude from analysis
4. Department naming inconsistencies — normalization required; canonical names not yet confirmed
5. 2 rows missing Location — requires HR clarification
6. 1 row missing Designation — requires HR clarification or correction

---

## Pass/Fail Rule

| Scenario | Result |
|----------|--------|
| Active-staff confirmation captured without expanding authority | PASS |
| Roster treated as final organization authority or policy | FAIL |
| Full staff names copied into context or summary files | FAIL |

**Result: PASS**

---

## Next Action
Obtain canonical department/team name list from HR/Management to resolve Warning #4 (department naming inconsistencies). Only after canonical names are confirmed should context/organization-structure.md be updated to reflect staff distribution from SRC-STAFF-001.

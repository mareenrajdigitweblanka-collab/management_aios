---
name: staff-roster-department-canonical-confirmation-batch-check
type: validation
sources: SRC-STAFF-001, SRC-MAYU-CONF-002, SRC-MAYU-CONF-003, SRC-MAYU-CONF-004
created: 2026-06-26
status: PASS
---

# Staff Roster Department Canonical Confirmation Batch Check

## Status

**PASS** — HR confirmed all remaining department/team variant groups as same-meaning groups (SRC-MAYU-CONF-004, 2026-06-26). PH canonical mapping captured correctly. DWL 151 row-level correction recorded. Raw CSV unchanged.

---

## Sources

- SRC-STAFF-001 — DigitWebLanka HR-confirmed active staff roster CSV
- SRC-MAYU-CONF-002 — Mayurika active-staff status confirmation (2026-06-26)
- SRC-MAYU-CONF-003 — Mayurika canonical name confirmation: eBay, Technical Team (2026-06-26)
- SRC-MAYU-CONF-004 — Mayurika canonical name confirmation: all remaining groups + PH correction + DWL 151 row correction (2026-06-26)

---

## Confirmation Result

HR confirmed all remaining department/team variant groups from handover/staff-roster-department-canonical-confirmation-request.md as same-meaning groups, with:

- **PH** as the canonical name for Portfolio team / portfolio team / PH / Portfolio holders
- One row-level correction for DWL 151: Amazon PPC → Amazon and CPPC

---

## Critical Canonical Mapping

| Values Found / Meaning Group | Confirmed Canonical Name | Source |
|---|---|---|
| Portfolio team / portfolio team / PH / Portfolio holders | **PH** | SRC-MAYU-CONF-004 |

Boundary: Do not use Portfolio Team as the canonical name. PH is the HR-confirmed default.

---

## Full Confirmed Mapping Summary

### Previously confirmed (SRC-MAYU-CONF-003)

| Values Found | Confirmed Canonical Name | Source |
|---|---|---|
| EBAY / EBay / Ebay / eBay | eBay | SRC-MAYU-CONF-003 |
| Technical / Technical Team / Technical team | Technical Team | SRC-MAYU-CONF-003 |

### Newly confirmed — Priority 1

| Values Found | Confirmed Canonical Name | Source |
|---|---|---|
| Portfolio team / portfolio team / PH / Portfolio holders | PH | SRC-MAYU-CONF-004 |
| Digital Marketing / Digital marketing | Digital Marketing | SRC-MAYU-CONF-004 |
| Amazon / Amazon PPC | Amazon and CPPC | SRC-MAYU-CONF-004 |
| Management | Management | SRC-MAYU-CONF-004 |
| CPPC | CPPC | SRC-MAYU-CONF-004 |

### Newly confirmed — Priority 2 (Intern groupings)

| Values Found | Confirmed Canonical Name | Source |
|---|---|---|
| Intern - PH | Intern - PH | SRC-MAYU-CONF-004 |
| Intern - Automation Technical | Intern - Automation Technical | SRC-MAYU-CONF-004 |
| Intern - eBay | Intern - eBay | SRC-MAYU-CONF-004 |
| Intern -merchandizing | Intern - Merchandising | SRC-MAYU-CONF-004 |
| Software intern | Software intern | SRC-MAYU-CONF-004 |

### Newly confirmed — Priority 3

| Values Found | Confirmed Canonical Name | Source |
|---|---|---|
| Development team / Development / Developing | Development team | SRC-MAYU-CONF-004 |
| Customer Service Team / Customer service team / CST | Customer Service Team | SRC-MAYU-CONF-004 |
| Automation Technical (IOT) / Automation Technical / Automation Technical-rejoiner | Automation Technical | SRC-MAYU-CONF-004 |
| Data Analysis / Data Analysis(nelliyadi) | Data Analysis | SRC-MAYU-CONF-004 |
| Accounts / Accounts department / Accountant | Accounts | SRC-MAYU-CONF-004 |
| merchandising / Merchadising / Intern -merchandizing | merchandising | SRC-MAYU-CONF-004 |

### Newly confirmed — Priority 4

| Values Found | Confirmed Canonical Name | Source |
|---|---|---|
| Website team | Website Team | SRC-MAYU-CONF-004 |
| Postage | Postage | SRC-MAYU-CONF-004 |
| Graphic Designing | Graphic Designing | SRC-MAYU-CONF-004 |
| IT team | IT Team | SRC-MAYU-CONF-004 |
| SEO Specialist | SEO Specialist | SRC-MAYU-CONF-004 |

### Newly confirmed — Priority 5

| Values Found | Confirmed Canonical Name | Source |
|---|---|---|
| ledsone canada/USA / Ledsone canada | ledsone canada/USA | SRC-MAYU-CONF-004 |
| Wayfair/Temu | Wayfair/Temu | SRC-MAYU-CONF-004 |

---

## Row-Level Correction

| Employee ID | Current CSV Value | Corrected Value | Source |
|---|---|---|---|
| DWL 151 | Amazon PPC | Amazon and CPPC | SRC-MAYU-CONF-004 |

Raw CSV unchanged. Correction is recorded as HR-confirmed evidence only.

---

## What Can Now Be Used

- Confirmed department/team normalization for all 21 variant groups
- Aggregate department/team analysis using confirmed canonical names
- Department-level staff distribution using confirmed normalization and DWL 151 row correction
- Organization-structure validation support at aggregate level
- Future cleaned staff roster planning (do not create cleaned master yet — await explicit instruction)

---

## What Still Cannot Be Used

- Reporting-line authority
- Final organization chart approval
- Admin Manager authority — [VERIFY] items 1–5 remain open; awaiting SRC-ADMIN-001
- KPI or AXIOM performance status
- HR policy truth
- Parent AIOS truth
- Groups where "canonical casing may need HR final formatting" must not be treated as final casing until confirmed

---

## Safety Check

| Check | Result |
|---|---|
| Raw CSV changed? | NO — unchanged |
| Full staff names copied into any file? | NO — aggregate use only |
| Reporting authority created? | NO |
| context/organization-structure.md updated? | NO — not updated in this step |
| Project-level [VERIFY] items resolved? | NO — none resolved |
| Policy changed? | NO |
| Automation added? | NO |
| Portfolio Team used as canonical name? | NO — PH confirmed as canonical |
| DWL 151 correction treated as raw data change? | NO — evidence only |
| Admin Manager [VERIFY] items 1–5 affected? | NO — remain open |

---

## Pass/Fail Rule

| Scenario | Result |
|---|---|
| HR confirmation captured, PH canonical mapping correct, row correction recorded without raw CSV change | PASS |
| Raw CSV overwritten | FAIL |
| Portfolio Team used as canonical name | FAIL |
| Department normalization treated as reporting authority | FAIL |
| Staff names copied into context or validation files | FAIL |

**Result: PASS**

---

## Next Action

Obtain HR final formatting confirmation for groups marked "canonical casing may need HR final formatting" before creating a cleaned staff roster view. Priority for casing confirmation: Digital Marketing, Development team, Customer Service Team, Automation Technical, Accounts, merchandising, Website Team, IT Team, ledsone canada/USA.

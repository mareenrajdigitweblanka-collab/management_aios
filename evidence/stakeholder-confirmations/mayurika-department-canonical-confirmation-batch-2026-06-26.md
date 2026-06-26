---
name: mayurika-department-canonical-confirmation-batch-2026-06-26
type: stakeholder-confirmation
source-id: SRC-MAYU-CONF-004
related-sources: SRC-STAFF-001, SRC-MAYU-CONF-002, SRC-MAYU-CONF-003
confirmed-by: Mayurika / HR owner
confirmation-date: 2026-06-26
status: CONFIRMED
sensitivity: Internal
---

# Mayurika Confirmation — Staff Roster Department Canonical Names Batch

## Source ID
SRC-MAYU-CONF-004

## Related Sources
- SRC-STAFF-001
- SRC-MAYU-CONF-002
- SRC-MAYU-CONF-003

## Confirmation Topic
Remaining department/team canonical name confirmation and one row-level correction.

## Confirmed By
Mayurika / Mayuri — HR owner

## Confirmation Date
2026-06-26

## Confirmed Statement
HR confirmed that the remaining department/team variant groups listed in handover/staff-roster-department-canonical-confirmation-request.md have the same meaning within each listed group and may be normalized for aggregate staff roster analysis.

---

## Critical Canonical Name Correction

HR confirmed:

| Values Found / Meaning Group | HR-Confirmed Canonical Name | Status |
|---|---|---|
| Portfolio team / portfolio team / PH / Portfolio holders | PH | CONFIRMED |

**Boundary:** Do not use Portfolio Team as the canonical name. The HR-confirmed default canonical name is PH.

---

## Previously Confirmed Groups

| Values Found | Confirmed Canonical Name | Source |
|---|---|---|
| EBAY / EBay / Ebay / eBay | eBay | SRC-MAYU-CONF-003 |
| Technical / Technical Team / Technical team | Technical Team | SRC-MAYU-CONF-003 |

---

## Newly Confirmed Batch

All remaining groups from the confirmation request are confirmed as same-meaning groups by SRC-MAYU-CONF-004. For groups where canonical casing was not explicitly specified by HR, the safest available label is used with a notation that formatting confirmation may be needed.

### Priority 1 — Largest Groups

| Values Found | Confirmed Canonical Name | Status |
|---|---|---|
| Portfolio team / portfolio team / PH / Portfolio holders | PH | CONFIRMED — HR confirmed PH is the default canonical name; do not use Portfolio Team |
| Digital Marketing / Digital marketing | Digital Marketing | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting |
| Amazon / Amazon PPC | Amazon and CPPC | CONFIRMED SAME-MEANING GROUP — HR-confirmed correct label is Amazon and CPPC; see also DWL 151 row-level correction below |
| Management | Management | CONFIRMED |
| CPPC | CPPC | CONFIRMED — abbreviation confirmed as used |

### Priority 2 — Intern Groupings

| Values Found | Confirmed Canonical Name | Status |
|---|---|---|
| Intern - PH | Intern - PH | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting |
| Intern - Automation Technical | Intern - Automation Technical | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting |
| Intern - eBay | Intern - eBay | CONFIRMED SAME-MEANING GROUP |
| Intern -merchandizing | Intern - Merchandising | CONFIRMED SAME-MEANING GROUP — Intern -merchandizing is intern variant; canonical casing may need HR final formatting |
| Software intern | Software intern | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting |

### Priority 3 — Ambiguous / Multi-Variant Groups

| Values Found | Confirmed Canonical Name | Status |
|---|---|---|
| Development team / Development / Developing | Development team | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting; Developing appears to be a data entry variant |
| Customer Service Team / Customer service team / CST | Customer Service Team | CONFIRMED SAME-MEANING GROUP — CST is abbreviation of same team |
| Automation Technical (IOT) / Automation Technical / Automation Technical-rejoiner | Automation Technical | CONFIRMED SAME-MEANING GROUP — (IOT) and -rejoiner are data entry variants, not separate teams; canonical casing may need HR final formatting |
| Data Analysis / Data Analysis(nelliyadi) | Data Analysis | CONFIRMED SAME-MEANING GROUP — nelliyadi is a location tag, not part of canonical team name |
| Accounts / Accounts department / Accountant | Accounts | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting |
| merchandising / Merchadising / Intern -merchandizing | merchandising | CONFIRMED SAME-MEANING GROUP — Merchadising is a typo; Intern -merchandizing is intern subgroup; canonical casing may need HR final formatting |

### Priority 4 — Single Variants Requiring Label Confirmation

| Values Found | Confirmed Canonical Name | Status |
|---|---|---|
| Website team | Website Team | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting |
| Postage | Postage | CONFIRMED |
| Graphic Designing | Graphic Designing | CONFIRMED |
| IT team | IT Team | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting |
| SEO Specialist | SEO Specialist | CONFIRMED SAME-MEANING GROUP — note: may be a role title entered as a team/department name; use with caution; team placement may need further HR clarification |

### Priority 5 — External / Specialist Entries

| Values Found | Confirmed Canonical Name | Status |
|---|---|---|
| ledsone canada/USA / Ledsone canada | ledsone canada/USA | CONFIRMED SAME-MEANING GROUP — canonical casing may need HR final formatting |
| Wayfair/Temu | Wayfair/Temu | CONFIRMED |

---

## Row-Level Correction

| Employee ID | Current CSV Department Value | HR-Confirmed Correct Value | Boundary |
|---|---|---|---|
| DWL 151 | Amazon PPC | Amazon and CPPC | Correction evidence only; raw CSV unchanged |

Do not include full staff name in this record. Raw CSV must not be edited.

---

## Use Decision

SRC-MAYU-CONF-004 may be used for:
- department/team normalization of SRC-STAFF-001
- aggregate department/team analysis
- staff roster data quality correction mapping
- future cleaned staff roster planning

---

## Limits

This confirmation does not prove:
- reporting-line authority
- Admin Manager authority
- KPI/performance status
- HR policy
- salary or private data
- final organization chart approval
- parent AIOS truth

---

## Raw Data Boundary

The raw CSV remains unchanged.
Any corrected or normalized view must cite SRC-MAYU-CONF-004 and must not overwrite the raw evidence.

---

## Sensitivity Boundary

SRC-STAFF-001 contains sensitive internal staff data.
Use aggregate summaries only unless full staff names are explicitly needed and approved.

---

## Pass/Fail Rule

PASS if confirmed mappings and the DWL 151 correction are used only for normalization and correction evidence.
FAIL if the raw CSV is overwritten or this confirmation is used as reporting authority.

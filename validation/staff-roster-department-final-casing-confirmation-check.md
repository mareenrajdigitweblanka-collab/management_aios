---
name: staff-roster-department-final-casing-confirmation-check
type: validation
source-id: SRC-MAYU-CONF-006
related-sources: SRC-STAFF-001, SRC-MAYU-CONF-002, SRC-MAYU-CONF-003, SRC-MAYU-CONF-004, SRC-MAYU-CONF-005
created: 2026-06-26
status: PASS
---

# Staff Roster Department Final Casing Confirmation Check

## Status

PASS — All 13 pending display-name/casing labels confirmed by Mayurika / HR owner (SRC-MAYU-CONF-006, 2026-06-26). All 22 variant groups now have both meaning and final display name confirmed. Casing-pending count is 0. All preserved corrections intact.

---

## Source

SRC-MAYU-CONF-006 — Mayurika / HR owner confirmation, 2026-06-26
`evidence/stakeholder-confirmations/mayurika-department-final-casing-confirmation-2026-06-26.md`

---

## Final Display Names Confirmed

Total confirmed by SRC-MAYU-CONF-006: 13

| # | Meaning Group | HR-Confirmed Final Display Name | Result |
| --- | --- | --- | --- |
| 1 | Digital Marketing / Digital marketing | Digital Marketing | CONFIRMED |
| 2 | Development team / Development / Developing | Development team | CONFIRMED |
| 3 | Accounts / Accounts department / Accountant | Accounts | CONFIRMED |
| 4 | merchandising / Merchadising / Intern -merchandizing | merchandising | CONFIRMED |
| 5 | Website team | Website Team | CONFIRMED |
| 6 | IT team | IT Team | CONFIRMED |
| 7 | ledsone canada/USA / Ledsone canada | ledsone canada/USA | CONFIRMED |
| 8 | Automation Technical (IOT) / Automation Technical / Automation Technical-rejoiner | Automation Technical | CONFIRMED — (IOT) suffix excluded |
| 9 | Intern - PH | Intern - PH | CONFIRMED |
| 10 | Intern - Automation Technical | Intern - Automation Technical | CONFIRMED |
| 11 | Intern -merchandizing | Intern - Merchandising | CONFIRMED |
| 12 | Software intern | Software intern | CONFIRMED |
| 13 | SEO Specialist | SEO Specialist | CONFIRMED — team label accepted as-is |

---

## Remaining Casing-Pending Labels

Count: 0 — no casing-pending labels remain.

---

## All Confirmed Display Names (Complete Reference)

All 22 variant groups confirmed across SRC-MAYU-CONF-003 through SRC-MAYU-CONF-006:

| Final Display Name | Primary Meaning Source | Display Name Source |
| --- | --- | --- |
| eBay | SRC-MAYU-CONF-003 | SRC-MAYU-CONF-003 |
| Technical Team | SRC-MAYU-CONF-003 | SRC-MAYU-CONF-003 |
| PH | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| Amazon | SRC-MAYU-CONF-005 | SRC-MAYU-CONF-005 |
| Amazon and CPPC | SRC-MAYU-CONF-005 | SRC-MAYU-CONF-005 |
| Management | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| CPPC | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| Intern - eBay | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| Customer Service Team | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| Data Analysis | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| Postage | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| Graphic Designing | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| Wayfair/Temu | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-004 |
| Digital Marketing | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| Development team | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| Accounts | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| merchandising | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| Website Team | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| IT Team | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| ledsone canada/USA | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| Automation Technical | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| Intern - PH | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| Intern - Automation Technical | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| Intern - Merchandising | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| Software intern | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |
| SEO Specialist | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-006 |

---

## Preserved Corrections

| Correction | Value | Source | Status |
| --- | --- | --- | --- |
| Amazon remains separate from Amazon PPC | Amazon → Amazon | SRC-MAYU-CONF-005 | PRESERVED |
| Amazon PPC normalizes to Amazon and CPPC | Amazon PPC → Amazon and CPPC | SRC-MAYU-CONF-005 | PRESERVED |
| PH is canonical for Portfolio/PH group | Portfolio team / PH / Portfolio holders → PH | SRC-MAYU-CONF-004 | PRESERVED |
| DWL 151 row-level correction | Amazon PPC → Amazon and CPPC | SRC-MAYU-CONF-004 | PRESERVED |
| Raw CSV unchanged | n/a | n/a | CONFIRMED |

---

## What Can Now Be Used

- Confirmed normalized department/team display names for all 22 variant groups
- Aggregate department/team distribution report (when explicitly instructed)
- Organization-structure validation support at aggregate level (when explicitly instructed)
- Future cleaned staff roster planning (not yet created — requires explicit instruction)

---

## What Still Cannot Be Used

- Reporting-line authority
- Final organization chart approval
- Admin Manager authority or escalation chains
- KPI or performance status
- HR policy
- Salary or private data
- Parent AIOS truth

---

## Safety Check

| Check | Result |
| --- | --- |
| Raw CSV changed? | NO — unchanged |
| Cleaned roster created? | NO — not created; requires explicit instruction |
| Staff names copied into any file? | NO — aggregate use only |
| context/organization-structure.md updated? | NO — not touched |
| Reporting authority created? | NO |
| Meaning mappings changed? | NO — all meaning groups from SRC-MAYU-CONF-003/004/005 unchanged |
| Amazon mapping changed? | NO — preserved as SRC-MAYU-CONF-005 |
| PH canonical mapping changed? | NO — preserved as SRC-MAYU-CONF-004 |
| DWL 151 correction removed or altered? | NO — preserved |
| Project-level [VERIFY] items resolved? | NO — all 12 remain open |
| Admin Manager [VERIFY] items 1–5 affected? | NO — remain open |
| Policy changed? | NO |
| Parent AIOS truth updated? | NO |

---

## Pass/Fail Rule

| Scenario | Result |
| --- | --- |
| All 13 display names confirmed; meaning groups unchanged; raw data unchanged | PASS |
| Any confirmed meaning mapping changed | FAIL |
| Raw CSV changed | FAIL |
| Cleaned roster created before explicit instruction | FAIL |
| Confirmation used as reporting authority or policy truth | FAIL |
| Amazon or PH mapping altered | FAIL |

Result: PASS

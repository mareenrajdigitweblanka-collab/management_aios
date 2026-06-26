---
name: mayurika-department-canonical-name-confirmation
type: stakeholder-confirmation
source-id: SRC-MAYU-CONF-003
related-source: SRC-STAFF-001
confirmed-by: Mayurika / HR owner
confirmation-date: 2026-06-26
created: 2026-06-26
status: READY — HR Owner Confirmed
---

# Mayurika Confirmation — Department / Team Canonical Names

## Source ID

SRC-MAYU-CONF-003

## Related Source

SRC-STAFF-001

## Confirmation Topic

Department/team naming normalization for active staff roster (SRC-STAFF-001).

## Confirmed Statement

HR / Mayurika confirmed the following department/team canonical name mappings for the active staff roster:

| Values Found in CSV | Confirmed Canonical Name | Confirmation Status |
|---------------------|--------------------------|---------------------|
| EBAY / EBay / Ebay / eBay | eBay | CONFIRMED |
| Technical / Technical Team / Technical team | Technical Team | CONFIRMED |

## Confirmed By

Mayurika / Mayuri — HR owner (HR Officer)

## Confirmation Date

2026-06-26

## Confirmation Method

Direct confirmation from Mayurika / HR owner as relayed in project session — 2026-06-26.

---

## Use Decision

These confirmed mappings may be used for:

- Staff roster department/team normalization (eBay and Technical Team groups only)
- Aggregate department/team count for these two groups
- Organization-structure validation support for these two groups
- Cross-referencing staff against these two confirmed department labels

All other department/team variant groups remain unconfirmed. See [validation/staff-roster-department-normalization-plan.md](../../validation/staff-roster-department-normalization-plan.md) for the full unconfirmed list.

---

## Limits

This confirmation does not prove or grant:

- Canonical names for any department/team group not listed above
- Final reporting-line authority or management hierarchy
- Admin Manager authority — [VERIFY] items 1–5 remain open; awaiting SRC-ADMIN-001
- KPI or AXIOM performance status
- HR policy or entitlement rules
- Salary or compensation information
- Final organization chart approval
- Parent AIOS truth or v0.2 promotion

---

## Sensitivity Boundary

SRC-STAFF-001 contains sensitive internal staff data. This confirmation does not change the sensitivity level of SRC-STAFF-001.

Use aggregate summaries unless full names are explicitly required and approved by the HR owner. Do not copy full staff name lists into context or summary files.

---

## Pass/Fail Rule

PASS if only the two confirmed mappings (eBay, Technical Team) are treated as canonical.
FAIL if unconfirmed department/team values are normalized without further HR confirmation.

## Next Step

1. Update evidence/source-register.md — register SRC-MAYU-CONF-003.
2. Update validation/staff-roster-department-normalization-plan.md — mark eBay and Technical Team rows as CONFIRMED.
3. Create validation/staff-roster-department-canonical-confirmation-check.md.
4. Do not update context/organization-structure.md until all department naming variants are confirmed or a sufficient critical mass of confirmations allows a safe partial update.

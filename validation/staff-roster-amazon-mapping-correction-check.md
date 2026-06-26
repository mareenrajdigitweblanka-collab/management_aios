---
name: staff-roster-amazon-mapping-correction-check
type: validation
source-id: SRC-MAYU-CONF-005
related-sources: SRC-STAFF-001, SRC-MAYU-CONF-004
created: 2026-06-26
status: PASS
---

# Staff Roster Amazon Mapping Correction Check

## Status

**PASS** — Amazon mapping correction applied and captured correctly. Amazon and Amazon PPC are recorded as separate confirmed normalized values. The incorrect combined mapping has been removed from all active documents.

---

## Source

SRC-MAYU-CONF-005 — Mayurika verbal correction, 2026-06-26
`evidence/stakeholder-confirmations/mayurika-department-final-casing-and-amazon-correction-2026-06-26.md`

---

## Correction Captured

| CSV Value | Correct Normalized Value | Result |
|---|---|---|
| Amazon | Amazon | CONFIRMED — separate department; not grouped with Amazon PPC |
| Amazon PPC | Amazon and CPPC | CONFIRMED — Amazon PPC normalizes to Amazon and CPPC |

---

## Incorrect Mapping Removed

The following incorrect combined mapping from SRC-MAYU-CONF-004 has been superseded and must not appear in any cleaned roster view, distribution report, or aggregate analysis:

| Incorrect Combined Mapping | Source It Appeared In | Superseded By |
|---|---|---|
| Amazon / Amazon PPC → Amazon and CPPC | SRC-MAYU-CONF-004 | SRC-MAYU-CONF-005 |

**Confirmed removed from:**

- validation/staff-roster-department-normalization-plan.md — combined row replaced with two separate confirmed rows
- handover/staff-roster-department-final-casing-confirmation-request.md — table updated; correction note added
- validation/staff-roster-department-final-casing-request-check.md — correction note added; confirmed entries updated

---

## DWL 151 Row-Level Correction Preserved

| Employee ID | CSV Value | Correct Normalized Value | Source | Status |
|---|---|---|---|---|
| DWL 151 | Amazon PPC | Amazon and CPPC | SRC-MAYU-CONF-004 | PRESERVED — unaffected by this correction |

The DWL 151 correction remains valid. Amazon PPC → Amazon and CPPC is correct for this specific row. The Amazon mapping correction only affects normalization group rules, not this row-level correction.

---

## Safety Check

| Check | Result |
|---|---|
| Raw CSV changed? | NO — unchanged |
| Staff names copied into any file? | NO — aggregate use only |
| Cleaned staff roster created? | NO — not created |
| context/organization-structure.md updated? | NO — not touched |
| Reporting authority created? | NO |
| Project-level [VERIFY] items resolved? | NO — all 12 remain open |
| Policy changed? | NO |
| PH mapping changed? | NO — preserved as confirmed |
| DWL 151 correction removed or altered? | NO — preserved |
| eBay / Technical Team / other confirmed mappings changed? | NO — all preserved |
| Admin Manager [VERIFY] items 1–5 affected? | NO — remain open |
| Parent AIOS truth updated? | NO |
| Reporting authority or organization chart created? | NO |

---

## Files Updated by This Correction

| File | Change Made |
|---|---|
| evidence/stakeholder-confirmations/mayurika-department-final-casing-and-amazon-correction-2026-06-26.md | CREATED — correction confirmation evidence (SRC-MAYU-CONF-005) |
| evidence/source-register.md | UPDATED — SRC-MAYU-CONF-005 registered; SRC-MAYU-CONF-004 note updated |
| validation/staff-roster-department-normalization-plan.md | UPDATED — combined Amazon row replaced with two separate confirmed rows; correction note added |
| handover/staff-roster-department-final-casing-confirmation-request.md | UPDATED — table corrected; correction note section added |
| validation/staff-roster-department-final-casing-request-check.md | UPDATED — correction note added; confirmed entries updated; next action updated |
| validation/staff-roster-amazon-mapping-correction-check.md | CREATED — this file |

---

## Pass/Fail Rule

| Scenario | Result |
|---|---|
| Amazon and Amazon PPC recorded as separate confirmed normalized values | PASS |
| Amazon grouped under Amazon and CPPC | FAIL |
| Combined mapping `Amazon / Amazon PPC → Amazon and CPPC` used in any cleaned view | FAIL |
| Raw CSV changed | FAIL |
| DWL 151 correction removed | FAIL |
| Reporting authority or organization chart created from this correction | FAIL |

**Result: PASS**

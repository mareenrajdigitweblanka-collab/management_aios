---
name: mayurika-department-final-casing-and-amazon-correction-2026-06-26
type: stakeholder-confirmation
source-id: SRC-MAYU-CONF-005
related-sources: SRC-STAFF-001, SRC-MAYU-CONF-002, SRC-MAYU-CONF-003, SRC-MAYU-CONF-004
confirmed-by: Mayurika / HR owner
confirmation-date: 2026-06-26
status: CONFIRMED
sensitivity: Internal
---

# Mayurika Confirmation — Final Casing and Amazon Mapping Correction

## Source ID
SRC-MAYU-CONF-005

## Related Sources
- SRC-STAFF-001
- SRC-MAYU-CONF-002
- SRC-MAYU-CONF-003
- SRC-MAYU-CONF-004

## Confirmation Topic
Final department display-name confirmation and Amazon / Amazon PPC mapping correction.

## Confirmed By
Mayurika / Mayuri — HR owner

## Confirmation Date
2026-06-26

---

## Corrected Amazon Mapping

HR confirmed the following two-row mapping. These are separate normalized values, not a combined group:

| CSV Value / Meaning Group | HR-Confirmed Normalized Value | Status |
|---|---|---|
| Amazon | Amazon | CONFIRMED |
| Amazon PPC | Amazon and CPPC | CONFIRMED |

---

## Incorrect Mapping Rejected

The following mapping is incorrect and must not be used in any cleaned roster view, distribution report, or aggregate analysis:

| Incorrect Mapping | Reason |
|---|---|
| Amazon / Amazon PPC → Amazon and CPPC | Amazon and Amazon PPC are not the same normalized value. Amazon remains Amazon; Amazon PPC normalizes to Amazon and CPPC. Grouping them together misrepresents the department structure. |

This incorrect mapping appeared in SRC-MAYU-CONF-004 due to a same-meaning group interpretation that has now been verbally corrected by HR. SRC-MAYU-CONF-005 supersedes the Amazon-group row in SRC-MAYU-CONF-004 for normalization purposes only. All other SRC-MAYU-CONF-004 mappings remain unchanged.

---

## Existing Confirmed Mappings Preserved

The following mappings from prior confirmations remain unchanged and are not affected by this correction:

| Meaning Group | Confirmed Canonical Name | Source |
|---|---|---|
| EBAY / EBay / Ebay / eBay | eBay | SRC-MAYU-CONF-003 |
| Technical / Technical Team / Technical team | Technical Team | SRC-MAYU-CONF-003 |
| Portfolio team / portfolio team / PH / Portfolio holders | PH | SRC-MAYU-CONF-004 |
| Management | Management | SRC-MAYU-CONF-004 |
| CPPC | CPPC | SRC-MAYU-CONF-004 |

**DWL 151 row-level correction preserved:** DWL 151's CSV value of Amazon PPC correctly normalizes to Amazon and CPPC (SRC-MAYU-CONF-004). This correction is unaffected — Amazon PPC → Amazon and CPPC is correct for this row.

**Raw CSV boundary:** The raw CSV remains unchanged. This correction affects only the normalization mapping rules and any future cleaned roster or aggregate views.

---

## Use Decision

SRC-MAYU-CONF-005 may be used for:
- correcting the Amazon / Amazon PPC normalization rule in validation/staff-roster-department-normalization-plan.md
- confirming that Amazon and Amazon PPC are separate canonical department values
- final department display-name/casing confirmation where provided by HR
- aggregate department/team analysis after normalization is applied

---

## Limits

This confirmation does not prove:
- reporting-line authority between Amazon and Amazon PPC teams
- final organization chart approval
- Admin Manager authority
- KPI or performance status
- HR policy
- salary or private data
- parent AIOS truth

---

## Raw Data Boundary

The raw CSV remains unchanged.
Any normalized view must cite SRC-MAYU-CONF-005 for the Amazon correction and must treat Amazon and Amazon PPC as separate canonical department entries.

---

## Pass/Fail Rule

PASS if Amazon and Amazon PPC are treated as separate normalized mappings in all future cleaned views and reports.
FAIL if Amazon is incorrectly grouped into Amazon and CPPC.
FAIL if the combined mapping `Amazon / Amazon PPC → Amazon and CPPC` is used from this point forward.

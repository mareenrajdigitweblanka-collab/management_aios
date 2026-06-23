---
name: confidentiality-rules
type: context
source-ids: SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001
created: 2026-06-23
last-updated: 2026-06-23
status: PASS — Foundation Draft v0.1
---

# Confidentiality Rules

**Pass/Fail Rule:** PASS if all confidentiality rules in this file trace to SRC-VAR-001 or SRC-MAYU-001. FAIL if any new data handling rule, sensitive data storage permission, or access control change is added without a registered source and explicit MD + HR owner approval.

---

## Default Position

*(Source: SRC-VAR-001 — sensitivity guidance)*

No individually identifiable sensitive HR data may be stored in this AIOS unless explicitly approved by the MD and the HR owner with proper access control in place.

**Default to process-level and aggregate information only.**

---

## Forbidden Data Types

The following data types are out of scope for this AIOS under all circumstances unless the exception conditions are met:

| Data Type | Rule | Exception |
|-----------|------|-----------|
| Individually identifiable HR data | Not stored | Requires explicit MD + HR owner approval with access control |
| Salary and compensation data | Out of scope at all times | None |
| Disciplinary case details | Not stored | Only aggregate compliance rates and process status are permissible |
| Health information | Not stored | None |
| Grievance details | Not stored | None |
| Private employee case details | Not stored | None |
| PDPA personal data (raw) | Not stored in this AIOS | Held by Mayurika under PDPA-controlled access |
| Individual performance band placements | Not stored | Aggregate and process-level only |
| Recruitment candidate personal data | Not stored | Process-level only |

---

## What Is Permissible

| Data Type | Rule | Source ID |
|-----------|------|-----------|
| Staff names in operational process context | Use role titles by default; names only where process requires identification | SRC-VAR-001 |
| Leave status flags | Process-level only (status flags, visibility); no personal health data | SRC-VAR-001 |
| PDPA compliance status | Existence and compliance status only | SRC-MAYU-001 |
| Performance band outcomes | Aggregate and process-level only | SRC-VAR-001 |
| Recruitment process status | Process-level only | SRC-VAR-001 |
| Disciplinary process status | Aggregate compliance rates and process status only | SRC-VAR-001 |

---

## PDPA Note

*(Source: SRC-MAYU-001)*

Mayurika is responsible for PDPA notice issuance and acknowledgement tracking for all staff. Personal email addresses held for records are kept under PDPA-controlled access. This AIOS does not store PDPA personal data directly.

---

## Access Control Requirement

*(Source: SRC-VAR-001)*

Any expansion of data storage in this AIOS beyond the permissible categories listed above requires:

1. Explicit approval from the MD
2. Explicit approval from the HR owner (Mayurika)
3. Proper access control measures in place before storage begins

No approval may be inferred, assumed, or granted by Mareenraj or the assistant alone.

---

## Salary Confidentiality — Employee Obligation

*(Source: SRC-POLICY-001 §2.0 — Final Approved)*

Employees are prohibited from sharing or discussing their individual salaries, bonuses, or allowances with other employees. This is a company policy rule at the employee conduct level and is consistent with the AIOS rule that salary and compensation data are out of scope for this system at all times.

---

## Confidentiality Obligation — Company Policy Level

*(Source: SRC-POLICY-001 §14.0 — Final Approved)*

Employees must protect sensitive information including staff personal data, customer data, company information, financial records, and proprietary details. Failure to comply may result in disciplinary action or legal consequences. This formalises the confidentiality framework established in SRC-VAR-001 at the company policy level.

---

## Digital Assets — Confidentiality and Ownership

*(Source: SRC-POLICY-001 §11.0 — Final Approved)*

All digital assets are private and confidential. They must not be disclosed, shared, or accessed by anyone other than designated personnel with proper authorisation. All digital assets created by employees during employment are the sole property of the company. Employees cannot claim ownership of digital assets created for the company's use.

---

## Source IDs Used in This File

| Claim Area | Source ID | Status |
|------------|-----------|--------|
| Sensitivity guidance and forbidden data categories | SRC-VAR-001 | CONFIRMED |
| PDPA note and Mayurika's custodianship | SRC-MAYU-001 | CONFIRMED |
| Salary confidentiality — employee obligation to not discuss compensation | SRC-POLICY-001 | CONFIRMED |
| General confidentiality obligation — staff personal data, customer data, financial records, proprietary details | SRC-POLICY-001 | CONFIRMED |
| Digital assets — confidentiality, ownership, and non-disclosure | SRC-POLICY-001 | CONFIRMED |

---

## Pass/Fail Result

**PASS** — All confidentiality rules trace to SRC-VAR-001 or SRC-MAYU-001. No new data handling permissions added. No sensitive personal data included.

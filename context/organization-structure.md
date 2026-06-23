---
name: organization-structure
type: context
source-ids: SRC-MAYU-001, SRC-MAYU-002, SRC-ARUN-001, SRC-SUMAN-001-v2
created: 2026-06-23
status: CONDITIONAL PASS — Foundation Draft v0.1
---

# Organisation Structure Context

**Pass/Fail Rule:** PASS if every role, authority, and reporting claim in this file traces to a Source ID or carries [VERIFY]. FAIL if any Admin Manager authority, escalation chain, or approval right is stated without the [VERIFY] tag.

---

## Confirmed Role Hierarchy

*(Sources: SRC-MAYU-002 — org chart image; SRC-MAYU-001 — stakeholder document; SRC-ARUN-001 — PRC member list)*

| Level | Role | Source Confirmed? | Source ID |
|-------|------|-------------------|-----------|
| Executive | Managing Director (MD) | YES | SRC-MAYU-001, SRC-ARUN-001 |
| Executive | Director | YES | SRC-MAYU-001 |
| Manager | Admin Manager | [VERIFY — awaiting SRC-ADMIN-001] | SRC-ARUN-001 (PRC reference only) |
| Officer | HR Officer (Mayurika) | YES | SRC-MAYU-001 |
| Officer | Implementation Officer (Arun) | YES | SRC-ARUN-001 |
| Officer | Recruitment Officer (Suman) | YES | SRC-SUMAN-001-v2, SRC-MAYU-001 |
| Manager | Operational Manager | [VERIFY — SRC-ARUN-001 names role in PRC; full responsibilities not yet sourced] | SRC-ARUN-001 |
| Leader | Team Leaders (TLs) | YES | SRC-MAYU-001, SRC-ARUN-002 |
| Leader | Sub Team Leaders (STLs) | YES | SRC-MAYU-001 |
| Staff | Staff Members | YES | SRC-MAYU-001 |

---

## Admin Manager — Pending Status

**[VERIFY — awaiting SRC-ADMIN-001]**

The Admin Manager is named as a PRC member in SRC-ARUN-001. No documents from the Admin Manager have been received. The folder `intelligence-inbox/raw-stakeholder-documents/admin-manager/` exists but is empty.

The following are UNKNOWN until SRC-ADMIN-001 is received and reviewed:

- Authority scope
- Reporting line
- Approval rights
- Escalation responsibilities
- Operational responsibilities

No Admin Manager authority, escalation chain, or approval path may be assumed or stated in this AIOS until SRC-ADMIN-001 is received and registered.

---

## Operational Manager — [VERIFY] Limits

**[VERIFY — SRC-ARUN-001]**

The Operational Manager is named in the PRC member list (SRC-ARUN-001). Detailed responsibilities and reporting line have not been confirmed by a dedicated source. No claims about the Operational Manager's authority or responsibilities beyond PRC membership may be stated until confirmed.

---

## Key Authority Lines

*(Sources: SRC-MAYU-001, SRC-ARUN-001)*

| Authority | Held By | Source ID |
|-----------|---------|-----------|
| Canonical name spelling and team structure | Rajiv | SRC-MAYU-001 |
| AXIOM band placement | Arun (Implementation Officer) | SRC-MAYU-001, SRC-ARUN-001 |
| KPI definitions per role | Arun (Implementation Officer) | SRC-ARUN-001 |
| Staff records and PDPA compliance | Mayurika (HR Officer) | SRC-MAYU-001 |
| Recruitment pipeline and probation tracking | Suman (Recruitment Officer) | SRC-MAYU-001 |
| Leadership Review co-facilitation | Mayurika and the Director | SRC-MAYU-001 |
| Monthly ROI and HR governance reports (recipient) | MD | SRC-MAYU-001 |
| Quality and knowledge value assessment for SKILL files | Visali | SRC-MAYU-001 |

---

## Source IDs Used in This File

| Claim Area | Source ID | Status |
|------------|-----------|--------|
| Org chart structure | SRC-MAYU-002 | CONFIRMED |
| Role references (HR, Implementation, Recruitment, TLs, STLs) | SRC-MAYU-001 | CONFIRMED |
| PRC role list (MD, Implementation Officer, Admin Manager, TL, Operational Manager) | SRC-ARUN-001 | CONFIRMED (Admin Manager and Operational Manager [VERIFY]) |
| Recruitment Officer role | SRC-SUMAN-001-v2, SRC-MAYU-001 | CONFIRMED |
| Admin Manager source | SRC-ADMIN-001 | PENDING — all Admin Manager claims [VERIFY] |

---

## Pass/Fail Result

**CONDITIONAL PASS** — All confirmed claims trace to registered Source IDs. Admin Manager authority and Operational Manager full scope remain correctly tagged [VERIFY]. No unsourced authority or escalation path has been added.

---
name: rajiv-admin-workbench
type: member-workbench
created: 2026-07-07
member: Rajiv / Admin Manager
status: DRAFT_FROM_RAJIV_DOC
verification: NEEDS_RAJIV_OR_MD_CONFIRMATION
source-registration: NOT_REGISTERED
parent-aios-status: NOT_PARENT_TRUTH
dashboard-status: NOT_DASHBOARD_VISIBLE
---

> **WARNING: This workbench is a draft created from Rajiv Doc.md. It is not approved parent AIOS truth and must not be used as final authority until Rajiv/MD confirmation.**

# Rajiv / Admin Manager Workbench (DRAFT)

## 1. What This Is

A draft navigation/reference workbench for the Admin Manager domain, built from the first Admin Manager document ever received (`Rajiv Doc.md`). This mirrors the pattern already used for Mayurika, Suman, and Arun member workbenches, but with a mandatory draft/unconfirmed status because Rajiv has not yet reviewed or confirmed this content and is currently busy.

## 2. Why This Exists

`member-aios/rajiv-admin/` has been blocked/absent since the 2026-06-30 member-workbench build (see `handover/2026-06-30__member-aios-3-draft-workbench-closure.md`), pending SRC-ADMIN-001. Rajiv has now submitted a governance framework document, but is too busy for immediate confirmation. The user explicitly decided to build the draft workbench first and verify later, rather than wait. This file exists so Admin Manager domain content has a working reference point, clearly marked unconfirmed, instead of remaining fully blocked.

## 3. Source Used

- Raw source: `intelligence-inbox/raw-stakeholder-documents/admin-manager/Rajiv Doc.md`
- Intake candidate: `evidence/source-intake/admin-manager-governance-framework-source-intake-candidate-2026-07-07.md`
- Confirmation request (awaiting response): `evidence/stakeholder-confirmations/rajiv-admin-governance-framework-confirmation-request-2026-07-07.md`
- Intake validation: `validation/admin-manager-source-intake-check-2026-07-07.md`

## 4. Candidate Source ID

**SRC-ADMIN-001** — NOT_REGISTERED in `evidence/source-register.md` (remains status PENDING there).

## 5. Status

**DRAFT_FROM_RAJIV_DOC**

## 6. Verification

**NEEDS_RAJIV_OR_MD_CONFIRMATION** — no content in this workbench, or any file in `member-aios/rajiv-admin/`, may be treated as confirmed, final, or operational until Rajiv (and, for company-wide/overlapping sections, MD or the relevant domain owner) has reviewed and confirmed it in writing.

## 7. Business Questions Supported (Draft — Pending Confirmation)

- What is the Admin Manager's reporting line and organisational position? *(draft answer exists; not confirmed)*
- What decisions does the Admin Manager have approval authority over? *(draft answer exists; not confirmed — see governance-framework-draft-map.md)*
- What is the Admin Manager's role in escalation paths? *(draft answer exists; not confirmed)*
- What are the Admin Manager's day-to-day, weekly, and KPI-meeting responsibilities? *(draft answer exists; see admin-manager-responsibility-map-draft.md)*
- What company-wide governance content (departments, reporting chain, policies) does Rajiv's document introduce, and where does it overlap existing sources? *(see governance-framework-draft-map.md §"Duplicate/parent-truth risk")*

## 8. Main Admin Manager Areas (As Drafted From Rajiv Doc.md)

| Area | Draft Map Reference |
|---|---|
| Governance framework (purpose, principles) | governance-framework-draft-map.md |
| Department/reporting structure | governance-framework-draft-map.md |
| Approval authority matrix | governance-framework-draft-map.md — NEEDS_RAJIV_MD_CONFIRMATION |
| Escalation matrix | governance-framework-draft-map.md — NEEDS_RAJIV_MD_CONFIRMATION |
| KPI governance | governance-framework-draft-map.md — overlap with Arun KPI/PH domain, needs boundary review |
| ROI governance | governance-framework-draft-map.md |
| AI governance | governance-framework-draft-map.md |
| Operational policies | governance-framework-draft-map.md — overlap with SRC-POLICY-001, needs duplicate check |
| Accountability framework | governance-framework-draft-map.md |
| Governance meetings | governance-framework-draft-map.md |
| Management drift monitoring | governance-framework-draft-map.md |
| Admin Manager responsibilities | admin-manager-responsibility-map-draft.md |
| KPI/staff management responsibilities | admin-manager-responsibility-map-draft.md |

## 9. Known Limits

- This workbench summarizes Rajiv Doc.md; it does not reproduce it verbatim.
- No section has been cross-checked line-by-line against SRC-POLICY-001, SRC-ARUN-001, or SRC-MD-ARUN-001 beyond the structural overlap flags already raised in the intake candidate file.
- "HRM" role and "Manager" approval tier referenced in the Approval Authority Matrix remain undefined against existing CLAUDE.md role tables.
- No individual staff names appear in the source document; none are reproduced here.
- Per CLAUDE.md §13, no Admin Manager authority, escalation logic, or approval chain is treated as final anywhere in this workbench.

## 10. Duplicate / Parent-Truth Risk

Same risk profile documented in the intake candidate file (§9–10), summarized here for quick reference:

- **KPI Governance System / KPI Meeting Management** — possible overlap with Arun's confirmed KPI/AXIOM authority (CLAUDE.md §5, §7) and the PH Team domain (SRC-ARUN-PH-001). Needs boundary review with Arun before any content is treated as authoritative.
- **Core Operational Policies** — possible overlap/duplication with SRC-POLICY-001 (Final Approved, Varmen reviewed). Must not be treated as a competing or updating policy source.
- **Approval Authority Matrix / Escalation Matrix** — introduces governance logic not present anywhere else in CLAUDE.md; explicitly marked NEEDS_RAJIV_MD_CONFIRMATION in the draft map; must not be used as final authority.
- No content from this workbench has been merged into CLAUDE.md, the dashboard, or any canonical policy/skill file.

## 11. Pass/Fail Rule

**PASS** if this workbench accurately reflects Rajiv Doc.md content, carries DRAFT_FROM_RAJIV_DOC / NEEDS_RAJIV_OR_MD_CONFIRMATION / NOT_REGISTERED / NOT_PARENT_TRUTH status throughout, flags all overlap risks, and does not alter any trusted file (CLAUDE.md, source-register.md, verify-register.md, dashboard).

**FAIL** if any content here is treated as confirmed, used to resolve a [VERIFY] item, merged into a canonical file, or used to establish real approval/escalation authority.

## 12. Reviewer Routing

| Content Area | Reviewer Needed |
|---|---|
| Admin Manager responsibilities, SOP/process, infrastructure, training | Rajiv (primary) |
| KPI Governance / KPI Meeting Management | Rajiv + Arun (boundary review) |
| Core Operational Policies | Rajiv + relevant Management Team/domain owner (reconcile with SRC-POLICY-001) |
| Approval Authority Matrix / Escalation Matrix | Rajiv + MD |
| Department/reporting structure | Rajiv (confirm current accuracy) |

## 13. Next Step

Await Rajiv's written response to `evidence/stakeholder-confirmations/rajiv-admin-governance-framework-confirmation-request-2026-07-07.md`. Upon confirmation: register SRC-ADMIN-001, update this workbench's status to reflect confirmed content, route KPI-overlap content to Arun, reconcile policy-overlap content against SRC-POLICY-001, and only then consider dashboard visibility or CLAUDE.md propagation.

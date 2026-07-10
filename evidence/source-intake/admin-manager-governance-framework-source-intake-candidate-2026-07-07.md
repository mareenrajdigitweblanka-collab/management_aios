---
name: admin-manager-governance-framework-source-intake-candidate
type: source-intake-candidate
created: 2026-07-07
candidate-source-id: SRC-ADMIN-001
status: CANDIDATE_PENDING_RAJIV_CONFIRMATION
owner-stakeholder: Rajiv / Admin Manager
---

# Source Intake Candidate — Admin Manager Governance Framework (Rajiv Doc.md)

## 1. What This Document Is

A governance framework document titled "DIGIT WEB LANKA GOVERNANCE FRAMEWORK," submitted by Rajiv (Admin Manager) into the previously empty admin-manager raw source folder. It describes company-wide governance principles, department structure, reporting lines, an approval authority matrix, an escalation matrix, KPI/ROI/AI governance sections, core operational policies, an accountability framework, governance meeting cadences, a management drift risk assessment, and two responsibility blocks (Admin Manager Responsibilities; KPI Meetings and Staff Management Responsibilities).

## 2. Why This Document Exists

This is the first document ever placed in `intelligence-inbox/raw-stakeholder-documents/admin-manager/`, which CLAUDE.md and multiple validation files have tracked as empty/PENDING since Foundation Draft v0.1 (SRC-ADMIN-001 PENDING). It directly targets the long-standing gap tracked in `validation/pending-admin-manager-gaps.md` and [VERIFY] items 1–5 in CLAUDE.md §14.

## 3. Business/Operational Questions It Supports (If Confirmed)

- What is the Admin Manager's reporting line and organisational position?
- What decisions does the Admin Manager have approval authority over?
- What is the Admin Manager's role in escalation paths (Staff Performance, Staff Policy Violations)?
- What is the Admin Manager's role within the PRC (per CLAUDE.md §7.8)?
- What are the Admin Manager's KPI meeting and staff management responsibilities?
- What company-wide governance structures (departments, reporting chain, approval matrix, escalation matrix) exist, and do they match or extend what is already documented in CLAUDE.md §3, §5, §7, §10?

## 4. Raw Source Path

`intelligence-inbox/raw-stakeholder-documents/admin-manager/Rajiv Doc.md`

## 5. Candidate Source ID

**SRC-ADMIN-001** (already listed as PENDING in `evidence/source-register.md` row 23, pointing at this now-populated folder)

## 6. Owner / Stakeholder

Rajiv / Admin Manager

## 7. Status

**CANDIDATE_PENDING_RAJIV_CONFIRMATION** — not registered, not READY, not operational truth.

## 8. Main Content Areas (As Submitted)

1. Purpose
2. Governance Principles (Accountability, Clear Ownership, Documented Processes, ROI-Based Performance Management, Manage By Exception, Continuous Improvement, Transparency and Traceability, AI-Assisted Productivity)
3. Department Structure (19 departments listed)
4. Reporting Structure (Employees → Sub Team Leaders → Team Leaders → Managers → Director → Managing Director)
5. Approval Authority Matrix (8 decision types × 5 approval roles, including a role labelled "HRM")
6. Escalation Matrix (Staff Performance; Customer Complaints; Technical Failures; Staff Policy Violations)
7. KPI Governance System (weekly reviews, management review, action tracking)
8. ROI Governance (revenue contribution, operational efficiency, weekly ROI reviews)
9. AI Governance (mandatory daily AI usage, training, monthly contributions)
10. Core Operational Policies (16 named policy areas)
11. Accountability Framework (per-employee, per-Team-Leader, per-Manager expectations)
12. Governance Meetings (daily/weekly/monthly cadence)
13. Management Drift Assessment (8 risk areas)
14. Admin Manager Responsibilities (8 sub-areas: Administrative Management, SOP and Process Management, Manage By Exception, Performance Monitoring, Development Team Governance, Infrastructure and Compliance, Training and Knowledge Management, Cross-Department Coordination, Core Objective)
15. KPI Meetings and Staff Management Responsibilities (KPI Meeting Management; Staff Management — Attendance and Discipline, Performance Management, Staff Development, Staff Accountability, Recruitment and Staffing Support; Management Follow-Up)

## 9. Potential Parent-AIOS Candidate Areas

The following sections describe **company-wide** governance (not solely Admin Manager-scoped) and are flagged as **parent-AIOS candidate areas** — i.e., areas that, if confirmed, could eventually extend or interact with root CLAUDE.md content. They are NOT approved parent truth:

| Rajiv Doc section | Existing CLAUDE.md coverage | Overlap/extension type |
|---|---|---|
| §3 Department Structure | CLAUDE.md §3 (Organisation Structure — roles, not full department list) | Extension candidate — 19 departments not currently enumerated in CLAUDE.md |
| §4 Reporting Structure | CLAUDE.md §3 (org levels) | Possible extension — introduces "Managers" as a distinct reporting layer between Team Leaders and Director |
| §5 Approval Authority Matrix | Not directly covered in CLAUDE.md | New candidate content — introduces an "HRM" role not currently defined anywhere in CLAUDE.md §3/§5 |
| §6 Escalation Matrix | CLAUDE.md §7.7 (AXIOM incident escalation), §7.8 (PRC) | Overlap risk — this is a *different* escalation model (department/functional escalation) than the AXIOM incident-count/time-based escalation in §7.7; do not conflate |
| §7 KPI Governance System | CLAUDE.md §7 (KPI/AXIOM Context, SRC-ARUN-001) | Overlap risk — Arun (Implementation Officer) holds confirmed authority over KPI definitions per CLAUDE.md §5; this document's KPI governance content must not be treated as superseding Arun's domain without his review |
| §9 AI Governance | CLAUDE.md §10.5 (Mandatory AI Tools Policy, SRC-POLICY-001) | Overlap — largely consistent with existing policy; needs comparison, not automatic merge |
| §10 Core Operational Policies | CLAUDE.md §10 (Company Policy Context, SRC-POLICY-001) | Overlap risk — this is a second document naming the same policy areas already sourced to SRC-POLICY-001; must not be merged or treated as a competing/updating policy source without explicit reconciliation |
| §14 Admin Manager Responsibilities | CLAUDE.md §5 (Admin Manager row — currently `[VERIFY — awaiting SRC-ADMIN-001]`) | Direct target — this is the primary content that would resolve CLAUDE.md §5's Admin Manager row, §3's Admin Manager row, and §7.8's PRC Admin Manager row, but only after Rajiv confirmation and registration |
| §15 KPI Meetings and Staff Management Responsibilities | CLAUDE.md §5 (Admin Manager row), §11.9 (KPI Meeting Format and Governance, SRC-MD-ARUN-001) | Overlap risk — KPI meeting governance is already partially sourced to SRC-MD-ARUN-001 (Arun's domain); this document adds an Admin Manager operational role in KPI meetings that has not been cross-confirmed with Arun |

## 10. Duplicate / Parent-Truth Risk

- **No duplicate intake risk**: no prior SRC-ADMIN-001 content, workbench, or intake candidate exists anywhere in the repository. This is the first Admin Manager document received.
- **Parent-truth risk is MODERATE-HIGH** for the following reasons:
  1. §10 (Core Operational Policies) names the same policy areas already governed by SRC-POLICY-001 (Final Approved, Varmen reviewed). Any future merge must reconcile, not silently override, SRC-POLICY-001.
  2. §7 (KPI Governance System) and §15 (KPI Meetings) touch KPI/AXIOM territory that CLAUDE.md §5 assigns to Arun (Implementation Officer) as confirmed authority. Arun review is required before any KPI-related content from this document is treated as authoritative.
  3. §5 (Approval Authority Matrix) introduces an "HRM" role and a "Manager" approval tier not currently defined in CLAUDE.md's role tables — this could conflict with or duplicate Mayurika's (HR Officer) and the existing "Manager" / "Operational Manager" [VERIFY] rows.
  4. §6 (Escalation Matrix) is a distinct escalation model from the AXIOM incident escalation in §7.7 — these must remain clearly separated, not merged into one escalation logic.
- No content from this document has been merged, promoted, or treated as resolving any existing [VERIFY] item.

## 11. Required Reviewer

**Rajiv (Admin Manager)** — primary. Given the overlap findings above, **Arun (Implementation Officer)** review is recommended before any KPI/escalation content is treated as authoritative, and **relevant Management Team/domain owner (or Varmen)** reconciliation is recommended before any Core Operational Policies content is compared against SRC-POLICY-001.

## 12. Known Limits

- This intake candidate is a summary/index only — it does not reproduce the full text of Rajiv Doc.md verbatim.
- The document has not been checked line-by-line against SRC-POLICY-001, SRC-ARUN-001, or SRC-MD-ARUN-001 for conflicts; only structural overlap is flagged here (see §9).
- The "HRM" role and "Manager" approval tier in §5 (Approval Authority Matrix) are unresolved terms — it is not yet confirmed whether "HRM" refers to the HR Officer (Mayurika) or a distinct role.
- No individual staff names appear in the raw document; no redaction was required for this intake candidate.
- Per CLAUDE.md §13 (Assistant Forbidden Actions), no Admin Manager authority, escalation logic, or approval chain has been invented or treated as final in this file.

## 13. Pass/Fail Rule

**PASS** if this candidate file accurately summarizes Rajiv Doc.md, correctly marks all content as CANDIDATE_PENDING_RAJIV_CONFIRMATION, flags all company-wide/parent-AIOS overlap areas, and does not alter any trusted file (CLAUDE.md, source-register.md, verify-register.md, dashboard).

**FAIL** if any content from this document is treated as approved policy, merged into a canonical file, used to resolve a [VERIFY] item, or used to change approval/escalation logic in a trusted file.

**Result: PASS** (intake-only; no trusted file altered).

## 14. Next Step

Route the confirmation request (`evidence/stakeholder-confirmations/rajiv-admin-governance-framework-confirmation-request-2026-07-07.md`) to Rajiv. Upon his written confirmation:
1. Register SRC-ADMIN-001 in `evidence/source-register.md` (status PENDING → READY) — separate, explicitly authorized step.
2. Resolve applicable [VERIFY] items 1–5 in CLAUDE.md §14, with root propagation to §3, §5, §7.8.
3. Route KPI/escalation-overlapping content (§7, §15 of the raw document) to Arun for review before treating as authoritative.
4. Route Core Operational Policies content (§10) for reconciliation against SRC-POLICY-001 before any merge.
5. Only after the above, consider creating `member-aios/rajiv-admin/WORKBENCH.md` and `quick-reference-sources.md` following the same DRAFT-first pattern used for Mayurika, Suman, and Arun.

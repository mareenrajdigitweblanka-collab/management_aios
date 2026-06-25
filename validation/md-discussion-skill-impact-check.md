---
name: md-discussion-skill-impact-check
type: validation
created: 2026-06-25
sources-checked: SRC-MD-HR-001, SRC-MD-SUMAN-001
skills-checked: management-gap-detection, recruitment-quality-check, kpi-axiom-review-support, policy-lookup
status: COMPLETE — Update candidates identified; no edits made
---

# MD Discussion Skill Impact Check

This document identifies whether Tier 1 skill files need updates based on MD discussion sources. **No skill files or wrappers are edited by this step.** This is a readiness check and recommendation only.

**Rule:** Do not edit skill files until Varmen reviews and approves recommended updates.

---

## Skill Impact Table

| Skill | Impact from MD Notes | Update Needed? | Reason | Source ID | Safety Risk |
| ----- | -------------------- | -------------- | ------ | --------- | ----------- |
| management-gap-detection | HIGH — MD notes add multiple new gap categories: LLM-queryable compliance, requirement documentation governance, verbal-to-documented conversion, task ID standard, business logic documentation, BGCT collection, management folder structure, daily validation (10%), 85% specification rule | YES — Update Candidate | MD notes add documentation compliance, folder structure, requirement governance, and LLM-queryable standards directly relevant to this skill's gap detection categories. Existing §4.4 (Management File and Decision Organization Gaps) and §4.6 (Policy Compliance Gaps) can be extended. | SRC-MD-HR-001 | LOW — additions are process-level gap checks; no decision-making, escalation, or personal data involved |
| recruitment-quality-check | HIGH — MD-Suman notes add Suman's formal role governance, six-month hire ROI audit (binary), OLOS validation requirements, BGCT completion check, LLM-queryable onboarding implementation, weekly deliverables framework, department handbooks/SOPs gap, Dan Martel onboarding principle | YES — Update Candidate | MD notes add OLOS onboarding validation, BGCT compliance check, six-month ROI audit dimension, and weekly accountability framework for Suman. These are new checklist items that extend the existing Month 6 review and onboarding check sections. | SRC-MD-SUMAN-001 | LOW — additions are checklist checks; no hiring decisions, personal data, or autonomous escalation |
| kpi-axiom-review-support | LOW — MD notes do not materially add to KPI/AXIOM framework confirmed by SRC-ARUN-001. ROI Officers identity from SRC-MD-SUMAN-001 is a VERIFY Resolved Candidate for item 10 only. | CONDITIONAL — Review Only | The ROI Officer Feedback input in §7 Review Input Checklist is [VERIFY] pending Arun confirmation. SRC-MD-SUMAN-001 provides a resolution candidate but not full resolution. No structural update needed until Arun confirms. Do not update until VERIFY item 10 is formally resolved. | SRC-MD-SUMAN-001 (VERIFY Resolved Candidate only) | LOW — no change recommended until Arun confirmation; [VERIFY] flag already protects this area |
| policy-lookup | LOW — MD notes reference LLM-queryable documentation and 85% specification rule but these are MD governance directives, not SRC-POLICY-001 confirmed policy. SRC-POLICY-001 §17.0 already covers AI tools mandate which is the closest confirmed policy. | NO — Not Yet | MD governance directives must not be added to policy-lookup until confirmed by SRC-POLICY-001 or a dedicated policy source. The MD notes are discussion governance, not final company policy. policy-lookup is sourced exclusively from SRC-POLICY-001. | SRC-MD-HR-001 / SRC-MD-SUMAN-001 | LOW — no update needed; policy-lookup correctly excludes non-policy sources |

---

## Detailed Impact Notes

### management-gap-detection — What Should Be Added (After Varmen Approval)

**Extension to §4.4 — Management File and Decision Organization Gaps:**
- Gap flag: Requirement file metadata missing or incomplete (missing: Project Name, Start Date, Expected Deadline, User/Stakeholder, Company Value Contribution, MVP Submission Date, Project Owner, Status) (SRC-MD-HR-001 16/06/2026)
- Gap flag: Verbal MD instruction has been executed without being converted to a written, documented requirement first (SRC-MD-HR-001 16/06/2026, 15/05/2026)
- Gap flag: Project started without a documented and approved requirement file (SRC-MD-HR-001 16/06/2026)
- Gap flag: Task has no unique Task ID assigned (SRC-MD-HR-001 19/11/2025)
- Gap flag: BGCT documents not collected and stored in a central location (SRC-MD-HR-001 08/06/2026)
- Gap flag: Management Team Google Sheets not consolidated or identified (SRC-MD-HR-001 08/06/2026)
- Gap flag: Staff biodata documents not consolidated (note: CV/personal data handling subject to PDPA/confidentiality rules) (SRC-MD-HR-001 08/06/2026)
- Gap flag: Business logic documentation not maintained in plain English; not comprehensible by a fresh joiner (SRC-MD-HR-001 10/02/2026, 24/03/2026)

**New §4.7 — LLM-Queryable Documentation Compliance Gaps (new category):**
- Gap flag: Staff member's work activities not maintained in LLM-queryable format (SRC-MD-HR-001 22/05/2026, 22/06/2026)
- Gap flag: Daily 10% business logic validation not completed or evidenced (SRC-MD-HR-001 22/05/2026)
- Gap flag: Development work initiated before 85% specification/requirement rule met (SRC-MD-HR-001 22/05/2026, 15/05/2026)
- Gap flag: EOD entry missing Task Tier, Yield, or Actual Revenue per Hour data (SRC-MD-HR-001 10/02/2026; cross-reference SRC-MAYU-001)

**Extension to §4.3 — KPI Meeting Tracking Gaps:**
- Gap flag: Technical team stand-up meeting not covering user-facing work and deliverables (SRC-MD-HR-001 22/06/2026)

**Extension to §4.5 — Recurring Process Problems:**
- Gap flag: New employee ROI review not conducted at 1-week, 1-month, and 3-month milestones as directed (SRC-MD-HR-001 16/06/2026)
- Gap flag: Developer/technical team project not reviewed for ROI contribution and value delivery (SRC-MD-HR-001 16/06/2026)
- Gap flag: Lessons learned not documented following a project or case outcome (SRC-MD-HR-001 16/06/2026)

---

### recruitment-quality-check — What Should Be Added (After Varmen Approval)

**Extension to §4.9 — Month 6 Review Check:**
- Gap flag: Six-month hire ROI audit (binary) not completed — no evidence of traceable contribution to revenue, margin, NNV reduction, automation output, or capacity (SRC-MD-SUMAN-001 07/05/2026)
- Gap flag: Suman 6-month ROI audit not submitted or evidenced before handover (SRC-MD-SUMAN-001 07/05/2026)

**Extension to §4.10 — 180-Day Handover Check:**
- Gap flag: In-flight performance evidence from Mayurika not provided to Suman before 6-month audit (SRC-MD-SUMAN-001 07/05/2026)

**New §4.13 — OLOS Onboarding System Validation Check (new category):**
- Gap flag: OLOS onboarding system not validated against actual company operations before go-live (SRC-MD-SUMAN-001 29/05/2026)
- Gap flag: Any of the following missing before OLOS go-live: department handbooks, role guides, SOP documents, universal files and version control, shared folder structure, mandatory files for all departments (SRC-MD-SUMAN-001 29/05/2026)
- Gap flag: Suman has not validated all required OLOS documents (Evidence Standard, Onboarding Guide, OLOS Master, Team Leader Setup Guide, File Pack Register) (SRC-MD-SUMAN-001 29/05/2026)

**New §4.14 — BGCT Completion Compliance Check (new category):**
- Gap flag: Staff who joined within last 6 months have not completed BGCT (Best Practices, Guidelines, Checklists, Tutorials) (SRC-MD-SUMAN-001 25/05/2026)
- Gap flag: Onboarding documents have not been updated with BGCT details and requirements (SRC-MD-SUMAN-001 25/05/2026)

**Extension to §4.12 — Daily Recruitment Knowledge Capture Check:**
- Gap flag: Weekly deliverables not submitted by Suman: Risk Identification, One-Month Task Rule, SKU/Margin/Hire-ROI Trace, LLM-in-the-Loop proof (SRC-MD-SUMAN-001 07/05/2026)
- Gap flag: No LLM usage evidenced before planning or decision-making action taken (SRC-MD-SUMAN-001 07/05/2026)
- Gap flag: No shovel-ready requirement document maintained for development team (SRC-MD-SUMAN-001 07/05/2026)

**Extension to §4.1 — Candidate Pipeline Check:**
- Gap flag: LLM-queryable implementation not carried out from onboarding process (SRC-MD-SUMAN-001 28/05/2026)

**Extension to §4.7 — Month 1 Review Check (onboarding principle):**
- Gap flag: Dan Martel poster not shown to new recruit with onboarding principle ("WE HIRE THEM TO SAVE COMPANY TIME") (SRC-MD-SUMAN-001 07/05/2026)

---

### kpi-axiom-review-support — What Should Be Noted (After VERIFY Item 10 Resolved)

**When VERIFY item 10 is formally resolved by Arun:**
- §7 Review Input Checklist — update ROI Officer Feedback row to identify the role as held by Arun and Mayurika (jointly); Selva audits submissions
- Remove [VERIFY] tag from §7 ROI Officer Feedback row after Arun confirmation
- Update §2 skill source list if SRC-MD-SUMAN-001 or a new Arun confirmation source is added

**No change until Arun confirms.**

---

### policy-lookup — No Update Required

This skill is sourced exclusively from SRC-POLICY-001 — Final Approved. MD discussion notes are not company policy. No new policy areas from the MD discussion sources require policy-lookup to be updated. The existing AI tools compliance section (§4.15) already covers §17.0 mandatory AI tools, which is the closest policy foundation to the LLM-queryable mandate in the MD notes.

---

## Tier 1 Skill Safety Assessment

| Skill | Current Safety Status | Safe for Varmen Review? | Notes |
|-------|-----------------------|------------------------|-------|
| management-gap-detection | DRAFT — CONDITIONAL PASS | YES | Safe as-is; update candidates identified but not applied. Current version does not conflict with MD notes. |
| recruitment-quality-check | DRAFT — CONDITIONAL PASS | YES | Safe as-is; update candidates identified but not applied. Current version does not conflict with MD notes. |
| kpi-axiom-review-support | DRAFT — CONDITIONAL PASS | YES | Safe as-is; VERIFY item 10 has a resolution candidate but [VERIFY] tag correctly preserved. |
| policy-lookup | DRAFT — CONDITIONAL PASS | YES | Safe as-is; no update needed. All policy content correctly sourced from SRC-POLICY-001. |

**All four Tier 1 skills remain safe for Varmen review. No skill edits have been made.**

---

## Next Action

Present this skill-impact-check to Varmen for review before editing any skill files or wrappers. When Varmen approves:

1. Update `skills/management-gap-detection.md` — add §4.7 LLM-Queryable Documentation Compliance Gaps; extend §4.4, §4.3, §4.5 as described above
2. Update `skills/recruitment-quality-check.md` — add §4.13 OLOS check, §4.14 BGCT check; extend §4.9, §4.10, §4.12 as described above
3. Update `.claude/skills/management-gap-detection/SKILL.md` and `.claude/skills/recruitment-quality-check/SKILL.md` wrappers to reflect new sections
4. kpi-axiom-review-support — defer until VERIFY item 10 formally resolved by Arun
5. policy-lookup — no update needed

**Do not edit skill files or wrappers before Varmen review.**

---
name: kpi-axiom-review-support
type: skill
tier: 1
status: DRAFT — Foundation Draft v0.1 — Updated 2026-06-25 (SRC-MD-HR-001)
sources: SRC-ARUN-001, SRC-ARUN-002, SRC-MD-HR-001
context-files: context/kpi-axiom-context.md, context/hr-operations-context.md, context/confidentiality-rules.md, context/verify-register.md
created: 2026-06-23
last-updated: 2026-06-25
owner-for-review: Varmen (validation); Arun (KPI/AXIOM content review); Mayurika (operational review after foundation approval)
---

# Skill: KPI / AXIOM Review Support

**Pass/Fail Rule:** PASS if every KPI threshold, AXIOM band value, escalation step, PRC membership claim, and output field traces to SRC-ARUN-001 or SRC-ARUN-002, and all [VERIFY] tags are preserved. FAIL if any KPI threshold is invented, any [VERIFY] is removed without Arun confirmation, any employee decision is made, or if this skill performs an escalation or automation action.

---

## 1. What This Skill Does

*(Source: SRC-ARUN-001 — KPI Definitions, AXIOM Band Placement, Review Input/Output & Management Tracking Framework; context/kpi-axiom-context.md)*

This skill supports preparation and checking for KPI and AXIOM review activities. It provides reference lookup for KPI definitions by team, AXIOM band thresholds, review input and output checklists, weekly AXIOM workflow support, incident escalation documentation support, PRC preparation support, bonus eligibility checking support, and management dashboard requirement checking.

It does not make performance decisions. It does not assign AXIOM bands. It does not issue warnings or PIPs. It does not trigger PRC actions.

---

## 2. What This Skill Does NOT Do

- Does not make any performance decision for any employee
- Does not assign AXIOM bands — Arun (Implementation Officer) holds sole authority for AXIOM band placement (SRC-MAYU-001, SRC-ARUN-001)
- Does not issue First Warning, Second Warning, Third Warning, or PIP
- Does not trigger PRC reviews or PRC actions
- Does not approve or deny bonus eligibility — PRC Approval is required (SRC-ARUN-001 §9)
- Does not approve or deny promotion candidates
- Does not store individually identifiable performance band placements for named staff
- Does not resolve [VERIFY] items for Amazon ACOS, Operational Manager PRC scope, or ROI Officer identity
- Does not finalize escalation paths through Admin Manager [VERIFY — SRC-ADMIN-001 PENDING]
- Does not automate any management decision
- Does not connect to live KPI, AXIOM, or management systems

---

## 3. Allowed Input Types

| Allowed Input Type | Example |
|--------------------|---------|
| Team-level KPI status | "Website Team ROAS this week: 380%" |
| Aggregate band distribution | "3 staff in Red band, 2 in Amber — net sales week" |
| Review schedule status | "KPI review for eBay Team not scheduled this week" |
| Incident documentation status | "2 incidents logged; Week 3 reached — Additional Support step not documented" |
| Bonus eligibility checklist status | "Documentation compliance at 87% — below 90% threshold" |
| Dashboard data availability | "Monthly ROI Contribution data not yet collected" |

**Not permitted as input:**

- Individual named staff AXIOM band placements
- Individual salary or compensation data
- Personal disciplinary case details
- Individual health or grievance information

---

## 4. KPI Definition Lookup

*(Source: SRC-ARUN-001 §1)*

| Team | KPIs |
|------|------|
| Portfolio Holders | 30%+ YOY Growth, Individual Staff Net Sales, Category Profitability |
| Website Team | 30%+ YOY Growth, ROAS >= 400%, Documentation Compliance |
| eBay Team | 30%+ YOY Growth, ACOS <= 20%, Individual Staff Net Sales |
| Account Holders | Assigned ID Performance, Task Compliance, Incident Compliance |
| PPC Team | ROAS Achievement, YOY Growth, Cost Efficiency |
| Technical Team | ROI Contribution, Automation Time Saving Hours, Documentation Quality, Queryable Assets |
| Development Team | ROI Contribution, Time Serving Hours, Delivery Timeliness, Evidence Submission, Queryable Assets |

---

## 5. AXIOM Band Reference

*(Source: SRC-ARUN-001 §2)*

**Note:** AXIOM band placement is the exclusive authority of Arun (Implementation Officer). This reference table is for support only — it does not assign bands.

### 5.1 Individual Staff Net Sales Bands

| Band | Range |
|------|-------|
| Red | Below 300 |
| Amber | 300–800 |
| Green | 800–1,500 |
| Dark Green | 1,500–3,000 |
| Purple | Above 3,000 |

### 5.2 NNV (Net New Value) Bands

| Band | Range |
|------|-------|
| Red | Negative Growth |
| Amber | 0–14% |
| Green | 15–29% |
| Dark Green | 30–49% |
| Purple | 50%+ |

---

## 6. KPI Risk Detection Reference

*(Source: SRC-ARUN-001 §3)*

Use this reference to check whether KPI data indicates a risk trigger. All triggers are subject to management review — this skill does not escalate autonomously.

| Trigger Condition | Threshold | Source Status |
|-------------------|-----------|---------------|
| YOY Growth | Below 30% | CONFIRMED |
| Website ROAS | Below 400% | CONFIRMED |
| Amazon ACOS | Below 25% **[VERIFY — Arun: source wording "Amazon ACOSBelow 25%" — threshold direction and formatting must be confirmed with Arun before this trigger may be used operationally. See verify-register.md item 8.]** | [VERIFY] |
| eBay ACOS | Below 20% | CONFIRMED |
| Incident Score | Below 15/25 | CONFIRMED |
| Incident Reports | 3 or more | CONFIRMED |
| Task Misses | Repeated | CONFIRMED |
| Documentation | Missing | CONFIRMED |
| ROI Contribution | Low | CONFIRMED |
| NNV Growth | Low | CONFIRMED |
| Utilisation | Poor | CONFIRMED |

---

## 7. Review Input Checklist

*(Source: SRC-ARUN-001 §4)*

Before a KPI/AXIOM review, confirm the following inputs are available:

| Review Input | Available? |
|--------------|-----------|
| Revenue | — |
| Profit | — |
| YOY Growth | — |
| ROAS | — |
| ACOS | — |
| Individual Staff Net Sales | — |
| Task Completion | — |
| Documentation Status | — |
| Incident Reports | — |
| ROI Contribution | — |
| Team Leader Feedback | — |
| Auditor Feedback | — |
| ROI Officer Feedback **[VERIFY — Arun: source lists "ROI officer feed back" — confirm whether this is a distinct role or an existing title. See verify-register.md item 10.]** | — |

**Gap flag:** Any input not available before the scheduled review is a review readiness gap.

---

## 8. Review Output Checklist

*(Source: SRC-ARUN-001 §5)*

After a KPI/AXIOM review, confirm the following outputs have been produced and documented:

| Review Output | Produced? |
|---------------|----------|
| AXIOM Score | — |
| AXIOM Band | — |
| NNV Band | — |
| Risk Level | — |
| Coaching Requirement | — |
| Training Requirement | — |
| Warning Status | — |
| PIP Status | — |
| Bonus Eligibility | — |
| Promotion Candidate Status | — |

**Note:** All review outputs require human authority to act upon. This skill confirms whether outputs have been produced and documented — it does not produce or act on them.

---

## 9. Weekly AXIOM Workflow Support

*(Source: SRC-ARUN-001 §6)*

The confirmed weekly AXIOM workflow sequence is:

1. Collect data weekly
2. Calculate KPI scores
3. Assign bands
4. Identify risks
5. Conduct management review
6. Issue action plans
7. Monitor outcomes

**Support check:** For each step, confirm whether it has been completed this week. Flag any step not completed or not evidenced.

---

## 10. Incident and Escalation Documentation Support

*(Source: SRC-ARUN-001 §7)*

This section supports documentation checking only. This skill does not issue warnings, trigger PRC reviews, or recommend disciplinary actions.

### 10.1 Time-Based Escalation Reference

| Week | Required Action |
|------|----------------|
| Week 1 | Coaching |
| Week 3 | Additional Support |
| Week 5 | First Warning |
| Week 7 | Second Warning |
| Week 8 | Third Warning + PRC Review |

### 10.2 Incident Count Escalation Reference

| Incident Count | Required Action |
|----------------|----------------|
| 1 | Coaching |
| 2 | Observation |
| 3 | Escalation |
| 4 | Final Warning |
| 5+ | PRC Action |

**Documentation check:** Confirm whether the appropriate action for the current week or incident count has been documented. Flag if the required documentation is missing for the current escalation stage.

**This skill does not issue warnings or trigger escalation. It checks that the relevant documentation exists for the current stage.**

---

## 11. PRC Review Preparation Support

*(Source: SRC-ARUN-001 §8)*

This section supports preparation for PRC review. It does not constitute a PRC review or produce PRC decisions.

### 11.1 PRC Membership Reference

| Member | Source Status |
|--------|--------------|
| Managing Director | CONFIRMED |
| Implementation Officer (Arun) | CONFIRMED |
| Team Leader | CONFIRMED |
| Admin Manager | **[VERIFY — awaiting SRC-ADMIN-001: Admin Manager's PRC role and authority within PRC not independently confirmed. See verify-register.md item 3.]** |
| Operational Manager | **[VERIFY — Arun: confirm Operational Manager PRC membership and scope of participation. See verify-register.md item 9.]** |

### 11.2 PRC Responsibilities Reference

| PRC Responsibility | Confirmed |
|--------------------|-----------|
| KPI Review | YES — SRC-ARUN-001 |
| Bonus Approval | YES — SRC-ARUN-001 |
| Escalation Decisions | YES — SRC-ARUN-001 |
| Promotion Reviews | YES — SRC-ARUN-001 |

### 11.3 PRC Preparation Checklist

| Preparation Item | Ready? |
|-----------------|--------|
| All review inputs collected (see §7) | — |
| Review outputs produced and documented (see §8) | — |
| Relevant escalation documentation prepared (see §10) | — |
| Attendees confirmed (with [VERIFY] noted for Admin Manager and Operational Manager) | — |

---

## 12. Bonus Eligibility Checklist Support

*(Source: SRC-ARUN-001 §9)*

This checklist supports checking whether the documented conditions for bonus eligibility have been met. Bonus approval requires PRC Approval — this skill does not approve bonuses.

| Eligibility Condition | Threshold | Met? |
|-----------------------|-----------|------|
| YOY Growth | >= 30% | — |
| ROAS/ACOS Target | Achieved | — |
| Individual Staff Net Sales | Green Band or Above | — |
| Active Incident Reports | None | — |
| Documentation Compliance | >= 90% | — |
| ROI | Positive | — |
| PRC Approval | Required — must be obtained separately | — |

**Gap flag:** Any condition not met or not evidenced. All conditions must be met before progressing to PRC Approval stage.

---

## 13. Management Dashboard Requirement Checklist

*(Source: SRC-ARUN-001 §10)*

### 13.1 Dashboard Reporting Cadence

| Cadence | Required Contents | Available? |
|---------|------------------|-----------|
| Weekly | Revenue, Profit, AXIOM Band, Incident Tracking | — |
| Monthly | KPI Achievement, YOY Growth, ROI Contribution, Bonus Eligibility, Department Performance | — |

### 13.2 Required Dashboard Views

| View | Required | Available? |
|------|----------|-----------|
| Staff | YES | — |
| Team | YES | — |
| Department | YES | — |
| Portfolio | YES | — |
| Incident | YES | — |
| Bonus | YES | — |
| PRC Review | YES | — |

**Gap flag:** Any dashboard view not built or not populated. Any reporting cadence not met.

---

## 14. MD Governance ROI Evidence Checklist

*(Source: SRC-MD-HR-001 — Varmen Reviewed 2026-06-25)*

> This section reflects MD-directed ROI and documentation governance standards that overlap with KPI/AXIOM review support. All checks are evidence-completeness checks only — this skill does not make ROI assessments or performance decisions. All content is process-level. No individual staff performance data is included.

### 14.1 New Employee ROI Monitoring Evidence Check

*(SRC-MD-HR-001, 16/06/2026)*

For all new employees, confirm whether ROI monitoring evidence exists at the following milestones:

| Milestone | Evidence Required | Gap if Missing |
|-----------|------------------|----------------|
| 1 week | Initial capability and activity baseline documented | Governance failure — milestone ROI review not evidenced |
| 1 month | Early value and task completion assessment documented | Governance failure — milestone ROI review not evidenced |
| 3 months | Traceable contribution to team or business output documented | Governance failure — milestone ROI review not evidenced |

**Gap flag:** Missing ROI review evidence at any of the three milestones for a new employee is a governance failure.

### 14.2 Developer and Technical Team Project ROI Evidence Check

*(SRC-MD-HR-001, 16/06/2026)*

| Check Item | Expected Standard | Gap if Missing |
|------------|------------------|----------------|
| Project ROI evidence documented on conclusion | Developer or technical team project completed with a documented value outcome or ROI assessment | Project completion without ROI assessment is a gap |
| Business value contribution traceable | Project output linked to a traceable business or operational value | Untraceable project output is a documentation gap |

**Gap flag:** Project concluded without documented ROI contribution or value assessment.

### 14.3 Requirement and Business Value Metadata Check

*(SRC-MD-HR-001, 16/06/2026)*

Before any KPI-related development or project work begins, confirm the requirement file contains all required metadata fields:

| Required Field | Present? |
|----------------|---------|
| Project Name | — |
| Start Date | — |
| Expected Deadline | — |
| User / Stakeholder | — |
| Company Value Contribution | — |
| MVP Submission Date | — |
| Project Owner | — |
| Status | — |

**Gap flag:** Any metadata field missing; development work begun without a complete requirement file.

---

## 15. [VERIFY] Constraints Active for This Skill

| [VERIFY] Item | Effect on This Skill |
|---------------|---------------------|
| Amazon ACOS threshold wording (item 8) | §6 Amazon ACOS trigger must not be used operationally until Arun confirms exact wording and threshold direction. Flag as [VERIFY] in all outputs. |
| Operational Manager PRC membership (item 9) | §11.1 PRC membership table shows Operational Manager as [VERIFY]. Do not assert PRC membership or scope without Arun confirmation. |
| ROI Officer feedback — role identity (item 10) | §7 Review Input checklist shows ROI Officer Feedback as [VERIFY]. Do not assert this as a confirmed input type from a confirmed role until Arun confirms. |
| Admin Manager PRC role (item 3) | §11.1 Admin Manager PRC membership is [VERIFY]. Do not assert authority or scope within PRC. |
| Admin Manager escalation authority (items 1–5) | No final escalation paths through Admin Manager may be included in this skill. |
| MD-specific requirements (items 6–7) | This skill may change scope after MD review. Foundation Draft v0.1 only. |

---

## 16. Confidentiality Rules Active for This Skill

*(Source: context/confidentiality-rules.md — SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001)*

- No individually identifiable AXIOM band placements for named staff
- No salary or compensation data
- No disciplinary case personal details
- No health or personal information
- Process-level and aggregate information only
- All outputs are company property under SRC-POLICY-001 §11.0 and §14.0

---

## Pass/Fail Result

**DRAFT — CONDITIONAL PASS — Updated 2026-06-25**

All KPI definitions, AXIOM band values, escalation stages, PRC membership claims, bonus conditions, and dashboard requirements trace to SRC-ARUN-001. All four active [VERIFY] items (Amazon ACOS, Operational Manager PRC, ROI Officer feedback, Admin Manager PRC) are preserved and marked. No employee decisions, band assignments, warning issuances, or PRC triggers included. No invented thresholds.

**MD discussion source additions (2026-06-25):** §14 added (MD Governance ROI Evidence Checklist — new employee ROI milestone evidence check, developer/technical project ROI evidence check, requirement and business value metadata check). All additions sourced from SRC-MD-HR-001 — Varmen Reviewed 2026-06-25. No Arun [VERIFY] items changed. No ACOS threshold, Operational Manager PRC, or ROI Officer rows modified.

Safe for Varmen review. Not yet safe for operational use — Foundation Draft v0.1 only. Arun confirmation required for [VERIFY] items 8, 9, and 10 before skill sections relying on those items can be used operationally.

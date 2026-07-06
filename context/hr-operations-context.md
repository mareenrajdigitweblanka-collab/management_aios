---
name: hr-operations-context
type: context
source-ids: SRC-MAYU-001, SRC-POLICY-001, SRC-MD-HR-001
created: 2026-06-23
last-updated: 2026-06-25
status: PASS — Varmen Reviewed 2026-06-25
---

# HR Operations Context

**Pass/Fail Rule:** PASS if all HR process claims in this file trace to SRC-MAYU-001 and no personal employee data is included. FAIL if any individually identifiable staff data, salary information, disciplinary detail, or unsourced HR policy is added.

> This file contains process-level HR operations only. No personal employee data, salary data, disciplinary records, health information, or grievance details are stored here. All content is aggregate or process-level.

---

## 1. Staff Record Governance

*(Source: SRC-MAYU-001 — Section 1 of HR.Mayu.Skill.md)*

Mayurika (HR Officer) is the primary custodian and write-authority for staff records. She maintains canonical employment status, dates, training logs, and review schedules for all active, probationary, on-leave, suspended, and departed employees.

**Key lifecycle events managed by Mayurika:**

- New joiner onboarding
- Active employment record maintenance
- Month 6 handoff from Suman (Recruitment Officer)
- Status changes: leave, suspension, departure
- Weekly AXIOM data submission to Arun
- PDPA acknowledgement tracking

**Mayurika does NOT write:**

- Canonical name spelling (Rajiv's authority)
- Team structure data (Rajiv's authority)
- Salary band information
- AXIOM band placements (Arun's authority)

---

## 2. PDPA Tracking

*(Source: SRC-MAYU-001 — Daily Activities #4; PDPA Compliance Report section)*

Mayurika issues PDPA notices to all new joiners and records the acknowledgement date. Staff with no acknowledgement date on record are flagged as non-compliant.

**Key process steps:**

- Issue PDPA notice at onboarding
- Record acknowledgement date in staff record
- Flag null acknowledgement dates as non-compliant
- Prepare monthly PDPA compliance report for management
- Review departed staff records against the PDPA retention schedule

Personal email addresses for records are held under PDPA-controlled access. Raw PDPA documents are held by Mayurika and are not stored in this AIOS.

---

## 3. Review Scheduling

*(Source: SRC-MAYU-001 — KPIs: Review Schedule Accuracy section)*

Mayurika maintains `last_review_date` and `next_review_due` for all staff.

**Governance rule:** Any staff member with an overdue `next_review_due` and no escalation on record is a governance failure.

Monthly review schedule refresh is performed to identify upcoming and overdue reviews.

---

## 4. EOD Productivity Monitoring

*(Source: SRC-MAYU-001 — Section 4 of HR.Mayu.Skill.md; active since March 2025)*

Mayurika manages the End of Day (EOD) Performance Management program for:

- Website Team
- PH Team

**Process:**

- Staff submit daily task reports via a ChatGPT project workspace
- Mayurika monitors submission compliance
- Data is synced with an EOD Dashboard
- Weekly and monthly productivity analysis is produced

**Task analysis dimensions tracked:**

- Task Name
- Staff ID
- Task Tier
- Time Spent
- Yield
- Category (sales-oriented vs operational)

---

## 5. Critic Meeting Management

*(Source: SRC-MAYU-001 — Section 5 of HR.Mayu.Skill.md)*

Monthly Critic Meetings are co-facilitated by:

- Mayurika (HR Officer)
- Muguntha
- Jefri

**Process:**

1. Each session reviews one department
2. Employees from other departments provide structured feedback
3. After each session, Mayurika arranges an Action Review Meeting with the relevant Team Leader
4. Action items are tracked in the Critic Meeting Action Tracker
5. Action items are published on the company notice board

---

## 6. SKILL File Compliance

*(Source: SRC-MAYU-001 — Section 6 of HR.Mayu.Skill.md)*

Mayurika is the SKILL File Compliance Manager for:

- Developer Team
- Technical/N8N Team

**Responsibility split:**

| Responsibility | Owner |
|----------------|-------|
| Daily submission quantity monitoring | Mayurika |
| Coverage and compliance against 80% quality benchmark | Mayurika |
| Same-day follow-up for missing or weak submissions | Mayurika |
| Quality depth assessment (reusability, BLOS alignment, evidence quality) | Visali |

**Escalation path for persistent non-compliance:**
Sajeesan → Pratheepan → Joshna → Management

**Required standard:** 80% quality benchmark.

---

## 7. Technical Team ROI Monitoring

*(Source: SRC-MAYU-001 — Section 2 of HR.Mayu.Skill.md)*

Mayurika coordinates post-996-Project ROI monitoring.

**Weekly data collection from:**

- PH Team
- Digital Marketing Team
- Technical Team

**Output:** Weekly and monthly ROI performance reports prepared for the MD.

---

## 8. Leadership Review Coordination

*(Source: SRC-MAYU-001 — Section 3 of HR.Mayu.Skill.md)*

Twice-weekly Leadership Review sessions are co-facilitated by Mayurika and the Director.

**Scope:**

- Separate review frameworks exist for Sales Teams and Non-Sales Teams
- Mayurika schedules sessions, prepares frameworks, captures data
- Mayurika validates team leader-reported data against management-level data
- Action items are tracked
- Governance reports are prepared

**Enhanced validation:** eBay and CPPC teams are subject to enhanced data validation due to identified historical reporting inconsistencies.

---

## 9. Leave Policy

*(Source: SRC-POLICY-001 §6.0–6.5 — Final Approved)*

> This section was added 2026-06-23 following registration of SRC-POLICY-001. It resolves [VERIFY] item 12 (leave policy detail). No leave policy claim may be made beyond what is stated here without an additional registered source.

### 9.1 General Leave Guidelines

- Leave requests must be updated in the leave system at least 48 hours in advance.
- A maximum of 12% of staff may take leave simultaneously. Any excess is considered unauthorised leave.
- Team leave limits: maximum of 2 team members per day (or 1 in CST, Content Writing, and Postage teams).
- Medical/sick leave: only hospitalised medical conditions supported by reports will be considered.
- No leave coverage is available on Saturdays.

**Leave plan notice periods:**

| Leave Duration | Notice Required | Approval Level |
|----------------|----------------|----------------|
| 3 days | 1 week | Subteam Leader |
| 4–7 days | 4 weeks | Team Leader |
| 7–12 days | 8 weeks | HR approval |
| 13–14 days | 3 months | Manager approval |

### 9.2 Planned Leave — Probation and Entitlement

- **Probation restriction:** No leave is permitted during the 3-month probationary period. If urgent, leave can be taken and recovered within weekdays.
- **Junior staff:** 1 day leave per month.
- **Senior staff:** 2 days leave per month (32 days per annum).

### 9.3 Unplanned Leave

- Entitlement: 5 unplanned leave days per year.
- Notification: HR or supervisor must be notified as soon as possible.
- Excess unplanned leave is considered unauthorised and may lead to disciplinary action.

### 9.4 Short Leave and Early-Off

- Maximum 2 hours per month.
- Requires 24-hour advance notice and supervisor approval.

### 9.5 Maternity Leave

- Duration: 3 months (applicable to 1st or 2nd baby).
- Notice: 30 days prior notice required.
- Full pay: Full-time employees receive full salary during leave.

### 9.6 Offboarding — Exit Interview

*(Source: SRC-POLICY-001 §10.6 — Final Approved)*

An exit interview is conducted by HR upon resignation or termination. This confirms that all company property, digital assets, and duties have been returned or transferred appropriately. A final offboarding checklist is signed by the employee, their manager, and an HR representative (SRC-POLICY-001 §10.7).

---

---

## 10. MD-Directed HR Governance

*(Source: SRC-MD-HR-001 — MD & HR Discussion Notes, multiple dates 19/11/2025–22/06/2026; Varmen Reviewed 2026-06-25)*

> This section reflects MD-directed governance standards from discussion notes. These are MD-level operational directives, not independently confirmed by SRC-POLICY-001. All content is process-level only. No individual staff case details, performance records, or personal data are included. Varmen Reviewed MD Governance Evidence.

### 10.1 LLM-Queryable Documentation Standard

*(SRC-MD-HR-001, 22/05/2026 and 22/06/2026)*

Any activity not documented in LLM-queryable format will be considered as "not happened." This is an organisation-wide MD-directed governance principle applicable to all teams and staff members.

### 10.2 Task ID Standard

*(SRC-MD-HR-001, 19/11/2025)*

Every task must be assigned a unique Task ID. Work performed without a Task ID cannot be tracked, validated, or attributed. Gap detection: tasks without assigned Task IDs are a compliance failure.

### 10.3 Requirement File Metadata Standard

*(SRC-MD-HR-001, 16/06/2026)*

All project and development work must be preceded by a documented requirement file containing the following metadata fields before work begins:

| Required Field | Description |
|----------------|-------------|
| Project Name | Name of the project or initiative |
| Start Date | Date work is intended to begin |
| Expected Deadline | Target completion date |
| User / Stakeholder | Who the work serves |
| Company Value Contribution | Expected business or operational value |
| MVP Submission Date | Earliest viable deliverable date |
| Project Owner | Named owner of the project |
| Status | Current project status |

### 10.4 Verbal-to-Documented Conversion Rule

*(SRC-MD-HR-001, 16/06/2026 and 15/05/2026)*

No verbal MD instruction may be executed without first being converted into a written, documented requirement. Gap detection: any work initiated from verbal direction alone without a documented requirement file is a governance failure.

### 10.5 85% Specification Rule

*(SRC-MD-HR-001, 22/05/2026 and 15/05/2026)*

Development work must not begin until at least 85% of the project requirements are documented and approved. Starting development before this threshold is met is a governance gap.

### 10.6 Daily 10% Business Logic Validation

*(SRC-MD-HR-001, 22/05/2026)*

Technical and development staff are required to complete a daily 10% business logic validation. Evidence of completion must be documented. Absence of evidence is a compliance gap.

### 10.7 Business Logic Documentation Standard

*(SRC-MD-HR-001, 10/02/2026 and 24/03/2026)*

Business logic must be documented in plain English, written to a standard comprehensible by a fresh joiner. Documentation that cannot be understood by someone unfamiliar with the project does not meet this standard.

### 10.8 EOD Strengthening — Actual Revenue per Hour

*(SRC-MD-HR-001, 10/02/2026; cross-reference SRC-MAYU-001 §4)*

The EOD productivity program (see §4) must include an "Actual Revenue per Hour" metric in addition to existing Task Tier, Time Spent, Yield, and Category dimensions. This is an MD-directed extension to the existing EOD framework.

### 10.9 New Employee ROI Monitoring

*(SRC-MD-HR-001, 16/06/2026)*

For all new employees, ROI monitoring must be conducted at the following milestones:

| Milestone | Purpose |
|-----------|---------|
| 1 week | Initial capability and activity baseline |
| 1 month | Early value and task completion assessment |
| 3 months | Traceable contribution to team or business output |

Gap detection: missing ROI review at any of these milestones for a new employee is a governance failure.

### 10.10 Developer and Technical Team Project Performance Monitoring

*(SRC-MD-HR-001, 16/06/2026)*

Developer and technical team projects must be monitored for ROI contribution and value delivery on an ongoing basis. Project completion without a documented value outcome or ROI assessment is a gap.

### 10.11 Technical Team Stand-Up Governance

*(SRC-MD-HR-001, 22/06/2026)*

Technical team stand-up meetings must cover user-facing work and deliverables — not internal tasks only. Gap detection: stand-up records that do not evidence coverage of user-facing deliverables are non-compliant with this standard.

### 10.12 Lessons Learned Documentation

*(SRC-MD-HR-001, 16/06/2026)*

Following the outcome of a project or case, a lessons learned document must be produced and stored. Absence of a lessons learned record following a concluded project is a gap.

### 10.13 BGCT Collection

*(SRC-MD-HR-001, 08/06/2026)*

Best Practices, Guidelines, Checklists, and Tutorials (BGCT) documents must be collected and stored in a central location. Gap detection: no central BGCT repository or incomplete BGCT collection is a management file gap.

### 10.14 Management Documentation and Folder Consolidation

*(SRC-MD-HR-001, 08/06/2026)*

The following management documentation consolidation tasks are MD-directed:

- Management Team Google Sheets must be identified, listed, and consolidated
- Staff biodata documents must be consolidated (note: PDPA and confidentiality rules apply — see §2 and confidentiality-rules.md)
- Management and operational documents must be centrally located and accessible

---

## 11. New Skill Learning Program — HR Follow-up, Verification & Implementation Responsibility

*(Source: SRC-MAYURIKA-NSLP-001 — HR.Mayu.Skill.md Section 9; MD approved 2026-07-06; Mayurika confirmed 2026-07-06)*

HR is responsible for follow-up, verification, evidence collection, adoption tracking, and management reporting for all New Skill Learning Program activities.

**Core HR responsibilities:**

- Confirming each new skill is assigned a unique Skill ID
- Ensuring each new skill has a dedicated BGCT (Business Guideline & Company Training) document
- Verifying staff have implemented the learned skill via Before & After evidence collection
- Tracking adoption, implementation, and business impact across departments
- Reporting NSLP implementation status, adoption rate, and business impact to management with evidence

**NSLP is not complete when the meeting ends. It is complete only when the skill is applied in daily work, measurable improvement is proven, and improvement is sustained over time.**

**Process flow:** New Skill Meeting → Skill Application in Work → Measurable Improvement → HR Verification → Success Story / Escalation

**HR responsibilities by stage:**
- Before the meeting: confirm skill is new and relevant; send guideline; record attendees; add to Skill Learning Register
- During the meeting: ensure trainer teaches a new skill; ensure participants submit an Action Plan Card before leaving
- After the meeting: start 2-week countdown; remind participants; collect Before & After evidence at 2-week mark
- 2-week evaluation: compare Before vs After; check whether improvement is measurable and sustained

**Outcome labels:** SUCCESS STORY / NOT EFFECTIVE / FAILURE / UNSUSTAINED

**Exception monitoring:** skill not applied; opinion-only proof; improvement for 1–2 days only; no proof provided; senior staff repeats old skill; trainer gives theory not applicable skill

**Activity cadence:** daily — check Skill IDs, BGCT documents, Action Plan Cards, pending evidence; weekly — review Skill Learning Register, validate evidence, identify exceptions; monthly — prepare NSLP status report; report adoption and business impact to management

**Documents maintained:** Skill Learning Register; Skill ID Register; BGCT Document Register; Action Plan Card Register; Before & After Evidence Register; 2-Week Evaluation Log; Adoption & Implementation Tracker; NSLP Exception Register; Success Story Database; NSLP Management Report

**Boundaries (what HR does NOT do):**
- Does not approve old skills as NSLP
- Does not mark attendance as success without implementation evidence
- Does not accept opinion-only proof
- Does not mark NSLP complete without measurable Before & After improvement
- Does not create technical skill content unless separately assigned
- Does not replace management decision-making

---

## Source IDs Used in This File

| Claim Area | Source ID | Status |
|------------|-----------|--------|
| All HR operations process claims (§1–§8) | SRC-MAYU-001 | CONFIRMED |
| Leave policy framework (§9.1–§9.5) | SRC-POLICY-001 | CONFIRMED |
| Offboarding exit interview and checklist (§9.6) | SRC-POLICY-001 | CONFIRMED |
| MD-Directed HR Governance (§10.1–§10.14) | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 |
| New Skill Learning Program HR responsibilities (§11) | SRC-MAYURIKA-NSLP-001 | CONFIRMED — MD Approved; Mayurika Confirmed 2026-07-06 |

---

## Pass/Fail Result

**PASS** — All claims trace to SRC-MAYU-001, SRC-POLICY-001, SRC-MD-HR-001, or SRC-MAYURIKA-NSLP-001. MD-directed governance section (§10) is Varmen Reviewed 2026-06-25. NSLP section (§11) is MD Approved and Mayurika Confirmed 2026-07-06. No personal employee data included. No salary, disciplinary, or health data included. Process-level only. [VERIFY] item 12 resolved by SRC-POLICY-001 §6.0–6.5.

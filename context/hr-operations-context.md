---
name: hr-operations-context
type: context
source-ids: SRC-MAYU-001, SRC-POLICY-001
created: 2026-06-23
last-updated: 2026-06-23
status: PASS — Foundation Draft v0.1
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

## Source IDs Used in This File

| Claim Area | Source ID | Status |
|------------|-----------|--------|
| All HR operations process claims (§1–§8) | SRC-MAYU-001 | CONFIRMED |
| Leave policy framework (§9.1–§9.5) | SRC-POLICY-001 | CONFIRMED |
| Offboarding exit interview and checklist (§9.6) | SRC-POLICY-001 | CONFIRMED |

---

## Pass/Fail Result

**PASS** — All claims trace to SRC-MAYU-001 or SRC-POLICY-001. No personal employee data included. No salary, disciplinary, or health data included. Process-level only. [VERIFY] item 12 resolved by SRC-POLICY-001 §6.0–6.5.

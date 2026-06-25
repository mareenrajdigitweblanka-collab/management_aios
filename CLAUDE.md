---
Status: FOUNDATION DRAFT v0.1
Builder: Mareenraj
Coordinator / Validator: Varmen
Operational Owner: Mayurika after foundation approval
Source Basis: evidence/source-register.md
Known Gap: Admin Manager source pending (SRC-ADMIN-001)
Use Boundary: Safe for foundation context only. Not final HR policy, not final escalation authority, not parent AIOS truth.
---

# Management AIOS — CLAUDE.md

---

## 1. Purpose

*(Source: SRC-VAR-001)*

The Management AIOS exists to identify operational gaps, missing processes, documentation issues, and recurring management problems before they become larger business issues.

It is modelled after the existing Postage/Shipping AIOS and Purchasing AIOS. Like those systems, the Management AIOS provides a structured intelligence layer that surfaces what is going wrong in management and HR operations — not after the damage is done, but early enough to act.

The four core problem areas this AIOS was created to address, as stated by Varmen (2026-06-22):

1. **Onboarding gaps** — new team members are not consistently receiving correct documentation, instructions, or onboarding guidance.
2. **Leave update inconsistencies** — staff leave information is not properly recorded, communicated, or managed.
3. **KPI meeting irregularities** — KPI meetings are not scheduled consistently, tracked correctly, or maintained without interruption.
4. **Management file and decision disorganization** — management-related files, decisions, records, and supporting documentation are not stored, organized, or maintained properly.

**Urgency:** As soon as possible (SRC-VAR-001).

**Builder and ownership:** Mareenraj builds the initial AIOS architecture with guidance from Varmen. Once the foundation is established, HR Lead Mayurika becomes the primary operational owner responsible for maintaining the AIOS, supplying ongoing data, and managing relevant documentation.

**Known limit at v0.1:** MD-specific requirements have not yet been gathered directly. Final implementation scope may change after MD review. This draft is based on Varmen's relay of MD intent. Additional requirements may be introduced after a future meeting with the Managing Director.

---

## 2. Source Discipline

Every fact, rule, process claim, or operational detail in this CLAUDE.md must trace to a Source ID registered in [evidence/source-register.md](evidence/source-register.md).

**Rules:**

- If a claim has a Source ID: it is conditionally confirmed and may be used for foundation context.
- If a claim carries `[VERIFY]`: it is either unconfirmed, inferred, or pending a missing source. It must not be treated as operational truth until the verification is resolved.
- If a claim has no Source ID and no `[VERIFY]` tag: it is an error. Flag it immediately.
- Verbal memory, assumptions, and inferences from other sources are not substitutes for registered source evidence.
- Do not remove a `[VERIFY]` tag without first producing the source evidence and updating the source register.

**Current source status:**

| Source ID | Status |
|-----------|--------|
| SRC-VAR-001 | READY |
| SRC-MAYU-001 | READY |
| SRC-MAYU-002 | READY (image — org chart) |
| SRC-ARUN-001 | READY |
| SRC-ARUN-002 | READY |
| SRC-SUMAN-001-v1 | SUPERSEDED (.docx moved to archive subfolder; binary/unreadable) |
| SRC-SUMAN-001-v2 | READY — Markdown source, content confirmed |
| SRC-ADMIN-001 | PENDING — no documents received |
| SRC-POLICY-001 | READY — Final Approved (Varmen reviewed) |
| SRC-MD-HR-001 | READY — Varmen Reviewed 2026-06-25 |
| SRC-MD-SUMAN-001 | READY — Varmen Reviewed 2026-06-25 |

---

## 3. Organisation Structure

*(Source: SRC-MAYU-002 — org chart; SRC-MAYU-001 — stakeholder references; SRC-ARUN-001 — PRC member list)*

The organisation structure as known from available sources:

| Level | Role | Source Confirmed? |
|-------|------|-------------------|
| Executive | Managing Director (MD) | YES — SRC-MAYU-001, SRC-ARUN-001 |
| Executive | Director | YES — SRC-MAYU-001 |
| Manager | Admin Manager | [VERIFY — awaiting SRC-ADMIN-001] |
| Officer | HR Officer (Mayurika) | YES — SRC-MAYU-001 |
| Officer | Implementation Officer (Arun) | YES — SRC-ARUN-001 |
| Officer | Recruitment Officer (Suman) | YES — SRC-SUMAN-001-v2, SRC-MAYU-001 |
| Manager | Operational Manager | [VERIFY — SRC-ARUN-001 names role in PRC; full responsibilities not yet sourced] |
| Leader | Team Leaders (TLs) | YES — SRC-MAYU-001, SRC-ARUN-002 |
| Leader | Sub Team Leaders (STLs) | YES — SRC-MAYU-001 |
| Staff | Staff Members | YES — SRC-MAYU-001 |

**[VERIFY — awaiting SRC-ADMIN-001]:** Admin Manager authority scope, reporting line, approval rights, and operational responsibilities are unknown. The Admin Manager is named as a PRC member (SRC-ARUN-001) but no further authority, scope, or workflow detail may be assumed until SRC-ADMIN-001 is received.

**[VERIFY — Operational Manager]:** The Operational Manager is listed in the PRC (SRC-ARUN-001). Detailed responsibilities and reporting line have not been confirmed by a dedicated source.

**Key authority lines confirmed from sources:**

- Rajiv holds canonical authority over name spelling and team structure (SRC-MAYU-001).
- Suman leads recruitment and probation tracking for new staff (SRC-MAYU-001).
- Arun owns AXIOM band placement and KPI definitions (SRC-MAYU-001, SRC-ARUN-001).
- Mayurika is primary custodian of staff records and PDPA compliance (SRC-MAYU-001).
- The Director co-facilitates leadership review sessions with Mayurika (SRC-MAYU-001).
- MD receives monthly ROI and HR governance reports (SRC-MAYU-001).

---

## 4. Core Management AIOS Domains

*(Sources: SRC-VAR-001, SRC-MAYU-001, SRC-ARUN-001, SRC-ARUN-002, SRC-SUMAN-001, SRC-POLICY-001, SRC-MD-HR-001, SRC-MD-SUMAN-001)*

The following domains are confirmed by registered sources and are in scope for this AIOS:

| Domain | Source |
|--------|--------|
| Management gap detection | SRC-VAR-001 |
| Onboarding compliance | SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001 |
| Leave visibility | SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001 |
| KPI meeting governance | SRC-VAR-001, SRC-ARUN-001 |
| Management file and decision organization | SRC-VAR-001 |
| HR staff record governance | SRC-MAYU-001 |
| Recruitment quality control | SRC-SUMAN-001-v2 |
| KPI / AXIOM review framework | SRC-ARUN-001 |
| Review input and output tracking | SRC-ARUN-001 |
| SKILL file compliance | SRC-MAYU-001 |
| EOD productivity monitoring | SRC-MAYU-001 |
| Critic meeting / recurring issue tracking | SRC-MAYU-001 |
| Technical team ROI monitoring | SRC-MAYU-001 |
| Leave policy governance | SRC-POLICY-001 |
| Offboarding and termination governance | SRC-POLICY-001 |
| Workplace conduct and professional standards | SRC-POLICY-001 |
| Digital and physical asset governance | SRC-POLICY-001 |
| Mandatory AI tools compliance | SRC-POLICY-001 |
| Working hours and attendance management | SRC-POLICY-001 |
| LLM-queryable documentation compliance | SRC-MD-HR-001 |
| Requirement documentation governance | SRC-MD-HR-001 |
| Management folder structure governance | SRC-MD-HR-001 |
| Six-month hire ROI audit | SRC-MD-SUMAN-001 |
| Onboarding system validation (OLOS) | SRC-MD-SUMAN-001 |

---

## 5. Role Boundaries

*(Sources: SRC-MAYU-001, SRC-ARUN-001, SRC-ARUN-002)*

| Role | Confirmed Responsibilities | Source ID | [VERIFY] Limits |
|------|---------------------------|-----------|-----------------|
| **HR Officer (Mayurika)** | Staff record maintenance and data stewardship; PDPA compliance tracking; AXIOM weekly data submission to Arun; probation date monitoring; review schedule management; EOD productivity monitoring (Website & PH Teams); Critic Meeting coordination (with Muguntha and Jefri); SKILL file compliance enforcement (Developer & Technical/N8N Teams); Leadership Review coordination (with Director); 996 Project ROI monitoring; monthly HR governance reporting to MD | SRC-MAYU-001 | Does not write AXIOM band placements (Arun's authority); does not overwrite canonical name spelling (Rajiv's authority); does not write team structure data (Rajiv's authority); does not write salary band information |
| **Implementation Officer (Arun)** | KPI definitions per role; AXIOM band placement; weekly AXIOM processing; incident escalation management; PRC membership; management dashboard requirements; daily operational checklist across teams | SRC-ARUN-001, SRC-ARUN-002 | [VERIFY — detailed authority limits beyond KPI/AXIOM scope not yet documented] |
| **Recruitment Officer (Suman)** | Formal role designation: Head Hunter, Onboarder, 6-Month Progress ROI Reviewer (SRC-MD-SUMAN-001 — Varmen Reviewed 2026-06-25); recruitment pipeline management; 8-point candidate screening; interview scoring (50-point scale); rejected/on-hold tracking; commitment records; 7/14-day, Month 1, Month 3, and Month 6 reviews; source quality monitoring; 180-day handover; daily knowledge capture; six-month hire ROI audit (binary); OLOS onboarding validation; BGCT completion monitoring; weekly deliverables (Risk Identification, One-Month Task Rule, SKU/Margin/Hire-ROI Trace, LLM-in-the-Loop proof) | SRC-SUMAN-001-v2, SRC-MAYU-001, SRC-MD-SUMAN-001 | Line Manager identity in 180-day handover [VERIFY — §8.11]; Suman formal role designation and extended responsibilities confirmed — Varmen Reviewed 2026-06-25 (SRC-MD-SUMAN-001) |
| **Admin Manager** | [VERIFY — awaiting SRC-ADMIN-001] | SRC-ADMIN-001 PENDING | All authority, approval rights, and escalation responsibilities unknown until source received |
| **Operational Manager** | PRC member | SRC-ARUN-001 | [VERIFY — full operational responsibilities not yet sourced] |
| **Director** | Co-facilitates twice-weekly Leadership Review sessions with Mayurika; receives weekly and monthly review reports; approves corrective actions | SRC-MAYU-001 | [VERIFY — additional directorial responsibilities beyond leadership review not yet documented] |
| **Managing Director (MD)** | Receives monthly ROI reports and HR governance summaries; review authority over HR processes; receives weekly ROI updates on 996 Project | SRC-MAYU-001 | [VERIFY — MD-specific AIOS requirements not yet gathered directly; pending MD meeting] |
| **Team Leaders (TLs)** | Participate in twice-weekly leadership reviews; provide performance data; own action items from Critic Meetings; confirm training completions for staff records | SRC-MAYU-001 | — |
| **Sub Team Leaders (STLs)** | Referenced in staff records as current_stl_id; participate in measurable task tracking | SRC-MAYU-001, SRC-ARUN-002 | — |
| **Rajiv** | Canonical authority on name spelling and team structure; confirms company email and team placement for new joiners | SRC-MAYU-001 | — |
| **Visali** | Quality and knowledge value assessment lead for SKILL file submissions; assesses reusability, BLOS alignment, evidence quality | SRC-MAYU-001 | — |

---

## 6. Confidentiality and Data Safety

*(Source: SRC-VAR-001 — sensitivity guidance; SRC-MAYU-001 — PDPA references; SRC-POLICY-001 — company policy §14.0 and §2.0)*

No individually identifiable sensitive HR data, salary, disciplinary details, health information, grievance details, or private employee case details may be stored in this AIOS unless explicitly approved by MD and the HR owner with proper access control in place.

Default to process-level and aggregate information only.

**Data handling rules for this AIOS:**

| Data Type | Rule |
|-----------|------|
| Staff names in operational context | Use role titles by default; names only where process requires identification |
| Salary and compensation data | Out of scope for this AIOS at all times |
| Disciplinary case details | Not stored; only aggregate compliance rates and process status |
| Health and leave data | Process-level only (leave visibility, status flags); no personal health data |
| PDPA records | Existence and compliance status only; raw PDPA documents held by Mayurika, not stored here |
| Performance band placements (AXIOM) | Aggregate and process-level only; individual staff scores not stored |
| Grievance records | Not stored in this AIOS |
| Recruitment candidate data | Process-level only; no personal candidate data |

**PDPA note:** Mayurika is responsible for PDPA notice issuance and acknowledgement tracking for all staff. Personal email for records is held under PDPA-controlled access. This AIOS does not store PDPA personal data directly (SRC-MAYU-001).

---

## 7. KPI / AXIOM Context

*(Source: SRC-ARUN-001)*

> Note: This section reflects the content of SRC-ARUN-001 as provided by Arun (Implementation Officer). Where source wording is abbreviated or ambiguous, the original phrasing is preserved and a [VERIFY — Arun] tag is applied.

### 7.1 KPI Definitions by Team

| Team | KPIs |
|------|------|
| Portfolio Holders | 30%+ YOY Growth, Individual Staff Net Sales, Category Profitability |
| Website Team | 30%+ YOY Growth, ROAS >= 400%, Documentation Compliance |
| eBay Team | 30%+ YOY Growth, ACOS <= 20%, Individual Staff Net Sales |
| Account Holders | Assigned ID Performance, Task Compliance, Incident Compliance |
| PPC Team | ROAS Achievement, YOY Growth, Cost Efficiency |
| Technical Team | ROI Contribution, Automation Time Saving Hours, Documentation Quality, Queryable Assets |
| Development Team | ROI Contribution, Time Serving Hours, Delivery Timeliness, Evidence Submission, Queryable Assets |

### 7.2 AXIOM Band Placement

**Individual Staff Net Sales Bands:**

| Band | Range |
|------|-------|
| Red | Below 300 |
| Amber | 300–800 |
| Green | 800–1,500 |
| Dark Green | 1,500–3,000 |
| Purple | Above 3,000 |

**NNV Bands:**

| Band | Range |
|------|-------|
| Red | Negative Growth |
| Amber | 0–14% |
| Green | 15–29% |
| Dark Green | 30–49% |
| Purple | 50%+ |

### 7.3 KPI Detection Criteria

The following conditions trigger KPI risk detection:

- YOY Growth below 30%
- Website ROAS below 400%
- Amazon ACOS Below 25% [VERIFY — Arun: source wording is "Amazon ACOSBelow 25%" — threshold direction and formatting should be confirmed]
- eBay ACOS Below 20%
- Incident Score below 15/25
- 3+ incident reports
- Repeated task misses
- Missing documentation
- Low ROI contribution
- Low NNV growth
- Poor utilization

### 7.4 Review Inputs

Revenue, Profit, YOY Growth, ROAS, ACOS, Individual Staff Net Sales, Task Completion, Documentation Status, Incident Reports, ROI Contribution, Team Leader Feedback, Auditor Feedback, ROI Officer Feedback [VERIFY — Arun: source lists "ROI officer feed back" — confirm whether this is a distinct role or a title for an existing role].

### 7.5 Review Outputs

AXIOM Score, AXIOM Band, NNV Band, Risk Level, Coaching Requirement, Training Requirement, Warning Status, PIP Status, Bonus Eligibility, Promotion Candidate Status.

### 7.6 Weekly AXIOM Workflow

Collect data weekly → calculate KPI scores → assign bands → identify risks → conduct management review → issue action plans → monitor outcomes.

### 7.7 Incident Management & Escalation

**Time-based escalation:**

| Week | Action |
|------|--------|
| Week 1 | Coaching |
| Week 3 | Additional Support |
| Week 5 | First Warning |
| Week 7 | Second Warning |
| Week 8 | Third Warning + PRC Review |

**Incident count escalation:**

| Count | Action |
|-------|--------|
| 1 | Coaching |
| 2 | Observation |
| 3 | Escalation |
| 4 | Final Warning |
| 5+ | PRC Action |

### 7.8 PRC Governance

**Performance Review Committee members (SRC-ARUN-001):**

- Managing Director
- Implementation Officer
- Admin Manager [VERIFY — awaiting SRC-ADMIN-001: Admin Manager's PRC role and authority within PRC not yet independently confirmed]
- Team Leader
- Operational Manager [VERIFY — Arun: confirm Operational Manager PRC membership and scope of participation]

**PRC Responsibilities:** KPI Review, Bonus Approval, Escalation Decisions, Promotion Reviews.

### 7.9 Bonus Eligibility

All of the following must be met:

- YOY Growth >= 30%
- ROAS/ACOS Target Achieved
- Individual Staff Net Sales at Green Band or Above
- No Active Incident Reports
- Documentation Compliance >= 90%
- Positive ROI
- PRC Approval

### 7.10 Management Dashboard Requirements

| Cadence | Contents |
|---------|----------|
| Weekly | Revenue, Profit, AXIOM Band, Incident Tracking |
| Monthly | KPI Achievement, YOY Growth, ROI Contribution, Bonus Eligibility, Department Performance |

**Required Views:** Staff, Team, Department, Portfolio, Incident, Bonus, PRC Review.

---

## 8. Recruitment Context

*(Sources: SRC-SUMAN-001-v2 — `intelligence-inbox/raw-stakeholder-documents/suman-recruitment/Recruitment_Quality_Control_Process.md`; SRC-MD-SUMAN-001 — Varmen Reviewed 2026-06-25)*

> **Suman Formal Role Designation (Source: SRC-MD-SUMAN-001 — Varmen Reviewed 2026-06-25):** Suman's role encompasses three formal functions — Head Hunter, Onboarder, and 6-Month Progress ROI Reviewer. These designations were confirmed in MD discussion sessions and extend the operational scope described in §8.1–§8.12. Full governance directives in §11.7–§11.8 and context/recruitment-context.md §13.

### 8.1 Candidate Pipeline

Candidates enter the recruitment pipeline through internal and external referrals, social media advertisements, recruitment websites, and other sourcing channels. Candidates are shortlisted based on position requirements and vacancy availability.

### 8.2 8-Point Screening Criteria

All candidates are assessed against the following 8-point screening criteria before progressing to the interview stage:

1. O/L Mathematics
2. English Proficiency
3. IT Skills
4. E-Commerce Knowledge
5. AI Familiarity
6. Salary Alignment
7. Availability
8. Commitment

### 8.3 Interview Scoring

During the final interview (online or in-person), candidates are evaluated across five areas:

| Area | Max Score |
|------|-----------|
| Technical Knowledge | 10 |
| AI Knowledge | 10 |
| Communication Skills | 10 |
| Confidence | 10 |
| Cultural Fit | 10 |
| **Total** | **50** |

Candidates who score above 30 marks may be considered for recruitment, subject to meeting company requirements and agreeing to the offered salary and employment terms.

### 8.4 Rejected and On-Hold Candidate Tracking

Separate tracking sheets are maintained for:

- Rejected Candidates
- On-Hold Candidates

These records support future recruitment requirements and talent pooling.

### 8.5 Recruitment Commitment Records

Every offer includes a documented commitment record outlining what the candidate has agreed to deliver during the interview and after the initial 7-day evaluation period.

### 8.6 7 / 14-Day Review

A review is scheduled after the first 7/14 days, incorporating feedback from the Trainer / Team Leader evaluation reports. Assessment areas:

- Knowledge gained during training
- Understanding of assigned responsibilities
- Confidence level and communication skills
- AI/LLM adoption and practical application
- Ability to perform assigned tasks independently
- Commitment to agreed objectives
- Areas requiring further support or improvement

### 8.7 Month 1 Review

**Assessment Areas:**

- Onboarding completion
- System and tool access
- Initial assignments
- Early commitment verification

**Employee Status Categories:**

| Status | Implication |
|--------|-------------|
| On Track | Performing as expected |
| Watch | Minor concerns; monitoring required |
| Concern | Issues identified; documented corrective action plan required before Month 3 |
| Critical | Serious performance or commitment concerns |

Any employee marked as "Concern" at Month 1 will receive a documented corrective action plan with clear responsibilities and deadlines before the Month 3 review.

### 8.8 Month 3 Review

**Assessment Areas:**

- Commitment delivery review
- KPI participation
- Behavioural observations
- Corrective action progress

Employees marked "Concern" at Month 1 who fail to achieve their corrective action plan by Month 3 may be considered for discontinuation during probation, subject to management review and approval.

### 8.9 Month 6 Review

**Assessment Areas:**

- Full commitment versus delivery assessment
- Probation confirmation decision
- Formal handover preparation

### 8.10 Source Quality Monitoring

All recruitment sources are monitored across two dimensions:

**Activity Metrics:**

- Applications received
- Response rates
- Recruitment costs

**Quality Metrics:**

- Long-term hiring success
- Probation completion rates
- Performance outcomes

### 8.11 180-Day Handover

At Month 6, a structured 15-minute handover meeting is conducted involving Mayurika (referred to as "Mayoorika" in source document), Arun, and Suman.

> **Typing correction (SRC-SUMAN-CONF-001 — 2026-06-25):** The original source document (SRC-SUMAN-001-v2) mentioned a "Line Manager" attendee. Suman confirmed this was a typing mistake. There is no Line Manager role in the 180-day handover. The [VERIFY] item for Line Manager identity (former item 11) is resolved.

The review covers:

- Commitment delivery summary
- Employee record verification
- KPI baseline confirmation
- Outstanding issues and assigned owners

Recruitment ownership formally concludes at this stage unless unresolved actions remain.

**Cross-reference SRC-MAYU-001:** Mayurika proactively reminds Suman 2 weeks before the 6-month handoff is due, and writes `recruitment_source_id` and `recruitment_promise_set_id` into the staff record upon handoff.

### 8.12 Daily Knowledge Capture

Suman dedicates one hour each working day to documenting:

- Evaluation and training status
- Recruitment trends
- Sourcing insights
- Interview observations
- Probation concerns
- Commitment gaps

---

## 9. HR Context

*(Source: SRC-MAYU-001)*

The following summarises Mayurika's confirmed process-level HR responsibilities. No personal employee data is included.

### 9.1 Staff Record Governance

Mayurika is the primary custodian and write-authority for the staff data model. She maintains canonical employment status, dates, training logs, and review schedules for all active, probationary, on-leave, suspended, and departed employees.

She does **not** write: canonical name spelling (Rajiv), team structure data (Rajiv), salary band information, or AXIOM band placements (Arun).

**Key lifecycle events managed:** Join, active employment, month-6 handoff from Suman, status changes (leave, suspension, departure), weekly AXIOM data submission, PDPA acknowledgement tracking.

### 9.2 PDPA Tracking

Mayurika issues PDPA notices to all new joiners and records the acknowledgement date (`pdpa_notice_acknowledged_on`). Staff with null acknowledgement dates are flagged as non-compliant. A monthly PDPA compliance report is prepared for management. Departed staff records are reviewed against the PDPA retention schedule.

### 9.3 Review Scheduling

Mayurika maintains `last_review_date` and `next_review_due` for all staff. Any staff member with an overdue `next_review_due` without an escalation on record is a governance failure. Monthly review schedule refresh is performed.

### 9.4 EOD Productivity Monitoring

Mayurika manages the End of Day (EOD) Performance Management program for the Website Team and PH Team (active since March 2025). Staff submit daily task reports via a ChatGPT project workspace. Mayurika monitors submission compliance, syncs data with an EOD Dashboard, and produces weekly and monthly productivity analysis covering task tier, time spent, yield, and sales-oriented versus operational task distribution.

### 9.5 Critic Meeting Management

Monthly Critic Meetings are co-facilitated by Mayurika, Muguntha, and Jefri. Each session reviews one department, with employees from other departments providing structured feedback. Following each session, Mayurika arranges an Action Review Meeting with the relevant Team Leader. Action items are tracked in the Critic Meeting Action Tracker and published on the company notice board.

### 9.6 SKILL File Compliance

Mayurika is the SKILL File Compliance Manager for the Developer Team and Technical/N8N Team. She monitors daily submission quantity, coverage, and compliance against the 80% quality benchmark. Visali holds parallel responsibility for quality depth assessment (reusability, BLOS alignment, evidence quality). Mayurika triggers same-day follow-up for missing or weak submissions. Escalation path for persistent non-compliance: Sajeesan, Pratheepan, Joshna, or management.

### 9.7 Technical Team ROI Monitoring

Mayurika coordinates post-996-Project ROI monitoring. She collects weekly ROI data from the PH Team, Digital Marketing Team, and Technical Team, and prepares weekly and monthly ROI performance reports for the MD.

### 9.8 Leadership Review Coordination

Twice-weekly Leadership Review sessions are co-facilitated by Mayurika and the Director. Separate review frameworks exist for Sales Teams and Non-Sales Teams. Mayurika schedules sessions, prepares frameworks, captures data, validates team leader-reported data against management-level data, tracks action items, and prepares governance reports. eBay and CPPC teams are subject to enhanced data validation due to identified historical reporting inconsistencies.

---

## 10. Company Policy Context

*(Source: SRC-POLICY-001 — Final Approved Company Policy Manual, Varmen reviewed)*

> This section summarises company-wide policy rules confirmed by SRC-POLICY-001. All content is process-level. No personally identifiable data, salary figures, or individual case details are included. The filename contains "Draft" but Varmen confirmed this is the final reviewed company policy source.

### 10.1 Leave Policy

*(Source: SRC-POLICY-001 §6.0–6.5)*

**General leave guidelines:**

- Leave requests must be updated in the leave system at least 48 hours in advance.
- Maximum 12% of staff may take leave simultaneously. Excess is considered unauthorised leave.
- Team leave limits: maximum 2 team members per day (or 1 for CST, Content Writing, and Postage teams).
- Medical/sick leave: hospitalised conditions supported by medical reports only.

**Leave plan notice periods:**

| Leave Duration | Notice Required | Approval Level |
|----------------|----------------|----------------|
| 3 days | 1 week | Subteam Leader |
| 4–7 days | 4 weeks | Team Leader |
| 7–12 days | 8 weeks | HR approval |
| 13–14 days | 3 months | Manager approval |

**Planned leave — entitlement:**

- No leave during the 3-month probationary period. If urgent, leave can be taken and recovered within weekdays.
- Junior staff: 1 day leave per month.
- Senior staff: 2 days leave per month (32 days per annum).
- No leave coverage available on Saturdays.

**Unplanned leave:** 5 days per year. Excess is unauthorised and may lead to disciplinary action.

**Short leave and early-off:** Maximum 2 hours per month. Requires 24-hour advance notice and supervisor approval.

**Maternity leave:** 3 months (1st or 2nd baby). 30 days prior notice required. Full pay for full-time employees.

### 10.2 Onboarding Policy

*(Source: SRC-POLICY-001 §3.0, §17.0)*

Structured onboarding includes: collection of pre-employment documents before start date; first-day orientation covering team introduction, company culture, and key policies; role-specific training with mentor or supervisor support; and a defined probation period with regular feedback. All new hires must complete AI tool training as part of onboarding (§17.0).

### 10.3 Offboarding and Termination

*(Source: SRC-POLICY-001 §2.1–2.2, §10.0–10.8)*

- **Resignation notice:** 2-month (60-day) notice required from employees.
- **Immediate resignation:** No entitlement to unpaid wages or benefits.
- **Company-initiated termination:** Company provides 2-month notice. Immediate termination without notice for gross misconduct (theft, harassment, fraud, breach of confidentiality, serious workplace disruption).
- **Payment on termination:** Voluntary resignation — no additional payment. Company-initiated — payment based on days worked.
- **Credential revocation:** All critical login credentials revoked promptly on resignation or termination.
- **Exit interview:** Conducted by HR to confirm return of property, digital assets, and transfer of duties.
- **Final checklist:** Signed by employee, their manager, and an HR representative.
- **Return of assets:** All physical and digital assets must be returned before departure.
- **Post-departure:** Ongoing confidentiality obligation; former employees prohibited from accessing company digital assets after departure.

### 10.4 Workplace Conduct

*(Source: SRC-POLICY-001 §4.0–4.1, §12.0, §13.0)*

- **No-gossip policy:** Employees must not discuss others' personal or professional lives without consent, make negative comments about colleagues or management, or share unverified rumours.
- **Feedback channels:** Concerns should be raised through one-on-one discussions, written feedback to the relevant department or supervisor, Critique Meetings, or written feedback to the Company Director.
- **Constructive criticism:** All feedback must be specific, actionable, and focused on work performance or procedures.
- **Non-solicitation:** Employees must not engage in outside business relationships with colleagues, clients, or partners without written consent from the company.
- **Code of conduct:** Employees must act in the company's best interest and use designated communication tools.

### 10.5 Mandatory AI Tools Policy

*(Source: SRC-POLICY-001 §17.0)*

AI tools are mandatory across all departments and roles. Daily use is required and monitored. AI inactivity negatively impacts performance reviews. Key rules:

- All new hires must complete AI tool training during onboarding.
- Employees shifting departments must complete role-specific AI reorientation.
- Each subteam leader maintains a standardised AI toolkit and ensures staff competency.
- At least one AI-based contribution or efficiency gain per month must be reported.
- Do not input sensitive customer, financial, or personal information into AI tools.
- Non-compliance escalation: Formal warning → Performance impact → Escalation to HR with potential removal from key responsibilities.

### 10.6 Other Operational Policies

*(Source: SRC-POLICY-001)*

| Policy Area | Key Rule | Policy Section |
|-------------|----------|----------------|
| Late arrival | 2 instances per month allowable; deductions applied for excess (15 min late = 30 min deduction; 30–60 min late = 4 hrs deduction; 60+ min may escalate to disciplinary action) | §5.0 |
| Office phone usage | No phones inside office during working hours. Emergency calls (up to 5 minutes) permitted outside the workspace. Social media prohibited during work hours. | §7.0 |
| Headphone usage | Headphones permitted for virtual meetings or audio concentration tasks only. | §8.0 |
| Focus time | Structured focus blocks in place (8:30 AM and 9:00 AM schedules). Skype communication restricted during deep work periods. | §9.0 |
| Hours of work | Minimum 41.5 hours per week. Additional hours may be required to meet deadlines. | §16.0 |
| Time tracking | Employees required to log work hours daily. | §15.0 |
| Digital assets | Digital assets for work only. All assets created during employment are company property. No unauthorized social media groups implying company association. | §11.0 |
| Physical assets | Return all equipment in good condition on departure. Loss or damage must be reported immediately. | §11.2 |
| Salary confidentiality | Employees must not share or discuss individual salaries, bonuses, or allowances with other employees. | §2.0 |

---

## 11. MD Governance Context

*(Sources: SRC-MD-HR-001 — MD & HR Discussion Notes; SRC-MD-SUMAN-001 — MD & Suman Discussion Notes; Varmen Reviewed 2026-06-25)*

> This section reflects MD-directed governance principles from registered discussion note sources. All content is process-level. No individual staff case details, candidate personal data, or salary information are included. Varmen Reviewed MD Governance Evidence.

### 11.1 LLM-Queryable Documentation Standard

*(SRC-MD-HR-001, 22/05/2026 and 22/06/2026)*

Any activity not documented in LLM-queryable format will be considered as "not happened." This governance principle applies organisation-wide to all work activities, operational decisions, and management records.

### 11.2 Task ID Standard

*(SRC-MD-HR-001, 19/11/2025)*

Every task must be assigned a unique Task ID. Work performed without a Task ID cannot be tracked, validated, or attributed.

### 11.3 Requirement Documentation Governance

*(SRC-MD-HR-001, 16/06/2026 and 15/05/2026)*

No verbal MD instruction may be executed without first being converted into a written, documented requirement. Development work must not begin until at least 85% of project requirements are documented and approved (the 85% specification rule). All requirement files must contain the following metadata fields: Project Name, Start Date, Expected Deadline, User / Stakeholder, Company Value Contribution, MVP Submission Date, Project Owner, Status.

### 11.4 Business Logic Documentation

*(SRC-MD-HR-001, 10/02/2026 and 24/03/2026)*

Business logic must be documented in plain English, comprehensible by a fresh joiner. A daily 10% business logic validation is required and must be evidenced (SRC-MD-HR-001, 22/05/2026).

### 11.5 Management Folder Structure and BGCT Governance

*(SRC-MD-HR-001, 08/06/2026)*

BGCT (Best Practices, Guidelines, Checklists, Tutorials) documents must be collected and stored centrally. Management Team Google Sheets must be identified, listed, and consolidated. Staff biodata documents must be consolidated under PDPA-compliant access controls.

### 11.6 New Employee ROI Monitoring

*(SRC-MD-HR-001, 16/06/2026)*

ROI reviews must be conducted at 1 week, 1 month, and 3 months for all new employees. Missing ROI review at any of these milestones is a governance failure.

### 11.7 Six-Month Hire ROI Audit — Suman

*(SRC-MD-SUMAN-001, 07/05/2026)*

Suman must conduct a binary ROI audit at the 6-month mark for each hire, assessing traceable contribution to: Revenue, Margin, NNV reduction, Automation output, or Capacity. Evidence of this audit must be documented before the 180-day handover.

### 11.8 OLOS Onboarding Validation

*(SRC-MD-SUMAN-001, 29/05/2026)*

The OLOS onboarding system must be validated against actual company operations before go-live. Required validation documents: Evidence Standard, Onboarding Guide, OLOS Master, Team Leader Setup Guide, File Pack Register. Department handbooks, role guides, and SOP documents must be confirmed as present before deployment.

---

## 12. Assistant Allowed Actions

Within this Management AIOS, the assistant may:

- Summarize source-backed context from registered sources
- Identify gaps between registered sources and expected coverage
- Create Claude Code prompts for AIOS development tasks
- Create validation reports (readiness checks, source maps, gap registers)
- Draft documentation for review by Varmen or Mayurika
- Prepare review checklists based on confirmed process flows
- Maintain and update source maps and [VERIFY] registers
- Flag when a claim lacks a Source ID or [VERIFY] tag
- Ask clarifying questions when instructions require unregistered information

---

## 13. Assistant Forbidden Actions

The assistant must not:

- Finalize HR policy from this AIOS context alone
- Make employee decisions or produce outputs that would directly affect individual staff members
- Send messages on behalf of HR to employees
- Change production data in any HR, payroll, or performance system
- Connect to or write to live HR systems
- Automate HR decisions without explicit human approval from the appropriate authority
- Promote any content in this AIOS to parent AIOS truth without Varmen sign-off
- Remove a `[VERIFY]` tag without producing the source evidence that resolves the gap
- Invent Admin Manager authority, escalation logic, or approval chains
- Treat this Foundation Draft v0.1 as final approved operational truth
- Use unregistered sources (sources not listed in evidence/source-register.md)

---

## 14. [VERIFY] Register

The following items are unresolved and must remain tagged `[VERIFY]` until the listed condition is met.

> **Resolved since Foundation Draft v0.1:** Item 12 (Leave policy detail) was resolved on 2026-06-23 by SRC-POLICY-001 §6.0–6.5. The full leave framework is documented in §10.1 and context/hr-operations-context.md §9. Item 11 (Line Manager identity in 180-day handover) was resolved on 2026-06-25 by SRC-SUMAN-CONF-001 — Suman confirmed the "Line Manager" reference in SRC-SUMAN-001-v2 was a typing mistake; no Line Manager role exists in the handover. See §8.11 and evidence/stakeholder-confirmations/suman-line-manager-typing-correction-2026-06-25.md.

| # | [VERIFY] Item | Blocked By | Resolution Condition |
|---|---------------|-----------|----------------------|
| 1 | Admin Manager document | SRC-ADMIN-001 PENDING | Receive and register Admin Manager documents |
| 2 | Admin Manager authority scope | SRC-ADMIN-001 PENDING | Admin Manager source received and content reviewed |
| 3 | Admin Manager PRC role and authority within PRC | SRC-ADMIN-001 PENDING | Admin Manager source received and confirmed by Varmen |
| 4 | Admin Manager approval chains and escalation paths | SRC-ADMIN-001 PENDING | Admin Manager source received and confirmed by Varmen |
| 5 | Final escalation paths (routes through Admin Manager) | SRC-ADMIN-001 PENDING | Admin Manager source received |
| 6 | MD-specific requirements beyond Varmen relay | SRC-VAR-001 acknowledged limit | Future meeting with MD; findings documented and registered |
| 7 | Final implementation scope | SRC-VAR-001 acknowledged limit | MD review meeting completed |
| 8 | Amazon ACOS threshold wording | SRC-ARUN-001 formatting unclear | Confirm exact threshold wording with Arun |
| 9 | Operational Manager PRC role confirmation | SRC-ARUN-001 names role; no dedicated source | Arun or dedicated Operational Manager source confirms |
| 10 | ROI Officer identity / title in review inputs | SRC-ARUN-001 wording unclear | Confirm with Arun whether this is a distinct role. **VERIFY Resolved Candidate:** SRC-MD-SUMAN-001 (07/05/2026) identifies ROI Officers as Arun and Mayurika jointly. [VERIFY] tag must remain until Arun directly confirms. |
| 11 | Director authority beyond leadership review | SRC-MAYU-001 partial coverage | Dedicated Director source or interview |
| 12 | Exact tool names for HR and EOD systems | SRC-MAYU-001 marks several as (assumed) | Confirm actual tool names with Mayurika |

---

## 15. Queryability Test

A clean LLM should be able to answer the following questions from this document:

| Question | Answerable from v0.1? |
|----------|-----------------------|
| What is this AIOS and why does it exist? | YES — Section 1 |
| What sources support it? | YES — Section 2 |
| What is verified and what is pending? | YES — Sections 2 and 14 |
| Who reviews and owns it? | YES — Header block and Section 5 |
| What must happen next? | YES — Section 16 |
| What are the KPI definitions and AXIOM bands? | YES — Section 7 |
| What are Mayurika's HR responsibilities? | YES — Section 9 |
| What is the incident escalation path? | YES — Section 7.7 |
| Who sits on the PRC? | YES, partially — Section 7.8 (Admin Manager role [VERIFY]) |
| What can the assistant do and not do? | YES — Sections 12 and 13 |
| What is the Admin Manager's authority? | NO — [VERIFY], awaiting SRC-ADMIN-001 |
| What are the final escalation paths? | NO — [VERIFY], awaiting SRC-ADMIN-001 and MD review |
| What is the full recruitment process? | YES — Section 8 (pipeline, 8-point screening, scoring, reviews, handover, daily capture all confirmed via SRC-SUMAN-001-v2) |
| What is the company leave policy? | YES — Section 10.1 (SRC-POLICY-001) |
| What are the offboarding and termination procedures? | YES — Section 10.3 (SRC-POLICY-001) |
| Is AI tool use mandatory? | YES — Section 10.5 (SRC-POLICY-001) |
| What are the workplace conduct rules? | YES — Section 10.4 (SRC-POLICY-001) |

---

## 16. Next Step

**Completed 2026-06-23:** SRC-POLICY-001 (Final Approved Company Policy Manual, Varmen reviewed) has been registered and integrated. Leave policy detail ([VERIFY] item 12) is resolved. See [validation/policy-update-impact-report.md](validation/policy-update-impact-report.md) for full impact summary.

**Completed 2026-06-25:** SRC-MD-HR-001 (MD & HR Discussion Notes) and SRC-MD-SUMAN-001 (MD & Suman Discussion Notes) have been registered and integrated as conditional sources. Both sources are sensitivity-checked and source-mapped. Key additions: §11 MD Governance Context, §4 domain extensions, §5 Suman role update, §8 formal role note. VERIFY Resolved Candidate identified for item 10 (ROI Officer = Arun and Mayurika). Varmen review of both MD discussion sources is [VERIFY]. See [validation/md-discussion-source-ingestion-check.md](validation/md-discussion-source-ingestion-check.md), [validation/md-discussion-impact-map.md](validation/md-discussion-impact-map.md), [validation/md-discussion-conflict-check.md](validation/md-discussion-conflict-check.md), and [validation/md-discussion-skill-impact-check.md](validation/md-discussion-skill-impact-check.md) for full details.

**Immediate action:** Obtain Admin Manager source document and/or conduct Admin Manager interview. Once received:

1. Register the document as SRC-ADMIN-001 in [evidence/source-register.md](evidence/source-register.md)
2. Update [validation/raw-source-readiness-check.md](validation/raw-source-readiness-check.md) — change SRC-ADMIN-001 status from PENDING to READY
3. Review and resolve all `[VERIFY — awaiting SRC-ADMIN-001]` items in Section 14
4. Update this CLAUDE.md: populate Admin Manager rows in Sections 3, 5, and 7.8
5. Update [validation/claude-source-map.md](validation/claude-source-map.md) with new Admin Manager claims
6. Remove resolved items from [validation/pending-admin-manager-gaps.md](validation/pending-admin-manager-gaps.md)
7. Validate updated draft with Varmen before promoting to v0.2

**Secondary actions:** Confirm Line Manager identity in 180-day handover with Suman or Varmen (§8.11, [VERIFY] item 11). Confirm Arun wording items: Amazon ACOS threshold, Operational Manager PRC role, ROI Officer title ([VERIFY] items 8–10) — note: item 10 has a VERIFY Resolved Candidate from SRC-MD-SUMAN-001; Arun direct confirmation is still required.

**Skill update actions (pending Varmen approval):** management-gap-detection and recruitment-quality-check have identified update candidates from the MD discussion sources. See [validation/md-discussion-skill-impact-check.md](validation/md-discussion-skill-impact-check.md) for full recommendations. Do not edit skill files until Varmen reviews.

**Before v1.0 approval:** MD-specific requirements must be gathered directly and registered as a source. CLAUDE.md must not be treated as final operational truth until MD review is complete and all [VERIFY] items are resolved.

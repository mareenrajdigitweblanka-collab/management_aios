---
name: recruitment-context
type: context
source-ids: SRC-SUMAN-001-v2, SRC-MAYU-001, SRC-POLICY-001
created: 2026-06-23
last-updated: 2026-06-23
status: CONDITIONAL PASS — Foundation Draft v0.1
---

# Recruitment Context

**Pass/Fail Rule:** PASS if all recruitment process claims trace to SRC-SUMAN-001-v2 or SRC-MAYU-001 and no personal candidate data is included. FAIL if any unsourced recruitment policy, candidate personal data, or unresolved [VERIFY] tag is removed.

> This file contains process-level recruitment information only. No individual candidate names, personal data, or case-specific details are stored here.

---

## 1. Candidate Pipeline

*(Source: SRC-SUMAN-001-v2 — Recruitment_Quality_Control_Process.md)*

Candidates enter the recruitment pipeline through:

- Internal and external referrals
- Social media advertisements
- Recruitment websites
- Other sourcing channels

Candidates are shortlisted based on position requirements and vacancy availability.

---

## 2. 8-Point Screening Criteria

*(Source: SRC-SUMAN-001-v2)*

All candidates are assessed against the following 8-point screening criteria before progressing to the interview stage:

| # | Criterion |
|---|-----------|
| 1 | O/L Mathematics |
| 2 | English Proficiency |
| 3 | IT Skills |
| 4 | E-Commerce Knowledge |
| 5 | AI Familiarity |
| 6 | Salary Alignment |
| 7 | Availability |
| 8 | Commitment |

---

## 3. Interview Scoring

*(Source: SRC-SUMAN-001-v2)*

Candidates are evaluated across five areas during the final interview (online or in-person):

| Area | Max Score |
|------|-----------|
| Technical Knowledge | 10 |
| AI Knowledge | 10 |
| Communication Skills | 10 |
| Confidence | 10 |
| Cultural Fit | 10 |
| **Total** | **50** |

Candidates who score above 30 marks may be considered for recruitment, subject to meeting company requirements and agreeing to the offered salary and employment terms.

---

## 4. Rejected and On-Hold Candidate Tracking

*(Source: SRC-SUMAN-001-v2)*

Separate tracking sheets are maintained for:

- Rejected Candidates
- On-Hold Candidates

These records support future recruitment requirements and talent pooling.

---

## 5. Recruitment Commitment Records

*(Source: SRC-SUMAN-001-v2)*

Every offer includes a documented commitment record outlining what the candidate has agreed to deliver during the interview and after the initial 7-day evaluation period.

---

## 6. 7 / 14-Day Review

*(Source: SRC-SUMAN-001-v2)*

A review is scheduled after the first 7 or 14 days, incorporating feedback from Trainer / Team Leader evaluation reports.

**Assessment areas:**

- Knowledge gained during training
- Understanding of assigned responsibilities
- Confidence level and communication skills
- AI/LLM adoption and practical application
- Ability to perform assigned tasks independently
- Commitment to agreed objectives
- Areas requiring further support or improvement

---

## 7. Month 1 Review

*(Source: SRC-SUMAN-001-v2)*

> **Probation leave restriction (Source: SRC-POLICY-001 §6.2):** No leave is permitted during the 3-month probationary period. If urgent, leave can be taken and recovered within weekdays.

**Assessment areas:**

- Onboarding completion
- System and tool access
- Initial assignments
- Early commitment verification

**Employee status categories:**

| Status | Implication |
|--------|-------------|
| On Track | Performing as expected |
| Watch | Minor concerns; monitoring required |
| Concern | Issues identified; documented corrective action plan required before Month 3 |
| Critical | Serious performance or commitment concerns |

Any employee marked "Concern" at Month 1 will receive a documented corrective action plan with clear responsibilities and deadlines before the Month 3 review.

---

## 8. Month 3 Review

*(Source: SRC-SUMAN-001-v2)*

**Assessment areas:**

- Commitment delivery review
- KPI participation
- Behavioural observations
- Corrective action progress

Employees marked "Concern" at Month 1 who fail to achieve their corrective action plan by Month 3 may be considered for discontinuation during probation, subject to management review and approval.

---

## 9. Month 6 Review

*(Source: SRC-SUMAN-001-v2)*

**Assessment areas:**

- Full commitment versus delivery assessment
- Probation confirmation decision
- Formal handover preparation

---

## 10. Source Quality Monitoring

*(Source: SRC-SUMAN-001-v2)*

All recruitment sources are monitored across two dimensions:

**Activity metrics:**

- Applications received
- Response rates
- Recruitment costs

**Quality metrics:**

- Long-term hiring success
- Probation completion rates
- Performance outcomes

---

## 11. 180-Day Handover

*(Source: SRC-SUMAN-001-v2; cross-reference SRC-MAYU-001)*

At Month 6, a structured 15-minute handover meeting is conducted.

**Attendees:**

- Line Manager **[VERIFY — SRC-SUMAN-001-v2: role named as attendee but role holder not identified in this source. Confirm with Suman or Varmen.]**
- Mayurika (HR Officer) — referred to as "Mayoorika" in source document
- Arun (Implementation Officer)
- Suman (Recruitment Officer)

**Review covers:**

- Commitment delivery summary
- Employee record verification
- KPI baseline confirmation
- Outstanding issues and assigned owners

Recruitment ownership formally concludes at this stage unless unresolved actions remain.

**Cross-reference (SRC-MAYU-001):** Mayurika proactively reminds Suman 2 weeks before the 6-month handoff is due. Upon handoff, Mayurika writes `recruitment_source_id` and `recruitment_promise_set_id` into the staff record.

---

## 12. Daily Knowledge Capture

*(Source: SRC-SUMAN-001-v2)*

Suman dedicates one hour each working day to documenting:

- Evaluation and training status
- Recruitment trends
- Sourcing insights
- Interview observations
- Probation concerns
- Commitment gaps

---

## Remaining [VERIFY] Item

| # | [VERIFY] Item | Source | Resolution Condition |
|---|---------------|--------|---------------------|
| 1 | Line Manager identity in 180-day handover | SRC-SUMAN-001-v2 names role; role holder not identified | Confirm with Suman or Varmen |

---

## Source IDs Used in This File

| Claim Area | Source ID | Status |
|------------|-----------|--------|
| Candidate pipeline, 8-point screening, interview scoring, tracking sheets, commitment records | SRC-SUMAN-001-v2 | CONFIRMED |
| 7/14-day, Month 1, Month 3, Month 6 reviews | SRC-SUMAN-001-v2 | CONFIRMED |
| Source quality monitoring, 180-day handover structure, daily knowledge capture | SRC-SUMAN-001-v2 | CONFIRMED |
| Mayurika 2-week reminder; recruitment_source_id and recruitment_promise_set_id fields | SRC-MAYU-001 | CONFIRMED |
| Line Manager identity in 180-day handover | SRC-SUMAN-001-v2 | [VERIFY] |
| Probation leave restriction — no leave during 3-month probation | SRC-POLICY-001 | CONFIRMED |

---

## Pass/Fail Result

**CONDITIONAL PASS** — All process claims trace to SRC-SUMAN-001-v2 or SRC-MAYU-001. No personal candidate data included. One [VERIFY] item remains correctly tagged: Line Manager identity in the 180-day handover.

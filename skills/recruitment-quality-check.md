---
name: recruitment-quality-check
type: skill
tier: 1
status: DRAFT — Foundation Draft v0.1
sources: SRC-SUMAN-001-v2, SRC-MAYU-001, SRC-POLICY-001
context-files: context/recruitment-context.md, context/confidentiality-rules.md, context/verify-register.md
created: 2026-06-23
owner-for-review: Varmen (validation); Mayurika (operational review after foundation approval)
---

# Skill: Recruitment Quality Check

**Pass/Fail Rule:** PASS if every checklist item, process step, review criterion, and output field traces to SRC-SUMAN-001-v2, SRC-MAYU-001, or SRC-POLICY-001, and all [VERIFY] tags are preserved. FAIL if any recruitment rule is invented, any [VERIFY] is removed without registered source evidence, any personal candidate data is stored, or if this skill makes a hiring decision.

---

## 1. What This Skill Does

*(Source: SRC-SUMAN-001-v2 — Recruitment_Quality_Control_Process.md; SRC-MAYU-001; SRC-POLICY-001)*

This skill supports checking the completeness and quality of recruitment process execution. It checks whether each stage of the confirmed recruitment process has been completed and whether required records exist. It surfaces gaps and missing steps for human review.

It does not make hiring decisions. It does not approve or reject candidates. It does not store personal candidate data.

---

## 2. What This Skill Does NOT Do

- Does not approve or reject candidates
- Does not make probation decisions
- Does not make discontinuation decisions (subject to management review and approval — SRC-SUMAN-001-v2 §8.8)
- Does not identify the Line Manager in the 180-day handover [VERIFY — item 11 in verify-register.md]
- Does not store personal candidate information (names, personal contact details, personal data)
- Does not finalize escalation paths involving Admin Manager authority [VERIFY — SRC-ADMIN-001 PENDING]
- Does not invent screening thresholds, scoring criteria, or review timelines beyond what is stated in registered sources
- Does not automate any recruitment action
- Does not send messages to candidates or staff on behalf of HR

---

## 3. Allowed Input Types

Inputs must be process-level or aggregate. No personal candidate data may be provided.

| Allowed Input Type | Example |
|--------------------|---------|
| Pipeline stage status | "Candidate shortlisted; 8-point screen not completed" |
| Screening checklist status | "AI Familiarity criterion not assessed" |
| Interview scoring status | "Interview score recorded as 28/50" |
| Tracking sheet status | "No on-hold tracking sheet found for this role" |
| Commitment record status | "Commitment record not issued with offer" |
| Review completion flags | "7/14-day review not scheduled" |
| Month 1 / 3 / 6 status labels | "Month 1 status: Concern — corrective action plan not yet produced" |
| Handover status | "Month 6 reached; 180-day handover meeting not scheduled" |
| Daily knowledge capture status | "No daily capture entry for last 3 working days" |

**Not permitted as input:**
- Individual candidate personal details, addresses, contact information
- Salary negotiation data
- Health or medical information about candidates
- Any data not permissible under confidentiality-rules.md

---

## 4. Recruitment Process Checklist

### 4.1 Candidate Pipeline Check

*(Source: SRC-SUMAN-001-v2 §1)*

| Check Item | Expected Standard | Gap if Missing |
|------------|-------------------|----------------|
| Sourcing channel recorded | Pipeline entry includes source channel (referral, social media, recruitment website, other) | Source quality cannot be monitored |
| Shortlisting basis documented | Candidate shortlisted against position requirements and vacancy availability | Pipeline integrity not verifiable |

---

### 4.2 8-Point Screening Check

*(Source: SRC-SUMAN-001-v2 §2)*

All 8 criteria must be assessed before the candidate progresses to the interview stage:

| # | Criterion | Status |
|---|-----------|--------|
| 1 | O/L Mathematics | Must be assessed |
| 2 | English Proficiency | Must be assessed |
| 3 | IT Skills | Must be assessed |
| 4 | E-Commerce Knowledge | Must be assessed |
| 5 | AI Familiarity | Must be assessed |
| 6 | Salary Alignment | Must be assessed |
| 7 | Availability | Must be assessed |
| 8 | Commitment | Must be assessed |

**Gap flag:** If any criterion is not assessed before interview stage, the screening is incomplete.

---

### 4.3 Interview Scoring Check

*(Source: SRC-SUMAN-001-v2 §3)*

The final interview (online or in-person) must be scored across all five areas:

| Area | Maximum Score | Required |
|------|--------------|----------|
| Technical Knowledge | 10 | YES |
| AI Knowledge | 10 | YES |
| Communication Skills | 10 | YES |
| Confidence | 10 | YES |
| Cultural Fit | 10 | YES |
| **Total** | **50** | All areas scored |

Threshold: Candidates scoring above 30 marks may be considered for recruitment, subject to company requirements and salary/employment terms agreement (SRC-SUMAN-001-v2).

**Gap flag:** If any scoring area is not completed, or if a candidate below 30 marks was progressed without documented management approval, flag for review.

---

### 4.4 Rejected and On-Hold Candidate Tracking Check

*(Source: SRC-SUMAN-001-v2 §4)*

| Check Item | Expected Standard |
|------------|-------------------|
| Rejected candidate tracking sheet exists | Separate tracking sheet maintained |
| On-hold candidate tracking sheet exists | Separate tracking sheet maintained |
| Records support talent pooling | Records accessible for future recruitment rounds |

**Gap flag:** If either tracking sheet is absent or not current, flag for Suman's attention.

---

### 4.5 Commitment Record Check

*(Source: SRC-SUMAN-001-v2 §5)*

| Check Item | Expected Standard |
|------------|-------------------|
| Commitment record issued with every offer | Documented commitment record exists for every candidate who received an offer |
| Record covers 7-day evaluation period commitments | Agreed deliverables for the 7-day period are documented |
| Record covers post-7-day commitments | Agreed post-evaluation commitments are documented |

**Gap flag:** If no commitment record exists for an offer made, this is a process gap.

---

### 4.6 7 / 14-Day Review Check

*(Source: SRC-SUMAN-001-v2 §6)*

The 7/14-day review must incorporate feedback from the Trainer and Team Leader evaluation reports.

| Check Item | Expected Standard |
|------------|-------------------|
| Review scheduled | Scheduled after first 7 or 14 days |
| Trainer / Team Leader evaluation report obtained | Incorporated before review is finalised |
| All 7 assessment areas covered | Knowledge, responsibilities, confidence/communication, AI/LLM adoption, independent task ability, commitment, areas for further support |

**Gap flag:** Missing Trainer or Team Leader feedback; any of the 7 assessment areas not addressed.

---

### 4.7 Month 1 Review Check

*(Source: SRC-SUMAN-001-v2 §7)*

> **Probation leave restriction (Source: SRC-POLICY-001 §6.2):** No leave is permitted during the 3-month probationary period. If leave was taken during this period, a documented justification and recovery plan are required.

| Check Item | Expected Standard |
|------------|-------------------|
| Review conducted | Month 1 review completed |
| 4 assessment areas covered | Onboarding completion, system/tool access, initial assignments, early commitment verification |
| Status category assigned | One of: On Track / Watch / Concern / Critical |
| Corrective action plan issued if status is "Concern" | Corrective action plan with responsibilities and deadlines produced before Month 3 |
| Probation leave compliance confirmed | No leave taken during probation, or documented urgent justification and recovery plan exists |

**Gap flag:** Missing status assignment; "Concern" status without corrective action plan; unexplained leave during probation.

---

### 4.8 Month 3 Review Check

*(Source: SRC-SUMAN-001-v2 §8)*

| Check Item | Expected Standard |
|------------|-------------------|
| Review conducted | Month 3 review completed |
| 4 assessment areas covered | Commitment delivery, KPI participation, behavioural observations, corrective action progress |
| Corrective action plan progress assessed | If "Concern" at Month 1, corrective action plan outcome documented |

**Gap flag:** Month 3 review not conducted; corrective action plan outcome not recorded for a Month 1 "Concern" employee.

Note: Decisions on discontinuation during probation are subject to management review and approval (SRC-SUMAN-001-v2). This skill does not make or recommend discontinuation decisions.

---

### 4.9 Month 6 Review Check

*(Source: SRC-SUMAN-001-v2 §9)*

| Check Item | Expected Standard |
|------------|-------------------|
| Review conducted | Month 6 review completed |
| 3 assessment areas covered | Full commitment vs delivery, probation confirmation decision, formal handover preparation |
| Handover preparation completed | Formal handover to Mayurika prepared |

**Gap flag:** Month 6 review not conducted; handover preparation not completed.

Note: Probation confirmation is a management decision. This skill surfaces preparation status only.

---

### 4.10 180-Day Handover Check

*(Source: SRC-SUMAN-001-v2 §11; SRC-MAYU-001)*

| Check Item | Expected Standard |
|------------|-------------------|
| Mayurika 2-week reminder sent | Mayurika proactively reminds Suman 2 weeks before 6-month handoff is due (SRC-MAYU-001) |
| 15-minute handover meeting scheduled | Structured meeting scheduled at Month 6 |
| Confirmed attendees present | Mayurika (HR Officer), Arun (Implementation Officer), Suman (Recruitment Officer) |
| Line Manager attendance confirmed | **[VERIFY — item 11 in verify-register.md: Line Manager role named as attendee in SRC-SUMAN-001-v2 but role holder not identified. Confirm with Suman or Varmen before this check can be fully completed.]** |
| Handover meeting covers 4 areas | Commitment delivery summary, employee record verification, KPI baseline confirmation, outstanding issues and owners |
| recruitment_source_id written to staff record | Mayurika writes upon handoff (SRC-MAYU-001) |
| recruitment_promise_set_id written to staff record | Mayurika writes upon handoff (SRC-MAYU-001) |

**Gap flag:** 2-week reminder not sent; handover meeting not scheduled; any confirmed attendee absent; any of the 4 handover review areas not covered; IDs not written to staff record.

---

### 4.11 Source Quality Monitoring Check

*(Source: SRC-SUMAN-001-v2 §10)*

| Check Item | Expected Standard |
|------------|-------------------|
| Activity metrics tracked | Applications received, response rates, recruitment costs — monitored per source |
| Quality metrics tracked | Long-term hiring success, probation completion rates, performance outcomes — monitored per source |

**Gap flag:** Source monitoring not maintained; either metric dimension missing.

---

### 4.12 Daily Recruitment Knowledge Capture Check

*(Source: SRC-SUMAN-001-v2 §12)*

| Check Item | Expected Standard |
|------------|-------------------|
| Daily 1-hour knowledge capture completed | Suman dedicates 1 hour each working day |
| All 6 topic areas covered | Evaluation and training status; recruitment trends; sourcing insights; interview observations; probation concerns; commitment gaps |

**Gap flag:** No daily entry; entry missing any of the 6 topic areas.

---

## 5. Output Format

For each recruitment process gap identified, produce one record:

| Field | Description |
|-------|-------------|
| Stage | Which stage of the recruitment process (e.g., 8-Point Screen, Month 1 Review, 180-Day Handover) |
| Check Item | Which specific check item failed |
| Evidence | What was observed or reported |
| Source Affected | Source ID and section that defines the expected standard |
| Impact | What risk or downstream harm may occur if this gap is not addressed |
| Owner | Who is responsible for this stage (process-level — no personal decisions) |
| [VERIFY] Status | Whether this gap record depends on an unresolved [VERIFY] item |
| Recommended Next Action | What should happen next — by whom, at what stage |

**Output is for human review only. No output from this skill may be acted upon without review and approval by the appropriate authority.**

---

## 6. [VERIFY] Constraints Active for This Skill

| [VERIFY] Item | Effect on This Skill |
|---------------|---------------------|
| Line Manager identity in 180-day handover (item 11) | Handover attendee check cannot confirm Line Manager identity. Flag as [VERIFY] until Suman or Varmen confirms role holder. |
| Admin Manager authority (items 1–5) | No escalation path through Admin Manager may be included in this skill. |
| MD-specific requirements (items 6–7) | This skill may change scope after MD review. Foundation Draft v0.1 only. |

---

## 7. Confidentiality Rules Active for This Skill

*(Source: context/confidentiality-rules.md — SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001)*

- No personal candidate data (names, contact details, personal information)
- No salary negotiation figures
- No health or medical information about candidates
- Process-level and aggregate information only
- All outputs are company property and must be handled under the confidentiality obligations in SRC-POLICY-001 §11.0 and §14.0

---

## Pass/Fail Result

**DRAFT — CONDITIONAL PASS**

All checklist items, review stages, and output fields trace to SRC-SUMAN-001-v2, SRC-MAYU-001, or SRC-POLICY-001. [VERIFY] item 11 (Line Manager identity) is preserved and marked. No personal candidate data included. No hiring, probation, or discontinuation decisions included. No invented recruitment rules.

Safe for Varmen review. Not yet safe for operational use — Foundation Draft v0.1 only.

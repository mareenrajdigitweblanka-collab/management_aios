---
name: mayurika-hr-daily-weekly-checklist
type: checklist
member: Mayurika / Mayuri
role: HR Officer
created: 2026-06-30
status: DRAFT — Pending Mayurika review
source-boundary: SRC-MAYU-001, SRC-POLICY-001, SRC-MD-HR-001
root-truth: CLAUDE.md — canonical; this file is a checklist pointer only
---

# Mayurika / Mayuri — Daily, Weekly, and Periodic Checklist

**Root Truth Rule:** Every item in this checklist traces to a registered source. If a source is not listed next to an item, it carries [VERIFY]. Do not treat unchecked items as confirmed process steps.

**Sensitive Data Rule:** This checklist does not store individual staff names, salary data, health data, disciplinary details, or personal candidate information. It describes process steps only. See `context/confidentiality-rules.md`.

**[VERIFY] Rule:** Items marked [VERIFY] must not be treated as confirmed until the relevant source is registered and the domain owner confirms. See `context/verify-register.md`.

---

## Daily Checklist

### 1. EOD Submission Compliance Check
*(Source: SRC-MAYU-001 §4; SRC-MD-HR-001 — EOD strengthening directive)*

- [ ] Check whether Website Team and PH Team staff have submitted their daily task reports via the EOD submission workspace [VERIFY item 12 — tool name not confirmed; use descriptive reference until confirmed]
- [ ] Flag any missing or late submissions immediately
- [ ] Sync the day's submission data with the EOD dashboard [VERIFY item 12 — tool name not confirmed]
- [ ] Note any staff with missing submissions for follow-up — document the pattern if it is recurring

**Evidence to save:** Date, team, submission compliance rate (aggregate), any follow-up action taken.

**When to create an action record:** If a team member or group has missed submissions on 2 or more consecutive days, create a record in `intelligence-inbox/management-action-records/mayurika-hr/` using the `problem-solution` template.

---

### 2. SKILL File Compliance Check — Developer Team and Technical/N8N Team
*(Source: SRC-MAYU-001 §6)*

- [ ] Check daily SKILL file submission quantity for Developer Team
- [ ] Check daily SKILL file submission quantity for Technical/N8N Team
- [ ] Verify coverage and compliance against the 80% quality benchmark
- [ ] Trigger same-day follow-up for any missing or weak submission
- [ ] If persistent non-compliance: escalate to Sajeesan → Pratheepan → Joshna → Management (in that order)

Note: Quality depth assessment (reusability, BLOS alignment, evidence quality) is Visali's responsibility — not Mayurika's.

**Evidence to save:** Date, team, submission count, compliance rate, any follow-up triggered.

**When to create an action record:** If a same-day follow-up is triggered more than once for the same team member in the same week, document it as a pattern.

---

### 3. LLM-Queryable Documentation Check (where applicable)
*(Source: SRC-MD-HR-001 — LLM-queryable standard)*

- [ ] For any HR or management task completed today: confirm it is documented in LLM-queryable format
- [ ] Any activity not documented in LLM-queryable format is treated as "not happened" under the MD governance standard

---

## Weekly Checklist

### 4. AXIOM Data Submission to Arun
*(Source: SRC-MAYU-001 §1; SRC-ARUN-001 — AXIOM workflow)*

- [ ] Collect this week's staff performance data for AXIOM submission
- [ ] Submit to Arun in the format he requires for weekly AXIOM processing
- [ ] Confirm submission is complete and acknowledged

**Important boundary:** Mayurika submits data. Arun assigns AXIOM bands. Do not write or imply a band placement in any record or submission note.

**Evidence to save:** Submission date, period covered, confirmation that Arun received the data.

---

### 5. Review Schedule Check
*(Source: SRC-MAYU-001 §1; context/hr-operations-context.md §3)*

- [ ] Check `last_review_date` and `next_review_due` for all staff
- [ ] Identify any staff member where `next_review_due` is overdue and no escalation is on record
- [ ] Any overdue `next_review_due` without an escalation on record is a governance failure — document and escalate

**Evidence to save:** Date of check, number of overdue reviews identified, escalation actions taken.

**When to create an action record:** If any overdue review without escalation is identified, create a record immediately.

---

### 6. PDPA Compliance Check
*(Source: SRC-MAYU-001 §1; context/hr-operations-context.md §2)*

- [ ] Check for any new joiners who have not yet received their PDPA notice
- [ ] Check for any new joiners with a null PDPA acknowledgement date — flag as non-compliant
- [ ] Check whether any recently departed staff records are due for PDPA retention schedule review

**Evidence to save:** Number of staff with outstanding PDPA notices (aggregate); any new non-compliant records identified.

---

### 7. ROI Data Collection — PH, Digital Marketing, Technical Teams
*(Source: SRC-MAYU-001 §2)*

- [ ] Collect weekly ROI data from the PH Team
- [ ] Collect weekly ROI data from the Digital Marketing Team
- [ ] Collect weekly ROI data from the Technical Team
- [ ] Prepare the weekly ROI performance report for the MD

**Evidence to save:** Data collection confirmation; report prepared; submission date.

---

### 8. Leadership Review Sessions (Twice Weekly)
*(Source: SRC-MAYU-001 §3)*

- [ ] Schedule and prepare framework for twice-weekly Leadership Review sessions (co-facilitated with the Director)
- [ ] Separate frameworks required for Sales Teams and Non-Sales Teams
- [ ] Capture data from session
- [ ] Validate Team Leader-reported data against management-level data
- [ ] Apply enhanced validation for eBay and CPPC teams (historical reporting inconsistency — SRC-MAYU-001)
- [ ] Track action items from session
- [ ] Prepare governance report from session

**Evidence to save:** Session date, teams covered, data captured, action items assigned, governance report reference.

**When to create an action record:** If Team Leader-reported data cannot be validated or shows a significant inconsistency, document it.

---

### 9. New Employee ROI Check (for all staff within first 3 months)
*(Source: SRC-MD-HR-001 §10.9)*

- [ ] For all employees in their first week: confirm Week 1 ROI review is scheduled or completed
- [ ] For all employees at one month: confirm Month 1 ROI review is completed and documented
- [ ] For all employees at three months: confirm Month 3 ROI review is completed and documented
- [ ] Any missing ROI review at these milestones is a governance failure — document and escalate

**Evidence to save:** Employee identifier (role-level, not personal data), milestone, review status.

---

## Monthly / Periodic Checklist

### 10. Monthly PDPA Compliance Report
*(Source: SRC-MAYU-001 §1)*

- [ ] Prepare monthly PDPA compliance report for management
- [ ] Report should show aggregate compliance status — no individual health, personal, or medical data included

---

### 11. Monthly Critic Meeting Coordination
*(Source: SRC-MAYU-001 §5)*

- [ ] Coordinate monthly Critic Meeting with Muguntha and Jefri
- [ ] Select the department under review for this session
- [ ] Arrange for employees from other departments to provide structured feedback
- [ ] After session: arrange an Action Review Meeting with the relevant Team Leader
- [ ] Record action items in the Critic Meeting Action Tracker
- [ ] Publish action items on the company notice board

**Evidence to save:** Meeting date, department reviewed, action items recorded, notice board updated.

---

### 12. Monthly Review Schedule Refresh
*(Source: SRC-MAYU-001 §1)*

- [ ] Perform monthly review schedule refresh for all active staff
- [ ] Identify upcoming and overdue `next_review_due` dates
- [ ] Confirm no staff member has an overdue review without an escalation on record

---

### 13. Monthly ROI Performance Report for MD
*(Source: SRC-MAYU-001 §2)*

- [ ] Aggregate weekly ROI data collected from PH, Digital Marketing, and Technical Teams
- [ ] Prepare monthly ROI performance report
- [ ] Submit to the MD

---

### 14. Developer ROI Review Coordination (Monthly)
*(Source: SRC-MD-HR-001 §10 — Developer ROI Review Process, 25/06/2026)*

- [ ] Coordinate the monthly review of developer work from the past 30 days
- [ ] Confirm Team Leaders have completed initial validation of developer work
- [ ] Confirm tasks completed after the third week of the month are verified in queryable format
- [ ] Coordinate the overall validation process
- [ ] Provide queryable task files for ROI methodology development

Note: Role assignments within this process should be confirmed as current before use as an audit checklist — see CLAUDE.md §11.14 note.

---

### 15. Month 6 Handover Receipt from Suman
*(Source: SRC-MAYU-001; SRC-SUMAN-001-v2 §8.11; SRC-SUMAN-CONF-002)*

When a staff member reaches Month 6:

- [ ] Receive the 180-day handover from Suman (meeting: Mayurika, Arun, Suman, and the employee's Team Lead — confirmed by SRC-SUMAN-CONF-002, 2026-06-30)
- [ ] Review: commitment delivery summary, employee record verification, KPI baseline confirmation, outstanding issues
- [ ] Write `recruitment_source_id` into the staff record
- [ ] Write `recruitment_promise_set_id` into the staff record
- [ ] Confirm all outstanding issues from the handover have assigned owners

Mayurika proactively reminds Suman 2 weeks before the 6-month handover is due (SRC-MAYU-001).

---

### 16. BGCT Documentation Check
*(Source: SRC-MD-HR-001 §10.13 — BGCT Collection)*

- [ ] Confirm BGCT (Best Practices, Guidelines, Checklists, Tutorials) documents are collected and stored centrally
- [ ] Flag any gaps in the BGCT collection — missing BGCT for an active process area is a management file gap
- [ ] Confirm Management Team Google Sheets are identified, listed, and consolidated (SRC-MD-HR-001 §10.14)

---

## Evidence to Save

For any checklist item that identifies a problem, gap, or governance failure:

1. Create an action record in `intelligence-inbox/management-action-records/mayurika-hr/`
2. Use the correct template — `md-discussion-note-template.md` for MD-direction items, `problem-solution-action-record-template.md` for operational gaps
3. Include all required fields: Date, Created by, Role/Domain, Problem or Discussion, Evidence/Source, Action taken, Reviewer/Approval status, Sensitivity check, Status, Next step, Pass/Fail rule, Known limits

**For the full required-fields list:** See `handover/management-action-records-team-usage-guide.md`.

---

## What Not to Record

Do not include in any checklist record or action record:

- Individual staff names beyond what is operationally necessary for role identification
- Salary, bonus, or compensation data
- Individual staff health or medical leave details
- Disciplinary case narrative (aggregate compliance rates only)
- PDPA personal data (Mayurika holds this under controlled access; it does not belong here)
- Individual AXIOM performance band scores — aggregate and process-level only
- Candidate personal data from recruitment

---

## When to Ask GPT/Claude for Help

Ask Claude when you need to:

- Check what a specific source says about an HR process step
- Identify which [VERIFY] items affect a task you are about to do
- Analyse patterns in management action records from `mayurika-hr/`
- Prepare a review pack or gap report
- Understand what a governance failure looks like in a specific process area
- Invoke a skill (management-gap-detection, policy-lookup, etc.)

Do not ask Claude to:
- Make HR decisions on behalf of employees
- Confirm Admin Manager escalation paths — [VERIFY] items 1–5 are unresolved
- Self-approve any change to CLAUDE.md or context files

---

## When to Route to a Reviewer

| Situation | Route To |
|---|---|
| Checklist item involves AXIOM band placement | Arun |
| Checklist item involves canonical name spelling | Rajiv |
| Checklist item involves team structure data | Rajiv |
| Leave approval decision | Team Leader / HR (per SRC-POLICY-001 leave notice periods) |
| Skill file update candidate identified | Mareenraj (trainee/builder) — prepares draft; Mayurika confirms |
| [VERIFY] item appears to be resolvable | Mayurika confirms; Mareenraj registers the confirmation as a new source |
| This checklist needs updating | Mayurika reviews; Mareenraj updates the file |
| Action record needs domain owner sign-off | Mayurika reviews her own records |
| Cross-domain question (e.g., recruitment + HR + KPI) | Route to the relevant domain owners separately |

---

## Pass/Fail Rule

PASS if a clean LLM reading this checklist can identify:
- What the process step is
- Which source backs it
- What evidence to save
- What not to record
- Who to route to when a decision or review is needed

FAIL if any item is invented (no source backing), resolves a [VERIFY], stores personal data, or implies a decision authority that is not confirmed.

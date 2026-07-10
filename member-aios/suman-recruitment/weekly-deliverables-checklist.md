---
name: suman-recruitment-weekly-deliverables-checklist
type: checklist
member: Suman
role: Recruitment Officer (Head Hunter, Onboarder, 6-Month Progress ROI Reviewer)
created: 2026-06-30
status: ACTIVE — Suman Reviewed 2026-06-30
source-boundary: SRC-SUMAN-001-v2, SRC-MD-SUMAN-001, SRC-MAYU-001, SRC-POLICY-001
root-truth: CLAUDE.md — canonical; this file is a checklist pointer only
---

# Suman — Weekly Deliverables and Recurring Process Checklist

**Root Truth Rule:** Every item in this checklist traces to a registered source. If a source is not listed next to an item, it carries [VERIFY]. Do not treat unchecked items as confirmed process steps.

**Sensitive Data Rule:** This checklist does not store individual candidate names, CV details, salary figures, interview scores linked to named individuals, or personal candidate data. It describes process steps only. See `context/confidentiality-rules.md`.

**[VERIFY] Rule:** No [VERIFY] items specific to Suman's domain remain open as of 2026-06-30. If a new claim is added without a registered source, it must carry [VERIFY].

---

## Weekly Deliverables — Four Required Items

*(Source: SRC-MD-SUMAN-001, 07/05/2026)*

These four deliverables must be submitted every week. Missing or incomplete submission is a compliance gap.

### 1. Risk Identification
*(Source: SRC-MD-SUMAN-001)*

- [ ] Identify risks in the current recruitment pipeline or probation cohort
- [ ] Document identified risks at process level — no personal candidate data in the record
- [ ] Note which risk category: pipeline risk, probation concern, commitment gap, source quality issue
- [ ] Submit as a weekly deliverable record

**Evidence to save:** Week date, risk categories identified, number of active cases (aggregate), actions triggered.

---

### 2. One-Month Task Rule — Evidence
*(Source: SRC-MD-SUMAN-001)*

- [ ] For all hires currently at or past Month 1: confirm assessment against task completion expectations at Month 1 is completed and documented
- [ ] Confirm Month 1 status is recorded: On Track / Watch / Concern / Critical (SRC-SUMAN-001-v2 — four status categories)
- [ ] For any hire marked "Concern" at Month 1: confirm a documented corrective action plan with responsibilities and deadlines exists before the Month 3 review

**Evidence to save:** Number of hires assessed at Month 1 this week (aggregate count), any "Concern" or "Critical" status flagged, corrective action plan status.

---

### 3. SKU / Margin / Hire-ROI Trace
*(Source: SRC-MD-SUMAN-001)*

- [ ] Provide traceable linkage between hires and SKU, margin, or ROI outcomes this week
- [ ] Evidence must be documented — proof-over-narrative standard applies (SRC-MD-SUMAN-001)
- [ ] If no traceable link can be established: document the gap explicitly

**Evidence to save:** Trace record showing hire (role-level) linked to SKU/margin/ROI outcome, or documented gap if no link established.

---

### 4. LLM-in-the-Loop Proof
*(Source: SRC-MD-SUMAN-001)*

- [ ] Confirm that LLM tools were used before any recruitment planning or decision-making action taken this week
- [ ] LLM-in-the-Loop evidence must be documented before the action is recorded
- [ ] If no planning action was taken this week: document that explicitly

**Evidence to save:** Reference to LLM consultation completed before action; format must be LLM-queryable.

**LLM-in-the-loop rule:** No recruitment planning or decision-making action may be taken without LLM consultation being completed first (SRC-MD-SUMAN-001 — mandatory, not optional).

---

## Daily — Knowledge Capture
*(Source: SRC-SUMAN-001-v2 §12)*

One hour each working day dedicated to documenting:

- [ ] Evaluation and training status (process-level; no personal data)
- [ ] Recruitment trends observed
- [ ] Sourcing insights
- [ ] Interview observations (aggregate and process-level; no candidate names or individual scores)
- [ ] Probation concerns (process-level)
- [ ] Commitment gaps identified

**Evidence to save:** Date, category of knowledge captured, any action triggered.

---

## Probation Review Cadence

*(Source: SRC-SUMAN-001-v2 §6–§9)*

For each active hire, track and complete the following at the correct milestone:

### 7/14-Day Review
- [ ] Schedule review incorporating Trainer / Team Leader evaluation reports
- [ ] Assess: knowledge gained, responsibility understanding, confidence, AI/LLM adoption, independent task ability, commitment, support needs

### Month 1 Review
- [ ] Complete Month 1 assessment
- [ ] Assign status: On Track / Watch / Concern / Critical
- [ ] If "Concern": initiate documented corrective action plan with responsibilities and deadlines before Month 3
- [ ] Probation leave restriction applies: no leave permitted during 3-month probationary period (SRC-POLICY-001 §6.2)

### Month 3 Review
- [ ] Review commitment delivery against Month 1 plan
- [ ] Assess: KPI participation, behavioural observations, corrective action progress
- [ ] If "Concern" at Month 1 and corrective action not achieved by Month 3: escalate to management review for potential probation discontinuation

### Month 6 Review
- [ ] Assess full commitment versus delivery
- [ ] Prepare probation confirmation decision materials
- [ ] Begin formal handover preparation

---

## Six-Month Hire ROI Audit (Binary)

*(Source: SRC-MD-SUMAN-001, 07/05/2026)*

At Month 6 for each hire:

- [ ] Conduct binary ROI audit: has this hire produced a traceable contribution to any of the following?
  - Revenue
  - Margin improvement
  - NNV reduction
  - Automation output
  - Capacity (enabling other staff to produce more output)
- [ ] Document the audit result with evidence before the 180-day handover meeting
- [ ] If no traceable contribution found: document the gap explicitly — do not proceed with handover without audit on record

**Gap detection:** 6-month ROI audit not completed or not evidenced before handover is a governance failure (SRC-MD-SUMAN-001).

---

## 180-Day Handover Preparation

*(Source: SRC-SUMAN-001-v2 §11; SRC-SUMAN-CONF-002; SRC-MAYU-001)*

At Month 6 minus 2 weeks — Mayurika will send a proactive reminder (SRC-MAYU-001):

- [ ] Confirm binary ROI audit is evidenced
- [ ] Prepare commitment delivery summary
- [ ] Confirm employee record is verified and up to date
- [ ] Confirm KPI baseline is established and ready to hand over
- [ ] List any outstanding issues and confirm assigned owners

**Handover meeting attendees:** Mayurika, Arun, Suman, and the Line Manager (employee's Team Lead) — 15-minute structured meeting

> Confirmed by SRC-SUMAN-CONF-002 (2026-06-30): Suman clarified the Line Manager is the employee's Team Lead — a role-based attendee, not a fixed named person. Root propagation complete — CLAUDE.md §8.11 and context/recruitment-context.md §11 updated 2026-06-30. Evidence: `evidence/stakeholder-confirmations/suman-line-manager-role-reconfirmation-2026-06-30.md`.

After handover, Mayurika writes `recruitment_source_id` and `recruitment_promise_set_id` into the staff record (SRC-MAYU-001). Recruitment ownership formally concludes at this stage unless unresolved actions remain.

---

## OLOS Onboarding System Validation

*(Source: SRC-MD-SUMAN-001, 29/05/2026)*

Before OLOS go-live — validate all of the following are present and complete:

- [ ] Department handbooks — confirmed present
- [ ] Role guides — confirmed present
- [ ] SOP documents — confirmed present
- [ ] Universal files and version control — confirmed present
- [ ] Shared folder structure — confirmed present
- [ ] Mandatory files for all departments — confirmed present

**Five OLOS documents requiring Suman's validation sign-off before deployment:**

| Document | Status Required |
|---|---|
| Evidence Standard | Validated |
| Onboarding Guide | Validated |
| OLOS Master | Validated |
| Team Leader Setup Guide | Validated |
| File Pack Register | Validated |

**Gap detection:** OLOS deployed without Suman's validation sign-off, or deployed with missing handbooks/SOPs, is a governance failure (SRC-MD-SUMAN-001).

---

## BGCT Completion Check — Staff Who Joined in Last 6 Months

*(Source: SRC-MD-SUMAN-001, 25/05/2026)*

- [ ] Identify all staff who joined within the last 6 months
- [ ] Confirm each has a BGCT completion record (Best Practices, Guidelines, Checklists, Tutorials)
- [ ] Confirm onboarding documentation includes BGCT details and requirements
- [ ] Any staff member without BGCT completion record is a compliance gap — document and escalate

---

## Dan Martel Onboarding Principle

*(Source: SRC-MD-SUMAN-001, 07/05/2026)*

For each new recruit at onboarding:

- [ ] Show the Dan Martel poster with the principle: "WE HIRE THEM TO SAVE COMPANY TIME"
- [ ] This is mandatory onboarding communication — not optional
- [ ] Document that this communication was made for the new hire

**Gap detection:** No evidence this onboarding communication was made for a hire is a process gap.

---

## LLM-Queryable Onboarding Standard

*(Source: SRC-MD-SUMAN-001, 28/05/2026)*

- [ ] From the point of a new recruit joining: confirm all onboarding activities are captured in LLM-queryable format
- [ ] Gap detection: onboarding activities not in LLM-queryable format from day one are non-compliant

---

## Shovel-Ready Requirement

*(Source: SRC-MD-SUMAN-001, 07/05/2026)*

- [ ] Maintain a current shovel-ready requirement document for the development team
- [ ] This document must be pre-written and ready to hand to developers without delay
- [ ] Gap detection: no shovel-ready requirement document on record is a management file gap

---

## Candidate Screening — 8-Point Criteria Quick Reference

*(Source: SRC-SUMAN-001-v2 — full process detail at CLAUDE.md §8.2 and context/recruitment-context.md §2)*

All candidates must be assessed against these 8 criteria before progressing to interview:

1. O/L Mathematics
2. English Proficiency
3. IT Skills
4. E-Commerce Knowledge
5. AI Familiarity
6. Salary Alignment
7. Availability
8. Commitment

**Quick-reference rule:** This list is a checklist navigation aid only. Do not record individual candidate screening outcomes, named scores, or personal data in this file or any AIOS action record. Use process-level and aggregate references only. Full authority is SRC-SUMAN-001-v2.

---

## Source Quality Monitoring (Ongoing)

*(Source: SRC-SUMAN-001-v2 §10)*

Monitor all recruitment sources across two dimensions:

**Activity metrics (track per source):**
- [ ] Applications received
- [ ] Response rates
- [ ] Recruitment costs

**Quality metrics (track per source over time):**
- [ ] Long-term hiring success
- [ ] Probation completion rates
- [ ] Performance outcomes

---

## Evidence to Save

For any checklist item that identifies a problem, gap, or governance failure:

1. Create an action record in `intelligence-inbox/management-action-records/suman-recruitment/`
2. Use the correct template — `md-discussion-note-template.md` for MD-direction items, `problem-solution-action-record-template.md` for operational gaps
3. Include all required fields: Date, Created by, Role/Domain, Problem or Discussion, Evidence/Source, Action taken, Reviewer/Approval status, Sensitivity check, Status, Next step, Pass/Fail rule, Known limits

**For the full required-fields list:** See `handover/management-action-records-team-usage-guide.md`.

---

## What Not to Record

Do not include in any checklist record or action record:

- Candidate names, CV details, or interview scores linked to named individuals
- Salary figures or compensation details from offer records
- Personal contact information for candidates
- Personal health, leave medical, or grievance details for any person
- Salary or bonus data of any kind

---

## When to Route to a Reviewer

| Situation | Route To |
|---|---|
| Checklist item involves AXIOM band placement | Arun |
| 180-day handover — HR receipt side | Mayurika |
| Canonical name spelling | Rajiv |
| Policy lookup needed | SRC-POLICY-001; Suman confirms operational application |
| Skill file update candidate identified | Mareenraj (trainee/builder) — prepares draft; Suman confirms |
| This checklist needs updating | Suman reviews; Mareenraj updates the file |
| Action record needs domain owner sign-off | Suman reviews own records |
| Cross-domain question (recruitment + HR + KPI) | Route to the relevant domain owners separately |

---

## Pass/Fail Rule

PASS if a clean LLM reading this checklist can identify:
- What the process step is
- Which source backs it
- What evidence to save
- What not to record
- Who to route to when a decision or review is needed

FAIL if any item is invented (no source backing), resolves a [VERIFY], stores candidate personal data, or implies a decision authority that is not confirmed.

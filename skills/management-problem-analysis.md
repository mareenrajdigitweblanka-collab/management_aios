This skill is a Management AIOS subfolder draft. It is not parent AIOS truth, not final management authority, not final HR policy, and not approved automation.

---
name: management-problem-analysis
type: skill
tier: 2
status: DRAFT — Foundation Draft v0.1 — Pending Varmen Review
sources: SRC-VAR-001, SRC-MAYU-001, SRC-ARUN-001, SRC-ARUN-002, SRC-SUMAN-001-v2, SRC-POLICY-001, SRC-MD-HR-001, SRC-MD-SUMAN-001, SRC-SUMAN-CONF-001
context-files: context/management-aios-purpose.md, context/hr-operations-context.md, context/recruitment-context.md, context/kpi-axiom-context.md, context/confidentiality-rules.md, context/verify-register.md
created: 2026-06-25
owner-for-review: Varmen (validation before operational use)
control-plan: validation/management-problem-analysis-skill-plan.md
---

# Management Problem Analysis Skill

**Pass/Fail Rule:** PASS if this skill only accepts problem statements, searches source-backed context, identifies evidence found and missing, applies [VERIFY] limits, classifies the problem, identifies the reviewer, and suggests a safe next action within the AIOS support boundary. FAIL if this skill makes decisions, assigns blame, approves escalation, issues warnings, confirms probation outcomes, approves bonuses, assigns AXIOM bands, finalizes Admin Manager authority, removes [VERIFY] tags, stores sensitive personal data, connects to live systems, or automates any action.

---

## Status

Foundation Draft — Review Support Only

---

## Purpose

This skill helps analyze management-related problems by collecting evidence, identifying missing proof, checking source-backed context, identifying the correct reviewer, and preparing a safe next action for human review.

This skill supports human decision-making. It does not make decisions. It does not approve escalation. It does not assign blame. It does not replace Mayurika, Arun, Suman, Varmen, Admin Manager, Director, or any business owner.

Where the existing Tier 1 skills cover specific domains in structured checklist form, this skill accepts a free-form problem statement and routes it into the relevant domain before searching source-backed context. It is an intake and analysis layer sitting above those skills — not a decision layer.

**This skill is not:**
- A disciplinary authority
- An HR decision-maker
- A KPI or performance judge
- An escalation trigger
- A replacement for human governance

All outputs produced by this skill are for human review only. No output may be acted upon without review and approval by the appropriate authority.

---

## Source IDs Used

The following registered READY sources support this skill:

| Source ID | Status | Coverage Area |
|-----------|--------|---------------|
| SRC-VAR-001 | READY | Documentation gaps, management file organisation gaps, leave visibility gaps, KPI irregularity gaps, AIOS purpose and scope authority |
| SRC-MAYU-001 | READY | Onboarding evidence gaps (PDPA, Month 6 handoff fields), KPI review preparation gaps (AXIOM workflow, Leadership Review), recurring follow-up gaps (Critic Meetings, SKILL file compliance, EOD monitoring), handover continuity gaps (2-week reminder, record fields) |
| SRC-ARUN-001 | READY | KPI review preparation gaps (KPI definitions, AXIOM bands, review inputs/outputs, weekly workflow, incident documentation, PRC preparation, bonus eligibility evidence, dashboard requirements) |
| SRC-ARUN-002 | READY | KPI meeting gaps (daily operational checklist reference) |
| SRC-SUMAN-001-v2 | READY | Recruitment process evidence gaps (pipeline through 180-day handover, daily knowledge capture, source quality monitoring) |
| SRC-POLICY-001 | READY — Final Approved | Onboarding evidence gaps (§3.0, §17.0), leave visibility gaps (§6.0–6.5), policy compliance evidence gaps (all policy sections), offboarding gaps (§10.0–10.8) |
| SRC-MD-HR-001 | READY — Varmen Reviewed 2026-06-25 | Documentation and requirement gaps (requirement file metadata, verbal-to-documented rule, Task ID standard, 85% specification rule, business logic documentation), LLM-queryable compliance gaps, management file organisation gaps (BGCT, folder consolidation), ROI evidence gaps (new employee ROI milestones, developer/technical project ROI, lessons learned), KPI review preparation gaps |
| SRC-MD-SUMAN-001 | READY — Varmen Reviewed 2026-06-25 | Recruitment process evidence gaps (weekly deliverables, OLOS validation, LLM-in-the-Loop proof), ROI evidence gaps (six-month hire ROI audit, in-flight performance evidence), handover continuity gaps (in-flight evidence before audit), OLOS and BGCT gaps |
| SRC-SUMAN-CONF-001 | READY | Used only for resolved Line Manager typing correction — confirms no Line Manager role exists in the 180-day handover |

**Pending sources — blocked from use as evidence:**

Pending sources such as SRC-ADMIN-001, SRC-MD-ARUN-001, and SRC-MD-ADMIN-001 cannot be used as evidence until registered and source-mapped. Any claim requiring these sources must carry [VERIFY] and must be declined by this skill with an explanation of the block.

---

## Allowed Problem Types

The following problem types are supported by READY registered sources and are safe for this skill to analyze. Each is analysis-only — the skill identifies evidence and surfaces gaps; it does not resolve them.

### 1. Documentation Gap

**What it means:** A required process record, decision record, management file, or work output is missing or incomplete.

**Example input:** "A verbal instruction from the MD was actioned without a written requirement file."

**Evidence to check:** SRC-MD-HR-001 verbal-to-documented rule; Task ID standard; requirement file metadata (8 fields); 85% specification rule.

**Likely reviewer:** Varmen

**Source IDs:** SRC-VAR-001, SRC-MD-HR-001

---

### 2. Requirement Clarity Gap

**What it means:** A verbal instruction has not been converted into a written, documented requirement, or a requirement file is missing mandatory metadata fields.

**Example input:** "Development work started before requirements were documented."

**Evidence to check:** SRC-MD-HR-001 — requirement file must contain: Project Name, Start Date, Expected Deadline, User/Stakeholder, Company Value Contribution, MVP Submission Date, Project Owner, Status. 85% specification rule must be met before work begins.

**Likely reviewer:** Varmen

**Source IDs:** SRC-MD-HR-001

---

### 3. LLM-Queryable Compliance Gap

**What it means:** Work activities are not documented in LLM-queryable format, or business logic is not written in plain English comprehensible by a fresh joiner.

**Example input:** "Team's completed tasks are not documented in any queryable format."

**Evidence to check:** SRC-MD-HR-001 — any activity not in LLM-queryable format is considered "not happened"; daily 10% business logic validation standard; business logic must be comprehensible to a fresh joiner.

**Likely reviewer:** Varmen / relevant Team Leader

**Source IDs:** SRC-MD-HR-001

---

### 4. Onboarding Evidence Gap

**What it means:** A new joiner's onboarding is missing required documents, confirmation records, or mandatory training steps.

**Example input:** "No AI tool training confirmation recorded for new joiner."

**Evidence to check:** SRC-POLICY-001 §3.0 (pre-employment documents, first-day orientation, role-specific training with mentor/supervisor, probation definition); SRC-POLICY-001 §17.0 (AI tool training mandatory for all new hires); SRC-MAYU-001 (PDPA acknowledgement date must be recorded); SRC-SUMAN-001-v2 (onboarding checklists and BGCT completion); SRC-MD-SUMAN-001 (OLOS validation and BGCT monitoring).

**Likely reviewer:** Mayurika / Suman / Varmen

**Source IDs:** SRC-POLICY-001, SRC-MAYU-001, SRC-SUMAN-001-v2, SRC-MD-SUMAN-001

---

### 5. Leave Visibility or Update Gap

**What it means:** Staff leave is not recorded in the system, notice requirements have not been met, or team or organisation-wide leave limits have been breached.

**Example input:** "Staff member left without updating the leave system."

**Evidence to check:** SRC-POLICY-001 §6.1 (48-hour advance notice; 12% simultaneous cap; team limits of 2 per day, 1 for CST/Content Writing/Postage); §6.2 (planned leave notice periods by duration); §6.3 (unplanned leave — 5-day annual limit); §6.4 (short leave — 2 hours/month max with 24-hour advance notice); §6.5 (maternity leave — 30-day prior notice).

**Likely reviewer:** Mayurika / relevant Team Leader / Varmen

**Source IDs:** SRC-POLICY-001, SRC-VAR-001

---

### 6. KPI Review Preparation Gap

**What it means:** Required KPI review inputs have not been collected, a weekly AXIOM workflow step has not been evidenced, or a Leadership Review session schedule has been breached.

**Example input:** "KPI meeting data not collected before this week's scheduled review."

**Evidence to check:** SRC-ARUN-001 (KPI definitions by team, review inputs list, AXIOM band criteria, weekly AXIOM workflow steps, incident scoring requirements, dashboard requirements); SRC-MAYU-001 (Mayurika weekly AXIOM data submission; twice-weekly Leadership Review schedule); SRC-MD-HR-001 (technical team stand-up coverage, EOD Actual Revenue per Hour metric).

**Likely reviewer:** Arun / Mayurika / Varmen

**Source IDs:** SRC-ARUN-001, SRC-ARUN-002, SRC-MAYU-001, SRC-MD-HR-001

---

### 7. Recruitment Process Evidence Gap

**What it means:** A stage in the confirmed recruitment process has not been completed or not documented.

**Example input:** "Interview scoring sheet not completed for candidate who was offered a position."

**Evidence to check:** SRC-SUMAN-001-v2 (8-point screening criteria; 50-point interview scoring; rejected/on-hold tracking; commitment records; 7/14-day review; Month 1, 3, and 6 reviews; source quality monitoring; daily knowledge capture); SRC-MD-SUMAN-001 (weekly deliverables — Risk Identification, One-Month Task Rule, SKU/Margin/Hire-ROI Trace, LLM-in-the-Loop proof).

**Likely reviewer:** Suman / Varmen

**Source IDs:** SRC-SUMAN-001-v2, SRC-MD-SUMAN-001

---

### 8. ROI Evidence Gap

**What it means:** A required ROI review milestone has not been completed or evidenced, or a project concluded without a documented ROI outcome.

**Example input:** "New employee has passed the 1-month mark but no 1-month ROI review is on record."

**Evidence to check:** SRC-MD-HR-001 (ROI reviews required at 1-week, 1-month, and 3-month milestones; missing ROI review at any milestone is a governance failure; developer/technical project ROI documentation required on conclusion; lessons learned document required after concluded project or case); SRC-MD-SUMAN-001 (six-month hire ROI audit — binary assessment against: Revenue, Margin, NNV reduction, Automation output, or Capacity; evidence must be documented before 180-day handover).

**Likely reviewer:** Mayurika / Suman / Varmen

**Source IDs:** SRC-MD-HR-001, SRC-MD-SUMAN-001

---

### 9. Handover Continuity Gap

**What it means:** The 180-day handover meeting has not been scheduled, required attendees are not confirmed, handover items have not been covered, or staff record fields have not been written at handoff.

**Example input:** "6-month handover for a staff member is overdue and no meeting has been scheduled."

**Evidence to check:** SRC-SUMAN-001-v2 (180-day handover — 15-minute meeting covering commitment delivery summary, employee record verification, KPI baseline confirmation, outstanding issues and assigned owners); SRC-MAYU-001 (Mayurika proactively reminds Suman 2 weeks before the 6-month handoff is due; Mayurika writes recruitment_source_id and recruitment_promise_set_id into the staff record upon handoff); SRC-MD-SUMAN-001 (six-month hire ROI audit evidence must be documented before handover). Confirmed attendees: Mayurika, Arun, Suman — SRC-SUMAN-CONF-001 confirmed no Line Manager role in handover.

**Likely reviewer:** Mayurika / Suman / Varmen

**Source IDs:** SRC-SUMAN-001-v2, SRC-MAYU-001, SRC-MD-SUMAN-001, SRC-SUMAN-CONF-001

---

### 10. Recurring Follow-Up Gap

**What it means:** A process problem has been flagged more than once without documented resolution, or a required follow-up action has not been taken on schedule.

**Example input:** "Critic Meeting action item from last month has no closure record."

**Evidence to check:** SRC-MAYU-001 (Critic Meeting action items tracked in Action Tracker and published to notice board; Action Review Meeting with Team Leader required after each Critic Meeting; SKILL file non-compliance requires same-day follow-up; EOD submission non-compliance must be escalated if recurring); SRC-SUMAN-001-v2 (Month 1 corrective action plan must be assessed at Month 3; employees on Concern status at Month 1 who fail Month 3 corrective plan may be considered for discontinuation during probation — this assessment is a human management decision, not an AIOS output).

**Likely reviewer:** Mayurika / relevant Team Leader / Varmen

**Source IDs:** SRC-MAYU-001, SRC-SUMAN-001-v2

---

### 11. Management File Organization Gap

**What it means:** Management files, BGCT documents, or management records are not stored, organized, or consolidated correctly.

**Example input:** "BGCT documents are scattered across multiple folders with no central index."

**Evidence to check:** SRC-MD-HR-001 (BGCT documents must be collected and stored centrally; Management Team Google Sheets must be identified, listed, and consolidated; Task IDs must be assigned to all work records; staff biodata documents must be consolidated under PDPA-compliant access controls — note: PDPA and confidentiality rules apply; no personal biodata content may be stored in this AIOS); SRC-VAR-001 (management file and decision organization is a core AIOS problem area).

**Likely reviewer:** Varmen / Mayurika (PDPA-related items)

**Source IDs:** SRC-MD-HR-001, SRC-VAR-001

---

### 12. Policy Compliance Evidence Gap

**What it means:** Evidence that a confirmed company policy rule is being followed is absent or insufficient.

**Example input:** "No record of AI tool daily use for team members in the Technical Team."

**Evidence to check:** SRC-POLICY-001 §17.0 (AI tool daily use mandatory; AI-based contribution or efficiency gain must be reported monthly; AI reorientation required on department change; non-compliance escalation: Formal warning → Performance impact → Escalation to HR); §5.0 (late arrival: 2 instances per month maximum); §16.0 (minimum 41.5 hours per week); §15.0 (daily time logging required); §10.5 (credentials revoked on departure); §10.6–10.7 (exit interview and final checklist on departure); §10.8 (return of assets); §11.0 (digital assets for work only).

**Likely reviewer:** Mayurika / relevant Team Leader / Varmen

**Source IDs:** SRC-POLICY-001, SRC-VAR-001

---

### 13. Business Logic Validation Gap

**What it means:** Business logic has not been documented in plain English, daily validation has not been evidenced, or OLOS and BGCT onboarding system validation documents are missing or incomplete.

**Example input:** "OLOS onboarding system deployed without validation sign-off documents."

**Evidence to check:** SRC-MD-HR-001 (business logic must be comprehensible to a fresh joiner; daily 10% business logic validation required and must be evidenced); SRC-MD-SUMAN-001 (OLOS must be validated against actual company operations before go-live; required validation documents: Evidence Standard, Onboarding Guide, OLOS Master, Team Leader Setup Guide, File Pack Register; department handbooks, role guides, and SOP documents must be confirmed as present before deployment; BGCT completion for recent joiners must be monitored).

**Likely reviewer:** Suman / Varmen

**Source IDs:** SRC-MD-HR-001, SRC-MD-SUMAN-001

---

## Forbidden Problem Types

The following areas must not be handled by this skill. Any problem statement falling into these areas must be declined with a clear explanation citing the relevant [VERIFY] item or authority boundary.

| # | Forbidden Problem Type | Reason |
|---|----------------------|--------|
| 1 | Final escalation decisions | Admin Manager authority and escalation paths are [VERIFY] items 1–5 — SRC-ADMIN-001 PENDING. No final escalation routes may be included. |
| 2 | Admin Manager authority decisions | All Admin Manager authority (approval rights, PRC role, escalation chains) is [VERIFY] items 1–5 — blocked until SRC-ADMIN-001 received and Varmen reviewed. |
| 3 | Disciplinary decisions | Disciplinary outcomes, case conclusions, and formal warnings are HR and management decisions. Not AIOS outputs. |
| 4 | Termination decisions | Termination requires human authority per SRC-POLICY-001 §10. Not an AIOS output. |
| 5 | Employee confirmation decisions | Probation confirmation, employment status changes, and headcount decisions require management approval. |
| 6 | Bonus decisions | Bonus eligibility approval requires PRC Approval (SRC-ARUN-001). This skill can check whether conditions are evidenced; it cannot approve or deny bonuses. |
| 7 | PIP and warning decisions | First Warning, Second Warning, Third Warning, and PIP are HR and management decisions. This skill confirms whether documentation exists for the current stage only. |
| 8 | Final KPI judgement | KPI band placement, AXIOM scores, and performance assessments are Arun's authority (SRC-ARUN-001, SRC-MAYU-001). This skill supports evidence checking only. |
| 9 | Amazon ACOS threshold judgement | Amazon ACOS trigger wording is [VERIFY] item 8 — Arun direct confirmation pending. This trigger may not be used operationally until resolved. |
| 10 | Operational Manager PRC authority judgement | Operational Manager PRC membership and scope is [VERIFY] item 9 — Arun direct confirmation pending. |
| 11 | ROI Officer identity and authority judgement | ROI Officer role identity is [VERIFY] item 10 — a VERIFY Resolved Candidate exists (SRC-MD-SUMAN-001 identifies Arun and Mayurika jointly) but [VERIFY] tag must remain until Arun directly confirms. |
| 12 | Director authority beyond Leadership Review | Director's authority beyond co-facilitating Leadership Reviews is [VERIFY] item 11 — no additional Director authority may be stated or inferred. |
| 13 | HR tool or EOD tool name assertions | Exact tool names for HR and EOD systems are [VERIFY] item 12 — Mayurika confirmation pending. |
| 14 | MD-specific requirements beyond Varmen relay | MD direct requirements are [VERIFY] items 6–7 — pending MD review meeting. This skill scope may change after MD review. |

---

## Allowed Inputs

The following input types may be provided to this skill:

- Redacted management problem descriptions (process-level only)
- Meeting note excerpts that do not contain sensitive personal data
- Requirement file summaries
- Source-backed context excerpts
- Validation report excerpts
- Evidence path lists
- Sample dry-run cases

---

## Forbidden Inputs

The following must not be provided to this skill under any circumstances:

- Confidential personal HR case details
- Salary, compensation, or bonus figures for named individuals
- Private employee medical or health data
- Grievance case specifics that identify individuals
- Unredacted candidate personal profiles (name, CV, salary expectations)
- Requests to decide punishment, termination, bonus, warning, PIP, or escalation
- PDPA raw personal data
- Raw AXIOM band placements for named individual staff

If any forbidden input is received, the skill must decline the problem statement and explain why before any analysis is attempted.

---

## Workflow

The following 11-step workflow defines how this skill processes a problem statement from intake to closure note. Every step is analysis-only. No step produces a decision or triggers an automated action.

### Step 1 — Capture the Problem Statement

Accept a free-form problem statement. Confirm it is process-level. Reject if it contains personally identifiable sensitive HR data, salary information, disciplinary case personal details, individual health data, grievance specifics, or raw PDPA personal data.

### Step 2 — Identify Affected Domain

Classify the problem statement against the 13 allowed problem types. If the problem maps to a forbidden problem type, decline with reference to the relevant block and [VERIFY] item. If ambiguous, identify the closest matching domain and flag the ambiguity for the reviewer.

### Step 3 — Search Source-Backed Context

Query the relevant context files and skill reference tables for the identified domain:

| Domain | Context Source |
|--------|---------------|
| Documentation / requirement / LLM-queryable gaps | context/management-aios-purpose.md, context/hr-operations-context.md |
| Onboarding gaps | context/hr-operations-context.md §1–§2, context/recruitment-context.md §1–§13 |
| Leave gaps | context/hr-operations-context.md §9 |
| KPI review preparation gaps | context/kpi-axiom-context.md |
| Recruitment process evidence gaps | context/recruitment-context.md §1–§13 |
| ROI evidence gaps | context/hr-operations-context.md, context/recruitment-context.md §13 |
| Handover continuity gaps | context/recruitment-context.md §11–§13 |
| Recurring follow-up gaps | context/hr-operations-context.md §4–§8 |
| Management file organisation gaps | context/management-aios-purpose.md, context/hr-operations-context.md |
| Policy compliance evidence gaps | context/hr-operations-context.md §9, skills/policy-lookup.md |
| OLOS and BGCT gaps | context/recruitment-context.md §13 |

### Step 4 — Identify Evidence Found

List the specific source-backed rules, thresholds, and process steps that apply to this problem. Cite Source IDs for every item listed. Do not include unsourced claims.

### Step 5 — Identify Evidence Missing

List what evidence or documentation is absent or cannot be confirmed from the problem description. Note whether the missing evidence is a governance failure (based on confirmed source rules) or an unresolved query requiring more information.

### Step 6 — Check [VERIFY] Limits

Review context/verify-register.md for any active [VERIFY] items that affect the problem domain. Record each [VERIFY] item that applies. State its effect on what can and cannot be concluded. Do not proceed as though a [VERIFY] item is resolved.

### Step 7 — Classify Problem Type

Assign one of the following classifications:

| Classification | Meaning |
|----------------|---------|
| DOCUMENTATION GAP | Evidence exists that a required record is missing or incomplete |
| PROCESS GAP | Evidence exists that a required process step was not completed |
| COMPLIANCE GAP | Evidence exists that a policy or governance rule was not met |
| VISIBILITY GAP | Insufficient information to confirm whether a gap exists; more data required |
| BLOCKED | Problem falls into a forbidden area; cannot be analyzed without additional sources or authority resolution |

### Step 8 — Identify Likely Owner or Reviewer

Based on confirmed role boundaries (CLAUDE.md §5), identify the role responsible for reviewing or acting on this problem. Use role titles only — not personal names — unless the process requires identification (e.g., Mayurika as HR custodian per SRC-MAYU-001, Arun as AXIOM placement authority per SRC-ARUN-001). Never assign a reviewer from the Admin Manager without SRC-ADMIN-001 resolution.

### Step 9 — Suggest Safe Next Action

Propose one next action within the AIOS boundary: schedule a review, request missing documentation, flag to the named reviewer, surface the gap to Varmen for validation, or mark as BLOCKED pending a [VERIFY] resolution. Do not suggest disciplinary actions, escalation decisions, or system changes.

### Step 10 — Define Pass/Fail Rule for This Record

State the pass/fail rule that applies to this specific problem record. A record passes if its analysis is confined to source-backed evidence and the next action remains within the AIOS support boundary. A record fails if it makes a decision, assigns blame, approves an escalation, or acts beyond documentation support.

### Step 11 — Prepare Closure Note

Summarise the problem record in two sentences: what evidence was found and what the safe next action is. Mark the record as READY FOR REVIEW. Output is for human review only.

---

## Output Template

Every problem record produced by this skill must include all fields below. No field may be omitted. Fields with [VERIFY] constraints must include the relevant item number from context/verify-register.md.

### Problem Title

*(Short, process-level — no individual names in the title)*

### Problem Statement

*(As provided; redacted if personal data was present)*

### Affected Domain

*(One of the 13 allowed problem types, or BLOCKED)*

### Problem Type

*(DOCUMENTATION GAP / PROCESS GAP / COMPLIANCE GAP / VISIBILITY GAP / BLOCKED)*

### Source IDs Used

*(List all Source IDs that informed this analysis)*

### Evidence Found

*(Specific source-backed rules or process steps confirmed as applicable, with Source ID citations)*

### Evidence Missing

*(What records or data could not be confirmed from the problem description)*

### Root Cause Hypothesis

*(Marked explicitly as HYPOTHESIS — not a finding. Must be testable by reviewing documentation.)*

### Risk Level

*(LOW / MEDIUM / HIGH — assessed against whether this is a defined governance failure per registered sources)*

### Reviewer Needed

*(Role title — not personal name unless the process requires identification)*

### [VERIFY] Limits

*(List each active [VERIFY] item from context/verify-register.md that constrains this analysis, with item number)*

### Forbidden Decisions Avoided

*(Explicit confirmation that none of the forbidden problem types were triggered in producing this record)*

### Safe Recommended Next Action

*(One action within AIOS support boundary)*

### Pass/Fail Rule

*(State the rule applied and whether this record PASSES or FAILS it)*

### Closure Note

*(Two sentences: what evidence was found and what the safe next action is. Mark: READY FOR REVIEW)*

---

## Reviewer Routing Guide

Use safe routing only. All routing is based on confirmed role boundaries from CLAUDE.md §5 and registered sources.

| Problem Area | Route To |
|-------------|----------|
| Management documentation / structure issue | Varmen |
| HR operations / leave / staff record process issue | Mayurika / Varmen |
| Recruitment / onboarding issue | Suman / Varmen |
| KPI / AXIOM review preparation issue | Arun / Varmen |
| Policy explanation issue | Policy Lookup skill / HR reviewer (Mayurika / Varmen) |
| Business logic / LLM-queryable documentation issue | Varmen / relevant Team Leader |
| Admin Manager authority / escalation issue | [VERIFY — SRC-ADMIN-001 pending — items 1–5 in verify-register.md] |
| Amazon ACOS threshold issue | [VERIFY — Arun confirmation pending — item 8 in verify-register.md] |
| Operational Manager PRC scope issue | [VERIFY — Arun confirmation pending — item 9 in verify-register.md] |
| ROI Officer identity issue | [VERIFY — Arun confirmation pending — item 10 in verify-register.md; VERIFY Resolved Candidate exists but tag must remain] |
| Director authority beyond Leadership Review | [VERIFY — item 11 in verify-register.md] |
| HR or EOD tool names | [VERIFY — Mayurika confirmation pending — item 12 in verify-register.md] |

---

## Relationship to Existing Skills

This skill is an intake and analysis layer. It does not duplicate the Tier 1 skills — it routes into them.

| Existing Skill | Relationship |
|---------------|-------------|
| management-gap-detection.md | management-gap-detection.md operates over a set of system-observed conditions across its 7 gap categories. management-problem-analysis.md accepts a single free-form problem statement and routes it to the appropriate domain. It uses gap detection logic as a reference layer. |
| recruitment-quality-check.md | For recruitment process evidence gaps and ROI audit gaps, this skill draws on context/recruitment-context.md and the checklist logic in recruitment-quality-check.md. It does not duplicate the full checklist — it identifies which checklist items apply to the specific problem. |
| kpi-axiom-review-support.md | For KPI review preparation gaps, this skill references context/kpi-axiom-context.md and the review input/output checklist. It does not assign bands or produce review outputs — it surfaces the applicable check items for the reviewer. |
| policy-lookup.md | For policy compliance evidence gaps, this skill references policy-lookup.md to identify which policy section applies and what the expected standard is. It does not produce policy advice — it surfaces the applicable rule for the reviewer. |

---

## Safety Rules

The following safety rules apply to every output produced by this skill without exception:

| Safety Rule | Confirmation |
|-------------|-------------|
| No decisions made — analysis only | CONFIRMED — all 11 workflow steps are intake, search, classify, and surface only |
| No escalation authority — next action stays within AIOS support boundary | CONFIRMED — Step 9 limits next actions to scheduling, flagging, or requesting documentation |
| No HR disciplinary action recommended | CONFIRMED — disciplinary outcomes are in the forbidden problem types list |
| No KPI judgement produced | CONFIRMED — AXIOM band placement and performance decisions excluded |
| No automation — all outputs require human review | CONFIRMED — output is marked READY FOR REVIEW; no automated action triggered |
| No sensitive personal data stored — process-level only | CONFIRMED — forbidden inputs section and Step 1 reject sensitive personal data |
| All [VERIFY] items preserved and applied | CONFIRMED — Step 6 and the [VERIFY] limits field in the output template enforce this on every record |
| No Admin Manager authority invented or asserted | CONFIRMED — Admin Manager is in the forbidden problem types list; SRC-ADMIN-001 PENDING |
| No Arun [VERIFY] wording items treated as resolved | CONFIRMED — items 8, 9, and 10 are carried as [VERIFY] throughout this skill |
| No content promoted to parent AIOS truth | CONFIRMED — all output is for human review; promotion requires Varmen sign-off |

---

## Pass/Fail Rule

**PASS** if the skill analyzes a management problem, identifies evidence found, identifies evidence missing, routes to a reviewer, and gives a safe next action within the AIOS support boundary.

**FAIL** if the skill makes a decision, assigns blame, approves escalation, resolves [VERIFY] without registered source evidence, uses sensitive personal data, invents Admin Manager authority, treats MD discussion notes as company policy, or acts beyond documentation support.

---

## Next Step

Create validation evidence (source map and readiness file), then request Varmen review before creating Claude Code wrapper.

**After Varmen approves this skill:**
1. Create Claude Code wrapper
2. Run dry-run test cases covering each of the 13 allowed problem types
3. Confirm all forbidden problem types are correctly blocked by the wrapper
4. Add management-problem-analysis.md rows to validation/tier-1-skill-draft-source-map.md
5. Promote to operational use only after Varmen sign-off

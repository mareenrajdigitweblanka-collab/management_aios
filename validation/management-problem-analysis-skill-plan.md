---
name: management-problem-analysis-skill-plan
type: validation
created: 2026-06-25
proposed-skill: skills/management-problem-analysis.md
status: CONDITIONAL PASS
sources-reviewed: SRC-VAR-001, SRC-MAYU-001, SRC-ARUN-001, SRC-ARUN-002, SRC-SUMAN-001-v2, SRC-POLICY-001, SRC-MD-HR-001, SRC-MD-SUMAN-001
existing-skills-reviewed: management-gap-detection.md, recruitment-quality-check.md, kpi-axiom-review-support.md, policy-lookup.md
validation-files-reviewed: tier-1-skill-draft-source-map.md, tier-1-md-discussion-skill-update-report.md
owner-for-review: Varmen (validation before build begins)
---

# Management Problem Analysis Skill Plan

**Pass/Fail Rule:** PASS if this skill only captures problem statements, searches source-backed context, surfaces evidence found and missing, and prepares safe next actions — without making decisions, assigning blame, approving escalation, or acting beyond source-backed documentation support. FAIL if any decision authority, escalation trigger, disciplinary action, HR judgement, KPI outcome, or automation is introduced.

---

## Status

**CONDITIONAL PASS**

The proposed skill is safe to build subject to the constraints in this plan. All allowed problem types are supported by at least one READY registered source. All forbidden problem types map to confirmed [VERIFY] blocks or to authorities that belong to human decision-makers, not the AIOS. No Admin Manager authority may be used. No Arun wording [VERIFY] items may be treated as resolved. Build may not begin until Varmen reviews and approves this plan.

---

## Purpose

This skill supports the Management AIOS in analyzing management-related problems using source-backed evidence. Its sole output is a structured problem record that surfaces what evidence exists, what evidence is missing, and what safe next action a human reviewer should take.

It does not replace human judgement. It does not make HR, KPI, escalation, recruitment, disciplinary, or operational authority decisions. It does not close gaps on behalf of management. It prepares analysis for the appropriate reviewer to act upon.

This skill sits above the four existing Tier 1 skills. Where management-gap-detection.md, recruitment-quality-check.md, kpi-axiom-review-support.md, and policy-lookup.md each cover a specific domain, this skill accepts a free-form problem statement and routes it into the relevant domain before searching for source-backed context. It is an intake and analysis layer, not a decision layer.

---

## Allowed Problem Types

The following problem types are supported by READY registered sources and are safe to include in this skill. Each is analysis-only — the skill identifies evidence and surfaces gaps; it does not resolve them.

| # | Allowed Problem Type | Supporting Sources |
|---|---------------------|--------------------|
| 1 | Documentation gaps — missing process records, decision records, management files | SRC-VAR-001, SRC-MD-HR-001 |
| 2 | Requirement clarity gaps — verbal instructions not converted to written requirements; missing or incomplete requirement file metadata | SRC-MD-HR-001 |
| 3 | LLM-queryable compliance gaps — work activities not documented in LLM-queryable format; business logic not in plain English | SRC-MD-HR-001 |
| 4 | Onboarding evidence gaps — missing pre-employment documents, orientation confirmation, role-specific training records, AI tool training confirmation, PDPA acknowledgement | SRC-POLICY-001 §3.0 §17.0, SRC-MAYU-001, SRC-SUMAN-001-v2, SRC-MD-SUMAN-001 |
| 5 | Leave visibility and update gaps — leave not recorded in the system, notice not given, team or organisation-wide limits breached | SRC-POLICY-001 §6.0–6.5, SRC-VAR-001 |
| 6 | KPI review preparation gaps — review inputs not collected, weekly AXIOM workflow steps not evidenced, review outputs not documented, Leadership Review schedule breached | SRC-ARUN-001, SRC-ARUN-002, SRC-MAYU-001, SRC-MD-HR-001 |
| 7 | Recruitment process evidence gaps — screening not completed, interview scoring missing, commitment records not issued, review stages not conducted or not documented | SRC-SUMAN-001-v2, SRC-MD-SUMAN-001 |
| 8 | ROI evidence gaps — new employee ROI milestones not evidenced at 1-week / 1-month / 3-month checkpoints; six-month hire ROI audit not completed or not evidenced before handover; developer or technical project concluded without ROI documentation | SRC-MD-HR-001, SRC-MD-SUMAN-001 |
| 9 | Handover continuity gaps — 180-day handover meeting not scheduled, required attendees not confirmed, handover items not covered, staff record fields not written at handoff, Mayurika 2-week proactive reminder not sent | SRC-SUMAN-001-v2, SRC-MAYU-001, SRC-MD-SUMAN-001 |
| 10 | Recurring follow-up gaps — Critic Meeting action items not tracked or closed, SKILL file non-compliance not followed up same-day, Month 1 corrective action plan not assessed at Month 3, EOD submission non-compliance recurs without escalation | SRC-MAYU-001, SRC-SUMAN-001-v2 |
| 11 | Management file organisation gaps — BGCT documents not collected centrally, Management Team Google Sheets not consolidated, Task IDs missing from work records, lessons learned documents not produced, folder structure non-compliant | SRC-MD-HR-001, SRC-VAR-001 |
| 12 | Policy compliance evidence gaps — AI tool daily use not evidenced, late arrival threshold exceeded, working hours below minimum, time tracking not logged, offboarding checklist not completed, credentials not revoked | SRC-POLICY-001, SRC-VAR-001 |
| 13 | OLOS and BGCT onboarding system validation gaps — OLOS deployed without validation sign-off, required OLOS documents not present, BGCT completion not recorded for recent joiners | SRC-MD-SUMAN-001 |

---

## Forbidden Problem Types

The following problem types must not be handled by this skill. Any problem statement that falls into these areas must be declined by the skill with a clear explanation of the block, citing the relevant [VERIFY] item or authority boundary.

| # | Forbidden Problem Type | Reason |
|---|----------------------|--------|
| 1 | Final escalation decisions | Admin Manager authority and escalation paths are [VERIFY] — SRC-ADMIN-001 PENDING. No final escalation routes may be included. |
| 2 | Admin Manager authority decisions | All Admin Manager authority (approval rights, PRC role, escalation chains) is [VERIFY] — blocked until SRC-ADMIN-001 received and Varmen reviewed. |
| 3 | Disciplinary decisions | Disciplinary outcomes, case conclusions, and formal warnings are HR and management decisions. Not AIOS outputs. |
| 4 | Termination decisions — resignation or company-initiated | Termination requires human authority per SRC-POLICY-001 §10. Not an AIOS output. |
| 5 | Employee confirmation decisions | Probation confirmation, employment status changes, and headcount decisions require management approval. |
| 6 | Bonus decisions | Bonus eligibility approval requires PRC Approval (SRC-ARUN-001 §9). This skill can check whether conditions are evidenced; it cannot approve or deny bonuses. |
| 7 | PIP and warning decisions | First Warning, Second Warning, Third Warning, and PIP are HR and management decisions. This skill confirms whether documentation exists for the current escalation stage only. |
| 8 | Final KPI judgement | KPI band placement, AXIOM scores, and performance assessments are Arun's authority (SRC-ARUN-001, SRC-MAYU-001). This skill supports preparation and evidence checking only. |
| 9 | Amazon ACOS threshold judgement | Amazon ACOS trigger wording is [VERIFY] item 8 — Arun direct confirmation pending. This trigger may not be used operationally until resolved. |
| 10 | Operational Manager PRC authority judgement | Operational Manager PRC membership and scope is [VERIFY] item 9 — Arun direct confirmation pending. |
| 11 | ROI Officer identity and authority judgement | ROI Officer role identity is [VERIFY] item 10 — a VERIFY Resolved Candidate exists (SRC-MD-SUMAN-001 identifies Arun and Mayurika jointly) but [VERIFY] tag must remain until Arun directly confirms. |
| 12 | Director authority beyond Leadership Review | Director's authority beyond co-facilitating Leadership Reviews is [VERIFY] item 11 — no additional Director authority may be stated or inferred. |
| 13 | HR tool or EOD tool name assertions | Exact tool names for HR and EOD systems are [VERIFY] item 12 — Mayurika confirmation pending. |
| 14 | MD-specific requirements beyond Varmen relay | MD direct requirements are [VERIFY] items 6–7 — pending MD review meeting. This skill scope may change after MD review. |

---

## Proposed Workflow

The following 11-step workflow defines how this skill processes a problem statement from intake to closure note. Each step is analysis-only. No step produces a decision or triggers an automated action.

**Step 1 — Capture problem statement**
Accept a free-form problem statement. Confirm it is process-level. Reject if it contains personally identifiable sensitive HR data, salary information, disciplinary case personal details, individual health data, grievance specifics, or raw PDPA personal data.

**Step 2 — Identify affected domain**
Classify the problem statement against the eleven allowed problem types (§ Allowed Problem Types). If the problem maps to a forbidden problem type, decline with reference to the relevant block and [VERIFY] item. If ambiguous, identify the closest matching domain and flag the ambiguity for the reviewer.

**Step 3 — Search source-backed context**
Query the relevant context files and skill reference tables for the identified domain:
- Documentation / requirement / LLM-queryable gaps → context/management-aios-purpose.md, context/hr-operations-context.md §10
- Onboarding gaps → context/hr-operations-context.md §1–§2, context/recruitment-context.md §1–§13
- Leave gaps → context/hr-operations-context.md §9
- KPI review preparation gaps → context/kpi-axiom-context.md
- Recruitment process evidence gaps → context/recruitment-context.md §1–§13
- ROI evidence gaps → context/hr-operations-context.md §10.9–§10.10, context/recruitment-context.md §13.2
- Handover continuity gaps → context/recruitment-context.md §11–§13
- Recurring follow-up gaps → context/hr-operations-context.md §4–§8
- Management file organisation gaps → context/management-aios-purpose.md, context/hr-operations-context.md §10.13–§10.14
- Policy compliance evidence gaps → context/hr-operations-context.md §9, skills/policy-lookup.md
- OLOS and BGCT gaps → context/recruitment-context.md §13.6–§13.7

**Step 4 — Identify evidence found**
List the specific source-backed rules, thresholds, and process steps that apply to this problem. Cite Source IDs for every item listed. Do not include unsourced claims.

**Step 5 — Identify evidence missing**
List what evidence or documentation is absent or cannot be confirmed from the problem description. Note whether the missing evidence is a governance failure (based on confirmed source rules) or an unresolved query requiring more information.

**Step 6 — Check [VERIFY] limits**
Review context/verify-register.md for any active [VERIFY] items that affect the problem domain. Record each [VERIFY] item that applies. State its effect on what can and cannot be concluded from this analysis. Do not proceed as though a [VERIFY] item is resolved.

**Step 7 — Classify problem type**
Assign one of the following classifications:
- DOCUMENTATION GAP — evidence exists that a required record is missing or incomplete
- PROCESS GAP — evidence exists that a required process step was not completed
- COMPLIANCE GAP — evidence exists that a policy or governance rule was not met
- VISIBILITY GAP — insufficient information to confirm whether a gap exists; more data required
- BLOCKED — problem falls into a forbidden area; cannot be analyzed without additional sources or authority resolution

**Step 8 — Identify likely owner or reviewer**
Based on confirmed role boundaries (CLAUDE.md §5), identify the role responsible for reviewing or acting on this problem. Use role titles only — not personal names — unless the process requires identification (e.g., Mayurika as HR custodian per SRC-MAYU-001, Arun as AXIOM placement authority per SRC-ARUN-001). Never assign a reviewer from the Admin Manager without SRC-ADMIN-001 resolution.

**Step 9 — Suggest safe next action**
Propose one next action that is within the AIOS boundary: schedule a review, request missing documentation, flag to the named reviewer, surface the gap to Varmen for validation, or mark as BLOCKED pending a [VERIFY] resolution. Do not suggest disciplinary actions, escalation decisions, or system changes.

**Step 10 — Define pass/fail rule for this record**
State the pass/fail rule that applies to this specific problem record. A record passes if its analysis is confined to source-backed evidence and the next action remains within the AIOS support boundary. A record fails if it makes a decision, assigns blame, approves an escalation, or acts beyond its documentation support role.

**Step 11 — Prepare closure note**
Summarise the problem record in two sentences: what evidence was found and what the safe next action is. Mark the record as READY FOR REVIEW. Output is for human review only.

---

## Output Template

Every problem record produced by this skill must include all required fields listed below. No field may be omitted. Fields marked with a [VERIFY] constraint must include the relevant verify-register.md item number.

| Field | Required | Notes |
|-------|----------|-------|
| Problem title | YES | Short, process-level — no individual names in the title |
| Problem statement | YES | As provided; redacted if personal data was included |
| Affected domain | YES | One of the eleven allowed problem types, or BLOCKED |
| Source IDs used | YES | Cite all Source IDs that informed the analysis |
| Evidence found | YES | Specific source-backed rules or process steps confirmed as applicable |
| Evidence missing | YES | What records or data could not be confirmed |
| Root cause hypothesis | YES | Marked explicitly as HYPOTHESIS — not a finding. Must be testable by reviewing documentation. |
| Risk level | YES | LOW / MEDIUM / HIGH — assessed against whether this is a defined governance failure per registered sources |
| Reviewer needed | YES | Role title (not personal name unless role requires identification) |
| Forbidden decisions avoided | YES | Explicit confirmation that none of the forbidden problem types were triggered in producing this record |
| Safe next action | YES | One action within AIOS support boundary |
| Pass/fail rule | YES | State the rule applied and whether this record PASSES or FAILS it |
| [VERIFY] limits | YES | List each active [VERIFY] item that constrains this analysis, with item number from verify-register.md |

---

## Source Coverage

The following registered sources support the allowed problem types in this skill. No source outside this register may be used.

| Source ID | Status | Problem Types Supported |
|-----------|--------|------------------------|
| SRC-VAR-001 | READY | Documentation gaps, management file organisation gaps, leave visibility gaps, KPI meeting irregularity gaps, purpose and scope authority |
| SRC-MAYU-001 | READY | Onboarding evidence gaps (PDPA, Month 6 handoff fields), KPI review preparation gaps (AXIOM workflow, Leadership Review), recurring follow-up gaps (Critic Meetings, SKILL file compliance, EOD monitoring), handover continuity gaps (2-week reminder, record fields) |
| SRC-ARUN-001 | READY | KPI review preparation gaps (KPI definitions, AXIOM bands, review inputs/outputs, weekly workflow, incident documentation support, PRC preparation support, bonus eligibility evidence check, dashboard requirements) |
| SRC-ARUN-002 | READY | KPI meeting gaps (daily operational checklist reference for Implementation Officer) |
| SRC-SUMAN-001-v2 | READY | Recruitment process evidence gaps (all stages — pipeline through 180-day handover, daily knowledge capture, source quality monitoring) |
| SRC-POLICY-001 | READY | Onboarding evidence gaps (§3.0, §17.0), leave visibility gaps (§6.0–6.5), policy compliance evidence gaps (all policy sections), offboarding gaps (§10.5–10.7) |
| SRC-MD-HR-001 | READY — Varmen Reviewed 2026-06-25 | Documentation and requirement gaps (requirement file metadata, verbal-to-documented rule, Task ID standard, 85% specification rule, business logic documentation), LLM-queryable compliance gaps, management file organisation gaps (BGCT, folder consolidation), ROI evidence gaps (new employee ROI milestones, developer/technical project ROI, lessons learned), KPI review preparation gaps (technical team stand-up governance, EOD Actual Revenue per Hour) |
| SRC-MD-SUMAN-001 | READY — Varmen Reviewed 2026-06-25 | Recruitment process evidence gaps (weekly deliverables, shovel-ready requirement, 14-day pipeline baseline, LLM-in-the-Loop proof, Dan Martel principle), ROI evidence gaps (six-month hire ROI audit, in-flight performance evidence), handover continuity gaps (in-flight evidence before audit), OLOS and BGCT gaps (OLOS validation, BGCT completion for recent joiners) |
| SRC-ADMIN-001 | PENDING — BLOCKED | Admin Manager authority, escalation paths, PRC role — all BLOCKED |

---

## Safety Check

The following confirmations must hold for every output produced by this skill. If any confirmation cannot be made, the output must not be released.

| Safety Condition | Status in This Skill Plan |
|-----------------|--------------------------|
| No decisions made — analysis only | CONFIRMED — workflow steps 1–11 are intake, search, classify, and surface only |
| No escalation authority — next action stays within AIOS support boundary | CONFIRMED — Step 9 limits next actions to scheduling, flagging, or requesting documentation |
| No HR disciplinary action recommended | CONFIRMED — disciplinary outcomes are in the forbidden problem types list |
| No KPI judgement produced | CONFIRMED — AXIOM band placement and performance decisions excluded; skill checks whether evidence exists, not whether performance is acceptable |
| No automation — all outputs require human review | CONFIRMED — output is marked READY FOR REVIEW; no automated action is triggered |
| No sensitive personal data stored — process-level only | CONFIRMED — Step 1 rejects problem statements containing personally identifiable data; all outputs are aggregate or process-level |
| All [VERIFY] items preserved and applied | CONFIRMED — Step 6 and the [VERIFY] limits field in the output template enforce this on every record |
| No Admin Manager authority invented or asserted | CONFIRMED — Admin Manager is in the forbidden problem types list; SRC-ADMIN-001 PENDING means all Admin Manager claims remain [VERIFY] |
| No Arun [VERIFY] wording items treated as resolved | CONFIRMED — items 8, 9, and 10 are carried as [VERIFY] in source coverage; item 10 has a VERIFY Resolved Candidate but the [VERIFY] tag is preserved |
| No content promoted to parent AIOS truth | CONFIRMED — all output is for human review; promotion requires Varmen sign-off |

---

## Relationship to Existing Tier 1 Skills

This skill does not replace or duplicate the existing Tier 1 skills. Its relationship to each is as follows:

| Existing Skill | Relationship |
|---------------|-------------|
| management-gap-detection.md | Shares domain coverage but differs in input mode. management-gap-detection.md operates over a set of system-observed conditions across its 7 gap categories. management-problem-analysis.md accepts a single free-form problem statement and routes it to the appropriate domain before applying source-backed evidence. It uses gap detection logic as a reference layer. |
| recruitment-quality-check.md | Shares domain coverage for recruitment process evidence gaps and ROI audit gaps. management-problem-analysis.md draws on recruitment-context.md and the checklist logic in recruitment-quality-check.md when a problem is classified as a recruitment evidence gap. It does not duplicate the full checklist — it identifies which checklist items apply to the specific problem. |
| kpi-axiom-review-support.md | Shares domain coverage for KPI review preparation gaps. management-problem-analysis.md references kpi-axiom-context.md and the review input/output checklist when a problem is classified as a KPI preparation gap. It does not assign bands or produce review outputs. |
| policy-lookup.md | Shares domain coverage for policy compliance evidence gaps. management-problem-analysis.md references policy-lookup.md to identify which policy section applies to a problem and what the expected standard is. It does not produce policy advice — it surfaces the applicable policy rule for the reviewer. |

---

## Recommended Build Decision

**YES — CONDITIONAL**

The skill is safe to build. All allowed problem types are source-backed. All forbidden problem types are clearly bounded. The workflow is analysis-only. The output template enforces [VERIFY] constraints and prevents decisions from being embedded in outputs. The skill does not duplicate existing Tier 1 skills — it provides an intake and routing layer above them.

**Conditions that must be met before build begins:**

1. Varmen reviews and approves this skill plan.
2. No Admin Manager content is added to the skill at build time.
3. [VERIFY] items 8, 9, and 10 (Arun wording items) remain tagged [VERIFY] throughout the skill file.
4. The skill file must carry a Pass/Fail rule in its header identical to the one in this plan.
5. After build, a source map row must be added to validation/tier-1-skill-draft-source-map.md for each claim in the new skill file before the skill is considered ready for Varmen review.

---

## Pass/Fail Rule

**PASS if:** This skill only accepts problem statements, searches source-backed context, identifies evidence found and missing, applies [VERIFY] limits, classifies the problem, identifies the reviewer, and suggests a safe next action within the AIOS support boundary.

**FAIL if:** This skill makes decisions, assigns blame, approves escalation, issues warnings, confirms probation outcomes, approves bonuses, assigns AXIOM bands, finalizes Admin Manager authority, removes [VERIFY] tags, stores sensitive personal data, connects to live systems, or automates any action.

---

## Summary Output

| Item | Result |
|------|--------|
| **Status** | CONDITIONAL PASS |
| **Safe to build?** | YES — subject to conditions in this plan |
| **Required sources** | SRC-VAR-001, SRC-MAYU-001, SRC-ARUN-001, SRC-ARUN-002, SRC-SUMAN-001-v2, SRC-POLICY-001, SRC-MD-HR-001, SRC-MD-SUMAN-001 — all READY |
| **Blocked areas** | Admin Manager authority (SRC-ADMIN-001 PENDING); final escalation paths; Arun wording items 8, 9, 10 ([VERIFY]); Director authority item 11 ([VERIFY]); HR and EOD tool names item 12 ([VERIFY]); MD-specific requirements items 6–7 ([VERIFY]) — Note: Line Manager identity (former [VERIFY] item 11) resolved by SRC-SUMAN-CONF-001 2026-06-25; removed from blocked areas |
| **One next action** | Varmen reviews and approves this plan before build begins. Once approved, the skill file may be drafted and its source map rows added to validation/tier-1-skill-draft-source-map.md |

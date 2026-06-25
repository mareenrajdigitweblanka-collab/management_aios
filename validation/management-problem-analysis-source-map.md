---
name: management-problem-analysis-source-map
type: validation
created: 2026-06-25
tracks: skills/management-problem-analysis.md
status: PASS
---

# Management Problem Analysis Skill — Source Map

Every major claim, workflow step, allowed problem type, forbidden problem type, and output field in skills/management-problem-analysis.md is traced here to its Source ID.

**Pass rule:** Every row must have a Source ID or a [VERIFY] status. Any row with neither is a validation failure.

---

## Source Map Table

| Skill Section | Claim / Workflow Step | Source ID | Status | VERIFY? | Notes |
|---------------|-----------------------|-----------|--------|---------|-------|
| Header / Purpose | AIOS exists to identify operational gaps, missing processes, documentation issues, and recurring management problems | SRC-VAR-001 | CONFIRMED | — | Direct from AIOS Extraction Summary |
| Purpose | This skill supports human decision-making; does not make decisions | SRC-VAR-001 | CONFIRMED | — | AIOS is intelligence layer, not decision layer |
| Purpose | Does not replace Mayurika, Arun, Suman, Varmen, Admin Manager, Director, or any business owner | SRC-MAYU-001, SRC-ARUN-001, SRC-SUMAN-001-v2 | CONFIRMED | — | Role boundaries confirmed in CLAUDE.md §5 |
| Source IDs Used | SRC-VAR-001 READY | evidence/source-register.md | CONFIRMED | — | Registered source |
| Source IDs Used | SRC-MAYU-001 READY | evidence/source-register.md | CONFIRMED | — | Registered source |
| Source IDs Used | SRC-ARUN-001 READY | evidence/source-register.md | CONFIRMED | — | Registered source |
| Source IDs Used | SRC-ARUN-002 READY | evidence/source-register.md | CONFIRMED | — | Registered source |
| Source IDs Used | SRC-SUMAN-001-v2 READY | evidence/source-register.md | CONFIRMED | — | Registered source |
| Source IDs Used | SRC-POLICY-001 READY — Final Approved | evidence/source-register.md | CONFIRMED | — | Registered source — Final Approved |
| Source IDs Used | SRC-MD-HR-001 READY — Varmen Reviewed | evidence/source-register.md | CONFIRMED | — | Registered source |
| Source IDs Used | SRC-MD-SUMAN-001 READY — Varmen Reviewed | evidence/source-register.md | CONFIRMED | — | Registered source |
| Source IDs Used | SRC-SUMAN-CONF-001 READY — limited use | evidence/source-register.md | CONFIRMED | — | Limited to Line Manager typing correction resolution only |
| Source IDs Used | SRC-ADMIN-001 PENDING — blocked | evidence/source-register.md | [VERIFY] | YES | Items 1–5 in verify-register.md — cannot be used as evidence |
| Problem Type 1 — Documentation Gap | Verbal instruction must be converted to written requirement before actioning | SRC-MD-HR-001 | CONFIRMED | — | Verbal-to-documented rule (16/06/2026 and 15/05/2026) |
| Problem Type 1 — Documentation Gap | Task ID must be assigned to all work records | SRC-MD-HR-001 | CONFIRMED | — | Task ID standard (19/11/2025) |
| Problem Type 1 — Documentation Gap | Requirement file must contain 8 metadata fields | SRC-MD-HR-001 | CONFIRMED | — | Requirement file metadata (16/06/2026) |
| Problem Type 1 — Documentation Gap | 85% specification rule — development must not start until 85% of requirements are documented | SRC-MD-HR-001 | CONFIRMED | — | 85% specification rule (22/05/2026 and 15/05/2026) |
| Problem Type 2 — Requirement Clarity Gap | Same as Documentation Gap — verbal-to-documented rule, 85% rule, 8 metadata fields | SRC-MD-HR-001 | CONFIRMED | — | Requirement file governance |
| Problem Type 3 — LLM-Queryable Compliance Gap | Any activity not in LLM-queryable format is "not happened" | SRC-MD-HR-001 | CONFIRMED | — | LLM-queryable standard (22/05/2026 and 22/06/2026) |
| Problem Type 3 — LLM-Queryable Compliance Gap | Daily 10% business logic validation required and must be evidenced | SRC-MD-HR-001 | CONFIRMED | — | Business logic validation (22/05/2026) |
| Problem Type 3 — LLM-Queryable Compliance Gap | Business logic must be comprehensible by a fresh joiner | SRC-MD-HR-001 | CONFIRMED | — | Business logic documentation (10/02/2026 and 24/03/2026) |
| Problem Type 4 — Onboarding Evidence Gap | Pre-employment documents collected before start date | SRC-POLICY-001 §3.0 | CONFIRMED | — | §3.0 structured onboarding |
| Problem Type 4 — Onboarding Evidence Gap | First-day orientation required (team introduction, culture, key policies) | SRC-POLICY-001 §3.0 | CONFIRMED | — | §3.0 structured onboarding |
| Problem Type 4 — Onboarding Evidence Gap | Role-specific training with mentor or supervisor | SRC-POLICY-001 §3.0 | CONFIRMED | — | §3.0 structured onboarding |
| Problem Type 4 — Onboarding Evidence Gap | AI tool training mandatory for all new hires during onboarding | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 mandatory AI tools |
| Problem Type 4 — Onboarding Evidence Gap | PDPA notice issued and acknowledgement date recorded | SRC-MAYU-001 | CONFIRMED | — | PDPA tracking section |
| Problem Type 4 — Onboarding Evidence Gap | OLOS validation and BGCT completion monitored | SRC-MD-SUMAN-001 | CONFIRMED | — | OLOS validation directive (29/05/2026) |
| Problem Type 5 — Leave Visibility or Update Gap | Leave recorded at least 48 hours in advance | SRC-POLICY-001 §6.1 | CONFIRMED | — | §6.1 general leave |
| Problem Type 5 — Leave Visibility or Update Gap | Maximum 12% of staff on leave simultaneously | SRC-POLICY-001 §6.1 | CONFIRMED | — | §6.1 general leave |
| Problem Type 5 — Leave Visibility or Update Gap | Team leave limits: 2 per day (1 for CST/Content Writing/Postage) | SRC-POLICY-001 §6.1 | CONFIRMED | — | §6.1 general leave |
| Problem Type 5 — Leave Visibility or Update Gap | Planned leave notice periods by duration (1 week / 4 weeks / 8 weeks / 3 months) | SRC-POLICY-001 §6.2 | CONFIRMED | — | §6.2 planned leave |
| Problem Type 5 — Leave Visibility or Update Gap | Unplanned leave maximum 5 days per year | SRC-POLICY-001 §6.3 | CONFIRMED | — | §6.3 unplanned leave |
| Problem Type 5 — Leave Visibility or Update Gap | Short leave maximum 2 hours per month with 24-hour advance notice | SRC-POLICY-001 §6.4 | CONFIRMED | — | §6.4 short leave |
| Problem Type 5 — Leave Visibility or Update Gap | Maternity leave — 30-day prior notice required | SRC-POLICY-001 §6.5 | CONFIRMED | — | §6.5 maternity leave |
| Problem Type 5 — Leave Visibility or Update Gap | Leave visibility is a core AIOS problem area | SRC-VAR-001 | CONFIRMED | — | Focus Area 2 |
| Problem Type 6 — KPI Review Preparation Gap | KPI definitions by team (Portfolio, Website, eBay, Account Holders, PPC, Technical, Development) | SRC-ARUN-001 | CONFIRMED | — | KPI Definitions section |
| Problem Type 6 — KPI Review Preparation Gap | Weekly AXIOM data submitted by Mayurika to Arun before processing | SRC-MAYU-001 | CONFIRMED | — | Weekly AXIOM Submission section |
| Problem Type 6 — KPI Review Preparation Gap | Twice-weekly Leadership Review schedule | SRC-MAYU-001 | CONFIRMED | — | Section 3: Leadership Review Coordination |
| Problem Type 6 — KPI Review Preparation Gap | Technical team stand-up must cover user-facing work and deliverables | SRC-MD-HR-001 | CONFIRMED | — | Stand-up governance (22/06/2026) |
| Problem Type 6 — KPI Review Preparation Gap | EOD Actual Revenue per Hour metric required | SRC-MD-HR-001 | CONFIRMED | — | MD-directed EOD extension (10/02/2026) |
| Problem Type 6 — KPI Review Preparation Gap | Amazon ACOS threshold — exact wording and direction [VERIFY] | SRC-ARUN-001 | [VERIFY] | YES | Item 8 in verify-register.md — Arun direct confirmation pending |
| Problem Type 6 — KPI Review Preparation Gap | Operational Manager PRC membership and scope [VERIFY] | SRC-ARUN-001 | [VERIFY] | YES | Item 9 in verify-register.md — Arun direct confirmation pending |
| Problem Type 6 — KPI Review Preparation Gap | ROI Officer identity and title [VERIFY] | SRC-ARUN-001 | [VERIFY] | YES | Item 10 in verify-register.md — VERIFY Resolved Candidate exists but [VERIFY] tag must remain until Arun confirms |
| Problem Type 7 — Recruitment Process Evidence Gap | 8-point screening criteria | SRC-SUMAN-001-v2 | CONFIRMED | — | §2 8-point screening |
| Problem Type 7 — Recruitment Process Evidence Gap | 50-point interview scoring (5 areas × 10 points) | SRC-SUMAN-001-v2 | CONFIRMED | — | §3 interview scoring |
| Problem Type 7 — Recruitment Process Evidence Gap | Rejected and on-hold candidate tracking | SRC-SUMAN-001-v2 | CONFIRMED | — | §4 rejected/on-hold tracking |
| Problem Type 7 — Recruitment Process Evidence Gap | Commitment record issued with every offer | SRC-SUMAN-001-v2 | CONFIRMED | — | §5 commitment records |
| Problem Type 7 — Recruitment Process Evidence Gap | 7/14-day review conducted with trainer/TL feedback | SRC-SUMAN-001-v2 | CONFIRMED | — | §6 7/14-day review |
| Problem Type 7 — Recruitment Process Evidence Gap | Month 1 review with status categories (On Track, Watch, Concern, Critical) | SRC-SUMAN-001-v2 | CONFIRMED | — | §7 Month 1 review |
| Problem Type 7 — Recruitment Process Evidence Gap | Month 3 review — corrective action plan assessed | SRC-SUMAN-001-v2 | CONFIRMED | — | §8 Month 3 review |
| Problem Type 7 — Recruitment Process Evidence Gap | Month 6 review — full commitment vs delivery assessment | SRC-SUMAN-001-v2 | CONFIRMED | — | §9 Month 6 review |
| Problem Type 7 — Recruitment Process Evidence Gap | Weekly deliverables: Risk Identification, One-Month Task Rule, SKU/Margin/Hire-ROI Trace, LLM-in-the-Loop proof | SRC-MD-SUMAN-001 | CONFIRMED | — | Weekly deliverables directive |
| Problem Type 8 — ROI Evidence Gap | ROI reviews required at 1-week, 1-month, and 3-month milestones | SRC-MD-HR-001 | CONFIRMED | — | New employee ROI monitoring (16/06/2026) |
| Problem Type 8 — ROI Evidence Gap | Missing ROI review at any milestone is a governance failure | SRC-MD-HR-001 | CONFIRMED | — | New employee ROI monitoring |
| Problem Type 8 — ROI Evidence Gap | Developer/technical project ROI documentation required on conclusion | SRC-MD-HR-001 | CONFIRMED | — | ROI documentation (16/06/2026) |
| Problem Type 8 — ROI Evidence Gap | Lessons learned document required after concluded project or case | SRC-MD-HR-001 | CONFIRMED | — | Lessons learned (16/06/2026) |
| Problem Type 8 — ROI Evidence Gap | Six-month hire ROI audit — binary assessment against 5 traceable categories | SRC-MD-SUMAN-001 | CONFIRMED | — | Six-month hire ROI audit (07/05/2026) |
| Problem Type 8 — ROI Evidence Gap | ROI audit evidence must be documented before 180-day handover | SRC-MD-SUMAN-001 | CONFIRMED | — | Handover sequencing |
| Problem Type 9 — Handover Continuity Gap | 180-day handover — 15-minute meeting; confirmed attendees: Mayurika, Arun, Suman | SRC-SUMAN-001-v2, SRC-SUMAN-CONF-001 | CONFIRMED | — | §11 180-day handover; Line Manager typing correction resolved by SRC-SUMAN-CONF-001 |
| Problem Type 9 — Handover Continuity Gap | No Line Manager role in 180-day handover | SRC-SUMAN-CONF-001 | CONFIRMED | — | Line Manager typing correction — item 11 resolved 2026-06-25 |
| Problem Type 9 — Handover Continuity Gap | Mayurika proactively reminds Suman 2 weeks before 6-month handoff | SRC-MAYU-001 | CONFIRMED | — | Month 6 Handoff section |
| Problem Type 9 — Handover Continuity Gap | Mayurika writes recruitment_source_id and recruitment_promise_set_id to staff record at handoff | SRC-MAYU-001 | CONFIRMED | — | Month 6 Handoff section |
| Problem Type 9 — Handover Continuity Gap | Handover covers: commitment delivery summary, employee record verification, KPI baseline, outstanding issues | SRC-SUMAN-001-v2 | CONFIRMED | — | §11 180-day handover |
| Problem Type 10 — Recurring Follow-Up Gap | Critic Meeting action items tracked in Action Tracker and published to notice board | SRC-MAYU-001 | CONFIRMED | — | Section 5: Critic Meeting Management |
| Problem Type 10 — Recurring Follow-Up Gap | Action Review Meeting required with Team Leader after each Critic Meeting | SRC-MAYU-001 | CONFIRMED | — | Section 5: Critic Meeting Management |
| Problem Type 10 — Recurring Follow-Up Gap | SKILL file non-compliance requires same-day follow-up | SRC-MAYU-001 | CONFIRMED | — | Section 6: SKILL File Compliance |
| Problem Type 10 — Recurring Follow-Up Gap | Month 1 corrective action plan must be assessed at Month 3 | SRC-SUMAN-001-v2 | CONFIRMED | — | §8 Month 3 review |
| Problem Type 11 — Management File Organization Gap | BGCT documents must be collected and stored centrally | SRC-MD-HR-001 | CONFIRMED | — | BGCT governance (08/06/2026) |
| Problem Type 11 — Management File Organization Gap | Management Team Google Sheets must be identified, listed, and consolidated | SRC-MD-HR-001 | CONFIRMED | — | Folder consolidation (08/06/2026) |
| Problem Type 11 — Management File Organization Gap | Task IDs must be assigned to all work records | SRC-MD-HR-001 | CONFIRMED | — | Task ID standard (19/11/2025) |
| Problem Type 11 — Management File Organization Gap | Management file and decision disorganisation is a core AIOS problem area | SRC-VAR-001 | CONFIRMED | — | Focus Area 4 |
| Problem Type 12 — Policy Compliance Evidence Gap | AI tool daily use mandatory; monitored | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 mandatory AI tools |
| Problem Type 12 — Policy Compliance Evidence Gap | Monthly AI-based contribution or efficiency gain must be reported | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 mandatory AI tools |
| Problem Type 12 — Policy Compliance Evidence Gap | AI reorientation required on department change | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 mandatory AI tools |
| Problem Type 12 — Policy Compliance Evidence Gap | Late arrival: 2 instances per month maximum | SRC-POLICY-001 §5.0 | CONFIRMED | — | §5.0 late arrival |
| Problem Type 12 — Policy Compliance Evidence Gap | Minimum 41.5 hours per week | SRC-POLICY-001 §16.0 | CONFIRMED | — | §16.0 hours of work |
| Problem Type 12 — Policy Compliance Evidence Gap | Daily time logging required | SRC-POLICY-001 §15.0 | CONFIRMED | — | §15.0 time tracking |
| Problem Type 12 — Policy Compliance Evidence Gap | Credentials revoked promptly on resignation or termination | SRC-POLICY-001 §10.5 | CONFIRMED | — | §10.5 credential revocation |
| Problem Type 12 — Policy Compliance Evidence Gap | Exit interview and final checklist required on departure | SRC-POLICY-001 §10.6–10.7 | CONFIRMED | — | §10.6–10.7 offboarding |
| Problem Type 13 — Business Logic Validation Gap | Business logic must be plain English, comprehensible by fresh joiner | SRC-MD-HR-001 | CONFIRMED | — | Business logic documentation (10/02/2026 and 24/03/2026) |
| Problem Type 13 — Business Logic Validation Gap | OLOS must be validated before go-live; required documents listed | SRC-MD-SUMAN-001 | CONFIRMED | — | OLOS onboarding validation (29/05/2026) |
| Problem Type 13 — Business Logic Validation Gap | BGCT completion for recent joiners must be monitored | SRC-MD-SUMAN-001 | CONFIRMED | — | BGCT monitoring directive |
| Forbidden Type 1 — Final escalation decisions | Admin Manager authority [VERIFY] items 1–5 | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md |
| Forbidden Type 2 — Admin Manager authority decisions | All Admin Manager authority blocked | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md |
| Forbidden Type 3 — Disciplinary decisions | Disciplinary outcomes are HR/management decisions | SRC-POLICY-001 §10, SRC-VAR-001 | CONFIRMED | — | Not AIOS outputs — authority boundary |
| Forbidden Type 4 — Termination decisions | Termination requires human authority | SRC-POLICY-001 §10 | CONFIRMED | — | §10 offboarding and termination |
| Forbidden Type 5 — Employee confirmation decisions | Probation confirmation requires management approval | SRC-SUMAN-001-v2, SRC-MAYU-001 | CONFIRMED | — | Authority boundary — not AIOS output |
| Forbidden Type 6 — Bonus decisions | Bonus approval requires PRC Approval | SRC-ARUN-001 | CONFIRMED | — | §9 bonus eligibility — PRC Approval required |
| Forbidden Type 7 — PIP and warning decisions | Warnings and PIP are HR/management decisions | SRC-ARUN-001 | CONFIRMED | — | §7.7 incident escalation — human management decisions |
| Forbidden Type 8 — Final KPI judgement | AXIOM band placement is Arun's authority | SRC-ARUN-001, SRC-MAYU-001 | CONFIRMED | — | Authority boundary confirmed in CLAUDE.md §5 |
| Forbidden Type 9 — Amazon ACOS threshold | Amazon ACOS wording [VERIFY] | SRC-ARUN-001 | [VERIFY] | YES | Item 8 in verify-register.md |
| Forbidden Type 10 — Operational Manager PRC scope | Operational Manager PRC membership [VERIFY] | SRC-ARUN-001 | [VERIFY] | YES | Item 9 in verify-register.md |
| Forbidden Type 11 — ROI Officer identity | ROI Officer identity [VERIFY] | SRC-ARUN-001 | [VERIFY] | YES | Item 10 in verify-register.md — VERIFY Resolved Candidate exists but [VERIFY] tag preserved |
| Forbidden Type 12 — Director authority | Director authority beyond Leadership Review [VERIFY] | SRC-MAYU-001 partial | [VERIFY] | YES | Item 11 in verify-register.md |
| Forbidden Type 13 — HR/EOD tool names | Exact tool names [VERIFY] | SRC-MAYU-001 | [VERIFY] | YES | Item 12 in verify-register.md |
| Forbidden Type 14 — MD-specific requirements | MD direct requirements [VERIFY] | SRC-VAR-001 | [VERIFY] | YES | Items 6–7 in verify-register.md |
| Workflow Step 1 | Reject sensitive personal data at intake | SRC-VAR-001, SRC-MAYU-001 | CONFIRMED | — | Confidentiality rules — process-level only |
| Workflow Step 2 | Classify against 13 allowed problem types; decline if forbidden | SRC-VAR-001 | CONFIRMED | — | Analysis boundary — AIOS support role |
| Workflow Step 3 | Search source-backed context per domain | SRC-VAR-001, SRC-MAYU-001, SRC-ARUN-001, SRC-SUMAN-001-v2, SRC-POLICY-001, SRC-MD-HR-001, SRC-MD-SUMAN-001 | CONFIRMED | — | Context file routing per domain |
| Workflow Step 4 | Cite Source IDs for every evidence item listed | — | Process rule | — | CLAUDE.md §2 source discipline |
| Workflow Step 5 | Identify missing evidence; note governance failure vs unresolved query | SRC-VAR-001 | CONFIRMED | — | Gap detection logic |
| Workflow Step 6 | Check [VERIFY] limits from verify-register.md | — | Process rule | — | CLAUDE.md §13 forbidden actions |
| Workflow Step 7 | Classify as DOCUMENTATION GAP / PROCESS GAP / COMPLIANCE GAP / VISIBILITY GAP / BLOCKED | SRC-VAR-001 | CONFIRMED | — | Gap classification aligned with AIOS problem areas |
| Workflow Step 8 | Identify reviewer by role title using confirmed role boundaries | SRC-MAYU-001, SRC-ARUN-001, SRC-SUMAN-001-v2 | CONFIRMED | — | CLAUDE.md §5 role boundaries |
| Workflow Step 9 | Suggest one safe next action within AIOS support boundary | SRC-VAR-001 | CONFIRMED | — | AIOS is intelligence layer, not decision layer |
| Workflow Step 10 | State pass/fail rule for this specific problem record | — | Process rule | — | Skill pass/fail rule enforcement |
| Workflow Step 11 | Closure note — two sentences; mark READY FOR REVIEW | SRC-VAR-001 | CONFIRMED | — | Output for human review only |
| Reviewer Routing — Varmen | Management documentation / structure issues | SRC-VAR-001, SRC-MD-HR-001 | CONFIRMED | — | Primary authority source |
| Reviewer Routing — Mayurika | HR operations / leave / staff record process issues | SRC-MAYU-001 | CONFIRMED | — | HR custodian role confirmed |
| Reviewer Routing — Suman | Recruitment / onboarding issues | SRC-SUMAN-001-v2, SRC-MD-SUMAN-001 | CONFIRMED | — | Recruitment Officer role confirmed |
| Reviewer Routing — Arun | KPI / AXIOM review preparation issues | SRC-ARUN-001 | CONFIRMED | — | AXIOM placement authority confirmed |
| Reviewer Routing — Policy Lookup skill | Policy explanation issues | SRC-POLICY-001 | CONFIRMED | — | Policy Lookup skill routes to SRC-POLICY-001 only |
| Reviewer Routing — Admin Manager | Admin authority / escalation issues | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md |
| Relationship — management-gap-detection.md | Reference layer for gap detection logic | SRC-VAR-001 | CONFIRMED | — | Tier 1 skill |
| Relationship — recruitment-quality-check.md | Reference layer for recruitment evidence gaps | SRC-SUMAN-001-v2, SRC-MD-SUMAN-001 | CONFIRMED | — | Tier 1 skill |
| Relationship — kpi-axiom-review-support.md | Reference layer for KPI preparation gaps | SRC-ARUN-001, SRC-MD-HR-001 | CONFIRMED | — | Tier 1 skill |
| Relationship — policy-lookup.md | Reference layer for policy compliance gaps | SRC-POLICY-001 | CONFIRMED | — | Tier 1 skill |
| Safety Rules | No decisions, no escalation, no HR disciplinary action, no KPI judgement, no automation | SRC-VAR-001, CLAUDE.md §12 | CONFIRMED | — | AIOS support boundary |
| Safety Rules | No sensitive personal data stored | SRC-VAR-001, SRC-MAYU-001 | CONFIRMED | — | Confidentiality rules |
| Safety Rules | All [VERIFY] items preserved and applied | — | Process rule | — | CLAUDE.md §12 forbidden actions |
| Safety Rules | No Admin Manager authority invented | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md |
| Safety Rules | No Arun [VERIFY] wording items treated as resolved | SRC-ARUN-001 | [VERIFY] | YES | Items 8, 9, 10 in verify-register.md |
| Management Action Records Reading Rule | Skill must check management-action-records/INDEX.md when user asks about previous action, MD follow-up, action history, recurring issue history, or problem/solution records | MGMT-ACTION-RECORDS-FOLDER, context/management-action-records-context.md | CONFIRMED | — | CLAUDE.md §16; INDEX.md defines when and how to check |
| Management Action Records Reading Rule — person folder routing | mayurika-hr/ for HR records; arun-implementation/ for KPI/ROI records; rajiv-admin-manager/ for admin records with [VERIFY] preserved; suman-recruitment/ for recruitment records | MGMT-ACTION-RECORDS-FOLDER, intelligence-inbox/management-action-records/INDEX.md | CONFIRMED | — | INDEX.md Active User Folders table |
| Management Action Records Reading Rule — evidence boundary | Records are evidence of recorded discussion/action only — not final policy, not automatic approval, not [VERIFY] resolution | context/management-action-records-context.md | CONFIRMED | — | Safety Boundary section of context file |
| Management Action Records Reading Rule — Rajiv/Admin boundary | Records in rajiv-admin-manager/ do not establish Admin Manager authority; [VERIFY] items 1–5 preserved | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md; context/management-action-records-context.md |
| Management Action Records Reading Rule — relationship to MD discussion notes | intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/ is the historical source layer (SRC-MD-HR-001, SRC-MD-SUMAN-001); management-action-records/ is the ongoing intelligence input layer; these are distinct and must not be conflated | SRC-MD-HR-001, SRC-MD-SUMAN-001, MGMT-ACTION-RECORDS-FOLDER | CONFIRMED | — | context/management-action-records-context.md Relationship Between Folders section |
| Workflow Step 3 — action records check | When action history is relevant, check management-action-records/INDEX.md and relevant person subfolder before evidence identification | MGMT-ACTION-RECORDS-FOLDER, context/management-action-records-context.md | CONFIRMED | — | Added to Step 3 in skill workflow |
| Output field — Management Action Records Checked | Required output field: YES/NO; if YES includes folder checked, record path, reviewer/status present, source IDs present, policy/source support present, [VERIFY] limits remaining | MGMT-ACTION-RECORDS-FOLDER, intelligence-inbox/management-action-records/INDEX.md | CONFIRMED | — | Added to Output Template in skill |
| Wrapper — required reading | context/management-action-records-context.md and intelligence-inbox/management-action-records/INDEX.md added to wrapper required reading list | context/management-action-records-context.md, MGMT-ACTION-RECORDS-FOLDER | CONFIRMED | — | .claude/skills/management-problem-analysis/SKILL.md updated |
| Wrapper — Management Action Records Check section | Wrapper must check INDEX.md and relevant person folder when user asks about previous action, MD follow-up, action history, recurring issue history, or problem/solution records | MGMT-ACTION-RECORDS-FOLDER, context/management-action-records-context.md | CONFIRMED | — | Added to wrapper SKILL.md |
| Wrapper — Rajiv/Admin [VERIFY] preserved | Wrapper explicitly preserves [VERIFY — Admin Manager authority not yet confirmed] for any claim from rajiv-admin-manager/ | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md |
| Wrapper — Required Output | Management Action Records Checked added to required output fields | MGMT-ACTION-RECORDS-FOLDER | CONFIRMED | — | .claude/skills/management-problem-analysis/SKILL.md updated |

---

## [VERIFY] Items Active in This Skill

| [VERIFY] Item # | Description | Effect on This Skill |
|----------------|-------------|---------------------|
| 1 | Admin Manager document | Cannot include Admin Manager source, authority, or escalation paths |
| 2 | Admin Manager authority scope | Cannot assert any Admin Manager authority |
| 3 | Admin Manager PRC role and authority | Cannot include Admin Manager PRC routing |
| 4 | Admin Manager approval chains and escalation paths | Cannot include escalation paths through Admin Manager |
| 5 | Final escalation paths (through Admin Manager) | Final escalation is a forbidden problem type |
| 6 | MD-specific requirements beyond Varmen relay | Skill scope may change after MD review meeting; marked Foundation Draft v0.1 |
| 7 | Final implementation scope | Skill is draft only; not final until MD review completed |
| 8 | Amazon ACOS threshold wording | Amazon ACOS trigger excluded from KPI review preparation gap evidence |
| 9 | Operational Manager PRC membership and scope | Cannot route to or reference Operational Manager PRC role as confirmed |
| 10 | ROI Officer identity / title | Cannot confirm ROI Officer as distinct role; VERIFY Resolved Candidate exists but [VERIFY] preserved |
| 11 | Director authority beyond Leadership Review | Director routing limited to confirmed Leadership Review co-facilitation role only |
| 12 | Exact tool names for HR and EOD systems | Cannot assert specific HR or EOD tool names |

---

## Summary

| Status | Count |
|--------|-------|
| CONFIRMED | 103 |
| [VERIFY] | 15 |
| Process rule (no source required) | 6 |
| TOTAL rows | 124 |

**Source map result: PASS — all claims trace to a registered READY source or carry [VERIFY]. No claim is unsourced and untagged.**

**Update note (2026-06-25):** 12 rows added for Management Action Records Reading Rule, person folder routing, evidence boundary, Rajiv/Admin [VERIFY] boundary, MD discussion notes relationship, Workflow Step 3 action records check, output field, wrapper required reading, wrapper check section, wrapper [VERIFY] preservation, and wrapper required output. All new rows confirmed against MGMT-ACTION-RECORDS-FOLDER, context/management-action-records-context.md, and intelligence-inbox/management-action-records/INDEX.md. Three additional [VERIFY] rows added for Rajiv/Admin boundary and escalation path items (covered by existing items 1–5; surfaced here for traceability). 12 [VERIFY] items in verify-register.md remain open — no items resolved by this update.

---
name: mayurika-hr-workbench
type: workbench
member: Mayurika / Mayuri
role: HR Officer
created: 2026-06-30
status: ACTIVE — Mayurika Reviewed 2026-07-03
source-boundary: SRC-MAYU-001, SRC-POLICY-001, SRC-MD-HR-001, SRC-STAFF-001, SRC-MAYU-CONF-002 through CONF-006
root-truth: CLAUDE.md — canonical; this file is a navigation pointer only
---

# Mayurika / Mayuri — HR Workbench

**Root Truth Rule:** This file is a workbench navigation guide. It does not replace CLAUDE.md. All authority, policy rules, and governance standards are defined in the root CLAUDE.md and registered sources. If this file contradicts CLAUDE.md, CLAUDE.md is correct.

**Pass/Fail Rule:** PASS if a clean LLM reading this file can navigate to the correct source for any HR process question without verbal explanation. FAIL if this file defines policy, resolves a [VERIFY] item, stores personal staff data, or can be misread as a standalone AIOS.

---

## 1. Purpose

This workbench surfaces what is confirmed and relevant for Mayurika's role as HR Officer within the Management AIOS. It provides pointers to sources, skills, context files, and the action record inbox — so Mayurika can operate her domain without reading the entire root document set every session.

This file does not restate policy. It tells you where to find it.

---

## 2. Role Boundary

**Role:** HR Officer
**Source authority:** SRC-MAYU-001 (primary), SRC-POLICY-001 (company policy), SRC-MD-HR-001 (MD governance directives)

**Mayurika is the primary custodian and write-authority for staff records.** This means she is the correct person to maintain employment status, dates, training logs, review schedules, and PDPA acknowledgement tracking for all active, probationary, on-leave, suspended, and departed employees.

**Confirmed authority lines** (SRC-MAYU-001):
- Monthly HR governance reporting to the MD
- Post-996-Project ROI monitoring coordination
- Twice-weekly Leadership Review co-facilitation with the Director
- EOD productivity monitoring for the Website Team and PH Team
- Critic Meeting co-facilitation with Muguntha and Jefri
- SKILL file compliance management for the Developer Team and Technical/N8N Team
- PDPA notice issuance and acknowledgement tracking
- Probation date monitoring and review schedule management
- Staff record lifecycle management (onboarding through departure)
- Month 6 handover receipt from Suman — writing recruitment_source_id and recruitment_promise_set_id into the staff record

For the full role detail, see: **CLAUDE.md §5 — Role Boundaries (Mayurika row)** and **context/hr-operations-context.md**.

---

## 3. What Mayurika Does NOT Write

The following are outside Mayurika's write-authority in this AIOS (SRC-MAYU-001):

| Item | Whose Authority |
|---|---|
| Canonical name spelling for staff records | Rajiv |
| Team structure data | Rajiv |
| Salary band information | Out of scope for this AIOS entirely |
| AXIOM band placements | Arun |

Mayurika submits AXIOM data to Arun weekly — she does not assign or write the band. If a workbench record or action record appears to assign an AXIOM band under Mayurika's name, it is an error.

---

## 4. HR Domain Areas — Pointer List

Each item below points to the correct source and context file. Do not treat these as standalone policy summaries.

| HR Area | Source ID | Context File | CLAUDE.md Section |
|---|---|---|---|
| Staff record governance | SRC-MAYU-001 | context/hr-operations-context.md §1 | §9.1 |
| PDPA tracking | SRC-MAYU-001 | context/hr-operations-context.md §2 | §9.2 |
| Review scheduling | SRC-MAYU-001 | context/hr-operations-context.md §3 | §9.3 |
| EOD productivity monitoring | SRC-MAYU-001, SRC-MD-HR-001 | context/hr-operations-context.md §4 | §9.4 |
| Critic Meeting management | SRC-MAYU-001 | context/hr-operations-context.md §5 | §9.5 |
| SKILL file compliance | SRC-MAYU-001 | context/hr-operations-context.md §6 | §9.6 |
| Technical Team ROI monitoring | SRC-MAYU-001 | context/hr-operations-context.md §7 | §9.7 |
| Leadership Review coordination | SRC-MAYU-001 | context/hr-operations-context.md §8 | §9.8 |
| Leave policy | SRC-POLICY-001 §6.0–6.5 | context/hr-operations-context.md §9 | §10.1 |
| Onboarding policy | SRC-POLICY-001 §3.0, §17.0 | — | §10.2 |
| Offboarding and termination | SRC-POLICY-001 §10.0–10.8 | context/hr-operations-context.md §9.6 | §10.3 |
| AI tools compliance | SRC-POLICY-001 §17.0 | — | §10.5 |
| LLM-queryable documentation standard | SRC-MD-HR-001 | context/hr-operations-context.md §10.1 | §11.1 |
| Task ID standard | SRC-MD-HR-001 | context/hr-operations-context.md §10.2 | §11.2 |
| New employee ROI monitoring | SRC-MD-HR-001 | context/hr-operations-context.md §10.9 | §11.6 |
| BGCT collection and folder consolidation | SRC-MD-HR-001 | context/hr-operations-context.md §10.13–§10.14 | §11.5 |
| Developer ROI review coordination | SRC-MD-HR-001 | context/hr-operations-context.md §10.10 | §11.14 |
| Active staff roster | SRC-STAFF-001, SRC-MAYU-CONF-002 through CONF-006 | — | evidence/source-register.md |
| Month 6 handover from Suman | SRC-MAYU-001, SRC-SUMAN-001-v2, SRC-SUMAN-CONF-002 | context/recruitment-context.md §11 | §8.11 |
| New Skill Learning Program (NSLP) — HR follow-up, verification, evidence, adoption tracking, reporting | SRC-MAYURIKA-NSLP-001 | context/hr-operations-context.md §11 | CLAUDE.md §5 updated 2026-07-06 — SRC-MAYURIKA-NSLP-001 |

---

## 5. Relevant Skills

These skills in the `skills/` folder are relevant to Mayurika's domain. They can be invoked in Claude to support HR process work:

| Skill | File | Primary Use |
|---|---|---|
| management-gap-detection | skills/management-gap-detection.md | Identify HR process gaps across the four confirmed problem areas |
| management-problem-analysis | skills/management-problem-analysis.md | Analyse a recorded management problem using action records evidence |
| policy-lookup | skills/policy-lookup.md | Look up leave, onboarding, offboarding, conduct, or AI tools policy from SRC-POLICY-001 |
| recruitment-quality-check | skills/recruitment-quality-check.md | Month 6 handover interface — Suman's process; Mayurika receives at handover |
| kpi-axiom-review-support | skills/kpi-axiom-review-support.md | Understand AXIOM data submission requirements; Mayurika's role is data submission only, not band placement |

Skill file updates require domain owner review. Do not edit skill files directly. Flag update candidates to Mareenraj (trainee/builder).

---

## 6. Action Record Inbox

Mayurika's action record inbox is:

`intelligence-inbox/management-action-records/mayurika-hr/`

Use this folder to document:
- MD discussion directions that should be tracked
- Management problems identified in the HR domain
- Actions taken on HR process gaps
- Follow-ups assigned
- Evidence that an action was taken

**Current records:** 1 record on file as of 2026-06-30 (status: OPEN).

**Filing rules:** See `handover/management-action-records-team-usage-guide.md` for the full guide, required fields, file naming, and templates.

**File naming format:** `YYYY-MM-DD_mayurika-hr_record-type_short-topic.md`

**Templates available:**
- `intelligence-inbox/management-action-records/templates/md-discussion-note-template.md`
- `intelligence-inbox/management-action-records/templates/problem-solution-action-record-template.md`

---

## 7. What Mayurika Can Maintain

The following can be maintained by Mayurika within this AIOS without further approval, as they are within her confirmed domain (SRC-MAYU-001):

- Creating action records in `intelligence-inbox/management-action-records/mayurika-hr/` using the correct templates and required fields
- Flagging [VERIFY] items that are candidates for resolution (she may confirm resolution; she does not self-approve it)
- Confirming staff roster data status and normalization, as she has done via SRC-MAYU-CONF-002 through CONF-006
- Routing review requests to the correct domain owner per CLAUDE.md §18
- Preparing daily/weekly checklists and HR process records

Technical support is required for:
- Committing files to the repository
- Updating `evidence/source-register.md`
- Editing context files (context/hr-operations-context.md, etc.)
- Updating CLAUDE.md
- Approving skill file changes

---

## 8. What Mayurika Must Not Maintain

Within this AIOS, Mayurika must not:

- Write or approve Admin Manager authority, escalation paths, or PRC role content — [VERIFY] items 1–5 pending SRC-ADMIN-001
- Assign AXIOM band placements to staff — Arun's authority
- Write canonical name spellings or team structure data — Rajiv's authority
- Store salary, bonus, or compensation data in any AIOS file
- Store individual staff medical, health, or leave medical details
- Store disciplinary case details beyond aggregate compliance rates
- Store personal candidate data, CV details, or salary information from recruitment records
- Resolve a [VERIFY] item unilaterally — resolution requires registered source evidence
- Self-approve skill file updates or promote content to parent AIOS truth

---

## 9. Sensitive HR Data Warning

This workbench and all files under `member-aios/mayurika-hr/` must follow the confidentiality rules in:
- **CLAUDE.md §6 — Confidentiality and Data Safety**
- **context/confidentiality-rules.md**

In practice, this means:
- Do not store individual staff names except where role identification is operationally required
- Do not store salary or compensation data (ever)
- Do not store PDPA personal data — Mayurika holds this under controlled access; it does not belong in this AIOS
- Do not store individual performance band scores — process-level and aggregate only
- Do not store individual health, medical, or grievance details

The active staff roster (SRC-STAFF-001) is sensitive raw data. Aggregate use only. Do not copy full name lists into any workbench file.

---

## 10. [VERIFY] Items Affecting Mayurika's Domain

The following [VERIFY] items from `context/verify-register.md` affect Mayurika's workbench. They must remain tagged until resolved through the standard process.

| # | [VERIFY] Item | Impact on Mayurika's Work | Source Needed |
|---|---|---|---|
| 6 | MD-specific requirements beyond Varmen relay | Final scope of Mayurika's HR responsibilities may change after MD review | Future MD interview / registered MD source |
| 7 | Final implementation scope | This workbench and all AIOS deliverables remain Foundation Draft v0.1 until MD review is complete | MD review meeting |
| 12 | Exact tool names for HR and EOD systems | Checklists use descriptive names for tools (e.g., "the EOD submission workspace") — tool names must not be stated as confirmed until Mayurika directly confirms them | Mayurika confirmation |

**To resolve [VERIFY] item 12:** Mayurika should confirm the exact names of the HR records system and the EOD dashboard she uses. Once confirmed, notify Mareenraj so the confirmation can be registered as a new source in `evidence/source-register.md`.

For the full [VERIFY] register, see `context/verify-register.md`.

---

## 11. Reviewer Routing

Per CLAUDE.md §18 (updated 2026-06-26):

| Content Type | Reviewer |
|---|---|
| This workbench file and HR domain checklists | Mayurika / Mayuri — confirms accuracy of HR process pointers |
| Action records in mayurika-hr/ inbox | Mayurika — reviews her own records before citing as approved |
| Month 6 handover interface | Suman (recruitment side) + Mayurika (HR receipt side) |
| AXIOM data submission questions | Arun — he is the band placement authority |
| Org structure, name spelling | Rajiv |
| Policy lookups (leave, onboarding, offboarding) | Mayurika confirms operational application; SRC-POLICY-001 is the source of truth |
| Skill file update candidates | Trainee prepares draft; Mayurika reviews HR-facing content; Arun reviews KPI-facing content |
| [VERIFY] item 12 resolution | Mayurika confirms tool names; trainee registers as source |
| Promotion to parent AIOS v0.2 | Mayurika sign-off for HR domain |

---

## 12. Queryability Test

A clean LLM reading this workbench should be able to answer:

| Question | Answerable from This File? |
|---|---|
| What is Mayurika's confirmed role and source authority? | YES — §2 |
| What HR areas does she manage? | YES — §4 (pointers to full detail) |
| What is she NOT allowed to write? | YES — §3, §8 |
| Which skills are relevant to her work? | YES — §5 |
| Where is her action record inbox? | YES — §6 |
| What can she maintain herself? | YES — §7 |
| What sensitive data rules apply? | YES — §9 |
| Which [VERIFY] items affect her domain? | YES — §10 |
| Who reviews her work? | YES — §11 |
| Where is the full HR policy detail? | YES — §4 pointers to CLAUDE.md §9–§11 and context/hr-operations-context.md |
| What is the root source of truth? | YES — Root Truth Rule header |

---

## 13. Next Step

**Mayurika review completed 2026-07-03 for WORKBENCH.md and quick-reference-sources.md.**

Evidence: `evidence/stakeholder-confirmations/mayurika-workbench-quick-reference-final-confirmation-2026-07-03.md`

**Checklist status:** `daily-weekly-checklist.md — ACTIVE — Mayurika confirmed replacement checklist 2026-07-02`

Evidence: `evidence/stakeholder-confirmations/mayurika-checklist-final-confirmation-2026-07-02.md`

**[VERIFY] item 12 resolution:** Exact tool names for the HR records system and EOD dashboard were not separately confirmed during this review. [VERIFY] item 12 remains open. If Mayurika separately confirms exact tool names, notify Mareenraj so the confirmation can be registered as a new source in `evidence/source-register.md`.

---

## 17. NSLP Final Integration Closure

**Validation:** `validation/hr-nslp-final-integration-closure-check-2026-07-06.md`

**Status:** PASS — ACTIVE — FINAL CLOSURE READY

**Latest commit:** `84810aa`

Full commit chain and evidence chain (Mayurika confirmation → MD approval → merge → queryability review → source registration → CLAUDE.md §5 update → operating pack build → dashboard build → operational acceptance) documented in the validation file above.

**Remaining limits:** No live automation approved; no real staff data storage approved; dashboard remains read-only.

**Next step:** Monitor real usage and collect change requests separately.

---

## 16. NSLP Control System Dashboard

**Dashboard location:** `web-view/index.html` — Mayurika HR tab — "NSLP Control System — Internal Build" section

**Source ID:** SRC-MAYURIKA-NSLP-001

**Operating pack:** `member-aios/mayurika-hr/nslp/`

**Validation:** `validation/hr-nslp-dashboard-control-system-check-2026-07-06.md`

**Status:** ACTIVE — MAYURIKA_OPERATIONAL_ACCEPTANCE_CONFIRMED

**Acceptance evidence:** `evidence/stakeholder-confirmations/mayurika-nslp-system-operational-acceptance-2026-07-06.md`

**Note:** Read-only preview only. Static HTML. No forms, no API, no fetch(), no database, no automation. All table rows use placeholders — no real staff data.

6 control tables in the dashboard:
1. NSLP Skill Register Control — Skill ID, BGCT doc, attendees, Action Plan Cards, status
2. Action Plan Card Follow-Up — per-participant tracking, evidence promised, due date
3. Before / After Evidence Tracker — evidence paths, measurement, HR verification result
4. 2-Week Evaluation Queue — outcome labels (SUCCESS STORY / NOT EFFECTIVE / FAILURE / UNSUSTAINED)
5. NSLP Exception Register Preview — all 7 exception types
6. Monthly NSLP Management Report Control — adoption rate, completion rates, exception count, business impact

**Next step:** Final coordinator/queryability acceptance, or close the NSLP integration chain as ACTIVE if the coordinator accepts.

---

## 15. NSLP Operating System Pack

**Source:** SRC-MAYURIKA-NSLP-001

**Folder:** `member-aios/mayurika-hr/nslp/`

**Status:** ACTIVE — MAYURIKA_OPERATIONAL_ACCEPTANCE_CONFIRMED

**Validation:** `validation/hr-nslp-system-pack-build-check-2026-07-06.md`

**Acceptance evidence:** `evidence/stakeholder-confirmations/mayurika-nslp-system-operational-acceptance-2026-07-06.md`

Templates in this folder are derived from HR.Mayu.Skill.md Section 9. They are documentation-only, placeholder-only, and not connected to any live system.

| Template | File | Purpose |
|---|---|---|
| Folder README | `nslp/README.md` | Index, source basis, safety boundaries |
| Operating Guide | `nslp/nslp-operating-guide-2026-07-06.md` | Full HR process guide — flow, responsibilities, rhythm, outcomes, boundaries |
| Register Template | `nslp/nslp-register-template-2026-07-06.md` | Master log — one row per participant per session |
| Action Plan Card Template | `nslp/nslp-action-plan-card-template-2026-07-06.md` | Per-participant card collected at session end |
| Before & After Evidence Template | `nslp/nslp-before-after-evidence-template-2026-07-06.md` | Evidence capture and HR verification record |
| 2-Week Evaluation Template | `nslp/nslp-2-week-evaluation-template-2026-07-06.md` | Formal 2-week evaluation — outcome label assigned |
| Exception Register Template | `nslp/nslp-exception-register-template-2026-07-06.md` | Tracks all 7 NSLP exception types |
| Management Report Template | `nslp/nslp-management-report-template-2026-07-06.md` | Monthly evidence-backed report to management |
| Query Pack | `nslp/nslp-query-pack-2026-07-06.md` | 8 reusable LLM queries for daily/weekly/monthly review |

**Next step:** Final coordinator/queryability acceptance.

---

## 14. Skill Update Candidates

The following skill update candidates have been created for Mayurika's domain. These are DRAFT files pending Mayurika / MD confirmation before merge into the raw HR skill file.

| Candidate | Path | Status | Created | Confirmation Evidence |
|---|---|---|---|---|
| New Skill Learning Program — HR Follow-up, Verification & Implementation Responsibility | `member-aios/mayurika-hr/skill-update-candidates/new-skill-learning-program-hr-update-candidate-2026-07-02.md` | MERGED_INTO_CANONICAL_HR_SKILL — 2026-07-06 | 2026-07-02 | `evidence/stakeholder-confirmations/mayurika-nslp-skill-update-candidate-confirmation-2026-07-06.md` |

**Rule:** These candidates do not update root AIOS truth. Raw HR.Mayu.Skill.md is not edited until MD/coordinator approves final merge. Validation: `validation/hr-nslp-skill-update-candidate-check.md`. Original request evidence: `evidence/stakeholder-confirmations/hr-nslp-md-update-request-2026-07-02.md`.

**NSLP Candidate — Merge Completed (2026-07-06):**

- **Candidate path:** `member-aios/mayurika-hr/skill-update-candidates/new-skill-learning-program-hr-update-candidate-2026-07-02.md`
- **Confirmation evidence:** `evidence/stakeholder-confirmations/mayurika-nslp-skill-update-candidate-confirmation-2026-07-06.md`
- **MD approval evidence:** `evidence/stakeholder-confirmations/mayurika-nslp-skill-merge-md-approval-2026-07-06.md`
- **Canonical target:** `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/HR.Mayu.Skill.md`
- **Validation:** `validation/hr-nslp-skill-merge-check-2026-07-06.md`
- **Status:** MERGED_INTO_CANONICAL_HR_SKILL
- **Result:** PASS — Section 9 appended; Known Limits block excluded; blocked files untouched
- **Queryability review:** `validation/hr-nslp-section-9-queryability-review-2026-07-06.md` — PASS (AMBER for source-register only); all 12 queryability questions answerable from saved files; 2026-07-06
- **Source ID:** SRC-MAYURIKA-NSLP-001 — registered in `evidence/source-register.md` 2026-07-06
- **Context file:** `context/hr-operations-context.md` §11 — NSLP section added 2026-07-06
- **Status:** REGISTERED_CANONICAL_SECTION
- **CLAUDE.md §5 updated:** 2026-07-06 — NSLP responsibility and SRC-MAYURIKA-NSLP-001 added to Mayurika role row. Validation: `validation/hr-nslp-claude-role-update-check-2026-07-06.md`
- **Status:** CLAUDE_ROLE_REFERENCE_UPDATED
- **Source-register:** Already completed in commit 2c0bbce — no further source-register change required
- **Next step:** Final coordinator/queryability acceptance

---
name: mayurika-hr-quick-reference-sources
type: quick-reference
member: Mayurika / Mayuri
role: HR Officer
created: 2026-06-30
status: ACTIVE — Mayurika Reviewed 2026-07-03
root-truth: CLAUDE.md — canonical; this file is a pointer index only
---

# Mayurika / Mayuri — Quick Reference: Sources, Context, Skills, Records

**Purpose:** This file lists the sources, context files, skills, and action record folder relevant to Mayurika's HR domain. It does not reproduce source content. It tells you where to find things.

**Root Truth Rule:** All source content lives in `intelligence-inbox/raw-stakeholder-documents/`. All authority rules live in CLAUDE.md. This file is a navigation index only.

---

## Source IDs Relevant to Mayurika

| Source ID | File Path | What It Covers for Mayurika | Status |
|---|---|---|---|
| SRC-MAYU-001 | `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/HR.Mayu.Skill.md` | All confirmed HR responsibilities — staff records, PDPA, AXIOM data submission, EOD monitoring, Critic Meeting, SKILL compliance, Leadership Review, ROI monitoring, probation date monitoring, Month 6 handover receipt | READY |
| SRC-MAYU-002 | `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/digitweb_org_chart.jpg` | Organisation chart — team structure reference (image) | READY |
| SRC-POLICY-001 | `intelligence-inbox/raw-stakeholder-documents/company-policy/Draft DIGIT WEB LANKA - Company Policy Manual.md` | Leave policy (§6.0–6.5); onboarding (§3.0, §17.0); offboarding and termination (§10.0–10.8); workplace conduct (§4.0–4.1); AI tools mandatory compliance (§17.0); working hours (§16.0); salary confidentiality (§2.0) | READY — Final Approved |
| SRC-MD-HR-001 | `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & HR Discussion Notes.md` | LLM-queryable standard; Task ID standard; requirement documentation governance; verbal-to-documented conversion rule; 85% specification rule; daily 10% business logic validation; new employee ROI monitoring; BGCT collection; management folder consolidation; developer ROI review process; Technical Team stand-up governance; lessons learned documentation | READY — Varmen Reviewed 2026-06-25 |
| SRC-STAFF-001 | `intelligence-inbox/raw-stakeholder-documents/staff-data/Digitweblanka Staffs Data - Overall Staffs.csv` | Active staff roster (sensitive raw data — aggregate use only; 125 active rows confirmed by Mayurika 2026-06-26) | READY — HR-Confirmed Active |
| SRC-MAYU-CONF-002 | `evidence/stakeholder-confirmations/mayurika-active-staff-roster-confirmation-2026-06-26.md` | Mayurika's confirmation that SRC-STAFF-001 CSV contains active staff only | READY |
| SRC-MAYU-CONF-003 | `evidence/stakeholder-confirmations/mayurika-department-canonical-name-confirmation-2026-06-26.md` | eBay and Technical Team canonical name confirmation | READY |
| SRC-MAYU-CONF-004 | `evidence/stakeholder-confirmations/mayurika-department-canonical-confirmation-batch-2026-06-26.md` | Batch confirmation of 19 department/team variant groups; PH canonical mapping; DWL 151 correction | READY (Amazon group row superseded by SRC-MAYU-CONF-005) |
| SRC-MAYU-CONF-005 | `evidence/stakeholder-confirmations/mayurika-department-final-casing-and-amazon-correction-2026-06-26.md` | Amazon and Amazon PPC confirmed as separate normalized values — supersedes Amazon row in CONF-004 | READY |
| SRC-MAYU-CONF-006 | `evidence/stakeholder-confirmations/mayurika-department-final-casing-confirmation-2026-06-26.md` | Final display-name/casing confirmed for all 13 pending department/team labels | READY |
| MGMT-ACTION-RECORDS-FOLDER | `intelligence-inbox/management-action-records/` | Ongoing management action records inbox — Mayurika's subfolder is `mayurika-hr/` | ACTIVE |
| NSLP Skill Update Candidate | `member-aios/mayurika-hr/skill-update-candidates/new-skill-learning-program-hr-update-candidate-2026-07-02.md` | NSLP HR skill update candidate — Mayurika confirmed correct 2026-07-06; merged into canonical HR skill file 2026-07-06 | MERGED_INTO_CANONICAL_HR_SKILL |
| NSLP Confirmation Evidence | `evidence/stakeholder-confirmations/mayurika-nslp-skill-update-candidate-confirmation-2026-07-06.md` | Mayurika confirmation record for NSLP skill update candidate — 2026-07-06 | READY — Mayurika Confirmed 2026-07-06 |
| NSLP MD Approval Evidence | `evidence/stakeholder-confirmations/mayurika-nslp-skill-merge-md-approval-2026-07-06.md` | MD approval evidence for NSLP Section 9 merge into HR.Mayu.Skill.md — user statement 2026-07-06 | MD_APPROVED_FOR_CANONICAL_HR_SKILL_MERGE |
| NSLP Merge Canonical Target | `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/HR.Mayu.Skill.md` | Canonical HR skill file — Section 9 (NSLP) appended 2026-07-06; Known Limits block excluded | MERGED — Section 9 added 2026-07-06 |
| NSLP Merge Validation | `validation/hr-nslp-skill-merge-check-2026-07-06.md` | Validation record for NSLP Section 9 merge — 2026-07-06 | PASS |
| NSLP Queryability Review | `validation/hr-nslp-section-9-queryability-review-2026-07-06.md` | Queryability review — all 12 questions YES; 2026-07-06 | PASS — AMBER for source-register resolved 2026-07-06 |
| SRC-MAYURIKA-NSLP-001 | `evidence/source-register.md` — entry row for SRC-MAYURIKA-NSLP-001 | Registered source ID for NSLP Section 9 in HR.Mayu.Skill.md — full evidence chain linked; 2026-07-06 | READY — Registered 2026-07-06 |
| NSLP Context Entry | `context/hr-operations-context.md` §11 | Process-level summary of NSLP HR responsibilities — sourced from SRC-MAYURIKA-NSLP-001; 2026-07-06 | READY — Added 2026-07-06 |

---

## Known Source Limits

| Limit | Detail |
|---|---|
| SRC-STAFF-001 sensitivity | Raw staff data; contains names, locations, designations — aggregate use only; do not copy full staff name lists into any workbench or summary file |
| SRC-MD-HR-001 sensitivity | Contains individual staff names in operational context; do not copy individual names or performance case references into workbench files; process-level extraction only |
| SRC-ADMIN-001 — PENDING | Admin Manager source not yet received. Admin Manager authority, PRC role, and escalation paths cannot be confirmed. [VERIFY] items 1–5 remain open. Do not infer Admin Manager content from any other source. |
| [VERIFY] item 12 — tool names | Exact HR records system name and EOD dashboard name are not confirmed as of 2026-06-30. Checklists use descriptive language. Resolve by asking Mayurika to name the tools directly. |

---

## Relevant Context Files

| File | What It Provides |
|---|---|
| `context/hr-operations-context.md` | Full process-level detail for all Mayurika HR responsibilities — staff records, PDPA, review scheduling, EOD monitoring, Critic Meeting, SKILL compliance, ROI monitoring, Leadership Review, leave policy, MD governance directives |
| `context/confidentiality-rules.md` | Forbidden data types, permissible data categories, PDPA note, access control requirement |
| `context/verify-register.md` | All 12 open [VERIFY] items — check here before actioning any item that might touch an unresolved area |
| `context/management-action-records-context.md` | Reading rules for the action records inbox — when to use it, what records can and cannot prove |
| `context/recruitment-context.md` | Relevant for Month 6 handover from Suman — understand what Suman hands over before Mayurika writes it into the staff record |
| `context/organization-structure.md` | Role hierarchy and authority lines — useful when a record involves cross-role coordination |

---

## Relevant Skills

| Skill | Path | When to Use |
|---|---|---|
| management-gap-detection | `skills/management-gap-detection.md` / `.claude/skills/management-gap-detection/SKILL.md` | Identifying HR process gaps — onboarding, leave, KPI meetings, file organisation |
| management-problem-analysis | `skills/management-problem-analysis.md` / `.claude/skills/management-problem-analysis/SKILL.md` | Analysing a specific management problem using action records from `mayurika-hr/` inbox |
| policy-lookup | `skills/policy-lookup.md` / `.claude/skills/policy-lookup/SKILL.md` | Looking up leave policy, onboarding rules, offboarding procedures, AI tools compliance, conduct rules |
| recruitment-quality-check | `skills/recruitment-quality-check.md` / `.claude/skills/recruitment-quality-check/SKILL.md` | Understanding the Month 6 handover process Suman follows before Mayurika receives it |
| kpi-axiom-review-support | `skills/kpi-axiom-review-support.md` / `.claude/skills/kpi-axiom-review-support/SKILL.md` | Understanding AXIOM data submission requirements — Mayurika's role is data submission to Arun, not band placement |

---

## Action Record Inbox

| Folder | `intelligence-inbox/management-action-records/mayurika-hr/` |
|---|---|
| Purpose | Ongoing HR process records, problem/solution records, MD discussion records |
| Current records | 1 record on file as of 2026-06-30 — 2026-06-22 MD discussion (OPEN) |
| Templates | `intelligence-inbox/management-action-records/templates/` |
| Naming rule | `YYYY-MM-DD_mayurika-hr_record-type_short-topic.md` |
| Usage guide | `handover/management-action-records-team-usage-guide.md` |
| Index | `intelligence-inbox/management-action-records/INDEX.md` |

---

## [VERIFY] Items Currently Open for Mayurika's Domain

| # | Item | Action Needed |
|---|---|---|
| 6 | MD-specific requirements beyond Varmen relay | Await MD review meeting; do not treat current workbench as final scope |
| 7 | Final implementation scope | Workbench remains Foundation Draft v0.1 |
| 12 | Exact HR and EOD tool names | Mayurika to confirm tool names; notify Mareenraj to register as new source |

All three items must remain tagged [VERIFY] until the resolution conditions in `context/verify-register.md` are met.

---

## NSLP Control System Dashboard

| Item | Detail |
|---|---|
| Dashboard | `web-view/index.html` — Mayurika HR tab — "NSLP Control System — Internal Build" |
| Source | SRC-MAYURIKA-NSLP-001 |
| Operating pack | `member-aios/mayurika-hr/nslp/` |
| Dashboard validation | `validation/hr-nslp-dashboard-control-system-check-2026-07-06.md` |
| Status | ACTIVE — MAYURIKA_OPERATIONAL_ACCEPTANCE_CONFIRMED |
| Acceptance evidence | `evidence/stakeholder-confirmations/mayurika-nslp-system-operational-acceptance-2026-07-06.md` |
| Note | Read-only static HTML preview. 6 control tables. No real staff data. No automation. |

---

## NSLP Operating System Pack — Template Pointers

Built from SRC-MAYURIKA-NSLP-001. All files are documentation-only, placeholder-only. Status: ACTIVE — MAYURIKA_OPERATIONAL_ACCEPTANCE_CONFIRMED. Acceptance evidence: `evidence/stakeholder-confirmations/mayurika-nslp-system-operational-acceptance-2026-07-06.md`.

| File | Path | Purpose |
|---|---|---|
| NSLP Folder README | `member-aios/mayurika-hr/nslp/README.md` | Index, source basis, safety boundaries |
| NSLP Operating Guide | `member-aios/mayurika-hr/nslp/nslp-operating-guide-2026-07-06.md` | Full HR process guide — flow, responsibilities, rhythm, outcome labels, boundaries |
| NSLP Register Template | `member-aios/mayurika-hr/nslp/nslp-register-template-2026-07-06.md` | Master register — one row per participant per session |
| Action Plan Card Template | `member-aios/mayurika-hr/nslp/nslp-action-plan-card-template-2026-07-06.md` | Per-participant card collected before session end |
| Before & After Evidence Template | `member-aios/mayurika-hr/nslp/nslp-before-after-evidence-template-2026-07-06.md` | Evidence capture and HR verification record |
| 2-Week Evaluation Template | `member-aios/mayurika-hr/nslp/nslp-2-week-evaluation-template-2026-07-06.md` | Formal 2-week evaluation — outcome label assigned |
| Exception Register Template | `member-aios/mayurika-hr/nslp/nslp-exception-register-template-2026-07-06.md` | Tracks all 7 NSLP exception types |
| Management Report Template | `member-aios/mayurika-hr/nslp/nslp-management-report-template-2026-07-06.md` | Monthly evidence-backed report to management |
| Query Pack | `member-aios/mayurika-hr/nslp/nslp-query-pack-2026-07-06.md` | 8 reusable LLM queries for daily/weekly/monthly NSLP review |
| Pack Build Validation | `validation/hr-nslp-system-pack-build-check-2026-07-06.md` | PASS — Mayurika operationally accepted 2026-07-06 |

---

## Pass/Fail Rule

PASS if a reader can locate the correct source, context file, skill, or inbox for any Mayurika HR domain question without verbal guidance.

FAIL if any entry in this file copies source content, states a [VERIFY] item as resolved, stores personal staff data, or implies policy authority from a non-registered source.

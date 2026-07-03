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

## Pass/Fail Rule

PASS if a reader can locate the correct source, context file, skill, or inbox for any Mayurika HR domain question without verbal guidance.

FAIL if any entry in this file copies source content, states a [VERIFY] item as resolved, stores personal staff data, or implies policy authority from a non-registered source.

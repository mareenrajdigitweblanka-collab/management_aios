---
name: arun-implementation-quick-reference-sources
type: quick-reference
member: Arun
role: Implementation Officer
created: 2026-06-30
status: DRAFT — Pending Arun review
root-truth: CLAUDE.md — canonical; this file is a pointer index only
---

# Arun — Quick Reference: Sources, Context, Skills, Records

**Purpose:** This file lists the sources, context files, skills, and action record folder relevant to Arun's KPI, AXIOM, and implementation domain. It does not reproduce source content. It tells you where to find things.

**Root Truth Rule:** All source content lives in `intelligence-inbox/raw-stakeholder-documents/`. All authority rules live in CLAUDE.md. This file is a navigation index only.

---

## Source IDs Relevant to Arun

| Source ID | File Path | What It Covers for Arun | Status |
|---|---|---|---|
| SRC-ARUN-001 | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/KPI Definitions, AXIOM Band Placement, Review Input_Output & Management Tracking Framework.md` | KPI definitions per team; AXIOM band placement authority and band tables; KPI detection criteria; review inputs and outputs; weekly AXIOM workflow; incident management (time-based and count-based); PRC governance and membership; bonus eligibility conditions; management dashboard requirements | READY |
| SRC-ARUN-002 | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/my day check list-arun - shedule.csv` | Daily operational schedule and checklist across teams | READY |
| SRC-MD-ARUN-001 | `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & Arun Discussion Notes.md` | KPI meeting format and governance; meeting ID system; bonus queryability evaluation framework; technical team escalation standard; BGCT documentation hierarchy (four-step: BGCT → Handbook → Skill file → Rule book); developer ROI review process | READY — Varmen Reviewed by project default 2026-06-26 |
| MGMT-ACTION-RECORDS-FOLDER | `intelligence-inbox/management-action-records/` | Ongoing management action records inbox — Arun's subfolder is `arun-implementation/` | ACTIVE |

---

## Known Source Limits

| Limit | Detail |
|---|---|
| SRC-MD-ARUN-001 sensitivity | Contains individual staff names in operational context and individual performance references (08/08/2025 entry) — do not copy personal case details or individual performance references; process-level extraction only |
| SRC-ARUN-001 — [VERIFY] items 8, 9, 10 | Three wording items in SRC-ARUN-001 remain unconfirmed: Amazon ACOS threshold direction, Operational Manager PRC membership, ROI Officer identity — see `member-aios/arun-implementation/verify-items-arun.md` |
| SRC-MD-ARUN-001 — bonus queryability soft conflict | Bonus queryability framework (§11.11) extends §7.9 bonus conditions — relationship between the two requires Varmen confirmation; see `validation/md-arun-discussion-conflict-check.md` |
| SRC-ADMIN-001 — PENDING | Admin Manager PRC role and authority cannot be confirmed. [VERIFY] items 1–5 remain open. PRC composition is incomplete. Do not infer Admin Manager content from any source. |

---

## Relevant Context Files

| File | What It Provides |
|---|---|
| `context/kpi-axiom-context.md` | Full process-level detail for all KPI, AXIOM, incident management, PRC, bonus, dashboard, KPI meeting governance, and bonus queryability rules |
| `context/confidentiality-rules.md` | Forbidden data types — individual AXIOM scores by name, disciplinary case narratives, salary/bonus amounts all forbidden |
| `context/verify-register.md` | All 12 open [VERIFY] items — items 8, 9, 10 are Arun-specific and can be resolved by Arun's direct confirmation |
| `context/management-action-records-context.md` | Reading rules for the action records inbox — when to use it, what records can and cannot prove |
| `context/hr-operations-context.md` | Relevant for developer ROI review coordination — Mayurika coordinates validation process (SRC-MD-HR-001 §11.14) |

---

## Relevant Skills

| Skill | Path | When to Use |
|---|---|---|
| kpi-axiom-review-support | `skills/kpi-axiom-review-support.md` | KPI risk detection, AXIOM band review, incident escalation, bonus eligibility checking |
| management-gap-detection | `skills/management-gap-detection.md` | Identifying KPI meeting irregularities, management file gaps, incident tracking gaps |
| management-problem-analysis | `skills/management-problem-analysis.md` | Analysing a specific KPI, incident, or implementation problem using action records |
| policy-lookup | `skills/policy-lookup.md` | AI tools mandatory compliance (§17.0); workplace conduct (§4.0–4.1) |

**Pending skill update recommendations:** See `validation/md-discussion-skill-impact-check.md` for recommendations arising from SRC-MD-ARUN-001 ingestion. Skill file updates require domain owner (Arun) review before applying.

---

## Action Record Inbox

| Folder | `intelligence-inbox/management-action-records/arun-implementation/` |
|---|---|
| Purpose | KPI tracking records, AXIOM review records, incident management records, dashboard records, daily checklist records |
| Current records | 0 records on file as of 2026-06-30 |
| Templates | `intelligence-inbox/management-action-records/templates/` |
| Naming rule | `YYYY-MM-DD_arun-implementation_record-type_short-topic.md` |
| Usage guide | `handover/management-action-records-team-usage-guide.md` |
| Index | `intelligence-inbox/management-action-records/INDEX.md` |

**[VERIFY] note for inbox records:** Records touching Amazon ACOS threshold wording, Operational Manager PRC role, or ROI Officer title must preserve [VERIFY] tags until Arun directly confirms. See `member-aios/arun-implementation/verify-items-arun.md`.

---

## Validation References

| File | What It Documents |
|---|---|
| `validation/md-arun-discussion-source-ingestion-check.md` | SRC-MD-ARUN-001 ingestion check — what was extracted and how |
| `validation/md-arun-discussion-impact-map.md` | Full impact map of SRC-MD-ARUN-001 on CLAUDE.md and context files |
| `validation/md-arun-discussion-conflict-check.md` | Soft conflict #1 — bonus queryability vs §7.9 bonus conditions |
| `validation/md-arun-discussion-ingestion-final-report.md` | Final ingestion report for SRC-MD-ARUN-001 |
| `member-aios/arun-implementation/verify-items-arun.md` | Three open [VERIFY] items specific to Arun's domain — full detail and resolution process |

---

## [VERIFY] Items Currently Open for Arun's Domain

| # | Item | Action Needed |
|---|---|---|
| 8 | Amazon ACOS threshold wording | Arun to confirm exact threshold direction — can resolve by direct statement |
| 9 | Operational Manager PRC membership | Arun to confirm PRC membership and scope — can resolve by direct statement |
| 10 | ROI Officer identity / title | Arun to confirm whether distinct role or existing title — can resolve by direct statement (VERIFY Resolved Candidate exists from SRC-MD-SUMAN-001) |
| 6 | MD-specific requirements beyond Varmen relay | Await MD review meeting |
| 7 | Final implementation scope | Workbench remains Foundation Draft v0.1 |

**Items 8, 9, and 10 can be resolved by Arun's direct confirmation.** Once confirmed, notify Mareenraj who will register the confirmation in `evidence/source-register.md`.

For full [VERIFY] register, see `context/verify-register.md`.

---

## Pass/Fail Rule

PASS if a reader can locate the correct source, context file, skill, or inbox for any Arun KPI/implementation domain question without verbal guidance.

FAIL if any entry in this file copies source content, states a [VERIFY] item as resolved, stores individual staff performance data by name, or implies policy authority from a non-registered source.

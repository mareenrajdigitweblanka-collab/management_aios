---
name: arun-implementation-workbench
type: workbench
member: Arun
role: Implementation Officer
created: 2026-06-30
status: DRAFT — Pending Arun review
source-boundary: SRC-ARUN-001, SRC-ARUN-002, SRC-MD-ARUN-001
root-truth: CLAUDE.md — canonical; this file is a navigation pointer only
---

# Arun — Implementation Workbench

**Root Truth Rule:** This file is a workbench navigation guide. It does not replace CLAUDE.md. All authority, policy rules, and governance standards are defined in the root CLAUDE.md and registered sources. If this file contradicts CLAUDE.md, CLAUDE.md is correct.

**Pass/Fail Rule:** PASS if a clean LLM reading this file can navigate to the correct source for any KPI, AXIOM, incident management, or implementation question without verbal explanation. FAIL if this file defines performance rules, resolves a [VERIFY] item, stores individual staff performance data, or can be misread as a standalone AIOS.

---

## 1. Purpose

This workbench surfaces what is confirmed and relevant for Arun's role as Implementation Officer within the Management AIOS. It provides pointers to sources, skills, context files, and the action record inbox — so Arun can operate the KPI, AXIOM, ROI, and implementation domain without reading the entire root document set every session.

This file does not restate performance rules. It tells you where to find them.

---

## 2. Role Boundary

**Role:** Implementation Officer
**Source authority:** SRC-ARUN-001 (primary — KPI definitions, AXIOM framework, incident management, PRC, dashboard), SRC-ARUN-002 (daily operational schedule), SRC-MD-ARUN-001 (MD governance directives — KPI meeting format, meeting ID system, bonus queryability, BGCT hierarchy, developer ROI review — Varmen Reviewed by project default 2026-06-26)

**Confirmed authority lines** (SRC-ARUN-001, SRC-ARUN-002):
- KPI definitions per role and team
- AXIOM band placement (sole authority for band assignment)
- Weekly AXIOM data processing
- Incident escalation management
- PRC membership and participation
- Management dashboard requirements
- Daily operational checklist across teams
- KPI meeting governance and format compliance (SRC-MD-ARUN-001)
- Meeting ID system management (SRC-MD-ARUN-001)
- Technical team escalation standard (SRC-MD-ARUN-001)
- Developer ROI review process coordination (SRC-MD-ARUN-001)

**[VERIFY] on detailed authority limits:** Arun's authority limits beyond KPI and AXIOM scope are not yet fully documented — see CLAUDE.md §5 [VERIFY] note for Arun. Do not assume authority over areas not listed above.

For full role detail, see: **CLAUDE.md §5 — Role Boundaries (Arun row)**, **CLAUDE.md §7 — KPI / AXIOM Context**, and **context/kpi-axiom-context.md**.

---

## 3. What Arun Does NOT Write

| Item | Whose Authority |
|---|---|
| Staff record maintenance and PDPA tracking | Mayurika |
| Canonical name spelling for staff records | Rajiv |
| Team structure data | Rajiv |
| Salary band information | Out of scope for this AIOS entirely |
| Recruitment pipeline and probation reviews | Suman |
| Admin Manager escalation paths | [VERIFY] pending SRC-ADMIN-001 |

Mayurika submits AXIOM data to Arun weekly — she does not assign or write band placements. Arun holds sole authority for AXIOM band placement. If a workbench record or action record appears to assign an AXIOM band under another person's name, it is an error.

---

## 4. KPI / Implementation Domain Areas — Pointer List

Each item below points to the correct source and context file. Do not treat these as standalone performance rule summaries.

| Domain Area | Source ID | Context File | CLAUDE.md Section |
|---|---|---|---|
| KPI definitions by team | SRC-ARUN-001 | context/kpi-axiom-context.md §1 | §7.1 |
| AXIOM band placement | SRC-ARUN-001 | context/kpi-axiom-context.md §2 | §7.2 |
| KPI detection criteria (risk triggers) | SRC-ARUN-001 | context/kpi-axiom-context.md §3 | §7.3 |
| Review inputs | SRC-ARUN-001 | context/kpi-axiom-context.md §4 | §7.4 |
| Review outputs | SRC-ARUN-001 | context/kpi-axiom-context.md §5 | §7.5 |
| Weekly AXIOM workflow | SRC-ARUN-001 | context/kpi-axiom-context.md §6 | §7.6 |
| Incident management — time-based escalation | SRC-ARUN-001 | context/kpi-axiom-context.md §7 | §7.7 |
| Incident management — count-based escalation | SRC-ARUN-001 | context/kpi-axiom-context.md §7 | §7.7 |
| PRC governance and membership | SRC-ARUN-001 | context/kpi-axiom-context.md §8 | §7.8 |
| Bonus eligibility conditions | SRC-ARUN-001 | context/kpi-axiom-context.md §9 | §7.9 |
| Management dashboard requirements | SRC-ARUN-001 | context/kpi-axiom-context.md §10 | §7.10 |
| KPI meeting format and governance | SRC-MD-ARUN-001 | context/kpi-axiom-context.md §11 | §11.9 |
| Meeting ID system | SRC-MD-ARUN-001 | context/kpi-axiom-context.md — | §11.10 |
| Bonus queryability evaluation framework | SRC-MD-ARUN-001 | context/kpi-axiom-context.md §12 | §11.11 |
| Technical team escalation standard | SRC-MD-ARUN-001 | — | §11.12 |
| BGCT documentation hierarchy | SRC-MD-ARUN-001 | — | §11.13 |
| Developer ROI review process | SRC-MD-ARUN-001 | — | §11.14 |
| Daily operational schedule | SRC-ARUN-002 | — | — |

**[VERIFY] items affecting this pointer list:** See §10 of this workbench and `member-aios/arun-implementation/verify-items-arun.md` for the three open Arun [VERIFY] items.

---

## 5. Relevant Skills

| Skill | File | Primary Use |
|---|---|---|
| kpi-axiom-review-support | skills/kpi-axiom-review-support.md | KPI detection, AXIOM band review, incident escalation decisions, bonus eligibility checks |
| management-gap-detection | skills/management-gap-detection.md | Identify KPI meeting irregularities, management file gaps, incident tracking gaps |
| management-problem-analysis | skills/management-problem-analysis.md | Analyse a recorded KPI, incident, or implementation problem using action records evidence |
| policy-lookup | skills/policy-lookup.md | Look up AI tools mandatory compliance (§17.0), workplace conduct (§4.0–4.1) |

Skill file updates require domain owner review. Do not edit skill files directly. Flag update candidates to Mareenraj (trainee/builder). See `validation/md-discussion-skill-impact-check.md` for pending skill update recommendations relevant to Arun's domain.

---

## 6. Action Record Inbox

Arun's action record inbox is:

`intelligence-inbox/management-action-records/arun-implementation/`

Use this folder to document:
- MD discussion directions that should be tracked
- KPI or AXIOM process gaps identified
- Incident escalation records
- PRC action records
- Dashboard requirement records
- Daily checklist follow-up records

**Current records:** 0 records on file as of 2026-06-30.

**Filing rules:** See `handover/management-action-records-team-usage-guide.md` for the full guide, required fields, file naming, and templates.

**File naming format:** `YYYY-MM-DD_arun-implementation_record-type_short-topic.md`

**Templates available:**
- `intelligence-inbox/management-action-records/templates/md-discussion-note-template.md`
- `intelligence-inbox/management-action-records/templates/problem-solution-action-record-template.md`

**[VERIFY] note for inbox records:** Any record from Arun touching Amazon ACOS threshold wording, Operational Manager PRC role, or ROI Officer title must preserve [VERIFY] tags until Arun directly confirms. See `member-aios/arun-implementation/verify-items-arun.md` and `context/verify-register.md` items 8, 9, 10.

---

## 7. What Arun Can Maintain

The following can be maintained by Arun within this AIOS without further approval, as they are within his confirmed domain:

- Creating action records in `intelligence-inbox/management-action-records/arun-implementation/` using the correct templates and required fields
- Documenting weekly AXIOM processing and KPI review records at process level
- Flagging [VERIFY] items that are candidates for resolution — particularly items 8, 9, 10 in `context/verify-register.md` which require Arun's direct confirmation
- Routing review requests to the correct domain owner per CLAUDE.md §18
- Preparing KPI analysis and dashboard records at process and aggregate level

Technical support is required for:
- Committing files to the repository
- Updating `evidence/source-register.md`
- Editing context files (context/kpi-axiom-context.md, etc.)
- Updating CLAUDE.md
- Approving skill file changes

---

## 8. What Arun Must Not Maintain

Within this AIOS, Arun must not:

- Store individual staff AXIOM performance band scores by name — aggregate and process-level only
- Write or approve Admin Manager authority, escalation paths, or PRC role content — [VERIFY] items 1–5 pending SRC-ADMIN-001
- Write canonical name spellings or team structure data — Rajiv's authority
- Store salary, bonus, or compensation data in any AIOS file
- Resolve a [VERIFY] item unilaterally — resolution requires registered source evidence and domain owner confirmation
- Self-approve skill file updates or promote content to parent AIOS truth
- Treat the bonus queryability framework (SRC-MD-ARUN-001 §12) as a definitively integrated additional condition to the §9 bonus eligibility conditions until Varmen confirmation is received — see `validation/md-arun-discussion-conflict-check.md` soft conflict #1

---

## 9. Sensitive Data Warning

This workbench and all files under `member-aios/arun-implementation/` must follow the confidentiality rules in:
- **CLAUDE.md §6 — Confidentiality and Data Safety**
- **context/confidentiality-rules.md**

**SRC-MD-ARUN-001 sensitivity note (from evidence/source-register.md):** The source document contains individual staff names in operational context and individual performance references (08/08/2025 entry). Do not copy personal case details or individual performance references to workbench or context files. Process-level extraction only.

In practice:
- Use role-level or team-level references for performance data, not individual staff names
- Do not store individual AXIOM scores — aggregate and process-level only
- Do not store individual incident case narratives — aggregate compliance rates and process status only
- Do not store salary or bonus amounts

---

## 10. [VERIFY] Items Affecting Arun's Domain

The following [VERIFY] items from `context/verify-register.md` affect Arun's workbench. They must remain tagged until resolved through the standard process.

| # | [VERIFY] Item | Impact on Arun's Work | Action Needed |
|---|---|---|---|
| 8 | Amazon ACOS threshold wording | ACOS trigger in KPI detection criteria (CLAUDE.md §7.3) has unclear threshold direction — cannot be used as confirmed rule until Arun confirms | Arun to confirm exact wording: "Amazon ACOSBelow 25%" — direction and intended threshold |
| 9 | Operational Manager PRC membership and scope | PRC composition table (CLAUDE.md §7.8) lists Operational Manager — role not yet independently confirmed | Arun to confirm Operational Manager PRC membership and scope of participation |
| 10 | ROI Officer identity / title in review inputs | Review inputs (CLAUDE.md §7.4) list "ROI officer feed back" — distinct role or existing title? | Arun to confirm directly. Note: VERIFY Resolved Candidate from SRC-MD-SUMAN-001 identifies ROI Officers as Arun and Mayurika jointly — [VERIFY] tag must remain until Arun directly confirms |
| 6 | MD-specific requirements beyond Varmen relay | Final scope of Arun's implementation responsibilities may change after MD review | Await MD review meeting |
| 7 | Final implementation scope | This workbench remains Foundation Draft v0.1 until MD review is complete | MD review meeting |

**Arun can resolve items 8, 9, and 10 by direct confirmation.** These do not require a formal document source — a confirmed verbal or written statement from Arun, registered by Mareenraj, is sufficient. See `member-aios/arun-implementation/verify-items-arun.md` for the full item detail and resolution process.

For the full [VERIFY] register, see `context/verify-register.md`.

---

## 11. Reviewer Routing

Per CLAUDE.md §18 (updated 2026-06-26):

| Content Type | Reviewer |
|---|---|
| This workbench file and KPI/AXIOM domain checklists | Arun — confirms accuracy of KPI and implementation process pointers |
| Action records in arun-implementation/ inbox | Arun — reviews his own records before citing as approved |
| [VERIFY] items 8, 9, 10 | Arun — direct confirmation required to resolve |
| 180-day handover — Arun's participation | Arun (attendee); Mayurika (HR receipt); Suman (handover preparation) |
| Staff record questions | Mayurika |
| Policy lookups (conduct, AI tools) | SRC-POLICY-001; Arun confirms operational application |
| Skill file update candidates | Trainee prepares draft; Arun reviews KPI/implementation-facing content |
| Bonus queryability soft conflict | Varmen confirmation recommended before treating §11.11 as mandatory additional eligibility condition |
| Promotion to parent AIOS v0.2 | Arun sign-off for KPI/AXIOM domain |

---

## 12. Queryability Test

A clean LLM reading this workbench should be able to answer:

| Question | Answerable from This File? |
|---|---|
| What is Arun's confirmed authority within this AIOS? | YES — §2 |
| What KPI and AXIOM areas does he manage? | YES — §4 (pointers to full detail) |
| What is he NOT allowed to write? | YES — §3, §8 |
| Which skills are relevant to his work? | YES — §5 |
| Where is the action record inbox? | YES — §6 |
| What [VERIFY] items need his direct confirmation? | YES — §10 |
| Who reviews Arun's work? | YES — §11 |
| Where is the full KPI/AXIOM detail? | YES — §4 pointers to CLAUDE.md §7 and context/kpi-axiom-context.md |
| What is the root source of truth? | YES — Root Truth Rule header |

---

## 13. Known Limits

- This workbench is DRAFT. No content here has been reviewed and approved by Arun.
- [VERIFY] items 8, 9, and 10 remain open — any work touching Amazon ACOS thresholds, Operational Manager PRC role, or ROI Officer identity must carry [VERIFY] tags until Arun directly confirms.
- The bonus queryability framework (§11.11 / CLAUDE.md §11.11) introduces a potential soft conflict with the §7.9 bonus conditions — Varmen confirmation recommended before treating as mandatory. See `validation/md-arun-discussion-conflict-check.md`.
- Admin Manager PRC role ([VERIFY] item 3) remains open — PRC composition cannot be considered complete until SRC-ADMIN-001 is received.
- Arun's detailed authority limits beyond KPI/AXIOM scope are not yet fully documented — [VERIFY] per CLAUDE.md §5.

---

## 14. Next Step

**Arun review required.**

This workbench is a DRAFT pending Arun's review of:
- Whether the KPI/AXIOM domain pointers in §4 accurately reflect his day-to-day work
- Whether any confirmed process area is missing from the pointer list
- **Priority:** Whether Arun can now directly confirm [VERIFY] items 8, 9, and 10 — see `member-aios/arun-implementation/verify-items-arun.md` for the three items and the resolution process

Once Arun reviews and confirms, update the status field from `DRAFT — Pending Arun review` to `ACTIVE — Arun Reviewed [date]`.

If Arun resolves any [VERIFY] item during this review, notify Mareenraj so the confirmation can be registered as a new source in `evidence/source-register.md`.

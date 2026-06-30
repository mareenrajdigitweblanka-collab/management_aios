---
name: suman-recruitment-workbench
type: workbench
member: Suman
role: Recruitment Officer (formal designations: Head Hunter, Onboarder, 6-Month Progress ROI Reviewer)
created: 2026-06-30
status: DRAFT — Pending Suman review
source-boundary: SRC-SUMAN-001-v2, SRC-MD-SUMAN-001, SRC-MAYU-001, SRC-SUMAN-CONF-001, SRC-SUMAN-002
root-truth: CLAUDE.md — canonical; this file is a navigation pointer only
---

# Suman — Recruitment Workbench

**Root Truth Rule:** This file is a workbench navigation guide. It does not replace CLAUDE.md. All authority, policy rules, and governance standards are defined in the root CLAUDE.md and registered sources. If this file contradicts CLAUDE.md, CLAUDE.md is correct.

**Pass/Fail Rule:** PASS if a clean LLM reading this file can navigate to the correct source for any recruitment process question without verbal explanation. FAIL if this file defines policy, resolves a [VERIFY] item, stores candidate personal data, or can be misread as a standalone AIOS.

---

## 1. Purpose

This workbench surfaces what is confirmed and relevant for Suman's role within the Management AIOS. It provides pointers to sources, skills, context files, and the action record inbox — so Suman can operate the recruitment, onboarding, and 6-month ROI domain without reading the entire root document set every session.

This file does not restate policy. It tells you where to find it.

---

## 2. Role Boundary

**Role:** Recruitment Officer
**Formal designations confirmed by SRC-MD-SUMAN-001 (Varmen Reviewed 2026-06-25):**

| Designation | Scope |
|---|---|
| Head Hunter | Identifies and sources candidates through all recruitment channels |
| Onboarder | Manages onboarding and early integration of new hires |
| 6-Month Progress ROI Reviewer | Conducts the binary ROI audit at the 6-month mark for each hire |

**Source authority:** SRC-SUMAN-001-v2 (primary), SRC-MD-SUMAN-001 (MD governance directives — Varmen Reviewed 2026-06-25), SRC-MAYU-001 (cross-reference for 180-day handover), SRC-SUMAN-CONF-001 (Line Manager typing correction)

**Confirmed process ownership:**
- Recruitment pipeline management (sourcing through offer)
- 8-point candidate screening
- Interview scoring (50-point scale)
- Rejected and on-hold candidate tracking (process-level; no personal data stored)
- Commitment record documentation
- 7/14-day review
- Month 1, Month 3, and Month 6 reviews
- Source quality monitoring
- 180-day handover preparation and facilitation (attendees: Mayurika, Arun, Suman)
- Daily knowledge capture (1 hour per working day)
- Six-month binary ROI audit per hire
- OLOS onboarding system validation
- BGCT completion monitoring for staff who joined within the last 6 months
- Weekly deliverables: Risk Identification, One-Month Task Rule, SKU/Margin/Hire-ROI Trace, LLM-in-the-Loop proof

For full role detail, see: **CLAUDE.md §5 — Role Boundaries (Suman row)**, **CLAUDE.md §8 — Recruitment Context**, and **context/recruitment-context.md**.

---

## 3. What Suman Does NOT Write

| Item | Whose Authority |
|---|---|
| AXIOM band placements | Arun |
| Staff record maintenance after Month 6 handover | Mayurika |
| Canonical name spelling for staff records | Rajiv |
| Team structure data | Rajiv |
| Salary band information | Out of scope for this AIOS entirely |
| Admin Manager escalation paths | [VERIFY] pending SRC-ADMIN-001 |

After the 180-day handover is complete, recruitment ownership formally concludes unless unresolved actions remain (SRC-SUMAN-001-v2). Mayurika then writes `recruitment_source_id` and `recruitment_promise_set_id` into the staff record (SRC-MAYU-001).

---

## 4. Recruitment Domain Areas — Pointer List

Each item below points to the correct source and context file. Do not treat these as standalone policy summaries.

| Domain Area | Source ID | Context File | CLAUDE.md Section |
|---|---|---|---|
| Candidate pipeline | SRC-SUMAN-001-v2 | context/recruitment-context.md §1 | §8.1 |
| 8-point screening criteria | SRC-SUMAN-001-v2 | context/recruitment-context.md §2 | §8.2 |
| Interview scoring (50-point scale) | SRC-SUMAN-001-v2 | context/recruitment-context.md §3 | §8.3 |
| Rejected and on-hold tracking | SRC-SUMAN-001-v2 | context/recruitment-context.md §4 | §8.4 |
| Commitment records | SRC-SUMAN-001-v2 | context/recruitment-context.md §5 | §8.5 |
| 7/14-day review | SRC-SUMAN-001-v2 | context/recruitment-context.md §6 | §8.6 |
| Month 1 review | SRC-SUMAN-001-v2 | context/recruitment-context.md §7 | §8.7 |
| Month 3 review | SRC-SUMAN-001-v2 | context/recruitment-context.md §8 | §8.8 |
| Month 6 review | SRC-SUMAN-001-v2 | context/recruitment-context.md §9 | §8.9 |
| Source quality monitoring | SRC-SUMAN-001-v2 | context/recruitment-context.md §10 | §8.10 |
| 180-day handover | SRC-SUMAN-001-v2, SRC-SUMAN-CONF-001, SRC-MAYU-001 | context/recruitment-context.md §11 | §8.11 |
| Daily knowledge capture | SRC-SUMAN-001-v2 | context/recruitment-context.md §12 | §8.12 |
| Six-month binary ROI audit | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.2 | §11.7 |
| Weekly deliverables (4 items) | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.3 | — |
| LLM-in-the-loop requirement | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.4 | — |
| OLOS onboarding validation | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.6 | §11.8 |
| BGCT completion — last 6 months | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.7 | — |
| LLM-queryable onboarding | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.8 | — |
| Dan Martel onboarding principle | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.9 | — |
| Shovel-ready requirement document | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.10 | — |
| Proof-over-narrative standard | SRC-MD-SUMAN-001 | context/recruitment-context.md §13.11 | — |
| 7-day training gap historical evidence | SRC-SUMAN-002 | context/recruitment-context.md — evidence note | evidence only; not solution authority |
| Probation leave restriction | SRC-POLICY-001 §6.2 | context/recruitment-context.md §7 | §10.1 |
| Onboarding policy | SRC-POLICY-001 §3.0, §17.0 | — | §10.2 |

---

## 5. Relevant Skills

| Skill | File | Primary Use |
|---|---|---|
| recruitment-quality-check | skills/recruitment-quality-check.md | Full recruitment pipeline quality control — 8-point screening, interview scoring, review cadence, handover |
| management-gap-detection | skills/management-gap-detection.md | Identify onboarding and recruitment gaps across the four confirmed problem areas |
| management-problem-analysis | skills/management-problem-analysis.md | Analyse a recorded recruitment or onboarding problem using action records evidence |
| policy-lookup | skills/policy-lookup.md | Look up onboarding policy, probation leave restriction, AI tools requirement |

Skill file updates require domain owner review. Do not edit skill files directly. Flag update candidates to Mareenraj (trainee/builder).

---

## 6. Action Record Inbox

Suman's action record inbox is:

`intelligence-inbox/management-action-records/suman-recruitment/`

Use this folder to document:
- MD discussion directions that should be tracked
- Recruitment or onboarding problems identified
- Actions taken on recruitment process gaps
- Weekly deliverable submission records
- 6-month ROI audit evidence records
- Follow-ups assigned

**Current records:** 0 records on file as of 2026-06-30.

**Filing rules:** See `handover/management-action-records-team-usage-guide.md` for the full guide, required fields, file naming, and templates.

**File naming format:** `YYYY-MM-DD_suman-recruitment_record-type_short-topic.md`

**Templates available:**
- `intelligence-inbox/management-action-records/templates/md-discussion-note-template.md`
- `intelligence-inbox/management-action-records/templates/problem-solution-action-record-template.md`

---

## 7. What Suman Can Maintain

The following can be maintained by Suman within this AIOS without further approval, as they are within his/her confirmed domain:

- Creating action records in `intelligence-inbox/management-action-records/suman-recruitment/` using the correct templates and required fields
- Documenting weekly deliverables and daily knowledge capture as process-level records
- Flagging [VERIFY] items that appear resolvable (notify Mareenraj; do not self-approve resolution)
- Routing review requests to the correct domain owner per CLAUDE.md §18
- Preparing recruitment checklists and onboarding records at process level

Technical support is required for:
- Committing files to the repository
- Updating `evidence/source-register.md`
- Editing context files
- Updating CLAUDE.md
- Approving skill file changes

---

## 8. What Suman Must Not Maintain

Within this AIOS, Suman must not:

- Store candidate personal data, CV details, interview scores linked to named individuals, or salary figures in any AIOS file
- Write or approve Admin Manager authority, escalation paths, or PRC role content — [VERIFY] items 1–5 pending SRC-ADMIN-001
- Assign AXIOM band placements to staff — Arun's authority
- Write canonical name spellings or team structure data — Rajiv's authority
- Store salary, bonus, or compensation data in any AIOS file
- Resolve a [VERIFY] item unilaterally — resolution requires registered source evidence and domain owner confirmation
- Self-approve skill file updates or promote content to parent AIOS truth
- Treat action records as final policy or approved escalation authority

---

## 9. Sensitive Data Warning

This workbench and all files under `member-aios/suman-recruitment/` must follow the confidentiality rules in:
- **CLAUDE.md §6 — Confidentiality and Data Safety**
- **context/confidentiality-rules.md**

**SRC-MD-SUMAN-001 sensitivity note (from evidence/source-register.md):** The source document contains candidate names with statuses, individual CV/salary details, and individual performance assessment references. These must not be reproduced in any workbench, checklist, or action record file. Process-level and aggregate information only.

In practice:
- Use role-level or cohort-level references (e.g., "Month 1 cohort") not individual candidate identifiers
- Do not record interview scores linked to named individuals
- Do not record salary figures from offer records
- Do not store CV details or personal background information

---

## 10. [VERIFY] Items Affecting Suman's Domain

The following [VERIFY] items from `context/verify-register.md` affect Suman's workbench. They must remain tagged until resolved through the standard process.

| # | [VERIFY] Item | Impact on Suman's Work | Source Needed |
|---|---|---|---|
| 6 | MD-specific requirements beyond Varmen relay | Final scope of Suman's recruitment responsibilities may change after MD review | Future MD interview / registered MD source |
| 7 | Final implementation scope | This workbench remains Foundation Draft v0.1 until MD review is complete | MD review meeting |

No [VERIFY] items specific to Suman's recruitment domain remain open in `context/verify-register.md`. The Line Manager identity item (former item 11) was resolved 2026-06-25 by SRC-SUMAN-CONF-001.

For the full [VERIFY] register, see `context/verify-register.md`.

---

## 11. Reviewer Routing

Per CLAUDE.md §18 (updated 2026-06-26):

| Content Type | Reviewer |
|---|---|
| This workbench file and recruitment domain checklists | Suman — confirms accuracy of recruitment process pointers |
| Action records in suman-recruitment/ inbox | Suman — reviews his/her own records before citing as approved |
| 180-day handover — recruitment side | Suman (handover preparation); Mayurika (HR receipt) |
| 180-day handover — staff record writing | Mayurika (writes recruitment_source_id and recruitment_promise_set_id) |
| AXIOM band questions | Arun |
| Policy lookups (onboarding, probation, AI tools) | Suman confirms operational application; SRC-POLICY-001 is the source of truth |
| Skill file update candidates | Trainee prepares draft; Suman reviews recruitment-facing content |
| Promotion to parent AIOS v0.2 | Suman sign-off for recruitment domain |

---

## 12. Queryability Test

A clean LLM reading this workbench should be able to answer:

| Question | Answerable from This File? |
|---|---|
| What are Suman's three formal role designations? | YES — §2 |
| What does Suman manage end-to-end in recruitment? | YES — §2, §4 (pointers) |
| What is Suman NOT allowed to write? | YES — §3, §8 |
| Which skills are relevant to his/her work? | YES — §5 |
| Where is the action record inbox? | YES — §6 |
| What data must not be stored? | YES — §9 |
| Which [VERIFY] items affect this domain? | YES — §10 |
| Who reviews Suman's work? | YES — §11 |
| Where are the weekly deliverables defined? | YES — §4 pointer to context/recruitment-context.md §13.3 |
| What is the root source of truth? | YES — Root Truth Rule header |

---

## 13. Known Limits

- This workbench is DRAFT. No content here has been reviewed and approved by Suman.
- SRC-MD-SUMAN-001 sensitivity limits apply: no candidate personal data, CV details, or salary figures may be reproduced.
- OLOS validation status is process-level only — see context/recruitment-context.md §13.6 for the full validation document list.
- Admin Manager escalation paths remain [VERIFY] pending SRC-ADMIN-001 — do not use Admin Manager authority claims from any recruitment action record.

---

## 14. Next Step

**Suman review required.**

This workbench is a DRAFT pending Suman's review of:
- Whether the recruitment domain pointers in §4 accurately reflect day-to-day work
- Whether any confirmed process area is missing from the pointer list
- Whether the checklist at `member-aios/suman-recruitment/weekly-deliverables-checklist.md` is operationally accurate

Once Suman reviews and confirms, update the status field from `DRAFT — Pending Suman review` to `ACTIVE — Suman Reviewed [date]`.

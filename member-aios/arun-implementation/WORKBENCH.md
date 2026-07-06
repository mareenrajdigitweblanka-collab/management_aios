---
name: arun-implementation-workbench
type: workbench
member: Arun
role: Implementation Officer
created: 2026-06-30
status: ACTIVE — Arun Reviewed 2026-06-30
source-boundary: SRC-ARUN-001, SRC-ARUN-002, SRC-MD-ARUN-001, SRC-ARUN-PH-001
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
| Portfolio Holder KPI review methodology | SRC-ARUN-PH-001 | member-aios/arun-implementation/source-maps/arun-ph-team-review-source-map-2026-07-06.md | — |

**SRC-ARUN-PH-001 integrated (2026-07-06 — user-approved):** Portfolio Holder KPI review prompt. Template only — no live KPI calculations, no sensitive data. Use for PH monthly review structure. See `member-aios/arun-implementation/source-maps/arun-ph-team-review-source-map-2026-07-06.md` and query pack `member-aios/arun-implementation/query-packs/arun-ph-kpi-review-query-pack-2026-07-06.md`. Next step: map data sources before building live report generation workflow.

**Arun confirmed (2026-06-30):** Review inputs (§7.4 pointer) include feedback from the Implementation Officer – Arunraj (Arun confirmed: replaces former "ROI Officer" wording) and External Auditor – Paraparan. See `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`.

**[VERIFY] items 8, 9, 10 — ARUN CONFIRMED 2026-06-30 at member workbench layer.** See §10 of this workbench and `member-aios/arun-implementation/verify-items-arun.md`. Root `context/verify-register.md` update is a separate step.

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

**Arun review note (2026-06-30):** Arun confirmed items 8, 9, and 10 during his 2026-06-30 workbench review. Amazon ACOS threshold is ACOS below 25% / ROAS 4 (item 8 confirmed). Operational Manager escalation authority confirmed — can delay or avoid suspension/termination on firm commitment with defined deadline (item 9 confirmed for escalation authority only). "ROI Officer" in review inputs context is confirmed as "Implementation Officer – Arunraj"; Paraparan is External Auditor (item 10 confirmed). Root `context/verify-register.md` update is a pending separate step — see `member-aios/arun-implementation/verify-items-arun.md` and `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`.

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

| # | [VERIFY] Item | Impact on Arun's Work | Status |
|---|---|---|---|
| 8 | Amazon ACOS threshold wording | ACOS trigger in KPI detection criteria (CLAUDE.md §7.3) | ARUN CONFIRMED 2026-06-30 — Amazon ACOS threshold: ACOS below 25% / ROAS 4. Root `context/verify-register.md` update pending. |
| 9 | Operational Manager escalation authority | Escalation policy (CLAUDE.md §7.7) — Operational Manager scope | ARUN CONFIRMED FOR ESCALATION AUTHORITY ONLY 2026-06-30 — Operational Manager can delay or avoid suspension/termination under escalation policy if staff member provides firm commitment with defined deadline to achieve required ROI. Full PRC membership scope remains [VERIFY] in root register. |
| 10 | ROI Officer identity / title in review inputs | Review inputs (CLAUDE.md §7.4) — "ROI officer feed back" wording | ARUN CONFIRMED 2026-06-30 — "ROI Officer" is replaced with "Implementation Officer – Arunraj". Paraparan is External Auditor. Root `context/verify-register.md` update pending. |
| 6 | MD-specific requirements beyond Varmen relay | Final scope of Arun's implementation responsibilities may change after MD review | PENDING — Await MD review meeting |
| 7 | Final implementation scope | MD review is not yet complete | PENDING — MD review meeting |

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

- This workbench is ACTIVE — Arun Reviewed 2026-06-30. Arun confirmed accuracy and approved ACTIVE status.
- [VERIFY] items 8, 9, and 10 are ARUN CONFIRMED at the member workbench layer (2026-06-30). Root `context/verify-register.md` update is a separate pending step. See `member-aios/arun-implementation/verify-items-arun.md` and `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`.
- The bonus queryability framework (§11.11 / CLAUDE.md §11.11) introduces a potential soft conflict with the §7.9 bonus conditions — Varmen confirmation recommended before treating as mandatory. See `validation/md-arun-discussion-conflict-check.md`.
- Admin Manager PRC role ([VERIFY] item 3) remains open — PRC composition cannot be considered complete until SRC-ADMIN-001 is received.
- Arun's detailed authority limits beyond KPI/AXIOM scope are not yet fully documented — [VERIFY] per CLAUDE.md §5.

---

## 15. SRC-ARUN-PH-001 — Portfolio Holder Source

**Status:** ACTIVE — user-approved integration 2026-07-06
**Use:** PH monthly KPI review report structure — 16 sections, 15 Excel worksheets
**Limit:** Template only. No live KPI calculations. No real staff performance data. No AXIOM band assignments. No bonus/PRC automation. Requires factual data sources (sales, inventory, advertising) mapped separately before report generation.
**Source map:** `member-aios/arun-implementation/source-maps/arun-ph-team-review-source-map-2026-07-06.md`
**Query pack:** `member-aios/arun-implementation/query-packs/arun-ph-kpi-review-query-pack-2026-07-06.md`
**Approval evidence:** `evidence/stakeholder-confirmations/arun-ph-team-user-approved-integration-2026-07-06.md`
**Next step:** Build report-generation workflow only after approved factual data sources are mapped and access-approved.

---

## 16. Arun Day-to-Day Dashboard Tables

**Status:** INTERNAL BUILD — preview/control tables only (2026-07-06)

**Table map path:** `member-aios/arun-implementation/dashboard-table-maps/arun-day-to-day-useful-tables-map-2026-07-06.md`

**Dashboard visibility:** Arun Implementation tab in `web-view/index.html` — "Arun Day-to-Day Control Tables — Internal Build" section

**Source basis:** SRC-ARUN-PH-001 (PH review structure), SRC-ARUN-001 (KPI definitions, dashboard requirements), SRC-MD-ARUN-001 (meeting governance)

**Five tables built:**

| # | Table | Purpose |
|---|---|---|
| 1 | Portfolio Holder Review Preparation Tracker | Track which PH monthly reviews are ready, waiting, or blocked |
| 2 | KPI Data Source Readiness Table | Pre-flight check — confirm data sources before generating review |
| 3 | PH Monthly Review Output Checklist | Check all 15 SRC-ARUN-PH-001 worksheets are complete |
| 4 | Risk / Coaching / Action Plan Tracker | Day-to-day follow-up at process level |
| 5 | Arun Dashboard Requirement Tracker | Track which dashboard views are safe now vs. gated |

**Limits:**
- No real staff data, no real sales / inventory / PPC values
- No live KPI calculation, no AXIOM band assignment
- No bonus / PRC / warning / PIP automation
- No CSV exchange-rate rows (SRC-ARUN-002 rows 44–52 excluded)
- Placeholder rows only — control/planning template

**Next step:** Map factual data sources (sales, inventory, advertising, pricing, feedback) and confirm access approval before building the live report generation workflow.

**Evidence:** `evidence/stakeholder-confirmations/arun-day-to-day-useful-tables-request-2026-07-06.md`
**Validation:** `validation/arun-day-to-day-useful-tables-preview-check-2026-07-06.md`

---

## 17. Arun PH Live Report Data-Source Mapping

**Status:** AMBER — factual sources missing; access approvals absent

**File path:** `member-aios/arun-implementation/data-source-maps/arun-ph-live-report-data-source-map-2026-07-06.md`

**Summary:**
A read-only discovery report (2026-07-06) confirmed the PH report structure (SRC-ARUN-PH-001) and KPI thresholds (SRC-ARUN-001, SRC-ARUN-CONF-001), but identified that 6 of 8 factual data areas are undocumented or missing, 1 area is partial (TL/Auditor feedback — roles confirmed, format/path unknown), and 1 area is blocked (exchange-rate data — multi-currency scope not confirmed). No access approvals exist for any data area.

**Data area mapping summary:**

| # | Data Area | Status |
| --- | --- | --- |
| A | Sales data | MISSING |
| B | Inventory / stock data | MISSING |
| C | Advertising / PPC data | MISSING |
| D | Pricing data | MISSING |
| E | Marketplace / listing data | MISSING |
| F | Exchange-rate data | BLOCKED |
| G | TL / Auditor feedback | PARTIAL |
| H | Historical performance baseline | MISSING |

**Live workflow:** Remains blocked. Do not build live report generation until Arun confirms all 8 data areas.

**Next step:** Route data-source map to Arun for confirmation of source systems, owners, and access status for each of the 8 data areas.

---

## 14. Next Step

**Arun review completed — 2026-06-30.**

Arun confirmed workbench accuracy and approved ACTIVE status. [VERIFY] items 8, 9, and 10 confirmed at member workbench layer. Evidence registered at `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`.

**Pending steps:**
- Update root `context/verify-register.md` to reflect Arun's confirmations for items 8, 9, 10 — requires Mareenraj as builder
- Update CLAUDE.md §7.3 (ACOS threshold), §7.4 (ROI Officer → Implementation Officer – Arunraj; Paraparan as External Auditor), §7.7/§7.8 (Operational Manager escalation authority) — requires formal source registration step
- Mayurika and Suman workbench reviews remain pending

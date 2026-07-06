---
name: arun-implementation-quick-reference-sources
type: quick-reference
member: Arun
role: Implementation Officer
created: 2026-06-30
status: ACTIVE — Arun Reviewed 2026-06-30
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
| SRC-ARUN-PH-001 | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/Arun-PH-Team.md` | Portfolio Holder monthly KPI review report structure; 16-section report template; YOY performance (Amazon UK, eBay UK, eBay DE, B&Q); SKU analysis; stock health; coaching questions; appreciation categories; 15 Excel-friendly worksheets — template only; no live data embedded | ACTIVE — user-approved 2026-07-06 |
| SRC-ARUN-002 | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/my day check list-arun - shedule.csv` | Daily operational schedule and checklist across teams | READY |
| SRC-MD-ARUN-001 | `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & Arun Discussion Notes.md` | KPI meeting format and governance; meeting ID system; bonus queryability evaluation framework; technical team escalation standard; BGCT documentation hierarchy (four-step: BGCT → Handbook → Skill file → Rule book); developer ROI review process | READY — Varmen Reviewed by project default 2026-06-26 |
| MGMT-ACTION-RECORDS-FOLDER | `intelligence-inbox/management-action-records/` | Ongoing management action records inbox — Arun's subfolder is `arun-implementation/` | ACTIVE |

---

## Known Source Limits

| Limit | Detail |
|---|---|
| SRC-MD-ARUN-001 sensitivity | Contains individual staff names in operational context and individual performance references (08/08/2025 entry) — do not copy personal case details or individual performance references; process-level extraction only |
| SRC-ARUN-001 — [VERIFY] items 8, 9, 10 | ARUN CONFIRMED 2026-06-30 at member workbench layer: Amazon ACOS threshold = ACOS below 25% / ROAS 4; Operational Manager escalation authority confirmed (not full PRC scope); "ROI Officer" = Implementation Officer – Arunraj; Paraparan = External Auditor. Root `context/verify-register.md` update pending. See `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`. |
| SRC-MD-ARUN-001 — bonus queryability soft conflict | Bonus queryability framework (§11.11) extends §7.9 bonus conditions — relationship between the two requires Varmen confirmation; see `validation/md-arun-discussion-conflict-check.md` |
| SRC-ADMIN-001 — PENDING | Admin Manager PRC role and authority cannot be confirmed. [VERIFY] items 1–5 remain open. PRC composition is incomplete. Do not infer Admin Manager content from any source. |
| SRC-ARUN-PH-001 — template only | Template document with placeholder fields (`{Staff Name}`, `{Review Month}`) — no live data embedded; sensitivity rises to MEDIUM when instantiated with real staff and sales data; do not populate template with real staff names or scores without separate data source approval; CSV exchange-rate data (SRC-ARUN-002 rows 44–52) excluded from this source |

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

**Arun review note (2026-06-30):** Items 8, 9, and 10 confirmed by Arun. Amazon ACOS = ACOS below 25% / ROAS 4. "ROI Officer" in review inputs = Implementation Officer – Arunraj. Paraparan = External Auditor. Operational Manager escalation authority confirmed (escalation delay/avoid on firm commitment only). Root `context/verify-register.md` update is a pending separate step. See `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`.

---

## Validation References

| File | What It Documents |
|---|---|
| `validation/md-arun-discussion-source-ingestion-check.md` | SRC-MD-ARUN-001 ingestion check — what was extracted and how |
| `validation/md-arun-discussion-impact-map.md` | Full impact map of SRC-MD-ARUN-001 on CLAUDE.md and context files |
| `validation/md-arun-discussion-conflict-check.md` | Soft conflict #1 — bonus queryability vs §7.9 bonus conditions |
| `validation/md-arun-discussion-ingestion-final-report.md` | Final ingestion report for SRC-MD-ARUN-001 |
| `member-aios/arun-implementation/verify-items-arun.md` | Three open [VERIFY] items specific to Arun's domain — full detail and resolution process |
| `member-aios/arun-implementation/source-maps/arun-ph-team-review-source-map-2026-07-06.md` | Source map for SRC-ARUN-PH-001 — report sections, marketplace scope, required data sources, output format, limits |
| `member-aios/arun-implementation/query-packs/arun-ph-kpi-review-query-pack-2026-07-06.md` | Query pack for SRC-ARUN-PH-001 — reusable questions for PH KPI review structure, data requirements, coaching questions, source limits |
| `evidence/stakeholder-confirmations/arun-ph-team-user-approved-integration-2026-07-06.md` | User approval evidence for SRC-ARUN-PH-001 integration (2026-07-06) |
| `validation/arun-ph-team-system-integration-check-2026-07-06.md` | Full integration validation for SRC-ARUN-PH-001 — PASS (AMBER for live report generation) |

---

## [VERIFY] Items Currently Open for Arun's Domain

| # | Item | Status |
|---|---|---|
| 8 | Amazon ACOS threshold wording | ARUN CONFIRMED 2026-06-30 — ACOS below 25% / ROAS 4. Root register update pending. |
| 9 | Operational Manager escalation authority | ARUN CONFIRMED FOR ESCALATION AUTHORITY ONLY 2026-06-30 — can delay/avoid suspension/termination on firm commitment with deadline. Full PRC membership scope remains [VERIFY] in root register. |
| 10 | ROI Officer identity / title | ARUN CONFIRMED 2026-06-30 — Implementation Officer – Arunraj. Paraparan = External Auditor. Root register update pending. |
| 6 | MD-specific requirements beyond Varmen relay | PENDING — Await MD review meeting |
| 7 | Final implementation scope | PENDING — MD review meeting |

**Items 8, 9, and 10 confirmed by Arun 2026-06-30.** Evidence: `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`. Root `context/verify-register.md` update requires a separate step by Mareenraj.

For full [VERIFY] register, see `context/verify-register.md`.

---

## Pass/Fail Rule

PASS if a reader can locate the correct source, context file, skill, or inbox for any Arun KPI/implementation domain question without verbal guidance.

FAIL if any entry in this file copies source content, states a [VERIFY] item as resolved, stores individual staff performance data by name, or implies policy authority from a non-registered source.

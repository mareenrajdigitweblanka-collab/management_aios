---
name: mayurika-hr-useful-tables-discovery-check
type: validation
created: 2026-07-02
status: COMPLETE — read-only discovery; no tables built; pending Mayurika confirmation before implementation
scope: Read-only source check for six HR table candidates for Mayurika's dashboard tab
references: evidence/table-discovery/mayurika-hr-useful-tables-source-check-2026-07-02.md
root-truth: CLAUDE.md — canonical; this validation file is a summary check only
---

# Validation: Mayurika HR Dashboard — Useful Tables Discovery Check (2026-07-02)

**Purpose:** Confirm that the discovery process for six HR table candidates was performed correctly — sources inspected, domain boundaries respected, sensitive data rules followed, [VERIFY] items checked, and safe status decisions justified.

**What this validates:** `evidence/table-discovery/mayurika-hr-useful-tables-source-check-2026-07-02.md`

**What this does NOT do:**
- Build any tables
- Edit web-view/index.html
- Edit CLAUDE.md
- Resolve any [VERIFY] items
- Register any new sources
- Change any statuses

---

## Files Created

| File | Status |
|---|---|
| `evidence/table-discovery/mayurika-hr-useful-tables-source-check-2026-07-02.md` | CREATED — detailed source check for all six candidates |
| `validation/mayurika-hr-useful-tables-discovery-check.md` | CREATED — this file |

---

## Source Files Inspected

| Source ID | File Inspected | Status |
|---|---|---|
| SRC-MAYU-001 | `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/HR.Mayu.Skill.md` | READY — fully inspected |
| SRC-POLICY-001 | `intelligence-inbox/raw-stakeholder-documents/company-policy/Draft DIGIT WEB LANKA - Company Policy Manual.md` | READY (Final Approved) — §6.1–§6.5 and §10.x inspected |
| SRC-MD-HR-001 | `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & HR Discussion Notes.md` | READY (Varmen Reviewed 2026-06-25) — §10.9 used for review milestones |
| SRC-SUMAN-001-v2 | Via CLAUDE.md §8.7 (Month 6 boundary only) | READY — Month 1 status categories extracted for Table 5 only |
| Navigation files | WORKBENCH.md, quick-reference-sources.md, daily-weekly-checklist.md | Inspected for domain scope and [VERIFY] item context |
| Context files | hr-operations-context.md, confidentiality-rules.md, verify-register.md | Inspected for policy detail, forbidden data rules, and [VERIFY] current status |

---

## Candidate Table Results

| # | Table Name | Safe Status | Primary Source | Key Notes |
|---|---|---|---|---|
| 1 | Leave Notice Periods & Approval Levels | **PASS** | SRC-POLICY-001 §6.1–§6.2 | Cleanest candidate; Final Approved source; no domain overlap; no [VERIFY] blockers |
| 2 | Leave Types at a Glance | **PASS** | SRC-POLICY-001 §6.1–§6.5 | Companion to Table 1; same source; no overlap; no [VERIFY] blockers |
| 3 | Employment Status Reference & PDPA Compliance Indicator | **PASS** | SRC-MAYU-001 (Staff Record Semantics section) | Note Rajiv authority on "suspended" status in table; use descriptive tool reference, not named tool (VERIFY item 9) |
| 4 | Staff Review Milestone Calendar | **PASS** | SRC-MD-HR-001 §10.9; SRC-MAYU-001 (Monthly Activities #3) | Month 6 content scoped to Mayurika's receipt role only — not Suman's process steps |
| 5 | Month 1 Status Categories (Handover Context) | **AMBER** | SRC-SUMAN-001-v2 via CLAUDE.md §8.7 | Primary domain is Suman's; safe only if Mayurika confirms + Suman notified + domain-boundary note included |
| 6 | Probation Record Monitoring | **PASS** | SRC-MAYU-001 (Daily Activities #1, Weekly Activities #3, Status Semantics) | PASS only in record-keeping scope; escalation paths excluded to avoid [VERIFY] items 1–5 |

---

## PASS Tables

**5 of 6 candidates are PASS:**

1. **Leave Notice Periods & Approval Levels** — Full PASS; Final Approved source; no restrictions
2. **Leave Types at a Glance** — Full PASS; Final Approved source; no restrictions
3. **Employment Status Reference & PDPA Compliance Indicator** — PASS with note: include Rajiv authority qualifier on "suspended"; do not name tool ([VERIFY] item 9)
4. **Staff Review Milestone Calendar** — PASS with note: Month 6 row scoped to Mayurika's receipt role; do not describe Suman's process steps inside this table
5. **Probation Record Monitoring** — PASS with scope note: record-keeping and monitoring only; no incident/PRC/Admin Manager escalation steps

---

## AMBER Tables

**1 of 6 candidates is AMBER:**

- **Month 1 Status Categories (Handover Context):** Source-backed (SRC-SUMAN-001-v2) and no sensitive data. AMBER because primary domain is Suman's recruitment process, not Mayurika's HR operations. Must not be included without: (a) Mayurika confirming she wants it; (b) Suman being notified; (c) a clear "Handover Context" section label and domain-boundary note in the dashboard.

---

## FAIL Tables

**0 of 6 candidates are FAIL.**

No candidate was found to be fundamentally unsafe. The one AMBER result is conditional — it can become PASS after the resolution conditions are met.

---

## Sensitive Data Check

**All six candidates passed the sensitive data check:**

- No individual staff names in any recommended table
- No salary or compensation data
- No individual health or medical data
- No PDPA personal data (PDPA compliance indicator shows field name and compliance rule only — not raw data)
- No AXIOM band placements or individual performance band scores
- No recruitment candidate personal data
- No disciplinary case details
- No individual grievance records

---

## [VERIFY] Item Check

| [VERIFY] # | Status | Impact on Discovery |
|---|---|---|
| 1–5 (Admin Manager) | PENDING | Would have blocked escalation path content in Table 6 — escalation paths were excluded; tables are safe |
| 6 (MD requirements beyond Varmen relay) | PENDING | Applies nominally to all Foundation Draft v0.1 content; does not block any table |
| 7 (Final implementation scope) | PENDING | Same as above |
| 8 (Director authority beyond leadership review) | PENDING | No tables reference Director authority |
| 9 (Exact tool names for HR/EOD systems) | PENDING | Table 3 uses descriptive reference "staff record system" — not a named tool; [VERIFY] item 9 does not block |

**No [VERIFY] items block any of the six candidate tables from being built in the recommended scoped formats.**

---

## Duplicate / Parent-Truth Risk Check

| Risk | Result |
|---|---|
| Tables introduce new policy claims not in registered sources | NO — all table content is extracted from confirmed registered sources |
| Tables resolve any open [VERIFY] items | NO |
| Tables promote content to parent AIOS truth | NO — tables are dashboard display elements only |
| Tables contradict CLAUDE.md | NO — all content aligns with CLAUDE.md §7.1–§7.9, §8.7, §9.1–§9.3, §10.1 |
| Tables store personal data | NO |

---

## Domain Boundary Confirmation

| Domain Check | Result |
|---|---|
| AXIOM bands excluded from all tables | CONFIRMED — no AXIOM content in any candidate |
| KPI trigger rules excluded (Arun's domain) | CONFIRMED — no KPI trigger conditions in any candidate |
| Incident escalation paths excluded (Arun's domain) | CONFIRMED — Table 6 scope note explicitly excludes escalation paths |
| PRC / Admin Manager authority excluded ([VERIFY] items 1–5) | CONFIRMED — no PRC content in any candidate |
| Salary data excluded | CONFIRMED |
| PDPA personal data excluded | CONFIRMED |
| Month 6 content scoped to Mayurika's receipt role | CONFIRMED in Table 4 — Suman's process steps not included in milestone table |
| Month 1 Status Categories domain boundary noted | CONFIRMED in Table 5 — AMBER status with domain-boundary note required |

---

## Recommended Build Order

| Priority | Table | Rationale |
|---|---|---|
| 1 | Leave Notice Periods & Approval Levels | Simplest, cleanest, immediately useful, no conditions |
| 2 | Leave Types at a Glance | Companion to Table 1; same source; completes leave reference |
| 3 | Employment Status Reference & PDPA Compliance Indicator | Core daily/weekly reference for Mayurika; single source |
| 4 | Probation Record Monitoring | Source-backed, useful for daily monitoring; clear scope |
| 5 | Staff Review Milestone Calendar | Multi-source; builds on Tables 3 and 4 understanding |
| 6 | Month 1 Status Categories | Build only after Mayurika confirmation and Suman notification (AMBER) |

---

## One Next Step

**Route this discovery report to Mayurika for confirmation.**

Specifically, Mayurika should confirm:
1. She wants all five PASS tables built for her HR dashboard tab
2. She wants (or does not want) Table 5 (Month 1 Status Categories) — if yes, Suman must be notified
3. The table wording and column headers in the source check file are operationally accurate for her daily use

Once confirmed, Mareenraj (builder) may proceed with implementation in web-view/index.html. Do not build until confirmation is received.

---

## Pass/Fail Result

**PASS** — Discovery was performed correctly: read-only, no edits made, six candidates assessed against source, domain, [VERIFY], and sensitive data criteria. Five PASS, one AMBER, zero FAIL. Recommended build order documented. Reviewer routing confirmed (Mayurika for HR domain; Suman notification for Table 5 if included).

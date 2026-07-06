---
name: mayurika-hr-useful-tables-preview-build-check
type: validation
created: 2026-07-02
last-updated: 2026-07-06
checked-by: Mareenraj (builder)
scope: Preview build of 5 Mayurika HR useful tables into web-view/index.html
status: SUPERSEDED — 2026-07-06. See supersession note below.
root-truth: CLAUDE.md — canonical; this validation file is a build check only
references:
  - evidence/table-discovery/mayurika-hr-useful-tables-source-check-2026-07-02.md
  - validation/mayurika-hr-useful-tables-discovery-check.md
  - evidence/stakeholder-confirmations/mayurika-hr-useful-tables-preview-build-note-2026-07-02.md
---

# Validation: Mayurika HR Useful Tables — Preview Build Check (2026-07-02)

---

## SUPERSESSION NOTE — 2026-07-06

**Superseded on 2026-07-06.**

Mayurika will provide final HR table format and table content in the future. The existing 5 preview tables were removed from the visible dashboard (`web-view/index.html`) on 2026-07-06 and should not be treated as approved.

- Previous preview tables (Tables 1–5) are no longer visible in the dashboard.
- No replacement HR table has been built.
- No table format has been invented.
- Historical evidence files from the original 2026-07-02 build are retained and must not be deleted.
- This validation file is preserved as a historical record of the original build check.

**Evidence:** `evidence/stakeholder-confirmations/mayurika-hr-tables-future-format-update-2026-07-06.md`

**Removal validation:** `validation/mayurika-hr-tables-preview-removal-check.md`

**Next step:** Wait for Mayurika to provide exact table format and content before building any HR tables.

---

**Purpose:** Confirm that the 5 PASS tables from the source discovery were added to the Mayurika HR dashboard tab correctly — as read-only previews, source-backed, without sensitive data, without [VERIFY] resolution, without policy duplication, and without escalation/PRC/AXIOM/KPI content.

---

## Tables Added (PREVIEW)

| # | Table Name | Source | Preview Status | Sensitive Data | [VERIFY] Resolved |
|---|---|---|---|---|---|
| 1 | Leave Notice Periods & Approval Levels | SRC-POLICY-001 §6.1–§6.2 | PREVIEW | NONE | NO |
| 2 | Leave Types at a Glance | SRC-POLICY-001 §6.1–§6.5 | PREVIEW | NONE | NO |
| 3 | Employment Status Reference & PDPA Compliance Indicator | SRC-MAYU-001 | PREVIEW | NONE | NO |
| 4 | Staff Review Milestone Calendar | SRC-MD-HR-001 §10.9; SRC-MAYU-001 | PREVIEW | NONE | NO |
| 5 | Probation Record Monitoring | SRC-MAYU-001; SRC-POLICY-001 §6.2 | PREVIEW | NONE | NO |

**All 5 tables added as PREVIEW: CONFIRMED**

---

## Table Excluded — AMBER

| Table | Status | Reason |
|---|---|---|
| Month 1 Status Categories | AMBER — excluded from this build | Primary domain is Suman's recruitment/handover process. Excluded until Mayurika confirms and Suman is notified. |

**Month 1 Status Categories excluded: CONFIRMED**

---

## Sensitive-Data Check

| Data Type (Forbidden) | Present in Any Added Table? |
|---|---|
| Individual staff names | NO |
| Salary or compensation data | NO |
| Individual health or medical data | NO |
| PDPA personal data | NO — PDPA compliance indicator shows field name and compliance rule only |
| Individual AXIOM band placements or scores by name | NO |
| Recruitment candidate personal data | NO |
| Disciplinary case details | NO |
| Individual grievance records | NO |

**Sensitive-data check: PASS**

---

## [VERIFY] Item Check

| [VERIFY] # | Affected? | Result |
|---|---|---|
| 1–5 (Admin Manager) | NO — no Admin Manager or escalation content in tables | NOT AFFECTED |
| 6 (MD requirements beyond Varmen relay) | Nominally applies to all Foundation Draft v0.1 content | DOES NOT BLOCK — SRC-POLICY-001 and SRC-MAYU-001 are READY |
| 7 (Final implementation scope) | Same as above | DOES NOT BLOCK |
| 8 (Director authority) | NO — no Director authority content in tables | NOT AFFECTED |
| 9 (Exact tool names for HR/EOD systems) | Table 3 uses "staff record system" (descriptive) — no named tool | NOT BLOCKED — handled correctly |

**No [VERIFY] item resolved: CONFIRMED**
**All 9 open [VERIFY] items preserved in root register: CONFIRMED**

---

## Domain Boundary Check

| Domain | Content Added? | Result |
|---|---|---|
| AXIOM bands (Arun's domain) | NO | CONFIRMED — no AXIOM band content in any table |
| KPI trigger rules (Arun's domain) | NO | CONFIRMED — no KPI trigger conditions in any table |
| Incident escalation paths (Arun's domain) | NO | CONFIRMED — Probation table scoped to monitoring and record-keeping only |
| PRC / Admin Manager authority ([VERIFY] items 1–5) | NO | CONFIRMED — no PRC or Admin Manager content in any table |
| Salary data | NO | CONFIRMED |
| PDPA personal data | NO | CONFIRMED |
| Suman's recruitment process steps (Month 6) | NO | CONFIRMED — Month 6 row in Milestone Calendar scoped to Mayurika's receipt role only |
| Month 1 Status Categories (Suman's domain) | NOT BUILT | CONFIRMED — excluded as AMBER |

**Domain boundary check: PASS**

---

## Duplicate-Truth Check

| Risk | Result |
|---|---|
| Tables reproduce policy rules with different wording | NO — all table content is a direct view extract from registered sources; CLAUDE.md remains canonical |
| Tables resolve [VERIFY] items | NO |
| Tables create authority claims not in registered sources | NO — all authority notes (e.g., Rajiv authorises suspension; Suman leads probation) trace directly to SRC-MAYU-001 |
| Tables promote content to parent AIOS truth | NO — tables are read-only display elements marked PREVIEW |
| Tables contradict CLAUDE.md | NO — all content aligns with CLAUDE.md §9, §10, §11.6 |

**Duplicate-truth check: PASS**

---

## Dashboard Read-Only Check

| Check | Result |
|---|---|
| Tables marked PREVIEW (not ACTIVE) | YES — section heading and intro note both mark all tables as PREVIEW |
| No submission forms or write capability added | CONFIRMED |
| No backend, API, or database code added | CONFIRMED |
| No external CDN added | CONFIRMED — all CSS/JS inline |
| Rajiv / Admin Manager content unchanged | CONFIRMED — BLOCKED |
| Suman domain status unchanged | CONFIRMED — ACTIVE |
| Arun domain status unchanged | CONFIRMED — ACTIVE |
| Mayurika workbench tab badge remains DRAFT | CONFIRMED — DRAFT badge not changed |
| Section subtitle states "Preview only; not final approved HR truth" | YES |

**Dashboard read-only check: PASS**

---

## Files Created / Edited in This Task

| File | Action |
|---|---|
| `evidence/stakeholder-confirmations/mayurika-hr-useful-tables-preview-build-note-2026-07-02.md` | CREATED |
| `validation/mayurika-hr-useful-tables-preview-build-check.md` | CREATED — this file |
| `web-view/index.html` | EDITED — 5 preview tables added to Mayurika HR tab |
| `validation/web-view-html-dashboard-check.md` | EDITED — section 23 added |
| `handover/2026-06-30__member-aios-3-draft-workbench-closure.md` | EDITED — tables build recorded |

---

## One Next Step

**Route these preview tables to Mayurika for review when she is available.**

Mayurika must confirm:
1. The table wording and columns are operationally accurate for her daily use.
2. No sensitive data is present.
3. She wants (or does not want) the Month 1 Status Categories table — if yes, Suman must be notified.

Until Mayurika confirms, all tables remain PREVIEW.

---

## Pass/Amber Result

**PASS** — Safe preview build. All 5 PASS tables added as PREVIEW. Month 1 Status Categories correctly excluded (AMBER). No sensitive data. No [VERIFY] items resolved. No AXIOM/KPI/Admin/PRC escalation content. Dashboard remains read-only.

**AMBER** — Mayurika review pending. All tables remain PREVIEW until Mayurika confirms.

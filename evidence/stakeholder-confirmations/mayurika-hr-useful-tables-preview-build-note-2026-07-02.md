---
name: mayurika-hr-useful-tables-preview-build-note-2026-07-02
type: build-note
date: 2026-07-02
domain: Mayurika HR
created-by: Mareenraj (builder)
status: PREVIEW BUILD — pending Mayurika review
scope: evidence/stakeholder-confirmations — build provenance record only; do not treat as operational approval
root-truth: CLAUDE.md — canonical; this file is a build provenance note only
---

# Mayurika HR Useful Tables — Preview Build Note (2026-07-02)

**Date:** 2026-07-02
**Domain:** Mayurika HR
**Build type:** Preview — read-only tables added to web-view/index.html for later Mayurika review

---

## Reason for Preview Build

Mayurika is currently busy. The 5 PASS tables identified in the discovery process are being built as **read-only preview tables** for Mayurika to review when she is available.

These tables are NOT active or approved HR operational content. They are source-backed display views only. Mayurika must review and confirm them before their status can change to ACTIVE.

---

## Built Scope — 5 Tables Added (PREVIEW)

The following 5 tables were added to the Mayurika HR tab in `web-view/index.html` under the section heading "Mayurika HR Useful Tables — Preview":

| # | Table Name | Primary Source | Safe Status |
|---|---|---|---|
| 1 | Leave Notice Periods & Approval Levels | SRC-POLICY-001 §6.1–§6.2 | PASS |
| 2 | Leave Types at a Glance | SRC-POLICY-001 §6.1–§6.5 | PASS |
| 3 | Employment Status Reference & PDPA Compliance Indicator | SRC-MAYU-001 | PASS |
| 4 | Staff Review Milestone Calendar | SRC-MD-HR-001 §10.9; SRC-MAYU-001 | PASS |
| 5 | Probation Record Monitoring | SRC-MAYU-001; SRC-POLICY-001 §6.2 | PASS |

Each table is marked PREVIEW in the dashboard. No table is marked ACTIVE.

---

## Excluded — Not Built

| Table | Status | Reason |
|---|---|---|
| Month 1 Status Categories | AMBER — not built | Primary domain is Suman's recruitment/handover process. Build only after Mayurika confirms she wants it AND Suman is notified. |

---

## Sensitive-Data Check

| Data Type | Present in Any Built Table? |
|---|---|
| Individual staff names | NO — all tables are process-level and definitional |
| Salary or compensation data | NO |
| Individual health or medical data | NO |
| PDPA personal data | NO — PDPA compliance indicator shows field name and compliance rule only |
| Individual AXIOM band placements | NO — AXIOM explicitly excluded from all tables |
| Recruitment candidate personal data | NO |
| Disciplinary case details | NO — Probation table scoped to monitoring only |
| Individual grievance records | NO |

**Sensitive-data check: PASS**

---

## Known Limits

- These preview tables do not create new HR policy. They are read-only display extracts of content already in registered source documents.
- These preview tables do not replace CLAUDE.md, source-register.md, or any registered source files. CLAUDE.md remains canonical.
- These tables do not resolve any open [VERIFY] item. All 9 open items in context/verify-register.md remain open.
- AXIOM bands, KPI trigger rules, incident escalation paths, and PRC/Admin escalation paths are NOT included in any table.
- The Rajiv / Admin Manager workbench remains BLOCKED — no Admin Manager content has been added.
- Suman and Arun domain statuses are unchanged.
- Mayurika's workbench status remains DRAFT — this build note does not change that.

---

## Review Required Before ACTIVE

**Mayurika must review and confirm** before any table status changes from PREVIEW to ACTIVE:

1. Confirm the table wording and column content is operationally accurate for her daily use.
2. Confirm the source references are correct.
3. Confirm no sensitive data is present.
4. Confirm she wants the Month 1 Status Categories table (AMBER) — if yes, Suman must be notified before build.

---

## Files Created or Edited in This Task

| File | Action |
|---|---|
| `evidence/stakeholder-confirmations/mayurika-hr-useful-tables-preview-build-note-2026-07-02.md` | CREATED — this file |
| `validation/mayurika-hr-useful-tables-preview-build-check.md` | CREATED |
| `web-view/index.html` | EDITED — 5 preview tables added to Mayurika HR tab |
| `validation/web-view-html-dashboard-check.md` | EDITED — new section added |
| `handover/2026-06-30__member-aios-3-draft-workbench-closure.md` | EDITED — tables build recorded |

---

## Reference Discovery Files

| File | Role |
|---|---|
| `evidence/table-discovery/mayurika-hr-useful-tables-source-check-2026-07-02.md` | Source discovery — all 6 candidate tables assessed; 5 PASS, 1 AMBER |
| `validation/mayurika-hr-useful-tables-discovery-check.md` | Discovery validation — confirms discovery was performed correctly |

---

*This file is a build provenance note. It records what was built and why. It does not constitute Mayurika's review or approval. It does not change any source-register entry. It does not resolve any [VERIFY] item.*

---
name: ph-team-kpi-business-rule-review
type: evidence-review
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
status: OPEN — awaiting Arun confirmation
source-boundary: CLAUDE.md §7, SRC-ARUN-001, SRC-ARUN-CONF-001, member-aios/arun-implementation/data-source-maps/arun-ph-live-report-data-source-map-2026-07-06.md
root-truth: CLAUDE.md — canonical; this file is a review request, not a decision
---

# PH Team KPI Business Rule — Review — 2026-07-13

## Purpose

The shared PH Team KPI staging design (`database-design/staff-ph-kpi-staging-schema-draft.md`) has table structure but no KPI business content — every formula, weight, target, and threshold field is `[VERIFY]`. This file asks Arun to confirm the missing rules, and confirms two structural points (shared records, audit-only actor identity) that do not require his approval to state but do require his acknowledgement to rely on operationally.

## Source

- CLAUDE.md §7.1–§7.10 (KPI/AXIOM context)
- SRC-ARUN-001, SRC-ARUN-CONF-001
- `member-aios/staff-data/data-maps/ph-team-kpi-shared-data-map-draft.md`
- `member-aios/arun-implementation/data-source-maps/arun-ph-live-report-data-source-map-2026-07-06.md`

## Evidence — Confirmed vs. Open

| Item | Status | Evidence |
|---|---|---|
| PH Team KPI names (Portfolio Holders): YOY Growth (30%+), Individual Staff Net Sales, Category Profitability | CONFIRMED (names only) | CLAUDE.md §7.1 |
| Individual Staff Net Sales bands (Red/Amber/Green/Dark Green/Purple) and NNV bands | CONFIRMED (ranges) | CLAUDE.md §7.2 |
| Review inputs include Arun (Implementation Officer) feedback and Paraparan (External Auditor) feedback | CONFIRMED | CLAUDE.md §7.4, SRC-ARUN-CONF-001 |
| Review outputs: AXIOM Score, AXIOM Band, NNV Band, Risk Level, Coaching/Training Requirement, Warning/PIP Status, Bonus Eligibility, Promotion Candidate Status | CONFIRMED (labels only) | CLAUDE.md §7.5 |
| Weekly AXIOM workflow cadence | CONFIRMED | CLAUDE.md §7.6 |
| Category Profitability — exact formula | **[VERIFY]** | Not documented in any registered source |
| KPI weighting — how the 3 PH KPIs combine into one AXIOM score | **[VERIFY]** | Not documented |
| Target values (beyond "30%+ YOY Growth") | **[VERIFY]** | Not documented per-KPI |
| Threshold values (risk-trigger points) | **[VERIFY]** | Not documented for PH-specific KPIs beyond the general 30% YOY figure |
| Evidence submission format/frequency for Auditor Feedback | **[VERIFY]** | CLAUDE.md §7.8 pointer only |
| Approval state (is any of the above finalized, or still draft?) | **[VERIFY]** | No approval record exists |
| Underlying data sources to populate real KPI values (sales, inventory, PPC, pricing, listing, historical baseline) | **[VERIFY] — AMBER**, 6 of 8 areas MISSING, 1 PARTIAL, 1 BLOCKED | `arun-ph-live-report-data-source-map-2026-07-06.md` §5 |

## Issue

The staging schema (`database-design/staff-ph-kpi-staging-schema-draft.md`) can hold KPI data once these rules exist, but currently holds none. No KPI value can be recorded, scored, or reviewed until Arun confirms the open items above — and, independently, the PH live-report data-source gate (6 of 8 areas MISSING) must also clear before real KPI *values* (as opposed to definitions) can be populated.

## Decision Required — Questions for Arun

- [ ] **KPI names** — is the 3-KPI list for Portfolio Holders (YOY Growth, Individual Staff Net Sales, Category Profitability) complete, or are there additional PH-specific KPIs not yet documented?
- [ ] **Definitions** — precise definition of "Category Profitability" (what is a "category," how is profitability measured)?
- [ ] **Formulas** — the exact calculation for each KPI, beyond the confirmed 30% YOY growth threshold?
- [ ] **Frequency** — confirm weekly cadence applies to all 3 PH KPIs, or do any differ?
- [ ] **Target** — numeric target for each KPI beyond the general 30% YOY figure?
- [ ] **Threshold** — the risk-detection threshold for each KPI (as CLAUDE.md §7.3 already defines for YOY Growth generally — does the same 30% threshold apply identically at PH-team level, or does PH have a distinct threshold)?
- [ ] **Evidence** — what evidence format (document, screenshot, export) is expected to back each KPI value, and how does that map to the `kpi_evidence` table design?
- [ ] **Owner** — confirm Arun as owner of `kpi_definitions` and `kpi_assignments` (as already stated in the shared data map) — any exception?
- [ ] **Reviewer** — confirm Paraparan as the auditor-feedback reviewer role for `kpi_result_values`/`kpi_evidence` — any other reviewer role needed (e.g. Mayurika, MD)?
- [ ] **Approval state** — should any of the confirmed labels (§7.1, §7.2) be treated as final/approved for dashboard display, or are they still draft pending MD review (per CLAUDE.md's overall v0.1 status)?

## Structural Confirmations (For Arun's Acknowledgement, Not Approval)

These are stated by the staging design already and do not require Arun to invent new content — only to confirm he is comfortable relying on them operationally:

- **Arun and Paraparan use the same KPI records.** The design has one `kpi_result_values` table per assignment/period — not one per reviewer. See `data-maps/ph-team-kpi-shared-data-map-draft.md` §3.
- **Actor identity (`actor_role` / `recorded_by_role`) is audit metadata only.** It records who entered or reviewed a value; it does not create a separate value, definition, or truth per actor. No "Arun's KPI truth" vs. "Paraparan's KPI truth" exists or is intended.
- **No separate KPI truth is created** by this design — one `kpi_definitions` row per KPI per team scope, full stop.

## Owner

Arun (Implementation Officer — sole KPI/AXIOM authority, CLAUDE.md §5, §7.2).

## Reviewer

Mareenraj (builder) — facilitates and encodes Arun's confirmed rules into the schema once provided; does not define KPI content.

## Status

**OPEN** — all formula/weight/target/threshold/evidence-format/approval-state items unresolved (7 of 10 listed items in the Evidence table are `[VERIFY]`; 3 are confirmed at label-level only).

## Pass/Fail Rule

PASS if Arun provides explicit answers to the Decision Required items and acknowledges the Structural Confirmations. FAIL if any KPI formula, weight, target, or threshold is populated into the staging schema without Arun's confirmation, or if a separate per-person KPI table or view is ever built in place of the shared design.

## Next Step

Route to Arun. On response, record as a stakeholder confirmation, update `data-maps/ph-team-kpi-shared-data-map-draft.md` §4, and only then consider populating `kpi_definitions` — as a separate, explicitly authorized task. The PH live-report data-source gate (6 of 8 areas MISSING) remains independent and must also be cleared before real KPI *values* can be recorded, regardless of this review's outcome.

## Known Limits

- This review does not unblock the PH live-report data-source gate.
- Does not resolve Paraparan's designation conflict (separate review file) — that conflict does not block this review's KPI-content questions, since the schema references Paraparan by role, not job title.
- Does not create, populate, or approve any KPI definition.

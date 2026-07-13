---
name: ph-team-kpi-shared-data-map-draft
type: data-map
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
status: DRAFT — data-model design only; no KPI business rules defined; no database created
source-boundary: SRC-ARUN-001, SRC-ARUN-CONF-001, SRC-MD-ARUN-001, CLAUDE.md §7
root-truth: CLAUDE.md — canonical; this file is a documentation-only data map
---

# PH Team KPI — Shared Data Map (Draft) — 2026-07-13

**Root Truth Rule:** This file designs a shared data model for PH Team KPI records used by both Arun and Paraparan. It does not define, invent, or approve any KPI formula, target, threshold, or weight — those remain Arun's authority (CLAUDE.md §5, §7) and, where undocumented, are marked `[VERIFY]` per CLAUDE.md §2.

---

## 1. Requirement

Per this task's instruction:

- Arun and Paraparan must use the **same** PH Team KPI records.
- **One shared KPI workflow.** One shared database design.
- **Do not create separate Arun-KPI and Paraparan-KPI tables.**
- **PH** is the canonical PH Team identifier (SRC-MAYU-CONF-004; consistent with `source-maps/hr-staff-source-map-draft.md` §5).
- KPI definitions, formulas, targets, thresholds, and weights must not be invented — mark missing rules `[VERIFY]`.

---

## 2. Why Arun and Paraparan Share One Model

| Person | Role (as known from registered sources) | Relationship to PH Team KPI |
|---|---|---|
| Arun | Implementation Officer — sole authority for KPI definitions and AXIOM band placement (CLAUDE.md §5, §7.2; SRC-ARUN-001) | Owns KPI definitions, thresholds, band placement |
| Paraparan | External Auditor (SRC-ARUN-CONF-001, 2026-06-30 — "Implementation Officer – Arunraj Feedback... External Auditor: Paraparan"); also present in the HR-provided PDF roster (DWL310, "Accountant") — role title in the PDF is `[VERIFY]` against the confirmed External Auditor designation, since the two sources describe the role differently | Reviews / provides Auditor Feedback that is a confirmed KPI review input (CLAUDE.md §7.4) |

Both roles consume and act on the **same underlying PH Team performance facts** — there is exactly one true set of "how is the PH Team doing" data. Arun defines and applies the KPI rules; Paraparan's auditor feedback is itself a review input into that same record set (CLAUDE.md §7.4 — "Auditor Feedback (External Auditor: Paraparan)"). Building separate tables per person would fork a single source of truth into two, contradicting CLAUDE.md §16's concern about management file/decision disorganization and this AIOS's core duplicate-truth discipline. **One shared schema, with `owner_role`/`reviewer_role` columns to record who touched what, is the correct design — not per-person tables.**

**Note on Paraparan's designation conflict:** SRC-ARUN-CONF-001 (Arun-confirmed, 2026-06-30) names Paraparan as External Auditor. The HR-provided PDF (this task's staff source, §1b of the source map) records Paraparan's designation as "Accountant" (DWL310, department/team "Accountant"/`[VERIFY]` — see normalized CSV). This map does not resolve the conflict — it is flagged `[VERIFY]` for Arun/HR to reconcile, and does not block the shared-schema design below, since the schema references Paraparan by role (`reviewer`) rather than by a single fixed designation.

---

## 3. Shared Workflow (Documentation-Level, Not Implemented)

```
Weekly AXIOM data collection (CLAUDE.md §7.6, Arun's authority)
        ↓
kpi_result_values recorded against kpi_assignments (PH Team scope)
        ↓
kpi_evidence attached (source documents / review notes)
        ↓
Arun reviews (KPI/AXIOM authority) ──┬── same record set ──┬── Paraparan reviews (Auditor Feedback input, CLAUDE.md §7.4)
        ↓                                                    ↓
kpi_audit_history logs both review actions against the SAME kpi_result_values row
        ↓
Management dashboard / PRC review draws from the one shared table set (CLAUDE.md §7.10)
```

No step in this workflow creates a person-specific copy of KPI data. "Arun's view" and "Paraparan's view" are both queries (see `query-packs/staff-data-query-pack-draft.md`) filtered by `reviewer_role`, not separate storage.

---

## 4. What Is Confirmed vs. `[VERIFY]`

| Item | Status | Source |
|---|---|---|
| PH is the canonical PH Team identifier | CONFIRMED | SRC-MAYU-CONF-004 |
| KPI review inputs include Auditor Feedback (Paraparan) and Implementation Officer feedback (Arun) | CONFIRMED | CLAUDE.md §7.4, SRC-ARUN-CONF-001 |
| Review outputs: AXIOM Score, AXIOM Band, NNV Band, Risk Level, Coaching/Training Requirement, Warning/PIP Status, Bonus Eligibility, Promotion Candidate Status | CONFIRMED (labels only) | CLAUDE.md §7.5 |
| KPI definitions for the Portfolio Holders team: "30%+ YOY Growth, Individual Staff Net Sales, Category Profitability" | CONFIRMED (labels only — no formula/weight detail) | CLAUDE.md §7.1 |
| Individual Staff Net Sales bands (Red/Amber/Green/Dark Green/Purple) and NNV bands | CONFIRMED (ranges) | CLAUDE.md §7.2 |
| Exact formula for "Category Profitability" | **[VERIFY]** | Not documented anywhere in registered sources |
| Per-KPI weighting (how the 3 PH KPIs combine into one AXIOM score) | **[VERIFY]** | Not documented |
| Data source systems for sales, inventory, PPC, pricing, listing, historical baseline (needed to actually populate `kpi_result_values`) | **[VERIFY] — AMBER**, 6 of 8 areas MISSING | `member-aios/arun-implementation/data-source-maps/arun-ph-live-report-data-source-map-2026-07-06.md` |
| Paraparan's exact designation (External Auditor vs. Accountant) | **[VERIFY]** | Conflict between SRC-ARUN-CONF-001 and the HR-provided PDF — see §2 |
| Evidence submission format/frequency for Auditor Feedback | **[VERIFY]** | CLAUDE.md §7.8 pointer only — no format documented |

**This map does not invent values for any `[VERIFY]` row above.** The staging schema (`database-design/staff-ph-kpi-staging-schema-draft.md`) is built to hold these values once confirmed — it does not populate them.

---

## 5. Design Constraints Carried Into the Staging Schema

- One `kpi_definitions` table, one `kpi_assignments` table, one `kpi_result_values` table, one `kpi_evidence` table, one `kpi_audit_history` table — **not** duplicated per person.
- Every table includes an `owner_role` or `actor_role` column (values from a small enum: `arun`, `paraparan`, `mayurika`, `system`) to record who did what, without forking storage.
- `department_team_scope` on `kpi_assignments` uses the canonical value `PH` — consistent with the staff dashboard's normalized `department_team` column.
- No table stores an individual's AXIOM score outside the aggregate/process-level rule already in CLAUDE.md §6 — see the schema's per-table sensitivity notes.
- No salary, bonus amount, or compensation figure in any KPI table (CLAUDE.md §6, §7.9 references bonus *eligibility status*, not amounts).

---

## 6. What This Map Does Not Do

- Does not define any KPI formula, weight, or threshold not already in CLAUDE.md §7.
- Does not resolve Paraparan's designation conflict (§2).
- Does not create any database object.
- Does not unblock the PH live-report data-source gate (`arun-ph-live-report-data-source-map-2026-07-06.md` §9) — that gate is independent of this staging design and remains AMBER.

---

## 7. Next Step

Route to Arun (KPI/AXIOM domain owner, CLAUDE.md §18) to confirm: Category Profitability formula, KPI weighting, and Paraparan's designation. Route to Mayurika for the HR-side designation conflict in the staff roster.

*File created: 2026-07-13.*

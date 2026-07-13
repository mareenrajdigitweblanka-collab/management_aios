---
name: staff-ph-kpi-staging-schema-draft
type: database-design
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
status: DRAFT — design only, NOT executed, NOT applied to any database
source-boundary: CLAUDE.md §6, §7, §9.1; SRC-MAYU-CONF-004; SRC-ARUN-001; SRC-ARUN-CONF-001
root-truth: CLAUDE.md — canonical; this file is a documentation-only design draft
---

# Staff + PH-Team KPI — Staging Database Design (Draft) — 2026-07-13

**This is a design document, not executable SQL.** No `CREATE`, `ALTER`, or `INSERT` statement in this file has been run. No PostgreSQL object described here exists. Applying this design is a separate, explicitly authorized step (see `WORKBENCH.md` §5).

**Root Truth Rule:** This file does not replace CLAUDE.md, does not define KPI business rules, and does not establish company-wide database policy. It is dashboard-specific.

**Excluded everywhere in this design:** salary, home address, personal email, personal phone/contact number, guardian phone/number (CLAUDE.md §6 and this task's explicit instruction). No table below has a column for any of these.

---

## 0. Design Principles

1. **One shared KPI model.** Arun and Paraparan (and any future reviewer) act on the *same* `kpi_result_values` rows — no per-person KPI tables. Role is recorded via an `actor_role` column, not via separate schemas.
2. **`PH` is the canonical PH Team scope value**, consistent with the normalized staff CSV's `department_team` column (SRC-MAYU-CONF-004).
3. **Staging, not truth.** Every table carries a `source_scope` / `is_official_truth` pair (pattern already established in `database/member_schedule_events_schema.sql`), defaulting to non-official, so no application code can silently promote staged data to authoritative status.
4. **Duplicate-prevention is explicit per table**, not assumed — see the known source-data duplicate `employee_number` issue (source map §4.2), which this design must tolerate rather than crash on.
5. **No KPI values invented.** `kpi_definitions.formula_description`, `weight`, `target_value`, and `threshold_value` are nullable and must stay `NULL`/`[VERIFY]` until Arun confirms them (see `data-maps/ph-team-kpi-shared-data-map-draft.md` §4).

---

## 1. `staff_dashboard_records`

| Attribute | Detail |
|---|---|
| **Purpose** | Holds the staged staff roster for the Current Staff / Onboarding / Resigned dashboard views, populated from `source/normalized/hr-staff-dashboard.csv` once authorized. |
| **Source** | HR-provided PDF (unregistered — see `source-maps/hr-staff-source-map-draft.md` §1b), staged via the normalized CSV. HR (Mayurika) remains the authoritative source; this table is a dashboard read copy. |
| **Primary key** | `id UUID` (surrogate — see uniqueness rule; `employee_number` is explicitly **not** used as PK because the source contains confirmed duplicates) |
| **Foreign keys** | None inbound. Referenced by `kpi_assignments.staff_record_id` (nullable, optional link — see §4) and `employment_stage_classifications.staff_record_id`. |
| **Uniqueness rule** | **No uniqueness constraint on `employee_number`** at this stage — the source has 11 rows across 5 reused codes (`DWL302` ×3, `DWL296`/`DWL303`/`DWL305`/`DWL319` ×2 each; see source map §4.2). A `(employee_number, source_row_reference)` composite is unique (one row per parsed source line), but `employee_number` alone is not a safe uniqueness key until HR resolves the duplicates. |
| **Owner/Reviewer** | Owner: Mayurika (HR data content). Reviewer: technical reviewer for schema mechanics. |
| **Status** | DRAFT — not created |
| **Source/evidence fields** | `source_file`, `source_page`, `source_row_reference` (mirrors the normalized CSV's traceability columns) |
| **created_at / updated_at** | `TIMESTAMPTZ NOT NULL DEFAULT now()` / `TIMESTAMPTZ NOT NULL DEFAULT now()` |
| **created_by / updated_by** | `TEXT NULL` — free-text actor identifier (e.g. `"import:hr-staff-dashboard-csv"`), not a foreign key to an auth system (none exists yet — see security limitation) |
| **Duplicate-prevention rule** | Composite uniqueness on `(employee_number, source_row_reference)` prevents re-importing the exact same source row twice. It does **not** prevent two genuinely different people sharing an `employee_number` (that is a source data defect to be fixed by HR, not masked by a constraint that would reject valid-but-differently-keyed rows). |
| **Known limitations** | `employee_number` is not a safe unique staff key until the 5 duplicate codes are resolved. `epf_number` and `employment_stage` are `[VERIFY]` for all rows. No link to any authentication/identity system exists yet. |

**Columns (design-level, mirrors the approved CSV field list):** `id`, `employee_number`, `epf_number`, `date_of_joining`, `full_name`, `calling_name`, `location`, `staff_status`, `department_team`, `designation`, `cv_reference`, `nic`, `remarks`, `employment_stage`, `source_file`, `source_page`, `source_row_reference`, `source_scope`, `is_official_truth`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`.

---

## 2. `employment_stage_classifications`

| Attribute | Detail |
|---|---|
| **Purpose** | Records the HR-approved employment-stage classification (Permanent / Probation / 7-Day Training) for a staff record, once a derivation rule exists. Kept as a separate table (not a plain column overwrite on `staff_dashboard_records`) so the *history* of stage changes and *who approved* each classification is preserved. |
| **Source** | Mayurika / HR — no source exists yet, since no HR-approved rule has been defined (`ph-team-kpi-shared-data-map-draft.md` is KPI-specific; this table's gap is documented in `source-maps/hr-staff-source-map-draft.md` §6). |
| **Primary key** | `id UUID` |
| **Foreign keys** | `staff_record_id → staff_dashboard_records.id` (required) |
| **Uniqueness rule** | `(staff_record_id, effective_from)` unique — a staff record may have multiple classifications over time (stage changes), but not two effective at the identical timestamp. The *current* stage is the row with the latest `effective_from` and `effective_to IS NULL`. |
| **Owner/Reviewer** | Owner: Mayurika. No reviewer assigned yet — pending the rule itself. |
| **Status** | DRAFT — not created; blocked on an HR-approved derivation rule |
| **Source/evidence fields** | `classification_rule_reference TEXT NULL` — a pointer to whatever document defines the rule, once one exists; `[VERIFY]` until then |
| **created_at / updated_at** | Standard, as §1 |
| **created_by / updated_by** | `TEXT NULL` |
| **Duplicate-prevention rule** | `(staff_record_id, effective_from)` uniqueness as above; application logic (not yet built) would be responsible for closing out the prior row's `effective_to` when a new classification is inserted. |
| **Known limitations** | Entirely unpopulated until HR defines the rule. `stage_value` is constrained to the three approved enum values only (`Permanent`, `Probation`, `7-Day Training`) — no `Intern` or other value may be added without an equivalent explicit approval, per this task's instruction not to invent a fourth category. |

**Columns:** `id`, `staff_record_id`, `stage_value` (CHECK IN Permanent/Probation/7-Day Training), `effective_from`, `effective_to`, `classification_rule_reference`, `source_scope`, `is_official_truth`, `created_at`, `updated_at`, `created_by`, `updated_by`.

---

## 3. `kpi_definitions`

| Attribute | Detail |
|---|---|
| **Purpose** | Holds the *definition* of each KPI (name, description, formula, weight, target, threshold) — one row per KPI, shared by every team that uses it, not duplicated per reviewer. |
| **Source** | Arun (KPI/AXIOM authority, CLAUDE.md §5, §7.2) for formula/weight/threshold content; CLAUDE.md §7.1 for the confirmed KPI *names* only (e.g. "30%+ YOY Growth", "Individual Staff Net Sales", "Category Profitability" for Portfolio Holders). |
| **Primary key** | `id UUID` |
| **Foreign keys** | None inbound. Referenced by `kpi_assignments.kpi_definition_id`. |
| **Uniqueness rule** | `(kpi_name, team_scope)` unique — one definition per KPI name per team scope (a KPI like "YOY Growth" may have different targets for different teams, but PH Team's "YOY Growth" definition is singular and shared by everyone who reviews PH). |
| **Owner/Reviewer** | Owner: Arun. No other role may write this table (CLAUDE.md §5 — Arun "does not write" boundary reserved for others; KPI definitions are Arun's sole authority). |
| **Status** | DRAFT — not created; `formula_description`, `weight`, `target_value`, `threshold_value` are `[VERIFY]` for every row per `ph-team-kpi-shared-data-map-draft.md` §4 |
| **Source/evidence fields** | `source_reference TEXT NULL` — pointer to the registered source (e.g. "CLAUDE.md §7.1", "SRC-ARUN-001") backing this definition |
| **created_at / updated_at** | Standard, as §1 |
| **created_by / updated_by** | `TEXT NULL` — expected to be `"arun"` for any real write, enforced at the application layer (no DB-level role system exists yet) |
| **Duplicate-prevention rule** | `(kpi_name, team_scope)` uniqueness prevents two conflicting definitions of the same KPI for the same team from coexisting. |
| **Known limitations** | Every row currently has `formula_description`, `weight`, `target_value`, `threshold_value = NULL` / `[VERIFY]` — this table's *structure* is designed, but it holds no real KPI business rules yet, per this task's explicit instruction not to invent them. |

**Columns:** `id`, `kpi_name`, `team_scope` (e.g. `PH`), `formula_description` `[VERIFY]`, `weight` `[VERIFY]`, `target_value` `[VERIFY]`, `threshold_value` `[VERIFY]`, `source_reference`, `source_scope`, `is_official_truth`, `created_at`, `updated_at`, `created_by`, `updated_by`.

---

## 4. `kpi_assignments`

| Attribute | Detail |
|---|---|
| **Purpose** | Links a `kpi_definitions` row to the PH Team scope (and, optionally, a specific staff record) for a given review period — this is the "who/what this KPI applies to" join table. Shared by Arun and Paraparan; not duplicated. |
| **Source** | Arun (assignment authority follows from KPI definition authority, CLAUDE.md §7.2) |
| **Primary key** | `id UUID` |
| **Foreign keys** | `kpi_definition_id → kpi_definitions.id` (required); `staff_record_id → staff_dashboard_records.id` (nullable — a KPI can be assigned at the team level without a specific staff link, e.g. an aggregate PH-Team KPI) |
| **Uniqueness rule** | `(kpi_definition_id, department_team_scope, staff_record_id, review_period)` unique — prevents the same KPI being assigned twice to the same scope/period. `department_team_scope` is always `PH` for this design's initial use case but is not hard-coded, so the table can extend to other teams without a schema change. |
| **Owner/Reviewer** | Owner: Arun. Reviewed by: Paraparan (as Auditor Feedback input — read access, not write authority over the assignment itself). |
| **Status** | DRAFT — not created |
| **Source/evidence fields** | `assignment_basis_reference TEXT NULL` — pointer to the review cycle or meeting record that created this assignment |
| **created_at / updated_at** | Standard, as §1 |
| **created_by / updated_by** | `TEXT NULL` |
| **Duplicate-prevention rule** | Composite uniqueness above. `department_team_scope` values are restricted to a small controlled set (starting with `PH` only) via CHECK constraint, mirroring the staff table's normalized `department_team` value, so scope strings can't drift into unnormalized variants. |
| **Known limitations** | `review_period` format (weekly per CLAUDE.md §7.6, or another cadence) is `[VERIFY]` — CLAUDE.md §7.6 states "Collect data weekly" but does not define a canonical period-key format for this table. |

**Columns:** `id`, `kpi_definition_id`, `department_team_scope` (CHECK, starts as `PH`-only), `staff_record_id` (nullable), `review_period`, `assignment_basis_reference`, `source_scope`, `is_official_truth`, `created_at`, `updated_at`, `created_by`, `updated_by`.

---

## 5. `kpi_result_values`

| Attribute | Detail |
|---|---|
| **Purpose** | The actual recorded value for a KPI assignment in a given review period — this is the single shared record set both Arun and Paraparan act on (see `ph-team-kpi-shared-data-map-draft.md` §3 workflow diagram). |
| **Source** | Weekly AXIOM data collection process (CLAUDE.md §7.6), Arun's authority to enter/confirm values; Paraparan's Auditor Feedback is a distinct evidence input (see `kpi_evidence`, §6), not a competing value row. |
| **Primary key** | `id UUID` |
| **Foreign keys** | `kpi_assignment_id → kpi_assignments.id` (required) |
| **Uniqueness rule** | `(kpi_assignment_id, review_period)` unique — one recorded value per assignment per period; corrections are handled by a new row with a later `recorded_at` plus an entry in `kpi_audit_history`, not by silently overwriting the value (auditability). |
| **Owner/Reviewer** | Owner: Arun (records/confirms the value). Reviewer: Paraparan (Auditor Feedback, recorded separately in `kpi_evidence`, referencing the same `kpi_result_values.id`). |
| **Status** | DRAFT — not created |
| **Source/evidence fields** | `recorded_value NUMERIC NULL`, `recorded_by_role`, and a link to `kpi_evidence` rows (§6) for the underlying proof |
| **created_at / updated_at** | Standard, as §1 |
| **created_by / updated_by** | `TEXT NULL` — expected `"arun"` for initial recording |
| **Duplicate-prevention rule** | `(kpi_assignment_id, review_period)` uniqueness; a value correction requires inserting a new row referencing the same assignment/period is **not** permitted by this constraint on purpose — corrections must instead be logged via `kpi_audit_history` against the existing row, preserving one authoritative value per period. |
| **Known limitations** | No individual staff AXIOM score may be stored here in a way that's queryable by staff name at an individual level for dashboard display beyond aggregate/process-level use (CLAUDE.md §6) — this is an application-layer display constraint on top of the schema, not a column-level one, and must be enforced wherever this table is queried for UI. |

**Columns:** `id`, `kpi_assignment_id`, `review_period`, `recorded_value`, `recorded_by_role` (CHECK IN `arun`,`paraparan`,`mayurika`,`system`), `source_scope`, `is_official_truth`, `created_at`, `updated_at`, `created_by`, `updated_by`.

---

## 6. `kpi_evidence`

| Attribute | Detail |
|---|---|
| **Purpose** | Stores references to the evidence backing a `kpi_result_values` row — this is where Paraparan's Auditor Feedback (CLAUDE.md §7.4) and Arun's supporting documentation both attach, against the *same* result row, rather than each having a private evidence table. |
| **Source** | Arun (Implementation Officer feedback), Paraparan (Auditor Feedback) — both confirmed as review inputs (CLAUDE.md §7.4, SRC-ARUN-CONF-001) |
| **Primary key** | `id UUID` |
| **Foreign keys** | `kpi_result_value_id → kpi_result_values.id` (required) |
| **Uniqueness rule** | None required at the row level — multiple evidence entries (from different actors, at different times) may legitimately attach to one result value. Prevented duplication is instead at the `(kpi_result_value_id, actor_role, evidence_reference)` level, to stop the exact same evidence being logged twice by the same actor. |
| **Owner/Reviewer** | Owner: whichever `actor_role` submitted the row (Arun or Paraparan). No single fixed owner — this is intentionally a multi-contributor table. |
| **Status** | DRAFT — not created; evidence submission format/frequency is `[VERIFY]` (CLAUDE.md §7.8 pointer only) |
| **Source/evidence fields** | `evidence_reference TEXT NULL` (e.g. a document path or note, not a raw file blob), `actor_role` |
| **created_at / updated_at** | Standard, as §1 |
| **created_by / updated_by** | `TEXT NULL` |
| **Duplicate-prevention rule** | `(kpi_result_value_id, actor_role, evidence_reference)` unique — stops one actor re-logging identical evidence, while allowing Arun and Paraparan to both log evidence against the same result. |
| **Known limitations** | No file storage — `evidence_reference` is a pointer/text field only, consistent with "do not copy raw PDF content into Markdown evidence" applied by extension to this schema (no raw document blobs in the database design). |

**Columns:** `id`, `kpi_result_value_id`, `actor_role` (CHECK IN `arun`,`paraparan`,`mayurika`), `evidence_reference`, `source_scope`, `is_official_truth`, `created_at`, `updated_at`, `created_by`, `updated_by`.

---

## 7. `kpi_audit_history`

| Attribute | Detail |
|---|---|
| **Purpose** | Append-only log of every create/update/review action taken against `kpi_result_values` (and, optionally, `kpi_definitions`/`kpi_assignments`) — the single audit trail both Arun's and Paraparan's actions are recorded into, so "who changed/reviewed what, when" is answerable from one table regardless of actor. |
| **Source** | System-generated, triggered by application-layer writes to the tables above (no trigger/application code is being built in this task — this is a design placeholder). |
| **Primary key** | `id UUID` |
| **Foreign keys** | `kpi_result_value_id → kpi_result_values.id` (required for this initial scope; could extend to reference `kpi_definitions.id` or `kpi_assignments.id` via a nullable polymorphic-style pair of columns if audit coverage is later widened — not designed further here, flagged as a known limitation) |
| **Uniqueness rule** | None — audit logs are append-only by nature; every action is its own row. |
| **Owner/Reviewer** | System-owned; readable by Arun, Paraparan, Mayurika, and MD (per the "initial internal users" list in `README.md`). |
| **Status** | DRAFT — not created |
| **Source/evidence fields** | `action_type` (`created`/`updated`/`reviewed`), `actor_role`, `detail_reference TEXT NULL` (pointer to what changed, not a full diff blob) |
| **created_at** | `TIMESTAMPTZ NOT NULL DEFAULT now()` — this table has no `updated_at`/`updated_by` by design (append-only; a correction is a new audit row, not an edit to an old one) |
| **created_by** | `TEXT NULL` |
| **Duplicate-prevention rule** | Not applicable — duplication is not a defect for an append-only audit log (repeated identical actions are legitimate, e.g. two separate confirmations). |
| **Known limitations** | Not yet linked to `kpi_definitions`/`kpi_assignments` changes (§ foreign keys note above) — scoped to `kpi_result_values` only for this draft. No automated trigger exists; population would require application code, which this task does not build. |

**Columns:** `id`, `kpi_result_value_id`, `action_type` (CHECK IN `created`,`updated`,`reviewed`), `actor_role` (CHECK IN `arun`,`paraparan`,`mayurika`,`system`), `detail_reference`, `created_at`, `created_by`.

---

## 8. Cross-Table Summary — Why This Satisfies "One Shared Model"

| Requirement | How this design satisfies it |
|---|---|
| Arun and Paraparan use the same PH Team KPI records | `kpi_result_values` has no `owner`-partitioned duplication; both act on rows joined via `kpi_assignment_id → department_team_scope = 'PH'` |
| One shared KPI workflow | Single `kpi_definitions` → `kpi_assignments` → `kpi_result_values` → `kpi_evidence` → `kpi_audit_history` chain (§0 diagram in `ph-team-kpi-shared-data-map-draft.md` §3) |
| One shared database design | 5 KPI tables total, `actor_role`/`recorded_by_role` columns distinguish contributors — no `arun_kpi_*` / `paraparan_kpi_*` table pairs exist anywhere in this design |
| PH is the canonical identifier | `department_team_scope` CHECK-constrained, starting with `PH` only, consistent across `kpi_assignments` and the staff table's `department_team` |
| No invented KPI rules | `kpi_definitions.formula_description`/`weight`/`target_value`/`threshold_value` are `[VERIFY]`/`NULL` throughout |

---

## 9. What This Design Does Not Do

- Does not create any of the 7 tables above.
- Does not populate any KPI definition, target, threshold, or weight.
- Does not resolve Paraparan's designation conflict (Accountant vs. External Auditor — see `ph-team-kpi-shared-data-map-draft.md` §2).
- Does not build any application code, trigger, or API to write to these tables.
- Does not unblock the PH live-report data-source gate (`member-aios/arun-implementation/data-source-maps/arun-ph-live-report-data-source-map-2026-07-06.md`), which remains AMBER independent of this design.

---

## 10. Next Step

Route to Arun for KPI definition/weight/threshold confirmation, and to a technical reviewer for schema mechanics, before any table in this design is created. See `README.md` §5 / `WORKBENCH.md` §5 for the ordered next-steps list.

*File created: 2026-07-13.*

---
name: staff-data-query-pack-draft
type: query-pack
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
status: DRAFT — illustrative queries against a design that does not exist in any database yet
source-boundary: database-design/staff-ph-kpi-staging-schema-draft.md
root-truth: CLAUDE.md — canonical; this file is a documentation-only query pack
---

# Staff Data — Query Pack (Draft) — 2026-07-13

**These queries are illustrative only.** None have been run against a real database — `staff_dashboard_records`, `kpi_definitions`, `kpi_assignments`, `kpi_result_values`, `kpi_evidence`, and `kpi_audit_history` do not exist anywhere yet (see `database-design/staff-ph-kpi-staging-schema-draft.md`). This pack documents the intended access pattern so the dashboard design (sidebar views + shared filters) and the schema design agree with each other before either is built.

---

## 1. Sidebar View Queries

### 1a. Current Staff

```sql
SELECT employee_number, full_name, calling_name, location, department_team,
       designation, staff_status, employment_stage
FROM management_aios.staff_dashboard_records
WHERE staff_status = 'Active'
  AND deleted_at IS NULL;
```

*Limitation:* `employment_stage` is `[VERIFY]` for every currently-parsed row (see field map §6) — this column will read as unresolved until HR defines the derivation rule. The view should render it as "Pending HR classification" rather than blank, once built.

### 1b. Onboarding Staff Process

```sql
SELECT employee_number, full_name, calling_name, location, department_team,
       designation, date_of_joining, employment_stage
FROM management_aios.staff_dashboard_records
WHERE staff_status = 'Active'
  AND employment_stage IN ('Probation', '7-Day Training')
  AND deleted_at IS NULL;
```

*Limitation:* Returns zero rows until `employment_stage` is populated with real values (currently all `[VERIFY]`). Documented here as the intended query shape, not a working query today.

### 1c. Resigned Staff

```sql
SELECT employee_number, full_name, calling_name, location, department_team,
       designation, date_of_joining
FROM management_aios.staff_dashboard_records
WHERE staff_status = 'Inactive'
  AND deleted_at IS NULL;
```

*Note:* "Inactive" in the source PDF is not necessarily equivalent to "Resigned" (it may also mean terminated, never onboarded, or a data gap — see source map §4). This mapping should be confirmed with Mayurika before the sidebar label "Resigned Staff" is presented to users as authoritative.

---

## 2. Shared Reusable Filters

All three sidebar views share the same three filters, applied as additional `WHERE` clauses on top of the view-specific predicate above:

### 2a. Filter by Team

```sql
-- department_team = 'PH' for Portfolio Holder team; other values are raw,
-- unnormalized strings pending HR confirmation (see field map §5).
AND department_team = :team_filter_value
```

### 2b. Filter by Staff Status

```sql
AND staff_status = :status_filter_value  -- 'Active' | 'Inactive'
```

### 2c. Filter by Employment Stage

```sql
AND employment_stage = :stage_filter_value  -- 'Permanent' | 'Probation' | '7-Day Training'
```

*Limitation:* Until `employment_stage` is populated, this filter is functionally inert (matches nothing) except when literally filtering for `[VERIFY]`. This is disclosed here so the UI design does not silently imply the filter works today.

---

## 3. PH Team KPI Queries (Shared — Not Person-Specific)

### 3a. PH Team KPI Results — Current Period (used identically by Arun and Paraparan)

```sql
SELECT kd.kpi_name, ka.review_period, krv.recorded_value, krv.recorded_by_role
FROM management_aios.kpi_result_values krv
JOIN management_aios.kpi_assignments ka ON ka.id = krv.kpi_assignment_id
JOIN management_aios.kpi_definitions kd ON kd.id = ka.kpi_definition_id
WHERE ka.department_team_scope = 'PH'
  AND ka.review_period = :current_period;
```

There is no `arun_kpi_results` vs. `paraparan_kpi_results` variant of this query — both roles run the same query against the same rows, consistent with the "one shared KPI workflow" requirement (`ph-team-kpi-shared-data-map-draft.md` §3, §8).

### 3b. Evidence Trail for a Given KPI Result (both actors' contributions together)

```sql
SELECT ke.actor_role, ke.evidence_reference, ke.created_at
FROM management_aios.kpi_evidence ke
WHERE ke.kpi_result_value_id = :result_id
ORDER BY ke.created_at;
```

### 3c. Audit History for a Given KPI Result

```sql
SELECT kah.action_type, kah.actor_role, kah.detail_reference, kah.created_at
FROM management_aios.kpi_audit_history kah
WHERE kah.kpi_result_value_id = :result_id
ORDER BY kah.created_at;
```

---

## 4. Duplicate-Key Diagnostic Query (Data-Quality, Not a Dashboard View)

Given the confirmed source-data duplicate `employee_number` values (source map §4.2), any future import job should run this check before treating `employee_number` as reliable for joins:

```sql
SELECT employee_number, COUNT(*) AS row_count
FROM management_aios.staff_dashboard_records
GROUP BY employee_number
HAVING COUNT(*) > 1;
```

Expected result against the current normalized CSV (once imported): 5 rows — `DWL302` (3), `DWL296`/`DWL303`/`DWL305`/`DWL319` (2 each).

---

## 5. What This Pack Does Not Do

- Does not run against any real database — every query above is illustrative.
- Does not resolve the `employment_stage` gap that makes §1b and §2c currently non-functional in practice.
- Does not define access control on top of these queries — no authentication layer exists on the current backend (see security limitation in the validation report).

*File created: 2026-07-13.*

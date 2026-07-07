---
name: mayurika-hr-tab-all-table-headings-removal-check
type: validation
created: 2026-07-07
checked-by: Mareenraj (builder)
scope: web-view/index.html — id="tab-mayurika-hr" (Mayurika HR tab) — full table UI removal correction
status: PASS
---

# Mayurika HR Tab — All Table Headings Removal — Validation Check (2026-07-07)

## Requirement

A browser screenshot showed that the prior task (§45 / `validation/mayurika-hr-tab-table-removal-check-2026-07-07.md`) had not fully removed visible HR table UI: the 6 NSLP table accordions were still displayed as collapsed, expandable headings inside the Mayurika HR tab. The user instructed: "Remove all tables." The updated requirement is that `id="tab-mayurika-hr"` must not visibly show any table headings, collapsed table accordions, table grids, or table previews — only simple, non-technical summary notices, with technical evidence paths kept in a collapsed "Evidence / Technical Details" section.

The user was asked whether the HR Schedule Pilot's 2 tables (Priority Queue, Recurring Templates Register) should also be removed, or only the 6 NSLP tables. The user selected: remove all `<table>` elements in the tab, including the HR Schedule Pilot's 2 tables.

## Screenshot Finding

Collapsed NSLP accordion headings were still visible in the Mayurika HR tab:

- Table 1 — NSLP Skill Register Control
- Table 2 — Action Plan Card Follow-Up
- Table 3 — Before / After Evidence Tracker
- Table 4 — 2-Week Evaluation Queue
- Table 5 — NSLP Exception Register Preview
- Table 6 — Monthly NSLP Management Report Control

These were `<details>`/`<summary>` accordions each containing a full `<table>` element with placeholder rows. Collapsing them (as done in the prior pass) is not the same as removing them — the headings and expand affordance were still visibly present.

## Files Changed

| File | Action |
|---|---|
| `web-view/index.html` | EDITED — NSLP 6-table accordion block removed and replaced with a summary card; HR Schedule Pilot's 2 `<table>` elements (Priority Queue, Recurring Templates Register) converted to non-table text summaries |
| `validation/web-view-html-dashboard-check.md` | EDITED — §46 appended |
| `handover/2026-06-30__web-view-dashboard-closure.md` | EDITED — corrective closure record appended |
| `validation/mayurika-hr-tab-all-table-headings-removal-check-2026-07-07.md` | CREATED (this file) |

## Exact Visible Table Headings Removed

1. Table 1 — NSLP Skill Register Control
2. Table 2 — Action Plan Card Follow-Up
3. Table 3 — Before / After Evidence Tracker
4. Table 4 — 2-Week Evaluation Queue
5. Table 5 — NSLP Exception Register Preview
6. Table 6 — Monthly NSLP Management Report Control

Also removed (per user's scope decision): the `<table>` markup under "Priority Queue — Today (Placeholder)" and "Recurring Templates Register (Reference Only)" inside the HR Schedule Pilot section. Their heading text was kept (renamed without the "(Placeholder)" / "(Reference Only)" table-implying suffix) but reduced to a plain summary paragraph — no `<table>`, `<thead>`, or `<tbody>` markup remains for either.

## Replacement Summary Card Added

**NSLP Control System — Active, Table Display Hidden**

> The NSLP system remains active and approved, but detailed table layouts are hidden from the HR tab for now. Mayurika will prepare required HR table formats and send them to MD. After MD or Varmen confirms the final table structure, confirmed tables can be added back to this dashboard.
>
> Current status:
> - NSLP system: Active
> - Table display: Hidden
> - HR table format: Pending Mayurika draft and MD/Varmen confirmation
> - Dashboard action: No table shown until confirmed

Source/evidence references (`SRC-MAYURIKA-NSLP-001`, `HR.Mayu.Skill.md Section 9`, `member-aios/mayurika-hr/nslp/`, prior and current validation file paths) are kept only inside a collapsed `<details>` "Evidence / Technical Details" element beneath this card — not shown as visible text.

The two HR Schedule Pilot cards were reduced to short text summaries under their existing (slightly renamed) headings, retaining their `[VERIFY]` status notes, without any table grid.

## Confirmation: No `<table>` Remains Inside the Mayurika HR Tab

Verified via `grep -c "<table" ` restricted to the line range between `id="tab-mayurika-hr"` (line 2536) and the next tab panel `id="tab-suman-recruitment"` (line 3195, current file): **0 matches.**

## Confirmation: "Table 1" Through "Table 6" No Longer Appear Inside the Mayurika HR Tab

Verified via `grep -c` for each of "Table 1" through "Table 6" across the same line range: **0 matches for all six.** (An earlier draft of the replacement HTML comment contained the phrase "Table 1–6" inside an HTML `<!-- comment -->`, which is not rendered/visible in a browser; it was nonetheless reworded to "numbered NSLP table accordions" to remove the literal string entirely.)

## Confirmation: NSLP Remains Active as a System, Table Display Hidden

Verified via `grep -c "NSLP Control System — Active"` and `grep -c "NSLP system: Active"` inside the tab range: both present. The NSLP system's ACTIVE / MAYURIKA_OPERATIONAL_ACCEPTANCE_CONFIRMED status (per `SRC-MAYURIKA-NSLP-001`) is stated in the new summary card; only its 6-table visual display was removed, not the underlying system's approved/active status.

## No New HR Table Structure Invented

Confirmed. No new column names, table headers, row structures, or data fields were introduced. The NSLP section was reduced from 6 tables to 4 status bullet lines (Active / Hidden / Pending confirmation / No table shown) — a status summary, not a table format. The two HR Schedule Pilot cards were reduced to prose summaries carrying the same [VERIFY] notes that already existed, with no new placeholder rows or columns added.

## Source-Register Untouched

Confirmed — `git status --short evidence/source-register.md` returns no output.

## CLAUDE.md Untouched

Confirmed — `git status --short CLAUDE.md` returns no output.

## Verify-Register Untouched

Confirmed — `git status --short context/verify-register.md` returns no output.

## Member-AIOS Untouched

Confirmed — `git status --short member-aios/` returns no output.

## Schedules/HR Untouched

Confirmed — `git status --short schedules/hr/` returns no output.

## [VERIFY] Preservation Check

No `[VERIFY]` item was resolved, closed, or altered in count. The dashboard's "9 open" [VERIFY] figure (visible sitewide, including in the retained HR Schedule Pilot checklist and the two converted schedule-pilot summary cards) is unchanged. `context/verify-register.md` was not touched.

**Result: PASS**

## Additional Safety Checks

| Check | Result |
|---|---|
| Sensitive HR/staff/candidate/salary/health/PDPA data added | NOT PRESENT |
| Duplicate truth introduced | NOT PRESENT |
| `evidence/source-intake/` edited | NO |
| `intelligence-inbox/raw-stakeholder-documents/` edited | NO |
| `HR.Mayu.Skill.md` edited | NO |
| Arun files edited | NO |
| Suman files edited | NO |
| BLOS / thresholds / KPI / AXIOM files edited | NO |
| PostgreSQL objects / production database touched | NOT APPLICABLE — static dashboard, no database connection |
| Other tabs' tables touched | NO — only `id="tab-mayurika-hr"` was edited; tables in Arun, Review Queue, File Map, and Markdown Viewer tabs are untouched |
| Dashboard remains read-only (no forms, fetch, backend) | YES — unchanged |
| Netlify deployment wording preserved | YES |
| `<div>` / `<details>` tag balance inside the tab | Balanced (217/217 divs; 3/3 details) — no malformed HTML introduced |

## PASS/AMBER Result

**PASS** — All 6 NSLP table headings/accordions and both HR Schedule Pilot tables were removed from visible display inside `id="tab-mayurika-hr"`. No `<table>` tag or "Table 1"–"Table 6" text remains in the tab. NSLP is shown as an active, approved system with its table display explicitly marked hidden. No new HR table format was invented. All blocked files confirmed untouched via `git status --short`.

## Next Step

When Mayurika sends her HR table formats to MD and MD or Varmen confirms them, register the confirmation as a stakeholder-confirmation source, then rebuild only the confirmed table structure into the NSLP and/or HR Schedule Pilot areas — replacing these summary cards with the approved tables.

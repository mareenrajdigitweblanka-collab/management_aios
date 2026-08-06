---
name: calendar-review-summaries-dedicated-tab-requirement
type: requirement-document
created: 2026-08-06
created-by: Mareenraj (builder)
status: READY FOR TECHNICAL DESIGN — no open business parameters
requirement-id: REQ-CAL-REV-TAB-002
---

# Requirement — Management AIOS Calendar Review Summaries Dedicated Tab (2026-08-06)

> **Correction (2026-08-06, same-day, round 1):** This requirement is corrected to remove an ambiguity in the original wording ("consolidates 5 mounts into 1") that could be read as reusing Mayurika's existing mount as the dedicated panel. It does not. All 5 existing member-panel mounts — including Mayurika's — are removed completely (final embedded count: 0). The dedicated panel is a new, independent panel (final dedicated count: 1). The 32 approved decisions below are unchanged in substance; only surrounding wording is tightened. See the companion technical design §1/§3/§5/§9/§10 and the validation doc for the corrected design detail.
>
> **Correction (2026-08-06, same-day, round 2):** Decision 27 below already required "Reviewed by" and "Reviewer role" as two separate visible fields — that decision is unchanged. The companion technical design's round-1 implementation approach (one opaque `reviewer_display_label` string) risked not satisfying decision 27 for Paraparan and has been corrected to resolve both fields client-side from `reviewer_member_key`, with no database or schema change. See the companion technical design §6 and the validation doc for the corrected detail.

## Metadata (per CLAUDE.md §11.3 — Requirement Documentation Governance)

| Field | Value |
|---|---|
| Project Name | Management AIOS Calendar Review Summaries — Dedicated Sidebar Tab |
| Start Date | 2026-08-06 |
| Expected Deadline | Not yet set |
| User / Stakeholder | All authenticated Management Team members who conduct or read staff review-meeting summaries (Mayurika, Suman, Arun, Rajiv, Paraparan) |
| Company Value Contribution | Removes all 5 duplicated per-member Review Summaries mounts (0 remaining) and replaces them with 1 new, independent dedicated workspace — not a reuse or repurposing of any existing member panel — and moves review history from private-per-tab to shared-read-across-reviewers with reviewer-owned write — addressing the management file/decision disorganization domain named in CLAUDE.md §1/§4 |
| MVP Submission Date | Not yet set |
| Project Owner | Mareenraj (builder) |
| Status | READY FOR TECHNICAL DESIGN — no open business parameters remain; all 31 decisions below are approved as stated |

## 1. Purpose

REQ-CAL-REV-001 (2026-08-03) built Staff Review Summaries as 5 identical mounts, one embedded in each Management Team member's tab panel (Mayurika, Suman, Arun, Rajiv, Paraparan), with the reviewer identity tied to a per-instance `data-member-key` and, after its 2026-08-03 shared-read revision, backend reads open to all authenticated reviewers while writes stay owner-scoped. This requirement removes all 5 of those mounts completely — including Mayurika's — and replaces them with one new, independent dedicated sidebar tab and content panel that is not nested inside, dependent on, or a repurposing of any existing member panel's DOM parent, identity, or ownership. Exactly one Review Summaries workspace results (final embedded-mount count: 0; final dedicated-mount count: 1), reachable by every authenticated Management Team member regardless of which of the 5 member tabs they'd otherwise be looking at, with reviewer identity always derived from the authenticated Calendar token rather than from any tab.

## 2. Business question

Should Review Summaries remain duplicated across 5 member panels (with reviewer identity implied by "which tab you're viewing"), or become one dedicated workspace where reviewer identity is always derived from the authenticated Calendar token, independent of any tab? **Decision: one dedicated workspace, token-derived identity only.**

## 3. Source evidence

This is a UI/technical requirement, not an HR/business-domain claim under CLAUDE.md §2's SRC-register discipline — the CLAUDE.md source-of-truth register governs Management AIOS business facts (org structure, KPI rules, policy), not this repository's own application-development artifacts. Evidence for this requirement is:

- Direct instruction from the project builder (Mareenraj) in this session, requirement ID REQ-CAL-REV-TAB-002.
- Prior approved requirement/design: `docs/2026-08-03_calendar-review-summaries-requirement.md`, `docs/2026-08-03_calendar-review-summaries-technical-design.md` (REQ-CAL-REV-001).
- Live repository discovery performed this session (file:line citations in the companion technical design document).
- Repository state verified clean at `origin/main` = local `main` = `3c9135d` before this work began (no divergence).

## 4. Existing authoritative table/API — reused unchanged

- `management_aios.staff_review_summaries` — no new table, no migration, no schema change to existing columns.
- `management_aios.staff_dashboard_records.id` continues as `reviewed_staff_id`.
- `GET /api/staff` continues as the reviewed-staff selector source (via the existing staff-search pattern in `review-summaries.js`).
- Existing CREATE/LIST/DETAIL/UPDATE/DELETE ownership rules (`backend/routers/staff_review_summaries.py`) are preserved; only an additive, opt-in read parameter is introduced (see companion technical design §5).

## 5. Approved decisions

### 5.1 Navigation

1. Rename sidebar section heading: **DATA → STAFF**.
2. Rename navigation item: **Staff Data → Data**.
3. Add immediately after Data: **Review Summaries**.
4. Required order: STAFF › Data › Review Summaries.
5. Remove Review Summaries completely from the 5 member panels (Mayurika, Suman, Arun, Rajiv, Paraparan).
6. Exactly one Review Summaries workspace must remain — a new, independent panel and sidebar tab with its own panel ID, its own sidebar navigation item, and its own activation path. It is never a repurposed or renamed version of any existing member panel (including Mayurika's), never nested inside a member panel's DOM subtree, and never dependent on which member tab (if any) was previously selected.

### 5.2 Visibility and authorization

7. The Review Summaries navigation item remains visible without a token.
8. Opening it without a valid token shows "Authorize this browser".
9. Every authenticated Management Team member may open the dedicated tab.
10. The authenticated Calendar token always determines the reviewer/creator, and only the token — never the Mayurika panel, any other member panel, the selected reviewer filter, the selected employee, or the browser request body.
11. No reviewer selector may determine creation ownership.

### 5.3 Employee selection

12. Reuse the current staff-search interface.
13. Active staff appear by default.
14. Include inactive staff remains available.
15. The selected staff UUID becomes `reviewed_staff_id`.
16. Nothing is displayed in history until an employee is selected.

### 5.4 Read access

17. After an employee is selected and no reviewer filter is applied: show all active summaries from all reviewers for that employee.
18. Any authenticated Management Team member may read another reviewer's active summaries.
19. Soft-deleted summaries remain hidden from all normal views.

### 5.5 Write access

20. Create always uses the authenticated reviewer identity.
21. Only the reviewer who created a summary may update it.
22. Only the reviewer who created a summary may delete it.
23. Other reviewers' records are read-only.

### 5.6 Filters

24. Provide: reviewed employee; reviewer; meeting-date From; meeting-date To; active/inactive staff option.
25. Reviewer filter defaults to: **All reviewers**.
26. Selecting a reviewer narrows history to that reviewer only.

### 5.7 History display

27. Every history entry must clearly show: Reviewed employee; Reviewed by; Reviewer role; Meeting date; Summary; Created/updated metadata where currently available.
28. Edit and Delete appear only when the authenticated reviewer owns the record.

### 5.8 Data preservation

29. Existing records remain unchanged.
30. Continue using `management_aios.staff_review_summaries`.
31. Continue using `management_aios.staff_dashboard_records.id` as `reviewed_staff_id`.
32. No new table, copied records, per-reviewer table, or data migration.

## 6. Out of scope / explicitly not changed this session

- No application code, migration, API route, UI, or test was implemented in this session.
- No database read or write was performed.
- The protected path `member-aios/mayurika-hr/staff-data/` was not opened or modified.
- Existing owner-only update/delete rules are not changed.
- Existing default single-reviewer LIST behavior (`reviewer_member_key` omitted → authenticated reviewer's own rows) is not changed — see companion technical design §5 for why the all-reviewers behavior must be strictly additive.

## 7. Related evidence

- `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` — companion technical design.
- `validation/calendar-review-summaries-dedicated-tab-design-check-2026-08-06.md` — consistency check between this requirement and the technical design.
- `docs/2026-08-03_calendar-review-summaries-requirement.md`, `docs/2026-08-03_calendar-review-summaries-technical-design.md` — REQ-CAL-REV-001, the existing 5-mount implementation being replaced (all 5 mounts removed, 0 remaining) by the single independent dedicated tab specified in this requirement.

## 8. Protected path confirmation

`member-aios/mayurika-hr/staff-data/` was not opened, listed, or read at any point while producing this requirement.

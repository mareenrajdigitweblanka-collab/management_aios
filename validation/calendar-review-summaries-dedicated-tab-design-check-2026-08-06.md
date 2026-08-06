---
name: calendar-review-summaries-dedicated-tab-design-check
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-TAB-002
---

# Design Consistency Check — Calendar Review Summaries Dedicated Tab (2026-08-06)

> **Correction (2026-08-06, same-day):** The original version of this check did not flag that the technical design's original wording ("4 of 5 mounts removed," "near the removed Mayurika mount") was ambiguous and could be read as reusing Mayurika's panel as the dedicated panel. The requirement and technical design documents have both been corrected (see their own correction notes) to state explicitly that all 5 existing mounts are removed (0 remaining) and the dedicated panel is newly created and independent. This check is updated accordingly — see the new "Mount-count and independence correction assessment" section below.

## Purpose

Confirm that `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` contains no contradiction with any of the 31 approved decisions in `docs/2026-08-06_calendar-review-summaries-dedicated-tab-requirement.md`, and that the design is internally consistent with the existing REQ-CAL-REV-001 backend contract it builds on.

## Business question

Is the technical design safe to hand to the relevant Management Team member(s)/domain owner(s) for review, with 0 open contradictions and 0 unplanned schema/data changes?

## Scope of this check

Design review only. No code was written, no migration was run, no database was queried, and the protected path `member-aios/mayurika-hr/staff-data/` was not opened during this check.

## Decision-to-design traceability

| # | Requirement decision | Design section | Status |
|---|---|---|---|
| 1 | Sidebar heading DATA → STAFF | §3.1 | Covered |
| 2 | Nav item Staff Data → Data | §3.1 | Covered |
| 3 | Add Review Summaries immediately after Data | §3.1 | Covered |
| 4 | Order: STAFF › Data › Review Summaries | §3.1 | Covered |
| 5 | Remove Review Summaries from all 5 member panels | §2.1, §9, §10 (removal list) | Covered |
| 6 | Exactly one Review Summaries workspace | §5, §9 (single-mount signature) | Covered |
| 7 | Nav item visible without token | §5.1 | Covered |
| 8 | No-token state shows "Authorize this browser" | §5.1 | Covered |
| 9 | Every authenticated member may open the tab | §8 (authorization matrix) | Covered |
| 10 | Token always determines reviewer/creator | §2.9 (unchanged backend rule), §5.3 | Covered |
| 11 | No reviewer selector may determine creation ownership | §2.9, §8 | Covered |
| 12 | Reuse current staff-search interface | §2.7, §5.2 | Covered |
| 13 | Active staff by default | §2.7 (existing `GET /api/staff` default) | Covered |
| 14 | Include inactive remains available | §5.2, §5.3 | Covered |
| 15 | Selected staff UUID becomes `reviewed_staff_id` | §2.7 (unchanged) | Covered |
| 16 | Nothing displayed until employee selected | §5.2 | Covered |
| 17 | Default: all active summaries, all reviewers, no filter | §4 (`include_all_reviewers`), §5.3 | Covered |
| 18 | Any authenticated member may read another reviewer's summaries | §2.9 (existing shared-read rule, unchanged), §8 | Covered |
| 19 | Soft-deleted summaries hidden from all normal views | §4 (`deleted_at IS NULL` applied in both LIST branches) | Covered |
| 20 | Create always uses authenticated reviewer identity | §2.9, §8 | Covered |
| 21 | Only creating reviewer may update | §2.9 (`_get_owned_summary_or_404`, unchanged) | Covered |
| 22 | Only creating reviewer may delete | §2.9 (unchanged) | Covered |
| 23 | Other reviewers' records read-only | §5.3, §8 | Covered |
| 24 | Filters: employee, reviewer, date From/To, active/inactive | §5.3, §11 (tests 11-18) | Covered |
| 25 | Reviewer filter defaults to All reviewers | §4, §5.3 | Covered |
| 26 | Selecting a reviewer narrows to that reviewer | §4 (`reviewer_member_key` branch, unchanged) | Covered |
| 27 | Card shows employee, reviewer, role, date, summary, timestamps | §6 | Covered |
| 28 | Edit/Delete only for the owning reviewer | §5.3 (per-card ownership check) | Covered |
| 29 | Existing records unchanged | §10 (no schema/migration change) | Covered |
| 30 | Continue using `staff_review_summaries` | §10 | Covered |
| 31 | Continue using `staff_dashboard_records.id` as `reviewed_staff_id` | §10 | Covered |
| 32 | No new table/copy/per-reviewer table/migration | §4, §10, §12 | Covered |

**Result: 32/32 decisions traced to a design section with no contradiction found.**

## Consistency check against the existing REQ-CAL-REV-001 backend contract

| Existing rule (2026-08-03) | Preserved by this design? | Evidence |
|---|---|---|
| `reviewer_member_key` server-derived only on CREATE | Yes — untouched | Technical design §2.9, §10 |
| LIST omitted-`reviewer_member_key` defaults to self | Yes — untouched; new `include_all_reviewers` is a separate, opt-in branch | Technical design §4 |
| DETAIL is shared-read (any authenticated member, any active record) | Yes — untouched | Technical design §2.9 |
| UPDATE/DELETE owner-only, cross-reviewer returns 404 not 403 | Yes — untouched | Technical design §2.9, §8 |
| Soft delete only, never hard delete | Yes — untouched | Technical design §4, §10 |
| Ordering `meeting_date DESC, created_at DESC` | Yes — applies identically to both LIST branches | Technical design §4 |
| No `reviewed_staff_name_snapshot` column (live join only) | Yes — untouched | Technical design §10 |

**Result: 0 contradictions with the existing backend contract.**

## Backend additive-read design assessment

- New parameter (`include_all_reviewers: bool`) matches this route's own existing plain-`Optional[...]` query-parameter style; no new string/enum convention introduced.
- Existing critical test `test_reviewer_member_key_omitted_defaults_to_authenticated_reviewer` (`backend/tests/test_staff_review_summaries.py:303-312`) is unaffected — the new parameter defaults `False` and the old branch is untouched.
- Mutual-exclusivity rule (`include_all_reviewers=true` + `reviewer_member_key` set → 422) prevents an ambiguous request rather than silently picking a precedence order.
- Requiring `reviewed_staff_id` when `include_all_reviewers=true` prevents an unscoped全-reviewer, all-employee scan, matching decision #16 ("nothing displayed until employee selected").
- One authoritative backend query is used (per the task's explicit instruction to avoid browser-side merge of multiple requests) — confirmed: the design's single `GET` with `include_all_reviewers=true` is the only new server round-trip; no frontend-side merge of per-reviewer requests is proposed anywhere in the technical design.

## Mount-count and independence correction assessment

| Check | Result | Evidence |
|---|---|---|
| Member-panel mounts after implementation | 0 (all 5 — Mayurika, Suman, Arun, Rajiv, Paraparan — removed) | Technical design §3.1a, §9, §10 |
| Dedicated-panel mounts after implementation | 1, inside new `#tab-review-summaries` | Technical design §3.1a |
| Total mounts | 1 | Technical design §3.1a |
| Dedicated panel reuses Mayurika's (or any other member's) panel ID, DOM parent, or ownership? | No — confirmed new, independent panel with its own ID and no DOM-parent relationship to any member panel | Technical design §1, §3.1, §3.1a |
| Reviewer identity in the dedicated workspace derived from any member panel, reviewer filter, selected employee, or request body? | No — derived only from `getStoredMemberKey()` (the validated Calendar token) | Technical design §5.0 |

**Result: the ambiguity is corrected. 0 remaining statements in either document imply mount reuse or panel repurposing.**

## Reviewer identity/queryability assessment

- `reviewer_display_label` is sourced from the single existing backend registry (`backend/config.py:90-102` `MEMBER_LABELS`), not duplicated into the database or into a new frontend copy — confirmed by discovery finding no existing frontend-side member-label map beyond the authenticated user's own `displayLabel`.
- This satisfies the "Reviewed by: `<name>` — `<role>`" card format directly, since every existing label already follows that exact shape.

## State model assessment

- All four required invariants (no stale employee history, no leaked edit state, no draft restored under a different token, stale responses ignored) map to reused, already-proven mechanisms in `review-summaries.js` (`historyRequestId`, `CALENDAR_AUTH_CHANGED_EVENT` listener, `clearWorkspaceState()`) rather than new state-management primitives — reduces implementation risk.

## Files-touched assessment

- 0 files were created or modified other than this validation report and its two companion documents (requirement, technical design).
- No migration file was created.
- No `member-aios/mayurika-hr/staff-data/` access occurred.

## Test plan assessment

- 48 proposed tests (revised from the original 40 to explicitly enumerate all 5 per-panel mount-removal checks and dedicated-panel-independence checks separately, per the correction task's Phase I), exceeding the 30-test minimum referenced in this task and matching the REQ-CAL-REV-001 precedent threshold.
- Covers all 7 required categories (navigation, authorization, employee/filters, ownership, display, state, regression) named in the task's Phase 9, plus the 18 explicitly required correction-task test items (technical design §11 mapping table).

## PASS / AMBER / FAIL rule

This check PASSES if and only if:
- 0 of the 31 requirement decisions are uncovered or contradicted by the design (32/32 confirmed, including the 2 sub-items under decision "32");
- 0 contradictions exist against the existing REQ-CAL-REV-001 backend contract;
- the additive API change leaves the one identified existing default-behavior test unaffected;
- 0 application/database files were touched producing the requirement, design, or this check;
- the protected path was never opened;
- 0 remaining ambiguity about mount reuse — member-panel mounts = 0, dedicated-panel mounts = 1, total = 1, stated explicitly in both the requirement and technical design (see "Mount-count and independence correction assessment" above).

All six conditions are met.

**Result: PASS.**

## Owner / reviewer

- Prepared by: Mareenraj (builder).
- Review routing (per CLAUDE.md §18): this design touches Mayurika's, Suman's, Arun's, Rajiv's, and Paraparan's tab surfaces (mount removal) and the shared Review Summaries feature itself — route to each affected Management Team member for their own tab's regression sign-off, with Mayurika as HR domain owner for the overall Review Summaries feature (continuing REQ-CAL-REV-001's ownership).

## Status

READY FOR MANAGEMENT TEAM REVIEW — not yet implemented, not yet deployed.

## Limitations

Same as `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` §12 — no live browser walkthrough, no live database query (none needed, no schema change proposed), no code executed this session.

## One next step

Circulate this design to Mayurika (HR/feature domain owner, whose tab also loses its embedded mount — 0 remaining, same as the other 4) and to Suman, Arun, Rajiv, and Paraparan (as owners of the other 4 tabs losing their embedded mount) for review and sign-off.

**Branch-strategy correction:** implementation branch strategy is not defined by this design and must follow the repository owner's explicit instruction at implementation start.

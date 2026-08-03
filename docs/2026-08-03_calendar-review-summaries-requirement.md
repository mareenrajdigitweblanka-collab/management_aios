---
name: calendar-review-summaries-requirement
type: requirement-document
created: 2026-08-03
created-by: Mareenraj (builder)
status: READY FOR TECHNICAL DESIGN — one open business parameter (summary maximum length)
requirement-id: REQ-CAL-REV-001
---

# Requirement — Management AIOS Calendar Review Summaries (2026-08-03)

## Metadata (per CLAUDE.md §11.3 — Requirement Documentation Governance)

| Field | Value |
|---|---|
| Project Name | Management AIOS Calendar Review Summaries |
| Start Date | 2026-08-03 |
| Expected Deadline | Not yet set |
| User / Stakeholder | Management Team members who conduct review meetings (Mayurika, Suman, Arun, Rajiv, Paraparan) |
| Company Value Contribution | Gives Management Team members a private, reviewer-owned place to record staff review-meeting summaries, addressing the management file/decision disorganization domain named in CLAUDE.md §1/§4 |
| MVP Submission Date | Not yet set |
| Project Owner | Mareenraj (builder) |
| Status | READY FOR TECHNICAL DESIGN — one open business parameter remains (summary maximum length); see §9 |

## 1. Background

A read-only discovery session (2026-08-03, see prior conversation) confirmed no existing asset in the repository owns "staff review summary" truth, identified the Calendar token-authorization system as the correct reviewer-identity source, and flagged two open questions: which field should serve as the stable reviewed-staff identifier, and whether reusing `GET /api/staff` for the reviewed-person selector required separate HR approval. Both questions are resolved by business-owner decision in this update; see §2 and §3.

## 2. Identity definitions

- **Reviewer:** the authenticated Management Team member whose complete Calendar token was validated by the backend.
- **Reviewed staff:** the company employee discussed in the review meeting. This person does not own the record merely because the summary is about them.
- **Record owner:** the `reviewer_member_key` derived only from the validated token.
- **Viewer / editor / deleter:** only the record-owning reviewer, in Phase 1.

## 3. Approved requirement

Management Team members conduct review meetings about company staff. The reviewed person may be a staff member outside the Management Team, or another Management Team member. Each review summary is privately owned by the authorized Management Team member who created it — never by the reviewed person.

**Phase 1 scope:** reviewed-staff selection; review-meeting date; plain-text summary entry; save; reviewer-owned datewise history; full-summary view; reviewer-owned update; reviewer-owned soft delete; date-range filtering.

**Explicitly out of scope for Phase 1:** public summary access; cross-reviewer access; reviewed-staff access; MD email sending; attachments; ratings; scoring; automated analysis; admin overrides; Task-note storage.

## 4. Stable reviewed-staff identifier — approved decision

- The existing staff table/model `id` is the unique reviewed-staff identifier.
- `employee_number` must not be used — it is not unique (the underlying HR source has reused `employee_number` values across distinct people).
- `StaffRecordOut` must expose the existing staff `id` (currently withheld as internal bookkeeping — see §8, a technical follow-up, not a business blocker).
- The frontend reviewed-staff selector uses `staff.id` as its option value, never `employee_number`.
- Review summaries store this value as `reviewed_staff_id`.

## 5. Staff API reuse — approved decision

- `GET /api/staff` is the approved source for the reviewed-person selector.
- No separate Mayurika/HR approval is required for this reuse.
- No hardcoded or duplicate staff list may be created for this feature.

## 6. Technical verification required (implementation phase, not business blockers)

The technical implementation phase must still verify:

- staff `id` uniqueness;
- staff `id` non-null coverage;
- staff `id` data type;
- API serialization of `id` in `StaffRecordOut`;
- behavior during staff-data refresh/import;
- foreign-key feasibility between `staff_review_summaries.reviewed_staff_id` and the staff table;
- active/inactive staff display rules in the selector.

## 7. Proposed data model

`staff_review_summaries`

| Field | Notes |
|---|---|
| `id` | UUID primary key |
| `reviewer_member_key` | server-derived from the validated Calendar token, never client-supplied |
| `reviewed_staff_id` | same compatible type as `staff.id` (see §6) |
| `meeting_date` | DATE |
| `summary_text` | TEXT |
| `created_at` | timestamp |
| `updated_at` | timestamp |
| `deleted_at` | timestamp, nullable — soft delete |

Multiple summaries for the same staff member and meeting date are allowed (no uniqueness constraint on reviewer+staff+date).

An optional `reviewed_staff_name_snapshot` column must not be introduced without a clear historical-display justification.

### Recommended indexes

1. `(reviewer_member_key, reviewed_staff_id, meeting_date DESC, created_at DESC) WHERE deleted_at IS NULL`
2. `(reviewer_member_key, id) WHERE deleted_at IS NULL`

## 8. Authorization

- All routes require `get_verified_member()`.
- `reviewer_member_key` is assigned server-side only — the browser may send `reviewed_staff_id`, `meeting_date`, and `summary_text`, but must never assign reviewer ownership.
- Every list/detail/update/delete query must include `reviewer_member_key = authenticated reviewer`.
- Cross-reviewer detail, update, and delete requests return a non-disclosing 404 (never a 403 that would confirm the record's existence to a non-owner).
- Other reviewers and the reviewed staff member have no access in Phase 1.

## 9. Staff API schema change (documented future implementation — not implemented in this requirement session)

`StaffRecordOut` must expose `id`.

The reviewed-staff selector should use:

- value: `staff.id`
- display: approved staff display name
- optional secondary label: team/role, when already approved and available

`employee_number` must not be used as the option value.

## 10. Summary length

Proposed (pending final business confirmation on the maximum only):

- minimum: 1 non-whitespace character;
- maximum: 10,000 characters — **pending final business confirmation**;
- paragraphs and line breaks are preserved;
- leading/trailing unnecessary whitespace is trimmed;
- rendered only as safe text (no unescaped HTML).

## 11. Out of scope / explicitly not changed this session

- No application code, migration, API route, UI, or test was implemented in this session.
- No database migration was created or run.
- The protected path `member-aios/mayurika-hr/staff-data/` was not opened or modified.

## 12. Related evidence

- `validation/calendar-review-summaries-identifier-decision-check-2026-08-03.md` — decision record for this update.

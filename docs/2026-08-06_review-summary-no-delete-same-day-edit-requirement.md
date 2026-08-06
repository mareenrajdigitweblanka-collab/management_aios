---
Project Name: Review Summary No-Delete and Same-Day Edit Lock
Start Date: 2026-08-06
Expected Deadline: 2026-08-06
User / Stakeholder: Mareenraj (builder), Management Team (Mayurika/Suman/Arun/Rajiv/Paraparan as reviewers)
Company Value Contribution: Closes a data-integrity gap in the Review Summary feature (REQ-CAL-REV-001) — a reviewer's own record could previously be edited or soft-deleted indefinitely, with no time boundary, which undermines the record as a trustworthy point-in-time account of a review meeting.
MVP Submission Date: 2026-08-06
Project Owner: Mareenraj
Status: See handover/2026-08-06__review-summary-no-delete-same-day-edit-closure.md and validation/review-summary-no-delete-same-day-edit-check-2026-08-06.md for implementation/verification status
---

# Review Summary No-Delete and Same-Day Edit Lock — Requirement — 2026-08-06

**Requirement ID:** REQ-CAL-REV-LOCK-004

## 1. Problem

Under the existing REQ-CAL-REV-001/REQ-CAL-REV-TAB-002 design, a reviewer who created a Review Summary could:

- edit their own summary at any time, with no deadline — the record's `summary_text`/`meeting_date` could drift arbitrarily far from what was actually discussed in the original meeting; and
- soft-delete their own summary at any time, removing it from every view.

Both behaviors weaken the record's value as an auditable account of a review meeting.

## 2. Approved business rule

1. Review Summary edit eligibility is based **only** on `created_at`.
2. The approved business timezone is **Asia/Colombo**.
3. `meeting_date` must **not** affect edit eligibility.
4. Only the authenticated reviewer who created the record may edit it.
5. The creator may edit until **23:59:59** on the Asia/Colombo calendar date of `created_at`.
6. The record becomes permanently read-only from **00:00:00** on the following Asia/Colombo calendar day.
7. **No Admin override exists.**
8. **No user may delete a Review Summary.**
9. Existing summaries created before the current Asia/Colombo date are immediately locked (no migration/backfill — the rule applies retroactively simply by being evaluated fresh on every read).
10. Existing soft-deleted summaries remain hidden and are **not** restored.
11. Existing shared-read behavior remains unchanged.
12. Existing PDF export behavior remains unchanged.

## 3. Explicit non-goals (per build instruction)

- No PostgreSQL schema change unless proven strictly necessary — none was found necessary; the rule is fully derivable from `reviewer_member_key`, `created_at`, and the authoritative backend clock.
- No modification to production Review Summary records.
- No restoration of soft-deleted records.
- No change to PDF export behavior.
- No Admin override of any kind.
- `member-aios/mayurika-hr/staff-data/` is a protected path — never opened or modified by this work.

## 4. Acceptance criteria

- The owning reviewer can create and edit a summary freely through the end of its own Asia/Colombo creation day.
- Any update attempt after that day, by the creator or anyone else, is rejected — never silently accepted, never a 200.
- Any delete attempt, by anyone, at any time, is rejected — never a 200/204, never a row mutation.
- `meeting_date` has no bearing on either rule.
- The Delete control is removed from the Review Summary UI entirely.
- The Edit control renders only for the creator's own card, only while still within its own edit window, with the approved copy shown in each state.
- Zero database schema/migration changes; zero production record mutations as part of this implementation.

Full design: `docs/2026-08-06_review-summary-no-delete-same-day-edit-technical-design.md`. Implementation evidence: `validation/review-summary-no-delete-same-day-edit-check-2026-08-06.md`. Closure record: `handover/2026-08-06__review-summary-no-delete-same-day-edit-closure.md`.

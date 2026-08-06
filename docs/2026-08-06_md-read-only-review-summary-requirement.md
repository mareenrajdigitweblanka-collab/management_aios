---
Project Name: MD Read-Only Review Summary Authorization
Start Date: 2026-08-06
Expected Deadline: 2026-08-06
User / Stakeholder: Mareenraj (builder), Managing Director (MD, new read-only viewer), Management Team (Mayurika/Suman/Arun/Rajiv/Paraparan as reviewers, unaffected)
Company Value Contribution: Gives the MD independent, auditable read access to Review Summary history and PDF export without granting any write, Calendar, Task, Leave, or Staff Data authority — supports MD-level oversight of review meetings while keeping the Management Team's existing reviewer-owned write model completely intact.
MVP Submission Date: 2026-08-06
Project Owner: Mareenraj
Status: See handover/2026-08-06__md-read-only-review-summary-closure.md and validation/md-read-only-review-summary-check-2026-08-06.md for implementation/verification status
---

# MD Read-Only Review Summary Authorization — Requirement — 2026-08-06

**Requirement ID:** REQ-CAL-REV-MD-READ-006

## 1. Problem

The Review Summaries feature (REQ-CAL-REV-001/TAB-002/PDF-003/LOCK-004) authenticates exactly five Management Team members, each with equal read access and owner-only write access. The Managing Director needs to view and download Review Summary history but must not be modeled as a sixth Management Team member — MD must never gain Calendar, Task, Leave, or Staff Data mutation authority, and must never be able to create, edit, or delete a Review Summary.

## 2. Approved access rule

MD is a separate, authenticated, READ-ONLY Review Summary viewer identity. MD may:

1. Authorize the browser using a dedicated MD token.
2. Open the Review Summaries tab.
3. Use the existing minimal employee search Review Summaries already provides.
4. Select an employee.
5. Read active Review Summary history.
6. Read records from all reviewers under the existing shared-read behavior.
7. Apply reviewer filters.
8. Apply From/To date filters.
9. Expand/collapse review text.
10. Download the selected employee's permitted Review Summary PDF.

MD may NOT:

1. Create a Review Summary.
2. Edit a Review Summary.
3. Delete a Review Summary.
4. Receive an Admin override (none exists in this codebase for anyone).
5. Create or modify Calendar schedules (Tasks).
6. Create or modify Tasks.
7. Create or modify Leave records.
8. Modify any other Management AIOS domain.
9. Gain Staff Data dashboard access beyond the pre-existing, already-unauthenticated staff selector Review Summaries already uses for every member.
10. Appear as a Review Summary creator/reviewer option.

**Display label:** `Authorized as: MD — Read-only`. **Member key:** `md` (no pre-existing approved MD key was found in the codebase — `md` is used because it is compatible with every existing authentication convention and collides with nothing).

## 3. Explicit non-goals (per build instruction)

- No PostgreSQL schema/migration change of any kind.
- No modification to production Review Summary records.
- No real token or hash committed to git, source, tests, logs, evidence, handover, screenshots, or chat output — documentation may only ever show `CALENDAR_AUTH_TOKEN_HASH_MD=<set-in-deployment-environment>`.
- No MD database user, staff record, reviewer row, capability column, permission table, or token table.
- `member-aios/mayurika-hr/staff-data/` is a protected path — never opened or modified.
- No push to `origin` until this implementation report is reviewed.

## 4. Acceptance criteria

- MD authenticates through the exact same single token-comparison chain the five Management Team tokens already use (never a second, parallel resolver).
- MD's own token env var (`CALENDAR_AUTH_TOKEN_HASH_MD`) is OPTIONAL: absent, blank, or placeholder means MD authorization is simply unavailable — never a startup crash, never any effect on the five existing member tokens.
- MD can LIST, read DETAIL, and export PDF for Review Summaries with zero backend route changes (both already grant shared read access to any authenticated identity).
- MD is rejected with an explicit 403 before any database write on CREATE and UPDATE.
- MD receives the exact same permanent 409 on DELETE as every other authenticated identity (no change needed — DELETE already rejects everyone).
- MD is absent from `VALID_MEMBER_KEYS`, `CALENDAR_AUTH_TOKEN_ENV_VARS`, and `MEMBER_DIRECTORY` — so MD can never own a Task/Leave record and can never become a Review Summary `reviewer_member_key` (the database's own CHECK constraint on that column is untouched and still only allows the five original keys).
- The frontend hides the Add/Edit Review Summary form for MD and shows a compact read-only notice instead; no Save/Edit/Delete control is ever rendered for MD.
- Zero database/schema changes; zero production writes; zero production records changed.

Full design: `docs/2026-08-06_md-read-only-review-summary-technical-design.md`. Implementation evidence: `validation/md-read-only-review-summary-check-2026-08-06.md`. Closure record: `handover/2026-08-06__md-read-only-review-summary-closure.md`.

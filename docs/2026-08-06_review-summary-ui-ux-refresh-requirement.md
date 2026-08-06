---
Project Name: Review Summary Professional UI/UX Refresh
Start Date: 2026-08-06
Expected Deadline: 2026-08-06
User / Stakeholder: Mareenraj (builder), Management Team (reviewers using the Review Summaries tab)
Company Value Contribution: Makes the existing Review Summary feature (REQ-CAL-REV-001/REQ-CAL-REV-TAB-002/REQ-CAL-REV-PDF-003/REQ-CAL-REV-LOCK-004) easier and safer to use correctly — clearer edit-eligibility state, clearer record content, and visible progress feedback during PDF export reduce misclicks and duplicate PDF requests.
MVP Submission Date: 2026-08-06
Project Owner: Mareenraj
Status: See handover/2026-08-06__review-summary-ui-ux-refresh-closure.md and validation/review-summary-ui-ux-refresh-check-2026-08-06.md for implementation/verification status
---

# Review Summary Professional UI/UX Refresh — Requirement — 2026-08-06

**Requirement ID:** REQ-CAL-REV-UX-005

## 1. Scope

Frontend UI/UX of the dedicated Review Summaries tab only (`web-view/js/review-summaries.js`, `web-view/css/review-summaries.css`, its own test file). No backend code, PostgreSQL, database models/schemas/migrations, API routes, PDF generation, authorization rules, edit-lock rules, or no-delete rules are touched. No Issues-module work. No attachments.

## 2. Screenshot-observed weaknesses (user-reported)

1. Editable and locked states are shown as small, low-emphasis text.
2. "Editable until 11:59 PM today" does not explicitly mention Asia/Colombo.
3. "Editing period ended..." is visually easy to miss.
4. Reviewer, role, meeting date, summary content, and record state are crowded together.
5. The "Edited" badge is ambiguous.
6. Long review text and links are difficult to scan.
7. Download PDF provides no visible waiting feedback while the backend prepares the file and the browser opens the Save dialog.
8. Users may click Download PDF more than once because there is no clear in-progress state.

## 3. Current functional behavior preserved (unchanged by this task)

- Authenticated Management Team shared reading.
- Creator-only editing.
- Editing only on the `created_at` Asia/Colombo calendar date.
- Locked from next-day midnight.
- No Admin override.
- No Delete control (frontend); backend DELETE prohibition (409, every caller).
- Reviewer filter, From/To filters, selected-employee behavior.
- Download PDF endpoint, query parameters, PDF content, and filename.
- No PDF storage, no download audit.
- Tab-leave state clearing, token-change state clearing.

## 4. Approved presentation changes

- Every card shows exactly one status badge ("Editable today" / "Read-only") plus an explanatory message — now shown for every card (owned or not), not only the owner's own card as before.
- Card content reorganized into header (employee + badge) / metadata (Reviewed by, Reviewer role, Meeting date — each its own labeled row) / summary (labeled "Review summary") / status message / Edit action / footer (Created/Updated, from the existing `created_at`/`updated_at` fields).
- The ambiguous "Edited" pill is replaced by a secondary "Updated" label with an accessible explanation.
- Reviewer / From / To / Download PDF now share one toolbar so the PDF control stays visually associated with the filters it applies to.
- Download PDF gets an explicit "Preparing PDF…" busy state (reusing the app's existing `setButtonBusy` spinner/disabled convention), an accessible `aria-live="polite"` status message near the button, and clear success/404/failure copy.

Implementation evidence: `validation/review-summary-ui-ux-refresh-check-2026-08-06.md`. Closure record: `handover/2026-08-06__review-summary-ui-ux-refresh-closure.md`.

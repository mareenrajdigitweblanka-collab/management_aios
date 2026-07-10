---
name: hr-schedule-pilot-role-desk-calendar-ui-signoff-request-2026-07-07
type: stakeholder-confirmation-request
created: 2026-07-07
source: aios_role_desk_views.html (uploaded UI/style reference); commit 542d800bd7a06b51fb3c559152162e03f28968a8
status: AWAITING_MAYURIKA_VARMEN_VISUAL_SIGNOFF
---

# HR Schedule Pilot — Role Desk Calendar UI Visual Sign-Off Request — Mayurika / Varmen

**Date:** 2026-07-07

---

## What this request is — and is not

This is a **visual UI sign-off request only**. It asks whether the new calendar *looks and reads* correctly for non-technical users. It does **not** ask Mayurika or Varmen to approve any schedule fact, priority scale, recurring-block ownership, or any other item on the still-open 8-question list from `hr-schedule-pilot-confirmation-request-2026-07-06.md`. Those 8 questions remain separately open and are **not** re-asked or re-answered here.

No source truth was changed. No `[VERIFY]` item was resolved. No new source ID was registered, and `evidence/source-register.md` was not touched.

---

## Current Build

HR Schedule Pilot calendar rebuilt as a Role Desk-style month-view calendar in `web-view/index.html`, committed in `542d800` (commit `542d800bd7a06b51fb3c559152162e03f28968a8`, "Match HR schedule pilot calendar to Role Desk UI").

Full detail: `validation/hr-schedule-pilot-role-desk-calendar-ui-match-check-2026-07-07.md`.

---

## Scope

HR / Mayurika only. Full Management Team schedule (Arun, Suman, Rajiv, Varmen) is not built. This request does not change or expand that scope.

---

## Source

`aios_role_desk_views.html` — uploaded sample file, used strictly as a UI/style reference for the "Management Team Schedule — MD Requested View" calendar section (month-view grid, colour-coded chips, Priority Queue table, Recurring Templates Register table). No sample data from that file was copied in as fact.

---

## Questions to Confirm

**Q1. Visual match**
Does the new HR Schedule Pilot calendar visually match the expected Role Desk / Google Calendar-style month-view layout?

**Q2. Simplicity for non-technical users**
Is the screen simple enough for non-technical users (i.e., not overloaded with tables, text, or technical detail)?

**Q3. Understandable without technical evidence**
Are the visible items — the calendar chips, the Priority Queue table, the Recurring Templates Register table — understandable on their own, without opening the collapsed "Evidence / Technical Details" section?

**Q4. HR-only scope**
Should the calendar remain HR-only (Mayurika's schedule) for now, with the full Management Team schedule still not built?

**Q5. [VERIFY] items still open and correctly shown**
Are the 8 open confirmation questions (priority scale, HR schedule categories, recurring-block ownership, interview/session scheduling ownership, CST meaning, durations, edit rights, replace-or-parallel schedule rule) still correctly shown as unresolved `[VERIFY]` items — not answered, not assumed?

**Q6. Collapsed Evidence / Technical Details section**
Is having one collapsed "Evidence / Technical Details" section at the bottom of the calendar (instead of file paths scattered through the visible screen) an acceptable way to present the technical/source references?

**Q7. Approval for remote push / Netlify preview**
Is this visual update approved for remote push and Netlify preview deployment (publish directory `web-view/`, no build step), on the understanding that it remains a read-only static preview?

**Q8. Visual changes required before push**
Are any visual changes required before this goes to remote push — layout, colours, wording, chip placement, or anything else?

---

## Current [VERIFY] Status (unchanged by this request)

| # | Item | Status |
|---|---|---|
| 1 | Priority scale | [VERIFY] |
| 2 | HR schedule categories | [VERIFY] |
| 3 | Recurring-block ownership | [VERIFY] |
| 4 | Interview/session scheduling ownership | [VERIFY] |
| 5 | CST meaning | [VERIFY] |
| 6 | Durations | [VERIFY] |
| 7 | Edit rights | [VERIFY] |
| 8 | Replace-or-parallel | [VERIFY] |

This request does not resolve any of the 8 items above. They remain tracked separately in `hr-schedule-pilot-confirmation-request-2026-07-06.md`.

---

## Pass/Fail Rule

PASS if Mayurika and Varmen answer Q1–Q8 above, or explicitly confirm which remain pending.

FAIL if the HR Schedule Pilot UI is marked final, pushed to a remote, or deployed to Netlify without written visual sign-off on Q1–Q8.

---

## Next Step

Route this request to Mayurika and Varmen alongside the still-open `hr-schedule-pilot-confirmation-request-2026-07-06.md`. Do not push to remote or deploy a Netlify preview, and do not mark the HR Schedule Pilot UI as final, until written answers to Q1–Q8 are received.

---

## Verbal Visual Sign-off Received — 2026-07-09

This section is append-only — the original request, the Q1–Q8 list, and the "Current [VERIFY] Status" table
above are preserved unchanged and must not be deleted.

The user clarified: "She verbally confirmed with me." Mayurika verbally confirmed GAP-44 (the visual
sign-off request above) to the user. This is a verbal report, not a written confirmation and not a direct
statement from Mayurika in this conversation.

**Status:** VERBALLY CONFIRMED — PENDING WRITTEN CONFIRMATION / DEPLOYMENT APPROVAL CLARITY

**Full detail:** see
`evidence/stakeholder-confirmations/hr-schedule-gap-40-gap-44-verbal-confirmation-2026-07-09.md` (captured
by Mareenraj Developer, 2026-07-09).

**Important — what this does NOT mean:**

- **Deployment/live approval is not assumed.** Q7 of this request specifically asks whether the visual
  update is approved for remote push and Netlify preview deployment. Nothing in the user's statement
  specifies that deployment was part of what Mayurika verbally confirmed, so Q7 remains explicitly
  unresolved pending written clarity.
- This verbal report does not itself register a formal source or resolve any of the 8 open `[VERIFY]` items
  from `hr-schedule-pilot-confirmation-request-2026-07-06.md` — those remain tracked separately (and are
  themselves only verbally, not formally, confirmed as of this same date — see that file's own "Verbal
  Confirmation Received — 2026-07-09" section).
- No `web-view/index.html`, `evidence/source-register.md`, or `context/verify-register.md` change was made
  by this update.
- The HR Schedule Pilot UI must **not** be marked final, pushed to remote, or deployed to Netlify based on
  this verbal confirmation alone.

**Next step (this section):** Obtain short written confirmation from Mayurika/Varmen on Q1–Q8, with explicit
clarity on Q7 (deployment approval), before treating this gate as closed or taking any push/deploy action.

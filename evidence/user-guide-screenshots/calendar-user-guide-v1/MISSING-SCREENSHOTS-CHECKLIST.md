---
name: calendar-user-guide-v1-missing-screenshots-checklist
type: evidence-checklist
scope: Management_AIOS_Calendar_User_Guide_v1.docx — screenshot capture list
created: 2026-07-31
status: CLOSED — 9 of 9 screenshots captured, reviewed, and inserted 2026-07-31
---

# Missing Screenshots — Calendar Member User Guide v1

**This checklist is now closed.** It originally recorded that no browser-automation or
screenshot tool was available in the session that first produced
`docs/user-guides/Management_AIOS_Calendar_User_Guide_v1.docx` (every image slot was a red
"SCREENSHOT PENDING" placeholder rather than an invented or generic stock image, per this
task's own instruction not to fabricate screenshots). In a follow-up session, all 9 screenshots
listed below were captured from the production frontend, individually reviewed for privacy
(no token, hash, `Authorization` header, DevTools, PII, or confidential Task/Leave content —
see `validation/calendar-user-guide-v1-check-2026-07-31.md` §"Screenshot privacy result" for
the full per-image result), and inserted into the DOCX in place of every placeholder. The
capture table below is preserved as a historical record of the original requirements each
image had to meet.

One planned image, `04b-multiple-time-frames.png`, was never part of the official 9-file
requirement and was removed from the DOCX (its content is still covered in prose under
"Create Tasks → Good to know").

**General capture rules for every screenshot below:**

- No raw member token, no token hash, no `Authorization` header value, visible anywhere.
- No browser DevTools / network panel visible.
- No hand-drawn marks — use the numbered callouts already written into the DOCX captions instead.
- No personal email, phone, address, salary, or private HR information.
- No confidential Task or Leave title/notes content — use a generic, clearly-non-sensitive example
  (e.g. "Prepare weekly report") or crop to hide the field's real value if a live example must be shown.
- Crop unnecessary browser chrome, but keep enough surrounding interface visible that a new member
  recognizes the screen (toolbar, tab labels, etc.).
- Save as PNG at a resolution that stays sharp when placed at roughly half-page width in the DOCX
  (at least 1400px wide recommended).

| ID | Filename | Where it goes | What to capture |
|----|----------|---------------|------------------|
| 01 | `01-calendar-overview.png` | Cover page | Month view of any one member's schedule: toolbar (Today/Previous/Next, Create button), the date grid, and the color legend. No sensitive Task/Leave content — use a week with only generic or already-public example entries, or a currently-empty week. |
| 02 | `02-authorize-browser-dialog.png` | "Authorize Your Browser" | The "Authorize this browser" dialog: title, explanatory sentence, the Member token field **masked** (dots, not real characters), the show/hide eye icon beside it, the shared-browser warning line, and Cancel/Authorize buttons. Do not type a real token — leave the field empty or type a few placeholder characters and keep it masked. |
| 03 | `03-authorized-as-indicator.png` | "Authorize Your Browser" | Close-up of the top bar after a successful authorization: "Authorized as: `<name>`" next to the "Change token" button. Use a test/example member name if the real authorized name should not be shown, or crop to a generic name. |
| 04 | `04-create-task-form.png` | "Create Tasks" | The Create → Task form **before saving**: Date, Title (with the 0/120 counter), Priority, one Start/End time row, "+ Add another time", Notes, and the "Add schedule" button. Do not submit — capture the filled-or-empty form only, per the task's explicit instruction not to save test data. |
| 04b | `04b-multiple-time-frames.png` | "Create Tasks" | The same Task form after clicking "+ Add another time" once, showing the second Start/End time row added beneath the first. Also captured pre-save. |
| 05 | `05-bulk-tasks-form.png` | "Bulk Tasks and Leave" | The Create → Bulk Tasks form with a few empty or generically-labeled rows (Date, Title, Priority, time) and the Save button. Pre-save capture only. |
| 06 | `06-leave-form.png` | "Bulk Tasks and Leave" | The Create → Leave form with the Leave type dropdown **open**, showing all five options: Short Leave, Half-Day Leave — First Half, Half-Day Leave — Second Half, Full-Day Leave, Multi-Day Leave. No personal leave reason/details filled in. |
| 07 | `07-task-details-outcome.png` | "View, Edit, Delete, and Outcomes" | A Task's details view showing a non-sensitive example title/date/priority/time, the Edit and Delete icon buttons, and the Mark Completed / Mark Uncompleted buttons. Use a generic example Task, never a real confidential one. |
| 08 | `08-change-token-dialog.png` | "Change Your Token" | The top-bar "Change token" button together with the open "Change Calendar token" dialog: title, message, an **empty, masked** token field, and Cancel/"Change token" buttons. Do not type a real token. |
| 09 | `09-cross-member-red-alert.png` | "Viewing Another Member's Calendar" | The red cross-member authorization warning toast: red icon, red border, red title ("You can't manage `<member>`'s Calendar"), red message. Trigger it safely with two test/example member identities if possible, or use member names that are not sensitive to display. No token, no Calendar content, visible in the shot. |

## How to close this checklist

1. Capture all 9 images above from the production frontend (or an approved safe preview) following
   the capture rules.
2. Save them into this folder (`evidence/user-guide-screenshots/calendar-user-guide-v1/`) using the
   exact filenames in the table.
3. Have a screenshot-privacy pass performed (confirm no token/hash/PII/confidential content in any image).
4. Insert each image into its corresponding placeholder table in
   `docs/user-guides/Management_AIOS_Calendar_User_Guide_v1.docx`, replacing the red "SCREENSHOT
   PENDING" placeholder cell content with the image (the prepared caption and alt text are already
   written immediately below each placeholder and can stay as-is or be lightly adjusted to match the
   real image).
5. Re-inspect every DOCX page for clipping/overlap once images are in place.
6. Convert the approved DOCX to PDF, inspect every PDF page, and update
   `validation/calendar-user-guide-v1-check-2026-07-31.md` from AMBER to PASS.

## Status

**CLOSED — 9 of 9 captured, privacy-reviewed, and inserted (2026-07-31).** See
`validation/calendar-user-guide-v1-check-2026-07-31.md` for the full closure evidence
(dimensions, privacy result, DOCX/PDF render results, final PASS/AMBER/FAIL).

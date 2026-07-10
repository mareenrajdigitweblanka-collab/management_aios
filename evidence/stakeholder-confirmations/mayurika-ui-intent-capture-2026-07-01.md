---
name: mayurika-ui-intent-capture-2026-07-01
description: Mayurika's 5-question UI intent capture for the HR Daily Control Panel — Management AIOS UI/UX build phase
metadata:
  type: project
  reviewer: Mayurika (HR Officer)
  aios: Management AIOS
  date: 2026-07-01
  source-input: 5 questions.pdf
  build-guide: AIOS_UI_UX_Build_Guide.pdf (DWC/Varmen — MD directive, 01 July 2026)
  status: READY — Mayurika intent captured
---

# Mayurika UI Intent Capture — HR Daily Control Panel

**Reviewer / Daily User:** Mayurika (HR Officer)
**AIOS:** Management AIOS
**Purpose:** Capture Mayurika's daily usage intent before building the HR dashboard feature. Completed per AIOS UI/UX Build Guide §4 (Step 1 — Capture the User's Intent).
**Source:** 5 questions.pdf (answers recorded from Mayurika)
**Build Guide:** AIOS_UI_UX_Build_Guide.pdf — DWC (Varmen), MD directive, 01 July 2026
**Status:** READY — Mayurika intent captured

---

## The 5 Questions and Mayurika's Answers

| # | Question | Mayurika's Answer |
|---|---|---|
| 1 | What do you check or look for every single day that relates to this AIOS? | Attendance dashboard; Leave requests; EOD submissions; Probation reminders; New joiners; HR inbox; Pending approvals; Document verification; Missing employee documents; Developers & technical team daily requirement & skill file documents (quantity base); Developers & tech team daily ROI — user benefit |
| 2 | What currently takes the most time, or the most back-and-forth with other people, to find or piece together? | Attendance dashboard; Leave requests |
| 3 | If you could submit something directly through a simple screen instead of messaging or emailing someone, what would that be? | Leave requests; Probation review requests; Confirmation recommendations; Training completion; Employee complaints; Performance reviews |
| 4 | What is the one thing that, if it was visible in one place, would save you the most time each day? | Task tool management |
| 5 | Is there anything you currently check that comes from more than one place (file, chat, person) right now? | Yes — Leave requests currently come from the task management tool AND mail also |

---

## Screen List Draft

Derived from Mayurika's answers per AIOS UI/UX Build Guide §5 (Step 2 — Turn Answers Into a Screen List).

### Main / Home Screen: HR Daily Control Panel

**Read-only summary cards — shown in priority order:**

| Card # | Item | Priority Tier | Notes |
|---|---|---|---|
| 1 | Attendance dashboard | Priority (Q2 — most time-consuming) | |
| 2 | Leave requests | Priority (Q2 — most time-consuming; Q5 — cross-source) | Comes from task management tool AND mail — cross-source item |
| 3 | Task tool management | Priority (Q4 — single biggest time-saver) | |
| 4 | EOD submissions | Standard daily check | |
| 5 | Probation reminders | Standard daily check | |
| 6 | New joiners | Standard daily check | |
| 7 | HR inbox | Standard daily check | |
| 8 | Pending approvals | Standard daily check | |
| 9 | Document verification | Standard daily check | |
| 10 | Missing employee documents | Standard daily check | |
| 11 | Developer/technical daily requirement and skill file document quantity | Standard daily check | |
| 12 | Developer/technical daily ROI — user benefit | Standard daily check | |

**Cross-source note (Q5):** Leave requests are currently checked from two places — the task management tool and mail. The dashboard should surface this as a single consolidated view when the workflow is designed.

### Secondary Screens

Items checked less frequently or requiring more detail — to be designed after main screen is stable:

1. Probation review overview
2. Confirmation recommendation overview
3. Training completion overview
4. Employee complaints overview
5. Performance review overview

### Future Submission Form Candidates (do not build yet)

From Q3 — Mayurika's direct submission preferences. Record as future candidates only. Do not build active forms until DWC sanity check is passed and read-only dashboard is stable.

1. Leave request submission
2. Probation review request
3. Confirmation recommendation
4. Training completion
5. Employee complaint
6. Performance review

---

## Known Limits

- This intent capture records Mayurika's answers from the 5-question session. It does not constitute approval of the final screen design.
- The screen list is a draft. It must be reviewed by DWC (Varmen) before screens are built — per AIOS UI/UX Build Guide §5.
- No submission forms are to be built until: (a) the read-only dashboard is confirmed stable and useful, and (b) DWC sanity check is passed — per Build Guide §7 (Bike Method).
- Leave requests cross-source item (Q5) requires workflow design to determine how the two sources (task management tool and mail) are consolidated — this is pending.
- Mayurika workbench status remains DRAFT. This intent capture does not promote her workbench to ACTIVE.
- No [VERIFY] items are resolved by this document.
- No sensitive HR data, staff names, personal information, salary, health, or disciplinary details are included in this capture.

---

## Pass/Fail Rule

**PASS** if:
- All 5 questions are recorded with Mayurika's answers
- Screen list is derived from those answers only
- No submission forms are built yet
- No sensitive data is included
- DWC sanity check step is explicitly noted as pending

**FAIL** if:
- Any form or submission feature is built before the read-only dashboard is confirmed
- Any sensitive HR data appears in the screen design
- Screen list is treated as approved before DWC review

**Current status: PASS — DWC sanity check pending**

---

## Next Step

Bring the screen list to DWC (Varmen) for quick sanity check — per AIOS UI/UX Build Guide §5. Do not begin building screens until DWC confirms the screen list is correct. After DWC sanity check passes, proceed to build the read-only dashboard view first (Build Guide §7 Step 3).

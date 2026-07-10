---
name: hr-schedule-pilot-readme
type: schedule-pilot-readme
member: Mayurika / Mayuri
role: HR Officer
created: 2026-07-06
status: HR_SCHEDULE_PILOT_INTERNAL_BUILD_PENDING_MAYURIKA_CONFIRMATION
source: MD schedule request relayed to Mayurika, 6 July 2026 (Mareenraj_Schedule_Build_Guide.docx)
root-truth: CLAUDE.md — canonical; this file is a pilot skeleton only
---

# HR Schedule Pilot — Mayurika / Mayuri

**Root Truth Rule:** This folder is an internal schedule-pilot skeleton. It does not replace CLAUDE.md and it does not resolve any [VERIFY] item. All authority, policy, and governance rules remain in the root CLAUDE.md and registered sources.

---

## 1. What This Is

This is a **static schedule skeleton** for the HR domain (Mayurika / Mayuri only). It exists to give the MD-requested schedule structure a first, safe home:

- a priority queue for HR tasks (High / Medium / Low), and
- a weekly, Google Calendar-style visual layer (preview only, in the dashboard).

It is an **internal build / validate-later** deliverable. Nothing here is connected to a live system.

---

## 2. Why It Exists

The MD requested a schedule structure to organise management tasks by priority, plus a Google Calendar-style visual layer. That request was relayed to Mayurika on 6 July 2026.

**User scope correction:** the schedule system is being built **for HR only first**. This is an HR / Mayurika pilot — not the full Management Team schedule. No schedule files are created for Arun, Suman, Rajiv/Admin, Varmen, or any other member in this pilot.

---

## 3. Source

| Item | Detail |
|---|---|
| Source document | `Mareenraj_Schedule_Build_Guide.docx` |
| Source described in guide | Direct MD request, relayed to Mayurika, 6 July 2026 |
| Evidence file | `evidence/stakeholder-confirmations/hr-schedule-pilot-md-request-2026-07-06.md` |
| Confirmed from guide | MD wants a schedule structure to organise management tasks by priority + a Google Calendar-style visual layer |

---

## 4. Scope

- **In scope:** HR / Mayurika schedule pilot only.
- **Out of scope (this pilot):** Full Management Team schedules; individual files for Arun, Suman, Rajiv/Admin, Varmen, or other members.

---

## 5. Status

**HR_SCHEDULE_PILOT_INTERNAL_BUILD_PENDING_MAYURIKA_CONFIRMATION**

The skeleton is built. It is AMBER until Mayurika / Varmen confirm the HR schedule rules and recurring-block ownership.

---

## 6. What Is Confirmed

| Confirmed | From |
|---|---|
| MD wants a priority-based schedule structure | Guide (MD request) |
| MD wants a Google Calendar-style visual layer | Guide (MD request) |
| First build is HR / Mayurika only | User scope correction |
| The five recurring blocks below exist on the MD screenshot | Guide |

**MD screenshot recurring blocks — HR applicability [VERIFY]:**

- Monday 11:30 — Merchandising
- Monday 12:00 — CST call
- Tuesday 10:00 — Team Leader Review
- Wednesday 10:00 — Technical interviews
- Thursday 06:30 — Technical sessions

These are recorded as **reference only** in `recurring-templates/md-screenshot-recurring-blocks-reference.md`. HR ownership/applicability is [VERIFY]. Do not add them to Mayurika's schedule as owned tasks until confirmed.

---

## 7. What Is [VERIFY]

| # | [VERIFY] Item |
|---|---|
| 1 | HR priority scale — High / Medium / Low or numeric? |
| 2 | Mayurika's daily HR schedule categories |
| 3 | Which recurring blocks (if any) belong to HR |
| 4 | Whether Mayurika manages interview / session scheduling |
| 5 | CST meaning |
| 6 | Exact durations of blocks |
| 7 | Who can edit the HR schedule |
| 8 | Whether this replaces or runs alongside an existing HR / meeting schedule |

All unconfirmed fields in the pilot files are tagged `[VERIFY]`.

---

## 8. Safety Boundaries

- Static schedule skeleton and dashboard preview only.
- No live calendar integration. No Google Calendar API. No `fetch()` / backend / database.
- No automation. No editable events. No forms.
- No real private HR data. No real staff names. No interview candidate personal data.
- No invented daily tasks — placeholder rows only.
- Does not resolve any [VERIFY] item.
- Does not create full Management Team schedules.

---

## 9. Files in This Folder

| File | Purpose |
|---|---|
| `README.md` | This file — pilot overview, scope, status, safety |
| `priority-queue.md` | HR priority queue skeleton (High / Medium / Low) |
| `mayurika.md` | Mayurika HR weekly schedule skeleton |
| `recurring-templates/README.md` | Recurring-template folder index |
| `recurring-templates/hr-schedule-block-template.md` | Reusable recurring HR block template |
| `recurring-templates/md-screenshot-recurring-blocks-reference.md` | MD screenshot recurring blocks — reference only |
| `archive/README.md` | Where superseded schedule versions go |

---

## 10. Next Step

Ask Mayurika / Varmen the HR schedule confirmation questions in §7 (priority scale, HR categories, recurring-block ownership, interview/session scheduling ownership, CST meaning, durations, edit rights, replace-or-parallel). Once confirmed, resolve the [VERIFY] fields and re-validate. Do not expand to full Management Team schedules until separately requested.

---

## 11. Confirmation Request Sent (2026-07-06)

A written confirmation request covering all 8 [VERIFY] items in §7 has been created and routed to Mayurika / Varmen.

**Evidence file:** `evidence/stakeholder-confirmations/hr-schedule-pilot-confirmation-request-2026-07-06.md`

**Status:** remains **AMBER** until Mayurika / Varmen answer. No [VERIFY] item is resolved by this note.

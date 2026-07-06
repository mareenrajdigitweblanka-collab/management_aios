---
name: hr-schedule-pilot-md-request-2026-07-06
type: stakeholder-confirmation
created: 2026-07-06
source: MD schedule request relayed to Mayurika, 6 July 2026 (Mareenraj_Schedule_Build_Guide.docx)
status: HR_SCHEDULE_PILOT_INTERNAL_BUILD_PENDING_MAYURIKA_CONFIRMATION
---

# HR Schedule Pilot — MD Schedule Request (Relayed to Mayurika)

**Title:** HR Schedule Pilot — MD Schedule Request, HR-Only First Build

**Date:** 2026-07-06

---

## Source

- **Source document:** `Mareenraj_Schedule_Build_Guide.docx`
- **Source described in guide:** Direct MD request, relayed to Mayurika, 6 July 2026.

---

## User Correction

The schedule system is being built **first for HR only**. This is an HR / Mayurika pilot. Do NOT build the full Management Team schedule yet. Do NOT create schedule files for Arun, Suman, Rajiv/Admin, Varmen, or other members in this pilot.

---

## Visual Target

Google Calendar-style schedule view — a weekly visual layer plus a priority-based task structure. Static preview only; no Google Calendar connection.

---

## Scope

- **In scope:** HR / Mayurika schedule pilot only.
- **Out of scope (this pilot):** Full Management Team schedules; per-member schedule files for anyone other than Mayurika.

---

## Confirmed Recurring Block Reference

Recorded from the MD screenshot as **reference only** (HR ownership/applicability [VERIFY]):

| Weekday | Base Time | Block |
|---|---|---|
| Monday | 11:30 | Merchandising |
| Monday | 12:00 | CST call |
| Tuesday | 10:00 | Team Leader Review |
| Wednesday | 10:00 | Technical interviews (Saranya, Kajith, Pirija, Kayal — role/status [VERIFY]) |
| Thursday | 06:30 | Technical sessions (Vithusali, Dilaxshan, Mithula, Sakithiya, Gishor — role/status [VERIFY]) |

Recorded in `schedules/hr/recurring-templates/md-screenshot-recurring-blocks-reference.md`. Labelled "MD screenshot recurring blocks — HR applicability [VERIFY]". Mayurika ownership is not claimed.

---

## [VERIFY] Items

| # | Item |
|---|---|
| 1 | HR priority scale — High / Medium / Low or numeric? |
| 2 | Mayurika's daily HR schedule categories |
| 3 | Which recurring blocks belong to HR |
| 4 | Whether Mayurika manages interview / session scheduling |
| 5 | CST meaning |
| 6 | Exact durations |
| 7 | Who can edit the HR schedule |
| 8 | Whether this replaces or runs alongside an existing HR / meeting schedule |

---

## Build Boundary

- Static schedule skeleton + dashboard preview only.
- No live calendar integration, no Google Calendar API, no automation, no database, no `fetch()`/backend.
- No real private HR data, no real staff names, no candidate personal data, no invented daily tasks.
- Does not resolve any [VERIFY] item.
- Does not create full Management Team schedules.

---

## Pass/Fail Rule

PASS if the HR-only schedule pilot and read-only calendar preview are created without building full Management Team schedules, without invented tasks, and with all unconfirmed fields marked [VERIFY].

FAIL if full Management Team schedule files are created, if real/private HR data or invented tasks appear, if any live calendar/API/automation is added, or if unconfirmed fields are stated as confirmed.

---

## Next Step

Ask Mayurika / Varmen the eight HR schedule confirmation questions above (priority scale, HR categories, recurring-block ownership, interview/session scheduling ownership, CST meaning, durations, edit rights, replace-or-parallel). Remains AMBER until confirmed.

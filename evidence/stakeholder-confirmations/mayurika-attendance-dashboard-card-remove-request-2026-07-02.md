---
name: mayurika-attendance-dashboard-card-remove-request-2026-07-02
type: stakeholder-confirmation
domain: HR / Mayurika
created: 2026-07-02
created-by: Mareenraj (builder)
stakeholder: Mayurika HR dashboard
scope: UI/card visibility only
status: CONFIRMED UI UPDATE — Attendance Dashboard card removed from visible dashboard; historical evidence retained
sensitivity: No attendance records, staff names, salary, health, PDPA personal data, disciplinary data, or employee IDs included
---

# Mayurika — Attendance Dashboard Card Removal Request

**Date:** 2026-07-02
**Stakeholder context:** Mayurika HR dashboard
**Update received via:** User

---

## Update Received

Remove the visible Attendance Dashboard card from the Mayurika HR tab. Do not show a NOT REQUIRED card for the Attendance Dashboard.

**Reason:** The feature is not wanted and no replacement is required. A visible NOT REQUIRED card is not needed.

---

## Scope

UI/card visibility only. This removes the visible card from the dashboard. It does not:
- Remove HR attendance or EOD process responsibilities from source-backed HR documentation
- Delete any prior evidence files (retained for traceability)
- Delete any prior validation records (retained)
- Delete any handover records (retained)
- Change any other Mayurika HR dashboard card

---

## What Was Done

The Attendance Dashboard card was removed from the Priority Cards section of the Mayurika HR tab in `web-view/index.html`. The closed info-box below the Priority Cards section was also removed, as the record is held in evidence and handover files.

---

## What Was NOT Done

- No replacement feature invented or built.
- No new card added.
- No other HR dashboard cards removed or changed.
- No historical evidence deleted.
- No sensitive attendance, staff, salary, health, or personal data added.
- CLAUDE.md not edited.
- evidence/source-register.md not edited.
- context/verify-register.md not edited.
- No [VERIFY] items resolved.

---

## Historical Evidence Retained

| File | Status |
|---|---|
| `evidence/stakeholder-confirmations/mayurika-attendance-dashboard-not-needed-2026-07-02.md` | RETAINED — pause state record |
| `evidence/stakeholder-confirmations/mayurika-attendance-dashboard-no-replacement-2026-07-02.md` | RETAINED — no-replacement confirmation |

---

## Sensitive-Data Check

| Data Type | Included? |
|---|---|
| Staff names | NO |
| Individual attendance records | NO |
| Salary or compensation data | NO |
| Health or medical details | NO |
| Disciplinary case details | NO |
| PDPA personal data | NO |
| Employee IDs | NO |

**Sensitivity check: PASS — process-level only**

---

## Known Limit

This only removes the visible card. No further work on the Attendance Dashboard unless Mayurika raises a new, separate requirement in the future. If she does, treat it as a new feature request from scratch.

Validation path: `validation/mayurika-attendance-dashboard-card-removal-check.md`

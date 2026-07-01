---
name: mayurika-ui-screen-list-check
type: validation
created: 2026-07-01
last-updated: 2026-07-01
checked-by: Mareenraj (builder)
scope: Mayurika HR Daily Control Panel — screen list validation before dashboard build
status: AMBER — DWC sanity check pending
---

# Mayurika UI Screen List — Validation Check

**Purpose:** Validate that the Mayurika UI screen list is correctly derived from the 5-question intent capture and is safe to present for DWC sanity check before any screens are built.

**Evidence source:** `evidence/stakeholder-confirmations/mayurika-ui-intent-capture-2026-07-01.md`

**Pass/Fail Rule:** PASS if intent is captured from Mayurika's answers only, screen list is complete, submission forms are not built yet, and DWC sanity check is explicitly noted as pending. AMBER if screen list is complete but DWC sanity check has not yet occurred. FAIL if any form is built before the read-only dashboard is confirmed or if sensitive data appears anywhere.

---

## 1. Intent Capture Check

| Check | Result |
|---|---|
| 5 questions asked | YES — all 5 questions from AIOS UI/UX Build Guide §4 asked |
| Mayurika's answers recorded word-for-word | YES — recorded in evidence file |
| Source document registered | YES — `5 questions.pdf` (input); `AIOS_UI_UX_Build_Guide.pdf` (guide) |
| Evidence file created | YES — `evidence/stakeholder-confirmations/mayurika-ui-intent-capture-2026-07-01.md` |
| Evidence file status | READY — Mayurika intent captured |
| Answers paraphrased or altered | NO — recorded as given |
| Sensitive HR data included | NO |

**Intent capture check: PASS**

---

## 2. Main/Home Screen Identified

| Check | Result |
|---|---|
| Main screen name identified | YES — "HR Daily Control Panel" |
| Source of main screen name | Q4 answer: "Task tool management" — confirmed as central daily need; panel named to reflect full daily scope |
| 11 daily check items captured (Q1) | YES — all 11 items from Mayurika's Q1 answer included |
| Priority cards identified (Q2 + Q4) | YES — Attendance dashboard, Leave requests, Task tool management |
| Cross-source item recorded (Q5) | YES — Leave requests come from task management tool AND mail |
| Card count on main screen | 12 (11 from Q1 + Task tool management from Q4, which was not in Q1) |

**Main screen check: PASS**

---

## 3. Secondary Screen Identified

| Check | Result |
|---|---|
| Secondary screens identified | YES — 5 screens |
| Secondary screens list | Probation review overview; Confirmation recommendation overview; Training completion overview; Employee complaints overview; Performance review overview |
| Source of secondary screens | Derived from Q3 items as review/overview screens (less frequent than daily checks) |
| Secondary screens built yet | NO — listed as future design candidates only |

**Secondary screen check: PASS**

---

## 4. Submission Form Candidates Identified

| Check | Result |
|---|---|
| Submission form candidates identified | YES — 6 candidates |
| Candidates list | Leave request submission; Probation review request; Confirmation recommendation; Training completion; Employee complaint; Performance review |
| Source | Q3 — Mayurika's direct answer on what she would submit directly |
| Forms built yet | NO — explicitly recorded as future candidates only |
| Build guide step followed | YES — Build Guide §7 (Bike Method): read-only dashboard must be confirmed stable before submission forms are added |
| DWC sanity check passed | NO — PENDING (required before building screens) |

**Submission form candidate check: PASS — forms NOT built; correctly deferred**

---

## 5. Sensitive-Data Check

| Check | Result |
|---|---|
| Staff names (individual) | NOT PRESENT |
| Salary or compensation data | NOT PRESENT |
| Personal health or medical data | NOT PRESENT |
| PDPA personal data | NOT PRESENT |
| Individual AXIOM scores | NOT PRESENT |
| Disciplinary case details or grievance records | NOT PRESENT |
| Candidate personal data | NOT PRESENT |
| Employee IDs | NOT PRESENT |

**Sensitive-data check: PASS**

---

## 6. Read-Only Check

| Check | Result |
|---|---|
| Dashboard section built as read-only | YES — HR Daily Control Panel in web-view/index.html is read-only placeholder cards only |
| Submission forms included in dashboard | NO |
| Write capability in dashboard | NO |
| Backend, API, or database code in dashboard | NO |
| Edit/save feature in dashboard | NO |
| External CDN in dashboard | NO |
| Note shown to user in dashboard | YES — "This panel is based on Mayurika's UI intent capture. It is read-only. It does not submit or update HR records yet." |

**Read-only check: PASS**

---

## 7. Dashboard Update Check

| Check | Result |
|---|---|
| HR Daily Control Panel section added to Mayurika HR tab | YES — added to `web-view/index.html` |
| Cards show item name, purpose, and current status | YES |
| Status for all cards | "Pending source connection / Pending workflow design — Read-only placeholder until DWC screen-list sanity check" |
| Mayurika marked ACTIVE | NO — remains DRAFT |
| [VERIFY] items resolved | NO — none resolved |
| Sensitive data in dashboard | NO |
| Duplicate truth introduced | NO — no policy text, KPI rules, or AXIOM bands reproduced |

**Dashboard update check: PASS**

---

## 8. Known Limits

- DWC (Varmen) sanity check has not yet occurred. Screen list and dashboard panel are AMBER until DWC reviews and passes the screen list.
- No submission forms are built. This is correct per Build Guide §7 (Bike Method — Step 3 first, Step 4 only after Step 3 is confirmed).
- Leave requests cross-source item (Q5) — workflow design for consolidating task management tool and mail sources is pending.
- Mayurika workbench remains DRAFT. This validation does not promote her workbench to ACTIVE.
- No [VERIFY] items are resolved by this task.

---

## 9. DWC Sanity Check Status

| Item | Status |
|---|---|
| Screen list drafted from Mayurika's answers | DONE |
| Evidence file created | DONE |
| Read-only dashboard placeholder added | DONE |
| DWC (Varmen) sanity check | PENDING |
| Screen build approved | PENDING — blocked on DWC sanity check |

**DWC sanity check: PENDING**

---

## Overall Result

**AMBER — DWC sanity check pending**

Intent captured from Mayurika's 5-question session. Screen list correctly derived from answers. Main screen identified (HR Daily Control Panel). Secondary screens identified (5 items). Submission form candidates identified (6 items) — correctly deferred; no forms built. Read-only placeholder cards added to Mayurika HR tab in `web-view/index.html`. Sensitive-data check: PASS. Read-only check: PASS. Mayurika remains DRAFT. No [VERIFY] items resolved.

AMBER because: DWC (Varmen) sanity check has not yet occurred. Screen list must be reviewed and passed by DWC before any screens are built beyond the current read-only placeholder.

**Next step:** Bring screen list to DWC for sanity check. Once passed, proceed to build the read-only dashboard view per Build Guide §7 Step 3.

---
name: member-tabs-ui-simplification-check
type: validation
created: 2026-07-09
created-by: Mareenraj (builder)
status: AMBER / UI CLEANUP ONLY
updated: 2026-07-09 — Update 2: removed specific "Useful for Day-to-Day Work" blocks from HR, Suman, and Arun tabs per user follow-up
---

# Validation — Member Tabs UI Simplification (2026-07-09)

## 2026-07-09 Update 2 — Removed Specific "Useful for Day-to-Day Work" Blocks

### A. User Requested Removal

Following the initial member-tab simplification, the user requested removal of specific named
"Useful for Day-to-Day Work" blocks from the Mayurika HR, Suman Recruitment, and Arun Implementation tabs.
Rajiv's tab was explicitly not to be intentionally changed. Calendars, introductions, and workbench file
details were to be preserved in all four tabs.

### B. HR (Mayurika) Removed Blocks

- Entire "Useful for Day-to-Day Work" section heading
- HR Task Categories (Daily / Weekly / Monthly)
- Priority Scale (CRITICAL / AMBER / GREEN)
- Recurring Block Durations
- Edit Rights &amp; Schedule Rule
- Daily Control Panel — Priority Items (Leave Requests, Task Tool Management)
- All Daily Check Items (EOD Submissions, Probation Reminders, New Joiners, HR Inbox, Pending Approvals,
  Document Verification, Missing Employee Documents, Developer/Technical — Skill File Quantity,
  Developer/Technical — Daily ROI &amp; User Benefit)

Confirmed via grep against the Mayurika tab's line range: 0 matches for any of the above section titles.

### C. Suman Removed Blocks

- Entire "Useful for Day-to-Day Work" section heading
- Recruitment Workflow
- Intake Checklist
- Candidate / Follow-up Tracking
- Weekly Deliverables

Confirmed via grep against the Suman tab's line range: 0 matches for any of the above section titles.

### D. Arun Removed Block

- Entire "Useful for Day-to-Day Work" section heading
- Portfolio Holder KPI Review Template block (both the "Use" and "Limit — template only" list items)

Confirmed via grep against the Arun tab's line range: 0 matches for "Portfolio Holder KPI Review Template" or
"Limit — template only". **Arun's 5 existing operational control tables (Portfolio Holder Review Preparation
Tracker, KPI Data Source Readiness Table, PH Monthly Review Output Checklist, Risk / Coaching / Action Plan
Tracker, Dashboard Requirement Tracker) were explicitly kept** — they were confirmed present (5/5 matches) and
are separate from the removed PH template block, per the task's explicit instruction not to remove them
unless they were part of the exact removed block.

### E. Calendars Retained

Each of the four member tabs (Mayurika, Suman, Arun, Rajiv) still has exactly one `.msc-instance` interactive
schedule calendar — confirmed by grep count (1 each). Add schedule / Update schedule / Cancel edit / Clear
Testing Data controls remain present (shared JS factory, unchanged). All four calendars remain
localStorage-only under their existing member-specific keys.

### F. Introduction and Workbench Details Retained

All four tabs still have exactly one `member-header` (introduction) and one "Workbench File Details" section
— confirmed by grep count against each tab's line range. Neither section was touched by this update.

### G. Rajiv Not Intentionally Changed

No edit was made inside the Rajiv tab (`tab-rajiv-blocked`) in this update. Its content — introduction,
workbench file details (5 draft files), Admin Responsibility Map / Governance Draft Areas / Approval-Escalation
Pending Confirmation cards, and the schedule calendar — was read and confirmed identical to its state at the
start of this update (from the prior simplification pass). The line numbers shifted only because earlier
tabs in the file got shorter; no Rajiv content was added, removed, or edited.

### H. Safety Confirmations

| Check | Result |
|---|---|
| `evidence/source-register.md` edited | NO — no diff |
| `context/verify-register.md` edited | NO — no diff |
| SRC-ADMIN-001 status | Unchanged — still PENDING |
| HR Schedule Pilot marked complete | NO — not referenced or changed by this update |
| Backend/database/schema/API code added | NO — none found |
| Evidence or validation files deleted | NO — none deleted |
| Standalone HTML file created | NO |
| `<div>` / `<table>` / `<details>` tags balanced | YES — confirmed via automated tag-count check |
| Mayurika HR no-table rule | PRESERVED — 0 `<table>` tags inside `tab-mayurika-hr` |

### I. Status

**AMBER / UI CLEANUP ONLY** (unchanged) — this update only removes specific named content blocks from three
member tabs' "Useful for Day-to-Day Work" sections; it does not change any confirmation status, source
registration, or backend logic.

---

## 1. User Requirement

"Every Members tab should have only Introduction about individual member AIOS, Workbench files Details, and
useful tables for increase efficiency for each member and schedule calendar part, nothing more than that. no
log confirmation or anything." This applies to all four member tabs: Mayurika HR, Suman Recruitment, Arun
Implementation, Rajiv Admin. This is a visible-UI cleanup only — no evidence, validation, or source/register
files were deleted; only the member-tab HTML in `web-view/index.html` was simplified.

## 2. Files Changed

| File | Change |
|---|---|
| `web-view/index.html` | All 4 member tabs (`tab-mayurika-hr`, `tab-suman-recruitment`, `tab-arun-implementation`, `tab-rajiv-blocked`) rewritten to show only Introduction, Workbench File Details, Useful Efficiency cards/tables, and Schedule Calendar |
| `validation/member-tabs-ui-simplification-check-2026-07-09.md` | This file — created |
| `handover/2026-06-30__web-view-dashboard-closure.md` | Short note appended (see task E) |

No file was deleted anywhere in the repository. `evidence/`, `validation/`, `handover/`, and `member-aios/`
directories are untouched.

## 3. Before/After Visible Section Rule

**Before:** each member tab mixed status/audit language (ACTIVE/reviewed badges, evidence code paths,
confirmation-item explain boxes, root-propagation records, "What should I do next?" developer-coordination
boxes, collapsed Evidence/Technical Details blocks, NSLP/HR-table pending-status walls) together with the
genuinely useful content (workbench files, day-to-day tables, schedule calendar).

**After:** each member tab follows a fixed 4-part order:
1. Introduction — plain-English role summary, no source IDs, no evidence paths, no validation wording.
2. Workbench File Details — simple card/list (`.file-list-box`), Purpose + How Used per file.
3. Useful Efficiency cards/tables — kept genuinely useful operational content per member (see section 4).
4. Schedule Calendar — the existing interactive `.msc-instance` calendar, unchanged.

## 4. Confirmation Each Member Tab Has Only the 4 Allowed Sections

| Tab | Introduction | Workbench File Details | Useful Efficiency Cards/Tables | Schedule Calendar |
|---|---|---|---|---|
| Mayurika HR | Plain intro + role scope, no status/evidence codes | 3 files, Purpose/How Used | HR Task Categories, Priority Scale (CRITICAL/AMBER/GREEN), Recurring Block Durations, Edit Rights note, Daily Control Panel cards (all card/list layout, no `<table>`) | 1 interactive calendar |
| Suman Recruitment | Plain intro + role scope | 3 files, Purpose/How Used | Recruitment Workflow, Intake Checklist, Candidate/Follow-up Tracking placeholder, Weekly Deliverables (cards) | 1 interactive calendar |
| Arun Implementation | Plain intro + role scope | 2 files, Purpose/How Used | Portfolio Holder review template card + 5 day-to-day control tables (Review Preparation Tracker, KPI Data Source Readiness, PH Review Output Checklist, Risk/Coaching/Action Plan Tracker, Dashboard Requirement Tracker) | 1 interactive calendar |
| Rajiv Admin | Plain intro, states draft/not-final clearly | 5 draft files, Purpose/How Used | Admin Responsibility Map (draft), Governance Draft Areas (draft), Approval/Escalation Pending Confirmation (cards, clearly labeled draft/pending) | 1 interactive calendar |

Verified via `awk` extraction of each tab's content: exactly one `member-header` (introduction), one
"Workbench File Details" section-title, one "Useful for Day-to-Day Work" section-title, and one
`.msc-instance` calendar mount per tab.

## 5. Confirmation Removed From Visible UI

Removed from all four member tabs (content remains in repo files, not deleted):

- **Mayurika:** VERIFY item 12/9 explain box; "What Mayurika Must Review" long domain-scope list; "What Must
  Not Be Stored Here" long warning box (condensed to one line in the intro); HR Daily Control Panel's
  "how-to-box" long intent-capture explanation; "Secondary Screens — Future Design" and "Future Submission
  Form Candidates" roadmap sections; "HR Tables — Pending MD/Varmen Confirmation" status wall; "NSLP Control
  System" status wall with collapsed Evidence/Technical Details; HR Schedule Pilot's collapsed
  Evidence/Technical Details block and its "What should I do next?" developer-coordination box.
- **Suman:** "Recruitment and Onboarding Scope" long list (condensed into intro + workflow card); "What Must
  Not Be Stored Here" warning box (condensed to one line in intro); "Review Evidence" file-list box (evidence
  path); "What should I do next?" box.
- **Arun:** member-header status/evidence-code/root-propagation paragraph; "New Source — Integrated" section's
  collapsed Evidence/Technical Details sub-block and file-path lines (kept the plain Use/Limit description as
  a simplified card); "Workbench Review — Confirmed Items" section (3 CONFIRMED verify-explain log boxes);
  "Root propagation — COMPLETE" next-step-box; "What should I do next?" box; the trailing
  "Canonical readiness status: member-aios/.../data-source-maps/..." technical paragraph after Table 2; the
  final collapsed "Evidence / Technical Details" block after Table 5; inline `SRC-*` §-reference citations
  were trimmed from table cells and headings where they were not load-bearing to the table's own function.
- **Rajiv:** the large "blocked-banner" audit-style wall was replaced with a short plain-English draft notice;
  "Why Is This Blocked?" long root-cause explanation section removed; "Items Blocked by This Gap" `<table>`
  of 5 VERIFY items removed (replaced with a single "Approval/Escalation — Pending Confirmation" card); "What
  to Do When SRC-ADMIN-001 Arrives" step-list (developer/registration workflow) removed; "What should I do
  next?" box removed. New Workbench File Details and Useful Efficiency cards were added referencing the
  existing draft files in `member-aios/rajiv-admin/` (confirmed present on disk), fulfilling the tab's
  required sections while keeping language explicitly "draft — not final."

No log-confirmation section, evidence/technical-details block, validation-detail wall, source/register
provenance wall, commit-hash/status-history text, PASS/AMBER audit block, or raw Q1–Q8-style confirmation
detail block remains visible in any of the four member tabs.

## 6. Safety Confirmations

| Check | Result |
|---|---|
| `evidence/source-register.md` edited | NO — no diff |
| `context/verify-register.md` edited | NO — no diff |
| SRC-ADMIN-001 status | Unchanged — still PENDING in `evidence/source-register.md` |
| HR Schedule Pilot marked complete | NO — status string `HR_SCHEDULE_PILOT_INTERNAL_BUILD_PENDING_MAYURIKA_CONFIRMATION` unchanged in its source files (`schedules/hr/README.md`, `schedules/hr/mayurika.md`, `schedules/hr/priority-queue.md`); it is no longer echoed in the dashboard's (now-removed) collapsed technical block, but the underlying pilot status itself was not edited or promoted |
| Schedule calendars still localStorage-only | YES — 4 member-specific keys unchanged (`management_aios_testing_schedule_mayurika_v1` / `_suman_v1` / `_arun_v1` / `_rajiv_v1`); no PostgreSQL/API/schema/server code exists anywhere in the file |
| Mayurika HR no-table rule | PRESERVED — 0 `<table>` tags inside `id="tab-mayurika-hr"` (confirmed by grep) |
| Standalone HTML file created | NO — only `web-view/index.html` exists in `web-view/` |
| Evidence/validation/handover/member-aios files deleted | NO — nothing deleted anywhere in the repo |
| Duplicate HTML `id` attributes | NONE found |
| `<div>` / `<table>` / `<details>` tags balanced | YES — confirmed via automated tag-count check after the rewrite |

## 7. Pass/Fail Rule

**PASS** if: each of the 4 member tabs shows only Introduction, Workbench File Details, Useful Efficiency
cards/tables, and Schedule Calendar; no log-confirmation, evidence/technical-details, validation-detail, or
source/register provenance content remains visible in any member tab; no repo files were deleted;
`evidence/source-register.md` and `context/verify-register.md` are untouched; SRC-ADMIN-001 remains
pending/unregistered; the HR Schedule Pilot's underlying status is unchanged; all four calendars remain
localStorage-only with Add/Update/Cancel/View/Delete/Clear Testing Data intact; and no HTML structural
imbalance (unclosed tags) was introduced. **FAIL** if any of the above is violated.

Result: **PASS** against this rule.

## 8. Status

**AMBER / UI CLEANUP ONLY** — this is a visible-dashboard simplification pass. It does not resolve any
`[VERIFY]` item, does not register any source, does not confirm Admin Manager authority, and does not mark
the HR Schedule Pilot or any member workbench review complete. All prior evidence, validation, and handover
records remain on disk exactly as before, simply no longer displayed in the member tabs themselves.

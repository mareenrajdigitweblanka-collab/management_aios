---
name: varmen-draft-dashboard-table-data-requirements-2026-07-02
type: dashboard-discovery
created: 2026-07-02
status: DISCOVERY COMPLETE — read-only; no tables built; domain owner review required before implementation
scope: evidence/dashboard-discovery — data requirement map only; not an implementation plan
root-truth: CLAUDE.md — canonical; this file is a discovery evidence record
draft-source: management-aios-dashboard.html — Varmen draft; sample data only; not operational truth
sources-boundary: Registered sources in evidence/source-register.md govern all content
sensitivity-boundary: context/confidentiality-rules.md — no individual staff data in this file
---

# Varmen Draft Dashboard — Table & Card Data Requirements Map (2026-07-02)

**Purpose:** Read-only discovery to identify what data each draft dashboard section needs, who owns that data, how sensitive it is, and whether a section is safe to build now or requires further confirmation.

**Critical boundary rules:**
- The draft dashboard HTML is a design sample from Varmen. It is NOT final approved operational truth.
- All sample rows, sample names, sample counts, and sample statuses in the draft are placeholder data only.
- No sample personal name from the draft may be treated as a real HR record or copied into an active HR system.
- No table is built in this file. No data is included. No [VERIFY] items are resolved.
- Build decisions require relevant domain owner confirmation (Mayurika for HR, Arun for KPI/AXIOM, Suman for onboarding/recruitment).

---

## Scope Update — 2026-07-02

Varmen clarified that leave-related tables are not required for the current dashboard build. The Leave Requests section remains in this file only as historical discovery of the draft sample. It is now **OUT OF CURRENT BUILD SCOPE**.

- Leave Requests table: **NOT REQUIRED / OUT OF CURRENT BUILD SCOPE**
- Leave tracking source/access confirmation: **no longer required for this dashboard build**
- Do not build leave-related tables.
- Do not collect leave records.
- This does not remove HR leave processes or leave policy from company truth. CLAUDE.md §10.1 and SRC-POLICY-001 are unchanged.

**Evidence:** `evidence/stakeholder-confirmations/varmen-dashboard-no-leave-tables-2026-07-02.md`

---

## TASK 1 — Draft UI Section Inventory

| Panel | UI Title | Element Type | Visible Columns / Metrics | Sample Values Found | Personal/Sensitive? | Notes |
|---|---|---|---|---|---|---|
| overview | Overview | Stat cards + card list + chips | Skills used this week, Open recurring issues, Policies confirmed, CLAUDE.md updated; weekly action cards; slash command chips | 23, 3, 6/6, "4d ago", team names | LOW — all aggregate or process-level | Sidebar foot shows "Day 187", Owner=Mayurika, Validator=Varmen |
| team | Team table | Data table | Employee (name + role), Status, Leave balance (days), Next KPI review date, Onboarding steps, Flag | Ravindu S., Nimasha F., Dulani P., Tharindu K., Menaka J. — with leave balances and review dates | RED — individual names + leave balances + KPI dates + onboarding status | Most sensitive table in draft |
| leave | Leave requests | Data table | Employee, Leave type, Dates, Days, Status, Approver | 8 named individuals with leave types (Annual, Sick, Casual), dates, day counts, approval status | RED — individual names, leave types, specific dates, approval status | Draft contains "Not eligible yet" row for probation staff |
| onboard | Onboarding tracker | Data table | Employee, Start date, Docs signed, IT setup, Induction, Manager intro, Status (n/5 steps) | 4 named individuals — Nimasha F., Tharindu K., Piyumi W., Ravindu S. — with step completion flags | RED — individual names, start dates, per-step completion status | Contains "Docs not signed" flag against a named individual |
| kpi | KPI schedule | Data table | Team, Lead (name), Last review, Next review, Cadence, Status | 5 team rows with named leads: Dulani P., Menaka J. (×2), Kavindu R., Nadeesha W. | AMBER — team-level mostly; lead names add individual layer | KPI schedule overdue flag visible for Design team |
| docs | Document register | Data table | File name, Folder path, Owner (name), Last updated, Status (Confirmed/Draft) | 8 file rows with folder paths, named owners (Mayurika, Varmen, Dulani P.) | LOW — file metadata; owner names are role-level management people, not general staff | Most content is process-level path metadata |
| skills | Skills | Tiered card list | Skill name, Usage count, Cadence, Status | /team-brief (41), /policy-lookup (89), /onboarding-checklist (14), /review-prep (9), /escalation-router (6), /recurring-issue-log (18 entries), /policy-gap-check | LOW — aggregate usage counts only | Tier labels (1/2/3) present; no individual attribution |
| issues | Recurring issues | Card list | Issue title, report count, status (Open / Resolved) | KPI meetings late (11 reports), Duplicate onboarding docs (4 reports), Leave requests lost (3 reports), Escalation path unclear (resolved month 3) | LOW — process-level descriptions; no personal detail | Report counts are aggregate |
| decisions | Decisions | Card list | Decision title, context note, approval attribution, approximate date (month reference) | 3 decisions — escalation rule, Google Calendar connection, confidentiality rule — attributed to Varmen and Mayurika | LOW — process decisions; approvers are domain owners not general staff | Month references only; no absolute dates |
| handover | Handover | Key-value panel + button | Owner, Intern involvement, Unknown Developer Test result, Last handover note date | Owner=Mayurika, Test=Passed, Last handover=Month 4 | LOW — role-level metadata only | "View handover note" button — no backend in draft |

---

## TASK 2 — Data Requirement Map by Section

---

### OVERVIEW PANEL

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Skills used this week | Count of skill executions in the past 7 days | Mareenraj / system | skills/ folder + execution log (if any) | LOW | YES | Aggregate | YES | PASS if count only; FAIL if linked to individual user |
| Open recurring issues | Count of unresolved recurring issue records | Mayurika / domain owner | intelligence-inbox/recurring-issues/ | LOW | YES | Aggregate | YES | PASS if count only |
| Policies confirmed | Count of confirmed source documents vs total | Mareenraj | evidence/source-register.md | LOW | YES | Aggregate | YES | PASS if count matches source-register.md |
| CLAUDE.md updated (days ago) | Days since last git commit to CLAUDE.md | Mareenraj | git log — CLAUDE.md | LOW | YES | Aggregate | YES | PASS if derived from git metadata |
| This-week action cards | Process-level alerts — onboarding count, KPI scheduling status | Mayurika | management-action-records/ + KPI schedule metadata | LOW–AMBER | YES | Aggregate | YES | PASS if no individual names shown; AMBER if team names used |
| Slash command chips | Example skill invocations | Mareenraj | skills/ folder | LOW | YES | N/A (UI element) | YES | PASS |

---

### TEAM TABLE

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Employee name + role | Individual staff identity and role title | Rajiv (canonical name spelling) + Mayurika (records) | HR staff records — NOT in repo; held by Mayurika | RED | NEEDS REVIEW — write authority is Mayurika; display requires HR-only access rule | Individual | YES (placeholder names only; never real HR data in repo) | FAIL to build with real names until HR data access and anonymisation rules confirmed |
| Employment status | Active / Onboarding / Leave / Suspended | Mayurika | HR staff records | RED | NEEDS REVIEW | Individual | YES | FAIL until access rule confirmed |
| Leave balance (days used / total) | Individual leave entitlement and usage | Mayurika + leave tracker | Leave tracking system (external; not in repo) | RED | NEEDS REVIEW | Individual | YES | FAIL until leave source and HR-only access confirmed |
| Next KPI review date | Scheduled review date per staff member | Mayurika (scheduling) + Arun (KPI) | management-action-records/ or review schedule | AMBER | NEEDS REVIEW — Arun owns KPI definitions; Mayurika owns scheduling | Individual | YES | AMBER — Arun confirmation needed for KPI date data |
| Onboarding step count (n / 5) | Which onboarding steps have been completed | Mayurika + Suman | Onboarding tracker — external or repo-based checklist | AMBER | NEEDS REVIEW — Suman owns onboarding; Mayurika owns records | Individual | YES | AMBER — Suman / Mayurika boundary must be confirmed |
| Flag (alert text) | Issue description e.g. "KPI meeting overdue" | Derived from data above | N/A — logic derived from other fields | AMBER | YES — if no personal content | Individual | YES | AMBER |

**Section build-readiness: FAIL — individual-level data with names, leave balances, KPI dates, and onboarding steps requires HR data access rules and anonymisation confirmation before any real-data build.**

---

### LEAVE REQUESTS — HISTORICAL DISCOVERY ONLY — OUT OF CURRENT BUILD SCOPE

> **Scope update 2026-07-02:** Varmen confirmed leave-related tables are not required for the current dashboard build. The analysis below is retained as historical discovery of the draft sample only. Do not build this section. Do not collect leave data. Evidence: `evidence/stakeholder-confirmations/varmen-dashboard-no-leave-tables-2026-07-02.md`

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Employee name + role | Individual requester identity | Mayurika (records) + Rajiv (canonical name) | HR leave system — NOT in repo | RED | NEEDS REVIEW | Individual | YES (placeholder only) | FAIL until HR-only access and leave source confirmed |
| Leave type | Annual / Sick / Casual / Maternity | Mayurika | Leave tracker / email / HR system | AMBER | YES | Individual | YES | AMBER — leave type is not health data per se but Sick leave type touches medical context |
| Leave dates | Specific calendar dates of leave | Mayurika | Leave tracker | AMBER | YES | Individual | YES | AMBER |
| Leave days count | Duration of leave request | Mayurika | Leave tracker | LOW | YES | Individual | YES | PASS if no names |
| Approval status | Pending / Approved / Draft | Mayurika | Leave tracker | AMBER | YES | Individual | YES | AMBER |
| Approver name | Name of approving person (e.g. Team Lead) | Mayurika + TL | Leave tracker | LOW | YES — management names only | Individual | YES | AMBER — approver names are TL / management only |

**Section build-readiness: AMBER–RED — leave source must be identified and confirmed; HR-only access rule required; Sick leave type adds AMBER sensitivity layer; probation "not eligible" logic needs policy source confirmation (SRC-POLICY-001 §6.2 — no leave during 3-month probation).**

---

### ONBOARDING TRACKER

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Employee name + role | Individual new joiner identity | Rajiv (canonical name) + Mayurika (records) + Suman (recruitment handoff) | HR staff records — NOT in repo | RED | NEEDS REVIEW — Suman owns onboarding handoff; Mayurika owns records | Individual | YES (placeholder only) | FAIL until domain boundary (Suman vs Mayurika) confirmed |
| Start date | First working day | Suman (recruitment) → Mayurika (HR record) | HR staff records | AMBER | NEEDS REVIEW | Individual | YES | AMBER |
| Docs signed status | Whether pre-employment documents are collected | Mayurika | Onboarding checklist system or HR records | AMBER | YES | Individual | YES | AMBER |
| IT setup status | Whether system/tool access is provisioned | IT/Admin (not confirmed) | IT system — not in repo | AMBER | NO — IT provisioning not in Mayurika domain | Individual | YES | AMBER — IT domain owner unknown; not in confirmed source |
| Induction status | Whether company induction occurred | Mayurika + TL | Onboarding checklist | AMBER | YES | Individual | YES | AMBER |
| Manager intro status | Whether manager introduction is completed / scheduled | Mayurika + TL | Onboarding checklist | AMBER | YES | Individual | YES | AMBER |
| Overall step count (n / 5) | Composite onboarding progress | Derived | N/A | AMBER | YES | Individual | YES | AMBER — step definitions need source confirmation (OLOS / SRC-MD-SUMAN-001 §11.8 defines required validation documents) |

**Section build-readiness: AMBER — Suman owns OLOS onboarding validation (SRC-MD-SUMAN-001 §11.8); Mayurika owns staff records; exact 5-step definition not confirmed in a registered source; individual names add RED layer. Domain boundary between Suman and Mayurika must be confirmed before any real-data build.**

---

### KPI SCHEDULE

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Team name | Business unit / department name | Rajiv (canonical structure) | context/organization-structure.md or CLAUDE.md §3 | LOW | YES | Aggregate | YES | PASS |
| Team lead name | Named TL responsible for the team | Rajiv (canonical name) + Mayurika (records) | HR staff records | AMBER | NEEDS REVIEW | Individual | YES | AMBER — management-level names are lower sensitivity but still require confirmation |
| Last review date | Date of most recent KPI review | Mayurika (scheduling) | management-action-records/ or external KPI schedule | AMBER | YES — scheduling is Mayurika's confirmed responsibility | Individual (team-level) | YES | AMBER — source for actual review dates must be confirmed |
| Next review date | Scheduled upcoming review date | Mayurika (scheduling) | management-action-records/ or external KPI schedule | AMBER | YES | Individual (team-level) | YES | AMBER |
| Cadence | Review frequency (Monthly / Quarterly) | Arun (KPI definitions) | CLAUDE.md §7.6 + SRC-ARUN-001 | LOW | YES — metadata only | Aggregate | YES | PASS if metadata only |
| Status | Scheduled / Overdue / Unscheduled | Derived from review dates | N/A | LOW | YES | Aggregate | YES | PASS if no personal detail |

**Section build-readiness: AMBER — team name and cadence are PASS-level metadata; lead names and actual review dates require source confirmation; Arun should confirm KPI schedule data falls inside dashboard scope. Draft shows "Unscheduled" flag for Design team — this is the exact problem area named in SRC-VAR-001 (KPI meeting irregularities) and is safe to reflect as a process-level alert without individual data.**

---

### DOCUMENT REGISTER

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| File name | Markdown document name | Mareenraj (repo structure) | context/, evidence/, intelligence-inbox/ | LOW | YES | N/A (file metadata) | YES | PASS |
| Folder path | Location of file in repo | Mareenraj | Repo directory listing | LOW | YES | N/A | YES | PASS |
| Owner | Role or person responsible for the document | Mayurika / Varmen / domain owner | CLAUDE.md + handover files | LOW | YES — management names only | N/A | YES | PASS |
| Last updated | Recency of last edit | Mareenraj | git log metadata | LOW | YES | N/A | YES | PASS |
| Status | Confirmed / Draft | Mareenraj + domain owner | evidence/source-register.md | LOW | YES | N/A | YES | PASS — status must match source-register.md |

**Section build-readiness: PASS — document register is file metadata only; no personal data; can be built from repo structure and source-register.md. Confirm: draft shows files (e.g. kpi-meeting-format.md, leave-tracking-proposal.md) that do not currently exist in the repo — any live build must use only real file paths, not the draft's invented file names.**

---

### SKILLS

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Skill name (slash command) | Name of the AIOS skill | Mareenraj | skills/ folder | LOW | YES | N/A | YES | PASS |
| Usage count | Number of times skill has been invoked | Mareenraj / system log | No current repo log; would need tracking mechanism | LOW | YES | Aggregate | YES | AMBER — no usage tracking exists in repo yet; counts in draft are placeholder |
| Cadence label | Daily / weekly / per-event label | Mareenraj | skills/ + CLAUDE.md | LOW | YES | N/A | YES | PASS |
| Tier | Tier 1 / 2 / 3 classification | Mareenraj | skills/ folder README or CLAUDE.md | LOW | YES | N/A | YES | PASS |
| Status | Confirmed / Draft | Mareenraj + domain owner | evidence/source-register.md | LOW | YES | N/A | YES | PASS |

**Section build-readiness: PASS for skill names, tiers, and statuses — all derivable from skills/ folder. AMBER for usage counts — no tracking mechanism currently exists in the repo; counts in draft (89, 41, etc.) are placeholder data only. Do not publish usage counts without a confirmed source.**

---

### RECURRING ISSUES

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Issue title | Short description of the recurring problem | Mayurika / domain owner | intelligence-inbox/recurring-issues/ | LOW | YES | Process-level | YES | PASS if no personal names |
| Report count | Number of times issue has been documented | Mayurika / domain owner | intelligence-inbox/recurring-issues/ | LOW | YES | Aggregate | YES | PASS |
| Status | Open / Resolved | Mayurika / domain owner | intelligence-inbox/recurring-issues/ | LOW | YES | Process-level | YES | PASS |
| Resolution note | Brief description of fix or action taken | Mayurika / domain owner | management-action-records/ | LOW | YES | Process-level | YES | PASS if no personal data |

**Section build-readiness: PASS — one existing recurring-issues record found (intelligence-inbox/recurring-issues/2026-06-22_mayurika-hr_md-discussion_management-structure-llm-compliance.md). Full recurring-issues register does not yet exist as a structured file; draft's 3 open issues + 1 resolved are placeholder. Safe to design the section now; populate from real action records only.**

---

### DECISIONS

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Decision title | Short label for the management decision | Domain owner (Mayurika/Arun/Suman) | management-action-records/ | LOW | YES | Process-level | YES | PASS if no personal data |
| Context note | Brief rationale for the decision | Domain owner | management-action-records/ | LOW | YES | Process-level | YES | PASS |
| Approval attribution | Who approved the decision | Domain owner + reviewer | management-action-records/ or handover files | LOW | YES — management names only | Process-level | YES | AMBER — approver must be confirmed from current reviewer model (CLAUDE.md §18); Varmen is historical only; ongoing approvals route to domain owners |
| Approximate date | Month reference or absolute date | Domain owner | management-action-records/ | LOW | YES | N/A | YES | PASS |

**Section build-readiness: AMBER — decision structure is safe; approval attribution requires current reviewer routing model (CLAUDE.md §18); Varmen attribution is correct only for historical decisions; new decisions must cite domain owner or relevant Management Team member, not Varmen.**

---

### HANDOVER

| Field / Metric | Meaning | Required Source Owner | Possible Repo Path / System | Sensitivity | Mayurika Allowed? | Aggregate or Individual? | Placeholder Allowed? | Pass/Fail Rule |
|---|---|---|---|---|---|---|---|---|
| Owner assigned | Current primary operational owner of the AIOS | Mareenraj + domain routing | CLAUDE.md §1 + handover/ folder | LOW | YES | N/A | YES | PASS |
| Intern / builder involvement | Whether original builder (Mareenraj) is still active | Mareenraj | handover/ folder | LOW | YES | N/A | YES | PASS |
| Unknown Developer Test result | Whether a clean LLM could navigate the AIOS | Mareenraj | CLAUDE.md §15 (Queryability Test) | LOW | YES | N/A | YES | PASS |
| Last handover note date | Date of most recent handover file | Mareenraj | handover/ folder | LOW | YES | N/A | YES | PASS |

**Section build-readiness: PASS — all fields are role-level metadata derivable from CLAUDE.md and handover/ folder. The "View handover note" button in the draft links to no backend; in a real build, it would be a link to handover/2026-06-30__web-view-dashboard-closure.md or similar.**

---

## TASK 3 — Build Readiness Classification

| Panel | Build Readiness | Reason |
|---|---|---|
| Overview | PASS | Aggregate metrics and process-level cards; no individual data; slash commands are metadata |
| Team table | FAIL | Contains individual names, leave balances, KPI review dates, onboarding steps; individual-level RED data; requires HR data access rules and anonymisation before any real-data build |
| Leave requests | NOT REQUIRED / OUT OF CURRENT BUILD SCOPE | Varmen confirmed 2026-07-02 — leave-related tables not required for current dashboard build. Historical discovery retained above for reference only. Evidence: `evidence/stakeholder-confirmations/varmen-dashboard-no-leave-tables-2026-07-02.md` |
| Onboarding tracker | AMBER | Domain boundary (Suman vs Mayurika) unconfirmed; 5-step definition not source-backed; individual names add RED layer; OLOS validation (SRC-MD-SUMAN-001) must inform step definitions |
| KPI schedule | AMBER | Team/cadence is PASS; lead names and actual dates need confirmation; Arun should confirm scope; overdue flag is safe as process-level alert |
| Document register | PASS | File metadata only; no personal data; must use only real repo file paths, not draft's invented paths |
| Skills | PASS | Skill names and tiers from skills/ folder; AMBER only on usage counts (no tracking mechanism) |
| Recurring issues | PASS | Process-level descriptions; report counts are aggregate; draft's 3 issues are placeholder; populate from real action records |
| Decisions | AMBER | Approval attribution requires current reviewer routing (CLAUDE.md §18); historical Varmen attribution is valid only for past decisions |
| Handover | PASS | Role-level metadata from CLAUDE.md and handover/ folder; no personal data |

**Summary:** PASS — 4 sections (Overview, Document Register, Skills, Handover); AMBER — 3 sections (Onboarding, KPI Schedule, Decisions); FAIL — 1 section (Team Table); NOT REQUIRED / OUT OF CURRENT BUILD SCOPE — 1 section (Leave Requests — Varmen confirmed 2026-07-02).

---

## TASK 4 — Minimum Data Sources Checklist

| Source | Required For | Owner | Mayurika Can Provide? | Sensitive Data? | Safe Field Subset |
|---|---|---|---|---|---|
| HR staff records (external system) | Team table, Leave requests, Onboarding tracker | Mayurika (custodian) | YES — she holds records; access rules not yet defined | RED — individual names, status, dates | Role title, employment status category, step count (not name) |
| ~~Leave tracker / leave log~~ | ~~Leave requests, Team table leave balance~~ | ~~Mayurika~~ | NOT REQUIRED for current dashboard build — Varmen confirmed 2026-07-02 | N/A | N/A |
| Onboarding checklist system | Onboarding tracker, Team table | Mayurika + Suman | NEEDS REVIEW — Suman owns onboarding handoff | AMBER — individual step status | Step count (n / 5), team name |
| Review schedule / KPI meeting log | KPI schedule, Team table KPI date | Mayurika (scheduling) + Arun (KPI definitions) | Partially — scheduling yes; KPI content is Arun | AMBER — review dates are team-level | Team name, cadence, scheduled date, overdue flag |
| Document / source register | Document register, Overview (policies confirmed count) | Mareenraj | YES — evidence/source-register.md | LOW | All fields |
| Skills folder | Skills panel | Mareenraj | YES — skills/ | LOW | All fields |
| Recurring issues register | Recurring issues panel | Mayurika / domain owner | YES — intelligence-inbox/recurring-issues/ | LOW | All fields |
| Management action records | Decisions, Recurring issues, KPI follow-up | Mayurika / Arun / Suman / Rajiv | YES — per domain | LOW–AMBER | Process-level description, date, action owner |
| Handover files | Handover panel | Mareenraj | YES — handover/ | LOW | All fields |
| Git log (file timestamp) | Overview (CLAUDE.md updated), Document register (last updated) | Mareenraj | YES — git metadata | LOW | Commit date only |
| Confidentiality / access rules | All RED/AMBER sections | CLAUDE.md §6 + context/confidentiality-rules.md | YES — read-only | LOW | N/A — governance reference |
| Reviewer routing model | Decisions (approval attribution) | CLAUDE.md §18 | YES — read-only | LOW | N/A — governance reference |

---

## TASK 5 — Recommended Safe Build Order

| Step | Section | Rationale |
|---|---|---|
| 1 | Document Register | File metadata only; derivable from repo and source-register.md; no data risk; PASS confirmed |
| 2 | Skills | Skill names, tiers, statuses from skills/ folder; PASS confirmed; defer usage count display until tracking mechanism exists |
| 3 | Handover | Role metadata from CLAUDE.md and handover/; PASS confirmed |
| 4 | Recurring Issues | Process-level descriptions; derive from real intelligence-inbox/recurring-issues/ records only; no personal names |
| 5 | Overview | Aggregate stats and process cards; derive from source-register.md, git log, real recurring-issues count; no individual data |
| 6 | Decisions | Process decisions from management-action-records/; confirm current approval attribution using CLAUDE.md §18 before publishing |
| 7 | KPI Schedule | Team name and cadence are safe now; lead names and review dates require Mayurika scheduling records and Arun scope confirmation |
| ~~8~~ | ~~Leave Requests~~ | **EXCLUDED — OUT OF CURRENT BUILD SCOPE.** Varmen confirmed 2026-07-02 — leave-related tables not required. Do not build. Evidence: `evidence/stakeholder-confirmations/varmen-dashboard-no-leave-tables-2026-07-02.md` |
| 9 | Onboarding Tracker | Build only after: (a) Suman–Mayurika domain boundary confirmed, (b) 5-step definition source-backed (OLOS or SRC-MAYU-001), (c) individual data display rules defined |
| 10 | Team Table | Build only after: (a) HR data access and anonymisation rules confirmed by Mayurika and domain owner sign-off, (b) display format agreed (role only vs name), (c) all underlying sources confirmed |

---

## Sample Placeholder Data Note

The following sample personal names appear in the draft dashboard HTML. They are design-sample placeholders only. They must not be treated as real HR records or imported into any system:

| Draft Name | Appears In | Treatment |
|---|---|---|
| Ravindu S. | Team table, Onboarding tracker, Leave requests | Sample placeholder — warehouse assistant role |
| Nimasha F. | Team table, Onboarding tracker, Leave requests | Sample placeholder — warehouse assistant role |
| Dulani P. | Team table, KPI schedule, Document register | Sample placeholder — design lead role |
| Tharindu K. | Team table, Onboarding tracker, Leave requests | Sample placeholder — warehouse assistant role |
| Menaka J. | Team table, KPI schedule, Leave requests | Sample placeholder — support lead role |
| Piyumi W. | Onboarding tracker | Sample placeholder — support agent role |
| Kavindu R. | KPI schedule | Sample placeholder — sales lead role |
| Nadeesha W. | KPI schedule | Sample placeholder — finance lead role |
| Kasun P., Ishara S., Chamika H., Hasini P., Sanduni N. | Leave requests | Sample placeholder names |

No real HR records exist for these names in this AIOS. Do not reference them in any live dashboard build.

---

## [VERIFY] Items Preserved

All 9 open [VERIFY] items from context/verify-register.md remain open. This discovery file does not resolve any of them.

Items most relevant to dashboard data requirements:
- Items 1–5 (Admin Manager authority) — affect Decisions panel approval chains and KPI schedule PRC links
- Item 8 (Director authority beyond leadership review) — may affect KPI schedule / review dates display
- Item 9 (Exact tool names for HR and EOD systems) — directly affects leave tracker and onboarding tracker source identification

---

**Next step (updated 2026-07-02):** Confirm which PASS section Varmen wants built first — Document Register, Skills, Handover, Overview, or Recurring Issues.

---

*This file is discovery evidence only. It does not constitute an implementation plan, an approved build scope, or a source-registered document. No tables are built here. No [VERIFY] items are resolved.*

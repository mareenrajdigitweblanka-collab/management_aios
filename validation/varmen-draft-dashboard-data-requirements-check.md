---
name: varmen-draft-dashboard-data-requirements-check
type: validation
created: 2026-07-02
status: PASS — discovery complete; AMBER — sources and table owners not yet confirmed for all sections
scope: validation only — verifies data requirements discovery process; does not approve a build
root-truth: CLAUDE.md — canonical; this validation checks the discovery file only
evidence-path: evidence/dashboard-discovery/varmen-draft-dashboard-table-data-requirements-2026-07-02.md
---

# Varmen Draft Dashboard — Data Requirements Discovery Validation Check (2026-07-02)

**Pass/Fail Rule:** PASS if the discovery file correctly identifies all draft dashboard sections, maps data fields and sensitivity levels, classifies build readiness, and produces a safe build order without treating sample data as real HR truth, without resolving [VERIFY] items, and without building any live tables.

---

## §1 — Draft Treated as Sample Only

| Check | Result | Notes |
|---|---|---|
| Draft HTML explicitly noted as Varmen design sample — not operational truth | PASS | Discovery file frontmatter and opening rules confirm this |
| No sample personal name from draft copied into any active system or HR record | PASS | All sample names listed in a "Sample Placeholder Data Note" section and explicitly excluded from real use |
| No sample counts (23, 3, 6/6, 89, 41, etc.) treated as real operational data | PASS | Counts noted as placeholder; skills usage count section explicitly flagged AMBER (no tracking mechanism) |
| Sample rows in draft team table not treated as real staff records | PASS | 9 sample names identified and classified as placeholder data |
| Sample leave entries not treated as real leave records | PASS | Discovery file notes all leave request rows as placeholder |
| Sample onboarding steps (3/5) not treated as confirmed process definition | PASS | Discovery notes 5-step definition is not source-backed; OLOS reference cited |
| Sample KPI schedule dates not treated as confirmed review schedule | PASS | AMBER classification applied; actual date source not confirmed |
| Sample document register files (e.g. kpi-meeting-format.md) not treated as real repo files | PASS | Discovery explicitly notes: "any live build must use only real file paths, not the draft's invented file names" |

**§1 Result: PASS**

---

## §2 — No Final Tables Built

| Check | Result | Notes |
|---|---|---|
| No HTML table or UI component built in this task | PASS | Discovery only; evidence file is a markdown requirements document |
| No edit made to web-view/index.html | PASS | Dashboard HTML not touched |
| No edit made to CLAUDE.md | PASS | Root truth not modified |
| No edit made to evidence/source-register.md | PASS | Source register not modified |
| No edit made to context/verify-register.md | PASS | Verify register not modified |
| No edit made to Mayurika skill files, checklist, or NSLP update candidate | PASS | Out of scope; untouched |
| No edit made to Suman, Arun, or Rajiv/Admin files | PASS | Out of scope; untouched |
| No edit made to raw HR/staff data | PASS | No such files were read or modified |

**§2 Result: PASS**

---

## §3 — No Personal Data Copied into Active Dashboard

| Check | Result | Notes |
|---|---|---|
| Individual staff names — not used in discovery output as real records | PASS | All named in Sample Placeholder Data Note only |
| Leave balance data — not captured as real data | PASS | Field mapped as RED; discovery confirms leave source unknown |
| KPI review dates — not captured per individual | PASS | AMBER classification; actual dates not extracted |
| Onboarding step completion per person — not captured | PASS | AMBER classification; domain boundary not confirmed |
| Salary / compensation data — not present in draft or discovery | PASS | Out of scope per CLAUDE.md §6 |
| Health / medical data — not captured (Sick leave type noted as AMBER sensitivity only) | PASS | Sensitivity flag recorded but no medical detail extracted |
| PDPA personal data — not present in draft or discovery | PASS | PDPA boundary noted in context |
| Disciplinary or grievance data — not present in draft or discovery | PASS | Out of scope |
| Candidate personal data — not present in draft or discovery | PASS | Recruitment/onboarding data classified AMBER; no personal candidate detail |

**§3 Result: PASS**

---

## §4 — Data Requirements Mapped

| Check | Result | Notes |
|---|---|---|
| All 10 draft dashboard panels identified | PASS | Overview, Team table, Leave requests, Onboarding tracker, KPI schedule, Document register, Skills, Recurring issues, Decisions, Handover |
| Each panel's element type identified (table / card list / stat / KV) | PASS | See TASK 1 inventory |
| Each panel's visible columns or metrics listed | PASS | All columns listed per panel in TASK 1 |
| Each field mapped to: meaning, source owner, repo path, sensitivity, Mayurika allowed, aggregate vs individual, placeholder allowed, pass/fail rule | PASS | TASK 2 data requirement maps complete for all 10 panels |
| Minimum data source checklist produced | PASS | TASK 4 — 12 sources mapped |
| Each source maps to: required-for table, owner, Mayurika provision status, sensitive data flag, safe field subset | PASS | TASK 4 table complete |

**§4 Result: PASS**

---

## §5 — Sensitivity Classified

| Check | Result | Notes |
|---|---|---|
| RED sections identified | PASS | Team table (individual names + leave + KPI dates + onboarding steps), Leave requests (individual names + dates + type) |
| AMBER sections identified | PASS | Onboarding tracker, KPI schedule (lead names + dates), Leave requests (AMBER-RED), Decisions (approval routing) |
| LOW sections identified | PASS | Document register, Skills, Recurring issues, Handover, Overview |
| Sick leave type flagged as AMBER sensitivity layer | PASS | Noted in Leave requests section |
| IT setup field in Onboarding tracker flagged as outside Mayurika domain | PASS | Flagged: "IT provisioning not in Mayurika domain" |
| KPI dates flagged as requiring Arun confirmation | PASS | AMBER note in KPI schedule section |
| Individual names in all tables flagged as RED or AMBER | PASS | Consistent across all sections |
| Probation "not eligible" logic traced to SRC-POLICY-001 §6.2 | PASS | Source citation in Leave requests section |

**§5 Result: PASS**

---

## §6 — Domain Boundary Checked

| Check | Result | Notes |
|---|---|---|
| Mayurika domain boundary applied to all sections | PASS | "Mayurika Allowed?" column in each section's data map |
| Arun authority limit applied (KPI/AXIOM = Arun; scheduling = Mayurika) | PASS | KPI schedule section distinguishes scheduling (Mayurika) from KPI content (Arun) |
| Suman authority limit applied (OLOS, onboarding handoff = Suman; staff records = Mayurika) | PASS | Onboarding tracker section cites domain boundary |
| Rajiv canonical authority applied (name spelling, team structure = Rajiv) | PASS | Employee name fields cite Rajiv as canonical authority |
| Admin Manager [VERIFY] items 1–5 preserved | PASS | [VERIFY] Items Preserved section confirms all 9 items open |
| Reviewer routing model (CLAUDE.md §18) applied to Decisions panel | PASS | Decisions section explicitly cites CLAUDE.md §18; Varmen historical vs ongoing routing distinguished |
| Google Calendar connection noted in draft Decisions panel — not treated as confirmed current integration | PASS | Decisions section classified AMBER; approval attribution check required |

**§6 Result: PASS**

---

## §7 — No [VERIFY] Items Resolved

| Check | Result | Notes |
|---|---|---|
| All 9 open [VERIFY] items remain open after this discovery | PASS | Discovery file [VERIFY] Items Preserved section confirms |
| Items 1–5 (Admin Manager authority) — not resolved | PASS | Awaiting SRC-ADMIN-001 |
| Item 8 (Director authority) — not resolved | PASS | Not in scope of dashboard discovery |
| Item 9 (Exact HR/EOD tool names) — not resolved | PASS | Flagged as directly affecting Leave tracker and Onboarding tracker source identification |
| No new source registered as a result of this discovery | PASS | evidence/source-register.md not modified |
| No [VERIFY] tag removed from CLAUDE.md | PASS | CLAUDE.md not modified |

**§7 Result: PASS**

---

## §8 — Build Readiness Classified

| Check | Result | Notes |
|---|---|---|
| PASS sections identified with rationale | PASS | Overview, Document Register, Skills, Handover — 4 sections |
| AMBER sections identified with rationale | PASS | Leave Requests, Onboarding Tracker, KPI Schedule, Decisions — 4 sections |
| FAIL sections identified with rationale | PASS | Team Table — 1 section |
| Build order recommended from safest to most sensitive | PASS | TASK 5 — 10-step recommended build order |
| Team Table classified FAIL (not AMBER) due to individual-level RED data | PASS | FAIL classification recorded; rationale: names + leave + KPI + onboarding individually identifiable |
| Leave requests classified AMBER–RED | PASS | Source unknown; individual names + Sick leave sensitivity |
| Onboarding tracker classified AMBER (not PASS) | PASS | Domain boundary unconfirmed; 5-step definition not source-backed |
| Document register classified PASS with caveat on invented file paths | PASS | Caveat explicitly noted |
| Skills panel usage counts classified AMBER (no tracking mechanism) | PASS | AMBER sub-classification within PASS section |

**§8 Result: PASS**

---

## §9 — Overall PASS/AMBER Determination

| Dimension | Result |
|---|---|
| Discovery completed without treating sample data as real | PASS |
| No final table built | PASS |
| No personal data captured | PASS |
| All 10 sections mapped | PASS |
| Sensitivity classified for every field | PASS |
| Domain boundaries applied | PASS |
| [VERIFY] items preserved | PASS |
| Build readiness classified (PASS / AMBER / FAIL) | PASS |
| Safe build order produced | PASS |
| Source checklist produced | PASS |

**Overall Result: PASS — discovery complete; leave-related tables excluded from current build scope.**
**Ongoing status: AMBER — sources and table owners not yet confirmed for remaining AMBER and FAIL sections (Onboarding Tracker, KPI Schedule, Decisions, Team Table). Leave Requests excluded from current build scope (Varmen confirmed 2026-07-02). Build must not proceed on AMBER/FAIL sections until confirmation received.**

---

## §10 — Sensitive-Data Risk Summary

| Risk | Classification | Mitigation Required |
|---|---|---|
| Individual staff names in Team table | RED | Do not build with real names until HR-only access and anonymisation rules confirmed by Mayurika |
| Leave balances per person | RED | Do not display until leave source confirmed and HR-only access rule defined |
| Individual Sick leave type records | AMBER | Confirm with Mayurika how Sick leave type should be displayed (category label vs suppressed) |
| Onboarding step status per named person | AMBER | Confirm Suman–Mayurika domain boundary; confirm 5-step definition source |
| KPI review dates attributed to named team leads | AMBER | Confirm with Arun and Mayurika whether lead names appear or team names only |
| Approval attribution in Decisions panel | AMBER | Use current reviewer routing (CLAUDE.md §18); Varmen attribution valid for historical decisions only |
| Sample placeholder names in draft (9 names listed) | Sample data — no risk if boundary respected | Never import into live system; confirmed in §1 |

---

## §11 — Required Source List (Build Gate)

The following sources must be confirmed before the corresponding section can be built with real data:

| Source Required | Needed For | Current Status | Gate Owner |
|---|---|---|---|
| HR staff records access rule | Team table, Leave requests, Onboarding tracker | NOT CONFIRMED | Mayurika |
| Leave tracking source / system name | Leave requests, Team table leave balance | NOT CONFIRMED — [VERIFY] item 9 (exact HR/EOD tool names) directly relevant | Mayurika |
| OLOS / onboarding step definition source | Onboarding tracker | NOT CONFIRMED — SRC-MD-SUMAN-001 §11.8 names required documents; not yet validated | Suman + Mayurika |
| Suman–Mayurika onboarding domain boundary confirmation | Onboarding tracker | NOT CONFIRMED | Suman + Mayurika |
| KPI schedule source (actual review dates) | KPI schedule | NOT CONFIRMED | Mayurika (scheduling) + Arun (scope) |
| Recurring issues structured register | Recurring issues | PARTIAL — one file exists (intelligence-inbox/recurring-issues/); full register not yet built | Mayurika / domain owner |
| Current reviewer routing confirmation | Decisions | CONFIRMED — CLAUDE.md §18 applies | Mareenraj |
| Skill usage tracking mechanism | Skills (usage count) | NOT PRESENT — no log exists | Mareenraj |

---

## §12 — Recommended Single Next Step

~~**Confirm leave source and HR data access rule with Mayurika.**~~ **SUPERSEDED — 2026-07-02**

Varmen clarified that leave-related tables are not required for the current dashboard build. This step is no longer required for this dashboard task.

**Replacement next step:** Confirm which PASS section Varmen wants built first: Document Register, Skills, Handover, Overview, or Recurring Issues.

All other AMBER sections (Onboarding Tracker, KPI Schedule, Decisions) have separate confirmation requirements listed in §11 above.

---

## §13 — Varmen Leave Tables Scope Update (2026-07-02)

| Check | Result | Notes |
|---|---|---|
| Varmen confirmed leave-related tables not needed | PASS | User relayed Varmen's update 2026-07-02 |
| Leave Requests removed from current dashboard build scope | PASS | Discovery file updated; OUT OF CURRENT BUILD SCOPE classification applied |
| Leave source/access question no longer required for this dashboard task | PASS | Step removed from recommended next steps |
| No leave records requested or collected | PASS | No data gathered |
| No [VERIFY] items resolved | PASS | [VERIFY] item 9 remains open in root register — leave source question is no longer the dashboard next step, but the root [VERIFY] item is unchanged |
| No dashboard built | PASS | web-view/index.html not modified |
| HR leave processes not removed from company truth | PASS | CLAUDE.md §10.1, SRC-POLICY-001, and Mayurika's responsibilities all unchanged |
| Evidence file created | PASS | `evidence/stakeholder-confirmations/varmen-dashboard-no-leave-tables-2026-07-02.md` |
| Validation file created | PASS | `validation/varmen-dashboard-no-leave-tables-scope-check.md` |

**§13 Result: PASS**

---

*Validation checked against:*
- *CLAUDE.md — root truth*
- *context/confidentiality-rules.md — sensitivity rules*
- *context/verify-register.md — open [VERIFY] items*
- *evidence/source-register.md — source registration status*
- *CLAUDE.md §18 — reviewer routing model*
- *evidence/dashboard-discovery/varmen-draft-dashboard-table-data-requirements-2026-07-02.md — primary evidence file*

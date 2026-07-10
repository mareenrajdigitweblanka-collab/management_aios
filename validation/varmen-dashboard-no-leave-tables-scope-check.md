---
name: varmen-dashboard-no-leave-tables-scope-check
type: validation
created: 2026-07-02
status: PASS — leave-related tables excluded from current dashboard build scope
scope: Validates Varmen scope update: no leave-related tables in current dashboard build
evidence-path: evidence/stakeholder-confirmations/varmen-dashboard-no-leave-tables-2026-07-02.md
---

# Varmen Dashboard — No Leave Tables Scope Check (2026-07-02)

**Pass/Fail Rule:** PASS if the Varmen scope update is correctly recorded in the evidence file, correctly applied to the discovery file and validation file, and the exclusion of leave-related tables does not affect HR leave processes, CLAUDE.md, source-register.md, verify-register.md, or the live dashboard.

---

## §1 — Evidence File Created

| Check | Result | Notes |
|---|---|---|
| Evidence file created at correct path | PASS | `evidence/stakeholder-confirmations/varmen-dashboard-no-leave-tables-2026-07-02.md` |
| Stakeholder correctly identified as Varmen | PASS | Confirmed in file |
| Date correctly recorded as 2026-07-02 | PASS | Confirmed in file |
| Scope correctly identified (dashboard table planning) | PASS | Confirmed in file |
| Decision correctly recorded (Leave Requests removed from current build scope) | PASS | Confirmed in file |
| Boundary correctly stated (not removing HR leave processes or leave policy from company truth) | PASS | Confirmed in file |

**§1 Result: PASS**

---

## §2 — Discovery File Updated

| Check | Result | Notes |
|---|---|---|
| Scope update note added near top of discovery file | PASS | §"Scope Update — 2026-07-02" section added after boundary rules |
| Leave Requests section preserved as historical discovery | PASS | Old analysis retained; supersession note applied |
| Leave Requests build readiness reclassified from AMBER to OUT OF CURRENT BUILD SCOPE | PASS | TASK 3 table updated |
| Recommended build order updated to exclude Leave Requests | PASS | TASK 5 updated; Leave Requests marked as excluded |
| Leave tracking source removed from required sources for this dashboard build | PASS | TASK 4 and TASK 5 updated |
| Next step updated (no longer "confirm leave source with Mayurika") | PASS | Replacement next step added |
| Replacement next step added (confirm which PASS section to build first) | PASS | Replacement next step confirmed in discovery file |

**§2 Result: PASS**

---

## §3 — Validation File Updated

| Check | Result | Notes |
|---|---|---|
| §13 added to validation file | PASS | "Varmen Leave Tables Scope Update" section added |
| §13 records: leave-related tables removed from current build scope | PASS | Confirmed |
| §13 records: leave source/access question no longer required for this dashboard task | PASS | Confirmed |
| §13 records: no leave records requested or collected | PASS | Confirmed |
| §13 records: no [VERIFY] resolved | PASS | Confirmed |
| §13 records: no dashboard built | PASS | Confirmed |
| §13 result: PASS | PASS | Confirmed |
| Overall status updated to reflect leave-related tables excluded | PASS | Overall result line updated |

**§3 Result: PASS**

---

## §4 — Leave Table Correctly Excluded

| Check | Result | Notes |
|---|---|---|
| Leave Requests table not built | PASS | No build occurred |
| Leave data not collected | PASS | No leave records requested or gathered |
| Leave source/access question no longer the next step | PASS | Next step replaced in discovery and validation files |
| Leave tracking source removed from build gate list | PASS | TASK 4 source list updated |
| Leave Requests discovery analysis preserved as historical | PASS | Old analysis not deleted; marked OUT OF CURRENT BUILD SCOPE |

**§4 Result: PASS**

---

## §5 — HR Leave Processes Not Removed from Company Truth

| Check | Result | Notes |
|---|---|---|
| CLAUDE.md §10.1 (leave policy) unchanged | PASS | CLAUDE.md not edited |
| Mayurika's leave management responsibilities unchanged | PASS | SRC-MAYU-001 scope unchanged |
| SRC-POLICY-001 leave policy unchanged | PASS | Source register not modified |
| Leave policy remains company truth in CLAUDE.md | PASS | This is a dashboard scope change only |

**§5 Result: PASS**

---

## §6 — Sensitive-Data Check

| Category | Present in any updated file? |
|---|---|
| Leave records or sick leave details | NO |
| Individual staff names | NO |
| Salary or compensation data | NO |
| Health or medical information | NO |
| PDPA personal data | NO |
| Disciplinary data | NO |
| Employee IDs | NO |

**§6 Result: PASS — no sensitive data in any created or updated file.**

---

## §7 — [VERIFY] Items Unchanged

| Check | Result | Notes |
|---|---|---|
| [VERIFY] item 9 (exact HR and EOD tool names) — not resolved | PASS | Item 9 remains open; leave source question is no longer the dashboard next step, but the root [VERIFY] item is unchanged |
| All other [VERIFY] items unchanged | PASS | No [VERIFY] tags removed |
| context/verify-register.md not edited | PASS | Not in scope of this update |
| CLAUDE.md [VERIFY] register not edited | PASS | Not in scope of this update |
| evidence/source-register.md not edited | PASS | Not in scope of this update |

**§7 Result: PASS — [VERIFY] items unchanged.**

---

## §8 — Dashboard Not Changed

| Check | Result | Notes |
|---|---|---|
| web-view/index.html not edited | PASS | Dashboard not in scope of this update |
| No leave table built in dashboard | PASS | Confirmed |
| No new section added to dashboard | PASS | Confirmed |
| Dashboard PASS/AMBER result unchanged | PASS | Not modified |

**§8 Result: PASS**

---

## §9 — Handover Updated

| Check | Result | Notes |
|---|---|---|
| `handover/2026-06-30__web-view-dashboard-closure.md` updated | PASS | Varmen leave tables scope update record added |
| Evidence path recorded in handover | PASS | Confirmed |
| Validation path recorded in handover | PASS | Confirmed |
| Leave table exclusion recorded in handover | PASS | Confirmed |
| Next step updated in handover | PASS | Confirmed |

**§9 Result: PASS**

---

## Overall Result

| Dimension | Result |
|---|---|
| Evidence file created | PASS |
| Discovery file updated (scope update, exclusion, next step) | PASS |
| Validation file updated (§13 added, overall status updated) | PASS |
| Leave table correctly excluded from current build scope | PASS |
| HR leave processes not removed from company truth | PASS |
| Sensitive-data check | PASS |
| [VERIFY] items unchanged | PASS |
| Dashboard not changed | PASS |
| Handover updated | PASS |

**Overall Result: PASS — Varmen scope update correctly recorded and applied. Leave-related tables excluded from current dashboard build scope. HR leave processes, CLAUDE.md, source-register.md, verify-register.md, and live dashboard unchanged.**

---

*Validation checked against:*
- *CLAUDE.md — root truth*
- *evidence/stakeholder-confirmations/varmen-dashboard-no-leave-tables-2026-07-02.md — primary evidence*
- *evidence/dashboard-discovery/varmen-draft-dashboard-table-data-requirements-2026-07-02.md — updated discovery file*
- *validation/varmen-draft-dashboard-data-requirements-check.md — updated validation file*
- *handover/2026-06-30__web-view-dashboard-closure.md — updated handover file*

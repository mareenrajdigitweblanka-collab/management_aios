---
name: staff-data-frontend-technical-pilot-check
type: validation
created: 2026-07-13
status: AMBER — pilot verified via structural/syntax/functional checks; no live-browser render performed (sandbox network restriction); no commit/push
source-boundary: web-view/index.html, member-aios/staff-data/source/sample/hr-staff-dashboard-sample.csv
root-truth: CLAUDE.md — canonical
---

# Staff Data Frontend Technical Pilot — Check — 2026-07-13

**Task type:** Fast staff-data technical pilot build, frontend only.
**Task boundary:** No real employee data used; no database table created; no new API endpoint deployed; frontend state and synthetic static data only; not committed; not pushed.

---

## Files Changed

| File | Change |
|---|---|
| `web-view/index.html` | Extended only — 2 new nav buttons (`Staff Data`, `Paraparan`), 2 new top-level tab panels, 1 new subsection appended inside the existing Arun panel, 1 new `<style>` block appended before `</style>`, 1 new self-contained `<script>` block appended before `</body>`. No existing element, tab, panel, class, or script block was removed or edited in place. |

No other file was changed in this phase (Phase 1's 14-file staging commit is a separate, already-completed action — see below).

---

## Synthetic Data Source

`member-aios/staff-data/source/sample/hr-staff-dashboard-sample.csv` (10 rows) — the exact row values were generated programmatically from the CSV into a JS array literal (`STAFF_DATA_SAMPLE`) embedded directly in `web-view/index.html`, so there is no transcription step where a real value could have been substituted.

**Real CSV usage: NO.** `member-aios/staff-data/source/normalized/hr-staff-dashboard.csv` was not opened, read, or referenced by any code or generation step in this phase.

**Raw PDF usage: NO.** The raw HR PDF was not opened, read, or referenced in this phase.

---

## Staff Data Tab Result

**PASS.** `data-tab="staff-data"` nav button added with a `PILOT` badge (amber, tooltip: "Technical pilot — synthetic sample data only, no real employee records, business classification rules unresolved [VERIFY]"). Matching `id="tab-staff-data"` panel added. Verified 1:1 correspondence between every `data-tab="..."` button and its `id="tab-..."` panel across the whole file (8 pairs, all matched — see checklist item 3).

---

## Three Staff Subtabs Result

**PASS.** Implemented as a self-contained sub-tab bar (`.staff-subtab-btn` / `.staff-subpanel`, deliberately distinct class names from the main `.tab-btn`/`.tab-panel` so the existing top-level `activateTab()` logic is never triggered by these buttons):

- Current Staff (`data-staff-subtab="current-staff"`)
- Onboarding Staff Process (`data-staff-subtab="onboarding-staff"`)
- Resigned Staff (`data-staff-subtab="resigned-staff"`)

Each subtab shows only the 13 approved display columns (`employee_number, epf_number, date_of_joining, full_name, calling_name, location, staff_status, department_team, designation, cv_reference, nic, remarks, employment_stage`). `source_file`, `source_page`, `source_row_reference` remain present on each row object (for internal traceability) but are excluded from `STAFF_MAIN_COLUMNS` and therefore never rendered in the table.

---

## Reusable Filter Result

**PASS.** `createStaffFilterBar()` is a single function (Team / Staff Status / Employment Stage selects), instantiated **4 times** in this build: once for the Staff Data tab (shared across its 3 subtabs), once for the Arun PH pilot section, and once for the Paraparan tab. `filterStaffRows(rows, filters)` is the single pure filtering function called by every one of those instances — verified functionally (Node, extracted the literal embedded code, not a reimplementation):

```
Filter test — team=PH, status=Active → 3 rows
Filter test — stage=Probation → 2 rows
```

Employment Stage options rendered: Permanent, Probation, 7-Day Training (displayed label for the stored `training_7_day` value), `[VERIFY]`.

---

## Current / Onboarding / Resigned Pilot Classification

Labeled in the UI exactly as **"TECHNICAL PILOT CLASSIFICATION — BUSINESS RULE [VERIFY]"** (both at the Staff Data tab header and above each subpanel's specific rule text), plus an explanatory note stating the split is not approved HR policy and pointing to `member-aios/staff-data/evidence/employment-stage-rule-review-2026-07-13.md`.

Functional verification (Node, actual embedded logic, against the actual 10-row sample):

| Rule | Result |
|---|---|
| Current Staff: `staff_status == 'Active'` | 7 rows |
| Resigned Staff: `staff_status == 'Inactive'` | 3 rows |
| Onboarding: `employment_stage` in `Probation`, `training_7_day`, `[VERIFY]` | 7 rows |

(7 + 3 = 10, confirming Current/Resigned are a full, non-overlapping partition of the 10 rows on `staff_status`, as specified. Onboarding is evaluated independently on `employment_stage` per the task's rule and is not required to be mutually exclusive with Current/Resigned — some Active rows also carry a qualifying stage, which is expected.)

---

## Arun PH Team Result

**PASS.** New "Staff Data — PH Team Pilot" subsection appended at the end of the existing Arun panel (after the existing schedule-calendar mount, before the panel's closing tag — no existing Arun content was altered or reordered). Team scope is pilot-locked to `PH` (`data-team-code="PH"`, filter bar's Team select disabled and pre-set to `PH (pilot-locked)`). Functional check: 4 rows have `department_team === 'PH'` in the sample data, all 4 are shown.

---

## Paraparan Result

**PASS.** New top-level `Paraparan` tab (`data-tab="paraparan"` / `id="tab-paraparan"`) added, using the **same** `initTeamScopedStaffPilot()` function call as the Arun subsection (one function, two call sites — `document.getElementById('arun-staff-pilot')` and `document.getElementById('paraparan-staff-pilot')`), team-locked to `PH` identically. The tab includes a note on the unresolved designation conflict (External Auditor vs. Accountant), pointing to `member-aios/staff-data/evidence/paraparan-designation-review-2026-07-13.md`. No legacy Arun-specific content (workbench file list, existing testing tables, schedule calendar) was duplicated into this tab — only the shared staff/KPI pilot section, since that is the only piece the task asked to mirror.

---

## Shared KPI Component Result

**PASS.** `renderKpiPanel(containerEl, teamCode)` is the single KPI-rendering function, mounted twice (`.kpi-pilot-mount` in the Arun subsection and in the Paraparan tab), both reading from the one module-level `PILOT_KPI_STATE` array. No `arun_kpi_*`/`paraparan_kpi_*` duplicate function or array exists anywhere in the added code.

---

## Shared KPI Record Result

**PASS — functionally verified.** `PILOT_KPI_STATE` contains exactly 3 records, all `team_code: 'PH'`. A simulated actor-identity change (mutating `updated_by` on one record, as the "Updated By" select's change handler does) was run against the literal embedded code in Node:

```
Shared-state check (same array instance, updated_by visible immediately): true
```

This confirms Arun's and Paraparan's mounted panels read the identical array reference — an edit made in one location is immediately visible wherever the panel is re-rendered, with no separate copy created. The change handler explicitly re-renders **every** `.kpi-pilot-mount` element on any edit, so both tabs reflect the update without a page reload.

---

## Invented KPI Rules

**NONE.** All `PILOT_KPI_STATE` records have `formula`, `target`, and `threshold` set to the literal string `[VERIFY]` — verified programmatically (`PILOT_KPI_STATE.every(...) === true`). `kpi_name` values reference the three KPI category labels already confirmed in CLAUDE.md §7.1 for the Portfolio Holders team (YOY Growth, Individual Staff Net Sales, Category Profitability) prefixed with `Sample PH KPI —`, per the task's example naming pattern (`SAMPLE-PH-KPI-001`, "Sample PH KPI") — no new KPI name, formula, weight, or threshold was invented beyond what CLAUDE.md already documents as confirmed labels.

---

## [VERIFY] Markers

Rendered as a distinct `<span class="badge badge-verify">[VERIFY]</span>` (reusing the existing `.badge-verify` CSS class already defined in the file) everywhere a cell value equals the literal string `[VERIFY]` — in the staff table (`epf_number`, `employment_stage`, occasionally `staff_status` if present) and in every KPI panel cell (`description`, `target`, `formula`, `threshold`, `evidence_required`, `status`, and the default `updated_by` state).

---

## Persistence Limitation

**Disclosed as required.** The Staff Data tab's intro note and each KPI panel's note both state: *"Synthetic technical pilot — changes are not persistent."* No `localStorage`, `sessionStorage`, cookie, or API write is used anywhere in the added code — `PILOT_KPI_STATE` is a plain in-memory JS array; a page refresh resets any "Updated By" edit, exactly as instructed. This was verified by code inspection: zero occurrences of `localStorage`/`sessionStorage`/`fetch(` in the new script block.

---

## Existing Dashboard Regression Result

**PASS — verified, not merely assumed:**

- HTML structural balance: an `html.parser`-based tag-stack checker was run against the entire file; **0 errors**, empty stack at EOF (every tag opened is closed, in the correct order, everywhere in the document — not just the new sections).
- All 3 `<script>` blocks (the 2 pre-existing ones plus the 1 new one) individually pass `node --check` — confirms the new script's insertion did not corrupt either pre-existing script's boundaries or syntax.
- Every `data-tab="..."` button has exactly one matching `id="tab-..."` panel and vice versa (8 pairs, including all 6 pre-existing tabs) — confirms no tab was accidentally duplicated, orphaned, or misrouted.
- Rajiv's exact required wording — badge text "ACTIVE WITH LIMITS" and tooltip "Technical status: REGISTERED / VERSION 1.0 WORKING DRAFT / PARTLY APPROVED, PARTLY DRAFT" — confirmed present and unchanged (`tab-rajiv-blocked` panel body and content untouched).
- `git diff --check web-view/index.html` passes (no whitespace errors).

**Known limitation:** a live, rendered-in-a-browser click-through of the tabs was not performed — `npx playwright install chromium` failed in this sandbox due to an outbound TLS/network restriction (`ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC`), not a defect in the approach. In its place, the actual embedded JS was extracted from the file (not reimplemented) and executed directly in Node against the real 10-row dataset, confirming the classification counts, filter results, and shared-KPI-state behavior described above. This is real functional verification of the shipped logic, short of a full visual/DOM render.

---

## Database/API Changes

**NONE.** `git status --short backend/ database/ .env` returns no output for this phase. No new PostgreSQL table, no new API route, no fetch/XHR call was added.

---

## Credential Exposure

**NONE.** No `.env` value, database URL, or API key appears anywhere in the added HTML/CSS/JS.

---

## 17-Point Validation Checklist

| # | Check | Result |
|---|---|---|
| 1 | Synthetic sample loads | PASS — `STAFF_DATA_SAMPLE` (10 rows) confirmed present and correctly typed via direct Node execution of the embedded code |
| 2 | No real employee name or DWL employee number in frontend code/output | PASS — regex scan of the full file for `DWL\d{2,3}`-style codes and 9/12-digit NIC patterns: zero matches |
| 3 | Staff Data main tab exists | PASS |
| 4 | Three Staff subtabs exist | PASS |
| 5 | Team filter works | PASS — functional test confirms correct filtered counts |
| 6 | Staff Status filter works | PASS — same |
| 7 | Employment Stage filter works | PASS — same |
| 8 | Current Staff shows Active pilot rows | PASS — 7/10 rows, confirmed |
| 9 | Resigned Staff shows Inactive pilot rows | PASS — 3/10 rows, confirmed |
| 10 | Onboarding shows Probation/training_7_day/[VERIFY] pilot rows | PASS — 7/10 rows, confirmed |
| 11 | Arun shows PH Team data | PASS — 4 PH rows, team-locked |
| 12 | Paraparan shows PH Team data | PASS — same 4 PH rows, same team-lock mechanism |
| 13 | Arun and Paraparan use the same KPI state and component | PASS — verified via shared-array mutation test |
| 14 | All KPI formula/target/threshold fields remain [VERIFY] | PASS — verified programmatically, all 3 records |
| 15 | Existing tabs and calendars remain functional | PASS (structural/syntax level) — no existing element, script boundary, or wording altered; **not** confirmed via live browser render (sandbox network restriction, disclosed above) |
| 16 | No backend/database/API changes | PASS |
| 17 | git diff --check passes | PASS |

---

## Verdict

**AMBER.**

Every check that can be performed without a live browser (structural HTML balance, JS syntax validity for all 3 script blocks, exact tab/panel correspondence, functional execution of the actual embedded classification/filter/KPI logic against the real synthetic dataset, zero real-PII scan, zero credential/DB/API footprint, preserved Rajiv wording, disclosed persistence limitation) passes cleanly. **AMBER, not PASS**, solely because item 15 (a live click-through confirming the existing tabs/calendars still render and behave correctly in an actual browser) could not be completed — Playwright's browser download was blocked by a network restriction in this sandbox, not by any defect found in the code. Not FAIL, because no evidence of regression was found by any check that *was* possible, and the new code is additive-only (verified: nothing existing was removed, edited in place, or reordered).

**Recommended next step before relying on this for a demo:** open `web-view/index.html` directly in a real browser (or any environment with browser access) and click through all 8 tabs once, as a final human confirmation of item 15 — everything else in this checklist is already verified.

---

## Manual Browser Verification (2026-07-13)

**Browser verification date:** 2026-07-13

The file was served locally (`python -m http.server 8080 --directory web-view`, `http://127.0.0.1:8080/`) and manually clicked through by the user in an actual browser, resolving the one gap left open by the sandbox's blocked Playwright download (§ "Existing Dashboard Regression Result" above).

| Check | Result |
|---|---|
| Staff Data tab result | User-confirmed PASS — tab opens |
| Three subtabs result | User-confirmed PASS — Current Staff, Onboarding Staff Process, Resigned Staff all work |
| Filter result | User-confirmed PASS — Team, Staff Status, and Employment Stage filters all work |
| Arun result | User-confirmed PASS — Arun PH view shows the 4 synthetic PH rows |
| Paraparan result | User-confirmed PASS — Paraparan shows the same 4 rows |
| Shared KPI result | User-confirmed PASS — changing a shared KPI's "Updated By" in one tab is visible in the other |
| Browser console result | User-confirmed PASS — no red console errors |
| Existing dashboard regression result | User-confirmed PASS — existing tabs (Root AIOS, Mayurika HR, Suman, Arun, Rajiv, File Map) still work |

**Final technical-pilot verdict: PASS.**

This closes the sole open item from the earlier structural/functional-only verification. No business `[VERIFY]` item (employment-stage rule, KPI formula/target/threshold, Paraparan's designation, source reconciliation, duplicate employee IDs) is affected or resolved by this browser check — those remain exactly as recorded in `member-aios/staff-data/evidence/`.

---
name: staff-data-source-storage-discovery-check
type: validation
created: 2026-07-13
status: AMBER — structure and documentation created; two CRITICAL pre-existing security findings block real data import
source-boundary: SRC-STAFF-001, SRC-MAYU-CONF-002 through 006, CLAUDE.md §6, §9.1, §18
root-truth: CLAUDE.md — canonical
---

# Staff Data Source Storage — Discovery Check — 2026-07-13

**Task type:** Staff data source storage setup and read-only discovery.
**Approved subfolder:** `member-aios/staff-data/`
**Task boundary:** Documentation and folder structure only. No database objects created, no staff records imported, no application code edited, no commit or push performed.

---

## A. Branch and Starting Commit

| Field | Value |
|---|---|
| Branch | `main` |
| Starting commit | `8461b99bfc2129bbc0c421c1dd6836e6b2d95ba0` ("Ignore Python cache files") |
| Working tree at start | Clean, except one pre-existing untracked directory (see finding M) |

---

## B. Repository Private/Public Result

**PUBLIC.** Confirmed via the GitHub REST API (`GET /repos/mareenrajdigitweblanka-collab/management_aios` → `"private": false`).

This directly conflicts with the task's stated storage-rule assumption ("The Management AIOS system is used only by authorized users"). That assumption does not hold at the repository level today.

---

## C. Approved Staff Data Path

`member-aios/staff-data/` — created with the approved substructure: `README.md`, `WORKBENCH.md`, `source/raw/`, `source/normalized/`, `source-maps/`, `data-maps/`, `database-design/`, `evidence/`, `validation/`, `handover/`.

---

## D. Raw-Source Path

`member-aios/staff-data/source/raw/` — created, **empty**. No raw HR file was copied into it by this task.

---

## E. Normalized-Source Path

`member-aios/staff-data/source/normalized/` — created, **empty**. No normalized CSV was built by this task.

---

## F. HR Authoritative-Source Status

HR remains the authoritative source. SRC-STAFF-001 (`intelligence-inbox/raw-stakeholder-documents/staff-data/Digitweblanka Staffs Data - Overall Staffs.csv`) is the only registered raw staff roster source in this AIOS, owned by Mayurika, HR-confirmed as active-staff evidence (SRC-MAYU-CONF-002, 2026-06-26). This task's new folder does not alter that authority — see `member-aios/staff-data/source-maps/hr-staff-source-map-draft.md` §1.

---

## G. Salary Exclusion Result

**CONFIRMED EXCLUDED.** SRC-STAFF-001 does not contain a salary column in the first place. The draft schema (`member-aios/staff-data/database-design/staff-data-schema-draft.sql`) has no salary/compensation/bonus column, and its header explicitly documents the exclusion per CLAUDE.md §6. The field map (`member-aios/staff-data/data-maps/staff-field-map-draft.md` §2) records this as a permanent exclusion, not a gap to fill later.

---

## H. Existing Staff Database Objects

**NONE.** The only PostgreSQL schema/table found in this repository is `management_aios.member_schedule_events` (`database/member_schedule_events_schema.sql`) — a per-member (mayurika/suman/arun/rajiv) calendar/schedule testing table, unrelated to staff records. No staff master table exists in PostgreSQL. This task's own draft (`staff-data-schema-draft.sql`) has not been applied — see item P.

---

## I. Existing KPI Objects

**NONE in PostgreSQL.** KPI/AXIOM logic exists only as documentation and dashboard-preview content: `member-aios/arun-implementation/dashboard-table-maps/`, `member-aios/arun-implementation/data-source-maps/arun-ph-live-report-data-source-map-2026-07-06.md` (AMBER — 6 of 8 factual data areas still MISSING, live workflow explicitly gated), and CLAUDE.md §7. No live KPI database table exists.

---

## J. PH Team Identifier Evidence

- Canonical department/team value for the Portfolio Holder team is **"PH"**, confirmed by Mayurika (SRC-MAYU-CONF-004, 2026-06-26) as the normalization target for raw variants "Portfolio team", "portfolio team", and "Portfolio holders" found in SRC-STAFF-001.
- Raw SRC-STAFF-001 CSV contains 24 case-insensitive occurrences of "portfolio" in its Department/Team column (pre-normalization, unverified for embedded-header artifacts).
- `Arun-PH-Team.md` (SRC-ARUN-PH-001) uses `Department: Portfolio Holder` only as a report-template placeholder — it is not a staff identifier source.
- Full detail (no staff names reproduced): `member-aios/staff-data/source-maps/hr-staff-source-map-draft.md` §5.

---

## K. Authentication Status

- **Frontend** (`web-view/index.html`, deployed at `https://management-aios.vercel.app`): static HTML/JS. No login form, password field, or auth token logic found (checked for `login|password|auth|Authorization|API_KEY|token` — no matches of that kind). **No authentication.**
- **Backend API** (`backend/main.py`, FastAPI, deployed separately on Vercel per `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md`): CORS restricts which **browser origins** may call it (`ALLOWED_ORIGINS` + a localhost regex, `allow_credentials=False`), but CORS is a browser-enforced policy — it does not block direct HTTP requests (curl, Postman, another server) from any origin. No API key, bearer token, or session check exists in `backend/main.py` or `backend/routers/`. **No real authentication at the HTTP layer.**

**Conclusion:** Both the deployed frontend and the deployed API are effectively unauthenticated today. Any future staff-data API endpoint must not be built on this backend without adding real authentication first.

---

## L. Public-File Exposure Risk

**CRITICAL — confirmed, pre-existing, unrelated to this task's file creation:**

1. The SRC-STAFF-001 raw CSV (125 active staff — employee IDs, full names, locations, designations) is **tracked in git and already pushed to `origin/main`**, which is a public repository. This is a live exposure, not a hypothetical one.
2. A live Neon PostgreSQL connection string is **currently tracked in `.env` at the repo root** (`git ls-files` confirms it is tracked today; introduced in commit `6497c7c`), also pushed to `origin/main`. `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` already flagged this as top-priority (recommending password rotation) — it does not appear to have been resolved as of this check. This report does not read or reproduce the secret value.
3. The web-view static frontend does not gate access to the deployed site, and the API has no auth (see K) — so even non-repository access to the dashboard is unrestricted.

None of these three were created or worsened by this task. This task did not commit, push, or copy any raw file into a web-exposed path. New files created by this task (`member-aios/staff-data/*`) contain no staff names and are documentation-only.

---

## M. Duplicate-Truth Risk

Three staff-data-shaped locations exist:

1. `intelligence-inbox/raw-stakeholder-documents/staff-data/` (SRC-STAFF-001) — registered, HR-confirmed, tracked in git. Authoritative.
2. `member-aios/mayurika-hr/staff-data/source/raw/Personal Target - HRD - 2 Total Staffs.pdf` — **found untracked during this discovery**, not registered as a source, sits outside the approved `member-aios/staff-data/` path, not gitignored. Not touched by this task. Flagged for Mayurika's review (register or consolidate — not this task's decision).
3. `member-aios/staff-data/` (this task's approved path) — documentation-only; `source/raw/` and `source/normalized/` remain empty.

Full detail: `member-aios/staff-data/source-maps/hr-staff-source-map-draft.md` §3.

---

## N. Files Created

1. `member-aios/staff-data/README.md`
2. `member-aios/staff-data/WORKBENCH.md`
3. `member-aios/staff-data/source-maps/hr-staff-source-map-draft.md`
4. `member-aios/staff-data/data-maps/staff-field-map-draft.md`
5. `member-aios/staff-data/database-design/staff-data-schema-draft.sql`
6. `validation/staff-data-source-storage-discovery-check-2026-07-13.md` (this file)

Empty directories also created as approved structure: `member-aios/staff-data/source/raw/`, `member-aios/staff-data/source/normalized/`, `member-aios/staff-data/evidence/`, `member-aios/staff-data/validation/`, `member-aios/staff-data/handover/`.

---

## O. Raw Staff File Copied

**NO.** No raw HR file was copied into `member-aios/staff-data/source/raw/`. This was a documentation/discovery task; copying real staff data is explicitly deferred pending the security remediation and HR sign-off listed in `member-aios/staff-data/WORKBENCH.md` §5.

---

## P. Database Changes

**NONE**, as required. `member-aios/staff-data/database-design/staff-data-schema-draft.sql` is a draft file only — it has not been executed against any database. No `CREATE`, `ALTER`, `INSERT`, or other statement from this task was run.

---

## Q. Application Code Changes

**NONE**, as required. No file under `backend/`, `web-view/`, or `database/` was modified. No new API route, dashboard tab, or frontend code was added.

---

## R. Commit/Push

**NONE**, as required. All changes described in this report remain uncommitted in the working tree. No `git add`, `git commit`, or `git push` was performed by this task.

---

## S. Review Required

| Reviewer | What They Must Review |
|---|---|
| Mareenraj (builder) / repo owner | Findings B, L (repo visibility, exposed Neon credential, exposed staff CSV) — before any further staff-data work proceeds |
| Mayurika (HR owner) | `member-aios/staff-data/source-maps/hr-staff-source-map-draft.md` and `data-maps/staff-field-map-draft.md`; the unregistered PDF at finding M item 2; remaining department/team `[VERIFY]` variant groups |
| Technical reviewer | `database-design/staff-data-schema-draft.sql` mechanics, and backend authentication gap (finding K) before any staff-data API endpoint is built |

Per CLAUDE.md §18, HR/staff-record domain content routes to Mayurika; this report itself, being a cross-cutting security/discovery finding, should also reach the repo owner directly rather than waiting on domain routing alone, given findings B and L are time-sensitive.

---

## T. PASS / AMBER / FAIL

**AMBER.**

- The approved folder structure, documentation, and draft schema were created correctly, safely, and within the task's read-only/documentation-only boundary (items C–G, N–R all pass cleanly).
- **AMBER, not PASS**, because this discovery surfaced two CRITICAL pre-existing conditions (public repository; live database credential tracked in `.env` on `main`) plus a confirmed live exposure of the actual staff roster CSV — all independent of this task, but directly relevant to whether it is currently safe to proceed to the next step (copying real staff data into `member-aios/staff-data/source/raw/`). That next step should not happen until findings B and L are addressed.
- Not FAIL, because this task itself did not violate any of its constraints (O, P, Q, R all clean) and did not create or worsen any exposure.

**Recommended immediate action (outside this task's scope, for the repo owner):** rotate the exposed Neon credential and decide on repository visibility before authorizing the next staff-data step.

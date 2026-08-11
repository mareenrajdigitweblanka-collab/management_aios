# Validation — Knowledge Management SRD Compliance Audit + Safe Gap Closure (2026-08-11)

Companion to [docs/knowledge-management-srd-compliance-audit-2026-08-11.md](../docs/knowledge-management-srd-compliance-audit-2026-08-11.md). Records exactly what was verified this session and how.

---

## 1. Baseline verification

```
git branch --show-current        -> main
git rev-parse HEAD                -> 794da0c72aa333634695f191e673a56ab0e9f017
git rev-parse origin/main         -> 794da0c72aa333634695f191e673a56ab0e9f017  (identical)
git status --short                -> 3 untracked, unrelated files only
```

Confirmed via `git stash` + isolated pytest run that the 2 pre-existing backend test failures (`test_calendar_auth.py::StartupConfigurationValidationTests::test_missing_variable_fails_closed`, `test_weekly_schedule_xlsx_export.py::TaskRowTests::test_pending_task_no_outcome`) exist identically on the pre-task baseline commit — not caused by this session's work. (Also independently corroborated by the prior 2026-08-10 handover doc noting the same 2 pre-existing failures.)

## 2. Protected path attestation

`member-aios/mayurika-hr/staff-data/` — confirmed not opened, listed, read, searched, staged, or referenced at any point in this session (no tool call in this session's transcript references this path).

## 3. Discovery method

- Background Explore agent mapped the full existing implementation (DB migration + ORM models, backend router + schemas + config constants, frontend module + CSS, both test files, and a repository-wide search for Google API integration) before any code was written.
- Cross-checked against the prior same-day discovery/design/closure documents already in `docs/`/`validation/`/`handover/` (dated 2026-08-10) to avoid re-deciding already-made architecture decisions (status-model split, link-only storage, Team list, soft-delete convention).
- Read the actual source of every claim used in the compliance matrix (schemas.py, knowledge_documents.py, knowledge-management.js, config.py, .env.example, requirements.txt) rather than relying on the discovery agent's summary alone for anything load-bearing.

## 4. Backend test results

Command: `python -m unittest backend.tests.test_knowledge_documents -v`
Result: **83/83 passing** (66 pre-existing + 17 new: `AdvancedFilterTests` ×9, `SummaryTests` ×8).

Command: `python -m pytest backend/tests -q` (full backend suite)
Result: **900 passed, 2 failed** (both pre-existing and unrelated, see §1), **26 subtests passed**.

## 5. Frontend test results

Command: `node --test web-view/js/knowledge-management.test.mjs`
Result: **135/135 passing** (112 pre-existing + 23 new: advanced filters ×10, dashboard widgets ×13).

Command: `node --test web-view/js/*.test.mjs` (full frontend suite, run from `web-view/js/`)
Result: **429/429 passing** — zero regressions anywhere in the frontend test suite.

## 6. Specific things verified, not assumed

- **Google API absence**: verified by reading `backend/requirements.txt`, `.env.example`, and a repository-wide grep for `googleapis|drive.google|sheets.google|GOOGLE_` (excluding the protected path) — zero matches outside documentation files discussing it as unbuilt.
- **`google_ownership_status='Verified'` is unreachable**: verified by reading `backend/config.py`'s `VALID_KNOWLEDGE_GOOGLE_OWNERSHIP_STATUSES_CLIENT_SETTABLE` (excludes 'Verified') and every request schema in `backend/schemas.py` (no field ever accepts it).
- **Team list is not app-wide shared**: verified by reading `web-view/js/knowledge-management.js` (`KM_DEFAULT_TEAMS`, module-scoped) against `web-view/js/staff-data.js` (separate, data-derived team concept) and `web-view/js/member-registry.js` (a people registry, not a team registry) — confirms this task's own assumption in its §2 ("shared standardized 17-Team dropdown") was incorrect; corrected in the compliance doc.
- **New filters map to existing columns only**: every new `Query` param in `list_knowledge_documents` (`backend/routers/knowledge_documents.py`) filters an already-existing `KnowledgeDocument` column — no migration was written or needed.
- **Summary endpoint computes live, does not cache**: `get_knowledge_document_summary` (`backend/routers/knowledge_documents.py`) issues fresh `SELECT`/`COUNT`/`GROUP BY` queries against `knowledge_documents`/`knowledge_document_versions`/`knowledge_document_audit_log` on every call — no new table, no materialized view, no cache layer.
- **Auth boundary preserved**: new backend test `test_69_unauthenticated_advanced_filter_rejected` and `test_70_unauthenticated_rejected` confirm the new LIST filters and the new `/summary` route both require the same Bearer token as every other route. New frontend test `133. unauthenticated mount never calls the summary endpoint` confirms the whole-panel auth gate still applies to the new dashboard region (it is mounted after the auth-gate early-return, so an unauthenticated user's DOM never includes it and no request is ever attempted).
- **Dashboard mutation-refresh wiring**: new frontend tests `130`/`131` confirm the dashboard's `loadSummary()` is called after Create and after Archive succeed (via the same `confirmDestructive` flow already covered by pre-existing tests 36/37), not just on initial mount.

## 7. Duplicate-truth check performed before implementation

Searched `database/migrations/`, `backend/models.py`, and `web-view/js/` for any existing team-reference table, access-log table, or second document registry before adding anything — none found beyond what is already documented in §2 of the compliance doc. No new database object was created (confirmed: `git diff --stat` for this session touches only `.py`/`.js`/`.css`/`.md` files, zero `.sql` files).

## 8. What was deliberately left unimplemented (and why)

**Classification update (same day, later sessions):** Google Owner-Access verification and binary file upload/storage are now formally **DEFERRED** per explicit user/developer scope decisions, not merely BLOCKED — see `docs/knowledge-management-preview-and-upload-scope-2026-08-11.md` §9 for the current, authoritative five-item deferred list (also covering Word/Excel preview and Most Frequently Accessed). The technical findings in the table below (why each was blocked) are unchanged and remain accurate as the *reason* for the deferral.

| Item | Reason (as found this session; classification since updated to DEFERRED — see note above) |
|---|---|
| Google Owner-Access verification | No Google API credentials/scopes exist; see compliance doc §D |
| Binary file upload/storage | No object storage provisioned; Vercel serverless filesystem is ephemeral |
| In-app document preview (any type) | Implemented in a later same-day session for PDF/Image/Video/Google Sheet/Doc/Drive File — see `docs/knowledge-management-preview-and-upload-scope-2026-08-11.md`. Word/Excel preview remains DEFERRED (no approved viewer). |
| Most Frequently Accessed Documents widget | User declined this option in the scope-confirmation step; no view/access-tracking schema exists |
| Team taxonomy renaming to match SRD's example list | Rajiv holds canonical authority over team structure (CLAUDE.md §3) — not this session's call to make |

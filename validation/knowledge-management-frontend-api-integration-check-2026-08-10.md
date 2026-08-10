# Validation — Knowledge Management Frontend API Integration Check (REQ-KM-UI-004)

**Date:** 2026-08-10
**Checked by:** Claude Code, this session
**Reference:** [docs/knowledge-management-frontend-api-integration-2026-08-10.md](../docs/knowledge-management-frontend-api-integration-2026-08-10.md)

---

## 1. Static data source removed

| Check | Result |
|---|---|
| `APPROVED_DOCUMENTS` export no longer exists | PASS — test 1 |
| `SAMPLE_DATA_NOTICE_TEXT` export no longer exists | PASS — test 1 |
| `.msc-km-sample-notice` element never rendered | PASS — test 2 |
| No "Sample documents" text anywhere in the mounted view | PASS — test 2 |
| List is populated exclusively via `listKnowledgeDocuments` / the injected `api.list` | PASS — test 3 |

## 2. List / loading / empty / error states

| Check | Result |
|---|---|
| Loading state renders while the list request is in flight | PASS — test 4 |
| Zero-record response (no active filters) renders the unfiltered empty-state copy | PASS — test 5 |
| A failed list request renders an error state with a Retry control, never a stale or fabricated list | PASS — test 6 |
| Retry re-issues the request and recovers to the data state on success | PASS — test 7 |

## 3. Filters (server-side, AND semantics)

| Check | Result |
|---|---|
| Records render from the real API response | PASS — test 8 |
| Search sends `search=` as a query param | PASS — test 9 |
| Team filter sends `team=` as a query param | PASS — test 10 |
| Document Type filter sends `document_type=` as a query param | PASS — test 11 |
| Lifecycle Status filter sends `lifecycle_status=` as a query param | PASS — test 12 |
| Combined filters are present together in one request (AND, not OR) | PASS — test 13 |

## 4. Create

| Check | Result |
|---|---|
| Add Document control exists and opens the create modal | PASS — test 14, 15 |
| Client-side required-field validation blocks submission (no server call) with no fields filled | PASS — test 16 |
| No server-owned fields (id, created_by, updated_by, created_at, updated_at, lifecycle_status, compliance_status, google_ownership_status, current_version) are present as editable create fields | PASS — test 17 |
| The real API-client function (`createKnowledgeDocument`) sends exactly the expected POST payload | PASS — test 18 |
| Authorization header is attached correctly on Create | PASS — test 19 |
| Save button disables immediately on submit (duplicate-submit protection) | PASS — test 20 |
| Success path refetches the list and closes the modal | PASS — test 21 |
| 409 duplicate-source-URL response is shown as a field-level error on the URL field, not a generic toast | PASS — test 22 |
| A non-fatal `warnings[]` array in a successful create response is surfaced as a toast | PASS — test 23 |

## 5. Detail

| Check | Result |
|---|---|
| A View control exists per row | PASS — test 24 |
| Every field from the API response renders correctly in the detail view | PASS — test 25 |

## 6. Update (Edit Metadata)

| Check | Result |
|---|---|
| Edit modal opens from the detail view | PASS — test 26 |
| PATCH is called with exactly the edited fields, `source_url` is never included in the payload | PASS — test 27 |
| `change_description` is required before submission is allowed | PASS — test 28 |
| Source URL is displayed read-only with the redirect note to Create New Version — never an editable field | PASS — test 29 |
| Success refetches the list | PASS — test 30 |

## 7. Create New Version

| Check | Result |
|---|---|
| Version modal opens from the detail view | PASS — test 31 |
| `POST .../versions` is called with the correct document id | PASS — test 32 |
| Payload contains exactly `source_url` + `version_label` + `change_description` | PASS — test 33 |
| Success refetches the list (new version reflected) | PASS — test 34 |

## 8. Archive / Unarchive

| Check | Result |
|---|---|
| Archive requires an explicit confirmation step before the API is called | PASS — test 35 |
| Confirmed archive calls the correct endpoint with the correct document id | PASS — test 36 |
| Successful archive refetches the list | PASS — test 37 |
| Unarchive calls the correct endpoint with the correct document id | PASS — test 38 |
| Successful unarchive refetches the list | PASS — test 39 |

## 9. Soft Delete

| Check | Result |
|---|---|
| Delete confirmation explicitly states this is NOT permanent deletion | PASS — test 40 |
| A delete reason is required before submission | PASS — test 41 |
| `DELETE` is called with the document id and the entered reason | PASS — test 42 |
| No hard-delete / "permanent delete" control exists anywhere in the UI | PASS — test 43 |

## 10. Restore

| Check | Result |
|---|---|
| No Restore UI entry point exists anywhere (list row, detail view, or elsewhere); `restoreKnowledgeDocument` remains an unwired, available-for-future-use API-client export | PASS — test 44 |

This is a **deliberate, documented block**, not a defect: `RESTORE FRONTEND BLOCKED BY API READ-VISIBILITY GAP` (the LIST endpoint has no way to enumerate soft-deleted documents). See docs file §5.

## 11. Version / Audit history (read-only)

| Check | Result |
|---|---|
| Version History viewer renders rows returned by `GET .../versions` | PASS — test 45 |
| Audit History viewer renders rows returned by `GET .../audit` | PASS — test 46 |
| Neither history viewer exposes any edit or delete control | PASS — test 47 |

## 12. Security

| Check | Result |
|---|---|
| No actor-identity field (`created_by`-style or similar) exists anywhere on the Create form — actor identity is always server-derived from the auth token, never client-supplied | PASS — test 48 |
| An unsafe (non-http/https) source URL is never rendered as a clickable Open Document link and never opened | PASS — test 49 |
| An expired/invalid token (401) surfaces `auth_required` and clears the stored token | PASS — test 50 |
| An MD (read-only) token attempting a mutation surfaces the backend's `knowledge_document_read_only_member` error code with a clear message | PASS — test 51 |

## 13. Regression (unrelated tabs/features)

| Check | Result |
|---|---|
| Issues navigation still opens and renders without error | PASS — test 52 |
| Review Summaries navigation still opens and renders without error | PASS — test 53 |
| Calendar mounts remain untouched by this change | PASS — test 54 |
| "Knowledge Management" appears exactly once in the sidebar navigation | PASS — test 55 |

## 14. Full suite results

```
node --test knowledge-management.test.mjs
# tests 55
# pass 55
# fail 0

node --test *.test.mjs   (all 5 files in web-view/js/)
# tests 275
# pass 275
# fail 0
```

No pre-existing failures were present to separate out — the full suite was clean both before and after this task's changes were verified.

## 15. Scope integrity

| Check | Result |
|---|---|
| Backend files changed | **0** |
| Database/schema changes made or executed by this task | **0** |
| Production database writes performed by any test in this task | **0** — every test uses a fixture `api` object or a stubbed `fetch`; no test reaches the live database |
| `member-aios/mayurika-hr/staff-data/` opened or modified | **No** (protected path — not touched) |
| `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` touched | **No** (pre-existing untracked file, unrelated to this task, left untouched) |

## 16. Overall verdict

**PASS.** All 55 required frontend tests pass, the full 275-test frontend suite shows zero regressions, and scope integrity checks (§15) confirm this was a frontend-only change with zero backend/database impact.

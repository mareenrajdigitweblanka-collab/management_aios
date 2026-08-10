# Knowledge Management — Backend CRUD API Implementation (REQ-KM-CRUD-003)

**Status:** IMPLEMENTED. Backend API only — the frontend (`web-view/js/knowledge-management.js`) is unchanged and still serves the static 3-record `APPROVED_DOCUMENTS` registry; it is not yet wired to this API.
**Builds on:** [docs/knowledge-management-crud-design-2026-08-10.md](knowledge-management-crud-design-2026-08-10.md) (schema/API/permission design, locked business rules), [validation/knowledge-management-migration-execution-check-2026-08-10.md](../validation/knowledge-management-migration-execution-check-2026-08-10.md) (the 3 live tables this router operates against, already created).
**Protected path:** `member-aios/mayurika-hr/staff-data/` was never opened, read, or referenced.

---

## 1. Requirement

Implement the FastAPI backend CRUD API for Knowledge Management against the 3 already-executed live tables (`management_aios.knowledge_documents`, `knowledge_document_versions`, `knowledge_document_audit_log`), per the locked design and the 17 business rules re-stated in REQ-KM-CRUD-003.

## 2. Database Tables Reused (not created, not altered)

- `management_aios.knowledge_documents`
- `management_aios.knowledge_document_versions`
- `management_aios.knowledge_document_audit_log`

All 3 already existed live before this task (migration commit `cea806c9204f88331832a77d57659d435108c4d2`, executed and evidenced in `validation/knowledge-management-migration-execution-check-2026-08-10.md`). This task issued **zero** `CREATE`/`ALTER`/`DROP`/`INSERT`/`UPDATE`/`DELETE` statements against any live database — `Base.metadata.create_all()` is only ever called against an isolated in-memory SQLite database in tests (`backend/tests/calendar_auth_test_support.py`), never against production.

## 3. Files Created / Modified

**Created:**
- `backend/routers/knowledge_document_logic.py` — the one shared URL-normalization/duplicate-detection module (Phase 4).
- `backend/routers/knowledge_documents.py` — the 11-route CRUD router.
- `backend/tests/test_knowledge_documents.py` — 57 tests (54 required + 3 additional).

**Modified:**
- `backend/models.py` — added `KnowledgeDocument`, `KnowledgeDocumentVersion`, `KnowledgeDocumentAuditLog` ORM classes (Python-side mapping only, mirroring the already-executed migration exactly).
- `backend/schemas.py` — added `KnowledgeDocumentCreate`, `KnowledgeDocumentMetadataUpdate`, `KnowledgeDocumentVersionCreate`, `KnowledgeDocumentDeleteRequest`, `KnowledgeDocumentOut`, `KnowledgeDocumentListResponse`, `KnowledgeDocumentVersionOut`, `KnowledgeDocumentAuditLogOut`.
- `backend/config.py` — added `VALID_KNOWLEDGE_DOCUMENT_TYPES`, `VALID_KNOWLEDGE_LIFECYCLE_STATUSES`, `VALID_KNOWLEDGE_COMPLIANCE_STATUSES`, `KNOWLEDGE_GOOGLE_DOCUMENT_TYPES`, `VALID_KNOWLEDGE_GOOGLE_OWNERSHIP_STATUSES_CLIENT_SETTABLE`, `KNOWLEDGE_DOCUMENT_AUDIT_ACTIONS`.
- `backend/main.py` — registered the new router; added `PATCH` to CORS `allow_methods` (previously only `GET/POST/PUT/DELETE/OPTIONS` — needed for the metadata-update route).

**Not touched:** any frontend file, the migration file, the discovery/design/validation docs from earlier REQ-KM tasks, or the protected HR path.

## 4. API Endpoints

| Method | Path | Auth | Maps to |
|---|---|---|---|
| `GET` | `/api/knowledge-documents` | Public | LIST |
| `GET` | `/api/knowledge-documents/{document_id}` | Public | DETAIL |
| `POST` | `/api/knowledge-documents` | Required | CREATE |
| `PATCH` | `/api/knowledge-documents/{document_id}` | Required | UPDATE (metadata only) |
| `POST` | `/api/knowledge-documents/{document_id}/versions` | Required | VERSION (create) |
| `POST` | `/api/knowledge-documents/{document_id}/archive` | Required | ARCHIVE |
| `POST` | `/api/knowledge-documents/{document_id}/unarchive` | Required | UNARCHIVE |
| `DELETE` | `/api/knowledge-documents/{document_id}` | Required | SOFT DELETE |
| `POST` | `/api/knowledge-documents/{document_id}/restore` | Required | RESTORE |
| `GET` | `/api/knowledge-documents/{document_id}/versions` | Required | VERSION HISTORY |
| `GET` | `/api/knowledge-documents/{document_id}/audit` | Required | AUDIT HISTORY |

**Note on divergence from the earlier illustrative design doc:** the original `docs/knowledge-management-crud-design-2026-08-10.md` §5 sketched metadata update as `PUT .../metadata` and version/audit history as public reads. REQ-KM-CRUD-003 explicitly re-specified these as `PATCH /api/knowledge-documents/{document_id}` (no `/metadata` suffix) and auth-required version/audit history — this implementation follows the newer, more specific instruction. The underlying business-rule substance (metadata edits never version; audit is readable by any authenticated member) is identical either way.

LIST/DETAIL remain public, matching the existing Task/Leave public-GET convention — REQ-KM-CRUD-003's own auth-test list (Phase 16, items 1-7) only covers create/update/version/archive/delete/restore, never list/detail.

## 5. Auth Pattern / Actor Identity

Reuses the **existing** Calendar-auth Bearer-token system verbatim (`backend/routers/calendar_auth.py`'s `Depends(get_verified_member)`) — no new token type, no new secret, no new env var. `created_by`, `updated_by`, `deleted_by`, and `actor_member_key` are **always** set from the verified token's resolved member key, never from any request body field — none of the request schemas (`KnowledgeDocumentCreate`, `KnowledgeDocumentMetadataUpdate`, etc.) declare a field for any of these, so a client cannot spoof them by any path (test #17).

**MD exclusion (a necessary consequence of rule 1, not a new invented rule):** rule 1 grants write access to "any authenticated Management Team member." MD (`backend/config.py MD_MEMBER_KEY`) is explicitly **not** a Management Team member anywhere else in this codebase (excluded from `MEMBER_DIRECTORY`; blocked from every other feature's writes — see `staff_review_summaries.py`'s own `_reject_md_write`). This router applies the identical exclusion (`_reject_md_write`, 403) to every mutating route, for consistency with the rest of the codebase. LIST/DETAIL and, being auth-required-but-not-owner-scoped, version/audit history remain readable by MD (matching MD's established read-only status).

**Permission model (rule 1, locked):** unlike Task/Leave's own-`{member_key}`-only lock or `StaffReviewSummary`'s creator-only-update lock, **any** authenticated Management Team member may mutate **any** document — there is no per-owner scoping column, no `require_matching_member` call, and no non-disclosing-404 ownership check anywhere in this router.

## 6. URL Normalization

One function, `knowledge_document_logic.normalize_source_url()`, shared by every route that ever compares or stores a source URL: CREATE's duplicate check, VERSION's duplicate check, and RESTORE's collision check (rule 15). Algorithm: lowercase scheme and host, strip query string and fragment, strip a trailing slash from the path. A separate, simpler `is_safe_http_url`-style check (duplicated intentionally at the Pydantic schema layer as `_validate_safe_http_url`, since it's a distinct input-shape concern from normalization/duplicate-detection) rejects `javascript:`, `data:`, and any non-`http(s)` scheme with a 422 before the value ever reaches the router. Documented, accepted limitation: this is a plain URL-normalization heuristic, not Google-file-ID extraction — deliberately not AI/smart duplicate detection, per explicit instruction.

## 7. Duplicate Behavior

- **Same active normalized URL → HTTP 409** (`knowledge_document_duplicate_source_url`), enforced as an application-layer pre-check **before** any write (`assert_no_active_duplicate_source_url` equivalent — implemented inline via `find_active_document_by_normalized_url` + an explicit check in each of CREATE/VERSION/RESTORE). The database's own partial unique index (`idx_knowledge_documents_active_source_url_normalized`, already live) remains defense-in-depth only, never the user-facing error path.
- **Same title (exact, case-insensitive, trimmed), different URL → non-blocking warning.** The create response's `warnings` array carries a message; the write proceeds (201). No fuzzy/similarity matching of any kind is implemented anywhere — exact content equality only, after trimming and case-folding.

## 8. Lifecycle Behavior

`lifecycle_status` (`Active`/`Archived`) is fully independent of `deleted_at`/`deleted_by`/`delete_reason` — `ARCHIVE`/`UNARCHIVE` never touch the soft-delete columns, and a soft-deleted document retains whatever `lifecycle_status` it had at deletion time (restored later, unchanged). 409 (not a silent no-op) if archiving an already-Archived document, or unarchiving an already-Active one.

## 9. Version Behavior

- **Metadata-only edit** (`PATCH`) → one `update_metadata` audit row → `current_version`/`source_url`/`source_url_normalized` **unchanged**, no `knowledge_document_versions` row created (test #30, #31).
- **Explicit version action** (`POST .../versions`) → one new `knowledge_document_versions` row appended → parent's `current_version`/`source_url`/`source_url_normalized` updated → one `create_version` audit row. This is the **only** route that ever writes to `knowledge_document_versions` after the initial CREATE.
- Version history is append-only — no `PUT`/`PATCH`/`DELETE` route exists for it anywhere (test #53, verified by route introspection, not just by omission).

## 10. Soft Delete

`DELETE /api/knowledge-documents/{document_id}` requires `delete_reason` in the request body (422 if blank/missing) and sets `deleted_at`/`deleted_by`/`delete_reason` together, satisfying `knowledge_documents_soft_delete_pairing_check`. No route in this file, or anywhere else in the backend, ever issues a real SQL `DELETE` against `knowledge_documents`.

## 11. Restore Collision

`POST .../restore` pre-checks whether the document's own `source_url_normalized` now collides with a **different** active document (one that legitimately reused the URL while this one was deleted) **before** clearing the deletion fields — if so, 409, and the other record is left completely untouched (test #50 verifies both: the conflict response and the other record's unaffected state). This turns what would otherwise be a raw database unique-constraint violation into the same clean, typed 409 shape CREATE/VERSION already use — exactly the requirement rule 15 states explicitly.

## 12. Audit Behavior

Every mutating action (`create`, `update_metadata`, `create_version`, `archive`, `unarchive`, `soft_delete`, `restore`) appends exactly one row to `knowledge_document_audit_log`, in the same transaction as the primary mutation (one `db.commit()` per route). No route anywhere updates or deletes an audit row. Version-history and audit-history GET routes deliberately **ignore** the parent document's `deleted_at` — an audit trail's entire purpose is to remain visible for a document that is currently soft-deleted (e.g. to see who deleted it and why), so filtering it out on the parent's current lifecycle state would defeat that purpose. LIST/DETAIL (the "current live business state" views) do filter on `deleted_at`.

## 13. Test Evidence

`backend/tests/test_knowledge_documents.py` — **57/57 passing** (all 54 required cases from REQ-KM-CRUD-003 Phase 16, plus 3 additional: an explicit `source_url`-rejected-via-metadata-update check, and 2 MD-read-only-enforcement checks). Full repository backend suite re-run: **866 tests, 864 passing, 2 pre-existing failures** (`test_calendar_auth.StartupConfigurationValidationTests.test_missing_variable_fails_closed`, `test_weekly_schedule_xlsx_export.TaskRowTests.test_pending_task_no_outcome`) — both independently confirmed to reproduce identically on the clean base commit (`a1309e6`, before any change in this task), via `git stash`/re-run/`git stash pop`. Neither touches Knowledge Management code in any way.

## 14. Runtime Files Changed

See §3. 4 modified existing files, 3 new files. No frontend file was touched.

## 15. DB / Schema Changes

**0.** No migration was executed or modified. No table, index, or constraint was created, altered, or dropped.

## 16. Production Data Writes

**0.** No test in this suite ever connects to `order_management_copy` or any real PostgreSQL instance — every test uses an isolated, per-test, in-memory SQLite database (`backend/tests/calendar_auth_test_support.py`'s `make_sqlite_engine_and_session_factory()`).

## 17. Known Limits

- **The frontend is not yet wired to this API.** `web-view/js/knowledge-management.js`'s `APPROVED_DOCUMENTS` remains a static, hardcoded array — Company Documents still shows the same 3 temporary/sample records it always has, now with the `SAMPLE_DATA_NOTICE_TEXT` banner still accurately describing them as such. Switching the frontend to fetch from `GET /api/knowledge-documents` is a separate, not-yet-authorized task.
- **The `google_ownership_status` field can never reach `'Verified'`** through any route in this implementation — by design (§6 of the CRUD design doc), until a dedicated future Google Drive/Sheets verification feature exists (still `BLOCKED` per the original REQ-KM-001 discovery report).
- **No pagination cursor / sort-order customization beyond title-ascending** was implemented for LIST — not evidenced as a requirement; `limit`/`offset` exist, matching the `staff.py` list-endpoint convention.
- **Title search has no dedicated database index** (plain `ILIKE`) — an accepted, already-documented limitation at current (near-zero) data volume; flagged, not fixed, consistent with the original discovery report.
- A same-title/different-URL **warning is computed only at CREATE time**, not at VERSION-create or metadata-UPDATE time — not evidenced as a requirement for those routes (rule 5's wording is scoped to registration).

## 18. Frontend Status

Still using the temporary/sample static registry (§17). No frontend file was created, modified, or touched by this task.

## 19. PASS / FAIL

**PASS.** All 11 required routes implemented per the locked business rules; all 54 required tests pass (57/57 including 3 additional); zero schema/database writes; zero production data writes; protected path untouched; the 2 full-suite failures are pre-existing and independently verified unrelated to this change.

## 20. One Next Step

Wire the frontend (`web-view/js/knowledge-management.js`) to fetch from `GET /api/knowledge-documents` instead of the static `APPROVED_DOCUMENTS` array, and retire the sample-data notice once real records exist — a separate, not-yet-authorized task.

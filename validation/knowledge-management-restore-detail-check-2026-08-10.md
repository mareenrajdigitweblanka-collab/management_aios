# Validation — Knowledge Management Restore, Detail and Filter Flows Check (REQ-KM-UI-005)

**Date:** 2026-08-10
**Checked by:** Claude Code, this session
**Reference:** [docs/knowledge-management-restore-detail-closure-2026-08-10.md](../docs/knowledge-management-restore-detail-closure-2026-08-10.md)

---

## 1. Backend — deleted-read route

| Check | Result |
|---|---|
| `GET /api/knowledge-documents/deleted` exists | PASS |
| Unauthenticated request rejected (401) | PASS — test_55 |
| Authenticated Management Team member accepted (200) | PASS — test_56 |
| Returns only soft-deleted records | PASS — test_57 |
| Active records never returned | PASS — test_58 |
| Deterministic ordering (deleted_at DESC, id ASC tiebreak) | PASS — test_59 |
| No mutation occurs (plain SELECT) | PASS — test_60 |
| Static route registered before `/{document_id}` (route-order swallow risk) | PASS — verified: `/deleted` returns 200/401, never a 422 UUID-parse error |
| No database schema change | PASS — no migration file created or modified |
| No new table | PASS |
| RESTORE business rule (`POST /{id}/restore`) unmodified | PASS — existing RestoreTests (47-50) unchanged and still passing |

## 2. Auth

| Check | Result |
|---|---|
| Deleted-read route requires `Depends(get_verified_member)` | PASS |
| Existing Calendar Bearer token reused, no second auth mechanism | PASS — `kmProtectedRequest` used for `/deleted`, same as every other protected route |
| No user-enterable actor-identity field anywhere (created_by/deleted_by/restored_by/actor_member_key) | PASS — test 85 |

## 3. Deleted Documents UI

| Check | Result |
|---|---|
| Internal toggle within the existing panel, not a new sidebar item | PASS — `#msc-km-view-tab-active`/`#msc-km-view-tab-deleted`, no `index.html` sidebar change |
| Deleted Documents control exists | PASS — test 56 |
| Clicking loads the deleted endpoint | PASS — test 57 |
| Auth header attached to the deleted-list request | PASS — test 58 |
| Deleted records render with the documented fields (Title, Team, Type, Creator, Version, Deleted By, Deleted At, Delete Reason) | PASS — test 59 |
| Active rows never mixed into the deleted view | PASS — test 60 |
| Deleted row has a Restore action | PASS — test 61 |
| Deleted row has no Edit Metadata control | PASS — test 62 |
| Deleted row has no Create Version control | PASS — test 63 |
| Deleted row has no Delete-again control | PASS — test 64 |

## 4. Restore

| Check | Result |
|---|---|
| Restore requires confirmation before the API is called | PASS — test 65 |
| Confirmed restore calls the correct endpoint with the correct document id | PASS — test 66 |
| Success removes the row from the Deleted Documents view | PASS — test 67 |
| Success refreshes the active document list | PASS — test 68 |
| Success shows a success toast | PASS — test 69 |
| 409 URL collision surfaces a clear, restore-specific message (not the generic Create/Version duplicate-URL wording) | PASS — test 70 |
| No client-side restore workaround (deleted view always reflects the latest server response) | PASS — test 71 |
| The colliding active record is never touched on a 409 | PASS — backend RestoreTests.test_50 (unchanged, still passing) |

## 5. Real detail endpoint

| Check | Result |
|---|---|
| View Details calls the real `GET /api/knowledge-documents/{id}` endpoint | PASS — test 72 |
| Detail loading state renders while the GET is in flight | PASS — test 73 |
| List row title kept visible during loading (not discarded) | PASS — test 73 |
| Canonical detail response renders (not the stale list row) | PASS — test 74 |
| Detail error state renders on GET failure, with list-row context preserved | PASS — test 75 |
| Retry re-issues the GET and recovers to the detail state on success | PASS — test 76 |
| No field absent from the canonical response is invented | PASS — confirmed by direct code inspection; `renderDetailState` reads only fields `KnowledgeDocumentOut` actually returns |

## 6. Filter option stability

| Check | Result |
|---|---|
| Initial Team options captured from the unfiltered load | PASS — test 77 |
| Team filtering does not collapse Team options | PASS — test 78 |
| Search does not collapse Team options | PASS — test 79 |
| Document Type filtering does not collapse Type options | PASS — test 80 |
| Search does not collapse Document Type options | PASS — test 81 |
| Switching directly between Team values works (no reselecting All first) | PASS — test 82 |
| Switching directly between Document Type values works (no reselecting All first) | PASS — test 83 |
| Pagination inspected; baseline completeness self-detected via `total` vs. returned record count, never silently assumed | PASS — confirmed by direct code inspection of `updateFilterOptionsBaseline` |
| No dedicated filter-options endpoint added (not currently necessary — see docs §6/§12) | Confirmed — no new endpoint added; documented as a future follow-up condition only |

## 7. Safety

| Check | Result |
|---|---|
| No hard-delete UI anywhere, including the Deleted Documents view | PASS — test 84 |
| No actor-spoof fields anywhere | PASS — test 85 |
| Static REQ-KM-001 sample registry (`APPROVED_DOCUMENTS`) remains absent | PASS — test 86 |
| Sample-data notice remains absent | PASS — test 87 |

## 8. Full suite results

```
Backend — Knowledge Management only:
python -m unittest backend.tests.test_knowledge_documents
Ran 63 tests — OK

Backend — full suite:
python -m unittest discover -s backend/tests -p "test_*.py"
Ran 872 tests — 2 failures (pre-existing, unrelated — see §9)

Frontend — Knowledge Management only:
node --test knowledge-management.test.mjs
# tests 87
# pass 87
# fail 0

Frontend — full suite (all 5 files in web-view/js/):
node --test *.test.mjs
# tests 307
# pass 307
# fail 0
```

## 9. Pre-existing unrelated backend failures — verified, not caused by this task

| Test | Verification method | Result |
|---|---|---|
| `test_calendar_auth.StartupConfigurationValidationTests.test_missing_variable_fails_closed` | Run in isolation (no cross-test interference) | FAILS identically |
| `test_calendar_auth.StartupConfigurationValidationTests.test_missing_variable_fails_closed` | `git stash` all REQ-KM-UI-005 changes, re-run against base commit `6880ccf` | FAILS identically |
| `test_weekly_schedule_xlsx_export.TaskRowTests.test_pending_task_no_outcome` | Run in isolation | FAILS identically |
| `test_weekly_schedule_xlsx_export.TaskRowTests.test_pending_task_no_outcome` | `git stash` all REQ-KM-UI-005 changes, re-run against base commit `6880ccf` | FAILS identically |

Both failures pre-date this task and are unrelated to any file it touched. Not fixed — out of scope.

## 10. Scope integrity

| Check | Result |
|---|---|
| Backend files changed | **3** (`knowledge_documents.py`, `schemas.py`, `test_knowledge_documents.py`) |
| Frontend files changed | **3** (`knowledge-management.js`, `knowledge-management.css`, `knowledge-management.test.mjs`) |
| Database/schema changes made or executed | **0** |
| Production database writes performed by any test in this task | **0** — isolated in-memory SQLite (backend) / fixture-mocked `api` and stubbed `fetch` (frontend) only |
| `member-aios/mayurika-hr/staff-data/` opened or modified | **No** (protected path — not touched) |
| `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` touched | **No** |
| Unrelated Issues work touched | **No** |
| Migration files changed | **No** |

## 11. Overall verdict

**PASS.** All required backend and frontend behaviors from the REQ-KM-UI-005 spec are implemented and verified. 63/63 backend Knowledge Management tests pass, 87/87 frontend Knowledge Management tests pass, and both full regression suites (872 backend / 307 frontend) show zero new failures — the only 2 backend failures are pre-existing and independently confirmed unrelated to this task.

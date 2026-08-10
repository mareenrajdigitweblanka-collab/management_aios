# Handover — Knowledge Management Restore, Detail and Filter Flows Closure (REQ-KM-UI-005)

**Date:** 2026-08-10
**Requirement:** REQ-KM-UI-005
**Status:** Backend + frontend implementation complete, tested, committed locally. **Not pushed.**

---

## What this closes out

Three known gaps left open by REQ-KM-UI-004 are now resolved:

1. **Restore was blocked** because there was no way for the frontend to discover which documents were soft-deleted. A new, minimal, read-only backend route (`GET /api/knowledge-documents/deleted`) closes this — any authenticated Management Team member can now see and restore a soft-deleted document from a new "Deleted Documents" toggle within the Knowledge Management panel.
2. **View Details** used to just redisplay the row already visible in the table. It now calls the real detail endpoint (`GET /api/knowledge-documents/{id}`) every time, so what you see is always the canonical, freshly-fetched record — with a loading state and a retry-capable error state if the request fails.
3. **Team and Document Type filter dropdowns** used to shrink to only the values present in whatever the current (filtered) search result happened to contain. They now stay stable — the full set of known values, captured once from an unfiltered load, remains available no matter how you filter or search.

Full detail: [docs/knowledge-management-restore-detail-closure-2026-08-10.md](../docs/knowledge-management-restore-detail-closure-2026-08-10.md)
Full test/scope validation: [validation/knowledge-management-restore-detail-check-2026-08-10.md](../validation/knowledge-management-restore-detail-check-2026-08-10.md)

## What a Management Team reviewer should know

- **This is not yet live for real users.** Both this commit and the REQ-KM-UI-004 commit it builds on exist locally on `main` and have not been pushed to `origin/main`. Nothing changes in production until explicitly pushed.
- **Restore is not "undelete forever."** If another active document has since taken over the same source link while the original was deleted, restoring is blocked with a clear message — the system will never silently overwrite that other document or rewrite anyone's URL.
- **No new authorization system.** Deleted Documents and Restore use the exact same "Authorize this browser" token dialog every other Knowledge Management action already uses.
- **No one can type in who deleted or restored a document.** That information always comes from the server, tied to whoever is actually authorized in the browser at the time.
- **A small, deliberate backend addition was needed** (one new read-only route) — this was the one genuine blocker identified during REQ-KM-UI-004 and is explicitly in scope for this task. No other backend behavior changed, and no database schema changed.

## Verification performed this session

- Backend: 63/63 Knowledge Management tests passing (57 existing + 6 new); full backend suite 872 tests, 2 pre-existing unrelated failures (verified via isolation and `git stash` against the pre-task commit — not caused by this work).
- Frontend: 87/87 Knowledge Management tests passing (55 existing + 32 new); full frontend suite 307/307 passing, zero regressions.
- Zero database/schema changes. Zero production writes from any test.

## Known limitations carried forward

1. If the Knowledge Management library ever grows past roughly 200 active documents, the Team filter's "is this baseline complete" check will correctly flag itself as incomplete — at that point a small dedicated endpoint would be the right next step. Not built now because it isn't needed yet.
2. Every click on "View" now makes a live network request rather than reusing already-loaded data — an intentional trade-off (accuracy over one fewer round-trip), not expected to matter at current document volumes.

## One next step

Have the assigned Knowledge Management domain owner try the Deleted Documents / Restore flow and the real-time Detail loading in a browser against the live backend, then decide whether to push the combined REQ-KM-UI-004 + REQ-KM-UI-005 work to `origin/main`.

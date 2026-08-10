# Handover — Knowledge Management Standard Team Dropdown (REQ-KM-UI-006)

**Date:** 2026-08-10
**Requirement:** REQ-KM-UI-006
**Status:** Frontend implementation complete, tested, committed locally. **Not pushed.**

---

## What this closes out

The Knowledge Management Team field — previously free text on Add/Edit, and a filter dropdown that picked up whatever values happened to exist in the data (including stray test values like `test team`) — is now backed by one fixed list of 17 approved team names, used identically everywhere Team appears in this module.

Full detail: [docs/knowledge-management-standard-team-dropdown-2026-08-10.md](../docs/knowledge-management-standard-team-dropdown-2026-08-10.md)
Full test/scope validation: [validation/knowledge-management-standard-team-dropdown-check-2026-08-10.md](../validation/knowledge-management-standard-team-dropdown-check-2026-08-10.md)

## What a Management Team reviewer should know

- **This is not yet live for real users.** This commit and the two REQ-KM-UI-004/005 commits it builds on exist locally on `main` and have not been pushed to `origin/main`.
- **New documents must use one of the 17 approved team names** — Team is now a dropdown, not free text, on both Add Document and Edit Metadata. There is no "type your own" option.
- **Existing documents with an old/test Team value are not touched automatically.** Nothing was silently renamed or migrated. If a document's Team was never one of the 17 approved names (e.g. a leftover test record), opening Edit Metadata shows that value clearly and requires someone to deliberately pick one of the 17 before it changes — editing an unrelated field (like fixing a typo) will never accidentally change or clear its Team.
- **No backend or database change was needed or made.** This was purely a frontend change; the API already accepted any team text, so restricting the choices to 17 approved values didn't require touching it.

## Verification performed this session

- Frontend: 110/110 Knowledge Management tests passing (87 existing + 23 new); full frontend suite 330/330 passing, zero regressions.
- Zero backend files changed. Zero database/schema changes. Zero production writes from any test. Zero existing document rows modified.

## Known limitations carried forward

1. There is no bulk tool to relabel old/test Team values to one of the 17 approved names — each such record must be fixed individually, on purpose, by someone opening Edit Metadata and choosing a real team.
2. The 17-value list lives in exactly one place in the frontend code. If it ever needs to change, someone with codebase access has to update it there — there's no admin screen for it (out of scope for this task).

## One next step

Have the assigned Knowledge Management domain owner confirm the 17-value list still matches current organizational team names, then decide whether to push this and the two prior unpushed commits to `origin/main`.

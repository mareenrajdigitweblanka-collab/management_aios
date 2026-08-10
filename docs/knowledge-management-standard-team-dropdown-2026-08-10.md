# Knowledge Management — Standard Team Dropdown (REQ-KM-UI-006)

**Date:** 2026-08-10
**Requirement:** REQ-KM-UI-006 — replace manually entered/data-derived Knowledge Management Team values with one fixed default Team dropdown.
**Scope:** Frontend-only. No backend, schema, or migration changes.

---

## 1. The approved 17-value Team list

One canonical constant, `KM_DEFAULT_TEAMS`, exported from `web-view/js/knowledge-management.js`, containing exactly the 17 approved values in the exact approved spelling and order:

```
Management Team, Graphic Designing Team, Digital Marketing Team, Technical Team,
Ebay Team, Postage Team, Development Team, Customer Service Team, Amazon Team,
Centralized PPC Team, Inventory Team, Accounts Team, Portfolio Holders Team,
US /Canada Market Rebuild Team, Merchandising Team, Wayfair Team, IT support Team
```

Not renamed, not alphabetized, not extended.

## 2. Single frontend source

`KM_DEFAULT_TEAMS` is defined exactly once, alongside the module's existing `DOCUMENT_TYPE_OPTIONS`/`LIFECYCLE_STATUS_OPTIONS` constants, and reused by all three consumers — the Team filter, the Add Document Team field, and the Edit Metadata Team field. No separate hardcoded array exists anywhere else in the module.

It was **not** added to `member-registry.js` — that file is a Management Team *identity* registry (people: Mayurika, Suman, Arun, Rajiv, Paraparan), a fundamentally different concept from a document *department/team* registry (Ebay Team, Postage Team, etc.). Scoping this constant to Knowledge Management keeps the change minimal and avoids conflating two unrelated registries.

## 3. Root cause of the previous behavior (confirmed before any code was written)

`populateTeamOptions()` (added in REQ-KM-UI-005 to fix a *different* problem — Team options collapsing under filtering) derived its dropdown values from `state.filterOptionsBaseline.teams`, itself built from whatever `team` values were actually present in a successful, unfiltered LIST API response. This is exactly why the production Team dropdown could show values like `test team` — any string ever stored in a document's `team` column would eventually surface as a filter option. REQ-KM-UI-006 replaces this entirely: the Team filter is now a fixed, hardcoded enum, exactly matching how `DOCUMENT_TYPE_OPTIONS` has always worked (populated once at mount, never rebuilt from `state.documents`).

The entire REQ-KM-UI-005 data-derived-baseline mechanism for Team (`state.filterOptionsBaseline`, `populateTeamOptions()`, `isUnfilteredFilters()`, `distinctSortedTeams()`, `updateFilterOptionsBaseline()`) has been removed as dead code — a fixed enum has no "collapsing under filters" failure mode by construction, so there is nothing left for that mechanism to protect against.

## 4. Team filter behavior

- Contains `All` followed by all 17 approved values, in the approved order, populated once at mount.
- Never derives options from `state.documents`, API records, or search results.
- Filtering, searching, or switching directly between Team values never changes the option list — it is a static enum, not app state.
- Sent to the backend as an exact-match `team=` query parameter (unchanged, pre-existing `buildListQueryString` behavior) — e.g. `US /Canada Market Rebuild Team` is sent exactly as defined (URL-encoded in transit, decoded server-side to the identical string; the backend's own team filter is already a plain SQL equality match, `KnowledgeDocument.team == team`, so no substring/fuzzy matching was ever involved).

## 5. Add Document — Team field

Replaced the free-text Team input with a `<select>` (`buildSelectField`, the same shared helper `msc-km-create-type`/`msc-km-edit-type` already use), labeled `Team *`, with `Select Team` as the default (unselected, empty-value) placeholder option. The user must choose one of the 17 approved values before the form can submit — client-side validation blocks the API call entirely if the select is left on the placeholder. No "Other" free-text escape hatch exists. The selected value is sent to `POST /api/knowledge-documents` unchanged, in the existing `team` field — the backend schema (`KnowledgeDocumentCreate.team`, `Field(..., min_length=1, max_length=120)`, no enum constraint) was not changed and did not need to be, since every approved value already satisfies it.

## 6. Edit Metadata — Team field and legacy value handling

Replaced the free-text Team input with the same `<select>` pattern. Behavior depends on whether the record's current `team` value is one of the 17 approved values:

**Normal record (`document.team` is one of the 17):** the select is preselected to that value. Exactly like every other field in this form, it is resent unchanged on every save (whether or not the user touches it) — no behavior change from before this task for a standard record.

**Legacy record (`document.team` is NOT one of the 17 — e.g. `test team`, or any pre-existing free-text value):**
- The record itself remains fully visible everywhere (list, detail, filters) — nothing about existing rows was touched.
- Opening Edit Metadata shows a clear, explicit read-only note: `Current Team on record: "<value>" (not a standard Team). Select one of the standard Teams above only if you want to change it — leaving "Select Team" chosen keeps the current value unchanged.`
- The select itself is left on the `Select Team` placeholder — the legacy value is **never** added as a fake extra dropdown option (that would make it look like an approved value, which it isn't) and **never** silently coerced to one of the 17.
- **If the user saves without touching the Team select** (e.g. only fixing a typo in Job Role), `team` is omitted from the PATCH payload entirely. The backend's existing `exclude_unset=True` semantics mean an omitted field is left completely untouched — the legacy value survives on the record exactly as it was.
- **Only if the user deliberately selects one of the 17 approved values** does `team` get included in the payload, as an intentional, explicit change.

This was chosen as the safest implementation consistent with the existing PATCH behavior: it requires zero backend changes (the omit-when-unset semantics already existed, unused for this purpose until now), and it makes "I am changing the Team" and "I am not changing the Team" two unambiguous, distinct user actions — there is no code path where opening or saving the form can silently rewrite a legacy value.

## 7. Filter behavior (exact matching, no code change required)

Team filtering was already implemented as an exact-match query parameter passthrough (`buildListQueryString`), and the backend's `_apply_filters` already does exact SQL equality (`KnowledgeDocument.team == team`), not substring or fuzzy matching. No code change was needed for this requirement — it is confirmed and test-covered (e.g. `Management Team` is never treated as equal to or a match for `Technical Team`; `US /Canada Market Rebuild Team` round-trips exactly).

## 8. Tests

**110 total tests** in `knowledge-management.test.mjs` (87 pre-existing from REQ-KM-UI-004/005 + 23 new for REQ-KM-UI-006, numbered 88-110). Three pre-existing REQ-KM-UI-005 filter-stability tests (77-79) and one filter-switching test (82) were also updated — they previously asserted against the now-removed data-derived baseline behavior (using fixture team values `Management`/`HR`, neither of which are approved values) and now assert against the fixed `KM_DEFAULT_TEAMS` list instead. Four existing CREATE-flow tests (20, 21, 22, 23) had their fixture Team value changed from the placeholder string `'Team'` to a real approved value (`'Ebay Team'`), since the field is now a select and a non-approved string would never be a reachable UI state.

New coverage (88-110): constant existence/count/exact-spelling, filter includes `All` and all 17 values, filter does not derive from API records, filter stability under filtering/searching, Add Document Team is a select (not a text input), Add requires a Team selection, selected Team sent unchanged in POST, Edit Metadata Team is a select, an approved existing Team is preselected, a selected edited Team is sent unchanged in PATCH, a legacy Team is never silently rewritten by an unrelated edit, the legacy value is clearly shown, no "Other" input exists, and regression re-checks (static sample registry absent, no hard-delete UI, Knowledge Management/Issues/Review Summaries/Calendar navigation).

### Full suite results

```
node --test knowledge-management.test.mjs
# tests 110
# pass 110
# fail 0

node --test *.test.mjs   (all 5 files in web-view/js/)
# tests 330
# pass 330
# fail 0
```

No backend tests were run or changed — this task made zero backend changes.

## 9. Backend files changed

**0.** This is a frontend-only change, as required.

## 10. Database / schema changes

**0.** No migration executed or created. No existing production document rows were modified — legacy Team values on existing records are left exactly as they are (§6).

## 11. Production writes

**0.** All tests run against fixture `api` objects — no test in this suite reaches the live database.

## 12. Known limitations

1. A legacy record's Team value can only be changed by explicitly selecting one of the 17 approved values in Edit Metadata — there is no bulk-migration tool to relabel legacy values (e.g. mapping `test team` to a real team) in this task, and none was requested. Per explicit instruction, no such mapping was invented.
2. The 17-value list is a frontend-only constant. If the approved list ever needs to change, it must be updated in exactly one place (`KM_DEFAULT_TEAMS`) — there is no backend-driven or database-driven source of truth for it (deliberate, per the "frontend-only" scope of this task).

## 13. Verdict

**PASS.** All required behaviors are implemented: single canonical Team source, fixed-list filter with no data-derived collapse risk, select-only Add/Edit Team fields with no free-text or "Other" path, and safe, explicit legacy-value handling that never silently rewrites an existing record. 110/110 Knowledge Management tests pass; the full 330-test frontend suite shows zero regressions.

## 14. One next step

Have the assigned Knowledge Management domain owner confirm the 17-value list against current organizational team names before this (and the REQ-KM-UI-004/005 work it builds on) is pushed to `origin/main`.

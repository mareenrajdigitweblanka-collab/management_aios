# Validation — Knowledge Management Standard Team Dropdown Check (REQ-KM-UI-006)

**Date:** 2026-08-10
**Checked by:** Claude Code, this session
**Reference:** [docs/knowledge-management-standard-team-dropdown-2026-08-10.md](../docs/knowledge-management-standard-team-dropdown-2026-08-10.md)

---

## 1. Single canonical Team source

| Check | Result |
|---|---|
| `KM_DEFAULT_TEAMS` exists once, exported | PASS — test 88 |
| Exactly 17 Team values | PASS — test 89 |
| Exact approved spelling and order | PASS — test 90 |
| Not duplicated into three separate arrays | PASS — confirmed by direct code inspection: filter, Add, and Edit all reference the same `KM_DEFAULT_TEAMS` constant |
| Not added to `member-registry.js` | PASS — confirmed by direct inspection; that file is a Management Team identity (people) registry, unrelated to this document-Team concept |

## 2. Team filter

| Check | Result |
|---|---|
| Includes "All" | PASS — test 91 |
| Includes all 17 approved values | PASS — test 92 |
| Does not derive options from API records | PASS — test 93 (a record with `team: 'test team'` never appears as a filter option) |
| Filtering does not collapse Team options | PASS — test 78, 94 |
| Searching does not collapse Team options | PASS — test 79, 95 |
| Exact matching (no substring/fuzzy) | PASS — confirmed by direct inspection of `buildListQueryString` and the backend's pre-existing `_apply_filters` (`KnowledgeDocument.team == team`), neither changed by this task |
| `US /Canada Market Rebuild Team` round-trips exactly | PASS — confirmed by direct inspection: `encodeURIComponent`/`decodeURIComponent` round-trip any string byte-for-byte; no transformation applied |

## 3. Add Document

| Check | Result |
|---|---|
| Team field uses a select | PASS — test 96 |
| No free-text Team input | PASS — test 97 |
| Add requires a Team selection before the API is called | PASS — test 98 |
| Selected Team sent unchanged in the POST payload | PASS — test 99 |
| No "Other" arbitrary Team input | PASS — test 105 |

## 4. Edit Metadata

| Check | Result |
|---|---|
| Team field uses a select | PASS — test 100 |
| Existing approved Team is preselected | PASS — test 101 |
| Selected edited Team sent unchanged in the PATCH payload | PASS — test 102 |
| Legacy/non-default existing Team is never silently rewritten by an unrelated edit | PASS — test 103 (`team` key omitted from the PATCH payload entirely when left untouched) |
| Legacy Team value clearly shown | PASS — test 104 |
| Legacy Team select left on the placeholder (never silently coerced) | PASS — test 104 |

## 5. Regression

| Check | Result |
|---|---|
| Static sample registry remains absent | PASS — test 86, 106 |
| No hard-delete UI regression | PASS — test 84, 107 |
| Knowledge Management navigation regression | PASS — test 55, 108 |
| Issues regression | PASS — test 52, 109 |
| Review Summaries regression | PASS — test 53, 110 |
| Calendar regression | PASS — test 54, 110 |

## 6. Full suite results

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

## 7. Scope integrity

| Check | Result |
|---|---|
| Backend files changed | **0** |
| Database/schema changes made or executed | **0** |
| Existing production document rows modified | **0** — legacy Team values are read-only-displayed, never auto-rewritten |
| Production database writes performed by any test | **0** — every test uses a fixture `api` object |
| `member-aios/mayurika-hr/staff-data/` opened or modified | **No** (protected path — not touched) |
| `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` touched | **No** |
| Files changed | **2** (`web-view/js/knowledge-management.js`, `web-view/js/knowledge-management.test.mjs`) — no CSS change was needed (the legacy-value note reuses the existing `.msc-km-readonly-note` style) |

## 8. Overall verdict

**PASS.** The Team dropdown is now backed by exactly one canonical 17-value constant, reused identically by the filter, Add Document, and Edit Metadata. The filter can no longer show stray data-derived values (the root cause of the reported `test team` symptom). Legacy Team values on existing records are preserved exactly, never silently rewritten. 110/110 Knowledge Management tests pass; the full 330-test frontend suite shows zero regressions.

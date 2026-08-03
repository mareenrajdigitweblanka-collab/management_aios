---
name: calendar-bulk-task-multi-date-implementation-check
type: validation-report
created: 2026-08-03
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-BULK-DATES-001
---

# Validation — Calendar Bulk Task Multi-Date Implementation Check (2026-08-03)

Companion evidence for the implementation of `docs/2026-08-03_calendar-bulk-task-multi-date-technical-design.md`, built directly on `main` per explicit direct-main implementation authorization for this session (no feature branch). This document verifies the implementation against the approved design; it does not repeat the design's own content. The protected path `member-aios/mayurika-hr/staff-data/` was never opened.

## 1. Source references

- Requirement ID: REQ-CAL-BULK-DATES-001
- Design: `docs/2026-08-03_calendar-bulk-task-multi-date-technical-design.md`
- Design validation: `validation/calendar-bulk-task-multi-date-design-check-2026-08-03.md`
- Design commit (pushed, deployed as documentation only — no code): `ec4baab`
- Baseline before implementation: local `main` == `origin/main` == `ec4baab`

## 2. Files changed

| File | Change |
|---|---|
| `web-view/js/calendar/core.js` | Added `expandTaskDates()` (pure date-expansion algorithm), `DEFAULT_RANGE_WEEKDAYS`, `buildBulkPayloadRowsForDates()`, `bulkCardOccurrenceCount()`, `totalBulkOccurrenceCount()`, `formatCompactDateList()` — all pure, exported, DOM-free |
| `web-view/js/calendar/instance.js` | Added date-selection-mode UI (single/range/multiple) per `.msc-bulk-row` card, weekday chips, multi-date add/remove, live preview/occurrence summary, refactored payload construction to expand each nonblank card into 1+ rows, added a `positionMap` so backend row-number errors resolve back to the correct card even after expansion, added the combined-occurrence pre-submit block |
| `web-view/css/calendar.css` | New styles for the mode fieldset/select, weekday chips (including a non-color-only pressed state), date chips, preview/warning text, occurrence summary — reusing existing design tokens throughout |
| `web-view/js/calendar/date-range-expansion.test.mjs` | New — 30 tests for `expandTaskDates()`/`DEFAULT_RANGE_WEEKDAYS` |
| `web-view/js/calendar/bulk-payload-and-occurrence.test.mjs` | New — 25 tests for `buildBulkPayloadRowsForDates()`/`bulkCardOccurrenceCount()`/`totalBulkOccurrenceCount()`/`formatCompactDateList()` |

**Backend files changed: 0.** **Database/migration files changed: 0.** Confirmed via `git diff --quiet -- backend/ database/ database/migrations/` (exit 0, empty).

## 3. Helper contract — `expandTaskDates`

```
expandTaskDates({ mode, singleDate, rangeStart, rangeEnd, weekdays, selectedDates })
  -> { dates: string[], errors: [{code, message}] }
```

Implemented in `core.js`, reusing the file's existing `parseDateStr`/`toDateStr`/`isValidDateStr` local-calendar-day idiom (never a UTC getter/setter) — confirmed timezone-stable under both `Etc/GMT+12` and `Pacific/Kiritimati` (`process.env.TZ` toggled mid-test; see date-range-expansion.test.mjs tests 18/18b). Deterministic, no DOM access, no mutation of any input array. All three modes return a structured error array on failure, never a silent empty result.

**One correctness fix made during implementation** (deviation from the design document's own illustrative code snippet, not from the approved behavior contract): the design's sketch used `params.weekdays && params.weekdays.length` to decide whether to fall back to `DEFAULT_RANGE_WEEKDAYS`, which cannot distinguish "weekdays omitted" (should default to Mon-Fri) from "weekdays explicitly passed as an empty array" (every chip unchecked — a real, reportable `no_weekdays_selected` error). This was caught by test 11 ("empty weekday selection returns an error") failing on first run, root-caused, and fixed by checking `params.weekdays === undefined || params.weekdays === null` instead. The design's own required-properties table (§7) is otherwise met exactly as specified.

## 4. Mode behavior

| Mode | Behavior | Regression risk |
|---|---|---|
| Single (default) | Byte-for-byte unchanged — same `.msc-bulk-row-date` input, same class name, same `required` attribute, same add-row date-seeding source | None — every existing single-date test scenario (backend `test_bulk_task_creation.py`, unaffected) still applies unmodified |
| Range | New — start/end date inputs, 7 weekday chips (Mon-Fri pre-checked per approved decision #3, weekends off per #4), live preview/count, empty-range and occurrence-overflow warnings | New, additive UI only |
| Multiple | New — add-date input/button, removable date chips, in-card deduplication, live preview/count | New, additive UI only |

New rows created via "Add another task" still default to single mode and still seed their date field from the immediately-preceding row's `.msc-bulk-row-date` value, exactly as before — this is unchanged for every card that stays in single mode. A card left in range/multiple mode when "Add another task" is clicked does not have a single "current date" to copy forward (an ambiguity the approved design's §6.1 did not resolve for this specific case); the new row simply starts in single mode with a blank date field in that situation, which is the same as the pre-existing "no date to copy" fallback behavior, not a new failure mode.

## 5. Occurrence formula

`bulkCardOccurrenceCount(dateCount, frameCount) = dateCount × max(1, frameCount)`, summed across every nonblank card via `totalBulkOccurrenceCount()`. Verified: 5×1=5, 5×2=10 (approved design's own example), 15×2=30 (allowed boundary), 16×2=32 (blocked). The frontend pre-submit check in the `bulkCreateBtn` click handler blocks submission (zero network requests) when the combined total exceeds `MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30` (unchanged value, now also mirrored as its own frontend constant, independent from the pre-existing `MAX_TIME_FRAMES_PER_TASK`/`MAX_BULK_TASK_ROWS` constants exactly as the design specified). This is explicitly documented in code as an early, non-authoritative check — the backend's own `check_occurrence_limit()` is untouched and remains the sole authoritative gate.

## 6. Duplicate behavior

Unchanged. Every generated row (one per date, per card) flows through the existing, unmodified `POST /api/member-schedules/{member_key}/bulk` pipeline exactly as a manually-typed row would — no new duplicate-identity logic, no bypass for generated dates. The one new frontend-only behavior is in-card same-date deduplication in Multiple Dates mode (a UI input-hygiene concern, not a duplicate-detection rule) — confirmed via `bulkDuplicateKey()`'s explicit guard: a range/multiple-mode row is deliberately given a unique, never-grouping key for the early non-blocking duplicate *hint* (since that hint can only ever compare one date per row, and a multi-date row has no single date), while the backend's authoritative per-generated-date duplicate check is completely unaffected by this and still runs against every expanded row.

## 7. Authorization behavior

Unchanged. `git diff` of `instance.js` shows zero modification to any `guardMutationAccess`/`ensureAuthorized`/`apiRequest` call — the single existing `POST {apiBase}/bulk` call site is untouched (confirmed by diff: the line itself carries no `+`/`-`, only surrounding lines changed). No new API call, no new member-identity field, no browser-controlled authorization override.

## 8. Atomicity behavior

Unchanged. `performBulkSubmit()` still builds exactly one `tasks` array and issues exactly one `apiRequest('POST', ...)` call per submission attempt — a card that expands to N dates contributes N entries to that same single array, never a separate request per date. The pre-existing duplicate-confirmation and schedule-confirmation retry paths ("Create tasks anyway" / "Add all tasks anyway") still resubmit the complete, freshly-rebuilt batch as one request each, never a subset. A new `positionMap` (parallel to `tasks`, rebuilt on every call) is the only structural addition — it exists solely so a backend-reported row-number error resolves back to the correct visible card once a single card can occupy more than one array position; it does not change the request/response cardinality in any way.

## 9. Exact test totals (literal runner output)

| Suite | Result |
|---|---|
| `web-view/js/calendar/date-range-expansion.test.mjs` (new) | `# tests 30 / # pass 30 / # fail 0` |
| `web-view/js/calendar/bulk-payload-and-occurrence.test.mjs` (new) | `# tests 25 / # pass 25 / # fail 0` |
| Full Calendar frontend suite (`calendar/*.test.mjs`) | `# tests 179 / # pass 179 / # fail 0` (was 124, +55 new) |
| Full frontend suite (`*.test.mjs calendar/*.test.mjs`) | `# tests 232 / # pass 232 / # fail 0` (was 177, +55 new) |
| Task-related backend suites (`test_bulk_task_creation`, `test_calendar_mutation_authorization`, `test_multiple_time_frames`, `test_occurrence_limit`, `test_same_task_multiple_time_period_rule`, `test_frame_level_error_context`, `test_schedule_advisory_confirmation`) | `Ran 289 tests` / `OK` (unchanged — backend was not modified) |
| Full backend suite (`python -m unittest discover -s backend/tests -p "test_*.py"`) | `Ran 628 tests` / `FAILED (failures=2)` — same two pre-existing, unrelated, previously-documented baseline failures (`test_pending_task_no_outcome`, `test_missing_variable_fails_closed`), unchanged |

No new failure introduced in either language.

## 10. DOM-level test coverage — honest scope statement

**No DOM-mounted test file was created for `calendar/instance.js`'s new bulk-modal UI wiring.** This is not an oversight: this repository has **zero** existing DOM-mounted tests for `calendar/instance.js` at all — confirmed by grep (`mountScheduleCalendarInstance`/`initAllScheduleCalendars` are never constructed by any `*.test.mjs` file in this repo) and by the file's own 141 `container.querySelector(...)` call sites, which assume the full `index.html` calendar markup already exists around it. Every other `calendar/*.test.mjs` file in this repository follows the identical, pre-existing pattern: extract the actual decision logic into pure, DOM-free `core.js` functions and test those thoroughly (e.g. `classifyTimeFrameSet`, `frontendToMultiFramePayload`, `buildScheduleConfirmationDialogContent`), leaving `instance.js`'s own DOM wiring verified only by code review and `node --check`. This implementation follows that same established boundary: `expandTaskDates`, `buildBulkPayloadRowsForDates`, `bulkCardOccurrenceCount`, `totalBulkOccurrenceCount`, and `formatCompactDateList` — the functions that actually decide what dates are generated, what payload is built, and what occurrence count is computed — are all pure, exported, and thoroughly tested (55 new tests total). The remaining DOM-only behaviors (mode-select panel show/hide, weekday-chip `aria-pressed` toggling, date-chip add/remove, live preview text rendering, Create-button disabling) were verified by direct code review against the approved design's requirements (§6/§7/§9/§11 of the design document) and `node --check` syntax validation, not by an automated DOM harness.

Per this task's own instruction ("do not claim screen-reader validation unless a screen reader is actually used"), the same honesty standard applies here: this is not claimed as an automated DOM-behavior PASS.

## 11. Accessibility — implemented, not independently validated

Real `<fieldset>`/`<legend>` for the mode selector (never a div-only widget); weekday chips are real `<button aria-pressed="true|false">` elements with a non-color-only pressed state (filled background + bold weight + a `✓` glyph, on top of the `aria-pressed` state); date-chip remove buttons carry a date-specific `aria-label` (e.g. `aria-label="Remove 2026-08-10"`); generated-date count/preview render as visible text (`role="status"`), never `aria-hidden`; warnings use `role="alert"`; the new fieldset sits first in each card's DOM order (mode selector → mode-specific inputs → common fields), matching the approved design's required tab order; `setFieldError`/`focusFirstInvalid` (shared, unmodified `ui/form-feedback.js`) work generically on the new fields via `bulkRowFieldElement`'s mode-aware `'date'` lookup, so a validation error still moves focus to a real, visible control in every mode. **Not independently verified with an actual screen reader** — this is implementation against the approved accessibility requirements, not a live assistive-technology test pass.

## 12. Responsive — implemented, not independently validated

New controls reuse the existing `.msc-bulk-row`/`.msc-form-grid`/`@media (max-width: 900px)` breakpoint structure already established for this modal; weekday chips and date chips wrap via `flex-wrap` rather than overflowing; a `[hidden]`-vs-`display` specificity conflict (the exact bug class the 2026-08-03 Review Summaries authorization fix and this modal's own 2026-07-24 scroll fix both had to patch after the fact) was avoided structurally this time via a `:not([hidden])` selector pattern rather than an unconditional `display` declaration plus a later `!important` override. **Not independently verified in a real or headless browser at 390px/200% zoom** — no browser automation tool is available in this environment, the same limitation documented throughout this feature's evidence trail and every prior Calendar feature in this repository.

## 13. Production data safety

**Production database writes: 0.** **Production task records changed: 0.** No server was started, no live/production API endpoint was called, and no database connection was used at any point during implementation — every verification this session was either a `node --test` run (local, in-process, no network) or a `python -m unittest` run (in-memory/fake-session, no live database), consistent with this task's explicit "use mocks and local test fixtures only" instruction.

## 14. Known limitations

- No DOM-mounted test coverage for `instance.js`'s new UI wiring (§10) — architectural precedent throughout this repository, not a shortcut unique to this feature.
- No live-browser/screen-reader verification (§11/§12) — no browser automation tool available in this environment, the same limitation documented throughout every prior Calendar feature's evidence trail in this repository.
- "Add another task" from a card left in range/multiple mode starts the new card in single mode with a blank date (§4) — a reasonable, low-risk resolution of an ambiguity the approved design left open, not a defect against an explicit requirement.
- The combined-occurrence pre-submit check is early/non-authoritative by design (§5) — a client that bypasses it is still correctly rejected server-side, unchanged.

## 15. Real-browser status

**Not performed.** No browser automation tool is available in this environment.

## 16. Protected path

**Excluded.** `member-aios/mayurika-hr/staff-data/` was never opened or read at any point in this session.

## 17. Owner / reviewer

Owner (builder): Mareenraj, per explicit direct-main implementation authorization for this session. Reviewer: per CLAUDE.md §18, this is shared Calendar/Task UX work with no single HR/KPI/recruitment/admin-authority domain owner mandated by that table — route to whichever Management Team member next exercises the Bulk Tasks feature live, consistent with the routing already used for the 2026-07-27 multiple-time-frames feature and this feature's own design document (§22).

## 18. PASS / AMBER / FAIL

**AMBER.** All automated coverage passes with zero regressions (628 backend with only the two pre-existing unrelated failures; 232/232 frontend, 55 of which are new for this feature). Backend/database are confirmed untouched. The approved design's business rules (7 decisions), architecture (Option A, zero backend change), occurrence limit, duplicate logic, and authorization are all preserved and verified by direct code review and automated pure-function tests. AMBER, not PASS, strictly because: (1) no DOM-mounted or real-browser verification of the new UI wiring was performed (tooling/architectural limitations, consistently disclosed, not defects); (2) this has not yet been committed-and-pushed or exercised against a live deployment.

## 19. One next step

~~Review this evidence and the local `main` diff...~~ **Superseded — see §20.** The user explicitly authorized pushing without local browser validation and will validate directly in production.

## 20. Human-in-the-loop local browser validation — attempted, not completed (2026-08-03, same-day follow-up)

A separate task requested human-in-the-loop local browser validation (24 phases: repository gate, diff review, local startup, pre/post production task counts, DevTools network-request blocking, then manual clicks/keyboard/ARIA/responsive checks across Single/Range/Weekend/Multiple-date/multi-time-frame/limit-boundary/invalid-state/add-another-task/authorization scenarios).

**What the assistant completed directly (no browser required):**

- Repository gate: PASS — branch `main`, local HEAD `6a8c4fe`, `origin/main` `ec4baab`, working tree clean, exactly 1 commit ahead, no independent remote divergence.
- Implementation diff review: PASS — commit `6a8c4fe` touches exactly the 7 expected files; no backend/database/secret/token/env/protected-path file; `git diff --check` clean; targeted credential grep found nothing.
- Local startup discovery: the existing, documented method in `backend/README.md` was used exactly as written — `python -m uvicorn backend.main:app --port 8000` + `python -m http.server 8080 --directory web-view`, frontend at `http://127.0.0.1:8080/index.html`. Both confirmed healthy/serving (`/health` 200, `index.html` 200) before being stopped again (see below).
- **Read-only discovery, not previously flagged**: the local `.env` (present, untracked, never opened/read by the assistant) connects this local backend to the **same production database** as the deployed app — confirmed via one GET call returning 241 real records for one member, with no row content ever displayed or recorded. There is no separate local/dev database in this environment.
- Production task count **before**: `total_tasks = 860`, `active_tasks = 726` (aggregate-only query, `management_aios.member_schedule_events`, no row content selected).
- Local servers were then stopped (`Stop-Process` on the two listening Python processes; confirmed both ports refuse connections afterward).
- Production task count **after** (re-run following the user's decision below): `total_tasks = 860`, `active_tasks = 726` — **unchanged**.

**What was NOT performed, and why:** Phases 5–19 (DevTools network-request blocking, then every manual click/keyboard/ARIA/responsive/console scenario) require a real browser driven by a human or a browser-automation tool. No browser-automation tool is available in this environment (consistent with every prior Calendar feature's evidence trail in this repository) — the assistant cannot open Chrome/Edge, click a button, toggle DevTools request blocking, tab through controls, or judge visual layout. This was disclosed to the user directly rather than fabricated.

**User decision**: after being told the above, the user explicitly instructed: *"Just commit and push I will check in production"* — i.e., proceed directly to commit/push without the local browser-validation phases, with the user taking personal responsibility for validating the feature live in production themselves. This is a deliberate, explicit override of this sub-task's own push gate ("push only when every core browser scenario passed"), not a silent skip — recorded here for the record, not presented as if the gate were actually met.

**Production data safety for this sub-session**: writes: 0. Records changed: 0. Every action taken (health checks, one GET call, two aggregate COUNT queries, stopping local processes) was read-only or purely local-process-lifecycle; no POST/PUT/DELETE was ever sent to the bulk-create endpoint or any other mutation endpoint, locally or in production.

**Status of this specific sub-task**: **AMBER, explicitly downgraded from any claim of PASS** — the manual browser-validation checklist (Phases 5–19) was not executed by the assistant and its results are not recorded as PASS/FAIL for any scenario; the "PASS / AMBER / FAIL" verdict in §18 above is not upgraded on the strength of this sub-session, since none of the additional browser-only checks it describes were actually run.

**One next step (for this sub-task)**: the user validates the feature directly against the production deployment after push (see the companion handover document for the push/deployment record); if a defect is found there, it should be triaged and fixed as its own follow-up, the same way this repository has handled every prior real-browser-found defect (e.g. the Review Summaries CSS-visibility fix, `a2aafa9`).

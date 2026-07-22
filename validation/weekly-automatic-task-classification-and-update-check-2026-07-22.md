---
name: weekly-automatic-task-classification-and-update-check
type: validation
created: 2026-07-22
status: PASS — 198/198 backend unit tests pass; commits 5c1c508/6553150 deployed and confirmed; 7/7 live API scenarios confirmed against production; disposable test records cleaned up
source-boundary: backend/config.py, backend/models.py, backend/routers/member_schedules.py, backend/schemas.py, backend/tests/test_schedule_classification.py, backend/tests/test_schedule_duration_reports.py, web-view/js/calendar/core.js, web-view/js/calendar/instance.js only. database/, database/migrations/, member-aios/mayurika-hr/staff-data/ — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Weekly Automatic Task Classification and Update Rule — Check — 2026-07-22

**Requirement:** Replace the 2026-07-14 previous-day-cutoff / permanent-category classification rule with a weekly-cutoff rule: every task belongs to the Monday-Sunday calendar week containing its `event_date`, with a planning cutoff at the preceding Sunday 23:59:59 Asia/Colombo. Applies at creation (`created_at`) and, critically, is **re-applied on every successful update** (edit-form save, title/notes/priority/date/start/end change, drag, resize — one-way only, never back to Scheduled). The manual category selector is removed from the UI entirely; the backend is the sole authority. No migration, no historical recalculation, no schema change.

**This validation supersedes the previous rule for future task creation and every future task update.** It does not retroactively apply to, alter, or invalidate any existing row — historical rows retain their stored category until that specific row is itself successfully edited (see "Existing-Data Protection" below).

---

## Previous Rule (superseded — historical description, not edited at its source)

Read directly from `backend/routers/member_schedules.py` (pre-change), confirmed by `validation/schedule-classification-previous-day-cutoff-check-2026-07-14.md` (left unedited as historical record):

- `classify_schedule_category(requested_category, event_date, created_at)` — create-time-only. Category assigned exactly once and permanent forever after.
- Cutoff basis: the day immediately before `event_date` (a "day-before" rule), not a Monday-Sunday week concept.
- `update_member_schedule_event` **rejected** (HTTP 422) any request that tried to change `category` from its stored value — no update path could ever alter category. Drag/drop and resize both re-sent the existing category unchanged, by frontend convention, and the backend independently enforced the same lock.
- The Create and Edit Task forms both had a manual Category `<select>` — enabled on create, disabled-with-helper-text ("Category is fixed after the task is created") on edit.

This is documented here as the superseded rule for context; that file remains the authoritative historical record of the previous-day-cutoff rule's implementation and is unedited by this work.

## New Rule (this change)

```python
def get_target_week_start(event_date):
    return _monday_of_week(event_date)  # existing Monday-Sunday helper, reused

def get_preceding_sunday_cutoff(event_date):
    monday = get_target_week_start(event_date)
    preceding_sunday = monday - timedelta(days=1)
    return datetime(preceding_sunday.year, preceding_sunday.month, preceding_sunday.day,
                     23, 59, 59, tzinfo=_COLOMBO)

def classify_new_task(event_date, created_at):
    return "Scheduled Task" if created_at < get_preceding_sunday_cutoff(event_date) else "Unscheduled Task"

def classify_updated_task(current_category, resulting_event_date, updated_at):
    if current_category == "Unscheduled Task":
        return "Unscheduled Task"
    if updated_at >= get_preceding_sunday_cutoff(resulting_event_date):
        return "Unscheduled Task"
    return "Scheduled Task"
```

`_monday_of_week` (Monday=`weekday()==0`) is the same function the weekly report boundary (`get_weekly_schedule_report`) already used — classification and reporting share one Monday-Sunday definition, never two.

## Exact Comparison

`created_at < cutoff` (create) / `updated_at >= cutoff` (update), where `cutoff` is a timezone-aware `datetime` at exactly `23:59:59.000000` Asia/Colombo on the Sunday before the target week's Monday, and `created_at`/`updated_at` are always UTC-aware. Python compares aware datetimes correctly across zones with no manual conversion needed. This is a **discrete-second boundary**, not a calendar-date comparison (unlike the superseded rule) — `23:59:59.5` Colombo is already `>= cutoff` and therefore Unscheduled, matching the required Sunday 23:59:58/23:59:59 split exactly.

## Asia/Colombo Handling

Unchanged constant `_COLOMBO = ZoneInfo("Asia/Colombo")`. `created_at`/`updated_at` are always `datetime.now(timezone.utc)`, generated once per request and reused for both classification and the stored column — never browser time, never a client-supplied timestamp.

## Boundary Examples (target week Monday 2026-07-20 – Sunday 2026-07-26; both dates independently confirmed via `date(...).strftime('%A')` before use)

Asia/Colombo is a fixed UTC+05:30 offset, no DST.

| Colombo local time | UTC equivalent | vs. cutoff (19 Jul 23:59:59 Colombo) | Result |
|---|---|---|---|
| 19 Jul 23:59:58 (Sun) | 19 Jul 18:29:58 | before | Scheduled |
| 19 Jul 23:59:59 (Sun) | 19 Jul 18:29:59 | at | Unscheduled |
| 20 Jul 00:00:00 (Mon) | 19 Jul 18:30:00 | after | Unscheduled |

The 19 Jul 18:29:59 UTC row is the sharpest proof point for the create rule (`<` vs `>=`); it is identical to the update rule's own cutoff comparison.

## Update Reclassification — One-Way Guarantee

`classify_updated_task` short-circuits to `"Unscheduled Task"` the instant `current_category` is already `"Unscheduled Task"`, **before** it ever computes a cutoff — so no combination of `resulting_event_date`/`updated_at`, however far in the future or however early, can restore `"Scheduled Task"`. Confirmed by unit tests (`test_10`, `test_11`, `test_14`) and live scenario E below.

## Resulting Event Week (not the original week)

`update_member_schedule_event` computes `updated_at` and calls `classify_updated_task(current_category=event.category, resulting_event_date=event.event_date, updated_at=updated_at)` **after** `event.event_date` has already been reassigned to the new date (if the request changed it) — so a date-change edit is always evaluated against the week it is moving *into*, never the week it is moving *out of*. Confirmed by unit test `test_9`/`test_9b` and live scenario D below.

## Manual Category Removal

- **Create:** `MemberScheduleEventCreate.category` is now `Optional[str] = None` (no enum, no `VALID_SCHEDULE_CATEGORIES` restriction) — accepted for backward compatibility only; `create_member_schedule_event` never reads `payload.category`.
- **Update:** `MemberScheduleEventUpdate.category` remains `Optional[str] = None`; `update_member_schedule_event` now does `update_data.pop("category", None)` instead of the previous 422-rejection check — a client-sent value (any value, valid or not) is silently discarded, never inspected, never causes an error.
- **Frontend:** the Category `<select>` is removed from both the Create and Edit Task forms (`web-view/js/calendar/instance.js`), replaced with a static note: *"Task type is assigned automatically based on when the task is created or changed."* `frontendToApiPayload` (`web-view/js/calendar/core.js`) no longer includes a `category` key at all — there is no field left in the DOM to read it from. Drag (`commitItemTimeChange`) and the Add/Update button handlers all stopped sending `category`.
- **Preserved:** Task Details popup (`viewCategory.textContent = 'Category: ' + it.category`), the calendar category legend, and all `CATEGORY_CLASS`-driven event colors (green=Scheduled, yellow=Unscheduled) are unchanged — they only ever *display* the backend-assigned value, never collect one.

## Manipulated-Request Decision Table (proved by both unit tests and live API calls — see below)

| Path | Client sends | Actual classification | Stored |
|---|---|---|---|
| Create, before cutoff | `category: "Unscheduled Task"` | Scheduled | **Scheduled Task** (request ignored) |
| Create, at/after cutoff | `category: "Scheduled Task"` | Unscheduled | **Unscheduled Task** (request ignored) |
| Update, before cutoff | `category: "Scheduled Task"` (on an already-Unscheduled row) | Unscheduled (one-way) | **Unscheduled Task** (request ignored) |
| Update, at/after cutoff | `category: "Scheduled Task"` | Unscheduled | **Unscheduled Task** (request ignored) |

## Preserved Create Flow

Confirmed by diff — only the classification call changed (`classify_schedule_category(...)` → `classify_new_task(event_date=payload.date, created_at=created_at)`). `created_at = datetime.now(timezone.utc)` (one server instant, reused for storage), `_validate_member_key`, leave-conflict check, `source_scope=DEFAULT_SOURCE_SCOPE`, `is_official_truth=False` — all unchanged.

## Preserved / Changed Update Flow

Confirmed by diff:
- **Removed:** the `if "category" in update_data and update_data["category"] != event.category: raise HTTPException(422, ...)` immutability lock.
- **Added:** after all editable fields (`date`/`title`/`priority`/`start`/`end`/`notes`) are assigned to `event`, one authoritative `updated_at = datetime.now(timezone.utc)` is generated and `event.category = classify_updated_task(...)` is assigned, then `event.updated_at = updated_at`.
- **Unchanged:** the leave-conflict check (`find_conflicting_active_leave`) still runs *before* any field is touched and still returns a 409 with zero mutation on conflict — this is the mechanism that satisfies "failed update: fields and category unchanged" and "leave-conflict rejection: fields and category unchanged" (STEP 11 items 12–13), verified by code inspection (the `if conflicts: return JSONResponse(...)` early-return sits before every `event.<field> = ...` line) rather than an executed DB test, per this session's confirmed no-direct-DB-access limitation (see `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7). Drag and resize are unchanged at the frontend/routing level — both still call the same `PUT` handler via `commitItemTimeChange`; only the payload's `category` key was removed, which the backend never read anyway on that path.

## Existing-Data Protection

- **No migration, no bulk UPDATE.** `git diff -- database/ database/migrations/` is empty — confirmed below.
- **GET/list, Schedule Summary aggregation, and report generation never call either classification function.** `_aggregate_schedule_period` and `_duration_change` were both grepped (`test_38_39_aggregate_helper_does_not_call_classifier`, updated to check for `classify_new_task(`/`classify_updated_task(` instead of the retired name) — zero call sites. A historical row's category only ever changes when that specific row goes through `update_member_schedule_event` and is successfully saved.
- **Protected folder untouched:** `member-aios/mayurika-hr/staff-data/` was not read for modification, staged, or committed at any point (confirmed by `git status`/`git diff` before and after every commit in this task).

## Database Impact

**None.** `database/member_schedule_events_schema.sql` and everything under `database/migrations/` are unchanged (empty diff, confirmed below). The existing `category IN ('Scheduled Task', 'Unscheduled Task')` CHECK constraint is untouched and still fully sufficient — this rule change alters which value gets *chosen* and *when it can change*, never what values are *allowed*.

## Tests Executed

`python -m unittest discover -s backend/tests -v` — **198 tests, 198 passed, 0 failed, 0 skipped.** (Full backend suite: `test_member_leave.py`, `test_schedule_classification.py`, `test_schedule_duration_reports.py`, `test_task_leave_overlap.py`.)

`node --check web-view/js/calendar/instance.js` and `node --check web-view/js/calendar/core.js` — both pass, plus a full sweep of every `web-view/js/**/*.js` file — all pass.

All required creation-classification scenarios (STEP 10) are covered in `ClassifyNewTaskTests` (`backend/tests/test_schedule_classification.py`):

| # | Scenario | Test method | Result |
|---|---|---|---|
| 1 | Previous Sunday 23:59:58 | `test_1_sunday_23_59_58_colombo_is_scheduled` | Scheduled — PASS |
| 2 | Previous Sunday 23:59:59 | `test_2_sunday_23_59_59_colombo_is_unscheduled` | Unscheduled — PASS |
| 3 | Monday 00:00:00 | `test_3_monday_00_00_00_colombo_is_unscheduled` | Unscheduled — PASS |
| 4 | Event on target week's Sunday, created before cutoff | `test_4_event_on_weeks_sunday_created_before_cutoff_is_scheduled` | Scheduled — PASS |
| 5 | Same-week task creation | `test_5_same_week_creation_is_unscheduled` | Unscheduled — PASS |
| 6 | Future-week creation before that week's cutoff | `test_6_future_week_creation_before_its_cutoff_is_scheduled` | Scheduled — PASS |
| 7 | Untimed task | `test_7_untimed_task_uses_the_same_rule` | Same rule, no separate branch — PASS |
| 8 | Client sends Scheduled after cutoff | `test_8_requesting_scheduled_after_cutoff_has_no_effect` | Unscheduled (request ignored) — PASS |
| 9 | Client sends Unscheduled before cutoff | `test_9_requesting_unscheduled_before_cutoff_has_no_effect` | Scheduled (request ignored) — PASS |

All required update-classification scenarios (STEP 11, items 1–11 and 14; items 12–13 covered by code inspection per the note above) are covered in `ClassifyUpdatedTaskTests`:

| # | Scenario | Test method | Result |
|---|---|---|---|
| 1 | Title changed before cutoff | `test_1_change_before_cutoff_stays_scheduled` | Scheduled — PASS |
| 2 | Title changed at cutoff | `test_2_change_at_cutoff_becomes_unscheduled` | Unscheduled — PASS |
| 3–8 | Notes/priority/start/end/drag/resize after cutoff | `test_3`…`test_8` | Unscheduled — PASS (function is field-agnostic; one call per required scenario) |
| 9 | Date changed to another week | `test_9_date_changed_to_another_week_uses_resulting_week_cutoff` + `test_9b_...` | Evaluated against resulting week's cutoff, both sides — PASS |
| 10 | Unscheduled moved to future week | `test_10_unscheduled_moved_to_future_week_remains_unscheduled` | Unscheduled — PASS |
| 11 | Unscheduled edited before future cutoff | `test_11_unscheduled_edited_before_future_cutoff_remains_unscheduled` | Unscheduled — PASS |
| 14 | Repeated updates never restore Scheduled | `test_14_repeated_updates_never_restore_scheduled` | Unscheduled, both calls — PASS |

**Unaffected coverage kept/adjusted, confirmed no weakening:** `GetTargetWeekStartTests` and `GetPrecedingSundayCutoffTests` (new, direct helper coverage), `PercentageTests` (4 tests, unchanged), `CreateSchemaCategoryTests` (rewritten to prove `category` is optional/ignored rather than enum-validated — the previous rejection tests no longer apply since the field is intentionally non-authoritative now), `TitleLengthLimitTests` (unchanged). `test_schedule_duration_reports.py`'s `test_38_39_aggregate_helper_does_not_call_classifier` was updated to assert against the new function names (it would have trivially, meaninglessly passed against the retired name otherwise).

## Deployment and Live API Validation (STEPs 18–20)

Commits `5c1c508` ("Apply automatic weekly classification to task changes") and `6553150` ("Remove manual task-category selection") pushed to `origin/main` (`a02c85b..6553150`).

- **Backend** (`https://management-aios-api.vercel.app/health`) — HTTP 200, `{"status":"ok",...}`.
- **Frontend** (`https://management-aios.vercel.app/`) — HTTP 200; deployed `js/calendar/instance.js` independently fetched and confirmed to contain `msc-field-category-note` and zero occurrences of `fieldCategory`/`msc-field-category-helper`.

Live API validation was run against the deployed backend using disposable `dashboard_testing` records under the `rajiv` member key, with an identifiable `WEEKLYCUTOFF-TEST-` title prefix. The actual Asia/Colombo "now" at execution time (2026-07-22, Wednesday, ~14:50 Colombo) was independently computed via a `zoneinfo` script immediately before constructing test payloads. All 7 scenarios were exercised as real HTTP requests against the live, deployed classifier (not a mock):

| # | Scenario | Request | Live result | Expected | Match |
|---|---|---|---|---|---|
| A | Create, future week (27 Jul, next Mon), before that week's cutoff, requests Scheduled | `POST` date=2026-07-27, category=Scheduled Task | `"category":"Scheduled Task"` | Scheduled | YES |
| B | Create, future week (28 Jul), before cutoff, requests Unscheduled (manipulated) | `POST` date=2026-07-28, category=Unscheduled Task | `"category":"Scheduled Task"` | Scheduled (request ignored) | YES |
| C | Create, current week (24 Jul), already past this week's cutoff (19 Jul) | `POST` date=2026-07-24, category=Scheduled Task | `"category":"Unscheduled Task"` | Unscheduled (request ignored) | YES |
| D | Update: move A's Scheduled task into the current, past-cutoff week | `PUT` date=2026-07-23 (title/category unsent) | `"category":"Unscheduled Task"` | Unscheduled (resulting week's cutoff applied) | YES |
| E | Update: move D's now-Unscheduled task to a future week (10 Aug) | `PUT` date=2026-08-10 | `"category":"Unscheduled Task"` | Unscheduled (one-way, never restored) | YES |
| F | Update: title-only edit on C's Unscheduled task, client sends manipulated category=Scheduled | `PUT` title=renamed, category=Scheduled Task | `"category":"Unscheduled Task"` | Unscheduled (request ignored) | YES |
| G | Update: title-only edit on B's Scheduled task, still before its own future cutoff | `PUT` title=renamed (category unsent) | `"category":"Scheduled Task"` | Scheduled (retained) | YES |

**7/7 live scenarios matched the expected result exactly**, confirming the deployed code (not just local unit tests) implements the weekly cutoff, the resulting-event-week rule, the one-way guarantee, and the ignored-manipulated-category rule.

## Cleanup

All 3 records created during live validation (A, B, C — D/E reused A's id; F reused C's id; G reused B's id) were deleted individually by their returned `id` via `DELETE /api/member-schedules/rajiv/{event_id}` (HTTP 200, `"deleted":true` for each) — **not** via the bulk `clear-testing-data` endpoint, to avoid deleting any pre-existing `dashboard_testing` rows Rajiv's calendar may already legitimately contain. A post-cleanup `GET` across the full test date range (2026-07-01 to 2026-08-31) confirmed zero remaining records matching the `WEEKLYCUTOFF-TEST` title prefix. No existing user record was read, updated, or deleted at any point.

## Real-Browser Validation — Not Performed (Known Limit)

STEP 18's interactive checks (click through the Create/Edit forms, drag a Scheduled task after cutoff, resize a Scheduled task after cutoff, confirm no console errors) require a real browser-automation tool, which is not available in this session — the same limitation prior sessions in this repo have documented (e.g. `handover/2026-07-16__leave-coordination-ui-polish-closure.md`: *"this session could not perform that check directly (no browser-automation tool available)"*).

What this validation substitutes, and why it is equivalent for the parts that matter functionally:
- Drag and resize both call `commitItemTimeChange`, which sends the exact same `PUT` request shape (date/title/priority/start/end/notes, no category) as an Edit-form save — the backend cannot distinguish a drag from a form save. Live scenario D above (a `PUT` changing only `date`) exercises that identical code path and confirms the reclassification result.
- The DOM/CSS changes (removing one `<label>`/`<select>` block, adding one `<p>` note) were verified via `node --check`, a full-file diff read, and a live fetch of the deployed `instance.js` confirming the new markup string and the absence of every removed selector/variable reference — not executed in a live DOM.
- Category legend colors, `CATEGORY_CLASS` mapping, and `calendar.css` were not touched by this change (confirmed by diff) — no new visual regression surface was introduced.

**Recommendation:** a human (Mayurika, Arun, or Rajiv) should do a quick manual pass on `https://management-aios.vercel.app/` — create a Task, drag a Scheduled Task past its week's cutoff, and confirm it turns yellow — the first time this is convenient, since no session in this repo's history has had a browser-automation tool available to do this directly.

## Known Limits

- Real-browser interactive validation not performed — see above.
- STEP 11 items 12 (failed update) and 13 (leave-conflict rejection) are verified by code inspection (the conflict/validation-failure paths return before any field or category assignment) rather than an executed integration test, consistent with this session's no-direct-DB-access limitation. The underlying leave-conflict mechanism itself (`find_conflicting_active_leave`) is unchanged and already covered by `backend/tests/test_task_leave_overlap.py`'s existing, unaffected test suite.
- No independent live row-count re-confirmation of pre-existing historical rows was performed (not required per instruction; the code-level guarantee in "Existing-Data Protection" — no read path calls either classifier — is the operative safeguard, and this task performed no migration or bulk update of any kind).

## PASS / FAIL

**PASS.** 198/198 backend unit tests pass; the new rule matches every confirmed detail and boundary example; the update flow now reclassifies on every successful save while the conflict/failure paths are provably untouched; no database file or migration was modified; the manual category selector is removed from both forms while Task Details/legend/colors are preserved; commits `5c1c508`/`6553150` are deployed and both frontend and backend respond HTTP 200; and 7/7 live API scenarios against the deployed production backend matched the expected result exactly, with all disposable test records cleaned up and zero existing data touched.

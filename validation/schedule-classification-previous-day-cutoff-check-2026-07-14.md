---
name: schedule-classification-previous-day-cutoff-check
type: validation
created: 2026-07-14
status: PASS — 24/24 unit tests pass; commit 8b04476 deployed and confirmed; 7/7 live API scenarios confirmed against production; test records cleaned up
source-boundary: backend/routers/member_schedules.py, backend/tests/test_schedule_classification.py only. web-view/index.html, database/member_schedule_events_schema.sql, database/migrations/, historical validation/handover files — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Schedule Classification — Previous-Day Cutoff Rule — Check — 2026-07-14

**Requirement:** Replace the existing planned-start-time classification rule with an approved previous-day cutoff rule: a task may only be `Scheduled Task` if it is created, in Asia/Colombo local time, on a calendar day strictly before its `event_date`. Applies identically to timed and untimed tasks. No migration, no historical recalculation, no schema change.

**This validation supersedes the previous rule for future task creation only.** It does not retroactively apply to, alter, or invalidate the 145 existing rows, which were validated under and remain governed by the previous rule as recorded in `validation/schedule-task-classification-check-2026-07-14.md` (left unedited).

---

## Previous Rule (superseded — historical description, not edited at its source)

Read directly from `backend/routers/member_schedules.py` (pre-change) before implementing:

- `classify_schedule_category(requested_category, event_date, start_time, created_at)` took 4 parameters, including `start_time`.
- Manual `"Unscheduled Task"` request returned `"Unscheduled Task"` immediately — unchanged by this work.
- If `start_time is None` (untimed task), the function returned the requested category unchanged, unconditionally — untimed tasks were **never** auto-classified as late under the old rule. This bypass branch is what the new rule removes.
- If `start_time` was present, the function composed `event_date + start_time` as an Asia/Colombo local datetime, converted it to a UTC instant (`planned_start_instant`), and compared it against `created_at` (already UTC): `created_at <= planned_start_instant` honored the request; `created_at > planned_start_instant` forced `"Unscheduled Task"`. The comparison was inclusive, so creating a task at the exact planned start instant could still be `Scheduled Task`.

This is documented here as the superseded rule for context; `validation/schedule-task-classification-check-2026-07-14.md` and `handover/2026-07-14__schedule-task-classification-closure.md` remain the authoritative historical record of that rule's original implementation and are unedited by this work.

## New Rule (this change)

`classify_schedule_category(requested_category, event_date, created_at)` — `start_time` removed from the signature entirely (see "Function Signature Decision" below).

```python
if requested_category == "Unscheduled Task":
    return "Unscheduled Task"

created_local_date = created_at.astimezone(_COLOMBO).date()

if created_local_date < event_date:
    return requested_category

return "Unscheduled Task"
```

## Exact Comparison

`created_at.astimezone(_COLOMBO).date() < event_date` — a plain calendar-date comparison, not an instant comparison. `_COLOMBO = ZoneInfo("Asia/Colombo")` (unchanged constant, already present in the file). No explicit `23:59:59`-style timestamp is constructed anywhere, and no seconds/microsecond boundary exists in the logic — every instant from `00:00:00.000000` through `23:59:59.999999` on the day before `event_date` produces the identical `created_local_date` value, so there is nothing for a sub-second edge case to get wrong.

## Asia/Colombo Handling

`created_at` is always a UTC-aware `datetime` (`datetime.now(timezone.utc)`, generated once in `create_member_schedule_event` and reused for both classification and the stored `created_at`/`updated_at` columns — unchanged by this work). `.astimezone(_COLOMBO)` converts that UTC instant to its Asia/Colombo wall-clock equivalent before `.date()` extracts the calendar date — this is timezone-aware throughout; no naive datetime is ever constructed or compared.

## Boundary Examples (hand-computed and independently verified via a Python/`zoneinfo` script before writing the tests — see "Tests Executed")

Asia/Colombo is a fixed UTC+05:30 offset with no DST.

| Colombo local time | UTC equivalent | Colombo date vs event_date (15 Jul) | Result |
|---|---|---|---|
| 14 Jul 23:58:00 | 14 Jul 18:28:00 | 14 Jul < 15 Jul | Scheduled |
| 14 Jul 23:59:00 | 14 Jul 18:29:00 | 14 Jul < 15 Jul | Scheduled |
| 14 Jul 23:59:59.999999 | 14 Jul 18:29:59.999999 | 14 Jul < 15 Jul | Scheduled |
| 15 Jul 00:00:00.000000 | 14 Jul 18:30:00 | 15 Jul == 15 Jul (not <) | Unscheduled |
| 15 Jul 09:00:00 | 15 Jul 03:30:00 | 15 Jul == 15 Jul | Unscheduled |

The 14 Jul 18:30 UTC / 15 Jul 00:00 Colombo row is the sharpest proof point: it is still 14 Jul in UTC, but the Colombo-aware comparison correctly places it on 15 Jul, matching the approved rule's exact midnight boundary.

## Timed/Untimed Result

Identical for both. `start_time` is not a parameter of `classify_schedule_category` anymore, so there is no code path that treats a timed task differently from an untimed one — both are classified purely from `event_date` and `created_at`. Test #10/#11 (see matrix) exist specifically to document this rather than to exercise different code, since there is no longer a separate branch to exercise.

## Manual Category Decision Table

| Timing (Asia/Colombo) | Requested | Stored |
|---|---|---|
| Before event_date | Scheduled Task | Scheduled Task |
| Before event_date | Unscheduled Task | Unscheduled Task |
| On/after event_date | Scheduled Task | Unscheduled Task (forced) |
| On/after event_date | Unscheduled Task | Unscheduled Task |

Matches the approved rule exactly (details 5–6). The manual-Unscheduled-always-wins early exit (`if requested_category == "Unscheduled Task": return "Unscheduled Task"`) was already present in the superseded rule and required no change — confirmed by diff.

## Function Signature Decision

**Option B chosen: `start_time` removed from `classify_schedule_category`'s signature entirely** (not kept-but-unused).

Reasoning: a repo-wide search for `classify_schedule_category` confirmed exactly **one production call site** (`create_member_schedule_event`, `member_schedules.py`) and the only other reference is the test file's direct import for unit testing — no external package or module outside this repository imports or calls this function. With a single call site fully under this change's control, keeping a permanently-unused `start_time` parameter would only invite a future reader to wonder whether it still does something. Removing it, and updating the one call site and all tests accordingly, is the smaller and clearer change. The now-unused `time as time_type` import in `member_schedules.py` was also removed as a direct, mechanical consequence of the parameter removal (confirmed via grep — zero other uses of `time_type` remained in the file).

## Docstring

Rewritten (see `classify_schedule_category` in `backend/routers/member_schedules.py`) to state in order: classification happens exactly once, at creation, and is never re-run by GET/PUT/drag/resize; requesting Unscheduled always stays Unscheduled; the Asia/Colombo calendar date of `created_at` is compared against `event_date`; before `event_date` honors the request, on/after `event_date` forces Unscheduled; `start_time`/`end_time` play no part; later edits (event_date, title, priority, notes, start_time, end_time) and drag/drop/resize never call this function again.

## Preserved Create Flow

Confirmed by diff — the only change inside `create_member_schedule_event` is dropping the now-removed `start_time=payload.start` keyword argument from the `classify_schedule_category(...)` call. Everything else is untouched:
- `created_at = datetime.now(timezone.utc)` — one server-generated UTC instant, still used for both classification and storage (`created_at`/`updated_at` columns).
- The classified `category` is still stored directly on the new `MemberScheduleEvent` row and returned in the API response, unchanged.
- `_validate_member_key(member_key)` — unchanged.
- `source_scope=DEFAULT_SOURCE_SCOPE`, `is_official_truth=False` — unchanged, still server-forced.

## Preserved Update Flow

Confirmed by diff — **zero lines changed** inside `update_member_schedule_event`:
- The category-immutability check (`if "category" in update_data and update_data["category"] != event.category: raise HTTPException(422, ...)`) is untouched — category changes still return HTTP 422.
- `event.event_date = update_data["date"]` is a direct field assignment with no call into `classify_schedule_category` — event_date edits do not reclassify.
- Drag/drop and resize both route through this same `PUT` handler resending `start`/`end` only (per the frontend's `commitItemTimeChange`) — no reclassification path exists for either.
- Category remains permanent — confirmed unchanged.

## Existing-Data Protection

- **145 existing rows: unchanged.** No `UPDATE` statement was written or executed. No migration script was created. The last independently-confirmed row count (145: 130 active / 15 soft-deleted) is from `handover/2026-07-14__schedule-task-classification-closure.md`'s post-migration confirmation — that record is unedited by this work.
- **Historical validation files not edited:** `validation/schedule-task-classification-check-2026-07-14.md` and `handover/2026-07-14__schedule-task-classification-closure.md` — confirmed unmodified by this change's diff (neither file appears in `git status`/`git diff` for this work).
- From the code diff alone: the only place `classify_schedule_category` is invoked is inside `create_member_schedule_event` (a `POST` handler). No `GET`, `PUT`, or `DELETE` route calls it, and it was never wired into any batch/migration script. This means the rule change can only ever affect rows created by a **future** `POST` request — it is structurally impossible for this change, by itself, to touch a single existing row.

## Database Impact

**None.** Confirmed unchanged: `database/member_schedule_events_schema.sql`, everything under `database/migrations/`. The existing CHECK constraint (`category IN ('Scheduled Task', 'Unscheduled Task')`) restricts only the two allowed *values* and is untouched and still fully sufficient — this rule change alters which value gets *chosen*, never what values are *allowed*. No new column, index, or trigger was added or is needed; a database trigger duplicating this backend logic was explicitly not proposed, per instruction.

## Frontend Impact

**None.** Confirmed unchanged: `web-view/index.html` (not in this change's diff at all). The frontend already only submits a requested category and trusts the API's returned value (confirmed in the discovery pass preceding this implementation) — no local cutoff prediction exists in JavaScript to update, and none was added. The create form continues to allow both category choices, the edit form continues to disable the category field with its existing helper text, and the API response remains the authoritative displayed value.

## Tests Executed

`python -m unittest backend.tests.test_schedule_classification -v` — **24 tests, 24 passed, 0 failed, 0 skipped, 0 warnings.**

`python -m unittest discover -s backend/tests -v` (broader backend suite) — same 24 tests discovered and run (this is the only test module in `backend/tests/`); identical result: **24 passed, 0 failed, 0 skipped.**

`python -c "import backend.main"` — sanity check that the full FastAPI app still imports cleanly after the change; passed with no error.

All 16 required classification scenarios are covered in `ClassifyScheduleCategoryTests` (`backend/tests/test_schedule_classification.py`), numbered `test_1_`…`test_16_` matching the task's own numbering:

| # | Scenario | Test method | Result |
|---|---|---|---|
| 1 | Event 15 Jul, created 14 Jul 11:58 PM Colombo | `test_1_before_cutoff_11_58pm_scheduled_selected_stays_scheduled` | Scheduled — PASS |
| 2 | Event 15 Jul, created 14 Jul 11:59 PM Colombo | `test_2_before_cutoff_11_59pm_scheduled_selected_stays_scheduled` | Scheduled — PASS |
| 3 | Event 15 Jul, created 14 Jul 11:59:59.999999 PM Colombo | `test_3_last_microsecond_of_previous_day_still_scheduled` | Scheduled — PASS |
| 4 | Event 15 Jul, created 15 Jul 12:00 AM Colombo | `test_4_first_instant_of_event_date_is_unscheduled` | Unscheduled — PASS |
| 5 | Event 15 Jul, created 15 Jul 9:00 AM Colombo | `test_5_same_day_morning_creation_is_unscheduled` | Unscheduled — PASS |
| 6 | Event created 2+ days early | `test_6_created_multiple_days_early_stays_scheduled` | Scheduled — PASS |
| 7 | Early manual Unscheduled | `test_7_early_manual_unscheduled_selection_honored` | Unscheduled — PASS |
| 8 | Event-day manual Scheduled | `test_8_event_day_manual_scheduled_forced_unscheduled` | Forced Unscheduled — PASS |
| 9 | Event-day manual Unscheduled | `test_9_event_day_manual_unscheduled_stays_unscheduled` | Unscheduled — PASS |
| 10 | Untimed task created previous day | `test_10_untimed_task_created_previous_day_scheduled` | Scheduled — PASS |
| 11 | Untimed task created on event_date | `test_11_untimed_task_created_on_event_date_unscheduled` | Unscheduled — PASS |
| 12 | Monday event, created Sunday before midnight | `test_12_monday_event_created_sunday_before_midnight_scheduled` | Scheduled — PASS |
| 13 | Sunday event, created Saturday before midnight | `test_13_sunday_event_created_saturday_before_midnight_scheduled` | Scheduled — PASS |
| 14 | Public-holiday-labelled date, no exception | `test_14_public_holiday_event_date_gets_no_special_exception` | Same rule both sides of boundary — PASS |
| 15 | UTC instant converts to correct Colombo date | `test_15_utc_instant_converts_to_correct_colombo_date` | PASS |
| 16 | UTC-previous-day-but-Colombo-event-date instant | `test_16_utc_previous_day_but_colombo_event_date_is_unscheduled` | Unscheduled — PASS |

Weekday claims for #12/#13 were independently verified (`date(2026,7,20).strftime('%A')` → Monday; `date(2026,7,19)` → Sunday; `date(2026,7,18)` → Saturday) before being written into the tests, not assumed. All UTC↔Colombo hand-computed values in the table above were separately verified with a `zoneinfo`-based script before being encoded into test literals, to avoid embedding an arithmetic error into the test suite itself.

**Unaffected coverage kept as-is (confirmed no change needed):** `PercentageTests` (4 tests) and `CreateSchemaCategoryTests` (4 tests) — neither touches classification timing logic; category immutability, invalid-category rejection, and daily/weekly percentage math were not weakened.

## Deployment and Live API Validation (Steps 19–20)

Commit `8b04476` ("Update schedule classification cutoff rule") pushed to `origin/main` (`6ce6ca2..8b04476`).

- **Backend** (`https://management-aios-api.vercel.app/health`) — HTTP 200, `{"status":"ok",...}`.
- **Frontend** (`https://management-aios.vercel.app/`) — HTTP 200 (no frontend change expected or made).

Live API validation was run against the deployed backend using disposable `dashboard_testing` records under the `rajiv` member key. The actual Asia/Colombo "today" at execution time (2026-07-14) was independently computed via a `zoneinfo` script immediately before constructing test payloads, rather than assumed, to avoid a timing-drift error. All 7 required scenarios were exercised as real HTTP requests against the live, deployed classifier (not a mock):

| # | Scenario | Request | Live result | Expected | Match |
|---|---|---|---|---|---|
| 1 | Future-date event, requested Scheduled | `POST` date=2026-07-24, category=Scheduled Task | `"category":"Scheduled Task"` | Scheduled | YES |
| 2 | Same-day event, requested Scheduled | `POST` date=2026-07-14, category=Scheduled Task | `"category":"Unscheduled Task"` | Unscheduled | YES |
| 3 | Future-date event, requested Unscheduled | `POST` date=2026-07-24, category=Unscheduled Task | `"category":"Unscheduled Task"` | Unscheduled | YES |
| 4 | Same-day untimed event, requested Scheduled | `POST` date=2026-07-14, no start/end, category=Scheduled Task | `"category":"Unscheduled Task"` | Unscheduled | YES |
| 5 | Future untimed event, requested Scheduled | `POST` date=2026-07-24, no start/end, category=Scheduled Task | `"category":"Scheduled Task"` | Scheduled | YES |
| 6 | PUT category-change attempt (on #1's Scheduled row, to Unscheduled) | `PUT` category=Unscheduled Task | HTTP 422, `{"detail":"Task category is permanent after creation."}` | 422 | YES |
| 7 | Date edit (on #3's Unscheduled row) | `PUT` date=2026-07-25 (no category field sent) | Response `"category":"Unscheduled Task"` (unchanged) | Original category retained | YES |

**7/7 live scenarios matched the expected result exactly**, confirming the deployed code (not just the local unit tests) behaves per the approved rule.

As anticipated in Known Limits below, exact-midnight (11:59 PM / 12:00 AM) boundary timing could not be reproduced live, since the server — not the caller — generates `created_at`; that boundary is covered by unit tests #1–#4 instead (§ Tests Executed), which do control the instant precisely.

## Cleanup

All 5 records created during live validation were deleted individually by their returned `id` via `DELETE /api/member-schedules/rajiv/{event_id}` (HTTP 200, `"deleted":true` for each) — **not** via the bulk `clear-testing-data` endpoint, specifically to avoid deleting any pre-existing `dashboard_testing` rows Rajiv's calendar may already legitimately contain from real use. A post-cleanup `GET` on the same member confirmed zero remaining records matching the `CUTOFF-TEST` title prefix used for these records. No existing user record was read, updated, or deleted at any point.

## Known Limits

- Live boundary timing (e.g. creating a real row at exactly 12:00:00 AM Asia/Colombo via the live API) cannot be reproduced through the deployed API, since the server — not the test caller — generates `created_at`. Per instruction, this is covered by the deterministic unit tests above instead, and the live API validation (Step 20, appended below) covers functional correctness (category is right on ordinary future-dated and same-day creates) rather than exact-midnight timing.
- No independent live row-count re-confirmation of the 145 existing rows was performed as part of this validation pass (not required per instruction; the code-level guarantee in "Existing-Data Protection" above — no route other than `POST` ever calls the classifier — is the operative safeguard).

## PASS / FAIL

**PASS.** 24/24 unit tests pass; the new rule matches every confirmed detail and boundary example; the update flow and immutability lock are provably untouched; no database or frontend file was modified; the 145 existing rows are provably unreachable by this change; commit `8b04476` is deployed and both frontend and backend respond HTTP 200; and 7/7 live API scenarios against the deployed production backend matched the expected result exactly, with all disposable test records cleaned up and zero existing user records touched.

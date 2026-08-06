---
Project Name: Review Summary No-Delete and Same-Day Edit Lock
Start Date: 2026-08-06
Expected Deadline: 2026-08-06
User / Stakeholder: Mareenraj (builder), Management Team (reviewers)
Company Value Contribution: See requirement doc §1
MVP Submission Date: 2026-08-06
Project Owner: Mareenraj
Status: Implemented
---

# Review Summary No-Delete and Same-Day Edit Lock — Technical Design — 2026-08-06

**Requirement ID:** REQ-CAL-REV-LOCK-004. Requirement doc: `docs/2026-08-06_review-summary-no-delete-same-day-edit-requirement.md`.

## 1. Time authority

`created_at` (`StaffReviewSummary.created_at`, `TIMESTAMP WITH TIME ZONE` / `DateTime(timezone=True)`, unchanged) is written once at creation as `datetime.now(timezone.utc)` and never touched again. The authoritative "now" for every eligibility check is always `datetime.now(timezone.utc)` at request time on the backend — never a client-supplied value, never `meeting_date`.

Two new pure functions, `backend/routers/staff_review_summaries.py`:

```python
def _can_edit_review_summary(created_at: datetime, today: Optional[date] = None) -> bool:
    if today is None:
        today = colombo_today()
    return colombo_date_of(created_at) == today

def _review_summary_edit_deadline(created_at: datetime) -> datetime:
    creation_date = colombo_date_of(created_at)
    return datetime.combine(creation_date, time(23, 59, 59), tzinfo=_COLOMBO)
```

`colombo_date_of()` is new, added to `backend/time_utils.py` (the module that already owns `colombo_today()`), converting an aware-or-assumed-UTC datetime to its Asia/Colombo calendar date. `_can_edit_review_summary`'s `today` parameter is optional and injectable — the same pattern `time_utils.derive_task_outcome()` already established for the Task Outcome feature — so boundary tests never depend on the real wall clock.

The rule reduces to one calendar-date equality check: `colombo_date_of(created_at) == today`. No manual `23:59:59` string comparison is needed for enforcement — that arithmetic is used only for the informational `edit_deadline` field. A future/anomalous `created_at` fails closed automatically: `today` can never equal a later date, so `_can_edit_review_summary` returns `False` with no special-case branch.

## 2. UPDATE route

`PUT /api/staff-review-summaries/{summary_id}` — unchanged owner-only 404 gate (`_get_owned_summary_or_404`) runs first; a cross-reviewer or nonexistent id is still a non-disclosing 404. Only once ownership is confirmed does the new day-lock check run:

```python
record = _get_owned_summary_or_404(db, summary_id, acting_member)
if not _can_edit_review_summary(record.created_at):
    return JSONResponse(status_code=409, content={
        "error": "review_summary_edit_locked",
        "message": "Editing period ended. This review summary is now read-only.",
    })
```

`StaffReviewSummaryUpdate` (unchanged) has no `reviewer_member_key`/`created_at`/deadline fields — there is nothing for a request body to spoof; the schema itself is the enforcement for those three items.

## 3. DELETE route

`DELETE /api/staff-review-summaries/{summary_id}` — the approved rule is a blanket prohibition, not an ownership rule, so the handler rejects every authenticated caller identically, unconditionally, before any database lookup:

```python
@router.delete("/{summary_id}", status_code=409)
def delete_staff_review_summary(summary_id, response, acting_member=Depends(get_verified_member)):
    _set_no_store(response)
    return JSONResponse(status_code=409, content={
        "error": "review_summary_delete_disabled",
        "message": "Review summaries can't be deleted. This record is permanent.",
    })
```

`Depends(get_verified_member)` still gates the route — a missing/invalid token is still 401. The route is kept (not removed) purely for URL/API compatibility. 409 mirrors this codebase's own established convention for "mutation permanently blocked by a business rule" — see `backend/routers/member_schedules.py`'s `delete_member_schedule_event` (`409 outcome_recorded_immutable`), the direct precedent. No `db` dependency, no query, no `deleted_at` write, no `db.commit()` — the function has no way to mutate a row even by accident.

## 4. Derived `can_edit`/`edit_deadline` response fields

`StaffReviewSummaryOut` (`backend/schemas.py`) gains two additive, backward-compatible fields:

```python
can_edit: bool = False
edit_deadline: Optional[datetime] = None
```

Computed in `_to_out()` (now takes `acting_member` as a third parameter, alongside the existing `record`/`db`):

```python
is_owner = record.reviewer_member_key == acting_member
can_edit=is_owner and _can_edit_review_summary(record.created_at),
edit_deadline=_review_summary_edit_deadline(record.created_at),
```

Every read route (create/list/detail) reuses this same `_to_out()`, so the displayed `can_edit` and the UPDATE route's own enforcement can never disagree — both call the identical `_can_edit_review_summary`. A non-owner reading a shared record always gets `can_edit=False`. No column is added to `staff_review_summaries` — both fields are computed fresh on every read, never persisted.

## 5. Frontend

`web-view/js/review-summaries.js` — the backend is authoritative; this module never recomputes eligibility from a browser clock, it only reads `record.can_edit`:

- **Delete removed entirely** — no button, no `confirmDestructive()` call, no DELETE fetch anywhere in the module (the import itself was removed, not just its usage).
- **Edit rendering**, per owned card (`isOwnedRecord` unchanged): `record.can_edit === true` → "Editable until 11:59 PM today." status line + Edit button; `record.can_edit === false` → "Editing period ended. This review summary is now read-only." status line, no Edit button. A non-owned card gets neither line — unchanged read-only rendering.
- **Locked-response handling**: if a PUT still somehow returns `409 review_summary_edit_locked` (window closed between render and submit — e.g. the form was left open across the Colombo midnight boundary), the form's `.catch` calls `exitEditMode()` and `renderHistory()`, so the UI never gets stuck mid-edit against a record it can no longer save.
- `web-view/js/ui/error-mapper.js` gained two `KNOWN_ERRORS` entries (`review_summary_edit_locked`, `review_summary_delete_disabled`), and `reviewSummariesApiRequest()`'s error branch now reads the response body's own `error` field for these two codes — the same convention `calendar/instance.js`'s `apiRequest` already uses for `outcome_locked`/`outcome_recorded_immutable` — rather than only ever falling back to a generic HTTP-status classification.

## 6. Database/schema impact

Zero. `backend/models.py` is unmodified — confirmed by `git diff --stat -- backend/models.py database/` returning no output. `can_edit`/`edit_deadline` are response-layer-only, computed on every read from already-stored columns (`reviewer_member_key`, `created_at`) plus the request's own authenticated identity and the backend clock.

## 7. Existing-record treatment

No migration, no backfill, no bulk update. The rule is derived fresh on every read/write, so an existing record created before "today" is automatically and immediately locked the next time anyone evaluates it — no code path exists that could leave a stale, un-migrated record editable past its own day. Existing soft-deleted rows are untouched and remain hidden (`deleted_at IS NOT NULL` is still excluded everywhere it already was) — this feature never restores one.

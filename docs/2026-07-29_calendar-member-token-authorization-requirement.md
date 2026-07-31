---
name: calendar-member-token-authorization-requirement
type: requirement-document
created: 2026-07-29
created-by: Mareenraj (builder)
status: Implemented on feature branch feat/calendar-member-token-authorization; not deployed; pending reviewer sign-off
requirement-id: REQ-CALENDAR-AUTH-001
---

# Requirement — Calendar Member-Token Authorization (2026-07-29)

## Metadata (per CLAUDE.md §11.3 — Requirement Documentation Governance)

| Field | Value |
|---|---|
| Project Name | Calendar Member-Token Authorization |
| Start Date | 2026-07-29 |
| Expected Deadline | Not yet set — pending reviewer sign-off |
| User / Stakeholder | Mayurika, Suman, Arun, Rajiv, Paraparan — the five calendar members |
| Company Value Contribution | Closes the previously undocumented gap (see `validation/staff-data-source-storage-discovery-check-2026-07-13.md` and the 2026-07-29 read-only discovery session) that any member could mutate any other member's Calendar Tasks/Leave; addresses the management file/decision disorganization and management-gap-detection domains named in CLAUDE.md §1/§4 |
| MVP Submission Date | Not yet set |
| Project Owner | Mareenraj (builder) |
| Status | Implemented on feature branch; backend + frontend + tests complete; not deployed this session; pending reviewer sign-off (see §18 routing below) |

## 1. Background

A 2026-07-29 read-only discovery session found that the Calendar backend (`backend/routers/member_schedules.py`, `backend/routers/member_leave.py`) had no authentication or authorization of any kind — every Task/Leave mutation derived its "acting member" from the client-controlled `{member_key}` URL path segment, so any browser could mutate any of the five members' Tasks or Leave. This is documented pre-existing behavior, not a new regression (see `backend/README.md` "Public, unauthenticated API — known limitation").

## 2. Approved requirement

- Everyone may continue viewing all Calendar data and existing read-only reports without a token.
- Creating, updating, deleting, dragging/resizing, changing Task outcomes, clearing testing data, and managing Leave all require a valid member token.
- Five separate member tokens exist — one per calendar member (`mayurika`, `suman`, `arun`, `rajiv`, `paraparan`).
- A member enters their token once per browser profile; the frontend stores it after successful backend verification and reuses it automatically on every later mutation.
- The backend validates the complete token on every mutation — the acting member is derived from the token, never from the URL or any client-supplied field.
- A member token may mutate only that same member's own records — there is no cross-member override (no admin/coordinator/HR/manager bypass has been approved).
- No database migration and no PostgreSQL Row-Level Security are required for this requirement.

## 3. Usability contract (token re-entry conditions)

The token is requested again only when: no saved token exists; browser storage was cleared; the configured token was rotated or revoked (next mutation gets 401); the backend returns 401; or the user deliberately chooses "Forget or change token". Viewing another member's Calendar, or receiving a 403 cross-member denial, never triggers a re-prompt.

## 4. Endpoint matrix (9 mutation routes)

| # | Route | Method | Core function (still direct-callable, no auth — see §6) | Route wrapper (FastAPI-registered, enforces auth) |
|---|---|---|---|---|
| 1 | `/api/member-schedules/{member_key}` | POST | `create_member_schedule_event` | `create_member_schedule_event_route` |
| 2 | `/api/member-schedules/{member_key}/bulk` | POST | `create_member_schedule_events_bulk` | `create_member_schedule_events_bulk_route` |
| 3 | `/api/member-schedules/{member_key}/{event_id}` | PUT | `update_member_schedule_event` | `update_member_schedule_event_route` |
| 4 | `/api/member-schedules/{member_key}/{event_id}` | DELETE | `delete_member_schedule_event` | `delete_member_schedule_event_route` |
| 5 | `/api/member-schedules/{member_key}/{event_id}/outcome` | PUT | `update_member_schedule_event_outcome` | `update_member_schedule_event_outcome_route` |
| 6 | `/api/member-schedules/{member_key}/clear-testing-data` | DELETE | `clear_testing_data` | `clear_testing_data_route` |
| 7 | `/api/member-leave/{member_key}` | POST | `create_member_leave_record` | `create_member_leave_record_route` |
| 8 | `/api/member-leave/{member_key}/{leave_id}` | PUT | `update_member_leave_record` | `update_member_leave_record_route` |
| 9 | `/api/member-leave/{member_key}/{leave_id}` | DELETE | `delete_member_leave_record` | `delete_member_leave_record_route` |

All GET routes (list, daily/weekly/monthly reports, weekly XLSX export, leave summary) are unchanged and remain unauthenticated.

## 5. New endpoint

`POST /api/calendar-auth/verify` (`backend/routers/calendar_auth.py`) — accepts a token via `Authorization: Bearer <token>` only, returns `{"memberKey": "...", "displayLabel": "..."}` on success, 401 on any failure. Never returns the token or a hash.

## 6. Backend enforcement design

One shared token-validation function (`validate_calendar_auth_token`) is used by both the verify endpoint and a FastAPI dependency (`get_verified_member`) — no duplicated comparison logic. Every mutation route above is a thin wrapper (`*_route`) that: (1) validates the `{member_key}` path segment is a known member, (2) compares the verified acting member against that path segment and returns 403 on mismatch — **before any database access** — then (3) delegates to the pre-existing, unmodified business-logic function. This preserves every existing direct-call test's exact behavior (the pre-existing functions keep their original names and signatures) while making the actual HTTP-routed path fully authorization-enforced. See `validation/calendar-member-token-authorization-implementation-check-2026-07-29.md` for full evidence.

## 7. Configuration contract (no secret values)

Five backend-only environment variables, one per member, each holding a 64-character SHA-256 hex digest of that member's token (never the raw token): `CALENDAR_AUTH_TOKEN_HASH_MAYURIKA`, `_SUMAN`, `_ARUN`, `_RAJIV`, `_PARAPARAN`. All five must be present, non-blank, valid hex digests, and unique, or the backend fails closed at startup (`backend/config.py load_calendar_auth_token_hashes`, wired into `backend/main.py`'s lifespan handler). See `.env.example` for the placeholder-only documented shape.

## 8. Frontend contract

One versioned `localStorage` key `management_aios_calendar_auth_v1` storing `{version, token, verifiedMemberKey, verifiedAt}`. Only `token` is ever sent to the backend; `verifiedMemberKey`/`verifiedAt` are display-only. See `web-view/js/calendar/auth.js`.

## 9. Out of scope / explicitly not changed

- No cross-member override/admin bypass.
- No database migration, no RLS.
- No change to existing 404 (genuine not-found) or 409 (business-conflict) behavior.
- No deployment performed in this session.

## 10. Related evidence

- `validation/calendar-member-token-authorization-implementation-check-2026-07-29.md` — test evidence, CORS evidence, browser evidence, risks.
- `handover/2026-07-29__calendar-member-token-authorization-closure.md` — owner/reviewer, rollback, final status.

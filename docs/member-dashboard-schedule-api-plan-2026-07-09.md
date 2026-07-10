---
name: member-dashboard-schedule-api-plan
type: design-document
created: 2026-07-09
created-by: Mareenraj (builder)
status: DESIGN ONLY — NOT IMPLEMENTED
---

# Member Dashboard Schedule — FastAPI + PostgreSQL Design Plan (2026-07-09)

**This is a design document only. No backend code, no SQL migration files, no changes to
`web-view/index.html` have been made as part of this document. Nothing in this plan is source-registered,
verify-registered, or promoted to parent-AIOS truth.**

---

## 1. Purpose

Design a safe path to replace the current per-member browser `localStorage` schedule calendar (in
`web-view/index.html`) with a centralized FastAPI + PostgreSQL backend, so that:

- Schedule data survives page reloads and is visible from more than one browser/device.
- The same testing/demo boundary that exists today is preserved in the new design (this plan does not
  upgrade the data to official HR/Admin schedule truth).
- Mayurika, Suman, Arun, and Rajiv each retain a clearly separated data namespace, matching the current
  per-member localStorage key model.

This document does not implement anything. It exists so a reviewer (human or GPT) can evaluate the design
before any FastAPI route, SQLAlchemy model, or SQL migration is written.

---

## 2. Why localStorage Is Not Enough

Per the read-only discovery pass on `web-view/index.html` (2026-07-09):

- Data lives only in one browser, on one device. It does not sync across sessions, devices, or users.
- There is no server-side persistence — clearing browser storage or switching browsers loses all data.
- There is no audit trail: no `created_at`/`updated_at`, no `created_by`/`updated_by`.
- IDs are client-generated (`item-<Date.now()>-<random 0-9999>` for user items, `seed-<memberKey>-1` for
  seed items) with no server-enforced uniqueness.
- There is no mechanism at all for multiple people to view or edit the same member's schedule — the whole
  feature is single-browser, single-user by construction.
- The current code and UI copy explicitly label this "Testing Preview Only" (banner, footer, and code
  comments including "No PostgreSQL. No API. No schema. No source registration.").

A centralized backend addresses persistence and shareability, but must be designed carefully so it does not
silently promote demo data into operational HR/Admin truth (see §10 and §12).

---

## 3. Current UI Behavior Summary

(From the 2026-07-09 read-only discovery pass — see prior discovery report, not reproduced here.)

- One calendar instance is mounted per member tab via `.msc-instance` containers (Mayurika, Suman, Arun,
  Rajiv), each with its own `data-member-key`, `data-member-label`, and `data-storage-key`.
- Supported actions: add, edit, delete, view (read-only modal), clear all.
- Supported fields: single-day date, optional start/end time, optional notes, fixed category list, fixed
  priority list (High/Medium/Low).
- Not supported: recurring events, drag-and-drop, status/completion field, multi-user conflict handling.
- `data-rajiv-note="true"` only adds a UI disclaimer sentence for Rajiv's tab — there is no role-based
  permission or approval logic anywhere in the current code.

---

## 4. Current Event Object Shape

```js
{
  id: 'item-<timestamp>-<random>',   // or 'seed-<memberKey>-1' for the starter item
  date: 'YYYY-MM-DD',
  title: string,          // max 60 chars, required
  category: string,       // one of 4 hardcoded "Sample ..." values
  priority: 'High' | 'Medium' | 'Low',
  start: 'HH:MM' | '',    // optional
  end: 'HH:MM' | '',      // optional
  notes: string           // max 240 chars, optional
}
```

No `member`/`owner` field exists inside the item — member identity today is implied entirely by which
localStorage key the array lives under.

---

## 5. PostgreSQL Schema/Table Proposal

The following schema was supplied for review and is adopted as the working draft. It directly maps every
existing field, adds the audit columns the current model lacks (`created_at`, `updated_at`,
`created_by`, `updated_by`, `deleted_at`), and — critically — adds `source_scope` and
`is_official_truth` columns so the database itself carries the testing/demo boundary rather than relying
on convention alone (see §10).

```sql
CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE management_aios.member_schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_key TEXT NOT NULL,
    member_label TEXT NOT NULL,

    event_date DATE NOT NULL,
    title VARCHAR(60) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Sample Task',
    priority TEXT NOT NULL DEFAULT 'Medium',
    start_time TIME NULL,
    end_time TIME NULL,
    notes VARCHAR(240) NULL,

    source_scope TEXT NOT NULL DEFAULT 'dashboard_testing',
    is_official_truth BOOLEAN NOT NULL DEFAULT FALSE,

    created_by TEXT NULL,
    updated_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT member_schedule_events_member_key_check
    CHECK (member_key IN ('mayurika', 'suman', 'arun', 'rajiv')),

    CONSTRAINT member_schedule_events_priority_check
    CHECK (priority IN ('High', 'Medium', 'Low')),

    CONSTRAINT member_schedule_events_source_scope_check
    CHECK (source_scope IN ('dashboard_testing', 'pilot', 'approved_live')),

    CONSTRAINT member_schedule_events_time_check
    CHECK (
        start_time IS NULL
        OR end_time IS NULL
        OR end_time > start_time
    )
);

CREATE INDEX idx_member_schedule_events_member_date
ON management_aios.member_schedule_events (member_key, event_date)
WHERE deleted_at IS NULL;

CREATE INDEX idx_member_schedule_events_scope
ON management_aios.member_schedule_events (source_scope, is_official_truth);
```

**Design notes:**

- `member_key` CHECK constraint constrains values to the 4 currently known members — matches the existing
  `.msc-instance` set exactly, no more, no less.
- `deleted_at` enables soft-delete, an improvement over the current hard-delete-only behavior — subject to
  reviewer confirmation that soft-delete is wanted (see §14).
- `is_official_truth` defaults to `FALSE` and must never be set `TRUE` by any automated process — see §10.
- No SQL migration file has been created as part of this document, per task scope.

---

## 6. API Endpoint Proposal

```
GET    /api/member-schedules/{member_key}
GET    /api/member-schedules/{member_key}?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
POST   /api/member-schedules/{member_key}
PUT    /api/member-schedules/{member_key}/{event_id}
DELETE /api/member-schedules/{member_key}/{event_id}
DELETE /api/member-schedules/{member_key}/clear-testing-data
```

| Endpoint | Replaces (current localStorage behavior) | Notes |
|---|---|---|
| `GET .../{member_key}` | `loadItems()` / `localStorage.getItem` | Returns all non-deleted events for one member |
| `GET .../{member_key}?start_date&end_date` | (new — not present in current UI, but a safe additive filter) | Optional date-range filter for future calendar views |
| `POST .../{member_key}` | add handler | Body = one event object (no `id` — server generates); `member_key` in path is the source of truth for ownership, not a body field |
| `PUT .../{member_key}/{event_id}` | update handler | Full or partial update of one event |
| `DELETE .../{member_key}/{event_id}` | `deleteItem()` | Soft-delete (`deleted_at = now()`) recommended over hard delete, pending reviewer confirmation |
| `DELETE .../{member_key}/clear-testing-data` | "Clear all" button | Deliberately named `clear-testing-data`, not `clear` — the explicit name is a guardrail so this endpoint cannot be mistaken for a generic bulk-delete of real data; should additionally be restricted to rows where `source_scope = 'dashboard_testing'` |

All endpoints operate on a single `member_key` at a time — this preserves the current per-member namespace
isolation model (§8 of the discovery report: "no shared IDs are used across instances").

**Not proposed in this design:** an `is_official_truth`-flipping endpoint, an admin/global cross-member
endpoint, or any endpoint that writes to HR/Admin systems outside this table. If any such capability is
ever needed, it requires its own separate design review and explicit domain-owner sign-off — see §12.

---

## 7. FastAPI File/Module Proposal

Proposed module layout (naming only — no files created by this document):

```
backend/
  app/
    main.py                        # FastAPI app instantiation, router includes
    config.py                      # Settings loaded from environment (see §9) — no hardcoded values
    db/
      session.py                   # SQLAlchemy engine/session factory, reads DSN from env
      models/
        member_schedule_event.py   # ORM model mirroring §5 schema
    schemas/
      member_schedule_event.py     # Pydantic request/response models
    api/
      routes/
        member_schedules.py        # Router implementing the 6 endpoints in §6
    services/
      member_schedule_service.py   # Business logic: validation, soft-delete, source_scope enforcement
  tests/
    test_member_schedules.py       # API-level tests against a test database
  alembic/                         # migration tool directory (future — no migrations authored yet)
```

This layout is a proposal for reviewer feedback. No `backend/` directory or file has been created as part
of this task (task scope forbids creating backend/API/schema/deployment files).

---

## 8. Frontend Integration Plan

Integration points identified in `web-view/index.html` where a future implementation would replace
localStorage calls with API calls (for planning only — no edits made):

- `loadItems()` (currently reads `localStorage.getItem(storageKey)`) → would call
  `GET /api/member-schedules/{member_key}`
- `saveItems(list)` (currently `localStorage.setItem`) → would be replaced by per-action calls instead of
  one whole-array overwrite: `POST` for add, `PUT` for update, `DELETE` for delete/clear — this is a shift
  from the current "overwrite whole array" pattern to item-level operations, reducing the risk of one
  session's stale read clobbering another session's concurrent write.
- The `data-storage-key` attribute on each `.msc-instance` container would no longer be needed for reading
  raw localStorage; `data-member-key` would instead be used to build the API URL path segment.
- Existing render functions (`renderCalendar`, `renderList`, `renderPriorityPreview`) would be unchanged in
  shape — they already operate on an in-memory `items` array; only how that array is populated/persisted
  changes.
- A loading/error state would need to be added to the UI (not present today, since localStorage reads are
  synchronous and never fail) — flagged as a gap for the reviewer, not solved in this document.

No changes to `web-view/index.html` are made by this document.

---

## 9. `.env` and Credential Handling Rule

- Database connection details (host, port, username, password, database name) must be supplied only via
  environment variables (e.g. `DATABASE_URL`), read by `backend/app/config.py` at runtime.
- No credential, connection string, username, or password may ever be written into this document, into any
  file in this repository, into a commit message, or into any handover/validation file.
- A `.env.example` file (future, not created now) should list variable **names** only, with placeholder
  values (e.g. `DATABASE_URL=postgresql://user:password@localhost:5432/dbname`), never real credentials.
- The real `.env` file must be excluded via `.gitignore` and never committed.
- This document does not request, store, or expose any database username, password, or connection string,
  per task safety rules.

---

## 10. Testing/Demo Truth Boundary

This is the most important boundary in the whole design, and it is carried at the data layer, not just in
prose:

- Every row defaults to `source_scope = 'dashboard_testing'` and `is_official_truth = FALSE`.
- No endpoint proposed in §6 sets `is_official_truth = TRUE`, and no endpoint changes `source_scope` away
  from `'dashboard_testing'`. Promotion to `'pilot'` or `'approved_live'` (both allowed by the CHECK
  constraint for future use) is explicitly **out of scope** for this design and would require its own
  separate design + domain-owner review before any code implements it.
- This preserves the same boundary already established for the HR Schedule Pilot: GAP-40 (content/fact
  confirmation) and GAP-44 (visual/deployment sign-off) both remain open per
  `validation/hr-schedule-gap-deferral-note-2026-07-09.md`, and this design does not touch, resolve, or
  imply resolution of either gap.
- The API design does not read from or write to any official HR/Admin schedule file (e.g.
  `schedules/hr/*`), and does not interact with `evidence/source-register.md` or
  `context/verify-register.md`.
- Recommendation: any future frontend built on this API should keep the existing "Testing Preview Only"
  banner and footer text unchanged, and the API's default `dashboard_testing` scope should be
  surfaced in the UI so users are never misled about the data's status.

---

## 11. Migration Plan From localStorage to API (Design-Level Only)

This section describes the *shape* of a future migration, for reviewer evaluation — no code exists yet.

1. **Stand up schema** (future task): apply the table in §5 via a reviewed Alembic migration in a
   non-production database first.
2. **Stand up read-only GET** (future task): implement `GET /api/member-schedules/{member_key}` only,
   without touching the frontend, and verify it returns an empty/seeded response correctly.
3. **Add write endpoints** (future task): implement POST/PUT/DELETE behind the same review process.
4. **Frontend dual-read (optional safety step)**: temporarily read from both localStorage and the API,
   compare, and log discrepancies before cutting over, OR simpler — offer a one-time "Import from this
   browser" action that POSTs each existing localStorage item to the API once per member, then stops
   reading localStorage.
5. **Cut over**: switch `loadItems`/`saveItems` in `web-view/index.html` to call the API exclusively.
6. **Decommission localStorage read/write** in the JS, but leave the existing keys alone in users' browsers
   (no need to actively clear them — they simply become unused).
7. **Do not delete or migrate any data marked in a way that implies it is official HR truth** — every
   migrated row keeps `source_scope = 'dashboard_testing'` unless a separate, explicitly authorized process
   changes it later.

Each of these numbered steps is a **future task**, not something this document performs.

---

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Centralizing data makes it feel more "official" than localStorage did, risking silent promotion to HR/Admin truth | `source_scope`/`is_official_truth` columns default to testing values; no proposed endpoint changes them; UI banner/footer text preserved (§10) |
| Rajiv/Admin tab data could be mistaken for confirming Admin Manager authority (still `[VERIFY]`, pending SRC-ADMIN-001) | This design does not add any Admin-specific logic beyond the existing UI disclaimer; no escalation/approval logic is proposed anywhere in this document, consistent with CLAUDE.md §13 ("Invent Admin Manager authority... " is forbidden) |
| Credentials leak into source control | §9 rule: env-var only, never written to any repo file; `.env` gitignored |
| Whole-array overwrite pattern (current bug class) could cause lost updates under concurrency | §8 proposes item-level POST/PUT/DELETE instead of whole-array save, which is naturally safer, though true multi-user conflict handling (e.g. optimistic locking via `updated_at`) is not fully designed here and should be a named follow-up if multi-user editing becomes a real requirement |
| A future developer adds an endpoint that writes to `schedules/hr/*` or other official files, conflating this table with HR truth | Explicitly called out as not-in-scope in §6 and §10; any such endpoint would need its own domain-owner-reviewed design |
| Category/priority values are still hardcoded/placeholder (per discovery report) | Schema constraints use the same fixed sets as today (`High`/`Medium`/`Low` for priority); category is left as free `TEXT` with a `DEFAULT` matching current UI default, since the discovery report flagged the current category list as placeholder/sample — hardening this further is deferred to whoever owns real category definitions |
| This document itself gets treated as approval to start building | §13 Pass/Fail Rule and §14 Reviewer Needed exist specifically to prevent that |

---

## 13. Pass/Fail Rule

**PASS** if all of the following are true:

- This document and its validation companion are the only files created.
- No implementation (backend, SQL migration, or `web-view/index.html`) files were changed.
- No database credentials appear anywhere in this document.
- The schema and endpoints preserve the testing/demo boundary (`source_scope`, `is_official_truth` default
  to non-official values; no endpoint flips them).
- GAP-40 and GAP-44 remain open and unaddressed by this document.
- No source-register.md, verify-register.md, or CLAUDE.md edits were made.

**FAIL** if any implementation file was created/edited, any credential was written, or the design silently
treats this data as (or enables it to become) official HR/Admin truth without a separate, explicit
domain-owner-reviewed step.

---

## 14. Reviewer Needed

- **Mareenraj (builder)** — technical design review of schema/API shape before any implementation begins.
- **Mayurika** — HR domain owner; must confirm whether her tab's schedule data should ever be eligible for
  `source_scope = 'pilot'`/`'approved_live'` promotion, and under what process (separate from this design).
- **Rajiv** — Admin Manager; any future Admin-specific behavior beyond the current disclaimer note requires
  his review once SRC-ADMIN-001 is received, per CLAUDE.md §13/§18.
- **Varmen** — general MD-relay reviewer, per CLAUDE.md §18 routing rule, if this crosses into
  cross-management scope.

This document does not assume any of the above reviews have occurred.

---

## 15. One Next Step

Circulate this document and its validation check (`validation/member-dashboard-schedule-api-plan-check-2026-07-09.md`)
to Mareenraj for a design-level go/no-go decision before any `backend/` code, Alembic migration, or
`web-view/index.html` edit is written.

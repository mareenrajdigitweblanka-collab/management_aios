# Management AIOS — Member Schedule API (Local Draft, finalized 2026-07-10)

**Status: LOCAL IMPLEMENTATION DRAFT. Not committed, not pushed, not deployed.**
GPT is scheduled to review this draft before any commit/push decision is made.

---

## Purpose

This FastAPI service is a centralized backend for the member dashboard schedule calendar in
`web-view/index.html`, replacing the earlier browser-`localStorage`-only build. It removes the
single-browser/single-device limitation of `localStorage` while preserving the same per-member
separation and the same testing/demo scope the UI has always carried.

`web-view/index.html` is fully wired to this API (no calendar `localStorage` reads/writes remain — see
`validation/member-schedule-end-to-end-finalization-check-2026-07-10.md`).

See the design rationale in `docs/member-dashboard-schedule-api-plan-2026-07-09.md`.

---

## Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `psycopg`, `pydantic`, `python-dotenv`) have been installed
and the API has been run and tested end to end locally — see
`validation/member-schedule-end-to-end-finalization-check-2026-07-10.md` for the full test matrix.

---

## Set DATABASE_URL

1. Copy `.env.example` (repo root) to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and replace the placeholder values with your real local PostgreSQL connection details.
   **Never commit `.env`** — it is not tracked by this repository's `.gitignore` today; if a `.gitignore`
   entry for `.env` does not exist yet, add one before creating a real `.env` file with live credentials.
3. Apply the schema first (if `psql` is not on your PATH, any safe runner that executes the whole `.sql`
   file as one script works — do not naively `split(';')`, since that breaks on the file's own
   comments/constraints):
   ```bash
   psql "$DATABASE_URL" -f database/member_schedule_events_schema.sql
   ```

No real credentials are stored in this repository. `DATABASE_URL` is read from the environment only
(`backend/config.py`).

---

## Run FastAPI Locally

From the repository root (so the `backend` package resolves correctly):

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Then visit `http://127.0.0.1:8000/docs` for interactive Swagger UI, or `http://127.0.0.1:8000/health` for
the health check.

---

## Serve the Dashboard Frontend

`web-view/index.html` calls this API directly from the browser, so it must be served over HTTP (not opened
via `file://`) for CORS to apply correctly:

```bash
python -m http.server 8080 --directory web-view
```

Then open `http://127.0.0.1:8080/index.html` with the FastAPI server above running on port 8000.

**CORS (local development only):** `backend/main.py` allows any `http://localhost:<port>` or
`http://127.0.0.1:<port>` origin, with credentials disabled (`allow_credentials=False`) — safe for local
static-server/file-based development, not for a public deployment. No `allow_origins=["*"]` is combined
with credentialed requests.

---

## API Endpoint List

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/api/member-schedules/{member_key}` | List active events for a member (optional `start_date`/`end_date` query filters) |
| POST | `/api/member-schedules/{member_key}` | Create one event (always `source_scope=dashboard_testing`, `is_official_truth=false`) |
| PUT | `/api/member-schedules/{member_key}/{event_id}` | Update editable fields only (date/title/category/priority/start/end/notes) |
| DELETE | `/api/member-schedules/{member_key}/{event_id}` | Soft-delete one event (`deleted_at` set) |
| DELETE | `/api/member-schedules/{member_key}/clear-testing-data` | Soft-delete all `dashboard_testing`, non-official rows for a member; never touches `pilot`/`approved_live` rows |

Valid `member_key` values: `mayurika`, `suman`, `arun`, `rajiv`.

---

## Testing/Demo Truth Boundary

This API is **not** a source of official HR/Admin schedule truth.

- Every row created via `POST` defaults to `source_scope='dashboard_testing'` and
  `is_official_truth=FALSE`. Neither field can be set to an official value through any endpoint in this
  draft — `MemberScheduleEventCreate` and `MemberScheduleEventUpdate` do not even accept those fields in
  their request bodies.
- `clear-testing-data` deliberately only removes `dashboard_testing`/non-official rows, so it can never be
  used to silently wipe a `pilot` or `approved_live` row if those states are ever introduced later by a
  separate, explicitly authorized process.
- GAP-40 (HR schedule content/fact confirmation) and GAP-44 (HR schedule visual/deployment sign-off) both
  remain open per `validation/hr-schedule-gap-deferral-note-2026-07-09.md`. This API does not resolve,
  reference, or depend on either gap being closed.
- This service does not read from or write to `evidence/source-register.md`, `context/verify-register.md`,
  `CLAUDE.md`, or any `schedules/hr/*` official file.

---

## End-to-End Manual Test

1. Start PostgreSQL (this draft was validated against a Dockerized PostgreSQL instance) and apply the schema
   (see above).
2. Start the API: `python -m uvicorn backend.main:app --port 8000`.
3. Serve the frontend: `python -m http.server 8080 --directory web-view`.
4. Open `http://127.0.0.1:8080/index.html`, switch to each of the four member tabs (Mayurika, Suman, Arun,
   Rajiv), and for each: add a schedule item, refresh the page and confirm it persists, edit it and confirm
   the update persists after refresh, then delete it and confirm the deletion persists after refresh.
5. On the Arun tab, add two items and use "Clear Testing Data" — confirm only Arun's `dashboard_testing`
   rows are removed and other members' data is untouched.
6. Stop the FastAPI process (or block the `/api/member-schedules/*` requests) and refresh a member tab to
   confirm a clear, non-technical error message appears without corrupting the page.

Full automated results (backend CRUD/validation matrix and browser-driven four-member test) are recorded in
`validation/member-schedule-end-to-end-finalization-check-2026-07-10.md`.

---

## No Real Credentials in Repo

- `DATABASE_URL` is read from the environment only (`backend/config.py`, `backend/database.py`).
- `.env.example` (repo root) contains placeholder values only:
  `postgresql+psycopg://USERNAME:PASSWORD@HOST:PORT/DATABASE`.
- No real username, password, host, port, or connection string appears anywhere in this backend or in this
  README.

---

## This Does Not Replace Official HR/Admin Records

This API is a testing/demo-scope backend for the existing per-member dashboard calendar preview. It does
not replace, supersede, or feed into:

- Mayurika's official staff record governance (CLAUDE.md §9.1)
- Any official HR schedule file under `schedules/hr/`
- Admin Manager authority or escalation logic (still `[VERIFY]`, pending `SRC-ADMIN-001`)
- Any source registered in `evidence/source-register.md`

Promoting any data stored via this API to official truth would require a separate, explicitly reviewed and
domain-owner-approved process — it does not happen automatically, and no code in this draft does it.

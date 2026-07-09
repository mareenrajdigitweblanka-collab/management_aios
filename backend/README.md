# Management AIOS — Member Schedule API (Local Draft, 2026-07-09)

**Status: LOCAL IMPLEMENTATION DRAFT. Not committed, not pushed, not deployed.**
GPT is scheduled to review this draft before any commit/push decision is made.

---

## Purpose

This FastAPI service is a first local draft of a centralized backend for the member dashboard schedule
calendar currently implemented in `web-view/index.html` using browser `localStorage`. It exists to remove
the single-browser/single-device limitation of `localStorage` while preserving the same per-member
separation and the same testing/demo scope that the current UI already carries.

It replaces the *future* need for `localStorage` reads/writes in the dashboard. **`web-view/index.html`
has not been modified as part of this task** — the frontend integration is a separate future step.

See the design rationale in `docs/member-dashboard-schedule-api-plan-2026-07-09.md`.

---

## Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Dependencies (`fastapi`, `uvicorn`, `sqlalchemy`, `psycopg`, `pydantic`, `python-dotenv`) were **not**
installed as part of this task — see the implementation validation file for the syntax-only check that was
run instead of a full import/runtime check.

---

## Set DATABASE_URL

1. Copy `.env.example` (repo root) to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and replace the placeholder values with your real local PostgreSQL connection details.
   **Never commit `.env`** — it is not tracked by this repository's `.gitignore` today; if a `.gitignore`
   entry for `.env` does not exist yet, add one before creating a real `.env` file with live credentials.
3. Apply the schema first:
   ```bash
   psql "$DATABASE_URL" -f database/member_schedule_events_schema.sql
   ```

No real credentials are stored in this repository. `DATABASE_URL` is read from the environment only
(`backend/config.py`).

---

## Run FastAPI Locally

From the repository root (so the `backend` package resolves correctly):

```bash
uvicorn backend.main:app --reload --port 8000
```

Then visit `http://localhost:8000/docs` for interactive Swagger UI, or `http://localhost:8000/health` for
the health check.

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

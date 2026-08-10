# Knowledge Management — Persistent CRUD Design (REQ-KM-CRUD-002)

**Status:** DESIGN / EVIDENCE ONLY. No schema was created, no migration was executed, no database was written to, and nothing was pushed. This document is the complete schema/API/permission/duplicate-risk report requested for review. This revision **locks** the business rules confirmed 2026-08-10 (see §7 — no longer open questions).
**Builds on:** [docs/knowledge-management-discovery-2026-08-10.md](knowledge-management-discovery-2026-08-10.md) (REQ-KM-001 discovery, AMBER) and [docs/knowledge-management-company-documents-requirement-2026-08-10.md](knowledge-management-company-documents-requirement-2026-08-10.md) (REQ-KM-001 frontend-only first implementation, PASS, currently on `origin/main`).
**Protected path:** `member-aios/mayurika-hr/staff-data/` was never opened, read, or referenced.

---

## 1. Live `management_aios` PostgreSQL Inspection — Status

**Live `management_aios` PostgreSQL inspection: NOT COMPLETED.** The connector/database access needed to query the Management AIOS's own live database was unavailable and unauthorized in every session so far. `ToolSearch` for a postgres connector returns only `mcp__ledsone__*` — the company's separate **operational** database (`ledsone`), not `management_aios`.

As a due-diligence check anyway: `mcp__ledsone__search_objects` (schema search, pattern `%management%`) against that operational database returns only `employee_management` and `order_management` — **no schema named `management_aios` exists there**, confirming it is a genuinely separate system with no bearing on this design.

**Evidence used instead (static analysis, not a live query):**
- `backend/models.py` — 4 ORM classes exist: `MemberScheduleEvent`, `MemberLeaveRecord`, `StaffDashboardRecord`, `StaffReviewSummary`. None relate to documents/knowledge.
- `database/migrations/*.sql` — 9 tracked migration files (10 including this one, still unexecuted), none creating anything named `knowledge_documents`, `knowledge_document_versions`, `knowledge_document_audit_log`, or similar.

**Duplicate-object clearance: OPEN.** No object equivalent to `knowledge_documents`, `knowledge_document_versions`, or `knowledge_document_audit_log` is known to exist, based on everything this session could inspect. **This is not a clearance for execution** — an out-of-band table created directly against the live database (bypassing this repo's migration files) cannot be ruled out from static analysis alone. The proposed table names are **not** cleared for execution.

**Migration execution: BLOCKED pending live read-only database inspection.** This status will not change until a future session with an authorized connector runs the inspection and confirms no conflicting object exists.

---

## 2. Existing Patterns This Design Reuses

Inspected in full before drafting anything below:

| Concern | Existing precedent | File |
|---|---|---|
| Actor identity (server-derived, never client-supplied) | `Depends(get_verified_member)` resolves a Bearer token to a `member_key`; routes never trust a request-body identity field | `backend/routers/calendar_auth.py` |
| Shared-write, no per-owner lock (the model this design now uses — see §7 rule 1) | Task/Leave: any Management Team member with a valid token may act, scoped only to their OWN `{member_key}` URL segment via `require_matching_member` | `backend/routers/member_leave.py`, `member_schedules.py` |
| Shared-read across all members (precedent for KM's shared-write-too model) | `StaffReviewSummary` LIST/DETAIL: any authenticated member reads any record (2026-08-03 revised rule) | `backend/routers/staff_review_summaries.py` |
| Soft delete | `deleted_at` nullable `TIMESTAMPTZ`; a row is active iff `deleted_at IS NULL`; every list/detail query filters it; DELETE route sets it, never issues real `DELETE` | `MemberLeaveRecord`, `delete_member_leave_record` |
| Real UNIQUE column precedent (used for §7 rule 3's source-URL uniqueness) | `source_record_key = Column(String, nullable=False, unique=True)` | `StaffDashboardRecord` (`backend/models.py`) |
| Symmetric pairing CHECK constraint (used for §7 rule 5's soft-delete columns) | `outcome_reason` required exactly when `outcome='Uncompleted'`, NULL otherwise; `half_day_period` required exactly for the two half-day leave types, NULL otherwise | `MemberScheduleEvent`, `MemberLeaveRecord` (`backend/models.py`) |
| A stored value whose real business meaning stays deliberately unresolved (precedent for §6's extensible ownership-status design) | `'[VERIFY]'` is a real, legal, queryable `employment_stage` value — "no HR-approved rule exists to resolve `[VERIFY]` rows... this AIOS must not invent that rule" | `backend/config.py` `VALID_EMPLOYMENT_STAGES` |
| created_by/updated_by | Free-text or `member_key`, always server-set on mutation, present on every mutable table | `MemberScheduleEvent`, `MemberLeaveRecord`, `StaffDashboardRecord` |
| CHECK-constraint-enforced enums | `member_key IN (...)`, `leave_type IN (...)`, `priority IN (...)` — enforced at both the DB (`CheckConstraint`) and API (`Field`/`field_validator`) layers | `backend/models.py`, `backend/schemas.py` |
| Draft-but-unexecuted migration convention | A migration file is committed with an explicit "NOT been executed against the live... database" header, plus post-COMMIT validation queries and rollback notes, and sits reviewed-but-unapplied for an extended period | `database/migrations/2026-08-03-create-staff-review-summaries.sql` |
| Frontend token storage/attachment | One browser-wide `localStorage` token (`management_aios_calendar_auth_v1`), sent as `Authorization: Bearer <token>` on every mutation; never a raw identity claim | `web-view/js/calendar/auth.js` |

This design introduces **zero new architectural patterns** — every mechanism below is a direct reuse of one of the rows above, applied to a new resource. No lookup table is introduced (this repo has no precedent for one anywhere in its schema — see §6) and no DB trigger is introduced (same reasoning as before).

---

## 3. Schema Design

Schema: `management_aios` (existing).

### 3.1 `management_aios.knowledge_documents`

```sql
CREATE TABLE management_aios.knowledge_documents (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title                       VARCHAR(200) NOT NULL,
    team                        VARCHAR(120) NOT NULL,
    document_type               VARCHAR(40)  NOT NULL,
    job_role                    VARCHAR(120) NULL,
    document_category           VARCHAR(120) NULL,
    creator                     VARCHAR(200) NULL,

    source_url                  VARCHAR(2048) NOT NULL,
    -- Normalized form of source_url (lowercased scheme/host, query string
    -- and fragment stripped, trailing slash stripped) — computed by the
    -- API on every write, never client-supplied directly. This is the
    -- basis of §6 rule 3's duplicate-prevention check. A known, documented
    -- limitation, not fixed here: this is a plain URL-normalization
    -- heuristic, not Google-file-ID extraction — a Drive "file ID only"
    -- link and an "/edit" link to the same underlying file will NOT be
    -- recognized as duplicates. Building real Google-ID-aware
    -- canonicalization is out of scope (it edges toward the "AI duplicate
    -- detection" this task explicitly forbids) and is not designed here.
    source_url_normalized       VARCHAR(2048) NOT NULL,
    current_version             VARCHAR(20)  NOT NULL DEFAULT '1.0',

    lifecycle_status            VARCHAR(20)  NOT NULL DEFAULT 'Active',
    compliance_status           VARCHAR(20)  NOT NULL DEFAULT 'Pending',
    -- See §6 for the extensibility rationale — 'Verified' is a legal
    -- value at the DB layer (no future ALTER needed to unlock it) but no
    -- API route in §5 ever writes it; see §6 for why that is deliberate.
    google_ownership_status     VARCHAR(20)  NOT NULL DEFAULT 'Not Applicable',

    created_by                  VARCHAR(80)  NOT NULL,
    updated_by                  VARCHAR(80)  NULL,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Soft-delete state (§7 rule 5) — all three populated together, or
    -- all three NULL together; never a partial state. Cleared together on
    -- RESTORE (§5.6) — the historical fact of the deletion survives only
    -- in knowledge_document_audit_log, never here (see §5.6's docstring).
    deleted_at                  TIMESTAMPTZ  NULL,
    deleted_by                  VARCHAR(80)  NULL,
    delete_reason                VARCHAR(500) NULL,

    CONSTRAINT knowledge_documents_document_type_check
        CHECK (document_type IN (
            'Google Sheet', 'Google Doc', 'Google Drive File', 'PDF',
            'Word Document', 'Excel File', 'ZIP File', 'Skill File',
            'Image', 'Video', 'External URL', 'Internal Documentation Link'
        )),
    CONSTRAINT knowledge_documents_lifecycle_status_check
        CHECK (lifecycle_status IN ('Active', 'Archived')),
    CONSTRAINT knowledge_documents_compliance_status_check
        CHECK (compliance_status IN ('Pending', 'Completed')),
    -- Extensible-but-validated design (§6): 'Verified' IS a legal DB
    -- value today, so a future real-verification feature needs no schema
    -- migration to use it — only new application code. No route in this
    -- design's §5 ever sets it; enforcement of "no fake verification" is
    -- therefore an APPLICATION-layer guarantee (no Create/Update schema
    -- accepts client input of 'Verified'), not a DB-layer one. See §6 for
    -- the full rationale and the alternative designs considered.
    CONSTRAINT knowledge_documents_google_ownership_status_check
        CHECK (google_ownership_status IN ('Not Applicable', 'Not Verified', 'Verified')),
    -- A Google-type document cannot reach Completed while ownership is
    -- unverified (SRD §6/§17). Structurally still permits 'Verified' +
    -- 'Completed' together — because no code path can ever produce
    -- google_ownership_status='Verified' today (§6), this remains, in
    -- practice, "no Google-type document can be marked Completed at this
    -- phase" without the schema itself hard-blocking the future feature.
    CONSTRAINT knowledge_documents_compliance_google_gate_check
        CHECK (
            compliance_status = 'Pending'
            OR document_type NOT IN ('Google Sheet', 'Google Doc', 'Google Drive File')
            OR google_ownership_status = 'Verified'
        ),
    -- Soft-delete pairing (§7 rule 5) — same symmetric-pairing shape as
    -- MemberScheduleEvent's outcome_reason check and MemberLeaveRecord's
    -- half_day_period check (§2 table).
    CONSTRAINT knowledge_documents_soft_delete_pairing_check
        CHECK (
            (deleted_at IS NULL AND deleted_by IS NULL AND delete_reason IS NULL)
            OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND delete_reason IS NOT NULL)
        )
);

CREATE INDEX idx_knowledge_documents_active
    ON management_aios.knowledge_documents (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_knowledge_documents_team
    ON management_aios.knowledge_documents (team)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_knowledge_documents_type
    ON management_aios.knowledge_documents (document_type)
    WHERE deleted_at IS NULL;

-- §7 rule 3 — Title is explicitly NOT unique (different teams/categories
-- may legitimately share a title). Duplicate prevention instead targets
-- the ACTIVE normalized source URL: two active (non-deleted) records
-- can never share the same source_url_normalized. A partial unique
-- index (not a table-wide UNIQUE) so a soft-deleted record's URL can be
-- legitimately reused by a later, unrelated registration.
CREATE UNIQUE INDEX idx_knowledge_documents_active_source_url_normalized
    ON management_aios.knowledge_documents (source_url_normalized)
    WHERE deleted_at IS NULL;
```

**No `UNIQUE(title)`** — locked by §7 rule 3. **No lookup table for `google_ownership_status`** — see §6 for why a validated `VARCHAR` + CHECK constraint was chosen instead.

### 3.2 `management_aios.knowledge_document_versions`

```sql
CREATE TABLE management_aios.knowledge_document_versions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id       UUID NOT NULL REFERENCES management_aios.knowledge_documents(id),

    version_label     VARCHAR(20)   NOT NULL,
    source_url        VARCHAR(2048) NOT NULL,
    change_note       VARCHAR(500)  NULL,

    created_by        VARCHAR(80)   NOT NULL,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_document_versions_document
    ON management_aios.knowledge_document_versions (document_id, created_at DESC);
```

**Append-only by construction (§7 version rules):** no route in §5 ever issues `UPDATE`/`DELETE` against this table. A version row is a permanent snapshot — created once by CREATE (the initial v1.0) and once per subsequent explicit "revise source" action, never on a metadata-only edit.

### 3.3 `management_aios.knowledge_document_audit_log`

```sql
CREATE TABLE management_aios.knowledge_document_audit_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id       UUID NOT NULL REFERENCES management_aios.knowledge_documents(id),

    action            VARCHAR(30) NOT NULL,
    actor_member_key  VARCHAR(80) NOT NULL,
    detail            JSONB NULL,

    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT knowledge_document_audit_log_action_check
        CHECK (action IN (
            'create', 'update_metadata', 'create_version',
            'archive', 'unarchive', 'soft_delete', 'restore'
        ))
);

CREATE INDEX idx_knowledge_document_audit_log_document
    ON management_aios.knowledge_document_audit_log (document_id, occurred_at DESC);
```

**Immutability enforcement (§7 rule 2 — locked):** no edit, no delete, no rewrite, ever, through the application — enforced primarily at the API layer (no route in §5 exposes an update or delete for this table), matching how this codebase enforces every other invariant. `detail` is a free-form `JSONB` diff, never a secret. The `soft_delete` action's `detail` permanently carries `{"deleted_by": ..., "delete_reason": ...}` — this is how the historical fact of a deletion survives even after RESTORE clears the live `deleted_by`/`delete_reason` columns (§5.6).

---

## 4. Duplicate-Risk / Existing-Object Check — Result

| Object | Exists in tracked repo code? | Exists live in `management_aios`? |
|---|---|---|
| `knowledge_documents` | No | **OPEN — unverified** (§1) |
| `knowledge_document_versions` | No | **OPEN — unverified** (§1) |
| `knowledge_document_audit_log` | No | **OPEN — unverified** (§1) |

**No duplicate-truth collision was found in everything this session could inspect. This is not a clearance for execution.** Migration execution is **BLOCKED** pending a live, authorized, read-only inspection of `management_aios` (§1).

---

## 5. API Routes (design only — no `.py` file created)

Proposed router: `backend/routers/knowledge_documents.py` (not created). Prefix: `/api/knowledge-documents`. Reuses `Depends(get_verified_member)` from the existing `calendar_auth.py` — **no new token type, no new secret.**

**Permission model (§7 rule 1 — locked): every mutating route below is available to ANY authenticated Management Team member, for ANY document — there is no creator-only ownership lock anywhere in this design.** This is a deliberate divergence from `StaffReviewSummary`'s owner-only-update pattern, and a closer match to Task/Leave's "any valid token holder may act" shape (minus Task/Leave's `{member_key}`-scoping, since Knowledge Management has no per-member URL segment — every document belongs to the whole Management Team, not to one member).

| Method | Path | Auth | Maps to |
|---|---|---|---|
| `GET` | `/api/knowledge-documents` | Public | VIEW (list) |
| `GET` | `/api/knowledge-documents/{id}` | Public | VIEW (detail) |
| `GET` | `/api/knowledge-documents/{id}/versions` | Public | VIEW (version history) |
| `GET` | `/api/knowledge-documents/{id}/audit-log` | **Requires token (§7 rule 2 — locked)** | AUDIT (read) |
| `POST` | `/api/knowledge-documents` | Requires token | CREATE |
| `PUT` | `/api/knowledge-documents/{id}/metadata` | Requires token | UPDATE (metadata only) |
| `POST` | `/api/knowledge-documents/{id}/versions` | Requires token | VERSION (create) |
| `POST` | `/api/knowledge-documents/{id}/archive` | Requires token | ARCHIVE |
| `POST` | `/api/knowledge-documents/{id}/unarchive` | Requires token | ARCHIVE (reverse) |
| `DELETE` | `/api/knowledge-documents/{id}` | Requires token | SOFT DELETE |
| `POST` | `/api/knowledge-documents/{id}/restore` | Requires token | RESTORE |

List (`GET /api/knowledge-documents`) query params: `team`, `document_type`, `search` (title `ILIKE`, matching the already-shipped frontend's case-insensitive partial match), `lifecycle_status`, `compliance_status`, `limit`/`offset`.

### 5.1 CREATE — `POST /api/knowledge-documents`

```python
def create_knowledge_document(
    payload: KnowledgeDocumentCreate,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """ANY authenticated Management Team member may create a document —
    no additional authorization check beyond a valid token (§7 rule 1).
    Server sets created_by=acting_member, lifecycle_status='Active',
    compliance_status='Pending', google_ownership_status derived from
    document_type ('Not Verified' for the three Google types, else 'Not
    Applicable') — none of these exist on KnowledgeDocumentCreate, so a
    client cannot set or spoof any of them.

    source_url_normalized is computed server-side from payload.source_url
    (§3.1's normalization rule) — never accepted directly from the
    client. BEFORE insert, checks for an existing ACTIVE record with the
    same source_url_normalized (§7 rule 3):
      - match found -> 409 knowledge_document_duplicate_source_url,
        the create is REJECTED, nothing is written.
      - no source-URL match, but an ACTIVE record has the same title
        (case-insensitive, trimmed exact match only — no fuzzy/AI
        similarity scoring, per explicit instruction) with a DIFFERENT
        source_url_normalized -> the create PROCEEDS (201), but the
        response includes `warnings: ["A document titled '<title>' with a
        different source already exists."]`. This is advisory only; nothing
        blocks the write.

    Inserts the initial knowledge_document_versions row
    (version_label='1.0', source_url=payload.source_url) and one
    knowledge_document_audit_log row (action='create') in the SAME
    transaction as the knowledge_documents insert."""
```

### 5.2 UPDATE (metadata only) — `PUT /api/knowledge-documents/{id}/metadata`

```python
def update_knowledge_document_metadata(
    document_id: UUID,
    payload: KnowledgeDocumentMetadataUpdate,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """ANY authenticated Management Team member may edit ANY document's
    metadata — no owner check (§7 rule 1). Editable: title, team,
    document_type, job_role, document_category, creator, lifecycle_status,
    compliance_status. NEVER editable here: source_url,
    source_url_normalized, current_version (must go through §5.3),
    created_by, created_at, id, deleted_at/deleted_by/delete_reason (must
    go through §5.5/§5.6).

    google_ownership_status is settable only to 'Not Applicable'/'Not
    Verified' by THIS route — KnowledgeDocumentMetadataUpdate's field
    validator rejects 'Verified' as input even though the DB CHECK
    constraint would structurally permit it (§6) — this is the
    application-layer half of the "no fake verification" guarantee.
    Setting compliance_status='Completed' on a Google-type document with
    google_ownership_status != 'Verified' is rejected with 422 before any
    write.

    Does NOT touch knowledge_document_versions, current_version, or
    source_url/source_url_normalized — metadata-only edits never advance
    the content version (§7 version rules). Appends exactly one audit_log
    row, action='update_metadata', detail={changed field -> {from, to}}
    for each field actually supplied — current_version is UNCHANGED in
    that detail payload, making it visible in the audit trail itself that
    this was a metadata-only change."""
```

### 5.3 VERSION (create) — `POST /api/knowledge-documents/{id}/versions`

```python
def create_knowledge_document_version(
    document_id: UUID,
    payload: KnowledgeDocumentVersionCreate,  # { new_source_url, new_version_label, change_note? }
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """ANY authenticated Management Team member may revise ANY document's
    source (§7 rule 1) — the ONLY route that inserts into
    knowledge_document_versions after CREATE, and the ONLY route that
    changes knowledge_documents.source_url/source_url_normalized/
    current_version (§7 version rules). new_source_url is normalized the
    same way as CREATE and checked against every OTHER active document's
    source_url_normalized (excluding this document's own current row) —
    same 409-vs-warning duplicate behavior as §5.1. Inserts the new
    version row, updates the parent document's source_url/
    source_url_normalized/current_version/updated_by/updated_at, appends
    one audit_log row (action='create_version', detail={from_version,
    to_version, from_source_url, to_source_url})."""
```

### 5.4 ARCHIVE / UNARCHIVE

```python
def archive_knowledge_document(document_id, db, acting_member):
    """ANY authenticated member may archive ANY document (§7 rule 1).
    Sets lifecycle_status='Archived'. This is NOT deletion — deleted_at
    stays NULL, the record remains fully visible in VIEW routes (§7
    archive rule). 409 (not a silent no-op) if already Archived, matching
    this codebase's 'clear rejection, not silent no-op' convention.
    Appends one audit_log row (action='archive')."""

def unarchive_knowledge_document(document_id, db, acting_member):
    """Sets lifecycle_status='Active'. 409 if already Active. Appends one
    audit_log row (action='unarchive')."""
```

### 5.5 SOFT DELETE — `DELETE /api/knowledge-documents/{id}`

```python
def soft_delete_knowledge_document(
    document_id: UUID,
    payload: KnowledgeDocumentDeleteRequest,  # { delete_reason: str }
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """ANY authenticated member may soft-delete ANY document (§7 rule 1).
    delete_reason is REQUIRED in the request body (422 if blank/missing —
    §7 rule 5 requires it to be populated, so it cannot be an optional
    field here). Sets deleted_at=now(), deleted_by=acting_member,
    delete_reason=payload.delete_reason — all three together, satisfying
    knowledge_documents_soft_delete_pairing_check. No row is ever removed
    from any of the three tables (§7: no hard-delete route is permitted).
    404 if already soft-deleted or missing, mirroring
    member_leave.py's delete_member_leave_record convention. Appends one
    audit_log row (action='soft_delete', detail={deleted_by,
    delete_reason}) — this is what makes the deletion's history
    survive a later restore (§5.6)."""
```

### 5.6 RESTORE — `POST /api/knowledge-documents/{id}/restore`

```python
def restore_knowledge_document(document_id, db, acting_member):
    """ANY authenticated member may restore ANY soft-deleted document
    (§7 rule 1). 404 if the id is missing or NOT currently soft-deleted.
    Clears deleted_at, deleted_by, AND delete_reason together (satisfying
    the same pairing constraint in the other direction) — restoring a
    document returns it to the same three-columns-NULL shape as a
    never-deleted document, ready for a future independent deletion.

    This does NOT erase the historical fact of the deletion: the
    knowledge_document_audit_log row from the original soft_delete
    action (action='soft_delete', detail={deleted_by, delete_reason})
    is never touched — audit rows are immutable (§7 rule 2) — so 'who
    deleted this, when, and why' remains permanently reconstructable from
    the audit trail even though the live columns are cleared. RESTORE
    itself appends a NEW audit_log row (action='restore'), so the full
    delete->restore sequence is visible in order.

    Does not touch lifecycle_status/compliance_status — a restored
    document reappears in whatever Active/Archived and Pending/Completed
    state it had at the moment it was deleted."""
```

### 5.7 VIEW (list/detail/versions/audit-log)

Mirrors `staff.py`'s existing read-only pattern (`_base_query` filtering `deleted_at IS NULL`, `_apply_filters` for team/type/search) and `staff_review_summaries.py`'s shared-read pattern for detail/versions. No route returns a soft-deleted document by default; a possible future `?include_deleted=true` admin view is **not proposed here** (not evidenced as a requirement).

`GET /api/knowledge-documents/{id}/audit-log` is the one read route that requires a token (§7 rule 2) — every authenticated Management Team member may read it (no owner scoping), it is simply not public.

---

## 6. Google Ownership Status — Representation Recommendation

The task asked for a review of the ownership-status database representation, avoiding an unnecessarily rigid enum that would make adding a genuine `'Verified'` state difficult later. Three designs were considered:

| Option | Description | Verdict |
|---|---|---|
| A. Narrow CHECK, `'Verified'` excluded (the original REQ-KM-CRUD-002 draft) | `CHECK (google_ownership_status IN ('Not Applicable', 'Not Verified'))` | **Rejected this revision** — adding real verification later requires an `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT ...` migration just to unlock the value, even though the actual business risk (a false "Verified" claim) is really an application-layer concern, not a storage-layer one. |
| B. Lookup table (`knowledge_document_ownership_statuses`, FK) | A separate small reference table, `google_ownership_status_id` FK on `knowledge_documents` | **Rejected** — this repo has zero precedent for a lookup table anywhere in its schema; every other validated/enum-like field (`member_key`, `leave_type`, `priority`, `category`, `source_scope`, `staff_status`, `employment_stage`, `source_status`, `action`, `outcome`, `half_day_period`) uses a `VARCHAR` + `CheckConstraint`. Introducing a first-of-its-kind pattern for one field is architecture drift, not consistency. |
| **C. Validated `VARCHAR` + CHECK constraint that already includes `'Verified'`, enforcement moved to the application layer (recommended, adopted in §3.1)** | `CHECK (google_ownership_status IN ('Not Applicable', 'Not Verified', 'Verified'))`; no API route ever writes `'Verified'` until a dedicated future Google-verification feature exists | **Adopted.** Matches this repo's established `VARCHAR`+CHECK convention (no new pattern introduced), needs **zero future schema migration** to support real verification, and has a direct repo precedent for "a legal stored value whose real-world resolution is deliberately deferred": `employment_stage`'s `'[VERIFY]'` value (`backend/config.py`, `VALID_EMPLOYMENT_STAGES`) — a value the schema has always permitted, whose business meaning stays unresolved until HR acts, exactly the same shape as `'Verified'` here. |

**Recommendation: Option C**, as designed in §3.1. The safety guarantee ("no Google ownership claim may be marked verified without real verification") is enforced by **KnowledgeDocumentMetadataUpdate's Pydantic field validator never accepting `'Verified'` as input**, not by the database being structurally incapable of holding it. This is documented here explicitly because it is a deliberate choice, not an oversight: the database CAN hold `'Verified'` today; nothing in this design's API surface can ever cause it to.

---

## 7. Locked Business Rules (2026-08-10 — no longer open)

| # | Rule | Design enforcement |
|---|---|---|
| 1 | **Permission model**: any authenticated Management Team member may create/edit-metadata/create-version/archive/unarchive/soft-delete/restore/view-versions/view-audit — no creator-only ownership anywhere. Actor identity always server-derived from the existing verified token; never a client-supplied name. | Every route in §5 uses `Depends(get_verified_member)` with **no** subsequent owner-match check — a deliberate absence, contrasted explicitly against `StaffReviewSummary`'s owner-lock pattern in §2. |
| 2 | **Audit access**: any authenticated member may read the audit log; audit records are immutable through the application (no edit, no delete, no rewrite). | `GET .../audit-log` requires a token but has no owner scoping (§5.7); `knowledge_document_audit_log` has zero update/delete routes anywhere in §5 (§3.3). |
| 3 | **Title uniqueness**: title is NOT globally unique. Duplicate prevention uses the normalized active source URL instead — same active normalized URL → reject; same/similar title with a different URL → warning only, no AI similarity matching. | No `UNIQUE(title)` anywhere (§3.1). `idx_knowledge_documents_active_source_url_normalized` partial unique index + an API-layer pre-check (§5.1/§5.3) reject same-URL duplicates with 409. Title collision triggers only a non-blocking `warnings` array entry, using exact case-insensitive/trimmed matching — never fuzzy scoring. |
| 4 | **Sample records**: the 3 existing frontend sample records are NOT auto-migrated into PostgreSQL. When the API goes live, the static `APPROVED_DOCUMENTS` registry is removed/disabled and the frontend fetches from the API instead — no silent seed. | §3.1 no longer has a `seed_source` column (removed from the prior draft). §9 states this explicitly as an action NOT taken and NOT planned as an automatic step. |
| 5 | **Soft delete**: `deleted_at`, `deleted_by`, `delete_reason` must all be populated; no hard-delete route permitted. | `knowledge_documents_soft_delete_pairing_check` (§3.1) enforces all-three-or-none; `DELETE` route (§5.5) requires `delete_reason` in the request body (422 if missing); no table in this design has an application DELETE route that issues real SQL `DELETE`. |
| 6 | **Restore**: clear the active deletion state per the schema; preserve historical delete information via audit records, not by erasing it. | RESTORE (§5.6) clears `deleted_at`/`deleted_by`/`delete_reason` on the live row but never touches the original `soft_delete` audit row — the historical fact survives in `knowledge_document_audit_log` permanently. |
| 7 | Lifecycle Active/Archived separate from compliance Pending/Completed; Google ownership separate from both. | Three fully independent columns + three independent CHECK constraint groups (§3.1) — resolves the exact ambiguity flagged in the REQ-KM-001 discovery report §14. |
| 8 | Metadata-only updates do not create a version; explicit source revision does; version history append-only. | §5.2 never touches `knowledge_document_versions`/`current_version`; §5.3 is the only route that does; no update/delete route exists for `knowledge_document_versions` anywhere (§3.2). |
| 9 | Archive is not deletion. | `lifecycle_status='Archived'` never touches `deleted_at` (§5.4) — an archived-but-not-deleted document remains fully visible in every VIEW route. |
| 10 | External document remains authoritative; Management AIOS stores canonical registry metadata. | `source_url`/`source_url_normalized` are pointers in both `knowledge_documents` and `knowledge_document_versions`; no content/binary column exists anywhere. |
| 11 | No Google ownership claim marked verified without real verification. | §6 — `'Verified'` is DB-legal but no API route in §5 ever writes it. |
| 12 | Server determines mutation actor identity; no secrets in frontend. | Every `created_by`/`updated_by`/`deleted_by`/`actor_member_key` is set from `Depends(get_verified_member)` only, on every route in §5; reuses the existing Calendar-auth Bearer-token model exactly — no new secret type. |
| 13 | Protected HR path must not be accessed. | Confirmed untouched throughout this design task. |

No item in this table is an open question anymore — all were explicitly confirmed 2026-08-10 and are reflected in §3–§6 above.

---

## 8. Migration Plan (drafted, NOT executed)

**Migration execution: BLOCKED pending live read-only database inspection (§1).** A draft migration file exists at [`database/migrations/2026-08-10-create-knowledge-documents.sql`](../database/migrations/2026-08-10-create-knowledge-documents.sql), following this repo's exact established convention (idempotent `CREATE TABLE IF NOT EXISTS`, an explicit `DRAFT — NOT EXECUTED` header, post-`COMMIT` validation queries, rollback notes). It has **not** been run against any database. Applying it requires, in order:

1. §1's live `management_aios` inspection completed and confirming no conflicting object.
2. Explicit approval from Arun (requester) and, per this repo's standing convention, a human running the migration manually against the correct Neon instance (no migration in this repo's history has ever been auto-applied by an agent).
3. A separate, explicit decision on when to switch the frontend from `APPROVED_DOCUMENTS` (static) to the live API — **not** a data-seeding step (§7 rule 4).

---

## 9. What Was Not Done (explicit, per task instructions)

- No `CREATE`/`ALTER`/`INSERT`/`UPDATE`/`DELETE`/`DROP` statement was executed against any database.
- No `backend/routers/knowledge_documents.py`, `backend/schemas.py` addition, or any other runtime backend file was created or modified — §5's route bodies are illustrative design snippets embedded in this document only.
- No frontend file was modified — `web-view/js/knowledge-management.js`'s `APPROVED_DOCUMENTS` array is unchanged and still the live production data source. It was **not** seeded into any database table (§7 rule 4) and no automatic seeding is planned by this design.
- No push occurred.
- `member-aios/mayurika-hr/staff-data/` was never opened.

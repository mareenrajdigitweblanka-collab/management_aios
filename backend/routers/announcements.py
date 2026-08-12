"""Announcement & Notification backend API (REQ-ANN-001).

Operates against management_aios.announcements and
management_aios.announcement_mentions — both created by
database/migrations/2026-08-12-create-announcements.sql, executed against
the live database on 2026-08-12 (see the migration file's own EXECUTED
header and validation/announcement-notification-migration-execution-check-2026-08-12.md)
— this router never creates, alters, or drops that schema itself.

Self-mention (REQ-ANN-001 Stage A, 2026-08-12 production UX correction):
the original REQ-ANN-001 §4/§8 design allowed a member to mention
themselves. Production user acceptance on 2026-08-12 reversed that
decision — a member may no longer mention themselves. Enforced here by
_reject_self_mention (create + Draft update) and, on the read side, by
excluding the creator from _mention_keys, from the read-receipts query,
and from their own notification feed/unread count (_notification_query,
added 2026-08-12 as a Stage A follow-up) — never by mutating historical
announcement_mentions rows. Any self-mention row created before this
change (Phase 1 / early production testing) is preserved in the database
and is only ever filtered out at read time. The exclusion is scoped to
Announcement.created_by == acting_member specifically — a legitimate
mention on someone else's announcement is never affected.

Access (REQ-ANN-001 §2, confirmed business rule — verbatim, no MD carve-out
stated): any identity Depends(get_verified_member) resolves — the five
Management Team members AND MD — may create/edit/delete/publish their own
Drafts and read Published history. This is a deliberate, explicit divergence
from Knowledge Management/Staff Review Summaries' own _reject_md_write
precedent; the business rule as given here names no exception, so none is
added. MD can still never appear as a mention target — mention_member_keys
is validated against VALID_MEMBER_KEYS (backend/config.py), which does not
include "md" — so MD can never receive or be listed in a notification/
read-receipt regardless of this write access. Flagged explicitly in the
implementation report for user confirmation.

Draft ownership (REQ-ANN-001 §8): a Draft is visible/mutable ONLY to its
creator. Every Draft-scoped lookup (_get_owned_draft_or_404) filters
status='Draft' AND created_by=acting_member AND deleted_at IS NULL in the
query itself — a non-owner's request, a Published id, or an already-deleted
id are all indistinguishable 404s, mirroring
backend/routers/staff_review_summaries.py's own owner-only 404 convention
(never 403 — a 403 would confirm the record's existence/ownership to a
non-owner).

Published immutability (REQ-ANN-001 §5/§13): PATCH, DELETE, mention edits,
and re-publish all route through _get_owned_draft_or_404 above — a
Published id is therefore structurally invisible to every mutation route,
not merely conditionally rejected.

Draft mentions persist before Publish (REQ-ANN-001 §5 architecture
correction): management_aios.announcement_mentions holds BOTH the Draft-time
mention selection and the Published notification/read state in one table.
A Draft's mention rows have notified_at IS NULL and are therefore invisible
to every notification-facing query (_notification_feed_query,
unread-count) — Publish stamps notified_at on the existing rows; it never
inserts new ones.
"""

from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc
from sqlalchemy.orm import Session

from backend.config import VALID_MEMBER_KEYS, member_display_label
from backend.database import get_db
from backend.models import Announcement, AnnouncementMention
from backend.routers.calendar_auth import get_verified_member
from backend.schemas import (
    AnnouncementCreate,
    AnnouncementListResponse,
    AnnouncementMentionNotificationOut,
    AnnouncementNotificationFeedOut,
    AnnouncementOut,
    AnnouncementReadReceiptItemOut,
    AnnouncementReadReceiptsOut,
    AnnouncementUpdate,
)

router = APIRouter(prefix="/api/announcements", tags=["announcements"])

DEFAULT_LIMIT = 50
MAX_LIMIT = 500

_NOT_FOUND_DETAIL = "Announcement not found."
_MENTION_NOT_FOUND_DETAIL = "Notification not found."


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Shared lookups ───────────────────────────────────────────────────────


def _get_published_or_404(db: Session, announcement_id: UUID) -> Announcement:
    """Used by DETAIL (Published branch) and read-receipts — any
    authenticated member may reach a Published, non-deleted announcement.
    Published rows are never soft-deleted (announcements_delete_only_
    while_draft_check), but the deleted_at filter is kept as defense-in-
    depth, matching this codebase's existing double-layer convention."""
    record = (
        db.query(Announcement)
        .filter(
            Announcement.id == announcement_id,
            Announcement.status == "Published",
            Announcement.deleted_at.is_(None),
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND_DETAIL)
    return record


def _get_owned_draft_or_404(db: Session, announcement_id: UUID, acting_member: str) -> Announcement:
    """THE single ownership gate for every Draft mutation route (PATCH,
    DELETE, Publish) — scopes status='Draft' AND created_by=acting_member
    AND deleted_at IS NULL in the query itself, so a Published id, another
    member's Draft, or an already-deleted Draft are all indistinguishable
    404s. This is what makes Published-record mutation structurally
    impossible via the API (technical design §5) — there is no code path
    in this file that ever loads a Published row and then decides to
    reject it; a Published id simply never matches this query."""
    record = (
        db.query(Announcement)
        .filter(
            Announcement.id == announcement_id,
            Announcement.status == "Draft",
            Announcement.created_by == acting_member,
            Announcement.deleted_at.is_(None),
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND_DETAIL)
    return record


def _mention_keys(db: Session, announcement_id: UUID, exclude_member: str = None) -> List[str]:
    """Mentioned member keys for an announcement. exclude_member (always
    the announcement's own creator, passed by _to_out below) hides a
    historical self-mention from every mention-display surface — Published
    History's "Mentioned: ..." line and a Draft's mention-picker prefill —
    without touching the underlying announcement_mentions row. Read-time
    filter only; see module docstring."""
    query = db.query(AnnouncementMention.mentioned_member_key).filter(
        AnnouncementMention.announcement_id == announcement_id
    )
    if exclude_member is not None:
        query = query.filter(AnnouncementMention.mentioned_member_key != exclude_member)
    rows = query.order_by(asc(AnnouncementMention.mentioned_member_key)).all()
    return [r[0] for r in rows]


def _to_out(db: Session, record: Announcement) -> AnnouncementOut:
    return AnnouncementOut(
        id=record.id,
        title=record.title,
        body=record.body,
        status=record.status,
        created_by=record.created_by,
        created_at=record.created_at,
        updated_at=record.updated_at,
        published_at=record.published_at,
        mention_member_keys=_mention_keys(db, record.id, exclude_member=record.created_by),
    )


_SELF_MENTION_DETAIL = "You cannot mention yourself in an announcement."


def _reject_self_mention(acting_member: str, mention_member_keys: List[str]) -> None:
    """Backend defense-in-depth for the frontend's own self-exclusion
    (web-view/js/announcements.js's buildMentionPicker never renders the
    acting member as a selectable option) — the API is directly callable
    outside the UI, so this is the actual enforcement point. Called from
    every mutation path that writes mention_member_keys: create and Draft
    update (REQ-ANN-001 Stage A)."""
    if acting_member in mention_member_keys:
        raise HTTPException(status_code=422, detail=_SELF_MENTION_DETAIL)


def _reconcile_mentions(db: Session, announcement_id: UUID, target_keys: List[str], now: datetime) -> None:
    """Replaces a Draft's full mention set with target_keys — inserts
    newly-added keys, deletes removed ones, leaves unchanged keys' rows
    (and therefore their created_at) untouched. Only ever called for a
    Draft (the caller already holds an owned-Draft row from
    _get_owned_draft_or_404), so every row this function touches has
    notified_at IS NULL by construction — this function never sets or
    clears notified_at/read_at. `now` is passed in (never computed here)
    so every row inserted in the same request shares one timestamp,
    matching this codebase's existing "one now() per request" convention
    (e.g. knowledge_documents.py create_knowledge_document); it is also
    always explicitly set (never left to the column's server_default)
    since SQLite — used by every test in this codebase — has no now()
    function, unlike PostgreSQL."""
    existing = {
        row.mentioned_member_key: row
        for row in db.query(AnnouncementMention)
        .filter(AnnouncementMention.announcement_id == announcement_id)
        .all()
    }
    target_set = set(target_keys)

    for key, row in existing.items():
        if key not in target_set:
            db.delete(row)

    for key in target_keys:
        if key not in existing:
            db.add(AnnouncementMention(
                announcement_id=announcement_id,
                mentioned_member_key=key,
                created_at=now,
            ))


# ── LIST — Published History ─────────────────────────────────────────────


@router.get("", response_model=AnnouncementListResponse)
def list_published_announcements(
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Published Announcement History — every authenticated member (any
    identity get_verified_member resolves, including MD), newest-published-
    first. Never includes Draft or soft-deleted rows."""
    query = db.query(Announcement).filter(
        Announcement.status == "Published",
        Announcement.deleted_at.is_(None),
    )
    total = query.count()
    rows = (
        query.order_by(Announcement.published_at.desc(), asc(Announcement.id))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return AnnouncementListResponse(
        records=[_to_out(db, r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


# ── LIST — Own Drafts ─────────────────────────────────────────────────────


@router.get("/drafts", response_model=AnnouncementListResponse)
def list_own_drafts(
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Registered BEFORE GET /{announcement_id} — same static-path-before-
    dynamic-path convention as knowledge_documents.py's GET /deleted (see
    that router's own docstring for the full reasoning): otherwise a
    request to GET /api/announcements/drafts would match /{announcement_id}
    first (announcement_id="drafts") and fail UUID validation with a 422.

    Scoped to created_by=acting_member only — one member never sees another
    member's Drafts (REQ-ANN-001 §8)."""
    query = db.query(Announcement).filter(
        Announcement.status == "Draft",
        Announcement.created_by == acting_member,
        Announcement.deleted_at.is_(None),
    )
    total = query.count()
    rows = (
        query.order_by(Announcement.created_at.desc(), asc(Announcement.id))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return AnnouncementListResponse(
        records=[_to_out(db, r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


# ── Notification feed / unread count ──────────────────────────────────────

_BODY_PREVIEW_LIMIT = 140


def _body_preview(body: str) -> str:
    """Short excerpt used by the Notification History tab to identify an
    announcement without a second request (REQ-ANN-001 Stage A §9) — the
    body is already loaded (joined in every query below), so this is a
    cheap in-memory truncation, never a separate query/column."""
    trimmed = (body or "").strip()
    if len(trimmed) <= _BODY_PREVIEW_LIMIT:
        return trimmed
    return trimmed[:_BODY_PREVIEW_LIMIT].rstrip() + "…"


def _notification_query(db: Session, acting_member: str):
    """THE single query shape behind both the bell feed and the unread
    count — requires status='Published' AND notified_at IS NOT NULL, so a
    Draft's mention rows (notified_at IS NULL) can never appear here
    regardless of how long the Draft sits unpublished (technical design
    §3 — mandatory architecture correction).

    Also excludes Announcement.created_by == acting_member (REQ-ANN-001
    Stage A follow-up, 2026-08-12) — a member can no longer self-mention
    going forward (_reject_self_mention), but a historical self-mention
    row from before that change may still exist. Read-time filter only,
    same pattern as _mention_keys/read-receipts: the row itself is never
    modified or deleted. This only ever removes the acting member's OWN
    self-mention from THEIR OWN feed — mentions on announcements created
    by someone else are completely unaffected, since Announcement.created_by
    is compared against acting_member, not against every mentioned_member_key
    in general."""
    return (
        db.query(AnnouncementMention, Announcement)
        .join(Announcement, Announcement.id == AnnouncementMention.announcement_id)
        .filter(
            AnnouncementMention.mentioned_member_key == acting_member,
            AnnouncementMention.notified_at.isnot(None),
            Announcement.status == "Published",
            Announcement.deleted_at.is_(None),
            Announcement.created_by != acting_member,
        )
    )


@router.get("/notifications", response_model=AnnouncementNotificationFeedOut)
def get_notification_feed(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Registered BEFORE GET /{announcement_id} — same static-path
    reasoning as GET /drafts above. Single endpoint for both the 30s
    unread-count poll (read only .unread_count) and the Notification
    History tab (read .items) — smallest API surface (REQ-ANN-001 §12)
    computed from one consistent query so the two can never disagree.
    Never exposes another member's feed — always scoped to acting_member.
    Newest-notified-first (notified_at DESC) — the Notification History
    tab renders this order verbatim (REQ-ANN-001 Stage A §9)."""
    base = _notification_query(db, acting_member)
    unread_count = base.filter(AnnouncementMention.read_at.is_(None)).count()

    rows = (
        base.order_by(AnnouncementMention.notified_at.desc(), asc(AnnouncementMention.id))
        .limit(limit)
        .all()
    )
    items = [
        AnnouncementMentionNotificationOut(
            mention_id=mention.id,
            announcement_id=announcement.id,
            title=announcement.title,
            created_by=announcement.created_by,
            published_at=announcement.published_at,
            read_at=mention.read_at,
            body_preview=_body_preview(announcement.body),
        )
        for mention, announcement in rows
    ]
    return AnnouncementNotificationFeedOut(unread_count=unread_count, items=items)


@router.post("/notifications/{mention_id}/read", response_model=AnnouncementMentionNotificationOut)
def mark_notification_read(
    mention_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Current mentioned member only — a mention_id belonging to another
    member, or one that is not yet a notification (notified_at IS NULL,
    i.e. still a Draft-time selection), is a 404 either way (non-
    disclosing). Idempotent: if already read, returns success without
    changing the original read_at (REQ-ANN-001 §12)."""
    row = (
        db.query(AnnouncementMention, Announcement)
        .join(Announcement, Announcement.id == AnnouncementMention.announcement_id)
        .filter(
            AnnouncementMention.id == mention_id,
            AnnouncementMention.mentioned_member_key == acting_member,
            AnnouncementMention.notified_at.isnot(None),
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail=_MENTION_NOT_FOUND_DETAIL)

    mention, announcement = row
    if mention.read_at is None:
        mention.read_at = _now()
        db.commit()
        db.refresh(mention)

    return AnnouncementMentionNotificationOut(
        mention_id=mention.id,
        announcement_id=announcement.id,
        title=announcement.title,
        created_by=announcement.created_by,
        published_at=announcement.published_at,
        read_at=mention.read_at,
        body_preview=_body_preview(announcement.body),
    )


# ── DETAIL ────────────────────────────────────────────────────────────────


@router.get("/{announcement_id}", response_model=AnnouncementOut)
def get_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Published: any authenticated member. Draft: creator only — falls
    back to the owned-Draft lookup (404 for non-owner) when the Published
    lookup finds nothing, so a Draft id and a nonexistent id are
    indistinguishable to anyone but its creator."""
    record = (
        db.query(Announcement)
        .filter(
            Announcement.id == announcement_id,
            Announcement.status == "Published",
            Announcement.deleted_at.is_(None),
        )
        .first()
    )
    if record is None:
        record = _get_owned_draft_or_404(db, announcement_id, acting_member)
    return _to_out(db, record)


# ── CREATE ────────────────────────────────────────────────────────────────


@router.post("", response_model=AnnouncementOut, status_code=201)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Always creates a Draft. created_by is server-derived only —
    AnnouncementCreate has no such field, so a client cannot spoof it.
    Mention rows are inserted with notified_at/read_at both NULL — pure
    Draft-time selections, invisible to every notification query until
    Publish (technical design §3). Self-mention is rejected before any
    row is written (REQ-ANN-001 Stage A)."""
    _reject_self_mention(acting_member, payload.mention_member_keys)
    now = _now()
    announcement = Announcement(
        title=payload.title,
        body=payload.body,
        status="Draft",
        created_by=acting_member,
        created_at=now,
        updated_at=now,
    )
    db.add(announcement)
    db.flush()  # populates announcement.id before the mention rows below

    for key in payload.mention_member_keys:
        db.add(AnnouncementMention(
            announcement_id=announcement.id,
            mentioned_member_key=key,
            created_at=now,
        ))

    db.commit()
    db.refresh(announcement)
    return _to_out(db, announcement)


# ── UPDATE (Draft only) ───────────────────────────────────────────────────


@router.patch("/{announcement_id}", response_model=AnnouncementOut)
def update_announcement_draft(
    announcement_id: UUID,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Creator-only, Draft-only (_get_owned_draft_or_404 — a Published id
    is invisible to this route, never a 409). mention_member_keys, when
    supplied (including []), replaces the full mention set; omitted means
    unchanged. Self-mention is rejected before any row is touched
    (REQ-ANN-001 Stage A)."""
    announcement = _get_owned_draft_or_404(db, announcement_id, acting_member)
    if payload.mention_member_keys is not None:
        _reject_self_mention(acting_member, payload.mention_member_keys)
    now = _now()

    if payload.title is not None:
        announcement.title = payload.title
    if payload.body is not None:
        announcement.body = payload.body
    if payload.mention_member_keys is not None:
        _reconcile_mentions(db, announcement.id, payload.mention_member_keys, now)

    announcement.updated_at = now

    db.commit()
    db.refresh(announcement)
    return _to_out(db, announcement)


# ── DELETE (Draft only, soft) ─────────────────────────────────────────────


@router.delete("/{announcement_id}")
def delete_announcement_draft(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Creator-only, Draft-only. Soft delete only (deleted_at/deleted_by) —
    no delete_reason column (Phase-1 simplification, REQ-ANN-001 §9). No
    SQL DELETE is ever issued. A Published id is invisible to
    _get_owned_draft_or_404, so this route can never soft-delete a
    Published announcement (announcements_delete_only_while_draft_check
    backs this at the database layer too)."""
    announcement = _get_owned_draft_or_404(db, announcement_id, acting_member)

    announcement.deleted_at = _now()
    announcement.deleted_by = acting_member

    db.commit()
    return {"id": str(announcement.id), "deleted": True}


# ── PUBLISH ───────────────────────────────────────────────────────────────


@router.post("/{announcement_id}/publish", response_model=AnnouncementOut)
def publish_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Creator-only, Draft-only. In one transaction: re-verifies the Draft
    is still active (via the same owned-Draft lookup — a concurrent/
    double Publish call finds nothing the second time since status is no
    longer 'Draft', so it 404s rather than double-publishing), sets
    status='Published' and published_at, and stamps notified_at on every
    existing mention row for this announcement — this is the ONLY place
    notified_at is ever set, and it never inserts new mention rows (the
    mention set was already finalized during the Draft; see
    _reconcile_mentions). After commit, the announcement and its mention
    set are permanent (technical design §5)."""
    announcement = _get_owned_draft_or_404(db, announcement_id, acting_member)

    now = _now()
    announcement.status = "Published"
    announcement.published_at = now
    announcement.updated_at = now

    (
        db.query(AnnouncementMention)
        .filter(AnnouncementMention.announcement_id == announcement.id)
        .update({AnnouncementMention.notified_at: now}, synchronize_session=False)
    )

    db.commit()
    db.refresh(announcement)
    return _to_out(db, announcement)


# ── READ RECEIPTS ─────────────────────────────────────────────────────────


@router.get("/{announcement_id}/read-receipts", response_model=AnnouncementReadReceiptsOut)
def get_read_receipts(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Published announcement creator only (REQ-ANN-001 §5/§12). A
    Published announcement not created by acting_member, a Draft id, or a
    nonexistent id are all a 404 either way — never disclosing another
    creator's receipt list.

    The creator is excluded from the receipt list and from
    mentioned/read/unread counts (REQ-ANN-001 Stage A) — a creator can no
    longer self-mention going forward, but historical self-mention rows
    (Phase 1 / early production testing) may still exist. This is a
    read-time filter only; the underlying announcement_mentions row, if
    any, is never modified or deleted."""
    announcement = _get_published_or_404(db, announcement_id)
    if announcement.created_by != acting_member:
        raise HTTPException(status_code=404, detail=_NOT_FOUND_DETAIL)

    mentions = (
        db.query(AnnouncementMention)
        .filter(
            AnnouncementMention.announcement_id == announcement.id,
            AnnouncementMention.notified_at.isnot(None),
            AnnouncementMention.mentioned_member_key != announcement.created_by,
        )
        .order_by(asc(AnnouncementMention.mentioned_member_key))
        .all()
    )
    receipts = [
        AnnouncementReadReceiptItemOut(
            member_key=m.mentioned_member_key,
            display_label=member_display_label(m.mentioned_member_key)
            if m.mentioned_member_key in VALID_MEMBER_KEYS
            else m.mentioned_member_key,
            read=m.read_at is not None,
            read_at=m.read_at,
        )
        for m in mentions
    ]
    read_count = sum(1 for r in receipts if r.read)
    return AnnouncementReadReceiptsOut(
        announcement_id=announcement.id,
        mentioned_count=len(receipts),
        read_count=read_count,
        unread_count=len(receipts) - read_count,
        receipts=receipts,
    )

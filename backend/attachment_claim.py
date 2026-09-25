"""Application-enforced integrity for attaching pending files to a Review
Summary (2026-09-25).

management_aios.staff_review_summary_attachments.summary_id has NO foreign
key (approved design — the application role lacks REFERENCES on
staff_review_summaries), so the database cannot itself refuse a link to a
missing, deleted, or someone-else's summary, nor a pending file that
another request already claimed. This module is the single place that
writes summary_id, and it refuses unless ALL of the following hold, inside
the caller's open transaction:

  1. the summary exists (it was flushed by the caller in this same
     transaction), is active (deleted_at IS NULL), and belongs to the
     acting reviewer;
  2. the summary will hold at most MAX_ATTACHMENTS_PER_SUMMARY attachments
     (files already linked + files being claimed);
  3. every attachment being claimed is still pending (summary_id IS NULL)
     and was uploaded by the acting reviewer — enforced by ONE conditional
     UPDATE whose row count must equal the number of ids, so a concurrent
     request that claimed one of them first makes this claim fail instead
     of silently double-attaching or stealing it.

On any violation it raises AttachmentClaimError WITHOUT committing or
rolling back; the caller rolls back, so the new summary row is never
persisted without its files (the atomicity the upload flow promises).
Read-only orphan detection lives in backend/attachment_integrity.py.
"""

from typing import Sequence
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.config import MAX_ATTACHMENTS_PER_SUMMARY
from backend.models import StaffReviewSummary, StaffReviewSummaryAttachment


class AttachmentClaimError(Exception):
    """Carries a client-safe message; the router maps it to HTTP 422."""


def claim_pending_attachments_for_summary(
    db: Session,
    *,
    summary_id: UUID,
    acting_member: str,
    attachment_ids: Sequence[UUID],
) -> int:
    """Links the given pending attachments to summary_id. Returns how many
    were linked. No-op (returns 0) for an empty list. Never commits."""
    unique_ids = list(dict.fromkeys(attachment_ids))
    if not unique_ids:
        return 0

    summary_ok = (
        db.query(StaffReviewSummary.id)
        .filter(
            StaffReviewSummary.id == summary_id,
            StaffReviewSummary.reviewer_member_key == acting_member,
            StaffReviewSummary.deleted_at.is_(None),
        )
        .first()
    )
    if summary_ok is None:
        raise AttachmentClaimError(
            "Attachments can only be added to an active review summary owned by the same reviewer."
        )

    already_linked = (
        db.query(func.count(StaffReviewSummaryAttachment.id))
        .filter(StaffReviewSummaryAttachment.summary_id == summary_id)
        .scalar()
        or 0
    )
    if already_linked + len(unique_ids) > MAX_ATTACHMENTS_PER_SUMMARY:
        raise AttachmentClaimError(
            "A review summary can have at most %d attachments." % MAX_ATTACHMENTS_PER_SUMMARY
        )

    claimed = (
        db.query(StaffReviewSummaryAttachment)
        .filter(
            StaffReviewSummaryAttachment.id.in_(unique_ids),
            StaffReviewSummaryAttachment.summary_id.is_(None),
            StaffReviewSummaryAttachment.uploaded_by == acting_member,
        )
        .update({StaffReviewSummaryAttachment.summary_id: summary_id}, synchronize_session=False)
    )
    if claimed != len(unique_ids):
        raise AttachmentClaimError(
            "One or more attachments are missing, already attached to a summary, or were not "
            "uploaded by this reviewer."
        )
    return claimed

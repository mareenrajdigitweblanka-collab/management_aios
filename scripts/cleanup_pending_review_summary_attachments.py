#!/usr/bin/env python3
"""Cleanup for orphaned "pending" Review Summary attachments
(REQ-CAL-REV-ATTACH-001, 2026-09-23).

A "pending" attachment (management_aios.staff_review_summary_attachments,
summary_id IS NULL) is one whose file was already durably uploaded to
Cloudinary but was never claimed by a completed
POST /api/staff-review-summaries call — the browser tab was closed, the
network dropped, or the reviewer simply abandoned the draft after
attaching files. This is the "partial upload" the approved requirement
asks to be cleaned up. It is never the summary row itself that is
partial — see backend/routers/staff_review_summaries.py
create_staff_review_summary's own docstring for why a summary can never be
created with a missing/partial attachment list in the first place.

This backend has no in-process background job scheduler (same "no job
queue exists, do not invent one" reasoning already applied elsewhere in
this repo) — this script is meant to be run periodically by hand or via an
external cron/scheduled task, not automatically by the API process itself.

Usage:
    python -m scripts.cleanup_pending_review_summary_attachments [--dry-run]
        [--older-than-hours N]

--dry-run (default False): report what WOULD be deleted (storage asset +
    database row) without deleting anything. Always run this first against
    a new environment.
--older-than-hours (default backend/config.py
    PENDING_ATTACHMENT_CLEANUP_AGE_HOURS, currently 24): only rows pending
    for at least this long are eligible — a reviewer who is mid-draft right
    now, with files already uploaded but the Save button not yet pressed,
    must never have their in-progress upload deleted out from under them.

Never touches a row that has already been claimed (summary_id IS NOT
NULL) — the WHERE clause below is identical in shape to the partial index
idx_staff_review_summary_attachments_pending
(database/migrations/2026-09-23-create-staff-review-summary-attachments.sql),
so this script can never delete a real, attached attachment.
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone

from backend.attachment_storage import get_attachment_storage
from backend.config import PENDING_ATTACHMENT_CLEANUP_AGE_HOURS
from backend.database import get_session_factory
from backend.models import StaffReviewSummaryAttachment


def find_stale_pending_attachments(db, older_than_hours: int):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=older_than_hours)
    return (
        db.query(StaffReviewSummaryAttachment)
        .filter(
            StaffReviewSummaryAttachment.summary_id.is_(None),
            StaffReviewSummaryAttachment.created_at < cutoff,
        )
        .order_by(StaffReviewSummaryAttachment.created_at)
        .all()
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--older-than-hours", type=int, default=PENDING_ATTACHMENT_CLEANUP_AGE_HOURS
    )
    args = parser.parse_args()

    session_factory = get_session_factory()
    db = session_factory()
    storage = get_attachment_storage()

    try:
        stale = find_stale_pending_attachments(db, args.older_than_hours)
        if not stale:
            print("No stale pending attachments found.")
            return

        print(
            f"Found {len(stale)} stale pending attachment(s) "
            f"(pending for more than {args.older_than_hours} hour(s))."
        )
        for attachment in stale:
            age = datetime.now(timezone.utc) - attachment.created_at
            print(
                f"  id={attachment.id} uploaded_by={attachment.uploaded_by} "
                f"filename={attachment.original_filename!r} "
                f"age={age} storage_public_id={attachment.storage_public_id}"
            )

        if args.dry_run:
            print("\n--dry-run: nothing was deleted.")
            return

        deleted_count = 0
        for attachment in stale:
            try:
                storage.delete(attachment.storage_public_id, attachment.storage_resource_type)
            except Exception as exc:
                print(
                    f"  WARNING: could not delete storage asset for id={attachment.id} "
                    f"({exc}); leaving the database row in place for a future retry."
                )
                continue
            db.delete(attachment)
            deleted_count += 1

        db.commit()
        print(f"\nDeleted {deleted_count} of {len(stale)} stale pending attachment(s).")
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())

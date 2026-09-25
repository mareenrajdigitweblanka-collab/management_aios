#!/usr/bin/env python3
"""Read-only orphan check for Review Summary attachments (2026-09-24).

Prints the target database identity (never credentials), the attachment and
summary row counts, the number of linked / pending attachments, and every
orphan — a linked attachment whose summary does not exist. Exit code 0 =
zero orphans, 1 = orphans found, 2 = the table/database is not usable.
The connection is opened READ ONLY; nothing is written.

    python -m scripts.check_review_summary_attachment_orphans
"""

import sys

from sqlalchemy import create_engine, text

from backend.attachment_integrity import ATTACHMENTS_TABLE, SUMMARIES_TABLE, find_orphan_attachments
from backend.config import DATABASE_URL


def main() -> int:
    if not DATABASE_URL:
        print("DATABASE_URL is not set.")
        return 2
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    url = engine.url
    print("Target database: %s:%s/%s" % (url.host, url.port, url.database))
    with engine.connect() as conn:
        conn.execute(text("SET TRANSACTION READ ONLY"))
        if conn.execute(text("SELECT to_regclass(:n) IS NULL"), {"n": ATTACHMENTS_TABLE}).scalar():
            print("%s does not exist." % ATTACHMENTS_TABLE)
            return 2
        total, linked = conn.execute(
            text("SELECT count(*), count(*) FILTER (WHERE summary_id IS NOT NULL) FROM " + ATTACHMENTS_TABLE)
        ).one()
        summaries = conn.execute(text("SELECT count(*) FROM " + SUMMARIES_TABLE)).scalar()
        orphans = find_orphan_attachments(conn)
    print("attachments: total=%d linked=%d pending=%d | summaries=%d" % (total, linked, total - linked, summaries))
    for attachment_id, summary_id in orphans:
        print("ORPHAN attachment %s -> missing summary %s" % (attachment_id, summary_id))
    print("orphans: %d" % len(orphans))
    return 1 if orphans else 0


if __name__ == "__main__":
    sys.exit(main())

"""Read-only integrity check for Review Summary attachment links
(2026-09-24).

management_aios.staff_review_summary_attachments.summary_id has NO foreign
key (approved design — the application role lacks REFERENCES on
staff_review_summaries), so referential integrity is enforced by the
application and VERIFIED here. An "orphan" is a linked attachment
(summary_id IS NOT NULL) whose summary row does not exist. This module only
ever SELECTs.

Used by scripts/check_review_summary_attachment_orphans.py (standalone
check), scripts/transfer_local_attachment_metadata_to_postgres.py (post-
insert verification inside the transfer transaction), and the tests.
"""

import uuid
from typing import List, Optional, Sequence

from sqlalchemy import text

ATTACHMENTS_TABLE = "management_aios.staff_review_summary_attachments"
SUMMARIES_TABLE = "management_aios.staff_review_summaries"

# Identical in shape to validation query 6 in database/migrations/
# 2026-09-23-create-staff-review-summary-attachments.sql.
ORPHAN_QUERY = (
    "SELECT a.id, a.summary_id "
    "FROM " + ATTACHMENTS_TABLE + " a "
    "LEFT JOIN " + SUMMARIES_TABLE + " s ON s.id = a.summary_id "
    "WHERE a.summary_id IS NOT NULL AND s.id IS NULL"
)


def find_orphan_attachments(connection, attachment_ids: Optional[Sequence] = None) -> List[tuple]:
    """Returns [(attachment_id, summary_id), ...] for every linked attachment
    whose summary does not exist — restricted to attachment_ids when given.
    `connection` is a SQLAlchemy Connection or Session (read-only use)."""
    query = ORPHAN_QUERY
    params = {}
    if attachment_ids is not None:
        dialect = getattr(connection, "dialect", None) or connection.get_bind().dialect
        # SQLAlchemy's Uuid type is stored as CHAR(32) hex on SQLite (tests only)
        as_param = (lambda v: uuid.UUID(str(v)).hex) if dialect.name == "sqlite" else (lambda v: str(v))
        ids = [as_param(i) for i in attachment_ids]
        if not ids:
            return []
        placeholders = ", ".join(":id%d" % n for n in range(len(ids)))
        query += " AND a.id IN (" + placeholders + ")"
        params = {"id%d" % n: value for n, value in enumerate(ids)}
    return [tuple(row) for row in connection.execute(text(query), params).fetchall()]

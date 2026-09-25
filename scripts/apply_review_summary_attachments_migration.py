#!/usr/bin/env python3
"""Applies database/migrations/2026-09-23-create-staff-review-summary-
attachments.sql to the database in DATABASE_URL (2026-09-24).

    python -m scripts.apply_review_summary_attachments_migration
        DRY RUN (default): prints the target identity, whether the parent
        table and the attachment table exist, and the role's CREATE right.
        Writes nothing.

    python -m scripts.apply_review_summary_attachments_migration --apply --confirm-target HOST:PORT/DATABASE
        Runs the migration's transactional DDL block (BEGIN ... COMMIT) and
        then its read-only validation queries. --confirm-target must equal
        the identity printed by the dry run.

The migration is one transaction that RAISES on a wrong database or an
incompatible pre-existing table; this runner stops on that error and rolls
back (nothing is left half-applied). No foreign key, no grant and no
extension is needed — only CREATE on schema management_aios.
The equivalent psql command is:
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/2026-09-23-create-staff-review-summary-attachments.sql
"""

import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

from backend.config import DATABASE_URL

MIGRATION = Path("database/migrations/2026-09-23-create-staff-review-summary-attachments.sql")
ATTACHMENTS = "management_aios.staff_review_summary_attachments"


def split_migration(sql: str):
    """(transactional_ddl, validation_sql). The DDL block ends at the first
    'COMMIT;' line; everything after it is the read-only validation section
    (whose trailing rollback notes are all comments)."""
    marker = "\nCOMMIT;"
    cut = sql.index(marker) + len(marker)
    return sql[:cut], sql[cut:]


def identity(engine) -> str:
    return "%s:%s/%s" % (engine.url.host, engine.url.port or 5432, engine.url.database)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm-target", default=None)
    args = parser.parse_args(argv)
    if not DATABASE_URL:
        print("DATABASE_URL is not set.")
        return 2
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    target = identity(engine)
    with engine.connect() as conn:
        conn.execute(text("SET TRANSACTION READ ONLY"))
        role = conn.execute(text("SELECT current_user")).scalar()
        parent = conn.execute(text("SELECT to_regclass('management_aios.staff_review_summaries') IS NOT NULL")).scalar()
        exists = conn.execute(text("SELECT to_regclass(:n) IS NOT NULL"), {"n": ATTACHMENTS}).scalar()
        can_create = conn.execute(text("SELECT has_schema_privilege(current_user, 'management_aios', 'CREATE')")).scalar()
    print("Target database: %s (role %s)" % (target, role))
    print("management_aios.staff_review_summaries exists: %s" % parent)
    print("%s exists: %s%s" % (ATTACHMENTS, exists, " (will be VERIFIED, not recreated)" if exists else ""))
    print("CREATE on schema management_aios: %s" % can_create)
    if not args.apply:
        print("DRY RUN - nothing written.")
        return 0 if parent and (exists or can_create) else 3
    if args.confirm_target != target:
        print("Refusing --apply: --confirm-target must be exactly %r." % target)
        return 2
    if not parent or not (exists or can_create):
        print("Refusing --apply: prerequisites above are not met.")
        return 3

    ddl, validation = split_migration(MIGRATION.read_text(encoding="utf-8"))
    raw = engine.raw_connection()
    try:
        raw.autocommit = True
        cursor = raw.cursor()
        try:
            cursor.execute(ddl)
        except Exception as exc:
            try:
                cursor.execute("ROLLBACK")
            except Exception:
                pass
            print("MIGRATION FAILED (rolled back, nothing applied): %s" % str(exc).strip().splitlines()[0])
            for line in str(exc).strip().splitlines()[1:6]:
                print("  " + line)
            return 1
        print("MIGRATION APPLIED.")
        cursor.execute("SET default_transaction_read_only = on")
        code = "\n".join(l for l in validation.splitlines() if not l.strip().startswith("--"))
        for body in [part.strip() for part in code.split(";") if part.strip()]:
            cursor.execute(body)
            rows = cursor.fetchall()
            print("validation: %s ... -> %d row(s)%s" % (" ".join(body.split())[:70], len(rows), (" " + str(rows[0])) if len(rows) == 1 else ""))
    finally:
        raw.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

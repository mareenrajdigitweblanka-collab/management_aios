"""Tests for scripts/transfer_local_attachment_metadata_to_postgres.py
(2026-09-24).

The PostgreSQL target is the repo's usual isolated in-memory SQLite database
(make_sqlite_engine_and_session_factory — a `management_aios` schema is
ATTACHed, same as every other backend test); the source is a throw-away
on-disk SQLite file in a temp directory shaped exactly like
local_data/local_prototype_attachments.db. Neither the real PostgreSQL
database nor the real local_data/ file is ever touched.

Run with: python -m unittest backend.tests.test_transfer_local_attachment_metadata
"""

import hashlib
import sqlite3
import tempfile
import unittest
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from backend.attachment_storage import ATTACHMENT_STORAGE_FOLDER
from backend.models import StaffReviewSummary
from backend.tests.calendar_auth_test_support import make_sqlite_engine_and_session_factory
from scripts import transfer_local_attachment_metadata_to_postgres as transfer

SOURCE_DDL = """
CREATE TABLE local_attachment_metadata (
    id CHAR(32) NOT NULL, summary_id CHAR(32), uploaded_by VARCHAR NOT NULL,
    original_filename VARCHAR(255) NOT NULL, content_type VARCHAR(120) NOT NULL,
    attachment_type VARCHAR(20) NOT NULL, file_size_bytes INTEGER NOT NULL,
    storage_provider VARCHAR(20) NOT NULL, storage_public_id VARCHAR(255) NOT NULL,
    storage_resource_type VARCHAR(20) NOT NULL, created_at DATETIME NOT NULL,
    PRIMARY KEY (id))
"""


def source_row(**overrides):
    row = {
        "id": uuid.uuid4().hex,
        "summary_id": None,
        "uploaded_by": "arun",
        "original_filename": "notes.docx",
        "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "attachment_type": "word",
        "file_size_bytes": 1234,
        "storage_provider": "cloudinary",
        "storage_public_id": ATTACHMENT_STORAGE_FOLDER + "/" + str(uuid.uuid4()),
        "storage_resource_type": "raw",
        "created_at": "2026-09-23 09:30:00.123456",  # SQLite stores naive UTC
    }
    row.update(overrides)
    return row


class TransferTestCase(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.source_path = self.tmp / "local_prototype_attachments.db"
        conn = sqlite3.connect(self.source_path)
        conn.execute(SOURCE_DDL)
        conn.commit()
        conn.close()

    def tearDown(self):
        self.engine.dispose()
        self._tmp.cleanup()

    # helpers
    def write_source(self, rows):
        conn = sqlite3.connect(self.source_path)
        cols = transfer.COLUMNS
        for r in rows:
            conn.execute(
                "INSERT INTO local_attachment_metadata (%s) VALUES (%s)" % (", ".join(cols), ", ".join("?" * len(cols))),
                [r[c] for c in cols],
            )
        conn.commit()
        conn.close()

    def add_summary(self, deleted=False):
        session = self.SessionLocal()
        now = datetime.now(timezone.utc)
        summary = StaffReviewSummary(
            reviewer_member_key="arun", reviewed_staff_id=1, meeting_date=now.date(),
            summary_text="text", created_at=now, updated_at=now,
            deleted_at=now if deleted else None,
        )
        session.add(summary)
        session.commit()
        summary_id = summary.id
        session.close()
        return summary_id

    def state(self):
        readiness = transfer.check_target_readiness(self.engine)
        return transfer.load_target_state(self.engine, readiness["table_exists"])

    def run_analysis(self, include_pending=False):
        summaries, by_id, by_public_id = self.state()
        return transfer.analyze(
            transfer.read_sqlite_rows(self.source_path), summaries=summaries,
            target_by_id=by_id, target_by_public_id=by_public_id, include_pending=include_pending,
        )

    def target_count(self):
        return transfer.count_rows(self.engine, transfer.TARGET_TABLE)


class ClassificationTests(TransferTestCase):
    def test_linked_row_to_existing_summary_is_importable_and_ids_are_preserved(self):
        sid = self.add_summary()
        row = source_row(summary_id=sid.hex)
        self.write_source([row])
        analysis = self.run_analysis()
        self.assertEqual(analysis.count(transfer.IMPORTABLE), 1)
        self.assertEqual(analysis.blocking, [])
        imported = analysis.to_insert[0]
        self.assertEqual(imported["id"], uuid.UUID(row["id"]))
        self.assertEqual(imported["summary_id"], sid)
        self.assertEqual(imported["created_at"].tzinfo, timezone.utc)
        self.assertEqual(imported["created_at"].replace(tzinfo=None), datetime(2026, 9, 23, 9, 30, 0, 123456))

    def test_summary_missing_from_postgres_is_excluded_not_blocking(self):
        self.write_source([source_row(summary_id=uuid.uuid4().hex)])
        analysis = self.run_analysis()
        self.assertEqual(analysis.count(transfer.EXCLUDED_MISSING_SUMMARY), 1)
        self.assertEqual(analysis.count(transfer.IMPORTABLE), 0)
        self.assertEqual(analysis.blocking, [])

    def test_pending_rows_excluded_by_default_and_included_on_request(self):
        self.write_source([source_row()])
        self.assertEqual(self.run_analysis().count(transfer.EXCLUDED_PENDING), 1)
        included = self.run_analysis(include_pending=True)
        self.assertEqual(included.count(transfer.IMPORTABLE), 1)
        self.assertIsNone(included.to_insert[0]["summary_id"])

    def _checker(self, existing_public_ids, size=1234, boom_for=None):
        def check(row):
            if boom_for and row["storage_public_id"] == boom_for:
                raise TimeoutError("cloudinary unreachable")
            if row["storage_public_id"] in existing_public_ids:
                return {"status": "exists", "bytes": size, "format": "docx"}
            return {"status": "missing"}
        return check

    def test_pending_row_without_asset_is_excluded_as_a_fixture_and_real_one_kept(self):
        real_pending = source_row()
        junk_pending = source_row()
        self.write_source([real_pending, junk_pending])
        analysis = self.run_analysis(include_pending=True)
        self.assertEqual(analysis.count(transfer.IMPORTABLE), 2)
        transfer.apply_asset_verification(analysis, self._checker({real_pending["storage_public_id"]}))
        self.assertEqual([r["id"] for r in analysis.to_insert], [uuid.UUID(real_pending["id"])])
        excluded = analysis.classified[transfer.EXCLUDED_PENDING]
        self.assertEqual([r["id"] for r in excluded], [uuid.UUID(junk_pending["id"])])
        self.assertIn("no Cloudinary asset", excluded[0]["reason"])
        self.assertEqual(analysis.blocking, [])

    def test_linked_row_without_asset_blocks_instead_of_being_silently_dropped(self):
        sid = self.add_summary()
        self.write_source([source_row(summary_id=sid.hex)])
        analysis = self.run_analysis()
        transfer.apply_asset_verification(analysis, self._checker(set()))
        self.assertEqual(analysis.count(transfer.IMPORTABLE), 0)
        self.assertTrue(any("NO Cloudinary asset" in line for line in analysis.blocking))

    def test_size_mismatch_and_verification_error_block(self):
        sid = self.add_summary()
        a, b = source_row(summary_id=sid.hex), source_row(summary_id=sid.hex)
        self.write_source([a, b])
        analysis = self.run_analysis()
        both = {a["storage_public_id"], b["storage_public_id"]}
        transfer.apply_asset_verification(analysis, self._checker(both, size=999, boom_for=b["storage_public_id"]))
        self.assertEqual(analysis.count(transfer.IMPORTABLE), 0)
        joined = " | ".join(analysis.blocking)
        self.assertIn("size 999", joined)
        self.assertIn("could not verify", joined)

    def test_verified_linked_row_stays_importable(self):
        sid = self.add_summary()
        row = source_row(summary_id=sid.hex)
        self.write_source([row])
        analysis = self.run_analysis()
        transfer.apply_asset_verification(analysis, self._checker({row["storage_public_id"]}))
        self.assertEqual(analysis.count(transfer.IMPORTABLE), 1)
        self.assertEqual(analysis.blocking, [])

    def test_delivery_fallback_maps_http_statuses(self):
        import urllib.error
        from unittest import mock

        row = {"storage_public_id": "management-aios/review-summary-attachments/x", "storage_resource_type": "image"}

        class Resp:
            headers = {"Content-Length": "77"}
            def __enter__(self): return self
            def __exit__(self, *a): return False

        env = {"CLOUDINARY_CLOUD_NAME": "c", "CLOUDINARY_API_KEY": "k", "CLOUDINARY_API_SECRET": "s"}
        with mock.patch.dict("os.environ", env):
            with mock.patch("urllib.request.urlopen", return_value=Resp()):
                self.assertEqual(transfer.cloudinary_delivery_status(row)["bytes"], 77)
            for code, expected in ((404, "missing"), (401, "exists")):
                err = urllib.error.HTTPError("u", code, "x", {}, None)
                with mock.patch("urllib.request.urlopen", side_effect=err):
                    self.assertEqual(transfer.cloudinary_delivery_status(row)["status"], expected)
            with mock.patch("urllib.request.urlopen", side_effect=urllib.error.HTTPError("u", 500, "x", {}, None)):
                with self.assertRaises(urllib.error.HTTPError):
                    transfer.cloudinary_delivery_status(row)

    def test_report_lists_every_row_by_id_with_classification_and_reason(self):
        sid = self.add_summary()
        linked = source_row(summary_id=sid.hex)
        orphan = source_row(summary_id=uuid.uuid4().hex)
        pending = source_row()
        self.write_source([linked, orphan, pending])
        analysis = self.run_analysis()
        report_path = self.tmp / "report.json"
        transfer.write_report(report_path, analysis, "test-target")
        import json
        report = json.loads(report_path.read_text(encoding="utf-8"))
        by_id = {r["id"]: r for r in report["rows"]}
        self.assertEqual(len(by_id), 3)
        self.assertEqual(by_id[str(uuid.UUID(linked["id"]))]["classification"], transfer.IMPORTABLE)
        self.assertEqual(by_id[str(uuid.UUID(orphan["id"]))]["classification"], transfer.EXCLUDED_MISSING_SUMMARY)
        self.assertIn("does not exist", by_id[str(uuid.UUID(orphan["id"]))]["reason"])
        self.assertEqual(by_id[str(uuid.UUID(pending["id"]))]["classification"], transfer.EXCLUDED_PENDING)
        self.assertNotIn("http", report_path.read_text(encoding="utf-8"))

    def test_invalid_row_that_would_be_imported_blocks(self):
        sid = self.add_summary()
        bad = source_row(summary_id=sid.hex, storage_resource_type="video")  # word must be 'raw'
        self.write_source([bad])
        analysis = self.run_analysis()
        self.assertEqual(analysis.count(transfer.INVALID), 1)
        self.assertTrue(any("download route" in line for line in analysis.blocking))

    def test_download_fields_are_checked(self):
        sid = self.add_summary()
        cases = {
            "provider": dict(storage_provider="s3"),
            "public id folder": dict(storage_public_id="other-folder/" + str(uuid.uuid4())),
            "empty public id": dict(storage_public_id=""),
            "uploader": dict(uploaded_by="nobody"),
            "type": dict(attachment_type="exe"),
            "size": dict(file_size_bytes=0),
        }
        for label, overrides in cases.items():
            row, problems = transfer.parse_row(source_row(summary_id=sid.hex, **overrides))
            self.assertTrue(problems, label)

    def test_invalid_row_that_is_excluded_anyway_does_not_block(self):
        self.write_source([source_row(summary_id=uuid.uuid4().hex, storage_provider="s3")])
        self.assertEqual(self.run_analysis().blocking, [])

    def test_duplicate_storage_public_id_in_source_blocks(self):
        sid = self.add_summary()
        shared = ATTACHMENT_STORAGE_FOLDER + "/" + str(uuid.uuid4())
        self.write_source([
            source_row(summary_id=sid.hex, storage_public_id=shared),
            source_row(summary_id=sid.hex, storage_public_id=shared),
        ])
        analysis = self.run_analysis()
        self.assertTrue(any("Duplicate storage_public_id" in line for line in analysis.blocking))

    def test_unparseable_id_blocks(self):
        analysis = transfer.analyze([source_row(id="not-a-uuid")], summaries={}, target_by_id={}, target_by_public_id={})
        self.assertEqual(len(analysis.blocking), 1)

    def test_uploader_must_be_the_reviewer_who_owns_the_linked_summary(self):
        summary_id = self.add_summary()
        ok = source_row(summary_id=summary_id.hex, uploaded_by="arun")
        bad = source_row(summary_id=summary_id.hex, uploaded_by="mayurika")
        summaries, by_id, by_public_id = self.state()
        analysis = transfer.analyze(
            [ok, bad], summaries=summaries, target_by_id=by_id, target_by_public_id=by_public_id,
            summary_reviewers={summary_id: "arun"},
        )
        self.assertEqual([r["id"].hex for r in analysis.classified[transfer.IMPORTABLE]], [ok["id"]])
        self.assertEqual(analysis.count(transfer.INVALID), 1)
        self.assertTrue(any("reviewer" in b for b in analysis.blocking))

    def test_soft_deleted_summary_link_is_preserved_and_reported(self):
        sid = self.add_summary(deleted=True)
        self.write_source([source_row(summary_id=sid.hex)])
        analysis = self.run_analysis()
        self.assertEqual(analysis.count(transfer.IMPORTABLE), 1)
        self.assertEqual(analysis.linked_to_soft_deleted, 1)


class ApplyTests(TransferTestCase):
    def test_apply_inserts_preserving_every_column_and_rerun_is_a_no_op(self):
        sid = self.add_summary()
        rows = [source_row(summary_id=sid.hex, original_filename="a.docx"),
                source_row(summary_id=sid.hex, original_filename="b.docx")]
        self.write_source(rows)
        analysis = self.run_analysis()
        self.assertEqual(self.target_count(), 0)
        result = transfer.apply_transfer(self.engine, analysis.to_insert)
        self.assertEqual((result["before"], result["after"], result["inserted"]), (0, 2, 2))

        again = self.run_analysis()
        self.assertEqual(again.count(transfer.IMPORTABLE), 0)
        self.assertEqual(again.count(transfer.ALREADY_PRESENT), 2)
        self.assertEqual(again.blocking, [])
        rerun = transfer.apply_transfer(self.engine, again.to_insert)
        self.assertEqual(rerun["inserted"], 0)
        self.assertEqual(self.target_count(), 2)

    def test_rerun_picks_up_only_new_source_rows(self):
        sid = self.add_summary()
        self.write_source([source_row(summary_id=sid.hex)])
        transfer.apply_transfer(self.engine, self.run_analysis().to_insert)
        self.write_source([source_row(summary_id=sid.hex)])
        again = self.run_analysis()
        self.assertEqual((again.count(transfer.IMPORTABLE), again.count(transfer.ALREADY_PRESENT)), (1, 1))

    def test_different_existing_target_row_is_a_conflict_and_blocks(self):
        sid = self.add_summary()
        row = source_row(summary_id=sid.hex)
        self.write_source([row])
        transfer.apply_transfer(self.engine, self.run_analysis().to_insert)
        with self.engine.begin() as conn:
            conn.execute(text("UPDATE management_aios.staff_review_summary_attachments SET original_filename='changed.docx'"))
        analysis = self.run_analysis()
        self.assertEqual(analysis.count(transfer.CONFLICT), 1)
        self.assertTrue(analysis.blocking)

    def test_same_public_id_under_a_different_id_is_a_conflict(self):
        sid = self.add_summary()
        first = source_row(summary_id=sid.hex)
        self.write_source([first])
        transfer.apply_transfer(self.engine, self.run_analysis().to_insert)
        # The source now holds only a DIFFERENT row that reuses the asset the target already tracks.
        conn = sqlite3.connect(self.source_path)
        conn.execute("DELETE FROM local_attachment_metadata")
        conn.commit()
        conn.close()
        second = source_row(summary_id=sid.hex, storage_public_id=first["storage_public_id"])
        self.write_source([second])
        analysis = self.run_analysis()
        self.assertEqual(analysis.count(transfer.CONFLICT), 1)
        self.assertTrue(analysis.blocking)

    def test_summaries_table_is_untouched(self):
        sid = self.add_summary()
        self.write_source([source_row(summary_id=sid.hex)])
        before = transfer.count_rows(self.engine, transfer.SUMMARIES_TABLE)
        transfer.apply_transfer(self.engine, self.run_analysis().to_insert)
        self.assertEqual(transfer.count_rows(self.engine, transfer.SUMMARIES_TABLE), before)

    def test_failure_mid_transfer_rolls_back_everything(self):
        sid = self.add_summary()
        good = source_row(summary_id=sid.hex)
        bad = source_row(summary_id=sid.hex, uploaded_by="nobody")  # violates the table's CHECK constraint
        self.write_source([good, bad])
        rows = [transfer.parse_row(r)[0] for r in transfer.read_sqlite_rows(self.source_path)]
        with self.assertRaises(IntegrityError):
            transfer.apply_transfer(self.engine, rows)
        self.assertEqual(self.target_count(), 0, "the good row must not survive a failed transfer")

    def test_readback_mismatch_rolls_back_everything(self):
        sid = self.add_summary()
        self.write_source([source_row(summary_id=sid.hex)])
        rows = self.run_analysis().to_insert
        original = transfer.rows_equal
        transfer.rows_equal = lambda a, b: False
        try:
            with self.assertRaises(RuntimeError):
                transfer.apply_transfer(self.engine, rows)
        finally:
            transfer.rows_equal = original
        self.assertEqual(self.target_count(), 0)

    def test_apply_refuses_a_link_to_a_nonexistent_summary_even_when_called_directly(self):
        # There is no foreign key: the transfer itself must refuse to create an orphan.
        row = transfer.parse_row(source_row(summary_id=uuid.uuid4().hex))[0]
        with self.assertRaises(RuntimeError) as ctx:
            transfer.apply_transfer(self.engine, [row])
        self.assertIn("Orphan", str(ctx.exception))
        self.assertEqual(self.target_count(), 0, "the orphan insert must be rolled back")

    def test_missing_target_table_is_reported(self):
        with self.engine.begin() as conn:
            conn.execute(text("DROP TABLE management_aios.staff_review_summary_attachments"))
        self.assertFalse(transfer.check_target_readiness(self.engine)["table_exists"])


class BackupTests(TransferTestCase):
    def test_backup_is_verified_and_source_is_not_modified(self):
        sid = self.add_summary()
        self.write_source([source_row(summary_id=sid.hex), source_row()])
        before = hashlib.sha256(self.source_path.read_bytes()).hexdigest()
        path, digest, count = transfer.backup_sqlite(self.source_path, self.tmp / "backups")
        self.assertTrue(path.exists())
        self.assertEqual(count, 2)
        self.assertEqual(digest, hashlib.sha256(path.read_bytes()).hexdigest())
        self.assertEqual(hashlib.sha256(self.source_path.read_bytes()).hexdigest(), before)
        self.assertEqual(len(transfer.read_sqlite_rows(path)), 2)

    def test_source_is_opened_read_only(self):
        self.write_source([source_row()])
        before = hashlib.sha256(self.source_path.read_bytes()).hexdigest()
        transfer.read_sqlite_rows(self.source_path)
        self.assertEqual(hashlib.sha256(self.source_path.read_bytes()).hexdigest(), before)


if __name__ == "__main__":
    unittest.main()

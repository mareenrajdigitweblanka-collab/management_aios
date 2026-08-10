"""HTTP-level tests for the Knowledge Management backend CRUD API
(REQ-KM-CRUD-002 design, REQ-KM-CRUD-003 implementation).

Uses fastapi.testclient.TestClient against the real app (backend.main.app),
with get_db overridden to an isolated, in-memory SQLite database per test —
same convention as test_staff_review_summaries.py /
test_calendar_mutation_authorization.py. No test in this file ever connects
to order_management_copy or any other real PostgreSQL database.

Run with: python -m unittest backend.tests.test_knowledge_documents
"""

import unittest
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.models import KnowledgeDocument, KnowledgeDocumentAuditLog, KnowledgeDocumentVersion
from backend.routers import knowledge_document_logic as kdl
from backend.tests.calendar_auth_test_support import (
    bearer_header,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)

BASE = "/api/knowledge-documents"


class KnowledgeDocumentsTestCase(unittest.TestCase):
    """Fresh, isolated in-memory SQLite database per test method — no
    cross-test data leakage, no shared state, no real network connection,
    and no production row is ever created by this file."""

    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.env_ctx = patched_calendar_auth_env()
        self.env_ctx.__enter__()
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self.env_ctx.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    def make_session(self):
        return self.SessionLocal()

    def seed_document(self, **overrides):
        session = self.make_session()
        now = overrides.pop("now", None) or datetime.now(timezone.utc)
        source_url = overrides.pop("source_url", "https://docs.google.com/document/d/SEED/edit")
        normalized = overrides.pop("source_url_normalized", None)
        if normalized is None:
            normalized = kdl.normalize_source_url(source_url)
        fields = dict(
            title=overrides.pop("title", "Seed Document"),
            team=overrides.pop("team", "HR"),
            document_type=overrides.pop("document_type", "PDF"),
            job_role=overrides.pop("job_role", None),
            document_category=overrides.pop("document_category", None),
            creator=overrides.pop("creator", None),
            source_url=source_url,
            source_url_normalized=normalized,
            current_version=overrides.pop("current_version", "1.0"),
            lifecycle_status=overrides.pop("lifecycle_status", "Active"),
            compliance_status=overrides.pop("compliance_status", "Pending"),
            google_ownership_status=overrides.pop("google_ownership_status", "Not Applicable"),
            created_by=overrides.pop("created_by", "mayurika"),
            updated_by=overrides.pop("updated_by", "mayurika"),
            created_at=now,
            updated_at=now,
            deleted_at=overrides.pop("deleted_at", None),
            deleted_by=overrides.pop("deleted_by", None),
            delete_reason=overrides.pop("delete_reason", None),
        )
        fields.update(overrides)
        doc = KnowledgeDocument(**fields)
        session.add(doc)
        session.commit()
        session.refresh(doc)
        doc_id = doc.id
        session.close()
        return doc_id

    def get_document_row(self, document_id):
        session = self.make_session()
        row = session.get(KnowledgeDocument, self._as_uuid(document_id))
        if row is not None:
            session.expunge(row)
        session.close()
        return row

    def count_documents(self):
        session = self.make_session()
        n = session.query(KnowledgeDocument).count()
        session.close()
        return n

    @staticmethod
    def _as_uuid(document_id):
        """A document_id read back from a JSON response body (response.json()
        ["id"]) is a plain str, not a uuid.UUID — the UUID(as_uuid=True)
        column type's bind processor requires an actual UUID instance.
        Normalizes either shape so every helper below accepts both."""
        return document_id if isinstance(document_id, uuid.UUID) else uuid.UUID(str(document_id))

    def count_versions(self, document_id=None):
        session = self.make_session()
        q = session.query(KnowledgeDocumentVersion)
        if document_id is not None:
            q = q.filter(KnowledgeDocumentVersion.document_id == self._as_uuid(document_id))
        n = q.count()
        session.close()
        return n

    def audit_rows(self, document_id):
        session = self.make_session()
        rows = (
            session.query(KnowledgeDocumentAuditLog)
            .filter(KnowledgeDocumentAuditLog.document_id == self._as_uuid(document_id))
            .order_by(KnowledgeDocumentAuditLog.occurred_at.asc())
            .all()
        )
        for r in rows:
            session.expunge(r)
        session.close()
        return rows

    def create_payload(self, **overrides):
        payload = {
            "title": "996 Project Management — Follow-up Sheet",
            "team": "HR",
            "document_type": "Google Sheet",
            "source_url": "https://docs.google.com/spreadsheets/d/ABC123/edit?usp=sharing",
        }
        payload.update(overrides)
        return payload

    def create_document(self, member="mayurika", **overrides):
        response = self.client.post(BASE, json=self.create_payload(**overrides), headers=bearer_header(member))
        return response


# ── AUTH (1-7) ────────────────────────────────────────────────────────────


class AuthTests(KnowledgeDocumentsTestCase):
    def test_1_unauthenticated_create_rejected(self):
        response = self.client.post(BASE, json=self.create_payload())
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.count_documents(), 0)

    def test_2_unauthenticated_update_rejected(self):
        doc_id = self.seed_document()
        response = self.client.patch(
            f"{BASE}/{doc_id}", json={"title": "New Title", "change_description": "typo fix"}
        )
        self.assertEqual(response.status_code, 401)

    def test_3_unauthenticated_version_rejected(self):
        doc_id = self.seed_document()
        response = self.client.post(
            f"{BASE}/{doc_id}/versions",
            json={
                "source_url": "https://docs.google.com/document/d/NEW/edit",
                "version_label": "1.1",
                "change_description": "revised",
            },
        )
        self.assertEqual(response.status_code, 401)

    def test_4_unauthenticated_archive_rejected(self):
        doc_id = self.seed_document()
        response = self.client.post(f"{BASE}/{doc_id}/archive")
        self.assertEqual(response.status_code, 401)

    def test_5_unauthenticated_delete_rejected(self):
        doc_id = self.seed_document()
        response = self.client.request(
            "DELETE", f"{BASE}/{doc_id}", json={"delete_reason": "no longer needed"}
        )
        self.assertEqual(response.status_code, 401)

    def test_6_unauthenticated_restore_rejected(self):
        doc_id = self.seed_document(deleted_at=datetime.now(timezone.utc), deleted_by="mayurika", delete_reason="x")
        response = self.client.post(f"{BASE}/{doc_id}/restore")
        self.assertEqual(response.status_code, 401)

    def test_7_authenticated_management_team_member_accepted(self):
        response = self.create_document(member="suman")
        self.assertEqual(response.status_code, 201)


# ── CREATE (8-18) ─────────────────────────────────────────────────────────


class CreateTests(KnowledgeDocumentsTestCase):
    def test_8_valid_create(self):
        response = self.create_document()
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["title"], "996 Project Management — Follow-up Sheet")
        self.assertEqual(self.count_documents(), 1)

    def test_9_actor_server_derived(self):
        response = self.create_document(member="arun")
        body = response.json()
        self.assertEqual(body["created_by"], "arun")
        self.assertEqual(body["updated_by"], "arun")

    def test_10_timestamps_system_derived(self):
        response = self.create_document()
        body = response.json()
        self.assertIsNotNone(body["created_at"])
        self.assertIsNotNone(body["updated_at"])

    def test_11_audit_row_created(self):
        response = self.create_document()
        doc_id = response.json()["id"]
        rows = self.audit_rows(doc_id)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].action, "create")

    def test_12_duplicate_active_url_is_409(self):
        first = self.create_document()
        self.assertEqual(first.status_code, 201)
        second = self.create_document(title="A totally different title")
        self.assertEqual(second.status_code, 409)
        self.assertEqual(second.json()["error"], "knowledge_document_duplicate_source_url")
        self.assertEqual(self.count_documents(), 1)

    def test_13_same_title_different_url_allowed(self):
        first = self.create_document()
        self.assertEqual(first.status_code, 201)
        second = self.create_document(source_url="https://docs.google.com/spreadsheets/d/DIFFERENT/edit")
        self.assertEqual(second.status_code, 201)
        self.assertEqual(self.count_documents(), 2)

    def test_14_warning_returned_for_same_title_different_url(self):
        self.create_document()
        second = self.create_document(source_url="https://docs.google.com/spreadsheets/d/DIFFERENT/edit")
        self.assertEqual(len(second.json()["warnings"]), 1)
        self.assertIn("different", second.json()["warnings"][0].lower())

    def test_15_invalid_url_rejected(self):
        response = self.create_document(source_url="not-a-url-at-all")
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.count_documents(), 0)

    def test_16_javascript_url_rejected(self):
        response = self.create_document(source_url="javascript:alert(1)")
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.count_documents(), 0)

    def test_17_client_cannot_spoof_actor(self):
        response = self.client.post(
            BASE,
            json={**self.create_payload(), "created_by": "someone-else", "updated_by": "someone-else"},
            headers=bearer_header("rajiv"),
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["created_by"], "rajiv")

    def test_18_google_type_cannot_be_falsely_verified(self):
        response = self.create_document(document_type="Google Sheet")
        self.assertEqual(response.json()["google_ownership_status"], "Not Verified")
        self.assertNotEqual(response.json()["google_ownership_status"], "Verified")


# ── LIST / DETAIL (19-25) ────────────────────────────────────────────────


class ListDetailTests(KnowledgeDocumentsTestCase):
    def test_19_list_active_non_deleted(self):
        self.seed_document(title="Active One")
        self.seed_document(
            title="Deleted One", source_url="https://example.com/deleted-doc",
            deleted_at=datetime.now(timezone.utc), deleted_by="mayurika", delete_reason="x",
        )
        response = self.client.get(BASE)
        self.assertEqual(response.status_code, 200)
        titles = [r["title"] for r in response.json()["records"]]
        self.assertIn("Active One", titles)
        self.assertNotIn("Deleted One", titles)

    def test_20_title_search(self):
        self.seed_document(title="Developer Validation Checklist", source_url="https://example.com/a")
        self.seed_document(title="Arun Task Schedule", source_url="https://example.com/b")
        response = self.client.get(BASE, params={"search": "developer"})
        titles = [r["title"] for r in response.json()["records"]]
        self.assertEqual(titles, ["Developer Validation Checklist"])

    def test_21_team_filter(self):
        self.seed_document(title="HR Doc", team="HR", source_url="https://example.com/a")
        self.seed_document(title="Dev Doc", team="Development", source_url="https://example.com/b")
        response = self.client.get(BASE, params={"team": "Development"})
        titles = [r["title"] for r in response.json()["records"]]
        self.assertEqual(titles, ["Dev Doc"])

    def test_22_document_type_filter(self):
        self.seed_document(title="Sheet Doc", document_type="Google Sheet", source_url="https://example.com/a")
        self.seed_document(title="PDF Doc", document_type="PDF", source_url="https://example.com/b")
        response = self.client.get(BASE, params={"document_type": "PDF"})
        titles = [r["title"] for r in response.json()["records"]]
        self.assertEqual(titles, ["PDF Doc"])

    def test_23_combined_filters(self):
        self.seed_document(
            title="KPI Review Guide", team="Management", document_type="Google Sheet",
            source_url="https://example.com/a",
        )
        self.seed_document(
            title="KPI Notes", team="HR", document_type="Google Sheet", source_url="https://example.com/b"
        )
        response = self.client.get(BASE, params={"search": "KPI", "team": "Management", "document_type": "Google Sheet"})
        titles = [r["title"] for r in response.json()["records"]]
        self.assertEqual(titles, ["KPI Review Guide"])

    def test_24_detail(self):
        doc_id = self.seed_document(title="Detail Target")
        response = self.client.get(f"{BASE}/{doc_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "Detail Target")

    def test_25_missing_id_handling(self):
        response = self.client.get(f"{BASE}/00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 404)


# ── UPDATE (26-31) ────────────────────────────────────────────────────────


class UpdateTests(KnowledgeDocumentsTestCase):
    def test_26_metadata_edit_succeeds(self):
        doc_id = self.seed_document(title="Old Title")
        response = self.client.patch(
            f"{BASE}/{doc_id}",
            json={"title": "New Title", "change_description": "corrected title"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["title"], "New Title")

    def test_27_updated_by_correct(self):
        doc_id = self.seed_document(created_by="mayurika", updated_by="mayurika")
        response = self.client.patch(
            f"{BASE}/{doc_id}",
            json={"team": "Development", "change_description": "moved to dev team"},
            headers=bearer_header("suman"),
        )
        self.assertEqual(response.json()["updated_by"], "suman")
        self.assertEqual(response.json()["created_by"], "mayurika")

    def test_28_change_description_required(self):
        doc_id = self.seed_document()
        response = self.client.patch(
            f"{BASE}/{doc_id}", json={"title": "New Title"}, headers=bearer_header("mayurika")
        )
        self.assertEqual(response.status_code, 422)

    def test_29_audit_created(self):
        doc_id = self.seed_document()
        self.client.patch(
            f"{BASE}/{doc_id}",
            json={"title": "Changed", "change_description": "fix"},
            headers=bearer_header("mayurika"),
        )
        rows = self.audit_rows(doc_id)
        self.assertEqual([r.action for r in rows], ["update_metadata"])

    def test_30_current_version_unchanged(self):
        doc_id = self.seed_document(current_version="1.0")
        response = self.client.patch(
            f"{BASE}/{doc_id}",
            json={"title": "Changed", "change_description": "fix"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.json()["current_version"], "1.0")

    def test_31_no_version_history_row_created(self):
        doc_id = self.seed_document()
        before = self.count_versions(doc_id)
        self.client.patch(
            f"{BASE}/{doc_id}",
            json={"title": "Changed", "change_description": "fix"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(self.count_versions(doc_id), before)

    def test_source_url_rejected_via_metadata_update(self):
        """Phase 8 — metadata edit must explicitly reject a source_url
        change and instruct using Create Version instead."""
        doc_id = self.seed_document()
        response = self.client.patch(
            f"{BASE}/{doc_id}",
            json={"source_url": "https://example.com/new", "change_description": "trying to sneak a url change"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("versions", response.text.lower())


# ── VERSION (32-36) ───────────────────────────────────────────────────────


class VersionTests(KnowledgeDocumentsTestCase):
    def version_payload(self, **overrides):
        payload = {
            "source_url": "https://docs.google.com/document/d/REVISED/edit",
            "version_label": "2.0",
            "change_description": "major content revision",
        }
        payload.update(overrides)
        return payload

    def test_32_explicit_version_succeeds(self):
        doc_id = self.seed_document()
        response = self.client.post(
            f"{BASE}/{doc_id}/versions", json=self.version_payload(), headers=bearer_header("arun")
        )
        self.assertEqual(response.status_code, 201)

    def test_33_version_row_appended(self):
        doc_id = self.seed_document()
        before = self.count_versions(doc_id)
        self.client.post(f"{BASE}/{doc_id}/versions", json=self.version_payload(), headers=bearer_header("arun"))
        self.assertEqual(self.count_versions(doc_id), before + 1)

    def test_34_parent_current_version_updated(self):
        doc_id = self.seed_document(current_version="1.0")
        response = self.client.post(
            f"{BASE}/{doc_id}/versions", json=self.version_payload(version_label="3.5"), headers=bearer_header("arun")
        )
        self.assertEqual(response.json()["current_version"], "3.5")

    def test_35_audit_created(self):
        doc_id = self.seed_document()
        self.client.post(f"{BASE}/{doc_id}/versions", json=self.version_payload(), headers=bearer_header("arun"))
        rows = self.audit_rows(doc_id)
        self.assertIn("create_version", [r.action for r in rows])

    def test_36_duplicate_url_rule_enforced(self):
        other_id = self.seed_document(title="Other Doc", source_url="https://example.com/taken")
        doc_id = self.seed_document(title="This Doc", source_url="https://example.com/mine")
        response = self.client.post(
            f"{BASE}/{doc_id}/versions",
            json=self.version_payload(source_url="https://example.com/taken"),
            headers=bearer_header("arun"),
        )
        self.assertEqual(response.status_code, 409)


# ── ARCHIVE (37-40) ───────────────────────────────────────────────────────


class ArchiveTests(KnowledgeDocumentsTestCase):
    def test_37_archive_succeeds(self):
        doc_id = self.seed_document()
        response = self.client.post(f"{BASE}/{doc_id}/archive", headers=bearer_header("paraparan"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["lifecycle_status"], "Archived")

    def test_38_archived_remains_non_deleted(self):
        doc_id = self.seed_document()
        self.client.post(f"{BASE}/{doc_id}/archive", headers=bearer_header("paraparan"))
        row = self.get_document_row(doc_id)
        self.assertIsNone(row.deleted_at)
        response = self.client.get(f"{BASE}/{doc_id}")
        self.assertEqual(response.status_code, 200)

    def test_39_unarchive_succeeds(self):
        doc_id = self.seed_document(lifecycle_status="Archived")
        response = self.client.post(f"{BASE}/{doc_id}/unarchive", headers=bearer_header("paraparan"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["lifecycle_status"], "Active")

    def test_40_audit_events_created(self):
        doc_id = self.seed_document()
        self.client.post(f"{BASE}/{doc_id}/archive", headers=bearer_header("paraparan"))
        self.client.post(f"{BASE}/{doc_id}/unarchive", headers=bearer_header("paraparan"))
        actions = [r.action for r in self.audit_rows(doc_id)]
        self.assertEqual(actions, ["archive", "unarchive"])


# ── DELETE (41-46) ────────────────────────────────────────────────────────


class DeleteTests(KnowledgeDocumentsTestCase):
    def test_41_soft_delete_succeeds(self):
        doc_id = self.seed_document()
        response = self.client.request(
            "DELETE", f"{BASE}/{doc_id}", json={"delete_reason": "superseded"}, headers=bearer_header("mayurika")
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["deleted"], True)

    def test_42_delete_reason_required(self):
        doc_id = self.seed_document()
        response = self.client.request(
            "DELETE", f"{BASE}/{doc_id}", json={}, headers=bearer_header("mayurika")
        )
        self.assertEqual(response.status_code, 422)

    def test_43_deleted_by_correct(self):
        doc_id = self.seed_document()
        self.client.request(
            "DELETE", f"{BASE}/{doc_id}", json={"delete_reason": "superseded"}, headers=bearer_header("suman")
        )
        row = self.get_document_row(doc_id)
        self.assertEqual(row.deleted_by, "suman")

    def test_44_deleted_at_set(self):
        doc_id = self.seed_document()
        self.client.request(
            "DELETE", f"{BASE}/{doc_id}", json={"delete_reason": "superseded"}, headers=bearer_header("mayurika")
        )
        row = self.get_document_row(doc_id)
        self.assertIsNotNone(row.deleted_at)

    def test_45_no_hard_deletion(self):
        doc_id = self.seed_document()
        self.client.request(
            "DELETE", f"{BASE}/{doc_id}", json={"delete_reason": "superseded"}, headers=bearer_header("mayurika")
        )
        self.assertEqual(self.count_documents(), 1)
        self.assertIsNotNone(self.get_document_row(doc_id))

    def test_46_audit_retained(self):
        doc_id = self.seed_document()
        self.client.request(
            "DELETE", f"{BASE}/{doc_id}", json={"delete_reason": "superseded"}, headers=bearer_header("mayurika")
        )
        rows = self.audit_rows(doc_id)
        self.assertEqual(rows[-1].action, "soft_delete")
        self.assertEqual(rows[-1].detail["delete_reason"], "superseded")


# ── RESTORE (47-50) ───────────────────────────────────────────────────────


class RestoreTests(KnowledgeDocumentsTestCase):
    def test_47_restore_succeeds(self):
        doc_id = self.seed_document(
            deleted_at=datetime.now(timezone.utc), deleted_by="mayurika", delete_reason="test"
        )
        response = self.client.post(f"{BASE}/{doc_id}/restore", headers=bearer_header("mayurika"))
        self.assertEqual(response.status_code, 200)

    def test_48_deletion_fields_cleared(self):
        doc_id = self.seed_document(
            deleted_at=datetime.now(timezone.utc), deleted_by="mayurika", delete_reason="test"
        )
        self.client.post(f"{BASE}/{doc_id}/restore", headers=bearer_header("mayurika"))
        row = self.get_document_row(doc_id)
        self.assertIsNone(row.deleted_at)
        self.assertIsNone(row.deleted_by)
        self.assertIsNone(row.delete_reason)

    def test_49_old_delete_audit_remains(self):
        doc_id = self.seed_document(
            deleted_at=datetime.now(timezone.utc), deleted_by="mayurika", delete_reason="test"
        )
        # Directly append the soft_delete audit row the way the DELETE route
        # would have. occurred_at is explicit — the column's server_default
        # is the Postgres-only now(), which SQLite (this test's engine)
        # does not provide, same convention every seed_* helper in this
        # file and in test_staff_review_summaries.py already follows.
        session = self.make_session()
        session.add(KnowledgeDocumentAuditLog(
            document_id=doc_id, action="soft_delete", actor_member_key="mayurika",
            detail={"deleted_by": "mayurika", "delete_reason": "test"},
            occurred_at=datetime.now(timezone.utc),
        ))
        session.commit()
        session.close()

        self.client.post(f"{BASE}/{doc_id}/restore", headers=bearer_header("mayurika"))
        actions = [r.action for r in self.audit_rows(doc_id)]
        self.assertIn("soft_delete", actions)
        self.assertIn("restore", actions)

    def test_50_restore_url_collision_is_409(self):
        deleted_id = self.seed_document(
            title="Deleted Doc", source_url="https://example.com/shared-url",
            deleted_at=datetime.now(timezone.utc), deleted_by="mayurika", delete_reason="test",
        )
        active_id = self.seed_document(
            title="New Owner Of URL", source_url="https://example.com/shared-url"
        )
        response = self.client.post(f"{BASE}/{deleted_id}/restore", headers=bearer_header("mayurika"))
        self.assertEqual(response.status_code, 409)
        # The other (active) record must be untouched.
        other_row = self.get_document_row(active_id)
        self.assertIsNone(other_row.deleted_at)
        still_deleted_row = self.get_document_row(deleted_id)
        self.assertIsNotNone(still_deleted_row.deleted_at)


# ── HISTORY (51-54) ───────────────────────────────────────────────────────


class HistoryTests(KnowledgeDocumentsTestCase):
    def test_51_versions_readable(self):
        doc_id = self.seed_document()
        session = self.make_session()
        session.add(KnowledgeDocumentVersion(
            document_id=doc_id, version_label="1.0", source_url="https://example.com/seed", created_by="mayurika",
            created_at=datetime.now(timezone.utc),
        ))
        session.commit()
        session.close()
        response = self.client.get(f"{BASE}/{doc_id}/versions", headers=bearer_header("mayurika"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_52_audit_readable(self):
        doc_id = self.seed_document()
        session = self.make_session()
        session.add(KnowledgeDocumentAuditLog(
            document_id=doc_id, action="create", actor_member_key="mayurika",
            occurred_at=datetime.now(timezone.utc),
        ))
        session.commit()
        session.close()
        response = self.client.get(f"{BASE}/{doc_id}/audit", headers=bearer_header("mayurika"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_53_no_version_update_delete_route(self):
        from backend.routers.knowledge_documents import router
        for r in router.routes:
            if "versions" in r.path:
                self.assertNotIn("PUT", r.methods)
                self.assertNotIn("PATCH", r.methods)
                self.assertNotIn("DELETE", r.methods)

    def test_54_no_audit_update_delete_route(self):
        from backend.routers.knowledge_documents import router
        for r in router.routes:
            if "audit" in r.path:
                self.assertNotIn("PUT", r.methods)
                self.assertNotIn("PATCH", r.methods)
                self.assertNotIn("DELETE", r.methods)


# ── MD read-only enforcement (extra, beyond the required 54 — directly
#    exercises the rule-1-derived MD exclusion documented in
#    knowledge_documents.py's module docstring) ────────────────────────────


class MdReadOnlyTests(KnowledgeDocumentsTestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        # include_md=True — MD's own test token must be configured for
        # this class only; every other test class deliberately omits it
        # (matches every existing MD test elsewhere in this codebase).
        self.env_ctx = patched_calendar_auth_env(include_md=True)
        self.env_ctx.__enter__()
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def test_md_cannot_create(self):
        response = self.client.post(
            BASE, json=self.create_payload(),
            headers=bearer_header("md"),
        )
        self.assertEqual(response.status_code, 403)

    def test_md_can_still_read_list(self):
        self.seed_document()
        response = self.client.get(BASE)
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()

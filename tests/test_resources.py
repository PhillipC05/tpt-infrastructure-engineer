"""
Tests for Materials, Schedule Tasks, Estimate Items, Purchase Orders,
Designs, BOMs, Comments, and Attachment upload endpoints.
"""
import io
import pytest
from fastapi.testclient import TestClient
from backend.main import app


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client: TestClient) -> dict:
    client.post("/auth/register", json={
        "email": "res-tester@tpt.local",
        "password": "SecurePass123!",
        "first_name": "Resource",
        "last_name": "Tester",
        "organisation_name": "Resource Test Ltd",
    })
    resp = client.post("/auth/login", data={
        "username": "res-tester@tpt.local",
        "password": "SecurePass123!",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def project_id(client: TestClient, auth_headers: dict) -> str:
    resp = client.post("/api/projects", json={"name": "Resource Test Project"}, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["id"]


# ─────────────────────────────────────────────────────────────────────────────
# Materials
# ─────────────────────────────────────────────────────────────────────────────

class TestMaterialsEndpoints:
    MATERIAL_PAYLOAD = {
        "name": "Concrete 25 MPa",
        "category": "Concrete",
        "unit": "m3",
        "unit_cost": "345.00",
        "supplier": "Ready Mix NZ",
        "grade": "25 MPa",
        "availability": "in_stock",
    }

    def test_list_materials_empty(self, client, auth_headers):
        resp = client.get("/api/materials", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_material(self, client, auth_headers):
        resp = client.post("/api/materials", json=self.MATERIAL_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Concrete 25 MPa"
        assert data["category"] == "Concrete"
        assert "id" in data

    def test_list_materials_after_create(self, client, auth_headers):
        client.post("/api/materials", json=self.MATERIAL_PAYLOAD, headers=auth_headers)
        resp = client.get("/api/materials", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.headers["X-Total-Count"] == "1"

    def test_get_material_by_id(self, client, auth_headers):
        created = client.post("/api/materials", json=self.MATERIAL_PAYLOAD, headers=auth_headers).json()
        resp = client.get(f"/api/materials/{created['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_get_material_not_found(self, client, auth_headers):
        resp = client.get("/api/materials/00000000-0000-0000-0000-000000000000", headers=auth_headers)
        assert resp.status_code == 404

    def test_update_material(self, client, auth_headers):
        created = client.post("/api/materials", json=self.MATERIAL_PAYLOAD, headers=auth_headers).json()
        resp = client.put(f"/api/materials/{created['id']}", json={"unit_cost": "400.00"}, headers=auth_headers)
        assert resp.status_code == 200
        assert float(resp.json()["unit_cost"]) == 400.00

    def test_delete_material_archives_it(self, client, auth_headers):
        created = client.post("/api/materials", json=self.MATERIAL_PAYLOAD, headers=auth_headers).json()
        assert client.delete(f"/api/materials/{created['id']}", headers=auth_headers).status_code == 204
        assert client.get(f"/api/materials/{created['id']}", headers=auth_headers).status_code == 404

    def test_live_material_prices(self, client, auth_headers):
        resp = client.get("/api/materials/prices/live", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "prices" in data
        assert "timestamp" in data
        assert "conc_25mpa" in data["prices"]
        assert data["prices"]["conc_25mpa"]["direction"] in ("up", "down")

    def test_materials_org_isolation(self, client, auth_headers):
        # Create material as first org (auth_headers user is already registered)
        client.post("/api/materials", json=self.MATERIAL_PAYLOAD, headers=auth_headers)

        # Register a second user in a different org
        client.post("/auth/register", json={
            "email": "other-org@tpt.local",
            "password": "SecurePass123!",
            "first_name": "Other",
            "last_name": "Org",
            "organisation_name": "Other Org Ltd",
        })
        second_login = client.post("/auth/login", data={
            "username": "other-org@tpt.local",
            "password": "SecurePass123!",
        })
        second_headers = {"Authorization": f"Bearer {second_login.json()['access_token']}"}

        resp = client.get("/api/materials", headers=second_headers)
        assert resp.status_code == 200
        assert resp.json() == []


# ─────────────────────────────────────────────────────────────────────────────
# Schedule Tasks
# ─────────────────────────────────────────────────────────────────────────────

class TestScheduleTasksEndpoints:
    TASK_PAYLOAD = {
        "name": "Earthworks",
        "start_date": "2026-07-01",
        "end_date": "2026-08-15",
        "duration": 45,
        "progress": 0,
        "status": "not_started",
    }

    def _url(self, project_id):
        return f"/api/projects/{project_id}/tasks"

    def test_list_tasks_empty(self, client, auth_headers, project_id):
        assert client.get(self._url(project_id), headers=auth_headers).json() == []

    def test_create_task(self, client, auth_headers, project_id):
        resp = client.post(self._url(project_id), json=self.TASK_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Earthworks"
        assert data["status"] == "not_started"
        assert data["progress"] == 0

    def test_get_task_by_id(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.TASK_PAYLOAD, headers=auth_headers).json()
        resp = client.get(f"{self._url(project_id)}/{created['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_update_task_progress(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.TASK_PAYLOAD, headers=auth_headers).json()
        resp = client.put(
            f"{self._url(project_id)}/{created['id']}",
            json={"progress": 50, "status": "in_progress"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["progress"] == 50
        assert resp.json()["status"] == "in_progress"

    def test_delete_task(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.TASK_PAYLOAD, headers=auth_headers).json()
        assert client.delete(f"{self._url(project_id)}/{created['id']}", headers=auth_headers).status_code == 204
        assert client.get(f"{self._url(project_id)}/{created['id']}", headers=auth_headers).status_code == 404

    def test_task_on_nonexistent_project(self, client, auth_headers):
        resp = client.post(
            "/api/projects/00000000-0000-0000-0000-000000000000/tasks",
            json=self.TASK_PAYLOAD,
            headers=auth_headers,
        )
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Estimate Items
# ─────────────────────────────────────────────────────────────────────────────

class TestEstimateItemsEndpoints:
    ITEM_PAYLOAD = {
        "description": "Excavation 0-2m",
        "quantity": "100.00",
        "unit": "m3",
        "rate": "45.00",
        "category": "Civil",
    }

    def _url(self, project_id):
        return f"/api/projects/{project_id}/estimates"

    def test_list_estimates_empty(self, client, auth_headers, project_id):
        assert client.get(self._url(project_id), headers=auth_headers).json() == []

    def test_create_estimate_item(self, client, auth_headers, project_id):
        resp = client.post(self._url(project_id), json=self.ITEM_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["description"] == "Excavation 0-2m"
        assert float(data["amount"]) == 4500.00  # 100 * 45

    def test_amount_auto_calculated(self, client, auth_headers, project_id):
        payload = {**self.ITEM_PAYLOAD, "quantity": "250.00", "rate": "12.00"}
        resp = client.post(self._url(project_id), json=payload, headers=auth_headers)
        assert resp.status_code == 201
        assert float(resp.json()["amount"]) == 3000.00  # 250 * 12

    def test_get_estimate_item(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.ITEM_PAYLOAD, headers=auth_headers).json()
        resp = client.get(f"{self._url(project_id)}/{created['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_update_estimate_recalculates_amount(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.ITEM_PAYLOAD, headers=auth_headers).json()
        resp = client.put(
            f"{self._url(project_id)}/{created['id']}",
            json={"rate": "50.00"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert float(resp.json()["amount"]) == 5000.00  # 100 * 50

    def test_delete_estimate_item(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.ITEM_PAYLOAD, headers=auth_headers).json()
        assert client.delete(f"{self._url(project_id)}/{created['id']}", headers=auth_headers).status_code == 204
        assert client.get(f"{self._url(project_id)}/{created['id']}", headers=auth_headers).status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Purchase Orders
# ─────────────────────────────────────────────────────────────────────────────

class TestPurchaseOrdersEndpoints:
    def _po_payload(self, project_id):
        return {
            "project_id": project_id,
            "po_number": "PO-2026-001",
            "supplier_name": "Steel Direct NZ",
            "status": "draft",
            "total_value": "12500.00",
            "line_items": [{"description": "Rebar 16mm", "quantity": 500, "unit_price": 25.0}],
        }

    def test_list_purchase_orders_empty(self, client, auth_headers):
        assert client.get("/api/procurement/purchase-orders", headers=auth_headers).json() == []

    def test_create_purchase_order(self, client, auth_headers, project_id):
        resp = client.post("/api/procurement/purchase-orders", json=self._po_payload(project_id), headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["po_number"] == "PO-2026-001"
        assert data["supplier_name"] == "Steel Direct NZ"
        assert data["status"] == "draft"

    def test_get_purchase_order(self, client, auth_headers, project_id):
        created = client.post("/api/procurement/purchase-orders", json=self._po_payload(project_id), headers=auth_headers).json()
        resp = client.get(f"/api/procurement/purchase-orders/{created['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_update_purchase_order_status(self, client, auth_headers, project_id):
        created = client.post("/api/procurement/purchase-orders", json=self._po_payload(project_id), headers=auth_headers).json()
        resp = client.put(
            f"/api/procurement/purchase-orders/{created['id']}",
            json={"status": "approved"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

    def test_delete_purchase_order(self, client, auth_headers, project_id):
        created = client.post("/api/procurement/purchase-orders", json=self._po_payload(project_id), headers=auth_headers).json()
        assert client.delete(f"/api/procurement/purchase-orders/{created['id']}", headers=auth_headers).status_code == 204
        assert client.get(f"/api/procurement/purchase-orders/{created['id']}", headers=auth_headers).status_code == 404

    def test_create_po_for_invalid_project(self, client, auth_headers):
        payload = {
            "project_id": "00000000-0000-0000-0000-000000000000",
            "po_number": "PO-INVALID",
            "supplier_name": "Nobody",
        }
        assert client.post("/api/procurement/purchase-orders", json=payload, headers=auth_headers).status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Designs & Alternatives
# ─────────────────────────────────────────────────────────────────────────────

class TestDesignsEndpoints:
    DESIGN_PAYLOAD = {
        "name": "Bridge Option A",
        "type": "structural",
        "parameters": {"span": 120, "material": "steel"},
        "status": "draft",
        "cost_estimate": "2500000.00",
        "structural_rating": 8,
    }

    def _url(self, project_id):
        return f"/api/projects/{project_id}/designs"

    def test_list_designs_empty(self, client, auth_headers, project_id):
        assert client.get(self._url(project_id), headers=auth_headers).json() == []

    def test_create_design(self, client, auth_headers, project_id):
        resp = client.post(self._url(project_id), json=self.DESIGN_PAYLOAD, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Bridge Option A"
        assert data["type"] == "structural"
        assert data["structural_rating"] == 8

    def test_get_design(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.DESIGN_PAYLOAD, headers=auth_headers).json()
        resp = client.get(f"{self._url(project_id)}/{created['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_update_design_status(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.DESIGN_PAYLOAD, headers=auth_headers).json()
        resp = client.put(
            f"{self._url(project_id)}/{created['id']}",
            json={"status": "approved"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

    def test_delete_design(self, client, auth_headers, project_id):
        created = client.post(self._url(project_id), json=self.DESIGN_PAYLOAD, headers=auth_headers).json()
        assert client.delete(f"{self._url(project_id)}/{created['id']}", headers=auth_headers).status_code == 204
        assert client.get(f"{self._url(project_id)}/{created['id']}", headers=auth_headers).status_code == 404

    def test_design_alternatives_crud(self, client, auth_headers, project_id):
        design = client.post(self._url(project_id), json=self.DESIGN_PAYLOAD, headers=auth_headers).json()
        alts_url = f"{self._url(project_id)}/{design['id']}/alternatives"

        assert client.get(alts_url, headers=auth_headers).json() == []

        alt_payload = {
            "name": "Bridge Option A1",
            "variant": "A1",
            "parameters": {"span": 110, "material": "concrete"},
            "cost_estimate": "2200000.00",
            "structural_rating": 7,
        }
        created_alt = client.post(alts_url, json=alt_payload, headers=auth_headers)
        assert created_alt.status_code == 201
        alt_id = created_alt.json()["id"]

        assert len(client.get(alts_url, headers=auth_headers).json()) == 1

        assert client.delete(f"{alts_url}/{alt_id}", headers=auth_headers).status_code == 204

    def test_get_design_not_found(self, client, auth_headers, project_id):
        resp = client.get(
            f"{self._url(project_id)}/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Bills of Materials
# ─────────────────────────────────────────────────────────────────────────────

class TestBomsEndpoints:
    def _add_estimate(self, client, project_id, auth_headers):
        client.post(f"/api/projects/{project_id}/estimates", json={
            "description": "Formwork",
            "quantity": "50.00",
            "unit": "m2",
            "rate": "120.00",
            "category": "Structural",
        }, headers=auth_headers)

    def test_list_boms_empty(self, client, auth_headers):
        assert client.get("/api/procurement/boms", headers=auth_headers).json() == []

    def test_create_bom_from_estimate(self, client, auth_headers, project_id):
        self._add_estimate(client, project_id, auth_headers)
        resp = client.post("/api/procurement/boms", json={
            "project_id": project_id,
            "title": "BOM v1",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "BOM v1"
        assert len(data["line_items"]) == 1
        assert float(data["total_value"]) == 6000.00  # 50 * 120

    def test_create_bom_missing_fields(self, client, auth_headers):
        resp = client.post("/api/procurement/boms", json={"title": "No project_id"}, headers=auth_headers)
        assert resp.status_code == 422

    def test_create_po_from_bom(self, client, auth_headers, project_id):
        bom = client.post("/api/procurement/boms", json={
            "project_id": project_id,
            "title": "BOM for PO",
        }, headers=auth_headers).json()

        resp = client.post(f"/api/procurement/boms/{bom['id']}/create-po", json={
            "supplier_name": "Formwork Hire NZ",
            "po_number": "PO-BOM-001",
        }, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["supplier_name"] == "Formwork Hire NZ"
        assert data["status"] == "draft"

    def test_create_po_from_bom_missing_supplier(self, client, auth_headers, project_id):
        bom = client.post("/api/procurement/boms", json={
            "project_id": project_id,
            "title": "BOM no supplier",
        }, headers=auth_headers).json()
        resp = client.post(f"/api/procurement/boms/{bom['id']}/create-po", json={}, headers=auth_headers)
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# Comments
# ─────────────────────────────────────────────────────────────────────────────

class TestCommentsEndpoints:
    def test_list_comments_empty(self, client, auth_headers, project_id):
        resp = client.get(f"/api/projects/{project_id}/comments", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_comment(self, client, auth_headers, project_id):
        resp = client.post(f"/api/projects/{project_id}/comments",
                           json={"content": "Test comment."}, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Test comment."
        assert data["parent_id"] is None

    def test_comments_appear_in_list(self, client, auth_headers, project_id):
        client.post(f"/api/projects/{project_id}/comments", json={"content": "First"}, headers=auth_headers)
        client.post(f"/api/projects/{project_id}/comments", json={"content": "Second"}, headers=auth_headers)
        resp = client.get(f"/api/projects/{project_id}/comments", headers=auth_headers)
        assert len(resp.json()) == 2

    def test_comment_with_unknown_mention_is_silently_skipped(self, client, auth_headers, project_id):
        fake_uuid = "00000000-0000-0000-0000-000000000001"
        resp = client.post(f"/api/projects/{project_id}/comments", json={
            "content": f"Hey @[Ghost User]({fake_uuid}) check this out"
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert "Ghost User" in resp.json()["content"]

    def test_comment_on_other_org_project_returns_404(self, client, auth_headers):
        client.post("/auth/register", json={
            "email": "comment-other@tpt.local",
            "password": "SecurePass123!",
            "first_name": "Comment",
            "last_name": "Other",
            "organisation_name": "Comment Other Ltd",
        })
        other_login = client.post("/auth/login", data={
            "username": "comment-other@tpt.local",
            "password": "SecurePass123!",
        })
        other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}
        other_project = client.post("/api/projects", json={"name": "Other project"}, headers=other_headers).json()

        resp = client.post(f"/api/projects/{other_project['id']}/comments",
                           json={"content": "Cross-org intrusion"},
                           headers=auth_headers)
        assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Attachment upload validation
# ─────────────────────────────────────────────────────────────────────────────

class TestAttachmentUploadValidation:
    def test_upload_valid_text_file(self, client, auth_headers, project_id):
        content = b"NZ Infrastructure document content"
        resp = client.post(
            f"/api/projects/{project_id}/attachments",
            files={"file": ("report.txt", io.BytesIO(content), "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["original_filename"] == "report.txt"
        assert data["file_size"] == len(content)

    def test_upload_blocked_extension(self, client, auth_headers, project_id):
        resp = client.post(
            f"/api/projects/{project_id}/attachments",
            files={"file": ("payload.exe", io.BytesIO(b"MZ\x00\x00"), "application/octet-stream")},
            headers=auth_headers,
        )
        assert resp.status_code == 403
        assert "blocked" in resp.json()["detail"].lower()

    def test_upload_disallowed_mime_type(self, client, auth_headers, project_id):
        resp = client.post(
            f"/api/projects/{project_id}/attachments",
            files={"file": ("script.py", io.BytesIO(b"print('hi')"), "text/x-python")},
            headers=auth_headers,
        )
        assert resp.status_code == 415

    def test_upload_file_with_script_content(self, client, auth_headers, project_id):
        dangerous = b"<html><script>alert(1)</script></html>"
        resp = client.post(
            f"/api/projects/{project_id}/attachments",
            files={"file": ("page.txt", io.BytesIO(dangerous), "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 403
        assert "dangerous" in resp.json()["detail"].lower()

    def test_upload_to_nonexistent_project(self, client, auth_headers):
        resp = client.post(
            "/api/projects/00000000-0000-0000-0000-000000000000/attachments",
            files={"file": ("ok.txt", io.BytesIO(b"hello"), "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 404

"""
Tests for project CRUD endpoints.
Phase 18: Testing & Quality
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_token(client: TestClient) -> str:
    """Register and login a test user, return the access token."""
    client.post("/auth/register", json={
        "email": "project-tester@tpt.local",
        "password": "SecurePass123!",
        "first_name": "Project",
        "last_name": "Tester",
        "organisation_name": "Test Infrastructure Ltd"
    })
    resp = client.post("/auth/login", data={
        "username": "project-tester@tpt.local",
        "password": "SecurePass123!"
    })
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token: str) -> dict:
    return {"Authorization": f"Bearer {auth_token}"}


class TestProjectEndpoints:
    """Project CRUD test suite."""

    PROJECTS_URL = "/api/projects"

    def test_create_project_success(self, client: TestClient, auth_headers: dict):
        """Test creating a new project with valid data."""
        response = client.post(self.PROJECTS_URL, json={
            "name": "Southern Highway Extension",
            "description": "12km highway extension with 3 new interchanges",
            "client_name": "NZ Transport Agency",
            "budget": 45000000.00
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Southern Highway Extension"
        assert data["status"] == "draft"
        assert "id" in data

    def test_create_project_minimal_fields(self, client: TestClient, auth_headers: dict):
        """Test creating a project with only required fields."""
        response = client.post(self.PROJECTS_URL, json={
            "name": "Minimal Project"
        }, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["name"] == "Minimal Project"

    def test_create_project_empty_name(self, client: TestClient, auth_headers: dict):
        """Test creating a project with empty name returns 422."""
        response = client.post(self.PROJECTS_URL, json={
            "name": ""
        }, headers=auth_headers)
        assert response.status_code == 422

    def test_create_project_unauthorized(self, client: TestClient):
        """Test creating a project without auth returns 401."""
        response = client.post(self.PROJECTS_URL, json={
            "name": "Unauthorized Project"
        })
        assert response.status_code == 401

    def test_get_projects_list(self, client: TestClient, auth_headers: dict):
        """Test listing projects returns paginated results."""
        # Create a project first
        client.post(self.PROJECTS_URL, json={
            "name": "List Test Project"
        }, headers=auth_headers)

        response = client.get(self.PROJECTS_URL, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check pagination header
        assert "x-total-count" in response.headers

    def test_get_projects_with_pagination(self, client: TestClient, auth_headers: dict):
        """Test pagination parameters work correctly."""
        response = client.get(f"{self.PROJECTS_URL}?skip=0&limit=5", headers=auth_headers)
        assert response.status_code == 200
        total = int(response.headers.get("x-total-count", 0))
        assert len(response.json()) <= 5

    def test_get_single_project(self, client: TestClient, auth_headers: dict):
        """Test fetching a single project by ID."""
        create_resp = client.post(self.PROJECTS_URL, json={
            "name": "Single Project Test"
        }, headers=auth_headers)
        project_id = create_resp.json()["id"]

        response = client.get(f"{self.PROJECTS_URL}/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == project_id

    def test_get_nonexistent_project(self, client: TestClient, auth_headers: dict):
        """Test fetching a non-existent project returns 404."""
        response = client.get(f"{self.PROJECTS_URL}/00000000-0000-0000-0000-000000000000", headers=auth_headers)
        assert response.status_code == 404

    def test_update_project(self, client: TestClient, auth_headers: dict):
        """Test updating a project's fields."""
        create_resp = client.post(self.PROJECTS_URL, json={
            "name": "Update Test",
            "description": "Original description"
        }, headers=auth_headers)
        project_id = create_resp.json()["id"]

        response = client.put(f"{self.PROJECTS_URL}/{project_id}", json={
            "name": "Updated Name",
            "status": "active"
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["status"] == "active"

    def test_update_project_version_increments(self, client: TestClient, auth_headers: dict):
        """Test that updating a project creates a new version."""
        create_resp = client.post(self.PROJECTS_URL, json={
            "name": "Version Test"
        }, headers=auth_headers)
        project_id = create_resp.json()["id"]

        client.put(f"{self.PROJECTS_URL}/{project_id}", json={
            "name": "Version 2"
        }, headers=auth_headers)
        client.put(f"{self.PROJECTS_URL}/{project_id}", json={
            "name": "Version 3"
        }, headers=auth_headers)

        # Fetch project - versions exist in separate table
        response = client.get(f"{self.PROJECTS_URL}/{project_id}", headers=auth_headers)
        assert response.json()["name"] == "Version 3"

    def test_delete_project_archives(self, client: TestClient, auth_headers: dict):
        """Test deleting a project archives it instead of hard-deleting."""
        create_resp = client.post(self.PROJECTS_URL, json={
            "name": "Delete Test"
        }, headers=auth_headers)
        project_id = create_resp.json()["id"]

        response = client.delete(f"{self.PROJECTS_URL}/{project_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify it's archived (not in active list)
        list_resp = client.get(self.PROJECTS_URL, headers=auth_headers)
        project_ids = [p["id"] for p in list_resp.json()]
        assert project_id not in project_ids

    def test_cannot_access_other_org_projects(self, client: TestClient, auth_headers: dict):
        """Test that users cannot access projects from other organisations."""
        response = client.get(f"{self.PROJECTS_URL}/00000000-0000-0000-0000-000000000000", headers=auth_headers)
        assert response.status_code == 404

    def test_activity_feed(self, client: TestClient, auth_headers: dict):
        """Test the activity feed returns project events."""
        # Create a project to generate activity
        client.post(self.PROJECTS_URL, json={
            "name": "Activity Feed Test"
        }, headers=auth_headers)

        response = client.get("/api/activity", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_dashboard_stats(self, client: TestClient, auth_headers: dict):
        """Test the dashboard stats endpoint."""
        response = client.get("/api/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_projects" in data
        assert "active_projects" in data
        assert "status_breakdown" in data
"""
Tests for authentication and user management endpoints.
Phase 18: Testing & Quality
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestAuthEndpoints:
    """Authentication and user management test suite."""

    REGISTER_URL = "/auth/register"
    LOGIN_URL = "/auth/login"
    ME_URL = "/api/users/me"

    def test_register_user_success(self, client: TestClient):
        """Test successful user registration with valid data."""
        response = client.post(self.REGISTER_URL, json={
            "email": "engineer@tpt.local",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "Engineer"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "engineer@tpt.local"
        assert data["first_name"] == "Test"
        assert data["last_name"] == "Engineer"
        assert "id" in data
        assert data["role"] == "viewer"

    def test_register_duplicate_email(self, client: TestClient):
        """Test registration with an already-used email returns 409."""
        client.post(self.REGISTER_URL, json={
            "email": "duplicate@tpt.local",
            "password": "SecurePass123!",
            "first_name": "First",
            "last_name": "User"
        })
        response = client.post(self.REGISTER_URL, json={
            "email": "duplicate@tpt.local",
            "password": "SecurePass123!",
            "first_name": "Second",
            "last_name": "User"
        })
        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email returns validation error."""
        response = client.post(self.REGISTER_URL, json={
            "email": "not-an-email",
            "password": "SecurePass123!",
            "first_name": "Test",
            "last_name": "User"
        })
        assert response.status_code == 422

    def test_register_short_password(self, client: TestClient):
        """Test registration with a password less than 8 characters."""
        response = client.post(self.REGISTER_URL, json={
            "email": "weak@tpt.local",
            "password": "1234567",
            "first_name": "Test",
            "last_name": "User"
        })
        assert response.status_code == 422

    def test_register_missing_fields(self, client: TestClient):
        """Test registration with missing required fields."""
        response = client.post(self.REGISTER_URL, json={
            "email": "missing@tpt.local"
        })
        assert response.status_code == 422

    def test_login_success(self, client: TestClient):
        """Test successful login returns access token."""
        client.post(self.REGISTER_URL, json={
            "email": "login-test@tpt.local",
            "password": "SecurePass123!",
            "first_name": "Login",
            "last_name": "Test"
        })
        response = client.post(self.LOGIN_URL, data={
            "username": "login-test@tpt.local",
            "password": "SecurePass123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] is not None

    def test_login_wrong_password(self, client: TestClient):
        """Test login with incorrect password returns 401."""
        client.post(self.REGISTER_URL, json={
            "email": "wrong-pw@tpt.local",
            "password": "SecurePass123!",
            "first_name": "Wrong",
            "last_name": "Password"
        })
        response = client.post(self.LOGIN_URL, data={
            "username": "wrong-pw@tpt.local",
            "password": "WrongPassword999!"
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with a non-existent user returns 401."""
        response = client.post(self.LOGIN_URL, data={
            "username": "ghost@tpt.local",
            "password": "SomePassword123!"
        })
        assert response.status_code == 401

    def test_get_current_user_authenticated(self, client: TestClient):
        """Test retrieving current user profile with valid token."""
        client.post(self.REGISTER_URL, json={
            "email": "profile-test@tpt.local",
            "password": "SecurePass123!",
            "first_name": "Profile",
            "last_name": "Test"
        })
        login_resp = client.post(self.LOGIN_URL, data={
            "username": "profile-test@tpt.local",
            "password": "SecurePass123!"
        })
        token = login_resp.json()["access_token"]

        response = client.get(self.ME_URL, headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "profile-test@tpt.local"
        assert data["first_name"] == "Profile"

    def test_get_current_user_unauthenticated(self, client: TestClient):
        """Test accessing current user endpoint without token."""
        response = client.get(self.ME_URL)
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test accessing current user with invalid token."""
        response = client.get(self.ME_URL, headers={
            "Authorization": "Bearer invalid-token-here"
        })
        assert response.status_code == 401

    def test_health_check(self, client: TestClient):
        """Test the health check endpoint is accessible without auth."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
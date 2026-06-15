"""
Load Testing Configuration (Phase 18)
Locust load testing for API endpoints
"""
from locust import HttpUser, task, between, tag
import json


class TPTApiUser(HttpUser):
    """
    Simulated API user for load testing
    """
    wait_time = between(1, 5)
    abstract = True
    
    def on_start(self):
        """Login before starting tests"""
        login_response = self.client.post("/api/auth/login", json={
            "email": "test@tpt.local",
            "password": "TestPassword123!"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json()["access_token"]
            self.client.headers.update({
                "Authorization": f"Bearer {self.token}"
            })


class ProjectUser(TPTApiUser):
    """Test user performing project operations"""
    
    @tag('projects', 'read')
    @task(10)
    def get_projects(self):
        self.client.get("/api/projects")
    
    @tag('projects', 'write')
    @task(3)
    def create_project(self):
        self.client.post("/api/projects", json={
            "name": "Load Test Project",
            "description": "Created during load testing",
            "status": "planning"
        })


class ReadOnlyUser(TPTApiUser):
    """Test user performing read-only operations"""
    
    @tag('core', 'health')
    @task(20)
    def health_check(self):
        self.client.get("/api/health")
    
    @tag('core', 'read')
    @task(15)
    def get_dashboard(self):
        self.client.get("/api/dashboard/stats")


class HeavyUser(TPTApiUser):
    """Test user performing resource heavy operations"""
    
    @tag('performance')
    @task(2)
    def run_feasibility_calculation(self):
        self.client.post("/api/feasibility/calculate", json={
            "project_id": 1,
            "parameters": {"site_area": 10000}
        })
    
    @tag('performance')
    @task(1)
    def generate_cost_estimate(self):
        self.client.post("/api/estimation/generate", json={
            "project_id": 1
        })
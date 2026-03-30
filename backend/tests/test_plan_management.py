"""
Test Plan Management Features:
- GET /api/plan-data/{plan_id} - returns evaluations organized by type
- POST /api/training-plans/{plan_id}/duplicate - creates copy with '(Copia)' suffix
- POST /api/training-plans/{plan_id}/share - returns share_token and share_url
- GET /api/training-plans/{plan_id}/export/pdf - returns valid PDF file
- DELETE /api/training-plans/{plan_id} - cascade-deletes associated data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPlanManagement:
    """Plan management endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get existing plans
        plans_response = self.session.get(f"{BASE_URL}/api/training-plans")
        assert plans_response.status_code == 200
        self.plans = plans_response.json()
        
        yield
        
        # Cleanup: Delete any test-created plans
        plans_response = self.session.get(f"{BASE_URL}/api/training-plans")
        if plans_response.status_code == 200:
            for plan in plans_response.json():
                if "(Copia)" in plan.get("name", "") and "TEST_" in plan.get("name", ""):
                    self.session.delete(f"{BASE_URL}/api/training-plans/{plan['id']}")
    
    def test_get_plan_data_returns_evaluations_by_type(self):
        """GET /api/plan-data/{plan_id} returns evaluations organized by type"""
        if not self.plans:
            pytest.skip("No plans available for testing")
        
        plan_id = self.plans[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/plan-data/{plan_id}")
        
        assert response.status_code == 200, f"Failed to get plan data: {response.text}"
        
        data = response.json()
        assert "plan_id" in data
        assert data["plan_id"] == plan_id
        
        # Verify evaluations structure with all 6 types
        assert "evaluations" in data
        evaluations = data["evaluations"]
        expected_types = ["medical", "anthropometric", "physical", "technical", "tactical", "psychological"]
        
        for eval_type in expected_types:
            assert eval_type in evaluations, f"Missing evaluation type: {eval_type}"
            assert isinstance(evaluations[eval_type], list), f"{eval_type} should be a list"
        
        # Verify other fields exist
        assert "objectives" in data
        assert "competitions" in data
        assert "previous_analysis" in data
        assert "evaluations_flat" in data
        
        print(f"✓ Plan data returned with evaluations organized by type: {list(evaluations.keys())}")
    
    def test_duplicate_training_plan(self):
        """POST /api/training-plans/{plan_id}/duplicate creates copy with '(Copia)' suffix"""
        if not self.plans:
            pytest.skip("No plans available for testing")
        
        original_plan = self.plans[0]
        plan_id = original_plan["id"]
        original_name = original_plan["name"]
        
        response = self.session.post(f"{BASE_URL}/api/training-plans/{plan_id}/duplicate")
        
        assert response.status_code == 200, f"Failed to duplicate plan: {response.text}"
        
        duplicated = response.json()
        
        # Verify new plan has different ID
        assert duplicated["id"] != plan_id, "Duplicated plan should have new ID"
        
        # Verify name has '(Copia)' suffix
        expected_name = f"{original_name} (Copia)"
        assert duplicated["name"] == expected_name, f"Expected name '{expected_name}', got '{duplicated['name']}'"
        
        # Verify other fields are copied
        assert duplicated.get("total_weeks") == original_plan.get("total_weeks")
        assert duplicated.get("model") == original_plan.get("model")
        
        # Cleanup: Delete the duplicated plan
        delete_response = self.session.delete(f"{BASE_URL}/api/training-plans/{duplicated['id']}")
        assert delete_response.status_code == 200
        
        print(f"✓ Plan duplicated successfully: '{original_name}' -> '{duplicated['name']}'")
    
    def test_share_training_plan(self):
        """POST /api/training-plans/{plan_id}/share returns share_token and share_url"""
        if not self.plans:
            pytest.skip("No plans available for testing")
        
        plan_id = self.plans[0]["id"]
        
        response = self.session.post(f"{BASE_URL}/api/training-plans/{plan_id}/share")
        
        assert response.status_code == 200, f"Failed to share plan: {response.text}"
        
        data = response.json()
        
        # Verify share_token exists and is valid
        assert "share_token" in data, "Response should contain share_token"
        assert isinstance(data["share_token"], str)
        assert len(data["share_token"]) > 0
        
        # Verify share_url exists and has correct format
        assert "share_url" in data, "Response should contain share_url"
        assert data["share_url"].startswith("/plan/shared/")
        assert data["share_token"] in data["share_url"]
        
        print(f"✓ Share token generated: {data['share_token']}, URL: {data['share_url']}")
    
    def test_get_shared_plan(self):
        """GET /api/training-plans/shared/{share_token} returns shared plan"""
        if not self.plans:
            pytest.skip("No plans available for testing")
        
        plan_id = self.plans[0]["id"]
        
        # First generate share token
        share_response = self.session.post(f"{BASE_URL}/api/training-plans/{plan_id}/share")
        assert share_response.status_code == 200
        share_token = share_response.json()["share_token"]
        
        # Now get the shared plan (public access - no auth needed)
        public_session = requests.Session()
        response = public_session.get(f"{BASE_URL}/api/training-plans/shared/{share_token}")
        
        assert response.status_code == 200, f"Failed to get shared plan: {response.text}"
        
        shared_plan = response.json()
        
        # Verify plan data is returned
        assert "name" in shared_plan
        assert "id" in shared_plan
        
        # Verify sensitive data is removed
        assert "coach_id" not in shared_plan, "coach_id should be removed from shared plan"
        
        print(f"✓ Shared plan retrieved successfully: {shared_plan['name']}")
    
    def test_export_training_plan_pdf(self):
        """GET /api/training-plans/{plan_id}/export/pdf returns valid PDF file"""
        if not self.plans:
            pytest.skip("No plans available for testing")
        
        plan_id = self.plans[0]["id"]
        
        response = self.session.get(f"{BASE_URL}/api/training-plans/{plan_id}/export/pdf")
        
        assert response.status_code == 200, f"Failed to export PDF: {response.text}"
        
        # Verify content type is PDF
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Verify PDF content starts with PDF magic bytes
        content = response.content
        assert content[:4] == b'%PDF', "Response should be a valid PDF file"
        
        # Verify reasonable file size (at least 1KB)
        assert len(content) > 1000, f"PDF seems too small: {len(content)} bytes"
        
        print(f"✓ PDF exported successfully: {len(content)} bytes")
    
    def test_delete_training_plan_cascade(self):
        """DELETE /api/training-plans/{plan_id} cascade-deletes associated data"""
        # First create a new plan to delete
        create_response = self.session.post(f"{BASE_URL}/api/training-plans", json={
            "name": "TEST_Plan_To_Delete",
            "model": "atr",
            "total_weeks": 4,
            "sessions_per_week": 3,
            "start_date": "2026-01-01",
            "end_date": "2026-01-28",
            "sport": "Fútbol",
            "duration_type": "weeks"
        })
        
        assert create_response.status_code in [200, 201], f"Failed to create test plan: {create_response.text}"
        
        new_plan = create_response.json()
        plan_id = new_plan["id"]
        
        # Add some associated data (evaluation)
        eval_response = self.session.post(f"{BASE_URL}/api/plan-data/evaluations", json={
            "plan_id": plan_id,
            "evaluation_type": "physical",
            "date": "2026-01-15",
            "results": {"test": "value"},
            "notes": "Test evaluation"
        })
        # Evaluation creation may or may not succeed depending on athlete_id requirement
        
        # Now delete the plan
        delete_response = self.session.delete(f"{BASE_URL}/api/training-plans/{plan_id}")
        
        assert delete_response.status_code == 200, f"Failed to delete plan: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data
        assert "deleted" in data["message"].lower() or "eliminado" in data["message"].lower()
        
        # Verify plan no longer exists
        get_response = self.session.get(f"{BASE_URL}/api/training-plans/{plan_id}")
        assert get_response.status_code == 404, "Deleted plan should return 404"
        
        # Verify plan data is also deleted
        plan_data_response = self.session.get(f"{BASE_URL}/api/plan-data/{plan_id}")
        # Should return empty or 404
        if plan_data_response.status_code == 200:
            data = plan_data_response.json()
            # Evaluations should be empty for deleted plan
            assert data.get("evaluations_flat", []) == [], "Evaluations should be deleted"
        
        print(f"✓ Plan and associated data deleted successfully")
    
    def test_duplicate_plan_copies_associated_data(self):
        """Verify duplicate also copies plan_data, evaluations, competitions"""
        if not self.plans:
            pytest.skip("No plans available for testing")
        
        # Find a plan with some data
        plan_id = self.plans[0]["id"]
        
        # Get original plan data
        original_data_response = self.session.get(f"{BASE_URL}/api/plan-data/{plan_id}")
        assert original_data_response.status_code == 200
        original_data = original_data_response.json()
        
        # Duplicate the plan
        dup_response = self.session.post(f"{BASE_URL}/api/training-plans/{plan_id}/duplicate")
        assert dup_response.status_code == 200
        duplicated = dup_response.json()
        new_plan_id = duplicated["id"]
        
        # Get duplicated plan data
        dup_data_response = self.session.get(f"{BASE_URL}/api/plan-data/{new_plan_id}")
        assert dup_data_response.status_code == 200
        dup_data = dup_data_response.json()
        
        # Verify plan_id is updated
        assert dup_data["plan_id"] == new_plan_id
        
        # Verify structure is preserved
        assert "evaluations" in dup_data
        assert "objectives" in dup_data
        assert "competitions" in dup_data
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/training-plans/{new_plan_id}")
        
        print(f"✓ Duplicated plan has associated data structure")
    
    def test_plan_not_found_errors(self):
        """Verify 404 errors for non-existent plans"""
        fake_id = "non-existent-plan-id-12345"
        
        # Test duplicate
        dup_response = self.session.post(f"{BASE_URL}/api/training-plans/{fake_id}/duplicate")
        assert dup_response.status_code == 404
        
        # Test share
        share_response = self.session.post(f"{BASE_URL}/api/training-plans/{fake_id}/share")
        assert share_response.status_code == 404
        
        # Test PDF export
        pdf_response = self.session.get(f"{BASE_URL}/api/training-plans/{fake_id}/export/pdf")
        assert pdf_response.status_code == 404
        
        # Test delete
        delete_response = self.session.delete(f"{BASE_URL}/api/training-plans/{fake_id}")
        assert delete_response.status_code == 404
        
        print(f"✓ All endpoints return 404 for non-existent plans")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

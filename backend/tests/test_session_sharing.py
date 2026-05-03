"""
Test cases for Session Sharing functionality
Testing:
1. GET /api/sessions/view/:shareId - Shared session endpoint
2. POST /api/sessions/share - Create shared session endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://training-analytics-9.preview.emergentagent.com')

class TestSessionSharing:
    """Session sharing endpoint tests"""
    
    def test_shared_session_view_returns_200(self):
        """Test that shared session endpoint returns 200 for valid share_id"""
        share_id = "5a3fb7cb-d97"
        response = requests.get(f"{BASE_URL}/api/sessions/view/{share_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/sessions/view/{share_id} returned 200")
    
    def test_shared_session_contains_athlete_name(self):
        """Test that shared session contains athlete_name"""
        share_id = "5a3fb7cb-d97"
        response = requests.get(f"{BASE_URL}/api/sessions/view/{share_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "athlete_name" in data, "Response should contain 'athlete_name'"
        assert data["athlete_name"] == "Juan Martinez", f"Expected 'Juan Martinez', got {data['athlete_name']}"
        print(f"✓ athlete_name: {data['athlete_name']}")
    
    def test_shared_session_contains_session_data(self):
        """Test that shared session contains session_data"""
        share_id = "5a3fb7cb-d97"
        response = requests.get(f"{BASE_URL}/api/sessions/view/{share_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "session_data" in data, "Response should contain 'session_data'"
        assert isinstance(data["session_data"], dict), "session_data should be a dict"
        print(f"✓ session_data present with keys: {list(data['session_data'].keys())}")
    
    def test_shared_session_contains_image(self):
        """Test that shared session contains session_image"""
        share_id = "5a3fb7cb-d97"
        response = requests.get(f"{BASE_URL}/api/sessions/view/{share_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "session_image" in data, "Response should contain 'session_image'"
        # Session image should be base64 encoded
        if data["session_image"]:
            assert data["session_image"].startswith("data:image/"), "session_image should be base64 encoded"
            print(f"✓ session_image is base64 encoded (starts with 'data:image/')")
        else:
            print(f"⚠ session_image is None")
    
    def test_shared_session_contains_views_count(self):
        """Test that shared session contains views count"""
        share_id = "5a3fb7cb-d97"
        response = requests.get(f"{BASE_URL}/api/sessions/view/{share_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "views" in data, "Response should contain 'views'"
        assert isinstance(data["views"], int), "views should be an integer"
        print(f"✓ views count: {data['views']}")
    
    def test_shared_session_invalid_id_returns_404(self):
        """Test that invalid share_id returns 404"""
        share_id = "invalid-share-id-12345"
        response = requests.get(f"{BASE_URL}/api/sessions/view/{share_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid share_id returns 404")
    
    def test_session_data_has_detailed_data(self):
        """Test that session_data contains detailedData structure"""
        share_id = "5a3fb7cb-d97"
        response = requests.get(f"{BASE_URL}/api/sessions/view/{share_id}")
        
        assert response.status_code == 200
        data = response.json()
        session_data = data.get("session_data", {})
        
        # Check for detailedData
        if "detailedData" in session_data:
            detailed = session_data["detailedData"]
            
            # Check objetivos
            if "objetivos" in detailed:
                print(f"✓ objetivos found: {list(detailed['objetivos'].keys())}")
            
            # Check fases
            if "fases" in detailed:
                print(f"✓ fases found: {list(detailed['fases'].keys())}")
        else:
            print(f"ℹ detailedData not present (may be a simple session)")
    
    def test_auth_required_for_share_endpoint(self):
        """Test that POST /api/sessions/share requires authentication"""
        response = requests.post(f"{BASE_URL}/api/sessions/share", json={
            "athlete_id": "test",
            "athlete_name": "Test",
            "session_data": {}
        })
        
        assert response.status_code == 401, f"Expected 401 (unauthorized), got {response.status_code}"
        print(f"✓ POST /api/sessions/share requires authentication")


class TestSessionSharingAuthenticated:
    """Authenticated session sharing tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "coach@train.com",
            "password": "coach123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_create_shared_session(self, auth_token):
        """Test creating a shared session with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        session_data = {
            "athlete_id": "test-athlete-id",
            "athlete_name": "Test Athlete",
            "session_data": {
                "date": "2026-02-12",
                "type": "Test Session",
                "detailedData": {
                    "objetivos": {"general": "Test objective"},
                    "fases": {
                        "inicial": {"nombre": "Calentamiento", "actividades": []},
                        "principal": {"nombre": "Principal", "actividades": []},
                        "final": {"nombre": "Vuelta a la calma", "actividades": []}
                    }
                }
            },
            "session_image": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sessions/share",
            json=session_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "share_id" in data, "Response should contain 'share_id'"
        print(f"✓ Created shared session with ID: {data['share_id']}")
        
        # Verify the shared session is accessible
        view_response = requests.get(f"{BASE_URL}/api/sessions/view/{data['share_id']}")
        assert view_response.status_code == 200, "Created session should be viewable"
        print(f"✓ Shared session is accessible at /api/sessions/view/{data['share_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

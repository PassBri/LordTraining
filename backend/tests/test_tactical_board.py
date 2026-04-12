"""
Test suite for Tactical Board API endpoints
Tests the AI-powered tactical board generation feature
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTacticalBoardAPI:
    """Tests for /api/tactical-board/generate endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_tactical_board_generate_football(self):
        """Test tactical board generation for football with default params"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "football",
            "description": "4-3-3 formation with high pressing",
            "num_team_a": 5,
            "num_team_b": 3
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "elements" in data, "Response should contain 'elements' array"
        assert isinstance(data["elements"], list), "Elements should be a list"
        
        # Verify elements have required fields
        for el in data["elements"]:
            assert "id" in el, "Each element should have an 'id'"
            assert "type" in el, "Each element should have a 'type'"
            assert "x" in el, "Each element should have 'x' coordinate"
            assert "y" in el, "Each element should have 'y' coordinate"
        
        print(f"Generated {len(data['elements'])} elements for football tactical board")
    
    def test_tactical_board_generate_basketball(self):
        """Test tactical board generation for basketball"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "basketball",
            "description": "Pick and roll play",
            "num_team_a": 5,
            "num_team_b": 5
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "elements" in data, "Response should contain 'elements' array"
        print(f"Generated {len(data['elements'])} elements for basketball tactical board")
    
    def test_tactical_board_generate_volleyball(self):
        """Test tactical board generation for volleyball"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "volleyball",
            "description": "6-2 rotation",
            "num_team_a": 6,
            "num_team_b": 0
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "elements" in data, "Response should contain 'elements' array"
        print(f"Generated {len(data['elements'])} elements for volleyball tactical board")
    
    def test_tactical_board_generate_handball(self):
        """Test tactical board generation for handball"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "handball",
            "description": "Defensive formation",
            "num_team_a": 7,
            "num_team_b": 7
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "elements" in data, "Response should contain 'elements' array"
        print(f"Generated {len(data['elements'])} elements for handball tactical board")
    
    def test_tactical_board_generate_futsal(self):
        """Test tactical board generation for futsal"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "futsal",
            "description": "2-2 formation",
            "num_team_a": 5,
            "num_team_b": 5
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "elements" in data, "Response should contain 'elements' array"
        print(f"Generated {len(data['elements'])} elements for futsal tactical board")
    
    def test_tactical_board_generate_tennis(self):
        """Test tactical board generation for tennis"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "tennis",
            "description": "Doubles positioning",
            "num_team_a": 2,
            "num_team_b": 2
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "elements" in data, "Response should contain 'elements' array"
        print(f"Generated {len(data['elements'])} elements for tennis tactical board")
    
    def test_tactical_board_generate_empty_description(self):
        """Test tactical board generation with empty description"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "football",
            "description": "",
            "num_team_a": 5,
            "num_team_b": 0
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "elements" in data, "Response should contain 'elements' array"
        print(f"Generated {len(data['elements'])} elements with empty description")
    
    def test_tactical_board_generate_requires_auth(self):
        """Test that tactical board generation requires authentication"""
        # Create a new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "football",
            "description": "Test",
            "num_team_a": 5,
            "num_team_b": 0
        })
        
        # Should return 401 or 403 for unauthenticated request
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated request, got {response.status_code}"
        print(f"Correctly rejected unauthenticated request with status {response.status_code}")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")
    
    def test_auth_login(self):
        """Test login endpoint works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Login response should contain token"
        print("Login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

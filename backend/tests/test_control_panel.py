"""
Test Control Panel API endpoints:
- GET /api/control-panel/stats - Statistics for control panel
- POST /api/control-panel/export-pdf - Export PDF report
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@train.com"
TEST_PASSWORD = "demo123456"


class TestControlPanelStats:
    """Tests for /api/control-panel/stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token for authenticated requests"""
        self.session = requests.Session()
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            # Try to register if login fails
            register_response = self.session.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                    "name": "Demo User",
                    "role": "coach"
                }
            )
            if register_response.status_code in [200, 201]:
                login_response = self.session.post(
                    f"{BASE_URL}/api/auth/login",
                    json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
                )
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            })
        else:
            pytest.skip(f"Could not authenticate: {login_response.status_code}")
    
    def test_get_control_panel_stats_success(self):
        """Test GET /api/control-panel/stats returns 200 and correct structure"""
        response = self.session.get(f"{BASE_URL}/api/control-panel/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields exist
        assert "athletes_count" in data, "Missing athletes_count"
        assert "upcoming_events" in data, "Missing upcoming_events"
        assert "upcoming_events_count" in data, "Missing upcoming_events_count"
        assert "total_sessions" in data, "Missing total_sessions"
        assert "completed_sessions" in data, "Missing completed_sessions"
        assert "completion_rate" in data, "Missing completion_rate"
        assert "active_macrocycles" in data, "Missing active_macrocycles"
        
        # Verify data types
        assert isinstance(data["athletes_count"], int), "athletes_count should be int"
        assert isinstance(data["upcoming_events"], list), "upcoming_events should be list"
        assert isinstance(data["upcoming_events_count"], int), "upcoming_events_count should be int"
        
        print(f"Control panel stats retrieved successfully:")
        print(f"  - Athletes: {data['athletes_count']}")
        print(f"  - Upcoming events: {data['upcoming_events_count']}")
        print(f"  - Active macrocycles: {data['active_macrocycles']}")
        print(f"  - Completion rate: {data['completion_rate']}%")
    
    def test_control_panel_stats_has_volume_data(self):
        """Test that volume_data array exists in response"""
        response = self.session.get(f"{BASE_URL}/api/control-panel/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "volume_data" in data, "Missing volume_data"
        assert isinstance(data["volume_data"], list), "volume_data should be list"
        
        print(f"Volume data entries: {len(data.get('volume_data', []))}")
    
    def test_control_panel_stats_has_intensity_data(self):
        """Test that intensity_data array exists in response"""
        response = self.session.get(f"{BASE_URL}/api/control-panel/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "intensity_data" in data, "Missing intensity_data"
        assert isinstance(data["intensity_data"], list), "intensity_data should be list"
        
        print(f"Intensity data entries: {len(data.get('intensity_data', []))}")
    
    def test_control_panel_stats_has_phase_distribution(self):
        """Test that phase_distribution array exists"""
        response = self.session.get(f"{BASE_URL}/api/control-panel/stats")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "phase_distribution" in data, "Missing phase_distribution"
        assert isinstance(data["phase_distribution"], list), "phase_distribution should be list"
        
        print(f"Phase distribution entries: {len(data.get('phase_distribution', []))}")
    
    def test_control_panel_stats_without_auth(self):
        """Test that endpoint requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/control-panel/stats")
        
        # Should fail without auth (401 or 403)
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("Correctly rejected unauthenticated request")


class TestControlPanelExportPDF:
    """Tests for /api/control-panel/export-pdf endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token for authenticated requests"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            register_response = self.session.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                    "name": "Demo User",
                    "role": "coach"
                }
            )
            if register_response.status_code in [200, 201]:
                login_response = self.session.post(
                    f"{BASE_URL}/api/auth/login",
                    json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
                )
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            })
        else:
            pytest.skip(f"Could not authenticate: {login_response.status_code}")
    
    def test_export_pdf_all_sections(self):
        """Test PDF export with all sections included"""
        payload = {
            "include_summary": True,
            "include_volume_chart": True,
            "include_intensity_chart": True,
            "include_calendar": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/control-panel/export-pdf",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is PDF
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Verify content disposition header
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Expected attachment disposition"
        assert ".pdf" in content_disp, "Expected .pdf in filename"
        
        # Verify PDF content starts with %PDF
        content = response.content
        assert content[:4] == b'%PDF', "Response does not start with PDF header"
        assert len(content) > 1000, f"PDF seems too small: {len(content)} bytes"
        
        print(f"PDF generated successfully: {len(content)} bytes")
        print(f"Content-Disposition: {content_disp}")
    
    def test_export_pdf_summary_only(self):
        """Test PDF export with only summary section"""
        payload = {
            "include_summary": True,
            "include_volume_chart": False,
            "include_intensity_chart": False,
            "include_calendar": False
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/control-panel/export-pdf",
            json=payload
        )
        
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
        
        print(f"Summary-only PDF: {len(response.content)} bytes")
    
    def test_export_pdf_volume_chart_only(self):
        """Test PDF export with volume chart section only"""
        payload = {
            "include_summary": False,
            "include_volume_chart": True,
            "include_intensity_chart": False,
            "include_calendar": False
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/control-panel/export-pdf",
            json=payload
        )
        
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
        
        print(f"Volume chart PDF: {len(response.content)} bytes")
    
    def test_export_pdf_without_auth(self):
        """Test that PDF export requires authentication"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/control-panel/export-pdf",
            json={"include_summary": True}
        )
        
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("Correctly rejected unauthenticated PDF request")


class TestAuthFlow:
    """Test authentication for control panel access"""
    
    def test_login_with_demo_credentials(self):
        """Test login with demo@train.com credentials"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        # Either login succeeds or user doesn't exist yet
        if response.status_code == 200:
            data = response.json()
            assert "token" in data, "Missing token in login response"
            assert "user" in data, "Missing user in login response"
            assert data["user"]["email"] == TEST_EMAIL
            print(f"Login successful for {TEST_EMAIL}")
        elif response.status_code == 401:
            # User may not exist - try to register
            print("User not found - attempting registration")
            reg_response = session.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                    "name": "Demo User",
                    "role": "coach"
                }
            )
            assert reg_response.status_code in [200, 201, 400], f"Registration failed: {reg_response.status_code}"
            print(f"Registration response: {reg_response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

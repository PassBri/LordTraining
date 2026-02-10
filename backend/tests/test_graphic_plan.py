"""
Backend API Tests for Sistema TRAIN
Tests: Auth, GraphicPlan, and related endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self):
        """Test that health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("Health endpoint OK")
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Root endpoint OK: {data}")
    
    def test_login_demo_user(self):
        """Test login with demo credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@test.com", "password": "demo123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo@test.com"
        print(f"Login successful for {data['user']['email']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpass"}
        )
        assert response.status_code == 401
        print("Invalid login correctly rejected with 401")


class TestGraphicPlan:
    """GraphicPlan API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@test.com", "password": "demo123"}
        )
        if response.status_code != 200:
            pytest.skip("Login failed - cannot run authenticated tests")
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_graphic_plan_null_athlete(self):
        """Test GET graphic plan with null athlete ID (initial state)"""
        response = requests.get(
            f"{BASE_URL}/api/graphic-plan/null",
            headers=self.headers
        )
        # Should return 404 if no plan exists, or 200 if it does
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, {response.text}"
        print(f"GET graphic-plan/null returned {response.status_code}")
    
    def test_save_graphic_plan(self):
        """Test POST graphic plan to save a new plan"""
        plan_data = {
            "athlete_id": None,
            "generalInfo": {
                "sport": "Football",
                "category": "Profesional",
                "athlete": "Test Athlete",
                "coach": "Test Coach",
                "periodizationType": "tradicional"
            },
            "planData": {
                "macrocycles": {"1": "preparatory_general", "2": "preparatory_general"},
                "mesocycles": {"1": "entrante", "2": "basico_desarrollador"},
                "microcycles": {"1": "corriente", "2": "carga"},
                "intensity": {"very_high_1": 3, "high_2": 4},
                "volume": {},
                "preparation": {"general_physical_1": True},
                "physical": {"endurance_1": 2},
                "activities": {"training_1": True},
                "monitoring": {"medical_1": True}
            },
            "cycleDuration": "annual"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/graphic-plan",
            json=plan_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Save failed: {response.text}"
        data = response.json()
        assert "id" in data or "message" in data
        print(f"Graphic plan saved: {data}")
    
    def test_save_and_get_graphic_plan(self):
        """Test full cycle: save then retrieve graphic plan"""
        # First save
        plan_data = {
            "athlete_id": None,
            "generalInfo": {
                "sport": "Natacion",
                "category": "Junior",
                "athlete": "Maria Test",
                "coach": "Coach Test",
                "periodizationType": "atr"
            },
            "planData": {
                "macrocycles": {"1": "competitive", "2": "transition"},
                "intensity": {"high_1": 5}
            },
            "cycleDuration": "semester"
        }
        
        save_response = requests.post(
            f"{BASE_URL}/api/graphic-plan",
            json=plan_data,
            headers=self.headers
        )
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        print(f"Plan saved: {save_response.json()}")
        
        # Then retrieve
        get_response = requests.get(
            f"{BASE_URL}/api/graphic-plan/null",
            headers=self.headers
        )
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        data = get_response.json()
        
        # Verify data persisted correctly
        assert data["generalInfo"]["sport"] == "Natacion"
        assert data["generalInfo"]["category"] == "Junior"
        assert data["cycleDuration"] == "semester"
        print(f"Plan retrieved and verified: sport={data['generalInfo']['sport']}, cycle={data['cycleDuration']}")
    
    def test_update_graphic_plan(self):
        """Test updating an existing graphic plan"""
        # First save initial data
        initial_data = {
            "athlete_id": None,
            "generalInfo": {"sport": "Initial Sport"},
            "planData": {},
            "cycleDuration": "annual"
        }
        requests.post(f"{BASE_URL}/api/graphic-plan", json=initial_data, headers=self.headers)
        
        # Update with new data
        updated_data = {
            "athlete_id": None,
            "generalInfo": {"sport": "Updated Sport", "coach": "New Coach"},
            "planData": {"macrocycles": {"1": "competitive"}},
            "cycleDuration": "olympic"
        }
        update_response = requests.post(
            f"{BASE_URL}/api/graphic-plan",
            json=updated_data,
            headers=self.headers
        )
        assert update_response.status_code == 200
        assert "updated" in update_response.json().get("message", "").lower() or "id" in update_response.json()
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/graphic-plan/null", headers=self.headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["generalInfo"]["sport"] == "Updated Sport"
        assert data["cycleDuration"] == "olympic"
        print("Graphic plan updated and verified successfully")


class TestAthletes:
    """Athletes API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@test.com", "password": "demo123"}
        )
        if response.status_code != 200:
            pytest.skip("Login failed")
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_athletes(self):
        """Test GET athletes list"""
        response = requests.get(f"{BASE_URL}/api/athletes", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} athletes")
    
    def test_get_dashboard_stats(self):
        """Test GET dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "athletes_count" in data
        assert "subscription" in data
        print(f"Dashboard stats: {data['athletes_count']} athletes, {data['subscription']} plan")


class TestCycleAPIs:
    """Test cycle-related APIs (training stages, periodization models)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@test.com", "password": "demo123"}
        )
        if response.status_code != 200:
            pytest.skip("Login failed")
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_training_stages_not_found(self):
        """Test GET training stages returns 404 for non-existent data"""
        response = requests.get(
            f"{BASE_URL}/api/training-stages/test-nonexistent-id",
            headers=self.headers
        )
        assert response.status_code == 404
        print("Training stages correctly returns 404 for non-existent data")
    
    def test_get_periodization_models_not_found(self):
        """Test GET periodization models returns 404 for non-existent data"""
        response = requests.get(
            f"{BASE_URL}/api/periodization-models/test-nonexistent-id",
            headers=self.headers
        )
        assert response.status_code == 404
        print("Periodization models correctly returns 404 for non-existent data")
    
    def test_exercises_endpoint(self):
        """Test GET exercises endpoint"""
        response = requests.get(f"{BASE_URL}/api/exercises", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} exercises")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

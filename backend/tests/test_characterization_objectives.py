"""
Tests for Characterization and Objectives endpoints
Bug Fix Verification: Data saving functionality for:
- Sport Characterization (/api/characterization/sport)
- Athlete Characterization (/api/characterization/athlete)
- Objectives (/api/objectives)
"""
import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    pytest.skip("REACT_APP_BACKEND_URL not set", allow_module_level=True)

# Test credentials
TEST_EMAIL = "test@train.com"
TEST_PASSWORD = "test123456"

class TestAuth:
    """Authentication tests and token retrieval"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    def test_login_success(self, auth_token):
        """Verify login works with test credentials"""
        assert auth_token is not None
        print(f"✓ Login successful, token obtained")


class TestSportCharacterization:
    """Sport Characterization endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            token = response.json().get("token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Login failed")
    
    @pytest.fixture(scope="class")
    def test_athlete_id(self, auth_headers):
        """Create or get a test athlete"""
        # First try to get existing athletes
        response = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]["id"]
        
        # Create new athlete if none exists
        athlete_data = {
            "name": f"TEST_Athlete_{uuid.uuid4().hex[:8]}",
            "sport": "athletics",
            "age": 25,
            "level": "intermedio",
            "notes": "Test athlete for characterization tests"
        }
        response = requests.post(f"{BASE_URL}/api/athletes", json=athlete_data, headers=auth_headers)
        if response.status_code == 200:
            return response.json()["id"]
        pytest.skip("Could not create test athlete")
    
    def test_save_sport_characterization(self, auth_headers, test_athlete_id):
        """Test POST /api/characterization/sport - Save sport characterization"""
        test_data = {
            "athlete_id": test_athlete_id,
            "sportName": "Atletismo - 100m planos",
            "movementOrganization": "Movimientos cíclicos de alta velocidad",
            "predominantEnergy": "Sistema ATP-PC (anaeróbico aláctico)",
            "determinantEnergy": "Fosfocreatina",
            "muscularFibers": "Fibras Tipo IIx (rápidas glucolíticas)",
            "energySubstrate": "ATP y fosfocreatina",
            "generalMotor": "Velocidad, fuerza explosiva, coordinación",
            "specialMotor": "Técnica de carrera, salida de tacos",
            "effortType": "Explosivo de muy corta duración (10-12 segundos)",
            "observation": "Test observation for sport",
            "description": "Sprint de velocidad máxima"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/characterization/sport",
            json=test_data,
            headers=auth_headers
        )
        
        print(f"POST /api/characterization/sport Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "id" in data
        assert data["message"] in ["Characterization saved", "Characterization updated"]
        print(f"✓ Sport characterization saved successfully with id: {data['id']}")
    
    def test_get_sport_characterization(self, auth_headers, test_athlete_id):
        """Test GET /api/characterization/sport/{athlete_id} - Read saved data"""
        response = requests.get(
            f"{BASE_URL}/api/characterization/sport/{test_athlete_id}",
            headers=auth_headers
        )
        
        print(f"GET /api/characterization/sport/{test_athlete_id} Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify data was persisted correctly
        assert data.get("sportName") == "Atletismo - 100m planos", "Sport name not persisted"
        assert data.get("predominantEnergy") == "Sistema ATP-PC (anaeróbico aláctico)", "Predominant energy not persisted"
        assert data.get("athlete_id") == test_athlete_id, "Athlete ID mismatch"
        print(f"✓ Sport characterization data verified - sportName: {data.get('sportName')}")
    
    def test_update_sport_characterization(self, auth_headers, test_athlete_id):
        """Test updating existing sport characterization"""
        updated_data = {
            "athlete_id": test_athlete_id,
            "sportName": "Atletismo - 200m planos (UPDATED)",
            "movementOrganization": "Movimientos cíclicos actualizados",
            "predominantEnergy": "Sistema mixto ATP-PC/Glucolítico",
            "determinantEnergy": "Glucógeno muscular",
            "muscularFibers": "Fibras Tipo IIa",
            "energySubstrate": "ATP y glucosa",
            "generalMotor": "Resistencia a la velocidad",
            "specialMotor": "Técnica de curva",
            "effortType": "Alta intensidad prolongada (20-25 segundos)",
            "observation": "Updated observation",
            "description": "Sprint de velocidad con curva"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/characterization/sport",
            json=updated_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Characterization updated"
        
        # Verify update by GET
        get_response = requests.get(
            f"{BASE_URL}/api/characterization/sport/{test_athlete_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert "UPDATED" in get_data.get("sportName", ""), "Update not persisted"
        print(f"✓ Sport characterization updated and verified")


class TestAthleteCharacterization:
    """Athlete Characterization endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            token = response.json().get("token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Login failed")
    
    @pytest.fixture(scope="class")
    def test_athlete_id(self, auth_headers):
        """Get a test athlete"""
        response = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]["id"]
        pytest.skip("No athlete available for testing")
    
    def test_save_athlete_characterization(self, auth_headers, test_athlete_id):
        """Test POST /api/characterization/athlete - Save athlete characterization"""
        test_data = {
            "athlete_id": test_athlete_id,
            "name": "Juan Carlos Test",
            "experience": "5 años de entrenamiento",
            "age": "25",
            "position": "Velocista",
            "level": "Avanzado",
            "observation": "Atleta con buen potencial",
            "inheritance": "Padre ex-atleta profesional",
            "biologicalAge": "23 años (adelantado)",
            "optimalSelectionAge": "14 años",
            "healthStatus": "Excelente condición cardiovascular",
            "anthropometricParams": "Altura: 1.82m, Peso: 75kg, %Grasa: 8%",
            "physicalQualities": "Fuerza explosiva alta, resistencia moderada",
            "cognitiveCapabilities": "Excelente concentración y toma de decisiones",
            "psychologicalCharacteristics": "Alta motivación, buena tolerancia al estrés",
            "socioeconomicCharacteristics": "Apoyo familiar estable",
            "environment": "Estudiante universitario de tiempo parcial",
            "nutritionalStatus": "Dieta balanceada, suplementación adecuada",
            "sportsTrajectory": "Campeón nacional juvenil 2022",
            "otherSportsExperience": "Fútbol en edad juvenil",
            "previousSeasonPerformance": "10.45s en 100m (récord personal)",
            "objectives": "Clasificar a juegos olímpicos",
            "trainingLevels": "6 sesiones semanales, 2 horas por sesión",
            "currentForm": "En fase de preparación general",
            "injuries": "Distensión leve en isquiotibiales (2021, recuperado)"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/characterization/athlete",
            json=test_data,
            headers=auth_headers
        )
        
        print(f"POST /api/characterization/athlete Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "id" in data
        assert data["message"] in ["Characterization saved", "Characterization updated"]
        print(f"✓ Athlete characterization saved successfully with id: {data['id']}")
    
    def test_get_athlete_characterization(self, auth_headers, test_athlete_id):
        """Test GET /api/characterization/athlete/{athlete_id} - Read saved data"""
        response = requests.get(
            f"{BASE_URL}/api/characterization/athlete/{test_athlete_id}",
            headers=auth_headers
        )
        
        print(f"GET /api/characterization/athlete/{test_athlete_id} Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify key fields were persisted
        assert data.get("name") == "Juan Carlos Test", "Name not persisted"
        assert data.get("level") == "Avanzado", "Level not persisted"
        assert data.get("athlete_id") == test_athlete_id, "Athlete ID mismatch"
        print(f"✓ Athlete characterization data verified - name: {data.get('name')}, level: {data.get('level')}")


class TestObjectives:
    """Objectives endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            token = response.json().get("token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Login failed")
    
    @pytest.fixture(scope="class")
    def test_athlete_id(self, auth_headers):
        """Get a test athlete"""
        response = requests.get(f"{BASE_URL}/api/athletes", headers=auth_headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]["id"]
        pytest.skip("No athlete available for testing")
    
    def test_save_objectives(self, auth_headers, test_athlete_id):
        """Test POST /api/objectives - Save objectives"""
        test_objectives = [
            {
                "id": "obj_1",
                "title": "Mejorar marca en 100m",
                "description": "Reducir el tiempo de 10.45s a 10.20s",
                "category": "performance",
                "timeframe": "medium",
                "startDate": "2026-01-01",
                "targetDate": "2026-06-30",
                "indicators": [
                    {
                        "name": "Tiempo en 100m",
                        "type": "quantitative",
                        "baseline": "10.45",
                        "target": "10.20",
                        "current": "10.35",
                        "unit": "segundos"
                    }
                ],
                "progress": 40,
                "status": "active",
                "notes": "Enfocarse en la fase de aceleración"
            },
            {
                "id": "obj_2",
                "title": "Aumentar fuerza en sentadilla",
                "description": "Incrementar 1RM en sentadilla",
                "category": "physical",
                "timeframe": "short",
                "startDate": "2026-01-01",
                "targetDate": "2026-03-31",
                "indicators": [
                    {
                        "name": "1RM Sentadilla",
                        "type": "quantitative",
                        "baseline": "140",
                        "target": "160",
                        "current": "150",
                        "unit": "kg"
                    }
                ],
                "progress": 50,
                "status": "active",
                "notes": "Programación lineal de fuerza"
            }
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/objectives",
            json={
                "athlete_id": test_athlete_id,
                "objectives": test_objectives
            },
            headers=auth_headers
        )
        
        print(f"POST /api/objectives Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "id" in data
        assert data["message"] in ["Objectives saved", "Objectives updated"]
        print(f"✓ Objectives saved successfully with id: {data['id']}")
    
    def test_get_objectives(self, auth_headers, test_athlete_id):
        """Test GET /api/objectives/{athlete_id} - Read saved objectives"""
        response = requests.get(
            f"{BASE_URL}/api/objectives/{test_athlete_id}",
            headers=auth_headers
        )
        
        print(f"GET /api/objectives/{test_athlete_id} Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "objectives" in data, "Response should contain objectives array"
        objectives = data["objectives"]
        assert len(objectives) >= 2, f"Expected at least 2 objectives, got {len(objectives)}"
        
        # Verify first objective
        obj1 = next((o for o in objectives if o.get("id") == "obj_1"), None)
        assert obj1 is not None, "First objective not found"
        assert obj1.get("title") == "Mejorar marca en 100m", "Title not persisted"
        assert obj1.get("category") == "performance", "Category not persisted"
        
        print(f"✓ Objectives data verified - {len(objectives)} objectives found")
    
    def test_update_objectives(self, auth_headers, test_athlete_id):
        """Test updating existing objectives"""
        updated_objectives = [
            {
                "id": "obj_1",
                "title": "Mejorar marca en 100m (UPDATED)",
                "description": "Reducir el tiempo de 10.45s a 10.15s",
                "category": "performance",
                "timeframe": "medium",
                "indicators": [
                    {
                        "name": "Tiempo en 100m",
                        "type": "quantitative",
                        "baseline": "10.45",
                        "target": "10.15",
                        "current": "10.30",
                        "unit": "segundos"
                    }
                ],
                "progress": 60,
                "status": "active"
            }
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/objectives",
            json={
                "athlete_id": test_athlete_id,
                "objectives": updated_objectives
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Objectives updated"
        
        # Verify update by GET
        get_response = requests.get(
            f"{BASE_URL}/api/objectives/{test_athlete_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        objectives = get_data.get("objectives", [])
        
        obj1 = next((o for o in objectives if o.get("id") == "obj_1"), None)
        assert obj1 is not None, "Updated objective not found"
        assert "UPDATED" in obj1.get("title", ""), "Update not persisted"
        print(f"✓ Objectives updated and verified")


class TestObjectivesIndicatorsComponent:
    """Test that ObjectivesIndicators component is correctly integrated in DashboardPage"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code == 200:
            token = response.json().get("token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Login failed")
    
    def test_objectives_endpoint_exists(self, auth_headers):
        """Verify /api/objectives endpoint is accessible"""
        # Test with a dummy athlete_id first
        response = requests.get(
            f"{BASE_URL}/api/objectives/test-athlete-id",
            headers=auth_headers
        )
        # Should return 404 (not found) for non-existent athlete, not 500
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ Objectives endpoint is accessible (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

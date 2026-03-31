"""
Test Plan Data Loading - P0 Feature
Tests for data loading when selecting an existing plan:
- POST/GET /api/plan-data/previous-analysis (with data dict field)
- POST/GET /api/plan-data/objectives (with data dict field)
- GET /api/plan-data/{plan_id} aggregated endpoint
- POST /api/plan-data/evaluations for medical/physical evaluations
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@train.com"
TEST_PASSWORD = "test123456"
TEST_PLAN_ID = "0cd4acaa-7e8e-463d-b4ac-54c3a47a766b"  # Pre-existing test plan


class TestPlanDataLoading:
    """Test plan data loading functionality - P0 feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        assert token, "No token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create a test plan for this test session
        self.test_plan_id = f"TEST_{uuid.uuid4().hex[:8]}"
        
    def teardown_method(self):
        """Cleanup test data"""
        # Cleanup is handled by test plan deletion if needed
        pass

    # ============ PREVIOUS ANALYSIS TESTS ============
    
    def test_save_previous_analysis_with_data_dict(self):
        """Test POST /api/plan-data/previous-analysis saves data with 'data' dict field"""
        test_data = {
            "plan_id": TEST_PLAN_ID,
            "previous_plan_summary": "Test summary",
            "achievements": ["Achievement 1", "Achievement 2"],
            "areas_to_improve": ["Area 1"],
            "lessons_learned": ["Lesson 1"],
            "athlete_feedback": "Good feedback",
            "data": {
                "fechaInicio": "2025-01-01",
                "fechaFinalizacion": "2025-06-30",
                "duracionSemanas": "26",
                "objetivoPrincipal": "Mejorar rendimiento",
                "cumplimiento": {
                    "general": "total",
                    "fisica": "parcial",
                    "tecnica": "total",
                    "tactica": "parcial",
                    "psicologica": "total"
                },
                "porcentajeCumplimiento": "85",
                "fortalezas": ["Fuerza", "Resistencia", "Velocidad"],
                "debilidades": ["Flexibilidad", "Coordinación", ""],
                "indicadores": {
                    "vo2max": {"inicial": "45", "final": "52", "delta": "+7"},
                    "sentadilla": {"inicial": "100", "final": "120", "delta": "+20"}
                },
                "lesiones": "no",
                "conclusiones": "Plan exitoso",
                "recomendaciones": "Continuar con el programa"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/plan-data/previous-analysis", json=test_data)
        assert response.status_code == 200, f"Failed to save previous analysis: {response.text}"
        
        result = response.json()
        assert "id" in result, "Response should contain id"
        assert result["plan_id"] == TEST_PLAN_ID
        assert result["data"]["fechaInicio"] == "2025-01-01"
        assert result["data"]["porcentajeCumplimiento"] == "85"
        assert result["data"]["cumplimiento"]["general"] == "total"
        print("✓ POST /api/plan-data/previous-analysis saves data with 'data' dict field")

    def test_get_previous_analysis_returns_data_dict(self):
        """Test GET /api/plan-data/previous-analysis/{plan_id} returns data correctly"""
        response = self.session.get(f"{BASE_URL}/api/plan-data/previous-analysis/{TEST_PLAN_ID}")
        assert response.status_code == 200, f"Failed to get previous analysis: {response.text}"
        
        result = response.json()
        if result:  # May be null if no data exists
            assert "data" in result, "Response should contain 'data' field"
            assert isinstance(result["data"], dict), "'data' should be a dict"
            print(f"✓ GET /api/plan-data/previous-analysis returns data: {list(result['data'].keys())}")
        else:
            print("✓ GET /api/plan-data/previous-analysis returns null (no data yet)")

    # ============ OBJECTIVES TESTS ============
    
    def test_save_objectives_with_data_dict(self):
        """Test POST /api/plan-data/objectives saves data with 'data' dict field"""
        test_data = {
            "plan_id": TEST_PLAN_ID,
            "main_objective": "Mejorar rendimiento deportivo",
            "secondary_objectives": ["Aumentar fuerza", "Mejorar resistencia"],
            "performance_indicators": [{"name": "VO2max", "target": "55"}],
            "timeline": "6 meses",
            "data": {
                "deporteObjetivo": "Fútbol",
                "categoria": "Senior",
                "edad": "25",
                "clasificacion": "Profesional",
                "fechaInicio": "2025-01-15",
                "fechaFin": "2025-07-15",
                "entrenador": "Juan Pérez",
                "largoPlazo": ["Campeonato nacional", "Mejorar ranking", ""],
                "medianoPlazo": ["Ganar liga local", "Reducir lesiones", ""],
                "cortoPlazo": ["Mejorar técnica", "Aumentar resistencia", ""],
                "porAspecto": {
                    "general": {"objetivo": "Rendimiento óptimo", "indicador": "Ranking top 10"},
                    "fisicaGeneral": {"objetivo": "Fuerza base", "indicador": "Sentadilla 1.5x peso"},
                    "fisicaEspecial": {"objetivo": "Potencia", "indicador": "CMJ 45cm"},
                    "tecnica": {"objetivo": "Precisión", "indicador": "90% efectividad"},
                    "tactica": {"objetivo": "Lectura de juego", "indicador": "Decisiones correctas"},
                    "teorica": {"objetivo": "Conocimiento reglas", "indicador": "Test 100%"},
                    "psicologica": {"objetivo": "Control emocional", "indicador": "Escala 8/10"}
                }
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/plan-data/objectives", json=test_data)
        assert response.status_code == 200, f"Failed to save objectives: {response.text}"
        
        result = response.json()
        assert "id" in result, "Response should contain id"
        assert result["plan_id"] == TEST_PLAN_ID
        assert result["data"]["deporteObjetivo"] == "Fútbol"
        assert result["data"]["categoria"] == "Senior"
        assert len(result["data"]["largoPlazo"]) == 3
        print("✓ POST /api/plan-data/objectives saves data with 'data' dict field")

    def test_get_objectives_returns_data_dict(self):
        """Test GET /api/plan-data/objectives/{plan_id} returns data correctly"""
        response = self.session.get(f"{BASE_URL}/api/plan-data/objectives/{TEST_PLAN_ID}")
        assert response.status_code == 200, f"Failed to get objectives: {response.text}"
        
        result = response.json()
        if result:
            assert "data" in result, "Response should contain 'data' field"
            assert isinstance(result["data"], dict), "'data' should be a dict"
            print(f"✓ GET /api/plan-data/objectives returns data: {list(result['data'].keys())}")
        else:
            print("✓ GET /api/plan-data/objectives returns null (no data yet)")

    # ============ AGGREGATED PLAN DATA TESTS ============
    
    def test_get_all_plan_data_returns_objectives_and_previous_analysis(self):
        """Test GET /api/plan-data/{plan_id} returns objectives.data and previous_analysis.data"""
        response = self.session.get(f"{BASE_URL}/api/plan-data/{TEST_PLAN_ID}")
        assert response.status_code == 200, f"Failed to get plan data: {response.text}"
        
        result = response.json()
        assert "plan_id" in result
        assert result["plan_id"] == TEST_PLAN_ID
        
        # Check objectives
        if result.get("objectives"):
            assert "data" in result["objectives"], "objectives should have 'data' field"
            print(f"✓ objectives.data keys: {list(result['objectives']['data'].keys())}")
        
        # Check previous_analysis
        if result.get("previous_analysis"):
            assert "data" in result["previous_analysis"], "previous_analysis should have 'data' field"
            print(f"✓ previous_analysis.data keys: {list(result['previous_analysis']['data'].keys())}")
        
        # Check evaluations structure
        assert "evaluations" in result
        assert isinstance(result["evaluations"], dict)
        expected_types = ["medical", "anthropometric", "physical", "technical", "tactical", "psychological"]
        for eval_type in expected_types:
            assert eval_type in result["evaluations"], f"Missing evaluation type: {eval_type}"
        
        print("✓ GET /api/plan-data/{plan_id} returns complete structure")

    # ============ EVALUATIONS TESTS ============
    
    def test_save_medical_evaluation(self):
        """Test POST /api/plan-data/evaluations for medical type"""
        test_data = {
            "plan_id": TEST_PLAN_ID,
            "athlete_id": None,
            "evaluation_type": "medical",
            "date": "2025-01-15",
            "results": {
                "fcReposo": "60",
                "fcMaxima": "185",
                "paSistolica": "120",
                "paDiastolica": "80",
                "saturacionO2": "98",
                "aptitudMedica": "apto",
                "observaciones": "Atleta en buen estado"
            },
            "notes": "Evaluación médica inicial"
        }
        
        response = self.session.post(f"{BASE_URL}/api/plan-data/evaluations", json=test_data)
        assert response.status_code == 200, f"Failed to save medical evaluation: {response.text}"
        
        result = response.json()
        assert result["evaluation_type"] == "medical"
        assert result["results"]["fcReposo"] == "60"
        print("✓ POST /api/plan-data/evaluations works for medical type")

    def test_save_physical_evaluation(self):
        """Test POST /api/plan-data/evaluations for physical type"""
        test_data = {
            "plan_id": TEST_PLAN_ID,
            "athlete_id": None,
            "evaluation_type": "physical",
            "date": "2025-01-15",
            "results": {
                "fuerzaMaxima": "150kg",
                "fuerzaExplosiva": "Buena",
                "resistenciaAerobica": "Alta",
                "vo2max": "52",
                "observaciones": "Buen nivel físico"
            },
            "notes": "Evaluación física inicial"
        }
        
        response = self.session.post(f"{BASE_URL}/api/plan-data/evaluations", json=test_data)
        assert response.status_code == 200, f"Failed to save physical evaluation: {response.text}"
        
        result = response.json()
        assert result["evaluation_type"] == "physical"
        assert result["results"]["vo2max"] == "52"
        print("✓ POST /api/plan-data/evaluations works for physical type")

    def test_get_evaluations_by_type(self):
        """Test GET /api/plan-data/evaluations/{plan_id}/{evaluation_type}"""
        response = self.session.get(f"{BASE_URL}/api/plan-data/evaluations/{TEST_PLAN_ID}/medical")
        assert response.status_code == 200, f"Failed to get medical evaluations: {response.text}"
        
        result = response.json()
        assert isinstance(result, list)
        if len(result) > 0:
            assert result[0]["evaluation_type"] == "medical"
            print(f"✓ GET evaluations by type returns {len(result)} medical evaluations")
        else:
            print("✓ GET evaluations by type returns empty list (no evaluations yet)")

    # ============ DATA PERSISTENCE TESTS ============
    
    def test_data_persistence_flow(self):
        """Test complete flow: Save → Get → Verify data persisted"""
        unique_value = f"TEST_{uuid.uuid4().hex[:8]}"
        
        # 1. Save previous analysis with unique data
        save_data = {
            "plan_id": TEST_PLAN_ID,
            "data": {
                "conclusiones": unique_value,
                "fechaInicio": "2025-01-01"
            }
        }
        save_response = self.session.post(f"{BASE_URL}/api/plan-data/previous-analysis", json=save_data)
        assert save_response.status_code == 200
        
        # 2. Get aggregated plan data
        get_response = self.session.get(f"{BASE_URL}/api/plan-data/{TEST_PLAN_ID}")
        assert get_response.status_code == 200
        
        result = get_response.json()
        
        # 3. Verify data persisted
        assert result["previous_analysis"]["data"]["conclusiones"] == unique_value
        print(f"✓ Data persistence verified: conclusiones = {unique_value}")

    def test_update_existing_data(self):
        """Test that POST updates existing data (upsert behavior)"""
        # First save
        first_data = {
            "plan_id": TEST_PLAN_ID,
            "main_objective": "First objective",
            "data": {"deporteObjetivo": "Fútbol"}
        }
        first_response = self.session.post(f"{BASE_URL}/api/plan-data/objectives", json=first_data)
        assert first_response.status_code == 200
        first_id = first_response.json()["id"]
        
        # Second save (should update, not create new)
        second_data = {
            "plan_id": TEST_PLAN_ID,
            "main_objective": "Updated objective",
            "data": {"deporteObjetivo": "Baloncesto"}
        }
        second_response = self.session.post(f"{BASE_URL}/api/plan-data/objectives", json=second_data)
        assert second_response.status_code == 200
        second_id = second_response.json()["id"]
        
        # Verify it's the same record (updated, not new)
        assert first_id == second_id, "Should update existing record, not create new"
        
        # Verify data updated
        get_response = self.session.get(f"{BASE_URL}/api/plan-data/objectives/{TEST_PLAN_ID}")
        result = get_response.json()
        assert result["main_objective"] == "Updated objective"
        assert result["data"]["deporteObjetivo"] == "Baloncesto"
        print("✓ Upsert behavior verified: existing data updated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

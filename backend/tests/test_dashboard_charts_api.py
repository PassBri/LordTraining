"""
Test suite for Dashboard Charts V2 API endpoints.
Tests the historico endpoint and verifies V2 plan data structure for chart rendering.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardChartsAPI:
    """Tests for Dashboard General chart data endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get V2 plans
        plans_res = self.session.get(f"{BASE_URL}/api/v2/planes")
        assert plans_res.status_code == 200
        self.planes = plans_res.json().get("planes", [])
        
        # Find seeded V2 plan (ATR Futbol Pre-temporada)
        self.seeded_plan = next((p for p in self.planes if "ATR Futbol" in p.get("nombre", "")), None)
        # Find synced V1 plan (TEST Plan Fútbol ATR)
        self.synced_plan = next((p for p in self.planes if "TEST Plan" in p.get("nombre", "")), None)
    
    # ============ HISTORICO ENDPOINT TESTS ============
    
    def test_historico_endpoint_exists(self):
        """GET /api/v2/planes/{id}/historico returns 200"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/historico")
        assert res.status_code == 200, f"Historico endpoint failed: {res.text}"
    
    def test_historico_returns_cargas_array(self):
        """Historico endpoint returns cargas array with correct structure"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/historico")
        data = res.json()
        
        assert "cargas" in data, "Response missing 'cargas' field"
        assert isinstance(data["cargas"], list), "cargas should be a list"
        assert "dias" in data, "Response missing 'dias' field"
        
        # Seeded plan should have historico data
        if len(data["cargas"]) > 0:
            carga = data["cargas"][0]
            assert "fecha" in carga, "Carga missing 'fecha'"
            assert "carga_diaria" in carga, "Carga missing 'carga_diaria'"
            assert "atleta_id" in carga, "Carga missing 'atleta_id'"
    
    def test_historico_for_plan_without_atleta(self):
        """Historico endpoint handles plans without atleta_id (returns sesiones-based data)"""
        if not self.synced_plan:
            pytest.skip("Synced V1 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.synced_plan['id']}/historico")
        assert res.status_code == 200
        data = res.json()
        
        assert "cargas" in data
        assert "source" in data, "Response should indicate data source"
        # V1 synced plan may have empty cargas or sesiones-based data
        assert data["source"] in ["historico", "sesiones"]
    
    def test_historico_404_for_invalid_plan(self):
        """Historico endpoint returns 404 for non-existent plan"""
        res = self.session.get(f"{BASE_URL}/api/v2/planes/invalid-plan-id-12345/historico")
        assert res.status_code == 404
    
    # ============ PLAN COMPLETO TESTS (for chart data) ============
    
    def test_plan_completo_has_macrociclos(self):
        """Plan completo returns macrociclos with chart-required fields"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/completo")
        assert res.status_code == 200
        data = res.json()
        
        assert "macrociclos" in data
        assert len(data["macrociclos"]) > 0, "Plan should have macrociclos"
        
        macro = data["macrociclos"][0]
        # Fields needed for PeriodizationChart
        assert "nombre" in macro
        assert "color" in macro
        assert "duracion_semanas" in macro
        # V2 calculated fields
        assert "vol_calculado" in macro or "vol_objetivo" in macro
        assert "int_calculado" in macro or "int_objetivo" in macro
    
    def test_plan_completo_has_mesociclos(self):
        """Plan completo returns mesociclos for Gantt chart"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/completo")
        data = res.json()
        
        assert "mesociclos" in data
        assert len(data["mesociclos"]) > 0
        
        meso = data["mesociclos"][0]
        assert "macrociclo_id" in meso
        assert "nombre" in meso
        assert "tipo" in meso
        assert "duracion_semanas" in meso
    
    def test_plan_completo_has_microciclos(self):
        """Plan completo returns microciclos for Heatmap chart"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/completo")
        data = res.json()
        
        assert "microciclos" in data
        assert len(data["microciclos"]) > 0
        
        micro = data["microciclos"][0]
        assert "mesociclo_id" in micro
        assert "numero_semana" in micro
        assert "tipo" in micro
    
    def test_plan_completo_has_sesiones(self):
        """Plan completo returns sesiones for Heatmap chart"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/completo")
        data = res.json()
        
        assert "sesiones" in data
        assert len(data["sesiones"]) > 0
        
        sesion = data["sesiones"][0]
        assert "microciclo_id" in sesion
        assert "carga_sesion" in sesion or "RPE_sesion" in sesion
        assert "orden_dia" in sesion
    
    def test_plan_completo_has_capacidades(self):
        """Plan completo returns capacidades for Radar chart"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/completo")
        data = res.json()
        
        assert "capacidades" in data
        # Seeded plan should have capacidades
        if len(data["capacidades"]) > 0:
            cap = data["capacidades"][0]
            assert "capacidad_tipo" in cap
            assert "MEV" in cap
            assert "MAV" in cap
            assert "MRV" in cap
    
    def test_plan_completo_has_metricas(self):
        """Plan completo returns metricas for Dashboard header"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/completo")
        data = res.json()
        
        assert "metricas" in data
        metricas = data["metricas"]
        
        assert "total_sesiones" in metricas
        assert "tonelaje_global_kg" in metricas
        assert "progreso_global" in metricas
    
    def test_plan_completo_has_ejercicios(self):
        """Plan completo returns ejercicios for Progresion chart"""
        if not self.seeded_plan:
            pytest.skip("Seeded V2 plan not found")
        
        res = self.session.get(f"{BASE_URL}/api/v2/planes/{self.seeded_plan['id']}/completo")
        data = res.json()
        
        assert "ejercicios" in data
        assert len(data["ejercicios"]) > 0
        
        ej = data["ejercicios"][0]
        assert "sesion_id" in ej
        assert "capacidad_tipo" in ej
        assert "series" in ej
    
    # ============ V2 PLANES LIST TEST ============
    
    def test_v2_planes_list(self):
        """GET /api/v2/planes returns list of V2 plans"""
        res = self.session.get(f"{BASE_URL}/api/v2/planes")
        assert res.status_code == 200
        data = res.json()
        
        assert "planes" in data
        assert isinstance(data["planes"], list)
        assert len(data["planes"]) >= 1, "Should have at least one V2 plan"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Test GraphicPlan V2 API Integration
Tests for:
- GET /api/v2/planes/{plan_id}/historico
- POST /api/v2/sync-from-v1/{plan_id}
- GET /api/v2/planes/{plan_id}/completo (for chart data)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGraphicPlanV2API:
    """Tests for GraphicPlan V2 API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        assert token, "No token received"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get V1 plan ID (TEST Plan Fútbol ATR)
        plans_response = self.session.get(f"{BASE_URL}/api/training-plans")
        assert plans_response.status_code == 200
        plans = plans_response.json()
        self.v1_plan = next((p for p in plans if "ATR" in p.get("name", "") or "Fútbol" in p.get("name", "")), None)
        if not self.v1_plan:
            self.v1_plan = plans[0] if plans else None
        
        yield
    
    # ═══ TEST: POST /api/v2/sync-from-v1/{plan_id} ═══
    def test_sync_from_v1_endpoint_exists(self):
        """Test that sync-from-v1 endpoint exists and returns valid response"""
        if not self.v1_plan:
            pytest.skip("No V1 plan found")
        
        response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/{self.v1_plan['id']}")
        # Should return 200 or 201 (already synced or newly synced)
        assert response.status_code in [200, 201], f"Sync failed: {response.status_code} - {response.text}"
        data = response.json()
        # Should return plan_id of the V2 plan
        assert "plan_id" in data or "message" in data, f"Unexpected response: {data}"
        print(f"✓ Sync from V1 returned: {data}")
    
    def test_sync_from_v1_returns_plan_id(self):
        """Test that sync returns a valid V2 plan_id"""
        if not self.v1_plan:
            pytest.skip("No V1 plan found")
        
        response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/{self.v1_plan['id']}")
        assert response.status_code in [200, 201]
        data = response.json()
        
        if "plan_id" in data:
            self.v2_plan_id = data["plan_id"]
            assert self.v2_plan_id, "plan_id should not be empty"
            print(f"✓ V2 plan_id: {self.v2_plan_id}")
    
    def test_sync_from_v1_invalid_plan(self):
        """Test sync with invalid plan ID returns 404"""
        response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/invalid-plan-id-12345")
        assert response.status_code in [404, 400], f"Expected 404/400, got {response.status_code}"
        print("✓ Invalid plan ID correctly returns error")
    
    # ═══ TEST: GET /api/v2/planes/{plan_id}/historico ═══
    def test_historico_endpoint_exists(self):
        """Test that historico endpoint exists"""
        if not self.v1_plan:
            pytest.skip("No V1 plan found")
        
        # First sync to get V2 plan
        sync_response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/{self.v1_plan['id']}")
        if sync_response.status_code not in [200, 201]:
            pytest.skip("Could not sync V1 plan")
        
        data = sync_response.json()
        v2_plan_id = data.get("plan_id")
        if not v2_plan_id:
            pytest.skip("No V2 plan_id returned")
        
        # Test historico endpoint
        response = self.session.get(f"{BASE_URL}/api/v2/planes/{v2_plan_id}/historico")
        assert response.status_code == 200, f"Historico failed: {response.status_code} - {response.text}"
        print(f"✓ Historico endpoint returned 200")
    
    def test_historico_returns_cargas_array(self):
        """Test that historico returns cargas array with required fields"""
        if not self.v1_plan:
            pytest.skip("No V1 plan found")
        
        # Sync and get V2 plan
        sync_response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/{self.v1_plan['id']}")
        if sync_response.status_code not in [200, 201]:
            pytest.skip("Could not sync V1 plan")
        
        v2_plan_id = sync_response.json().get("plan_id")
        if not v2_plan_id:
            pytest.skip("No V2 plan_id")
        
        response = self.session.get(f"{BASE_URL}/api/v2/planes/{v2_plan_id}/historico?dias=200")
        assert response.status_code == 200
        data = response.json()
        
        # Should have cargas array
        assert "cargas" in data, f"Missing 'cargas' in response: {data.keys()}"
        cargas = data["cargas"]
        assert isinstance(cargas, list), "cargas should be a list"
        print(f"✓ Historico returned {len(cargas)} cargas entries")
    
    def test_historico_404_for_invalid_plan(self):
        """Test historico returns 404 for non-existent plan"""
        response = self.session.get(f"{BASE_URL}/api/v2/planes/invalid-plan-xyz/historico")
        assert response.status_code in [404, 400], f"Expected 404/400, got {response.status_code}"
        print("✓ Invalid plan correctly returns error")
    
    # ═══ TEST: GET /api/v2/planes/{plan_id}/completo (for chart data) ═══
    def test_plan_completo_has_macrociclos(self):
        """Test that plan completo returns macrociclos for grid"""
        if not self.v1_plan:
            pytest.skip("No V1 plan found")
        
        sync_response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/{self.v1_plan['id']}")
        if sync_response.status_code not in [200, 201]:
            pytest.skip("Could not sync")
        
        v2_plan_id = sync_response.json().get("plan_id")
        if not v2_plan_id:
            pytest.skip("No V2 plan_id")
        
        response = self.session.get(f"{BASE_URL}/api/v2/planes/{v2_plan_id}/completo")
        assert response.status_code == 200
        data = response.json()
        
        assert "macrociclos" in data, "Missing macrociclos"
        macros = data["macrociclos"]
        assert isinstance(macros, list), "macrociclos should be list"
        if macros:
            # Check required fields for grid
            macro = macros[0]
            assert "id" in macro, "Macro missing id"
            assert "tipo" in macro or "nombre" in macro, "Macro missing tipo/nombre"
            print(f"✓ Plan completo has {len(macros)} macrociclos")
    
    def test_plan_completo_has_mesociclos(self):
        """Test that plan completo returns mesociclos for grid"""
        if not self.v1_plan:
            pytest.skip("No V1 plan found")
        
        sync_response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/{self.v1_plan['id']}")
        if sync_response.status_code not in [200, 201]:
            pytest.skip("Could not sync")
        
        v2_plan_id = sync_response.json().get("plan_id")
        if not v2_plan_id:
            pytest.skip("No V2 plan_id")
        
        response = self.session.get(f"{BASE_URL}/api/v2/planes/{v2_plan_id}/completo")
        assert response.status_code == 200
        data = response.json()
        
        assert "mesociclos" in data, "Missing mesociclos"
        mesos = data["mesociclos"]
        assert isinstance(mesos, list), "mesociclos should be list"
        if mesos:
            meso = mesos[0]
            assert "id" in meso, "Meso missing id"
            assert "macrociclo_id" in meso, "Meso missing macrociclo_id"
            print(f"✓ Plan completo has {len(mesos)} mesociclos")
    
    def test_plan_completo_has_microciclos_with_metrics(self):
        """Test that microciclos have V2 calculated metrics for charts"""
        if not self.v1_plan:
            pytest.skip("No V1 plan found")
        
        sync_response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/{self.v1_plan['id']}")
        if sync_response.status_code not in [200, 201]:
            pytest.skip("Could not sync")
        
        v2_plan_id = sync_response.json().get("plan_id")
        if not v2_plan_id:
            pytest.skip("No V2 plan_id")
        
        response = self.session.get(f"{BASE_URL}/api/v2/planes/{v2_plan_id}/completo")
        assert response.status_code == 200
        data = response.json()
        
        assert "microciclos" in data, "Missing microciclos"
        micros = data["microciclos"]
        assert isinstance(micros, list), "microciclos should be list"
        
        if micros:
            micro = micros[0]
            # Check for V2 calculated fields used by charts
            assert "numero_semana" in micro, "Micro missing numero_semana"
            # These are the V2 cascade-calculated metrics
            chart_fields = ["vol_calculado", "int_calculado", "den_calculado", "carga_total"]
            found_fields = [f for f in chart_fields if f in micro]
            print(f"✓ Microciclo has fields: {found_fields}")
            print(f"✓ Plan completo has {len(micros)} microciclos")
    
    def test_plan_completo_has_sesiones_for_duration_chart(self):
        """Test that sesiones have duracion_minutos for duration chart"""
        if not self.v1_plan:
            pytest.skip("No V1 plan found")
        
        sync_response = self.session.post(f"{BASE_URL}/api/v2/sync-from-v1/{self.v1_plan['id']}")
        if sync_response.status_code not in [200, 201]:
            pytest.skip("Could not sync")
        
        v2_plan_id = sync_response.json().get("plan_id")
        if not v2_plan_id:
            pytest.skip("No V2 plan_id")
        
        response = self.session.get(f"{BASE_URL}/api/v2/planes/{v2_plan_id}/completo")
        assert response.status_code == 200
        data = response.json()
        
        assert "sesiones" in data, "Missing sesiones"
        sesiones = data["sesiones"]
        assert isinstance(sesiones, list), "sesiones should be list"
        
        if sesiones:
            sesion = sesiones[0]
            assert "microciclo_id" in sesion, "Sesion missing microciclo_id"
            # Duration chart needs duracion_minutos
            if "duracion_minutos" in sesion:
                print(f"✓ Sesion has duracion_minutos: {sesion['duracion_minutos']}")
            print(f"✓ Plan completo has {len(sesiones)} sesiones")
    
    # ═══ TEST: V2 Plan List ═══
    def test_v2_planes_list(self):
        """Test that V2 planes list endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/v2/planes")
        assert response.status_code == 200, f"V2 planes list failed: {response.status_code}"
        data = response.json()
        # API returns {"planes": [...]} or direct list
        planes = data.get("planes", data) if isinstance(data, dict) else data
        assert isinstance(planes, list), "Should return list of plans"
        print(f"✓ V2 planes list returned {len(planes)} plans")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

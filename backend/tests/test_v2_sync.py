"""
Test V2 Sync from V1 API - Tests the sync-from-v1 endpoint and V2 cascade integration
Tests: sync endpoint, completo tree, alertas, metricas, V1 compatibility
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestV2SyncSetup:
    """Setup and health checks"""
    
    def test_health_check(self):
        """V1 health endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_login_success(self):
        """Authentication should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful for {data['user']['email']}")


class TestV1Compatibility:
    """Verify V1 endpoints still work after V2 changes"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_v1_training_plans_list(self, auth_token):
        """V1 /api/training-plans should still work"""
        response = requests.get(
            f"{BASE_URL}/api/training-plans",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ V1 training-plans returns {len(data)} plans")
        
        # Verify plan structure
        plan = data[0]
        assert "id" in plan
        assert "name" in plan
        print(f"✓ First plan: {plan.get('name')}")


class TestV2SyncFromV1:
    """Test the sync-from-v1 endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def v1_plan_id(self, auth_token):
        """Get a V1 plan ID to sync"""
        response = requests.get(
            f"{BASE_URL}/api/training-plans",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            plans = response.json()
            # Find TEST Plan Fútbol ATR or any plan
            for p in plans:
                if "ATR" in p.get("name", "") or "Fútbol" in p.get("name", ""):
                    return p["id"]
            if plans:
                return plans[0]["id"]
        pytest.skip("No V1 plans found")
    
    def test_sync_v1_to_v2(self, auth_token, v1_plan_id):
        """POST /api/v2/sync-from-v1/{plan_id} should sync V1 plan to V2"""
        response = requests.post(
            f"{BASE_URL}/api/v2/sync-from-v1/{v1_plan_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data.get("synced") == True
        assert "plan_id" in data
        assert data.get("v1_id") == v1_plan_id
        
        # Verify metricas are returned
        metricas = data.get("metricas", {})
        assert "total_semanas" in metricas
        assert "total_sesiones" in metricas
        
        print(f"✓ Synced V1 plan {v1_plan_id} to V2 plan {data['plan_id']}")
        print(f"  - already_existed: {data.get('already_existed')}")
        print(f"  - total_semanas: {metricas.get('total_semanas')}")
        print(f"  - total_sesiones: {metricas.get('total_sesiones')}")
    
    def test_sync_idempotent(self, auth_token, v1_plan_id):
        """Syncing same plan twice should return already_existed=true"""
        # First sync
        response1 = requests.post(
            f"{BASE_URL}/api/v2/sync-from-v1/{v1_plan_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response1.status_code == 200
        plan_id_1 = response1.json().get("plan_id")
        
        # Second sync
        response2 = requests.post(
            f"{BASE_URL}/api/v2/sync-from-v1/{v1_plan_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should return same plan_id and already_existed=true
        assert data2.get("already_existed") == True
        assert data2.get("plan_id") == plan_id_1
        print(f"✓ Sync is idempotent - same plan_id returned: {plan_id_1}")
    
    def test_sync_invalid_plan_404(self, auth_token):
        """Syncing non-existent plan should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/v2/sync-from-v1/non-existent-plan-id",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404
        print("✓ Non-existent plan returns 404")


class TestV2PlanCompleto:
    """Test the /api/v2/planes/{id}/completo endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def v2_plan_id(self, auth_token):
        """Get a V2 plan ID by syncing a V1 plan"""
        # Get V1 plans
        v1_response = requests.get(
            f"{BASE_URL}/api/training-plans",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if v1_response.status_code != 200 or not v1_response.json():
            pytest.skip("No V1 plans found")
        
        v1_plan_id = v1_response.json()[0]["id"]
        
        # Sync to V2
        sync_response = requests.post(
            f"{BASE_URL}/api/v2/sync-from-v1/{v1_plan_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if sync_response.status_code == 200:
            return sync_response.json().get("plan_id")
        pytest.skip("Sync failed")
    
    def test_get_plan_completo(self, auth_token, v2_plan_id):
        """GET /api/v2/planes/{id}/completo should return full tree"""
        response = requests.get(
            f"{BASE_URL}/api/v2/planes/{v2_plan_id}/completo",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "plan" in data
        assert "macrociclos" in data
        assert "mesociclos" in data
        assert "microciclos" in data
        assert "sesiones" in data
        assert "metricas" in data
        
        # Verify plan data
        plan = data["plan"]
        assert plan.get("id") == v2_plan_id
        assert "nombre" in plan
        
        # Verify hierarchy exists (at least macros and mesos)
        assert len(data["macrociclos"]) > 0
        assert len(data["mesociclos"]) > 0
        # Note: sesiones may be 0 for some plans without detailed session data
        
        print(f"✓ Plan completo: {plan.get('nombre')}")
        print(f"  - Macrociclos: {len(data['macrociclos'])}")
        print(f"  - Mesociclos: {len(data['mesociclos'])}")
        print(f"  - Microciclos: {len(data['microciclos'])}")
        print(f"  - Sesiones: {len(data['sesiones'])}")
        print(f"  - Ejercicios: {len(data.get('ejercicios', []))}")
    
    def test_macrociclo_has_v2_fields(self, auth_token, v2_plan_id):
        """Macrociclos should have V2 cascade fields"""
        response = requests.get(
            f"{BASE_URL}/api/v2/planes/{v2_plan_id}/completo",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        macros = response.json().get("macrociclos", [])
        
        assert len(macros) > 0
        macro = macros[0]
        
        # V2 cascade fields
        v2_fields = ["vol_calculado", "int_calculado", "carga_total", "ACWR", "progreso_porcentaje"]
        for field in v2_fields:
            assert field in macro, f"Missing field: {field}"
        
        print(f"✓ Macro '{macro.get('nombre')}' has V2 fields:")
        print(f"  - vol_calculado: {macro.get('vol_calculado')}")
        print(f"  - int_calculado: {macro.get('int_calculado')}")
        print(f"  - carga_total: {macro.get('carga_total')}")
        print(f"  - ACWR: {macro.get('ACWR')}")


class TestV2Alertas:
    """Test the /api/v2/planes/{id}/alertas endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def v2_plan_id(self, auth_token):
        """Get a V2 plan ID"""
        v1_response = requests.get(
            f"{BASE_URL}/api/training-plans",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if v1_response.status_code != 200 or not v1_response.json():
            pytest.skip("No V1 plans found")
        
        v1_plan_id = v1_response.json()[0]["id"]
        sync_response = requests.post(
            f"{BASE_URL}/api/v2/sync-from-v1/{v1_plan_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if sync_response.status_code == 200:
            return sync_response.json().get("plan_id")
        pytest.skip("Sync failed")
    
    def test_get_alertas(self, auth_token, v2_plan_id):
        """GET /api/v2/planes/{id}/alertas should return alerts list"""
        response = requests.get(
            f"{BASE_URL}/api/v2/planes/{v2_plan_id}/alertas",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "alertas" in data
        assert isinstance(data["alertas"], list)
        
        print(f"✓ Alertas endpoint returns {len(data['alertas'])} alerts")
        
        # If there are alerts, verify structure
        if data["alertas"]:
            alert = data["alertas"][0]
            assert "mensaje" in alert or "tipo" in alert
            print(f"  - First alert: {alert.get('mensaje', alert.get('tipo'))}")


class TestV2Metricas:
    """Test the /api/v2/planes/{id}/metricas endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def v2_plan_id(self, auth_token):
        """Get a V2 plan ID"""
        v1_response = requests.get(
            f"{BASE_URL}/api/training-plans",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if v1_response.status_code != 200 or not v1_response.json():
            pytest.skip("No V1 plans found")
        
        v1_plan_id = v1_response.json()[0]["id"]
        sync_response = requests.post(
            f"{BASE_URL}/api/v2/sync-from-v1/{v1_plan_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if sync_response.status_code == 200:
            return sync_response.json().get("plan_id")
        pytest.skip("Sync failed")
    
    def test_get_metricas(self, auth_token, v2_plan_id):
        """GET /api/v2/planes/{id}/metricas should return aggregated metrics"""
        response = requests.get(
            f"{BASE_URL}/api/v2/planes/{v2_plan_id}/metricas",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "resumen" in data
        assert "niveles" in data
        
        resumen = data["resumen"]
        assert "total_semanas" in resumen
        assert "total_sesiones" in resumen
        assert "tonelaje_global_kg" in resumen
        assert "progreso_global" in resumen
        
        niveles = data["niveles"]
        assert "macrociclos" in niveles
        assert "mesociclos" in niveles
        
        print(f"✓ Metricas endpoint returns:")
        print(f"  - total_semanas: {resumen.get('total_semanas')}")
        print(f"  - total_sesiones: {resumen.get('total_sesiones')}")
        print(f"  - tonelaje_global_kg: {resumen.get('tonelaje_global_kg')}")
        print(f"  - progreso_global: {resumen.get('progreso_global')}")
        print(f"  - macrociclos in niveles: {len(niveles.get('macrociclos', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

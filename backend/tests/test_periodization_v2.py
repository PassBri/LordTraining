"""
Test suite for Periodization V2 API endpoints.
Tests the cascade propagation system with 6-level hierarchy:
Plan → Macrociclo → Mesociclo → Microciclo → Sesión → Ejercicio

Endpoints tested:
- POST /api/v2/seed - Seed demo data
- GET /api/v2/planes - List plans
- GET /api/v2/planes/:id/completo - Get complete plan tree
- GET /api/v2/planes/:id/metricas - Get aggregated metrics
- GET /api/v2/planes/:id/alertas - Get validation alerts
- GET /api/v2/planes/:id/capacidades - Get MEV/MAV/MRV summary
- PUT /api/v2/ejercicios-sesion/:id - Edit exercise with cascade
- POST /api/v2/sesiones/:id/ejercicios - Add exercise with cascade
- DELETE /api/v2/ejercicios-sesion/:id - Delete exercise with recalc
- PUT /api/v2/sesiones/:id - Update RPE/duration with cascade
- PUT /api/v2/macrociclos/:id - Update objectives with cascade
- PUT /api/v2/mesociclos/:id - Update with cascade
- POST /api/v2/mesociclos/:id/microciclos - Generate microcycles
- GET /api/v2/ejercicios-base - Exercise catalog
- POST /api/v2/ejercicios-base - Create exercise in catalog
- GET /api/v2/atletas/:id/historico-cargas - Last 28 loads
- POST /api/v2/propagar - Manual propagation
- V1 compatibility: GET /api/training-plans, GET /api/health
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@train.com"
TEST_PASSWORD = "test123456"


class TestV2Setup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_health_check(self):
        """Test V1 health endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestV2Seed:
    """Test seed endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_seed_demo_data(self, auth_headers):
        """POST /api/v2/seed - Execute seed for demo ATR plan"""
        response = requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Seed may already exist or be newly created
        assert "message" in data
        assert data["message"] in ["Seed ejecutado correctamente", "Seed ya existe"]
        
        if data["message"] == "Seed ejecutado correctamente":
            assert "plan_id" in data
            assert "atleta_id" in data
            assert "stats" in data
            stats = data["stats"]
            assert stats.get("macrociclos", 0) >= 3
            assert stats.get("mesociclos", 0) >= 6
            assert stats.get("microciclos", 0) >= 16
            assert stats.get("sesiones", 0) >= 80
            assert stats.get("ejercicios", 0) >= 200
            print(f"✓ Seed created: {stats}")
        else:
            assert "plan_id" in data
            print(f"✓ Seed already exists: plan_id={data['plan_id']}")


class TestV2Planes:
    """Test plan endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def plan_id(self, auth_headers):
        """Get plan ID from seed or list"""
        # First try to get from seed
        response = requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            if "plan_id" in data:
                return data["plan_id"]
        
        # Fallback to listing plans
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        planes = data.get("planes", [])
        assert len(planes) > 0, "No plans found"
        return planes[0]["id"]
    
    def test_list_planes(self, auth_headers):
        """GET /api/v2/planes - List coach's plans"""
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "planes" in data
        planes = data["planes"]
        assert isinstance(planes, list)
        
        if len(planes) > 0:
            plan = planes[0]
            assert "id" in plan
            assert "nombre" in plan
            assert "coach_id" in plan
            print(f"✓ Found {len(planes)} plans")
        else:
            print("✓ No plans found (empty list)")
    
    def test_get_plan_completo(self, auth_headers, plan_id):
        """GET /api/v2/planes/:id/completo - Get complete plan tree with metrics"""
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/completo", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "plan" in data
        assert "macrociclos" in data
        assert "mesociclos" in data
        assert "microciclos" in data
        assert "sesiones" in data
        assert "ejercicios" in data
        assert "capacidades" in data
        assert "alertas" in data
        assert "metricas" in data
        
        # Verify counts
        assert len(data["macrociclos"]) >= 1
        assert len(data["mesociclos"]) >= 1
        assert len(data["microciclos"]) >= 1
        assert len(data["sesiones"]) >= 1
        
        print(f"✓ Plan completo: {len(data['macrociclos'])} macros, {len(data['mesociclos'])} mesos, "
              f"{len(data['microciclos'])} micros, {len(data['sesiones'])} sesiones, {len(data['ejercicios'])} ejercicios")
    
    def test_get_plan_metricas(self, auth_headers, plan_id):
        """GET /api/v2/planes/:id/metricas - Get aggregated metrics summary"""
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/metricas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "resumen" in data
        assert "niveles" in data
        
        resumen = data["resumen"]
        assert "plan_id" in resumen
        assert "total_semanas" in resumen
        assert "total_macrociclos" in resumen
        assert "total_mesociclos" in resumen
        assert "total_sesiones" in resumen
        
        niveles = data["niveles"]
        assert "macrociclos" in niveles
        assert "mesociclos" in niveles
        
        print(f"✓ Metricas: {resumen.get('total_semanas', 0)} semanas, "
              f"{resumen.get('total_sesiones', 0)} sesiones, "
              f"tonelaje={resumen.get('tonelaje_global_kg', 0)}kg")
    
    def test_get_plan_alertas(self, auth_headers, plan_id):
        """GET /api/v2/planes/:id/alertas - Get validation alerts"""
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/alertas", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "alertas" in data
        assert "total" in data
        assert isinstance(data["alertas"], list)
        assert isinstance(data["total"], int)
        
        print(f"✓ Alertas: {data['total']} alertas encontradas")
        
        # If there are alerts, verify structure
        if len(data["alertas"]) > 0:
            alerta = data["alertas"][0]
            assert "tipo" in alerta
            assert "severidad" in alerta
            assert "mensaje" in alerta
    
    def test_get_plan_capacidades(self, auth_headers, plan_id):
        """GET /api/v2/planes/:id/capacidades - Get MEV/MAV/MRV summary"""
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/capacidades", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "capacidades" in data
        capacidades = data["capacidades"]
        assert isinstance(capacidades, list)
        
        if len(capacidades) > 0:
            cap = capacidades[0]
            assert "capacidad_tipo" in cap
            assert "MEV" in cap
            assert "MAV" in cap
            assert "MRV" in cap
            print(f"✓ Capacidades: {len(capacidades)} tipos configurados")
        else:
            print("✓ No capacidades configured")


class TestV2Macrociclos:
    """Test macrociclo endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def macro_id(self, auth_headers):
        """Get a macrociclo ID"""
        # First ensure seed exists
        requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        
        # Get plans
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        planes = response.json().get("planes", [])
        if not planes:
            pytest.skip("No plans available")
        
        plan_id = planes[0]["id"]
        
        # Get complete plan to find macrociclo
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/completo", headers=auth_headers)
        data = response.json()
        macros = data.get("macrociclos", [])
        if not macros:
            pytest.skip("No macrociclos available")
        
        return macros[0]["id"]
    
    def test_get_macrociclo(self, auth_headers, macro_id):
        """GET /api/v2/macrociclos/:id - Get single macrociclo"""
        response = requests.get(f"{BASE_URL}/api/v2/macrociclos/{macro_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "plan_id" in data
        assert "nombre" in data
        print(f"✓ Macrociclo: {data.get('nombre', 'N/A')}")
    
    def test_update_macrociclo_cascade(self, auth_headers, macro_id):
        """PUT /api/v2/macrociclos/:id - Update and verify cascade propagation"""
        # Update macrociclo
        update_data = {
            "vol_objetivo": 80,
            "int_objetivo": 65
        }
        response = requests.put(f"{BASE_URL}/api/v2/macrociclos/{macro_id}", 
                               json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("updated") == True
        assert "propagacion" in data
        
        propagacion = data["propagacion"]
        assert "niveles_actualizados" in propagacion
        assert "macro" in propagacion["niveles_actualizados"]
        assert "plan" in propagacion["niveles_actualizados"]
        
        print(f"✓ Macrociclo updated, cascade: {propagacion['niveles_actualizados']}")


class TestV2Mesociclos:
    """Test mesociclo endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def meso_id(self, auth_headers):
        """Get a mesociclo ID"""
        requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        planes = response.json().get("planes", [])
        if not planes:
            pytest.skip("No plans available")
        
        plan_id = planes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/completo", headers=auth_headers)
        data = response.json()
        mesos = data.get("mesociclos", [])
        if not mesos:
            pytest.skip("No mesociclos available")
        
        return mesos[0]["id"]
    
    def test_get_mesociclo(self, auth_headers, meso_id):
        """GET /api/v2/mesociclos/:id - Get single mesociclo"""
        response = requests.get(f"{BASE_URL}/api/v2/mesociclos/{meso_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "macrociclo_id" in data
        assert "nombre" in data
        print(f"✓ Mesociclo: {data.get('nombre', 'N/A')}")
    
    def test_update_mesociclo_cascade(self, auth_headers, meso_id):
        """PUT /api/v2/mesociclos/:id - Update and verify cascade"""
        update_data = {
            "vol_objetivo": 75,
            "int_objetivo": 70
        }
        response = requests.put(f"{BASE_URL}/api/v2/mesociclos/{meso_id}", 
                               json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("updated") == True
        assert "propagacion" in data
        
        propagacion = data["propagacion"]
        assert "meso" in propagacion["niveles_actualizados"]
        assert "macro" in propagacion["niveles_actualizados"]
        assert "plan" in propagacion["niveles_actualizados"]
        
        print(f"✓ Mesociclo updated, cascade: {propagacion['niveles_actualizados']}")
    
    def test_generate_microciclos(self, auth_headers, meso_id):
        """POST /api/v2/mesociclos/:id/microciclos - Generate microcycles automatically"""
        response = requests.post(f"{BASE_URL}/api/v2/mesociclos/{meso_id}/microciclos", 
                                headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "microciclos" in data
        micros = data["microciclos"]
        assert isinstance(micros, list)
        
        if len(micros) > 0:
            micro = micros[0]
            assert "id" in micro
            assert "mesociclo_id" in micro
            assert "numero_semana" in micro
            assert "tipo" in micro
            print(f"✓ Generated {len(micros)} microciclos")
        else:
            print("✓ No new microciclos generated (may already exist)")


class TestV2Sesiones:
    """Test session endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def sesion_id(self, auth_headers):
        """Get a session ID"""
        requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        planes = response.json().get("planes", [])
        if not planes:
            pytest.skip("No plans available")
        
        plan_id = planes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/completo", headers=auth_headers)
        data = response.json()
        sesiones = data.get("sesiones", [])
        if not sesiones:
            pytest.skip("No sesiones available")
        
        return sesiones[0]["id"]
    
    def test_get_sesion(self, auth_headers, sesion_id):
        """GET /api/v2/sesiones/:id - Get session with exercises"""
        response = requests.get(f"{BASE_URL}/api/v2/sesiones/{sesion_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "microciclo_id" in data
        assert "nombre" in data
        assert "ejercicios" in data
        
        print(f"✓ Sesion: {data.get('nombre', 'N/A')} with {len(data.get('ejercicios', []))} ejercicios")
    
    def test_update_sesion_cascade(self, auth_headers, sesion_id):
        """PUT /api/v2/sesiones/:id - Update RPE/duration and verify cascade + historico_cargas"""
        update_data = {
            "RPE_sesion": 7.5,
            "duracion_minutos": 75
        }
        response = requests.put(f"{BASE_URL}/api/v2/sesiones/{sesion_id}", 
                               json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("updated") == True
        assert "propagacion" in data
        
        propagacion = data["propagacion"]
        assert "sesion" in propagacion["niveles_actualizados"]
        assert "micro" in propagacion["niveles_actualizados"]
        assert "meso" in propagacion["niveles_actualizados"]
        assert "macro" in propagacion["niveles_actualizados"]
        assert "plan" in propagacion["niveles_actualizados"]
        
        print(f"✓ Sesion updated, cascade: {propagacion['niveles_actualizados']}")
    
    def test_add_ejercicio_to_sesion(self, auth_headers, sesion_id):
        """POST /api/v2/sesiones/:id/ejercicios - Add exercise with cascade"""
        ejercicio_data = {
            "sesion_id": sesion_id,
            "nombre": "TEST_Sentadilla Frontal",
            "capacidad_tipo": "fuerza_maxima",
            "series": 4,
            "repeticiones": 8,
            "peso_kg": 70.0,
            "porcentaje_1RM": 75.0,
            "RPE_ejercicio": 7.0,
            "descanso_seg": 120
        }
        response = requests.post(f"{BASE_URL}/api/v2/sesiones/{sesion_id}/ejercicios", 
                                json=ejercicio_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "sesion_id" in data
        assert data["nombre"] == "TEST_Sentadilla Frontal"
        assert "tonelaje_calculado" in data
        assert "vol_relativo" in data
        assert "propagacion" in data
        
        # Verify calculated values
        expected_tonelaje = 4 * 8 * 70.0  # series * reps * peso
        assert data["tonelaje_calculado"] == expected_tonelaje
        
        propagacion = data["propagacion"]
        assert "ejercicio" in propagacion["niveles_actualizados"]
        
        print(f"✓ Ejercicio added: tonelaje={data['tonelaje_calculado']}kg, cascade: {propagacion['niveles_actualizados']}")
        
        # Return ID for cleanup
        return data["id"]


class TestV2Ejercicios:
    """Test ejercicio endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def ejercicio_id(self, auth_headers):
        """Get an ejercicio ID"""
        requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        planes = response.json().get("planes", [])
        if not planes:
            pytest.skip("No plans available")
        
        plan_id = planes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/completo", headers=auth_headers)
        data = response.json()
        ejercicios = data.get("ejercicios", [])
        if not ejercicios:
            pytest.skip("No ejercicios available")
        
        return ejercicios[0]["id"]
    
    def test_update_ejercicio_cascade(self, auth_headers, ejercicio_id):
        """PUT /api/v2/ejercicios-sesion/:id - Edit exercise and verify 6-level cascade"""
        update_data = {
            "series": 5,
            "repeticiones": 10,
            "peso_kg": 85.0
        }
        response = requests.put(f"{BASE_URL}/api/v2/ejercicios-sesion/{ejercicio_id}", 
                               json=update_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("updated") == True
        assert "propagacion" in data
        
        propagacion = data["propagacion"]
        niveles = propagacion["niveles_actualizados"]
        
        # Verify all 6 levels were updated
        assert "ejercicio" in niveles
        assert "sesion" in niveles
        assert "micro" in niveles
        assert "meso" in niveles
        assert "macro" in niveles
        assert "plan" in niveles
        
        print(f"✓ Ejercicio updated, 6-level cascade: {niveles}")
    
    def test_delete_ejercicio_cascade(self, auth_headers):
        """DELETE /api/v2/ejercicios-sesion/:id - Delete exercise with recalculation"""
        # First create an exercise to delete
        requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        planes = response.json().get("planes", [])
        if not planes:
            pytest.skip("No plans available")
        
        plan_id = planes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/completo", headers=auth_headers)
        data = response.json()
        sesiones = data.get("sesiones", [])
        if not sesiones:
            pytest.skip("No sesiones available")
        
        sesion_id = sesiones[0]["id"]
        
        # Create a test exercise
        ejercicio_data = {
            "sesion_id": sesion_id,
            "nombre": "TEST_DELETE_Ejercicio",
            "capacidad_tipo": "fuerza_maxima",
            "series": 3,
            "repeticiones": 10,
            "peso_kg": 50.0
        }
        create_response = requests.post(f"{BASE_URL}/api/v2/sesiones/{sesion_id}/ejercicios", 
                                       json=ejercicio_data, headers=auth_headers)
        assert create_response.status_code == 200
        ej_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = requests.delete(f"{BASE_URL}/api/v2/ejercicios-sesion/{ej_id}", 
                                         headers=auth_headers)
        assert delete_response.status_code == 200
        data = delete_response.json()
        
        assert data.get("deleted") == True
        assert "propagacion" in data
        
        propagacion = data["propagacion"]
        assert "sesion" in propagacion["niveles_actualizados"]
        
        print(f"✓ Ejercicio deleted, cascade: {propagacion['niveles_actualizados']}")


class TestV2EjerciciosBase:
    """Test ejercicios base (catalog) endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_list_ejercicios_base(self, auth_headers):
        """GET /api/v2/ejercicios-base - Get exercise catalog"""
        response = requests.get(f"{BASE_URL}/api/v2/ejercicios-base", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "ejercicios" in data
        ejercicios = data["ejercicios"]
        assert isinstance(ejercicios, list)
        
        if len(ejercicios) > 0:
            ej = ejercicios[0]
            assert "id" in ej
            assert "nombre" in ej
            print(f"✓ Ejercicios base: {len(ejercicios)} in catalog")
        else:
            print("✓ Ejercicios base: empty catalog")
    
    def test_create_ejercicio_base(self, auth_headers):
        """POST /api/v2/ejercicios-base - Create exercise in catalog"""
        ejercicio_data = {
            "nombre": "TEST_Press Militar",
            "descripcion": "Press de hombros con barra",
            "grupo_muscular": "hombros",
            "patron_movimiento": "empuje_vertical",
            "capacidades_principales": ["fuerza_maxima", "hipertrofia"],
            "equipamiento": "barra",
            "nivel_dificultad": 2
        }
        response = requests.post(f"{BASE_URL}/api/v2/ejercicios-base", 
                                json=ejercicio_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["nombre"] == "TEST_Press Militar"
        assert data["grupo_muscular"] == "hombros"
        
        print(f"✓ Ejercicio base created: {data['nombre']}")


class TestV2Atletas:
    """Test atleta endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def atleta_id(self, auth_headers):
        """Get atleta ID from seed"""
        response = requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        data = response.json()
        
        if "atleta_id" in data:
            return data["atleta_id"]
        
        # If seed already exists, get from plan
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        planes = response.json().get("planes", [])
        if planes and planes[0].get("atleta_id"):
            return planes[0]["atleta_id"]
        
        pytest.skip("No atleta available")
    
    def test_get_historico_cargas(self, auth_headers, atleta_id):
        """GET /api/v2/atletas/:id/historico-cargas - Get last 28 loads"""
        response = requests.get(f"{BASE_URL}/api/v2/atletas/{atleta_id}/historico-cargas", 
                               headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "cargas" in data
        assert "dias" in data
        
        cargas = data["cargas"]
        assert isinstance(cargas, list)
        
        if len(cargas) > 0:
            carga = cargas[0]
            assert "atleta_id" in carga
            assert "fecha" in carga
            assert "carga_diaria" in carga
            print(f"✓ Historico cargas: {len(cargas)} registros")
        else:
            print("✓ Historico cargas: no records yet")


class TestV2Propagacion:
    """Test manual propagation endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def sesion_id(self, auth_headers):
        """Get a session ID"""
        requests.post(f"{BASE_URL}/api/v2/seed", headers=auth_headers)
        
        response = requests.get(f"{BASE_URL}/api/v2/planes", headers=auth_headers)
        planes = response.json().get("planes", [])
        if not planes:
            pytest.skip("No plans available")
        
        plan_id = planes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/v2/planes/{plan_id}/completo", headers=auth_headers)
        data = response.json()
        sesiones = data.get("sesiones", [])
        if not sesiones:
            pytest.skip("No sesiones available")
        
        return sesiones[0]["id"]
    
    def test_manual_propagation(self, auth_headers, sesion_id):
        """POST /api/v2/propagar - Trigger manual cascade propagation"""
        propagar_data = {
            "nivel": "sesion",
            "entity_id": sesion_id
        }
        response = requests.post(f"{BASE_URL}/api/v2/propagar", 
                                json=propagar_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "niveles_actualizados" in data
        assert "metricas" in data
        
        niveles = data["niveles_actualizados"]
        assert "sesion" in niveles
        assert "micro" in niveles
        assert "meso" in niveles
        assert "macro" in niveles
        assert "plan" in niveles
        
        print(f"✓ Manual propagation: {niveles}")


class TestV1Compatibility:
    """Test V1 API compatibility"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get headers with auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_v1_health(self):
        """GET /api/health - V1 health check still works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ V1 /api/health working")
    
    def test_v1_training_plans(self, auth_headers):
        """GET /api/training-plans - V1 training plans endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/training-plans", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # V1 returns list directly or wrapped
        assert isinstance(data, (list, dict))
        print(f"✓ V1 /api/training-plans working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

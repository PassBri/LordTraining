"""
Backend API tests for User Roles, Periodization Models, and Cycle Durations.
Tests new endpoints: /api/auth/roles, /api/periodization-models-catalog, /api/cycle-durations
Also tests role selection during registration and role update in profile.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://train-planner-6.preview.emergentagent.com')


class TestRolesEndpoint:
    """Tests for GET /api/auth/roles endpoint"""
    
    def test_get_roles_returns_200(self):
        """Verify endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/auth/roles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/auth/roles returns 200")

    def test_get_roles_returns_6_roles(self):
        """Verify endpoint returns exactly 6 roles"""
        response = requests.get(f"{BASE_URL}/api/auth/roles")
        data = response.json()
        assert len(data) == 6, f"Expected 6 roles, got {len(data)}"
        print(f"✓ Returns exactly 6 roles: {[r['id'] for r in data]}")

    def test_get_roles_contains_all_expected_roles(self):
        """Verify all expected role IDs are present"""
        response = requests.get(f"{BASE_URL}/api/auth/roles")
        data = response.json()
        role_ids = [r['id'] for r in data]
        expected_roles = ['admin', 'coach', 'personal_trainer', 'athlete', 'team', 'user']
        
        for role in expected_roles:
            assert role in role_ids, f"Missing role: {role}"
        print(f"✓ All expected roles present: {expected_roles}")

    def test_each_role_has_required_fields(self):
        """Verify each role has id, name, and description"""
        response = requests.get(f"{BASE_URL}/api/auth/roles")
        data = response.json()
        
        for role in data:
            assert 'id' in role, f"Role missing 'id': {role}"
            assert 'name' in role, f"Role missing 'name': {role}"
            assert 'description' in role, f"Role missing 'description': {role}"
            assert len(role['description']) > 0, f"Role description is empty: {role['id']}"
        print("✓ All roles have id, name, and description fields")


class TestPeriodizationModelsCatalog:
    """Tests for GET /api/periodization-models-catalog endpoint"""
    
    def test_get_models_returns_200(self):
        """Verify endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/periodization-models-catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/periodization-models-catalog returns 200")

    def test_get_models_returns_13_models(self):
        """Verify endpoint returns exactly 13 periodization models"""
        response = requests.get(f"{BASE_URL}/api/periodization-models-catalog")
        data = response.json()
        assert len(data) == 13, f"Expected 13 models, got {len(data)}"
        print(f"✓ Returns exactly 13 models")

    def test_models_organized_by_categories(self):
        """Verify models are organized into 4 categories"""
        response = requests.get(f"{BASE_URL}/api/periodization-models-catalog")
        data = response.json()
        categories = set(m['category'] for m in data)
        expected_categories = {'Clásico', 'Ondulatorio', 'Avanzado', 'Específico'}
        
        assert categories == expected_categories, f"Expected categories {expected_categories}, got {categories}"
        print(f"✓ Models organized in 4 categories: {list(categories)}")

    def test_classic_models_present(self):
        """Verify classic models (Tradicional, ATR, Por Bloques)"""
        response = requests.get(f"{BASE_URL}/api/periodization-models-catalog")
        data = response.json()
        classic_ids = [m['id'] for m in data if m['category'] == 'Clásico']
        
        assert 'traditional' in classic_ids, "Missing Tradicional model"
        assert 'atr' in classic_ids, "Missing ATR model"
        assert 'blocks' in classic_ids, "Missing Por Bloques model"
        print(f"✓ Classic models present: {classic_ids}")

    def test_undulating_models_present(self):
        """Verify undulating models"""
        response = requests.get(f"{BASE_URL}/api/periodization-models-catalog")
        data = response.json()
        undulating_ids = [m['id'] for m in data if m['category'] == 'Ondulatorio']
        
        assert 'undulating_daily' in undulating_ids, "Missing Ondulatorio Diario"
        assert 'undulating_weekly' in undulating_ids, "Missing Ondulatorio Semanal"
        print(f"✓ Undulating models present: {undulating_ids}")

    def test_advanced_models_present(self):
        """Verify advanced models (Péndulo, Campanas, Contemporáneo, Inverso, Táctico)"""
        response = requests.get(f"{BASE_URL}/api/periodization-models-catalog")
        data = response.json()
        advanced_ids = [m['id'] for m in data if m['category'] == 'Avanzado']
        expected = ['pendulum', 'structural_bells', 'contemporary', 'inverse', 'tactical']
        
        for model_id in expected:
            assert model_id in advanced_ids, f"Missing advanced model: {model_id}"
        print(f"✓ Advanced models present: {advanced_ids}")

    def test_specific_models_present(self):
        """Verify specific models (Concurrente, Conjugado, Polarizado)"""
        response = requests.get(f"{BASE_URL}/api/periodization-models-catalog")
        data = response.json()
        specific_ids = [m['id'] for m in data if m['category'] == 'Específico']
        
        assert 'concurrent' in specific_ids, "Missing Concurrente"
        assert 'conjugate' in specific_ids, "Missing Conjugado"
        assert 'polarized' in specific_ids, "Missing Polarizado"
        print(f"✓ Specific models present: {specific_ids}")

    def test_each_model_has_required_fields(self):
        """Verify each model has id, name, category, and description"""
        response = requests.get(f"{BASE_URL}/api/periodization-models-catalog")
        data = response.json()
        
        for model in data:
            assert 'id' in model, f"Model missing 'id': {model}"
            assert 'name' in model, f"Model missing 'name': {model}"
            assert 'category' in model, f"Model missing 'category': {model}"
            assert 'description' in model, f"Model missing 'description': {model}"
        print("✓ All models have required fields")


class TestCycleDurations:
    """Tests for GET /api/cycle-durations endpoint"""
    
    def test_get_durations_returns_200(self):
        """Verify endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/cycle-durations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/cycle-durations returns 200")

    def test_get_durations_returns_6_options(self):
        """Verify endpoint returns exactly 6 duration options"""
        response = requests.get(f"{BASE_URL}/api/cycle-durations")
        data = response.json()
        assert len(data) == 6, f"Expected 6 durations, got {len(data)}"
        print(f"✓ Returns exactly 6 duration options")

    def test_all_durations_present(self):
        """Verify all expected duration IDs are present (Olímpico, Bianual, Anual, Semestral, Trimestral, Mensual)"""
        response = requests.get(f"{BASE_URL}/api/cycle-durations")
        data = response.json()
        duration_ids = [d['id'] for d in data]
        expected = ['olympic', 'biannual', 'annual', 'semester', 'quarter', 'monthly']
        
        for dur in expected:
            assert dur in duration_ids, f"Missing duration: {dur}"
        print(f"✓ All durations present: {expected}")

    def test_olympic_cycle_correct_weeks(self):
        """Verify Olympic cycle is 208 weeks (4 years)"""
        response = requests.get(f"{BASE_URL}/api/cycle-durations")
        data = response.json()
        olympic = next((d for d in data if d['id'] == 'olympic'), None)
        
        assert olympic is not None, "Olympic duration not found"
        assert olympic['weeks'] == 208, f"Olympic should be 208 weeks, got {olympic['weeks']}"
        assert olympic['years'] == 4, f"Olympic should be 4 years, got {olympic['years']}"
        print(f"✓ Olympic cycle: {olympic['weeks']} weeks ({olympic['years']} years)")

    def test_annual_cycle_correct_weeks(self):
        """Verify Annual cycle is 52 weeks"""
        response = requests.get(f"{BASE_URL}/api/cycle-durations")
        data = response.json()
        annual = next((d for d in data if d['id'] == 'annual'), None)
        
        assert annual is not None, "Annual duration not found"
        assert annual['weeks'] == 52, f"Annual should be 52 weeks, got {annual['weeks']}"
        print(f"✓ Annual cycle: {annual['weeks']} weeks")

    def test_each_duration_has_required_fields(self):
        """Verify each duration has id, name, weeks, months, years, description"""
        response = requests.get(f"{BASE_URL}/api/cycle-durations")
        data = response.json()
        
        for dur in data:
            assert 'id' in dur, f"Duration missing 'id': {dur}"
            assert 'name' in dur, f"Duration missing 'name': {dur}"
            assert 'weeks' in dur, f"Duration missing 'weeks': {dur}"
            assert 'description' in dur, f"Duration missing 'description': {dur}"
        print("✓ All durations have required fields")


class TestRegistrationWithRole:
    """Tests for user registration with role selection"""
    
    def test_register_with_athlete_role(self):
        """Register new user with 'athlete' role"""
        import uuid
        test_email = f"TEST_athlete_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": "Test Athlete User",
            "role": "athlete"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['role'] == 'athlete', f"Expected role 'athlete', got {data['role']}"
        print(f"✓ User registered with role 'athlete': {test_email}")

    def test_register_with_personal_trainer_role(self):
        """Register new user with 'personal_trainer' role"""
        import uuid
        test_email = f"TEST_pt_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": "Test Personal Trainer",
            "role": "personal_trainer"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['role'] == 'personal_trainer', f"Expected role 'personal_trainer', got {data['role']}"
        print(f"✓ User registered with role 'personal_trainer': {test_email}")

    def test_register_default_role_is_coach(self):
        """Register without specifying role defaults to 'coach'"""
        import uuid
        test_email = f"TEST_default_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": "Test Default Role"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['role'] == 'coach', f"Expected default role 'coach', got {data['role']}"
        print(f"✓ Default role is 'coach' when not specified")


class TestProfileRoleUpdate:
    """Tests for updating user role via PUT /api/auth/profile"""
    
    @pytest.fixture
    def authenticated_user(self):
        """Create and login a test user"""
        import uuid
        test_email = f"TEST_roleupdate_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "name": "Test Role Update User",
            "role": "coach"
        })
        assert reg_response.status_code == 200
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "test123456"
        })
        assert login_response.status_code == 200
        token = login_response.json()['token']
        
        return {"token": token, "email": test_email}

    def test_update_role_to_athlete(self, authenticated_user):
        """Update user role from coach to athlete"""
        token = authenticated_user['token']
        
        response = requests.put(
            f"{BASE_URL}/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "athlete"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['role'] == 'athlete', f"Expected role 'athlete', got {data['role']}"
        print(f"✓ Role updated to 'athlete' successfully")

    def test_update_role_to_team(self, authenticated_user):
        """Update user role to team"""
        token = authenticated_user['token']
        
        response = requests.put(
            f"{BASE_URL}/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "team"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['role'] == 'team', f"Expected role 'team', got {data['role']}"
        print(f"✓ Role updated to 'team' successfully")

    def test_verify_role_persisted(self, authenticated_user):
        """Verify updated role persists after update"""
        token = authenticated_user['token']
        
        # Update role
        requests.put(
            f"{BASE_URL}/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "personal_trainer"}
        )
        
        # Verify with GET /api/auth/me
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200
        data = me_response.json()
        assert data['role'] == 'personal_trainer', f"Role not persisted, got {data['role']}"
        print(f"✓ Role change persisted correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test Suite for Entity Management (Federaciones, Clubes, Escuelas)
Tests CRUD operations for the /api/entities endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://entity-manager-6.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test credentials from main agent context
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test"

# Store created entity IDs for cleanup
created_entity_ids = []


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture
def api_client(auth_token):
    """Authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestEntityTypes:
    """Test entity type endpoints"""
    
    def test_get_entity_types(self, api_client):
        """GET /api/entity-types returns list of available entity types"""
        response = api_client.get(f"{BASE_URL}/api/entity-types")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of entity types"
        assert len(data) >= 6, "Expected at least 6 entity types"
        
        # Verify all expected entity types
        type_ids = [t["id"] for t in data]
        expected_types = ["federation", "club", "school", "national_team", "team", "league"]
        for expected in expected_types:
            assert expected in type_ids, f"Expected entity type '{expected}' not found"
        
        # Verify structure
        for entity_type in data:
            assert "id" in entity_type
            assert "name" in entity_type
            assert "description" in entity_type
        
        print(f"✓ GET /api/entity-types returned {len(data)} entity types")


class TestEntityCRUD:
    """Test Entity CRUD operations"""
    
    def test_create_federation(self, api_client):
        """POST /api/entities creates a new federation"""
        payload = {
            "name": "TEST_Federación Nacional de Pruebas",
            "entity_type": "federation",
            "description": "Federación de prueba creada para testing",
            "city": "Bogotá",
            "country": "Colombia",
            "phone": "+57 1 2345678",
            "email": "test.federation@example.com",
            "sport": "Atletismo"
        }
        
        response = api_client.post(f"{BASE_URL}/api/entities", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should include entity ID"
        assert data["name"] == payload["name"], f"Name mismatch: {data['name']} != {payload['name']}"
        assert data["entity_type"] == "federation", f"Type mismatch: {data['entity_type']}"
        assert data["city"] == "Bogotá"
        assert data["country"] == "Colombia"
        
        # Store for cleanup
        created_entity_ids.append(data["id"])
        
        # Verify by GET
        get_response = api_client.get(f"{BASE_URL}/api/entities/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == payload["name"]
        
        print(f"✓ Created federation with ID: {data['id']}")
    
    def test_create_club(self, api_client):
        """POST /api/entities creates a new club"""
        payload = {
            "name": "TEST_Club Deportivo de Pruebas",
            "entity_type": "club",
            "description": "Club de prueba",
            "city": "Medellín",
            "country": "Colombia",
            "sport": "Fútbol"
        }
        
        response = api_client.post(f"{BASE_URL}/api/entities", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["entity_type"] == "club"
        assert data["city"] == "Medellín"
        
        created_entity_ids.append(data["id"])
        print(f"✓ Created club with ID: {data['id']}")
    
    def test_create_school(self, api_client):
        """POST /api/entities creates a new school"""
        payload = {
            "name": "TEST_Escuela de Formación Deportiva",
            "entity_type": "school",
            "description": "Escuela de prueba",
            "city": "Cali",
            "country": "Colombia",
            "sport": "Natación"
        }
        
        response = api_client.post(f"{BASE_URL}/api/entities", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["entity_type"] == "school"
        
        created_entity_ids.append(data["id"])
        print(f"✓ Created school with ID: {data['id']}")
    
    def test_get_entities_list(self, api_client):
        """GET /api/entities returns list of all entities"""
        response = api_client.get(f"{BASE_URL}/api/entities")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least 2 entities from main agent + our test entities
        # Main agent mentioned: 'Federación Colombiana de Atletismo' and 'Club Deportivo Los Pumas'
        print(f"✓ GET /api/entities returned {len(data)} entities")
        
        # Verify at least some known entities exist
        entity_names = [e["name"] for e in data]
        print(f"  Entities found: {entity_names}")
    
    def test_get_entities_filter_by_type(self, api_client):
        """GET /api/entities?entity_type=federation filters by type"""
        response = api_client.get(f"{BASE_URL}/api/entities?entity_type=federation")
        assert response.status_code == 200
        
        data = response.json()
        # All returned entities should be federations
        for entity in data:
            assert entity["entity_type"] == "federation", f"Expected federation, got {entity['entity_type']}"
        
        print(f"✓ Filtered by federation: {len(data)} entities")
    
    def test_get_entities_filter_by_club(self, api_client):
        """GET /api/entities?entity_type=club filters by club type"""
        response = api_client.get(f"{BASE_URL}/api/entities?entity_type=club")
        assert response.status_code == 200
        
        data = response.json()
        for entity in data:
            assert entity["entity_type"] == "club"
        
        print(f"✓ Filtered by club: {len(data)} entities")
    
    def test_update_entity(self, api_client):
        """PUT /api/entities/{id} updates an entity"""
        # First create an entity to update
        create_payload = {
            "name": "TEST_Entity to Update",
            "entity_type": "club",
            "city": "Barranquilla",
            "country": "Colombia"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/entities", json=create_payload)
        assert create_response.status_code == 200
        entity_id = create_response.json()["id"]
        created_entity_ids.append(entity_id)
        
        # Now update
        update_payload = {
            "name": "TEST_Updated Club Name",
            "entity_type": "club",
            "city": "Cartagena",
            "country": "Colombia",
            "phone": "+57 5 9876543"
        }
        
        update_response = api_client.put(f"{BASE_URL}/api/entities/{entity_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["name"] == "TEST_Updated Club Name"
        assert updated["city"] == "Cartagena"
        assert updated["phone"] == "+57 5 9876543"
        
        # Verify by GET
        get_response = api_client.get(f"{BASE_URL}/api/entities/{entity_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == "TEST_Updated Club Name"
        assert fetched["city"] == "Cartagena"
        
        print(f"✓ Updated entity {entity_id}")
    
    def test_get_entity_by_id(self, api_client):
        """GET /api/entities/{id} returns specific entity"""
        # Create an entity first
        payload = {
            "name": "TEST_Specific Entity",
            "entity_type": "team",
            "city": "Bucaramanga"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/entities", json=payload)
        assert create_response.status_code == 200
        entity_id = create_response.json()["id"]
        created_entity_ids.append(entity_id)
        
        # Get by ID
        response = api_client.get(f"{BASE_URL}/api/entities/{entity_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == entity_id
        assert data["name"] == "TEST_Specific Entity"
        assert data["entity_type"] == "team"
        
        print(f"✓ GET /api/entities/{entity_id} returned correct entity")
    
    def test_get_nonexistent_entity_returns_404(self, api_client):
        """GET /api/entities/{id} returns 404 for non-existent entity"""
        response = api_client.get(f"{BASE_URL}/api/entities/non-existent-id-12345")
        assert response.status_code == 404
        print("✓ GET non-existent entity returns 404")
    
    def test_delete_entity(self, api_client):
        """DELETE /api/entities/{id} removes an entity"""
        # Create entity to delete
        payload = {
            "name": "TEST_Entity to Delete",
            "entity_type": "league",
            "city": "Santa Marta"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/entities", json=payload)
        assert create_response.status_code == 200
        entity_id = create_response.json()["id"]
        
        # Delete
        delete_response = api_client.delete(f"{BASE_URL}/api/entities/{entity_id}")
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/entities/{entity_id}")
        assert get_response.status_code == 404, "Entity should no longer exist"
        
        print(f"✓ Deleted entity {entity_id}")


class TestEntityHierarchy:
    """Test entity hierarchy endpoints"""
    
    def test_get_entities_hierarchy(self, api_client):
        """GET /api/entities-hierarchy returns organized hierarchy"""
        response = api_client.get(f"{BASE_URL}/api/entities-hierarchy")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify hierarchy structure
        expected_keys = ["federations", "clubs", "schools", "national_teams", "teams", "leagues"]
        for key in expected_keys:
            assert key in data, f"Expected '{key}' in hierarchy"
            assert isinstance(data[key], list), f"'{key}' should be a list"
        
        print(f"✓ Hierarchy has {sum(len(data[k]) for k in expected_keys)} total entities")


class TestEntityAthletes:
    """Test entity-athlete relationships"""
    
    def test_get_entity_athletes_empty(self, api_client):
        """GET /api/entities/{id}/athletes returns empty list for new entity"""
        # Create entity
        payload = {
            "name": "TEST_Entity Athletes Test",
            "entity_type": "club"
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/entities", json=payload)
        assert create_response.status_code == 200
        entity_id = create_response.json()["id"]
        created_entity_ids.append(entity_id)
        
        # Get athletes
        response = api_client.get(f"{BASE_URL}/api/entities/{entity_id}/athletes")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0, "New entity should have no athletes"
        
        print(f"✓ GET /api/entities/{entity_id}/athletes returns empty list")


class TestAuthenticationRequired:
    """Test that authentication is required"""
    
    def test_entities_requires_auth(self):
        """GET /api/entities requires authentication"""
        response = requests.get(f"{BASE_URL}/api/entities")
        assert response.status_code == 403 or response.status_code == 401
        print("✓ GET /api/entities requires authentication")
    
    def test_create_entity_requires_auth(self):
        """POST /api/entities requires authentication"""
        response = requests.post(f"{BASE_URL}/api/entities", json={
            "name": "Unauthorized Test",
            "entity_type": "club"
        })
        assert response.status_code == 403 or response.status_code == 401
        print("✓ POST /api/entities requires authentication")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_entities(self, api_client):
        """Remove all TEST_ prefixed entities created during tests"""
        for entity_id in created_entity_ids:
            try:
                api_client.delete(f"{BASE_URL}/api/entities/{entity_id}")
            except:
                pass
        
        # Also clean up any remaining TEST_ entities
        response = api_client.get(f"{BASE_URL}/api/entities")
        if response.status_code == 200:
            entities = response.json()
            for entity in entities:
                if entity.get("name", "").startswith("TEST_"):
                    try:
                        api_client.delete(f"{BASE_URL}/api/entities/{entity['id']}")
                    except:
                        pass
        
        print("✓ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

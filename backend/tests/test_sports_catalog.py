"""
Sports Catalog CRUD Tests
Tests the dynamic sports catalog functionality:
- GET /api/sports/catalog - Get full catalog with categories and sports
- POST /api/sports/categories - Create new sport category
- PUT /api/sports/categories/{id} - Update sport category
- DELETE /api/sports/categories/{id} - Delete category and its sports
- POST /api/sports - Create new sport in category
- DELETE /api/sports/{id} - Delete a sport
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSportsCatalog:
    """Sports catalog CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield
        # Cleanup: Delete test-created data
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test data created during tests"""
        try:
            # Get catalog and delete TEST_ prefixed items
            response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
            if response.status_code == 200:
                catalog = response.json()
                for category in catalog:
                    if category.get("name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/sports/categories/{category['id']}", headers=self.headers)
                    else:
                        for sport in category.get("sports", []):
                            if sport.get("name", "").startswith("TEST_"):
                                requests.delete(f"{BASE_URL}/api/sports/{sport['id']}", headers=self.headers)
        except Exception as e:
            print(f"Cleanup warning: {e}")

    def test_get_sports_catalog_returns_6_categories(self):
        """Test that catalog returns 6 default categories"""
        response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        catalog = response.json()
        assert isinstance(catalog, list), "Catalog should be a list"
        assert len(catalog) >= 6, f"Expected at least 6 categories, got {len(catalog)}"
        
        # Verify expected categories exist
        category_names = [cat.get("name") for cat in catalog]
        expected_categories = [
            "Deportes de Contacto",
            "Tiempo y Marca",
            "Individuales",
            "Deportes de Conjunto",
            "Raqueta y Precisión",
            "Esports"
        ]
        for expected in expected_categories:
            assert expected in category_names, f"Category '{expected}' not found in catalog"

    def test_each_category_has_8_sports(self):
        """Test that each default category has 8 sports"""
        response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        assert response.status_code == 200
        
        catalog = response.json()
        default_categories = [
            "Deportes de Contacto",
            "Tiempo y Marca",
            "Individuales",
            "Deportes de Conjunto",
            "Raqueta y Precisión",
            "Esports"
        ]
        
        for category in catalog:
            if category.get("name") in default_categories:
                sports = category.get("sports", [])
                assert len(sports) >= 8, f"Category '{category['name']}' has {len(sports)} sports, expected at least 8"

    def test_category_has_required_fields(self):
        """Test that categories have all required fields"""
        response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        assert response.status_code == 200
        
        catalog = response.json()
        assert len(catalog) > 0, "Catalog is empty"
        
        category = catalog[0]
        assert "id" in category, "Category missing 'id'"
        assert "name" in category, "Category missing 'name'"
        assert "icon" in category, "Category missing 'icon'"
        assert "color" in category, "Category missing 'color'"
        assert "sports" in category, "Category missing 'sports'"
        
    def test_sport_has_required_fields(self):
        """Test that sports have all required fields"""
        response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        assert response.status_code == 200
        
        catalog = response.json()
        assert len(catalog) > 0, "Catalog is empty"
        assert len(catalog[0].get("sports", [])) > 0, "Category has no sports"
        
        sport = catalog[0]["sports"][0]
        assert "id" in sport, "Sport missing 'id'"
        assert "name" in sport, "Sport missing 'name'"
        assert "category_id" in sport, "Sport missing 'category_id'"

    def test_create_category(self):
        """Test creating a new sport category"""
        new_category = {
            "name": "TEST_Deportes Acuáticos",
            "icon": "🏊",
            "color": "#06B6D4"
        }
        
        response = requests.post(f"{BASE_URL}/api/sports/categories", 
                                json=new_category, 
                                headers=self.headers)
        assert response.status_code == 200, f"Create category failed: {response.text}"
        
        created = response.json()
        assert created.get("name") == new_category["name"]
        assert created.get("icon") == new_category["icon"]
        assert created.get("color") == new_category["color"]
        assert "id" in created
        
        # Verify category exists in catalog
        catalog_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog = catalog_response.json()
        category_names = [cat.get("name") for cat in catalog]
        assert new_category["name"] in category_names, "Created category not found in catalog"

    def test_create_category_and_verify_persistence(self):
        """Test that created category persists in database"""
        new_category = {
            "name": "TEST_Deportes Extremos",
            "icon": "🪂",
            "color": "#DC2626"
        }
        
        # Create
        create_response = requests.post(f"{BASE_URL}/api/sports/categories", 
                                       json=new_category, 
                                       headers=self.headers)
        assert create_response.status_code == 200
        created = create_response.json()
        category_id = created.get("id")
        
        # Verify via GET catalog
        catalog_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        assert catalog_response.status_code == 200
        
        catalog = catalog_response.json()
        found = next((cat for cat in catalog if cat.get("id") == category_id), None)
        assert found is not None, "Created category not persisted"
        assert found.get("name") == new_category["name"]
        assert found.get("icon") == new_category["icon"]

    def test_delete_category(self):
        """Test deleting a sport category"""
        # First create a category to delete
        new_category = {
            "name": "TEST_Para Eliminar",
            "icon": "❌",
            "color": "#000000"
        }
        create_response = requests.post(f"{BASE_URL}/api/sports/categories", 
                                       json=new_category, 
                                       headers=self.headers)
        assert create_response.status_code == 200
        category_id = create_response.json().get("id")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/sports/categories/{category_id}", 
                                         headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        catalog_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog = catalog_response.json()
        category_ids = [cat.get("id") for cat in catalog]
        assert category_id not in category_ids, "Category still exists after deletion"

    def test_delete_nonexistent_category_returns_404(self):
        """Test that deleting non-existent category returns 404"""
        response = requests.delete(f"{BASE_URL}/api/sports/categories/nonexistent-id-12345", 
                                  headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_create_sport_in_category(self):
        """Test adding a new sport to an existing category"""
        # Get a category ID first
        catalog_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog = catalog_response.json()
        category_id = catalog[0]["id"]
        
        new_sport = {
            "name": "TEST_Nuevo Deporte",
            "category_id": category_id
        }
        
        response = requests.post(f"{BASE_URL}/api/sports", 
                                json=new_sport, 
                                headers=self.headers)
        assert response.status_code == 200, f"Create sport failed: {response.text}"
        
        created = response.json()
        assert created.get("name") == new_sport["name"]
        assert created.get("category_id") == category_id
        assert "id" in created

    def test_create_sport_and_verify_in_catalog(self):
        """Test that created sport appears in catalog under correct category"""
        # Get first category
        catalog_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog = catalog_response.json()
        category = catalog[0]
        category_id = category["id"]
        initial_sports_count = len(category.get("sports", []))
        
        new_sport = {
            "name": "TEST_Deporte Verificable",
            "category_id": category_id
        }
        
        # Create sport
        create_response = requests.post(f"{BASE_URL}/api/sports", 
                                       json=new_sport, 
                                       headers=self.headers)
        assert create_response.status_code == 200
        sport_id = create_response.json().get("id")
        
        # Verify in catalog
        verify_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        updated_catalog = verify_response.json()
        updated_category = next((cat for cat in updated_catalog if cat["id"] == category_id), None)
        
        assert updated_category is not None
        updated_sports_count = len(updated_category.get("sports", []))
        assert updated_sports_count == initial_sports_count + 1, "Sport count did not increase"
        
        sport_names = [s.get("name") for s in updated_category.get("sports", [])]
        assert new_sport["name"] in sport_names, "Created sport not found in category"

    def test_create_sport_with_invalid_category_returns_404(self):
        """Test that creating sport with invalid category returns 404"""
        new_sport = {
            "name": "TEST_Invalid Category Sport",
            "category_id": "nonexistent-category-id"
        }
        
        response = requests.post(f"{BASE_URL}/api/sports", 
                                json=new_sport, 
                                headers=self.headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    def test_delete_sport(self):
        """Test deleting a sport"""
        # Get a category and create a sport to delete
        catalog_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog = catalog_response.json()
        category_id = catalog[0]["id"]
        
        # Create sport
        new_sport = {
            "name": "TEST_Para Eliminar Sport",
            "category_id": category_id
        }
        create_response = requests.post(f"{BASE_URL}/api/sports", 
                                       json=new_sport, 
                                       headers=self.headers)
        assert create_response.status_code == 200
        sport_id = create_response.json().get("id")
        
        # Delete sport
        delete_response = requests.delete(f"{BASE_URL}/api/sports/{sport_id}", 
                                         headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        updated_catalog = verify_response.json()
        for category in updated_catalog:
            sport_ids = [s.get("id") for s in category.get("sports", [])]
            assert sport_id not in sport_ids, f"Sport still exists in category {category['name']}"

    def test_delete_nonexistent_sport_returns_404(self):
        """Test that deleting non-existent sport returns 404"""
        response = requests.delete(f"{BASE_URL}/api/sports/nonexistent-sport-id", 
                                  headers=self.headers)
        assert response.status_code == 404

    def test_delete_category_deletes_all_its_sports(self):
        """Test that deleting category also deletes all sports in it"""
        # Create a category
        new_category = {
            "name": "TEST_Category With Sports",
            "icon": "🎯",
            "color": "#7C3AED"
        }
        cat_response = requests.post(f"{BASE_URL}/api/sports/categories", 
                                    json=new_category, 
                                    headers=self.headers)
        assert cat_response.status_code == 200
        category_id = cat_response.json().get("id")
        
        # Add sports to it
        sports_created = []
        for i in range(3):
            sport_response = requests.post(f"{BASE_URL}/api/sports", 
                                          json={"name": f"TEST_Sport_{i}", "category_id": category_id}, 
                                          headers=self.headers)
            assert sport_response.status_code == 200
            sports_created.append(sport_response.json().get("id"))
        
        # Verify sports exist
        verify_before = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog_before = verify_before.json()
        cat_before = next((c for c in catalog_before if c["id"] == category_id), None)
        assert cat_before is not None
        assert len(cat_before.get("sports", [])) >= 3
        
        # Delete category
        delete_response = requests.delete(f"{BASE_URL}/api/sports/categories/{category_id}", 
                                         headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify category and sports are gone
        verify_after = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog_after = verify_after.json()
        category_ids_after = [c["id"] for c in catalog_after]
        assert category_id not in category_ids_after, "Category still exists after deletion"

    def test_catalog_requires_authentication(self):
        """Test that catalog endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sports/catalog")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 520], f"Expected auth error, got {response.status_code}"


class TestSportsIntegrationWithAthletes:
    """Test sports catalog integration with athletes form"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test athletes"""
        try:
            response = requests.get(f"{BASE_URL}/api/athletes", headers=self.headers)
            if response.status_code == 200:
                athletes = response.json()
                for athlete in athletes:
                    if athlete.get("name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/athletes/{athlete['id']}", headers=self.headers)
        except Exception as e:
            print(f"Cleanup warning: {e}")

    def test_create_athlete_with_catalog_sport(self):
        """Test creating athlete with sport from dynamic catalog"""
        # Get a sport from catalog
        catalog_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog = catalog_response.json()
        sport_name = catalog[0]["sports"][0]["name"]  # Get first sport from first category
        sport_value = sport_name.lower().replace(" ", "_")
        
        new_athlete = {
            "name": "TEST_Atleta Catálogo",
            "sport": sport_value,
            "age": 25,
            "level": "Intermedio"
        }
        
        response = requests.post(f"{BASE_URL}/api/athletes", 
                                json=new_athlete, 
                                headers=self.headers)
        assert response.status_code == 200, f"Create athlete failed: {response.text}"
        
        created = response.json()
        assert created.get("sport") == sport_value


class TestSportsIntegrationWithTeams:
    """Test sports catalog integration with teams"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        yield
        self._cleanup_test_data()
    
    def _cleanup_test_data(self):
        """Clean up test teams"""
        try:
            response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
            if response.status_code == 200:
                teams = response.json()
                for team in teams:
                    if team.get("name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/teams/{team['id']}", headers=self.headers)
        except Exception as e:
            print(f"Cleanup warning: {e}")

    def test_create_team_with_catalog_sport(self):
        """Test creating team with sport from dynamic catalog"""
        # Get a sport from catalog
        catalog_response = requests.get(f"{BASE_URL}/api/sports/catalog", headers=self.headers)
        catalog = catalog_response.json()
        sport_name = catalog[0]["sports"][0]["name"]
        sport_value = sport_name.lower().replace(" ", "_")
        
        new_team = {
            "name": "TEST_Equipo Catálogo",
            "sport": sport_value,
            "category": "Sub-18"
        }
        
        response = requests.post(f"{BASE_URL}/api/teams", 
                                json=new_team, 
                                headers=self.headers)
        assert response.status_code == 200, f"Create team failed: {response.text}"
        
        created = response.json()
        assert created.get("sport") == sport_value
        assert created.get("name") == new_team["name"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

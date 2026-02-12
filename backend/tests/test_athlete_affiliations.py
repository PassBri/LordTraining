"""
Tests for Athlete Affiliations Feature
- Create athletes with affiliations to entities (Federation, Club, School)
- Verify affiliations are stored and returned correctly
- Filter athletes by entity
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sports-dashboard-24.preview.emergentagent.com')

class TestAthleteAffiliations:
    """Test athlete affiliations to entities (Federation, Club, School)"""
    
    auth_token = None
    test_federation_id = None
    test_club_id = None
    test_athlete_with_affiliations_id = None
    test_athlete_without_affiliations_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup authentication and get existing entities"""
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        TestAthleteAffiliations.auth_token = response.json()["token"]
        
        # Get existing entities
        headers = {"Authorization": f"Bearer {TestAthleteAffiliations.auth_token}"}
        entities_resp = requests.get(f"{BASE_URL}/api/entities", headers=headers)
        assert entities_resp.status_code == 200, f"Failed to get entities: {entities_resp.text}"
        
        entities = entities_resp.json()
        for entity in entities:
            if entity.get("entity_type") == "federation":
                TestAthleteAffiliations.test_federation_id = entity["id"]
            elif entity.get("entity_type") == "club":
                TestAthleteAffiliations.test_club_id = entity["id"]
        
        print(f"Found Federation ID: {TestAthleteAffiliations.test_federation_id}")
        print(f"Found Club ID: {TestAthleteAffiliations.test_club_id}")
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestAthleteAffiliations.auth_token}"}
    
    # ============ TEST 1: Verify entities exist ============
    def test_01_entities_exist_for_affiliation(self):
        """Verify that Federation and Club entities exist for athlete affiliation"""
        headers = self.get_headers()
        
        # Check Federation exists
        assert TestAthleteAffiliations.test_federation_id is not None, "No Federation entity found"
        
        # Check Club exists
        assert TestAthleteAffiliations.test_club_id is not None, "No Club entity found"
        
        print("✓ Both Federation and Club entities exist for affiliation")
    
    # ============ TEST 2: Create athlete WITH affiliations ============
    def test_02_create_athlete_with_affiliations(self):
        """Create an athlete affiliated to Federation and Club"""
        headers = self.get_headers()
        
        # Create athlete with affiliations
        athlete_data = {
            "name": "TEST_Atleta Afiliado",
            "email": "test_afiliado@example.com",
            "sport": "athletics",
            "age": 25,
            "level": "intermedio",
            "notes": "Atleta de prueba con afiliaciones",
            "affiliations": [
                TestAthleteAffiliations.test_federation_id,
                TestAthleteAffiliations.test_club_id
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/athletes", headers=headers, json=athlete_data)
        assert response.status_code == 200 or response.status_code == 201, f"Failed to create athlete: {response.text}"
        
        athlete = response.json()
        TestAthleteAffiliations.test_athlete_with_affiliations_id = athlete["id"]
        
        # Verify affiliations are stored
        assert "affiliations" in athlete, "Affiliations field not in response"
        assert len(athlete["affiliations"]) == 2, f"Expected 2 affiliations, got {len(athlete['affiliations'])}"
        assert TestAthleteAffiliations.test_federation_id in athlete["affiliations"], "Federation ID not in affiliations"
        assert TestAthleteAffiliations.test_club_id in athlete["affiliations"], "Club ID not in affiliations"
        
        print(f"✓ Created athlete with affiliations: {athlete['name']}")
        print(f"  Affiliations: {athlete['affiliations']}")
    
    # ============ TEST 3: Create athlete WITHOUT affiliations ============
    def test_03_create_athlete_without_affiliations(self):
        """Create an athlete without any affiliations"""
        headers = self.get_headers()
        
        athlete_data = {
            "name": "TEST_Atleta Sin Afiliaciones",
            "email": "test_sin_afiliaciones@example.com",
            "sport": "swimming",
            "age": 22,
            "level": "principiante",
            "notes": "Atleta de prueba sin afiliaciones",
            "affiliations": []
        }
        
        response = requests.post(f"{BASE_URL}/api/athletes", headers=headers, json=athlete_data)
        assert response.status_code == 200 or response.status_code == 201, f"Failed to create athlete: {response.text}"
        
        athlete = response.json()
        TestAthleteAffiliations.test_athlete_without_affiliations_id = athlete["id"]
        
        # Verify affiliations are empty
        assert "affiliations" in athlete, "Affiliations field not in response"
        assert len(athlete.get("affiliations", [])) == 0, f"Expected 0 affiliations, got {len(athlete.get('affiliations', []))}"
        
        print(f"✓ Created athlete without affiliations: {athlete['name']}")
    
    # ============ TEST 4: GET athlete and verify affiliations ============
    def test_04_get_athlete_with_affiliations(self):
        """GET an athlete and verify affiliations are returned"""
        headers = self.get_headers()
        
        response = requests.get(
            f"{BASE_URL}/api/athletes/{TestAthleteAffiliations.test_athlete_with_affiliations_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get athlete: {response.text}"
        
        athlete = response.json()
        assert "affiliations" in athlete, "Affiliations field not in response"
        assert len(athlete["affiliations"]) == 2, f"Expected 2 affiliations, got {len(athlete['affiliations'])}"
        
        print(f"✓ GET athlete returned with affiliations: {athlete['affiliations']}")
    
    # ============ TEST 5: GET all athletes and verify affiliations field ============
    def test_05_get_all_athletes_have_affiliations_field(self):
        """GET all athletes and verify each has affiliations field"""
        headers = self.get_headers()
        
        response = requests.get(f"{BASE_URL}/api/athletes", headers=headers)
        assert response.status_code == 200, f"Failed to get athletes: {response.text}"
        
        athletes = response.json()
        assert len(athletes) >= 2, f"Expected at least 2 athletes, got {len(athletes)}"
        
        athletes_with_affiliations = 0
        athletes_without_affiliations = 0
        
        for athlete in athletes:
            # All athletes should have affiliations field
            assert "affiliations" in athlete, f"Athlete {athlete['name']} missing affiliations field"
            
            if len(athlete.get("affiliations", [])) > 0:
                athletes_with_affiliations += 1
            else:
                athletes_without_affiliations += 1
        
        print(f"✓ All {len(athletes)} athletes have affiliations field")
        print(f"  With affiliations: {athletes_with_affiliations}")
        print(f"  Without affiliations: {athletes_without_affiliations}")
    
    # ============ TEST 6: GET athletes affiliated to a specific entity ============
    def test_06_get_athletes_by_entity(self):
        """GET athletes affiliated to a specific entity using entity/{id}/athletes endpoint"""
        headers = self.get_headers()
        
        # Get athletes affiliated to Federation
        response = requests.get(
            f"{BASE_URL}/api/entities/{TestAthleteAffiliations.test_federation_id}/athletes",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get entity athletes: {response.text}"
        
        athletes = response.json()
        
        # Should include our test athlete with affiliations
        athlete_ids = [a["id"] for a in athletes]
        assert TestAthleteAffiliations.test_athlete_with_affiliations_id in athlete_ids, \
            "Test athlete with affiliations not found in entity athletes list"
        
        print(f"✓ Found {len(athletes)} athletes affiliated to Federation")
        print(f"  Includes test athlete: {TestAthleteAffiliations.test_athlete_with_affiliations_id in athlete_ids}")
    
    # ============ TEST 7: Verify entity athletes_count is updated ============
    def test_07_entity_athletes_count_updated(self):
        """Verify that entity athletes_count reflects affiliated athletes"""
        headers = self.get_headers()
        
        # Get Federation entity
        response = requests.get(
            f"{BASE_URL}/api/entities/{TestAthleteAffiliations.test_federation_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get entity: {response.text}"
        
        entity = response.json()
        assert "athletes_count" in entity, "athletes_count field not in entity response"
        assert entity["athletes_count"] >= 1, f"Expected at least 1 athlete, got {entity['athletes_count']}"
        
        print(f"✓ Federation entity athletes_count: {entity['athletes_count']}")
    
    # ============ TEST 8: Update athlete affiliations ============
    def test_08_update_athlete_affiliations(self):
        """Update an athlete to add/remove affiliations"""
        headers = self.get_headers()
        
        # Update athlete - remove federation, keep only club
        athlete_data = {
            "name": "TEST_Atleta Afiliado (Actualizado)",
            "email": "test_afiliado@example.com",
            "sport": "athletics",
            "age": 25,
            "level": "avanzado",
            "notes": "Atleta actualizado - solo club",
            "affiliations": [TestAthleteAffiliations.test_club_id]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/athletes/{TestAthleteAffiliations.test_athlete_with_affiliations_id}",
            headers=headers,
            json=athlete_data
        )
        assert response.status_code == 200, f"Failed to update athlete: {response.text}"
        
        athlete = response.json()
        assert len(athlete["affiliations"]) == 1, f"Expected 1 affiliation, got {len(athlete['affiliations'])}"
        assert TestAthleteAffiliations.test_club_id in athlete["affiliations"], "Club ID not in affiliations"
        
        print(f"✓ Updated athlete affiliations to club only")
    
    # ============ TEST 9: Verify entity athletes list after update ============
    def test_09_verify_entity_athletes_after_update(self):
        """Verify that entity athletes list reflects the affiliation update"""
        headers = self.get_headers()
        
        # Get athletes affiliated to Federation - should no longer include test athlete
        response = requests.get(
            f"{BASE_URL}/api/entities/{TestAthleteAffiliations.test_federation_id}/athletes",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get entity athletes: {response.text}"
        
        athletes = response.json()
        athlete_ids = [a["id"] for a in athletes]
        
        # Test athlete should no longer be in federation athletes list
        assert TestAthleteAffiliations.test_athlete_with_affiliations_id not in athlete_ids, \
            "Test athlete should not be in federation athletes list after removing affiliation"
        
        print(f"✓ Verified athlete removed from Federation athletes list")
        
        # Get athletes affiliated to Club - should still include test athlete
        response = requests.get(
            f"{BASE_URL}/api/entities/{TestAthleteAffiliations.test_club_id}/athletes",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get club athletes: {response.text}"
        
        athletes = response.json()
        athlete_ids = [a["id"] for a in athletes]
        
        assert TestAthleteAffiliations.test_athlete_with_affiliations_id in athlete_ids, \
            "Test athlete should be in club athletes list"
        
        print(f"✓ Verified athlete still in Club athletes list")
    
    # ============ TEST 10: Cleanup - Delete test athletes ============
    def test_99_cleanup_test_data(self):
        """Cleanup test athletes"""
        headers = self.get_headers()
        
        # Delete test athlete with affiliations
        if TestAthleteAffiliations.test_athlete_with_affiliations_id:
            response = requests.delete(
                f"{BASE_URL}/api/athletes/{TestAthleteAffiliations.test_athlete_with_affiliations_id}",
                headers=headers
            )
            print(f"Deleted test athlete with affiliations: {response.status_code}")
        
        # Delete test athlete without affiliations
        if TestAthleteAffiliations.test_athlete_without_affiliations_id:
            response = requests.delete(
                f"{BASE_URL}/api/athletes/{TestAthleteAffiliations.test_athlete_without_affiliations_id}",
                headers=headers
            )
            print(f"Deleted test athlete without affiliations: {response.status_code}")
        
        print("✓ Test data cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

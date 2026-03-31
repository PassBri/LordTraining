"""
Test Teams CRUD API endpoints
Tests: Create, Read, Update, Delete teams and Team-Athlete relationships
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@train.com"
TEST_PASSWORD = "test123456"


class TestTeamsCRUD:
    """Teams CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Store created team IDs for cleanup
        self.created_team_ids = []
        
        yield
        
        # Cleanup: Delete created teams
        for team_id in self.created_team_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/teams/{team_id}")
            except:
                pass
    
    def test_01_login_success(self):
        """Test login works with test credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        print("PASS: Login successful")
    
    def test_02_get_teams_list(self):
        """Test GET /api/teams returns list"""
        response = self.session.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200, f"Get teams failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Get teams returned {len(data)} teams")
    
    def test_03_create_team(self):
        """Test POST /api/teams creates a new team"""
        team_name = f"TEST_Team_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": team_name,
            "sport": "football",
            "category": "Sub-17",
            "entity_id": None,
            "athletes": []
        }
        response = self.session.post(f"{BASE_URL}/api/teams", json=payload)
        assert response.status_code == 200, f"Create team failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have id"
        assert data["name"] == team_name, "Team name should match"
        assert data["sport"] == "football", "Sport should match"
        assert data["category"] == "Sub-17", "Category should match"
        
        self.created_team_ids.append(data["id"])
        print(f"PASS: Created team with id {data['id']}")
        return data["id"]
    
    def test_04_create_team_with_entity(self):
        """Test POST /api/teams with entity_id"""
        # First get entities to find one
        entities_response = self.session.get(f"{BASE_URL}/api/entities")
        entity_id = None
        if entities_response.status_code == 200:
            entities = entities_response.json()
            if entities:
                entity_id = entities[0].get("id")
        
        team_name = f"TEST_TeamWithEntity_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": team_name,
            "sport": "basketball",
            "category": "Senior",
            "entity_id": entity_id,
            "athletes": []
        }
        response = self.session.post(f"{BASE_URL}/api/teams", json=payload)
        assert response.status_code == 200, f"Create team with entity failed: {response.text}"
        
        data = response.json()
        assert data["name"] == team_name
        if entity_id:
            assert data["entity_id"] == entity_id, "Entity ID should match"
        
        self.created_team_ids.append(data["id"])
        print(f"PASS: Created team with entity_id={entity_id}")
        return data["id"]
    
    def test_05_get_team_by_id(self):
        """Test GET /api/teams/{team_id} returns specific team"""
        # First create a team
        team_name = f"TEST_GetTeam_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "sport": "tennis",
            "category": "Open",
            "athletes": []
        })
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        self.created_team_ids.append(team_id)
        
        # Get the team by ID
        response = self.session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert response.status_code == 200, f"Get team by ID failed: {response.text}"
        
        data = response.json()
        assert data["id"] == team_id
        assert data["name"] == team_name
        print(f"PASS: Get team by ID returned correct team")
    
    def test_06_update_team(self):
        """Test PUT /api/teams/{team_id} updates team"""
        # First create a team
        team_name = f"TEST_UpdateTeam_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "sport": "swimming",
            "category": "Junior",
            "athletes": []
        })
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        self.created_team_ids.append(team_id)
        
        # Update the team
        updated_name = f"TEST_UpdatedTeam_{uuid.uuid4().hex[:8]}"
        update_payload = {
            "name": updated_name,
            "sport": "cycling",
            "category": "Elite",
            "athletes": []
        }
        response = self.session.put(f"{BASE_URL}/api/teams/{team_id}", json=update_payload)
        assert response.status_code == 200, f"Update team failed: {response.text}"
        
        data = response.json()
        assert data["name"] == updated_name, "Name should be updated"
        assert data["sport"] == "cycling", "Sport should be updated"
        assert data["category"] == "Elite", "Category should be updated"
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["name"] == updated_name, "GET should return updated name"
        
        print(f"PASS: Team updated successfully")
    
    def test_07_delete_team(self):
        """Test DELETE /api/teams/{team_id} deletes team"""
        # First create a team
        team_name = f"TEST_DeleteTeam_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "sport": "volleyball",
            "category": "U-21",
            "athletes": []
        })
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        
        # Delete the team
        response = self.session.delete(f"{BASE_URL}/api/teams/{team_id}")
        assert response.status_code == 200, f"Delete team failed: {response.text}"
        
        # Verify team is deleted
        get_response = self.session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert get_response.status_code == 404, "Deleted team should return 404"
        
        print(f"PASS: Team deleted successfully")
    
    def test_08_get_nonexistent_team(self):
        """Test GET /api/teams/{team_id} returns 404 for nonexistent team"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/teams/{fake_id}")
        assert response.status_code == 404, f"Should return 404 for nonexistent team"
        print(f"PASS: Nonexistent team returns 404")


class TestTeamAthleteRelationship:
    """Team-Athlete relationship endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Store created resources for cleanup
        self.created_team_ids = []
        self.created_athlete_ids = []
        
        yield
        
        # Cleanup
        for team_id in self.created_team_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/teams/{team_id}")
            except:
                pass
        for athlete_id in self.created_athlete_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/athletes/{athlete_id}")
            except:
                pass
    
    def test_09_add_athlete_to_team(self):
        """Test POST /api/teams/{team_id}/athletes/{athlete_id} adds athlete"""
        # Create a team
        team_name = f"TEST_TeamForAthlete_{uuid.uuid4().hex[:8]}"
        team_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "sport": "football",
            "category": "Sub-19",
            "athletes": []
        })
        assert team_response.status_code == 200
        team_id = team_response.json()["id"]
        self.created_team_ids.append(team_id)
        
        # Get existing athletes or create one
        athletes_response = self.session.get(f"{BASE_URL}/api/athletes")
        athlete_id = None
        if athletes_response.status_code == 200:
            athletes = athletes_response.json()
            if athletes:
                athlete_id = athletes[0].get("id")
        
        if not athlete_id:
            # Create an athlete
            athlete_response = self.session.post(f"{BASE_URL}/api/athletes", json={
                "name": f"TEST_Athlete_{uuid.uuid4().hex[:8]}",
                "sport": "football",
                "age": 18,
                "level": "intermediate"
            })
            if athlete_response.status_code == 200:
                athlete_id = athlete_response.json()["id"]
                self.created_athlete_ids.append(athlete_id)
        
        if not athlete_id:
            pytest.skip("No athlete available for testing")
        
        # Add athlete to team
        response = self.session.post(f"{BASE_URL}/api/teams/{team_id}/athletes/{athlete_id}")
        assert response.status_code == 200, f"Add athlete to team failed: {response.text}"
        
        # Verify athlete is in team
        team_response = self.session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert team_response.status_code == 200
        team_data = team_response.json()
        assert athlete_id in team_data.get("athletes", []), "Athlete should be in team"
        
        print(f"PASS: Athlete {athlete_id} added to team {team_id}")
    
    def test_10_remove_athlete_from_team(self):
        """Test DELETE /api/teams/{team_id}/athletes/{athlete_id} removes athlete"""
        # Create a team
        team_name = f"TEST_TeamRemoveAthlete_{uuid.uuid4().hex[:8]}"
        team_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "sport": "basketball",
            "category": "Senior",
            "athletes": []
        })
        assert team_response.status_code == 200
        team_id = team_response.json()["id"]
        self.created_team_ids.append(team_id)
        
        # Get existing athletes
        athletes_response = self.session.get(f"{BASE_URL}/api/athletes")
        athlete_id = None
        if athletes_response.status_code == 200:
            athletes = athletes_response.json()
            if athletes:
                athlete_id = athletes[0].get("id")
        
        if not athlete_id:
            pytest.skip("No athlete available for testing")
        
        # Add athlete to team first
        add_response = self.session.post(f"{BASE_URL}/api/teams/{team_id}/athletes/{athlete_id}")
        assert add_response.status_code == 200
        
        # Remove athlete from team
        response = self.session.delete(f"{BASE_URL}/api/teams/{team_id}/athletes/{athlete_id}")
        assert response.status_code == 200, f"Remove athlete from team failed: {response.text}"
        
        # Verify athlete is removed
        team_response = self.session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert team_response.status_code == 200
        team_data = team_response.json()
        assert athlete_id not in team_data.get("athletes", []), "Athlete should be removed from team"
        
        print(f"PASS: Athlete {athlete_id} removed from team {team_id}")


class TestSportsCatalog:
    """Sports catalog endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_11_get_sports_catalog(self):
        """Test GET /api/sports/catalog returns categories with sports"""
        response = self.session.get(f"{BASE_URL}/api/sports/catalog")
        assert response.status_code == 200, f"Get sports catalog failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of categories"
        
        # Check structure
        if data:
            category = data[0]
            assert "id" in category, "Category should have id"
            assert "name" in category, "Category should have name"
            assert "sports" in category, "Category should have sports array"
            
            if category.get("sports"):
                sport = category["sports"][0]
                assert "id" in sport, "Sport should have id"
                assert "name" in sport, "Sport should have name"
        
        print(f"PASS: Sports catalog returned {len(data)} categories")


class TestEntities:
    """Entities endpoint tests (for team entity_id relationship)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_12_get_entities(self):
        """Test GET /api/entities returns list"""
        response = self.session.get(f"{BASE_URL}/api/entities")
        assert response.status_code == 200, f"Get entities failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Entities endpoint returned {len(data)} entities")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

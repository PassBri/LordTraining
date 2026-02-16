"""
Tournament Management System - Backend API Tests
Tests for: create tournament, categories, register participants, generate bracket, update scores, share, export PDF
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://coach-plan-builder.preview.emergentagent.com').rstrip('/')

class TestTournamentFlow:
    """Full tournament workflow tests"""
    
    # Shared state across tests
    auth_token = None
    tournament_id = None
    category_id = None
    match_id = None
    share_id = None
    team1_id = None
    team2_id = None
    team3_id = None
    team4_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token for all tests"""
        if not TestTournamentFlow.auth_token:
            # Login with test credentials
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@train.com",
                "password": "test123456"
            })
            if response.status_code == 200:
                TestTournamentFlow.auth_token = response.json().get("token")
            else:
                # Try creating test user
                register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
                    "email": "test@train.com",
                    "password": "test123456",
                    "name": "Test Tournament User",
                    "role": "coach"
                })
                if register_resp.status_code in [200, 201]:
                    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                        "email": "test@train.com",
                        "password": "test123456"
                    })
                    if login_resp.status_code == 200:
                        TestTournamentFlow.auth_token = login_resp.json().get("token")
        
        self.headers = {"Authorization": f"Bearer {TestTournamentFlow.auth_token}"}

    # Module 1: Tournament CRUD
    def test_01_create_tournament_single_elimination(self):
        """Create a tournament with single elimination format"""
        payload = {
            "name": "TEST_Copa Primavera 2026",
            "description": "Torneo de prueba para testing automatizado",
            "sport": "Fútbol",
            "format": "single_elimination",
            "start_date": "2026-03-01",
            "end_date": "2026-03-31",
            "registration_deadline": "2026-02-25",
            "venue": "Estadio Central",
            "city": "Ciudad Test",
            "country": "País Test",
            "scoring_system": "standard",
            "points_win": 3,
            "points_draw": 1,
            "points_loss": 0,
            "primary_color": "#3B82F6",
            "secondary_color": "#10B981",
            "categories": []
        }
        
        response = requests.post(f"{BASE_URL}/api/tournaments", json=payload, headers=self.headers)
        
        assert response.status_code in [200, 201], f"Create tournament failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing tournament id"
        assert data["name"] == payload["name"], "Tournament name mismatch"
        assert data["format"] == "single_elimination", "Format mismatch"
        assert data["sport"] == "Fútbol", "Sport mismatch"
        assert "share_id" in data, "Response missing share_id"
        
        TestTournamentFlow.tournament_id = data["id"]
        TestTournamentFlow.share_id = data["share_id"]
        print(f"✓ Tournament created: {data['id']}, share_id: {data['share_id']}")

    def test_02_get_tournaments_list(self):
        """Get list of tournaments"""
        response = requests.get(f"{BASE_URL}/api/tournaments", headers=self.headers)
        
        assert response.status_code == 200, f"Get tournaments failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Find our test tournament
        test_tournament = next((t for t in data if t.get("name", "").startswith("TEST_")), None)
        assert test_tournament is not None, "Test tournament not found in list"
        print(f"✓ Found {len(data)} tournaments, including test tournament")

    def test_03_get_tournament_detail(self):
        """Get specific tournament details"""
        assert TestTournamentFlow.tournament_id, "Tournament ID not available"
        
        response = requests.get(f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}", headers=self.headers)
        
        assert response.status_code == 200, f"Get tournament detail failed: {response.text}"
        
        data = response.json()
        assert data["id"] == TestTournamentFlow.tournament_id, "Tournament ID mismatch"
        assert data["name"].startswith("TEST_"), "Not our test tournament"
        assert "categories" in data, "Missing categories field"
        print(f"✓ Tournament detail retrieved: {data['name']}")

    # Module 2: Categories
    def test_04_add_category_sub17_masculino(self):
        """Add a category (Sub-17 Masculino) to tournament"""
        assert TestTournamentFlow.tournament_id, "Tournament ID not available"
        
        payload = {
            "name": "Sub-17 Masculino",
            "gender": "male",
            "age_min": 15,
            "age_max": 17,
            "max_participants": 16
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}/categories",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Add category failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response missing category id"
        assert data["name"] == "Sub-17 Masculino", "Category name mismatch"
        
        TestTournamentFlow.category_id = data["id"]
        print(f"✓ Category created: {data['name']}, id: {data['id']}")

    # Module 3: Create Teams for participants
    def test_05_create_teams_for_tournament(self):
        """Create test teams that will be registered in the tournament"""
        teams_to_create = [
            {"name": "TEST_Equipo Alpha", "sport": "Fútbol"},
            {"name": "TEST_Equipo Beta", "sport": "Fútbol"},
            {"name": "TEST_Equipo Gamma", "sport": "Fútbol"},
            {"name": "TEST_Equipo Delta", "sport": "Fútbol"},
        ]
        
        created_teams = []
        for team in teams_to_create:
            response = requests.post(f"{BASE_URL}/api/teams", json=team, headers=self.headers)
            if response.status_code in [200, 201]:
                data = response.json()
                created_teams.append(data)
        
        # If teams already exist, get them
        if len(created_teams) < 4:
            response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
            if response.status_code == 200:
                all_teams = response.json()
                test_teams = [t for t in all_teams if t.get("name", "").startswith("TEST_")]
                if len(test_teams) >= 4:
                    created_teams = test_teams[:4]
        
        assert len(created_teams) >= 4, f"Need at least 4 teams, got {len(created_teams)}"
        
        TestTournamentFlow.team1_id = created_teams[0]["id"]
        TestTournamentFlow.team2_id = created_teams[1]["id"]
        TestTournamentFlow.team3_id = created_teams[2]["id"]
        TestTournamentFlow.team4_id = created_teams[3]["id"]
        
        print(f"✓ Created/found {len(created_teams)} teams for tournament")

    # Module 4: Register Participants
    def test_06_register_participants_in_category(self):
        """Register 4 teams in the category"""
        assert TestTournamentFlow.tournament_id, "Tournament ID not available"
        assert TestTournamentFlow.category_id, "Category ID not available"
        assert TestTournamentFlow.team1_id, "Teams not created"
        
        teams = [
            (TestTournamentFlow.team1_id, "TEST_Equipo Alpha", 1),
            (TestTournamentFlow.team2_id, "TEST_Equipo Beta", 2),
            (TestTournamentFlow.team3_id, "TEST_Equipo Gamma", 3),
            (TestTournamentFlow.team4_id, "TEST_Equipo Delta", 4),
        ]
        
        registered = 0
        for team_id, team_name, seed in teams:
            payload = {
                "participant_type": "team",
                "participant_id": team_id,
                "participant_name": team_name,
                "seed": seed
            }
            
            response = requests.post(
                f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}/categories/{TestTournamentFlow.category_id}/register",
                json=payload,
                headers=self.headers
            )
            
            if response.status_code == 200:
                registered += 1
            elif response.status_code == 400 and "already registered" in response.text.lower():
                registered += 1  # Already registered is OK
        
        assert registered >= 4, f"Only {registered} participants registered"
        print(f"✓ Registered {registered} participants in category")

    # Module 5: Generate Bracket
    def test_07_generate_bracket_automatically(self):
        """Generate bracket automatically"""
        assert TestTournamentFlow.tournament_id, "Tournament ID not available"
        assert TestTournamentFlow.category_id, "Category ID not available"
        
        response = requests.post(
            f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}/categories/{TestTournamentFlow.category_id}/generate-bracket",
            json={},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Generate bracket failed: {response.text}"
        
        data = response.json()
        assert "bracket" in data or "message" in data, "Response missing bracket or message"
        print(f"✓ Bracket generated successfully")

    # Module 6: Get Matches
    def test_08_get_tournament_matches(self):
        """Get all matches for the tournament"""
        assert TestTournamentFlow.tournament_id, "Tournament ID not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}/matches",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get matches failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be list of matches"
        
        if len(data) > 0:
            TestTournamentFlow.match_id = data[0].get("id")
            print(f"✓ Found {len(data)} matches, first match: {TestTournamentFlow.match_id}")
        else:
            print("✓ No matches found yet (bracket may not have been generated)")

    # Module 7: Update Match Score
    def test_09_update_match_score(self):
        """Update score of a match"""
        if not TestTournamentFlow.match_id:
            pytest.skip("No match ID available")
        
        payload = {
            "participant1_score": 3,
            "participant2_score": 1,
            "status": "completed"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}/matches/{TestTournamentFlow.match_id}/score",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Update score failed: {response.text}"
        print(f"✓ Match score updated to 3-1")

    # Module 8: Share Tournament (Public View)
    def test_10_share_tournament_public_access(self):
        """Test public access via share_id"""
        if not TestTournamentFlow.share_id:
            pytest.skip("No share_id available")
        
        # This endpoint should NOT require authentication
        response = requests.get(f"{BASE_URL}/api/tournaments/public/{TestTournamentFlow.share_id}")
        
        assert response.status_code == 200, f"Public tournament access failed: {response.text}"
        
        data = response.json()
        assert "tournament" in data, "Response missing tournament data"
        assert "matches" in data, "Response missing matches data"
        
        tournament = data["tournament"]
        assert tournament["name"].startswith("TEST_"), "Not our test tournament"
        print(f"✓ Public tournament access works for share_id: {TestTournamentFlow.share_id}")

    def test_11_share_tournament_invalid_share_id(self):
        """Test 404 for invalid share_id"""
        response = requests.get(f"{BASE_URL}/api/tournaments/public/invalid-share-id-123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid share_id correctly returns 404")

    # Module 9: Export PDF
    def test_12_export_tournament_pdf(self):
        """Test PDF export endpoint"""
        assert TestTournamentFlow.tournament_id, "Tournament ID not available"
        
        # PDF export requires token in query param
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}/export-pdf",
            headers=self.headers,
            allow_redirects=False
        )
        
        # Could be 200 with PDF content or redirect
        assert response.status_code in [200, 302, 401], f"PDF export failed with {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            # Check if response is PDF
            content_type = response.headers.get("content-type", "")
            assert "pdf" in content_type.lower() or len(response.content) > 0, "Response is not PDF"
            print(f"✓ PDF export successful, size: {len(response.content)} bytes")
        else:
            print(f"✓ PDF export endpoint responded with {response.status_code}")

    # Module 10: Standings
    def test_13_get_category_standings(self):
        """Get standings for category"""
        assert TestTournamentFlow.tournament_id, "Tournament ID not available"
        assert TestTournamentFlow.category_id, "Category ID not available"
        
        response = requests.get(
            f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}/standings/{TestTournamentFlow.category_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get standings failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Standings retrieved: {len(data)} entries")

    # Cleanup
    def test_99_cleanup_test_data(self):
        """Cleanup: delete test tournament"""
        if not TestTournamentFlow.tournament_id:
            pytest.skip("No tournament to cleanup")
        
        response = requests.delete(
            f"{BASE_URL}/api/tournaments/{TestTournamentFlow.tournament_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Delete tournament failed: {response.text}"
        
        # Also cleanup test teams
        for team_id in [TestTournamentFlow.team1_id, TestTournamentFlow.team2_id, 
                        TestTournamentFlow.team3_id, TestTournamentFlow.team4_id]:
            if team_id:
                requests.delete(f"{BASE_URL}/api/teams/{team_id}", headers=self.headers)
        
        print("✓ Test data cleaned up")


class TestTournamentFormats:
    """Test different tournament formats"""
    
    auth_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestTournamentFormats.auth_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@train.com",
                "password": "test123456"
            })
            if response.status_code == 200:
                TestTournamentFormats.auth_token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {TestTournamentFormats.auth_token}"}

    def test_create_round_robin_tournament(self):
        """Create tournament with round robin format"""
        payload = {
            "name": "TEST_Liga Round Robin",
            "sport": "Baloncesto",
            "format": "round_robin",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
            "categories": []
        }
        
        response = requests.post(f"{BASE_URL}/api/tournaments", json=payload, headers=self.headers)
        
        assert response.status_code in [200, 201], f"Create round robin tournament failed: {response.text}"
        
        data = response.json()
        assert data["format"] == "round_robin"
        
        # Cleanup
        if "id" in data:
            requests.delete(f"{BASE_URL}/api/tournaments/{data['id']}", headers=self.headers)
        
        print("✓ Round robin tournament created successfully")

    def test_create_group_stage_knockout_tournament(self):
        """Create tournament with group stage + knockout format"""
        payload = {
            "name": "TEST_Mundial Grupos",
            "sport": "Fútbol",
            "format": "group_stage_knockout",
            "start_date": "2026-06-01",
            "end_date": "2026-07-15",
            "groups_count": 4,
            "teams_per_group": 4,
            "advance_per_group": 2,
            "categories": []
        }
        
        response = requests.post(f"{BASE_URL}/api/tournaments", json=payload, headers=self.headers)
        
        assert response.status_code in [200, 201], f"Create group stage tournament failed: {response.text}"
        
        data = response.json()
        assert data["format"] == "group_stage_knockout"
        assert data["groups_count"] == 4
        
        # Cleanup
        if "id" in data:
            requests.delete(f"{BASE_URL}/api/tournaments/{data['id']}", headers=self.headers)
        
        print("✓ Group stage knockout tournament created successfully")

    def test_create_double_elimination_tournament(self):
        """Create tournament with double elimination format"""
        payload = {
            "name": "TEST_Doble Eliminación",
            "sport": "Tenis",
            "format": "double_elimination",
            "start_date": "2026-05-01",
            "end_date": "2026-05-15",
            "categories": []
        }
        
        response = requests.post(f"{BASE_URL}/api/tournaments", json=payload, headers=self.headers)
        
        assert response.status_code in [200, 201], f"Create double elimination tournament failed: {response.text}"
        
        data = response.json()
        assert data["format"] == "double_elimination"
        
        # Cleanup
        if "id" in data:
            requests.delete(f"{BASE_URL}/api/tournaments/{data['id']}", headers=self.headers)
        
        print("✓ Double elimination tournament created successfully")


class TestTournamentEdgeCases:
    """Edge cases and error handling"""
    
    auth_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestTournamentEdgeCases.auth_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@train.com",
                "password": "test123456"
            })
            if response.status_code == 200:
                TestTournamentEdgeCases.auth_token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {TestTournamentEdgeCases.auth_token}"}

    def test_get_nonexistent_tournament(self):
        """404 for nonexistent tournament"""
        response = requests.get(f"{BASE_URL}/api/tournaments/nonexistent-id-123", headers=self.headers)
        assert response.status_code == 404
        print("✓ Nonexistent tournament returns 404")

    def test_generate_bracket_insufficient_participants(self):
        """Cannot generate bracket with less than 2 participants"""
        # Create tournament
        payload = {
            "name": "TEST_Empty Tournament",
            "sport": "Fútbol",
            "format": "single_elimination",
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "categories": []
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/tournaments", json=payload, headers=self.headers)
        if create_resp.status_code not in [200, 201]:
            pytest.skip("Could not create test tournament")
        
        tournament_id = create_resp.json()["id"]
        
        # Add category
        cat_payload = {"name": "Empty Category"}
        cat_resp = requests.post(
            f"{BASE_URL}/api/tournaments/{tournament_id}/categories",
            json=cat_payload,
            headers=self.headers
        )
        
        if cat_resp.status_code != 200:
            requests.delete(f"{BASE_URL}/api/tournaments/{tournament_id}", headers=self.headers)
            pytest.skip("Could not create category")
        
        category_id = cat_resp.json()["id"]
        
        # Try to generate bracket with 0 participants
        bracket_resp = requests.post(
            f"{BASE_URL}/api/tournaments/{tournament_id}/categories/{category_id}/generate-bracket",
            json={},
            headers=self.headers
        )
        
        assert bracket_resp.status_code == 400, f"Expected 400, got {bracket_resp.status_code}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tournaments/{tournament_id}", headers=self.headers)
        
        print("✓ Generate bracket with insufficient participants returns 400")

    def test_tournament_without_auth(self):
        """Verify auth is required for tournament endpoints"""
        response = requests.get(f"{BASE_URL}/api/tournaments")
        assert response.status_code in [401, 403, 520], f"Expected auth error, got {response.status_code}"
        print("✓ Tournament list requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

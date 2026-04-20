"""
Test suite for Tactical Board Share, Coach Profile, and Top Boards endpoints.
Tests the new features: POST /api/boards/share, GET /api/coaches/{slug}, 
GET /api/boards/top, POST /api/boards/duplicate/{share_id}, GET /api/s/{share_id}
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBoardShare:
    """Tests for POST /api/boards/share endpoint"""
    
    def test_share_board_basic(self):
        """Test basic board sharing without coach info"""
        response = requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": [], "sport": "Futbol"},
            "sport": "Futbol",
            "title": "Test Jugada Basica"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "share_id" in data
        assert data["share_id"].startswith("TB-")
        assert data["expires_in_days"] == 90
        print(f"✓ Basic share created: {data['share_id']}")
        return data["share_id"]
    
    def test_share_board_with_coach_slug(self):
        """Test board sharing with coach_slug and coach_name"""
        response = requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": [{"type": "player", "x": 100, "y": 200}], "sport": "Futbol"},
            "sport": "Futbol",
            "title": "Jugada con Coach",
            "description": "Descripción de prueba",
            "coach_slug": "coach-test",
            "coach_name": "Coach Test"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "share_id" in data
        print(f"✓ Share with coach_slug created: {data['share_id']}")
        return data["share_id"]
    
    def test_share_board_slug_normalization(self):
        """Test that coach_slug is normalized to lowercase with dashes"""
        response = requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": []},
            "sport": "Basketball",
            "title": "Test Slug Normalization",
            "coach_slug": "Juan Perez COACH",  # Should become "juan-perez-coach"
            "coach_name": "Juan Pérez"
        })
        assert response.status_code == 200
        data = response.json()
        assert "share_id" in data
        print(f"✓ Slug normalization test passed: {data['share_id']}")
        return data["share_id"]


class TestCoachProfile:
    """Tests for GET /api/coaches/{slug} endpoint"""
    
    def test_coach_profile_existing(self):
        """Test getting coach profile with existing boards"""
        # First create a board with coach_slug
        share_resp = requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": []},
            "sport": "Futbol",
            "title": "Jugada Coach Profile Test",
            "coach_slug": "test-coach-profile",
            "coach_name": "Test Coach Profile"
        })
        assert share_resp.status_code == 200
        
        # Now get the coach profile
        response = requests.get(f"{BASE_URL}/api/coaches/test-coach-profile")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "slug" in data
        assert "coach_name" in data
        assert "items" in data
        assert "totals" in data
        assert "not_found" in data
        
        # Verify totals structure
        assert "boards" in data["totals"]
        assert "views" in data["totals"]
        assert "duplicates" in data["totals"]
        
        print(f"✓ Coach profile retrieved: {data['coach_name']} with {data['totals']['boards']} boards")
    
    def test_coach_profile_nonexistent(self):
        """Test getting coach profile for non-existent slug returns 200 with not_found=true"""
        response = requests.get(f"{BASE_URL}/api/coaches/nonexistent-coach-xyz-12345")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["not_found"] == True
        assert data["items"] == []
        assert data["totals"]["boards"] == 0
        print("✓ Non-existent coach returns 200 with not_found=true")
    
    def test_coach_profile_slug_case_insensitive(self):
        """Test that coach slug lookup is case-insensitive"""
        # Create board with lowercase slug
        requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": []},
            "sport": "Tennis",
            "title": "Case Test",
            "coach_slug": "case-test-coach",
            "coach_name": "Case Test Coach"
        })
        
        # Query with different case
        response = requests.get(f"{BASE_URL}/api/coaches/CASE-TEST-COACH")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "case-test-coach"  # Should be normalized
        print("✓ Case-insensitive slug lookup works")


class TestBoardDuplicate:
    """Tests for POST /api/boards/duplicate/{share_id} endpoint"""
    
    def test_duplicate_increments_counter(self):
        """Test that duplicate endpoint increments the duplicates counter"""
        # Create a board first
        share_resp = requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": []},
            "sport": "Futbol",
            "title": "Duplicate Test Board"
        })
        assert share_resp.status_code == 200
        share_id = share_resp.json()["share_id"]
        
        # Call duplicate endpoint
        dup_resp = requests.post(f"{BASE_URL}/api/boards/duplicate/{share_id}")
        assert dup_resp.status_code == 200, f"Expected 200, got {dup_resp.status_code}: {dup_resp.text}"
        data = dup_resp.json()
        
        assert data["share_id"] == share_id
        assert data["duplicates"] >= 1
        print(f"✓ Duplicate counter incremented to {data['duplicates']}")
    
    def test_duplicate_nonexistent_board(self):
        """Test duplicate endpoint with non-existent share_id returns 404"""
        response = requests.post(f"{BASE_URL}/api/boards/duplicate/TB-nonexistent123")
        assert response.status_code == 404
        print("✓ Non-existent board returns 404 on duplicate")


class TestTopBoards:
    """Tests for GET /api/boards/top endpoint"""
    
    def test_top_boards_basic(self):
        """Test getting top boards"""
        response = requests.get(f"{BASE_URL}/api/boards/top?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "items" in data
        assert "totals" in data
        assert isinstance(data["items"], list)
        
        # Verify totals structure
        assert "views" in data["totals"]
        assert "duplicates" in data["totals"]
        assert "boards" in data["totals"]
        
        print(f"✓ Top boards retrieved: {len(data['items'])} items, {data['totals']['boards']} total boards")
    
    def test_top_boards_sorted_by_duplicates(self):
        """Test that top boards are sorted by duplicates (descending)"""
        response = requests.get(f"{BASE_URL}/api/boards/top?limit=5")
        assert response.status_code == 200
        data = response.json()
        
        items = data["items"]
        if len(items) >= 2:
            # Verify descending order by duplicates
            for i in range(len(items) - 1):
                assert items[i]["duplicates"] >= items[i+1]["duplicates"], \
                    f"Items not sorted by duplicates: {items[i]['duplicates']} < {items[i+1]['duplicates']}"
        print("✓ Top boards sorted by duplicates (descending)")


class TestBoardViewer:
    """Tests for GET /api/s/{share_id} (OpenGraph viewer landing)"""
    
    def test_viewer_landing_page(self):
        """Test that viewer landing page returns HTML with OpenGraph meta tags"""
        # Create a board first
        share_resp = requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": []},
            "sport": "Futbol",
            "title": "Viewer Test Board"
        })
        assert share_resp.status_code == 200
        share_id = share_resp.json()["share_id"]
        
        # Get the viewer landing page
        response = requests.get(f"{BASE_URL}/api/s/{share_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Should return HTML
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML, got {content_type}"
        
        # Check for OpenGraph meta tags
        html = response.text
        assert "og:title" in html
        assert "og:image" in html
        print(f"✓ Viewer landing page works for {share_id}")
    
    def test_viewer_nonexistent_board(self):
        """Test viewer landing for non-existent board returns 404"""
        response = requests.get(f"{BASE_URL}/api/s/TB-nonexistent999")
        assert response.status_code == 404
        print("✓ Non-existent board viewer returns 404")


class TestEndToEndFlow:
    """End-to-end flow tests"""
    
    def test_full_share_and_coach_flow(self):
        """Test complete flow: share board with coach_slug, then verify it appears in coach profile"""
        unique_slug = f"e2e-coach-{int(time.time())}"
        
        # Step 1: Share a board with coach_slug
        share_resp = requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": [{"type": "player", "x": 100, "y": 200}]},
            "sport": "Futbol",
            "title": "E2E Test Jugada",
            "description": "End-to-end test",
            "coach_slug": unique_slug,
            "coach_name": "E2E Test Coach"
        })
        assert share_resp.status_code == 200
        share_id = share_resp.json()["share_id"]
        print(f"  Step 1: Created board {share_id}")
        
        # Step 2: Verify board appears in coach profile
        coach_resp = requests.get(f"{BASE_URL}/api/coaches/{unique_slug}")
        assert coach_resp.status_code == 200
        coach_data = coach_resp.json()
        
        assert coach_data["not_found"] == False
        assert coach_data["totals"]["boards"] >= 1
        
        # Find our board in the items
        board_found = any(item["share_id"] == share_id for item in coach_data["items"])
        assert board_found, f"Board {share_id} not found in coach profile"
        print(f"  Step 2: Board found in coach profile")
        
        # Step 3: Duplicate the board
        dup_resp = requests.post(f"{BASE_URL}/api/boards/duplicate/{share_id}")
        assert dup_resp.status_code == 200
        print(f"  Step 3: Board duplicated, count: {dup_resp.json()['duplicates']}")
        
        # Step 4: Verify duplicate count in coach profile
        coach_resp2 = requests.get(f"{BASE_URL}/api/coaches/{unique_slug}")
        coach_data2 = coach_resp2.json()
        assert coach_data2["totals"]["duplicates"] >= 1
        print(f"  Step 4: Coach profile shows {coach_data2['totals']['duplicates']} duplicates")
        
        print("✓ Full E2E flow completed successfully")


class TestBoardView:
    """Tests for GET /api/boards/view/{share_id}"""
    
    def test_view_board_increments_views(self):
        """Test that viewing a board increments the view counter"""
        # Create a board
        share_resp = requests.post(f"{BASE_URL}/api/boards/share", json={
            "payload": {"elements": []},
            "sport": "Futbol",
            "title": "View Counter Test"
        })
        assert share_resp.status_code == 200
        share_id = share_resp.json()["share_id"]
        
        # View the board
        view_resp = requests.get(f"{BASE_URL}/api/boards/view/{share_id}")
        assert view_resp.status_code == 200
        data = view_resp.json()
        
        initial_views = data["views"]
        
        # View again
        view_resp2 = requests.get(f"{BASE_URL}/api/boards/view/{share_id}")
        assert view_resp2.status_code == 200
        data2 = view_resp2.json()
        
        assert data2["views"] > initial_views, "View counter should increment"
        print(f"✓ View counter incremented: {initial_views} -> {data2['views']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

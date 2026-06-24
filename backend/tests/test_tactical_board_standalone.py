"""
Test suite for Tactical Board Standalone HTML page and API
Tests the /api/tactical-board/generate endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lord-deploy-test.preview.emergentagent.com')

class TestTacticalBoardStandalone:
    """Tests for the standalone tactical board HTML page and API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_standalone_html_page_loads(self):
        """Test that the standalone tactical board HTML page loads"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "Pizarra Tactica" in response.text, "Page title not found"
        assert "iTRAIN" in response.text, "iTRAIN branding not found"
        print("✓ Standalone HTML page loads correctly")
    
    def test_html_contains_category_tabs(self):
        """Test that HTML contains all 8 sport categories"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200
        
        categories = ['Conjunto', 'Raqueta', 'Contacto', 'Tiempo/Marca', 'Individuales', 'Orientacion', 'Esports', 'Gimnasio']
        for cat in categories:
            assert cat in response.text, f"Category '{cat}' not found in HTML"
        print("✓ All 8 sport categories present in HTML")
    
    def test_html_contains_drawing_tools(self):
        """Test that HTML contains all 8 drawing tools"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200
        
        tools = ['Mover', 'Lapiz', 'Linea', 'Curva', 'Flecha', 'Zona', 'Texto', 'Borrar']
        for tool in tools:
            assert tool in response.text, f"Tool '{tool}' not found in HTML"
        print("✓ All 8 drawing tools present in HTML")
    
    def test_html_contains_player_elements(self):
        """Test that HTML contains player element tools"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200
        
        elements = ['Jugador A', 'Jugador B', 'Portero', 'Balon', 'Cono', 'Bandera', 'Valla']
        for elem in elements:
            assert elem in response.text, f"Element '{elem}' not found in HTML"
        print("✓ All player element tools present in HTML")
    
    def test_html_contains_disposition_tools(self):
        """Test that HTML contains spatial disposition tools"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200
        
        dispositions = ['Fila', 'Circulo', 'Grilla', 'Parejas', 'Rombo', 'Triangulo']
        for disp in dispositions:
            assert disp in response.text, f"Disposition '{disp}' not found in HTML"
        print("✓ All spatial disposition tools present in HTML")
    
    def test_html_contains_sport_fields(self):
        """Test that HTML contains sport field SVG definitions"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200
        
        # Check for sport field definitions in FIELDS object
        sports = ['Futbol', 'Baloncesto', 'Voleibol', 'Tenis', 'Padel', 'Boxeo', 'MMA', 'Atletismo', 'Natacion']
        for sport in sports:
            assert f"'{sport}'" in response.text or f'"{sport}"' in response.text, f"Sport field '{sport}' not found"
        print("✓ Multiple sport field SVGs defined in HTML")
    
    def test_html_contains_formations(self):
        """Test that HTML contains predefined formations"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200
        
        formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '2-3 Zona', '5-1']
        for formation in formations:
            assert formation in response.text, f"Formation '{formation}' not found"
        print("✓ Predefined formations present in HTML")
    
    def test_html_contains_footer_controls(self):
        """Test that HTML contains footer control buttons"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200
        
        controls = ['Deshacer', 'Rehacer', 'Limpiar', 'Cuadricula', 'Formaciones', 'Exportar PNG', 'Generar con IA']
        for ctrl in controls:
            assert ctrl in response.text, f"Control '{ctrl}' not found"
        print("✓ All footer controls present in HTML")
    
    def test_html_contains_zoom_controls(self):
        """Test that HTML contains zoom controls"""
        response = requests.get(f"{BASE_URL}/tactical-board.html")
        assert response.status_code == 200
        
        assert 'zoomIn' in response.text, "Zoom in function not found"
        assert 'zoomOut' in response.text, "Zoom out function not found"
        assert 'zoomReset' in response.text, "Zoom reset function not found"
        print("✓ Zoom controls present in HTML")
    
    def test_api_tactical_board_generate_football(self):
        """Test API generates tactical board for football"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "football",
            "description": "4-3-3 attacking formation",
            "num_team_a": 11,
            "num_team_b": 0
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "elements" in data, "Response missing 'elements' key"
        assert isinstance(data["elements"], list), "Elements should be a list"
        print(f"✓ API generates football tactical board with {len(data['elements'])} elements")
    
    def test_api_tactical_board_generate_basketball(self):
        """Test API generates tactical board for basketball"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "basketball",
            "description": "Pick and roll play",
            "num_team_a": 5,
            "num_team_b": 5
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "elements" in data, "Response missing 'elements' key"
        print(f"✓ API generates basketball tactical board with {len(data['elements'])} elements")
    
    def test_api_tactical_board_generate_volleyball(self):
        """Test API generates tactical board for volleyball"""
        response = self.session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "volleyball",
            "description": "5-1 rotation",
            "num_team_a": 6,
            "num_team_b": 0
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "elements" in data, "Response missing 'elements' key"
        print(f"✓ API generates volleyball tactical board with {len(data['elements'])} elements")
    
    def test_api_tactical_board_requires_auth(self):
        """Test API requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/tactical-board/generate", json={
            "sport": "football",
            "description": "Test",
            "num_team_a": 5,
            "num_team_b": 0
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ API correctly requires authentication")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

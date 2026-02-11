"""
Comprehensive PDF Export Tests - Tests all 12 sections and export functionality
This file tests:
1. Backend POST /api/export/comprehensive-pdf endpoint
2. All 12 sections: athlete_info, characterization, anthropometric, evaluations, 
   medical, analysis, objectives, periodization, training_methods, graphic_plan, control, calendar
3. PDF download functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPDFExport:
    """Test PDF Export functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@train.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            return response.json().get("token")
        # Try to register if login fails
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@train.com",
            "password": "test123456",
            "name": "Test User",
            "role": "coach"
        })
        if reg_response.status_code in [200, 201]:
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@train.com",
                "password": "test123456"
            })
            return login_response.json().get("token")
        pytest.skip("Could not authenticate")
    
    @pytest.fixture(scope="class")
    def athlete_id(self, auth_token):
        """Get or create a test athlete"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/athletes", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        # Create test athlete
        create_response = requests.post(f"{BASE_URL}/api/athletes", 
            headers=headers,
            json={
                "name": "TEST_PDF_Export_Athlete",
                "sport": "athletics",
                "age": 25,
                "level": "avanzado"
            })
        if create_response.status_code in [200, 201]:
            return create_response.json()["id"]
        pytest.skip("Could not create test athlete")
    
    def test_pdf_endpoint_exists(self, auth_token, athlete_id):
        """Test that comprehensive PDF endpoint exists and returns PDF"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # Minimal request with just athlete_info section
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "athlete_info", "items": ["basic_info"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color",
                "include_logo": True,
                "include_date": True,
                "include_page_numbers": True
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get('Content-Type') == 'application/pdf'
        
        # Verify it's a valid PDF (starts with %PDF)
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF"
        print("✅ PDF endpoint exists and returns valid PDF")
    
    def test_all_12_sections_available(self, auth_token, athlete_id):
        """Test that all 12 sections can be included in PDF export"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # All 12 sections as defined in PDFExportModal.js
        all_sections = [
            {"section": "athlete_info", "items": ["basic_info", "affiliations", "contact"]},
            {"section": "characterization", "items": ["sport_char", "athlete_char", "performance_model"]},
            {"section": "anthropometric", "items": ["measurements", "body_composition", "history"]},
            {"section": "evaluations", "items": ["physical_tests", "technical_tests", "performance_history"]},
            {"section": "medical", "items": ["diagnostic", "injuries", "diseases"]},
            {"section": "analysis", "items": ["previous_plan", "competition_analysis", "strengths_weaknesses"]},
            {"section": "objectives", "items": ["general_objectives", "specific_objectives", "kpis"]},
            {"section": "periodization", "items": ["periodization_model", "macrocycle_stages", "macrocycles", "mesocycles", "microcycles", "sessions"]},
            {"section": "training_methods", "items": ["exercises", "methods", "progressions"]},
            {"section": "graphic_plan", "items": ["training_table", "load_chart", "volume_intensity_chart", "phase_timeline"]},
            {"section": "control", "items": ["load_monitoring", "training_control", "alerts"]},
            {"section": "calendar", "items": ["competitions", "training_camps", "evaluations_calendar"]}
        ]
        
        payload = {
            "athlete_id": athlete_id,
            "sections": all_sections,
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color",
                "include_logo": True,
                "include_date": True,
                "include_page_numbers": True
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"PDF with all 12 sections failed: {response.status_code}"
        assert response.headers.get('Content-Type') == 'application/pdf'
        
        # Verify it's a valid PDF
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF"
        assert len(content) > 1000, "PDF is too small, likely empty"
        print(f"✅ All 12 sections exported successfully, PDF size: {len(content)} bytes")
    
    def test_new_sections_characterization(self, auth_token, athlete_id):
        """Test characterization section (one of the 6 new sections)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "characterization", "items": ["sport_char", "athlete_char"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Characterization section failed: {response.status_code}"
        print("✅ Characterization section (new) works correctly")
    
    def test_new_sections_medical(self, auth_token, athlete_id):
        """Test medical section (one of the 6 new sections)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "medical", "items": ["diagnostic", "injuries", "diseases"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Medical section failed: {response.status_code}"
        print("✅ Medical (Historial Médico) section works correctly")
    
    def test_new_sections_analysis(self, auth_token, athlete_id):
        """Test analysis section (Análisis Previo - one of the 6 new sections)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "analysis", "items": ["previous_plan", "competition_analysis"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Analysis section failed: {response.status_code}"
        print("✅ Analysis (Análisis Previo) section works correctly")
    
    def test_new_sections_objectives(self, auth_token, athlete_id):
        """Test objectives section (Objetivos e Indicadores - one of the 6 new sections)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "objectives", "items": ["general_objectives", "specific_objectives", "kpis"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Objectives section failed: {response.status_code}"
        print("✅ Objectives (Objetivos e Indicadores) section works correctly")
    
    def test_new_sections_training_methods(self, auth_token, athlete_id):
        """Test training_methods section (Medios de Entrenamiento - one of the 6 new sections)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "training_methods", "items": ["exercises", "methods"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Training methods section failed: {response.status_code}"
        print("✅ Training Methods (Medios de Entrenamiento) section works correctly")
    
    def test_new_sections_control(self, auth_token, athlete_id):
        """Test control section (Control y Seguimiento - one of the 6 new sections)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "control", "items": ["load_monitoring", "training_control", "alerts"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Control section failed: {response.status_code}"
        print("✅ Control (Control y Seguimiento) section works correctly")
    
    def test_graphic_plan_section(self, auth_token, athlete_id):
        """Test graphic_plan section with all chart options"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "graphic_plan", "items": ["training_table", "load_chart", "volume_intensity_chart", "phase_timeline"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "landscape",  # Better for charts
                "color_scheme": "color"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Graphic plan section failed: {response.status_code}"
        print("✅ Graphic Plan section with all charts works correctly")
    
    def test_pdf_format_options(self, auth_token, athlete_id):
        """Test different format options"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # Test A4, landscape, grayscale
        payload = {
            "athlete_id": athlete_id,
            "sections": [
                {"section": "athlete_info", "items": ["basic_info"]}
            ],
            "format": {
                "paper_size": "a4",
                "orientation": "landscape",
                "color_scheme": "grayscale",
                "include_logo": True,
                "include_date": False,
                "include_page_numbers": True
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Format options test failed: {response.status_code}"
        print("✅ PDF format options (A4, landscape, grayscale) work correctly")
    
    def test_pdf_without_athlete_id(self, auth_token):
        """Test PDF export without athlete_id (should still work with limited data)"""
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "sections": [
                {"section": "graphic_plan", "items": ["training_table"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"PDF without athlete_id failed: {response.status_code}"
        print("✅ PDF export without athlete_id works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

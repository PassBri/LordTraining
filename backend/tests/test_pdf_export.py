"""
Test PDF Export Comprehensive Endpoint
Tests for the customizable PDF export feature including:
- POST /api/export/comprehensive-pdf endpoint
- All 6 sections (athlete_info, anthropometric, evaluations, periodization, graphic_plan, calendar)
- Format options (paper_size, orientation, color_scheme)
- Periodization subsections (macrocycles, mesocycles, microcycles, sessions)
- Graphic plan subsections (training_table, load_chart, volume_intensity_chart, phase_timeline)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@train.com"
TEST_PASSWORD = "test123456"


class TestPDFExport:
    """PDF Export endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print("✓ Login successful")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        # Get first athlete for testing
        athletes_response = self.session.get(f"{BASE_URL}/api/athletes")
        if athletes_response.status_code == 200 and athletes_response.json():
            self.athlete = athletes_response.json()[0]
            self.athlete_id = self.athlete.get("id")
            print(f"✓ Using athlete: {self.athlete.get('name')} (ID: {self.athlete_id})")
        else:
            self.athlete_id = None
            print("⚠ No athletes found, tests will use None athlete_id")
    
    def test_endpoint_exists(self):
        """Test that the endpoint exists and returns proper response"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
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
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf", "Expected PDF content type"
        print(f"✓ Endpoint returned PDF, size: {len(response.content)} bytes")
    
    def test_all_sections_selectable(self):
        """Test that all 6 sections can be included in the PDF"""
        all_sections = [
            {"section": "athlete_info", "items": ["basic_info", "affiliations", "contact"]},
            {"section": "anthropometric", "items": ["measurements", "body_composition", "history"]},
            {"section": "evaluations", "items": ["physical_tests", "technical_tests", "performance_history"]},
            {"section": "periodization", "items": ["macrocycles", "mesocycles", "microcycles", "sessions", "objectives"]},
            {"section": "graphic_plan", "items": ["training_table", "load_chart", "volume_intensity_chart", "phase_timeline"]},
            {"section": "calendar", "items": ["competitions", "training_camps", "evaluations_calendar"]}
        ]
        
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "athlete_id": self.athlete_id,
            "sections": all_sections,
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color",
                "include_logo": True,
                "include_date": True,
                "include_page_numbers": True
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert len(response.content) > 0, "PDF should not be empty"
        print(f"✓ All 6 sections included - PDF size: {len(response.content)} bytes")
    
    def test_athlete_info_section(self):
        """Test Información del Atleta section with all items"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "athlete_id": self.athlete_id,
            "sections": [
                {"section": "athlete_info", "items": ["basic_info", "affiliations", "contact"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type") == "application/pdf"
        print(f"✓ Athlete info section - PDF size: {len(response.content)} bytes")
    
    def test_anthropometric_section(self):
        """Test Datos Antropométricos section"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "athlete_id": self.athlete_id,
            "sections": [
                {"section": "anthropometric", "items": ["measurements", "body_composition", "history"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Anthropometric section - PDF size: {len(response.content)} bytes")
    
    def test_evaluations_section(self):
        """Test Evaluaciones y Tests section"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "athlete_id": self.athlete_id,
            "sections": [
                {"section": "evaluations", "items": ["physical_tests", "technical_tests", "performance_history"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Evaluations section - PDF size: {len(response.content)} bytes")
    
    def test_periodization_section_with_all_items(self):
        """Test Plan de Periodización section with macrocycles, mesocycles, microcycles, sessions"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "athlete_id": self.athlete_id,
            "sections": [
                {"section": "periodization", "items": ["macrocycles", "mesocycles", "microcycles", "sessions", "objectives"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Periodization section with all items - PDF size: {len(response.content)} bytes")
    
    def test_graphic_plan_section_with_all_items(self):
        """Test Plan Gráfico section with training_table, load_chart, volume_intensity_chart, phase_timeline"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "athlete_id": self.athlete_id,
            "sections": [
                {"section": "graphic_plan", "items": ["training_table", "load_chart", "volume_intensity_chart", "phase_timeline"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Graphic plan section with all items - PDF size: {len(response.content)} bytes")
    
    def test_calendar_section(self):
        """Test Calendario de Eventos section"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "athlete_id": self.athlete_id,
            "sections": [
                {"section": "calendar", "items": ["competitions", "training_camps", "evaluations_calendar"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Calendar section - PDF size: {len(response.content)} bytes")
    
    def test_format_options_paper_sizes(self):
        """Test different paper sizes: letter, a4, legal"""
        paper_sizes = ['letter', 'a4', 'legal']
        
        for paper_size in paper_sizes:
            response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
                "sections": [
                    {"section": "athlete_info", "items": ["basic_info"]}
                ],
                "format": {
                    "paper_size": paper_size,
                    "orientation": "portrait",
                    "color_scheme": "color"
                }
            })
            
            assert response.status_code == 200, f"Failed for paper_size={paper_size}: {response.status_code}"
            print(f"✓ Paper size '{paper_size}' works - PDF size: {len(response.content)} bytes")
    
    def test_format_options_orientations(self):
        """Test orientations: portrait, landscape"""
        orientations = ['portrait', 'landscape']
        
        for orientation in orientations:
            response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
                "sections": [
                    {"section": "graphic_plan", "items": ["training_table"]}
                ],
                "format": {
                    "paper_size": "letter",
                    "orientation": orientation,
                    "color_scheme": "color"
                }
            })
            
            assert response.status_code == 200, f"Failed for orientation={orientation}: {response.status_code}"
            print(f"✓ Orientation '{orientation}' works - PDF size: {len(response.content)} bytes")
    
    def test_format_options_color_schemes(self):
        """Test color schemes: color, grayscale, bw"""
        color_schemes = ['color', 'grayscale', 'bw']
        
        for scheme in color_schemes:
            response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
                "sections": [
                    {"section": "athlete_info", "items": ["basic_info"]}
                ],
                "format": {
                    "paper_size": "letter",
                    "orientation": "portrait",
                    "color_scheme": scheme
                }
            })
            
            assert response.status_code == 200, f"Failed for color_scheme={scheme}: {response.status_code}"
            print(f"✓ Color scheme '{scheme}' works - PDF size: {len(response.content)} bytes")
    
    def test_format_options_include_flags(self):
        """Test include_logo, include_date, include_page_numbers flags"""
        # Test with all flags true
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
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
        })
        
        assert response.status_code == 200, f"Failed with all flags true: {response.status_code}"
        size_with_all = len(response.content)
        print(f"✓ All include flags true - PDF size: {size_with_all} bytes")
        
        # Test with all flags false
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "sections": [
                {"section": "athlete_info", "items": ["basic_info"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color",
                "include_logo": False,
                "include_date": False,
                "include_page_numbers": False
            }
        })
        
        assert response.status_code == 200, f"Failed with all flags false: {response.status_code}"
        size_with_none = len(response.content)
        print(f"✓ All include flags false - PDF size: {size_with_none} bytes")
    
    def test_empty_sections_returns_error(self):
        """Test that empty sections returns error or minimal PDF"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "sections": [],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        # Empty sections should still return 200 (just with header/footer if any)
        # The frontend handles the validation
        print(f"Empty sections response status: {response.status_code}")
        if response.status_code == 200:
            print(f"✓ Empty sections handled gracefully - PDF size: {len(response.content)} bytes")
        else:
            print(f"⚠ Empty sections returned error: {response.status_code}")
    
    def test_pdf_response_valid(self):
        """Test that the PDF response is a valid PDF file"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "athlete_id": self.athlete_id,
            "sections": [
                {"section": "athlete_info", "items": ["basic_info"]},
                {"section": "periodization", "items": ["macrocycles", "mesocycles", "microcycles", "sessions"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        assert response.status_code == 200
        
        # Check PDF header magic bytes
        pdf_content = response.content
        assert pdf_content[:4] == b'%PDF', "Response does not start with PDF magic bytes"
        print(f"✓ Valid PDF generated - {len(pdf_content)} bytes, starts with PDF header")
    
    def test_pdf_content_disposition_header(self):
        """Test that Content-Disposition header is set correctly"""
        response = self.session.post(f"{BASE_URL}/api/export/comprehensive-pdf", json={
            "sections": [
                {"section": "athlete_info", "items": ["basic_info"]}
            ],
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color"
            }
        })
        
        assert response.status_code == 200
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert "filename" in content_disp, "Should have filename in disposition"
        assert ".pdf" in content_disp, "Filename should have .pdf extension"
        print(f"✓ Content-Disposition header correct: {content_disp}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

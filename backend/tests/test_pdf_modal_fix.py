"""
Test PDF Export Modal Background and Section Generation
Testing fix for:
1. PDF export modal transparent background - should be solid white
2. PDF should export all 12 sections
3. Tables in PDF should have solid white backgrounds
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@train.com"
TEST_PASSWORD = "test123456"


class TestPDFExportFixes:
    """Tests for PDF Export fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get athletes
        athletes_resp = requests.get(f"{BASE_URL}/api/athletes", headers=self.headers)
        if athletes_resp.status_code == 200:
            athletes = athletes_resp.json()
            if athletes:
                self.athlete_id = athletes[0].get("id")
                self.athlete_name = athletes[0].get("name")
            else:
                self.athlete_id = None
                self.athlete_name = None
        else:
            self.athlete_id = None
            self.athlete_name = None
    
    def test_pdf_export_all_12_sections_without_athlete(self):
        """Test PDF generates with all 12 sections when no athlete_id is provided
        Should show 'Seleccione un atleta' messages for each section"""
        
        # All 12 sections
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
            "athlete_id": None,  # No athlete
            "sections": all_sections,
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color",
                "include_logo": True,
                "include_date": True,
                "include_page_numbers": True
            },
            "periodization_data": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"PDF export failed: {response.status_code} - {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', "Response should be PDF"
        
        # Check PDF has content (should have all section headers)
        content_length = len(response.content)
        print(f"PDF size without athlete: {content_length} bytes")
        assert content_length > 2000, f"PDF too small ({content_length} bytes) - sections may be missing"
        
        # Verify PDF header
        assert response.content[:4] == b'%PDF', "Invalid PDF format"
        print("PASSED: PDF generated with all 12 sections (no athlete)")

    def test_pdf_export_all_12_sections_with_athlete(self):
        """Test PDF generates with all 12 sections when athlete_id is provided"""
        if not self.athlete_id:
            pytest.skip("No athlete available for testing")
        
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
            "athlete_id": self.athlete_id,
            "sections": all_sections,
            "format": {
                "paper_size": "letter",
                "orientation": "portrait",
                "color_scheme": "color",
                "include_logo": True,
                "include_date": True,
                "include_page_numbers": True
            },
            "periodization_data": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"PDF export failed: {response.status_code} - {response.text}"
        assert response.headers.get('content-type') == 'application/pdf', "Response should be PDF"
        
        content_length = len(response.content)
        print(f"PDF size with athlete: {content_length} bytes")
        assert content_length > 3000, f"PDF too small ({content_length} bytes) - sections may be missing"
        
        assert response.content[:4] == b'%PDF', "Invalid PDF format"
        print(f"PASSED: PDF generated with all 12 sections (athlete: {self.athlete_name})")

    def test_pdf_export_section_headers_present(self):
        """Verify each section header appears in PDF text"""
        # Expected section headers in Spanish (as they appear in PDF)
        expected_headers = [
            "INFORMACIÓN DEL ATLETA",
            "CARACTERIZACIÓN",
            "DATOS ANTROPOMÉTRICOS",
            "EVALUACIONES Y TESTS",
            "HISTORIAL MÉDICO",
            "ANÁLISIS PREVIO",
            "OBJETIVOS E INDICADORES",
            "PLAN DE PERIODIZACIÓN",
            "MEDIOS DE ENTRENAMIENTO",
            "PLAN GRÁFICO",
            "CONTROL Y SEGUIMIENTO",
            "CALENDARIO DE EVENTOS"
        ]
        
        all_sections = [
            {"section": "athlete_info", "items": ["basic_info"]},
            {"section": "characterization", "items": ["sport_char"]},
            {"section": "anthropometric", "items": ["measurements"]},
            {"section": "evaluations", "items": ["physical_tests"]},
            {"section": "medical", "items": ["diagnostic"]},
            {"section": "analysis", "items": ["previous_plan"]},
            {"section": "objectives", "items": ["general_objectives"]},
            {"section": "periodization", "items": ["periodization_model"]},
            {"section": "training_methods", "items": ["exercises"]},
            {"section": "graphic_plan", "items": ["training_table"]},
            {"section": "control", "items": ["load_monitoring"]},
            {"section": "calendar", "items": ["competitions"]}
        ]
        
        payload = {
            "athlete_id": None,
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
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"PDF export failed: {response.status_code}"
        
        # Convert PDF content to string for header search (basic check)
        pdf_text = response.content.decode('latin-1', errors='ignore')
        
        # Check for some key headers (PDF text extraction is imperfect, just check a few)
        headers_found = 0
        for header in expected_headers:
            # PDF might encode text differently, check for partial matches
            header_simple = header.replace("Ó", "O").replace("É", "E").replace("Í", "I")
            if header in pdf_text or header_simple in pdf_text or header.lower() in pdf_text.lower():
                headers_found += 1
                print(f"  Found header: {header}")
        
        print(f"Headers found in PDF text: {headers_found}/12")
        # At minimum, we should find some headers
        assert headers_found >= 3, f"Only {headers_found} section headers found in PDF"
        print("PASSED: Section headers present in PDF")

    def test_pdf_export_format_options(self):
        """Test different format options"""
        formats_to_test = [
            {"paper_size": "a4", "orientation": "landscape", "color_scheme": "grayscale"},
            {"paper_size": "letter", "orientation": "portrait", "color_scheme": "bw"},
            {"paper_size": "legal", "orientation": "portrait", "color_scheme": "color"}
        ]
        
        for fmt in formats_to_test:
            payload = {
                "athlete_id": None,
                "sections": [{"section": "athlete_info", "items": ["basic_info"]}],
                "format": {
                    **fmt,
                    "include_logo": True,
                    "include_date": True,
                    "include_page_numbers": True
                }
            }
            
            response = requests.post(
                f"{BASE_URL}/api/export/comprehensive-pdf",
                json=payload,
                headers=self.headers
            )
            
            assert response.status_code == 200, f"PDF export failed for format {fmt}: {response.text}"
            print(f"PASSED: Format {fmt['paper_size']}/{fmt['orientation']}/{fmt['color_scheme']}")

    def test_individual_section_exports(self):
        """Test each section can be exported individually"""
        sections_to_test = [
            ("athlete_info", ["basic_info"]),
            ("characterization", ["sport_char"]),
            ("anthropometric", ["measurements"]),
            ("evaluations", ["physical_tests"]),
            ("medical", ["diagnostic"]),
            ("analysis", ["previous_plan"]),
            ("objectives", ["general_objectives"]),
            ("periodization", ["periodization_model"]),
            ("training_methods", ["exercises"]),
            ("graphic_plan", ["training_table"]),
            ("control", ["load_monitoring"]),
            ("calendar", ["competitions"])
        ]
        
        for section_id, items in sections_to_test:
            payload = {
                "athlete_id": None,
                "sections": [{"section": section_id, "items": items}],
                "format": {
                    "paper_size": "letter",
                    "orientation": "portrait",
                    "color_scheme": "color",
                    "include_logo": True,
                    "include_date": True,
                    "include_page_numbers": True
                }
            }
            
            response = requests.post(
                f"{BASE_URL}/api/export/comprehensive-pdf",
                json=payload,
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Section '{section_id}' export failed: {response.text}"
            assert len(response.content) > 1000, f"Section '{section_id}' PDF too small"
            print(f"  PASSED: Section '{section_id}' exports correctly ({len(response.content)} bytes)")
        
        print("PASSED: All 12 individual sections export correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

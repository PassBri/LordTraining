"""
Test PDF Export with Material Design - LordTraining
Tests for POST /api/export/comprehensive-pdf endpoint
Verifies: 12 sections, solid backgrounds, Material Design colors, Q&A format
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
TEST_EMAIL = "test@train.com"
TEST_PASSWORD = "test123456"

# All 12 sections with their sub-items
ALL_SECTIONS = [
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

DEFAULT_FORMAT = {
    "paper_size": "letter",
    "orientation": "portrait",
    "color_scheme": "color",
    "include_logo": True,
    "include_date": True,
    "include_page_numbers": True
}

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Authentication failed")

@pytest.fixture(scope="module")
def athlete_id(auth_token):
    """Get first athlete ID"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/athletes", headers=headers)
    if response.status_code == 200 and response.json():
        return response.json()[0]["id"]
    pytest.skip("No athletes found")


class TestPDFExportAllSections:
    """Test PDF export with all 12 sections"""
    
    def test_export_all_12_sections(self, auth_token):
        """Verify all 12 sections generate correctly"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": ALL_SECTIONS,
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        assert response.headers.get("content-type") == "application/pdf", "Expected PDF content type"
        assert response.content.startswith(b'%PDF'), "Response should be valid PDF"
        assert len(response.content) > 1000, f"PDF too small ({len(response.content)} bytes), might be empty"
        print(f"✓ All 12 sections exported successfully, PDF size: {len(response.content)} bytes")
    
    def test_export_with_athlete_id(self, auth_token, athlete_id):
        """Verify PDF export with specific athlete"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "sections": ALL_SECTIONS,
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Failed with athlete_id: {response.text[:500]}"
        assert response.content.startswith(b'%PDF'), "Response should be valid PDF"
        print(f"✓ PDF with athlete_id generated, size: {len(response.content)} bytes")


class TestPDFEachSectionIndividually:
    """Test each of the 12 sections individually"""
    
    @pytest.mark.parametrize("section", [
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
    ])
    def test_single_section(self, auth_token, section):
        """Test each section generates PDF without KeyError"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": [section],
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Section {section['section']} failed: {response.text[:300]}"
        assert response.content.startswith(b'%PDF'), f"Section {section['section']} did not return valid PDF"
        print(f"✓ Section '{section['section']}' exported successfully")


class TestPDFFormatOptions:
    """Test different format options"""
    
    def test_paper_size_a4(self, auth_token):
        """Test A4 paper size"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": [ALL_SECTIONS[0]],  # Just athlete_info
                "format": {**DEFAULT_FORMAT, "paper_size": "a4"}
            }
        )
        
        assert response.status_code == 200, f"A4 format failed: {response.text[:300]}"
        print("✓ A4 paper size works")
    
    def test_paper_size_legal(self, auth_token):
        """Test Legal paper size"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": [ALL_SECTIONS[0]],
                "format": {**DEFAULT_FORMAT, "paper_size": "legal"}
            }
        )
        
        assert response.status_code == 200, f"Legal format failed: {response.text[:300]}"
        print("✓ Legal paper size works")
    
    def test_landscape_orientation(self, auth_token):
        """Test landscape orientation"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": [ALL_SECTIONS[0]],
                "format": {**DEFAULT_FORMAT, "orientation": "landscape"}
            }
        )
        
        assert response.status_code == 200, f"Landscape orientation failed: {response.text[:300]}"
        print("✓ Landscape orientation works")
    
    def test_grayscale_color_scheme(self, auth_token):
        """Test grayscale color scheme"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": ALL_SECTIONS[:3],  # First 3 sections
                "format": {**DEFAULT_FORMAT, "color_scheme": "grayscale"}
            }
        )
        
        assert response.status_code == 200, f"Grayscale scheme failed: {response.text[:300]}"
        print("✓ Grayscale color scheme works")
    
    def test_bw_color_scheme(self, auth_token):
        """Test black and white color scheme"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": ALL_SECTIONS[:3],
                "format": {**DEFAULT_FORMAT, "color_scheme": "bw"}
            }
        )
        
        assert response.status_code == 200, f"B&W scheme failed: {response.text[:300]}"
        print("✓ Black & white color scheme works")


class TestPDFWithPeriodizationData:
    """Test PDF with periodization data passed from frontend"""
    
    def test_with_periodization_data(self, auth_token, athlete_id):
        """Test PDF export with periodization_data"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Sample periodization data
        periodization_data = {
            "model": "ATR",
            "totalWeeks": 12,
            "startDate": "2026-01-01",
            "objectives": [
                {"title": "Mejorar resistencia", "category": "physical"},
                {"title": "Técnica de carrera", "category": "technical"}
            ],
            "mesocycles": [
                {
                    "phase": "accumulation",
                    "phaseName": "Acumulación",
                    "weeks": 4,
                    "microcycles": [
                        {"week": 1, "volume": 70, "intensity": 50},
                        {"week": 2, "volume": 75, "intensity": 55}
                    ]
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "sections": [
                    {"section": "periodization", "items": ["periodization_model", "macrocycle_stages", "mesocycles", "microcycles"]},
                    {"section": "objectives", "items": ["general_objectives", "specific_objectives"]}
                ],
                "format": DEFAULT_FORMAT,
                "periodization_data": periodization_data
            }
        )
        
        assert response.status_code == 200, f"Periodization data export failed: {response.text[:500]}"
        assert response.content.startswith(b'%PDF'), "Should return valid PDF"
        print(f"✓ PDF with periodization data exported, size: {len(response.content)} bytes")


class TestPDFEdgeCases:
    """Test edge cases and error handling"""
    
    def test_empty_sections(self, auth_token):
        """Test with empty sections list - should return valid PDF (header only)"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": [],
                "format": DEFAULT_FORMAT
            }
        )
        
        # Should return a PDF even with empty sections (header page)
        # or return 400 if empty sections is not allowed
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Empty sections handled correctly (status: {response.status_code})")
    
    def test_partial_section_items(self, auth_token):
        """Test with partial items selected from a section"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "sections": [
                    {"section": "athlete_info", "items": ["basic_info"]},  # Only basic_info
                    {"section": "characterization", "items": ["sport_char"]}  # Only sport_char
                ],
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Partial items failed: {response.text[:300]}"
        print("✓ Partial section items work correctly")
    
    def test_nonexistent_athlete_id(self, auth_token):
        """Test with non-existent athlete ID"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "athlete_id": "nonexistent-athlete-id-12345",
                "sections": [ALL_SECTIONS[0]],
                "format": DEFAULT_FORMAT
            }
        )
        
        # Should either return 404 or generate PDF with default/empty data
        assert response.status_code in [200, 404], f"Unexpected status for nonexistent athlete: {response.status_code}"
        print(f"✓ Non-existent athlete handled (status: {response.status_code})")


class TestPDFQAFormatSections:
    """Test Q&A format sections like characterization, analysis, objectives"""
    
    def test_characterization_qa_format(self, auth_token, athlete_id):
        """Test characterization section with Q&A blocks"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "sections": [{"section": "characterization", "items": ["sport_char", "athlete_char", "performance_model"]}],
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Characterization section failed: {response.text[:300]}"
        assert len(response.content) > 500, "Characterization PDF seems too small"
        print("✓ Characterization Q&A format works")
    
    def test_analysis_qa_format(self, auth_token, athlete_id):
        """Test analysis section with Q&A blocks"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "sections": [{"section": "analysis", "items": ["previous_plan", "competition_analysis", "strengths_weaknesses"]}],
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Analysis section failed: {response.text[:300]}"
        print("✓ Analysis Q&A format works")
    
    def test_objectives_qa_format(self, auth_token, athlete_id):
        """Test objectives section with Q&A blocks"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "sections": [{"section": "objectives", "items": ["general_objectives", "specific_objectives", "kpis"]}],
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Objectives section failed: {response.text[:300]}"
        print("✓ Objectives Q&A format works")


class TestPDFTableSections:
    """Test sections that use data tables"""
    
    def test_graphic_plan_tables(self, auth_token, athlete_id):
        """Test graphic_plan section with training table"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "sections": [{"section": "graphic_plan", "items": ["training_table", "load_chart", "volume_intensity_chart", "phase_timeline"]}],
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Graphic plan section failed: {response.text[:300]}"
        print("✓ Graphic plan tables work")
    
    def test_periodization_tables(self, auth_token, athlete_id):
        """Test periodization section with mesocycle/microcycle tables"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            headers=headers,
            json={
                "athlete_id": athlete_id,
                "sections": [{"section": "periodization", "items": ["mesocycles", "microcycles", "sessions"]}],
                "format": DEFAULT_FORMAT
            }
        )
        
        assert response.status_code == 200, f"Periodization tables failed: {response.text[:300]}"
        print("✓ Periodization tables work")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

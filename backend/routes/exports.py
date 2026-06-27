"""Exportación PDF (legacy): plan por macrociclo, reporte comprehensivo y sesión.
Extraído de server.py — FASE 1 segmentación. Sin cambios de comportamiento."""
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
from io import BytesIO
from pydantic import BaseModel
import logging

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

from core.auth import get_db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["PDF Export (legacy)"])


# =============== PDF EXPORT ===============
@router.get("/export/plan/{macrocycle_id}/pdf")
async def export_plan_pdf(macrocycle_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    macro = await db.macrocycles.find_one({"id": macrocycle_id, "coach_id": user["id"]}, {"_id": 0})
    if not macro:
        raise HTTPException(status_code=404, detail="Macrocycle not found")
    
    athlete = await db.athletes.find_one({"id": macro["athlete_id"]}, {"_id": 0})
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFillColor(HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "LORDTRAINING")
    
    c.setFont("Helvetica", 12)
    c.setFillColor(HexColor("#64748b"))
    c.drawString(50, height - 70, "Plan de Entrenamiento")
    
    # Macrocycle info
    y = height - 120
    c.setFillColor(HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, macro["name"])
    
    y -= 25
    c.setFont("Helvetica", 11)
    c.setFillColor(HexColor("#475569"))
    c.drawString(50, y, f"Atleta: {athlete['name'] if athlete else 'N/A'}")
    y -= 18
    c.drawString(50, y, f"Deporte: {macro['sport']}")
    y -= 18
    c.drawString(50, y, f"Modelo: {macro['planning_model']}")
    y -= 18
    c.drawString(50, y, f"Período: {macro['start_date']} - {macro['end_date']}")
    y -= 18
    if macro.get("objective"):
        c.drawString(50, y, f"Objetivo: {macro['objective']}")
    
    # Get mesocycles
    mesos = await db.mesocycles.find({"macrocycle_id": macrocycle_id}, {"_id": 0}).to_list(100)
    
    y -= 40
    for meso in mesos:
        if y < 100:
            c.showPage()
            y = height - 50
        
        c.setFillColor(HexColor("#007AFF"))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, f"Mesociclo: {meso['name']}")
        y -= 20
        
        c.setFont("Helvetica", 10)
        c.setFillColor(HexColor("#475569"))
        c.drawString(60, y, f"Fase: {meso['phase']} | {meso['start_date']} - {meso['end_date']}")
        y -= 15
        if meso.get("objective"):
            c.drawString(60, y, f"Objetivo: {meso['objective']}")
            y -= 20
        else:
            y -= 5
        
        micros = await db.microcycles.find({"mesocycle_id": meso["id"]}, {"_id": 0}).to_list(100)
        for micro in micros:
            if y < 100:
                c.showPage()
                y = height - 50
            
            c.setFillColor(HexColor("#0f172a"))
            c.setFont("Helvetica-Bold", 11)
            c.drawString(70, y, f"Microciclo: {micro['name']}")
            y -= 15
            
            sessions = await db.sessions.find({"microcycle_id": micro["id"]}, {"_id": 0}).to_list(100)
            for session in sessions:
                if y < 80:
                    c.showPage()
                    y = height - 50
                
                c.setFont("Helvetica", 9)
                c.setFillColor(HexColor("#64748b"))
                session_text = f"  {session['date']} - {session['session_type']} | {session['duration_minutes']}min | Intensidad: {session['intensity']} | Carga: {session['load']}"
                c.drawString(80, y, session_text)
                y -= 12
            y -= 10
        y -= 15
    
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#94a3b8"))
    c.drawString(50, 30, f"Generado por LordTraining - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=plan_{macro['name'].replace(' ', '_')}.pdf"}
    )

# =============== COMPREHENSIVE PDF EXPORT ===============
class ComprehensivePDFSection(BaseModel):
    section: str
    items: List[str]

class ComprehensivePDFFormat(BaseModel):
    paper_size: str = "letter"
    orientation: str = "portrait"
    color_scheme: str = "color"
    include_logo: bool = True
    include_date: bool = True
    include_page_numbers: bool = True

class ComprehensivePDFRequest(BaseModel):
    athlete_id: Optional[str] = None
    sections: List[ComprehensivePDFSection]
    format: ComprehensivePDFFormat
    periodization_data: Optional[dict] = None

@router.post("/export/comprehensive-pdf")
async def export_comprehensive_pdf(request: ComprehensivePDFRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Exporta un reporte PDF completo y personalizable con diseño Material Design"""
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4, legal, landscape
    from reportlab.lib.enums import TA_CENTER
    import io
    
    # Determine page size
    page_sizes = {
        'letter': letter,
        'a4': A4,
        'legal': legal
    }
    page_size = page_sizes.get(request.format.paper_size, letter)
    page_width = page_size[0] - 1.5*inch  # Available width
    
    if request.format.orientation == 'landscape':
        page_size = landscape(page_size)
        page_width = page_size[0] - 1.5*inch
    
    # Material Design Color Palette
    SECTION_COLORS = {
        'athlete_info': {'primary': '#1976D2', 'light': '#E3F2FD', 'dark': '#0D47A1'},
        'characterization': {'primary': '#7B1FA2', 'light': '#F3E5F5', 'dark': '#4A148C'},
        'anthropometric': {'primary': '#388E3C', 'light': '#E8F5E9', 'dark': '#1B5E20'},
        'evaluations': {'primary': '#F57C00', 'light': '#FFF3E0', 'dark': '#E65100'},
        'medical': {'primary': '#D32F2F', 'light': '#FFEBEE', 'dark': '#B71C1C'},
        'analysis': {'primary': '#00796B', 'light': '#E0F2F1', 'dark': '#004D40'},
        'objectives': {'primary': '#512DA8', 'light': '#EDE7F6', 'dark': '#311B92'},
        'periodization': {'primary': '#303F9F', 'light': '#E8EAF6', 'dark': '#1A237E'},
        'training_methods': {'primary': '#C2185B', 'light': '#FCE4EC', 'dark': '#880E4F'},
        'graphic_plan': {'primary': '#0097A7', 'light': '#E0F7FA', 'dark': '#006064'},
        'control': {'primary': '#455A64', 'light': '#ECEFF1', 'dark': '#263238'},
        'calendar': {'primary': '#FFA000', 'light': '#FFF8E1', 'dark': '#FF6F00'},
    }
    
    # Color scheme handling
    use_colors = request.format.color_scheme == 'color'
    if request.format.color_scheme == 'grayscale':
        primary_color = colors.HexColor('#374151')
        bg_color = colors.HexColor('#F3F4F6')
    elif request.format.color_scheme == 'bw':
        primary_color = colors.black
        bg_color = colors.white
    else:
        primary_color = colors.HexColor('#1976D2')
        bg_color = colors.HexColor('#F5F5F5')
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=page_size, topMargin=0.6*inch, bottomMargin=0.6*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)
    
    # Styles
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='MainTitle',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=6,
        textColor=colors.HexColor('#1976D2') if use_colors else colors.black,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        name='Subtitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=20,
        textColor=colors.HexColor('#616161'),
        alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=12,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        leftIndent=10,
        rightIndent=10
    ))
    styles.add(ParagraphStyle(
        name='SubSectionTitle',
        parent=styles['Heading3'],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=6,
        textColor=colors.HexColor('#424242'),
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='QuestionText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1976D2') if use_colors else colors.HexColor('#424242'),
        fontName='Helvetica-Bold',
        spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        name='AnswerText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#212121'),
        spaceAfter=10,
        leftIndent=10
    ))
    styles.add(ParagraphStyle(
        name='NoDataText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#9E9E9E'),
        fontStyle='italic',
        spaceAfter=10,
        leftIndent=10
    ))
    styles.add(ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        name='TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#212121')
    ))
    
    def get_section_color(section_id):
        """Get color for section based on Material Design palette"""
        if not use_colors:
            return colors.HexColor('#424242')
        return colors.HexColor(SECTION_COLORS.get(section_id, {'primary': '#607D8B'})['primary'])
    
    def get_section_bg(section_id):
        """Get light background color for section"""
        if not use_colors:
            return colors.HexColor('#F5F5F5')
        return colors.HexColor(SECTION_COLORS.get(section_id, {'light': '#ECEFF1'})['light'])
    
    def create_section_header(title, section_id):
        """Create a colored section header"""
        color = get_section_color(section_id)
        header_data = [[Paragraph(title, styles['SectionHeader'])]]
        header_table = Table(header_data, colWidths=[page_width])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), color),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))
        return header_table
    
    def create_qa_block(question, answer, section_id=None):
        """Create a question-answer block with Material Design styling"""
        if not answer or answer == 'N/A' or answer.strip() == '':
            answer_para = Paragraph("Sin información registrada", styles['NoDataText'])
        else:
            answer_para = Paragraph(str(answer), styles['AnswerText'])
        return [
            Paragraph(f"▸ {question}", styles['QuestionText']),
            answer_para
        ]
    
    def create_data_table(headers, rows, section_id):
        """Create a styled data table with Material Design colors"""
        color = get_section_color(section_id)
        light_bg = get_section_bg(section_id)
        
        # Create header row with Paragraph objects
        header_row = [Paragraph(h, styles['TableHeader']) for h in headers]
        data = [header_row] + rows
        
        col_widths = [page_width / len(headers)] * len(headers)
        table = Table(data, colWidths=col_widths)
        
        style_commands = [
            ('BACKGROUND', (0, 0), (-1, 0), color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
        ]
        
        # Alternate row colors
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_commands.append(('BACKGROUND', (0, i), (-1, i), light_bg))
        
        table.setStyle(TableStyle(style_commands))
        return table
    
    elements = []
    
    # Header with Material Design styling
    if request.format.include_logo:
        # Create header card
        header_data = [[
            Paragraph("LordTraining", styles['MainTitle']),
        ], [
            Paragraph("Sistema de Planificación Deportiva", styles['Subtitle'])
        ]]
        header_table = Table(header_data, colWidths=[page_width])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E0E0E0')),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.2*inch))
    
    if request.format.include_date:
        date_str = datetime.now().strftime("%d de %B de %Y")
        elements.append(Paragraph(f"Reporte generado el {date_str}", styles['Subtitle']))
        elements.append(Spacer(1, 0.2*inch))
    
    # Load athlete data if provided
    athlete = None
    if request.athlete_id:
        athlete = await db.athletes.find_one({"id": request.athlete_id, "coach_id": user["id"]}, {"_id": 0})
    
    # Process each section
    for section_config in request.sections:
        section_id = section_config.section
        items = section_config.items
        
        # ===== ATHLETE INFO =====
        if section_id == 'athlete_info':
            elements.append(create_section_header("INFORMACIÓN DEL ATLETA", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if athlete:
                if 'basic_info' in items:
                    elements.append(Paragraph("Datos Básicos del Deportista", styles['SubSectionTitle']))
                    elements.extend(create_qa_block("Nombre completo", athlete.get('name', ''), section_id))
                    elements.extend(create_qa_block("Deporte que practica", athlete.get('sport', '').capitalize() if athlete.get('sport') else '', section_id))
                    elements.extend(create_qa_block("Edad", f"{athlete.get('age', '')} años" if athlete.get('age') else '', section_id))
                    elements.extend(create_qa_block("Nivel competitivo", athlete.get('level', '').capitalize() if athlete.get('level') else '', section_id))
                    if athlete.get('email'):
                        elements.extend(create_qa_block("Email de contacto", athlete.get('email', ''), section_id))
                    elements.append(Spacer(1, 0.1*inch))
            
                if 'affiliations' in items:
                    elements.append(Paragraph("Afiliaciones a Entidades", styles['SubSectionTitle']))
                    affiliations = athlete.get('affiliations', []) if athlete else []
                    if affiliations:
                        entity_names = []
                        for aff_id in affiliations:
                            entity = await db.entities.find_one({"id": aff_id}, {"_id": 0, "name": 1, "entity_type": 1})
                            if entity:
                                entity_names.append(f"{entity.get('name')} ({entity.get('entity_type', '').capitalize()})")
                        if entity_names:
                            for name in entity_names:
                                elements.append(Paragraph(f"• {name}", styles['AnswerText']))
                        else:
                            elements.append(Paragraph("Sin afiliaciones registradas", styles['NoDataText']))
                    else:
                        elements.append(Paragraph("Sin afiliaciones registradas", styles['NoDataText']))
                    elements.append(Spacer(1, 0.1*inch))
            else:
                # No athlete selected
                elements.append(Paragraph("Seleccione un atleta para ver sus datos", styles['NoDataText']))
                elements.append(Spacer(1, 0.2*inch))
        
        # ===== CHARACTERIZATION =====
        elif section_id == 'characterization':
            elements.append(create_section_header("CARACTERIZACIÓN", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver la caracterización", styles['NoDataText']))
                elements.append(Spacer(1, 0.2*inch))
            else:
                if 'sport_char' in items:
                    sport_char = await db.sport_characterizations.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ) or {}  # Use empty dict if no data
                    elements.append(Paragraph("1. Caracterización del Deporte", styles['SubSectionTitle']))
                    # Always show all questions, even without data
                    elements.extend(create_qa_block("Nombre del deporte o actividad física", sport_char.get('sportName', ''), section_id))
                    elements.extend(create_qa_block("Descripción general", sport_char.get('description', ''), section_id))
                    elements.extend(create_qa_block("Organización de los movimientos", sport_char.get('movementOrganization', ''), section_id))
                    elements.extend(create_qa_block("Sistema energético predominante", sport_char.get('predominantEnergy', ''), section_id))
                    elements.extend(create_qa_block("Sistema energético determinante", sport_char.get('determinantEnergy', ''), section_id))
                    elements.extend(create_qa_block("Tipos de fibras musculares predominantes", sport_char.get('muscularFibers', ''), section_id))
                    elements.extend(create_qa_block("Sustrato energético utilizado", sport_char.get('energySubstrate', ''), section_id))
                    elements.extend(create_qa_block("Cualidades motrices generales", sport_char.get('generalMotor', ''), section_id))
                    elements.extend(create_qa_block("Cualidades motrices especiales", sport_char.get('specialMotor', ''), section_id))
                    elements.extend(create_qa_block("Tipo de esfuerzo predominante", sport_char.get('effortType', ''), section_id))
                    elements.extend(create_qa_block("Observaciones adicionales", sport_char.get('observation', ''), section_id))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'athlete_char' in items:
                    athlete_char = await db.athlete_characterizations.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ) or {}  # Use empty dict if no data
                    elements.append(Paragraph("2. Caracterización del Deportista", styles['SubSectionTitle']))
                    # Always show all questions
                    # Información General
                    elements.append(Paragraph("Información General", styles['QuestionText']))
                    elements.extend(create_qa_block("Nombre del deportista", athlete_char.get('name', ''), section_id))
                    elements.extend(create_qa_block("Edad", athlete_char.get('age', ''), section_id))
                    elements.extend(create_qa_block("Años de experiencia", athlete_char.get('experience', ''), section_id))
                    elements.extend(create_qa_block("Posición o especialidad", athlete_char.get('position', ''), section_id))
                    elements.extend(create_qa_block("Nivel competitivo", athlete_char.get('level', ''), section_id))
                    elements.extend(create_qa_block("Observaciones generales", athlete_char.get('observation', ''), section_id))
                    
                    # Aspectos Biológicos
                    elements.append(Paragraph("Aspectos Biológicos y Hereditarios", styles['QuestionText']))
                    elements.extend(create_qa_block("Herencia genética", athlete_char.get('inheritance', ''), section_id))
                    elements.extend(create_qa_block("Edad biológica vs cronológica", athlete_char.get('biologicalAge', ''), section_id))
                    elements.extend(create_qa_block("Edad óptima de selección", athlete_char.get('optimalSelectionAge', ''), section_id))
                    
                    # Estado de Salud
                    elements.append(Paragraph("Estado de Salud y Condición Física", styles['QuestionText']))
                    elements.extend(create_qa_block("Estado de salud general", athlete_char.get('healthStatus', ''), section_id))
                    elements.extend(create_qa_block("Parámetros antropométricos", athlete_char.get('anthropometricParams', ''), section_id))
                    elements.extend(create_qa_block("Desarrollo de cualidades físicas y coordinativas", athlete_char.get('physicalQualities', ''), section_id))
                    
                    # Aspectos Psicológicos
                    elements.append(Paragraph("Aspectos Psicológicos y Cognitivos", styles['QuestionText']))
                    elements.extend(create_qa_block("Características psicológicas", athlete_char.get('psychologicalCharacteristics', ''), section_id))
                    elements.extend(create_qa_block("Capacidades cognitivas", athlete_char.get('cognitiveCapabilities', ''), section_id))
                    
                    # Entorno Socioeconómico
                    elements.append(Paragraph("Entorno Socioeconómico", styles['QuestionText']))
                    elements.extend(create_qa_block("Características socio-económicas", athlete_char.get('socioeconomicCharacteristics', ''), section_id))
                    elements.extend(create_qa_block("Conocimiento de su entorno", athlete_char.get('environment', ''), section_id))
                    
                    # Nutrición
                    elements.extend(create_qa_block("Estado nutricional del deportista", athlete_char.get('nutritionalStatus', ''), section_id))
                    
                    # Trayectoria
                    elements.append(Paragraph("Trayectoria Deportiva", styles['QuestionText']))
                    elements.extend(create_qa_block("Trayectoria deportiva", athlete_char.get('sportsTrajectory', ''), section_id))
                    elements.extend(create_qa_block("Experiencia en otros deportes", athlete_char.get('otherSportsExperience', ''), section_id))
                    
                    # Rendimiento
                    elements.append(Paragraph("Rendimiento y Objetivos", styles['QuestionText']))
                    elements.extend(create_qa_block("¿Cuál fue su rendimiento en la temporada anterior?", athlete_char.get('previousSeasonPerformance', ''), section_id))
                    elements.extend(create_qa_block("¿Qué objetivos se plantearon y qué porcentaje se cumplió?", athlete_char.get('objectives', ''), section_id))
                    
                    # Entrenamiento
                    elements.append(Paragraph("Entrenamiento y Forma Actual", styles['QuestionText']))
                    elements.extend(create_qa_block("Niveles de entrenamiento realizados", athlete_char.get('trainingLevels', ''), section_id))
                    elements.extend(create_qa_block("¿Cuál es su forma actual?", athlete_char.get('currentForm', ''), section_id))
                    
                    # Lesiones
                    elements.extend(create_qa_block("Historial de lesiones", athlete_char.get('injuries', ''), section_id))
                elements.append(Spacer(1, 0.2*inch))
        
        # ===== ANTHROPOMETRIC DATA =====
        elif section_id == 'anthropometric':
            elements.append(create_section_header("DATOS ANTROPOMÉTRICOS", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver datos antropométricos", styles['NoDataText']))
            else:
                anthro_data = await db.anthropometric_data.find_one(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                )
                
                if anthro_data and anthro_data.get('records'):
                    latest = anthro_data['records'][-1] if anthro_data.get('records') else {}
                    measurements = latest.get('measurements', {})
                    
                    if 'measurements' in items and measurements:
                        elements.append(Paragraph("Mediciones Antropométricas Actuales", styles['SubSectionTitle']))
                        elements.extend(create_qa_block("Peso corporal", f"{measurements.get('weight', '')} kg" if measurements.get('weight') else '', section_id))
                        elements.extend(create_qa_block("Talla / Estatura", f"{measurements.get('height', '')} cm" if measurements.get('height') else '', section_id))
                        elements.extend(create_qa_block("Índice de Masa Corporal (IMC)", str(measurements.get('bmi', '')) if measurements.get('bmi') else '', section_id))
                        if measurements.get('body_fat'):
                            elements.extend(create_qa_block("Porcentaje de grasa corporal", f"{measurements.get('body_fat', '')}%", section_id))
                        if measurements.get('muscle_mass'):
                            elements.extend(create_qa_block("Masa muscular", f"{measurements.get('muscle_mass', '')} kg", section_id))
                else:
                    elements.append(Paragraph("Sin datos antropométricos registrados", styles['NoDataText']))
            
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== EVALUATIONS =====
        elif section_id == 'evaluations':
            elements.append(create_section_header("EVALUACIONES Y TESTS", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver evaluaciones", styles['NoDataText']))
            else:
                test_data = await db.tests.find_one(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                )
                
                if test_data and test_data.get('tests'):
                    tests = test_data['tests'][-10:]  # Last 10 tests
                    
                    if 'physical_tests' in items:
                        elements.append(Paragraph("Tests Físicos Recientes", styles['SubSectionTitle']))
                        table = create_data_table(
                            ['Fecha', 'Nombre del Test', 'Resultado', 'Notas'],
                            [[
                                test.get('date', 'N/A')[:10] if test.get('date') else 'N/A',
                                test.get('name', 'N/A'),
                                str(test.get('result', 'N/A')),
                                test.get('notes', '-')[:30] if test.get('notes') else '-'
                            ] for test in tests],
                            section_id
                        )
                        elements.append(table)
                        elements.append(Spacer(1, 0.15*inch))
                else:
                    elements.append(Paragraph("Sin evaluaciones registradas", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== MEDICAL HISTORY =====
        elif section_id == 'medical':
            elements.append(create_section_header("HISTORIAL MÉDICO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver historial médico", styles['NoDataText']))
            else:
                if 'diagnostic' in items:
                    elements.append(Paragraph("Diagnóstico General", styles['SubSectionTitle']))
                    diagnostic = await db.diagnostics.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    )
                    if diagnostic:
                        elements.extend(create_qa_block("Estado general de salud", diagnostic.get('general_status', ''), section_id))
                        elements.extend(create_qa_block("Observaciones médicas", diagnostic.get('observations', ''), section_id))
                    else:
                        elements.append(Paragraph("Sin diagnóstico registrado", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'injuries' in items:
                    elements.append(Paragraph("Historial de Lesiones", styles['SubSectionTitle']))
                    injuries = await db.injuries.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(10)
                    if injuries:
                        for injury in injuries[:5]:
                            elements.extend(create_qa_block(
                                f"Lesión - {injury.get('location', 'Sin ubicación')}",
                                f"Tipo: {injury.get('type', 'N/A')} | Fecha: {injury.get('date', 'N/A')[:10] if injury.get('date') else 'N/A'} | Severidad: {injury.get('severity', 'N/A')} | Tratamiento: {injury.get('treatment', 'N/A')}",
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin lesiones registradas", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'diseases' in items:
                    elements.append(Paragraph("Enfermedades y Condiciones", styles['SubSectionTitle']))
                    diseases = await db.diseases.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(10)
                    if diseases:
                        for disease in diseases[:5]:
                            elements.extend(create_qa_block(
                                disease.get('name', 'Condición sin nombre'),
                                f"Estado: {disease.get('status', 'N/A')} | Descripción: {disease.get('description', 'N/A')}",
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin enfermedades registradas", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== ANALYSIS =====
        elif section_id == 'analysis':
            elements.append(create_section_header("ANÁLISIS PREVIO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver análisis previo", styles['NoDataText']))
            else:
                if 'previous_plan' in items:
                    elements.append(Paragraph("Análisis del Plan Anterior", styles['SubSectionTitle']))
                    prev_analysis = await db.previous_plan_analysis.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ) or {}  # Use empty dict if no data
                    
                    # Always show all questions - Objetivos y Cumplimiento
                    elements.extend(create_qa_block("¿Cuáles eran los objetivos al inicio del plan de entrenamiento?", prev_analysis.get('initialObjectives', ''), section_id))
                    elements.extend(create_qa_block("¿En qué medida se alcanzaron estos objetivos?", prev_analysis.get('achievementLevel', ''), section_id))
                    elements.extend(create_qa_block("Nivel de cumplimiento de objetivos planteados", prev_analysis.get('objectivesCompliance', ''), section_id))
                    
                    # Rendimiento
                    elements.extend(create_qa_block("¿Cómo evolucionó el rendimiento en los indicadores clave?", prev_analysis.get('performanceIndicators', ''), section_id))
                    elements.extend(create_qa_block("Resultados obtenidos - nivel de rendimiento de la temporada anterior", prev_analysis.get('performanceResults', ''), section_id))
                    
                    # Recuperación
                    elements.extend(create_qa_block("¿Cómo calificarías el proceso de recuperación entre sesiones?", prev_analysis.get('recoveryProcess', ''), section_id))
                    elements.extend(create_qa_block("¿Experimentaste algún periodo de fatiga prolongada?", prev_analysis.get('fatiguePeriods', ''), section_id))
                    
                    # Lesiones
                    elements.extend(create_qa_block("¿Sufriste alguna lesión durante el plan?", prev_analysis.get('injuries', ''), section_id))
                    elements.extend(create_qa_block("¿Cómo afectaron las lesiones tu entrenamiento?", prev_analysis.get('injuryImpact', ''), section_id))
                    
                    # Fortalezas y Debilidades
                    elements.extend(create_qa_block("Aspectos positivos del plan", prev_analysis.get('planPositiveAspects', ''), section_id))
                    elements.extend(create_qa_block("Áreas de mejora del plan", prev_analysis.get('planImprovementAreas', ''), section_id))
                    
                    # Nutrición
                    elements.extend(create_qa_block("Hábitos de nutrición", prev_analysis.get('nutritionHabits', ''), section_id))
                    elements.extend(create_qa_block("Hábitos de hidratación", prev_analysis.get('hydrationHabits', ''), section_id))
                    
                    # Psicológico
                    elements.extend(create_qa_block("Manejo del estrés", prev_analysis.get('stressManagement', ''), section_id))
                    elements.extend(create_qa_block("Presión en competencias", prev_analysis.get('competitionPressure', ''), section_id))
                    
                    # Cambios propuestos
                    elements.extend(create_qa_block("¿Qué cambios específicos se proponen?", prev_analysis.get('specificChanges', ''), section_id))
                    elements.extend(create_qa_block("Cambios para el próximo ciclo", prev_analysis.get('nextCycleChanges', ''), section_id))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'competition_analysis' in items:
                    elements.append(Paragraph("Análisis de Competencias", styles['SubSectionTitle']))
                    comp_analysis = await db.competition_analysis.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(5)
                    if comp_analysis:
                        for comp in comp_analysis:
                            elements.extend(create_qa_block(
                                comp.get('competition_name', 'Competencia'),
                                f"Posición: {comp.get('position', 'N/A')} | Resultado: {comp.get('result', 'N/A')} | Observaciones: {comp.get('observations', 'N/A')}",
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin análisis de competencias", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== OBJECTIVES =====
        elif section_id == 'objectives':
            elements.append(create_section_header("OBJETIVOS E INDICADORES", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver objetivos", styles['NoDataText']))
            else:
                objectives_data = await db.objectives.find_one(
                    {"athlete_id": request.athlete_id}, {"_id": 0}
                )
                
                if objectives_data and objectives_data.get('objectives'):
                    objs = objectives_data['objectives']
                    
                    # Categorías de objetivos
                    category_labels = {
                        'performance': 'Rendimiento',
                        'physical': 'Físico',
                        'technical': 'Técnico',
                        'tactical': 'Táctico',
                        'psychological': 'Psicológico',
                        'competition': 'Competitivo',
                        'general': 'General'
                    }
                    
                    timeframe_labels = {
                        'short': 'Corto Plazo (1-3 meses)',
                        'medium': 'Medio Plazo (3-6 meses)',
                        'long': 'Largo Plazo (6-12 meses)',
                        'season': 'Temporada Completa'
                    }
                    
                    if 'general_objectives' in items:
                        elements.append(Paragraph("Objetivos por Categoría", styles['SubSectionTitle']))
                        
                        # Group objectives by category
                        by_category = {}
                        for obj in objs:
                            cat = obj.get('category', 'general')
                            if cat not in by_category:
                                by_category[cat] = []
                            by_category[cat].append(obj)
                        
                        for cat, cat_objs in by_category.items():
                            cat_label = category_labels.get(cat, cat.capitalize())
                            elements.append(Paragraph(f"● {cat_label}", styles['QuestionText']))
                            for obj in cat_objs[:5]:
                                title = obj.get('title', obj.get('name', 'Sin título'))
                                timeframe = timeframe_labels.get(obj.get('timeframe', ''), obj.get('timeframe', ''))
                                progress = obj.get('progress', 0)
                                description = obj.get('description', '')
                                
                                obj_text = f"<b>{title}</b><br/>"
                                if timeframe:
                                    obj_text += f"Plazo: {timeframe}<br/>"
                                obj_text += f"Progreso: {progress}%<br/>"
                                if description:
                                    obj_text += f"Descripción: {description}"
                                
                                elements.append(Paragraph(obj_text, styles['AnswerText']))
                        elements.append(Spacer(1, 0.15*inch))
                    
                    if 'kpis' in items:
                        elements.append(Paragraph("Indicadores de Rendimiento (KPIs)", styles['SubSectionTitle']))
                        # Collect all indicators from objectives
                        kpis = []
                        for obj in objs:
                            for ind in obj.get('indicators', []):
                                if ind.get('name'):
                                    kpis.append(ind)
                        
                        if kpis:
                            table = create_data_table(
                                ['Indicador', 'Línea Base', 'Meta', 'Actual', 'Unidad'],
                                [[
                                    kpi.get('name', 'N/A'),
                                    str(kpi.get('baseline', '-')),
                                    str(kpi.get('target', '-')),
                                    str(kpi.get('current', '-')),
                                    kpi.get('unit', '-')
                                ] for kpi in kpis[:10]],
                                section_id
                            )
                            elements.append(table)
                        else:
                            elements.append(Paragraph("Sin indicadores definidos", styles['NoDataText']))
                else:
                    elements.append(Paragraph("Sin objetivos registrados", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== TRAINING METHODS =====
        elif section_id == 'training_methods':
            elements.append(create_section_header("MEDIOS DE ENTRENAMIENTO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver medios de entrenamiento", styles['NoDataText']))
            else:
                if 'exercises' in items:
                    elements.append(Paragraph("Ejercicios Seleccionados", styles['SubSectionTitle']))
                    # Get exercises assigned to athlete
                    athlete_exercises = await db.athlete_exercises.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(20)
                    if athlete_exercises:
                        table = create_data_table(
                            ['Ejercicio', 'Categoría', 'Músculo Principal'],
                            [[
                                ex.get('name', 'N/A'),
                                ex.get('category', 'N/A'),
                                ex.get('primary_muscle', 'N/A')
                            ] for ex in athlete_exercises[:10]],
                            section_id
                        )
                        elements.append(table)
                    else:
                        elements.append(Paragraph("Sin ejercicios asignados", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'methods' in items:
                    elements.append(Paragraph("Métodos de Entrenamiento", styles['SubSectionTitle']))
                    methods = await db.training_methods.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(10)
                    if methods:
                        for method in methods[:5]:
                            elements.extend(create_qa_block(
                                method.get('name', 'Método sin nombre'),
                                method.get('description', ''),
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin métodos definidos", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== CONTROL =====
        elif section_id == 'control':
            elements.append(create_section_header("CONTROL Y SEGUIMIENTO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver control y seguimiento", styles['NoDataText']))
            else:
                if 'load_monitoring' in items:
                    elements.append(Paragraph("Monitoreo de Carga de Entrenamiento", styles['SubSectionTitle']))
                    load_data = await db.training_load.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).sort("date", -1).to_list(10)
                    if load_data:
                        table = create_data_table(
                            ['Fecha', 'Carga Planificada', 'Carga Real', 'RPE', 'Fatiga'],
                            [[
                                load.get('date', 'N/A')[:10] if load.get('date') else 'N/A',
                                str(load.get('planned_load', '-')),
                                str(load.get('actual_load', '-')),
                                str(load.get('rpe', '-')),
                                str(load.get('fatigue', '-'))
                            ] for load in load_data[:7]],
                            section_id
                        )
                        elements.append(table)
                    else:
                        elements.append(Paragraph("Sin datos de carga registrados", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'training_control' in items:
                    elements.append(Paragraph("Control de Entrenamiento", styles['SubSectionTitle']))
                    control_data = await db.training_control.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    )
                    if control_data:
                        elements.extend(create_qa_block("Porcentaje de cumplimiento", f"{control_data.get('compliance', 'N/A')}%", section_id))
                        elements.extend(create_qa_block("Ratio de Carga Aguda/Crónica (ACWR)", str(control_data.get('acwr', 'N/A')), section_id))
                        elements.extend(create_qa_block("Estado actual del deportista", control_data.get('status', ''), section_id))
                    else:
                        elements.append(Paragraph("Sin datos de control", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'alerts' in items:
                    elements.append(Paragraph("Alertas y Recomendaciones Activas", styles['SubSectionTitle']))
                    alerts = await db.alerts.find(
                        {"athlete_id": request.athlete_id, "active": True}, {"_id": 0}
                    ).to_list(5)
                    if alerts:
                        for alert in alerts:
                            severity = alert.get('severity', 'info')
                            severity_text = "⚠️ Advertencia" if severity == 'warning' else "ℹ️ Información" if severity == 'info' else "🔴 Crítico"
                            elements.extend(create_qa_block(
                                severity_text,
                                alert.get('message', ''),
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin alertas activas", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== PERIODIZATION =====
        elif section_id == 'periodization':
            elements.append(create_section_header("PLAN DE PERIODIZACIÓN", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            # Load plans for athlete
            plans = []
            if request.athlete_id:
                plans = await db.periodization_plans.find(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                ).to_list(10)
            
            # Also check for macrocycles directly
            macrocycles = []
            if request.athlete_id:
                macrocycles = await db.macrocycles.find(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                ).to_list(5)
            
            if plans or macrocycles:
                # Process plans
                for plan in plans[:3]:
                    elements.append(Paragraph(f"Plan: {plan.get('name', 'Sin nombre')}", styles['SubSectionTitle']))
                    
                    if 'macrocycles' in items:
                        elements.append(Paragraph("Macrociclos Definidos:", styles['QuestionText']))
                        macros = plan.get('macrocycles', [])
                        for macro in macros[:5]:
                            macro_info = f"<b>{macro.get('name', 'N/A')}</b><br/>"
                            macro_info += f"Duración: {macro.get('duration_weeks', 0)} semanas | "
                            macro_info += f"Fase: {macro.get('phase', 'N/A')} | "
                            macro_info += f"Fecha inicio: {macro.get('start_date', 'N/A')[:10] if macro.get('start_date') else 'N/A'}"
                            elements.append(Paragraph(macro_info, styles['AnswerText']))
                    
                    if 'mesocycles' in items:
                        elements.append(Paragraph("Mesociclos:", styles['QuestionText']))
                        mesos = plan.get('mesocycles', [])
                        if mesos:
                            table = create_data_table(
                                ['Nombre', 'Tipo', 'Semanas', 'Intensidad'],
                                [[
                                    meso.get('name', 'N/A'),
                                    meso.get('type', 'N/A'),
                                    str(meso.get('duration_weeks', meso.get('weeks', '-'))),
                                    meso.get('intensity', 'N/A')
                                ] for meso in mesos[:10]],
                                section_id
                            )
                            elements.append(table)
                            elements.append(Spacer(1, 0.15*inch))
                    
                    if 'microcycles' in items:
                        elements.append(Paragraph("Microciclos (Semanas de Entrenamiento):", styles['QuestionText']))
                        micros = plan.get('microcycles', [])
                        if micros:
                            table = create_data_table(
                                ['Semana', 'Tipo/Enfoque', 'Volumen', 'Intensidad', 'Sesiones'],
                                [[
                                    f"Sem {micro.get('week_number', micro.get('week', '-'))}",
                                    micro.get('type', micro.get('focus', 'Normal')),
                                    str(micro.get('volume', '-')),
                                    str(micro.get('intensity', '-')),
                                    str(len(micro.get('sessions', [])))
                                ] for micro in micros[:15]],
                                section_id
                            )
                            elements.append(table)
                            elements.append(Spacer(1, 0.15*inch))
                    
                    if 'sessions' in items:
                        elements.append(Paragraph("Sesiones de Entrenamiento Programadas:", styles['QuestionText']))
                        # Get sessions from microcycles
                        all_sessions = []
                        for micro in plan.get('microcycles', [])[:5]:
                            for session in micro.get('sessions', []):
                                session['week'] = micro.get('week_number', micro.get('week', 'N/A'))
                                all_sessions.append(session)
                        
                        if all_sessions:
                            table = create_data_table(
                                ['Semana', 'Día', 'Tipo', 'Duración', 'Intensidad'],
                                [[
                                    f"Sem {sess.get('week', '-')}",
                                    sess.get('day', sess.get('day_of_week', '-')),
                                    sess.get('type', sess.get('session_type', '-')),
                                    f"{sess.get('duration', sess.get('duration_minutes', '-'))} min",
                                    sess.get('intensity', '-')
                                ] for sess in all_sessions[:20]],
                                section_id
                            )
                            elements.append(table)
                        else:
                            elements.append(Paragraph("Sin sesiones programadas", styles['NoDataText']))
                        elements.append(Spacer(1, 0.15*inch))
                    
                    if 'objectives' in items:
                        objectives = plan.get('objectives', [])
                        if objectives:
                            elements.append(Paragraph("Objetivos del Plan:", styles['QuestionText']))
                            for obj in objectives[:5]:
                                if isinstance(obj, dict):
                                    elements.append(Paragraph(f"  • {obj.get('title', obj.get('name', str(obj)))}", styles['AnswerText']))
                                else:
                                    elements.append(Paragraph(f"  • {obj}", styles['AnswerText']))
                    
                    elements.append(Spacer(1, 0.2*inch))
                
                # Process standalone macrocycles
                for macro in macrocycles[:2]:
                    if not plans:  # Only show if no plans exist
                        elements.append(Paragraph(f"Macrociclo: {macro.get('name', 'Sin nombre')}", styles['SubSectionTitle']))
                        elements.extend(create_qa_block("Duración total", f"{macro.get('duration_weeks', 'N/A')} semanas", section_id))
                        elements.extend(create_qa_block("Modelo de periodización", macro.get('model', 'N/A'), section_id))
                        elements.append(Spacer(1, 0.15*inch))
            else:
                elements.append(Paragraph("Sin planes de periodización registrados", styles['NoDataText']))
        
        # ===== GRAPHIC PLAN =====
        elif section_id == 'graphic_plan':
            elements.append(create_section_header("PLAN GRÁFICO DE ENTRENAMIENTO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            # Load graphic plan data from database
            graphic_plan_data = None
            if request.athlete_id:
                graphic_plan_data = await db.graphic_plans.find_one(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                )
            
            # Use periodization_data if provided, otherwise use default
            plan_data = request.periodization_data or graphic_plan_data or {}
            
            if 'training_table' in items:
                elements.append(Paragraph("Tabla de Planificación Semanal", styles['SubSectionTitle']))
                
                # Get data from graphic plan if available
                intensity_data = plan_data.get('intensity', {})
                weeks_count = min(12, len(intensity_data) if intensity_data else 12)
                
                # Create headers
                header = ['Parámetro'] + [f'S{i}' for i in range(1, weeks_count + 1)]
                
                # Create rows with data from plan or defaults
                rows = []
                
                # Phases row
                phases_row = ['Fase']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if plan_data.get('periods', {}).get(week_key):
                        phases_row.append(plan_data['periods'][week_key][:8])  # Truncate long names
                    else:
                        if i <= weeks_count // 3:
                            phases_row.append('Prep.Gen')
                        elif i <= 2 * weeks_count // 3:
                            phases_row.append('Prep.Esp')
                        else:
                            phases_row.append('Compet.')
                rows.append(phases_row)
                
                # Intensity row
                intensity_row = ['Intensidad']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if intensity_data.get(week_key):
                        val = intensity_data[week_key]
                        intensity_row.append(f'{int(val * 20)}%' if isinstance(val, (int, float)) else str(val))
                    else:
                        # Default progression
                        base = 60 + (i * 3)
                        intensity_row.append(f'{min(base, 95)}%')
                rows.append(intensity_row)
                
                # Mesocycle row
                meso_row = ['Mesociclo']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if plan_data.get('mesocycles', {}).get(week_key):
                        meso_row.append(plan_data['mesocycles'][week_key][:6])
                    else:
                        meso_num = (i - 1) // 4 + 1
                        meso_row.append(f'M{meso_num}')
                rows.append(meso_row)
                
                data = [header] + rows
                table = Table(data, colWidths=[1.1*inch] + [0.42*inch]*weeks_count)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BACKGROUND', (0, 1), (0, -1), bg_color),
                    ('BACKGROUND', (1, 1), (-1, -1), colors.white),  # Solid white background
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 0.3*inch))
            
            if 'load_chart' in items:
                elements.append(Paragraph("Magnitud de Carga y Recuperación", styles['SubSectionTitle']))
                elements.append(Paragraph(
                    "La gráfica de carga muestra la progresión de la intensidad del entrenamiento a lo largo del macrociclo. "
                    "Los valores de recuperación son inversamente proporcionales a la carga aplicada.",
                    styles['AnswerText']
                ))
                elements.append(Spacer(1, 0.15*inch))
                
                # Get intensity data for load chart
                intensity_data = plan_data.get('intensity', {})
                weeks_count = min(12, len(intensity_data) if intensity_data else 8)
                
                weeks_header = ['Semana'] + [f'S{i}' for i in range(1, weeks_count + 1)]
                
                # Load row
                load_row = ['Carga %']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if intensity_data.get(week_key):
                        val = intensity_data[week_key]
                        load_row.append(str(int(val * 20)) if isinstance(val, (int, float)) else str(val))
                    else:
                        base = 60 + (i * 4)
                        load_row.append(str(min(base, 95)))
                
                # Recovery row (inverse of load)
                recovery_row = ['Recup. %']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if intensity_data.get(week_key):
                        val = intensity_data[week_key]
                        load_val = int(val * 20) if isinstance(val, (int, float)) else 50
                        recovery_row.append(str(100 - load_val))
                    else:
                        base = 60 + (i * 4)
                        recovery_row.append(str(100 - min(base, 95)))
                
                weeks_data = [weeks_header, load_row, recovery_row]
                
                table = Table(weeks_data, colWidths=[1*inch] + [0.6*inch]*weeks_count)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BACKGROUND', (0, 1), (0, -1), bg_color),
                    ('BACKGROUND', (1, 1), (-1, 1), colors.HexColor('#EF4444')),  # Red for load
                    ('BACKGROUND', (1, 2), (-1, 2), colors.HexColor('#3B82F6')),  # Blue for recovery
                    ('TEXTCOLOR', (1, 1), (-1, 2), colors.white),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 1, colors.white),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(table)
                
                # Add legend
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph(
                    "<font color='#EF4444'>■</font> Carga (%) &nbsp;&nbsp;&nbsp; <font color='#3B82F6'>■</font> Recuperación (%)",
                    styles['AnswerText']
                ))
                elements.append(Spacer(1, 0.2*inch))
            
            if 'volume_intensity_chart' in items:
                elements.append(Paragraph("Volumen e Intensidad por Semanas", styles['SubSectionTitle']))
                elements.append(Paragraph(
                    "El balance entre volumen e intensidad es fundamental para la periodización. "
                    "Durante la preparación general se prioriza el volumen, mientras que en fase competitiva se prioriza la intensidad.",
                    styles['AnswerText']
                ))
                elements.append(Spacer(1, 0.1*inch))
                
                # Volume/Intensity table
                vol_int_data = plan_data.get('volume_intensity', {})
                weeks_count = min(12, len(vol_int_data) if vol_int_data else 12)
                
                vi_header = ['Semana'] + [f'S{i}' for i in range(1, weeks_count + 1)]
                
                # Volume row (decreases over time generally)
                volume_row = ['Volumen']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if vol_int_data.get(week_key, {}).get('volume'):
                        volume_row.append(vol_int_data[week_key]['volume'])
                    else:
                        # Default: high at start, low at end
                        if i <= weeks_count // 3:
                            volume_row.append('Alto')
                        elif i <= 2 * weeks_count // 3:
                            volume_row.append('Medio')
                        else:
                            volume_row.append('Bajo')
                
                # Intensity row (increases over time generally)
                intensity_pct_row = ['Intensidad']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if vol_int_data.get(week_key, {}).get('intensity'):
                        intensity_pct_row.append(f"{vol_int_data[week_key]['intensity']}%")
                    else:
                        base = 55 + (i * 3)
                        intensity_pct_row.append(f'{min(base, 95)}%')
                
                vi_data = [vi_header, volume_row, intensity_pct_row]
                vi_table = Table(vi_data, colWidths=[1*inch] + [0.5*inch]*weeks_count)
                vi_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BACKGROUND', (0, 1), (0, -1), bg_color),
                    ('BACKGROUND', (1, 1), (-1, 1), colors.HexColor('#22C55E')),  # Green for volume
                    ('BACKGROUND', (1, 2), (-1, 2), colors.HexColor('#8B5CF6')),  # Purple for intensity
                    ('TEXTCOLOR', (1, 1), (-1, 2), colors.white),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 1, colors.white),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ]))
                elements.append(vi_table)
                
                # Add legend
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph(
                    "<font color='#22C55E'>■</font> Volumen &nbsp;&nbsp;&nbsp; <font color='#8B5CF6'>■</font> Intensidad (%)",
                    styles['AnswerText']
                ))
                elements.append(Spacer(1, 0.2*inch))
            
            if 'phase_timeline' in items:
                elements.append(Paragraph("Línea de Tiempo de Fases", styles['SubSectionTitle']))
                
                # Create phase timeline table
                phases_info = plan_data.get('phases', [
                    {'name': 'Preparación General', 'weeks': 4, 'color': '#22C55E'},
                    {'name': 'Preparación Específica', 'weeks': 4, 'color': '#3B82F6'},
                    {'name': 'Precompetitiva', 'weeks': 2, 'color': '#F59E0B'},
                    {'name': 'Competitiva', 'weeks': 2, 'color': '#EF4444'},
                ])
                
                phase_data = [['Fase', 'Duración', 'Objetivo Principal']]
                phase_objectives = {
                    'Preparación General': 'Desarrollo de capacidades físicas básicas',
                    'Preparación Específica': 'Transferencia al deporte específico',
                    'Precompetitiva': 'Ajuste fino y reducción de volumen',
                    'Competitiva': 'Máximo rendimiento',
                    'Transición': 'Recuperación activa',
                }
                
                for phase in phases_info:
                    phase_name = phase.get('name', 'N/A')
                phase_data.append([
                        phase_name,
                        f"{phase.get('weeks', 'N/A')} semanas",
                        phase_objectives.get(phase_name, 'Desarrollo deportivo')
                    ])
                
                table = create_data_table(
                    ['Fase', 'Duración', 'Objetivos'],
                    [[row[0], row[1], row[2]] for row in phase_data[1:]],
                    section_id
                )
                elements.append(table)
                elements.append(Spacer(1, 0.2*inch))
        
        # ===== CALENDAR =====
        elif section_id == 'calendar':
            elements.append(create_section_header("CALENDARIO DE EVENTOS", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            events = []
            if request.athlete_id:
                events_data = await db.events.find_one(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                )
                events = events_data.get('events', []) if events_data else []
            
            if events:
                if 'competitions' in items:
                    competitions = [e for e in events if e.get('type') == 'competition' or e.get('priority') == 'high']
                    if competitions:
                        elements.append(Paragraph("Competencias Programadas", styles['SubSectionTitle']))
                        table = create_data_table(
                            ['Fecha', 'Evento', 'Ubicación', 'Importancia'],
                            [[
                                comp.get('date', 'N/A')[:10] if comp.get('date') else 'N/A',
                                comp.get('name', 'N/A'),
                                comp.get('location', 'N/A'),
                                comp.get('priority', 'N/A').capitalize() if comp.get('priority') else '-'
                            ] for comp in competitions[:10]],
                            section_id
                        )
                        elements.append(table)
                        elements.append(Spacer(1, 0.2*inch))
            else:
                elements.append(Paragraph("Sin eventos programados", styles['NoDataText']))
        
        elements.append(Spacer(1, 0.3*inch))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"reporte_completo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# =============== SESSION PDF EXPORT ===============
class SessionPDFRequest(BaseModel):
    athlete_id: str
    athlete_name: str = "Atleta"
    session: Dict[str, Any]

@router.post("/export/session-pdf")
async def export_session_pdf(request: SessionPDFRequest, authorization: str = Header(None), db=Depends(get_db)):
    """Exportar una sesión de entrenamiento como PDF con diseño profesional"""
    try:
        # Verificar autenticación
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No autorizado")
        
        session_data = request.session
        athlete_name = request.athlete_name
        
        # Extraer datos detallados de la sesión
        detailed_data = session_data.get('detailedData', {})
        objectives = detailed_data.get('objetivos', {})
        phases = detailed_data.get('fases', {})
        monitoreo = detailed_data.get('monitoreo', {})
        retroalimentacion = detailed_data.get('retroalimentacion', '')
        
        # Crear PDF
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Colores Material Design
        primary_gradient_start = HexColor('#2563eb')
        # Colores adicionales para el diseño
        secondary_gray = HexColor('#64748b')
        light_gray = HexColor('#f8fafc')
        white = HexColor('#ffffff')
        green_500 = HexColor('#22c55e')
        orange_500 = HexColor('#f97316')
        blue_500 = HexColor('#3b82f6')
        red_500 = HexColor('#ef4444')
        cyan_500 = HexColor('#06b6d4')
        
        # ============ HEADER ============
        # Gradiente simulado con rectángulos
        c.setFillColor(primary_gradient_start)
        c.roundRect(30, height - 110, width - 60, 80, 15, fill=1, stroke=0)
        
        # Título
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(50, height - 55, "SESIÓN DE ENTRENAMIENTO")
        
        # Subtítulo con atleta
        c.setFont("Helvetica", 13)
        c.drawString(50, height - 78, f"Atleta: {athlete_name}")
        
        # Fecha en el lado derecho
        session_date = session_data.get('date', datetime.now().strftime('%Y-%m-%d'))
        day_name = session_data.get('dayName', '')
        c.setFont("Helvetica-Bold", 12)
        c.drawRightString(width - 50, height - 55, f"Fecha: {session_date}")
        if day_name:
            c.setFont("Helvetica", 11)
            c.drawRightString(width - 50, height - 72, f"Día: {day_name}")
        
        y_position = height - 140
        
        # ============ OBJETIVOS DE LA SESIÓN ============
        # Card header
        c.setFillColor(cyan_500)
        c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(45, y_position - 7, "OBJETIVOS DE LA SESIÓN")
        y_position -= 35
        
        # Card content
        c.setFillColor(light_gray)
        c.roundRect(30, y_position - 100, width - 60, 100, 8, fill=1, stroke=0)
        
        obj_items = [
            ('General', objectives.get('general', '')),
            ('Físico', objectives.get('fisico', '')),
            ('Técnico', objectives.get('tecnico', '')),
            ('Táctico', objectives.get('tactico', '')),
            ('Psicológico', objectives.get('psicologico', '')),
            ('Teórico', objectives.get('teorico', ''))
        ]
        
        obj_y = y_position - 15
        col1_x = 45
        col2_x = width / 2 + 10
        
        for i, (label, value) in enumerate(obj_items):
            x_pos = col1_x if i % 2 == 0 else col2_x
            if i % 2 == 0 and i > 0:
                obj_y -= 28
            
            c.setFillColor(HexColor('#1e293b'))
            c.setFont("Helvetica-Bold", 9)
            c.drawString(x_pos, obj_y, f"{label}:")
            c.setFillColor(secondary_gray)
            c.setFont("Helvetica", 9)
            display_value = str(value)[:40] if value else "Sin definir"
            c.drawString(x_pos + 65, obj_y, display_value)
        
        y_position -= 115
        
        # ============ ESTRUCTURA DE LA SESIÓN (FASES) ============
        phase_configs = [
            ('inicial', 'FASE INICIAL (Calentamiento)', green_500, HexColor('#dcfce7')),
            ('principal', 'FASE PRINCIPAL', orange_500, HexColor('#ffedd5')),
            ('final', 'FASE FINAL (Vuelta a la calma)', blue_500, HexColor('#dbeafe'))
        ]
        
        for phase_key, phase_name, header_color, bg_color in phase_configs:
            phase_data = phases.get(phase_key, {})
            activities = phase_data.get('actividades', [])
            
            # Verificar espacio para nueva página
            needed_height = 80 + (len(activities) * 20)
            if y_position < needed_height + 100:
                c.showPage()
                y_position = height - 50
            
            # Phase header
            c.setFillColor(header_color)
            c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 11)
            c.drawString(45, y_position - 7, phase_name)
            c.setFont("Helvetica", 10)
            c.drawRightString(width - 50, y_position - 7, f"{len(activities)} ejercicios")
            y_position -= 30
            
            if activities:
                # Tabla de actividades
                table_height = 25 + (len(activities) * 20)
                c.setFillColor(bg_color)
                c.roundRect(30, y_position - table_height + 10, width - 60, table_height, 5, fill=1, stroke=0)
                
                # Headers de tabla
                c.setFillColor(HexColor('#475569'))
                c.setFont("Helvetica-Bold", 8)
                headers = ['Ejercicio', 'Cap.Física', 'Método', 'Series', 'Reps', 'Int.', 'Vol.', 'Recup.']
                x_positions = [40, 140, 215, 285, 325, 365, 410, 460]
                
                for i, header in enumerate(headers):
                    c.drawString(x_positions[i], y_position - 5, header)
                y_position -= 20
                
                # Línea separadora
                c.setStrokeColor(HexColor('#cbd5e1'))
                c.setLineWidth(0.5)
                c.line(35, y_position + 2, width - 35, y_position + 2)
                
                # Filas de actividades
                c.setFont("Helvetica", 8)
                for act in activities:
                    c.setFillColor(HexColor('#1e293b'))
                    ejercicio = str(act.get('ejercicio', '-'))[:18]
                    c.drawString(40, y_position - 5, ejercicio)
                    
                    c.setFillColor(secondary_gray)
                    c.drawString(140, y_position - 5, str(act.get('capacidadFisica', '-'))[:12])
                    c.drawString(215, y_position - 5, str(act.get('metodo', '-'))[:10])
                    c.drawString(285, y_position - 5, str(act.get('series', '-')))
                    c.drawString(325, y_position - 5, str(act.get('repeticiones', '-')))
                    
                    # Intensidad con indicador visual
                    intensidad = act.get('intensidad', 0)
                    c.drawString(365, y_position - 5, f"{intensidad}%")
                    
                    c.drawString(410, y_position - 5, str(act.get('volumen', '-'))[:8])
                    c.drawString(460, y_position - 5, str(act.get('recuperacion', '-'))[:8])
                    y_position -= 20
            else:
                # Sin actividades
                c.setFillColor(secondary_gray)
                c.setFont("Helvetica-Oblique", 9)
                c.drawString(45, y_position - 10, "No hay actividades en esta fase")
                y_position -= 25
            
            y_position -= 15
        
        # ============ MONITOREO DE RENDIMIENTO ============
        if y_position < 250:
            c.showPage()
            y_position = height - 50
        
        # Header de monitoreo
        c.setFillColor(red_500)
        c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(45, y_position - 7, "MONITOREO DE RENDIMIENTO")
        y_position -= 35
        
        # Card de monitoreo
        c.setFillColor(HexColor('#fef2f2'))
        c.roundRect(30, y_position - 170, width - 60, 170, 8, fill=1, stroke=0)
        
        # Frecuencia Cardíaca - Título
        c.setFillColor(HexColor('#991b1b'))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(45, y_position - 15, "Frecuencia Cardíaca por Fases")
        y_position -= 30
        
        # FC datos en columnas
        fc_data = [
            ('FC Reposo', monitoreo.get('fcReposo', '-'), 'bpm'),
            ('FC Media', monitoreo.get('fcMedia', '-'), 'bpm'),
            ('FC Máxima', monitoreo.get('fcMaxima', '-'), 'bpm'),
        ]
        
        fc_x = 50
        for label, value, unit in fc_data:
            # Mini card
            c.setFillColor(white)
            c.roundRect(fc_x, y_position - 45, 80, 50, 5, fill=1, stroke=0)
            c.setFillColor(HexColor('#64748b'))
            c.setFont("Helvetica", 8)
            c.drawCentredString(fc_x + 40, y_position - 12, label)
            c.setFillColor(HexColor('#1e293b'))
            c.setFont("Helvetica-Bold", 16)
            c.drawCentredString(fc_x + 40, y_position - 32, str(value) if value else '-')
            c.setFillColor(HexColor('#94a3b8'))
            c.setFont("Helvetica", 7)
            c.drawCentredString(fc_x + 40, y_position - 43, unit)
            fc_x += 90
        
        # FC por fases
        fc_fases = [
            ('Antes', monitoreo.get('fcAntesEntrenamiento', '-')),
            ('Durante', monitoreo.get('fcDuranteEntrenamiento', '-')),
            ('Después', monitoreo.get('fcDespuesEntrenamiento', '-')),
            ('Recup 1\'', monitoreo.get('fcRecuperacion1min', '-')),
            ('Recup 3\'', monitoreo.get('fcRecuperacion3min', '-')),
            ('Recup 5\'', monitoreo.get('fcRecuperacion5min', '-')),
        ]
        
        y_position -= 60
        c.setFillColor(HexColor('#991b1b'))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, y_position, "Fases:")
        
        fc_x = 90
        for label, value in fc_fases:
            c.setFillColor(secondary_gray)
            c.setFont("Helvetica", 8)
            c.drawString(fc_x, y_position, f"{label}: ")
            c.setFont("Helvetica-Bold", 8)
            c.drawString(fc_x + 35, y_position, str(value) if value else '-')
            fc_x += 70
        
        y_position -= 25
        
        # Estado del deportista
        c.setFillColor(HexColor('#991b1b'))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(45, y_position, "Estado del Deportista")
        y_position -= 18
        
        estado_data = [
            ('Nivel de Fatiga', monitoreo.get('nivelFatiga', 50), '%'),
            ('Hidratación', monitoreo.get('nivelHidratacion', 80), '%'),
            ('Calidad de Sueño', monitoreo.get('calidadSueno', 75), '%'),
            ('Nivel de Energía', monitoreo.get('nivelEnergia', 70), '%'),
        ]
        
        estado_x = 50
        for label, value, unit in estado_data:
            c.setFillColor(secondary_gray)
            c.setFont("Helvetica", 8)
            c.drawString(estado_x, y_position, f"{label}: ")
            c.setFillColor(HexColor('#1e293b'))
            c.setFont("Helvetica-Bold", 9)
            c.drawString(estado_x + 75, y_position, f"{value}{unit}")
            estado_x += 130
        
        y_position -= 50
        
        # ============ OBSERVACIONES ============
        if retroalimentacion:
            if y_position < 100:
                c.showPage()
                y_position = height - 50
            
            c.setFillColor(HexColor('#7c3aed'))
            c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(45, y_position - 7, "OBSERVACIONES Y RETROALIMENTACIÓN")
            y_position -= 35
            
            c.setFillColor(HexColor('#f5f3ff'))
            c.roundRect(30, y_position - 50, width - 60, 50, 5, fill=1, stroke=0)
            
            c.setFillColor(HexColor('#4c1d95'))
            c.setFont("Helvetica", 10)
            # Dividir texto largo en líneas
            text_lines = [retroalimentacion[i:i+80] for i in range(0, len(retroalimentacion), 80)]
            text_y = y_position - 20
            for line in text_lines[:3]:  # Máximo 3 líneas
                c.drawString(45, text_y, line)
                text_y -= 15
        
        # ============ FOOTER ============
        c.setFillColor(HexColor('#1e293b'))
        c.rect(0, 0, width, 35, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(40, 15, "Generado por LordTraining")
        c.setFont("Helvetica", 8)
        c.drawString(40, 5, datetime.now().strftime('%d/%m/%Y %H:%M'))
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(width - 40, 15, "www.train-system.com")
        
        c.save()
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=sesion_{session_date}.pdf"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting session PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")



"""
Sesiones Export — botón independiente "Sesiones" en el header de Plan Activo.

Permite al coach seleccionar sesiones específicas dentro del plan activo y exportarlas
usando el diseño tradicional ReportLab del PDF de sesión (mismo estilo que /export/session-pdf).

Endpoints:
  - POST /api/sessions-export/generate  body={plan_id, session_ids[], format, athlete_name?}
        format = "combined" -> un único PDF con todas las sesiones concatenadas
        format = "zip"      -> ZIP con un PDF por sesión

El listado de sesiones disponibles se obtiene del endpoint ya existente
GET /api/master-report/sessions-list/{plan_id} (se reutiliza desde el frontend).
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from io import BytesIO
import os
import re
import zipfile

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/sessions-export", tags=["sessions-export"])
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _client[os.environ['DB_NAME']]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ---------------- Models ----------------
class SessionsExportRequest(BaseModel):
    plan_id: str
    session_ids: List[str] = Field(default_factory=list)
    format: str = "combined"          # "combined" | "zip"
    athlete_name: Optional[str] = "Atleta"


# ---------------- Helpers ----------------
def _slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "sesion"


def _walk_plan_sessions(plan: Dict[str, Any]):
    """Yield (session_dict, meso_name, micro_name, week_number) for every session."""
    for m in (plan.get("macrocycles") or []):
        for ms in (m.get("mesocycles") or []):
            meso_name = ms.get("name") or "Mesociclo"
            for mc in (ms.get("microcycles") or []):
                micro_name = mc.get("name") or "Microciclo"
                week = mc.get("week_number")
                for s in (mc.get("sessions") or []):
                    yield s, meso_name, micro_name, week


def _build_session_pdf_bytes(
    session_data: Dict[str, Any],
    athlete_name: str,
    meso_name: str = "",
    micro_name: str = "",
    week_number: Any = None,
) -> bytes:
    """Replica el PDF clásico de /api/export/session-pdf en bytes.
    Mantiene exactamente la misma estética (Helvetica, header gradient simulado,
    fases con tabla de actividades, monitoreo, observaciones, footer).
    """
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.colors import HexColor

    detailed_data = session_data.get('detailedData', {}) or {}
    objectives = detailed_data.get('objetivos', {}) or {}
    phases = detailed_data.get('fases', {}) or {}
    monitoreo = detailed_data.get('monitoreo', {}) or {}
    retroalimentacion = detailed_data.get('retroalimentacion', '') or ''

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    primary_gradient_start = HexColor('#2563eb')
    secondary_gray = HexColor('#64748b')
    light_gray = HexColor('#f8fafc')
    white = HexColor('#ffffff')
    green_500 = HexColor('#22c55e')
    orange_500 = HexColor('#f97316')
    blue_500 = HexColor('#3b82f6')
    red_500 = HexColor('#ef4444')
    cyan_500 = HexColor('#06b6d4')

    # ============ HEADER ============
    c.setFillColor(primary_gradient_start)
    c.roundRect(30, height - 110, width - 60, 80, 15, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(50, height - 55, "SESIÓN DE ENTRENAMIENTO")
    c.setFont("Helvetica", 13)
    c.drawString(50, height - 78, f"Atleta: {athlete_name}")
    # Etiqueta meso/micro/semana en el header (si vienen)
    extra_bits = []
    if meso_name: extra_bits.append(meso_name)
    if micro_name: extra_bits.append(micro_name)
    if week_number is not None: extra_bits.append(f"Semana {week_number}")
    if extra_bits:
        c.setFont("Helvetica", 10)
        c.drawString(50, height - 95, " · ".join(extra_bits))

    session_date = session_data.get('date', datetime.now().strftime('%Y-%m-%d'))
    day_name = session_data.get('dayName', '') or session_data.get('day', '')
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 50, height - 55, f"Fecha: {session_date}")
    if day_name:
        c.setFont("Helvetica", 11)
        c.drawRightString(width - 50, height - 72, f"Día: {day_name}")

    y_position = height - 140

    # ============ OBJETIVOS ============
    c.setFillColor(cyan_500)
    c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(45, y_position - 7, "OBJETIVOS DE LA SESIÓN")
    y_position -= 35

    c.setFillColor(light_gray)
    c.roundRect(30, y_position - 100, width - 60, 100, 8, fill=1, stroke=0)

    obj_items = [
        ('General', objectives.get('general', '')),
        ('Físico', objectives.get('fisico', '')),
        ('Técnico', objectives.get('tecnico', '')),
        ('Táctico', objectives.get('tactico', '')),
        ('Psicológico', objectives.get('psicologico', '')),
        ('Teórico', objectives.get('teorico', '')),
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
        display_value = (str(value)[:40] if value else "Sin definir")
        c.drawString(x_pos + 65, obj_y, display_value)

    y_position -= 115

    # ============ FASES ============
    phase_configs = [
        ('inicial', 'FASE INICIAL (Calentamiento)', green_500, HexColor('#dcfce7')),
        ('principal', 'FASE PRINCIPAL', orange_500, HexColor('#ffedd5')),
        ('final', 'FASE FINAL (Vuelta a la calma)', blue_500, HexColor('#dbeafe')),
    ]
    for phase_key, phase_name, header_color, bg_color in phase_configs:
        phase_data = phases.get(phase_key, {}) or {}
        activities = phase_data.get('actividades', []) or []

        needed_height = 80 + (len(activities) * 20)
        if y_position < needed_height + 100:
            c.showPage(); y_position = height - 50

        c.setFillColor(header_color)
        c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(45, y_position - 7, phase_name)
        c.setFont("Helvetica", 10)
        c.drawRightString(width - 50, y_position - 7, f"{len(activities)} ejercicios")
        y_position -= 30

        if activities:
            table_height = 25 + (len(activities) * 20)
            c.setFillColor(bg_color)
            c.roundRect(30, y_position - table_height + 10, width - 60, table_height, 5, fill=1, stroke=0)

            c.setFillColor(HexColor('#475569'))
            c.setFont("Helvetica-Bold", 8)
            headers = ['Ejercicio', 'Cap.Física', 'Método', 'Series', 'Reps', 'Int.', 'Vol.', 'Recup.']
            x_positions = [40, 140, 215, 285, 325, 365, 410, 460]
            for i, header in enumerate(headers):
                c.drawString(x_positions[i], y_position - 5, header)
            y_position -= 20

            c.setStrokeColor(HexColor('#cbd5e1'))
            c.setLineWidth(0.5)
            c.line(35, y_position + 2, width - 35, y_position + 2)

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
                intensidad = act.get('intensidad', 0) or 0
                c.drawString(365, y_position - 5, f"{intensidad}%")
                c.drawString(410, y_position - 5, str(act.get('volumen', '-'))[:8])
                c.drawString(460, y_position - 5, str(act.get('recuperacion', '-'))[:8])
                y_position -= 20
        else:
            c.setFillColor(secondary_gray)
            c.setFont("Helvetica-Oblique", 9)
            c.drawString(45, y_position - 10, "No hay actividades en esta fase")
            y_position -= 25

        y_position -= 15

    # ============ MONITOREO ============
    if y_position < 250:
        c.showPage(); y_position = height - 50

    c.setFillColor(red_500)
    c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(45, y_position - 7, "MONITOREO DE RENDIMIENTO")
    y_position -= 35

    c.setFillColor(HexColor('#fef2f2'))
    c.roundRect(30, y_position - 170, width - 60, 170, 8, fill=1, stroke=0)

    c.setFillColor(HexColor('#991b1b'))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(45, y_position - 15, "Frecuencia Cardíaca por Fases")
    y_position -= 30

    fc_data = [
        ('FC Reposo', monitoreo.get('fcReposo', '-'), 'bpm'),
        ('FC Media', monitoreo.get('fcMedia', '-'), 'bpm'),
        ('FC Máxima', monitoreo.get('fcMaxima', '-'), 'bpm'),
    ]
    fc_x = 50
    for label, value, unit in fc_data:
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
            c.showPage(); y_position = height - 50
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
        text_lines = [retroalimentacion[i:i+80] for i in range(0, len(retroalimentacion), 80)]
        text_y = y_position - 20
        for line in text_lines[:3]:
            c.drawString(45, text_y, line)
            text_y -= 15

    # ============ FOOTER ============
    c.setFillColor(HexColor('#1e293b'))
    c.rect(0, 0, width, 35, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(40, 15, "iTRAIN · Sistema de Gestión Deportiva")
    c.setFont("Helvetica", 8)
    c.drawString(40, 5, datetime.now().strftime('%d/%m/%Y %H:%M'))
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(width - 40, 15, "Sesión de entrenamiento")

    c.save()
    buffer.seek(0)
    return buffer.read()


# ---------------- Endpoints ----------------
@router.post("/generate")
async def generate_sessions_export(req: SessionsExportRequest, user=Depends(get_current_user_dep())):
    """Genera un PDF combinado o un ZIP con un PDF por sesión seleccionada."""
    uid = user.get("id") or user.get("user_id")
    plan = await _db.training_plans.find_one(
        {"id": req.plan_id, "$or": [{"user_id": uid}, {"coach_id": uid}]},
        {"_id": 0}
    )
    if not plan:
        raise HTTPException(404, "Plan no encontrado")
    if not req.session_ids:
        raise HTTPException(400, "Debes seleccionar al menos una sesión")

    fmt = (req.format or "combined").lower()
    if fmt not in ("combined", "zip"):
        raise HTTPException(400, "Formato inválido (usa 'combined' o 'zip')")

    requested = set(req.session_ids)
    found: List[tuple] = []  # (session, meso, micro, week)
    for s, meso, micro, week in _walk_plan_sessions(plan):
        sid = s.get("id")
        if sid and sid in requested:
            found.append((s, meso, micro, week))

    if not found:
        raise HTTPException(404, "Ninguna de las sesiones seleccionadas existe en el plan")

    # Mantener el orden tal como aparece en el plan
    pdfs: List[tuple] = []  # (filename, bytes)
    for s, meso, micro, week in found:
        pdf_bytes = _build_session_pdf_bytes(
            session_data=s,
            athlete_name=req.athlete_name or "Atleta",
            meso_name=meso,
            micro_name=micro,
            week_number=week,
        )
        name_slug = _slugify(s.get('name') or s.get('day') or 'sesion')
        date_part = s.get('date') or ''
        fname = f"sesion_{date_part}_{name_slug}.pdf" if date_part else f"sesion_{name_slug}.pdf"
        pdfs.append((fname, pdf_bytes))

    plan_slug = _slugify(plan.get('name') or 'plan')

    if fmt == "zip":
        buf = BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            seen = {}
            for fname, data in pdfs:
                final_name = fname
                if final_name in seen:
                    seen[final_name] += 1
                    base, ext = os.path.splitext(final_name)
                    final_name = f"{base}_{seen[final_name]}{ext}"
                else:
                    seen[final_name] = 0
                zf.writestr(final_name, data)
        buf.seek(0)
        zip_name = f"sesiones_{plan_slug}.zip"
        return Response(
            content=buf.read(),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
        )

    # combined: merge with pypdf
    from pypdf import PdfReader, PdfWriter
    writer = PdfWriter()
    for _, data in pdfs:
        reader = PdfReader(BytesIO(data))
        for page in reader.pages:
            writer.add_page(page)
    out = BytesIO()
    writer.write(out)
    out.seek(0)
    pdf_name = f"sesiones_{plan_slug}.pdf"
    return Response(
        content=out.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{pdf_name}"'},
    )

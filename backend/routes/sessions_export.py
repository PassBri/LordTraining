"""
Sesiones Export — botón independiente "Sesiones" en el header de Plan Activo.

Permite al coach seleccionar sesiones específicas y exportarlas en 4 combinaciones:
  layout = "classic" (ReportLab tradicional) | "hero" (Playwright pizarras protagonistas)
  theme  = "light" | "dark"

Endpoints:
  - POST /api/sessions-export/generate {plan_id, session_ids[], format, theme?, layout?, athlete_name?}
        format = "combined" -> PDF único concatenado · format = "zip" -> ZIP por sesión
  - POST /api/sessions-export/share {plan_id, session_ids[], theme?, layout?, athlete_name?}
        -> {share_id, expires_in_days}
  - GET  /api/sessions-export/shared/{share_id}/pdf?format=combined|zip  (público, sin auth)

El listado de sesiones se obtiene de GET /api/master-report/sessions-list/{plan_id}.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone, timedelta
from io import BytesIO
import os
import re
import secrets
import zipfile
import html as _html
import asyncio

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/sessions-export", tags=["sessions-export"])
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _client[os.environ['DB_NAME']]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ---------------- Brand logo (escama) ----------------
_SCALE_LOGO_PATH = "/app/frontend/public/brand/lordtraining-scale.png"
_scale_b64_cache: Optional[str] = None


def _scale_logo_b64() -> str:
    """Devuelve la escama de marca en base64 (cacheada) para embeber en HTML."""
    global _scale_b64_cache
    if _scale_b64_cache is None:
        import base64
        try:
            with open(_SCALE_LOGO_PATH, "rb") as f:
                _scale_b64_cache = base64.b64encode(f.read()).decode()
        except Exception:
            _scale_b64_cache = ""
    return _scale_b64_cache


# ---------------- Models ----------------
class SessionsExportRequest(BaseModel):
    plan_id: str
    session_ids: List[str] = Field(default_factory=list)
    format: str = "combined"
    theme: str = "light"             # "light" | "dark"
    layout: str = "classic"          # "classic" | "hero"
    athlete_name: Optional[str] = "Atleta"


class SessionsShareRequest(BaseModel):
    plan_id: str
    session_ids: List[str] = Field(default_factory=list)
    theme: str = "light"
    layout: str = "classic"
    athlete_name: Optional[str] = "Atleta"


# ---------------- Helpers ----------------
def _slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "sesion"


def _walk_plan_sessions(plan: Dict[str, Any]):
    for m in (plan.get("macrocycles") or []):
        for ms in (m.get("mesocycles") or []):
            meso_name = ms.get("name") or "Mesociclo"
            for mc in (ms.get("microcycles") or []):
                micro_name = mc.get("name") or "Microciclo"
                week = mc.get("week_number")
                for s in (mc.get("sessions") or []):
                    yield s, meso_name, micro_name, week


# ============ CLASSIC LAYOUT (ReportLab) ============

def _build_session_pdf_classic(
    session_data: Dict[str, Any],
    athlete_name: str,
    meso_name: str = "",
    micro_name: str = "",
    week_number: Any = None,
    theme: str = "light",
) -> bytes:
    """PDF clásico tipo /api/export/session-pdf con soporte ligero de tema."""
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.colors import HexColor

    detailed_data = session_data.get('detailedData', {}) or {}
    objectives = detailed_data.get('objetivos', {}) or {}
    phases = detailed_data.get('fases', {}) or {}
    monitoreo = detailed_data.get('monitoreo', {}) or {}
    retroalimentacion = detailed_data.get('retroalimentacion', '') or ''

    is_dark = theme == "dark"
    bg_color = HexColor('#0a0a0f') if is_dark else HexColor('#ffffff')
    ink = HexColor('#e5e7eb') if is_dark else HexColor('#1e293b')
    ink_muted = HexColor('#94a3b8') if is_dark else HexColor('#64748b')
    surface = HexColor('#111118') if is_dark else HexColor('#f8fafc')
    accent = HexColor('#c8f700') if is_dark else HexColor('#2563eb')

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Background fill (dark mode covers the whole page)
    if is_dark:
        c.setFillColor(bg_color)
        c.rect(0, 0, width, height, fill=1, stroke=0)

    white = HexColor('#ffffff')

    # ============ HEADER ============
    c.setFillColor(accent)
    c.roundRect(30, height - 110, width - 60, 80, 15, fill=1, stroke=0)

    # Escama de marca dentro del banner (izquierda)
    text_x = 50
    try:
        from reportlab.lib.utils import ImageReader
        logo_size = 58
        logo_y = height - 105 + (80 - logo_size) / 2
        c.drawImage(ImageReader(_SCALE_LOGO_PATH), 48, logo_y,
                    width=logo_size, height=logo_size,
                    mask='auto', preserveAspectRatio=True)
        text_x = 48 + logo_size + 16
    except Exception:
        text_x = 50

    title_color = HexColor('#0a0a0f') if is_dark else white
    c.setFillColor(title_color)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(text_x, height - 55, "SESIÓN DE ENTRENAMIENTO")
    c.setFont("Helvetica", 13)
    c.drawString(text_x, height - 78, f"Atleta: {athlete_name}")
    extra_bits = []
    if meso_name: extra_bits.append(meso_name)
    if micro_name: extra_bits.append(micro_name)
    if week_number is not None: extra_bits.append(f"Semana {week_number}")
    if extra_bits:
        c.setFont("Helvetica", 10)
        c.drawString(text_x, height - 95, " · ".join(extra_bits))

    session_date = session_data.get('date', datetime.now().strftime('%Y-%m-%d'))
    day_name = session_data.get('dayName', '') or session_data.get('day', '')
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 50, height - 55, f"Fecha: {session_date}")
    if day_name:
        c.setFont("Helvetica", 11)
        c.drawRightString(width - 50, height - 72, f"Día: {day_name}")

    y_position = height - 140

    # ============ OBJETIVOS ============
    c.setFillColor(HexColor('#06b6d4'))
    c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(45, y_position - 7, "OBJETIVOS DE LA SESIÓN")
    y_position -= 35

    c.setFillColor(surface)
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
        c.setFillColor(ink)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x_pos, obj_y, f"{label}:")
        c.setFillColor(ink_muted)
        c.setFont("Helvetica", 9)
        display_value = (str(value)[:40] if value else "Sin definir")
        c.drawString(x_pos + 65, obj_y, display_value)

    y_position -= 115

    # ============ FASES ============
    phase_configs = [
        ('inicial', 'FASE INICIAL (Calentamiento)', HexColor('#22c55e'), HexColor('#dcfce7') if not is_dark else HexColor('#0f1f15')),
        ('principal', 'FASE PRINCIPAL', HexColor('#f97316'), HexColor('#ffedd5') if not is_dark else HexColor('#1f140a')),
        ('final', 'FASE FINAL (Vuelta a la calma)', HexColor('#3b82f6'), HexColor('#dbeafe') if not is_dark else HexColor('#0a141f')),
    ]
    for phase_key, phase_name, header_color, bg_color_phase in phase_configs:
        phase_data = phases.get(phase_key, {}) or {}
        activities = phase_data.get('actividades', []) or []
        needed_height = 80 + (len(activities) * 20)
        if y_position < needed_height + 100:
            c.showPage()
            if is_dark:
                c.setFillColor(bg_color); c.rect(0, 0, width, height, fill=1, stroke=0)
            y_position = height - 50

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
            c.setFillColor(bg_color_phase)
            c.roundRect(30, y_position - table_height + 10, width - 60, table_height, 5, fill=1, stroke=0)
            c.setFillColor(ink_muted)
            c.setFont("Helvetica-Bold", 8)
            headers = ['Ejercicio', 'Cap.Física', 'Método', 'Series', 'Reps', 'Int.', 'Vol.', 'Recup.']
            x_positions = [40, 140, 215, 285, 325, 365, 410, 460]
            for i, header in enumerate(headers):
                c.drawString(x_positions[i], y_position - 5, header)
            y_position -= 20
            c.setStrokeColor(ink_muted)
            c.setLineWidth(0.5)
            c.line(35, y_position + 2, width - 35, y_position + 2)
            c.setFont("Helvetica", 8)
            for act in activities:
                c.setFillColor(ink)
                ejercicio = str(act.get('ejercicio', '-'))[:18]
                c.drawString(40, y_position - 5, ejercicio)
                c.setFillColor(ink_muted)
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
            c.setFillColor(ink_muted)
            c.setFont("Helvetica-Oblique", 9)
            c.drawString(45, y_position - 10, "No hay actividades en esta fase")
            y_position -= 25
        y_position -= 15

    # MONITOREO
    if y_position < 250:
        c.showPage()
        if is_dark:
            c.setFillColor(bg_color); c.rect(0, 0, width, height, fill=1, stroke=0)
        y_position = height - 50

    c.setFillColor(HexColor('#ef4444'))
    c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(45, y_position - 7, "MONITOREO DE RENDIMIENTO")
    y_position -= 35

    c.setFillColor(HexColor('#fef2f2') if not is_dark else HexColor('#1f0a0a'))
    c.roundRect(30, y_position - 170, width - 60, 170, 8, fill=1, stroke=0)
    c.setFillColor(HexColor('#991b1b') if not is_dark else HexColor('#fca5a5'))
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
        c.setFillColor(white if not is_dark else surface)
        c.roundRect(fc_x, y_position - 45, 80, 50, 5, fill=1, stroke=0)
        c.setFillColor(ink_muted)
        c.setFont("Helvetica", 8)
        c.drawCentredString(fc_x + 40, y_position - 12, label)
        c.setFillColor(ink)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(fc_x + 40, y_position - 32, str(value) if value else '-')
        c.setFillColor(ink_muted)
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
    c.setFillColor(HexColor('#991b1b') if not is_dark else HexColor('#fca5a5'))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(45, y_position, "Fases:")
    fc_x = 90
    for label, value in fc_fases:
        c.setFillColor(ink_muted)
        c.setFont("Helvetica", 8)
        c.drawString(fc_x, y_position, f"{label}: ")
        c.setFont("Helvetica-Bold", 8)
        c.drawString(fc_x + 35, y_position, str(value) if value else '-')
        fc_x += 70

    y_position -= 25
    c.setFillColor(HexColor('#991b1b') if not is_dark else HexColor('#fca5a5'))
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
        c.setFillColor(ink_muted)
        c.setFont("Helvetica", 8)
        c.drawString(estado_x, y_position, f"{label}: ")
        c.setFillColor(ink)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(estado_x + 75, y_position, f"{value}{unit}")
        estado_x += 130

    y_position -= 50

    if retroalimentacion:
        if y_position < 100:
            c.showPage()
            if is_dark:
                c.setFillColor(bg_color); c.rect(0, 0, width, height, fill=1, stroke=0)
            y_position = height - 50
        c.setFillColor(HexColor('#7c3aed'))
        c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(45, y_position - 7, "OBSERVACIONES Y RETROALIMENTACIÓN")
        y_position -= 35
        c.setFillColor(HexColor('#f5f3ff') if not is_dark else HexColor('#1a0f2e'))
        c.roundRect(30, y_position - 50, width - 60, 50, 5, fill=1, stroke=0)
        c.setFillColor(HexColor('#4c1d95') if not is_dark else HexColor('#c4b5fd'))
        c.setFont("Helvetica", 10)
        text_lines = [retroalimentacion[i:i+80] for i in range(0, len(retroalimentacion), 80)]
        text_y = y_position - 20
        for line in text_lines[:3]:
            c.drawString(45, text_y, line)
            text_y -= 15

    c.setFillColor(HexColor('#1e293b') if not is_dark else HexColor('#000000'))
    c.rect(0, 0, width, 35, fill=1, stroke=0)
    try:
        from reportlab.lib.utils import ImageReader
        c.drawImage(ImageReader(_SCALE_LOGO_PATH), 10, 6, width=23, height=23,
                    mask='auto', preserveAspectRatio=True)
    except Exception:
        pass
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(40, 15, "LordTraining · Sistema de Gestión Deportiva")
    c.setFont("Helvetica", 8)
    c.drawString(40, 5, datetime.now().strftime('%d/%m/%Y %H:%M'))
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(width - 40, 15, "Sesión de entrenamiento")

    c.save()
    buffer.seek(0)
    return buffer.read()


# ============ HERO LAYOUT (Playwright + boards-pdf style) ============

def _cap_color(cap: str, accent: str) -> Tuple[str, str]:
    c = (cap or "").strip().lower()
    mapping = {
        "fuerza":       ("#ef4444", "Fuerza"),
        "resistencia":  ("#3b82f6", "Resistencia"),
        "velocidad":    ("#f59e0b", "Velocidad"),
        "flexibilidad": ("#10b981", "Flexibilidad"),
        "coordinacion": ("#8b5cf6", "Coordinación"),
        "coordinación": ("#8b5cf6", "Coordinación"),
        "potencia":     ("#ec4899", "Potencia"),
        "tecnica":      ("#14b8a6", "Técnica"),
        "técnica":      ("#14b8a6", "Técnica"),
    }
    return mapping.get(c, (accent, (cap or "—").title()))


def _build_session_html_hero(
    session_data: Dict[str, Any],
    athlete_name: str,
    meso_name: str = "",
    micro_name: str = "",
    week_number: Any = None,
    theme: str = "light",
) -> str:
    """HTML para layout 'Pizarras' (boards hero) usado por Playwright."""
    detailed = session_data.get("detailedData", {}) or {}
    session_name = (detailed.get("sessionName")
                    or session_data.get("sessionName")
                    or session_data.get("dayName")
                    or session_data.get("name")
                    or "Sesión de entrenamiento")
    objetivos = detailed.get("objetivos", {}) or {}
    objetivo_general = objetivos.get("general") or objetivos.get("principal") or ""
    objetivos_especificos = objetivos.get("especificos") or objetivos.get("secundarios") or []
    if isinstance(objetivos_especificos, str):
        objetivos_especificos = [objetivos_especificos]

    fases_dict = detailed.get("fases", {}) or {}
    fase_order = [
        ("inicial",   "Fase Inicial",   "#10b981"),
        ("principal", "Fase Principal", "#f59e0b"),
        ("final",     "Fase Final",     "#3b82f6"),
    ]

    is_dark = theme == "dark"
    bg = "#0a0a0f" if is_dark else "#f5f7f2"
    surface = "#111118" if is_dark else "#ffffff"
    ink = "#e5e7eb" if is_dark else "#0f172a"
    ink_muted = "#94a3b8" if is_dark else "#64748b"
    border = "rgba(255,255,255,0.10)" if is_dark else "#e2e8f0"
    accent = "#c8f700"
    court_bg = ("#2d5f3e" if is_dark else
                "radial-gradient(ellipse at center, #dcefd2 0%, #c6e5b5 60%, #b3d9a1 100%)")
    court_border = "rgba(255,255,255,0.25)" if is_dark else "rgba(22,101,52,0.30)"
    chip_bg = "rgba(255,255,255,0.06)" if is_dark else "rgba(15,23,42,0.05)"
    chip_border = "rgba(255,255,255,0.10)" if is_dark else "rgba(15,23,42,0.10)"

    def esc(v):
        if v is None: return ""
        return _html.escape(str(v))

    cards_parts = []
    total_acts = 0
    for fase_key, fase_label, fase_color in fase_order:
        fase = fases_dict.get(fase_key, {}) or {}
        acts = fase.get("actividades", []) or []
        if not acts:
            continue
        cards_parts.append(f"""
          <div class="fase-banner" style="--fase:{fase_color};">
            <span class="fase-dot"></span>
            <span class="fase-label">{esc(fase_label)}</span>
            <span class="fase-count">{len(acts)} ejercicio{'s' if len(acts) != 1 else ''}</span>
          </div>
        """)
        cards_parts.append('<div class="cards-grid">')
        for i, act in enumerate(acts, 1):
            total_acts += 1
            board_svg = (act.get("boardThumbnail") or "").strip()
            board_inner = (
                f'<div class="court">{board_svg}</div>'
                if board_svg
                else '<div class="court empty"><span>Sin pizarra asignada</span></div>'
            )
            cap_color, cap_label = _cap_color(act.get("capacidadFisica"), accent)
            series_v = act.get('series', '—')
            reps_v = act.get('repeticiones', '—')
            int_v = act.get('intensidad', '—')
            vol_v = act.get('volumen', '—')
            desc = act.get("descripcion") or ""
            int_display = (f"{esc(int_v)}%" if int_v not in (None, '', '—') else '—')
            cards_parts.append(f"""
              <article class="card" style="--fase:{fase_color};">
                <div class="card-head">
                  <span class="idx" style="background:{fase_color};">{i:02d}</span>
                  <div class="card-title">
                    <h3>{esc(act.get('ejercicio') or act.get('nombre') or 'Ejercicio')}</h3>
                    {f'<p class="card-desc">{esc(desc)}</p>' if desc else ''}
                  </div>
                  <span class="cap-chip" style="color:{cap_color};border-color:{cap_color};">
                    {esc(cap_label)}
                  </span>
                </div>
                <div class="board-hero">
                  {board_inner}
                </div>
                <div class="stats">
                  <div class="stat"><span class="k">Series</span><span class="v">{esc(series_v)}</span></div>
                  <div class="stat"><span class="k">Reps.</span><span class="v">{esc(reps_v)}</span></div>
                  <div class="stat"><span class="k">Intensidad</span><span class="v">{int_display}</span></div>
                  <div class="stat"><span class="k">Volumen</span><span class="v">{esc(vol_v)}</span></div>
                </div>
              </article>
            """)
        cards_parts.append('</div>')
    if not cards_parts:
        cards_parts.append('<div class="empty-note">Esta sesión no tiene actividades aún.</div>')

    objetivos_html = ""
    if objetivo_general or objetivos_especificos:
        items = ""
        if objetivo_general:
            items += f'<li><strong>General:</strong> {esc(objetivo_general)}</li>'
        for o in objetivos_especificos:
            if o:
                items += f"<li>{esc(o)}</li>"
        objetivos_html = f'<section class="objectives"><h2>Objetivos</h2><ul>{items}</ul></section>'

    extra_meta = " · ".join([str(x) for x in [meso_name, micro_name, f"Semana {week_number}" if week_number is not None else ""] if x])
    scale_b64 = _scale_logo_b64()
    brand_logo_html = (f'<img class="brand-logo" src="data:image/png;base64,{scale_b64}" alt=""/>'
                       if scale_b64 else '')
    footer_logo_html = (f'<img src="data:image/png;base64,{scale_b64}" alt=""/>'
                        if scale_b64 else '')

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<title>LordTraining · {esc(session_name)}</title>
<style>
  @page {{ size: A4; margin: 0; }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin:0; padding:0; background:{bg}; color:{ink};
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  body {{ min-height: 297mm; background:{bg}; }}
  .page {{ padding: 10mm 9mm; max-width: 100%; background:{bg}; min-height: 297mm; page-break-after: always; }}
  .page:last-child {{ page-break-after: auto; }}
  header.hd {{ display:flex; align-items:flex-end; justify-content:space-between;
    border-bottom: 2px solid {accent}; padding-bottom: 9px; margin-bottom: 10px; }}
  .hd-left {{ display:flex; align-items:flex-start; gap:11px; }}
  .brand-logo {{ width:48px; height:48px; object-fit:contain; flex-shrink:0; margin-top:2px;
    filter: drop-shadow(0 2px 5px rgba(0,0,0,0.18)); }}
  .brand {{ font-size: 9px; letter-spacing: 0.32em; color: {accent};
    font-weight: 900; text-transform: uppercase; }}
  .title {{ font-size: 20px; font-weight: 900; color: {ink};
    letter-spacing: -0.015em; margin: 2px 0 4px 0; }}
  .meta {{ font-size: 9.5px; color: {ink_muted}; display:flex; gap:12px; flex-wrap:wrap; }}
  .meta strong {{ color: {ink}; font-weight: 700; }}
  .tag {{ display:inline-block; padding:3px 10px; border-radius:999px;
    background:{accent}; color:#0a0a0f; font-weight:900; font-size:9px;
    letter-spacing:0.14em; text-transform:uppercase; }}
  section.objectives {{ background: {surface}; border:1px solid {border};
    border-left:3px solid {accent}; border-radius:6px; padding:7px 12px; margin-bottom: 10px; }}
  section.objectives h2 {{ font-size:9px; letter-spacing:0.22em;
    text-transform: uppercase; color:{ink_muted}; margin:0 0 3px 0; font-weight:800; }}
  section.objectives ul {{ margin:0; padding-left:16px; font-size:10px; line-height:1.45; }}
  .fase-banner {{ display:flex; align-items:center; gap:10px;
    margin: 10px 0 7px 0; padding: 5px 10px; border-radius: 5px;
    background: linear-gradient(90deg, var(--fase)18, transparent 70%);
    border-left: 3px solid var(--fase); }}
  .fase-dot {{ width:8px; height:8px; border-radius:999px; background:var(--fase);
    box-shadow: 0 0 0 3px var(--fase)33; }}
  .fase-label {{ color:var(--fase); font-weight:900; font-size:10px;
    letter-spacing:0.22em; text-transform:uppercase; }}
  .fase-count {{ color:{ink_muted}; font-size:9px; font-weight:600; margin-left:auto; }}
  .cards-grid {{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom: 8px; }}
  .card {{ background: {surface}; border: 1px solid {border};
    border-top: 2px solid var(--fase); border-radius: 7px; overflow: hidden;
    display:flex; flex-direction:column; page-break-inside: avoid; break-inside: avoid; }}
  .card-head {{ display:flex; align-items:flex-start; gap:7px; padding: 7px 9px 5px 9px; }}
  .idx {{ display:inline-flex; align-items:center; justify-content:center;
    width: 22px; height: 22px; border-radius: 5px; color: #0a0a0f;
    font-weight: 900; font-size: 10px; font-variant-numeric: tabular-nums; flex-shrink:0; }}
  .card-title {{ flex: 1; min-width: 0; }}
  .card-title h3 {{ margin: 0; font-size: 11.5px; font-weight: 800; color: {ink};
    line-height: 1.2; letter-spacing: -0.01em; }}
  .card-desc {{ margin: 1px 0 0 0; font-size: 8.5px; color: {ink_muted}; line-height: 1.35; }}
  .cap-chip {{ font-size: 8px; font-weight: 900; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 2px 6px; border: 1px solid;
    border-radius: 999px; white-space: nowrap; flex-shrink: 0; align-self:flex-start; }}
  .board-hero {{ margin: 0 9px; height: 336px; border-radius: 6px;
    background: {court_bg}; border: 1px solid {court_border};
    overflow: hidden; position: relative; }}
  .court {{ width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }}
  .court svg {{ width: 100%; height: 100%; max-width: 100%; max-height: 100%; display: block; }}
  .court.empty {{ font-size: 9px; font-style: italic;
    color: {'#86efac' if is_dark else '#166534'};
    letter-spacing: 0.06em; text-transform: uppercase; }}
  .stats {{ display:grid; grid-template-columns: repeat(4, 1fr); gap:4px; padding: 7px 9px 9px 9px; }}
  .stat {{ display:flex; flex-direction:column; align-items:center;
    padding: 4px 2px; border-radius: 4px; background: {chip_bg}; border: 1px solid {chip_border}; }}
  .stat .k {{ font-size: 7.5px; color: {ink_muted};
    text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }}
  .stat .v {{ font-size: 12px; color: {ink}; font-weight: 900;
    font-variant-numeric: tabular-nums; margin-top: 1px; line-height: 1; }}
  .empty-note {{ text-align:center; color:{ink_muted}; font-style: italic;
    padding: 28px; border: 1px dashed {border}; border-radius: 8px; }}
  footer.ft {{ margin-top: 10px; font-size: 8px; color: {ink_muted};
    text-align: right; border-top: 1px solid {border}; padding-top: 5px;
    letter-spacing: 0.08em; text-transform: uppercase;
    display:flex; align-items:center; justify-content:flex-end; gap:6px; }}
  footer.ft img {{ width:14px; height:14px; object-fit:contain; opacity:0.85; }}
</style></head>
<body>
  <div class="page">
    <header class="hd">
      <div class="hd-left">
        {brand_logo_html}
        <div>
          <div class="brand">LordTraining · Plan de Sesión</div>
          <h1 class="title">{esc(session_name)}</h1>
          <div class="meta">
            <span><strong>Deportista:</strong> {esc(athlete_name)}</span>
            {f'<span>{esc(extra_meta)}</span>' if extra_meta else ''}
            <span><strong>Ejercicios:</strong> {total_acts}</span>
          </div>
        </div>
      </div>
      <div class="tag">Pizarras {('Oscuras' if is_dark else 'Claras')}</div>
    </header>
    {objetivos_html}
    {''.join(cards_parts)}
    <footer class="ft">{footer_logo_html}<span>Generado con LordTraining</span></footer>
  </div>
</body></html>"""


async def _render_hero_pdf_bytes(htmls: List[str]) -> bytes:
    """Renderiza un PDF a partir de uno o más bloques HTML concatenados como páginas (WeasyPrint)."""
    # Concatenar HTMLs: cada uno tiene su propio <html>, los reducimos a un body con secciones .page
    # Como cada html ya tiene .page con page-break-after, juntamos los body extrayendo el contenido.
    if len(htmls) == 1:
        merged = htmls[0]
    else:
        # Extract <body> ... </body> from each, wrap in single doc using the head of the first.
        bodies = []
        for h in htmls:
            start = h.find('<body>')
            end = h.find('</body>')
            if start >= 0 and end >= 0:
                bodies.append(h[start + len('<body>'):end])
            else:
                bodies.append(h)
        head_end = htmls[0].find('</head>')
        head_html = htmls[0][:head_end + len('</head>')] if head_end >= 0 else htmls[0]
        merged = head_html + '<body>' + ''.join(bodies) + '</body></html>'

    import asyncio
    from routes.pdf_render import html_to_pdf
    return await asyncio.to_thread(html_to_pdf, merged, True)


# ============ COMMON BUILD ============

async def _generate_pdfs_for_request(
    plan: Dict[str, Any],
    session_ids: List[str],
    theme: str,
    layout: str,
    athlete_name: str,
) -> List[Tuple[str, bytes]]:
    """Devuelve [(filename, bytes), ...] preservando el orden de plan."""
    requested = set(session_ids)
    found: List[tuple] = []
    for s, meso, micro, week in _walk_plan_sessions(plan):
        sid = s.get("id")
        if sid and sid in requested:
            found.append((s, meso, micro, week))
    if not found:
        raise HTTPException(404, "Ninguna de las sesiones seleccionadas existe en el plan")

    pdfs: List[Tuple[str, bytes]] = []
    if layout == "hero":
        for s, meso, micro, week in found:
            html = _build_session_html_hero(s, athlete_name, meso, micro, week, theme)
            pdf = await _render_hero_pdf_bytes([html])
            name_slug = _slugify(s.get('name') or s.get('day') or 'sesion')
            date_part = s.get('date') or ''
            fname = f"sesion_{date_part}_{name_slug}_hero_{theme}.pdf" if date_part else f"sesion_{name_slug}_hero_{theme}.pdf"
            pdfs.append((fname, pdf))
    else:
        # classic — sync, run in default executor pool
        loop = asyncio.get_event_loop()
        for s, meso, micro, week in found:
            pdf = await loop.run_in_executor(
                None,
                lambda s=s, meso=meso, micro=micro, week=week:
                _build_session_pdf_classic(s, athlete_name, meso, micro, week, theme),
            )
            name_slug = _slugify(s.get('name') or s.get('day') or 'sesion')
            date_part = s.get('date') or ''
            fname = f"sesion_{date_part}_{name_slug}_classic_{theme}.pdf" if date_part else f"sesion_{name_slug}_classic_{theme}.pdf"
            pdfs.append((fname, pdf))
    return pdfs


def _combine_or_zip(pdfs: List[Tuple[str, bytes]], plan_name: str, fmt: str, theme: str, layout: str) -> Tuple[bytes, str, str]:
    plan_slug = _slugify(plan_name or 'plan')
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
        return buf.read(), "application/zip", f"sesiones_{plan_slug}_{layout}_{theme}.zip"

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
    return out.read(), "application/pdf", f"sesiones_{plan_slug}_{layout}_{theme}.pdf"


# ============ ENDPOINTS ============

@router.post("/generate")
async def generate_sessions_export(req: SessionsExportRequest, user=Depends(get_current_user_dep())):
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
    if (req.layout or "classic") not in ("classic", "hero"):
        raise HTTPException(400, "Layout inválido (usa 'classic' o 'hero')")
    if (req.theme or "light") not in ("light", "dark"):
        raise HTTPException(400, "Tema inválido (usa 'light' o 'dark')")

    pdfs = await _generate_pdfs_for_request(
        plan=plan,
        session_ids=req.session_ids,
        theme=req.theme or "light",
        layout=req.layout or "classic",
        athlete_name=req.athlete_name or "Atleta",
    )
    content, media, filename = _combine_or_zip(pdfs, plan.get('name'), fmt, req.theme or "light", req.layout or "classic")
    return Response(content=content, media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.post("/share")
async def create_sessions_share(req: SessionsShareRequest, user=Depends(get_current_user_dep())):
    """Crea un share_id público para la selección de sesiones (PDF combinado / ZIP descargable sin auth)."""
    uid = user.get("id") or user.get("user_id")
    plan = await _db.training_plans.find_one(
        {"id": req.plan_id, "$or": [{"user_id": uid}, {"coach_id": uid}]},
        {"_id": 0}
    )
    if not plan:
        raise HTTPException(404, "Plan no encontrado")
    if not req.session_ids:
        raise HTTPException(400, "Debes seleccionar al menos una sesión")

    share_id = f"SXB-{secrets.token_hex(4)}"
    doc = {
        "share_id": share_id,
        "plan_id": req.plan_id,
        "user_id": uid,
        "session_ids": req.session_ids,
        "theme": req.theme or "light",
        "layout": req.layout or "classic",
        "athlete_name": req.athlete_name or "Atleta",
        "plan_name": plan.get("name") or "Plan",
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
    }
    await _db.sessions_export_shares.insert_one(doc)
    return {"share_id": share_id, "expires_in_days": 30}


@router.get("/shared/{share_id}/pdf")
async def download_shared_sessions_pdf(share_id: str, format: str = "combined"):
    """Descarga pública del bundle (sin auth)."""
    doc = await _db.sessions_export_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Bundle no encontrado")
    expires_at = doc.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(410, "El enlace ha expirado")

    plan = await _db.training_plans.find_one({"id": doc["plan_id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan no encontrado")

    fmt = (format or "combined").lower()
    if fmt not in ("combined", "zip"):
        raise HTTPException(400, "Formato inválido")

    pdfs = await _generate_pdfs_for_request(
        plan=plan,
        session_ids=doc["session_ids"],
        theme=doc.get("theme", "light"),
        layout=doc.get("layout", "classic"),
        athlete_name=doc.get("athlete_name", "Atleta"),
    )
    content, media, filename = _combine_or_zip(
        pdfs, doc.get("plan_name"), fmt, doc.get("theme", "light"), doc.get("layout", "classic")
    )
    return Response(content=content, media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/shared/{share_id}")
async def view_shared_sessions(share_id: str):
    """Vista HTML pública NO editable (read-only) de las sesiones compartidas.
    Usa siempre el layout 'hero' para presentación visual con pizarras.
    Incluye banner 'DOCUMENTO COMPARTIDO' + botón 'Descargar PDF'."""
    from fastapi.responses import HTMLResponse
    doc = await _db.sessions_export_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Enlace no encontrado")
    expires_at = doc.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(410, "El enlace ha expirado")

    plan = await _db.training_plans.find_one({"id": doc["plan_id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan no encontrado")

    requested = set(doc["session_ids"])
    found = []
    for s, meso, micro, week in _walk_plan_sessions(plan):
        sid = s.get("id")
        if sid and sid in requested:
            found.append((s, meso, micro, week))

    theme = doc.get("theme", "light")
    athlete = doc.get("athlete_name", "Atleta")

    # Render todas las sesiones como HTML hero, concatenadas como secciones de página
    section_htmls = []
    for s, meso, micro, week in found:
        section_htmls.append(_build_session_html_hero(s, athlete, meso, micro, week, theme))

    # Tomar el head del primero, body de todos
    if not section_htmls:
        body_inner = '<div style="padding:40px;text-align:center;color:#64748b;">Sin sesiones disponibles.</div>'
        head_html = '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>LordTraining · Compartido</title></head>'
    else:
        first = section_htmls[0]
        head_end = first.find('</head>')
        head_html = first[:head_end + len('</head>')]
        bodies = []
        for h in section_htmls:
            bs = h.find('<body>')
            be = h.find('</body>')
            if bs >= 0 and be >= 0:
                bodies.append(h[bs + len('<body>'):be])
        body_inner = ''.join(bodies)

    is_dark = theme == "dark"
    bg = "#0a0a0f" if is_dark else "#f5f7f2"
    ink = "#e5e7eb" if is_dark else "#0f172a"
    pdf_url = f"/api/sessions-export/shared/{share_id}/pdf?format=combined"
    zip_url = f"/api/sessions-export/shared/{share_id}/pdf?format=zip"

    banner = f"""
    <div id="share-ribbon" style="position:sticky;top:0;z-index:9999;
      background:linear-gradient(90deg,#0f172a 0%,#1e293b 100%);color:#fff;
      padding:12px 20px;display:flex;align-items:center;justify-content:space-between;
      gap:14px;box-shadow:0 2px 14px rgba(0,0,0,0.18);font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
      <div style="display:flex;align-items:center;gap:12px;min-width:0;">
        <span style="background:#CCFF00;color:#0a0a0f;font-weight:900;font-size:10px;
          letter-spacing:0.18em;padding:4px 10px;border-radius:999px;flex-shrink:0;">
          DOCUMENTO COMPARTIDO
        </span>
        <span style="font-size:13px;font-weight:600;opacity:0.95;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          {_html.escape(doc.get('plan_name') or 'Plan')} · {len(found)} sesión{'es' if len(found) != 1 else ''}
        </span>
        <span style="font-size:11px;color:#94a3b8;flex-shrink:0;">Solo lectura</span>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <a href="{pdf_url}" download
          style="background:#CCFF00;color:#0a0a0f;font-weight:800;font-size:12px;
            padding:7px 14px;border-radius:6px;text-decoration:none;
            display:inline-flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          PDF combinado
        </a>
        <a href="{zip_url}" download
          style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.3);
            font-weight:700;font-size:12px;padding:7px 12px;border-radius:6px;
            text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          ZIP
        </a>
      </div>
    </div>
    """

    # Override @page (no aplicable en pantalla); habilitar scroll natural
    style_override = f"""
    <style>
      @page {{ size: A4; margin: 8mm; }}
      html, body {{ background:{bg} !important; color:{ink} !important;
        height:auto !important; min-height:100vh !important;
        margin:0 !important; padding:0 !important; }}
      body {{ overflow-x:hidden; }}
      .page {{ max-width: 1100px; margin: 0 auto; padding: 18px 22px !important;
        min-height: auto !important; box-shadow: 0 2px 18px rgba(0,0,0,0.06); }}
      .page + .page {{ margin-top: 24px; }}
      @media print {{ #share-ribbon {{ display: none !important; }} }}
    </style>
    """

    full = f"{head_html}{style_override}<body>{banner}{body_inner}</body></html>"
    return HTMLResponse(content=full)

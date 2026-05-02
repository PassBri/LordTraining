"""
Rutas de exportación y compartición del Análisis del Plan Anterior.
- PDF (estilo Whitepaper PDI) vía Playwright
- Link público compartible (HTML + PDF) sin autenticación
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, HTMLResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import os
import base64
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/plan-data/previous-analysis", tags=["previous-analysis-export"])

# Mongo
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_analysis = _db["plan_previous_analysis"]
_shares = _db["plan_previous_analysis_shares"]
_plans = _db["training_plans"]


def _get_user_id(user):
    return user.get("id") or user.get("user_id")


def get_current_user_dep():
    from server import get_current_user  # lazy to avoid circular
    return get_current_user


# ========================= HTML TEMPLATE =========================
CUMPLIMIENTO_LABELS = {
    "total": ("Cumplido Total", "#10B981", 100),
    "parcial": ("Cumplido Parcial", "#F59E0B", 60),
    "no": ("No Cumplido", "#EF4444", 20),
}


MODEL_PROFILES = {
    "atr": {"general": 85, "fisica": 92, "tecnica": 78, "tactica": 75, "psicologica": 65, "teorica": 55, "reglamento": 60},
    "issurin": {"general": 85, "fisica": 92, "tecnica": 80, "tactica": 82, "psicologica": 68, "teorica": 60, "reglamento": 65},
    "pdi": {"general": 88, "fisica": 82, "tecnica": 85, "tactica": 85, "psicologica": 88, "teorica": 85, "reglamento": 80},
    "itrain_pdi": {"general": 88, "fisica": 82, "tecnica": 85, "tactica": 85, "psicologica": 88, "teorica": 85, "reglamento": 80},
    "lineal": {"general": 80, "fisica": 88, "tecnica": 72, "tactica": 65, "psicologica": 55, "teorica": 50, "reglamento": 55},
    "tradicional": {"general": 80, "fisica": 88, "tecnica": 72, "tactica": 65, "psicologica": 55, "teorica": 50, "reglamento": 55},
    "ondulante": {"general": 82, "fisica": 85, "tecnica": 78, "tactica": 72, "psicologica": 65, "teorica": 58, "reglamento": 60},
    "bloques": {"general": 85, "fisica": 88, "tecnica": 80, "tactica": 75, "psicologica": 65, "teorica": 60, "reglamento": 60},
    "polarizado": {"general": 82, "fisica": 90, "tecnica": 72, "tactica": 70, "psicologica": 65, "teorica": 55, "reglamento": 60},
}


def _cumpl_status(pct: int):
    """Deriva estado (label, color) a partir del porcentaje individual."""
    if pct >= 85:
        return ("Cumplido Total", "#10B981")
    if pct >= 40:
        return ("Cumplido Parcial", "#F59E0B")
    return ("No Cumplido", "#EF4444")

OBJ_LABELS = [
    ("general", "Objetivo General"),
    ("fisica", "Preparación Física"),
    ("tecnica", "Preparación Técnica"),
    ("tactica", "Preparación Táctica"),
    ("psicologica", "Preparación Psicológica"),
    ("teorica", "Preparación Teórica"),
    ("reglamento", "Reglamento del Deporte"),
]

IND_LABELS = [
    ("vo2max", "VO₂ Máx"),
    ("sentadilla", "1RM Sentadilla"),
    ("sprint", "Sprint 30m"),
    ("cmj", "CMJ (salto)"),
    ("flexibilidad", "Flexibilidad"),
]

LESION_LABELS = {
    "no": ("Sin lesiones", "#10B981"),
    "leve": ("Lesiones leves", "#F59E0B"),
    "moderada": ("Lesiones moderadas", "#F97316"),
    "grave": ("Lesiones graves", "#EF4444"),
}


def _esc(s) -> str:
    if s is None:
        return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _radar_svg(values, labels, size: int = 340, dark: bool = True, benchmark=None, benchmark_label: str = "") -> str:
    """Genera un gráfico radar SVG con N ejes de cumplimiento + benchmark opcional.
    values: lista de ints 0-100. labels: lista de nombres de eje. benchmark: lista opcional de ideales 0-100."""
    import math
    n = len(values)
    vb_w = int(size * 1.15)
    vb_h = size
    cx = vb_w / 2
    cy = vb_h / 2
    R = min(vb_w, vb_h) * 0.32
    grid_stroke = "rgba(255,255,255,0.15)" if dark else "#e2e8f0"
    axis_stroke = "rgba(255,255,255,0.22)" if dark else "#cbd5e1"
    label_fill = "#FFFFFF" if dark else "#0f172a"

    def _pt(radius, i):
        ang = -math.pi / 2 + (2 * math.pi / n) * i
        return (cx + radius * math.cos(ang), cy + radius * math.sin(ang))

    grid_polys = []
    for frac in (0.2, 0.4, 0.6, 0.8, 1.0):
        pts = [_pt(R * frac, i) for i in range(n)]
        d = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        grid_polys.append(
            f'<polygon points="{d}" fill="none" stroke="{grid_stroke}" stroke-width="1" />'
        )
    axes = []
    for i in range(n):
        x, y = _pt(R, i)
        axes.append(
            f'<line x1="{cx:.1f}" y1="{cy:.1f}" x2="{x:.1f}" y2="{y:.1f}" stroke="{axis_stroke}" stroke-width="1" />'
        )
    # Benchmark (ideal) polygon — drawn BEFORE values so it sits behind
    bench_poly = ""
    if benchmark:
        bpts = [_pt(R * (max(0, min(100, v)) / 100.0), i) for i, v in enumerate(benchmark)]
        bd = " ".join(f"{x:.1f},{y:.1f}" for x, y in bpts)
        bench_poly = (
            f'<polygon points="{bd}" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.65)" '
            f'stroke-width="1.5" stroke-dasharray="4 4" stroke-linejoin="round" />'
        )
    val_pts = [_pt(R * (max(0, min(100, v)) / 100.0), i) for i, v in enumerate(values)]
    val_d = " ".join(f"{x:.1f},{y:.1f}" for x, y in val_pts)
    dots = []
    for (x, y), v in zip(val_pts, values):
        _, c = _cumpl_status(v)
        dots.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{c}" stroke="#fff" stroke-width="1.5" />'
        )
    label_els = []
    for i, label in enumerate(labels):
        lx, ly = _pt(R * 1.32, i)
        anchor = "middle"
        if lx < cx - 12:
            anchor = "end"
        elif lx > cx + 12:
            anchor = "start"
        pct = values[i]
        _, color = _cumpl_status(pct)
        label_els.append(
            f'<text x="{lx:.1f}" y="{ly - 3:.1f}" text-anchor="{anchor}" '
            f'font-family="Helvetica, Arial, sans-serif" font-size="8" font-weight="700" fill="{label_fill}">{_esc(label)}</text>'
            f'<text x="{lx:.1f}" y="{ly + 9:.1f}" text-anchor="{anchor}" '
            f'font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="900" fill="{color}">{pct}%</text>'
        )
    return (
        f'<svg viewBox="0 0 {vb_w} {vb_h}" width="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">'
        f'<defs><linearGradient id="radarFill" x1="0" x2="1" y1="0" y2="1">'
        f'<stop offset="0%" stop-color="#CCFF00" stop-opacity="0.55"/>'
        f'<stop offset="100%" stop-color="#a3e635" stop-opacity="0.20"/>'
        f'</linearGradient></defs>'
        + "".join(grid_polys)
        + "".join(axes)
        + bench_poly
        + f'<polygon points="{val_d}" fill="url(#radarFill)" stroke="#CCFF00" stroke-width="2" stroke-linejoin="round" />'
        + "".join(dots)
        + "".join(label_els)
        + '</svg>'
    )


def _build_html(analysis_doc: dict, plan_name: str, share_id: Optional[str] = None, model_key: str = "", model_name: str = "") -> str:
    """Construye el HTML del análisis. Si share_id se provee, se marca como vista pública."""
    data = analysis_doc.get("data") or {}

    fecha_ini = data.get("fechaInicio") or "—"
    fecha_fin = data.get("fechaFinalizacion") or "—"
    duracion = data.get("duracionSemanas") or "—"
    objetivo = data.get("objetivoPrincipal") or "(Sin objetivo registrado)"
    cumpl = data.get("cumplimiento") or {}
    pct_global = data.get("porcentajeCumplimiento") or ""
    fortalezas = [f for f in (data.get("fortalezas") or []) if f]
    debilidades = [d for d in (data.get("debilidades") or []) if d]
    indicadores = data.get("indicadores") or {}
    lesiones_key = data.get("lesiones") or "no"
    desc_les = data.get("descripcionLesiones") or ""
    dias_perdidos = data.get("diasPerdidos") or "0"
    conclusiones = data.get("conclusiones") or ""
    recomendaciones = data.get("recomendaciones") or ""

    # --- Logos base64 ---
    brand_dir = "/app/frontend/public/brand"
    try:
        with open(f"{brand_dir}/itrain-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/itrain-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        full_b64 = icon_b64 = ""

    # --- Cumplimiento rows (nuevo formato: {descripcion, porcentaje}; compat con formato antiguo: string) ---
    cumpl_rows = []
    radar_values = []
    radar_labels = []
    for key, label in OBJ_LABELS:
        val = cumpl.get(key)
        if isinstance(val, dict):
            try:
                pct = max(0, min(100, int(val.get("porcentaje") or 0)))
            except Exception:
                pct = 0
            desc = val.get("descripcion") or ""
        else:
            # Compat: viejo formato string "total"/"parcial"/"no"
            legacy = CUMPLIMIENTO_LABELS.get(val or "parcial", CUMPLIMIENTO_LABELS["parcial"])
            pct = legacy[2]
            desc = ""
        lbl, color = _cumpl_status(pct)
        desc_html = f'<div class="cumpl-desc">{_esc(desc)}</div>' if desc else ""
        # Para el radar: acortar etiquetas largas
        short_map = {
            "Objetivo General": "Obj. General",
            "Preparación Física": "Prep. Física",
            "Preparación Técnica": "Prep. Técnica",
            "Preparación Táctica": "Prep. Táctica",
            "Preparación Psicológica": "Prep. Psicológica",
            "Preparación Teórica": "Prep. Teórica",
            "Reglamento del Deporte": "Reglamento",
        }
        short = short_map.get(label, label)
        radar_values.append(pct)
        radar_labels.append(short)
        cumpl_rows.append(
            f'''<tr class="cumpl-row">
              <td style="width:28%"><strong>{_esc(label)}</strong>{desc_html}</td>
              <td style="width:56%">
                <div class="bar-wrap">
                  <div class="bar-bg"><div class="bar-fg" style="width:{pct}%;background:linear-gradient(90deg, {color}aa, {color})"></div></div>
                </div>
              </td>
              <td style="width:16%;text-align:right"><span class="pct-big" style="color:{color}">{pct}%</span><br/><span class="pill" style="background:{color}20;color:{color};border:1px solid {color}60;">{_esc(lbl)}</span></td>
            </tr>'''
        )
    cumpl_html = "".join(cumpl_rows)
    # Benchmark del modelo de periodización
    mk = (model_key or "").lower().replace(" ", "_").replace("-", "_")
    bench = MODEL_PROFILES.get(mk) or MODEL_PROFILES.get("atr")
    bench_values = [bench.get(key, 0) for key, _ in OBJ_LABELS] if bench else None
    bench_label = model_name or model_key or "ATR"
    radar_svg_html = _radar_svg(radar_values, radar_labels, size=340, benchmark=bench_values, benchmark_label=bench_label)

    # --- Indicadores rows ---
    ind_rows = []
    has_ind = False
    for key, label in IND_LABELS:
        ind = indicadores.get(key) or {}
        ini = ind.get("inicial") or ""
        fin = ind.get("final") or ""
        delta = ind.get("delta") or ""
        if ini or fin or delta:
            has_ind = True
        delta_str = _esc(delta)
        delta_color = "#10B981" if (delta and str(delta).startswith(("+", "1", "2", "3", "4", "5", "6", "7", "8", "9"))) else ("#EF4444" if delta and str(delta).startswith("-") else "#64748b")
        ind_rows.append(
            f'<tr><td>{_esc(label)}</td><td style="text-align:center">{_esc(ini) or "—"}</td>'
            f'<td style="text-align:center">{_esc(fin) or "—"}</td>'
            f'<td style="text-align:center;color:{delta_color};font-weight:700">{delta_str or "—"}</td></tr>'
        )
    indicadores_html = "".join(ind_rows)

    # --- Fortalezas / Debilidades ---
    fort_html = "".join(f'<li>{_esc(f)}</li>' for f in fortalezas) or '<li class="muted">Sin fortalezas registradas.</li>'
    deb_html = "".join(f'<li>{_esc(d)}</li>' for d in debilidades) or '<li class="muted">Sin debilidades registradas.</li>'

    les_lbl, les_color = LESION_LABELS.get(lesiones_key, LESION_LABELS["no"])

    pct_bar = ""
    try:
        pct_val = max(0, min(100, int(pct_global))) if pct_global != "" else None
    except Exception:
        pct_val = None
    if pct_val is not None:
        pct_bar = f'''<div class="pct-card">
          <div class="pct-label">% Global de Cumplimiento</div>
          <div class="pct-num">{pct_val}<span>%</span></div>
          <div class="pct-bar"><div style="width:{pct_val}%"></div></div>
        </div>'''

    share_banner = ""
    if share_id:
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por iTrain.app</div>'

    no_ind_html = "" if has_ind else '<tr><td colspan="4" class="muted" style="text-align:center;padding:14pt">Sin indicadores registrados.</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Análisis del Plan Anterior · iTrain</title>
<style>
  @page {{ size: A4; margin: 18mm 15mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.55; font-size: 11pt; }}
  h1 {{ font-size: 30pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4pt; color: #0f172a; }}
  h2 {{ font-size: 15pt; font-weight: 800; margin-top: 18pt; margin-bottom: 6pt; color: #0f172a; border-bottom: 2px solid #CCFF00; padding-bottom: 4pt; }}
  p  {{ margin: 6pt 0; }}
  .hero {{ background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%); color: #fff; padding: 32pt 28pt; border-radius: 10pt; margin-bottom: 16pt; }}
  .hero h1 {{ color: #fff; }}
  .hero .subtitle {{ color: rgba(255,255,255,0.75); font-size: 13pt; margin-top: 4pt; }}
  .brand-mark {{ display: flex; align-items: center; gap: 10pt; margin-bottom: 16pt; }}
  .brand-mark img {{ height: 34pt; width: 132pt; max-width: none; display: block; object-fit: contain; }}
  .badge {{ display: inline-block; background: #CCFF00; color: #0f172a; padding: 4pt 10pt; border-radius: 20pt; font-size: 9pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 10pt; }}
  .meta {{ display:flex; flex-wrap:wrap; gap:18pt; margin-top:14pt; color:rgba(255,255,255,0.8); font-size:10pt; }}
  .meta strong {{ color: #CCFF00; display:block; font-size:8pt; text-transform:uppercase; letter-spacing:1px; font-weight:800; margin-bottom:3pt; }}
  table {{ width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10pt; }}
  th, td {{ text-align: left; padding: 6pt 8pt; border-bottom: 1px solid #e2e8f0; }}
  th {{ background: #f1f5f9; font-weight: 700; color: #475569; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; }}
  .stat-bar {{ background: #e2e8f0; height: 8pt; border-radius: 4pt; overflow: hidden; display: inline-block; width: 120pt; vertical-align: middle; }}
  .stat-bar > div {{ height: 100%; border-radius: 4pt; }}
  .bar-wrap {{ padding: 2pt 0; }}
  .bar-bg {{ background: #e2e8f0; height: 10pt; border-radius: 5pt; overflow: hidden; }}
  .bar-fg {{ height: 100%; border-radius: 5pt; }}
  .cumpl-row td {{ vertical-align: middle; padding: 8pt 6pt; }}
  .cumpl-desc {{ font-size: 8.5pt; color: #64748b; margin-top: 2pt; font-style: italic; line-height: 1.35; }}
  .pct-big {{ font-size: 14pt; font-weight: 900; letter-spacing: -0.02em; }}
  .radar-row {{ display: grid; grid-template-columns: 270pt 1fr; gap: 12pt; align-items: start; margin-top: 8pt; }}
  .radar-wrap {{ background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 10pt; padding: 10pt 8pt; color: #fff; }}
  .radar-title {{ color: #CCFF00; font-size: 9pt; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; text-align: center; margin-bottom: 4pt; }}
  .radar-legend {{ display: flex; justify-content: center; gap: 10pt; margin-bottom: 4pt; font-size: 7.5pt; color: rgba(255,255,255,0.85); }}
  .leg-item {{ display: inline-flex; align-items: center; gap: 4pt; font-weight: 700; letter-spacing: 0.5px; }}
  .leg-swatch {{ display: inline-block; width: 10pt; height: 10pt; border-radius: 2pt; }}
  .leg-real {{ background: #CCFF00; }}
  .leg-ideal {{ background: rgba(255,255,255,0.12); border: 1px dashed rgba(255,255,255,0.6); }}
  .radar-table {{ min-width: 0; }}
  .radar-table table {{ margin: 0; }}
  .pill {{ display:inline-block; padding:2pt 8pt; border-radius: 20pt; font-size:9pt; font-weight:700; }}
  ul {{ margin: 4pt 0 4pt 16pt; padding: 0; }}
  li {{ margin: 3pt 0; }}
  .muted {{ color: #94a3b8; font-style: italic; }}
  .callout {{ background: #0f172a; color: #fff; padding: 12pt 16pt; border-radius: 8pt; margin: 10pt 0; }}
  .callout strong {{ color: #CCFF00; }}
  .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; }}
  .card {{ background: #f8fafc; border-radius: 8pt; padding: 12pt 14pt; border-left: 4pt solid #CCFF00; }}
  .card.bad {{ border-left-color: #F59E0B; background: #fffbeb; }}
  .card h3 {{ margin: 0 0 6pt; font-size: 11pt; color: #0f172a; }}
  .pct-card {{ background: linear-gradient(135deg, #CCFF00 0%, #a3e635 100%); border-radius: 10pt; padding: 14pt 16pt; margin: 10pt 0; color: #0f172a; }}
  .pct-label {{ font-size:9pt; text-transform:uppercase; letter-spacing:1px; font-weight:800; }}
  .pct-num {{ font-size: 36pt; font-weight: 900; line-height: 1; }}
  .pct-num span {{ font-size:16pt; font-weight:700; margin-left:2pt; }}
  .pct-bar {{ background: rgba(0,0,0,0.12); height: 8pt; border-radius: 4pt; overflow: hidden; margin-top: 6pt; }}
  .pct-bar > div {{ height: 100%; background: #0f172a; border-radius: 4pt; }}
  .lesion-box {{ border: 1px solid {les_color}; background: {les_color}12; padding: 10pt 14pt; border-radius: 8pt; }}
  .lesion-box strong {{ color: {les_color}; }}
  .footer-brand {{ display: flex; align-items: center; justify-content: center; gap: 8pt; color: #94a3b8; font-size: 9pt; margin-top: 24pt; padding-top: 10pt; border-top: 1px solid #e2e8f0; }}
  .footer-brand img {{ height: 18pt; width: 18pt; object-fit: contain; }}
  .footer-brand strong {{ color: #CCFF00; background: #0f172a; padding: 2pt 6pt; border-radius: 3pt; }}
  .share-ribbon {{ background: #CCFF00; color:#0f172a; text-align:center; font-weight:800; font-size:9pt; padding:6pt; letter-spacing:1px; border-radius:4pt; margin-bottom:10pt; }}
</style></head><body>

{share_banner}

<div class="hero">
  <div class="brand-mark">
    <img src="data:image/png;base64,{full_b64}" alt="iTRAIN" width="176" height="46" style="width:176px;height:46px;object-fit:contain;display:block;"/>
  </div>
  <span class="badge">ANÁLISIS RETROSPECTIVO</span>
  <h1>Análisis del Plan Anterior</h1>
  <div class="subtitle">{_esc(plan_name)}</div>
  <p style="margin-top:10pt;color:rgba(255,255,255,0.8);max-width:500pt;">
    Evaluación retrospectiva del plan de entrenamiento anterior: fortalezas identificadas,
    oportunidades de mejora, indicadores de rendimiento y recomendaciones para el próximo ciclo.
  </p>
  <div class="meta">
    <div><strong>Fecha inicio</strong>{_esc(fecha_ini)}</div>
    <div><strong>Fecha final</strong>{_esc(fecha_fin)}</div>
    <div><strong>Duración</strong>{_esc(duracion)} semanas</div>
    <div><strong>Lesiones</strong>{_esc(les_lbl)}</div>
  </div>
</div>

<h2>1. Objetivo del Plan Anterior</h2>
<div class="card"><p style="margin:0">{_esc(objetivo)}</p></div>

<h2>2. Cumplimiento de Objetivos</h2>
{pct_bar}
<div class="radar-row">
  <div class="radar-wrap">
    <div class="radar-title">Perfil de cumplimiento</div>
    <div class="radar-legend">
      <span class="leg-item"><span class="leg-swatch leg-real"></span>Real</span>
      <span class="leg-item"><span class="leg-swatch leg-ideal"></span>Ideal · {_esc(bench_label)}</span>
    </div>
    {radar_svg_html}
  </div>
  <div class="radar-table">
    <table>
      <thead><tr><th>Área · Logros</th><th>Progreso</th><th style="text-align:right">%</th></tr></thead>
      <tbody>{cumpl_html}</tbody>
    </table>
  </div>
</div>

<h2>3. Indicadores de Rendimiento</h2>
<table>
  <thead><tr><th>Indicador</th><th style="text-align:center">Inicial</th><th style="text-align:center">Final</th><th style="text-align:center">Delta</th></tr></thead>
  <tbody>{indicadores_html}{no_ind_html}</tbody>
</table>

<h2>4. Fortalezas y Áreas de Mejora</h2>
<div class="two-col">
  <div class="card">
    <h3>✓ Fortalezas</h3>
    <ul>{fort_html}</ul>
  </div>
  <div class="card bad">
    <h3>⚠ Áreas de mejora</h3>
    <ul>{deb_html}</ul>
  </div>
</div>

<h2>5. Lesiones y Problemas de Salud</h2>
<div class="lesion-box">
  <p style="margin:0"><strong>Estado: {_esc(les_lbl)}</strong> · Días perdidos por lesión: <strong>{_esc(dias_perdidos)}</strong></p>
  {('<p style="margin:6pt 0 0">'+ _esc(desc_les) +'</p>') if desc_les else ''}
</div>

<h2>6. Conclusiones y Recomendaciones</h2>
<div class="two-col">
  <div class="card">
    <h3>Conclusiones principales</h3>
    <p style="margin:0">{_esc(conclusiones) or '<span class="muted">Sin conclusiones registradas.</span>'}</p>
  </div>
  <div class="card">
    <h3>Recomendaciones para el próximo plan</h3>
    <p style="margin:0">{_esc(recomendaciones) or '<span class="muted">Sin recomendaciones registradas.</span>'}</p>
  </div>
</div>

<div class="callout">
  Este análisis es un <strong>input crítico</strong> para la planificación del próximo macrociclo.
  Las áreas de mejora identificadas deben reflejarse en los objetivos del nuevo plan y en la
  selección del modelo de periodización.
</div>

<div class="footer-brand">
  <img src="data:image/png;base64,{icon_b64}" alt="iTRAIN"/>
  <span>Generado por <strong>iTRAIN</strong> · iTrain.app · Análisis del Plan Anterior</span>
</div>

</body></html>"""


async def _render_pdf(html: str) -> bytes:
    """Genera PDF con Playwright."""
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/pw-browsers")
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        page = await browser.new_page(viewport={"width": 794, "height": 1123})
        await page.set_content(html, wait_until="domcontentloaded")
        await page.wait_for_timeout(400)
        pdf = await page.pdf(format="A4", print_background=True,
                             margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        await browser.close()
    return pdf


async def _get_plan_name(plan_id: str) -> str:
    plan = await _plans.find_one({"id": plan_id}, {"_id": 0, "name": 1})
    if not plan:
        return "Plan sin nombre"
    return plan.get("name") or "Plan sin nombre"


async def _get_plan_info(plan_id: str) -> dict:
    """Devuelve {name, model_key, model_name} del plan (fallbacks vacíos)."""
    plan = await _plans.find_one(
        {"id": plan_id},
        {"_id": 0, "name": 1, "model": 1, "model_name": 1, "periodization_model": 1}
    )
    if not plan:
        return {"name": "Plan sin nombre", "model_key": "", "model_name": ""}
    return {
        "name": plan.get("name") or "Plan sin nombre",
        "model_key": plan.get("model") or plan.get("periodization_model") or "",
        "model_name": plan.get("model_name") or plan.get("model") or "",
    }


# ========================= PDF (autenticado) =========================
@router.get("/{plan_id}/pdf")
async def download_previous_analysis_pdf(plan_id: str, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    doc = await _analysis.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Aún no hay análisis guardado. Haz clic en 'Guardar' primero.")
    info = await _get_plan_info(plan_id)
    html = _build_html(doc, info["name"], model_key=info["model_key"], model_name=info["model_name"])
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Analisis_Plan_Anterior.pdf"'},
    )


# ========================= SHARE (crear link) =========================
class ShareResponse(BaseModel):
    share_id: str
    share_url: str


@router.post("/{plan_id}/share", response_model=ShareResponse)
async def create_share_link(plan_id: str, user=Depends(get_current_user_dep())):
    """Crea (o reutiliza) un share_id público del análisis del plan anterior."""
    uid = _get_user_id(user)
    doc = await _analysis.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Debes guardar el análisis antes de compartirlo.")

    existing = await _shares.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    info = await _get_plan_info(plan_id)
    if existing and existing.get("share_id"):
        share_id = existing["share_id"]
        # Actualiza snapshot por si el análisis cambió
        await _shares.update_one(
            {"share_id": share_id},
            {"$set": {"snapshot": doc, "plan_name": info["name"],
                      "model_key": info["model_key"], "model_name": info["model_name"],
                      "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        share_id = uuid.uuid4().hex[:14]
        now = datetime.now(timezone.utc).isoformat()
        await _shares.insert_one({
            "share_id": share_id,
            "plan_id": plan_id,
            "user_id": uid,
            "plan_name": info["name"],
            "model_key": info["model_key"],
            "model_name": info["model_name"],
            "snapshot": doc,
            "created_at": now,
            "updated_at": now,
        })

    # URL pública → /api/plan-data/previous-analysis/shared/{share_id}
    base = os.environ.get("PUBLIC_BASE_URL", "")
    share_url = f"{base}/api/plan-data/previous-analysis/shared/{share_id}" if base else f"/api/plan-data/previous-analysis/shared/{share_id}"
    return ShareResponse(share_id=share_id, share_url=share_url)


# ========================= SHARE (visor HTML público) =========================
@router.get("/shared/{share_id}", response_class=HTMLResponse)
async def view_shared_previous_analysis(share_id: str):
    share = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    html = _build_html(
        share["snapshot"], share.get("plan_name") or "Plan de entrenamiento",
        share_id=share_id,
        model_key=share.get("model_key") or "",
        model_name=share.get("model_name") or "",
    )
    return HTMLResponse(content=html)


# ========================= SHARE (PDF público) =========================
@router.get("/shared/{share_id}/pdf")
async def download_shared_previous_analysis_pdf(share_id: str):
    share = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    html = _build_html(
        share["snapshot"], share.get("plan_name") or "Plan de entrenamiento",
        share_id=share_id,
        model_key=share.get("model_key") or "",
        model_name=share.get("model_name") or "",
    )
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Analisis_Plan_Anterior.pdf"'},
    )

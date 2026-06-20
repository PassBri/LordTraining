"""
Exportación y compartición de Catálogos de Información:
- Entidades · Equipos · Atletas · Deportes · Torneos
- PDF estilo whitepaper LordTraining
- Link público compartible
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, HTMLResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import os
import base64
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/info-export", tags=["info-catalog-export"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_shares = _db["info_catalog_shares"]


def _get_user_id(user):
    return user.get("id") or user.get("user_id")


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _esc(s) -> str:
    if s is None:
        return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


# Configuración por tipo de catálogo: cómo extraer columnas para la tabla del PDF
TYPE_CONFIG = {
    "entities": {
        "collection": "entities",
        "label": "Entidades",
        "subtitle": "Federaciones, clubes y organizaciones deportivas",
        "icon": "🏛",
        "color": "#0EA5E9",  # sky-500
        "filter_field": "coach_id",
        "columns": [
            {"key": "name", "label": "Nombre", "width": "30%"},
            {"key": "type", "label": "Tipo", "width": "15%"},
            {"key": "city", "label": "Ciudad", "width": "20%"},
            {"key": "country", "label": "País", "width": "15%"},
            {"key": "contact", "label": "Contacto", "width": "20%"},
        ],
    },
    "teams": {
        "collection": "teams",
        "label": "Equipos",
        "subtitle": "Equipos deportivos gestionados",
        "icon": "⚽",
        "color": "#10B981",  # emerald-500
        "filter_field": "coach_id",
        "columns": [
            {"key": "name", "label": "Equipo", "width": "30%"},
            {"key": "sport", "label": "Deporte", "width": "20%"},
            {"key": "category", "label": "Categoría", "width": "15%"},
            {"key": "level", "label": "Nivel", "width": "15%"},
            {"key": "athlete_count", "label": "Atletas", "width": "20%"},
        ],
    },
    "athletes": {
        "collection": "athletes",
        "label": "Atletas",
        "subtitle": "Plantilla de atletas registrados",
        "icon": "🏃",
        "color": "#F59E0B",  # amber-500
        "filter_field": "coach_id",
        "columns": [
            {"key": "name", "label": "Nombre completo", "width": "28%"},
            {"key": "sport", "label": "Deporte", "width": "18%"},
            {"key": "category", "label": "Categoría", "width": "14%"},
            {"key": "age", "label": "Edad", "width": "10%"},
            {"key": "gender", "label": "Género", "width": "12%"},
            {"key": "level", "label": "Nivel", "width": "18%"},
        ],
    },
    "sports": {
        "collection": "sports",
        "label": "Deportes",
        "subtitle": "Catálogo de deportes con caracterización técnica",
        "icon": "🏅",
        "color": "#EF4444",  # red-500
        "filter_field": "coach_id",
        "columns": [
            {"key": "name", "label": "Deporte", "width": "30%"},
            {"key": "category_name", "label": "Categoría", "width": "25%"},
            {"key": "type", "label": "Tipo", "width": "20%"},
            {"key": "discipline", "label": "Disciplina", "width": "25%"},
        ],
    },
    "tournaments": {
        "collection": "tournaments",
        "label": "Torneos",
        "subtitle": "Calendario de competencias y torneos",
        "icon": "🏆",
        "color": "#8B5CF6",  # violet-500
        "filter_field": "coach_id",
        "columns": [
            {"key": "name", "label": "Torneo", "width": "30%"},
            {"key": "sport", "label": "Deporte", "width": "18%"},
            {"key": "category", "label": "Categoría", "width": "14%"},
            {"key": "start_date", "label": "Inicio", "width": "14%"},
            {"key": "end_date", "label": "Fin", "width": "14%"},
            {"key": "location", "label": "Sede", "width": "10%"},
        ],
    },
    "coaches": {
        "collection": "coaches",
        "label": "Entrenadores",
        "subtitle": "Perfiles profesionales · staff técnico · trayectoria y logros",
        "icon": "👨‍🏫",
        "color": "#0EA5E9",  # sky-500
        "filter_field": "coach_id",
        "columns": [
            {"key": "name", "label": "Nombre", "width": "28%"},
            {"key": "specialty", "label": "Especialidad", "width": "20%"},
            {"key": "years_experience", "label": "Años exp.", "width": "10%"},
            {"key": "level", "label": "Nivel", "width": "20%"},
            {"key": "current_organization", "label": "Organización", "width": "22%"},
        ],
    },
}


def _validate_type(catalog_type: str) -> Dict[str, Any]:
    cfg = TYPE_CONFIG.get(catalog_type)
    if not cfg:
        raise HTTPException(400, f"Tipo de catálogo no válido: {catalog_type}. Permitidos: {list(TYPE_CONFIG.keys())}")
    return cfg


async def _fetch_items(catalog_type: str, user_id: str) -> List[Dict[str, Any]]:
    cfg = _validate_type(catalog_type)
    coll = _db[cfg["collection"]]
    items = await coll.find({cfg["filter_field"]: user_id}, {"_id": 0}).to_list(2000)
    # Enriquecimiento on-demand
    if catalog_type == "teams":
        for it in items:
            tid = it.get("id")
            if tid:
                count = await _db["athletes"].count_documents({"team_id": tid})
                it["athlete_count"] = count
    return items


def _value_for(item: Dict[str, Any], key: str) -> str:
    """Resuelve campos anidados/comunes."""
    if key in item and item.get(key) not in (None, ""):
        v = item[key]
        if isinstance(v, list):
            return ", ".join(str(x) for x in v[:3])
        return str(v)
    # Variantes comunes
    aliases = {
        "name": ["nombre", "full_name", "fullName", "title"],
        "city": ["ciudad", "address.city", "location.city"],
        "country": ["pais", "address.country", "location.country"],
        "contact": ["email", "phone", "telefono", "contact_email"],
        "category": ["categoria", "category_id", "category_name"],
        "category_name": ["category", "categoria"],
        "sport": ["deporte", "sport_name", "sport_id"],
        "level": ["nivel", "classification"],
        "type": ["tipo", "entity_type"],
        "discipline": ["disciplina"],
        "age": ["edad", "age_years"],
        "gender": ["genero", "sex"],
        "start_date": ["startDate", "fecha_inicio"],
        "end_date": ["endDate", "fecha_fin"],
        "location": ["sede", "venue", "city"],
    }
    for alias in aliases.get(key, []):
        if "." in alias:
            head, tail = alias.split(".", 1)
            sub = item.get(head)
            if isinstance(sub, dict) and tail in sub and sub[tail] not in (None, ""):
                return str(sub[tail])
        elif alias in item and item.get(alias) not in (None, ""):
            v = item[alias]
            if isinstance(v, list):
                return ", ".join(str(x) for x in v[:3])
            return str(v)
    return "—"


def _build_html(catalog_type: str, items: List[Dict[str, Any]], coach_name: str = "", share_id: Optional[str] = None) -> str:
    cfg = _validate_type(catalog_type)
    color = cfg["color"]

    # Logos
    brand_dir = "/app/frontend/public/brand"
    try:
        with open(f"{brand_dir}/lordtraining-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/lordtraining-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        full_b64 = icon_b64 = ""

    cols_th = "".join([
        f'<th style="width:{c["width"]}">{_esc(c["label"])}</th>' for c in cfg["columns"]
    ])
    rows_html = []
    for i, it in enumerate(items, 1):
        cells = []
        for c in cfg["columns"]:
            val = _value_for(it, c["key"])
            cells.append(f"<td>{_esc(val)}</td>")
        rows_html.append(f"<tr><td class='idx'>{i:02d}</td>{''.join(cells)}</tr>")
    body_html = "".join(rows_html) if rows_html else (
        f'<tr><td colspan="{len(cfg["columns"]) + 1}" class="muted" style="text-align:center;padding:20pt">'
        f"Aún no has registrado {cfg['label'].lower()} en tu catálogo.</td></tr>"
    )

    share_banner = ""
    if share_id:
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por LordTraining.app</div>'

    coach_line = f"<div><strong>Entrenador</strong>{_esc(coach_name)}</div>" if coach_name else ""
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Catálogo {cfg['label']} · LordTraining</title>
<style>
  @page {{ size: A4; margin: 18mm 14mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.5; font-size: 10.5pt; }}
  h1 {{ font-size: 28pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4pt; color: #fff; }}
  h2 {{ font-size: 13pt; font-weight: 800; margin-top: 16pt; margin-bottom: 6pt; color: #0f172a; border-bottom: 2px solid {color}; padding-bottom: 4pt; }}
  .muted {{ color: #94a3b8; font-style: italic; }}
  .hero {{ background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%); color: #fff; padding: 26pt 28pt; border-radius: 10pt; margin-bottom: 14pt; position: relative; overflow: hidden; }}
  .hero::after {{ content: ""; position: absolute; right: -50pt; top: -50pt; width: 220pt; height: 220pt; background: radial-gradient(circle, {color}55 0%, transparent 65%); }}
  .hero .subtitle {{ color: rgba(255,255,255,0.75); font-size: 12pt; margin-top: 4pt; }}
  .brand-mark {{ display: flex; align-items: center; gap: 10pt; margin-bottom: 14pt; }}
  .brand-mark img {{ height: 32pt; width: 124pt; object-fit: contain; display: block; }}
  .badge {{ display: inline-block; background: {color}; color: #fff; padding: 4pt 10pt; border-radius: 20pt; font-size: 9pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 8pt; text-transform: uppercase; }}
  .meta {{ display:flex; flex-wrap:wrap; gap:18pt; margin-top:12pt; color:rgba(255,255,255,0.85); font-size:9.5pt; position: relative; z-index: 1;}}
  .meta strong {{ color: {color}; display:block; font-size:7.5pt; text-transform:uppercase; letter-spacing:1px; font-weight:800; margin-bottom:2pt; }}
  .stats {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10pt; margin-bottom: 12pt; }}
  .stat-card {{ background: #f8fafc; border-radius: 8pt; padding: 12pt 14pt; border-left: 3pt solid {color}; }}
  .stat-card .num {{ font-size: 22pt; font-weight: 900; color: #0f172a; line-height: 1; }}
  .stat-card .lbl {{ font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4pt; }}
  table {{ width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 9.5pt; }}
  th, td {{ text-align: left; padding: 7pt 8pt; border-bottom: 1px solid #e2e8f0; vertical-align: top; }}
  th {{ background: #0f172a; color: #CCFF00; font-weight: 800; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }}
  td.idx {{ font-weight: 800; color: {color}; width: 28pt; font-size: 9pt; text-align: center; }}
  tr:nth-child(even) td {{ background: #fafbfc; }}
  .footer-brand {{ margin-top: 22pt; padding-top: 10pt; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8pt; color: #64748b; font-size: 8.5pt; }}
  .footer-brand img {{ height: 20pt; width: 20pt; }}
  .share-ribbon {{ background: #0f172a; color: #CCFF00; text-align: center; padding: 7pt; border-radius: 8pt; margin-bottom: 12pt; font-size: 9pt; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }}
</style></head>
<body>

{share_banner}

<div class="hero">
  <div class="brand-mark">
    <img src="data:image/png;base64,{full_b64}" alt="LordTraining" width="166" height="44" style="width:166px;height:44px;object-fit:contain;display:block;"/>
  </div>
  <span class="badge">CATÁLOGO · {_esc(cfg['label'])}</span>
  <h1>{_esc(cfg['label'])}</h1>
  <div class="subtitle">{_esc(cfg['subtitle'])}</div>
  <div class="meta">
    <div><strong>Total registros</strong>{len(items)}</div>
    <div><strong>Generado el</strong>{today}</div>
    {coach_line}
  </div>
</div>

<div class="stats">
  <div class="stat-card"><div class="num">{len(items)}</div><div class="lbl">Total {_esc(cfg['label'])}</div></div>
  <div class="stat-card"><div class="num">{len([x for x in items if x.get('active', True)])}</div><div class="lbl">Activos</div></div>
  <div class="stat-card"><div class="num">{today.split('/')[0]}/{today.split('/')[1]}</div><div class="lbl">Mes Actual</div></div>
</div>

<h2>Listado completo</h2>
<table>
  <thead><tr><th style="width:28pt">#</th>{cols_th}</tr></thead>
  <tbody>{body_html}</tbody>
</table>

<div class="footer-brand">
  <img src="data:image/png;base64,{icon_b64}" alt="LordTraining"/>
  <span>Generado por <strong>LordTraining</strong> · LordTraining.app · Catálogo de {_esc(cfg['label'])}</span>
</div>

</body></html>"""


async def _render_pdf(html: str) -> bytes:
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


# ============== TEMPLATE ESPECIAL: CATÁLOGO DE DEPORTES (Material Design Cards) ==============

SPORT_TYPE_LABELS = {
    "individual": ("Individual", "#0ea5e9"),
    "colectivo": ("Colectivo", "#10b981"),
    "combate": ("Combate", "#ef4444"),
    "precision": ("Precisión", "#8b5cf6"),
    "raquetas": ("Raquetas", "#f59e0b"),
    "agua": ("Acuático", "#06b6d4"),
}

ENERGY_SYSTEM_LABELS = {
    "aerobico": ("Aeróbico", "#10b981"),
    "anaerobico-lactico": ("Anaeróbico Láctico", "#f59e0b"),
    "anaerobico-alactico": ("Anaeróbico Aláctico", "#ef4444"),
    "mixto": ("Mixto", "#8b5cf6"),
}


def _pill(label: str, color: str, light: bool = True) -> str:
    if light:
        return (f'<span class="pill" style="background:{color}1a;color:{color};border:1px solid {color}55">'
                f'{_esc(label)}</span>')
    return (f'<span class="pill" style="background:{color};color:#fff;border:1px solid {color}">'
            f'{_esc(label)}</span>')


def _build_sports_html(items: List[Dict[str, Any]], coach_name: str = "", share_id: Optional[str] = None) -> str:
    cfg = TYPE_CONFIG["sports"]
    color = cfg["color"]

    brand_dir = "/app/frontend/public/brand"
    try:
        with open(f"{brand_dir}/lordtraining-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/lordtraining-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        full_b64 = icon_b64 = ""

    # Tarjetas por deporte con Material Design completo
    cards = []
    has_char_count = 0
    for sp in items:
        char = sp.get("characterization") or {}
        if char and any(char.get(k) for k in ("type", "energySystem", "physicalCapabilities", "technicalSkills", "tacticalFactors")):
            has_char_count += 1
        name = _esc(sp.get("name") or sp.get("nombre") or "Deporte")
        category = _esc(sp.get("category_name") or sp.get("category") or sp.get("categoria") or "—")
        # Pills tipo + sistema
        type_key = (char.get("type") or "").strip()
        energy_key = (char.get("energySystem") or "").strip()
        type_lbl, type_col = SPORT_TYPE_LABELS.get(type_key, (type_key.capitalize() if type_key else "—", "#64748b"))
        en_lbl, en_col = ENERGY_SYSTEM_LABELS.get(energy_key, (energy_key.capitalize() if energy_key else "—", "#64748b"))
        # Textos
        phys = _esc(char.get("physicalCapabilities") or "")
        tech = _esc(char.get("technicalSkills") or "")
        tact = _esc(char.get("tacticalFactors") or "")
        # Estado: completo si tiene al menos type+energy+1 de los textos
        completeness = sum(1 for v in (type_key, energy_key, phys, tech, tact) if v)
        complete_pct = int(completeness * 20)  # 5 campos = 100%
        status_color = "#10b981" if complete_pct >= 80 else "#f59e0b" if complete_pct >= 40 else "#ef4444"

        cards.append(f"""
<div class="sport-card">
  <div class="sport-card-head">
    <div class="sport-name-block">
      <div class="sport-name">{name}</div>
      <div class="sport-cat">{category}</div>
    </div>
    <div class="sport-completeness">
      <div class="comp-circle" style="background:conic-gradient({status_color} {complete_pct}%, #e2e8f0 {complete_pct}% 100%);">
        <div class="comp-inner"><span style="color:{status_color}">{complete_pct}%</span></div>
      </div>
    </div>
  </div>

  <div class="sport-pills">
    <div class="pill-group">
      <span class="pill-lbl">Tipo</span>
      {_pill(type_lbl, type_col)}
    </div>
    <div class="pill-group">
      <span class="pill-lbl">Sistema Energético</span>
      {_pill(en_lbl, en_col)}
    </div>
  </div>

  <div class="sport-fields">
    <div class="sport-field">
      <div class="field-lbl"><span class="dot" style="background:#10b981"></span>Capacidades Físicas Principales</div>
      <div class="field-val">{phys or '<span class="muted">No definido</span>'}</div>
    </div>
    <div class="sport-field">
      <div class="field-lbl"><span class="dot" style="background:#3b82f6"></span>Habilidades Técnicas</div>
      <div class="field-val">{tech or '<span class="muted">No definido</span>'}</div>
    </div>
    <div class="sport-field">
      <div class="field-lbl"><span class="dot" style="background:#f59e0b"></span>Factores Tácticos</div>
      <div class="field-val">{tact or '<span class="muted">No definido</span>'}</div>
    </div>
  </div>
</div>
""")

    cards_html = "".join(cards) if cards else (
        '<div class="empty-state"><p>Aún no has registrado deportes en tu catálogo.</p></div>'
    )

    share_banner = ""
    if share_id:
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por LordTraining.app</div>'

    coach_line = f'<div><strong>Entrenador</strong>{_esc(coach_name)}</div>' if coach_name else ""
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Catálogo Deportes · LordTraining</title>
<style>
  @page {{ size: A4; margin: 14mm 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.5; font-size: 10pt; }}
  h1 {{ font-size: 28pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4pt; color: #fff; }}
  h2 {{ font-size: 13pt; font-weight: 800; margin: 14pt 0 8pt; color: #0f172a; border-bottom: 2px solid {color}; padding-bottom: 4pt; }}
  .muted {{ color: #94a3b8; font-style: italic; }}

  .hero {{ background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%); color: #fff; padding: 24pt 26pt; border-radius: 12pt; margin-bottom: 14pt; position: relative; overflow: hidden; }}
  .hero::after {{ content: ""; position: absolute; right: -50pt; top: -50pt; width: 220pt; height: 220pt; background: radial-gradient(circle, {color}55 0%, transparent 65%); }}
  .hero .subtitle {{ color: rgba(255,255,255,0.78); font-size: 11.5pt; margin-top: 4pt; }}
  .brand-mark img {{ height: 30pt; width: 120pt; object-fit: contain; display: block; margin-bottom: 12pt; }}
  .badge {{ display: inline-block; background: {color}; color: #fff; padding: 4pt 10pt; border-radius: 20pt; font-size: 8.5pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 8pt; text-transform: uppercase; }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 18pt; margin-top: 12pt; color: rgba(255,255,255,0.85); font-size: 9pt; position: relative; z-index: 1; }}
  .meta strong {{ color: {color}; display: block; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 2pt; }}

  .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt; margin-bottom: 12pt; }}
  .stat-card {{ background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 10pt; padding: 12pt 14pt; border: 1px solid #e2e8f0; border-top: 3pt solid {color}; box-shadow: 0 1px 0 rgba(0,0,0,0.02); }}
  .stat-card .num {{ font-size: 20pt; font-weight: 900; color: #0f172a; line-height: 1; }}
  .stat-card .lbl {{ font-size: 7.5pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4pt; }}

  /* MATERIAL DESIGN SPORT CARDS — Galería tipo ExerciseLibrary */
  .cards-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }}
  .sport-card {{ background: #fff; border: 1px solid #e2e8f0; border-radius: 12pt; padding: 12pt 14pt; page-break-inside: avoid; break-inside: avoid; box-shadow: 0 1px 2px rgba(0,0,0,0.03); display: flex; flex-direction: column; }}
  .sport-card-head {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 8pt; padding-bottom: 8pt; border-bottom: 1px solid #f1f5f9; margin-bottom: 8pt; }}
  .sport-name {{ font-size: 12pt; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; line-height: 1.2; }}
  .sport-cat {{ font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2pt; }}
  .sport-completeness {{ flex-shrink: 0; }}
  .comp-circle {{ width: 32pt; height: 32pt; border-radius: 50%; display: flex; align-items: center; justify-content: center; }}
  .comp-inner {{ width: 26pt; height: 26pt; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 7.5pt; font-weight: 900; }}

  .sport-pills {{ display: flex; gap: 8pt; margin-bottom: 8pt; flex-wrap: wrap; }}
  .pill-group {{ display: flex; flex-direction: column; gap: 2pt; flex: 1; min-width: 0; }}
  .pill-lbl {{ font-size: 7pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }}
  .pill {{ display: inline-block; padding: 2pt 8pt; border-radius: 999pt; font-size: 8.5pt; font-weight: 700; }}

  .sport-fields {{ display: flex; flex-direction: column; gap: 6pt; }}
  .sport-field {{ background: #f8fafc; border-radius: 8pt; padding: 7pt 9pt; }}
  .field-lbl {{ font-size: 7.5pt; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3pt; display: flex; align-items: center; gap: 5pt; }}
  .field-lbl .dot {{ width: 6pt; height: 6pt; border-radius: 50%; flex-shrink: 0; }}
  .field-val {{ font-size: 9pt; color: #334155; line-height: 1.45; }}

  .empty-state {{ text-align: center; padding: 30pt 20pt; background: #f8fafc; border-radius: 10pt; color: #94a3b8; }}

  .footer-brand {{ margin-top: 14pt; padding-top: 10pt; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8pt; color: #64748b; font-size: 8pt; }}
  .footer-brand img {{ height: 18pt; width: 18pt; }}
  .share-ribbon {{ background: #0f172a; color: #CCFF00; text-align: center; padding: 7pt; border-radius: 8pt; margin-bottom: 12pt; font-size: 9pt; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }}
</style></head>
<body>

{share_banner}

<div class="hero">
  <div class="brand-mark">
    <img src="data:image/png;base64,{full_b64}" alt="LordTraining" width="160" height="42" style="width:160px;height:42px;object-fit:contain;display:block;"/>
  </div>
  <span class="badge">CATÁLOGO · DEPORTES</span>
  <h1>Caracterización Deportiva</h1>
  <div class="subtitle">Catálogo técnico completo · Tipos · Sistemas energéticos · Capacidades físicas · Habilidades técnicas · Factores tácticos</div>
  <div class="meta">
    <div><strong>Total deportes</strong>{len(items)}</div>
    <div><strong>Con caracterización</strong>{has_char_count}</div>
    <div><strong>Generado el</strong>{today}</div>
    {coach_line}
  </div>
</div>

<div class="stats">
  <div class="stat-card"><div class="num">{len(items)}</div><div class="lbl">Total Deportes</div></div>
  <div class="stat-card"><div class="num">{has_char_count}</div><div class="lbl">Caracterizados</div></div>
  <div class="stat-card"><div class="num">{len(items) - has_char_count}</div><div class="lbl">Sin caracterizar</div></div>
  <div class="stat-card"><div class="num">{int(has_char_count * 100 / len(items)) if items else 0}%</div><div class="lbl">Cobertura</div></div>
</div>

<h2>Galería de Deportes con Caracterización Técnica</h2>

<div class="cards-grid">
{cards_html}
</div>

<div class="footer-brand">
  <img src="data:image/png;base64,{icon_b64}" alt="LordTraining"/>
  <span>Generado por <strong>LordTraining</strong> · LordTraining.app · Catálogo de Deportes con Caracterización Técnica</span>
</div>

</body></html>"""



async def _coach_name(user_id: str) -> str:
    u = await _db["users"].find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    if not u:
        return ""
    return u.get("name") or u.get("email") or ""


# ============== TEMPLATE ESPECIAL: ENTRENADORES (Material Design Cards) ==============
def _build_coaches_html(items: List[Dict[str, Any]], coach_name: str = "", share_id: Optional[str] = None) -> str:
    cfg = TYPE_CONFIG["coaches"]
    color = cfg["color"]

    brand_dir = "/app/frontend/public/brand"
    try:
        with open(f"{brand_dir}/lordtraining-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/lordtraining-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        full_b64 = icon_b64 = ""

    cards = []
    total_achievements = 0
    avg_exp = 0
    exp_count = 0

    for c in items:
        name = _esc(c.get("name") or "Entrenador")
        photo = c.get("photo_url") or ""
        specialty = _esc(c.get("specialty") or "—")
        sub_specialty = _esc(c.get("sub_specialty") or "")
        years = c.get("years_experience")
        if isinstance(years, int):
            avg_exp += years
            exp_count += 1
        years_lbl = f"{years} años" if isinstance(years, int) else "—"
        level = _esc(c.get("level") or "—")
        org = _esc(c.get("current_organization") or "—")
        role = _esc(c.get("role_in_org") or "")
        nationality = _esc(c.get("nationality") or "")
        bio = _esc(c.get("bio") or "")

        studies = c.get("studies") or []
        certifications = c.get("certifications") or []
        career = c.get("career_history") or []
        achievements = c.get("achievements") or []
        languages = c.get("languages") or []
        total_achievements += len(achievements)

        # Avatar / inicial
        initial = (name or "C")[0].upper()
        avatar_html = (
            f'<img src="{photo}" alt="{name}" class="coach-avatar"/>' if photo
            else f'<div class="coach-avatar-fallback" style="background:linear-gradient(135deg,{color},#0f172a)">{initial}</div>'
        )

        # Logros: top 3 tarjetitas
        ach_html = ""
        if achievements:
            chips = []
            for a in achievements[:5]:
                title = _esc((a or {}).get("title") or (a or {}).get("nombre") or "Logro")
                year = _esc((a or {}).get("year") or "")
                chips.append(f'<span class="ach-chip">🏆 {title}{(" · " + year) if year else ""}</span>')
            ach_html = "".join(chips)
        else:
            ach_html = '<span class="muted">Sin logros registrados</span>'

        # Studies summary
        st_html = []
        for s in studies[:3]:
            t = _esc((s or {}).get("title") or "")
            inst = _esc((s or {}).get("institution") or "")
            yr = _esc((s or {}).get("year") or "")
            if t:
                st_html.append(f'<li><strong>{t}</strong>{(" · " + inst) if inst else ""}{(" · " + yr) if yr else ""}</li>')
        st_block = ("<ul class='cv-list'>" + "".join(st_html) + "</ul>") if st_html else '<span class="muted">Sin estudios registrados</span>'

        # Certifications
        cert_html = []
        for ct in certifications[:3]:
            t = _esc((ct or {}).get("title") or "")
            inst = _esc((ct or {}).get("institution") or "")
            if t:
                cert_html.append(f'<li><strong>{t}</strong>{(" · " + inst) if inst else ""}</li>')
        cert_block = ("<ul class='cv-list'>" + "".join(cert_html) + "</ul>") if cert_html else '<span class="muted">Sin certificaciones</span>'

        # Career history
        car_html = []
        for k in career[:3]:
            org_k = _esc((k or {}).get("organization") or "")
            role_k = _esc((k or {}).get("role") or "")
            fr = _esc((k or {}).get("from_year") or "")
            to = _esc((k or {}).get("to_year") or "Actual")
            if org_k:
                car_html.append(f'<li><strong>{org_k}</strong>{(" · " + role_k) if role_k else ""}{(" · " + fr + "–" + to) if fr else ""}</li>')
        car_block = ("<ul class='cv-list'>" + "".join(car_html) + "</ul>") if car_html else '<span class="muted">Sin trayectoria registrada</span>'

        # Languages
        lang_html = ""
        if languages:
            lang_html = "".join([f'<span class="lang-chip">{_esc(lg)}</span>' for lg in languages[:5]])

        cards.append(f"""
<div class="coach-card">
  <div class="coach-card-head">
    <div class="coach-avatar-wrap">
      {avatar_html}
    </div>
    <div class="coach-id">
      <div class="coach-name">{name}</div>
      <div class="coach-spec">{specialty}{(" · " + sub_specialty) if sub_specialty else ""}</div>
      {f'<div class="coach-nat">{nationality}</div>' if nationality else ''}
    </div>
    <div class="coach-stats">
      <div class="stat-num">{years_lbl}</div>
      <div class="stat-lbl">Experiencia</div>
    </div>
  </div>

  <div class="coach-pills">
    <span class="pill" style="background:{color}1a;color:{color};border:1px solid {color}55">{level}</span>
    {f'<span class="pill" style="background:#0f172a;color:#fff;border:1px solid #0f172a">{org}{(" · " + role) if role else ""}</span>' if org != "—" else ''}
    {lang_html}
  </div>

  {f'<div class="coach-bio">{bio}</div>' if bio else ''}

  <div class="coach-grid">
    <div class="coach-section">
      <div class="cs-title">🎓 Estudios</div>
      <div class="cs-body">{st_block}</div>
    </div>
    <div class="coach-section">
      <div class="cs-title">📜 Certificaciones</div>
      <div class="cs-body">{cert_block}</div>
    </div>
    <div class="coach-section">
      <div class="cs-title">💼 Trayectoria</div>
      <div class="cs-body">{car_block}</div>
    </div>
    <div class="coach-section">
      <div class="cs-title">🏅 Campeonatos &amp; Logros</div>
      <div class="cs-body achievements-block">{ach_html}</div>
    </div>
  </div>
</div>
""")

    cards_html = "".join(cards) if cards else (
        '<div class="empty-state"><p>Aún no has registrado entrenadores.</p></div>'
    )

    avg_exp_val = round(avg_exp / exp_count) if exp_count else 0

    share_banner = ""
    if share_id:
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por LordTraining.app</div>'

    coach_line = f'<div><strong>Generado por</strong>{_esc(coach_name)}</div>' if coach_name else ""
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Catálogo Entrenadores · LordTraining</title>
<style>
  @page {{ size: A4; margin: 14mm 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.5; font-size: 10pt; }}
  h1 {{ font-size: 28pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4pt; color: #fff; }}
  h2 {{ font-size: 13pt; font-weight: 800; margin: 14pt 0 8pt; color: #0f172a; border-bottom: 2px solid {color}; padding-bottom: 4pt; }}
  .muted {{ color: #94a3b8; font-style: italic; }}

  .hero {{ background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%); color: #fff; padding: 24pt 26pt; border-radius: 12pt; margin-bottom: 14pt; position: relative; overflow: hidden; }}
  .hero::after {{ content: ""; position: absolute; right: -50pt; top: -50pt; width: 220pt; height: 220pt; background: radial-gradient(circle, {color}55 0%, transparent 65%); }}
  .hero .subtitle {{ color: rgba(255,255,255,0.78); font-size: 11.5pt; margin-top: 4pt; }}
  .brand-mark img {{ height: 30pt; width: 120pt; object-fit: contain; display: block; margin-bottom: 12pt; }}
  .badge {{ display: inline-block; background: {color}; color: #fff; padding: 4pt 10pt; border-radius: 20pt; font-size: 8.5pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 8pt; text-transform: uppercase; }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 18pt; margin-top: 12pt; color: rgba(255,255,255,0.85); font-size: 9pt; position: relative; z-index: 1; }}
  .meta strong {{ color: {color}; display: block; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 2pt; }}

  .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt; margin-bottom: 12pt; }}
  .stat-card {{ background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 10pt; padding: 12pt 14pt; border: 1px solid #e2e8f0; border-top: 3pt solid {color}; }}
  .stat-card .num {{ font-size: 20pt; font-weight: 900; color: #0f172a; line-height: 1; }}
  .stat-card .lbl {{ font-size: 7.5pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4pt; }}

  /* COACH CARDS */
  .coach-card {{ background: #fff; border: 1px solid #e2e8f0; border-radius: 12pt; padding: 14pt 16pt; margin-bottom: 10pt; page-break-inside: avoid; break-inside: avoid; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }}
  .coach-card-head {{ display: flex; align-items: center; gap: 12pt; padding-bottom: 10pt; border-bottom: 1px solid #f1f5f9; margin-bottom: 10pt; }}
  .coach-avatar-wrap {{ flex-shrink: 0; }}
  .coach-avatar, .coach-avatar-fallback {{ width: 50pt; height: 50pt; border-radius: 50%; object-fit: cover; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22pt; font-weight: 900; box-shadow: 0 2pt 6pt rgba(0,0,0,0.1); }}
  .coach-id {{ flex: 1; min-width: 0; }}
  .coach-name {{ font-size: 14pt; font-weight: 900; color: #0f172a; line-height: 1.1; letter-spacing: -0.01em; }}
  .coach-spec {{ font-size: 9.5pt; color: #475569; font-weight: 600; margin-top: 2pt; }}
  .coach-nat {{ font-size: 8pt; color: #64748b; margin-top: 2pt; font-weight: 600; }}
  .coach-stats {{ flex-shrink: 0; text-align: right; }}
  .coach-stats .stat-num {{ font-size: 14pt; font-weight: 900; color: {color}; line-height: 1; }}
  .coach-stats .stat-lbl {{ font-size: 7pt; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2pt; }}

  .coach-pills {{ display: flex; flex-wrap: wrap; gap: 4pt; margin-bottom: 8pt; }}
  .pill {{ display: inline-block; padding: 2pt 8pt; border-radius: 999pt; font-size: 8.5pt; font-weight: 700; }}
  .lang-chip {{ display: inline-block; padding: 2pt 7pt; border-radius: 4pt; font-size: 8pt; font-weight: 700; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }}

  .coach-bio {{ font-size: 9pt; color: #475569; line-height: 1.5; padding: 8pt 10pt; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 3pt solid {color}; border-radius: 6pt; margin-bottom: 8pt; font-style: italic; }}

  .coach-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; }}
  .coach-section {{ background: #f8fafc; border-radius: 8pt; padding: 8pt 10pt; }}
  .cs-title {{ font-size: 8.5pt; font-weight: 900; color: #0f172a; margin-bottom: 4pt; text-transform: uppercase; letter-spacing: 0.6px; }}
  .cs-body {{ font-size: 8.5pt; color: #334155; line-height: 1.5; }}
  .cv-list {{ margin: 0; padding-left: 14pt; }}
  .cv-list li {{ margin-bottom: 2pt; }}
  .achievements-block {{ display: flex; flex-wrap: wrap; gap: 4pt; }}
  .ach-chip {{ display: inline-block; padding: 3pt 8pt; border-radius: 999pt; font-size: 8pt; font-weight: 700; background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }}

  .empty-state {{ text-align: center; padding: 30pt 20pt; background: #f8fafc; border-radius: 10pt; color: #94a3b8; }}

  .footer-brand {{ margin-top: 14pt; padding-top: 10pt; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8pt; color: #64748b; font-size: 8pt; }}
  .footer-brand img {{ height: 18pt; width: 18pt; }}
  .share-ribbon {{ background: #0f172a; color: #CCFF00; text-align: center; padding: 7pt; border-radius: 8pt; margin-bottom: 12pt; font-size: 9pt; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }}
</style></head>
<body>

{share_banner}

<div class="hero">
  <div class="brand-mark">
    <img src="data:image/png;base64,{full_b64}" alt="LordTraining" width="160" height="42" style="width:160px;height:42px;object-fit:contain;display:block;"/>
  </div>
  <span class="badge">CATÁLOGO · ENTRENADORES</span>
  <h1>Staff Técnico</h1>
  <div class="subtitle">{_esc(cfg['subtitle'])}</div>
  <div class="meta">
    <div><strong>Total entrenadores</strong>{len(items)}</div>
    <div><strong>Experiencia promedio</strong>{avg_exp_val} años</div>
    <div><strong>Logros registrados</strong>{total_achievements}</div>
    <div><strong>Generado el</strong>{today}</div>
    {coach_line}
  </div>
</div>

<div class="stats">
  <div class="stat-card"><div class="num">{len(items)}</div><div class="lbl">Total Entrenadores</div></div>
  <div class="stat-card"><div class="num">{len([x for x in items if x.get('is_active', True)])}</div><div class="lbl">Activos</div></div>
  <div class="stat-card"><div class="num">{avg_exp_val}</div><div class="lbl">Años Exp. Promedio</div></div>
  <div class="stat-card"><div class="num">{total_achievements}</div><div class="lbl">Logros / Campeonatos</div></div>
</div>

<h2>Plantilla Técnica</h2>

{cards_html}

<div class="footer-brand">
  <img src="data:image/png;base64,{icon_b64}" alt="LordTraining"/>
  <span>Generado por <strong>LordTraining</strong> · LordTraining.app · Catálogo Profesional de Entrenadores</span>
</div>

</body></html>"""


@router.get("/{catalog_type}/pdf")
async def download_catalog_pdf(catalog_type: str, user=Depends(get_current_user_dep())):
    _validate_type(catalog_type)
    uid = _get_user_id(user)
    items = await _fetch_items(catalog_type, uid)
    coach = await _coach_name(uid)
    if catalog_type == "sports":
        html = _build_sports_html(items, coach)
    elif catalog_type == "coaches":
        html = _build_coaches_html(items, coach)
    else:
        html = _build_html(catalog_type, items, coach)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Catalogo_{catalog_type}.pdf"'},
    )


class CatalogShareResponse(BaseModel):
    share_id: str
    share_url: str


@router.post("/{catalog_type}/share", response_model=CatalogShareResponse)
async def create_catalog_share(catalog_type: str, user=Depends(get_current_user_dep())):
    _validate_type(catalog_type)
    uid = _get_user_id(user)
    items = await _fetch_items(catalog_type, uid)
    coach = await _coach_name(uid)
    existing = await _shares.find_one(
        {"catalog_type": catalog_type, "user_id": uid}, {"_id": 0}
    )
    snapshot = {"items": items, "coach_name": coach, "type": catalog_type}
    now = datetime.now(timezone.utc).isoformat()
    if existing and existing.get("share_id"):
        share_id = existing["share_id"]
        await _shares.update_one(
            {"share_id": share_id},
            {"$set": {"snapshot": snapshot, "updated_at": now}}
        )
    else:
        share_id = uuid.uuid4().hex[:14]
        await _shares.insert_one({
            "share_id": share_id, "catalog_type": catalog_type,
            "user_id": uid, "snapshot": snapshot,
            "created_at": now, "updated_at": now,
        })
    base = os.environ.get("PUBLIC_BASE_URL", "")
    share_url = f"{base}/api/info-export/shared/{share_id}" if base else f"/api/info-export/shared/{share_id}"
    return CatalogShareResponse(share_id=share_id, share_url=share_url)


@router.get("/shared/{share_id}", response_class=HTMLResponse)
async def view_shared_catalog(share_id: str):
    share = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    snap = share.get("snapshot") or {}
    items = snap.get("items") or []
    coach = snap.get("coach_name") or ""
    if share["catalog_type"] == "sports":
        html = _build_sports_html(items, coach, share_id=share_id)
    elif share["catalog_type"] == "coaches":
        html = _build_coaches_html(items, coach, share_id=share_id)
    else:
        html = _build_html(share["catalog_type"], items, coach, share_id=share_id)
    return HTMLResponse(content=html)


@router.get("/shared/{share_id}/pdf")
async def download_shared_catalog_pdf(share_id: str):
    share = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    snap = share.get("snapshot") or {}
    items = snap.get("items") or []
    coach = snap.get("coach_name") or ""
    if share["catalog_type"] == "sports":
        html = _build_sports_html(items, coach, share_id=share_id)
    elif share["catalog_type"] == "coaches":
        html = _build_coaches_html(items, coach, share_id=share_id)
    else:
        html = _build_html(share["catalog_type"], items, coach, share_id=share_id)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Catalogo_{share["catalog_type"]}.pdf"'},
    )

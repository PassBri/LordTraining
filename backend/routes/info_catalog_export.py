"""
Exportación y compartición de Catálogos de Información:
- Entidades · Equipos · Atletas · Deportes · Torneos
- PDF estilo whitepaper iTRAIN
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
        with open(f"{brand_dir}/itrain-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/itrain-icon-pdf.png", "rb") as f:
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
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por iTrain.app</div>'

    coach_line = f"<div><strong>Entrenador</strong>{_esc(coach_name)}</div>" if coach_name else ""
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Catálogo {cfg['label']} · iTrain</title>
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
    <img src="data:image/png;base64,{full_b64}" alt="iTRAIN" width="166" height="44" style="width:166px;height:44px;object-fit:contain;display:block;"/>
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
  <img src="data:image/png;base64,{icon_b64}" alt="iTRAIN"/>
  <span>Generado por <strong>iTRAIN</strong> · iTrain.app · Catálogo de {_esc(cfg['label'])}</span>
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


async def _coach_name(user_id: str) -> str:
    u = await _db["users"].find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    if not u:
        return ""
    return u.get("name") or u.get("email") or ""


@router.get("/{catalog_type}/pdf")
async def download_catalog_pdf(catalog_type: str, user=Depends(get_current_user_dep())):
    _validate_type(catalog_type)
    uid = _get_user_id(user)
    items = await _fetch_items(catalog_type, uid)
    coach = await _coach_name(uid)
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
    html = _build_html(share["catalog_type"], snap.get("items") or [], snap.get("coach_name") or "", share_id=share_id)
    return HTMLResponse(content=html)


@router.get("/shared/{share_id}/pdf")
async def download_shared_catalog_pdf(share_id: str):
    share = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    snap = share.get("snapshot") or {}
    html = _build_html(share["catalog_type"], snap.get("items") or [], snap.get("coach_name") or "", share_id=share_id)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Catalogo_{share["catalog_type"]}.pdf"'},
    )

"""
CRUD de modelos de periodización (personalizados por usuario).
- Cada usuario obtiene automáticamente una copia editable de los 29 modelos por defecto al acceder por primera vez.
- El usuario puede editar/eliminar sus copias y crear modelos propios.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

from data.periodization_library import DEFAULT_PERIODIZATION_LIBRARY

router = APIRouter(prefix="/periodization-library", tags=["periodization-library"])

# Mongo
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
models_collection = db["periodization_library"]


class PhaseSchema(BaseModel):
    name: str
    color: str = "#3B82F6"
    volume: int = 70
    intensity: int = 70
    duration_weeks: str = "4"
    description: Optional[str] = ""


class PeriodizationModelCreate(BaseModel):
    name: str
    author: Optional[str] = ""
    category: str = "Custom"
    description: Optional[str] = ""
    icon: Optional[str] = "📊"
    color: Optional[str] = "#CCFF00"
    phases: List[PhaseSchema] = Field(default_factory=list)
    characteristics: List[str] = Field(default_factory=list)
    applicable_sports: List[str] = Field(default_factory=list)
    recommended_duration: Optional[str] = ""


class PeriodizationModelUpdate(BaseModel):
    name: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    phases: Optional[List[PhaseSchema]] = None
    characteristics: Optional[List[str]] = None
    applicable_sports: Optional[List[str]] = None
    recommended_duration: Optional[str] = None


async def _seed_user_library_if_empty(user_id: str) -> None:
    """Siembra la biblioteca por defecto. Si el usuario ya tiene modelos, sólo añade los nuevos (por default_key)
    sin tocar los existentes. Esto permite introducir nuevos modelos default sin dañar las personalizaciones."""
    now = datetime.now(timezone.utc).isoformat()
    existing_keys = set()
    async for m in models_collection.find(
        {"user_id": user_id, "is_default": True},
        {"_id": 0, "default_key": 1, "name": 1}
    ):
        existing_keys.add(m.get("default_key") or m.get("name"))
    # También incluye nombres que existen ya (incluye custom duplicados) para no duplicar si el usuario los editó
    async for m in models_collection.find(
        {"user_id": user_id},
        {"_id": 0, "name": 1}
    ):
        existing_keys.add(m.get("name"))

    docs = []
    for m in DEFAULT_PERIODIZATION_LIBRARY:
        if m["id"] in existing_keys or m["name"] in existing_keys:
            continue
        docs.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": m["name"],
            "author": m.get("author", ""),
            "category": m.get("category", "Clásico"),
            "description": m.get("description", ""),
            "icon": m.get("icon", "📊"),
            "color": m.get("color", "#3B82F6"),
            "phases": m.get("phases", []),
            "characteristics": m.get("characteristics", []),
            "applicable_sports": m.get("applicable_sports", []),
            "recommended_duration": m.get("recommended_duration", ""),
            "is_default": True,
            "default_key": m["id"],
            "created_at": now,
            "updated_at": now,
        })
    if docs:
        await models_collection.insert_many(docs)


def _get_user_id(user):
    return user.get("id") or user.get("user_id")


def get_current_user_dep():
    from server import get_current_user  # lazy import to avoid circular
    return get_current_user


@router.get("")
async def list_models(user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    await _seed_user_library_if_empty(uid)
    cursor = models_collection.find({"user_id": uid}, {"_id": 0, "user_id": 0})
    items = await cursor.to_list(length=500)
    items.sort(key=lambda m: (0 if m.get("is_default") else 1, m.get("category", ""), m.get("name", "")))
    return items


@router.post("")
async def create_model(payload: PeriodizationModelCreate, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "name": payload.name,
        "author": payload.author or "",
        "category": payload.category or "Custom",
        "description": payload.description or "",
        "icon": payload.icon or "📊",
        "color": payload.color or "#CCFF00",
        "phases": [p.model_dump() for p in payload.phases],
        "characteristics": payload.characteristics,
        "applicable_sports": payload.applicable_sports,
        "recommended_duration": payload.recommended_duration or "",
        "is_default": False,
        "created_at": now,
        "updated_at": now,
    }
    await models_collection.insert_one(doc)
    return {k: v for k, v in doc.items() if k not in ("_id", "user_id")}


@router.get("/{model_id}")
async def get_model(model_id: str, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    doc = await models_collection.find_one(
        {"id": model_id, "user_id": uid}, {"_id": 0, "user_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Modelo no encontrado")
    return doc


@router.put("/{model_id}")
async def update_model(model_id: str, payload: PeriodizationModelUpdate, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    existing = await models_collection.find_one({"id": model_id, "user_id": uid})
    if not existing:
        raise HTTPException(404, "Modelo no encontrado")

    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "phases" in update and update["phases"] is not None:
        update["phases"] = [p.model_dump() if hasattr(p, "model_dump") else p for p in update["phases"]]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await models_collection.update_one(
        {"id": model_id, "user_id": uid}, {"$set": update}
    )
    doc = await models_collection.find_one(
        {"id": model_id, "user_id": uid}, {"_id": 0, "user_id": 0}
    )
    return doc


@router.delete("/{model_id}")
async def delete_model(model_id: str, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    result = await models_collection.delete_one({"id": model_id, "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Modelo no encontrado")
    return {"ok": True, "id": model_id}


@router.post("/reset-defaults")
async def reset_defaults(user=Depends(get_current_user_dep())):
    """Re-siembra la biblioteca por defecto del usuario (no toca los modelos custom)."""
    uid = _get_user_id(user)
    await models_collection.delete_many({"user_id": uid, "is_default": True})
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for m in DEFAULT_PERIODIZATION_LIBRARY:
        docs.append({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "name": m["name"],
            "author": m.get("author", ""),
            "category": m.get("category", "Clásico"),
            "description": m.get("description", ""),
            "icon": m.get("icon", "📊"),
            "color": m.get("color", "#3B82F6"),
            "phases": m.get("phases", []),
            "characteristics": m.get("characteristics", []),
            "applicable_sports": m.get("applicable_sports", []),
            "recommended_duration": m.get("recommended_duration", ""),
            "is_default": True,
            "default_key": m["id"],
            "created_at": now,
            "updated_at": now,
        })
    if docs:
        await models_collection.insert_many(docs)
    cursor = models_collection.find({"user_id": uid}, {"_id": 0, "user_id": 0})
    items = await cursor.to_list(length=500)
    return items


# ====================== iTrain PDI WHITEPAPER (PDF) ======================
PDI_WHITEPAPER_HTML = """<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>iTrain PDI · Whitepaper</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.55; font-size: 11pt; }
  h1 { font-size: 32pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4pt; color: #0f172a; }
  h2 { font-size: 16pt; font-weight: 800; margin-top: 20pt; margin-bottom: 8pt; color: #0f172a; border-bottom: 2px solid #CCFF00; padding-bottom: 4pt; }
  h3 { font-size: 12pt; font-weight: 700; margin-top: 12pt; margin-bottom: 4pt; color: #334155; }
  p  { margin: 6pt 0; }
  .hero { background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%); color: #fff; padding: 40pt 30pt; border-radius: 10pt; margin-bottom: 20pt; position: relative; }
  .hero h1 { color: #fff; }
  .hero .subtitle { color: rgba(255,255,255,0.7); font-size: 14pt; margin-top: 6pt; }
  .brand-mark { display: flex; align-items: center; gap: 10pt; margin-bottom: 18pt; }
  .brand-mark img { height: 36pt; width: auto; display: block; }
  .badge { display: inline-block; background: #CCFF00; color: #0f172a; padding: 4pt 10pt; border-radius: 20pt; font-size: 9pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 10pt; }
  .author { font-size: 10pt; color: rgba(255,255,255,0.5); margin-top: 16pt; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8pt; }
  .pillar { background: #f8fafc; border-left: 4pt solid #CCFF00; padding: 10pt 14pt; margin: 8pt 0; border-radius: 4pt; }
  .pillar h3 { margin: 0 0 4pt; }
  table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
  th, td { text-align: left; padding: 6pt 8pt; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-weight: 700; color: #475569; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .phase-row td:first-child { font-weight: 700; }
  .stat-bar { background: #e2e8f0; height: 6pt; border-radius: 3pt; overflow: hidden; display: inline-block; width: 70pt; vertical-align: middle; }
  .stat-bar > div { height: 100%; border-radius: 3pt; }
  ul { margin: 4pt 0 4pt 16pt; padding: 0; }
  li { margin: 3pt 0; }
  .callout { background: #0f172a; color: #fff; padding: 14pt 18pt; border-radius: 8pt; margin: 14pt 0; }
  .callout strong { color: #CCFF00; }
  .glossary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3pt 16pt; margin-top: 6pt; }
  .glossary-grid .g-item { display: flex; gap: 6pt; border-bottom: 1px solid #f1f5f9; padding: 3pt 0; font-size: 9pt; }
  .glossary-grid .g-k { font-weight: 800; min-width: 60pt; color: #0f172a; }
  .footer-brand { display: flex; align-items: center; justify-content: center; gap: 8pt; color: #94a3b8; font-size: 9pt; margin-top: 30pt; padding-top: 12pt; border-top: 1px solid #e2e8f0; }
  .footer-brand img { height: 20pt; width: auto; display: block; }
  .footer-brand strong { color: #CCFF00; background: #0f172a; padding: 2pt 6pt; border-radius: 3pt; }
</style></head><body>

<div class="hero">
  <div class="brand-mark">
    <img src="__ITRAIN_FULL_LOGO__" alt="iTRAIN"/>
  </div>
  <span class="badge">MODELO EXCLUSIVO iTRAIN</span>
  <h1>iTrain PDI</h1>
  <div class="subtitle">Periodización Dual Integrada · Whitepaper técnico</div>
  <p style="margin-top: 14pt; color: rgba(255,255,255,0.8); max-width: 500pt;">
    El primer modelo que formaliza la resolución de la tensión entre necesidades individuales (PAI)
    y coherencia de equipo (CSE) mediante una arquitectura de 3 capas y un Motor de Convergencia en tiempo real.
  </p>
  <div class="author">
    <strong style="color: #CCFF00;">Autor conceptual:</strong> Dr. Brian Gonzalo Suárez Acevedo<br>
    <strong style="color: #CCFF00;">Plataforma:</strong> iTrain.app &nbsp;·&nbsp; <strong style="color: #CCFF00;">Documento técnico:</strong> v1.0
  </div>
</div>

<h2>1. Principio de Tensión Productiva</h2>
<p>El entrenamiento óptimo en deportes de equipo no surge de maximizar únicamente al individuo ni al colectivo,
sino de la <strong>gestión inteligente de la tensión</strong> entre ambos. El PDI establece tres reglas formales:</p>
<ul>
  <li><strong>ZTI</strong> — Zona de Tolerancia Individual: rango porcentual de divergencia aceptable.</li>
  <li><strong>PDP</strong> — Protocolo de Divergencia Planificada: reglas cuando la carga individual supera la ZTI.</li>
  <li><strong>RP</strong> — Resincronización Progresiva: retorno seguro al plan colectivo tras una divergencia.</li>
</ul>

<h2>2. Arquitectura de 3 capas</h2>
<div class="pillar">
  <h3>Capa Colectiva (CSE)</h3>
  <p>Estructura temporal del equipo. Modelo de juego como eje. 3-4 bloques principales (pretemporada, temporada, playoffs),
  competiciones objetivo con prioridad A/B/C, 2-4 picos colectivos anuales.</p>
</div>
<div class="pillar" style="border-left-color: #CCFF00;">
  <h3>Motor de Convergencia</h3>
  <p>Algoritmo que procesa la capa colectiva + el PAI de cada atleta y genera el Contenido Individual Adaptado (CIA).
  Integra RPE matinal, HRV, GPS, minutos jugados y deuda de fatiga (DFI) para ajustar cargas en tiempo real.
  Emite alertas en 4 niveles: VERDE, AMARILLO, NARANJA, ROJO.</p>
</div>
<div class="pillar">
  <h3>Capa Individual (PAI)</h3>
  <p>Representación digital de cada atleta: tipo adaptativo (Rápido, Estándar, Lento, En Recuperación, Alta Carga),
  umbrales MEV/MAV/MRV por músculo, historial de lesiones y zonas de riesgo, RPE/HRV diario, carga acumulada.</p>
</div>

<h2>3. Estructura del Macrociclo</h2>
<table>
  <thead><tr><th>Fase</th><th>Duración</th><th>Volumen</th><th>Intensidad</th><th>Objetivo</th></tr></thead>
  <tbody>
    <tr class="phase-row"><td>Acumulación</td><td>4-6 sem</td>
      <td><span class="stat-bar"><div style="width:90%;background:#3B82F6"></div></span> 90%</td>
      <td><span class="stat-bar"><div style="width:55%;background:#3B82F6"></div></span> 55%</td>
      <td>Base aeróbica + fuerza general + técnica colectiva</td></tr>
    <tr class="phase-row"><td>Transformación</td><td>3-5 sem</td>
      <td><span class="stat-bar"><div style="width:70%;background:#8B5CF6"></div></span> 70%</td>
      <td><span class="stat-bar"><div style="width:80%;background:#8B5CF6"></div></span> 80%</td>
      <td>Conversión a especificidad deportiva</td></tr>
    <tr class="phase-row"><td>Realización</td><td>2-4 sem</td>
      <td><span class="stat-bar"><div style="width:45%;background:#10B981"></div></span> 45%</td>
      <td><span class="stat-bar"><div style="width:95%;background:#10B981"></div></span> 95%</td>
      <td>Pico dual (colectivo + individual)</td></tr>
    <tr class="phase-row"><td>Mantenimiento</td><td>Temporada</td>
      <td><span class="stat-bar"><div style="width:55%;background:#F59E0B"></div></span> 55%</td>
      <td><span class="stat-bar"><div style="width:78%;background:#F59E0B"></div></span> 78%</td>
      <td>Morfociclo MD+1/-4/-3/-2/-1/MD con CIA ajustado</td></tr>
    <tr class="phase-row"><td>Recuperación</td><td>2-4 sem</td>
      <td><span class="stat-bar"><div style="width:35%;background:#6B7280"></div></span> 35%</td>
      <td><span class="stat-bar"><div style="width:35%;background:#6B7280"></div></span> 35%</td>
      <td>Resincronización + regeneración</td></tr>
  </tbody>
</table>

<h2>4. Morfociclo semanal PDI</h2>
<table>
  <thead><tr><th>Día</th><th>Énfasis colectivo</th><th>Ajuste individual (CIA)</th></tr></thead>
  <tbody>
    <tr><td><strong>MD+1</strong></td><td>Recuperación activa</td><td>Pasiva si &gt;75 min jugados; compensatoria si &lt;20 min</td></tr>
    <tr><td><strong>MD-4</strong></td><td>Tensión muscular</td><td>Reducir 20% si MRV bajo o tipo Lento</td></tr>
    <tr><td><strong>MD-3</strong></td><td>Duración/Resistencia</td><td>+12% aeróbico para tipo Lento; −25% si en recuperación</td></tr>
    <tr><td><strong>MD-2</strong></td><td>Velocidad / SNC</td><td>Bloquear si RPE matinal &gt;7</td></tr>
    <tr><td><strong>MD-1</strong></td><td>Activación técnica</td><td>Frescura total, sin ajustes salvo lesión</td></tr>
    <tr><td><strong>MD</strong></td><td>Partido / competición</td><td>Rotación por DFI &amp; carga acumulada</td></tr>
  </tbody>
</table>

<h2>5. Reglas del Motor de Convergencia</h2>
<div class="callout">
  El Motor procesa diariamente RPE + HRV + GPS + DFI + tipo adaptativo y decide si el atleta:
  <strong>(a)</strong> sigue el plan colectivo,
  <strong>(b)</strong> entra en PDP con carga individualizada, o
  <strong>(c)</strong> activa Resincronización Progresiva tras divergencia crítica.
</div>
<ul>
  <li><strong>RPE ≥8</strong> → bloqueo carga desarrollo; vol −40%, int −15%</li>
  <li><strong>HRV &lt;75% baseline</strong> → alerta AMARILLO; reducir carga global −25%</li>
  <li><strong>DFI &gt;85%</strong> → alerta ROJO; bloqueo total de desarrollo, activación RP</li>
  <li><strong>Minutos &gt;75</strong> en último partido → MD+1 pasiva</li>
  <li><strong>Tipo Lento</strong> + MD-3 → +12% bloque aeróbico extra</li>
</ul>

<h2>6. Glosario técnico</h2>
<div class="glossary-grid">
  <div class="g-item"><span class="g-k">PAI</span>Perfil Adaptativo Individual</div>
  <div class="g-item"><span class="g-k">CSE</span>Coherencia de Sistema de Equipo</div>
  <div class="g-item"><span class="g-k">MC</span>Marco Colectivo</div>
  <div class="g-item"><span class="g-k">CIA</span>Contenido Individual Adaptado</div>
  <div class="g-item"><span class="g-k">ZTI</span>Zona de Tolerancia Individual</div>
  <div class="g-item"><span class="g-k">PDP</span>Protocolo de Divergencia Planificada</div>
  <div class="g-item"><span class="g-k">RP</span>Resincronización Progresiva</div>
  <div class="g-item"><span class="g-k">DFI</span>Deuda de Fatiga Individual</div>
  <div class="g-item"><span class="g-k">ZRL</span>Zona de Riesgo de Lesión</div>
  <div class="g-item"><span class="g-k">CFI</span>Condición de Forma Individual</div>
  <div class="g-item"><span class="g-k">MEV</span>Mínimo Volumen Efectivo</div>
  <div class="g-item"><span class="g-k">MAV</span>Máximo Volumen Adaptativo</div>
  <div class="g-item"><span class="g-k">MRV</span>Máximo Volumen Recuperable</div>
  <div class="g-item"><span class="g-k">CIE/CEE</span>Carga Interna/Externa de Equipo</div>
</div>

<h2>7. Aplicabilidad</h2>
<p>Deportes colectivos con dinámicas individuo-equipo marcadas: fútbol, baloncesto, balonmano, voleibol, rugby, hockey.
El modelo escala desde equipos amateur hasta profesionales de élite con calendarios de 70-80 partidos anuales.</p>

<div class="footer-brand">
  <img src="__ITRAIN_ICON_LOGO__" alt="iTRAIN"/>
  <span>Modelo registrado · <strong>iTRAIN</strong> · iTrain.app · Generado automáticamente desde la Ficha Técnica</span>
</div>

</body></html>"""


@router.get("/pdi/whitepaper")
async def download_pdi_whitepaper(user=Depends(get_current_user_dep())):
    """Genera y devuelve el whitepaper del modelo iTrain PDI en PDF usando Playwright."""
    try:
        import base64
        # Load the official iTRAIN brand images (same as Dashboard)
        brand_dir = "/app/frontend/public/brand"
        with open(f"{brand_dir}/itrain-full-light.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/itrain-icon-light.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
        html = (PDI_WHITEPAPER_HTML
                .replace("__ITRAIN_FULL_LOGO__", f"data:image/png;base64,{full_b64}")
                .replace("__ITRAIN_ICON_LOGO__", f"data:image/png;base64,{icon_b64}"))

        os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/pw-browsers")
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            )
            page = await browser.new_page(viewport={"width": 794, "height": 1123})
            await page.set_content(html, wait_until="domcontentloaded")
            await page.wait_for_timeout(500)
            pdf = await page.pdf(format="A4", print_background=True, margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
            await browser.close()
        return Response(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="iTrain_PDI_Whitepaper.pdf"'},
        )
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")


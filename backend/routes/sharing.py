"""Compartir sesiones/pizarras + perfiles públicos de coach + imágenes OG + descargas PDF públicas.
Extraído de server.py — FASE 1 segmentación. Rutas públicas/token-based (sin get_current_user)."""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import logging

from core.auth import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Sharing & Public"])


# =============== SESSION SHARING ===============
class SessionShareRequest(BaseModel):
    athlete_id: str
    athlete_name: str = "Atleta"
    session_data: Dict[str, Any]
    session_image: Optional[str] = None
    session_code: Optional[str] = None

@router.post("/sessions/share")
async def create_session_share(request: SessionShareRequest, authorization: str = Header(None), db=Depends(get_db)):
    """Crear un enlace para compartir una sesión con el deportista (con imagen)"""
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No autorizado")
        
        # Generar ID: SES-XXX-hash6
        import secrets
        code = request.session_code or "SES-001"
        hash6 = secrets.token_hex(3)
        share_id = f"{code}-{hash6}"
        
        # Guardar sesión compartida en DB (con imagen si existe)
        shared_session = {
            "share_id": share_id,
            "athlete_id": request.athlete_id,
            "athlete_name": request.athlete_name,
            "session_data": request.session_data,
            "session_image": request.session_image,  # Imagen en base64
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30),  # Expira en 30 días
            "views": 0
        }
        
        await db.shared_sessions.insert_one(shared_session)
        
        return {"share_id": share_id, "expires_in_days": 30}
        
    except Exception as e:
        logger.error(f"Error creating session share: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear enlace: {str(e)}")


@router.get("/sessions/view/{share_id}")
async def get_shared_session(share_id: str, db=Depends(get_db)):
    """Obtener sesión compartida para visualización pública (sin autenticación)"""
    try:
        # Buscar sesión compartida
        shared = await db.shared_sessions.find_one({"share_id": share_id})
        
        if not shared:
            raise HTTPException(status_code=404, detail="Sesión no encontrada o enlace expirado")
        
        # Verificar si no ha expirado (manejar datetime naive y aware)
        expires_at = shared.get("expires_at")
        if expires_at:
            # Si la fecha es naive, hacerla aware
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="El enlace ha expirado")
        
        # Incrementar contador de vistas
        await db.shared_sessions.update_one(
            {"share_id": share_id},
            {"$inc": {"views": 1}}
        )
        
        # Serializar created_at para la respuesta
        created_at = shared.get("created_at")
        if created_at and hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        
        return {
            "athlete_name": shared.get("athlete_name", "Atleta"),
            "session_data": shared.get("session_data", {}),
            "session_image": shared.get("session_image"),  # Imagen en base64
            "created_at": created_at,
            "views": shared.get("views", 0) + 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting shared session: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener sesión: {str(e)}")


# ═══════════════════════════════════════════════════════════
# TACTICAL BOARD SHARE (sin auth, público)
# ═══════════════════════════════════════════════════════════

class BoardShareRequest(BaseModel):
    payload: dict
    sport: Optional[str] = None
    thumbnail: Optional[str] = None  # data URL (image/png;base64,...)
    title: Optional[str] = None
    description: Optional[str] = None
    coach_slug: Optional[str] = None  # slug del coach (opcional, ej "juan-perez")
    coach_name: Optional[str] = None  # nombre visible del coach


@router.post("/boards/share")
async def create_board_share(request: BoardShareRequest, db=Depends(get_db)):
    """Crear enlace público para compartir tablero táctico (sin autenticación)."""
    try:
        import secrets
        share_id = f"TB-{secrets.token_urlsafe(6)}"
        doc = {
            "share_id": share_id,
            "sport": request.sport or (request.payload.get("sport") if isinstance(request.payload, dict) else None),
            "payload": request.payload,
            "thumbnail": request.thumbnail,
            "title": request.title or f"Jugada táctica · {request.sport or 'LordTraining'}",
            "description": request.description or "Pizarra táctica creada en LordTraining",
            "coach_slug": (request.coach_slug or "").strip().lower().replace(' ', '-')[:48] or None,
            "coach_name": (request.coach_name or "").strip()[:60] or None,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=90),
            "views": 0,
            "duplicates": 0,
        }
        await db.shared_boards.insert_one(doc)
        return {"share_id": share_id, "expires_in_days": 90}
    except Exception as e:
        logger.error(f"Error creating board share: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear enlace: {str(e)}")


@router.get("/boards/view/{share_id}")
async def get_shared_board(share_id: str, db=Depends(get_db)):
    """Obtener tablero compartido para visualización pública."""
    try:
        shared = await db.shared_boards.find_one({"share_id": share_id}, {"_id": 0, "thumbnail": 0})
        if not shared:
            raise HTTPException(status_code=404, detail="Tablero no encontrado o enlace expirado")
        expires_at = shared.get("expires_at")
        if expires_at:
            if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="El enlace ha expirado")
        await db.shared_boards.update_one({"share_id": share_id}, {"$inc": {"views": 1}})
        created_at = shared.get("created_at")
        if created_at and hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        expires_iso = shared.get("expires_at")
        if expires_iso and hasattr(expires_iso, 'isoformat'):
            expires_iso = expires_iso.isoformat()
        return {
            "share_id": share_id,
            "sport": shared.get("sport"),
            "title": shared.get("title"),
            "description": shared.get("description"),
            "payload": shared.get("payload", {}),
            "created_at": created_at,
            "expires_at": expires_iso,
            "views": shared.get("views", 0) + 1,
            "duplicates": shared.get("duplicates", 0),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting shared board: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener tablero: {str(e)}")


@router.post("/boards/duplicate/{share_id}")
async def track_board_duplicate(share_id: str, db=Depends(get_db)):
    """Registra que un coach duplicó una jugada compartida (analítica)."""
    try:
        result = await db.shared_boards.update_one(
            {"share_id": share_id},
            {"$inc": {"duplicates": 1}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Pizarra no encontrada")
        shared = await db.shared_boards.find_one({"share_id": share_id}, {"duplicates": 1, "_id": 0})
        return {"share_id": share_id, "duplicates": shared.get("duplicates", 0)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking duplicate: {e}")
        raise HTTPException(status_code=500, detail="Error al registrar duplicado")


@router.get("/coaches/{slug}")
async def get_coach_profile(slug: str, db=Depends(get_db)):
    """Perfil público del coach con sus jugadas compartidas."""
    try:
        s = slug.strip().lower()
        cursor = db.shared_boards.find({"coach_slug": s}, {"_id": 0, "payload": 0, "thumbnail": 0})
        cursor = cursor.sort([("duplicates", -1), ("views", -1), ("created_at", -1)])
        items = []
        coach_name = None
        async for doc in cursor:
            if not coach_name and doc.get("coach_name"):
                coach_name = doc.get("coach_name")
            ca = doc.get("created_at")
            if ca and hasattr(ca, 'isoformat'):
                ca = ca.isoformat()
            items.append({
                "share_id": doc.get("share_id"),
                "title": doc.get("title"),
                "sport": doc.get("sport"),
                "views": doc.get("views", 0),
                "duplicates": doc.get("duplicates", 0),
                "created_at": ca,
            })
        totals = {
            "boards": len(items),
            "views": sum(i["views"] for i in items),
            "duplicates": sum(i["duplicates"] for i in items),
        }
        return {
            "slug": s,
            "coach_name": coach_name or s.replace('-', ' ').title(),
            "items": items,
            "totals": totals,
            "not_found": len(items) == 0,
        }
    except Exception as e:
        logger.error(f"Error getting coach profile: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener perfil")


@router.get("/c/{slug}")
async def coach_share_landing(slug: str, request: Request, db=Depends(get_db)):
    """HTML landing público del perfil coach con OpenGraph (preview WhatsApp/Twitter/FB)."""
    from fastapi.responses import HTMLResponse
    try:
        s = slug.strip().lower()
        # Fetch coach summary
        cursor = db.shared_boards.find({"coach_slug": s}, {"_id": 0, "payload": 0, "thumbnail": 0}).sort([("duplicates", -1), ("views", -1)])
        items = []
        coach_name = None
        async for doc in cursor:
            if not coach_name and doc.get("coach_name"):
                coach_name = doc.get("coach_name")
            items.append({
                "title": doc.get("title") or "Jugada",
                "sport": doc.get("sport") or "",
                "views": doc.get("views", 0),
                "duplicates": doc.get("duplicates", 0),
            })
        display_name = coach_name or s.replace('-', ' ').title()
        totals_boards = len(items)
        totals_views = sum(i["views"] for i in items)
        totals_dup = sum(i["duplicates"] for i in items)
        # Build OG
        host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.base_url.hostname
        proto = request.headers.get("x-forwarded-proto") or "https"
        base_url = f"{proto}://{host}"
        og_image = f"{base_url}/api/coaches/og/{s}.png"
        title = f"{display_name} · Coach LordTraining"
        top3 = ", ".join([i["title"][:40] for i in items[:3]]) if items else "Perfil de entrenador LordTraining"
        desc = f"{totals_boards} jugadas · {totals_views} vistas · {totals_dup} duplicadas. Top: {top3}"
        target_rel = f"/coach.html?slug={s}"
        html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="profile">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="{base_url}/api/c/{s}">
<meta property="og:site_name" content="LordTraining Coach">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{og_image}">
<meta http-equiv="refresh" content="0;url={target_rel}">
<style>body{{font-family:system-ui;background:#0a0f19;color:#e8e8e8;text-align:center;padding:80px 24px}}a{{color:#c8f700}}</style>
<script>window.location.replace({target_rel!r});</script>
</head>
<body>
<h1>{title}</h1>
<p>{desc}</p>
<p>Cargando perfil… <a href="{target_rel}">haz clic aquí si no redirige</a>.</p>
</body>
</html>"""
        return HTMLResponse(html)
    except Exception as e:
        logger.error(f"Error coach share landing: {e}")
        return HTMLResponse("<h1>Error cargando perfil</h1>", status_code=500)


@router.get("/coaches/og/{slug}.png")
async def get_coach_og_image(slug: str, db=Depends(get_db)):
    """Genera imagen OpenGraph 1200×630 para perfil de coach (avatar + top 3 jugadas + stats)."""
    from fastapi.responses import Response
    from PIL import Image, ImageDraw, ImageFont
    import io
    try:
        s = slug.strip().lower()
        cursor = db.shared_boards.find({"coach_slug": s}, {"_id": 0, "payload": 0, "thumbnail": 0}).sort([("duplicates", -1), ("views", -1)])
        items = []
        coach_name = None
        async for doc in cursor:
            if not coach_name and doc.get("coach_name"):
                coach_name = doc.get("coach_name")
            items.append({
                "title": doc.get("title") or "Jugada",
                "sport": doc.get("sport") or "",
                "views": doc.get("views", 0),
                "duplicates": doc.get("duplicates", 0),
            })
        display_name = coach_name or s.replace('-', ' ').title()
        totals_boards = len(items)
        totals_views = sum(i["views"] for i in items)
        totals_dup = sum(i["duplicates"] for i in items)
        initials = "".join([w[0] for w in display_name.split()[:2]]).upper() or s[:1].upper()

        # Canvas 1200×630 (OG standard)
        W, H = 1200, 630
        img = Image.new("RGB", (W, H), color=(10, 15, 25))
        draw = ImageDraw.Draw(img)

        # Radial gradient background approx
        for y in range(H):
            t = y / H
            r = int(26 + (10 - 26) * t)
            g = int(37 + (15 - 37) * t)
            b = int(64 + (25 - 64) * t)
            draw.line([(0, y), (W, y)], fill=(r, g, b))

        # Font loading (fallback to default)
        def load_font(sz, bold=False):
            try:
                return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", sz)
            except Exception:
                return ImageFont.load_default()
        F_H1 = load_font(64, bold=True)
        F_H2 = load_font(28, bold=True)
        F_BODY = load_font(22, bold=False)
        F_SMALL = load_font(18, bold=False)
        F_TAG = load_font(16, bold=True)
        F_AVATAR = load_font(90, bold=True)
        F_STAT = load_font(48, bold=True)

        # Brand stripe top
        draw.rectangle([(0, 0), (W, 8)], fill=(200, 247, 0))
        draw.text((40, 28), "LordTraining · COACH", font=F_TAG, fill=(200, 247, 0))

        # Avatar circle (lime gradient)
        avX, avY, avR = 150, 220, 90
        draw.ellipse([(avX-avR-4, avY-avR-4), (avX+avR+4, avY+avR+4)], fill=(180, 220, 0))
        draw.ellipse([(avX-avR, avY-avR), (avX+avR, avY+avR)], fill=(200, 247, 0))
        # Initials centered
        try:
            bbox = draw.textbbox((0, 0), initials[:2], font=F_AVATAR)
            tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        except Exception:
            tw, th = len(initials) * 40, 80
        draw.text((avX - tw/2, avY - th/2 - 10), initials[:2], font=F_AVATAR, fill=(10, 15, 25))

        # Name + handle
        draw.text((270, 170), display_name[:26], font=F_H1, fill=(255, 255, 255))
        draw.text((270, 250), f"@{s}", font=F_H2, fill=(148, 163, 184))

        # Stats row
        stats = [
            (str(totals_boards), "Jugadas"),
            (f"{totals_views:,}".replace(",", "."), "Vistas"),
            (f"{totals_dup:,}".replace(",", "."), "Duplicadas"),
        ]
        for i, (val, lbl) in enumerate(stats):
            x = 270 + i * 180
            draw.text((x, 310), val, font=F_STAT, fill=(200, 247, 0) if i != 1 else (255, 122, 0))
            draw.text((x, 370), lbl.upper(), font=F_SMALL, fill=(148, 163, 184))

        # Top 3 jugadas list
        draw.text((40, 440), "TOP JUGADAS", font=F_TAG, fill=(200, 247, 0))
        if items:
            for i, it in enumerate(items[:3]):
                y = 475 + i * 42
                title_t = it["title"][:48]
                sport_t = it["sport"][:16]
                # Rank
                draw.rectangle([(40, y), (85, y+32)], fill=(255, 122, 0) if i == 0 else (200, 247, 0) if i == 1 else (148, 163, 184))
                draw.text((55, y+5), f"#{i+1}", font=F_TAG, fill=(10, 15, 25))
                # Title
                draw.text((100, y+4), title_t, font=F_BODY, fill=(255, 255, 255))
                # Sport + duplicates
                tag = f"{sport_t} · {it['duplicates']} dup"
                draw.text((100, y+24), tag[:50], font=F_SMALL, fill=(148, 163, 184))
        else:
            draw.text((40, 475), "Aún no hay jugadas publicadas", font=F_BODY, fill=(148, 163, 184))

        # Footer
        draw.text((40, H - 40), "lordtraining.coach  ·  Pizarra táctica inteligente", font=F_SMALL, fill=(100, 116, 139))

        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return Response(content=buf.getvalue(), media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})
    except Exception as e:
        logger.error(f"Error generating coach OG image: {e}")
        raise HTTPException(status_code=500, detail="Error generando imagen")



@router.get("/boards/top")
async def get_top_shared_boards(limit: int = 5, sport: Optional[str] = None, db=Depends(get_db)):
    """Top N jugadas más duplicadas y/o vistas (dashboard coach - Spotify Wrapped style)."""
    try:
        query = {}
        if sport:
            query["sport"] = sport
        cursor = db.shared_boards.find(query, {"_id": 0, "payload": 0, "thumbnail": 0})
        cursor = cursor.sort([("duplicates", -1), ("views", -1)]).limit(max(1, min(limit, 20)))
        items = []
        async for doc in cursor:
            created_at = doc.get("created_at")
            if created_at and hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            items.append({
                "share_id": doc.get("share_id"),
                "title": doc.get("title"),
                "sport": doc.get("sport"),
                "views": doc.get("views", 0),
                "duplicates": doc.get("duplicates", 0),
                "created_at": created_at,
                "has_thumbnail": True,  # siempre servimos el fallback si no existe
            })
        # Totals globales
        total_doc = await db.shared_boards.aggregate([
            {"$group": {"_id": None, "totalViews": {"$sum": "$views"}, "totalDupes": {"$sum": "$duplicates"}, "count": {"$sum": 1}}}
        ]).to_list(1)
        totals = total_doc[0] if total_doc else {"totalViews": 0, "totalDupes": 0, "count": 0}
        return {"items": items, "totals": {"views": totals.get("totalViews", 0), "duplicates": totals.get("totalDupes", 0), "boards": totals.get("count", 0)}}
    except Exception as e:
        logger.error(f"Error getting top boards: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener top")



@router.get("/boards/og/{share_id}.png")
async def get_board_thumbnail(share_id: str, db=Depends(get_db)):
    """Devuelve la miniatura PNG de una pizarra compartida (para OpenGraph)."""
    import base64
    from fastapi.responses import Response
    try:
        shared = await db.shared_boards.find_one({"share_id": share_id}, {"thumbnail": 1, "_id": 0})
        if not shared or not shared.get("thumbnail"):
            raise HTTPException(status_code=404, detail="Miniatura no disponible")
        thumb = shared["thumbnail"]
        if thumb.startswith("data:"):
            thumb = thumb.split(",", 1)[1]
        data = base64.b64decode(thumb)
        return Response(content=data, media_type="image/png", headers={"Cache-Control": "public, max-age=604800"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting thumbnail: {e}")
        raise HTTPException(status_code=404, detail="Miniatura no disponible")


@router.get("/s/{share_id}")
async def board_share_landing(share_id: str, request: Request, db=Depends(get_db)):
    """HTML landing público con metatags OpenGraph (para previews WhatsApp/Twitter/FB)."""
    from fastapi.responses import HTMLResponse
    try:
        shared = await db.shared_boards.find_one({"share_id": share_id}, {"_id": 0, "payload": 0})
        if not shared:
            return HTMLResponse("<h1>Pizarra no encontrada o enlace expirado</h1>", status_code=404)
        title = shared.get("title") or f"Jugada táctica · {shared.get('sport') or 'LordTraining'}"
        desc = shared.get("description") or f"Pizarra táctica de {shared.get('sport') or 'LordTraining'} creada en LordTraining Coach"
        # Build external base URL from forwarded headers (ingress)
        host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.base_url.hostname
        proto = request.headers.get("x-forwarded-proto") or ("https" if str(request.url).startswith("https") else "https")
        base_url = f"{proto}://{host}"
        og_image = f"{base_url}/api/boards/og/{share_id}.png"
        # Use RELATIVE redirect so browser resolves against the host it visited
        target_rel = f"/tactical-board.html?s={share_id}&viewer=1"
        html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title} · LordTraining</title>
<meta name="description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="{base_url}/api/s/{share_id}">
<meta property="og:site_name" content="LordTraining Coach">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{og_image}">
<meta http-equiv="refresh" content="0;url={target_rel}">
<style>body{{font-family:system-ui;background:#0b0f19;color:#e8e8e8;text-align:center;padding:80px 24px}}a{{color:#c8f700}}</style>
<script>window.location.replace({target_rel!r});</script>
</head>
<body>
<h1>{title}</h1>
<p>{desc}</p>
<p>Cargando pizarra… si no redirige automáticamente, <a href="{target_rel}">haz clic aquí</a>.</p>
</body>
</html>"""
        return HTMLResponse(html)
    except Exception as e:
        logger.error(f"Error board share landing: {e}")
        return HTMLResponse("<h1>Error cargando pizarra</h1>", status_code=500)




@router.get("/sessions/download-pdf/{share_id}")
async def download_session_pdf(share_id: str, theme: str = "dark", db=Depends(get_db)):
    """Genera PDF de la sesión pública con WeasyPrint (producción-safe).

    Reutiliza el generador de pizarras/boards que construye el HTML en el
    servidor desde los datos de la sesión, evitando renderizar la página React.
    """
    return await download_session_boards_pdf(share_id, theme=theme, db=db)


@router.get("/sessions/download-boards-pdf/{share_id}")
async def download_session_boards_pdf(share_id: str, theme: str = "light", db=Depends(get_db)):
    """Genera PDF en forma de cuadrícula con los ejercicios, sus pizarras, series,
    repeticiones, capacidad física, intensidad, volumen y fase (Inicial/Principal/Final)."""
    from fastapi.responses import Response
    import html as _html
    try:
        shared = await db.shared_sessions.find_one({"share_id": share_id}, {"_id": 0})
        if not shared:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")

        session_data = shared.get("session_data", {}) or {}
        detailed = session_data.get("detailedData", {}) or {}
        session_name = (
            detailed.get("sessionName")
            or session_data.get("sessionName")
            or session_data.get("dayName")
            or "Sesión de entrenamiento"
        )
        athlete_name = shared.get("athlete_name", "Deportista")
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
        # Fondo verde tipo cancha (como tactical-board) — distinto por tema
        court_bg = ("#2d5f3e" if is_dark else
                    "radial-gradient(ellipse at center, #dcefd2 0%, #c6e5b5 60%, #b3d9a1 100%)")
        court_border = "rgba(255,255,255,0.25)" if is_dark else "rgba(22,101,52,0.30)"
        chip_bg = "rgba(255,255,255,0.06)" if is_dark else "rgba(15,23,42,0.05)"
        chip_border = "rgba(255,255,255,0.10)" if is_dark else "rgba(15,23,42,0.10)"

        def _esc(v):
            if v is None:
                return ""
            return _html.escape(str(v))

        def _sanitize_svg(svg_str):
            """boardThumbnail ya viene como SVG string. Insertar tal cual (confiamos
            en el origen propio)."""
            if not svg_str:
                return ""
            s = str(svg_str).strip()
            return s

        def _cap_color(cap):
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

        cards_html_parts = []
        total_acts = 0
        for fase_key, fase_label, fase_color in fase_order:
            fase = fases_dict.get(fase_key, {}) or {}
            acts = fase.get("actividades", []) or []
            if not acts:
                continue
            cards_html_parts.append(f"""
              <div class="fase-banner" style="--fase:{fase_color};">
                <span class="fase-dot"></span>
                <span class="fase-label">{fase_label}</span>
                <span class="fase-count">{len(acts)} ejercicio{'s' if len(acts)!=1 else ''}</span>
              </div>
            """)
            cards_html_parts.append('<div class="cards-grid">')
            for i, act in enumerate(acts, 1):
                total_acts += 1
                board_svg = _sanitize_svg(act.get("boardThumbnail"))
                board_inner = (
                    f'<div class="court">{board_svg}</div>'
                    if board_svg
                    else '<div class="court empty"><span>Sin pizarra asignada</span></div>'
                )
                cap_color, cap_label = _cap_color(act.get("capacidadFisica"))
                series_v = act.get('series', '—')
                reps_v = act.get('repeticiones', '—')
                int_v = act.get('intensidad', '—')
                vol_v = act.get('volumen', '—')
                desc = act.get("descripcion") or ""
                int_display = (f"{_esc(int_v)}%" if int_v not in (None,'','—') else '—')
                cards_html_parts.append(f"""
                  <article class="card" style="--fase:{fase_color};">
                    <div class="card-head">
                      <span class="idx" style="background:{fase_color};">{i:02d}</span>
                      <div class="card-title">
                        <h3>{_esc(act.get('nombre') or act.get('name') or 'Ejercicio')}</h3>
                        {f'<p class="card-desc">{_esc(desc)}</p>' if desc else ''}
                      </div>
                      <span class="cap-chip" style="color:{cap_color};border-color:{cap_color};">
                        {_esc(cap_label)}
                      </span>
                    </div>
                    <div class="board-hero">
                      {board_inner}
                    </div>
                    <div class="stats">
                      <div class="stat"><span class="k">Series</span><span class="v">{_esc(series_v)}</span></div>
                      <div class="stat"><span class="k">Reps.</span><span class="v">{_esc(reps_v)}</span></div>
                      <div class="stat"><span class="k">Intensidad</span><span class="v">{int_display}</span></div>
                      <div class="stat"><span class="k">Volumen</span><span class="v">{_esc(vol_v)}</span></div>
                    </div>
                  </article>
                """)
            cards_html_parts.append('</div>')

        if not cards_html_parts:
            cards_html_parts.append(
                '<div class="empty-note">Esta sesión no tiene actividades aún.</div>'
            )

        objetivos_html = ""
        if objetivo_general or objetivos_especificos:
            items = ""
            if objetivo_general:
                items += f'<li><strong>General:</strong> {_esc(objetivo_general)}</li>'
            for o in objetivos_especificos:
                if o:
                    items += f"<li>{_esc(o)}</li>"
            objetivos_html = f"""
              <section class="objectives">
                <h2>Objetivos</h2>
                <ul>{items}</ul>
              </section>
            """

        full_html = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<title>LordTraining · {_esc(session_name)}</title>
<style>
  @page {{ size: A4; margin: 0; }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin:0; padding:0; background:{bg}; color:{ink};
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  body {{ min-height: 297mm; background:{bg}; }}
  .page {{ padding: 10mm 9mm; max-width: 100%; background:{bg}; min-height: 297mm; }}

  header.hd {{ display:flex; align-items:flex-end; justify-content:space-between;
    border-bottom: 2px solid {accent}; padding-bottom: 9px; margin-bottom: 10px; }}
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
    border-left:3px solid {accent}; border-radius:6px; padding:7px 12px;
    margin-bottom: 10px; }}
  section.objectives h2 {{ font-size:9px; letter-spacing:0.22em;
    text-transform: uppercase; color:{ink_muted}; margin:0 0 3px 0; font-weight:800; }}
  section.objectives ul {{ margin:0; padding-left:16px; font-size:10px; line-height:1.45; }}
  section.objectives li {{ margin-bottom:1px; }}

  .fase-banner {{ display:flex; align-items:center; gap:10px;
    margin: 10px 0 7px 0; padding: 5px 10px; border-radius: 5px;
    background: linear-gradient(90deg, var(--fase)18, transparent 70%);
    border-left: 3px solid var(--fase); }}
  .fase-dot {{ width:8px; height:8px; border-radius:999px; background:var(--fase);
    box-shadow: 0 0 0 3px var(--fase)33; }}
  .fase-label {{ color:var(--fase); font-weight:900; font-size:10px;
    letter-spacing:0.22em; text-transform:uppercase; }}
  .fase-count {{ color:{ink_muted}; font-size:9px; font-weight:600; margin-left:auto; }}

  .cards-grid {{ display:grid; grid-template-columns: 1fr 1fr; gap:8px;
    margin-bottom: 8px; }}
  .card {{ background: {surface}; border: 1px solid {border};
    border-top: 2px solid var(--fase); border-radius: 7px; overflow: hidden;
    display:flex; flex-direction:column; page-break-inside: avoid;
    break-inside: avoid; }}
  .card-head {{ display:flex; align-items:flex-start; gap:7px;
    padding: 7px 9px 5px 9px; }}
  .idx {{ display:inline-flex; align-items:center; justify-content:center;
    width: 22px; height: 22px; border-radius: 5px; color: #0a0a0f;
    font-weight: 900; font-size: 10px; font-variant-numeric: tabular-nums;
    flex-shrink:0; }}
  .card-title {{ flex: 1; min-width: 0; }}
  .card-title h3 {{ margin: 0; font-size: 11.5px; font-weight: 800; color: {ink};
    line-height: 1.2; letter-spacing: -0.01em; }}
  .card-desc {{ margin: 1px 0 0 0; font-size: 8.5px; color: {ink_muted};
    line-height: 1.35; }}
  .cap-chip {{ font-size: 8px; font-weight: 900; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 2px 6px; border: 1px solid;
    border-radius: 999px; white-space: nowrap; flex-shrink: 0; align-self:flex-start; }}

  .board-hero {{ margin: 0 9px; height: 336px; border-radius: 6px;
    background: {court_bg}; border: 1px solid {court_border};
    overflow: hidden; position: relative; }}
  .court {{ width: 100%; height: 100%; display: flex; align-items: center;
    justify-content: center; }}
  .court svg {{ width: 100%; height: 100%; max-width: 100%; max-height: 100%;
    display: block; }}
  .court.empty {{ font-size: 9px; font-style: italic;
    color: { '#86efac' if is_dark else '#166534' };
    letter-spacing: 0.06em; text-transform: uppercase; }}

  .stats {{ display:grid; grid-template-columns: repeat(4, 1fr); gap:4px;
    padding: 7px 9px 9px 9px; }}
  .stat {{ display:flex; flex-direction:column; align-items:center;
    padding: 4px 2px; border-radius: 4px;
    background: {chip_bg}; border: 1px solid {chip_border}; }}
  .stat .k {{ font-size: 7.5px; color: {ink_muted};
    text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }}
  .stat .v {{ font-size: 12px; color: {ink}; font-weight: 900;
    font-variant-numeric: tabular-nums; margin-top: 1px; line-height: 1; }}

  .empty-note {{ text-align:center; color:{ink_muted};
    font-style: italic; padding: 28px; border: 1px dashed {border};
    border-radius: 8px; }}

  footer.ft {{ margin-top: 10px; font-size: 8px; color: {ink_muted};
    text-align: right; border-top: 1px solid {border}; padding-top: 5px;
    letter-spacing: 0.08em; text-transform: uppercase; }}
</style></head>
<body>
  <div class="page">
    <header class="hd">
      <div>
        <div class="brand">LordTraining · Plan de Sesión</div>
        <h1 class="title">{_esc(session_name)}</h1>
        <div class="meta">
          <span><strong>Deportista:</strong> {_esc(athlete_name)}</span>
          {f'<span><strong>Duración:</strong> {_esc(detailed.get("duration",""))} min</span>' if detailed.get("duration") else ''}
          <span><strong>Ejercicios:</strong> {total_acts}</span>
        </div>
      </div>
      <div class="tag">Pizarras {('Oscuras' if is_dark else 'Claras')}</div>
    </header>
    {objetivos_html}
    {''.join(cards_html_parts)}
    <footer class="ft">Generado con LordTraining · {share_id}</footer>
  </div>
</body></html>"""

        import asyncio
        from routes.pdf_render import html_to_pdf
        pdf_bytes = await asyncio.to_thread(html_to_pdf, full_html, True)

        safe_name = ''.join(c if c.isalnum() or c in ('-','_') else '-' for c in str(session_name))[:60]
        filename = f"LordTraining_pizarras_{safe_name}_{theme}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating boards PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")







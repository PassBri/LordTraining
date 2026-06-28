"""Dashboard stats y Panel de Control (stats computados + export PDF).
Extraído de server.py — FASE 1 segmentación. Sin cambios de comportamiento."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
from io import BytesIO
import jwt
import os

from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor

from core.models import ExportPDFRequest, SubscriptionPlan, SUBSCRIPTION_LIMITS

router = APIRouter(prefix="/api", tags=["Dashboard & Control Panel"])
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"


def get_db(request: Request):
    return request.app.state.db


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db=Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =============== DASHBOARD STATS ===============
@router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user), db=Depends(get_db)):
    athletes_count = await db.athletes.count_documents({"coach_id": user["id"]})
    macrocycles_count = await db.macrocycles.count_documents({"coach_id": user["id"]})
    
    # Get recent sessions
    macros = await db.macrocycles.find({"coach_id": user["id"]}, {"_id": 0, "id": 1}).to_list(100)
    total_sessions = 0
    completed_sessions = 0
    weekly_load = []
    
    for macro in macros:
        mesos = await db.mesocycles.find({"macrocycle_id": macro["id"]}, {"_id": 0, "id": 1}).to_list(100)
        for meso in mesos:
            micros = await db.microcycles.find({"mesocycle_id": meso["id"]}, {"_id": 0, "id": 1}).to_list(100)
            for micro in micros:
                sessions = await db.sessions.find({"microcycle_id": micro["id"]}, {"_id": 0}).to_list(1000)
                total_sessions += len(sessions)
                completed_sessions += sum(1 for s in sessions if s.get("completed", False))
                for s in sessions:
                    weekly_load.append({"date": s.get("date"), "load": s.get("load", 0)})
    
    limits = SUBSCRIPTION_LIMITS[SubscriptionPlan(user["subscription"])]
    
    return {
        "athletes_count": athletes_count,
        "athletes_limit": limits["athletes"],
        "macrocycles_count": macrocycles_count,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": round(completed_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0,
        "weekly_load": sorted(weekly_load, key=lambda x: x.get("date", ""))[-30:],
        "ai_generations_used": user.get("ai_generations_used", 0),
        "ai_generations_limit": limits["ai_generations"],
        "subscription": user["subscription"]
    }

# =============== CONTROL PANEL ROUTES ===============
@router.get("/control-panel/stats")
async def get_control_panel_stats(user: dict = Depends(get_current_user), plan_id: Optional[str] = None, db=Depends(get_db)):
    """Obtiene estadísticas para el Panel de Control.
    Si se pasa plan_id, prioriza datos del plan activo (training_plans).
    """
    
    # Conteos básicos
    athletes_count = await db.athletes.count_documents({"coach_id": user["id"]})
    
    # Si hay plan activo, intentar usarlo como fuente principal
    active_plan_doc = None
    if plan_id:
        active_plan_doc = await db.training_plans.find_one(
            {"id": plan_id, "user_id": user["id"]}, {"_id": 0}
        ) or await db.training_plans.find_one(
            {"id": plan_id, "coach_id": user["id"]}, {"_id": 0}
        )
    
    # Obtener atletas con sus datos
    athletes_cursor = db.athletes.find({"coach_id": user["id"]}, {"_id": 0})
    athletes = await athletes_cursor.to_list(100)
    
    # Obtener eventos próximos
    upcoming_events = []
    for athlete in athletes:
        events_data = await db.events_calendar.find_one({"coach_id": user["id"], "athlete_id": athlete["id"]}, {"_id": 0})
        if events_data and events_data.get("events"):
            for event in events_data["events"]:
                event_date = event.get("date")
                if event_date:
                    try:
                        event_dt = datetime.fromisoformat(event_date.replace("Z", "+00:00")) if "T" in event_date else datetime.strptime(event_date, "%Y-%m-%d")
                        if event_dt.replace(tzinfo=None) >= datetime.now():
                            upcoming_events.append({
                                **event,
                                "athleteId": athlete["id"],
                                "athleteName": athlete.get("name", "")
                            })
                    except Exception:
                        pass
    
    # Ordenar eventos por fecha
    upcoming_events.sort(key=lambda x: x.get("date", ""))
    
    # Estadísticas de periodización
    periodization_stats = []
    total_sessions = 0
    completed_sessions = 0
    volume_data = []
    intensity_data = []
    phase_distribution = {}
    
    for athlete in athletes:
        period_data = await db.periodizations.find_one(
            {"coach_id": user["id"], "athlete_id": athlete["id"]},
            {"_id": 0}
        )
        if period_data and period_data.get("mesocycles"):
            week_counter = 1
            for meso in period_data["mesocycles"]:
                phase_name = meso.get("phaseName", meso.get("phase", "Otro"))
                
                for micro in meso.get("microcycles", []):
                    # Contar fases
                    phase_distribution[phase_name] = phase_distribution.get(phase_name, 0) + 1
                    
                    volume = micro.get("volume", 70)
                    intensity = micro.get("intensity", 50)
                    
                    volume_data.append({
                        "semana": f"S{week_counter}",
                        "volumen": volume,
                        "objetivo": volume - 5 if not micro.get("isDeload") else volume + 20,
                        "athleteId": athlete["id"]
                    })
                    
                    intensity_data.append({
                        "semana": f"S{week_counter}",
                        "intensidad": intensity,
                        "recuperacion": 100 - intensity + (20 if micro.get("isDeload") else 0),
                        "athleteId": athlete["id"]
                    })
                    
                    # Contar sesiones en microciclo
                    for session in micro.get("sessions", []):
                        total_sessions += 1
                        if session.get("completed"):
                            completed_sessions += 1
                    
                    week_counter += 1
            
            periodization_stats.append({
                "athleteId": athlete["id"],
                "athleteName": athlete.get("name"),
                "totalWeeks": period_data.get("totalWeeks"),
                "startDate": period_data.get("startDate"),
                "model": period_data.get("model"),
                "currentPhase": period_data["mesocycles"][0].get("phaseName") if period_data["mesocycles"] else None
            })
    
    # Calcular distribución de fases en porcentajes
    total_weeks = sum(phase_distribution.values()) or 1
    phase_distribution_pct = [
        {"name": name, "value": round((count / total_weeks) * 100)}
        for name, count in phase_distribution.items()
    ]
    
    # Si hay plan activo, sobrescribir con sus datos reales
    plan_volume_data = []
    plan_intensity_data = []
    plan_phase_distribution = phase_distribution_pct
    plan_total_weeks = 0
    plan_active_macrocycles = len(periodization_stats)
    
    if active_plan_doc:
        plan_total_weeks = active_plan_doc.get("total_weeks") or 0
        plan_active_macrocycles = len(active_plan_doc.get("macrocycles") or [])
        # Construir volume/intensity data desde el plan
        macros = active_plan_doc.get("macrocycles") or []
        wk = 0
        for macro in macros:
            for meso in (macro.get("mesocycles") or []):
                meso_weeks = int(meso.get("weeks") or 0)
                vol_base = float(meso.get("volume_pct") or meso.get("volume") or 70)
                int_base = float(meso.get("intensity_pct") or meso.get("intensity") or 50)
                for i in range(meso_weeks):
                    wk += 1
                    plan_volume_data.append({"week": wk, "volume": round(vol_base + (i * 2))})
                    plan_intensity_data.append({"week": wk, "intensity": round(int_base + (i * 1.5))})
        # Phase distribution desde el plan
        phase_count = {}
        for macro in macros:
            for meso in (macro.get("mesocycles") or []):
                phase = meso.get("phase") or "preparatory_general"
                weeks = int(meso.get("weeks") or 0)
                phase_count[phase] = phase_count.get(phase, 0) + weeks
        if phase_count:
            tot = sum(phase_count.values()) or 1
            plan_phase_distribution = [
                {"name": k, "value": round(v / tot * 100)} for k, v in phase_count.items()
            ]

    # Sobrescribir conteos de sesiones/eventos con datos reales del plan V2 + competencias
    events_count = len(upcoming_events)
    completion_rate_override = None
    if active_plan_doc:
        v2_plan = await db.planes_entrenamiento.find_one(
            {"_v1_id": active_plan_doc["id"], "coach_id": user["id"]}, {"_id": 0, "id": 1}
        )
        if v2_plan:
            macros2 = await db.macrociclos_v2.find({"plan_id": v2_plan["id"]}, {"_id": 0, "id": 1}).to_list(500)
            mids = [m["id"] for m in macros2]
            mesos2 = await db.mesociclos_v2.find({"macrociclo_id": {"$in": mids}}, {"_id": 0, "id": 1}).to_list(2000)
            meids = [m["id"] for m in mesos2]
            micros2 = await db.microciclos_v2.find({"mesociclo_id": {"$in": meids}}, {"_id": 0, "id": 1}).to_list(5000)
            miids = [m["id"] for m in micros2]
            ts = await db.sesiones_v2.count_documents({"microciclo_id": {"$in": miids}})
            cs = await db.sesiones_v2.count_documents({"microciclo_id": {"$in": miids}, "completada": True})
            today_str_s = datetime.now().strftime("%Y-%m-%d")
            past_due = await db.sesiones_v2.count_documents(
                {"microciclo_id": {"$in": miids}, "fecha": {"$ne": None, "$lt": today_str_s}}
            )
            if ts > 0:
                total_sessions = ts
                completed_sessions = cs
                # Adherencia = completadas / sesiones vencidas (no sobre todo el plan futuro)
                if past_due > 0:
                    completion_rate_override = round((cs / past_due) * 100, 1)
        today_str = datetime.now().strftime("%Y-%m-%d")
        comp_count = await db.plan_competitions.count_documents(
            {"plan_id": active_plan_doc["id"], "user_id": user["id"], "date": {"$gte": today_str}}
        )
        if comp_count > 0:
            events_count = comp_count

    return {
        "athletes_count": athletes_count,
        "athletes": athletes,
        "upcoming_events": upcoming_events[:10],
        "upcoming_events_count": events_count,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": completion_rate_override if completion_rate_override is not None else (round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0),
        "periodization_stats": periodization_stats,
        "volume_data": (plan_volume_data or volume_data)[:52],
        "intensity_data": (plan_intensity_data or intensity_data)[:52],
        "phase_distribution": plan_phase_distribution,
        "active_macrocycles": plan_active_macrocycles,
        "active_plan_id": (active_plan_doc or {}).get("id"),
        "active_plan_name": (active_plan_doc or {}).get("name"),
        "active_plan_weeks": plan_total_weeks,
    }

@router.post("/control-panel/export-pdf")
async def export_control_panel_pdf(request: ExportPDFRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Exporta un reporte PDF personalizable del Panel de Control"""
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=HexColor('#3B82F6'),
        spaceAfter=20
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=HexColor('#1E40AF'),
        spaceAfter=12,
        spaceBefore=20
    )
    
    # Obtener datos del usuario
    stats = await get_control_panel_stats(user, db=db)
    
    # Título principal
    story.append(Paragraph("Reporte de Entrenamiento - LordTraining", title_style))
    story.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    story.append(Paragraph(f"Entrenador: {user.get('name', user.get('email'))}", styles['Normal']))
    story.append(Spacer(1, 20))

    # SECCIÓN: Tarjetas del Panel de Control (seleccionadas por el coach)
    if request.cards_data:
        story.append(Paragraph("Métricas del Panel de Control", heading_style))
        cards_table_data = [["Indicador", "Valor"]]
        for c in request.cards_data:
            cards_table_data.append([str(c.get("label", "")), str(c.get("value", ""))])
        cards_table = Table(cards_table_data, colWidths=[3.2*inch, 1.8*inch])
        cards_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0F172A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#CBD5E1')),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        story.append(cards_table)
        story.append(Spacer(1, 20))
    
    # SECCIÓN 1: Resumen General
    if request.include_summary:
        story.append(Paragraph("Resumen General", heading_style))
        
        summary_data = [
            ["Métrica", "Valor"],
            ["Total de Atletas", str(stats.get("athletes_count", 0))],
            ["Eventos Próximos", str(stats.get("upcoming_events_count", 0))],
            ["Sesiones Totales", str(stats.get("total_sessions", 0))],
            ["Sesiones Completadas", str(stats.get("completed_sessions", 0))],
            ["Tasa de Completación", f"{stats.get('completion_rate', 0)}%"],
            ["Macrociclos Activos", str(stats.get("active_macrocycles", 0))],
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#F0F9FF')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#CBD5E1')),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))
    
    # SECCIÓN 2: Lista de Atletas
    athletes = stats.get("athletes", [])
    if athletes:
        story.append(Paragraph("Atletas Registrados", heading_style))
        
        athlete_data = [["Nombre", "Deporte", "Nivel", "Edad"]]
        for athlete in athletes[:20]:
            athlete_data.append([
                athlete.get("name", "N/A"),
                athlete.get("sport", "N/A"),
                athlete.get("level", "N/A"),
                str(athlete.get("age", "N/A"))
            ])
        
        athlete_table = Table(athlete_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1*inch])
        athlete_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#10B981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#ECFDF5')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#A7F3D0')),
        ]))
        story.append(athlete_table)
        story.append(Spacer(1, 20))
    
    # SECCIÓN 3: Eventos Próximos
    if request.include_calendar:
        events = stats.get("upcoming_events", [])
        if events:
            story.append(Paragraph("Próximos Eventos", heading_style))
            
            event_data = [["Evento", "Atleta", "Fecha", "Prioridad"]]
            for event in events[:10]:
                event_data.append([
                    event.get("name", event.get("title", "N/A")),
                    event.get("athleteName", "N/A"),
                    event.get("date", "N/A"),
                    event.get("priority", "N/A").upper() if event.get("priority") else "N/A"
                ])
            
            event_table = Table(event_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1*inch])
            event_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#F59E0B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#FFFBEB')),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#FDE68A')),
            ]))
            story.append(event_table)
            story.append(Spacer(1, 20))
    
    # SECCIÓN 4: Datos de Volumen
    if request.include_volume_chart:
        volume_data = stats.get("volume_data", [])
        if volume_data:
            story.append(Paragraph("Volumen de Entrenamiento por Semana", heading_style))
            
            vol_table_data = [["Semana", "Volumen", "Objetivo"]]
            for v in volume_data[:12]:
                vol_table_data.append([
                    v.get("semana", "N/A"),
                    str(v.get("volumen", 0)),
                    str(v.get("objetivo", 0))
                ])
            
            vol_table = Table(vol_table_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
            vol_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3B82F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#EFF6FF')),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#BFDBFE')),
            ]))
            story.append(vol_table)
            story.append(Spacer(1, 20))
    
    # SECCIÓN 5: Datos de Intensidad
    if request.include_intensity_chart:
        intensity_data = stats.get("intensity_data", [])
        if intensity_data:
            story.append(Paragraph("Progreso de Intensidad", heading_style))
            
            int_table_data = [["Semana", "Intensidad %", "Recuperación %"]]
            for i in intensity_data[:12]:
                int_table_data.append([
                    i.get("semana", "N/A"),
                    str(i.get("intensidad", 0)),
                    str(i.get("recuperacion", 0))
                ])
            
            int_table = Table(int_table_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
            int_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#EF4444')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#FEF2F2')),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#FECACA')),
            ]))
            story.append(int_table)
            story.append(Spacer(1, 20))
    
    # SECCIÓN 6: Distribución de Fases
    phase_dist = stats.get("phase_distribution", [])
    if phase_dist:
        story.append(Paragraph("Distribución de Fases", heading_style))
        
        phase_table_data = [["Fase", "Porcentaje"]]
        for phase in phase_dist:
            phase_table_data.append([
                phase.get("name", "N/A"),
                f"{phase.get('value', 0)}%"
            ])
        
        phase_table = Table(phase_table_data, colWidths=[3*inch, 1.5*inch])
        phase_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#8B5CF6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#F5F3FF')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#DDD6FE')),
        ]))
        story.append(phase_table)
    
    # Pie de página
    story.append(Spacer(1, 30))
    story.append(Paragraph("---", styles['Normal']))
    story.append(Paragraph("Generado por LordTraining - Planificación Deportiva Inteligente", styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    filename = f"reporte_train_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


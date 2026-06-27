"""One-off: traduce las claves nuevas de Fase A (shell del dashboard) a los 10 idiomas restantes."""
import os, json, asyncio, copy
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
from emergentintegrations.llm.chat import LlmChat, UserMessage

KEY = os.environ['EMERGENT_LLM_KEY']
LOCALES = '/app/frontend/src/locales'
TARGETS = {
    'pt': 'Portuguese', 'ar': 'Arabic', 'hi': 'Hindi', 'id': 'Indonesian',
    'fr': 'French', 'de': 'German', 'ja': 'Japanese', 'ko': 'Korean',
    'ru': 'Russian', 'zh': 'Simplified Chinese',
}

# Claves nuevas (fuente en español). Se fusionan bajo "dashboard".
ES = {
    "nav": {"scouting": "Scouting", "report": "Reporte", "sessions": "Sesiones"},
    "shell": {
        "allGood": "¡Todo en orden!",
        "allGoodDesc": "El sistema está actualizado y listo para el entrenamiento.",
        "fabAthlete": "Atleta", "fabTeam": "Equipo", "fabAdmin": "Admin",
        "fabPlan": "Plan", "fabLogout": "Salir", "fabSessions": "Sesiones",
        "fabAlerts": "Alertas", "fabDemo": "Demo",
    },
    "controlPanel": {
        "sleepQuality": "Calidad sueño", "muscleSoreness": "Dolor muscular",
        "stress": "Estrés", "motivation": "Motivación",
        "trainingAnalysis": "Análisis de Entrenamiento",
        "interactiveCharts": "Gráficos interactivos - Usa los controles para explorar",
        "acuteLoad": "Carga Aguda (7d)", "chronicLoad": "Carga Crónica (28d)",
        "stable": "Estable",
        "chartVolume": "Volumen, Intensidad y Densidad",
        "chartIntensity": "Intensidad y Recuperación",
        "chartPhases": "Distribución de Fases",
        "chartLoad": "Carga de Entrenamiento Acumulada",
    },
    "metrics": {
        "acwrTitle": "Ratio de Carga (ACWR)",
        "acwrEmpty": "Sin carga registrada",
        "acwrEmptyHint": "Marca sesiones como completadas (con RPE) para calcular el ACWR.",
        "adherenceTitle": "Adherencia por Semana",
        "adherenceEmpty": "Sin sesiones programadas",
        "adherenceEmptyHint": "La adherencia se calcula sobre sesiones vencidas.",
        "global": "global",
        "lowReadinessTitle": "Atletas con baja disponibilidad hoy",
        "lowReadinessEmpty": "Todos los atletas con readiness ≥ 60% hoy. ¡Buena señal!",
        "zoneOptimo": "Óptimo", "zoneBajo": "Carga baja", "zonePrecaucion": "Precaución",
        "zoneRiesgo": "Alto riesgo", "zoneSinDatos": "Sin datos",
        "zoneOptimoDesc": "Carga equilibrada (sweet spot 0.8–1.3)",
        "zoneBajoDesc": "Posible subcarga / desentrenamiento",
        "zonePrecaucionDesc": "Carga elevada, vigilar fatiga",
        "zoneRiesgoDesc": "Riesgo de lesión por sobrecarga",
        "zoneSinDatosDesc": "Registra sesiones completadas",
        "sleep": "Sueño", "soreness": "Dolor", "stressShort": "Estrés", "motiv": "Motiv.",
    },
    "alerts": {
        "title": "Prevención de lesiones",
        "empty": "Sin alertas. Todo en orden.",
        "viewWeekly": "Ver resumen semanal",
    },
    "weekly": {
        "title": "Resumen de la semana",
        "adherence": "Adherencia", "sessionsCompleted": "Sesiones completadas",
        "acwrRisk": "Atletas en riesgo ACWR", "lowAvailability": "Baja disponibilidad",
        "topCapacities": "Capacidades más trabajadas",
        "activeAlerts": "Alertas activas", "noAlerts": "Sin alertas. Buena semana.",
    },
    "demo": {
        "title": "Datos de ejemplo (onboarding)",
        "load": "Cargar datos de ejemplo", "clear": "Quitar datos de ejemplo",
        "loadConfirm": "¿Quitar los datos de ejemplo? Se borrarán las fechas/completado de las sesiones de ejemplo y las competencias/evaluaciones de ejemplo.",
    },
}

EN = {
    "nav": {"scouting": "Scouting", "report": "Report", "sessions": "Sessions"},
    "shell": {
        "allGood": "All set!",
        "allGoodDesc": "The system is up to date and ready for training.",
        "fabAthlete": "Athlete", "fabTeam": "Team", "fabAdmin": "Admin",
        "fabPlan": "Plan", "fabLogout": "Log out", "fabSessions": "Sessions",
        "fabAlerts": "Alerts", "fabDemo": "Demo",
    },
    "controlPanel": {
        "sleepQuality": "Sleep quality", "muscleSoreness": "Muscle soreness",
        "stress": "Stress", "motivation": "Motivation",
        "trainingAnalysis": "Training Analysis",
        "interactiveCharts": "Interactive charts - Use the controls to explore",
        "acuteLoad": "Acute load (7d)", "chronicLoad": "Chronic load (28d)",
        "stable": "Stable",
        "chartVolume": "Volume, Intensity & Density",
        "chartIntensity": "Intensity & Recovery",
        "chartPhases": "Phase Distribution",
        "chartLoad": "Accumulated Training Load",
    },
    "metrics": {
        "acwrTitle": "Workload Ratio (ACWR)",
        "acwrEmpty": "No load recorded",
        "acwrEmptyHint": "Mark sessions as completed (with RPE) to compute ACWR.",
        "adherenceTitle": "Weekly Adherence",
        "adherenceEmpty": "No scheduled sessions",
        "adherenceEmptyHint": "Adherence is computed over due sessions.",
        "global": "overall",
        "lowReadinessTitle": "Athletes with low availability today",
        "lowReadinessEmpty": "All athletes with readiness ≥ 60% today. Good sign!",
        "zoneOptimo": "Optimal", "zoneBajo": "Low load", "zonePrecaucion": "Caution",
        "zoneRiesgo": "High risk", "zoneSinDatos": "No data",
        "zoneOptimoDesc": "Balanced load (sweet spot 0.8–1.3)",
        "zoneBajoDesc": "Possible undertraining / detraining",
        "zonePrecaucionDesc": "Elevated load, watch fatigue",
        "zoneRiesgoDesc": "Injury risk from overload",
        "zoneSinDatosDesc": "Log completed sessions",
        "sleep": "Sleep", "soreness": "Soreness", "stressShort": "Stress", "motiv": "Motiv.",
    },
    "alerts": {
        "title": "Injury prevention",
        "empty": "No alerts. All good.",
        "viewWeekly": "View weekly summary",
    },
    "weekly": {
        "title": "Week summary",
        "adherence": "Adherence", "sessionsCompleted": "Completed sessions",
        "acwrRisk": "Athletes at ACWR risk", "lowAvailability": "Low availability",
        "topCapacities": "Most trained capacities",
        "activeAlerts": "Active alerts", "noAlerts": "No alerts. Good week.",
    },
    "demo": {
        "title": "Sample data (onboarding)",
        "load": "Load sample data", "clear": "Remove sample data",
        "loadConfirm": "Remove the sample data? Dates/completion of sample sessions and sample competitions/evaluations will be deleted.",
    },
}


def deep_merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v)
        else:
            dst[k] = v


async def translate(lang_code, lang_name):
    chat = LlmChat(api_key=KEY, session_id=f"tr-{lang_code}",
                   system_message=("You are a professional UI localizer for a sports training SaaS. "
                                   "Translate the given JSON values into " + lang_name + ". "
                                   "Keep keys EXACTLY the same. Keep it concise and natural for UI buttons/labels. "
                                   "Preserve placeholders, numbers, symbols (≥, %, –, parentheses). "
                                   "Do NOT translate the brand-style words 'Scouting', 'ACWR', 'RPE', 'Demo', 'Admin'. "
                                   "Return ONLY valid JSON, no markdown, same structure.")).with_model("openai", "gpt-5.4")
    msg = UserMessage(text=json.dumps(ES, ensure_ascii=False))
    resp = await chat.send_message(msg)
    txt = resp.strip()
    if txt.startswith("```"):
        txt = txt.split("```")[1]
        if txt.startswith("json"):
            txt = txt[4:]
    return json.loads(txt)


async def main():
    # es y en escritos a mano
    for code, content in (("es", ES), ("en", EN)):
        path = f"{LOCALES}/{code}.json"
        data = json.load(open(path, encoding="utf-8"))
        data.setdefault("dashboard", {})
        deep_merge(data["dashboard"], content)
        json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("written", code)

    for code, name in TARGETS.items():
        try:
            tr = await translate(code, name)
            path = f"{LOCALES}/{code}.json"
            data = json.load(open(path, encoding="utf-8"))
            data.setdefault("dashboard", {})
            deep_merge(data["dashboard"], tr)
            json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            print("OK", code, "keys:", len(tr))
        except Exception as e:
            print("FAIL", code, repr(e)[:200])

asyncio.run(main())

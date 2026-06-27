"""Traduce las cadenas-chrome adicionales de los generadores PDF
(active_plan, previous_analysis, info_catalog, evaluations) a 11 idiomas
y las escribe en routes/pdf_i18n_extra.json en formato {es: [valores por LANGS]}.
"""
import os, json, asyncio
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

LANGS = ["en", "pt", "ar", "hi", "id", "fr", "de", "ja", "ko", "ru", "zh"]
NAMES = {"en": "English", "pt": "Portuguese", "ar": "Arabic", "hi": "Hindi", "id": "Indonesian",
         "fr": "French", "de": "German", "ja": "Japanese", "ko": "Korean", "ru": "Russian", "zh": "Simplified Chinese"}

STRINGS = [
    # active_plan_export
    "Plan de Entrenamiento", "Fecha inicio", "Fecha final", "Nivel",
    "1. Información General", "Deporte / Objetivo", "Entrenador", "Edad / Rango", "Clasificación",
    "2. Objetivos por Horizonte Temporal", "Largo Plazo", "Medio Plazo", "Corto Plazo",
    "Macrociclo", "Microciclo", "3. Objetivos por Aspecto de Preparación",
    "Experiencia", "4. Cuerpo Técnico Asignado",
    "Sin objetivos registrados.", "Sin objetivos por aspecto registrados.",
    # previous_analysis_export
    "Mejor área", "Brecha más grande", "Coincidencia con modelo",
    "Sin fortalezas registradas.", "Sin debilidades registradas.", "Sin indicadores registrados.",
    "Sin brechas", "Sin comparaciones disponibles.", "Sin recomendaciones generadas.",
    "7. Gap Analysis con IA", "Modelo de Periodización", "Brechas más grandes (top 3)",
    "ANÁLISIS RETROSPECTIVO", "Análisis del Plan Anterior", "Duración", "Lesiones",
    "1. Objetivo del Plan Anterior", "2. Cumplimiento de Objetivos",
    "Perfil de cumplimiento", "Real", "Ideal", "Área · Logros", "Progreso",
    "3. Indicadores de Rendimiento", "Indicador", "4. Fortalezas y Áreas de Mejora",
    "5. Lesiones y Problemas de Salud", "6. Conclusiones y Recomendaciones",
    "Conclusiones principales", "Sin conclusiones registradas.",
    "Recomendaciones para el próximo plan", "Sin recomendaciones registradas.",
    # info_catalog_export columns
    "Tipo", "Ciudad", "País", "Contacto", "Equipo", "Nombre completo", "Edad", "Género",
    "Disciplina", "Torneo", "Inicio", "Fin", "Sede", "Especialidad", "Años exp.", "Organización",
    # evaluations_export
    "Sin aspectos", "Sin controles registrados para este tipo.", "controles", "torneos", "semanas",
]


async def tr(code, name):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    src = {s: s for s in STRINGS}
    chat = LlmChat(api_key=os.environ['EMERGENT_LLM_KEY'], session_id=f'pdfextra-{code}',
                   system_message=(f"Professional UI/document localizer for a sports training SaaS PDF report. "
                                   f"Translate the JSON values to {name}. Keep keys identical (Spanish). "
                                   f"Keep leading numbers like '1.' '2.' and symbols like '·', '(top 3)'. Concise, formal document wording. "
                                   f"Return ONLY valid JSON.")).with_model('openai', 'gpt-5.4')
    r = await chat.send_message(UserMessage(text=json.dumps(src, ensure_ascii=False)))
    t = r.strip()
    if t.startswith('```'):
        t = t.split('```')[1]
        t = t[4:] if t.startswith('json') else t
    return json.loads(t)


async def main():
    by_lang = {}
    for c, n in NAMES.items():
        try:
            by_lang[c] = await tr(c, n)
            print('OK', c, len(by_lang[c]))
        except Exception as e:
            print('FAIL', c, repr(e)[:150])
            by_lang[c] = {s: s for s in STRINGS}
    out = {}
    for s in STRINGS:
        out[s] = [by_lang[c].get(s, s) for c in LANGS]
    json.dump(out, open('/app/backend/routes/pdf_i18n_extra.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('written', len(out), 'strings')

asyncio.run(main())

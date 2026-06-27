"""Traduce las cadenas-chrome de las sesiones (PDF clásico + hero) y las MERGE
en routes/pdf_i18n_extra.json (no pisa lo existente)."""
import os, json, asyncio
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

LANGS = ["en", "pt", "ar", "hi", "id", "fr", "de", "ja", "ko", "ru", "zh"]
NAMES = {"en": "English", "pt": "Portuguese", "ar": "Arabic", "hi": "Hindi", "id": "Indonesian",
         "fr": "French", "de": "German", "ja": "Japanese", "ko": "Korean", "ru": "Russian", "zh": "Simplified Chinese"}

STRINGS = [
    "SESIÓN DE ENTRENAMIENTO", "Atleta", "Semana", "Día",
    "OBJETIVOS DE LA SESIÓN", "Objetivos", "General", "Físico", "Técnico", "Táctico",
    "Psicológico", "Teórico", "Sin definir",
    "FASE INICIAL (Calentamiento)", "FASE PRINCIPAL", "FASE FINAL (Vuelta a la calma)",
    "ejercicios", "Cap.Física", "Método", "Reps", "Recup.", "Intensidad",
    "Sin actividades en esta fase", "Monitoreo", "Retroalimentación", "Materiales",
]


async def tr(code, name):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    src = {s: s for s in STRINGS}
    chat = LlmChat(api_key=os.environ['EMERGENT_LLM_KEY'], session_id=f'sess-{code}',
                   system_message=(f"Professional localizer for a sports training session PDF. Translate JSON values to {name}. "
                                   f"Keep keys identical. Keep parentheses content meaningful. Abbreviations like 'Reps','Cap.Física','Recup.' should be short. Return ONLY valid JSON.")).with_model('openai', 'gpt-5.4')
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
            by_lang[c] = await tr(c, n); print('OK', c, len(by_lang[c]))
        except Exception as e:
            print('FAIL', c, repr(e)[:150]); by_lang[c] = {s: s for s in STRINGS}
    path = '/app/backend/routes/pdf_i18n_extra.json'
    existing = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    for s in STRINGS:
        existing[s] = [by_lang[c].get(s, s) for c in LANGS]
    json.dump(existing, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('merged total', len(existing))

asyncio.run(main())

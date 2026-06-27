"""
Herramienta reutilizable de i18n para LordTraining.

Uso:
  1) Auditar cadenas en español sin traducir en componentes:
       python i18n_tools.py audit src/pages/AthletePortalPanel.js [...más archivos/dirs]
  2) Traducir + fusionar claves nuevas en los 12 locales:
       Crea un JSON con la forma {"namespace": "athlete", "es": {...}, "en": {...}}
       (las claves van bajo locales/<lng>.json -> [namespace])
       python i18n_tools.py translate /ruta/nuevas_claves.json

El paso de REEMPLAZO en el código (poner t('...')) se hace a mano por seguridad.
"""
import os, re, json, sys, asyncio, glob

ROOT = '/app/frontend/src'
LOCALES = f'{ROOT}/locales'
TARGETS = {
    'pt': 'Portuguese', 'ar': 'Arabic', 'hi': 'Hindi', 'id': 'Indonesian',
    'fr': 'French', 'de': 'German', 'ja': 'Japanese', 'ko': 'Korean',
    'ru': 'Russian', 'zh': 'Simplified Chinese',
}
SPANISH_HINT = re.compile(r'[áéíóúñ¿¡]|\b(de|la|el|los|las|por|para|con|sin|del|sesión|sesiones|plan|entrenamiento|atleta|datos|guardar|crear|nuevo|nueva|seleccionar|cargar|semana|fecha|objetivos|competencia)\b', re.IGNORECASE)
# Texto JSX entre tags >...<  y atributos title=/placeholder=
JSX_TEXT = re.compile(r'>\s*([A-ZÁÉÍÓÚÑa-záéíóúñ][^<>{}\n]{2,}?)\s*<')
ATTR_TEXT = re.compile(r'(?:placeholder|title|label|aria-label)\s*=\s*"([^"]{3,}?)"')


def audit(paths):
    files = []
    for p in paths:
        ap = p if p.startswith('/') else f'{ROOT}/{p}'
        if os.path.isdir(ap):
            files += glob.glob(f'{ap}/**/*.js', recursive=True)
        else:
            files += glob.glob(ap)
    total = 0
    for f in sorted(set(files)):
        try:
            src = open(f, encoding='utf-8').read()
        except Exception:
            continue
        found = set()
        for m in JSX_TEXT.finditer(src):
            s = m.group(1).strip()
            if SPANISH_HINT.search(s) and not s.startswith('{') and 't(' not in s:
                found.add(s)
        for m in ATTR_TEXT.finditer(src):
            s = m.group(1).strip()
            if SPANISH_HINT.search(s):
                found.add(s)
        if found:
            print(f'\n=== {f}  ({len(found)} cadenas) ===')
            for s in sorted(found):
                print('  •', s)
            total += len(found)
    print(f'\nTOTAL cadenas candidatas: {total}')


def deep_merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v)
        else:
            dst[k] = v


async def _translate(es_dict, lang_code, lang_name):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=os.environ['EMERGENT_LLM_KEY'], session_id=f'i18n-{lang_code}',
        system_message=(f"You are a professional UI localizer for a sports training SaaS. "
                        f"Translate the JSON values into {lang_name}. Keep keys EXACTLY the same and structure identical. "
                        f"Concise, natural UI wording. Preserve placeholders {{like_this}}, numbers, symbols (≥,%,–). "
                        f"Do NOT translate: Scouting, ACWR, RPE, Demo, Admin, PDF, VO2. "
                        f"Return ONLY valid JSON, no markdown.")
    ).with_model("openai", "gpt-5.4")
    resp = await chat.send_message(UserMessage(text=json.dumps(es_dict, ensure_ascii=False)))
    txt = resp.strip()
    if txt.startswith("```"):
        txt = txt.split("```")[1]
        if txt.startswith("json"):
            txt = txt[4:]
    return json.loads(txt)


async def translate_and_merge(spec_path):
    spec = json.load(open(spec_path, encoding='utf-8'))
    ns = spec['namespace']
    es, en = spec['es'], spec['en']
    # ES y EN a mano
    for code, content in (('es', es), ('en', en)):
        path = f'{LOCALES}/{code}.json'
        data = json.load(open(path, encoding='utf-8'))
        data.setdefault(ns, {})
        deep_merge(data[ns], content)
        json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print('written', code)
    for code, name in TARGETS.items():
        try:
            tr = await _translate(es, code, name)
            path = f'{LOCALES}/{code}.json'
            data = json.load(open(path, encoding='utf-8'))
            data.setdefault(ns, {})
            deep_merge(data[ns], tr)
            json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            print('OK', code)
        except Exception as e:
            print('FAIL', code, repr(e)[:160])


if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv('/app/backend/.env')
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'audit':
        audit(sys.argv[2:])
    elif cmd == 'translate':
        asyncio.run(translate_and_merge(sys.argv[2]))
    else:
        print(__doc__)

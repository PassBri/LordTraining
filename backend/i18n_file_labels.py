import os, re, json, asyncio, sys
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
ROOT='/app/frontend/src'; LOCALES=f'{ROOT}/locales'
FILE=sys.argv[1]; NS=sys.argv[2]
TARGETS={'en':'English','pt':'Portuguese','ar':'Arabic','hi':'Hindi','id':'Indonesian',
 'fr':'French','de':'German','ja':'Japanese','ko':'Korean','ru':'Russian','zh':'Simplified Chinese'}
def slug(s):
    return re.sub(r'^_+|_+$','',re.sub(r'[^a-z0-9]+','_', s.lower().translate(str.maketrans('áéíóúñ','aeioun')).replace('₂','2').replace('²','2')))
src=''.join(open(f'{ROOT}/{f}',encoding='utf-8').read() for f in FILE.split(','))
found=set()
# Definitivo: todas las llamadas tt('...') / tt("...") ya envueltas
for m in re.finditer(r"tt\((['\"])(.+?)\1\)", src):
    found.add(m.group(2))
# Valores de objetos config: key: 'Texto' (para tt(variable) dinámicos)
for m in re.finditer(r"\b\w+:\s*(['\"])([^'\"]{2,90})\1", src):
    found.add(m.group(2))
# Tuplas config: ['key', 'Etiqueta', ...] -> capturar la etiqueta
for m in re.finditer(r"\[\s*(['\"])[a-z0-9_]+\1\s*,\s*(['\"])([^'\"]{2,60})\2", src):
    found.add(m.group(3))
# toasts con template/simple
for m in re.finditer(r"toast\.\w+\(\s*[`\"']([^`\"']{3,110})", src):
    found.add(m.group(1))
hint=re.compile(r'[A-Za-zÁÉÍÓÚáéíóúñ]')
es={}
for s in sorted(found):
    s=s.strip()
    if not hint.search(s): continue
    if s.startswith('#') or s.startswith('http') or '\\' in s: continue
    if re.match(r'^[a-z0-9]+([_-][a-z0-9]+)+$', s) or len(s) < 3: continue  # ids snake/kebab o muy cortos
    k=slug(s)
    if k: es.setdefault(k,s)
print('slugs:',len(es))
async def tr(code,name):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat=LlmChat(api_key=os.environ['EMERGENT_LLM_KEY'], session_id=f'{NS}-{code}',
      system_message=(f"Professional UI localizer for a sports team management SaaS (admin/finance/scouting/reports). "
        f"Translate JSON values to {name}. Keep keys identical. Keep placeholders {{{{x}}}}, numbers, symbols, currency and proper nouns. Concise UI wording. Return ONLY valid JSON.")).with_model('openai','gpt-5.4')
    r=await chat.send_message(UserMessage(text=json.dumps(es,ensure_ascii=False)))
    t=r.strip()
    if t.startswith('```'): t=t.split('```')[1]; t=t[4:] if t.startswith('json') else t
    return json.loads(t)
async def main():
    p=f'{LOCALES}/es.json'; d=json.load(open(p,encoding='utf-8'))
    d.setdefault(NS,{}).setdefault('lbl',{}).update(es)
    json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2); print('written es')
    for c,n in TARGETS.items():
        try:
            x=await tr(c,n); p=f'{LOCALES}/{c}.json'; d=json.load(open(p,encoding='utf-8'))
            d.setdefault(NS,{}).setdefault('lbl',{}).update(x)
            json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2); print('OK',c,len(x))
        except Exception as e: print('FAIL',c,repr(e)[:120])
asyncio.run(main())

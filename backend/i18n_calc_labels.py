import os, re, json, asyncio
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

ROOT='/app/frontend/src'
LOCALES=f'{ROOT}/locales'
CALC=f'{ROOT}/components/calculators'
FILES=['Module1_10.js','Module2_5_6.js','Module3_4_7_8_9.js','CalcSaveBar.js']
TARGETS={'en':'English','pt':'Portuguese','ar':'Arabic','hi':'Hindi','id':'Indonesian',
 'fr':'French','de':'German','ja':'Japanese','ko':'Korean','ru':'Russian','zh':'Simplified Chinese'}

def slug(s):
    return re.sub(r'^_+|_+$','',re.sub(r'[^a-z0-9]+','_', s.lower().translate(str.maketrans('áéíóúñ','aeioun')).replace('₂','2').replace('²','2')))

src='\n'.join(open(f'{CALC}/{f}',encoding='utf-8').read() for f in FILES)
strings=set()
for prop in ['title','subtitle','label','unit','sub','placeholder','badge']:
    for m in re.finditer(prop+r"=\{?[\"']([^\"']{1,60})[\"']\}?", src):
        strings.add(m.group(1))
for m in re.finditer(r"(?:label|goal|name|zona|tipo|cat|level|status|interp|desc|msg):\s*[\"']([^\"']{1,70})[\"']", src):
    strings.add(m.group(1))
# Literales de texto dentro de ternarios / expresiones: '...texto...'
for m in re.finditer(r"[\?:]\s*'([^']{3,70})'", src):
    strings.add(m.group(1))
# Texto JSX directo
for m in re.finditer(r'>\s*([A-ZÁÉÍÓÚ][^<>{}\n]{2,60}?)\s*<', src):
    strings.add(m.group(1))
hint=re.compile(r'[A-Za-zÁÉÍÓÚáéíóúÑñ]')
skip=re.compile(r'Math\.|=>|\$\{|http|className')
es={}
for s in sorted(strings):
    if hint.search(s) and not skip.search(s):
        k=slug(s)
        if k: es.setdefault(k, s)
print('unique slugs:', len(es))

async def translate(lang_code, lang_name):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat=LlmChat(api_key=os.environ['EMERGENT_LLM_KEY'], session_id=f'calc-{lang_code}',
      system_message=(f"You are a professional UI localizer for a sports-science training app. "
        f"Translate the JSON values into {lang_name}. Keep keys EXACTLY the same. "
        f"These are calculator labels, units and formula names. Keep scientific abbreviations, units (kg, cm, m/s, ms, lpm, ml/kg/min, W, kcal, bpm) and proper names (Karvonen, Cooper, Wingate, Bosco, Brzycki, Epley, Mifflin-St Jeor, ATR, DUP, VO₂, ACWR, CTL, ATL, TSB, FTP, FFMI, WHR, BMI/IMC->keep IMC as BMI, RPE, RIR, HRV, DOTS, Wilks, IPF GL) appropriately. Concise, natural UI wording. Preserve placeholders, numbers and symbols (·,→,↗,↘,×,²,₂,%,/). Return ONLY valid JSON, no markdown."))
    chat=chat.with_model('openai','gpt-5.4')
    resp=await chat.send_message(UserMessage(text=json.dumps(es, ensure_ascii=False)))
    txt=resp.strip()
    if txt.startswith('```'):
        txt=txt.split('```')[1]
        if txt.startswith('json'): txt=txt[4:]
    return json.loads(txt)

async def main():
    # es written directly
    p=f'{LOCALES}/es.json'; d=json.load(open(p,encoding='utf-8'))
    d.setdefault('calculators',{}).setdefault('lbl',{}).update(es)
    json.dump(d, open(p,'w',encoding='utf-8'), ensure_ascii=False, indent=2); print('written es')
    for code,name in TARGETS.items():
        try:
            tr=await translate(code,name)
            p=f'{LOCALES}/{code}.json'; d=json.load(open(p,encoding='utf-8'))
            d.setdefault('calculators',{}).setdefault('lbl',{}).update(tr)
            json.dump(d, open(p,'w',encoding='utf-8'), ensure_ascii=False, indent=2)
            print('OK',code, len(tr))
        except Exception as e:
            print('FAIL',code, repr(e)[:160])

asyncio.run(main())

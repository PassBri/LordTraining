import os, re, json, asyncio
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
LOCALES='/app/frontend/src/locales'
TARGETS={'en':'English','pt':'Portuguese','ar':'Arabic','hi':'Hindi','id':'Indonesian','fr':'French','de':'German','ja':'Japanese','ko':'Korean','ru':'Russian','zh':'Simplified Chinese'}
def slug(s):
    return re.sub(r'^_+|_+$','',re.sub(r'[^a-z0-9]+','_', s.lower().translate(str.maketrans('áéíóúñ','aeioun')).replace('₂','2').replace('²','2')))
RAW=[
"Olímpico · Azul medianoche + dorado","Inspiración olímpica · azul medianoche con detalles en oro · tipografía clásica con elegancia institucional",
"Atleta · Carbón + lima neón","Enfocado en performance · carbón con neón lima · datos crudos sin distracciones",
"Sport · Magazine deportivo","Estilo magazine deportivo · fondo oscuro · tipografía condensada · dinamismo gráfico",
"Training · Profesional clínico","Limpio profesional · verde clínico · tablas funcionales · datos de calidad",
"Coach · Manual del entrenador","Manual ilustrado · acentos cálidos · sidebar de pistas y tips · personalidad del coach",
"Federación · Institucional","Institucional · sello federativo · KPIs ejecutivos · tablas comparativas",
"Campeón · Oro · Negro · Victoria","Trofeo dorado sobre negro · esencia de victoria · tipografía deportiva masiva",
"Primer Lugar · Podio premium","Podio premium · plata + oro · acabado editorial · ranking competitivo",
]
es={slug(s): s for s in RAW}
async def tr(code,name):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat=LlmChat(api_key=os.environ['EMERGENT_LLM_KEY'], session_id=f'rstyles-{code}',
      system_message=f"Localize these sports PDF report STYLE names and descriptions to {name}. Keep keys identical. Keep '·' separators, proper nouns (Olympic, Sport, Coach, etc.) and tone. Return ONLY valid JSON.").with_model('openai','gpt-5.4')
    r=await chat.send_message(UserMessage(text=json.dumps(es,ensure_ascii=False))); t=r.strip()
    if t.startswith('```'): t=t.split('```')[1]; t=t[4:] if t.startswith('json') else t
    return json.loads(t)
async def main():
    p=f'{LOCALES}/es.json'; d=json.load(open(p,encoding='utf-8')); d.setdefault('reports',{}).setdefault('lbl',{}).update(es)
    json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2); print('es')
    for c,n in TARGETS.items():
        try:
            x=await tr(c,n); p=f'{LOCALES}/{c}.json'; d=json.load(open(p,encoding='utf-8'))
            d.setdefault('reports',{}).setdefault('lbl',{}).update(x); json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=2); print('OK',c)
        except Exception as e: print('FAIL',c,repr(e)[:90])
asyncio.run(main())

import json, re
LOCALES='/app/frontend/src/locales'
def slug(s):
    return re.sub(r'^_+|_+$','',re.sub(r'[^a-z0-9]+','_', s.lower().translate(str.maketrans('áéíóúñ','aeioun')).replace('₂','2').replace('²','2')))
# raw_es : english
M={
 "12 sem antes · trabajo específico":"12 wk before · specific work",
 "2 sem antes · descarga 40%":"2 wk before · 40% deload",
 "24 sem antes · base general":"24 wk before · general base",
 "6 sem antes · alta intensidad":"6 wk before · high intensity",
 "A · 4 sem":"A · 4 wk",
 "Cargas (7d)":"Loads (7d)",
 "Específico":"Specific",
 "Fuerza Máxima":"Max Strength",
 "Int %":"Int %",
 "Intensidad creciente · trabajo específico":"Increasing intensity · specific work",
 "Pico Específico":"Specific Peak",
 "Preparatorio":"Preparatory",
 "R · 2 sem":"R · 2 wk",
 "Resistencia local / Recuperación":"Local endurance / Recovery",
 "Resistencia muscular":"Muscular endurance",
 "Sem":"Wk",
 "T · 4 sem":"T · 4 wk",
 "Tapering":"Tapering",
 "Velocidad/potencia máxima · puesta a punto":"Max speed/power · peaking",
 "Vol %":"Vol %",
 "Volumen alto · técnica · base aeróbica":"High volume · technique · aerobic base",
}
es=json.load(open(f'{LOCALES}/es.json',encoding='utf-8'))
en=json.load(open(f'{LOCALES}/en.json',encoding='utf-8'))
for raw,e in M.items():
    k=slug(raw)
    es['calculators']['lbl'][k]=raw
    en['calculators']['lbl'][k]=e
json.dump(es,open(f'{LOCALES}/es.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
json.dump(en,open(f'{LOCALES}/en.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
print('merged es/en; es lbl:',len(es['calculators']['lbl']))
print('slugs:', {raw:slug(raw) for raw in ['Fuerza Máxima','Resistencia local / Recuperación','Cargas (7d)','Sem']})
PY = None

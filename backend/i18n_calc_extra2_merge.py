import json, re
LOCALES='/app/frontend/src/locales'
def slug(s):
    return re.sub(r'^_+|_+$','',re.sub(r'[^a-z0-9]+','_', s.lower().translate(str.maketrans('áéíóúñ','aeioun')).replace('₂','2').replace('²','2')))
M={
 "Acumulación":"Accumulation",
 "Transformación":"Transformation",
 "Realización":"Realization",
 "Z1 · Recuperación":"Z1 · Recovery",
 "Z2 · Aeróbico base":"Z2 · Base aerobic",
 "Z3 · Tempo":"Z3 · Tempo",
 "Z4 · Umbral":"Z4 · Threshold",
 "Z5 · VO₂max":"Z5 · VO₂max",
 "separadas por coma":"comma-separated",
}
es=json.load(open(f'{LOCALES}/es.json',encoding='utf-8'))
en=json.load(open(f'{LOCALES}/en.json',encoding='utf-8'))
for raw,e in M.items():
    k=slug(raw)
    es['calculators']['lbl'][k]=raw
    en['calculators']['lbl'][k]=e
json.dump(es,open(f'{LOCALES}/es.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
json.dump(en,open(f'{LOCALES}/en.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
print('done es lbl:',len(es['calculators']['lbl']))

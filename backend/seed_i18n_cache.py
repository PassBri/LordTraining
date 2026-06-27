"""Siembra la caché de auto-traducción (Mongo i18n_cache) reutilizando TODAS
las traducciones que ya existen en los archivos de locales del frontend.

Mapea: valor_es (en una ruta) -> valor_lang (misma ruta) para cada idioma.
Así el sistema de auto-traducción en tiempo real ya tiene miles de cadenas
listas sin volver a llamar al LLM.
"""
import os, json, hashlib
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
from pymongo import MongoClient, ReplaceOne

LOCALES = '/app/frontend/src/locales'
LANGS = ["en", "pt", "ar", "hi", "id", "fr", "de", "ja", "ko", "ru", "zh"]

cli = MongoClient(os.environ['MONGO_URL'])
db = cli[os.environ['DB_NAME']]
cache = db['i18n_cache']


def flatten(obj, path=""):
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            out.update(flatten(v, f"{path}.{k}"))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out.update(flatten(v, f"{path}.{i}"))
    elif isinstance(obj, str):
        out[path] = obj
    return out


def key(lang, text):
    return hashlib.sha1(f"{lang}||{text}".encode("utf-8")).hexdigest()


es = flatten(json.load(open(f"{LOCALES}/es.json", encoding="utf-8")))
total = 0
for lang in LANGS:
    try:
        tgt = flatten(json.load(open(f"{LOCALES}/{lang}.json", encoding="utf-8")))
    except Exception as e:
        print("skip", lang, e); continue
    ops = []
    seen = set()
    for path, es_val in es.items():
        tr_val = tgt.get(path)
        es_val = (es_val or "").strip()
        if not es_val or not tr_val or not str(tr_val).strip():
            continue
        if es_val == tr_val:
            continue
        if es_val in seen:
            continue
        seen.add(es_val)
        k = key(lang, es_val)
        ops.append(ReplaceOne({"_id": k}, {"_id": k, "lang": lang, "text": es_val, "tr": tr_val}, upsert=True))
    if ops:
        # en lotes
        for i in range(0, len(ops), 1000):
            cache.bulk_write(ops[i:i+1000], ordered=False)
        total += len(ops)
    print(f"{lang}: seeded {len(ops)}")
print("TOTAL seeded:", total, "| cache size:", cache.estimated_document_count())

"""Auto-traducción en tiempo real con caché permanente.

El frontend envía textos en español y el idioma destino. El backend:
  1. Busca cada texto en la caché persistente (Mongo `i18n_cache`).
  2. Los que faltan, los traduce en UN solo llamado LLM (batch) y los guarda.
  3. Devuelve el mapa {texto_es: traducción}.

Así cada (texto, idioma) se traduce UNA sola vez en la vida de la app y queda
cacheado para siempre — sin scripts manuales ni archivos de locales por componente.
"""
import os
import json
import hashlib
from typing import List, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/i18n", tags=["auto-i18n"])

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _client[os.environ["DB_NAME"]]
_cache = _db["i18n_cache"]

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

LANG_NAMES = {
    "en": "English", "pt": "Portuguese", "ar": "Arabic", "hi": "Hindi",
    "id": "Indonesian", "fr": "French", "de": "German", "ja": "Japanese",
    "ko": "Korean", "ru": "Russian", "zh": "Simplified Chinese",
}


class TranslateRequest(BaseModel):
    lang: str
    texts: List[str]


def _key(lang: str, text: str) -> str:
    return hashlib.sha1(f"{lang}||{text}".encode("utf-8")).hexdigest()


async def _llm_translate(lang_name: str, lang: str, texts: List[str]) -> Dict[str, str]:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    src = {t: t for t in texts}
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"autoi18n-{lang}",
        system_message=(
            f"You are a professional UI localizer for a sports training & team management SaaS "
            f"(coaches, periodization, athletes, federations, scouting, reports). "
            f"Translate ONLY the JSON values from Spanish to {lang_name}. "
            f"Keep keys identical. Keep placeholders like {{x}}, %, numbers, currency, symbols (· etc) and proper nouns. "
            f"Use concise, natural UI wording. Return ONLY a valid JSON object, nothing else."
        ),
    ).with_model("openai", "gpt-4o-mini")
    resp = await chat.send_message(UserMessage(text=json.dumps(src, ensure_ascii=False)))
    t = resp.strip()
    if t.startswith("```"):
        t = t.split("```")[1]
        t = t[4:] if t.startswith("json") else t
    try:
        out = json.loads(t)
    except Exception:
        return {}
    return {k: v for k, v in out.items() if isinstance(v, str)}


@router.post("/translate")
async def translate(req: TranslateRequest):
    lang = (req.lang or "es").split("-")[0]
    texts = [t for t in (req.texts or []) if isinstance(t, str) and t.strip()]
    # dedupe preservando orden
    seen = set()
    texts = [t for t in texts if not (t in seen or seen.add(t))]

    if lang == "es" or not texts:
        return {"translations": {t: t for t in texts}}

    if lang not in LANG_NAMES:
        return {"translations": {t: t for t in texts}}

    result: Dict[str, str] = {}
    # 1) caché
    keys = [_key(lang, t) for t in texts]
    cached = {}
    async for doc in _cache.find({"_id": {"$in": keys}}):
        cached[doc["_id"]] = doc.get("tr", "")
    missing = []
    for t, k in zip(texts, keys):
        if k in cached and cached[k]:
            result[t] = cached[k]
        else:
            missing.append(t)

    # 2) traducir faltantes (en lotes de 60 para respuestas estables)
    if missing and EMERGENT_KEY:
        for i in range(0, len(missing), 60):
            chunk = missing[i:i + 60]
            try:
                tr = await _llm_translate(LANG_NAMES[lang], lang, chunk)
            except Exception as e:
                tr = {}
            ops = []
            for t in chunk:
                val = tr.get(t) or t
                result[t] = val
                ops.append({"_id": _key(lang, t), "lang": lang, "text": t, "tr": val})
            if ops:
                from pymongo import ReplaceOne
                await _cache.bulk_write(
                    [ReplaceOne({"_id": o["_id"]}, o, upsert=True) for o in ops]
                )
    else:
        for t in missing:
            result[t] = t

    return {"translations": result}

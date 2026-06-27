// Traducción dinámica de cadenas que NO son nodos de texto del DOM
// (p.ej. valores de <input>), que el traductor DOM global no puede alcanzar.
// Reutiliza el endpoint POST /api/i18n/translate y la MISMA caché de
// localStorage (lt_pg_<lang>) que usa pageTranslator.js — así las
// traducciones se comparten y solo se piden una vez por (texto, idioma).
import { useState, useEffect, useCallback } from 'react';
import i18nInstance from '../i18n';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const baseLang = () => (i18nInstance.language || 'es').split('-')[0];

function loadCache(lang) {
  try {
    const raw = localStorage.getItem(`lt_pg_${lang}`);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch (e) { return {}; }
}
function saveCache(lang, cache) {
  try { localStorage.setItem(`lt_pg_${lang}`, JSON.stringify(cache)); } catch (e) {}
}

async function fetchTranslations(lang, texts) {
  const res = await fetch(`${BACKEND_URL}/api/i18n/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, texts }),
  });
  if (!res.ok) return {};
  const data = await res.json();
  return (data && data.translations) || {};
}

/**
 * useDynamicTranslations(texts: string[])
 * Devuelve `tr(raw)` que mapea un string al idioma activo (o el original si es 'es'
 * o aún no hay traducción). Las traducciones se cachean de forma permanente.
 */
export function useDynamicTranslations(texts) {
  const [, force] = useState(0);
  const lang = baseLang();
  const key = (texts || []).join('||');

  useEffect(() => {
    if (lang === 'es') return;
    const unique = Array.from(new Set((texts || []).filter(t => typeof t === 'string' && t.trim().length > 0)));
    if (unique.length === 0) return;
    const cache = loadCache(lang);
    const missing = unique.filter(t => !cache[t]);
    if (missing.length === 0) { force(n => n + 1); return; }
    let cancelled = false;
    (async () => {
      const tr = await fetchTranslations(lang, missing);
      if (cancelled) return;
      const cur = loadCache(lang);
      let changed = false;
      Object.keys(tr).forEach(k => { if (tr[k]) { cur[k] = tr[k]; changed = true; } });
      if (changed) saveCache(lang, cur);
      force(n => n + 1);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang]);

  const tr = useCallback((raw) => {
    if (raw == null || lang === 'es' || typeof raw !== 'string') return raw;
    const cache = loadCache(lang);
    return cache[raw] || raw;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, key]);

  return tr;
}

export default useDynamicTranslations;

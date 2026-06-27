// Traductor global de TODA la página a nivel DOM.
// Recorre el texto renderizado, lo traduce al idioma activo y lo cachea.
// No requiere envolver textos en los componentes: traduce lo que se ve.
import i18nInstance from './i18n';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'SELECT', 'OPTION']);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

const mem = {};               // mem[lang] = { es: tr }
const pending = {};           // pending[lang] = Set(es)
const inflight = {};          // inflight[lang] = Set(es) ya pedidos
const origNode = new WeakMap(); // textNode -> texto original (es)
const origAttr = new WeakMap(); // element -> { attr: originalEs }

let observer = null;
let applying = false;
let runTimer = null;
let flushTimer = null;
let started = false;

const baseLang = () => (i18nInstance.language || 'es').split('-')[0];

function loadCache(lang) {
  if (mem[lang]) return mem[lang];
  let data = {};
  try { const raw = localStorage.getItem(`lt_pg_${lang}`); if (raw) data = JSON.parse(raw) || {}; } catch (e) {}
  mem[lang] = data;
  return data;
}
function persist(lang) {
  try { localStorage.setItem(`lt_pg_${lang}`, JSON.stringify(mem[lang] || {})); } catch (e) {}
}

function shouldTranslate(t) {
  const s = (t || '').trim();
  if (s.length < 2) return false;
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(s)) return false;     // requiere letras
  if (/^[0-9.,:%/\-+\s°#]+$/.test(s)) return false;          // solo números/símbolos
  if (/^[0-9a-f]{6,}(-[0-9a-f]+)*$/i.test(s)) return false;  // ids/hash/uuid
  if (/^[\d\s./:-]+$/.test(s)) return false;                  // fechas
  return true;
}

function isSkippable(node) {
  let el = node.parentElement;
  while (el) {
    const tag = el.tagName;
    if (!tag) break;
    if (SKIP_TAGS.has(tag)) return true;
    if (el.getAttribute && (el.getAttribute('data-no-translate') !== null && el.getAttribute('data-no-translate') !== undefined && el.hasAttribute('data-no-translate'))) return true;
    if (el.isContentEditable) return true;
    el = el.parentElement;
  }
  return false;
}

function queue(lang, text) {
  if (inflight[lang] && inflight[lang].has(text)) return;
  pending[lang] = pending[lang] || new Set();
  pending[lang].add(text);
  if (!flushTimer) flushTimer = setTimeout(flush, 300);
}

async function flush() {
  flushTimer = null;
  const lang = baseLang();
  const set = pending[lang];
  if (!set || set.size === 0) return;
  const texts = Array.from(set).slice(0, 200);
  texts.forEach((t) => set.delete(t));
  inflight[lang] = inflight[lang] || new Set();
  texts.forEach((t) => inflight[lang].add(t));
  try {
    const res = await fetch(`${BACKEND_URL}/api/i18n/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, texts }),
    });
    if (res.ok) {
      const data = await res.json();
      const tr = (data && data.translations) || {};
      const cache = loadCache(lang);
      let changed = false;
      Object.keys(tr).forEach((k) => { if (tr[k]) { cache[k] = tr[k]; changed = true; } });
      texts.forEach((t) => inflight[lang].delete(t));
      if (changed) { persist(lang); scheduleRun(); }
    } else {
      texts.forEach((t) => inflight[lang].delete(t));
    }
  } catch (e) {
    texts.forEach((t) => inflight[lang] && inflight[lang].delete(t));
  }
  if (set.size > 0 && !flushTimer) flushTimer = setTimeout(flush, 300);
}

function run() {
  runTimer = null;
  const root = document.getElementById('root');
  if (!root || applying) return;
  const lang = baseLang();

  applying = true;
  if (observer) observer.disconnect();
  try {
    const cache = lang === 'es' ? {} : loadCache(lang);

    // --- Nodos de texto ---
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (isSkippable(node)) continue;
      let src = origNode.get(node);
      const current = node.nodeValue;
      if (src == null) {
        if (!shouldTranslate(current)) continue;
        src = current;
        origNode.set(node, src);
      }
      if (lang === 'es') {
        if (current !== src) node.nodeValue = src; // restaurar español
        continue;
      }
      const tr = cache[src.trim()];
      if (tr != null) {
        const lead = src.match(/^\s*/)[0];
        const trail = src.match(/\s*$/)[0];
        const next = lead + tr + trail;
        if (node.nodeValue !== next) node.nodeValue = next;
      } else {
        queue(lang, src.trim());
      }
    }

    // --- Atributos (placeholder, title, aria-label, alt) ---
    const els = root.querySelectorAll('[placeholder],[title],[aria-label],[alt]');
    els.forEach((el) => {
      if (SKIP_TAGS.has(el.tagName)) return;
      let store = origAttr.get(el);
      ATTRS.forEach((a) => {
        if (!el.hasAttribute(a)) return;
        const cur = el.getAttribute(a);
        if (!store) { store = {}; origAttr.set(el, store); }
        let src = store[a];
        if (src == null) {
          if (!shouldTranslate(cur)) return;
          src = cur; store[a] = src;
        }
        if (lang === 'es') { if (cur !== src) el.setAttribute(a, src); return; }
        const tr = cache[src.trim()];
        if (tr != null) { if (cur !== tr) el.setAttribute(a, tr); }
        else queue(lang, src.trim());
      });
    });
  } finally {
    applying = false;
    if (observer) observer.observe(root, { childList: true, subtree: true, characterData: true });
  }
}

function scheduleRun() {
  if (runTimer) return;
  runTimer = setTimeout(run, 150);
}

export function initPageTranslator() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const root = document.getElementById('root');
  if (!root) { started = false; setTimeout(initPageTranslator, 300); return; }

  observer = new MutationObserver(() => { if (!applying) scheduleRun(); });
  observer.observe(root, { childList: true, subtree: true, characterData: true });

  i18nInstance.on('languageChanged', () => scheduleRun());
  scheduleRun();
}

export default initPageTranslator;

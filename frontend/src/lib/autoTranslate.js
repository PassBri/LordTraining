// Traducción de textos vía i18next (namespace info.lbl).
// Mismo mecanismo probado que usa el resto de la app (menú, calculadoras).
// Uso: import { tx as tt } from '../lib/autoTranslate';  ...  tt('Texto')
import i18nInstance from '../i18n';

const _slug = (s) => (s == null ? '' : s.toString()).toLowerCase()
  .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
  .replace(/₂/g, '2').replace(/²/g, '2').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export function tx(s) {
  if (s == null || s === '' || typeof s === 'number') return s;
  const text = typeof s === 'string' ? s : String(s);
  const k = _slug(text);
  return k ? i18nInstance.t(`info.lbl.${k}`, { defaultValue: text }) : text;
}

export default tx;

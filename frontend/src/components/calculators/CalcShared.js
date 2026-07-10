import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { SaveResultBar } from './CalcSaveBar';

// Contexto para capturar el resultado de cada calculadora y permitir guardarlo en un atleta/plan
export const CalcResultContext = React.createContext(null);

// Slug estable (idéntico al de i18n_calc_labels.py) para auto-traducir labels de calculadoras
const slugLbl = (s) => (s == null ? '' : s.toString()).toLowerCase()
  .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
  .replace(/₂/g, '2').replace(/²/g, '2')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Hook reusable: traduce un texto crudo (español) vía calculators.lbl.<slug> con fallback al original
export const useCalcT = () => {
  const { t } = useTranslation();
  return (s) => {
    if (s == null || s === '' || typeof s === 'number') return s;
    const k = slugLbl(s);
    return k ? t(`calculators.lbl.${k}`, { defaultValue: s }) : s;
  };
};

const useRegisterResult = (entry, headline = false) => {
  const store = useContext(CalcResultContext);
  if (store && entry) {
    if (headline) store.current.headline = entry;
    else if (entry.label) store.current.items.push(entry);
  }
};

// ===== Tarjeta base de calculadora =====
export const CalcCard = ({ title, subtitle, color = '#D4AF37', icon: Icon, children, badge, testid }) => {
  const tc = useCalcT();
  const store = React.useRef({ title, color, calculator: testid, module: badge, headline: null, items: [] });
  // Reset en cada render (los hijos vuelven a registrarse durante su render)
  store.current.title = title;
  store.current.color = color;
  store.current.calculator = testid;
  store.current.module = badge;
  store.current.headline = null;
  store.current.items = [];
  return (
    <CalcResultContext.Provider value={store}>
      <Card className="border-0 shadow-sm hover:shadow-md transition" data-testid={testid}>
        <CardHeader className="py-3 border-b border-slate-100" style={{ background: `linear-gradient(90deg, ${color}10, transparent)` }}>
          <CardTitle className="text-sm flex items-center gap-2">
            {Icon && <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color }}><Icon className="w-4 h-4 text-white" /></div>}
            <div className="flex-1">
              <p className="font-bold text-slate-900">{tc(title)}</p>
              {subtitle && <p className="text-[10px] text-slate-500 font-normal mt-0.5">{tc(subtitle)}</p>}
            </div>
            {badge && <Badge variant="outline" className="text-[10px]">{tc(badge)}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {children}
          <SaveResultBar store={store} color={color} />
        </CardContent>
      </Card>
    </CalcResultContext.Provider>
  );
};

// ===== Field row =====
export const Field = ({ label, value, onChange, type = 'number', placeholder, unit, testid, step = '0.01' }) => {
  const tc = useCalcT();
  return (
  <div className="grid grid-cols-3 items-center gap-2">
    <label className="text-xs font-semibold text-slate-600 col-span-1">{tc(label)}</label>
    <div className="col-span-2 flex items-center gap-2">
      <Input type={type} value={value ?? ''} step={step} onChange={(e) => onChange(e.target.value)} placeholder={tc(placeholder)} className="h-8 text-sm flex-1" data-testid={testid} />
      {unit && <span className="text-xs text-slate-400 font-mono whitespace-nowrap min-w-[40px]">{tc(unit)}</span>}
    </div>
  </div>
  );
};

// ===== Select =====
export const Select = ({ label, value, onChange, options, testid }) => {
  const tc = useCalcT();
  return (
  <div className="grid grid-cols-3 items-center gap-2">
    <label className="text-xs font-semibold text-slate-600 col-span-1">{tc(label)}</label>
    <select className="col-span-2 h-8 text-sm border border-slate-200 rounded-md px-2 bg-white"
      value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
      {options.map(o => <option key={o.value} value={o.value}>{tc(o.label)}</option>)}
    </select>
  </div>
  );
};

// ===== Result block =====
export const Result = ({ children, color = '#D4AF37', testid }) => (
  <div className="rounded-xl p-3 mt-2" style={{ background: `${color}10`, border: `1px solid ${color}30` }} data-testid={testid}>
    {children}
  </div>
);

// ===== Big result number =====
export const BigResult = ({ value, label, unit, color = '#D4AF37', sub, testid }) => {
  const tc = useCalcT();
  useRegisterResult({ label, value: value == null ? '—' : String(value), unit: unit || '' }, true);
  return (
    <Result color={color} testid={testid}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tc(label)}</p>
      <p className="text-3xl font-extrabold tabular-nums" style={{ color }}>
        {value ?? '—'}
        {unit && <span className="text-base font-bold opacity-70 ml-1">{tc(unit)}</span>}
      </p>
      {sub && <p className="text-[11px] text-slate-600 mt-1">{tc(sub)}</p>}
    </Result>
  );
};

// ===== Mini stat =====
export const MiniStat = ({ label, value, color = '#0f172a' }) => {
  const tc = useCalcT();
  useRegisterResult({ label, value: value == null ? '—' : String(value) });
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{tc(label)}</p>
      <p className="text-base font-extrabold tabular-nums" style={{ color }}>{value ?? '—'}</p>
    </div>
  );
};

// ===== Helpers numéricos =====
export const num = (v, fallback = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};
export const round = (v, d = 1) => {
  if (v == null || isNaN(v)) return null;
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
};
export const fmt = (v, d = 1, unit = '') => v == null || isNaN(v) ? '—' : `${round(v, d)}${unit}`;

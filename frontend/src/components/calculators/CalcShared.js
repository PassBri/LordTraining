import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

// ===== Tarjeta base de calculadora =====
export const CalcCard = ({ title, subtitle, color = '#3B82F6', icon: Icon, children, badge, testid }) => (
  <Card className="border-0 shadow-sm hover:shadow-md transition" data-testid={testid}>
    <CardHeader className="py-3 border-b border-slate-100" style={{ background: `linear-gradient(90deg, ${color}10, transparent)` }}>
      <CardTitle className="text-sm flex items-center gap-2">
        {Icon && <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color }}><Icon className="w-4 h-4 text-white" /></div>}
        <div className="flex-1">
          <p className="font-bold text-slate-900">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-500 font-normal mt-0.5">{subtitle}</p>}
        </div>
        {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 space-y-3">{children}</CardContent>
  </Card>
);

// ===== Field row =====
export const Field = ({ label, value, onChange, type = 'number', placeholder, unit, testid, step = '0.01' }) => (
  <div className="grid grid-cols-3 items-center gap-2">
    <label className="text-xs font-semibold text-slate-600 col-span-1">{label}</label>
    <div className="col-span-2 flex items-center gap-2">
      <Input type={type} value={value ?? ''} step={step} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm flex-1" data-testid={testid} />
      {unit && <span className="text-xs text-slate-400 font-mono whitespace-nowrap min-w-[40px]">{unit}</span>}
    </div>
  </div>
);

// ===== Select =====
export const Select = ({ label, value, onChange, options, testid }) => (
  <div className="grid grid-cols-3 items-center gap-2">
    <label className="text-xs font-semibold text-slate-600 col-span-1">{label}</label>
    <select className="col-span-2 h-8 text-sm border border-slate-200 rounded-md px-2 bg-white"
      value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ===== Result block =====
export const Result = ({ children, color = '#3B82F6', testid }) => (
  <div className="rounded-xl p-3 mt-2" style={{ background: `${color}10`, border: `1px solid ${color}30` }} data-testid={testid}>
    {children}
  </div>
);

// ===== Big result number =====
export const BigResult = ({ value, label, unit, color = '#3B82F6', sub, testid }) => (
  <Result color={color} testid={testid}>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="text-3xl font-extrabold tabular-nums" style={{ color }}>
      {value ?? '—'}
      {unit && <span className="text-base font-bold opacity-70 ml-1">{unit}</span>}
    </p>
    {sub && <p className="text-[11px] text-slate-600 mt-1">{sub}</p>}
  </Result>
);

// ===== Mini stat =====
export const MiniStat = ({ label, value, color = '#0f172a' }) => (
  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center">
    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-base font-extrabold tabular-nums" style={{ color }}>{value ?? '—'}</p>
  </div>
);

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

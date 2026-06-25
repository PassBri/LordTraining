import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Minus, LineChart as LineIcon, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const token = () => localStorage.getItem('train_token');

const toNum = (v) => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
};

export default function AthleteProgress({ athleteId }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) return;
    setLoading(true);
    fetch(`${API_URL}/api/calculator-results?athlete_id=${athleteId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setResults(d.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [athleteId]);

  // Agrupa por calculadora + métrica principal (headline)
  const sorted = [...results].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  const groups = {};
  for (const r of sorted) {
    if (!r.headline) continue;
    const val = toNum(r.headline.value);
    if (val == null) continue;
    const key = `${r.calculator}|${r.headline.label || r.title}`;
    if (!groups[key]) groups[key] = { title: r.title, label: r.headline.label, unit: r.headline.unit, color: r.color || '#3B82F6', module: r.module, points: [] };
    groups[key].points.push({ date: (r.created_at || '').slice(0, 10), value: val });
  }
  const series = Object.values(groups);

  if (!athleteId) return null;
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  if (!series.length) return null;

  return (
    <div className="mt-5" data-testid="athlete-progress">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center"><LineIcon className="w-4 h-4" /></div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Evolución del rendimiento</h3>
          <p className="text-[11px] text-slate-500">Resultados guardados desde las calculadoras a lo largo del tiempo</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {series.map((s, i) => <ProgressCard key={i} s={s} />)}
      </div>
    </div>
  );
}

function ProgressCard({ s }) {
  const pts = s.points;
  const first = pts[0].value;
  const last = pts[pts.length - 1].value;
  const delta = last - first;
  const pct = first ? (delta / Math.abs(first)) * 100 : 0;
  const flat = Math.abs(delta) < 1e-9 || pts.length < 2;
  const Trend = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const trendColor = flat ? '#94a3b8' : delta > 0 ? '#10b981' : '#ef4444';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md transition" data-testid="athlete-progress-card">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-700 truncate" title={s.title}>{s.title}</p>
          <p className="text-[10px] text-slate-400 truncate">{s.label}</p>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5" style={{ background: `${trendColor}18`, color: trendColor }}>
          <Trend className="w-3 h-3" />{pts.length >= 2 ? `${delta > 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="text-2xl font-extrabold tabular-nums" style={{ color: s.color }}>{last}</span>
          {s.unit && <span className="text-xs font-bold text-slate-400 ml-1">{s.unit}</span>}
          <p className="text-[10px] text-slate-400">{pts.length} registro{pts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="w-24 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pts} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip
                contentStyle={{ fontSize: 11, padding: '2px 6px', borderRadius: 6 }}
                labelFormatter={(_, p) => p?.[0]?.payload?.date || ''}
                formatter={(v) => [`${v}${s.unit ? ' ' + s.unit : ''}`, s.label]}
              />
              <Line type="monotone" dataKey="value" stroke={s.color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

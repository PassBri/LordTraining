import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { Loader2, FileDown, TrendingUp, TrendingDown, Minus, Calendar, Target } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PublicProgress() {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [dl, setDl] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/calculator-results/public/${shareId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData).catch(() => setErr(true)).finally(() => setLoading(false));
  }, [shareId]);

  const downloadPdf = async () => {
    setDl(true);
    try {
      const res = await fetch(`${API_URL}/api/calculator-results/public/${shareId}/pdf?origin=${encodeURIComponent(window.location.origin)}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `progreso.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { alert('No se pudo generar el PDF'); }
    setDl(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 animate-spin text-lime-300" /></div>;
  if (err || !data) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Enlace no válido o expirado.</div>;

  const pts = data.points || [];
  const vals = pts.map(p => p.value);
  const first = vals[0], last = vals[vals.length - 1];
  const delta = last - first;
  const pct = first ? (delta / Math.abs(first)) * 100 : 0;
  const best = Math.max(...vals), avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const Trend = Math.abs(delta) < 1e-9 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const trendColor = Math.abs(delta) < 1e-9 ? '#94a3b8' : delta > 0 ? '#10b981' : '#f87171';
  const color = data.color || '#D4AF37';
  const target = data.goal?.target_value;
  const yDomain = target != null
    ? [(dmin) => Math.min(dmin, target) - 1, (dmax) => Math.max(dmax, target) + 1]
    : ['auto', 'auto'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-testid="public-progress">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="rounded-2xl p-6 mb-5" style={{ background: 'linear-gradient(120deg,#0f172a,#111c33,#0b1220)', borderBottom: '4px solid #D4AF37' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-black tracking-widest text-lime-300">LORD<span className="text-white">TRAINING</span> · PROGRESO</span>
          </div>
          <h1 className="text-3xl font-black">{data.athlete_name}</h1>
          <p className="text-lime-300 font-bold">{data.title} · {data.label}</p>
          <div className="flex items-baseline gap-3 mt-3">
            <span className="text-4xl font-black text-lime-300">{last}<span className="text-lg text-slate-400 ml-1">{data.unit}</span></span>
            <span className="flex items-center gap-1 text-sm font-bold" style={{ color: trendColor }}><Trend className="w-4 h-4" />{delta > 0 ? '+' : ''}{pct.toFixed(1)}% vs inicio</span>
          </div>
          {data.goal?.target_value != null && (
            <div className="mt-3" data-testid="public-goal">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-300 flex items-center gap-1"><Target className="w-3.5 h-3.5 text-emerald-400" />Meta: {data.goal.target_value}{data.unit ? ` ${data.unit}` : ''}{data.goal.reached ? ' · ¡Alcanzada! 🏆' : ''}</span>
                <span className="text-emerald-400">{data.goal.progress_pct}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${data.goal.progress_pct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {[['Inicial', first], ['Actual', last], ['Mejor', best], ['Promedio', avg.toFixed(1)], ['Registros', pts.length]].map(([l, v], i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-lg font-black tabular-nums" style={{ color }}>{v}</p>
              <p className="text-[9px] font-bold uppercase text-slate-500">{l}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-72 mb-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pts} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(d) => (d || '').slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={yDomain} width={36} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', color: '#fff' }} formatter={(v) => [`${v}${data.unit ? ' ' + data.unit : ''}`, data.label]} />
              {data.goal?.target_value != null && (
                <ReferenceLine y={data.goal.target_value} stroke="#34d399" strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: `Meta ${data.goal.target_value}`, position: 'insideTopRight', fontSize: 10, fill: '#34d399', fontWeight: 700 }} />
              )}
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Records */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-5">
          <div className="px-4 py-2.5 text-[11px] font-black uppercase text-slate-500 flex items-center gap-1.5 border-b border-slate-800"><Calendar className="w-3.5 h-3.5" />Historial</div>
          <div className="divide-y divide-slate-800">
            {[...pts].reverse().map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[11px] text-slate-500 w-20 shrink-0">{p.date}</span>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color }}>{p.value}{data.unit ? ` ${data.unit}` : ''}</span>
                <span className="text-[12px] text-slate-400 truncate">{p.note || (p.plan_name ? `Plan: ${p.plan_name}` : '')}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={downloadPdf} disabled={dl} data-testid="public-progress-pdf"
          className="w-full flex items-center justify-center gap-2 bg-lime-300 hover:bg-lime-200 text-slate-900 font-bold py-3 rounded-xl transition disabled:opacity-60">
          {dl ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}Descargar reporte PDF
        </button>
        {!!(data.sponsors || []).length && (
          <div className="mt-6 text-center" data-testid="public-sponsors">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Patrocinadores</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {data.sponsors.map(sp => (
                <img key={sp.id} src={`${API_URL}${sp.logo_url}`} alt={sp.name} className="h-9 w-auto max-w-[110px] object-contain opacity-90" />
              ))}
            </div>
          </div>
        )}
        <p className="text-center text-[11px] text-slate-600 mt-4">Generado con LordTraining · Identifica el talento. Construye el futuro.</p>
      </div>
    </div>
  );
}

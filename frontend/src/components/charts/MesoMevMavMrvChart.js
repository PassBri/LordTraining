import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

/**
 * Chart standalone "Proyeccion MEV → MAV → MRV" para un mesociclo.
 * Reutilizable en Periodización y en Plan Gráfico (por mesociclo).
 *
 * Props:
 *   microcycles: array de microciclos del mesociclo (con .sessions, .type, etc.)
 *   compact?: boolean — si true, header/controles más pequeños (para Plan Gráfico)
 *   testId?: string
 */
export default function MesoMevMavMrvChart({ microcycles = [], compact = false, testId }) {
  const { t } = useTranslation();
  const [chartMode, setChartMode] = useState('mixta');
  const [activeMetrics, setActiveMetrics] = useState({ vol: true, int: true, den: false });

  const microData = useMemo(() => {
    return (microcycles || []).map((micro, mi) => {
      const sessions = micro.sessions || [];
      let totalSeries = 0, totalVolumen = 0, totalIntensidad = 0, actCount = 0;
      let totalDensidad = 0, densCount = 0;
      sessions.forEach(ses => {
        const sd = ses.sessionData || ses.detailed_data;
        if (sd?.fases) {
          let sesSeries = 0, sesTimeSec = 0;
          Object.values(sd.fases).forEach(fase => {
            (fase.actividades || []).forEach(act => {
              totalSeries += parseInt(act.series) || 0;
              totalVolumen += parseFloat(act.volumen) || 0;
              totalIntensidad += parseFloat(act.intensidad) || 0;
              actCount++;
              const s = parseInt(act.series) || 0;
              const r = parseInt(act.repeticiones) || 10;
              const rec = parseFloat(act.recuperacion) || 2;
              sesSeries += s;
              sesTimeSec += s * (r * 3 + rec * 60);
            });
          });
          if (sesTimeSec > 0) { totalDensidad += sesSeries / (sesTimeSec / 60); densCount++; }
        } else {
          totalSeries += Math.round((ses.duration || 60) / 5);
          totalVolumen += ses.duration || 60;
          totalIntensidad += 70;
          actCount++;
        }
      });
      const microLoad = micro.type?.load || micro.type?.loadPercent || 70;
      const isDeload = (micro.type?.id === 'descarga' || micro.type?.id === 'recuperacion'
        || micro.type?.name?.toLowerCase().includes('descarga')
        || micro.type?.name?.toLowerCase().includes('recup'));
      return {
        name: `S${mi + 1}`,
        series: totalSeries || Math.round(microLoad * 0.4),
        volumen: Math.round(totalVolumen) || Math.round(microLoad * 0.6),
        intensidad: actCount > 0 ? Math.round(totalIntensidad / actCount) : microLoad,
        densidad: densCount > 0 ? +(totalDensidad / densCount).toFixed(2) : +(1 / (3 + mi * 0.3)).toFixed(2),
        load: microLoad,
        isDeload,
        sessions: sessions.length,
      };
    });
  }, [microcycles]);

  if (microData.length === 0) return null;

  const maxSeries = Math.max(...microData.map(d => d.series), 1);
  const maxVolumen = Math.max(...microData.map(d => d.volumen), 1);
  const dominantMax = activeMetrics.vol ? Math.max(maxSeries, maxVolumen) : maxSeries;
  const mevLine = Math.round(dominantMax * 0.35);
  const mavLine = Math.round(dominantMax * 0.7);
  const mrvLine = Math.round(dominantMax * 1.05);
  const yLeftMax = Math.round(dominantMax * 1.2);

  const showBars = chartMode === 'barras' || chartMode === 'mixta';
  const showLines = chartMode === 'lineas' || chartMode === 'mixta';
  const showDots = chartMode === 'puntos';

  const toggleMetric = (m) => setActiveMetrics(prev => ({ ...prev, [m]: !prev[m] }));

  const CustomTooltipMeso = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    const pct = d.series / maxSeries;
    const zone = d.isDeload ? t('loadPanel.mesoChartDeload') : pct > 0.85 ? 'MRV' : pct > 0.5 ? 'MAV' : 'MEV';
    const zoneColor = d.isDeload ? '#818cf8' : pct > 0.85 ? '#e11d48' : pct > 0.5 ? '#0891b2' : '#16a34a';
    return (
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3.5"
           style={{ fontFamily: "'DM Sans',sans-serif", minWidth: 210 }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded" style={{ background: zoneColor }} />
          <span className="text-[12px] font-bold text-slate-800">{label} — {zone}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mb-2">
          <div className="flex justify-between"><span className="text-slate-400">{t('loadPanel.ttSeries')}</span><span className="font-bold text-slate-700">{d.series}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">{t('loadPanel.ttVolumen')}</span><span className="font-bold" style={{ color: '#84cc16' }}>{d.volumen}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">{t('loadPanel.ttIntensidad')}</span><span className="font-bold" style={{ color: '#f59e0b' }}>{d.intensidad}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">{t('loadPanel.ttDensidad')}</span><span className="font-bold" style={{ color: '#8b5cf6' }}>{d.densidad}</span></div>
        </div>
        <div className="pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">
          {d.sessions} {t('loadPanel.ttSessions')} · {t('loadPanel.ttLoad')} {d.load}%
        </div>
      </div>
    );
  };

  const titleSize = compact ? 'text-[12px]' : 'text-[14px]';
  const subSize = compact ? 'text-[10px]' : 'text-[11px]';
  const chartHeight = compact ? 180 : 220;

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
      data-testid={testId}
      style={{ fontFamily: "'DM Sans',sans-serif" }}
    >
      {/* Header */}
      <div className={`${compact ? 'px-3 pt-3 pb-1' : 'px-5 pt-4 pb-1'} flex items-start justify-between gap-2`}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-cyan-600`} />
            <span className={`${titleSize} font-bold text-slate-800`}>{t('loadPanel.mesoProjTitle')}</span>
          </div>
          <p className={`${subSize} text-slate-400`}>{t('loadPanel.mesoProjSub')}</p>
        </div>
        <div className="relative group/mevinfo shrink-0">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center cursor-help hover:bg-slate-200 transition-colors">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="absolute right-0 top-8 w-[300px] p-4 rounded-xl bg-white shadow-2xl border border-slate-200 opacity-0 invisible group-hover/mevinfo:opacity-100 group-hover/mevinfo:visible transition-all z-50">
            <p className="text-[13px] font-bold text-slate-800 mb-2">{t('loadPanel.mesoChartTitle')}</p>
            <div className="space-y-1 text-[10px] text-slate-500">
              <p><b style={{ color: '#16a34a' }}>MEV</b> · {t('loadPanel.mevFull')}</p>
              <p><b style={{ color: '#0891b2' }}>MAV</b> · {t('loadPanel.mavFull')}</p>
              <p><b style={{ color: '#e11d48' }}>MRV</b> · {t('loadPanel.mrvFull')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`${compact ? 'px-3' : 'px-5'} py-2 flex items-center justify-between gap-2 flex-wrap`}>
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {[{ id: 'barras', label: t('loadPanel.modeBarras') }, { id: 'lineas', label: t('loadPanel.modeLineas') }, { id: 'mixta', label: t('loadPanel.modeMixta') }, { id: 'puntos', label: t('loadPanel.modePuntos') }].map(m => (
            <button
              key={m.id}
              onClick={() => setChartMode(m.id)}
              className={`px-2.5 py-1 rounded-md transition-all text-[10px] font-medium ${
                chartMode === m.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >{m.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => toggleMetric('vol')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all ${activeMetrics.vol ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}
            style={activeMetrics.vol ? { background: '#84cc16' } : {}}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeMetrics.vol ? 'white' : '#84cc16' }} /> VOL
          </button>
          <button onClick={() => toggleMetric('int')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all ${activeMetrics.int ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}
            style={activeMetrics.int ? { background: '#f59e0b' } : {}}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeMetrics.int ? 'white' : '#f59e0b' }} /> INT
          </button>
          <button onClick={() => toggleMetric('den')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all ${activeMetrics.den ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}
            style={activeMetrics.den ? { background: '#8b5cf6' } : {}}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeMetrics.den ? 'white' : '#8b5cf6' }} /> DEN
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart data={microData} margin={{ top: 10, right: 25, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.12)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, yLeftMax]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip content={<CustomTooltipMeso />} />
            <ReferenceLine yAxisId="left" y={mevLine} stroke="#16a34a" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `MEV ${mevLine}`, position: 'insideTopRight', fontSize: 8, fill: '#16a34a', fontWeight: 700 }} />
            <ReferenceLine yAxisId="left" y={mavLine} stroke="#0891b2" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `MAV ${mavLine}`, position: 'insideTopRight', fontSize: 8, fill: '#0891b2', fontWeight: 700 }} />
            <ReferenceLine yAxisId="left" y={mrvLine} stroke="#e11d48" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `MRV ${mrvLine}`, position: 'insideTopRight', fontSize: 8, fill: '#e11d48', fontWeight: 700 }} />
            {showBars && <Bar yAxisId="left" dataKey="series" fill="#0891b2" radius={[6, 6, 0, 0]} maxBarSize={45} fillOpacity={0.85} />}
            {showBars && activeMetrics.vol && <Bar yAxisId="left" dataKey="volumen" fill="#84cc16" radius={[6, 6, 0, 0]} maxBarSize={45} fillOpacity={0.6} />}
            {(showLines || showDots) && <Line yAxisId="left" type="monotone" dataKey="series" stroke="#0891b2" strokeWidth={showDots ? 0 : 2.5} dot={{ fill: '#0891b2', r: showDots ? 6 : 4, strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 8, fill: '#0891b2', stroke: 'white', strokeWidth: 2 }} />}
            {(showLines || showDots) && activeMetrics.vol && <Line yAxisId="left" type="monotone" dataKey="volumen" stroke="#84cc16" strokeWidth={showDots ? 0 : 2} strokeDasharray={showDots ? '' : '5 3'} dot={{ fill: '#84cc16', r: showDots ? 6 : 3.5, strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7, fill: '#84cc16', stroke: 'white', strokeWidth: 2 }} />}
            {activeMetrics.int && <Line yAxisId="right" type="monotone" dataKey="intensidad" stroke="#f59e0b" strokeWidth={showDots ? 0 : 2} dot={{ fill: '#f59e0b', r: showDots ? 6 : 3.5, strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7, fill: '#f59e0b', stroke: 'white', strokeWidth: 2 }} />}
            {activeMetrics.den && <Area yAxisId="right" type="monotone" dataKey="densidad" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.08} strokeWidth={showDots ? 0 : 1.5} dot={{ fill: '#8b5cf6', r: showDots ? 6 : 3, strokeWidth: 2, stroke: 'white' }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import {
  Flame, Activity, TrendingUp, TrendingDown, AlertTriangle,
  Heart, BarChart3, Shield, Calendar,
} from 'lucide-react';

/**
 * LoadPanel — Componente "Carga" del módulo Periodización.
 *
 * Muestra de manera ejecutiva:
 *   • Carga aguda (CA — última semana)
 *   • Carga crónica (CC — promedio últimas 4 sem)
 *   • ACWR (CA/CC) con zonas safe/optimal/danger
 *   • Magnitud de carga & recuperación semana a semana
 *   • Distribución por mesociclo
 *   • Tendencia + alertas inteligentes
 */
export default function LoadPanel({ activePlan }) {
  // Extraer microciclos directamente del activePlan (estructura plan→macro→meso→micro→sesiones).
  // Calcular carga total (UA = vol*int/100), RPE prom, ACWR por semana de manera autónoma.
  const data = useMemo(() => {
    if (!activePlan?.macrocycles) return [];
    const rows = [];
    let weekCounter = 1;
    activePlan.macrocycles.forEach((macro) => {
      (macro.mesocycles || []).forEach((meso) => {
        (meso.microcycles || []).forEach((mc) => {
          const sessions = mc.sessions || [];
          let totalSeries = 0, totalVolumen = 0, sumIntensity = 0, sumRpe = 0;
          let actCount = 0, sesCount = sessions.length;
          sessions.forEach((ses) => {
            const sd = ses.sessionData || ses.detailed_data;
            if (sd?.fases) {
              Object.values(sd.fases).forEach((fase) => {
                (fase.actividades || []).forEach((act) => {
                  totalSeries += parseInt(act.series) || 0;
                  totalVolumen += parseFloat(act.volumen) || 0;
                  sumIntensity += parseFloat(act.intensidad) || 0;
                  actCount++;
                });
              });
            }
            sumRpe += ses.rpe || 0;
          });
          const avgInt = actCount > 0 ? Math.round(sumIntensity / actCount) : 0;
          const avgRpe = sesCount > 0 ? +(sumRpe / sesCount).toFixed(1) : 0;
          // Carga UA = volumen * intensidad / 100 (Foster modificado)
          const cargaUA = Math.round((totalVolumen * avgInt) / 100);
          rows.push({
            week: `S${weekCounter}`,
            weekNum: weekCounter,
            carga: cargaUA,
            vol: Math.round(totalVolumen),
            int: avgInt,
            rpe: avgRpe,
            sessions: sesCount,
            meso: meso.name || 'Mesociclo',
            mesoColor: meso.color || '#0ea5e9',
          });
          weekCounter++;
        });
      });
    });
    // Computar ACWR por semana (CA / CC últimas 4 sem)
    return rows.map((r, i) => {
      const last4 = rows.slice(Math.max(0, i - 3), i + 1);
      const cc = last4.length > 0 ? last4.reduce((s, x) => s + x.carga, 0) / last4.length : 0;
      const acwr = cc > 0 ? +(r.carga / cc).toFixed(2) : 0;
      return { ...r, acwr };
    });
  }, [activePlan]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const last = data[data.length - 1];
    const carga_aguda = last.carga;
    const last4 = data.slice(-4);
    const carga_cronica = last4.length > 0
      ? Math.round(last4.reduce((s, d) => s + d.carga, 0) / last4.length) : 0;
    const acwr = carga_cronica > 0
      ? +((carga_aguda / carga_cronica)).toFixed(2) : 0;
    const totalCarga = data.reduce((s, d) => s + d.carga, 0);
    const avgRPE = +(data.reduce((s, d) => s + d.rpe, 0) / data.length).toFixed(1);
    const peakWeek = data.reduce((m, d) => d.carga > m.carga ? d : m, data[0]);
    const minWeek = data.reduce((m, d) => d.carga < m.carga ? d : m, data[0]);
    let trend = 'estable';
    if (data.length >= 3) {
      const recent = data.slice(-3).reduce((s, d) => s + d.carga, 0) / 3;
      const earlier = data.slice(-6, -3).reduce((s, d) => s + d.carga, 0) / Math.max(data.slice(-6, -3).length, 1);
      if (recent > earlier * 1.1) trend = 'creciente';
      else if (recent < earlier * 0.9) trend = 'decreciente';
    }
    return { carga_aguda, carga_cronica, acwr, totalCarga, avgRPE, peakWeek, minWeek, trend };
  }, [data]);

  const acwrZone = (acwr) => {
    if (acwr === 0) return { label: 'Sin datos', color: '#94a3b8', bg: '#f1f5f9' };
    if (acwr < 0.8) return { label: 'Detraining', color: '#0EA5E9', bg: '#e0f2fe', desc: 'Carga insuficiente — riesgo de pérdida de adaptaciones.' };
    if (acwr <= 1.3) return { label: 'Zona óptima', color: '#10B981', bg: '#d1fae5', desc: 'Equilibrio ideal entre fitness y fatiga.' };
    if (acwr <= 1.5) return { label: 'Precaución', color: '#F59E0B', bg: '#fef3c7', desc: 'Carga aguda elevada — monitorear recuperación.' };
    return { label: 'Sobrecarga', color: '#EF4444', bg: '#fee2e2', desc: 'Riesgo alto de lesión — reducir volumen o intensidad.' };
  };

  if (!activePlan) {
    return (
      <Card className="p-12 text-center bg-gradient-to-br from-slate-50 to-white">
        <Flame className="w-14 h-14 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-700">Carga</h3>
        <p className="text-sm text-slate-500 mt-2">Selecciona un plan activo para ver la magnitud de carga, ACWR y tendencias.</p>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Activity className="w-14 h-14 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-700">Sin datos de carga aún</h3>
        <p className="text-sm text-slate-500 mt-2">
          Cuando agregues sesiones con series, repeticiones, intensidad y RPE,
          aquí verás el cálculo automático de carga (UA), ACWR y tendencias.
        </p>
      </Card>
    );
  }

  const zone = stats ? acwrZone(stats.acwr) : null;

  return (
    <div className="space-y-5" data-testid="load-panel" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Hero KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Carga aguda */}
        <Card className="overflow-hidden border-0 shadow-md" data-testid="kpi-acute-load">
          <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-600" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                <Flame className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Carga aguda</span>
            </div>
            <div className="text-3xl font-black text-slate-900 leading-none">{stats.carga_aguda}</div>
            <div className="text-[10px] text-slate-400 mt-1">UA · última semana</div>
          </CardContent>
        </Card>
        {/* Carga crónica */}
        <Card className="overflow-hidden border-0 shadow-md" data-testid="kpi-chronic-load">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Carga crónica</span>
            </div>
            <div className="text-3xl font-black text-slate-900 leading-none">{stats.carga_cronica}</div>
            <div className="text-[10px] text-slate-400 mt-1">UA · prom. 4 sem</div>
          </CardContent>
        </Card>
        {/* ACWR */}
        <Card className="overflow-hidden border-0 shadow-md" data-testid="kpi-acwr">
          <div className="h-1" style={{ background: zone.color }} />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: zone.bg }}>
                <Activity className="w-4 h-4" style={{ color: zone.color }} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ACWR</span>
            </div>
            <div className="text-3xl font-black leading-none" style={{ color: zone.color }}>{stats.acwr}</div>
            <div className="text-[10px] mt-1 font-semibold" style={{ color: zone.color }}>{zone.label}</div>
          </CardContent>
        </Card>
        {/* Trend */}
        <Card className="overflow-hidden border-0 shadow-md" data-testid="kpi-trend">
          <div className={`h-1 bg-gradient-to-r ${
            stats.trend === 'creciente' ? 'from-amber-400 to-orange-500'
            : stats.trend === 'decreciente' ? 'from-sky-400 to-cyan-500'
            : 'from-slate-300 to-slate-400'
          }`} />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.trend === 'creciente' ? 'bg-amber-50'
                : stats.trend === 'decreciente' ? 'bg-sky-50'
                : 'bg-slate-100'
              }`}>
                {stats.trend === 'creciente' ? <TrendingUp className="w-4 h-4 text-amber-600" />
                : stats.trend === 'decreciente' ? <TrendingDown className="w-4 h-4 text-sky-600" />
                : <BarChart3 className="w-4 h-4 text-slate-500" />}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tendencia</span>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none capitalize">{stats.trend}</div>
            <div className="text-[10px] text-slate-400 mt-1">RPE prom. {stats.avgRPE}</div>
          </CardContent>
        </Card>
      </div>

      {/* ACWR Alert banner */}
      <div
        className="rounded-xl border-2 p-4 flex items-start gap-3"
        style={{ borderColor: zone.color, background: `${zone.bg}` }}
        data-testid="acwr-alert"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'white' }}>
          {stats.acwr > 1.5 ? <AlertTriangle className="w-5 h-5" style={{ color: zone.color }} />
            : <Heart className="w-5 h-5" style={{ color: zone.color }} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm" style={{ color: zone.color }}>{zone.label}</h4>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 font-bold">ACWR = {stats.acwr}</span>
          </div>
          <p className="text-[12px] mt-1" style={{ color: zone.color }}>{zone.desc}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
            <span>· Zona óptima: <strong>0.8 — 1.3</strong></span>
            <span>· Precaución: <strong>1.3 — 1.5</strong></span>
            <span>· Sobrecarga: <strong>&gt; 1.5</strong></span>
          </div>
        </div>
      </div>

      {/* Main chart: Magnitud de carga & recuperación + ACWR overlay */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800">Magnitud de Carga · Volumen · Intensidad</h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{data.length} semanas</span>
        </div>
        <CardContent className="p-3">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: 'UA', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 2]} label={{ value: 'ACWR', angle: 90, position: 'insideRight', fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: 11 }}
                formatter={(v, name) => [v, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="circle" />
              {/* ACWR safe band */}
              <ReferenceLine yAxisId="right" y={1.3} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1} />
              <ReferenceLine yAxisId="right" y={1.5} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1} />
              <Bar yAxisId="left" dataKey="carga" name="Carga (UA)" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={42} fillOpacity={0.85} />
              <Bar yAxisId="left" dataKey="vol" name="Volumen" fill="#84cc16" radius={[6, 6, 0, 0]} maxBarSize={42} fillOpacity={0.55} />
              <Line yAxisId="left" type="monotone" dataKey="int" name="Intensidad %" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} activeDot={{ r: 5 }} />
              <Area yAxisId="right" type="monotone" dataKey="acwr" name="ACWR" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.12} strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Heatmap por mesociclo */}
      <Card>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Carga por mesociclo</h3>
          </div>
          <span className="text-[10px] text-slate-400">Distribución porcentual del volumen</span>
        </div>
        <CardContent className="p-3">
          {(() => {
            const byMeso = {};
            data.forEach(d => {
              if (!byMeso[d.meso]) byMeso[d.meso] = { name: d.meso, total: 0, weeks: [] };
              byMeso[d.meso].total += d.carga;
              byMeso[d.meso].weeks.push(d);
            });
            const groups = Object.values(byMeso);
            const totalAll = groups.reduce((s, g) => s + g.total, 0) || 1;
            return (
              <div className="space-y-2">
                {groups.map((g, i) => {
                  const pct = Math.round((g.total / totalAll) * 100);
                  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
                  const color = colors[i % colors.length];
                  return (
                    <div key={g.name} className="flex items-center gap-3" data-testid={`meso-load-${i}`}>
                      <div className="w-32 text-[11px] font-bold text-slate-700 truncate">{g.name}</div>
                      <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
                        <div className="h-full rounded-md transition-all flex items-center justify-end pr-2 text-[10px] text-white font-bold"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)` }}>
                          {pct >= 8 ? `${pct}%` : ''}
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-[12px] font-bold" style={{ color }}>{g.total} UA</span>
                        <div className="text-[9px] text-slate-400">{g.weeks.length} sem</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Footer summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3" data-testid="summary-total">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalCarga}</div>
          <div className="text-[10px] text-slate-500">UA acumuladas</div>
        </Card>
        <Card className="p-3" data-testid="summary-peak">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pico</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.peakWeek.carga}</div>
          <div className="text-[10px] text-slate-500">{stats.peakWeek.week} · {stats.peakWeek.meso}</div>
        </Card>
        <Card className="p-3" data-testid="summary-min">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mínimo</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.minWeek.carga}</div>
          <div className="text-[10px] text-slate-500">{stats.minWeek.week} · descarga</div>
        </Card>
        <Card className="p-3" data-testid="summary-rpe">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">RPE prom.</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.avgRPE}</div>
          <div className="text-[10px] text-slate-500">Escala 1-10</div>
        </Card>
      </div>
    </div>
  );
}

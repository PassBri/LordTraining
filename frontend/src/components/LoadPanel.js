import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent } from './ui/dialog';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import {
  Flame, Activity, TrendingUp, TrendingDown, AlertTriangle,
  Heart, BarChart3, Shield, Calendar, Maximize2, X, Layers,
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
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState({});
  const [level, setLevel] = useState('meso');
  const [metric, setMetric] = useState('carga');
  const toggleSeries = (key) => setHidden((h) => ({ ...h, [key]: !h[key] }));
  // Extraer microciclos directamente del activePlan (estructura plan→macro→meso→micro→sesiones).
  // Calcular carga total (UA = vol*int/100), RPE prom, ACWR por semana de manera autónoma.
  // Fallback inteligente: usa detailed_data.fases si existe, si no usa los campos directos
  // de la sesión (volume, intensity, duration_minutes), y como último recurso los porcentajes
  // del meso/micro (load_percent, volume, intensity).
  const data = useMemo(() => {
    if (!activePlan?.macrocycles) return [];
    const rows = [];
    let weekCounter = 1;
    activePlan.macrocycles.forEach((macro) => {
      (macro.mesocycles || []).forEach((meso) => {
        (meso.microcycles || []).forEach((mc) => {
          const sessions = mc.sessions || [];
          let totalSeries = 0, totalVolumen = 0, sumIntensity = 0, sumRpe = 0, sumDuration = 0;
          let actCount = 0, sesCount = sessions.length, sesWithIntensity = 0, sesWithRpe = 0;
          sessions.forEach((ses) => {
            const sd = ses.sessionData || ses.detailed_data;
            let sessionUsedDetailed = false;
            if (sd && typeof sd === 'object' && sd.fases && Object.keys(sd.fases).length > 0) {
              Object.values(sd.fases).forEach((fase) => {
                (fase.actividades || []).forEach((act) => {
                  totalSeries += parseInt(act.series) || 0;
                  totalVolumen += parseFloat(act.volumen) || 0;
                  const actInt = parseFloat(act.intensidad) || 0;
                  if (actInt > 0) {
                    sumIntensity += actInt;
                    actCount++;
                    sessionUsedDetailed = true;
                  }
                });
              });
            }
            // Fallback a campos directos de la sesión
            if (!sessionUsedDetailed) {
              const sesVol = parseFloat(ses.volume) || 0;
              const sesInt = parseFloat(ses.intensity) || 0;
              const sesDur = parseFloat(ses.duration_minutes) || 0;
              if (sesVol > 0) totalVolumen += sesVol;
              else if (sesDur > 0) totalVolumen += sesDur; // usar duración como proxy de volumen
              if (sesInt > 0) {
                sumIntensity += sesInt;
                sesWithIntensity++;
              }
              sumDuration += sesDur;
            }
            const rpe = parseFloat(ses.rpe) || (sd?.monitoreo?.rpe ? parseFloat(sd.monitoreo.rpe) : 0);
            if (rpe > 0) {
              sumRpe += rpe;
              sesWithRpe++;
            }
          });
          // Promedio de intensidad: priorizar actividades, sino sesiones
          const avgInt = actCount > 0
            ? Math.round(sumIntensity / actCount)
            : (sesWithIntensity > 0 ? Math.round(sumIntensity / sesWithIntensity) : 0);
          const avgRpe = sesWithRpe > 0 ? +(sumRpe / sesWithRpe).toFixed(1) : 0;
          // Si no hay datos de sesiones, usar load del microciclo del backend
          let cargaUA = Math.round((totalVolumen * avgInt) / 100);
          if (cargaUA === 0) {
            const microLoad = parseFloat(mc.load_percent) || 0;
            const microVol = parseFloat(mc.volume) || 0;
            const microInt = parseFloat(mc.intensity) || 0;
            if (microVol > 0 && microInt > 0) {
              cargaUA = Math.round((microVol * microInt) / 100);
            } else if (microLoad > 0) {
              // Estimar UA escalando 0-100 a una banda plausible 0-1500 UA semanales
              cargaUA = Math.round((microLoad / 100) * 1500);
            }
          }
          rows.push({
            week: `S${weekCounter}`,
            weekNum: weekCounter,
            carga: cargaUA,
            vol: Math.round(totalVolumen) || Math.round(parseFloat(mc.volume) || 0),
            int: avgInt || Math.round(parseFloat(mc.intensity) || 0),
            rpe: avgRpe,
            sessions: sesCount,
            duration: Math.round(sumDuration),
            meso: meso.name || t('loadPanel.mesoDefault'),
            mesoColor: meso.color || '#0ea5e9',
            macro: macro.name || 'Macrociclo',
            fase: meso.phase || meso.fase || meso.stage || macro.phase || macro.stage || '',
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
    if (acwr === 0) return { label: t('loadPanel.zoneNoData'), color: '#94a3b8', bg: '#f1f5f9' };
    if (acwr < 0.8) return { label: t('loadPanel.zoneDetraining'), color: '#0EA5E9', bg: '#e0f2fe', desc: t('loadPanel.zoneDetrainingDesc') };
    if (acwr <= 1.3) return { label: t('loadPanel.zoneOptimal'), color: '#10B981', bg: '#d1fae5', desc: t('loadPanel.zoneOptimalDesc') };
    if (acwr <= 1.5) return { label: t('loadPanel.zoneCaution'), color: '#F59E0B', bg: '#fef3c7', desc: t('loadPanel.zoneCautionDesc') };
    return { label: t('loadPanel.zoneOverload'), color: '#EF4444', bg: '#fee2e2', desc: t('loadPanel.zoneOverloadDesc') };
  };

  if (!activePlan) {
    return (
      <Card className="p-12 text-center bg-gradient-to-br from-slate-50 to-white">
        <Flame className="w-14 h-14 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-700">{t('loadPanel.title')}</h3>
        <p className="text-sm text-slate-500 mt-2">{t('loadPanel.noPlanHint')}</p>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Activity className="w-14 h-14 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-700">{t('loadPanel.noData')}</h3>
        <p className="text-sm text-slate-500 mt-2">
          {t('loadPanel.noDataHint')}
        </p>
      </Card>
    );
  }

  const zone = stats ? acwrZone(stats.acwr) : null;

  // Configuración de series (para toggle de leyendas)
  const SERIES = [
    { key: 'carga', name: t('loadPanel.seriesCarga'), color: '#EF4444' },
    { key: 'vol', name: t('loadPanel.seriesVol'), color: '#84cc16' },
    { key: 'int', name: t('loadPanel.seriesInt'), color: '#F59E0B' },
    { key: 'acwr', name: 'ACWR', color: '#8B5CF6' },
  ];

  const renderChart = (height) => (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 4" stroke="rgba(148,163,184,0.15)" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: 'UA', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 2]} label={{ value: 'ACWR', angle: 90, position: 'insideRight', fontSize: 10, fill: '#94a3b8' }} />
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', fontSize: 11 }} formatter={(v, name) => [v, name]} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 6, cursor: 'pointer' }}
          iconType="circle"
          onClick={(e) => toggleSeries(e.dataKey || e.payload?.dataKey)}
          formatter={(value, entry) => {
            const off = hidden[entry?.dataKey];
            return <span style={{ color: off ? '#cbd5e1' : '#475569', textDecoration: off ? 'line-through' : 'none' }}>{value}</span>;
          }}
        />
        <ReferenceLine yAxisId="right" y={1.3} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1} />
        <ReferenceLine yAxisId="right" y={1.5} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1} />
        <Bar yAxisId="left" dataKey="carga" name={t('loadPanel.seriesCarga')} fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={42} fillOpacity={0.85} hide={!!hidden.carga} />
        <Bar yAxisId="left" dataKey="vol" name={t('loadPanel.seriesVol')} fill="#84cc16" radius={[6, 6, 0, 0]} maxBarSize={42} fillOpacity={0.55} hide={!!hidden.vol} />
        <Line yAxisId="left" type="monotone" dataKey="int" name={t('loadPanel.seriesInt')} stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} activeDot={{ r: 5 }} hide={!!hidden.int} />
        <Area yAxisId="right" type="monotone" dataKey="acwr" name="ACWR" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.12} strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6' }} hide={!!hidden.acwr} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  // ── Distribución por nivel (General/Macro/Etapa/Meso/Micro) ──
  const LEVELS = [
    { id: 'general', label: t('loadPanel.lvlGeneral', 'General') },
    { id: 'macro', label: t('loadPanel.lvlMacro', 'Macrociclo') },
    { id: 'fase', label: t('loadPanel.lvlPhase', 'Etapa') },
    { id: 'meso', label: t('loadPanel.lvlMeso', 'Mesociclo') },
    { id: 'micro', label: t('loadPanel.lvlMicro', 'Microciclo') },
  ].filter((l) => l.id !== 'fase' || data.some((d) => d.fase));

  const METRICS = [
    { id: 'carga', label: t('loadPanel.seriesCarga'), unit: 'UA', color: '#EF4444', agg: 'sum' },
    { id: 'vol', label: t('loadPanel.seriesVol'), unit: '', color: '#84cc16', agg: 'sum' },
    { id: 'int', label: t('loadPanel.seriesInt'), unit: '%', color: '#F59E0B', agg: 'avg' },
    { id: 'acwr', label: 'ACWR', unit: '', color: '#8B5CF6', agg: 'avg' },
  ];

  const breakdown = (() => {
    const m = METRICS.find((x) => x.id === metric);
    const keyOf = (d) => level === 'general' ? (t('loadPanel.lvlGeneral', 'General'))
      : level === 'macro' ? d.macro : level === 'fase' ? (d.fase || '—')
      : level === 'meso' ? d.meso : d.week;
    const groups = {};
    data.forEach((d) => {
      const k = keyOf(d);
      if (!groups[k]) groups[k] = { name: k, sum: 0, count: 0, weeks: 0 };
      groups[k].sum += (d[metric] || 0);
      groups[k].count += 1;
      groups[k].weeks += 1;
    });
    const arr = Object.values(groups).map((g) => ({
      name: g.name, weeks: g.weeks,
      value: m.agg === 'avg' ? +(g.sum / Math.max(g.count, 1)).toFixed(metric === 'acwr' ? 2 : 0) : Math.round(g.sum),
    }));
    const max = Math.max(...arr.map((a) => a.value), 1);
    return { arr, max, unit: m.unit, color: m.color };
  })();


  return (
    <div className="space-y-5" data-testid="load-panel" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      {/* Plan info banner — confirma de dónde se calcula la carga */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#CCFF00]/15 border border-[#CCFF00]/40 flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#CCFF00]" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">{t('loadPanel.bannerEyebrow')}</div>
            <div className="text-sm font-bold">{activePlan.name || t('loadPanel.planUnnamed')}</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px]">
          {activePlan.sport && <span><span className="text-slate-400">{t('loadPanel.sport')}</span> <strong className="capitalize">{activePlan.sport}</strong></span>}
          {activePlan.model_name && <span><span className="text-slate-400">{t('loadPanel.model')}</span> <strong>{activePlan.model_name}</strong></span>}
          <span><span className="text-slate-400">{t('loadPanel.weeks')}</span> <strong>{data.length}</strong></span>
        </div>
      </div>

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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('loadPanel.acuteLoad')}</span>
            </div>
            <div className="text-3xl font-black text-slate-900 leading-none">{stats.carga_aguda}</div>
            <div className="text-[10px] text-slate-400 mt-1">{t('loadPanel.uaLastWeek')}</div>
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('loadPanel.chronicLoad')}</span>
            </div>
            <div className="text-3xl font-black text-slate-900 leading-none">{stats.carga_cronica}</div>
            <div className="text-[10px] text-slate-400 mt-1">{t('loadPanel.uaAvg4w')}</div>
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('loadPanel.trendTitle')}</span>
            </div>
            <div className="text-2xl font-black text-slate-900 leading-none capitalize">{t(`loadPanel.trend_${stats.trend}`)}</div>
            <div className="text-[10px] text-slate-400 mt-1">{t('loadPanel.rpeAvg')} {stats.avgRPE}</div>
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
            <span>· {t('loadPanel.rangeOptimal')} <strong>0.8 — 1.3</strong></span>
            <span>· {t('loadPanel.rangeCaution')} <strong>1.3 — 1.5</strong></span>
            <span>· {t('loadPanel.rangeOverload')} <strong>&gt; 1.5</strong></span>
          </div>
        </div>
      </div>

      {/* Main chart: Magnitud de carga & recuperación + ACWR overlay */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800">{t('loadPanel.chartTitle')}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{data.length} {t('loadPanel.weeksUnit')}</span>
            <button onClick={() => setExpanded(true)} data-testid="load-chart-expand"
              title={t('loadPanel.expand', 'Ampliar')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors text-[11px] font-semibold">
              <Maximize2 className="w-3.5 h-3.5" /> {t('loadPanel.expand', 'Ampliar')}
            </button>
          </div>
        </div>
        <CardContent className="p-3">
          <p className="text-[10px] text-slate-400 mb-1 px-1">{t('loadPanel.legendHint', 'Toca una leyenda para mostrar u ocultar la serie.')}</p>
          {renderChart(300)}
        </CardContent>
      </Card>

      {/* Modal ampliado */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[95vw] w-[95vw] p-0 gap-0" data-testid="load-chart-modal">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-800">{t('loadPanel.chartTitle')} · {data.length} {t('loadPanel.weeksUnit')}</h3>
            </div>
            <button onClick={() => setExpanded(false)} className="text-slate-400 hover:text-slate-800" data-testid="load-chart-modal-close"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4">
            <p className="text-[11px] text-slate-400 mb-2">{t('loadPanel.legendHint', 'Toca una leyenda para mostrar u ocultar la serie.')}</p>
            {renderChart(Math.round(window.innerHeight * 0.62))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Distribución de carga por nivel */}
      <Card>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">{t('loadPanel.distTitle', 'Distribución de carga')}</h3>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Nivel */}
            <div className="flex rounded-lg overflow-hidden border border-slate-200" data-testid="dist-level-tabs">
              {LEVELS.map((l) => (
                <button key={l.id} onClick={() => setLevel(l.id)} data-testid={`dist-level-${l.id}`}
                  className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${level === l.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            {/* Métrica */}
            <div className="flex rounded-lg overflow-hidden border border-slate-200" data-testid="dist-metric-tabs">
              {METRICS.map((mm) => (
                <button key={mm.id} onClick={() => setMetric(mm.id)} data-testid={`dist-metric-${mm.id}`}
                  className="px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  style={metric === mm.id ? { background: mm.color, color: '#fff' } : { background: '#fff', color: '#64748b' }}>
                  {mm.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="space-y-2.5" data-testid="dist-rows">
            {breakdown.arr.map((g, i) => {
              const pct = Math.round((g.value / breakdown.max) * 100);
              return (
                <div key={g.name + i} className="flex items-center gap-3" data-testid={`dist-row-${i}`}>
                  <div className="w-36 text-[12px] font-bold text-slate-700 truncate" title={g.name}>{g.name}</div>
                  <div className="flex-1 h-9 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3 text-[12px] text-white font-bold"
                      style={{ width: `${Math.max(pct, 4)}%`, background: `linear-gradient(90deg, ${breakdown.color} 0%, ${breakdown.color}cc 100%)` }}>
                      {pct >= 14 ? `${g.value}${breakdown.unit ? ' ' + breakdown.unit : ''}` : ''}
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-[13px] font-black" style={{ color: breakdown.color }}>{g.value}{breakdown.unit ? ` ${breakdown.unit}` : ''}</span>
                    <div className="text-[9px] text-slate-400">{g.weeks} {t('loadPanel.semShort')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Footer summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3" data-testid="summary-total">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('loadPanel.total')}</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalCarga}</div>
          <div className="text-[10px] text-slate-500">{t('loadPanel.uaAccum')}</div>
        </Card>
        <Card className="p-3" data-testid="summary-peak">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('loadPanel.peak')}</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.peakWeek.carga}</div>
          <div className="text-[10px] text-slate-500">{stats.peakWeek.week} · {stats.peakWeek.meso}</div>
        </Card>
        <Card className="p-3" data-testid="summary-min">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('loadPanel.min')}</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.minWeek.carga}</div>
          <div className="text-[10px] text-slate-500">{stats.minWeek.week} · {t('loadPanel.discharge')}</div>
        </Card>
        <Card className="p-3" data-testid="summary-rpe">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('loadPanel.rpeAvg')}</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.avgRPE}</div>
          <div className="text-[10px] text-slate-500">{t('loadPanel.scale110')}</div>
        </Card>
      </div>
    </div>
  );
}

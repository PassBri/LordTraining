import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart
} from 'recharts';
import { Button } from './ui/button';
import {
  Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown,
  Shield, Zap, Heart, BarChart3, ArrowUpRight, ArrowDownRight,
  Info, ChevronDown, ChevronUp
} from 'lucide-react';

const BC = "'Barlow Condensed', sans-serif";

/* ═══ ACWR Calculator Engine ═══ */
const calculateACWR = (weeklyLoads, currentWeek) => {
  if (!weeklyLoads || weeklyLoads.length === 0) return null;
  
  const idx = Math.min(currentWeek, weeklyLoads.length) - 1;
  const acuteWindow = weeklyLoads.slice(Math.max(0, idx), idx + 1);
  const chronicWindow = weeklyLoads.slice(Math.max(0, idx - 3), idx + 1);
  
  const acuteLoad = acuteWindow.length > 0 ? acuteWindow.reduce((s, w) => s + w.load, 0) / acuteWindow.length : 0;
  const chronicLoad = chronicWindow.length > 0 ? chronicWindow.reduce((s, w) => s + w.load, 0) / chronicWindow.length : 0;
  
  return chronicLoad > 0 ? (acuteLoad / chronicLoad).toFixed(2) : 0;
};

const calculateMonotony = (dailyLoads) => {
  if (!dailyLoads || dailyLoads.length < 2) return 0;
  const mean = dailyLoads.reduce((s, v) => s + v, 0) / dailyLoads.length;
  const variance = dailyLoads.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / dailyLoads.length;
  const sd = Math.sqrt(variance);
  return sd > 0 ? (mean / sd).toFixed(2) : 0;
};

const calculateStrain = (weeklyLoad, monotony) => {
  return (weeklyLoad * monotony).toFixed(0);
};

const getACWRZone = (acwr) => {
  const v = parseFloat(acwr);
  if (v < 0.8) return { zone: 'undertraining', label: 'Baja Carga', color: '#3B82F6', bg: '#EFF6FF', icon: TrendingDown, risk: 'Desentrenamiento' };
  if (v <= 1.3) return { zone: 'optimal', label: 'Zona Optima', color: '#10B981', bg: '#D1FAE5', icon: CheckCircle, risk: 'Bajo Riesgo' };
  if (v <= 1.5) return { zone: 'caution', label: 'Precaucion', color: '#F59E0B', bg: '#FEF3C7', icon: AlertTriangle, risk: 'Riesgo Moderado' };
  return { zone: 'danger', label: 'Peligro', color: '#EF4444', bg: '#FEE2E2', icon: Zap, risk: 'Alto Riesgo Lesion' };
};

/* ═══ Sub-Components ═══ */

const GaugeRing = ({ value, max = 2, size = 120, label, sublabel }) => {
  const zone = getACWRZone(value);
  const pct = Math.min((parseFloat(value) / max) * 100, 100);
  const r = (size - 14) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (c * pct) / 100;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={zone.color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-black leading-none" style={{ fontFamily: BC, color: zone.color }}>{value}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">{label}</span>
        </div>
      </div>
      {sublabel && <span className="text-[11px] font-semibold mt-2" style={{ color: zone.color }}>{sublabel}</span>}
    </div>
  );
};

const MetricCard = ({ label, value, unit, color, icon: Icon, trend, trendValue, small }) => (
  <div className={`bg-white rounded-xl border border-slate-200 ${small ? 'p-3' : 'p-4'}`}>
    <div className="flex items-center justify-between mb-1">
      <span className={`${small ? 'text-[10px]' : 'text-[11px]'} font-medium text-slate-400 uppercase tracking-wide`}>{label}</span>
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: color || '#94a3b8' }} />}
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className={`${small ? 'text-xl' : 'text-2xl'} font-black leading-none`} style={{ fontFamily: BC, color: color || '#0f172a' }}>{value}</span>
      {unit && <span className="text-[11px] text-slate-400">{unit}</span>}
    </div>
    {trend && (
      <div className={`flex items-center gap-0.5 mt-1.5 text-[10px] font-semibold ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trendValue}
      </div>
    )}
  </div>
);

const ZoneBand = ({ zone }) => {
  const cfg = getACWRZone(zone === 'optimal' ? 1.0 : zone === 'caution' ? 1.4 : zone === 'danger' ? 1.6 : 0.5);
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: cfg.bg }}>
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
      <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
};

/* ═══ MAIN DASHBOARD ═══ */
const LoadMetricsDashboard = ({ activePlan }) => {
  const [expandedSection, setExpandedSection] = useState('overview');

  // Generate weekly load data from plan macrocycles
  const weeklyData = useMemo(() => {
    if (!activePlan?.macrocycles) return [];
    
    const weeks = [];
    let weekNum = 1;
    
    activePlan.macrocycles.forEach(macro => {
      const vol = macro.volume_percent || macro.phase?.volumePercent || 50;
      const inten = macro.intensity_percent || macro.phase?.intensityPercent || 50;
      
      macro.mesocycles?.forEach(meso => {
        const loadFactor = meso.type?.loadFactor || 0.7;
        
        meso.microcycles?.forEach(micro => {
          const sessions = micro.sessions || [];
          const sessionLoads = sessions.map(s => {
            const dur = s.duration || 60;
            const rpe = s.rpe || 6;
            return dur * rpe;
          });
          
          const totalLoad = sessionLoads.length > 0 ? sessionLoads.reduce((a, b) => a + b, 0) : Math.round(vol * loadFactor * 5);
          const monotony = parseFloat(calculateMonotony(sessionLoads.length > 0 ? sessionLoads : [totalLoad / 5, totalLoad / 5 * 1.1, totalLoad / 5 * 0.9, totalLoad / 5 * 1.2, totalLoad / 5 * 0.8]));
          const strain = parseFloat(calculateStrain(totalLoad, monotony));
          
          weeks.push({
            week: weekNum,
            semana: `S${weekNum}`,
            load: totalLoad,
            volume: Math.round(vol * loadFactor),
            intensity: inten,
            monotony,
            strain,
            sessions: sessions.length,
            phase: macro.phase?.name || '-',
            phaseColor: macro.phase?.color || '#94a3b8',
            mesoType: meso.type?.name || '-',
            microType: micro.type?.name || '-',
          });
          weekNum++;
        });
      });
    });
    
    // Calculate ACWR for each week
    return weeks.map((w, idx) => {
      const acute = w.load;
      const chronicSlice = weeks.slice(Math.max(0, idx - 3), idx + 1);
      const chronic = chronicSlice.length > 0 ? chronicSlice.reduce((s, x) => s + x.load, 0) / chronicSlice.length : acute;
      const acwr = chronic > 0 ? parseFloat((acute / chronic).toFixed(2)) : 1.0;
      const zone = getACWRZone(acwr);
      return { ...w, acwr, acwrZone: zone.zone, acwrColor: zone.color };
    });
  }, [activePlan]);

  const currentWeek = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1] : null;
  const prevWeek = weeklyData.length > 1 ? weeklyData[weeklyData.length - 2] : null;
  
  const currentACWR = currentWeek?.acwr || 1.0;
  const currentZone = getACWRZone(currentACWR);
  const avgLoad = weeklyData.length > 0 ? Math.round(weeklyData.reduce((s, w) => s + w.load, 0) / weeklyData.length) : 0;
  const maxLoad = weeklyData.length > 0 ? Math.max(...weeklyData.map(w => w.load)) : 0;
  const avgMonotony = weeklyData.length > 0 ? (weeklyData.reduce((s, w) => s + w.monotony, 0) / weeklyData.length).toFixed(1) : 0;
  const avgStrain = weeklyData.length > 0 ? Math.round(weeklyData.reduce((s, w) => s + w.strain, 0) / weeklyData.length) : 0;
  const loadTrend = currentWeek && prevWeek ? ((currentWeek.load - prevWeek.load) / prevWeek.load * 100).toFixed(0) : 0;

  // Risk alerts
  const alerts = [];
  if (parseFloat(currentACWR) > 1.5) alerts.push({ type: 'danger', msg: 'ACWR en zona de peligro — riesgo alto de lesion' });
  if (parseFloat(currentACWR) > 1.3) alerts.push({ type: 'warning', msg: 'ACWR elevado — reducir carga aguda recomendado' });
  if (parseFloat(avgMonotony) > 2.0) alerts.push({ type: 'warning', msg: 'Monotonia alta — aumentar variabilidad de carga' });
  if (avgStrain > 6000) alerts.push({ type: 'warning', msg: 'Strain elevado — considerar semana de descarga' });
  const weeksInDanger = weeklyData.filter(w => w.acwrZone === 'danger').length;
  if (weeksInDanger > 2) alerts.push({ type: 'danger', msg: `${weeksInDanger} semanas en zona de peligro` });

  if (!activePlan || weeklyData.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-500 mb-1">Sin datos de carga</h3>
        <p className="text-sm text-slate-400">Crea un plan con sesiones para ver las metricas</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    const zone = getACWRZone(d.acwr);
    return (
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[180px]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-800 text-[13px]">{d.semana}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: zone.color, backgroundColor: zone.bg }}>{zone.label}</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between"><span className="text-slate-400">Carga</span><span className="font-bold text-slate-700">{d.load} UA</span></div>
          <div className="flex justify-between"><span className="text-slate-400">ACWR</span><span className="font-bold" style={{ color: zone.color }}>{d.acwr}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Monotonia</span><span className="font-bold text-slate-700">{d.monotony}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Strain</span><span className="font-bold text-slate-700">{d.strain}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Fase</span><span className="font-semibold text-slate-600">{d.phase}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5" data-testid="load-metrics-dashboard">
      {/* ═══ Header Banner ═══ */}
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden" data-testid="acwr-header">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>
        <div className="relative z-10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: currentZone.color + '20' }}>
                  <Activity className="w-4 h-4" style={{ color: currentZone.color }} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: BC, color: currentZone.color }}>
                  Metricas de Carga
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: BC }}>{activePlan?.name || 'Plan'}</h2>
              <p className="text-slate-400 text-sm">{weeklyData.length} semanas analizadas</p>
            </div>

            <div className="flex items-center gap-6">
              <GaugeRing value={currentACWR} label="ACWR" sublabel={currentZone.label} />
            </div>
          </div>

          {/* Alert strip */}
          {alerts.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {alerts.slice(0, 3).map((alert, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium ${alert.type === 'danger' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>
                  {alert.type === 'danger' ? <Zap className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
                  {alert.msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" data-testid="kpi-cards">
        <MetricCard label="ACWR" value={currentACWR} icon={Shield} color={currentZone.color} trend={parseFloat(currentACWR) > 1.3 ? 'up' : 'down'} trendValue={currentZone.risk} />
        <MetricCard label="Carga Semanal" value={currentWeek?.load || 0} unit="UA" icon={BarChart3} color="#3B82F6" trend={loadTrend > 0 ? 'up' : 'down'} trendValue={`${loadTrend}%`} />
        <MetricCard label="Monotonia" value={avgMonotony} icon={Activity} color={parseFloat(avgMonotony) > 2 ? '#F59E0B' : '#10B981'} />
        <MetricCard label="Strain" value={avgStrain} unit="UA" icon={Heart} color={avgStrain > 6000 ? '#EF4444' : '#10B981'} />
        <MetricCard label="Carga Media" value={avgLoad} unit="UA" icon={TrendingUp} color="#8B5CF6" />
        <MetricCard label="Carga Pico" value={maxLoad} unit="UA" icon={Zap} color="#EF4444" />
      </div>

      {/* ═══ Zone Guide ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4" data-testid="zone-guide">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400" /> Zonas ACWR
          </h3>
          <div className="flex gap-2">
            {[
              { range: '< 0.80', ...getACWRZone(0.5) },
              { range: '0.80 - 1.30', ...getACWRZone(1.0) },
              { range: '1.30 - 1.50', ...getACWRZone(1.4) },
              { range: '> 1.50', ...getACWRZone(1.6) },
            ].map((z, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold" style={{ color: z.color, backgroundColor: z.bg }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: z.color }} />
                {z.range} {z.label}
              </div>
            ))}
          </div>
        </div>
        {/* Current position indicator */}
        <div className="relative h-3 rounded-full overflow-hidden flex">
          <div className="flex-[0.8] bg-blue-100" />
          <div className="flex-[0.5] bg-emerald-100" />
          <div className="flex-[0.2] bg-amber-100" />
          <div className="flex-[0.5] bg-red-100" />
          <div className="absolute top-0 bottom-0 w-0.5 bg-slate-900 transition-all" style={{ left: `${Math.min((parseFloat(currentACWR) / 2) * 100, 100)}%` }}>
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 bg-white" />
          </div>
        </div>
        <div className="flex text-[9px] text-slate-400 mt-1">
          <span className="flex-[0.8] text-center">Baja Carga</span>
          <span className="flex-[0.5] text-center font-semibold text-emerald-500">Optima</span>
          <span className="flex-[0.2] text-center">Precaucion</span>
          <span className="flex-[0.5] text-center">Peligro</span>
        </div>
      </div>

      {/* ═══ ACWR Timeline Chart ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="acwr-chart">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" /> ACWR Timeline
          </h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[#3B82F6]" /> Carga</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-slate-800" /> ACWR</span>
          </div>
        </div>
        <div className="p-5">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyData}>
                <defs>
                  <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis yAxisId="load" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis yAxisId="acwr" orientation="right" domain={[0, 2.5]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine yAxisId="acwr" y={0.8} stroke="#3B82F6" strokeDasharray="4 4" strokeWidth={1} />
                <ReferenceLine yAxisId="acwr" y={1.3} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1} />
                <ReferenceLine yAxisId="acwr" y={1.5} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1} />
                <Area yAxisId="load" type="monotone" dataKey="load" fill="url(#loadGrad)" stroke="#3B82F6" strokeWidth={2} name="Carga" />
                <Line yAxisId="acwr" type="monotone" dataKey="acwr" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 3, fill: '#0f172a' }} name="ACWR" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ Monotony & Strain Chart ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="monotony-chart">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" /> Monotonia Semanal
            </h3>
            <p className="text-[10px] text-slate-400">Optimo &lt; 2.0 — Alto variabilidad = menor riesgo</p>
          </div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis domain={[0, 4]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={2.0} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Limite', fontSize: 9, fill: '#F59E0B' }} />
                <Bar dataKey="monotony" fill="#F59E0B" radius={[3, 3, 0, 0]} name="Monotonia" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="strain-chart">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" /> Strain Semanal
            </h3>
            <p className="text-[10px] text-slate-400">Carga x Monotonia — Indicador de estres acumulado</p>
          </div>
          <div className="p-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="strainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="strain" fill="url(#strainGrad)" stroke="#EF4444" strokeWidth={2} name="Strain" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ═══ Weekly Breakdown Table ═══ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="weekly-breakdown">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-slate-700">Desglose Semanal</h3>
          <span className="text-[10px] text-slate-400">{weeklyData.length} semanas</span>
        </div>
        <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                {['Sem', 'Fase', 'Carga', 'ACWR', 'Zona', 'Monotonia', 'Strain', 'Ses'].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyData.map((w, i) => {
                const zone = getACWRZone(w.acwr);
                return (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-[12px] font-bold text-slate-700">{w.semana}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: w.phaseColor }} />
                        <span className="text-[11px] text-slate-600">{w.phase}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-bold text-slate-800">{w.load} UA</td>
                    <td className="px-3 py-2">
                      <span className="text-[12px] font-black" style={{ fontFamily: BC, color: zone.color }}>{w.acwr}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: zone.color, backgroundColor: zone.bg }}>{zone.label}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <span className={`font-semibold ${w.monotony > 2 ? 'text-amber-500' : 'text-slate-600'}`}>{w.monotony}</span>
                    </td>
                    <td className="px-3 py-2 text-[11px] font-semibold text-slate-600">{w.strain}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-400">{w.sessions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LoadMetricsDashboard;

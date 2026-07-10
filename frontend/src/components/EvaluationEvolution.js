import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  TrendingUp, Heart, Dumbbell, Target, Layers, Brain, BookOpen, Activity, Ruler,
  Loader2, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import InteractiveChart from './InteractiveChart';

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const TYPE_META = {
  medical:        { title: 'Médico',         color: '#EF4444', icon: Heart },
  anthropometric: { title: 'Antropometría',  color: '#06B6D4', icon: Ruler },
  physical:       { title: 'Físico',         color: '#D4AF37', icon: Dumbbell },
  biomechanical:  { title: 'Biomecánica',    color: '#10B981', icon: Activity },
  technical:      { title: 'Técnico',        color: '#8B5CF6', icon: Target },
  tactical:       { title: 'Táctico',        color: '#F59E0B', icon: Layers },
  psychological:  { title: 'Psicológico',    color: '#EC4899', icon: Brain },
  theoretical:    { title: 'Teórico',        color: '#14B8A6', icon: BookOpen },
};

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const EvaluationEvolution = ({ activePlan, athletes = [], selectedAthleteId }) => {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(new Set());

  const fetchTimeline = async () => {
    if (!activePlan) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const url = `${API_URL}/api/plan-data/evaluations-export/timeline/${activePlan.id}` +
        (selectedAthleteId ? `?athlete_id=${selectedAthleteId}` : '');
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setControls(d.controls || []);
    } catch { toast.error('Error cargando evolución'); }
    setLoading(false);
  };

  useEffect(() => {
    fetchTimeline();
    const handler = (e) => { if (e?.detail?.plan_id === activePlan?.id) fetchTimeline(); };
    window.addEventListener('lordtraining:evaluation-saved', handler);
    return () => window.removeEventListener('lordtraining:evaluation-saved', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlan?.id, selectedAthleteId]);

  const byType = useMemo(() => {
    const out = {};
    Object.keys(TYPE_META).forEach(k => { out[k] = []; });
    controls.forEach(c => {
      if (out[c.evaluation_type]) {
        out[c.evaluation_type].push({
          date: c.date, dateLabel: fmtDate(c.date), pct: c.global_pct, title: c.title || ''
        });
      }
    });
    Object.keys(out).forEach(k => out[k].sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    return out;
  }, [controls]);

  // Combined timeline data — one row per unique date with all 8 types as keys
  const combined = useMemo(() => {
    const dateMap = {};
    Object.entries(byType).forEach(([type, arr]) => {
      arr.forEach(p => {
        const key = p.date;
        if (!dateMap[key]) dateMap[key] = { date: key, semana: p.dateLabel };
        dateMap[key][type] = p.pct;
      });
    });
    return Object.values(dateMap).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [byType]);

  const totalControls = controls.length;
  const typesWithData = Object.entries(byType).filter(([_, arr]) => arr.length > 0);

  // dataKeys solo de tipos visibles y con datos
  const visibleDataKeys = useMemo(() => {
    return Object.entries(TYPE_META)
      .filter(([type]) => byType[type]?.length > 0 && !hidden.has(type))
      .map(([type, meta]) => ({ key: type, name: meta.title, color: meta.color }));
  }, [byType, hidden]);

  const toggleType = (type) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const metricsByType = useMemo(() => {
    const out = {};
    Object.entries(byType).forEach(([type, arr]) => {
      if (!arr.length) return;
      const last = arr[arr.length - 1].pct;
      const first = arr[0].pct;
      const avg = arr.reduce((acc, p) => acc + p.pct, 0) / arr.length;
      const best = Math.max(...arr.map(p => p.pct));
      const trend = last - first;
      out[type] = { count: arr.length, last, first, avg, best, trend };
    });
    return out;
  }, [byType]);

  if (!activePlan) {
    return <div className="p-6 text-center text-slate-500"><TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-2" /><p>Selecciona un plan para ver la evolución</p></div>;
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]" data-testid="eval-evolution">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-violet-500 to-[#D4AF37]">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Evolución de Controles</h2>
          <p className="text-xs text-slate-500">% global de cada tipo de control a lo largo del macrociclo · estilo trading</p>
        </div>
        <Badge variant="outline">{totalControls} controles totales</Badge>
        <Badge variant="outline">{typesWithData.length} de 8 tipos con datos</Badge>
      </div>

      {loading && <div className="text-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /></div>}

      {!loading && totalControls === 0 && (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-semibold">Aún no hay controles registrados</p>
            <p className="text-xs text-slate-400 mt-1">Guarda controles desde cualquier sub-sección para ver su evolución aquí.</p>
          </CardContent>
        </Card>
      )}

      {!loading && totalControls > 0 && (
        <>
          {/* Trading-style chart */}
          <InteractiveChart
            title="Evolución global · % normalizado por tipo de control"
            icon={TrendingUp}
            data={combined}
            dataKeys={visibleDataKeys}
            xAxisKey="semana"
            xAxisLabel="Fecha"
            height={380}
            showBrush={combined.length > 4}
            showControls={true}
            showTimeRange={false}
            showLiveIndicator={false}
            defaultChartType="line"
            yAxisDomain={[0, 100]}
            referenceLines={[
              { y: 80, label: 'Excelente · 80%', color: '#10B981' },
              { y: 50, label: 'Aceptable · 50%', color: '#F59E0B' }
            ]}
          />

          {/* Per-type cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="eval-evolution-type-cards">
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const m = metricsByType[type];
              const isHidden = hidden.has(type);
              const Icon = meta.icon;
              if (!m) return (
                <Card key={type} className="border-0 shadow-sm opacity-50" data-testid={`eval-evolution-type-${type}-empty`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}20` }}>
                      <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">{meta.title}</p>
                      <p className="text-xs text-slate-400">Sin datos</p>
                    </div>
                  </CardContent>
                </Card>
              );
              const trendColor = m.trend > 5 ? '#10B981' : m.trend < -5 ? '#EF4444' : '#94a3b8';
              const trendArrow = m.trend > 5 ? '▲' : m.trend < -5 ? '▼' : '●';
              return (
                <Card key={type} className={`border-0 shadow-sm transition cursor-pointer hover:shadow-md ${isHidden ? 'opacity-40' : ''}`}
                  onClick={() => toggleType(type)} data-testid={`eval-evolution-type-${type}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: meta.color }}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{meta.title}</p>
                        <p className="text-[10px] text-slate-500">{m.count} control{m.count === 1 ? '' : 'es'}</p>
                      </div>
                      {isHidden ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Último</p>
                        <p className="text-base font-extrabold tabular-nums" style={{ color: meta.color }}>{m.last}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Promedio</p>
                        <p className="text-base font-extrabold tabular-nums text-slate-700">{m.avg.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Tendencia</p>
                        <p className="text-base font-extrabold tabular-nums" style={{ color: trendColor }}>
                          {trendArrow} {Math.abs(m.trend).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500 text-center italic">
            💡 Click en una tarjeta para ocultar/mostrar esa serie · Usa los controles del gráfico para zoom, fullscreen, cambiar tipo (línea/área/barra) y crosshair
          </p>
        </>
      )}
    </div>
  );
};

export default EvaluationEvolution;

// Mini chart per-section: usa InteractiveChart con un solo dataKey
export const EvaluationMiniChart = ({ controls, color, type }) => {
  const data = useMemo(() => {
    return (controls || [])
      .filter(c => c.evaluation_type === type || !c.evaluation_type)
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(c => ({
        date: c.date, semana: fmtDate(c.date),
        cumplimiento: c.global_pct, title: c.title || ''
      }));
  }, [controls, type]);

  if (data.length < 2) return null;

  const last = data[data.length - 1].cumplimiento;
  const first = data[0].cumplimiento;
  const trend = last - first;
  const trendBadge = trend > 5 ? 'text-emerald-600' : trend < -5 ? 'text-red-500' : 'text-slate-400';

  return (
    <div data-testid={`eval-${type}-mini-evolution`}>
      <InteractiveChart
        title={
          <span className="flex items-center gap-2">
            <span>Evolución de este control</span>
            <span className="text-xs text-slate-500 font-normal">{data.length} mediciones</span>
            <span className="text-xs font-normal text-slate-500">· Inicial:</span>
            <span className="text-xs font-bold">{first}%</span>
            <span className="text-xs text-slate-300">→</span>
            <span className="text-xs font-normal text-slate-500">Actual:</span>
            <span className="text-xs font-bold" style={{ color }}>{last}%</span>
            <span className={`text-xs font-bold ${trendBadge}`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(0)}%
            </span>
          </span>
        }
        icon={TrendingUp}
        data={data}
        dataKeys={[{ key: 'cumplimiento', name: 'Cumplimiento %', color }]}
        xAxisKey="semana"
        xAxisLabel="Fecha"
        height={220}
        showBrush={data.length > 4}
        showControls={true}
        showTimeRange={false}
        defaultChartType="area"
        yAxisDomain={[0, 100]}
        referenceLines={[
          { y: 80, label: 'Excelente', color: '#10B981' },
          { y: 50, label: 'Aceptable', color: '#F59E0B' }
        ]}
      />
    </div>
  );
};

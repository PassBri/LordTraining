import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  Activity, BarChart3, Target, Clipboard, TrendingUp, 
  ChevronRight, Zap, BookOpen, Layers,
  Calendar, AlertTriangle, CheckCircle, ArrowRight,
  Brain, Dumbbell, Gauge
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import PeriodizationComplete from './PeriodizationComplete';
import TestEvaluations from './TestEvaluations';
import TrainingLoad from './TrainingLoad';
import TrainingControl from './TrainingControl';
import LoadMetricsDashboard from './LoadMetricsDashboard';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const BC = "'Barlow Condensed', sans-serif";

const TrainingSystemHub = ({ athleteId, athleteName, onNavigate, activePlan, hideTabBar = false }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [systemData, setSystemData] = useState({
    periodization: null, tests: [], load: null, control: null
  });

  const fetchSystemData = async () => {
    if (activePlan) {
      setSystemData({
        periodization: activePlan.macrocycles?.[0] || null,
        tests: [], load: null, control: null
      });
      return;
    }
    if (!athleteId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const periodRes = await fetch(`${API_URL}/api/periodization/${athleteId}`, { headers });
      const periodData = periodRes.ok ? await periodRes.json() : null;
      const testsRes = await fetch(`${API_URL}/api/test-evaluations/${athleteId}`, { headers });
      const testsData = testsRes.ok ? await testsRes.json() : { evaluations: [] };
      const loadRes = await fetch(`${API_URL}/api/training-load/${athleteId}`, { headers });
      const loadData = loadRes.ok ? await loadRes.json() : null;
      setSystemData({ periodization: periodData, tests: testsData.evaluations || [], load: loadData, control: null });
    } catch (error) {
      console.error('Error fetching system data:', error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSystemData(); }, [athleteId]);

  const health = {
    periodization: systemData.periodization ? 100 : 0,
    tests: systemData.tests.length > 0 ? Math.min(systemData.tests.length * 20, 100) : 0,
    load: systemData.load ? 80 : 0,
    get overall() { return Math.round((this.periodization + this.tests + this.load) / 3); }
  };

  /* ── Mini periodization bar visual ── */
  const WaveBar = ({ count = 20, h = 'h-12' }) => {
    const bars = Array.from({ length: count }, (_, i) => {
      const p = (i / count) * Math.PI * 2;
      return Math.max(15, Math.min(95, 30 + Math.sin(p) * 25 + Math.cos(p * 1.5) * 20));
    });
    return (
      <div className={`flex items-end gap-[2px] ${h} w-full`}>
        {bars.map((v, i) => (
          <div key={i} className="flex-1 rounded-t-sm transition-all" style={{
            height: `${v}%`,
            background: i % 4 === 0 ? '#007AFF' : i % 4 === 1 ? '#CCFF00' : i % 4 === 2 ? '#1e293b' : '#475569',
            opacity: 0.6 + (v / 200),
          }} />
        ))}
      </div>
    );
  };

  /* ── Circular gauge ── */
  const CircleGauge = ({ value, size = 72, color = '#007AFF', label }) => {
    const r = (size - 8) / 2, c = Math.PI * 2 * r, off = c - (c * value) / 100;
    return (
      <div className="relative flex flex-col items-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-white leading-none" style={{ fontFamily: BC }}>{value}%</span>
        </div>
        {label && <span className="text-[10px] text-slate-400 mt-1 font-medium">{label}</span>}
      </div>
    );
  };

  /* ══════ OVERVIEW ══════ */
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden" data-testid="system-overview-banner">
        <div className="absolute inset-0 opacity-[0.08]">
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>
        <div className="relative z-10 p-7">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-[#CCFF00] rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-slate-900" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#CCFF00]" style={{ fontFamily: BC }}>
                  {t('dashboard.sections.periodization')}
                </span>
              </div>
              {activePlan ? (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: BC }}>{activePlan.name}</h2>
                  <p className="text-slate-400 text-sm">
                    {activePlan.total_weeks || activePlan.totalWeeks} sem &middot; {activePlan.model_name || activePlan.model}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: BC }}>Sistema de Entrenamiento</h2>
                  <p className="text-slate-400 text-sm">Selecciona un plan para comenzar</p>
                </>
              )}

              <div className="flex gap-5 mt-5">
                {[
                  { v: systemData.periodization?.mesocycles?.length || activePlan?.macrocycles?.reduce((s, m) => s + (m.mesocycles?.length || 0), 0) || 0, l: 'Mesociclos', c: '#007AFF' },
                  { v: systemData.tests.length, l: 'Evaluaciones', c: '#10B981' },
                  { v: systemData.periodization?.config?.sessionsPerWeek || activePlan?.sessions_per_week || 0, l: 'Ses/Sem', c: '#F59E0B' },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="text-2xl font-black text-white leading-none" style={{ fontFamily: BC }}>{s.v}</div>
                    <div className="text-[10px] font-medium mt-1" style={{ color: s.c }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <CircleGauge value={health.overall} label="Completitud" />
              <div className="hidden lg:block w-48 opacity-60">
                <WaveBar count={24} h="h-14" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'periodization', icon: BookOpen, label: 'Modelos de Periodizacion', sub: 'Estructura del plan', pct: health.periodization, color: '#007AFF', accentBg: 'bg-blue-50', accentText: 'text-blue-600' },
          { key: 'tests', icon: Clipboard, label: 'Tests y Evaluaciones', sub: `${systemData.tests.length} tests`, pct: health.tests, color: '#10B981', accentBg: 'bg-emerald-50', accentText: 'text-emerald-600' },
          { key: 'load', icon: BarChart3, label: 'Carga de Entrenamiento', sub: 'Volumen, intensidad', pct: health.load, color: '#F59E0B', accentBg: 'bg-amber-50', accentText: 'text-amber-600' },
          { key: 'control', icon: TrendingUp, label: 'Control de Rendimiento', sub: 'Seguimiento y ajustes', pct: Math.round((health.tests + health.load) / 2), color: '#EF4444', accentBg: 'bg-rose-50', accentText: 'text-rose-600' },
        ].map((mod) => (
          <button
            key={mod.key}
            onClick={() => setActiveTab(mod.key)}
            className="group bg-white rounded-xl border border-slate-200 p-5 text-left transition-all duration-200 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5"
            data-testid={`module-card-${mod.key}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${mod.accentBg} rounded-xl flex items-center justify-center`}>
                <mod.icon className={`w-5 h-5 ${mod.accentText}`} />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm mb-0.5">{mod.label}</h3>
            <p className="text-[12px] text-slate-400 mb-3">{mod.sub}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${mod.pct}%`, backgroundColor: mod.color }} />
              </div>
              <span className="text-[11px] font-bold text-slate-500">{mod.pct}%</span>
            </div>
          </button>
        ))}
      </div>

      {/* Workflow Pipeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6" data-testid="workflow-pipeline">
        <h3 className="text-sm font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          Flujo del Sistema
        </h3>
        <div className="flex flex-wrap items-start justify-between gap-3">
          {[
            { icon: BookOpen, n: '01', label: 'Modelo', desc: 'Seleccionar periodizacion', color: '#007AFF' },
            { icon: Layers, n: '02', label: 'Estructura', desc: 'Macro > Meso > Micro', color: '#8B5CF6' },
            { icon: Clipboard, n: '03', label: 'Evaluacion', desc: 'Tests de control', color: '#10B981' },
            { icon: BarChart3, n: '04', label: 'Carga', desc: 'Volumen e intensidad', color: '#F59E0B' },
            { icon: TrendingUp, n: '05', label: 'Control', desc: 'Monitorear y ajustar', color: '#EF4444' },
            { icon: Target, n: '06', label: 'Plan Grafico', desc: 'Visualizacion final', color: '#007AFF' },
          ].map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center text-center w-[110px]">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-2" style={{ background: `${step.color}12` }}>
                  <step.icon className="w-5 h-5" style={{ color: step.color }} />
                </div>
                <span className="text-[13px] font-semibold text-slate-800">{step.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{step.desc}</span>
              </div>
              {idx < 5 && <ArrowRight className="w-4 h-4 text-slate-200 mt-5 hidden md:block flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* System Status / CTA */}
      {systemData.periodization && (
        <div className="bg-white rounded-xl border border-emerald-200 p-5" data-testid="system-status">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Sistema Configurado</h3>
              <p className="text-[12px] text-slate-500">Datos conectados — listo para visualizar</p>
            </div>
          </div>
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-10 text-[13px] font-semibold w-full"
            onClick={() => onNavigate && onNavigate('graphic-plan')}
          >
            <Target className="w-4 h-4 mr-2" /> Ver Plan Grafico Completo
          </Button>
        </div>
      )}

      {!activePlan && !athleteId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Selecciona un Plan</h3>
            <p className="text-[12px] text-slate-500">Ve a Datos → Mis Planes para configurar el sistema.</p>
          </div>
        </div>
      )}
    </div>
  );

  /* ══════ RENDER ══════ */
  if (hideTabBar) {
    return (
      <div className="h-full overflow-auto" data-testid="training-system-hub">
        <div className="p-6">{renderOverview()}</div>
      </div>
    );
  }

  /* ══════ TABS ══════ */
  const tabItems = [
    { value: 'overview', icon: Gauge, label: 'Resumen' },
    { value: 'periodization', icon: BookOpen, label: 'Periodizacion' },
    { value: 'tests', icon: Clipboard, label: 'Evaluaciones' },
    { value: 'load', icon: BarChart3, label: 'Carga' },
    { value: 'control', icon: TrendingUp, label: 'Control' },
  ];

  return (
    <div className="h-full overflow-auto" data-testid="training-system-hub">
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl h-auto w-fit" data-testid="system-tabs">
            {tabItems.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500 transition-all"
                data-testid={`tab-${tab.value}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-0">{renderOverview()}</TabsContent>
          <TabsContent value="periodization" className="mt-0">
            <PeriodizationComplete athleteId={athleteId} athleteName={athleteName} onNavigate={onNavigate} activePlan={activePlan} />
          </TabsContent>
          <TabsContent value="tests" className="mt-0"><TestEvaluations athleteId={athleteId} /></TabsContent>
          <TabsContent value="load" className="mt-0"><LoadMetricsDashboard activePlan={activePlan} /></TabsContent>
          <TabsContent value="control" className="mt-0"><TrainingControl athleteId={athleteId} athleteName={athleteName} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TrainingSystemHub;

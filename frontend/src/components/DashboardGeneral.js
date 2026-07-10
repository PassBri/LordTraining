import React, { useEffect, memo } from 'react';
import usePlanStore from '../stores/planStore';
import PeriodizationChart from './charts/PeriodizationChart';
import ACWRChart from './charts/ACWRChart';
import CapacidadRadarChart from './charts/CapacidadRadarChart';
import HeatmapChart from './charts/HeatmapChart';
import ProgresionCapacidadChart from './charts/ProgresionCapacidadChart';
import GanttPlanChart from './charts/GanttPlanChart';
import { Activity, Layers, Calendar, Zap, TrendingUp, AlertCircle } from 'lucide-react';

const BC = "'Barlow Condensed', sans-serif";
const DM = "'DM Sans', sans-serif";

const StatCard = memo(({ value, label, color, icon: Icon }) => (
  <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3" data-testid={`stat-${label}`}>
    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: color + '15' }}>
      <Icon className="w-4.5 h-4.5" style={{ color }} />
    </div>
    <div>
      <div className="text-lg font-black text-slate-800 leading-none" style={{ fontFamily: BC }}>{value}</div>
      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</div>
    </div>
  </div>
));

const DashboardGeneral = memo(function DashboardGeneral({ planId, onBack }) {
  const plan = usePlanStore(s => s.plan);
  const macrociclos = usePlanStore(s => s.macrociclos);
  const mesociclos = usePlanStore(s => s.mesociclos);
  const microciclos = usePlanStore(s => s.microciclos);
  const sesiones = usePlanStore(s => s.sesiones);
  const alertas = usePlanStore(s => s.alertas);
  const metricas = usePlanStore(s => s.metricas);
  const loading = usePlanStore(s => s.loading);
  const cargarPlan = usePlanStore(s => s.cargarPlanCompleto);
  const syncFromV1 = usePlanStore(s => s.syncFromV1);

  useEffect(() => {
    if (planId) {
      syncFromV1(planId).then(result => {
        if (result?.plan_id) cargarPlan(result.plan_id);
      });
    }
  }, [planId]);

  if (loading && !plan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-16 text-slate-400" data-testid="no-plan">
        <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-sm">Selecciona un plan para ver el dashboard de graficas</p>
      </div>
    );
  }

  const totalSesiones = metricas.total_sesiones || sesiones.length;
  const tonelaje = metricas.tonelaje_global_kg || 0;
  const progreso = Math.round(metricas.progreso_global || 0);
  const alertasActivas = alertas.filter(a => a.severidad === 'error').length;

  return (
    <div className="space-y-4" data-testid="dashboard-general">
      {/* HEADER */}
      <div className="bg-slate-900 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              {onBack && (
                <button onClick={onBack} className="text-[11px] text-slate-400 hover:text-white mb-2 flex items-center gap-1">
                  ← Volver
                </button>
              )}
              <h2 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: BC }}>{plan.nombre}</h2>
              <p className="text-slate-400 text-[12px] mt-0.5">{plan.modelo_periodizacion?.toUpperCase()} · {plan.deporte} · {plan.duracion_semanas} semanas</p>
            </div>
            {alertasActivas > 0 && (
              <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-[11px] font-bold text-red-300">{alertasActivas} alertas criticas</span>
              </div>
            )}
          </div>
          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            <StatCard value={macrociclos.length} label="Macrociclos" color="#3B82F6" icon={Layers} />
            <StatCard value={mesociclos.length} label="Mesociclos" color="#8B5CF6" icon={Activity} />
            <StatCard value={microciclos.length} label="Semanas" color="#10B981" icon={Calendar} />
            <StatCard value={totalSesiones} label="Sesiones" color="#F59E0B" icon={Zap} />
            <StatCard value={tonelaje > 1000 ? `${(tonelaje / 1000).toFixed(1)}t` : `${Math.round(tonelaje)}kg`} label="Tonelaje" color="#EF4444" icon={TrendingUp} />
            <StatCard value={`${progreso}%`} label="Progreso" color="#0891B2" icon={Activity} />
          </div>
        </div>
      </div>

      {/* GANTT (full width) */}
      <GanttPlanChart />

      {/* PERIODIZACION + ACWR (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PeriodizationChart />
        <ACWRChart />
      </div>

      {/* RADAR + HEATMAP (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CapacidadRadarChart />
        <HeatmapChart />
      </div>

      {/* PROGRESION (full width) */}
      <ProgresionCapacidadChart />

      {/* ALERTAS */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="alertas-panel">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-100">
            <span className="text-[13px] font-bold text-slate-800" style={{ fontFamily: DM }}>Alertas del Motor de Cascada</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{alertas.length}</span>
          </div>
          <div className="p-3 max-h-[140px] overflow-y-auto space-y-1">
            {alertas.slice(0, 12).map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.severidad === 'error' ? '#EF4444' : '#F59E0B' }} />
                <span className="text-slate-600 flex-1">{a.mensaje}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">{a.nivel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardGeneral;

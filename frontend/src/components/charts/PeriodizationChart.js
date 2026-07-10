import React, { memo } from 'react';
import { usePeriodizationChart } from '../../hooks/useChartData';
import usePlanStore from '../../stores/planStore';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const METRIC_TABS = [
  { id: 'volumen', label: 'Volumen', color: '#3B82F6' },
  { id: 'intensidad', label: 'Intensidad', color: '#EF4444' },
  { id: 'densidad', label: 'Densidad', color: '#10B981' },
  { id: 'carga', label: 'Carga', color: '#F59E0B' },
];

const INVERSO = { volumen: 'intensidad', intensidad: 'volumen', densidad: 'volumen', carga: 'volumen' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[180px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded" style={{ background: d.color }} />
        <span className="text-[13px] font-bold text-slate-800">{d.nombre}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div className="flex justify-between"><span className="text-slate-400">Semanas</span><span className="font-bold text-slate-700">{d.semanas}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Vol</span><span className="font-bold text-blue-600">{d.volumen}%</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Int</span><span className="font-bold text-red-500">{d.intensidad}%</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Carga</span><span className="font-bold text-amber-600">{d.carga} UA</span></div>
        {d.ACWR > 0 && <div className="flex justify-between"><span className="text-slate-400">ACWR</span><span className="font-bold">{d.ACWR}</span></div>}
        {d.alerta && <div className="col-span-2 text-[9px] text-red-500 mt-1">{d.alerta}</div>}
      </div>
    </div>
  );
};

const PeriodizationChart = memo(function PeriodizationChart() {
  const data = usePeriodizationChart();
  const metrica = usePlanStore(s => s.metricaGrafico);
  const setMetrica = usePlanStore(s => s.setMetricaGrafico);
  const toggleMacro = usePlanStore(s => s.toggleMacrociclo);

  const activeTab = METRIC_TABS.find(t => t.id === metrica) || METRIC_TABS[0];
  const inversoKey = INVERSO[metrica] || 'intensidad';

  if (!data.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="periodization-chart">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>Periodizacion</span>
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {METRIC_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setMetrica(t.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${metrica === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >{t.label}</button>
          ))}
        </div>
      </div>
      <div className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.12)" />
            <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={metrica} radius={[6, 6, 0, 0]} maxBarSize={60} animationDuration={300} onClick={(d) => d?.id && toggleMacro(d.id)}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} fillOpacity={0.85} cursor="pointer" />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey={inversoKey}
              stroke={METRIC_TABS.find(t => t.id === inversoKey)?.color || '#94A3B8'}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 3, fill: 'white', strokeWidth: 2 }}
              animationDuration={300}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default PeriodizationChart;

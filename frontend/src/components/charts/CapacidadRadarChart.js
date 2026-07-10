import React, { memo } from 'react';
import { useRadarChart } from '../../hooks/useChartData';
import usePlanStore from '../../stores/planStore';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[160px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-[12px] font-bold text-slate-800 mb-1.5">{d.capacidad}</div>
      <div className="space-y-1 text-[10px]">
        <div className="flex justify-between"><span className="text-[#B8912A]">Actual</span><span className="font-bold text-[#B8912A]">{d.actual} series/sem</span></div>
        <div className="flex justify-between"><span className="text-emerald-400">MEV</span><span className="font-bold text-emerald-600">{d.MEV}</span></div>
        <div className="flex justify-between"><span className="text-cyan-400">MAV</span><span className="font-bold text-cyan-600">{d.MAV}</span></div>
        <div className="flex justify-between"><span className="text-red-400">MRV</span><span className="font-bold text-red-600">{d.MRV}</span></div>
      </div>
      {d.actual > d.MRV && d.MRV > 0 && (
        <div className="mt-1.5 text-[9px] text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">Sobrevolumen detectado</div>
      )}
    </div>
  );
};

const CapacidadRadarChart = memo(function CapacidadRadarChart() {
  const data = useRadarChart();
  const setFiltro = usePlanStore(s => s.setCapacidadFiltro);

  if (!data.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-center h-[300px]" data-testid="radar-chart">
        <span className="text-slate-400 text-sm">Sin capacidades configuradas</span>
      </div>
    );
  }

  const maxVal = Math.max(...data.flatMap(d => [d.actual, d.MAV, d.MRV]), 10);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="radar-chart">
      <div className="px-4 pt-3 pb-1">
        <span className="text-[13px] font-bold text-slate-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>Radar de Capacidades</span>
      </div>
      <div className="px-2 pb-2">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="capacidad"
              tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }}
              onClick={(e) => {
                const cap = data.find(d => d.capacidad === e.value);
                if (cap) setFiltro(cap.tipo);
              }}
              style={{ cursor: 'pointer' }}
            />
            <PolarRadiusAxis tick={{ fontSize: 8, fill: '#94a3b8' }} domain={[0, Math.ceil(maxVal * 1.2)]} />
            <Tooltip content={<CustomTooltip />} />
            <Radar name="MRV (Limite)" dataKey="MRV" stroke="#EF4444" fill="#EF4444" fillOpacity={0.08} strokeDasharray="4 3" strokeWidth={1.5} />
            <Radar name="MAV (Objetivo)" dataKey="MAV" stroke="#10B981" fill="#10B981" fillOpacity={0.06} strokeDasharray="5 3" strokeWidth={1.5} />
            <Radar name="Actual" dataKey="actual" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: '#D4AF37', stroke: 'white', strokeWidth: 1 }} />
            <Legend iconType="line" wrapperStyle={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif" }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default CapacidadRadarChart;

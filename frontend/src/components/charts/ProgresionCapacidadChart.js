import React, { memo } from 'react';
import { useProgresionChart } from '../../hooks/useChartData';
import usePlanStore from '../../stores/planStore';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';

const CAP_OPTIONS = [
  { id: 'fuerza_maxima', label: 'Fuerza Max', color: '#EF4444' },
  { id: 'fuerza_explosiva', label: 'F.Explosiva', color: '#F59E0B' },
  { id: 'resistencia_aerobica', label: 'R.Aerobica', color: '#D4AF37' },
  { id: 'velocidad', label: 'Velocidad', color: '#10B981' },
  { id: 'coordinacion', label: 'Coordinacion', color: '#8B5CF6' },
  { id: 'flexibilidad', label: 'Flexibilidad', color: '#EC4899' },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[140px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-[11px] font-bold text-slate-800 mb-1">{d.label}</div>
      <div className="space-y-0.5 text-[10px]">
        <div className="flex justify-between"><span className="text-slate-400">Series</span><span className="font-bold text-cyan-600">{d.series}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Volumen</span><span className="font-bold text-[#B8912A]">{d.volumen}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Intensidad</span><span className="font-bold text-red-500">{d.intensidad}%</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Carga</span><span className="font-bold text-amber-600">{d.carga}</span></div>
      </div>
    </div>
  );
};

const ProgresionCapacidadChart = memo(function ProgresionCapacidadChart() {
  const filtro = usePlanStore(s => s.capacidadFiltro);
  const setFiltro = usePlanStore(s => s.setCapacidadFiltro);
  const activeCap = filtro === 'todas' ? 'fuerza_maxima' : filtro;
  const { data, MEV, MAV, MRV } = useProgresionChart(activeCap);

  const maxY = Math.max(MRV, ...data.map(d => d.series), 10) * 1.3;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="progresion-chart">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>Progresion por Capacidad</span>
        <div className="flex gap-1 flex-wrap">
          {CAP_OPTIONS.map(c => (
            <button
              key={c.id}
              onClick={() => setFiltro(c.id)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all ${activeCap === c.id ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}
              style={activeCap === c.id ? { background: c.color } : {}}
            >{c.label}</button>
          ))}
        </div>
      </div>
      <div className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, maxY]} />
            <Tooltip content={<CustomTooltip />} />
            {/* Zona optima MEV-MRV */}
            {MEV > 0 && MRV > 0 && <ReferenceArea y1={MEV} y2={MRV} fill="#10B981" fillOpacity={0.06} />}
            {MEV > 0 && <ReferenceLine y={MEV} stroke="#94A3B8" strokeDasharray="5 3" strokeWidth={1} label={{ value: `MEV ${MEV}`, fontSize: 8, fill: '#94A3B8', position: 'insideTopLeft' }} />}
            {MRV > 0 && <ReferenceLine y={MRV} stroke="#EF4444" strokeDasharray="5 3" strokeWidth={1} label={{ value: `MRV ${MRV}`, fontSize: 8, fill: '#EF4444', position: 'insideTopLeft' }} />}
            <Area type="monotone" dataKey="series" fill="#0891b2" fillOpacity={0.1} stroke="#0891b2" strokeWidth={2.5} dot={{ r: 4, fill: '#0891b2', stroke: 'white', strokeWidth: 2 }} animationDuration={400} />
            <Line type="monotone" dataKey="intensidad" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 3, fill: '#EF4444', stroke: 'white', strokeWidth: 1 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default ProgresionCapacidadChart;

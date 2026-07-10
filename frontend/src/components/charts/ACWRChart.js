import React, { memo } from 'react';
import { useACWRChart } from '../../hooks/useChartData';
import { ACWR_ZONAS } from '../../utils/chartDataAdapters';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const acwr = d?.acwr || 0;
  const zona = acwr > 1.5 ? 'Peligro' : acwr > 1.3 ? 'Atencion' : acwr >= 0.8 ? 'Optimo' : 'Subcarga';
  const zonaColor = acwr > 1.5 ? '#EF4444' : acwr > 1.3 ? '#F59E0B' : acwr >= 0.8 ? '#10B981' : '#94A3B8';
  return (
    <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 min-w-[170px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-[11px] text-slate-400 mb-1">{d.fecha}</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: zonaColor }} />
        <span className="text-[13px] font-bold" style={{ color: zonaColor }}>ACWR {d.acwr}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: zonaColor + '18', color: zonaColor }}>{zona}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        <div><span className="text-slate-400">Carga diaria</span> <span className="font-bold text-slate-700">{d.carga_diaria}</span></div>
        <div><span className="text-slate-400">Aguda (7d)</span> <span className="font-bold text-[#B8912A]">{d.carga_aguda}</span></div>
        <div><span className="text-slate-400">Cronica (28d)</span> <span className="font-bold text-slate-500">{d.carga_cronica}</span></div>
      </div>
    </div>
  );
};

const ACWRChart = memo(function ACWRChart() {
  const data = useACWRChart();

  if (!data.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-center h-[260px]" data-testid="acwr-chart">
        <span className="text-slate-400 text-sm">Sin datos de carga registrados</span>
      </div>
    );
  }

  const maxCarga = Math.max(...data.map(d => d.carga_diaria), 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="acwr-chart">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>Ratio Carga Aguda:Cronica (ACWR)</span>
        <div className="flex items-center gap-2 text-[9px]">
          {Object.values(ACWR_ZONAS).map(z => (
            <span key={z.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: z.stroke }} />
              {z.label}
            </span>
          ))}
        </div>
      </div>
      <div className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(data.length / 8))} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, maxCarga * 1.1]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 2.5]} />
            <Tooltip content={<CustomTooltip />} />
            {/* Zonas ACWR */}
            <ReferenceArea yAxisId="right" y1={1.5} y2={2.5} fill="#FEE2E2" fillOpacity={0.5} />
            <ReferenceArea yAxisId="right" y1={1.3} y2={1.5} fill="#FEF3C7" fillOpacity={0.5} />
            <ReferenceArea yAxisId="right" y1={0.8} y2={1.3} fill="#D1FAE5" fillOpacity={0.4} />
            <ReferenceArea yAxisId="right" y1={0} y2={0.8} fill="#F1F5F9" fillOpacity={0.4} />
            <ReferenceLine yAxisId="right" y={1} stroke="#10B981" strokeDasharray="3 3" strokeWidth={1} />
            {/* Barras carga diaria */}
            <Bar yAxisId="left" dataKey="carga_diaria" fill="#CBD5E1" radius={[2, 2, 0, 0]} maxBarSize={8} />
            {/* Linea aguda 7d */}
            <Line yAxisId="left" type="monotone" dataKey="carga_aguda" stroke="#D4AF37" strokeWidth={2} dot={false} />
            {/* Linea cronica 28d */}
            <Line yAxisId="left" type="monotone" dataKey="carga_cronica" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
            {/* Linea ACWR */}
            <Line yAxisId="right" type="monotone" dataKey="acwr" stroke="#0F172A" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#0F172A', stroke: 'white', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default ACWRChart;

import React, { memo } from 'react';
import { useHeatmapChart } from '../../hooks/useChartData';
import { colorCarga } from '../../utils/chartDataAdapters';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const TIPO_COLORS = {
  restablecimiento: '#A78BFA',
  competitivo: '#F59E0B',
  carga: '#D4AF37',
  choque: '#EF4444',
};

const HeatmapChart = memo(function HeatmapChart({ onCellClick }) {
  const data = useHeatmapChart();

  const handleClick = (semana) => {
    if (onCellClick) onCellClick(semana);
  };

  if (!data.length) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-center h-[300px]" data-testid="heatmap-chart">
        <span className="text-slate-400 text-sm">Sin datos de microciclos</span>
      </div>
    );
  }

  const cellW = Math.max(24, Math.min(40, 700 / data.length));
  const cellH = 22;
  const leftPad = 24;
  const topPad = 20;
  const svgW = leftPad + data.length * (cellW + 2) + 10;
  const svgH = topPad + 7 * (cellH + 2) + 36;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="heatmap-chart">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>Heatmap de Carga Semanal</span>
        <div className="flex items-center gap-3 text-[9px]">
          {[0, 200, 400, 600].map((v, i) => (
            <span key={i} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ background: colorCarga(v + 1) }} />
              {v === 0 ? '<200' : v === 600 ? '600+' : `${v}`}
            </span>
          ))}
        </div>
      </div>
      <div className="px-3 pb-3 overflow-x-auto">
        <svg width={svgW} height={svgH} style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {/* Day labels */}
          {DIAS.map((d, i) => (
            <text key={d} x={10} y={topPad + i * (cellH + 2) + cellH / 2 + 4} fontSize={9} fill="#94a3b8" fontWeight={600} textAnchor="middle">{d}</text>
          ))}
          {/* Week columns */}
          {data.map((week, wi) => {
            const x = leftPad + wi * (cellW + 2);
            const tipoColor = TIPO_COLORS[week.tipo];
            return (
              <g key={wi} onClick={() => handleClick(week.semana)} style={{ cursor: 'pointer' }}>
                {/* Week label */}
                <text x={x + cellW / 2} y={topPad - 6} fontSize={8} fill="#64748b" fontWeight={600} textAnchor="middle">S{week.semana}</text>
                {/* Day cells */}
                {week.dias.map((carga, di) => (
                  <rect
                    key={di}
                    x={x}
                    y={topPad + di * (cellH + 2)}
                    width={cellW}
                    height={cellH}
                    rx={4}
                    fill={carga > 0 ? colorCarga(carga) : '#F8FAFC'}
                    stroke={tipoColor || '#E2E8F0'}
                    strokeWidth={tipoColor ? 1.5 : 0.5}
                    opacity={0.95}
                  >
                    <title>{`S${week.semana} ${DIAS[di]}: ${Math.round(carga)} UA`}</title>
                  </rect>
                ))}
                {/* Total bar below */}
                <rect x={x} y={topPad + 7 * (cellH + 2) + 4} width={cellW} height={6} rx={3} fill={colorCarga(week.carga_total)} />
                <text x={x + cellW / 2} y={topPad + 7 * (cellH + 2) + 22} fontSize={7} fill="#94a3b8" textAnchor="middle">{Math.round(week.carga_total)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
});

export default HeatmapChart;

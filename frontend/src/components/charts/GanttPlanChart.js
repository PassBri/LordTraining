import React, { memo, useState } from 'react';
import { useGanttChart } from '../../hooks/useChartData';
import usePlanStore from '../../stores/planStore';

const ZOOM_OPTIONS = [
  { id: 'semana', label: 'Sem', pxPerWeek: 40 },
  { id: 'mes', label: 'Mes', pxPerWeek: 20 },
  { id: 'trimestre', label: 'Trim', pxPerWeek: 10 },
  { id: 'todo', label: 'Todo', pxPerWeek: 0 },
];

const ROW_H = 28;
const ROW_GAP = 4;
const TOP_PAD = 28;
const LEFT_PAD = 80;

const GanttPlanChart = memo(function GanttPlanChart() {
  const { niveles, totalSemanas } = useGanttChart();
  const ganttZoom = usePlanStore(s => s.ganttZoom);
  const setZoom = usePlanStore(s => s.setGanttZoom);
  const toggleMacro = usePlanStore(s => s.toggleMacrociclo);
  const [hoveredBlock, setHoveredBlock] = useState(null);

  if (!niveles.length || totalSemanas <= 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-center h-[160px]" data-testid="gantt-chart">
        <span className="text-slate-400 text-sm">Sin estructura de plan</span>
      </div>
    );
  }

  const zoomCfg = ZOOM_OPTIONS.find(z => z.id === ganttZoom) || ZOOM_OPTIONS[3];
  const containerW = 800;
  const pxPerWeek = zoomCfg.pxPerWeek > 0 ? zoomCfg.pxPerWeek : Math.max(6, (containerW - LEFT_PAD - 20) / totalSemanas);
  const svgW = LEFT_PAD + totalSemanas * pxPerWeek + 20;
  const svgH = TOP_PAD + niveles.length * (ROW_H + ROW_GAP) + 10;

  // Tick marks
  const ticks = [];
  const interval = pxPerWeek >= 20 ? 1 : pxPerWeek >= 10 ? 4 : 8;
  for (let w = 0; w <= totalSemanas; w += interval) {
    ticks.push(w);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="gantt-chart">
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>Timeline del Plan</span>
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {ZOOM_OPTIONS.map(z => (
            <button
              key={z.id}
              onClick={() => setZoom(z.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${ganttZoom === z.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >{z.label}</button>
          ))}
        </div>
      </div>
      <div className="px-3 pb-3 overflow-x-auto">
        <svg width={svgW} height={svgH} style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {/* Week ticks */}
          {ticks.map(w => (
            <g key={w}>
              <line x1={LEFT_PAD + w * pxPerWeek} y1={TOP_PAD - 4} x2={LEFT_PAD + w * pxPerWeek} y2={svgH} stroke="#E2E8F0" strokeWidth={0.5} />
              <text x={LEFT_PAD + w * pxPerWeek} y={TOP_PAD - 8} fontSize={7} fill="#94a3b8" textAnchor="middle" fontWeight={600}>S{w || 1}</text>
            </g>
          ))}

          {/* Rows */}
          {niveles.map((nivel, ri) => {
            const y = TOP_PAD + ri * (ROW_H + ROW_GAP);
            return (
              <g key={nivel.nombre}>
                {/* Row label */}
                <text x={4} y={y + ROW_H / 2 + 4} fontSize={9} fill="#64748b" fontWeight={700}>{nivel.nombre}</text>
                {/* Row bg */}
                <rect x={LEFT_PAD} y={y} width={totalSemanas * pxPerWeek} height={ROW_H} rx={4} fill={ri % 2 === 0 ? '#FAFBFC' : '#F8FAFC'} />
                {/* Blocks */}
                {nivel.bloques.map((bloque, bi) => {
                  const bx = LEFT_PAD + bloque.inicio * pxPerWeek;
                  const bw = Math.max(2, (bloque.fin - bloque.inicio) * pxPerWeek - 2);
                  const isHovered = hoveredBlock === `${ri}-${bi}`;
                  return (
                    <g
                      key={bi}
                      onMouseEnter={() => setHoveredBlock(`${ri}-${bi}`)}
                      onMouseLeave={() => setHoveredBlock(null)}
                      onClick={() => { if (bloque.id && ri === 1) toggleMacro(bloque.id); }}
                      style={{ cursor: ri === 1 ? 'pointer' : 'default' }}
                    >
                      <rect
                        x={bx}
                        y={y + 2}
                        width={bw}
                        height={ROW_H - 4}
                        rx={6}
                        fill={bloque.color}
                        opacity={isHovered ? 1 : 0.82}
                        stroke={isHovered ? '#0F172A' : 'none'}
                        strokeWidth={isHovered ? 1.5 : 0}
                      />
                      {bw > 30 && (
                        <text x={bx + bw / 2} y={y + ROW_H / 2 + 3} fontSize={8} fill="white" textAnchor="middle" fontWeight={700}>{bloque.label}</text>
                      )}
                      {isHovered && (
                        <g>
                          <rect x={bx} y={y - 30} width={Math.max(120, bloque.label.length * 6)} height={26} rx={6} fill="white" stroke="#CBD5E1" strokeWidth={1} />
                          <text x={bx + 6} y={y - 14} fontSize={9} fill="#334155" fontWeight={600}>
                            {bloque.label} · S{bloque.inicio + 1}-S{bloque.fin}
                            {bloque.vol ? ` · Vol:${bloque.vol}%` : ''}
                            {bloque.int ? ` · Int:${bloque.int}%` : ''}
                          </text>
                          {bloque.alerta && <text x={bx + 6} y={y - 4} fontSize={8} fill="#EF4444" fontWeight={600}>{bloque.alerta}</text>}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Today line */}
          {(() => {
            const todayWeek = Math.floor((Date.now() - new Date('2026-03-02').getTime()) / (7 * 24 * 60 * 60 * 1000));
            if (todayWeek >= 0 && todayWeek <= totalSemanas) {
              const tx = LEFT_PAD + todayWeek * pxPerWeek;
              return <line x1={tx} y1={TOP_PAD - 4} x2={tx} y2={svgH} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 2" />;
            }
            return null;
          })()}
        </svg>
      </div>
    </div>
  );
});

export default GanttPlanChart;

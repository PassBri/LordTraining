import React, { memo, useState, useRef, useLayoutEffect } from 'react';
import { useGanttChart } from '../../hooks/useChartData';
import usePlanStore from '../../stores/planStore';

const ZOOM_OPTIONS = [
  { id: 'semana', label: 'Sem', pxPerWeek: 40 },
  { id: 'mes', label: 'Mes', pxPerWeek: 20 },
  { id: 'trimestre', label: 'Trim', pxPerWeek: 10 },
  { id: 'todo', label: 'Todo', pxPerWeek: 0 },
];

const ROW_H = 30;
const ROW_GAP = 8;
const TOP_PAD = 34;
const LEFT_PAD = 96;

// Leyenda de tipos de microciclo (Material palette)
const MICRO_LEGEND = [
  { t: 'ordinario', c: '#3B82F6', l: 'Ordinario/Carga' },
  { t: 'choque', c: '#EF4444', l: 'Choque/Impacto' },
  { t: 'competitivo', c: '#F59E0B', l: 'Competitivo' },
  { t: 'recuperacion', c: '#A78BFA', l: 'Recuperación' },
];

const GanttPlanChart = memo(function GanttPlanChart() {
  const { niveles, totalSemanas } = useGanttChart();
  const ganttZoom = usePlanStore(s => s.ganttZoom);
  const setZoom = usePlanStore(s => s.setGanttZoom);
  const toggleMacro = usePlanStore(s => s.toggleMacrociclo);
  const [hoveredBlock, setHoveredBlock] = useState(null);

  // Ancho disponible real (para que "Todo" no se corte ni deje huecos)
  const scrollRef = useRef(null);
  const [availW, setAvailW] = useState(900);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setAvailW(el.clientWidth || 900);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!niveles.length || totalSemanas <= 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_2px_12px_rgba(15,23,42,0.06)] p-4 flex items-center justify-center h-[160px]" data-testid="gantt-chart">
        <span className="text-slate-400 text-sm">Sin estructura de plan</span>
      </div>
    );
  }

  const zoomCfg = ZOOM_OPTIONS.find(z => z.id === ganttZoom) || ZOOM_OPTIONS[3];
  const pxPerWeek = zoomCfg.pxPerWeek > 0 ? zoomCfg.pxPerWeek : Math.max(7, (availW - LEFT_PAD - 24) / totalSemanas);
  const svgW = LEFT_PAD + totalSemanas * pxPerWeek + 20;
  const svgH = TOP_PAD + niveles.length * (ROW_H + ROW_GAP) + 12;

  // Tick marks
  const ticks = [];
  const interval = pxPerWeek >= 20 ? 4 : pxPerWeek >= 10 ? 8 : 12;
  for (let w = 0; w <= totalSemanas; w += interval) ticks.push(w);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/70 shadow-[0_2px_16px_rgba(15,23,42,0.07)] overflow-hidden" data-testid="gantt-chart">
      <div className="px-5 pt-4 pb-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>Timeline del Plan</span>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{totalSemanas} sem</span>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-full p-1 shadow-inner">
          {ZOOM_OPTIONS.map(z => (
            <button
              key={z.id}
              onClick={() => setZoom(z.id)}
              data-testid={`gantt-zoom-${z.id}`}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-200 ${ganttZoom === z.id ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.12)]' : 'text-slate-400 hover:text-slate-600'}`}
            >{z.label}</button>
          ))}
        </div>
      </div>

      {/* Leyenda micro */}
      <div className="px-5 pb-1 flex items-center gap-3 flex-wrap">
        {MICRO_LEGEND.map(m => (
          <span key={m.t} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.c }} />{m.l}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />Sesiones
        </span>
      </div>

      <div ref={scrollRef} className="px-4 pb-4 pt-1 overflow-x-auto">
        <svg width={svgW} height={svgH} style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <defs>
            <filter id="gantt-bar-shadow" x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#0F172A" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Week ticks */}
          {ticks.map(w => (
            <g key={w}>
              <line x1={LEFT_PAD + w * pxPerWeek} y1={TOP_PAD - 6} x2={LEFT_PAD + w * pxPerWeek} y2={svgH - 4} stroke="#EEF2F7" strokeWidth={1} />
              <text x={LEFT_PAD + w * pxPerWeek} y={TOP_PAD - 12} fontSize={8} fill="#94a3b8" textAnchor="middle" fontWeight={700}>S{w || 1}</text>
            </g>
          ))}

          {/* Rows */}
          {niveles.map((nivel, ri) => {
            const y = TOP_PAD + ri * (ROW_H + ROW_GAP);
            const isSesiones = nivel.tipo === 'intensity';
            const maxCount = nivel.maxCount || 1;
            return (
              <g key={nivel.nombre}>
                {/* Row label chip */}
                <rect x={2} y={y + 4} width={LEFT_PAD - 12} height={ROW_H - 8} rx={7} fill="#F1F5F9" />
                <text x={10} y={y + ROW_H / 2 + 3.5} fontSize={9.5} fill="#475569" fontWeight={700}>{nivel.nombre}</text>
                {/* Row bg */}
                <rect x={LEFT_PAD} y={y} width={totalSemanas * pxPerWeek} height={ROW_H} rx={8} fill={ri % 2 === 0 ? '#FBFCFE' : '#F6F9FC'} />
                {/* Blocks */}
                {nivel.bloques.map((bloque, bi) => {
                  const bx = LEFT_PAD + bloque.inicio * pxPerWeek;
                  const fullBw = Math.max(2, (bloque.fin - bloque.inicio) * pxPerWeek - 2);
                  const isHovered = hoveredBlock === `${ri}-${bi}`;

                  if (isSesiones) {
                    // Mini-barras proporcionales al nº de sesiones
                    const h = Math.max(4, (bloque.count / maxCount) * (ROW_H - 8));
                    const barW = Math.max(3, fullBw - 2);
                    return (
                      <g key={bi} onMouseEnter={() => setHoveredBlock(`${ri}-${bi}`)} onMouseLeave={() => setHoveredBlock(null)}>
                        <rect x={bx + 1} y={y + ROW_H - 4 - h} width={barW} height={h} rx={2.5} fill={bloque.color} opacity={isHovered ? 1 : 0.85} filter="url(#gantt-bar-shadow)" />
                        {fullBw > 14 && <text x={bx + fullBw / 2} y={y + ROW_H - 6 - h} fontSize={7} fill="#0369A1" textAnchor="middle" fontWeight={700}>{bloque.count}</text>}
                        {isHovered && (
                          <g>
                            <rect x={bx} y={y - 26} width={92} height={22} rx={6} fill="white" stroke="#CBD5E1" strokeWidth={1} filter="url(#gantt-bar-shadow)" />
                            <text x={bx + 6} y={y - 11} fontSize={9} fill="#334155" fontWeight={600}>{bloque.count} sesiones · S{bloque.inicio + 1}</text>
                          </g>
                        )}
                      </g>
                    );
                  }

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
                        y={y + 3}
                        width={fullBw}
                        height={ROW_H - 6}
                        rx={7}
                        fill={bloque.color}
                        opacity={isHovered ? 1 : 0.9}
                        stroke={isHovered ? '#0F172A' : 'none'}
                        strokeWidth={isHovered ? 1.5 : 0}
                        filter="url(#gantt-bar-shadow)"
                      />
                      {fullBw > 24 && (
                        <text x={bx + fullBw / 2} y={y + ROW_H / 2 + 3} fontSize={8.5} fill="white" textAnchor="middle" fontWeight={700}>{bloque.label}</text>
                      )}
                      {isHovered && (
                        <g>
                          <rect x={bx} y={y - 32} width={Math.max(140, bloque.label.length * 6.2)} height={28} rx={7} fill="white" stroke="#CBD5E1" strokeWidth={1} filter="url(#gantt-bar-shadow)" />
                          <text x={bx + 7} y={y - 16} fontSize={9} fill="#334155" fontWeight={700}>
                            {bloque.label} · S{bloque.inicio + 1}-S{bloque.fin}
                          </text>
                          <text x={bx + 7} y={y - 6} fontSize={8} fill="#64748B" fontWeight={600}>
                            {bloque.vol ? `Vol ${bloque.vol}%  ` : ''}{bloque.int ? `Int ${bloque.int}%  ` : ''}{bloque.sesiones != null ? `${bloque.sesiones} ses.` : ''}
                          </text>
                          {bloque.alerta && <text x={bx + 7} y={y + 4} fontSize={8} fill="#EF4444" fontWeight={600}>{bloque.alerta}</text>}
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
              return (
                <g>
                  <line x1={tx} y1={TOP_PAD - 6} x2={tx} y2={svgH - 4} stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 3" />
                  <circle cx={tx} cy={TOP_PAD - 6} r={2.5} fill="#EF4444" />
                </g>
              );
            }
            return null;
          })()}
        </svg>
      </div>
    </div>
  );
});

export default GanttPlanChart;

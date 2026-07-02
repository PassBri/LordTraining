import React, { useState, useMemo } from 'react';
import { ChevronRight, ListTree, Dumbbell, Layers, CalendarDays, Download, GripVertical } from 'lucide-react';

// ── Indicador de carga combinando ACWR + carga% (peor caso gana) ──
export const loadStatus = ({ acwr, load } = {}) => {
  const rank = { optimal: 0, caution: 1, overload: 2, detraining: 2 };
  let level = 'optimal';
  const worse = (a, b) => (rank[a] >= rank[b] ? a : b);
  if (typeof acwr === 'number' && acwr > 0) {
    if (acwr > 1.5) level = worse(level, 'overload');
    else if (acwr > 1.3) level = worse(level, 'caution');
    else if (acwr < 0.8) level = worse(level, 'detraining');
  }
  if (typeof load === 'number' && load > 0) {
    if (load > 95) level = worse(level, 'overload');
    else if (load >= 85) level = worse(level, 'caution');
    else if (load < 50) level = worse(level, 'detraining');
  }
  const map = {
    optimal: { color: '#10B981', bg: '#D1FAE5', label: 'Óptima', key: 'optimal' },
    caution: { color: '#F59E0B', bg: '#FEF3C7', label: 'Precaución', key: 'caution' },
    overload: { color: '#EF4444', bg: '#FEE2E2', label: 'Sobrecarga', key: 'overload' },
    detraining: { color: '#F59E0B', bg: '#FEF3C7', label: 'Detraining', key: 'detraining' },
  };
  return map[level];
};

const microLoadOf = (micro) => micro?.type?.load ?? micro?.type?.loadPercent ?? micro?.load_percent ?? 70;

const LoadChip = ({ acwr, load, size = 'sm' }) => {
  const s = loadStatus({ acwr, load });
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}
      style={{ color: s.color, backgroundColor: s.bg }}
      title={`Carga: ${s.label}${acwr ? ` · ACWR ${acwr.toFixed(2)}` : ''}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  );
};

// Aplana todos los micros con sus índices y contexto
const flattenMicros = (plan, resolvePhase, getMicroMetrics) => {
  const rows = [];
  (plan?.macrocycles || []).forEach((macro, macroIdx) => {
    const phase = resolvePhase(macro);
    (macro.mesocycles || []).forEach((meso, mesoIdx) => {
      (meso.microcycles || []).forEach((micro, microIdx) => {
        const m = getMicroMetrics(macroIdx, mesoIdx, microIdx);
        rows.push({
          macroIdx, mesoIdx, microIdx, macro, meso, micro, phase,
          acwr: m?.ACWR || 0,
          load: microLoadOf(micro),
          volumen: micro.volumen ?? (m?.vol_calculado != null ? Math.round(m.vol_calculado) : phase.volumePercent),
          intensidad: micro.intensidad ?? (m?.int_calculado != null ? Math.round(m.int_calculado) : phase.intensityPercent),
          sesiones: (micro.sessions || []).length,
        });
      });
    });
  });
  return rows;
};

/* ══════════════════ VISTA ÁRBOL JERÁRQUICO ══════════════════ */
export const TreeView = ({ plan, resolvePhase, getMicroMetrics, onEditMicro }) => {
  const [open, setOpen] = useState({});
  const isOpen = (k, def) => (k in open ? open[k] : def);
  const toggle = (k, def) => setOpen((p) => ({ ...p, [k]: !(k in p ? p[k] : def) }));

  return (
    <div className="space-y-2 animate-[fadeIn_0.3s_ease]" data-testid="periodization-tree-view">
      {(plan?.macrocycles || []).map((macro, macroIdx) => {
        const phase = resolvePhase(macro);
        const mk = `ma-${macroIdx}`;
        const macroOpen = isOpen(mk, true); // abierto por defecto
        return (
          <div key={macro.id || macroIdx} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              style={{ borderLeft: `4px solid ${phase.color}` }}
              onClick={() => toggle(mk, true)}
              data-testid={`tree-macro-${macroIdx}`}
            >
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${macroOpen ? 'rotate-90' : ''}`} />
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[10px]" style={{ backgroundColor: phase.color }}>{phase.abbr || 'MC'}</div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-[13px]">{macro.name}</div>
                <div className="text-[10px] text-slate-400">{phase.name} · {macro.mesocycles?.length || 0} mesociclos</div>
              </div>
            </button>
            {macroOpen && (macro.mesocycles || []).map((meso, mesoIdx) => {
              const ek = `me-${macroIdx}-${mesoIdx}`;
              const mesoOpen = isOpen(ek, true);
              const mesoColor = meso.type?.color || '#64748B';
              return (
                <div key={meso.id || mesoIdx} className="ml-6 border-l border-slate-100">
                  <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors text-left" onClick={() => toggle(ek, true)} data-testid={`tree-meso-${macroIdx}-${mesoIdx}`}>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mesoOpen ? 'rotate-90' : ''}`} />
                    <Layers className="w-3.5 h-3.5" style={{ color: mesoColor }} />
                    <span className="font-semibold text-[12px] text-slate-700">{meso.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: mesoColor, backgroundColor: mesoColor + '15' }}>{meso.type?.name || '-'}</span>
                    <span className="text-[10px] text-slate-400">· {meso.microcycles?.length || 0} micros</span>
                  </button>
                  {mesoOpen && (meso.microcycles || []).map((micro, microIdx) => {
                    const mkk = `mi-${macroIdx}-${mesoIdx}-${microIdx}`;
                    const microOpen = isOpen(mkk, false);
                    const mm = getMicroMetrics(macroIdx, mesoIdx, microIdx);
                    const microColor = micro.type?.color || '#94a3b8';
                    return (
                      <div key={micro.id || microIdx} className="ml-6 border-l border-slate-100">
                        <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors">
                          <button onClick={() => toggle(mkk)} className="flex items-center gap-2 flex-1 text-left" data-testid={`tree-micro-${macroIdx}-${mesoIdx}-${microIdx}`}>
                            <ChevronRight className={`w-3 h-3 text-slate-300 transition-transform ${microOpen ? 'rotate-90' : ''}`} />
                            <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: microColor }} />
                            <span className="text-[12px] font-medium text-slate-700">{micro.name}</span>
                            <span className="text-[9px] text-slate-400">{micro.type?.name || ''}</span>
                          </button>
                          <LoadChip acwr={mm?.ACWR} load={microLoadOf(micro)} size="xs" />
                          <span className="text-[10px] text-slate-400">{(micro.sessions || []).length} ses.</span>
                          <button onClick={() => onEditMicro(micro, macroIdx, mesoIdx, microIdx)} className="text-[10px] text-blue-500 hover:underline">Editar</button>
                        </div>
                        {microOpen && (micro.sessions || []).map((s, si) => (
                          <div key={s.id || si} className="ml-8 flex items-center gap-2 px-4 py-1.5 text-[11px] text-slate-500 border-l border-slate-100">
                            <Dumbbell className="w-3 h-3 text-slate-300" />
                            <span className="font-medium text-slate-600">{s.name || s.day || `Sesión ${si + 1}`}</span>
                            {s.duration ? <span className="text-slate-400">· {s.duration}min</span> : null}
                            {s.rpe ? <span className="text-slate-400">· RPE {s.rpe}</span> : null}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/* ══════════════════ VISTA KANBAN ══════════════════ */
export const KanbanView = ({ plan, resolvePhase, getMicroMetrics, onMoveMicro }) => {
  const [dragItem, setDragItem] = useState(null);
  const [overCol, setOverCol] = useState(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 animate-[fadeIn_0.3s_ease]" data-testid="periodization-kanban-view">
      {(plan?.macrocycles || []).map((macro, macroIdx) => {
        const phase = resolvePhase(macro);
        const micros = [];
        (macro.mesocycles || []).forEach((meso, mesoIdx) => {
          (meso.microcycles || []).forEach((micro, microIdx) => micros.push({ meso, micro, mesoIdx, microIdx }));
        });
        return (
          <div
            key={macro.id || macroIdx}
            className={`shrink-0 w-64 rounded-2xl border transition-all ${overCol === macroIdx ? 'border-slate-800 bg-slate-50' : 'border-slate-200 bg-slate-50/50'}`}
            onDragOver={(e) => { e.preventDefault(); setOverCol(macroIdx); }}
            onDragLeave={() => setOverCol((c) => (c === macroIdx ? null : c))}
            onDrop={() => { if (dragItem && dragItem.macroIdx !== macroIdx) onMoveMicro(dragItem, macroIdx); setDragItem(null); setOverCol(null); }}
            data-testid={`kanban-col-${macroIdx}`}
          >
            <div className="px-3 py-2.5 rounded-t-2xl flex items-center gap-2" style={{ backgroundColor: phase.color + '12', borderBottom: `2px solid ${phase.color}` }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-[9px]" style={{ backgroundColor: phase.color }}>{phase.abbr}</div>
              <div className="flex-1">
                <div className="text-[12px] font-bold text-slate-800 leading-tight">{macro.name}</div>
                <div className="text-[9px] text-slate-400">{micros.length} microciclos</div>
              </div>
            </div>
            <div className="p-2.5 space-y-2 min-h-[80px]">
              {micros.map(({ micro, mesoIdx, microIdx }) => {
                const mm = getMicroMetrics(macroIdx, mesoIdx, microIdx);
                const microColor = micro.type?.color || '#94a3b8';
                return (
                  <div
                    key={micro.id || `${mesoIdx}-${microIdx}`}
                    draggable
                    onDragStart={() => setDragItem({ macroIdx, mesoIdx, microIdx })}
                    onDragEnd={() => { setDragItem(null); setOverCol(null); }}
                    className="rounded-xl bg-white border border-slate-200 shadow-sm p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    style={{ borderLeft: `3px solid ${microColor}` }}
                    data-testid={`kanban-card-${macroIdx}-${mesoIdx}-${microIdx}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <GripVertical className="w-3 h-3 text-slate-300" />
                      <span className="text-[12px] font-semibold text-slate-800 flex-1 truncate">{micro.name}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: microColor, backgroundColor: microColor + '12' }}>{micro.type?.name || '-'}</span>
                      <LoadChip acwr={mm?.ACWR} load={microLoadOf(micro)} size="xs" />
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">{(micro.sessions || []).length} sesiones · carga {microLoadOf(micro)}%</div>
                  </div>
                );
              })}
              {micros.length === 0 && <div className="text-[10px] text-slate-300 text-center py-4">Suelta microciclos aquí</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ══════════════════ VISTA TABLA COMPACTA ══════════════════ */
export const TableView = ({ plan, resolvePhase, getMicroMetrics, MICRO_TYPES, onUpdateMicroField, onExportExcel }) => {
  const rows = useMemo(() => flattenMicros(plan, resolvePhase, getMicroMetrics), [plan, resolvePhase, getMicroMetrics]);

  const buildExcelRows = () => rows.map((r, i) => {
    const s = loadStatus({ acwr: r.acwr, load: r.load });
    return {
      semana: `S${i + 1}`, macro: r.macro.name, fase: r.phase.name, meso: r.meso.name,
      tipo: r.micro.type?.name || '', volumen: r.volumen, intensidad: r.intensidad,
      carga: r.load, sesiones: r.sesiones, acwr: r.acwr || null, estado: s.key,
    };
  });

  const EditNum = ({ value, field, r }) => {
    const [editing, setEditing] = useState(false);
    return editing ? (
      <input
        type="number" min="0" autoFocus defaultValue={value ?? ''}
        onBlur={(e) => { onUpdateMicroField(r.macroIdx, r.mesoIdx, r.microIdx, field, e.target.value); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { onUpdateMicroField(r.macroIdx, r.mesoIdx, r.microIdx, field, e.target.value); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
        className="w-14 text-center text-[11px] border-2 border-slate-800 rounded outline-none px-1 py-0.5"
        data-testid={`table-input-${field}-${r.macroIdx}-${r.mesoIdx}-${r.microIdx}`}
      />
    ) : (
      <button onClick={() => setEditing(true)} className="w-full text-center hover:bg-slate-100 rounded px-1 py-0.5 cursor-text" data-testid={`table-cell-${field}-${r.macroIdx}-${r.mesoIdx}-${r.microIdx}`}>
        {value ?? '—'}
      </button>
    );
  };

  return (
    <div className="animate-[fadeIn_0.3s_ease]" data-testid="periodization-table-view">
      <div className="flex justify-end mb-3">
        <button
          onClick={() => onExportExcel(buildExcelRows())}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-[12px] font-semibold shadow-sm transition-colors"
          data-testid="table-export-excel-btn"
        >
          <Download className="w-3.5 h-3.5" /> Exportar a Excel
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-[11px]" style={{ minWidth: 900 }}>
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              {['Sem', 'Macrociclo', 'Fase', 'Mesociclo', 'Tipo', 'Vol %', 'Int %', 'Carga %', 'Ses.', 'ACWR', 'Carga'].map((h) => (
                <th key={h} className="px-2.5 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const microColor = r.micro.type?.color || '#94a3b8';
              return (
                <tr key={`${r.macroIdx}-${r.mesoIdx}-${r.microIdx}`} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors" data-testid={`table-row-${i}`}>
                  <td className="px-2.5 py-1.5 font-semibold text-slate-500">S{i + 1}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.phase.color }} />{r.macro.name}</span></td>
                  <td className="px-2.5 py-1.5 text-slate-500 whitespace-nowrap">{r.phase.name}</td>
                  <td className="px-2.5 py-1.5 text-slate-600 whitespace-nowrap">{r.meso.name}</td>
                  <td className="px-2.5 py-1.5">
                    <select
                      value={r.micro.type?.id || ''}
                      onChange={(e) => { const t = MICRO_TYPES.find((x) => x.id === e.target.value); if (t) onUpdateMicroField(r.macroIdx, r.mesoIdx, r.microIdx, 'tipo', { ...t, load: t.loadPercent }); }}
                      className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white"
                      style={{ color: microColor }}
                      data-testid={`table-tipo-${r.macroIdx}-${r.mesoIdx}-${r.microIdx}`}
                    >
                      {MICRO_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2.5 py-1.5"><EditNum value={r.volumen} field="volumen" r={r} /></td>
                  <td className="px-2.5 py-1.5"><EditNum value={r.intensidad} field="intensidad" r={r} /></td>
                  <td className="px-2.5 py-1.5"><EditNum value={r.load} field="load_percent" r={r} /></td>
                  <td className="px-2.5 py-1.5 text-center text-slate-500">{r.sesiones}</td>
                  <td className="px-2.5 py-1.5 text-center font-semibold" style={{ color: loadStatus({ acwr: r.acwr, load: r.load }).color }}>{r.acwr ? r.acwr.toFixed(2) : '—'}</td>
                  <td className="px-2.5 py-1.5"><LoadChip acwr={r.acwr} load={r.load} size="xs" /></td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={11} className="text-center text-slate-300 py-6">Sin microciclos en este plan</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

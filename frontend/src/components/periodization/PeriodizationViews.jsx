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

// Resolutores tolerantes a nombres de campo (API usa inglés y type como string)
const resolveMicroType = (micro, MICRO_TYPES = []) => {
  const t = micro?.type;
  const storedLoad = micro?.load_percent;
  if (t && typeof t === 'object') return { id: t.id, name: t.name || t.id || '-', color: t.color || '#94a3b8', load: storedLoad ?? t.load ?? t.loadPercent ?? 70 };
  const found = (MICRO_TYPES || []).find((x) => x.id === t) || {};
  return { id: t || '', name: found.name || t || '-', color: found.color || '#94a3b8', load: storedLoad ?? found.loadPercent ?? 70 };
};
const resolveMesoType = (meso, MESO_TYPES = []) => {
  const t = meso?.type;
  if (t && typeof t === 'object') return { id: t.id, name: t.name || t.id || '-', color: t.color || '#64748B' };
  const found = (MESO_TYPES || []).find((x) => x.id === t) || {};
  return { id: t || '', name: found.name || t || '-', color: found.color || '#64748B' };
};
const microVol = (micro) => micro?.volume ?? micro?.volumen ?? 0;
const microInt = (micro) => micro?.intensity ?? micro?.intensidad ?? 0;
const weekOf = (micro) => micro?.week_number ?? micro?.numero_semana ?? '';
const sessionsOf = (micro) => micro?.sessions || [];
const microLoadOf = (micro, MICRO_TYPES) => resolveMicroType(micro, MICRO_TYPES).load;

// Fase 3 — coincidencia con buscador + filtros (fase / tipo micro / carga)
export const matchesFilters = ({ macro, meso, micro, phase, acwr, load }, filters) => {
  if (!filters) return true;
  const { search, phase: fp, microType, load: fl } = filters;
  if (fp && fp !== 'all' && phase?.id !== fp) return false;
  if (microType && microType !== 'all' && micro?.type?.id !== microType) return false;
  if (fl && fl !== 'all') {
    const st = loadStatus({ acwr, load });
    const key = st.key === 'detraining' ? 'caution' : st.key;
    if (key !== fl) return false;
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    const hay = `${macro?.name || ''} ${meso?.name || ''} ${micro?.name || ''} ${micro?.type?.name || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
};
const hasActiveFilters = (f) => !!f && (f.search?.trim() || (f.phase && f.phase !== 'all') || (f.microType && f.microType !== 'all') || (f.load && f.load !== 'all'));

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
const flattenMicros = (plan, resolvePhase, getMicroMetrics, MICRO_TYPES) => {
  const rows = [];
  (plan?.macrocycles || []).forEach((macro, macroIdx) => {
    const phase = resolvePhase(macro);
    (macro.mesocycles || []).forEach((meso, mesoIdx) => {
      (meso.microcycles || []).forEach((micro, microIdx) => {
        const m = getMicroMetrics(macroIdx, mesoIdx, microIdx);
        rows.push({
          macroIdx, mesoIdx, microIdx, macro, meso, micro, phase,
          acwr: m?.ACWR || 0,
          load: microLoadOf(micro, MICRO_TYPES),
          volumen: microVol(micro) || (m?.vol_calculado ? Math.round(m.vol_calculado) : 0),
          intensidad: microInt(micro) || (m?.int_calculado ? Math.round(m.int_calculado) : 0),
          sesiones: sessionsOf(micro).length,
        });
      });
    });
  });
  return rows;
};

/* ══════════════════ VISTA ÁRBOL JERÁRQUICO ══════════════════ */
export const TreeView = ({ plan, filters, resolvePhase, getMicroMetrics, onEditMicro, MICRO_TYPES = [], MESO_TYPES = [] }) => {
  const [open, setOpen] = useState({});
  const isOpen = (k, def) => (k in open ? open[k] : def);
  const toggle = (k, def) => setOpen((p) => ({ ...p, [k]: !(k in p ? p[k] : def) }));
  const active = hasActiveFilters(filters);
  const microVisible = (macro, meso, micro, macroIdx, mesoIdx, microIdx) => {
    const mm = getMicroMetrics(macroIdx, mesoIdx, microIdx);
    return matchesFilters({ macro, meso, micro: { ...micro, type: resolveMicroType(micro, MICRO_TYPES) }, phase: resolvePhase(macro), acwr: mm?.ACWR || 0, load: microLoadOf(micro, MICRO_TYPES) }, filters);
  };

  return (
    <div className="space-y-2 animate-[fadeIn_0.3s_ease]" data-testid="periodization-tree-view">
      {(plan?.macrocycles || []).map((macro, macroIdx) => {
        const phase = resolvePhase(macro);
        const mk = `ma-${macroIdx}`;
        const macroOpen = isOpen(mk, true); // abierto por defecto
        if (active) {
          const anyVis = (macro.mesocycles || []).some((me, mei) => (me.microcycles || []).some((mi, mii) => microVisible(macro, me, mi, macroIdx, mei, mii)));
          if (!anyVis) return null;
        }
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
              const mesoT = resolveMesoType(meso, MESO_TYPES);
              const mesoColor = mesoT.color;
              if (active && !(meso.microcycles || []).some((mi, mii) => microVisible(macro, meso, mi, macroIdx, mesoIdx, mii))) return null;
              return (
                <div key={meso.id || mesoIdx} className="ml-6 border-l border-slate-100">
                  <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors text-left" onClick={() => toggle(ek, true)} data-testid={`tree-meso-${macroIdx}-${mesoIdx}`}>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${mesoOpen ? 'rotate-90' : ''}`} />
                    <Layers className="w-3.5 h-3.5" style={{ color: mesoColor }} />
                    <span className="font-semibold text-[12px] text-slate-700">{meso.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: mesoColor, backgroundColor: mesoColor + '15' }}>{mesoT.name}</span>
                    <span className="text-[10px] text-slate-400">· {meso.microcycles?.length || 0} micros</span>
                  </button>
                  {mesoOpen && (meso.microcycles || []).map((micro, microIdx) => {
                    const mkk = `mi-${macroIdx}-${mesoIdx}-${microIdx}`;
                    const microOpen = isOpen(mkk, false);
                    if (active && !microVisible(macro, meso, micro, macroIdx, mesoIdx, microIdx)) return null;
                    const mm = getMicroMetrics(macroIdx, mesoIdx, microIdx);
                    const microT = resolveMicroType(micro, MICRO_TYPES);
                    const microColor = microT.color;
                    const sess = sessionsOf(micro);
                    return (
                      <div key={micro.id || microIdx} className="ml-6 border-l border-slate-100">
                        <div className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors">
                          <button onClick={() => toggle(mkk)} className="flex items-center gap-2 flex-1 text-left" data-testid={`tree-micro-${macroIdx}-${mesoIdx}-${microIdx}`}>
                            <ChevronRight className={`w-3 h-3 text-slate-300 transition-transform ${microOpen ? 'rotate-90' : ''}`} />
                            <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: microColor }} />
                            <span className="text-[12px] font-medium text-slate-700">{micro.name || `Semana ${weekOf(micro)}`}</span>
                            <span className="text-[9px] text-slate-400">{microT.name}</span>
                            <span className="text-[9px] text-slate-300">V{microVol(micro)} · I{microInt(micro)}</span>
                          </button>
                          <LoadChip acwr={mm?.ACWR} load={microLoadOf(micro, MICRO_TYPES)} size="xs" />
                          <span className="text-[10px] text-slate-400">{sess.length} ses.</span>
                          <button onClick={() => onEditMicro(micro, macroIdx, mesoIdx, microIdx)} className="text-[10px] text-blue-500 hover:underline">Editar</button>
                        </div>
                        {microOpen && sess.map((s, si) => (
                          <div key={s.id || si} className="ml-8 flex items-center gap-2 px-4 py-1.5 text-[11px] text-slate-500 border-l border-slate-100">
                            <Dumbbell className="w-3 h-3 text-slate-300" />
                            <span className="font-medium text-slate-600">{s.name || (s.day ? `Día ${s.day}` : `Sesión ${si + 1}`)}</span>
                            {(s.duration_minutes || s.duration) ? <span className="text-slate-400">· {s.duration_minutes || s.duration}min</span> : null}
                            {s.session_type ? <span className="text-slate-400">· {s.session_type}</span> : null}
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
export const KanbanView = ({ plan, filters, resolvePhase, getMicroMetrics, onMoveMicro, MICRO_TYPES = [] }) => {
  const [dragItem, setDragItem] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const active = hasActiveFilters(filters);

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
              {micros.map(({ meso, micro, mesoIdx, microIdx }) => {
                const mm = getMicroMetrics(macroIdx, mesoIdx, microIdx);
                const microT = resolveMicroType(micro, MICRO_TYPES);
                if (active && !matchesFilters({ macro, meso, micro: { ...micro, type: microT }, phase, acwr: mm?.ACWR || 0, load: microT.load }, filters)) return null;
                const microColor = microT.color;
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
                      <span className="text-[12px] font-semibold text-slate-800 flex-1 truncate">{micro.name || `Semana ${weekOf(micro)}`}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: microColor, backgroundColor: microColor + '12' }}>{microT.name}</span>
                      <LoadChip acwr={mm?.ACWR} load={microT.load} size="xs" />
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">{sessionsOf(micro).length} sesiones · V{microVol(micro)} · I{microInt(micro)} · carga {microT.load}%</div>
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
export const TableView = ({ plan, filters, resolvePhase, getMicroMetrics, MICRO_TYPES, onUpdateMicroField, onExportExcel }) => {
  const allRows = useMemo(() => flattenMicros(plan, resolvePhase, getMicroMetrics, MICRO_TYPES), [plan, resolvePhase, getMicroMetrics, MICRO_TYPES]);
  const active = hasActiveFilters(filters);
  const rows = active ? allRows.filter((r) => matchesFilters({ macro: r.macro, meso: r.meso, micro: { ...r.micro, type: resolveMicroType(r.micro, MICRO_TYPES) }, phase: r.phase, acwr: r.acwr, load: r.load }, filters)) : allRows;

  const buildExcelRows = () => rows.map((r, i) => {
    const s = loadStatus({ acwr: r.acwr, load: r.load });
    return {
      semana: `S${i + 1}`, macro: r.macro.name, fase: r.phase.name, meso: r.meso.name,
      tipo: resolveMicroType(r.micro, MICRO_TYPES).name, volumen: r.volumen, intensidad: r.intensidad,
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
              const microT = resolveMicroType(r.micro, MICRO_TYPES);
              const microColor = microT.color;
              return (
                <tr key={`${r.macroIdx}-${r.mesoIdx}-${r.microIdx}`} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`} data-testid={`table-row-${i}`}>
                  <td className="px-2.5 py-1.5 font-semibold text-slate-500">S{i + 1}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.phase.color }} />{r.macro.name}</span></td>
                  <td className="px-2.5 py-1.5 text-slate-500 whitespace-nowrap">{r.phase.name}</td>
                  <td className="px-2.5 py-1.5 text-slate-600 whitespace-nowrap">{r.meso.name}</td>
                  <td className="px-2.5 py-1.5">
                    <select
                      value={microT.id || ''}
                      onChange={(e) => onUpdateMicroField(r.macroIdx, r.mesoIdx, r.microIdx, 'tipo', e.target.value)}
                      className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white"
                      style={{ color: microColor }}
                      data-testid={`table-tipo-${r.macroIdx}-${r.mesoIdx}-${r.microIdx}`}
                    >
                      {(MICRO_TYPES || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2.5 py-1.5"><EditNum value={r.volumen} field="volume" r={r} /></td>
                  <td className="px-2.5 py-1.5"><EditNum value={r.intensidad} field="intensity" r={r} /></td>
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

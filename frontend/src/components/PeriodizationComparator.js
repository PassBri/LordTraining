import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { X, Check, Minus } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

const COMPARE_COLORS = ['#CCFF00', '#3B82F6', '#EF4444'];

const PeriodizationComparator = ({ open, onOpenChange, models = [], onRemoveModel }) => {
  // Normalize phases: build data for chart where each phase is a tick
  // Because models have different phases, we align by phase index and label with names.
  const chartData = useMemo(() => {
    if (models.length === 0) return [];
    const maxPhases = Math.max(...models.map(m => m.phases?.length || 0));
    const data = [];
    for (let i = 0; i < maxPhases; i++) {
      const row = { phaseIdx: i + 1 };
      models.forEach((m, mi) => {
        const p = m.phases?.[i];
        if (p) {
          row[`${m.name}_vol`] = p.volume;
          row[`${m.name}_int`] = p.intensity;
          row[`${m.name}_label`] = p.name;
        }
      });
      data.push(row);
    }
    return data;
  }, [models]);

  // Matrix of characteristics (union) vs each model
  const characteristicsMatrix = useMemo(() => {
    const all = new Set();
    models.forEach(m => (m.characteristics || []).forEach(c => all.add(c)));
    return Array.from(all).map(c => ({
      char: c,
      rows: models.map(m => (m.characteristics || []).some(x => x === c)),
    }));
  }, [models]);

  // Sports comparison (union)
  const sportsMatrix = useMemo(() => {
    const all = new Set();
    models.forEach(m => (m.applicable_sports || []).forEach(s => all.add(s)));
    return Array.from(all).sort().map(s => ({
      sport: s,
      rows: models.map(m => (m.applicable_sports || []).includes(s)),
    }));
  }, [models]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto" data-testid="comparator-dialog">
        <DialogHeader>
          <DialogTitle>Comparador de Modelos de Periodización</DialogTitle>
        </DialogHeader>

        {models.length < 2 ? (
          <div className="text-center py-12 text-slate-500">
            Selecciona al menos 2 modelos para comparar (máximo 3).
          </div>
        ) : (
          <div className="space-y-6">
            {/* Model chips */}
            <div className="flex gap-2 flex-wrap">
              {models.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 bg-white"
                  style={{ borderColor: COMPARE_COLORS[i] }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: COMPARE_COLORS[i] }} />
                  <span className="text-sm font-bold">{m.icon} {m.name}</span>
                  <button
                    onClick={() => onRemoveModel(m.id)}
                    className="text-slate-400 hover:text-rose-500 ml-1"
                    data-testid={`comparator-remove-${m.id}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Side-by-side summary cards */}
            <div className={`grid grid-cols-1 ${models.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
              {models.map((m, i) => (
                <div
                  key={m.id}
                  className="bg-slate-50 rounded-xl p-4 border"
                  style={{ borderColor: `${COMPARE_COLORS[i]}60` }}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${m.color}25`, border: `1px solid ${m.color}60` }}
                    >
                      {m.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{m.name}</h3>
                      {m.author && <p className="text-[11px] text-slate-500">{m.author}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-3">{m.description}</p>
                  <div className="text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fases:</span>
                      <span className="font-medium">{m.phases?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Categoría:</span>
                      <span className="font-medium">{m.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duración:</span>
                      <span className="font-medium text-right">{m.recommended_duration || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Volume chart */}
            <section>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Volumen por fase</h4>
              <div className="bg-white border rounded-xl p-3">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="phaseIdx" tickFormatter={(v) => `Fase ${v}`} stroke="#64748b" />
                    <YAxis domain={[0, 100]} unit="%" stroke="#64748b" />
                    <Tooltip content={<PhaseTooltip models={models} type="vol" />} />
                    <Legend />
                    {models.map((m, i) => (
                      <Bar
                        key={m.id}
                        dataKey={`${m.name}_vol`}
                        name={m.name}
                        fill={COMPARE_COLORS[i]}
                        radius={[6, 6, 0, 0]}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Intensity chart */}
            <section>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Intensidad por fase</h4>
              <div className="bg-white border rounded-xl p-3">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="phaseIdx" tickFormatter={(v) => `Fase ${v}`} stroke="#64748b" />
                    <YAxis domain={[0, 100]} unit="%" stroke="#64748b" />
                    <Tooltip content={<PhaseTooltip models={models} type="int" />} />
                    <Legend />
                    {models.map((m, i) => (
                      <Line
                        key={m.id}
                        type="monotone"
                        dataKey={`${m.name}_int`}
                        name={m.name}
                        stroke={COMPARE_COLORS[i]}
                        strokeWidth={3}
                        dot={{ r: 5, fill: COMPARE_COLORS[i] }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Phase details table */}
            <section>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Detalle de fases</h4>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left font-semibold text-slate-600">Fase</th>
                      {models.map((m, i) => (
                        <th key={m.id} className="p-2 text-left font-semibold" style={{ color: COMPARE_COLORS[i] }}>
                          {m.icon} {m.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-bold text-slate-600">Fase {i + 1}</td>
                        {models.map((m, mi) => {
                          const p = m.phases?.[i];
                          if (!p) return <td key={m.id} className="p-2 text-slate-300">—</td>;
                          return (
                            <td key={m.id} className="p-2">
                              <div className="font-semibold text-slate-800">{p.name}</div>
                              <div className="flex gap-3 text-[10px] text-slate-500 mt-0.5">
                                <span>V {p.volume}%</span>
                                <span>I {p.intensity}%</span>
                                <span>{p.duration_weeks} sem</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Characteristics matrix */}
            {characteristicsMatrix.length > 0 && (
              <section>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Características distintivas</h4>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-2 text-left font-semibold text-slate-600 w-2/5">Característica</th>
                        {models.map((m, i) => (
                          <th key={m.id} className="p-2 text-center font-semibold" style={{ color: COMPARE_COLORS[i] }}>
                            {m.icon}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {characteristicsMatrix.map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 text-slate-700">{row.char}</td>
                          {row.rows.map((has, j) => (
                            <td key={j} className="p-2 text-center">
                              {has ? (
                                <Check className="w-4 h-4 text-emerald-500 inline" />
                              ) : (
                                <Minus className="w-4 h-4 text-slate-300 inline" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Sports matrix */}
            {sportsMatrix.length > 0 && (
              <section>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Deportes aplicables</h4>
                <div className="flex flex-wrap gap-2">
                  {sportsMatrix.map((s, i) => {
                    const supporters = s.rows.filter(Boolean).length;
                    return (
                      <div
                        key={i}
                        className={`px-2.5 py-1 rounded-full text-xs border ${
                          supporters === models.length
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {s.sport} <span className="text-[10px] text-slate-400">({supporters}/{models.length})</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PhaseTooltip = ({ active, payload, models, type }) => {
  if (!active || !payload || !payload.length) return null;
  const phaseIdx = payload[0].payload.phaseIdx;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
      <div className="font-bold mb-1 text-slate-700">Fase {phaseIdx}</div>
      {models.map((m, i) => {
        const p = m.phases?.[phaseIdx - 1];
        if (!p) return null;
        return (
          <div key={m.id} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-full" style={{ background: COMPARE_COLORS[i] }} />
            <span className="text-slate-600 flex-1">{p.name}</span>
            <span className="font-bold">{type === 'vol' ? p.volume : p.intensity}%</span>
          </div>
        );
      })}
    </div>
  );
};

export default PeriodizationComparator;

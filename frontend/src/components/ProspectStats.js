import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, TrendingUp, Trophy, BarChart3, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1 ? process.env.REACT_APP_BACKEND_URL : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));
const token = () => localStorage.getItem('train_token');
const api = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(`${API_URL}/api/recruiting${path}`, {
    method, headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

const computeAutos = (metrics, template) => {
  const out = { ...metrics };
  (template?.categories || []).forEach(c => c.metrics.forEach(m => {
    if (m.type === 'percent' && m.formula) {
      const n = (m.formula.num || []).reduce((s, k) => s + (num(out[k]) || 0), 0);
      const d = (m.formula.den || []).reduce((s, k) => s + (num(out[k]) || 0), 0);
      out[m.key] = d ? Math.round((n / d) * 1000) / 10 : 0;
    }
    if (m.type === 'diff' && m.formula) {
      out[m.key] = Math.round(((num(out[m.formula.a]) || 0) - (num(out[m.formula.b]) || 0)) * 100) / 100;
    }
  }));
  return out;
};

export default function ProspectStats({ prospectId, sport, onStatsChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('matches');
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api(`/prospects/${prospectId}/stats`)); } catch { toast.error('Error cargando estadísticas'); }
    setLoading(false);
  }, [prospectId]);
  useEffect(() => { load(); }, [load]);

  const template = data?.template;
  const agg = data?.aggregates;
  const records = data?.records || [];
  const labelMap = {};
  (template?.categories || []).forEach(c => c.metrics.forEach(m => { labelMap[m.key] = m.label; }));

  const del = async (rid) => {
    if (!window.confirm('¿Eliminar registro?')) return;
    try { await api(`/prospects/${prospectId}/stats/${rid}`, { method: 'DELETE' }); load(); onStatsChanged?.(); } catch { toast.error('Error'); }
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div data-testid="prospect-stats">
      <div className="flex items-center gap-2 mb-4">
        {[['matches', 'Por Partido/Competencia', Calendar], ['season', 'Temporada', TrendingUp]].map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)} data-testid={`stats-tab-${k}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition"
            style={tab === k ? { background: '#0f172a', color: '#CCFF00' } : { background: '#f1f5f9', color: '#64748b' }}>
            <Icon className="w-3.5 h-3.5" /> {l}
          </button>
        ))}
        <Button size="sm" onClick={() => setAddOpen(true)} className="ml-auto bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold" data-testid="stats-add-btn"><Plus className="w-4 h-4 mr-1" />Registrar</Button>
      </div>

      {tab === 'matches' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {records.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-[11px] uppercase text-slate-400">
                  <th className="text-left px-3 py-2 font-bold">Fecha</th>
                  <th className="text-left px-3 py-2 font-bold">Rival</th>
                  <th className="text-left px-3 py-2 font-bold">Competencia</th>
                  <th className="text-left px-3 py-2 font-bold">{labelMap[agg?.primary] || 'Destacado'}</th>
                  <th className="px-3 py-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(r => (
                    <tr key={r.id} data-testid={`stat-row-${r.id}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700 font-medium">{r.date}</td>
                      <td className="px-3 py-2 text-slate-600">{r.opponent || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{r.competition || '—'}</td>
                      <td className="px-3 py-2 font-black text-slate-800">{r.metrics?.[agg?.primary] ?? '—'}</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => del(r.id)} className="text-slate-300 hover:text-red-500" data-testid={`stat-del-${r.id}`}><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty text="Sin registros. Pulsa “Registrar” para agregar un partido/competencia." />}
        </div>
      )}

      {tab === 'season' && (
        <SeasonView agg={agg} labelMap={labelMap} />
      )}

      {addOpen && <AddRecordDialog template={template} onClose={() => setAddOpen(false)}
        onSaved={() => { setAddOpen(false); load(); onStatsChanged?.(); }} prospectId={prospectId} />}
    </div>
  );
}

function SeasonView({ agg, labelMap }) {
  const [metric, setMetric] = useState(agg?.primary);
  if (!agg || !agg.count) return <Empty text="Aún no hay datos de temporada. Registra partidos para ver promedios y evolución." />;
  const numericKeys = Object.keys(agg.averages || {});
  const chartKey = metric && numericKeys.includes(metric) ? metric : numericKeys[0];
  const best = agg.best;
  return (
    <div className="space-y-4">
      {/* Average cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {numericKeys.slice(0, 8).map(k => (
          <div key={k} className="bg-white rounded-xl border border-slate-200 p-3">
            <div className="text-[10px] font-bold uppercase text-slate-400 truncate">{labelMap[k] || k}</div>
            <div className="text-2xl font-black text-slate-800">{agg.averages[k]}</div>
            <div className="text-[10px] text-slate-400">prom · tot {agg.totals[k]}</div>
          </div>
        ))}
      </div>

      {/* Best performance */}
      {best && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'linear-gradient(120deg,#0f172a,#13203a)' }}>
          <Trophy className="w-8 h-8 text-[#CCFF00]" />
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-bold">Mejor actuación</div>
            <div className="text-white font-black">{best.opponent || best.competition || best.date} · {labelMap[agg.primary] || agg.primary}: <span className="text-[#CCFF00]">{best.metrics?.[agg.primary]}</span></div>
            <div className="text-[11px] text-slate-400">{best.date} {best.competition ? `· ${best.competition}` : ''}</div>
          </div>
        </div>
      )}

      {/* Evolution chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-700 font-black text-sm"><BarChart3 className="w-4 h-4" />Evolución</div>
          <select value={chartKey} onChange={(e) => setMetric(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700" data-testid="stats-chart-metric">
            {numericKeys.map(k => <option key={k} value={k}>{labelMap[k] || k}</option>)}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={agg.series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Line type="monotone" dataKey={chartKey} stroke="#0f172a" strokeWidth={2.5} dot={{ r: 4, fill: '#CCFF00', stroke: '#0f172a', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AddRecordDialog({ template, prospectId, onClose, onSaved }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), opponent: '', competition: '', result: '', metrics: {} });
  const [saving, setSaving] = useState(false);
  const computed = computeAutos(form.metrics, template);
  const setM = (k, v) => setForm(f => ({ ...f, metrics: { ...f.metrics, [k]: v } }));

  const save = async () => {
    setSaving(true);
    try {
      await api(`/prospects/${prospectId}/stats`, { method: 'POST', body: { ...form, metrics: computed } });
      toast.success('Registro guardado'); onSaved();
    } catch { toast.error('Error guardando'); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[92vh] overflow-y-auto" data-testid="stats-add-dialog">
        <DialogHeader><DialogTitle>Registrar partido/competencia</DialogTitle>
          <DialogDescription>Las eficiencias en % se calculan automáticamente.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <Lbl l="Fecha"><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-white" data-testid="stat-date" /></Lbl>
          <Lbl l="Rival"><Input value={form.opponent} onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))} className="bg-white" data-testid="stat-opponent" /></Lbl>
          <Lbl l="Competencia"><Input value={form.competition} onChange={e => setForm(f => ({ ...f, competition: e.target.value }))} className="bg-white" /></Lbl>
          <Lbl l="Resultado"><Input value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} className="bg-white" placeholder="3-1" /></Lbl>
        </div>
        <div className="space-y-3">
          {(template?.categories || []).map(c => (
            <div key={c.key} className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-black text-slate-700 mb-2">{c.label}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {c.metrics.map(m => {
                  const auto = m.type === 'percent' || m.type === 'diff';
                  return (
                    <Lbl key={m.key} l={m.label + (auto ? ' (auto)' : '')}>
                      {auto ? (
                        <div className="h-9 px-3 flex items-center rounded-md bg-slate-100 text-slate-700 font-bold text-sm" data-testid={`stat-auto-${m.key}`}>{computed[m.key] ?? 0}{m.type === 'percent' ? '%' : ''}</div>
                      ) : (
                        <Input type={m.type === 'text' ? 'text' : 'number'} value={form.metrics[m.key] ?? ''} onChange={e => setM(m.key, m.type === 'text' ? e.target.value : (e.target.value === '' ? '' : parseFloat(e.target.value)))} className="bg-white" data-testid={`stat-m-${m.key}`} />
                      )}
                    </Lbl>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="mt-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800" data-testid="stat-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Lbl = ({ l, children }) => (<div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{l}</label><div className="mt-1">{children}</div></div>);
const Empty = ({ text }) => <div className="py-10 text-center text-slate-400 text-sm">{text}</div>;

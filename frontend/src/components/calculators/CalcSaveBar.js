import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Save, Loader2, User, ClipboardList, Trash2, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const token = () => localStorage.getItem('train_token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

const apiGet = async (path) => {
  const r = await fetch(`${API_URL}/api${path}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const apiSend = async (path, method, body) => {
  const r = await fetch(`${API_URL}/api${path}`, {
    method, headers: { ...authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const dedupe = (items) => {
  const seen = new Set(); const out = [];
  for (const it of items) { if (!seen.has(it.label)) { seen.add(it.label); out.push(it); } }
  return out;
};

// ───────── Barra de guardado dentro de cada CalcCard ─────────
export const SaveResultBar = ({ store, color = '#3B82F6' }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  const onOpen = () => {
    const s = store.current;
    const items = dedupe(s.items || []);
    if (!s.headline && !items.length) {
      toast.info(t('calculators.saveBarFillFirst'));
      return;
    }
    setSnapshot({
      calculator: s.calculator, title: s.title, module: s.module, color: s.color,
      headline: s.headline, items,
    });
    setOpen(true);
  };

  return (
    <>
      <div className="pt-1 flex justify-end">
        <button onClick={onOpen} data-testid={`calc-save-btn-${store.current.calculator}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition hover:opacity-90"
          style={{ background: `${color}15`, color }}>
          <Save className="w-3.5 h-3.5" /> {t('calculators.saveToAthlete')}
        </button>
      </div>
      {open && <SaveDialog snapshot={snapshot} onClose={() => setOpen(false)} />}
    </>
  );
};

function SaveDialog({ snapshot, onClose }) {
  const { t } = useTranslation();
  const [athletes, setAthletes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [athleteId, setAthleteId] = useState('');
  const [planId, setPlanId] = useState('none');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([apiGet('/athletes'), apiGet('/training-plans').catch(() => [])])
      .then(([a, p]) => { setAthletes(a || []); setPlans(Array.isArray(p) ? p : []); })
      .catch(() => toast.error(t('calculators.errLoadAthletes')))
      .finally(() => setLoading(false));
  }, []);

  const athletePlans = plans.filter(p => p.athlete_id === athleteId);

  const save = async () => {
    if (!athleteId) { toast.error(t('calculators.selectAthlete')); return; }
    setSaving(true);
    try {
      await apiSend('/calculator-results', 'POST', {
        athlete_id: athleteId,
        plan_id: planId === 'none' ? null : planId,
        calculator: snapshot.calculator || 'calc',
        title: snapshot.title || t('calculators.resultDefault'),
        module: snapshot.module,
        color: snapshot.color,
        headline: snapshot.headline,
        items: snapshot.items,
        note: note || null,
      });
      toast.success(t('calculators.savedToProfile'));
      onClose();
    } catch (e) { toast.error(t('calculators.saveFailed')); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white" data-testid="calc-save-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Save className="w-5 h-5 text-emerald-500" />{t('calculators.saveResultTitle')}</DialogTitle>
          <DialogDescription>{snapshot.title}</DialogDescription>
        </DialogHeader>

        {/* Preview del resultado */}
        <div className="rounded-xl p-3 border border-slate-200 bg-slate-50">
          {snapshot.headline && (
            <div className="mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">{snapshot.headline.label}</span>
              <div className="text-xl font-extrabold" style={{ color: snapshot.color }}>{snapshot.headline.value}{snapshot.headline.unit ? ` ${snapshot.headline.unit}` : ''}</div>
            </div>
          )}
          {!!snapshot.items.length && (
            <div className="flex flex-wrap gap-1 mt-1">
              {snapshot.items.slice(0, 8).map((it, i) => (
                <span key={i} className="text-[10px] bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-600">{it.label}: <b>{it.value}</b></span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : (
          <div className="space-y-3 py-1">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">{t('calculators.athleteRequired')}</label>
              <Select value={athleteId} onValueChange={(v) => { setAthleteId(v); setPlanId('none'); }}>
                <SelectTrigger className="bg-white mt-1" data-testid="calc-save-athlete"><SelectValue placeholder={t('calculators.selectAthlete')} /></SelectTrigger>
                <SelectContent>
                  {athletes.length ? athletes.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)
                    : <div className="px-2 py-1.5 text-xs text-slate-400">{t('calculators.noAthletesCreate')}</div>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">{t('calculators.planOptional')}</label>
              <Select value={planId} onValueChange={setPlanId} disabled={!athleteId}>
                <SelectTrigger className="bg-white mt-1" data-testid="calc-save-plan"><SelectValue placeholder={t('calculators.noPlanPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('calculators.noSpecificPlan')}</SelectItem>
                  {athletePlans.map(p => <SelectItem key={p.id} value={p.id}>{p.name || t('calculators.planDefault')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase">{t('calculators.noteOptional')}</label>
              <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} className="bg-white mt-1" placeholder={t('calculators.notePlaceholder')} data-testid="calc-save-note" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('calculators.cancel')}</Button>
          <Button onClick={save} disabled={saving || loading} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="calc-save-confirm">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}{t('calculators.saveBtn')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────── Historial de resultados guardados (para el Hub) ─────────
export const CalcResultsHistory = () => {
  const { t } = useTranslation();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    apiGet('/calculator-results').then(d => setResults(d.results || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    try { await apiSend(`/calculator-results/${id}`, 'DELETE'); setResults(r => r.filter(x => x.id !== id)); toast.success(t('calculators.deleted')); }
    catch { toast.error(t('calculators.errorGeneric')); }
  };

  const groups = results.reduce((acc, r) => { const key = r.athlete_name || t('calculators.noAthlete'); (acc[key] = acc[key] || []).push(r); return acc; }, {});
  const entries = Object.entries(groups);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  if (!results.length) return (
    <div className="text-center py-10 text-slate-400 text-sm" data-testid="calc-history-empty">
      <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-200" />
      {t('calculators.historyEmptyPrefix')} <b>“{t('calculators.saveToAthlete')}”</b> {t('calculators.historyEmptySuffix')}
    </div>
  );

  return (
    <div className="space-y-3" data-testid="calc-history">
      {entries.map(([name, rows]) => {
        const open = openGroups[name] ?? true;
        return (
          <div key={name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={() => setOpenGroups(g => ({ ...g, [name]: !open }))} className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black"><User className="w-4 h-4" /></div>
              <span className="font-black text-slate-800">{name}</span>
              <span className="text-xs text-slate-400">{t('calculators.resultsCount', { n: rows.length })}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="divide-y divide-slate-100">
                {rows.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5" data-testid={`calc-history-row-${r.id}`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: r.color || '#10b981' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{r.title}{r.plan_name ? <span className="text-[11px] text-slate-400 font-normal"> · {r.plan_name}</span> : ''}</div>
                      <div className="text-[12px] text-slate-500 truncate">
                        {r.headline ? `${r.headline.label}: ${r.headline.value}${r.headline.unit ? ' ' + r.headline.unit : ''}` : (r.items?.[0] ? `${r.items[0].label}: ${r.items[0].value}` : '')}
                        {r.note ? ` — ${r.note}` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{(r.created_at || '').slice(0, 10)}</span>
                    <button onClick={() => del(r.id)} className="text-slate-300 hover:text-red-500 p-1" data-testid={`calc-history-delete-${r.id}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

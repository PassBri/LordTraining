import React, { useState, useEffect } from 'react';
import i18nInstance from '../i18n';
import { useTranslation } from 'react-i18next';
import { Loader2, AlertTriangle, CalendarClock, ClipboardX, Settings2, BellRing } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { api } from './scoutingApi';

// i18n: auto-traducción slug-based (scouting.lbl.*)
const _slug = (s) => (s == null ? '' : s.toString()).toLowerCase()
  .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
  .replace(/₂/g,'2').replace(/²/g,'2').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const tt = (s) => {
  if (s == null || s === '' || typeof s === 'number') return s;
  const k = _slug(s);
  return k ? i18nInstance.t(`scouting.lbl.${k}`, { defaultValue: s }) : s;
};

const SEV = {
  danger: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Crítico' },
  warning: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', label: 'Atención' },
  info: { color: '#D4AF37', bg: '#f0f9ff', border: '#bae6fd', label: 'Info' },
};
const ICON = { no_evaluation: ClipboardX, stale_evaluation: ClipboardX, contract_expired: CalendarClock, contract_expiring: CalendarClock, sponsor_expired: CalendarClock, sponsor_expiring: CalendarClock };

export default function ScoutingAlerts({ onOpen }) {
  useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState({ eval_days: 14, expiry_days: 30 });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api('/alerts').then(d => { setData(d); setCfg(d.settings); }).catch(() => setData({ alerts: [], counts: {}, total: 0 })).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const saveCfg = async () => {
    setSaving(true);
    try { await api('/settings', { method: 'PUT', body: { eval_days: Number(cfg.eval_days), expiry_days: Number(cfg.expiry_days) } }); toast.success(tt('Preferencias guardadas')); load(); }
    catch { toast.error(tt('Error guardando preferencias')); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  const counts = data.counts || {};
  return (
    <div className="space-y-5" data-testid="scouting-alerts">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Counters */}
        <div className="md:col-span-2 grid grid-cols-3 gap-3">
          {['danger', 'warning', 'info'].map(s => (
            <div key={s} className="rounded-xl p-4 border" style={{ background: SEV[s].bg, borderColor: SEV[s].border }}>
              <div className="text-[11px] font-black uppercase" style={{ color: SEV[s].color }}>{SEV[s].label}</div>
              <div className="text-3xl font-black" style={{ color: SEV[s].color }}>{counts[s] || 0}</div>
            </div>
          ))}
        </div>
        {/* Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-black text-slate-800"><Settings2 className="w-4 h-4 text-slate-500" />Preferencias</div>
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500">Avisar si no se evalúa en (días)</label>
            <Input type="number" min="1" value={cfg.eval_days} onChange={e => setCfg(c => ({ ...c, eval_days: e.target.value }))} className="bg-white h-8" data-testid="alerts-eval-days" />
            <label className="block text-[11px] font-bold text-slate-500">Avisar vencimientos con (días) de antelación</label>
            <Input type="number" min="1" value={cfg.expiry_days} onChange={e => setCfg(c => ({ ...c, expiry_days: e.target.value }))} className="bg-white h-8" data-testid="alerts-expiry-days" />
            <Button size="sm" onClick={saveCfg} disabled={saving} className="w-full bg-slate-900 text-white" data-testid="alerts-save-settings">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-amber-500" /><span className="font-black text-slate-800">{tt('Alertas y seguimiento')}</span>
          <span className="text-xs text-slate-400 ml-auto">{data.total} activas</span>
        </div>
        <div className="divide-y divide-slate-100">
          {(data.alerts || []).map((a, i) => {
            const sv = SEV[a.severity] || SEV.info;
            const Icon = ICON[a.type] || AlertTriangle;
            return (
              <button key={i} onClick={() => onOpen && onOpen(a.prospect_id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left" data-testid={`alert-row-${i}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: sv.color + '22' }}><Icon className="w-4 h-4" style={{ color: sv.color }} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{a.name}</div>
                  <div className="text-[12px] text-slate-500 truncate">{a.message}</div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0" style={{ background: sv.color + '22', color: sv.color }}>{tt(sv.label)}</span>
              </button>
            );
          })}
          {!(data.alerts || []).length && (
            <div className="p-10 text-center text-slate-400 text-sm">{tt('🎉 Todo al día. No hay alertas pendientes.')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

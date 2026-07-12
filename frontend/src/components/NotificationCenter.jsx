import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Mail, TrendingUp, X, Inbox, Rocket, Award, AlertTriangle, Settings, Check, Trash2 } from 'lucide-react';
import { Switch } from './ui/switch';
import { enablePush, disablePush, pushPermission, pushSupported } from '../lib/webpush';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('train_token')}` });

const META = {
  showcase_lead: { Icon: Mail, cls: 'bg-blue-100 text-blue-600', label: 'Contactos' },
  showcase_weekly: { Icon: TrendingUp, cls: 'bg-emerald-100 text-emerald-600', label: 'Resumen' },
  recruiting_promote: { Icon: Rocket, cls: 'bg-violet-100 text-violet-600', label: 'Promover' },
  recruiting_levelup: { Icon: Award, cls: 'bg-amber-100 text-amber-600', label: 'Nivel' },
  health_alert: { Icon: AlertTriangle, cls: 'bg-rose-100 text-rose-600', label: 'Salud' },
};
const metaFor = (t) => META[t] || { Icon: Bell, cls: 'bg-slate-100 text-slate-600', label: 'Otro' };
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'ahora'; if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`; return `hace ${Math.floor(s / 86400)} d`;
};

export default function NotificationCenter({ onClose, onNavigate }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [types, setTypes] = useState({});
  const [pushState, setPushState] = useState(pushPermission());

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/notifications?limit=200`, { headers: authHeaders() });
      const d = await r.json();
      setItems(d.items || []);
    } catch {}
  }, []);
  useEffect(() => {
    load();
    fetch(`${API_URL}/api/notifications/preferences`, { headers: authHeaders() })
      .then(r => r.json()).then(d => { setPrefs(d.prefs); setTypes(d.types || {}); }).catch(() => {});
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [load]);

  const filtered = filter === 'all' ? items : items.filter(n => n.type === filter);
  const counts = items.reduce((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {});

  const markRead = async (id) => {
    setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'POST', headers: authHeaders() }).catch(() => {});
  };
  const markAll = async () => {
    setItems(p => p.map(n => ({ ...n, read: true })));
    fetch(`${API_URL}/api/notifications/read-all`, { method: 'POST', headers: authHeaders() }).catch(() => {});
  };
  const remove = async (id) => {
    setItems(p => p.filter(n => n.id !== id));
    fetch(`${API_URL}/api/notifications/${id}`, { method: 'DELETE', headers: authHeaders() }).catch(() => {});
  };
  const openItem = (n) => {
    if (!n.read) markRead(n.id);
    if (n.link && n.link.startsWith('scouting:') && onNavigate) { onNavigate(n.link.split(':')[1]); onClose(); }
  };
  const togglePref = async (t) => {
    const next = { ...prefs, [t]: !prefs[t] };
    setPrefs(next);
    fetch(`${API_URL}/api/notifications/preferences`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ prefs: { [t]: next[t] } }) }).catch(() => {});
  };
  const togglePush = async () => {
    if (pushState === 'granted') { await disablePush(); setPushState('default'); return; }
    try { await enablePush(); setPushState('granted'); }
    catch (e) { setPushState(e.message === 'denied' ? 'denied' : pushPermission()); }
  };

  const tabs = [['all', 'Todas'], ...Object.keys(META).map(t => [t, metaFor(t).label])];

  return createPortal((
    <div className="fixed inset-0 z-[80] flex items-start sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)' }} onClick={onClose} data-testid="notification-center">
      <div className="w-full max-w-lg bg-white rounded-none sm:rounded-2xl shadow-2xl overflow-hidden max-h-full sm:max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-base font-black text-slate-800 flex items-center gap-2"><Bell className="w-5 h-5 text-[#007AFF]" />Centro de notificaciones</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowPrefs(s => !s)} className={`p-2 rounded-lg transition ${showPrefs ? 'bg-slate-100 text-[#007AFF]' : 'text-slate-400 hover:bg-slate-50'}`} title="Preferencias" data-testid="notif-prefs-toggle"><Settings className="w-4.5 h-4.5" /></button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50" data-testid="notif-center-close"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {showPrefs && prefs && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100" data-testid="notif-prefs-panel">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Activar / silenciar avisos</p>
            <div className="space-y-2">
              {Object.entries(types).map(([t, label]) => {
                const { Icon, cls } = metaFor(t);
                return (
                  <div key={t} className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${cls}`}><Icon className="w-3.5 h-3.5" /></span>
                    <span className="flex-1 text-[13px] font-semibold text-slate-700">{label}</span>
                    <Switch checked={!!prefs[t]} onCheckedChange={() => togglePref(t)} data-testid={`pref-${t}`} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-1.5 px-3 py-2 border-b border-slate-100 overflow-x-auto">
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} data-testid={`notif-filter-${k}`}
              className={`px-2.5 py-1 rounded-full text-[12px] font-bold whitespace-nowrap transition ${filter === k ? 'bg-[#0f172a] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {label}{k !== 'all' && counts[k] ? ` ${counts[k]}` : ''}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-1.5">
          <span className="text-[11px] text-slate-400">{filtered.length} notificación(es)</span>
          <button onClick={markAll} className="text-[11px] font-semibold text-[#007AFF] hover:underline" data-testid="notif-center-mark-all">Marcar todo leído</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-400" data-testid="notif-center-empty"><Inbox className="w-9 h-9" /><span className="text-sm">Sin notificaciones</span></div>
          ) : filtered.map(n => {
            const { Icon, cls } = metaFor(n.type);
            return (
              <div key={n.id} className={`group flex items-start gap-3 px-4 py-3 border-b border-slate-50 ${n.read ? '' : 'bg-blue-50/40'}`} data-testid={`center-notif-${n.id}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cls}`}><Icon className="w-4.5 h-4.5" /></div>
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openItem(n)}>
                  <div className="flex items-center gap-1.5">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] shrink-0" />}
                    <p className="text-[14px] font-bold text-slate-800 truncate">{n.title}</p>
                  </div>
                  <p className="text-[13px] text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!n.read && <button onClick={() => markRead(n.id)} className="text-slate-300 hover:text-emerald-500" title="Marcar leído" data-testid={`center-read-${n.id}`}><Check className="w-4 h-4" /></button>}
                  <button onClick={() => remove(n.id)} className="text-slate-300 hover:text-red-500" title="Eliminar" data-testid={`center-del-${n.id}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ), document.body);
}

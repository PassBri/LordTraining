import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, Mail, TrendingUp, Check, X, Inbox, Rocket, Award, AlertTriangle, List } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('train_token')}` });

const iconFor = (type) => ({
  showcase_weekly: TrendingUp,
  showcase_lead: Mail,
  recruiting_promote: Rocket,
  recruiting_levelup: Award,
  health_alert: AlertTriangle,
}[type] || Bell);
const styleFor = (type) => ({
  showcase_weekly: 'bg-emerald-100 text-emerald-600',
  showcase_lead: 'bg-blue-100 text-blue-600',
  recruiting_promote: 'bg-violet-100 text-violet-600',
  recruiting_levelup: 'bg-amber-100 text-amber-600',
  health_alert: 'bg-rose-100 text-rose-600',
}[type] || 'bg-slate-100 text-slate-600');

const playDing = () => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    [[880, 0], [1174.66, 0.12]].forEach(([freq, t]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.13, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.4);
      o.start(now + t); o.stop(now + t + 0.42);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* silent */ }
};

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
};

export default function NotificationsBell({ onNavigate, onOpenWeeklySummary }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const seenIds = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/notifications`, { headers: authHeaders() });
      if (!r.ok) return;
      const d = await r.json();
      const list = d.items || [];
      // Detectar leads nuevos para sonido/efecto (no en la primera carga)
      if (seenIds.current === null) {
        seenIds.current = new Set(list.map(n => n.id));
      } else {
        const fresh = list.filter(n => !seenIds.current.has(n.id));
        list.forEach(n => seenIds.current.add(n.id));
        if (fresh.some(n => n.type === 'showcase_lead')) {
          playDing();
          setPulse(true);
          setTimeout(() => setPulse(false), 2500);
        }
      }
      setItems(list); setUnread(d.unread || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    // Genera resumen semanal + avisos accionables si corresponde, luego carga
    Promise.allSettled([
      fetch(`${API_URL}/api/recruiting/showcase/weekly-digest`, { method: 'POST', headers: authHeaders() }),
      fetch(`${API_URL}/api/recruiting/notify-digest`, { method: 'POST', headers: authHeaders() }),
      fetch(`${API_URL}/api/notifications/sync-health`, { method: 'POST', headers: authHeaders() }),
    ]).finally(load);
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [load]);

  const markRead = async (id) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(u => Math.max(0, u - 1));
    try { await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'POST', headers: authHeaders() }); } catch {}
  };
  const markAll = async () => {
    setItems(prev => prev.map(n => ({ ...n, read: true }))); setUnread(0);
    try { await fetch(`${API_URL}/api/notifications/read-all`, { method: 'POST', headers: authHeaders() }); } catch {}
  };
  const remove = async (id, e) => {
    e.stopPropagation();
    setItems(prev => prev.filter(n => n.id !== id));
    try { await fetch(`${API_URL}/api/notifications/${id}`, { method: 'DELETE', headers: authHeaders() }); load(); } catch {}
  };
  const openItem = (n) => {
    if (!n.read) markRead(n.id);
    if (n.link && n.link.startsWith('scouting:') && onNavigate) onNavigate(n.link.split(':')[1] || 'showcase');
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} data-testid="notifications-bell"
        className="group flex flex-col items-center gap-1 shrink-0 outline-none relative">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-white shadow-md border hover:shadow-lg hover:text-[#007AFF] ${pulse ? 'text-[#007AFF] border-[#007AFF] animate-bounce' : 'text-slate-500 border-slate-100'}`}>
          <Bell className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.8} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#007AFF] border-2 border-white flex items-center justify-center text-[9px] font-bold text-white" data-testid="notifications-count-badge">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-400 group-hover:text-[#007AFF] transition-colors duration-300">Avisos</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-[70px] right-4 z-[70] w-80 rounded-xl bg-white shadow-xl border border-slate-150 overflow-hidden" data-testid="notifications-menu">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
              <span className="text-sm font-black text-slate-800 flex items-center gap-1.5"><Bell className="w-4 h-4 text-[#007AFF]" />Notificaciones</span>
              {unread > 0 && <button onClick={markAll} className="text-[11px] font-semibold text-[#007AFF] hover:underline" data-testid="notifications-mark-all">Marcar todo leído</button>}
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-slate-400" data-testid="notifications-empty">
                  <Inbox className="w-8 h-8" /><span className="text-sm">Sin notificaciones</span>
                </div>
              ) : items.map(n => {
                const Icon = iconFor(n.type);
                return (
                  <div key={n.id} onClick={() => openItem(n)} data-testid={`notification-${n.id}`}
                    className={`group/item flex items-start gap-2.5 px-3 py-2.5 border-b border-slate-50 cursor-pointer transition ${n.read ? 'hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${styleFor(n.type)}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] shrink-0" />}
                        <p className="text-[13px] font-bold text-slate-800 truncate">{n.title}</p>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    <button onClick={(e) => remove(n.id, e)} className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 transition shrink-0" data-testid={`notification-del-${n.id}`}><X className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50">
              {onOpenWeeklySummary && (
                <button onClick={() => { setOpen(false); onOpenWeeklySummary(); }} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-slate-600 hover:text-[#007AFF] py-1.5 rounded-lg hover:bg-white transition" data-testid="notif-open-weekly">
                  <TrendingUp className="w-3.5 h-3.5" />Resumen semanal
                </button>
              )}
              <button onClick={() => { setOpen(false); setCenterOpen(true); }} className="flex-1 flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#007AFF] py-1.5 rounded-lg hover:bg-white transition" data-testid="notif-open-center">
                <List className="w-3.5 h-3.5" />Ver todo
              </button>
            </div>
          </div>
        </>
      )}
      {centerOpen && <NotificationCenter onClose={() => { setCenterOpen(false); load(); }} onNavigate={onNavigate} />}
    </div>
  );
}

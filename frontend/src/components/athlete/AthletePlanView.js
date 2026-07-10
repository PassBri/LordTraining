import React, { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Clock, Activity, Trophy, X, Loader2, MapPin } from 'lucide-react';

const CAP_COLORS = {
  fuerza: '#F97316', resistencia: '#EF4444', velocidad: '#EAB308', flexibilidad: '#D4AF37',
  coordinacion: '#10B981', tecnica: '#8B5CF6', tactica: '#EC4899', recuperacion: '#06B6D4', default: '#64748B',
};
const capColor = (cap) => {
  const c = (cap || '').toLowerCase();
  for (const k of Object.keys(CAP_COLORS)) { if (k !== 'default' && c.includes(k)) return CAP_COLORS[k]; }
  return CAP_COLORS.default;
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const AthletePlanView = ({ athleteName, plan, sessions = [], competitions = [], onComplete }) => {
  const { t } = useTranslation();
  const sessionsByDay = useMemo(() => {
    const map = {};
    sessions.forEach((s) => { if (s.fecha) { const k = s.fecha.slice(0, 10); (map[k] = map[k] || []).push(s); } });
    return map;
  }, [sessions]);

  const firstDate = useMemo(() => {
    const keys = Object.keys(sessionsByDay).sort();
    return keys.length ? new Date(keys[0] + 'T00:00:00') : new Date();
  }, [sessionsByDay]);

  const todayStr = ymd(new Date());
  const initMonth = useMemo(() => {
    const keys = Object.keys(sessionsByDay).sort();
    const nowM = todayStr.slice(0, 7);
    if (keys.some((k) => k.slice(0, 7) === nowM)) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  }, [sessionsByDay, firstDate, todayStr]);

  const [month, setMonth] = useState(initMonth);
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [modalSession, setModalSession] = useState(null);

  const dayStatus = (dateStr, list) => {
    if (!list || !list.length) return 'rest';
    if (list.every((s) => s.completada)) return 'completed';
    if (dateStr < todayStr) return 'missed';
    return 'scheduled';
  };

  const grid = useMemo(() => {
    const y = month.getFullYear(); const m = month.getMonth();
    const first = new Date(y, m, 1);
    const startPad = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(new Date(y, m, d));
    return cells;
  }, [month]);

  const completed = sessions.filter((s) => s.completada).length;
  const pastDue = sessions.filter((s) => s.fecha && s.fecha.slice(0, 10) < todayStr).length;
  const adherence = pastDue ? Math.round((completed / pastDue) * 100) : 0;
  const selSessions = sessionsByDay[selectedDay] || [];

  const STATUS_DOT = { completed: '#22C55E', missed: '#EF4444', scheduled: '#D4AF37', rest: 'transparent' };

  return (
    <div className="space-y-5" data-testid="athlete-plan-view">
      {/* Header / KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('athlete.kpiSessions'), value: sessions.length, icon: CalendarDays },
          { label: t('athlete.kpiCompleted'), value: completed, icon: CheckCircle2 },
          { label: t('athlete.kpiAdherence'), value: `${adherence}%`, icon: Activity },
          { label: t('athlete.kpiWeeks'), value: plan?.total_weeks || 0, icon: Clock },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl bg-slate-900/70 border border-white/10 p-4" data-testid={`athlete-kpi-${k.label}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400">{k.label}</span>
              <k.icon className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <p className="text-3xl font-bold text-white mt-1" style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2"><CalendarDays className="w-5 h-5 text-[#D4AF37]" />{t('athlete.calendar')}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300" data-testid="athlete-cal-prev"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-white font-medium w-36 text-center">{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
              <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300" data-testid="athlete-cal-next"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-1">{DOW.map((d) => <div key={d} className="text-center text-[11px] text-slate-500 font-semibold">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const ds = ymd(d);
              const list = sessionsByDay[ds] || [];
              const st = dayStatus(ds, list);
              const isSel = ds === selectedDay;
              const isToday = ds === todayStr;
              return (
                <button key={i} onClick={() => setSelectedDay(ds)} data-testid={`athlete-cal-day-${d.getDate()}`}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${isSel ? 'bg-[#D4AF37] text-slate-900 font-bold' : list.length ? 'bg-white/5 hover:bg-white/10 text-white' : 'text-slate-600'} ${isToday && !isSel ? 'ring-1 ring-[#D4AF37]/60' : ''}`}>
                  {d.getDate()}
                  {list.length > 0 && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSel ? '#0f172a' : STATUS_DOT[st] }} />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22C55E]" />{t('athlete.legendCompleted')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#D4AF37]" />{t('athlete.legendScheduled')}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]" />{t('athlete.legendMissed')}</span>
          </div>
        </div>

        {/* Day sessions + competitions */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-5">
            <h3 className="text-white font-semibold mb-3 text-sm">{selectedDay === todayStr ? t('athlete.today') : new Date(selectedDay + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
            {selSessions.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 text-center">{t('athlete.restDay')}</p>
            ) : (
              <div className="space-y-2.5">
                {selSessions.map((s) => (
                  <div key={s.id} className="rounded-xl bg-white/5 border border-white/10 p-3" data-testid={`athlete-session-${s.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{s.nombre}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: capColor(s.capacidad_principal) + '40' }}>{s.capacidad_principal || 'general'}</span>
                          <span className="text-[10px] text-slate-400">{s.duracion_minutos}min</span>
                          <span className="text-[10px] text-slate-400">{t('athlete.week')} {s.semana}</span>
                        </div>
                        {s.completada && s.rpe_reportado != null && <p className="text-[11px] text-emerald-400 mt-1">RPE {s.rpe_reportado}{s.comentario_atleta ? ` · ${s.comentario_atleta}` : ''}</p>}
                      </div>
                      {s.completada ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : null}
                    </div>
                    <button onClick={() => setModalSession(s)} data-testid={`athlete-mark-${s.id}`}
                      className={`mt-2.5 w-full h-8 rounded-lg text-xs font-semibold transition-colors ${s.completada ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-[#D4AF37] text-slate-900 hover:brightness-95'}`}>
                      {s.completada ? t('athlete.editRecord') : t('athlete.markCompleted')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {competitions.length > 0 && (
            <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-5">
              <h3 className="text-white font-semibold mb-3 text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" />{t('athlete.upcomingCompetitions')}</h3>
              <div className="space-y-2">
                {competitions.map((c, i) => (
                  <div key={i} className="rounded-xl bg-white/5 p-2.5">
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{c.location || '—'} · {c.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalSession && (
        <CompleteModal session={modalSession} onClose={() => setModalSession(null)} onSave={onComplete} />
      )}
    </div>
  );
};

const CompleteModal = ({ session, onClose, onSave }) => {
  const { t } = useTranslation();
  const [completada, setCompletada] = useState(session.completada ?? true);
  const [rpe, setRpe] = useState(session.rpe_reportado ?? 7);
  const [comentario, setComentario] = useState(session.comentario_atleta ?? '');
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    setSaving(true);
    try { await onSave(session.id, { completada, rpe: completada ? Number(rpe) : null, comentario: completada ? comentario : '' }); onClose(); }
    finally { setSaving(false); }
  }, [completada, rpe, comentario, onSave, session.id, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6" onClick={(e) => e.stopPropagation()} data-testid="athlete-complete-modal">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">{session.nombre}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-2 mb-5">
          <button onClick={() => setCompletada(true)} className={`flex-1 h-10 rounded-lg text-sm font-semibold ${completada ? 'bg-[#D4AF37] text-slate-900' : 'bg-white/5 text-slate-300'}`} data-testid="athlete-modal-done">{t('athlete.legendCompleted')}</button>
          <button onClick={() => setCompletada(false)} className={`flex-1 h-10 rounded-lg text-sm font-semibold ${!completada ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-300'}`} data-testid="athlete-modal-pending">{t('athlete.notDone')}</button>
        </div>
        {completada && (
          <>
            <label className="text-xs text-slate-400 uppercase tracking-wider">{t('athlete.perceivedEffort')}: <span className="text-[#D4AF37] font-bold">{rpe}</span></label>
            <input type="range" min="1" max="10" step="0.5" value={rpe} onChange={(e) => setRpe(e.target.value)} className="w-full mt-2 accent-[#D4AF37]" data-testid="athlete-modal-rpe" />
            <label className="text-xs text-slate-400 uppercase tracking-wider block mt-4 mb-1.5">{t('athlete.comment')}</label>
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} maxLength={300} placeholder={t('athlete.howDidYouFeel')} className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-sm p-2.5 placeholder:text-slate-500" data-testid="athlete-modal-comment" />
          </>
        )}
        <button onClick={save} disabled={saving} className="w-full h-11 mt-5 rounded-lg bg-[#D4AF37] text-slate-900 font-semibold flex items-center justify-center gap-2" data-testid="athlete-modal-save">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{t('athlete.save')}
        </button>
      </div>
    </div>
  );
};

export default AthletePlanView;

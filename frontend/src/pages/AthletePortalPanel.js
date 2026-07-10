import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, LogOut, Heart, Trophy, Activity, ClipboardList, BellRing, X } from 'lucide-react';
import AthletePlanView from '../components/athlete/AthletePlanView';
import { athleteGetPlan, athleteCompleteSession, athleteSaveReadiness, athleteGetReadiness, athleteGetRecords } from '../services/athleteApi';

const AthletePortalPanel = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState('plan');
  const [plan, setPlan] = useState(null);
  const [records, setRecords] = useState({ records: [], capabilities: [] });
  const [readiness, setReadiness] = useState({ sleep: 80, muscle_soreness: 30, stress: 30, motivation: 85, notes: '' });
  const [todayReadiness, setTodayReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingR, setSavingR] = useState(false);
  const info = JSON.parse(localStorage.getItem('athlete_info') || '{}');

  const loadAll = useCallback(async () => {
    if (!localStorage.getItem('athlete_token')) { navigate('/atleta/login'); return; }
    try {
      const [p, r, rd] = await Promise.all([athleteGetPlan(), athleteGetRecords(), athleteGetReadiness()]);
      setPlan(p.data); setRecords(r.data);
      if (rd.data.today) { setTodayReadiness(rd.data.today); setReadiness(rd.data.today); }
    } catch (e) {
      if (e?.response?.status === 401) { localStorage.removeItem('athlete_token'); navigate('/atleta/login'); }
      else toast.error(t('athlete.errorLoading'));
    } finally { setLoading(false); }
  }, [navigate, t]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleComplete = useCallback(async (sessionId, body) => {
    await athleteCompleteSession(sessionId, body);
    toast.success(t('athlete.sessionUpdated'));
    const p = await athleteGetPlan(); setPlan(p.data);
  }, [t]);

  const saveReadiness = async () => {
    setSavingR(true);
    try {
      const res = await athleteSaveReadiness(readiness);
      setTodayReadiness({ ...readiness, overall: res.data.overall });
      toast.success(`${t('athlete.registered')} · ${t('athlete.kpiAdherence')} ${res.data.overall}%`);
    } catch { toast.error(t('athlete.couldNotSave')); }
    finally { setSavingR(false); }
  };

  const logout = () => { localStorage.removeItem('athlete_token'); localStorage.removeItem('athlete_info'); navigate('/atleta/login'); };

  const [reminderDismissed, setReminderDismissed] = useState(false);
  const todayStr2 = new Date().toISOString().slice(0, 10);
  const todaySessions = (plan?.sessions || []).filter(s => s.fecha && s.fecha.slice(0, 10) === todayStr2);
  const todayPending = todaySessions.filter(s => !s.completada);

  if (loading) return <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#CCFF00] animate-spin" /></div>;

  const SLIDERS = [
    { key: 'sleep', label: t('athlete.sleepQuality'), color: '#3B82F6' },
    { key: 'muscle_soreness', label: t('athlete.muscleSoreness'), color: '#EF4444' },
    { key: 'stress', label: t('athlete.stress'), color: '#F59E0B' },
    { key: 'motivation', label: t('athlete.motivation'), color: '#10B981' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e14]" data-testid="athlete-panel-page">
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <span className="text-white font-bold tracking-tight">Lord<span className="text-[#CCFF00]">Training</span></span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{info.name || t('athlete.athleteDefault', 'Atleta')}</span>
            <button onClick={logout} className="text-slate-400 hover:text-white" data-testid="athlete-logout"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 flex gap-1">
          {[{ id: 'plan', label: t('athlete.myPlan'), icon: ClipboardList }, { id: 'readiness', label: t('athlete.myState'), icon: Heart }, { id: 'records', label: t('athlete.records'), icon: Trophy }].map((t2) => (
            <button key={t2.id} onClick={() => setTab(t2.id)} data-testid={`athlete-tab-${t2.id}`}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t2.id ? 'border-[#CCFF00] text-[#CCFF00]' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <t2.icon className="w-4 h-4" />{t2.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === 'plan' && todaySessions.length > 0 && !reminderDismissed && (
          <div className="mb-5 rounded-2xl border border-[#CCFF00]/40 bg-[#CCFF00]/10 p-4 flex items-start gap-3" data-testid="athlete-today-reminder">
            <BellRing className="w-5 h-5 text-[#CCFF00] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">
                {todayPending.length > 0
                  ? `${t('athlete.reminderToday')} ${todayPending.map(s => s.nombre).join(', ')}`
                  : `${t('athlete.reminderDone')} 💪`}
              </p>
              <p className="text-slate-300 text-xs mt-0.5">
                {todayPending.length > 0
                  ? t('athlete.reminderTodayHint')
                  : t('athlete.reminderDoneHint')}
              </p>
            </div>
            <button onClick={() => setReminderDismissed(true)} className="text-slate-400 hover:text-white" data-testid="athlete-reminder-dismiss"><X className="w-4 h-4" /></button>
          </div>
        )}
        {tab === 'plan' && (
          plan?.plan ? (
            <AthletePlanView athleteName={info.name} plan={plan.plan} sessions={plan.sessions} competitions={plan.competitions} onComplete={handleComplete} />
          ) : (
            <div className="text-center py-20 text-slate-400">{t('athlete.noPlanAssigned')}</div>
          )
        )}

        {tab === 'readiness' && (
          <div className="max-w-lg mx-auto rounded-2xl bg-slate-900/70 border border-white/10 p-6" data-testid="athlete-readiness-form">
            <h2 className="text-white font-semibold flex items-center gap-2 mb-1"><Heart className="w-5 h-5 text-[#CCFF00]" />{t('athlete.dailyLog')}</h2>
            <p className="text-slate-400 text-sm mb-5">{t('athlete.dailyLogHint')}</p>
            {todayReadiness && <div className="mb-5 rounded-xl bg-[#CCFF00]/10 border border-[#CCFF00]/30 p-3 text-center"><span className="text-slate-300 text-sm">{t('athlete.availabilityToday')} </span><span className="text-[#CCFF00] font-bold text-lg">{todayReadiness.overall}%</span></div>}
            <div className="space-y-5">
              {SLIDERS.map((s) => (
                <div key={s.key}>
                  <div className="flex justify-between text-sm mb-1.5"><span className="text-slate-300">{s.label}</span><span className="text-white font-semibold">{readiness[s.key]}%</span></div>
                  <input type="range" min="0" max="100" value={readiness[s.key]} onChange={(e) => setReadiness({ ...readiness, [s.key]: Number(e.target.value) })} className="w-full" style={{ accentColor: s.color }} data-testid={`readiness-${s.key}`} />
                </div>
              ))}
              <textarea value={readiness.notes || ''} onChange={(e) => setReadiness({ ...readiness, notes: e.target.value })} rows={2} placeholder={t('athlete.notesOptional')} className="w-full rounded-lg bg-white/5 border border-white/10 text-white text-sm p-2.5 placeholder:text-slate-500" data-testid="readiness-notes" />
              <button onClick={saveReadiness} disabled={savingR} className="w-full h-11 rounded-lg bg-[#CCFF00] text-slate-900 font-semibold flex items-center justify-center gap-2" data-testid="readiness-save">
                {savingR ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}{t('athlete.saveMyState')}
              </button>
            </div>
          </div>
        )}

        {tab === 'records' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-testid="athlete-records">
            <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-6">
              <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><Trophy className="w-5 h-5 text-amber-400" />{t('athlete.personalRecords')}</h2>
              {records.records.length === 0 ? <p className="text-slate-500 text-sm py-6 text-center">{t('athlete.noRecords')}</p> : (
                <div className="space-y-2.5">
                  {records.records.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                      <span className="text-white text-sm">{r.exercise}</span>
                      <span className="text-white font-bold">{r.value} <span className="text-xs text-slate-400">{r.unit}</span> {r.improvement && <span className="text-emerald-400 text-xs ml-1">{String(r.improvement).startsWith('-') ? r.improvement : `+${r.improvement}`}</span>}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-6">
              <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-[#CCFF00]" />{t('athlete.physicalCapabilities')}</h2>
              {records.capabilities.length === 0 ? <p className="text-slate-500 text-sm py-6 text-center">{t('athlete.noEvaluation')}</p> : (
                <div className="space-y-3">
                  {records.capabilities.map((c, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-slate-300">{c.ability}</span><span className="text-white font-semibold">{c.value}%</span></div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#CCFF00]" style={{ width: `${c.value}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AthletePortalPanel;

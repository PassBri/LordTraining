import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Eye, LogIn } from 'lucide-react';
import AthletePlanView from '../components/athlete/AthletePlanView';
import { getPublicPortal, completePublicSession } from '../services/athleteApi';

const AthletePortalPublic = () => {
  const { t } = useTranslation();
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { const res = await getPublicPortal(shareId); setData(res.data); }
    catch (e) { setError(e?.response?.data?.detail || t('athlete.linkInvalid')); }
    finally { setLoading(false); }
  }, [shareId, t]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = useCallback(async (sessionId, body) => {
    await completePublicSession(shareId, sessionId, body);
    toast.success(t('athlete.sessionUpdated'));
    await load();
  }, [shareId, load, t]);

  if (loading) return <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#CCFF00] animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen bg-[#0a0e14] flex flex-col items-center justify-center text-center px-6">
      <p className="text-white text-lg font-semibold">{error}</p>
      <p className="text-slate-400 text-sm mt-2">{t('athlete.askCoachLink')}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e14]" data-testid="athlete-public-page">
      <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold tracking-tight">Lord<span className="text-[#CCFF00]">Training</span></span>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 border-l border-white/10 pl-3 flex items-center gap-1"><Eye className="w-3 h-3" />{t('athlete.readOnly')}</span>
          </div>
          <a href="/atleta/login" className="text-xs text-slate-300 hover:text-[#CCFF00] flex items-center gap-1.5" data-testid="public-login-link"><LogIn className="w-3.5 h-3.5" />{t('athlete.haveAccount')}</a>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-wider text-[#CCFF00]">{t('athlete.trainingPlan')}</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">{data.plan?.name}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data.athlete_name} · {data.plan?.model}</p>
        </div>
        <AthletePlanView athleteName={data.athlete_name} plan={data.plan} sessions={data.sessions} competitions={data.competitions} onComplete={handleComplete} />
      </main>
    </div>
  );
};

export default AthletePortalPublic;

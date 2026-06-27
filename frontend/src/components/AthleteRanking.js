import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Card } from './ui/card';
import { Trophy, Medal, ArrowUpDown, Users, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MEDAL_COLORS = ['text-amber-400', 'text-slate-400', 'text-orange-500'];

const scoreColor = (s) => {
  if (s == null) return 'bg-slate-200 text-slate-500';
  if (s >= 75) return 'bg-emerald-100 text-emerald-700';
  if (s >= 50) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

export const AthleteRanking = ({ globalContext, onOpenAthlete }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('score'); // score | readiness | evaluation_avg

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('train_token');
        const params = {};
        if (globalContext?.entityId && globalContext.entityId !== 'all') { params.federation = globalContext.entityId; params.club = globalContext.entityId; }
        if (globalContext?.teamId && globalContext.teamId !== 'all') params.team_id = globalContext.teamId;
        const res = await axios.get(`${BACKEND_URL}/api/coach/athlete-ranking`, {
          headers: { Authorization: `Bearer ${token}` }, params,
        });
        setRows(res.data?.ranking || []);
      } catch (e) {
        console.error('Error fetching ranking:', e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [globalContext?.entityId, globalContext?.teamId]);

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortBy] ?? -1, bv = b[sortBy] ?? -1;
    return bv - av;
  });
  const withData = sorted.filter(r => r.has_data);
  const maxScore = Math.max(100, ...withData.map(r => r.score || 0));

  return (
    <Card className="p-5 mb-5" data-testid="athlete-ranking-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
            <Trophy className="w-4.5 h-4.5 text-[#CCFF00]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{t('ranking.title', { defaultValue: 'Ranking del Equipo' })}</h3>
            <p className="text-xs text-slate-400">{t('ranking.subtitle', { defaultValue: 'Score combinado: readiness + evaluaciones' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          {[['score', 'Score'], ['readiness', 'Readiness'], ['evaluation_avg', 'Eval.']].map(([k, label]) => (
            <button key={k} onClick={() => setSortBy(k)}
              data-testid={`ranking-sort-${k}`}
              className={`px-2 py-1 rounded-md font-semibold transition-colors ${sortBy === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : withData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400" data-testid="ranking-empty">
          <Users className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">{t('ranking.empty', { defaultValue: 'Aún no hay datos de readiness o evaluaciones para comparar atletas.' })}</p>
        </div>
      ) : (
        <div className="space-y-1.5" data-testid="ranking-list">
          {sorted.map((r, i) => (
            <div key={r.athlete_id}
              onClick={() => onOpenAthlete && onOpenAthlete(r.athlete_id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${r.has_data ? 'hover:bg-slate-50' : 'opacity-50'} ${onOpenAthlete ? 'cursor-pointer' : ''} transition-colors`}
              title={onOpenAthlete ? t('ranking.open_athlete', { defaultValue: 'Ver ficha del atleta' }) : undefined}
              data-testid={`ranking-row-${r.athlete_id}`}>
              <div className="w-6 flex-shrink-0 text-center">
                {r.has_data && i < 3 ? (
                  <Medal className={`w-5 h-5 mx-auto ${MEDAL_COLORS[i]}`} />
                ) : (
                  <span className="text-xs font-bold text-slate-400">{r.has_data ? i + 1 : '—'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p>
                <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-slate-900 rounded-full transition-all"
                    style={{ width: `${r.score != null ? (r.score / maxScore) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:inline text-[11px] text-slate-400 w-16 text-right">
                  R {r.readiness ?? '—'} · E {r.evaluation_avg ?? '—'}
                </span>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg w-12 text-center ${scoreColor(r.score)}`}>
                  {r.score ?? '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AthleteRanking;

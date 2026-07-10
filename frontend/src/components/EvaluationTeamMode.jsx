import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  Loader2, Users, Trophy, AlertTriangle, TrendingUp, Medal, Layers,
  FileText, FileSpreadsheet, Sparkles,
} from 'lucide-react';

const API_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1 ? process.env.REACT_APP_BACKEND_URL : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));

const GROUP_MODES = [
  { id: 'team', label: 'Equipo', icon: Users },
  { id: 'category', label: 'Categoría', icon: Layers },
  { id: 'national_team', label: 'Selección Nacional', icon: Trophy },
];

const pctColor = (p) => (p >= 80 ? '#10B981' : p >= 60 ? '#F59E0B' : '#EF4444');
const medalColor = (rank) => (rank === 1 ? '#F59E0B' : rank === 2 ? '#94A3B8' : rank === 3 ? '#B45309' : '#CBD5E1');

const EvaluationTeamMode = ({ activePlan, evalType, color, title, athletes = [] }) => {
  const [groupMode, setGroupMode] = useState('team');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [teams, setTeams] = useState([]);
  const [nationalTeams, setNationalTeams] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');
  const [aiResult, setAiResult] = useState(null);

  // Mapa team_id -> categoría
  const teamCategoryMap = useMemo(() => {
    const m = {};
    teams.forEach(t => { m[t.id] = t.category || 'Sin categoría'; });
    return m;
  }, [teams]);

  // Mapa athlete_id -> Set(team_ids) según el roster del equipo (team.athletes)
  // + fallback al campo athlete.team_id
  const athleteTeamsMap = useMemo(() => {
    const m = {};
    teams.forEach(t => {
      (t.athletes || []).forEach(aid => {
        (m[aid] = m[aid] || new Set()).add(t.id);
      });
    });
    athletes.forEach(a => {
      if (a.team_id) (m[a.id] = m[a.id] || new Set()).add(a.team_id);
    });
    return m;
  }, [teams, athletes]);

  // Cargar equipos y selecciones nacionales una vez
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('train_token');
        const headers = { Authorization: `Bearer ${token}` };
        const [tr, er] = await Promise.all([
          fetch(`${API_URL}/api/teams`, { headers }),
          fetch(`${API_URL}/api/entities?entity_type=national_team`, { headers }),
        ]);
        setTeams(tr.ok ? await tr.json() : []);
        setNationalTeams(er.ok ? await er.json() : []);
      } catch { /* noop */ }
    })();
  }, []);

  // Opciones del selector según el modo
  const groupOptions = useMemo(() => {
    if (groupMode === 'team') {
      return teams.map(t => ({ value: t.id, label: t.name }));
    }
    if (groupMode === 'category') {
      const cats = Array.from(new Set(teams.map(t => t.category).filter(Boolean)));
      return cats.map(c => ({ value: c, label: c }));
    }
    return nationalTeams.map(e => ({ value: e.id, label: e.name }));
  }, [groupMode, teams, nationalTeams]);

  // Reset selección al cambiar de modo o cuando cambian las opciones
  useEffect(() => {
    if (groupOptions.length && !groupOptions.find(o => o.value === selectedGroup)) {
      setSelectedGroup(groupOptions[0].value);
    } else if (!groupOptions.length) {
      setSelectedGroup('');
    }
  }, [groupOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atletas pertenecientes al grupo seleccionado
  const groupAthletes = useMemo(() => {
    if (!selectedGroup) return [];
    if (groupMode === 'team') {
      return athletes.filter(a => (athleteTeamsMap[a.id] || new Set()).has(selectedGroup));
    }
    if (groupMode === 'category') {
      return athletes.filter(a => {
        const tids = athleteTeamsMap[a.id] || new Set();
        return Array.from(tids).some(tid => teamCategoryMap[tid] === selectedGroup);
      });
    }
    return athletes.filter(a => (a.affiliations || []).includes(selectedGroup));
  }, [groupMode, selectedGroup, athletes, teamCategoryMap, athleteTeamsMap]);

  const fetchGroup = useCallback(async () => {
    if (!activePlan || !groupAthletes.length) { setData(null); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plan_id: activePlan.id,
          evaluation_type: evalType,
          athlete_ids: groupAthletes.map(a => a.id),
        }),
      });
      setData(r.ok ? await r.json() : null);
    } catch { setData(null); }
    setLoading(false);
  }, [activePlan, evalType, groupAthletes]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  // Reset análisis IA al cambiar de grupo/tipo
  useEffect(() => { setAiResult(null); }, [selectedGroup, evalType, groupMode]);

  const currentLabel = groupOptions.find(o => o.value === selectedGroup)?.label || '';

  const exportReport = useCallback(async (kind) => {
    if (!activePlan || !groupAthletes.length) return;
    setExporting(kind);
    try {
      const token = localStorage.getItem('train_token');
      const lang = localStorage.getItem('train_language') || 'es';
      const body = JSON.stringify({
        plan_id: activePlan.id,
        evaluation_type: evalType,
        athlete_ids: groupAthletes.map(a => a.id),
        group_label: currentLabel,
        lang,
      });
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      if (kind === 'ai') {
        const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/group/ai-analysis`, { method: 'POST', headers, body });
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Error IA'); }
        setAiResult(await r.json());
        toast.success('Análisis IA generado');
      } else {
        const ep = kind === 'pdf' ? 'group/pdf' : 'group/xlsx';
        const ext = kind === 'pdf' ? 'pdf' : 'xlsx';
        const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/${ep}`, { method: 'POST', headers, body });
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || 'Error al exportar'); }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `reporte-grupal-${evalType}.${ext}`;
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        toast.success(kind === 'pdf' ? 'PDF descargado' : 'Excel descargado');
      }
    } catch (e) {
      toast.error(e.message || 'No se pudo exportar');
    } finally { setExporting(''); }
  }, [activePlan, evalType, groupAthletes, currentLabel]);

  return (
    <div className="space-y-4" data-testid={`eval-${evalType}-team-mode`}>
      {/* Selector de agrupación */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3" data-testid={`eval-${evalType}-group-selector`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Agrupar por</span>
          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
            {GROUP_MODES.map(m => {
              const MI = m.icon;
              const active = groupMode === m.id;
              return (
                <button key={m.id} onClick={() => setGroupMode(m.id)}
                  data-testid={`eval-${evalType}-groupmode-${m.id}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${active ? 'text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                  style={active ? { background: color } : {}}>
                  <MI className="w-3.5 h-3.5" /> {m.label}
                </button>
              );
            })}
          </div>
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
            data-testid={`eval-${evalType}-group-select`}
            className="h-9 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 min-w-[180px]">
            {groupOptions.length === 0 && <option value="">— Sin grupos —</option>}
            {groupOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {selectedGroup && (
            <Badge variant="outline" className="text-xs ml-auto">{groupAthletes.length} atleta{groupAthletes.length === 1 ? '' : 's'}</Badge>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-center py-10 text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /><p className="text-sm mt-2">Calculando promedios del equipo...</p></div>
      )}

      {!loading && (!selectedGroup || groupAthletes.length === 0) && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300" data-testid={`eval-${evalType}-group-empty`}>
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No hay atletas en este grupo. Asigna atletas a un equipo / selección o elige otro grupo.</p>
        </div>
      )}

      {!loading && data && groupAthletes.length > 0 && (
        <>
          {/* Toolbar de reportes grupales (Fase B) */}
          <div className="flex items-center gap-2 flex-wrap" data-testid={`eval-${evalType}-group-toolbar`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-auto">Reportes del grupo · {currentLabel}</span>
            <button onClick={() => exportReport('pdf')} disabled={!!exporting}
              data-testid={`eval-${evalType}-export-pdf`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm disabled:opacity-50" style={{ background: '#EF4444' }}>
              {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} PDF
            </button>
            <button onClick={() => exportReport('xlsx')} disabled={!!exporting}
              data-testid={`eval-${evalType}-export-xlsx`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm disabled:opacity-50" style={{ background: '#10B981' }}>
              {exporting === 'xlsx' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel
            </button>
            <button onClick={() => exportReport('ai')} disabled={!!exporting}
              data-testid={`eval-${evalType}-export-ai`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm disabled:opacity-50" style={{ background: '#8B5CF6' }}>
              {exporting === 'ai' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Análisis IA
            </button>
          </div>

          {/* Resultado del análisis IA grupal */}
          {aiResult && (
            <Card className="border-0 shadow-sm border-l-4 border-l-violet-500" data-testid={`eval-${evalType}-ai-result`}>
              <CardHeader className="py-3 bg-white">
                <CardTitle className="text-sm flex items-center gap-2 text-violet-700"><Sparkles className="w-4 h-4" /> Análisis IA del grupo</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: (aiResult.analysis || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
              </CardContent>
            </Card>
          )}

          {/* KPIs grupales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl p-4 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${color}, #0f172a)` }} data-testid={`eval-${evalType}-team-avg`}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Promedio del equipo</p>
              <p className="text-3xl font-extrabold tabular-nums">{data.team_avg}<span className="text-base opacity-70">%</span></p>
              <div className="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${data.team_avg}%` }} /></div>
            </div>
            <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atletas</p>
              <p className="text-3xl font-extrabold tabular-nums text-slate-900">{data.group_size}</p>
              <p className="text-xs text-slate-500 mt-1">{data.with_data} con datos</p>
            </div>
            <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aspectos</p>
              <p className="text-3xl font-extrabold tabular-nums" style={{ color }}>{data.aspects.length}</p>
              <p className="text-xs text-slate-500 mt-1">evaluados</p>
            </div>
            <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Áreas críticas</p>
              <p className="text-3xl font-extrabold tabular-nums text-red-600">{data.critical.length}</p>
              <p className="text-xs text-slate-500 mt-1">{'< 60%'}</p>
            </div>
          </div>

          {/* Áreas críticas */}
          {data.critical.length > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-red-500" data-testid={`eval-${evalType}-critical-areas`}>
              <CardHeader className="py-3 bg-white">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" /> Áreas críticas del equipo ({'promedio < 60%'})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {data.critical.map((c, i) => (
                  <div key={i} className="flex items-center gap-3" data-testid={`eval-${evalType}-critical-${i}`}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-800">{c.label}</span>
                        <span className="text-xs font-bold" style={{ color: pctColor(c.avg_pct) }}>{c.avg_pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.avg_pct}%`, background: pctColor(c.avg_pct) }} />
                      </div>
                      <span className="text-[10px] text-slate-400">{c.category}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Ranking interno */}
          <Card className="border-0 shadow-sm" data-testid={`eval-${evalType}-ranking`}>
            <CardHeader className="py-3 bg-white">
              <CardTitle className="text-sm flex items-center gap-2"><Medal className="w-4 h-4" style={{ color }} /> Ranking interno · {currentLabel}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 bg-slate-50/40">
              {data.ranking.map((r) => (
                <div key={r.athlete_id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3" data-testid={`eval-${evalType}-rank-${r.athlete_id}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0"
                    style={{ background: r.has_data ? medalColor(r.rank) : '#E2E8F0', color: r.has_data ? '#fff' : '#94A3B8' }}>
                    {r.has_data ? r.rank : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{r.name}</span>
                      <span className="text-sm font-extrabold tabular-nums" style={{ color: r.has_data ? pctColor(r.global_pct) : '#94A3B8' }}>
                        {r.has_data ? `${r.global_pct}%` : 'Sin datos'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${r.has_data ? r.global_pct : 0}%`, background: r.has_data ? pctColor(r.global_pct) : '#E2E8F0' }} />
                    </div>
                    {r.has_data && <span className="text-[10px] text-slate-400">{r.measured}/{r.total} medidos · {r.date}</span>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Promedio por aspecto */}
          {data.aspects.length > 0 && (
            <Card className="border-0 shadow-sm" data-testid={`eval-${evalType}-aspects-avg`}>
              <CardHeader className="py-3 bg-white">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color }} /> Promedio grupal por aspecto</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {data.aspects.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{a.label} <span className="text-[10px] text-slate-400">· {a.category}</span></span>
                        <span className="text-xs font-bold" style={{ color: pctColor(a.avg_pct) }}>{a.avg_pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.avg_pct}%`, background: pctColor(a.avg_pct) }} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default EvaluationTeamMode;

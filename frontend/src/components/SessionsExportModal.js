import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  CalendarDays, Files, Archive, Loader2, X, CheckSquare, Square,
  Calendar, Clock, Activity, ListChecks, Sun, Moon, LayoutGrid, FileText,
  Link as LinkIcon, MessageCircle, Check, Dumbbell, Target, Flame, Hash,
} from 'lucide-react';

const API = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const PHASE_COLORS = {
  'Preparación General': '#10b981',
  'Preparación Específica': '#D4AF37',
  'Pre-competitivo': '#f59e0b',
  'Competitivo': '#ef4444',
  'Transición': '#8b5cf6',
  'AC - Meso 1': '#10b981',
  'CE - Meso 1': '#D4AF37',
  'RE - Meso 1': '#ef4444',
};

const SESSION_TYPE_COLORS = {
  fuerza: { bg: 'bg-red-50', text: 'text-red-700', icon: Dumbbell },
  resistencia: { bg: 'bg-[#D4AF37]', text: 'text-[#B8912A]', icon: Activity },
  velocidad: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Flame },
  tecnica: { bg: 'bg-purple-50', text: 'text-purple-700', icon: Target },
  tactica: { bg: 'bg-violet-50', text: 'text-violet-700', icon: Target },
  recuperacion: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Activity },
  recuperación: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Activity },
  general: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Activity },
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SessionsExportModal({ open, onOpenChange, plan, athleteName }) {
  const { t, i18n } = useTranslation();
  const [tree, setTree] = useState({ items: [], total_sessions: 0 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [exporting, setExporting] = useState(null);          // null | 'combined' | 'zip'
  const [theme, setTheme] = useState('light');               // 'light' | 'dark'
  const [layout, setLayout] = useState('classic');           // 'classic' | 'hero'
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!open || !plan?.id) return;
    setLoading(true);
    setSelected(new Set());
    const token = localStorage.getItem('train_token') || localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/api/master-report/sessions-list/${plan.id}`, { headers })
      .then(r => setTree(r.data || { items: [], total_sessions: 0 }))
      .catch(() => {
        setTree({ items: [], total_sessions: 0 });
        toast.error(t('sessions.tCantLoadSessions'));
      })
      .finally(() => setLoading(false));
  }, [open, plan]);

  const allSessionIds = useMemo(() => {
    const ids = [];
    tree.items.forEach(ms => ms.microcycles.forEach(mc => mc.sessions.forEach(s => {
      if (s.id) ids.push(s.id);
    })));
    return ids;
  }, [tree]);

  const toggleSession = (sid) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  };

  const toggleMicro = (microSessions) => {
    const ids = microSessions.map(s => s.id).filter(Boolean);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const toggleMeso = (meso) => {
    const ids = [];
    meso.microcycles.forEach(mc => mc.sessions.forEach(s => { if (s.id) ids.push(s.id); }));
    const allSelected = ids.length > 0 && ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allSessionIds));
  const clearAll = () => setSelected(new Set());

  const buildPayload = () => ({
    plan_id: plan.id,
    session_ids: Array.from(selected),
    athlete_name: athleteName || 'Atleta',
    theme,
    layout,
    lang: (localStorage.getItem('train_language') || 'es').split('-')[0],
  });

  const handleExport = async (format) => {
    if (selected.size === 0) {
      toast.warning(t('sessions.tSelectAtLeastOne'));
      return;
    }
    setExporting(format);
    try {
      const token = localStorage.getItem('train_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${API}/api/sessions-export/generate`,
        { ...buildPayload(), format },
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          responseType: 'blob',
        }
      );
      const ext = format === 'zip' ? 'zip' : 'pdf';
      const planSlug = (plan?.name || 'plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
      downloadBlob(res.data, `sesiones_${planSlug}_${theme}_${layout}.${ext}`);
      toast.success(format === 'zip'
        ? t('sessions.tZipDownloaded', { count: selected.size })
        : t('sessions.tPdfCombinedDownloaded', { count: selected.size }));
    } catch (err) {
      toast.error(t('sessions.tExportError', { msg: err.response?.data?.detail || err.message }));
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async (target /* 'link' | 'whatsapp' */) => {
    if (selected.size === 0) {
      toast.warning(t('sessions.tSelectAtLeastOne'));
      return;
    }
    setSharing(true);
    try {
      const token = localStorage.getItem('train_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${API}/api/sessions-export/share`,
        buildPayload(),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const shareId = res.data.share_id;
      const url = `${API}/api/sessions-export/shared/${shareId}`;
      if (target === 'whatsapp') {
        const msg = `LordTraining · ${plan?.name || 'Plan'} · ${t('sessions.sessionCount', { count: selected.size })}\n\n${t('sessions.waViewOnline')} ${url}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        toast.success(t('sessions.tOpeningWhatsapp'));
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t('sessions.tLinkCopiedRO'), { description: url });
      }
    } catch (err) {
      toast.error(t('sessions.tShareLinkError', { msg: err.response?.data?.detail || err.message }));
    } finally {
      setSharing(false);
    }
  };

  const totalSelected = selected.size;
  const totalAvailable = tree.total_sessions || 0;

  const formatLabel = layout === 'hero' ? t('sessions.formatHero') : t('sessions.formatClassic');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[94vh] overflow-hidden p-0 bg-white flex flex-col"
        data-testid="sessions-export-modal"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-[#D4AF37]" strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle className="text-white text-xl tracking-tight">
                  {t('sessions.exportTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-sm mt-0.5">
                  {plan?.name ? t('sessions.planColon', { name: plan.name }) : t('sessions.selectToPrint')}
                </DialogDescription>
              </div>
            </div>
            <span
              className="px-3.5 py-1.5 rounded-full bg-[#D4AF37] text-slate-900 text-xs font-bold tracking-wide shadow-lg shadow-[#D4AF37]/30"
              data-testid="sessions-export-counter"
            >
              {t('sessions.selectedCount', { sel: totalSelected, total: totalAvailable })}
            </span>
          </div>
        </DialogHeader>

        {/* Toolbar — theme + layout + select-all */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tema */}
            <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
              <span className="px-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('sessions.theme')}</span>
              <button
                onClick={() => setTheme('light')}
                data-testid="sessions-export-theme-light"
                className={`px-3 h-8 text-xs font-semibold transition flex items-center gap-1.5 ${
                  theme === 'light' ? 'bg-amber-100 text-amber-900 border-l border-amber-200' : 'text-slate-500 hover:bg-slate-50 border-l border-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> {t('sessions.themeLight')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                data-testid="sessions-export-theme-dark"
                className={`px-3 h-8 text-xs font-semibold transition flex items-center gap-1.5 ${
                  theme === 'dark' ? 'bg-slate-900 text-[#D4AF37]' : 'text-slate-500 hover:bg-slate-50 border-l border-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> {t('sessions.themeDark')}
              </button>
            </div>

            {/* Layout */}
            <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm">
              <span className="px-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('sessions.layout')}</span>
              <button
                onClick={() => setLayout('classic')}
                data-testid="sessions-export-layout-classic"
                className={`px-3 h-8 text-xs font-semibold transition flex items-center gap-1.5 ${
                  layout === 'classic' ? 'bg-[#D4AF37] text-[#B8912A] border-l border-[#B8912A]' : 'text-slate-500 hover:bg-slate-50 border-l border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> {t('sessions.layoutClassic')}
              </button>
              <button
                onClick={() => setLayout('hero')}
                data-testid="sessions-export-layout-hero"
                className={`px-3 h-8 text-xs font-semibold transition flex items-center gap-1.5 ${
                  layout === 'hero' ? 'bg-emerald-100 text-emerald-900 border-l border-emerald-200' : 'text-slate-500 hover:bg-slate-50 border-l border-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> {t('sessions.layoutBoards')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm" variant="outline" onClick={selectAll}
              disabled={loading || allSessionIds.length === 0}
              data-testid="sessions-export-select-all"
              className="h-8 text-xs"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> {t('sessions.selectAllSessions')}
            </Button>
            <Button
              size="sm" variant="outline" onClick={clearAll}
              disabled={loading || totalSelected === 0}
              data-testid="sessions-export-clear-all"
              className="h-8 text-xs"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" /> {t('sessions.clearAllSessions')}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tree.items.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{t('sessions.noSessionsScheduled')}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {tree.items.map((meso, mi) => {
                const mesoIds = [];
                meso.microcycles.forEach(mc => mc.sessions.forEach(s => { if (s.id) mesoIds.push(s.id); }));
                const mesoSelectedCount = mesoIds.filter(id => selected.has(id)).length;
                const mesoColor = PHASE_COLORS[meso.meso_name] || PHASE_COLORS[meso.phase] || '#D4AF37';

                return (
                  <div
                    key={meso.meso_id || mi}
                    className="border border-slate-200 rounded-lg overflow-hidden bg-white"
                    data-testid={`sessions-export-meso-${meso.meso_id || mi}`}
                  >
                    <div
                      className="px-4 py-3 flex items-center justify-between gap-3"
                      style={{ backgroundColor: `${mesoColor}10`, borderBottom: `2px solid ${mesoColor}` }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
                          style={{ backgroundColor: mesoColor }}
                        >
                          M{mi + 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{meso.meso_name}</div>
                          {meso.phase && (
                            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
                              {meso.phase}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {mesoSelectedCount > 0 && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-[#D4AF37] text-slate-900 font-bold">
                            {mesoSelectedCount}/{mesoIds.length}
                          </span>
                        )}
                        <button
                          onClick={() => toggleMeso(meso)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 bg-white"
                          data-testid={`sessions-export-toggle-meso-${meso.meso_id || mi}`}
                        >
                          {mesoSelectedCount === mesoIds.length ? t('sessions.removeAll') : t('sessions.markAll', { n: mesoIds.length })}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      {meso.microcycles.map((mc, mci) => {
                        const microIds = mc.sessions.map(s => s.id).filter(Boolean);
                        const microSelectedCount = microIds.filter(id => selected.has(id)).length;

                        return (
                          <div
                            key={mc.micro_id || mci}
                            className="border border-slate-200 rounded-lg bg-slate-50/50"
                            data-testid={`sessions-export-micro-${mc.micro_id || `${mi}-${mci}`}`}
                          >
                            <div className="px-3 py-2 flex items-center justify-between bg-slate-100/70 rounded-t-lg">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-xs font-bold text-slate-700">
                                  {mc.micro_name}
                                </span>
                                {mc.week_number != null && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold">
                                    {t('sessions.weekUpper', { n: mc.week_number })}
                                  </span>
                                )}
                                {microSelectedCount > 0 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37] text-slate-900 font-bold">
                                    {microSelectedCount}/{microIds.length}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleMicro(mc.sessions)}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-white"
                                data-testid={`sessions-export-toggle-micro-${mc.micro_id || `${mi}-${mci}`}`}
                              >
                                {microSelectedCount === microIds.length ? t('sessions.removeSel') : t('sessions.allCount', { n: microIds.length })}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3">
                              {mc.sessions.map((s) => {
                                const checked = selected.has(s.id);
                                const stype = (s.session_type || 'general').toLowerCase();
                                const tcfg = SESSION_TYPE_COLORS[stype] || SESSION_TYPE_COLORS.general;
                                const TIcon = tcfg.icon;
                                return (
                                  <label
                                    key={s.id}
                                    className={`group cursor-pointer relative flex items-start gap-2.5 p-3 rounded-lg border-2 transition-all ${
                                      checked
                                        ? 'border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 shadow-md ring-2 ring-[#D4AF37]/40 scale-[1.015]'
                                        : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm'
                                    }`}
                                    data-testid={`sessions-export-card-${s.id}`}
                                  >
                                    {checked && (
                                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#D4AF37] border-2 border-white flex items-center justify-center shadow-md">
                                        <Check className="w-3.5 h-3.5 text-slate-900" strokeWidth={3} />
                                      </div>
                                    )}
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => toggleSession(s.id)}
                                      className="mt-0.5 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                      data-testid={`sessions-export-checkbox-${s.id}`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <TIcon className={`w-3.5 h-3.5 ${tcfg.text} shrink-0`} />
                                        <div className={`font-bold text-sm truncate ${checked ? 'text-slate-900' : 'text-slate-800'}`}>
                                          {s.name || t('sessions.sessionDefault')}
                                        </div>
                                      </div>
                                      {s.date && (
                                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                          {new Date(s.date).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                                        </div>
                                      )}
                                      <div className="flex items-center flex-wrap gap-1 mt-1.5">
                                        {s.day && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold flex items-center gap-0.5">
                                            <Hash className="w-2.5 h-2.5" />{t('sessions.dayBadge', { n: s.day })}
                                          </span>
                                        )}
                                        {s.session_type && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${tcfg.bg} ${tcfg.text}`}>
                                            {s.session_type}
                                          </span>
                                        )}
                                        {s.duration_minutes && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold flex items-center gap-0.5">
                                            <Clock className="w-2.5 h-2.5" />{s.duration_minutes}min
                                          </span>
                                        )}
                                        {s.exercises_count > 0 && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-0.5">
                                            <Activity className="w-2.5 h-2.5" />{t('sessions.exCountShort', { n: s.exercises_count })}
                                          </span>
                                        )}
                                        {s.intensity != null && s.intensity !== '' && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold flex items-center gap-0.5">
                                            <Flame className="w-2.5 h-2.5" />{s.intensity}%
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer reorganizado en 2 filas: status + acciones agrupadas */}
        <div className="border-t border-slate-200 bg-white shrink-0">
          {/* Status row */}
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-[11px]">
            <div className="flex items-center gap-3 text-slate-600">
              <span className="flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5" />
                <strong className="text-slate-900">{t('sessions.sessionCount', { count: totalSelected })}</strong>
              </span>
              <span className="text-slate-300">·</span>
              <span>{t('sessions.formatLabel')} <strong className="text-slate-700">{formatLabel}</strong></span>
              <span className="text-slate-300">·</span>
              <span>{t('sessions.themeLabel')} <strong className={theme === 'dark' ? 'text-slate-700' : 'text-amber-700'}>{theme === 'dark' ? t('sessions.themeDark') : t('sessions.themeLight')}</strong></span>
            </div>
            <div className="text-slate-400 italic">
              {totalSelected === 0 && t('sessions.markToPrint')}
            </div>
          </div>
          {/* Actions row */}
          <div className="px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={!!exporting || sharing}
              data-testid="sessions-export-cancel-btn"
              className="text-slate-600 hover:text-slate-900"
            >
              <X className="w-4 h-4 mr-1" /> {t('sessions.cancel')}
            </Button>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Share group */}
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleShare('link')}
                  disabled={!!exporting || sharing || totalSelected === 0}
                  data-testid="sessions-export-link-btn"
                  className="h-9 border-[#B8912A] text-[#B8912A] hover:bg-[#D4AF37]"
                  title={t('sessions.copyShareLink')}
                >
                  {sharing
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <LinkIcon className="w-3.5 h-3.5" />}
                  <span className="ml-1.5 hidden sm:inline">{t('sessions.link')}</span>
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleShare('whatsapp')}
                  disabled={!!exporting || sharing || totalSelected === 0}
                  data-testid="sessions-export-whatsapp-btn"
                  className="h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  title={t('sessions.shareWhatsapp')}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="ml-1.5 hidden sm:inline">WhatsApp</span>
                </Button>
              </div>

              {/* Download group */}
              <Button
                variant="outline" size="sm"
                onClick={() => handleExport('zip')}
                disabled={!!exporting || sharing || totalSelected === 0}
                data-testid="sessions-export-zip-btn"
                className="h-9 border-slate-300"
              >
                {exporting === 'zip'
                  ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : <Archive className="w-3.5 h-3.5 mr-1.5" />}
                ZIP
              </Button>
              <Button
                size="sm"
                onClick={() => handleExport('combined')}
                disabled={!!exporting || sharing || totalSelected === 0}
                data-testid="sessions-export-combined-btn"
                className="h-9 bg-slate-900 hover:bg-slate-800 text-[#D4AF37] font-bold px-4"
              >
                {exporting === 'combined'
                  ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : <Files className="w-3.5 h-3.5 mr-1.5" />}
                {t('sessions.pdfCombined')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

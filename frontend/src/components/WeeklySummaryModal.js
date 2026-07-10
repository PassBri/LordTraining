import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { TrendingUp, AlertTriangle, HeartPulse, CalendarRange, CheckCircle2, Gauge, Sparkles } from 'lucide-react';

const fmt = (iso) => { try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return iso; } };

const WeeklySummaryModal = ({ open, onOpenChange, summary }) => {
  const { t } = useTranslation();
  const s = summary || {};
  const kpis = [
    { label: t('dashboard.weekly.adherence'), value: `${s.adherence ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('dashboard.weekly.sessionsCompleted'), value: `${s.sessions_completed ?? 0}/${s.sessions_due ?? 0}`, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('dashboard.weekly.acwrRisk'), value: s.athletes_acwr_risk ?? 0, icon: Gauge, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: t('dashboard.weekly.lowAvailability'), value: s.athletes_low_readiness_streak ?? 0, icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white" data-testid="weekly-summary-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#007AFF]" />{t('dashboard.weekly.title')}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 flex items-center gap-1.5 -mt-1">
          <CalendarRange className="w-4 h-4" />{fmt(s.week_start)} – {fmt(s.week_end)}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-3">
          {kpis.map((k) => (
            <div key={k.label} className={`rounded-xl ${k.bg} p-4`} data-testid={`summary-kpi-${k.label}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-slate-500">{k.label}</span>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${k.color}`} style={{ fontFamily: "'Barlow Condensed',sans-serif" }}>{k.value}</p>
            </div>
          ))}
        </div>

        {s.top_capacities?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('dashboard.weekly.topCapacities')}</p>
            <div className="flex flex-wrap gap-2">
              {s.top_capacities.map((c) => (
                <span key={c.name} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">{c.name} · {c.count}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('dashboard.weekly.activeAlerts')}</p>
          {(!s.alerts || s.alerts.length === 0) ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4" />{t('dashboard.weekly.noAlerts')}
            </div>
          ) : (
            <div className="space-y-2">
              {s.alerts.map((a, i) => (
                <div key={i} className={`rounded-lg p-2.5 border flex items-start gap-2 ${a.severity === 'high' ? 'bg-red-50 border-red-150' : 'bg-amber-50 border-amber-150'}`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-500">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklySummaryModal;

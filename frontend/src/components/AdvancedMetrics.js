import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  BarChart, Bar, ReferenceArea, ReferenceLine, Cell,
} from 'recharts';
import { Activity, TrendingUp, AlertTriangle, HeartPulse, Gauge } from 'lucide-react';

const ZONE_STYLE = {
  optimo: { key: 'Optimo', color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  bajo: { key: 'Bajo', color: '#D4AF37', bg: 'bg-[#D4AF37]', text: 'text-[#B8912A]' },
  precaucion: { key: 'Precaucion', color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700' },
  riesgo: { key: 'Riesgo', color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700' },
  sin_datos: { key: 'SinDatos', color: '#94A3B8', bg: 'bg-slate-50', text: 'text-slate-500' },
};

const AdvancedMetrics = ({ metrics, onNavigate }) => {
  const { t } = useTranslation();
  const m = metrics || {};
  const acwr = m.acwr_series || [];
  const adh = m.adherence_series || [];
  const zStyle = ZONE_STYLE[m.acwr_zone] || ZONE_STYLE.sin_datos;
  const zone = { ...zStyle, label: t(`dashboard.metrics.zone${zStyle.key}`), desc: t(`dashboard.metrics.zone${zStyle.key}Desc`) };
  const low = m.low_readiness_athletes || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-testid="advanced-metrics">
      {/* ACWR */}
      <Card className="shadow-lg border-0 bg-white" data-testid="acwr-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="w-5 h-5 text-[#B8912A]" />
            {t('dashboard.metrics.acwrTitle')}
            {m.acwr_current != null && (
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${zone.bg} ${zone.text}`} data-testid="acwr-zone-badge">
                {m.acwr_current} · {zone.label}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {acwr.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-center text-slate-400 gap-2">
              <Gauge className="w-8 h-8 text-slate-300" />
              <p className="text-sm">{t('dashboard.metrics.acwrEmpty')}</p>
              <p className="text-xs text-slate-400">{t('dashboard.metrics.acwrEmptyHint')}</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={acwr} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis domain={[0, 2]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <ReferenceArea y1={0.8} y2={1.3} fill="#10B981" fillOpacity={0.12} />
                  <ReferenceLine y={1.5} stroke="#EF4444" strokeDasharray="4 4" />
                  <Tooltip />
                  <Line type="monotone" dataKey="acwr" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-500 mt-2">{zone.desc}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Adherencia */}
      <Card className="shadow-lg border-0 bg-white" data-testid="adherence-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            {t('dashboard.metrics.adherenceTitle')}
            {adh.length > 0 && (
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700" data-testid="adherence-overall-badge">
                {m.adherence_overall}% {t('dashboard.metrics.global')}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adh.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-center text-slate-400 gap-2">
              <Activity className="w-8 h-8 text-slate-300" />
              <p className="text-sm">{t('dashboard.metrics.adherenceEmpty')}</p>
              <p className="text-xs text-slate-400">{t('dashboard.metrics.adherenceEmptyHint')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={adh} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <ReferenceLine y={80} stroke="#10B981" strokeDasharray="4 4" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="adherence" radius={[4, 4, 0, 0]}>
                  {adh.map((d, i) => (
                    <Cell key={i} fill={d.adherence >= 80 ? '#10B981' : d.adherence >= 50 ? '#F59E0B' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Baja disponibilidad hoy */}
      <Card className="shadow-lg border-0 bg-white lg:col-span-2" data-testid="low-readiness-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="w-5 h-5 text-rose-500" />
            {t('dashboard.metrics.lowReadinessTitle')}
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
              {low.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {low.length === 0 ? (
            <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <HeartPulse className="w-5 h-5 text-emerald-400" />
              {t('dashboard.metrics.lowReadinessEmpty')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {low.map((a) => (
                <div key={a.athlete_id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-3" data-testid={`low-readiness-${a.athlete_id}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm truncate">{a.name}</span>
                    <span className="flex items-center gap-1 text-rose-600 font-bold text-sm"><AlertTriangle className="w-3.5 h-3.5" />{a.overall}%</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-slate-500">
                    <span>{t('dashboard.metrics.sleep')} {a.sleep}%</span>
                    <span>{t('dashboard.metrics.soreness')} {a.muscle_soreness}%</span>
                    <span>{t('dashboard.metrics.stressShort')} {a.stress}%</span>
                    <span>{t('dashboard.metrics.motiv')} {a.motivation}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedMetrics;

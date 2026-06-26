import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles, Trash2, CalendarCheck, Trophy, Activity, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { seedDemoData, clearDemoData } from '../services/api';

const DemoDataManager = () => {
  const [busy, setBusy] = useState(null); // 'seed' | 'clear'
  const [result, setResult] = useState(null);

  const handleSeed = async () => {
    setBusy('seed');
    try {
      const res = await seedDemoData(null);
      setResult(res.data);
      const t = res.data?.totals || {};
      toast.success(`Datos sembrados: ${t.sessions || 0} sesiones con fecha, ${t.competitions || 0} competencias.`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudieron sembrar los datos de ejemplo');
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('¿Revertir los datos de ejemplo? Se quitarán las fechas/completado de las sesiones demo y se borrarán las competencias/evaluaciones de ejemplo.')) return;
    setBusy('clear');
    try {
      const res = await clearDemoData();
      setResult(null);
      toast.success(`Revertido: ${res.data?.sessions_cleared || 0} sesiones, ${res.data?.competitions_deleted || 0} competencias.`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudieron revertir los datos');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6" data-testid="demo-data-manager">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-[#CCFF00]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Datos de Ejemplo (Onboarding)</h3>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">
            Asigna fechas reales a las sesiones de tus planes (ancladas a la fecha de inicio), marca las
            sesiones pasadas como completadas (~85% adherencia) y agrega competencias, evaluación física e
            indicadores de ejemplo. Así el Panel de Control deja de verse vacío. Todo es <strong>editable y borrable</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { icon: CalendarCheck, label: 'Calendario poblado', desc: 'Sesiones con fecha + estado' },
          { icon: Trophy, label: 'Competencias', desc: 'Próximas competencias del plan' },
          { icon: Activity, label: 'Métricas reales', desc: 'Adherencia, récords y radar' },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-3 rounded-xl border border-slate-150 bg-slate-50 px-4 py-3">
            <f.icon className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">{f.label}</p>
              <p className="text-xs text-slate-500">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSeed}
          disabled={busy !== null}
          className="bg-slate-900 hover:bg-slate-800 text-[#CCFF00] font-semibold"
          data-testid="seed-demo-data-btn"
        >
          {busy === 'seed' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Sembrar datos de ejemplo
        </Button>
        <Button
          onClick={handleClear}
          disabled={busy !== null}
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50"
          data-testid="clear-demo-data-btn"
        >
          {busy === 'clear' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
          Revertir
        </Button>
      </div>

      {result && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4" data-testid="seed-demo-result">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">{result.message}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <span className="text-emerald-700">Sesiones con fecha: <strong>{result.totals?.sessions || 0}</strong></span>
            <span className="text-emerald-700">Completadas: <strong>{result.totals?.completed || 0}</strong></span>
            <span className="text-emerald-700">Competencias: <strong>{result.totals?.competitions || 0}</strong></span>
            <span className="text-emerald-700">Evaluaciones: <strong>{result.totals?.evaluations || 0}</strong></span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-2">Abre el Panel de Control con un plan activo seleccionado para ver los datos.</p>
        </div>
      )}
    </div>
  );
};

export default DemoDataManager;

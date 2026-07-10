import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Calendar, Activity, TrendingUp, Dumbbell, Heart, Timer, 
  Loader2, AlertTriangle, User, Target, Clock, BarChart3 
} from 'lucide-react';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const SharedPlanPage = () => {
  const { shareToken } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/training-plans/shared/${shareToken}`);
        if (!res.ok) throw new Error('Plan no encontrado');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#B8912A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Plan no encontrado</h2>
            <p className="text-slate-500">El enlace puede haber expirado o no es válido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { plan, athlete, v2_macrociclos = [], v2_mesociclos = [], v2_microciclos = [], v2_sesiones = [] } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#D4AF37]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#D4AF37] to-[#D4AF37] text-white py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-[#B8912A] text-sm mb-1">
            <Calendar className="w-4 h-4" />
            Plan de Entrenamiento Compartido
          </div>
          <h1 className="text-2xl font-bold" data-testid="shared-plan-title">{plan.name}</h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-[#B8912A]">
            {athlete && (
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {athlete.name}</span>
            )}
            {plan.sport && (
              <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {plan.sport}</span>
            )}
            {plan.total_weeks && (
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {plan.total_weeks} semanas</span>
            )}
            {plan.model_name && (
              <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> {plan.model_name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Macrociclos" value={v2_macrociclos.length || plan.macrocycles?.length || 0} color="text-[#B8912A]" />
          <StatCard icon={TrendingUp} label="Mesociclos" value={v2_mesociclos.length} color="text-green-600" />
          <StatCard icon={Dumbbell} label="Microciclos" value={v2_microciclos.length} color="text-purple-600" />
          <StatCard icon={Timer} label="Sesiones" value={v2_sesiones.length} color="text-amber-600" />
        </div>

        {/* Macrocycles */}
        {(plan.macrocycles || []).map((macro, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="bg-[#D4AF37] py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#B8912A]" />
                Macrociclo: {macro.name || `#${idx + 1}`}
                {macro.phase && <span className="text-xs bg-[#D4AF37] text-[#B8912A] px-2 py-0.5 rounded-full">{macro.phase}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-sm text-slate-600 mb-3">
                {macro.weeks && <span>Duración: {macro.weeks} semanas</span>}
              </div>
              {(macro.mesocycles || []).map((meso, mIdx) => (
                <div key={mIdx} className="ml-4 mb-3 border-l-2 border-green-300 pl-3">
                  <div className="font-medium text-sm text-green-700">
                    Mesociclo: {meso.name || meso.type || `#${mIdx + 1}`}
                    {meso.weeks && <span className="text-xs text-slate-400 ml-2">({meso.weeks} sem)</span>}
                  </div>
                  {(meso.microcycles || []).map((micro, uIdx) => (
                    <div key={uIdx} className="ml-4 mt-1 text-xs text-slate-500 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-300 rounded-full" />
                      Microciclo {micro.week_number || uIdx + 1}: {micro.type || 'Corriente'}
                      {micro.sessions_count > 0 && <span className="text-purple-600">({micro.sessions_count} sesiones)</span>}
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* V2 Sessions Summary */}
        {v2_sesiones.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4 bg-amber-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-600" />
                Resumen de Sesiones ({v2_sesiones.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {v2_sesiones.slice(0, 12).map((session, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg border text-sm">
                    <div className="font-medium text-slate-700">{session.nombre || `Sesión ${i + 1}`}</div>
                    <div className="text-xs text-slate-400 mt-1 flex gap-3">
                      {session.duracion_minutos > 0 && <span>{session.duracion_minutos} min</span>}
                      {session.tipo && <span>{session.tipo}</span>}
                      {session.RPE_objetivo > 0 && <span>RPE: {session.RPE_objetivo}</span>}
                    </div>
                  </div>
                ))}
                {v2_sesiones.length > 12 && (
                  <div className="p-3 bg-[#D4AF37] rounded-lg border text-sm text-center text-[#B8912A] font-medium">
                    +{v2_sesiones.length - 12} sesiones más
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 py-4">
          Compartido desde <span className="font-semibold text-slate-500">LordTraining</span> — Plataforma de Gestión Deportiva
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  </Card>
);

export default SharedPlanPage;

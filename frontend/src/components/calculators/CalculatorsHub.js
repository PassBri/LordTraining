import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Calculator, Calendar, Dumbbell, Heart, BarChart3, Zap, Award,
  Ruler, Apple, Brain, GitBranch, ChevronRight, ArrowLeft, History
} from 'lucide-react';
import { CalcResultsHistory } from './CalcSaveBar';

import {
  Calc1RM, CalcPercentage1RM, CalcVolume, CalcRPE,
  CalcMechPower, CalcJumpPower, CalcVBT,
  CalcCooper, CalcYoYo, CalcLeger, CalcWingate, CalcWilks, CalcIPFPoints, CalcDOTS, CalcCMJ,
} from './Module2_5_6';
import {
  CalcHRZones, CalcVO2, CalcFTP, CalcPace, CalcLactate,
  CalcACWR, CalcTSB, CalcMonotonia, CalcRecovery,
  CalcBMI, CalcBodyFat, CalcWHR, CalcFFMI, CalcSomatotype,
  CalcBMR, CalcTDEE, CalcMacros, CalcHydration,
  CalcHRV, CalcWellness, CalcOvertraining,
} from './Module3_4_7_8_9';
import {
  CalcMacrocycle, CalcLoadWaves, CalcMesocycle, CalcMicrocycle, CalcSession,
  GenLinear, GenDUP, GenBlocks, GenReverse, GenATR, GenWUP,
} from './Module1_10';

// 10 módulos
const MODULES = [
  {
    id: 'planning', icon: Calendar, color: '#D4AF37',
    title: 'Planificación Estructural',
    desc: 'Macrociclo · Mesociclo · Microciclo · Sesión · Ondas de carga',
    components: [CalcMacrocycle, CalcLoadWaves, CalcMesocycle, CalcMicrocycle, CalcSession]
  },
  {
    id: 'load_strength', icon: Dumbbell, color: '#EF4444',
    title: 'Carga y Fuerza',
    desc: '1RM (7 fórmulas) · %1RM · Volumen MEV/MAV/MRV · RPE/RIR',
    components: [Calc1RM, CalcPercentage1RM, CalcVolume, CalcRPE]
  },
  {
    id: 'intensity', icon: Heart, color: '#DC2626',
    title: 'Intensidad y Zonas Fisiológicas',
    desc: 'FC Karvonen · VO₂ máx · FTP · Pace · Lactato umbral',
    components: [CalcHRZones, CalcVO2, CalcFTP, CalcPace, CalcLactate]
  },
  {
    id: 'load_control', icon: BarChart3, color: '#0F172A',
    title: 'Control de Carga y Fatiga',
    desc: 'ACWR · CTL/ATL/TSB · Monotonía Foster · Recuperación',
    components: [CalcACWR, CalcTSB, CalcMonotonia, CalcRecovery]
  },
  {
    id: 'biomech', icon: Zap, color: '#10B981',
    title: 'Biomecánica',
    desc: 'Potencia mecánica · Salto vertical (Bosco/Lewis/Sayers) · VBT',
    components: [CalcMechPower, CalcJumpPower, CalcVBT]
  },
  {
    id: 'tests', icon: Award, color: '#EAB308',
    title: 'Tests y Evaluaciones',
    desc: 'Cooper · Yo-Yo · Léger · Wingate · CMJ · Wilks · IPF GL · DOTS',
    components: [CalcCooper, CalcYoYo, CalcLeger, CalcWingate, CalcCMJ, CalcWilks, CalcIPFPoints, CalcDOTS]
  },
  {
    id: 'anthro', icon: Ruler, color: '#06B6D4',
    title: 'Composición Corporal y Antropometría',
    desc: 'IMC OMS · % Grasa (Yuhasz/Jackson-Pollock/Faulkner) · WHR · Somatotipo · FFMI',
    components: [CalcBMI, CalcBodyFat, CalcWHR, CalcFFMI, CalcSomatotype]
  },
  {
    id: 'nutrition', icon: Apple, color: '#EA580C',
    title: 'Nutrición y Energía',
    desc: 'TMB Harris/Mifflin · GET · Macros por objetivo · Hidratación',
    components: [CalcBMR, CalcTDEE, CalcMacros, CalcHydration]
  },
  {
    id: 'medical', icon: Brain, color: '#EC4899',
    title: 'Control Médico-Deportivo',
    desc: 'HRV · Wellness Hooper · Sobreentrenamiento Selye SGA',
    components: [CalcHRV, CalcWellness, CalcOvertraining]
  },
  {
    id: 'periodization_adv', icon: GitBranch, color: '#7C3AED',
    title: 'Periodización Avanzada',
    desc: 'Generadores: Lineal · DUP · WUP · Bloques · ATR · Inversa',
    components: [GenLinear, GenDUP, GenWUP, GenBlocks, GenATR, GenReverse]
  },
];

const CalculatorsHub = () => {
  const { t } = useTranslation();
  const [activeModule, setActiveModule] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const modTitle = (m) => t(`calculators.mod_${m.id}_title`, { defaultValue: m.title });
  const modDesc = (m) => t(`calculators.mod_${m.id}_desc`, { defaultValue: m.desc });

  if (activeModule) {
    const mod = MODULES.find(m => m.id === activeModule);
    const Icon = mod.icon;
    return (
      <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]" data-testid={`calc-module-${mod.id}`}>
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setActiveModule(null)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
            data-testid="calc-back-btn">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: mod.color }}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{modTitle(mod)}</h2>
            <p className="text-xs text-slate-500">{modDesc(mod)}</p>
          </div>
          <Badge variant="outline">{mod.components.length} {t('calculators.calculatorsCount')}</Badge>
        </div>

        {/* Calculators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {mod.components.map((Comp, i) => <Comp key={i} />)}
        </div>
      </div>
    );
  }

  // HUB landing
  const totalCalcs = MODULES.reduce((s, m) => s + m.components.length, 0);
  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]" data-testid="calculators-hub">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t('calculators.hubTitle')}</h1>
            <p className="text-sm text-white/80">{t('calculators.hubSubtitle', { modules: MODULES.length, calcs: totalCalcs })}</p>
          </div>
        </div>
        <p className="text-xs text-white/70 mt-3 max-w-3xl">
          {t('calculators.hubDescription')}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-700">{showHistory ? t('calculators.savedByAthlete') : t('calculators.modules')}</h3>
        <button onClick={() => setShowHistory(s => !s)} data-testid="calc-history-toggle"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700">
          <History className="w-4 h-4 text-violet-500" />{showHistory ? t('calculators.viewModules') : t('calculators.savedResults')}
        </button>
      </div>

      {showHistory ? <CalcResultsHistory /> : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="calculators-hub-grid">
        {MODULES.map((mod, idx) => {
          const Icon = mod.icon;
          return (
            <Card key={mod.id} onClick={() => setActiveModule(mod.id)}
              className="border-0 shadow-sm hover:shadow-lg transition cursor-pointer hover:-translate-y-0.5"
              data-testid={`calc-module-card-${mod.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: mod.color }}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded" style={{ background: `${mod.color}20`, color: mod.color }}>
                        {t('calculators.moduleN', { n: idx + 1 })}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{mod.components.length} {t('calculators.calcShort')}</Badge>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-1.5 leading-tight">{modTitle(mod)}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{modDesc(mod)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 mt-2 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
};

export default CalculatorsHub;

import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import {
  Brain, Download, Users, User, Cpu, Zap, Activity, AlertCircle,
  CheckCircle2, AlertTriangle, XCircle, TrendingDown, TrendingUp,
  Minus, ArrowRight, Shield, Target, Sparkles, BookOpen, FileText, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PDITechnicalSheet = () => {
  const [downloading, setDownloading] = useState(false);

  const downloadWhitepaper = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/periodization-library/pdi/whitepaper`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('train_token')}` },
      });
      if (!res.ok) throw new Error('Error al generar whitepaper');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'iTrain_PDI_Whitepaper.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Whitepaper descargado');
    } catch (e) {
      toast.error('Error al descargar el whitepaper');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-6 py-4 space-y-6" data-testid="pdi-technical-sheet">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#CCFF00]/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#CCFF00] flex items-center justify-center shadow-2xl shadow-[#CCFF00]/40 flex-shrink-0">
            <Brain className="w-10 h-10 md:w-12 md:h-12 text-slate-900" />
          </div>
          <div className="flex-1 min-w-[280px]">
            <div className="inline-block px-2 py-0.5 rounded-full bg-[#CCFF00]/20 border border-[#CCFF00]/30 text-[10px] font-bold text-[#CCFF00] uppercase tracking-wider mb-2">
              Modelo exclusivo iTRAIN
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-none mb-2">
              iTrain PDI
            </h1>
            <p className="text-base md:text-lg text-white/80 font-medium">
              Periodización Dual Integrada
            </p>
            <p className="text-xs md:text-sm text-white/50 mt-2 max-w-2xl">
              El primer modelo que resuelve formalmente la tensión Individuo ↔ Equipo.
              Arquitectura de 3 capas con Motor de Convergencia en tiempo real.
            </p>
          </div>
          <Button
            onClick={downloadWhitepaper}
            disabled={downloading}
            className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold gap-2 shadow-lg"
            data-testid="pdi-download-whitepaper-btn"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar Whitepaper
          </Button>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-slate-100">
          <TabsTrigger value="overview" data-testid="pdi-tab-overview" className="gap-2">
            <BookOpen className="w-4 h-4" /> Resumen
          </TabsTrigger>
          <TabsTrigger value="architecture" data-testid="pdi-tab-architecture" className="gap-2">
            <Cpu className="w-4 h-4" /> Arquitectura 3D
          </TabsTrigger>
          <TabsTrigger value="simulator" data-testid="pdi-tab-simulator" className="gap-2">
            <Sparkles className="w-4 h-4" /> Simulador
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="architecture" className="mt-6">
          <ArchitectureTab />
        </TabsContent>
        <TabsContent value="simulator" className="mt-6">
          <SimulatorTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ======================= OVERVIEW TAB =======================
const OverviewTab = () => {
  const principles = [
    { title: 'PAI · Perfil Adaptativo Individual', desc: 'Representación digital de cada atleta: tipo adaptativo, umbrales MEV/MAV/MRV, historial de lesiones, RPE/HRV diario, carga acumulada.', icon: User, color: '#3B82F6' },
    { title: 'CSE · Coherencia de Sistema de Equipo', desc: 'El equipo como sistema emergente: modelo de juego, picos colectivos, calendario de competiciones, dinámica grupal.', icon: Users, color: '#8B5CF6' },
    { title: 'Motor de Convergencia', desc: 'Algoritmo que procesa la capa colectiva + individual y genera el CIA (Contenido Individual Adaptado) ajustado en tiempo real.', icon: Cpu, color: '#CCFF00' },
  ];

  const phases = [
    { name: 'Acumulación', duration: '4-6 sem', vol: 90, int: 55, color: '#3B82F6' },
    { name: 'Transformación', duration: '3-5 sem', vol: 70, int: 80, color: '#8B5CF6' },
    { name: 'Realización', duration: '2-4 sem', vol: 45, int: 95, color: '#10B981' },
    { name: 'Mantenimiento', duration: 'Temporada', vol: 55, int: 78, color: '#F59E0B' },
    { name: 'Recuperación', duration: '2-4 sem', vol: 35, int: 35, color: '#6B7280' },
  ];

  return (
    <div className="space-y-6">
      {/* Philosophy */}
      <section className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#CCFF00] fill-[#CCFF00]" /> Principio de Tensión Productiva
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          El entrenamiento óptimo en deportes de equipo <strong>no surge</strong> de maximizar solo al individuo
          ni solo al colectivo, sino de la <strong>gestión inteligente de la tensión</strong> entre ambos mediante reglas
          formales: <span className="font-semibold text-slate-900">ZTI</span> (Zona de Tolerancia Individual), <span className="font-semibold text-slate-900">PDP</span> (Protocolo
          de Divergencia Planificada) y <span className="font-semibold text-slate-900">RP</span> (Resincronización Progresiva).
        </p>
        <div className="flex items-center gap-3 text-xs text-slate-500 pt-3 border-t">
          <span className="font-semibold">Autor conceptual:</span>
          <span>Dr. Brian Gonzalo Suárez Acevedo</span>
          <span className="text-slate-300">|</span>
          <span>iTrain.app</span>
        </div>
      </section>

      {/* 3 Pillars */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Los 3 pilares</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {principles.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={i} className="bg-white border rounded-xl p-5 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}>
                  <Icon className="w-6 h-6" style={{ color: p.color }} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">{p.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Phases timeline */}
      <section>
        <h2 className="text-lg font-bold text-slate-900 mb-3">5 fases del macrociclo PDI</h2>
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {phases.map((p, i) => (
              <div
                key={i}
                className="flex-1 p-4 border-b md:border-b-0 md:border-r last:border-r-0 relative"
                style={{ background: `linear-gradient(180deg, ${p.color}08 0%, transparent 100%)` }}
              >
                <div className="w-3 h-3 rounded-full mb-2" style={{ background: p.color }} />
                <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                <p className="text-[10px] text-slate-400 mb-2">{p.duration}</p>
                <div className="space-y-1">
                  <StatBar label="Vol" value={p.vol} color={p.color} />
                  <StatBar label="Int" value={p.int} color={p.color} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Glossary */}
      <section className="bg-slate-50 rounded-xl p-5">
        <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-400" /> Glosario PDI
        </h2>
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <GlossItem k="PAI" v="Perfil Adaptativo Individual" />
          <GlossItem k="MC" v="Marco Colectivo (plan del equipo)" />
          <GlossItem k="CIA" v="Contenido Individual Adaptado" />
          <GlossItem k="ZTI" v="Zona de Tolerancia Individual (divergencia aceptable)" />
          <GlossItem k="PDP" v="Protocolo de Divergencia Planificada" />
          <GlossItem k="RP" v="Resincronización Progresiva" />
          <GlossItem k="DFI" v="Deuda de Fatiga Individual" />
          <GlossItem k="ZRL" v="Zona de Riesgo de Lesión (carga aguda/crónica)" />
          <GlossItem k="MEV / MAV / MRV" v="Mínimo Efectivo / Óptimo / Máximo Recuperable" />
          <GlossItem k="CIE / CEE" v="Carga Interna/Externa de Equipo" />
        </div>
      </section>
    </div>
  );
};

const StatBar = ({ label, value, color }) => (
  <div className="flex items-center gap-2 text-[10px]">
    <span className="text-slate-400 w-6">{label}</span>
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
    <span className="tabular-nums text-slate-600 w-7 text-right">{value}%</span>
  </div>
);

const GlossItem = ({ k, v }) => (
  <div className="flex gap-2 py-1 border-b border-slate-200/50 last:border-b-0">
    <span className="font-bold text-slate-900 min-w-[90px]">{k}</span>
    <span className="text-slate-600">{v}</span>
  </div>
);

// ======================= ARCHITECTURE 3D TAB =======================
const ArchitectureTab = () => {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,_#CCFF00_0%,_transparent_70%)]" />

        <h2 className="text-xl md:text-2xl font-black mb-1 text-center relative z-10">Arquitectura de 3 capas</h2>
        <p className="text-xs text-white/50 text-center mb-8 relative z-10">Pasa el cursor sobre cada capa para explorar</p>

        {/* 3D Stack */}
        <div className="relative z-10 flex flex-col items-center gap-0" style={{ perspective: '1200px' }}>
          {/* Layer 1 - Colectiva */}
          <Layer3D
            label="CAPA COLECTIVA"
            subtitle="Modelo de juego + Calendario + Picos colectivos (2-4/año)"
            icon={Users}
            color="#8B5CF6"
            index={0}
            hovered={hovered}
            setHovered={setHovered}
            details={[
              'Macrociclo del equipo (8-11 meses)',
              '3-4 bloques principales: pretemporada, temporada, playoffs',
              'Competiciones objetivo con prioridad A/B/C',
              'Morfociclo semanal (MD+1, MD-4, MD-3, MD-2, MD-1, MD)',
            ]}
          />
          <Connector direction="down" />
          {/* Layer 2 - Motor de Convergencia */}
          <Layer3D
            label="MOTOR DE CONVERGENCIA"
            subtitle="Algoritmo en tiempo real: ZTI · PDP · RP"
            icon={Cpu}
            color="#CCFF00"
            index={1}
            hovered={hovered}
            setHovered={setHovered}
            highlight
            details={[
              'Ajusta cargas individuales automáticamente',
              'Procesa RPE + HRV + GPS + DFI diariamente',
              'Genera alertas VERDE · AMARILLO · NARANJA · ROJO',
              'Aplica reglas ZTI para mantener coherencia',
            ]}
          />
          <Connector direction="up" />
          {/* Layer 3 - Individual */}
          <Layer3D
            label="CAPA INDIVIDUAL (PAI)"
            subtitle="5 tipos adaptativos · MEV/MAV/MRV · Historial"
            icon={User}
            color="#3B82F6"
            index={2}
            hovered={hovered}
            setHovered={setHovered}
            details={[
              '5 tipos adaptativos (Rápido, Estándar, Lento, En Recuperación, Alta Carga)',
              'Umbrales de volumen MEV/MAV/MRV por músculo',
              'Historial de lesiones + zonas de riesgo',
              'RPE + HRV diario + carga acumulada',
            ]}
          />
        </div>
      </div>

      {/* Legend / How it works */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-[#CCFF00]" /> Flujo Top-Down
          </h3>
          <ol className="space-y-2 text-xs text-slate-600">
            <li><span className="font-bold text-slate-900">1.</span> El coach define el Macrociclo Colectivo (calendario + competiciones + picos).</li>
            <li><span className="font-bold text-slate-900">2.</span> El Motor de Convergencia lee la capa colectiva + el PAI de cada atleta.</li>
            <li><span className="font-bold text-slate-900">3.</span> Se genera el CIA (Contenido Individual Adaptado) para cada sesión.</li>
          </ol>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-blue-500 rotate-180" /> Flujo Bottom-Up
          </h3>
          <ol className="space-y-2 text-xs text-slate-600">
            <li><span className="font-bold text-slate-900">1.</span> El atleta reporta RPE matinal + HRV cada día.</li>
            <li><span className="font-bold text-slate-900">2.</span> El PAI se actualiza y el Motor detecta divergencias (fuera de ZTI).</li>
            <li><span className="font-bold text-slate-900">3.</span> El Motor emite alerta + propuesta de ajuste al MC del día siguiente.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

const Layer3D = ({ label, subtitle, icon: Icon, color, index, hovered, setHovered, details, highlight }) => {
  const isHovered = hovered === index;
  const dim = hovered !== null && !isHovered;
  return (
    <div
      className="w-full max-w-2xl transition-all duration-500 cursor-pointer"
      style={{
        transform: `rotateX(${isHovered ? '0deg' : '12deg'}) translateY(${isHovered ? '-4px' : '0'})`,
        opacity: dim ? 0.45 : 1,
        transformStyle: 'preserve-3d',
      }}
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      data-testid={`pdi-layer-${index}`}
    >
      <div
        className={`relative rounded-xl p-5 border-2 backdrop-blur ${highlight ? 'shadow-2xl' : ''}`}
        style={{
          background: highlight ? `linear-gradient(135deg, ${color}30, ${color}10)` : `${color}15`,
          borderColor: `${color}${isHovered ? 'ff' : '60'}`,
          boxShadow: isHovered ? `0 20px 60px -10px ${color}60` : `0 10px 30px -10px ${color}20`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: color, boxShadow: `0 8px 20px -4px ${color}80` }}
          >
            <Icon className={`w-7 h-7 ${highlight ? 'text-slate-900' : 'text-white'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black tracking-widest mb-0.5" style={{ color }}>
              {label}
            </div>
            <div className="text-sm text-white/70">{subtitle}</div>
          </div>
        </div>
        {isHovered && (
          <ul className="mt-4 pt-4 border-t border-white/10 space-y-1.5 text-xs text-white/80">
            {details.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color }}>▸</span> {d}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const Connector = ({ direction }) => (
  <div className="py-2 flex justify-center">
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-0.5 h-6 bg-gradient-to-b from-white/5 via-[#CCFF00]/40 to-white/5" />
      <div className="text-[9px] text-white/30 tabular-nums">{direction === 'down' ? '▼ ajusta' : '▲ reporta'}</div>
      <div className="w-0.5 h-6 bg-gradient-to-b from-white/5 via-[#CCFF00]/40 to-white/5" />
    </div>
  </div>
);

// ======================= SIMULATOR TAB =======================
const SimulatorTab = () => {
  const [rpe, setRpe] = useState([5]);
  const [hrv, setHrv] = useState([95]); // % baseline
  const [minutesPlayed, setMinutesPlayed] = useState([60]);
  const [dfi, setDfi] = useState([40]); // Deuda de Fatiga Individual 0-100
  const [athleteType, setAthleteType] = useState('standard');
  const [sessionType, setSessionType] = useState('md-3');

  // MC base values by session type (colectivo)
  const MC_BASE = {
    'md+1':  { vol: 30, int: 25,  label: 'MD+1 Recuperación' },
    'md-4':  { vol: 55, int: 75,  label: 'MD-4 Tensión Muscular' },
    'md-3':  { vol: 90, int: 80,  label: 'MD-3 Duración' },
    'md-2':  { vol: 50, int: 95,  label: 'MD-2 Velocidad' },
    'md-1':  { vol: 25, int: 40,  label: 'MD-1 Activación' },
  };

  const typeLabel = {
    fast: 'Respondedor Rápido',
    standard: 'Estándar',
    slow: 'Respondedor Lento',
    recovering: 'En Recuperación',
    high_load: 'Alta Carga Soportada',
  };

  const result = useMemo(() => {
    const mc = MC_BASE[sessionType];
    let vol = mc.vol;
    let intv = mc.int;
    const reasons = [];

    // Rule: minutos jugados en último partido afectan MD+1
    if (sessionType === 'md+1') {
      if (minutesPlayed[0] > 75) {
        vol = Math.round(vol * 0.6);
        intv = Math.round(intv * 0.7);
        reasons.push(`Jugó >75 min → recuperación pasiva (vol −40%)`);
      } else if (minutesPlayed[0] < 20) {
        vol = Math.round(vol * 1.25);
        reasons.push(`Jugó <20 min → carga compensatoria (+25%)`);
      }
    }

    // Rule: RPE alto → reducir volumen, mantener o bajar intensidad
    if (rpe[0] >= 8) {
      vol = Math.round(vol * 0.6);
      intv = Math.round(intv * 0.85);
      reasons.push(`RPE ≥8 → bloqueo carga desarrollo (vol −40%, int −15%)`);
    } else if (rpe[0] >= 7) {
      vol = Math.round(vol * 0.78);
      reasons.push(`RPE ≥7 → reducir vol −22%, mantener int`);
    }

    // Rule: HRV < 80% baseline → alerta AMARILLO
    if (hrv[0] < 75) {
      vol = Math.round(vol * 0.7);
      intv = Math.round(intv * 0.75);
      reasons.push(`HRV <75% → reducir carga global −25%`);
    } else if (hrv[0] < 85) {
      vol = Math.round(vol * 0.9);
      reasons.push(`HRV <85% → reducir vol −10%`);
    }

    // Rule: DFI alta
    if (dfi[0] > 85) {
      vol = Math.round(vol * 0.5);
      intv = Math.round(intv * 0.7);
      reasons.push(`DFI >85% → bloqueo total desarrollo`);
    } else if (dfi[0] > 70) {
      vol = Math.round(vol * 0.8);
      reasons.push(`DFI >70% → reducir vol −20%`);
    }

    // Rule: athlete type adjustments
    if (athleteType === 'slow' && sessionType === 'md-3') {
      vol = Math.min(100, Math.round(vol * 1.12));
      reasons.push(`Tipo Lento + MD-3 → +12% bloque aeróbico extra`);
    }
    if (athleteType === 'fast' && sessionType === 'md-3') {
      reasons.push(`Tipo Rápido → 100% plan colectivo`);
    }
    if (athleteType === 'recovering') {
      vol = Math.round(vol * 0.8);
      intv = Math.round(intv * 0.85);
      reasons.push(`En Recuperación → reducir vol −20%, int −15%`);
    }
    if (athleteType === 'high_load') {
      vol = Math.min(100, Math.round(vol * 1.08));
      reasons.push(`Alta Carga → +8% vol permitido`);
    }

    // Clamp
    vol = Math.max(0, Math.min(100, vol));
    intv = Math.max(0, Math.min(100, intv));

    // Divergence vs MC
    const divergence = Math.max(Math.abs(vol - mc.vol), Math.abs(intv - mc.int));
    let zone = 'green';
    let zoneLabel = 'VERDE · Dentro de ZTI';
    if (divergence > 40) { zone = 'red'; zoneLabel = 'ROJO · Bloqueo de desarrollo'; }
    else if (divergence > 25) { zone = 'orange'; zoneLabel = 'NARANJA · PDP activado'; }
    else if (divergence > 12) { zone = 'yellow'; zoneLabel = 'AMARILLO · Monitorear'; }

    return { mc, vol, intv, reasons, divergence, zone, zoneLabel };
  }, [rpe, hrv, minutesPlayed, dfi, athleteType, sessionType]);

  const ZONE_COLORS = {
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: '#10B981', icon: CheckCircle2 },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: '#F59E0B', icon: AlertCircle },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: '#F97316', icon: AlertTriangle },
    red:    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accent: '#EF4444', icon: XCircle },
  };
  const ZC = ZONE_COLORS[result.zone];
  const ZoneIcon = ZC.icon;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* INPUTS - left 2 cols */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#CCFF00]" /> Inputs del atleta
        </h2>

        <div className="bg-white border rounded-xl p-5 space-y-5">
          <SliderField
            label="RPE matinal"
            value={rpe[0]}
            onChange={setRpe}
            min={0} max={10} step={1}
            format={v => `${v}/10`}
            tone={rpe[0] >= 8 ? 'red' : rpe[0] >= 7 ? 'orange' : 'green'}
            hint="Escala de esfuerzo percibido al despertar"
            testid="pdi-sim-rpe"
          />
          <SliderField
            label="HRV (% baseline)"
            value={hrv[0]}
            onChange={setHrv}
            min={40} max={130} step={1}
            format={v => `${v}%`}
            tone={hrv[0] < 75 ? 'red' : hrv[0] < 85 ? 'orange' : 'green'}
            hint="Variabilidad cardiaca vs línea base personal"
            testid="pdi-sim-hrv"
          />
          <SliderField
            label="Minutos jugados último partido"
            value={minutesPlayed[0]}
            onChange={setMinutesPlayed}
            min={0} max={120} step={5}
            format={v => `${v} min`}
            hint="Afecta MD+1 (recuperación)"
            testid="pdi-sim-min"
          />
          <SliderField
            label="DFI · Deuda de Fatiga"
            value={dfi[0]}
            onChange={setDfi}
            min={0} max={100} step={1}
            format={v => `${v}%`}
            tone={dfi[0] > 85 ? 'red' : dfi[0] > 70 ? 'orange' : 'green'}
            hint="Carga aguda / carga crónica del atleta"
            testid="pdi-sim-dfi"
          />

          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div>
              <Label className="text-xs font-semibold">Tipo adaptativo</Label>
              <Select value={athleteType} onValueChange={setAthleteType}>
                <SelectTrigger data-testid="pdi-sim-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabel).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Sesión (morfociclo)</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger data-testid="pdi-sim-session"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MC_BASE).map(([v, m]) => (
                    <SelectItem key={v} value={v}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* OUTPUTS - right 3 cols */}
      <div className="lg:col-span-3 space-y-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-slate-500" /> Output del Motor de Convergencia
        </h2>

        {/* Zone alert */}
        <div className={`${ZC.bg} ${ZC.border} border-2 rounded-xl p-5 flex items-start gap-3`} data-testid="pdi-sim-zone">
          <ZoneIcon className="w-6 h-6 flex-shrink-0" style={{ color: ZC.accent }} />
          <div className="flex-1">
            <div className={`text-xs font-black uppercase tracking-wider ${ZC.text} mb-1`}>{result.zoneLabel}</div>
            <p className="text-xs text-slate-600">
              Divergencia máxima vs colectivo: <strong className="text-slate-900">{result.divergence}%</strong>.
              {result.zone === 'green' && ' CIA aplicable sin restricciones.'}
              {result.zone === 'yellow' && ' Monitorear próximas 24h.'}
              {result.zone === 'orange' && ' Aplicar Protocolo de Divergencia Planificada (PDP).'}
              {result.zone === 'red' && ' Bloquear carga de desarrollo. Activar Resincronización Progresiva (RP).'}
            </p>
          </div>
        </div>

        {/* CIA vs MC */}
        <div className="grid grid-cols-2 gap-4">
          <ComparisonCard
            title="Volumen"
            mc={result.mc.vol}
            cia={result.vol}
            color="#3B82F6"
            testid="pdi-sim-vol-out"
          />
          <ComparisonCard
            title="Intensidad"
            mc={result.mc.int}
            cia={result.intv}
            color="#EF4444"
            testid="pdi-sim-int-out"
          />
        </div>

        {/* Reasoning */}
        <div className="bg-slate-50 border rounded-xl p-5">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Reglas aplicadas por el Motor
          </h3>
          {result.reasons.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Ninguna regla activada. CIA = MC (dentro de ZTI).</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-700" data-testid="pdi-sim-reasons">
              {result.reasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#CCFF00]">▸</span>{r}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-4 text-[11px] flex items-start gap-2">
          <Shield className="w-4 h-4 text-[#CCFF00] flex-shrink-0 mt-0.5" />
          <p className="text-white/70">
            Este simulador refleja la lógica del Motor de Convergencia (ZTI + PDP + RP). La implementación completa en
            producción integra GPS, historial de lesiones, HRV continuo y modelos ML de predicción de lesión.
          </p>
        </div>
      </div>
    </div>
  );
};

const SliderField = ({ label, value, onChange, min, max, step, format, tone = 'green', hint, testid }) => {
  const toneColor = { green: '#10B981', orange: '#F97316', red: '#EF4444' }[tone];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs font-semibold">{label}</Label>
        <span className="text-xs font-bold tabular-nums" style={{ color: toneColor }} data-testid={`${testid}-val`}>{format(value)}</span>
      </div>
      <Slider value={[value]} onValueChange={onChange} min={min} max={max} step={step} data-testid={testid} />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
};

const ComparisonCard = ({ title, mc, cia, color, testid }) => {
  const delta = cia - mc;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta > 2 ? '#10B981' : delta < -2 ? '#EF4444' : '#64748B';
  return (
    <div className="bg-white border rounded-xl p-5" data-testid={testid}>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-black tabular-nums" style={{ color }}>{cia}</span>
        <span className="text-sm text-slate-400">%</span>
        <DeltaIcon className="w-4 h-4 ml-1" style={{ color: deltaColor }} />
        <span className="text-xs font-semibold tabular-nums" style={{ color: deltaColor }}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="text-[10px]">
          <div className="flex justify-between text-slate-500 mb-0.5">
            <span>MC colectivo</span><span className="tabular-nums">{mc}%</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-400" style={{ width: `${mc}%` }} />
          </div>
        </div>
        <div className="text-[10px]">
          <div className="flex justify-between mb-0.5">
            <span className="font-bold" style={{ color }}>CIA ajustado</span>
            <span className="tabular-nums font-bold" style={{ color }}>{cia}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cia}%`, background: color }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDITechnicalSheet;

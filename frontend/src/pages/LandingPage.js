import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Check, Target, Brain, Calendar, BarChart3, Download, Users,
  ArrowRight, Activity, Zap, TrendingUp, FileText, Dumbbell,
  ChevronRight, Shield, Clock, Layers, LineChart, Heart,
  Ruler, Eye, Timer, Sparkles
} from 'lucide-react';

/* ─── Constants ─── */
const PRICING = [
  {
    name: 'Free',
    price: '0',
    description: 'Para empezar a explorar',
    features: ['2 atletas', '1 plan de entrenamiento', '3 generaciones con IA', 'Exportación básica'],
    cta: 'Comenzar Gratis',
    popular: false,
  },
  {
    name: 'Basic',
    price: '9.99',
    description: 'Para entrenadores individuales',
    features: ['10 atletas', '5 planes de entrenamiento', '20 generaciones con IA', 'Exportación PDF', 'Soporte email'],
    cta: 'Elegir Basic',
    popular: false,
  },
  {
    name: 'Pro',
    price: '29.99',
    description: 'Para entrenadores profesionales',
    features: ['50 atletas', 'Planes ilimitados', '100 generaciones con IA', 'Exportación PDF/Excel', 'Soporte prioritario'],
    cta: 'Elegir Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '99.99',
    description: 'Para clubes y federaciones',
    features: ['Atletas ilimitados', 'Todo ilimitado', 'API personalizada', 'Soporte 24/7', 'Personalización'],
    cta: 'Contactar',
    popular: false,
  },
];

/* ─── Dashboard Mockup Component ─── */
const DashboardMockup = () => (
  <div className="relative w-full" style={{ perspective: '1200px' }}>
    <div
      className="bg-[#0f172a] rounded-xl border border-slate-700/50 overflow-hidden shadow-2xl shadow-black/40"
      style={{ transform: 'rotateY(-2deg) rotateX(1deg)' }}
    >
      {/* Mock top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1e293b] border-b border-slate-700/50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">T</span>
          </div>
          <span className="text-[10px] font-bold text-white tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>TRAIN</span>
          <div className="flex gap-1 ml-3">
            <div className="px-2 py-0.5 bg-blue-500/20 rounded text-[8px] text-blue-300 font-medium">Panel</div>
            <div className="px-2 py-0.5 rounded text-[8px] text-slate-400">Datos</div>
            <div className="px-2 py-0.5 rounded text-[8px] text-slate-400">PDF</div>
          </div>
        </div>
      </div>

      {/* Mock dashboard content */}
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-white uppercase tracking-wide" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Panel de Control</div>
            <div className="text-[8px] text-slate-500">lunes, 30 mar</div>
          </div>
          <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[7px] text-emerald-400">
            Todo en orden
          </div>
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-6 gap-2">
          {/* Readiness */}
          <div className="col-span-2 bg-[#1e293b] rounded-lg p-3 border border-slate-700/30">
            <div className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Readiness Score</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-400" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>85%</span>
              <span className="text-[7px] text-emerald-400/60">Optimo</span>
            </div>
            <div className="mt-2 space-y-1">
              {[{ l: 'Sueño', v: 90, c: 'bg-blue-400' }, { l: 'Dolor', v: 40, c: 'bg-red-400' }, { l: 'Estrés', v: 35, c: 'bg-amber-400' }, { l: 'Motivación', v: 95, c: 'bg-emerald-400' }].map((m, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[6px] text-slate-500 w-10 truncate">{m.l}</span>
                  <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${m.c} rounded-full`} style={{ width: `${m.v}%` }} />
                  </div>
                  <span className="text-[6px] text-slate-400 w-5 text-right">{m.v}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ratio */}
          <div className="col-span-2 bg-[#1e293b] rounded-lg p-3 border border-slate-700/30">
            <div className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Ratio Carga A:C</div>
            <div className="text-2xl font-black text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>1.18</div>
            <div className="text-[7px] text-slate-500">Estable</div>
            <div className="mt-1 flex gap-3 text-[6px]">
              <div><span className="text-slate-400">Aguda:</span> <span className="text-white">450 UA</span></div>
              <div><span className="text-slate-400">Crónica:</span> <span className="text-white">380 UA</span></div>
            </div>
          </div>

          {/* Mini stat cards */}
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex flex-col justify-between">
              <div className="text-[6px] text-blue-300/80 uppercase tracking-wider font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Planes</div>
              <div className="text-lg font-black text-blue-300" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>5</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 flex flex-col justify-between">
              <div className="text-[6px] text-purple-300/80 uppercase tracking-wider font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Atletas</div>
              <div className="text-lg font-black text-purple-300" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>12</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex flex-col justify-between">
              <div className="text-[6px] text-emerald-300/80 uppercase tracking-wider font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Adherencia</div>
              <div className="text-lg font-black text-emerald-300" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>92%</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex flex-col justify-between">
              <div className="text-[6px] text-amber-300/80 uppercase tracking-wider font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Ejercicios</div>
              <div className="text-lg font-black text-amber-300" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>150+</div>
            </div>
          </div>
        </div>

        {/* Chart area */}
        <div className="bg-[#1e293b] rounded-lg p-3 border border-slate-700/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3 h-3 text-blue-400" />
              <span className="text-[8px] font-bold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Volumen, Intensidad y Densidad</span>
              <span className="text-[6px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">En vivo</span>
            </div>
          </div>
          {/* Mini bar chart */}
          <div className="flex items-end gap-1 h-14 px-1">
            {[
              [45, 35, 25], [50, 40, 30], [55, 45, 28], [48, 52, 32],
              [60, 50, 35], [70, 55, 38], [65, 68, 45], [72, 60, 40],
              [55, 48, 30], [50, 45, 28], [62, 55, 35], [68, 58, 42]
            ].map((bars, i) => (
              <div key={i} className="flex-1 flex items-end gap-[1px]">
                <div className="flex-1 bg-blue-400 rounded-t-[1px]" style={{ height: `${bars[0]}%` }} />
                <div className="flex-1 bg-red-400 rounded-t-[1px]" style={{ height: `${bars[1]}%` }} />
                <div className="flex-1 bg-emerald-400 rounded-t-[1px]" style={{ height: `${bars[2]}%` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 px-1">
            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'].map(s => (
              <span key={s} className="text-[5px] text-slate-600">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── Mini Periodization Visual ─── */
const PeriodizationVisual = () => (
  <div className="flex items-end gap-[3px] h-20">
    {[65, 80, 55, 90, 70, 85, 45, 75, 95, 60, 80, 50].map((h, i) => (
      <div
        key={i}
        className="flex-1 rounded-sm"
        style={{
          height: `${h}%`,
          background: i % 3 === 0 ? '#007AFF' : i % 3 === 1 ? '#CCFF00' : '#334155',
        }}
      />
    ))}
  </div>
);

/* ─── How it Works Step ─── */
const StepCard = ({ number, icon: Icon, title, description }) => (
  <div className="relative group">
    <div className="bg-white border border-slate-200 rounded-2xl p-8 h-full hover:border-[#007AFF]/30 hover:shadow-[0_8px_30px_rgba(0,122,255,0.06)] transition-all duration-300">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-[#CCFF00] group-hover:scale-105 transition-transform duration-300">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-5xl font-black text-slate-100" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {number}
        </span>
      </div>
      <h3 className="text-lg font-bold tracking-tight uppercase text-slate-900 mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

/* ─── Control Card for Evaluation Section ─── */
const ControlCard = ({ icon: Icon, title, color }) => (
  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 transition-colors duration-200">
    <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <span className="text-xs font-bold uppercase tracking-wide text-slate-700" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{title}</span>
  </div>
);

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">

      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                TR<span className="text-[#007AFF]">AI</span>N
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Funciones</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Cómo funciona</a>
              <a href="#pricing" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Precios</a>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="text-sm font-medium text-slate-600 hover:text-slate-900" data-testid="login-nav-btn">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-slate-900 text-white hover:bg-slate-800 text-sm font-bold uppercase tracking-wide px-6 h-10 rounded-lg" data-testid="signup-nav-btn">
                  Comenzar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="pt-28 pb-8 md:pt-36 md:pb-16 px-6 relative overflow-hidden">
        {/* Subtle dot grid bg */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2 rounded-full mb-8">
                <Sparkles className="w-4 h-4 text-[#007AFF]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Potenciado por Inteligencia Artificial
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase text-slate-900 mb-6 leading-[0.92]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                La plataforma que<br />
                <span className="text-[#007AFF]">transforma</span> tu<br />
                planificación deportiva
              </h1>

              <p className="text-base md:text-lg text-slate-500 mb-10 max-w-lg leading-relaxed">
                Crea planes de periodización científicos, controla a tus atletas y analiza el rendimiento con IA. Todo en un solo sistema diseñado para entrenadores profesionales.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link to="/auth">
                  <Button className="bg-slate-900 text-white hover:bg-slate-800 h-13 px-8 text-sm font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-slate-900/20" data-testid="hero-cta-btn">
                    Empezar Gratis
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" className="h-13 px-8 text-sm font-bold uppercase tracking-wide border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">
                    Ver Funciones
                  </Button>
                </a>
              </div>

              <div className="flex items-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> 14 días gratis</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Sin tarjeta</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Cancela cuando quieras</span>
              </div>
            </div>

            {/* Right: Dashboard Mockup */}
            <div className="relative hidden lg:block">
              <DashboardMockup />
              {/* Floating glow behind */}
              <div className="absolute -inset-8 bg-[#007AFF]/5 rounded-3xl blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Ribbon ─── */}
      <section className="py-8 px-6 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '17', label: 'Modelos de Periodización', sub: 'Matveiev, ATR, Bloques...' },
              { value: '6', label: 'Controles Científicos', sub: 'Médico, físico, táctico...' },
              { value: '150+', label: 'Ejercicios', sub: 'Biblioteca completa' },
              { value: '5', label: 'Calculadoras', sub: '1RM, VO2máx, Karvonen...' },
            ].map((stat, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="text-3xl md:text-4xl font-black text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {stat.value}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-1" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Section - Bento Grid ─── */}
      <section id="features" className="py-24 md:py-32 px-6 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-16 md:mb-20 max-w-2xl">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#007AFF] mb-4 block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Funcionalidades
            </span>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight uppercase text-slate-900 mb-6 leading-[0.95]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Todo lo que necesitas,<br />
              <span className="text-[#007AFF]">nada que te sobre</span>
            </h2>
            <p className="text-base text-slate-500 leading-relaxed max-w-lg">
              Cada herramienta diseñada con precisión científica. Planificación, evaluación y análisis en un solo ecosistema.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-12 gap-4 md:gap-5 auto-rows-[140px] md:auto-rows-[160px]">

            {/* Card 1: Periodización - Large */}
            <div className="col-span-12 md:col-span-8 row-span-2 group relative bg-slate-900 rounded-2xl p-8 md:p-10 overflow-hidden cursor-default" data-testid="feature-periodization">
              <div className="absolute top-4 right-4 md:top-6 md:right-6 text-xs font-bold tracking-[0.15em] uppercase text-slate-600" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>01 — Core</div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#CCFF00] rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-slate-900" />
                    </div>
                    <span className="text-xs font-bold tracking-[0.15em] uppercase text-[#CCFF00]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>17 modelos</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-white mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Periodización Científica
                  </h3>
                  <p className="text-slate-400 text-sm md:text-base max-w-md">
                    Desde Matveiev hasta ATR de Issurin. Macrociclos, mesociclos y microciclos con estructura automática.
                  </p>
                </div>
                <div className="mt-6"><PeriodizationVisual /></div>
              </div>
              <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#007AFF]/10 rounded-full blur-3xl" />
            </div>

            {/* Card 2: Athletes Image */}
            <div className="col-span-12 md:col-span-4 row-span-2 group relative rounded-2xl overflow-hidden cursor-default" data-testid="feature-athletes">
              <img src="https://images.unsplash.com/photo-1766287451380-999a0d37880d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwyfHxneW0lMjB3ZWlnaHRsaWZ0aW5nJTIwZm9jdXN8ZW58MHx8fHwxNzcwNjkzMzk3fDA&ixlib=rb-4.1.0&q=85" alt="Athlete" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#CCFF00]" />
                  <span className="text-xs font-bold tracking-[0.15em] uppercase text-[#CCFF00]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Central</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight uppercase text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Gestión de Atletas
                </h3>
                <p className="text-white/60 text-sm mt-1 hidden md:block">Perfiles completos y seguimiento individualizado.</p>
              </div>
            </div>

            {/* Card 3: IA */}
            <div className="col-span-12 md:col-span-6 row-span-2 group relative bg-slate-50 border border-slate-200 rounded-2xl p-8 md:p-10 overflow-hidden cursor-default hover:border-[#007AFF]/30 transition-colors duration-300" data-testid="feature-ai">
              <div className="absolute top-4 right-4 md:top-6 md:right-6 text-xs font-bold tracking-[0.15em] uppercase text-slate-400" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>02 — Inteligencia</div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-slate-900 mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    IA Generativa
                  </h3>
                  <p className="text-slate-500 text-sm md:text-base max-w-sm">
                    Genera planes personalizados con inteligencia artificial. Adapta cargas, volúmenes y distribución automáticamente.
                  </p>
                </div>
                <div className="flex items-end justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-[#007AFF]/10 rounded-md"><span className="text-xs font-bold text-[#007AFF]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>GPT</span></div>
                    <div className="px-3 py-1.5 bg-slate-200 rounded-md"><span className="text-xs font-bold text-slate-600" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>AUTO</span></div>
                    <div className="px-3 py-1.5 bg-emerald-100 rounded-md"><span className="text-xs font-bold text-emerald-600" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>SMART</span></div>
                  </div>
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-[#007AFF]/20 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-2 rounded-full border-2 border-[#007AFF]/30 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain className="w-6 h-6 text-[#007AFF]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Análisis */}
            <div className="col-span-12 md:col-span-6 row-span-2 group relative bg-white border border-slate-200 rounded-2xl p-8 md:p-10 overflow-hidden cursor-default hover:border-slate-300 transition-colors duration-300" data-testid="feature-analysis">
              <div className="absolute top-4 right-4 md:top-6 md:right-6 text-xs font-bold tracking-[0.15em] uppercase text-slate-400" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>03 — Datos</div>
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5 text-[#CCFF00]" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight uppercase text-slate-900 mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Análisis en<br />Tiempo Real
                  </h3>
                  <p className="text-slate-500 text-sm max-w-sm">
                    6 tipos de controles científicos. Médico, antropométrico, físico, técnico, táctico y psicológico.
                  </p>
                </div>
                <div className="flex gap-6 mt-6">
                  {[{ v: '6', l: 'Controles' }, { v: '24/7', l: 'Monitoreo' }, { v: 'PDF', l: 'Reportes' }].map((m, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <div className="w-px bg-slate-200" />}
                      <div>
                        <div className="text-2xl font-black text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{m.v}</div>
                        <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-slate-400" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{m.l}</div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 5: Swimmer */}
            <div className="col-span-12 md:col-span-4 row-span-2 group relative rounded-2xl overflow-hidden cursor-default" data-testid="feature-multisport">
              <img src="https://images.unsplash.com/photo-1569464371078-75f4a4ecc863?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxzd2ltbWVyJTIwdW5kZXJ3YXRlcnxlbnwwfHx8fDE3NzA2OTMzOTZ8MA&ixlib=rb-4.1.0&q=85" alt="Swimmer" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#CCFF00]" />
                  <span className="text-xs font-bold tracking-[0.15em] uppercase text-[#CCFF00]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Universal</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight uppercase text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Multi-Deporte</h3>
                <p className="text-white/60 text-sm mt-1 hidden md:block">Fútbol, atletismo, natación, ciclismo y más.</p>
              </div>
            </div>

            {/* Card 6: Calculadoras */}
            <div className="col-span-12 md:col-span-4 row-span-1 group relative bg-[#007AFF] rounded-2xl p-6 overflow-hidden cursor-default" data-testid="feature-calculators">
              <div className="relative z-10 flex items-center justify-between h-full">
                <div>
                  <h3 className="text-base md:text-lg font-bold tracking-tight uppercase text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Calculadoras Científicas</h3>
                  <p className="text-white/70 text-xs mt-1">1RM, VO2máx, Zonas FC, Karvonen</p>
                </div>
                <Activity className="w-8 h-8 text-white/30 group-hover:text-white/70 transition-colors duration-300" />
              </div>
            </div>

            {/* Card 7: Export */}
            <div className="col-span-12 md:col-span-4 row-span-1 group relative bg-slate-900 rounded-2xl p-6 overflow-hidden cursor-default" data-testid="feature-export">
              <div className="relative z-10 flex items-center justify-between h-full">
                <div>
                  <h3 className="text-base md:text-lg font-bold tracking-tight uppercase text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Exportación PDF</h3>
                  <p className="text-slate-400 text-xs mt-1">Planes listos para imprimir</p>
                </div>
                <FileText className="w-8 h-8 text-[#CCFF00]/40 group-hover:text-[#CCFF00] transition-colors duration-300" />
              </div>
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#CCFF00]/5 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Dashboard Preview Section ─── */}
      <section className="py-24 md:py-32 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text */}
            <div>
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#CCFF00] mb-4 block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Panel de Control
              </span>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase text-white mb-6 leading-[0.95]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Todo tu equipo<br />en una sola vista
              </h2>
              <p className="text-base text-slate-400 leading-relaxed mb-10 max-w-lg">
                Readiness Score, ratio de carga aguda/crónica, adherencia, gráficos de volumen e intensidad. Monitorea cada variable que importa desde un panel centralizado.
              </p>

              {/* Evaluation controls list */}
              <div className="grid grid-cols-2 gap-3">
                <ControlCard icon={Heart} title="Control Médico" color="bg-red-500" />
                <ControlCard icon={Ruler} title="Antropometría" color="bg-blue-500" />
                <ControlCard icon={Dumbbell} title="Control Físico" color="bg-emerald-500" />
                <ControlCard icon={Eye} title="Control Técnico" color="bg-purple-500" />
                <ControlCard icon={Target} title="Control Táctico" color="bg-amber-500" />
                <ControlCard icon={Brain} title="Control Psicológico" color="bg-pink-500" />
              </div>
            </div>

            {/* Right: Dashboard mockup (dark variant) */}
            <div className="relative">
              <DashboardMockup />
              <div className="absolute -inset-12 bg-[#007AFF]/5 rounded-3xl blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 md:py-32 px-6 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 md:mb-20 max-w-2xl">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#007AFF] mb-4 block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Cómo Funciona
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase text-slate-900 mb-6 leading-[0.95]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              De la idea al<br />
              <span className="text-[#007AFF]">plan perfecto</span> en 3 pasos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StepCard
              number="01"
              icon={Layers}
              title="Crea tu Plan"
              description="Selecciona el modelo de periodización, define macrociclos, mesociclos y microciclos. La IA puede generar la estructura automáticamente."
            />
            <StepCard
              number="02"
              icon={Activity}
              title="Carga los Datos"
              description="Agrega atletas, evaluaciones médicas, controles físicos, competencias y objetivos. Todo queda vinculado al plan."
            />
            <StepCard
              number="03"
              icon={LineChart}
              title="Analiza y Optimiza"
              description="Visualiza gráficos de carga, readiness score, ratio aguda/crónica y toma decisiones basadas en datos reales."
            />
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section id="pricing" className="py-24 md:py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 md:mb-20 text-center">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-[#007AFF] mb-4 block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Precios
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase text-slate-900 mb-4" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Planes para cada nivel
            </h2>
            <p className="text-base text-slate-500 max-w-lg mx-auto">
              Desde entrenadores individuales hasta clubes y federaciones
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {PRICING.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white border rounded-2xl p-7 hover:shadow-lg transition-all duration-300 ${plan.popular ? 'border-[#007AFF] shadow-[0_0_30px_rgba(0,122,255,0.08)]' : 'border-slate-200 hover:border-slate-300'}`}
                data-testid={`pricing-card-${plan.name.toLowerCase()}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-[#CCFF00] text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                  <div className="flex items-baseline mt-4">
                    <span className="text-4xl font-black text-slate-900" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>${plan.price}</span>
                    <span className="text-sm text-slate-400 ml-1">/mes</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-7">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link to="/auth">
                  <Button
                    className={`w-full rounded-lg h-11 text-xs font-bold uppercase tracking-wide ${plan.popular ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                    data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 md:py-32 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase text-white mb-5" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Empieza a planificar<br />
            <span className="text-[#CCFF00]">como un profesional</span>
          </h2>
          <p className="text-base text-slate-400 mb-10 max-w-lg mx-auto">
            Únete a entrenadores que ya optimizan sus planes con ciencia e inteligencia artificial.
          </p>
          <Link to="/auth">
            <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-13 px-10 text-sm font-bold uppercase tracking-wide rounded-lg shadow-lg shadow-[#CCFF00]/20" data-testid="cta-final-btn">
              Crear Cuenta Gratis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-6 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-bold tracking-tight text-white text-sm" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              TR<span className="text-[#007AFF]">AI</span>N
            </span>
          </div>
          <p className="text-xs text-slate-500">© 2025 TrAIn. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

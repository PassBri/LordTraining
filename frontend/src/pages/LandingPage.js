import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Check, Target, Brain, Calendar, BarChart3, Users,
  ArrowRight, Activity, FileText, Dumbbell,
  Heart, Ruler, Eye, Sparkles, Layers, LineChart,
  ChevronRight, Zap, Shield
} from 'lucide-react';

const BC = "'Barlow Condensed', sans-serif";

/* ─── PRICING ─── */
const PRICING = [
  { name: 'Free', price: '0', desc: 'Para explorar', features: ['2 atletas', '1 plan', '3 generaciones IA', 'Exportación básica'], cta: 'Comenzar Gratis', pop: false },
  { name: 'Basic', price: '9.99', desc: 'Entrenadores individuales', features: ['10 atletas', '5 planes', '20 generaciones IA', 'PDF', 'Soporte email'], cta: 'Elegir Basic', pop: false },
  { name: 'Pro', price: '29.99', desc: 'Entrenadores profesionales', features: ['50 atletas', 'Planes ilimitados', '100 generaciones IA', 'PDF/Excel', 'Soporte prioritario'], cta: 'Elegir Pro', pop: true },
  { name: 'Enterprise', price: '99.99', desc: 'Clubes y federaciones', features: ['Atletas ilimitados', 'Todo ilimitado', 'API personalizada', 'Soporte 24/7', 'Personalización'], cta: 'Contactar', pop: false },
];

/* ═══ CSS-ONLY VISUAL COMPONENTS ═══ */

/* Animated periodization bars — the "heartbeat" of TrAIn */
const PeriodizationWave = ({ height = 'h-24', count = 20 }) => {
  const bars = Array.from({ length: count }, (_, i) => {
    const phase = (i / count) * Math.PI * 2;
    const h = 30 + Math.sin(phase) * 25 + Math.cos(phase * 1.5) * 20;
    return Math.max(15, Math.min(95, h));
  });
  return (
    <div className={`flex items-end gap-[2px] ${height} w-full`}>
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all duration-500"
          style={{
            height: `${h}%`,
            background: i % 4 === 0 ? '#007AFF' : i % 4 === 1 ? '#CCFF00' : i % 4 === 2 ? '#0f172a' : '#334155',
            opacity: 0.85 + (i % 3) * 0.05,
          }}
        />
      ))}
    </div>
  );
};

/* Radial readiness gauge */
const ReadinessGauge = ({ size = 120, value = 85 }) => {
  const r = (size - 12) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (c * value) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#CCFF00" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white" style={{ fontFamily: BC }}>{value}%</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400" style={{ fontFamily: BC }}>Ready</span>
      </div>
    </div>
  );
};

/* Abstract team dots — representing athletes in a formation */
const TeamFormation = () => {
  const positions = [
    [50, 15], [25, 35], [50, 35], [75, 35],
    [15, 55], [40, 55], [60, 55], [85, 55],
    [30, 75], [50, 75], [70, 75],
  ];
  return (
    <div className="relative w-full h-full min-h-[120px]">
      {positions.map(([x, y], i) => (
        <div
          key={i}
          className="absolute w-3 h-3 rounded-full transition-all duration-300"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
            background: i < 3 ? '#CCFF00' : i < 7 ? '#007AFF' : '#334155',
            boxShadow: i < 3 ? '0 0 8px rgba(204,255,0,0.4)' : i < 7 ? '0 0 8px rgba(0,122,255,0.3)' : 'none',
          }}
        />
      ))}
      {/* Connecting lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="25" y1="35" x2="50" y2="15" stroke="#1e293b" strokeWidth="0.5" />
        <line x1="75" y1="35" x2="50" y2="15" stroke="#1e293b" strokeWidth="0.5" />
        <line x1="25" y1="35" x2="40" y2="55" stroke="#1e293b" strokeWidth="0.5" />
        <line x1="75" y1="35" x2="60" y2="55" stroke="#1e293b" strokeWidth="0.5" />
        <line x1="50" y1="35" x2="50" y2="75" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="2,2" />
      </svg>
    </div>
  );
};

/* Abstract data rings for analysis */
const DataRings = () => (
  <div className="relative w-28 h-28">
    {[
      { r: 50, color: '#007AFF', dash: '80,120', width: 3 },
      { r: 40, color: '#CCFF00', dash: '60,100', width: 3 },
      { r: 30, color: '#64748b', dash: '40,80', width: 2 },
    ].map((ring, i) => (
      <svg key={i} className="absolute inset-0 w-full h-full" style={{ animation: `spin ${8 + i * 4}s linear infinite`, animationDirection: i % 2 ? 'reverse' : 'normal' }}>
        <circle cx="56" cy="56" r={ring.r} fill="none" stroke={ring.color} strokeWidth={ring.width} strokeDasharray={ring.dash} strokeLinecap="round" opacity="0.6" />
      </svg>
    ))}
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </div>
);

/* Geometric speed lines */
const SpeedLines = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
    {Array.from({ length: 12 }, (_, i) => (
      <div
        key={i}
        className="absolute bg-white"
        style={{
          height: '1px',
          width: `${40 + Math.random() * 40}%`,
          top: `${8 + i * 8}%`,
          right: 0,
          opacity: 0.3 + Math.random() * 0.5,
        }}
      />
    ))}
  </div>
);

/* Dashboard Mockup — 100% CSS */
const DashboardMockup = ({ compact = false }) => (
  <div className={`bg-[#0c1222] rounded-xl border border-slate-700/40 overflow-hidden shadow-2xl shadow-black/50 ${compact ? 'text-[0.85em]' : ''}`}>
    <div className="flex items-center gap-2 px-3 py-2 bg-[#151d2e] border-b border-slate-700/40">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-400/80" />
        <div className="w-2 h-2 rounded-full bg-yellow-400/80" />
        <div className="w-2 h-2 rounded-full bg-green-400/80" />
      </div>
      <div className="flex items-center gap-1.5 ml-3">
        <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center">
          <span className="text-[6px] font-bold text-white">T</span>
        </div>
        <span className="text-[8px] font-bold text-white/80" style={{ fontFamily: BC }}>TRAIN</span>
        <div className="flex gap-1 ml-2">
          {['Panel', 'Datos', 'PDF'].map((t, i) => (
            <div key={t} className={`px-1.5 py-0.5 rounded text-[7px] font-medium ${i === 0 ? 'bg-blue-500/20 text-blue-300' : 'text-slate-500'}`}>{t}</div>
          ))}
        </div>
      </div>
    </div>
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[8px] font-bold text-white/90 uppercase tracking-wider" style={{ fontFamily: BC }}>Panel de Control</div>
          <div className="text-[6px] text-slate-500">lunes, 30 mar</div>
        </div>
        <div className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[6px] text-emerald-400 font-medium">Todo en orden</div>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        <div className="col-span-2 bg-[#151d2e] rounded-lg p-2 border border-slate-700/20">
          <div className="text-[6px] font-bold text-slate-500 uppercase" style={{ fontFamily: BC }}>Readiness</div>
          <div className="text-lg font-black text-emerald-400 leading-none mt-0.5" style={{ fontFamily: BC }}>85%</div>
          <div className="mt-1 space-y-[2px]">
            {[{ w: 90, c: 'bg-blue-400' }, { w: 40, c: 'bg-red-400' }, { w: 35, c: 'bg-amber-400' }, { w: 95, c: 'bg-emerald-400' }].map((m, i) => (
              <div key={i} className="h-[3px] bg-slate-700 rounded-full overflow-hidden"><div className={`h-full ${m.c} rounded-full`} style={{ width: `${m.w}%` }} /></div>
            ))}
          </div>
        </div>
        <div className="col-span-2 bg-[#151d2e] rounded-lg p-2 border border-slate-700/20">
          <div className="text-[6px] font-bold text-slate-500 uppercase" style={{ fontFamily: BC }}>Ratio A:C</div>
          <div className="text-xl font-black text-white leading-none mt-0.5" style={{ fontFamily: BC }}>1.18</div>
          <div className="text-[5px] text-emerald-400 mt-0.5 font-medium">Estable</div>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-1">
          {[
            { v: '5', c: 'text-blue-300 bg-blue-500/10 border-blue-500/15' },
            { v: '12', c: 'text-purple-300 bg-purple-500/10 border-purple-500/15' },
            { v: '92%', c: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/15' },
            { v: '150+', c: 'text-amber-300 bg-amber-500/10 border-amber-500/15' },
          ].map((s, i) => (
            <div key={i} className={`${s.c} border rounded-md p-1 text-center`}>
              <div className="text-xs font-black leading-none" style={{ fontFamily: BC }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#151d2e] rounded-lg p-2 border border-slate-700/20">
        <div className="flex items-center gap-1 mb-1">
          <BarChart3 className="w-2 h-2 text-blue-400" />
          <span className="text-[6px] font-bold text-white/80" style={{ fontFamily: BC }}>Volumen e Intensidad</span>
          <span className="text-[5px] px-1 py-[1px] bg-emerald-500/20 text-emerald-400 rounded font-medium ml-1">En vivo</span>
        </div>
        <div className="flex items-end gap-[2px] h-8">
          {[[45,35],[50,40],[55,45],[48,52],[60,50],[70,55],[65,68],[72,60],[55,48],[50,45],[62,55],[68,58]].map((b, i) => (
            <div key={i} className="flex-1 flex items-end gap-[1px]">
              <div className="flex-1 bg-blue-400 rounded-t-[1px]" style={{ height: `${b[0]}%` }} />
              <div className="flex-1 bg-red-400/80 rounded-t-[1px]" style={{ height: `${b[1]}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════ */
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0f1a]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1a]/90 backdrop-blur-xl border-b border-white/5" data-testid="main-nav">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#CCFF00] rounded-lg flex items-center justify-center">
                <span className="text-slate-900 font-black text-xs">T</span>
              </div>
              <span className="text-base font-bold tracking-tight text-white" style={{ fontFamily: BC }}>
                TR<span className="text-[#CCFF00]">AI</span>N
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {[['#features', 'Funciones'], ['#how-it-works', 'Cómo funciona'], ['#pricing', 'Precios']].map(([href, label]) => (
                <a key={href} href={href} className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors">{label}</a>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="ghost" className="text-[13px] font-medium text-slate-400 hover:text-white h-9 px-3" data-testid="login-nav-btn">Iniciar Sesión</Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] text-[11px] font-bold uppercase tracking-wider px-5 h-9 rounded-lg" data-testid="signup-nav-btn">Comenzar</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-14 overflow-hidden">
        <SpeedLines />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#007AFF]/[0.03] to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-gradient-to-t from-[#CCFF00]/[0.02] to-transparent" />

        <div className="max-w-6xl mx-auto px-5 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-14 lg:py-16">
            {/* Left */}
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 rounded-full mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400" style={{ fontFamily: BC }}>Potenciado por IA</span>
              </div>

              <h1 className="text-[2.5rem] sm:text-[3.2rem] font-black tracking-tight uppercase text-white mb-4 leading-[0.95]" style={{ fontFamily: BC }}>
                Planifica.<br />
                <span className="text-[#CCFF00]">Controla.</span><br />
                Domina.
              </h1>

              <p className="text-[14px] text-slate-400 mb-7 leading-relaxed max-w-sm">
                El sistema de periodización científica que usan los entrenadores de alto rendimiento. 17 modelos, 6 controles, IA integrada.
              </p>

              <div className="flex gap-3 mb-5">
                <Link to="/auth">
                  <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-10 px-6 text-[11px] font-bold uppercase tracking-wider rounded-lg" data-testid="hero-cta-btn">
                    Empezar Gratis <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" className="h-10 px-5 text-[11px] font-bold uppercase tracking-wider border-slate-700 text-slate-300 hover:bg-white/5 rounded-lg">
                    Ver Más
                  </Button>
                </a>
              </div>

              <div className="flex gap-4 text-[11px] text-slate-500">
                {['14 días gratis', 'Sin tarjeta', 'Cancela cuando quieras'].map(t => (
                  <span key={t} className="flex items-center gap-1"><Check className="w-3 h-3 text-[#CCFF00]/60" />{t}</span>
                ))}
              </div>
            </div>

            {/* Right — Dashboard */}
            <div className="lg:col-span-7 relative">
              <div style={{ transform: 'perspective(1200px) rotateY(-4deg) rotateX(1deg)' }}>
                <DashboardMockup />
              </div>
              {/* Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#007AFF]/[0.06] rounded-full blur-[80px] -z-10" />
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="border-t border-white/[0.04]">
          <div className="max-w-6xl mx-auto px-5 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: '17', l: 'Modelos de Periodización' },
                { v: '6', l: 'Controles Científicos' },
                { v: '150+', l: 'Ejercicios en Biblioteca' },
                { v: '5', l: 'Calculadoras Avanzadas' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-xl font-black text-[#CCFF00]" style={{ fontFamily: BC }}>{s.v}</span>
                  <span className="text-[11px] text-slate-500 leading-tight">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-14 md:py-18 px-5 bg-[#0e1424] relative">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#007AFF] block mb-2" style={{ fontFamily: BC }}>Funcionalidades</span>
              <h2 className="text-2xl md:text-[2rem] font-bold tracking-tight uppercase text-white leading-[1]" style={{ fontFamily: BC }}>
                Tu arsenal<br /><span className="text-[#CCFF00]">completo</span>
              </h2>
            </div>
            <p className="hidden md:block text-[13px] text-slate-500 max-w-[280px] text-right leading-relaxed">Herramientas de precisión científica para entrenadores de alto rendimiento.</p>
          </div>

          {/* Bento */}
          <div className="grid grid-cols-12 gap-3">

            {/* Periodización — 7 cols */}
            <div className="col-span-12 md:col-span-7 bg-[#151d2e] border border-slate-700/20 rounded-xl p-6 flex flex-col justify-between min-h-[240px]" data-testid="feature-periodization">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-[#CCFF00] rounded-md flex items-center justify-center"><Calendar className="w-3.5 h-3.5 text-slate-900" /></div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#CCFF00]" style={{ fontFamily: BC }}>17 modelos</span>
                </div>
                <h3 className="text-lg font-bold tracking-tight uppercase text-white mb-1" style={{ fontFamily: BC }}>Periodización Científica</h3>
                <p className="text-slate-400 text-[12px] max-w-xs leading-relaxed">Matveiev, ATR, Bloques, DUP, Conjugado. Macro, meso y microciclos generados automáticamente.</p>
              </div>
              <div className="mt-4">
                <PeriodizationWave height="h-16" count={24} />
              </div>
            </div>

            {/* Atletas — 5 cols */}
            <div className="col-span-12 md:col-span-5 bg-[#151d2e] border border-slate-700/20 rounded-xl p-6 flex flex-col justify-between min-h-[240px]" data-testid="feature-athletes">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-[#007AFF] rounded-md flex items-center justify-center"><Users className="w-3.5 h-3.5 text-white" /></div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#007AFF]" style={{ fontFamily: BC }}>Central</span>
                </div>
                <h3 className="text-lg font-bold tracking-tight uppercase text-white mb-1" style={{ fontFamily: BC }}>Gestión de Atletas</h3>
                <p className="text-slate-400 text-[12px] leading-relaxed">Perfiles completos, historial médico y seguimiento individualizado.</p>
              </div>
              <div className="mt-2">
                <TeamFormation />
              </div>
            </div>

            {/* IA — 5 cols */}
            <div className="col-span-12 md:col-span-5 bg-[#151d2e] border border-slate-700/20 rounded-xl p-6 flex flex-col justify-between min-h-[200px]" data-testid="feature-ai">
              <div>
                <h3 className="text-lg font-bold tracking-tight uppercase text-white mb-1" style={{ fontFamily: BC }}>IA Generativa</h3>
                <p className="text-slate-400 text-[12px] max-w-xs leading-relaxed">Genera y adapta planes automáticamente con inteligencia artificial.</p>
              </div>
              <div className="flex items-end justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  {['GPT', 'AUTO', 'SMART'].map((t, i) => (
                    <span key={t} className={`px-2 py-1 rounded text-[9px] font-bold ${i === 0 ? 'bg-[#007AFF]/15 text-[#007AFF]' : i === 1 ? 'bg-white/5 text-slate-400' : 'bg-emerald-500/10 text-emerald-400'}`} style={{ fontFamily: BC }}>{t}</span>
                  ))}
                </div>
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 rounded-full border border-[#007AFF]/20 animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-2 rounded-full border border-[#007AFF]/30 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.7s' }} />
                  <div className="absolute inset-0 flex items-center justify-center"><Brain className="w-5 h-5 text-[#007AFF]" /></div>
                </div>
              </div>
            </div>

            {/* Análisis — 4 cols */}
            <div className="col-span-12 md:col-span-4 bg-[#151d2e] border border-slate-700/20 rounded-xl p-6 flex flex-col justify-between min-h-[200px]" data-testid="feature-analysis">
              <div>
                <h3 className="text-lg font-bold tracking-tight uppercase text-white mb-1" style={{ fontFamily: BC }}>Análisis en Vivo</h3>
                <p className="text-slate-400 text-[12px] leading-relaxed">6 controles científicos con monitoreo continuo.</p>
              </div>
              <div className="flex items-end justify-between mt-3">
                <div className="flex gap-4">
                  {[{ v: '6', l: 'Controles' }, { v: '24/7', l: 'Monitor' }].map((m, i) => (
                    <div key={i}>
                      <div className="text-lg font-black text-white" style={{ fontFamily: BC }}>{m.v}</div>
                      <div className="text-[8px] font-bold tracking-wider uppercase text-slate-500" style={{ fontFamily: BC }}>{m.l}</div>
                    </div>
                  ))}
                </div>
                <DataRings />
              </div>
            </div>

            {/* Multi-deporte — 3 cols */}
            <div className="col-span-6 md:col-span-3 bg-[#007AFF]/10 border border-[#007AFF]/15 rounded-xl p-5 flex flex-col justify-between min-h-[120px]" data-testid="feature-multisport">
              <Target className="w-5 h-5 text-[#007AFF]" />
              <div className="mt-auto">
                <h3 className="text-sm font-bold tracking-tight uppercase text-white" style={{ fontFamily: BC }}>Multi-Deporte</h3>
                <p className="text-[#007AFF]/60 text-[11px] mt-0.5">+20 disciplinas</p>
              </div>
            </div>

            {/* Row: Calculadoras + Export */}
            <div className="col-span-6 md:col-span-5 bg-[#007AFF] rounded-xl p-5 flex items-center justify-between" data-testid="feature-calculators">
              <div>
                <h3 className="text-sm font-bold tracking-tight uppercase text-white" style={{ fontFamily: BC }}>Calculadoras</h3>
                <p className="text-white/50 text-[11px] mt-0.5">1RM · VO2máx · Zonas FC</p>
              </div>
              <Activity className="w-5 h-5 text-white/25" />
            </div>

            <div className="col-span-12 md:col-span-4 bg-[#151d2e] border border-slate-700/20 rounded-xl p-5 flex items-center justify-between" data-testid="feature-export">
              <div>
                <h3 className="text-sm font-bold tracking-tight uppercase text-white" style={{ fontFamily: BC }}>Exportación PDF</h3>
                <p className="text-slate-500 text-[11px] mt-0.5">Planes listos para imprimir</p>
              </div>
              <FileText className="w-5 h-5 text-[#CCFF00]/30" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRODUCT SHOWCASE ─── */}
      <section className="py-14 md:py-18 px-5 bg-[#0a0f1a] relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#007AFF]/[0.03] rounded-full blur-[100px]" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left */}
            <div className="lg:col-span-5">
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#CCFF00] block mb-3" style={{ fontFamily: BC }}>Panel de Control</span>
              <h2 className="text-2xl md:text-[2rem] font-bold tracking-tight uppercase text-white mb-4 leading-[1.05]" style={{ fontFamily: BC }}>
                Cada variable que importa
              </h2>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-7">
                Readiness Score, ratio de carga, adherencia y gráficos de rendimiento. Decisiones basadas en datos.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Heart, label: 'Médico', color: 'bg-red-500' },
                  { icon: Ruler, label: 'Antropometría', color: 'bg-blue-500' },
                  { icon: Dumbbell, label: 'Físico', color: 'bg-emerald-500' },
                  { icon: Eye, label: 'Técnico', color: 'bg-purple-500' },
                  { icon: Target, label: 'Táctico', color: 'bg-amber-500' },
                  { icon: Brain, label: 'Psicológico', color: 'bg-pink-500' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.04] rounded-lg px-3 py-2">
                    <div className={`w-6 h-6 ${color} rounded flex items-center justify-center`}><Icon className="w-3 h-3 text-white" /></div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-white/70" style={{ fontFamily: BC }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Right */}
            <div className="lg:col-span-7 relative">
              {/* Floating readiness gauge */}
              <div className="absolute -top-4 -left-4 z-20 bg-[#0c1222] border border-slate-700/30 rounded-xl p-3 shadow-xl shadow-black/30">
                <ReadinessGauge size={80} value={85} />
              </div>
              <DashboardMockup compact />
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-14 md:py-18 px-5 bg-[#0e1424]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#007AFF] block mb-2" style={{ fontFamily: BC }}>Proceso</span>
            <h2 className="text-2xl md:text-[2rem] font-bold tracking-tight uppercase text-white" style={{ fontFamily: BC }}>
              3 pasos. <span className="text-[#CCFF00]">Ciencia pura.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              { n: '01', icon: Layers, title: 'Crea tu Plan', desc: 'Selecciona modelo de periodización. La IA genera la estructura automáticamente.', accent: '#007AFF' },
              { n: '02', icon: Activity, title: 'Carga Datos', desc: 'Atletas, evaluaciones, competencias, objetivos. Todo vinculado al plan.', accent: '#CCFF00' },
              { n: '03', icon: LineChart, title: 'Analiza y Decide', desc: 'Readiness score, ratio de carga, gráficos. Decide con datos.', accent: '#007AFF' },
            ].map((step, i) => (
              <div key={i} className={`relative p-7 ${i < 2 ? 'md:border-r border-slate-700/20' : ''}`}>
                {/* Step connector on desktop */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-7 -right-3 z-10">
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${step.accent}15` }}>
                    <step.icon className="w-4 h-4" style={{ color: step.accent }} />
                  </div>
                  <span className="text-3xl font-black text-slate-700/30" style={{ fontFamily: BC }}>{step.n}</span>
                </div>
                <h3 className="text-sm font-bold tracking-tight uppercase text-white mb-1.5" style={{ fontFamily: BC }}>{step.title}</h3>
                <p className="text-[12px] text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="py-6 px-5 bg-[#0a0f1a] border-y border-white/[0.03]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {[
            { icon: Shield, text: 'Ciencia deportiva' },
            { icon: Zap, text: '17 modelos' },
            { icon: Users, text: 'Entrenadores y atletas' },
            { icon: Brain, text: 'IA integrada' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-[#CCFF00]/60" />
              <span className="text-[11px] font-medium text-slate-500">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-14 md:py-18 px-5 bg-[#0a0f1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#007AFF] block mb-2" style={{ fontFamily: BC }}>Precios</span>
            <h2 className="text-2xl md:text-[2rem] font-bold tracking-tight uppercase text-white" style={{ fontFamily: BC }}>
              Planes para cada nivel
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRICING.map((plan, i) => (
              <div key={i} className={`relative rounded-xl p-5 ${plan.pop ? 'bg-[#CCFF00] ring-1 ring-[#CCFF00]' : 'bg-[#151d2e] border border-slate-700/20'}`} data-testid={`pricing-card-${plan.name.toLowerCase()}`}>
                {plan.pop && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-[#CCFF00] text-[8px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{ fontFamily: BC }}>Popular</div>
                )}
                <h3 className={`text-sm font-bold uppercase tracking-tight ${plan.pop ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: BC }}>{plan.name}</h3>
                <p className={`text-[11px] mt-0.5 ${plan.pop ? 'text-slate-700' : 'text-slate-500'}`}>{plan.desc}</p>
                <div className="flex items-baseline mt-3 mb-4">
                  <span className={`text-3xl font-black ${plan.pop ? 'text-slate-900' : 'text-white'}`} style={{ fontFamily: BC }}>${plan.price}</span>
                  <span className={`text-xs ml-1 ${plan.pop ? 'text-slate-600' : 'text-slate-500'}`}>/mes</span>
                </div>
                <ul className="space-y-1.5 mb-5">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`flex items-center gap-2 text-[11px] ${plan.pop ? 'text-slate-800' : 'text-slate-400'}`}>
                      <Check className={`w-3 h-3 flex-shrink-0 ${plan.pop ? 'text-slate-900' : 'text-[#CCFF00]/60'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth">
                  <Button
                    className={`w-full rounded-lg h-9 text-[10px] font-bold uppercase tracking-wider ${plan.pop ? 'bg-slate-900 text-[#CCFF00] hover:bg-slate-800' : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'}`}
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

      {/* ─── FINAL CTA ─── */}
      <section className="py-14 md:py-18 px-5 bg-[#0e1424] relative overflow-hidden">
        <div className="absolute inset-0"><PeriodizationWave height="h-full" count={60} /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1424] via-[#0e1424]/95 to-[#0e1424]/80" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-2xl md:text-[2rem] font-bold tracking-tight uppercase text-white mb-3" style={{ fontFamily: BC }}>
            ¿Listo para entrenar<br /><span className="text-[#CCFF00]">con ciencia?</span>
          </h2>
          <p className="text-[13px] text-slate-400 mb-7">
            Únete a entrenadores que ya planifican con datos e inteligencia artificial.
          </p>
          <Link to="/auth">
            <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-10 px-8 text-[11px] font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-[#CCFF00]/10" data-testid="cta-final-btn">
              Crear Cuenta Gratis <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-5 px-5 bg-[#050810] border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#CCFF00] rounded flex items-center justify-center">
              <span className="text-slate-900 font-black text-[7px]">T</span>
            </div>
            <span className="text-xs font-bold text-white/50" style={{ fontFamily: BC }}>TR<span className="text-[#CCFF00]">AI</span>N</span>
          </div>
          <p className="text-[11px] text-slate-600">© 2025 TrAIn</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

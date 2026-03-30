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
const INT = "'Inter', sans-serif";

const PRICING = [
  { name: 'Free', price: '0', desc: 'Para explorar', features: ['2 atletas', '1 plan', '3 generaciones IA', 'Exportación básica'], cta: 'Comenzar Gratis', pop: false },
  { name: 'Basic', price: '9.99', desc: 'Entrenadores individuales', features: ['10 atletas', '5 planes', '20 generaciones IA', 'Exportación PDF', 'Soporte por email'], cta: 'Elegir Basic', pop: false },
  { name: 'Pro', price: '29.99', desc: 'Entrenadores profesionales', features: ['50 atletas', 'Planes ilimitados', '100 generaciones IA', 'PDF y Excel', 'Soporte prioritario'], cta: 'Elegir Pro', pop: true },
  { name: 'Enterprise', price: '99.99', desc: 'Clubes y federaciones', features: ['Atletas ilimitados', 'Todo ilimitado', 'API personalizada', 'Soporte 24/7', 'Personalización total'], cta: 'Contactar', pop: false },
];

/* ═══ VISUAL COMPONENTS ═══ */

const TrackLanes = ({ side = 'right', opacity = 0.05 }) => (
  <div className={`absolute ${side === 'right' ? 'right-0' : 'left-0'} top-0 bottom-0 w-1/3 overflow-hidden pointer-events-none`} style={{ opacity }}>
    <svg viewBox="0 0 400 800" className="w-full h-full" preserveAspectRatio="none">
      {[0,1,2,3,4,5,6,7].map(i => (
        <path key={i} d={side === 'right' ? `M ${200+i*25} 0 Q ${400+i*25} 400 ${200+i*25} 800` : `M ${200-i*25} 0 Q ${-i*25} 400 ${200-i*25} 800`} fill="none" stroke="#0f172a" strokeWidth="1" />
      ))}
    </svg>
  </div>
);

const PeriodizationWave = ({ height = 'h-20', count = 20, dark = false }) => {
  const bars = Array.from({ length: count }, (_, i) => {
    const p = (i / count) * Math.PI * 2;
    return Math.max(15, Math.min(95, 30 + Math.sin(p) * 25 + Math.cos(p * 1.5) * 20));
  });
  return (
    <div className={`flex items-end gap-[2px] ${height} w-full`}>
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-t-sm" style={{
          height: `${h}%`,
          background: i % 4 === 0 ? '#007AFF' : i % 4 === 1 ? (dark ? '#CCFF00' : '#0f172a') : i % 4 === 2 ? (dark ? '#1e293b' : '#e2e8f0') : '#94a3b8',
          opacity: 0.8,
        }} />
      ))}
    </div>
  );
};

const ReadinessGauge = ({ size = 96 }) => {
  const r = (size - 10) / 2, c = Math.PI * 2 * r, off = c - (c * 85) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#007AFF" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-slate-900" style={{ fontFamily: BC }}>85%</span>
        <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400">Readiness</span>
      </div>
    </div>
  );
};

const TeamFormation = () => {
  const pos = [[50,12],[25,30],[50,30],[75,30],[15,52],[40,52],[60,52],[85,52],[30,72],[50,72],[70,72]];
  return (
    <div className="relative w-full h-full min-h-[110px]">
      {pos.map(([x,y],i) => (
        <div key={i} className="absolute w-2.5 h-2.5 rounded-full" style={{
          left:`${x}%`, top:`${y}%`, transform:'translate(-50%,-50%)',
          background: i<3 ? '#007AFF' : i<7 ? '#0f172a' : '#cbd5e1',
          boxShadow: i<3 ? '0 0 6px #007AFF50' : 'none',
        }} />
      ))}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[[25,30,50,12],[75,30,50,12],[25,30,40,52],[75,30,60,52],[50,30,50,72]].map(([x1,y1,x2,y2],i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e2e8f0" strokeWidth="0.5" />
        ))}
      </svg>
    </div>
  );
};

const DataRings = () => (
  <div className="relative w-20 h-20">
    {[{r:36,c:'#007AFF',d:'60,100',w:2.5},{r:28,c:'#0f172a',d:'45,80',w:2},{r:20,c:'#94a3b8',d:'30,60',w:1.5}].map((ring,i) => (
      <svg key={i} className="absolute inset-0 w-full h-full" style={{animation:`dspin ${8+i*4}s linear infinite`,animationDirection:i%2?'reverse':'normal'}}>
        <circle cx="40" cy="40" r={ring.r} fill="none" stroke={ring.c} strokeWidth={ring.w} strokeDasharray={ring.d} strokeLinecap="round" opacity="0.45" />
      </svg>
    ))}
    <style>{`@keyframes dspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
  </div>
);

const DashboardMockup = () => (
  <div className="bg-[#0c1222] rounded-2xl border border-slate-700/30 overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
    <div className="flex items-center gap-2 px-3.5 py-2 bg-[#151d2e] border-b border-slate-700/30">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex items-center gap-1.5 ml-3">
        <div className="w-4 h-4 bg-[#CCFF00] rounded flex items-center justify-center"><span className="text-[6px] font-black text-slate-900">T</span></div>
        <span className="text-[9px] font-bold text-white/80" style={{fontFamily:BC}}>TRAIN</span>
        {['Panel','Datos','PDF'].map((t,i) => (
          <div key={t} className={`px-1.5 py-0.5 rounded text-[7px] font-medium ${i===0?'bg-blue-500/20 text-blue-300':'text-slate-500'}`}>{t}</div>
        ))}
      </div>
    </div>
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-semibold text-white/90">Panel de Control</div>
          <div className="text-[7px] text-slate-500">lunes, 30 de marzo</div>
        </div>
        <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[7px] text-emerald-400">Todo en orden</div>
      </div>
      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-2 bg-[#151d2e] rounded-lg p-2.5 border border-slate-700/15">
          <div className="text-[7px] text-slate-500 mb-0.5">Readiness Score</div>
          <div className="text-xl font-black text-emerald-400 leading-none" style={{fontFamily:BC}}>85%</div>
          <div className="mt-1.5 space-y-[3px]">
            {[{w:90,c:'bg-blue-400'},{w:40,c:'bg-red-400'},{w:35,c:'bg-amber-400'},{w:95,c:'bg-emerald-400'}].map((m,i) => (
              <div key={i} className="h-[3px] bg-slate-700/50 rounded-full overflow-hidden"><div className={`h-full ${m.c} rounded-full`} style={{width:`${m.w}%`}} /></div>
            ))}
          </div>
        </div>
        <div className="col-span-2 bg-[#151d2e] rounded-lg p-2.5 border border-slate-700/15">
          <div className="text-[7px] text-slate-500 mb-0.5">Ratio Aguda:Crónica</div>
          <div className="text-2xl font-black text-white leading-none" style={{fontFamily:BC}}>1.18</div>
          <div className="text-[7px] text-emerald-400 mt-1">Zona estable</div>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-1.5">
          {[{v:'5',l:'Planes',c:'blue'},{v:'12',l:'Atletas',c:'purple'},{v:'92%',l:'Adherencia',c:'emerald'},{v:'150+',l:'Ejercicios',c:'amber'}].map((s,i) => (
            <div key={i} className={`bg-${s.c}-500/10 border border-${s.c}-500/15 rounded-lg p-1.5 text-center`}>
              <div className={`text-sm font-black text-${s.c}-300 leading-none`} style={{fontFamily:BC}}>{s.v}</div>
              <div className={`text-[5px] text-${s.c}-300/60 mt-0.5`}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#151d2e] rounded-lg p-2.5 border border-slate-700/15">
        <div className="flex items-center gap-1.5 mb-1.5">
          <BarChart3 className="w-2.5 h-2.5 text-blue-400" />
          <span className="text-[7px] font-semibold text-white/80">Volumen e Intensidad</span>
          <span className="text-[6px] px-1.5 py-[1px] bg-emerald-500/15 text-emerald-400 rounded-full ml-1">En vivo</span>
        </div>
        <div className="flex items-end gap-[2px] h-10">
          {[[45,35],[50,40],[55,45],[48,52],[60,50],[70,55],[65,68],[72,60],[55,48],[50,45],[62,55],[68,58]].map((b,i) => (
            <div key={i} className="flex-1 flex items-end gap-[1px]">
              <div className="flex-1 bg-blue-400 rounded-t-[1px]" style={{height:`${b[0]}%`}} />
              <div className="flex-1 bg-[#CCFF00] rounded-t-[1px]" style={{height:`${b[1]}%`}} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════ PAGE ═══════════════════════════════ */
const LandingPage = () => (
  <div className="min-h-screen bg-[#fafaf8] landing-reset" style={{fontFamily:INT}}>
    {/* Reset global heading styles for landing page */}
    <style>{`.landing-reset h1,.landing-reset h2,.landing-reset h3,.landing-reset h4{font-family:inherit;font-weight:inherit;text-transform:none;letter-spacing:normal;}`}</style>

    {/* NAV */}
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/60" data-testid="main-nav">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="flex items-center justify-between h-[56px]">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-[#CCFF00] font-black text-[11px]">T</span>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-slate-900" style={{fontFamily:BC}}>
              TR<span className="text-[#007AFF]">AI</span>N
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[['#features','Funciones'],['#how-it-works','Cómo funciona'],['#pricing','Precios']].map(([h,l]) => (
              <a key={h} href={h} className="text-[13px] text-slate-500 hover:text-slate-800 transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost" className="text-[13px] text-slate-600 h-9" data-testid="login-nav-btn">Iniciar Sesión</Button></Link>
            <Link to="/auth"><Button className="bg-slate-900 text-white hover:bg-slate-800 text-[12px] font-semibold px-5 h-9 rounded-lg" data-testid="signup-nav-btn">Comenzar</Button></Link>
          </div>
        </div>
      </div>
    </nav>

    {/* HERO */}
    <section className="relative pt-[56px] overflow-hidden">
      <TrackLanes side="right" opacity={0.035} />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/30 via-transparent to-amber-50/10 pointer-events-none" />

      <div className="max-w-[1120px] mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-16 lg:py-20">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3 h-3 text-[#CCFF00]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white" style={{fontFamily:BC}}>Potenciado por IA</span>
            </div>

            <h1 className="text-[3rem] lg:text-[3.5rem] font-black tracking-[-0.02em] text-slate-900 mb-5 leading-[1.05]" style={{fontFamily:INT}}>
              Planifica, controla y domina tu{' '}
              <span className="text-[#007AFF]">entrenamiento</span>
            </h1>

            <p className="text-[15px] text-slate-500 mb-8 leading-[1.7] max-w-[380px]">
              El sistema de periodización científica que usan los entrenadores de alto rendimiento. 17 modelos, 6 controles, IA integrada.
            </p>

            <div className="flex gap-3 mb-6">
              <Link to="/auth">
                <Button className="bg-slate-900 text-white hover:bg-slate-800 h-11 px-7 text-[13px] font-semibold rounded-lg shadow-md shadow-slate-900/10" data-testid="hero-cta-btn">
                  Empezar gratis <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="h-11 px-6 text-[13px] font-medium border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg">
                  Ver funciones
                </Button>
              </a>
            </div>

            <div className="flex gap-5 text-[12px] text-slate-400">
              {['14 días gratis','Sin tarjeta','Cancela cuando quieras'].map(t => (
                <span key={t} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" />{t}</span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 relative">
            <div style={{transform:'perspective(1200px) rotateY(-3deg) rotateX(1deg)'}}>
              <DashboardMockup />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#007AFF]/[0.04] rounded-full blur-[100px] -z-10" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-slate-200/50 bg-white/50 backdrop-blur-sm">
        <div className="max-w-[1120px] mx-auto px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[{v:'17',l:'Modelos de periodización'},{v:'6',l:'Controles científicos'},{v:'150+',l:'Ejercicios en biblioteca'},{v:'5',l:'Calculadoras avanzadas'}].map((s,i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[24px] font-black text-slate-900 leading-none" style={{fontFamily:BC}}>{s.v}</span>
                <span className="text-[13px] text-slate-400 leading-snug">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* FEATURES */}
    <section id="features" className="py-20 px-6 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      <TrackLanes side="left" opacity={0.025} />

      <div className="max-w-[1120px] mx-auto relative z-10">
        <div className="max-w-lg mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-3" style={{fontFamily:BC}}>Funcionalidades</p>
          <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 leading-[1.15] mb-3" style={{fontFamily:INT}}>
            Todo lo que necesitas para entrenar con ciencia
          </h2>
          <p className="text-[15px] text-slate-400 leading-[1.6]">
            Herramientas diseñadas con precisión para entrenadores de alto rendimiento.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Periodización — dark */}
          <div className="col-span-12 md:col-span-7 bg-slate-900 rounded-2xl p-7 flex flex-col justify-between min-h-[260px]" data-testid="feature-periodization">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#CCFF00] rounded-lg flex items-center justify-center"><Calendar className="w-4 h-4 text-slate-900" /></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#CCFF00]" style={{fontFamily:BC}}>17 modelos</span>
              </div>
              <h3 className="text-[20px] font-semibold text-white mb-2">Periodización científica</h3>
              <p className="text-[14px] text-slate-400 leading-[1.6] max-w-sm">
                Matveiev, ATR, Bloques, DUP, Conjugado y más. Macrociclos, mesociclos y microciclos generados automáticamente.
              </p>
            </div>
            <div className="mt-5"><PeriodizationWave height="h-16" count={24} dark /></div>
          </div>

          {/* Atletas */}
          <div className="col-span-12 md:col-span-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-7 flex flex-col justify-between min-h-[260px]" data-testid="feature-athletes">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#007AFF] rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-white" /></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#007AFF]" style={{fontFamily:BC}}>Central</span>
              </div>
              <h3 className="text-[20px] font-semibold text-slate-900 mb-2">Gestión de atletas</h3>
              <p className="text-[14px] text-slate-500 leading-[1.6]">Perfiles completos, historial médico y seguimiento individualizado de cada deportista.</p>
            </div>
            <div className="mt-3"><TeamFormation /></div>
          </div>

          {/* IA */}
          <div className="col-span-12 md:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-7 flex flex-col justify-between min-h-[220px] hover:border-[#007AFF]/25 transition-colors" data-testid="feature-ai">
            <div>
              <h3 className="text-[20px] font-semibold text-slate-900 mb-2">IA Generativa</h3>
              <p className="text-[14px] text-slate-500 leading-[1.6] max-w-sm">Genera y adapta planes de entrenamiento automáticamente con inteligencia artificial avanzada.</p>
            </div>
            <div className="flex items-end justify-between mt-4">
              <div className="flex items-center gap-2">
                {['GPT','AUTO','SMART'].map((t,i) => (
                  <span key={t} className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${i===0?'bg-[#007AFF]/10 text-[#007AFF]':i===1?'bg-slate-100 text-slate-500':'bg-emerald-50 text-emerald-600'}`} style={{fontFamily:BC}}>{t}</span>
                ))}
              </div>
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border border-[#007AFF]/20 animate-ping" style={{animationDuration:'3s'}} />
                <div className="absolute inset-0 flex items-center justify-center"><Brain className="w-5 h-5 text-[#007AFF]" /></div>
              </div>
            </div>
          </div>

          {/* Análisis */}
          <div className="col-span-12 md:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-7 flex flex-col justify-between min-h-[220px]" data-testid="feature-analysis">
            <div>
              <h3 className="text-[20px] font-semibold text-slate-900 mb-2">Análisis en tiempo real</h3>
              <p className="text-[14px] text-slate-500 leading-[1.6]">Controles médicos, antropométricos, físicos, técnicos, tácticos y psicológicos en un panel.</p>
            </div>
            <div className="flex items-end justify-between mt-4">
              <div className="flex gap-6">
                {[{v:'6',l:'Controles'},{v:'24/7',l:'Monitoreo'},{v:'PDF',l:'Reportes'}].map((m,i) => (
                  <div key={i}>
                    <div className="text-[22px] font-black text-slate-900 leading-none" style={{fontFamily:BC}}>{m.v}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{m.l}</div>
                  </div>
                ))}
              </div>
              <DataRings />
            </div>
          </div>

          {/* Multi-deporte */}
          <div className="col-span-6 md:col-span-3 bg-[#007AFF]/[0.05] border border-[#007AFF]/10 rounded-2xl p-6 flex flex-col justify-between min-h-[120px]" data-testid="feature-multisport">
            <Target className="w-5 h-5 text-[#007AFF]" />
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900">Multi-deporte</h3>
              <p className="text-[12px] text-slate-400 mt-0.5">+20 disciplinas</p>
            </div>
          </div>

          {/* Calculadoras */}
          <div className="col-span-6 md:col-span-5 bg-[#007AFF] rounded-2xl p-6 flex items-center justify-between" data-testid="feature-calculators">
            <div>
              <h3 className="text-[16px] font-semibold text-white">Calculadoras científicas</h3>
              <p className="text-white/60 text-[13px] mt-0.5">1RM · VO2máx · Zonas FC · Karvonen</p>
            </div>
            <Activity className="w-6 h-6 text-white/20" />
          </div>

          {/* Export */}
          <div className="col-span-12 md:col-span-4 bg-slate-900 rounded-2xl p-6 flex items-center justify-between" data-testid="feature-export">
            <div>
              <h3 className="text-[16px] font-semibold text-white">Exportación PDF</h3>
              <p className="text-slate-400 text-[13px] mt-0.5">Planes listos para imprimir y compartir</p>
            </div>
            <FileText className="w-6 h-6 text-[#CCFF00]/30" />
          </div>
        </div>
      </div>
    </section>

    {/* PRODUCT SHOWCASE */}
    <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      <div className="max-w-[1120px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-3" style={{fontFamily:BC}}>Panel de control</p>
            <h2 className="text-[28px] md:text-[32px] font-bold text-white leading-[1.15] mb-4" style={{fontFamily:INT}}>
              Cada variable que importa, en una vista
            </h2>
            <p className="text-[15px] text-slate-400 leading-[1.7] mb-8">
              Readiness Score, ratio de carga aguda/crónica, adherencia y gráficos de rendimiento. Toma decisiones basadas en datos reales.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {icon:Heart,label:'Control médico',color:'bg-red-500'},
                {icon:Ruler,label:'Antropometría',color:'bg-blue-500'},
                {icon:Dumbbell,label:'Control físico',color:'bg-emerald-500'},
                {icon:Eye,label:'Control técnico',color:'bg-purple-500'},
                {icon:Target,label:'Control táctico',color:'bg-amber-500'},
                {icon:Brain,label:'Control psicológico',color:'bg-pink-500'},
              ].map(({icon:I,label,color}) => (
                <div key={label} className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.05] rounded-xl px-3.5 py-2.5">
                  <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center`}><I className="w-3.5 h-3.5 text-white" /></div>
                  <span className="text-[12px] font-medium text-white/70">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-7 relative">
            <div className="absolute -top-3 -left-3 z-20 bg-white rounded-xl p-3 shadow-lg border border-slate-100">
              <ReadinessGauge size={80} />
            </div>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>

    {/* HOW IT WORKS */}
    <section id="how-it-works" className="py-20 px-6 bg-[#fafaf8] relative overflow-hidden">
      <TrackLanes side="right" opacity={0.025} />
      <div className="max-w-[1120px] mx-auto relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-3" style={{fontFamily:BC}}>Cómo funciona</p>
          <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 leading-[1.15]" style={{fontFamily:INT}}>
            De la idea al plan perfecto en 3 pasos
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {[
            {n:'01',icon:Layers,title:'Crea tu plan',desc:'Selecciona el modelo de periodización. La IA genera macrociclos, mesociclos y microciclos automáticamente.',accent:'#007AFF'},
            {n:'02',icon:Activity,title:'Carga los datos',desc:'Agrega atletas, evaluaciones, competencias y objetivos. Todo queda vinculado al plan activo.',accent:'#0f172a'},
            {n:'03',icon:LineChart,title:'Analiza y decide',desc:'Visualiza readiness score, ratio de carga y gráficos. Decide basándote en datos reales.',accent:'#007AFF'},
          ].map((step,i) => (
            <div key={i} className={`relative px-8 py-6 ${i<2?'md:border-r border-slate-200':''}`}>
              {i<2 && <div className="hidden md:block absolute top-6 -right-3 z-10"><ChevronRight className="w-5 h-5 text-slate-300" /></div>}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${step.accent}0D`}}>
                  <step.icon className="w-5 h-5" style={{color:step.accent}} />
                </div>
                <span className="text-[40px] font-black text-slate-100 leading-none" style={{fontFamily:BC}}>{step.n}</span>
              </div>
              <h3 className="text-[17px] font-semibold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-[14px] text-slate-500 leading-[1.65]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* TRUST */}
    <section className="py-5 px-6 bg-white border-y border-slate-100">
      <div className="max-w-[1120px] mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
        {[{icon:Shield,t:'Basado en ciencia deportiva'},{icon:Zap,t:'17 modelos de periodización'},{icon:Users,t:'Para entrenadores y atletas'},{icon:Brain,t:'Asistente con IA integrado'}].map(({icon:I,t}) => (
          <div key={t} className="flex items-center gap-2"><I className="w-4 h-4 text-slate-300" /><span className="text-[12px] text-slate-400">{t}</span></div>
        ))}
      </div>
    </section>

    {/* PRICING */}
    <section id="pricing" className="py-20 px-6 bg-[#fafaf8]">
      <div className="max-w-[960px] mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-3" style={{fontFamily:BC}}>Precios</p>
          <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 leading-[1.15]" style={{fontFamily:INT}}>
            Un plan para cada nivel
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING.map((plan,i) => (
            <div key={i} className={`relative rounded-2xl p-6 transition-shadow duration-200 ${plan.pop?'bg-slate-900 ring-1 ring-slate-700 shadow-xl':'bg-white border border-slate-200 hover:shadow-md'}`} data-testid={`pricing-card-${plan.name.toLowerCase()}`}>
              {plan.pop && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#007AFF] text-white text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full" style={{fontFamily:BC}}>Popular</div>}
              <h3 className={`text-[15px] font-semibold ${plan.pop?'text-white':'text-slate-900'}`}>{plan.name}</h3>
              <p className={`text-[12px] mt-0.5 ${plan.pop?'text-slate-400':'text-slate-500'}`}>{plan.desc}</p>
              <div className="flex items-baseline mt-4 mb-5">
                <span className={`text-[32px] font-black leading-none ${plan.pop?'text-[#CCFF00]':'text-slate-900'}`} style={{fontFamily:BC}}>${plan.price}</span>
                <span className={`text-[13px] ml-1 ${plan.pop?'text-slate-500':'text-slate-400'}`}>/mes</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f,j) => (
                  <li key={j} className={`flex items-start gap-2 text-[13px] leading-snug ${plan.pop?'text-slate-300':'text-slate-500'}`}>
                    <Check className={`w-4 h-4 flex-shrink-0 mt-[1px] ${plan.pop?'text-[#CCFF00]':'text-emerald-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className={`w-full rounded-xl h-10 text-[12px] font-semibold ${plan.pop?'bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600]':'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}`} data-testid={`pricing-cta-${plan.name.toLowerCase()}`}>
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06]"><PeriodizationWave height="h-full" count={60} dark /></div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/85" />
      <div className="max-w-lg mx-auto text-center relative z-10">
        <h2 className="text-[28px] md:text-[32px] font-bold text-white leading-[1.15] mb-4" style={{fontFamily:INT}}>
          ¿Listo para entrenar con{' '}
          <span className="text-[#CCFF00]">ciencia</span>?
        </h2>
        <p className="text-[15px] text-slate-400 mb-8 leading-[1.6]">
          Únete a entrenadores que ya planifican con datos e inteligencia artificial.
        </p>
        <Link to="/auth">
          <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-11 px-8 text-[13px] font-semibold rounded-lg" data-testid="cta-final-btn">
            Crear cuenta gratis <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </section>

    {/* FOOTER */}
    <footer className="py-6 px-6 bg-slate-950 border-t border-slate-800/40">
      <div className="max-w-[1120px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-800 rounded flex items-center justify-center"><span className="text-[#CCFF00] font-black text-[7px]">T</span></div>
          <span className="text-[12px] font-bold text-white/40" style={{fontFamily:BC}}>TR<span className="text-[#007AFF]">AI</span>N</span>
        </div>
        <p className="text-[11px] text-slate-600">© 2025 TrAIn. Todos los derechos reservados.</p>
      </div>
    </footer>
  </div>
);

export default LandingPage;

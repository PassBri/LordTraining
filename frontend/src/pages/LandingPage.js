import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { LanguageSelector } from '../components/LanguageSelector';
import {
  Check, Target, Brain, Calendar, BarChart3, Users,
  ArrowRight, Activity, FileText, Dumbbell,
  Heart, Ruler, Eye, Sparkles, Layers, LineChart,
  ChevronRight, Zap, Shield
} from 'lucide-react';

const BC = "'Barlow Condensed', sans-serif";
const INT = "'Inter', sans-serif";

/* ═══ ANIMATED CHART COMPONENTS ═══ */

const AnimatedBarChart = ({ label, color1, color2, delay = 0 }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold" style={{fontFamily:BC}}>{label}</span>
    <div className="flex items-end gap-[2px] h-24 w-full">
      {Array.from({length:16}, (_,i) => {
        const p = (i/16)*Math.PI*2;
        const h1 = 20 + Math.sin(p+delay)*30 + Math.cos(p*1.7)*15;
        const h2 = 15 + Math.cos(p+delay+1)*25 + Math.sin(p*1.3)*20;
        return (
          <div key={i} className="flex-1 flex items-end gap-[1px]">
            <div className="flex-1 rounded-t-sm animate-pulse" style={{height:`${Math.max(8,h1)}%`, background:color1, animationDelay:`${i*150+delay*1000}ms`, animationDuration:'3s'}} />
            <div className="flex-1 rounded-t-sm animate-pulse" style={{height:`${Math.max(8,h2)}%`, background:color2, animationDelay:`${i*100+delay*500}ms`, animationDuration:'4s'}} />
          </div>
        );
      })}
    </div>
  </div>
);

const AnimatedLineWave = ({ color, amplitude = 30, speed = '6s', points = 200 }) => {
  const d = `M 0 50 ${Array.from({length:points}, (_,i) => {
    const x = (i/points)*100;
    const y = 50 - Math.sin((i/points)*Math.PI*4)*amplitude + Math.cos((i/points)*Math.PI*2.5)*(amplitude*0.4);
    return `L ${x} ${y}`;
  }).join(' ')}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" style={{overflow:'visible'}}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={d + ' L 100 100 L 0 100 Z'} fill={`url(#grad-${color})`}>
        <animateTransform attributeName="transform" type="translate" values="0,0;-5,0;0,0" dur={speed} repeatCount="indefinite"/>
      </path>
      <path d={d} fill="none" stroke={color} strokeWidth="0.5">
        <animateTransform attributeName="transform" type="translate" values="0,0;-5,0;0,0" dur={speed} repeatCount="indefinite"/>
      </path>
    </svg>
  );
};

const PeriodizationMiniChart = () => (
  <div className="relative w-full max-w-md mx-auto">
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/30 p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#CCFF00] rounded-md flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-slate-900" />
          </div>
          <span className="text-[11px] font-bold text-white" style={{fontFamily:BC}}>PERIODIZACIÓN ATR</span>
        </div>
        <div className="flex gap-1.5">
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[8px] font-bold">VOL</span>
          <span className="px-2 py-0.5 bg-[#CCFF00]/20 text-[#CCFF00] rounded text-[8px] font-bold">INT</span>
          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded text-[8px] font-bold">DEN</span>
        </div>
      </div>
      <div className="h-28 relative mb-2">
        <div className="absolute inset-0"><AnimatedLineWave color="#3B82F6" amplitude={28} speed="5s" /></div>
        <div className="absolute inset-0"><AnimatedLineWave color="#CCFF00" amplitude={22} speed="7s" /></div>
        <div className="absolute inset-0"><AnimatedLineWave color="#F43F5E" amplitude={18} speed="9s" /></div>
      </div>
      <div className="flex justify-between text-[7px] text-slate-500 font-bold px-1" style={{fontFamily:BC}}>
        {['SEM 1','SEM 4','SEM 8','SEM 12','SEM 16','SEM 20','SEM 24'].map(s => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  </div>
);

const MarqueeStrip = () => (
  <div className="overflow-hidden py-3 bg-slate-900 border-t border-b border-slate-800">
    <div className="flex animate-marquee whitespace-nowrap">
      {[...Array(2)].map((_, rep) => (
        <React.Fragment key={rep}>
          {['VOLUMEN','INTENSIDAD','DENSIDAD','ACWR','VO2MAX','1RM','PERIODIZACIÓN','ATR','BLOQUE','ONDULADO','MESOCICLO','MICROCICLO','MACROCICLO','KARVONEN','COMPETENCIA'].map((txt, i) => (
            <span key={`${rep}-${i}`} className="inline-flex items-center gap-3 mx-4">
              <span className="w-2 h-2 rounded-full bg-[#CCFF00]" />
              <span className="text-[11px] font-bold tracking-[0.15em] text-slate-500" style={{fontFamily:BC}}>{txt}</span>
            </span>
          ))}
        </React.Fragment>
      ))}
    </div>
    <style>{`
      @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      .animate-marquee { animation: marquee 30s linear infinite; display: flex; width: max-content; }
    `}</style>
  </div>
);

const DataRings = () => (
  <div className="relative w-[52px] h-[52px]">
    {[{r:24,c:'#007AFF',off:20},{r:18,c:'#CCFF00',off:35},{r:12,c:'#F43F5E',off:15}].map(({r,c,off},i) => (
      <svg key={i} className="absolute inset-0" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke={c} strokeWidth="2.5" strokeDasharray={`${(2*Math.PI*r*(100-off)/100)} ${2*Math.PI*r}`} strokeLinecap="round" transform="rotate(-90 26 26)" opacity="0.8" />
      </svg>
    ))}
  </div>
);

const ReadinessGauge = ({ size = 96 }) => {
  const r = (size - 10) / 2, c = Math.PI * 2 * r, off = c - (c * 85) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#CCFF00" strokeWidth="4" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white leading-none" style={{fontFamily:BC}}>85</span>
        <span className="text-[7px] text-slate-400 mt-0.5">READINESS</span>
      </div>
    </div>
  );
};

const TeamFormation = () => (
  <div className="flex items-center -space-x-2">
    {[{bg:'bg-blue-500',t:'JP'},{bg:'bg-emerald-500',t:'MA'},{bg:'bg-purple-500',t:'LC'},{bg:'bg-amber-500',t:'DR'},{bg:'bg-rose-500',t:'+5'}].map((p, i) => (
      <div key={i} className={`w-7 h-7 ${p.bg} rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-white`}>{p.t}</div>
    ))}
  </div>
);

/* ═══════════════════════════════ PAGE ═══════════════════════════════ */
const LandingPage = () => {
  const { t } = useTranslation();

  const PRICING = [
    { key: 'free', name: 'Free / Académico', price: '0', desc: 'Para estudiantes y entrenadores explorando', features: ['3 atletas', '1 plan de entrenamiento', '10 exportaciones PDF', '3 generaciones con IA', 'Exportación básica'], cta: 'Empezar gratis', pop: false },
    { key: 'pro', name: 'Pro — Entrenador', price: '9.99', desc: 'Para entrenadores independientes y preparadores', features: ['20 atletas', '5 planes de entrenamiento', '20 generaciones con IA', 'Exportación PDF', 'Soporte email'], cta: 'Empezar ahora', pop: false },
    { key: 'club', name: 'Club / Academia', price: '29.99', desc: 'Para clubes y academias de formación', features: ['Atletas ilimitados', 'Planes ilimitados', '100 generaciones con IA', 'Exportación PDF/Excel', 'Soporte prioritario', 'Biblioteca completa', 'Personalización de plantillas'], cta: 'Empezar ahora', pop: true },
    { key: 'inst', name: 'Institucional', price: '99.99', desc: 'Ligas, federaciones y universidades', features: ['Múltiples entrenadores', 'Panel de coordinador', 'Analítica por grupo', 'Atletas ilimitados', 'Todo ilimitado', 'API personalizada', 'Soporte 24/7', 'Formación incluida', 'Personalización de plantillas'], cta: 'Contactar ventas', pop: false },
  ];

  return (
  <div className="min-h-screen bg-slate-950 landing-reset" style={{fontFamily:INT}}>
    <style>{`
      .landing-reset h1,.landing-reset h2,.landing-reset h3,.landing-reset h4{font-family:inherit;font-weight:inherit;text-transform:none;letter-spacing:normal;}
      @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
    `}</style>

    {/* NAV — Dark, cinematic */}
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/40" data-testid="main-nav">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="flex items-center justify-between h-[56px]">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#CCFF00] rounded-full flex items-center justify-center">
              <Activity className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-black tracking-tight text-white" style={{fontFamily:BC}}>
              iTRAIN
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[['#features', t('landing.nav.features')],['#how-it-works', t('landing.nav.howItWorks')],['#pricing', t('landing.nav.pricing')]].map(([h,l]) => (
              <a key={h} href={h} className="text-[13px] text-slate-400 hover:text-white transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="dark" />
            <Link to="/auth"><Button variant="ghost" className="text-[13px] text-slate-400 hover:text-white h-9" data-testid="login-nav-btn">{t('landing.nav.login')}</Button></Link>
            <Link to="/auth"><Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] text-[12px] font-bold px-5 h-9 rounded-lg" style={{fontFamily:BC}} data-testid="signup-nav-btn">{t('landing.nav.signup')}</Button></Link>
          </div>
        </div>
      </div>
    </nav>

    {/* HERO — Dark cinematic with giant text + animated chart */}
    <section className="relative pt-[56px] overflow-hidden bg-slate-950 min-h-[100vh] flex flex-col justify-center">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.03)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-10" />

      <div className="max-w-[1120px] mx-auto px-6 relative z-10 w-full">
        {/* Pill buttons */}
        <div className="flex gap-2 mb-8">
          {['PERIODIZACIÓN','PLANIFICACIÓN','CIENCIA'].map(txt => (
            <span key={txt} className="px-3.5 py-1.5 border border-slate-700 rounded-full text-[10px] font-bold tracking-[0.15em] text-slate-400 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors cursor-pointer" style={{fontFamily:BC}}>{txt}</span>
          ))}
        </div>

        {/* Giant hero text + chart */}
        <div className="relative mb-6">
          <h1 className="text-[5rem] sm:text-[7rem] lg:text-[9rem] font-black text-white leading-[0.85] tracking-[-0.04em] relative z-10" style={{fontFamily:BC}} data-testid="hero-title">
            iTRAIN
          </h1>
          {/* Green glow circle behind the chart */}
          <div className="absolute top-1/2 right-[15%] -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#CCFF00]/[0.06] blur-[80px] -z-0" style={{animation:'glow 5s ease-in-out infinite'}} />
        </div>

        {/* Subtitle + CTA row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-5">
            <p className="text-[15px] text-slate-400 leading-[1.7] mb-6 max-w-[380px]" data-testid="hero-subtitle">
              {t('landing.hero.subtitle')}
            </p>
            <div className="flex gap-3 mb-5">
              <Link to="/auth">
                <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-12 px-8 text-[13px] font-bold rounded-xl shadow-lg shadow-[#CCFF00]/10" style={{fontFamily:BC}} data-testid="hero-cta-btn">
                  {t('landing.hero.cta_primary')} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="h-12 px-6 text-[13px] font-medium border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl">
                  {t('landing.hero.cta_secondary')}
                </Button>
              </a>
            </div>
            <div className="flex gap-5 text-[11px] text-slate-500">
              {['14 días gratis','Sin tarjeta','Cancela cuando quieras'].map(txt => (
                <span key={txt} className="flex items-center gap-1.5"><Check className="w-3 h-3 text-[#CCFF00]" />{txt}</span>
              ))}
            </div>
          </div>

          {/* Animated chart panel */}
          <div className="lg:col-span-7 relative" style={{animation:'float 6s ease-in-out infinite'}}>
            <PeriodizationMiniChart />
            {/* Mini stat cards floating around */}
            <div className="absolute -top-4 -left-2 bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/30 shadow-xl" style={{animation:'float 4s ease-in-out infinite 0.5s'}}>
              <ReadinessGauge size={72} />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-slate-800/80 backdrop-blur rounded-xl p-2.5 border border-slate-700/30 shadow-xl" style={{animation:'float 5s ease-in-out infinite 1s'}}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-blue-400" /></div>
                <div>
                  <div className="text-sm font-black text-white leading-none" style={{fontFamily:BC}}>0.87</div>
                  <div className="text-[7px] text-slate-400">ACWR</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Marquee */}
      <div className="mt-auto">
        <MarqueeStrip />
      </div>

      {/* Stats strip */}
      <div className="border-t border-slate-800/40 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-[1120px] mx-auto px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[{v:'17',k:'models'},{v:'6',k:'controls'},{v:'150+',k:'exercises'},{v:'5',k:'calculators'}].map((s,i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[24px] font-black text-white leading-none" style={{fontFamily:BC}}>{s.v}</span>
                <span className="text-[13px] text-slate-500 leading-snug">{t(`landing.hero.stats.${s.k}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* FEATURES — Dark cards */}
    <section id="features" className="py-20 px-6 bg-slate-950 relative overflow-hidden">
      <div className="max-w-[1120px] mx-auto relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-2" style={{fontFamily:BC}}>{t('landing.features.tag')}</p>
          <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.15]" style={{fontFamily:INT}}>{t('landing.features.title')}</h2>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Main — Plan Gráfico */}
          <div className="col-span-12 md:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-7 relative overflow-hidden min-h-[280px]" data-testid="feature-periodization">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-[#CCFF00] rounded-lg flex items-center justify-center"><BarChart3 className="w-4 h-4 text-slate-900" /></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#CCFF00]" style={{fontFamily:BC}}>{t('landing.features.tag')}</span>
              </div>
              <h3 className="text-[20px] font-semibold text-white mb-2">{t('landing.features.m1_title')}</h3>
              <p className="text-[14px] text-slate-400 leading-[1.6] max-w-sm">{t('landing.features.m1_desc')}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <AnimatedBarChart label="Volumen" color1="#3B82F6" color2="#1e40af" delay={0} />
              <AnimatedBarChart label="Intensidad" color1="#CCFF00" color2="#84cc16" delay={0.5} />
              <AnimatedBarChart label="Densidad" color1="#F43F5E" color2="#be123c" delay={1} />
            </div>
          </div>

          {/* Atletas */}
          <div className="col-span-12 md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-7 flex flex-col justify-between min-h-[280px]" data-testid="feature-team">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-white" /></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400" style={{fontFamily:BC}}>Central</span>
              </div>
              <h3 className="text-[20px] font-semibold text-white mb-2">{t('landing.features.m2_title')}</h3>
              <p className="text-[14px] text-slate-400 leading-[1.6]">{t('landing.features.m2_desc')}</p>
            </div>
            <div className="mt-3"><TeamFormation /></div>
          </div>

          {/* IA */}
          <div className="col-span-12 md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-7 flex flex-col justify-between min-h-[220px]" data-testid="feature-ai">
            <div>
              <h3 className="text-[20px] font-semibold text-white mb-2">{t('landing.features.m8_title')}</h3>
              <p className="text-[14px] text-slate-400 leading-[1.6] max-w-sm">{t('landing.features.m8_desc')}</p>
            </div>
            <div className="flex items-end justify-between mt-4">
              <div className="flex items-center gap-2">
                {['GPT','AUTO','SMART'].map((txt,i) => (
                  <span key={txt} className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${i===0?'bg-blue-500/15 text-blue-400':i===1?'bg-slate-800 text-slate-400':'bg-emerald-500/15 text-emerald-400'}`} style={{fontFamily:BC}}>{txt}</span>
                ))}
              </div>
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border border-[#CCFF00]/20 animate-ping" style={{animationDuration:'3s'}} />
                <div className="absolute inset-0 flex items-center justify-center"><Brain className="w-5 h-5 text-[#CCFF00]" /></div>
              </div>
            </div>
          </div>

          {/* Analysis */}
          <div className="col-span-12 md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-7 flex flex-col justify-between min-h-[220px]" data-testid="feature-analysis">
            <div>
              <h3 className="text-[20px] font-semibold text-white mb-2">{t('landing.features.m7_title')}</h3>
              <p className="text-[14px] text-slate-400 leading-[1.6]">{t('landing.features.m7_desc')}</p>
            </div>
            <div className="flex items-end justify-between mt-4">
              <div className="flex gap-6">
                {[{v:'6',k:'controls'},{v:'24/7',l:'Monitor'},{v:'PDF',l:'Reports'}].map((m,i) => (
                  <div key={i}>
                    <div className="text-[22px] font-black text-white leading-none" style={{fontFamily:BC}}>{m.v}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{m.k ? t(`landing.hero.stats.${m.k}`) : m.l}</div>
                  </div>
                ))}
              </div>
              <DataRings />
            </div>
          </div>

          {/* Multi-sport */}
          <div className="col-span-6 md:col-span-3 bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between min-h-[120px]" data-testid="feature-multisport">
            <Target className="w-5 h-5 text-[#CCFF00]" />
            <div>
              <h3 className="text-[16px] font-semibold text-white">Multi-sport</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">+20</p>
            </div>
          </div>

          {/* Calculators */}
          <div className="col-span-6 md:col-span-5 bg-[#CCFF00] rounded-2xl p-6 flex items-center justify-between" data-testid="feature-calculators">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900">{t('landing.hero.stats.calculators')}</h3>
              <p className="text-slate-900/50 text-[13px] mt-0.5">1RM · VO2max · HR Zones · Karvonen</p>
            </div>
            <Activity className="w-6 h-6 text-slate-900/20" />
          </div>

          {/* Export */}
          <div className="col-span-12 md:col-span-4 bg-white rounded-2xl p-6 flex items-center justify-between" data-testid="feature-export">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900">PDF Export</h3>
              <p className="text-slate-500 text-[13px] mt-0.5">{t('landing.features.m7_desc').split('.')[0]}</p>
            </div>
            <FileText className="w-6 h-6 text-slate-300" />
          </div>
        </div>
      </div>
    </section>

    {/* PRODUCT SHOWCASE — Dark */}
    <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
      <div className="max-w-[1120px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-3" style={{fontFamily:BC}}>{t('dashboard.controlPanel.title')}</p>
            <h2 className="text-[28px] md:text-[32px] font-bold text-white leading-[1.15] mb-4" style={{fontFamily:INT}}>
              {t('landing.features.m7_title')}
            </h2>
            <p className="text-[15px] text-slate-400 leading-[1.7] mb-8">
              {t('landing.features.m7_desc')}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {icon:Heart,label: t('landing.features.m1_title'),color:'bg-red-500'},
                {icon:Ruler,label: t('landing.features.m2_title'),color:'bg-blue-500'},
                {icon:Dumbbell,label: t('landing.features.m4_title'),color:'bg-emerald-500'},
                {icon:Eye,label: t('landing.features.m5_title'),color:'bg-purple-500'},
                {icon:Target,label: t('landing.features.m6_title'),color:'bg-amber-500'},
                {icon:Brain,label: t('landing.features.m8_title'),color:'bg-pink-500'},
              ].map(({icon:I,label,color}) => (
                <div key={label} className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.05] rounded-xl px-3.5 py-2.5">
                  <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center`}><I className="w-3.5 h-3.5 text-white" /></div>
                  <span className="text-[12px] font-medium text-white/70">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-7 relative" style={{animation:'float 6s ease-in-out infinite'}}>
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/30 p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /></div>
                <span className="text-[9px] text-slate-500 ml-2 font-mono">iTRAIN Dashboard v3.0</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <AnimatedBarChart label="Volumen" color1="#3B82F6" color2="#60a5fa" delay={0} />
                <AnimatedBarChart label="Intensidad" color1="#CCFF00" color2="#a3e635" delay={0.3} />
                <AnimatedBarChart label="Densidad" color1="#F43F5E" color2="#fb7185" delay={0.6} />
              </div>
              <div className="h-16 relative">
                <div className="absolute inset-0"><AnimatedLineWave color="#3B82F6" amplitude={25} speed="6s" /></div>
                <div className="absolute inset-0"><AnimatedLineWave color="#CCFF00" amplitude={20} speed="8s" /></div>
              </div>
            </div>
            <div className="absolute -top-4 -left-4 z-20">
              <div className="bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/30 shadow-xl">
                <ReadinessGauge size={72} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* HOW IT WORKS */}
    <section id="how-it-works" className="py-20 px-6 bg-slate-950 relative overflow-hidden">
      <div className="max-w-[1120px] mx-auto relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-2" style={{fontFamily:BC}}>{t('landing.howItWorks.tag')}</p>
          <h2 className="text-[28px] font-bold text-white leading-tight" style={{fontFamily:INT}}>{t('landing.howItWorks.title')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {n:'01',icon:Calendar,title:t('landing.howItWorks.step1_title'),desc:t('landing.howItWorks.step1_desc')},
            {n:'02',icon:Layers,title:t('landing.howItWorks.step2_title'),desc:t('landing.howItWorks.step2_desc')},
            {n:'03',icon:LineChart,title:t('landing.howItWorks.step3_title'),desc:t('landing.howItWorks.step3_desc')},
          ].map(s => (
            <div key={s.n} className="bg-slate-900 border border-slate-800 rounded-2xl p-7 relative group hover:border-[#CCFF00]/20 transition-colors" data-testid={`step-${s.n}`}>
              <span className="text-[48px] font-black text-slate-800 leading-none absolute top-4 right-5" style={{fontFamily:BC}}>{s.n}</span>
              <div className="w-11 h-11 bg-[#CCFF00]/10 rounded-xl flex items-center justify-center mb-5">
                <s.icon className="w-5 h-5 text-[#CCFF00]" />
              </div>
              <h3 className="text-[17px] font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-[13px] text-slate-400 leading-[1.6]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* PRICING */}
    <section id="pricing" className="py-20 px-6 bg-slate-950 relative overflow-hidden">
      <div className="max-w-[1120px] mx-auto relative z-10">
        <div className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-2" style={{fontFamily:BC}}>{t('landing.pricing.tag')}</p>
          <h2 className="text-[28px] font-bold text-white leading-tight" style={{fontFamily:INT}}>{t('landing.pricing.title')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING.map(plan => (
            <div key={plan.key} className={`relative rounded-2xl p-6 transition-all duration-200 ${plan.pop ? 'bg-[#CCFF00] ring-1 ring-[#CCFF00] shadow-xl shadow-[#CCFF00]/10' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`} data-testid={`pricing-card-${plan.key}`}>
              {plan.pop && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-900 text-[#CCFF00] text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full" style={{fontFamily:BC}}>Más Popular</div>}
              <h3 className={`text-[15px] font-semibold ${plan.pop ? 'text-slate-900' : 'text-white'}`}>{plan.name}</h3>
              <p className={`text-[12px] mt-0.5 ${plan.pop ? 'text-slate-700' : 'text-slate-500'}`}>{plan.desc}</p>
              <div className="flex items-baseline mt-4 mb-5">
                <span className={`text-[32px] font-black leading-none ${plan.pop ? 'text-slate-900' : 'text-white'}`} style={{fontFamily:BC}}>${plan.price}</span>
                <span className={`text-[13px] ml-1 ${plan.pop ? 'text-slate-600' : 'text-slate-500'}`}>/mes</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f,j) => (
                  <li key={j} className={`flex items-start gap-2 text-[13px] leading-snug ${plan.pop ? 'text-slate-700' : 'text-slate-400'}`}>
                    <Check className={`w-4 h-4 flex-shrink-0 mt-[1px] ${plan.pop ? 'text-slate-900' : 'text-[#CCFF00]'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className={`w-full rounded-xl h-10 text-[12px] font-semibold ${plan.pop ? 'bg-slate-900 text-[#CCFF00] hover:bg-slate-800' : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'}`} data-testid={`pricing-cta-${plan.key}`}>
                  {plan.cta} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* FINAL CTA */}
    <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.04)_0%,transparent_60%)]" />
      <div className="max-w-[700px] mx-auto text-center relative z-10">
        <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.15] mb-4" style={{fontFamily:INT}}>
          {t('landing.cta.title')}
        </h2>
        <p className="text-[15px] text-slate-400 mb-8 leading-[1.7]">{t('landing.cta.desc')}</p>
        <Link to="/auth">
          <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-12 px-10 text-[14px] font-bold rounded-xl shadow-lg shadow-[#CCFF00]/10" style={{fontFamily:BC}} data-testid="final-cta-btn">
            {t('landing.cta.button')} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </section>

    {/* FOOTER */}
    <footer className="bg-slate-950 border-t border-slate-800/40 py-10 px-6">
      <div className="max-w-[1120px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#CCFF00] rounded-full flex items-center justify-center"><Activity className="w-3.5 h-3.5 text-slate-900" /></div>
            <span className="text-[14px] font-black text-white" style={{fontFamily:BC}}>iTRAIN</span>
          </div>
          <p className="text-[12px] text-slate-600">2026 iTRAIN. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  </div>
  );
};

export default LandingPage;

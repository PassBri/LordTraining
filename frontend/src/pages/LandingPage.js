import React, { useRef, useEffect, useState, useCallback } from 'react';
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

/* ═══ SCROLL REVEAL HOOK ═══ */
const useInView = (opts = {}) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.unobserve(el); }
    }, { threshold: opts.threshold || 0.15, rootMargin: opts.rootMargin || '0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
};

/* Wrapper component for staggered children */
const Reveal = ({ children, delay = 0, direction = 'up', className = '', ...props }) => {
  const [ref, visible] = useInView();
  const transforms = { up: 'translateY(40px)', down: 'translateY(-40px)', left: 'translateX(-40px)', right: 'translateX(40px)', scale: 'scale(0.92)' };
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translate(0) scale(1)' : transforms[direction],
      transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      willChange: 'opacity, transform',
      ...props.style
    }} {...props}>
      {children}
    </div>
  );
};

/* ═══ ANIMATED CHART COMPONENTS ═══ */

const AnimatedBarChart = ({ label, color1, color2, delay = 0, values }) => {
  const data = values || Array.from({length:12}, (_,i) => {
    const p = (i/12)*Math.PI*2;
    return {
      h1: 25 + Math.sin(p+delay)*35 + Math.cos(p*1.7)*15,
      h2: 20 + Math.cos(p+delay+1)*30 + Math.sin(p*1.3)*18
    };
  });
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full" style={{background:color1}} />
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold" style={{fontFamily:BC}}>{label}</span>
      </div>
      <div className="flex items-end gap-[3px] h-36 w-full px-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex items-end gap-[1px]">
            <div className="flex-1 rounded-t-sm transition-all duration-1000" style={{height:`${Math.max(12,d.h1)}%`, background:color1, opacity:0.9}} />
            <div className="flex-1 rounded-t-sm transition-all duration-1000" style={{height:`${Math.max(12,d.h2)}%`, background:color2, opacity:0.7}} />
          </div>
        ))}
      </div>
      <div className="flex justify-between w-full px-1">
        {['S1','S4','S8','S12'].map(s => (
          <span key={s} className="text-[7px] text-slate-600" style={{fontFamily:BC}}>{s}</span>
        ))}
      </div>
    </div>
  );
};

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

const PeriodizationMiniChart = ({ t }) => {
  const [hoverIdx, setHoverIdx] = useState(null);
  const volData = [75,82,88,65,78,85,92,70,80,88,95,68,72,85,90,62,70,82,88,55,65,78,85,50];
  const intData = [40,45,50,55,52,58,65,70,62,68,75,78,72,78,82,85,80,85,88,90,85,90,92,95];
  const denData = [60,55,52,48,58,55,50,65,60,55,48,70,65,60,52,72,68,60,55,75,70,65,58,80];
  const phases = [
    {n:t('landing.chart.accumulation'),c:'#3B82F6'},
    {n:t('landing.chart.transformation'),c:'#CCFF00'},
    {n:t('landing.chart.realization'),c:'#F43F5E'}
  ];
  const wkLabels = Array.from({length:24},(_,i) => i%4===0 ? `S${i+1}` : '');

  return (
    <div className="relative w-full">
      <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/40 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#CCFF00] rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-white block leading-none" style={{fontFamily:BC}}>{t('landing.chart.title')}</span>
              <span className="text-[9px] text-slate-500">{t('landing.chart.subtitle')} — 24 {t('landing.chart.weeks')}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-md text-[9px] font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>{t('landing.chart.vol')}</span>
            <span className="px-2.5 py-1 bg-[#CCFF00]/20 text-[#CCFF00] rounded-md text-[9px] font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"/>{t('landing.chart.int')}</span>
            <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 rounded-md text-[9px] font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"/>{t('landing.chart.den')}</span>
          </div>
        </div>
        {/* Phase labels */}
        <div className="flex gap-[2px] mb-2">
          {phases.map(p => (
            <div key={p.n} className="flex-1 text-center py-1 rounded-md" style={{background:p.c+'15'}}>
              <span className="text-[8px] font-bold tracking-wider" style={{color:p.c, fontFamily:BC}}>{p.n}</span>
            </div>
          ))}
        </div>
        {/* Interactive bar chart */}
        <div className="relative">
          <div className="flex items-end gap-[2px] h-40 mb-2 px-0.5" onMouseLeave={() => setHoverIdx(null)}>
            {volData.map((_, i) => {
              const isHover = hoverIdx === i;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-[1px] h-full justify-end relative cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(i)}>
                  <div className="w-full flex items-end gap-[1px] h-full">
                    <div className="flex-1 rounded-t-sm transition-all duration-150" style={{height:`${volData[i]}%`, background:'#3B82F6', opacity: isHover ? 1 : 0.7, transform: isHover ? 'scaleX(1.3)' : 'scaleX(1)'}} />
                    <div className="flex-1 rounded-t-sm transition-all duration-150" style={{height:`${intData[i]}%`, background:'#CCFF00', opacity: isHover ? 1 : 0.65, transform: isHover ? 'scaleX(1.3)' : 'scaleX(1)'}} />
                    <div className="flex-1 rounded-t-sm transition-all duration-150" style={{height:`${denData[i]}%`, background:'#F43F5E', opacity: isHover ? 1 : 0.6, transform: isHover ? 'scaleX(1.3)' : 'scaleX(1)'}} />
                  </div>
                  {/* Crosshair line */}
                  {isHover && <div className="absolute top-0 left-1/2 w-px h-full bg-white/30 -translate-x-1/2 pointer-events-none" />}
                </div>
              );
            })}
          </div>
          {/* Floating tooltip */}
          {hoverIdx !== null && (
            <div className="absolute z-20 pointer-events-none" style={{
              top: '-8px',
              left: `${(hoverIdx / 24) * 100}%`,
              transform: hoverIdx > 16 ? 'translateX(-100%)' : hoverIdx > 8 ? 'translateX(-50%)' : 'translateX(0)'
            }}>
              <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-600/60 rounded-lg px-3 py-2 shadow-xl min-w-[120px]">
                <div className="text-[9px] text-slate-400 font-bold mb-1.5" style={{fontFamily:BC}}>{t('landing.chart.week')} {hoverIdx+1}</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1 text-[9px] text-blue-400"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>{t('landing.chart.volume')}</span>
                    <span className="text-[10px] font-black text-white" style={{fontFamily:BC}}>{volData[hoverIdx]}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1 text-[9px] text-[#CCFF00]"><span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"/>{t('landing.chart.intensity')}</span>
                    <span className="text-[10px] font-black text-white" style={{fontFamily:BC}}>{intData[hoverIdx]}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1 text-[9px] text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"/>{t('landing.chart.density')}</span>
                    <span className="text-[10px] font-black text-white" style={{fontFamily:BC}}>{denData[hoverIdx]}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Week labels */}
        <div className="flex justify-between px-0.5">
          {wkLabels.map((s,i) => (
            <span key={i} className={`flex-1 text-center text-[6px] font-bold ${hoverIdx === i ? 'text-[#CCFF00]' : 'text-slate-600'}`} style={{fontFamily:BC}}>{s}</span>
          ))}
        </div>
        {/* Bottom stats row */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-700/40">
          <div className="flex-shrink-0 mr-1">
            <ReadinessGauge size={52} t={t} />
          </div>
          {[
            {l:t('landing.chart.totalLoad'),v:'2,847 UA',c:'text-blue-400'},
            {l:'ACWR',v:'0.87',c:'text-[#CCFF00]'},
            {l:t('landing.chart.monotony'),v:'1.24',c:'text-rose-400'},
            {l:t('landing.chart.adherence'),v:'94%',c:'text-emerald-400'},
          ].map(s => (
            <div key={s.l} className="flex-1 text-center group cursor-default">
              <div className={`text-[14px] font-black leading-none ${s.c} group-hover:scale-110 transition-transform`} style={{fontFamily:BC}}>{s.v}</div>
              <div className="text-[7px] text-slate-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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

const ReadinessGauge = ({ size = 96, t }) => {
  const r = (size - 10) / 2, c = Math.PI * 2 * r, off = c - (c * 85) / 100;
  return (
    <div className="flex flex-col items-center gap-1 group cursor-default">
      <div className="relative group-hover:scale-105 transition-transform" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#CCFF00" strokeWidth="4" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white leading-none" style={{fontFamily:BC}}>85</span>
          <span className="text-[8px] text-[#CCFF00] mt-0.5 font-bold">{t ? t('landing.chart.optimal') : 'ÓPTIMO'}</span>
        </div>
      </div>
      <span className="text-[8px] text-slate-400 font-bold" style={{fontFamily:BC}}>{t ? t('landing.chart.readiness') : 'READINESS'}</span>
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

const ShowcaseChart = ({ t }) => {
  const [hIdx, setHIdx] = useState(null);
  const planned = [65,72,80,60,70,78,85,55,68,75,82,50];
  const executed = [60,68,76,58,65,74,80,52,64,72,78,48];
  return (
    <div className="relative">
      <div className="flex items-end gap-[3px] h-28" onMouseLeave={() => setHIdx(null)}>
        {planned.map((p, i) => {
          const h = hIdx === i;
          return (
            <div key={i} className="flex-1 flex items-end gap-[1px] h-full cursor-crosshair relative" onMouseEnter={() => setHIdx(i)}>
              <div className="flex-1 rounded-t-sm transition-all duration-150" style={{height:`${p}%`, background:'#3B82F6', opacity: h ? 1 : 0.6}} />
              <div className="flex-1 rounded-t-sm transition-all duration-150" style={{height:`${executed[i]}%`, background:'#CCFF00', opacity: h ? 1 : 0.5}} />
              {h && <div className="absolute top-0 left-1/2 w-px h-full bg-white/25 -translate-x-1/2 pointer-events-none" />}
            </div>
          );
        })}
      </div>
      {hIdx !== null && (
        <div className="absolute z-20 pointer-events-none" style={{top:'-4px', left:`${(hIdx/12)*100}%`, transform: hIdx > 8 ? 'translateX(-100%)' : 'translateX(0)'}}>
          <div className="bg-slate-900/95 backdrop-blur-lg border border-slate-600/60 rounded-lg px-2.5 py-1.5 shadow-xl">
            <div className="text-[8px] text-slate-400 mb-1" style={{fontFamily:BC}}>{t('landing.chart.week')} {hIdx+1}</div>
            <div className="flex items-center gap-2 text-[9px]">
              <span className="text-blue-400 font-bold">{t('landing.chart.planned')}: {planned[hIdx]}%</span>
              <span className="text-[#CCFF00] font-bold">{t('landing.chart.executed')}: {executed[hIdx]}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════ PAGE ═══════════════════════════════ */
const LandingPage = () => {
  const { t } = useTranslation();

  const PRICING = [
    { key: 'free', price: '0', pop: false, fcount: 5 },
    { key: 'pro', price: '9.99', pop: false, fcount: 5 },
    { key: 'club', price: '29.99', pop: true, fcount: 7 },
    { key: 'inst', price: '99.99', pop: false, fcount: 9 },
  ];

  return (
  <div className="min-h-screen bg-slate-950 landing-reset" style={{fontFamily:INT}}>
    <style>{`
      .landing-reset h1,.landing-reset h2,.landing-reset h3,.landing-reset h4{font-family:inherit;font-weight:inherit;text-transform:none;letter-spacing:normal;}
      @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      .bar-animate { animation: barGrow 0.8s cubic-bezier(0.16,1,0.3,1) both; transform-origin: bottom; }
      @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .count-animate { animation: countUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
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

    {/* HERO — Compact Material Design layout */}
    <section className="relative pt-[56px] overflow-hidden bg-slate-950">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(204,255,0,0.04)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-10" />

      <div className="max-w-[1120px] mx-auto px-6 relative z-10 w-full pt-10 pb-6">
        {/* Pill badges */}
        <Reveal delay={0.1} direction="up">
          <div className="flex gap-2 mb-6">
            {[t('landing.hero.pill1'),t('landing.hero.pill2'),t('landing.hero.pill3')].map(txt => (
              <span key={txt} className="px-3 py-1 border border-slate-700 rounded-full text-[9px] font-bold tracking-[0.15em] text-slate-400 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors cursor-pointer" style={{fontFamily:BC}}>{txt}</span>
            ))}
          </div>
        </Reveal>

        {/* Main grid: text left + chart right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column — branding + CTA */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <Reveal delay={0.2} direction="left">
                <h1 className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] font-black text-white leading-[0.9] tracking-[-0.03em] mb-2" style={{fontFamily:BC}} data-testid="hero-title">
                  iTRAIN
                </h1>
                <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-5" style={{fontFamily:BC}}>{t('landing.hero.tagline')}</p>
              </Reveal>
              <Reveal delay={0.35} direction="up">
                <p className="text-[15px] text-slate-400 leading-[1.7] mb-6 max-w-[380px]" data-testid="hero-subtitle">
                  {t('landing.hero.subtitle')}
                </p>
              </Reveal>
              <Reveal delay={0.5} direction="up">
                <div className="flex gap-3 mb-5">
                  <Link to="/auth">
                    <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-11 px-7 text-[13px] font-bold rounded-xl shadow-lg shadow-[#CCFF00]/10" style={{fontFamily:BC}} data-testid="hero-cta-btn">
                      {t('landing.hero.cta_primary')} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <a href="#features">
                    <Button variant="outline" className="h-11 px-5 text-[13px] font-medium border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl">
                      {t('landing.hero.cta_secondary')}
                    </Button>
                  </a>
                </div>
              </Reveal>
              <Reveal delay={0.6} direction="up">
                <div className="flex gap-4 text-[11px] text-slate-500 mb-6">
                  {[t('landing.hero.free_trial'),t('landing.hero.no_card'),t('landing.hero.cancel_anytime')].map(txt => (
                    <span key={txt} className="flex items-center gap-1.5"><Check className="w-3 h-3 text-[#CCFF00]" />{txt}</span>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Inline stat cards */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                {icon: <Zap className="w-4 h-4 text-blue-400" />, v:'0.87', l:'ACWR', bg:'bg-blue-500/10', border:'border-blue-500/20'},
                {icon: <Heart className="w-4 h-4 text-emerald-400" />, v:'156', l:t('landing.chart.fcMax'), bg:'bg-emerald-500/10', border:'border-emerald-500/20'},
                {icon: <Users className="w-4 h-4 text-[#CCFF00]" />, v:'24', l:t('landing.chart.athletes'), bg:'bg-[#CCFF00]/10', border:'border-[#CCFF00]/20'},
                {icon: <Target className="w-4 h-4 text-purple-400" />, v:'94%', l:t('landing.chart.adherence').toUpperCase(), bg:'bg-purple-500/10', border:'border-purple-500/20'},
              ].map((s,i) => (
                <Reveal key={i} delay={0.7 + i * 0.1} direction="up">
                  <div className={`${s.bg} ${s.border} border rounded-xl px-3.5 py-2.5 flex items-center gap-2.5`}>
                    <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center">{s.icon}</div>
                    <div>
                      <div className="text-[16px] font-black text-white leading-none" style={{fontFamily:BC}}>{s.v}</div>
                      <div className="text-[8px] text-slate-500 font-bold mt-0.5">{s.l}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right column — Chart */}
          <Reveal delay={0.4} direction="right" className="lg:col-span-7 relative" style={{animation:'float 6s ease-in-out infinite'}}>
            <PeriodizationMiniChart t={t} />
          </Reveal>
        </div>
      </div>

      {/* Animated Marquee */}
      <div className="mt-4">
        <MarqueeStrip />
      </div>

      {/* Stats strip */}
      <div className="border-t border-slate-800/40 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-[1120px] mx-auto px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[{v:'17',k:'models'},{v:'6',k:'controls'},{v:'150+',k:'exercises'},{v:'5',k:'calculators'}].map((s,i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[22px] font-black text-white leading-none" style={{fontFamily:BC}}>{s.v}</span>
                <span className="text-[12px] text-slate-500 leading-snug">{t(`landing.hero.stats.${s.k}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* FEATURES — Dark cards */}
    <section id="features" className="py-20 px-6 bg-slate-950 relative overflow-hidden">
      <div className="max-w-[1120px] mx-auto relative z-10">
        <Reveal direction="up" className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-2" style={{fontFamily:BC}}>{t('landing.features.tag')}</p>
          <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.15]" style={{fontFamily:INT}}>{t('landing.features.title')}</h2>
        </Reveal>

        <div className="grid grid-cols-12 gap-3">
          {/* Main — Plan Gráfico */}
          <Reveal delay={0.1} direction="up" className="col-span-12 md:col-span-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 relative overflow-hidden h-full" data-testid="feature-periodization">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#CCFF00] rounded-lg flex items-center justify-center"><BarChart3 className="w-4 h-4 text-slate-900" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#CCFF00]" style={{fontFamily:BC}}>{t('landing.features.tag')}</span>
                </div>
                <h3 className="text-[20px] font-semibold text-white mb-2">{t('landing.features.m1_title')}</h3>
                <p className="text-[13px] text-slate-400 leading-[1.6] max-w-xs">{t('landing.features.m1_desc')}</p>
              </div>
              {/* Mini phase labels */}
              <div className="hidden md:flex gap-1.5 mt-1">
                {[{k:'accumulation',c:'#3B82F6'},{k:'transformation',c:'#CCFF00'},{k:'realization',c:'#F43F5E'}].map(p => (
                  <span key={p.k} className="px-2 py-0.5 rounded text-[8px] font-bold" style={{background:p.c+'20', color:p.c, fontFamily:BC}}>{t(`landing.chart.${p.k}`).substring(0,3).toUpperCase()}</span>
                ))}
              </div>
            </div>
            {/* Realistic bar chart with data */}
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/20">
              <div className="flex items-end gap-[3px] h-44">
                {[
                  [78,35,55],[85,40,50],[90,45,48],[62,50,58],[75,48,52],[82,55,50],[88,60,45],[68,65,62],
                  [76,58,55],[84,68,48],[92,72,42],[65,75,65],[70,70,58],[82,78,52],[88,82,48],[60,85,70],
                  [68,78,62],[80,85,56],[86,88,50],[52,90,72],[62,85,65],[75,90,58],[82,92,52],[48,95,78]
                ].map((d,i) => (
                  <div key={i} className="flex-1 flex items-end gap-[1px] h-full">
                    <div className="flex-1 rounded-t-sm" style={{height:`${d[0]}%`, background:'#3B82F6', opacity:0.85}} />
                    <div className="flex-1 rounded-t-sm" style={{height:`${d[1]}%`, background:'#CCFF00', opacity:0.8}} />
                    <div className="flex-1 rounded-t-sm" style={{height:`${d[2]}%`, background:'#F43F5E', opacity:0.7}} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 px-0.5">
                {['S1','','','','S5','','','','S9','','','','S13','','','','S17','','','','S21','','','S24'].map((s,i) => (
                  <span key={i} className="flex-1 text-center text-[7px] text-slate-600 font-bold" style={{fontFamily:BC}}>{s}</span>
                ))}
              </div>
              {/* Bottom stat row */}
              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-700/30">
                {[{l:t('landing.chart.volume'),v:'2,847 UA',c:'#3B82F6'},{l:t('landing.chart.intensity'),v:'78%',c:'#CCFF00'},{l:t('landing.chart.density'),v:'1.24',c:'#F43F5E'},{l:t('landing.chart.weeksLabel'),v:'24',c:'#64748b'}].map(s => (
                  <div key={s.l} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{background:s.c}} />
                    <span className="text-[10px] font-bold" style={{color:s.c, fontFamily:BC}}>{s.v}</span>
                    <span className="text-[9px] text-slate-500">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </Reveal>

          {/* Atletas */}
          <Reveal delay={0.25} direction="up" className="col-span-12 md:col-span-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 flex flex-col justify-between h-full" data-testid="feature-team">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center"><Users className="w-4 h-4 text-white" /></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400" style={{fontFamily:BC}}>Central</span>
              </div>
              <h3 className="text-[20px] font-semibold text-white mb-2">{t('landing.features.m2_title')}</h3>
              <p className="text-[13px] text-slate-400 leading-[1.6]">{t('landing.features.m2_desc')}</p>
            </div>
            {/* Realistic athlete list */}
            <div className="mt-4 space-y-2">
              {[
                {n:'Juan Pérez',s:t('landing.chart.athletics'),v:'VO2: 52.3',c:'bg-blue-500'},
                {n:'María López',s:t('landing.chart.swimming'),v:'1RM: 95kg',c:'bg-emerald-500'},
                {n:'Carlos Díaz',s:t('landing.chart.football'),v:'ACWR: 0.91',c:'bg-purple-500'},
              ].map((a,i) => (
                <div key={i} className="flex items-center gap-2.5 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/30">
                  <div className={`w-7 h-7 ${a.c} rounded-full flex items-center justify-center text-[9px] font-bold text-white`}>{a.n.split(' ').map(w=>w[0]).join('')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white truncate">{a.n}</div>
                    <div className="text-[9px] text-slate-500">{a.s}</div>
                  </div>
                  <span className="text-[9px] text-[#CCFF00] font-bold" style={{fontFamily:BC}}>{a.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-center gap-1 pt-1">
                <TeamFormation />
                <span className="text-[9px] text-slate-500 ml-2">{t('landing.chart.moreAthletes')}</span>
              </div>
            </div>
          </div>
          </Reveal>

          {/* IA */}
          <Reveal delay={0.15} direction="up" className="col-span-12 md:col-span-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 flex flex-col justify-between min-h-[220px] h-full" data-testid="feature-ai">
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
          </Reveal>

          {/* Analysis */}
          <Reveal delay={0.3} direction="up" className="col-span-12 md:col-span-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 flex flex-col justify-between min-h-[220px] h-full" data-testid="feature-analysis">
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
          </Reveal>

          {/* Multi-sport */}
          <Reveal delay={0.1} direction="up" className="col-span-6 md:col-span-3">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between min-h-[120px] h-full" data-testid="feature-multisport">
            <Target className="w-5 h-5 text-[#CCFF00]" />
            <div>
              <h3 className="text-[16px] font-semibold text-white">Multi-sport</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">+20</p>
            </div>
          </div>
          </Reveal>

          {/* Calculators */}
          <Reveal delay={0.2} direction="up" className="col-span-6 md:col-span-5">
          <div className="bg-[#CCFF00] rounded-2xl p-6 flex items-center justify-between h-full" data-testid="feature-calculators">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900">{t('landing.hero.stats.calculators')}</h3>
              <p className="text-slate-900/50 text-[13px] mt-0.5">1RM · VO2max · HR Zones · Karvonen</p>
            </div>
            <Activity className="w-6 h-6 text-slate-900/20" />
          </div>
          </Reveal>

          {/* Export */}
          <Reveal delay={0.3} direction="up" className="col-span-12 md:col-span-4">
          <div className="bg-white rounded-2xl p-6 flex items-center justify-between h-full" data-testid="feature-export">
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900">PDF Export</h3>
              <p className="text-slate-500 text-[13px] mt-0.5">{t('landing.features.m7_desc').split('.')[0]}</p>
            </div>
            <FileText className="w-6 h-6 text-slate-300" />
          </div>
          </Reveal>
        </div>
      </div>
    </section>

    {/* PRODUCT SHOWCASE — Dark */}
    <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
      <div className="max-w-[1120px] mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <Reveal direction="left" className="lg:col-span-5">
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
          </Reveal>
          <Reveal delay={0.3} direction="right" className="lg:col-span-7 relative" style={{animation:'float 6s ease-in-out infinite'}}>
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/30 p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /></div>
                  <span className="text-[9px] text-slate-500 ml-2 font-mono">iTRAIN {t('landing.chart.dashboard')} v3.0</span>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-[8px] font-bold text-blue-400"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>{t('landing.chart.volume')}</span>
                  <span className="flex items-center gap-1 text-[8px] font-bold text-[#CCFF00]"><span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]"/>{t('landing.chart.intensity')}</span>
                  <span className="flex items-center gap-1 text-[8px] font-bold text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"/>{t('landing.chart.density')}</span>
                </div>
              </div>
              {/* Interactive mini chart */}
              <ShowcaseChart t={t} />
              {/* Bottom area chart */}
              <div className="h-16 relative mt-3">
                <div className="absolute inset-0"><AnimatedLineWave color="#3B82F6" amplitude={25} speed="6s" /></div>
                <div className="absolute inset-0"><AnimatedLineWave color="#CCFF00" amplitude={20} speed="8s" /></div>
              </div>
            </div>
            <div className="absolute -top-4 -left-4 z-20">
              <div className="bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/30 shadow-xl">
                <ReadinessGauge size={72} t={t} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>

    {/* HOW IT WORKS */}
    <section id="how-it-works" className="py-20 px-6 bg-slate-950 relative overflow-hidden">
      <div className="max-w-[1120px] mx-auto relative z-10">
        <Reveal direction="up" className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-2" style={{fontFamily:BC}}>{t('landing.howItWorks.tag')}</p>
          <h2 className="text-[28px] font-bold text-white leading-tight" style={{fontFamily:INT}}>{t('landing.howItWorks.title')}</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {n:'01',icon:Calendar,title:t('landing.howItWorks.step1_title'),desc:t('landing.howItWorks.step1_desc')},
            {n:'02',icon:Layers,title:t('landing.howItWorks.step2_title'),desc:t('landing.howItWorks.step2_desc')},
            {n:'03',icon:LineChart,title:t('landing.howItWorks.step3_title'),desc:t('landing.howItWorks.step3_desc')},
          ].map((s,i) => (
            <Reveal key={s.n} delay={i * 0.15} direction="up">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 relative group hover:border-[#CCFF00]/20 transition-colors h-full" data-testid={`step-${s.n}`}>
                <span className="text-[48px] font-black text-slate-800 leading-none absolute top-4 right-5" style={{fontFamily:BC}}>{s.n}</span>
                <div className="w-11 h-11 bg-[#CCFF00]/10 rounded-xl flex items-center justify-center mb-5">
                  <s.icon className="w-5 h-5 text-[#CCFF00]" />
                </div>
                <h3 className="text-[17px] font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-[13px] text-slate-400 leading-[1.6]">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* PRICING */}
    <section id="pricing" className="py-20 px-6 bg-slate-950 relative overflow-hidden">
      <div className="max-w-[1120px] mx-auto relative z-10">
        <Reveal direction="up" className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#CCFF00] mb-2" style={{fontFamily:BC}}>{t('landing.pricing.tag')}</p>
          <h2 className="text-[28px] font-bold text-white leading-tight" style={{fontFamily:INT}}>{t('landing.pricing.title')}</h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING.map((plan,idx) => {
            const features = Array.from({length: plan.fcount}, (_, j) => t(`landing.pricing.${plan.key}_f${j+1}`));
            return (
            <Reveal key={plan.key} delay={idx * 0.1} direction="up">
            <div className={`relative rounded-2xl p-6 transition-all duration-200 h-full ${plan.pop ? 'bg-[#CCFF00] ring-1 ring-[#CCFF00] shadow-xl shadow-[#CCFF00]/10' : 'bg-slate-900 border border-slate-800 hover:border-slate-700'}`} data-testid={`pricing-card-${plan.key}`}>
              {plan.pop && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-900 text-[#CCFF00] text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full" style={{fontFamily:BC}}>{t('landing.pricing.mostPopular')}</div>}
              <h3 className={`text-[15px] font-semibold ${plan.pop ? 'text-slate-900' : 'text-white'}`}>{t(`landing.pricing.${plan.key}_name`)}</h3>
              <p className={`text-[12px] mt-0.5 ${plan.pop ? 'text-slate-700' : 'text-slate-500'}`}>{t(`landing.pricing.${plan.key}_desc`)}</p>
              <div className="flex items-baseline mt-4 mb-5">
                <span className={`text-[32px] font-black leading-none ${plan.pop ? 'text-slate-900' : 'text-white'}`} style={{fontFamily:BC}}>${plan.price}</span>
                <span className={`text-[13px] ml-1 ${plan.pop ? 'text-slate-600' : 'text-slate-500'}`}>{t('landing.pricing.perMonth')}</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {features.map((f,j) => (
                  <li key={j} className={`flex items-start gap-2 text-[13px] leading-snug ${plan.pop ? 'text-slate-700' : 'text-slate-400'}`}>
                    <Check className={`w-4 h-4 flex-shrink-0 mt-[1px] ${plan.pop ? 'text-slate-900' : 'text-[#CCFF00]'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className={`w-full rounded-xl h-10 text-[12px] font-semibold ${plan.pop ? 'bg-slate-900 text-[#CCFF00] hover:bg-slate-800' : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'}`} data-testid={`pricing-cta-${plan.key}`}>
                  {t(`landing.pricing.${plan.key}_cta`)} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
            </Reveal>
            );
          })}
        </div>
      </div>
    </section>

    {/* FINAL CTA */}
    <section className="py-20 px-6 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(204,255,0,0.04)_0%,transparent_60%)]" />
      <Reveal direction="scale" className="max-w-[700px] mx-auto text-center relative z-10">
        <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.15] mb-4" style={{fontFamily:INT}}>
          {t('landing.cta.title')}
        </h2>
        <p className="text-[15px] text-slate-400 mb-8 leading-[1.7]">{t('landing.cta.desc')}</p>
        <Link to="/auth">
          <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-12 px-10 text-[14px] font-bold rounded-xl shadow-lg shadow-[#CCFF00]/10" style={{fontFamily:BC}} data-testid="final-cta-btn">
            {t('landing.cta.button')} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </Reveal>
    </section>

    {/* FOOTER */}
    <footer className="bg-slate-950 border-t border-slate-800/40 py-10 px-6">
      <div className="max-w-[1120px] mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#CCFF00] rounded-full flex items-center justify-center"><Activity className="w-3.5 h-3.5 text-slate-900" /></div>
            <span className="text-[14px] font-black text-white" style={{fontFamily:BC}}>iTRAIN</span>
          </div>
          <p className="text-[12px] text-slate-600">2026 iTRAIN. {t('landing.footer.copyright')}</p>
        </div>
      </div>
    </footer>
  </div>
  );
};

export default LandingPage;

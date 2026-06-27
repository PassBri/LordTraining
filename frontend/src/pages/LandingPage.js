import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../landing/landingThemes.css';
import '../landing/landingFuturistic.css';
import '../landing/landingLight.css';
import { Button } from '../components/ui/button';
import { LanguageSelector } from '../components/LanguageSelector';
import {
  Check, Target, Brain, Calendar, BarChart3, Users,
  ArrowRight, Activity, FileText, Dumbbell,
  Heart, Ruler, Eye, Sparkles, Layers, LineChart,
  ChevronRight, ChevronLeft, Zap, Shield, GraduationCap, Globe, UserCheck, Building2
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

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

/* ═══ SECTION TAG — Material Design ═══ */
const SectionTag = ({ children, center = true }) => (
  <div className={`flex items-center gap-3 mb-4 ${center ? 'justify-center' : ''}`}>
    <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#CCFF00]/60" />
    <span className="text-[13px] font-black uppercase tracking-[0.18em] text-[#CCFF00] relative" style={{fontFamily:BC, textShadow:'0 0 20px rgba(204,255,0,0.3)'}}>
      {children}
    </span>
    <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#CCFF00]/60" />
  </div>
);

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
      <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/40 p-6 lg:p-7 shadow-2xl">
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
          <div className="flex items-end gap-[2px] h-52 lg:h-64 mb-2 px-0.5" onMouseLeave={() => setHoverIdx(null)}>
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

const MarqueeStrip = ({ t }) => {
  const items = [
    t('landing.marquee.m_volume'), t('landing.marquee.m_intensity'), t('landing.marquee.m_density'),
    'ACWR', 'VO2MAX', '1RM',
    t('landing.marquee.m_periodization'), 'ATR',
    t('landing.marquee.m_block'), t('landing.marquee.m_undulating'),
    t('landing.marquee.m_mesocycle'), t('landing.marquee.m_microcycle'), t('landing.marquee.m_macrocycle'),
    'KARVONEN', t('landing.marquee.m_competition')
  ];
  return (
    <div className="overflow-hidden py-3 bg-gradient-to-r from-[#0a0f19] via-[#1a2033] to-[#0a0f19] border-y border-[#CCFF00]/15" style={{maskImage:'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)',WebkitMaskImage:'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)'}}>
      <div className="flex animate-marquee-slow whitespace-nowrap">
        {[...Array(3)].map((_, rep) => (
          <React.Fragment key={rep}>
            {items.map((txt, i) => (
              <span key={`${rep}-${i}`} className="inline-flex items-center gap-3 px-4 text-[14px] md:text-[17px] font-black uppercase tracking-[0.08em]" style={{fontFamily:BC}}>
                <span className={i % 3 === 0 ? 'text-[#CCFF00]' : 'text-white/35'}>{txt}</span>
                <span className="text-[#CCFF00]/35 text-[10px]">●</span>
              </span>
            ))}
          </React.Fragment>
        ))}
      </div>
      <style>{`
        @keyframes marquee-slow { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        .animate-marquee-slow { animation: marquee-slow 90s linear infinite; display: flex; width: max-content; }
      `}</style>
    </div>
  );
};

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
      <div className="flex items-end gap-[3px] h-48" onMouseLeave={() => setHIdx(null)}>
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
            <div className="text-[10px] text-slate-400 mb-1" style={{fontFamily:BC}}>{t('landing.chart.week')} {hIdx+1}</div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-blue-400 font-bold">{t('landing.chart.planned')}: {planned[hIdx]}%</span>
              <span className="text-[#CCFF00] font-bold">{t('landing.chart.executed')}: {executed[hIdx]}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══ TESTIMONIALS CAROUSEL ═══ */
const TESTIMONIAL_META = [
  { id:1, initials:'CM', name:'C.M.', segment:'coach', color:'#c8f700' },
  { id:2, initials:'AR', name:'A.R.', segment:'club', color:'#378ADD' },
  { id:3, initials:'DT', name:'D.T.', segment:'federation', color:'#E24B4A' },
  { id:4, initials:'MV', name:'M.V.', segment:'club', color:'#378ADD' },
  { id:5, initials:'LP', name:'L.P.', segment:'school', color:'#7F77DD' },
  { id:6, initials:'RG', name:'R.G.', segment:'federation', color:'#E24B4A' },
  { id:7, initials:'JF', name:'J.F.', segment:'coach', color:'#c8f700' },
  { id:8, initials:'SC', name:'S.C.', segment:'school', color:'#7F77DD' },
  { id:9, initials:'BM', name:'B.M.', segment:'coach', color:'#c8f700' },
  { id:10, initials:'HQ', name:'H.Q.', segment:'federation', color:'#E24B4A' },
];

const TestimonialsCarousel = ({ t }) => {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const totalPages = Math.ceil(TESTIMONIAL_META.length / 3);

  const scroll = useCallback((dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.querySelector('[data-card]')?.offsetWidth || 370;
    const gap = 16;
    const scrollAmount = (cardW + gap) * 3;
    el.scrollBy({ left: dir === 'next' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const cardW = el.querySelector('[data-card]')?.offsetWidth || 370;
      const gap = 16;
      const page = Math.round(el.scrollLeft / ((cardW + gap) * 3));
      setActiveIdx(Math.min(page, totalPages - 1));
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [totalPages]);

  return (
    <section className="pt-24 pb-10 px-6 bg-slate-950 relative overflow-hidden" data-testid="testimonials-section">
      <div className="max-w-[1120px] mx-auto relative z-10">
        {/* Header with nav arrows */}
        <Reveal direction="up">
          <SectionTag>{t('landing.social.tag')}</SectionTag>
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.15] mb-2" style={{fontFamily:INT}}>{t('landing.social.title')}</h2>
              <p className="text-[14px] text-slate-400">{t('landing.social.subtitle')}</p>
            </div>
            <div className="hidden md:flex gap-2">
              <button onClick={() => scroll('prev')} className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors" data-testid="testimonial-prev" aria-label="Previous">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => scroll('next')} className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors" data-testid="testimonial-next" aria-label="Next">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </Reveal>

        {/* Scrollable cards */}
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth" style={{scrollbarWidth:'none', msOverflowStyle:'none', WebkitOverflowScrolling:'touch'}} data-testid="testimonials-grid">
          <style>{`.testimonials-scroll::-webkit-scrollbar{display:none;}`}</style>
          {TESTIMONIAL_META.map((tm) => (
            <div key={tm.id} data-card className="flex-shrink-0 w-[calc(100%-16px)] sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] snap-start" data-testid={`testimonial-${tm.id}`}>
              <div className="h-full rounded-xl p-6 flex flex-col justify-between" style={{background:'#161b24', border:'0.5px solid rgba(255,255,255,0.08)'}}>
                {/* Quote mark */}
                <div>
                  <div className="text-[32px] font-black leading-none mb-3 select-none" style={{color: tm.color, fontFamily:BC}}>"</div>
                  <p className="text-[14px] text-white leading-[1.7] mb-6">{t(`landing.social.t${tm.id}_text`)}</p>
                </div>
                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t" style={{borderColor:'rgba(255,255,255,0.06)'}}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{background: tm.color, color: tm.color === '#c8f700' ? '#0f172a' : '#fff'}}>
                    {tm.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white">{tm.name}</p>
                    <p className="text-[12px] text-slate-400 leading-snug">{t(`landing.social.t${tm.id}_role`)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {Array.from({length: totalPages}).map((_, i) => (
            <button key={i} onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              const cardW = el.querySelector('[data-card]')?.offsetWidth || 370;
              el.scrollTo({ left: i * (cardW + 16) * 3, behavior: 'smooth' });
            }} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIdx ? 'w-6 bg-[#CCFF00]' : 'w-1.5 bg-slate-700 hover:bg-slate-600'}`} aria-label={`Page ${i + 1}`} data-testid={`testimonial-dot-${i}`} />
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-slate-600 text-center mt-6">{t('landing.social.disclaimer')}</p>
      </div>
    </section>
  );
};

/* ═══════════════════════════════ PAGE ═══════════════════════════════ */
const LANDING_TIER_MAP = { starter: 'starter', pro: 'basic', club: 'pro', inst: 'enterprise' };

const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  const [landingLogo, setLandingLogo] = useState('/brand/lordtraining-master.png');
  useEffect(() => {
    import('../utils/branding').then(({ fetchActiveBranding }) =>
      fetchActiveBranding().then((b) => { if (b.landing) setLandingLogo(b.landing); }));
  }, []);

  // Apariencia del landing (tema global elegido por el super admin) — guardado en MongoDB
  const [landingTheme, setLandingTheme] = useState('classic');
  useEffect(() => {
    const BACKEND = process.env.REACT_APP_BACKEND_URL;
    fetch(`${BACKEND}/api/landing/theme`)
      .then(r => r.json())
      .then(d => { if (d?.active_theme) setLandingTheme(d.active_theme); })
      .catch(() => {});
  }, []);

  const handlePlanCheckout = (landingKey) => {
    const tier = LANDING_TIER_MAP[landingKey] || 'starter';
    const cycle = billingCycle;
    const token = localStorage.getItem('train_token');
    if (token) {
      navigate(`/subscription?plan=${tier}&cycle=${cycle}&autocheckout=1`);
    } else {
      sessionStorage.setItem('pending_checkout', JSON.stringify({ tier, cycle }));
      navigate('/auth');
    }
  };

  const PRICING = [
    { key: 'starter', price: '9.99', pop: false, fcount: 6 },
    { key: 'pro', price: '19.99', pop: false, fcount: 7 },
    { key: 'club', price: '49.99', pop: true, fcount: 8 },
    { key: 'inst', price: '149.99', pop: false, fcount: 9 },
  ];

  return (
  <div className="min-h-screen bg-slate-950 landing-reset lt-theme" data-landing-theme={landingTheme} style={{fontFamily:INT}}>
    <style>{`
      .lt-theme, .lt-theme * { transition: background-color .3s ease, color .3s ease, border-color .3s ease, box-shadow .3s ease; }
      .landing-reset h1,.landing-reset h2,.landing-reset h3,.landing-reset h4{font-family:inherit;font-weight:inherit;text-transform:none;letter-spacing:normal;}
      @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      .bar-animate { animation: barGrow 0.8s cubic-bezier(0.16,1,0.3,1) both; transform-origin: bottom; }
      @keyframes countUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .count-animate { animation: countUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
      @keyframes shieldGlow { 0%,100% { opacity: 0.55; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }
      @keyframes shieldFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    `}</style>

    {/* NAV — Dark, cinematic */}
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/40" data-testid="main-nav">
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="flex items-center justify-between h-[56px]">
          <Link to="/" className="flex items-center gap-3" data-testid="nav-brand-logo">
            <img src="/brand/lordtraining-scale.png" alt="" className="h-11 w-11 object-contain" style={{filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.45))'}} />
            <span className="text-[17px] font-black text-white tracking-tight" style={{fontFamily:BC, letterSpacing:'0.01em'}}>Lord<span className="text-[#CCFF00]">Training</span></span>
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
      {/* Tagline strip — full width with animated performance wave */}
      <div className="relative overflow-hidden bg-slate-900/80 border-t border-slate-800/30">
        {/* Animated wave behind text */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 40">
          <path d="M0 20 Q50 8,100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20" fill="none" stroke="#CCFF00" strokeWidth="1" opacity="0.15">
            <animate attributeName="d" dur="3s" repeatCount="indefinite" values="M0 20 Q50 8,100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20;M0 20 Q50 32,100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20;M0 20 Q50 8,100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20" />
          </path>
          <path d="M0 20 L80 20 L90 6 L100 34 L110 12 L120 28 L130 20 L1200 20" fill="none" stroke="#CCFF00" strokeWidth="1.5" opacity="0.25" strokeLinecap="round">
            <animateTransform attributeName="transform" type="translate" values="-200,0;1200,0" dur="4s" repeatCount="indefinite" />
          </path>
        </svg>
        <div className="relative z-10 py-2.5 px-6 text-center">
          <p className="text-[20px] md:text-[24px] font-black uppercase tracking-[0.08em] text-[#CCFF00]" style={{fontFamily:BC}}>{t('landing.hero.tagline')}</p>
        </div>
      </div>
    </nav>

    {/* HERO — Compact Material Design layout */}
    <section className="relative pt-[100px] overflow-hidden bg-slate-950">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(204,255,0,0.04)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-10" />

      <div className="max-w-[1120px] mx-auto px-6 relative z-10 w-full pt-10 pb-6">
        {/* Main grid: brand left + chart right (Material Design — generous spacing, vertically centered) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left column — branding + CTA */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start gap-7">
            {/* Big heraldic shield — hero brand mark */}
            <Reveal delay={0.15} direction="up">
              <div className="flex justify-center lg:justify-start relative" data-testid="hero-shield">
                {/* Pulsing golden glow halo */}
                <span className="absolute inset-0 m-auto rounded-full pointer-events-none" style={{
                  width: '70%', height: '70%', top: 0, bottom: 0, left: 0, right: 0,
                  background: 'radial-gradient(circle, rgba(245,200,80,0.45) 0%, rgba(204,255,0,0.18) 35%, transparent 70%)',
                  filter: 'blur(28px)',
                  animation: 'shieldGlow 3s ease-in-out infinite',
                }} />
                <img
                  src={landingLogo}
                  alt="LordTraining"
                  className="relative h-[220px] sm:h-[260px] lg:h-[300px] w-auto"
                  style={{ filter: 'drop-shadow(0 18px 32px rgba(0,0,0,0.55))', animation: 'shieldFloat 3s ease-in-out infinite' }}
                />
              </div>
            </Reveal>

            <Reveal delay={0.3} direction="up">
              <h1 className="text-[1.55rem] sm:text-[1.8rem] lg:text-[2rem] font-black leading-[1.2] tracking-[-0.01em] text-center lg:text-left" style={{fontFamily:BC}} data-testid="hero-headline">
                <span className="text-[#CCFF00]">{t('landing.hero.headline_verb1')}</span><span className="text-white">{t('landing.hero.headline_rest1')}</span><br/>
                <span className="text-[#CCFF00]">{t('landing.hero.headline_verb2')}</span><span className="text-white">{t('landing.hero.headline_rest2')}</span>
              </h1>
            </Reveal>

            <Reveal delay={0.4} direction="up">
              <p className="text-[15px] text-slate-400 leading-[1.7] max-w-[440px] text-center lg:text-left" data-testid="hero-subtitle">
                {t('landing.hero.subtitle')}
              </p>
            </Reveal>

            <Reveal delay={0.5} direction="up">
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link to="/auth">
                  <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-12 px-8 text-[13px] font-bold rounded-xl shadow-lg shadow-[#CCFF00]/20 transition-all hover:-translate-y-0.5" style={{fontFamily:BC}} data-testid="hero-cta-btn">
                    {t('landing.hero.cta_primary')} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" className="h-12 px-6 text-[13px] font-medium border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 rounded-xl transition-all">
                    {t('landing.hero.cta_secondary')}
                  </Button>
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right column — Chart */}
          <Reveal delay={0.4} direction="right" className="lg:col-span-7 relative" style={{animation:'float 6s ease-in-out infinite'}}>
            <PeriodizationMiniChart t={t} />
          </Reveal>
        </div>
      </div>

      {/* Animated Marquee */}
      <div className="mt-4">
        <MarqueeStrip t={t} />
      </div>

      {/* Stats strip — marquee animado */}
      <div className="border-t border-slate-800/40 bg-slate-900/40 backdrop-blur-sm overflow-hidden py-3" style={{maskImage:'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)',WebkitMaskImage:'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)'}}>
        <div className="flex animate-stats-marquee whitespace-nowrap">
          {[...Array(4)].map((_, rep) => (
            <React.Fragment key={rep}>
              {[{v:'17',k:'models'},{v:'6',k:'controls'},{v:'150+',k:'exercises'},{v:'5',k:'calculators'},{v:'30+',k:'sports'},{v:'12',k:'periodizations'}].map((s,i) => (
                <span key={`${rep}-${i}`} className="inline-flex items-center gap-2.5 px-6">
                  <span className="text-[18px] md:text-[22px] font-black text-[#CCFF00] leading-none" style={{fontFamily:BC}}>{s.v}</span>
                  <span className="text-[13px] md:text-[15px] font-bold uppercase tracking-[0.1em] text-white/50 leading-none" style={{fontFamily:BC}}>{s.k ? t(`landing.hero.stats.${s.k}`) : s.l}</span>
                  <span className="text-[#CCFF00]/35 text-[10px] ml-2">●</span>
                </span>
              ))}
            </React.Fragment>
          ))}
        </div>
        <style>{`
          @keyframes stats-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-25%); } }
          .animate-stats-marquee { animation: stats-marquee 100s linear infinite; display: flex; width: max-content; }
        `}</style>
      </div>
    </section>

    {/* MARQUEE SCROLLING — Palabras moviéndose */}
    <section className="relative bg-gradient-to-r from-[#0a0f19] via-[#1a2033] to-[#0a0f19] border-y border-[#CCFF00]/15 overflow-hidden" data-testid="marquee-section">
      <div className="relative flex overflow-hidden py-3" style={{maskImage:'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)',WebkitMaskImage:'linear-gradient(90deg,transparent,black 6%,black 94%,transparent)'}}>
        <div className="flex shrink-0 whitespace-nowrap animate-[marquee_90s_linear_infinite]">
          {[
            'FUTBOL','BALONCESTO','VOLEIBOL','TENIS','TEJO','RANA','BOLIRANA','BOCHAS','PETANCA','MINITEJO','RUGBY','HOCKEY','HANDBALL','BEISBOL','FUTSAL','PADEL',
            'BADMINTON','SQUASH','GOLF','TIRO CON ARCO','DARDOS','TIRO DEPORTIVO','BOLICHE','BOLO CRIOLLO','ESCALADA','ATLETISMO','CICLISMO','NATACION','BOXEO','KARATE','MMA','JUDO','TAEKWONDO'
          ].concat([
            'FUTBOL','BALONCESTO','VOLEIBOL','TENIS','TEJO','RANA','BOLIRANA','BOCHAS','PETANCA','MINITEJO','RUGBY','HOCKEY','HANDBALL','BEISBOL','FUTSAL','PADEL',
            'BADMINTON','SQUASH','GOLF','TIRO CON ARCO','DARDOS','TIRO DEPORTIVO','BOLICHE','BOLO CRIOLLO','ESCALADA','ATLETISMO','CICLISMO','NATACION','BOXEO','KARATE','MMA','JUDO','TAEKWONDO'
          ]).map((w, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-4 text-[14px] md:text-[17px] font-black uppercase tracking-[0.08em]" style={{fontFamily:BC}}>
              <span className={i % 3 === 0 ? 'text-[#CCFF00]' : 'text-white/35'}>{w}</span>
              <span className="text-[#CCFF00]/35 text-[10px]">●</span>
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </section>

    {/* MINIATURAS CANCHAS — Jugadas animadas estilo pizarrón */}
    <section className="py-16 px-6 bg-slate-950 relative overflow-hidden" data-testid="sport-courts-gallery">
      <style>{`
        @keyframes sport-ball { 0%,15% { transform: translate(0,0); opacity:0 } 20%,80% { opacity:1 } 50% { transform: translate(var(--bx,15px), var(--by,-20px)) } 85%,100% { transform: translate(var(--bx2,30px), var(--by2,-30px)); opacity:0 } }
        @keyframes sport-player { 0%,20% { transform: translate(0,0) } 60%,100% { transform: translate(var(--px,10px), var(--py,-12px)) } }
        @keyframes sport-arrow { 0%,30% { stroke-dashoffset: 100 } 70%,100% { stroke-dashoffset: 0 } }
        @keyframes sport-pulse { 0%,100% { opacity:0.6 } 50% { opacity:1 } }
        .sport-card { will-change: transform }
        .sport-card svg .anim-ball { animation: sport-ball 4s ease-in-out infinite }
        .sport-card svg .anim-player { animation: sport-player 4s ease-in-out infinite }
        .sport-card svg .anim-arrow { stroke-dasharray:100; animation: sport-arrow 4s ease-in-out infinite }
        .sport-card svg .anim-pulse { animation: sport-pulse 1.8s ease-in-out infinite }
      `}</style>
      <div className="max-w-[1120px] mx-auto relative z-10">
        <Reveal direction="up" className="text-center mb-10">
          <SectionTag>{t('landing.multisport.tag')}</SectionTag>
          <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.15] mb-3" style={{fontFamily:INT}}>{t('landing.multisport.title_pre')} <span className="text-[#CCFF00]">30+ {t('landing.multisport.sports_word')}</span></h2>
          <p className="text-slate-400 text-[14px] max-w-[520px] mx-auto">{t('landing.multisport.subtitle')}</p>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            {name:'Fútbol', svg:`<defs><linearGradient id="gradFld" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14a34a"/><stop offset="100%" stop-color="#0d5c2a"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradFld)"/><g fill="none" stroke="#fff" stroke-width="0.7"><rect x="3" y="3" width="94" height="134"/><line x1="3" y1="70" x2="97" y2="70"/><circle cx="50" cy="70" r="10"/><circle cx="50" cy="70" r="0.8" fill="#fff"/><rect x="28" y="3" width="44" height="16"/><rect x="36" y="3" width="28" height="6"/><rect x="28" y="121" width="44" height="16"/><rect x="36" y="131" width="28" height="6"/><path d="M 28,19 Q 50,28 72,19"/><path d="M 28,121 Q 50,112 72,121"/></g><line class="anim-arrow" x1="35" y1="95" x2="65" y2="55" stroke="#fbbf24" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="3 2"/><circle cx="35" cy="95" r="3.2" fill="#3b82f6" stroke="#fff" stroke-width="0.8"/><circle cx="65" cy="55" r="3.2" fill="#3b82f6" stroke="#fff" stroke-width="0.8"/><circle cx="50" cy="115" r="3.2" fill="#dc2626" stroke="#fff" stroke-width="0.8"/><circle cx="35" cy="95" r="1.5" fill="#fff" stroke="#000" stroke-width="0.2" class="anim-ball" style="--bx:30px;--by:-40px;--bx2:38px;--by2:-45px"/>`},
            {name:'Baloncesto', svg:`<defs><linearGradient id="gradBsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e07a30"/><stop offset="100%" stop-color="#8b4414"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradBsk)"/><g fill="none" stroke="#fff" stroke-width="0.7"><rect x="3" y="3" width="94" height="134"/><line x1="3" y1="70" x2="97" y2="70"/><circle cx="50" cy="70" r="9"/><path d="M 3,3 Q 50,24 97,3"/><path d="M 3,137 Q 50,116 97,137"/><rect x="34" y="3" width="32" height="22"/><rect x="34" y="115" width="32" height="22"/><circle cx="50" cy="25" r="5"/><circle cx="50" cy="115" r="5"/></g><circle cx="50" cy="14" r="1.5" fill="#ff6b35"/><circle cx="50" cy="126" r="1.5" fill="#ff6b35"/><line class="anim-arrow" x1="32" y1="85" x2="55" y2="55" stroke="#fbbf24" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="3 2"/><circle cx="32" cy="85" r="3.2" fill="#dc2626" stroke="#fff" stroke-width="0.8"/><circle cx="55" cy="55" r="3.2" fill="#dc2626" stroke="#fff" stroke-width="0.8"/><circle cx="45" cy="100" r="3.2" fill="#1e3a8a" stroke="#fff" stroke-width="0.8"/><circle cx="32" cy="85" r="1.8" fill="#ff6b35" stroke="#7c2d12" stroke-width="0.3" class="anim-ball" style="--bx:23px;--by:-30px;--bx2:33px;--by2:-45px"/>`},
            {name:'Voleibol', svg:`<defs><linearGradient id="gradVly" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0891b2"/><stop offset="100%" stop-color="#0c4a6e"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradVly)"/><g fill="none" stroke="#fff" stroke-width="0.7"><rect x="3" y="3" width="94" height="134"/><line x1="3" y1="70" x2="97" y2="70" stroke-width="1.5"/><line x1="3" y1="44" x2="97" y2="44" stroke-dasharray="3 2"/><line x1="3" y1="96" x2="97" y2="96" stroke-dasharray="3 2"/></g><rect x="3" y="68" width="94" height="4" fill="#fff" opacity="0.3"/><line x1="3" y1="68" x2="97" y2="68" stroke="#fff" stroke-width="0.3"/><line x1="3" y1="72" x2="97" y2="72" stroke="#fff" stroke-width="0.3"/><circle cx="30" cy="22" r="3" fill="#fbbf24" stroke="#000" stroke-width="0.3"/><circle cx="50" cy="22" r="3" fill="#fbbf24" stroke="#000" stroke-width="0.3"/><circle cx="70" cy="22" r="3" fill="#fbbf24" stroke="#000" stroke-width="0.3"/><circle cx="30" cy="118" r="3" fill="#dc2626" stroke="#000" stroke-width="0.3"/><circle cx="50" cy="118" r="3" fill="#dc2626" stroke="#000" stroke-width="0.3"/><circle cx="70" cy="118" r="3" fill="#dc2626" stroke="#000" stroke-width="0.3"/><circle cx="50" cy="35" r="2.5" fill="#fff" stroke="#fbbf24" stroke-width="0.5" class="anim-ball" style="--bx:0px;--by:55px;--bx2:0px;--by2:60px"/>`},
            {name:'Tejo', svg:`<defs><linearGradient id="gradTej" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c99568"/><stop offset="100%" stop-color="#7a5635"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradTej)"/><rect x="25" y="3" width="50" height="134" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.8"/><rect x="37" y="10" width="26" height="26" fill="#1e3a8a" stroke="#fff" stroke-width="0.8"/><line x1="37" y1="36" x2="63" y2="10" stroke="#dc2626" stroke-width="0.8" opacity="0.75"/><line x1="37" y1="10" x2="63" y2="36" stroke="#dc2626" stroke-width="0.8" opacity="0.75"/><circle cx="50" cy="23" r="3.5" fill="#2d1508" stroke="#d4a017" stroke-width="0.8"/><line class="anim-arrow" x1="50" y1="110" x2="50" y2="30" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="2 2"/><circle cx="42" cy="70" r="3.5" fill="#94a3b8" stroke="#0f172a" stroke-width="0.6"/><circle cx="58" cy="85" r="3.5" fill="#dc2626" stroke="#0f172a" stroke-width="0.6"/><circle cx="50" cy="110" r="4" fill="#94a3b8" stroke="#0f172a" stroke-width="0.8" class="anim-ball" style="--bx:0px;--by:-80px;--bx2:0px;--by2:-87px"/><line x1="25" y1="125" x2="75" y2="125" stroke="#fff" stroke-width="0.8" stroke-dasharray="3 2"/>`},
            {name:'Bolirana', svg:`<defs><linearGradient id="gradBol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#064e2b"/><stop offset="100%" stop-color="#022017"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradBol)"/><rect x="28" y="8" width="44" height="124" fill="#166534" stroke="#0f4023" stroke-width="0.8" rx="2"/><rect x="32" y="14" width="36" height="26" fill="#0a0f19" stroke="#fbbf24" stroke-width="0.6"/><ellipse cx="50" cy="26" rx="8" ry="5" fill="#dc2626"/><ellipse cx="48" cy="22" rx="6" ry="3" fill="#b91c1c"/><circle cx="46" cy="20" r="0.9" fill="#fca5a5"/><circle cx="52" cy="20" r="0.9" fill="#fca5a5"/><g><circle cx="40" cy="50" r="2.3" fill="#0a0a0a" stroke="#b8860b" stroke-width="0.35"/><circle cx="50" cy="50" r="2.3" fill="#0a0a0a" stroke="#b8860b" stroke-width="0.35"/><circle cx="60" cy="50" r="2.3" fill="#0a0a0a" stroke="#b8860b" stroke-width="0.35"/><circle cx="40" cy="65" r="2.3" fill="#0a0a0a" stroke="#b8860b" stroke-width="0.35"/><circle cx="60" cy="65" r="2.3" fill="#0a0a0a" stroke="#b8860b" stroke-width="0.35"/><circle cx="40" cy="80" r="2.3" fill="#0a0a0a" stroke="#b8860b" stroke-width="0.35"/><circle cx="50" cy="80" r="2.3" fill="#0a0a0a" stroke="#b8860b" stroke-width="0.35"/><circle cx="60" cy="80" r="2.3" fill="#0a0a0a" stroke="#b8860b" stroke-width="0.35"/></g><circle cx="50" cy="65" r="3.2" fill="#d4a017" stroke="#78350f" stroke-width="0.5"/><text x="50" y="66.5" text-anchor="middle" font-size="2.2" fill="#0a0a0a" font-weight="900" font-family="Arial">SAPO</text><circle cx="50" cy="115" r="2.6" fill="#94a3b8" stroke="#0f172a" stroke-width="0.5" class="anim-ball" style="--bx:0px;--by:-50px;--bx2:0px;--by2:-55px"/>`},
            {name:'Rana', svg:`<defs><linearGradient id="gradRna" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#166534"/><stop offset="100%" stop-color="#052e16"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradRna)"/><rect x="30" y="42" width="40" height="50" fill="#0a0f19" stroke="#d4a017" stroke-width="1"/><ellipse cx="50" cy="65" rx="11" ry="9" fill="#b91c1c" stroke="#fff" stroke-width="0.6"/><circle cx="45" cy="60" r="2" fill="#fff"/><circle cx="55" cy="60" r="2" fill="#fff"/><circle cx="45" cy="60.5" r="0.9" fill="#000"/><circle cx="55" cy="60.5" r="0.9" fill="#000"/><ellipse cx="50" cy="70" rx="4" ry="2.5" fill="#1a0505"/><circle cx="35" cy="105" r="3.2" fill="#94a3b8" stroke="#0f172a" stroke-width="0.5" class="anim-pulse"/><circle cx="58" cy="115" r="3.2" fill="#94a3b8" stroke="#0f172a" stroke-width="0.5" class="anim-pulse"/><line class="anim-arrow" x1="50" y1="120" x2="50" y2="75" stroke="#fbbf24" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="2 2"/><circle cx="50" cy="120" r="3.8" fill="#c0c0c0" stroke="#0f172a" stroke-width="0.6" class="anim-ball" style="--bx:0px;--by:-50px;--bx2:0px;--by2:-55px"/>`},
            {name:'Tenis', svg:`<defs><linearGradient id="gradTns" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#014230"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradTns)"/><g fill="none" stroke="#fff" stroke-width="0.7"><rect x="10" y="10" width="80" height="120"/><line x1="10" y1="70" x2="90" y2="70" stroke-width="1.3"/><line x1="20" y1="35" x2="80" y2="35"/><line x1="20" y1="105" x2="80" y2="105"/><line x1="50" y1="35" x2="50" y2="105" stroke-dasharray="2 2"/><line x1="20" y1="10" x2="20" y2="130"/><line x1="80" y1="10" x2="80" y2="130"/></g><line class="anim-arrow" x1="35" y1="50" x2="65" y2="90" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="2 2"/><circle cx="35" cy="50" r="3.2" fill="#fbbf24"/><circle cx="65" cy="90" r="3.2" fill="#fbbf24"/><circle cx="50" cy="20" r="2.3" fill="#e4ff66" stroke="#000" stroke-width="0.3" class="anim-ball" style="--bx:-15px;--by:30px;--bx2:0px;--by2:60px"/>`},
            {name:'Petanca', svg:`<defs><linearGradient id="gradPet" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a16207"/><stop offset="100%" stop-color="#451a03"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradPet)"/><rect x="5" y="5" width="90" height="130" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.4"/><circle cx="50" cy="70" r="2" fill="#fbbf24" stroke="#000" stroke-width="0.4" class="anim-pulse"/><circle cx="38" cy="55" r="4" fill="#b91c1c" stroke="#000" stroke-width="0.5"/><circle cx="38" cy="54" r="1.3" fill="#ef4444" opacity="0.6"/><circle cx="62" cy="58" r="4" fill="#b91c1c" stroke="#000" stroke-width="0.5"/><circle cx="62" cy="57" r="1.3" fill="#ef4444" opacity="0.6"/><circle cx="42" cy="82" r="4" fill="#1e40af" stroke="#000" stroke-width="0.5"/><circle cx="42" cy="81" r="1.3" fill="#3b82f6" opacity="0.6"/><circle cx="58" cy="85" r="4" fill="#1e40af" stroke="#000" stroke-width="0.5"/><circle cx="58" cy="84" r="1.3" fill="#3b82f6" opacity="0.6"/><circle cx="48" cy="105" r="4" fill="#1e40af" stroke="#000" stroke-width="0.5"/><line class="anim-arrow" x1="48" y1="105" x2="50" y2="70" stroke="#fbbf24" stroke-width="1" stroke-dasharray="2 2"/>`},
            {name:'Rugby', svg:`<defs><linearGradient id="gradRgb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#16a34a"/><stop offset="100%" stop-color="#14532d"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradRgb)"/><g fill="none" stroke="#fff" stroke-width="0.7"><rect x="3" y="3" width="94" height="134"/><line x1="3" y1="22" x2="97" y2="22"/><line x1="3" y1="118" x2="97" y2="118"/><line x1="3" y1="70" x2="97" y2="70" stroke-dasharray="3 2"/><line x1="3" y1="35" x2="97" y2="35" stroke-dasharray="1 2"/><line x1="3" y1="105" x2="97" y2="105" stroke-dasharray="1 2"/></g><ellipse cx="50" cy="70" rx="4.5" ry="7" fill="#78350f" stroke="#fff" stroke-width="0.6" transform="rotate(15 50 70)"/><line class="anim-arrow" x1="30" y1="55" x2="70" y2="85" stroke="#fbbf24" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="3 2"/><circle cx="30" cy="55" r="3.2" fill="#dc2626" stroke="#fff" stroke-width="0.6"/><circle cx="70" cy="85" r="3.2" fill="#2563eb" stroke="#fff" stroke-width="0.6"/>`},
            {name:'Hockey', svg:`<defs><linearGradient id="gradHck" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2563eb"/><stop offset="100%" stop-color="#172554"/></linearGradient></defs><rect width="100" height="140" fill="url(#gradHck)"/><g fill="none" stroke="#fff" stroke-width="0.7"><rect x="3" y="3" width="94" height="134"/><line x1="3" y1="70" x2="97" y2="70"/><circle cx="50" cy="70" r="7"/><rect x="30" y="3" width="40" height="12"/><rect x="30" y="125" width="40" height="12"/></g><circle cx="50" cy="70" r="0.8" fill="#fff"/><circle cx="42" cy="55" r="3.2" fill="#dc2626" stroke="#fff" stroke-width="0.6"/><path d="M 40,53 L 36,45" stroke="#0f172a" stroke-width="1.4" stroke-linecap="round"/><circle cx="62" cy="90" r="3.2" fill="#f59e0b" stroke="#fff" stroke-width="0.6"/><path d="M 60,88 L 64,80" stroke="#0f172a" stroke-width="1.4" stroke-linecap="round"/><line class="anim-arrow" x1="42" y1="55" x2="62" y2="85" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="2 2"/><circle cx="42" cy="55" r="1.4" fill="#0a0a0a" class="anim-ball" style="--bx:20px;--by:30px;--bx2:20px;--by2:32px"/>`},
          ].map((sport, i) => (
            <a key={i} href="/tactical-board.html" className="sport-card group relative rounded-2xl overflow-hidden border border-slate-800 hover:border-[#CCFF00]/60 transition-all hover:scale-[1.04] hover:shadow-[0_14px_32px_-6px_rgba(204,255,0,0.28)]" data-testid={`sport-card-${sport.name.toLowerCase()}`}>
              <div className="aspect-[3/4] relative">
                <svg viewBox="0 0 100 140" className="w-full h-full block" preserveAspectRatio="xMidYMid slice" dangerouslySetInnerHTML={{__html: sport.svg}} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/15 pointer-events-none"/>
                <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/55 backdrop-blur-sm border border-[#CCFF00]/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse"/>
                  <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#CCFF00]" style={{fontFamily:BC}}>LIVE</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                  <span className="text-[13px] font-black text-white uppercase tracking-[0.06em]" style={{fontFamily:BC}}>{sport.name}</span>
                  <ArrowRight className="w-4 h-4 text-[#CCFF00] transition-transform group-hover:translate-x-0.5"/>
                </div>
              </div>
            </a>
          ))}
        </div>
        <div className="text-center mt-10">
          <button onClick={() => {const el = document.getElementById('more-sports-carousel'); el.style.display = el.style.display === 'block' ? 'none' : 'block'; if (el.style.display === 'block') el.scrollIntoView({behavior:'smooth', block:'center'});}} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-[#CCFF00]/60 transition-all font-bold text-[13px]" style={{fontFamily:BC}} data-testid="more-sports-btn">
            <span className="w-6 h-6 rounded-full bg-[#CCFF00] text-slate-900 flex items-center justify-center text-[14px] font-black">+</span>
            {t('landing.multisport.see_more')}
          </button>
          <div id="more-sports-carousel" style={{display:'none'}} className="mt-6">
            <div className="relative overflow-x-auto pb-4 snap-x snap-mandatory" style={{scrollbarWidth:'thin'}} data-testid="more-sports-scroll">
              <div className="flex gap-3 px-4" style={{width:'max-content'}}>
                {[
                  {name:'Futsal', c:'#9333ea'},{name:'Minitejo', c:'#a57856'},{name:'Padel', c:'#059669'},
                  {name:'Bochas', c:'#16a34a'},{name:'Badminton', c:'#f59e0b'},{name:'Squash', c:'#0ea5e9'},
                  {name:'Golf', c:'#65a30d'},{name:'Tiro con Arco', c:'#dc2626'},{name:'Dardos', c:'#7c3aed'},
                  {name:'Boliche', c:'#ea580c'},{name:'Bolo Criollo', c:'#78350f'},{name:'Handball', c:'#2563eb'},
                  {name:'Beisbol', c:'#991b1b'},{name:'Escalada', c:'#0891b2'},{name:'Atletismo', c:'#e11d48'},
                  {name:'Ciclismo', c:'#fbbf24'},{name:'Natacion', c:'#06b6d4'},{name:'Boxeo', c:'#be185d'},
                  {name:'Karate', c:'#78716c'},{name:'Taekwondo', c:'#b91c1c'},{name:'MMA', c:'#1f2937'},{name:'Judo', c:'#450a0a'}
                ].map((sp, i) => (
                  <a key={i} href="/tactical-board.html" className="group relative flex-shrink-0 w-[150px] snap-start rounded-xl overflow-hidden border border-slate-800 hover:border-[#CCFF00]/60 hover:scale-[1.05] transition-all" data-testid={`extra-sport-${sp.name.toLowerCase().replace(/\s+/g,'-')}`}>
                    <div className="aspect-[3/4] relative flex flex-col items-center justify-center p-3" style={{background:`linear-gradient(135deg, ${sp.c} 0%, ${sp.c}88 50%, #0a0f19 100%)`}}>
                      <div className="absolute inset-0" style={{backgroundImage:'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.12) 0%, transparent 55%)'}}/>
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur border border-[#CCFF00]/25">
                        <span className="text-[7.5px] font-black tracking-[0.1em] text-[#CCFF00]" style={{fontFamily:BC}}>3D</span>
                      </div>
                      <div className="relative z-10 text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center backdrop-blur-sm">
                          <span className="text-[18px] font-black text-white" style={{fontFamily:BC}}>{sp.name[0]}</span>
                        </div>
                        <div className="text-[11px] font-black uppercase tracking-[0.05em] text-white leading-tight" style={{fontFamily:BC}}>{sp.name}</div>
                      </div>
                      <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-[#CCFF00]/80"/>
                        <span className="w-1 h-1 rounded-full bg-[#CCFF00]/60"/>
                        <span className="w-1 h-1 rounded-full bg-[#CCFF00]/40"/>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="text-center mt-5 text-[12px] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                {t('landing.multisport.swipe_hint')}
              </span>
            </div>
          </div>
          <div className="mt-6">
            <a href="/tactical-board.html">
              <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-11 px-7 text-[13px] font-bold rounded-xl" style={{fontFamily:BC}} data-testid="explore-all-sports-btn">
                {t('landing.multisport.explore_board')} <ArrowRight className="w-4 h-4 ml-2"/>
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* FEATURES — Dark cards */}
    <section id="features" className="py-20 px-6 bg-slate-950 relative overflow-hidden">
      <div className="max-w-[1120px] mx-auto relative z-10">
        <Reveal direction="up" className="text-center mb-14">
          <SectionTag>{t('landing.features.tag')}</SectionTag>
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
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400" style={{fontFamily:BC}}>{t('landing.marquee.m_central')}</span>
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
            <SectionTag center={false}>{t('dashboard.controlPanel.title')}</SectionTag>
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
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700/30 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /></div>
                  <span className="text-[12px] text-slate-400 ml-2 font-mono">LordTraining {t('landing.chart.dashboard')} v3.0</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-400"/>{t('landing.chart.volume')}</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#CCFF00]"><span className="w-2 h-2 rounded-full bg-[#CCFF00]"/>{t('landing.chart.intensity')}</span>
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-400"/>{t('landing.chart.density')}</span>
                </div>
              </div>
              {/* Interactive mini chart */}
              <ShowcaseChart t={t} />
              {/* Bottom area chart */}
              <div className="h-20 relative mt-4">
                <div className="absolute inset-0"><AnimatedLineWave color="#3B82F6" amplitude={25} speed="6s" /></div>
                <div className="absolute inset-0"><AnimatedLineWave color="#CCFF00" amplitude={20} speed="8s" /></div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 z-20">
              <div className="bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/30 shadow-xl">
                <ReadinessGauge size={72} t={t} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>

    {/* AUDIENCES — Impact + Segments + Trust */}
    <section id="audiences" className="py-20 px-6 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(204,255,0,0.03)_0%,transparent_60%)]" />
      <div className="max-w-[1120px] mx-auto relative z-10">
        {/* Impact intro */}
        <Reveal direction="up" className="mb-16">
          <div className="max-w-[720px] mx-auto text-center">
            <SectionTag>{t('landing.audiences.tag')}</SectionTag>
            <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.15] mb-5" style={{fontFamily:INT}} data-testid="audiences-title">{t('landing.audiences.title')}</h2>
            <p className="text-[15px] text-slate-400 leading-[1.8]" data-testid="audiences-impact">{t('landing.audiences.impact')}</p>
          </div>
        </Reveal>

        {/* 4 Segment cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12" data-testid="audiences-grid">
          {[
            { key:'coaches', icon: UserCheck, color:'#CCFF00', bg:'bg-[#CCFF00]/10', border:'border-[#CCFF00]/20', iconBg:'bg-[#CCFF00]', iconText:'text-slate-900' },
            { key:'clubs', icon: Building2, color:'#3B82F6', bg:'bg-blue-500/10', border:'border-blue-500/20', iconBg:'bg-blue-500', iconText:'text-white' },
            { key:'schools', icon: GraduationCap, color:'#8B5CF6', bg:'bg-purple-500/10', border:'border-purple-500/20', iconBg:'bg-purple-500', iconText:'text-white' },
            { key:'federations', icon: Globe, color:'#F43F5E', bg:'bg-rose-500/10', border:'border-rose-500/20', iconBg:'bg-rose-500', iconText:'text-white' },
          ].map((seg, idx) => {
            const Icon = seg.icon;
            return (
              <Reveal key={seg.key} delay={idx * 0.12} direction="up">
                <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-7 h-full group hover:border-opacity-60 transition-all duration-300`} style={{'--seg-color': seg.color}} data-testid={`audience-${seg.key}`}>
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`w-11 h-11 ${seg.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 ${seg.iconText}`} />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-bold text-white leading-tight" style={{fontFamily:INT}}>{t(`landing.audiences.${seg.key}_title`)}</h3>
                      <p className="text-[13px] mt-0.5" style={{color: seg.color}}>{t(`landing.audiences.${seg.key}_sub`)}</p>
                    </div>
                  </div>
                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {[1,2,3].map(n => (
                      <li key={n} className="flex items-start gap-2.5 text-[13px] text-slate-400 leading-snug">
                        <Check className="w-4 h-4 flex-shrink-0 mt-[1px]" style={{color: seg.color}} />
                        {t(`landing.audiences.${seg.key}_f${n}`)}
                      </li>
                    ))}
                  </ul>
                  {/* CTA */}
                  <Link to="/auth">
                    <Button
                      className="w-full rounded-xl h-10 text-[12px] font-bold transition-all duration-200 border"
                      style={{
                        background: `${seg.color}10`,
                        borderColor: `${seg.color}30`,
                        color: seg.color,
                        fontFamily: BC
                      }}
                      data-testid={`audience-cta-${seg.key}`}
                    >
                      {t(`landing.audiences.${seg.key}_cta`)} <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Trust badge */}
        <Reveal delay={0.5} direction="up">
          <div className="flex items-center justify-center gap-3 py-5 px-6 bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-2xl max-w-[640px] mx-auto" data-testid="trust-badge">
            <Shield className="w-5 h-5 text-[#CCFF00] flex-shrink-0" />
            <p className="text-[14px] font-bold text-slate-300 text-center" style={{fontFamily:BC}}>
              {t('landing.audiences.trustLine')}
            </p>
          </div>
        </Reveal>
      </div>
    </section>

    {/* HOW IT WORKS — 6-phase timeline */}
    <section id="how-it-works" className="py-24 px-6 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(204,255,0,0.03)_0%,transparent_50%)]" />
      <div className="max-w-[1120px] mx-auto relative z-10">
        <Reveal direction="up" className="text-center mb-6">
          <SectionTag>{t('landing.howItWorks.tag')}</SectionTag>
          <h2 className="text-[28px] md:text-[36px] font-bold text-white leading-[1.15] mb-3" style={{fontFamily:INT}}>{t('landing.howItWorks.title')}</h2>
          <p className="text-[15px] text-slate-400 max-w-[600px] mx-auto leading-[1.7]">{t('landing.howItWorks.subtitle')}</p>
        </Reveal>

        {/* Timeline */}
        <div className="relative mt-16">
          {/* Vertical line - desktop only */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#CCFF00]/40 via-slate-700/40 to-slate-700/10 -translate-x-1/2" />

          {[
            { n:'01', icon: Target, color:'#CCFF00', key:'step1' },
            { n:'02', icon: Calendar, color:'#3B82F6', key:'step2' },
            { n:'03', icon: Layers, color:'#8B5CF6', key:'step3' },
            { n:'04', icon: Users, color:'#F59E0B', key:'step4' },
            { n:'05', icon: Activity, color:'#10B981', key:'step5' },
            { n:'06', icon: BarChart3, color:'#F43F5E', key:'step6' },
          ].map((step, idx) => {
            const Icon = step.icon;
            const isLeft = idx % 2 === 0;
            return (
              <Reveal key={step.n} delay={idx * 0.1} direction={isLeft ? 'left' : 'right'}>
                <div className={`relative flex items-center mb-8 last:mb-0 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} flex-col md:gap-0 gap-4`} data-testid={`step-${step.n}`}>
                  {/* Content card */}
                  <div className={`w-full md:w-[calc(50%-40px)] ${isLeft ? 'md:pr-0' : 'md:pl-0'}`}>
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 group hover:border-slate-700 transition-all duration-300 relative overflow-hidden">
                      {/* Step number watermark */}
                      <span className="absolute -top-4 -right-2 text-[110px] font-black leading-none text-slate-800/40 select-none pointer-events-none" style={{fontFamily:BC}}>{step.n}</span>
                      {/* Tag */}
                      <span className="inline-block px-2.5 py-1 rounded-md text-[9px] font-bold tracking-[0.12em] mb-4" style={{background:`${step.color}15`, color:step.color, fontFamily:BC}}>
                        {t(`landing.howItWorks.${step.key}_tag`)}
                      </span>
                      <h3 className="text-[18px] font-bold text-white mb-2 leading-tight relative z-10" style={{fontFamily:INT}}>
                        {t(`landing.howItWorks.${step.key}_title`)}
                      </h3>
                      <p className="text-[14px] text-slate-400 leading-[1.7] relative z-10">
                        {t(`landing.howItWorks.${step.key}_desc`)}
                      </p>
                    </div>
                  </div>

                  {/* Center node — desktop */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-[48px] h-[48px] rounded-full items-center justify-center z-10 border-[3px] group-hover:scale-110 transition-transform" style={{background:'#0f172a', borderColor: step.color}}>
                    <Icon className="w-5 h-5" style={{color: step.color}} />
                  </div>

                  {/* Mobile icon — shown only on mobile */}
                  <div className="md:hidden w-11 h-11 rounded-full flex items-center justify-center border-2 order-first" style={{background:`${step.color}15`, borderColor: step.color}}>
                    <Icon className="w-5 h-5" style={{color: step.color}} />
                  </div>

                  {/* Empty space other side */}
                  <div className="hidden md:block w-[calc(50%-40px)]" />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>

    {/* SOCIAL PROOF — Testimonials Carousel */}
    <TestimonialsCarousel t={t} />

    {/* PRICING — Premium Cards */}
    <section id="pricing" className="py-24 px-6 relative overflow-hidden" style={{background:'#070a10'}}>
      {/* Subtle grid texture */}
      <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize:'24px 24px'}} />

      <div className="max-w-[1120px] mx-auto relative z-10">
        {/* Header */}
        <Reveal direction="up" className="text-center mb-10">
          <SectionTag>{t('landing.pricing.tag')}</SectionTag>
          <h2 className="text-[36px] md:text-[48px] font-extrabold text-white leading-[1.05] tracking-[-1px] mb-4" style={{fontFamily:INT}}>{t('landing.pricing.title')}</h2>
          <p className="text-[15px] text-white/30 max-w-[440px] mx-auto">{t('landing.pricing.subtitle')}</p>
        </Reveal>

        {/* Billing toggle */}
        <Reveal direction="up" delay={0.1} className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-white/10" style={{background:'rgba(255,255,255,0.02)', backdropFilter:'blur(12px)'}} data-testid="billing-toggle">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative px-5 py-2 rounded-full text-[12px] font-bold transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/50 hover:text-white/80'}`}
              style={{fontFamily:BC, letterSpacing:'0.04em'}}
              data-testid="billing-monthly-btn"
            >
              MENSUAL
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`relative px-5 py-2 rounded-full text-[12px] font-bold transition-all duration-300 flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-[#c8f700] text-slate-900 shadow-lg shadow-[#c8f700]/20' : 'text-white/50 hover:text-white/80'}`}
              style={{fontFamily:BC, letterSpacing:'0.04em'}}
              data-testid="billing-annual-btn"
            >
              ANUAL
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${billingCycle === 'annual' ? 'bg-slate-900 text-[#c8f700]' : 'bg-[#c8f700]/20 text-[#c8f700]'}`}>
                −20%
              </span>
            </button>
          </div>
        </Reveal>

        {/* 4 Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key:'starter', price:'9.99', num:'01', color:'#64748b', pop:false, fcount:6 },
            { key:'pro', price:'19.99', num:'02', color:'#378ADD', pop:false, fcount:7 },
            { key:'club', price:'49.99', num:'03', color:'#c8f700', pop:true, fcount:8 },
            { key:'inst', price:'149.99', num:'04', color:'#EF9F27', pop:false, fcount:9 },
          ].map((plan, idx) => {
            const features = Array.from({length: plan.fcount}, (_, j) => t(`landing.pricing.${plan.key}_f${j+1}`));
            const monthlyPrice = parseFloat(plan.price);
            const annualMonthly = (monthlyPrice * 0.8).toFixed(2);
            const annualTotal = (monthlyPrice * 0.8 * 12).toFixed(2);
            const isAnnual = billingCycle === 'annual';
            const displayPrice = isAnnual ? annualMonthly : plan.price;
            return (
            <Reveal key={plan.key} delay={idx * 0.08} direction="up">
            <div className={`relative rounded-2xl h-full flex flex-col overflow-hidden transition-all duration-300 group ${plan.pop ? 'ring-1 scale-[1.02] z-10' : 'hover:scale-[1.01]'}`}
              style={{
                background: plan.pop ? 'linear-gradient(180deg, rgba(200,247,0,0.06) 0%, rgba(200,247,0,0.01) 100%)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${plan.pop ? 'rgba(200,247,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
                ringColor: plan.pop ? 'rgba(200,247,0,0.15)' : undefined,
                boxShadow: plan.pop ? '0 0 60px rgba(200,247,0,0.04)' : 'none'
              }} data-testid={`pricing-card-${plan.key}`}>

              {/* Color accent line */}
              <div className="h-1" style={{background: plan.color}} />

              {/* Popular badge */}
              {plan.pop && (
                <div className="absolute top-4 right-4 z-20">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold" style={{background:plan.color, color:'#070a10', fontFamily:BC}}>
                    {t('landing.pricing.mostPopular')}
                  </span>
                </div>
              )}

              <div className="px-6 pt-6 pb-6 flex-1 flex flex-col">
                {/* Number + name */}
                <div className="mb-6">
                  <span className="text-[64px] font-black leading-none block" style={{fontFamily:BC, color:'rgba(255,255,255,0.03)'}}>{plan.num}</span>
                  <div className="-mt-8 relative z-10">
                    <h3 className="text-[16px] font-semibold text-white/90">{t(`landing.pricing.${plan.key}_name`)}</h3>
                    <p className="text-[11px] text-white/25 mt-0.5">{t(`landing.pricing.${plan.key}_desc`)}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6 min-h-[78px]">
                  <div className="flex items-baseline gap-1 transition-all duration-300" key={billingCycle}>
                    <span className="text-[42px] font-black leading-none" style={{fontFamily:BC, color: plan.pop ? plan.color : '#fff'}} data-testid={`price-${plan.key}`}>${displayPrice}</span>
                    <span className="text-[12px] text-white/25">{t('landing.pricing.perMonth')}</span>
                  </div>
                  {isAnnual ? (
                    <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                      <span className="line-through text-white/20">${plan.price}/mes</span>
                      <span className="text-[#c8f700]/80 font-semibold">${annualTotal}/año</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-white/25 mt-1.5">
                      Anual: ahorra ${(monthlyPrice * 12 * 0.2).toFixed(2)}/año
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px mb-5" style={{background:`linear-gradient(to right, ${plan.color}20, transparent)`}} />

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((f,j) => (
                    <li key={j} className="flex items-start gap-2.5 text-[12px] text-white/40 leading-snug">
                      <Check className="w-3.5 h-3.5 flex-shrink-0 mt-[1px]" style={{color: plan.color}} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button onClick={() => handlePlanCheckout(plan.key)} className="w-full rounded-xl h-11 text-[12px] font-bold transition-all duration-200" style={{
                  background: plan.pop ? plan.color : 'transparent',
                  border: `1px solid ${plan.pop ? plan.color : `${plan.color}30`}`,
                  color: plan.pop ? '#070a10' : plan.color,
                  fontFamily: BC
                }} data-testid={`pricing-cta-${plan.key}`}>
                  {t(`landing.pricing.${plan.key}_cta`)}
                </Button>
              </div>
            </div>
            </Reveal>
            );
          })}
        </div>

        {/* Guarantee strip */}
        <Reveal direction="up" delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 mt-12 py-5 px-6 rounded-xl" style={{background:'rgba(200,247,0,0.02)', border:'0.5px solid rgba(200,247,0,0.06)'}}>
            {[
              { icon: Shield, text: t('landing.hero.free_trial') },
              { icon: Check, text: t('landing.hero.no_card') },
              { icon: ArrowRight, text: t('landing.hero.cancel_anytime') },
            ].map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <g.icon className="w-4 h-4 text-[#c8f700]/40" />
                <span className="text-[12px] text-white/25">{g.text}</span>
              </div>
            ))}
          </div>
        </Reveal>
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
    <footer className="bg-slate-950 border-t border-slate-800/40 py-14 px-6">
      <div className="max-w-[1120px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4" data-testid="footer-brand-logo">
              <img src="/brand/lordtraining-scale.png" alt="" className="h-12 w-12 object-contain" style={{filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.45))'}} />
              <span className="text-[18px] font-black text-white tracking-tight" style={{fontFamily:BC}}>Lord<span className="text-[#CCFF00]">Training</span></span>
            </div>
            <p className="text-[13px] text-slate-500 leading-[1.6]">{t('landing.hero.tagline')}</p>
          </div>
          {/* Nav links */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4" style={{fontFamily:BC}}>Producto</h4>
            <ul className="space-y-2.5">
              {[['#features', t('landing.nav.features')],['#how-it-works', t('landing.nav.howItWorks')],['#pricing', t('landing.nav.pricing')]].map(([h,l]) => (
                <li key={h}><a href={h} className="text-[13px] text-slate-500 hover:text-[#CCFF00] transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          {/* Resources */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4" style={{fontFamily:BC}}>Recursos</h4>
            <ul className="space-y-2.5">
              {['Blog','API Docs','Soporte'].map(l => (
                <li key={l}><span className="text-[13px] text-slate-500 hover:text-[#CCFF00] transition-colors cursor-pointer">{l}</span></li>
              ))}
            </ul>
          </div>
          {/* Social */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4" style={{fontFamily:BC}}>Social</h4>
            <div className="flex gap-3">
              {[
                {l:'X',svg:'M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9ZM17.6 20.6h2L6.5 3.3H4.3l13.3 17.3Z'},
                {l:'LinkedIn',svg:'M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2ZM8 19H5v-9h3v9ZM6.5 8.25A1.75 1.75 0 118.25 6.5 1.75 1.75 0 016.5 8.25ZM20 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0014 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66V19Z'},
                {l:'Instagram',svg:'M12 2.2c2.7 0 3 0 4.1.06 1 .05 1.5.2 1.9.33a3.2 3.2 0 011.2.77c.34.34.6.72.77 1.2.14.37.29.9.33 1.88.05 1.08.06 1.4.06 4.1s0 3-.06 4.1c-.05 1-.2 1.5-.33 1.9a3.4 3.4 0 01-2 2c-.37.13-.9.28-1.88.32-1.08.05-1.4.06-4.1.06s-3 0-4.1-.06c-1-.04-1.5-.2-1.9-.33a3.4 3.4 0 01-2-2c-.13-.37-.28-.9-.32-1.88C2.22 15 2.2 14.7 2.2 12s0-3 .06-4.1c.04-1 .2-1.5.33-1.9a3.2 3.2 0 01.77-1.2 3.2 3.2 0 011.2-.76c.37-.14.9-.29 1.88-.33 1.08-.06 1.4-.06 4.1-.06ZM12 7a5 5 0 100 10 5 5 0 000-10Zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4Zm5.2-7.4a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4Z'}
              ].map(s => (
                <a key={s.l} href="#" className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center hover:border-[#CCFF00]/40 hover:bg-slate-800 transition-all group" aria-label={s.l}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-500 group-hover:fill-[#CCFF00] transition-colors"><path d={s.svg}/></svg>
                </a>
              ))}
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-800/40 flex items-center justify-between">
          <p className="text-[12px] text-slate-600">© 2026 LordTraining. {t('landing.footer.copyright')}</p>
          <div className="flex gap-4">
            <Link to="/terminos" className="text-[12px] text-slate-600 hover:text-amber-400 cursor-pointer transition-colors" data-testid="footer-link-terms">{t('legal.terms', 'Términos')}</Link>
            <Link to="/privacidad" className="text-[12px] text-slate-600 hover:text-amber-400 cursor-pointer transition-colors" data-testid="footer-link-privacy">{t('legal.privacy', 'Privacidad')}</Link>
            <Link to="/politicas" className="text-[12px] text-slate-600 hover:text-amber-400 cursor-pointer transition-colors" data-testid="footer-link-policies">{t('legal.policies', 'Políticas')}</Link>
          </div>
        </div>
      </div>
    </footer>
  </div>
  );
};

export default LandingPage;

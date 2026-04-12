import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LanguageSelector } from '../components/LanguageSelector';
import { Mail, Lock, User, Loader2, Eye, EyeOff, Shield, Users, Dumbbell, UserCheck, UserCircle, BarChart3, ArrowLeft, Activity, Timer, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';

const BC = "'Barlow Condensed', sans-serif";
const INT = "'Inter', sans-serif";

const ROLE_ICONS = { admin: Shield, coach: UserCheck, personal_trainer: Dumbbell, athlete: User, team: Users, user: UserCircle };

/* ═══ TYPEWRITER HOOK ═══ */
const useTypewriter = (phrases, typingSpeed = 60, deletingSpeed = 30, pauseTime = 2500) => {
  const [text, setText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;

  useEffect(() => {
    const current = phrasesRef.current[phraseIdx % phrasesRef.current.length];
    if (!current) return;
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(current.substring(0, text.length + 1));
        if (text.length === current.length) {
          setTimeout(() => setIsDeleting(true), pauseTime);
          return;
        }
      } else {
        setText(current.substring(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setPhraseIdx((phraseIdx + 1) % phrasesRef.current.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIdx, typingSpeed, deletingSpeed, pauseTime]);

  return text;
};

/* ═══ COUNT UP HOOK ═══ */
const useCountUp = (target, duration = 1200) => {
  const [val, setVal] = useState(0);
  const isFloat = String(target).includes('.');
  useEffect(() => {
    const start = performance.now();
    const num = parseFloat(target);
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(isFloat ? parseFloat((num * eased).toFixed(2)) : Math.round(num * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, isFloat]);
  return isFloat ? val.toFixed(2) : val;
};

/* ═══ SPORT FIELD DATA ═══ */
const SPORTS = [
  { name:'FÚTBOL', field:(
    <>
      <rect x="15" y="15" width="270" height="390" rx="2"/>
      <line x1="15" y1="210" x2="285" y2="210"/>
      <circle cx="150" cy="210" r="42"/>
      <circle cx="150" cy="210" r="2" fill="rgba(255,255,255,0.09)"/>
      <rect x="70" y="15" width="160" height="70"/>
      <rect x="105" y="15" width="90" height="30"/>
      <path d="M100 85 A32 32 0 0 0 200 85"/>
      <rect x="115" y="5" width="70" height="12" rx="1"/>
      <rect x="70" y="335" width="160" height="70"/>
      <rect x="105" y="375" width="90" height="30"/>
      <path d="M100 335 A32 32 0 0 1 200 335"/>
      <rect x="115" y="403" width="70" height="12" rx="1"/>
      <path d="M15 27 A12 12 0 0 0 27 15"/>
      <path d="M273 15 A12 12 0 0 0 285 27"/>
      <path d="M15 393 A12 12 0 0 1 27 405"/>
      <path d="M273 405 A12 12 0 0 1 285 393"/>
    </>),
    xs:[[30,15],[50,10],[70,15],[30,32],[70,32],[50,65],[30,76],[70,76],[50,90]],
    os:[[50,20],[35,42],[65,42],[40,58],[60,58]],
    arrows:['M90,340 C70,280 60,220 75,140','M210,340 C240,280 240,220 225,140','M200,185 C170,155 155,125 150,100'],
  },
  { name:'BALONCESTO', field:(
    <>
      <rect x="15" y="15" width="270" height="390" rx="2"/>
      <line x1="15" y1="210" x2="285" y2="210"/>
      <circle cx="150" cy="210" r="28"/>
      {/* Top hoop area */}
      <rect x="95" y="15" width="110" height="55"/>
      <circle cx="150" cy="70" r="8"/>
      <rect x="140" y="15" width="20" height="3"/>
      <path d="M70 15 A95 95 0 0 0 230 15"/>
      <path d="M95 70 A55 55 0 0 0 205 70"/>
      {/* Bottom hoop area */}
      <rect x="95" y="350" width="110" height="55"/>
      <circle cx="150" cy="350" r="8"/>
      <rect x="140" y="402" width="20" height="3"/>
      <path d="M70 405 A95 95 0 0 1 230 405"/>
      <path d="M95 350 A55 55 0 0 1 205 350"/>
    </>),
    xs:[[50,25],[30,38],[70,38],[25,55],[75,55]],
    os:[[50,75],[35,62],[65,62],[30,82],[70,82]],
    arrows:['M70,230 C100,200 130,180 150,140','M230,230 C200,200 170,180 150,140','M150,230 C150,200 150,170 150,140'],
  },
  { name:'VOLEIBOL', field:(
    <>
      <rect x="15" y="15" width="270" height="390" rx="2"/>
      <line x1="15" y1="210" x2="285" y2="210" strokeWidth="2.5"/>
      <line x1="12" y1="205" x2="12" y2="215"/>
      <line x1="288" y1="205" x2="288" y2="215"/>
      <line x1="15" y1="140" x2="285" y2="140" strokeDasharray="6 4"/>
      <line x1="15" y1="280" x2="285" y2="280" strokeDasharray="6 4"/>
    </>),
    xs:[[30,25],[50,25],[70,25],[30,38],[50,38],[70,38]],
    os:[[30,62],[50,62],[70,62],[30,75],[50,75],[70,75]],
    arrows:['M150,280 C150,250 170,230 150,145','M70,280 C80,250 100,230 120,145','M230,280 C220,250 200,230 180,145'],
  },
  { name:'BÉISBOL', field:(
    <>
      <line x1="150" y1="350" x2="30" y2="60"/>
      <line x1="150" y1="350" x2="270" y2="60"/>
      <path d="M30 60 A180 180 0 0 1 270 60"/>
      <rect x="145" y="345" width="10" height="10" rx="1"/>
      <rect x="230" y="205" width="8" height="8" rx="1" transform="rotate(45 234 209)"/>
      <rect x="145" y="65" width="8" height="8" rx="1" transform="rotate(45 149 69)"/>
      <rect x="60" y="205" width="8" height="8" rx="1" transform="rotate(45 64 209)"/>
      <circle cx="150" cy="250" r="6"/>
      <circle cx="150" cy="250" r="1.5" fill="rgba(255,255,255,0.09)"/>
      <path d="M80 350 A80 80 0 0 1 220 350"/>
    </>),
    xs:[[50,82],[78,50],[50,16],[22,50],[50,58],[22,25],[50,12],[78,25],[50,40]],
    os:[[50,72]],
    arrows:['M150,250 C170,200 180,150 150,75','M150,350 C200,300 240,250 235,210'],
  },
  { name:'ATLETISMO', field:(
    <>
      <ellipse cx="150" cy="210" rx="125" ry="180"/>
      <ellipse cx="150" cy="210" rx="108" ry="163"/>
      <ellipse cx="150" cy="210" rx="91" ry="146"/>
      <ellipse cx="150" cy="210" rx="74" ry="129"/>
      <ellipse cx="150" cy="210" rx="57" ry="112"/>
      <line x1="150" y1="28" x2="150" y2="392"/>
      {[0,1,2,3,4].map(i => <line key={i} x1={25+i*17} y1="30" x2={25+i*17} y2="45"/>)}
    </>),
    xs:[[25,50],[50,50],[75,50],[30,38],[70,38]],
    os:[],
    arrows:['M40,210 C50,180 60,150 75,120'],
  },
  { name:'TENIS', field:(
    <>
      <rect x="30" y="15" width="240" height="390" rx="2"/>
      <line x1="30" y1="210" x2="270" y2="210"/>
      <line x1="150" y1="80" x2="150" y2="340"/>
      <rect x="30" y="80" width="240" height="260"/>
      <line x1="30" y1="145" x2="270" y2="145"/>
      <line x1="30" y1="275" x2="270" y2="275"/>
    </>),
    xs:[[40,30],[60,30]],
    os:[[40,70],[60,70]],
    arrows:['M100,275 C120,250 140,230 160,145','M200,275 C180,250 160,230 140,145'],
  },
];

/* ═══ RIGHT PANEL — TACTICAL BOARD ═══ */
const AuthVisual = () => {
  const { t } = useTranslation();
  const typedText = useTypewriter([
    t('auth.visual.phrase1'),
    t('auth.visual.phrase2'),
    t('auth.visual.phrase3')
  ], 55, 25, 2800);
  const readiness = useCountUp(85, 1200);
  const acwr = useCountUp(0.87, 1000);
  const [sportIdx, setSportIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setSportIdx(prev => (prev + 1) % SPORTS.length);
        setVisible(true);
      }, 700);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const sport = SPORTS[sportIdx];

  return (
  <div className="relative h-full overflow-hidden" style={{background:'#08090e'}}>

    {/* Field container */}
    <div className="absolute overflow-hidden" style={{top:'12%',left:'8%',right:'8%',bottom:'14%',borderRadius:'4px'}}>
      {/* SVG field lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid meet"
        style={{opacity:visible?1:0,transition:'opacity 0.6s ease',stroke:'rgba(255,255,255,0.09)',fill:'none',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round'}}>
        {sport.field}
      </svg>

      {/* Sport name flash */}
      <div className="absolute top-3 left-4 pointer-events-none" style={{opacity:visible?0.2:0,transition:'opacity 0.3s ease'}}>
        <span className="text-[11px] font-bold tracking-[0.2em] text-white" style={{fontFamily:BC}}>{sport.name}</span>
      </div>

      {/* X markers */}
      {sport.xs.map(([x,y],i) => (
        <div key={`x${sportIdx}-${i}`} className="absolute pointer-events-none select-none" style={{left:`${x}%`,top:`${y}%`,transform:'translate(-50%,-50%)',color:'rgba(255,255,255,0.35)',fontSize:'14px',fontWeight:700,fontFamily:'Arial,sans-serif',lineHeight:1,opacity:visible?1:0,transition:'opacity 0.5s ease'}}>
          ✕
        </div>
      ))}
      {/* O markers */}
      {sport.os.map(([x,y],i) => (
        <div key={`o${sportIdx}-${i}`} className="absolute pointer-events-none" style={{left:`${x}%`,top:`${y}%`,transform:'translate(-50%,-50%)',width:14,height:14,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.35)',opacity:visible?1:0,transition:'opacity 0.5s ease'}}/>
      ))}

      {/* Tactical arrows */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid meet"
        style={{opacity:visible?1:0,transition:'opacity 0.6s ease'}}>
        <defs><marker id="tA" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round"/>
        </marker></defs>
        {sport.arrows.map((d,i) => (
          <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" markerEnd="url(#tA)"/>
        ))}
      </svg>

      {/* Sport dots indicator */}
      <div className="absolute bottom-3 left-4 flex gap-1.5 z-10">
        {SPORTS.map((_,i) => (
          <div key={i} className="w-[4px] h-[4px] rounded-full transition-colors duration-400" style={{background:i===sportIdx?'#c8f700':'rgba(255,255,255,0.15)'}}/>
        ))}
      </div>
    </div>

    {/* HUD — Session header */}
    <div className="absolute left-1/2 -translate-x-1/2" style={{top:'5%'}}>
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg whitespace-nowrap" style={{background:'rgba(8,9,14,0.85)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(12px)'}}>
        <div className="w-5 h-5 rounded-md bg-[#c8f700] flex items-center justify-center">
          <span className="text-[10px] font-black text-[#08090e]" style={{fontFamily:BC}}>i</span>
        </div>
        <span className="text-[12px] font-semibold text-white/80">{t('auth.visual.week')} · {t('auth.visual.phase')}</span>
        <span className="w-[5px] h-[5px] rounded-full bg-[#c8f700] ml-1" style={{animation:'livePulse 1.5s infinite'}}/>
        <span className="text-[10px] text-[#c8f700]/60">Live</span>
      </div>
    </div>

    {/* HUD — Readiness */}
    <div className="absolute" style={{top:'14%',left:'16px'}}>
      <div className="px-3 py-3 rounded-lg" style={{background:'rgba(8,9,14,0.85)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(12px)'}}>
        <span className="text-[8px] text-white/30 uppercase tracking-[0.12em] font-bold block mb-1.5">{t('auth.visual.readiness')}</span>
        <div className="flex items-center gap-2">
          <svg width="40" height="40" className="-rotate-90">
            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r="18" fill="none" stroke="#c8f700" strokeWidth="2.5"
              strokeDasharray={2*Math.PI*18} strokeDashoffset={2*Math.PI*18*0.15}
              strokeLinecap="round"/>
          </svg>
          <div>
            <span className="text-[28px] font-black text-[#c8f700] leading-none block" style={{fontFamily:BC}}>{readiness}</span>
            <span className="text-[9px] text-[#c8f700]/40 block">Optimal</span>
          </div>
        </div>
      </div>
    </div>

    {/* HUD — ACWR */}
    <div className="absolute" style={{top:'14%',right:'16px'}}>
      <div className="px-3 py-3 rounded-lg" style={{background:'rgba(8,9,14,0.85)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(12px)'}}>
        <span className="text-[8px] text-white/30 uppercase tracking-[0.12em] font-bold block mb-1">{t('auth.visual.acwr')}</span>
        <span className="text-[26px] font-black text-[#378ADD] leading-none block" style={{fontFamily:BC}}>{acwr}</span>
        <svg viewBox="0 0 80 20" className="w-16 h-4 mt-1.5">
          <path d="M0,16 L11,13 L22,14 L33,10 L44,11 L55,7 L66,8 L80,4" fill="none" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="text-[8px] text-[#378ADD]/40 mt-1 block">{t('auth.visual.optimal_zone')}</span>
      </div>
    </div>

    {/* HUD — Adherence */}
    <div className="absolute" style={{bottom:'22%',right:'16px'}}>
      <div className="px-3 py-2.5 rounded-lg" style={{background:'rgba(8,9,14,0.85)',border:'0.5px solid rgba(255,255,255,0.08)',backdropFilter:'blur(12px)'}}>
        <span className="text-[20px] font-black text-[#c8f700] leading-none block" style={{fontFamily:BC}}>94%</span>
        <span className="text-[8px] text-white/25 uppercase tracking-[0.1em] mt-0.5 block">{t('auth.visual.adherence')}</span>
      </div>
    </div>

    {/* Typewriter top */}
    <div className="absolute top-0 left-0 right-0 z-20 px-7 pt-6 pb-14 overflow-visible" style={{background:'linear-gradient(to bottom, rgba(8,9,14,0.95) 0%, rgba(8,9,14,0.6) 60%, transparent 100%)'}}>
      <div className="mb-1.5 overflow-visible">
        <h2 className="text-[19px] font-semibold text-white/85 whitespace-nowrap" style={{fontFamily:INT}}>
          {typedText}<span className="inline-block w-[1.5px] h-[17px] bg-[#c8f700] ml-0.5" style={{animation:'blink 0.53s step-end infinite'}}/>
        </h2>
      </div>
      <p className="text-[11px] text-white/25">{t('auth.visual.system_line')}</p>
    </div>

    {/* Bench bar */}
    <div className="absolute bottom-0 left-0 right-0 z-20 px-5 py-3 flex items-center justify-between" style={{background:'rgba(8,9,14,0.92)',borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>
      <div className="flex items-center gap-2">
        <div className="flex">
          {[{bg:'#1a3a1a',c:'#c8f700',b:'#c8f700',t:'JP'},{bg:'#1a2a3a',c:'#378ADD',b:'#378ADD',t:'MA'},{bg:'#1a1a3a',c:'#7F77DD',b:'#7F77DD',t:'LC'},{bg:'rgba(255,255,255,0.05)',c:'rgba(255,255,255,0.35)',b:'rgba(255,255,255,0.08)',t:'+21'}].map((a,i) => (
            <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold" style={{background:a.bg,color:a.c,border:`1.5px solid ${a.b}`,marginLeft:i>0?'-6px':'0',zIndex:4-i,position:'relative'}}>{a.t}</div>
          ))}
        </div>
        <span className="text-[10px] text-white/25">{t('auth.visual.optimal_zone')}</span>
      </div>
      <div className="flex items-center gap-4">
        {[{v:'17',l:t('landing.hero.stats.models')},{v:'6',l:t('landing.hero.stats.controls')},{v:'150+',l:t('landing.hero.stats.exercises')}].map((s,i) => (
          <div key={i} className="text-center" style={{borderLeft:i>0?'0.5px solid rgba(255,255,255,0.05)':'none',paddingLeft:i>0?'12px':'0'}}>
            <span className="text-[14px] font-black text-[#c8f700] leading-none block" style={{fontFamily:BC}}>{s.v}</span>
            <span className="text-[7px] text-white/15 mt-0.5 block">{s.l}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Chalk signature */}
    <div className="absolute z-10 pointer-events-none" style={{bottom:'52px',right:'20px',opacity:0.15,transform:'rotate(-2deg)'}}>
      <span className="text-[18px] text-white italic font-light">Los mejores no improvisan.</span>
    </div>

    <style>{`
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
    `}</style>
  </div>
  );
};

const AuthPage = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('coach');

  const USER_ROLES = [
    { id: 'admin', name: t('auth.register.roles.admin') },
    { id: 'coach', name: t('auth.register.roles.coach') },
    { id: 'personal_trainer', name: t('auth.register.roles.coach') },
    { id: 'athlete', name: t('auth.register.roles.athlete') },
    { id: 'team', name: t('auth.register.roles.coordinator') },
    { id: 'user', name: t('common.settings') },
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success(t('common.welcome') + '!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('auth.login.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(registerEmail, registerPassword, registerName, registerRole);
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "pl-10 h-11 border-slate-200 focus:border-[#007AFF] focus:ring-[#007AFF]/10 rounded-lg bg-white text-[14px]";

  return (
    <div className="min-h-screen flex auth-reset" style={{ fontFamily: INT }}>
      <style>{`.auth-reset h1,.auth-reset h2,.auth-reset h3,.auth-reset h4{font-family:inherit;font-weight:inherit;text-transform:none;letter-spacing:normal;}`}</style>

      {/* Left — Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 md:px-14 lg:px-16 bg-[#fafaf8]">
        <div className="max-w-[380px] w-full mx-auto">

          {/* Back + Logo + Language */}
          <div className="flex items-center justify-between mb-10">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 aspect-square shrink-0 bg-[#CCFF00] rounded-full flex items-center justify-center">
                <span className="text-[18px] font-black text-slate-900 leading-none" style={{ fontFamily: BC }}>i</span>
              </div>
              <span className="text-[16px] font-black tracking-tight text-slate-900" style={{ fontFamily: BC }}>
                iTRAIN
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSelector variant="light" compact />
              <Link to="/" className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                {t('common.back')}
              </Link>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-[24px] font-bold text-slate-900 mb-1" style={{ fontFamily: INT }} data-testid="auth-title">
            {t('common.welcome')} {t('common.appName')}
          </h1>
          <p className="text-[14px] text-slate-500 mb-1" data-testid="auth-subtitle">
            {t('common.tagline')}
          </p>
          <p className="text-[12px] text-slate-400 mb-7">
            14 days free · <span className="text-[#007AFF]">{t('landing.nav.pricing')}</span>
          </p>

          {/* Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-lg h-10">
              <TabsTrigger
                value="login"
                className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                data-testid="login-tab"
              >
                {t('auth.login.submit')}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                data-testid="register-tab"
              >
                {t('auth.register.submit')}
              </TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-[13px] text-slate-600 font-medium">{t('auth.login.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className={inputClass}
                      data-testid="login-email-input"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-[13px] text-slate-600 font-medium">{t('auth.login.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className={`${inputClass} pr-10`}
                      data-testid="login-password-input"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <button type="button" className="text-[12px] text-slate-400 hover:text-[#007AFF] transition-colors">
                    {t('auth.login.forgotPassword')}
                  </button>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#c8f700] hover:bg-[#d9ff20] text-[#0b0e14] text-[13px] font-bold rounded-lg hover:-translate-y-[1px] transition-all"
                  disabled={isLoading}
                  data-testid="login-submit-btn"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {t('auth.login.submit')}
                </Button>
              </form>
              <p className="text-center text-[12px] text-slate-400 mt-6">
                {t('auth.login.noAccount')}{' '}
                <button onClick={() => document.querySelector('[data-testid="register-tab"]').click()} className="text-[#007AFF] hover:underline font-medium">
                  {t('auth.login.createAccount')}
                </button>
              </p>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="register-name" className="text-[13px] text-slate-600 font-medium">{t('auth.register.name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Juan Perez"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      className={inputClass}
                      data-testid="register-name-input"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-email" className="text-[13px] text-slate-600 font-medium">{t('auth.register.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className={inputClass}
                      data-testid="register-email-input"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-password" className="text-[13px] text-slate-600 font-medium">{t('auth.register.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.register.passwordRequirements')}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={6}
                      className={`${inputClass} pr-10`}
                      data-testid="register-password-input"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-slate-600 font-medium">{t('auth.register.role')}</Label>
                  <Select value={registerRole} onValueChange={setRegisterRole}>
                    <SelectTrigger className="h-11 border-slate-200 focus:border-[#007AFF] rounded-lg bg-white text-[14px]" data-testid="register-role-select">
                      <SelectValue placeholder={t('auth.register.role')} />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map(role => {
                        const IconComponent = ROLE_ICONS[role.id] || UserCircle;
                        return (
                          <SelectItem key={role.id} value={role.id} className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <IconComponent className="w-4 h-4 text-[#007AFF]" />
                              <span className="text-[13px] font-medium">{role.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#007AFF] hover:bg-[#0066dd] text-white text-[13px] font-semibold rounded-lg"
                  disabled={isLoading}
                  data-testid="register-submit-btn"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {t('auth.register.submit')}
                </Button>
              </form>
              <p className="text-center text-[11px] text-slate-400 mt-5">
                {t('landing.footer.terms')} & {t('landing.footer.privacy')}
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right — Visual panel */}
      <div className="hidden lg:flex w-[55%] flex-col relative overflow-hidden" style={{ background: '#080b12' }}>
        <AuthVisual />
      </div>
    </div>
  );
};

export default AuthPage;

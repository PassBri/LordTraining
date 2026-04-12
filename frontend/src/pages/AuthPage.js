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
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 200); return () => clearTimeout(t); }, []);

  const r = 24, circ = 2 * Math.PI * r, rOff = circ * (1 - 0.85);

  return (
  <div className="relative h-full overflow-hidden" style={{background:'#08090e'}}>

    {/* LAYER 1 — Football field SVG */}
    <svg className="absolute" viewBox="0 0 520 340" preserveAspectRatio="xMidYMid meet"
      style={{top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'92%',height:'82%'}}>
      <style>{`
        .field-line{stroke:rgba(255,255,255,0.07);stroke-width:1;fill:none;
          stroke-dasharray:2000;stroke-dashoffset:${show?'0':'2000'};
          transition:stroke-dashoffset 1.5s ease-out;}
        .field-d1{transition-delay:0s}.field-d2{transition-delay:0.05s}.field-d3{transition-delay:0.1s}
        .field-d4{transition-delay:0.15s}.field-d5{transition-delay:0.2s}.field-d6{transition-delay:0.25s}
        .field-d7{transition-delay:0.3s}.field-d8{transition-delay:0.35s}.field-d9{transition-delay:0.4s}
        .field-d10{transition-delay:0.45s}
      `}</style>
      {/* Outer rect */}
      <rect x="10" y="10" width="500" height="320" rx="2" className="field-line field-d1"/>
      {/* Center line */}
      <line x1="260" y1="10" x2="260" y2="330" className="field-line field-d2"/>
      {/* Center circle */}
      <circle cx="260" cy="170" r="50" className="field-line field-d3"/>
      <circle cx="260" cy="170" r="2.5" fill="rgba(255,255,255,0.07)" className="field-d3"/>
      {/* Left penalty area */}
      <rect x="10" y="85" width="80" height="170" className="field-line field-d4"/>
      <rect x="10" y="120" width="35" height="100" className="field-line field-d5"/>
      {/* Left penalty arc */}
      <path d="M90 135 A30 30 0 0 1 90 205" className="field-line field-d6"/>
      {/* Right penalty area */}
      <rect x="430" y="85" width="80" height="170" className="field-line field-d7"/>
      <rect x="475" y="120" width="35" height="100" className="field-line field-d8"/>
      {/* Right penalty arc */}
      <path d="M430 135 A30 30 0 0 0 430 205" className="field-line field-d9"/>
      {/* Corner arcs */}
      <path d="M10 18 A8 8 0 0 0 18 10" className="field-line field-d10"/>
      <path d="M502 10 A8 8 0 0 0 510 18" className="field-line field-d10"/>
      <path d="M10 322 A8 8 0 0 1 18 330" className="field-line field-d10"/>
      <path d="M502 330 A8 8 0 0 1 510 322" className="field-line field-d10"/>
    </svg>

    {/* LAYER 2 — Heatmap zones */}
    <div className="absolute inset-0 pointer-events-none">
      {[
        {x:'28%',y:'40%',s:80,c:'200,247,0',d:'3s',dl:'0s'},
        {x:'72%',y:'30%',s:60,c:'55,138,221',d:'4s',dl:'0.8s'},
        {x:'18%',y:'65%',s:50,c:'200,247,0',d:'3.5s',dl:'1.5s'},
        {x:'78%',y:'60%',s:70,c:'226,75,74',d:'5s',dl:'0.3s'},
        {x:'50%',y:'50%',s:90,c:'55,138,221',d:'4.5s',dl:'1.2s'},
        {x:'65%',y:'25%',s:45,c:'200,247,0',d:'3.8s',dl:'2s'},
      ].map((h,i) => (
        <div key={i} className="absolute rounded-full" style={{
          left:h.x,top:h.y,width:h.s,height:h.s,transform:'translate(-50%,-50%)',
          background:`rgba(${h.c},0.07)`,
          boxShadow:`0 0 ${h.s/2}px ${h.s/4}px rgba(${h.c},0.04)`,
          opacity: show ? 0.7 : 0,
          transition:`opacity 0.8s ease ${1.5 + i*0.1}s`,
          animation: show ? `heatPulse ${h.d} ease ${h.dl} infinite` : 'none',
        }}/>
      ))}
    </div>

    {/* LAYER 3 — Tactical play line */}
    <svg className="absolute" viewBox="0 0 520 340" preserveAspectRatio="xMidYMid meet"
      style={{top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'92%',height:'82%'}}>
      <defs><marker id="arrowM" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="rgba(255,255,255,0.25)"/>
      </marker></defs>
      <path d="M120,220 C180,200 220,140 280,130 S380,100 420,90"
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
        strokeDasharray="6 4" strokeLinecap="round" markerEnd="url(#arrowM)"
        style={{
          strokeDashoffset: show ? '0' : '400',
          transition:'stroke-dashoffset 2s ease-in-out 1.8s',
        }}/>
      {/* Play points */}
      {[[120,220],[280,130],[420,90]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"
          style={{opacity: show ? 1 : 0, transition:`opacity 0.4s ease ${2.2 + i*0.4}s`}}/>
      ))}
    </svg>

    {/* LAYER 4 — HUD Cards */}
    {/* Header session */}
    <div className="absolute left-1/2 -translate-x-1/2" style={{top:'4%',opacity:show?1:0,transform:`translateX(-50%) translateY(${show?'0':'10px'})`,transition:'all 0.4s ease 2s'}}>
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl whitespace-nowrap" style={{background:'rgba(8,9,14,0.8)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(8px)'}}>
        <div className="w-5 h-5 rounded-md bg-[#c8f700] flex items-center justify-center">
          <span className="text-[10px] font-black text-[#08090e]" style={{fontFamily:BC}}>i</span>
        </div>
        <span className="text-[12px] font-semibold text-white/80">{t('auth.visual.week')} · {t('auth.visual.phase')}</span>
        <div className="flex items-center gap-1 ml-2">
          <span className="w-[6px] h-[6px] rounded-full bg-[#c8f700]" style={{animation:'livePulse 1.5s infinite'}}/>
          <span className="text-[10px] text-[#c8f700]/70">Live</span>
        </div>
      </div>
    </div>

    {/* Readiness HUD */}
    <div className="absolute" style={{top:'22%',left:'5%',opacity:show?1:0,transform:`translateY(${show?'0':'10px'})`,transition:'all 0.4s ease 2.2s'}}>
      <div className="px-4 py-4 rounded-xl" style={{background:'rgba(8,9,14,0.75)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(8px)'}}>
        <span className="text-[9px] text-white/30 uppercase tracking-[0.12em] font-semibold block mb-2">{t('auth.visual.readiness')}</span>
        <div className="flex items-center gap-3">
          <div className="relative" style={{width:56,height:56}}>
            <svg width="56" height="56" className="-rotate-90">
              <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
              <circle cx="28" cy="28" r={r} fill="none" stroke="#c8f700" strokeWidth="3"
                strokeDasharray={circ} strokeDashoffset={show ? rOff : circ}
                strokeLinecap="round" style={{transition:'stroke-dashoffset 1.2s ease-out 0.3s'}}/>
            </svg>
          </div>
          <div>
            <span className="text-[36px] font-black text-[#c8f700] leading-none block" style={{fontFamily:BC}}>{readiness}</span>
            <span className="text-[10px] text-[#c8f700]/50 mt-0.5 block">Optimal</span>
          </div>
        </div>
      </div>
    </div>

    {/* ACWR HUD */}
    <div className="absolute" style={{top:'22%',right:'5%',opacity:show?1:0,transform:`translateY(${show?'0':'10px'})`,transition:'all 0.4s ease 2.4s'}}>
      <div className="px-4 py-4 rounded-xl" style={{background:'rgba(8,9,14,0.75)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(8px)'}}>
        <span className="text-[9px] text-white/30 uppercase tracking-[0.12em] font-semibold block mb-2">{t('auth.visual.acwr')}</span>
        <span className="text-[32px] font-black text-[#378ADD] leading-none block" style={{fontFamily:BC}}>{acwr}</span>
        <svg viewBox="0 0 100 28" className="w-24 h-7 mt-2">
          <path d="M0,22 L14,18 L28,20 L42,14 L56,16 L70,10 L84,12 L100,6"
            fill="none" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round"
            style={{strokeDasharray: show ? '0' : '200', strokeDashoffset: show ? '0' : '200', transition:'all 0.8s ease 2.6s'}}/>
        </svg>
        <span className="text-[10px] text-[#378ADD]/50 mt-1 block">{t('auth.visual.optimal_zone')}</span>
      </div>
    </div>

    {/* Adherence small HUD */}
    <div className="absolute" style={{bottom:'28%',right:'8%',opacity:show?1:0,transform:`translateY(${show?'0':'10px'})`,transition:'all 0.4s ease 2.6s'}}>
      <div className="px-3 py-3 rounded-lg" style={{background:'rgba(8,9,14,0.75)',border:'0.5px solid rgba(255,255,255,0.08)',backdropFilter:'blur(8px)'}}>
        <span className="text-[22px] font-black text-[#c8f700] leading-none block" style={{fontFamily:BC}}>94%</span>
        <span className="text-[9px] text-white/25 uppercase tracking-[0.1em] mt-1 block">{t('auth.visual.adherence')}</span>
      </div>
    </div>

    {/* LAYER 5 — Typewriter top gradient */}
    <div className="absolute top-0 left-0 right-0 z-20 px-8 pt-7 pb-16" style={{background:'linear-gradient(to bottom, rgba(8,9,14,0.95), transparent)'}}>
      <div className="h-[28px] mb-2">
        <h2 className="text-[20px] font-bold text-white/90" style={{fontFamily:INT}}>
          {typedText}<span className="inline-block w-[1.5px] h-[18px] bg-[#c8f700] ml-0.5" style={{animation:'blink 0.53s step-end infinite'}}/>
        </h2>
      </div>
      <p className="text-[12px] text-white/30">{t('auth.visual.system_line')}</p>
    </div>

    {/* LAYER 6 — Bench bar */}
    <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between" style={{background:'rgba(8,9,14,0.92)',borderTop:'0.5px solid rgba(255,255,255,0.07)'}}>
      <div className="flex items-center gap-2">
        <div className="flex">
          {[
            {bg:'#1a3a1a',c:'#c8f700',b:'#c8f700',t:'JP'},
            {bg:'#1a2a3a',c:'#378ADD',b:'#378ADD',t:'MA'},
            {bg:'#1a1a3a',c:'#7F77DD',b:'#7F77DD',t:'LC'},
            {bg:'rgba(255,255,255,0.06)',c:'rgba(255,255,255,0.4)',b:'rgba(255,255,255,0.1)',t:'+21'},
          ].map((a,i) => (
            <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold" style={{background:a.bg,color:a.c,border:`1.5px solid ${a.b}`,marginLeft:i>0?'-8px':'0',zIndex:4-i,position:'relative'}}>
              {a.t}
            </div>
          ))}
        </div>
        <span className="text-[11px] text-white/30 ml-1">{t('auth.visual.optimal_zone')}</span>
      </div>
      <div className="flex items-center gap-5">
        {[
          {v:'17',l:t('landing.hero.stats.models')},
          {v:'6',l:t('landing.hero.stats.controls')},
          {v:'150+',l:t('landing.hero.stats.exercises')},
        ].map((s,i) => (
          <div key={i} className="text-center" style={{borderLeft:i>0?'0.5px solid rgba(255,255,255,0.06)':'none',paddingLeft:i>0?'16px':'0'}}>
            <span className="text-[16px] font-black text-[#c8f700] leading-none block" style={{fontFamily:BC}}>{s.v}</span>
            <span className="text-[8px] text-white/20 mt-1 block">{s.l}</span>
          </div>
        ))}
      </div>
    </div>

    {/* LAYER 7 — Chalk signature */}
    <div className="absolute z-10 pointer-events-none" style={{bottom:'70px',right:'24px',opacity:show?0.12:0,transition:'opacity 1s ease 2.5s',transform:'rotate(-2deg)'}}>
      <span className="text-[14px] text-white italic">Los mejores no improvisan.</span>
    </div>

    <style>{`
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
      @keyframes heatPulse{0%,100%{opacity:0.6;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}}
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
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold rounded-lg"
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

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

    {/* LAYER 1 — Chalkboard field (vertical, like real tactical board) */}
    <div className="absolute" style={{top:'12%',left:'10%',right:'10%',bottom:'16%',background:'#1a2e1a',borderRadius:'6px',border:'1px solid rgba(255,255,255,0.08)'}}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 420" preserveAspectRatio="xMidYMid meet">
        <style>{`
          .chalk{stroke:rgba(255,255,255,0.35);fill:none;stroke-linecap:round;stroke-linejoin:round;
            stroke-dasharray:2000;stroke-dashoffset:${show?'0':'2000'};
            transition:stroke-dashoffset 1.8s ease-out;}
          .chalk-thin{stroke-width:1.5}
          .chalk-thick{stroke-width:2}
          .ch1{transition-delay:0.2s}.ch2{transition-delay:0.3s}.ch3{transition-delay:0.4s}
          .ch4{transition-delay:0.5s}.ch5{transition-delay:0.6s}.ch6{transition-delay:0.7s}
          .ch7{transition-delay:0.8s}.ch8{transition-delay:0.9s}
        `}</style>
        {/* Outer field */}
        <rect x="20" y="20" width="260" height="380" rx="3" className="chalk chalk-thick ch1"/>
        {/* Center line */}
        <line x1="20" y1="210" x2="280" y2="210" className="chalk chalk-thin ch2"/>
        {/* Center circle */}
        <circle cx="150" cy="210" r="40" className="chalk chalk-thin ch3"/>
        <circle cx="150" cy="210" r="2" fill="rgba(255,255,255,0.3)"/>
        {/* Top penalty area */}
        <rect x="75" y="20" width="150" height="65" className="chalk chalk-thin ch4"/>
        <rect x="105" y="20" width="90" height="28" className="chalk chalk-thin ch5"/>
        {/* Top penalty arc */}
        <path d="M105 85 A30 30 0 0 0 195 85" className="chalk chalk-thin ch5"/>
        {/* Top goal */}
        <rect x="120" y="10" width="60" height="12" rx="2" className="chalk chalk-thin ch4" style={{stroke:'rgba(255,255,255,0.2)'}}/>
        {/* Bottom penalty area */}
        <rect x="75" y="335" width="150" height="65" className="chalk chalk-thin ch6"/>
        <rect x="105" y="372" width="90" height="28" className="chalk chalk-thin ch7"/>
        {/* Bottom penalty arc */}
        <path d="M105 335 A30 30 0 0 1 195 335" className="chalk chalk-thin ch7"/>
        {/* Bottom goal */}
        <rect x="120" y="398" width="60" height="12" rx="2" className="chalk chalk-thin ch6" style={{stroke:'rgba(255,255,255,0.2)'}}/>
        {/* Corner arcs */}
        <path d="M20 28 A8 8 0 0 0 28 20" className="chalk chalk-thin ch8"/>
        <path d="M272 20 A8 8 0 0 0 280 28" className="chalk chalk-thin ch8"/>
        <path d="M20 392 A8 8 0 0 1 28 400" className="chalk chalk-thin ch8"/>
        <path d="M272 400 A8 8 0 0 1 280 392" className="chalk chalk-thin ch8"/>

        {/* Players — X marks (team A) */}
        {[[80,130],[150,155],[220,130],[100,260],[200,260],[150,350]].map(([cx,cy],i) => (
          <g key={`x${i}`} style={{opacity:show?0.4:0,transition:`opacity 0.5s ease ${1.5+i*0.1}s`}}>
            <line x1={cx-7} y1={cy-7} x2={cx+7} y2={cy+7} stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
            <line x1={cx+7} y1={cy-7} x2={cx-7} y2={cy+7} stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
          </g>
        ))}
        {/* Players — O marks (team B) */}
        {[[150,90],[80,200],[220,200],[150,290]].map(([cx,cy],i) => (
          <circle key={`o${i}`} cx={cx} cy={cy} r="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"
            style={{opacity:show?0.4:0,transition:`opacity 0.5s ease ${1.8+i*0.1}s`}}/>
        ))}

        {/* Tactical arrows */}
        <defs><marker id="chalkArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="rgba(255,255,255,0.35)"/>
        </marker></defs>
        <path d="M100,260 C120,220 130,180 150,155" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#chalkArrow)"
          style={{strokeDashoffset:show?'0':'300',transition:'stroke-dashoffset 1.5s ease 2s'}}/>
        <path d="M200,260 C210,220 200,170 220,130" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#chalkArrow)"
          style={{strokeDashoffset:show?'0':'300',transition:'stroke-dashoffset 1.5s ease 2.3s'}}/>
        <path d="M150,155 C170,120 180,100 150,90" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#chalkArrow)"
          style={{strokeDashoffset:show?'0':'200',transition:'stroke-dashoffset 1.2s ease 2.6s'}}/>
      </svg>

      {/* Heatmap zones over the field */}
      {[
        {x:'30%',y:'35%',s:70,c:'200,247,0'},
        {x:'70%',y:'28%',s:55,c:'55,138,221'},
        {x:'50%',y:'50%',s:80,c:'55,138,221'},
        {x:'25%',y:'72%',s:50,c:'200,247,0'},
        {x:'75%',y:'65%',s:60,c:'226,75,74'},
      ].map((h,i) => (
        <div key={i} className="absolute rounded-full" style={{
          left:h.x,top:h.y,width:h.s,height:h.s,transform:'translate(-50%,-50%)',
          background:`rgba(${h.c},0.1)`,
          boxShadow:`0 0 ${h.s/2}px ${h.s/3}px rgba(${h.c},0.06)`,
          opacity:show?1:0,transition:`opacity 0.8s ease ${1.5+i*0.15}s`,
          animation:show?`heatPulse ${3+i*0.5}s ease ${i*0.3}s infinite`:'none',
        }}/>
      ))}
    </div>

    {/* LAYER 4 — HUD Cards floating over field */}
    {/* Session header */}
    <div className="absolute left-1/2 -translate-x-1/2" style={{top:'5%',opacity:show?1:0,transform:`translateX(-50%) translateY(${show?'0':'8px'})`,transition:'all 0.4s ease 2s'}}>
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg whitespace-nowrap" style={{background:'rgba(8,9,14,0.85)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(12px)'}}>
        <div className="w-5 h-5 rounded-md bg-[#c8f700] flex items-center justify-center">
          <span className="text-[10px] font-black text-[#08090e]" style={{fontFamily:BC}}>i</span>
        </div>
        <span className="text-[12px] font-semibold text-white/80">{t('auth.visual.week')} · {t('auth.visual.phase')}</span>
        <span className="w-[5px] h-[5px] rounded-full bg-[#c8f700] ml-1" style={{animation:'livePulse 1.5s infinite'}}/>
        <span className="text-[10px] text-[#c8f700]/60">Live</span>
      </div>
    </div>

    {/* Readiness — top left, outside field */}
    <div className="absolute" style={{top:'14%',left:'3%',opacity:show?1:0,transform:`translateY(${show?'0':'8px'})`,transition:'all 0.4s ease 2.2s'}}>
      <div className="px-3 py-3 rounded-lg" style={{background:'rgba(8,9,14,0.85)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(12px)'}}>
        <span className="text-[8px] text-white/30 uppercase tracking-[0.12em] font-bold block mb-1.5">{t('auth.visual.readiness')}</span>
        <div className="flex items-center gap-2">
          <svg width="40" height="40" className="-rotate-90">
            <circle cx="20" cy="20" r={r-6} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"/>
            <circle cx="20" cy="20" r={r-6} fill="none" stroke="#c8f700" strokeWidth="2.5"
              strokeDasharray={2*Math.PI*(r-6)} strokeDashoffset={show ? 2*Math.PI*(r-6)*(1-0.85) : 2*Math.PI*(r-6)}
              strokeLinecap="round" style={{transition:'stroke-dashoffset 1.2s ease-out 0.3s'}}/>
          </svg>
          <div>
            <span className="text-[28px] font-black text-[#c8f700] leading-none block" style={{fontFamily:BC}}>{readiness}</span>
            <span className="text-[9px] text-[#c8f700]/40 block">Optimal</span>
          </div>
        </div>
      </div>
    </div>

    {/* ACWR — top right */}
    <div className="absolute" style={{top:'14%',right:'3%',opacity:show?1:0,transform:`translateY(${show?'0':'8px'})`,transition:'all 0.4s ease 2.4s'}}>
      <div className="px-3 py-3 rounded-lg" style={{background:'rgba(8,9,14,0.85)',border:'0.5px solid rgba(255,255,255,0.1)',backdropFilter:'blur(12px)'}}>
        <span className="text-[8px] text-white/30 uppercase tracking-[0.12em] font-bold block mb-1">{t('auth.visual.acwr')}</span>
        <span className="text-[26px] font-black text-[#378ADD] leading-none block" style={{fontFamily:BC}}>{acwr}</span>
        <svg viewBox="0 0 80 20" className="w-16 h-4 mt-1.5">
          <path d="M0,16 L11,13 L22,14 L33,10 L44,11 L55,7 L66,8 L80,4" fill="none" stroke="#378ADD" strokeWidth="1.5" strokeLinecap="round"
            style={{strokeDasharray:show?'0':'150',strokeDashoffset:show?'0':'150',transition:'all 0.8s ease 2.6s'}}/>
        </svg>
        <span className="text-[8px] text-[#378ADD]/40 mt-1 block">{t('auth.visual.optimal_zone')}</span>
      </div>
    </div>

    {/* Adherence — bottom right */}
    <div className="absolute" style={{bottom:'22%',right:'3%',opacity:show?1:0,transform:`translateY(${show?'0':'8px'})`,transition:'all 0.4s ease 2.6s'}}>
      <div className="px-3 py-2.5 rounded-lg" style={{background:'rgba(8,9,14,0.85)',border:'0.5px solid rgba(255,255,255,0.08)',backdropFilter:'blur(12px)'}}>
        <span className="text-[20px] font-black text-[#c8f700] leading-none block" style={{fontFamily:BC}}>94%</span>
        <span className="text-[8px] text-white/25 uppercase tracking-[0.1em] mt-0.5 block">{t('auth.visual.adherence')}</span>
      </div>
    </div>

    {/* LAYER 5 — Typewriter top */}
    <div className="absolute top-0 left-0 right-0 z-20 px-7 pt-6 pb-14" style={{background:'linear-gradient(to bottom, rgba(8,9,14,0.95) 0%, rgba(8,9,14,0.6) 60%, transparent 100%)'}}>
      <div className="h-[26px] mb-1.5">
        <h2 className="text-[19px] font-semibold text-white/85" style={{fontFamily:INT}}>
          {typedText}<span className="inline-block w-[1.5px] h-[17px] bg-[#c8f700] ml-0.5" style={{animation:'blink 0.53s step-end infinite'}}/>
        </h2>
      </div>
      <p className="text-[11px] text-white/25">{t('auth.visual.system_line')}</p>
    </div>

    {/* LAYER 6 — Bench bar */}
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
    <div className="absolute z-10 pointer-events-none" style={{bottom:'55px',right:'16px',opacity:show?0.15:0,transition:'opacity 1s ease 2.5s',transform:'rotate(-2deg)'}}>
      <span className="text-[13px] text-white italic">Los mejores no improvisan.</span>
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

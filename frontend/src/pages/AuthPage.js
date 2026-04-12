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

/* ═══ RIGHT PANEL VISUAL ═══ */
const AuthVisual = () => {
  const { t } = useTranslation();
  const typedText = useTypewriter([
    t('auth.visual.phrase1'),
    t('auth.visual.phrase2'),
    t('auth.visual.phrase3')
  ]);
  const readiness = useCountUp(85, 1200);
  const acwr = useCountUp(0.87, 1400);
  const adherence = useCountUp(94, 1000);
  const [chartVisible, setChartVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChartVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
  <div className="relative h-full flex flex-col justify-between px-10 py-10" style={{ background: '#080b12' }}>
    {/* Sports field background — athletics track + football pitch overlay */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.04 }}>
      <svg viewBox="0 0 500 800" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Athletics track - outer lanes */}
        <ellipse cx="250" cy="400" rx="220" ry="340" fill="none" stroke="white" strokeWidth="0.8" />
        <ellipse cx="250" cy="400" rx="195" ry="315" fill="none" stroke="white" strokeWidth="0.5" />
        <ellipse cx="250" cy="400" rx="170" ry="290" fill="none" stroke="white" strokeWidth="0.5" />
        <ellipse cx="250" cy="400" rx="145" ry="265" fill="none" stroke="white" strokeWidth="0.5" />
        {/* Football pitch inside */}
        <rect x="100" y="200" width="300" height="400" fill="none" stroke="white" strokeWidth="1" />
        <line x1="100" y1="400" x2="400" y2="400" stroke="white" strokeWidth="0.8" />
        <circle cx="250" cy="400" r="50" fill="none" stroke="white" strokeWidth="0.8" />
        <circle cx="250" cy="400" r="2" fill="white" />
        {/* Penalty areas */}
        <rect x="160" y="200" width="180" height="70" fill="none" stroke="white" strokeWidth="0.6" />
        <rect x="160" y="530" width="180" height="70" fill="none" stroke="white" strokeWidth="0.6" />
        <rect x="195" y="200" width="110" height="30" fill="none" stroke="white" strokeWidth="0.5" />
        <rect x="195" y="570" width="110" height="30" fill="none" stroke="white" strokeWidth="0.5" />
        {/* Corner arcs */}
        <path d="M100 208 Q108 200 116 200" fill="none" stroke="white" strokeWidth="0.5" />
        <path d="M384 200 Q392 200 400 208" fill="none" stroke="white" strokeWidth="0.5" />
        <path d="M100 592 Q108 600 116 600" fill="none" stroke="white" strokeWidth="0.5" />
        <path d="M384 600 Q392 600 400 592" fill="none" stroke="white" strokeWidth="0.5" />
        {/* Lane markers */}
        {[0,1,2,3,4,5].map(i => (
          <line key={i} x1={70 + i*12} y1="60" x2={70 + i*12} y2="80" stroke="white" strokeWidth="0.4" />
        ))}
        {/* Starting blocks marks */}
        <line x1="30" y1="400" x2="70" y2="400" stroke="white" strokeWidth="0.6" strokeDasharray="4 3" />
      </svg>
    </div>

    {/* Subtle radial accent */}
    <div className="absolute top-0 right-0 w-[300px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(200,247,0,0.03) 0%, transparent 70%)' }} />

    <div className="relative z-10 flex flex-col h-full justify-between">
      {/* BLOCK 1 — Typewriter headline */}
      <div className="mb-6" style={{ animation: 'authFadeUp 0.4s cubic-bezier(0.2,0,0,1) both' }}>
        <div className="h-[72px] flex items-end mb-3">
          <h2 className="text-[28px] font-bold text-white leading-[1.2]" style={{ fontFamily: INT }}>
            {typedText}<span className="inline-block w-[2px] h-[28px] bg-[#c8f700] ml-1 animate-pulse" />
          </h2>
        </div>
        <div className="h-[2px] rounded-full overflow-hidden mb-3" style={{ background: 'rgba(200,247,0,0.12)' }}>
          <div className="h-full bg-[#c8f700] rounded-full" style={{ width: `${(typedText.length / 22) * 100}%`, transition: 'width 0.1s linear' }} />
        </div>
        <p className="text-[13px] text-slate-500">{t('auth.visual.system_line')}</p>
      </div>

      {/* BLOCK 2 — Dashboard card with periodization curve */}
      <div className="mb-5" style={{ animation: 'authFadeUp 0.4s cubic-bezier(0.2,0,0,1) 0.1s both' }}>
        <div className="rounded-2xl p-5" style={{ background: '#111620', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#c8f700] rounded-lg flex items-center justify-center">
                <span className="text-[14px] font-black text-[#080b12] leading-none" style={{ fontFamily: BC }}>i</span>
              </div>
              <div>
                <span className="text-[12px] font-semibold text-white/90 block leading-none">{t('auth.visual.week')}</span>
                <span className="text-[10px] text-slate-500">{t('auth.visual.phase')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8f700] opacity-30" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c8f700]" />
              </span>
              <span className="text-[10px] text-slate-500">Live</span>
            </div>
          </div>

          {/* 3 Metrics */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { val: readiness, label: t('auth.visual.readiness'), color: '#c8f700', suffix: '' },
              { val: acwr, label: t('auth.visual.acwr'), color: '#378ADD', suffix: '' },
              { val: adherence, label: t('auth.visual.adherence'), color: '#c8f700', suffix: '%' },
            ].map((m, i) => (
              <div key={i} className="text-center py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="text-[28px] font-black leading-none" style={{ color: m.color, fontFamily: BC }}>{m.val}{m.suffix}</div>
                <div className="text-[8px] text-slate-500 mt-2 uppercase tracking-[0.12em] font-bold">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Periodization curve — SVG smooth lines */}
          <div className="relative h-24 mb-3">
            <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[20,40,60].map(y => (
                <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="white" strokeWidth="0.3" opacity="0.06" />
              ))}
              {/* Volume curve — blue */}
              <path d={`M0 55 C20 50,40 42,60 38 S100 25,120 30 S160 20,180 15 S220 22,240 28 S280 18,300 12`}
                fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round"
                style={{ strokeDasharray: chartVisible ? '0' : '500', strokeDashoffset: chartVisible ? '0' : '500', transition: 'stroke-dasharray 1.5s ease, stroke-dashoffset 1.5s ease' }}
              />
              <path d={`M0 55 C20 50,40 42,60 38 S100 25,120 30 S160 20,180 15 S220 22,240 28 S280 18,300 12 L300 80 L0 80 Z`}
                fill="url(#blueGrad)" opacity={chartVisible ? '0.15' : '0'} style={{ transition: 'opacity 1.5s ease' }}
              />
              {/* Intensity curve — green */}
              <path d={`M0 70 C20 68,40 65,60 60 S100 55,120 48 S160 40,180 35 S220 28,240 22 S280 15,300 10`}
                fill="none" stroke="#c8f700" strokeWidth="2" strokeLinecap="round"
                style={{ strokeDasharray: chartVisible ? '0' : '500', strokeDashoffset: chartVisible ? '0' : '500', transition: 'stroke-dasharray 1.8s ease 0.2s, stroke-dashoffset 1.8s ease 0.2s' }}
              />
              <path d={`M0 70 C20 68,40 65,60 60 S100 55,120 48 S160 40,180 35 S220 28,240 22 S280 15,300 10 L300 80 L0 80 Z`}
                fill="url(#greenGrad)" opacity={chartVisible ? '0.1' : '0'} style={{ transition: 'opacity 1.8s ease 0.2s' }}
              />
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#378ADD" /><stop offset="100%" stopColor="#378ADD" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8f700" /><stop offset="100%" stopColor="#c8f700" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            {/* Legend */}
            <div className="absolute bottom-0 right-0 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[9px] text-slate-500"><span className="w-2.5 h-[2px] bg-[#378ADD] rounded-full inline-block" />VOL</span>
              <span className="flex items-center gap-1 text-[9px] text-slate-500"><span className="w-2.5 h-[2px] bg-[#c8f700] rounded-full inline-block" />INT</span>
            </div>
          </div>

          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8f700] opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c8f700]" />
            </span>
            <span className="text-[11px] text-slate-400">{t('auth.visual.optimal_zone')}</span>
          </div>
        </div>
      </div>

      {/* BLOCK 3 — Micro cards */}
      <div className="grid grid-cols-3 gap-3 mb-5" style={{ animation: 'authFadeUp 0.4s cubic-bezier(0.2,0,0,1) 0.2s both' }}>
        {[
          { icon: Timer, val: '17', label: t('landing.hero.stats.models') },
          { icon: TrendingUp, val: '6', label: t('landing.hero.stats.controls') },
          { icon: Zap, val: '150+', label: t('landing.hero.stats.exercises') },
        ].map((c, i) => (
          <div key={i} className="rounded-xl p-4 text-center cursor-default transition-all duration-200 hover:-translate-y-1" style={{
            background: '#111620',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,247,0,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <c.icon className="w-4 h-4 text-slate-600 mx-auto mb-2" />
            <div className="text-[24px] font-black text-[#c8f700] leading-none" style={{ fontFamily: BC }}>{c.val}</div>
            <div className="text-[10px] text-slate-500 mt-1.5 leading-tight">{c.label}</div>
          </div>
        ))}
      </div>

      {/* BLOCK 4 — Social proof */}
      <div className="rounded-xl px-5 py-4" style={{ background: '#0d1119', border: '1px solid rgba(255,255,255,0.04)', animation: 'authFadeUp 0.4s cubic-bezier(0.2,0,0,1) 0.3s both' }}>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 flex-shrink-0">
            {[
              { bg: '#c8f700', text: '#080b12', initials: 'CM' },
              { bg: '#378ADD', text: '#fff', initials: 'AR' },
              { bg: '#E24B4A', text: '#fff', initials: 'DT' },
              { bg: '#7F77DD', text: '#fff', initials: 'LP' },
              { bg: '#10B981', text: '#fff', initials: 'MV' },
            ].map((a, i) => (
              <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold border-2" style={{ background: a.bg, color: a.text, borderColor: '#0d1119' }}>{a.initials}</div>
            ))}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-white/90">{t('auth.visual.active_coaches')}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8f700] opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#c8f700]" />
              </span>
              <p className="text-[10px] text-slate-500">{t('auth.visual.new_coaches')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>{`
      @keyframes authFadeUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
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

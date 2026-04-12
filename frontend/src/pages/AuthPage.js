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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const volData = [42,48,55,50,62,58,68,72,65,78,82,75,70,80,85,72,68,82,88,78,72,85,90,82];
  const intData = [25,30,35,38,40,45,48,52,50,55,60,58,55,62,68,65,60,70,75,72,68,78,82,80];

  return (
  <div className="relative h-full flex flex-col" style={{ background: '#070a11' }}>

    {/* Top section — typewriter + tagline */}
    <div className="px-10 pt-10 pb-6">
      <div className="h-[28px] mb-1">
        <h2 className="text-[20px] font-medium text-white/70" style={{ fontFamily: INT }}>
          {typedText}<span className="inline-block w-[1.5px] h-[17px] bg-[#c8f700] ml-0.5" style={{ animation: 'blink 1s step-end infinite' }} />
        </h2>
      </div>
      <p className="text-[11px] text-white/20">{t('auth.visual.system_line')}</p>
    </div>

    {/* Main content — simulated app interface */}
    <div className="flex-1 px-6 pb-6 flex flex-col gap-3 overflow-hidden">

      {/* Row 1: Header bar — looks like real app nav */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#c8f700] flex items-center justify-center">
            <span className="text-[12px] font-black text-[#070a11]" style={{ fontFamily: BC }}>i</span>
          </div>
          <span className="text-[11px] font-semibold text-white/60">{t('auth.visual.week')} · {t('auth.visual.phase')}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,247,0,0.06)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#c8f700]" style={{ animation: 'pulse3 2s ease infinite' }} />
          <span className="text-[9px] text-[#c8f700]/60">Live</span>
        </div>
      </div>

      {/* Row 2: Three KPI cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: '85', label: t('auth.visual.readiness'), color: '#c8f700', sub: 'optimal' },
          { val: '0.87', label: t('auth.visual.acwr'), color: '#378ADD', sub: '0.8–1.3' },
          { val: '94%', label: t('auth.visual.adherence'), color: '#22c55e', sub: 'high' },
        ].map((m, i) => (
          <div key={i} className="rounded-xl px-3 py-4 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
            <div className="text-[28px] font-black leading-none mb-1" style={{ color: m.color, fontFamily: BC }}>{m.val}</div>
            <div className="text-[8px] text-white/25 uppercase tracking-[0.1em] font-bold mb-2">{m.label}</div>
            <div className="h-[2px] rounded-full mx-auto w-8" style={{ background: m.color, opacity: 0.3 }} />
          </div>
        ))}
      </div>

      {/* Row 3: Periodization chart — the centerpiece */}
      <div className="flex-1 rounded-xl px-4 pt-4 pb-3 flex flex-col" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', minHeight: 0 }}>
        {/* Chart header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">ATR · 24 {t('landing.chart.weeks')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[9px] text-white/25"><span className="w-2 h-[2px] bg-[#378ADD] rounded-full" />VOL</span>
            <span className="flex items-center gap-1 text-[9px] text-white/25"><span className="w-2 h-[2px] bg-[#c8f700] rounded-full" />INT</span>
          </div>
        </div>

        {/* Phase labels */}
        <div className="flex gap-1 mb-2">
          {[
            { n: t('landing.chart.accumulation'), c: '#378ADD', w: '33.33%' },
            { n: t('landing.chart.transformation'), c: '#c8f700', w: '33.33%' },
            { n: t('landing.chart.realization'), c: '#E24B4A', w: '33.34%' },
          ].map((p, i) => (
            <div key={i} className="text-center py-1 rounded-md" style={{ width: p.w, background: `${p.c}08` }}>
              <span className="text-[7px] font-bold tracking-wider" style={{ color: `${p.c}60`, fontFamily: BC }}>{p.n}</span>
            </div>
          ))}
        </div>

        {/* SVG area chart */}
        <div className="flex-1 relative" style={{ minHeight: '80px' }}>
          <svg viewBox="0 0 240 80" className="w-full h-full" preserveAspectRatio="none">
            {/* Horizontal grid */}
            {[20,40,60].map(y => (
              <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="white" strokeWidth="0.3" opacity="0.03" />
            ))}
            {/* Volume area */}
            <path d={`M${volData.map((v,i) => `${(i/23)*240},${80 - v*0.85}`).join(' L')} L240,80 L0,80 Z`}
              fill="url(#vGrad)" opacity={mounted ? 0.25 : 0} style={{ transition: 'opacity 1.2s ease 0.3s' }} />
            <path d={`M${volData.map((v,i) => `${(i/23)*240},${80 - v*0.85}`).join(' L')}`}
              fill="none" stroke="#378ADD" strokeWidth="1.5" opacity={mounted ? 0.6 : 0} style={{ transition: 'opacity 1s ease 0.3s' }} />
            {/* Intensity area */}
            <path d={`M${intData.map((v,i) => `${(i/23)*240},${80 - v*0.85}`).join(' L')} L240,80 L0,80 Z`}
              fill="url(#iGrad)" opacity={mounted ? 0.2 : 0} style={{ transition: 'opacity 1.2s ease 0.5s' }} />
            <path d={`M${intData.map((v,i) => `${(i/23)*240},${80 - v*0.85}`).join(' L')}`}
              fill="none" stroke="#c8f700" strokeWidth="1.5" opacity={mounted ? 0.7 : 0} style={{ transition: 'opacity 1s ease 0.5s' }} />
            <defs>
              <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#378ADD" stopOpacity="0.4"/><stop offset="100%" stopColor="#378ADD" stopOpacity="0"/></linearGradient>
              <linearGradient id="iGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c8f700" stopOpacity="0.3"/><stop offset="100%" stopColor="#c8f700" stopOpacity="0"/></linearGradient>
            </defs>
          </svg>
        </div>

        {/* Week labels */}
        <div className="flex justify-between mt-1">
          {['S1','S6','S12','S18','S24'].map(s => (
            <span key={s} className="text-[7px] text-white/15 font-mono">{s}</span>
          ))}
        </div>
      </div>

      {/* Row 4: Athlete chips + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[
              { bg: '#378ADD', t: 'JP' }, { bg: '#22c55e', t: 'MA' }, { bg: '#c8f700', t: 'LC' },
            ].map((a, i) => (
              <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold border" style={{ background: a.bg, color: a.bg === '#c8f700' ? '#070a11' : '#fff', borderColor: '#070a11' }}>{a.t}</div>
            ))}
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold border" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', borderColor: '#070a11' }}>+21</div>
          </div>
          <span className="text-[9px] text-white/20">{t('auth.visual.optimal_zone')}</span>
        </div>
        <div className="flex items-center gap-4">
          {[
            { v: '17', l: t('landing.hero.stats.models') },
            { v: '6', l: t('landing.hero.stats.controls') },
            { v: '150+', l: t('landing.hero.stats.exercises') },
          ].map((s, i) => (
            <div key={i} className="text-right">
              <span className="text-[14px] font-black text-white/40 leading-none" style={{ fontFamily: BC }}>{s.v}</span>
              <span className="text-[7px] text-white/15 block">{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 5: Social proof bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(200,247,0,0.02)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#c8f700]" style={{ animation: 'pulse3 2s ease infinite' }} />
        <span className="text-[10px] text-white/25">{t('auth.visual.active_coaches')}</span>
      </div>
    </div>

    <style>{`
      @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      @keyframes pulse3{0%,100%{opacity:1}50%{opacity:0.3}}
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

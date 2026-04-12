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

  useEffect(() => {
    const current = phrases[phraseIdx];
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
          setPhraseIdx((phraseIdx + 1) % phrases.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIdx, phrases, typingSpeed, deletingSpeed, pauseTime]);

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
    'Planifica mejor.',
    'Entrena con criterio.',
    'Compite sin límites.'
  ]);
  const readiness = useCountUp(85, 1200);
  const acwr = useCountUp(0.87, 1400);
  const adherence = useCountUp(94, 1000);
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBarsVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const barData = [
    { v: 55, i: 35, d: 50 }, { v: 72, i: 42, d: 45 }, { v: 88, i: 50, d: 40 },
    { v: 65, i: 58, d: 55 }, { v: 78, i: 65, d: 48 }, { v: 92, i: 72, d: 42 },
    { v: 70, i: 68, d: 60 }, { v: 85, i: 78, d: 50 },
  ];

  return (
  <div className="relative h-full flex flex-col justify-between px-10 py-10" style={{ background: '#080b12' }}>
    {/* Field watermark */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.03 }}>
      <svg viewBox="0 0 400 600" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <rect x="40" y="30" width="320" height="540" rx="8" fill="none" stroke="white" strokeWidth="1.5" />
        <line x1="40" y1="300" x2="360" y2="300" stroke="white" strokeWidth="1" />
        <circle cx="200" cy="300" r="60" fill="none" stroke="white" strokeWidth="1" />
        <rect x="120" y="30" width="160" height="80" rx="0" fill="none" stroke="white" strokeWidth="1" />
        <rect x="120" y="490" width="160" height="80" rx="0" fill="none" stroke="white" strokeWidth="1" />
        <circle cx="200" cy="300" r="4" fill="white" />
      </svg>
    </div>

    <div className="relative z-10 flex flex-col h-full justify-between">
      {/* BLOCK 1 — Typewriter headline */}
      <div className="mb-6" style={{ animation: 'authFadeUp 0.4s cubic-bezier(0.2,0,0,1) both' }}>
        <div className="h-[72px] flex items-end mb-3">
          <h2 className="text-[28px] font-bold text-white leading-[1.2]" style={{ fontFamily: INT }}>
            {typedText}<span className="inline-block w-[2px] h-[28px] bg-[#c8f700] ml-1 animate-pulse" />
          </h2>
        </div>
        <div className="h-[2px] bg-[#c8f700]/40 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-[#c8f700] rounded-full" style={{ width: `${(typedText.length / 22) * 100}%`, transition: 'width 0.1s linear' }} />
        </div>
        <p className="text-[13px] text-slate-500">El sistema que usan los entrenadores que ganan.</p>
      </div>

      {/* BLOCK 2 — Dashboard card */}
      <div className="mb-5" style={{ animation: 'authFadeUp 0.4s cubic-bezier(0.2,0,0,1) 0.1s both' }}>
        <div className="rounded-xl p-5" style={{ background: '#161b24', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-[#c8f700] rounded-md flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-[#080b12]" />
            </div>
            <span className="text-[12px] font-semibold text-white/80">Semana 18</span>
            <span className="text-[10px] text-slate-500">Fase Transformación</span>
          </div>
          {/* 3 Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { val: readiness, label: 'Readiness', color: '#c8f700', suffix: '' },
              { val: acwr, label: 'ACWR', color: '#378ADD', suffix: '' },
              { val: adherence, label: 'Adherencia', color: '#c8f700', suffix: '%' },
            ].map((m, i) => (
              <div key={i} className="text-center py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="text-[26px] font-black leading-none" style={{ color: m.color, fontFamily: BC }}>{m.val}{m.suffix}</div>
                <div className="text-[9px] text-slate-500 mt-1.5 uppercase tracking-wider font-bold">{m.label}</div>
              </div>
            ))}
          </div>
          {/* Animated bars */}
          <div className="flex items-end gap-[3px] h-20 mb-3">
            {barData.map((b, i) => (
              <div key={i} className="flex-1 flex items-end gap-[1px] h-full">
                <div className="flex-1 rounded-t-sm transition-all" style={{
                  height: barsVisible ? `${b.v}%` : '0%',
                  background: '#378ADD',
                  transitionDuration: '0.6s',
                  transitionDelay: `${i * 80}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.2,0,0,1)'
                }} />
                <div className="flex-1 rounded-t-sm transition-all" style={{
                  height: barsVisible ? `${b.i}%` : '0%',
                  background: '#c8f700',
                  transitionDuration: '0.6s',
                  transitionDelay: `${i * 80 + 40}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.2,0,0,1)'
                }} />
                <div className="flex-1 rounded-t-sm transition-all" style={{
                  height: barsVisible ? `${b.d}%` : '0%',
                  background: '#E24B4A',
                  opacity: 0.6,
                  transitionDuration: '0.6s',
                  transitionDelay: `${i * 80 + 80}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.2,0,0,1)'
                }} />
              </div>
            ))}
          </div>
          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8f700] opacity-40" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c8f700]" />
            </span>
            <span className="text-[11px] text-slate-400">3 atletas en zona óptima</span>
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
            background: '#161b24',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(200,247,0,0.15)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <c.icon className="w-4 h-4 text-slate-600 mx-auto mb-2" />
            <div className="text-[24px] font-black text-[#c8f700] leading-none" style={{ fontFamily: BC }}>{c.val}</div>
            <div className="text-[10px] text-slate-500 mt-1.5 leading-tight">{c.label}</div>
          </div>
        ))}
      </div>

      {/* BLOCK 4 — Social proof */}
      <div className="rounded-xl px-5 py-4" style={{ background: '#0f1520', animation: 'authFadeUp 0.4s cubic-bezier(0.2,0,0,1) 0.3s both' }}>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 flex-shrink-0">
            {[
              { bg: '#c8f700', text: '#080b12', initials: 'CM' },
              { bg: '#378ADD', text: '#fff', initials: 'AR' },
              { bg: '#E24B4A', text: '#fff', initials: 'DT' },
              { bg: '#7F77DD', text: '#fff', initials: 'LP' },
              { bg: '#10B981', text: '#fff', initials: 'MV' },
            ].map((a, i) => (
              <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold border-2" style={{ background: a.bg, color: a.text, borderColor: '#0f1520' }}>{a.initials}</div>
            ))}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-white/90">+1.200 entrenadores activos esta semana</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c8f700] opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#c8f700]" />
              </span>
              <p className="text-[10px] text-slate-500">Se unieron 48 nuevos entrenadores en los últimos 7 días</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Disclaimer */}
    <div className="absolute bottom-3 right-4 z-10">
      <span className="text-[11px]" style={{ color: '#2a2f3a' }}>Datos simulados con fines ilustrativos</span>
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

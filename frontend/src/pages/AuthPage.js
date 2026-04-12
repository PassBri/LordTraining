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
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 300); }, []);

  return (
  <div className="relative h-full flex flex-col justify-center items-center overflow-hidden" style={{ background: '#060910' }}>
    {/* Ambient light orbs */}
    <div className="absolute w-[500px] h-[500px] rounded-full" style={{ top: '-15%', right: '-10%', background: 'radial-gradient(circle, rgba(200,247,0,0.06) 0%, transparent 70%)' }} />
    <div className="absolute w-[400px] h-[400px] rounded-full" style={{ bottom: '-10%', left: '-5%', background: 'radial-gradient(circle, rgba(55,138,221,0.04) 0%, transparent 70%)' }} />

    {/* Content */}
    <div className="relative z-10 w-full max-w-[400px] px-8">

      {/* Typewriter */}
      <div className="mb-10" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(12px)', transition: 'all 0.5s cubic-bezier(0.2,0,0,1)' }}>
        <div className="h-[36px] mb-2">
          <h2 className="text-[24px] font-semibold text-white/90 leading-[1.3]" style={{ fontFamily: INT }}>
            {typedText}<span className="inline-block w-[2px] h-[22px] bg-[#c8f700] ml-0.5" style={{ animation: 'blink 1s step-end infinite' }} />
          </h2>
        </div>
        <p className="text-[13px] text-white/30 font-light">{t('auth.visual.system_line')}</p>
      </div>

      {/* Main floating card */}
      <div className="mb-8" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(16px)', transition: 'all 0.6s cubic-bezier(0.2,0,0,1) 0.1s' }}>
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#c8f700' }}>
                <span className="text-[16px] font-black text-[#060910] leading-none" style={{ fontFamily: BC }}>i</span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-white/80 leading-none">{t('auth.visual.week')}</p>
                <p className="text-[11px] text-white/25 mt-0.5">{t('auth.visual.phase')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(200,247,0,0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8f700]" style={{ animation: 'pulse2 2s ease infinite' }} />
              <span className="text-[10px] text-[#c8f700]/70 font-medium">Live</span>
            </div>
          </div>

          {/* Metrics — clean, spacious */}
          <div className="flex items-center justify-between mb-6">
            {[
              { val: readiness, label: t('auth.visual.readiness'), color: '#c8f700', suffix: '' },
              { val: acwr, label: t('auth.visual.acwr'), color: '#378ADD', suffix: '' },
              { val: adherence, label: t('auth.visual.adherence'), color: '#c8f700', suffix: '%' },
            ].map((m, i) => (
              <div key={i} className="text-center flex-1">
                <div className="text-[32px] font-black leading-none tracking-tight" style={{ color: m.color, fontFamily: BC }}>{m.val}{m.suffix}</div>
                <div className="text-[9px] text-white/20 mt-2 uppercase tracking-[0.15em] font-semibold">{m.label}</div>
                {i < 2 && <div className="absolute" />}
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="h-px mb-5" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />

          {/* Periodization curves — elegant SVG */}
          <div className="relative h-20 mb-4">
            <svg viewBox="0 0 360 70" className="w-full h-full" preserveAspectRatio="none">
              {/* Horizontal guides */}
              {[17,35,52].map(y => (
                <line key={y} x1="0" y1={y} x2="360" y2={y} stroke="white" strokeWidth="0.5" opacity="0.03" />
              ))}
              {/* Volume — smooth blue area */}
              <path d="M0,58 C30,52 60,44 90,38 S150,24 180,28 S240,18 270,14 S330,10 360,8"
                fill="none" stroke="#378ADD" strokeWidth="1.5" opacity={show ? '0.7' : '0'}
                style={{ transition: 'opacity 1.5s ease 0.4s' }} />
              <path d="M0,58 C30,52 60,44 90,38 S150,24 180,28 S240,18 270,14 S330,10 360,8 L360,70 L0,70 Z"
                fill="url(#areaBlue)" opacity={show ? '1' : '0'}
                style={{ transition: 'opacity 1.5s ease 0.4s' }} />
              {/* Intensity — smooth green line */}
              <path d="M0,65 C30,62 60,56 90,50 S150,42 180,36 S240,26 270,20 S330,12 360,6"
                fill="none" stroke="#c8f700" strokeWidth="1.5" opacity={show ? '0.8' : '0'}
                style={{ transition: 'opacity 1.8s ease 0.6s' }} />
              <path d="M0,65 C30,62 60,56 90,50 S150,42 180,36 S240,26 270,20 S330,12 360,6 L360,70 L0,70 Z"
                fill="url(#areaGreen)" opacity={show ? '1' : '0'}
                style={{ transition: 'opacity 1.8s ease 0.6s' }} />
              {/* Dot on latest point */}
              <circle cx="360" cy="8" r="3" fill="#378ADD" opacity={show ? '0.8' : '0'} style={{ transition: 'opacity 2s ease 0.8s' }} />
              <circle cx="360" cy="6" r="3" fill="#c8f700" opacity={show ? '0.9' : '0'} style={{ transition: 'opacity 2s ease 1s' }} />
              <defs>
                <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#378ADD" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#378ADD" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8f700" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#c8f700" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Legend + status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ animation: 'pulse2 2s ease infinite', background: '#c8f700' }} />
              <span className="text-[11px] text-white/30">{t('auth.visual.optimal_zone')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] text-white/20"><span className="w-3 h-[1.5px] rounded-full bg-[#378ADD]" />VOL</span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/20"><span className="w-3 h-[1.5px] rounded-full bg-[#c8f700]" />INT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat pills — horizontal, minimal */}
      <div className="flex gap-2 mb-8" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(16px)', transition: 'all 0.6s cubic-bezier(0.2,0,0,1) 0.2s' }}>
        {[
          { val: '17', label: t('landing.hero.stats.models') },
          { val: '6', label: t('landing.hero.stats.controls') },
          { val: '150+', label: t('landing.hero.stats.exercises') },
        ].map((c, i) => (
          <div key={i} className="flex-1 py-3 rounded-xl text-center cursor-default transition-all duration-300 hover:-translate-y-0.5" style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,247,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(200,247,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
          >
            <div className="text-[20px] font-black text-[#c8f700] leading-none" style={{ fontFamily: BC }}>{c.val}</div>
            <div className="text-[9px] text-white/20 mt-1.5 font-medium">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Social proof — ultra minimal */}
      <div className="flex items-center gap-3" style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(12px)', transition: 'all 0.6s cubic-bezier(0.2,0,0,1) 0.3s' }}>
        <div className="flex -space-x-2.5 flex-shrink-0">
          {['#c8f700','#378ADD','#E24B4A','#7F77DD','#10B981'].map((bg, i) => (
            <div key={i} className="w-7 h-7 rounded-full border-2" style={{ background: bg, borderColor: '#060910', opacity: 1 - i * 0.1 }} />
          ))}
        </div>
        <div>
          <p className="text-[11px] font-medium text-white/50">{t('auth.visual.active_coaches')}</p>
          <p className="text-[10px] text-white/20">{t('auth.visual.new_coaches')}</p>
        </div>
      </div>
    </div>

    <style>{`
      @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      @keyframes pulse2 { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
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

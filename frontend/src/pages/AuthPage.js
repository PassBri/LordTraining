import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Mail, Lock, User, Loader2, Eye, EyeOff, Shield, Users, Dumbbell, UserCheck, UserCircle, BarChart3, Calendar, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BC = "'Barlow Condensed', sans-serif";
const INT = "'Inter', sans-serif";

const USER_ROLES = [
  { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema', icon: Shield },
  { id: 'coach', name: 'Entrenador', description: 'Puede crear planes para múltiples atletas', icon: UserCheck },
  { id: 'personal_trainer', name: 'Entrenador Personal', description: 'Enfocado en clientes individuales', icon: Dumbbell },
  { id: 'athlete', name: 'Atleta', description: 'Solo puede ver su propio plan', icon: User },
  { id: 'team', name: 'Equipo', description: 'Grupo de atletas con plan compartido', icon: Users },
  { id: 'user', name: 'Usuario', description: 'Rol básico sin atletas asignados', icon: UserCircle }
];

/* Right panel visual — mini dashboard preview + periodization bars */
const AuthVisual = () => (
  <div className="relative h-full flex flex-col justify-center items-center px-12">
    {/* Background track lanes */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.04]">
      <svg viewBox="0 0 400 800" className="w-full h-full" preserveAspectRatio="none">
        {[0,1,2,3,4,5,6].map(i => (
          <path key={i} d={`M ${200+i*30} 0 Q ${440+i*30} 400 ${200+i*30} 800`} fill="none" stroke="white" strokeWidth="1" />
        ))}
      </svg>
    </div>

    {/* Content */}
    <div className="relative z-10 w-full max-w-sm">
      {/* Mini dashboard mockup */}
      <div className="bg-[#151d2e] rounded-xl border border-slate-700/20 overflow-hidden shadow-2xl shadow-black/40 mb-8">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a2436] border-b border-slate-700/20">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff5f57]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#febc2e]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex items-center gap-1 ml-2">
            <div className="w-3 h-3 bg-[#CCFF00] rounded flex items-center justify-center">
              <span className="text-[4px] font-black text-slate-900">T</span>
            </div>
            <span className="text-[7px] font-bold text-white/70" style={{ fontFamily: BC }}>TRAIN</span>
          </div>
        </div>
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-[#1a2436] rounded-lg p-2 border border-slate-700/10">
              <div className="text-[6px] text-slate-500">Readiness</div>
              <div className="text-sm font-black text-emerald-400 leading-none" style={{ fontFamily: BC }}>85%</div>
            </div>
            <div className="bg-[#1a2436] rounded-lg p-2 border border-slate-700/10">
              <div className="text-[6px] text-slate-500">Ratio A:C</div>
              <div className="text-sm font-black text-white leading-none" style={{ fontFamily: BC }}>1.18</div>
            </div>
            <div className="bg-[#1a2436] rounded-lg p-2 border border-slate-700/10">
              <div className="text-[6px] text-slate-500">Adherencia</div>
              <div className="text-sm font-black text-[#CCFF00] leading-none" style={{ fontFamily: BC }}>92%</div>
            </div>
          </div>
          <div className="bg-[#1a2436] rounded-lg p-2 border border-slate-700/10">
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className="w-2 h-2 text-blue-400" />
              <span className="text-[6px] font-semibold text-white/70">Volumen e Intensidad</span>
            </div>
            <div className="flex items-end gap-[2px] h-8">
              {[[45,35],[50,40],[55,45],[48,52],[60,50],[70,55],[65,68],[72,60],[55,48],[50,45],[62,55],[68,58]].map((b,i) => (
                <div key={i} className="flex-1 flex items-end gap-[1px]">
                  <div className="flex-1 bg-blue-400 rounded-t-[1px]" style={{ height: `${b[0]}%` }} />
                  <div className="flex-1 bg-[#CCFF00] rounded-t-[1px]" style={{ height: `${b[1]}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="text-center">
        <h2 className="text-[22px] font-bold text-white mb-2" style={{ fontFamily: INT, textTransform: 'none' }}>
          Entrena con ciencia
        </h2>
        <p className="text-[13px] text-slate-400 leading-relaxed mb-6">
          17 modelos de periodización, 6 controles científicos y asistente de IA. Todo en un solo sistema.
        </p>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6">
        {[{ v: '17', l: 'Modelos' }, { v: '6', l: 'Controles' }, { v: '150+', l: 'Ejercicios' }].map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-[20px] font-black text-[#CCFF00] leading-none" style={{ fontFamily: BC }}>{s.v}</div>
            <div className="text-[10px] text-slate-500 mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Periodization bars decoration */}
      <div className="mt-8 flex items-end gap-[2px] h-10 opacity-30">
        {Array.from({ length: 30 }, (_, i) => {
          const p = (i / 30) * Math.PI * 2;
          const h = Math.max(15, Math.min(95, 30 + Math.sin(p) * 25 + Math.cos(p * 1.5) * 20));
          return (
            <div key={i} className="flex-1 rounded-t-sm" style={{
              height: `${h}%`,
              background: i % 4 === 0 ? '#007AFF' : i % 4 === 1 ? '#CCFF00' : i % 4 === 2 ? '#1e293b' : '#475569',
            }} />
          );
        })}
      </div>
    </div>
  </div>
);

const AuthPage = () => {
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(registerEmail, registerPassword, registerName, registerRole);
      toast.success('Cuenta creada. Ahora inicia sesión.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrarse');
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

          {/* Back + Logo */}
          <div className="flex items-center justify-between mb-10">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-[#CCFF00] font-black text-[12px]">T</span>
              </div>
              <span className="text-[16px] font-bold tracking-tight text-slate-900" style={{ fontFamily: BC }}>
                TR<span className="text-[#007AFF]">AI</span>N
              </span>
            </Link>
            <Link to="/" className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver
            </Link>
          </div>

          {/* Title */}
          <h1 className="text-[24px] font-bold text-slate-900 mb-1" style={{ fontFamily: INT }}>
            Bienvenido a TrAIn
          </h1>
          <p className="text-[14px] text-slate-500 mb-1">
            Planifica, controla y alcanza el máximo rendimiento
          </p>
          <p className="text-[12px] text-slate-400 mb-7">
            14 días gratis · <span className="text-[#007AFF]">Ver planes desde $9/mes</span>
          </p>

          {/* Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-lg h-10">
              <TabsTrigger
                value="login"
                className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                data-testid="login-tab"
              >
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-md text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900"
                data-testid="register-tab"
              >
                Registrarse
              </TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-[13px] text-slate-600 font-medium">Email</Label>
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
                  <Label htmlFor="login-password" className="text-[13px] text-slate-600 font-medium">Contraseña</Label>
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
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold rounded-lg"
                  disabled={isLoading}
                  data-testid="login-submit-btn"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Iniciar sesión
                </Button>
              </form>
              <p className="text-center text-[12px] text-slate-400 mt-6">
                ¿No tienes cuenta?{' '}
                <button onClick={() => document.querySelector('[data-testid="register-tab"]').click()} className="text-[#007AFF] hover:underline font-medium">
                  Empieza tu prueba gratuita
                </button>
              </p>
            </TabsContent>

            {/* REGISTER */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="register-name" className="text-[13px] text-slate-600 font-medium">Nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      className={inputClass}
                      data-testid="register-name-input"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-email" className="text-[13px] text-slate-600 font-medium">Email</Label>
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
                  <Label htmlFor="register-password" className="text-[13px] text-slate-600 font-medium">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
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
                  <Label className="text-[13px] text-slate-600 font-medium">Tipo de cuenta</Label>
                  <Select value={registerRole} onValueChange={setRegisterRole}>
                    <SelectTrigger className="h-11 border-slate-200 focus:border-[#007AFF] rounded-lg bg-white text-[14px]" data-testid="register-role-select">
                      <SelectValue placeholder="Selecciona tu rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map(role => {
                        const IconComponent = role.icon;
                        return (
                          <SelectItem key={role.id} value={role.id} className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <IconComponent className="w-4 h-4 text-[#007AFF]" />
                              <div>
                                <div className="text-[13px] font-medium">{role.name}</div>
                                <div className="text-[11px] text-slate-400">{role.description}</div>
                              </div>
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
                  Crear cuenta
                </Button>
              </form>
              <p className="text-center text-[11px] text-slate-400 mt-5">
                Al continuar, aceptas nuestros <span className="text-[#007AFF]">Términos</span> y <span className="text-[#007AFF]">Privacidad</span>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right — Visual panel */}
      <div className="hidden lg:flex w-[55%] bg-slate-900 flex-col relative overflow-hidden">
        <AuthVisual />
      </div>
    </div>
  );
};

export default AuthPage;

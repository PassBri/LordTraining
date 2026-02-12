import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Target, Mail, Lock, User, Loader2, Eye, EyeOff, Shield, Users, Dumbbell, UserCheck, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

// Roles disponibles con sus descripciones e iconos
const USER_ROLES = [
  { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema', icon: Shield },
  { id: 'coach', name: 'Entrenador', description: 'Puede crear planes para múltiples atletas', icon: UserCheck },
  { id: 'personal_trainer', name: 'Entrenador Personal', description: 'Enfocado en clientes individuales', icon: Dumbbell },
  { id: 'athlete', name: 'Atleta', description: 'Solo puede ver su propio plan', icon: User },
  { id: 'team', name: 'Equipo', description: 'Grupo de atletas con plan compartido', icon: Users },
  { id: 'user', name: 'Usuario', description: 'Rol básico sin atletas asignados', icon: UserCircle }
];

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
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

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-gradient-to-br from-white via-slate-50 to-blue-50/30">
        <div className="max-w-md w-full mx-auto">
          {/* Logo - Material Design */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-800">
              Tr<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">AI</span>n
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido a TrAIn</h1>
          <p className="text-slate-500 mb-2">Planifica, optimiza y alcanza el máximo rendimiento</p>
          <p className="text-sm text-slate-400 mb-8">
            14 días gratis • <Link to="/pricing" className="text-indigo-600 hover:underline">Ver planes desde $9/mes</Link>
          </p>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1.5 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md font-medium" data-testid="login-tab">
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md font-medium" data-testid="register-tab">
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-600 font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="pl-10 h-12 border-slate-200 focus:border-indigo-500 rounded-xl bg-white shadow-sm"
                      data-testid="login-email-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-600 font-medium">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="pl-10 pr-10 h-12 border-slate-200 focus:border-indigo-500 rounded-xl bg-white shadow-sm"
                      data-testid="login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <button type="button" className="text-sm text-slate-500 hover:text-indigo-600">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white font-medium rounded-xl shadow-lg" 
                  disabled={isLoading}
                  data-testid="login-submit-btn"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Ingresar
                </Button>
              </form>
              <p className="text-center text-sm text-slate-500 mt-6">
                ¿No tienes una cuenta? <button onClick={() => document.querySelector('[data-testid="register-tab"]').click()} className="text-indigo-600 hover:underline font-medium">Empieza tu prueba gratuita</button>
              </p>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-slate-600 font-medium">Nombre completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      className="pl-10 h-12 border-slate-200 focus:border-indigo-500 rounded-xl bg-white shadow-sm"
                      data-testid="register-name-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-slate-600 font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      className="pl-10 h-12 border-slate-200 focus:border-indigo-500 rounded-xl bg-white shadow-sm"
                      data-testid="register-email-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-slate-600 font-medium">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-10 h-12 border-slate-200 focus:border-indigo-500 rounded-xl bg-white shadow-sm"
                      data-testid="register-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                {/* Selector de Rol - Material Design */}
                <div className="space-y-2">
                  <Label className="text-slate-600 font-medium">Tipo de cuenta</Label>
                  <Select value={registerRole} onValueChange={setRegisterRole}>
                    <SelectTrigger className="h-12 border-slate-200 focus:border-indigo-500 rounded-xl bg-white shadow-sm" data-testid="register-role-select">
                      <SelectValue placeholder="Selecciona tu rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map(role => {
                        const IconComponent = role.icon;
                        return (
                          <SelectItem key={role.id} value={role.id} className="py-3">
                            <div className="flex items-center gap-3">
                              <IconComponent className="w-4 h-4 text-indigo-500" />
                              <div>
                                <div className="font-medium">{role.name}</div>
                                <div className="text-xs text-slate-500">{role.description}</div>
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
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg" 
                  disabled={isLoading}
                  data-testid="register-submit-btn"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Crear Cuenta
                </Button>
              </form>
              <p className="text-center text-xs text-slate-400 mt-6">
                Al continuar, aceptas nuestros <span className="text-indigo-600">Términos de servicio</span> y <span className="text-indigo-600">Política de privacidad</span>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Material Design Gradient */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white/10 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 border border-white/10 rounded-full"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Entrena más<br />inteligentemente
          </h2>
          
          {/* Illustration - Material Design */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mt-8 border border-white/20 shadow-xl">
            <div className="w-48 h-48 mx-auto relative">
              {/* Network/Graph illustration */}
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="100" cy="100" r="60" stroke="white" strokeOpacity="0.3" strokeWidth="1" fill="none" />
                <circle cx="100" cy="100" r="40" stroke="white" strokeOpacity="0.2" strokeWidth="1" fill="none" />
                <circle cx="100" cy="100" r="20" stroke="white" strokeOpacity="0.1" strokeWidth="1" fill="none" />
                
                {/* Connection lines */}
                <line x1="100" y1="100" x2="60" y2="60" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
                <line x1="100" y1="100" x2="140" y2="60" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
                <line x1="100" y1="100" x2="60" y2="140" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
                <line x1="100" y1="100" x2="140" y2="140" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
                <line x1="100" y1="100" x2="100" y2="40" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
                
                {/* Nodes */}
                <circle cx="60" cy="60" r="8" fill="white" fillOpacity="0.9" />
                <circle cx="140" cy="60" r="8" fill="white" fillOpacity="0.9" />
                <circle cx="60" cy="140" r="8" fill="white" fillOpacity="0.9" />
                <circle cx="140" cy="140" r="8" fill="white" fillOpacity="0.9" />
                <circle cx="100" cy="40" r="8" fill="white" fillOpacity="0.9" />
                
                {/* Center point - Amber accent */}
                <circle cx="100" cy="100" r="14" fill="#F59E0B" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dark mode toggle */}
        <button className="absolute top-6 right-6 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AuthPage;

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { athleteLogin, athleteRegister } from '../services/athleteApi';

const fmtErr = (d) => (typeof d === 'string' ? d : Array.isArray(d) ? d.map((e) => e.msg).join(' ') : 'Error');

const AthletePortalAuth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('code') ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState(params.get('code') || '');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      let res;
      if (mode === 'login') res = await athleteLogin(email, password);
      else res = await athleteRegister({ code: code.trim(), name, email, password });
      localStorage.setItem('athlete_token', res.data.token);
      localStorage.setItem('athlete_info', JSON.stringify(res.data.athlete));
      toast.success(mode === 'login' ? 'Bienvenido' : 'Cuenta creada');
      navigate('/atleta/panel');
    } catch (err) {
      toast.error(fmtErr(err?.response?.data?.detail) || 'No se pudo continuar');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center px-5" data-testid="athlete-auth-page">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <span className="text-2xl font-bold text-white tracking-tight">Lord<span className="text-[#CCFF00]">Training</span></span>
          <p className="text-slate-400 text-sm mt-1">Portal del Atleta</p>
        </div>
        <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-6">
          <div className="flex gap-2 mb-5">
            <button onClick={() => setMode('login')} className={`flex-1 h-9 rounded-lg text-sm font-semibold ${mode === 'login' ? 'bg-[#CCFF00] text-slate-900' : 'bg-white/5 text-slate-300'}`} data-testid="auth-tab-login">Iniciar sesión</button>
            <button onClick={() => setMode('register')} className={`flex-1 h-9 rounded-lg text-sm font-semibold ${mode === 'register' ? 'bg-[#CCFF00] text-slate-900' : 'bg-white/5 text-slate-300'}`} data-testid="auth-tab-register">Crear cuenta</button>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de invitación" required className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 placeholder:text-slate-500" data-testid="auth-code" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 placeholder:text-slate-500" data-testid="auth-name" />
              </>
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 placeholder:text-slate-500" data-testid="auth-email" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white text-sm px-3 placeholder:text-slate-500" data-testid="auth-password" />
            <button type="submit" disabled={busy} className="w-full h-11 rounded-lg bg-[#CCFF00] text-slate-900 font-semibold flex items-center justify-center gap-2" data-testid="auth-submit">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {mode === 'login' ? 'Entrar' : 'Registrarme'}
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] text-slate-500 mt-4">El código de invitación lo proporciona tu entrenador.</p>
      </div>
    </div>
  );
};

export default AthletePortalAuth;

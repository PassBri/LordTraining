import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Loader2, ArrowRight, LogIn, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;
const BC = "'Bricolage Grotesque', sans-serif";
const INT = "'Inter', sans-serif";

const PLAN_LABELS = {
  starter: 'Starter',
  basic: 'Pro',
  pro: 'Club / Academia',
  enterprise: 'Institucional',
};

const ThankYouPage = () => {
  const navigate = useNavigate();
  const token = typeof window !== 'undefined' ? localStorage.getItem('train_token') : null;
  const [status, setStatus] = useState(token ? 'checking' : 'guest'); // checking | active | pending | guest
  const [planTier, setPlanTier] = useState(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    const poll = async () => {
      try {
        const res = await axios.get(`${API}/api/billing/hotmart/subscription`, { headers });
        const sub = res.data?.subscription;
        const tier = sub?.tier || res.data?.user_subscription_tier;
        if (!cancelled && sub && (sub.status === 'active' || sub.status === 'delayed')) {
          setPlanTier(tier);
          setStatus('active');
          return;
        }
      } catch (e) { /* silent */ }
      if (cancelled) return;
      attemptsRef.current += 1;
      if (attemptsRef.current >= 6) {
        setStatus('pending');
      } else {
        setTimeout(poll, 3000);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden" style={{ background: '#070a10', fontFamily: INT }} data-testid="thankyou-page">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(700px 400px at 50% -5%, rgba(200,247,0,0.10), transparent 60%), radial-gradient(600px 500px at 100% 110%, rgba(55,138,221,0.08), transparent 55%)'
      }} />

      <div className="relative w-full max-w-[460px] text-center">
        {/* Escama logo */}
        <div className="flex justify-center mb-7">
          <div className="relative w-[92px] h-[92px] flex items-center justify-center">
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(200,247,0,0.28), transparent 70%)', filter: 'blur(14px)' }} />
            <img src="/brand/lordtraining-scale.png" alt="LordTraining" className="relative w-full h-full object-contain" />
          </div>
        </div>

        {/* Status icon + heading */}
        {status === 'checking' && (
          <>
            <div className="flex justify-center mb-4">
              <Loader2 className="w-9 h-9 text-[#CCFF00] animate-spin" />
            </div>
            <h1 className="text-white text-[30px] font-black leading-tight mb-2" style={{ fontFamily: BC }} data-testid="thankyou-title">
              ¡Gracias por tu compra!
            </h1>
            <p className="text-white/45 text-[14px] leading-relaxed">
              Estamos activando tu suscripción. Esto toma solo unos segundos…
            </p>
          </>
        )}

        {status === 'active' && (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-[#CCFF00]" strokeWidth={2} />
            </div>
            <h1 className="text-white text-[30px] font-black leading-tight mb-2" style={{ fontFamily: BC }} data-testid="thankyou-title">
              ¡Suscripción activada!
            </h1>
            <p className="text-white/55 text-[15px] leading-relaxed mb-1">
              Tu plan <span className="text-[#CCFF00] font-bold">{PLAN_LABELS[planTier] || 'Premium'}</span> ya está activo.
            </p>
            <p className="text-white/40 text-[13px] mb-8">Ya puedes disfrutar de todas las funciones.</p>
            <Button onClick={() => navigate('/dashboard')} data-testid="thankyou-dashboard-btn"
              className="w-full h-12 rounded-xl bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold text-[14px] gap-2" style={{ fontFamily: BC }}>
              Ir a mi panel <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="flex justify-center mb-4">
              <Sparkles className="w-10 h-10 text-[#CCFF00]" strokeWidth={2} />
            </div>
            <h1 className="text-white text-[30px] font-black leading-tight mb-2" style={{ fontFamily: BC }} data-testid="thankyou-title">
              ¡Gracias por tu compra!
            </h1>
            <p className="text-white/55 text-[14px] leading-relaxed mb-8">
              Tu pago fue recibido. La suscripción puede tardar un par de minutos en reflejarse.
              Entra a tu panel y, si no ves tu plan, vuelve a cargar la página en unos minutos.
            </p>
            <Button onClick={() => navigate('/dashboard')} data-testid="thankyou-dashboard-btn"
              className="w-full h-12 rounded-xl bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold text-[14px] gap-2" style={{ fontFamily: BC }}>
              Ir a mi panel <ArrowRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {status === 'guest' && (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-[#CCFF00]" strokeWidth={2} />
            </div>
            <h1 className="text-white text-[30px] font-black leading-tight mb-2" style={{ fontFamily: BC }} data-testid="thankyou-title">
              ¡Gracias por tu compra!
            </h1>
            <p className="text-white/55 text-[14px] leading-relaxed mb-8">
              Tu pago fue recibido correctamente. Inicia sesión con el mismo correo que usaste en la compra para acceder a tu plan.
            </p>
            <Button onClick={() => navigate('/auth')} data-testid="thankyou-login-btn"
              className="w-full h-12 rounded-xl bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold text-[14px] gap-2" style={{ fontFamily: BC }}>
              <LogIn className="w-4 h-4" /> Iniciar sesión
            </Button>
          </>
        )}

        <button onClick={() => navigate('/')} data-testid="thankyou-home-link"
          className="mt-6 text-white/30 hover:text-white/60 text-[12px] transition-colors">
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default ThankYouPage;

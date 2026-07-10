import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  createCheckout,
  getPaymentStatus,
  getHotmartConfig,
  createHotmartCheckout,
  getMyHotmartSubscription,
  cancelHotmartSubscription,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Check, CreditCard, Loader2, Sparkles, Users, Zap, ArrowLeft, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '9.99',
    description: 'Para entrenadores que están comenzando',
    features: [
      '5 atletas',
      '2 planes de entrenamiento',
      'Biblioteca de ejercicios completa (271 ejercicios)',
      'Exportación PDF básica',
      '10 generaciones con IA',
      'Diagnóstico y evaluaciones básicas'
    ],
    limits: { athletes: 5, plans: 2, ai: 10 },
    cta: 'Empezar ahora'
  },
  {
    id: 'basic',
    name: 'Pro',
    price: '19.99',
    description: 'Para entrenadores independientes y preparadores físicos',
    features: [
      '20 atletas',
      'Planes de entrenamiento ilimitados',
      'Biblioteca completa + pizarra táctica',
      '50 generaciones con IA',
      'Diagnóstico y evaluaciones completas',
      'Exportación PDF/Excel',
      'Soporte email'
    ],
    limits: { athletes: 20, plans: 999, ai: 50 },
    cta: 'Empezar ahora'
  },
  {
    id: 'pro',
    name: 'Club / Academia',
    price: '49.99',
    description: 'Para clubes, academias y organizaciones deportivas',
    features: [
      'Atletas ilimitados',
      'Todo lo del plan Pro',
      '150 generaciones con IA',
      'Periodización ATR completa (Issurin)',
      'Modelos y métodos avanzados',
      'Personalización de plantillas',
      'Soporte prioritario',
      'Biblioteca completa con diagramas de ejercicios'
    ],
    limits: { athletes: 999, plans: 999, ai: 150 },
    popular: true,
    cta: 'Empezar ahora'
  },
  {
    id: 'enterprise',
    name: 'Institucional',
    price: '149.99',
    description: 'Para ligas, federaciones y universidades',
    features: [
      'Múltiples entrenadores',
      'Todo ilimitado',
      'Generaciones IA ilimitadas',
      'Panel de coordinación de equipos',
      'Analítica grupal avanzada',
      'API personalizada',
      'Formación incluida',
      'Soporte 24/7',
      'Onboarding dedicado'
    ],
    limits: { athletes: 999, plans: 999, ai: 999 },
    cta: 'Empezar ahora'
  }
];

const SubscriptionPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [hotmartEnabled, setHotmartEnabled] = useState(false);
  const [hotmartConfig, setHotmartConfig] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [canceling, setCanceling] = useState(false);

  // Load Hotmart config + current subscription
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cfgRes = await getHotmartConfig();
        if (!cancelled) {
          setHotmartConfig(cfgRes.data);
          setHotmartEnabled(!!cfgRes.data?.enabled);
        }
      } catch (e) { /* silent */ }
      try {
        const subRes = await getMyHotmartSubscription();
        if (!cancelled) setActiveSub(subRes.data?.subscription || null);
      } catch (e) { /* silent */ }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.subscription]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) { pollPaymentStatus(sessionId); }
  }, [searchParams]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    if (attempts >= 5) { toast.error('No se pudo verificar el pago. Contacta soporte.'); return; }
    setCheckingPayment(true);
    try {
      const response = await getPaymentStatus(sessionId);
      if (response.data.payment_status === 'paid') {
        toast.success('¡Pago exitoso! Tu suscripción ha sido actualizada.');
        setUser(prev => ({ ...prev, subscription: response.data.plan }));
        window.history.replaceState({}, '', '/subscription');
      } else if (response.data.status === 'expired') {
        toast.error('La sesión de pago ha expirado');
      } else {
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
        return;
      }
    } catch (error) { console.warn('Error checking payment:', error); }
    finally { setCheckingPayment(false); }
  };

  const handleSubscribe = async (planId, cycle = 'monthly') => {
    if (planId === user?.subscription && cycle === (activeSub?.cycle || 'monthly')) return;
    if (!hotmartEnabled || !hotmartConfig?.tiers_configured?.[`${planId}_${cycle}`]) {
      toast.info('Los pagos estarán disponibles muy pronto. Estamos terminando la configuración con Hotmart.');
      return;
    }
    setLoading(true);
    try {
      const response = await createHotmartCheckout(planId, cycle);
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
        return;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar el pago');
    }
    finally { setLoading(false); }
  };

  const autoCheckoutRef = useRef(false);
  useEffect(() => {
    if (autoCheckoutRef.current) return;
    const auto = searchParams.get('autocheckout');
    const plan = searchParams.get('plan');
    const cyc = searchParams.get('cycle') || 'monthly';
    if (auto === '1' && plan && hotmartEnabled && hotmartConfig) {
      autoCheckoutRef.current = true;
      window.history.replaceState({}, '', '/subscription');
      handleSubscribe(plan, cyc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotmartEnabled, hotmartConfig, searchParams]);

  const handleCancel = async () => {    if (!window.confirm('¿Seguro que quieres cancelar tu suscripción? Mantendrás acceso hasta el fin del período pagado.')) return;
    setCanceling(true);
    try {
      await cancelHotmartSubscription('Cancelado por el usuario desde la app');
      toast.success('Suscripción cancelada. Tu acceso se mantendrá hasta el fin del período pagado.');
      setActiveSub(prev => prev ? { ...prev, status: 'canceled' } : prev);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo cancelar la suscripción');
    } finally {
      setCanceling(false);
    }
  };

  const [billingCycle, setBillingCycle] = useState('monthly');
  const currentPlan = PLANS.find(p => p.id === user?.subscription) || PLANS[0];

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Minimal header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[960px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-800">Suscripción</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-slate-600">{currentPlan.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-6 py-10 space-y-10">

        {/* Payment checking */}
        {checkingPayment && (
          <div className="flex items-center gap-3 p-4 bg-slate-900 text-white rounded-2xl">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div>
              <p className="font-semibold text-sm">Verificando pago...</p>
              <p className="text-xs text-slate-400">Confirmando tu transacción</p>
            </div>
          </div>
        )}

        {/* Current plan usage */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6" data-testid="current-plan-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#007AFF] mb-1">Tu plan actual</p>
              <h2 className="text-xl font-bold text-slate-900">{currentPlan.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{currentPlan.description}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-slate-900">${currentPlan.price}</span>
              <span className="text-sm text-slate-400">/mes</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Atletas</span>
                <span className="text-xs font-semibold text-slate-700">{user?.athletes_count || 0}/{currentPlan.limits.athletes === 999 ? '∞' : currentPlan.limits.athletes}</span>
              </div>
              <Progress value={Math.min(((user?.athletes_count || 0) / currentPlan.limits.athletes) * 100, 100)} className="h-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Planes</span>
                <span className="text-xs font-semibold text-slate-700">{user?.plans_count || 0}/{currentPlan.limits.plans === 999 ? '∞' : currentPlan.limits.plans}</span>
              </div>
              <Progress value={Math.min(((user?.plans_count || 0) / currentPlan.limits.plans) * 100, 100)} className="h-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> IA</span>
                <span className="text-xs font-semibold text-slate-700">{user?.ai_generations_used || 0}/{currentPlan.limits.ai === 999 ? '∞' : currentPlan.limits.ai}</span>
              </div>
              <Progress value={Math.min(((user?.ai_generations_used || 0) / currentPlan.limits.ai) * 100, 100)} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Plans grid — same style as Landing Page */}
        <div>
          <div className="text-center mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#007AFF] mb-2">Precios</p>
            <h2 className="text-[28px] font-bold text-slate-900 leading-tight">Planes y Precios</h2>
          </div>

          {/* Billing toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-slate-200 bg-white shadow-sm" data-testid="sub-billing-toggle">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all duration-300 ${billingCycle === 'monthly' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                data-testid="sub-billing-monthly-btn"
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-emerald-500 text-white shadow shadow-emerald-200' : 'text-slate-500 hover:text-slate-800'}`}
                data-testid="sub-billing-annual-btn"
              >
                Anual
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${billingCycle === 'annual' ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-700'}`}>
                  −20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === user?.subscription;
              const isUpgrade = PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === user?.subscription);
              const monthly = parseFloat(plan.price);
              const annualMonthly = (monthly * 0.8).toFixed(2);
              const annualTotal = (monthly * 0.8 * 12).toFixed(2);
              const isAnnual = billingCycle === 'annual';
              const displayPrice = isAnnual ? annualMonthly : plan.price;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 transition-shadow duration-200 ${
                    plan.popular
                      ? 'bg-slate-900 ring-1 ring-slate-700 shadow-xl'
                      : 'bg-white border border-slate-200 hover:shadow-md'
                  } ${isCurrent && !plan.popular ? 'ring-2 ring-emerald-400' : ''}`}
                  data-testid={`plan-card-${plan.id}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#007AFF] text-white text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                      Más Popular
                    </div>
                  )}
                  {isCurrent && !plan.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                      Actual
                    </div>
                  )}
                  {isCurrent && plan.popular && (
                    <div className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                      Actual
                    </div>
                  )}

                  <h3 className={`text-[15px] font-semibold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                  <p className={`text-[12px] mt-0.5 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>{plan.description}</p>

                  <div className="mt-4 mb-5 min-h-[68px]">
                    <div className="flex items-baseline" key={billingCycle}>
                      <span className={`text-[32px] font-black leading-none ${plan.popular ? 'text-[#D4AF37]' : 'text-slate-900'}`} data-testid={`sub-price-${plan.id}`}>
                        ${displayPrice}
                      </span>
                      <span className={`text-[13px] ml-1 ${plan.popular ? 'text-slate-500' : 'text-slate-400'}`}>/mes</span>
                    </div>
                    {isAnnual ? (
                      <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                        <span className={`line-through ${plan.popular ? 'text-slate-500' : 'text-slate-400'}`}>${plan.price}/mes</span>
                        <span className={plan.popular ? 'text-emerald-400 font-semibold' : 'text-emerald-600 font-semibold'}>${annualTotal}/año</span>
                      </div>
                    ) : (
                      <div className={`text-[11px] mt-1.5 ${plan.popular ? 'text-slate-500' : 'text-slate-400'}`}>
                        Anual: ahorra ${(monthly * 12 * 0.2).toFixed(2)}/año
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className={`flex items-start gap-2 text-[13px] leading-snug ${plan.popular ? 'text-slate-300' : 'text-slate-500'}`}>
                        <Check className={`w-4 h-4 flex-shrink-0 mt-[1px] ${plan.popular ? 'text-[#D4AF37]' : 'text-emerald-500'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full rounded-xl h-10 text-[12px] font-semibold ${
                      isCurrent
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : plan.popular
                          ? 'bg-[#D4AF37] text-slate-900 hover:bg-[#b8e600]'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                    disabled={isCurrent || loading || plan.id === 'free'}
                    onClick={() => handleSubscribe(plan.id, billingCycle)}
                    data-testid={`subscribe-${plan.id}`}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      'Plan Actual'
                    ) : (
                      <>
                        {isUpgrade && <CreditCard className="w-3.5 h-3.5 mr-1.5" />}
                        {plan.cta}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active subscription management (only when there is a real Hotmart subscription) */}
        {activeSub && activeSub.status === 'active' && (
          <div className="bg-white rounded-2xl border border-emerald-200 p-5" data-testid="active-subscription-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-600 mb-1">Suscripción activa</p>
                <h3 className="text-sm font-bold text-slate-900">
                  {activeSub.tier?.toUpperCase()} · {activeSub.cycle === 'annual' ? 'Anual' : 'Mensual'}
                </h3>
                {activeSub.next_charge_date && (
                  <p className="text-xs text-slate-500 mt-1">
                    Próximo cobro: <strong className="text-slate-700">{new Date(activeSub.next_charge_date).toLocaleDateString('es-CO')}</strong>
                  </p>
                )}
                {activeSub.subscriber_code && (
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">ID: {activeSub.subscriber_code}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                disabled={canceling}
                onClick={handleCancel}
                data-testid="cancel-subscription-btn"
              >
                {canceling ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                Cancelar suscripción
              </Button>
            </div>
          </div>
        )}

        {/* Hotmart info */}
        <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-[12px] text-slate-500 leading-snug">
            Pagos seguros con <strong className="text-slate-700">Hotmart</strong>. Acepta tarjetas, PSE, Nequi, Bancolombia, PayPal y más métodos locales en LATAM. Cancela cuando quieras desde tu cuenta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;

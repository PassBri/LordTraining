import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { createCheckout, getPaymentStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Check, CreditCard, Loader2, Sparkles, Users, Zap, Crown, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Para empezar a explorar',
    features: ['2 atletas', '1 plan de entrenamiento', '3 generaciones con IA', 'Exportación básica'],
    limits: { athletes: 2, plans: 1, ai: 3 }
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    description: 'Para entrenadores individuales',
    features: ['10 atletas', '5 planes de entrenamiento', '20 generaciones con IA', 'Exportación PDF', 'Soporte email'],
    limits: { athletes: 10, plans: 5, ai: 20 }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    description: 'Para profesionales',
    features: ['50 atletas', 'Planes ilimitados', '100 generaciones con IA', 'Exportación PDF/Excel', 'Soporte prioritario', 'Biblioteca completa'],
    limits: { athletes: 50, plans: 999, ai: 100 },
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    description: 'Para clubes y federaciones',
    features: ['Atletas ilimitados', 'Todo ilimitado', 'API personalizada', 'Soporte 24/7', 'Formación incluida', 'Personalización'],
    limits: { athletes: 999, plans: 999, ai: 999 }
  }
];

const SubscriptionPage = () => {
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    if (attempts >= 5) {
      toast.error('No se pudo verificar el pago. Contacta soporte si el problema persiste.');
      return;
    }

    setCheckingPayment(true);
    try {
      const response = await getPaymentStatus(sessionId);
      if (response.data.payment_status === 'paid') {
        toast.success('¡Pago exitoso! Tu suscripción ha sido actualizada.');
        setUser(prev => ({ ...prev, subscription: response.data.plan }));
        // Clear URL params
        window.history.replaceState({}, '', '/subscription');
      } else if (response.data.status === 'expired') {
        toast.error('La sesión de pago ha expirado');
      } else {
        // Continue polling
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
        return;
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (planId === 'free' || planId === user?.subscription) return;
    
    setLoading(true);
    try {
      const response = await createCheckout(planId, window.location.origin);
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar el pago');
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = PLANS.find(p => p.id === user?.subscription) || PLANS[0];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            SUSCRIPCIÓN
          </h1>
          <p className="text-slate-500 mt-1">Gestiona tu plan y facturación</p>
        </div>

        {checkingPayment && (
          <Card className="border-[#007AFF] bg-blue-50">
            <CardContent className="p-6 flex items-center gap-4">
              <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
              <div>
                <h3 className="font-bold text-slate-900">Verificando pago...</h3>
                <p className="text-sm text-slate-600">Por favor espera mientras confirmamos tu transacción</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Plan */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <Crown className="w-5 h-5 text-amber-500" />
              TU PLAN ACTUAL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Barlow Condensed' }}>
                    {currentPlan.name.toUpperCase()}
                  </h3>
                  {currentPlan.id !== 'free' && (
                    <span className="badge badge-success">Activo</span>
                  )}
                </div>
                <p className="text-slate-500">{currentPlan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-slate-900" style={{ fontFamily: 'Barlow Condensed' }}>
                  ${currentPlan.price}
                  <span className="text-base font-normal text-slate-500">/mes</span>
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Atletas
                  </span>
                  <span className="text-sm font-medium">{user?.athletes_count || 0}/{currentPlan.limits.athletes}</span>
                </div>
                <Progress value={((user?.athletes_count || 0) / currentPlan.limits.athletes) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Planes
                  </span>
                  <span className="text-sm font-medium">{user?.plans_count || 0}/{currentPlan.limits.plans === 999 ? '∞' : currentPlan.limits.plans}</span>
                </div>
                <Progress value={Math.min(((user?.plans_count || 0) / currentPlan.limits.plans) * 100, 100)} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Generaciones IA
                  </span>
                  <span className="text-sm font-medium">{user?.ai_generations_used || 0}/{currentPlan.limits.ai}</span>
                </div>
                <Progress value={((user?.ai_generations_used || 0) / currentPlan.limits.ai) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <div>
          <h2 className="text-2xl font-black text-slate-900 mb-6" style={{ fontFamily: 'Barlow Condensed' }}>
            TODOS LOS PLANES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === user?.subscription;
              const isUpgrade = PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === user?.subscription);
              
              return (
                <Card 
                  key={plan.id}
                  className={`relative ${plan.popular ? 'border-[#007AFF] border-2 shadow-lg' : 'border-slate-200'} ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
                  data-testid={`plan-card-${plan.id}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#007AFF] text-white text-xs font-bold uppercase tracking-wide px-4 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                      Actual
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Barlow Condensed' }}>
                        {plan.name.toUpperCase()}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                      <div className="mt-4">
                        <span className="text-4xl font-black text-slate-900" style={{ fontFamily: 'Barlow Condensed' }}>
                          ${plan.price}
                        </span>
                        <span className="text-slate-500">/mes</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full font-bold uppercase tracking-wide ${
                        isCurrent 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : plan.popular 
                            ? 'bg-[#007AFF] hover:bg-blue-600' 
                            : 'bg-slate-900 hover:bg-slate-800'
                      }`}
                      disabled={isCurrent || loading || plan.id === 'free'}
                      onClick={() => handleSubscribe(plan.id)}
                      data-testid={`subscribe-${plan.id}`}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCurrent ? (
                        'Plan Actual'
                      ) : plan.id === 'free' ? (
                        'Plan Gratuito'
                      ) : isUpgrade ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Actualizar
                        </>
                      ) : (
                        'Seleccionar'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment info */}
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <CreditCard className="w-6 h-6 text-slate-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Pagos seguros con Stripe</h3>
                <p className="text-sm text-slate-600">
                  Todos los pagos se procesan de forma segura a través de Stripe. 
                  No almacenamos información de tarjetas de crédito. 
                  Puedes cancelar tu suscripción en cualquier momento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionPage;

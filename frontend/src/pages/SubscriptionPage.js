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
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      {/* Header Material Design con Gradiente */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Suscripción</h1>
                <p className="text-sm text-white/70">Gestiona tu plan y facturación</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Crown className="w-5 h-5 text-amber-300" />
                <span className="font-medium">{currentPlan.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 md:p-8 lg:p-12">
        <div className="space-y-8 max-w-6xl mx-auto">

        {checkingPayment && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Verificando pago...</h3>
                <p className="text-sm text-white/80">Por favor espera mientras confirmamos tu transacción</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Plan */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Crown className="w-6 h-6" />
              Tu Plan Actual
            </CardTitle>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-3xl font-bold text-slate-900">
                    {currentPlan.name}
                  </h3>
                  {currentPlan.id !== 'free' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">Activo</span>
                  )}
                </div>
                <p className="text-slate-500">{currentPlan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-slate-900">
                  ${currentPlan.price}
                  <span className="text-lg font-normal text-slate-500">/mes</span>
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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Todos los Planes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === user?.subscription;
              const isUpgrade = PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === user?.subscription);
              
              return (
                <Card 
                  key={plan.id}
                  className={`relative border-0 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 ${
                    plan.popular ? 'ring-2 ring-indigo-500' : ''
                  } ${isCurrent ? 'ring-2 ring-emerald-500' : ''}`}
                  data-testid={`plan-card-${plan.id}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold uppercase tracking-wide px-4 py-1.5 rounded-full shadow-md">
                      Popular
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full shadow-md">
                      Actual
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-slate-900">
                          ${plan.price}
                        </span>
                        <span className="text-slate-500">/mes</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full font-medium rounded-xl h-11 transition-all ${
                        isCurrent 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : plan.popular 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md' 
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
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
        <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-800 to-slate-900 text-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Pagos seguros con Stripe</h3>
                <p className="text-sm text-white/70">
                  Todos los pagos se procesan de forma segura a través de Stripe. 
                  No almacenamos información de tarjetas de crédito. 
                  Puedes cancelar tu suscripción en cualquier momento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;

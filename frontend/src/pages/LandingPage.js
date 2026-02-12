import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Check, Target, Brain, Calendar, BarChart3, Download, Users, ArrowRight } from 'lucide-react';

const PRICING = [
  {
    name: 'Free',
    price: '0',
    description: 'Para empezar a explorar',
    features: ['2 atletas', '1 plan de entrenamiento', '3 generaciones con IA', 'Exportación básica'],
    cta: 'Comenzar Gratis',
    popular: false,
  },
  {
    name: 'Basic',
    price: '9.99',
    description: 'Para entrenadores individuales',
    features: ['10 atletas', '5 planes de entrenamiento', '20 generaciones con IA', 'Exportación PDF', 'Soporte email'],
    cta: 'Elegir Basic',
    popular: false,
  },
  {
    name: 'Pro',
    price: '29.99',
    description: 'Para entrenadores profesionales',
    features: ['50 atletas', 'Planes ilimitados', '100 generaciones con IA', 'Exportación PDF/Excel', 'Soporte prioritario'],
    cta: 'Elegir Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '99.99',
    description: 'Para clubes y federaciones',
    features: ['Atletas ilimitados', 'Todo ilimitado', 'API personalizada', 'Soporte 24/7', 'Personalización'],
    cta: 'Contactar',
    popular: false,
  },
];

const FEATURES = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'IA Generativa',
    description: 'Genera planes personalizados con GPT-5.2',
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: 'Planificación por Ciclos',
    description: 'Macrociclos, mesociclos y microciclos',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Análisis de Carga',
    description: 'Visualiza el progreso en tiempo real',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Gestión de Atletas',
    description: 'Centraliza todos tus deportistas',
  },
  {
    icon: <Download className="w-6 h-6" />,
    title: 'Exportación PDF',
    description: 'Descarga planes listos para imprimir',
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: 'Multi-Deporte',
    description: 'Fútbol, atletismo, natación y más',
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      {/* Navigation - Material Design */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Tr<span className="text-white/80">AI</span>n
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-white/80 hover:text-white transition-colors">Funciones</a>
              <a href="#pricing" className="text-sm text-white/80 hover:text-white transition-colors">Precios</a>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/auth">
                <Button variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10" data-testid="login-nav-btn">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-white text-indigo-600 hover:bg-white/90 rounded-xl shadow-md" data-testid="signup-nav-btn">
                  Comenzar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Material Design */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-2.5 rounded-full mb-6 shadow-lg">
              <Brain className="w-5 h-5" />
              <span className="text-sm font-medium">Potenciado por IA</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Planifica, optimiza y alcanza el{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">máximo rendimiento</span>
            </h1>
            
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Sistema inteligente de planificación deportiva. Genera planes personalizados con IA, 
              gestiona atletas y visualiza el progreso en tiempo real.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-12 px-8 text-base rounded-xl shadow-lg" data-testid="hero-cta-btn">
                  Comenzar Gratis
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="h-12 px-8 text-base border-slate-300 rounded-xl hover:bg-slate-50">
                  Ver Funciones
                </Button>
              </a>
            </div>

            <p className="text-sm text-slate-500 mt-6">
              14 días gratis • Sin tarjeta de crédito • Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>

      {/* Features Section - Material Design */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Todo lo que necesitas
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Herramientas potentes para llevar tu planificación deportiva al siguiente nivel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="p-6 border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center rounded-2xl mb-4 shadow-md">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Material Design */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Planes y Precios
            </h2>
            <p className="text-lg text-slate-600">
              Elige el plan que mejor se adapte a tus necesidades
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING.map((plan, index) => (
              <Card 
                key={index} 
                className={`p-6 relative border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 ${plan.popular ? 'ring-2 ring-indigo-500' : ''}`}
                data-testid={`pricing-card-${plan.name.toLowerCase()}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-md">
                    Popular
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                    <span className="text-slate-500 ml-1">/mes</span>
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

                <Link to="/auth">
                  <Button 
                    className={`w-full rounded-xl h-11 font-medium ${plan.popular ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                    data-testid={`pricing-cta-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Material Design */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Únete a miles de entrenadores que ya optimizan sus planes con IA
          </p>
          <Link to="/auth">
            <Button className="bg-white text-indigo-600 hover:bg-white/90 h-12 px-8 text-base font-medium rounded-xl shadow-lg" data-testid="cta-final-btn">
              Crear Cuenta Gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer - Material Design */}
      <footer className="py-8 px-6 bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="font-bold tracking-tight text-white">
              Tr<span className="text-blue-400">AI</span>n
            </span>
          </div>
          <p className="text-sm text-slate-400">© 2025 TrAIn. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

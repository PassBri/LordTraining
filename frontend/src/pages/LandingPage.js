import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Check, Zap, Users, Calendar, BarChart3, Download, Sparkles, ArrowRight, Menu, X } from 'lucide-react';

const SPORTS = [
  { name: 'Fútbol', icon: '⚽' },
  { name: 'Atletismo', icon: '🏃' },
  { name: 'Natación', icon: '🏊' },
  { name: 'Ciclismo', icon: '🚴' },
  { name: 'CrossFit', icon: '🏋️' },
  { name: 'Tenis', icon: '🎾' },
];

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
    features: ['50 atletas', 'Planes ilimitados', '100 generaciones con IA', 'Exportación PDF/Excel', 'Soporte prioritario', 'Biblioteca completa'],
    cta: 'Elegir Pro',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '99.99',
    description: 'Para clubes y federaciones',
    features: ['Atletas ilimitados', 'Todo ilimitado', 'API personalizada', 'Soporte 24/7', 'Formación incluida', 'Personalización'],
    cta: 'Contactar',
    popular: false,
  },
];

const FEATURES = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'IA Generativa',
    description: 'Genera planes de entrenamiento personalizados con GPT-5.2',
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: 'Planificación por Ciclos',
    description: 'Macrociclos, mesociclos y microciclos científicamente estructurados',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Análisis de Carga',
    description: 'Visualiza ACWR, volumen e intensidad en tiempo real',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Gestión de Atletas',
    description: 'Centraliza todos tus deportistas en un solo lugar',
  },
  {
    icon: <Download className="w-6 h-6" />,
    title: 'Exportación PDF',
    description: 'Descarga planes completos listos para imprimir',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Modelos de Planificación',
    description: 'ATR, Bloques, Ondulatorio, Tradicional y más',
  },
];

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
                <span className="text-white font-black text-sm" style={{ fontFamily: 'Barlow Condensed' }}>T</span>
              </div>
              <span className="font-black text-xl tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>TRAIN</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Funciones</a>
              <a href="#sports" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Deportes</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Precios</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost" className="font-semibold" data-testid="login-nav-btn">Iniciar Sesión</Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-slate-900 hover:bg-slate-800 font-bold uppercase tracking-wide" data-testid="signup-nav-btn">
                  Comenzar
                </Button>
              </Link>
            </div>

            <button 
              className="md:hidden p-2" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 p-4 space-y-4">
            <a href="#features" className="block text-sm font-medium text-slate-600">Funciones</a>
            <a href="#sports" className="block text-sm font-medium text-slate-600">Deportes</a>
            <a href="#pricing" className="block text-sm font-medium text-slate-600">Precios</a>
            <hr className="border-slate-200" />
            <Link to="/auth" className="block">
              <Button className="w-full bg-slate-900">Comenzar</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-50" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 bg-[#CCFF00]/20 text-[#65a30d] px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-wide">Potenciado por IA</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-slate-900 leading-[0.9] tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                PLANIFICA<br />
                <span className="text-[#007AFF]">ENTRENA</span><br />
                DOMINA
              </h1>
              
              <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
                Sistema inteligente de planificación deportiva. Genera planes personalizados con IA, 
                gestiona atletas y visualiza el progreso en tiempo real.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button className="bg-slate-900 hover:bg-slate-800 h-14 px-8 text-base font-bold uppercase tracking-wide" data-testid="hero-cta-btn">
                    Comenzar Gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="outline" className="h-14 px-8 text-base font-bold uppercase tracking-wide border-2">
                    Ver Funciones
                  </Button>
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1526676317768-d9b14f15615a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHwxfHxhdGhsZXRlJTIwcnVubmluZyUyMHRyYWNrJTIwc3ByaW50fGVufDB8fHx8MTc3MDY5MzM5NXww&ixlib=rb-4.1.0&q=85"
                  alt="Atleta corriendo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <div className="text-4xl font-black text-slate-900" style={{ fontFamily: 'Barlow Condensed' }}>+10K</div>
                <div className="text-sm text-slate-500 font-medium">Planes generados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
              FUNCIONES POTENTES
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Todo lo que necesitas para llevar tu planificación deportiva al siguiente nivel
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="p-8 border-slate-200 hover:border-slate-300 transition-colors group">
                <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-lg mb-6 group-hover:bg-[#007AFF] transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sports Section */}
      <section id="sports" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
              MULTI-DEPORTE
            </h2>
            <p className="text-lg text-slate-600">
              Planificación especializada para cada disciplina
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SPORTS.map((sport, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center hover:border-[#007AFF] hover:bg-blue-50/50 transition-all cursor-pointer">
                <div className="text-4xl mb-3">{sport.icon}</div>
                <div className="font-bold text-slate-900" style={{ fontFamily: 'Barlow Condensed' }}>{sport.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
              PLANES Y PRECIOS
            </h2>
            <p className="text-lg text-slate-600">
              Elige el plan que mejor se adapte a tus necesidades
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING.map((plan, index) => (
              <Card 
                key={index} 
                className={`p-6 relative ${plan.popular ? 'border-[#007AFF] border-2 shadow-lg shadow-blue-900/10' : 'border-slate-200'}`}
                data-testid={`pricing-card-${plan.name.toLowerCase()}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#007AFF] text-white text-xs font-bold uppercase tracking-wide px-4 py-1 rounded-full">
                    Popular
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-black text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-slate-900" style={{ fontFamily: 'Barlow Condensed' }}>${plan.price}</span>
                    <span className="text-slate-500">/mes</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link to="/auth">
                  <Button 
                    className={`w-full font-bold uppercase tracking-wide ${plan.popular ? 'bg-[#007AFF] hover:bg-blue-600' : 'bg-slate-900 hover:bg-slate-800'}`}
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

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6" style={{ fontFamily: 'Barlow Condensed' }}>
            COMIENZA HOY
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Únete a miles de entrenadores que ya están optimizando sus planes de entrenamiento con IA
          </p>
          <Link to="/auth">
            <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] h-14 px-10 text-base font-bold uppercase tracking-wide" data-testid="cta-final-btn">
              Crear Cuenta Gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
              <span className="text-white font-black text-sm" style={{ fontFamily: 'Barlow Condensed' }}>T</span>
            </div>
            <span className="font-black text-xl tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>TRAIN</span>
          </div>
          <p className="text-sm text-slate-500">© 2025 Sistema TRAIN. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

# iTRAIN - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento". Motor científico, persistencia MongoDB, UI premium, i18n, visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts
- **i18n**: 12 idiomas (es, en, pt, fr, de, ar, hi, ja, ko, zh, ru, id)

## Credenciales de Prueba
- email: test@train.com | password: test123456

## Lo Implementado (Sesión 12 Abr 2026 - Fork 5)

### Landing Page
- Sección Audiencias: 4 segmentos (Entrenadores, Clubes, Escuelas, Federaciones) con CTAs personalizados
- Trust Badge: "+1.200 entrenadores · 340 clubes · 18 federaciones"
- Título audiencias: "Del entrenador independiente a la federación nacional"
- "Cómo funciona" rediseñado: 6 pasos timeline vertical Material Design (Diagnóstico→Planificación→Estructura→Equipos→Ejecución→Análisis)
- Números decorativos 110px en timeline
- Carrusel de 10 testimonios: scroll horizontal, snap, flechas nav, dots, colores por segmento
- Section tags Material Design: SectionTag componente con líneas decorativas + glow verde
- Footer completo: logo + tagline, links navegación, links recursos, iconos sociales (X, LinkedIn, Instagram), barra inferior copyright

### Branding
- Logo: "i" como símbolo de marca (círculo verde lima) — consistente en nav, hero, auth, dashboard, footer
- Headline: verbos en verde lima ("Entrena con método. Compite sin límites.")
- Subtítulo: "Software de periodización deportiva" en barra full-width con animación de onda deportiva
- En fondos claros (auth, dashboard): wordmark "iTRAIN" en slate-900 sólido
- En fondos oscuros (landing): "i" verde + "TRAIN" blanco

### Auth Page
- Panel derecho rediseñado completo:
  - Typewriter headline animado (3 frases alternando)
  - Dashboard card flotante: Semana 18, 3 métricas count-up (Readiness 85, ACWR 0.87, Adherencia 94%)
  - Barras animadas con stagger delay (azul/verde/rojo)
  - Badge pulsante "3 atletas en zona óptima"
  - 3 micro-cards hover (17 Modelos, 6 Controles, 150+ Ejercicios)
  - Social proof: avatares + "+1.200 entrenadores activos"
  - Campo deportivo como marca de agua (opacity 0.03)
  - Fondo #080b12 negro azulado profundo

### i18n
- Todo el contenido nuevo traducido nativamente en 12 idiomas
- Keys: landing.audiences.*, landing.social.*, landing.howItWorks.* (6 pasos), auth.visual.*
- Testimonios: 10 textos + roles traducidos en 12 idiomas

## Sesiones Anteriores Completadas
- Fork 4: i18n fixes, crash Caracterización del Deporte, charts interactivos, hover tooltips, scroll animations
- Fork 3: Refactorización DashboardPage (5793→4763 líneas), EvaluationSection extraído
- Fork 2: Periodización completa, motor IA, calculadoras
- Fork 1: MVP base, auth, CRUD planes/equipos/atletas

## Pendiente
- P2: Warning hidratación HTML en DashboardPage.js
- P1: Refactorizar DashboardPage.js (4,433 líneas)
- P2: Refactorizar PeriodizationComplete.js (~2,500 líneas)
- P2: Implementar "Imprimir", "Compartir" y "Duplicar" para planes

## Archivos Clave
- `/app/frontend/src/pages/LandingPage.js` — Landing page principal
- `/app/frontend/src/pages/AuthPage.js` — Login/registro
- `/app/frontend/src/pages/DashboardPage.js` — Panel principal
- `/app/frontend/src/locales/*.json` — 12 archivos de traducción

# Sistema TRAIN - PRD (Product Requirements Document)

## Original Problem Statement
Crear un planificador de entrenamiento deportivo y personalizado estilo SaaS con suscripción. Debe ser:
- Multi-deporte con planes personalizados
- Modelo de suscripción (Free/Basic/Pro/Enterprise)
- Integración con Stripe y PayPal para pagos
- IA con OpenAI GPT-5.2 para generar planes
- Descargable en PDF
- Responsive web y móvil

## User Personas
1. **Entrenador Profesional**: Gestiona múltiples atletas, necesita generar planes complejos con periodización científica
2. **Preparador Físico**: Trabaja en clubes, necesita biblioteca de ejercicios y seguimiento de cargas
3. **Atleta Amateur**: Usa la app para auto-gestionar su entrenamiento con guía de IA
4. **Club Deportivo**: Necesita gestión centralizada de múltiples entrenadores y atletas

## Core Requirements (Static)
- Autenticación JWT con roles (coach/athlete)
- Sistema de suscripción con 4 niveles
- Generación de planes con IA (GPT-5.2)
- Estructura de planificación: Macrociclos → Mesociclos → Microciclos → Sesiones
- Modelos de planificación: Tradicional, ATR, Bloques, Ondulatorio, Concurrente
- Calendario interactivo de sesiones
- Biblioteca de ejercicios por deporte
- Exportación PDF de planes
- Dashboard con estadísticas y gráficos de carga

## What's Been Implemented (Feb 2025)

### UI Redesign (Feb 10, 2025)
- ✅ Auth page: Split-screen design (form izquierda, gradiente azul derecha)
- ✅ Dashboard: Nuevo layout con sidebar de chat IA
- ✅ Tabs: Datos, Periodizar, Plan-gráfico
- ✅ Gráficos: Líneas (Planificación Anual) + Radar (Perfil de Rendimiento)
- ✅ Panel Datos: Navegación expandible con 16 secciones
- ✅ Landing page: Diseño minimalista centrado

### Backend (FastAPI + MongoDB)
- ✅ Autenticación completa (registro, login, JWT)
- ✅ CRUD de atletas con límites por suscripción
- ✅ CRUD de ejercicios con biblioteca predefinida
- ✅ Estructura completa de ciclos (macro/meso/micro/sesiones)
- ✅ Competiciones por atleta
- ✅ Integración OpenAI GPT-5.2 para generación de planes
- ✅ Integración Stripe para pagos (test key)
- ✅ Dashboard con estadísticas
- ✅ Exportación PDF de planes
- ✅ Cálculo automático de carga (volumen × intensidad)
- ✅ **NEW**: Endpoint /api/training-stages para etapas del macrociclo
- ✅ **NEW**: Endpoint /api/periodization-models para modelos de periodización

### Frontend (React + Tailwind + Shadcn UI)
- ✅ Landing page con pricing
- ✅ Sistema de autenticación (login/registro)
- ✅ Dashboard con gráficos de carga (Recharts)
- ✅ Gestión de atletas (crear, listar, eliminar)
- ✅ Generador de planes con IA
- ✅ Calendario interactivo (date-fns + Shadcn Calendar)
- ✅ Biblioteca de ejercicios filtrable
- ✅ Página de suscripción con checkout Stripe
- ✅ Diseño responsive (web + móvil)
- ✅ Estilo Swiss Sport con Barlow Condensed + Inter

### Components Implemented in "Datos" Panel
- ✅ PreviousPlanAnalysis.js - Análisis del plan anterior
- ✅ SportCharacterization.js - Caracterización del deporte
- ✅ AthleteCharacterization.js - Caracterización de deportistas
- ✅ HealthRecords.js - Lesiones, enfermedades, diagnóstico
- ✅ CompetitionAnalysis.js - Análisis y calendario de competencias
- ✅ TrainingStages.js - Etapas del macrociclo (Períodos: Preparatorio, Competitivo, Transitorio)
- ✅ **NEW**: PeriodizationModels.js - Modelos de periodización (Tradicional/Matveyev, ATR/Issurin, Contemporáneo/Bondarchuk)

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Integración PayPal como método de pago alternativo
- [ ] Datos antropométricos - Formulario de medidas corporales
- [ ] Test - Sección de pruebas/evaluaciones
- [ ] Medios de entrenamiento - Biblioteca de medios

### P1 - High Priority
- [ ] Carga de entrenamiento - Gestión de cargas
- [ ] Objetivos e indicadores - KPIs deportivos
- [ ] Control de entrenamiento - Seguimiento
- [ ] Calendario de eventos - Programación
- [ ] Plantillas de planes predefinidas por deporte
- [ ] Exportación a Excel además de PDF

### P2 - Medium Priority
- [ ] App móvil nativa (React Native)
- [ ] Integración con dispositivos wearables (Garmin, Polar)
- [ ] Módulo multimedia (videos de ejercicios)
- [ ] Chat entre entrenador y atleta
- [ ] Gráfico ACWR (Acute:Chronic Workload Ratio)

### P3 - Future Enhancements
- [ ] IA más avanzada con historial de rendimiento
- [ ] Análisis predictivo de lesiones
- [ ] Marketplace de planes entre entrenadores
- [ ] White-label para clubes

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, date-fns
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, bcrypt
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Payments**: Stripe (test key configurado)
- **Fonts**: Barlow Condensed (headings), Inter (body)

## Code Architecture
```
/app
├── backend
│   ├── server.py          # Main FastAPI server with all routes
│   ├── .env               # Environment variables
│   └── requirements.txt
├── frontend
│   ├── src
│   │   ├── components
│   │   │   ├── ui/               # Shadcn components
│   │   │   ├── AthleteCharacterization.js
│   │   │   ├── CompetitionAnalysis.js
│   │   │   ├── HealthRecords.js
│   │   │   ├── PreviousPlanAnalysis.js
│   │   │   ├── SessionPlanning.js
│   │   │   ├── SportCharacterization.js
│   │   │   └── TrainingStages.js    # NEW
│   │   ├── pages
│   │   │   ├── AuthPage.js
│   │   │   ├── DashboardPage.js
│   │   │   └── LandingPage.js
│   │   ├── services/api.js
│   │   └── context/AuthContext.js
│   └── package.json
└── memory
    └── PRD.md
```

## Key API Endpoints
- `/api/auth/register`, `/api/auth/login` - Authentication
- `/api/athletes` - CRUD athletes
- `/api/exercises` - Exercise library
- `/api/macrocycles`, `/api/mesocycles`, `/api/microcycles`, `/api/sessions` - Training cycles
- `/api/competitions/analysis` - Competition analysis
- `/api/training-stages` - Macrocycle training stages (NEW)
- `/api/periodization-models` - Periodization models (Traditional, ATR, Contemporary) (NEW)
- `/api/characterization/sport`, `/api/characterization/athlete` - Characterizations
- `/api/health/records` - Health records
- `/api/plans/generate` - AI plan generation
- `/api/payments/checkout` - Stripe checkout

## Notes
- Charts in dashboard use mock data currently
- User's preferred language: Spanish


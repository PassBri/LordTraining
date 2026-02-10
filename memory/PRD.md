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
- ✅ Endpoint /api/training-stages para etapas del macrociclo
- ✅ Endpoint /api/periodization-models para modelos de periodización
- ✅ **NEW (Feb 10)**: Endpoint /api/graphic-plan para Plan Gráfico de Periodización

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
- ✅ PeriodizationModels.js - Modelos de periodización (Tradicional/Matveyev, ATR/Issurin, Contemporáneo/Bondarchuk)
- ✅ TrainingMethods.js - Métodos de entrenamiento (Estándar, Variables, Combinados)
- ✅ AnthropometricData.js - Datos antropométricos (Peso, Talla, IMC, Circunferencias, Pliegues)
- ✅ TestEvaluations.js - Test y evaluaciones deportivas (Físicos, Fuerza, Cardio, Específicos)
- ✅ TrainingLoad.js - Carga de entrenamiento con gráficos Matveyev (Volumen, Intensidad, ACWR)

### Components Implemented in "Periodizar" Panel
- ✅ **ComprehensiveTrainingPlanner.js** - Sistema integral de planificación FUSIONADO:
  - Tipo de Plan: Individual, Grupal, Ciclo Olímpico
  - **Información Básica**: Deporte, Categoría, Rango de Edad, Clasificación, Fechas, Entrenador
  - **Objetivos del Plan**: Corto plazo (1-3 meses), Medio plazo (3-6 meses), Largo plazo (6-12 meses)
  - **Componentes del Entrenamiento**: Físico General, Físico Especial, Técnico, Táctico, Teórico, Psicológico
  - **Estructura de Ciclos**: Macrociclos, Mesociclos, Microciclos
  - Secciones colapsables para mejor navegación

### NEW: Plan Gráfico de Periodización (Feb 10, 2025)
- ✅ **GraphicPlan.js** - Matriz completa de periodización visual:
  - **Información General**: Deporte, Categoría, Atleta, Entrenador, Tipo de Periodización
  - **Selector de Duración**: Ciclo Olímpico (4 años), Anual (52 sem), Semestral (26 sem), Trimestral (12 sem)
  - **Navegación por Semanas**: Botones izquierda/derecha, mostrar 12/24/36/52 semanas
  - **Sección Ciclo**: Macrociclo, Duración, Período, Fase/Etapa, Mesociclo, Mes, Microciclo
  - **Magnitud de Carga**: 5 niveles de intensidad (Muy alta 98-100%, Alta 85-95%, Media 70-80%, Baja 55-65%, Recuperación hasta 50%)
  - **Preparación**: Física general/específica, Técnica, Táctica, Psicológica, Teórica
  - **Preparación Física**: Resistencia, Fuerza, Velocidad, Coordinación, Flexibilidad
  - **Actividad**: Entrenamiento, Control de dopaje, Competencia principal/secundaria, Recuperación
  - **Monitoreo/Evaluaciones**: Control médico, físico, técnico, táctico, psicológico, teórico
  - **Celdas Interactivas**: Click para marcar niveles (escala 1-5 con colores)
  - **Persistencia MongoDB**: Guardar y cargar planes por atleta

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Calendario de eventos / Análisis de competencias (merged)
- [ ] Objetivos e indicadores - KPIs deportivos
- [ ] Control de entrenamiento - Seguimiento
- [ ] Integración PayPal como método de pago alternativo

### P1 - High Priority
- [ ] Plantillas de planes predefinidas por deporte
- [ ] Exportación a Excel además de PDF
- [ ] Gráfico ACWR (Acute:Chronic Workload Ratio) mejorado

### P2 - Medium Priority
- [ ] App móvil nativa (React Native)
- [ ] Integración con dispositivos wearables (Garmin, Polar)
- [ ] Módulo multimedia (videos de ejercicios)
- [ ] Chat entre entrenador y atleta

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
│   ├── tests/             # Pytest test files
│   ├── .env               # Environment variables
│   └── requirements.txt
├── frontend
│   ├── src
│   │   ├── components
│   │   │   ├── ui/               # Shadcn components
│   │   │   ├── AnthropometricData.js
│   │   │   ├── AthleteCharacterization.js
│   │   │   ├── CompetitionAnalysis.js
│   │   │   ├── ComprehensiveTrainingPlanner.js
│   │   │   ├── GraphicPlan.js    # NEW - Plan Gráfico de Periodización
│   │   │   ├── HealthRecords.js
│   │   │   ├── PeriodizationModels.js
│   │   │   ├── PreviousPlanAnalysis.js
│   │   │   ├── SessionPlanning.js
│   │   │   ├── SportCharacterization.js
│   │   │   ├── TestEvaluations.js
│   │   │   ├── TrainingLoad.js
│   │   │   ├── TrainingMethods.js
│   │   │   └── TrainingStages.js
│   │   ├── pages
│   │   │   ├── AuthPage.js
│   │   │   ├── DashboardPage.js
│   │   │   └── LandingPage.js
│   │   ├── services/api.js
│   │   └── context/AuthContext.js
│   └── package.json
├── test_reports/          # Testing agent reports
└── memory
    └── PRD.md
```

## Key API Endpoints
- `/api/auth/register`, `/api/auth/login` - Authentication
- `/api/athletes` - CRUD athletes
- `/api/exercises` - Exercise library
- `/api/macrocycles`, `/api/mesocycles`, `/api/microcycles`, `/api/sessions` - Training cycles
- `/api/competitions/analysis` - Competition analysis
- `/api/training-stages` - Macrocycle training stages
- `/api/periodization-models` - Periodization models
- `/api/comprehensive-plan` - Comprehensive training plan
- `/api/training-methods` - Training methods
- `/api/anthropometric` - Anthropometric data
- `/api/test-evaluations` - Test and sport evaluations
- `/api/training-load` - Training load
- `/api/graphic-plan` - **NEW** Graphic periodization plan (GET/POST)
- `/api/characterization/sport`, `/api/characterization/athlete` - Characterizations
- `/api/health/records` - Health records
- `/api/plans/generate` - AI plan generation
- `/api/payments/checkout` - Stripe checkout

## Test Credentials
- **Email**: test@train.com
- **Password**: test123456
- **Alternative**: demo@test.com / demo123

## Notes
- Charts in dashboard use mock data currently
- User's preferred language: Spanish
- Test reports at /app/test_reports/

---

## CHANGELOG

### Feb 10, 2026 - Mejoras UI/UX Material Design
- ✅ **Biblioteca de Ejercicios completada** con categorías de Fuerza, Velocidad y Resistencia
- ✅ **Colores Material Design** aplicados al sidebar del panel de Datos:
  - Registro y Caracterización: Indigo
  - Evaluación Inicial: Emerald
  - Análisis Previo: Amber
  - Definición de Objetivos: Violet
  - Planificación: Cyan
  - Control y Seguimiento: Rose
  - Herramientas: Slate
- ✅ **Secciones colapsables** - Click en los headers de sección para ocultar/mostrar contenido
- ✅ **Números removidos** de los títulos del menú (ej: "1. Atletas" → "Atletas")
- ✅ **Iconos y nombres** mantenidos en todos los elementos del menú

### Archivos Modificados
- `/app/frontend/src/pages/DashboardPage.js` - Sidebar colapsable con colores Material Design
- `/app/frontend/src/components/ExerciseLibrary.js` - Biblioteca de ejercicios completa
  - **Fuerza** (77 ejercicios) - 10 subcategorías:
    - Hombro y Brazo (Shoulder and Arm) - 9 ejercicios
    - Pierna y Glúteo (Leg and Glute) - 16 ejercicios
    - Pecho y Espalda (Chest and Back) - 6 ejercicios
    - Abdomen - 6 ejercicios
    - Oblicuos (Oblique Abs) - 3 ejercicios
    - Kettlebell Cuerpo Completo (Full Body Kettlebell) - 7 ejercicios
    - Fuerza Máxima - 6 ejercicios
    - Fuerza Explosiva / Potencia - 10 ejercicios
    - Fuerza Resistencia - 8 ejercicios
    - Fuerza Funcional - 6 ejercicios
  - **Velocidad** (40 ejercicios) - 7 subcategorías:
    - Sprints - Pruebas de Velocidad en Pista (Track Sprint Speed Tests) - 8 ejercicios
    - Sprints - Intervalos Cortos (Short Intervals) - 5 ejercicios
    - Pruebas de Velocidad en Natación (Swimming Speed Tests) - 4 ejercicios
    - Pruebas de Velocidad en Remo (Rowing Sprint Events) - 6 ejercicios
    - Velocidad de Reacción - 6 ejercicios
    - Frecuencia de Movimiento - 6 ejercicios
    - Aceleración - 5 ejercicios
  - **Resistencia** (45 ejercicios) - 9 subcategorías:
    - Carrera - Series Largas (Long Sets) - 4 ejercicios
    - Modalidades Cardiovasculares - 5 ejercicios
    - Ejercicios de Intervalos de Alta Intensidad (HIIT) - 7 ejercicios
    - Ejercicios de Resistencia Cardiovascular - 1 ejercicio
    - Eventos de Resistencia en Pista (Track Endurance Events) - 5 ejercicios
    - Eventos de Resistencia en Carretera (Road Endurance Events) - 5 ejercicios
    - Resistencia Anaeróbica - 9 ejercicios
    - Resistencia Específica - 5 ejercicios
    - Resistencia Mixta - 4 ejercicios
  - Otras categorías existentes: Movilidad Articular, Flexibilidad, Equilibrio y Estabilidad, Habilidades Motrices, Capacidades Coordinativas, Desplazamientos y Agilidad

### Archivos Modificados
- `/app/frontend/src/components/ExerciseLibrary.js` - Biblioteca de ejercicios con CRUD completo


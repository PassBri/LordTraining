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

### Feb 10, 2026 - Sistema de Periodización con Generación Automática
- ✅ **Generación Automática de Estructura Completa**:
  - Al crear un Macrociclo se generan automáticamente Mesociclos, Microciclos y Sesiones
  - Respeta principios del entrenamiento (progresión, especificidad, variabilidad, supercompensación, recuperación)
  - Semanas de descarga automáticas cada 4 semanas
- ✅ **Visualizaciones Gráficas con Recharts**:
  - Gráfico de barras: Volumen por semana (52 semanas)
  - Gráfico de áreas: Evolución Volumen vs Intensidad
  - Gráficos de torta: Distribución de componentes y Semanas por fase
- ✅ **Configuración Flexible**:
  - Duración: Anual (52 sem), Semestral (26 sem), Trimestral (13 sem)
  - Sesiones por semana: 3-7
  - Modelo de periodización: Tradicional, ATR, Por Bloques
- ✅ **Fases Automáticas**: Prep General → Prep Específico → Precompetitivo → Competitivo → Transición

### Archivos Creados/Modificados
- `/app/frontend/src/components/PeriodizationSystem.js` - Nuevo componente completo
- `/app/backend/server.py` - Endpoint POST/GET /api/periodization
- Instalado: recharts para gráficos

### Feb 10, 2026 - Backend Funcional para Panel de Datos
- ✅ **Atletas (CRUD completo)**: Crear, listar, seleccionar y eliminar atletas
- ✅ **Calendario de Eventos (CRUD)**: Crear, listar y eliminar eventos vinculados a atletas
- ✅ **Persistencia en MongoDB**: Todos los datos se guardan en la base de datos
- ✅ **Autenticación**: Todas las llamadas API usan el token `train_token`

### Archivos Modificados
- `/app/frontend/src/pages/DashboardPage.js` - Integración completa con backend API
- `/app/backend/server.py` - Endpoints ya existentes funcionando

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

### Feb 10, 2026 - Editor de Sesiones, Drag & Drop e Integración Plan Gráfico
- ✅ **Editor de Sesiones Completo**:
  - Edición inline de sesiones individuales
  - Campos editables: Día, Tipo de sesión, Duración (min), Intensidad
  - Tipos de sesión: Fuerza, Resistencia, Velocidad, Técnica, Recuperación, Táctica, Flexibilidad
  - Niveles de intensidad: Baja, Media, Alta
  - Botones de guardar (✓) y cancelar (✕)
  - Función de eliminar sesión con confirmación
  - Función de agregar nueva sesión

- ✅ **Drag and Drop de Sesiones**:
  - Implementación con HTML5 native drag API
  - Icono de arrastre (GripVertical) visible en cada tarjeta
  - Tip visual: "Arrastra las sesiones para reorganizarlas. Haz clic en una sesión para editarla."
  - Reorganización de sesiones dentro del mismo microciclo
  - Reorganización entre diferentes microciclos
  - Auto-guardado en backend al reorganizar

- ✅ **Integración PeriodizationSystem → GraphicPlan**:
  - Función `importPeriodizationData()` en GraphicPlan.js
  - Mapeo automático de datos del macrociclo a la matriz del plan gráfico
  - Transformación de fases, mesociclos y microciclos
  - Cálculo automático de niveles de intensidad (escala 1-5)
  - Distribución de preparación física según fase
  - Botón "Sincronizar" para reimportar datos
  - Badge "Datos importados" con mensaje de éxito

- ✅ **Corrección de Bug Token**:
  - GraphicPlan.js ahora usa `train_token` (antes usaba `token` incorrecto)

### Archivos Modificados
- `/app/frontend/src/components/PeriodizationSystem.js` - StructureView con editor y drag-drop (líneas 582-978)
- `/app/frontend/src/components/GraphicPlan.js` - Función importPeriodizationData, botón Sincronizar, corrección token
- `/app/frontend/src/pages/DashboardPage.js` - Pasa periodizationData al GraphicPlan, carga datos de periodización

### Test Report
- `/app/test_reports/iteration_5.json` - 100% tests pasados (30/30)

### Feb 10, 2026 - Sistema de Roles de Usuario y Modelos de Periodización
- ✅ **Sistema de Roles de Usuario**:
  - 6 roles implementados: Administrador, Entrenador, Entrenador Personal, Atleta, Equipo, Usuario
  - Selector de rol "Tipo de cuenta" en formulario de registro
  - Cada rol con nombre, descripción e ícono
  - Diálogo de "Configuración de Perfil" en dashboard para cambiar rol
  - Botón de configuración (⚙️) junto al nombre de usuario
  - Badge "Actual" para indicar rol seleccionado
  - Backend: UserRole enum, endpoints PUT /api/auth/profile, GET /api/auth/roles

- ✅ **Modelos de Periodización Completos** (13 modelos en 4 categorías):
  - **Clásicos**: Tradicional (Matveiev), ATR (Issurin), Por Bloques (Verkhoshansky)
  - **Ondulatorios**: Ondulatorio Diario, Ondulatorio Semanal
  - **Avanzados**: Péndulo (Arosiev), Campanas Estructurales (Forteza), Contemporáneo (Bondarchuk), Periodización Inversa, Táctico
  - **Específicos**: Concurrente, Conjugado (Westside), Polarizado
  - Dropdown organizado por categorías con descripciones
  - Backend: PlanningModel enum, endpoint GET /api/periodization-models-catalog

- ✅ **Ciclos de Planificación** (6 duraciones):
  - Ciclo Olímpico (4 años - 208 semanas)
  - Bianual (2 años - 104 semanas)
  - Anual (52 semanas)
  - Semestral (26 semanas)
  - Trimestral (13 semanas)
  - Mensual (4 semanas)
  - Backend: CycleDuration enum, endpoint GET /api/cycle-durations

### Archivos Modificados
- `/app/backend/server.py` - UserRole, PlanningModel, CycleDuration enums y nuevos endpoints
- `/app/frontend/src/pages/AuthPage.js` - USER_ROLES array, selector de rol en registro
- `/app/frontend/src/pages/DashboardPage.js` - USER_ROLES, Dialog de configuración de perfil
- `/app/frontend/src/components/PeriodizationSystem.js` - CYCLE_DURATIONS, PERIODIZATION_MODELS
- `/app/frontend/src/context/AuthContext.js` - Función updateUser

### Test Report
- `/app/test_reports/iteration_6.json` - 100% tests pasados (Backend: 24/24, Frontend: todas las UI features)

### Feb 10, 2026 - Editor Completo de Sesiones de Entrenamiento
- ✅ **SessionEditor Modal Completo**:
  - Se abre al hacer click en el botón de editar (lápiz) en cualquier sesión
  - Encabezado con día de sesión y selector de fecha
  
- ✅ **Sección de Objetivos de la Sesión** (6 campos):
  - Objetivo General, Objetivo Físico, Objetivo Técnico
  - Objetivo Táctico, Objetivo Psicológico, Objetivo Teórico

- ✅ **Estructura de Sesión con 3 Fases Colapsables**:
  - **Fase Inicial** (verde) - Calentamiento
  - **Fase Principal** (naranja) - Trabajo principal
  - **Fase Final** (azul) - Vuelta a la calma
  - Cada fase con botón "+ Agregar Actividad"

- ✅ **Tabla de Actividades por Fase** con 9 columnas:
  - **Medios**: Selector de ejercicios de la biblioteca (con búsqueda)
  - **Cap. Física**: Dropdown (Fuerza, Resistencia, Velocidad, Flexibilidad, etc.)
  - **Métodos**: Dropdown (Continuo, Intervalos, Series, Fartlek, etc.)
  - **Series**: Input numérico
  - **Reps**: Input de texto (ej: "10-12")
  - **Intensidad**: Slider visual con colores (verde<40%, amarillo<60%, naranja<80%, rojo>80%)
  - **Volumen**: Input de texto
  - **Proc. Org.**: Dropdown (Individual, Parejas, Grupos, Equipo, etc.)
  - **Recup.**: Input de texto (ej: "2 min")

- ✅ **Picker de Ejercicios Integrado**:
  - Campo de búsqueda
  - Muestra ejercicios de EJERCICIOS_INICIALES
  - Cada ejercicio con nombre, categoría y músculos

- ✅ **Monitoreo de Frecuencia Cardíaca**:
  - FC Reposo (bpm)
  - FC Máxima (bpm)

- ✅ **Retroalimentación**:
  - Textarea para observaciones y comentarios

- ✅ **Botones de Acción**:
  - Cancelar, Exportar, Guardar

### Archivos Creados/Modificados
- `/app/frontend/src/components/SessionEditor.js` - NUEVO: Componente completo del editor
- `/app/frontend/src/components/PeriodizationSystem.js` - Integración con SessionEditor
- `/app/frontend/src/components/ExerciseLibrary.js` - Export de EJERCICIOS_INICIALES

### Test Report
- `/app/test_reports/iteration_7.json` - 100% tests pasados (38/38 frontend)

### Feb 10, 2026 - Panel de Control (Dashboard Visual)
- ✅ **Renombrado**: "Periodizar" → "Panel de Control" con ícono LayoutDashboard
- ✅ **Cards de Estadísticas** (5 cards con gradientes coloridos):
  - Total Atletas (azul), Eventos Próximos (verde), Sesiones (naranja)
  - Macrociclos Activos (púrpura), Ejercicios en Biblioteca (rosa)
  - Cada card con icono, número grande y subtexto

- ✅ **Gráficos con Recharts**:
  - **📊 BarChart**: Volumen de Entrenamiento por Semana (Volumen Real vs Objetivo)
  - **📈 LineChart**: Progreso de Intensidad (Intensidad % vs Recuperación %)
  - **🥧 PieChart**: Distribución de Fases (Prep.General 30%, Prep.Específico 25%, etc.)
  - **📉 AreaChart**: Carga de Entrenamiento Acumulada (Carga vs Índice de Fatiga)

- ✅ **Resumen del Atleta Seleccionado** (card oscura):
  - Datos básicos (Deporte, Nivel, Edad)
  - Estado del Plan (Fase actual, Semana, Barra de progreso)
  - Próximo Evento
  - Rendimiento (Adherencia, Carga semanal, Tendencia)

- ✅ **Botones de Acciones Rápidas**:
  - Nuevo Atleta (azul), Programar Evento (verde)
  - Crear Macrociclo (púrpura), Ver Reportes (amarillo)

### Archivos Creados/Modificados
- `/app/frontend/src/components/ControlPanel.js` - NUEVO: Componente del Panel de Control
- `/app/frontend/src/pages/DashboardPage.js` - Integración y cambio de tabs

### Test Report
- `/app/test_reports/iteration_8.json` - 100% tests pasados (18/18 frontend)

### Feb 10, 2026 - Integración de Datos Reales y Exportación PDF
- ✅ **Nuevo Endpoint API - Control Panel Stats** (`GET /api/control-panel/stats`):
  - Agregación de datos de todos los atletas y periodizaciones
  - Retorna: athletes_count, volume_data, intensity_data, phase_distribution, upcoming_events
  - Badge "Datos en tiempo real" cuando los datos vienen de la API

- ✅ **Exportación PDF Personalizable** (`POST /api/control-panel/export-pdf`):
  - Modal con 4 checkboxes seleccionables:
    - Resumen del Plan de Entrenamiento
    - Gráficos de Volumen
    - Gráficos de Intensidad
    - Calendario de Sesiones y Eventos
  - Genera PDF con tablas estilizadas usando reportlab/platypus
  - Descarga automática con nombre: `reporte_train_YYYY-MM-DD.pdf`

- ✅ **Alertas Inteligentes Mejoradas**:
  - Detección de eventos próximos (< 7 días) con nombre del atleta
  - Alerta "Evento próximo (X días) - Juan García: Campeonato Nacional"
  - Alerta de baja tasa de completación (< 70%)
  - Alerta cuando no hay atletas o macrociclos activos

- ✅ **Botones de Acción Rápida Conectados**:
  - "Nuevo Atleta" → Navega a Datos > Atletas
  - "Programar Evento" → Navega a Datos > Calendario de Eventos
  - "Crear Macrociclo" → Navega a Datos > Modelos de Periodización
  - "Ver Reportes" → Abre modal de exportación PDF

- ✅ **Gráficos con Datos Reales**:
  - Volumen por Semana (S1-S12) con Objetivo vs Real
  - Intensidad % y Recuperación %
  - Distribución de Fases (Prep. General, Específico, Competitivo)
  - Carga Acumulada y Índice de Fatiga

### Archivos Creados/Modificados
- `/app/frontend/src/components/ControlPanel.js` - ACTUALIZADO: Integración con API y exportación PDF
- `/app/backend/server.py` - NUEVOS ENDPOINTS: /api/control-panel/stats, /api/control-panel/export-pdf
- `/app/backend/tests/test_control_panel.py` - NUEVO: Tests del Panel de Control

### Test Report
- `/app/test_reports/iteration_9.json` - 100% tests pasados (Backend: 10/10, Frontend: 100%)

### Feb 10, 2026 - Sistema de Periodización y Gestión de Planes
- ✅ **Cambio de nombre**: "Modelos de Periodización" → "Sistema de Periodización"
- ✅ **Wizard de Creación de Planes** (`PeriodizationWizard.js`):
  - **Paso 1**: Selección de Modelo (10 modelos en 4 categorías: Clásico, Ondulatorio, Avanzado, Específico)
  - **Paso 2**: Selección de Duración (Olímpico 4 años, Bianual, Anual, Semestral, Cuatrimestral, Trimestral)
  - **Paso 3**: Configuración (nombre, fecha inicio, sesiones/semana, competencia principal)
  - **Paso 4**: Vista de Estructura (distribución de fases, lista de mesociclos con microciclos)
  - **Paso 5**: Confirmación y guardado del plan

- ✅ **Lista de Planes** (`PlansList.js`):
  - Vista de todos los planes del atleta seleccionado
  - Barra de progreso del plan
  - Indicador de fase actual
  - Acciones: Ver detalles, Editar, Eliminar
  - Estado vacío elegante con "Crear Primer Plan"
  - Modal de confirmación para eliminar

- ✅ **Nuevos Endpoints Backend**:
  - `DELETE /api/periodization/{athlete_id}/{plan_id}` - Eliminar plan
  - `GET /api/periodization-all/{athlete_id}` - Obtener todos los planes

### Archivos Creados/Modificados
- `/app/frontend/src/components/PeriodizationWizard.js` - CREADO: Wizard de 5 pasos
- `/app/frontend/src/components/PlansList.js` - CREADO: Lista de planes con CRUD
- `/app/frontend/src/pages/DashboardPage.js` - ACTUALIZADO: Integración de nuevos componentes
- `/app/backend/server.py` - ACTUALIZADO: Endpoints DELETE y GET all plans

### Feb 11, 2026 - Sistema de Gestión de Entidades
- ✅ **EntityManager Component** (`EntityManager.js`):
  - Gestión de 6 tipos de entidades: Federación, Club, Escuela, Selección Nacional, Equipo, Liga/Torneo
  - CRUD completo para todas las entidades
  - Estadísticas por tipo con cards clickables para filtrar
  - Búsqueda de entidades por nombre
  - Modal de creación/edición con 17 campos:
    - Tipo de Entidad, Nombre, Deporte Principal, Descripción
    - Dirección, Ciudad, País, Teléfono, Email, Sitio Web
    - Representante Legal, RUC/NIT, Fecha de Fundación
    - Facebook, Instagram, Twitter/X, Entidad Padre
  - Cards de entidad con ubicación y contador de atletas
  - Modal de confirmación para eliminar

- ✅ **Integración en Dashboard**:
  - Nueva sección "ORGANIZACIÓN" (naranja) en sidebar de Datos
  - Item "Entidades" con icono Landmark
  - Renderizado de EntityManager cuando activeDataSection === 'entities'

- ✅ **Endpoints Backend** (ya existentes):
  - `GET /api/entities` - Listar todas las entidades
  - `GET /api/entities?entity_type={type}` - Filtrar por tipo
  - `GET /api/entities/{id}` - Obtener entidad por ID
  - `POST /api/entities` - Crear nueva entidad
  - `PUT /api/entities/{id}` - Actualizar entidad
  - `DELETE /api/entities/{id}` - Eliminar entidad
  - `GET /api/entities-hierarchy` - Jerarquía organizada por tipo
  - `GET /api/entities/{id}/athletes` - Atletas afiliados a entidad

### Archivos Creados/Modificados
- `/app/frontend/src/components/EntityManager.js` - Componente completo de gestión
- `/app/frontend/src/pages/DashboardPage.js` - Integración del EntityManager

### Test Report
- `/app/test_reports/iteration_10.json` - 100% tests pasados (Backend: 16/16, Frontend: 100%)

### Feb 11, 2026 - Afiliación de Atletas a Entidades
- ✅ **Formulario de Atletas Actualizado** (`DashboardPage.js`):
  - Nueva sección "AFILIACIÓN A ENTIDADES (OPCIONAL)"
  - 3 selectores de entidades:
    - 🏛️ Federación (borde y fondo amber)
    - 🏢 Club (borde y fondo blue)
    - 🏫 Escuela (borde y fondo emerald)
  - Tip de ayuda cuando no hay entidades creadas

- ✅ **Filtrado de Atletas por Entidad**:
  - Botones de filtro encima de la lista de atletas
  - Botón "Todos" para mostrar todos los atletas
  - Botones para cada entidad creada con emoji y nombre
  - Filtrado instantáneo sin recarga de página

- ✅ **Badges de Afiliación en Tarjetas de Atletas**:
  - Badges de color según tipo de entidad
  - Federación: bg-amber-100 text-amber-700 con 🏛️
  - Club: bg-blue-100 text-blue-700 con 🏢
  - Escuela: bg-emerald-100 text-emerald-700 con 🏫

### Test Report
- `/app/test_reports/iteration_11.json` - 100% tests pasados (Backend: 10/10, Frontend: 100%)

### Feb 11, 2026 - Mejoras al Plan Gráfico y Conexión de Datos

#### Gráficas Nuevas en Plan Gráfico
- ✅ **Gráfica de Magnitud de Carga y Recuperación**:
  - Selector de tipo: Barras (Matveyev), Líneas superpuestas, Áreas apiladas
  - Muestra Carga (rojo) y Recuperación (azul) por semana
  - Usa datos de la tabla de intensidad

- ✅ **Gráfica de Volumen e Intensidad por Semanas**:
  - Selector de tipo: Líneas, Barras agrupadas, Combinación (Barras + Línea)
  - Muestra Volumen (verde) e Intensidad (púrpura) por semana
  - Incluye información de mesociclo en tooltip

- ✅ **Fila de Eventos/Competencias**:
  - Nueva fila "Calendario" en la tabla del plan
  - Muestra 🏆 para competencias principales
  - Muestra 📅 para otros eventos del calendario
  - Se conecta con el calendario de eventos del atleta

#### Conexión de Datos entre Secciones
- ✅ **AthleteSummary Component** (`AthleteSummary.js`):
  - Resumen compacto del atleta seleccionado
  - Muestra datos antropométricos del atleta
  - Muestra conteo de evaluaciones/tests
  - Calcula carga recomendada basada en resultados de tests
  - Botones de navegación rápida a Plan de Entrenamiento y Plan Gráfico

- ✅ **Layout 2 Columnas en Atletas**:
  - Columna izquierda (2/3): Lista y formulario de atletas
  - Columna derecha (1/3): AthleteSummary con datos del atleta seleccionado

### Test Report
- `/app/test_reports/iteration_12.json` - 100% tests pasados (Frontend: 14/14)

### Feb 11, 2026 - Dashboard por Entidad y Alertas Inteligentes

#### Dashboard por Entidad (`EntityDashboard.js`)
- ✅ **Cards de resumen** por tipo de entidad (Federación, Club, Escuela, Selección)
- ✅ **Gráfica de distribución** de atletas por entidad (PieChart)
- ✅ **Gráfica de actividad mensual** con sesiones y evaluaciones (BarChart)
- ✅ **Próximas competencias** del calendario
- ✅ **Alertas y notificaciones** automáticas
- ✅ **Selector de entidad** para ver detalle específico
- ✅ **Vista de detalle** con lista de atletas afiliados y estadísticas

#### Alertas Inteligentes (`SmartAlerts.js`)
- ✅ **Alertas basadas en evaluaciones**:
  - Riesgo de sobreentrenamiento (descenso en resultados)
  - Evaluación pendiente (sin tests recientes)
  
- ✅ **Alertas de competencias**:
  - Competencia próxima (1-2 semanas)
  - Fase de Taper recomendada

- ✅ **Recomendaciones de carga**:
  - Aumento/reducción de carga según fase
  - Semana de descarga
  - Ajustes por calendario

#### Nuevas secciones en Sidebar
- ✅ Control y Seguimiento → "Alertas Inteligentes"
- ✅ Organización → "Dashboard Entidades"

### Test Report
- `/app/test_reports/iteration_13.json` - 100% tests pasados (Frontend: 19/19)

### Feb 11, 2026 - Bug Fix: Funcionalidad de Guardar en Caracterización y Objetivos
- ✅ **BUG CORREGIDO**: La sección "Objetivos e Indicadores" mostraba datos estáticos hardcodeados sin funcionalidad de guardado
- ✅ **Solución**: Se conectó el componente `ObjectivesIndicators.js` existente en `DashboardPage.js`
  - Importación añadida en línea 47
  - Componente usado en línea 1081 (reemplazando ~150 líneas de código estático)
- ✅ **Funcionalidades verificadas**:
  - Caracterización del Deporte (`/api/characterization/sport`) - CRUD completo
  - Caracterización del Deportista (`/api/characterization/athlete`) - CRUD completo
  - Objetivos e Indicadores (`/api/objectives`) - CRUD completo con progreso automático
- ✅ **UI mejorada**:
  - Cards de resumen (Total, Activos, Completados, Progreso Promedio)
  - Lista de objetivos con barras de progreso
  - Modal para crear/editar objetivos con indicadores
  - Botón flotante para agregar nuevos objetivos

### Archivos Modificados
- `/app/frontend/src/pages/DashboardPage.js` - Import y uso de ObjectivesIndicators

### Test Report
- `/app/test_reports/iteration_14.json` - 100% tests pasados (Backend: 10/10, Frontend: 100%)

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

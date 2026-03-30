# TrAIn - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Construir una plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento" como objeto central. Incluye motor científico, persistencia MongoDB, UI premium estilo Nike/Whoop, sistema i18n (12 idiomas + RTL), y visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts

## Estructura de Archivos Clave
```
/app
├── backend/server.py                          # API endpoints FastAPI
├── frontend/src/
│   ├── pages/DashboardPage.js                 # MEGA-COMPONENTE (~6050 líneas) - Lógica principal
│   ├── pages/LandingPage.js                   # Landing page pública
│   ├── components/PlanSidebar.js              # NEW: Sidebar de planes
│   ├── components/PeriodizationComplete.js    # Wizard creación + vista detalle de planes
│   ├── components/TrainingSystemHub.js        # Hub de periodización
│   ├── components/ControlPanel.js             # Dashboard/Panel de control
│   ├── components/LoadMetricsDashboard.js     # Dashboard ACWR/Carga
│   ├── components/LanguageSelector.js         # Selector i18n
│   ├── i18n.js                                # Configuración i18next
│   └── locales/*.json                         # 12 archivos de traducción
```

## Credenciales de Prueba
- email: test@train.com
- password: test123456

## Lo Implementado

### Sesión Actual (30 Mar 2026)
- ✅ **Sidebar de planes**: Barra lateral izquierda en sección Datos con lista de planes, búsqueda, acciones (duplicar/compartir/PDF/eliminar), colapsar/expandir
- ✅ **Flujo "Nuevo Plan" directo**: Botón navega al wizard de creación sin pantallas intermedias
- ✅ **Auto-activación de plan creado**: Al crear plan, se actualiza sidebar y se selecciona automáticamente
- ✅ **Estado vacío intuitivo**: Welcome state cuando no hay plan seleccionado

### Sesiones Anteriores
- ✅ Sistema i18n completo (12 idiomas, RTL árabe)
- ✅ Gestión avanzada de planes: Duplicar, Compartir, Imprimir PDF
- ✅ Cascade delete y deep duplication de datos
- ✅ Rediseño premium de Periodización (Macro/Meso/Micro)
- ✅ Dashboard ACWR de métricas de carga
- ✅ Arquitectura plan-céntrica completa
- ✅ Secciones de Evaluación conectadas a backend
- ✅ Dashboard integrado con plan activo
- ✅ Caracterización del Deporte (UI + backend)
- ✅ Reorganización de navegación UI

## Backlog Priorizado

### P0 (Crítico)
- Nada pendiente

### P1 (Alta prioridad)
- 🔴 Arreglar "Caracterización del Deporte" (crash recurrente 4+ forks)
- 🟡 Inicialización completa al crear Plan nuevo (documentos vacíos automáticos)
- 🟡 Verificar loadPlanData en todos los formularios
- 🟡 Refactorizar DashboardPage.js (6000+ líneas → componentes modulares)

### P2 (Media prioridad)
- Persistencia Torneos en MongoDB (actualmente localStorage)
- Sincronizar competencias con Plan Gráfico
- Refactorizar PeriodizationComplete.js (2400+ líneas)
- Eliminar componentes obsoletos (PeriodizationSystem.js, AICoachAssistant.js)
- Imprimir/Compartir/Duplicar funcionalidades avanzadas

### P3 (Mejoras futuras)
- Mini-preview al hover en sidebar de planes
- Persistencia de sesiones de entrenamiento
- Exportación de datos en múltiples formatos

## Bugs Conocidos
- ❌ "Caracterización del Deporte" crash al acceder (recurrente)

## Esquema DB
- `plans`: {name, sport, objectives, macrocycles...}
- `sports`: {name, characterization}
- `plan_evaluations`: {plan_id, type, data}
- `plan_competitions`: {plan_id, name, date}

## API Endpoints Clave
- POST/GET /api/training-plans/
- POST /api/training-plans/{plan_id}/duplicate
- GET /api/training-plans/{plan_id}/share
- GET /api/training-plans/{plan_id}/pdf
- GET /api/plan-data/{plan_id}
- POST /api/plans/{plan_id}/evaluations
- POST /api/sports/{sport_id}/characterization

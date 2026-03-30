# TrAIn - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Construir una plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento" como objeto central. Incluye motor científico, persistencia MongoDB, UI premium, sistema i18n (12 idiomas + RTL), y visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts

## Estructura de Archivos Clave
```
/app
├── backend/server.py
├── frontend/src/
│   ├── pages/DashboardPage.js                 # MEGA-COMPONENTE (~6060 líneas)
│   ├── pages/LandingPage.js
│   ├── components/PlanSidebar.js              # Sidebar de planes
│   ├── components/PeriodizationComplete.js    # Wizard + detalle de periodización
│   ├── components/TrainingSystemHub.js        # Hub (Resumen, Periodización, Carga, etc.)
│   ├── components/ControlPanel.js
│   ├── components/LoadMetricsDashboard.js     # Dashboard ACWR/Carga
│   ├── components/LanguageSelector.js
│   ├── i18n.js
│   └── locales/*.json
```

## Credenciales de Prueba
- email: test@train.com
- password: test123456

## Lo Implementado

### Sesión Actual (30 Mar 2026)
- ✅ **Sidebar de planes**: Barra lateral izquierda en sección Datos con lista, búsqueda, acciones, colapsar/expandir
- ✅ **Flujo "Nuevo Plan" directo**: Botón navega al wizard sin pantallas intermedias
- ✅ **Auto-activación de plan creado**: `await fetchTrainingPlans()` + `handleSetActivePlan` en callback
- ✅ **Estado vacío intuitivo**: Welcome state cuando no hay plan seleccionado
- ✅ **Periodización conectada al plan activo**: Al clic en "Periodización" muestra el detalle del plan seleccionado, no la lista de todos
- ✅ **Auto-selección en PeriodizationComplete**: useEffect que detecta `activePlan` y carga su detalle
- ✅ **"Volver a planes" oculto**: Cuando hay plan activo, no se muestra (sidebar maneja navegación)

### Sesiones Anteriores
- ✅ Sistema i18n completo (12 idiomas, RTL árabe)
- ✅ Gestión avanzada de planes: Duplicar, Compartir, Imprimir PDF
- ✅ Cascade delete y deep duplication
- ✅ Rediseño premium de Periodización (Macro/Meso/Micro)
- ✅ Dashboard ACWR de métricas de carga
- ✅ Arquitectura plan-céntrica completa
- ✅ Secciones de Evaluación conectadas a backend
- ✅ Dashboard integrado con plan activo

## Backlog Priorizado

### P1 (Alta prioridad)
- 🔴 Arreglar "Caracterización del Deporte" (crash recurrente 4+ forks)
- 🟡 Inicialización completa al crear Plan nuevo
- 🟡 Verificar loadPlanData en todos los formularios
- 🟡 Refactorizar DashboardPage.js (6000+ líneas)

### P2 (Media prioridad)
- Persistencia Torneos en MongoDB
- Sincronizar competencias con Plan Gráfico
- Refactorizar PeriodizationComplete.js (2400+ líneas)
- Eliminar componentes obsoletos

### P3 (Mejoras futuras)
- Mini-preview al hover en sidebar de planes
- Exportación de datos en múltiples formatos

## Bugs Conocidos
- ❌ "Caracterización del Deporte" crash al acceder (recurrente)

## API Endpoints Clave
- POST/GET /api/training-plans/
- POST /api/training-plans/{plan_id}/duplicate
- GET /api/training-plans/{plan_id}/share
- GET /api/training-plans/{plan_id}/pdf
- GET /api/plan-data/{plan_id}
- POST /api/plans/{plan_id}/evaluations
- POST /api/sports/{sport_id}/characterization

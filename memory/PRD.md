# TrAIn - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento". Motor científico, persistencia MongoDB, UI premium, i18n (12 idiomas + RTL), visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts

## Credenciales de Prueba
- email: test@train.com | password: test123456

## Lo Implementado

### Sesión Actual (30 Mar 2026)
- ✅ Sidebar de planes (barra lateral izquierda con lista, búsqueda, acciones, colapsar)
- ✅ Flujo "Nuevo Plan" directo al wizard (Deporte→Modelo→Duración→Estructura→Resumen)
- ✅ Auto-activación de plan creado (`await fetchTrainingPlans()` + `handleSetActivePlan`)
- ✅ Periodización conectada al plan activo (auto-selección con useEffect)
- ✅ Eliminada redundancia: sub-tabs directas (Resumen, Estructura, Evaluaciones, Carga, Control)
- ✅ TrainingSystemHub con `hideTabBar` prop para overview sin tabs duplicados
- ✅ "Volver a planes" oculto cuando hay plan activo
- ✅ **Top Nav Bar rediseñada con FABs redondos flotantes** (Panel, Datos, PDF, Filtros, Plan, Salir) - consistente con secciones y sub-secciones
- ✅ Mobile tabs también actualizados con estilo FAB circular

### Sesiones Anteriores
- ✅ Sistema i18n completo (12 idiomas, RTL árabe)
- ✅ Gestión avanzada de planes: Duplicar, Compartir, Imprimir PDF
- ✅ Cascade delete y deep duplication
- ✅ Rediseño premium de Periodización
- ✅ Dashboard ACWR de métricas de carga
- ✅ Arquitectura plan-céntrica completa
- ✅ Secciones de Evaluación conectadas a backend

## Backlog Priorizado

### P1
- 🔴 Arreglar "Caracterización del Deporte" (crash recurrente)
- 🟡 Inicialización completa al crear Plan nuevo
- 🟡 Verificar loadPlanData en todos los formularios
- 🟡 Refactorizar DashboardPage.js (6000+ líneas)

### P2
- Persistencia Torneos en MongoDB
- Sincronizar competencias con Plan Gráfico
- Refactorizar PeriodizationComplete.js (2400+ líneas)
- Eliminar componentes obsoletos

## Bugs Conocidos
- ❌ "Caracterización del Deporte" crash al acceder

## Archivos Clave
- `DashboardPage.js` (~6080 líneas) - navItems con period-overview/structure/tests/load/control
- `PlanSidebar.js` - sidebar de planes
- `PeriodizationComplete.js` - wizard + detalle (auto-select activePlan)
- `TrainingSystemHub.js` - overview con hideTabBar prop
- `LoadMetricsDashboard.js` - ACWR dashboard
- `TrainingControl.js` - control de rendimiento
- `TestEvaluations.js` - evaluaciones

## API Endpoints
- POST/GET /api/training-plans/
- POST /api/training-plans/{plan_id}/duplicate
- GET /api/training-plans/{plan_id}/share | /pdf
- GET /api/plan-data/{plan_id}
- POST /api/plans/{plan_id}/evaluations
- POST /api/sports/{sport_id}/characterization

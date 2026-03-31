# iTRAIN - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento". Motor científico, persistencia MongoDB, UI premium, i18n (12 idiomas + RTL), visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts

## Credenciales de Prueba
- email: test@train.com | password: test123456

## Lo Implementado

### Sesión Actual (31 Mar 2026 - Fork 2)
- **P0 COMPLETADO: Limpieza EntityManager.js**
  - Eliminada barra de búsqueda redundante
  - Eliminados grupos desplegables (Públicas/Privadas) que duplicaban info de tarjetas
  - Tarjetas de estadísticas ahora funcionan como toggle: al hacer clic se despliega lista filtrada por tipo
  - Panel filtrado muestra entidades del tipo seleccionado + botón Crear
  - Estado vacío limpio con opción "Crear primera"
  - Diseño sobrio y profesional (Material Design)

### Sesión Anterior (31 Mar 2026)
- **P0 COMPLETADO: Carga de Datos en Formularios**
  - Análisis del Plan Anterior: todos los inputs vinculados a estado `previousAnalysisData`, con save/load
  - Objetivos del Plan: todos los inputs vinculados a estado `objectivesData`, con save/load
  - Evaluaciones (médica, física, técnica, táctica, psicológica): ya poblaban desde `loadPlanData`
  - Backend actualizado: modelos con campo `data: dict` flexible
  - Testing: Backend 100% (10/10), Frontend 100%

- **COMPLETADO: Rediseño sección Atletas con FABs redondos**
  - Atletas como botones redondos flotantes (FABs) en barra horizontal scrollable
  - Formulario de registro colapsable (se abre/cierra con botón "+")
  - Perfil del atleta centrado a ancho completo con Material Design

- **COMPLETADO: Entity Manager Redesign (Fases 1, 2 y 3)**
  - Public/Private dropdown categories
  - Compact creation modal con bg-white forzado
  - Eliminación de redundancia (búsqueda + grupos desplegables)
  - Tarjetas toggle con panel filtrado

### Sesiones Anteriores
- Rebranding a iTRAIN con logo profesional
- Top Nav Bar con FABs horizontales scrollables
- Fix crash "Caracterización del Deporte"
- Iconos específicos por deporte
- Rediseño ExerciseLibrary y TrainingMethods (Material Design)
- Sistema i18n completo (12 idiomas, RTL árabe)
- Gestión avanzada de planes: Duplicar, Compartir, Imprimir PDF
- Dashboard ACWR de métricas de carga
- Arquitectura plan-céntrica completa
- Secciones de Evaluación conectadas a backend

## Backlog Priorizado

### P1
- Refactorizar `DashboardPage.js` (6100+ líneas) - extraer componentes
- Inicialización completa al crear Plan nuevo (generar documentos vacíos)
- Verificar loadPlanData en secciones restantes

### P2
- Persistencia Torneos en MongoDB
- Sincronizar competencias con Plan Gráfico
- Eliminar componentes obsoletos (PeriodizationSystem.js, AICoachAssistant.js)
- Refactorizar PeriodizationComplete.js (~2500 líneas)

### P3
- Imprimir/Compartir/Duplicar planes (parcialmente implementado)

## Endpoints Clave
- `GET /api/plan-data/{plan_id}` - datos completos del plan
- `POST /api/plan-data/previous-analysis` - guardar análisis previo
- `POST /api/plan-data/objectives` - guardar objetivos
- `POST /api/plan-data/evaluations` - guardar evaluaciones por tipo
- `GET/POST /api/training-plans/` - CRUD de planes
- `GET/POST/PUT/DELETE /api/entities` - CRUD de entidades

## Esquema DB
- `plans`: {name, sport, objectives, ...}
- `plan_objectives`: {plan_id, user_id, main_objective, data: dict}
- `plan_previous_analysis`: {plan_id, user_id, data: dict, achievements, ...}
- `plan_evaluations`: {plan_id, user_id, evaluation_type, results: dict}
- `plan_competitions`: {plan_id, user_id, name, date, importance}
- `entities`: {name, entity_type, group, sport, city, country, ...}

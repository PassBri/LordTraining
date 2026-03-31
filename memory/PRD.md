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

### Sesión Actual (31 Mar 2026 - Fork 3)
- **P0 COMPLETADO: TeamManager.js** — Nuevo componente profesional para gestión de equipos
  - CRUD completo: crear, editar, eliminar equipos con modal Material Design
  - Relaciones: Equipo → Entidad + Deporte + Atletas
  - Modal de gestión de miembros (agregar/quitar atletas del equipo)
  - Expansión de tarjeta para ver miembros asignados
  - Deporte del catálogo + entidad asociada
  - Testing: Backend 100% (12/12), Frontend 100%

- **COMPLETADO: Relación Atleta ↔ Equipo**
  - Nuevo dropdown "Equipo" en el formulario de registro de atletas
  - `team_id` enviado al backend al crear atleta
  - Atleta auto-agregado al equipo seleccionado

- **COMPLETADO: Limpieza EntityManager.js**
  - Eliminada búsqueda y grupos desplegables redundantes
  - Tarjetas como toggle con lista filtrada

- **FIX: Límite de atletas**
  - Plan FREE ampliado de 2 a 25 atletas
  - Plan BASIC de 10 a 50, PRO de 50 a 200

### Sesiones Anteriores
- Carga de datos en formularios (Análisis Plan Anterior + Objetivos)
- Rediseño sección Atletas con FABs redondos
- Entity Manager redesign (fases 1-3)
- Rebranding a iTRAIN con logo profesional
- Top Nav Bar con FABs horizontales scrollables
- Fix crash "Caracterización del Deporte"
- Sistema i18n completo (12 idiomas, RTL árabe)
- Gestión avanzada de planes: Duplicar, Compartir, Imprimir PDF
- Dashboard ACWR de métricas de carga
- Arquitectura plan-céntrica completa

## Backlog Priorizado

### P1
- Refactorizar `DashboardPage.js` (5800+ líneas) — extraer componentes
- Inicialización completa al crear Plan nuevo (generar documentos vacíos)

### P2
- Persistencia Torneos en MongoDB
- Sincronizar competencias con Plan Gráfico
- Eliminar componentes obsoletos (PeriodizationSystem.js, AICoachAssistant.js)
- Refactorizar PeriodizationComplete.js (~2500 líneas)

## Endpoints Clave
- `GET/POST/PUT/DELETE /api/teams` — CRUD equipos
- `POST/DELETE /api/teams/{team_id}/athletes/{athlete_id}` — gestionar miembros
- `GET/POST/PUT/DELETE /api/entities` — CRUD entidades
- `GET /api/plan-data/{plan_id}` — datos completos del plan
- `GET /api/sports/catalog` — catálogo de deportes
- `POST /api/athletes` — crear atleta (ahora con team_id)

## Esquema DB
- `teams`: {id, coach_id, name, sport, category, entity_id, athletes:[], affiliations:{}}
- `entities`: {id, name, entity_type, group, sport, city, country}
- `athletes`: {id, coach_id, name, sport, age, level, affiliations:[], team_id}
- `plans`: {name, sport, objectives}
- `plan_evaluations`: {plan_id, user_id, evaluation_type, results}

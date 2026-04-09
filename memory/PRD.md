# iTRAIN - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento". Motor científico, persistencia MongoDB, UI premium, i18n, visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts

## Credenciales de Prueba
- email: test@train.com | password: test123456

## Planes de Suscripción
| Plan | Precio | Atletas | Planes | IA |
|------|--------|---------|--------|-----|
| Free / Académico | $0/mes | 3 | 1 | 3 |
| Pro — Entrenador | $9.99/mes | 20 | 5 | 20 |
| Club / Academia (Popular) | $29.99/mes | Ilimitados | Ilimitados | 100 |
| Institucional | $99.99/mes | Ilimitados | Ilimitados | Ilimitados |

## Lo Implementado (Sesión 9 Abr 2026 - Fork 4)

### P0 COMPLETADO: Corregir Landing Page i18n
- Todas las claves de traducción faltantes añadidas: `landing.features.tag`, `landing.howItWorks.tag`, `landing.pricing.tag`, `landing.cta.title`, `landing.cta.desc`, `landing.cta.button`
- Textos de features actualizados para coincidir con el nuevo diseño (m1→Periodización, m2→Equipos, m8→IA)
- Traducciones añadidas a los 12 idiomas soportados
- Landing Page cinématico ahora muestra todo el texto correctamente

### COMPLETADO: Limpieza código muerto Caracterización Deporte  
- Eliminado bloque `sport-char` (~285 líneas) de DashboardPage.js — nunca era accesible via nav
- Eliminado import no usado de `SportCharacterization`
- La caracterización funciona correctamente como modal dentro de la sección "Deportes"
- **DashboardPage.js reducido: 4759 → 4470 líneas**

## Lo Implementado (Sesión 31 Mar 2026 - Fork 3)

### P1 COMPLETADO: Refactorizar DashboardPage.js
- Extraído `EvaluationSection.js` — componente que maneja los 6 tipos de evaluación (médico, físico, técnico, táctico, psicológico, teórico) con formularios y guardado
- **5793 → 4763 líneas (1030 líneas eliminadas, 18% reducción)**
- Testing: Backend 18/18 (100%), Frontend 100%

### P1 COMPLETADO: Auto-init al crear Plan
- Ya existía desde sesiones anteriores, mejorado con tipo `theoretical` en evaluaciones
- POST /api/training-plans crea automáticamente plan_data con secciones vacías

### P2 COMPLETADO: Persistencia Torneos en MongoDB  
- Migrado de localStorage a API endpoints (GET/POST/PUT/DELETE /api/tournaments)
- Callbacks de TournamentManager ahora hacen fetch al backend
- fetchTournaments() carga datos al iniciar la app

### P2 COMPLETADO: Sincronizar Competencias con Plan Gráfico
- GraphicPlan ahora acepta prop `competitions`
- Competencias del plan se mapean a semanas y aparecen en fila Eventos/Competencias
- Competencias de alta importancia se muestran con prioridad visual

### Otros completados en esta sesión
- TeamManager.js — CRUD equipos con relaciones a entidades/atletas/deportes
- Relación Atleta ↔ Equipo (dropdown en formulario)
- Limpieza EntityManager.js (tarjetas toggle sin redundancia)
- Rediseño SubscriptionPage (estilo idéntico al landing)
- Actualización planes y precios en toda la app

## Backlog Priorizado

### P1
- Continuar reduciendo DashboardPage.js (extraer secciones de Atletas, Deportes, Objetivos, Prev-Plan)

### P2
- Eliminar componentes obsoletos (PeriodizationSystem.js, AICoachAssistant.js)
- Refactorizar PeriodizationComplete.js (~2500 líneas)
- Fix: React hydration warning (<tr> inside <span>)

### P3
- Mejorar experiencia de auto-herencia (atleta hereda deporte/entidad del equipo)

## Componentes Clave
```
/app/frontend/src/components/
  ├── EvaluationSection.js    (NUEVO: maneja 6 tipos de evaluación)
  ├── TeamManager.js          (NUEVO: gestión de equipos)
  ├── EntityManager.js        (MODIFICADO: tarjetas toggle)
  ├── GraphicPlan.js          (MODIFICADO: recibe competitions prop)
  ├── AthleteSummary.js       (caracterización del deportista)
  ├── ControlPanel.js         (dashboard stats)
  └── TournamentManager.js    (torneos)
/app/frontend/src/pages/
  ├── DashboardPage.js        (4470 líneas, reducido de 4759)
  ├── LandingPage.js          (rediseño cinematográfico dark + i18n completo)
  └── SubscriptionPage.js     (rediseñado estilo landing)
```

## Endpoints Clave
- `GET/POST /api/training-plans/` — CRUD planes
- `GET /api/plan-data/{plan_id}` — datos completos del plan
- `POST /api/plan-data/evaluations` — guardar evaluación
- `GET/POST/PUT/DELETE /api/teams` — CRUD equipos  
- `POST/DELETE /api/teams/{team_id}/athletes/{athlete_id}` — miembros
- `GET/POST/PUT/DELETE /api/entities` — CRUD entidades
- `GET/POST/PUT/DELETE /api/tournaments` — CRUD torneos (MongoDB)
- `POST /api/athletes` — crear atleta (con team_id)
- `GET /api/sports/catalog` — catálogo deportes

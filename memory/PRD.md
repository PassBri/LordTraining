# iTRAIN - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento". Motor científico, persistencia MongoDB, UI premium, i18n, visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts

## Credenciales de Prueba
- email: test@train.com | password: test123456

## Planes de Suscripción (Actualizado 31 Mar 2026)
| Plan | Precio | Atletas | Planes | IA | Extras |
|------|--------|---------|--------|-----|--------|
| Free / Académico | $0/mes | 3 | 1 | 3 | 10 PDFs, export básica |
| Pro — Entrenador | $9.99/mes | 20 | 5 | 20 | PDF, soporte email |
| Club / Academia (Popular) | $29.99/mes | Ilimitados | Ilimitados | 100 | PDF/Excel, soporte prioritario, biblioteca, plantillas |
| Institucional | $99.99/mes | Ilimitados | Ilimitados | Ilimitados | Multi-coach, panel coordinador, API, 24/7, formación |

## Lo Implementado

### Sesión Actual (31 Mar 2026 - Fork 3)
- **COMPLETADO: TeamManager.js** — CRUD equipos con relaciones a entidades/atletas/deportes
- **COMPLETADO: Relación Atleta ↔ Equipo** — Dropdown equipo en formulario atletas
- **COMPLETADO: Limpieza EntityManager.js** — Tarjetas toggle sin redundancia
- **COMPLETADO: Actualización Planes y Precios** — Landing + Dashboard + Backend sincronizados
  - Nuevos nombres: Free/Académico, Pro-Entrenador, Club/Academia, Institucional
  - Nuevos precios y límites consistentes en los 3 archivos

### Sesiones Anteriores
- Carga de datos en formularios (Análisis Plan Anterior + Objetivos)
- Rediseño sección Atletas con FABs redondos
- Entity Manager redesign (fases 1-3)
- Rebranding a iTRAIN con logo profesional
- Top Nav Bar con FABs horizontales scrollables
- Sistema i18n completo (12 idiomas, RTL árabe)
- Gestión avanzada de planes: Duplicar, Compartir, Imprimir PDF
- Dashboard ACWR de métricas de carga
- Arquitectura plan-céntrica completa

## Backlog Priorizado

### P1
- Refactorizar `DashboardPage.js` (5800+ líneas) — extraer componentes
- Inicialización completa al crear Plan nuevo

### P2
- Persistencia Torneos en MongoDB
- Sincronizar competencias con Plan Gráfico
- Eliminar componentes obsoletos
- Refactorizar PeriodizationComplete.js

## Endpoints Clave
- `GET/POST/PUT/DELETE /api/teams` — CRUD equipos
- `POST/DELETE /api/teams/{team_id}/athletes/{athlete_id}` — miembros
- `GET/POST/PUT/DELETE /api/entities` — CRUD entidades
- `GET /api/plan-data/{plan_id}` — datos completos del plan
- `POST /api/athletes` — crear atleta (con team_id)
- `GET /api/sports/catalog` — catálogo deportes

## Esquema DB
- `teams`: {id, coach_id, name, sport, category, entity_id, athletes:[], affiliations:{}}
- `entities`: {id, name, entity_type, group, sport, city, country}
- `athletes`: {id, coach_id, name, sport, age, level, affiliations:[], team_id}
- `plans`: {name, sport, objectives}

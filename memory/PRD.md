# iTRAIN - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento". Motor científico, persistencia MongoDB, UI premium, i18n, visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts
- **i18n**: 12 idiomas (es, en, pt, fr, de, ar, hi, ja, ko, zh, ru, id)

## Credenciales de Prueba
- email: test@train.com | password: test123456

## Lo Implementado

### Fork 6 (12 Abr 2026) — Pizarra Táctica Interactiva + Export PNG

#### Backend
- `POST /api/tactical-board/generate` — GPT-4o-mini genera posiciones tácticas (players, arrows, cones, balls)

#### Frontend — TacticalBoardEditor.js
- Editor SVG interactivo con 6 deportes (Fútbol, Basket, Vóley, Handball, Futsal, Tenis)
- 8 herramientas: Mover, Equipo A (X), Equipo B (O), Flecha, Cono, Balón, Texto, Borrar
- Drag & Drop con event delegation (data-elid)
- Generación IA con descripción, formación y conteo de jugadores
- **Exportar PNG** para compartir por WhatsApp
- Historial undo (Ctrl+Z, 20 niveles)
- Renderizado via dangerouslySetInnerHTML para bypass de babel-metadata-plugin (SVG + span incompatibles)

#### Fix crítico
- Causa raíz: babel-metadata-plugin envolvía componentes SVG en `<span>` HTML (inválido dentro de SVG)
- Solución: Renderizar elementos como raw SVG string via dangerouslySetInnerHTML + event delegation con data-elid

### Sesiones Anteriores (Forks 1-5)
- Fork 5: Landing, AuthPage táctica rotativa, branding verde lima, SessionEditor colores
- Fork 4: i18n, charts, crash fixes
- Fork 3: Refactorización DashboardPage
- Fork 2: Periodización, motor IA
- Fork 1: MVP base

## Pendiente
- P1: Refactorizar DashboardPage.js (~4,433 líneas)
- P2: Refactorizar PeriodizationComplete.js (~2,500 líneas)
- P2: Implementar "Imprimir", "Compartir", "Duplicar" para planes
- P2: Fix HTML hydration warning en DashboardPage.js

## Archivos Clave
- `/app/frontend/src/components/TacticalBoardEditor.js`
- `/app/frontend/src/components/SessionEditor.js`
- `/app/frontend/src/components/tacticalSportsData.js`
- `/app/frontend/src/pages/LandingPage.js`
- `/app/frontend/src/pages/AuthPage.js`
- `/app/frontend/src/pages/DashboardPage.js`

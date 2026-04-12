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

### Fork 6 (12 Abr 2026) — Pizarra Táctica Interactiva

#### Backend
- **Endpoint**: `POST /api/tactical-board/generate` — Genera posiciones tácticas usando GPT-4o-mini
  - Acepta: sport, description, formation, num_team_a, num_team_b
  - Retorna: JSON con array de elements (playerX, playerO, arrow, cone, ball, text)

#### Frontend — TacticalBoardEditor.js (nuevo componente)
- Editor interactivo SVG completo con:
  - **6 deportes**: Fútbol, Básquet, Vóley, Handball, Futsal, Tenis
  - **8 herramientas**: Mover, Equipo A (X), Equipo B (O), Flecha, Cono, Balón, Texto, Borrar
  - **Drag & Drop**: Elementos arrastrables con selección visual
  - **Flechas**: Clic para inicio, clic para fin con preview en tiempo real
  - **IA Generativa**: Panel que envía descripción + conteo de jugadores al backend
  - **Historial**: Deshacer (Ctrl+Z) con stack de 20 niveles
  - **Atajos**: Delete/Backspace para borrar seleccionado, Escape para cancelar
  - **Panel lateral**: Lista de elementos con delete individual

#### Frontend — Integración en SessionEditor.js
- Sección "Pizarra Táctica" entre Estructura y Monitoreo
- Tarjeta CTA con icono + botón "Crear Pizarra" cuando no hay pizarra guardada
- Preview SVG read-only con conteo de elementos cuando hay pizarra guardada
- Botones "Editar" y "Eliminar" en la pizarra guardada
- Datos persistidos en `sessionData.tacticalBoard`

#### Archivos nuevos
- `/app/frontend/src/components/TacticalBoardEditor.js` — Editor completo
- `/app/frontend/src/components/tacticalSportsData.js` — Datos SVG compartidos

#### Fix técnico
- Parcheado `babel-metadata-plugin.js` línea 936 con null-check para evitar crash de compilación

### Sesiones Anteriores Completadas (Forks 1-5)
- Fork 5: Landing page completa (audiencias, timeline, carrusel), AuthPage con pizarra táctica rotativa, branding verde lima
- Fork 4: i18n fixes, crash Caracterización del Deporte, charts interactivos
- Fork 3: Refactorización DashboardPage (5793→4763 líneas), EvaluationSection extraído
- Fork 2: Periodización completa, motor IA, calculadoras
- Fork 1: MVP base, auth, CRUD planes/equipos/atletas

## Pendiente
- P2: Warning hidratación HTML en DashboardPage.js (pre-existente)
- P2: Nested button warning en SessionEditor.js phase headers (pre-existente)
- P1: Refactorizar DashboardPage.js (~4,433 líneas)
- P2: Refactorizar PeriodizationComplete.js (~2,500 líneas)
- P2: Implementar "Imprimir", "Compartir" y "Duplicar" para planes

## Archivos Clave
- `/app/frontend/src/components/TacticalBoardEditor.js` — Editor de pizarra táctica
- `/app/frontend/src/components/SessionEditor.js` — Editor de sesión
- `/app/frontend/src/components/tacticalSportsData.js` — Datos SVG campos deportivos
- `/app/frontend/src/pages/LandingPage.js` — Landing page principal
- `/app/frontend/src/pages/AuthPage.js` — Login/registro
- `/app/frontend/src/pages/DashboardPage.js` — Panel principal
- `/app/frontend/src/locales/*.json` — 12 archivos de traducción

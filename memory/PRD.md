# iTRAIN - Plataforma de Gestión Deportiva para Entrenadores

## Problema Original
Plataforma de gestión deportiva de alto nivel para entrenadores. Arquitectura centrada en "Plan de Entrenamiento". Motor científico, persistencia MongoDB, UI premium, i18n, visualización avanzada de periodización.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + MongoDB
- **Integraciones**: OpenAI GPT-4o-mini (Emergent LLM Key), i18next, Recharts
- **i18n**: 12 idiomas

## Credenciales de Prueba
- email: test@train.com | password: test123456

## Lo Implementado

### Fork 7 (12 Abr 2026) — Reproducir Jugada

#### Playback Engine (`tactical-board.html`)
- **Controles flotantes**: Play / Pause / Stop con barra de progreso
- **Velocidad**: 0.5x, 1x, 2x seleccionables
- **Animación secuencial**: Flechas se animan en orden de `playOrder`
- **Jugador fantasma**: El jugador más cercano al inicio de cada flecha se mueve a lo largo de ella
- **Badges de orden**: Números visibles en cada flecha durante reproducción
- **Auto-stop**: Tras completar la última flecha, mantiene frame final 1.5s y para
- **requestAnimationFrame**: Animación suave a 60fps
- Propiedad `playOrder` editable en panel de propiedades para cada flecha

### Fork 6 — Pizarra Táctica Digital Completa
- 8 categorías, 15+ campos SVG, 8 herramientas, 7 elementos
- 6 disposiciones, formaciones predefinidas, drag & drop, zoom/pan
- Exportar PNG, generación IA, undo/redo, menú contextual, atajos teclado

### Sesiones Anteriores (Forks 1-5)
- Landing page, AuthPage, branding, i18n, periodización, MVP base

## Pendiente
- P1: Refactorizar DashboardPage.js (~4,433 líneas)
- P2: Refactorizar PeriodizationComplete.js (~2,500 líneas)
- P2: Implementar "Imprimir", "Compartir", "Duplicar" para planes
- P2: Más deportes y modo gimnasio detallado
- P2: Exportar PDF/GIF
- P3: Responsive tablet/mobile

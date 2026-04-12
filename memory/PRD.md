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

### Fork 6 (12 Abr 2026) — Pizarra Táctica Digital Completa

#### Pizarra Standalone (`/tactical-board.html`)
- **8 categorías**: Conjunto, Raqueta, Contacto, Tiempo/Marca, Individuales, Orientación, Esports, Gimnasio
- **15+ campos deportivos**: Fútbol, Baloncesto, Vóley, Balonmano, Rugby, Hockey, Tenis, Pádel, Boxeo, MMA, Atletismo, Natación, Judo, LoL, Valorant, Gimnasio
- **8 herramientas de dibujo**: Mover, Lápiz libre, Línea, Curva bezier, Flecha, Zona/Área, Texto, Borrador
- **7 elementos**: Jugador A/B, Portero, Balón, Cono, Bandera, Valla
- **6 disposiciones**: Fila, Círculo, Cuadrícula, Parejas, Rombo, Triángulo (con modal de configuración)
- **Formaciones predefinidas**: Fútbol (4-3-3, 4-4-2, 3-5-2, 4-2-3-1), Baloncesto (2-3, 1-2-2, 3-2), Vóley (5-1, 4-2)
- **Canvas SVG**: Zoom (0.3x-4x), Pan (Space+drag), Grid toggle, viewBox 800x600
- **Interacción**: Drag & drop, selección rectangular, menú contextual, duplicar, traer al frente/enviar atrás
- **Undo/Redo**: 50 niveles de historia (Ctrl+Z/Y)
- **Exportar PNG**: Alta resolución 1600x1200
- **Generación IA**: Conecta con POST /api/tactical-board/generate (GPT-4o-mini)
- **Panel propiedades**: Color, tamaño, label, posición X/Y, grosor, opacidad
- **Atajos teclado**: Ctrl+Z/Y/A/D/S, Delete, Escape, Space+drag, +/-/0

#### Backend
- `POST /api/tactical-board/generate` — Parsing robusto de respuestas LLM con regex fallback

#### Integración SessionEditor
- Botón "Abrir Pizarra Completa" en SessionEditor abre la pizarra standalone en nueva pestaña
- Preview SVG read-only de pizarras guardadas en el editor inline

#### Archivos
- `/app/frontend/public/tactical-board.html` — Pizarra completa standalone (~960 líneas)
- `/app/frontend/src/components/TacticalBoardEditor.js` — Editor inline (para SessionEditor)
- `/app/frontend/src/components/tacticalSportsData.js` — Datos SVG compartidos

### Sesiones Anteriores (Forks 1-5)
- Landing page, AuthPage, branding, i18n, periodización, MVP base

## Pendiente
- P1: Refactorizar DashboardPage.js (~4,433 líneas)
- P2: Refactorizar PeriodizationComplete.js (~2,500 líneas)
- P2: Implementar "Imprimir", "Compartir", "Duplicar" para planes
- P2: Agregar más deportes (Béisbol, Fútbol Americano, Badminton, Squash, etc.)
- P2: Modo gimnasio con equipos y circuitos detallados
- P2: Función "Reproducir Jugada" con animaciones
- P2: Exportar PDF/GIF
- P3: Responsive tablet/mobile

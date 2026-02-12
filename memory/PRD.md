# TRAIN - Sports Management Platform PRD

## Original Problem Statement
Sistema de gestión deportiva TRAIN con las siguientes características principales:
- Panel de Control con gráficos interactivos
- Sistema de Torneos profesional
- Gestión de atletas, equipos y deportes
- Asistente IA de entrenamiento

## What's Been Implemented (Session: Feb 12, 2026)

### 1. Gráficos Interactivos Tipo Trading ✅
- **Componente InteractiveChart.js** con funciones avanzadas:
  - Scroll horizontal con Brush (mini gráfico)
  - Zoom con Shift + Scroll del mouse
  - Doble clic para reset
  - Crosshair/cursor vertical que sigue el mouse
  - Botones de rango rápido (Últ. 4, Últ. 8, Todo)
  - Selector de tipo de vista (barras, líneas, área, puntos, mixta)
  - Selector de período (4A, 2A, 1A, 6M, 3M, 1M, S)
  - Modo pantalla completa estilo trading
  - Tooltips oscuros con valores precisos

### 2. Zonas de Referencia en Gráficos ✅
- Gráfico "Carga de Entrenamiento Acumulada" con zonas:
  - 🔴 Sobrentrenamiento (550-700)
  - 🟢 Zona Óptima (350-550)
  - 🟡 Carga Moderada (150-350)
  - ⚪ Carga Baja (0-150)

### 3. Nuevas Visualizaciones en Panel de Control ✅
- Progreso de Objetivos (barras de progreso)
- Comparativa Semanal (métricas vs anterior)
- Radar de Capacidades Físicas (hexagonal)
- Zonas de Entrenamiento (barra apilada horizontal)
- Mini Calendario de Sesiones (mes actual)
- Próximas Competencias (lista con countdown)
- Récords Personales (tarjetas PRs)

### 4. Sistema de Torneos Profesional ✅
- **Componente TournamentManager.js** completo:
  - Wizard de 4 pasos con Material Design
  - Integración con catálogo de deportes del sistema
  - 6 formatos de torneo (Eliminación, Doble Eliminación, Round Robin, Grupos + Knockout, Liga, Sistema Suizo)
  - Bracket visual interactivo
  - Tabla de posiciones automática
  - Lista de partidos agrupada por fecha
  - Gestión de participantes
  - Categorías personalizables (Sub-12, Sub-14, etc.)
  - Acciones rápidas (Generar Fixture, Exportar PDF)
  - Compartir torneo con enlace

## Key Files Modified
- `/app/frontend/src/components/InteractiveChart.js` - Gráficos tipo trading
- `/app/frontend/src/components/ControlPanel.js` - Nuevas visualizaciones
- `/app/frontend/src/components/TournamentManager.js` - Sistema de torneos
- `/app/frontend/src/pages/DashboardPage.js` - Integración

## Architecture
```
/app/frontend/src/
├── components/
│   ├── InteractiveChart.js     # Gráficos interactivos
│   ├── ControlPanel.js         # Panel con métricas
│   ├── TournamentManager.js    # Sistema de torneos
│   └── ui/                     # ShadCN components
├── pages/
│   └── DashboardPage.js        # Dashboard principal
```

## Tech Stack
- React.js + Tailwind CSS
- Recharts (con Brush, ReferenceArea)
- ShadCN/UI components
- FastAPI backend + MongoDB

## Pending/Future Tasks

### P1 - Alta Prioridad
- [ ] Conectar Asistente IA con LLM real (GPT/Claude)
- [ ] Guardar planes generados por IA
- [ ] Conectar datos de gráficos con API real (actualmente mocked)

### P2 - Media Prioridad
- [ ] Generación automática de fixtures en backend
- [ ] Exportar torneo a PDF funcional
- [ ] Notificaciones de partidos próximos

### P3 - Baja Prioridad
- [ ] Integración con calendarios externos
- [ ] Estadísticas avanzadas por atleta
- [ ] Historial de torneos completados

## Test Credentials
- Email: test@train.com
- Password: test123456

## Mocked Data
- Datos de gráficos (volumeData, intensityData, loadData)
- Nuevas visualizaciones (objectivesProgress, weeklyComparison, etc.)
- Fixtures/partidos de torneos (generados client-side)

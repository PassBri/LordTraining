# TrAIn - Plataforma de Gestión Deportiva con IA

## Problema Original
Construir una plataforma de gestión deportiva de alto nivel con:
- Dashboard con métricas de entrenamiento
- Sistema de periodización
- Asistente IA para generación de planes
- Gestión de torneos
- Exportación de reportes PDF

## Arquitectura

### Frontend (React)
```
/app/frontend/src
├── components/
│   ├── AICoachAssistant.js      # Panel de Expertos IA (4 LLMs)
│   ├── AutoTestingSystem.js     # Sistema de auto-testing
│   ├── ControlPanel.js          # Dashboard principal
│   ├── InteractiveChart.js      # Gráficos interactivos
│   ├── TournamentManager.js     # Gestión de torneos
│   ├── PDFExportModal.js        # Exportación PDF
│   └── ui/                      # Componentes ShadCN
├── pages/
│   ├── DashboardPage.js         # Página principal
│   ├── AuthPage.js              # Login/Registro
│   └── LandingPage.js           # Landing
```

### Backend (FastAPI)
```
/app/backend
├── server.py                    # Servidor principal
├── routes/
│   └── ai_coach.py              # API Multi-Agente IA
```

## Funcionalidades Implementadas

### ✅ Sistema Multi-Agente IA (13 Feb 2025)
- **4 LLMs colaborando**:
  - GPT-5.2 (Coach Estratega) - Periodización
  - Claude Sonnet 4.5 (Analista) - Evaluación de cargas
  - Gemini 3 Flash (Ejercicios) - Metodología
  - GPT-4o-mini (Asistente) - Respuestas rápidas
- **Endpoints**:
  - `POST /api/ai-coach/chat` - Chat individual
  - `POST /api/ai-coach/panel-discussion` - Panel completo
  - `POST /api/ai-coach/generate-plan` - Generar plan
- **Wizard de 8 pasos**: Atleta → Deporte → Objetivos → Competencias → Periodización → Duración → Métodos → Generar

### ✅ Sistema de Auto-Testing (12 Feb 2025)
- Templates de carga rápida (3 modelos)
- Virtual Coach (3 niveles)
- Test automático (7 y 100 planes)
- Reportes exportables

### ✅ Dashboard Interactivo
- Gráficos estilo trading con zoom/scroll
- Readiness Score
- Ratio de carga aguda/crónica
- Widgets de análisis

### ✅ Plan Gráfico de Periodización
- Tabla de 52 semanas
- Modelos: Tradicional, ATR, Ondulante
- Exportación a imagen

### ✅ Exportación PDF
- Selección de secciones
- Múltiples formatos

### ⚠️ En Progreso
- Tournament Manager (UI completa, lógica pendiente)

## Credenciales de Test
- Email: test@train.com
- Password: test123456

## Próximas Tareas (P1)
1. Completar lógica de Tournament Manager
2. Integrar planes generados con Plan Gráfico
3. Persistir planes en MongoDB

## Backlog (P2)
- Notificaciones push
- Modo offline
- App móvil

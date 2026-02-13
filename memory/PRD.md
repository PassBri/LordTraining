# TrAIn - Sports Planning Platform

## Original Problem Statement
Build a high-end sports management platform with AI-powered training assistance, comprehensive tournament management, and advanced data visualization dashboards.

## Current Status: Active Development
Last Updated: February 13, 2026

---

## What's Been Implemented

### Core Features ✅
1. **Authentication System**
   - JWT-based login/registration
   - Role-based access control (Admin, Coach, Personal Trainer, Athlete, Team, User)

2. **Dashboard & Control Panel**
   - Material Design UI with ShadCN/UI components
   - Interactive "trading-style" charts with Recharts
   - Real-time data visualization widgets
   - Readiness Score, Training Load metrics

3. **AI Training Assistant** ✅ (Simplified Feb 2026)
   - Single LLM (GPT-4o-mini) chat interface
   - Practical suggestions for exercises, loads, recovery
   - Backend: `/api/ai-assistant/chat` and `/api/ai-coach/ask`
   - Uses Emergent LLM Key integration

4. **Tournament Manager**
   - Client-side tournament management in localStorage
   - Supports: Single Elimination, Double Elimination, Round Robin, Group Stage + Knockout, League
   - Participant management, fixture generation, score tracking
   - PDF export functionality

5. **Auto-Testing System**
   - Template loading for quick plan creation
   - "Virtual Coach" simulation for stress testing

6. **Entity Management**
   - Federations, Clubs, Schools hierarchy
   - Athletes and Teams management
   - Sports catalog with categories

7. **Periodización Completa** ✅ (Feb 13, 2026 - NEW)
   - Historial de planes con persistencia en localStorage
   - Wizard de creación de 4 pasos: Modelo → Duración → Objetivos → Configuración
   - **Modelos de Periodización**: Clásicos (Tradicional, ATR, Bloques), Ondulatorios (Diario, Semanal), Avanzados (Péndulo, Campanas, Contemporáneo, Inversa, Táctico)
   - **Duraciones**: Ciclo Olímpico (4 años), Bianual, Anual, Semestral, Trimestral, Mensual
   - **Tipos de Macrociclo**: Preparatorio General, Preparatorio Específico, Precompetitivo, Competitivo, Transición
   - **Tipos de Mesociclo**: Entrante, Básico Desarrollador, Básico Estabilizador, Precompetitivo, Competitivo, Recuperación
   - **Tipos de Microciclo**: Corriente (70%), De Carga (85%), De Choque (100%), Competitivo (60%), De Aproximación (75%), De Restablecimiento (45%)
   - **Magnitud de la Carga**: Muy Alta (98-100%), Alta (85-95%), Media (70-80%), Baja (55-65%), Recuperación (≤50%)
   - **Gráficos**: Volumen e Intensidad por Semana, Frecuencia de Entrenamiento
   - **Tablas**: Preparación (Física, Técnica, Táctica, Psicológica, Teórica), Actividades, Monitoreo

### UI Layout Changes (Feb 13, 2026) ✅
- **Full-width dashboard** - Removed sidebar, content uses 100% width
- **Top navigation bar (left → right)**:
  - Logo TRAIN
  - Panel/Datos tabs
  - PDF export
  - Filters dropdown (collapsible)
- **Coach AI Floating Button** - Bottom-right corner
- **Coach AI Drawer** - Slides from right with:
  - Two tabs: "Coach AI" (chat) and "Historial" (plans history)
  - User profile info in footer
  - Quick action buttons (Ejercicios, Cargas, Progresión, Recuperación)

---

## Prioritized Backlog

### P0 - Critical
- [ ] User verification of new layout

### P1 - High Priority
- [ ] **Tournament Manager Regression Tests**: Full workflow validation needed
- [ ] **Manual Plan Creation Wizard**: Step-by-step plan builder without AI

### P2 - Medium Priority
- [ ] Save AI suggestions as structured plans
- [ ] Full plan detail view
- [ ] Migrate localStorage data to MongoDB backend

### P3 - Low Priority
- [ ] Refactor DashboardPage.js (god component issue)
- [ ] Delete unused AICoachAssistant.js file

---

## Technical Architecture

```
/app
├── backend/
│   ├── routes/
│   │   ├── ai_coach.py         # Simplified AI coach endpoint
│   │   ├── ai_assistant.py     # AI assistant chat endpoint
│   │   ├── auth.py
│   │   ├── athletes.py
│   │   └── ...
│   └── server.py
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── AITrainingAssistant.js  # Current AI chat UI
│       │   ├── TournamentManager.js
│       │   ├── ControlPanel.js
│       │   ├── AutoTestingSystem.js
│       │   └── ...
│       └── pages/
│           └── DashboardPage.js        # Main hub (needs refactoring)
└── memory/
    └── PRD.md
```

## Key Integrations
- **OpenAI GPT-4o-mini**: Primary AI assistant
- **Emergent LLM Key**: Universal key for LLM access
- **Recharts**: Data visualization

## Test Credentials
- Email: `test@train.com`
- Password: `test123456`

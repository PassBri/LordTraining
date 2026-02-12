# Sistema TRAIN - PRD (Product Requirements Document)

## Original Problem Statement
Crear un planificador de entrenamiento deportivo y personalizado estilo SaaS con suscripcion. Debe ser:
- Multi-deporte con planes personalizados
- Modelo de suscripcion (Free/Basic/Pro/Enterprise)
- Integracion con Stripe y PayPal para pagos
- IA con OpenAI GPT-5.2 para generar planes
- Descargable en PDF
- Responsive web y movil

## User Personas
1. **Entrenador Profesional**: Gestiona multiples atletas, necesita generar planes complejos con periodizacion cientifica
2. **Preparador Fisico**: Trabaja en clubes, necesita biblioteca de ejercicios y seguimiento de cargas
3. **Atleta Amateur**: Usa la app para auto-gestionar su entrenamiento con guia de IA
4. **Club Deportivo**: Necesita gestion centralizada de multiples entrenadores y atletas

## Core Requirements (Static)
- Autenticacion JWT con roles (coach/athlete)
- Sistema de suscripcion con 4 niveles
- Generacion de planes con IA (GPT-5.2)
- Estructura de planificacion: Macrociclos -> Mesociclos -> Microciclos -> Sesiones
- Modelos de planificacion: Tradicional, ATR, Bloques, Ondulatorio, Concurrente
- Calendario interactivo de sesiones
- Biblioteca de ejercicios por deporte
- Exportacion PDF de planes
- Dashboard con estadisticas y graficos de carga

## What's Been Implemented

### Session Editor Export Feature (Feb 12, 2026)
- Boton "Descargar PDF" en el editor de sesiones
- Generacion programatica de PDF con jsPDF (sin html2canvas para evitar congelamiento)
- PDF incluye: Header, Objetivos, Fases con actividades, Monitoreo, Footer
- Funcionalidad "Compartir Enlace" funcionando correctamente

### UI Redesign
- Auth page: Split-screen design (form izquierda, gradiente azul derecha)
- Dashboard: Nuevo layout con sidebar de chat IA
- Tabs: Datos, Periodizar, Plan-grafico
- Graficos: Lineas (Planificacion Anual) + Radar (Perfil de Rendimiento)
- Panel Datos: Navegacion expandible con 16 secciones
- Landing page: Diseno minimalista centrado

### Backend (FastAPI + MongoDB)
- Autenticacion completa (registro, login, JWT)
- CRUD de atletas con limites por suscripcion
- CRUD de ejercicios con biblioteca predefinida
- Estructura completa de ciclos (macro/meso/micro/sesiones)
- Competiciones por atleta
- Integracion OpenAI GPT-5.2 para generacion de planes
- Integracion Stripe para pagos (test key)
- Dashboard con estadisticas
- Exportacion PDF de planes
- Calculo automatico de carga (volumen x intensidad)

### Frontend (React + Tailwind + Shadcn UI)
- Landing page con pricing
- Sistema de autenticacion (login/registro)
- Dashboard con graficos de carga (Recharts)
- Gestion de atletas (crear, listar, eliminar)
- Generador de planes con IA
- Calendario interactivo (date-fns + Shadcn Calendar)
- Biblioteca de ejercicios filtrable
- Pagina de suscripcion con checkout Stripe
- Diseno responsive (web + movil)
- Estilo Swiss Sport con Barlow Condensed + Inter

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Calendario de eventos / Analisis de competencias (merged)
- [ ] Objetivos e indicadores - KPIs deportivos
- [ ] Control de entrenamiento - Seguimiento
- [ ] Integracion PayPal como metodo de pago alternativo

### P1 - High Priority
- [ ] Plantillas de planes predefinidas por deporte
- [ ] Exportacion a Excel ademas de PDF
- [ ] Grafico ACWR (Acute:Chronic Workload Ratio) mejorado

### P2 - Medium Priority
- [ ] App movil nativa (React Native)
- [ ] Integracion con dispositivos wearables (Garmin, Polar)
- [ ] Modulo multimedia (videos de ejercicios)
- [ ] Chat entre entrenador y atleta

### P3 - Future Enhancements
- [ ] IA mas avanzada con historial de rendimiento
- [ ] Analisis predictivo de lesiones
- [ ] Marketplace de planes entre entrenadores
- [ ] White-label para clubes

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, date-fns, jsPDF
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, bcrypt
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Payments**: Stripe (test key configurado)
- **Fonts**: Barlow Condensed (headings), Inter (body)

## Code Architecture
```
/app
├── backend
│   ├── server.py          # Main FastAPI server with all routes
│   ├── tests/             # Pytest test files
│   ├── .env               # Environment variables
│   └── requirements.txt
├── frontend
│   ├── src
│   │   ├── components
│   │   │   ├── ui/               # Shadcn components
│   │   │   ├── SessionEditor.js  # Editor de sesiones con PDF export
│   │   │   ├── GraphicPlan.js    # Plan Grafico de Periodizacion
│   │   │   └── ...
│   │   ├── pages
│   │   │   ├── AuthPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── SessionViewPage.js  # Vista publica de sesiones compartidas
│   │   │   └── ...
│   │   ├── services/api.js
│   │   └── context/AuthContext.js
│   └── package.json
├── test_reports/          # Testing agent reports
└── memory
    └── PRD.md
```

## Key API Endpoints
- `/api/auth/register`, `/api/auth/login` - Authentication
- `/api/athletes` - CRUD athletes
- `/api/exercises` - Exercise library
- `/api/macrocycles`, `/api/mesocycles`, `/api/microcycles`, `/api/sessions` - Training cycles
- `/api/sessions/share` - Create shareable session link
- `/api/sessions/view/{share_id}` - Public session view
- `/api/export/session-pdf` - Export session as PDF (backend)
- `/api/graphic-plan` - Graphic periodization plan

## Test Credentials
- **Email**: test@train.com
- **Password**: test123456

## Notes
- User's preferred language: Spanish
- Test reports at /app/test_reports/
- PDF generation now uses programmatic jsPDF (no html2canvas) to avoid UI freezing

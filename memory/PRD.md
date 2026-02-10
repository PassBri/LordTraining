# Sistema TRAIN - PRD (Product Requirements Document)

## Original Problem Statement
Crear un planificador de entrenamiento deportivo y personalizado estilo SaaS con suscripción. Debe ser:
- Multi-deporte con planes personalizados
- Modelo de suscripción (Free/Basic/Pro/Enterprise)
- Integración con Stripe y PayPal para pagos
- IA con OpenAI GPT-5.2 para generar planes
- Descargable en PDF
- Responsive web y móvil

## User Personas
1. **Entrenador Profesional**: Gestiona múltiples atletas, necesita generar planes complejos con periodización científica
2. **Preparador Físico**: Trabaja en clubes, necesita biblioteca de ejercicios y seguimiento de cargas
3. **Atleta Amateur**: Usa la app para auto-gestionar su entrenamiento con guía de IA
4. **Club Deportivo**: Necesita gestión centralizada de múltiples entrenadores y atletas

## Core Requirements (Static)
- Autenticación JWT con roles (coach/athlete)
- Sistema de suscripción con 4 niveles
- Generación de planes con IA (GPT-5.2)
- Estructura de planificación: Macrociclos → Mesociclos → Microciclos → Sesiones
- Modelos de planificación: Tradicional, ATR, Bloques, Ondulatorio, Concurrente
- Calendario interactivo de sesiones
- Biblioteca de ejercicios por deporte
- Exportación PDF de planes
- Dashboard con estadísticas y gráficos de carga

## What's Been Implemented (Feb 2025)

### Backend (FastAPI + MongoDB)
- ✅ Autenticación completa (registro, login, JWT)
- ✅ CRUD de atletas con límites por suscripción
- ✅ CRUD de ejercicios con biblioteca predefinida
- ✅ Estructura completa de ciclos (macro/meso/micro/sesiones)
- ✅ Competiciones por atleta
- ✅ Integración OpenAI GPT-5.2 para generación de planes
- ✅ Integración Stripe para pagos (test key)
- ✅ Dashboard con estadísticas
- ✅ Exportación PDF de planes
- ✅ Cálculo automático de carga (volumen × intensidad)

### Frontend (React + Tailwind + Shadcn UI)
- ✅ Landing page con pricing
- ✅ Sistema de autenticación (login/registro)
- ✅ Dashboard con gráficos de carga (Recharts)
- ✅ Gestión de atletas (crear, listar, eliminar)
- ✅ Generador de planes con IA
- ✅ Calendario interactivo (date-fns + Shadcn Calendar)
- ✅ Biblioteca de ejercicios filtrable
- ✅ Página de suscripción con checkout Stripe
- ✅ Diseño responsive (web + móvil)
- ✅ Estilo Swiss Sport con Barlow Condensed + Inter

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Integración PayPal como método de pago alternativo
- [ ] Edición de atletas existentes (UI)
- [ ] Edición de sesiones y marcado de completadas desde calendario

### P1 - High Priority
- [ ] Plantillas de planes predefinidas por deporte
- [ ] Exportación a Excel además de PDF
- [ ] Notificaciones por email de sesiones próximas
- [ ] Gráfico ACWR (Acute:Chronic Workload Ratio)

### P2 - Medium Priority
- [ ] App móvil nativa (React Native)
- [ ] Integración con dispositivos wearables (Garmin, Polar)
- [ ] Módulo multimedia (videos de ejercicios)
- [ ] Chat entre entrenador y atleta

### P3 - Future Enhancements
- [ ] IA más avanzada con historial de rendimiento
- [ ] Análisis predictivo de lesiones
- [ ] Marketplace de planes entre entrenadores
- [ ] White-label para clubes

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, date-fns
- **Backend**: FastAPI, Motor (async MongoDB), PyJWT, bcrypt
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Payments**: Stripe (test key configurado)
- **Fonts**: Barlow Condensed (headings), Inter (body)

## Next Tasks
1. Implementar PayPal como segundo método de pago
2. Mejorar UI de edición de planes existentes
3. Añadir gráfico ACWR en dashboard
4. Implementar envío de planes por email

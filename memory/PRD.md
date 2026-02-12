# Sistema TRAIN - PRD (Product Requirements Document)

## Descripción General
Sistema completo de gestión de entrenamiento deportivo para entrenadores, federaciones, clubes y escuelas. Incluye planificación de entrenamientos con IA, gestión de atletas y equipos, torneos/competencias, y análisis de rendimiento.

## Fecha de Última Actualización
12 de Febrero, 2026

---

## Funcionalidades Implementadas

### 1. Autenticación y Usuarios
- ✅ Registro e inicio de sesión
- ✅ Roles: Entrenador, Admin, Atleta
- ✅ Planes de suscripción (Free, Premium, Team, Federation)
- ✅ JWT para autenticación

### 2. Gestión de Atletas y Equipos
- ✅ CRUD completo de atletas
- ✅ CRUD completo de equipos
- ✅ Afiliación de equipos a entidades (Federación, Club, Escuela)
- ✅ Afiliación de atletas a equipos
- ✅ Catálogo de deportes dinámico y editable
- ✅ Categorías de deportes con iconos y colores

### 3. Sistema de Torneos y Competencias
- ✅ Creación de torneos con múltiples formatos:
  - Eliminación directa (Single Elimination)
  - Doble eliminación (Double Elimination)
  - Todos contra todos (Round Robin)
  - Grupos + Eliminación (Group Stage + Knockout)
  - Liga (puntos)
  - Sistema Suizo
  - Con Repechaje (Consolation)
- ✅ Múltiples categorías por torneo (Sub-15, Sub-17, Senior, etc.)
- ✅ Inscripción de participantes (equipos o atletas)
- ✅ Generación automática de brackets
- ✅ Actualización de resultados en tiempo real
- ✅ Tabla de posiciones automática
- ✅ Exportación a PDF
- ✅ Enlaces compartibles públicos
- ✅ Sistemas de puntuación configurables (FIFA, FIBA, ITF, etc.)

### 4. Barra de Contexto Global
- ✅ Barra superior fija en todas las páginas
- ✅ Selector de Entidad (Federación/Club/Escuela)
- ✅ Selector de Equipo (filtrado por entidad)
- ✅ Selector de Atleta (filtrado por equipo)
- ✅ Selector de Deporte (del catálogo dinámico)
- ✅ Persistencia del contexto (localStorage)
- ✅ Botón de acceso rápido a "Historial de Planes"

### 5. Historial de Planes
- ✅ Nueva página dedicada (/plans-history)
- ✅ Lista de todos los planes generados
- ✅ Filtros por búsqueda, estado y fecha
- ✅ Filtrado automático por contexto global
- ✅ Vista de jerarquía (Entidad → Equipo → Atleta → Deporte)
- ✅ Acceso desde barra superior y menú lateral

### 6. Planificación de Entrenamientos
- ✅ Generación de planes con IA (GPT)
- ✅ Macrociclos, mesociclos y sesiones
- ✅ Calendario visual
- ✅ Exportación de sesiones a PDF
- ✅ Enlaces compartibles para sesiones

### 7. Dashboard/Panel de Control
- ✅ Readiness Score (índice de preparación)
- ✅ Ratio de carga aguda/crónica (ACWR)
- ✅ Gráficos de volumen, intensidad y densidad
- ✅ Gráficos de intensidad y recuperación
- ✅ Asistente de IA integrado

### 8. Biblioteca de Ejercicios
- ✅ CRUD de ejercicios
- ✅ Categorización por grupo muscular
- ✅ Búsqueda y filtrado

---

## Arquitectura Técnica

### Frontend
- React 18
- TailwindCSS
- Shadcn/UI components
- Recharts para gráficos
- jsPDF para exportación
- React Router v6

### Backend
- FastAPI (Python)
- MongoDB (Motor async driver)
- JWT para autenticación
- ReportLab para PDFs
- Emergent Integrations (LLM, Stripe)

### Base de Datos (MongoDB)
Colecciones principales:
- `users` - Usuarios y autenticación
- `athletes` - Atletas
- `teams` - Equipos
- `entities` - Federaciones, Clubes, Escuelas
- `sports_categories` - Categorías de deportes
- `sports` - Deportes
- `tournaments` - Torneos y competencias
- `matches` - Partidos de torneos
- `macrocycles` - Planes de entrenamiento
- `sessions` - Sesiones de entrenamiento
- `exercises` - Biblioteca de ejercicios

---

## Archivos Clave

### Frontend
- `/app/frontend/src/App.js` - Rutas principales (simplificadas)
- `/app/frontend/src/pages/DashboardPage.js` - Dashboard principal con Panel de Control + Datos (Atletas, Equipos, Deportes, Torneos) + Barra de Contexto Global + Asistente IA
- `/app/frontend/src/pages/SubscriptionPage.js` - Página de suscripción (standalone)
- `/app/frontend/src/pages/AuthPage.js` - Autenticación
- `/app/frontend/src/pages/LandingPage.js` - Página de inicio
- `/app/frontend/src/pages/SessionViewPage.js` - Vista pública de sesiones
- `/app/frontend/src/pages/TournamentPublicPage.js` - Vista pública de torneos
- `/app/frontend/src/services/api.js` - Funciones de API

### Actualización 12 Feb 2026
- **Barra de Contexto Global**: Fija en la parte superior con selectores en cascada (Entidad → Equipo → Atleta → Deporte) + botón "Historial de Planes"
- **Persistencia con localStorage**: El contexto seleccionado se mantiene en toda la sesión
- **Torneos integrados en Dashboard**: La pestaña de Torneos ahora está en "Datos > Atletas y Equipos"
- **Página /athletes eliminada**: Todo está centralizado en el Dashboard
- **Historial de Planes en Sidebar**: El historial ahora se muestra como vista alternativa al Asistente IA en el sidebar, toggled por botón
- **Enlace Suscripción en menú usuario**: Agregado enlace "Suscripción" encima de "Cerrar Sesión" en el sidebar del Dashboard
- **Limpieza de código**: Eliminadas páginas secundarias no utilizadas (PlansPage, CalendarPage, ExercisesPage, AIGeneratorPage, PlansHistoryPage) y DashboardLayout.js. SubscriptionPage actualizada con navegación propia.

### Backend
- `/app/backend/server.py` - API principal con todos los endpoints

---

## Próximas Tareas (Backlog)

### P0 - Alta Prioridad
- [x] ~~Reubicar enlace "Suscripción" encima de "Cerrar Sesión"~~ (COMPLETADO 12 Feb 2026)
- [ ] Conectar dashboard a datos reales (actualmente mockeado)
- [ ] Implementar tooltips interactivos en gráficos
- [ ] Zoom/brush en gráficos temporales

### P1 - Media Prioridad
- [ ] Integrar IA para generación de planes (conectar Asistente IA con LLM real)
- [ ] Guardar planes generados automáticamente en base de datos
- [ ] Planes de entrenamiento por equipo (no solo individual)
- [ ] Drill-down en gráficos (click para ver detalles)
- [ ] Notificaciones y alertas inteligentes

### P2 - Baja Prioridad
- [ ] Mostrar detalles de planes al hacer click en el historial
- [ ] Gráficos avanzados: Marcadores de rendimiento, comparación multi-atleta
- [ ] Calendario de competencias integrado
- [ ] Distribución de capacidades físicas
- [ ] Predicciones y forecasting
- [ ] Refactorización de DashboardPage.js (actualmente >2800 líneas)

---

## Credenciales de Prueba
- Email: test@train.com
- Password: test123456

## URLs
- Aplicación: https://tournament-dash-3.preview.emergentagent.com
- Vista pública de torneo: /tournament/{share_id}
- Vista pública de sesión: /session/view/{share_id}

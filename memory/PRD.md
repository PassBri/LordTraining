# TrAIn - Plataforma de Gestión Deportiva

## Descripción General
Sistema inteligente de planificación deportiva con IA que permite gestionar atletas, crear planes de periodización científicos y optimizar el rendimiento deportivo.

## Arquitectura Plan-Céntrica (Actualizado 13-Mar-2025)

### Flujo Principal de Usuario
1. **Datos → "Mis Planes"**: Primera vista al entrar - lista de planes con opción de crear nuevo
2. **Seleccionar Plan**: Click en un plan para "entrar" a su estructura interna
3. **Navegar Secciones**: Diagnóstico, Información, Evaluación, Competencias, Periodización, Visualización, Herramientas
4. **Cambiar Plan**: Botón para volver a la lista y seleccionar otro plan
5. **Panel de Control**: Muestra estadísticas del plan activo y gráficos conectados
6. **Plan Gráfico**: Visualiza la estructura del plan activo

### Conexión de Datos
- **Panel de Control** → Muestra card de "Plan Activo" con nombre, semanas y modelo
- **Plan Gráfico** → Importa automáticamente los datos del plan activo
- **Todas las secciones** → Datos asociados al plan_id seleccionado

### Estructura Jerárquica del Plan (Metodología Científica)
Basado en los libros de planificación deportiva (Padilla, Matveiev, Issurin):

```
📋 PLAN DE ENTRENAMIENTO [Nombre del Plan]
│
├── 1️⃣ DIAGNÓSTICO (Punto de Partida)
│   ├── Análisis Plan Anterior
│   ├── Objetivos del Plan
│   └── Caracterización Atleta
│
├── 2️⃣ INFORMACIÓN BASE
│   ├── Atletas
│   ├── Equipos
│   ├── Deportes (con caracterización técnica editable)
│   ├── Torneos
│   └── Entidades
│
├── 3️⃣ EVALUACIÓN / CONTROLES
│   ├── Control Médico
│   ├── Antropometría
│   ├── Control Físico
│   ├── Control Técnico
│   ├── Control Táctico
│   └── Control Psicológico
│
├── 4️⃣ COMPETENCIAS
│   ├── Calendario Competitivo
│   └── Competencias
│
├── 5️⃣ PERIODIZACIÓN (Solo Estructura)
│   └── Estructura del Plan (Macrociclo > Mesociclo > Microciclo)
│
├── 6️⃣ VISUALIZACIÓN
│   ├── Plan Gráfico
│   ├── Calendario
│   └── Alertas
│
└── 7️⃣ HERRAMIENTAS
    ├── Calculadoras
    ├── Métodos de Entrenamiento
    ├── Biblioteca Ejercicios
    └── Asistente IA
```

### Lógica de Navegación UI
- **Sin plan activo**: Solo muestra lista de planes
- **Con plan activo**: Muestra barra del plan + secciones internas
- **Cambiar Plan**: Deselecciona plan y vuelve a lista

## Funcionalidades Implementadas

### Sistema de Autenticación
- Login/Registro de usuarios
- Gestión de sesiones JWT

### Panel de Control (Dashboard)
- **Card de Plan Activo** con nombre, semanas y modelo (conectado)
- **Card de Mis Planes** con contador de planes
- Readiness Score con métricas de bienestar
- Ratio Carga Aguda:Crónica
- Estadísticas de atletas, eventos, macrociclos
- Gráficos de volumen, intensidad y densidad

### Sistema de Evaluaciones (Conectado al Plan)
- **Control Médico**: Signos vitales, antecedentes, lesiones, aptitud médica
- **Antropometría**: Medidas corporales, pliegues cutáneos, composición corporal
- **Control Físico**: Fuerza, resistencia, velocidad, potencia, flexibilidad
- **Control Técnico**: Habilidades técnicas específicas del deporte
- **Control Táctico**: Inteligencia táctica, toma de decisiones
- **Control Psicológico**: Estado emocional, motivación, concentración

Todas las evaluaciones:
- Muestran badge del plan activo
- Guardan datos con `plan_id` en el backend
- Cargan datos existentes al seleccionar un plan

### Sistema de Periodización Científico
**Backend API CRUD Completo:**
- `POST /api/training-plans` - Crear plan
- `GET /api/training-plans` - Listar planes
- `GET /api/training-plans/{id}` - Obtener plan
- `PUT /api/training-plans/{id}` - Actualizar plan
- `DELETE /api/training-plans/{id}` - Eliminar plan
- `POST /api/training-plans/{id}/duplicate` - Duplicar plan
- `POST /api/training-plans/{id}/share` - Compartir plan
- `GET /api/training-plans/{id}/export/pdf` - Exportar PDF

**Calculadoras Científicas:**
- 1RM (Brzycki, Epley, Lander)
- Zonas FC (Fórmula Karvonen)
- VO2máx (Cooper, Rockport)
- Distribución de volumen
- Escalas de intensidad

**17 Modelos de Periodización:**
- Clásicos: Tradicional (Matveiev), ATR (Issurin), Bloques
- Ondulatorios: DUP, WUP, No Lineal
- Contemporáneos: Conjugado, Trifásico, Integración Vertical
- Por Deporte: Táctica, Lineal Inversa, Concurrente, Polarizado
- Avanzados: Cibernético, Péndulo, Secuencial

### API Endpoints para Datos del Plan
- `POST /api/plan-data/objectives` - Objetivos del plan
- `POST /api/plan-data/evaluations` - Evaluaciones
- `POST /api/plan-data/competitions` - Competencias
- `POST /api/plan-data/previous-analysis` - Análisis plan anterior
- `GET /api/plan-data/{plan_id}` - Todos los datos del plan

## Tecnologías
- **Frontend**: React.js, Tailwind CSS, ShadCN/UI, Recharts, i18next, react-i18next
- **Backend**: FastAPI, Python
- **Base de Datos**: MongoDB
- **IA**: OpenAI GPT-4o-mini (Emergent LLM Key)

## Base de Datos MongoDB
**Colecciones:**
- `users`: Usuarios y coaches
- `athletes`: Atletas
- `training_plans`: Planes de periodización
- `plan_objectives`: Objetivos por plan
- `plan_evaluations`: Evaluaciones por plan
- `plan_competitions`: Competencias por plan
- `tournaments`: Torneos

## Issues Conocidos
- **P2**: Sección "Caracterización del Deporte" crashea la app

## Próximas Tareas
1. **P1**: Corregir bug "Caracterización del Deporte" (crash recurrente)
2. **P1**: Refactorizar DashboardPage.js (5900+ líneas) en componentes menores
3. **P2**: Tests físicos integrados en wizard
4. **P2**: Refactorizar PeriodizationComplete.js (900+ líneas)
5. **P3**: Migrar datos de torneos a MongoDB
6. **P3**: Limpiar componentes obsoletos (PeriodizationSystem.js, AICoachAssistant.js)

## Completado
### 30-Mar-2025 - P1/P2: Estructura de datos de planes + Gestión avanzada
- **P1 Crear estructura completa al crear Plan**: Backend ya genera documento plan_data con secciones vacías (diagnosis, evaluations, competitions) al crear un plan
- **P1 Carga de datos al seleccionar Plan**: Endpoint GET /api/plan-data/{plan_id} ahora retorna evaluaciones organizadas por tipo (medical, anthropometric, physical, technical, tactical, psychological). Frontend loadPlanData() consume correctamente la estructura tipada
- **P2 Duplicar Plan**: POST /api/training-plans/{plan_id}/duplicate copia plan + plan_data + objectives + evaluations + competitions + previous_analysis
- **P2 Compartir Plan**: POST /api/training-plans/{plan_id}/share genera token y URL compartible, botón copia al portapapeles
- **P2 Imprimir/Exportar PDF**: GET /api/training-plans/{plan_id}/export/pdf genera PDF descargable con toda la estructura del plan
- **Cascade Delete**: DELETE /api/training-plans/{plan_id} elimina plan + todos los datos asociados
- **UI Plan Manager**: 4 botones de acción por plan (Duplicar, Compartir, PDF, Eliminar) con tooltips traducidos
- Testing: 100% backend (8/8), 95% frontend (clipboard limitation en testing automático)

### 30-Mar-2025 - Sistema i18n Completo
- Sistema de internacionalización (i18n) implementado con i18next + react-i18next
- 12 idiomas soportados: es, en, pt, ar, hi, id, fr, de, ja, ko, ru, zh
- Selector de idioma (LanguageSelector) integrado en Landing Page, Auth Page y Dashboard
- Soporte RTL (Right-to-Left) completo para Árabe: dir="rtl" + CSS mirror rules
- Persistencia de preferencia de idioma en localStorage (key: 'train_language')
- Etiquetas hreflang SEO en index.html para los 12 idiomas
- Landing Page: todos los textos traducidos con t() hooks
- Auth Page: formularios, tabs y labels traducidos con t() hooks
- Dashboard: navegación principal (Panel/Datos), secciones del plan y logout traducidos
- Detección automática de idioma del navegador con fallback a 'es'
- Testing: 100% (12/12 tests pasados por testing agent)

### 30-Mar-2025 - Rediseño Landing Page + Auth Page
- Landing page rediseñada con fondo claro elegante (#fafaf8), sin imágenes stock
- Escala tipográfica profesional con CSS reset scoped:
  - Display (hero): Inter black, 3.5rem, sentence case  
  - Section H2: Inter bold, 32px, sentence case
  - Card H3: Inter semibold, 20px, sentence case  
  - Body: Inter regular, 14-15px
  - Labels: Barlow Condensed bold, 10-11px, uppercase (solo etiquetas)
  - Métricas: Barlow Condensed black, para datos numéricos
- CSS-only visuals: TrackLanes SVG, PeriodizationWave, TeamFormation, DataRings, ReadinessGauge, DashboardMockup
- Color: azul (#007AFF), lima (#CCFF00), slate-900 texto/dark, #fafaf8 fondo
- AuthPage rediseñada para coherencia: mismo mockup dashboard, mismos colores, misma tipografía
- Login: botón slate-900, Register: botón #007AFF, visual panel derecho con dashboard mockup + stats + barras

## Credenciales de Prueba
- Email: test@train.com
- Password: test123456

## Archivos Principales
- `/app/frontend/src/pages/DashboardPage.js` - Panel principal con arquitectura plan-céntrica
- `/app/frontend/src/components/PeriodizationComplete.js` - Sistema de periodización
- `/app/backend/server.py` - API Backend

## Documentos de Referencia
1. PLANIFICACIÓN DEL ENTRENAMIENTO_COLDEPORTES.pdf
2. PLANIFICACIÓN DEL ENTRENAMIENTO MANSO.pdf
3. LIBRO_PLANIF_ENTREN_PADILLA_.pdf
4. Manual del Entrenador Personal (Felipe Isidro)
5. Guía de Entrenamiento Avanzado
6. Modelos de Planificación (Dr. Fernando Navarro)
7. Conceptos y Métodos para el Entrenamiento Físico

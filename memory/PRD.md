# TrAIn - Plataforma de Gestión Deportiva

## Descripción General
Sistema inteligente de planificación deportiva con IA que permite gestionar atletas, crear planes de periodización científicos y optimizar el rendimiento deportivo.

## Arquitectura Plan-Céntrica (Actualizado 13-Mar-2025)

### Flujo Principal de Usuario
1. **Datos → Planes de Entrenamiento**: Primera vista al entrar
2. **Seleccionar Plan**: Click en un plan para "entrar" a su estructura
3. **Navegar Secciones**: Diagnóstico, Información, Evaluación, Competencias, Periodización, Visualización, Herramientas
4. **Cambiar Plan**: Botón para volver a la lista y seleccionar otro plan

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
- Readiness Score con métricas de bienestar
- Ratio Carga Aguda:Crónica
- Estadísticas de atletas, eventos, macrociclos
- Gráficos de volumen, intensidad y densidad

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
- **Frontend**: React.js, Tailwind CSS, ShadCN/UI, Recharts
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
1. **P1**: Conectar secciones de datos frontend a endpoints con plan_id
2. **P1**: Refactorizar PeriodizationComplete.js (900+ líneas)
3. **P2**: Corregir bug "Caracterización del Deporte"
4. **P2**: Tests físicos integrados en wizard
5. **P3**: Migrar datos de torneos a MongoDB

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

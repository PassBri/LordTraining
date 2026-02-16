# TrAIn - Plataforma de Gestión Deportiva

## Descripción General
Sistema inteligente de planificación deportiva con IA que permite gestionar atletas, crear planes de periodización científicos y optimizar el rendimiento deportivo.

## Estado Actual: Sistema de Periodización Científico Completo

### Funcionalidades Implementadas

#### 1. Sistema de Autenticación
- Login/Registro de usuarios
- Gestión de sesiones JWT

#### 2. Panel de Control (Dashboard)
- Readiness Score con métricas de bienestar
- Ratio Carga Aguda:Crónica
- Estadísticas de atletas, eventos, macrociclos
- Gráficos de volumen, intensidad y densidad

#### 3. Sistema de Periodización Científico (ACTUALIZADO 16-Feb-2025)

**Backend API CRUD Completo:**
- `POST /api/training-plans` - Crear plan
- `GET /api/training-plans` - Listar planes
- `GET /api/training-plans/{id}` - Obtener plan
- `PUT /api/training-plans/{id}` - Actualizar plan
- `DELETE /api/training-plans/{id}` - Eliminar plan
- `POST /api/training-plans/{id}/duplicate` - Duplicar plan
- `POST /api/training-plans/{id}/share` - Compartir plan (genera link público)
- `GET /api/training-plans/shared/{token}` - Ver plan compartido
- `GET /api/training-plans/{id}/export/pdf` - Exportar a PDF

**Calculadoras Científicas:**
- `POST /api/calculators/load` - Calculadora con tipos:
  - `1rm`: Cálculo 1RM (Brzycki, Epley, Lander)
  - `heart_rate_zones`: Zonas FC (Fórmula Karvonen)
  - `vo2max`: VO2máx (Cooper, Rockport, 1.5 Mile)
  - `volume_distribution`: Distribución de volumen (lineal, ondulatorio, escalón)
  - `intensity_scale`: Escalas de intensidad (Vasconcelos Raposo)

**17 Modelos de Periodización:**
- 📚 Clásicos: Tradicional (Matveiev), ATR (Issurin), Bloques (Verkhoshansky)
- 📈 Ondulatorios: DUP, WUP, No Lineal Flexible (Kraemer)
- 🔬 Contemporáneos: Conjugado (Westside), Trifásico (Dietz), Integración Vertical, Contraste Francés
- 🏆 Por Deporte: Táctica (Frade), Lineal Inversa, Concurrente, Polarizado (Seiler)
- 🎯 Avanzados: Cibernético (Bondarchuk), Péndulo, Secuencial (Tschiene)

**Tipos de Estructuras:**
- Mesociclos: Entrante, Básico Desarrollador, Básico Estabilizador, Precompetitivo, Competitivo, Recuperación
- Microciclos: Ajuste, Carga, Choque, Aproximación, Competición, Recuperación

**Vista de Plan:**
- Estructura: CRUD jerárquico (Macrociclo > Mesociclo > Microciclo > Sesión)
- Calendario: Vista semanal de sesiones
- Gráfico: Curvas de volumen e intensidad (Recharts)

**Funciones de Plan:**
- ✅ Guardar en MongoDB
- ✅ Editar planes existentes
- ✅ Eliminar planes
- ✅ Duplicar planes
- ✅ Compartir (link público)
- ✅ Exportar PDF

#### 4. Coach AI
- Asistente de entrenamiento con GPT-4o-mini
- Sugerencias personalizadas

#### 5. Gestor de Torneos
- Creación y gestión de competencias
- Brackets de eliminación

### Documentos de Referencia Analizados
1. Conceptos y Métodos para el Entrenamiento Físico (Min. Defensa España)
2. Modelos de Planificación según el Deportista y el Deporte (Dr. Fernando Navarro)
3. Guía de Entrenamiento Avanzado
4. Libro Planificación del Entrenamiento (José Rafael Padilla)
5. Manual del Entrenador Personal - Fitness al Wellness (Felipe Isidro)
6. Planificación del Entrenamiento (Manso)
7. Planificación del Entrenamiento (Coldeportes)

### Tecnologías
- **Frontend**: React.js, Tailwind CSS, ShadCN/UI, Recharts
- **Backend**: FastAPI, Python
- **Base de Datos**: MongoDB
- **IA**: OpenAI GPT-4o-mini (Emergent LLM Key)

### Base de Datos MongoDB
**Colecciones:**
- `users`: Usuarios y coaches
- `athletes`: Atletas
- `training_plans`: Planes de periodización completos (NUEVO)
- `tournaments`: Torneos

### Cambios Recientes (16-Feb-2025)
1. ✅ Backend API CRUD completo para planes de periodización
2. ✅ Persistencia en MongoDB (antes solo localStorage)
3. ✅ Calculadoras científicas (1RM, Zonas FC, VO2máx, Distribución Volumen, Escalas Intensidad)
4. ✅ Exportar PDF de planes
5. ✅ Compartir planes con link público
6. ✅ Duplicar planes
7. ✅ Frontend integrado con API
8. ✅ **Generador Automático de Estructura Científica**
   - Endpoint: `POST /api/generate-structure`
   - Genera estructura óptima basada en: modelo de periodización, deporte, duración y nivel del atleta
   - Aplica principios científicos de los documentos de referencia
   - Calcula distribución de volumen e intensidad por fase
   - Genera macrociclos, mesociclos y microciclos automáticamente
9. ✅ **Wizard de 5 Pasos para Crear Plan**:
   - Paso 1: Selección de Deporte (Fuerza, Resistencia, Velocidad, Equipos, etc.)
   - Paso 2: Selección de Modelo de Periodización (17 modelos disponibles)
   - Paso 3: Configuración de Duración (Olímpico, Bianual, Anual, Semestral, Trimestral, Mensual)
   - Paso 4: Generación de Estructura Científica Automática
   - Paso 5: Resumen y Creación del Plan
10. ✅ **Deportes Personalizados en Wizard** - Los deportes creados en Información → Deportes aparecen en el wizard de periodización
11. ✅ **Sistema de Plan Activo** (NUEVO)
    - Al entrar a "Datos" se muestra selector de plan si no hay plan activo
    - Lista de planes existentes de la BD
    - Opción de crear nuevo plan o seleccionar existente
    - Plan activo se persiste en localStorage
    - Botón "Cambiar Plan" para cambiar de plan activo
12. ✅ **Historial de Planes en Coach AI Drawer**
    - Tab "Planes" muestra todos los planes de la BD
    - Indicador del plan activo con badge verde
    - Botones para editar/eliminar planes
    - Botón "Crear Nuevo Plan" que lleva al wizard

## Issues Conocidos
- **P2**: Sección "Caracterización del Deporte" crashea la app (en DashboardPage.js)
- **LOW**: Función Compartir requiere permisos de Clipboard API en navegador

## Próximas Tareas
1. **P1**: Refactorizar PeriodizationComplete.js (900+ líneas - dividir en componentes)
2. **P1**: Vincular datos de secciones (Evaluación, Competencias, etc.) al plan activo
3. **P2**: Tests físicos integrados en el wizard de creación
4. **P2**: Regression test del Tournament Manager
5. **P3**: Integrar sugerencias del AI Coach con el sistema de planes
6. **P3**: Migrar datos de torneos a MongoDB

## Credenciales de Prueba
- Email: test@train.com
- Password: test123456

## Archivos Principales
- `/app/frontend/src/components/PeriodizationComplete.js` - Sistema de periodización frontend
- `/app/backend/server.py` - API Backend con endpoints de planes y calculadoras
- `/app/frontend/src/pages/DashboardPage.js` - Panel principal
- `/app/frontend/src/components/SessionEditor.js` - Editor de sesiones

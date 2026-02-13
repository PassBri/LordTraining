# TrAIn - Plataforma de Gestión Deportiva

## Descripción General
Sistema inteligente de planificación deportiva con IA que permite gestionar atletas, crear planes de periodización y optimizar el rendimiento deportivo.

## Estado Actual: MVP Completo

### Funcionalidades Implementadas

#### 1. Sistema de Autenticación
- Login/Registro de usuarios
- Gestión de sesiones

#### 2. Panel de Control (Dashboard)
- Readiness Score con métricas de bienestar
- Ratio Carga Aguda:Crónica
- Estadísticas de atletas, eventos, macrociclos
- Gráficos de volumen, intensidad y densidad

#### 3. Sistema de Periodización (ACTUALIZADO 13-Feb-2025)
- **Wizard de creación de planes** con 4 pasos:
  1. Selección de Modelo
  2. Duración del Ciclo  
  3. Objetivos
  4. Resumen

- **17 Modelos de Periodización organizados por categoría**:
  - 📚 Modelos Clásicos:
    - Tradicional (Matveiev)
    - ATR (Issurin)
    - Bloques Concentrados (Verkhoshansky)
  - 📈 Modelos Ondulatorios:
    - Ondulatorio Diario (DUP)
    - Ondulatorio Semanal (WUP)
    - No Lineal Flexible (Kraemer)
  - 🔬 Modelos Contemporáneos:
    - Conjugado (Westside/Simmons)
    - Trifásico (Dietz)
    - Integración Vertical (Francis)
    - Contraste Francés
  - 🏆 Por Tipo de Deporte:
    - Periodización Táctica (Frade)
    - Lineal Inversa
    - Concurrente
    - Polarizado (Seiler)
  - 🎯 Modelos Avanzados:
    - Cibernético (Bondarchuk)
    - Péndulo (Arosiev/Kalinin)
    - Secuencial (Tschiene)

- **Vista de Estructura** con CRUD completo para:
  - Macrociclos
  - Mesociclos
  - Microciclos
  - Sesiones de Entrenamiento

- **Vista de Calendario** semanal con sesiones
- **Vista de Gráfico** de volumen e intensidad

#### 4. Coach AI
- Asistente de entrenamiento con GPT-4o-mini
- Sugerencias personalizadas

#### 5. Gestor de Torneos
- Creación y gestión de competencias
- Brackets de eliminación

### Tecnologías
- **Frontend**: React.js, Tailwind CSS, ShadCN/UI, Recharts
- **Backend**: FastAPI, Python
- **Base de Datos**: MongoDB
- **IA**: OpenAI GPT-4o-mini (Emergent LLM Key)

### Persistencia de Datos
- **Backend (MongoDB)**: Usuarios, Atletas, configuraciones
- **LocalStorage (temporal)**: Planes de periodización, Torneos

## Cambios Recientes (13-Feb-2025)
1. ✅ Ampliados los modelos de periodización de 5 a 17 modelos
2. ✅ Organización por categorías con iconos y colores
3. ✅ Descripciones detalladas para cada modelo
4. ✅ Arreglada visibilidad del botón "Siguiente" (azul con texto blanco)

## Issues Conocidos
- **P1**: Sección "Caracterización del Deporte" crashea la app (en DashboardPage.js)

## Próximas Tareas
1. **P1**: Backend persistence para planes de periodización
2. **P1**: Arreglar crash en "Caracterización del Deporte"
3. **P2**: Regression test del Tournament Manager
4. **P2**: Backend persistence para Tournament Manager

## Credenciales de Prueba
- Email: test@train.com
- Password: test123456

## Archivos Principales
- `/app/frontend/src/components/PeriodizationComplete.js` - Sistema de periodización
- `/app/frontend/src/pages/DashboardPage.js` - Panel principal
- `/app/frontend/src/components/SessionEditor.js` - Editor de sesiones
- `/app/frontend/src/components/TrainingSystemHub.js` - Hub de entrenamiento

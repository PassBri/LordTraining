# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Zustand + Recharts + Shadcn/UI
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB (11 colecciones V2)

## Implementado

### Plan Grafico con 8 InteractiveCharts (Feb 2026)
- Tabla de celdas clickeables arriba (Ciclo, Carga, Preparacion, Prep Fisica, Actividad, Eventos, Monitoreo)
- 8 graficas InteractiveChart debajo con datos V2:
  1. Magnitud de Carga y Recuperacion (barras)
  2. Volumen e Intensidad (mixto)
  3. Intensidad y Recuperacion (3 lineas: densidad, intensidad, recuperacion)
  4. Preparacion por Componentes (6 lineas: fisica general/especifica, tecnica, tactica, psicologica, teorica)
  5. Preparacion Fisica por Capacidades (5 lineas: resistencia, fuerza, velocidad, coordinacion, flexibilidad)
  6. Densidad del Entrenamiento (area con referencia fatiga)
  7. Duracion por Semanas (barras apiladas)
  8. Actividad Semanal (barras sesiones + competencias)
- Datos de celdas clickeables corresponden con graficas (planData sync V2)
- Cada grafica: toolbar, brush, zoom, fullscreen, badge "En vivo"

### Dashboard General con 6 Graficas (Feb 2026)
- PeriodizationChart, ACWRChart, RadarChart, HeatmapChart, ProgresionChart, GanttChart
- Testing: Backend 12/12 + Frontend 100%

### Motor de Cascada V2 (Feb 2026)
- 11 colecciones, propagacion 6 niveles, 7 reglas integridad
- 21+ endpoints REST, seed demo ATR 16 semanas

## Pendiente
### P1
- Fix hydration warning DashboardPage.js
- Refactorizar componentes gigantes
### P2
- Print/Share/Duplicate planes periodizacion
- UI catalogo ejercicios base
### P3
- Diseno responsivo tablero tactico

# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura

### Stack
- Frontend: React + Zustand + Recharts + Shadcn/UI
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB

### Estructura Backend
```
/app/backend/
  server.py                          # API V1
  models/schemas.py                  # Pydantic models V2
  services/cascade.py                # Motor cascada (6 niveles)
  services/validation.py             # 7 reglas integridad
  routes/periodization_v2.py         # API V2 + sync V1->V2 + historico
  routes/ai_assistant.py
  migrations/seed_demo.py
```

### Estructura Frontend
```
/app/frontend/src/
  stores/planStore.js                # Zustand store V2 (historicoCarga, CRUD, cascade)
  utils/chartDataAdapters.js         # 6 adaptadores: Periodizacion, ACWR, Radar, Heatmap, Progresion, Gantt
  hooks/useChartData.js              # 6 hooks reactivos con selectores granulares
  components/charts/
    PeriodizationChart.js            # Barras Vol/Int/Den/Carga con linea inversa
    ACWRChart.js                     # Dual eje con zonas coloreadas
    CapacidadRadarChart.js           # Radar 3 poligonos (Actual/MAV/MRV)
    HeatmapChart.js                  # SVG custom carga semanal
    ProgresionCapacidadChart.js      # Lineas con zonas MEV/MRV
    GanttPlanChart.js                # SVG timeline multi-nivel con zoom
  components/DashboardGeneral.js     # Layout que integra las 6 graficas
  components/PeriodizationComplete.js # Tab Dashboard integrado
```

### Colecciones MongoDB V2
- planes_entrenamiento, macrociclos_v2, mesociclos_v2, microciclos_v2
- sesiones_v2, ejercicios_sesion, ejercicios_base
- capacidades_plan, capacidades_bloque, historico_cargas, atletas_v2

## Implementado

### Dashboard General con 6 Graficas Conectadas (Feb 2026)
- Pipeline completo: DB -> API -> Store Zustand -> Hooks -> Graficas
- 6 adaptadores de datos en chartDataAdapters.js
- 6 hooks reactivos con useShallow para re-renders granulares
- PeriodizationChart: barras macrociclos con tabs Vol/Int/Den/Carga + linea inversa
- ACWRChart: carga aguda/cronica con zonas ACWR coloreadas (peligro/atencion/optimo/subcarga)
- CapacidadRadarChart: 3 poligonos Actual/MAV/MRV con click-to-filter
- HeatmapChart: SVG custom grid semanas x dias con escala de color
- ProgresionCapacidadChart: lineas series + intensidad con zonas MEV/MRV
- GanttPlanChart: SVG timeline Plan/Macros/Mesos/Descargas con zoom Sem/Mes/Trim/Todo
- DashboardGeneral: layout con header stats + 6 graficas + panel alertas
- Endpoint historico: GET /api/v2/planes/{id}/historico para ACWR
- Testing: Backend 12/12 + Frontend 100%

### Integracion Frontend <-> V2 Cascade (Feb 2026)
- Sync V1->V2 al cargar plan, metricas V2 en macro/meso/micro, panel alertas
- Testing: Backend 10/10 + Frontend 100%

### Motor de Cascada V2 (Feb 2026)
- Esquema unificado 11 colecciones, propagacion 6 niveles, 7 reglas integridad
- 21+ endpoints REST bajo /api/v2/, seed demo ATR 16 semanas
- Testing: 24/24 passed

## Pendiente

### P1
- Fix hydration warning DashboardPage.js
- Refactorizar DashboardPage.js (4500+ lineas)
- Refactorizar SessionEditor.js (~2000 lineas)
- Refactorizar PeriodizationComplete.js (~3000 lineas)

### P2
- Print/Share/Duplicate planes periodizacion
- Export GIF tablero tactico
- UI catalogo ejercicios base

### P3
- Diseno responsivo tablero tactico
- Fotos avatares 3D

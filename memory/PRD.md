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
  routes/periodization_v2.py         # API V2 + sync + historico
  routes/ai_assistant.py
  migrations/seed_demo.py
```

### Estructura Frontend
```
/app/frontend/src/
  stores/planStore.js                # Zustand store V2
  utils/chartDataAdapters.js         # 6 adaptadores de datos para graficas
  hooks/useChartData.js              # 6 hooks reactivos
  components/charts/                 # 6 componentes de graficas (Dashboard)
  components/DashboardGeneral.js     # Dashboard con 6 graficas
  components/GraphicPlan.js          # Plan Grafico conectado a V2 con 4 charts
  components/PeriodizationComplete.js # Estructura con tabs Dashboard/Estructura/Calendario/Grafico
```

## Implementado

### Plan Grafico Conectado a V2 (Feb 2026)
- GraphicPlan.js conectado al store Zustand V2
- Grilla auto-poblada: Macrociclo, Mesociclo, Microciclo, Preparacion, Capacidades fisicas
- 4 graficas con datos V2: Carga/Recuperacion, Volumen/Intensidad, Densidad (NUEVA), Duracion (NUEVA)
- Selectores de tipo de grafica (Barras/Lineas/Areas/Combinado/Apiladas)
- Tooltips enriquecidos con RPE, ACWR, Tonelaje, UA
- Sync automatico V1->V2 al cargar plan
- Testing: Backend 11/11 + Frontend 100%

### Dashboard General con 6 Graficas (Feb 2026)
- Pipeline DB->API->Zustand->Hooks->Graficas
- PeriodizationChart, ACWRChart, CapacidadRadarChart, HeatmapChart, ProgresionCapacidadChart, GanttPlanChart
- Testing: Backend 12/12 + Frontend 100%

### Motor de Cascada V2 (Feb 2026)
- 11 colecciones MongoDB, propagacion 6 niveles, 7 reglas integridad
- 21+ endpoints REST, seed demo ATR 16 semanas
- Testing: 24/24 + sync 10/10

## Pendiente

### P1
- Fix hydration warning DashboardPage.js
- Refactorizar componentes gigantes

### P2
- Print/Share/Duplicate planes periodizacion
- Export GIF tablero tactico
- UI catalogo ejercicios base

### P3
- Diseno responsivo tablero tactico
- Fotos avatares 3D

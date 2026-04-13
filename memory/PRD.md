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
  server.py                          # API V1 (7300+ lineas)
  models/schemas.py                  # Pydantic models V2 (periodizacion)
  services/cascade.py                # Motor cascada (6 niveles)
  services/validation.py             # 7 reglas integridad
  routes/periodization_v2.py         # API REST V2 con propagacion
  routes/ai_assistant.py             # Asistente IA
  migrations/seed_demo.py            # Seed plan ATR 16 semanas
```

### Estructura Frontend
```
/app/frontend/src/
  stores/planStore.js                # Zustand store V2
  components/PeriodizationComplete.js # UI periodizacion (existente)
  components/SessionEditor.js         # Editor sesiones (existente)
  components/InteractiveChart.js      # Graficos Recharts
  pages/DashboardPage.js              # Dashboard principal
  pages/SessionViewPage.js            # Vista compartida/PDF
```

### Colecciones MongoDB V2
- planes_entrenamiento
- macrociclos_v2
- mesociclos_v2
- microciclos_v2
- sesiones_v2
- ejercicios_sesion
- ejercicios_base
- capacidades_plan
- capacidades_bloque
- historico_cargas
- atletas_v2

## Implementado

### Motor de Cascada V2 (Feb 2026)
- Esquema unificado: Plan -> Macro -> Meso -> Micro -> Sesion -> Ejercicio
- Propagacion automatica en 6 niveles al editar cualquier entidad
- Metricas calculadas: volumen, intensidad, densidad, carga, tonelaje, TRIMP, ACWR
- 7 reglas de integridad: ACWR alto/bajo, vol+int simultaneo, descarga, interferencia, orden, sobrevolumen
- API REST completa: 21 endpoints bajo /api/v2/
- Store Zustand con acciones CRUD y propagacion
- Seed demo: Plan ATR Futbol 16 semanas (3 macros, 6 mesos, 16 micros, 80 sesiones, 290+ ejercicios)
- Catalogo de ejercicios base con 9 ejercicios
- Capacidades MEV/MAV/MRV por plan
- Historico de cargas para ACWR rolling
- Testing: 24/24 tests passed (100%)

### Anteriores (Abr 2026)
- Grafico MEV-MAV-MRV Dinamico en Mesociclo
- Sistema de Materiales completo
- Sistema de Carga y Progresion
- Rediseno tarjetas Material Design
- Graficos interactivos Recharts
- PDF/Share con metricas auto-calculadas
- Tablero tactico con IA

## Pendiente

### P1
- Fix hydration warning DashboardPage.js
- Refactorizar DashboardPage.js (4500+ lineas)
- Refactorizar SessionEditor.js (~2000 lineas)
- Refactorizar PeriodizationComplete.js (~3000 lineas)
- Conectar frontend existente con API V2

### P2
- Print, Share, Duplicate planes periodizacion
- Exportar GIF tablero tactico
- UI para catalogo ejercicios base

### P3
- Diseno responsivo tablero tactico
- Fotos avatares 3D jugadores

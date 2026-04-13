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
  routes/periodization_v2.py         # API REST V2 con propagacion + sync V1->V2
  routes/ai_assistant.py             # Asistente IA
  migrations/seed_demo.py            # Seed plan ATR 16 semanas
```

### Estructura Frontend
```
/app/frontend/src/
  stores/planStore.js                # Zustand store V2 (sync + CRUD + cascade)
  components/PeriodizationComplete.js # UI periodizacion (conectado a V2 cascade)
  components/SessionEditor.js         # Editor sesiones
  components/InteractiveChart.js      # Graficos Recharts
  pages/DashboardPage.js              # Dashboard principal
  pages/SessionViewPage.js            # Vista compartida/PDF
```

### Colecciones MongoDB V2
- planes_entrenamiento, macrociclos_v2, mesociclos_v2, microciclos_v2
- sesiones_v2, ejercicios_sesion, ejercicios_base
- capacidades_plan, capacidades_bloque, historico_cargas, atletas_v2

## Implementado

### Integracion Frontend ↔ V2 Cascade (Feb 2026)
- Zustand store (planStore.js) con syncFromV1, CRUD, propagacion
- PeriodizationComplete.js conectado al store V2
- Sync automatico V1→V2 al cargar plan
- Metricas V2 en header: Tonelaje, Progreso
- Metricas V2 en macrociclos: Vol calc, Int calc, ACWR, Carga
- Metricas V2 en mesociclos: Tonelaje, ACWR, RPE
- Metricas V2 en microciclos: ACWR badge
- Panel de alertas V2 con validaciones del motor
- Re-sync automatico al guardar sesiones
- Testing: Backend 10/10 + Frontend 100%

### Motor de Cascada V2 (Feb 2026)
- Esquema unificado: Plan -> Macro -> Meso -> Micro -> Sesion -> Ejercicio
- 11 colecciones MongoDB con indices
- Propagacion automatica 6 niveles
- 7 reglas integridad (ACWR, interferencia, sobrevolumen)
- 21+ endpoints REST bajo /api/v2/
- Seed demo: ATR Futbol 16 semanas
- Testing: 24/24 passed

### Anteriores (Abr 2026)
- Grafico MEV-MAV-MRV Dinamico en Mesociclo
- Sistema de Materiales, Carga y Progresion
- Rediseno tarjetas Material Design
- Tablero tactico con IA
- PDF/Share con metricas

## Pendiente

### P1
- Fix hydration warning DashboardPage.js (recurrente)
- Refactorizar DashboardPage.js (4500+ lineas)
- Refactorizar SessionEditor.js (~2000 lineas)
- Refactorizar PeriodizationComplete.js (~3000 lineas)

### P2
- Print, Share, Duplicate planes periodizacion
- Exportar GIF tablero tactico
- UI para catalogo ejercicios base

### P3
- Diseno responsivo tablero tactico
- Fotos avatares 3D jugadores

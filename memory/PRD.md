# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura

### Stack
- Frontend: React + Zustand + Recharts + Shadcn/UI
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB

### Colecciones MongoDB V2
- planes_entrenamiento, macrociclos_v2, mesociclos_v2, microciclos_v2
- sesiones_v2, ejercicios_sesion, ejercicios_base
- capacidades_plan, capacidades_bloque, historico_cargas, atletas_v2

## Implementado

### Plan Grafico con InteractiveChart (Feb 2026)
- 5 graficas InteractiveChart reemplazan las graficas simples del GraphicPlan
- Diseño identico al Panel de Control: toolbar, brush, zoom, fullscreen, live badge
- Charts: Carga/Recuperacion, Volumen/Intensidad, Densidad, Duracion, Intensidad/Recuperacion
- Datos V2 en tiempo real via Zustand store
- Testing: visual + lint passed

### Plan Grafico Conectado a V2 (Feb 2026)
- Grilla auto-poblada desde macrociclos, mesociclos, microciclos
- 4 graficas con metricas V2 calculadas por cascada
- Testing: Backend 11/11 + Frontend 100%

### Dashboard General con 6 Graficas (Feb 2026)
- Pipeline DB->API->Zustand->Hooks->Graficas
- 6 componentes Recharts/SVG con hooks reactivos
- Testing: Backend 12/12 + Frontend 100%

### Motor de Cascada V2 (Feb 2026)
- 11 colecciones, propagacion 6 niveles, 7 reglas integridad
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

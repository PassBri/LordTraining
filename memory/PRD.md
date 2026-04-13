# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Shadcn UI + TailwindCSS + Recharts
- Backend: FastAPI + MongoDB
- PDF: Playwright (Headless Chromium)

## Implementado (Fork 12 - Abr 2026)

### Grafico MEV-MAV-MRV con Recharts en Mesociclo (Abr 13, 2026)
- Recharts ComposedChart: barras + linea con dots
- Lineas de referencia punteadas: MEV (verde), MAV (cyan), MRV (rojo)
- Fondo blanco limpio, grid punteado sutil
- Tooltip custom: zona, series totales, sesiones, carga, explicacion
- Tooltip educativo: tabla siglas, explicacion Dr. Israetel
- Leyenda inline con valores calculados
- Calculo series totales por microciclo desde datos reales de sesiones
- Ubicacion correcta: mesociclo (PeriodizationComplete.js)

### Parametros Carga/Metricas en Activity Card (Abr 13, 2026)
- Panel colapsable con metricas auto-calculadas
- Volumen/Intensidad dinamicos por capacidad
- CAPACITY_CONFIG con unidades por capacidad

### Materiales + Titulos Fase (Abr 13, 2026)
- Materiales custom, editar/eliminar
- Fases prominentes con colores distintos

## Pendiente
- P1: Fix hydration warning DashboardPage.js
- P1: Refactorizar DashboardPage.js (4500+ lineas)
- P1: Refactorizar SessionEditor.js (~2000 lineas)
- P2: Print, Share, Duplicate planes periodizacion
- P2: Exportar GIF tablero tactico
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

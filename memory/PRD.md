# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 11 - Abr 2026)

### Gráficas FC visibles con datos preestablecidos (Abr 12, 2026)
- Valores iniciales reales: Antes 70, Durante 150, Después 90, Recup 1' 85, Recup 3' 78, Recup 5' 72
- Barras: colores por fase, valores numéricos, labels, alturas proporcionales
- Líneas: curva lime #CCFF00 con área degradada, puntos con valor, viewBox SVG nativo
- Mixta: barras semitransparentes + línea superpuesta
- Actualización en tiempo real al modificar inputs

### Persistencia de datos de sesión (Abr 12, 2026)
- Backend: campo detailed_data en TrainingPlanSession
- Frontend: handleSaveSession persiste via savePlanToAPI (PUT)
- Datos se restauran al reabrir

### Correcciones tipográficas + Rediseño (Abr 12, 2026)
- DM Sans, jerarquía 3 niveles, tildes correctas, fases #9EFF00
- Header oscuro, logo lime, calendario Popover, footer lime

## Pendiente
- P1: Fix hydration warning en DashboardPage.js
- P1: Refactorizar DashboardPage.js (4500+ líneas)
- P2: Exportar PDF/GIF tablero táctico
- P2: Print, Share, Duplicate planes
- P3: Diseño responsivo tablero táctico
- P3: Fotos avatares 3D

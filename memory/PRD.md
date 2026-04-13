# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Shadcn UI + TailwindCSS
- Backend: FastAPI + MongoDB
- PDF: Playwright (Headless Chromium) en backend

## Implementado (Fork 12 - Abr 2026)

### Grafico MEV-MAV-MRV rediseñado (Abr 13, 2026)
- Fondo oscuro con lineas de zona punteadas (MRV, MAV, MEV)
- Barras coloreadas segun zona: verde MEV, ambar MAV, rojo MRV, azul Descarga
- Leyenda de colores (MEV, MAV, MRV, Descarga)
- Boton info (i) con tooltip educativo sobre MEV/MAV/MRV
- Tooltip por barra: muestra zona, volumen, explicacion contextual
- Labels de semana 10px, zona debajo, valores 11px bold

### Retoque Material Design Activity Cards (Abr 13, 2026)
- Tipografia escalada, espaciado mejorado, Material Design consistente

### Volumen e Intensidad dinamicos por capacidad (Abr 13, 2026)
- CAPACITY_CONFIG con unidades por capacidad

### Sistema de Carga, Metricas y Progresion (Abr 13, 2026)
- Panel colapsable, metricas auto-calculadas, modelos progresion

### Gestion completa de Materiales + Titulos de Fase (Abr 13, 2026)
- Materiales custom, editar/eliminar, fases prominentes

## Pendiente
- P1: Fix hydration warning DashboardPage.js
- P1: Refactorizar DashboardPage.js (4500+ lineas)
- P1: Refactorizar SessionEditor.js (~2100 lineas)
- P2: Print, Share, Duplicate planes periodizacion
- P2: Exportar GIF tablero tactico
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

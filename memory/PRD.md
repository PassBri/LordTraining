# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 11 - Abr 2026)

### Gráfica FC profesional rediseñada (Abr 12, 2026)
- Curva bezier suave lime #CCFF00 con área degradada (modo Líneas)
- Barras coloreadas con valores numéricos encima (modo Barras)  
- Mixta: barras semitransparentes + curva superpuesta
- Grid Y-axis con ticks dinámicos, X-axis con labels coloreados
- SVG viewBox con preserveAspectRatio=none para renderizado limpio
- Leyenda inferior con dots coloreados + inputs editables
- Valores preestablecidos: Antes 70, Durante 150, Después 90, Recup 85/78/72

### Persistencia, tipografía y rediseño previos (Abr 12, 2026)
- Datos de sesión guardados en MongoDB via detailed_data
- Fuente DM Sans, jerarquía 3 niveles, tildes correctas
- Header oscuro, logo lime, calendario Popover, footer lime

## Pendiente
- P1: Fix hydration warning en DashboardPage.js
- P1: Refactorizar DashboardPage.js (4500+ líneas)
- P2: Exportar PDF/GIF tablero táctico
- P2: Print, Share, Duplicate planes
- P3: Diseño responsivo tablero táctico
- P3: Fotos avatares 3D

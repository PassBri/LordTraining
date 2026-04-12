# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 10 - Feb 2026)

### Perspectiva 3D corregida — Fiel al 2D (Feb 2026)
- Superficie blanca sin colores (igual que 2D)
- Lineas oscuras sobre fondo blanco
- Cada deporte proyecta sus lineas 2D exactas en isometria
- Baloncesto: arcos de 3 puntos elipticos (isoEllipseArc), semicirculos tiro libre, llaves, aros 3D
- Futbol: arcos de penal, esquinas, areas, porterias 3D
- Balonmano: arcos 6m/9m, porterias 3D
- Futbol de Salon: arcos de area, puntos de penal
- Voleibol: red 3D, lineas ataque
- Rugby: try zones, Futbol Americano: end zones
- +25 deportes con lineas correctas
- Todos los elementos (banderas, vallas, platillos, etc.) con builders 3D dedicados
- Helpers: isoArc, isoEllipseArc, isoFilledRect

### Vista 3D Isometrica (Fork 9)
- 3 modos: 2D, 2.5D, 3D isometrica
- Joystick camara 3D
- Algoritmo de pintor z-ordering
- Elementos preservados al cambiar vistas

## Pendiente
- P1: Integrar thumbnail tactico en SessionEditor.js
- P1: Fix hydration warning en DashboardPage.js
- P1: Refactorizar DashboardPage.js (4400+ lineas)
- P2: Exportar PDF/GIF animacion
- P2: Print, Share, Duplicate planes
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

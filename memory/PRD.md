# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 10 - Feb 2026)

### Perspectiva 3D corregida — Fiel al 2D (Feb 2026)
- Superficie blanca sin colores (igual que 2D)
- Lineas oscuras sobre fondo blanco (misma estetica que 2D)
- Cada deporte proyecta sus lineas 2D exactas en isometria:
  - Futbol: arcos de penal, esquinas, centro, areas, porterias 3D
  - Baloncesto: arcos 3 puntos, semicirculos tiro libre, llaves, aros 3D
  - Balonmano: arcos 6m/9m, porterias 3D, puntos de penal
  - Futbol de Salon: arcos de area, porterias, puntos, lineas sustitucion
  - Voleibol: red 3D, lineas ataque (punteadas)
  - Rugby: try zones (filled), lineas solidas/punteadas
  - Futbol Americano: end zones (filled), yardas
  - +25 deportes mas con lineas correctas
- Todos los elementos se renderizan correctamente en 3D:
  - Banderas: poste + bandera coloreada
  - Vallas: barras naranjas con patas
  - Platillos: elipses coloreadas
  - Mini arcos: marcos con postes
  - Barreras: cilindros verticales
  - Petos: silueta de chaleco
  - Aros: circulos coloreados
  - Escaleras: marco con peldanos
  - Picas: postes con cabeza
  - Flechas/lineas/curvas/trazos: colores oscuros visibles
  - Texto: color oscuro por defecto
  - Plyobox, kettlebell, balon med, TRX, trineo, etc.
- Nuevos helpers: isoArc(), isoFilledRect(), buildIsoPencil(), buildIsoCurve()
- Builders dedicados: buildIsoFlag, buildIsoHurdle, buildIsoDisc, buildIsoMinigoal, etc.

### Vista 3D Isometrica (Fork 9)
- 3 modos: 2D, 2.5D, 3D isometrica
- Joystick camara 3D + presets (cenital, frontal, izq, der)
- Algoritmo de pintor z-ordering
- Elementos preservados al cambiar vistas

### Formaciones Tacticas (12 deportes)
### Tema Claro Material FAB Sidebar
### Campos Proporcionados (FIBA, FIFA, etc.)

## Pendiente
- P1: Integrar thumbnail tactico en SessionEditor.js
- P1: Fix hydration warning en DashboardPage.js (recurrente x3)
- P1: Refactorizar DashboardPage.js (4400+ lineas)
- P2: Exportar PDF/GIF animacion
- P2: Print, Share, Duplicate planes
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

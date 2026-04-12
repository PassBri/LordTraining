# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 9 - 14 Abr 2026)

### Barra de Vista (VIEW BAR)
- **2D / 2.5D**: Toggle entre vista plana y perspectiva (rotateX 35°, perspective 900px)
- **Rotación campo**: ↺ -90°, ↻ +90° (acumulable), Flip H, Flip V, Reset
- **Modo Avatar**: Táctico (círculos) / Camiseta (shirt SVG) / Avatar (figura completa)
- Atajos: 2=2D, 3=2.5D, R=Rotar, M=Flip, Tab=Cambiar avatar, H=Toggle panel

### Modos de Visualización de Jugadores
- **Táctico**: Círculos con número, sombra sutil
- **Camiseta**: SVG de camiseta vista desde arriba con número centrado
- **Avatar**: Figura completa: cabeza, cuerpo (camiseta+número), brazos, piernas, shorts
- contrastColor() auto para legibilidad del número

### Sistema de Capas Z-Order
- Zonas(0) → Líneas(1) → Materiales(2) → Jugadores(3) → Textos(4)

### Atajos de Teclado
- Ctrl+Z/Y: Deshacer/Rehacer
- Ctrl+A/D/S: Seleccionar todo/Duplicar/Exportar
- Delete: Eliminar, Escape: Deseleccionar
- +/-/0: Zoom, F: Fit, H: Toggle panel
- 2/3: Vista 2D/2.5D, R/M: Rotar/Flip
- Tab: Ciclar avatar, P: Reproducir

## Pendiente
- P1: Vista 3D isométrica completa
- P1: Formaciones tácticas por deporte
- P2: Exportar PDF/GIF
- P2: Flecha aérea con parábola
- P3: Joystick 3D, carga de fotos

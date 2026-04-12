# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 9 - 14 Abr 2026)

### Texto Inline (Bug #1 Fix)
- Click en Texto → click en canvas → input inline con borde azul aparece en la posición exacta
- El input usa SVG screenCTM para posición precisa con zoom/pan
- Enter confirma, Escape cancela, blur confirma
- Texto se congela como SVG `<text>` permanente, arrastrable y seleccionable
- Sin prompt() del navegador

### Zonas de Color Semitransparentes (Feature)
- 6 colores predefinidos: Azul, Verde, Rojo, Naranja, Morado, Gris
- Picker visual con vista previa semitransparente + borde punteado
- Relleno: fill-opacity 0.12, Borde: stroke-opacity 0.45, stroke-dasharray 6 4
- Border-radius 8px, etiqueta opcional centrada
- Propiedades: zoneColor, opacity, borderOpacity, label

### Sistema de Capas (Z-Order)
- 0: Zonas semitransparentes (siempre al fondo)
- 1: Líneas, flechas, curvas, trazos
- 2: Materiales de campo (conos, aros, escaleras, etc.)
- 3: Jugadores y porteros
- 4: Textos y etiquetas (siempre encima)

### Toolbar FAB + Biblioteca Materiales (30+ herramientas)
- Estilo FAB circular idéntico al panel de control del dashboard
- Headers por categoría, color pickers por elemento, line style picker

## Pendiente
- P1: Refactorizar DashboardPage.js
- P2: Exportar PDF/GIF
- P3: Responsive

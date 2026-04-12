# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 11 - Abr 2026)

### Gráfica FC — texto duplicado y selector de estilo (Abr 12, 2026)
- Eliminados labels X-axis duplicados (solo en leyenda inferior)
- Selector de estilo de línea: Lima, Multi (gradiente multicolor), Punteada, Degradado (cyan→violeta)
- Selector solo visible en modo Líneas/Mixta, oculto en Barras
- estiloLinea persiste en sessionData.monitoreo

### Gráfica FC profesional (Abr 12, 2026)
- Curva bezier, barras con valores, 3 modos, grid Y dinámico

### Persistencia, tipografía, rediseño (Abr 12, 2026)
- Datos sesión en MongoDB, DM Sans, tildes, header lime

## Pendiente
- P1: Fix hydration warning DashboardPage.js
- P1: Refactorizar DashboardPage.js (4500+ líneas)
- P2: Exportar PDF/GIF tablero táctico
- P2: Print, Share, Duplicate planes
- P3: Diseño responsivo tablero táctico
- P3: Fotos avatares 3D

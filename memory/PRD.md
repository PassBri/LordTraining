# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 12 - Abr 2026)

### Gestion completa de Materiales (Abr 13, 2026)
- Input para agregar materiales personalizados (no solo predefinidos)
- Tags editables (clic para editar nombre via prompt)
- Eliminar con X en cada tag
- Popover con lista predefinida de 26 materiales + input custom
- Cambios reflejados en enlace compartido y PDF automaticamente
- Mejora visual de materiales en SessionViewPage.js (label + separador)

### Titulos de Fase prominentes (Abr 13, 2026)
- FASE INICIAL: fondo lime #CCFF00, texto oscuro, icono Zap
- FASE PRINCIPAL: fondo oscuro #0a0a0f, texto blanco, icono Target
- FASE FINAL: fondo azul #3B82F6, texto blanco, icono Activity
- Tipografia Barlow Condensed 800 weight, 13px uppercase
- Badge con conteo de actividades
- Boton "Agregar" integrado en header de fase

### Mejora espaciado Activity Cards (Abr 13, 2026)
- Mayor padding en descripcion (p-5), stats (p-4), pizarra (p-3.5)
- Textarea de descripcion con 4 rows y min-h-[70px]
- Grid de stats con gap-2 y padding p-2.5
- Espacio entre tarjetas space-y-4, entre fases space-y-4

## Implementado (Fork 11 - Abr 2026)

### Grafica FC - texto duplicado y selector de estilo (Abr 12, 2026)
- Eliminados labels X-axis duplicados (solo en leyenda inferior)
- Selector de estilo de linea: Lima, Multi, Punteada, Degradado
- Selector solo visible en modo Lineas/Mixta, oculto en Barras
- estiloLinea persiste en sessionData.monitoreo

### Grafica FC profesional (Abr 12, 2026)
- Curva bezier, barras con valores, 3 modos, grid Y dinamico

### Persistencia, tipografia, rediseno (Abr 12, 2026)
- Datos sesion en MongoDB, DM Sans, tildes, header lime

### Compartir sesiones (Abr 12, 2026)
- Links publicos /s/:shareId con SessionViewPage.js
- Temas claro/oscuro para vista publica
- PDF via Playwright backend (/api/sessions/download-pdf/{share_id})

## Pendiente
- P1: Fix hydration warning DashboardPage.js (recurrente x4)
- P1: Refactorizar DashboardPage.js (4500+ lineas)
- P1: Refactorizar SessionEditor.js (~1700 lineas)
- P2: Print, Share, Duplicate planes periodizacion
- P2: Exportar GIF tablero tactico
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

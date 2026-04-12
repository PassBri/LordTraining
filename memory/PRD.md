# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 9 - 12 Abr 2026)

### Pizarra Táctica Digital - Tema Claro
- Conversión completa de tema oscuro a tema claro (fondo blanco, texto oscuro, bordes sutiles)
- CSS variables: --bg:#ffffff, --primary:#2563eb, --text:#1e293b, --border:#e2e8f0
- Botones: Guardar (verde), Exportar PNG (azul), Generar con IA (morado)
- Todos los elementos SVG actualizados para visibilidad en fondo blanco

### Campos deportivos rediseñados (40+ deportes)
- Todos con fondo blanco y líneas negras/oscuras (rgba(0,0,0,0.65))
- Baloncesto: Rediseñado con proporciones reales (15x28m), arcos de 3 puntos, tableros, aros
- Balonmano: Corregida línea central (ahora horizontal)
- Deportes de combate CUADRADOS (realistas):
  - Boxeo: ring cuadrado 400x400 con cuerdas y esquinas roja/azul
  - Judo: tatami cuadrado con zona de seguridad y área de competición
  - Taekwondo: mat cuadrado con área octagonal interior
  - Karate: mat cuadrado con zona de competición
  - Kickboxing: ring cuadrado
  - Lucha: mat cuadrado con círculos concéntricos
  - MMA: octágono proporcionado
  - Gimnasia: tapete cuadrado

### Sistema Guardar/Galería
- Botón "Guardar" en footer (verde, conecta al backend)
- Panel derecho con pestañas: "Elementos" | "Galería"
- CRUD completo: guardar, listar, cargar, eliminar pizarras
- Generación de thumbnails SVG para cada pizarra guardada
- Notificaciones toast para feedback visual

### Integración SessionEditor
- Columna "Pizarra" en tabla de actividades
- Click abre tactical-board.html en nueva pestaña
- postMessage comunica thumbnail guardado de vuelta
- Thumbnail inline se muestra en la celda de la tabla
- boardId y boardThumbnail almacenados por actividad

### Bugs corregidos
- ViewBox SVG: 600x800 (vertical, correcto)
- Background rect: 600x800 (era 800x600)
- Grid: coordenadas 600x800 (era 800x600)
- Elementos se limpian al cambiar de deporte
- Jugador B color: #334155 (visible en fondo blanco, era #ffffff)
- Flechas/líneas oscuras (eran blancas, invisibles en fondo blanco)
- Exportar PNG: fondo blanco (era oscuro)

## Pendiente
- P1: Refactorizar DashboardPage.js (muy grande, >4400 líneas)
- P2: Modo gimnasio con equipos detallados
- P2: Exportar PDF/GIF de pizarra
- P2: Print/Share/Duplicate de planes con thumbnails
- P3: Responsive

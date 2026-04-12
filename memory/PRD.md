# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 9 - 13 Abr 2026)

### Pizarra Táctica - Tema Claro
- Conversión completa de tema oscuro a tema claro (fondo blanco, texto oscuro, bordes sutiles)
- CSS variables: --bg:#ffffff, --primary:#2563eb, --text:#1e293b, --border:#e2e8f0
- Botones: Guardar (verde), Exportar PNG (azul), Generar con IA (morado)

### Selector de Colores para Equipos
- Click en Jugador A/B abre popup con 10 colores: rojo, azul, verde, amarillo, naranja, morado, rosa, cyan, oscuro, blanco
- Iconos del toolbar se actualizan dinámicamente con el color seleccionado
- Colores por defecto: Equipo A = rojo (#ef4444), Equipo B = azul (#2563eb)

### Campos Deportivos (40+ deportes, fondo blanco, líneas negras)
- **Baloncesto**: Rediseñado según pizarra Spalding - key rectangular, semicírculo TL sólido/punteado, arco 3pts con rectas a baseline, tablero + aro, círculo central
- **Balonmano**: Rediseñado según pizarra oficial - arcos elípticos reales (6m rx=144/ry=108, 9m rx=216/ry=162), portería, marca penalti 7m, marcas sustitución
- **Atletismo**: Pista oval con semicírculos perfectos (rx=150), 8 carriles
- **Patinaje Velocidad**: Óvalo con semicírculos perfectos
- **Deportes de combate CUADRADOS**: Boxeo, Judo, Taekwondo, Karate, Kickboxing, Lucha, MMA, Gimnasia

### Sistema Guardar/Galería
- Botón "Guardar" → galería lateral con CRUD completo
- Thumbnails SVG, comunicación postMessage a SessionEditor

### Integración SessionEditor
- Columna "Pizarra" con thumbnail inline por actividad

## Pendiente
- P1: Refactorizar DashboardPage.js (+4400 líneas)
- P2: Exportar PDF/GIF de pizarra
- P2: Print/Share/Duplicate con thumbnails
- P3: Responsive

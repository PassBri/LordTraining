# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 9 - 13 Abr 2026)

### Pizarra Táctica - Tema Claro + Selector Colores
- Tema claro completo (fondo blanco, azul primario, texto oscuro)
- Selector de 10 colores por equipo (click en Jugador A/B)

### Campos con Medidas Reglamentarias Calculadas
- **Baloncesto FIBA**: 28×15m, key 4.9×5.8m, semicírculo TL r=1.8m, arco 3pts 6.75m, tablero+aro
- **Balonmano**: 40×20m, arcos elípticos 6m (rx=144/ry=108) y 9m (rx=216/ry=162), portería, penalti 7m
- **Taekwondo WT**: mat 12×12m, octágono de competición 8m (radio vértice 4/cos(π/8))
- **MMA/UFC**: octágono 30ft entre lados paralelos (r=205px), línea padding, círculo central
- **Fútbol de Salón** (NUEVO): 40×20m, áreas 6m semicirculares, penaltis 6m+10m, porterías 3m, círculo central 3m, esquineros, zonas sustitución
- Fútbol, Voleibol, Rugby, Hockey, Béisbol, Fútbol Americano, Tenis, Pádel, etc.
- Deportes combate cuadrados: Boxeo, Judo, Karate, Kickboxing, Lucha

### Sistema Guardar/Galería + Integración SessionEditor
- CRUD completo con thumbnails SVG
- postMessage a SessionEditor para thumbnails en tabla

## Pendiente
- P1: Refactorizar DashboardPage.js
- P2: Exportar PDF/GIF
- P2: Print/Share/Duplicate
- P3: Responsive

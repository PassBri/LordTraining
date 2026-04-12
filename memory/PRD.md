# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 9 - 13 Abr 2026)

### Toolbar Material Design
- Ancho 76px con headers de categoría (DIBUJO, PERSONAS, CAMPO, AGILIDAD, FUERZA, CARDIO, RECUPER.)
- Scrollbar fino, iconos 20px claros, labels 7px
- 30+ herramientas organizadas por categorías

### Selector de Colores Universal
- **Jugadores A/B**: 10 colores con botón "Usar"
- **Elementos colorables** (Cono, Platillo, Aro, Peto, Pica, Bandera, Banda): picker con 10 colores
- Los colores se guardan en ST.elementColors y se aplican al crear nuevos elementos

### Estilos de Línea y Curva
- **3 estilos**: Sólida, Guiones, Puntos (con previsualización SVG)
- **7 colores**: Negro, rojo, azul, verde, naranja, morado
- Se aplica a: Línea, Curva, Flecha
- **Curva 2 fases**: drag para inicio/fin, click para punto de control (funcional)
- Cada elemento guarda su estilo individualmente

### Biblioteca de 20+ Materiales
- Campo: Platillo, Mini Arco, Barrera, Peto
- Agilidad: Aro, Escalera, Pica
- Fuerza: Cajón, Kettlebell, Balón Med., TRX, Trineo, Paracaídas
- Cardio: Cuerda, Battle Rope
- Recuperación: Roller, Banda, Bosu, Colchoneta

### Campos Reglamentarios (40+ deportes)
- Baloncesto FIBA, Balonmano, Fútbol, Fútbol de Salón, Béisbol
- Taekwondo WT, MMA/UFC, deportes combate cuadrados
- + 30 deportes más

## Pendiente
- P1: Refactorizar DashboardPage.js
- P2: Exportar PDF/GIF
- P3: Responsive

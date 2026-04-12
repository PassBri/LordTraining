# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 9 - 14 Abr 2026)

### Vista 3D Isométrica
- 3 modos: 2D (plano), 2.5D (perspective 900px rotateX 35°), 3D (perspective 1000px rotateX 55° rotateZ -15°)
- Transición animada 400ms cubic-bezier entre modos
- Elementos 3D: sombras elípticas blur, pins, highlights, volumen en conos/balón
- Atajos: 2=2D, 3=2.5D, 4=3D

### Flechas con Estela Degradada
- LinearGradient SVG de transparente→opaco por cada flecha
- Trail ancho (3.5x stroke) con opacity 0.2 para efecto de estela
- Sombra 3D adicional en modos perspectiva (blur + offset)

### Formaciones Tácticas por Deporte (12 deportes)
- Fútbol: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1
- Fútbol de Salón: 1-2-1, 2-2, 3-1, 4-0 Power
- Baloncesto: 2-3 Zona, 1-2-2, 3-2, 1-3-1
- Voleibol: 5-1, 4-2, 6-2
- Balonmano: 6-0 Def, 5-1 Def, 3-3 Ataque
- Rugby: Scrum 3-4-1, Backs
- Hockey: 2-1-2, 1-2-2
- Fútbol Americano: I-Formation, Shotgun
- Béisbol, Tenis, Boxeo, Judo
- Modal con preview visual de cada formación
- Aplicación escalonada 50ms por jugador

### Elementos 3D
- Jugadores: sombra elíptica blur, pin vertical, highlight specular
- Conos: sombra 3D, highlight lateral
- Balón: sombra blur, highlight specular
- Camisetas: sombra drop
- Avatares: sombra completa, zapatos, brazos con rotación

## Pendiente
- P2: Exportar PDF/GIF
- P2: Flecha aérea con parábola
- P3: Joystick 3D, fotos de jugadores

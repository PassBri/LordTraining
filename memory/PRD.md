# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 10 - Feb 2026)

### Correccion: Vista 3D Multi-Deporte (Feb 2026)
- FIXED: 3D ahora muestra campos especificos por deporte (antes siempre mostraba futbol)
  - Futbol: campo verde con lineas, areas de penal, porterias 3D
  - Voleibol: cancha madera con red 3D (postes + malla), lineas de ataque
  - Baloncesto: cancha madera con aros 3D, areas de tiro libre
  - Boxeo: colchoneta gris oscuro con cuerdas 3D del ring
  - Tenis/Padel/Badminton: canchas con red 3D
  - Balonmano/Hockey/Rugby/etc: campos apropiados
- FIXED: Elementos ya no desaparecen al cambiar entre vistas 2D/2.5D/3D
- FIXED: Red de voleibol visible en vista 3D (postes, malla, barras superiores)
- Nuevas funciones: get3DSportColors(), render3DFieldLines(), render3DFieldObjects(), renderFieldOnly()

### Vista 3D Isometrica (Fork 9)
- 3 modos: 2D (plano), 2.5D (perspective rotateX), 3D (isometrica matematica)
- Transicion animada 400ms cubic-bezier entre modos
- Elementos 3D: sombras elipticas blur, pins, highlights, volumen en conos/balon
- Joystick para control de camara 3D (azimuth/elevation)
- Algoritmo de pintor (z-ordering por isoY) para profundidad correcta
- Atajos: 2=2D, 3=2.5D, 4=3D

### Flechas con Estela Degradada
- LinearGradient SVG de transparente a opaco por cada flecha
- Trail ancho (3.5x stroke) con opacity 0.2 para efecto de estela
- Sombra 3D adicional en modos perspectiva

### Formaciones Tacticas por Deporte (12 deportes)
- Futbol: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1
- Futbol de Salon: 1-2-1, 2-2, 3-1, 4-0 Power
- Baloncesto: 2-3 Zona, 1-2-2, 3-2, 1-3-1
- Voleibol: 5-1, 4-2, 6-2
- Balonmano: 6-0 Def, 5-1 Def, 3-3 Ataque
- Rugby: Scrum 3-4-1, Backs
- Hockey: 2-1-2, 1-2-2
- Futbol Americano: I-Formation, Shotgun
- Beisbol, Tenis, Boxeo, Judo

### Tema Claro con Material FAB Sidebar
- Layout: Sidebar izquierda unificada con todas las herramientas
- Botones FAB circulares con iconos SVG
- 8 categorias de deportes con iconos SVG unicos
- 20+ elementos de material de entrenamiento

### Campos Proporcionados
- FIBA Baloncesto, FIFA Futsal, Handball, Atletismo, Beisbol, Taekwondo, MMA
- Todos con dimensiones y marcas oficiales

## Pendiente
- P1: Integrar thumbnail tactico en SessionEditor.js y verificar PDF
- P1: Fix hydration warning en DashboardPage.js (recurrente x3)
- P1: Refactorizar DashboardPage.js (4400+ lineas)
- P2: Exportar PDF/GIF de animacion desde tactical-board.html
- P2: Print, Share, Duplicate de planes de entrenamiento
- P3: Diseno responsivo del tablero tactico (Mobile/Tablet)
- P3: Subida de fotos para avatares 3D

## Arquitectura
- Frontend: React + Tailwind + Shadcn
- Backend: FastAPI + MongoDB
- tactical-board.html: Vanilla JS/SVG standalone (NO React)
- Comunicacion: window.postMessage entre iframe y SessionEditor

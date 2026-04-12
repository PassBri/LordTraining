# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 10 - Feb 2026)

### Vista 3D sin colores - Fiel al diseno 2D (Feb 2026)
- Superficie blanca en 3D para todos los deportes (igual que 2D)
- Lineas oscuras sobre fondo blanco (misma estetica que 2D)
- Bordes laterales gris claro (#e2e8f0, #cbd5e1) para volumen 3D
- Eliminada funcion get3DSportColors() — no mas colores innecesarios
- Rendimiento mejorado al eliminar gradientes y colores de superficie

### Campos 3D por deporte con objetos 3D
- Futbol: lineas isometricas + porterias 3D
- Voleibol: lineas + red 3D (postes + malla)
- Baloncesto: lineas + aros 3D
- Boxeo/Kickboxing: cuerdas 3D + postes esquinas
- Tenis/Padel/Badminton/Tenis de Mesa: red 3D
- Squash/Fronton: pared frontal 3D
- +30 deportes con lineas isometricas correctas

### Correccion: Elementos preservados al cambiar vistas
- setView() ya no llama setSport() (que borraba elementos)
- Usa renderFieldOnly() para 2D/2.5D sin limpiar estado
- Verificado: ciclo completo 2D->3D->2.5D->2D preserva todos los elementos

### Vista 3D Isometrica (Fork 9)
- 3 modos: 2D (plano), 2.5D (perspective rotateX), 3D (isometrica matematica)
- Transicion animada 400ms cubic-bezier entre modos
- Elementos 3D: sombras, pins, highlights, volumen en conos/balon
- Joystick para control de camara 3D
- Algoritmo de pintor (z-ordering) para profundidad correcta

### Formaciones Tacticas por Deporte (12 deportes)
- Futbol, Futbol de Salon, Baloncesto, Voleibol, Balonmano, Rugby, Hockey
- Futbol Americano, Beisbol, Tenis, Boxeo, Judo

### Tema Claro con Material FAB Sidebar
- Layout: Sidebar izquierda unificada
- 8 categorias + 20+ elementos de material

## Pendiente
- P1: Integrar thumbnail tactico en SessionEditor.js y verificar PDF
- P1: Fix hydration warning en DashboardPage.js (recurrente x3)
- P1: Refactorizar DashboardPage.js (4400+ lineas)
- P2: Exportar PDF/GIF de animacion desde tactical-board.html
- P2: Print, Share, Duplicate de planes de entrenamiento
- P3: Diseno responsivo del tablero tactico
- P3: Subida de fotos para avatares 3D

## Arquitectura
- Frontend: React + Tailwind + Shadcn
- Backend: FastAPI + MongoDB
- tactical-board.html: Vanilla JS/SVG standalone (NO React)
- Comunicacion: window.postMessage entre iframe y SessionEditor

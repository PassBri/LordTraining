# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Zustand + Recharts + Shadcn/UI
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB (11 colecciones V2)

## Implementado

### FASE 1 + 2 + 3 completas (Feb 2026)

**FASE 1 — Fixes + Categoria Precision + Drag/Zoom natural:**
- **Voleibol red FIVB 3D**: malla flotando entre 1.43m y 2.43m (no toca piso), postes, antenas rojas (80cm sobre red), bandas blancas, mesh detallado
- **Categoria Precision** nueva con 6 deportes reglamentarios: Tiro con Arco (FITA 70m diana 122cm), Bochas (27.5x3.7m CBI), Dardos (WDF/PDC 20 sectores), Curling (WCF 45.72x5m), Tiro Deportivo (ISSF 10m), Petanca (FIPJP 15x4m) — todos en 2D y 3D con iconos en sidebar
- **Zoom con pivote en cursor**: scroll mantiene el punto del mouse fijo (sensacion natural)
- **Drag del escenario**: middle-click o Ctrl+click + arrastrar para mover libremente

**FASE 2 — Deteccion automatica de puntos:**
- **Toggle "Marcador"** en barra CAMPO (icono scoreboard): off por defecto, persistido
- **Zonas de gol por deporte**: `getGoalZones()` para Futbol/Futsal/Balonmano/Hockey (porteria), Baloncesto (aro circular), Voleibol (mitades de cancha), Rugby/NFL (end zones), Beisbol (home plate)
- **Deteccion edge-crossing**: detecta cuando el balon CRUZA la linea/aro (antes estaba fuera, ahora dentro)
- **Cooldown de 1.5s** entre goles para evitar multi-triggers
- **Contador LOCAL/VISITANTE** con colores rojo/azul, reset button
- **Animacion "¡GOL!" / "¡CESTA!" / "¡PUNTO!"** flash 72px amarilla con glow y scale
- **Reposicionamiento**: scoreboard en esquina top-left (ya no flotando sobre el campo)

**FASE 3 — Variantes + Jugadores 3D especializados:**
- **Selector "VARIANTE"** dropdown en barra superior, aparece solo cuando el deporte tiene formatos
- **Futbol**: 11vs11 (FIFA) · 7vs7 (Juvenil 45-55x65-75m · porteria 5x2m) · 5vs5 (Futsal)
- **Golf**: Par 4 · Par 3 (180yd, 1 golpe al green) · Par 5 (540yd, dog-leg, 2 bunkers, agua)
- **Escalada**: Lead (15m) · Boulder (4.5m sin cuerda + colchoneta 4m) · Speed (muro 15m con 20 presas amarillas fijas cronometrado)
- **Skateboarding**: Park · Street (urbano: ledge + manual pad + stair + handrail + bank + mini bowl) · Bowl (12m diam cloverleaf) · Vert (half-pipe 4m con plataformas y coping)
- **Toggle Gear** (icono sun): activa equipamiento 3D por deporte:
  - Escalada: casco rojo + cuerda amarilla
  - Skateboarding: tabla con ruedas bajo pies + casco
  - Surf: tabla blanca azul
  - Tiro con Arco: arco + flecha + punta
  - Natacion: gorra azul + lentes
  - Golf: palo en diagonal + bola blanca
  - Curling: piedra + escoba amarilla
  - Dardos: dardo con punta roja
  - Hockey/Floorball: stick
  - Tenis/Padel/Badminton/Squash: raqueta con cuerdas

### Fix porterias, escalada y skateboarding 3D (Feb 2026)
- **Fix porterias futbol/futsal/balonmano/hockey 3D**: postes ahora en y=30/770 (futbol, futsal) o y=40/760 (balonmano, hockey) pegados a la linea de gol, red extiende hacia afuera (-gd hacia atras del top, +gd hacia adelante del bottom)
- **Escalada 3D rediseñada**: muro grande posicionado en Y=200 con altura 280, grid texturado de paneles verticales/horizontales, 14 presas coloreadas por dificultad con coordenadas X recalibradas al ancho del muro, ruta punteada amarilla conectando presas, colchoneta naranja grande de 360×55, texto INICIO
- **Skateboarding 3D con profundidad real**:
  - Helper `drawBox(x,y,w,h,z,topColor,sideColor,strokeColor)` que genera 3 caras (frontal, lateral, superior) para cajas solidas
  - Bowl: circulos concentricos con gradiente oscuro simulando profundidad
  - Funbox: caja 3D solida 220x140x28 + ledge naranja en top
  - Half-pipe: piso + 2 paredes verticales visibles + copings amarillas
  - Quarter-pipe: pared trasera vertical + rampa inclinada visible + coping
  - Kicker: cuna con frontal, top inclinado y cara lateral visibles
  - Stair: 3 escalones apilados usando `drawBox`, cada uno con volumen

### Bug fixes + rediseño profesional de 8 deportes individuales (Feb 2026)
- **Fix Baloncesto 3D**: arco de 3 puntos ahora con rx=185 (conecta perfectamente con los segmentos rectos de la baseline)
- **Fix Beisbol 3D**: ángulos de outfield arc (216.87°→323.13°) y grass arc (220.14°→319.86°) corregidos. Bases ahora son cuadrados blancos + home plate + monticulo con punto central
- **Fix Futsal 2D+3D**: área de portería ahora con geometría correcta FIFA (2 cuartos de círculo r=6m + línea recta 3.16m)
- **Natación 3D**: piscina con tinte de agua azul, 8 plataformas de salida 3D con bandas amarillas, marcas 15m
- **Remo 3D**: calles con agua, 6 pontones 3D de salida, 9 boyas naranjas por calle (cada 250m), líneas salida/llegada
- **Esquí 2D+3D**: pista de slalom con 14 puertas (alternadas rojo/azul), banderines 3D, salida verde, meta roja, relieve con 2 huellas de nieve
- **Golf 2D+3D**: hoyo Par 4 completo con fairway curvo (347m), tee box, 2 bunkers, hazard de agua, green con hoyo + bandera 3D, escala en metros. En 3D la bandera es vertical
- **Escalada 2D+3D**: muro 15×6m con 14 presas coloreadas por dificultad (verde→rojo), ruta marcada punteada, anclaje rojo TOP OUT, grips laterales, colchoneta. En 3D el muro aparece como plano vertical con presas
- **Surf 2D+3D**: océano con gradiente de olas senoidales, 3 surfistas, zonas Line-up/Take-off/Inside, playa con arena
- **Skateboarding 2D+3D**: skate park completo con Bowl circular, Half-pipe horizontal, Quarter-pipe trapezoidal, Funbox+Ledge, Kicker ramp, Stair set, Flat area
- **Orientación 2D+3D**: mapa topográfico IOF con curvas de nivel concéntricas (11 colinas), ríos azules, senderos dashed, árboles verdes, 6 puntos de control numerados + START/FIN, brújula con N, barra de escala 250m/500m

### Aro Baloncesto FIBA + Postes Futbol Americano Y-shape (Feb 2026)
- **Baloncesto 3D estilo coliseo FIBA**: poste vertical con base eliptica, brazo horizontal (cantilever), tablero blanco translucido con rectangulo pintado, soporte naranja entre tablero y aro, aro circular naranja como elipse isometrica, red con lineas colgantes y 2 anillos (medio + fondo). Helper `buildHoop(cx, poleY, rimY, dir)` reutilizable para ambos extremos.
- **Futbol Americano 3D con uprights Y-shape**: ya NO usa porteria rectangular de futbol. Ahora genera la estructura correcta de NFL: poste base (gooseneck) detras de la linea de gol, brazo horizontal al frente, travesano amarillo + 2 uprights verticales con bolitas en las puntas, base eliptica en el suelo. Color amarillo oficial.

### Renders 3D completos para 10+ deportes faltantes (Feb 2026)
- **Helpers nuevos**: `isoEllipse(cx,cy,rx,ry)`, `isoRoundedRect(cx,cy,w,h,r)` para construir pistas stadium y ovales
- **Atletismo/Maraton 3D**: pista estadio con 8 carriles concentricos (antes circulos pequeños)
- **Patinaje Velocidad 3D**: pista estadio 400m con 2 carriles
- **Patinaje Artistico 3D**: rounded rect 60x30m
- **Ciclismo 3D**: velodromo eliptico (antes era circular incorrectamente)
- **Beisbol 3D**: outfield arc (radio 300, centro 300,620), grass arc (175), diamante con 4 bases, home plate, monticulo
- **Skateboarding 3D**: ledge + funbox
- **Minitejo 3D**: cancha + caja 50x50 + bocin + 4 mechas + linea lanzamiento
- **Rana 3D**: mesa 80x80 + sapo central + 7 agujeros + linea
- **Bolo Criollo 3D**: cancha 26x4m + 9 bolos en rombo + linea tiro
- **Tejo 3D**: cancha + caja 1m + bocin + 4 mechas
- **Quemados 3D**: cancha + linea central + zonas salvacion
- **Ponchados 3D**: arena circular + ponchador central
- **Yermis 3D**: area + piramide de tapas + 2 lineas lanzamiento
- **Ultimate Frisbee 3D**: cancha + 2 end zones
- **Floorball 3D**: pista rounded corners (r=18) + circulo central + 2 areas porteria con porterias
- **Fix joystick**: label "CAMARA 3D" ocultado (los 4 presets con tooltip son autoexplicativos), ya no se superpone con el preset "front"

### Correcciones de renderizado 3D (Feb 2026)
- **Fix arcos penal Futbol 3D**: radio corregido de 55 a 100 (en 2D el `A55 55` se autoescala por la distancia de 200 entre puntos). Ángulos ajustados a 0-180 y 180-360 para sobresalir hacia el medio campo.
- **Fix arcos elipticos Balonmano 3D**: 6m ahora usa `isoEllipseArc(300,40,144,108,...)` y 9m `isoEllipseArc(300,40,216,162,...)` en lugar de circulos, coincidiendo con el SVG 2D.
- **Fix arcos elipticos Futsal 3D**: area de porteria ahora usa `isoEllipseArc(300,30,210,111,...)`.
- **Fix preservacion modo 3D**: `setSport` ahora respeta `ST.viewMode === '3d'` y llama `render3DField()` en vez de re-renderizar el SVG 2D.
- **Fix joystick tapando zoom**: `#joystick` movido de `right:18px` a `right:70px` para dejar espacio a los botones de zoom en la esquina derecha.

### Doble toggle Medidas + Zonas = 3 modos de visualizacion (Feb 2026)
- **Segundo boton toggle "Zonas"** al lado de "Medidas" en la barra CAMPO (icono de label/text)
- **Clase CSS `.fld-zone`** aplicada a 111 textos descriptivos via deteccion automatica (regex que distingue medidas puras como "68 m", "9.14 m (30 ft)" de zonas como "AREA 6m", "LINEA CENTRAL", "PONCHADOR", etc.)
- **67 medidas puras** permanecen independientes del toggle de zonas
- **3 modos combinables** persistidos en `localStorage` (`tb_hide_measures`, `tb_hide_zones`):
  - Todo visible (Medidas ON + Zonas ON): presentacion completa con contexto
  - Solo medidas (Medidas ON + Zonas OFF): analisis formal tipo blueprint
  - Cancha limpia (Medidas OFF): diagramas puros para presentaciones/exportacion
- Textos coloreados especiales (EQUIPO A/B, END ZONE) clasificados como zonas

### Tipografia premium de medidas (Feb 2026)
- **Fuente Oswald** (condensed, tecnica, ya cargada desde Google Fonts) para todos los labels `.fld-measure`
- **Weight 600 + letter-spacing 0.07em** para legibilidad maxima
- **Halo automatico** (`paint-order: stroke` con `stroke: var(--panel)`) que hace que el texto destaque sobre lineas de cancha en cualquier color/fondo
- **Numeros tabulares** (`font-feature-settings: "tnum"`) para alineacion perfecta
- **Inversion de color automatica en modo oscuro** via atributo `data-mono="1"`: en claro = rgba(40-90,...,0.85-1), en oscuro = rgba(235,235,235,0.95)
- Textos coloreados especiales (EQUIPO A azul, EQUIPO B rojo, END ZONE) mantienen su color ya que no tienen `data-mono`

### Toggle de medidas reglamentarias + Unificacion de canchas (Feb 2026)
- **Boton toggle "Medidas"** en la barra CAMPO (icono `#` con "m") que muestra/oculta todas las medidas y labels de las canchas. Estado persistido en `localStorage` (`tb_hide_measures`).
- **Clase CSS `.fld-measure`** aplicada a todos los textos informativos. CSS: `#canvas-inner.hide-measures .fld-measure { display:none }`.
- **Medidas reglamentarias oficiales** anadidas/verificadas en ~27 deportes:
  - CONJUNTO: Futbol 105x68m FIFA · Baloncesto 28x15m FIBA · Voleibol 18x9m FIVB · Balonmano 40x20m IHF · Rugby 100x70m World Rugby · Hockey 60x30m IIHF · Beisbol bases 27.43m + monticulo 18.44m MLB · Futbol Americano 109.73x48.76m NFL · Futsal 40x20m FIFA
  - RAQUETA: Tenis 23.77x10.97m ITF · Padel 20x10m FIP · Badminton 13.4x6.1m BWF · Squash 9.75x6.4m WSF · Tenis de Mesa 2.74x1.525m ITTF · Fronton 30x10m
  - CONTACTO: Boxeo ring 6.1x6.1m · MMA octagono 9.14m UFC · Judo tatami 10x10m IJF · Taekwondo octogono 8m WT · Karate 10x10m WKF · Lucha diam. 9m UWW · Kickboxing 6.1x6.1m WAKO
  - TIEMPO/MARCA: Atletismo pista 400m IAAF · Natacion 50x25m FINA (8 calles 2.5m) · Ciclismo velodromo 250m UCI · Remo 2000m 6 calles WR · Patinaje Velocidad 400m ISU · Patinaje Artistico 60x30m ISU
  - INDIVIDUALES: Gimnasia suelo 12x12m FIG
  - 9 deportes tradicionales y alternativos ya agregados en iteracion anterior
- Labels en estilo limpio y lineal: fuente `system-ui`, color `rgba(128,128,128,x)` (funciona en modo claro/oscuro), medidas principales arriba y rotadas en la lateral, nombre del deporte + federacion al pie.

### Deportes tradicionales y alternativos con medidas reglamentarias (Feb 2026)
- **Juegos tradicionales de precision**: Minitejo (3m x 1.5m · caja 50cm · bocin 10cm · 4 mechas),
  Rana (mesa 80x80cm · linea lanzamiento 3m), Bolo Criollo (26m x 4m · 9 bolos en rombo),
  Tejo (19.5m x 2.5m · caja 1m · bocin 17cm · 4 mechas)
- **Juegos tradicionales con pelota**: Quemados (12m x 6m · linea central · zonas salvacion),
  Ponchados (diam. 14m · ponchador central), Yermis (10m x 10m · piramide de tapas)
- **Deportes alternativos**: Ultimate Frisbee (100m x 37m · end zones 18m · WFDF),
  Floorball (40m x 20m · porteria 160x115cm · areas defensa 4x5m y porteria 1x2.5m · IFF)
- Labels con medidas en metros/cm usando `rgba(128,128,128,x)` para legibilidad en modo claro/oscuro
- 9 iconos SVG distintivos anadidos al sidebar por deporte
- Canchas con escala proporcional al viewBox 600x800 del canvas tactico

### Material Design Sidebar Completo + Persistencia localStorage (Feb 2026)
- **Seccion DEPORTE como acordeon**: header con chevron + pill mostrando "Categoria / Deporte" actual
- **Colapsado por defecto en primera visita**, estado persistido en localStorage (tb_deporte_collapsed)
- **Todos los grupos de tools colapsados excepto DIBUJO** al entrar por primera vez
- **Persistencia de estado de acordeones** (ST.collapsedGroups) en localStorage (tb_collapsed_groups)
- **Persistencia de ultimo estilo de texto** (ST.textStyle) en localStorage (tb_text_style) - se
  aplica automaticamente la proxima vez que el usuario usa la herramienta Texto
- **Iconos mas compactos**: tool-circle 46px -> 40px, svg 21px -> 18px, tool width 68px -> 58px
- Labels mas pequenos y espaciado reducido
- setSport actualiza automaticamente el label del pill con "Cat / Sport" tipo breadcrumb


- Picker del texto convertido a modal centrado (overlay + modal-card) con scroll interno
- Preview en vivo arriba con todos los efectos aplicados (fuente, color, gradient, sombra, stroke, italic)
- 8 degradados LED preset: Neon LED (lima->azul), Fuego (amarillo->rojo), Oceano (cyan->purpura),
  Atardecer (naranja->rosa), Toxico (lima->verde), Real (indigo->rosa), Hielo (blanco->cyan),
  Campeon (oro->naranja)
- Render SVG usa linearGradient con id unico por elemento + fill="url(#grad-id)"
- Color plano y gradient son mutuamente excluyentes (seleccionar uno deselecciona el otro)
- Guardar hace setTool('text') para activar input inline con los estilos seleccionados


- **10 fuentes deportivas premium** cargadas desde Google Fonts:
  * Bebas Neue (ESTADIO), Oswald (Impacto), Anton (Bold), Teko (Futuro)
  * Russo One (Cancha), Staatliches (Arena), Black Ops One (Military)
  * Bungee (Urbano), Rubik Mono One (Block), Bowlby One (Graffiti)
- **Text Style Picker** al seleccionar herramienta "Texto":
  * Grid 2col de fuentes con preview en vivo
  * Paleta de 11 colores deportivos (brand, rojo, azul, verde, amarillo, naranja, etc.)
  * 4 tamaños (S/M/L/XL)
  * 3 efectos: Sombra, Contorno, Italic
  * Preview grande antes de aplicar
- **Input inline usa estilo seleccionado** (font + color + size antes de tipear)
- **Render de text** usa fontFamily + color + textStroke + textShadow (filter SVG)
- **Grupos 4+ flat**: sin borde, sin gradient overlay, sin shadow — solo fondo hover sutil
- **Implementos en canvas sin sombra**: eliminado filter:url(#shadow3d), stroke-width reducido,
  solo fondo coloreado opacity 18% con border-radius 9px — aspecto plano moderno


- **Trayectorias permanentes del balon** tras cada playback:
  * Al detener playback, se guardan los puntos del trail del balon en ST.trajectories
  * renderElements dibuja las trayectorias en capa de fondo (3 capas de glow + scanline dashed)
  * Puntos de origen y destino marcados con circulos cyan
  * Boton "Borrar trayectorias" en sb-actions (icono trending-up con dashed)
  * Metodo S.clearTrajectories() disponible
- **Implementos gimnasio sin borde dashed**: eliminado stroke-dasharray 3 2, reemplazado con borde solido 1.4px, caja redondeada 7px, label en pill con fondo solido, icono 22x22px (mismo estilo que gm_/sp_)
- **Sidebar acordeón**: cada grupo (Dibujo, Personas, Formaciones, Campo, Implementos, Gimnasio) es un colapsable con:
  * Header con chevron rotacional, label uppercase, counter badge del numero de tools
  * Animacion smooth de max-height + opacity
  * Estado persistente en ST.collapsedGroups (Set)
  * Click en header expande/colapsa


- Flecha "Pase" rediseñada con gradient cyan->azul->indigo, animated stroke-dashoffset
- Mini balón de futbol al origen (circulo blanco con detalles negros + punto central)
- Marker "pass-tip" tipo shuriken azul con stroke blanco y glow SVG filter
- Trail gradient suave en la punta para efecto de trazo premium
- Estela fantasma tipo FIFA/PES durante el playback:
  * Acumula hasta 18 posiciones historicas del balon/objeto
  * 3 capas de glow (14px opacity 0.14 / 7px 0.25 / 3px 0.45)
  * Ghost spheres con fade progresivo: pequeños transparentes (viejos) a grandes opacos (recientes)
  * Color cyan #06b6d4 para balones, color del objeto para otros implementos
  * Solo para GHOST_TYPES: ball, cone, disc, flag, kettlebell, medball, pilatesball
  * Trail se limpia al detener playback


- Nueva herramienta Pase en sidebar DIBUJO: icono línea punteada con bullet
- Al dibujar: crea flecha con isBallArrow=true, estilo visual distintivo
  (stroke-dasharray 6 4, bullet relleno 5px con stroke blanco en origen, azul por defecto)
- En playback: flechas isBallArrow se asocian SIEMPRE al balón más cercano sin umbral de distancia
  (a diferencia de flechas normales que tienen prioridad jugador)
- Permite tácticas intencionales: pases largos, tiros al arco, lanzamientos
  sin depender de proximidad entre balón y flecha
- Compatible con cadenas: varios "Pase" consecutivos del mismo balón se encadenan


- El motor de playback ahora anima no solo jugadores, sino también balón, conos, discos, banderas,
  kettlebells, balones medicinales y pilates
- Asignacion inteligente de flechas a actores: compara distancia real del inicio de la flecha al
  jugador mas cercano vs objeto mas cercano, elige el mas proximo
- Si el balon esta <40px del inicio de una flecha y el jugador mas lejos, se anima el balon
- Preservacion de prioridad tactica: jugador gana si esta razonablemente cerca (<200px)
- Cadenas solo se forman entre flechas del MISMO actor (evita robos de flechas)
- Ejemplo tactico: jugador hace dribble corto + pasa el balon al arco = 2 flechas independientes
  animan jugador y balon simultaneamente


- CSS completamente renovado en tactical-board.html (solo bloque <style>, sin tocar JS)
- Sidebar ampliado (220px -> 380px) con brand iTRAIN visible (logo lime + texto)
- Ambient radial gradient de fondo con acentos brand y blue (premium depth)
- Paleta cohesiva con landing page: brand #CCFF00 en dark mode, slate-950/900 backgrounds
- Tipografia Inter (300-900) via Google Fonts, antialiasing activado
- Categorias y deportes en grid 3xN para aprovechar espacio horizontal
- Wrap natural en 2 lineas + title tooltips para nombres largos
- Tool circles 46x46px, border-radius 14px, sombras multicapa, gradient overlay, active ring brand
- View bar 56px con pills redondeados 999px, iconos circulares 38px
- Theme toggle 44px sticky right siempre visible con brand glow
- 14 estilos de avatar convertidos a ICONOS SVG compactos (28px circulares) con tooltips
- Genero Masculino/Femenino tambien convertidos a iconos simbolo (♂ Mars / ♀ Venus)
- Botones Guardar/PNG/IA con gradientes verticales y shine interna
- Modales con backdrop-blur 10px + animaciones slide-in
- Equipamiento gimnasio (gm_/sp_) rediseñado: borde solido, fondo 14% opacity,
  icono 22x22, label en pill con fondo oscuro, sombra para profundidad
- Cambios 100% CSS + render SVG: todas las clases y JS intactos

### Restauracion cuadros Eventos/Monitoreo en GraphicPlan (Abr 2026)
- Restaurados sub-rows con cuadros de colores clickeables para Eventos/Competencias (5 tipos: Entrenamiento, Control dopaje, Competencia principal/secundaria, Recuperacion)
- Restaurados sub-rows con cuadros de colores clickeables para Monitoreo/Evaluaciones (6 tipos: medico, fisico, tecnico, tactico, psicologico, teorico)
- Cada celda es interactiva (toggle on/off) usando renderBooleanCell

### Interactividad graficas inline (Abr 2026)
- TODAS las filas de graficas inline son clickeables (ciclan 0-10, display 0-100%)
- Carga/Recuperacion, Volumen/Intensidad, Duracion/Actividad ahora editables por click
- Preparacion por Componentes y Capacidades Fisicas clickeables
- Valores manuales tienen prioridad sobre datos calculados V2
- Celdas vacias muestran "+" para indicar interactividad

### Estilos de Avatar en Pizarra Tactica (Abr 2026)
- 4 estilos seleccionables: Moderno, Chibi, Pixel Art, Minimal
- Selector aparece solo cuando Avatar esta activo
- Moderno: camiseta detallada, pantalones, zapatos, cara con rasgos
- Chibi: cabeza gigante anime, ojos grandes, mejillas rosadas
- Pixel: 8-bit retro, formas cuadradas, fuente monospace
- Minimal: capsula limpia con cabeza circular semi-transparente
- Todos soportan fotos, nombres arriba, posicion abajo
- Funciona en 2D y 3D

### Plantilla y Fotos en Pizarra Tactica (Abr 2026)
- Nueva pestaña "Plantilla" en panel derecho con lista de jugadores por equipo
- Campos de Nombre y Posicion en propiedades del jugador
- Upload de foto de jugador (se muestra como circulo en el campo en modo tactico 2D)
- Fotos se redimensionan a 80x80 y se almacenan como base64
- Seccion de Cambios/Sustituciones con jugador sale, jugador entra y minuto
- Boton "+ Jugador" rapido desde plantilla (agrega al campo automaticamente)
- Modo jersey 2D muestra foto como cabeza del jugador

### Selector de Iconos y Colores para Categorias (Abr 2026)
- 50+ iconos de deporte, fitness y recreacion (lucide-react): Pesas, Ciclismo, Natacion, Montaña, Trofeo, etc.
- 16 colores seleccionables para cada categoria (rose a slate)
- Boton "Estilo" en cada categoria para cambiar icono/color en tiempo real
- Formulario de nueva categoria con selector visual de icono + color + vista previa
- Iconos y colores predeterminados para categorias existentes

### UI Catalogo Ejercicios Mejorado (Abr 2026)
- Header con stats en tiempo real (categorias, subcategorias, ejercicios, favoritos)
- Iconos unicos por categoria (Dumbbell, Zap, Heart, Wind, Shield, Activity)
- Colores de acento por categoria (rose, blue, emerald, amber, violet, cyan)
- Toggle vista Lista/Grid para ejercicios
- Sistema de favoritos con persistencia localStorage
- Filtros avanzados: por equipo, solo favoritos, busqueda por nombre/musculo
- Exportar CSV de toda la biblioteca
- Badges de dificultad (Principiante/Intermedio/Avanzado/Elite)
- CRUD completo preservado: agregar/editar/eliminar categorias, subcategorias, ejercicios

### P1 Refactorizacion DashboardPage (Abr 2026)
- Hydration warning corregido (div dentro de span en calendario)
- TacticalBoardSection extraida a /components/TacticalBoardSection.js (-209 lineas)
- DashboardPage reducido de 4651 a 4442 lineas

### P2 Print/Share/Duplicate Planes (Abr 2026)
- Duplicate: Ahora copia estructura V2 completa (macrociclos, mesociclos, microciclos, sesiones, ejercicios) con IDs remapeados
- Share: Genera token publico, endpoint enriquecido con datos V2 y atleta
- SharedPlanPage: Nueva pagina publica (/plan/shared/:token) con header, stats, estructura de macrociclos y sesiones
- Export PDF: Endpoint funcionando, genera PDF con ReportLab

### Reestructuracion tabla GraphicPlan (Abr 2026)
- Agregadas filas "Etapa" y "Tipo de etapa" al inicio de la tabla (clickeables para editar periodo/fase)
- Agregada fila "Tipo de macrociclo" con etiquetas de texto del tipo
- Barra de desplazamiento de semanas movida al fondo con sticky bottom-0 (siempre visible)
- Eliminado espacio desperdiciado: columna etiquetas fija 160px, tabla table-layout fixed w-full
- Reemplazados los 5 InteractiveCharts externos (desalineados) por filas inline dentro de la tabla
- Cada metrica es una fila de tabla con barras proporcionales perfectamente alineadas con las columnas de semanas
- 5 secciones de graficas: Carga/Recuperacion, Volumen/Intensidad, Preparacion por Componentes, Capacidades Fisicas, Duracion/Actividad
- Boton de expansion en cada seccion abre Dialog con InteractiveChart completo (zoom, brush, tipos de grafica)
- Table-layout fixed con columna etiquetas 160px, columnas de datos distribuyen espacio restante
- Todo scrollea como una unidad cohesiva, sin espacio desperdiciado

### Plan Grafico Corregido - Grilla Completa + 5 Graficas (Feb 2026)
- Sincronizacion V2 mejorada: llena TODAS las filas de la grilla
  - Magnitud de Carga: 5 niveles por semana basados en RPE
  - Preparacion: 6 tipos (Fisica Gen/Esp, Tecnica, Tactica, Psicologica, Teorica)
  - Prep Fisica: 5 capacidades (Resistencia, Fuerza, Velocidad, Coordinacion, Flexibilidad)
  - Actividad: Entrenamiento, Competencia, Recuperacion
  - Monitoreo: 6 tipos en fronteras de mesociclo
- Backend: RPE derivado de fase cuando no hay datos directos
- Backend: cascada usa RPE*10 como fallback de int_calculado
- 5 graficas no redundantes con InteractiveChart
- Testing: Celdas coloreadas: 170+ de intensidad/preparacion/fisica/monitoreo

### Motor de Cascada V2 + Dashboard + Graficas
- 11 colecciones, propagacion 6 niveles, 7 reglas integridad
- 6 graficas DashboardGeneral + 8 hooks reactivos
- Sync V1->V2 completa

### Motor de Animacion de Jugadas con Cadenas (Feb 2026)
- Motor de playback reescrito con sistema de CADENAS: flechas conectadas (fin ≈ inicio, CHAIN_DIST=80px) forman una cadena
- Un jugador por cadena: sigue TODAS las flechas encadenadas en secuencia (A→B→C→D)
- Movimiento simultaneo: todas las cadenas se animan al mismo tiempo
- Jugador termina en la PUNTA de la ultima flecha de su cadena
- Cadenas cortas terminan antes: si cadena tiene 1 segmento y maxSegs=3, jugador llega en paso 1
- Soporte completo 2D y 3D isometrico
- Barra de reproduccion: Play, Pausa, Stop, indicador de paso (maxSegs), barra de progreso
- 3 velocidades: 0.5x, 1x, 2x
- Stop muestra confirm para mantener (en punta) o restaurar posiciones originales
- Radio de deteccion de jugador: 200px

### Tema Claro/Oscuro en Pizarra Tactica (Feb 2026)
- Toggle de tema en barra de vista con iconos sol/luna
- Tema Oscuro: fondo #0d1117, paneles #161b22, campo #111827, lineas blancas rgba(255,255,255,0.45)
- Tema Claro: fondo blanco, paneles blancos, lineas oscuras (comportamiento original)
- Persistencia via localStorage (clave 'tb_theme')
- 15+ variables CSS actualizadas: --bg, --panel, --surface, --border, --text, etc.
- Campo 3D adapta superficies: surface3d, front3d, right3d
- Lineas 3D (render3DFieldLines) adaptan colores automaticamente
- Flechas y texto usan color por defecto segun tema (#94a3b8 oscuro, #1e293b claro)
- Arrow markers adaptan stroke segun tema
- Todos los componentes (sidebar, modal, color picker, playback bar, joystick) tematizados
- Cambio de deporte mantiene el tema activo

### Personalizacion Equipamiento Tactico (Feb 2026)
- Color + Tamaño (escala 50%-250%) para TODOS los elementos de equipamiento
- Rotacion (0-360°, paso 15°) para Valla, Escalera y Mini Arco
- 22 tipos de equipamiento actualizados con propiedades editables:
  - Personas: Cono, Bandera, Valla (+ color + rotacion)
  - Campo: Platillo, Mini Arco (+ color + rotacion), Barrera (+ color), Peto
  - Agilidad: Aro, Escalera (+ color + rotacion), Pica
  - Fuerza: Cajon, Kettlebell, Balon Med., TRX, Trineo, Paracaidas, Cuerda, Battle Rope, Roller, Banda, Bosu, Colchoneta
- Panel de propiedades diferencia jugadores (radio 8-40) de equipamiento (escala 0.5-2.5)
- Sliders muestran porcentaje (Tam. 100%) y grados (Rot. 45°)
- SVG renderers usan el.color para stroke/fill y scale(el.size) para tamaño

### Reorganizacion Herramientas y Gimnasio (Feb 2026)
- Movidos Cono, Balon, Bandera, Valla de PERSONAS a CAMPO (donde corresponden)
- PERSONAS ahora solo tiene: Jugador A, Jugador B, Portero
- CAMPO tiene 8 elementos: Balon, Cono, Bandera, Valla, Platillo, Mini Arco, Maniqui, Peto
- Nueva categoria GIMNASIO (grupo 9) con 10 elementos:
  Mancuerna, Barra, Banco, Rack, Caminadora, Bicicleta, Remo, Barra Dominadas, Fitball, Step
- Todos los elementos de gimnasio tienen color + tamaño personalizables
- Barra, Banco, Caminadora, Remo tienen rotacion
- Botones rediseñados: border-radius 10px, hover con elevacion, active con scale, headers de categoria en color primario

### Catalogo Completo Maquinas Gimnasio (Feb 2026)
- 9 subcategorias de gimnasio con ~78 maquinas totales:
  - Tren Inferior (11): Prensa, Hack Squat, Ext. Cuad., Curl Fem., Gluteo, Abductores, Aductores, Pantorrilla, Smith, Hip Thrust, Desplante
  - Tren Superior (10): Press Pecho/Incl., Peck Deck, Jalon, Remo, Dom. Asis., Press Homb., Elev. Lat., Pullover, Fondos
  - Espalda (5): Jalon Front., Remo Iso, Remo T, Hiperext., Lumbar
  - Pecho/Hombro (5): Press Horiz./Decl., Contractor, Press Milit., Rev. Peck Deck
  - Brazos (4): Curl Predic., Curl Biceps, Tri. Pushdown, Ext. Triceps
  - Abdomen/Core (6): Crunch, Elev. Piernas, Rot. Torso, Banco Abd., Banco Rom., Oblicuos
  - Cardio Gym (8): Caminadora, Bici Estat., Spinning, Eliptica, Escaladora, Remo Erg., Ski Erg, Air Bike
  - Poleas/Estaciones (6): Polea Alta/Baja/Cruzada, Multifunc., Jaula Func., Cable Dual
  - Bancos/Estructuras (8): Banco Plano/Incl./Decl./Ajust., Rack Sentad., Jaula Potencia, Sop. Barras, Sop. Mancuernas
- Todos con color + tamano + rotacion personalizables
- Renderer generico usa icono SVG del tool + label de texto en canvas
- Cono, Balon, Bandera, Valla movidos a CAMPO; PERSONAS solo jugadores

### Implementos Deportivos y Balones Mejorados (Feb 2026)
- 17 implementos deportivos nuevos (grupo 18):
  Jabalina, Martillo, Disco Atletismo, Bala, Bate Baseball, Raqueta Tenis, Raqueta Mesa, Bate Cricket, Raqueta Badminton, Arco, Flecha, Palo Hockey, Palo Golf, Arco/Porteria, Red/Malla, Silbato, Cronometro
- 21 balones con diseños mejorados: gradientes radiales, brillos, patrones realistas
- 6 nuevos balones: Voleibol Playa, Futbol Salon, Tejo, Minitejo, Bolo Criollo, Badminton (volante)
- Botones Material Design coloridos por categoria (18 grupos con colores unicos)

### Uniformes por Deporte en Avatares (Feb 2026)
- Sistema _sportUniform() lee ST.sport del catalogo de deportes y genera SVG de indumentaria
- 12 categorias de uniforme implementadas:
  - Futbol/Balonmano: jersey + shorts + medias blancas + guayos negros
  - Baloncesto: tank top sin mangas + shorts largos + zapatillas altas
  - Voleibol: jersey ajustado + shorts cortos(F:bikini) + tenis blancos
  - Rugby/Americano: jersey reforzado hombros + casco(americano)
  - Tenis/Padel/Badminton: polo blanco con cuello V + falda(F)/shorts(M) + tenis blancos
  - Boxeo/MMA/Kickboxing: torso desnudo + guantes de color del equipo + shorts
  - Judo/Karate/Taekwondo: gi/dobok blanco con cinturon + descalzos
  - Atletismo/Maraton: singlet ligero + shorts ultra cortos + spikes naranjas
  - Ciclismo: maillot completo + casco aerodinamico
  - Natacion: traje de bano + gorra + gafas
  - Esports: hoodie gaming + headset
  - Gimnasio: tank top/sports bra + joggers + tenis blancos
- Estilo MODERN ahora usa uniformes deportivos automaticamente

### Fixes Variantes de Cancha (Feb 2026)
- Cancha Futsal: corregidos sweep flags de los arcos del area (6m) -> ahora
  son cuartos de circulo conccavos centrados en el poste, conforme al
  reglamento FIFA. Antes los arcos eran convexos hacia la esquina
  (centro incorrecto en el borde).
- Nueva cancha dedicada 'Futbol 5v5 Infantil' (30x40m, porteria 6x2m,
  areas 13x8.25m). La variante 5v5 ya NO reutiliza Futsal.
- VARIANT_TO_BASE actualizado: 'Futbol 5v5' normaliza a 'Futbol' para
  render 3D isometrico.
- Futbol de Salon accedido directamente desde sidebar ya no muestra
  selector de variante (solo Futbol lo expone).
- Selector de VARIANTE compactado (padding 3x6, font 10px, max-w 110px)
  para no empujar los botones JUGADORES/Tactico/Camiseta/Avatar.
- Labels mas cortos: '11 vs 11 · FIFA', '7 vs 7 · Juvenil', '5 vs 5 · Infantil'.

### Pizarra Dark Mode + UI polish (Feb 2026)
- Dark mode ahora usa verde pizarron tradicional (#1f4a34) como fondo de
  cancha, con lineas blanco-tiza (rgba(245,240,225,0.88)). Evoca el
  tablero verde escolar clasico que usaban los entrenadores.
- Barra #view-bar: overflow-x:auto con scrollbar fino, padding reducido.
  Variante y JUGADORES ya no empujan/cortan los botones Tactico/Camiseta/
  Avatar. Label "VARIANTE" se muestra completo.
- Scoreboard: reubicado bajo la toolbar (top:72px). Ahora es DRAGGABLE
  (mousedown/touchstart + move + clamp al canvas wrap). Posicion
  persistida en localStorage 'tb_score_pos'. Handle visual "⋮⋮" a la
  izquierda.
- Botones Guardar/PNG/IA rediseñados: background neutro + borde/texto
  coloreado por acción (verde/azul/morado), iconos SVG, armonizados con
  el pizarron dark sin romper en light.
- Nuevo boton "Enlace" (sb-save-btn.amber) -> S.shareBoard() genera URL
  con payload base64 de {sport, variant, avatar*, viewMode, teamColors,
  elements}. Copia al portapapeles + toast confirmacion.
- Al cargar, S.loadSharedBoard() detecta hash #b=... y restaura estado
  (preview readonly si query ?readonly=1).
- Badminton 3D: red con altura correcta (netH 85 units ≈ 1.55m FIVB/BWF),
  postes extendidos 5 units sobre la red, malla horizontal + 12 cordajes
  verticales. Tenis/Padel 40 units, Tenis de Mesa 10 units.

## Pendiente
### P1 - Refactorizar tactical-board.html (+5300 lineas) -> separar CSS/JS/SVG constantes
### P1 - Continuar refactorizacion: extraer secciones Athletes, Sports, Events de DashboardPage
### P3 - Diseno responsivo tablero tactico (Mobile/Tablet)

# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Zustand + Recharts + Shadcn/UI
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB (11 colecciones V2)

## Implementado

### Trayectorias del Balón y Objetos Animables (Feb 2026)
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

## Pendiente
### P1 - Continuar refactorizacion: extraer secciones Athletes, Sports, Events de DashboardPage
### P3 - Diseno responsivo tablero tactico (Mobile/Tablet)

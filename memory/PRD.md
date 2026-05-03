# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Zustand + Recharts + Shadcn/UI
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB (11 colecciones V2)


### Wizard "Crear Plan" autocompletado desde Plan Anterior (Feb 2026)

**Cierre del ciclo Plan Anterior → Nuevo Plan (1 clic):**
- Cuando el coach hace clic en "Generar próximo plan" desde la sección Plan Anterior, se persiste un seed en `localStorage.itrain_next_plan_seed` con `source_model`, `source_model_name`, `focus_area`, `gap_analysis[]`, `recomendaciones`, `conclusiones`. Ahora la navegación va directo a `setActiveDataSection('create-plan')` (antes iba a `training-system` con un evento `itrain:open-create-plan-wizard` que nadie escuchaba — eliminado).
- **`PeriodizationComplete.js`** ahora detecta el seed al montar:
  - Estado: `nextPlanSeed`, `seedDismissed`, `seedApplied`. `useEffect` lee localStorage en el mount.
  - Cuando `apiModels` está disponible, un segundo `useEffect` aplica el seed a `planConfig`: pre-llena `model` (validando que exista en `effectiveModels`) y `mainObjective` (texto compuesto por área de foco + recomendaciones + conclusiones).
  - Mapa `PREV_AREA_LABELS` traduce `focus_area` (clave) a etiqueta humana (ej: `tactica` → "Preparación Táctica").
- **Banner visual** (testid `next-plan-seed-banner`) renderizado al tope del wizard, antes del stepper:
  - Card oscura con borde lima 2px, ícono `Sparkles` lima, badge "CIERRA EL CICLO".
  - Heading: "Detectamos que vienes del análisis del Plan Anterior".
  - Body: muestra el modelo pre-seleccionado y la fase de mayor brecha en lima.
  - Chips (testid `seed-gap-chips`) con las 4 mayores brechas negativas (ej: "Preparación Táctica −35%").
  - Botón X (testid `seed-dismiss-btn`) que descarta la pre-selección y limpia localStorage.
- **Limpieza automática del seed**: tras `handleCreatePlan` o `handleCreateFromGenerated` exitoso, `clearNextPlanSeed()` elimina la clave de localStorage para evitar re-aplicación.
- **Sidebar refresca el plan automáticamente**: `onPlanCreated` callback en DashboardPage.js (líneas 3636-3651) ya invocaba `fetchTrainingPlans()` + `handleSetActivePlan()`, por lo que el nuevo plan aparece en la barra lateral sin código adicional.
- **Validación (testing_agent_v3_fork iter_48)**: 100% PASS en heading, model name, focus area label, gap chips, dismiss button, localStorage cleanup. Code review confirma lógica de pre-selección de modelo y prefill de objetivo.


### Plan Anterior — Benchmark vs Modelo en radar + fix layout definitivo (Feb 2026)

**Fix del espacio vacío (definitivo):**
- El problema real: en CSS Grid con `items-start`, Cumplimiento (row-span-5) NO se estiraba dentro de su celda, dejando ~215px vacíos debajo.
- Fix: agregado `lg:self-stretch` a Cumplimiento. Ahora se estira para ocupar toda la altura de su celda = altura de col 1 (1482px). Columnas IZQ y DER terminan exactamente en el mismo punto (bottom=1710).
- Revertido el fallido intento de `row-end-[99]` + `h-full` que causaba que Cumpl creciera a 2970px por rows virtuales implícitas.

**Benchmark vs Modelo (nuevo feature):**
- Definidos perfiles ideales heurísticos para 9 modelos de periodización (ATR, Issurin, PDI, iTrain PDI, Lineal/Tradicional, Ondulante, Bloques, Polarizado) en las 7 áreas.
- **Frontend (`DashboardPage.js`)**: Radar interactivo ahora muestra DOS polígonos — el real (lima `#CCFF00` relleno) encima del ideal (blanco punteado). Leyenda en el tope con cuadritos indicadores. Detecta automáticamente el modelo del `activePlan.model`. Altura del ResponsiveContainer aumentada a 250px para dar más espacio.
- **Backend (`previous_analysis_export.py`)**: Nuevo parámetro `benchmark` en `_radar_svg()` que dibuja el polígono ideal con dash-array 4-4, stroke `rgba(255,255,255,0.65)`, fill `rgba(255,255,255,0.08)` detrás del polígono real. Leyenda en el PDF junto al título "PERFIL DE CUMPLIMIENTO".
- `_build_html` ahora acepta `model_key` y `model_name` y los pasa a `_radar_svg`.
- Nuevo `_get_plan_info()` que devuelve `{name, model_key, model_name}` del plan para pasarlos al template.
- Share endpoint también persiste `model_key` y `model_name` en `plan_previous_analysis_shares` para que el PDF/HTML compartido sin auth siga mostrando el benchmark.

**Validado con `analyze_file_tool`**: PDF 180KB, doble polígono correctamente renderizado, leyenda "Ideal · ATR (Issurin)", las 7 etiquetas completas. 10/10 backend tests pasan.


### Plan Anterior — Layout definitivo sin huecos + % Global auto-calculado (Feb 2026)

**Problema**: `row-span-3` con `auto-rows-min` aún generaba espacios grandes entre cards en la columna izquierda, porque CSS Grid distribuye la altura de Cumplimiento en las 3 rows spanneadas.

**Solución definitiva:**
- Cambiado `lg:row-span-3` → `lg:row-end-[99]` en la card Cumplimiento. Al no tener límite de rows, CSS Grid deja que Cumplimiento ocupe **todas las rows necesarias** sin forzar que las rows de col 1 se estiren. Las cards de col 1 (Información, Fortalezas, Debilidades, Indicadores, Lesiones) ahora se apilan con gap real de 16px (el gap-4 de Tailwind), sin huecos.
- Quitado `auto-rows-min` (el default `auto` funciona mejor con `row-end-[99]`).
- **Métricas verificadas**: Info (316px) → Fort (288px) → Debi (288px) → Indi (282px) → Lesi (244px), cada una con gap=16px. Cumplimiento abarca altura completa (1267px).

**% Global auto-calculado:**
- Eliminado el slider manual del `porcentajeCumplimiento`.
- Ahora se calcula automáticamente como `round(average(values of 7 áreas))` y se sincroniza al state en el render.
- Badge "AUTO" añadido al card lima para indicar que es computado.
- Subtítulo: "Promedio automático de las 7 áreas de cumplimiento".


### Plan Anterior — Layout Grid row-span + 7 áreas + radar interactivo (Feb 2026)

**Problema**: Con CSS `columns-1 lg:columns-2` el espacio en la columna izquierda quedaba vacío después de "Información del Plan Anterior" mientras la derecha (Cumplimiento) era muy alta. El balance automático de multi-column layout no llenaba el hueco.

**Solución definitiva:**
- Cambiado a CSS Grid `grid-cols-2 grid-flow-row-dense items-start`.
- Cumplimiento de Objetivos (la card más alta, con radar + 7 áreas + global) forzada a `lg:col-start-2 lg:row-span-3` — ocupa las 3 primeras filas de la columna 2.
- Las 4 cards restantes (Información, Fortalezas, Debilidades, Indicadores, Lesiones) forzadas a `lg:col-start-1` — se apilan densamente en la columna 1, llenando el espacio debajo de Información.
- Como resultado: el espacio vacío de la izquierda desaparece; la columna 1 fluye verticalmente con 5 cards pequeñas-medianas, mientras la columna 2 tiene la Cumplimiento gigante con radar en vivo.

**Validado**: lint JS limpio, elementos del DOM confirmados (info, radar Recharts, sliders teorica/reglamento). data-testid: `prev-cumpl-slider-teorica`, `prev-cumpl-slider-reglamento`.


### Plan Anterior — Heptágono (7 áreas) + Radar interactivo en UI + fix recorte PDF (Feb 2026)

**Cambios sobre iteración previa:**
- **+2 áreas nuevas**: "Preparación Teórica" (`teorica`) y "Reglamento del Deporte" (`reglamento`) añadidas a `OBJ_LABELS` (backend) y a `cumplKeys`/`cumplLabels` (frontend). El radar pasa de pentágono (5) a **heptágono (7 ejes)**.
- **Fix recorte del radar en PDF**: viewBox ampliado a ratio 1.15:1 (antes cuadrado), radio reducido a 0.32 para dejar margen a las etiquetas, font-size del label a 8pt. Map de `short_map` para acortar nombres largos ("Reglamento del Deporte" → "Reglamento"). Resultado validado: todas las 7 etiquetas completas, sin recortes.
- **Radar interactivo en UI (feedback en tiempo real)**: integrado `<RadarChart>` de Recharts (ya instalado) dentro de la card Cumplimiento, en la parte superior. Se actualiza en vivo al mover los sliders. Estilo: fondo oscuro (`linear-gradient #0f172a→#1e293b`), relleno lima con opacidad 0.35, stroke `#CCFF00`, tooltip con borde lima. Badge "PERFIL DE CUMPLIMIENTO" en la parte superior. Height 230px, responsivo.
- **Tests**: 10/10 backend tests siguen pasando. Lint JS/Python limpio.


### Plan Anterior — Radar chart en PDF + layout masonry en UI (Feb 2026)

**Cambios:**
- **Layout masonry (frontend)**: la sección `prev-plan` pasó de `grid grid-cols-1 lg:grid-cols-2` a `columns-1 lg:columns-2` con `[&>*]:break-inside-avoid`. Las 6 cards ahora fluyen tipo masonry/Pinterest, eliminando el espacio en blanco que se generaba cuando "Información del Plan Anterior" (corta) quedaba a la izquierda y "Cumplimiento de Objetivos" (alta) a la derecha. Ahora las tarjetas se acomodan automáticamente para llenar el espacio disponible.
- **Radar chart en PDF (backend)**: nueva función `_radar_svg()` en `/app/backend/routes/previous_analysis_export.py` que genera un gráfico pentágono SVG inline (sin dependencias externas) con 5 ejes, grid concéntrico al 20/40/60/80/100%, polígono relleno con gradient lima, puntos en los vértices con color semántico (verde/ámbar/rojo según nivel) y labels etiquetados. Se renderiza sobre un card de fondo oscuro (`linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`) con título "PERFIL DE CUMPLIMIENTO" en lima.
- Sección 2 del PDF ahora tiene layout de 2 columnas: radar a la izquierda (240pt de ancho) + tabla compacta de cumplimiento a la derecha.
- **Validado con `analyze_file_tool`**: PDF 177KB. El radar muestra correctamente las 5 áreas con sus %s, la asimetría de los datos (se expande hacia áreas fuertes, se contrae en las débiles), etiquetas blancas legibles sobre fondo oscuro, puntos coloridos en los vértices según nivel.


### Plan Anterior — Cumplimiento con slider y descripción por objetivo (Feb 2026)

**Problema del usuario**: Antes cada objetivo (Objetivo General, Preparación Física/Técnica/Táctica/Psicológica) era sólo un dropdown con 3 estados fijos. El usuario pidió: poder escribir logros/texto por objetivo + una barra para el nivel de cumplimiento + todo visible en el PDF.

**Implementación:**
- Migrada la estructura de `previousAnalysisData.cumplimiento` de strings (`"total"/"parcial"/"no"`) a objetos `{ descripcion: string, porcentaje: number }` por cada área. El estado (Total/Parcial/No) se auto-deriva del porcentaje: ≥85% Total, 40-84% Parcial, <40% No Cumplido.
- **Frontend** (`DashboardPage.js` sección prev-plan): cada área ahora se renderiza como una card inline con fondo tintado por estado, conteniendo: nombre del área, pill de estado auto-generado, % grande en tabular-nums, slider (0-100) con accent-color según estado, barra de progreso visual con gradient, y un textarea para describir los logros. El % Global usa un "hero card" lima con slider grande. Backward compat: si el backend devuelve el formato viejo, se inicializa como objeto vacío sin crasheo.
- **Backend** (`routes/previous_analysis_export.py`): el template PDF ahora renderiza una tabla de 3 columnas (Área·Logros / Progreso / Estado) con barras de progreso, % grande y pill colorido. Mantiene compatibilidad con el formato antiguo string.
- **Validado con `analyze_file_tool`**: PDF 174KB; todas las áreas muestran correctamente nombre, descripción, barra colorida según % y pill de estado. Colores verificados: 88/92% verde, 55/70% ámbar, 30% rojo.

### Plan Anterior — PDF + Share + WhatsApp (Feb 2026)

- Renombrado el tab "Diagnóstico" → **"Plan Anterior"** en el sidenav (`DashboardPage.js` navItems).
- Nuevo router `/app/backend/routes/previous_analysis_export.py` (registrado en `server.py`) con 4 endpoints:
  - `GET /api/plan-data/previous-analysis/{plan_id}/pdf` — PDF autenticado estilo whitepaper PDI.
  - `POST /api/plan-data/previous-analysis/{plan_id}/share` — crea/retorna share_id público (idempotente).
  - `GET /api/plan-data/previous-analysis/shared/{share_id}` — HTML público sin auth (incluye ribbon "DOCUMENTO COMPARTIDO").
  - `GET /api/plan-data/previous-analysis/shared/{share_id}/pdf` — PDF público sin auth.
- Template HTML (Playwright) con hero oscuro (logo iTRAIN blanco), badge "ANÁLISIS RETROSPECTIVO", metadatos (fechas/duración/lesiones), tabla de cumplimiento con barras, tabla de indicadores con deltas, grid Fortalezas/Áreas de mejora, box de lesiones y callout de conclusiones.
- **Frontend** (`DashboardPage.js`): 3 nuevos handlers (`handleDownloadPreviousAnalysisPDF`, `handleSharePreviousAnalysisLink`, `handleShareWhatsApp`) y 4 botones compactos en el header: PDF (download), Enlace (copia al clipboard), WhatsApp (abre `wa.me`), Guardar.
- Diseño ultra-compactado del formulario: cards con `p-3.5`, labels `text-[11px]` uppercase, inputs `h-9`, fila de cumplimiento como cards individuales en lugar de rows horizontales.
- **Backend testing**: 10/10 pytest pasaron en `tests/test_previous_analysis_export.py` (PDF, share idempotente, shared view sin auth, shared PDF sin auth, 404 en plan sin análisis, ruta existente no rota).


### Fix definitivo logo recortado en PDF Whitepaper PDI (Feb 2026)

**Problema raíz encontrado:**
Las imágenes fuente `/app/frontend/public/brand/itrain-full-pdf.png` (623x240) e `itrain-icon-pdf.png` (113x240) tenían el contenido tocando literalmente el borde derecho del lienzo PNG: la última columna (x=622) tenía 46-61 píxeles no transparentes. Cualquier mínimo subpíxel de rendering cortaba la letra "N" final de "iTRAIN". Ningún ajuste de CSS podía salvarlo porque la imagen fuente ya venía mal recortada.

**Fix aplicado:**
- Regenerados ambos PNG añadiendo padding transparente del 10% (mín 14px) en los 4 lados. **Para el HERO (fondo oscuro) se usa `itrain-full-light.png` (texto BLANCO)**, y para el footer (fondo claro) `itrain-icon-dark-v2.png` (azul oscuro). Resultado: `itrain-full-pdf.png` 628×161 (aspect 3.90), `itrain-icon-pdf.png` 169×168 (aspect 1.0). Verificado: 0 píxeles no transparentes en la última columna.
- **Segunda iteración**: el primer intento usó por error `itrain-full-dark.png` (texto azul oscuro) sobre el hero oscuro, lo cual fundía el logo con el fondo. Fixed usando la versión light.
- Actualizados los estilos CSS en `/app/backend/routes/periodization_models.py` (`PDI_WHITEPAPER_HTML`):
  - `.brand-mark img`: `height: 34pt; width: 132pt` (respeta nuevo aspect 3.86)
  - `.footer-brand img`: `height: 20pt; width: 20pt` (nuevo icon es cuadrado 1:1)
  - Inline en `<img>` del hero: `width:176px; height:46px` (aspect correcto)
- **Validación visual con `analyze_file_tool`**: confirmado 100% que el logo del hero y del footer se ven completos, todas las letras (i, T, R, A, I, N) visibles, proporciones correctas, padding adecuado, sin recortes.


## Implementado

### Zonas Karvonen clickeables en chart + PDF Pizarras (Feb 2026)

**Feature A — Zonas Karvonen interactivas:**
- `InteractiveChart.js` ahora soporta `onClick`, `stroke`, `strokeWidth` y `strokeDasharray` por `ReferenceArea`.
- En `SessionEditor.js`, cada banda Z1-Z5 del chart es clickeable → auto-completa `monitoreo.zonaObjetivo`, muestra toast con el nombre de la zona y anima con pulse CSS (`/app/frontend/src/index.css` `.ic-zone-clickable` + keyframes `ic-zone-pulse`).
- Visual: zona objetivo con `strokeDasharray` (4 3) y mayor `fillOpacity` (0.28 vs 0.10 baseline). Hover global sube opacidad a 0.35.

**Feature B — PDF Pizarras (claras / oscuras):**
- Nuevo endpoint `/api/sessions/download-boards-pdf/{share_id}?theme=light|dark` en `server.py` (~línea 7437).
- Genera un HTML server-side con Playwright `set_content` → PDF A4 con:
  - Header: marca iTRAIN + nombre de sesión + deportista + duración + total ejercicios + tag de tema.
  - Sección Objetivos (general + específicos) si existen.
  - Tabla (cuadrícula) agrupada por Fase (Inicial → Principal → Final) con columnas: `#`, `Pizarra` (SVG del boardThumbnail embebido), `Ejercicio`, `Series`, `Reps`, `Capacidad`, `Intensidad (%)`, `Volumen`.
  - Footer con share_id.
- En `SessionEditor.js` se agregan 2 botones nuevos al lado de "PDF oscuro/claro": **Pizarras oscuras** y **Pizarras claras** (icono `LayoutGrid`). El handler `handleExportAsPDF(theme, mode)` se extendió para rutear al endpoint correcto.
- Footer del editor ahora usa `flex-wrap` para acomodar los 5 botones.
- Testing: verificado con curl e2e con sesión de prueba → HTTP 200, PDFs 49-50KB, firma `%PDF-`. Análisis visual (gemini) confirmó el layout esperado.


### Fix botón "Mixta" visible en InteractiveChart (Feb 2026)
- Problema: El botón de tipo de gráfica "Mixta" usaba el mismo ícono `Settings2` que el botón real de configuración, haciéndolo indistinguible, y su contenedor no permitía wrap ante anchos reducidos.
- Fix aplicado en `/app/frontend/src/components/InteractiveChart.js`:
  - Etiqueta de texto "Mixta" junto al ícono (solo para ese tipo) tanto en vista expandida como compacta.
  - `flex-wrap` en el contenedor interno del selector de tipos de gráfica.
  - `flex-shrink-0` en el bloque "Vista:" y `flex-shrink min-w-0 truncate` en la info del rango para que los tipos nunca sean empujados fuera.
  - `data-testid="chart-type-{id}"` y `chart-type-compact-{id}` añadidos.


### FASE 13 — Mini reproductor de jugadas en SessionEditor (Feb 2026)

**Añadido:**
- **Componente `MiniBoardPlayer`** (`SessionEditor.js` líneas ~96-271): overlay de controles de reproducción sobre cada miniatura SVG animada (`act.boardThumbnail`) dentro del editor de sesiones.
- **APIs SVG SMIL nativas** (`pauseAnimations()`, `unpauseAnimations()`, `setCurrentTime()`, `getCurrentTime()`, `animationsPaused()`) para controlar las animaciones SMIL (`<animate>`, `<animateMotion>`, `<animateTransform>`) sin JS adicional.
- **Controles**: Play/Pause (iconos lucide-react sobre círculo de acento `#c8f700`), Reset (`RotateCcw`), mini-scrubber (barra `<input type=range>` 0..100 mapeada a duración), contador en segundos con 1 decimal (`1.4s`).
- **Detección automática de duración**: lee el `dur` más largo entre elementos animados en el SVG (por defecto 2.8s — coincide con el `dur` de animateMotion que genera tactical-board.html).
- **RequestAnimationFrame loop** para actualizar el scrubber mientras la animación reproduce.
- **stopPropagation** en todos los handlers para que los controles no disparen la apertura de tactical-board.html; el click sobre el SVG sigue abriendo la pizarra completa para edición.
- **Overlay con gradiente oscuro** (`linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 55%)` + `backdropFilter: blur(2px)`) en la parte inferior de la miniatura para legibilidad sobre cualquier color de cancha.
- **Testing**: verificado por testing_agent_v3_fork (iter_43) — code review 100%; SVG SMIL APIs validados con `/tmp/smil_test.html` (pauseAnimations=true, setCurrentTime(0) → t=0, unpauseAnimations → tiempo avanza correctamente).

### FASE 12 — Validación final batch Bolirana + Coach Profile + Animaciones (Abr 20, 2026)

**Añadidos validados (testing 14/14 backend ✅, frontend 100% ✅ — iter_42):**
- **Nuevo deporte Bolirana** en categoría Trad. Precision: cancha 1.5x5m, 9 agujeros numerados (1000/900/1000/400/500/400/200/300/200) + SAPO central, línea de lanzamiento a 3m.
- **Animación Rana "sinking" + sonido "clink"**: al anotar, el disco se marca `sinking=true` → render loop escala a 0 + fadeout en 600ms, disco desaparece (`el.gone=true`). WebAudio: triangle wave 1400→2800Hz en 50ms + fadeout 350ms.
- **Colisión Mecha→Bocín en Tejo/Minitejo ("¡MONAZO! +10000")**: en `checkKnockdowns` detecta d<14 con speed>0.4 en bocín pos (300,90 Tejo / 300,195 Minitejo), marca mecha explotada, flash goal, suma 10000 pts, sonido sawtooth 120→40Hz + sparkle sine 2200→4000Hz.
- **Perfil público Coach (`/coach.html?slug=xxx`)**: avatar con iniciales, stats (jugadas/vistas/duplicadas), grid de jugadas publicadas con marca HOT cuando duplicadas≥3.
- **Endpoint `GET /api/coaches/{slug}`**: slug normalizado (lowercase+guiones), retorna `{slug, coach_name, items[], totals, not_found}` — slug inexistente devuelve 200 con `not_found:true`.
- **Modal Compartir con inputs coach**: inputs `coach_name` + `coach_slug` persistidos en localStorage, link clickeable a `/coach.html?slug=<slug>` (FIX: antes decía `/coach/<slug>` que caía al React SPA).
- **Test suite pytest**: `/app/backend/tests/test_tactical_board_share.py` creado por testing agent (14 casos cubriendo share+coach+duplicate+top+OG+e2e).


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

### Tejo/Minitejo 3D real (ref foto) (Feb 2026)
- Rediseño completo según referencia fotográfica:
  estructura tipo rampa trapezoidal con
  - Cuerpo lateral azul marino (caras frontal+laterales)
  - Superficie inclinada turquesa con textura de círculos
    desgastados (marcas de impacto del tejo sobre la arcilla)
  - Respaldo vertical alto verde claro con marco azul oscuro
    y 8 tornillos simulando anclajes
  - 2 ruedas pequeñas negras en la base frontal
  - Bocín metálico dorado centrado con reflejo
  - Sombra proyectada elíptica
- Diferencias Tejo/Minitejo:
  - Tejo profesional: bw=110, backH=160, bocín ø12u (17cm real),
    cartel "19.5 m · BOCÍN 17 cm", 12 marcas en superficie
  - Minitejo: bw=90, backH=120 (65% del tamaño), bocín ø8.5u
    (12cm real), cartel "MINITEJO · 8-12 m · BOCÍN 12 cm",
    6 marcas (menos desgaste, recreativo)


- Rediseño completo basado en la Rana tradicional Colombia/Venezuela:
  caja de madera verde (80x80x60cm) con borde verde oscuro,
  respaldo curvo beige alto (cabecera), 4 patas pequeñas, superficie
  beige con grilla de 19 agujeros (5 cols x 4 filas) con aros
  metálicos dorados.
- 3 MOLINOS/clips de bronce articulados con bisagra superior dorada
  + tornillos + sombra proyectada. Visualmente pegados a la
  superficie cerca del frente.
- SAPO METÁLICO dorado céntrico superior (reemplaza 1 agujero):
  pedestal negro, cuerpo+cabeza con reflejos bronce, patas
  delanteras pequeñas, ojos con pupila negra, boca elíptica con
  labio superior dorado.
- FRENTE con 5 tablillas beige horizontales y compartimentos
  numerados grabados: 1000/900/2000/900/1000, 800/500/400/500/800,
  500/400/300/400/500, 700/600/4000/600/700 — con separadores
  verdes verticales (réplica de la rana reglamentaria).


- Botón 🏆 "TOP" agregado a #view-bar junto a la luna, abre
  /top-jugadas.html en nueva pestaña. Dorado distintivo para
  destacar el ranking viral.
- Tejo/Minitejo 3D ahora renderiza SOLO el bocín dorado central.
  Las mechas se colocan como implemento arrastrable desde el
  panel IMPLEMENTOS (deporte-gated).
- Nueva propiedad `avatarOverride` por persona: toggle ON/OFF
  "Mostrar avatar" en el panel PROPIEDADES para cada elemento
  p_* sin cambiar el modo global. buildElSvg respeta el override
  individual: true = siempre avatar con accesorio profesional,
  false = solo iniciales coloreadas, undefined = sigue el modo
  global (ST.avatarMode).


- Barra superior #view-bar ahora position:fixed y ocupa desde el
  sidebar (380px) hasta el borde derecho del viewport, cubriendo el
  espacio muerto arriba-derecha del panel. Todos los botones caben
  sin truncarse.
- Panel derecho con padding-top:56px para no solaparse. Canvas-wrap
  con margin-top:56px.


- Tiro con Arco 3D: diana vertical sobre trípode (3 patas
  cruzadas), 10 anillos oficiales WA (blanco/negro/azul/rojo/
  amarillo), 3 flechas clavadas con plumas doradas, sombra del
  trípode, etiqueta "70 m · DIANA 122 cm".
- Dardos 3D: pared marrón trasera + base negra + tablero circular
  vertical con 20 sectores alternantes crema/negro, anillo triple
  verde/rojo, anillo doble, bull's eye, 3 dardos clavados en
  perspectiva, etiqueta "1.73 m · TIRO 2.37 m".
- Tiro Deportivo 3D: 5 puestos (P1-P5) con postes + blancos ISSF
  circulares (blanco/negro/rojo) + 5 siluetas de tiradores en la
  línea de tiro (torso azul, cabeza, brazo extendido con pistola
  gris). Línea de tiro dashed + etiqueta "10 m · ISSF".
- Medir cercanía Bochas/Petanca: panel flotante lateral derecho
  con botón "Mostrar/Ocultar", líneas dashed colored (rojo/azul)
  conectando cada bocha al jack con etiqueta de metros. Panel
  lista ranking ordenado (🏆 ganadora). Auto-visible al
  seleccionar Bochas/Petanca. Escalado de unidades a metros según
  deporte (Bochas 27.5m/720u, Petanca 15m/680u).
- Backend: GET /api/boards/top?limit=N&sport=X devuelve ranking
  de shares ordenado por duplicates desc + totals globales
  (views/duplicates/boards).
- Nueva página /top-jugadas.html: dashboard tipo "Spotify Wrapped"
  con hero, 3 stats (vistas totales, duplicaciones, pizarras),
  ranking Top 10 con medallas 🥇🥈🥉 + chips de deporte + métricas
  duplicadas/vistas, CTA "Volver a la pizarra". Responsive.


- 10 avatares profesionales (cuando avatarMode='avatar'): Entrenador
  (chaqueta azul+tableta), Asistente (azul+silbato), Director
  (chaqueta negra+corbata roja), Masajista (bata blanca+cruz roja),
  Kinesiólogo (verde+arco), Psicólogo (morado+ψ), Árbitro (camisa
  rayada b/n+silbato), Juez Línea (amarillo+banderín diagonal),
  Juez Mesa (naranja+marcador "0-0"), Nutricionista (verde+manzana),
  Biomecánico (cian+reloj). Cada uno con cabeza+cuerpo+accesorio
  específico de su rol + sombra.
- Rana 3D realista: sapo metálico dorado/bronce con ojos grandes
  con párpados, boca abierta con lengua roja, reflejos metálicos,
  pedestal negro, patas traseras. 4 molinos rojos+dorados en los
  bordes. 6 agujeros laterales con aros metálicos dorados y
  plaquitas "1000"/"500" grabadas. Placa central "5000" en dorado.
- Tejo 3D oficial: mesa de arcilla 1m² a escala (19.5m × 2.5m
  cancha), bocín dorado central 17cm, 4 mechas rojas con hilo de
  pólvora amarillo en las esquinas, textura granular, cartel
  flotante "19.5m · BOCÍN 17 cm".
- Minitejo 3D: versión reducida con caja 50×50cm, bocín, 4 mechas.
- Botón gear-toggle (icono sol) eliminado — era redundante con el
  selector de estilo de avatar. Barra superior más limpia.
- Backend: POST /api/boards/duplicate/{id} incrementa contador.
  GET /api/boards/view/{id} ahora retorna `duplicates` además de
  `views`. Viewer muestra badge "🔥 Jugada popular · N coaches la
  duplicaron" cuando duplicates ≥ 3 (social proof + bucle viral).
- Botón "Duplicar" del viewer ahora dispara el POST antes de
  redirigir, registrando la analítica.


- Rana 3D: mesa de madera isométrica (80x80cm, altura 48u) con 4 patas
  marrones, superficie con veteado, 7 agujeros con aros metálicos
  dorados + etiquetas de puntos (5000/1000/500). RANA verde con ojos
  esféricos (blanco/negro), boca abierta negra con dientes blancos.
  Sombra proyectada. Patas traseras detrás.
- Nuevo elemento arrastrable "Arandela" (rana_disc) con render animado
  (halo amarillo pulsante) cuando anota.
- checkGoalCrossing: Rana tiene 7 zonas de anotación circulares (sapo
  central = +5000, 4 esquinas = +1000, 2 centros = +500). Soporta
  campo `points` para anotaciones variables. Discos rana_disc y bolas
  bowling pueden disparar anotación durante playback.
- Categorías Campo y Agilidad FUSIONADAS en "Implementos" (21 ítems).
  El otro grupo 18 renombrado a "Equipo Gym" para evitar duplicidad.
  renderToolbar ahora usa Map para agrupar por ID (antes separator
  rompía grupos con mismo número).
- Panel .panel-tabs con margin-top:56px para no invadir la toolbar
  superior.
- Viewer mode ampliado: botón "PNG" para descargar la imagen, contador
  "X entrenadores" (social proof) que muestra `views` del backend
  (singular/plural dinámico).


- Viewer mode para enlaces compartidos (?s=... o ?viewer=1):
  oculta sidebar/panel/toolbar, muestra barra flotante premium con
  logo iTRAIN, título de jugada, botón "Reproducir" y "Duplicar"
  (importa la jugada al editor del entrenador receptor — bucle viral).
- Miniatura OpenGraph auto-generada al compartir: captura el SVG del
  canvas, lo rasteriza a PNG 1200x630 con fondo verde pizarrón +
  branding iTRAIN, se guarda en backend y se sirve via
  /api/boards/og/{id}.png con cache 7d.
- Endpoint backend /api/s/{id} devuelve HTML con metatags OpenGraph
  (og:title, og:description, og:image, twitter:card) para que
  WhatsApp/Twitter/FB muestren preview atractivo. Usa
  X-Forwarded-Host para URLs absolutas correctas + redirect relativo
  al viewer.
- SVGs de canchas de Precisión limpiados: Bolo Americano, Bolo
  Criollo, Bochas, Petanca, Tejo, Minitejo ya NO traen pinos/bolas/
  jack pre-dibujados. Solo lineas y zonas. El entrenador arrastra
  los elementos desde el panel CAMPO.
- Nuevos elementos arrastrables (grupo Campo): pin_bowling (pino USA
  blanco con franja roja), pin_criollo (palo venezolano), mecha,
  bocin, tejo, jack/bolin, bocha_r/bocha_b, ball_bowling. Cada uno
  con render 2D + 3D (con sombra). Renderizado soporta rotación
  "knocked" para pinos caídos y "exploded" para mechas.
- Física básica durante playback: checkKnockdowns() detecta cuando
  un balón/tejo/bola pasa cerca de un pin o mecha. Pinos caen con
  rotación 60-100° (chain reaction a pinos vecinos < 22 units).
  Mechas explotan (8 rayos + circulos amarillo/naranja).
- Fix 3D dark: post-process en render3DFieldObjects reemplaza colores
  oscuros hardcoded (rgba(0,0,0,*), rgba(40,40,40,*), etc.) por tiza
  blanca en tema oscuro. Ahora son visibles: arcos Balonmano/Hockey/
  Futsal/Futbol FIFA, redes Tenis/Padel/Badminton, paredes Squash/
  Fronton, ropes Boxeo, rim de Baloncesto.
- MMA 3D: octágono completo con malla tipo chain-link (8 uprights,
  8 paneles con alambres verticales+horizontales, piso octagonal,
  puerta roja marcada).
- Squash/Fronton 3D: paredes más gruesas, con línea de saque, tin rojo
  (squash) y zonas horizontales (fronton), más visibles contra verde.
- Bolo Criollo 3D: 9 palos cilíndricos 3D (base elipse + cuerpo + cap +
  franja roja).
- NUEVO deporte: **Bolo Americano** en categoría Precisión. Pista 18.3m
  x 1.05m con canales, 10 pinos triangulares formato regulamentario
  USBC/WBT, bola de bowling 3D con 3 agujeros.
- Backend: endpoints `/api/boards/share` (POST anónimo) y
  `/api/boards/view/{share_id}` (GET público). TTL 90 días.
- Frontend share rehecho: modal completo con URL + botones "Copiar
  enlace" / WhatsApp / Cerrar, usando el mismo patrón que
  SessionEditor. Fallback a hash base64 si la API falla. Loader
  detecta ?s=XXX al cargar.
- Panel lateral (#panel-tabs) con height:56px fijo, alineado verticalmente
  con #view-bar (antes bajaba un renglón).
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

## 2026-02-22: Logo iTRAIN actualizado
- Nuevo logo oficial: óvalo lima vertical con "i" chunky inclinada + wordmark "iTRAIN"
- Assets PNG transparentes guardados en /app/frontend/public/brand/:
  - itrain-full-light.png (524x135) - para fondos oscuros
  - itrain-full-dark.png (541x140) - para fondos claros
  - itrain-icon-light.png, itrain-icon-dark-v2.png - variantes solo óvalo
- Componente reutilizable /app/frontend/src/components/BrandLogo.js con
  props variant='icon'|'full' y theme='light'|'dark', usa <img>
- Aplicado en LandingPage (nav + footer), AuthPage (header + HUD), 
  DashboardPage (top bar), SessionViewPage (header + footer)
- Favicon actualizado (favicon.ico, favicon-16/32/64.png)
- theme-color meta actualizado a #CCFF00

## 2026-02-22: Biblioteca de Modelos de Periodización (Datos > Herramientas > Modelos)
- Nuevo feature CRUD de modelos de periodización en `/api/periodization-library`.
- Pre-cargados 29 modelos de referencia científica (Matveiev, ATR, Verkhoshansky, DUP, WUP, Conjugado, Trifásico, Táctica Frade, Polarizado, Péndulo, etc).
- Cada usuario recibe una copia editable de los 29 defaults en su primer acceso.
- Los modelos se integran al wizard "Crear Plan" (paso Modelo): aparecen junto a los defaults y en una nueva categoría "Mis Modelos Personalizados" para los custom, con badge "MIO".
- Backend: `/app/backend/routes/periodization_models.py` + `/app/backend/data/periodization_library.py`.
- Frontend: `/app/frontend/src/components/PeriodizationModelsManager.js` + integración en DashboardPage (nav Herramientas) y PeriodizationComplete (wizard).
- Testing: backend 11/12 pass + reset-defaults fix aplicado. Frontend data-testids validados.

## 2026-02-22: Modelo iTrain PDI + Comparador de Modelos
- **Modelo exclusivo iTrain PDI** (Periodización Dual Integrada) agregado como primer modelo de la biblioteca default.
  - Autor: Brian · Route to Top / iTrain.app
  - 5 fases (Acumulación, Transformación, Realización, Mantenimiento, Recuperación) con integración PAI + CSE + Motor de Convergencia
  - 9 características distintivas, 7 deportes aplicables, color lima #CCFF00, icono 🧠
- **Seed inteligente**: `_seed_user_library_if_empty` ahora añade modelos NUEVOS por `default_key` sin duplicar los existentes. Usuarios con 29 modelos reciben automáticamente el 30º.
- **Comparador de Modelos** (`/app/frontend/src/components/PeriodizationComparator.js`):
  - Selección de 2-3 modelos via botón toggle en cada card
  - Gráfica de barras Volumen por fase (Recharts)
  - Gráfica de línea Intensidad por fase
  - Tabla side-by-side de fases con volumen/intensidad/duración
  - Matriz de características con check/cross
  - Badges de deportes aplicables con ratio de coincidencia
- Testing: backend 14/14 pytest PASS, PDI verificado en DB.

## 2026-02-22: Ficha Técnica iTrain PDI (sección especial)
- **Nueva sección "iTrain PDI"** en Datos > Herramientas del Dashboard (ícono 🧠 Brain)
- **Componente `/app/frontend/src/components/PDITechnicalSheet.js`** con 3 tabs:
  - **Resumen**: 3 pilares (PAI · CSE · Motor de Convergencia), 5 fases timeline, glosario
  - **Arquitectura 3D**: diagrama interactivo CSS-3D con perspective, capas apilables, hover reveal
  - **Simulador**: sliders de RPE/HRV/minutos/DFI + selección de tipo adaptativo + sesión (MD±X), calcula CIA en tiempo real con reglas del Motor y muestra zona VERDE/AMARILLO/NARANJA/ROJO + razones aplicadas + comparación MC vs CIA
- **Whitepaper PDF descargable** desde endpoint `/api/periodization-library/pdi/whitepaper` (Playwright, 70KB, A4, con portada hero + 7 secciones + glosario + tabla de fases con barras visuales)
- PDF verificado: portada profesional dark + título, 3 capas estructuradas, tabla con barras vol/int por fase, glosario completo, branding iTRAIN lima.

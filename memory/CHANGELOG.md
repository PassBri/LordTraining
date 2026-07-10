# CHANGELOG — LordTraining

## 2026-07-10 — Fix contraste app + franja del título del landing
- **Contraste (bug del re-skin dorado)**: el remapeo azul→oro había vuelto ilegibles píldoras/badges (texto dorado sobre oro) y botones (texto blanco sobre oro), porque perdió la info de tono (tints vs sólidos). **Solución**: se revirtieron TODOS los internos de la app al estado previo al re-skin (`6f58d33`) → diseño original con contrastes correctos. Se conservó: dorado de marca vía tema central `index.css` (botones/activos), login oscuro, landing, feature de badges de nivel, y logo en oro legible (`#B8912A`). Se reaplicó la integración de LevelBadge en Evaluación y Ranking.
- **Franja del título (landing)**: se eliminó la animación de onda/ECG dorada que se movía detrás de "SOFTWARE DE PERIODIZACIÓN DEPORTIVA" (distraía). Ahora es un **divisor elegante estático**: texto más pequeño con tracking amplio (eyebrow premium), flanqueado por hairlines dorados y rombos. Verificado por screenshot.

## 2026-07-10 — Fix: revertir colores de gráficas/Datos (el re-skin dorado saturaba)
- El remapeo azul→oro había sobre-saturado las vistas de **Datos** (filas del Plan Gráfico todas doradas) y borrado los **acentos significativos de las gráficas** (Volumen/Intensidad/Densidad, fases, ciclos).
- **Solución**: se revirtieron al estado previo al re-skin (commit `6f58d33`) SOLO los componentes de visualización: `GraphicPlan.js`, `PeriodizationComplete.js`, `PeriodizationViews.jsx`, `PeriodizationComparator/Models/Planner/Wizard`, `TrainingLoad/Stages`, `InteractiveChart`, `DashboardGeneral`, `LoadMetricsDashboard`, `LoadPanel`, `AdvancedMetrics`, `AthleteProgress`, `EvaluationEvolution`, `ComprehensiveTrainingPlanner`, `ControlPanel` y todo `components/charts/*`. Recuperan sus colores originales (macro azul, meso cian, micro rojo/verde, fases, etc.).
- Se **conservó** el re-skin dorado de marca en login/dashboard/navegación/botones (index.css + resto de UI) y la feature de **badges de nivel**. Se preservaron las correcciones previas de Plan Gráfico (independencia Vol/Int y Carga/Recuperación). Verificado por screenshot.

## 2026-07-10 — Badges de nivel de élite (medallas) por score de evaluación
- **Nuevo `components/LevelBadge.jsx`** (reutilizable, `getLevel` + `LevelBadge`): mapea el score de evaluación (0-100) a un nivel con estética de medalla: 💎 Diamante (≥90), 🥇 Oro (75-89), 🥈 Plata (60-74), 🥉 Bronce (40-59), 🛡️ En desarrollo (<40). Iconos lucide distintos por nivel, gradiente metálico y glow sutil. Tamaños sm/md/lg, `showLabel`, tooltip con pts. `data-testid=level-badge-<key>`.
- **Integración Evaluación (`EvaluationSection.js`)**: badge en la tarjeta hero '% Promedio' (usa `globalAvg`), visible cuando hay aspectos con valor (`data-testid=eval-level-badge`).
- **Integración Ranking (`AthleteRanking.js`)**: badge compacto (icono) por fila con datos, según `evaluation_avg ?? score`.
- Verificado por testing_agent (iteration_115): 100% en la feature, 4 niveles correctos en evaluación y ranking, sin regresiones.

## 2026-07-10 — Re-skin de marca de la app (Opción A): login + dashboard + módulos
- **Tema global (`index.css`)**: acento primario azul `#1976D2` → **oro `#D4AF37`** en variables `--md-*` y shadcn (`--primary`,`--ring`,`--accent`,`--chart-1..5` → paleta de medallas diamante/oro/plata/bronce). Botón `.btn-primary`, `.card-active`, `.shadow-glow`, `.sidebar-item.active` ahora dorados. Títulos (`h1..h6`) y `.stat-value` → tipografía **Outfit**.
- **Login (`AuthPage.js`)**: lima/navy → **obsidiana + oro** (paleta medallas), slate→zinc. La pizarra de vista previa ya combina (grafito+oro por los cambios del tactical-board).
- **Dashboard + ~15 módulos internos**: remapeo consciente de contexto del acento azul de marca → oro (relleno/gráficas = oro brillante `#D4AF37`; texto/bordes = oro oscuro `#B8912A` legible sobre blanco). 89 archivos actualizados + lima→oro en 45 archivos (incl. `BrandLogo.js`). Ej.: serie "Volumen" de gráficas pasó de azul a oro; iconos/KPIs dorados.
- **Se preservaron los colores semánticos** (rojo=alerta/intensidad, verde=ok/densidad, ámbar=warning) para no perder significado. La app sigue en tema CLARO (Opción A: re-skin de marca, no tema oscuro). Verificado por screenshots (login + dashboard). Compila limpio.

## 2026-07-10 — Paleta de medallas + coherencia landing↔pizarra táctica
- **Landing → paleta de medallas** (💎 diamante `#8FCFE6`, 🥇 oro `#D4AF37`, 🥈 plata `#C3C9D4`, 🥉 bronce `#C6864E`): se remapearon TODOS los acentos vivos restantes (azules/cianes→diamante, morados/verdes→plata, rojos/rosas/naranjas→bronce, ámbar→oro) tanto en clases Tailwind como en hex. Afecta gráficas de features, avatares (Central + testimonios), secciones de audiencias, how-it-works y quote marks. Resultado armónico y metálico, temático de deporte.
- **Pizarra táctica real (`public/tactical-board.html`) — estilo pizarra + oro**: lima neón (`#CCFF00`/`#c8f700`/`#a5d400`/rgba lima) → oro `#D4AF37`; superficies navy (`#0b1120`/`#0f172a`/`#13213a`/`#060a15`) → grafito neutro; `--primary`/`--accent` a oro. El **campo oscuro** pasó de verde `#1f4a34` a **grafito frío `#171d24`** con tiza blanca (`getFieldColors`), igualando las miniaturas del landing. El tablero ahora **abre en modo oscuro por defecto** (`loadTheme` default dark salvo preferencia 'light' guardada). Verificado por screenshot.

## 2026-07-10 — Landing: gráficas y canchas más sobrias (estilo pizarra)
- **Gráfica estadística del hero (`PeriodizationMiniChart`)**: se eliminó el tri-color chillón (azul `#3B82F6` / rosa `#F43F5E` / esmeralda) → **paleta monocromática dorada** (bronce `#7A6428` → oro `#D4AF37` → oro claro `#EAD9A0`). Legend, tooltip, etiquetas de fase y KPIs (Carga/ACWR/Monotonía/Adherencia) pasados a zinc/dorado.
- **Canchas SVG multideporte**: unificadas a **grafito monocromo estilo pizarra táctica** vía CSS `filter: grayscale(1) brightness(0.6) ... sepia hue-rotate` (sin reescribir los 10 SVG). Se quitó el color por deporte (verde/naranja/cian…); acento dorado solo en badges LIVE y nombres. Carrusel de deportes extra unificado a grafito+dorado (se dejó de usar `sp.c`). Verificado por screenshot.

## 2026-07-10 — Landing: rediseño "Tactical Minimalism" (más profesional/startup)
- **Dirección de diseño** (blueprint del design_agent en `/app/design_guidelines.json`): look premium estilo Vercel/Linear. Se reemplazó el estilo "neón/gamer" por uno sobrio y elegante.
- **Paleta neutralizada**: fondos de slate (azulado) → **zinc/obsidiana neutro** (#09090b/#18181b/#27272a) en todo `LandingPage.js` (global slate→zinc).
- **Acento dorado**: el verde lima neón `#CCFF00` → **dorado `#D4AF37`** (armoniza con el busto dorado del logo). Lima eliminado del landing.
- **CTAs primarios en blanco**: "Crear Cuenta", "Empezar gratis", "Comenzar ahora", etc. ahora `bg-white text-black` (se usó valor arbitrario `bg-[#FFFFFF]` para vencer el `bg-primary` por defecto del `Button` de shadcn por orden de CSS).
- **Tipografía**: títulos pasan de Barlow Condensed → **Outfit** (grotesque geométrica premium) cambiando la constante `BC` + `@import` en `index.css`. Inter se mantiene para cuerpo.
- **Motor de temas actualizado**: los overrides de los temas alternativos (light/futurista/material) y el mapeo global en `landing/*.css` se repuntaron de `slate-*` → `zinc-*`; el tema `classic` se excluyó del mapeo global (`:not([data-landing-theme="classic"])`) para conservar el nuevo look tal cual. Tokens del classic actualizados a la paleta obsidiana/dorada.
- Estructura y contenido i18n (t('landing.*')) INTACTOS. Verificado por screenshots: hero, scouting, funciones (bento), precios y footer. Compila limpio.

## 2026-07-10 — Landing: sección Scouting multiidioma (12 idiomas)
- La nueva sección "Scouting & Talent Identification" pasó de texto hardcodeado a i18n real vía `t('landing.scouting.*')` (30+ claves) en los 12 idiomas (script `i18n_tools.py translate` + `i18n_scouting_spec.json`). Título ES ajustado a "Scouting e Identificación de Talento". "Scouting"/"LordTraining" no se traducen.

## 2026-07-10 — Plan Gráfico (independencia + auto-cálculo) + Landing: sección Scouting + Timeline Periodización
- **Plan Gráfico · Volumen e Intensidad INDEPENDIENTES**: `_buildVolIntData` (GraphicPlan.js) ahora calcula la base de volumen e intensidad por separado y aplica overrides manuales de forma independiente (antes, editar volumen ponía la intensidad en 0). Además la fila **Intensidad %** ahora soporta entrada numérica de porcentaje (mismo control de unidad `%`/toggle `~`/`#` que Volumen; `VOLINT_UNIT_ROWS` incluye 'intensidad'). Verificado testing_agent iter_114 (100%).
- **Plan Gráfico · Magnitud de Carga y Recuperación INDEPENDIENTES + auto-cálculo**: `_buildLoadData` reescrito igual patrón. Carga % ahora se auto-calcula desde vol/int reales del micro v2 (`0.55·vol + 0.45·int`) → varía por semana en vez de saturarse en 100%. Recuperación % se auto-calcula (complemento) y ya no aparece vacía. Editar una no afecta la otra.
- **Periodización · Dashboard "Timeline del Plan" (GanttPlanChart) rediseñado**: Material Design (card rounded-3xl, sombras de elevación, segmented control de zoom pill, leyenda de tipos de micro), ancho **responsivo** con ResizeObserver (ya no se corta en modo "Todo"), y **nuevas filas Microciclos y Sesiones** (sesiones como mini-barras proporcionales). Adaptador `adaptarDatosGantt` ahora recibe microciclos+sesiones; `useGanttChart` los pasa. Verificado testing_agent iter_114 (100%).
- **Landing · NUEVA sección "Scouting & Talent Identification"** (`ScoutingSection` en LandingPage.js, `data-testid=scouting-section`) como **2ª sección** (tras el hero, antes del marquee). Estilo idéntico al landing (dark slate-950, acento lima, Barlow/Inter, Reveal on-scroll). Incluye: título+subtítulo+descripción, imagen de scout con tarjetas flotantes, 6 beneficios con checks, pills de audiencia (Clubes/Academias/Federaciones/Entrenadores), grid de 6 herramientas con iconos lucide, y CTA "Optimizar mi Scouting" → /auth. Texto en español (auto-traducido por pageTranslator para otros idiomas). Verificado por screenshot.


## 2026-07-02 — Login: animaciones más rápidas + Periodización Fases 2-5
- **Login (panel derecho)**: acelerado el **typewriter** de frases (typing 55→28ms, deleting 25→14ms, pausa 2800→1400ms) y el **carrusel de escenarios deportivos** (intervalo 8000→3500ms, fade 700→350ms; transiciones de opacidad 0.6/0.5s→0.3s). `AuthPage.js`.
- **Periodización FASE 2 (Material Design 3)**: chips de filtro, cards con elevación/redondeo, transiciones 300ms y **FAB** (botón flotante lima) con speed-dial para agregar Macro/Meso rápido.
- **FASE 3 (Navegación)**: **breadcrumb** siempre visible, **buscador** dentro del plan y **filtros** por fase / tipo micro / carga (ocultan sin re-indexar, preservando edición/arrastre). Aplican a Árbol/Kanban/Tabla.
- **FASE 4 (Edición avanzada)**: indicador de **autosave** (Guardando…/Guardado), **Deshacer (Ctrl+Z)** con pila de snapshots, e **Historial de cambios** en MongoDB (`periodization_history`: log/list/restore con quién/qué/cuándo + restaurar versión).
- **FASE 5**: **Duplicar mesociclo** completo (con sesiones) y **Comparador de planes** lado a lado (semanas/macros/mesos/micros/carga media + barra de distribución de fases). Plantillas rápidas (ATR/Tradicional/Bloques) ya existen vía el asistente de creación. *Planificado vs Real* queda pendiente (requiere plumbing de datos ejecutados).
- Backend nuevo: `routes/periodization_history.py`. Testing: iteration_111/112 — contrato de testids 100% verificado; flujos E2E limitados por una flakiness de navegación post-login PREEXISTENTE en DashboardPage (al seleccionar plan a veces no propaga `activePlan`), marcada por QA como no relacionada con estas features.

## 2026-06-30 — Periodización FASE 1: vistas nuevas + indicadores de carga + Excel
- **3 vistas nuevas** en el detalle de Periodización (junto a Dashboard/Estructura/Calendario/Gráfico): **Árbol Jerárquico** (colapsable Macro→Meso→Micro→Sesión), **Kanban** (columnas por macrociclo, tarjetas de microciclos arrastrables entre columnas con persistencia) y **Tabla Compacta** (una fila por microciclo, edición inline de Vol/Int/Carga + selector de tipo, autosave a MongoDB).
- **Indicadores de carga por color** (verde Óptima / amarillo Precaución/Detraining / rojo Sobrecarga) combinando **ACWR + carga%** (peor caso gana). Helper `loadStatus` en PeriodizationViews.jsx.
- **Exportar a Excel real (.xlsx)** desde la Tabla → endpoint backend `POST /api/periodization/export-excel` (openpyxl, con estilos y colores de estado). Verificado E2E por curl.
- **Vista persistida por usuario** vía localStorage (`lt_periodization_view`).
- Archivos: `frontend/src/components/periodization/PeriodizationViews.jsx` (nuevo), `PeriodizationComplete.js` (tabs+handlers updateMicroField/moveMicrocycle/export+persistencia), `backend/routes/periodization_export.py` (nuevo). Sin cambios en el modelo de datos.
- Testing agent: 95% (iteration_110). Corregidos: toggle de Árbol a 1 clic y toast 'Guardado' optimista. Regresión de vistas existentes OK.

## 2026-06-30 — Plan Gráfico: fix compartir (clipboard) + Super Admin login consistente
- **Compartir gráfica (bug HIGH iteration_109)**: el `catch` mostraba "Error al compartir" aunque el enlace SÍ se creaba, porque `navigator.clipboard.writeText` lanza `NotAllowedError` en contextos sandbox. Fix (`GraphicPlan.js`): helper `copyToClipboard` con fallback `execCommand`, y si falla, modal con el enlace para copiar manualmente (data-testid share-url-input/share-url-copy-btn). Mismo patrón defensivo en WhatsApp.
- **Super Admin login**: `POST /api/auth/login` devolvía un objeto `user` PARCIAL (sin `is_super_admin`, `org_id`, `org_role`), mientras `GET /api/auth/me` (que se llama al recargar) sí devuelve el `UserResponse` completo. El frontend hacía `setUser(response.data.user)` → tras el login la UI no reconocía al super admin (botón "Admin" no violeta); al recargar, `/me` traía el flag y aparecía.
- **Fix** (`routes/auth.py`): login ahora devuelve `UserResponse(**user).model_dump(mode="json")` — el MISMO objeto que `/me`, con `is_super_admin` incluido. `UserResponse` tiene `extra="ignore"` → no filtra el hash de password (verificado). Consultado con integration_expert (regla de auth).
- Pendiente usuario: **Deploy** (reporte en producción).

## 2026-06-30 — Login: panel derecho (pizarra demo) — Material Design + proporción
- **Quitado** el texto inferior tipo tiza "Los mejores no improvisan." del panel derecho.
- **Proporción**: el contenedor del tablero pasó de márgenes 8%/12%/14% a 13%/17% → tablero más contenido y equilibrado (ya no domina); radio 16px + sombra de elevación.
- **Material Design** en tarjetas HUD (cabecera de sesión, Readiness, ACWR, Adherencia): `rounded-2xl`, superficie `rgba(18,20,28,0.9)`, borde 1px sutil, blur 16px y sombra de elevación `0 8px 24px` → look cohesivo flotando sobre el lienzo. Verificado por screenshot en preview.
- Pendiente usuario: **Deploy** (reporte en producción).

## 2026-06-30 — Fix login responsive (no cabía en una pantalla en PC)
- **Causa**: el logo del login era enorme (`h-[300px] sm:h-[360px]`) y empujaba el formulario fuera de la vista → en ventanas de escritorio había que hacer scroll para ver email/contraseña/botón.
- **Fix** (`AuthPage.js`): logo reducido a `h-[120px] sm:h-[150px] lg:h-[170px]`, márgenes verticales compactados (logo/idioma/subtítulo/tabs de mb-5/mb-6 → mb-3/mb-4) y `py-8` en la columna del formulario. Ahora todo el login (logo, título, pestañas, email, contraseña, botón y enlaces legales) cabe en una sola pantalla sin scroll. Verificado por screenshot en preview.
- Pendiente usuario: **Deploy** para llevar el fix a lordtraining.com (el reporte fue en producción).

## 2026-06-30 — Refinamiento de paletas del Landing (4 temas) + multideporte profesional
- **Tema LIGHT — fix de contraste (bug del usuario)**: las tarjetas de testimonios usaban `background:#161b24` INLINE (no se re-tematizaba) con texto forzado a navy → texto oscuro sobre fondo oscuro ilegible. Fix en `landingLight.css`: `[data-testid^="testimonial-"] > div` → fondo blanco + borde/sombra suave (override `!important` vence al inline). También: hero headline garantizado navy `#050A14`; tarjeta de audiencia "coaches" (acento lima ilegible sobre blanco) → subtítulo/checks a oliva oscuro `#5C6B00` y CTA a navy con texto lima. Tokens light refinados (Notion/Linear: bg `#F9FAFB`, surface `#FFF`, elevated `#F3F4F6`, ink `#0A0F1E`).
- **Tema FUTURISTA — repaletado a "cerámica" grafito neutro (cero azul)**: tokens cambiados de navy-azul a grafito mate (bg `#121212`, surface `#1C1C1C`, elevated `#262626`, texto `#F5F5F7/#A1A1AA`, borde neutro `#333`, sombra mate cerámica, radios 8px). Bordes de superficie de lima→neutro. Bandas/nav/marquee neutralizados. Lima reservada a acentos puntuales (verbos del hero, línea animada).
- **Tema FUTURISTA — tipografía controlada**: hero clamp reducido a `clamp(1.9rem,2.2vw+0.6rem,2.5rem)` (antes 3.75rem) y H2 a `clamp(1.5rem,2vw+1rem,2.25rem)` para no romper el layout.
- **Sección Multi-Deporte más profesional**: tableros SVG desaturados (`filter: saturate(0.5) brightness(0.82)`, hover sube a 0.72) + overlay grafito cohesivo; carrusel de deportes extra con gradiente muted (borde superior 2px de color para diferenciar, sin inundar el fondo). Menos "arcoíris", más premium.
- Blueprint en `/app/design_guidelines.json`. Verificado: compila limpio; futurista (hero/palette) confirmado por screenshot; light/multideporte vía CSS determinista (el tool de screenshot solo captura el tope). Tema activo en prod sigue 'classic' (intacto).

## 2026-06-29 — Vista previa de temas del Landing (sin publicar)
- **Botón "Vista previa" por tema** en el panel Super Admin (Apariencia de Landing): abre `/?previewTheme=<id>` en pestaña nueva. (`landing-theme-preview-<id>`)
- **Landing soporta `?previewTheme=<id>`**: renderiza el tema indicado SIN consultar ni modificar el tema activo de la BD; muestra un aviso flotante "Vista previa: tema X · no publicado" (`preview-theme-banner`). Verificado visualmente: con BD en 'classic', `/?previewTheme=light` muestra el landing en claro sin publicar.
- La tarjeta de tema pasó de `<button>` a `<div role=button>` para permitir el botón anidado de vista previa.


- **Fix Torneos**: la sección Torneos lanzaba `ReferenceError: fetchTournaments is not defined` (el hook exporta `fetchTournamentsData`). Corregidas las 4 referencias en DashboardPage.js. Ahora abre sin error. (iter_108 PASS preview · producción requiere redeploy)
- **Theming completo del Landing (4 temas)**: reescrito `landingThemes.css` como motor de overrides scoped `.lt-theme[data-landing-theme="X"]` que re-tematiza TODO el landing en runtime sin tocar JSX: mapeo de superficies (bg-slate-950/900/800 → tokens), textos (text-white/slate → tokens), bordes, radios por tema (Futurista 4px / Material 24px), sombras y glow. Resolución de clases de doble uso (text-slate-900 en tarjetas blancas vs botones de acento lima). Override quirúrgico para Light de las bandas con gradientes oscuros fijos (`0a0f19/1a2033`). Verificado visualmente Light (fondo claro + texto oscuro) y Futurista (negro + glow lima + esquinas rectas). Save de tema verificado en preview (iter_108 PASS).
- **403 al guardar tema en producción**: es config, no código (el backend funciona en preview). El Super Admin solo se habilita si `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` están en el entorno de producción y se RE-DESPLIEGA (el seed promueve la cuenta al arrancar). Mejorados los mensajes de error del panel para mostrar el status HTTP exacto y diagnosticar.


- **Calendario consolidado por Equipo**: al seleccionar un Equipo, el Calendario Drag & Drop muestra los eventos de TODOS los atletas del equipo. Cada chip lleva una insignia con la INICIAL del atleta y un COLOR único auto-asignado; arriba se muestra una LEYENDA (`team-calendar-legend`) con inicial+nombre+color por atleta. (iter_107 PASS)
- **Arrastre con alcance (Modo Equipo)**: al soltar un chip en otro día, un `confirm` pregunta el alcance → Aceptar = reprogramar para TODO el equipo · Cancelar = solo ese atleta. Implementado vía `rescheduleEventForAthlete` (por atleta: events_calendar + planData) + `handleEventReschedule(ev, newDate, scope)`. (iter_107 PASS)
- **Modo Individual** intacto: sin leyenda, sin insignia de inicial, arrastre directo sin preguntar alcance. (iter_107 PASS)
- Helpers nuevos en DashboardPage: `teamEvents`/`fetchTeamEvents`/`teamAthleteMeta` (TEAM_PALETTE + iniciales). En SessionCalendar: `teamMode`/`teamName`/`teamLegend`.


- **Enlaces de Redes Sociales en Super Admin**: nueva sección en el tab "Apariencia de Landing" (componente `SocialLinksEditor` en LandingAppearance.jsx) con inputs para X, LinkedIn, Instagram, TikTok, YouTube, Facebook. Backend `GET /api/landing/social` (público) y `PUT /api/landing/social` (solo super admin, normaliza URLs a https://) en `landing_settings.py` (colección landing_settings, MongoDB). (iter_105 PASS)
- **Footer del landing dinámico**: los íconos sociales del pie ahora se renderizan desde los enlaces guardados (solo se muestran los que tienen URL; abren en nueva pestaña). Se añadieron íconos TikTok, YouTube y Facebook. (iter_105 PASS)
- **Pizarra Táctica exige login (opción B)**: en el landing, al hacer clic en tarjetas de deporte o "Explorar pizarra" estando deslogueado, redirige a `/auth` (NO abre la pizarra) y guarda `postLoginRedirect`; tras iniciar sesión, abre `/tactical-board.html`. (iter_105 PASS)
- **Fix regresión**: faltaba `useMemo` en el import de React de DashboardPage.js (introducido al scaffolding del calendario de equipo) → causaba "useMemo is not defined" en /dashboard. Corregido. (iter_106 PASS)
- **EN PROGRESO (scaffolding)**: vista consolidada de Equipo en el Calendario (estado `teamEvents`, `fetchTeamEvents`, `teamAthleteMeta` con inicial+color por atleta) — pendiente de cablear a SessionCalendar y refactor de `handleEventReschedule` con alcance (todo el equipo / solo ese atleta).


## 2026-06-28 — Sincronización Calendario ↔ Plan Gráfico + Asignación por Equipo + Fix Sesiones
- **Selector "Atleta o Equipo"** (DashboardPage, barra persistente del Plan Activo, panel Datos): combo agrupado Equipos/Atletas. Al elegir un Equipo se muestra badge "Modo Equipo: N atletas" y banner azul en Plan Gráfico. (iter_100 PASS)
- **Asignación masiva por Equipo**: al asignar/quitar fechas en celdas del Plan Gráfico en Modo Equipo, los eventos se replican (merge, no sobrescribe) al `events_calendar` de TODOS los atletas del equipo. Helper `replicateToTeam` en GraphicPlan.js (fetch+merge+POST por atleta). (iter_100 PASS)
- **Arrastre BIDIRECCIONAL Calendario→Plan Gráfico**: chips de eventos del Plan Gráfico (`gp_*`) ahora son draggable en SessionCalendar; al soltar en otro día se llama `onEventReschedule` (DashboardPage) que actualiza `events_calendar` y mueve la fecha en `graphic_plans.planData` a la semana recalculada desde `activePlan.start_date`. El calendario auto-salta al mes del primer evento. (iter_104 PASS)
- **FIX Sesiones (Volumen por Capacidad)**: bug de reconciliación — al cambiar Capacidad Física los rótulos de columna (Int/Volumen/Medida) no se actualizaban. Causa raíz: `session` prop inline en PeriodizationComplete + `useEffect([session])` reseteaba el estado. Fixes: (a) `sessionEditorSession` memoizado, (b) `loadedSessionIdRef` (reset solo al cambiar session.id), (c) key compuesta en la fila de actividad `${act.id}-${capacidadFisica}-${unidadVolumen}-${unidadIntensidad}`. (iter_104 PASS — Fuerza→Resistencia→Teórica adapta %1RM/Reps/Kg → %FCmax/Km/Km → Escala 1-5/Minutos/Minutos)


## 2026-06-24
- **Periodización · Estructura editable**: modales de Macro/Meso/Microciclo ahora con FONDO BLANCO legible + campos editables Volumen %, Intensidad %, Progreso %. Suma/consolidación automática (rollup promedio) sesiones→micro→meso→macro; edición manual queda bloqueada (viLocked) y se respeta. Verificado E2E (iteration_64.json, 100%).
- **Auth · Auto-login tras registro**: al crear cuenta entra directo al dashboard (o al checkout si venía de un plan). Mejora conversión.
- **Auth · Roles**: dropdown corregido a 7 categorías (Deportista, Entrenador, Administrador, Club, Escuela, Academia, Entidad); backend UserRole extendido (club/school/academy/entity).
- **Resiliencia URL backend**: red de seguridad — si REACT_APP_BACKEND_URL apunta al dominio muerto itrain.com, el frontend usa same-origin (window.location.origin). Corrige login/registro en producción (lordtraining.com).
- **Seed Super Admin**: server.py seed_super_admin (SUPER_ADMIN_EMAIL/PASSWORD) crea/promueve admin+enterprise de forma determinística.

## Hotmart (config en Secrets de producción)
- 8 planes/ofertas configurados (offer codes + checkout URLs), Client ID/Secret/Basic Token válidos (token OAuth OK).
- Botones de planes (landing + dashboard) conectados al checkout de Hotmart; Institucional = "Empezar ahora" automático.
- Página /gracias (post-compra) creada.
- Escama de marca en cabeceras (Pizarra, editor de Sesiones) y en PDFs de Sesiones.

## 2026-06-24 — Scouting: Stats multi-deporte + valor/transferencias + fix PDF
- **Fix descarga PDF**: ahora la ficha se descarga vía `fetch`→blob autenticado (detalle) y blob público (página pública), eliminando el fallo de `window.open`/attachment. Requiere redeploy para producción.
- **Catálogo de deportes**: el selector de deporte del prospecto usa el catálogo de periodización **agrupado por categoría** (`/api/sports-catalog`).
- **Estadísticas multi-deporte** (`prospect_stats` + `sport_templates` en Mongo, JSON flexible): plantillas por deporte (voleibol, fútbol/futsal, baloncesto, natación, atletismo, tenis, ciclismo + genérico + custom por entrenador). Endpoints `GET/POST /sport-stats-template`, CRUD `/prospects/{id}/stats`. Tab **"Por Partido/Competencia"** (registro por fecha/rival, campos dinámicos, **eficiencias % auto**) y tab **"Temporada"** (promedios/totales, **gráfica de evolución Recharts**, mejor actuación). Componente `ProspectStats.js`.
- **Valor comercial/precio + patrocinios** y **Transferencias/Trayectoria** (escuela→club/equipo/institución/federación/universidad) en el formulario, detalle y ficha pública.
- **Videos múltiples** con tipo **Jugando/Entrenando** (`VideoLink.type`), agrupados en detalle y público.
- **IA** ahora usa las estadísticas reales (agregados de temporada) como evidencia y ya no menciona "sin datos verificables".
- Verificado E2E: plantillas/registro/agregados (curl), formulario dinámico con eficiencia 66.7% auto, tabs de detalle, catálogo agrupado, descarga PDF (download event), consola 0 errores.

## 2026-06-24 — Scouting: Video player (YouTube/Vimeo) + Criterios personalizados
- **Reproductor de video** (`components/VideoEmbed.js`): incrusta YouTube y Vimeo en miniatura/mini-player con botón de **ampliar** a lightbox grande (autoplay, fullscreen); enlaces no soportados (Drive, etc.) como botón "Abrir". Usado en el detalle del prospecto y en la ficha pública.
- **Criterios de evaluación personalizados** con 3 alcances: `prospect` (solo este prospecto, badge "propio"), `sport` (plantilla reutilizable del deporte, badge "deporte"), `global` (plantilla del club, badge "club"). Backend: `POST/DELETE /api/recruiting/criteria/custom` + merge en `GET /criteria` (deepcopy, sport+global del entrenador). Persistencia de criterios de alcance prospecto en `evaluation.custom_labels`; incluidos en el cálculo de score y en el prompt de IA.
- Fix: warning de input controlado con valor null en el formulario de prospecto (normalización de campos nullable).
- Verificado E2E: merge de criterios por deporte/global (curl), UI de agregar/quitar criterio con badges, lightbox de YouTube funcionando, consola limpia (0 errores).

## 2026-06-24 — Scouting: Link público compartible 🔗 (viralidad)
- **Backend** (`recruiting.py`): `POST/DELETE /api/recruiting/prospects/{id}/share` (activa/desactiva enlace, genera `share_id`), y endpoints PÚBLICOS sin auth: `GET /public/{share_id}` (ficha sanitizada), `/public/{share_id}/photo`, `/public/{share_id}/pdf` (NCAA). Solo accesibles si `share_enabled`.
- **Frontend**: nueva página pública `PublicScoutingProfile.js` en ruta `/scouting/p/:shareId` (sin login) con diseño estilo red social — hero, score vs estándar, evaluación por área, informe del scout (IA), highlights, logros, contacto y CTA viral "¿Eres entrenador o club? Empezar gratis". Botón **"Compartir"** en el detalle del prospecto con diálogo (copiar enlace / abrir / desactivar).
- Verificado: share genera URL, ficha pública renderiza (con y sin datos), PDF público 200, consola limpia.

## 2026-06-24 — MÓDULO NUEVO: Recruiting & Talent ID (Scouting) 🎯
- **Backend** `/app/backend/routes/recruiting.py` (prefijo `/api/recruiting`): CRUD de prospectos, pipeline (stage prospect/contacted/trial/decision + outcome), observaciones, evaluación por criterios POR DEPORTE (futbol/basket/voley/tenis + general, club_standard=70) con cálculo de overall_score y promedios por categoría, recomendación IA (GPT-5.5 / Claude Sonnet 4.6 vía Emergent LLM Key, JSON estructurado verdict/strengths/weaknesses/plan), subida de foto (object storage Emergent, sirve con `?auth=`), ficha PDF estilo NCAA (Playwright HTML→PDF, foto embebida base64), conversión a atleta (crea en `db.athletes`, idempotente), y dashboard (ranking, by_stage, alertas de seguimiento).
- **Frontend** `/app/frontend/src/components/ScoutingModule.js`: módulo autocontenido con tabs internas Prospectos · Pipeline · Evaluación · Ranking. Tarjetas estilo red social (foto, score, stage, verdict IA), Kanban con drag & drop, formulario crear/editar con subida de foto, detalle social con hero/stats/barras/IA/observaciones/PDF/Reclutar, evaluación con sliders y comparación vs estándar en vivo, ranking con comparativa lado a lado y alertas.
- **Integración nav**: botón FAB "Scouting" (data-testid `tab-scouting`) en la barra superior de Datos; funciona SIN plan activo (añadido a `sectionsWithoutPlan`). Registrado en server.py (~8435).
- Selector de IA por proveedor (OpenAI gpt-5.5 / Anthropic claude-sonnet-4-6). Al marcar "Recruited"/convertir → atleta automático en Gestión de Equipos (elige equipo).
- **Testing**: testing_agent iteration_65 → Backend 21/21 PASS, Frontend 18/18 PASS. Sin issues críticos. Warnings de a11y de Radix Dialog corregidos (DialogTitle/DialogDescription). Consola limpia, sin hydration warnings.
- **Tarjeta de sesión**: rediseño Material más vivo (acentos de color por día, gradiente sutil, sombra al hover) sin cambiar tamaño. Botón **"Editar"** (lápiz) añadido junto al de eliminar (visible al hover). `data-testid="session-{i}-edit-btn"`.
- **Modal "Editar Sesión"** (fondo blanco): campos Volumen % (0-100), Intensidad % (numérico 0-100) + botones de Nivel (Baja/Media/Alta), Progreso %, Nombre y Duración. Al guardar desbloquea el micro y recalcula la suma en cascada (micro→meso→macro). `data-testid`: session-volume-input, session-intensity-input, session-level-{low|medium|high}, save-session-btn.
- **Unificación de keys** `volume`/`volume_percent`/`volume_pct` (e intensidad) vía helper `mirrorVI` aplicado en `computeRollups` y en el payload a la API. Backend `PUT /api/training-plans` → 200 OK.
- **Intensidad de sesión ahora numérica** (antes string high/medium/low). Helpers `viNum`/`viLevel` para mostrar badges y derivar nivel.
- **Hydration warnings ELIMINADOS (0)**: causa raíz = plugin dev `visual-edits/babel-metadata-plugin.js` envolvía expresiones JSX en `<span display:contents>` dentro de tablas. Fix: omitir el wrap cuando el padre es table/thead/tbody/tfoot/tr/colgroup/select/optgroup/ul/ol/dl/menu. (Solo afecta dev/preview; en producción el plugin está deshabilitado.)
- Verificado E2E con Playwright: login, navegación a Periodización→Estructura, edición de sesión y guardado correcto. Consola sin warnings de anidación.

## Pendientes / Notas

## 2026-06-24 — Meta/Objetivo en el progreso + Logos de patrocinadores en el informe 🎯🏷️
- **Meta/Objetivo**: por métrica (atleta+calculadora+label) se fija un valor objetivo. El gráfico (modal y página pública) muestra una **línea de referencia verde discontinua** ("Meta X") y una **barra de progreso con %** hacia la meta (badge "¡Alcanzada!" al 100%). El dominio del eje Y se expande para incluir la meta. Backend: `POST/DELETE /goal`, incluido en `_build_series` (progress_pct, reached) y en el PDF (línea de meta + "X% logrado").
- **Patrocinadores**: subida de **logos** (object storage) a nivel coach. Aparecen en el modal, en el **PDF** (banda "PATROCINADORES") y en la **página pública**. Backend: `POST/GET/DELETE /sponsors`, `GET /sponsor-logo/{id}` (público).
- **Endpoint nuevo** `GET /series` (authed) para que el modal obtenga meta+patrocinadores canónicos.
- **Bug corregido**: `DELETE /goal` quedaba eclipsado por `DELETE /{rid}`; se movió la ruta genérica al final del archivo. Verificado.
- **Testing**: testing_agent iteration_71 → frontend 100% (meta, upload/delete logo, PDF, compartir, página pública con meta+logos); backend 9/9 tras el fix.
- **PENDIENTE USUARIO**: hacer **Deploy** para llevarlo a lordtraining.com.



## 2026-06-24 — Detalle de evolución clickeable + PDF de progreso + enlace público 🔗📊
- **Frontend** (`AthleteProgress.js`): tarjetas de evolución ahora **clickeables** → abren modal `progress-detail-modal` con 5 stats (inicial/actual/mejor/promedio/cambio), gráfico grande (recharts) y **historial completo** (fecha + valor + nota). Botones: **Descargar PDF** y **Compartir enlace** (copia al portapapeles).
- **Página pública** (`pages/PublicProgress.js`, ruta `/progress/p/:shareId`): sin login, tema oscuro, gráfico + stats + historial + botón de PDF público. Ideal para enviar a atletas/padres/patrocinadores.
- **Backend** (`routes/calculator_results.py`): `POST /share` (idempotente, colección `calc_progress_shares`), `GET /public/{id}`, `GET /public/{id}/pdf`, `GET /progress-pdf` (authed). PDF de progresión con **ReportLab** (gráfico de línea con ejes/grilla/puntos, stats, historial, QR al enlace) → funciona en producción.
- **Testing**: testing_agent iteration_70 → **5/5 flujos frontend + 4/4 endpoints backend PASS (100%)**.
- **PENDIENTE USUARIO**: hacer **Deploy** para llevarlo a lordtraining.com.



## 2026-06-24 — Mini-línea de evolución en el perfil del atleta 📈
- **Frontend** (`components/AthleteProgress.js`, integrado en `DashboardPage.js` bajo `AthleteSummary`): nueva sección **"Evolución del rendimiento"** en el perfil del atleta. Consume `GET /api/calculator-results?athlete_id=`, agrupa por calculadora + métrica principal (headline) y dibuja **mini-sparklines** (recharts) con: valor más reciente, % de cambio vs. el primero (verde sube / rojo baja / gris sin cambio), nº de registros y tooltip por fecha.
- Verificado en preview: 1RM mostrando +7.4% ↗ y % Grasa -9.9% ↘ con sus mini-gráficos. Solo aparece cuando hay resultados guardados.
- **PENDIENTE USUARIO**: hacer **Deploy** para llevarlo a lordtraining.com.



## 2026-06-24 — Guardar resultados de Calculadoras al perfil del atleta/plan 💾
- **Backend** (`routes/calculator_results.py`, colección `calculator_results`): `POST/GET/DELETE /api/calculator-results`. Guarda título, módulo, headline, items y nota; asociado a `athlete_id` (+ `plan_id` opcional). Resuelve y persiste `athlete_name`/`plan_name`.
- **Frontend universal** (sin tocar las ~40 calculadoras): `CalcCard` (en `CalcShared.js`) ahora provee `CalcResultContext`; `BigResult` y `MiniStat` registran su valor automáticamente. Se inyecta un botón **"Guardar en atleta"** en cada calculadora (`CalcSaveBar.js`) con diálogo que carga atletas (`/athletes`) y planes (`/training-plans`) reales, permite elegir plan y nota.
- **Historial**: toggle 'Resultados guardados' en el Hub de Calculadoras (`CalculatorsHub.js`) → `CalcResultsHistory` agrupa por atleta con borrado.
- **Testing**: backend validado por curl (guardar/listar/eliminar); frontend testing_agent iteration_69 → **6/6 flujos PASS (100%)**.
- Nota: warning de consola preexistente (`<span>` en `<option>` del `<Select>` nativo de algunas calculadoras) — sin impacto funcional, no introducido en esta tarea.
- **PENDIENTE USUARIO**: hacer **Deploy** para llevarlo a lordtraining.com.



## 2026-06-24 — Gestión de Usuarios en Panel Super Admin 👤
- **Backend** (`routes/admin_hierarchy.py`, solo `is_super_admin`): CRUD completo de usuarios + contraseñas. Hash con **bcrypt** (consistente con la app). Endpoints: `GET/POST /api/admin/users`, `PUT /api/admin/users/{id}`, `POST /api/admin/users/{id}/reset-password`, `PATCH /api/admin/users/{id}/status`, `DELETE /api/admin/users/{id}`.
  - Crear: nombre, email (único, lowercase), contraseña, rol, plan, flag super admin.
  - Editar: nombre/rol/plan/super admin. Reset password. Activar/desactivar (`active` flag). Eliminar.
  - **Login** (`server.py`) ahora rechaza cuentas `active:false` con 403.
  - **Guardas anti-bloqueo**: no puedes eliminar, desactivar ni quitarte tus propios privilegios de Super Admin.
- **Frontend**: nueva pestaña **"Gestión de Usuarios"** en `SuperAdminPage.js` → componente `AdminUserManagement.js` (tabla con badges rol/plan, búsqueda + filtros rol/plan, diálogos crear/editar y restablecer contraseña, toggle activar/desactivar, eliminar). Servicios en `services/api.js`. Botones destructivos ocultos en la fila propia.
- Suprimido warning benigno de ResizeObserver en `index.js` (dev only).
- **Testing**: backend validado por curl (6 ops + guardas); frontend testing_agent iteration_68 → **9/9 flujos PASS (100%)**.
- **PENDIENTE USUARIO**: hacer **Deploy** para llevarlo a lordtraining.com.



## 2026-06-24 — FIX CRÍTICO: PDF de Scouting en PRODUCCIÓN + temas + mapa 🛠️
- **Causa raíz del PDF que fallaba SOLO en producción (500)**: la ficha usaba **Playwright (Chromium headless)** para renderizar HTML→PDF. En el contenedor de producción el navegista headless no está disponible/operativo (en preview sí), por eso devolvía 500. Los PDFs basados en **ReportLab** del proyecto (ej. PDF de sesión "classic") sí funcionan en prod.
- **Solución**: Reescrita la ficha de scouting con **ReportLab** (`_build_scout_pdf` en `routes/recruiting.py`), sin navegador → funciona en producción. Soporta **tema oscuro y claro** (verificado: fondo oscuro #0f172a vs blanco #ffffff, texto legible, sin solapamientos, header con foto/score/verdict, QR, banda inferior con tagline). Eliminadas funciones obsoletas `_build_profile_html`, `_render_pdf`, `_photo_data_uri`, `_season_html_for`, `_qr_data_uri`, `_PDF_THEMES`. Nuevas: `_photo_bytes`, `_season_summary_for`, `_qr_reader`, `_build_scout_pdf`.
- **Botones PDF Oscuro / Claro**: en el detalle del prospecto (`detail-pdf-dark-btn`, `detail-pdf-light-btn`) y en la página pública (`public-pdf-dark-btn`, `public-pdf-light-btn`). Endpoints `profile-pdf` y `public/{share_id}/pdf` aceptan `?theme=dark|light`.
- **Mapa ya no se ve negro**: tiles cambiados de `dark_all` a **`voyager`** (claro/colorido) de CartoDB en `ScoutingMap.js`, con overlay de carga.
- Verificado por curl: profile-pdf y public pdf, ambos temas → HTTP 200, PDF válido (~16KB ReportLab).
- **PENDIENTE USUARIO**: hacer **Deploy** para que el fix llegue a lordtraining.com.



## 2026-06-24 — FASE 2: Recruiting & Talent ID (todo en MongoDB) 🚀
- **Backend** `/app/backend/routes/recruiting.py` (nuevas colecciones `recruiting_contacts`, `recruiting_settings`):
  - **Alertas y seguimiento**: `GET /api/recruiting/alerts` (sin evaluar hace N días, contrato/patrocinio por vencer/vencido, severidades danger/warning/info; omite prospectos recruited/declined). `GET/PUT /api/recruiting/settings` (eval_days, expiry_days persistidos).
  - **Red de contactos**: CRUD `/api/recruiting/contacts` (roles agent/representative/parent/institution/club/scout/other, vínculo a prospectos, filtro por role/prospect_id).
  - **Mapa de origen**: `GET /api/recruiting/map` (puntos con lat/lng; usa `origin_lat/lng` exactos o centroide por país desde tabla COUNTRY_CENTROIDS; cuenta `unlocated`).
  - **Modelo ProspectIn** ampliado: `contract_end`, `origin_city`, `origin_country`, `origin_lat`, `origin_lng`; patrocinios admiten `expires_at`.
- **Frontend**: 3 nuevas tabs en `ScoutingModule.js` → **Alertas** (`ScoutingAlerts.js`), **Contactos** (`ScoutingContacts.js`), **Mapa** (`ScoutingMap.js` con Leaflet 1.9.4 + tiles cartocdn, overlay de carga). Comparador **mejorado** (corona de líder, resalte del ganador por categoría, atributos físicos). Formulario de prospecto con campos ciudad/país de origen, fin de contrato y vencimiento de patrocinios. Helper compartido `scoutingApi.js`.
- **Dependencia nueva**: `leaflet@1.9.4` (frontend).
- **Testing**: testing_agent iteration_66 → Backend 9/9 PASS, Frontend tabs/CRUD/mapa/comparador OK. Sin issues críticos.


- Refactor pendiente: PeriodizationComplete.js (~3370 líneas), server.py (~8500), DashboardPage.js (~4750).
- Migración de contenido preview→producción: pendiente de definir/ejecutar (flag `IMPORT_PREVIEW_DATA`).
- Recordatorio: los cambios viven en Preview; el usuario debe hacer **Deploy** para reflejarlos en lordtraining.com.

## 2026-06-25 — Tracking de visitas en links públicos + Cambio global de logo

**Tarea 1: Contador de visitas en reportes públicos de progreso (P0) — DONE & TESTED**
- Backend (`/app/backend/routes/calculator_results.py`):
  - `GET /public/{share_id}`: ahora registra `views_count` (+1), `first_viewed_at` (solo la 1ra vez) y `last_viewed_at` en `calc_progress_shares`.
  - Nuevo endpoint `GET /share-info?athlete_id&calculator&metric_label`: devuelve `{exists, share_id, views_count, first_viewed_at, last_viewed_at}` al coach autenticado.
- Frontend (`/app/frontend/src/components/AthleteProgress.js`):
  - `loadMeta()` también consulta `/share-info`; panel "Seguimiento del enlace" (data-testid=`share-stats`) muestra visitas, primera y última vista.
  - Helper `fmtDateTime` (locale es). Se refresca tras compartir.
- Verificado: testing agent iter72 (100%) + curl (views_count incrementa correctamente).

**Tarea 2: Cambio global de logo (P0) — DONE & TESTED**
- Nuevo logo: `Gemini_Generated_Image_ytyzipytyzipytyz-removebg-preview.png` (531x470, RGBA transparente).
- Reemplazados los assets de marca usados por `BrandLogo.js`: `/brand/lordtraining-scale.png` (icon/full) y `/brand/lordtraining-master.png` (shield).
- Regenerados favicons: favicon.ico (16/32/48/64), favicon-16/32/64.png, apple-touch-icon.png (180px).
- PDFs: se mantuvo SOLO el texto "LORDTRAINING" (decisión del usuario, sin imagen).
- Verificado: logo carga OK en Landing (nav-brand-logo), Auth (auth-brand-logo) y Dashboard (dashboard-brand-logo).

**Pendiente de usuario:** Hacer clic en **Deploy** para reflejar estos cambios (y los anteriores) en Producción.

## 2026-06-25 — Migración COMPLETA de PDFs a WeasyPrint (fix Producción)
- Causa raíz: Playwright/Chromium no existe en el contenedor de Producción → error 500. Funcionaba en Preview porque allí sí hay Chromium.
- Completada la migración que quedó a medias. Se eliminaron TODAS las referencias a Playwright en backend.
- Endpoints migrados a WeasyPrint (helper routes/pdf_render.py):
  - server.py: /api/sessions/download-pdf/{share_id} (ahora delega al builder de boards, HTML server-side) y /api/sessions/download-boards-pdf.
  - previous_analysis_export.py: _render_pdf (análisis del plan anterior, público + auth).
  - periodization_models.py: /api/periodization-library/pdi/whitepaper.
  - master_report.py: _capture_graphic_plan_on_demand desactivado (devuelve None; WeasyPrint no renderiza React).
- Validado vía curl en URL externa (todos 200 + %PDF-): session-pdf, boards-pdf, prev-analysis (pública 636KB + auth 653KB), PDI whitepaper (620KB), master-report generate (170KB) + preview PNG (155KB), active-plan (616KB).
- Pendiente de usuario: hacer clic en **Deploy** para llevar el fix a lordtraining.com.

## 2026-06-25 — FIX CRÍTICO: PDFs caían en PRODUCCIÓN (dependencias faltantes)
- CAUSA RAÍZ REAL: weasyprint y pdf2image se instalaron a mano en Preview pero NUNCA se agregaron a backend/requirements.txt. El build de Producción no los instalaba → ImportError → 500 en TODOS los PDFs. (El trabajo de Preview nunca se perdió.)
- FIX: agregados a requirements.txt: weasyprint==69.0, pdf2image==1.17.0, pydyf, tinycss2, cssselect2, pyphen, fonttools, cairocffi, tinyhtml5, Brotli, zopfli, webencodings. Verificado pip install -r limpio + render OK.
- deployment_agent: sin bloqueadores (compilation_passed). Añadido **/test_credentials.md a .gitignore.
- NOTA: WeasyPrint requiere libs nativas (libpango/cairo/poppler) en runtime; presentes en el entorno. Si tras redeploy aún fallara, sería por libs nativas del contenedor de deploy → escalar a soporte.
- ACCIÓN USUARIO: REDEPLOY obligatorio para llevar el fix de requirements.txt a producción.

## 2026-06-25 — Logo PDFs (busto) + diagnóstico Reporte Maestro prod
- Logo en PDFs: el usuario veía la "escama de dragón" (figura dorada con brazos+LORD). Reemplazados lordtraining-scale.png, lordtraining-icon-pdf.png, lordtraining-master.png por el busto dorado limpio transparente (500x500, RGBA) que adjuntó el usuario. Verificado visualmente en cover del Reporte Maestro: aparece el busto + "LORDTRAINING". Backend reiniciado para limpiar cache de sessions_export.
- Reporte Maestro: FUNCIONA en Preview (200, 170KB, 1.1s). El fallo "Cloudflare could not parse / empty response" es EXCLUSIVO de PRODUCCIÓN → requiere REDEPLOY (incluye fix de requirements.txt weasyprint). Si persiste tras redeploy = libs nativas del contenedor de deploy → soporte.
- ACCIÓN USUARIO: REDEPLOY para llevar a prod (a) requirements.txt con weasyprint, (b) nuevo logo busto en PDFs, (c) favicon ?v=2.

## 2026-06-25 — Wordmark PDFs: escama→busto + legibilidad
- CAUSA: lordtraining-full-pdf.png (wordmark usado en header de info_catalog, previous_analysis, active_plan, evaluations) contenía el ESCUDO ESCAMA + texto "Lord" oscuro → ilegible sobre el header navy oscuro (.hero #0b1020→#1e293b).
- FIX: regenerado lordtraining-full-pdf.png (3200x720 transparente, PIL): busto dorado + "Lord" blanco + "Training" lima (#CCFF00) → legible sobre fondo oscuro. Verificado en header del Catálogo (busto + LordTraining legible, sin escama).
- También ya reemplazados antes: lordtraining-icon-pdf.png, lordtraining-scale.png, lordtraining-master.png = busto limpio.
- COBERTURA: todos los generadores PDF (catalog, prev-analysis, active-plan, evaluations, PDI whitepaper, master-report, sessions/boards) usan busto + wordmark legible. server.py session/boards PDFs usan texto HTML (ya legible).
- ACCIÓN USUARIO: REDEPLOY para llevar todo a producción.

## 2026-06-25 — Logo "LORD figura" en Login
- AuthPage.js: logo del login cambiado a /brand/lordtraining-login-figure.png (figura dorada "LORD corriendo", transparente, subida por usuario), tamaño aumentado a h-[230px]. Solo aplica al login.
- ACCIÓN USUARIO: REDEPLOY para llevar a producción.

## 2026-06-25 — Gestor de Marca (Super Admin) — NUEVA FEATURE
- Backend: routes/branding.py (Object Storage Emergent). Endpoints: POST /api/branding/upload (form category+file, solo super_admin), GET /api/branding/list, POST /api/branding/{id}/activate, DELETE /api/branding/{id} (soft-delete), GET /api/branding/active (PUBLICO), GET /api/branding/file/{id} (PUBLICO, sirve bytes + cache). Colección branding_assets. Máx 5/categoría, 3MB, PNG/JPG/WEBP/ICO/SVG. Primera imagen de cada categoría se activa automáticamente; al eliminar la activa se promueve la más reciente.
- Frontend: components/BrandingManager.js + tab 'Marca / Logos' en SuperAdminPage (/admin/super). utils/branding.js (fetchActiveBranding + applyFavicon dinámico). AuthPage (logo login), LandingPage (logo hero) y App.js (favicon) ahora usan el logo activo con fallback a los estáticos.
- Categorías: Favicon, Logo Landing, Logo Login. Global para toda la plataforma.
- Testeado E2E (iteration_73.json): 7/7 PASS, sin issues. Imágenes de prueba limpiadas de la BD.
- ACCIÓN USUARIO: REDEPLOY para producción.

## 2026-06-25 — Panel de Control conectado a datos REALES (antes mock)
- ControlPanel.js: eliminados los datos mock (calendario con Math.random, zonas/competencias/récords/capacidades hardcodeados).
- Calendario de Sesiones: ahora usa sesiones REALES del plan activo (usePlanStore → /api/v2/planes/{id}/completo), estado real Completada/Programada/Perdida por fecha, navegación de mes, salto automático al primer mes con sesiones, punto de color por capacidad, y CLICK en un día abre modal de detalle con contexto de periodización (Macro/Meso/Microciclo, duración, RPE, capacidad, notas) + botón a Periodización.
- "Zonas de Entrenamiento" → reemplazado por "Distribución por Capacidad" (real, suma duración por capacidad del mes visible).
- Próximas Competencias → /api/plan-data/competitions/{plan_id} (real, ordenadas por días restantes).
- Récords Personales → /api/plan-data/previous-analysis (indicadores reales).
- Capacidades (radar) → /api/plan-data/evaluations/{plan_id}/physical (real).
- Estados vacíos en todas cuando no hay datos.
- BUG corregido: loop de re-fetch (plan.id del store es id v2 resuelto ≠ activePlan.id) → ahora con useRef.
- NOTA datos preview: las sesiones no tienen fecha asignada y evaluaciones/récords/competencias están vacías → el panel muestra estados vacíos (comportamiento correcto). Al programar sesiones (asignar fecha) y llenar esos datos, el panel se puebla automáticamente.
- PENDIENTE (no solicitado aún): "Progreso de Objetivos" y "Comparativa Semanal" siguen siendo mock.
- Testeado: render OK sin errores (iteration_74 detectó datos vacíos por falta de fechas, confirmado como esperado).

## 2026-06-25 — Panel: "Progreso de Objetivos" y "Comparativa Semanal" → datos reales
- "Progreso de Objetivos" → reemplazado por "Objetivos del Plan" (real): lista objetivos desde /api/plan-data/objectives (main, corto/mediano/largo plazo, porAspecto con objetivo+indicador, secundarios). Estado vacío cuando no hay. (No hay % de progreso real en el modelo, por eso es lista de objetivos en vez de barras inventadas.)
- "Comparativa Semanal" → cálculo REAL desde sesiones con fecha: esta semana (Lun-Dom) vs semana anterior. Métricas: Sesiones, Tiempo Total (h), Volumen (min), RPE Promedio. Estado vacío si no hay sesiones con fecha en ninguna de las 2 semanas.
- Compila OK, render verificado (estados vacíos correctos con datos preview).
- Ya NO queda dato mock en ControlPanel salvo widgets superiores derivados de panelStats real (donut fases, carga, readiness).

## 2026-06-25 — Navegación rápida desde el Panel a Periodización
- ControlPanel: click en un objetivo (tarjeta Objetivos del Plan) → onNavigate('datos','objectives'). Objetivos ahora son botones con icono ArrowUpRight en hover.
- Click en "Ver/editar en Periodización" del modal de detalle de sesión → onNavigate('datos','period-structure') (PeriodizationComplete). Reemplazó el CustomEvent que no tenía listener.
- Usa el mecanismo onNavigate/handleNavigateFromPanel ya existente en DashboardPage. Compila OK.

## 2026-06-25 — Deep-link sesión→Periodización + Páginas Legales
- DEEP-LINK: ControlPanel pasa onNavigate('datos','period-structure',{week,date,sessionName}). DashboardPage guarda periodizationFocus y lo pasa como focusTarget a PeriodizationComplete. Efecto en PeriodizationComplete: aplana micros, ubica por semana (o fecha), expande macro/meso/micro, scrollIntoView + resaltado (ring azul 3.5s) en data-testid=microcycle-{key}. Null-safe. NOTA: no testeable en preview (sesiones sin fecha); funcionará cuando las sesiones tengan fecha.
- PÁGINAS LEGALES: nuevo /pages/LegalPage.js bilingüe (ES/EN según i18n) con 3 docs: Términos, Privacidad, Políticas (pestañas). Menciona Hotmart (pagos) e IA/GPT. Contacto: juegolaureado@gmail.com. Marca genérica 'LordTraining'.
  Rutas en App.js: /terminos /privacidad /politicas (+ /terms /privacy /policies). Enlaces en footer de Landing y footer del Login. Verificado visualmente.
- ACCIÓN USUARIO: REDEPLOY.

## 2026-06-25 — Mejora UX barra de navegación (Dashboard)
- Problema: estado activo poco claro + demasiados círculos de colores juntos (confusión). Diseño vía design_agent (/app/design_guidelines.json).
- Implementado patrón "neutralizar inactivos / enfatizar activo" (bajo riesgo, sin cambiar layout):
  - Inactivos: círculo blanco neutro + icono/label gris (antes todos con color → "arcoíris").
  - Activo: relleno de color + ring-2 ring-offset-2 + scale-110 + label en negrita con color de sección.
  - Aplicado a los 3 grupos: Nav principal (Panel/Datos/Scouting/Reporte/Sesiones), Secciones (7) y Sub-secciones.
  - Etiquetas: de text-[8px] → text-[10px] en todo el header (legibilidad).
- Verificado visualmente: activos (Datos azul, Diagnóstico/Plan Anterior rojo) resaltan claramente sobre los neutros.
- OPCIÓN FUTURA (no implementada): rediseño mayor a Topbar + Sidebar lateral con acordeón (blueprint en design_guidelines.json) si se quiere separación total de jerarquía.
- ACCIÓN USUARIO: REDEPLOY.

## 2026-06-25 — Ajuste barra nav: revertir tamaño, mejorar solo con color/Material
- A pedido del usuario: el aumento de tamaño (text-[10px], scale-110, ring-offset, max-w-[60px]) descuadraba el contenido inferior. Revertido a tamaños originales (w-10 h-10, text-[8px], max-w-[56px], sin scale).
- Mejora conservada solo vía COLOR + Material Design (sin cambiar tamaño): activo = relleno color + shadow-lg + ring-2 ring-white/40 (halo, box-shadow sin impacto en layout); inactivo = blanco neutro + shadow-sm + hover:bg-slate-50 (state layer) + hover:shadow-md. Aplicado a los 3 grupos.
- Verificado: barra compacta como antes, contenido inferior bien alineado, estados activos claros.
- ACCIÓN USUARIO: REDEPLOY.

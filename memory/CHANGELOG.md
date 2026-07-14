# CHANGELOG — LordTraining

## 2026-06 — Fix texto de tarjeta de scouting + Video configurable en Landing
- **Bug (Producción)**: el texto de la carta descargable (`_build_social_card`) salía diminuto/oscuro. Causa raíz: el contenedor de Producción no tiene las fuentes Liberation del sistema, así que Pillow caía a `load_default()` (bitmap ~10px). Preview sí las tenía, por eso allí se veía bien.
- **Fix**: fuentes empaquetadas en el repo `/app/backend/assets/fonts/` (LiberationSans Bold/Regular/Narrow-Bold) + `_resolve_font()` con respaldos + `font()` usa `load_default(size)` (Pillow 12) si falla. Ahora el texto se ve igual en preview y producción (tras redeploy).
- **Tarjeta premium**: brillo radial dorado tras el score, destellos diagonales y marco coleccionable con esquinas.
- **Botones en modal Cantera**: "Descargar carta" (PNG) y "Compartir" (Web Share API + fallback copiar enlace card-page OG).
- **Video de Scouting en Landing (nuevo)**: `landing_settings.py` → GET/PUT `/api/landing/scouting-media` (PUT solo super admin). Editor en Panel Super Admin (`LandingAppearance.jsx` → `ScoutingVideoEditor`). Landing (`LandingPage.js` → `ScoutingMedia`) reproduce YouTube o MP4 en autoplay silenciado + loop con botón de sonido; respaldo a la imagen si no hay video configurado.


## 2026-06 — Fix: etapas del Plan Gráfico acordes al modelo de periodización
- **Bug reportado**: en "Plan Gráfico de Periodización" la fila "Etapa" mostraba "Trans" en casi todas las semanas y "Tipo de etapa" "Prepar" en todas, sin respetar el modelo (Tradicional/Matveiev, ATR, etc.).
- **Causa raíz** (`GraphicPlan.js` → `importPeriodizationData`): (1) leía `micro.weekNumber` cuando el backend devuelve `week_number` (semana quedaba `undefined`); (2) solo procesaba `macrocycles[0]`; (3) su `phaseMapping` local no reconocía el vocabulario real de los modelos (`prep_general`, `accumulation`, `transformation`, `realization`, `recovery`, `block_*`, etc.), cayendo todo a `preparatory_general`/`transicion`.
- **Fix**: nuevo clasificador compartido `/app/frontend/src/lib/periodizationStages.js` (`classifyStage`, `normalizeMesoType`, `normalizeMicroType`) que mapea el vocabulario de TODOS los modelos (Tradicional, ATR, Bloques, Ondulatorio, Conjugado, Trifásico + fallback por palabra clave y por `meso_type`) a las etapas canónicas. `importPeriodizationData` ahora recorre todos los macrociclos, usa `week_number` y delega en `classifyStage`; la ruta de sync V2 también usa `classifyStage`.
- **Verificado E2E** (iteration_121, 100%): plan ATR 47 sem → Etapa Prep(1-36)/Comp(37-44)/Trans(45-47), coherente con el modelo.


## 2026-07-12 — Centro de notificaciones unificado + preferencias + ACWR integrado
- **Centro de notificaciones** (`NotificationCenter.jsx`, portal a `document.body`): historial filtrable por tipo (Todas/Contactos/Resumen/Promover/Nivel/Salud), marcar leído/eliminar/marcar todo. Se abre desde "Ver todo" en la campanita.
- **Preferencias por tipo** (activar/silenciar): `GET/PUT /notifications/preferences` + colección `notification_prefs`. `create_notification` respeta las preferencias (verificado: un tipo silenciado NO genera notificación). Panel de switches dentro del Centro.
- **Alertas ACWR de salud unificadas**: `POST /notifications/sync-health` persiste las alertas de `coach_metrics._build_alerts` como notificaciones `health_alert` (dedupe 20h), respetando la preferencia. Se dispara al montar la campanita. Se **eliminó la campanita ACWR independiente** del header; su acceso al **resumen semanal del coach** se movió a la campanita unificada ("Resumen semanal").
- **GET /notifications** ahora soporta `?type=` y `?limit=`; `unread` cuenta global de no leídos.
- **Verificado**: curl (prefs get/put + silenciado efectivo, sync-health, filtro por tipo) + capturas (Centro con preferencias, filtros y los 3 tipos de notificación; campanita con badge y footer "Resumen semanal / Ver todo").


## 2026-07-12 — Avisos accionables de reclutamiento + sonido/efecto al llegar un lead
- **Avisos accionables** (`POST /recruiting/notify-digest`, máx 1/día, idempotente): detecta prospectos **listos para promover a atleta** (score ORO≥75, no convertidos, stage≠decision/rejected) y **subidas de nivel** comparando `level_snapshot` por prospecto contra el nivel actual (DIAMANTE>ORO>PLATA>BRONCE>EN DESARROLLO). Genera notificaciones `recruiting_promote` y `recruiting_levelup`. Primera ejecución solo fija baselines (sin falsos positivos).
- **Campanita mejorada** (`NotificationsBell.jsx`): iconos/colores por tipo (Rocket=promover, Award=nivel, Mail=lead, TrendingUp=resumen), navegación al tab correcto de Scouting (`scouting:ranking`/`showcase`), y dispara `notify-digest` + `weekly-digest` al montar.
- **Sonido + efecto sutil al llegar un lead nuevo**: al detectar una notificación `showcase_lead` nueva en el polling (60s), reproduce un "ding" de dos tonos (Web Audio API, sin assets) y anima la campanita (`animate-bounce`). La primera carga fija baseline sin sonar.
- **Verificado**: curl (notify-digest crea promote+levelup con escenario simulado; idempotencia <1 día) + captura (campanita con "Subida de nivel a ORO", "Talento listo para promover" y "Nuevo contacto").


## 2026-07-12 — Notificaciones in-app (campanita) + resumen semanal de la vitrina
- **Nuevo módulo de notificaciones** (`routes/notifications.py`, registrado en `server.py`): colección `notifications`, helper `create_notification()`, endpoints `GET /notifications` (items+unread), `POST /{id}/read`, `POST /read-all`, `DELETE /{id}`.
- **Aviso in-app al llegar un lead**: `POST /public/showcase/{id}/contact` crea una notificación `showcase_lead` (además del email). Más directo y sin la limitación de dominios de Resend.
- **Resumen semanal**: `POST /recruiting/showcase/weekly-digest` (auth) genera —si han pasado ≥7 días y hay actividad— una notificación `showcase_weekly` tipo "Tu vitrina esta semana: X visitas, Y contactos, top talento Z" (usa snapshot `weekly_views_snapshot` + `last_weekly_summary` en settings; idempotente por semana).
- **Campanita "Avisos"** (`NotificationsBell.jsx`) en el header del Dashboard: badge de no leídos, dropdown con íconos por tipo, marcar leído/eliminar/marcar todo, polling 60s, dispara el weekly-digest al montar y navega a Scouting → Vitrina al hacer clic.
- **Verificado**: curl (crear lead→notif, weekly-digest crea/no duplica, read/read-all/delete) + captura (campanita con resumen semanal "3 visitas y 4 contactos, top Test Prospect" y "Nuevo contacto: Agencia Pro").


## 2026-07-12 — Vitrina "Cantera": notificación por email (Resend) + panel de métricas
- **Email al coach por cada contacto nuevo** (Resend): plantilla HTML de marca `render/send_showcase_lead_notification` en `email_service.py`; se dispara (no bloqueante, `asyncio.create_task`) desde `POST /public/showcase/{id}/contact`. Se configuró `RESEND_API_KEY` en `backend/.env`. **Verificado envío real** (Resend id devuelto). Limitación: con remitente `onboarding@resend.dev` solo entrega al correo dueño de la cuenta Resend; para otros coaches se requiere dominio verificado + cambiar `SENDER_EMAIL`.
- **Panel de métricas de la vitrina**: `GET /showcase/metrics` (visitas, contactos, sin leer, contactos por atleta) y `POST /public/showcase/{id}/visit` (contador de visitas, `showcase_views` en settings, se dispara al cargar `/cantera/{id}`). UI en la pestaña Vitrina: strip de 3 métricas + "Contactos por atleta" con barras. Métricas se refrescan al marcar leído/eliminar.
- **Verificado**: curl (visit/metrics), envío real de email (Resend), y captura de la pestaña Vitrina (3 visitas · 2 contactos · 2 sin leer · Test Prospect 2 contactos).


## 2026-07-12 — Vitrina "Cantera": vista previa Open Graph + formulario de contacto (leads)
- **Portada Open Graph** (`recruiting.py`): `_build_showcase_cover` (Pillow, 1200x630) con logo, "TOP TALENTOS", título, entidad, lema y marca. Endpoints `GET /public/showcase/{id}/cover` (PNG) y `GET /public/showcase/{id}/share` (HTML con meta OG/Twitter + redirect a `/cantera/{id}`). El enlace que copia el coach ahora es el `/share` (muestra portada al pegarlo en WhatsApp/redes); el botón "abrir" lleva a `/cantera/{id}`.
- **Formulario de contacto por atleta** en la vitrina pública (`PublicShowcase.js`): agencias/universidades escriben directo (nombre, organización, email, mensaje) → `POST /public/showcase/{id}/contact`. Anti-spam con honeypot + validación de email.
- **Bandeja de mensajes (leads)** en la pestaña Vitrina (`ShowcaseManager`): lista con no leídos, Responder (mailto), marcar leído y eliminar. Endpoints `GET /showcase/leads`, `POST /leads/{id}/read`, `DELETE /leads/{id}`. Colección `recruiting_leads`.
- **Seguridad**: `_abs_url` valida el parámetro `b=` contra el host de la petición (evita que `og:image` apunte a dominios externos). Aplica también a la card-page de prospectos.
- **Verificado (testing agent, iteración 120)**: 19/19 backend + 100% frontend PASS, flujo E2E (enviar desde vitrina → aparece en bandeja del coach) OK. Sin issues bloqueantes.


## 2026-07-11 — Vitrina pública "Cantera" (Top Talentos de la academia)
- **Página pública compartible SIN cuenta** (`/cantera/{showcase_id}`, `PublicShowcase.js`): vitrina de marca con logo/lema/color del coach, tarjetas de talento (medalla de ranking, Score, nivel, club, nº de videos) y **modal por atleta** con caracterización completa: mejores métricas, fortalezas de la IA, logros, **videos públicos** (VideoGallery) y botón "Ver ficha completa".
- **Selección híbrida**: automático por Score de evaluación (solo prospectos con enlace público activo), con opción de **ocultar** y **fijar** talentos.
- **Backend** (`recruiting.py`): `showcase_*` en `recruiting_settings`; endpoints `GET/POST /showcase-settings`, `POST /showcase/prospect/{pid}` (hidden/pinned), `GET /public/showcase/{id}` (branding + athletes con `_showcase_athlete`), `GET /public/showcase/{id}/logo`.
- **Gestión del coach**: nueva pestaña **"Vitrina"** en Scouting (`ShowcaseManager`): switch activar, título, enlace público (copiar/abrir) y lista de talentos con pin/ocultar. La marca (entidad, logo, lema, color) se configura desde el diálogo de Compartir de cualquier prospecto.
- **Verificado (testing agent, iteración 119)**: 16/16 backend + 100% frontend PASS, sin issues.
- Nota P2 (deuda técnica): `recruiting.py` >1900 líneas → dividir en submódulos (showcase/share/estadísticas/PDF).


## 2026-07-11 — Scouting: QR descargable del enlace + badge de tendencia (🔥 7 días)
- **QR del enlace de la tarjeta** (`recruiting.py`): nuevo `GET /qr?data=&color=&auth=` (auth por header o `?auth=` para `<img>`) genera un PNG del QR (qrcode, corrección H) con el color de acento. Frontend (`ScoutingModule.js`): en "Enlace de la tarjeta" se muestra el QR + botón **Descargar QR** (`card-qr-img`, `card-qr-download-btn`). Descargar QR cuenta como compartido.
- **Tendencia últimos 7 días**: nueva colección `recruiting_share_events` (se registra cada download/share/view con `tsx` epoch). `share-ranking` calcula `recent7`/`prev7` y `trending` (recent7≥2 y ≥ prev7). El leaderboard `SharedTalentsBoard` muestra un badge **🔥 +N** (`trend-badge-{id}`) para talentos en alza.
- **Verificado**: curl (QR 200 con auth / 401 sin auth; ranking con `recent7`/`trending`) + captura (badge 🔥 +3 en leaderboard y QR en el diálogo).


## 2026-07-11 — Scouting: enlace de tarjeta con Open Graph + contadores + leaderboard "Talentos más compartidos"
- **Enlace público de la tarjeta con vista previa (OG)** (`recruiting.py`): `GET /public/{share_id}/card` (PNG sin auth) y `GET /public/{share_id}/card-page` (HTML con meta Open Graph/Twitter → al pegar en WhatsApp/Facebook muestra la tarjeta). `_abs_url` honra `?b=` (base pública) para el patrón de ingress k8s. Filtro de bots (`_BOT_UA`) evita contar vistas de crawlers.
- **Contadores separados por prospecto**: `share_stats {downloads, shares, views}` en el doc; `POST /prospects/{pid}/track {action}` incrementa vía `$inc`. `ProspectOut` ahora expone `share_stats`.
- **Ranking `GET /share-ranking`**: top talentos por total (downloads+shares) con desglose y `views`.
- **Frontend (`ScoutingModule.js`)**: en el diálogo de compartir → sección "Enlace de la tarjeta" (copiar/abrir) + grid de contadores (descargas/compartidos/vistas). Los botones de descarga y compartir (WhatsApp/Facebook/nativo/copiar enlace) registran `track`. WhatsApp/Facebook ahora comparten el enlace de la tarjeta (con OG). Nuevo componente exportado `SharedTalentsBoard`.
- **Leaderboard "Talentos más compartidos"** en dos lugares: pestaña **Ranking** del módulo Scouting y **widget en el Panel de Control** (`ControlPanel.js`, tras el ranking de atletas).
- **Verificado (testing agent, iteración 118)**: 16/16 backend + 100% frontend PASS. Sin issues bloqueantes. Notas menores no bloqueantes: el widget no auto-refresca hasta re-montar; `share-ranking` incluye filas con solo vistas.


## 2026-07-11 — Tarjeta de Redes (Scouting): recorte facial + layout adaptativo + compartir nativo
- **Recorte facial inteligente (`recruiting.py`)**: nuevo `_detect_face_box()` (OpenCV haarcascade en `/app/backend/assets/haarcascade_frontalface_default.xml`) + `_smart_photo_fit()`. Encuadra el rostro al ~42% desde arriba para NO cortar la cabeza; fallback a encuadre superior seguro si no detecta rostro. Se instaló `opencv-python-headless` (en requirements.txt).
- **Layout adaptativo (`_build_social_card`)**: espaciado y fuentes del bloque inferior se escalan dinámicamente (`gs` según espacio disponible) para llenar el formato **Story (9:16)** sin dejar hueco y sin desbordar en **Post (4:5)**. Foto más alta en Story (0.52·H). Título "SCOUTING REPORT" reforzado.
- **Compartir directo nativo (`ScoutingModule.js`)**: nueva sección `native-share-wrap` en el diálogo de compartir con Web Share API (`navigator.share` con imagen adjunta → WhatsApp/IG/TikTok en móvil, con fallback a descarga en desktop), y botones directos de **WhatsApp** (wa.me + enlace público), **Facebook** (sharer), **Instagram** (descarga + aviso). Los botones de descarga ahora usan icono Download.
- **Verificado (testing agent, iteración 117)**: 11/11 backend + 10/10 frontend PASS, sin issues. `POST/GET social-card` OK en post/story, con/sin foto y con/sin evaluación; toggle Post/Story actualiza el preview.


## 2026-07-10 — Fix login (título + pizarra) + Badge de nivel en portal atleta y PDF
- **Login (`AuthPage.js`)**: (1) el título con efecto máquina-de-escribir que se cortaba/desaparecía → ahora **estático** (`t('auth.visual.phrase1')`, sin cursor ni nowrap). (2) La pizarra de preview tenía fondo **marrón** (`#1c160b`, resultado de mapear el verde) → corregido a **grafito chalkboard `#171d24`** con líneas de tiza. Verificado por screenshot.
- **Badge de nivel (medallas) en PDF de evaluación (`evaluations_export.py`)**: nuevo `_level_badge_html(score)` (umbrales 90/75/60/40 = Diamante/Oro/Plata/Bronce/En desarrollo, gradiente metálico inline) inyectado en la tarjeta "Promedio Global Normalizado" cuando hay medidas.
- **Badge en portal del atleta**: `GET /me/records` (`athlete_portal.py`) ahora calcula y devuelve `evaluation_score` (promedio de aspectos normalizados 0-100 de `plan_evaluations_v2`); `AthletePortalPanel.js` muestra `<LevelBadge>` en el header. Backend arranca OK, frontend compila, umbrales verificados por unit test.
- NOTA: verificación E2E completa del badge en portal (requiere login de atleta) y en PDF (requiere descargar un reporte) queda pendiente de validación del usuario / testing agent.

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

## 2026-07-14 — Fixes UI (idioma/login/YouTube) + Sección Legal en Scouting
- LanguageSelector: labels corregidos ("Español" con ñ, "Português", "Français"); dropdown oscuro → zinc-900, punto de idioma activo dorado (#D4AF37) en vez de azul.
- AuthPage (Login): removidos overlays estadísticos del panel derecho (HUD Readiness/ACWR/Adherencia, header "Semana/Fase Live", bench bar y stats). Ahora solo se muestra la pizarra táctica rotando (6 deportes), campo agrandado (top/bottom 8%).
- Landing ScoutingMedia: miniatura de YouTube ahora se deriva del ID (maxresdefault) con fallback en cadena maxres → hqdefault → imagen por defecto (onError).
- NUEVA Sección Legal en Scouting (contratos/transferencias/PDFs):
  - Backend recruiting.py: colección recruiting_legal_docs + endpoints POST/GET/DELETE /api/recruiting/legal-docs. PDFs en Object Storage (Emergent). Descarga vía /api/recruiting/files/{path}?auth=. Tipos: contrato, transferencia, cesion, autorizacion_menores, consentimiento_informado, certificado_medico, cesion_derechos_imagen, otros.
  - Frontend ScoutingLegal.js (reutilizable, prop scopeProspectId): tab "Legal" a nivel módulo (repositorio general + por prospecto) y tab "Legal" dentro del detalle del prospecto (asociación fija).
- Testing: backend validado con curl (upload/list/download/delete OK); frontend E2E testing_agent 100% (iteration_122.json).
- ACCIÓN USUARIO: REDEPLOY para reflejar en Producción.

## 2026-07-14 (b) — Alertas de vencimiento legal + limpieza de Landing
- Legal: campo opcional "Fecha de vencimiento" en cada documento (upload + edición inline con PATCH /api/recruiting/legal-docs/{id}). Badge de estado en la lista (Vencido / Vence hoy / Vence en Nd).
- Centro de Notificaciones: nuevo tipo "legal_expiry". Endpoint POST /api/recruiting/legal/sync-expiry escanea documentos con vencimiento ≤30 días o vencidos y crea notificaciones (dedupe 20h, link scouting:legal). Se dispara desde NotificationsBell junto a sync-health. Íconos/estilos añadidos en NotificationsBell.jsx y NotificationCenter.jsx (CalendarClock, naranja).
- Verificado backend con curl: upload+expiry, sync-expiry ("vence en 10 días"), PATCH limpia fecha, delete OK.
- Landing Page: eliminados los "eyebrows" dorados que repetían el título en Scouting, Video Tutoriales, Pizarra Multi-Deporte, Funcionalidades, Audiencias, Cómo funciona, Confianza (testimonios) y Precios → ahora un solo título por sección. Reducido el padding vertical de secciones (py-14/16/20/24 → py-10/12/14) y márgenes internos → menos espacio en blanco. Verificado con screenshots.
- ACCIÓN USUARIO: REDEPLOY para reflejar en Producción.

## 2026-07-14 (c) — Barra superior del Dashboard + Panel resumen Legal
- Barra superior (Modo Clásico) reordenada: Cambio de Modo, Avisos, Demo, Admin, Plan, Tutoriales, Coach AI, Idiomas, Salir. Los botones flotantes de Tutoriales y Coach AI se movieron a la barra (HelpTutorialButton ahora soporta variant="topbar"; el flotante de Tutoriales queda solo en Modo Pro; se eliminó el FAB flotante de Coach AI en Clásico).
- Sección Legal (vista de módulo): nuevo panel resumen con 3 tarjetas (Documentos, Por vencer ≤30 días, Vencidos) + filtros por tipo de documento y por prospecto (incl. Repositorio general). Estado vacío diferenciado para filtros sin resultados.
- Verificado con screenshots (barra + pestaña Legal renderizan correctamente).
- ACCIÓN USUARIO: REDEPLOY para reflejar en Producción.

## 2026-07-14 (d) — Barra Modo Clásico con acento oscuro uniforme + tarjetas Legal accionables
- Modo Clásico: TODOS los botones de la barra (navegación izquierda + acciones derecha) ahora usan fondo oscuro uniforme (#0A0F1E) con ícono en color de acento. El botón activo se diferencia con anillo (ring-2) del color del módulo + punto de color arriba a la derecha. Afecta: Panel, Datos, Planes, Scouting, Reporte, Sesiones, secciones/sub-secciones de Datos, Avisos (NotificationsBell), Demo, Admin, Plan, Tutoriales, Coach AI, Idiomas (LanguageSelector fabStyle), Salir y ThemeToggle. El Modo Pro no se tocó.
- Panel resumen Legal: las tarjetas "Por vencer (≤30 días)" y "Vencidos" ahora son clicables → filtran la lista al instante (toggle on/off) con resaltado (anillo del color). "Documentos" limpia el filtro de vencimiento. Nuevo filterExpiry integrado con los filtros de tipo/prospecto y botón Limpiar.
- Verificado con screenshot (barra uniforme, activo con anillo/punto). ACCIÓN USUARIO: REDEPLOY para Producción.

## 2026-07-14 (e) — Fix Tutoriales + limpieza video landing + Plan Gráfico (undo/redo, alertas, footer)
- BUGFIX Tutoriales: el drawer no se veía en el Dashboard (el botón quedó dentro del header con blur/transform que confinaba el position:fixed). Solución: renderizar el drawer con createPortal a document.body (z-[9999]). Verificado: abre sobre todo el dashboard.
- Landing: eliminado el badge flotante "Análisis objetivo / Decisiones basadas en datos" sobre el video de Scouting (se mantiene el stat −42%).
- Plan Gráfico (GraphicPlan.js):
  - Botones Deshacer/Rehacer (undo/redo) en la barra superior. Historial basado en snapshots de planData (useRef past/future + effect con flag restoring, máx 60). Permite recuperarse tras usar "Ajustar" u otros cambios.
  - Botón X para ocultar la alerta "Cargas por encima del nivel" (state levelWarningDismissed). Verificado: oculta el banner.
  - Barra de navegación inferior (horizonte + presets 12s/24s/36s/52s + "S1—Sx de N") ahora se oculta en planes cortos (totalWeeks <= 12) donde no aporta; sigue visible en planes largos (verificado con plan de 26 sem).
- Verificado con screenshots. ACCIÓN USUARIO: REDEPLOY para Producción.

## 2026-07-14 (f) — Tutoriales en el sidebar del Modo Pro
- HelpTutorialButton: nueva variante 'sidebar' (fila de navegación con ícono+label y badge de no vistos, soporta collapsed).
- Modo Pro (WhatsAppShell): el botón de Tutoriales se movió del flotante inferior al sidebar (sección HERRAMIENTAS), pasando tutorialCategory vía ctx. Se eliminó el botón flotante en Modo Pro.
- Verificado con screenshot: aparece en el sidebar y abre el drawer (portal) sobre toda la pantalla.
- ACCIÓN USUARIO: REDEPLOY para Producción.

## 2026-07-14 (g) — Suavizado del contraste de botones de la barra
- El relleno de los botones de la barra (Modo Clásico) pasó de negro puro (#0A0F1E) a un slate oscuro más suave (#252E3E) para reducir el contraste duro sobre el header blanco, manteniendo el look uniforme y el estado activo con anillo/punto. Aplicado también en NotificationsBell, ThemeToggle, LanguageSelector (fabStyle) y HelpTutorialButton (topbar).
- Verificado con screenshot. ACCIÓN USUARIO: REDEPLOY para Producción.

## 2026-07-14 (h) — Galería de pizarras unificada (tablero verde estático)
- Sección "Pizarra Multi-Deporte" de la landing: todas las tarjetas ahora comparten el mismo formato de tablero verde tipo pizarra táctica.
- Se quitó el movimiento (animaciones anim-ball/arrow/player/pulse) y el badge "LIVE"; los SVG de cancha se limpian con chalkCourt() (quita defs/gradiente/fondo y clases de animación) dejando solo líneas de tiza blanca + marcadores estáticos sobre fondo verde (BOARD_BG con textura de rejilla).
- Los 22 deportes "extra" (antes círculos con inicial + badge 3D) ahora usan una cancha genérica (GENERIC_COURT) en el mismo tablero verde, para formato 100% consistente.
- Verificado con screenshot. ACCIÓN USUARIO: REDEPLOY para Producción.

## 2026-07-14 (i) — Pulido del hero de la landing + limpieza video Scouting
- Video Scouting: eliminado el badge "−42% / sesgo en evaluación" (video 100% limpio).
- Hero: halo dorado más amplio/cálido + sombra de pedestal (keyframe pedestalShadow) para aterrizar el busto; busto un poco más grande (lg h-320); columna izquierda más compacta (gap-7→gap-5) para reducir espacio vacío.
- Gráfico hero (Periodización ATR): datos de vol/int/den reajustados para contar la historia del macrociclo (volumen ↓ con descargas, intensidad ↑, pico y taper final).
- Verificado con screenshot. ACCIÓN USUARIO: REDEPLOY para Producción.

## 2026-07-14 (j) — Canchas reales (solo terreno) en la galería de la landing
- Se reemplazaron los SVG con jugadores/jugadas y las tarjetas genéricas por plantillas de CANCHA REAL por tipo de deporte (solo líneas del terreno, sin jugadores ni flechas) → look profesional y uniforme.
- Nuevos helpers en LandingPage: COURTS (13 plantillas: field, rugby, basket, volley, racket, combat, lane, target, diamond, track, pool, golf, climb), SPORT_TYPE (mapa deporte→tipo), courtFor() y SPORTS_LIST (32 deportes). Render único con courtFor(name), preserveAspectRatio meet + padding.
- Verificado con screenshots (fútbol/baloncesto/voleibol/tenis/rugby/handball/futsal/pádel/bádminton/squash correctos). ACCIÓN USUARIO: REDEPLOY para Producción.

## 2026-07-14 (k) — Barra superior arrastrable + fix cancha baloncesto
- Barra superior del Dashboard (Modo Clásico): ahora se puede desplazar con clic sostenido y arrastre (drag-to-scroll) además del scroll nativo, con la barra de scroll oculta (scrollbar-hide) y cursor grab/grabbing. Implementado con contextBarRef + handlers de mouse (window listeners) y supresión de click tras arrastrar. Añadido useRef al import de React en DashboardPage.
- Cancha de Baloncesto (COURTS.basket en LandingPage): corregida la línea de 3 puntos (antes arcos incorrectos) por la geometría real (segmentos rectos desde línea de fondo + arco "bomba"), más zona pintada, círculos de tiro libre arriba/abajo, aro y tablero. Verificado con screenshot.
- Nota: el drag-to-scroll no se pudo reproducir con la herramienta de screenshot (fuerza viewport 1920px sin desbordar), pero el patrón es estándar y funcionará en pantallas reales pequeñas.
- ACCIÓN USUARIO: REDEPLOY para Producción.

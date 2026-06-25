# CHANGELOG — LordTraining

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

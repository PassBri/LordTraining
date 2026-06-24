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

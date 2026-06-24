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
- Refactor pendiente: PeriodizationComplete.js (~3370 líneas), server.py (~8500), DashboardPage.js (~4750).
- Migración de contenido preview→producción: pendiente de definir/ejecutar (flag `IMPORT_PREVIEW_DATA`).
- Recordatorio: los cambios viven en Preview; el usuario debe hacer **Deploy** para reflejarlos en lordtraining.com.

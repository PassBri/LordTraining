# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## [Jun 2026] FASE 4 + Onboarding + Recordatorio + Migración (COMPLETADO, 11/11 tests + E2E)
**Métricas avanzadas del coach** `routes/coach_metrics.py` → `GET /api/coach/metrics?plan_id=`:
- ACWR (carga aguda 7d / crónica 28d, carga = duración×RPE de sesiones completadas) con serie semanal + zona (bajo/óptimo/precaución/riesgo).
- Adherencia % por semana (completadas/vencidas) + global.
- `low_readiness_athletes`: atletas con readiness overall < 60 hoy.
- UI: `components/AdvancedMetrics.js` (LineChart ACWR + BarChart adherencia + tarjeta baja disponibilidad) insertado en ControlPanel.

**Onboarding self-service**: FAB "Demo" (siempre visible) en la barra superior del Dashboard (`demo-data-fab`) con menú "Cargar / Quitar datos de ejemplo" (llama seed/clear demo + recarga).

**Recordatorio del atleta**: banner in-app en `/atleta/panel` (Mi Plan) si hay sesión hoy (`athlete-today-reminder`, dismissible).

**Migración Preview→Producción** `routes/data_migration.py`:
- `GET /api/admin/export-data` → JSON con planes/sesiones/competencias/etc del coach.
- `POST /api/admin/import-data` → recrea en la cuenta actual; IDEMPOTENTE (por `id` o clave natural para colecciones sin id: plan_competitions/objectives/previous_analysis/evaluations); valida export_version.
- UI: sección "Migración de datos" en Super Admin → tab "Datos de Ejemplo" (`export-data-btn`, `import-data-btn`).

**Nota datos**: durante testing se duplicaron y luego se depuraron plan_competitions/objectives/previous_analysis/evaluations del coach (dedupe por clave natural).



## [Jun 2026] FASE 3 — Portal del Atleta (COMPLETADO, 21/21 tests + E2E)
**Backend** `/app/backend/routes/athlete_portal.py` (prefix `/api/athlete-portal`, auth bcrypt + JWT role 'athlete', registrado en server.py + crear_indices_portal en startup):
- PÚBLICO (sin login): `GET /public/{share_id}`, `POST /public/{share_id}/sessions/{session_id}` (marcar completada + rpe + comentario).
- COACH: `POST /share`, `GET /share/{plan_id}`, `POST /athletes/{id}/invite` (email+password temporal), `POST /invite-code` (auto-registro), `GET /athletes/{id}/account`, `GET /coach/readiness/{athlete_id}`.
- ATLETA AUTH: `POST /auth/login`, `POST /auth/register` (por código), `GET /auth/me`, `POST /auth/change-password`.
- ATLETA: `GET /me/plan`, `POST /me/sessions/{id}`, `POST|GET /me/readiness` (sueño/dolor/estrés/motivación → overall, upsert por día), `GET /me/records`.
- Modelo: campos nuevos en `athletes` (portal_email, portal_password, assigned_plan_id, must_change_password, portal_active); colecciones `athlete_portal_shares`, `athlete_invite_codes`, `athlete_readiness`.
- sesiones_v2: campos `rpe_reportado`, `comentario_atleta`, `fecha_completado` (se limpian al des-marcar).

**Frontend**:
- `pages/AthletePortalPublic.js` (ruta `/atleta/:shareId`), `pages/AthletePortalAuth.js` (`/atleta/login`, `/atleta/registro?code=`), `pages/AthletePortalPanel.js` (`/atleta/panel` con tabs Mi Plan / Mi estado / Récords).
- `components/athlete/AthletePlanView.js` (calendario navegable + modal RPE/comentario, compartido por público y panel).
- `services/athleteApi.js` (token separado `athlete_token` en localStorage).
- `components/AthletePortalShareModal.js` + botón "Atleta" en Dashboard → Datos → (plan) → sub-tab "Plan Activo" (genera enlace público, cuenta con password temporal, código de auto-registro; copiar/WhatsApp/Email).
- ControlPanel del coach: tarjeta "Readiness Score" alimentada por `coach/readiness/{athlete_id}` del atleta seleccionado.

**Regresiones corregidas**: (1) crash `Cannot read properties of null (completed_sessions)` en ControlPanel (null-safe en `stats?.`); (2) `GET /api/athletes` 500 → `AthleteResponse.age/level/created_at` ahora Optional + register inserta defaults.



## [Jun 2026] FASE 1 — Datos de Ejemplo / Onboarding (COMPLETADO)
**Problema raíz**: todas las `sesiones_v2` tenían `fecha: null` (nunca migrada de v1), por eso el Panel de Control se veía vacío (calendario, comparativa semanal, distribución por capacidad).

**Backend** `/app/backend/routes/demo_seed.py` (NUEVO, prefix `/api/admin`, registrado en server.py):
- `POST /api/admin/seed-demo-data` body `{plan_id?, all_plans}` — asigna fechas a sesiones del/los plan(es) V2 del coach ancladas a `fecha_inicio`, marca pasadas como completadas (~85% determinista por hash), agrega `capacidad_principal` rotativa, micro `fecha_inicio/fin`, y siembra 3 competencias + 1 evaluación física + 5 indicadores si faltan. Idempotente, todo marcado `demo_seeded:true`.
- `DELETE /api/admin/seed-demo-data` — revierte: limpia fechas/completado de sesiones demo y borra competencias/evaluaciones demo.
- Verificado E2E: seed 188 ses (64 compl), revert 3855/30/10, re-seed OK.

**Backend** `server.py` `/api/control-panel/stats`: cuando hay plan activo, ahora cuenta `total_sessions`/`completed_sessions` reales desde `sesiones_v2` del plan V2 (resuelto por `_v1_id`), `upcoming_events_count` desde `plan_competitions` futuras, y `completion_rate` = completadas/sesiones vencidas (adherencia realista, no sobre todo el plan futuro → 87.7%).

**Frontend**:
- `services/api.js`: `seedDemoData(planId)`, `clearDemoData()`.
- `components/DemoDataManager.js` (NUEVO): UI con botón "Sembrar datos de ejemplo" + "Revertir" + resumen de totales. data-testids: `demo-data-manager`, `seed-demo-data-btn`, `clear-demo-data-btn`, `seed-demo-result`.
- `pages/SuperAdminPage.js`: nuevo tab "Datos de Ejemplo" (icono Sparkles) → `<DemoDataManager />`.

**Producción**: la BD de producción es separada. Para poblar producción: hacer DEPLOY → entrar a Super Admin (`/admin/super`) → tab "Datos de Ejemplo" → "Sembrar datos de ejemplo". El plan activo se elige en el dashboard (persistido en `localStorage.train_active_plan_id`).

**Cambio de alcance FASE 2**: el usuario decidió NO usar WhatsApp/Twilio. En su lugar quiere un enlace público para enviar al atleta (ver FASE 3 - vista del atleta).



## [Feb 2026] Hotmart Payment Integration — FASE 1 (Code Ready, Awaiting Credentials)

**Backend** (NUEVOS):
- `services/hotmart_client.py` — HotConnect API client (OAuth2 client_credentials, cancel_subscription, get_subscription_summary)
- `services/hotmart_plans.py` — Plan slug ↔ Hotmart offer mapping via ENV vars (8 products: starter/basic/pro/enterprise × monthly/annual)
- `routes/hotmart_billing.py`:
  - `GET  /api/billing/hotmart/config` — público; expone qué tiers están configurados
  - `POST /api/billing/hotmart/checkout` — auth; devuelve URL Hotmart con `sck=user_<id>|<tier>_<cycle>` para correlación
  - `GET  /api/billing/hotmart/subscription` — auth; devuelve subscription doc del usuario
  - `POST /api/billing/hotmart/cancel` — auth; cancela vía Hotmart API
- `routes/hotmart_webhooks.py`:
  - `POST /api/webhooks/hotmart` — validación Hottok + idempotencia (índice único en event_id) + dispatcher por evento
  - Maneja: PURCHASE_APPROVED, PURCHASE_COMPLETE, PURCHASE_CANCELED, SUBSCRIPTION_CANCELLATION, PURCHASE_REFUNDED, CHARGEBACK, PURCHASE_EXPIRED, SWITCH_PLAN, UPDATE_SUBSCRIPTION_CHARGE_DATE
- Nuevas colecciones: `hotmart_subscriptions` (índices: user_id, subscriber_code unique), `hotmart_webhook_events` (índice único en event_id para idempotencia)
- `routes/admin_hierarchy.py` — `/api/admin/finance` ahora calcula MRR real desde `hotmart_subscriptions` (cycles anuales amortizados a monthly) + fallback para usuarios admin-granted

**Frontend**:
- `services/api.js` — añadidas: `getHotmartConfig`, `createHotmartCheckout`, `getMyHotmartSubscription`, `cancelHotmartSubscription`
- `pages/SubscriptionPage.js` — usa Hotmart cuando está configurado; si no, muestra toast "Disponible muy pronto" en lugar de fallback Stripe. Card "Suscripción activa" + botón "Cancelar suscripción" cuando hay `activeSub.status==='active'`. Banner inferior cambiado de Stripe → Hotmart (menciona PSE, Nequi, Bancolombia, PayPal)

**ENV vars añadidas a `/app/backend/.env`** (placeholders vacíos):
- `HOTMART_HOTTOK`, `HOTMART_CLIENT_ID`, `HOTMART_CLIENT_SECRET`, `HOTMART_BASIC_TOKEN`
- `HOTMART_OAUTH_TOKEN_URL`, `HOTMART_API_BASE`
- `HOTMART_OFFER_<TIER>_<CYCLE>` para 8 productos

**Testing**: `testing_agent_v3_fork` (iteration_62) — Backend 17/17 pytest pass, Frontend 100%, 0 regresiones.

**Próxima acción (FASE 2)** — usuario debe:
1. Crear 8 productos de suscripción en Hotmart (4 tiers × 2 cycles) con precios USD: 9.99/19.99/49.99/149.99 mensual; anual = mensual × 12 × 0.8 = 95.90/191.90/479.90/1439.90
2. Generar Hottok en Hotmart → Webhook → Autenticación
3. Crear credenciales de desarrollador en Hotmart Developers (Client ID + Client Secret + Basic Token)
4. Pegar todos los valores en las variables de entorno del deploy
5. Registrar webhook URL en Hotmart: `https://<deploy-url>/api/webhooks/hotmart`
6. Probar con "Send test" de Hotmart antes de ir a producción



## [Feb 2026] Tarea 2 — Sistema de control de planes + Multi-Coach Org
**Backend** (`server.py` + `routes/org_management.py` NUEVO):
- `PLAN_RANK` + `FEATURE_MIN_PLAN` + helper `has_plan_feature()` / `require_plan_feature()` para gating consistente.
- Nuevo endpoint `GET /api/plan-features` devuelve plan, límites, uso y mapa completo de features para frontend.
- Nuevo router `routes/org_management.py` con endpoints:
  - `POST /api/org/create` (Club/Institucional)
  - `GET /api/org/me` · `GET /api/org/coaches` · `GET /api/org/stats`
  - `POST /api/org/coaches/invite` (genera password temporal)
  - `PATCH /api/org/coaches/{id}` (suspender/activar/cambiar rol)
  - `POST /api/org/coaches/{id}/reset-password`
  - `DELETE /api/org/coaches/{id}` (remueve del org, mantiene cuenta)
- Nueva colección `organizations` + campos opcionales `org_id`, `org_role`, `org_role_label`, `status`, `must_change_password` en `users`.

**Frontend** (NUEVOS):
- `hooks/usePlanGate.js` — hook con cache 60s que devuelve `{ allowed, requiredPlan, plan, features, limits, usage }`.
- `components/PlanGate.js` — wrapper con 3 modos: `overlay` (default, blur + lock), `softblock` (intercepta clicks), `block` (no renderiza). Modal de upgrade con CTA al `/subscription`.
- `pages/OrgTeamPage.js` — Panel admin completo: 4 stat cards, tabla de entrenadores con avatares, badges (OWNER/PENDIENTE/SUSPENDIDO), acciones (reset password, suspender, eliminar), modal "Crear organización" (escala según plan: 20 coaches Club / ∞ Institucional), modal "Invitar entrenador", modal "Contraseña temporal" (con copy-to-clipboard).
- Ruta `/org/team` añadida en `App.js`.
- Botón FAB **"Equipo"** (icono Building2) condicional en dashboard, solo visible si `usePlanGate('org_management').allowed` (Club o Institucional).

**Validación**:
- Backend: probado E2E vía curl (create org + invite + list devuelven 200 con datos correctos; user free recibe 403 con mensaje claro).
- Frontend: screenshots `/org/team` muestran org + coaches + acciones funcionando. Botón Equipo aparece en dashboard del usuario enterprise.


- **Landing** (`LandingPage.js`): pill toggle premium (estilo dark glass + acento lima cuando "Anual" activo) encima de las 4 cards. Estado `billingCycle`. Anual aplica `monthly * 0.8`, muestra precio tachado, total anual y badge `−20%`.
- **Subscription Page** (`SubscriptionPage.js`): mismo toggle (light theme + emerald accent) sobre el grid de planes. `handleSubscribe(planId, cycle)` ahora propaga el ciclo al backend (preparado para Stripe).
- **Conversión esperada**: anual elimina la pregunta "¿lo pagaré 12 veces?" y muestra ahorro tangible. Pro pasa de $19.99/mes a "ahorra $47.98/año" (mensaje aspiracional pero accesible).


- **Frontend Landing** (`LandingPage.js`): array de pricing actualizado a 4 planes ($9.99/$19.99/$49.99/$149.99) con 6/7/8/9 features.
- **Frontend Dashboard → botón Plan** (`SubscriptionPage.js`): array `PLANS` reescrito con descripciones, features y precios alineados.
- **i18n** (`es.json` + `en.json`): claves `landing.pricing.*` reescritas para los 4 planes (starter/pro/club/inst) con todas las features nuevas y CTAs.
- **Backend** (`server.py`): `SubscriptionPlan` enum extendido con `STARTER`, `SUBSCRIPTION_PRICES` actualizado (9.99/19.99/49.99/149.99), `SUBSCRIPTION_LIMITS` reflejando atletas/planes/IA según pliego del usuario (5/2/10, 20/∞/50, ∞/∞/150, ∞/∞/∞).

## [Feb 2026] Fix botones 2A / 4A en gráficas del Plan
- **Bug**: En `InteractiveChart.js`, el filtro `Math.min(range.weeks, data.length)` capaba los datos a la longitud del plan. Como los planes son de 52 semanas (1 año), al pulsar 2A (104 sem) o 4A (208 sem) se mostraban los mismos 52 datos que 1A — los botones parecían no hacer nada.
- **Fix**: `filteredData` ahora rellena con semanas vacías (S53...S104 / S53...S208) cuando el rango supera la cantidad de datos. El eje X se expande visualmente y el usuario percibe el cambio de escala.
- **Archivo**: `/app/frontend/src/components/InteractiveChart.js` (líneas 96-132)
- **Por qué reapareció**: El fix anterior sólo ajustó el `brushRange` para que el slider abarcara el rango completo, pero no tocó la fuente de datos. Esta vez se corrigió la raíz.



## Arquitectura
- Frontend: React + Zustand + Recharts + Shadcn/UI
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB (11 colecciones V2 + plan_previous_analysis_ai_cache + plan_evaluations_v2 + evaluation_templates + plan_evaluations_shares)


### Reporte PDF Maestro · 8 estilos premium + diseño rico (May 2026)

**Reescritura completa de `_build_html`** en `/app/backend/routes/master_report.py` siguiendo el patrón visual del Whitepaper PDI (Plan Anterior). Resultado: PDFs 200-650KB con cover hero gradient, KPI cards, badges pill, tablas con header oscuro, footer iTRAIN.

**8 estilos disponibles** (renombrados/agregados según pedido del usuario):
- `olimpico` (antes APA) — azul medianoche `#0B1438` + dorado `#D4AF37`. Tipografía Playfair Display itálica clásica.
- `atleta` (antes Michigan) — carbón `#0F172A` + lima neón `#CCFF00`. Inter sans-serif. Datos crudos.
- `sport` — Bebas Neue + magazine deportivo dark. Cyan/Naranja.
- `training` — Inter limpio + verde clínico `#16A34A`.
- `coach` — Roboto Slab + violeta/ámbar manual.
- `federation` — institucional carbón + lima.
- `campeon` (NUEVO) — Bebas Neue masivo + dorado brillante `#FFD700` sobre negro. Esencia trofeo/victoria.
- `primer-lugar` (NUEVO) — Oswald + plata/oro premium `#C9B037`. Ranking podio editorial.

**Mejoras visuales del PDF (para todos los estilos):**
- Cover hero ocupa 70vh con gradient propio del estilo + radial accent + márgenes negativos full-bleed.
- Badge pill con accent color, título 44pt font-weight 900, subtítulo, KPIs del plan en 3 cols (deporte/duración/modelo).
- Cover-meta inferior con Atleta/Entrenador/Fecha/Estilo separados por borde-left con accent.
- TOC numerada con bullets cuadrados accent y dots elegantes.
- Sections con badge pill + h2 subrayado con accent 3pt + count secundario.
- KPI cards con border-left accent 4pt, eyebrow uppercase, value 22pt 900.
- Tablas premium: header background primary + texto accent letterspacing, filas alternadas, border-radius.
- Bloques de evaluación con cumplimiento global coloreado (verde≥80%, ámbar≥50%, rojo<50%).
- Callouts con primary background + accent strong.
- Footer con icon iTRAIN + "Generado por <strong>iTRAIN</strong>" + fecha.
- Google Fonts inyectados (Inter, Bebas Neue, Oswald, Roboto Slab, Playfair Display, Russo One).

**Frontend `MasterReportModal.js`**: actualizado el mapping `STYLE_ICONS` con los 8 nuevos ids (olimpico→Medal, atleta→Activity, sport→Activity, training→FileBarChart2, coach→Notebook, federation→Crown, campeon→Trophy, primer-lugar→Award). Default style cambiado a `atleta`.

**Validación**: 8/8 PDFs generados (200-650KB). Análisis visual con `analyze_file_tool`: estilo `olimpico` confirmó portada gradient azul + dorado, badge dorado, Playfair itálica, KPI cards con borde dorado, TOC numerada, tablas con header oscuro/texto dorado, footer iTRAIN. Estilo `campeon` confirmó portada negra + dorado, Bebas Neue masivo, KPI cards crema + borde dorado, tablas negro/oro.



**Backend** `/app/backend/routes/master_report.py` (~480 líneas, registrado en `server.py` con prefix `/api`):
- 5 estilos visuales (`STYLES` dict): **APA** (académico Times serif), **Michigan** (universitario azul/dorado), **Sport** (magazine deportivo dark Bebas Neue), **Training** (clínico Inter verde) y **Coach** (manual Roboto Slab violeta).
- Cada estilo define `font, primary, accent, bg, fg?, heading_size, body_size, page_margin, vibe, dark?`. Cover, sec-title, hr y tablas se derivan de estas variables. Override por estilo via `style_overrides[id]` (ej: APA italic + double-spacing; Michigan border-bottom doble; Sport background dark).
- 22 secciones seleccionables agrupadas en 8 bloques: Inicio (cover/toc/introduction), Diagnóstico (plan anterior/activo), Información (entities/teams/athletes/sports/tournaments/coaches), Evaluación (8 tipos), Competencias, Periodización (estructura/carga), Visualización (graphic_plan), Herramientas.
- Endpoints:
  - `GET /api/master-report/styles` lista los 5 estilos para el frontend.
  - `GET /api/master-report/sections-catalog` devuelve los 8 grupos con items `{id, label}`.
  - `POST /api/master-report/generate` body=`MasterReportPayload {plan_id?, title?, subtitle?, style, sections:SectionFlags, org_name?, org_logo_b64?, coach_name?, athlete_name?}` → PDF A4 stream.
- Pipeline: `_build_html()` arma todas las secciones según flags (carga el plan activo, evaluaciones plan_evaluations_v2 últimas 10 por tipo, info catalogs por colección, tournaments, plan_previous_analysis_ai_cache, graphic_plan_shares con image_b64) → `_render_pdf()` con Playwright `set_content` + `pdf(format='A4', print_background=True)`.
- Logo del club opcional vía `org_logo_b64` (data URL base64) embebido en la portada con max-height 80pt; si no, fallback al brand iTRAIN.

**Frontend** `/app/frontend/src/components/MasterReportModal.js` (~270 líneas):
- Dialog full-feature con header gradient slate-900 + icon FileBarChart2 lima, ScrollArea body en grid 12-cols.
- LEFT (col-5): inputs Título / Subtítulo / Organización / Logo (file upload → base64, preview + botón X), grid 2x con cards de los 5 estilos (active state slate-900 + scale[1.02], swatches primary/accent visibles, vibe descriptivo).
- RIGHT (col-7): contador "X seleccionadas" en pill lima, los 8 grupos como cards con header "Marcar todo / Quitar todo" y checkboxes en grid 2-col por sección. Default selection: cover+toc+introduction+diagnostic_active+periodization_structure+graphic_plan.
- Footer sticky con plan name + botones Cancelar / Generar (Loader2 spinner + descarga blob automática como `reporte_<title>_<style>.pdf`).
- data-testids: `master-report-modal`, `mr-title-input`, `mr-subtitle-input`, `mr-org-input`, `mr-logo-input`, `mr-style-{apa|michigan|sport|training|coach}`, `mr-section-{id}`, `mr-group-{id}-toggle-all`, `mr-cancel-btn`, `mr-generate-btn`.

**Integración** `DashboardPage.js`:
- Estado `isMasterReportOpen` + import `MasterReportModal`.
- Botón "Reporte Maestro" en el header de Plan Activo (`data-testid="active-plan-master-report-btn"`) con borde y bg lima-tinted, al lado de PDF/Enlace/WhatsApp.
- Modal montado al final del componente con props: open/onOpenChange/plan=activePlan/athleteName/coachName.

**Validación**: 12/12 backend tests PASS (testing_agent_v3_fork iter_51) — los 5 estilos generan PDF 90-130KB. Validación visual de PDF Sport con `analyze_file_tool`: portada con título grande + bloque atleta/coach/fecha, TOC con paginación "p. N", todas las secciones presentes (Diagnóstico previo+activo, Info atletas/deportes/torneos, 3 evaluaciones, Competencias, Periodización estructura+carga, Plan Gráfico, Herramientas), estilo dark/condensed correcto. Code review frontend confirmó todos los data-testid + integración OK.




### Evolución de Controles — Mini chart + Vista global multi-tipo (Feb 2026)

**Component nuevo** `/app/frontend/src/components/EvaluationEvolution.js` (~280 líneas):
- **`EvaluationMiniChart`** (named export): mini línea Recharts dentro de cada `EvaluationSection`. Visible cuando hay ≥2 controles del mismo tipo. Header inteligente "Inicial: X% → Actual: Y% (+Δ%)" coloreado por tendencia. Línea de referencia 50%. Tooltip con fecha+título+%.
- **`EvaluationEvolution`** (default export): vista global con `LineChart` overlaid de los 8 tipos. Líneas de referencia 80% (Excelente verde) y 50% (Aceptable ámbar). 8 cards de tipo clickables (toggle ocultar/mostrar serie) con métricas Último/Promedio/Tendencia (▲▼● color-coded). Listener `itrain:evaluation-saved` para auto-refresh. Empty state cuando no hay controles. Usa endpoint existente `/api/plan-data/evaluations-export/timeline/{plan_id}`.
- Diccionario `TYPE_META` con 8 entradas (color + icono Lucide + título corto).
- data-testids: `eval-evolution`, `eval-evolution-chart`, `eval-evolution-type-{type}`, `eval-{type}-mini-evolution`.

**Integración**:
- `EvaluationSection.js`: importa `EvaluationMiniChart`, lo renderiza después del hero global, antes de los grupos de aspectos. Solo cuando `controls.length >= 2`. El listener `itrain:evaluation-saved` ya existente sincroniza al guardar.
- `DashboardPage.js`: nuevo nav item `evaluation-evolution` (ícono `TrendingUp`) bajo sección `evaluacion`. Routing condicional en `renderSection()` retorna `<EvaluationEvolution />`.

**Validación**: 12 controles sembrados via curl (medical x5, physical x3, technical x2, anthropometric x2). Screenshots confirmaron:
- Mini-chart en Control Médico: línea con 5 puntos + delta "+28%" verde.
- Vista global: chart con 4 series overlaid (cyan/blue/red/violet), 8 cards (4 con datos, 4 "Sin datos" en opacidad reducida), referencias 80%/50%, leyenda inferior.


### Evaluaciones Multi-control + Vinculación con Plan Gráfico (Feb 2026)

**Estado**: 29/29 backend tests + frontend E2E PASS (iter_50). 8 tipos: medical, physical, technical, tactical, psychological, theoretical, **anthropometric** (NUEVO), **biomechanical** (NUEVO).

**Backend** (`/app/backend/routes/evaluations_export.py` ~700 líneas, prefix `/plan-data/evaluations-export`):
- **Multi-control**: cada control tiene `id` (uuid) + `date` + `title`. POST sin id crea uno nuevo; con id actualiza. Colección `plan_evaluations_v2` clave por id.
- **Endpoints**:
  - `POST ""` save (id opcional)
  - `GET /list/{plan_id}/{type}` lista de controles ordenada por fecha desc + global_pct
  - `GET /timeline/{plan_id}` todos los controles del plan (para Plan Gráfico)
  - `GET /by-id/{evaluation_id}` doc completo
  - `DELETE /by-id/{id}` elimina control + limpia shares asociados
  - `GET /by-id/{id}/pdf` PDF individual
  - `POST /by-id/{id}/share` link público idempotente
  - `GET /shared/{share_id}` HTML público (sin auth)
  - `GET /shared/{share_id}/pdf` PDF público (sin auth)
  - `GET /templates/{type}` lista plantillas + system_default
  - `POST /templates`, `POST /templates/{id}/set-default`, `DELETE /templates/{id}` CRUD plantillas
  - `GET /{plan_id}/{type}` retrocompat (último control o template)
- **Route ordering FIX**: rutas específicas (`/list`, `/timeline`, `/templates`, `/by-id`, `/shared`) declaradas ANTES del catch-all `/{plan_id}/{type}` para evitar colisiones FastAPI.
- **Templates por defecto del sistema**: 8 tipos con 5-7 aspectos cada uno (DEFAULT_TEMPLATES dict). Cada aspecto tiene `label, category, scale_min, scale_max, scale_unit, target`.
- **PDF Material Design**: hero oscuro tematizado por color, badge "EVALUACIÓN · {tipo}", global card con % normalizado, 3 stat-cards, sección por categoría con barras coloreadas (verde≥80%, ámbar≥40%, rojo<40%), fortalezas/áreas mejora, share-ribbon en públicos.

**Frontend EvaluationSection** (`/app/frontend/src/components/EvaluationSection.js` ~510 líneas):
- Toolbar Material Design con 6 botones: **Nuevo control** (verde tematizado) | Plantillas | PDF | Enlace | WhatsApp | Guardar
- Barra dedicada con `Fecha del control` (date input) + `Título del control` (texto opcional) + `Eliminar este control` (visible solo si activeId)
- **Historial de controles**: chips clickeables con fecha + título + global_pct%; el activo destacado en color del tipo. Click en chip carga ese control en el form
- Aspect rows dinámicos: nombre + categoría + unidad + min/max/objetivo/valor + % cumplimiento con barra visual
- Botón "+ Agregar aspecto a evaluar" + Trash en cada row
- TemplatesModal: cargar/guardar/eliminar/marcar default; system_default siempre disponible
- `handleSave` dispara `window.dispatchEvent('itrain:evaluation-saved', {detail: {plan_id, evaluation_type, date}})` para sincronizar Plan Gráfico
- data-testids: `eval-{type}-{new-control,templates,pdf,link,whatsapp,save,delete,date-input,title-input,history,history-item-{id},aspect-{id},aspect-value-{id},add-aspect}-btn`

**GraphicPlan integration** (`/app/frontend/src/components/GraphicPlan.js`):
- `MONITORING_AREAS` ampliado a 8 entradas: medical, anthropometric (cyan), physical, biomechanical (emerald), technical, tactical, psychological, theoretical
- Color mapping en `colors` dict (línea 1521) y `monColors` dict (línea 1539) para 8 tipos
- Nuevo `useEffect` (líneas ~575-617) fetcha `/api/plan-data/evaluations-export/timeline/{plan_id}` y para cada control con date dentro del rango del plan calcula `weekIdx = floor((ctrlDate - plan.start_date) / 7days) + 1` y marca `planData.monitoring[`${type}_${weekIdx}`] = true`
- Listener `window.addEventListener('itrain:evaluation-saved', handler)` re-fetcha el timeline al guardar/eliminar un control desde EvaluationSection — sincronización en tiempo real

**Flujo cierre del bucle**:
1. Coach va a Evaluación → Control Médico → click "Nuevo control" → llena fecha 2024-03-15 + valores → Guardar
2. EvaluationSection POST `/api/plan-data/evaluations-export` → server crea doc con uuid, dispara event
3. GraphicPlan listener re-fetcha timeline → calcula semana 9 (15/03 - 15/01)/7 = 8.5 → semana 9
4. Celda monitoring `medical_9` se marca en rojo automáticamente
5. Aparece círculo rojo en columna semana 9 fila Monitoreo agregado + cuadrado en fila Control médico


### Información — 5 catálogos con header Material Design + Export PDF/Share/WhatsApp (Feb 2026)

**Backend** (`/app/backend/routes/info_catalog_export.py` ~360 líneas): 4 endpoints genéricos parametrizados por `{catalog_type}` (entities/teams/athletes/sports/tournaments). `TYPE_CONFIG` mapping con colección Mongo, label, color y columnas. Helper `_value_for(item, key)` con aliases. Colección `info_catalog_shares`. Template PDF con hero oscuro tematizado por color, badge "CATÁLOGO · X", 3 stat-cards, tabla negro/lima. Validado: 5/5 PDFs generados (107-120KB).

**Mejora Deportes — PDF Material Design tipo galería** (Feb 2026): el catálogo de deportes ahora usa un template especial `_build_sports_html` con cards Material Design en grid 2-columnas, mostrando TODOS los campos de caracterización técnica:
- Header con nombre del deporte, categoría y círculo de completitud (% conic-gradient codificado por color: verde ≥80%, ámbar ≥40%, rojo <40%).
- Pills de Tipo (Individual/Colectivo/Combate/Precisión/Raquetas/Acuático) y Sistema Energético (Aeróbico/Anaeróbico Láctico/Anaeróbico Aláctico/Mixto) con colores temáticos.
- 3 secciones expandidas (Capacidades Físicas verde, Habilidades Técnicas azul, Factores Tácticos ámbar) con dots de color y fallback "No definido".
- Hero con 4 stat-cards (Total / Caracterizados / Sin caracterizar / Cobertura %).
- Diccionarios `SPORT_TYPE_LABELS` y `ENERGY_SYSTEM_LABELS` para traducción de claves a labels humanos en español.
- Dispatch automático en endpoints PDF y shared cuando `catalog_type == "sports"`. Validado con `analyze_file_tool`: 48 deportes en grid 2-col, hero, stat-cards, todos los campos visibles.

**Frontend componente reusable** (`/app/frontend/src/components/InfoSectionHeader.js` ~180 líneas): Toolbar Material Design idéntico a Plan Anterior/Plan Activo con 4 botones (PDF/Enlace/WhatsApp/Guardar). Handlers internos. Integrado en las 5 secciones (`entities`, `teams`, `athletes`, `sports`, `tournaments`) en `DashboardPage.js` con colores temáticos (sky/emerald/amber/red/violet). Validado por screenshot end-to-end.


### Plan Activo — Rediseño estilo Plan Anterior + Export PDF/Share/WhatsApp (Feb 2026)

**Backend** (`/app/backend/routes/active_plan_export.py` ~280 líneas): 4 endpoints (`/objectives/{plan_id}/pdf`, `/share`, `/shared/{share_id}`, `/shared/{share_id}/pdf`). Colección `plan_objectives_shares`. Template HTML whitepaper con hero oscuro + badge "PLAN ACTIVO", info-grid, 3 goal-cards (Largo/Medio/Corto Plazo), tabla de Aspectos, callout SMART. PDF de 121KB validado con `analyze_file_tool`.

**Frontend** (`DashboardPage.js`): Header centrado gigante reemplazado por toolbar Material Design compacto (estilo Plan Anterior). Handlers `handleDownloadObjectivesPDF`, `handleShareObjectivesLink`, `handleShareObjectivesWhatsApp`. Reorganización: Información General full-width, Objetivos por Horizonte en 3 cards (Macro/Meso/Micro con badges), Tabla Aspectos negro/lima, Callout SMART al pie. Inputs y textareas compactados.
- 4 endpoints genéricos parametrizados por `{catalog_type}` (entities/teams/athletes/sports/tournaments):
  - `GET /api/info-export/{type}/pdf` (auth)
  - `POST /api/info-export/{type}/share` (auth)
  - `GET /api/info-export/shared/{share_id}` (HTML público)
  - `GET /api/info-export/shared/{share_id}/pdf` (PDF público)
- `TYPE_CONFIG` mapping con colección Mongo, label, subtitle, color y columnas por tipo. Validación 400 si tipo no existe.
- Helper `_value_for(item, key)` con aliases comunes (nombre↔name, ciudad↔city, etc) para resolver campos heterogéneos sin alterar las colecciones existentes.
- Enriquecimiento on-demand: `teams` añade conteo `athlete_count`.
- Colección nueva `info_catalog_shares` para snapshots públicos.
- Template PDF con hero oscuro tematizado por color del catálogo (sky/emerald/amber/red/violet), badge "CATÁLOGO · X", 3 stat-cards (Total / Activos / Mes), tabla con header negro/lima y filas alternadas con índice numérico.
- Validado: 5/5 PDFs generados (114-120KB) + share IDs creados + 400 en tipo inválido. PDF Catálogo Deportes verificado con `analyze_file_tool`: 48 registros, hero oscuro con badge rojo, 3 stat-cards, tabla con todos los deportes listados.

**Frontend nuevo componente reusable** (`/app/frontend/src/components/InfoSectionHeader.js` ~180 líneas):
- Componente `<InfoSectionHeader>` propsado por `catalogType + title + subtitle + icon + color + onRefresh + rightExtra`.
- Toolbar Material Design idéntico al de Plan Anterior/Plan Activo: icono temático en cuadro slate-900 + título/subtítulo + 4 botones acción (PDF / Enlace / WhatsApp / Guardar).
- Handlers internos para PDF download (descarga blob), share link (copia al portapapeles + toast), WhatsApp (compone mensaje + abre wa.me), refresh (callback opcional con toast).
- Estado `busy` para deshabilitar todos los botones durante la operación.
- data-testids: `info-section-header-{type}`, `{type}-pdf-btn`, `{type}-link-btn`, `{type}-whatsapp-btn`, `{type}-refresh-btn`.

**Integración en `DashboardPage.js`** (5 secciones):
- `entities` (sky-500 + Building2): toolbar + EntityManager existente.
- `teams` (emerald-500 + UsersRound): toolbar + TeamManager existente.
- `athletes` (amber-500 + User): toolbar arriba de los tabs internos (sports/tournaments/teams/athletes).
- `sports` (red-500 + Medal): toolbar + onRefresh = fetchSportsCatalog.
- `tournaments` (violet-500 + Shield): toolbar + onRefresh = fetchTournaments.
- Wrapper consistente: `p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]` igual que Plan Anterior/Plan Activo para mantener visual cohesivo.
- Validado por screenshot end-to-end: las 5 secciones renderizan el header correctamente con colores temáticos y los 4 botones funcionales.




**Backend nuevo** (`/app/backend/routes/active_plan_export.py`, ~280 líneas, registrado en `server.py`):
- 4 endpoints siguiendo el mismo patrón de `previous_analysis_export.py`:
  - `GET /api/plan-data/objectives/{plan_id}/pdf` — PDF whitepaper iTRAIN autenticado.
  - `POST /api/plan-data/objectives/{plan_id}/share` — crea/reutiliza `share_id` público.
  - `GET /api/plan-data/objectives/shared/{share_id}` — HTML público sin auth (ribbon "DOCUMENTO COMPARTIDO").
  - `GET /api/plan-data/objectives/shared/{share_id}/pdf` — PDF público sin auth.
- Colección nueva `plan_objectives_shares` para los snapshots compartidos.
- Template HTML con hero oscuro + badge "PLAN ACTIVO", info-grid 2x2 (Deporte/Entrenador/Edad/Clasificación), 3 cards de objetivos por horizonte (Largo verde · Medio ámbar · Corto azul) con `goals-grid` 3-col, tabla de Aspectos con header negro/lima y aspect-pills coloreados, callout SMART final.
- Validado: PDF de 121KB con todas las secciones renderizadas correctamente (analyze_file_tool: hero + badge + 3 cards + tabla + callout SMART).

**Frontend rediseño** (`DashboardPage.js`):
- Reemplazado el header centrado gigante por el toolbar compacto Material Design (estilo Plan Anterior): icono lima `Target` en cuadro slate-900, título "Plan Activo" + subtítulo, 4 botones (PDF/Enlace/WhatsApp/Guardar) y warning si no hay plan activo.
- Handlers nuevos: `handleDownloadObjectivesPDF`, `handleShareObjectivesLink`, `handleShareObjectivesWhatsApp` — guardan automáticamente antes de exportar.
- **Reorganización de contenido**:
  - Información General full-width con grid 1/2/3 columnas responsivo (border-l-[#007AFF]).
  - Objetivos por Horizonte cambiados de 4 cards (1 info + 3 obj) a 3 cards horizontales con badges contextuales (MACROCICLO/MESOCICLO/MICROCICLO).
  - Tabla de Aspectos con header negro/lima estilo iTRAIN, color-pill por aspecto.
  - Callout SMART al pie con borde lima (reemplazo del bloque "Cancelar/Guardar").
- Inputs y textareas compactados (h-9, p-2, rows={1-2}, text-sm) para mayor densidad de información sin perder claridad.



### Gap Analysis con IA en Plan Anterior — multi-modelo + multi-LLM (Feb 2026)

**Cierre del ciclo con IA — el coach recibe el "qué hacer al respecto":**
- Backend `/app/backend/routes/previous_analysis_export.py` (~1100 líneas):
  - Nueva colección `plan_previous_analysis_ai_cache` con cache_key hash de (plan_id, areas_real, models_seleccionados, provider, llm_model).
  - Helpers: `_resolve_model_profile` (busca en MODEL_PROFILES → fallback a `_CATEGORY_PROFILES` por categoría → 'Custom' equilibrado); `_radar_values_from_cumpl`; `_hash_payload`; `_build_gap_prompt`; `_parse_llm_json`; `_call_llm_for_gap` (vía `emergentintegrations.LlmChat`).
  - Endpoints nuevos:
    - `GET /api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai` → devuelve `{gap_analysis_ai}` cacheado (200 con null si no existe; 404 sólo si no hay análisis).
    - `POST /.../gap-analysis-ai` body=`{models[], provider:openai|anthropic, llm_model?, force_refresh?}` → calcula deltas vs cada modelo, llama al LLM (cap 6 modelos), parsea JSON, persiste cache + en `plan_previous_analysis.gap_analysis_ai`.
    - `DELETE /.../gap-analysis-ai` → limpia cache + campo del documento.
  - Provider dispatch via `_select_llm_model`: openai→`gpt-5.2` · anthropic→`claude-sonnet-4-5-20250929`.
  - Prompt estructurado en español con 7 áreas reales + perfiles ideales por modelo seleccionado, exigiendo JSON con `executive_summary` + 3-5 `recommendations[{title, description, priority:alta|media|baja, area}]`.
  - `_build_html` ahora acepta `ai_data` o lo lee del doc; renderiza nueva sección "7. Gap Analysis con IA" con pill provider, contador modelos, resumen ejecutivo (callout amarillo), tabla comparativa modelos (brechas top 3 + % coincidencia), 3-5 cards de recomendaciones numeradas con badges de prioridad. PDF compartido (sin auth) también la incluye.

- Frontend `DashboardPage.js`:
  - Estado: `aiGapData`, `aiGapLoading`, `aiGapProvider`, `aiSelectedModels`, `periodLibrary`.
  - `useEffect` autoload de biblioteca + cache IA al entrar a Plan Anterior. Pre-selecciona el modelo del plan activo.
  - Handlers: `fetchPeriodLibrary`, `fetchGapAnalysisAI`, `handleGenerateGapAnalysisAI(force)`.
  - Card UI nueva (`data-testid='ai-gap-analysis-card'`) con header negro + lima:
    - Provider selector toggle (`ai-provider-openai`, `ai-provider-anthropic`).
    - Multi-select chips de los 30 modelos de la biblioteca (`ai-models-selector`, cap visual+lógico de 6, chips deshabilitados al límite).
    - Botón "Generar IA" / "Regenerar" + link "Forzar regeneración" (skip cache).
    - Estados: empty (CTA), loading (spinner), results (`ai-gap-results`):
      - Resumen Ejecutivo en card lima italic.
      - Tabla comparativa con coincidencia codificada por color (verde/ámbar/rojo).
      - Lista numerada de recomendaciones con borde lima y badge de prioridad coloreado.

- Validación: `testing_agent_v3_fork iter_49` → 8/9 backend tests PASS (1 bug menor de truthiness en GET arreglado: `count_documents` en lugar de `if not doc`). PDF descargado de 232KB con sección IA renderizada (verificada con `analyze_file_tool`: pill OPENAI · GPT-5.2, 2 modelos comparados, tabla con ATR 94% y pdi 81% coincidencia, 5 cards de recomendaciones con prioridades ALTA/MEDIA, áreas y descripciones técnicas). Cache hit: True confirmado en segunda llamada idéntica.

### Plan Anterior — % Global de Cumplimiento HERO (Feb 2026)

- Card "% Global de Cumplimiento" rediseñado como hero card que llena el espacio vertical sobrante de la columna 2 (`mt-auto` + `flex-1` + `min-h-180px`):
  - Cumplimiento Card: ahora `flex flex-col` con `lg:h-full` para forzar stretch a la altura de col 1.
  - CardContent con `flex flex-col flex-1 min-h-0` + el % Global con `mt-auto` se pega al fondo.
  - Tipografía masiva: % en `text-5xl lg:text-6xl` (antes text-2xl), pill "AUTO" más grande, label en text-[12-13px] con tracking 0.2em.
  - Barra progreso `h-4 lg:h-5` (antes 2.5) con gradient interior y shadow.
  - Indicador de estado dinámico ("✓ Excelente / ◐ Bueno / ○ Aceptable / ◌ Mejorar") según el %.

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


### Restauración Magnitud de Carga + Panel "Carga" + Expanded Chart full-screen (Feb 2026)

Tres bugs/peticiones del usuario resueltos en una iteración:

**1. Restaurada fila "Magnitud de Carga y Recuperación"** en Plan Gráfico (`GraphicPlan.js`):
- El usuario pidió REVERTIR la remoción del request anterior. Vuelven a aparecer los rows "Carga %" y "Recuperación %" con sus celdas y el ChartSectionHeader expandible.
- Ahora usa `loadChartDataFull` para que al expandir muestre las 52 semanas (no 12).

**2. Nuevo componente Panel "Carga"** (`/app/frontend/src/components/LoadPanel.js`, ~270 líneas):
- Renderizado cuando `activeDataSection === 'period-load'` en DashboardPage. Antes el tab "Carga" del sidebar quedaba vacío.
- Computa métricas en tiempo real desde `activePlan.macrocycles[].mesocycles[].microcycles[].sessions[]`:
  - **Carga UA** (Foster modificado: `vol * intensidad / 100`)
  - **ACWR** (carga aguda última semana / promedio últimas 4)
  - **Tendencia** (creciente / decreciente / estable comparando últimas 3 vs 3 anteriores)
  - **RPE promedio** + total acumulado + pico + mínimo
- UI ejecutiva con 4 KPI cards Material Design 3 (Carga aguda · Carga crónica · ACWR · Tendencia), banner inteligente con zonas ACWR (Detraining < 0.8 · Óptima 0.8-1.3 · Precaución 1.3-1.5 · Sobrecarga > 1.5), ComposedChart con barras (Carga UA + Volumen) + línea Intensidad + área ACWR overlay con líneas de referencia, heatmap de distribución por mesociclo, footer con 4 cards resumen.

**3. Bug fix expanded chart** (`InteractiveChart.js` + `GraphicPlan.js`):
- **Causa raíz**: el `useEffect` de reset del brush limitaba el `endIndex` a `Math.min(filteredData.length - 1, 11)` — siempre mostraba solo 12 entradas en el slider inferior, sin importar que se eligiera 4A/2A/1A/6M. Fix: eliminar el cap de 11; el brush ahora abarca todo el `filteredData.length`.
- **Tamaño del Dialog ampliado** de `max-w-6xl max-h-[85vh]` a `!max-w-[96vw] !max-h-[94vh]` con header oscuro premium (gradient slate-900 + icono lima + título + metadata "N semanas · M series · Plan {duration}").
- Altura del chart ahora `Math.max(420, window.innerHeight * 0.62)` — antes 400 fija.
- `defaultTimeRange` dinámico según `cycleDuration` (annual=1year, biannual=2years, olympic=olympic, otherwise sessions).
- Datos del chart usan `*ChartDataFull` (refactorizados como mappers reutilizables `_buildXxxData(weekList)`) que mapean sobre `weeks` (full plan range), no `displayedWeeks`.

**Validación**: Screenshot E2E confirmado: dialog se abre correcto en 94vh, eje X muestra S1...S52 (las 52 semanas del plan annual), botones de rango funcionales (1A activo, 4A/2A/6M/3M/1M/S/Últ.4/Últ.8/Todo presentes), brush slider abarca toda la franja inferior. Magnitud de Carga restaurada visible en el Plan Gráfico (valores reales 83/88/88/32/84/89/89/53/100/100/83). Panel Carga con 4 KPIs + ACWR alert + chart composed + heatmap por mesociclo. Lints ✅. 0 regresiones.


### UI/UX consolidación — Coach AI clean, Periodización compacta y Plan Gráfico con Dialog (Feb 2026)

Iteración de 6 mejoras coordinadas tras feedback del usuario:

**1. Coach AI Drawer** (`DashboardPage.js`):
- Eliminada la pestaña "Planes (3)" — el drawer ahora es un workspace dedicado al chat AI a pantalla completa.
- Header rediseñado: gradient slate-900 con glows decorativos, icono Brain en cuadro lima/40, indicador "En línea" pulsante verde.
- Footer simplificado: avatar usuario + rol + badge "Plan activo" cuando aplica.
- Width 440px (antes 384px), con animation slide-in-from-right.

**2. Periodización — sesiones de la semana** (`PeriodizationComplete.js`):
- Grid restaurado a `grid-cols-2 sm:3 md:4 lg:5 xl:7` para mostrar **7 días en una fila**.
- Card compactada (Material Design 3): top accent strip con gradient day→type, day pill 28x28 con sombra, métricas DUR/VOL/INT/RPE en grid 2x2 de chips con bordes sutiles, barra de carga acumulada multi-color, density chip + fatigue chip al pie.
- Hover: shadow-lg + translate-y-0.5.
- Tamaños tipográficos reducidos manteniendo legibilidad (text-[10px] para etiquetas, text-[10px]-[11px] para valores).

**3. Periodización — chart MEV→MAV→MRV removido del mesociclo**:
- Eliminadas 202 líneas (IIFE entre 2237-2439) que renderizaban el chart gigante dentro de cada mesociclo expandido.
- Chart extraído a `/app/frontend/src/components/charts/MesoMevMavMrvChart.js` (componente standalone reutilizable con state interno).

**4. Plan Gráfico — Proyección por mesociclo como Dialog** (`GraphicPlan.js`):
- Bloque grande "Proyección por mesociclo" debajo de la tabla → REMOVIDO.
- Nueva fila **"Proyección"** insertada en la tabla justo encima de "Microciclo" (data-testid `gp-mev-projection-row`).
- 1 botón pequeño con icono `BarChart3` por mesociclo (data-testid `gp-mev-btn-{macroIdx}-{mesoIdx}`), posicionado al inicio de cada bloque (startWeek).
- Click → abre Dialog modal centrado con header oscuro premium + icono lima + chart completo MesoMevMavMrvChart.

**5. Bug fix: 3 botones en lugar de 1**:
- Causa raíz: API devuelve todos los `microcycles[].week_number === 1` (defectuoso), causando colisión en `weekToMeso[1]` y mostrando solo el último meso (Realización).
- Fix: usar siempre un **contador cumulativo** (1..N) ignorando el `week_number` del backend. Cada meso obtiene weeks únicas consecutivas.
- Validado: 3 botones visibles en x=451, x=692, x=934 (uno por macrociclo Acumulación / Transformación / Realización).

**Validación** (`testing_agent_v3_fork iter_60`): Frontend E2E 12/13 PRD criterios PASS. Coach AI sin tabs ✓, hidratación warning de `<span>` no bloqueante. Después del fix de botones (3/3) y screenshot E2E confirmado por main agent. 0 regresiones.


### Bug fix: "Enlace" debe abrir página HTML, no PDF (Feb 2026)

**Problema reportado**: Click en botón "Enlace" en modal Sesiones y modal Reporte Maestro generaba/copiaba una URL al PDF directo. El usuario quería una **página HTML pública no editable (solo lectura)**.

**Fix backend**:
- `GET /api/sessions-export/shared/{share_id}` — devuelve `text/html` con banner sticky oscuro arriba ("DOCUMENTO COMPARTIDO" + plan + N sesiones + "Solo lectura"), botones "PDF combinado" + "ZIP" en el banner, contenido renderizado como hero layout (cards con pizarras, badges, stats). `@media print { #share-ribbon { display: none } }` para que al imprimir no salga el banner.
- `GET /api/master-report/shared/{share_id}` — devuelve `text/html` reutilizando `_build_html(payload, owner_uid)` con inyección post-`<body>` del banner + botón "Descargar PDF" (lima). Style override habilita scroll natural en pantalla manteniendo `@page A4` para impresión.
- Ambos endpoints: 404 si share inválido, 410 si expirado (>30d).

**Fix frontend**:
- `SessionsExportModal.handleShare`: URL ahora es `${API}/api/sessions-export/shared/${shareId}` (sin `/pdf`). Toast actualizado: "Enlace copiado · página de solo lectura".
- `MasterReportModal.handleShare`: URL ahora es `${API}/api/master-report/shared/${shareId}` (sin `/pdf`). Mismo toast.
- WhatsApp messages actualizados: "Ver en línea: <url>" en lugar de "Descargar PDF: <url>".

**Validación**: Curl + screenshot confirman ambas vistas HTML públicas renderizan correctamente con banner DOCUMENTO COMPARTIDO + botones de descarga PDF/ZIP funcionales. Test E2E con Playwright: clipboard contiene URL HTML (verificado `is_html_url=True`, sin `/pdf`).


## Implementado

### Sessions Export V2 + Master Report Share — theme/layout/share/whatsapp (Feb 2026)

**Mejoras al modal Sesiones (5 áreas) y al Master Report:**

**1. Estado seleccionado MUY visible** (`SessionsExportModal.js`):
- Antes: borde lima 2px sutil, fondo lima/8 — apenas perceptible
- Ahora: `border-2 border-[#CCFF00] + bg-gradient-to-br from-[#CCFF00]/20 to-[#CCFF00]/5 + ring-2 ring-[#CCFF00]/40 + shadow-md + scale-[1.015]`
- Checkmark badge (lima con border-2 white) en esquina superior derecha de cada card seleccionada

**2. Selectores Theme + Layout** en toolbar del modal Sesiones:
- Theme chips: Claro (Sun, amber-100) | Oscuro (Moon, slate-900 + lima)
- Layout chips: Clásico (FileText, blue-100) | Pizarras (LayoutGrid, emerald-100)
- 4 combinaciones soportadas: classic-light, classic-dark, hero-light, hero-dark

**3. Visual de cada card mejorado**:
- Iconos por tipo de sesión (Dumbbell/fuerza, Activity/resistencia, Flame/velocidad, Target/técnica, etc.)
- Badges con iconos: `# Día N`, tipo coloreado por tipología, `clock 60min`, `activity X ej.`, `flame intensity%`
- Counter parcial "X/Y" en headers de mesociclo y microciclo cuando hay selección parcial

**4. Footer reorganizado en 2 filas** (ambos modales):
- Status row (bg-slate-50): contador de seleccionadas + formato + tema
- Actions row (bg-white): Cancel | Enlace · WhatsApp | ZIP · PDF combinado / (Cancel | Enlace · WhatsApp · | Resumen · Vista previa · Generar PDF)

**5. Botones Compartir + WhatsApp** en ambos modales:
- `sessions-export-link-btn`, `sessions-export-whatsapp-btn` (sky-300 + emerald-300 outlines)
- `mr-share-link-btn`, `mr-share-whatsapp-btn`
- Link copia URL al portapapeles + toast con descripción
- WhatsApp abre `wa.me/?text=...` con mensaje compuesto (plan name + URL pública)

**Backend nuevo** (`/app/backend/routes/sessions_export.py`, ~600 líneas, REESCRITO):
- `_build_session_pdf_classic(session, athlete, meso, micro, week, theme)` — ReportLab con soporte light/dark (fondo `#0a0a0f` + ink `#e5e7eb` cuando dark; respeta el accent lima del header)
- `_build_session_html_hero(...)` — HTML con cards 2-col, board-hero 336px, court-bg verde sólido `#2d5f3e` (dark) o gradient cancha (light), página por sesión con `page-break-after`
- `_render_hero_pdf_bytes(htmls)` — concatena múltiples HTML en uno solo y renderiza con Playwright en una pasada (mucho más eficiente que N pasadas)
- `POST /api/sessions-export/generate` ahora acepta `theme + layout` con validación 400 si inválidos
- `POST /api/sessions-export/share` body=`{plan_id, session_ids, theme, layout, athlete_name}` → guarda en `sessions_export_shares` colección, devuelve `{share_id: SXB-{hex}, expires_in_days: 30}`
- `GET /api/sessions-export/shared/{share_id}/pdf?format=combined|zip` (sin auth) regenera y descarga; 410 si expirado, 404 si missing

**Backend Master Report Share** (`/app/backend/routes/master_report.py`):
- `POST /api/master-report/share` body=`MasterReportPayload` → guarda en `master_report_shares`, devuelve `{share_id: MRP-{hex}, expires_in_days: 30}`. Valida 400 si no hay `plan_id`.
- `GET /api/master-report/shared/{share_id}/pdf` (sin auth) regenera con `_build_html` + `_render_pdf` usando el payload persistido y el `owner_uid` para resolver el plan.

**Validación** (`testing_agent_v3_fork iter_59`): 23/23 backend pytest PASS (8 regression + 15 nuevos cubriendo 4 combinaciones theme×layout, ZIP+hero, validaciones 400, share flow ambos modales con expires/404/410). Frontend 100%: chips theme/layout estado correcto, selected state altamente visible, contadores parciales por meso/micro, footer 2-row sin overlap, todos los botones share/WhatsApp funcionales. 0 regresiones.


### Botón "Sesiones" — exportación independiente de sesiones específicas (Feb 2026)

**Continuación del flujo Master Report.** Nuevo botón "Sesiones" en el header de Plan Activo, al lado del botón "Reporte Maestro", que abre un modal selector de sesiones específicas para imprimirlas con el diseño clásico ReportLab del PDF de sesión.

**Backend** (`/app/backend/routes/sessions_export.py`, ~340 líneas, registrado en `server.py` con prefix `/api`):
- Helper `_build_session_pdf_bytes(session_data, athlete_name, meso_name, micro_name, week_number)` — replica exacta del PDF clásico de `/api/export/session-pdf` (Helvetica + ReportLab) con: header gradient azul, etiqueta meso·micro·semana, objetivos en grid 2x3, fases inicial/principal/final con tabla 8-col (Ejercicio · Cap.Física · Método · Series · Reps · Int. · Vol. · Recup.), monitoreo FC + estado del deportista, observaciones opcionales, footer iTRAIN.
- `POST /api/sessions-export/generate` body=`{plan_id, session_ids:[], format:"combined"|"zip", athlete_name?}`:
  - Carga plan con `_db.training_plans.find_one({id:plan_id, $or:[{user_id},{coach_id}]})`.
  - `_walk_plan_sessions()` itera todos los nodos plan→macro→meso→micro→session yieldando tuplas (session, meso_name, micro_name, week_number) en orden.
  - Filtra por `session_ids` y genera un PDF por sesión preservando el orden del plan.
  - `format="combined"` → merge con `pypdf.PdfWriter` en un único PDF (ej: 3 sesiones = 3 páginas).
  - `format="zip"` → `zipfile.ZipFile(ZIP_DEFLATED)` con un PDF por sesión, filenames `sesion_{date}_{slug}.pdf` (handler de duplicados con índice incremental).
- Validaciones: 400 si `session_ids` vacío, 400 si format inválido, 404 si plan no existe o ninguna session_id matchea, 401/403 sin token.

**Frontend** (`/app/frontend/src/components/SessionsExportModal.js`, ~290 líneas):
- Dialog full-feature con header gradient slate-900 + icono `CalendarDays` lima en cuadro brand. Counter pill "X de Y seleccionadas" en lima.
- Toolbar: "Seleccionar todas" / "Limpiar" + tag "Formato: PDF clásico de sesión (ReportLab)".
- Body grid: cards por mesociclo (border-left tematizado por color de fase) con header "M{N}" + meso name + phase + botón "Marcar todo (N)/Quitar todo". Cada microciclo dentro tiene su propio header con badge "SEMANA {N}" + botón "Todas (N)/Quitar". Sesiones en grid 1/2/3-col responsivo, cada card con checkbox, nombre, badges de Día/tipo/duración/ejercicios. Selected state: borde lima + bg lima/8.
- Footer: contador "X sesion{es} seleccionada{s}" + 3 botones (Cancelar / ZIP individual / PDF combinado).
- Reutiliza `GET /api/master-report/sessions-list/{plan_id}` para cargar el árbol.
- Descarga blob con `responseType:'blob'` + `URL.createObjectURL` + `<a download>`.
- data-testids: `header-sessions-export-btn`, `sessions-export-modal`, `sessions-export-counter`, `sessions-export-select-all`, `sessions-export-clear-all`, `sessions-export-meso-{id}`, `sessions-export-toggle-meso-{id}`, `sessions-export-micro-{id}`, `sessions-export-toggle-micro-{id}`, `sessions-export-card-{id}`, `sessions-export-checkbox-{id}`, `sessions-export-cancel-btn`, `sessions-export-zip-btn`, `sessions-export-combined-btn`.

**Integración** `DashboardPage.js`:
- Estado `isSessionsExportOpen` + import `SessionsExportModal`.
- Botón "Sesiones" (CalendarDays icon, borde sky-400) al lado de "Reporte" en el header (`data-testid="header-sessions-export-btn"`).
- Click sin activePlan → toast warning "Selecciona un plan activo primero".
- Modal montado al final del componente con props open/onOpenChange/plan=activePlan/athleteName.

**Validación** (`testing_agent_v3_fork iter_58`): 8/8 backend pytest PASS, frontend E2E 100% — botón visible, toast no-plan, modal abre con 55 cards correctamente agrupadas, counter actualiza, toggles meso/micro funcionan, descargas combined PDF (3 páginas válidas con %PDF- signature, filename `sesiones_<plan-slug>.pdf`) y ZIP (PK signature, filename `sesiones_<plan-slug>.zip`) verificadas. 0 regresiones.


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

---
## 2026-02 — Refinamiento de Branding LordTraining (Hero + Favicon)

**Cambios visuales aplicados:**
- Hero de la Landing rediseñado: escudo heráldico LordTraining (escudo dragones + lema "Ad Victoriam Per Disciplinam") ahora se muestra GRANDE (h-[200/240/280px]) en el lugar donde antes estaba el slogan textual.
- Slogan principal del hero cambiado de "Entrena con método. / Compite sin límites." a "**Por la disciplina, el método. / Por la victoria, el entrenamiento.**" (traducción del lema latino del escudo).
- Tamaño tipográfico del H1 reducido (de 2.25-3.25rem a 1.5-1.95rem) para que la frase larga quepa bien y el protagonismo lo tome el escudo.
- Favicon completo regenerado a partir de la nueva imagen de **escama de dragón con corona** (gota dorada con tonos verde/azul):
  - `favicon.ico` (multi-res 16/32/48/64)
  - `favicon-16.png`, `favicon-32.png`, `favicon-64.png`
  - `apple-touch-icon.png` (180px)
  - `logo192.png`, `logo512.png`
  - Asset master guardado en `/brand/lordtraining-scale.png`
- `locales/es.json`: actualizados los 4 fragmentos del headline (`headline_verb1`, `headline_rest1`, `headline_verb2`, `headline_rest2`).

**Archivos tocados:**
- `frontend/src/pages/LandingPage.js` (hero block ~líneas 511-525)
- `frontend/src/locales/es.json`
- `frontend/public/favicon.ico` + favicon-*.png + apple-touch-icon.png + logo192/512.png
- `frontend/public/brand/lordtraining-scale.png` (nuevo)

**Verificación:** Screenshot 1440x900 OK — escudo se ve correctamente posicionado, el slogan nuevo se lee claro en lima/blanco, el favicon del browser ahora es la escama de dragón.

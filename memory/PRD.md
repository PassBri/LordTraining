# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Shadcn UI + TailwindCSS
- Backend: FastAPI + MongoDB
- PDF: Playwright (Headless Chromium) en backend

## Implementado (Fork 12 - Abr 2026)

### Sistema de Carga, Metricas y Progresion (Abr 13, 2026)
- Panel colapsable "Carga y Progresion" en cada Activity Card
- Parametros de carga: subtipo, densidad, unidadIntensidad, complejidad, frecuencia
- Metricas auto-calculadas: Carga Total (vol*int), Carga Sesion (ser*vol*int), NeuroCarga, Zona FC, Zona Fuerza
- Config por capacidad: CAPACITY_CONFIG mapea cada capacidad a subtipos, unidades, flags
- Modelos de progresion: Lineal, Ondulada, Bloques, Conjugada
- Parametros progresion: tasaIncremento, semanaDescarga, reduccionDescarga
- Visualizacion MEV → MAV → MRV (grafico de barras 4 semanas)
- Badges reactivos en header colapsado (CT, Zona, NC)
- Calculos: calcMetricas(), calcProgresionSemanal()
- Zona Fuerza: >=85% Maxima, >=60% Hipertrofia, >=40% Explosiva, else Resistencia
- Zona FC: Z1-Z5 segun %FCmax
- NeuroCarga: complejidad * series * 10 (solo coordinativas/equilibrio/agilidad)
- Reflejado en SessionViewPage.js (enlace compartido) y PDF automaticamente

### Gestion completa de Materiales (Abr 13, 2026)
- Input para agregar materiales personalizados
- Tags editables (clic para editar) y eliminables (X)
- Popover con lista predefinida de 26 materiales + input custom
- Mejora visual de materiales en SessionViewPage.js

### Titulos de Fase prominentes (Abr 13, 2026)
- FASE INICIAL: fondo lime #CCFF00, FASE PRINCIPAL: fondo oscuro, FASE FINAL: fondo azul
- Tipografia Barlow Condensed 800, iconos unicos, badges conteo
- Fix hydration: cambiado button wrapper a div (evita button anidado)
- Agregado aria-describedby al DialogContent

## Implementado (Forks anteriores)
- Graficas FC profesionales (bezier, barras, mixtas, estilos linea)
- Persistencia sesiones en MongoDB (detailedData mapping)
- DM Sans + Barlow Condensed tipografia, header lime
- Compartir sesiones publicas (/s/:shareId)
- PDF via Playwright backend (/api/sessions/download-pdf/{share_id})
- Temas claro/oscuro para PDF
- Tablero tactico digital interactivo
- IA generativa para tacticas (GPT-4o-mini via Emergent)

## Pendiente
- P1: Fix hydration warning DashboardPage.js (tr/span nesting, recurrente x4)
- P1: Refactorizar DashboardPage.js (4500+ lineas)
- P1: Refactorizar SessionEditor.js (~1950 lineas)
- P2: Print, Share, Duplicate planes periodizacion
- P2: Exportar GIF tablero tactico
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

## Archivos clave
- /app/frontend/src/components/SessionEditor.js (~1955 lines)
- /app/frontend/src/pages/SessionViewPage.js
- /app/frontend/src/components/PeriodizationComplete.js
- /app/backend/server.py
- /app/frontend/src/pages/DashboardPage.js (>4500 lines, needs refactor)

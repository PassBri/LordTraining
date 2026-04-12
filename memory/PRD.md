# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 11 - Abr 2026)

### Rediseno SessionEditor — Branding Landing Page (Abr 12, 2026)
- Header oscuro #0a0a0f con logo lime circular (matching Landing navbar)
- Badge SES-XXX solido lime #9EFF00 con texto negro
- Input nombre de sesion 17px, weight 500, placeholder "Nombre de la sesion..."
- Estado unico: dropdown a la derecha (sin texto duplicado)
- Subtitulo Sesion/Semana/Meso al 35% opacidad
- Chip de duracion unificado (icono + "90 min" continuo)
- Subheader oscuro #12131a con dividers sutiles (0.5px, 12% opacity)
- Campo Carga est. con badge dinamico (Baja/Media/Alta) y "— Sin calcular" default
- Cards de secciones: headers con gradiente oscuro + icono lime #CCFF00
- Footer oscuro con boton Guardar lime #CCFF00
- Eliminada seccion standalone Pizarra Tactica (redundante con cards de actividad)
- Fuentes: Barlow Condensed (titulos/labels) + Inter (body)
- Paleta: #CCFF00, #9EFF00, #0a0a0f, slate-950

### Fork 10 (Feb 2026) — Consolidado
- Multi-sport 3D Tactical Board (white courts, 3D lines, nets/hoops)
- PNG export con aspect ratio correcto
- Expandable thumbnail row en Session Editor
- 5 horizontal Material Design cards (Medios, Carga, Intensidad, Materiales, Pizarra)
- Exercise Library picker con categorias/subcategorias
- Dashboard Herramientas con galeria en tiempo real via BroadcastChannel
- Fix boardId vs index para no sobreescribir pizarras

## Pendiente
- P1: Fix hydration warning en DashboardPage.js (recurrente x4)
- P1: Refactorizar DashboardPage.js (4500+ lineas)
- P2: Exportar PDF/GIF animacion del tablero tactico
- P2: Print, Share, Duplicate planes de entrenamiento
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

## Arquitectura
```
/app/frontend/src/components/SessionEditor.js  - Editor de sesion (~1850 lineas)
/app/frontend/src/pages/LandingPage.js         - Landing page (fuente de diseno)
/app/frontend/src/pages/DashboardPage.js       - Dashboard (>4500 lineas, necesita refactor)
/app/frontend/public/tactical-board.html       - Pizarra tactica standalone (~2700 lineas)
/app/backend/server.py                         - API FastAPI
```

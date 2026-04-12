# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 11 - Abr 2026)

### Correcciones Header SessionEditor (Abr 12, 2026)
- Textos subheader al 85% opacidad (antes eran ilegibles)
- Select "Tecnico-Tactico" con opciones fondo oscuro #12131a (antes blanco sin texto)
- Calendario con Popover + Calendar shadcn (antes input date nativo)
- Placeholders con 30% opacidad para distinguir de valores reales
- Clase CSS se-input para placeholders del subheader

### Rediseno SessionEditor — Branding Landing Page (Abr 12, 2026)
- Header oscuro #0a0a0f con logo lime circular (matching Landing navbar)
- Badge SES-XXX solido lime #9EFF00 con texto negro
- Input nombre 17px, weight 500, placeholder "Nombre de la sesion..."
- Estado unico dropdown (sin duplicado)
- Subtitulo al 35% opacidad
- Chip duracion unificado "90 min"
- Subheader oscuro con dividers sutiles 0.5px
- Carga est. con badge dinamico (Baja/Media/Alta) y "— Sin calcular" default
- Cards secciones: headers gradiente oscuro + icono lime #CCFF00
- Footer oscuro con boton Guardar lime #CCFF00
- Eliminada seccion standalone Pizarra Tactica (redundante)
- Fuentes: Barlow Condensed + Inter

### Fork 10 (Feb 2026) — Consolidado
- Multi-sport 3D Tactical Board
- PNG export, 5-card layout, Exercise Library picker
- Dashboard Herramientas con galeria BroadcastChannel

## Pendiente
- P1: Fix hydration warning en DashboardPage.js (recurrente x4)
- P1: Refactorizar DashboardPage.js (4500+ lineas)
- P2: Exportar PDF/GIF animacion del tablero tactico
- P2: Print, Share, Duplicate planes de entrenamiento
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

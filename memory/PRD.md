# iTRAIN - Plataforma de Gestión Deportiva

## Credenciales: test@train.com / test123456

## Implementado (Fork 11 - Abr 2026)

### Persistencia de datos de sesión (Abr 12, 2026)
- Backend: campo detailed_data (Dict) en TrainingPlanSession
- Frontend: handleSaveSession persiste al backend via savePlanToAPI (PUT)
- Mapeo bidireccional: sessionData ↔ detailed_data en API
- Props corregidas: SessionEditor recibe session.detailedData correctamente
- Datos se restauran al reabrir la sesión (nombre, objetivos, fases, monitoreo, etc.)

### Correcciones tipográficas SessionEditor (Abr 12, 2026)
- Fuente DM Sans (400/500/600), jerarquía 3 niveles, tildes correctas
- Fases en #9EFF00 uppercase 11px/600

### Rediseño SessionEditor — Branding Landing Page (Abr 12, 2026)
- Header oscuro, logo lime, badge SES sólido, calendario Popover
- Footer oscuro con botón Guardar lime, eliminada Pizarra Táctica standalone

### Fork 10 (Feb 2026)
- Multi-sport 3D Tactical Board, 5-card layout, Exercise Library picker
- Dashboard Herramientas con galería BroadcastChannel

## Pendiente
- P1: Fix hydration warning en DashboardPage.js (recurrente x4)
- P1: Refactorizar DashboardPage.js (4500+ líneas)
- P2: Exportar PDF/GIF animación del tablero táctico
- P2: Print, Share, Duplicate planes
- P3: Diseño responsivo tablero táctico
- P3: Fotos avatares 3D

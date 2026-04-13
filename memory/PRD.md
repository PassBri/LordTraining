# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Shadcn UI + TailwindCSS
- Backend: FastAPI + MongoDB
- PDF: Playwright (Headless Chromium) en backend

## Implementado (Fork 12 - Abr 2026)

### Grafico MEV-MAV-MRV movido al Mesociclo (Abr 13, 2026)
- Removido de la Activity Card individual (SessionEditor.js)
- Agregado en PeriodizationComplete.js dentro del mesociclo expandido
- Calcula series totales por microciclo sumando actividades de sesiones
- Cada barra = 1 microciclo/semana
- Zonas coloreadas: MEV (lime), MAV (cyan), MRV (rosa), Descarga (violeta)
- Tooltip educativo con explicacion MEV/MAV/MRV
- Tooltip por barra con zona, series totales, sesiones y carga
- Ubicacion correcta segun teoria de entrenamiento deportivo

### Paleta Premium (Abr 13, 2026)
- Barras cyan electrico, descarga violeta, fondo gradiente azulado
- Metricas con bordes coloreados sutiles
- Glow effects y gradientes multi-stop

### Volumen/Intensidad dinamicos por capacidad (Abr 13, 2026)
### Sistema Carga/Metricas/Progresion (Abr 13, 2026)
### Materiales + Titulos Fase (Abr 13, 2026)

## Pendiente
- P1: Fix hydration warning DashboardPage.js
- P1: Refactorizar DashboardPage.js (4500+ lineas)
- P1: Refactorizar SessionEditor.js (~2000 lineas)
- P2: Print, Share, Duplicate planes periodizacion
- P2: Exportar GIF tablero tactico
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

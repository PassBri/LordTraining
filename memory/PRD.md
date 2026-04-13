# iTRAIN - Plataforma de Gestion Deportiva

## Credenciales: test@train.com / test123456

## Arquitectura
- Frontend: React + Shadcn UI + TailwindCSS
- Backend: FastAPI + MongoDB
- PDF: Playwright (Headless Chromium) en backend

## Implementado (Fork 12 - Abr 2026)

### Retoque Material Design Activity Cards (Abr 13, 2026)
- Descripcion: 13px (antes 12px), border mas visible
- Metodo/Organizativo pills: h-7 con 10px (antes h-6 con 9px)
- Material tags: gap-2, 11px, pl-3 pr-2 py-1.5 (antes gap-1.5, 10px, px-2.5 py-1)
- Intensidad label: 9px con unidad visible (antes 7px)
- Intensidad valor: 16px (antes 14px)
- Barra intensidad: h-2.5 (antes h-2)
- Stats cards: p-3, gap-2.5, labels 8px, valores 14px (antes p-2.5, gap-2, 7px, 13px)
- Pizarra label: 9px, icono 5x5
- Panel avanzado labels: 9px semibold (antes 8px bold)
- Panel avanzado inputs: h-8, 11px (antes h-7, 10px)
- Metricas valores: 16px (antes 14px), padding p-3
- Progresion section: fondo bg-slate-50, borders mas visibles
- MEV chart: 48px alto, labels S1-S4 en 9px semibold (antes 7px)
- Spacing general: gap-3, space-y-4 en todo el panel

### Volumen e Intensidad dinamicos por capacidad (Abr 13, 2026)
- CAPACITY_CONFIG ahora incluye: unidadesVol, volLabel, volPh, serPh, intRef, denPh, recPh, freqPh
- Stats grid muestra labels y placeholders segun capacidad fisica
- Intensidad muestra unidad (%1RM, %FCmax, %Vmax, ROM, Escala 1-5)
- Ref de intensidad cambia segun capacidad (85-100%, Z1-Z5, Maxima, etc.)
- Selector de Unidad Volumen y Unidad Intensidad en panel avanzado

### Sistema de Carga, Metricas y Progresion (Abr 13, 2026)
- Panel colapsable con metricas auto-calculadas
- Modelos progresion: Lineal, Ondulada, Bloques, Conjugada
- Visualizacion MEV-MAV-MRV

### Gestion completa de Materiales (Abr 13, 2026)
- Agregar custom, editar, eliminar materiales

### Titulos de Fase prominentes (Abr 13, 2026)
- FASE INICIAL lime, FASE PRINCIPAL oscuro, FASE FINAL azul

## Pendiente
- P1: Fix hydration warning DashboardPage.js (tr/span nesting)
- P1: Refactorizar DashboardPage.js (4500+ lineas)
- P1: Refactorizar SessionEditor.js (~2000 lineas)
- P2: Print, Share, Duplicate planes periodizacion
- P2: Exportar GIF tablero tactico
- P3: Diseno responsivo tablero tactico
- P3: Fotos avatares 3D

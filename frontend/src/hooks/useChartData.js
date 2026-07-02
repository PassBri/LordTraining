/**
 * Hooks reactivos para graficas.
 * Cada hook usa selectores granulares de Zustand para re-renderizar
 * SOLO cuando cambian los datos que le interesan.
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import usePlanStore from '../stores/planStore';
import {
  adaptarDatosPeriodizacion,
  adaptarDatosACWR,
  adaptarDatosRadar,
  adaptarDatosHeatmap,
  adaptarDatosProgresion,
  adaptarDatosGantt,
} from '../utils/chartDataAdapters';

export function usePeriodizationChart() {
  const macrociclos = usePlanStore(useShallow(s => s.macrociclos));
  return useMemo(() => adaptarDatosPeriodizacion(macrociclos), [macrociclos]);
}

export function useACWRChart() {
  const historicoCarga = usePlanStore(useShallow(s => s.historicoCarga));
  return useMemo(() => adaptarDatosACWR(historicoCarga), [historicoCarga]);
}

export function useRadarChart() {
  const capacidades = usePlanStore(useShallow(s => s.capacidades));
  return useMemo(() => adaptarDatosRadar(capacidades), [capacidades]);
}

export function useHeatmapChart() {
  const microciclos = usePlanStore(useShallow(s => s.microciclos));
  const sesiones = usePlanStore(useShallow(s => s.sesiones));
  return useMemo(() => adaptarDatosHeatmap(microciclos, sesiones), [microciclos, sesiones]);
}

export function useProgresionChart(capacidadTipo) {
  const mesociclos = usePlanStore(useShallow(s => s.mesociclos));
  const microciclos = usePlanStore(useShallow(s => s.microciclos));
  const sesiones = usePlanStore(useShallow(s => s.sesiones));
  const ejercicios = usePlanStore(useShallow(s => s.ejercicios));
  const capacidades = usePlanStore(useShallow(s => s.capacidades));
  const cap = capacidades.find(c => c.capacidad_tipo === capacidadTipo) || null;
  return useMemo(
    () => adaptarDatosProgresion(mesociclos, microciclos, sesiones, ejercicios, capacidadTipo, cap),
    [mesociclos, microciclos, sesiones, ejercicios, capacidadTipo, cap]
  );
}

export function useGanttChart() {
  const plan = usePlanStore(useShallow(s => s.plan));
  const macrociclos = usePlanStore(useShallow(s => s.macrociclos));
  const mesociclos = usePlanStore(useShallow(s => s.mesociclos));
  const microciclos = usePlanStore(useShallow(s => s.microciclos));
  const sesiones = usePlanStore(useShallow(s => s.sesiones));
  return useMemo(() => adaptarDatosGantt(plan, macrociclos, mesociclos, microciclos, sesiones), [plan, macrociclos, mesociclos, microciclos, sesiones]);
}

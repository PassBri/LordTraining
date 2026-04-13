/**
 * Adaptadores de datos para graficas.
 * Transforman datos del store Zustand al formato que necesita cada componente Recharts/SVG.
 * Regla: _calculado tiene prioridad. Si no existe, usar _objetivo.
 */

const r = (v, d = 1) => v != null ? Math.round(v * (10 ** d)) / (10 ** d) : 0;

// ── PERIODIZACION ──
export function adaptarDatosPeriodizacion(macrociclos = []) {
  return macrociclos.map(m => ({
    id: m.id,
    nombre: m.nombre || 'Macro',
    semanas: m.duracion_semanas || 1,
    color: m.color || '#3B82F6',
    volumen: r(m.vol_calculado || m.vol_objetivo),
    intensidad: r(m.int_calculado || m.int_objetivo),
    densidad: r(m.den_calculado || m.den_objetivo, 2),
    carga: r(m.carga_total),
    ACWR: r(m.ACWR, 2),
    progreso: r(m.progreso_porcentaje),
    alerta: m.alerta || null,
    RPE: r(m.RPE_promedio),
  }));
}

// ── ACWR ──
export function adaptarDatosACWR(historico = []) {
  const sorted = [...historico].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  return sorted.map((h, i) => {
    const slice7 = sorted.slice(Math.max(0, i - 6), i + 1);
    const slice28 = sorted.slice(Math.max(0, i - 27), i + 1);
    const aguda = slice7.reduce((s, x) => s + (x.carga_diaria || 0), 0) / (slice7.length || 1);
    const cronica = slice28.reduce((s, x) => s + (x.carga_diaria || 0), 0) / (slice28.length || 1);
    const acwr = cronica > 0 ? aguda / cronica : 0;
    return {
      fecha: (h.fecha || '').slice(0, 10),
      carga_diaria: r(h.carga_diaria),
      carga_aguda: r(aguda),
      carga_cronica: r(cronica),
      acwr: r(acwr, 2),
    };
  });
}

export const ACWR_ZONAS = {
  peligro: { min: 1.5, max: 3, color: '#FEE2E2', stroke: '#EF4444', label: 'Peligro' },
  atencion: { min: 1.3, max: 1.5, color: '#FEF3C7', stroke: '#F59E0B', label: 'Atencion' },
  optimo: { min: 0.8, max: 1.3, color: '#D1FAE5', stroke: '#10B981', label: 'Optimo' },
  subcarga: { min: 0, max: 0.8, color: '#F1F5F9', stroke: '#94A3B8', label: 'Subcarga' },
};

// ── RADAR DE CAPACIDADES ──
const CAP_LABELS = {
  fuerza_maxima: 'Fuerza Max',
  fuerza_explosiva: 'F.Explosiva',
  fuerza_resistencia: 'F.Resistencia',
  resistencia_aerobica: 'R.Aerobica',
  resistencia_anaerobica: 'R.Anaerobica',
  velocidad: 'Velocidad',
  flexibilidad: 'Flexibilidad',
  coordinacion: 'Coordinacion',
  agilidad: 'Agilidad',
  potencia: 'Potencia',
};

export function adaptarDatosRadar(capacidades = []) {
  if (!capacidades.length) return [];
  return capacidades.map(c => ({
    capacidad: CAP_LABELS[c.capacidad_tipo] || c.capacidad_tipo,
    tipo: c.capacidad_tipo,
    actual: r(c.series_actuales_semana),
    MAV: r(c.MAV),
    MRV: r(c.MRV),
    MEV: r(c.MEV),
  }));
}

// ── HEATMAP CARGA SEMANAL ──
export function adaptarDatosHeatmap(microciclos = [], sesiones = []) {
  return microciclos.map(m => {
    const microSesiones = sesiones.filter(s => s.microciclo_id === m.id);
    const dias = [0, 0, 0, 0, 0, 0, 0]; // L M X J V S D
    microSesiones.forEach(s => {
      const idx = Math.min((s.orden_dia || 1) - 1, 6);
      dias[idx] = s.carga_sesion || 0;
    });
    return {
      semana: m.numero_semana,
      tipo: m.tipo,
      carga_total: r(m.carga_total),
      ACWR: r(m.ACWR, 2),
      dias,
    };
  });
}

export function colorCarga(valor) {
  if (valor <= 0) return '#F8FAFC';
  if (valor < 200) return '#DBEAFE';
  if (valor < 400) return '#60A5FA';
  if (valor < 600) return '#2563EB';
  return '#1E3A8A';
}

// ── PROGRESION POR CAPACIDAD ──
export function adaptarDatosProgresion(mesociclos = [], microciclos = [], sesiones = [], ejercicios = [], capacidadTipo = 'fuerza_maxima', capacidadPlan = null) {
  const data = [];
  const mesosSorted = [...mesociclos].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  mesosSorted.forEach(meso => {
    const mesoMicros = microciclos.filter(m => m.mesociclo_id === meso.id);
    mesoMicros.forEach(micro => {
      const microSesiones = sesiones.filter(s => s.microciclo_id === micro.id);
      let totalSeries = 0;
      let totalVol = 0;
      let totalInt = 0;
      let count = 0;
      microSesiones.forEach(s => {
        const ejs = ejercicios.filter(e => e.sesion_id === s.id && e.capacidad_tipo === capacidadTipo);
        ejs.forEach(e => {
          totalSeries += e.series || 0;
          totalVol += e.vol_relativo || 0;
          totalInt += e.porcentaje_1RM || (e.RPE_ejercicio * 10) || 0;
          count++;
        });
      });
      data.push({
        label: `S${micro.numero_semana}`,
        semana: micro.numero_semana,
        series: totalSeries,
        volumen: r(totalVol),
        intensidad: count > 0 ? r(totalInt / count) : 0,
        carga: r(micro.carga_total),
      });
    });
  });

  return {
    data,
    MEV: capacidadPlan?.MEV || 0,
    MAV: capacidadPlan?.MAV || 0,
    MRV: capacidadPlan?.MRV || 0,
  };
}

// ── GANTT / TIMELINE ──
export function adaptarDatosGantt(plan, macrociclos = [], mesociclos = []) {
  if (!plan) return { niveles: [], totalSemanas: 0 };
  const totalSemanas = plan.duracion_semanas || macrociclos.reduce((s, m) => s + (m.duracion_semanas || 0), 0) || 52;

  let weekOffset = 0;
  const macrosBloques = macrociclos.map(m => {
    const inicio = weekOffset;
    weekOffset += m.duracion_semanas || 0;
    return { id: m.id, inicio, fin: weekOffset, label: m.nombre, color: m.color || '#3B82F6', vol: r(m.vol_calculado || m.vol_objetivo), int: r(m.int_calculado || m.int_objetivo), alerta: m.alerta };
  });

  const mesosBloques = [];
  const descargasBloques = [];
  let mesoWeekOffset = 0;
  macrociclos.forEach(macro => {
    const macroMesos = mesociclos.filter(m => m.macrociclo_id === macro.id).sort((a, b) => (a.orden || 0) - (b.orden || 0));
    macroMesos.forEach(meso => {
      const inicio = mesoWeekOffset;
      mesoWeekOffset += meso.duracion_semanas || 0;
      const MESO_COLORS = { entrante: '#94A3B8', basico_desarrollador: '#3B82F6', basico_estabilizador: '#10B981', precompetitivo: '#F59E0B', competitivo: '#EF4444', recuperacion: '#A78BFA' };
      mesosBloques.push({ id: meso.id, inicio, fin: mesoWeekOffset, label: meso.nombre, color: MESO_COLORS[meso.tipo] || '#64748B', vol: r(meso.vol_calculado), int: r(meso.int_calculado) });
      if (meso.semana_descarga) {
        descargasBloques.push({ inicio: inicio + (meso.semana_descarga - 1), fin: inicio + meso.semana_descarga, label: 'Descarga', color: '#5AB88A' });
      }
    });
  });

  return {
    totalSemanas,
    niveles: [
      { nombre: 'Plan', bloques: [{ id: plan.id, inicio: 0, fin: totalSemanas, label: plan.nombre, color: '#1D6FD1' }] },
      { nombre: 'Macrociclos', bloques: macrosBloques },
      { nombre: 'Mesociclos', bloques: mesosBloques },
      { nombre: 'Descargas', bloques: descargasBloques },
    ]
  };
}

/**
 * Store Zustand para el sistema de periodizacion unificado.
 * Maneja el arbol completo: Plan -> Macro -> Meso -> Micro -> Sesion -> Ejercicio
 * Cada accion CRUD dispara propagacion automatica via API.
 * Incluye estado UI para graficas (metricaTab, ganttZoom, capacidadFiltro).
 */
import { create } from 'zustand';

const API = process.env.REACT_APP_BACKEND_URL;

const usePlanStore = create((set, get) => ({
  // ============ STATE ============
  plan: null,
  macrociclos: [],
  mesociclos: [],
  microciclos: [],
  sesiones: [],
  ejercicios: [],
  capacidades: [],
  alertas: [],
  metricas: {},
  historicoCarga: [],

  // UI State
  vistaActual: 'macro',
  capacidadFiltro: 'todas',
  metricaGrafico: 'volumen',
  macrocicloExpandido: null,
  ganttZoom: 'todo',
  loading: false,
  error: null,

  // ============ HELPERS ============
  _getToken: () => {
    try {
      const stored = localStorage.getItem('train_token') || localStorage.getItem('token');
      return stored || '';
    } catch { return ''; }
  },

  _headers: () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${get()._getToken()}`
  }),

  // ============ SYNC V1 -> V2 ============
  syncFromV1: async (v1PlanId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/v2/sync-from-v1/${v1PlanId}`, {
        method: 'POST',
        headers: get()._headers()
      });
      if (!res.ok) { set({ loading: false }); return null; }
      const data = await res.json();
      if (data.plan_id) {
        await get().cargarPlanCompleto(data.plan_id);
      }
      set({ loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  getV2Metrics: (nivel, id) => {
    const state = get();
    const collections = { macro: state.macrociclos, meso: state.mesociclos, micro: state.microciclos, sesion: state.sesiones };
    return (collections[nivel] || []).find(i => i.id === id) || null;
  },

  getV2MicroByWeek: (weekNum) => get().microciclos.find(m => m.numero_semana === weekNum) || null,

  // ============ CARGAR PLAN COMPLETO ============
  cargarPlanCompleto: async (planId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/v2/planes/${planId}/completo`, { headers: get()._headers() });
      if (!res.ok) throw new Error('Error cargando plan');
      const data = await res.json();
      set({
        plan: data.plan,
        macrociclos: data.macrociclos || [],
        mesociclos: data.mesociclos || [],
        microciclos: data.microciclos || [],
        sesiones: data.sesiones || [],
        ejercicios: data.ejercicios || [],
        capacidades: data.capacidades || [],
        alertas: data.alertas || [],
        metricas: data.metricas || {},
        loading: false
      });
      // Also load historico in background
      get().cargarHistorico(planId);
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  // ============ CARGAR HISTORICO CARGAS ============
  cargarHistorico: async (planId) => {
    try {
      const res = await fetch(`${API}/api/v2/planes/${planId}/historico?dias=200`, { headers: get()._headers() });
      if (!res.ok) return;
      const data = await res.json();
      set({ historicoCarga: data.cargas || [] });
    } catch { /* silent */ }
  },

  // ============ ACCIONES CRUD CON PROPAGACION ============
  actualizarEjercicio: async (ejId, cambios) => {
    try {
      const res = await fetch(`${API}/api/v2/ejercicios-sesion/${ejId}`, { method: 'PUT', headers: get()._headers(), body: JSON.stringify(cambios) });
      if (!res.ok) throw new Error('Error actualizando ejercicio');
      const result = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return result;
    } catch (err) { set({ error: err.message }); return null; }
  },

  agregarEjercicio: async (sesionId, ejercicio) => {
    try {
      const res = await fetch(`${API}/api/v2/sesiones/${sesionId}/ejercicios`, { method: 'POST', headers: get()._headers(), body: JSON.stringify(ejercicio) });
      if (!res.ok) throw new Error('Error agregando ejercicio');
      const result = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return result;
    } catch (err) { set({ error: err.message }); return null; }
  },

  eliminarEjercicio: async (ejId) => {
    try {
      const res = await fetch(`${API}/api/v2/ejercicios-sesion/${ejId}`, { method: 'DELETE', headers: get()._headers() });
      if (!res.ok) throw new Error('Error eliminando ejercicio');
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return true;
    } catch (err) { set({ error: err.message }); return false; }
  },

  actualizarSesion: async (sesionId, cambios) => {
    try {
      const res = await fetch(`${API}/api/v2/sesiones/${sesionId}`, { method: 'PUT', headers: get()._headers(), body: JSON.stringify(cambios) });
      if (!res.ok) throw new Error('Error actualizando sesion');
      const result = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return result;
    } catch (err) { set({ error: err.message }); return null; }
  },

  actualizarMicrociclo: async (microId, cambios) => {
    try {
      const res = await fetch(`${API}/api/v2/microciclos/${microId}`, { method: 'PUT', headers: get()._headers(), body: JSON.stringify(cambios) });
      if (!res.ok) throw new Error('Error actualizando microciclo');
      const result = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return result;
    } catch (err) { set({ error: err.message }); return null; }
  },

  actualizarMesociclo: async (mesoId, cambios) => {
    try {
      const res = await fetch(`${API}/api/v2/mesociclos/${mesoId}`, { method: 'PUT', headers: get()._headers(), body: JSON.stringify(cambios) });
      if (!res.ok) throw new Error('Error actualizando mesociclo');
      const result = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return result;
    } catch (err) { set({ error: err.message }); return null; }
  },

  actualizarMacrociclo: async (macroId, cambios) => {
    try {
      const res = await fetch(`${API}/api/v2/macrociclos/${macroId}`, { method: 'PUT', headers: get()._headers(), body: JSON.stringify(cambios) });
      if (!res.ok) throw new Error('Error actualizando macrociclo');
      const result = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return result;
    } catch (err) { set({ error: err.message }); return null; }
  },

  // ============ CREAR ESTRUCTURAS ============
  crearPlan: async (planData) => {
    try {
      const res = await fetch(`${API}/api/v2/planes`, { method: 'POST', headers: get()._headers(), body: JSON.stringify(planData) });
      if (!res.ok) throw new Error('Error creando plan');
      const plan = await res.json();
      set({ plan });
      return plan;
    } catch (err) { set({ error: err.message }); return null; }
  },

  agregarMesociclo: async (macroId, mesoData) => {
    try {
      const res = await fetch(`${API}/api/v2/macrociclos/${macroId}/mesociclos`, { method: 'POST', headers: get()._headers(), body: JSON.stringify(mesoData) });
      if (!res.ok) throw new Error('Error agregando mesociclo');
      const meso = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return meso;
    } catch (err) { set({ error: err.message }); return null; }
  },

  generarMicrociclos: async (mesoId) => {
    try {
      const res = await fetch(`${API}/api/v2/mesociclos/${mesoId}/microciclos`, { method: 'POST', headers: get()._headers() });
      if (!res.ok) throw new Error('Error generando microciclos');
      const result = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return result;
    } catch (err) { set({ error: err.message }); return null; }
  },

  agregarSesion: async (microId, sesionData) => {
    try {
      const res = await fetch(`${API}/api/v2/microciclos/${microId}/sesiones`, { method: 'POST', headers: get()._headers(), body: JSON.stringify(sesionData) });
      if (!res.ok) throw new Error('Error agregando sesion');
      const sesion = await res.json();
      if (get().plan?.id) await get().cargarPlanCompleto(get().plan.id);
      return sesion;
    } catch (err) { set({ error: err.message }); return null; }
  },

  // ============ ACCIONES UI ============
  setVista: (nivel) => set({ vistaActual: nivel }),
  setCapacidadFiltro: (capacidad) => set({ capacidadFiltro: capacidad }),
  setMetricaGrafico: (metrica) => set({ metricaGrafico: metrica }),
  setGanttZoom: (zoom) => set({ ganttZoom: zoom }),
  toggleMacrociclo: (id) => set((state) => ({
    macrocicloExpandido: state.macrocicloExpandido === id ? null : id
  })),

  // ============ COMPUTED (GETTERS) ============
  getMetricasPorNivel: (nivel, id) => {
    const state = get();
    const collections = { macro: state.macrociclos, meso: state.mesociclos, micro: state.microciclos, sesion: state.sesiones, ejercicio: state.ejercicios };
    const item = (collections[nivel] || []).find(i => i.id === id);
    if (!item) return null;
    return {
      vol: item.vol_calculado || item.vol_objetivo || 0,
      int: item.int_calculado || item.int_objetivo || 0,
      den: item.den_calculado || item.den_objetivo || 0,
      carga: item.carga_total || item.carga_sesion || 0,
      tonelaje: item.tonelaje_kg || item.tonelaje || item.tonelaje_calculado || 0,
      RPE: item.RPE_promedio || item.RPE_sesion || item.RPE_ejercicio || 0,
      ACWR: item.ACWR || 0,
      progreso: item.progreso_porcentaje || 0
    };
  },

  getAlertasActivas: () => get().alertas.filter(a => !a.resuelta),
  getCapacidadesActivas: () => get().capacidades.filter(c => c.series_actuales_semana > 0),
  getMesociclosPorMacro: (macroId) => get().mesociclos.filter(m => m.macrociclo_id === macroId),
  getMicrociclosPorMeso: (mesoId) => get().microciclos.filter(m => m.mesociclo_id === mesoId),
  getSesionesPorMicro: (microId) => get().sesiones.filter(s => s.microciclo_id === microId),
  getEjerciciosPorSesion: (sesionId) => get().ejercicios.filter(e => e.sesion_id === sesionId),

  getDatosGrafico: () => {
    const state = get();
    const metrica = state.metricaGrafico;
    const campo = { volumen: 'vol_calculado', intensidad: 'int_calculado', densidad: 'den_calculado', carga: 'carga_total' }[metrica] || 'vol_calculado';
    if (state.vistaActual === 'macro') return state.macrociclos.map(m => ({ nombre: m.nombre, valor: m[campo] || m[campo.replace('calculado', 'objetivo')] || 0, objetivo: m[campo.replace('calculado', 'objetivo')] || 0, color: m.color }));
    if (state.vistaActual === 'meso') { const macroId = state.macrocicloExpandido || state.macrociclos[0]?.id; return state.mesociclos.filter(m => m.macrociclo_id === macroId).map(m => ({ nombre: m.nombre, valor: m[campo] || 0, objetivo: m[campo.replace('calculado', 'objetivo')] || 0 })); }
    if (state.vistaActual === 'micro') return state.microciclos.map(m => ({ nombre: `S${m.numero_semana}`, valor: m[campo] || 0, tipo: m.tipo, ACWR: m.ACWR }));
    return [];
  },

  reset: () => set({
    plan: null, macrociclos: [], mesociclos: [], microciclos: [],
    sesiones: [], ejercicios: [], capacidades: [], alertas: [],
    metricas: {}, historicoCarga: [], vistaActual: 'macro',
    macrocicloExpandido: null, loading: false, error: null
  })
}));

export default usePlanStore;

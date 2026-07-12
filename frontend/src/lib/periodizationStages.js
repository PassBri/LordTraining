// Clasificador de etapas de periodización compartido por GraphicPlan (rutas V1 y V2).
// Convierte el vocabulario heterogéneo de fases de cada modelo (Tradicional, ATR,
// Bloques, Ondulatorio, Conjugado, Trifásico, etc.) a las etapas canónicas que
// muestra el Plan Gráfico: "Tipo de etapa" (macro) y "Etapa" (período).

// Tipo de meso → macrociclo canónico (señal primaria, común a TODOS los modelos)
export const MESO_TO_MACRO = {
  entrante: 'preparatory_general',
  basico_desarrollador: 'preparatory_general',
  basico_estabilizador: 'preparatory_specific',
  precompetitivo: 'precompetitive',
  competitivo: 'competitive',
  recuperacion: 'transition',
};

// Fase (id del modelo) → macrociclo canónico (señal secundaria / respaldo)
const PHASE_TO_MACRO = {
  // Tradicional (Matveiev)
  prep_general: 'preparatory_general',
  preparatory_general: 'preparatory_general',
  prep_specific: 'preparatory_specific',
  preparatory_specific: 'preparatory_specific',
  precompetitive: 'precompetitive',
  precompetitivo: 'precompetitive',
  competitive: 'competitive',
  competitivo: 'competitive',
  transition: 'transition',
  transicion: 'transition',
  // ATR (Issurin)
  accumulation: 'preparatory_general',
  transformation: 'preparatory_specific',
  realization: 'competitive',
  recovery: 'transition',
  // Bloques Concentrados (Verkhoshansky)
  block_a: 'preparatory_general',
  block_b: 'preparatory_specific',
  block_c: 'precompetitive',
  competition: 'competitive',
  // Ondulatorio diario / semanal
  hypertrophy: 'preparatory_general',
  strength: 'preparatory_specific',
  intensification: 'preparatory_specific',
  power: 'precompetitive',
  deload: 'transition',
  // Conjugado (Westside)
  max_effort: 'preparatory_general',
  dynamic_effort: 'preparatory_specific',
  repetition: 'precompetitive',
  // Trifásico (Dietz)
  eccentric: 'preparatory_general',
  isometric: 'preparatory_specific',
  concentric: 'precompetitive',
  // Contemporáneo / genéricos
  multilateral: 'preparatory_general',
  general: 'preparatory_general',
  base: 'preparatory_general',
  specific: 'preparatory_specific',
  peak: 'competitive',
  peaking: 'precompetitive',
  taper: 'precompetitive',
};

// Macrociclo canónico → período ("Etapa")
export const MACRO_TO_PERIOD = {
  preparatory_general: 'preparatorio',
  preparatory_specific: 'preparatorio',
  precompetitive: 'competitivo',
  competitive: 'competitivo',
  transition: 'transicion',
};

// Respaldo por palabras clave cuando el id no está en las tablas
function macroFromKeyword(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return null;
  if (/(transit|transic|recov|recuper|deload|descarg|\brest\b|regen|\boff\b)/.test(s)) return 'transition';
  if (/(precomp|\btaper\b|peaking|\bpower\b|poten|block_c|realiz)/.test(s)) {
    // "realización" es competitiva; el resto son precompetitivas
    return /realiz/.test(s) ? 'competitive' : 'precompetitive';
  }
  if (/(compet|competit|peak|final)/.test(s)) return 'competitive';
  if (/(spec|específ|especif|transform|strength|fuerza|inten|estabiliz|block_b)/.test(s)) return 'preparatory_specific';
  if (/(accum|acumul|prep|general|base|hyper|hipertrof|anatom|desarroll|multilat|block_a)/.test(s)) return 'preparatory_general';
  return null;
}

// Devuelve { macro, period } canónicos usando meso.tipo como señal primaria
// y phaseId como respaldo.
export function classifyStage({ phaseId, mesoType } = {}) {
  let macro =
    MESO_TO_MACRO[String(mesoType || '').toLowerCase()] ||
    PHASE_TO_MACRO[String(phaseId || '').toLowerCase()] ||
    macroFromKeyword(phaseId) ||
    macroFromKeyword(mesoType) ||
    'preparatory_general';
  return { macro, period: MACRO_TO_PERIOD[macro] || 'preparatorio' };
}

// Normaliza tipo de meso a un id conocido de MESOCYCLE_TYPES
export function normalizeMesoType(raw) {
  const s = String(raw || '').toLowerCase();
  const known = ['entrante', 'basico_desarrollador', 'basico_estabilizador', 'precompetitivo', 'competitivo', 'recuperacion'];
  if (known.includes(s)) return s;
  const macro = MESO_TO_MACRO[s] ? s : null;
  if (macro) return macro;
  // Mapear desde palabra clave de fase
  const m = classifyStage({ phaseId: raw }).macro;
  const back = { preparatory_general: 'basico_desarrollador', preparatory_specific: 'basico_estabilizador', precompetitive: 'precompetitivo', competitive: 'competitivo', transition: 'recuperacion' };
  return back[m] || 'basico_desarrollador';
}

// Normaliza tipo de micro a un id conocido de MICROCYCLE_TYPES
export function normalizeMicroType(raw) {
  const s = String(raw || '').toLowerCase();
  const known = ['corriente', 'carga', 'choque', 'competitivo', 'aproximacion', 'restablecimiento'];
  if (known.includes(s)) return s;
  const legacy = { ordinario: 'corriente', recuperacion: 'restablecimiento', descarga: 'restablecimiento', shock: 'choque', load: 'carga' };
  return legacy[s] || 'corriente';
}

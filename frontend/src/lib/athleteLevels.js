// Niveles canónicos del deportista (deben coincidir con LEVEL_LOAD_TEMPLATES del backend)
export const CANONICAL_LEVELS = ['principiante', 'amateur', 'semiprofesional', 'profesional', 'elite'];

// Mapea cualquier valor libre del nivel de un atleta a un nivel canónico (5).
export function mapToCanonicalLevel(raw, fallback = 'amateur') {
  if (!raw) return fallback;
  const s = String(raw).trim().toLowerCase();
  if (CANONICAL_LEVELS.includes(s)) return s;
  if (/(princip|begin|novato|inicial)/.test(s)) return 'principiante';
  if (/(semi)/.test(s)) return 'semiprofesional';
  if (/(amateur|aficion|recreat)/.test(s)) return 'amateur';
  if (/(elite|élite|olimp|olímp)/.test(s)) return 'elite';
  if (/(profesion|pro\b|advanced|avanz|experto)/.test(s)) return 'profesional';
  if (/(intermedi|interme)/.test(s)) return 'semiprofesional';
  return fallback;
}

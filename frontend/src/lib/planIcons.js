import {
  Dumbbell, Bike, Waves, Footprints, Target, Trophy, Zap, Mountain,
  Snowflake, Flame, Shield, Swords, Goal, Medal, Timer, Award, Flag,
  Rocket, Star, Activity, Heart, PersonStanding,
} from 'lucide-react';

// Íconos lucide disponibles para representar un plan
export const PLAN_ICONS = [
  { key: 'dumbbell', Icon: Dumbbell, label: 'Fuerza' },
  { key: 'footprints', Icon: Footprints, label: 'Carrera' },
  { key: 'bike', Icon: Bike, label: 'Ciclismo' },
  { key: 'waves', Icon: Waves, label: 'Natación' },
  { key: 'swords', Icon: Swords, label: 'Combate' },
  { key: 'shield', Icon: Shield, label: 'Defensa' },
  { key: 'goal', Icon: Goal, label: 'Equipo' },
  { key: 'target', Icon: Target, label: 'Precisión' },
  { key: 'mountain', Icon: Mountain, label: 'Montaña' },
  { key: 'snowflake', Icon: Snowflake, label: 'Invierno' },
  { key: 'flame', Icon: Flame, label: 'Intensidad' },
  { key: 'zap', Icon: Zap, label: 'Potencia' },
  { key: 'activity', Icon: Activity, label: 'Acondicionamiento' },
  { key: 'heart', Icon: Heart, label: 'Salud' },
  { key: 'timer', Icon: Timer, label: 'Resistencia' },
  { key: 'person', Icon: PersonStanding, label: 'Individual' },
  { key: 'trophy', Icon: Trophy, label: 'Competición' },
  { key: 'medal', Icon: Medal, label: 'Medalla' },
  { key: 'award', Icon: Award, label: 'Logro' },
  { key: 'flag', Icon: Flag, label: 'Meta' },
  { key: 'rocket', Icon: Rocket, label: 'Despegue' },
  { key: 'star', Icon: Star, label: 'Estrella' },
];

const ICON_MAP = Object.fromEntries(PLAN_ICONS.map(i => [i.key, i.Icon]));
export const getPlanIconComponent = (key) => ICON_MAP[key] || null;

// Paleta de colores del badge
export const PLAN_COLORS = [
  '#CCFF00', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#F97316', '#0F172A',
];

// Emojis deportivos
export const PLAN_EMOJIS = [
  '🥊', '🏃', '🏋️', '🤼', '🥋', '🏊', '🚴', '⚽', '🏀', '🏐', '🎾', '🏈',
  '⚾', '🏉', '🥅', '🏆', '🎯', '⛷️', '🤸', '🧗', '🚣', '🛹', '🥇', '🔥',
];

// ¿el string es un emoji (no una key de ícono)?
export const isEmojiIcon = (v) => !!v && !ICON_MAP[v] && /\p{Emoji}/u.test(v);

// Autoasignación de ícono+color según el nombre del deporte
export const autoIconForSport = (sportName = '') => {
  const s = (sportName || '').toLowerCase();
  const m = (keys, icon, color) => keys.some(k => s.includes(k)) ? { icon, color } : null;
  return (
    m(['box', 'kick'], 'swords', '#EF4444') ||
    m(['mma', 'lucha', 'wrestl', 'judo', 'karate', 'taekwon', 'combat'], 'shield', '#F97316') ||
    m(['atlet', 'maraton', 'maratón', 'run', 'correr', 'sprint'], 'footprints', '#3B82F6') ||
    m(['nataci', 'swim', 'remo', 'row', 'water'], 'waves', '#06B6D4') ||
    m(['cicl', 'bike', 'bici'], 'bike', '#10B981') ||
    m(['fútbol', 'futbol', 'basket', 'balonc', 'voley', 'voleibol', 'rugby', 'equipo', 'team'], 'goal', '#8B5CF6') ||
    m(['tenis', 'tennis', 'tiro', 'precis'], 'target', '#EC4899') ||
    m(['ski', 'esqu', 'patin', 'invierno', 'snow'], 'snowflake', '#0EA5E9') ||
    m(['fuerza', 'pesas', 'powerl', 'halter', 'gym'], 'dumbbell', '#F59E0B') ||
    m(['montaña', 'escal', 'climb', 'mountain'], 'mountain', '#14B8A6') ||
    { icon: 'trophy', color: '#3B82F6' }
  );
};

// Resuelve el badge de un plan (con fallback por deporte)
export const resolvePlanBadge = (plan, sportName) => {
  const icon = plan?.icon || autoIconForSport(sportName || plan?.sport).icon;
  const color = plan?.icon_color || autoIconForSport(sportName || plan?.sport).color;
  return { icon, color };
};

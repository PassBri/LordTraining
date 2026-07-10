import React from 'react';
import { Gem, Trophy, Medal, Award, Shield } from 'lucide-react';

// Niveles de élite según el score de evaluación (0-100), paleta de medallas.
const LEVELS = [
  { min: 90, key: 'diamond', label: 'Diamante',      text: '#0B3A4A', grad: 'linear-gradient(135deg,#BEEBF8,#6FB9D2)', ring: '#8FCFE6', Icon: Gem },
  { min: 75, key: 'gold',    label: 'Oro',           text: '#3D2E05', grad: 'linear-gradient(135deg,#F0D77A,#C49A2B)', ring: '#D4AF37', Icon: Trophy },
  { min: 60, key: 'silver',  label: 'Plata',         text: '#2A2E36', grad: 'linear-gradient(135deg,#E6EAF0,#A9B0BD)', ring: '#C3C9D4', Icon: Medal },
  { min: 40, key: 'bronze',  label: 'Bronce',        text: '#3A230F', grad: 'linear-gradient(135deg,#E0AC7C,#B0703B)', ring: '#C6864E', Icon: Award },
  { min: -1, key: 'rookie',  label: 'En desarrollo', text: '#374151', grad: 'linear-gradient(135deg,#D8DCE2,#9CA3AF)', ring: '#9CA3AF', Icon: Shield },
];

export const getLevel = (score) => {
  if (score === null || score === undefined || isNaN(Number(score))) return null;
  return LEVELS.find((l) => Number(score) >= l.min);
};

const SIZES = {
  sm: { pad: 'px-2 py-0.5', icon: 11, text: 'text-[10px]', gap: 'gap-1' },
  md: { pad: 'px-2.5 py-1', icon: 14, text: 'text-xs', gap: 'gap-1.5' },
  lg: { pad: 'px-3.5 py-1.5', icon: 18, text: 'text-sm', gap: 'gap-2' },
};

export const LevelBadge = ({ score, size = 'md', showLabel = true, className = '' }) => {
  const lvl = getLevel(score);
  if (!lvl) return null;
  const s = SIZES[size] || SIZES.md;
  const { Icon } = lvl;
  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.pad} rounded-full font-bold ${s.text} ${className}`}
      style={{ background: lvl.grad, color: lvl.text, boxShadow: `0 1px 6px ${lvl.ring}55, inset 0 1px 0 rgba(255,255,255,0.45)` }}
      title={`Nivel ${lvl.label} · ${Math.round(Number(score))} pts`}
      data-testid={`level-badge-${lvl.key}`}
    >
      <Icon size={s.icon} strokeWidth={2.4} />
      {showLabel && lvl.label}
    </span>
  );
};

export default LevelBadge;

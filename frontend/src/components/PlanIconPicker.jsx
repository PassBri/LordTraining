import React from 'react';
import { PLAN_ICONS, PLAN_COLORS, PLAN_EMOJIS, getPlanIconComponent, isEmojiIcon } from '../lib/planIcons';

// Badge visual del plan (ícono lucide o emoji sobre color)
export const PlanBadge = ({ icon, color = '#D4AF37', size = 36, className = '' }) => {
  const Icon = getPlanIconComponent(icon);
  const px = `${size}px`;
  const iconSize = Math.round(size * 0.55);
  return (
    <div
      className={`flex items-center justify-center rounded-xl flex-shrink-0 ${className}`}
      style={{ width: px, height: px, background: color }}
      data-testid="plan-badge"
    >
      {isEmojiIcon(icon) ? (
        <span style={{ fontSize: Math.round(size * 0.55), lineHeight: 1 }}>{icon}</span>
      ) : Icon ? (
        <Icon style={{ width: iconSize, height: iconSize }} color="#ffffff" strokeWidth={2.4} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.5), color: '#fff', fontWeight: 800 }}>·</span>
      )}
    </div>
  );
};

// Selector de ícono + emoji + color
const PlanIconPicker = ({ icon, color, onChange }) => {
  const [tab, setTab] = React.useState(isEmojiIcon(icon) ? 'emoji' : 'icon');

  return (
    <div className="space-y-3" data-testid="plan-icon-picker">
      <div className="flex items-center gap-3">
        <PlanBadge icon={icon} color={color} size={48} />
        <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
          <button type="button" onClick={() => setTab('icon')} data-testid="plan-icon-tab-icon"
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${tab === 'icon' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Íconos</button>
          <button type="button" onClick={() => setTab('emoji')} data-testid="plan-icon-tab-emoji"
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${tab === 'emoji' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Emoji</button>
        </div>
      </div>

      {tab === 'icon' ? (
        <div className="grid grid-cols-8 gap-1.5" data-testid="plan-icon-grid">
          {PLAN_ICONS.map(({ key, Icon, label }) => (
            <button key={key} type="button" title={label} onClick={() => onChange({ icon: key, color })}
              data-testid={`plan-icon-opt-${key}`}
              className={`aspect-square rounded-lg flex items-center justify-center border-2 transition hover:bg-slate-50 ${icon === key ? 'border-slate-900' : 'border-slate-200'}`}>
              <Icon className="w-4 h-4 text-slate-700" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-8 gap-1.5" data-testid="plan-emoji-grid">
          {PLAN_EMOJIS.map(em => (
            <button key={em} type="button" onClick={() => onChange({ icon: em, color })}
              data-testid={`plan-emoji-opt-${em}`}
              className={`aspect-square rounded-lg flex items-center justify-center border-2 text-lg transition hover:bg-slate-50 ${icon === em ? 'border-slate-900' : 'border-slate-200'}`}>
              {em}
            </button>
          ))}
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Color</p>
        <div className="flex flex-wrap gap-1.5" data-testid="plan-color-palette">
          {PLAN_COLORS.map(c => (
            <button key={c} type="button" onClick={() => onChange({ icon, color: c })}
              data-testid={`plan-color-opt-${c}`}
              className={`w-7 h-7 rounded-full border-2 transition ${color === c ? 'border-slate-900 scale-110' : 'border-white shadow'}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanIconPicker;

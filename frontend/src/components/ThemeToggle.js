import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUiMode } from '../context/UiModeContext';

// Toggle global Modo Clásico (claro) <-> Modo Pro / WhatsApp (sidebar).
// `variant`: 'light' (sobre fondo claro) | 'dark' (sobre sidebar navy).
export const ThemeToggle = ({ variant = 'light', className = '' }) => {
  const { uiMode, toggleUiMode } = useUiMode();
  const isPro = uiMode === 'whatsapp';

  const base =
    'group inline-flex items-center justify-center rounded-full w-9 h-9 transition-all duration-300 ease-in-out outline-none';
  const skin =
    variant === 'dark'
      ? 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
      : 'bg-[#0A0F1E] text-[#CCFF00] hover:bg-white/10 border border-white/10 shadow-sm';

  return (
    <button
      type="button"
      onClick={toggleUiMode}
      className={`${base} ${skin} ${className}`}
      data-testid="theme-toggle-button"
      title={isPro ? 'Cambiar a Modo Clásico' : 'Cambiar a Modo Pro'}
      aria-label="Cambiar estilo visual"
    >
      <span className="relative flex items-center justify-center w-4 h-4">
        {isPro ? (
          <Moon className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-12" strokeWidth={2.4} />
        ) : (
          <Sun className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" strokeWidth={2.4} />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;

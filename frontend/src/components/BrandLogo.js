import React from 'react';

/**
 * BrandLogo — Marca LordTraining
 *
 * Usa la "escama de dragón" como icono (mucho más legible a tamaño pequeño
 * que el escudo heráldico completo). El wordmark "LordTraining" se renderiza
 * como texto HTML para máxima nitidez en cualquier tamaño/DPI.
 *
 * Variants:
 *   - "icon": solo escama de dragón
 *   - "full": escama + wordmark "LordTraining"
 *   - "shield": escudo heráldico completo (úsalo solo en zonas grandes,
 *     ej. hero de la landing o el login)
 *
 * Theme:
 *   - "light": para fondos OSCUROS (texto blanco + acento lima en "Training")
 *   - "dark":  para fondos CLAROS  (texto slate-900 + acento lima)
 *
 * @param {'icon'|'full'|'shield'} variant
 * @param {'light'|'dark'} theme
 * @param {number} size - altura en px (referencia del icono)
 */
const BrandLogo = ({
  variant = 'icon',
  theme = 'light',
  size = 32,
  className = '',
  ...props
}) => {
  const scaleSrc = '/brand/lordtraining-scale.png';
  const shieldSrc = '/brand/lordtraining-master.png';

  const isDark = theme === 'dark'; // fondo claro
  const textColor = isDark ? '#0f172a' : '#ffffff';
  const accent = '#D4AF37';

  // Shield variant — only the heraldic shield image (no extra text)
  if (variant === 'shield') {
    return (
      <img
        src={shieldSrc}
        alt="LordTraining"
        style={{
          height: `${size}px`,
          width: 'auto',
          objectFit: 'contain',
          flexShrink: 0,
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.35))',
        }}
        className={className}
        {...props}
      />
    );
  }

  // Icon-only variant — just the dragon scale
  if (variant === 'icon') {
    return (
      <img
        src={scaleSrc}
        alt="LordTraining"
        style={{
          height: `${size}px`,
          width: `${size}px`,
          objectFit: 'contain',
          flexShrink: 0,
          filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))',
        }}
        className={className}
        {...props}
      />
    );
  }

  // Full variant — scale + wordmark text
  const fontSize = Math.round(size * 0.55);
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.round(size * 0.28)}px`,
        flexShrink: 0,
      }}
      {...props}
    >
      <img
        src={scaleSrc}
        alt=""
        style={{
          height: `${size}px`,
          width: `${size}px`,
          objectFit: 'contain',
          flexShrink: 0,
          filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))',
        }}
      />
      <span
        style={{
          fontFamily: '"Bebas Neue", "Inter", sans-serif',
          fontWeight: 900,
          fontSize: `${fontSize}px`,
          letterSpacing: '0.01em',
          color: textColor,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        Lord<span style={{ color: accent }}>Training</span>
      </span>
    </span>
  );
};

export default BrandLogo;

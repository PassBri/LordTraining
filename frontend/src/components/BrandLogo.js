import React from 'react';

/**
 * BrandLogo - Logo oficial iTRAIN
 *
 * Variants:
 *   - "icon": solo óvalo con "i"
 *   - "full": óvalo + wordmark "iTRAIN"
 *
 * Theme:
 *   - "light": para fondos OSCUROS (óvalo lima + texto blanco)
 *   - "dark":  para fondos CLAROS  (óvalo azul oscuro + texto azul oscuro, "i" lima)
 *
 * @param {'icon'|'full'} variant
 * @param {'light'|'dark'} theme
 * @param {number} size - altura en px
 */
const BrandLogo = ({
  variant = 'icon',
  theme = 'light',
  size = 32,
  className = '',
  ...props
}) => {
  // Tamaños nativos (w x h):
  // - full-light 524x135  → aspect 3.88
  // - full-dark  541x140  → aspect 3.86
  // - icon-light 136x135  → aspect 1.01
  // - icon-dark  141x140  → aspect 1.01
  const assets = {
    full: {
      light: { src: '/brand/itrain-full-light.png', aspect: 524 / 135 },
      dark:  { src: '/brand/itrain-full-dark.png',  aspect: 541 / 140 },
    },
    icon: {
      light: { src: '/brand/itrain-icon-light.png', aspect: 136 / 135 },
      dark:  { src: '/brand/itrain-icon-dark-v2.png', aspect: 141 / 140 },
    },
  };

  const { src, aspect } = assets[variant][theme];
  const height = size;
  const width = size * aspect;

  return (
    <img
      src={src}
      alt="iTRAIN"
      height={height}
      width={width}
      style={{
        height: `${height}px`,
        width: `${width}px`,
        display: 'inline-block',
        objectFit: 'contain',
        flexShrink: 0,
      }}
      className={className}
      {...props}
    />
  );
};

export default BrandLogo;

import React from 'react';

/**
 * BrandLogo - Logo oficial LordTraining
 *
 * Variants:
 *   - "icon": solo corona
 *   - "full": corona + wordmark "LordTraining"
 *
 * Theme:
 *   - "light": para fondos OSCUROS (corona lima + texto blanco)
 *   - "dark":  para fondos CLAROS  (corona navy + texto navy)
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
  const assets = {
    full: {
      light: { src: '/brand/lordtraining-full-light.png', aspect: 632 / 160 },
      dark:  { src: '/brand/lordtraining-full-dark.png',  aspect: 632 / 160 },
    },
    icon: {
      light: { src: '/brand/lordtraining-icon-light.png', aspect: 1 },
      dark:  { src: '/brand/lordtraining-icon-dark.png',  aspect: 1 },
    },
  };

  const { src, aspect } = assets[variant][theme];
  const height = size;
  const width = size * aspect;

  return (
    <img
      src={src}
      alt="LordTraining"
      height={height}
      width={width}
      style={{
        height: `${height}px`,
        width: `${width}px`,
        objectFit: 'contain',
        flexShrink: 0,
      }}
      className={className}
      {...props}
    />
  );
};

export default BrandLogo;

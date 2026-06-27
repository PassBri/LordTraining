import { useEffect, useState } from 'react';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

// Lee el tema global activo del landing (guardado en MongoDB) y lo expone.
export function useLandingTheme() {
  const [theme, setTheme] = useState('classic');
  useEffect(() => {
    fetch(`${BACKEND}/api/landing/theme`)
      .then((r) => r.json())
      .then((d) => { if (d?.active_theme) setTheme(d.active_theme); })
      .catch(() => {});
  }, []);
  return theme;
}

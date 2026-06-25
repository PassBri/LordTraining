import { getBrandingActive, brandingFileUrl } from '../services/api';

let _cache = null;

// Fetch active branding once; returns absolute URLs (or null) per category.
export async function fetchActiveBranding() {
  if (_cache) return _cache;
  try {
    const res = await getBrandingActive();
    const d = res.data || {};
    _cache = {
      favicon: d.favicon ? brandingFileUrl(d.favicon) : null,
      landing: d.landing ? brandingFileUrl(d.landing) : null,
      login: d.login ? brandingFileUrl(d.login) : null,
    };
  } catch (e) {
    _cache = { favicon: null, landing: null, login: null };
  }
  return _cache;
}

export function applyFavicon(url) {
  if (!url) return;
  const head = document.head;
  // Remove existing icon links to avoid stale cache
  head.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']").forEach((el) => el.remove());
  const versioned = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = versioned;
  head.appendChild(link);
  const apple = document.createElement('link');
  apple.rel = 'apple-touch-icon';
  apple.href = versioned;
  head.appendChild(apple);
}

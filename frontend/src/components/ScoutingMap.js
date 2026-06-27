import React, { useState, useEffect, useRef } from 'react';
import i18nInstance from '../i18n';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Globe, AlertCircle } from 'lucide-react';
import { api, scoreColor } from './scoutingApi';

// i18n: auto-traducción slug-based (scouting.lbl.*)
const _slug = (s) => (s == null ? '' : s.toString()).toLowerCase()
  .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
  .replace(/₂/g,'2').replace(/²/g,'2').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const tt = (s) => {
  if (s == null || s === '' || typeof s === 'number') return s;
  const k = _slug(s);
  return k ? i18nInstance.t(`scouting.lbl.${k}`, { defaultValue: s }) : s;
};

export default function ScoutingMap({ onOpen }) {
  useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tilesReady, setTilesReady] = useState(false);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    api('/map').then(setData).catch(() => setData({ points: [], unlocated: 0, total: 0 })).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !mapEl.current || !data) return;
    if (!mapRef.current) {
      mapRef.current = L.map(mapEl.current, { scrollWheelZoom: false, attributionControl: false }).setView([10, -60], 2);
      const tiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 18 });
      tiles.on('load', () => setTilesReady(true));
      tiles.addTo(mapRef.current);
      layerRef.current = L.layerGroup().addTo(mapRef.current);
    }
    layerRef.current.clearLayers();
    const pts = data.points || [];
    pts.forEach(p => {
      const color = scoreColor(p.overall_score);
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 9, color: '#0f172a', weight: 2, fillColor: color, fillOpacity: 0.9,
      });
      m.bindPopup(
        `<div style="font-family:system-ui;min-width:140px;">
          <div style="font-weight:800;color:#0f172a;">${p.name || ''}</div>
          <div style="font-size:11px;color:#64748b;">${[p.position, p.sport_name].filter(Boolean).join(' · ')}</div>
          <div style="font-size:11px;color:#64748b;">${[p.city, p.country].filter(Boolean).join(', ')}</div>
          <div style="margin-top:4px;font-size:11px;">{tt('Score:')} <b style="color:${color}">${p.overall_score ?? '—'}</b>${!p.exact ? ' <span style="color:#94a3b8;">(aprox.)</span>' : ''}</div>
        </div>`
      );
      m.on('click', () => onOpen && onOpen(p.id));
      m.addTo(layerRef.current);
    });
    if (pts.length) {
      try { mapRef.current.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])).pad(0.3)); } catch { /* noop */ }
    }
  }, [loading, data, onOpen]);

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  // group by country for the side panel
  const byCountry = {};
  (data?.points || []).forEach(p => { const c = p.country || 'Sin país'; (byCountry[c] = byCountry[c] || []).push(p); });
  const countries = Object.entries(byCountry).sort((a, b) => b[1].length - a[1].length);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div className="grid lg:grid-cols-3 gap-4" data-testid="scouting-map">
      <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-slate-200 relative" style={{ height: 520 }}>
        {!tilesReady && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-2 bg-slate-100/80 backdrop-blur-sm pointer-events-none" data-testid="map-loading">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" /><span className="text-[12px] text-slate-500 font-medium">{tt('Cargando mapa…')}</span>
          </div>
        )}
        <div ref={mapEl} style={{ width: '100%', height: '100%', background: '#e2e8f0' }} data-testid="scouting-map-canvas" />
      </div>
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1"><Globe className="w-4 h-4 text-emerald-500" /><span className="font-black text-slate-800">{tt('Origen de prospectos')}</span></div>
          <div className="text-[12px] text-slate-500">{data.points.length} ubicados · {data.total} total</div>
          {data.unlocated > 0 && (
            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2" data-testid="map-unlocated">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{data.unlocated} prospecto(s) sin país/ubicación. Edítalos y añade país u origen.
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">{tt('Por país')}</div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {countries.map(([c, arr]) => (
              <div key={c} className="px-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{c}</span>
                  <span className="text-xs font-black text-slate-400">{arr.length}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {arr.map(p => (
                    <button key={p.id} onClick={() => onOpen && onOpen(p.id)} className="text-[10px] px-2 py-0.5 rounded-full hover:underline" style={{ background: scoreColor(p.overall_score) + '22', color: scoreColor(p.overall_score) }}>{p.name}</button>
                  ))}
                </div>
              </div>
            ))}
            {!countries.length && <div className="p-6 text-center text-slate-400 text-sm">{tt('Sin prospectos ubicados. Añade país u origen a tus prospectos.')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

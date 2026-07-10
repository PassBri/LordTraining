import React, { useState } from 'react';
import { Play, X, ExternalLink, Video } from 'lucide-react';

export const parseVideo = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { provider: 'youtube', id: yt[1], embed: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`, thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { provider: 'vimeo', id: vm[1], embed: `https://player.vimeo.com/video/${vm[1]}?autoplay=1`, thumb: null };
  return null;
};

function Lightbox({ video, onClose }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={onClose} data-testid="video-lightbox">
      <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/80 hover:text-white" data-testid="video-lightbox-close"><X className="w-7 h-7" /></button>
        <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
          <iframe src={video.embed} title={video.title || 'video'} className="absolute inset-0 w-full h-full"
            frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        </div>
        {video.title && <div className="text-center text-white/90 text-sm font-medium mt-3">{video.title}</div>}
      </div>
    </div>
  );
}

export function VideoGallery({ videos = [], dark = false }) {
  const [active, setActive] = useState(null);
  if (!videos.length) return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">
        {videos.map((v, i) => {
          const p = parseVideo(v.url);
          if (!p) {
            return (
              <a key={i} href={v.url} target="_blank" rel="noreferrer" data-testid={`video-link-${i}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition ${dark ? 'bg-white/5 text-[#B8912A] hover:bg-white/10 border border-white/10' : 'bg-slate-50 text-[#B8912A] hover:bg-slate-100 border border-slate-200'}`}>
                <ExternalLink className="w-4 h-4 shrink-0" /><span className="truncate">{v.title || 'Abrir video'}</span>
              </a>
            );
          }
          return (
            <button key={i} onClick={() => setActive({ ...p, title: v.title })} data-testid={`video-thumb-${i}`}
              className="group relative rounded-xl overflow-hidden bg-slate-900 border border-white/10" style={{ aspectRatio: '16/9' }}>
              {p.thumb
                ? <img src={p.thumb} alt={v.title || ''} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}><Video className="w-8 h-8 text-slate-500" /></div>}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-black/55 backdrop-blur flex items-center justify-center group-hover:scale-110 group-hover:bg-[#D4AF37] transition-all">
                  <Play className="w-5 h-5 text-white group-hover:text-slate-900 fill-current ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 text-[11px] font-semibold text-white truncate text-left" style={{ background: 'linear-gradient(to top,rgba(0,0,0,.8),transparent)' }}>
                {v.title || (p.provider === 'youtube' ? 'YouTube' : 'Vimeo')}
              </div>
            </button>
          );
        })}
      </div>
      {active && <Lightbox video={active} onClose={() => setActive(null)} />}
    </>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ResourceLayout from '../components/ResourceLayout';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState('Todas');

  useEffect(() => {
    fetch(`${BACKEND}/api/resources/blog`).then(r => r.json()).then(d => { setPosts(d.posts || []); setCats(d.categories || []); }).catch(() => {});
  }, []);

  const filtered = cat === 'Todas' ? posts : posts.filter(p => p.category === cat);

  return (
    <ResourceLayout active="/blog">
      <div data-testid="blog-page">
        <p className="text-[#CCFF00] text-xs font-bold tracking-widest uppercase mb-2">Resources</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" data-testid="blog-title">Blog</h1>
        <p className="text-slate-400 mb-8 max-w-2xl">Artículos sobre ciencia del deporte: periodización, nutrición, táctica y tecnología deportiva.</p>

        <div className="flex flex-wrap gap-2 mb-8">
          {['Todas', ...cats].map(c => (
            <button key={c} data-testid={`blog-cat-${c}`} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${cat === c ? 'bg-[#CCFF00] text-slate-900 border-[#CCFF00]' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <Link to={`/blog/${p.slug}`} key={p.id} data-testid={`blog-card-${p.slug}`}
              className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 hover:border-slate-500 flex flex-col">
              <div className="h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" /> : <span className="text-slate-600 text-sm">LordTraining</span>}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <span className="text-[11px] font-bold text-[#CCFF00] uppercase tracking-wide">{p.category}</span>
                <h3 className="text-lg font-bold text-white mt-1.5 mb-2">{p.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-3 flex-1">{p.summary}</p>
                <span className="text-xs text-slate-500 mt-3">{(p.created_at || '').slice(0, 10)}</span>
              </div>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-slate-500">No hay artículos en esta categoría.</p>}
      </div>
    </ResourceLayout>
  );
}

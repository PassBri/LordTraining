import React, { useEffect, useState } from 'react';
import ResourceLayout from '../components/ResourceLayout';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ApiDocsPage() {
  const [sections, setSections] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/resources/api-docs`).then(r => r.json()).then(d => {
      setSections(d.sections || []);
      if (d.sections?.[0]) setActive(d.sections[0].id);
    }).catch(() => {});
  }, []);

  return (
    <ResourceLayout active="/docs">
      <div data-testid="api-docs-page">
        <p className="text-[#CCFF00] text-xs font-bold tracking-widest uppercase mb-2">Developers</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-8" data-testid="api-docs-title">API Docs</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
          <aside className="lg:sticky lg:top-24 h-max">
            <nav className="flex flex-col gap-1">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`} onClick={() => setActive(s.id)} data-testid={`docs-nav-${s.id}`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${active === s.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>
          <div className="space-y-8">
            {sections.map(s => (
              <section key={s.id} id={s.id} className="rounded-xl bg-slate-800 border border-slate-700 p-6" data-testid={`docs-section-${s.id}`}>
                <h2 className="text-2xl font-bold text-white mb-3">{s.title}</h2>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{s.content}</pre>
              </section>
            ))}
          </div>
        </div>
      </div>
    </ResourceLayout>
  );
}

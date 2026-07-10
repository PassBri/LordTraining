import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus, Save, FileText, BookOpen, LifeBuoy } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('train_token')}` });
const inp = "w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm";

// ---------- BLOG ----------
const BlogAdmin = () => {
  const [posts, setPosts] = useState([]);
  const blank = { title: '', category: 'General', summary: '', body: '', image_url: '', published: true };
  const [editing, setEditing] = useState(null);

  const load = () => fetch(`${BACKEND}/api/resources/blog?all=true`).then(r => r.json()).then(d => setPosts(d.posts || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing.title) { toast.error('Título requerido'); return; }
    const url = editing.id ? `${BACKEND}/api/resources/blog/${editing.id}` : `${BACKEND}/api/resources/blog`;
    const res = await fetch(url, { method: editing.id ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(editing) });
    if (!res.ok) { toast.error('Error al guardar (¿Super Admin?)'); return; }
    toast.success('Artículo guardado'); setEditing(null); load();
  };
  const remove = async (id) => {
    await fetch(`${BACKEND}/api/resources/blog/${id}`, { method: 'DELETE', headers: authHeaders() });
    toast.success('Eliminado'); load();
  };

  return (
    <div data-testid="admin-blog">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white">Blog ({posts.length})</h3>
        <button onClick={() => setEditing({ ...blank })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-slate-900 text-sm font-bold" data-testid="blog-new-btn"><Plus className="w-4 h-4" />Nuevo</button>
      </div>
      {editing && (
        <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 mb-4 space-y-2" data-testid="blog-editor">
          <input className={inp} placeholder="Título" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} data-testid="blog-title-input" />
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} placeholder="Categoría" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} />
            <input className={inp} placeholder="URL de imagen" value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} />
          </div>
          <input className={inp} placeholder="Resumen" value={editing.summary} onChange={e => setEditing({ ...editing, summary: e.target.value })} />
          <textarea className={inp} rows={5} placeholder="Cuerpo del artículo" value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editing.published} onChange={e => setEditing({ ...editing, published: e.target.checked })} />Publicado</label>
          <div className="flex gap-2">
            <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-slate-900 text-sm font-bold" data-testid="blog-save-btn"><Save className="w-4 h-4" />Guardar</button>
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-sm">Cancelar</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-700 px-4 py-2.5">
            <div><span className="text-sm font-medium text-white">{p.title}</span><span className="ml-2 text-[11px] text-slate-500">{p.category}{!p.published && ' · borrador'}</span></div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(p)} className="text-xs text-slate-300 hover:text-white">Editar</button>
              <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- API DOCS ----------
const DocsAdmin = () => {
  const [sections, setSections] = useState([]);
  useEffect(() => { fetch(`${BACKEND}/api/resources/api-docs`).then(r => r.json()).then(d => setSections(d.sections || [])); }, []);
  const upd = (i, k, v) => setSections(s => s.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const save = async () => {
    const res = await fetch(`${BACKEND}/api/resources/api-docs`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ sections }) });
    if (!res.ok) { toast.error('Error al guardar'); return; }
    toast.success('API Docs guardado');
  };
  return (
    <div data-testid="admin-docs">
      <h3 className="font-bold text-white mb-4">API Docs (bloques editables)</h3>
      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={s.id} className="rounded-xl bg-slate-900 border border-slate-700 p-4 space-y-2">
            <input className={inp} value={s.title} onChange={e => upd(i, 'title', e.target.value)} />
            <textarea className={inp} rows={4} value={s.content} onChange={e => upd(i, 'content', e.target.value)} />
          </div>
        ))}
      </div>
      <button onClick={save} className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-slate-900 text-sm font-bold" data-testid="docs-save-btn"><Save className="w-4 h-4" />Guardar bloques</button>
    </div>
  );
};

// ---------- SUPPORT ----------
const SupportAdmin = () => {
  const [faqs, setFaqs] = useState([]);
  const [settings, setSettings] = useState({ email: '', phone: '', tutorials_url: '', intro: '' });
  const [msgs, setMsgs] = useState([]);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', order: 0 });

  const load = () => {
    fetch(`${BACKEND}/api/resources/support`).then(r => r.json()).then(d => { setFaqs(d.faqs || []); setSettings(s => ({ ...s, ...d.settings })); });
    fetch(`${BACKEND}/api/resources/support/messages`, { headers: authHeaders() }).then(r => r.ok ? r.json() : { messages: [] }).then(d => setMsgs(d.messages || []));
  };
  useEffect(() => { load(); }, []);

  const addFaq = async () => {
    if (!newFaq.question) return;
    const res = await fetch(`${BACKEND}/api/resources/support/faqs`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(newFaq) });
    if (!res.ok) { toast.error('Error'); return; }
    setNewFaq({ question: '', answer: '', order: 0 }); toast.success('FAQ agregada'); load();
  };
  const delFaq = async (id) => { await fetch(`${BACKEND}/api/resources/support/faqs/${id}`, { method: 'DELETE', headers: authHeaders() }); load(); };
  const saveSettings = async () => {
    const res = await fetch(`${BACKEND}/api/resources/support/settings`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(settings) });
    if (!res.ok) { toast.error('Error'); return; } toast.success('Contacto actualizado');
  };

  return (
    <div data-testid="admin-support" className="space-y-6">
      <div>
        <h3 className="font-bold text-white mb-3">Datos de contacto</h3>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input className={inp} placeholder="Email" value={settings.email || ''} onChange={e => setSettings({ ...settings, email: e.target.value })} data-testid="support-email-input" />
          <input className={inp} placeholder="Teléfono" value={settings.phone || ''} onChange={e => setSettings({ ...settings, phone: e.target.value })} />
        </div>
        <input className={`${inp} mb-2`} placeholder="URL tutoriales/videos" value={settings.tutorials_url || ''} onChange={e => setSettings({ ...settings, tutorials_url: e.target.value })} />
        <input className={`${inp} mb-2`} placeholder="Texto introductorio" value={settings.intro || ''} onChange={e => setSettings({ ...settings, intro: e.target.value })} />
        <button onClick={saveSettings} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-slate-900 text-sm font-bold" data-testid="support-settings-save"><Save className="w-4 h-4" />Guardar contacto</button>
      </div>
      <div>
        <h3 className="font-bold text-white mb-3">FAQ ({faqs.length})</h3>
        <div className="rounded-xl bg-slate-900 border border-slate-700 p-3 mb-3 space-y-2">
          <input className={inp} placeholder="Pregunta" value={newFaq.question} onChange={e => setNewFaq({ ...newFaq, question: e.target.value })} data-testid="faq-q-input" />
          <textarea className={inp} rows={2} placeholder="Respuesta" value={newFaq.answer} onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })} />
          <button onClick={addFaq} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-slate-900 text-sm font-bold" data-testid="faq-add-btn"><Plus className="w-4 h-4" />Agregar FAQ</button>
        </div>
        <div className="space-y-2">
          {faqs.map(f => (
            <div key={f.id} className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-700 px-4 py-2.5">
              <span className="text-sm text-white">{f.question}</span>
              <button onClick={() => delFaq(f.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-white mb-3">Mensajes recibidos ({msgs.length})</h3>
        <div className="space-y-2 max-h-72 overflow-auto">
          {msgs.map(m => (
            <div key={m.id} className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-2.5">
              <p className="text-sm text-white">{m.name} · <span className="text-slate-400">{m.email}</span></p>
              <p className="text-sm text-slate-300 mt-1">{m.message}</p>
              <p className="text-[11px] text-slate-500 mt-1">{(m.created_at || '').slice(0, 16).replace('T', ' ')}</p>
            </div>
          ))}
          {msgs.length === 0 && <p className="text-sm text-slate-500">Sin mensajes.</p>}
        </div>
      </div>
    </div>
  );
};

export const ResourcesManager = () => {
  const [tab, setTab] = useState('blog');
  const tabs = [['blog', 'Blog', FileText], ['docs', 'API Docs', BookOpen], ['support', 'Soporte', LifeBuoy]];
  return (
    <div data-testid="resources-manager">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">Recursos</h2>
        <p className="text-sm text-slate-400">Gestiona Blog, API Docs y Soporte. Visibles en las 4 versiones del landing.</p>
      </div>
      <div className="flex gap-2 mb-5 border-b border-slate-800 pb-3">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} data-testid={`resources-tab-${id}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${tab === id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>
      {tab === 'blog' && <BlogAdmin />}
      {tab === 'docs' && <DocsAdmin />}
      {tab === 'support' && <SupportAdmin />}
    </div>
  );
};

export default ResourcesManager;

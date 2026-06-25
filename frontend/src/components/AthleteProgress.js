import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, LineChart as LineIcon, Loader2, X, FileDown, Share2, Copy, Check, Calendar, Target, Award, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const token = () => localStorage.getItem('train_token');

const toNum = (v) => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? null : n;
};

export default function AthleteProgress({ athleteId }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!athleteId) return;
    setLoading(true);
    fetch(`${API_URL}/api/calculator-results?athlete_id=${athleteId}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setResults(d.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [athleteId]);

  // Agrupa por calculadora + métrica principal (headline)
  const sorted = [...results].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  const groups = {};
  for (const r of sorted) {
    if (!r.headline) continue;
    const val = toNum(r.headline.value);
    if (val == null) continue;
    const key = `${r.calculator}|${r.headline.label || r.title}`;
    if (!groups[key]) groups[key] = { calculator: r.calculator, title: r.title, label: r.headline.label, unit: r.headline.unit, color: r.color || '#3B82F6', module: r.module, points: [] };
    groups[key].points.push({ date: (r.created_at || '').slice(0, 10), value: val, note: r.note, plan_name: r.plan_name });
  }
  const series = Object.values(groups);

  if (!athleteId) return null;
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  if (!series.length) return null;

  return (
    <div className="mt-5" data-testid="athlete-progress">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center"><LineIcon className="w-4 h-4" /></div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Evolución del rendimiento</h3>
          <p className="text-[11px] text-slate-500">Toca una tarjeta para ver el historial, exportar PDF o compartir</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {series.map((s, i) => <ProgressCard key={i} s={s} onClick={() => setDetail(s)} />)}
      </div>
      {detail && <ProgressDetailModal s={detail} athleteId={athleteId} onClose={() => setDetail(null)} />}
    </div>
  );
}

function ProgressCard({ s, onClick }) {
  const pts = s.points;
  const first = pts[0].value;
  const last = pts[pts.length - 1].value;
  const delta = last - first;
  const pct = first ? (delta / Math.abs(first)) * 100 : 0;
  const flat = Math.abs(delta) < 1e-9 || pts.length < 2;
  const Trend = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const trendColor = flat ? '#94a3b8' : delta > 0 ? '#10b981' : '#ef4444';

  return (
    <button onClick={onClick} className="text-left bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-slate-300 transition w-full" data-testid="athlete-progress-card">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-slate-700 truncate" title={s.title}>{s.title}</p>
          <p className="text-[10px] text-slate-400 truncate">{s.label}</p>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5" style={{ background: `${trendColor}18`, color: trendColor }}>
          <Trend className="w-3 h-3" />{pts.length >= 2 ? `${delta > 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="text-2xl font-extrabold tabular-nums" style={{ color: s.color }}>{last}</span>
          {s.unit && <span className="text-xs font-bold text-slate-400 ml-1">{s.unit}</span>}
          <p className="text-[10px] text-slate-400">{pts.length} registro{pts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="w-24 h-10 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pts} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Line type="monotone" dataKey="value" stroke={s.color} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </button>
  );
}

function ProgressDetailModal({ s, athleteId, onClose }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [goal, setGoal] = useState(null);
  const [sponsors, setSponsors] = useState([]);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sponsorName, setSponsorName] = useState('');
  const fileRef = React.useRef(null);

  const pts = s.points;
  const vals = pts.map(p => p.value);
  const first = vals[0], last = vals[vals.length - 1];
  const delta = last - first;
  const pct = first ? (delta / Math.abs(first)) * 100 : 0;
  const best = Math.max(...vals), avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const trendColor = Math.abs(delta) < 1e-9 ? '#94a3b8' : delta > 0 ? '#10b981' : '#ef4444';

  const loadMeta = React.useCallback(() => {
    const q = `athlete_id=${athleteId}&calculator=${encodeURIComponent(s.calculator)}&label=${encodeURIComponent(s.label)}`;
    fetch(`${API_URL}/api/calculator-results/series?${q}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setGoal(d.goal); setSponsors(d.sponsors || []); setGoalInput(d.goal?.target_value ?? ''); } })
      .catch(() => {});
  }, [athleteId, s.calculator, s.label]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const saveGoal = async () => {
    const tv = parseFloat(goalInput);
    if (isNaN(tv)) { toast.error('Ingresa un valor de meta válido'); return; }
    setSavingGoal(true);
    try {
      await fetch(`${API_URL}/api/calculator-results/goal`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athleteId, calculator: s.calculator, metric_label: s.label, target_value: tv }),
      });
      toast.success('Meta guardada'); loadMeta();
    } catch { toast.error('Error guardando meta'); }
    setSavingGoal(false);
  };

  const uploadSponsor = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', sponsorName || file.name.split('.')[0]);
      const res = await fetch(`${API_URL}/api/calculator-results/sponsors`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
      if (!res.ok) throw new Error();
      toast.success('Logo de patrocinador agregado'); setSponsorName(''); loadMeta();
    } catch { toast.error('No se pudo subir el logo'); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const delSponsor = async (id) => {
    try { await fetch(`${API_URL}/api/calculator-results/sponsors/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } }); loadMeta(); }
    catch { toast.error('Error'); }
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const q = `athlete_id=${athleteId}&calculator=${encodeURIComponent(s.calculator)}&label=${encodeURIComponent(s.label)}`;
      const res = await fetch(`${API_URL}/api/calculator-results/progress-pdf?${q}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `progreso_${s.label.replace(/\s+/g, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success('PDF de progreso descargado');
    } catch { toast.error('No se pudo generar el PDF'); }
    setPdfLoading(false);
  };

  const share = async () => {
    setSharing(true);
    try {
      const res = await fetch(`${API_URL}/api/calculator-results/share`, {
        method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athleteId, calculator: s.calculator, metric_label: s.label }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      const url = `${window.location.origin}/progress/p/${d.share_id}`;
      setShareUrl(url);
      try { await navigator.clipboard.writeText(url); setCopied(true); toast.success('Enlace copiado al portapapeles'); }
      catch { toast.success('Enlace generado'); }
    } catch { toast.error('No se pudo generar el enlace'); }
    setSharing(false);
  };

  const copyAgain = async () => { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); toast.success('Copiado'); } catch {} };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[92vh] overflow-y-auto" data-testid="progress-detail-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.title}
          </DialogTitle>
          <DialogDescription>{s.label} · {pts.length} registros</DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {[['Inicial', first], ['Actual', last], ['Mejor', best], ['Promedio', avg.toFixed(1)], ['Cambio', `${delta > 0 ? '+' : ''}${pct.toFixed(1)}%`]].map(([l, v], i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
              <p className="text-base font-extrabold tabular-nums" style={{ color: i === 4 ? trendColor : s.color }}>{v}</p>
              <p className="text-[9px] font-bold uppercase text-slate-400">{l}</p>
            </div>
          ))}
        </div>

        {/* Goal manager */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3" data-testid="goal-manager">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-black text-slate-800">Meta / Objetivo</span>
            {goal?.reached && <span className="text-[10px] font-black bg-emerald-500 text-white rounded-full px-2 py-0.5 flex items-center gap-0.5"><Award className="w-3 h-3" />¡Alcanzada!</span>}
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder={`Ej. ${Math.round(best * 1.1)}`} className="bg-white h-8 w-32" data-testid="goal-input" />
            <span className="text-xs text-slate-500">{s.unit}</span>
            <Button size="sm" onClick={saveGoal} disabled={savingGoal} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" data-testid="goal-save-btn">{savingGoal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fijar meta'}</Button>
          </div>
          {goal?.target_value != null && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-500">Progreso hacia {goal.target_value}{s.unit ? ` ${s.unit}` : ''}</span>
                <span className="text-emerald-600">{goal.progress_pct}%</span>
              </div>
              <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${goal.progress_pct}%` }} data-testid="goal-progress-bar" />
              </div>
            </div>
          )}
        </div>

        {/* Big chart */}
        <div className="h-56 mt-1" data-testid="progress-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pts} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(d) => (d || '').slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={goal?.target_value != null ? [(dmin) => Math.min(dmin, goal.target_value) - 1, (dmax) => Math.max(dmax, goal.target_value) + 1] : ['auto', 'auto']} width={36} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}${s.unit ? ' ' + s.unit : ''}`, s.label]} />
              {goal?.target_value != null && (
                <ReferenceLine y={goal.target_value} stroke="#10b981" strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: `Meta ${goal.target_value}`, position: 'insideTopRight', fontSize: 10, fill: '#059669', fontWeight: 700 }} />
              )}
              <Line type="monotone" dataKey="value" stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Records */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 text-[11px] font-black uppercase text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Historial de registros</div>
          <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
            {[...pts].reverse().map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2" data-testid="progress-record-row">
                <span className="text-[11px] text-slate-400 w-20 shrink-0">{p.date}</span>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: s.color }}>{p.value}{s.unit ? ` ${s.unit}` : ''}</span>
                <span className="text-[12px] text-slate-500 truncate">{p.note || (p.plan_name ? `Plan: ${p.plan_name}` : '')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sponsors */}
        <div className="rounded-xl border border-slate-200 p-3" data-testid="sponsors-manager">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-black text-slate-800">Patrocinadores del informe</span>
            <span className="text-[10px] text-slate-400">(aparecen en el PDF y el enlace público)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {sponsors.map(sp => (
              <div key={sp.id} className="relative group border border-slate-200 rounded-lg p-1 bg-white" data-testid={`sponsor-chip-${sp.id}`}>
                <img src={`${API_URL}${sp.logo_url}`} alt={sp.name} className="h-8 w-auto max-w-[90px] object-contain" />
                <button onClick={() => delSponsor(sp.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition" data-testid={`sponsor-delete-${sp.id}`}><X className="w-3 h-3" /></button>
              </div>
            ))}
            {!sponsors.length && <span className="text-[11px] text-slate-400">Aún no hay logos.</span>}
          </div>
          <div className="flex items-center gap-2">
            <Input value={sponsorName} onChange={e => setSponsorName(e.target.value)} placeholder="Nombre (opcional)" className="bg-white h-8 w-40" data-testid="sponsor-name-input" />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadSponsor} className="hidden" data-testid="sponsor-file-input" />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-8" data-testid="sponsor-upload-btn">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}Subir logo
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={downloadPdf} disabled={pdfLoading} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="progress-pdf-btn">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileDown className="w-4 h-4 mr-1" />}Descargar PDF
          </Button>
          <Button onClick={share} disabled={sharing} variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50" data-testid="progress-share-btn">
            {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}Compartir enlace
          </Button>
          {shareUrl && (
            <div className="flex items-center gap-1 flex-1 min-w-[200px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <input readOnly value={shareUrl} className="flex-1 bg-transparent text-[11px] text-slate-600 outline-none" data-testid="progress-share-url" />
              <button onClick={copyAgain} className="text-slate-400 hover:text-violet-600">{copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}</button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

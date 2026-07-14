import React, { useState, useEffect, useCallback, useRef } from 'react';
import i18nInstance from '../i18n';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, FileText, Trash2, Download, ExternalLink, Scale, UploadCloud, X, CalendarClock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { api, API_URL, token } from './scoutingApi';

// i18n slug-based
const _slug = (s) => (s == null ? '' : s.toString()).toLowerCase()
  .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
  .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const tt = (s) => {
  if (s == null || s === '' || typeof s === 'number') return s;
  const k = _slug(s);
  return k ? i18nInstance.t(`scouting.lbl.${k}`, { defaultValue: s }) : s;
};

export const LEGAL_DOC_TYPES = [
  ['contrato', 'Contrato', '#0ea5e9'],
  ['transferencia', 'Transferencia', '#8b5cf6'],
  ['cesion', 'Cesión', '#f59e0b'],
  ['autorizacion_menores', 'Autorización de menores', '#10b981'],
  ['consentimiento_informado', 'Consentimiento informado', '#ef4444'],
  ['certificado_medico', 'Certificado médico', '#e11d48'],
  ['cesion_derechos_imagen', 'Cesión de derechos de imagen', '#7c3aed'],
  ['otros', 'Otros', '#64748b'],
];
const typeMeta = (t) => LEGAL_DOC_TYPES.find(x => x[0] === t) || LEGAL_DOC_TYPES[7];
const fmtSize = (b) => !b ? '' : b < 1024*1024 ? `${Math.round(b/1024)} KB` : `${(b/1048576).toFixed(1)} MB`;

// Estado de vencimiento a partir de expiry_date (YYYY-MM-DD)
const expiryStatus = (iso) => {
  if (!iso) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(`${String(iso).slice(0,10)}T00:00:00`);
  if (isNaN(exp)) return null;
  const days = Math.round((exp - today) / 86400000);
  if (days < 0) return { days, label: `Vencido hace ${Math.abs(days)}d`, cls: 'bg-red-100 text-red-700 border-red-200' };
  if (days === 0) return { days, label: 'Vence hoy', cls: 'bg-red-100 text-red-700 border-red-200' };
  if (days <= 30) return { days, label: `Vence en ${days}d`, cls: 'bg-orange-100 text-orange-700 border-orange-200' };
  return { days, label: `${exp.toLocaleDateString()}`, cls: 'bg-slate-100 text-slate-500 border-slate-200' };
};

const fileUrl = (path) => `${API_URL}/api/recruiting/files/${path}?auth=${token()}`;

export default function ScoutingLegal({ prospects = [], scopeProspectId = null }) {
  useTranslation();
  const [docs, setDocs] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('contrato');
  const [title, setTitle] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [targetProspect, setTargetProspect] = useState(scopeProspectId || 'general');
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterProspect, setFilterProspect] = useState('all');

  const load = useCallback(() => {
    const q = scopeProspectId ? `?prospect_id=${scopeProspectId}` : '';
    api(`/legal-docs${q}`).then(setDocs).catch(() => { setDocs([]); toast.error(tt('Error cargando documentos')); });
  }, [scopeProspectId]);
  useEffect(() => { load(); }, [load]);

  const pName = (id) => prospects.find(p => p.id === id)?.name || tt('Prospecto');

  const doUpload = async () => {
    if (!file) { toast.error(tt('Selecciona un archivo PDF')); return; }
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { toast.error(tt('Solo se permiten archivos PDF')); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType);
      fd.append('title', title || file.name.replace(/\.pdf$/i, ''));
      if (expiryDate) fd.append('expiry_date', expiryDate);
      const pid = scopeProspectId || (targetProspect === 'general' ? '' : targetProspect);
      if (pid) fd.append('prospect_id', pid);
      await api('/legal-docs', { method: 'POST', body: fd, raw: true });
      toast.success(tt('Documento subido'));
      setFile(null); setTitle(''); setExpiryDate(''); if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e) {
      toast.error(tt('No se pudo subir el documento'));
    }
    setUploading(false);
  };

  const del = async (id) => {
    if (!window.confirm(tt('¿Eliminar este documento legal?'))) return;
    try { await api(`/legal-docs/${id}`, { method: 'DELETE' }); toast.success(tt('Documento eliminado')); load(); }
    catch { toast.error(tt('Error')); }
  };

  const setExpiry = async (id, value) => {
    setDocs(prev => prev.map(x => x.id === id ? { ...x, expiry_date: value || null } : x));
    try { await api(`/legal-docs/${id}`, { method: 'PATCH', body: { expiry_date: value || '' } }); }
    catch { toast.error(tt('Error')); load(); }
  };

  const download = async (d) => {
    try {
      const res = await fetch(fileUrl(d.storage_path));
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = d.original_filename || `${(d.title || 'documento')}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { toast.error(tt('No se pudo descargar')); }
  };

  const compact = !!scopeProspectId;

  const list = docs || [];
  const expiringSoon = list.filter(d => { const s = expiryStatus(d.expiry_date); return s && s.days >= 0 && s.days <= 30; });
  const expired = list.filter(d => { const s = expiryStatus(d.expiry_date); return s && s.days < 0; });
  const visibleDocs = list.filter(d =>
    (filterType === 'all' || d.doc_type === filterType) &&
    (filterProspect === 'all'
      || (filterProspect === 'general' ? !d.prospect_id : d.prospect_id === filterProspect))
  );

  return (
    <div className={compact ? '' : 'space-y-5'} data-testid="scouting-legal">
      {!compact && (
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(120deg,#0f172a 0%,#13203a 55%,#0b1220 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#CCFF00] flex items-center justify-center"><Scale className="w-6 h-6 text-slate-900" strokeWidth={2.5} /></div>
            <div>
              <h2 className="text-white text-xl font-black tracking-tight">{tt('Documentos legales')}</h2>
              <p className="text-[#CCFF00] text-sm font-medium">{tt('Contratos, transferencias y documentación oficial en PDF.')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resumen + filtros (solo vista de módulo) */}
      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="legal-summary">
          {[
            { k: 'total', l: 'Documentos', v: list.length, c: '#0ea5e9', Icon: FileText },
            { k: 'soon', l: 'Por vencer (≤30 días)', v: expiringSoon.length, c: '#f97316', Icon: CalendarClock },
            { k: 'expired', l: 'Vencidos', v: expired.length, c: '#ef4444', Icon: CalendarClock },
          ].map(({ k, l, v, c, Icon }) => (
            <button key={k} type="button"
              onClick={() => { if (k === 'total') { setFilterType('all'); } }}
              className="text-left rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3" data-testid={`legal-summary-${k}`}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: c + '18' }}><Icon className="w-5 h-5" style={{ color: c }} /></div>
              <div>
                <div className="text-2xl font-black text-slate-800 leading-none" data-testid={`legal-summary-${k}-value`}>{v}</div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{tt(l)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap items-center gap-2" data-testid="legal-filters">
          <span className="text-[12px] font-bold text-slate-500">{tt('Filtrar')}:</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-auto min-w-[150px] bg-white text-[13px]" data-testid="legal-filter-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tt('Todos los tipos')}</SelectItem>
              {LEGAL_DOC_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{tt(l)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProspect} onValueChange={setFilterProspect}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] bg-white text-[13px]" data-testid="legal-filter-prospect"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tt('Todos los prospectos')}</SelectItem>
              <SelectItem value="general">{tt('Repositorio general')}</SelectItem>
              {prospects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filterType !== 'all' || filterProspect !== 'all') && (
            <button onClick={() => { setFilterType('all'); setFilterProspect('all'); }} className="text-[12px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1" data-testid="legal-filter-clear"><X className="w-3.5 h-3.5" />{tt('Limpiar')}</button>
          )}
        </div>
      )}

      {/* Uploader */}
      <div className={`rounded-xl border border-slate-200 bg-white p-4 ${compact ? 'mb-4' : ''}`} data-testid="legal-uploader">
        <div className="flex items-center gap-2 mb-3">
          <UploadCloud className="w-4 h-4 text-slate-500" />
          <span className="font-black text-slate-800 text-sm">{tt('Subir documento (PDF)')}</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tt('Tipo de documento')}</label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="mt-1 bg-slate-50 h-9 text-[13px]" data-testid="legal-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEGAL_DOC_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{tt(l)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!compact && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tt('Asociar a')}</label>
              <Select value={targetProspect} onValueChange={setTargetProspect}>
                <SelectTrigger className="mt-1 bg-slate-50 h-9 text-[13px]" data-testid="legal-prospect-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{tt('Repositorio general')}</SelectItem>
                  {prospects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={compact ? '' : 'sm:col-span-2'}>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tt('Título (opcional)')}</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={160}
              placeholder={tt('Ej. Contrato temporada 2026')} className="mt-1 bg-slate-50 h-9 text-[13px]" data-testid="legal-title-input" />
          </div>
          <div className={compact ? '' : 'sm:col-span-2'}>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{tt('Fecha de vencimiento (opcional)')}</label>
            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              className="mt-1 bg-slate-50 h-9 text-[13px]" data-testid="legal-expiry-input" />
            <p className="text-[10px] text-slate-400 mt-1">{tt('Recibirás una alerta en el Centro de Notificaciones cuando falten 30 días o menos.')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} data-testid="legal-file-input" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="border-slate-300 h-9" data-testid="legal-file-btn">
            <FileText className="w-4 h-4 mr-1.5" />{file ? file.name.slice(0, 28) : tt('Elegir PDF')}
          </Button>
          <Button onClick={doUpload} disabled={uploading || !file} className="bg-slate-900 text-white hover:bg-slate-800 h-9 ml-auto" data-testid="legal-upload-btn">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}{tt('Subir')}
          </Button>
        </div>
      </div>

      {/* List */}
      {docs === null ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>
      ) : visibleDocs.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm rounded-xl border border-dashed border-slate-200 bg-white" data-testid="legal-empty">
          {list.length === 0 ? tt('Aún no hay documentos legales. Sube el primero arriba.') : tt('Ningún documento coincide con el filtro.')}
        </div>
      ) : (
        <div className="space-y-2" data-testid="legal-list">
          {visibleDocs.map(d => {
            const tm = typeMeta(d.doc_type);
            return (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3" data-testid={`legal-doc-${d.id}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: tm[2] + '18' }}>
                  <FileText className="w-5 h-5" style={{ color: tm[2] }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-sm truncate">{d.title || d.original_filename}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold px-1.5 py-0.5 rounded" style={{ background: tm[2] + '1a', color: tm[2] }}>{tt(tm[1])}</span>
                    {!scopeProspectId && (d.prospect_id
                      ? <span className="text-slate-500">· {d.prospect_name || pName(d.prospect_id)}</span>
                      : <span className="text-slate-400">· {tt('General')}</span>)}
                    {d.size ? <span>· {fmtSize(d.size)}</span> : null}
                    {d.created_at ? <span>· {new Date(d.created_at).toLocaleDateString()}</span> : null}
                    {(() => { const st = expiryStatus(d.expiry_date); return st ? <span className={`font-bold px-1.5 py-0.5 rounded border ${st.cls}`} data-testid={`legal-expiry-badge-${d.id}`}>{st.label}</span> : null; })()}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input type="date" value={(d.expiry_date || '').slice(0,10)} onChange={e => setExpiry(d.id, e.target.value)}
                    title={tt('Fecha de vencimiento')} data-testid={`legal-expiry-edit-${d.id}`}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 text-[12px] text-slate-600 hidden md:block" />
                  <a href={fileUrl(d.storage_path)} target="_blank" rel="noreferrer" data-testid={`legal-view-${d.id}`}>
                    <Button size="sm" variant="outline" className="border-slate-300 px-2.5 h-8"><ExternalLink className="w-4 h-4" /></Button>
                  </a>
                  <Button size="sm" variant="outline" onClick={() => download(d)} className="border-slate-300 px-2.5 h-8" data-testid={`legal-download-${d.id}`}><Download className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => del(d.id)} className="border-red-200 text-red-500 px-2.5 h-8" data-testid={`legal-del-${d.id}`}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

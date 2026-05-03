import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  CalendarDays, FileText, Files, Archive, Loader2, X, CheckSquare, Square,
  Calendar, Clock, Activity, ListChecks,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PHASE_COLORS = {
  'Preparación General': '#10b981',
  'Preparación Específica': '#3b82f6',
  'Pre-competitivo': '#f59e0b',
  'Competitivo': '#ef4444',
  'Transición': '#8b5cf6',
  'AC - Meso 1': '#10b981',
  'CE - Meso 1': '#3b82f6',
  'RE - Meso 1': '#ef4444',
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SessionsExportModal({ open, onOpenChange, plan, athleteName }) {
  const [tree, setTree] = useState({ items: [], total_sessions: 0 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [exporting, setExporting] = useState(null); // null | 'combined' | 'zip'

  useEffect(() => {
    if (!open || !plan?.id) return;
    setLoading(true);
    setSelected(new Set());
    const token = localStorage.getItem('train_token') || localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/api/master-report/sessions-list/${plan.id}`, { headers })
      .then(r => setTree(r.data || { items: [], total_sessions: 0 }))
      .catch(() => {
        setTree({ items: [], total_sessions: 0 });
        toast.error('No se pudieron cargar las sesiones del plan');
      })
      .finally(() => setLoading(false));
  }, [open, plan]);

  const allSessionIds = useMemo(() => {
    const ids = [];
    tree.items.forEach(ms => ms.microcycles.forEach(mc => mc.sessions.forEach(s => {
      if (s.id) ids.push(s.id);
    })));
    return ids;
  }, [tree]);

  const toggleSession = (sid) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  };

  const toggleMicro = (microSessions) => {
    const ids = microSessions.map(s => s.id).filter(Boolean);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const toggleMeso = (meso) => {
    const ids = [];
    meso.microcycles.forEach(mc => mc.sessions.forEach(s => { if (s.id) ids.push(s.id); }));
    const allSelected = ids.length > 0 && ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allSessionIds));
  const clearAll = () => setSelected(new Set());

  const handleExport = async (format) => {
    if (selected.size === 0) {
      toast.warning('Debes seleccionar al menos una sesión');
      return;
    }
    setExporting(format);
    try {
      const token = localStorage.getItem('train_token') || localStorage.getItem('token');
      const res = await axios.post(
        `${API}/api/sessions-export/generate`,
        {
          plan_id: plan.id,
          session_ids: Array.from(selected),
          format,
          athlete_name: athleteName || 'Atleta',
        },
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          responseType: 'blob',
        }
      );
      const ext = format === 'zip' ? 'zip' : 'pdf';
      const planSlug = (plan?.name || 'plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
      downloadBlob(res.data, `sesiones_${planSlug}.${ext}`);
      toast.success(format === 'zip'
        ? `ZIP descargado · ${selected.size} sesion${selected.size !== 1 ? 'es' : ''}`
        : `PDF combinado descargado · ${selected.size} sesion${selected.size !== 1 ? 'es' : ''}`);
    } catch (err) {
      toast.error('Error al generar la exportación: ' + (err.response?.data?.detail || err.message));
    } finally {
      setExporting(null);
    }
  };

  const totalSelected = selected.size;
  const totalAvailable = tree.total_sessions || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[92vh] overflow-hidden p-0 bg-white"
        data-testid="sessions-export-modal"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#CCFF00]/15 border border-[#CCFF00]/40 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-[#CCFF00]" strokeWidth={2.2} />
              </div>
              <div>
                <DialogTitle className="text-white text-xl tracking-tight">
                  Exportar Sesiones
                </DialogTitle>
                <DialogDescription className="text-slate-300 text-sm mt-0.5">
                  {plan?.name ? `Plan: ${plan.name}` : 'Selecciona las sesiones a imprimir'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1.5 rounded-full bg-[#CCFF00] text-slate-900 text-xs font-bold tracking-wide"
                data-testid="sessions-export-counter"
              >
                {totalSelected} de {totalAvailable} seleccionadas
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              disabled={loading || allSessionIds.length === 0}
              data-testid="sessions-export-select-all"
              className="h-8 text-xs"
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Seleccionar todas
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearAll}
              disabled={loading || totalSelected === 0}
              data-testid="sessions-export-clear-all"
              className="h-8 text-xs"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" /> Limpiar
            </Button>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ListChecks className="w-3.5 h-3.5" />
            Formato: PDF clásico de sesión (ReportLab)
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(92vh-260px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tree.items.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">El plan activo aún no tiene sesiones programadas.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {tree.items.map((meso, mi) => {
                const mesoIds = [];
                meso.microcycles.forEach(mc => mc.sessions.forEach(s => { if (s.id) mesoIds.push(s.id); }));
                const mesoSelectedCount = mesoIds.filter(id => selected.has(id)).length;
                const mesoColor = PHASE_COLORS[meso.meso_name] || PHASE_COLORS[meso.phase] || '#0EA5E9';

                return (
                  <div
                    key={meso.meso_id || mi}
                    className="border border-slate-200 rounded-lg overflow-hidden bg-white"
                    data-testid={`sessions-export-meso-${meso.meso_id || mi}`}
                  >
                    <div
                      className="px-4 py-3 flex items-center justify-between gap-3"
                      style={{ backgroundColor: `${mesoColor}10`, borderBottom: `2px solid ${mesoColor}` }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: mesoColor }}
                        >
                          M{mi + 1}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{meso.meso_name}</div>
                          {meso.phase && (
                            <div className="text-[11px] text-slate-500 uppercase tracking-wide">
                              {meso.phase}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleMeso(meso)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700"
                        data-testid={`sessions-export-toggle-meso-${meso.meso_id || mi}`}
                      >
                        {mesoSelectedCount === mesoIds.length ? 'Quitar todo' : `Marcar todo (${mesoIds.length})`}
                      </button>
                    </div>

                    <div className="p-3 space-y-3">
                      {meso.microcycles.map((mc, mci) => {
                        const microIds = mc.sessions.map(s => s.id).filter(Boolean);
                        const microSelectedCount = microIds.filter(id => selected.has(id)).length;

                        return (
                          <div
                            key={mc.micro_id || mci}
                            className="border border-slate-200 rounded-lg bg-slate-50/50"
                            data-testid={`sessions-export-micro-${mc.micro_id || `${mi}-${mci}`}`}
                          >
                            <div className="px-3 py-2 flex items-center justify-between bg-slate-100/70 rounded-t-lg">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-xs font-bold text-slate-700">
                                  {mc.micro_name}
                                </span>
                                {mc.week_number != null && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-semibold">
                                    SEMANA {mc.week_number}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleMicro(mc.sessions)}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                                data-testid={`sessions-export-toggle-micro-${mc.micro_id || `${mi}-${mci}`}`}
                              >
                                {microSelectedCount === microIds.length ? 'Quitar' : `Todas (${microIds.length})`}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                              {mc.sessions.map((s) => {
                                const checked = selected.has(s.id);
                                return (
                                  <label
                                    key={s.id}
                                    className={`group cursor-pointer relative flex items-start gap-2.5 p-3 rounded-lg border-2 transition-all ${
                                      checked
                                        ? 'border-[#CCFF00] bg-[#CCFF00]/8 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                    data-testid={`sessions-export-card-${s.id}`}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => toggleSession(s.id)}
                                      className="mt-0.5"
                                      data-testid={`sessions-export-checkbox-${s.id}`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm text-slate-900 truncate">
                                        {s.name || 'Sesión'}
                                      </div>
                                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                        {s.day && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                            Día {s.day}
                                          </span>
                                        )}
                                        {s.session_type && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                                            {s.session_type}
                                          </span>
                                        )}
                                        {s.duration_minutes && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" /> {s.duration_minutes}min
                                          </span>
                                        )}
                                        {s.exercises_count > 0 && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium flex items-center gap-1">
                                            <Activity className="w-2.5 h-2.5" /> {s.exercises_count} ej.
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-600">
            {totalSelected > 0 ? (
              <span className="font-semibold text-slate-900">
                {totalSelected} sesión{totalSelected !== 1 ? 'es' : ''} seleccionada{totalSelected !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-slate-400 italic">
                Marca las sesiones que quieres imprimir
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={!!exporting}
              data-testid="sessions-export-cancel-btn"
            >
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('zip')}
              disabled={!!exporting || totalSelected === 0}
              data-testid="sessions-export-zip-btn"
              className="border-slate-300"
            >
              {exporting === 'zip'
                ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                : <Archive className="w-4 h-4 mr-1.5" />}
              ZIP individual
            </Button>
            <Button
              onClick={() => handleExport('combined')}
              disabled={!!exporting || totalSelected === 0}
              data-testid="sessions-export-combined-btn"
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {exporting === 'combined'
                ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                : <Files className="w-4 h-4 mr-1.5" />}
              PDF combinado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

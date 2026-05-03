import React, { useState } from 'react';
import { Button } from './ui/button';
import { Download, Link as LinkIcon, MessageCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Header Material Design reusable para secciones de catálogo (Información).
 * Coincide con el estilo del Plan Anterior / Plan Activo.
 *
 * Props:
 *  - catalogType: 'entities' | 'teams' | 'athletes' | 'sports' | 'tournaments'
 *  - title, subtitle: textos del header
 *  - icon: componente Lucide
 *  - color: color del icono (CSS color string o hex)
 *  - onRefresh: () => Promise|void  → callback opcional para el botón "Actualizar"
 *  - rightExtra: ReactNode opcional (ej: botón de "+ Nuevo")
 */
export const InfoSectionHeader = ({
  catalogType,
  title,
  subtitle,
  icon: Icon,
  color = '#CCFF00',
  onRefresh,
  rightExtra,
}) => {
  const [busy, setBusy] = useState(false);

  const handleDownloadPdf = async () => {
    setBusy(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/info-export/${catalogType}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error descargando PDF' }));
        toast.error(err.detail || 'Error descargando PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Catalogo_${catalogType}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch (e) {
      toast.error('Error al descargar PDF');
    } finally {
      setBusy(false);
    }
  };

  const handleShareLink = async () => {
    setBusy(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/info-export/${catalogType}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Error creando enlace');
        return null;
      }
      const data = await res.json();
      const publicUrl = `${window.location.origin}/api/info-export/shared/${data.share_id}`;
      try {
        await navigator.clipboard.writeText(publicUrl);
        toast.success('Enlace copiado al portapapeles', { description: publicUrl });
      } catch {
        toast.info('Enlace listo', { description: publicUrl });
      }
      return publicUrl;
    } catch (e) {
      toast.error('Error al crear enlace');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleShareWhatsApp = async () => {
    const publicUrl = await handleShareLink();
    if (!publicUrl) return;
    const text = encodeURIComponent(
      `Catálogo · ${title}\n\n${subtitle}\n${publicUrl}\n\nGenerado por iTrain.app`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleRefresh = async () => {
    if (!onRefresh) {
      toast.success('Catálogo actualizado');
      return;
    }
    setBusy(true);
    try {
      await onRefresh();
      toast.success('Catálogo actualizado');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex items-center justify-between flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm"
      data-testid={`info-section-header-${catalogType}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
          {Icon ? <Icon className="w-5 h-5" style={{ color }} /> : null}
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-slate-900 truncate">{title}</h1>
          <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {rightExtra}
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50"
          onClick={handleDownloadPdf}
          disabled={busy}
          data-testid={`${catalogType}-pdf-btn`}
          title="Descargar catálogo en PDF"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50"
          onClick={handleShareLink}
          disabled={busy}
          data-testid={`${catalogType}-link-btn`}
          title="Copiar enlace público al portapapeles"
        >
          <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
          Enlace
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/40"
          onClick={handleShareWhatsApp}
          disabled={busy}
          data-testid={`${catalogType}-whatsapp-btn`}
          title="Compartir por WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
          WhatsApp
        </Button>
        <Button
          className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs px-4"
          onClick={handleRefresh}
          disabled={busy}
          data-testid={`${catalogType}-refresh-btn`}
          title="Sincronizar catálogo"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${busy ? 'animate-spin' : ''}`} />
          Guardar
        </Button>
      </div>
    </div>
  );
};

export default InfoSectionHeader;

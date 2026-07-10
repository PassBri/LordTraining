import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Gamepad2, Copy, Download, Trash2, Loader2, Plus, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const TacticalBoardSection = ({ token }) => {
  const [boards, setBoards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [renaming, setRenaming] = React.useState(null);
  const [renameVal, setRenameVal] = React.useState('');

  const fetchBoards = React.useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tactical-boards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setBoards(await res.json());
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, [token]);

  React.useEffect(() => { fetchBoards(); }, [fetchBoards]);
  React.useEffect(() => {
    const h = (e) => { if (e.data?.type === 'tactical-board-saved') fetchBoards(); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [fetchBoards]);

  const deleteBoard = async (id) => {
    if (!window.confirm('¿Eliminar esta pizarra?')) return;
    try {
      await fetch(`${BACKEND_URL}/api/tactical-boards/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      setBoards(prev => prev.filter(b => b.id !== id));
      toast.success('Pizarra eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  const duplicateBoard = async (board) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tactical-boards`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...board, id: undefined, name: `${board.name || 'Pizarra'} (copia)` })
      });
      if (res.ok) { fetchBoards(); toast.success('Pizarra duplicada'); }
    } catch { toast.error('Error al duplicar'); }
  };

  const renameBoard = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/tactical-boards/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameVal })
      });
      setBoards(prev => prev.map(b => b.id === id ? { ...b, name: renameVal } : b));
      setRenaming(null);
      toast.success('Nombre actualizado');
    } catch { toast.error('Error al renombrar'); }
  };

  const exportPNG = async (board) => {
    toast.info('Exportando PNG...');
    const w = window.open(`/tactical-board.html?id=${board.id}&export=png`, '_blank');
    if (!w) toast.error('Permite ventanas emergentes para exportar');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-[#e8f5e9] to-[#f1f8e9] rounded-xl p-4 border border-[#c5e1a5]">
        <div className="flex items-center gap-2 mb-1">
          <Gamepad2 className="w-5 h-5 text-[#558b2f]" />
          <h3 className="font-bold text-[#33691e] text-lg">Pizarra Tactica</h3>
        </div>
        <p className="text-xs text-slate-500 mt-1">Crea, edita, duplica y exporta formaciones tacticas para cualquier deporte</p>
      </div>
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-white border-b border-slate-200 py-3 px-4 flex items-center justify-between">
          <span className="font-semibold text-slate-700 text-sm">Mis Pizarras ({boards.length})</span>
          <Button onClick={() => window.open('/tactical-board.html', '_blank')} className="bg-[#D4AF37] hover:bg-[#b5e000] text-[#1a2800] font-semibold" data-testid="open-tactical-board-btn">
            <Plus className="w-4 h-4 mr-1" /> Nueva Pizarra
          </Button>
        </div>
        <CardContent className="p-4">
          {loading && boards.length === 0 && <p className="text-center text-slate-400 py-4 text-sm">Cargando pizarras...</p>}
          {!loading && boards.length === 0 ? (
            <div className="text-center py-8">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500 font-medium">No tienes pizarras guardadas</p>
              <p className="text-xs text-slate-400 mt-1">Crea tu primera pizarra tactica y se guardara aqui</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {boards.map(board => (
                <div key={board.id} className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                  onClick={() => window.open(`/tactical-board.html?id=${board.id}`, '_blank')}>
                  <div className="aspect-[4/3] bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center relative overflow-hidden">
                    {board.thumbnail ? (
                      // El backend guarda el SVG en base64 puro (sin prefijo data-URL).
                      // Soportamos ambos casos: data-URL completa o base64 desnudo.
                      <img
                        src={board.thumbnail.startsWith('data:') ? board.thumbnail : `data:image/svg+xml;base64,${board.thumbnail}`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-green-600/60">
                        <Gamepad2 className="w-10 h-10" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">{board.sportName || board.sport || 'Pizarra'}</span>
                      </div>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); duplicateBoard(board); }} className="p-1.5 bg-white rounded-lg shadow hover:bg-[#D4AF37] transition-colors" title="Duplicar"><Copy className="w-3.5 h-3.5 text-slate-700" /></button>
                      <button onClick={(e) => { e.stopPropagation(); exportPNG(board); }} className="p-1.5 bg-white rounded-lg shadow hover:bg-green-50 transition-colors" title="Exportar PNG"><Download className="w-3.5 h-3.5 text-slate-700" /></button>
                      {board.id && (
                        <button onClick={(e) => { e.stopPropagation(); deleteBoard(board.id); }} className="p-1.5 bg-white rounded-lg shadow hover:bg-red-50 transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    {renaming === board.id ? (
                      <Input value={renameVal} onChange={e => setRenameVal(e.target.value)} onBlur={() => renameBoard(board.id)} onKeyDown={e => e.key === 'Enter' && renameBoard(board.id)} autoFocus className="h-6 text-xs" />
                    ) : (
                      <p className="text-[11px] font-semibold text-slate-800 truncate cursor-pointer hover:text-[#3a5a00]" onClick={(e) => { e.stopPropagation(); setRenaming(board.id); setRenameVal(board.name || ''); }} title="Clic para renombrar">{board.name || 'Sin nombre'}</p>
                    )}
                    <p className="text-[9px] text-slate-400">{board.sport || ''} {board.updated_at ? '· ' + new Date(board.updated_at).toLocaleDateString() : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-center">
          <Gamepad2 className="w-6 h-6 mx-auto mb-1.5 text-green-600" />
          <p className="text-[10px] text-[#5a7a20] mt-0.5">Jugadores, conos, balones, flechas</p>
        </div>
        <div className="bg-[#D4AF37] rounded-lg p-3 border border-[#B8912A] text-center">
          <Lightbulb className="w-6 h-6 mx-auto mb-1.5 text-[#B8912A]" />
          <p className="text-[10px] text-[#B8912A] mt-0.5">Vista plana, perspectiva e isometrica</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-center">
          <Download className="w-6 h-6 mx-auto mb-1.5 text-purple-600" />
          <p className="text-[10px] text-purple-600 mt-0.5">PNG e impresion PDF directa</p>
        </div>
      </div>
    </div>
  );
};

export default TacticalBoardSection;

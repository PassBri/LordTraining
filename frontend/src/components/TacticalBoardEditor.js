import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import {
  MousePointer2, UserPlus, Circle, MoveUpRight,
  Triangle, CircleDot, Type, Eraser, Sparkles,
  RotateCcw, Save, X, Loader2, Undo2, Trash2, Download
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

import TACTICAL_SPORTS from './tacticalSportsData';

const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Mover', color: 'text-white' },
  { id: 'playerX', icon: UserPlus, label: 'Equipo A', color: 'text-[#c8f700]' },
  { id: 'playerO', icon: Circle, label: 'Equipo B', color: 'text-white' },
  { id: 'arrow', icon: MoveUpRight, label: 'Flecha', color: 'text-cyan-400' },
  { id: 'cone', icon: Triangle, label: 'Cono', color: 'text-orange-400' },
  { id: 'ball', icon: CircleDot, label: 'Balon', color: 'text-white' },
  { id: 'text', icon: Type, label: 'Texto', color: 'text-blue-400' },
  { id: 'eraser', icon: Eraser, label: 'Borrar', color: 'text-red-400' },
];

const TacticalBoardEditor = ({ isOpen, onClose, onSave, initialData, sessionDescription, planSport }) => {
  const [sportIdx, setSportIdx] = useState(() => {
    const idx = TACTICAL_SPORTS.findIndex(s => s.id === (initialData?.sport || planSport));
    return idx >= 0 ? idx : 0;
  });
  const [activeTool, setActiveTool] = useState('select');
  const [elements, setElements] = useState(initialData?.elements || []);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [arrowStart, setArrowStart] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [aiDescription, setAiDescription] = useState(sessionDescription || '');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [playerCounts, setPlayerCounts] = useState({ teamA: 5, teamB: 5 });
  const [exporting, setExporting] = useState(false);
  const svgRef = useRef(null);

  const sport = TACTICAL_SPORTS[sportIdx];

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-20), JSON.stringify(elements)]);
  }, [elements]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    setHistory(h => h.slice(0, -1));
    setElements(JSON.parse(history[history.length - 1]));
  }, [history]);

  const getSvgPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 150, y: 210 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 150, y: 210 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(svgPt.x), y: Math.round(svgPt.y) };
  }, []);

  const getNextLabel = useCallback((type) => {
    return String(elements.filter(el => el.type === type).length + 1);
  }, [elements]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        pushHistory();
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
      if (e.key === 'Escape') { setArrowStart(null); setSelectedId(null); setActiveTool('select'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, selectedId, pushHistory, undo]);

  const handleCanvasClick = useCallback((e) => {
    if (activeTool === 'select' || activeTool === 'eraser') { setSelectedId(null); return; }
    const point = getSvgPoint(e);
    const uid = `el-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    if (activeTool === 'playerX' || activeTool === 'playerO') {
      pushHistory();
      setElements(prev => [...prev, { id: uid, type: activeTool, x: point.x, y: point.y, label: getNextLabel(activeTool) }]);
    } else if (activeTool === 'cone' || activeTool === 'ball') {
      pushHistory();
      setElements(prev => [...prev, { id: uid, type: activeTool, x: point.x, y: point.y, label: '' }]);
    } else if (activeTool === 'text') {
      const text = prompt('Ingrese texto:');
      if (text) { pushHistory(); setElements(prev => [...prev, { id: uid, type: 'text', x: point.x, y: point.y, label: text }]); }
    } else if (activeTool === 'arrow') {
      if (!arrowStart) { setArrowStart(point); }
      else { pushHistory(); setElements(prev => [...prev, { id: uid, type: 'arrow', x: arrowStart.x, y: arrowStart.y, x2: point.x, y2: point.y, label: '' }]); setArrowStart(null); }
    }
  }, [activeTool, arrowStart, getSvgPoint, getNextLabel, pushHistory]);

  const handleElementClick = useCallback((e, elementId) => {
    e.stopPropagation();
    if (activeTool === 'eraser') { pushHistory(); setElements(prev => prev.filter(el => el.id !== elementId)); }
    else if (activeTool === 'select') { setSelectedId(elementId); }
    else if (activeTool === 'arrow') {
      const el = elements.find(x => x.id === elementId);
      if (el) {
        if (!arrowStart) { setArrowStart({ x: el.x, y: el.y }); }
        else { pushHistory(); setElements(prev => [...prev, { id: `el-${Date.now()}`, type: 'arrow', x: arrowStart.x, y: arrowStart.y, x2: el.x, y2: el.y, label: '' }]); setArrowStart(null); }
      }
    }
  }, [activeTool, arrowStart, elements, pushHistory]);

  const handleElementMouseDown = useCallback((e, element) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    const point = getSvgPoint(e);
    setDragging(element.id);
    setDragOffset({ dx: element.x - point.x, dy: element.y - point.y });
    setSelectedId(element.id);
    pushHistory();
  }, [activeTool, getSvgPoint, pushHistory]);

  const handleMouseMove = useCallback((e) => {
    const point = getSvgPoint(e);
    setMousePos(point);
    if (dragging) {
      setElements(prev => prev.map(el => {
        if (el.id !== dragging) return el;
        const nx = point.x + dragOffset.dx;
        const ny = point.y + dragOffset.dy;
        if (el.type === 'arrow') { return { ...el, x: nx, y: ny, x2: (el.x2 || 0) + (nx - el.x), y2: (el.y2 || 0) + (ny - el.y) }; }
        return { ...el, x: nx, y: ny };
      }));
    }
  }, [dragging, dragOffset, getSvgPoint]);

  const handleMouseUp = useCallback(() => { setDragging(null); }, []);

  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/tactical-board/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sport: sport.id, description: aiDescription, num_team_a: playerCounts.teamA, num_team_b: playerCounts.teamB })
      });
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      pushHistory();
      setElements(data.elements || []);
      setShowAiPanel(false);
      toast.success('Pizarra generada con IA');
    } catch (err) { toast.error('Error al generar pizarra'); }
    finally { setGenerating(false); }
  };

  const handleExportPNG = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg || exporting) return;
    setExporting(true);
    try {
      const cloned = svg.cloneNode(true);
      cloned.querySelectorAll('span').forEach(s => {
        while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s);
        s.remove();
      });
      const svgData = new XMLSerializer().serializeToString(cloned);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 900; canvas.height = 1260;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = sport.color;
        ctx.fillRect(0, 0, 900, 1260);
        ctx.drawImage(img, 0, 0, 900, 1260);
        URL.revokeObjectURL(url);
        const link = document.createElement('a');
        link.download = `pizarra_${sport.id}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('Imagen PNG descargada');
        setExporting(false);
      };
      img.onerror = () => { URL.revokeObjectURL(url); toast.error('Error al exportar'); setExporting(false); };
      img.src = url;
    } catch (err) { toast.error('Error al exportar'); setExporting(false); }
  }, [exporting, sport]);

  const handleSave = () => {
    onSave({ sport: sport.id, sportName: sport.name, elements, savedAt: new Date().toISOString() });
    onClose();
    toast.success('Pizarra guardada');
  };

  const handleClear = () => { pushHistory(); setElements([]); setSelectedId(null); setArrowStart(null); };

  if (!isOpen) return null;

  const teamACount = elements.filter(e => e.type === 'playerX').length;
  const teamBCount = elements.filter(e => e.type === 'playerO').length;
  const arrowCount = elements.filter(e => e.type === 'arrow').length;
  const elCursor = activeTool === 'select' ? 'grab' : activeTool === 'eraser' ? 'pointer' : 'default';

  // Build elements SVG string to inject via dangerouslySetInnerHTML (bypasses babel plugin span wrapping)
  const buildElementsSvg = () => {
    return elements.map(el => {
      const sel = el.id === selectedId;
      switch (el.type) {
        case 'playerX': {
          const selCircle = sel ? `<circle cx="0" cy="0" r="20" fill="none" stroke="#c8f700" stroke-width="2" stroke-dasharray="4 3" opacity="0.8"/>` : '';
          const lbl = el.label ? `<text x="0" y="-22" text-anchor="middle" font-size="11" fill="#c8f700" font-weight="bold">${el.label}</text>` : '';
          return `<g transform="translate(${el.x},${el.y})" data-elid="${el.id}" style="cursor:${elCursor}">${selCircle}<circle cx="0" cy="0" r="15" fill="rgba(200,247,0,0.25)" stroke="#c8f700" stroke-width="3"/><line x1="-7" y1="-7" x2="7" y2="7" stroke="#c8f700" stroke-width="3" stroke-linecap="round"/><line x1="7" y1="-7" x2="-7" y2="7" stroke="#c8f700" stroke-width="3" stroke-linecap="round"/>${lbl}</g>`;
        }
        case 'playerO': {
          const selCircle = sel ? `<circle cx="0" cy="0" r="20" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4 3" opacity="0.8"/>` : '';
          const lbl = el.label ? `<text x="0" y="-21" text-anchor="middle" font-size="11" fill="white" font-weight="bold">${el.label}</text>` : '';
          return `<g transform="translate(${el.x},${el.y})" data-elid="${el.id}" style="cursor:${elCursor}">${selCircle}<circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="3"/>${lbl}</g>`;
        }
        case 'arrow': {
          const selLine = sel ? `<line x1="${el.x}" y1="${el.y}" x2="${el.x2}" y2="${el.y2}" stroke="#c8f700" stroke-width="8" opacity="0.3" stroke-linecap="round"/>` : '';
          return `<g data-elid="${el.id}" style="cursor:${elCursor}">${selLine}<line x1="${el.x}" y1="${el.y}" x2="${el.x2}" y2="${el.y2}" stroke="rgba(255,255,255,0.8)" stroke-width="2.5" stroke-linecap="round" marker-end="url(#tBoardArrow)"/><circle cx="${el.x}" cy="${el.y}" r="4" fill="rgba(255,255,255,0.6)"/></g>`;
        }
        case 'cone': {
          const selCircle = sel ? `<circle cx="0" cy="0" r="16" fill="none" stroke="#ff9800" stroke-width="2" stroke-dasharray="4 3" opacity="0.8"/>` : '';
          return `<g transform="translate(${el.x},${el.y})" data-elid="${el.id}" style="cursor:${elCursor}">${selCircle}<polygon points="0,-12 -9,7 9,7" fill="#ff9800" stroke="#e65100" stroke-width="1.5"/></g>`;
        }
        case 'ball': {
          const selCircle = sel ? `<circle cx="0" cy="0" r="14" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4 3" opacity="0.8"/>` : '';
          return `<g transform="translate(${el.x},${el.y})" data-elid="${el.id}" style="cursor:${elCursor}">${selCircle}<circle cx="0" cy="0" r="8" fill="white" stroke="#333" stroke-width="2"/><circle cx="0" cy="0" r="2.5" fill="#555"/></g>`;
        }
        case 'text': {
          const selRect = sel ? `<rect x="-5" y="-16" width="${Math.max((el.label?.length || 4) * 8, 35) + 10}" height="24" rx="4" fill="none" stroke="white" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.6"/>` : '';
          return `<g transform="translate(${el.x},${el.y})" data-elid="${el.id}" style="cursor:${elCursor}">${selRect}<text x="0" y="0" dy="0.35em" font-size="14" fill="white" font-weight="bold">${el.label || ''}</text></g>`;
        }
        default: return '';
      }
    }).join('');
  };

  // Handle clicks on element SVG groups via event delegation
  const handleSvgClick = useCallback((e) => {
    const target = e.target.closest('[data-elid]');
    if (target) {
      const elId = target.getAttribute('data-elid');
      handleElementClick(e, elId);
      return;
    }
    handleCanvasClick(e);
  }, [handleElementClick, handleCanvasClick]);

  const handleSvgMouseDown = useCallback((e) => {
    const target = e.target.closest('[data-elid]');
    if (target && activeTool === 'select') {
      const elId = target.getAttribute('data-elid');
      const element = elements.find(x => x.id === elId);
      if (element) {
        e.stopPropagation();
        const point = getSvgPoint(e);
        setDragging(element.id);
        setDragOffset({ dx: element.x - point.x, dy: element.y - point.y });
        setSelectedId(element.id);
        pushHistory();
      }
    }
  }, [activeTool, elements, getSvgPoint, pushHistory]);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-5xl max-h-[92vh] overflow-hidden p-0 bg-[#0b0e14] border-slate-800 [&>button]:hidden"
        data-testid="tactical-board-editor"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Pizarra Tactica</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#c8f700] rounded-lg flex items-center justify-center">
              <span className="text-[14px] font-black text-[#0b0e14]" style={{fontFamily:"'Barlow Condensed', sans-serif"}}>i</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-base" data-testid="board-title">Pizarra Tactica</h2>
              <p className="text-slate-500 text-[11px]">Editor interactivo de formaciones y jugadas</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            {TACTICAL_SPORTS.map((s, i) => (
              <button key={s.id} onClick={() => setSportIdx(i)} data-testid={`sport-tab-${s.id}`}
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${i === sportIdx ? 'bg-[#c8f700] text-[#0b0e14] font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
                {s.name}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800" data-testid="close-board-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main */}
        <div className="flex" style={{ height: 'calc(92vh - 130px)' }}>
          {/* Toolbar */}
          <div className="w-16 bg-slate-900/50 border-r border-slate-800/40 flex flex-col items-center py-3 gap-1 shrink-0">
            {TOOLS.map(tool => (
              <button key={tool.id} onClick={() => { setActiveTool(tool.id); setArrowStart(null); }} data-testid={`tool-${tool.id}`}
                className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${activeTool === tool.id ? 'bg-[#c8f700]/20 ring-1 ring-[#c8f700]/50' : 'hover:bg-slate-800'}`} title={tool.label}>
                <tool.icon className={`w-4 h-4 ${activeTool === tool.id ? tool.color : 'text-slate-500'}`} />
                <span className={`text-[7px] font-medium ${activeTool === tool.id ? 'text-white' : 'text-slate-600'}`}>{tool.label}</span>
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={undo} disabled={history.length === 0} className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-800 disabled:opacity-30 text-slate-500 hover:text-white" title="Deshacer">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={handleClear} className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-red-900/30 text-slate-500 hover:text-red-400" title="Limpiar" data-testid="clear-board-btn">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center bg-[#0a0d12] p-4 relative overflow-hidden">
            {showAiPanel && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="bg-[#12151c] border border-slate-700 rounded-2xl p-6 w-[380px] shadow-2xl" data-testid="ai-panel">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-[#c8f700]" />
                    <h3 className="text-white font-bold">Generar con IA</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Descripcion / Jugada</label>
                      <Textarea value={aiDescription} onChange={(e) => setAiDescription(e.target.value)}
                        placeholder="Ej: Ataque 4-3-3, presion alta..." className="mt-1 bg-slate-800/50 border-slate-700 text-white text-sm min-h-[80px] placeholder:text-slate-600" data-testid="ai-description-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium">Equipo A (X)</label>
                        <Input type="number" value={playerCounts.teamA} onChange={(e) => setPlayerCounts(p => ({ ...p, teamA: parseInt(e.target.value) || 0 }))}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white text-sm h-9" min={0} max={15} data-testid="ai-team-a-count" />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium">Equipo B (O)</label>
                        <Input type="number" value={playerCounts.teamB} onChange={(e) => setPlayerCounts(p => ({ ...p, teamB: parseInt(e.target.value) || 0 }))}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white text-sm h-9" min={0} max={15} data-testid="ai-team-b-count" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setShowAiPanel(false)} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">Cancelar</Button>
                      <Button onClick={handleAiGenerate} disabled={generating} className="flex-1 bg-[#c8f700] hover:bg-[#d9ff20] text-[#0b0e14] font-bold" data-testid="ai-generate-submit">
                        {generating ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Generando...</> : <><Sparkles className="w-4 h-4 mr-1" /> Generar</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'arrow' && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-cyan-500/15 text-cyan-300 text-[11px] px-3 py-1.5 rounded-full border border-cyan-500/25 backdrop-blur-sm">
                {arrowStart ? 'Clic para fijar el final de la flecha' : 'Clic para iniciar la flecha'}
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={sport.viewBox}
              xmlns="http://www.w3.org/2000/svg"
              className="rounded-lg shadow-2xl"
              style={{ background: sport.color, maxHeight: '100%', aspectRatio: '5/7', cursor: activeTool === 'select' ? 'default' : 'crosshair', userSelect: 'none' }}
              onClick={handleSvgClick}
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              data-testid="tactical-board-svg"
            >
              <defs>
                <marker id="tBoardArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                  <path d="M0,0 L10,4 L0,8" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
                </marker>
              </defs>
              {/* Field */}
              <g stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: sport.svg }} />
              {/* Elements — rendered as raw SVG to bypass babel span wrapping */}
              <g dangerouslySetInnerHTML={{ __html: buildElementsSvg() }} />
              {/* Arrow preview */}
              {arrowStart && mousePos ? (
                <line x1={arrowStart.x} y1={arrowStart.y} x2={mousePos.x} y2={mousePos.y}
                  stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="6 4"
                  markerEnd="url(#tBoardArrow)" pointerEvents="none" />
              ) : null}
            </svg>
          </div>

          {/* Right panel */}
          <div className="w-48 bg-slate-900/30 border-l border-slate-800/40 p-3 flex flex-col shrink-0">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-2">Elementos ({elements.length})</h4>
            <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: 'calc(100% - 60px)' }}>
              {elements.length === 0 ? (
                <p className="text-[10px] text-slate-600 text-center py-6">Usa las herramientas o genera con IA</p>
              ) : (
                elements.map(el => (
                  <div key={el.id} onClick={() => setSelectedId(el.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all ${selectedId === el.id ? 'bg-[#c8f700]/10 border border-[#c8f700]/30' : 'hover:bg-slate-800/50 border border-transparent'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${el.type === 'playerX' ? 'bg-[#c8f700]' : el.type === 'playerO' ? 'bg-white' : el.type === 'arrow' ? 'bg-cyan-400' : el.type === 'cone' ? 'bg-orange-400' : el.type === 'ball' ? 'bg-white' : 'bg-blue-400'}`} />
                    <span className="text-slate-300 flex-1 truncate">
                      {el.type === 'playerX' ? `Jugador A #${el.label}` : el.type === 'playerO' ? `Jugador B #${el.label}` : el.type === 'arrow' ? 'Movimiento' : el.type === 'cone' ? 'Cono' : el.type === 'ball' ? 'Balon' : el.label || 'Texto'}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); pushHistory(); setElements(prev => prev.filter(x => x.id !== el.id)); if (selectedId === el.id) setSelectedId(null); }}
                      className="text-slate-600 hover:text-red-400 p-0.5 shrink-0"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-800/40 pt-2 mt-2">
              <div className="text-[9px] text-slate-600 text-center">{teamACount} Eq.A / {teamBCount} Eq.B / {arrowCount} Flechas</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/60 bg-[#0b0e14]">
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAiPanel(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold" data-testid="ai-generate-board-btn">
              <Sparkles className="w-4 h-4 mr-1.5" /> Generar con IA
            </Button>
            <Button variant="outline" onClick={handleExportPNG} disabled={exporting || elements.length === 0}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs disabled:opacity-40" data-testid="export-png-btn">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Exportar PNG
            </Button>
            <span className="text-[10px] text-slate-600">{elements.length} elementos</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-400 hover:bg-slate-800 text-xs" data-testid="cancel-board-btn">Cancelar</Button>
            <Button onClick={handleSave} className="bg-[#c8f700] hover:bg-[#d9ff20] text-[#0b0e14] text-xs font-bold" data-testid="save-board-btn">
              <Save className="w-4 h-4 mr-1.5" /> Guardar Pizarra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TacticalBoardEditor;

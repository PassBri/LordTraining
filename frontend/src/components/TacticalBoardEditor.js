import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import {
  MousePointer2, UserPlus, Circle, MoveUpRight,
  Triangle, CircleDot, Type, Eraser, Sparkles,
  RotateCcw, Save, X, Loader2, Undo2, Trash2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ─── Sport field definitions ───
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
  const svgRef = useRef(null);

  const sport = TACTICAL_SPORTS[sportIdx];

  // Push to undo history
  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-20), JSON.stringify(elements)]);
  }, [elements]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setElements(JSON.parse(prev));
  }, [history]);

  // Convert mouse to SVG coords
  const getSvgPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const vb = sport.viewBox.split(' ').map(Number);
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * vb[2]),
      y: Math.round(((e.clientY - rect.top) / rect.height) * vb[3])
    };
  }, [sport]);

  // Next auto-label for players
  const getNextLabel = useCallback((type) => {
    const existing = elements.filter(el => el.type === type);
    return String(existing.length + 1);
  }, [elements]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        pushHistory();
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
      }
      if (e.key === 'Escape') {
        setArrowStart(null);
        setSelectedId(null);
        setActiveTool('select');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, selectedId, pushHistory, undo]);

  // Canvas background click (placement tools)
  const handleCanvasClick = useCallback((e) => {
    const point = getSvgPoint(e);
    switch (activeTool) {
      case 'select':
        setSelectedId(null);
        break;
      case 'playerX':
      case 'playerO':
        pushHistory();
        setElements(prev => [...prev, {
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
          type: activeTool, x: point.x, y: point.y,
          label: getNextLabel(activeTool)
        }]);
        break;
      case 'cone':
      case 'ball':
        pushHistory();
        setElements(prev => [...prev, {
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
          type: activeTool, x: point.x, y: point.y, label: ''
        }]);
        break;
      case 'text': {
        const text = prompt('Ingrese texto:');
        if (text) {
          pushHistory();
          setElements(prev => [...prev, {
            id: `el-${Date.now()}`, type: 'text',
            x: point.x, y: point.y, label: text
          }]);
        }
        break;
      }
      case 'arrow':
        if (!arrowStart) {
          setArrowStart(point);
        } else {
          pushHistory();
          setElements(prev => [...prev, {
            id: `el-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
            type: 'arrow', x: arrowStart.x, y: arrowStart.y,
            x2: point.x, y2: point.y, label: ''
          }]);
          setArrowStart(null);
        }
        break;
      default:
        break;
    }
  }, [activeTool, arrowStart, getSvgPoint, getNextLabel, pushHistory]);

  // Element click
  const handleElementClick = useCallback((e, elementId) => {
    e.stopPropagation();
    if (activeTool === 'eraser') {
      pushHistory();
      setElements(prev => prev.filter(el => el.id !== elementId));
    } else if (activeTool === 'select') {
      setSelectedId(elementId);
    } else if (activeTool === 'arrow') {
      const el = elements.find(x => x.id === elementId);
      if (el) {
        const point = { x: el.x, y: el.y };
        if (!arrowStart) {
          setArrowStart(point);
        } else {
          pushHistory();
          setElements(prev => [...prev, {
            id: `el-${Date.now()}`, type: 'arrow',
            x: arrowStart.x, y: arrowStart.y,
            x2: point.x, y2: point.y, label: ''
          }]);
          setArrowStart(null);
        }
      }
    }
  }, [activeTool, arrowStart, elements, pushHistory]);

  // Drag start on element
  const handleElementMouseDown = useCallback((e, element) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    const point = getSvgPoint(e);
    setDragging(element.id);
    setDragOffset({ dx: element.x - point.x, dy: element.y - point.y });
    setSelectedId(element.id);
    pushHistory();
  }, [activeTool, getSvgPoint, pushHistory]);

  // Mouse move on SVG
  const handleMouseMove = useCallback((e) => {
    const point = getSvgPoint(e);
    setMousePos(point);
    if (dragging) {
      setElements(prev => prev.map(el => {
        if (el.id !== dragging) return el;
        const nx = point.x + dragOffset.dx;
        const ny = point.y + dragOffset.dy;
        if (el.type === 'arrow') {
          const ddx = nx - el.x;
          const ddy = ny - el.y;
          return { ...el, x: nx, y: ny, x2: el.x2 + ddx, y2: el.y2 + ddy };
        }
        return { ...el, x: nx, y: ny };
      }));
    }
  }, [dragging, dragOffset, getSvgPoint]);

  const handleMouseUp = useCallback(() => { setDragging(null); }, []);

  // AI Generation
  const handleAiGenerate = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/tactical-board/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          sport: sport.id,
          description: aiDescription,
          num_team_a: playerCounts.teamA,
          num_team_b: playerCounts.teamB
        })
      });
      if (!res.ok) throw new Error('Error al generar');
      const data = await res.json();
      pushHistory();
      setElements(data.elements || []);
      setShowAiPanel(false);
      toast.success('Pizarra generada con IA');
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('Error al generar pizarra');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    onSave({
      sport: sport.id, sportName: sport.name, elements,
      savedAt: new Date().toISOString()
    });
    onClose();
    toast.success('Pizarra guardada');
  };

  const handleClear = () => { pushHistory(); setElements([]); setSelectedId(null); setArrowStart(null); };

  // Render SVG element
  const renderElement = (el) => {
    const isSelected = el.id === selectedId;
    const cursor = activeTool === 'select' ? 'grab' : activeTool === 'eraser' ? 'pointer' : 'default';
    const handlers = {
      onClick: (e) => handleElementClick(e, el.id),
      onMouseDown: (e) => handleElementMouseDown(e, el),
      style: { cursor }
    };

    switch (el.type) {
      case 'playerX':
        return (
          <g key={el.id} transform={`translate(${el.x},${el.y})`} {...handlers}>
            {isSelected && <circle r="18" fill="none" stroke="#c8f700" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7"/>}
            <circle r="13" fill="rgba(200,247,0,0.15)" stroke="#c8f700" strokeWidth="2.5"/>
            <text textAnchor="middle" dy="0.35em" fontSize="14" fill="#c8f700" fontWeight="900" fontFamily="Arial,sans-serif" style={{userSelect:'none'}}>X</text>
            {el.label && <text y="-18" textAnchor="middle" fontSize="9" fill="rgba(200,247,0,0.9)" fontWeight="bold" style={{userSelect:'none'}}>{el.label}</text>}
          </g>
        );
      case 'playerO':
        return (
          <g key={el.id} transform={`translate(${el.x},${el.y})`} {...handlers}>
            {isSelected && <circle r="18" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7"/>}
            <circle r="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5"/>
            {el.label && <text y="-17" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.85)" fontWeight="bold" style={{userSelect:'none'}}>{el.label}</text>}
          </g>
        );
      case 'arrow':
        return (
          <g key={el.id} {...handlers}>
            {isSelected && <line x1={el.x} y1={el.y} x2={el.x2} y2={el.y2} stroke="#c8f700" strokeWidth="6" opacity="0.3"/>}
            <line x1={el.x} y1={el.y} x2={el.x2} y2={el.y2}
              stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"
              markerEnd="url(#tBoardArrow)"/>
            <circle cx={el.x} cy={el.y} r="3" fill="rgba(255,255,255,0.5)"/>
          </g>
        );
      case 'cone':
        return (
          <g key={el.id} transform={`translate(${el.x},${el.y})`} {...handlers}>
            {isSelected && <circle r="14" fill="none" stroke="#ff9800" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7"/>}
            <polygon points="0,-10 -8,6 8,6" fill="#ff9800" stroke="#e65100" strokeWidth="1" opacity="0.9"/>
          </g>
        );
      case 'ball':
        return (
          <g key={el.id} transform={`translate(${el.x},${el.y})`} {...handlers}>
            {isSelected && <circle r="13" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7"/>}
            <circle r="7" fill="white" stroke="#333" strokeWidth="1.5"/>
            <circle r="2" fill="#555"/>
          </g>
        );
      case 'text':
        return (
          <g key={el.id} transform={`translate(${el.x},${el.y})`} {...handlers}>
            {isSelected && <rect x="-4" y="-14" width={Math.max((el.label?.length || 4) * 7, 30) + 8} height="20" rx="3" fill="none" stroke="white" strokeWidth="1" strokeDasharray="3 2" opacity="0.5"/>}
            <text dy="0.3em" fontSize="12" fill="white" fontWeight="bold" style={{userSelect:'none'}}>{el.label}</text>
          </g>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const teamACount = elements.filter(e => e.type === 'playerX').length;
  const teamBCount = elements.filter(e => e.type === 'playerO').length;
  const arrowCount = elements.filter(e => e.type === 'arrow').length;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-5xl max-h-[92vh] overflow-hidden p-0 bg-[#0b0e14] border-slate-800 [&>button]:hidden"
        data-testid="tactical-board-editor"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
              <button
                key={s.id}
                onClick={() => setSportIdx(i)}
                data-testid={`sport-tab-${s.id}`}
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                  i === sportIdx
                    ? 'bg-[#c8f700] text-[#0b0e14] font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
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
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id); setArrowStart(null); }}
                data-testid={`tool-${tool.id}`}
                className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                  activeTool === tool.id
                    ? 'bg-[#c8f700]/20 ring-1 ring-[#c8f700]/50'
                    : 'hover:bg-slate-800'
                }`}
                title={tool.label}
              >
                <tool.icon className={`w-4 h-4 ${activeTool === tool.id ? tool.color : 'text-slate-500'}`} />
                <span className={`text-[7px] font-medium ${activeTool === tool.id ? 'text-white' : 'text-slate-600'}`}>{tool.label}</span>
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={undo} disabled={history.length === 0} className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-800 disabled:opacity-30 text-slate-500 hover:text-white" title="Deshacer (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={handleClear} className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-red-900/30 text-slate-500 hover:text-red-400" title="Limpiar todo" data-testid="clear-board-btn">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* SVG Canvas */}
          <div className="flex-1 flex items-center justify-center bg-[#0a0d12] p-4 relative overflow-hidden">
            {/* AI Panel */}
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
                      <Textarea
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        placeholder="Ej: Ataque 4-3-3, presion alta, transicion rapida..."
                        className="mt-1 bg-slate-800/50 border-slate-700 text-white text-sm min-h-[80px] placeholder:text-slate-600"
                        data-testid="ai-description-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium">Equipo A (X)</label>
                        <Input
                          type="number" value={playerCounts.teamA}
                          onChange={(e) => setPlayerCounts(p => ({ ...p, teamA: parseInt(e.target.value) || 0 }))}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white text-sm h-9" min={0} max={15}
                          data-testid="ai-team-a-count"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium">Equipo B (O)</label>
                        <Input
                          type="number" value={playerCounts.teamB}
                          onChange={(e) => setPlayerCounts(p => ({ ...p, teamB: parseInt(e.target.value) || 0 }))}
                          className="mt-1 bg-slate-800/50 border-slate-700 text-white text-sm h-9" min={0} max={15}
                          data-testid="ai-team-b-count"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setShowAiPanel(false)} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                        Cancelar
                      </Button>
                      <Button onClick={handleAiGenerate} disabled={generating} className="flex-1 bg-[#c8f700] hover:bg-[#d9ff20] text-[#0b0e14] font-bold" data-testid="ai-generate-submit">
                        {generating ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Generando...</> : <><Sparkles className="w-4 h-4 mr-1" /> Generar</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Arrow tool hint */}
            {activeTool === 'arrow' && arrowStart && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-cyan-500/20 text-cyan-300 text-[11px] px-3 py-1.5 rounded-full border border-cyan-500/30 backdrop-blur-sm">
                Haz clic para fijar el final de la flecha
              </div>
            )}
            {activeTool === 'arrow' && !arrowStart && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-cyan-500/10 text-cyan-400/70 text-[11px] px-3 py-1.5 rounded-full border border-cyan-500/20">
                Haz clic para iniciar la flecha
              </div>
            )}

            <svg
              ref={svgRef}
              viewBox={sport.viewBox}
              className="max-h-full rounded-lg shadow-2xl select-none"
              style={{ background: sport.color, aspectRatio: '5/7', cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              data-testid="tactical-board-svg"
            >
              <defs>
                <marker id="tBoardArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L8,3 L0,6" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                </marker>
              </defs>

              {/* Field lines */}
              <g stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: sport.svg }} />

              {/* Elements */}
              {elements.map(el => renderElement(el))}

              {/* Arrow preview */}
              {arrowStart && mousePos && (
                <line x1={arrowStart.x} y1={arrowStart.y} x2={mousePos.x} y2={mousePos.y}
                  stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="5 3"
                  markerEnd="url(#tBoardArrow)" pointerEvents="none" />
              )}
            </svg>
          </div>

          {/* Right panel */}
          <div className="w-48 bg-slate-900/30 border-l border-slate-800/40 p-3 flex flex-col shrink-0">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wide mb-2">Elementos ({elements.length})</h4>
            <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: 'calc(100% - 60px)' }}>
              {elements.length === 0 ? (
                <p className="text-[10px] text-slate-600 text-center py-6">
                  Usa las herramientas de la izquierda o genera con IA
                </p>
              ) : (
                elements.map(el => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedId(el.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all ${
                      selectedId === el.id
                        ? 'bg-[#c8f700]/10 border border-[#c8f700]/30'
                        : 'hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      el.type === 'playerX' ? 'bg-[#c8f700]' :
                      el.type === 'playerO' ? 'bg-white' :
                      el.type === 'arrow' ? 'bg-cyan-400' :
                      el.type === 'cone' ? 'bg-orange-400' :
                      el.type === 'ball' ? 'bg-white' : 'bg-blue-400'
                    }`} />
                    <span className="text-slate-300 flex-1 truncate">
                      {el.type === 'playerX' ? `Jugador A #${el.label}` :
                       el.type === 'playerO' ? `Jugador B #${el.label}` :
                       el.type === 'arrow' ? 'Movimiento' :
                       el.type === 'cone' ? 'Cono' :
                       el.type === 'ball' ? 'Balon' :
                       el.label || 'Texto'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); pushHistory(); setElements(prev => prev.filter(x => x.id !== el.id)); if (selectedId === el.id) setSelectedId(null); }}
                      className="text-slate-600 hover:text-red-400 p-0.5 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-800/40 pt-2 mt-2">
              <div className="text-[9px] text-slate-600 text-center leading-relaxed">
                {teamACount} Eq.A / {teamBCount} Eq.B / {arrowCount} Flechas
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/60 bg-[#0b0e14]">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowAiPanel(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold"
              data-testid="ai-generate-board-btn"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Generar con IA
            </Button>
            <span className="text-[10px] text-slate-600">{elements.length} elementos en pizarra</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-400 hover:bg-slate-800 text-xs" data-testid="cancel-board-btn">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-[#c8f700] hover:bg-[#d9ff20] text-[#0b0e14] text-xs font-bold" data-testid="save-board-btn">
              <Save className="w-4 h-4 mr-1.5" />
              Guardar Pizarra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TacticalBoardEditor;

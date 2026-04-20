import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarWidget } from './ui/calendar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { 
  Target, Zap, Brain, Dumbbell, Heart, Calendar, Plus, Trash2, 
  Save, Download, Activity, Clock, ChevronDown, ChevronRight,
  GripVertical, AlertCircle, Share2, Copy, Check, FileText, Link2, Eye,
  Watch, Droplets, Battery, Moon, Sun, TrendingUp, TrendingDown, Bluetooth,
  Sparkles, LayoutGrid, X, Users, User, MapPin, Gauge, Layers, BarChart3, FlaskConical,
  Play, Pause, RotateCcw, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { EJERCICIOS_INICIALES } from './ExerciseLibrary';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BC = "'Barlow Condensed', sans-serif";
const DM = "'DM Sans', sans-serif";

// Inline sport field data for preview (avoids babel plugin issues with imports)
const BOARD_SPORTS = {
  football: { color: '#1e3a1e', viewBox: '0 0 300 420', svg: '<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210"/><circle cx="150" cy="210" r="42"/><circle cx="150" cy="210" r="2.5" fill="rgba(255,255,255,0.6)"/><rect x="70" y="15" width="160" height="70"/><rect x="105" y="15" width="90" height="30"/><path d="M100 85 A32 32 0 0 0 200 85"/><rect x="115" y="5" width="70" height="12" rx="1"/><rect x="70" y="335" width="160" height="70"/><rect x="105" y="375" width="90" height="30"/><path d="M100 335 A32 32 0 0 1 200 335"/><rect x="115" y="403" width="70" height="12" rx="1"/>' },
  basketball: { color: '#4a3728', viewBox: '0 0 300 420', svg: '<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210"/><circle cx="150" cy="210" r="28"/><rect x="95" y="15" width="110" height="55"/><circle cx="150" cy="70" r="8"/><rect x="140" y="15" width="20" height="3"/><path d="M70 15 A95 95 0 0 0 230 15"/><path d="M95 70 A55 55 0 0 0 205 70"/><rect x="95" y="350" width="110" height="55"/><circle cx="150" cy="350" r="8"/><rect x="140" y="402" width="20" height="3"/><path d="M70 405 A95 95 0 0 1 230 405"/><path d="M95 350 A55 55 0 0 1 205 350"/>' },
  volleyball: { color: '#1a3a5a', viewBox: '0 0 300 420', svg: '<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210" stroke-width="3"/><line x1="15" y1="140" x2="285" y2="140" stroke-dasharray="6 4"/><line x1="15" y1="280" x2="285" y2="280" stroke-dasharray="6 4"/>' },
  handball: { color: '#2a3a1e', viewBox: '0 0 300 420', svg: '<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210"/><path d="M90 15 A70 70 0 0 0 210 15"/><path d="M90 405 A70 70 0 0 1 210 405"/>' },
  futsal: { color: '#3a2e1e', viewBox: '0 0 300 420', svg: '<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210"/><circle cx="150" cy="210" r="30"/><rect x="80" y="15" width="140" height="55"/><rect x="80" y="350" width="140" height="55"/>' },
  tennis: { color: '#1a4a2e', viewBox: '0 0 300 420', svg: '<rect x="30" y="15" width="240" height="390" rx="2"/><line x1="30" y1="210" x2="270" y2="210" stroke-width="3"/><line x1="150" y1="80" x2="150" y2="340"/><rect x="30" y="80" width="240" height="260"/>' },
};

// ─── Preview component for saved tactical board ───
const TacticalBoardPreview = ({ board }) => {
  const boardSport = BOARD_SPORTS[board.sport] || BOARD_SPORTS.football;
  const els = board.elements || [];

  const renderPreviewElement = (el) => {
    switch (el.type) {
      case 'playerX':
        return (
          <g key={el.id} transform={`translate(${el.x},${el.y})`}>
            <circle r="11" fill="rgba(200,247,0,0.15)" stroke="#c8f700" strokeWidth="2"/>
            <text textAnchor="middle" dy="0.35em" fontSize="12" fill="#c8f700" fontWeight="900" fontFamily="Arial,sans-serif" style={{userSelect:'none'}}>X</text>
            {el.label && <text y="-15" textAnchor="middle" fontSize="8" fill="rgba(200,247,0,0.8)" fontWeight="bold" style={{userSelect:'none'}}>{el.label}</text>}
          </g>
        );
      case 'playerO':
        return (
          <g key={el.id} transform={`translate(${el.x},${el.y})`}>
            <circle r="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
            {el.label && <text y="-14" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)" fontWeight="bold" style={{userSelect:'none'}}>{el.label}</text>}
          </g>
        );
      case 'arrow':
        return (
          <line key={el.id} x1={el.x} y1={el.y} x2={el.x2} y2={el.y2}
            stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#prevArrowM)"/>
        );
      case 'cone':
        return <polygon key={el.id} points={`${el.x},${el.y-8} ${el.x-6},${el.y+5} ${el.x+6},${el.y+5}`} fill="#ff9800" opacity="0.8"/>;
      case 'ball':
        return <circle key={el.id} cx={el.x} cy={el.y} r="6" fill="white" stroke="#333" strokeWidth="1"/>;
      case 'text':
        return <text key={el.id} x={el.x} y={el.y} fontSize="10" fill="white" fontWeight="bold" style={{userSelect:'none'}}>{el.label}</text>;
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '280px', width: '100%' }}>
      <svg viewBox={boardSport.viewBox} className="w-full rounded-lg shadow-md" style={{ background: boardSport.color }}>
        <defs>
          <marker id="prevArrowM" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
          </marker>
        </defs>
        <g stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: boardSport.svg }} />
        {els.map(renderPreviewElement)}
      </svg>
      <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-slate-400">
        <span>{els.filter(e => e.type === 'playerX').length} Eq.A</span>
        <span>{els.filter(e => e.type === 'playerO').length} Eq.B</span>
        <span>{els.filter(e => e.type === 'arrow').length} Flechas</span>
      </div>
    </div>
  );
};

// ─── Mini reproductor de jugadas para miniaturas SVG con SMIL ───
// Mantiene la miniatura totalmente clickeable para abrir la pizarra (comportamiento original).
// Cuando el SVG contiene animaciones SMIL (<animate>, <animateMotion>), expone una barra de
// controles (Play/Pausa/Reset + scrubber) en una fila separada debajo del SVG.
const MiniBoardPlayer = ({ svgHtml, editHref, onEditClick, onRemove, testIdPrefix }) => {
  const wrapperRef = useRef(null);
  const svgElRef = useRef(null);
  const rafRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0..1 within current cycle
  const [duration, setDuration] = useState(2.8); // seconds per cycle
  const [hasAnim, setHasAnim] = useState(false);

  // Locate the actual <svg> element and read the longest cycle duration.
  useEffect(() => {
    if (!wrapperRef.current) return;
    const svg = wrapperRef.current.querySelector('svg');
    svgElRef.current = svg;
    if (!svg) { setHasAnim(false); return; }
    const anims = svg.querySelectorAll('animate, animateMotion, animateTransform');
    setHasAnim(anims.length > 0);
    let maxDur = 0;
    anims.forEach(a => {
      const d = a.getAttribute('dur') || '';
      const m = d.match(/([\d.]+)\s*(ms|s)?/i);
      if (m) {
        const v = parseFloat(m[1]);
        const secs = (m[2] && m[2].toLowerCase() === 'ms') ? v / 1000 : v;
        if (secs > maxDur) maxDur = secs;
      }
    });
    if (maxDur > 0) setDuration(maxDur);
    try { svg.unpauseAnimations(); } catch (_) {}
    setIsPlaying(true);
  }, [svgHtml]);

  // Poll current time to update the scrubber while playing.
  useEffect(() => {
    const tick = () => {
      const svg = svgElRef.current;
      if (svg && isPlaying) {
        try {
          const t = svg.getCurrentTime() % duration;
          setProgress(duration > 0 ? t / duration : 0);
        } catch (_) {}
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, duration]);

  const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
  const handlePlay = (e) => {
    stop(e);
    const svg = svgElRef.current; if (!svg) return;
    try { svg.unpauseAnimations(); } catch (_) {}
    setIsPlaying(true);
  };
  const handlePause = (e) => {
    stop(e);
    const svg = svgElRef.current; if (!svg) return;
    try { svg.pauseAnimations(); } catch (_) {}
    setIsPlaying(false);
  };
  const handleReset = (e) => {
    stop(e);
    const svg = svgElRef.current; if (!svg) return;
    try { svg.setCurrentTime(0); svg.unpauseAnimations(); } catch (_) {}
    setProgress(0);
    setIsPlaying(true);
  };
  const handleScrub = (e) => {
    stop(e);
    const svg = svgElRef.current; if (!svg) return;
    const v = parseFloat(e.target.value);
    const t = (v / 100) * duration;
    try { svg.pauseAnimations(); svg.setCurrentTime(t); } catch (_) {}
    setIsPlaying(false);
    setProgress(v / 100);
  };

  return (
    <div className="w-full flex-1 flex flex-col" style={{minHeight:'120px'}}>
      {/* Miniatura clickeable — usa <a target="_blank"> nativo para no ser bloqueado por popup blocker */}
      {/* IMPORTANTE: rel="opener" es OBLIGATORIO. Desde Chrome 88/Firefox 79/Safari 12.1,
          target="_blank" implícitamente aplica noopener y bloquea window.opener.
          tactical-board.html necesita window.opener para enviar postMessage con el thumbnail guardado. */}
      <a
        ref={wrapperRef}
        href={editHref}
        target="_blank"
        rel="opener"
        onClick={(e) => { if (onEditClick) onEditClick(e); }}
        className="block w-full flex-1 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-[#c8f700] hover:shadow-md overflow-hidden transition-all"
        style={{minHeight:'95px'}}
        data-testid={`${testIdPrefix}-thumb`}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />

      {/* Barra de controles (solo si el SVG tiene animaciones SMIL) */}
      {hasAnim && (
        <div
          className="mt-1 flex items-center gap-1 px-1.5 py-1 rounded-md"
          style={{background:'#0a0a0f',border:'1px solid rgba(204,255,0,0.15)'}}
          onClick={stop}
          onMouseDown={stop}
          data-testid={`${testIdPrefix}-controls`}
        >
          {isPlaying ? (
            <button
              type="button"
              onClick={handlePause}
              className="w-5 h-5 rounded-full bg-white hover:bg-white text-slate-900 flex items-center justify-center shadow transition-transform hover:scale-110 flex-shrink-0"
              title="Pausar"
              data-testid={`${testIdPrefix}-pause`}
            >
              <Pause className="w-2.5 h-2.5" fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlay}
              className="w-5 h-5 rounded-full bg-[#c8f700] hover:bg-[#d9ff3a] text-slate-900 flex items-center justify-center shadow transition-transform hover:scale-110 flex-shrink-0"
              title="Reproducir"
              data-testid={`${testIdPrefix}-play`}
            >
              <Play className="w-2.5 h-2.5" fill="currentColor" />
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-transform hover:scale-110 border border-white/20 flex-shrink-0"
            title="Reiniciar"
            data-testid={`${testIdPrefix}-reset`}
          >
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={Math.round(progress * 1000) / 10}
            onChange={handleScrub}
            onClick={stop}
            onMouseDown={stop}
            className="flex-1 h-1 accent-[#c8f700] cursor-pointer"
            style={{minWidth:'30px'}}
            title="Línea de tiempo"
            data-testid={`${testIdPrefix}-scrubber`}
          />
          <span className="text-[8px] font-bold text-white/70 tabular-nums flex-shrink-0" style={{fontFamily:DM,minWidth:'28px',textAlign:'right'}}>
            {(progress * duration).toFixed(1)}s
          </span>
        </div>
      )}

      {/* Pista: si no hay animación, invita a re-guardar la pizarra para activarla */}
      {!hasAnim && (
        <div className="mt-1 px-1.5 py-0.5 rounded-md text-[8px] text-center text-slate-400" style={{fontFamily:DM,background:'#f8fafc',border:'1px dashed #e2e8f0'}} data-testid={`${testIdPrefix}-noanim`}>
          Guardá de nuevo para activar reproducción
        </div>
      )}

      {/* Botón explícito "Editar pizarra" — garantiza apertura (anchor nativo) */}
      {/* IMPORTANTE: rel="opener" necesario para que tactical-board.html pueda usar window.opener.postMessage */}
      <a
        href={editHref}
        target="_blank"
        rel="opener"
        onClick={(e) => { if (onEditClick) onEditClick(e); }}
        className="mt-1 flex items-center justify-center gap-1 h-6 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all hover:brightness-110 no-underline"
        style={{background:'#0a0a0f',color:'#c8f700',fontFamily:DM,border:'1px solid rgba(204,255,0,0.3)'}}
        data-testid={`${testIdPrefix}-edit-btn`}
      >
        <Pencil className="w-2.5 h-2.5" /> Editar
      </a>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => { stop(e); onRemove(); }}
          className="text-[9px] text-slate-400 hover:text-red-400 mt-0.5 block w-full text-center transition-colors font-medium"
          data-testid={`${testIdPrefix}-remove`}
        >
          Quitar
        </button>
      )}
    </div>
  );
};

// Capacidades físicas
const CAPACIDADES_FISICAS = [
  { id: 'fuerza', name: 'Fuerza' },
  { id: 'resistencia', name: 'Resistencia' },
  { id: 'velocidad', name: 'Velocidad' },
  { id: 'flexibilidad', name: 'Flexibilidad' },
  { id: 'coordinacion', name: 'Coordinación' },
  { id: 'equilibrio', name: 'Equilibrio' },
  { id: 'agilidad', name: 'Agilidad' },
  { id: 'potencia', name: 'Potencia' }
];

// Métodos de entrenamiento predefinidos
const METODOS_ENTRENAMIENTO = [
  { id: 'continuo-uniforme', name: 'Continuo Uniforme' },
  { id: 'intervalos', name: 'Intervalos' },
  { id: 'series', name: 'Series' },
  { id: 'repetido', name: 'Repetido' },
  { id: 'velocidad', name: 'Velocidad' },
  { id: 'continuo-variable', name: 'Continuo Variable' },
  { id: 'fartlek', name: 'Fartlek' },
  { id: 'piramidal', name: 'Piramidal' },
  { id: 'circuito', name: 'Circuito' },
  { id: 'competitivo', name: 'Competitivo' },
  { id: 'juego', name: 'Juego' }
];

// Procedimientos organizativos
const PROC_ORGANIZATIVO = [
  { id: 'individual', name: 'Individual' },
  { id: 'parejas', name: 'En Parejas' },
  { id: 'grupos', name: 'En Grupos' },
  { id: 'equipo', name: 'Equipo Completo' },
  { id: 'estaciones', name: 'Por Estaciones' },
  { id: 'circuito', name: 'Circuito' }
];

// ─── Configuración por capacidad física ───
const CAPACITY_CONFIG = {
  fuerza: {
    subtipos: ['Maxima','Explosiva','Resistencia'],
    unidadesInt: ['%1RM','RPE'],
    unidadesVol: ['Reps','kg totales'],
    volLabel: 'Reps', volPh: '10-12', serPh: '3-6',
    intRef: '85-100%', denPh: '3-5 min', recPh: '3-5 min', freqPh: '2-4x/sem',
    medidaLabel: 'Kg', medidaPh: '80',
    showDeficit: true
  },
  resistencia: {
    subtipos: ['Aerobica','Anaerobica','Mixta'],
    unidadesInt: ['%FCmax','%FCres','RPE'],
    unidadesVol: ['Minutos','Metros','Km'],
    volLabel: 'Minutos', volPh: '30-120', serPh: '1-12',
    intRef: 'Z1-Z5', denPh: 'Continuo', recPh: '1:3', freqPh: '3-5x/sem',
    medidaLabel: 'Km', medidaPh: '5',
    showZonas: true
  },
  velocidad: {
    subtipos: ['Reaccion','Desplazamiento','Gestual'],
    unidadesInt: ['%Vmax','RPE'],
    unidadesVol: ['Metros','Sprints'],
    volLabel: 'Metros', volPh: '10-60', serPh: '6-10',
    intRef: 'Maxima', denPh: '1:10-1:20', recPh: '3-5 min', freqPh: '2-3x/sem',
    medidaLabel: 'Metros', medidaPh: '400'
  },
  flexibilidad: {
    subtipos: ['Estatica','Dinamica','FNP'],
    unidadesInt: ['ROM','RPE'],
    unidadesVol: ['Segundos','Series'],
    volLabel: 'Segundos', volPh: '30-60', serPh: '2-4',
    intRef: 'Submaxima', denPh: '20-30s', recPh: '20-30s', freqPh: '5-7x/sem',
    medidaLabel: 'ROM (°)', medidaPh: '45'
  },
  coordinacion: {
    subtipos: ['Equilibrio','Ritmo','Orientacion','Diferenciacion','Acoplamiento','Agilidad'],
    unidadesInt: ['Escala 1-5','RPE'],
    unidadesVol: ['Tareas','Minutos'],
    volLabel: 'Tareas', volPh: '5-10', serPh: '3-5',
    intRef: 'Moderada', denPh: 'Alta var.', recPh: '1-2 min', freqPh: '3-5x/sem',
    medidaLabel: 'Tareas', medidaPh: '5',
    showComplejidad: true
  },
  equilibrio: {
    subtipos: ['Estatico','Dinamico'],
    unidadesInt: ['Escala 1-5','RPE'],
    unidadesVol: ['Segundos','Reps'],
    volLabel: 'Segundos', volPh: '15-30', serPh: '3-5',
    intRef: 'Moderada', denPh: '30-60s', recPh: '30-60s', freqPh: '3-5x/sem',
    medidaLabel: 'Segundos', medidaPh: '20',
    showComplejidad: true
  },
  agilidad: {
    subtipos: ['Cambios direccion','Reactiva','Planificada'],
    unidadesInt: ['RPE','Escala 1-5'],
    unidadesVol: ['Metros','Reps'],
    volLabel: 'Metros', volPh: '10-30', serPh: '6-10',
    intRef: 'Maxima', denPh: '1:5-1:10', recPh: '2-3 min', freqPh: '2-3x/sem',
    medidaLabel: 'Metros', medidaPh: '20',
    showComplejidad: true
  },
  potencia: {
    subtipos: ['Tren superior','Tren inferior','Total'],
    unidadesInt: ['%1RM','RPE','Watts'],
    unidadesVol: ['Reps','kg totales'],
    volLabel: 'Reps', volPh: '3-6', serPh: '3-5',
    intRef: '30-70%', denPh: '2-4 min', recPh: '2-4 min', freqPh: '2-3x/sem',
    medidaLabel: 'Kg', medidaPh: '60',
    showDeficit: true
  }
};

const MODELOS_PROGRESION = [
  { id: 'lineal', name: 'Lineal', desc: 'Incremento constante semana a semana' },
  { id: 'ondulada', name: 'Ondulada', desc: 'Alternancia de cargas alta/baja' },
  { id: 'bloques', name: 'Bloques', desc: 'Fases concentradas por capacidad' },
  { id: 'conjugada', name: 'Conjugada', desc: 'Múltiples cualidades simultáneas' }
];

// Cálculo de métricas derivadas
const calcMetricas = (act) => {
  const vol = parseFloat(act.volumen) || 0;
  const int = parseFloat(act.intensidad) || 0;
  const ser = parseFloat(act.series) || 0;
  const reps = parseInt(act.repeticiones) || 0;
  const den = act.densidad || '';
  const recup = act.recuperacion || '';
  const comp = parseFloat(act.complejidad) || 3;
  const cap = act.capacidadFisica || 'fuerza';
  const cargaTotal = Math.round(vol * int / 100);
  const cargaSesion = Math.round(ser * vol * int / 100);

  const result = { cargaTotal, cargaSesion };

  // Densidad — Ratio trabajo:descanso (input manual "1:3")
  if (den) {
    const parts = den.split(':').map(Number);
    if (parts.length === 2 && parts[1] > 0) {
      result.ratioDensidad = +(parts[0] / parts[1]).toFixed(2);
      result.densidadTipo = 'ratio';
    }
  }

  // Densidad — Auto-calculada: series/min
  const recMin = parseFloat(recup) || 0;
  if (ser > 0 && recMin > 0) {
    // Estimate work time per set ~30-60s depending on reps
    const workPerSet = Math.max(reps * 3, 20); // seconds per set
    const restPerSet = recMin * 60; // convert "2 min" → 120s
    const totalTimeSec = ser * (workPerSet + restPerSet);
    const totalTimeMin = totalTimeSec / 60;
    result.seriesPorMin = +(ser / totalTimeMin).toFixed(2);
    result.tiempoTotalMin = Math.round(totalTimeMin);
    result.tiempoTrabajo = Math.round(ser * workPerSet / 60);
    result.tiempoDescanso = Math.round(ser * restPerSet / 60);
    // Ratio trabajo:descanso auto
    if (result.tiempoDescanso > 0) {
      result.ratioDensidadAuto = +(result.tiempoTrabajo / result.tiempoDescanso).toFixed(2);
    }
    // Densidad como % (0-100 normalizado: 0.5 series/min = 100%)
    result.densidadPct = Math.min(Math.round(result.seriesPorMin * 200), 100);
  }

  // Coordinativas / Equilibrio / Agilidad → NeuroCarga
  const cfg = CAPACITY_CONFIG[cap];
  if (cfg?.showComplejidad) {
    result.neuroCarga = Math.round(comp * ser * 10);
  }

  // Fuerza / Potencia → Déficit indicator
  if (cfg?.showDeficit && int > 0) {
    result.zonaFuerza = int >= 85 ? 'F. Maxima' : int >= 60 ? 'Hipertrofia' : int >= 40 ? 'F. Explosiva' : 'Resistencia F.';
  }

  // Resistencia → Zona FC
  if (cfg?.showZonas && int > 0) {
    result.zonaFC = int >= 90 ? 'Z5 (VO2max)' : int >= 80 ? 'Z4 (Umbral)' : int >= 70 ? 'Z3 (Tempo)' : int >= 60 ? 'Z2 (Aerobico)' : 'Z1 (Regen)';
  }

  return result;
};

// Progresión MEV→MAV→MRV
const calcProgresionSemanal = (volBase, semana, prog) => {
  const tasa = (prog?.tasaIncremento || 5) / 100;
  const semDesc = prog?.semanaDescarga || 4;
  const redDesc = (prog?.reduccionDescarga || 50) / 100;
  const semEnCiclo = ((semana - 1) % semDesc) + 1;
  if (semEnCiclo === semDesc) return Math.round(volBase * redDesc);
  return Math.round(volBase * (1 + tasa * (semEnCiclo - 1)));
};

// Estructura inicial de una actividad
const ACTIVIDAD_INICIAL = {
  id: '',
  ejercicio: '',
  ejercicioId: null,
  descripcion: '',
  capacidadFisica: 'fuerza',
  subtipo: '',
  metodo: 'series',
  series: 3,
  repeticiones: '10-12',
  intensidad: 70,
  unidadIntensidad: '%1RM',
  volumen: 30,
  unidadVolumen: 'Reps',
  medida: '',
  densidad: '',
  complejidad: 3,
  procOrganizativo: 'individual',
  recuperacion: '2 min',
  materiales: [],
  boardId: null,
  boardThumbnail: null,
  progresion: {
    modelo: 'lineal',
    tasaIncremento: 5,
    semanaDescarga: 4,
    reduccionDescarga: 50
  }
};

const MATERIALES_DISPONIBLES = [
  'Conos', 'Aros', 'Escalera de coordinacion', 'Balones', 'Vallas', 'Pesas',
  'Mancuernas', 'Bandas elasticas', 'TRX', 'Colchonetas', 'Picas', 'Cuerdas',
  'Kettlebells', 'Platos de peso', 'Balones medicinales', 'Cajones pliometricos',
  'Trineos', 'Paracaidas', 'Rodillos', 'Steps', 'Bosu', 'Platillos',
  'Chalecos con peso', 'Barras', 'Miniporteria', 'Maniquies'
];

// Estructura inicial de sesión
const SESION_INICIAL = {
  objetivos: {
    general: '',
    fisico: '',
    tecnico: '',
    tactico: '',
    psicologico: '',
    teorico: ''
  },
  fases: {
    inicial: {
      nombre: 'Fase Inicial',
      color: 'border-l-green-500',
      bgColor: 'bg-green-50',
      actividades: []
    },
    principal: {
      nombre: 'Fase Principal',
      color: 'border-l-orange-500',
      bgColor: 'bg-orange-50',
      actividades: []
    },
    final: {
      nombre: 'Fase Final',
      color: 'border-l-blue-500',
      bgColor: 'bg-blue-50',
      actividades: []
    }
  },
  monitoreo: {
    // Frecuencia Cardíaca
    fcReposo: '',
    fcMaxima: '',
    fcMedia: '',
    // Fases de FC — valores preestablecidos para que la gráfica sea visible desde el inicio
    fcAntesEntrenamiento: '70',
    fcDuranteEntrenamiento: '150',
    fcDespuesEntrenamiento: '90',
    // Recuperación por tiempo
    fcRecuperacion1min: '85',
    fcRecuperacion3min: '78',
    fcRecuperacion5min: '72',
    fcRecuperacion10min: '68',
    mostrarRecuperacion10min: false,
    // Tipo de gráfica
    tipoGrafica: 'barras', // 'barras', 'lineas', 'mixta'
    estiloLinea: 'lime', // 'lime', 'multi', 'punteada', 'gradient'
    // Zonas de trabajo (%)
    zonaAerobica: '',
    zonaAnaerobica: '',
    zonaRecuperacion: '',
    // Estado físico
    nivelFatiga: 50, // 0-100
    nivelHidratacion: 80, // 0-100
    calidadSueno: 75, // 0-100
    nivelEnergia: 70, // 0-100
    // Conexión dispositivo
    dispositivoConectado: false,
    nombreDispositivo: ''
  },
  retroalimentacion: '',
  tacticalBoard: null,
  sessionName: '',
  sessionStatus: 'planificada',
  duration: '90',
  location: '',
  sessionType: 'tecnico-tactico',
  team: '',
  coach: '',
  estimatedLoad: ''
};

const SessionEditor = ({ 
  isOpen, 
  onClose, 
  session, 
  onSave,
  exercises = {},
  trainingMethods = [],
  athleteId,
  athleteName
}) => {
  const [sessionData, setSessionData] = useState(SESION_INICIAL);
  const [expandedPhases, setExpandedPhases] = useState({
    inicial: true,
    principal: true,
    final: true
  });
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [showExercisePicker, setShowExercisePicker] = useState(null);
  const [pickerCat, setPickerCat] = useState(null);
  const [pickerSub, setPickerSub] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedBoard, setExpandedBoard] = useState(null);
  const [expandedPanels, setExpandedPanels] = useState({});
  const [sessionDate, setSessionDate] = useState(session?.date ? new Date(session.date) : undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const sessionContentRef = useRef(null);
  const boardEditContextRef = useRef(null);

  // Listen for postMessage from tactical board (opened in new tab)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'tactical-board-saved' && boardEditContextRef.current) {
        const { faseKey, actId } = boardEditContextRef.current;
        // Find activity by ID (not index) to avoid stale references
        setSessionData(prev => {
          const actividades = prev.fases[faseKey]?.actividades || [];
          const actIdx = actividades.findIndex(a => a.id === actId);
          if (actIdx === -1) return prev;
          const newActividades = [...actividades];
          newActividades[actIdx] = {
            ...newActividades[actIdx],
            boardId: event.data.boardId,
            boardThumbnail: event.data.thumbnail
          };
          return {
            ...prev,
            fases: {
              ...prev.fases,
              [faseKey]: {
                ...prev.fases[faseKey],
                actividades: newActividades
              }
            }
          };
        });
        setExpandedBoard(boardEditContextRef.current.actId);
        boardEditContextRef.current = null;
        toast.success('Pizarra vinculada a la actividad');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load exercises: use EJERCICIOS_INICIALES as base, override with user's library if saved
  const [exercisesCat, setExercisesCat] = useState(EJERCICIOS_INICIALES);
  const fetchUserLib = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('train_token');
      if (!token) return;
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/exercise-library`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const cats = data.categories;
      if (cats && typeof cats === 'object' && Object.keys(cats).length > 0) {
        setExercisesCat(cats);
      }
    } catch (e) { /* keep EJERCICIOS_INICIALES */ }
  }, []);
  useEffect(() => {
    fetchUserLib();
    // Listen for library updates from ExerciseLibrary component
    const handler = () => fetchUserLib();
    window.addEventListener('exercise-library-updated', handler);
    return () => window.removeEventListener('exercise-library-updated', handler);
  }, [fetchUserLib]);

  // Cargar datos de la sesión existente
  useEffect(() => {
    if (session && session.detailedData) {
      setSessionData(session.detailedData);
    } else {
      // Reset con datos básicos de la sesión
      setSessionData({
        ...SESION_INICIAL,
        objetivos: {
          ...SESION_INICIAL.objetivos,
          general: session?.type ? `Sesión de ${session.type}` : ''
        }
      });
    }
  }, [session]);

  // Actualizar objetivos
  const updateObjetivo = (key, value) => {
    setSessionData(prev => ({
      ...prev,
      objetivos: {
        ...prev.objetivos,
        [key]: value
      }
    }));
  };

  // Agregar actividad a una fase
  const addActividad = (faseKey) => {
    const newActividad = {
      ...ACTIVIDAD_INICIAL,
      id: `act-${Date.now()}`
    };
    setSessionData(prev => ({
      ...prev,
      fases: {
        ...prev.fases,
        [faseKey]: {
          ...prev.fases[faseKey],
          actividades: [...prev.fases[faseKey].actividades, newActividad]
        }
      }
    }));
  };

  // Actualizar actividad
  const updateActividad = (faseKey, actIdx, field, value) => {
    setSessionData(prev => {
      const newActividades = [...prev.fases[faseKey].actividades];
      newActividades[actIdx] = {
        ...newActividades[actIdx],
        [field]: value
      };
      return {
        ...prev,
        fases: {
          ...prev.fases,
          [faseKey]: {
            ...prev.fases[faseKey],
            actividades: newActividades
          }
        }
      };
    });
  };

  // Update multiple fields at once (avoids state race conditions)
  const updateActividadMulti = (faseKey, actIdx, updates) => {
    setSessionData(prev => {
      const newActividades = [...prev.fases[faseKey].actividades];
      newActividades[actIdx] = {
        ...newActividades[actIdx],
        ...updates
      };
      return {
        ...prev,
        fases: {
          ...prev.fases,
          [faseKey]: {
            ...prev.fases[faseKey],
            actividades: newActividades
          }
        }
      };
    });
  };

  // Eliminar actividad
  const deleteActividad = (faseKey, actIdx) => {
    setSessionData(prev => ({
      ...prev,
      fases: {
        ...prev.fases,
        [faseKey]: {
          ...prev.fases[faseKey],
          actividades: prev.fases[faseKey].actividades.filter((_, i) => i !== actIdx)
        }
      }
    }));
  };

  // Seleccionar ejercicio del picker
  const selectExercise = (faseKey, actIdx, ejercicioNombre) => {
    updateActividad(faseKey, actIdx, 'ejercicio', ejercicioNombre);
    setShowExercisePicker(null);
    setExerciseSearchTerm('');
  };

  // Obtener ejercicios filtrados
  const getFilteredExercises = () => {
    const results = [];
    const term = exerciseSearchTerm.toLowerCase();
    
    Object.entries(exercisesCat).forEach(([catId, cat]) => {
      if (cat.subcategorias) {
        Object.entries(cat.subcategorias).forEach(([subId, sub]) => {
          sub.ejercicios?.forEach(ej => {
            // Si no hay término de búsqueda, mostrar todos
            // Si hay término, filtrar por nombre de ejercicio o categoría
            if (!term || ej.nombre.toLowerCase().includes(term) || 
                cat.nombre.toLowerCase().includes(term)) {
              results.push({
                ...ej,
                categoria: cat.nombre,
                subcategoria: sub.nombre
              });
            }
          });
        });
      }
    });
    
    return results.slice(0, 15); // Limitar a 15 resultados
  };

  // Guardar sesión (sin cerrar el modal)
  const handleSave = async () => {
    try {
      const updatedSession = {
        ...session,
        detailedData: sessionData
      };
      await onSave(updatedSession);
      toast.success('Sesión guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar la sesión');
    }
  };

  // Salir del editor
  const handleExit = () => {
    onClose();
  };

  // Exportar sesión como PDF — crea enlace compartido y descarga via Playwright backend
  const handleExportAsPDF = async (theme = 'dark') => {
    if (exporting) return;
    setExporting(true);
    
    try {
      const token = localStorage.getItem('train_token');
      if (!token) { toast.error('Sesión expirada'); setExporting(false); return; }
      
      toast.info('Generando PDF...');
      
      const sesCode = `SES-${String(session?.sessionIndex || session?.dayName || '001').padStart(3, '0')}`;
      
      // 1) Crear enlace compartido temporal con los datos actuales
      const shareRes = await fetch(`${API_URL}/api/sessions/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          athlete_id: athleteId || 'general',
          athlete_name: athleteName || 'Deportista',
          session_data: { ...session, detailedData: sessionData },
          session_code: sesCode
        })
      });
      
      if (!shareRes.ok) throw new Error('Error al preparar datos');
      const { share_id } = await shareRes.json();
      
      // 2) Descargar PDF generado por Playwright en el backend
      const pdfRes = await fetch(`${API_URL}/api/sessions/download-pdf/${share_id}?theme=${theme}`);
      if (!pdfRes.ok) throw new Error('Error al generar PDF');
      
      const blob = await pdfRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const nm = (sessionData.sessionName || 'Sesion').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').replace(/\s+/g, '-');
      a.download = `iTRAIN_${sesCode}_${nm}_${theme}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF descargado');
    } catch (error) {
      console.error('Error PDF:', error);
      toast.error('Error al generar el PDF. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  // Generar enlace para compartir (con imagen)
  const handleGenerateShareLink = async () => {
    if (exporting) return;
    setExporting(true);
    
    try {
      const token = localStorage.getItem('train_token');
      
      if (!token) {
        toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
        setExporting(false);
        return;
      }
      
      toast.info('Generando enlace...');
      
      // Capturar la imagen de la sesión
      let imageBase64 = null;
      try {
        const html2canvas = (await import('html2canvas')).default;
        const contentElement = document.querySelector('[data-testid="session-editor-content"]');
        
        if (contentElement) {
          // Guardar className original y modificar para captura
          const originalClassName = contentElement.className;
          contentElement.className = 'bg-white'; // Quitar overflow y max-height
          
          // Esperar que el DOM se actualice
          await new Promise(resolve => setTimeout(resolve, 150));
          
          const canvas = await html2canvas(contentElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false
          });
          
          // Restaurar className original
          contentElement.className = originalClassName;
          
          imageBase64 = canvas.toDataURL('image/png');
          console.log('Image captured successfully, size:', canvas.width, 'x', canvas.height);
        }
      } catch (imgError) {
        console.error('Error capturing image:', imgError);
        toast.warning('No se pudo capturar la imagen, se compartirá solo los datos');
      }
      
      const sesCode = `SES-${String(session?.sessionIndex || session?.dayName || '001').padStart(3, '0')}`;
      
      const sessionToShare = {
        athlete_id: athleteId || 'general',
        athlete_name: athleteName || 'Deportista',
        session_data: {
          ...session,
          detailedData: sessionData
        },
        session_image: imageBase64,
        session_code: sesCode
      };
      
      const response = await fetch(`${API_URL}/api/sessions/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionToShare)
      });
      
      if (response.ok) {
        const data = await response.json();
        const fullLink = `${window.location.origin}/s/${data.share_id}`;
        setShareLink(fullLink);
        setShowShareDialog(true);
        toast.success(imageBase64 ? 'Enlace con imagen generado' : 'Enlace generado (sin imagen)');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al generar enlace');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      toast.error(error.message || 'Error al generar enlace');
    } finally {
      setExporting(false);
    }
  };

  // Copiar enlace al portapapeles
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      toast.error('Error al copiar enlace');
    }
  };

  // Renderizar actividades como FILAS horizontales densas (estilo data-grid)
  const renderActividadesTable = (faseKey, fase) => {
    return (
      <div className="space-y-1.5">
        {fase.actividades.map((act, idx) => {
          const actMateriales = act.materiales || [];
          const met = calcMetricas(act);
          const capCfg = CAPACITY_CONFIG[act.capacidadFisica] || CAPACITY_CONFIG.fuerza;
          const prog = act.progresion || { modelo: 'lineal', tasaIncremento: 5, semanaDescarga: 4, reduccionDescarga: 50 };
          const panelKey = `panel-${faseKey}-${idx}`;
          const isExpanded = expandedPanels?.[panelKey];
          const intUnit = act.unidadIntensidad || capCfg.unidadesInt[0];
          const volUnit = act.unidadVolumen || capCfg.unidadesVol[0];
          const intColor = act.intensidad>80?'#ef4444':act.intensidad>60?'#f59e0b':act.intensidad>40?'#84cc16':'#22c55e';
          const intGradient = act.intensidad>80?'linear-gradient(90deg,#f59e0b,#ef4444)':act.intensidad>60?'linear-gradient(90deg,#84cc16,#f59e0b)':act.intensidad>40?'linear-gradient(90deg,#22c55e,#84cc16)':'linear-gradient(90deg,#06b6d4,#22c55e)';
          const intSuffix = (intUnit === '%1RM' || intUnit === '%FCmax' || intUnit === '%FCres' || intUnit === '%Vmax') ? '%' : '';
          const isBoardOpen = expandedBoard === act.id;
          return (
          <div key={act.id} className="rounded-lg bg-white overflow-visible transition-shadow hover:shadow-md" style={{ position: 'relative', zIndex: showExercisePicker === `${faseKey}-${idx}` ? 1000 : 1, border: '1px solid rgba(0,0,0,0.06)' }}>

            {/* === FILA PRINCIPAL (72px) === */}
            <div className="flex items-center gap-2.5 px-3" style={{minHeight:'72px'}}>
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'#CCFF00'}}>
                <Dumbbell className="w-4 h-4" style={{color:'#0a0a0f'}} />
              </div>

              {/* Exercise + picker */}
              <div className="relative w-[200px] flex-shrink-0">
                <Input value={act.ejercicio} onChange={(e) => updateActividad(faseKey, idx, 'ejercicio', e.target.value)} onFocus={() => { setShowExercisePicker(`${faseKey}-${idx}`); setPickerCat(null); setPickerSub(null); }} placeholder="Ejercicio..." className="h-9 text-[13px] font-semibold border-slate-200 text-slate-900 rounded-lg px-2.5 focus:ring-1 focus:ring-[#84cc16] focus:border-[#84cc16]" data-testid={`exercise-input-${faseKey}-${idx}`} style={{fontFamily:DM}} />
                {showExercisePicker === `${faseKey}-${idx}` && (
                  <div className="absolute left-0 top-[40px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: 99999, minWidth: '380px' }} onMouseDown={(e) => e.preventDefault()}>
                    <div className="p-2 border-b bg-slate-50">
                      <Input placeholder="Buscar ejercicio..." value={exerciseSearchTerm} onChange={(e) => { setExerciseSearchTerm(e.target.value); setPickerCat(null); setPickerSub(null); }} className="h-7 text-xs bg-white" autoFocus />
                    </div>
                    {exerciseSearchTerm ? (
                      <div className="max-h-48 overflow-y-auto p-1">
                        {getFilteredExercises().map((ej, ejIdx) => (
                          <button key={`${ej.nombre}-${ejIdx}`} className="w-full text-left px-3 py-1.5 hover:bg-[#f8ffe0] rounded-lg" onClick={() => { selectExercise(faseKey, idx, ej.nombre); if(ej.descripcion) updateActividad(faseKey, idx, 'descripcion', ej.descripcion); }}>
                            <p className="font-medium text-slate-800 text-[11px]">{ej.nombre}</p>
                            <p className="text-slate-400 text-[9px]">{ej.categoria} &middot; {ej.subcategoria}</p>
                          </button>
                        ))}
                        {getFilteredExercises().length === 0 && <p className="text-center text-slate-400 py-3 text-xs">Sin resultados</p>}
                      </div>
                    ) : (
                      <div className="flex" style={{ maxHeight: '220px' }}>
                        <div className="w-[130px] border-r border-slate-100 overflow-y-auto bg-slate-50/50">
                          {Object.entries(exercisesCat).map(([catId, cat]) => (
                            <button key={catId} onClick={() => { setPickerCat(catId); const subs=Object.keys(exercisesCat[catId]?.subcategorias||{}); setPickerSub(subs.length===1?subs[0]:null); }} className={`w-full text-left px-2.5 py-1.5 text-[10px] ${pickerCat===catId?'bg-[#f0ffd0] text-[#3a5a00] font-bold':'hover:bg-slate-100 text-slate-600'}`}>{cat.nombre}</button>
                          ))}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {!pickerCat ? <p className="text-center text-slate-300 py-6 text-xs">Selecciona categoría</p> : (
                            <div className="p-1">
                              {exercisesCat[pickerCat]?.subcategorias && Object.entries(exercisesCat[pickerCat].subcategorias).map(([subId, sub]) => (
                                <div key={subId} className="mb-0.5">
                                  <button onClick={() => setPickerSub(pickerSub===subId?null:subId)} className="w-full text-left px-2 py-1 text-[9px] uppercase tracking-wide font-bold text-slate-500 hover:text-[#3a5a00] rounded flex items-center justify-between">
                                    {sub.nombre}<ChevronDown className={`w-3 h-3 transition-transform ${pickerSub===subId?'rotate-180':''}`} />
                                  </button>
                                  {pickerSub===subId && sub.ejercicios?.map((ej, i) => (
                                    <button key={i} onClick={() => { selectExercise(faseKey, idx, ej.nombre); if(ej.musculos) updateActividad(faseKey, idx, 'descripcion', ej.musculos); }} className="w-full text-left px-3 py-1 hover:bg-[#f8ffe0] rounded text-[11px] text-slate-700">{ej.nombre}</button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <button className="w-full text-center text-slate-400 py-1 border-t bg-slate-50 text-[10px] hover:text-slate-600" onClick={() => setShowExercisePicker(null)}>Cerrar</button>
                  </div>
                )}
              </div>

              {/* Descripción — input inline truncado */}
              <div className="flex-1 min-w-[140px]">
                <Input value={act.descripcion||''} onChange={(e) => updateActividad(faseKey, idx, 'descripcion', e.target.value)} placeholder="Descripción, grupos musculares, variantes..." className="h-9 text-[12px] border-slate-200 text-slate-700 rounded-lg px-2.5 focus:ring-1 focus:ring-[#84cc16] focus:border-[#84cc16] truncate" style={{fontFamily:DM}} data-testid={`exercise-desc-${faseKey}-${idx}`} />
              </div>

              {/* Capacidad pill */}
              <Select value={act.capacidadFisica} onValueChange={(v) => updateActividad(faseKey, idx, 'capacidadFisica', v)}>
                <SelectTrigger className="h-7 text-[10px] font-semibold w-auto min-w-[86px] border-0 rounded-full px-2.5 flex-shrink-0" style={{background:'rgba(132,204,22,0.12)',color:'#3f6212'}} data-testid={`capacity-select-${faseKey}-${idx}`}><SelectValue /></SelectTrigger>
                <SelectContent>{CAPACIDADES_FISICAS.map(cap => <SelectItem key={cap.id} value={cap.id} className="text-xs">{cap.name}</SelectItem>)}</SelectContent>
              </Select>

              {/* Intensidad inline */}
              <div className="flex-shrink-0 w-[130px]" title={`Intensidad (${intUnit}) · Ref: ${capCfg.intRef}`}>
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-400" style={{fontFamily:DM}}>Int ({intUnit})</span>
                  <span className="text-[13px] font-black" style={{color:intColor,fontFamily:DM}}>{act.intensidad}<span className="text-[8px] opacity-50">{intSuffix}</span></span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{background:'#f1f5f9'}}>
                  <div className="h-full rounded-full transition-all" style={{width:`${act.intensidad}%`,background:intGradient}} />
                </div>
                <input type="range" min={0} max={100} value={act.intensidad} onChange={(e) => updateActividad(faseKey, idx, 'intensidad', parseInt(e.target.value))} className="w-full h-1 mt-0.5 accent-[#84cc16] cursor-pointer" data-testid={`intensity-slider-${faseKey}-${idx}`} />
              </div>

              {/* Stats: Series / Vol (label dinámico) / Medida (kg/m/km/ROM) / Recup — inputs inline minimalistas */}
              <div className="flex items-start gap-1.5 flex-shrink-0">
                {[
                  { label:'Series', value:act.series, key:'series', type:'number', ph: capCfg.serPh, w:'w-[48px]' },
                  { label: volUnit, value:act.volumen, key:'volumen', ph: capCfg.volPh, w:'w-[60px]' },
                  { label: capCfg.medidaLabel || 'Medida', value:act.medida, key:'medida', ph: capCfg.medidaPh || '', w:'w-[56px]' },
                  { label:'Recup', value:act.recuperacion, key:'recuperacion', ph: capCfg.recPh, w:'w-[56px]' }
                ].map(s => (
                  <div key={s.key} className={`${s.w} text-center`}>
                    <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-400 block leading-tight" style={{fontFamily:DM}}>{s.label}</span>
                    <Input
                      value={s.value}
                      type={s.type||'text'}
                      onChange={(e) => updateActividad(faseKey, idx, s.key, s.type==='number'?parseInt(e.target.value)||0:e.target.value)}
                      placeholder={s.ph}
                      className="h-7 text-center text-slate-900 text-[14px] font-black bg-transparent border-0 border-b border-slate-100 hover:border-slate-300 focus:border-[#84cc16] focus:ring-0 rounded-none px-0 transition-colors"
                      style={{fontFamily:DM}}
                      min={s.type==='number'?0:undefined}
                      data-testid={`stat-${s.key}-${faseKey}-${idx}`}
                    />
                  </div>
                ))}
              </div>

              {/* Progresión — pills compactas */}
              <div className="flex items-center gap-0.5 flex-shrink-0 pl-1 border-l border-slate-100" title="Modelo de progresión">
                {MODELOS_PROGRESION.map(m => (
                  <button
                    key={m.id}
                    onClick={() => updateActividad(faseKey, idx, 'progresion', { ...prog, modelo: m.id })}
                    className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-1 rounded transition-all ${prog.modelo === m.id ? 'bg-[#CCFF00] text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    title={m.desc}
                    data-testid={`progresion-${m.id}-${faseKey}-${idx}`}
                  >
                    {m.name.slice(0,3)}
                  </button>
                ))}
              </div>

              {/* Botón Pizarra — toggle inline preview */}
              <button
                onClick={() => setExpandedBoard(prev => prev === act.id ? null : act.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex-shrink-0 ${isBoardOpen ? 'bg-[#CCFF00] text-slate-900 ring-1 ring-[#84cc16]' : act.boardThumbnail ? 'bg-[#0a0a0f] text-[#CCFF00] hover:brightness-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                title={act.boardThumbnail ? 'Mostrar/ocultar pizarra' : 'Añadir pizarra'}
                data-testid={`toggle-board-${faseKey}-${idx}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {act.boardThumbnail ? (isBoardOpen ? 'Ocultar' : 'Pizarra') : 'Añadir'}
              </button>

              {/* Acciones: avanzado / duplicar / eliminar */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => setExpandedPanels(prev => ({ ...prev, [panelKey]: !prev[panelKey] }))}
                  className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-slate-100 text-slate-700' : 'text-slate-300 hover:text-[#84cc16] hover:bg-slate-50'}`}
                  title="Carga y Progresión avanzada"
                  data-testid={`toggle-advanced-${faseKey}-${idx}`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {const dup={...act,id:`act-${Date.now()}`};setSessionData(prev=>({...prev,fases:{...prev.fases,[faseKey]:{...prev.fases[faseKey],actividades:[...prev.fases[faseKey].actividades,dup]}}}));}}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-[#84cc16] hover:bg-slate-50 transition-colors"
                  title="Duplicar"
                  data-testid={`duplicate-${faseKey}-${idx}`}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteActividad(faseKey, idx)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-slate-50 transition-colors"
                  title="Eliminar"
                  data-testid={`delete-${faseKey}-${idx}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* === INLINE BOARD PREVIEW === (expandida al hacer click en botón Pizarra) */}
            {isBoardOpen && (
              <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3" data-testid={`board-panel-${faseKey}-${idx}`}>
                <div className="flex items-center gap-2 mb-2">
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500" style={{fontFamily:DM}}>Pizarra Táctica</span>
                </div>
                <div className="max-w-[380px]">
                  {act.boardThumbnail ? (
                    <MiniBoardPlayer
                      svgHtml={act.boardThumbnail}
                      editHref={act.boardId ? `/tactical-board.html?boardId=${act.boardId}` : '/tactical-board.html'}
                      onEditClick={() => { boardEditContextRef.current = { faseKey, actId: act.id }; }}
                      onRemove={() => updateActividadMulti(faseKey, idx, { boardThumbnail: null, boardId: null })}
                      testIdPrefix={`board-${faseKey}-${idx}`}
                    />
                  ) : (
                    <a
                      href="/tactical-board.html"
                      target="_blank"
                      rel="opener"
                      onClick={() => { boardEditContextRef.current = { faseKey, actId: act.id }; }}
                      className="flex items-center justify-center gap-2 h-[140px] rounded-lg border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#c8f700] hover:text-[#3a5a00] hover:bg-[#f8ffe0]/30 transition-all no-underline"
                      data-testid={`open-board-${faseKey}-${idx}`}
                    >
                      <LayoutGrid className="w-5 h-5" />
                      <span className="text-[11px] font-semibold uppercase tracking-wide">Abrir pizarra</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* === PANEL AVANZADO Carga y Progresión === */}
            {isExpanded && (
              <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-2.5" data-testid={`advanced-panel-${faseKey}-${idx}`}>
                {/* Todo en un solo flex-wrap: fields + métricas */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]" style={{fontFamily:DM}}>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Reps</span>
                    <Input value={act.repeticiones || ''} onChange={(e) => updateActividad(faseKey, idx, 'repeticiones', e.target.value)} placeholder={capCfg.volPh} className="h-6 text-[11px] border-0 bg-white hover:bg-slate-50 focus:bg-white rounded-md px-1.5 w-[60px] shadow-none focus:ring-0" data-testid={`reps-adv-${faseKey}-${idx}`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Subtipo</span>
                    <Select value={act.subtipo || ''} onValueChange={(v) => updateActividad(faseKey, idx, 'subtipo', v)}>
                      <SelectTrigger className="h-6 text-[11px] border-0 bg-white hover:bg-slate-50 rounded-md px-1.5 w-auto min-w-[80px] shadow-none focus:ring-0"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{capCfg.subtipos.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">U.Vol</span>
                    <Select value={act.unidadVolumen || capCfg.unidadesVol[0]} onValueChange={(v) => updateActividad(faseKey, idx, 'unidadVolumen', v)}>
                      <SelectTrigger className="h-6 text-[11px] border-0 bg-white hover:bg-slate-50 rounded-md px-1.5 w-auto min-w-[64px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>{capCfg.unidadesVol.map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">U.Int</span>
                    <Select value={act.unidadIntensidad || capCfg.unidadesInt[0]} onValueChange={(v) => updateActividad(faseKey, idx, 'unidadIntensidad', v)}>
                      <SelectTrigger className="h-6 text-[11px] border-0 bg-white hover:bg-slate-50 rounded-md px-1.5 w-auto min-w-[64px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>{capCfg.unidadesInt.map(u => <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Descanso</span>
                    <Input value={act.recuperacion || ''} onChange={(e) => updateActividad(faseKey, idx, 'recuperacion', e.target.value)} placeholder={capCfg.recPh} className="h-6 text-[11px] border-0 bg-white hover:bg-slate-50 focus:bg-white rounded-md px-1.5 w-[70px] shadow-none focus:ring-0" data-testid={`descanso-adv-${faseKey}-${idx}`} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Frecuencia</span>
                    <Input value={act.frecuencia || ''} onChange={(e) => updateActividad(faseKey, idx, 'frecuencia', e.target.value)} placeholder={capCfg.freqPh} className="h-6 text-[11px] border-0 bg-white hover:bg-slate-50 focus:bg-white rounded-md px-1.5 w-[80px] shadow-none focus:ring-0" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Método</span>
                    <Select value={act.metodo} onValueChange={(v) => updateActividad(faseKey, idx, 'metodo', v)}>
                      <SelectTrigger className="h-6 text-[11px] font-semibold border-0 bg-blue-50 text-blue-700 rounded-full px-2 w-auto min-w-[80px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{METODOS_ENTRENAMIENTO.map(met => <SelectItem key={met.id} value={met.id} className="text-xs">{met.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Organización</span>
                    <Select value={act.procOrganizativo} onValueChange={(v) => updateActividad(faseKey, idx, 'procOrganizativo', v)}>
                      <SelectTrigger className="h-6 text-[11px] font-semibold border-0 bg-emerald-50 text-emerald-700 rounded-full px-2 w-auto min-w-[80px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{PROC_ORGANIZATIVO.map(proc => <SelectItem key={proc.id} value={proc.id} className="text-xs">{proc.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {capCfg.showComplejidad && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Complej.</span>
                      <input type="range" min={1} max={5} value={act.complejidad || 3} onChange={(e) => updateActividad(faseKey, idx, 'complejidad', parseInt(e.target.value))} className="w-14 h-1 accent-violet-500 cursor-pointer" />
                      <span className="text-[11px] font-black text-violet-600 w-4 text-center" style={{fontFamily:DM}}>{act.complejidad || 3}</span>
                    </div>
                  )}

                  {/* Divider visual discreto antes de las métricas */}
                  <span className="w-px h-4 bg-slate-200 mx-1" />

                  {/* Métricas inline */}
                  <span className="flex items-baseline gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-cyan-500">C.Total</span><span className="text-[12px] font-black text-slate-800">{met.cargaTotal}</span></span>
                  <span className="flex items-baseline gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-cyan-500">C.Sesión</span><span className="text-[12px] font-black text-slate-800">{met.cargaSesion}</span></span>
                  {met.ratioDensidad != null && <span className="flex items-baseline gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-violet-500">T:D</span><span className="text-[12px] font-black text-slate-800">1:{Math.round(1/met.ratioDensidad) || '?'}</span></span>}
                  {met.seriesPorMin > 0 && <span className="flex items-baseline gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-violet-500">Densidad</span><span className="text-[12px] font-black text-slate-800">{met.seriesPorMin}</span></span>}
                  {met.tiempoTotalMin > 0 && <span className="flex items-baseline gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-violet-500">Trab:Desc</span><span className="text-[11px] font-bold text-slate-800">{met.tiempoTrabajo}:{met.tiempoDescanso}m</span></span>}
                  {met.neuroCarga > 0 && <span className="flex items-baseline gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-indigo-500">NeuroCarga</span><span className="text-[12px] font-black text-slate-800">{met.neuroCarga}</span></span>}
                  {met.zonaFC && <span className="flex items-baseline gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-rose-500">Zona FC</span><span className="text-[11px] font-bold text-slate-800">{met.zonaFC}</span></span>}
                  {met.zonaFuerza && <span className="flex items-baseline gap-1"><span className="text-[9px] font-bold uppercase tracking-wide text-cyan-500">Zona</span><span className="text-[11px] font-bold text-slate-800">{met.zonaFuerza}</span></span>}
                </div>

                {/* Materiales */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 mr-1" style={{fontFamily:DM}}>Materiales</span>
                  {actMateriales.map((mat, mi) => (
                    <span key={mi} className="group inline-flex items-center gap-1 text-[10px] font-semibold pl-2 pr-1 py-0.5 rounded-full cursor-pointer transition-all hover:shadow-sm" style={{background:'rgba(168,85,247,0.07)',color:'#7c3aed',border:'1px solid rgba(168,85,247,0.18)'}}
                      onClick={() => {
                        const nuevoNombre = prompt('Editar material:', mat);
                        if (nuevoNombre && nuevoNombre.trim() && nuevoNombre.trim() !== mat) {
                          const nm = [...actMateriales];
                          nm[mi] = nuevoNombre.trim();
                          updateActividad(faseKey, idx, 'materiales', nm);
                        }
                      }}
                      title="Clic para editar"
                      data-testid={`material-tag-${faseKey}-${idx}-${mi}`}
                    >
                      {mat}
                      <button onClick={(e) => { e.stopPropagation(); const nm=[...actMateriales]; nm.splice(mi,1); updateActividad(faseKey, idx, 'materiales', nm); }} className="hover:text-red-500 transition-colors opacity-50 hover:opacity-100" data-testid={`remove-material-${faseKey}-${idx}-${mi}`}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 h-[22px] rounded-full border border-dashed border-slate-300 text-slate-500 hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700 transition-all" data-testid={`add-material-btn-${faseKey}-${idx}`}>
                        <Plus className="w-3 h-3" /> Material
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start" side="bottom">
                      <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Materiales</span>
                      </div>
                      <form className="p-2.5 border-b border-slate-100" onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.target.elements.nuevoMaterial;
                        const val = input.value.trim();
                        if (val && !actMateriales.includes(val)) {
                          updateActividad(faseKey, idx, 'materiales', [...actMateriales, val]);
                          input.value = '';
                        }
                      }}>
                        <div className="flex gap-1.5">
                          <Input name="nuevoMaterial" placeholder="Nuevo material personalizado..." className="h-8 text-[12px] flex-1" data-testid={`custom-material-input-${faseKey}-${idx}`} />
                          <Button type="submit" size="sm" className="h-8 px-3 text-[11px] bg-purple-600 hover:bg-purple-700 text-white" data-testid={`custom-material-add-${faseKey}-${idx}`}>
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </form>
                      <div className="max-h-[180px] overflow-y-auto p-2 grid grid-cols-2 gap-1">
                        {MATERIALES_DISPONIBLES.filter(m => !actMateriales.includes(m)).map(mat => (
                          <button key={mat} type="button" onClick={() => updateActividad(faseKey, idx, 'materiales', [...actMateriales, mat])} className="text-left text-[12px] px-3 py-2 rounded-lg text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-all truncate" style={{fontFamily:DM}}>
                            {mat}
                          </button>
                        ))}
                        {MATERIALES_DISPONIBLES.filter(m => !actMateriales.includes(m)).length === 0 && (
                          <p className="col-span-2 text-center text-slate-400 py-3 text-xs">Todos los materiales predefinidos agregados</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

          </div>
          );
        })}
        {fase.actividades.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm">No hay actividades en esta fase</div>
        )}
      </div>
    );
  };


  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none p-0 bg-white [&>button]:hidden translate-x-0 translate-y-0 top-0 left-0" 
          data-testid="session-editor-dialog"
          aria-describedby="session-editor-desc"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', top: 0, left: 0, transform: 'none', borderRadius: 0 }}
        >
          {/* ══ DARK HEADER BAR ══ */}
          <style>{`
            .se-input::placeholder { color: rgba(255,255,255,0.4) !important; font-weight: 400 !important; }
            .se-input { font-family: 'DM Sans', sans-serif !important; }
            .se-field-label { font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(100,116,139,0.7); font-family: 'DM Sans', sans-serif; }
            .se-field-input { font-size: 13px; font-family: 'DM Sans', sans-serif; }
            .se-field-input::placeholder { font-weight: 400; color: rgba(0,0,0,0.35); }
            .se-section-title { font-size: 15px; font-weight: 600; color: #fff; font-family: 'DM Sans', sans-serif; }
          `}</style>
          <DialogTitle className="sr-only">Sesión de entrenamiento</DialogTitle>
          <p id="session-editor-desc" className="sr-only">Editor completo de sesión de entrenamiento con objetivos, actividades y monitoreo</p>
          <div className="sticky top-0 z-10" style={{background:'#0a0a0f',fontFamily:DM}}>
            <div className="flex items-center gap-3 px-5 py-3">
              {/* Logo */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'#CCFF00'}}>
                  <span className="text-[18px] font-black leading-none" style={{color:'#0f172a',fontFamily:BC}}>i</span>
                </div>
                <span className="text-[15px] font-black tracking-tight" style={{fontFamily:BC}}>
                  <span style={{color:'#CCFF00'}}>i</span><span className="text-white">TRAIN</span>
                </span>
              </div>
              {/* Session name + code + subtitle */}
              <div className="flex-1 min-w-0 ml-1">
                <div className="flex items-center gap-2.5">
                  {/* Nombre de sesión: 17px, weight 600, blanco puro */}
                  <input
                    value={sessionData.sessionName || ''}
                    onChange={(e) => setSessionData(prev => ({...prev, sessionName: e.target.value}))}
                    className="bg-transparent text-white border-0 outline-none truncate w-auto max-w-[280px]"
                    style={{fontFamily:DM,fontSize:'17px',fontWeight:600}}
                    placeholder="Nombre de la sesión..."
                    data-testid="session-name-input"
                  />
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{background:'#9EFF00',color:'#0f0f13',fontFamily:BC,letterSpacing:'0.04em'}}>SES-{String(session?.sessionIndex || session?.dayName || '001').padStart(3,'0')}</span>
                </div>
                {/* Subtítulo: 11px, weight 400, blanco 35% */}
                <p className="mt-0.5 truncate" style={{fontFamily:DM,fontSize:'11px',fontWeight:400,color:'rgba(255,255,255,0.35)'}}>
                  Sesión {session?.sessionIndex || session?.dayName || '1'} · Semana {session?.weekIndex || session?.weekName || '1'} · {session?.mesoName || session?.macroName || 'Mesociclo 1'}
                  {athleteName && <span style={{color:'rgba(255,255,255,0.2)'}} className="ml-2">· {athleteName}</span>}
                </p>
              </div>
              {/* Chips: 12px, weight 500 */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity" style={{background:'rgba(204,255,0,0.08)',border:'0.5px solid rgba(204,255,0,0.15)',fontFamily:DM}}>
                      <Calendar className="w-3.5 h-3.5" style={{color:'#CCFF00',opacity:0.6}} />
                      <span style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.9)'}}>
                        {sessionDate ? sessionDate.toLocaleDateString('es-ES', {day:'2-digit',month:'short',year:'numeric'}) : 'Elegir fecha'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#12131a] border-white/10" align="end" sideOffset={8}>
                    <CalendarWidget
                      mode="single"
                      selected={sessionDate}
                      onSelect={(d) => { setSessionDate(d); setDatePopoverOpen(false); }}
                      className="text-white"
                      classNames={{
                        day_selected: "bg-[#CCFF00] text-black hover:bg-[#b8e600]",
                        day_today: "bg-white/10 text-white",
                        day: "text-white/80 hover:bg-white/10 h-8 w-8 rounded-md",
                        caption_label: "text-white text-sm font-bold",
                        nav_button: "text-white/60 hover:text-white border-white/10 hover:bg-white/10",
                        head_cell: "text-white/40 font-normal text-[10px]",
                        cell: "text-center",
                        day_outside: "text-white/20",
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {/* Duración: 12px, weight 500 */}
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg" style={{background:'rgba(204,255,0,0.08)',border:'0.5px solid rgba(204,255,0,0.15)'}}>
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{color:'#CCFF00',opacity:0.6}} />
                  <div className="flex items-center">
                    <input value={sessionData.duration} onChange={(e) => setSessionData(prev => ({...prev, duration: e.target.value}))} className="w-7 h-5 bg-transparent border-0 p-0 text-right outline-none" style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.9)',fontFamily:DM}} placeholder="90" />
                    <span style={{fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.9)',marginLeft:'2px'}}>min</span>
                  </div>
                </div>
                {/* Estado: 12px, completada = 600 */}
                <select value={sessionData.sessionStatus} onChange={(e) => setSessionData(prev => ({...prev, sessionStatus: e.target.value}))} className="h-7 rounded-lg px-2.5 border-0 outline-none cursor-pointer" style={{fontSize:'12px',fontWeight: sessionData.sessionStatus === 'completada' ? 600 : 500,background:'rgba(204,255,0,0.08)',border:'0.5px solid rgba(204,255,0,0.15)',color:'rgba(255,255,255,0.9)',colorScheme:'dark',fontFamily:DM}}>
                  <option value="planificada" style={{background:'#12131a',color:'#fff'}}>Planificada</option>
                  <option value="en_curso" style={{background:'#12131a',color:'#fff'}}>En curso</option>
                  <option value="completada" style={{background:'#12131a',color:'#fff'}}>Completada</option>
                </select>
              </div>
            </div>
            {/* ══ SUBHEADER ══ */}
            <div className="flex items-center gap-3 px-5 py-2" style={{background:'#12131a',borderTop:'0.5px solid rgba(255,255,255,0.06)',borderBottom:'0.5px solid rgba(255,255,255,0.06)'}}>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Users className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                <input value={sessionData.team} onChange={(e) => setSessionData(prev => ({...prev, team: e.target.value}))} className="se-input h-6 bg-transparent border-0 outline-none w-full min-w-[60px]" style={{color:'rgba(255,255,255,0.85)',fontSize:'12px',fontWeight:500}} placeholder="Equipo / Atleta" />
              </div>
              <div style={{width:'0.5px',height:'16px',background:'rgba(255,255,255,0.12)'}} />
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <User className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                <input value={sessionData.coach} onChange={(e) => setSessionData(prev => ({...prev, coach: e.target.value}))} className="se-input h-6 bg-transparent border-0 outline-none w-full min-w-[60px]" style={{color:'rgba(255,255,255,0.85)',fontSize:'12px',fontWeight:500}} placeholder="Entrenador..." />
              </div>
              <div style={{width:'0.5px',height:'16px',background:'rgba(255,255,255,0.12)'}} />
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                <input value={sessionData.location} onChange={(e) => setSessionData(prev => ({...prev, location: e.target.value}))} className="se-input h-6 bg-transparent border-0 outline-none w-full min-w-[60px]" style={{color:'rgba(255,255,255,0.85)',fontSize:'12px',fontWeight:500}} placeholder="Lugar" />
              </div>
              <div style={{width:'0.5px',height:'16px',background:'rgba(255,255,255,0.12)'}} />
              <div className="flex items-center gap-1.5 w-[140px] flex-shrink-0">
                <Activity className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                <select value={sessionData.sessionType} onChange={(e) => setSessionData(prev => ({...prev, sessionType: e.target.value}))} className="h-6 bg-transparent border-0 outline-none cursor-pointer w-full" style={{color:'rgba(255,255,255,0.85)',fontSize:'12px',fontWeight:500,colorScheme:'dark',fontFamily:DM}}>
                  <option value="tecnico-tactico" style={{background:'#12131a',color:'#fff'}}>Técnico-Táctico</option>
                  <option value="fisico" style={{background:'#12131a',color:'#fff'}}>Físico</option>
                  <option value="recuperacion" style={{background:'#12131a',color:'#fff'}}>Recuperación</option>
                  <option value="evaluacion" style={{background:'#12131a',color:'#fff'}}>Evaluación</option>
                  <option value="competicion" style={{background:'#12131a',color:'#fff'}}>Competición</option>
                  <option value="mixto" style={{background:'#12131a',color:'#fff'}}>Mixto</option>
                </select>
              </div>
              <div style={{width:'0.5px',height:'16px',background:'rgba(255,255,255,0.12)'}} />
              <div className="flex items-center gap-1.5 w-[120px] flex-shrink-0">
                <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                {sessionData.estimatedLoad ? (
                  <>
                    <input value={sessionData.estimatedLoad} onChange={(e) => setSessionData(prev => ({...prev, estimatedLoad: e.target.value}))} className="se-input h-6 bg-transparent border-0 outline-none w-full" style={{color:'rgba(255,255,255,0.85)',fontSize:'12px',fontWeight:500}} placeholder="Carga" />
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      parseFloat(sessionData.estimatedLoad) > 70 ? 'bg-red-500/25 text-red-400' :
                      parseFloat(sessionData.estimatedLoad) > 40 ? 'bg-amber-500/25 text-amber-400' :
                      'bg-emerald-500/25 text-emerald-400'
                    }`}>{parseFloat(sessionData.estimatedLoad) > 70 ? 'Alta' : parseFloat(sessionData.estimatedLoad) > 40 ? 'Media' : 'Baja'}</span>
                  </>
                ) : (
                  <span style={{fontSize:'11px',fontWeight:400,color:'rgba(255,255,255,0.3)',whiteSpace:'nowrap'}}>— Sin calcular</span>
                )}
              </div>
            </div>
          </div>

          {/* Contenido Principal */}
          <div 
            ref={sessionContentRef} 
            data-testid="session-editor-content"
            className="overflow-y-auto"
            style={{background:'#f5f5f7', maxHeight:'calc(100vh - 120px)'}}
          >
            <div className="p-6 space-y-5">
              {/* Objetivos de la sesión */}
              <Card className="border-0 shadow-md bg-white overflow-hidden rounded-2xl" style={{fontFamily:DM}}>
                <CardHeader className="pb-3 pt-4 px-5" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
                  <CardTitle className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}>
                      <Target className="w-3.5 h-3.5 text-slate-900" />
                    </div>
                    <span className="se-section-title">Objetivos de la sesión</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: 'general', label: 'OBJETIVO GENERAL', placeholder: 'Objetivo principal de la sesión...' },
                      { key: 'fisico', label: 'OBJETIVO FÍSICO', placeholder: 'Desarrollo de capacidades físicas...' },
                      { key: 'tecnico', label: 'OBJETIVO TÉCNICO', placeholder: 'Mejora técnica específica...' },
                      { key: 'tactico', label: 'OBJETIVO TÁCTICO', placeholder: 'Desarrollo táctico...' },
                      { key: 'psicologico', label: 'OBJETIVO PSICOLÓGICO', placeholder: 'Aspecto mental a trabajar...' },
                      { key: 'teorico', label: 'OBJETIVO TEÓRICO', placeholder: 'Conocimiento teórico...' },
                    ].map(obj => (
                      <div key={obj.key} className="space-y-1">
                        <label className="se-field-label">{obj.label}</label>
                        <Input
                          value={sessionData.objetivos[obj.key]}
                          onChange={(e) => updateObjetivo(obj.key, e.target.value)}
                          placeholder={obj.placeholder}
                          className="se-field-input bg-slate-50 border-slate-200 focus:border-[#CCFF00] focus:ring-[#CCFF00]/20 h-9"
                          data-testid={`objetivo-${obj.key}`}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Estructura de la sesión */}
              <Card className="border-0 shadow-md bg-white overflow-visible rounded-2xl" style={{fontFamily:DM}}>
                <CardHeader className="pb-3 pt-4 px-5" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
                  <CardTitle className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}>
                      <Zap className="w-3.5 h-3.5 text-slate-900" />
                    </div>
                    <span className="se-section-title">Estructura de la sesión</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 bg-white overflow-visible">
                  {/* Fases */}
                  {Object.entries(sessionData.fases).map(([faseKey, fase]) => {
                    const faseColors = {
                      inicial: { border: 'border-l-[#CCFF00]', accent: '#CCFF00', accentDark: '#3a5a00', bg: 'bg-[#CCFF00]/5', header: '', text: 'text-[#3a5a00]', btn: 'border-[#CCFF00] text-[#3a5a00] hover:bg-[#CCFF00]/10', icon: <Zap className="w-4 h-4" /> },
                      principal: { border: 'border-l-slate-800', accent: '#0a0a0f', accentDark: '#ffffff', bg: 'bg-slate-50', header: '', text: 'text-slate-800', btn: 'border-slate-700 text-slate-800 hover:bg-slate-100', icon: <Target className="w-4 h-4" /> },
                      final: { border: 'border-l-[#3B82F6]', accent: '#3B82F6', accentDark: '#ffffff', bg: 'bg-blue-50/50', header: '', text: 'text-blue-700', btn: 'border-blue-400 text-blue-700 hover:bg-blue-50', icon: <Activity className="w-4 h-4" /> }
                    };
                    const colors = faseColors[faseKey];
                    
                    return (
                      <div key={faseKey} className={`rounded-xl overflow-visible shadow-sm bg-white`} style={{ position: 'relative', zIndex: showExercisePicker?.startsWith(faseKey) ? 100 : 1, border:'1px solid rgba(0,0,0,0.06)' }}>
                        <div
                          onClick={() => setExpandedPhases(prev => ({ ...prev, [faseKey]: !prev[faseKey] }))}
                          className="w-full flex items-center justify-between px-4 py-3 hover:opacity-90 transition-all cursor-pointer"
                          style={{background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}dd 100%)`, borderRadius: expandedPhases[faseKey] ? '12px 12px 0 0' : '12px'}}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'rgba(0,0,0,0.15)', color: colors.accentDark}}>
                              {expandedPhases[faseKey] ? 
                                <ChevronDown className="w-4 h-4" /> : 
                                colors.icon
                              }
                            </div>
                            <span style={{fontSize:'13px',fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',color: colors.accentDark,fontFamily:BC}}>
                              {fase.nombre}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:'rgba(0,0,0,0.12)',color: colors.accentDark,fontFamily:DM}}>
                              {fase.actividades.length} {fase.actividades.length === 1 ? 'actividad' : 'actividades'}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); addActividad(faseKey); }}
                            className="h-7 text-[10px] font-semibold border-0 rounded-lg px-3"
                            style={{fontFamily:DM, background:'rgba(0,0,0,0.15)', color: colors.accentDark, backdropFilter:'blur(8px)'}}
                            data-testid={`add-activity-${faseKey}`}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Agregar
                          </Button>
                        </div>
                        
                        {expandedPhases[faseKey] && (
                          <div className="bg-white p-4 border-t border-slate-100 overflow-visible">
                            {renderActividadesTable(faseKey, fase)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Monitoreo avanzado */}
              <Card className="border-0 shadow-md bg-white overflow-hidden rounded-2xl" style={{fontFamily:DM}}>
                <CardHeader className="p-4" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}>
                        <Watch className="w-3.5 h-3.5 text-slate-900" />
                      </div>
                      <div>
                        <span className="se-section-title">Monitoreo de rendimiento</span>
                        <p style={{fontSize:'10px',fontWeight:400,color:'rgba(255,255,255,0.4)',marginTop:'2px'}}>Datos de frecuencia cardíaca y biométricos</p>
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-[10px] h-7 ${sessionData.monitoreo.dispositivoConectado 
                          ? 'border-[#CCFF00]/50 bg-[#CCFF00]/10 text-[#CCFF00] hover:bg-[#CCFF00]/20' 
                          : 'border-white/20 bg-transparent text-white/60 hover:bg-white/5'}`}
                        onClick={() => {
                          setSessionData(prev => ({
                            ...prev,
                            monitoreo: { 
                              ...prev.monitoreo, 
                              dispositivoConectado: !prev.monitoreo.dispositivoConectado,
                              nombreDispositivo: !prev.monitoreo.dispositivoConectado ? 'Apple Watch / Garmin' : ''
                            }
                          }));
                          toast.success(sessionData.monitoreo.dispositivoConectado ? 'Dispositivo desconectado' : 'Simulando conexión con dispositivo');
                        }}
                      >
                        <Bluetooth className="w-4 h-4 mr-1.5" />
                        {sessionData.monitoreo.dispositivoConectado ? '✓ Conectado' : 'Conectar'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 bg-white space-y-8">
                  {/* Sección de Gráfica */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2" style={{fontSize:'14px',fontWeight:600,color:'#1e293b',fontFamily:DM}}>
                        <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                          <Heart className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        Frecuencia cardíaca por fases
                      </h4>
                      {/* Selector de vista + estilo línea */}
                      <div className="flex items-center gap-2">
                        {/* Estilo de línea (solo visible en Líneas/Mixta) */}
                        {(sessionData.monitoreo.tipoGrafica === 'lineas' || sessionData.monitoreo.tipoGrafica === 'mixta') && (
                          <div className="flex items-center gap-0.5 bg-slate-50 rounded-lg p-0.5">
                            {[
                              { id: 'lime', label: 'Lima', preview: '#CCFF00' },
                              { id: 'multi', label: 'Multi', preview: 'linear-gradient(90deg,#3b82f6,#ef4444,#22c55e,#a855f7)' },
                              { id: 'punteada', label: 'Punteada', preview: '#CCFF00' },
                              { id: 'gradient', label: 'Degradado', preview: 'linear-gradient(90deg,#06b6d4,#8b5cf6)' },
                            ].map(s => (
                              <button key={s.id}
                                onClick={() => setSessionData(prev => ({ ...prev, monitoreo: { ...prev.monitoreo, estiloLinea: s.id }}))}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${(sessionData.monitoreo.estiloLinea || 'lime') === s.id ? 'bg-white shadow-sm' : 'hover:bg-slate-100'}`}
                                style={{fontFamily:DM}}
                              >
                                <span className="w-3 h-1 rounded-full" style={{
                                  background: s.preview,
                                  borderTop: s.id === 'punteada' ? '2px dashed #CCFF00' : 'none',
                                  height: s.id === 'punteada' ? '0px' : '3px',
                                }} />
                                <span style={{fontSize:'9px',fontWeight:500,color: (sessionData.monitoreo.estiloLinea || 'lime') === s.id ? '#1e293b' : '#94a3b8'}}>{s.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                          {['barras','lineas','mixta'].map(t => (
                            <button key={t}
                              onClick={() => setSessionData(prev => ({ ...prev, monitoreo: { ...prev.monitoreo, tipoGrafica: t }}))}
                              className={`px-3 py-1 rounded-md transition-all ${sessionData.monitoreo.tipoGrafica === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                              style={{fontSize:'11px',fontWeight:500,fontFamily:DM}}
                            >
                              {t === 'barras' ? 'Barras' : t === 'lineas' ? 'Líneas' : 'Mixta'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Gráfica profesional */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      {(() => {
                        const fcItems = [
                          { key: 'fcAntesEntrenamiento', label: 'Antes', color: '#3b82f6', ph: 70 },
                          { key: 'fcDuranteEntrenamiento', label: 'Durante', color: '#ef4444', ph: 150 },
                          { key: 'fcDespuesEntrenamiento', label: 'Después', color: '#22c55e', ph: 90 },
                          { key: 'fcRecuperacion1min', label: 'Recup 1\'', color: '#14b8a6', ph: 85 },
                          { key: 'fcRecuperacion3min', label: 'Recup 3\'', color: '#a855f7', ph: 78 },
                          { key: 'fcRecuperacion5min', label: 'Recup 5\'', color: '#6366f1', ph: 72 },
                        ];
                        if (sessionData.monitoreo.mostrarRecuperacion10min) {
                          fcItems.push({ key: 'fcRecuperacion10min', label: 'Recup 10\'', color: '#ec4899', ph: 68 });
                        }
                        const vals = fcItems.map(f => parseInt(sessionData.monitoreo[f.key]) || f.ph);
                        const maxBpm = Math.max(180, ...vals) + 20;
                        const yTicks = [0, Math.round(maxBpm * 0.25), Math.round(maxBpm * 0.5), Math.round(maxBpm * 0.75), maxBpm];
                        const showLines = sessionData.monitoreo.tipoGrafica === 'lineas' || sessionData.monitoreo.tipoGrafica === 'mixta';
                        const showBars = sessionData.monitoreo.tipoGrafica === 'barras' || sessionData.monitoreo.tipoGrafica === 'mixta';
                        const isMixta = sessionData.monitoreo.tipoGrafica === 'mixta';
                        const chartH = 200;

                        return (
                          <>
                            {/* Chart */}
                            <div className="px-5 pt-5 pb-0">
                              <div className="flex" style={{height:`${chartH}px`}}>
                                {/* Y-axis */}
                                <div className="flex flex-col justify-between flex-shrink-0 pr-2" style={{width:'30px'}}>
                                  {[...yTicks].reverse().map(tick => (
                                    <span key={tick} className="text-right leading-none" style={{fontSize:'9px',color:'#94a3b8',fontFamily:DM,fontWeight:500}}>{tick}</span>
                                  ))}
                                </div>
                                {/* Chart body */}
                                <div className="flex-1 relative" style={{borderLeft:'1px solid #e2e8f0',borderBottom:'1px solid #e2e8f0'}}>
                                  {/* Grid lines */}
                                  {yTicks.slice(1).map(tick => (
                                    <div key={tick} className="absolute left-0 right-0" style={{bottom:`${(tick/maxBpm)*100}%`,height:'0.5px',background:'#f1f5f9'}} />
                                  ))}
                                  {/* Bars — aligned to columns */}
                                  {showBars && (
                                    <div className="absolute inset-0 flex">
                                      {vals.map((v, i) => {
                                        const barH = (v / maxBpm) * chartH;
                                        return (
                                          <div key={i} className="flex-1 flex flex-col items-center justify-end">
                                            {!isMixta && (
                                              <span style={{fontSize:'10px',fontWeight:700,color:fcItems[i].color,fontFamily:DM,marginBottom:'2px'}}>{v}</span>
                                            )}
                                            <div className="rounded-t-md transition-all duration-500" style={{
                                              width: isMixta ? '40%' : '55%',
                                              maxWidth:'34px',
                                              height:`${barH}px`,
                                              background:fcItems[i].color,
                                              opacity: isMixta ? 0.15 : 0.8
                                            }} />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {/* Line SVG */}
                                  {showLines && (() => {
                                    const n = vals.length;
                                    const svgW = 600, svgH = chartH;
                                    const estilo = sessionData.monitoreo.estiloLinea || 'lime';
                                    const margin = svgW / (n * 2);
                                    const spts = vals.map((v, i) => ({
                                      x: margin + (i / (n - 1)) * (svgW - margin * 2),
                                      y: svgH - (v / maxBpm) * svgH
                                    }));
                                    let lineD = `M ${spts[0].x} ${spts[0].y}`;
                                    for (let j = 0; j < spts.length - 1; j++) {
                                      const cp = (spts[j].x + spts[j+1].x) / 2;
                                      lineD += ` C ${cp} ${spts[j].y}, ${cp} ${spts[j+1].y}, ${spts[j+1].x} ${spts[j+1].y}`;
                                    }
                                    const areaD = lineD + ` L ${spts[n-1].x} ${svgH} L ${spts[0].x} ${svgH} Z`;
                                    const lineColor = estilo === 'multi' ? 'url(#multiGrad)' : estilo === 'gradient' ? 'url(#blueGrad)' : '#CCFF00';
                                    const areaColor = estilo === 'multi' ? '#a855f7' : estilo === 'gradient' ? '#3b82f6' : '#CCFF00';
                                    const dashArray = estilo === 'punteada' ? '8 4' : 'none';
                                    return (
                                      <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
                                        <defs>
                                          <linearGradient id="aFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={areaColor} stopOpacity="0.18"/>
                                            <stop offset="100%" stopColor={areaColor} stopOpacity="0"/>
                                          </linearGradient>
                                          <linearGradient id="multiGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#3b82f6"/><stop offset="25%" stopColor="#ef4444"/>
                                            <stop offset="50%" stopColor="#22c55e"/><stop offset="75%" stopColor="#a855f7"/>
                                            <stop offset="100%" stopColor="#6366f1"/>
                                          </linearGradient>
                                          <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#8b5cf6"/>
                                          </linearGradient>
                                        </defs>
                                        <path d={areaD} fill="url(#aFill)" />
                                        <path d={lineD} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeDasharray={dashArray} />
                                        {spts.map((p, i) => (
                                          <g key={i}>
                                            <circle cx={p.x} cy={p.y} r="5" fill="white" stroke={fcItems[i].color} strokeWidth="2.5" />
                                            <rect x={p.x - 18} y={p.y - 19} width="36" height="15" rx="4" fill={fcItems[i].color} />
                                            <text x={p.x} y={p.y - 8.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="white" fontFamily="DM Sans">{vals[i]}</text>
                                          </g>
                                        ))}
                                      </svg>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Inputs — same flex layout as bars for perfect alignment */}
                            <div className="border-t border-slate-100 px-5 py-3">
                              <div className="flex" style={{marginLeft:'30px'}}>
                                {fcItems.map((item, i) => (
                                  <div key={item.key} className="flex-1 text-center px-1">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{background:item.color}} />
                                      <span style={{fontSize:'8px',fontWeight:600,color:item.color,textTransform:'uppercase',letterSpacing:'0.05em',fontFamily:DM}}>{item.label}</span>
                                    </div>
                                    <Input
                                      type="number"
                                      value={sessionData.monitoreo[item.key]}
                                      onChange={(e) => setSessionData(prev => ({
                                        ...prev,
                                        monitoreo: { ...prev.monitoreo, [item.key]: e.target.value }
                                      }))}
                                      placeholder={String(item.ph)}
                                      className="se-field-input text-center h-8 font-bold rounded-lg"
                                      style={{borderColor: item.color + '30', fontSize:'13px'}}
                                    />
                                    <div className="text-[7px] text-slate-400 mt-0.5" style={{fontFamily:DM}}>bpm</div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Opción de 10 minutos */}
                              <div className="mt-2 pt-2 border-t border-dashed border-slate-100 flex items-center gap-3">
                          <button
                            onClick={() => setSessionData(prev => ({
                              ...prev,
                              monitoreo: { ...prev.monitoreo, mostrarRecuperacion10min: !prev.monitoreo.mostrarRecuperacion10min }
                            }))}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                              sessionData.monitoreo.mostrarRecuperacion10min 
                                ? 'bg-pink-50 text-pink-600 border border-pink-200' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-transparent'
                            }`}
                            style={{fontFamily:DM}}
                          >
                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${
                              sessionData.monitoreo.mostrarRecuperacion10min ? 'bg-pink-500' : 'bg-slate-300'
                            }`}>
                              {sessionData.monitoreo.mostrarRecuperacion10min && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            + Recup 10 min
                          </button>
                          {sessionData.monitoreo.mostrarRecuperacion10min && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-pink-500" />
                              <Input
                                type="number"
                                value={sessionData.monitoreo.fcRecuperacion10min}
                                onChange={(e) => setSessionData(prev => ({
                                  ...prev,
                                  monitoreo: { ...prev.monitoreo, fcRecuperacion10min: e.target.value }
                                }))}
                                placeholder="68"
                                className="se-field-input text-center h-8 w-20 font-bold rounded-lg"
                                style={{borderColor:'#ec489940',fontSize:'13px'}}
                              />
                              <span className="text-[8px] text-slate-400" style={{fontFamily:DM}}>bpm</span>
                            </div>
                          )}
                        </div>
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* FC Reposo, Media y Maxima */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100 hover:shadow-sm transition-shadow">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{background:'#CCFF00'}}>
                        <Heart className="w-5 h-5 text-slate-900" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5" style={{fontFamily:BC}}>FC Reposo</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcReposo}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcReposo: e.target.value }
                        }))}
                        placeholder="60"
                        className="text-center text-xl font-bold h-10 border-0 bg-white rounded-xl shadow-inner"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">bpm</span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100 hover:shadow-sm transition-shadow">
                      <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5" style={{fontFamily:BC}}>FC Media</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcMedia}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcMedia: e.target.value }
                        }))}
                        placeholder="135"
                        className="text-center text-xl font-bold h-10 border-0 bg-white rounded-xl shadow-inner"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">bpm</span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100 hover:shadow-sm transition-shadow">
                      <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5" style={{fontFamily:BC}}>FC Maxima</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcMaxima}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcMaxima: e.target.value }
                        }))}
                        placeholder="180"
                        className="text-center text-xl font-bold h-10 border-0 bg-white rounded-xl shadow-inner"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">bpm</span>
                    </div>
                  </div>

                  {/* Estado del Deportista */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Battery className="w-4 h-4 text-green-500" />
                      Estado del Deportista
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Nivel de Fatiga */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Nivel de Fatiga
                          </span>
                          <span className={`text-xs font-bold ${
                            sessionData.monitoreo.nivelFatiga > 70 ? 'text-red-600' :
                            sessionData.monitoreo.nivelFatiga > 40 ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {sessionData.monitoreo.nivelFatiga}%
                          </span>
                        </div>
                        <Slider
                          value={[sessionData.monitoreo.nivelFatiga]}
                          onValueChange={(v) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, nivelFatiga: v[0] }
                          }))}
                          max={100}
                          step={5}
                          className="[&>span]:bg-gradient-to-r [&>span]:from-green-500 [&>span]:via-amber-500 [&>span]:to-red-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Bajo</span>
                          <span>Alto</span>
                        </div>
                      </div>

                      {/* Nivel de Hidratación */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            Hidratación                          </span>
                          <span className={`text-xs font-bold ${
                            sessionData.monitoreo.nivelHidratacion < 50 ? 'text-red-600' :
                            sessionData.monitoreo.nivelHidratacion < 70 ? 'text-amber-600' :
                            'text-blue-600'
                          }`}>
                            {sessionData.monitoreo.nivelHidratacion}%
                          </span>
                        </div>
                        <Slider
                          value={[sessionData.monitoreo.nivelHidratacion]}
                          onValueChange={(v) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, nivelHidratacion: v[0] }
                          }))}
                          max={100}
                          step={5}
                          className="[&>span]:bg-gradient-to-r [&>span]:from-red-500 [&>span]:via-amber-500 [&>span]:to-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Deshidratado</span>
                          <span>Óptimo</span>
                        </div>
                      </div>

                      {/* Calidad de Sueño */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <Moon className="w-3 h-3 text-indigo-500" />
                            Calidad de Sueño
                          </span>
                          <span className={`text-xs font-bold ${
                            sessionData.monitoreo.calidadSueno < 50 ? 'text-red-600' :
                            sessionData.monitoreo.calidadSueno < 70 ? 'text-amber-600' :
                            'text-indigo-600'
                          }`}>
                            {sessionData.monitoreo.calidadSueno}%
                          </span>
                        </div>
                        <Slider
                          value={[sessionData.monitoreo.calidadSueno]}
                          onValueChange={(v) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, calidadSueno: v[0] }
                          }))}
                          max={100}
                          step={5}
                          className="[&>span]:bg-indigo-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Malo</span>
                          <span>Excelente</span>
                        </div>
                      </div>

                      {/* Nivel de Energía */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            Nivel de Energía
                          </span>
                          <span className={`text-xs font-bold ${
                            sessionData.monitoreo.nivelEnergia < 40 ? 'text-red-600' :
                            sessionData.monitoreo.nivelEnergia < 60 ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {sessionData.monitoreo.nivelEnergia}%
                          </span>
                        </div>
                        <Slider
                          value={[sessionData.monitoreo.nivelEnergia]}
                          onValueChange={(v) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, nivelEnergia: v[0] }
                          }))}
                          max={100}
                          step={5}
                          className="[&>span]:bg-gradient-to-r [&>span]:from-red-500 [&>span]:via-yellow-500 [&>span]:to-green-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Bajo</span>
                          <span>Alto</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Retroalimentación */}
              <Card className="border-0 shadow-md bg-white overflow-hidden rounded-2xl" style={{fontFamily:DM}}>
                <CardHeader className="pb-3 pt-4 px-5" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
                  <CardTitle className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}>
                      <AlertCircle className="w-3.5 h-3.5 text-slate-900" />
                    </div>
                    <span className="se-section-title">Observaciones y retroalimentación</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <Textarea
                    value={sessionData.retroalimentacion}
                    onChange={(e) => setSessionData(prev => ({ ...prev, retroalimentacion: e.target.value }))}
                    placeholder="Observaciones y comentarios de la sesión..."
                    className="se-field-input min-h-[100px] resize-none bg-slate-50 border-slate-200 focus:border-[#CCFF00] focus:ring-[#CCFF00]/20"
                    data-testid="retroalimentacion"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t px-5 py-3 flex justify-between items-center" style={{background:'#0a0a0f',borderColor:'rgba(204,255,0,0.08)',fontFamily:DM}}>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleGenerateShareLink}
                className="border-white/15 text-white/60 hover:bg-white/5 hover:text-white text-[11px] h-8"
                data-testid="share-session-btn"
              >
                <Share2 className="w-3.5 h-3.5 mr-1.5" />
                Compartir
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleExportAsPDF('dark')}
                disabled={exporting}
                className="border-white/15 text-white/60 hover:bg-white/5 hover:text-white text-[11px] h-8"
                data-testid="export-pdf-btn"
              >
                {exporting ? (
                  <><Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generando...</>
                ) : (
                  <><Moon className="w-3.5 h-3.5 mr-1" />PDF oscuro</>
                )}
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => handleExportAsPDF('light')}
                disabled={exporting}
                className="border-white/15 text-white/60 hover:bg-white/5 hover:text-white text-[11px] h-8"
              >
                {exporting ? (
                  <><Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generando...</>
                ) : (
                  <><Sun className="w-3.5 h-3.5 mr-1" />PDF claro</>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleExit}
                size="sm"
                className="border-white/15 text-white/60 hover:bg-white/5 hover:text-white text-[11px] h-8"
                data-testid="exit-session-btn"
              >
                Salir
              </Button>
              <Button 
                size="sm"
                className="text-[12px] font-bold h-8 px-5 rounded-lg shadow-lg"
                style={{background:'#CCFF00',color:'#0a0a0f',fontFamily:BC}}
                onClick={handleSave}
                data-testid="save-session-btn"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo de compartir enlace */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md bg-white p-0 overflow-hidden rounded-2xl">
          <div className="p-5" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(204,255,0,0.15)'}}>
                <Link2 className="w-5 h-5" style={{color:'#CCFF00'}} />
              </div>
              <div>
                <DialogTitle className="text-white text-base font-bold" style={{fontFamily:DM}}>Compartir sesión</DialogTitle>
                <p className="text-white/40 text-[11px] mt-0.5">
                  El deportista podrá ver la sesión sin necesidad de iniciar sesión
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="se-field-label">ENLACE PÚBLICO DE SOLO LECTURA</label>
              <div className="flex gap-2">
                <input
                  value={shareLink}
                  readOnly
                  disabled
                  className="flex-1 h-9 px-3 rounded-lg text-[12px] font-mono text-slate-600 bg-slate-100 border border-slate-200 outline-none cursor-default select-all"
                  style={{fontFamily:"'DM Sans', monospace"}}
                  onClick={(e) => e.target.select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className={linkCopied ? 'border-emerald-400 text-emerald-500' : 'border-slate-200'}
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="rounded-xl p-3" style={{background:'rgba(204,255,0,0.06)',border:'1px solid rgba(204,255,0,0.12)'}}>
              <div className="flex items-start gap-2.5">
                <Eye className="w-4 h-4 mt-0.5" style={{color:'#CCFF00'}} />
                <div>
                  <p className="text-[12px] font-semibold text-slate-800">Vista del deportista</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    El deportista verá la sesión completa con objetivos, ejercicios y parámetros de entrenamiento.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareDialog(false)}
                className="text-[11px]"
              >
                Cerrar
              </Button>
              <Button
                size="sm"
                onClick={handleCopyLink}
                className="text-[12px] font-bold"
                style={{background:'#CCFF00',color:'#0a0a0f',fontFamily:BC}}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar Enlace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
};

export default SessionEditor;

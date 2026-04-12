import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
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
  Watch, Droplets, Battery, Moon, TrendingUp, TrendingDown, Bluetooth,
  Sparkles, LayoutGrid, Pencil
} from 'lucide-react';
import { toast } from 'sonner';

const TacticalBoardEditor = React.lazy(() => import('./TacticalBoardEditor'));

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

// Estructura inicial de una actividad
const ACTIVIDAD_INICIAL = {
  id: '',
  ejercicio: '',
  ejercicioId: null,
  capacidadFisica: 'fuerza',
  metodo: 'series',
  series: 3,
  repeticiones: '10-12',
  intensidad: 70,
  volumen: 30,
  procOrganizativo: 'individual',
  recuperacion: '2 min',
  boardId: null,
  boardThumbnail: null
};

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
    // Fases de FC
    fcAntesEntrenamiento: '',
    fcDuranteEntrenamiento: '',
    fcDespuesEntrenamiento: '',
    // Recuperación por tiempo
    fcRecuperacion1min: '',
    fcRecuperacion3min: '',
    fcRecuperacion5min: '',
    fcRecuperacion10min: '',
    mostrarRecuperacion10min: false,
    // Tipo de gráfica
    tipoGrafica: 'barras', // 'barras', 'lineas', 'mixta'
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
  tacticalBoard: null
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
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showBoardEditor, setShowBoardEditor] = useState(false);
  const [expandedBoard, setExpandedBoard] = useState(null); // 'faseKey-idx' to expand thumbnail
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
    
    Object.entries(exercises).forEach(([catId, cat]) => {
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

  // Exportar sesión como PDF - generación programática con setTimeout para no bloquear UI
  const handleExportAsPDF = async () => {
    if (exporting) return;
    setExporting(true);
    
    toast.info('Generando PDF...');
    
    // Usar setTimeout para liberar el hilo principal y evitar congelamiento
    setTimeout(async () => {
      try {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        let y = margin;
        
        // Colores personalizados TRAIN
        const colors = {
          primary: [79, 70, 229],       // indigo-600 (violeta del header)
          primaryDark: [67, 56, 202],   // indigo-700
          secondary: [100, 116, 139],   // slate-500
          success: [16, 185, 129],      // emerald-500
          warning: [245, 158, 11],      // amber-500
          info: [59, 130, 246],         // blue-500
          white: [255, 255, 255],
          dark: [30, 41, 59],           // slate-800
          accent: [139, 92, 246]        // violet-500
        };
        
        // Helper: agregar nueva página si es necesario
        const checkNewPage = (neededHeight) => {
          if (y + neededHeight > pageHeight - margin) {
            pdf.addPage();
            y = margin;
            return true;
          }
          return false;
        };
        
        // ========== HEADER CON LOGO TRAIN ==========
        // Gradiente simulado (de violeta a indigo)
        pdf.setFillColor(139, 92, 246); // violet-500
        pdf.rect(0, 0, pageWidth, 40, 'F');
        pdf.setFillColor(79, 70, 229); // indigo-600
        pdf.rect(0, 20, pageWidth, 20, 'F');
        
        // Logo TRAIN
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        // T con cuadrado
        pdf.setFillColor(...colors.white);
        pdf.roundedRect(margin, 8, 12, 12, 2, 2, 'F');
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(14);
        pdf.text('T', margin + 3.5, 17);
        
        // TRAIN text
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('iTRAIN', margin + 16, 17);
        
        // Título
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.text('SESION DE ENTRENAMIENTO', margin, 32);
        
        // Info del atleta y fecha
        pdf.setFontSize(10);
        pdf.text(`Atleta: ${athleteName || 'Sin nombre'}`, pageWidth - margin - 60, 14);
        pdf.text(`Fecha: ${session?.date || new Date().toISOString().split('T')[0]}`, pageWidth - margin - 60, 22);
        
        y = 50; // Ajustado para el header más grande
        
        // ========== OBJETIVOS DE LA SESIÓN ==========
        pdf.setFillColor(236, 253, 245); // green-50
        pdf.rect(margin, y, contentWidth, 8, 'F');
        pdf.setTextColor(...colors.success);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OBJETIVOS DE LA SESION', margin + 3, y + 6);
        y += 12;
        
        pdf.setTextColor(...colors.dark);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        const objetivos = sessionData.objetivos || {};
        const objetivosList = [
          { label: 'General', value: objetivos.general },
          { label: 'Fisico', value: objetivos.fisico },
          { label: 'Tecnico', value: objetivos.tecnico },
          { label: 'Tactico', value: objetivos.tactico },
          { label: 'Psicologico', value: objetivos.psicologico },
          { label: 'Teorico', value: objetivos.teorico }
        ];
        
        objetivosList.forEach(obj => {
          if (obj.value) {
            checkNewPage(8);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${obj.label}:`, margin + 2, y);
            pdf.setFont('helvetica', 'normal');
            const text = pdf.splitTextToSize(obj.value, contentWidth - 30);
            pdf.text(text, margin + 25, y);
            y += Math.max(6, text.length * 4);
          }
        });
        
        y += 5;
        
        // ========== ESTRUCTURA DE LA SESIÓN ==========
        const fases = [
          { key: 'inicial', name: 'FASE INICIAL', color: colors.success, bgColor: [220, 252, 231] },
          { key: 'principal', name: 'FASE PRINCIPAL', color: colors.warning, bgColor: [255, 237, 213] },
          { key: 'final', name: 'FASE FINAL', color: colors.info, bgColor: [219, 234, 254] }
        ];
        
        for (const fase of fases) {
          const faseData = sessionData.fases?.[fase.key];
          const actividades = faseData?.actividades || [];
          
          checkNewPage(25);
          
          // Header de fase
          pdf.setFillColor(...fase.bgColor);
          pdf.rect(margin, y, contentWidth, 8, 'F');
          pdf.setDrawColor(...fase.color);
          pdf.setLineWidth(0.5);
          pdf.line(margin, y, margin, y + 8);
          
          pdf.setTextColor(...fase.color);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(fase.name, margin + 4, y + 6);
          pdf.setTextColor(...colors.secondary);
          pdf.setFontSize(9);
          pdf.text(`${actividades.length} actividades`, margin + contentWidth - 25, y + 6);
          y += 12;
          
          if (actividades.length > 0) {
            // Encabezados de tabla
            const colWidths = [35, 22, 22, 12, 15, 15, 15, 18, 18];
            const headers = ['Ejercicio', 'Cap.Fisica', 'Metodo', 'Ser', 'Reps', 'Int%', 'Vol', 'Org', 'Rec'];
            
            checkNewPage(20);
            pdf.setFillColor(241, 245, 249); // slate-100
            pdf.rect(margin, y, contentWidth, 6, 'F');
            pdf.setTextColor(...colors.secondary);
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            
            let x = margin + 1;
            headers.forEach((header, i) => {
              pdf.text(header, x, y + 4);
              x += colWidths[i];
            });
            y += 8;
            
            // Filas de actividades
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(...colors.dark);
            
            actividades.forEach((act, idx) => {
              checkNewPage(8);
              
              if (idx % 2 === 0) {
                pdf.setFillColor(248, 250, 252); // slate-50
                pdf.rect(margin, y - 2, contentWidth, 7, 'F');
              }
              
              x = margin + 1;
              const rowData = [
                (act.ejercicio || '-').substring(0, 18),
                (CAPACIDADES_FISICAS.find(c => c.id === act.capacidadFisica)?.name || '-').substring(0, 12),
                (METODOS_ENTRENAMIENTO.find(m => m.id === act.metodo)?.name || '-').substring(0, 12),
                String(act.series || '-'),
                String(act.repeticiones || '-'),
                String(act.intensidad || '-'),
                String(act.volumen || '-'),
                (PROC_ORGANIZATIVO.find(p => p.id === act.procOrganizativo)?.name || '-').substring(0, 10),
                String(act.recuperacion || '-')
              ];
              
              pdf.setFontSize(7);
              rowData.forEach((data, i) => {
                pdf.text(data, x, y + 3);
                x += colWidths[i];
              });
              y += 7;
            });
          } else {
            pdf.setTextColor(...colors.secondary);
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Sin actividades registradas', margin + 4, y + 3);
            y += 8;
          }
          
          y += 5;
        }
        
        // ========== MONITOREO ==========
        checkNewPage(40);
        
        pdf.setFillColor(253, 242, 248); // pink-50
        pdf.rect(margin, y, contentWidth, 8, 'F');
        pdf.setTextColor(219, 39, 119); // pink-600
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('MONITOREO DE RENDIMIENTO', margin + 3, y + 6);
        y += 12;
        
        const monitoreo = sessionData.monitoreo || {};
        
        // FC Cards
        pdf.setTextColor(...colors.dark);
        pdf.setFontSize(9);
        
        const fcData = [
          { label: 'FC Reposo', value: monitoreo.fcReposo, unit: 'bpm' },
          { label: 'FC Media', value: monitoreo.fcMedia, unit: 'bpm' },
          { label: 'FC Maxima', value: monitoreo.fcMaxima, unit: 'bpm' }
        ];
        
        let fcX = margin;
        fcData.forEach(fc => {
          pdf.setFillColor(241, 245, 249);
          pdf.roundedRect(fcX, y, 55, 15, 2, 2, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.text(fc.label, fcX + 3, y + 6);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${fc.value || '-'} ${fc.unit}`, fcX + 3, y + 12);
          fcX += 60;
        });
        y += 20;
        
        // Estado del deportista
        checkNewPage(25);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Estado del Deportista:', margin, y);
        y += 6;
        
        pdf.setFont('helvetica', 'normal');
        const estadoItems = [
          { label: 'Fatiga', value: monitoreo.nivelFatiga },
          { label: 'Hidratacion', value: monitoreo.nivelHidratacion },
          { label: 'Sueno', value: monitoreo.calidadSueno },
          { label: 'Energia', value: monitoreo.nivelEnergia }
        ];
        
        estadoItems.forEach(item => {
          pdf.text(`${item.label}: ${item.value || 0}%`, margin + 5, y);
          y += 5;
        });
        
        y += 5;
        
        // ========== RETROALIMENTACIÓN ==========
        if (sessionData.retroalimentacion) {
          checkNewPage(20);
          
          pdf.setFillColor(254, 249, 195); // yellow-100
          pdf.rect(margin, y, contentWidth, 8, 'F');
          pdf.setTextColor(161, 98, 7); // yellow-700
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('OBSERVACIONES', margin + 3, y + 6);
          y += 12;
          
          pdf.setTextColor(...colors.dark);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const retroText = pdf.splitTextToSize(sessionData.retroalimentacion, contentWidth - 10);
          pdf.text(retroText, margin + 2, y);
          y += retroText.length * 4 + 5;
        }
        
        // ========== FOOTER ==========
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFillColor(...colors.dark);
          pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
          pdf.setTextColor(...colors.white);
          pdf.setFontSize(8);
          pdf.text('Generado por Sistema TRAIN', margin, pageHeight - 5);
          pdf.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 5);
        }
        
        // Descargar PDF
        const fileName = `sesion_${athleteName?.replace(/\s+/g, '_') || 'atleta'}_${session?.date || new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        toast.success('PDF descargado exitosamente');
      } catch (error) {
        console.error('Error exporting PDF:', error);
        toast.error('Error al exportar PDF: ' + error.message);
      } finally {
        setExporting(false);
      }
    }, 100); // Delay de 100ms para liberar el UI
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
      
      if (!athleteId) {
        toast.error('Selecciona un atleta primero');
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
      
      // Guardar la sesión con la imagen
      const sessionToShare = {
        athlete_id: athleteId,
        athlete_name: athleteName || 'Atleta',
        session_data: {
          ...session,
          detailedData: sessionData
        },
        session_image: imageBase64
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
        const fullLink = `${window.location.origin}/session/view/${data.share_id}`;
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

  // Renderizar actividades como tarjetas Material Design
  const renderActividadesTable = (faseKey, fase) => {
    return (
      <div className="space-y-3">
        {fase.actividades.map((act, idx) => (
          <div key={act.id} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow" style={{ position: 'relative', zIndex: showExercisePicker === `${faseKey}-${idx}` ? 1000 : 1 }}>
            <div className="flex">
              {/* ── CONTENIDO PRINCIPAL ── */}
              <div className="flex-1 p-3">
                {/* Fila 1: Medios + Cap. Física + Métodos */}
                <div className="flex gap-2 mb-2 items-start">
                  <div className="flex-1 relative" style={{ minWidth: 0 }}>
                    <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Medios</label>
                    <Input
                      value={act.ejercicio}
                      onChange={(e) => updateActividad(faseKey, idx, 'ejercicio', e.target.value)}
                      onFocus={() => setShowExercisePicker(`${faseKey}-${idx}`)}
                      placeholder="Ejercicio..."
                      className="h-8 text-xs"
                      data-testid={`exercise-input-${faseKey}-${idx}`}
                    />
                    {showExercisePicker === `${faseKey}-${idx}` && (
                      <div className="absolute left-0 top-full mt-1 bg-white border-2 border-blue-300 rounded-xl shadow-2xl overflow-hidden" style={{ width: '340px', maxHeight: '280px', zIndex: 99999 }}>
                        <div className="p-3 border-b bg-[#f8ffe0] sticky top-0 z-10">
                          <Input placeholder="Buscar ejercicio..." value={exerciseSearchTerm} onChange={(e) => setExerciseSearchTerm(e.target.value)} className="h-9 text-sm bg-white border-blue-200" autoFocus />
                        </div>
                        <div className="p-2 max-h-44 overflow-y-auto bg-white">
                          {getFilteredExercises().map((ej, ejIdx) => (
                            <button key={`${ej.nombre}-${ejIdx}`} className="w-full text-left px-3 py-2.5 hover:bg-[#f8ffe0] rounded-lg text-sm transition-colors" onClick={() => selectExercise(faseKey, idx, ej.nombre)}>
                              <p className="font-medium text-slate-800">{ej.nombre}</p>
                              <p className="text-slate-400 text-xs mt-0.5">{ej.categoria} • {ej.musculos}</p>
                            </button>
                          ))}
                          {getFilteredExercises().length === 0 && <p className="text-center text-slate-400 py-6 text-sm">No se encontraron ejercicios</p>}
                        </div>
                        <button className="w-full text-center text-[#3a5a00] py-2.5 border-t bg-slate-50 text-sm font-medium hover:bg-[#f8ffe0] transition-colors" onClick={() => setShowExercisePicker(null)}>Cerrar</button>
                      </div>
                    )}
                  </div>
                  <div className="w-24">
                    <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Cap. Fisica</label>
                    <Select value={act.capacidadFisica} onValueChange={(v) => updateActividad(faseKey, idx, 'capacidadFisica', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CAPACIDADES_FISICAS.map(cap => <SelectItem key={cap.id} value={cap.id} className="text-xs">{cap.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Metodo</label>
                    <Select value={act.metodo} onValueChange={(v) => updateActividad(faseKey, idx, 'metodo', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{METODOS_ENTRENAMIENTO.map(met => <SelectItem key={met.id} value={met.id} className="text-xs">{met.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Fila 2: Carga (Series/Reps/Recup) + Intensidad + Volumen + Org */}
                <div className="flex gap-2 items-end">
                  {/* Bloque Carga */}
                  <div className="flex gap-1.5 items-end">
                    <div className="w-14">
                      <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Series</label>
                      <Input type="number" value={act.series} onChange={(e) => updateActividad(faseKey, idx, 'series', parseInt(e.target.value) || 0)} className="h-8 text-xs text-center" min={1} max={20} />
                    </div>
                    <div className="w-16">
                      <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Reps</label>
                      <Input value={act.repeticiones} onChange={(e) => updateActividad(faseKey, idx, 'repeticiones', e.target.value)} className="h-8 text-xs" placeholder="10-12" />
                    </div>
                    <div className="w-16">
                      <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Recup.</label>
                      <Input value={act.recuperacion} onChange={(e) => updateActividad(faseKey, idx, 'recuperacion', e.target.value)} className="h-8 text-xs" placeholder="2 min" />
                    </div>
                  </div>

                  <div className="w-px h-7 bg-slate-200 mx-1" />

                  {/* Bloque Intensidad + Volumen */}
                  <div className="w-28">
                    <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Intensidad</label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${act.intensidad > 80 ? 'bg-red-500' : act.intensidad > 60 ? 'bg-orange-500' : act.intensidad > 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${act.intensidad}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{act.intensidad}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={act.intensidad} onChange={(e) => updateActividad(faseKey, idx, 'intensidad', parseInt(e.target.value))} className="w-full h-1 mt-0.5 accent-blue-500" />
                  </div>
                  <div className="w-16">
                    <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Volumen</label>
                    <Input value={act.volumen} onChange={(e) => updateActividad(faseKey, idx, 'volumen', e.target.value)} className="h-8 text-xs" placeholder="30 min" />
                  </div>

                  <div className="w-px h-7 bg-slate-200 mx-1" />

                  {/* Bloque Organización */}
                  <div className="w-24">
                    <label className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mb-0.5 block">Proc. Org.</label>
                    <Select value={act.procOrganizativo} onValueChange={(v) => updateActividad(faseKey, idx, 'procOrganizativo', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{PROC_ORGANIZATIVO.map(proc => <SelectItem key={proc.id} value={proc.id} className="text-xs">{proc.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── PIZARRA (derecha) ── */}
              <div className="w-24 border-l border-slate-100 flex flex-col items-center justify-center p-2 bg-slate-50/50">
                {act.boardThumbnail ? (
                  <div
                    className="w-20 h-28 rounded-lg border border-slate-200 overflow-hidden bg-white cursor-pointer hover:border-[#c8f700] transition-colors shadow-sm"
                    onClick={() => {
                      boardEditContextRef.current = { faseKey, actId: act.id };
                      window.open(act.boardId ? `/tactical-board.html?boardId=${act.boardId}` : '/tactical-board.html', '_blank');
                    }}
                    title="Clic para editar pizarra"
                    data-testid={`board-thumb-${faseKey}-${idx}`}
                    dangerouslySetInnerHTML={{ __html: act.boardThumbnail }}
                  />
                ) : (
                  <button
                    onClick={() => {
                      boardEditContextRef.current = { faseKey, actId: act.id };
                      window.open('/tactical-board.html', '_blank');
                    }}
                    className="w-20 h-28 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-[#c8f700] hover:text-[#3a5a00] hover:bg-[#f8ffe0] transition-colors"
                    title="Abrir Pizarra Tactica"
                    data-testid={`open-board-${faseKey}-${idx}`}
                  >
                    <LayoutGrid className="w-5 h-5 mb-1" />
                    <span className="text-[8px] font-medium">Pizarra</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── FOOTER: Acciones ── */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/80 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">#{idx + 1}</span>
              <div className="flex items-center gap-1">
                {act.boardThumbnail && (
                  <button onClick={() => { updateActividadMulti(faseKey, idx, { boardThumbnail: null, boardId: null }); }} className="text-[10px] text-slate-400 hover:text-red-500 px-2 py-0.5 rounded transition-colors">Quitar pizarra</button>
                )}
                <button onClick={() => {
                  const dup = { ...act, id: `act-${Date.now()}` };
                  setSessionData(prev => ({...prev, fases: {...prev.fases, [faseKey]: {...prev.fases[faseKey], actividades: [...prev.fases[faseKey].actividades, dup]}}}));
                }} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors" title="Duplicar">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteActividad(faseKey, idx)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {fase.actividades.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm">
            No hay actividades en esta fase
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-6xl max-h-[90vh] overflow-hidden p-0 bg-white [&>button]:hidden" 
          data-testid="session-editor-dialog"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Header con gradiente */}
          <div className="sticky top-0 z-10 bg-[#0b0e14] text-white px-6 py-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white font-bold text-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#c8f700] rounded-xl flex items-center justify-center">
                    <span className="text-[20px] font-black text-[#0b0e14] leading-none" style={{fontFamily:'Barlow Condensed, sans-serif'}}>i</span>
                  </div>
                  <div>
                    <span>Sesión de Entrenamiento</span>
                    {session?.dayName && (
                      <span className="ml-2 text-white/80 font-normal text-base">#{session.dayName}</span>
                    )}
                  </div>
                </DialogTitle>
                {athleteName && (
                  <p className="text-slate-400 text-sm mt-2 ml-[52px]">
                    Atleta: {athleteName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/80" />
                  <Input
                    type="date"
                    defaultValue={session?.date}
                    className="w-36 h-8 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contenido Principal - Fondo blanco */}
          <div 
            ref={sessionContentRef} 
            data-testid="session-editor-content"
            className="overflow-y-auto max-h-[calc(90vh-180px)] bg-white"
          >
            <div className="p-6 space-y-6">
              {/* Objetivos de la Sesión */}
              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-[#f0ffd0] border-b border-[#c8f700]/20 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                    <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    Objetivos de la Sesión
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo General</label>
                      <Input
                        value={sessionData.objetivos.general}
                        onChange={(e) => updateObjetivo('general', e.target.value)}
                        placeholder="Objetivo principal de la sesión..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                        data-testid="objetivo-general"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Físico</label>
                      <Input
                        value={sessionData.objetivos.fisico}
                        onChange={(e) => updateObjetivo('fisico', e.target.value)}
                        placeholder="Desarrollo de capacidades físicas..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                        data-testid="objetivo-fisico"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Técnico</label>
                      <Input
                        value={sessionData.objetivos.tecnico}
                        onChange={(e) => updateObjetivo('tecnico', e.target.value)}
                        placeholder="Mejora técnica específica..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Táctico</label>
                      <Input
                        value={sessionData.objetivos.tactico}
                        onChange={(e) => updateObjetivo('tactico', e.target.value)}
                        placeholder="Desarrollo táctico..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Psicológico</label>
                      <Input
                        value={sessionData.objetivos.psicologico}
                        onChange={(e) => updateObjetivo('psicologico', e.target.value)}
                        placeholder="Aspecto mental a trabajar..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Teórico</label>
                      <Input
                        value={sessionData.objetivos.teorico}
                        onChange={(e) => updateObjetivo('teorico', e.target.value)}
                        placeholder="Conocimiento teórico..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estructura de la Sesión */}
              <Card className="border border-slate-200 shadow-sm bg-white overflow-visible">
                <CardHeader className="bg-[#fff8e0] border-b border-amber-200/40 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    Estructura de la Sesión
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 bg-white overflow-visible">
                  {/* Fases */}
                  {Object.entries(sessionData.fases).map(([faseKey, fase]) => {
                    const faseColors = {
                      inicial: { border: 'border-l-[#c8f700]', bg: 'bg-[#f8ffe0]', header: 'bg-[#f0ffd0]', text: 'text-[#3a5a00]', btn: 'border-[#c8f700] text-[#3a5a00] hover:bg-[#f0ffd0]' },
                      principal: { border: 'border-l-[#0b0e14]', bg: 'bg-slate-50', header: 'bg-slate-100', text: 'text-slate-800', btn: 'border-slate-800 text-slate-800 hover:bg-slate-100' },
                      final: { border: 'border-l-[#378ADD]', bg: 'bg-blue-50', header: 'bg-blue-100', text: 'text-blue-700', btn: 'border-blue-500 text-blue-700 hover:bg-blue-100' }
                    };
                    const colors = faseColors[faseKey];
                    
                    return (
                      <div key={faseKey} className={`border-l-4 ${colors.border} rounded-xl overflow-visible shadow-sm bg-white`} style={{ position: 'relative', zIndex: showExercisePicker?.startsWith(faseKey) ? 100 : 1 }}>
                        <button
                          onClick={() => setExpandedPhases(prev => ({ ...prev, [faseKey]: !prev[faseKey] }))}
                          className={`w-full flex items-center justify-between p-4 ${colors.header} hover:opacity-90 transition-all`}
                        >
                          <div className="flex items-center gap-3">
                            {expandedPhases[faseKey] ? 
                              <ChevronDown className={`w-5 h-5 ${colors.text}`} /> : 
                              <ChevronRight className={`w-5 h-5 ${colors.text}`} />
                            }
                            <span className={`font-bold uppercase text-sm ${colors.text}`}>
                              {fase.nombre}
                            </span>
                            <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full">
                              {fase.actividades.length} actividades
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); addActividad(faseKey); }}
                            className={`h-8 text-xs ${colors.btn} bg-white`}
                            data-testid={`add-activity-${faseKey}`}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Agregar Actividad
                          </Button>
                        </button>
                        
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

              {/* ═══ PIZARRA TACTICA ═══ */}
              {sessionData.tacticalBoard ? (
                <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-2xl" data-testid="tactical-board-preview">
                  <CardHeader className="bg-[#0b0e14] text-white p-4">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#c8f700]/20 rounded-lg flex items-center justify-center">
                          <LayoutGrid className="w-4 h-4 text-[#c8f700]" />
                        </div>
                        <div>
                          <span className="text-white font-bold">Pizarra Tactica</span>
                          <span className="text-slate-400 text-xs ml-2">{sessionData.tacticalBoard.sportName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowBoardEditor(true)}
                          className="border-[#c8f700]/40 text-[#c8f700] hover:bg-[#c8f700]/10 text-xs h-8"
                          data-testid="edit-board-btn">
                          <Pencil className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => { setSessionData(prev => ({ ...prev, tacticalBoard: null })); toast.info('Pizarra eliminada'); }}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8"
                          data-testid="delete-board-btn">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 bg-white flex justify-center">
                    <TacticalBoardPreview board={sessionData.tacticalBoard} />
                  </CardContent>
                </Card>
              ) : (
                <Card
                  className="border-2 border-dashed border-slate-200 shadow-sm bg-white overflow-hidden cursor-pointer hover:border-[#c8f700]/50 transition-colors rounded-2xl group"
                  onClick={() => setShowBoardEditor(true)}
                  data-testid="create-board-card"
                >
                  <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-[#f0ffd0] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <LayoutGrid className="w-7 h-7 text-[#3a5a00]" />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1">Pizarra Tactica</h4>
                    <p className="text-sm text-slate-500 mb-3">Crea formaciones, jugadas y movimientos interactivos</p>
                    <Button className="bg-[#c8f700] hover:bg-[#d9ff20] text-[#0b0e14] font-bold" data-testid="open-board-editor-btn"
                      onClick={(e) => { e.stopPropagation(); window.open('/tactical-board.html', '_blank'); }}>
                      <Plus className="w-4 h-4 mr-1.5" /> Abrir Pizarra Completa
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Monitoreo Avanzado - Material Design */}
              <Card className="border-0 shadow-lg bg-white overflow-hidden rounded-2xl">
                <CardHeader className="bg-[#0b0e14] text-white p-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg font-bold text-white">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Watch className="w-5 h-5" />
                      </div>
                      <div>
                        <span>Monitoreo de Rendimiento</span>
                        <p className="text-xs font-normal text-white/80 mt-0.5">Datos de frecuencia cardíaca y biométricos</p>
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs border-2 ${sessionData.monitoreo.dispositivoConectado 
                          ? 'border-white bg-white/20 text-white hover:bg-white/30' 
                          : 'border-white/50 bg-transparent text-white hover:bg-white/10'}`}
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
                  {/* Sección de Gráfica con selector de tipo */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <Heart className="w-4 h-4 text-red-500" />
                        </div>
                        Frecuencia Cardíaca por Fases
                      </h4>
                      {/* Selector de tipo de gráfica */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                        <button
                          onClick={() => setSessionData(prev => ({ ...prev, monitoreo: { ...prev.monitoreo, tipoGrafica: 'barras' }}))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            sessionData.monitoreo.tipoGrafica === 'barras' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Barras
                        </button>
                        <button
                          onClick={() => setSessionData(prev => ({ ...prev, monitoreo: { ...prev.monitoreo, tipoGrafica: 'lineas' }}))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            sessionData.monitoreo.tipoGrafica === 'lineas' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Líneas
                        </button>
                        <button
                          onClick={() => setSessionData(prev => ({ ...prev, monitoreo: { ...prev.monitoreo, tipoGrafica: 'mixta' }}))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            sessionData.monitoreo.tipoGrafica === 'mixta' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Mixta
                        </button>
                      </div>
                    </div>
                    
                    {/* Área de gráfica Material Design */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                      {/* Gráfica */}
                      <div className="relative h-48 mb-4">
                        {/* Grid de fondo */}
                        <div className="absolute inset-0 flex flex-col justify-between">
                          {[200, 150, 100, 50, 0].map((val) => (
                            <div key={val} className="flex items-center">
                              <span className="text-[10px] text-slate-400 w-8 text-right mr-2">{val}</span>
                              <div className="flex-1 border-t border-dashed border-slate-200" />
                            </div>
                          ))}
                        </div>
                        
                        {/* Datos de la gráfica */}
                        <div className="absolute inset-0 pl-10 pr-4 flex items-end justify-around pt-4 pb-6">
                          {(() => {
                            const fcData = [
                              { label: 'Antes', value: parseInt(sessionData.monitoreo.fcAntesEntrenamiento) || 70, color: 'from-blue-500 to-blue-400', lineColor: '#3b82f6' },
                              { label: 'Durante', value: parseInt(sessionData.monitoreo.fcDuranteEntrenamiento) || 150, color: 'from-red-500 to-orange-400', lineColor: '#ef4444' },
                              { label: 'Después', value: parseInt(sessionData.monitoreo.fcDespuesEntrenamiento) || 90, color: 'from-green-500 to-emerald-400', lineColor: '#22c55e' },
                              { label: 'Recup 1\'', value: parseInt(sessionData.monitoreo.fcRecuperacion1min) || 85, color: 'from-teal-500 to-cyan-400', lineColor: '#14b8a6' },
                              { label: 'Recup 3\'', value: parseInt(sessionData.monitoreo.fcRecuperacion3min) || 78, color: 'from-purple-500 to-violet-400', lineColor: '#a855f7' },
                              { label: 'Recup 5\'', value: parseInt(sessionData.monitoreo.fcRecuperacion5min) || 72, color: 'from-indigo-500 to-blue-400', lineColor: '#6366f1' },
                            ];
                            
                            if (sessionData.monitoreo.mostrarRecuperacion10min) {
                              fcData.push({ label: 'Recup 10\'', value: parseInt(sessionData.monitoreo.fcRecuperacion10min) || 68, color: 'from-pink-500 to-rose-400', lineColor: '#ec4899' });
                            }
                            
                            const maxHeight = 160;
                            const points = fcData.map((d, i) => ({
                              x: (i / (fcData.length - 1)) * 100,
                              y: maxHeight - (d.value / 200 * maxHeight)
                            }));
                            
                            return (
                              <>
                                {/* Línea para gráfica de líneas o mixta */}
                                {(sessionData.monitoreo.tipoGrafica === 'lineas' || sessionData.monitoreo.tipoGrafica === 'mixta') && (
                                  <svg className="absolute inset-0 pl-10 pr-4 pt-4 pb-6 w-full h-full overflow-visible" preserveAspectRatio="none">
                                    <defs>
                                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="30%" stopColor="#ef4444" />
                                        <stop offset="50%" stopColor="#22c55e" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                      </linearGradient>
                                    </defs>
                                    <polyline
                                      fill="none"
                                      stroke="url(#lineGradient)"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      points={points.map(p => `${p.x}%,${p.y}`).join(' ')}
                                      className="drop-shadow-sm"
                                    />
                                    {/* Puntos */}
                                    {points.map((p, i) => (
                                      <circle
                                        key={i}
                                        cx={`${p.x}%`}
                                        cy={p.y}
                                        r="6"
                                        fill="white"
                                        stroke={fcData[i].lineColor}
                                        strokeWidth="3"
                                        className="drop-shadow-md"
                                      />
                                    ))}
                                  </svg>
                                )}
                                
                                {/* Barras */}
                                {(sessionData.monitoreo.tipoGrafica === 'barras' || sessionData.monitoreo.tipoGrafica === 'mixta') && (
                                  <div className="flex items-end justify-around h-full w-full gap-2">
                                    {fcData.map((d, i) => (
                                      <div key={i} className="flex flex-col items-center flex-1">
                                        <div 
                                          className={`w-full max-w-[40px] bg-gradient-to-t ${d.color} rounded-t-lg transition-all duration-500 shadow-lg ${
                                            sessionData.monitoreo.tipoGrafica === 'mixta' ? 'opacity-40' : ''
                                          }`}
                                          style={{ height: `${Math.min(100, d.value / 200 * 100)}%` }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {/* Labels y inputs */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {[
                          { key: 'fcAntesEntrenamiento', label: 'Antes', color: 'blue', placeholder: '70' },
                          { key: 'fcDuranteEntrenamiento', label: 'Durante', color: 'red', placeholder: '150' },
                          { key: 'fcDespuesEntrenamiento', label: 'Después', color: 'green', placeholder: '90' },
                          { key: 'fcRecuperacion1min', label: 'Recup 1\'', color: 'teal', placeholder: '85' },
                          { key: 'fcRecuperacion3min', label: 'Recup 3\'', color: 'purple', placeholder: '78' },
                          { key: 'fcRecuperacion5min', label: 'Recup 5\'', color: 'indigo', placeholder: '72' },
                        ].map((item) => (
                          <div key={item.key} className="text-center">
                            <div className={`text-[10px] font-semibold text-${item.color}-600 uppercase mb-1`}>{item.label}</div>
                            <Input
                              type="number"
                              value={sessionData.monitoreo[item.key]}
                              onChange={(e) => setSessionData(prev => ({
                                ...prev,
                                monitoreo: { ...prev.monitoreo, [item.key]: e.target.value }
                              }))}
                              placeholder={item.placeholder}
                              className={`text-center h-9 text-sm font-bold border-2 border-${item.color}-200 focus:border-${item.color}-400 rounded-xl`}
                            />
                            <div className="text-[9px] text-slate-400 mt-0.5">bpm</div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Opción de 10 minutos */}
                      <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                        <button
                          onClick={() => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, mostrarRecuperacion10min: !prev.monitoreo.mostrarRecuperacion10min }
                          }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            sessionData.monitoreo.mostrarRecuperacion10min 
                              ? 'bg-pink-100 text-pink-700 border-2 border-pink-300' 
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-2 border-transparent'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center ${
                            sessionData.monitoreo.mostrarRecuperacion10min ? 'bg-pink-500' : 'bg-slate-300'
                          }`}>
                            {sessionData.monitoreo.mostrarRecuperacion10min && <Check className="w-3 h-3 text-white" />}
                          </div>
                          Agregar Recuperación 10 min (opcional)
                        </button>
                        
                        {sessionData.monitoreo.mostrarRecuperacion10min && (
                          <div className="mt-3 flex items-center gap-3">
                            <div className="text-[10px] font-semibold text-pink-600 uppercase">Recup 10'</div>
                            <Input
                              type="number"
                              value={sessionData.monitoreo.fcRecuperacion10min}
                              onChange={(e) => setSessionData(prev => ({
                                ...prev,
                                monitoreo: { ...prev.monitoreo, fcRecuperacion10min: e.target.value }
                              }))}
                              placeholder="68"
                              className="text-center h-9 w-24 text-sm font-bold border-2 border-pink-200 focus:border-pink-400 rounded-xl"
                            />
                            <span className="text-[10px] text-slate-400">bpm</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FC Reposo, Media y Máxima - Material Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-[#f8ffe0] to-[#f0ffd0] rounded-2xl p-5 text-center border border-[#c8f700]/20 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-[#c8f700] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <Heart className="w-6 h-6 text-[#0b0e14]" />
                      </div>
                      <p className="text-xs font-bold text-[#3a5a00] uppercase tracking-wide mb-2">FC Reposo</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcReposo}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcReposo: e.target.value }
                        }))}
                        placeholder="60"
                        className="text-center text-2xl font-bold h-12 border-0 bg-white/70 rounded-xl shadow-inner"
                      />
                      <span className="text-xs text-[#3a5a00] font-medium">bpm</span>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-5 text-center border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">FC Media</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcMedia}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcMedia: e.target.value }
                        }))}
                        placeholder="135"
                        className="text-center text-2xl font-bold h-12 border-0 bg-white/70 rounded-xl shadow-inner"
                      />
                      <span className="text-xs text-amber-500 font-medium">bpm</span>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl p-5 text-center border border-red-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">FC Máxima</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcMaxima}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcMaxima: e.target.value }
                        }))}
                        placeholder="180"
                        className="text-center text-2xl font-bold h-12 border-0 bg-white/70 rounded-xl shadow-inner"
                      />
                      <span className="text-xs text-red-500 font-medium">bpm</span>
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
                            Hidratación
                          </span>
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
              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    Observaciones y Retroalimentación
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <Textarea
                    value={sessionData.retroalimentacion}
                    onChange={(e) => setSessionData(prev => ({ ...prev, retroalimentacion: e.target.value }))}
                    placeholder="Observaciones y comentarios de la sesión..."
                    className="min-h-[100px] resize-none bg-white border-slate-200 focus:border-indigo-400"
                    data-testid="retroalimentacion"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer con botones mejorado */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleGenerateShareLink}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                data-testid="share-session-btn"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir Enlace
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleExportAsPDF}
                disabled={exporting}
                className="border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                data-testid="export-pdf-btn"
              >
                {exporting ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleExit}
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
                data-testid="exit-session-btn"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Salir
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                onClick={handleSave}
                data-testid="save-session-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de compartir enlace */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md bg-white p-0 overflow-hidden">
          <div className="bg-[#0b0e14] text-white p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#c8f700]/20 rounded-xl flex items-center justify-center">
                <Link2 className="w-6 h-6 text-[#c8f700]" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">Compartir Sesión</DialogTitle>
                <p className="text-slate-400 text-sm mt-1">
                  El deportista podrá ver la sesión sin necesidad de iniciar sesión
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Enlace para compartir:</label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="bg-slate-50 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className={linkCopied ? 'border-green-500 text-green-600' : 'border-slate-300'}
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Vista del deportista</p>
                  <p className="text-xs text-blue-600 mt-1">
                    El deportista verá la sesión completa con objetivos, ejercicios y parámetros de entrenamiento.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowShareDialog(false)}
              >
                Cerrar
              </Button>
              <Button
                onClick={handleCopyLink}
                className="bg-[#c8f700] hover:bg-[#d9ff20] text-[#0b0e14] font-bold"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Enlace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tactical Board Editor */}
      {showBoardEditor && (
        <Suspense fallback={null}>
          <TacticalBoardEditor
            isOpen={showBoardEditor}
            onClose={() => setShowBoardEditor(false)}
            onSave={(boardData) => {
              setSessionData(prev => ({ ...prev, tacticalBoard: boardData }));
            }}
            initialData={sessionData.tacticalBoard}
            sessionDescription={sessionData.objetivos?.tactico || sessionData.objetivos?.general || ''}
            planSport={session?.sport || 'football'}
          />
        </Suspense>
      )}
    </>
  );
};

export default SessionEditor;

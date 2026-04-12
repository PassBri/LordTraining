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
  Watch, Droplets, Battery, Moon, TrendingUp, TrendingDown, Bluetooth,
  Sparkles, LayoutGrid, X, Users, User, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { EJERCICIOS_INICIALES } from './ExerciseLibrary';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BC = "'Barlow Condensed', sans-serif";
const INT = "'Inter', sans-serif";

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
  descripcion: '',
  capacidadFisica: 'fuerza',
  metodo: 'series',
  series: 3,
  repeticiones: '10-12',
  intensidad: 70,
  volumen: 30,
  procOrganizativo: 'individual',
  recuperacion: '2 min',
  materiales: [],
  boardId: null,
  boardThumbnail: null
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
  useEffect(() => {
    const fetchUserLib = async () => {
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
    };
    fetchUserLib();
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
        {fase.actividades.map((act, idx) => {
          const actMateriales = act.materiales || [];
          return (
          <div key={act.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-visible" style={{ position: 'relative', zIndex: showExercisePicker === `${faseKey}-${idx}` ? 1000 : 1 }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 rounded-t-2xl">
              <span className="text-[11px] font-bold text-slate-800">Actividad {idx + 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => {const dup={...act,id:`act-${Date.now()}`};setSessionData(prev=>({...prev,fases:{...prev.fases,[faseKey]:{...prev.fases[faseKey],actividades:[...prev.fases[faseKey].actividades,dup]}}}));}} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600" title="Duplicar"><Copy className="w-3 h-3" /></button>
                <button onClick={() => deleteActividad(faseKey, idx)} className="p-1 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>

            {/* Una sola fila: Medios | Carga | Intensidad | Materiales | Pizarra */}
            <div className="flex gap-1.5 p-2">
              {/* MEDIOS */}
              <div className="flex-[4] min-w-0 rounded-xl border border-slate-100 p-2 relative">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-4 h-4 rounded bg-[#c8f700] flex items-center justify-center"><Dumbbell className="w-2.5 h-2.5 text-[#1a2800]" /></div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Medios</span>
                  <Select value={act.capacidadFisica} onValueChange={(v) => updateActividad(faseKey, idx, 'capacidadFisica', v)}>
                    <SelectTrigger className="h-5 text-[8px] w-auto min-w-[60px] ml-auto border-0 bg-slate-50 rounded-full px-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{CAPACIDADES_FISICAS.map(cap => <SelectItem key={cap.id} value={cap.id} className="text-xs">{cap.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input value={act.ejercicio} onChange={(e) => updateActividad(faseKey, idx, 'ejercicio', e.target.value)} onFocus={() => { setShowExercisePicker(`${faseKey}-${idx}`); setPickerCat(null); setPickerSub(null); }} placeholder="Seleccionar ejercicio..." className="h-7 text-[11px] font-medium mb-1" data-testid={`exercise-input-${faseKey}-${idx}`} />
                {showExercisePicker === `${faseKey}-${idx}` && (
                  <div className="absolute left-2 right-2 top-[60px] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: 99999, minWidth: '380px' }} onMouseDown={(e) => e.preventDefault()}>
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
                          {!pickerCat ? <p className="text-center text-slate-300 py-6 text-xs">Selecciona categoria</p> : (
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
                <Textarea value={act.descripcion||''} onChange={(e) => updateActividad(faseKey, idx, 'descripcion', e.target.value)} placeholder="Descripcion del ejercicio..." className="text-[10px] min-h-[48px] h-12 resize-none py-1 px-1.5 text-slate-400 leading-normal border-slate-100 flex-1" rows={2} data-testid={`exercise-desc-${faseKey}-${idx}`} onInput={(e) => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,80)+'px'; }} />
              </div>

              {/* CARGA */}
              <div className="w-[110px] flex-shrink-0 rounded-xl border border-slate-100 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-4 h-4 rounded bg-blue-50 flex items-center justify-center"><Activity className="w-2.5 h-2.5 text-blue-600" /></div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Carga</span>
                </div>
                <Select value={act.metodo} onValueChange={(v) => updateActividad(faseKey, idx, 'metodo', v)}>
                  <SelectTrigger className="h-5 text-[8px] border-0 bg-slate-50 rounded-full px-1.5 mb-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{METODOS_ENTRENAMIENTO.map(met => <SelectItem key={met.id} value={met.id} className="text-xs">{met.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><span className="text-[7px] text-slate-400 w-8 flex-shrink-0">Series</span><Input type="number" value={act.series} onChange={(e) => updateActividad(faseKey, idx, 'series', parseInt(e.target.value)||0)} className="h-6 text-[10px] text-center flex-1 px-0.5" min={1} max={20} /></div>
                  <div className="flex items-center gap-1"><span className="text-[7px] text-slate-400 w-8 flex-shrink-0">Reps</span><Input value={act.repeticiones} onChange={(e) => updateActividad(faseKey, idx, 'repeticiones', e.target.value)} className="h-6 text-[10px] flex-1 px-1" placeholder="10-12" /></div>
                  <div className="flex items-center gap-1"><span className="text-[7px] text-slate-400 w-8 flex-shrink-0">Rec.</span><Input value={act.recuperacion} onChange={(e) => updateActividad(faseKey, idx, 'recuperacion', e.target.value)} className="h-6 text-[10px] flex-1 px-1" placeholder="2 min" /></div>
                </div>
              </div>

              {/* INTENSIDAD */}
              <div className="w-[110px] flex-shrink-0 rounded-xl border border-slate-100 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-4 h-4 rounded bg-orange-50 flex items-center justify-center"><Zap className="w-2.5 h-2.5 text-orange-600" /></div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Intens.</span>
                  <span className="text-[9px] font-bold text-slate-700 ml-auto">{act.intensidad}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-0.5"><div className={`h-full rounded-full ${act.intensidad>80?'bg-red-500':act.intensidad>60?'bg-orange-500':act.intensidad>40?'bg-yellow-500':'bg-green-500'}`} style={{width:`${act.intensidad}%`}} /></div>
                <input type="range" min={0} max={100} value={act.intensidad} onChange={(e) => updateActividad(faseKey, idx, 'intensidad', parseInt(e.target.value))} className="w-full h-1 accent-orange-500 mb-1" />
                <div className="space-y-1">
                  <div className="flex items-center gap-1"><span className="text-[7px] text-slate-400 w-7 flex-shrink-0">Vol.</span><Input value={act.volumen} onChange={(e) => updateActividad(faseKey, idx, 'volumen', e.target.value)} className="h-6 text-[10px] flex-1 px-1" placeholder="30" /></div>
                  <div><span className="text-[7px] text-slate-400 block">Org.</span>
                    <Select value={act.procOrganizativo} onValueChange={(v) => updateActividad(faseKey, idx, 'procOrganizativo', v)}><SelectTrigger className="h-6 text-[9px]"><SelectValue /></SelectTrigger><SelectContent>{PROC_ORGANIZATIVO.map(proc => <SelectItem key={proc.id} value={proc.id} className="text-xs">{proc.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
              </div>

              {/* MATERIALES */}
              <div className="w-[180px] flex-shrink-0 rounded-xl border border-slate-100 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-4 h-4 rounded bg-purple-50 flex items-center justify-center"><Target className="w-2.5 h-2.5 text-purple-600" /></div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Materiales</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {actMateriales.map((mat, mi) => (
                    <span key={mi} className="inline-flex items-center gap-0.5 bg-purple-50 text-purple-700 text-[8px] font-medium px-1.5 py-px rounded-full border border-purple-200">
                      {mat}<button onClick={() => { const nm=[...actMateriales]; nm.splice(mi,1); updateActividad(faseKey, idx, 'materiales', nm); }} className="hover:text-red-500"><X className="w-2 h-2" /></button>
                    </span>
                  ))}
                  {actMateriales.length === 0 && <span className="text-[8px] text-slate-300 italic">Sin materiales</span>}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {MATERIALES_DISPONIBLES.filter(m => !actMateriales.includes(m)).slice(0,6).map(mat => (
                    <button key={mat} onClick={() => updateActividad(faseKey, idx, 'materiales', [...actMateriales, mat])} className="text-[7px] px-1 py-px rounded-full border border-slate-200 text-slate-400 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors">{mat}</button>
                  ))}
                  {MATERIALES_DISPONIBLES.filter(m => !actMateriales.includes(m)).length > 6 && <span className="text-[7px] text-slate-300 self-center">+{MATERIALES_DISPONIBLES.filter(m => !actMateriales.includes(m)).length-6}</span>}
                </div>
              </div>

              {/* PIZARRA */}
              <div className="w-[110px] flex-shrink-0 rounded-xl border border-slate-100 p-2 flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-4 h-4 rounded bg-[#f0ffd0] flex items-center justify-center"><LayoutGrid className="w-2.5 h-2.5 text-[#3a5a00]" /></div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Pizarra</span>
                </div>
                {act.boardThumbnail ? (
                  <div className="w-full flex-1 min-h-[90px] rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-[#c8f700] overflow-hidden" onClick={() => {boardEditContextRef.current={faseKey,actId:act.id};window.open(act.boardId?`/tactical-board.html?boardId=${act.boardId}`:'/tactical-board.html','_blank');}} data-testid={`board-thumb-${faseKey}-${idx}`} dangerouslySetInnerHTML={{__html:act.boardThumbnail}} />
                ) : (
                  <button onClick={() => {boardEditContextRef.current={faseKey,actId:act.id};window.open('/tactical-board.html','_blank');}} className="w-full flex-1 min-h-[90px] rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-[#c8f700] hover:text-[#3a5a00] hover:bg-[#f8ffe0]/30 transition-all" data-testid={`open-board-${faseKey}-${idx}`}>
                    <LayoutGrid className="w-4 h-4" /><span className="text-[6px] font-semibold uppercase mt-0.5">Abrir</span>
                  </button>
                )}
                {act.boardThumbnail && <button onClick={() => updateActividadMulti(faseKey, idx, {boardThumbnail:null,boardId:null})} className="text-[7px] text-slate-300 hover:text-red-400 mt-0.5 block w-full text-center">quitar</button>}
              </div>
            </div>
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
          className="max-w-6xl max-h-[90vh] overflow-hidden p-0 bg-white [&>button]:hidden" 
          data-testid="session-editor-dialog"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* ══ DARK HEADER BAR — Landing Page Branding ══ */}
          <style>{`
            .se-input::placeholder { color: rgba(255,255,255,0.3) !important; }
          `}</style>
          <DialogTitle className="sr-only">Sesion de Entrenamiento</DialogTitle>
          <div className="sticky top-0 z-10" style={{background:'#0a0a0f'}}>
            <div className="flex items-center gap-3 px-5 py-3">
              {/* Logo — matching Landing Page navbar exactly */}
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
                  {/* 02: Name input — 17px, weight 500, proper placeholder */}
                  <input
                    value={sessionData.sessionName || ''}
                    onChange={(e) => setSessionData(prev => ({...prev, sessionName: e.target.value}))}
                    className="bg-transparent text-white border-0 outline-none truncate w-auto max-w-[280px]"
                    style={{fontFamily:INT,fontSize:'17px',fontWeight:500}}
                    placeholder="Nombre de la sesion..."
                    data-testid="session-name-input"
                  />
                  {/* 01: SES badge — solid lime bg, black text */}
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{background:'#9EFF00',color:'#0f0f13',fontFamily:BC,letterSpacing:'0.04em'}}>SES-{String(session?.sessionIndex || session?.dayName || '001').padStart(3,'0')}</span>
                </div>
                {/* 04: Subtitle — 35% white opacity */}
                <p className="text-[10px] mt-0.5 truncate" style={{fontFamily:INT,color:'rgba(255,255,255,0.35)'}}>
                  Sesion {session?.sessionIndex || session?.dayName || '1'} · Semana {session?.weekIndex || session?.weekName || '1'} · {session?.mesoName || session?.macroName || 'Mesociclo 1'}
                  {athleteName && <span style={{color:'rgba(255,255,255,0.2)'}} className="ml-2">· {athleteName}</span>}
                </p>
              </div>
              {/* Right chips */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Date picker with Popover + Calendar */}
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity" style={{background:'rgba(204,255,0,0.08)',border:'0.5px solid rgba(204,255,0,0.15)'}}>
                      <Calendar className="w-3.5 h-3.5" style={{color:'#CCFF00',opacity:0.6}} />
                      <span className="text-[11px] text-white/90 whitespace-nowrap">
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
                {/* Duration chip */}
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg" style={{background:'rgba(204,255,0,0.08)',border:'0.5px solid rgba(204,255,0,0.15)'}}>
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{color:'#CCFF00',opacity:0.6}} />
                  <div className="flex items-center">
                    <input value={sessionData.duration} onChange={(e) => setSessionData(prev => ({...prev, duration: e.target.value}))} className="w-7 h-5 bg-transparent border-0 text-white/90 text-[11px] p-0 text-right outline-none" placeholder="90" />
                    <span className="text-[11px] text-white/90 ml-0.5">min</span>
                  </div>
                </div>
                {/* Status dropdown */}
                <select value={sessionData.sessionStatus} onChange={(e) => setSessionData(prev => ({...prev, sessionStatus: e.target.value}))} className="h-7 text-[11px] rounded-lg px-2.5 border-0 outline-none cursor-pointer text-white/90" style={{background:'rgba(204,255,0,0.08)',border:'0.5px solid rgba(204,255,0,0.15)',colorScheme:'dark'}}>
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
                <input value={sessionData.team} onChange={(e) => setSessionData(prev => ({...prev, team: e.target.value}))} className="se-input h-6 text-[11px] bg-transparent border-0 outline-none w-full min-w-[60px]" style={{color:'rgba(255,255,255,0.85)'}} placeholder="Equipo / Atleta" />
              </div>
              <div style={{width:'0.5px',height:'16px',background:'rgba(255,255,255,0.12)'}} />
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <User className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                <input value={sessionData.coach} onChange={(e) => setSessionData(prev => ({...prev, coach: e.target.value}))} className="se-input h-6 text-[11px] bg-transparent border-0 outline-none w-full min-w-[60px]" style={{color:'rgba(255,255,255,0.85)'}} placeholder="Entrenador..." />
              </div>
              <div style={{width:'0.5px',height:'16px',background:'rgba(255,255,255,0.12)'}} />
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                <input value={sessionData.location} onChange={(e) => setSessionData(prev => ({...prev, location: e.target.value}))} className="se-input h-6 text-[11px] bg-transparent border-0 outline-none w-full min-w-[60px]" style={{color:'rgba(255,255,255,0.85)'}} placeholder="Lugar" />
              </div>
              <div style={{width:'0.5px',height:'16px',background:'rgba(255,255,255,0.12)'}} />
              <div className="flex items-center gap-1.5 w-[140px] flex-shrink-0">
                <Activity className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                <select value={sessionData.sessionType} onChange={(e) => setSessionData(prev => ({...prev, sessionType: e.target.value}))} className="h-6 text-[11px] bg-transparent border-0 outline-none cursor-pointer w-full" style={{color:'rgba(255,255,255,0.85)',colorScheme:'dark'}}>
                  <option value="tecnico-tactico" style={{background:'#12131a',color:'#fff'}}>Tecnico-Tactico</option>
                  <option value="fisico" style={{background:'#12131a',color:'#fff'}}>Fisico</option>
                  <option value="recuperacion" style={{background:'#12131a',color:'#fff'}}>Recuperacion</option>
                  <option value="evaluacion" style={{background:'#12131a',color:'#fff'}}>Evaluacion</option>
                  <option value="competicion" style={{background:'#12131a',color:'#fff'}}>Competicion</option>
                  <option value="mixto" style={{background:'#12131a',color:'#fff'}}>Mixto</option>
                </select>
              </div>
              <div style={{width:'0.5px',height:'16px',background:'rgba(255,255,255,0.12)'}} />
              {/* Carga est. */}
              <div className="flex items-center gap-1.5 w-[120px] flex-shrink-0">
                <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{color:'rgba(204,255,0,0.5)'}} />
                {sessionData.estimatedLoad ? (
                  <>
                    <input value={sessionData.estimatedLoad} onChange={(e) => setSessionData(prev => ({...prev, estimatedLoad: e.target.value}))} className="h-6 text-[11px] bg-transparent border-0 outline-none w-full" style={{color:'rgba(255,255,255,0.85)'}} placeholder="Carga" />
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      parseFloat(sessionData.estimatedLoad) > 70 ? 'bg-red-500/25 text-red-400' :
                      parseFloat(sessionData.estimatedLoad) > 40 ? 'bg-amber-500/25 text-amber-400' :
                      'bg-emerald-500/25 text-emerald-400'
                    }`}>{parseFloat(sessionData.estimatedLoad) > 70 ? 'Alta' : parseFloat(sessionData.estimatedLoad) > 40 ? 'Media' : 'Baja'}</span>
                  </>
                ) : (
                  <span className="text-[10px] whitespace-nowrap" style={{color:'rgba(255,255,255,0.3)'}}>— Sin calcular</span>
                )}
              </div>
            </div>
          </div>

          {/* Contenido Principal */}
          <div 
            ref={sessionContentRef} 
            data-testid="session-editor-content"
            className="overflow-y-auto max-h-[calc(90vh-180px)]"
            style={{background:'#f5f5f7'}}
          >
            <div className="p-6 space-y-5">
              {/* Objetivos de la Sesión */}
              <Card className="border-0 shadow-md bg-white overflow-hidden rounded-2xl">
                <CardHeader className="pb-3 pt-4 px-5" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
                  <CardTitle className="flex items-center gap-2.5 text-[14px]" style={{fontFamily:INT}}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}>
                      <Target className="w-3.5 h-3.5 text-slate-900" />
                    </div>
                    <span className="text-white font-bold">Objetivos de la Sesion</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: 'general', label: 'Objetivo General', placeholder: 'Objetivo principal de la sesion...' },
                      { key: 'fisico', label: 'Objetivo Fisico', placeholder: 'Desarrollo de capacidades fisicas...' },
                      { key: 'tecnico', label: 'Objetivo Tecnico', placeholder: 'Mejora tecnica especifica...' },
                      { key: 'tactico', label: 'Objetivo Tactico', placeholder: 'Desarrollo tactico...' },
                      { key: 'psicologico', label: 'Objetivo Psicologico', placeholder: 'Aspecto mental a trabajar...' },
                      { key: 'teorico', label: 'Objetivo Teorico', placeholder: 'Conocimiento teorico...' },
                    ].map(obj => (
                      <div key={obj.key} className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{fontFamily:BC}}>{obj.label}</label>
                        <Input
                          value={sessionData.objetivos[obj.key]}
                          onChange={(e) => updateObjetivo(obj.key, e.target.value)}
                          placeholder={obj.placeholder}
                          className="bg-slate-50 border-slate-200 focus:border-[#CCFF00] focus:ring-[#CCFF00]/20 text-sm h-9"
                          data-testid={`objetivo-${obj.key}`}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Estructura de la Sesion */}
              <Card className="border-0 shadow-md bg-white overflow-visible rounded-2xl">
                <CardHeader className="pb-3 pt-4 px-5" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
                  <CardTitle className="flex items-center gap-2.5 text-[14px]" style={{fontFamily:INT}}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}>
                      <Zap className="w-3.5 h-3.5 text-slate-900" />
                    </div>
                    <span className="text-white font-bold">Estructura de la Sesion</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 bg-white overflow-visible">
                  {/* Fases */}
                  {Object.entries(sessionData.fases).map(([faseKey, fase]) => {
                    const faseColors = {
                      inicial: { border: 'border-l-[#CCFF00]', bg: 'bg-[#CCFF00]/5', header: 'bg-[#CCFF00]/8', text: 'text-[#3a5a00]', btn: 'border-[#CCFF00] text-[#3a5a00] hover:bg-[#CCFF00]/10' },
                      principal: { border: 'border-l-slate-800', bg: 'bg-slate-50', header: 'bg-slate-100', text: 'text-slate-800', btn: 'border-slate-700 text-slate-800 hover:bg-slate-100' },
                      final: { border: 'border-l-[#3B82F6]', bg: 'bg-blue-50/50', header: 'bg-blue-50', text: 'text-blue-700', btn: 'border-blue-400 text-blue-700 hover:bg-blue-50' }
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

              {/* Monitoreo Avanzado */}
              <Card className="border-0 shadow-md bg-white overflow-hidden rounded-2xl">
                <CardHeader className="p-4" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5 text-[14px] font-bold text-white" style={{fontFamily:INT}}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}>
                        <Watch className="w-3.5 h-3.5 text-slate-900" />
                      </div>
                      <div>
                        <span>Monitoreo de Rendimiento</span>
                        <p className="text-[10px] font-normal text-white/40 mt-0.5">Datos de frecuencia cardiaca y biometricos</p>
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

              {/* Retroalimentacion */}
              <Card className="border-0 shadow-md bg-white overflow-hidden rounded-2xl">
                <CardHeader className="pb-3 pt-4 px-5" style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)'}}>
                  <CardTitle className="flex items-center gap-2.5 text-[14px]" style={{fontFamily:INT}}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}>
                      <AlertCircle className="w-3.5 h-3.5 text-slate-900" />
                    </div>
                    <span className="text-white font-bold">Observaciones y Retroalimentacion</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <Textarea
                    value={sessionData.retroalimentacion}
                    onChange={(e) => setSessionData(prev => ({ ...prev, retroalimentacion: e.target.value }))}
                    placeholder="Observaciones y comentarios de la sesion..."
                    className="min-h-[100px] resize-none bg-slate-50 border-slate-200 focus:border-[#CCFF00] focus:ring-[#CCFF00]/20"
                    data-testid="retroalimentacion"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t px-5 py-3 flex justify-between items-center" style={{background:'#0a0a0f',borderColor:'rgba(204,255,0,0.08)'}}>
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
                onClick={handleExportAsPDF}
                disabled={exporting}
                className="border-white/15 text-white/60 hover:bg-white/5 hover:text-white text-[11px] h-8"
                data-testid="export-pdf-btn"
              >
                {exporting ? (
                  <>
                    <Activity className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    PDF
                  </>
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
                <DialogTitle className="text-white text-base font-bold" style={{fontFamily:INT}}>Compartir Sesion</DialogTitle>
                <p className="text-white/40 text-[11px] mt-0.5">
                  El deportista podra ver la sesion sin necesidad de iniciar sesion
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{fontFamily:BC}}>Enlace para compartir:</label>
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
                    El deportista vera la sesion completa con objetivos, ejercicios y parametros de entrenamiento.
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

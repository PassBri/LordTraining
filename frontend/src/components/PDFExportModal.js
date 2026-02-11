import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  FileText, Download, Loader2, Users, Calendar, BarChart3, 
  Target, Activity, Layers, CheckSquare, Square, ChevronDown,
  Printer, FileDown, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Secciones disponibles para exportar
const EXPORT_SECTIONS = {
  athlete_info: {
    id: 'athlete_info',
    label: 'Información del Atleta',
    icon: Users,
    description: 'Datos básicos, afiliaciones y contacto',
    items: [
      { id: 'basic_info', label: 'Datos básicos (nombre, edad, deporte)' },
      { id: 'affiliations', label: 'Afiliaciones (federación, club, escuela)' },
      { id: 'contact', label: 'Información de contacto' }
    ]
  },
  characterization: {
    id: 'characterization',
    label: 'Caracterización',
    icon: Target,
    description: 'Caracterización del deporte y deportista',
    items: [
      { id: 'sport_char', label: 'Caracterización del deporte' },
      { id: 'athlete_char', label: 'Caracterización del deportista' },
      { id: 'performance_model', label: 'Modelo de rendimiento' }
    ]
  },
  anthropometric: {
    id: 'anthropometric',
    label: 'Datos Antropométricos',
    icon: Activity,
    description: 'Mediciones físicas y composición corporal',
    items: [
      { id: 'measurements', label: 'Mediciones (peso, talla, IMC)' },
      { id: 'body_composition', label: 'Composición corporal' },
      { id: 'history', label: 'Historial de mediciones' }
    ]
  },
  evaluations: {
    id: 'evaluations',
    label: 'Evaluaciones y Tests',
    icon: Target,
    description: 'Resultados de evaluaciones físicas',
    items: [
      { id: 'physical_tests', label: 'Tests físicos' },
      { id: 'technical_tests', label: 'Tests técnicos' },
      { id: 'performance_history', label: 'Historial de rendimiento' }
    ]
  },
  medical: {
    id: 'medical',
    label: 'Historial Médico',
    icon: Heart,
    description: 'Diagnóstico, lesiones y enfermedades',
    items: [
      { id: 'diagnostic', label: 'Diagnóstico general' },
      { id: 'injuries', label: 'Historial de lesiones' },
      { id: 'diseases', label: 'Enfermedades y condiciones' }
    ]
  },
  analysis: {
    id: 'analysis',
    label: 'Análisis Previo',
    icon: FileText,
    description: 'Análisis de planes y competencias anteriores',
    items: [
      { id: 'previous_plan', label: 'Análisis del plan anterior' },
      { id: 'competition_analysis', label: 'Análisis de competencias' },
      { id: 'strengths_weaknesses', label: 'Fortalezas y debilidades' }
    ]
  },
  objectives: {
    id: 'objectives',
    label: 'Objetivos e Indicadores',
    icon: Target,
    description: 'Metas y KPIs del plan',
    items: [
      { id: 'general_objectives', label: 'Objetivos generales' },
      { id: 'specific_objectives', label: 'Objetivos específicos' },
      { id: 'kpis', label: 'Indicadores de rendimiento (KPIs)' }
    ]
  },
  periodization: {
    id: 'periodization',
    label: 'Plan de Periodización',
    icon: Layers,
    description: 'Estructura del plan de entrenamiento',
    items: [
      { id: 'periodization_model', label: 'Modelo de periodización' },
      { id: 'macrocycle_stages', label: 'Etapas del macrociclo' },
      { id: 'macrocycles', label: 'Macrociclos' },
      { id: 'mesocycles', label: 'Mesociclos' },
      { id: 'microcycles', label: 'Microciclos' },
      { id: 'sessions', label: 'Sesiones de entrenamiento' }
    ]
  },
  training_methods: {
    id: 'training_methods',
    label: 'Medios de Entrenamiento',
    icon: Dumbbell,
    description: 'Ejercicios y métodos utilizados',
    items: [
      { id: 'exercises', label: 'Ejercicios seleccionados' },
      { id: 'methods', label: 'Métodos de entrenamiento' },
      { id: 'progressions', label: 'Progresiones' }
    ]
  },
  graphic_plan: {
    id: 'graphic_plan',
    label: 'Plan Gráfico',
    icon: BarChart3,
    description: 'Gráficas de carga, volumen e intensidad',
    items: [
      { id: 'training_table', label: 'Tabla de planificación semanal' },
      { id: 'load_chart', label: 'Gráfica de Magnitud de Carga y Recuperación' },
      { id: 'volume_intensity_chart', label: 'Gráfica de Volumen e Intensidad' },
      { id: 'phase_timeline', label: 'Línea de tiempo de fases' }
    ]
  },
  control: {
    id: 'control',
    label: 'Control y Seguimiento',
    icon: LineChart,
    description: 'Monitoreo de carga y control',
    items: [
      { id: 'load_monitoring', label: 'Monitoreo de carga' },
      { id: 'training_control', label: 'Control de entrenamiento' },
      { id: 'alerts', label: 'Alertas y recomendaciones' }
    ]
  },
  calendar: {
    id: 'calendar',
    label: 'Calendario de Eventos',
    icon: Calendar,
    description: 'Competencias y eventos programados',
    items: [
      { id: 'competitions', label: 'Competencias' },
      { id: 'training_camps', label: 'Concentraciones' },
      { id: 'evaluations_calendar', label: 'Evaluaciones programadas' }
    ]
  }
};

// Opciones de formato
const FORMAT_OPTIONS = {
  paper_size: [
    { id: 'letter', label: 'Carta (Letter)' },
    { id: 'a4', label: 'A4' },
    { id: 'legal', label: 'Legal' }
  ],
  orientation: [
    { id: 'portrait', label: 'Vertical (Portrait)' },
    { id: 'landscape', label: 'Horizontal (Landscape)' }
  ],
  color_scheme: [
    { id: 'color', label: 'Color completo' },
    { id: 'grayscale', label: 'Escala de grises' },
    { id: 'bw', label: 'Blanco y negro' }
  ]
};

const PDFExportModal = ({ isOpen, onClose, athleteId, athleteName, periodizationData }) => {
  const [selectedSections, setSelectedSections] = useState({});
  const [selectedItems, setSelectedItems] = useState({});
  const [formatOptions, setFormatOptions] = useState({
    paper_size: 'letter',
    orientation: 'portrait',
    color_scheme: 'color',
    include_logo: true,
    include_date: true,
    include_page_numbers: true
  });
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('sections');

  // Inicializar selecciones
  useEffect(() => {
    const initialSections = {};
    const initialItems = {};
    Object.keys(EXPORT_SECTIONS).forEach(sectionId => {
      initialSections[sectionId] = false;
      initialItems[sectionId] = {};
      EXPORT_SECTIONS[sectionId].items.forEach(item => {
        initialItems[sectionId][item.id] = false;
      });
    });
    setSelectedSections(initialSections);
    setSelectedItems(initialItems);
  }, []);

  // Toggle sección completa
  const toggleSection = (sectionId) => {
    const newValue = !selectedSections[sectionId];
    setSelectedSections(prev => ({ ...prev, [sectionId]: newValue }));
    
    // Seleccionar/deseleccionar todos los items de la sección
    const newItems = { ...selectedItems };
    EXPORT_SECTIONS[sectionId].items.forEach(item => {
      newItems[sectionId][item.id] = newValue;
    });
    setSelectedItems(newItems);
  };

  // Toggle item individual
  const toggleItem = (sectionId, itemId) => {
    const newItems = { ...selectedItems };
    newItems[sectionId][itemId] = !newItems[sectionId][itemId];
    setSelectedItems(newItems);
    
    // Verificar si todos los items están seleccionados para actualizar la sección
    const allSelected = EXPORT_SECTIONS[sectionId].items.every(
      item => newItems[sectionId][item.id]
    );
    const anySelected = EXPORT_SECTIONS[sectionId].items.some(
      item => newItems[sectionId][item.id]
    );
    setSelectedSections(prev => ({ 
      ...prev, 
      [sectionId]: allSelected ? true : anySelected ? 'partial' : false 
    }));
  };

  // Seleccionar todo
  const selectAll = () => {
    const newSections = {};
    const newItems = {};
    Object.keys(EXPORT_SECTIONS).forEach(sectionId => {
      newSections[sectionId] = true;
      newItems[sectionId] = {};
      EXPORT_SECTIONS[sectionId].items.forEach(item => {
        newItems[sectionId][item.id] = true;
      });
    });
    setSelectedSections(newSections);
    setSelectedItems(newItems);
  };

  // Deseleccionar todo
  const deselectAll = () => {
    const newSections = {};
    const newItems = {};
    Object.keys(EXPORT_SECTIONS).forEach(sectionId => {
      newSections[sectionId] = false;
      newItems[sectionId] = {};
      EXPORT_SECTIONS[sectionId].items.forEach(item => {
        newItems[sectionId][item.id] = false;
      });
    });
    setSelectedSections(newSections);
    setSelectedItems(newItems);
  };

  // Contar secciones seleccionadas
  const countSelectedSections = () => {
    return Object.values(selectedSections).filter(v => v === true || v === 'partial').length;
  };

  // Exportar PDF
  const handleExport = async () => {
    const sectionsToExport = [];
    Object.keys(selectedItems).forEach(sectionId => {
      const items = Object.entries(selectedItems[sectionId])
        .filter(([_, selected]) => selected)
        .map(([itemId]) => itemId);
      if (items.length > 0) {
        sectionsToExport.push({ section: sectionId, items });
      }
    });

    if (sectionsToExport.length === 0) {
      toast.error('Selecciona al menos una sección para exportar');
      return;
    }

    setExporting(true);
    const token = localStorage.getItem('train_token');

    try {
      const response = await axios.post(
        `${API_URL}/api/export/comprehensive-pdf`,
        {
          athlete_id: athleteId,
          sections: sectionsToExport,
          format: formatOptions,
          periodization_data: periodizationData
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          responseType: 'blob'
        }
      );

      // Crear link de descarga
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${athleteName?.replace(/\s+/g, '_') || 'atleta'}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF exportado exitosamente');
      onClose();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white -m-6 mb-0 p-6 rounded-t-lg">
          <DialogTitle className="text-xl flex items-center gap-3">
            <FileText className="w-6 h-6" />
            Exportar Reporte PDF
          </DialogTitle>
          <p className="text-indigo-100 text-sm mt-1">
            Selecciona las secciones que deseas incluir en tu reporte
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col mt-4">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Contenido
            </TabsTrigger>
            <TabsTrigger value="format" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Formato
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="flex-1 overflow-y-auto mt-4 pr-2">
            {/* Quick actions */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-500">
                {countSelectedSections()} secciones seleccionadas
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Seleccionar todo
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Sections list */}
            <div className="space-y-3">
              {Object.entries(EXPORT_SECTIONS).map(([sectionId, section]) => {
                const IconComponent = section.icon;
                const isSelected = selectedSections[sectionId];
                const isPartial = isSelected === 'partial';
                
                return (
                  <Card key={sectionId} className={`border-2 transition-colors ${
                    isSelected === true ? 'border-indigo-400 bg-indigo-50/50' : 
                    isPartial ? 'border-indigo-200 bg-indigo-50/30' : 
                    'border-slate-200 hover:border-slate-300'
                  }`}>
                    <CardContent className="p-4">
                      {/* Section header */}
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => toggleSection(sectionId)}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected === true ? 'bg-indigo-500 border-indigo-500' :
                          isPartial ? 'bg-indigo-200 border-indigo-400' :
                          'border-slate-300'
                        }`}>
                          {(isSelected === true || isPartial) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {isSelected === true ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                              )}
                            </svg>
                          )}
                        </div>
                        <IconComponent className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <div className="flex-1">
                          <p className={`font-semibold ${isSelected ? 'text-indigo-800' : 'text-slate-700'}`}>
                            {section.label}
                          </p>
                          <p className="text-xs text-slate-500">{section.description}</p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${
                          isSelected || isPartial ? 'rotate-180' : ''
                        }`} />
                      </div>

                      {/* Section items (visible when section is selected or partially selected) */}
                      {(isSelected || isPartial) && (
                        <div className="mt-3 pl-8 space-y-2 border-l-2 border-indigo-200 ml-2">
                          {section.items.map(item => (
                            <label 
                              key={item.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedItems[sectionId]?.[item.id] || false}
                                onChange={() => toggleItem(sectionId, item.id)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-slate-600">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="format" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-6">
              {/* Paper size */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Tamaño de papel
                </label>
                <Select 
                  value={formatOptions.paper_size} 
                  onValueChange={(v) => setFormatOptions(prev => ({ ...prev, paper_size: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.paper_size.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Orientation */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Orientación
                </label>
                <Select 
                  value={formatOptions.orientation} 
                  onValueChange={(v) => setFormatOptions(prev => ({ ...prev, orientation: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.orientation.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Color scheme */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Esquema de colores
                </label>
                <Select 
                  value={formatOptions.color_scheme} 
                  onValueChange={(v) => setFormatOptions(prev => ({ ...prev, color_scheme: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.color_scheme.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional options */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">
                  Opciones adicionales
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formatOptions.include_logo}
                    onChange={(e) => setFormatOptions(prev => ({ ...prev, include_logo: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-500"
                  />
                  <span className="text-sm text-slate-600">Incluir logo de TRAIN</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formatOptions.include_date}
                    onChange={(e) => setFormatOptions(prev => ({ ...prev, include_date: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-500"
                  />
                  <span className="text-sm text-slate-600">Incluir fecha de generación</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formatOptions.include_page_numbers}
                    onChange={(e) => setFormatOptions(prev => ({ ...prev, include_page_numbers: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-500"
                  />
                  <span className="text-sm text-slate-600">Incluir números de página</span>
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose} disabled={exporting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={exporting || countSelectedSections() === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFExportModal;

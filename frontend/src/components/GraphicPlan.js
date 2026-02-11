import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import {
  Save,
  Loader2,
  Download,
  Calendar,
  Target,
  Activity,
  Heart,
  Brain,
  Dumbbell,
  Trophy,
  ClipboardCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileInput,
  RefreshCw,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Cycle duration options
const CYCLE_DURATIONS = {
  olympic: { label: 'Ciclo Olímpico (4 años)', weeks: 208, months: 48 },
  annual: { label: 'Anual (52 semanas)', weeks: 52, months: 12 },
  semester: { label: 'Semestral (6 meses)', weeks: 26, months: 6 },
  quarter: { label: 'Trimestral (3 meses)', weeks: 12, months: 3 }
};

// Intensity levels
const INTENSITY_LEVELS = [
  { id: 'very_high', label: 'Muy alta', range: '98%-100%', color: 'bg-red-600', volumeLabel: 'Máximo' },
  { id: 'high', label: 'Alta', range: '85%-95%', color: 'bg-orange-500', volumeLabel: 'Sub-máximo' },
  { id: 'medium', label: 'Media', range: '70%-80%', color: 'bg-yellow-500', volumeLabel: 'Medio' },
  { id: 'low', label: 'Baja', range: '55%-65%', color: 'bg-green-500', volumeLabel: 'Sub-medio' },
  { id: 'recovery', label: 'Recuperación', range: 'Hasta 50%', color: 'bg-blue-400', volumeLabel: 'Bajo' }
];

// Preparation types
const PREPARATION_TYPES = [
  { id: 'general_physical', label: 'Preparación física general', color: 'bg-blue-200' },
  { id: 'specific_physical', label: 'Preparación física específica', color: 'bg-blue-300' },
  { id: 'technical', label: 'Preparación técnica', color: 'bg-green-200' },
  { id: 'tactical', label: 'Preparación táctica', color: 'bg-yellow-200' },
  { id: 'psychological', label: 'Preparación psicológica', color: 'bg-purple-200' },
  { id: 'theoretical', label: 'Preparación teórica', color: 'bg-pink-200' }
];

// Physical preparation components
const PHYSICAL_COMPONENTS = [
  { id: 'endurance', label: 'Resistencia', color: 'bg-red-100' },
  { id: 'strength', label: 'Fuerza', color: 'bg-orange-100' },
  { id: 'speed', label: 'Velocidad', color: 'bg-yellow-100' },
  { id: 'coordination', label: 'Capacidades coordinativas', color: 'bg-green-100' },
  { id: 'flexibility', label: 'Flexibilidad', color: 'bg-blue-100' }
];

// Activity types
const ACTIVITY_TYPES = [
  { id: 'training', label: 'Entrenamiento', color: 'bg-blue-200' },
  { id: 'doping_test', label: 'Control de dopaje', color: 'bg-red-200' },
  { id: 'main_competition', label: 'Competencia principal', color: 'bg-green-400' },
  { id: 'secondary_competition', label: 'Competencia secundaria', color: 'bg-green-200' },
  { id: 'recovery', label: 'Recuperación', color: 'bg-purple-200' }
];

// Monitoring areas
const MONITORING_AREAS = [
  { id: 'medical', label: 'Control médico', color: 'bg-red-100' },
  { id: 'physical', label: 'Control físico', color: 'bg-orange-100' },
  { id: 'technical', label: 'Control técnico', color: 'bg-yellow-100' },
  { id: 'tactical', label: 'Control táctico', color: 'bg-green-100' },
  { id: 'psychological', label: 'Control psicológico', color: 'bg-blue-100' },
  { id: 'theoretical', label: 'Control teórico', color: 'bg-purple-100' }
];

// Macrocycle types
const MACROCYCLE_TYPES = [
  { id: 'preparatory_general', label: 'Preparatorio General', color: 'bg-blue-300' },
  { id: 'preparatory_specific', label: 'Preparatorio Específico', color: 'bg-blue-400' },
  { id: 'precompetitive', label: 'Precompetitivo', color: 'bg-yellow-300' },
  { id: 'competitive', label: 'Competitivo', color: 'bg-green-400' },
  { id: 'transition', label: 'Transición', color: 'bg-orange-300' }
];

// Mesocycle types
const MESOCYCLE_TYPES = [
  { id: 'entrante', label: 'Entrante', color: 'bg-slate-200' },
  { id: 'basico_desarrollador', label: 'Básico desarrollador', color: 'bg-blue-200' },
  { id: 'basico_estabilizador', label: 'Básico estabilizador', color: 'bg-cyan-200' },
  { id: 'precompetitivo', label: 'Precompetitivo', color: 'bg-yellow-200' },
  { id: 'competitivo', label: 'Competitivo', color: 'bg-green-200' },
  { id: 'recuperacion', label: 'Recuperación', color: 'bg-purple-200' }
];

// Microcycle types
const MICROCYCLE_TYPES = [
  { id: 'corriente', label: 'Corriente', color: 'bg-gray-200' },
  { id: 'carga', label: 'Carga', color: 'bg-blue-200' },
  { id: 'choque', label: 'Choque', color: 'bg-red-200' },
  { id: 'competitivo', label: 'Competitivo', color: 'bg-green-200' },
  { id: 'aproximacion', label: 'Aproximación', color: 'bg-yellow-200' },
  { id: 'restablecimiento', label: 'Restablecimiento', color: 'bg-purple-200' }
];

const GraphicPlan = ({ athleteId, periodizationData, athleteName }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cycleDuration, setCycleDuration] = useState('annual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewOffset, setViewOffset] = useState(0);
  const [visibleWeeks, setVisibleWeeks] = useState(24);
  const [hasImportedData, setHasImportedData] = useState(false);
  
  // Chart type selections
  const [loadChartType, setLoadChartType] = useState('bars'); // 'bars', 'lines', 'areas'
  const [volumeIntensityChartType, setVolumeIntensityChartType] = useState('combined'); // 'lines', 'bars', 'combined'
  
  // General information
  const [generalInfo, setGeneralInfo] = useState({
    sport: '',
    category: '',
    athlete: '',
    coach: '',
    periodizationType: 'tradicional'
  });
  
  // Plan data structure
  const [planData, setPlanData] = useState({
    // Cycle structure
    macrocycles: {},
    periods: {},
    phases: {},
    mesocycles: {},
    microcycles: {},
    // Load magnitude
    intensity: {},
    volume: {},
    frequency: {},
    // Preparation
    preparation: {},
    // Physical preparation
    physical: {},
    // Activities
    activities: {},
    // Monitoring
    monitoring: {}
  });

  // Import periodization data when available
  const importPeriodizationData = useCallback((macrocycle) => {
    if (!macrocycle || !macrocycle.mesocycles) return;

    const newPlanData = {
      macrocycles: {},
      periods: {},
      phases: {},
      mesocycles: {},
      microcycles: {},
      intensity: {},
      volume: {},
      frequency: {},
      preparation: {},
      physical: {},
      activities: {},
      monitoring: {}
    };

    // Map phase IDs to our types
    const phaseMapping = {
      'preparatory_general': 'preparatory_general',
      'preparatory_specific': 'preparatory_specific',
      'precompetitive': 'precompetitive',
      'competitive': 'competitive',
      'transition': 'transition'
    };

    // Map mesocycle types
    const mesoTypeMapping = {
      'entrante': 'entrante',
      'desarrollo': 'basico_desarrollador',
      'choque': 'basico_desarrollador',
      'estabilizador': 'basico_estabilizador',
      'competitivo': 'competitivo',
      'recuperacion': 'recuperacion'
    };

    // Map microcycle types  
    const microTypeMapping = {
      'ordinario': 'corriente',
      'choque': 'choque',
      'aproximacion': 'aproximacion',
      'competitivo': 'competitivo',
      'recuperacion': 'restablecimiento'
    };

    // Process each mesocycle
    macrocycle.mesocycles.forEach(meso => {
      meso.microcycles?.forEach(micro => {
        const week = micro.weekNumber;
        
        // Set macrocycle phase
        const phaseId = phaseMapping[meso.phase] || 'preparatory_general';
        newPlanData.macrocycles[week] = phaseId;
        newPlanData.phases[week] = phaseId;
        
        // Set period based on phase
        if (['preparatory_general', 'preparatory_specific'].includes(meso.phase)) {
          newPlanData.periods[week] = 'preparatorio';
        } else if (['competitive', 'precompetitive'].includes(meso.phase)) {
          newPlanData.periods[week] = 'competitivo';
        } else {
          newPlanData.periods[week] = 'transicion';
        }

        // Set mesocycle type
        const mesoTypeId = mesoTypeMapping[meso.type?.id] || 'basico_desarrollador';
        newPlanData.mesocycles[week] = mesoTypeId;

        // Set microcycle type
        const microTypeId = microTypeMapping[micro.type?.id] || 'corriente';
        newPlanData.microcycles[week] = microTypeId;

        // Set volume and intensity levels (convert 0-100 to 1-5 scale)
        const volumeLevel = Math.min(5, Math.max(1, Math.ceil(micro.volume / 20)));
        const intensityLevel = Math.min(5, Math.max(1, Math.ceil(micro.intensity / 20)));
        
        // Set intensity by level
        const intensityLevels = ['recovery', 'low', 'medium', 'high', 'very_high'];
        newPlanData.intensity[`${intensityLevels[intensityLevel - 1]}_${week}`] = intensityLevel;
        
        // Set frequency based on sessions
        const sessionsCount = micro.sessions?.length || 5;
        newPlanData.frequency[week] = String(sessionsCount);

        // Set preparation emphasis based on phase
        if (meso.phase === 'preparatory_general') {
          newPlanData.preparation[`general_physical_${week}`] = volumeLevel;
          newPlanData.physical[`endurance_${week}`] = volumeLevel;
          newPlanData.physical[`strength_${week}`] = Math.max(1, volumeLevel - 1);
        } else if (meso.phase === 'preparatory_specific') {
          newPlanData.preparation[`specific_physical_${week}`] = volumeLevel;
          newPlanData.preparation[`technical_${week}`] = volumeLevel;
          newPlanData.physical[`strength_${week}`] = volumeLevel;
          newPlanData.physical[`speed_${week}`] = Math.max(1, volumeLevel - 1);
        } else if (meso.phase === 'precompetitive') {
          newPlanData.preparation[`technical_${week}`] = volumeLevel;
          newPlanData.preparation[`tactical_${week}`] = volumeLevel;
          newPlanData.physical[`speed_${week}`] = volumeLevel;
        } else if (meso.phase === 'competitive') {
          newPlanData.preparation[`tactical_${week}`] = volumeLevel;
          newPlanData.preparation[`psychological_${week}`] = volumeLevel;
          newPlanData.activities[`main_competition_${week}`] = micro.sessions?.some(s => s.type === 'competition');
        }

        // Set training activity for all weeks
        newPlanData.activities[`training_${week}`] = true;

        // Deload weeks get recovery
        if (micro.isDeload) {
          newPlanData.activities[`recovery_${week}`] = true;
          newPlanData.microcycles[week] = 'restablecimiento';
        }
      });
    });

    setPlanData(newPlanData);
    
    // Update cycle duration based on total weeks
    if (macrocycle.totalWeeks <= 13) {
      setCycleDuration('quarter');
    } else if (macrocycle.totalWeeks <= 26) {
      setCycleDuration('semester');
    } else {
      setCycleDuration('annual');
    }

    // Update general info
    setGeneralInfo(prev => ({
      ...prev,
      athlete: athleteName || prev.athlete,
      periodizationType: macrocycle.model || 'tradicional'
    }));

    setHasImportedData(true);
    toast.success('Datos de periodización importados correctamente');
  }, [athleteName]);

  // Watch for periodization data changes
  useEffect(() => {
    if (periodizationData && !hasImportedData) {
      importPeriodizationData(periodizationData);
    }
  }, [periodizationData, hasImportedData, importPeriodizationData]);

  const totalWeeks = CYCLE_DURATIONS[cycleDuration].weeks;
  
  // Generate week numbers for display
  const weeks = useMemo(() => {
    return Array.from({ length: totalWeeks }, (_, i) => i + 1);
  }, [totalWeeks]);
  
  // Visible weeks based on scroll
  const displayedWeeks = useMemo(() => {
    const start = viewOffset;
    const end = Math.min(viewOffset + visibleWeeks, totalWeeks);
    return weeks.slice(start, end);
  }, [weeks, viewOffset, visibleWeeks, totalWeeks]);

  // Calculate load magnitude data for charts (Carga y Recuperación)
  const loadChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      // Calculate total load for week (sum of all intensity levels)
      let totalLoad = 0;
      let recovery = 0;
      
      INTENSITY_LEVELS.forEach((level, idx) => {
        const value = planData.intensity?.[level.id]?.[week] || 0;
        // Weight higher intensity more
        totalLoad += value * (5 - idx);
      });
      
      // Recovery is inverse of load (simplified)
      recovery = Math.max(0, 100 - totalLoad * 20);
      
      // Get phase for color coding
      const phaseId = planData.phases?.[week];
      const phase = MACROCYCLE_TYPES.find(t => t.id === phaseId);
      
      return {
        week: `S${week}`,
        weekNum: week,
        carga: Math.min(100, totalLoad * 20),
        recuperacion: recovery,
        fase: phase?.label || '',
        faseColor: phase?.color || ''
      };
    });
  }, [displayedWeeks, planData.intensity, planData.phases]);

  // Calculate volume and intensity data for charts
  const volumeIntensityChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      // Calculate average volume from volume cells
      let volumeSum = 0;
      let volumeCount = 0;
      
      INTENSITY_LEVELS.forEach(level => {
        const value = planData.volume?.[level.id]?.[week];
        if (value) {
          volumeSum += value;
          volumeCount++;
        }
      });
      
      // Calculate intensity from intensity cells
      let intensitySum = 0;
      let intensityCount = 0;
      
      INTENSITY_LEVELS.forEach((level, idx) => {
        const value = planData.intensity?.[level.id]?.[week];
        if (value) {
          intensitySum += value * (100 - idx * 15); // Higher intensity levels have higher %
          intensityCount += value;
        }
      });
      
      const avgVolume = volumeCount > 0 ? Math.round(volumeSum / volumeCount * 20) : 0;
      const avgIntensity = intensityCount > 0 ? Math.round(intensitySum / intensityCount) : 0;
      
      // Get mesocycle for additional info
      const mesocycleId = planData.mesocycles?.[week];
      const mesocycle = MESOCYCLE_TYPES.find(t => t.id === mesocycleId);
      
      return {
        week: `S${week}`,
        weekNum: week,
        volumen: avgVolume || Math.floor(Math.random() * 40) + 30, // Sample data if empty
        intensidad: avgIntensity || Math.floor(Math.random() * 30) + 50, // Sample data if empty
        mesociclo: mesocycle?.label || '',
        month: Math.ceil(week / 4)
      };
    });
  }, [displayedWeeks, planData.volume, planData.intensity, planData.mesocycles]);

  // Load existing plan
  useEffect(() => {
    const loadPlan = async () => {
      if (!athleteId) return;
      
      setLoading(true);
      const token = localStorage.getItem('train_token');
      
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/graphic-plan/${athleteId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data) {
          setGeneralInfo(response.data.generalInfo || generalInfo);
          setPlanData(response.data.planData || planData);
          setCycleDuration(response.data.cycleDuration || 'annual');
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error loading plan:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadPlan();
  }, [athleteId]);

  // Save plan
  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('train_token');
    
    try {
      await axios.post(
        `${BACKEND_URL}/api/graphic-plan`,
        {
          athlete_id: athleteId,
          generalInfo,
          planData,
          cycleDuration
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Plan gráfico guardado exitosamente');
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  // Cell click handler
  const handleCellClick = (section, rowId, weekIndex) => {
    setPlanData(prev => {
      const sectionData = { ...prev[section] };
      const key = `${rowId}_${weekIndex}`;
      
      // Toggle or cycle through values
      if (section === 'intensity' || section === 'volume') {
        const currentValue = sectionData[key] || 0;
        sectionData[key] = currentValue >= 5 ? 0 : currentValue + 1;
      } else {
        sectionData[key] = !sectionData[key];
      }
      
      return { ...prev, [section]: sectionData };
    });
  };

  // Set cycle type for a week range
  const setCycleType = (section, typeId, startWeek, endWeek) => {
    setPlanData(prev => {
      const sectionData = { ...prev[section] };
      for (let w = startWeek; w <= endWeek; w++) {
        sectionData[w] = typeId;
      }
      return { ...prev, [section]: sectionData };
    });
  };

  // Navigation handlers
  const scrollLeft = () => {
    setViewOffset(prev => Math.max(0, prev - 4));
  };
  
  const scrollRight = () => {
    setViewOffset(prev => Math.min(totalWeeks - visibleWeeks, prev + 4));
  };

  // Render intensity/volume cell
  const renderLoadCell = (section, rowId, weekIndex) => {
    const key = `${rowId}_${weekIndex}`;
    const value = planData[section]?.[key] || 0;
    const levels = ['', 'bg-blue-200', 'bg-green-300', 'bg-yellow-400', 'bg-orange-500', 'bg-red-600'];
    
    return (
      <td
        key={`${section}-${rowId}-${weekIndex}`}
        className={`w-6 h-6 border border-gray-300 cursor-pointer hover:bg-gray-100 ${levels[value]}`}
        onClick={() => handleCellClick(section, rowId, weekIndex)}
        data-testid={`cell-${section}-${rowId}-${weekIndex}`}
      />
    );
  };

  // Render boolean cell
  const renderBooleanCell = (section, rowId, weekIndex, activeColor = 'bg-blue-500') => {
    const key = `${rowId}_${weekIndex}`;
    const isActive = planData[section]?.[key];
    
    return (
      <td
        key={`${section}-${rowId}-${weekIndex}`}
        className={`w-6 h-6 border border-gray-300 cursor-pointer hover:bg-gray-100 ${isActive ? activeColor : ''}`}
        onClick={() => handleCellClick(section, rowId, weekIndex)}
        data-testid={`cell-${section}-${rowId}-${weekIndex}`}
      />
    );
  };

  // Render cycle type row
  const renderCycleRow = (section, types) => {
    return (
      <tr>
        <td className="sticky left-0 bg-gray-100 px-2 py-1 text-xs font-medium border border-gray-300 min-w-[180px]">
          {section === 'macrocycles' ? 'Macrociclo' : section === 'mesocycles' ? 'Mesociclo' : 'Microciclo'}
        </td>
        {displayedWeeks.map(week => {
          const typeId = planData[section]?.[week];
          const type = types.find(t => t.id === typeId);
          return (
            <td
              key={`${section}-${week}`}
              className={`w-6 h-6 border border-gray-300 cursor-pointer hover:opacity-80 ${type?.color || 'bg-white'}`}
              onClick={() => {
                // Cycle through types
                const currentIndex = types.findIndex(t => t.id === typeId);
                const nextIndex = (currentIndex + 1) % (types.length + 1);
                const nextType = nextIndex === types.length ? null : types[nextIndex];
                setPlanData(prev => ({
                  ...prev,
                  [section]: { ...prev[section], [week]: nextType?.id || null }
                }));
              }}
              title={type?.label || 'Click para seleccionar'}
              data-testid={`cell-${section}-${week}`}
            />
          );
        })}
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto p-4' : ''}`}>
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Plan Gráfico de Periodización
            </CardTitle>
            <div className="flex items-center gap-2">
              {periodizationData && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                  onClick={() => {
                    setHasImportedData(false);
                    importPeriodizationData(periodizationData);
                  }}
                  title="Reimportar datos de periodización"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Sincronizar
                </Button>
              )}
              {hasImportedData && (
                <span className="text-xs bg-green-400 px-2 py-1 rounded-full">
                  Datos importados
                </span>
              )}
              <Select value={cycleDuration} onValueChange={setCycleDuration}>
                <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CYCLE_DURATIONS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-1">Guardar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          {/* General Information */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Deporte</label>
                <Input
                  value={generalInfo.sport}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, sport: e.target.value })}
                  placeholder="Deporte"
                  className="h-8 text-sm"
                  data-testid="input-sport"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Categoría</label>
                <Input
                  value={generalInfo.category}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, category: e.target.value })}
                  placeholder="Categoría"
                  className="h-8 text-sm"
                  data-testid="input-category"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Atleta</label>
                <Input
                  value={generalInfo.athlete}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, athlete: e.target.value })}
                  placeholder="Atleta"
                  className="h-8 text-sm"
                  data-testid="input-athlete"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Entrenador</label>
                <Input
                  value={generalInfo.coach}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, coach: e.target.value })}
                  placeholder="Entrenador"
                  className="h-8 text-sm"
                  data-testid="input-coach"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tipo de Periodización</label>
                <Select 
                  value={generalInfo.periodizationType} 
                  onValueChange={(v) => setGeneralInfo({ ...generalInfo, periodizationType: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tradicional">Tradicional</SelectItem>
                    <SelectItem value="atr">ATR</SelectItem>
                    <SelectItem value="bloques">Por Bloques</SelectItem>
                    <SelectItem value="ondulante">Ondulante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={scrollLeft}
                disabled={viewOffset === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Semanas {viewOffset + 1} - {Math.min(viewOffset + visibleWeeks, totalWeeks)} de {totalWeeks}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={scrollRight}
                disabled={viewOffset + visibleWeeks >= totalWeeks}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Mostrar:</span>
              <Select value={visibleWeeks.toString()} onValueChange={(v) => setVisibleWeeks(parseInt(v))}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12 sem</SelectItem>
                  <SelectItem value="24">24 sem</SelectItem>
                  <SelectItem value="36">36 sem</SelectItem>
                  <SelectItem value="52">52 sem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Grid */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse text-xs">
              {/* Week Numbers Header */}
              <thead>
                <tr className="bg-gray-200">
                  <th className="sticky left-0 bg-gray-200 px-2 py-1 border border-gray-300 min-w-[180px] text-left">
                    Semana
                  </th>
                  {displayedWeeks.map(week => (
                    <th key={week} className="w-6 h-6 border border-gray-300 text-center font-medium">
                      {week}
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {/* CYCLE SECTION */}
                <tr className="bg-blue-50">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-blue-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Ciclo
                    </div>
                  </td>
                </tr>
                
                {/* Macrocycle */}
                {renderCycleRow('macrocycles', MACROCYCLE_TYPES)}
                
                {/* Macrocycle Duration */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Duración del macrociclo
                  </td>
                  {displayedWeeks.map(week => (
                    <td key={`macro-dur-${week}`} className="w-6 h-4 border border-gray-300 bg-white" />
                  ))}
                </tr>
                
                {/* Period */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Período
                  </td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.periods?.[week];
                    const colors = { preparatorio: 'bg-blue-200', competitivo: 'bg-green-200', transicion: 'bg-orange-200' };
                    return (
                      <td
                        key={`period-${week}`}
                        className={`w-6 h-6 border border-gray-300 cursor-pointer ${colors[typeId] || ''}`}
                        onClick={() => {
                          const types = ['preparatorio', 'competitivo', 'transicion', null];
                          const currentIndex = types.indexOf(typeId);
                          const nextType = types[(currentIndex + 1) % types.length];
                          setPlanData(prev => ({
                            ...prev,
                            periods: { ...prev.periods, [week]: nextType }
                          }));
                        }}
                      />
                    );
                  })}
                </tr>
                
                {/* Phase/Stage */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Fase / Etapa
                  </td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.phases?.[week];
                    const type = MACROCYCLE_TYPES.find(t => t.id === typeId);
                    return (
                      <td
                        key={`phase-${week}`}
                        className={`w-6 h-6 border border-gray-300 cursor-pointer ${type?.color || ''}`}
                        onClick={() => {
                          const currentIndex = MACROCYCLE_TYPES.findIndex(t => t.id === typeId);
                          const nextIndex = (currentIndex + 1) % (MACROCYCLE_TYPES.length + 1);
                          const nextType = nextIndex === MACROCYCLE_TYPES.length ? null : MACROCYCLE_TYPES[nextIndex];
                          setPlanData(prev => ({
                            ...prev,
                            phases: { ...prev.phases, [week]: nextType?.id || null }
                          }));
                        }}
                      />
                    );
                  })}
                </tr>
                
                {/* Mesocycle */}
                {renderCycleRow('mesocycles', MESOCYCLE_TYPES)}
                
                {/* Month indicator */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Mes
                  </td>
                  {displayedWeeks.map(week => (
                    <td key={`month-${week}`} className="w-6 h-4 border border-gray-300 text-center text-[10px]">
                      {Math.ceil(week / 4)}
                    </td>
                  ))}
                </tr>
                
                {/* Microcycle */}
                {renderCycleRow('microcycles', MICROCYCLE_TYPES)}
                
                {/* Microcycle type and duration */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Tipo de microciclo
                  </td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.microcycles?.[week];
                    const type = MICROCYCLE_TYPES.find(t => t.id === typeId);
                    return (
                      <td key={`micro-type-${week}`} className="w-6 h-4 border border-gray-300 text-center text-[8px]">
                        {type?.label?.substring(0, 3) || ''}
                      </td>
                    );
                  })}
                </tr>

                {/* LOAD MAGNITUDE SECTION */}
                <tr className="bg-gray-300">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold border border-gray-400">
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      Magnitud de la carga
                    </div>
                  </td>
                </tr>
                
                {/* Intensity levels */}
                {INTENSITY_LEVELS.map((level, idx) => (
                  <tr key={level.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      <div className="flex items-center justify-between">
                        <span>{level.label}</span>
                        <span className="text-gray-400">{level.range}</span>
                      </div>
                    </td>
                    {displayedWeeks.map(week => renderLoadCell('intensity', level.id, week))}
                  </tr>
                ))}
                
                {/* Training frequency */}
                <tr>
                  <td className="sticky left-0 bg-gray-100 px-2 py-1 text-xs font-medium border border-gray-300">
                    Frecuencia de entrenamiento
                  </td>
                  {displayedWeeks.map(week => (
                    <td key={`freq-${week}`} className="w-6 h-6 border border-gray-300">
                      <input
                        type="text"
                        className="w-full h-full text-center text-xs border-0 bg-transparent"
                        maxLength={1}
                        value={planData.frequency?.[week] || ''}
                        onChange={(e) => {
                          setPlanData(prev => ({
                            ...prev,
                            frequency: { ...prev.frequency, [week]: e.target.value }
                          }));
                        }}
                      />
                    </td>
                  ))}
                </tr>

                {/* PREPARATION SECTION */}
                <tr className="bg-green-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-green-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Dumbbell className="w-4 h-4" />
                      Preparación
                    </div>
                  </td>
                </tr>
                
                {PREPARATION_TYPES.map(prep => (
                  <tr key={prep.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      {prep.label}
                    </td>
                    {displayedWeeks.map(week => renderLoadCell('preparation', prep.id, week))}
                  </tr>
                ))}

                {/* PHYSICAL PREPARATION SECTION */}
                <tr className="bg-orange-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-orange-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      Preparación física
                    </div>
                  </td>
                </tr>
                
                {PHYSICAL_COMPONENTS.map(comp => (
                  <tr key={comp.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      {comp.label}
                    </td>
                    {displayedWeeks.map(week => renderLoadCell('physical', comp.id, week))}
                  </tr>
                ))}

                {/* ACTIVITY SECTION */}
                <tr className="bg-purple-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-purple-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      Actividad
                    </div>
                  </td>
                </tr>
                
                {ACTIVITY_TYPES.map(activity => (
                  <tr key={activity.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      {activity.label}
                    </td>
                    {displayedWeeks.map(week => renderBooleanCell('activities', activity.id, week, activity.color))}
                  </tr>
                ))}

                {/* MONITORING SECTION */}
                <tr className="bg-cyan-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-cyan-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <ClipboardCheck className="w-4 h-4" />
                      Monitoreo / Evaluaciones
                    </div>
                  </td>
                </tr>
                
                {MONITORING_AREAS.map(area => (
                  <tr key={area.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      {area.label}
                    </td>
                    {displayedWeeks.map(week => renderBooleanCell('monitoring', area.id, week, area.color))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-sm mb-2">Leyenda</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="font-medium mb-1">Intensidad / Volumen:</p>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-200 border"></div>
                  <span>Bajo</span>
                  <div className="w-4 h-4 bg-green-300 border"></div>
                  <span>Medio-bajo</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-4 h-4 bg-yellow-400 border"></div>
                  <span>Medio</span>
                  <div className="w-4 h-4 bg-orange-500 border"></div>
                  <span>Alto</span>
                  <div className="w-4 h-4 bg-red-600 border"></div>
                  <span>Máximo</span>
                </div>
              </div>
              <div>
                <p className="font-medium mb-1">Macrociclo:</p>
                <div className="flex flex-wrap gap-1">
                  {MACROCYCLE_TYPES.map(t => (
                    <div key={t.id} className={`px-1 ${t.color} text-[10px] rounded`}>{t.label}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium mb-1">Mesociclo:</p>
                <div className="flex flex-wrap gap-1">
                  {MESOCYCLE_TYPES.map(t => (
                    <div key={t.id} className={`px-1 ${t.color} text-[10px] rounded`}>{t.label}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium mb-1">Microciclo:</p>
                <div className="flex flex-wrap gap-1">
                  {MICROCYCLE_TYPES.map(t => (
                    <div key={t.id} className={`px-1 ${t.color} text-[10px] rounded`}>{t.label}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GraphicPlan;

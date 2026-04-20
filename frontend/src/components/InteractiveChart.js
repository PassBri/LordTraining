import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart, Brush, Scatter,
  ReferenceLine, ReferenceArea
} from 'recharts';
import { 
  BarChart3, TrendingUp, Activity, Layers, Settings2, 
  ZoomIn, ZoomOut, RotateCcw, Maximize2, X, MousePointer2
} from 'lucide-react';

// Colores predefinidos para las series
const SERIES_COLORS = {
  volumen: '#3B82F6',
  intensidad: '#EF4444',
  densidad: '#10B981',
  recuperacion: '#8B5CF6',
  carga: '#F59E0B',
  fatiga: '#EC4899',
  objetivo: '#6366F1'
};

// Configuración de gradientes para gráficos de área
const GRADIENTS = {
  volumen: { start: '#3B82F6', end: '#3B82F640' },
  intensidad: { start: '#EF4444', end: '#EF444440' },
  densidad: { start: '#10B981', end: '#10B98140' },
  recuperacion: { start: '#8B5CF6', end: '#8B5CF640' },
  carga: { start: '#F59E0B', end: '#F59E0B40' },
  fatiga: { start: '#EC4899', end: '#EC489940' }
};

// Rangos de tiempo predefinidos
const TIME_RANGES = [
  { id: 'olympic', label: 'Ciclo Olímpico', weeks: 208, shortLabel: '4A' },
  { id: '2years', label: '2 Años', weeks: 104, shortLabel: '2A' },
  { id: '1year', label: '1 Año', weeks: 52, shortLabel: '1A' },
  { id: '6months', label: '6 Meses', weeks: 26, shortLabel: '6M' },
  { id: '3months', label: '3 Meses', weeks: 13, shortLabel: '3M' },
  { id: '1month', label: '1 Mes', weeks: 4, shortLabel: '1M' },
  { id: 'sessions', label: 'Sesiones', weeks: 12, shortLabel: 'S' }
];

// Tipos de visualización
const CHART_TYPES = [
  { id: 'bar', label: 'Barras', icon: BarChart3 },
  { id: 'line', label: 'Líneas', icon: TrendingUp },
  { id: 'area', label: 'Área', icon: Layers },
  { id: 'scatter', label: 'Puntos', icon: Activity },
  { id: 'mixed', label: 'Mixta', icon: Settings2 }
];

// Rangos rápidos para navegación tipo trading
const QUICK_RANGES = [
  { id: 'last4', label: 'Últ. 4', count: 4 },
  { id: 'last8', label: 'Últ. 8', count: 8 },
  { id: 'all', label: 'Todo', count: -1 }
];

const InteractiveChart = ({
  title,
  icon: IconComponent,
  data = [],
  dataKeys = [],
  xAxisKey = 'semana',
  height = 320,
  showBrush = true,
  showControls = true,
  showTimeRange = true,
  showLiveIndicator = false,
  defaultChartType = 'bar',
  defaultTimeRange = 'sessions',
  yAxisDomain = [0, 100],
  referenceLines = [],
  referenceAreas = [],
  extraControls = null,
  className = ''
}) => {
  const [chartType, setChartType] = useState(defaultChartType);
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [brushRange, setBrushRange] = useState({ startIndex: 0, endIndex: 11 });
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Estados para funciones trading avanzadas
  const [crosshairData, setCrosshairData] = useState(null);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const chartContainerRef = useRef(null);

  // Filtrar datos según el rango de tiempo seleccionado
  const filteredData = useMemo(() => {
    const range = TIME_RANGES.find(r => r.id === timeRange);
    if (!range || !data.length) return data;
    const maxWeeks = Math.min(range.weeks, data.length);
    return data.slice(0, maxWeeks);
  }, [data, timeRange]);

  // Resetear brush range cuando cambian los datos
  React.useEffect(() => {
    if (filteredData.length > 0) {
      setBrushRange({ 
        startIndex: 0, 
        endIndex: Math.min(filteredData.length - 1, 11) 
      });
    }
  }, [filteredData.length]);

  // Manejar cambio de brush
  const handleBrushChange = useCallback((newRange) => {
    if (newRange && typeof newRange.startIndex === 'number') {
      setBrushRange(newRange);
    }
  }, []);

  // Reset zoom (doble click también activa esto)
  const handleResetZoom = useCallback(() => {
    setBrushRange({ startIndex: 0, endIndex: filteredData.length - 1 });
  }, [filteredData.length]);

  // Zoom in
  const handleZoomIn = useCallback(() => {
    const currentRange = brushRange.endIndex - brushRange.startIndex;
    const newRange = Math.max(2, Math.floor(currentRange * 0.6));
    const center = Math.floor((brushRange.startIndex + brushRange.endIndex) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(filteredData.length - 1, newStart + newRange);
    setBrushRange({ startIndex: newStart, endIndex: newEnd });
  }, [brushRange, filteredData.length]);

  // Zoom out
  const handleZoomOut = useCallback(() => {
    const currentRange = brushRange.endIndex - brushRange.startIndex;
    const newRange = Math.min(filteredData.length - 1, Math.floor(currentRange * 1.5));
    const center = Math.floor((brushRange.startIndex + brushRange.endIndex) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(filteredData.length - 1, newStart + newRange);
    setBrushRange({ startIndex: newStart, endIndex: newEnd });
  }, [brushRange, filteredData.length]);

  // Zoom con scroll del mouse
  const handleWheel = useCallback((e) => {
    if (!e.shiftKey) return; // Solo zoom si se presiona Shift
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  // Rango rápido
  const handleQuickRange = useCallback((count) => {
    if (count === -1) {
      // Ver todo
      setBrushRange({ startIndex: 0, endIndex: filteredData.length - 1 });
    } else {
      // Últimos N elementos
      const start = Math.max(0, filteredData.length - count);
      setBrushRange({ startIndex: start, endIndex: filteredData.length - 1 });
    }
  }, [filteredData.length]);

  // Manejar movimiento del mouse para crosshair
  const handleMouseMove = useCallback((state) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      setCrosshairData({
        x: state.activeLabel,
        values: state.activePayload
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCrosshairData(null);
  }, []);

  // Custom Tooltip con estilo trading
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl p-3 min-w-[180px]">
        <p className="text-sm font-bold text-white mb-2 pb-2 border-b border-slate-700">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-300">{entry.name}</span>
              </div>
              <span className="font-mono font-bold" style={{ color: entry.color }}>
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderizar el gráfico según el tipo seleccionado
  const renderChart = (isFullscreenMode = false) => {
    const chartHeight = isFullscreenMode ? '100%' : height;
    const commonProps = {
      data: filteredData,
      margin: { top: 20, right: 30, left: 10, bottom: showBrush ? 5 : 20 },
      onMouseMove: showCrosshair ? handleMouseMove : undefined,
      onMouseLeave: showCrosshair ? handleMouseLeave : undefined
    };

    const axisProps = {
      xAxis: <XAxis 
        dataKey={xAxisKey} 
        tick={{ fontSize: 11, fill: isFullscreenMode ? '#9CA3AF' : '#6B7280' }} 
        stroke={isFullscreenMode ? '#374151' : '#E5E7EB'}
        tickLine={false}
      />,
      yAxis: <YAxis 
        tick={{ fontSize: 11, fill: isFullscreenMode ? '#9CA3AF' : '#6B7280' }} 
        stroke={isFullscreenMode ? '#374151' : '#E5E7EB'}
        domain={yAxisDomain}
        tickLine={false}
        axisLine={false}
      />,
      grid: <CartesianGrid 
        strokeDasharray="3 3" 
        stroke={isFullscreenMode ? '#374151' : '#E5E7EB'} 
        vertical={false} 
      />,
      tooltip: <Tooltip 
        content={<CustomTooltip />} 
        cursor={{ 
          stroke: isFullscreenMode ? '#60A5FA' : '#3B82F6', 
          strokeWidth: 1, 
          strokeDasharray: '4 4' 
        }}
      />,
      legend: <Legend 
        wrapperStyle={{ 
          fontSize: '12px', 
          paddingTop: '10px',
          color: isFullscreenMode ? '#D1D5DB' : undefined
        }}
        iconType="circle"
      />,
      brush: showBrush && filteredData.length > 4 ? (
        <Brush 
          dataKey={xAxisKey} 
          height={40} 
          stroke="#3B82F6"
          fill={isFullscreenMode ? '#1F2937' : '#EFF6FF'}
          startIndex={brushRange.startIndex}
          endIndex={brushRange.endIndex}
          onChange={handleBrushChange}
          travellerWidth={10}
          tickFormatter={(value) => value}
        >
          {/* Mini gráfico en el brush */}
          <AreaChart data={filteredData}>
            <Area 
              type="monotone" 
              dataKey={dataKeys[0]?.key || 'value'} 
              stroke="#3B82F680"
              fill="#3B82F620"
              strokeWidth={1}
            />
          </AreaChart>
        </Brush>
      ) : null
    };

    // Definir gradientes
    const gradientDefs = (
      <defs>
        {dataKeys.map(dk => {
          const gradientKey = dk.key.toLowerCase();
          const gradient = GRADIENTS[gradientKey] || { 
            start: dk.color || SERIES_COLORS[gradientKey] || '#3B82F6', 
            end: (dk.color || SERIES_COLORS[gradientKey] || '#3B82F6') + '40' 
          };
          return (
            <linearGradient key={dk.key} id={`gradient-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradient.start} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={gradient.end} stopOpacity={0}/>
            </linearGradient>
          );
        })}
      </defs>
    );

    // Renderizar áreas de referencia
    const renderReferenceAreas = () => referenceAreas.map((area, idx) => (
      <ReferenceArea
        key={`area-${idx}`}
        y1={area.y1}
        y2={area.y2}
        fill={area.color}
        fillOpacity={area.fillOpacity || 0.15}
        label={{ 
          value: area.label, 
          fill: area.color, 
          fontSize: 10, 
          position: 'insideTopRight' 
        }}
      />
    ));

    // Renderizar líneas de referencia
    const renderReferenceLines = () => referenceLines.map((ref, idx) => (
      <ReferenceLine 
        key={`line-${idx}`} 
        y={ref.y} 
        stroke={ref.color} 
        strokeDasharray="5 5" 
        label={{ value: ref.label, fill: ref.color, fontSize: 10 }} 
      />
    ));

    // Crosshair vertical (línea que sigue el cursor)
    const renderCrosshair = () => {
      if (!showCrosshair || !crosshairData) return null;
      return (
        <ReferenceLine
          x={crosshairData.x}
          stroke="#60A5FA"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      );
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps} barGap={2}>
            {renderReferenceAreas()}
            {axisProps.grid}
            {axisProps.xAxis}
            {axisProps.yAxis}
            {axisProps.tooltip}
            {axisProps.legend}
            {dataKeys.map(dk => (
              <Bar 
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                fill={dk.color || SERIES_COLORS[dk.key.toLowerCase()] || '#3B82F6'}
                radius={[4, 4, 0, 0]}
              />
            ))}
            {renderReferenceLines()}
            {renderCrosshair()}
            {axisProps.brush}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {renderReferenceAreas()}
            {axisProps.grid}
            {axisProps.xAxis}
            {axisProps.yAxis}
            {axisProps.tooltip}
            {axisProps.legend}
            {dataKeys.map(dk => (
              <Line 
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color || SERIES_COLORS[dk.key.toLowerCase()] || '#3B82F6'}
                strokeWidth={2}
                dot={{ r: 4, fill: dk.color || SERIES_COLORS[dk.key.toLowerCase()] || '#3B82F6' }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              />
            ))}
            {renderReferenceLines()}
            {renderCrosshair()}
            {axisProps.brush}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gradientDefs}
            {renderReferenceAreas()}
            {axisProps.grid}
            {axisProps.xAxis}
            {axisProps.yAxis}
            {axisProps.tooltip}
            {axisProps.legend}
            {dataKeys.map(dk => (
              <Area 
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color || SERIES_COLORS[dk.key.toLowerCase()] || '#3B82F6'}
                fill={`url(#gradient-${dk.key})`}
                strokeWidth={2}
              />
            ))}
            {renderReferenceLines()}
            {renderCrosshair()}
            {axisProps.brush}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ComposedChart {...commonProps}>
            {renderReferenceAreas()}
            {axisProps.grid}
            {axisProps.xAxis}
            {axisProps.yAxis}
            {axisProps.tooltip}
            {axisProps.legend}
            {dataKeys.map(dk => (
              <Scatter 
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                fill={dk.color || SERIES_COLORS[dk.key.toLowerCase()] || '#3B82F6'}
              />
            ))}
            {renderReferenceLines()}
            {renderCrosshair()}
            {axisProps.brush}
          </ComposedChart>
        );

      case 'mixed':
      default:
        return (
          <ComposedChart {...commonProps}>
            {gradientDefs}
            {renderReferenceAreas()}
            {axisProps.grid}
            {axisProps.xAxis}
            {axisProps.yAxis}
            {axisProps.tooltip}
            {axisProps.legend}
            {dataKeys.map((dk, idx) => {
              if (idx < 2) {
                return (
                  <Bar 
                    key={dk.key}
                    dataKey={dk.key}
                    name={dk.name}
                    fill={dk.color || SERIES_COLORS[dk.key.toLowerCase()] || '#3B82F6'}
                    radius={[4, 4, 0, 0]}
                    opacity={idx === 1 ? 0.8 : 1}
                  />
                );
              }
              return (
                <Line 
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.name}
                  stroke={dk.color || SERIES_COLORS[dk.key.toLowerCase()] || '#3B82F6'}
                  strokeWidth={3}
                  dot={{ r: 4, fill: dk.color || SERIES_COLORS[dk.key.toLowerCase()] || '#3B82F6' }}
                />
              );
            })}
            {renderReferenceLines()}
            {renderCrosshair()}
            {axisProps.brush}
          </ComposedChart>
        );
    }
  };

  // Componente de controles de trading
  const TradingControls = ({ isFullscreenMode = false }) => (
    <div className={`flex items-center gap-2 ${isFullscreenMode ? 'flex-wrap' : ''}`}>
      {/* Botones de rango rápido */}
      <div className={`flex ${isFullscreenMode ? 'bg-slate-700/50' : 'bg-slate-100'} rounded-lg p-0.5`}>
        {QUICK_RANGES.map(range => (
          <button
            key={range.id}
            onClick={() => handleQuickRange(range.count)}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
              isFullscreenMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-600'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white'
            }`}
            title={range.label}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Separador */}
      <div className={`w-px h-5 ${isFullscreenMode ? 'bg-slate-600' : 'bg-slate-200'}`} />

      {/* Toggle crosshair */}
      <Button 
        variant="ghost" 
        size="sm" 
        className={`h-8 w-8 p-0 ${
          showCrosshair 
            ? (isFullscreenMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')
            : (isFullscreenMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700')
        }`}
        onClick={() => setShowCrosshair(!showCrosshair)}
        title="Crosshair"
      >
        <MousePointer2 className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <Card 
      className={`shadow-lg border-0 bg-white overflow-hidden ${className}`}
      ref={chartContainerRef}
      onWheel={handleWheel}
      onDoubleClick={handleResetZoom}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          {/* Título y controles principales */}
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {IconComponent && <IconComponent className="w-5 h-5 text-blue-500" />}
              {title}
              {showLiveIndicator && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">
                  En vivo
                </span>
              )}
            </CardTitle>
            
            {/* Controles de zoom */}
            {showControls && (
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                  onClick={handleZoomIn}
                  title="Acercar (Shift + Scroll)"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                  onClick={handleZoomOut}
                  title="Alejar (Shift + Scroll)"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                  onClick={handleResetZoom}
                  title="Restablecer (Doble clic)"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 w-8 p-0 ${showSettings ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setShowSettings(!showSettings)}
                  title="Configuración"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
                <div className="w-px h-5 bg-slate-200 mx-1" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => setIsFullscreen(true)}
                  title="Pantalla completa"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Panel de configuración expandible */}
          {showControls && showSettings && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Selector de rango de tiempo */}
              {showTimeRange && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Período:</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {TIME_RANGES.map(range => (
                    <button
                      key={range.id}
                      onClick={() => setTimeRange(range.id)}
                      className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                        timeRange === range.id
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title={range.label}
                    >
                      {range.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Selector de tipo de gráfico */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Vista:</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {CHART_TYPES.map(type => {
                    const TypeIcon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setChartType(type.id)}
                        className={`p-1.5 rounded-md transition-all ${
                          chartType === type.id
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                        title={type.label}
                      >
                        <TypeIcon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Controles Trading */}
              <TradingControls />

              {/* Info del rango actual */}
              <div className="ml-auto text-xs text-slate-400">
                {brushRange.endIndex - brushRange.startIndex + 1} de {filteredData.length} • Doble clic para reset
              </div>
            </div>
          )}

          {/* Controles compactos cuando el panel está cerrado */}
          {showControls && !showSettings && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mini selector de tipo de gráfico */}
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {CHART_TYPES.slice(0, 4).map(type => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id)}
                      className={`p-1 rounded transition-all ${
                        chartType === type.id
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={type.label}
                    >
                      <TypeIcon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Mini selector de tiempo */}
              {showTimeRange && (
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {TIME_RANGES.slice(0, 7).map(range => (
                  <button
                    key={range.id}
                    onClick={() => setTimeRange(range.id)}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-all ${
                      timeRange === range.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={range.label}
                  >
                    {range.shortLabel}
                  </button>
                ))}
              </div>
              )}

              {/* Botones rápidos */}
              {showTimeRange && (
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {QUICK_RANGES.map(range => (
                  <button
                    key={range.id}
                    onClick={() => handleQuickRange(range.count)}
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                    title={range.label}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              )}

              {/* Slot de controles extra (custom inputs/info desde parent) */}
              {extraControls && (
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {extraControls}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          {renderChart(false)}
        </ResponsiveContainer>
      </CardContent>

      {/* Modal de Pantalla Completa - Estilo Trading */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent 
          className="max-w-[98vw] w-[98vw] h-[95vh] p-0 bg-slate-900 border-slate-700 overflow-hidden"
          onWheel={handleWheel}
          onDoubleClick={handleResetZoom}
        >
          {/* Header del modal fullscreen */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
            <div className="flex items-center gap-4">
              {IconComponent && <IconComponent className="w-6 h-6 text-blue-400" />}
              <h2 className="text-xl font-bold text-white">{title}</h2>
              {showLiveIndicator && (
                <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
                  ● En vivo
                </span>
              )}
            </div>
            
            {/* Controles en fullscreen */}
            <div className="flex items-center gap-2">
              {/* Selector de tipo de gráfico */}
              <div className="flex bg-slate-700/50 rounded-lg p-1 mr-2">
                {CHART_TYPES.map(type => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id)}
                      className={`p-2 rounded-md transition-all ${
                        chartType === type.id
                          ? 'bg-blue-500 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-600'
                      }`}
                      title={type.label}
                    >
                      <TypeIcon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>

              {/* Selector de período */}
              <div className="flex bg-slate-700/50 rounded-lg p-1 mr-2">
                {TIME_RANGES.map(range => (
                  <button
                    key={range.id}
                    onClick={() => setTimeRange(range.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      timeRange === range.id
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-600'
                    }`}
                    title={range.label}
                  >
                    {range.shortLabel}
                  </button>
                ))}
              </div>

              {/* Botones de rango rápido */}
              <div className="flex bg-slate-700/50 rounded-lg p-1 mr-2">
                {QUICK_RANGES.map(range => (
                  <button
                    key={range.id}
                    onClick={() => handleQuickRange(range.count)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md text-slate-400 hover:text-white hover:bg-slate-600 transition-all"
                    title={range.label}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {/* Toggle Crosshair */}
              <Button 
                variant="ghost" 
                size="sm" 
                className={`h-9 w-9 p-0 ${
                  showCrosshair 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                onClick={() => setShowCrosshair(!showCrosshair)}
                title="Crosshair"
              >
                <MousePointer2 className="w-5 h-5" />
              </Button>

              <div className="w-px h-8 bg-slate-600 mx-1" />

              {/* Controles de zoom */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={handleZoomIn}
                title="Acercar (Shift + Scroll)"
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={handleZoomOut}
                title="Alejar (Shift + Scroll)"
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={handleResetZoom}
                title="Restablecer (Doble clic)"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>

              <div className="w-px h-8 bg-slate-600 mx-2" />

              {/* Botón cerrar */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 w-9 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => setIsFullscreen(false)}
                title="Cerrar (ESC)"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Área del gráfico fullscreen */}
          <div className="flex-1 p-6 bg-slate-900" style={{ height: 'calc(95vh - 140px)' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(true)}
            </ResponsiveContainer>
          </div>

          {/* Footer con info */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-3 bg-slate-800/90 backdrop-blur border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="font-mono">
                  Mostrando <span className="text-blue-400 font-bold">{brushRange.endIndex - brushRange.startIndex + 1}</span> de {filteredData.length} períodos
                </span>
                <span className="text-slate-600">|</span>
                <span>Período: <span className="text-slate-300">{TIME_RANGES.find(r => r.id === timeRange)?.label}</span></span>
                {crosshairData && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-blue-400">
                      {crosshairData.x}: {crosshairData.values.map(v => `${v.name}: ${v.value?.toFixed(1)}`).join(' • ')}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-500">
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] mr-1">Shift</kbd>
                  + Scroll = Zoom
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500">Doble clic = Reset</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500">
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">ESC</kbd>
                  = Cerrar
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InteractiveChart;

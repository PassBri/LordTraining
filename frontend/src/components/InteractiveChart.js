import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart, Brush, ScatterChart, Scatter,
  ReferenceLine, ReferenceArea
} from 'recharts';
import { 
  BarChart3, TrendingUp, Activity, Layers, Settings2, 
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, X
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

const InteractiveChart = ({
  title,
  icon: IconComponent,
  data = [],
  dataKeys = [], // Array de { key: string, name: string, color?: string }
  xAxisKey = 'semana',
  height = 320,
  showBrush = true,
  showControls = true,
  showLiveIndicator = false,
  defaultChartType = 'bar',
  defaultTimeRange = 'sessions',
  yAxisDomain = [0, 100],
  referenceLines = [], // Array de { y: number, label: string, color: string }
  referenceAreas = [], // Array de { y1: number, y2: number, label: string, color: string, fillOpacity?: number }
  className = ''
}) => {
  const [chartType, setChartType] = useState(defaultChartType);
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [brushRange, setBrushRange] = useState({ startIndex: 0, endIndex: Math.min(data.length - 1, 11) });
  const [showSettings, setShowSettings] = useState(false);

  // Filtrar datos según el rango de tiempo seleccionado
  const filteredData = useMemo(() => {
    const range = TIME_RANGES.find(r => r.id === timeRange);
    if (!range || !data.length) return data;
    
    // Limitar datos al rango seleccionado
    const maxWeeks = Math.min(range.weeks, data.length);
    return data.slice(0, maxWeeks);
  }, [data, timeRange]);

  // Manejar cambio de brush
  const handleBrushChange = (newRange) => {
    if (newRange && typeof newRange.startIndex === 'number') {
      setBrushRange(newRange);
    }
  };

  // Reset zoom
  const handleResetZoom = () => {
    setBrushRange({ startIndex: 0, endIndex: filteredData.length - 1 });
  };

  // Zoom in/out
  const handleZoomIn = () => {
    const currentRange = brushRange.endIndex - brushRange.startIndex;
    const newRange = Math.max(2, Math.floor(currentRange * 0.7));
    const center = Math.floor((brushRange.startIndex + brushRange.endIndex) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(filteredData.length - 1, newStart + newRange);
    setBrushRange({ startIndex: newStart, endIndex: newEnd });
  };

  const handleZoomOut = () => {
    const currentRange = brushRange.endIndex - brushRange.startIndex;
    const newRange = Math.min(filteredData.length - 1, Math.floor(currentRange * 1.5));
    const center = Math.floor((brushRange.startIndex + brushRange.endIndex) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(filteredData.length - 1, newStart + newRange);
    setBrushRange({ startIndex: newStart, endIndex: newEnd });
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl p-3 min-w-[160px]">
        <p className="text-sm font-semibold text-slate-700 mb-2 border-b pb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-600">{entry.name}</span>
              </div>
              <span className="font-semibold" style={{ color: entry.color }}>
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Renderizar el gráfico según el tipo seleccionado
  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 10, right: 30, left: 0, bottom: showBrush ? 5 : 20 }
    };

    const axisProps = {
      xAxis: <XAxis 
        dataKey={xAxisKey} 
        tick={{ fontSize: 11, fill: '#6B7280' }} 
        stroke="#E5E7EB"
        tickLine={false}
      />,
      yAxis: <YAxis 
        tick={{ fontSize: 11, fill: '#6B7280' }} 
        stroke="#E5E7EB"
        domain={yAxisDomain}
        tickLine={false}
        axisLine={false}
      />,
      grid: <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />,
      tooltip: <Tooltip content={<CustomTooltip />} />,
      legend: <Legend 
        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
        iconType="circle"
      />,
      brush: showBrush && filteredData.length > 6 ? (
        <Brush 
          dataKey={xAxisKey} 
          height={30} 
          stroke="#3B82F6"
          fill="#EFF6FF"
          startIndex={brushRange.startIndex}
          endIndex={brushRange.endIndex}
          onChange={handleBrushChange}
          travellerWidth={8}
        />
      ) : null
    };

    // Definir gradientes
    const gradientDefs = (
      <defs>
        {dataKeys.map(dk => {
          const gradientKey = dk.key.toLowerCase();
          const gradient = GRADIENTS[gradientKey] || { start: dk.color || SERIES_COLORS[gradientKey] || '#3B82F6', end: (dk.color || SERIES_COLORS[gradientKey] || '#3B82F6') + '40' };
          return (
            <linearGradient key={dk.key} id={`gradient-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradient.start} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={gradient.end} stopOpacity={0}/>
            </linearGradient>
          );
        })}
      </defs>
    );

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps} barGap={2}>
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
            {/* Reference Areas (zonas de fondo) */}
            {referenceAreas.map((area, idx) => (
              <ReferenceArea
                key={`area-${idx}`}
                y1={area.y1}
                y2={area.y2}
                fill={area.color}
                fillOpacity={area.fillOpacity || 0.15}
                label={{ value: area.label, fill: area.color, fontSize: 10, position: 'insideTopRight' }}
              />
            ))}
            {referenceLines.map((ref, idx) => (
              <ReferenceLine 
                key={idx} 
                y={ref.y} 
                stroke={ref.color} 
                strokeDasharray="5 5" 
                label={{ value: ref.label, fill: ref.color, fontSize: 10 }} 
              />
            ))}
            {axisProps.brush}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {/* Reference Areas (zonas de fondo) - renderizar primero */}
            {referenceAreas.map((area, idx) => (
              <ReferenceArea
                key={`area-${idx}`}
                y1={area.y1}
                y2={area.y2}
                fill={area.color}
                fillOpacity={area.fillOpacity || 0.15}
                label={{ value: area.label, fill: area.color, fontSize: 10, position: 'insideTopRight' }}
              />
            ))}
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
                activeDot={{ r: 6 }}
              />
            ))}
            {referenceLines.map((ref, idx) => (
              <ReferenceLine 
                key={idx} 
                y={ref.y} 
                stroke={ref.color} 
                strokeDasharray="5 5" 
                label={{ value: ref.label, fill: ref.color, fontSize: 10 }} 
              />
            ))}
            {axisProps.brush}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {gradientDefs}
            {/* Reference Areas (zonas de fondo) */}
            {referenceAreas.map((area, idx) => (
              <ReferenceArea
                key={`area-${idx}`}
                y1={area.y1}
                y2={area.y2}
                fill={area.color}
                fillOpacity={area.fillOpacity || 0.15}
                label={{ value: area.label, fill: area.color, fontSize: 10, position: 'insideTopRight' }}
              />
            ))}
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
            {referenceLines.map((ref, idx) => (
              <ReferenceLine 
                key={idx} 
                y={ref.y} 
                stroke={ref.color} 
                strokeDasharray="5 5" 
                label={{ value: ref.label, fill: ref.color, fontSize: 10 }} 
              />
            ))}
            {axisProps.brush}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ComposedChart {...commonProps}>
            {/* Reference Areas (zonas de fondo) */}
            {referenceAreas.map((area, idx) => (
              <ReferenceArea
                key={`area-${idx}`}
                y1={area.y1}
                y2={area.y2}
                fill={area.color}
                fillOpacity={area.fillOpacity || 0.15}
                label={{ value: area.label, fill: area.color, fontSize: 10, position: 'insideTopRight' }}
              />
            ))}
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
            {referenceLines.map((ref, idx) => (
              <ReferenceLine 
                key={idx} 
                y={ref.y} 
                stroke={ref.color} 
                strokeDasharray="5 5" 
                label={{ value: ref.label, fill: ref.color, fontSize: 10 }} 
              />
            ))}
            {axisProps.brush}
          </ComposedChart>
        );

      case 'mixed':
      default:
        // Mixto: Barras para primeros 2, línea para el resto
        return (
          <ComposedChart {...commonProps}>
            {gradientDefs}
            {/* Reference Areas (zonas de fondo) */}
            {referenceAreas.map((area, idx) => (
              <ReferenceArea
                key={`area-${idx}`}
                y1={area.y1}
                y2={area.y2}
                fill={area.color}
                fillOpacity={area.fillOpacity || 0.15}
                label={{ value: area.label, fill: area.color, fontSize: 10, position: 'insideTopRight' }}
              />
            ))}
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
            {referenceLines.map((ref, idx) => (
              <ReferenceLine 
                key={idx} 
                y={ref.y} 
                stroke={ref.color} 
                strokeDasharray="5 5" 
                label={{ value: ref.label, fill: ref.color, fontSize: 10 }} 
              />
            ))}
            {axisProps.brush}
          </ComposedChart>
        );
    }
  };

  return (
    <Card className={`shadow-lg border-0 bg-white overflow-hidden ${className}`}>
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
                  title="Acercar"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                  onClick={handleZoomOut}
                  title="Alejar"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700"
                  onClick={handleResetZoom}
                  title="Restablecer"
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
              </div>
            )}
          </div>

          {/* Panel de configuración expandible */}
          {showControls && showSettings && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Selector de rango de tiempo */}
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

              {/* Info del rango actual */}
              <div className="ml-auto text-xs text-slate-400">
                Mostrando {brushRange.endIndex - brushRange.startIndex + 1} de {filteredData.length} semanas
              </div>
            </div>
          )}

          {/* Controles compactos cuando el panel está cerrado */}
          {showControls && !showSettings && (
            <div className="flex items-center gap-2">
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
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {TIME_RANGES.slice(2, 6).map(range => (
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
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default InteractiveChart;

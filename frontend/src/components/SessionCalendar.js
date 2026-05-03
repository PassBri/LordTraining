import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, X, Activity, Clock, Target, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import usePlanStore from '../stores/planStore';
import { toast } from 'sonner';

// Capacity → color map (Material 3)
const CAP_COLORS = {
  fuerza: '#F97316',
  resistencia: '#EF4444',
  velocidad: '#EAB308',
  flexibilidad: '#3B82F6',
  coordinacion: '#10B981',
  tecnica: '#8B5CF6',
  tactica: '#EC4899',
  recuperacion: '#06B6D4',
  default: '#64748B',
};

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sessionColor = (sesion) => {
  const cap = (sesion?.capacidad_principal || sesion?.capacidad || '').toLowerCase();
  for (const k of Object.keys(CAP_COLORS)) {
    if (cap.includes(k)) return CAP_COLORS[k];
  }
  return CAP_COLORS.default;
};

const SessionCalendar = ({ activePlan }) => {
  const { plan, sesiones, microciclos, cargarPlanCompleto, actualizarSesion, loading } = usePlanStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [draggedSession, setDraggedSession] = useState(null);
  const [hoveringDay, setHoveringDay] = useState(null);
  const [acting, setActing] = useState(false);

  // Touch swipe support
  const touchStartX = useRef(null);
  const containerRef = useRef(null);

  // Load plan if active and not loaded
  useEffect(() => {
    if (activePlan?.id && plan?.id !== activePlan.id) {
      cargarPlanCompleto(activePlan.id);
    }
  }, [activePlan?.id, plan?.id, cargarPlanCompleto]);

  // Build map: date(YYYY-MM-DD) → [sessions]
  const sessionsByDay = useMemo(() => {
    const map = {};
    (sesiones || []).forEach(s => {
      if (!s.fecha) return;
      const key = s.fecha.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [sesiones]);

  // Build calendar grid for current month (Monday-first)
  const grid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6

    const cells = [];
    // Prev month tail
    for (let i = startWeekday; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      cells.push({ date: d, isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    // Next month head to fill 6 rows = 42 cells
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), isCurrentMonth: false });
    }
    return cells;
  }, [currentMonth]);

  const today = useMemo(() => {
    const t = new Date();
    return ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate()));
  }, []);

  const goPrev = useCallback(() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)), []);
  const goNext = useCallback(() => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)), []);
  const goToday = useCallback(() => setCurrentMonth(new Date()), []);

  // Touch swipe handlers
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 60) (dx < 0 ? goNext : goPrev)();
    touchStartX.current = null;
  };

  // Drag-and-drop handlers
  const handleDragStart = (e, sesion) => {
    setDraggedSession(sesion);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', sesion.id); } catch (_) {}
  };
  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveringDay(dateStr);
  };
  const handleDragLeave = () => setHoveringDay(null);
  const handleDrop = async (e, dateStr) => {
    e.preventDefault();
    setHoveringDay(null);
    if (!draggedSession || draggedSession.fecha?.slice(0, 10) === dateStr) {
      setDraggedSession(null);
      return;
    }
    setActing(true);
    try {
      const result = await actualizarSesion(draggedSession.id, { fecha: dateStr });
      if (result) {
        toast.success(`Sesión movida al ${new Date(dateStr).toLocaleDateString('es')}`);
      } else {
        toast.error('No se pudo mover la sesión');
      }
    } catch (err) {
      toast.error('Error al mover sesión');
    } finally {
      setActing(false);
      setDraggedSession(null);
    }
  };

  if (!activePlan) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#fafaf8]">
        <div className="text-center max-w-md">
          <CalendarDays className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-700 mb-1">Sin plan activo</h3>
          <p className="text-sm text-slate-500">Selecciona un plan en el panel lateral para ver su calendario de sesiones.</p>
        </div>
      </div>
    );
  }

  if (loading && !sesiones?.length) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
      </div>
    );
  }

  const totalSessionsThisMonth = grid.filter(c => c.isCurrentMonth).reduce((acc, c) => acc + (sessionsByDay[ymd(c.date)]?.length || 0), 0);

  return (
    <div className="min-h-full bg-[#fafaf8] pb-12">
      {/* MD3 Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }} />
        <div className="relative max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/60 mb-1.5">Calendario · {activePlan.name}</p>
              <h1 className="text-[28px] font-bold text-white leading-tight">
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h1>
              <p className="text-[12px] text-white/70 mt-1">
                {totalSessionsThisMonth} sesiones programadas · arrastra para reagendar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={goPrev} variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white border border-white/20" data-testid="cal-prev-btn">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button onClick={goToday} variant="ghost" className="rounded-full h-10 px-4 bg-white text-indigo-900 hover:bg-white/90 text-[12px] font-bold tracking-wider uppercase" data-testid="cal-today-btn">
                Hoy
              </Button>
              <Button onClick={goNext} variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0 bg-white/10 hover:bg-white/20 text-white border border-white/20" data-testid="cal-next-btn">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 relative z-10">
        {/* Calendar grid card */}
        <div
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden select-none"
          data-testid="session-calendar"
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
            {DAY_NAMES.map(d => (
              <div key={d} className="px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 grid-rows-6">
            {grid.map((cell, idx) => {
              const dateStr = ymd(cell.date);
              const cellSessions = sessionsByDay[dateStr] || [];
              const isToday = dateStr === today;
              const isHovering = hoveringDay === dateStr;

              return (
                <div
                  key={idx}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateStr)}
                  onClick={() => cellSessions.length > 0 && setSelectedDay({ date: cell.date, sessions: cellSessions })}
                  className={`min-h-[112px] border-r border-b border-slate-100 p-1.5 flex flex-col gap-1 cursor-pointer transition-all duration-200 ${
                    !cell.isCurrentMonth ? 'bg-slate-50/40 opacity-40' : 'hover:bg-blue-50/30'
                  } ${isHovering && draggedSession ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : ''}`}
                  data-testid={`day-cell-${dateStr}`}
                >
                  <div className={`flex items-center justify-between text-[11px] font-semibold mb-0.5 ${
                    isToday ? 'text-blue-700' : 'text-slate-700'
                  }`}>
                    <span className={isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[11px]' : ''}>
                      {cell.date.getDate()}
                    </span>
                    {cellSessions.length > 0 && (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {cellSessions.length}
                      </span>
                    )}
                  </div>

                  {/* Session chips */}
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {cellSessions.slice(0, 3).map(s => {
                      const color = sessionColor(s);
                      return (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, s); }}
                          onClick={(e) => { e.stopPropagation(); setSelectedDay({ date: cell.date, sessions: [s] }); }}
                          className="px-1.5 py-1 rounded-md text-[10px] font-semibold leading-tight truncate cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform"
                          style={{ background: color + '20', color: color, borderLeft: `3px solid ${color}` }}
                          title={s.nombre || 'Sesión'}
                          data-testid={`session-chip-${s.id}`}
                        >
                          {s.completada && <CheckCircle2 className="inline w-2.5 h-2.5 mr-1" />}
                          {s.nombre || `Sesión ${s.orden_dia || ''}`}
                        </div>
                      );
                    })}
                    {cellSessions.length > 3 && (
                      <div className="text-[9px] text-slate-500 px-1 font-semibold">
                        +{cellSessions.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 flex-wrap text-[11px]">
          <span className="font-bold uppercase tracking-wider text-slate-500">Capacidades:</span>
          {Object.entries(CAP_COLORS).filter(([k]) => k !== 'default').map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border border-slate-200">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              <span className="capitalize text-slate-600">{k}</span>
            </span>
          ))}
          {acting && <span className="text-slate-400 ml-2 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Reagendando…</span>}
        </div>

        <p className="mt-4 text-[11px] text-slate-400 text-center">
          💡 Arrastra una sesión a otro día para reagendarla · Click en el día para ver detalles
        </p>
      </div>

      {/* Day detail dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="max-w-md" data-testid="day-detail-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              {selectedDay && selectedDay.date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedDay?.sessions.map(s => {
              const color = sessionColor(s);
              const micro = microciclos.find(m => m.id === s.microciclo_id);
              return (
                <div key={s.id} className="rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{s.nombre || `Sesión ${s.orden_dia || ''}`}</h4>
                    {s.completada && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Realizada
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    {s.duracion_minutos > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3 h-3" /> {s.duracion_minutos} min
                      </div>
                    )}
                    {s.RPE_sesion > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Activity className="w-3 h-3" /> RPE {s.RPE_sesion}
                      </div>
                    )}
                    {s.capacidad_principal && (
                      <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                        <Target className="w-3 h-3" />
                        <span className="capitalize">{s.capacidad_principal}</span>
                      </div>
                    )}
                    {micro?.numero_semana && (
                      <div className="text-slate-400 col-span-2">Semana {micro.numero_semana}</div>
                    )}
                  </div>
                  {s.notas && <p className="mt-2 text-[12px] text-slate-600 italic leading-snug">"{s.notas}"</p>}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionCalendar;

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { getAthletes, getCalendarSessions, completeSession } from '../services/api';
import { CalendarDays, Loader2, Clock, Dumbbell, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const CalendarPage = () => {
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    fetchAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthlete) {
      fetchSessions();
    }
  }, [selectedAthlete, selectedDate]);

  const fetchAthletes = async () => {
    try {
      const response = await getAthletes();
      setAthletes(response.data);
      if (response.data.length > 0) {
        setSelectedAthlete(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching athletes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const start = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
      const end = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
      const response = await getCalendarSessions(selectedAthlete, start, end);
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      await completeSession(sessionId);
      toast.success('Sesión marcada como completada');
      fetchSessions();
    } catch (error) {
      toast.error('Error al actualizar sesión');
    }
  };

  const getSessionsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions.filter(s => s.date === dateStr);
  };

  const selectedDateSessions = getSessionsForDate(selectedDate);

  const getSessionTypeLabel = (type) => {
    const labels = {
      physical: 'Física',
      technical: 'Técnica',
      tactical: 'Táctica',
      recovery: 'Recuperación'
    };
    return labels[type] || type;
  };

  const getIntensityColor = (intensity) => {
    const colors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-amber-100 text-amber-700',
      high: 'bg-orange-100 text-orange-700',
      maximum: 'bg-red-100 text-red-700'
    };
    return colors[intensity] || 'bg-slate-100 text-slate-700';
  };

  const datesWithSessions = sessions.reduce((acc, session) => {
    acc[session.date] = true;
    return acc;
  }, {});

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              CALENDARIO
            </h1>
            <p className="text-slate-500 mt-1">Visualiza y gestiona las sesiones de entrenamiento</p>
          </div>
          <div className="w-64">
            <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
              <SelectTrigger data-testid="calendar-athlete-select">
                <SelectValue placeholder="Seleccionar atleta" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {athletes.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <CalendarDays className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                SIN ATLETAS
              </h3>
              <p className="text-slate-500">Crea atletas y planes para ver el calendario</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-7">
              <Card className="border-slate-200">
                <CardContent className="p-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={es}
                    className="w-full"
                    modifiers={{
                      hasSession: (date) => datesWithSessions[format(date, 'yyyy-MM-dd')]
                    }}
                    modifiersStyles={{
                      hasSession: {
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        borderRadius: '50%'
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sessions for selected date */}
            <div className="lg:col-span-5">
              <Card className="border-slate-200 sticky top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
                    <CalendarDays className="w-5 h-5 text-[#007AFF]" />
                    {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sessionsLoading ? (
                    <div className="py-8 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
                    </div>
                  ) : selectedDateSessions.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDateSessions.map((session) => (
                        <div 
                          key={session.id} 
                          className={`border rounded-lg p-4 transition-colors ${session.completed ? 'bg-green-50 border-green-200' : 'border-slate-200'}`}
                          data-testid={`session-${session.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-900">{getSessionTypeLabel(session.session_type)}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${getIntensityColor(session.intensity)}`}>
                                  {session.intensity}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {session.macrocycle_name} → {session.microcycle_name}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => !session.completed && handleCompleteSession(session.id)}
                              disabled={session.completed}
                              className={session.completed ? 'text-green-600' : 'text-slate-400 hover:text-green-600'}
                              data-testid={`complete-session-${session.id}`}
                            >
                              {session.completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </Button>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Dumbbell className="w-4 h-4" />
                              Carga: {session.load}
                            </span>
                          </div>

                          {session.exercises?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-xs font-medium text-slate-500 mb-2">EJERCICIOS</p>
                              <div className="flex flex-wrap gap-1">
                                {session.exercises.map((ex, idx) => (
                                  <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                    {ex.name || ex}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {session.notes && (
                            <p className="text-sm text-slate-500 mt-3 italic">
                              {session.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <CalendarDays className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500">No hay sesiones programadas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CalendarPage;

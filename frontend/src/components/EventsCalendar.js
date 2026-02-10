import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { 
  Trophy, Calendar, Target, Star, Save, Loader2, Trash2, MapPin,
  Plus, Eye, ChevronLeft, ChevronRight, Clock, Flag, Medal
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const competitionTypes = [
  { value: 'local', label: 'Local' },
  { value: 'regional', label: 'Regional' },
  { value: 'nacional', label: 'Nacional' },
  { value: 'internacional', label: 'Internacional' },
  { value: 'amistoso', label: 'Amistoso' },
  { value: 'preparatorio', label: 'Preparatorio' },
  { value: 'clasificatorio', label: 'Clasificatorio' },
  { value: 'final', label: 'Final/Campeonato' },
];

const priorityLevels = [
  { value: 'A', label: 'Prioridad A - Principal', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'B', label: 'Prioridad B - Secundaria', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'C', label: 'Prioridad C - Preparatoria', color: 'bg-green-100 text-green-700 border-green-300' },
];

const statusOptions = [
  { value: 'pending', label: 'Pendiente', color: 'bg-gray-100 text-gray-700' },
  { value: 'confirmed', label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
  { value: 'completed', label: 'Completado', color: 'bg-green-100 text-green-700' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-700' },
];

const EventsCalendar = ({ athleteId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar');
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [currentEvent, setCurrentEvent] = useState({
    name: '',
    type: '',
    priority: 'B',
    date: '',
    endDate: '',
    location: '',
    objective: '',
    expectedResult: '',
    preparationNotes: '',
    competitionFormat: '',
    opponents: '',
    status: 'pending',
    result: '',
    analysis: '',
    lessonsLearned: ''
  });

  useEffect(() => {
    loadEvents();
  }, [athleteId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/events-calendar/${athleteId || 'default'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvents(response.data?.events || []);
    } catch (error) {
      console.log('No events found');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentEvent.name || !currentEvent.date) {
      toast.error('Nombre y fecha son requeridos');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const newEvent = { ...currentEvent, id: selectedEvent?.id || Date.now().toString() };
      
      let updatedEvents;
      if (selectedEvent) {
        updatedEvents = events.map(e => e.id === selectedEvent.id ? newEvent : e);
      } else {
        updatedEvents = [...events, newEvent];
      }
      
      await axios.post(
        `${BACKEND_URL}/api/events-calendar`,
        { athlete_id: athleteId, events: updatedEvents },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEvents(updatedEvents);
      resetForm();
      toast.success(selectedEvent ? 'Evento actualizado' : 'Evento agregado');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('¿Eliminar este evento?')) return;
    
    try {
      const token = localStorage.getItem('train_token');
      const updatedEvents = events.filter(e => e.id !== eventId);
      await axios.post(
        `${BACKEND_URL}/api/events-calendar`,
        { athlete_id: athleteId, events: updatedEvents },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvents(updatedEvents);
      toast.success('Evento eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setCurrentEvent({
      name: '', type: '', priority: 'B', date: '', endDate: '', location: '',
      objective: '', expectedResult: '', preparationNotes: '', competitionFormat: '',
      opponents: '', status: 'pending', result: '', analysis: '', lessonsLearned: ''
    });
    setSelectedEvent(null);
    setShowForm(false);
  };

  const editEvent = (event) => {
    setCurrentEvent(event);
    setSelectedEvent(event);
    setShowForm(true);
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  const navigateMonth = (direction) => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + direction, 1));
  };

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const pastEvents = events
    .filter(e => new Date(e.date) < new Date())
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Calendario de Eventos y Competencias</h1>
            <p className="text-indigo-100 text-sm">Planificación y análisis de competencias deportivas</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-2" />Calendario</TabsTrigger>
          <TabsTrigger value="upcoming"><Flag className="h-4 w-4 mr-2" />Próximos</TabsTrigger>
          <TabsTrigger value="history"><Medal className="h-4 w-4 mr-2" />Historial</TabsTrigger>
        </TabsList>

        {/* CALENDARIO */}
        <TabsContent value="calendar">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="text-lg">
                  {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(selectedMonth).map((date, idx) => {
                  const dayEvents = date ? getEventsForDate(date) : [];
                  const isToday = date && date.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={idx}
                      className={`min-h-[80px] p-1 border rounded ${
                        !date ? 'bg-gray-50' : isToday ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {date && (
                        <>
                          <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                            {date.getDate()}
                          </div>
                          {dayEvents.map(event => {
                            const priority = priorityLevels.find(p => p.value === event.priority);
                            return (
                              <div
                                key={event.id}
                                onClick={() => editEvent(event)}
                                className={`text-xs p-1 mt-1 rounded cursor-pointer truncate ${priority?.color || 'bg-gray-100'}`}
                              >
                                {event.name}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRÓXIMOS EVENTOS */}
        <TabsContent value="upcoming">
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">No hay eventos próximos</Card>
            ) : (
              upcomingEvents.map(event => {
                const priority = priorityLevels.find(p => p.value === event.priority);
                const daysUntil = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <Card key={event.id} className={`border-l-4 ${priority?.color.replace('bg-', 'border-l-').replace('-100', '-500')}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-800">{event.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded ${priority?.color}`}>
                              {priority?.label.split(' - ')[0]}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{event.date}</span>
                            {event.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{event.location}</span>}
                          </div>
                          {event.objective && <p className="text-sm text-gray-600 mt-2">{event.objective}</p>}
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-indigo-600">{daysUntil}</span>
                          <p className="text-xs text-gray-500">días</p>
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="ghost" onClick={() => editEvent(event)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(event.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* HISTORIAL */}
        <TabsContent value="history">
          <div className="space-y-3">
            {pastEvents.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">No hay eventos pasados</Card>
            ) : (
              pastEvents.map(event => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800">{event.name}</h3>
                        <p className="text-sm text-gray-500">{event.date} - {event.type}</p>
                        {event.result && (
                          <p className="text-sm mt-1"><strong>Resultado:</strong> {event.result}</p>
                        )}
                        {event.analysis && (
                          <p className="text-sm text-gray-600 mt-1">{event.analysis}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => editEvent(event)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(event.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* BOTÓN AGREGAR */}
      <Button onClick={() => setShowForm(true)} className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg bg-indigo-600 hover:bg-indigo-700">
        <Plus className="h-6 w-6" />
      </Button>

      {/* FORMULARIO MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{selectedEvent ? 'Editar Evento' : 'Nuevo Evento/Competencia'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium">Nombre *</label>
                  <Input
                    value={currentEvent.name}
                    onChange={(e) => setCurrentEvent(p => ({ ...p, name: e.target.value }))}
                    placeholder="Nombre del evento"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={currentEvent.type} onValueChange={(v) => setCurrentEvent(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {competitionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Prioridad</label>
                  <Select value={currentEvent.priority} onValueChange={(v) => setCurrentEvent(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorityLevels.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha Inicio *</label>
                  <Input type="date" value={currentEvent.date} onChange={(e) => setCurrentEvent(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha Fin</label>
                  <Input type="date" value={currentEvent.endDate} onChange={(e) => setCurrentEvent(p => ({ ...p, endDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Ubicación</label>
                  <Input value={currentEvent.location} onChange={(e) => setCurrentEvent(p => ({ ...p, location: e.target.value }))} placeholder="Ciudad, País" />
                </div>
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={currentEvent.status} onValueChange={(v) => setCurrentEvent(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Objetivo</label>
                  <Textarea value={currentEvent.objective} onChange={(e) => setCurrentEvent(p => ({ ...p, objective: e.target.value }))} placeholder="Objetivo para esta competencia" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Resultado</label>
                  <Input value={currentEvent.result} onChange={(e) => setCurrentEvent(p => ({ ...p, result: e.target.value }))} placeholder="Resultado obtenido" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Análisis / Lecciones</label>
                  <Textarea value={currentEvent.analysis} onChange={(e) => setCurrentEvent(p => ({ ...p, analysis: e.target.value }))} placeholder="Análisis post-competencia" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EventsCalendar;

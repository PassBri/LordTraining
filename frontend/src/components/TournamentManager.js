import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import {
  Trophy, Plus, Calendar, MapPin, Users, Flag, Timer,
  Play, Pause, CheckCircle, Clock, Edit, Trash2, Share2,
  Download, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Target, Medal, Star, Shuffle, ListOrdered, Grid3X3,
  Brackets, FileText, Settings, Eye, Copy, ArrowRight,
  Crown, Award, Zap, TrendingUp, BarChart3, X, Search,
  Filter, SortAsc, SortDesc, MoreVertical, RefreshCw,
  CalendarDays, Globe, Lock, Unlock, UserPlus
} from 'lucide-react';

// Formatos de torneo disponibles
const TOURNAMENT_FORMATS = [
  { 
    id: 'single_elimination', 
    name: 'Eliminación Directa', 
    icon: Brackets,
    description: 'El perdedor queda eliminado inmediatamente',
    minParticipants: 4,
    recommended: [4, 8, 16, 32, 64]
  },
  { 
    id: 'double_elimination', 
    name: 'Doble Eliminación', 
    icon: Shuffle,
    description: 'Dos derrotas para ser eliminado',
    minParticipants: 4,
    recommended: [4, 8, 16, 32]
  },
  { 
    id: 'round_robin', 
    name: 'Todos contra Todos', 
    icon: Grid3X3,
    description: 'Cada participante juega contra todos',
    minParticipants: 3,
    recommended: [4, 6, 8, 10]
  },
  { 
    id: 'groups_knockout', 
    name: 'Fase de Grupos + Eliminación', 
    icon: ListOrdered,
    description: 'Grupos iniciales, luego eliminación directa',
    minParticipants: 8,
    recommended: [8, 16, 24, 32]
  },
  { 
    id: 'league', 
    name: 'Liga', 
    icon: Trophy,
    description: 'Sistema de puntos con ida y vuelta',
    minParticipants: 4,
    recommended: [6, 8, 10, 12, 18, 20]
  },
  { 
    id: 'swiss', 
    name: 'Sistema Suizo', 
    icon: Target,
    description: 'Emparejamiento por rendimiento similar',
    minParticipants: 8,
    recommended: [8, 16, 32, 64]
  }
];

// Deportes disponibles
const SPORTS = [
  { id: 'futbol', name: 'Fútbol', icon: '⚽' },
  { id: 'baloncesto', name: 'Baloncesto', icon: '🏀' },
  { id: 'voleibol', name: 'Voleibol', icon: '🏐' },
  { id: 'tenis', name: 'Tenis', icon: '🎾' },
  { id: 'padel', name: 'Pádel', icon: '🎾' },
  { id: 'natacion', name: 'Natación', icon: '🏊' },
  { id: 'atletismo', name: 'Atletismo', icon: '🏃' },
  { id: 'ciclismo', name: 'Ciclismo', icon: '🚴' },
  { id: 'boxeo', name: 'Boxeo', icon: '🥊' },
  { id: 'judo', name: 'Judo', icon: '🥋' },
  { id: 'esports', name: 'E-Sports', icon: '🎮' },
  { id: 'otro', name: 'Otro', icon: '🏆' }
];

// Categorías predefinidas
const CATEGORY_TEMPLATES = [
  { name: 'Sub-12', ageMin: 0, ageMax: 12 },
  { name: 'Sub-14', ageMin: 12, ageMax: 14 },
  { name: 'Sub-16', ageMin: 14, ageMax: 16 },
  { name: 'Sub-18', ageMin: 16, ageMax: 18 },
  { name: 'Sub-20', ageMin: 18, ageMax: 20 },
  { name: 'Absoluto', ageMin: 18, ageMax: 99 },
  { name: 'Senior', ageMin: 35, ageMax: 99 },
  { name: 'Máster', ageMin: 45, ageMax: 99 }
];

// Componente para el Bracket de Eliminación
const EliminationBracket = ({ matches, onUpdateMatch, readOnly = false }) => {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  
  const getRoundName = (round, totalRounds) => {
    const diff = totalRounds - round;
    if (diff === 0) return 'Final';
    if (diff === 1) return 'Semifinal';
    if (diff === 2) return 'Cuartos';
    return `Ronda ${round}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max p-4">
        {rounds.map((round, roundIdx) => (
          <div key={round} className="flex flex-col justify-around gap-4" style={{ minWidth: '220px' }}>
            <h4 className="text-sm font-semibold text-center text-slate-600 mb-2">
              {getRoundName(round, rounds.length)}
            </h4>
            {matches
              .filter(m => m.round === round)
              .map((match) => (
                <div 
                  key={match.id}
                  className={`bg-white border-2 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md ${
                    match.status === 'completed' ? 'border-green-200' :
                    match.status === 'in_progress' ? 'border-blue-300 border-dashed animate-pulse' :
                    'border-slate-200'
                  }`}
                >
                  {/* Match header */}
                  <div className="px-3 py-1.5 bg-slate-50 border-b flex items-center justify-between">
                    <span className="text-xs text-slate-500">Partido #{match.match_number || match.id}</span>
                    <Badge variant={match.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">
                      {match.status === 'completed' ? 'Finalizado' : 
                       match.status === 'in_progress' ? 'En juego' : 'Pendiente'}
                    </Badge>
                  </div>
                  
                  {/* Participant 1 */}
                  <div className={`flex items-center justify-between px-3 py-2 ${
                    match.winner_id === match.participant1_id ? 'bg-green-50' : ''
                  }`}>
                    <div className="flex items-center gap-2">
                      {match.winner_id === match.participant1_id && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                      <span className={`text-sm ${match.participant1_name ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                        {match.participant1_name || 'Por definir'}
                      </span>
                    </div>
                    {!readOnly && match.participant1_name && (
                      <input
                        type="number"
                        min="0"
                        className="w-12 h-7 text-center border rounded text-sm font-bold"
                        value={match.score1 ?? ''}
                        onChange={(e) => onUpdateMatch(match.id, { score1: parseInt(e.target.value) || 0 })}
                        placeholder="-"
                      />
                    )}
                    {readOnly && match.score1 !== null && (
                      <span className="text-lg font-bold text-slate-800">{match.score1}</span>
                    )}
                  </div>
                  
                  <div className="border-t border-slate-100" />
                  
                  {/* Participant 2 */}
                  <div className={`flex items-center justify-between px-3 py-2 ${
                    match.winner_id === match.participant2_id ? 'bg-green-50' : ''
                  }`}>
                    <div className="flex items-center gap-2">
                      {match.winner_id === match.participant2_id && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                      <span className={`text-sm ${match.participant2_name ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                        {match.participant2_name || 'Por definir'}
                      </span>
                    </div>
                    {!readOnly && match.participant2_name && (
                      <input
                        type="number"
                        min="0"
                        className="w-12 h-7 text-center border rounded text-sm font-bold"
                        value={match.score2 ?? ''}
                        onChange={(e) => onUpdateMatch(match.id, { score2: parseInt(e.target.value) || 0 })}
                        placeholder="-"
                      />
                    )}
                    {readOnly && match.score2 !== null && (
                      <span className="text-lg font-bold text-slate-800">{match.score2}</span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {!readOnly && match.participant1_name && match.participant2_name && match.status !== 'completed' && (
                    <div className="px-3 py-2 bg-slate-50 border-t">
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs bg-green-500 hover:bg-green-600"
                        onClick={() => {
                          if (match.score1 !== null && match.score2 !== null && match.score1 !== match.score2) {
                            onUpdateMatch(match.id, { 
                              status: 'completed',
                              winner_id: match.score1 > match.score2 ? match.participant1_id : match.participant2_id
                            });
                          } else {
                            toast.error('Ingresa marcadores válidos (sin empate)');
                          }
                        }}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Finalizar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente para Tabla de Posiciones (Liga/Round Robin)
const StandingsTable = ({ standings, sport }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-3 py-2 text-left font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">Equipo</th>
            <th className="px-3 py-2 text-center font-semibold">PJ</th>
            <th className="px-3 py-2 text-center font-semibold">G</th>
            <th className="px-3 py-2 text-center font-semibold">E</th>
            <th className="px-3 py-2 text-center font-semibold">P</th>
            <th className="px-3 py-2 text-center font-semibold">GF</th>
            <th className="px-3 py-2 text-center font-semibold">GC</th>
            <th className="px-3 py-2 text-center font-semibold">DIF</th>
            <th className="px-3 py-2 text-center font-semibold text-blue-600">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, idx) => (
            <tr 
              key={team.id} 
              className={`border-b hover:bg-slate-50 ${
                idx < 2 ? 'bg-green-50/50' : 
                idx >= standings.length - 2 ? 'bg-red-50/50' : ''
              }`}
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  {idx === 0 && <Crown className="w-4 h-4 text-amber-500" />}
                  {idx === 1 && <Medal className="w-4 h-4 text-slate-400" />}
                  {idx === 2 && <Medal className="w-4 h-4 text-amber-600" />}
                  {idx > 2 && <span className="text-slate-500">{idx + 1}</span>}
                </div>
              </td>
              <td className="px-3 py-2 font-medium">{team.name}</td>
              <td className="px-3 py-2 text-center">{team.played}</td>
              <td className="px-3 py-2 text-center text-green-600 font-medium">{team.won}</td>
              <td className="px-3 py-2 text-center text-slate-500">{team.drawn}</td>
              <td className="px-3 py-2 text-center text-red-500">{team.lost}</td>
              <td className="px-3 py-2 text-center">{team.goalsFor}</td>
              <td className="px-3 py-2 text-center">{team.goalsAgainst}</td>
              <td className="px-3 py-2 text-center">
                <span className={team.goalDiff > 0 ? 'text-green-600' : team.goalDiff < 0 ? 'text-red-500' : ''}>
                  {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <span className="font-bold text-blue-600 text-lg">{team.points}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Componente para Lista de Partidos
const MatchList = ({ matches, onUpdateMatch, groupByDate = true }) => {
  const groupedMatches = groupByDate 
    ? matches.reduce((acc, match) => {
        const date = match.scheduled_date || 'Sin fecha';
        if (!acc[date]) acc[date] = [];
        acc[date].push(match);
        return acc;
      }, {})
    : { 'Todos los partidos': matches };

  return (
    <div className="space-y-4">
      {Object.entries(groupedMatches).map(([date, dateMatches]) => (
        <div key={date}>
          {groupByDate && (
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <h4 className="text-sm font-semibold text-slate-600">{date}</h4>
              <Badge variant="outline" className="ml-auto">{dateMatches.length} partidos</Badge>
            </div>
          )}
          <div className="space-y-2">
            {dateMatches.map((match) => (
              <div 
                key={match.id}
                className={`p-3 rounded-xl border-2 transition-all ${
                  match.status === 'completed' ? 'bg-slate-50 border-green-200' :
                  match.status === 'in_progress' ? 'bg-blue-50 border-blue-300' :
                  'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-right">
                        <span className={`font-medium ${
                          match.winner_id === match.participant1_id ? 'text-green-600' : 'text-slate-700'
                        }`}>
                          {match.participant1_name || 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg min-w-[80px] justify-center">
                        <span className="font-bold text-lg">{match.score1 ?? '-'}</span>
                        <span className="text-slate-400">:</span>
                        <span className="font-bold text-lg">{match.score2 ?? '-'}</span>
                      </div>
                      <div className="flex-1">
                        <span className={`font-medium ${
                          match.winner_id === match.participant2_id ? 'text-green-600' : 'text-slate-700'
                        }`}>
                          {match.participant2_name || 'TBD'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {match.status === 'completed' ? (
                      <Badge className="bg-green-100 text-green-700">Finalizado</Badge>
                    ) : match.status === 'in_progress' ? (
                      <Badge className="bg-blue-100 text-blue-700">En juego</Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                    {match.scheduled_time && (
                      <span className="text-xs text-slate-500">{match.scheduled_time}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Wizard de Creación de Torneo - Material Design con fondo blanco
const TournamentWizard = ({ isOpen, onClose, onSave, sportsCatalog = [] }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    sportName: '',
    format: '',
    description: '',
    start_date: '',
    end_date: '',
    venue: '',
    city: '',
    country: 'España',
    is_public: true,
    registration_open: true,
    max_participants: 16,
    categories: [],
    rules: '',
    prizes: ''
  });
  const [newCategory, setNewCategory] = useState({ name: '', gender: 'mixed', maxParticipants: '' });
  const [expandedCatalog, setExpandedCatalog] = useState(null);

  const totalSteps = 4;

  const addCategory = () => {
    if (!newCategory.name) return;
    setFormData({
      ...formData,
      categories: [...formData.categories, { ...newCategory, id: Date.now() }]
    });
    setNewCategory({ name: '', gender: 'mixed', maxParticipants: '' });
  };

  const removeCategory = (id) => {
    setFormData({
      ...formData,
      categories: formData.categories.filter(c => c.id !== id)
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.sport || !formData.format) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    onSave(formData);
    onClose();
    setStep(1);
    setFormData({
      name: '', sport: '', sportName: '', format: '', description: '',
      start_date: '', end_date: '', venue: '', city: '', country: 'España',
      is_public: true, registration_open: true, max_participants: 16,
      categories: [], rules: '', prizes: ''
    });
  };

  const selectedFormat = TOURNAMENT_FORMATS.find(f => f.id === formData.format);

  // Seleccionar un deporte del catálogo
  const handleSelectSport = (sport, category) => {
    setFormData({ 
      ...formData, 
      sport: sport.id || sport.name,
      sportName: sport.name,
      sportCategory: category.name,
      sportColor: category.color
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 bg-white rounded-2xl shadow-2xl">
        {/* Material Design Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              Crear Nuevo Torneo
            </DialogTitle>
            <p className="text-white/80 text-sm mt-1">Configura tu campeonato paso a paso</p>
          </DialogHeader>
        </div>

        {/* Progress Steps - Material Design */}
        <div className="px-6 py-4 bg-slate-50 border-b">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Información', icon: FileText },
              { num: 2, label: 'Formato', icon: Brackets },
              { num: 3, label: 'Categorías', icon: Trophy },
              { num: 4, label: 'Detalles', icon: Settings }
            ].map((s, idx) => {
              const StepIcon = s.icon;
              return (
                <div key={s.num} className="flex items-center">
                  <div className={`flex flex-col items-center ${idx > 0 ? 'ml-4' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                      s.num < step ? 'bg-green-500 text-white' :
                      s.num === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                      'bg-white text-slate-400 border-2 border-slate-200'
                    }`}>
                      {s.num < step ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1.5 font-medium ${
                      s.num === step ? 'text-blue-600' : 'text-slate-500'
                    }`}>{s.label}</span>
                  </div>
                  {idx < 3 && (
                    <div className={`w-16 h-1 mx-2 rounded-full mt-[-18px] ${
                      s.num < step ? 'bg-green-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)] bg-white">
          {/* Step 1: Info básica con selector de deportes del catálogo */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <Label className="text-sm font-semibold text-slate-700">Nombre del Torneo *</Label>
                <Input
                  placeholder="Ej: Copa Primavera 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 h-12 text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <Label className="text-sm font-semibold text-slate-700">Deporte *</Label>
                <p className="text-xs text-slate-500 mt-1 mb-3">Selecciona del catálogo de deportes configurado</p>
                
                {sportsCatalog.length > 0 ? (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto border rounded-xl p-2 bg-slate-50">
                    {sportsCatalog.map((category) => (
                      <div key={category.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        {/* Category header */}
                        <button
                          onClick={() => setExpandedCatalog(expandedCatalog === category.id ? null : category.id)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-sm"
                              style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}dd)` }}
                            >
                              {category.icon}
                            </div>
                            <div className="text-left">
                              <span className="font-semibold text-slate-800">{category.name}</span>
                              <span className="text-xs text-slate-500 ml-2">({category.sports?.length || 0} deportes)</span>
                            </div>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${
                            expandedCatalog === category.id ? 'rotate-180' : ''
                          }`} />
                        </button>
                        
                        {/* Sports list */}
                        {expandedCatalog === category.id && category.sports?.length > 0 && (
                          <div className="px-4 pb-3 pt-1 border-t bg-slate-50/50">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {category.sports.map((sport) => (
                                <button
                                  key={sport.id}
                                  onClick={() => handleSelectSport(sport, category)}
                                  className={`p-3 rounded-lg text-left transition-all ${
                                    formData.sport === (sport.id || sport.name)
                                      ? 'bg-blue-500 text-white shadow-md'
                                      : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className={`w-2.5 h-2.5 rounded-full ${
                                        formData.sport === (sport.id || sport.name) ? 'bg-white' : ''
                                      }`}
                                      style={{ backgroundColor: formData.sport === (sport.id || sport.name) ? 'white' : category.color }}
                                    />
                                    <span className="text-sm font-medium truncate">{sport.name}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {SPORTS.map((sport) => (
                      <button
                        key={sport.id}
                        onClick={() => setFormData({ ...formData, sport: sport.id, sportName: sport.name })}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          formData.sport === sport.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl">{sport.icon}</span>
                        <p className="text-xs mt-1 font-medium text-slate-700">{sport.name}</p>
                      </button>
                    ))}
                  </div>
                )}

                {formData.sport && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-blue-700">
                      Deporte seleccionado: <strong>{formData.sportName || formData.sport}</strong>
                      {formData.sportCategory && <span className="text-blue-500"> ({formData.sportCategory})</span>}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-700">Descripción</Label>
                <textarea
                  placeholder="Describe tu torneo..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-2 p-3 border border-slate-200 rounded-xl text-sm resize-none h-20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Formato - Material Design */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <Label className="text-sm font-semibold text-slate-700">Formato del Torneo *</Label>
                <p className="text-xs text-slate-500 mt-1 mb-3">Elige cómo se desarrollará la competencia</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TOURNAMENT_FORMATS.map((format) => {
                  const FormatIcon = format.icon;
                  return (
                    <button
                      key={format.id}
                      onClick={() => setFormData({ ...formData, format: format.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.format === format.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-slate-200 hover:border-blue-200 hover:shadow-sm bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.format === format.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <FormatIcon className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-800">{format.name}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{format.description}</p>
                    </button>
                  );
                })}
              </div>

              {selectedFormat && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-amber-800">Participantes recomendados</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFormat.recommended.map((num) => (
                      <button
                        key={num}
                        onClick={() => setFormData({ ...formData, max_participants: num })}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          formData.max_participants === num
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Fecha de Inicio</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Fecha de Fin</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Categorías */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Categorías del Torneo</Label>
                <span className="text-xs text-slate-500">{formData.categories.length} categorías</span>
              </div>

              {/* Quick add templates */}
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TEMPLATES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      if (!formData.categories.find(c => c.name === cat.name)) {
                        setFormData({
                          ...formData,
                          categories: [...formData.categories, { ...cat, id: Date.now(), gender: 'mixed' }]
                        });
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-full transition-all"
                  >
                    + {cat.name}
                  </button>
                ))}
              </div>

              {/* Categories list */}
              {formData.categories.length > 0 && (
                <div className="space-y-2">
                  {formData.categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span className="font-medium">{cat.name}</span>
                        <Badge variant="outline">{cat.gender === 'male' ? 'Masculino' : cat.gender === 'female' ? 'Femenino' : 'Mixto'}</Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeCategory(cat.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add custom category */}
              <div className="p-4 border-2 border-dashed rounded-xl">
                <p className="text-sm font-medium mb-3">Agregar categoría personalizada</p>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Nombre"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  />
                  <Select value={newCategory.gender} onValueChange={(v) => setNewCategory({ ...newCategory, gender: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixto</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addCategory}>
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Detalles finales */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Sede / Lugar</Label>
                  <Input
                    placeholder="Polideportivo Municipal"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Ciudad</Label>
                  <Input
                    placeholder="Madrid"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Reglas y Normativa</Label>
                <textarea
                  placeholder="Describe las reglas del torneo..."
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full mt-1 p-3 border rounded-lg text-sm resize-none h-24"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Premios</Label>
                <textarea
                  placeholder="Describe los premios..."
                  value={formData.prizes}
                  onChange={(e) => setFormData({ ...formData, prizes: e.target.value })}
                  className="w-full mt-1 p-3 border rounded-lg text-sm resize-none h-20"
                />
              </div>

              <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  />
                  <div className="flex items-center gap-1">
                    {formData.is_public ? <Globe className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-slate-400" />}
                    <Label className="text-sm">Torneo público</Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formData.registration_open}
                    onCheckedChange={(checked) => setFormData({ ...formData, registration_open: checked })}
                  />
                  <div className="flex items-center gap-1">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    <Label className="text-sm">Inscripciones abiertas</Label>
                  </div>
                </div>
              </div>

              {/* Preview - Material Design */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 shadow-inner">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-500" />
                  Vista previa del torneo
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-slate-500 text-xs">Nombre</span>
                    <p className="font-medium text-slate-800">{formData.name || '-'}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-slate-500 text-xs">Deporte</span>
                    <p className="font-medium text-slate-800">{formData.sportName || formData.sport || '-'}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-slate-500 text-xs">Formato</span>
                    <p className="font-medium text-slate-800">{TOURNAMENT_FORMATS.find(f => f.id === formData.format)?.name || '-'}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-slate-500 text-xs">Participantes</span>
                    <p className="font-medium text-slate-800">{formData.max_participants}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-slate-500 text-xs">Categorías</span>
                    <p className="font-medium text-slate-800">{formData.categories.length}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg">
                    <span className="text-slate-500 text-xs">Ubicación</span>
                    <p className="font-medium text-slate-800">{formData.city || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Material Design */}
        <div className="px-6 py-4 bg-slate-50 border-t flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="h-11 px-5"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </Button>
          {step < totalSteps ? (
            <Button 
              onClick={() => setStep(step + 1)}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
              className="h-11 px-6 bg-gradient-to-r from-orange-500 to-red-500 shadow-lg hover:shadow-xl" 
              onClick={handleSave}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Crear Torneo
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente Principal de Gestión de Torneos
const TournamentManager = ({ 
  tournaments = [], 
  sportsCatalog = [],
  onCreateTournament,
  onUpdateTournament,
  onDeleteTournament,
  onGenerateFixtures,
  onUpdateMatch
}) => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Obtener todos los deportes del catálogo
  const allSportsFromCatalog = sportsCatalog.flatMap(cat => 
    (cat.sports || []).map(sport => ({
      ...sport,
      categoryName: cat.name,
      categoryColor: cat.color,
      categoryIcon: cat.icon
    }))
  );

  // Generar fixtures de ejemplo
  const generateExampleMatches = useCallback((tournament) => {
    if (!tournament.categories?.length) return [];
    
    const matches = [];
    tournament.categories.forEach((cat, catIdx) => {
      // Generar partidos de ejemplo según el formato
      const numRounds = Math.ceil(Math.log2(tournament.max_participants || 8));
      for (let round = 1; round <= numRounds; round++) {
        const matchesInRound = Math.pow(2, numRounds - round);
        for (let m = 0; m < matchesInRound; m++) {
          matches.push({
            id: `${catIdx}-${round}-${m}`,
            category_id: cat.id,
            round,
            match_number: m + 1,
            participant1_id: round === 1 ? `team-${m * 2}` : null,
            participant1_name: round === 1 ? `Equipo ${m * 2 + 1}` : null,
            participant2_id: round === 1 ? `team-${m * 2 + 1}` : null,
            participant2_name: round === 1 ? `Equipo ${m * 2 + 2}` : null,
            score1: null,
            score2: null,
            status: 'pending',
            winner_id: null,
            scheduled_date: tournament.start_date,
            scheduled_time: `${10 + m}:00`
          });
        }
      }
    });
    return matches;
  }, []);

  // Generar standings de ejemplo
  const generateExampleStandings = useCallback((tournament) => {
    const teams = [];
    const numTeams = tournament.max_participants || 8;
    for (let i = 0; i < numTeams; i++) {
      const played = Math.floor(Math.random() * 6) + 3;
      const won = Math.floor(Math.random() * played);
      const drawn = Math.floor(Math.random() * (played - won));
      const lost = played - won - drawn;
      const goalsFor = won * 2 + drawn + Math.floor(Math.random() * 5);
      const goalsAgainst = lost * 2 + drawn + Math.floor(Math.random() * 3);
      
      teams.push({
        id: `team-${i}`,
        name: `Equipo ${i + 1}`,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDiff: goalsFor - goalsAgainst,
        points: won * 3 + drawn
      });
    }
    return teams.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff);
  }, []);

  const filteredTournaments = tournaments.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Vista de lista de torneos
  const TournamentsList = () => (
    <div className="space-y-4">
      {/* Header con búsqueda y filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar torneos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="registration">Inscripción</SelectItem>
            <SelectItem value="in_progress">En curso</SelectItem>
            <SelectItem value="completed">Finalizado</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          className="bg-gradient-to-r from-orange-500 to-red-500 shadow-lg"
          onClick={() => setWizardOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Torneo
        </Button>
      </div>

      {/* Lista de torneos */}
      {filteredTournaments.length > 0 ? (
        <div className="grid gap-4">
          {filteredTournaments.map((tournament) => {
            const sport = SPORTS.find(s => s.id === tournament.sport);
            const format = TOURNAMENT_FORMATS.find(f => f.id === tournament.format);
            
            return (
              <Card 
                key={tournament.id} 
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer border-2 hover:border-orange-200"
                onClick={() => setSelectedTournament(tournament)}
              >
                <div className="flex">
                  {/* Sport icon banner */}
                  <div className="w-24 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <span className="text-4xl">{sport?.icon || '🏆'}</span>
                  </div>
                  
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{tournament.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Brackets className="w-4 h-4" />
                            {format?.name || tournament.format}
                          </span>
                          {tournament.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {tournament.city}
                            </span>
                          )}
                          {tournament.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(tournament.start_date).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge className={
                        tournament.status === 'completed' ? 'bg-green-100 text-green-700' :
                        tournament.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        tournament.status === 'registration' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {tournament.status === 'completed' ? 'Finalizado' :
                         tournament.status === 'in_progress' ? 'En curso' :
                         tournament.status === 'registration' ? 'Inscripción' : 'Borrador'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{tournament.participants_count || 0}/{tournament.max_participants || 16}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>{tournament.categories?.length || 0} categorías</span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`${window.location.origin}/tournament/${tournament.share_id || tournament.id}`);
                          toast.success('Enlace copiado');
                        }}>
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTournament(tournament);
                        }}>
                          Ver detalles
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">Sin Torneos</h3>
          <p className="text-slate-500 mb-6">Crea tu primer torneo para comenzar</p>
          <Button 
            className="bg-gradient-to-r from-orange-500 to-red-500"
            onClick={() => setWizardOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Torneo
          </Button>
        </Card>
      )}
    </div>
  );

  // Vista de detalle del torneo
  const TournamentDetail = () => {
    if (!selectedTournament) return null;

    const sport = SPORTS.find(s => s.id === selectedTournament.sport);
    const format = TOURNAMENT_FORMATS.find(f => f.id === selectedTournament.format);
    const matches = generateExampleMatches(selectedTournament);
    const standings = generateExampleStandings(selectedTournament);
    const categoryMatches = selectedCategory 
      ? matches.filter(m => m.category_id === selectedCategory.id)
      : matches;

    return (
      <div className="space-y-4">
        {/* Header del torneo */}
        <Card className="overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 relative">
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute bottom-4 left-6 flex items-end gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center text-4xl">
                {sport?.icon || '🏆'}
              </div>
              <div className="text-white mb-1">
                <h1 className="text-2xl font-bold">{selectedTournament.name}</h1>
                <div className="flex items-center gap-3 text-sm opacity-90">
                  <span>{format?.name}</span>
                  {selectedTournament.city && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedTournament.city}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/tournament/${selectedTournament.share_id || selectedTournament.id}`);
                  toast.success('Enlace copiado');
                }}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Compartir
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedTournament(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabs de navegación */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="bracket" className="flex items-center gap-1">
              <Brackets className="w-4 h-4" />
              Bracket
            </TabsTrigger>
            <TabsTrigger value="matches" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="standings" className="flex items-center gap-1">
              <ListOrdered className="w-4 h-4" />
              Tabla
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Participantes
            </TabsTrigger>
          </TabsList>

          {/* Tab: General */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Info cards */}
              <Card className="p-4">
                <h4 className="font-semibold text-slate-600 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fechas
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Inicio:</span> {selectedTournament.start_date || 'Por definir'}</p>
                  <p><span className="text-slate-500">Fin:</span> {selectedTournament.end_date || 'Por definir'}</p>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold text-slate-600 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Sede:</span> {selectedTournament.venue || 'Por definir'}</p>
                  <p><span className="text-slate-500">Ciudad:</span> {selectedTournament.city || 'Por definir'}</p>
                </div>
              </Card>

              <Card className="p-4">
                <h4 className="font-semibold text-slate-600 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participantes
                </h4>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-orange-500">
                    {selectedTournament.participants_count || 0}
                  </div>
                  <div className="text-sm text-slate-500">
                    / {selectedTournament.max_participants || 16} max
                  </div>
                </div>
              </Card>

              {/* Categorías */}
              <Card className="p-4 lg:col-span-3">
                <h4 className="font-semibold text-slate-600 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Categorías
                </h4>
                {selectedTournament.categories?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedTournament.categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedCategory?.id === cat.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium">{cat.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {cat.gender === 'male' ? 'Masculino' : cat.gender === 'female' ? 'Femenino' : 'Mixto'}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No hay categorías definidas</p>
                )}
              </Card>

              {/* Quick actions */}
              <Card className="p-4 lg:col-span-3">
                <h4 className="font-semibold text-slate-600 mb-3">Acciones rápidas</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Shuffle className="w-4 h-4 mr-1" />
                    Generar Fixture
                  </Button>
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-1" />
                    Agregar Participante
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Configuración
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Bracket */}
          <TabsContent value="bracket" className="mt-4">
            <Card className="p-4">
              {selectedCategory && (
                <div className="mb-4 flex items-center justify-between">
                  <Badge className="bg-orange-100 text-orange-700">
                    {selectedCategory.name}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCategory(null)}>
                    Ver todas las categorías
                  </Button>
                </div>
              )}
              {categoryMatches.length > 0 ? (
                <EliminationBracket 
                  matches={categoryMatches}
                  onUpdateMatch={(matchId, updates) => {
                    console.log('Update match', matchId, updates);
                    // Aquí iría la lógica para actualizar el partido
                  }}
                />
              ) : (
                <div className="text-center py-12">
                  <Brackets className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-500">No hay partidos generados</p>
                  <Button className="mt-4" onClick={() => toast.success('Fixture generado')}>
                    <Shuffle className="w-4 h-4 mr-1" />
                    Generar Fixture
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab: Partidos */}
          <TabsContent value="matches" className="mt-4">
            <Card className="p-4">
              <MatchList 
                matches={categoryMatches}
                onUpdateMatch={() => {}}
              />
            </Card>
          </TabsContent>

          {/* Tab: Tabla de posiciones */}
          <TabsContent value="standings" className="mt-4">
            <Card className="p-4">
              <StandingsTable 
                standings={standings}
                sport={selectedTournament.sport}
              />
            </Card>
          </TabsContent>

          {/* Tab: Participantes */}
          <TabsContent value="participants" className="mt-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Participantes Inscritos</h3>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: selectedTournament.max_participants || 8 }).map((_, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border-2 ${
                      idx < (selectedTournament.participants_count || 4)
                        ? 'border-green-200 bg-green-50'
                        : 'border-dashed border-slate-200'
                    }`}
                  >
                    {idx < (selectedTournament.participants_count || 4) ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                          {idx + 1}
                        </div>
                        <span className="font-medium text-sm">Equipo {idx + 1}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm">Vacante</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-6 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Torneos y Competencias</h2>
              <p className="text-white/80 text-sm">Gestiona campeonatos como un profesional</p>
            </div>
          </div>
          {!selectedTournament && (
            <Button 
              className="bg-white/20 hover:bg-white/30 border-white/30"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Torneo
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-slate-50 min-h-[calc(100%-100px)]">
        {selectedTournament ? <TournamentDetail /> : <TournamentsList />}
      </div>

      {/* Wizard de creación */}
      <TournamentWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        sportsCatalog={sportsCatalog}
        onSave={(data) => {
          const newTournament = {
            ...data,
            id: Date.now(),
            status: 'draft',
            participants_count: 0,
            share_id: Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString()
          };
          onCreateTournament?.(newTournament);
          toast.success('Torneo creado exitosamente');
        }}
      />
    </div>
  );
};

export default TournamentManager;

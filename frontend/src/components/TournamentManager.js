import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Trophy, Plus, Calendar, MapPin, Users, Flag,
  CheckCircle, Edit, Trash2, Share2,
  Download, ChevronRight, ChevronLeft, ChevronDown,
  Medal, Shuffle, ListOrdered, Grid3X3,
  Brackets, FileText, Settings, Eye, X, Search,
  Filter, Crown, Zap, UserPlus, Printer, Save
} from 'lucide-react';

// Formatos de torneo
const TOURNAMENT_FORMATS = [
  { id: 'single_elimination', name: 'Eliminación Directa', icon: Brackets, description: 'El perdedor queda eliminado', minParticipants: 2, recommended: [4, 8, 16, 32] },
  { id: 'double_elimination', name: 'Doble Eliminación', icon: Shuffle, description: 'Dos derrotas para eliminación', minParticipants: 4, recommended: [4, 8, 16] },
  { id: 'round_robin', name: 'Todos contra Todos', icon: Grid3X3, description: 'Cada uno juega contra todos', minParticipants: 3, recommended: [4, 6, 8] },
  { id: 'league', name: 'Liga', icon: Trophy, description: 'Sistema de puntos', minParticipants: 4, recommended: [6, 8, 10, 12] }
];

const SPORTS = [
  { id: 'futbol', name: 'Fútbol', icon: '⚽' },
  { id: 'baloncesto', name: 'Baloncesto', icon: '🏀' },
  { id: 'voleibol', name: 'Voleibol', icon: '🏐' },
  { id: 'tenis', name: 'Tenis', icon: '🎾' },
  { id: 'otro', name: 'Otro', icon: '🏆' }
];

const CATEGORY_TEMPLATES = [
  { name: 'Sub-12', gender: 'mixed' },
  { name: 'Sub-14', gender: 'mixed' },
  { name: 'Sub-16', gender: 'mixed' },
  { name: 'Sub-18', gender: 'mixed' },
  { name: 'Absoluto', gender: 'mixed' },
  { name: 'Femenino', gender: 'female' },
  { name: 'Masculino', gender: 'male' }
];

// ========== UTILIDADES ==========

// Generar fixture de eliminación directa
const generateSingleEliminationBracket = (participants) => {
  const matches = [];
  const n = participants.length;
  
  // Calcular número de rondas necesarias
  const rounds = Math.ceil(Math.log2(n));
  const totalSlots = Math.pow(2, rounds);
  
  // Crear slots con byes si es necesario
  const slots = [...participants];
  while (slots.length < totalSlots) {
    slots.push({ id: `bye-${slots.length}`, name: 'BYE', isBye: true });
  }
  
  // Mezclar para distribución aleatoria
  const shuffled = [...slots].sort(() => Math.random() - 0.5);
  
  // Generar partidos por ronda
  let matchId = 1;
  let currentRoundParticipants = shuffled;
  
  for (let round = 1; round <= rounds; round++) {
    const matchesInRound = currentRoundParticipants.length / 2;
    const nextRoundParticipants = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      const p1 = currentRoundParticipants[i * 2];
      const p2 = currentRoundParticipants[i * 2 + 1];
      
      const match = {
        id: matchId++,
        round,
        position: i + 1,
        participant1_id: p1?.id || null,
        participant1_name: p1?.name || null,
        participant2_id: p2?.id || null,
        participant2_name: p2?.name || null,
        score1: null,
        score2: null,
        winner_id: null,
        winner_name: null,
        status: 'pending',
        isBye: p1?.isBye || p2?.isBye
      };
      
      // Si hay BYE, el otro pasa automáticamente
      if (p1?.isBye && !p2?.isBye) {
        match.winner_id = p2.id;
        match.winner_name = p2.name;
        match.status = 'completed';
        match.score1 = 0;
        match.score2 = 'W';
      } else if (p2?.isBye && !p1?.isBye) {
        match.winner_id = p1.id;
        match.winner_name = p1.name;
        match.status = 'completed';
        match.score1 = 'W';
        match.score2 = 0;
      } else if (p1?.isBye && p2?.isBye) {
        match.status = 'completed';
      }
      
      matches.push(match);
      nextRoundParticipants.push({ id: `winner-${match.id}`, name: match.winner_name || `Ganador P${match.id}`, matchId: match.id });
    }
    
    currentRoundParticipants = nextRoundParticipants;
  }
  
  return matches;
};

// Generar fixture Round Robin
const generateRoundRobinMatches = (participants) => {
  const matches = [];
  let matchId = 1;
  const n = participants.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      matches.push({
        id: matchId++,
        round: 1,
        position: matchId,
        participant1_id: participants[i].id,
        participant1_name: participants[i].name,
        participant2_id: participants[j].id,
        participant2_name: participants[j].name,
        score1: null,
        score2: null,
        winner_id: null,
        status: 'pending'
      });
    }
  }
  
  return matches;
};

// Calcular tabla de posiciones
const calculateStandings = (participants, matches) => {
  const standings = participants.map(p => ({
    ...p,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0
  }));
  
  matches.filter(m => m.status === 'completed').forEach(match => {
    const team1 = standings.find(s => s.id === match.participant1_id);
    const team2 = standings.find(s => s.id === match.participant2_id);
    
    if (team1 && team2 && match.score1 !== null && match.score2 !== null) {
      const s1 = parseInt(match.score1) || 0;
      const s2 = parseInt(match.score2) || 0;
      
      team1.played++;
      team2.played++;
      team1.goalsFor += s1;
      team1.goalsAgainst += s2;
      team2.goalsFor += s2;
      team2.goalsAgainst += s1;
      
      if (s1 > s2) {
        team1.won++;
        team1.points += 3;
        team2.lost++;
      } else if (s2 > s1) {
        team2.won++;
        team2.points += 3;
        team1.lost++;
      } else {
        team1.drawn++;
        team2.drawn++;
        team1.points += 1;
        team2.points += 1;
      }
    }
  });
  
  standings.forEach(s => {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  });
  
  return standings.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
};

// Generar PDF del torneo
const generateTournamentPDF = (tournament, participants, matches) => {
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${tournament.name} - Fixture</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #1e40af; border-bottom: 3px solid #f97316; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        .info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .info p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
        th { background: #1e40af; color: white; }
        .match { background: white; margin: 10px 0; padding: 15px; border: 2px solid #e5e7eb; border-radius: 8px; }
        .winner { background: #dcfce7; }
        .round-title { background: #fef3c7; padding: 8px 15px; border-radius: 5px; font-weight: bold; margin: 20px 0 10px; }
        .score { font-size: 1.2em; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>🏆 ${tournament.name}</h1>
      <div class="info">
        <p><strong>Formato:</strong> ${TOURNAMENT_FORMATS.find(f => f.id === tournament.format)?.name || tournament.format}</p>
        <p><strong>Deporte:</strong> ${tournament.sportName || tournament.sport}</p>
        <p><strong>Fecha:</strong> ${tournament.start_date || 'Por definir'}</p>
        <p><strong>Ubicación:</strong> ${tournament.city || 'Por definir'}</p>
        <p><strong>Participantes:</strong> ${participants.length}</p>
      </div>
      
      <h2>📋 Participantes</h2>
      <table>
        <tr><th>#</th><th>Nombre</th></tr>
        ${participants.map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td></tr>`).join('')}
      </table>
      
      <h2>⚔️ Partidos</h2>
      ${Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b).map(round => `
        <div class="round-title">Ronda ${round}${round === Math.max(...matches.map(m => m.round)) ? ' - FINAL' : ''}</div>
        ${matches.filter(m => m.round === round).map(m => `
          <div class="match ${m.winner_id ? 'winner' : ''}">
            <strong>${m.participant1_name || 'TBD'}</strong>
            <span class="score">${m.score1 !== null ? m.score1 : '-'}</span>
            vs
            <span class="score">${m.score2 !== null ? m.score2 : '-'}</span>
            <strong>${m.participant2_name || 'TBD'}</strong>
            ${m.winner_name ? `<br><small>🏆 Ganador: ${m.winner_name}</small>` : ''}
          </div>
        `).join('')}
      `).join('')}
      
      <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
        Generado por TRAIN Sports Management - ${new Date().toLocaleDateString('es-ES')}
      </p>
    </body>
    </html>
  `;
  
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.print();
    };
  }
};

// ========== COMPONENTES ==========

// Bracket de Eliminación Directa
const EliminationBracket = ({ matches, onUpdateMatch, readOnly = false }) => {
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const maxRound = Math.max(...rounds);
  
  const getRoundName = (round) => {
    const diff = maxRound - round;
    if (diff === 0) return '🏆 FINAL';
    if (diff === 1) return 'Semifinal';
    if (diff === 2) return 'Cuartos';
    if (diff === 3) return 'Octavos';
    return `Ronda ${round}`;
  };

  const handleScoreChange = (matchId, field, value) => {
    onUpdateMatch(matchId, { [field]: value === '' ? null : parseInt(value) || 0 });
  };

  const handleFinishMatch = (match) => {
    if (match.score1 === null || match.score2 === null) {
      toast.error('Ingresa ambos marcadores');
      return;
    }
    if (match.score1 === match.score2) {
      toast.error('No puede haber empate en eliminación directa');
      return;
    }
    
    const winnerId = match.score1 > match.score2 ? match.participant1_id : match.participant2_id;
    const winnerName = match.score1 > match.score2 ? match.participant1_name : match.participant2_name;
    
    onUpdateMatch(match.id, { 
      status: 'completed', 
      winner_id: winnerId,
      winner_name: winnerName
    });
    
    toast.success(`¡${winnerName} avanza a la siguiente ronda!`);
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max p-4">
        {rounds.map((round) => {
          const roundMatches = matches.filter(m => m.round === round);
          const spacing = Math.pow(2, round - 1) * 20;
          
          return (
            <div key={round} className="flex flex-col gap-4" style={{ minWidth: '240px' }}>
              <div className={`text-center py-2 px-4 rounded-lg font-bold text-sm ${
                round === maxRound ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {getRoundName(round)}
              </div>
              
              <div className="flex flex-col justify-around" style={{ gap: `${spacing}px`, minHeight: `${roundMatches.length * 120 + (roundMatches.length - 1) * spacing}px` }}>
                {roundMatches.map((match) => (
                  <div 
                    key={match.id}
                    className={`bg-white border-2 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-lg ${
                      match.status === 'completed' ? 'border-green-300' :
                      match.isBye ? 'border-slate-200 opacity-60' :
                      'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="px-3 py-1.5 bg-slate-50 border-b flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Partido {match.id}</span>
                      <Badge variant={match.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">
                        {match.status === 'completed' ? '✓ Finalizado' : 'Pendiente'}
                      </Badge>
                    </div>
                    
                    {/* Participant 1 */}
                    <div className={`flex items-center justify-between px-3 py-2.5 ${
                      match.winner_id === match.participant1_id ? 'bg-green-50' : ''
                    }`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {match.winner_id === match.participant1_id && <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                        <span className={`text-sm truncate ${match.participant1_name ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                          {match.participant1_name || 'Por definir'}
                        </span>
                      </div>
                      {!readOnly && match.participant1_name && match.participant2_name && !match.isBye && match.status !== 'completed' ? (
                        <input
                          type="number"
                          min="0"
                          className="w-14 h-8 text-center border-2 rounded-lg text-sm font-bold focus:border-blue-500 focus:outline-none"
                          value={match.score1 ?? ''}
                          onChange={(e) => handleScoreChange(match.id, 'score1', e.target.value)}
                          placeholder="-"
                        />
                      ) : (
                        <span className={`text-xl font-bold ${match.winner_id === match.participant1_id ? 'text-green-600' : 'text-slate-600'}`}>
                          {match.score1 !== null ? match.score1 : '-'}
                        </span>
                      )}
                    </div>
                    
                    <div className="border-t border-slate-100" />
                    
                    {/* Participant 2 */}
                    <div className={`flex items-center justify-between px-3 py-2.5 ${
                      match.winner_id === match.participant2_id ? 'bg-green-50' : ''
                    }`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {match.winner_id === match.participant2_id && <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                        <span className={`text-sm truncate ${match.participant2_name ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                          {match.participant2_name || 'Por definir'}
                        </span>
                      </div>
                      {!readOnly && match.participant1_name && match.participant2_name && !match.isBye && match.status !== 'completed' ? (
                        <input
                          type="number"
                          min="0"
                          className="w-14 h-8 text-center border-2 rounded-lg text-sm font-bold focus:border-blue-500 focus:outline-none"
                          value={match.score2 ?? ''}
                          onChange={(e) => handleScoreChange(match.id, 'score2', e.target.value)}
                          placeholder="-"
                        />
                      ) : (
                        <span className={`text-xl font-bold ${match.winner_id === match.participant2_id ? 'text-green-600' : 'text-slate-600'}`}>
                          {match.score2 !== null ? match.score2 : '-'}
                        </span>
                      )}
                    </div>
                    
                    {/* Finish button */}
                    {!readOnly && match.participant1_name && match.participant2_name && !match.isBye && match.status !== 'completed' && (
                      <div className="px-3 py-2 bg-slate-50 border-t">
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs bg-green-500 hover:bg-green-600"
                          onClick={() => handleFinishMatch(match)}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Finalizar Partido
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Tabla de Posiciones
const StandingsTable = ({ standings }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <th className="px-3 py-3 text-left font-semibold rounded-tl-lg">#</th>
            <th className="px-3 py-3 text-left font-semibold">Equipo</th>
            <th className="px-3 py-3 text-center font-semibold">PJ</th>
            <th className="px-3 py-3 text-center font-semibold">G</th>
            <th className="px-3 py-3 text-center font-semibold">E</th>
            <th className="px-3 py-3 text-center font-semibold">P</th>
            <th className="px-3 py-3 text-center font-semibold">GF</th>
            <th className="px-3 py-3 text-center font-semibold">GC</th>
            <th className="px-3 py-3 text-center font-semibold">DIF</th>
            <th className="px-3 py-3 text-center font-semibold rounded-tr-lg">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, idx) => (
            <tr 
              key={team.id} 
              className={`border-b transition-colors ${
                idx === 0 ? 'bg-amber-50' : 
                idx < 3 ? 'bg-green-50/50' : 
                'hover:bg-slate-50'
              }`}
            >
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  {idx === 0 && <Crown className="w-5 h-5 text-amber-500" />}
                  {idx === 1 && <Medal className="w-5 h-5 text-slate-400" />}
                  {idx === 2 && <Medal className="w-5 h-5 text-amber-600" />}
                  {idx > 2 && <span className="text-slate-500 font-medium ml-1">{idx + 1}</span>}
                </div>
              </td>
              <td className="px-3 py-3 font-semibold text-slate-800">{team.name}</td>
              <td className="px-3 py-3 text-center text-slate-600">{team.played}</td>
              <td className="px-3 py-3 text-center text-green-600 font-semibold">{team.won}</td>
              <td className="px-3 py-3 text-center text-slate-500">{team.drawn}</td>
              <td className="px-3 py-3 text-center text-red-500">{team.lost}</td>
              <td className="px-3 py-3 text-center">{team.goalsFor}</td>
              <td className="px-3 py-3 text-center">{team.goalsAgainst}</td>
              <td className="px-3 py-3 text-center">
                <span className={`font-medium ${team.goalDiff > 0 ? 'text-green-600' : team.goalDiff < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                  {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
                </span>
              </td>
              <td className="px-3 py-3 text-center">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg">
                  {team.points}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Lista de Partidos para Round Robin
const MatchList = ({ matches, onUpdateMatch, readOnly = false }) => {
  const handleScoreChange = (matchId, field, value) => {
    onUpdateMatch(matchId, { [field]: value === '' ? null : parseInt(value) || 0 });
  };

  const handleFinishMatch = (match) => {
    if (match.score1 === null || match.score2 === null) {
      toast.error('Ingresa ambos marcadores');
      return;
    }
    
    let winnerId = null;
    if (match.score1 > match.score2) winnerId = match.participant1_id;
    else if (match.score2 > match.score1) winnerId = match.participant2_id;
    
    onUpdateMatch(match.id, { status: 'completed', winner_id: winnerId });
    toast.success('Partido finalizado');
  };

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <div 
          key={match.id}
          className={`p-4 rounded-xl border-2 transition-all ${
            match.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Team 1 */}
            <div className="flex-1 text-right">
              <span className={`font-semibold ${match.winner_id === match.participant1_id ? 'text-green-600' : 'text-slate-700'}`}>
                {match.participant1_name}
              </span>
            </div>
            
            {/* Score */}
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
              {!readOnly && match.status !== 'completed' ? (
                <>
                  <input
                    type="number"
                    min="0"
                    className="w-12 h-10 text-center border-2 rounded-lg text-lg font-bold focus:border-blue-500 focus:outline-none"
                    value={match.score1 ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'score1', e.target.value)}
                    placeholder="-"
                  />
                  <span className="text-slate-400 text-xl">:</span>
                  <input
                    type="number"
                    min="0"
                    className="w-12 h-10 text-center border-2 rounded-lg text-lg font-bold focus:border-blue-500 focus:outline-none"
                    value={match.score2 ?? ''}
                    onChange={(e) => handleScoreChange(match.id, 'score2', e.target.value)}
                    placeholder="-"
                  />
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-slate-700">{match.score1 ?? '-'}</span>
                  <span className="text-slate-400 text-xl">:</span>
                  <span className="text-2xl font-bold text-slate-700">{match.score2 ?? '-'}</span>
                </>
              )}
            </div>
            
            {/* Team 2 */}
            <div className="flex-1">
              <span className={`font-semibold ${match.winner_id === match.participant2_id ? 'text-green-600' : 'text-slate-700'}`}>
                {match.participant2_name}
              </span>
            </div>
            
            {/* Actions */}
            {!readOnly && match.status !== 'completed' && (
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600"
                onClick={() => handleFinishMatch(match)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Finalizar
              </Button>
            )}
            
            {match.status === 'completed' && (
              <Badge className="bg-green-100 text-green-700">✓ Finalizado</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Wizard de Creación de Torneo
const TournamentWizard = ({ isOpen, onClose, onSave, sportsCatalog = [] }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', sport: '', sportName: '', format: 'single_elimination',
    description: '', start_date: '', end_date: '', venue: '', city: '',
    max_participants: 8, categories: [], rules: '', prizes: ''
  });
  const [expandedCatalog, setExpandedCatalog] = useState(null);

  const handleSave = () => {
    if (!formData.name) {
      toast.error('Ingresa el nombre del torneo');
      return;
    }
    onSave(formData);
    onClose();
    setStep(1);
    setFormData({ name: '', sport: '', sportName: '', format: 'single_elimination', description: '', start_date: '', end_date: '', venue: '', city: '', max_participants: 8, categories: [], rules: '', prizes: '' });
  };

  const handleSelectSport = (sport, category) => {
    setFormData({ ...formData, sport: sport.id || sport.name, sportName: sport.name, sportCategory: category?.name });
  };

  const selectedFormat = TOURNAMENT_FORMATS.find(f => f.id === formData.format);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 bg-white rounded-2xl">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white rounded-t-2xl">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-3 text-lg font-bold text-white">
              <Trophy className="w-6 h-6" />
              {step === 1 ? 'Información del Torneo' : step === 2 ? 'Formato y Participantes' : 'Detalles Finales'}
            </DialogTitle>
          </DialogHeader>
          {/* Progress */}
          <div className="flex gap-2 mt-3">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">Nombre del Torneo *</Label>
                <Input placeholder="Ej: Copa Primavera 2026" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1" />
              </div>
              
              <div>
                <Label className="font-semibold">Deporte</Label>
                {sportsCatalog.length > 0 ? (
                  <div className="mt-2 space-y-2 max-h-[180px] overflow-y-auto border rounded-lg p-2">
                    {sportsCatalog.map((category) => (
                      <div key={category.id} className="border rounded-lg overflow-hidden">
                        <button onClick={() => setExpandedCatalog(expandedCatalog === category.id ? null : category.id)} className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon}</span>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedCatalog === category.id ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedCatalog === category.id && category.sports?.length > 0 && (
                          <div className="px-3 pb-2 grid grid-cols-2 gap-1">
                            {category.sports.map((sport) => (
                              <button key={sport.id} onClick={() => handleSelectSport(sport, category)} className={`p-2 rounded text-left text-sm ${formData.sport === sport.name ? 'bg-blue-500 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                {sport.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {SPORTS.map((sport) => (
                      <button key={sport.id} onClick={() => setFormData({ ...formData, sport: sport.id, sportName: sport.name })} className={`p-2 rounded-lg border-2 text-center ${formData.sport === sport.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                        <span className="text-xl">{sport.icon}</span>
                        <p className="text-xs mt-1">{sport.name}</p>
                      </button>
                    ))}
                  </div>
                )}
                {formData.sportName && <p className="mt-2 text-sm text-green-600">✓ {formData.sportName}</p>}
              </div>

              <div>
                <Label className="font-semibold">Descripción</Label>
                <textarea placeholder="Describe el torneo..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full mt-1 p-2 border rounded-lg text-sm h-16 resize-none" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">Formato del Torneo *</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {TOURNAMENT_FORMATS.map((format) => {
                    const Icon = format.icon;
                    return (
                      <button key={format.id} onClick={() => setFormData({ ...formData, format: format.id })} className={`p-3 rounded-xl border-2 text-left ${formData.format === format.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold text-sm">{format.name}</span>
                        </div>
                        <p className="text-xs text-slate-500">{format.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedFormat && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <Label className="font-semibold text-amber-800">Número de Participantes</Label>
                  <div className="flex gap-2 mt-2">
                    {selectedFormat.recommended.map((num) => (
                      <button key={num} onClick={() => setFormData({ ...formData, max_participants: num })} className={`px-4 py-2 rounded-lg font-semibold ${formData.max_participants === num ? 'bg-amber-500 text-white' : 'bg-white border'}`}>
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-semibold">Fecha Inicio</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold">Fecha Fin</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-semibold">Sede</Label>
                  <Input placeholder="Estadio/Polideportivo" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="font-semibold">Ciudad</Label>
                  <Input placeholder="Madrid" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="mt-1" />
                </div>
              </div>

              <div>
                <Label className="font-semibold">Reglas</Label>
                <textarea placeholder="Reglas del torneo..." value={formData.rules} onChange={(e) => setFormData({ ...formData, rules: e.target.value })} className="w-full mt-1 p-2 border rounded-lg text-sm h-16 resize-none" />
              </div>

              <div>
                <Label className="font-semibold">Premios</Label>
                <textarea placeholder="Premios para los ganadores..." value={formData.prizes} onChange={(e) => setFormData({ ...formData, prizes: e.target.value })} className="w-full mt-1 p-2 border rounded-lg text-sm h-16 resize-none" />
              </div>

              {/* Preview */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-bold text-slate-700 mb-2">Resumen</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-slate-500">Nombre:</span> {formData.name || '-'}</p>
                  <p><span className="text-slate-500">Formato:</span> {selectedFormat?.name || '-'}</p>
                  <p><span className="text-slate-500">Participantes:</span> {formData.max_participants}</p>
                  <p><span className="text-slate-500">Ciudad:</span> {formData.city || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 bg-slate-50 border-t flex justify-between rounded-b-2xl">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 1 ? 'Cancelar' : 'Anterior'}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} className="bg-blue-600 hover:bg-blue-700">
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} className="bg-gradient-to-r from-orange-500 to-red-500">
              <Trophy className="w-4 h-4 mr-1" /> Crear Torneo
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ========== COMPONENTE PRINCIPAL ==========
const TournamentManager = ({ 
  tournaments = [], 
  sportsCatalog = [],
  onCreateTournament,
  onUpdateTournament,
  onDeleteTournament
}) => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado local del torneo seleccionado
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [fixtureGenerated, setFixtureGenerated] = useState(false);
  
  // Diálogos
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [editParticipantId, setEditParticipantId] = useState(null);
  const [editParticipantName, setEditParticipantName] = useState('');

  // Cuando se selecciona un torneo, cargar participantes
  useEffect(() => {
    if (selectedTournament) {
      setParticipants(selectedTournament.participants || []);
      setMatches(selectedTournament.matches || []);
      setFixtureGenerated(selectedTournament.matches?.length > 0);
    }
  }, [selectedTournament]);

  // Agregar participante
  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) {
      toast.error('Ingresa un nombre');
      return;
    }
    if (participants.length >= (selectedTournament?.max_participants || 32)) {
      toast.error('Se alcanzó el máximo de participantes');
      return;
    }
    const newParticipant = {
      id: `p-${Date.now()}`,
      name: newParticipantName.trim(),
      seed: participants.length + 1
    };
    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    setNewParticipantName('');
    setAddParticipantOpen(false);
    
    // Auto-save after adding participant
    if (selectedTournament && onUpdateTournament) {
      onUpdateTournament(selectedTournament.id, {
        ...selectedTournament,
        participants: updatedParticipants,
        matches,
        participants_count: updatedParticipants.length
      });
    }
    
    toast.success(`${newParticipant.name} agregado`);
  };

  // Editar participante
  const handleEditParticipant = () => {
    if (!editParticipantName.trim()) return;
    setParticipants(participants.map(p => 
      p.id === editParticipantId ? { ...p, name: editParticipantName.trim() } : p
    ));
    // Actualizar en matches también
    setMatches(matches.map(m => ({
      ...m,
      participant1_name: m.participant1_id === editParticipantId ? editParticipantName.trim() : m.participant1_name,
      participant2_name: m.participant2_id === editParticipantId ? editParticipantName.trim() : m.participant2_name,
      winner_name: m.winner_id === editParticipantId ? editParticipantName.trim() : m.winner_name
    })));
    setEditParticipantId(null);
    setEditParticipantName('');
    toast.success('Participante actualizado');
  };

  // Eliminar participante
  const handleRemoveParticipant = (id) => {
    if (fixtureGenerated) {
      toast.error('No puedes eliminar participantes después de generar el fixture');
      return;
    }
    const updatedParticipants = participants.filter(p => p.id !== id);
    setParticipants(updatedParticipants);
    
    // Auto-save after removing participant
    if (selectedTournament && onUpdateTournament) {
      onUpdateTournament(selectedTournament.id, {
        ...selectedTournament,
        participants: updatedParticipants,
        matches,
        participants_count: updatedParticipants.length
      });
    }
    
    toast.success('Participante eliminado');
  };

  // Generar Fixture
  const handleGenerateFixture = () => {
    if (participants.length < 2) {
      toast.error('Necesitas al menos 2 participantes');
      return;
    }
    
    let generatedMatches = [];
    
    if (selectedTournament?.format === 'round_robin' || selectedTournament?.format === 'league') {
      generatedMatches = generateRoundRobinMatches(participants);
    } else {
      generatedMatches = generateSingleEliminationBracket(participants);
    }
    
    setMatches(generatedMatches);
    setFixtureGenerated(true);
    setActiveTab('bracket');
    
    // Auto-save after generating fixture
    if (selectedTournament && onUpdateTournament) {
      onUpdateTournament(selectedTournament.id, {
        ...selectedTournament,
        participants,
        matches: generatedMatches,
        participants_count: participants.length
      });
    }
    
    toast.success(`¡Fixture generado con ${generatedMatches.length} partidos!`);
  };

  // Actualizar partido
  const handleUpdateMatch = (matchId, updates) => {
    setMatches(prevMatches => {
      const newMatches = prevMatches.map(m => m.id === matchId ? { ...m, ...updates } : m);
      
      // Si el partido se completó, actualizar el siguiente partido en el bracket
      if (updates.status === 'completed' && updates.winner_id) {
        const completedMatch = newMatches.find(m => m.id === matchId);
        if (completedMatch) {
          // Buscar el siguiente partido donde debe ir el ganador
          const nextRound = completedMatch.round + 1;
          const nextPosition = Math.ceil(completedMatch.position / 2);
          const nextMatch = newMatches.find(m => m.round === nextRound && m.position === nextPosition);
          
          if (nextMatch) {
            const isFirstSlot = completedMatch.position % 2 === 1;
            if (isFirstSlot) {
              nextMatch.participant1_id = updates.winner_id;
              nextMatch.participant1_name = updates.winner_name;
            } else {
              nextMatch.participant2_id = updates.winner_id;
              nextMatch.participant2_name = updates.winner_name;
            }
          }
        }
        
        // Auto-save after completing a match
        if (selectedTournament && onUpdateTournament) {
          setTimeout(() => {
            onUpdateTournament(selectedTournament.id, {
              ...selectedTournament,
              participants,
              matches: newMatches,
              participants_count: participants.length
            });
          }, 100);
        }
      }
      
      return newMatches;
    });
  };

  // Reset fixture
  const handleResetFixture = () => {
    if (window.confirm('¿Estás seguro? Se perderán todos los resultados.')) {
      setMatches([]);
      setFixtureGenerated(false);
      toast.success('Fixture reiniciado');
    }
  };

  // Guardar torneo
  const handleSaveTournament = () => {
    if (selectedTournament && onUpdateTournament) {
      onUpdateTournament(selectedTournament.id, {
        ...selectedTournament,
        participants,
        matches,
        participants_count: participants.length
      });
      toast.success('Torneo guardado');
    }
  };

  // Descargar PDF
  const handleDownloadPDF = () => {
    if (!selectedTournament) return;
    generateTournamentPDF(selectedTournament, participants, matches);
  };

  // Calcular standings
  const standings = (selectedTournament?.format === 'round_robin' || selectedTournament?.format === 'league') 
    ? calculateStandings(participants, matches) 
    : [];

  // Filtrar torneos
  const filteredTournaments = tournaments.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Vista de Lista de Torneos
  if (!selectedTournament) {
    return (
      <div className="h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-7 h-7" />
              <div>
                <h2 className="text-xl font-bold">Torneos y Competencias</h2>
                <p className="text-white/80 text-sm">Gestiona campeonatos profesionalmente</p>
              </div>
            </div>
            <Button className="bg-white/20 hover:bg-white/30 border-white/30" onClick={() => setWizardOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Torneo
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 p-4 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar torneos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {filteredTournaments.length > 0 ? (
            <div className="space-y-3">
              {filteredTournaments.map((t) => (
                <Card key={t.id} className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-orange-200" onClick={() => setSelectedTournament(t)}>
                  <div className="flex items-center p-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-3xl mr-4">
                      {SPORTS.find(s => s.id === t.sport)?.icon || '🏆'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-800">{t.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Brackets className="w-4 h-4" />
                          {TOURNAMENT_FORMATS.find(f => f.id === t.format)?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {t.participants_count || 0}/{t.max_participants}
                        </span>
                        {t.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{t.city}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Trophy className="w-20 h-20 mx-auto text-slate-200 mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">Sin Torneos</h3>
              <p className="text-slate-500 mb-6">Crea tu primer torneo para comenzar</p>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500" onClick={() => setWizardOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Crear Torneo
              </Button>
            </div>
          )}
        </div>

        <TournamentWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} sportsCatalog={sportsCatalog} onSave={(data) => {
          const newT = { ...data, id: Date.now(), status: 'draft', participants_count: 0, participants: [], matches: [] };
          onCreateTournament?.(newT);
          toast.success('Torneo creado');
        }} />
      </div>
    );
  }

  // Vista de Detalle del Torneo
  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header del torneo */}
      <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => { setSelectedTournament(null); setParticipants([]); setMatches([]); setFixtureGenerated(false); }}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
              {SPORTS.find(s => s.id === selectedTournament.sport)?.icon || '🏆'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedTournament.name}</h2>
              <p className="text-white/80 text-sm">{TOURNAMENT_FORMATS.find(f => f.id === selectedTournament.format)?.name} • {participants.length}/{selectedTournament.max_participants} participantes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleSaveTournament}>
              <Save className="w-4 h-4 mr-1" /> Guardar
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Enlace copiado'); }}>
              <Share2 className="w-4 h-4 mr-1" /> Compartir
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white border-b px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-12">
            <TabsTrigger value="overview" className="gap-2"><Eye className="w-4 h-4" />General</TabsTrigger>
            <TabsTrigger value="participants" className="gap-2"><Users className="w-4 h-4" />Participantes</TabsTrigger>
            <TabsTrigger value="bracket" className="gap-2"><Brackets className="w-4 h-4" />Bracket</TabsTrigger>
            {(selectedTournament.format === 'round_robin' || selectedTournament.format === 'league') && (
              <TabsTrigger value="standings" className="gap-2"><ListOrdered className="w-4 h-4" />Tabla</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        {/* Tab: General */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4">
              <h4 className="font-semibold text-slate-600 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" />Fechas</h4>
              <p className="text-sm"><span className="text-slate-500">Inicio:</span> {selectedTournament.start_date || 'Por definir'}</p>
              <p className="text-sm mt-1"><span className="text-slate-500">Fin:</span> {selectedTournament.end_date || 'Por definir'}</p>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold text-slate-600 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" />Ubicación</h4>
              <p className="text-sm"><span className="text-slate-500">Sede:</span> {selectedTournament.venue || 'Por definir'}</p>
              <p className="text-sm mt-1"><span className="text-slate-500">Ciudad:</span> {selectedTournament.city || 'Por definir'}</p>
            </Card>
            <Card className="p-4">
              <h4 className="font-semibold text-slate-600 mb-3 flex items-center gap-2"><Users className="w-4 h-4" />Participantes</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-orange-500">{participants.length}</span>
                <span className="text-slate-500">/ {selectedTournament.max_participants}</span>
              </div>
            </Card>
            
            {/* Acciones */}
            <Card className="p-4 lg:col-span-3">
              <h4 className="font-semibold text-slate-600 mb-3">Acciones Rápidas</h4>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => { setActiveTab('participants'); setAddParticipantOpen(true); }}>
                  <UserPlus className="w-4 h-4 mr-1" /> Agregar Participante
                </Button>
                <Button onClick={handleGenerateFixture} disabled={participants.length < 2 || fixtureGenerated} className="bg-green-500 hover:bg-green-600">
                  <Shuffle className="w-4 h-4 mr-1" /> {fixtureGenerated ? 'Fixture Generado' : 'Generar Fixture'}
                </Button>
                {fixtureGenerated && (
                  <Button variant="outline" onClick={handleResetFixture} className="text-red-500 border-red-200 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-1" /> Reiniciar Fixture
                  </Button>
                )}
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Printer className="w-4 h-4 mr-1" /> Imprimir PDF
                </Button>
              </div>
            </Card>

            {/* Estado del fixture */}
            {fixtureGenerated && (
              <Card className="p-4 lg:col-span-3 bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div>
                    <h4 className="font-semibold text-green-800">Fixture Generado</h4>
                    <p className="text-sm text-green-600">{matches.length} partidos programados • {matches.filter(m => m.status === 'completed').length} completados</p>
                  </div>
                  <Button size="sm" className="ml-auto" onClick={() => setActiveTab('bracket')}>
                    Ver Bracket <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tab: Participantes */}
        {activeTab === 'participants' && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Participantes ({participants.length}/{selectedTournament.max_participants})</h3>
              <Button onClick={() => setAddParticipantOpen(true)} disabled={participants.length >= selectedTournament.max_participants}>
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
            </div>
            
            {participants.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {participants.map((p, idx) => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-blue-300 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editParticipantId === p.id ? (
                          <div className="flex gap-1">
                            <Input value={editParticipantName} onChange={(e) => setEditParticipantName(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleEditParticipant()} />
                            <Button size="sm" className="h-8 px-2" onClick={handleEditParticipant}><CheckCircle className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-800 truncate block">{p.name}</span>
                        )}
                      </div>
                    </div>
                    {!fixtureGenerated && editParticipantId !== p.id && (
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setEditParticipantId(p.id); setEditParticipantName(p.name); }}>
                          <Edit className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-700" onClick={() => handleRemoveParticipant(p.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Quitar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: Math.max(0, selectedTournament.max_participants - participants.length) }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="p-3 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-blue-300 hover:text-blue-500" onClick={() => setAddParticipantOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Vacante
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 mb-4">No hay participantes aún</p>
                <Button onClick={() => setAddParticipantOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar Primer Participante
                </Button>
              </div>
            )}

            {/* Dialog agregar participante */}
            <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-500" />
                    Agregar Participante
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Label>Nombre del equipo/participante</Label>
                  <Input placeholder="Ej: Real Madrid, Juan Pérez..." value={newParticipantName} onChange={(e) => setNewParticipantName(e.target.value)} className="mt-2" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddParticipantOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddParticipant}>Agregar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        )}

        {/* Tab: Bracket */}
        {activeTab === 'bracket' && (
          <Card className="p-4">
            {fixtureGenerated && matches.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">
                    {selectedTournament.format === 'round_robin' || selectedTournament.format === 'league' ? 'Partidos' : 'Bracket'}
                  </h3>
                  <Badge className="bg-blue-100 text-blue-700">
                    {matches.filter(m => m.status === 'completed').length}/{matches.length} completados
                  </Badge>
                </div>
                
                {selectedTournament.format === 'round_robin' || selectedTournament.format === 'league' ? (
                  <MatchList matches={matches} onUpdateMatch={handleUpdateMatch} />
                ) : (
                  <EliminationBracket matches={matches} onUpdateMatch={handleUpdateMatch} />
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Brackets className="w-20 h-20 mx-auto text-slate-200 mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">Sin Fixture</h3>
                <p className="text-slate-500 mb-6">Agrega participantes y genera el fixture para ver el bracket</p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setActiveTab('participants')}>
                    <Users className="w-4 h-4 mr-1" /> Agregar Participantes ({participants.length})
                  </Button>
                  <Button onClick={handleGenerateFixture} disabled={participants.length < 2} className="bg-green-500 hover:bg-green-600">
                    <Shuffle className="w-4 h-4 mr-1" /> Generar Fixture
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Tab: Tabla de Posiciones */}
        {activeTab === 'standings' && (selectedTournament.format === 'round_robin' || selectedTournament.format === 'league') && (
          <Card className="p-4">
            <h3 className="font-bold text-lg mb-4">Tabla de Posiciones</h3>
            {standings.length > 0 ? (
              <StandingsTable standings={standings} />
            ) : (
              <div className="text-center py-12">
                <ListOrdered className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">La tabla se generará cuando haya partidos</p>
              </div>
            )}
          </Card>
        )}
      </div>

      <TournamentWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} sportsCatalog={sportsCatalog} onSave={(data) => {
        const newT = { ...data, id: Date.now(), status: 'draft', participants_count: 0, participants: [], matches: [] };
        onCreateTournament?.(newT);
        toast.success('Torneo creado');
      }} />
    </div>
  );
};

export default TournamentManager;

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { getPublicTournament } from '../services/api';
import { 
  Trophy, Calendar, MapPin, Users, Loader2, 
  Medal, GitBranch, LayoutGrid, ChevronRight
} from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  registration: 'bg-[#D4AF37] text-[#B8912A]',
  seeding: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  draft: 'Borrador',
  registration: 'Inscripciones Abiertas',
  seeding: 'Preparando',
  in_progress: 'En Curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

const TOURNAMENT_FORMATS = {
  single_elimination: { label: 'Eliminación Directa', icon: '🏆' },
  double_elimination: { label: 'Doble Eliminación', icon: '🔄' },
  round_robin: { label: 'Todos contra Todos', icon: '🔁' },
  group_stage_knockout: { label: 'Grupos + Eliminación', icon: '📊' },
  league: { label: 'Liga', icon: '📈' },
  swiss_system: { label: 'Sistema Suizo', icon: '🇨🇭' },
  consolation: { label: 'Con Repechaje', icon: '🎯' },
};

const TournamentPublicPage = () => {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await getPublicTournament(shareId);
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Torneo no encontrado');
      } finally {
        setLoading(false);
      }
    };
    fetchTournament();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Torneo no encontrado</h2>
            <p className="text-slate-500 mb-6">{error}</p>
            <Link to="/" className="text-amber-600 hover:underline">
              Volver al inicio
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tournament, matches } = data;
  const format = TOURNAMENT_FORMATS[tournament.format] || { label: tournament.format, icon: '🏆' };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div 
        className="bg-gradient-to-r py-12 px-4"
        style={{ 
          backgroundImage: `linear-gradient(135deg, ${tournament.primary_color}, ${tournament.secondary_color})` 
        }}
      >
        <div className="max-w-5xl mx-auto text-white">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{format.icon}</span>
            <div>
              <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                {tournament.name}
              </h1>
              <p className="text-white/80 text-lg">{tournament.sport}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <span className={`px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur`}>
              {STATUS_LABELS[tournament.status]}
            </span>
            <span className="flex items-center gap-1 text-white/80">
              <Calendar className="w-4 h-4" />
              {tournament.start_date} - {tournament.end_date}
            </span>
            {tournament.venue && (
              <span className="flex items-center gap-1 text-white/80">
                <MapPin className="w-4 h-4" />
                {tournament.venue}, {tournament.city}
              </span>
            )}
            <span className="flex items-center gap-1 text-white/80">
              <LayoutGrid className="w-4 h-4" />
              {format.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {tournament.description && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <p className="text-slate-600">{tournament.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Categories */}
        <div className="space-y-6">
          {tournament.categories?.map((category) => {
            const categoryMatches = matches.filter(m => m.category_id === category.id);
            
            return (
              <Card key={category.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-amber-500" />
                    {category.name}
                    <span className="text-sm font-normal text-slate-500">
                      ({category.participants?.length || 0} participantes)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Participants */}
                  {category.participants?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Participantes</h4>
                      <div className="flex flex-wrap gap-2">
                        {category.participants.map((p) => (
                          <div 
                            key={p.id} 
                            className="px-3 py-1.5 bg-slate-100 rounded-full text-sm flex items-center gap-2"
                          >
                            {p.seed && <span className="text-xs text-amber-600 font-bold">#{p.seed}</span>}
                            {p.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standings */}
                  {category.standings?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Tabla de Posiciones</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600">
                              <th className="px-3 py-2 text-left">Pos</th>
                              <th className="px-3 py-2 text-left">Equipo</th>
                              <th className="px-3 py-2 text-center">PJ</th>
                              <th className="px-3 py-2 text-center">G</th>
                              <th className="px-3 py-2 text-center">E</th>
                              <th className="px-3 py-2 text-center">P</th>
                              <th className="px-3 py-2 text-center">GF</th>
                              <th className="px-3 py-2 text-center">GC</th>
                              <th className="px-3 py-2 text-center">DG</th>
                              <th className="px-3 py-2 text-center font-bold">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {category.standings.map((s, idx) => (
                              <tr key={s.id} className={idx < (tournament.advance_per_group || 2) ? 'bg-green-50' : ''}>
                                <td className="px-3 py-2 font-bold">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium">{s.name}</td>
                                <td className="px-3 py-2 text-center">{s.played}</td>
                                <td className="px-3 py-2 text-center">{s.won}</td>
                                <td className="px-3 py-2 text-center">{s.drawn}</td>
                                <td className="px-3 py-2 text-center">{s.lost}</td>
                                <td className="px-3 py-2 text-center">{s.goals_for}</td>
                                <td className="px-3 py-2 text-center">{s.goals_against}</td>
                                <td className="px-3 py-2 text-center">{s.goal_difference}</td>
                                <td className="px-3 py-2 text-center font-bold text-[#B8912A]">{s.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Matches */}
                  {categoryMatches.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Partidos</h4>
                      <div className="space-y-2">
                        {categoryMatches
                          .sort((a, b) => (a.round_number - b.round_number) || (a.match_number - b.match_number))
                          .map((match) => (
                            <div 
                              key={match.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                match.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-500 w-28">
                                  {match.round_name || `Ronda ${match.round_number}`}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className={`font-medium min-w-[120px] text-right ${
                                    match.winner_id === match.participant1_id ? 'text-green-700 font-bold' : ''
                                  }`}>
                                    {match.participant1_name || 'TBD'}
                                  </span>
                                  <div className="flex items-center gap-1 px-4 py-1.5 bg-slate-100 rounded-lg min-w-[80px] justify-center">
                                    <span className="font-bold text-lg">{match.participant1_score ?? '-'}</span>
                                    <span className="text-slate-400 mx-1">:</span>
                                    <span className="font-bold text-lg">{match.participant2_score ?? '-'}</span>
                                  </div>
                                  <span className={`font-medium min-w-[120px] ${
                                    match.winner_id === match.participant2_id ? 'text-green-700 font-bold' : ''
                                  }`}>
                                    {match.participant2_name || 'TBD'}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                match.status === 'completed' ? 'bg-green-100 text-green-700' :
                                match.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {match.status === 'completed' ? 'Finalizado' :
                                 match.status === 'in_progress' ? 'En Curso' : 'Programado'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {!category.participants?.length && !categoryMatches.length && (
                    <div className="text-center py-8 text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Sin participantes inscritos todavía</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Creado con LordTraining</p>
          <Link to="/" className="text-amber-600 hover:underline">
            train.app
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TournamentPublicPage;

import React, { useState, useMemo } from 'react';
import { Input } from './ui/input';
import { Search } from 'lucide-react';

// ═══ MATERIAL DESIGN ICONS — Sports, Fitness, Recreation, Health ═══
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import SportsCricketIcon from '@mui/icons-material/SportsCricket';
import SportsGolfIcon from '@mui/icons-material/SportsGolf';
import SportsHockeyIcon from '@mui/icons-material/SportsHockey';
import SportsRugbyIcon from '@mui/icons-material/SportsRugby';
import SportsHandballIcon from '@mui/icons-material/SportsHandball';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import SportsGymnasticsIcon from '@mui/icons-material/SportsGymnastics';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import SportsIcon from '@mui/icons-material/Sports';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import PoolIcon from '@mui/icons-material/Pool';
import SurfingIcon from '@mui/icons-material/Surfing';
import KayakingIcon from '@mui/icons-material/Kayaking';
import RowingIcon from '@mui/icons-material/Rowing';
import SkateboardingIcon from '@mui/icons-material/Skateboarding';
import SnowboardingIcon from '@mui/icons-material/Snowboarding';
import DownhillSkiingIcon from '@mui/icons-material/DownhillSkiing';
import IceSkatingIcon from '@mui/icons-material/IceSkating';
import KitesurfingIcon from '@mui/icons-material/Kitesurfing';
import ParaGlidingIcon from '@mui/icons-material/Paragliding';
import ScubaDivingIcon from '@mui/icons-material/ScubaDiving';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import AccessibleIcon from '@mui/icons-material/Accessible';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PsychologyIcon from '@mui/icons-material/Psychology';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import HealingIcon from '@mui/icons-material/Healing';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ElderlyIcon from '@mui/icons-material/Elderly';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import PregnantWomanIcon from '@mui/icons-material/PregnantWoman';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import StarsIcon from '@mui/icons-material/Stars';
import GradeIcon from '@mui/icons-material/Grade';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import EscalatorWarningIcon from '@mui/icons-material/EscalatorWarning';
import NaturePeopleIcon from '@mui/icons-material/NaturePeople';
import HikingIcon from '@mui/icons-material/Hiking';
import ParkIcon from '@mui/icons-material/Park';
import TerrainIcon from '@mui/icons-material/Terrain';
import LandscapeIcon from '@mui/icons-material/Landscape';
import WaterIcon from '@mui/icons-material/Water';
import AirIcon from '@mui/icons-material/Air';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import NightsStayIcon from '@mui/icons-material/NightsStay';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import FlagIcon from '@mui/icons-material/Flag';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ExploreIcon from '@mui/icons-material/Explore';
import ExtensionIcon from '@mui/icons-material/Extension';
import CasinoIcon from '@mui/icons-material/Casino';
import SpaIcon from '@mui/icons-material/Spa';
import YardIcon from '@mui/icons-material/Yard';
import BalanceIcon from '@mui/icons-material/Balance';
import ScaleIcon from '@mui/icons-material/Scale';
import StraightenIcon from '@mui/icons-material/Straighten';
import SquareFootIcon from '@mui/icons-material/SquareFoot';
import HeightIcon from '@mui/icons-material/Height';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import BarChartIcon from '@mui/icons-material/BarChart';
import InsightsIcon from '@mui/icons-material/Insights';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HearingIcon from '@mui/icons-material/Hearing';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import PanToolIcon from '@mui/icons-material/PanTool';
import BackHandIcon from '@mui/icons-material/BackHand';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import BoltIcon from '@mui/icons-material/Bolt';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import PowerIcon from '@mui/icons-material/Power';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import RecyclingIcon from '@mui/icons-material/Recycling';
import LoopIcon from '@mui/icons-material/Loop';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import ShieldIcon from '@mui/icons-material/Shield';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedIcon from '@mui/icons-material/Verified';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CelebrationIcon from '@mui/icons-material/Celebration';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import MoodIcon from '@mui/icons-material/Mood';
import FaceRetouchingNaturalIcon from '@mui/icons-material/FaceRetouchingNatural';

// Full icon catalog organized by categories
export const ICON_CATALOG = [
  // ── Deportes con Balón ──
  { id: 'sports_soccer', Icon: SportsSoccerIcon, label: 'Fútbol', cat: 'Deportes' },
  { id: 'sports_basketball', Icon: SportsBasketballIcon, label: 'Baloncesto', cat: 'Deportes' },
  { id: 'sports_volleyball', Icon: SportsVolleyballIcon, label: 'Voleibol', cat: 'Deportes' },
  { id: 'sports_tennis', Icon: SportsTennisIcon, label: 'Tenis', cat: 'Deportes' },
  { id: 'sports_baseball', Icon: SportsBaseballIcon, label: 'Béisbol', cat: 'Deportes' },
  { id: 'sports_cricket', Icon: SportsCricketIcon, label: 'Críquet', cat: 'Deportes' },
  { id: 'sports_golf', Icon: SportsGolfIcon, label: 'Golf', cat: 'Deportes' },
  { id: 'sports_hockey', Icon: SportsHockeyIcon, label: 'Hockey', cat: 'Deportes' },
  { id: 'sports_rugby', Icon: SportsRugbyIcon, label: 'Rugby', cat: 'Deportes' },
  { id: 'sports_handball', Icon: SportsHandballIcon, label: 'Balonmano', cat: 'Deportes' },
  { id: 'sports', Icon: SportsIcon, label: 'Silbato', cat: 'Deportes' },
  { id: 'sports_score', Icon: SportsScoreIcon, label: 'Meta', cat: 'Deportes' },
  // ── Combate y Artes Marciales ──
  { id: 'sports_mma', Icon: SportsMmaIcon, label: 'MMA / Boxeo', cat: 'Combate' },
  { id: 'sports_kabaddi', Icon: SportsKabaddiIcon, label: 'Lucha', cat: 'Combate' },
  { id: 'sports_martial', Icon: SportsMartialArtsIcon, label: 'Artes marciales', cat: 'Combate' },
  // ── Gimnasia y Fitness ──
  { id: 'fitness_center', Icon: FitnessCenterIcon, label: 'Pesas / Gym', cat: 'Fitness' },
  { id: 'sports_gymnastics', Icon: SportsGymnasticsIcon, label: 'Gimnasia', cat: 'Fitness' },
  { id: 'self_improvement', Icon: SelfImprovementIcon, label: 'Yoga / Meditación', cat: 'Fitness' },
  { id: 'accessibility_new', Icon: AccessibilityNewIcon, label: 'Cuerpo completo', cat: 'Fitness' },
  { id: 'spa', Icon: SpaIcon, label: 'Bienestar / Spa', cat: 'Fitness' },
  // ── Cardio y Movimiento ──
  { id: 'directions_run', Icon: DirectionsRunIcon, label: 'Correr', cat: 'Cardio' },
  { id: 'directions_walk', Icon: DirectionsWalkIcon, label: 'Caminar', cat: 'Cardio' },
  { id: 'directions_bike', Icon: DirectionsBikeIcon, label: 'Ciclismo', cat: 'Cardio' },
  { id: 'hiking', Icon: HikingIcon, label: 'Senderismo', cat: 'Cardio' },
  { id: 'elderly', Icon: ElderlyIcon, label: 'Adulto mayor', cat: 'Cardio' },
  // ── Acuáticos ──
  { id: 'pool', Icon: PoolIcon, label: 'Natación', cat: 'Acuáticos' },
  { id: 'surfing', Icon: SurfingIcon, label: 'Surf', cat: 'Acuáticos' },
  { id: 'kayaking', Icon: KayakingIcon, label: 'Kayak', cat: 'Acuáticos' },
  { id: 'rowing', Icon: RowingIcon, label: 'Remo', cat: 'Acuáticos' },
  { id: 'kitesurfing', Icon: KitesurfingIcon, label: 'Kitesurf', cat: 'Acuáticos' },
  { id: 'scuba_diving', Icon: ScubaDivingIcon, label: 'Buceo', cat: 'Acuáticos' },
  // ── Deportes extremos / Invierno ──
  { id: 'skateboarding', Icon: SkateboardingIcon, label: 'Skateboard', cat: 'Extremo' },
  { id: 'snowboarding', Icon: SnowboardingIcon, label: 'Snowboard', cat: 'Extremo' },
  { id: 'skiing', Icon: DownhillSkiingIcon, label: 'Esquí', cat: 'Extremo' },
  { id: 'ice_skating', Icon: IceSkatingIcon, label: 'Patinaje', cat: 'Extremo' },
  { id: 'paragliding', Icon: ParaGlidingIcon, label: 'Parapente', cat: 'Extremo' },
  // ── Salud y Cuerpo ──
  { id: 'monitor_heart', Icon: MonitorHeartIcon, label: 'Monitor cardíaco', cat: 'Salud' },
  { id: 'favorite', Icon: FavoriteIcon, label: 'Corazón', cat: 'Salud' },
  { id: 'psychology', Icon: PsychologyIcon, label: 'Psicología', cat: 'Salud' },
  { id: 'health_safety', Icon: HealthAndSafetyIcon, label: 'Salud', cat: 'Salud' },
  { id: 'medical', Icon: MedicalServicesIcon, label: 'Médico', cat: 'Salud' },
  { id: 'healing', Icon: HealingIcon, label: 'Rehabilitación', cat: 'Salud' },
  { id: 'hospital', Icon: LocalHospitalIcon, label: 'Hospital', cat: 'Salud' },
  { id: 'visibility', Icon: VisibilityIcon, label: 'Visión', cat: 'Salud' },
  { id: 'hearing', Icon: HearingIcon, label: 'Audición', cat: 'Salud' },
  // ── Energía y Rendimiento ──
  { id: 'electric_bolt', Icon: ElectricBoltIcon, label: 'Rayo', cat: 'Energía' },
  { id: 'whatshot', Icon: WhatshotIcon, label: 'Fuego', cat: 'Energía' },
  { id: 'speed', Icon: SpeedIcon, label: 'Velocidad', cat: 'Energía' },
  { id: 'timer', Icon: TimerIcon, label: 'Cronómetro', cat: 'Energía' },
  { id: 'bolt', Icon: BoltIcon, label: 'Relámpago', cat: 'Energía' },
  { id: 'flash_on', Icon: FlashOnIcon, label: 'Flash', cat: 'Energía' },
  { id: 'rocket', Icon: RocketLaunchIcon, label: 'Cohete', cat: 'Energía' },
  { id: 'battery', Icon: BatteryChargingFullIcon, label: 'Energía', cat: 'Energía' },
  { id: 'trending_up', Icon: TrendingUpIcon, label: 'Progresión', cat: 'Energía' },
  { id: 'insights', Icon: InsightsIcon, label: 'Análisis', cat: 'Energía' },
  // ── Logros y Premios ──
  { id: 'emoji_events', Icon: EmojiEventsIcon, label: 'Trofeo', cat: 'Logros' },
  { id: 'military_tech', Icon: MilitaryTechIcon, label: 'Medalla', cat: 'Logros' },
  { id: 'stars', Icon: StarsIcon, label: 'Estrellas', cat: 'Logros' },
  { id: 'grade', Icon: GradeIcon, label: 'Estrella', cat: 'Logros' },
  { id: 'workspace_premium', Icon: WorkspacePremiumIcon, label: 'Premium', cat: 'Logros' },
  { id: 'verified', Icon: VerifiedIcon, label: 'Verificado', cat: 'Logros' },
  { id: 'flag', Icon: FlagIcon, label: 'Bandera', cat: 'Logros' },
  // ── Precisión y Objetivo ──
  { id: 'gps_fixed', Icon: GpsFixedIcon, label: 'GPS', cat: 'Precisión' },
  { id: 'track_changes', Icon: TrackChangesIcon, label: 'Objetivo', cat: 'Precisión' },
  { id: 'my_location', Icon: MyLocationIcon, label: 'Ubicación', cat: 'Precisión' },
  { id: 'explore', Icon: ExploreIcon, label: 'Explorar', cat: 'Precisión' },
  // ── Equilibrio y Medición ──
  { id: 'balance', Icon: BalanceIcon, label: 'Balance', cat: 'Medición' },
  { id: 'scale', Icon: ScaleIcon, label: 'Peso', cat: 'Medición' },
  { id: 'straighten', Icon: StraightenIcon, label: 'Medida', cat: 'Medición' },
  { id: 'height', Icon: HeightIcon, label: 'Altura', cat: 'Medición' },
  { id: 'square_foot', Icon: SquareFootIcon, label: 'Escuadra', cat: 'Medición' },
  // ── Naturaleza y Aire Libre ──
  { id: 'nature_people', Icon: NaturePeopleIcon, label: 'Al aire libre', cat: 'Naturaleza' },
  { id: 'park', Icon: ParkIcon, label: 'Parque', cat: 'Naturaleza' },
  { id: 'terrain', Icon: TerrainIcon, label: 'Terreno', cat: 'Naturaleza' },
  { id: 'landscape', Icon: LandscapeIcon, label: 'Paisaje', cat: 'Naturaleza' },
  { id: 'water', Icon: WaterIcon, label: 'Agua', cat: 'Naturaleza' },
  { id: 'air', Icon: AirIcon, label: 'Aire', cat: 'Naturaleza' },
  { id: 'sunny', Icon: WbSunnyIcon, label: 'Sol', cat: 'Naturaleza' },
  { id: 'night', Icon: NightsStayIcon, label: 'Noche', cat: 'Naturaleza' },
  { id: 'snow', Icon: AcUnitIcon, label: 'Nieve', cat: 'Naturaleza' },
  { id: 'fire', Icon: LocalFireDepartmentIcon, label: 'Fuego', cat: 'Naturaleza' },
  { id: 'yard', Icon: YardIcon, label: 'Jardín', cat: 'Naturaleza' },
  // ── Personas y Grupos ──
  { id: 'person', Icon: PersonIcon, label: 'Persona', cat: 'Personas' },
  { id: 'group', Icon: GroupIcon, label: 'Grupo', cat: 'Personas' },
  { id: 'groups', Icon: GroupsIcon, label: 'Equipo', cat: 'Personas' },
  { id: 'child', Icon: ChildCareIcon, label: 'Niño', cat: 'Personas' },
  { id: 'pregnant', Icon: PregnantWomanIcon, label: 'Prenatal', cat: 'Personas' },
  { id: 'escalator', Icon: EscalatorWarningIcon, label: 'Padre/hijo', cat: 'Personas' },
  { id: 'emoji_people', Icon: EmojiPeopleIcon, label: 'Celebración', cat: 'Personas' },
  { id: 'accessible', Icon: AccessibleIcon, label: 'Accesible', cat: 'Personas' },
  // ── Mente y Educación ──
  { id: 'school', Icon: SchoolIcon, label: 'Escuela', cat: 'Educación' },
  { id: 'book', Icon: MenuBookIcon, label: 'Libro', cat: 'Educación' },
  { id: 'stories', Icon: AutoStoriesIcon, label: 'Lectura', cat: 'Educación' },
  { id: 'science', Icon: ScienceIcon, label: 'Ciencia', cat: 'Educación' },
  { id: 'biotech', Icon: BiotechIcon, label: 'Biotecnología', cat: 'Educación' },
  // ── Manos y Tacto ──
  { id: 'touch', Icon: TouchAppIcon, label: 'Tacto', cat: 'Manos' },
  { id: 'pan_tool', Icon: PanToolIcon, label: 'Mano abierta', cat: 'Manos' },
  { id: 'back_hand', Icon: BackHandIcon, label: 'Dorso', cat: 'Manos' },
  { id: 'thumb_up', Icon: ThumbUpIcon, label: 'Pulgar arriba', cat: 'Manos' },
  // ── Recreación y Juego ──
  { id: 'extension', Icon: ExtensionIcon, label: 'Puzzle', cat: 'Recreación' },
  { id: 'casino', Icon: CasinoIcon, label: 'Dado', cat: 'Recreación' },
  { id: 'music', Icon: MusicNoteIcon, label: 'Música', cat: 'Recreación' },
  { id: 'celebration', Icon: CelebrationIcon, label: 'Fiesta', cat: 'Recreación' },
  // ── Otros ──
  { id: 'shield', Icon: ShieldIcon, label: 'Escudo', cat: 'Otros' },
  { id: 'security', Icon: SecurityIcon, label: 'Seguridad', cat: 'Otros' },
  { id: 'loop', Icon: LoopIcon, label: 'Ciclo', cat: 'Otros' },
  { id: 'all_inclusive', Icon: AllInclusiveIcon, label: 'Infinito', cat: 'Otros' },
  { id: 'recycling', Icon: RecyclingIcon, label: 'Recuperación', cat: 'Otros' },
  { id: 'mood', Icon: MoodIcon, label: 'Ánimo', cat: 'Otros' },
  { id: 'face', Icon: FaceRetouchingNaturalIcon, label: 'Rostro', cat: 'Otros' },
  { id: 'sentiment', Icon: SentimentSatisfiedIcon, label: 'Satisfacción', cat: 'Otros' },
];

// Get unique categories for filtering
const ICON_CATEGORIES = [...new Set(ICON_CATALOG.map(i => i.cat))];

// Helper to get icon by ID
export const getIconById = (iconId) => {
  const found = ICON_CATALOG.find(i => i.id === iconId);
  return found ? found.Icon : FitnessCenterIcon;
};

// ═══ ICON PICKER COMPONENT ═══
const IconPicker = ({ value, onChange, size = 'md' }) => {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = useMemo(() => {
    return ICON_CATALOG.filter(item => {
      const matchSearch = !search || item.label.toLowerCase().includes(search.toLowerCase()) || item.id.includes(search.toLowerCase());
      const matchCat = filterCat === 'all' || item.cat === filterCat;
      return matchSearch && matchCat;
    });
  }, [search, filterCat]);

  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <div className="space-y-2">
      {/* Search + Category filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar icono..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-8 text-xs rounded-lg" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="h-7 text-xs border rounded-lg px-2 bg-white text-slate-600">
          <option value="all">Todos</option>
          {ICON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {/* Grid */}
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-lg border" data-testid="icon-picker-grid">
        {filtered.map(item => {
          const isSelected = value === item.id;
          return (
            <button key={item.id} onClick={() => onChange(item.id)} title={item.label}
              className={`${btnSize} rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-slate-800 text-white ring-2 ring-slate-800 ring-offset-1 scale-110' : 'bg-white text-slate-500 hover:bg-slate-200 hover:text-slate-700 border border-slate-100'}`}>
              <item.Icon style={{ fontSize: iconSize }} />
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-slate-400 py-2 w-full text-center">Sin resultados</p>}
      </div>
      <p className="text-[10px] text-slate-400">{filtered.length} iconos disponibles</p>
    </div>
  );
};

export default IconPicker;

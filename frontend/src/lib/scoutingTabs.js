// Lista de subsecciones (tabs) del módulo Scouting / Recruiting & Talent ID.
// Módulo ligero compartido por ScoutingModule.js (vista) y WhatsAppShell.js
// (sidebar del Modo Pro) — evita arrastrar todo ScoutingModule al bundle principal.
import { Users, Trello, ClipboardCheck, Trophy, BellRing, Contact, Map as MapIcon } from 'lucide-react';

export const SCOUTING_TABS = [
  { key: 'prospects', label: 'Prospectos', icon: Users },
  { key: 'pipeline', label: 'Pipeline', icon: Trello },
  { key: 'evaluation', label: 'Evaluación', icon: ClipboardCheck },
  { key: 'ranking', label: 'Ranking', icon: Trophy },
  { key: 'alerts', label: 'Alertas', icon: BellRing },
  { key: 'contacts', label: 'Contactos', icon: Contact },
  { key: 'map', label: 'Mapa', icon: MapIcon },
];

export default SCOUTING_TABS;

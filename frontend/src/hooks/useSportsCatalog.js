import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const API_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1
  ? process.env.REACT_APP_BACKEND_URL
  : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));

const sportIcons = {
  'boxeo': '🥊', 'boxing': '🥊',
  'taekwondo': '🥋', 'karate': '🥋', 'judo': '🥋', 'artes marciales': '🥋',
  'wrestling': '🤼', 'lucha': '🤼', 'lucha libre': '🤼',
  'atletismo': '🏃‍♂️', 'track': '🏃‍♂️',
  'natación': '🏊', 'swimming': '🏊', 'natacion': '🏊',
  'fútbol': '⚽', 'futbol': '⚽', 'soccer': '⚽', 'football': '⚽',
  'básquetbol': '🏀', 'baloncesto': '🏀', 'basketball': '🏀', 'basquetbol': '🏀',
  'tenis': '🎾', 'tennis': '🎾', 'tenis de mesa': '🏓', 'ping pong': '🏓',
  'ciclismo': '🚴', 'cycling': '🚴',
  'voleibol': '🏐', 'volleyball': '🏐', 'voley': '🏐',
  'béisbol': '⚾', 'baseball': '⚾', 'beisbol': '⚾', 'softball': '🥎',
  'golf': '⛳',
  'rugby': '🏉',
  'hockey': '🏒', 'hockey sobre hielo': '🏒', 'hockey hierba': '🏑',
  'gimnasia': '🤸', 'gymnastics': '🤸', 'gimnasia artística': '🤸', 'gimnasia rítmica': '🤸',
  'esgrima': '🤺', 'fencing': '🤺',
  'halterofilia': '🏋️', 'weightlifting': '🏋️', 'powerlifting': '🏋️', 'levantamiento de pesas': '🏋️',
  'balonmano': '🤾', 'handball': '🤾',
  'waterpolo': '🤽', 'polo acuático': '🤽',
  'remo': '🚣', 'rowing': '🚣', 'canotaje': '🛶', 'kayak': '🛶',
  'esquí': '⛷️', 'ski': '⛷️', 'esqui': '⛷️',
  'patinaje': '⛸️', 'skating': '⛸️', 'patinaje artístico': '⛸️',
  'triatlón': '🏊‍♂️', 'triatlon': '🏊‍♂️', 'triathlon': '🏊‍♂️',
  'maratón': '🏅', 'maraton': '🏅', 'marathon': '🏅',
  'surf': '🏄', 'surfing': '🏄',
  'escalada': '🧗', 'climbing': '🧗',
  'tiro con arco': '🏹', 'archery': '🏹',
  'equitación': '🏇', 'horse riding': '🏇', 'equitacion': '🏇',
  'badminton': '🏸', 'bádminton': '🏸',
  'snowboard': '🏂',
  'cricket': '🏏',
  'polo': '🏇',
  'vela': '⛵', 'sailing': '⛵',
  'buceo': '🤿', 'diving': '🤿',
  'crossfit': '💪', 'fitness': '💪',
  'mma': '🥊', 'artes marciales mixtas': '🥊',
};

/**
 * useSportsCatalog({ t })
 *
 * Catálogo de deportes + categorías (estado, fetch y CRUD).
 */
export const useSportsCatalog = ({ t }) => {
  const [sportsCatalog, setSportsCatalog] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '🏆', color: '#3B82F6' });
  const [newSport, setNewSport] = useState({ name: '', category_id: '', icon: '🏃' });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSport, setShowAddSport] = useState(null); // category_id or null
  const [editingSportId, setEditingSportId] = useState(null);
  const [editingSportCharacterization, setEditingSportCharacterization] = useState({});

  const getSportIcon = (sport) => {
    if (sport.icon && sport.icon !== '🏃') return sport.icon;
    const key = sport.name?.toLowerCase().trim();
    return sportIcons[key] || '🏃‍♂️';
  };

  const allSports = sportsCatalog.flatMap(cat => cat.sports || []);

  const fetchSportsCatalog = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports/catalog`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSportsCatalog(data);
      }
    } catch (error) {
      console.error('Error fetching sports catalog:', error);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newCategory)
      });
      if (response.ok) {
        await fetchSportsCatalog();
        setNewCategory({ name: '', icon: '🏆', color: '#3B82F6' });
        setShowAddCategory(false);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleCreateSport = async (categoryId) => {
    if (!newSport.name) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newSport.name, category_id: categoryId })
      });
      if (response.ok) {
        await fetchSportsCatalog();
        setNewSport({ name: '', category_id: '' });
        setShowAddSport(null);
      }
    } catch (error) {
      console.error('Error creating sport:', error);
    }
  };

  const handleDeleteSport = async (sportId) => {
    if (!window.confirm('¿Eliminar este deporte?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/sports/${sportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchSportsCatalog();
    } catch (error) {
      console.error('Error deleting sport:', error);
    }
  };

  const handleSaveSportCharacterization = async (sportId, characterization) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports/${sportId}/characterization`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ characterization })
      });
      if (response.ok) {
        await fetchSportsCatalog();
        toast.success(t('data.caracterizacion_tecnica_guardada'));
      }
    } catch (error) {
      console.error('Error saving sport characterization:', error);
      toast.error(t('data.error_al_guardar_la_caracterizacion'));
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('¿Eliminar esta categoría y todos sus deportes?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/sports/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchSportsCatalog();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  useEffect(() => { fetchSportsCatalog(); }, []);

  return {
    sportsCatalog, setSportsCatalog,
    newCategory, setNewCategory,
    newSport, setNewSport,
    showAddCategory, setShowAddCategory,
    showAddSport, setShowAddSport,
    editingSportId, setEditingSportId,
    editingSportCharacterization, setEditingSportCharacterization,
    getSportIcon, allSports,
    fetchSportsCatalog, handleCreateCategory, handleCreateSport,
    handleDeleteSport, handleSaveSportCharacterization, handleDeleteCategory,
  };
};

export default useSportsCatalog;

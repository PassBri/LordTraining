import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Badge } from './ui/badge';
import {
  Plus, Trash2, Edit, Save, X, ChevronDown, ChevronRight, Search,
  Dumbbell, Activity, Target, Loader2, LayoutGrid, List, Star, StarOff,
  Copy, Filter, Zap, Heart, Wind, Shield, Brain, Eye, Timer,
  Footprints, Download, Palette
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import IconPicker, { getIconById, ICON_CATALOG } from './IconPicker';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// ═══ COLOR PALETTE ═══
const COLOR_PALETTE = [
  { id: 'rose', border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700', swatch: 'bg-rose-500' },
  { id: 'red', border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', swatch: 'bg-red-500' },
  { id: 'orange', border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', swatch: 'bg-orange-500' },
  { id: 'amber', border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', swatch: 'bg-amber-500' },
  { id: 'yellow', border: 'border-l-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700', swatch: 'bg-yellow-500' },
  { id: 'lime', border: 'border-l-lime-500', bg: 'bg-lime-50', text: 'text-lime-700', dot: 'bg-lime-500', badge: 'bg-lime-100 text-lime-700', swatch: 'bg-lime-500' },
  { id: 'emerald', border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', swatch: 'bg-emerald-500' },
  { id: 'teal', border: 'border-l-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500', badge: 'bg-teal-100 text-teal-700', swatch: 'bg-teal-500' },
  { id: 'cyan', border: 'border-l-cyan-500', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-700', swatch: 'bg-cyan-500' },
  { id: 'blue', border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700', swatch: 'bg-blue-500' },
  { id: 'indigo', border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700', swatch: 'bg-indigo-500' },
  { id: 'violet', border: 'border-l-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700', swatch: 'bg-violet-500' },
  { id: 'purple', border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700', swatch: 'bg-purple-500' },
  { id: 'fuchsia', border: 'border-l-fuchsia-500', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', dot: 'bg-fuchsia-500', badge: 'bg-fuchsia-100 text-fuchsia-700', swatch: 'bg-fuchsia-500' },
  { id: 'pink', border: 'border-l-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-700', swatch: 'bg-pink-500' },
  { id: 'slate', border: 'border-l-slate-500', bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700', swatch: 'bg-slate-500' },
];

// Default icon mapping for existing categories (using Material Design IDs)
const DEFAULT_CATEGORY_ICONS = {
  fuerza: 'fitness_center', velocidad: 'electric_bolt', resistencia: 'monitor_heart', flexibilidad: 'self_improvement',
  equilibrio_estabilidad: 'balance', habilidades_motrices: 'sports_gymnastics',
  capacidades_coordinativas: 'psychology', desplazamientos_agilidad: 'directions_run',
  movilidad_articular: 'accessibility_new',
};

// Default color mapping for existing categories
const DEFAULT_CATEGORY_COLORS = {
  fuerza: 'rose', velocidad: 'amber', resistencia: 'blue', flexibilidad: 'emerald',
  equilibrio_estabilidad: 'violet', habilidades_motrices: 'orange',
  capacidades_coordinativas: 'cyan', desplazamientos_agilidad: 'red',
  movilidad_articular: 'teal',
};

// Helper: get icon component from id (Material Design)
const getIconComponent = (iconId) => getIconById(iconId);

// Helper: get color accent from id
const getColorAccent = (colorId) => {
  return COLOR_PALETTE.find(c => c.id === colorId) || COLOR_PALETTE[0];
};

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { id: 'principiante', label: 'Principiante', color: 'bg-green-100 text-green-700', icon: '1' },
  { id: 'intermedio', label: 'Intermedio', color: 'bg-yellow-100 text-yellow-700', icon: '2' },
  { id: 'avanzado', label: 'Avanzado', color: 'bg-orange-100 text-orange-700', icon: '3' },
  { id: 'elite', label: 'Elite', color: 'bg-red-100 text-red-700', icon: '4' },
];

// ========== DATOS INICIALES (PRESERVED EXACTLY) ==========

// ========== DATOS INICIALES (250+ EJERCICIOS - ORIGINAL COMPLETO) ==========
export const EJERCICIOS_INICIALES = {
  'fuerza': {
    nombre: 'Fuerza',
    color: 'bg-red-100 text-red-700 border-red-300',
    subcategorias: {
      'hombro_brazo': {
        nombre: 'Hombro y Brazo (Shoulder and Arm)',
        ejercicios: [
          { nombre: 'Lateral Raise (Elevación lateral)', musculos: 'Deltoides lateral', equipo: 'Mancuernas' },
          { nombre: 'Front Raise (Elevación frontal)', musculos: 'Deltoides anterior', equipo: 'Mancuernas' },
          { nombre: 'Push-ups (Flexiones)', musculos: 'Pectorales, Tríceps, Deltoides', equipo: 'Ninguno' },
          { nombre: 'Military Press (Press militar)', musculos: 'Deltoides, Tríceps', equipo: 'Barra/Mancuernas' },
          { nombre: 'Bicep Curl (Curl de bíceps)', musculos: 'Bíceps', equipo: 'Mancuernas/Barra' },
          { nombre: 'Triceps Extension', musculos: 'Tríceps', equipo: 'Mancuernas/Cable' },
          { nombre: 'Bench Dips (Fondos en banco)', musculos: 'Tríceps, Pectorales', equipo: 'Banco' },
          { nombre: 'Reverse Fly (Vuelo invertido)', musculos: 'Deltoides posterior, Romboides', equipo: 'Mancuernas' },
          { nombre: 'Close-Grip Press (Press agarre cerrado)', musculos: 'Tríceps, Pectorales', equipo: 'Barra' }
        ]
      },
      'pierna_gluteo': {
        nombre: 'Pierna y Glúteo (Leg and Glute)',
        ejercicios: [
          { nombre: 'Hip Lift (Elevación de cadera)', musculos: 'Glúteos, Isquiotibiales', equipo: 'Ninguno' },
          { nombre: 'Goblet Squat on Plate', musculos: 'Cuádriceps, Glúteos, Core', equipo: 'Mancuerna/Kettlebell, Plato' },
          { nombre: 'Front Squat (Sentadilla frontal)', musculos: 'Cuádriceps, Core', equipo: 'Barra, Rack' },
          { nombre: 'Weighted Squat (Sentadilla con peso)', musculos: 'Cuádriceps, Glúteos, Isquiotibiales', equipo: 'Barra' },
          { nombre: 'Jump Squat (Sentadilla con salto)', musculos: 'Piernas, Glúteos', equipo: 'Ninguno' },
          { nombre: 'Step-Up (Box Step)', musculos: 'Cuádriceps, Glúteos', equipo: 'Cajón/Step' },
          { nombre: 'Jump Lunges (Zancadas con salto)', musculos: 'Piernas, Glúteos', equipo: 'Ninguno' },
          { nombre: 'Isometric Squats (Sentadilla isométrica)', musculos: 'Cuádriceps', equipo: 'Ninguno' },
          { nombre: 'Leg Raise (Elevación de pierna)', musculos: 'Flexores de cadera, Abdomen', equipo: 'Ninguno' },
          { nombre: 'Abduction (Abducción)', musculos: 'Glúteo medio', equipo: 'Máquina/Banda' },
          { nombre: 'Adduction (Aducción)', musculos: 'Aductores', equipo: 'Máquina/Banda' },
          { nombre: 'Lateral Lunge (Zancada lateral)', musculos: 'Aductores, Cuádriceps', equipo: 'Ninguno' },
          { nombre: 'Calf Raise (Elevación de pantorrilla)', musculos: 'Gemelos, Sóleo', equipo: 'Ninguno/Máquina' },
          { nombre: 'Hip Thrust', musculos: 'Glúteos, Isquiotibiales', equipo: 'Banco, Barra' },
          { nombre: 'Romanian Deadlift (Peso muerto rumano)', musculos: 'Isquiotibiales, Glúteos, Espalda baja', equipo: 'Barra/Mancuernas' },
          { nombre: 'Reverse Lunge (Zancada inversa)', musculos: 'Cuádriceps, Glúteos', equipo: 'Ninguno/Mancuernas' }
        ]
      },
      'pecho_espalda': {
        nombre: 'Pecho y Espalda (Chest and Back)',
        ejercicios: [
          { nombre: 'Decline Press (Press declinado)', musculos: 'Pectoral inferior, Tríceps', equipo: 'Barra, Banco declinado' },
          { nombre: 'Incline Press (Press inclinado)', musculos: 'Pectoral superior, Deltoides', equipo: 'Barra, Banco inclinado' },
          { nombre: 'Chest Fly (Aperturas de pecho)', musculos: 'Pectorales', equipo: 'Mancuernas/Cable' },
          { nombre: 'Pullover', musculos: 'Dorsal, Pectorales, Tríceps', equipo: 'Mancuerna, Banco' },
          { nombre: 'One-Arm Row (Remo a una mano)', musculos: 'Dorsal, Bíceps, Romboides', equipo: 'Mancuerna, Banco' },
          { nombre: 'Row (Remo)', musculos: 'Dorsal, Bíceps, Romboides', equipo: 'Barra/Mancuernas' }
        ]
      },
      'abdomen': {
        nombre: 'Abdomen',
        ejercicios: [
          { nombre: 'Superman', musculos: 'Espalda baja, Glúteos', equipo: 'Colchoneta' },
          { nombre: 'Isometric Plank (Plancha isométrica)', musculos: 'Core completo', equipo: 'Colchoneta' },
          { nombre: 'Reverse Plank (Plancha inversa)', musculos: 'Core, Glúteos, Hombros', equipo: 'Colchoneta' },
          { nombre: 'Spiderman Plank', musculos: 'Core, Oblicuos, Flexores de cadera', equipo: 'Colchoneta' },
          { nombre: 'Mountain Climbers (Escaladores)', musculos: 'Core, Hombros, Piernas', equipo: 'Ninguno' },
          { nombre: 'Crunches (Abdominales)', musculos: 'Recto abdominal', equipo: 'Colchoneta' }
        ]
      },
      'oblicuos': {
        nombre: 'Oblicuos (Oblique Abs)',
        ejercicios: [
          { nombre: 'Bicycle Crunch (Abdominales de bicicleta)', musculos: 'Oblicuos, Recto abdominal', equipo: 'Colchoneta' },
          { nombre: 'Abdominales de tijera', musculos: 'Oblicuos, Recto abdominal', equipo: 'Colchoneta' },
          { nombre: 'Side Twisting Plank (Plancha con giro lateral)', musculos: 'Oblicuos, Core', equipo: 'Colchoneta' }
        ]
      },
      'kettlebell_cuerpo_completo': {
        nombre: 'Kettlebell Cuerpo Completo (Full Body Kettlebell)',
        ejercicios: [
          { nombre: 'Half Squat with Arm Raise', musculos: 'Piernas, Hombros, Core', equipo: 'Kettlebell' },
          { nombre: 'Swing', musculos: 'Glúteos, Isquiotibiales, Core, Hombros', equipo: 'Kettlebell' },
          { nombre: 'Around the Body', musculos: 'Core, Hombros, Brazos', equipo: 'Kettlebell' },
          { nombre: 'Windmill', musculos: 'Core, Oblicuos, Hombros, Cadera', equipo: 'Kettlebell' },
          { nombre: 'Twist', musculos: 'Oblicuos, Core', equipo: 'Kettlebell' },
          { nombre: 'Reverse Lunge Around the Body', musculos: 'Piernas, Glúteos, Core', equipo: 'Kettlebell' },
          { nombre: 'Abs (Abdominales con Kettlebell)', musculos: 'Core completo', equipo: 'Kettlebell' }
        ]
      },
      'fuerza_maxima': {
        nombre: 'Fuerza Máxima',
        ejercicios: [
          { nombre: 'Sentadilla', musculos: 'Cuádriceps, Glúteos, Isquiotibiales', equipo: 'Barra, Rack' },
          { nombre: 'Press de banca', musculos: 'Pectorales, Tríceps, Deltoides anterior', equipo: 'Barra, Banco' },
          { nombre: 'Peso muerto', musculos: 'Espalda baja, Glúteos, Isquiotibiales', equipo: 'Barra' },
          { nombre: 'Press militar', musculos: 'Deltoides, Tríceps', equipo: 'Barra' },
          { nombre: 'Remo con barra', musculos: 'Dorsal, Bíceps, Romboides', equipo: 'Barra' },
          { nombre: 'Dominadas', musculos: 'Dorsal, Bíceps', equipo: 'Barra de dominadas' }
        ]
      },
      'fuerza_explosiva': {
        nombre: 'Fuerza Explosiva / Potencia',
        ejercicios: [
          { nombre: 'Cargada de potencia (Power clean)', musculos: 'Cuerpo completo', equipo: 'Barra' },
          { nombre: 'Arrancada (Snatch)', musculos: 'Cuerpo completo', equipo: 'Barra' },
          { nombre: 'Envión (Clean & Jerk)', musculos: 'Cuerpo completo', equipo: 'Barra' },
          { nombre: 'Salto al cajón', musculos: 'Piernas, Glúteos', equipo: 'Cajón pliométrico' },
          { nombre: 'Salto vertical', musculos: 'Cuádriceps, Glúteos', equipo: 'Ninguno' },
          { nombre: 'Salto horizontal', musculos: 'Piernas, Core', equipo: 'Ninguno' },
          { nombre: 'Lanzamiento de balón medicinal', musculos: 'Core, Hombros', equipo: 'Balón medicinal' },
          { nombre: 'Push press', musculos: 'Hombros, Piernas', equipo: 'Barra' },
          { nombre: 'Salto con contramovimiento (CMJ)', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Drop jump', musculos: 'Piernas, Tendones', equipo: 'Cajón' }
        ]
      },
      'fuerza_resistencia': {
        nombre: 'Fuerza Resistencia',
        ejercicios: [
          { nombre: 'Circuito de pesas', musculos: 'Cuerpo completo', equipo: 'Mancuernas, Barras' },
          { nombre: 'Sentadilla con peso corporal', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Flexiones de brazos', musculos: 'Pectorales, Tríceps', equipo: 'Ninguno' },
          { nombre: 'Fondos en paralelas', musculos: 'Tríceps, Pectorales', equipo: 'Paralelas' },
          { nombre: 'Burpees', musculos: 'Cuerpo completo', equipo: 'Ninguno' },
          { nombre: 'Mountain climbers', musculos: 'Core, Hombros', equipo: 'Ninguno' },
          { nombre: 'Zancadas con peso', musculos: 'Piernas, Glúteos', equipo: 'Mancuernas' },
          { nombre: 'Planchas', musculos: 'Core', equipo: 'Ninguno' }
        ]
      },
      'fuerza_funcional': {
        nombre: 'Fuerza Funcional',
        ejercicios: [
          { nombre: 'Kettlebell swing', musculos: 'Glúteos, Core, Hombros', equipo: 'Kettlebell' },
          { nombre: 'Turkish get-up', musculos: 'Cuerpo completo', equipo: 'Kettlebell' },
          { nombre: 'Farmer walk', musculos: 'Agarre, Core, Piernas', equipo: 'Mancuernas/Kettlebells' },
          { nombre: 'Sentadilla goblet', musculos: 'Piernas, Core', equipo: 'Kettlebell' },
          { nombre: 'Renegade rows', musculos: 'Core, Dorsal', equipo: 'Mancuernas' },
          { nombre: 'Thruster', musculos: 'Cuerpo completo', equipo: 'Barra/Mancuernas' }
        ]
      }
    }
  },
  'velocidad': {
    nombre: 'Velocidad',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    subcategorias: {
      'sprints_pista': {
        nombre: 'Sprints - Pruebas de Velocidad en Pista (Track Sprint Speed Tests)',
        ejercicios: [
          { nombre: 'Sprint 10 metros', musculos: 'Piernas, Glúteos', equipo: 'Pista' },
          { nombre: 'Sprint 20 metros', musculos: 'Piernas, Glúteos', equipo: 'Pista' },
          { nombre: 'Sprint 40 metros', musculos: 'Piernas, Glúteos', equipo: 'Pista' },
          { nombre: 'Sprint 60 metros', musculos: 'Piernas, Glúteos', equipo: 'Pista' },
          { nombre: 'Sprint 100 metros', musculos: 'Piernas, Glúteos', equipo: 'Pista' },
          { nombre: 'Sprint 200 metros', musculos: 'Piernas, Glúteos', equipo: 'Pista' },
          { nombre: 'Sprint 400 metros', musculos: 'Piernas, Glúteos, Resistencia', equipo: 'Pista' },
          { nombre: 'Floating Sprints (Sprints flotantes)', musculos: 'Piernas, Glúteos', equipo: 'Pista' }
        ]
      },
      'sprints_intervalos_cortos': {
        nombre: 'Sprints - Intervalos Cortos (Short Intervals)',
        ejercicios: [
          { nombre: 'Intervalos 10 metros', musculos: 'Piernas, Sistema anaeróbico', equipo: 'Ninguno' },
          { nombre: 'Intervalos 20 metros', musculos: 'Piernas, Sistema anaeróbico', equipo: 'Ninguno' },
          { nombre: 'Intervalos 40 metros', musculos: 'Piernas, Sistema anaeróbico', equipo: 'Ninguno' },
          { nombre: 'Intervalos 60 metros', musculos: 'Piernas, Sistema anaeróbico', equipo: 'Ninguno' },
          { nombre: 'Series mixtas (Mixed sets)', musculos: 'Piernas, Sistema anaeróbico', equipo: 'Ninguno' }
        ]
      },
      'natacion_velocidad': {
        nombre: 'Pruebas de Velocidad en Natación (Swimming Speed Tests)',
        ejercicios: [
          { nombre: 'Sprint Freestyle (Crol)', musculos: 'Cuerpo completo', equipo: 'Piscina' },
          { nombre: 'Sprint Backstroke (Espalda)', musculos: 'Cuerpo completo', equipo: 'Piscina' },
          { nombre: 'Sprint Butterfly (Mariposa)', musculos: 'Cuerpo completo', equipo: 'Piscina' },
          { nombre: 'Sprint Breaststroke (Pecho)', musculos: 'Cuerpo completo', equipo: 'Piscina' }
        ]
      },
      'remo_velocidad': {
        nombre: 'Pruebas de Velocidad en Remo (Rowing Sprint Events)',
        ejercicios: [
          { nombre: 'Sprint 100 metros', musculos: 'Piernas, Espalda, Brazos', equipo: 'Ergómetro/Bote' },
          { nombre: 'Sprint 250 metros', musculos: 'Piernas, Espalda, Brazos', equipo: 'Ergómetro/Bote' },
          { nombre: 'Sprint 500 metros', musculos: 'Piernas, Espalda, Brazos', equipo: 'Ergómetro/Bote' },
          { nombre: 'Sprint 1000 metros', musculos: 'Piernas, Espalda, Brazos', equipo: 'Ergómetro/Bote' },
          { nombre: 'Sprint 2000 metros', musculos: 'Piernas, Espalda, Brazos', equipo: 'Ergómetro/Bote' },
          { nombre: 'Intervalos mixtos (Mixed Intervals)', musculos: 'Cuerpo completo', equipo: 'Ergómetro/Bote' }
        ]
      },
      'velocidad_reaccion': {
        nombre: 'Velocidad de Reacción',
        ejercicios: [
          { nombre: 'Salidas con señal visual', musculos: 'Sistema nervioso, Piernas', equipo: 'Conos, Luces' },
          { nombre: 'Salidas con señal auditiva', musculos: 'Sistema nervioso, Piernas', equipo: 'Silbato' },
          { nombre: 'Ejercicios de reacción con balón', musculos: 'Coordinación', equipo: 'Balón' },
          { nombre: 'Cambios de dirección reactivos', musculos: 'Piernas, Core', equipo: 'Conos' },
          { nombre: 'Atrapar objetos en caída', musculos: 'Manos, Coordinación', equipo: 'Pelotas' },
          { nombre: 'Salidas desde diferentes posiciones', musculos: 'Piernas', equipo: 'Ninguno' }
        ]
      },
      'frecuencia_movimiento': {
        nombre: 'Frecuencia de Movimiento',
        ejercicios: [
          { nombre: 'Skipping alto', musculos: 'Flexores de cadera', equipo: 'Ninguno' },
          { nombre: 'Skipping bajo', musculos: 'Tobillos, Gemelos', equipo: 'Ninguno' },
          { nombre: 'Escalera de agilidad - Pies rápidos', musculos: 'Piernas, Coordinación', equipo: 'Escalera' },
          { nombre: 'Tapping', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Carrera de frecuencia', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Dribling rápido', musculos: 'Coordinación', equipo: 'Balón' }
        ]
      },
      'aceleracion': {
        nombre: 'Aceleración',
        ejercicios: [
          { nombre: 'Salidas de tacos', musculos: 'Piernas, Core', equipo: 'Tacos de salida' },
          { nombre: 'Salidas en 3 puntos', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Salidas en 4 puntos', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Aceleraciones progresivas', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Aceleraciones desde diferentes posiciones', musculos: 'Piernas', equipo: 'Ninguno' }
        ]
      }
    }
  },
  'resistencia': {
    nombre: 'Resistencia',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    subcategorias: {
      'carrera_continua': {
        nombre: 'Carrera - Series Largas (Long Sets)',
        ejercicios: [
          { nombre: 'Timed Run (Carrera por tiempo)', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno', duracion: '20-60 min' },
          { nombre: 'Fartlek', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno', duracion: '20-45 min' },
          { nombre: 'Threshold Runs (Carreras de umbral)', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno', duracion: '20-40 min' },
          { nombre: 'Long Intervals (Intervalos largos)', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno' }
        ]
      },
      'modalidades_cardio': {
        nombre: 'Modalidades Cardiovasculares',
        ejercicios: [
          { nombre: 'Running (Carrera)', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno' },
          { nombre: 'Cycling (Ciclismo)', musculos: 'Piernas', equipo: 'Bicicleta' },
          { nombre: 'Jump Rope (Cuerda de saltar)', musculos: 'Piernas, Coordinación', equipo: 'Cuerda' },
          { nombre: 'Rowing (Remo)', musculos: 'Cuerpo completo', equipo: 'Ergómetro' },
          { nombre: 'Swimming (Natación)', musculos: 'Cuerpo completo', equipo: 'Piscina' }
        ]
      },
      'hiit': {
        nombre: 'Ejercicios de Intervalos de Alta Intensidad (High-Intensity Interval Training)',
        ejercicios: [
          { nombre: 'Burpees', musculos: 'Cuerpo completo', equipo: 'Ninguno' },
          { nombre: 'Mountain Climbers (Escaladores)', musculos: 'Core, Hombros, Piernas', equipo: 'Ninguno' },
          { nombre: 'Box Jumps (Saltos al cajón)', musculos: 'Piernas, Glúteos', equipo: 'Cajón' },
          { nombre: 'Windmill', musculos: 'Core, Oblicuos', equipo: 'Kettlebell' },
          { nombre: 'Twist', musculos: 'Core, Oblicuos', equipo: 'Ninguno' },
          { nombre: 'Shoulder Tap Plank (Plancha con toque de hombro)', musculos: 'Core, Hombros', equipo: 'Ninguno' },
          { nombre: 'Jumping Jacks', musculos: 'Cuerpo completo', equipo: 'Ninguno' }
        ]
      },
      'resistencia_cardiovascular': {
        nombre: 'Ejercicios de Resistencia Cardiovascular',
        ejercicios: [
          { nombre: 'Mountain Climbers', musculos: 'Core, Hombros, Piernas', equipo: 'Ninguno' }
        ]
      },
      'eventos_pista': {
        nombre: 'Eventos de Resistencia en Pista (Track Endurance Events)',
        ejercicios: [
          { nombre: '800 metros', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Pista' },
          { nombre: '1500 metros', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Pista' },
          { nombre: '3000 metros', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Pista' },
          { nombre: '5000 metros', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Pista' },
          { nombre: '10000 metros', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Pista' }
        ]
      },
      'eventos_carretera': {
        nombre: 'Eventos de Resistencia en Carretera (Road Endurance Events)',
        ejercicios: [
          { nombre: '5 kilómetros (5K)', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno' },
          { nombre: '10 kilómetros (10K)', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno' },
          { nombre: 'Media Maratón (21 kilómetros)', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno' },
          { nombre: 'Maratón (42 kilómetros)', musculos: 'Piernas, Sistema cardiovascular', equipo: 'Ninguno' },
          { nombre: 'Trail Running / Mountain Running', musculos: 'Piernas, Core, Sistema cardiovascular', equipo: 'Terreno montañoso' }
        ]
      },
      'resistencia_anaerobica': {
        nombre: 'Resistencia Anaeróbica',
        ejercicios: [
          { nombre: 'Intervalos cortos (30" - 30")', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Intervalos medios (1\' - 1\')', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Intervalos largos (3\' - 3\')', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Series de 200m', musculos: 'Piernas', equipo: 'Pista' },
          { nombre: 'Series de 400m', musculos: 'Piernas', equipo: 'Pista' },
          { nombre: 'Series de 800m', musculos: 'Piernas', equipo: 'Pista' },
          { nombre: 'Tabata', musculos: 'Cuerpo completo', equipo: 'Varios' },
          { nombre: 'HIIT', musculos: 'Cuerpo completo', equipo: 'Varios' },
          { nombre: 'Sprint intervals', musculos: 'Piernas', equipo: 'Ninguno' }
        ]
      },
      'resistencia_especifica': {
        nombre: 'Resistencia Específica',
        ejercicios: [
          { nombre: 'Circuito técnico-táctico', musculos: 'Específico del deporte', equipo: 'Específico' },
          { nombre: 'Juegos reducidos', musculos: 'Específico del deporte', equipo: 'Específico' },
          { nombre: 'Partidos de entrenamiento', musculos: 'Específico del deporte', equipo: 'Específico' },
          { nombre: 'Simulación de competencia', musculos: 'Específico del deporte', equipo: 'Específico' },
          { nombre: 'Repeticiones de gestos técnicos', musculos: 'Específico del deporte', equipo: 'Específico' }
        ]
      },
      'resistencia_mixta': {
        nombre: 'Resistencia Mixta',
        ejercicios: [
          { nombre: 'Cross training', musculos: 'Cuerpo completo', equipo: 'Varios' },
          { nombre: 'Circuito aeróbico-anaeróbico', musculos: 'Cuerpo completo', equipo: 'Varios' },
          { nombre: 'Carrera con cambios de ritmo', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Entrenamiento por estaciones', musculos: 'Cuerpo completo', equipo: 'Varios' }
        ]
      }
    }
  },
  'movilidad_articular': {
    nombre: 'Movilidad Articular',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    subcategorias: {
      'cuello_hombros': {
        nombre: 'Cuello y Hombros',
        ejercicios: [
          { nombre: 'Flexión y extensión cervical', musculos: 'Cuello', equipo: 'Ninguno' },
          { nombre: 'Flexión lateral cervical', musculos: 'Cuello', equipo: 'Ninguno' },
          { nombre: 'Rotación cervical', musculos: 'Cuello', equipo: 'Ninguno' },
          { nombre: 'Flexión y extensión alterna de hombros', musculos: 'Deltoides', equipo: 'Ninguno' },
          { nombre: 'Elevación y depresión escapular', musculos: 'Trapecio', equipo: 'Ninguno' },
          { nombre: 'Circunducción de hombros', musculos: 'Deltoides, Manguito rotador', equipo: 'Ninguno' },
          { nombre: 'Abducción y aducción alterna', musculos: 'Deltoides', equipo: 'Ninguno' },
          { nombre: 'Circunducción de hombros con brazos extendidos', musculos: 'Deltoides', equipo: 'Ninguno' },
          { nombre: 'Rotación externa e interna de hombro', musculos: 'Manguito rotador', equipo: 'Ninguno' },
          { nombre: 'Rotación externa e interna con brazo elevado', musculos: 'Manguito rotador', equipo: 'Ninguno' }
        ]
      },
      'codos_munecas': {
        nombre: 'Codos y Muñecas',
        ejercicios: [
          { nombre: 'Flexión y extensión de codo', musculos: 'Bíceps, Tríceps', equipo: 'Ninguno' },
          { nombre: 'Rotaciones de muñeca', musculos: 'Antebrazo', equipo: 'Ninguno' },
          { nombre: 'Flexión y extensión de muñeca', musculos: 'Antebrazo', equipo: 'Ninguno' },
          { nombre: 'Pronación y supinación del antebrazo', musculos: 'Antebrazo', equipo: 'Ninguno' },
          { nombre: 'Desviación radial y cubital de muñeca', musculos: 'Antebrazo', equipo: 'Ninguno' }
        ]
      },
      'columna': {
        nombre: 'Columna Vertebral',
        ejercicios: [
          { nombre: 'Rotaciones de tronco', musculos: 'Oblicuos, Core', equipo: 'Ninguno' },
          { nombre: 'Inclinaciones laterales', musculos: 'Oblicuos', equipo: 'Ninguno' },
          { nombre: 'Flexión y extensión de columna', musculos: 'Core, Espalda baja', equipo: 'Ninguno' },
          { nombre: 'Flexión lateral de columna', musculos: 'Oblicuos', equipo: 'Ninguno' }
        ]
      },
      'caderas': {
        nombre: 'Caderas',
        ejercicios: [
          { nombre: 'Abducciones de cadera', musculos: 'Glúteo medio', equipo: 'Ninguno' },
          { nombre: 'Círculos de cadera', musculos: 'Flexores de cadera', equipo: 'Ninguno' },
          { nombre: 'Rotaciones internas y externas', musculos: 'Rotadores de cadera', equipo: 'Ninguno' },
          { nombre: 'Flexión de cadera', musculos: 'Iliopsoas', equipo: 'Ninguno' },
          { nombre: 'Extensión de cadera', musculos: 'Glúteos', equipo: 'Ninguno' },
          { nombre: 'Aducción de cadera', musculos: 'Aductores', equipo: 'Ninguno' }
        ]
      },
      'rodillas_tobillos': {
        nombre: 'Rodillas y Tobillos',
        ejercicios: [
          { nombre: 'Dorsiflexión y flexión plantar', musculos: 'Tibial anterior, Gemelos', equipo: 'Ninguno' },
          { nombre: 'Flexión y extensión de rodilla', musculos: 'Cuádriceps, Isquiotibiales', equipo: 'Ninguno' },
          { nombre: 'Eversión e inversión de tobillo', musculos: 'Peroneos, Tibial posterior', equipo: 'Ninguno' }
        ]
      }
    }
  },
  'flexibilidad': {
    nombre: 'Flexibilidad',
    color: 'bg-green-100 text-green-700 border-green-300',
    subcategorias: {
      'cuello_brazos': {
        nombre: 'Cuello y Brazos',
        ejercicios: [
          { nombre: 'Estiramiento cervical', musculos: 'Cuello', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de tríceps', musculos: 'Tríceps', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de deltoides', musculos: 'Deltoides', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de dorsal ancho', musculos: 'Dorsal ancho', equipo: 'Ninguno', duracion: '30s' }
        ]
      },
      'tronco': {
        nombre: 'Tronco',
        ejercicios: [
          { nombre: 'Flexión lateral de columna', musculos: 'Oblicuos', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Postura del niño', musculos: 'Espalda, Glúteos', equipo: 'Colchoneta', duracion: '60s' },
          { nombre: 'Postura del gato', musculos: 'Core, Espalda', equipo: 'Colchoneta', duracion: '30s' },
          { nombre: 'Postura de la cobra', musculos: 'Abdominales, Flexores de cadera', equipo: 'Colchoneta', duracion: '30s' }
        ]
      },
      'cadera_piernas': {
        nombre: 'Cadera y Piernas',
        ejercicios: [
          { nombre: 'Estiramiento de cuádriceps', musculos: 'Cuádriceps', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de isquiotibiales', musculos: 'Isquiotibiales', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de aductores', musculos: 'Aductores', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de iliopsoas', musculos: 'Iliopsoas', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de glúteos', musculos: 'Glúteos', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de gastrocnemio', musculos: 'Gemelos', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de sóleo', musculos: 'Sóleo', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Estiramiento de tibial anterior', musculos: 'Tibial anterior', equipo: 'Ninguno', duracion: '30s' },
          { nombre: 'Postura de la mariposa', musculos: 'Aductores', equipo: 'Colchoneta', duracion: '60s' },
          { nombre: 'Spagat frontal', musculos: 'Isquiotibiales, Flexores de cadera', equipo: 'Colchoneta', duracion: '60s' }
        ]
      }
    }
  },
  'equilibrio_estabilidad': {
    nombre: 'Equilibrio y Estabilidad',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    subcategorias: {
      'equilibrio_basico': {
        nombre: 'Equilibrio Básico',
        ejercicios: [
          { nombre: 'Equilibrio en una pierna', musculos: 'Core, Piernas', equipo: 'Ninguno' },
          { nombre: 'Alcance anterior', musculos: 'Core, Piernas', equipo: 'Ninguno' },
          { nombre: 'Alcance lateral', musculos: 'Core, Piernas', equipo: 'Ninguno' },
          { nombre: 'Alcance posterior', musculos: 'Core, Piernas', equipo: 'Ninguno' },
          { nombre: 'Balanceo con cambio de peso', musculos: 'Core', equipo: 'Ninguno' },
          { nombre: 'Equilibrio en estrella', musculos: 'Core, Piernas', equipo: 'Ninguno' },
          { nombre: 'Caminar de puntillas', musculos: 'Gemelos, Core', equipo: 'Ninguno' },
          { nombre: 'Caminar en tándem', musculos: 'Core', equipo: 'Ninguno' },
          { nombre: 'Caminar de talones', musculos: 'Tibial anterior, Core', equipo: 'Ninguno' },
          { nombre: 'Barra de equilibrio', musculos: 'Core, Piernas', equipo: 'Barra de equilibrio' }
        ]
      },
      'bases_inestables': {
        nombre: 'Bases Inestables',
        ejercicios: [
          { nombre: 'Disco de equilibrio', musculos: 'Core, Tobillos', equipo: 'Disco de equilibrio' },
          { nombre: 'Tabla de decline', musculos: 'Core, Tobillos', equipo: 'Tabla de decline' },
          { nombre: 'Fitball', musculos: 'Core', equipo: 'Fitball' },
          { nombre: 'Tabla de equilibrio', musculos: 'Core, Tobillos', equipo: 'Tabla de equilibrio' },
          { nombre: 'Bosu', musculos: 'Core, Piernas', equipo: 'Bosu' }
        ]
      },
      'estabilidad_avanzada': {
        nombre: 'Estabilidad Avanzada',
        ejercicios: [
          { nombre: 'Plancha frontal', musculos: 'Core', equipo: 'Colchoneta', duracion: '30-60s' },
          { nombre: 'Pistol squat', musculos: 'Cuádriceps, Glúteos, Core', equipo: 'Ninguno' },
          { nombre: 'Parada de manos', musculos: 'Hombros, Core, Brazos', equipo: 'Pared' },
          { nombre: 'Zancada lateral a una pierna', musculos: 'Aductores, Cuádriceps', equipo: 'Ninguno' },
          { nombre: 'Postura de silla a una pierna', musculos: 'Cuádriceps, Core', equipo: 'Ninguno' },
          { nombre: 'Elevación de talones (puntillas)', musculos: 'Gemelos', equipo: 'Ninguno' }
        ]
      }
    }
  },
  'habilidades_motrices': {
    nombre: 'Habilidades Motrices',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    subcategorias: {
      'locomocion': {
        nombre: 'Locomoción',
        ejercicios: [
          { nombre: 'Caminar', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Correr', musculos: 'Piernas, Core', equipo: 'Ninguno' },
          { nombre: 'Saltar', musculos: 'Piernas', equipo: 'Ninguno' },
          { nombre: 'Deslizar / Gatear', musculos: 'Cuerpo completo', equipo: 'Ninguno' },
          { nombre: 'Rodar', musculos: 'Core', equipo: 'Colchoneta' },
          { nombre: 'Sentarse / Levantarse', musculos: 'Piernas, Core', equipo: 'Ninguno' },
          { nombre: 'Esquivar', musculos: 'Piernas, Core', equipo: 'Ninguno' },
          { nombre: 'Subir / Bajar / Trepar', musculos: 'Cuerpo completo', equipo: 'Escaleras, estructuras' }
        ]
      },
      'manipulacion': {
        nombre: 'Manipulación',
        ejercicios: [
          { nombre: 'Atrapar', musculos: 'Brazos, Manos', equipo: 'Balón' },
          { nombre: 'Lanzar', musculos: 'Hombros, Brazos', equipo: 'Balón' },
          { nombre: 'Golpear (Driblar, patear)', musculos: 'Piernas, Brazos', equipo: 'Balón' },
          { nombre: 'Batear', musculos: 'Core, Brazos', equipo: 'Bate, pelota' }
        ]
      },
      'estabilizacion': {
        nombre: 'Estabilización',
        ejercicios: [
          { nombre: 'Estirar / Flexionar', musculos: 'Cuerpo completo', equipo: 'Ninguno' },
          { nombre: 'Rotar', musculos: 'Core', equipo: 'Ninguno' },
          { nombre: 'Balancearse', musculos: 'Core', equipo: 'Ninguno' },
          { nombre: 'Oscilar', musculos: 'Cuerpo completo', equipo: 'Ninguno' },
          { nombre: 'Inclinarse', musculos: 'Core', equipo: 'Ninguno' }
        ]
      }
    }
  },
  'capacidades_coordinativas': {
    nombre: 'Capacidades Coordinativas',
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    subcategorias: {
      'generales': {
        nombre: 'Capacidades Generales',
        ejercicios: [
          { nombre: 'Regulación del movimiento', musculos: 'Sistema nervioso', equipo: 'Varios' },
          { nombre: 'Adaptación y cambio motor', musculos: 'Sistema nervioso', equipo: 'Varios' }
        ]
      },
      'especificas': {
        nombre: 'Capacidades Específicas',
        ejercicios: [
          { nombre: 'Orientación espacial', musculos: 'Sistema nervioso', equipo: 'Conos, marcas' },
          { nombre: 'Equilibrio', musculos: 'Core, Piernas', equipo: 'Varios' },
          { nombre: 'Reacción', musculos: 'Sistema nervioso', equipo: 'Señales visuales/auditivas' },
          { nombre: 'Ritmo', musculos: 'Sistema nervioso', equipo: 'Música, metrónomo' },
          { nombre: 'Anticipación', musculos: 'Sistema nervioso', equipo: 'Varios' },
          { nombre: 'Diferenciación', musculos: 'Sistema nervioso', equipo: 'Varios' },
          { nombre: 'Acoplamiento', musculos: 'Sistema nervioso', equipo: 'Varios' }
        ]
      },
      'complejas': {
        nombre: 'Capacidades Complejas',
        ejercicios: [
          { nombre: 'Desarrollo motor', musculos: 'Cuerpo completo', equipo: 'Varios' },
          { nombre: 'Agilidad', musculos: 'Cuerpo completo', equipo: 'Conos, escalera' }
        ]
      }
    }
  },
  'desplazamientos_agilidad': {
    nombre: 'Desplazamientos y Agilidad',
    color: 'bg-red-100 text-red-700 border-red-300',
    subcategorias: {
      'locomocion': {
        nombre: 'Locomoción',
        ejercicios: [
          { nombre: 'Sprints', musculos: 'Piernas, Glúteos', equipo: 'Ninguno' },
          { nombre: 'Slalom', musculos: 'Piernas, Core', equipo: 'Conos' },
          { nombre: 'Shuttle runs', musculos: 'Piernas', equipo: 'Conos' },
          { nombre: 'Desplazamientos laterales', musculos: 'Aductores, Abductores', equipo: 'Ninguno' },
          { nombre: 'Skipping', musculos: 'Piernas, Core', equipo: 'Ninguno' },
          { nombre: 'Carrera hacia atrás', musculos: 'Isquiotibiales, Glúteos', equipo: 'Ninguno' },
          { nombre: 'Pasos cruzados (Crossover)', musculos: 'Piernas, Core', equipo: 'Ninguno' },
          { nombre: 'Bear crawl (Gateo de oso)', musculos: 'Cuerpo completo', equipo: 'Ninguno' },
          { nombre: 'Ejercicios de escalera', musculos: 'Piernas, Coordinación', equipo: 'Escalera de agilidad' },
          { nombre: 'Bounding (Saltos amplios)', musculos: 'Piernas, Glúteos', equipo: 'Ninguno' },
          { nombre: 'Rodillas altas en movimiento', musculos: 'Flexores de cadera', equipo: 'Ninguno' },
          { nombre: 'Box drills', musculos: 'Piernas', equipo: 'Conos, cajas' },
          { nombre: 'Suicidios', musculos: 'Piernas, Resistencia', equipo: 'Líneas marcadas' },
          { nombre: 'Circuitos de agilidad', musculos: 'Cuerpo completo', equipo: 'Varios' }
        ]
      }
    }
  }
};


const ExerciseLibrary = ({ athleteId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubcategories, setExpandedSubcategories] = useState({});
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [filterEquipo, setFilterEquipo] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('exercise_favorites') || '[]'); } catch { return []; }
  });
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  
  // Estados para edición (PRESERVED)
  const [categories, setCategories] = useState(EJERCICIOS_INICIALES);
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Estados para agregar nuevos (PRESERVED)
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(null);
  const [showAddExercise, setShowAddExercise] = useState(null);
  
  // Formularios (PRESERVED)
  const [newCategory, setNewCategory] = useState({ id: '', nombre: '', icon: 'target', colorId: 'blue' });
  const [newSubcategory, setNewSubcategory] = useState({ id: '', nombre: '' });
  const [newExercise, setNewExercise] = useState({ nombre: '', musculos: '', equipo: 'Ninguno', duracion: '', dificultad: 'intermedio' });

  // Stats
  const stats = useMemo(() => {
    let totalEx = 0, totalSub = 0, totalCat = Object.keys(categories).length;
    const equipoSet = new Set();
    Object.values(categories).forEach(cat => {
      Object.values(cat.subcategorias).forEach(sub => {
        totalSub++;
        sub.ejercicios.forEach(ex => {
          totalEx++;
          if (ex.equipo && ex.equipo !== 'Ninguno') equipoSet.add(ex.equipo.split(',')[0].trim());
        });
      });
    });
    return { totalEx, totalSub, totalCat, equipos: [...equipoSet].sort() };
  }, [categories]);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('exercise_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // ====== PRESERVED CRUD LOGIC ======
  useEffect(() => { loadExercises(); }, []);

  const loadExercises = async () => {
    setLoading(true);
    const token = localStorage.getItem('train_token');
    try {
      const response = await axios.get(`${BACKEND_URL}/api/exercise-library`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data?.categories) setCategories(response.data.categories);
    } catch { console.log('Using default exercises'); }
    finally { setLoading(false); }
  };

  const saveExercises = async () => {
    setSaving(true);
    const token = localStorage.getItem('train_token');
    try {
      await axios.post(`${BACKEND_URL}/api/exercise-library`, { categories }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Biblioteca guardada exitosamente');
    } catch (err) {
      console.error('Save error:', err?.response?.data || err.message);
      toast.error('Error al guardar: ' + (err?.response?.data?.detail || err.message));
    }
    finally { setSaving(false); }
  };

  const toggleCategory = (catId) => setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  const toggleSubcategory = (subId) => setExpandedSubcategories(prev => ({ ...prev, [subId]: !prev[subId] }));

  const addCategory = () => {
    if (!newCategory.nombre) return;
    const id = newCategory.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    setCategories(prev => ({ ...prev, [id]: { nombre: newCategory.nombre, color: newCategory.color || '', icon: newCategory.icon || 'target', colorId: newCategory.colorId || 'blue', subcategorias: {} } }));
    setNewCategory({ id: '', nombre: '', icon: 'target', colorId: 'blue' });
    setShowAddCategory(false);
    setSelectedCategory('all');
    setExpandedCategories(prev => ({ ...prev, [id]: true }));
    toast.success('Categoría agregada');
  };

  const deleteCategory = (catId) => {
    if (!window.confirm('¿Eliminar esta categoría y todos sus ejercicios?')) return;
    const { [catId]: removed, ...rest } = categories;
    setCategories(rest);
    toast.success('Categoría eliminada');
  };

  const addSubcategory = (catId) => {
    if (!newSubcategory.nombre) return;
    const id = newSubcategory.nombre.toLowerCase().replace(/\s+/g, '_');
    setCategories(prev => ({
      ...prev, [catId]: { ...prev[catId], subcategorias: { ...prev[catId].subcategorias, [id]: { nombre: newSubcategory.nombre, ejercicios: [] } } }
    }));
    setNewSubcategory({ id: '', nombre: '' });
    setShowAddSubcategory(null);
    toast.success('Subcategoría agregada');
  };

  const deleteSubcategory = (catId, subId) => {
    if (!window.confirm('¿Eliminar esta subcategoría?')) return;
    setCategories(prev => {
      const { [subId]: removed, ...restSubs } = prev[catId].subcategorias;
      return { ...prev, [catId]: { ...prev[catId], subcategorias: restSubs } };
    });
    toast.success('Subcategoría eliminada');
  };

  const addExercise = (catId, subId) => {
    if (!newExercise.nombre) return;
    setCategories(prev => ({
      ...prev, [catId]: { ...prev[catId], subcategorias: { ...prev[catId].subcategorias, [subId]: {
        ...prev[catId].subcategorias[subId], ejercicios: [...prev[catId].subcategorias[subId].ejercicios, { ...newExercise }]
      }}}
    }));
    setNewExercise({ nombre: '', musculos: '', equipo: 'Ninguno', duracion: '', dificultad: 'intermedio' });
    setShowAddExercise(null);
    toast.success('Ejercicio agregado');
  };

  const deleteExercise = (catId, subId, exIndex) => {
    setCategories(prev => ({
      ...prev, [catId]: { ...prev[catId], subcategorias: { ...prev[catId].subcategorias, [subId]: {
        ...prev[catId].subcategorias[subId], ejercicios: prev[catId].subcategorias[subId].ejercicios.filter((_, i) => i !== exIndex)
      }}}
    }));
    toast.success('Ejercicio eliminado');
  };

  const updateExercise = (catId, subId, exIndex, field, value) => {
    setCategories(prev => ({
      ...prev, [catId]: { ...prev[catId], subcategorias: { ...prev[catId].subcategorias, [subId]: {
        ...prev[catId].subcategorias[subId], ejercicios: prev[catId].subcategorias[subId].ejercicios.map((ex, i) => i === exIndex ? { ...ex, [field]: value } : ex)
      }}}
    }));
  };

  const copyExercise = (exercise, targetCatId, targetSubId) => {
    setCategories(prev => ({
      ...prev, [targetCatId]: { ...prev[targetCatId], subcategorias: { ...prev[targetCatId].subcategorias, [targetSubId]: {
        ...prev[targetCatId].subcategorias[targetSubId], ejercicios: [...prev[targetCatId].subcategorias[targetSubId].ejercicios, { ...exercise }]
      }}}
    }));
    toast.success('Ejercicio copiado');
  };

  const toggleFavorite = (name) => {
    setFavorites(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };

  const exportCSV = () => {
    let csv = 'Categoría,Subcategoría,Ejercicio,Músculos,Equipo,Dificultad\n';
    Object.entries(categories).forEach(([, cat]) => {
      Object.entries(cat.subcategorias).forEach(([, sub]) => {
        sub.ejercicios.forEach(ex => {
          csv += `"${cat.nombre}","${sub.nombre}","${ex.nombre}","${ex.musculos || ''}","${ex.equipo || ''}","${ex.dificultad || ''}"\n`;
        });
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ejercicios_biblioteca.csv';
    a.click();
    toast.success('CSV exportado');
  };

  // ====== FILTERING ======
  const filteredCategories = useMemo(() => {
    const result = {};
    Object.entries(categories).forEach(([catId, cat]) => {
      if (selectedCategory !== 'all' && selectedCategory !== catId) return;
      const filteredSubs = {};
      Object.entries(cat.subcategorias).forEach(([subId, sub]) => {
        const filteredEx = sub.ejercicios.filter(ex => {
          const matchSearch = !searchTerm || ex.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || ex.musculos?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchEquipo = filterEquipo === 'all' || (ex.equipo || '').toLowerCase().includes(filterEquipo.toLowerCase());
          const matchFav = !showOnlyFavorites || favorites.includes(ex.nombre);
          return matchSearch && matchEquipo && matchFav;
        });
        if (filteredEx.length > 0 || (!searchTerm && !showOnlyFavorites && filterEquipo === 'all')) {
          filteredSubs[subId] = { ...sub, ejercicios: (searchTerm || showOnlyFavorites || filterEquipo !== 'all') ? filteredEx : sub.ejercicios };
        }
      });
      if (Object.keys(filteredSubs).length > 0 || Object.keys(cat.subcategorias).length === 0) result[catId] = { ...cat, subcategorias: filteredSubs };
    });
    return result;
  }, [categories, searchTerm, selectedCategory, filterEquipo, showOnlyFavorites, favorites]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="p-5 space-y-4" data-testid="exercise-library">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Biblioteca de Ejercicios</h2>
              <p className="text-xs text-slate-400 mt-0.5">Organiza y gestiona tu catálogo completo</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={exportCSV} className="text-slate-300 hover:text-white hover:bg-white/10 text-xs">
              <Download className="w-3.5 h-3.5 mr-1" /> CSV
            </Button>
            <Button size="sm" onClick={() => setShowAddCategory(true)} className="bg-white/10 hover:bg-white/20 text-white border-0 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Categoría
            </Button>
            <Button size="sm" onClick={saveExercises} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs" data-testid="save-exercises-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Guardar
            </Button>
          </div>
        </div>
        {/* Stats row */}
        <div className="flex gap-6 mt-4 text-xs">
          <div className="text-slate-400"><span className="text-white font-bold text-base">{stats.totalCat}</span> categorías</div>
          <div className="text-slate-400"><span className="text-white font-bold text-base">{stats.totalSub}</span> subcategorías</div>
          <div className="text-slate-400"><span className="text-emerald-400 font-bold text-base">{stats.totalEx}</span> ejercicios</div>
          <div className="text-slate-400"><span className="text-amber-400 font-bold text-base">{favorites.length}</span> favoritos</div>
        </div>
      </div>

      {/* Search, Filters & View Toggle */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar ejercicio o músculo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 rounded-xl border-slate-200 bg-white shadow-sm text-sm" data-testid="exercise-search" />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-44 h-9 rounded-xl border-slate-200 bg-white shadow-sm text-xs">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(categories).map(([id, cat]) => (
              <SelectItem key={id} value={id}>{cat.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant={showOnlyFavorites ? 'default' : 'outline'} onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`h-9 rounded-xl text-xs ${showOnlyFavorites ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`} data-testid="fav-filter-btn">
          <Star className="w-3.5 h-3.5 mr-1" /> {favorites.length}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-9 rounded-xl text-xs" data-testid="advanced-filter-btn">
          <Filter className="w-3.5 h-3.5" />
        </Button>
        <div className="flex border rounded-xl overflow-hidden">
          <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`} data-testid="view-list-btn">
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`} data-testid="view-grid-btn">
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="flex gap-3 p-3 bg-slate-50 rounded-xl border animate-in slide-in-from-top-2">
          <Select value={filterEquipo} onValueChange={setFilterEquipo}>
            <SelectTrigger className="w-48 h-8 text-xs rounded-lg"><SelectValue placeholder="Equipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo equipo</SelectItem>
              <SelectItem value="Ninguno">Sin equipo</SelectItem>
              {stats.equipos.map(eq => <SelectItem key={eq} value={eq}>{eq}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => { setFilterEquipo('all'); setSearchTerm(''); setSelectedCategory('all'); setShowOnlyFavorites(false); }} className="text-xs h-8">
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* New Category Form */}
      {showAddCategory && (
        <div className="p-4 bg-white rounded-xl border border-dashed border-emerald-300 shadow-sm space-y-3">
          <h4 className="font-semibold text-slate-700 text-sm">Nueva Categoría</h4>
          <Input placeholder="Nombre de la categoría" value={newCategory.nombre} onChange={(e) => setNewCategory({ ...newCategory, nombre: e.target.value })}
            className="rounded-xl" data-testid="new-category-name" />
          {/* Icon selector — Material Design */}
          <IconPicker value={newCategory.icon || 'fitness_center'} onChange={(id) => setNewCategory({ ...newCategory, icon: id })} />
          {/* Color selector */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTE.map(c => {
                const isSelected = newCategory.colorId === c.id;
                return (
                  <button key={c.id} onClick={() => setNewCategory({ ...newCategory, colorId: c.id })}
                    className={`w-7 h-7 rounded-full ${c.swatch} transition-all ${isSelected ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`} />
                );
              })}
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border">
            <div className={`w-8 h-8 rounded-lg ${getColorAccent(newCategory.colorId).bg} flex items-center justify-center`}>
              {React.createElement(getIconComponent(newCategory.icon || 'fitness_center'), { style: { fontSize: 18 }, className: getColorAccent(newCategory.colorId).text })}
            </div>
            <span className="text-sm font-medium text-slate-700">{newCategory.nombre || 'Vista previa...'}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={addCategory} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl" data-testid="add-category-btn">
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
            <Button variant="ghost" onClick={() => setShowAddCategory(false)} className="rounded-xl"><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {Object.entries(filteredCategories).map(([catId, cat], catIndex) => {
          const colorId = cat.colorId || DEFAULT_CATEGORY_COLORS[catId] || COLOR_PALETTE[catIndex % COLOR_PALETTE.length].id;
          const accent = getColorAccent(colorId);
          const iconId = cat.icon || DEFAULT_CATEGORY_ICONS[catId] || 'target';
          const IconComp = getIconComponent(iconId);
          const exerciseCount = Object.values(cat.subcategorias).reduce((acc, sub) => acc + sub.ejercicios.length, 0);

          return (
            <div key={catId} data-testid={`category-${catId}`}>
              {/* Category Edit Panel */}
              {editingCategory === catId && (
                <div className="p-4 bg-white rounded-xl border border-blue-300 shadow-md mb-2 space-y-3">
                  <h4 className="font-semibold text-sm text-blue-700">Editar Categoría: {cat.nombre}</h4>
                  <Input value={cat.nombre} onChange={(e) => setCategories(prev => ({ ...prev, [catId]: { ...prev[catId], nombre: e.target.value } }))}
                    className="rounded-lg h-8 text-sm" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Icono</p>
                    <IconPicker value={cat.icon || DEFAULT_CATEGORY_ICONS[catId] || 'fitness_center'} onChange={(id) => setCategories(prev => ({ ...prev, [catId]: { ...prev[catId], icon: id } }))} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Color</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_PALETTE.map(c => {
                        const isSelected = (cat.colorId || DEFAULT_CATEGORY_COLORS[catId] || 'slate') === c.id;
                        return (
                          <button key={c.id} onClick={() => setCategories(prev => ({ ...prev, [catId]: { ...prev[catId], colorId: c.id } }))}
                            className={`w-7 h-7 rounded-full ${c.swatch} transition-all ${isSelected ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`} />
                        );
                      })}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setEditingCategory(null)} className="bg-blue-600 hover:bg-blue-700 rounded-lg text-xs">
                    <Save className="w-3 h-3 mr-1" /> Listo
                  </Button>
                </div>
              )}

              {/* Category Row */}
              <div className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${accent.border} overflow-hidden`}>
                {/* Category Header */}
                <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors" onClick={() => toggleCategory(catId)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${accent.bg} flex items-center justify-center`}>
                      <IconComp style={{ fontSize: 18 }} className={accent.text} />
                    </div>
                    {expandedCategories[catId] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    <span className="font-semibold text-sm text-slate-800">{cat.nombre}</span>
                    <Badge variant="secondary" className={`text-[10px] ${accent.badge}`}>{exerciseCount}</Badge>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => setEditingCategory(editingCategory === catId ? null : catId)} className="h-7 text-xs rounded-lg" title="Cambiar icono/color">
                      <Palette className="w-3 h-3 mr-1" /> Estilo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddSubcategory(catId)} className="h-7 text-xs rounded-lg">
                      <Plus className="w-3 h-3 mr-1" /> Sub
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCategory(catId)} className="h-7 text-xs text-red-500 hover:text-red-700 rounded-lg">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

              {/* Category Content */}
              {expandedCategories[catId] && (
                <div className="p-3 space-y-2 bg-slate-50/50">
                  {/* New Subcategory Form */}
                  {showAddSubcategory === catId && (
                    <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 mb-2">
                      <div className="flex gap-2">
                        <Input placeholder="Nombre de subcategoría" value={newSubcategory.nombre}
                          onChange={(e) => setNewSubcategory({ ...newSubcategory, nombre: e.target.value })} className="flex-1 h-8 rounded-lg text-sm" />
                        <Button size="sm" onClick={() => addSubcategory(catId)} className="h-8 bg-emerald-600 rounded-lg"><Plus className="w-3 h-3 mr-1" /> Agregar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowAddSubcategory(null)} className="h-8 rounded-lg"><X className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  )}

                  {/* Subcategories */}
                  {Object.entries(cat.subcategorias).map(([subId, sub]) => (
                    <div key={subId} className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleSubcategory(`${catId}_${subId}`)}>
                        <div className="flex items-center gap-2">
                          {expandedSubcategories[`${catId}_${subId}`] ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-sm font-medium text-slate-700">{sub.nombre}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{sub.ejercicios.length}</span>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => setShowAddExercise(`${catId}_${subId}`)} className="h-6 w-6 p-0 rounded-full hover:bg-emerald-50">
                            <Plus className="w-3 h-3 text-emerald-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteSubcategory(catId, subId)} className="h-6 w-6 p-0 rounded-full hover:bg-red-50">
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </Button>
                        </div>
                      </div>

                      {/* Exercises */}
                      {expandedSubcategories[`${catId}_${subId}`] && (
                        <div className="px-3 pb-3 space-y-1">
                          {/* New Exercise Form */}
                          {showAddExercise === `${catId}_${subId}` && (
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 mb-2">
                              <div className="grid grid-cols-5 gap-2 mb-2">
                                <Input placeholder="Nombre" value={newExercise.nombre} onChange={(e) => setNewExercise({ ...newExercise, nombre: e.target.value })} className="h-8 text-xs rounded-lg" data-testid="new-exercise-name" />
                                <Input placeholder="Músculos" value={newExercise.musculos} onChange={(e) => setNewExercise({ ...newExercise, musculos: e.target.value })} className="h-8 text-xs rounded-lg" />
                                <Input placeholder="Equipo" value={newExercise.equipo} onChange={(e) => setNewExercise({ ...newExercise, equipo: e.target.value })} className="h-8 text-xs rounded-lg" />
                                <Select value={newExercise.dificultad || 'intermedio'} onValueChange={(v) => setNewExercise({ ...newExercise, dificultad: v })}>
                                  <SelectTrigger className="h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {DIFFICULTY_LEVELS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <div className="flex gap-1">
                                  <Button size="sm" onClick={() => addExercise(catId, subId)} className="h-8 bg-emerald-600 text-xs rounded-lg" data-testid="add-exercise-btn"><Plus className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => setShowAddExercise(null)} className="h-8 rounded-lg"><X className="w-3 h-3" /></Button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Exercise List or Grid */}
                          {sub.ejercicios.length === 0 ? (
                            <p className="text-xs text-slate-400 py-3 text-center">Sin ejercicios</p>
                          ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                              {sub.ejercicios.map((ex, exIdx) => {
                                const isFav = favorites.includes(ex.nombre);
                                const diff = DIFFICULTY_LEVELS.find(d => d.id === ex.dificultad);
                                const isEditing = editingExercise === `${catId}_${subId}_${exIdx}`;
                                return (
                                  <div key={exIdx} className={`p-3 rounded-lg border transition-all ${isEditing ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-slate-50 border-slate-100 hover:border-slate-300 hover:shadow-sm'}`} data-testid={`exercise-card-${exIdx}`}>
                                    <div className="flex items-start justify-between mb-1.5">
                                      {isEditing ? (
                                        <Input value={ex.nombre} onChange={(e) => updateExercise(catId, subId, exIdx, 'nombre', e.target.value)} className="h-6 text-xs rounded-md flex-1 mr-1" />
                                      ) : (
                                        <span className="font-medium text-xs text-slate-800 leading-tight flex-1">{ex.nombre}</span>
                                      )}
                                      <button onClick={() => toggleFavorite(ex.nombre)} className="ml-1 flex-shrink-0">
                                        {isFav ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <StarOff className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />}
                                      </button>
                                    </div>
                                    {isEditing ? (
                                      <div className="space-y-1.5 mb-2">
                                        <Input value={ex.musculos || ''} onChange={(e) => updateExercise(catId, subId, exIdx, 'musculos', e.target.value)} placeholder="Músculos" className="h-6 text-[10px] rounded-md" />
                                        <Input value={ex.equipo || ''} onChange={(e) => updateExercise(catId, subId, exIdx, 'equipo', e.target.value)} placeholder="Equipo" className="h-6 text-[10px] rounded-md" />
                                        <Select value={ex.dificultad || 'intermedio'} onValueChange={(v) => updateExercise(catId, subId, exIdx, 'dificultad', v)}>
                                          <SelectTrigger className="h-6 text-[10px] rounded-md"><SelectValue placeholder="Dificultad" /></SelectTrigger>
                                          <SelectContent>{DIFFICULTY_LEVELS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>
                                    ) : (
                                      <>
                                        {ex.musculos && <p className="text-[10px] text-slate-500 mb-1.5">{ex.musculos}</p>}
                                        <div className="flex items-center gap-1 flex-wrap mb-2">
                                          {ex.equipo && ex.equipo !== 'Ninguno' && <Badge variant="outline" className="text-[9px] h-4 px-1.5">{ex.equipo.split(',')[0]}</Badge>}
                                          {diff ? <Badge className={`text-[9px] h-4 px-1.5 ${diff.color} border-0`}>{diff.label}</Badge> : <Badge className="text-[9px] h-4 px-1.5 bg-slate-100 text-slate-500 border-0">Sin nivel</Badge>}
                                          {ex.duracion && <Badge variant="outline" className="text-[9px] h-4 px-1.5"><Timer className="w-2.5 h-2.5 mr-0.5" />{ex.duracion}</Badge>}
                                        </div>
                                      </>
                                    )}
                                    <div className="flex gap-1 border-t border-slate-100 pt-1.5">
                                      <Button size="sm" variant="ghost" onClick={() => setEditingExercise(isEditing ? null : `${catId}_${subId}_${exIdx}`)}
                                        className={`h-6 text-[10px] px-2 rounded-md ${isEditing ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {isEditing ? <><Save className="w-3 h-3 mr-1" />Listo</> : <><Edit className="w-3 h-3 mr-1" />Editar</>}
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => deleteExercise(catId, subId, exIdx)} className="h-6 text-[10px] px-2 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600">
                                        <Trash2 className="w-3 h-3 mr-1" />Eliminar
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-slate-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-left text-slate-500">
                                    <th className="py-2 px-3 font-medium w-6"></th>
                                    <th className="py-2 px-3 font-medium">Ejercicio</th>
                                    <th className="py-2 px-3 font-medium">Músculos</th>
                                    <th className="py-2 px-3 font-medium">Equipo</th>
                                    <th className="py-2 px-3 font-medium w-20">Dificultad</th>
                                    <th className="py-2 px-3 w-20"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sub.ejercicios.map((ex, exIdx) => {
                                    const isFav = favorites.includes(ex.nombre);
                                    const diff = DIFFICULTY_LEVELS.find(d => d.id === ex.dificultad);
                                    const isEditing = editingExercise === `${catId}_${subId}_${exIdx}`;
                                    return (
                                      <tr key={exIdx} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors group" data-testid={`exercise-row-${exIdx}`}>
                                        <td className="py-1.5 px-3">
                                          <button onClick={() => toggleFavorite(ex.nombre)} className="flex-shrink-0">
                                            {isFav ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <StarOff className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-400 transition-colors" />}
                                          </button>
                                        </td>
                                        <td className="py-1.5 px-3">
                                          {isEditing ? <Input value={ex.nombre} onChange={(e) => updateExercise(catId, subId, exIdx, 'nombre', e.target.value)} className="h-6 text-xs rounded-lg" />
                                            : <span className="font-medium text-slate-800">{ex.nombre}</span>}
                                        </td>
                                        <td className="py-1.5 px-3">
                                          {isEditing ? <Input value={ex.musculos} onChange={(e) => updateExercise(catId, subId, exIdx, 'musculos', e.target.value)} className="h-6 text-xs rounded-lg" />
                                            : <span className="text-slate-500">{ex.musculos}</span>}
                                        </td>
                                        <td className="py-1.5 px-3">
                                          {isEditing ? <Input value={ex.equipo} onChange={(e) => updateExercise(catId, subId, exIdx, 'equipo', e.target.value)} className="h-6 text-xs rounded-lg" />
                                            : <span className="text-slate-400">{ex.equipo || 'Ninguno'}</span>}
                                        </td>
                                        <td className="py-1.5 px-3">
                                          {isEditing ? (
                                            <Select value={ex.dificultad || 'intermedio'} onValueChange={(v) => updateExercise(catId, subId, exIdx, 'dificultad', v)}>
                                              <SelectTrigger className="h-6 text-[10px] rounded-lg"><SelectValue /></SelectTrigger>
                                              <SelectContent>{DIFFICULTY_LEVELS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                          ) : diff ? <Badge className={`text-[9px] ${diff.color} border-0`}>{diff.label}</Badge> : null}
                                        </td>
                                        <td className="py-1.5 px-3">
                                          <div className="flex gap-0.5">
                                            <Button size="sm" variant="ghost" onClick={() => setEditingExercise(isEditing ? null : `${catId}_${subId}_${exIdx}`)}
                                              className={`h-6 w-6 p-0 rounded-full ${isEditing ? 'text-emerald-600 hover:bg-emerald-50' : 'hover:bg-slate-100'}`}>
                                              {isEditing ? <Save className="w-3 h-3" /> : <Edit className="w-3 h-3 text-slate-400" />}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => deleteExercise(catId, subId, exIdx)} className="h-6 w-6 p-0 text-red-400 hover:bg-red-50 rounded-full">
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          );
        })}
      </div>

      {Object.keys(filteredCategories).length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No se encontraron ejercicios</p>
          {(searchTerm || showOnlyFavorites || filterEquipo !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setShowOnlyFavorites(false); setFilterEquipo('all'); setSelectedCategory('all'); }} className="mt-2 text-xs">
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExerciseLibrary;

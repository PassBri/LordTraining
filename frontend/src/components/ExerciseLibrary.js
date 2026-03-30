import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Textarea } from './ui/textarea';
import {
  Plus, Trash2, Edit, Save, X, ChevronDown, ChevronRight, Search,
  Dumbbell, Activity, Target, Loader2, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Datos iniciales de ejercicios organizados
const EJERCICIOS_INICIALES = {
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

// Exportar para uso en otros componentes
export { EJERCICIOS_INICIALES };

const ExerciseLibrary = ({ athleteId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubcategories, setExpandedSubcategories] = useState({});
  
  // Estados para edición
  const [categories, setCategories] = useState(EJERCICIOS_INICIALES);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  
  // Estados para agregar nuevos
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(null);
  const [showAddExercise, setShowAddExercise] = useState(null);
  
  // Formularios
  const [newCategory, setNewCategory] = useState({ id: '', nombre: '', color: 'bg-gray-100 text-gray-700 border-gray-300' });
  const [newSubcategory, setNewSubcategory] = useState({ id: '', nombre: '' });
  const [newExercise, setNewExercise] = useState({ nombre: '', musculos: '', equipo: 'Ninguno', duracion: '', descripcion: '' });

  // Cargar datos guardados
  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/exercise-library`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.categories) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      // Usar datos iniciales si no hay guardados
      console.log('Using default exercises');
    } finally {
      setLoading(false);
    }
  };

  const saveExercises = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `${BACKEND_URL}/api/exercise-library`,
        { categories },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Biblioteca guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Toggle expansión
  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleSubcategory = (subId) => {
    setExpandedSubcategories(prev => ({ ...prev, [subId]: !prev[subId] }));
  };

  // CRUD Categorías
  const addCategory = () => {
    if (!newCategory.nombre) return;
    const id = newCategory.nombre.toLowerCase().replace(/\s+/g, '_');
    setCategories(prev => ({
      ...prev,
      [id]: {
        nombre: newCategory.nombre,
        color: newCategory.color,
        subcategorias: {}
      }
    }));
    setNewCategory({ id: '', nombre: '', color: 'bg-gray-100 text-gray-700 border-gray-300' });
    setShowAddCategory(false);
    toast.success('Categoría agregada');
  };

  const deleteCategory = (catId) => {
    if (!window.confirm('¿Eliminar esta categoría y todos sus ejercicios?')) return;
    const { [catId]: removed, ...rest } = categories;
    setCategories(rest);
    toast.success('Categoría eliminada');
  };

  // CRUD Subcategorías
  const addSubcategory = (catId) => {
    if (!newSubcategory.nombre) return;
    const id = newSubcategory.nombre.toLowerCase().replace(/\s+/g, '_');
    setCategories(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        subcategorias: {
          ...prev[catId].subcategorias,
          [id]: {
            nombre: newSubcategory.nombre,
            ejercicios: []
          }
        }
      }
    }));
    setNewSubcategory({ id: '', nombre: '' });
    setShowAddSubcategory(null);
    toast.success('Subcategoría agregada');
  };

  const deleteSubcategory = (catId, subId) => {
    if (!window.confirm('¿Eliminar esta subcategoría y todos sus ejercicios?')) return;
    setCategories(prev => {
      const { [subId]: removed, ...restSubs } = prev[catId].subcategorias;
      return {
        ...prev,
        [catId]: {
          ...prev[catId],
          subcategorias: restSubs
        }
      };
    });
    toast.success('Subcategoría eliminada');
  };

  // CRUD Ejercicios
  const addExercise = (catId, subId) => {
    if (!newExercise.nombre) return;
    setCategories(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        subcategorias: {
          ...prev[catId].subcategorias,
          [subId]: {
            ...prev[catId].subcategorias[subId],
            ejercicios: [
              ...prev[catId].subcategorias[subId].ejercicios,
              { ...newExercise }
            ]
          }
        }
      }
    }));
    setNewExercise({ nombre: '', musculos: '', equipo: 'Ninguno', duracion: '', descripcion: '' });
    setShowAddExercise(null);
    toast.success('Ejercicio agregado');
  };

  const deleteExercise = (catId, subId, exIndex) => {
    setCategories(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        subcategorias: {
          ...prev[catId].subcategorias,
          [subId]: {
            ...prev[catId].subcategorias[subId],
            ejercicios: prev[catId].subcategorias[subId].ejercicios.filter((_, i) => i !== exIndex)
          }
        }
      }
    }));
    toast.success('Ejercicio eliminado');
  };

  const updateExercise = (catId, subId, exIndex, field, value) => {
    setCategories(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        subcategorias: {
          ...prev[catId].subcategorias,
          [subId]: {
            ...prev[catId].subcategorias[subId],
            ejercicios: prev[catId].subcategorias[subId].ejercicios.map((ex, i) => 
              i === exIndex ? { ...ex, [field]: value } : ex
            )
          }
        }
      }
    }));
  };

  // Filtrar ejercicios
  const filterExercises = () => {
    if (!searchTerm && selectedCategory === 'all') return categories;
    
    const filtered = {};
    Object.entries(categories).forEach(([catId, cat]) => {
      if (selectedCategory !== 'all' && selectedCategory !== catId) return;
      
      const filteredSubs = {};
      Object.entries(cat.subcategorias).forEach(([subId, sub]) => {
        const filteredEx = sub.ejercicios.filter(ex => 
          ex.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ex.musculos?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filteredEx.length > 0 || !searchTerm) {
          filteredSubs[subId] = { ...sub, ejercicios: searchTerm ? filteredEx : sub.ejercicios };
        }
      });
      
      if (Object.keys(filteredSubs).length > 0) {
        filtered[catId] = { ...cat, subcategorias: filteredSubs };
      }
    });
    
    return filtered;
  };

  const colores = [
    { value: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Azul' },
    { value: 'bg-green-100 text-green-700 border-green-300', label: 'Verde' },
    { value: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Amarillo' },
    { value: 'bg-red-100 text-red-700 border-red-300', label: 'Rojo' },
    { value: 'bg-purple-100 text-purple-700 border-purple-300', label: 'Púrpura' },
    { value: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Naranja' },
    { value: 'bg-teal-100 text-teal-700 border-teal-300', label: 'Teal' },
    { value: 'bg-pink-100 text-pink-700 border-pink-300', label: 'Rosa' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredCategories = filterExercises();

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Biblioteca de Ejercicios</h2>
              <p className="text-xs text-slate-400 mt-0.5">Organiza y gestiona tu catálogo de ejercicios</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => setShowAddCategory(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-xl text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Categoría
            </Button>
            <Button 
              size="sm" 
              onClick={saveExercises}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 rounded-xl text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Guardar
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Buscar ejercicio o músculo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 rounded-xl border-slate-200 bg-white shadow-sm"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-52 h-10 rounded-xl border-slate-200 bg-white shadow-sm">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(categories).map(([id, cat]) => (
              <SelectItem key={id} value={id}>{cat.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* New Category Form */}
      {showAddCategory && (
        <div className="p-4 bg-white rounded-xl border border-dashed border-emerald-300 shadow-sm">
          <h4 className="font-semibold mb-3 text-slate-700 text-sm">Nueva Categoría</h4>
          <div className="grid grid-cols-3 gap-3">
            <Input 
              placeholder="Nombre de la categoría"
              value={newCategory.nombre}
              onChange={(e) => setNewCategory({ ...newCategory, nombre: e.target.value })}
              className="rounded-xl"
            />
            <Select value={newCategory.color} onValueChange={(v) => setNewCategory({ ...newCategory, color: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Color" /></SelectTrigger>
              <SelectContent>
                {colores.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className={`px-2 py-1 rounded ${c.value}`}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={addCategory} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
              <Button variant="ghost" onClick={() => setShowAddCategory(false)} className="rounded-xl">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-3">
        {Object.entries(filteredCategories).map(([catId, cat]) => (
          <div key={catId} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Category Header */}
            <div 
              className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${cat.color}`}
              onClick={() => toggleCategory(catId)}
            >
              <div className="flex items-center gap-2.5">
                {expandedCategories[catId] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className="font-semibold text-sm">{cat.nombre}</span>
                <span className="text-xs opacity-60 font-medium">
                  {Object.values(cat.subcategorias).reduce((acc, sub) => acc + sub.ejercicios.length, 0)} ejercicios
                </span>
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setShowAddSubcategory(catId)} className="h-7 text-xs rounded-lg">
                  <Plus className="w-3 h-3 mr-1" /> Sub
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteCategory(catId)} className="h-7 text-xs text-red-600 hover:text-red-700 rounded-lg">
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
                      <Input 
                        placeholder="Nombre de subcategoría"
                        value={newSubcategory.nombre}
                        onChange={(e) => setNewSubcategory({ ...newSubcategory, nombre: e.target.value })}
                        className="flex-1 h-8 rounded-lg text-sm"
                      />
                      <Button size="sm" onClick={() => addSubcategory(catId)} className="h-8 bg-emerald-600 rounded-lg">
                        <Plus className="w-3 h-3 mr-1" /> Agregar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowAddSubcategory(null)} className="h-8 rounded-lg">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Subcategories */}
                {Object.entries(cat.subcategorias).map(([subId, sub]) => (
                  <div key={subId} className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                    {/* Subcategory Header */}
                    <div 
                      className="px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => toggleSubcategory(`${catId}_${subId}`)}
                    >
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
                            <div className="grid grid-cols-4 gap-2 mb-2">
                              <Input 
                                placeholder="Nombre del ejercicio"
                                value={newExercise.nombre}
                                onChange={(e) => setNewExercise({ ...newExercise, nombre: e.target.value })}
                                className="h-8 text-sm rounded-lg"
                              />
                              <Input 
                                placeholder="Músculos"
                                value={newExercise.musculos}
                                onChange={(e) => setNewExercise({ ...newExercise, musculos: e.target.value })}
                                className="h-8 text-sm rounded-lg"
                              />
                              <Input 
                                placeholder="Equipo"
                                value={newExercise.equipo}
                                onChange={(e) => setNewExercise({ ...newExercise, equipo: e.target.value })}
                                className="h-8 text-sm rounded-lg"
                              />
                              <div className="flex gap-1">
                                <Button size="sm" onClick={() => addExercise(catId, subId)} className="h-8 bg-emerald-600 text-xs rounded-lg">
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowAddExercise(null)} className="h-8 rounded-lg">
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Exercise List */}
                        {sub.ejercicios.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3 text-center">Sin ejercicios en esta subcategoría</p>
                        ) : (
                          <div className="rounded-lg border border-slate-100 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-left text-slate-500">
                                  <th className="py-2 px-3 font-medium">Ejercicio</th>
                                  <th className="py-2 px-3 font-medium">Músculos</th>
                                  <th className="py-2 px-3 font-medium">Equipo</th>
                                  <th className="py-2 px-3 w-16 font-medium"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {sub.ejercicios.map((ex, exIdx) => (
                                  <tr key={exIdx} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-2 px-3">
                                      {editingExercise === `${catId}_${subId}_${exIdx}` ? (
                                        <Input 
                                          value={ex.nombre}
                                          onChange={(e) => updateExercise(catId, subId, exIdx, 'nombre', e.target.value)}
                                          className="h-6 text-xs rounded-lg"
                                        />
                                      ) : (
                                        <span className="font-medium text-slate-800">{ex.nombre}</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      {editingExercise === `${catId}_${subId}_${exIdx}` ? (
                                        <Input 
                                          value={ex.musculos}
                                          onChange={(e) => updateExercise(catId, subId, exIdx, 'musculos', e.target.value)}
                                          className="h-6 text-xs rounded-lg"
                                        />
                                      ) : (
                                        <span className="text-slate-500">{ex.musculos}</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      {editingExercise === `${catId}_${subId}_${exIdx}` ? (
                                        <Input 
                                          value={ex.equipo}
                                          onChange={(e) => updateExercise(catId, subId, exIdx, 'equipo', e.target.value)}
                                          className="h-6 text-xs rounded-lg"
                                        />
                                      ) : (
                                        <span className="text-slate-400">{ex.equipo || 'Ninguno'}</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex gap-0.5">
                                        {editingExercise === `${catId}_${subId}_${exIdx}` ? (
                                          <Button 
                                            size="sm" variant="ghost" 
                                            onClick={() => setEditingExercise(null)}
                                            className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50 rounded-full"
                                          >
                                            <Save className="w-3 h-3" />
                                          </Button>
                                        ) : (
                                          <Button 
                                            size="sm" variant="ghost" 
                                            onClick={() => setEditingExercise(`${catId}_${subId}_${exIdx}`)}
                                            className="h-6 w-6 p-0 hover:bg-slate-100 rounded-full"
                                          >
                                            <Edit className="w-3 h-3 text-slate-400" />
                                          </Button>
                                        )}
                                        <Button 
                                          size="sm" variant="ghost" 
                                          onClick={() => deleteExercise(catId, subId, exIdx)}
                                          className="h-6 w-6 p-0 text-red-400 hover:bg-red-50 rounded-full"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
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
        ))}
      </div>

      {Object.keys(filteredCategories).length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No se encontraron ejercicios</p>
        </div>
      )}
    </div>
  );
};

export default ExerciseLibrary;

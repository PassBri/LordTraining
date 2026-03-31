import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  Heart, Dumbbell, Target, Layers, Brain, BookOpen, FileText,
  AlertTriangle, CheckCircle, Save, Loader2, Plus
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EVAL_CONFIGS = {
  'control-medical': {
    title: 'Control Médico',
    description: 'Estado de salud y aptitud para el entrenamiento',
    icon: Heart,
    iconColor: 'text-red-500',
    badgeClass: 'bg-red-100 text-red-700',
    saveColor: 'bg-red-600 hover:bg-red-700',
    type: 'medical'
  },
  'control-physical': {
    title: 'Control Físico',
    description: 'Evaluación de capacidades físicas y condición',
    icon: Dumbbell,
    iconColor: 'text-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700',
    saveColor: 'bg-blue-600 hover:bg-blue-700',
    type: 'physical'
  },
  'control-technical': {
    title: 'Control Técnico',
    description: 'Evaluación de habilidades técnicas específicas del deporte',
    icon: Target,
    iconColor: 'text-violet-500',
    badgeClass: 'bg-violet-100 text-violet-700',
    saveColor: 'bg-violet-600 hover:bg-violet-700',
    type: 'technical'
  },
  'control-tactical': {
    title: 'Control Táctico',
    description: 'Evaluación de comprensión táctica y toma de decisiones',
    icon: Layers,
    iconColor: 'text-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700',
    saveColor: 'bg-amber-600 hover:bg-amber-700',
    type: 'tactical'
  },
  'control-psychological': {
    title: 'Control Psicológico',
    description: 'Evaluación del bienestar mental y habilidades psicológicas',
    icon: Brain,
    iconColor: 'text-pink-500',
    badgeClass: 'bg-pink-100 text-pink-700',
    saveColor: 'bg-pink-600 hover:bg-pink-700',
    type: 'psychological'
  },
  'control-theoretical': {
    title: 'Control Teórico',
    description: 'Evaluación del conocimiento teórico del deporte',
    icon: BookOpen,
    iconColor: 'text-teal-500',
    badgeClass: 'bg-teal-100 text-teal-700',
    saveColor: 'bg-teal-600 hover:bg-teal-700',
    type: 'theoretical'
  }
};

const RatingButtons = ({ color = 'violet' }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5,6,7,8,9,10].map(n => (
      <button key={n} className={`w-8 h-8 rounded-lg border border-slate-200 text-xs hover:bg-${color}-100 hover:border-${color}-300 transition-colors`}>{n}</button>
    ))}
  </div>
);

const RatingRow = ({ label, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <span className="text-xs text-slate-400">1-10</span>
    </div>
    <RatingButtons color={color} />
  </div>
);

const SkillRow = ({ label }) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-slate-500">{label}</label>
    <div className="flex gap-2">
      <Input placeholder="Nombre de la habilidad" className="flex-1" />
      <Select defaultValue="7">
        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
        <SelectContent>{[1,2,3,4,5,6,7,8,9,10].map(n => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}</SelectContent>
      </Select>
    </div>
  </div>
);

// ===== MEDICAL FIELDS =====
const MedicalFields = ({ data, setData }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><Heart className="w-4 h-4" />Signos Vitales</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[['FC Reposo (lpm)', 'fcReposo', '60'], ['FC Máxima (lpm)', 'fcMaxima', '185'], ['PA Sistólica (mmHg)', 'paSistolica', '120'], ['PA Diastólica (mmHg)', 'paDiastolica', '80']].map(([label, key, ph]) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-500">{label}</label>
              <Input type="number" placeholder={ph} value={data[key] || ''} onChange={(e) => setData({...data, [key]: e.target.value})} />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500">Saturación O2 (%)</label>
          <Input type="number" placeholder="98" value={data.saturacionO2 || ''} onChange={(e) => setData({...data, saturacionO2: e.target.value})} />
        </div>
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Antecedentes Médicos</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        {[['Enfermedades Crónicas', 'enfermedadesCronicas', 'Asma, diabetes...', true], ['Alergias', 'alergias', 'Medicamentos, alimentos...'], ['Cirugías Previas', 'cirugiasPrevias', 'Tipo y fecha']].map(([label, key, ph, isTextarea]) => (
          <div key={key} className="space-y-2">
            <label className="text-xs font-medium text-slate-500">{label}</label>
            {isTextarea ? <textarea className="w-full h-16 p-2 text-sm border rounded-lg resize-none" placeholder={ph} value={data[key] || ''} onChange={(e) => setData({...data, [key]: e.target.value})} />
            : <Input placeholder={ph} value={data[key] || ''} onChange={(e) => setData({...data, [key]: e.target.value})} />}
          </div>
        ))}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Lesiones Actuales</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Lesión Activa</label>
          <Select defaultValue="none"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            {[['none','Sin lesiones'],['muscular','Muscular'],['articular','Articular'],['osea','Ósea'],['ligamentosa','Ligamentosa']].map(([v,l])=>(<SelectItem key={v} value={v}>{l}</SelectItem>))}
          </SelectContent></Select></div>
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Zona Afectada</label><Input placeholder="Ej: Rodilla derecha" /></div>
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Estado de Recuperación</label>
          <Select defaultValue="na"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            {[['na','N/A'],['aguda','Fase Aguda'],['subaguda','Fase Subaguda'],['rehabilitacion','En Rehabilitación'],['reintegro','Reintegro Deportivo']].map(([v,l])=>(<SelectItem key={v} value={v}>{l}</SelectItem>))}
          </SelectContent></Select></div>
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />Aptitud Médica</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Estado de Aptitud</label>
          <Select defaultValue="apto"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            {[['apto','Apto sin restricciones'],['apto-restriccion','Apto con restricciones'],['no-apto-temporal','No apto temporalmente'],['no-apto','No apto']].map(([v,l])=>(<SelectItem key={v} value={v}>{l}</SelectItem>))}
          </SelectContent></Select></div>
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Fecha Último Chequeo</label><Input type="date" /></div>
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Próximo Chequeo</label><Input type="date" /></div>
      </CardContent>
    </Card>
  </div>
);

// ===== PHYSICAL FIELDS =====
const PhysicalFields = ({ data, setData }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[
      { title: 'Fuerza', icon: Dumbbell, fields: [['Sentadilla 1RM (kg)', 'sentadilla1rm'], ['Press Banca 1RM (kg)', 'pressBanca1rm'], ['Peso Muerto 1RM (kg)', 'pesoMuerto1rm'], ['Fuerza Prensión (kg)', 'fuerzaPresion']] },
      { title: 'Resistencia', icon: Heart, fields: [['VO2 Max (ml/kg/min)', 'vo2max'], ['Test Cooper (m)', 'testCooper'], ['FC Umbral (lpm)', 'fcUmbral'], ['Tiempo 2000m', 'tiempo2000m']] },
      { title: 'Velocidad', icon: Target, fields: [['Sprint 30m (s)', 'sprint30m'], ['Sprint 60m (s)', 'sprint60m'], ['Agilidad T-Test (s)', 'agilidadTTest'], ['Velocidad Reactiva', 'velocidadReactiva']] },
      { title: 'Flexibilidad', icon: Layers, fields: [['Sit and Reach (cm)', 'sitAndReach'], ['Flexión Cadera (°)', 'flexionCadera'], ['Rotación Hombro (°)', 'rotacionHombro'], ['Dorsiflexión Tobillo (°)', 'dorsiflexionTobillo']] },
      { title: 'Composición Corporal', icon: Target, fields: [['Peso (kg)', 'peso'], ['% Grasa Corporal', 'porcentajeGrasa'], ['Masa Muscular (kg)', 'masaMuscular'], ['IMC', 'imc']] },
      { title: 'Potencia', icon: Dumbbell, fields: [['CMJ (cm)', 'cmj'], ['Squat Jump (cm)', 'squatJump'], ['Lanzamiento Balón (m)', 'lanzamientoBalon'], ['Potencia Pico (W)', 'potenciaPico']] }
    ].map(group => (
      <Card key={group.title} className="border-0 shadow-md">
        <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><group.icon className="w-4 h-4" />{group.title}</CardTitle></CardHeader>
        <CardContent className="p-4 space-y-3">
          {group.fields.map(([label, key]) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-500">{label}</label>
              <Input type="number" step="0.1" value={data[key] || ''} onChange={(e) => setData({...data, [key]: e.target.value})} />
            </div>
          ))}
        </CardContent>
      </Card>
    ))}
  </div>
);

// ===== TECHNICAL FIELDS =====
const TechnicalFields = ({ data, setData }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />Evaluación Técnica General</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-4">
        {['Técnica básica', 'Técnica específica', 'Ejecución bajo presión', 'Consistencia técnica', 'Eficiencia del gesto'].map(item => <RatingRow key={item} label={item} color="violet" />)}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" />Habilidades Específicas</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-3">
        {['Habilidad 1', 'Habilidad 2', 'Habilidad 3'].map(h => <SkillRow key={h} label={h} />)}
        <Button variant="outline" size="sm" className="w-full mt-2"><Plus className="w-4 h-4 mr-2" />Agregar Habilidad</Button>
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md col-span-full">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Observaciones y Áreas de Mejora</CardTitle></CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Fortalezas Técnicas</label><textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Describir puntos fuertes..." /></div>
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Áreas de Mejora</label><textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Aspectos a trabajar..." /></div>
      </CardContent>
    </Card>
  </div>
);

// ===== TACTICAL FIELDS =====
const TacticalFields = ({ data, setData }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" />Comprensión Táctica</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-4">
        {['Lectura del juego', 'Toma de decisiones', 'Posicionamiento', 'Comunicación', 'Adaptabilidad táctica'].map(item => <RatingRow key={item} label={item} color="amber" />)}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />Aspectos Tácticos Específicos</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-4">
        {['Estrategia ofensiva', 'Estrategia defensiva', 'Transiciones', 'Situaciones especiales', 'Juego en equipo'].map(item => <RatingRow key={item} label={item} color="amber" />)}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md col-span-full">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Análisis Táctico</CardTitle></CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Sistema de juego</label><textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Describir sistema..." /></div>
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Observaciones tácticas</label><textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Aspectos tácticos a mejorar..." /></div>
      </CardContent>
    </Card>
  </div>
);

// ===== PSYCHOLOGICAL FIELDS =====
const PsychologicalFields = ({ data, setData }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4" />Estado Emocional</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-4">
        {['Motivación', 'Autoconfianza', 'Control emocional', 'Concentración', 'Manejo de la presión'].map(item => <RatingRow key={item} label={item} color="pink" />)}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />Habilidades Mentales</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-4">
        {['Visualización', 'Establecimiento de metas', 'Diálogo interno', 'Rutinas pre-competición', 'Resiliencia'].map(item => <RatingRow key={item} label={item} color="pink" />)}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md col-span-full">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Observaciones Psicológicas</CardTitle></CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Fortalezas mentales</label><textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Describir fortalezas..." /></div>
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Áreas de trabajo</label><textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Aspectos mentales a trabajar..." /></div>
      </CardContent>
    </Card>
  </div>
);

// ===== THEORETICAL FIELDS =====
const TheoreticalFields = ({ data, setData }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />Conocimiento del Deporte</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-4">
        {['Reglamento', 'Táctica teórica', 'Historia del deporte', 'Nutrición deportiva', 'Prevención de lesiones'].map(item => <RatingRow key={item} label={item} color="teal" />)}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />Conocimiento Específico</CardTitle></CardHeader>
      <CardContent className="p-4 space-y-4">
        {['Principios de entrenamiento', 'Planificación deportiva', 'Biomecánica básica', 'Análisis de rendimiento', 'Fair play y ética'].map(item => <RatingRow key={item} label={item} color="teal" />)}
      </CardContent>
    </Card>
    <Card className="border-0 shadow-md col-span-full">
      <CardHeader className="bg-white border-b border-slate-200 py-3"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Evaluación Teórica</CardTitle></CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Nivel de conocimiento general</label><textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Evaluar nivel teórico..." /></div>
        <div className="space-y-2"><label className="text-xs font-medium text-slate-500">Recomendaciones de estudio</label><textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Material recomendado..." /></div>
      </CardContent>
    </Card>
  </div>
);

const FIELD_COMPONENTS = {
  medical: MedicalFields,
  physical: PhysicalFields,
  technical: TechnicalFields,
  tactical: TacticalFields,
  psychological: PsychologicalFields,
  theoretical: TheoreticalFields
};

const EvaluationSection = ({ sectionId, activePlan, athletes, selectedAthleteId, evalData, setEvalData }) => {
  const [saving, setSaving] = useState(false);
  const config = EVAL_CONFIGS[sectionId];
  if (!config) return null;

  const Icon = config.icon;
  const FieldsComponent = FIELD_COMPONENTS[config.type];
  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  const handleSave = async () => {
    if (!activePlan) { toast.error('Selecciona un plan primero'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/plan-data/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          plan_id: activePlan.id,
          athlete_id: selectedAthleteId,
          evaluation_type: config.type,
          date: new Date().toISOString().split('T')[0],
          results: evalData,
          notes: evalData.observaciones || ''
        })
      });
      toast.success(`${config.title} guardado`);
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6" data-testid={`eval-${config.type}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Icon className={`w-7 h-7 ${config.iconColor}`} />
            {config.title}
          </h2>
          <p className="text-slate-500 mt-1">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {activePlan && <Badge className={config.badgeClass}>{activePlan.name}</Badge>}
          {selectedAthlete && <Badge className="bg-slate-100 text-slate-700">{selectedAthlete.name}</Badge>}
        </div>
      </div>

      <FieldsComponent data={evalData} setData={setEvalData} />

      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancelar</Button>
        <Button className={config.saveColor} onClick={handleSave} disabled={saving || !activePlan}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar {config.title}
        </Button>
      </div>
    </div>
  );
};

export default EvaluationSection;
export { EVAL_CONFIGS };

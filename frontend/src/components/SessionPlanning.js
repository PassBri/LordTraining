import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, Target, Activity, Plus, Trash2, Save, Download, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SessionPlanning = ({ athleteId, onSave }) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [sessionData, setSessionData] = useState({
    date: new Date().toISOString().split('T')[0],
    sessionNumber: 1,
    objectives: {
      general: '',
      physical: '',
      technical: '',
      tactical: '',
      psychological: '',
      theoretical: ''
    },
    phases: {
      initial: [{ id: 1, medios: '', capacidad: '', metodos: '', series: '', repeticiones: '', intensidad: 50, volumen: '', procedimiento: '', recuperacion: '' }],
      principal: [{ id: 1, medios: '', capacidad: '', metodos: '', series: '', repeticiones: '', intensidad: 50, volumen: '', procedimiento: '', recuperacion: '' }],
      final: [{ id: 1, medios: '', capacidad: '', metodos: '', series: '', repeticiones: '', intensidad: 50, volumen: '', procedimiento: '', recuperacion: '' }]
    },
    heartRate: {
      resting: '',
      max: '',
      zones: []
    },
    feedback: ''
  });

  const capacidadOptions = [
    { value: 'fuerza', label: t('sessions.cap_fuerza') },
    { value: 'resistencia', label: t('sessions.cap_resistencia') },
    { value: 'velocidad', label: t('sessions.cap_velocidad') },
    { value: 'flexibilidad', label: t('sessions.cap_flexibilidad') },
    { value: 'coordinacion', label: t('sessions.cap_coordinacion') },
    { value: 'potencia', label: t('sessions.cap_potencia') },
    { value: 'agilidad', label: t('sessions.cap_agilidad') }
  ];

  const handleObjectiveChange = (field, value) => {
    setSessionData(prev => ({
      ...prev,
      objectives: {
        ...prev.objectives,
        [field]: value
      }
    }));
  };

  const handlePhaseActivityChange = (phase, activityId, field, value) => {
    setSessionData(prev => ({
      ...prev,
      phases: {
        ...prev.phases,
        [phase]: prev.phases[phase].map(activity => 
          activity.id === activityId ? { ...activity, [field]: value } : activity
        )
      }
    }));
  };

  const addActivity = (phase) => {
    const newId = Math.max(...sessionData.phases[phase].map(a => a.id)) + 1;
    setSessionData(prev => ({
      ...prev,
      phases: {
        ...prev.phases,
        [phase]: [...prev.phases[phase], { 
          id: newId, medios: '', capacidad: '', metodos: '', series: '', 
          repeticiones: '', intensidad: 50, volumen: '', procedimiento: '', recuperacion: '' 
        }]
      }
    }));
  };

  const removeActivity = (phase, activityId) => {
    if (sessionData.phases[phase].length <= 1) {
      toast.error(t('sessions.tMinOneActivity'));
      return;
    }
    setSessionData(prev => ({
      ...prev,
      phases: {
        ...prev.phases,
        [phase]: prev.phases[phase].filter(a => a.id !== activityId)
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Aquí se conectaría con el backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(t('sessions.tSessionSaved'));
      if (onSave) onSave(sessionData);
    } catch (error) {
      toast.error(t('sessions.tSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    toast.success(t('sessions.tExportingPdf'));
  };

  const renderPhaseTable = (phase, phaseName, bgColor) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-lg ${
          phase === 'initial' ? 'text-[#B8912A]' : 
          phase === 'principal' ? 'text-amber-600' : 'text-green-600'
        }`}>
          {phaseName}
        </h3>
        <Button 
          size="sm" 
          onClick={() => addActivity(phase)}
          className={`text-xs ${
            phase === 'initial' ? 'bg-[#D4AF37] hover:bg-[#D4AF37]' : 
            phase === 'principal' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          <Plus className="w-3 h-3 mr-1" />
          Agregar Actividad
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={bgColor}>
            <tr>
              <th className="p-2 text-left font-medium">{t('sessions.means')}</th>
              <th className="p-2 text-left font-medium">{t('sessions.physicalCapacity')}</th>
              <th className="p-2 text-left font-medium">{t('sessions.methods')}</th>
              <th className="p-2 text-left font-medium">{t('sessions.series')}</th>
              <th className="p-2 text-left font-medium">{t('sessions.repetitions')}</th>
              <th className="p-2 text-left font-medium">{t('sessions.intensity')}</th>
              <th className="p-2 text-left font-medium">{t('sessions.volume')}</th>
              <th className="p-2 text-left font-medium">{t('sessions.orgProc')}</th>
              <th className="p-2 text-left font-medium">{t('sessions.recovery')}</th>
              <th className="p-2 text-center font-medium">{t('sessions.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sessionData.phases[phase].map((activity) => (
              <tr key={activity.id} className="border-b border-gray-100">
                <td className="p-1">
                  <Input 
                    value={activity.medios}
                    onChange={(e) => handlePhaseActivityChange(phase, activity.id, 'medios', e.target.value)}
                    className="h-8 text-xs"
                    placeholder={t('sessions.phExercise')}
                  />
                </td>
                <td className="p-1">
                  <Select 
                    value={activity.capacidad} 
                    onValueChange={(v) => handlePhaseActivityChange(phase, activity.id, 'capacidad', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('sessions.phSelect')} />
                    </SelectTrigger>
                    <SelectContent>
                      {capacidadOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-1">
                  <Input 
                    value={activity.metodos}
                    onChange={(e) => handlePhaseActivityChange(phase, activity.id, 'metodos', e.target.value)}
                    className="h-8 text-xs"
                    placeholder={t('sessions.phMethod')}
                  />
                </td>
                <td className="p-1">
                  <Input 
                    type="number"
                    value={activity.series}
                    onChange={(e) => handlePhaseActivityChange(phase, activity.id, 'series', e.target.value)}
                    className="h-8 text-xs w-16"
                    placeholder="3"
                  />
                </td>
                <td className="p-1">
                  <Input 
                    value={activity.repeticiones}
                    onChange={(e) => handlePhaseActivityChange(phase, activity.id, 'repeticiones', e.target.value)}
                    className="h-8 text-xs w-20"
                    placeholder="10-12"
                  />
                </td>
                <td className="p-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={activity.intensidad}
                      onChange={(e) => handlePhaseActivityChange(phase, activity.id, 'intensidad', parseInt(e.target.value))}
                      className="w-16 h-2"
                    />
                    <span className="text-xs w-8">{activity.intensidad}%</span>
                  </div>
                </td>
                <td className="p-1">
                  <Input 
                    value={activity.volumen}
                    onChange={(e) => handlePhaseActivityChange(phase, activity.id, 'volumen', e.target.value)}
                    className="h-8 text-xs w-20"
                    placeholder="30 min"
                  />
                </td>
                <td className="p-1">
                  <Input 
                    value={activity.procedimiento}
                    onChange={(e) => handlePhaseActivityChange(phase, activity.id, 'procedimiento', e.target.value)}
                    className="h-8 text-xs"
                    placeholder={t('sessions.phIndividual')}
                  />
                </td>
                <td className="p-1">
                  <Input 
                    value={activity.recuperacion}
                    onChange={(e) => handlePhaseActivityChange(phase, activity.id, 'recuperacion', e.target.value)}
                    className="h-8 text-xs w-20"
                    placeholder="2 min"
                  />
                </td>
                <td className="p-1 text-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeActivity(phase, activity.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-amber-50/30 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('sessions.trainingPlanning')}</h1>
          <p className="text-amber-600 text-sm">Sesión #{sessionData.sessionNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5" />
            <Input 
              type="date"
              value={sessionData.date}
              onChange={(e) => setSessionData(prev => ({ ...prev, date: e.target.value }))}
              className="h-9 w-40"
            />
          </div>
        </div>
      </div>

      {/* Objetivos de la Sesión */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-gray-800">{t('sessions.sessionObjectivesTitle')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-gray-600">{t('sessions.generalObjective')}</label>
              <Input 
                value={sessionData.objectives.general}
                onChange={(e) => handleObjectiveChange('general', e.target.value)}
                placeholder={t('sessions.phMainObjective')}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600">{t('sessions.physicalObjective')}</label>
              <Input 
                value={sessionData.objectives.physical}
                onChange={(e) => handleObjectiveChange('physical', e.target.value)}
                placeholder={t('sessions.phPhysDev')}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600">{t('sessions.technicalObjective')}</label>
              <Input 
                value={sessionData.objectives.technical}
                onChange={(e) => handleObjectiveChange('technical', e.target.value)}
                placeholder={t('sessions.phTechImprove')}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600">{t('sessions.tacticalObjective')}</label>
              <Input 
                value={sessionData.objectives.tactical}
                onChange={(e) => handleObjectiveChange('tactical', e.target.value)}
                placeholder={t('sessions.phTacticalDev')}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600">{t('sessions.psychObjective')}</label>
              <Input 
                value={sessionData.objectives.psychological}
                onChange={(e) => handleObjectiveChange('psychological', e.target.value)}
                placeholder={t('sessions.phMental')}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-600">{t('sessions.theoreticalObjective')}</label>
              <Input 
                value={sessionData.objectives.theoretical}
                onChange={(e) => handleObjectiveChange('theoretical', e.target.value)}
                placeholder={t('sessions.phTheory')}
                className="border-gray-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estructura de la Sesión */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-gray-800">{t('sessions.sessionStructureTitle')}</h2>
          </div>

          {renderPhaseTable('initial', 'Fase Inicial', 'bg-[#D4AF37] text-[#B8912A]')}
          {renderPhaseTable('principal', 'Fase Principal', 'bg-amber-50 text-amber-700')}
          {renderPhaseTable('final', 'Fase Final', 'bg-green-50 text-green-700')}
        </CardContent>
      </Card>

      {/* Monitoreo y Retroalimentación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-red-500" />
              <h2 className="font-semibold text-gray-800">{t('sessions.hrMonitoringTitle')}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-600">{t('sessions.restHrColon')}</label>
                <Input 
                  type="number"
                  value={sessionData.heartRate.resting}
                  onChange={(e) => setSessionData(prev => ({ 
                    ...prev, 
                    heartRate: { ...prev.heartRate, resting: e.target.value } 
                  }))}
                  placeholder="60 bpm"
                  className="border-gray-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-gray-600">{t('sessions.maxHrColon')}</label>
                <Input 
                  type="number"
                  value={sessionData.heartRate.max}
                  onChange={(e) => setSessionData(prev => ({ 
                    ...prev, 
                    heartRate: { ...prev.heartRate, max: e.target.value } 
                  }))}
                  placeholder="180 bpm"
                  className="border-gray-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <h2 className="font-semibold text-gray-800 mb-4">{t('sessions.feedback')}</h2>
            <Textarea 
              value={sessionData.feedback}
              onChange={(e) => setSessionData(prev => ({ ...prev, feedback: e.target.value }))}
              placeholder={t('sessions.phObservations')}
              className="min-h-[100px] border-gray-200"
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline"
          onClick={handleExport}
          className="border-amber-500 text-amber-600 hover:bg-amber-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-800 hover:bg-gray-900 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SessionPlanning;

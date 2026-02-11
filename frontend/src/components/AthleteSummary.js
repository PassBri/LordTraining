import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  User, Ruler, Scale, Activity, Heart, Brain, 
  TrendingUp, Calendar, Target, ChevronRight, Loader2,
  Dumbbell, Zap
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AthleteSummary = ({ athlete, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [anthropometricData, setAnthropometricData] = useState(null);
  const [testData, setTestData] = useState(null);
  const [characterization, setCharacterization] = useState(null);

  useEffect(() => {
    if (athlete?.id) {
      loadAthleteData();
    }
  }, [athlete?.id]);

  const loadAthleteData = async () => {
    setLoading(true);
    const token = localStorage.getItem('train_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Load anthropometric data
      const anthropometricRes = await axios.get(
        `${BACKEND_URL}/api/anthropometric/${athlete.id}`,
        { headers }
      ).catch(() => ({ data: null }));
      
      if (anthropometricRes.data?.records?.length > 0) {
        const lastRecord = anthropometricRes.data.records[anthropometricRes.data.records.length - 1];
        setAnthropometricData(lastRecord);
      }

      // Load test evaluations
      const testRes = await axios.get(
        `${BACKEND_URL}/api/tests/${athlete.id}`,
        { headers }
      ).catch(() => ({ data: null }));
      
      if (testRes.data) {
        setTestData(testRes.data);
      }

      // Load characterization
      const charRes = await axios.get(
        `${BACKEND_URL}/api/athlete-characterization/${athlete.id}`,
        { headers }
      ).catch(() => ({ data: null }));
      
      if (charRes.data) {
        setCharacterization(charRes.data);
      }
    } catch (error) {
      console.error('Error loading athlete data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate recommended load based on test data
  const calculateRecommendedLoad = () => {
    if (!testData?.tests || testData.tests.length === 0) return null;
    
    // Get the most recent tests
    const recentTests = testData.tests.slice(-5);
    let totalScore = 0;
    let count = 0;
    
    recentTests.forEach(test => {
      if (test.result) {
        const score = parseFloat(test.result);
        if (!isNaN(score)) {
          totalScore += score;
          count++;
        }
      }
    });
    
    if (count === 0) return null;
    
    const avgScore = totalScore / count;
    
    // Determine load recommendation
    if (avgScore >= 90) return { level: 'Muy Alta', percentage: '85-95%', color: 'text-red-600' };
    if (avgScore >= 75) return { level: 'Alta', percentage: '70-85%', color: 'text-orange-500' };
    if (avgScore >= 60) return { level: 'Media', percentage: '55-70%', color: 'text-yellow-600' };
    if (avgScore >= 40) return { level: 'Baja', percentage: '40-55%', color: 'text-green-600' };
    return { level: 'Recuperación', percentage: '< 40%', color: 'text-blue-600' };
  };

  const recommendedLoad = calculateRecommendedLoad();

  if (!athlete) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-dashed border-2 border-slate-300">
        <CardContent className="p-6 text-center">
          <User className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Selecciona un atleta</p>
          <p className="text-sm text-slate-400">Ver resumen y datos del atleta</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-lg border-0 overflow-hidden">
      {/* Header with athlete basic info */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="text-2xl font-bold">{athlete.name?.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{athlete.name}</h3>
            <p className="text-indigo-100 text-sm">
              {athlete.sport} • {athlete.level || 'Sin nivel'} • {athlete.age} años
            </p>
          </div>
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Anthropometric Summary */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-blue-800 flex items-center gap-2 text-sm">
              <Ruler className="w-4 h-4" />
              Datos Antropométricos
            </h4>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-blue-600"
              onClick={() => onNavigate?.('anthropometric')}
            >
              Ver más <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {anthropometricData?.measurements ? (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-white rounded p-2 text-center">
                <Scale className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold text-slate-800">
                  {anthropometricData.measurements.weight || '--'}
                </p>
                <p className="text-xs text-slate-500">Peso (kg)</p>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <Ruler className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold text-slate-800">
                  {anthropometricData.measurements.height || '--'}
                </p>
                <p className="text-xs text-slate-500">Talla (cm)</p>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <Activity className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold text-slate-800">
                  {anthropometricData.measurements.bodyFat || anthropometricData.measurements.bmi || '--'}
                </p>
                <p className="text-xs text-slate-500">
                  {anthropometricData.measurements.bodyFat ? 'Grasa (%)' : 'IMC'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-blue-600 text-center py-2">
              Sin datos antropométricos registrados
            </p>
          )}
        </div>

        {/* Test & Evaluations Summary */}
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-green-800 flex items-center gap-2 text-sm">
              <Target className="w-4 h-4" />
              Test y Evaluaciones
            </h4>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-green-600"
              onClick={() => onNavigate?.('tests')}
            >
              Ver más <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {testData?.tests?.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm text-green-700">
                <span className="font-semibold">{testData.tests.length}</span> evaluaciones registradas
              </p>
              <p className="text-xs text-green-600">
                Última: {testData.tests[testData.tests.length - 1]?.name || 'N/A'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-green-600 text-center py-2">
              Sin evaluaciones registradas
            </p>
          )}
        </div>

        {/* Recommended Load */}
        <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-orange-800 flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4" />
              Carga Recomendada
            </h4>
          </div>
          {recommendedLoad ? (
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-lg font-bold ${recommendedLoad.color}`}>
                  {recommendedLoad.level}
                </p>
                <p className="text-xs text-orange-600">
                  Intensidad: {recommendedLoad.percentage}
                </p>
              </div>
              <div className="text-right">
                <Dumbbell className={`w-8 h-8 ${recommendedLoad.color}`} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-orange-600 text-center py-2">
              Completa evaluaciones para calcular carga
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <p className="text-xs text-slate-500 mb-2">Acciones rápidas:</p>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-8"
              onClick={() => onNavigate?.('periodization')}
            >
              <Calendar className="w-3 h-3 mr-1" />
              Plan de Entrenamiento
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-8"
              onClick={() => onNavigate?.('graphic-plan')}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Plan Gráfico
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AthleteSummary;

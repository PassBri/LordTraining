import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  Bot, Send, Loader2, Sparkles, Dumbbell, BarChart, 
  Heart, Clock, ChevronRight, RefreshCw, Lightbulb
} from 'lucide-react';

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

// Quick action buttons
const QUICK_ACTIONS = [
  { icon: Dumbbell, label: "Ejercicios", type: "exercise", color: "text-blue-600 bg-blue-50" },
  { icon: BarChart, label: "Cargas", type: "load", color: "text-green-600 bg-green-50" },
  { icon: Clock, label: "Progresión", type: "progression", color: "text-purple-600 bg-purple-50" },
  { icon: Heart, label: "Recuperación", type: "recovery", color: "text-red-600 bg-red-50" }
];

const AITrainingAssistant = ({ 
  selectedAthlete = null,
  sportsCatalog = []
}) => {
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      text: '¡Hola! Soy tu asistente de entrenamiento. Puedo ayudarte con:\n\n• **Ejercicios**: Sugerencias específicas con series y reps\n• **Cargas**: Cálculo de volumen e intensidad óptimos\n• **Progresión**: Planificación semana a semana\n• **Recuperación**: Cuándo descansar\n\n¿En qué puedo ayudarte hoy?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [eliteInfo, setEliteInfo] = useState(null);
  const chatEndRef = useRef(null);
  const sessionId = useRef(`session-${Date.now()}`);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load suggested prompts
  useEffect(() => {
    fetchSuggestedPrompts();
  }, []);

  // Fetch elite level (medalla) of the selected athlete
  useEffect(() => {
    const aid = selectedAthlete?.id;
    if (!aid) { setEliteInfo(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('train_token');
        const res = await fetch(`${API_URL}/api/coach/athlete-score/${aid}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok && !cancelled) setEliteInfo(await res.json());
      } catch (e) { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, [selectedAthlete?.id]);

  const fetchSuggestedPrompts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ai-assistant/prompts`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedPrompts(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;
    
    const userMessage = {
      type: 'user',
      text: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/ai-assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          session_id: sessionId.current,
          athlete_context: selectedAthlete ? {
            name: selectedAthlete.name,
            sport: selectedAthlete.sport,
            level: selectedAthlete.level,
            age: selectedAthlete.age,
            weight: selectedAthlete.weight,
            objectives: selectedAthlete.objectives,
            evaluation_score: eliteInfo?.evaluation_score ?? null,
            elite_level: eliteInfo?.elite_level ?? null
          } : null
        })
      });
      
      if (!response.ok) throw new Error('Error en la respuesta');
      
      const data = await response.json();
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        text: data.response,
        suggestions: data.suggestions,
        timestamp: data.timestamp
      }]);
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        type: 'assistant',
        text: 'Lo siento, hubo un error. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      }]);
      toast.error('Error al comunicar con el asistente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (actionType) => {
    setIsLoading(true);
    
    const sport = selectedAthlete?.sport || 'general';
    const level = selectedAthlete?.level || 'intermedio';
    
    try {
      const response = await fetch(`${API_URL}/api/ai-assistant/quick-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: actionType,
          sport: sport,
          level: level,
          context: [
            selectedAthlete?.name ? `Atleta: ${selectedAthlete.name}` : null,
            eliteInfo?.elite_level ? `Nivel de élite: ${eliteInfo.elite_level}${eliteInfo.evaluation_score != null ? ` (${eliteInfo.evaluation_score}/100)` : ''}` : null
          ].filter(Boolean).join('. ') || null
        })
      });
      
      if (!response.ok) throw new Error('Error');
      
      const data = await response.json();
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        text: data.suggestion,
        timestamp: data.timestamp
      }]);
      
    } catch (error) {
      toast.error('Error al obtener sugerencia');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    sessionId.current = `session-${Date.now()}`;
    setMessages([{
      type: 'assistant',
      text: '¡Chat reiniciado! ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString()
    }]);
  };

  // Format message text with markdown-like formatting
  const formatMessage = (text) => {
    if (!text) return '';
    // OWASP XSS — escapar HTML antes de aplicar formato (evita inyección desde el contenido del chat)
    let formatted = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Convert bullet points
    formatted = formatted.replace(/^• /gm, '<span class="text-blue-500 mr-1">•</span>');
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br/>');
    
    return formatted;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Quick Actions - Now at top without card header */}
      <div className="px-4 pt-3 pb-2 bg-slate-50 border-b shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.type}
                onClick={() => handleQuickAction(action.type)}
                disabled={isLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${action.color} hover:opacity-80 disabled:opacity-50`}
              >
                <Icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.type === 'user' ? (
              <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[90%] space-y-2">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <p 
                    className="text-sm text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                  />
                </div>
                
                {/* Inline suggestions */}
                {msg.suggestions && (
                  <div className="flex gap-1 flex-wrap">
                    {msg.suggestions.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100"
                        onClick={() => handleSendMessage(suggestion)}
                      >
                        {suggestion}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-slate-500">Pensando...</span>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>
      
      {/* Suggested prompts */}
      {messages.length <= 1 && suggestedPrompts.length > 0 && (
        <div className="p-3 border-t bg-slate-50 shrink-0">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5" />
            Prueba preguntar:
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {suggestedPrompts[0]?.prompts?.slice(0, 3).map((prompt, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => handleSendMessage(prompt)}
              >
                {prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-3 border-t bg-white shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Pregunta sobre ejercicios, cargas, progresión..."
            disabled={isLoading}
            className="flex-1 h-10 text-sm"
          />
          <Button 
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            className="h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AITrainingAssistant;

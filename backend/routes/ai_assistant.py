"""
AI Training Assistant - Simple and practical
Single LLM that helps coaches with suggestions for loads, exercises, and planning
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/ai-assistant", tags=["AI Assistant"])

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

# System prompt for the training assistant
SYSTEM_PROMPT = """Eres un asistente de entrenamiento deportivo experto. Tu rol es ayudar a entrenadores con:

1. **Sugerencias de cargas**: Recomienda volumen, intensidad y frecuencia basado en el nivel del atleta
2. **Ejercicios**: Sugiere ejercicios específicos con series, repeticiones y descansos
3. **Periodización**: Ayuda a estructurar fases de entrenamiento
4. **Recuperación**: Indica cuándo reducir carga o descansar
5. **Progresiones**: Cómo avanzar semana a semana

REGLAS:
- Responde en español, de forma clara y concisa
- Da recomendaciones prácticas y específicas (números concretos)
- Si tienes datos del atleta, personaliza las sugerencias
- Usa formato con bullets o tablas cuando sea útil
- Sé directo, el entrenador necesita información práctica rápida

Ejemplos de respuestas útiles:
- "Para un atleta intermedio, sugiero: 4x8 sentadillas al 70%, descanso 2min"
- "Esta semana reduce volumen 30%, el ratio de carga está alto"
- "Progresión sugerida: Sem1: 60%, Sem2: 65%, Sem3: 70%, Sem4: descarga 50%"
"""

class ChatRequest(BaseModel):
    message: str
    session_id: str
    athlete_context: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None
    timestamp: str

class QuickSuggestionRequest(BaseModel):
    type: str  # "exercise", "load", "recovery", "progression"
    sport: str
    level: str
    context: Optional[str] = None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """Chat with the training assistant"""
    
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    # Build context from athlete data
    context = ""
    if request.athlete_context:
        ctx = request.athlete_context
        context = f"""
DATOS DEL ATLETA ACTUAL:
- Nombre: {ctx.get('name', 'No especificado')}
- Deporte: {ctx.get('sport', 'No especificado')}
- Nivel: {ctx.get('level', 'No especificado')}
- Edad: {ctx.get('age', 'No especificada')}
- Peso: {ctx.get('weight', 'No especificado')} kg
- Objetivos: {ctx.get('objectives', 'No especificados')}

Usa estos datos para personalizar tus sugerencias.
---
"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=request.session_id,
            system_message=SYSTEM_PROMPT
        ).with_model("openai", "gpt-4o-mini")  # Fast and cost-effective
        
        full_message = f"{context}\nPregunta del entrenador: {request.message}" if context else request.message
        user_message = UserMessage(text=full_message)
        
        response = await chat.send_message(user_message)
        
        # Extract quick suggestions if applicable
        suggestions = None
        if any(kw in request.message.lower() for kw in ["ejercicio", "sugiere", "recomienda", "qué hacer"]):
            suggestions = [
                "Ver ejercicios similares",
                "Calcular carga óptima",
                "Crear progresión semanal"
            ]
        
        return ChatResponse(
            response=response,
            suggestions=suggestions,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-suggestion")
async def get_quick_suggestion(request: QuickSuggestionRequest):
    """Get quick practical suggestions"""
    
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    prompts = {
        "exercise": f"Sugiere 3 ejercicios principales para {request.sport}, nivel {request.level}. Incluye series, reps e intensidad. Formato tabla.",
        "load": f"¿Qué carga (volumen e intensidad) recomiendas para un atleta de {request.sport} nivel {request.level} esta semana? Da números específicos.",
        "recovery": f"Señales de que un atleta de {request.sport} necesita descanso y qué hacer. Lista breve.",
        "progression": f"Progresión de 4 semanas para {request.sport} nivel {request.level}. Incluye % de intensidad por semana."
    }
    
    prompt = prompts.get(request.type, f"Da una sugerencia práctica para {request.type}")
    if request.context:
        prompt += f"\nContexto adicional: {request.context}"
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"quick-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            system_message="Eres un asistente de entrenamiento. Responde de forma breve, práctica y con datos específicos. En español."
        ).with_model("openai", "gpt-4o-mini")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "type": request.type,
            "suggestion": response,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prompts")
async def get_suggested_prompts():
    """Get suggested prompts for the chat"""
    return {
        "categories": [
            {
                "name": "Ejercicios",
                "prompts": [
                    "¿Qué ejercicios de fuerza recomiendas para fútbol?",
                    "Sugiere un circuito de 20 minutos para resistencia",
                    "Ejercicios de prevención de lesiones para corredores"
                ]
            },
            {
                "name": "Cargas",
                "prompts": [
                    "¿Cómo calcular la carga óptima semanal?",
                    "Mi atleta tiene ratio 1.4, ¿debo reducir?",
                    "Progresión de intensidad para 8 semanas"
                ]
            },
            {
                "name": "Planificación",
                "prompts": [
                    "Estructura un mesociclo de 4 semanas",
                    "¿Cuántas sesiones por semana para nivel intermedio?",
                    "Cómo distribuir volumen e intensidad"
                ]
            },
            {
                "name": "Recuperación",
                "prompts": [
                    "Señales de sobreentrenamiento",
                    "¿Cuándo hacer semana de descarga?",
                    "Protocolo de recuperación post-competencia"
                ]
            }
        ]
    }

"""
AI Coach Multi-Agent System
4 LLMs working together as a panel of experts for sports training
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/ai-coach", tags=["AI Coach"])

# Import LLM integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Get API key
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

# Expert configurations
EXPERTS = {
    "strategist": {
        "name": "Coach Estratega",
        "model": ("openai", "gpt-5.2"),
        "emoji": "🎯",
        "specialty": "Diseño de periodización y planificación estratégica",
        "system_message": """Eres un coach estratega experto en periodización deportiva. 
Tu especialidad es diseñar macrociclos, mesociclos y microciclos de entrenamiento.
Conoces los modelos de Matveev (tradicional), Verkhoshansky (bloques/ATR), y ondulante.
Respondes en español de forma clara y estructurada.
Cuando diseñes planes, incluye: fases, duración, objetivos por fase, y distribución de cargas."""
    },
    "analyst": {
        "name": "Analista de Rendimiento", 
        "model": ("anthropic", "claude-sonnet-4-5-20250929"),
        "emoji": "📊",
        "specialty": "Evaluación, análisis de datos y ajustes de carga",
        "system_message": """Eres un analista de rendimiento deportivo experto.
Tu especialidad es evaluar datos de atletas, calcular cargas óptimas, y detectar riesgos de sobreentrenamiento.
Analizas métricas como: ratio carga aguda/crónica, HRV, RPE, tiempo de recuperación.
Respondes en español con datos precisos y recomendaciones basadas en evidencia.
Cuando analices, incluye: estado actual, riesgos, y recomendaciones específicas."""
    },
    "exercise": {
        "name": "Especialista en Ejercicios",
        "model": ("gemini", "gemini-3-flash-preview"),
        "emoji": "💪",
        "specialty": "Selección de ejercicios, técnica y metodología",
        "system_message": """Eres un especialista en ejercicios y metodología del entrenamiento.
Tu especialidad es seleccionar ejercicios específicos para cada deporte, corregir técnica, y diseñar sesiones.
Conoces métodos como: series, repeticiones, circuitos, HIIT, pliometría, fuerza máxima, etc.
Respondes en español con ejercicios concretos y sus parámetros (series, reps, descanso, intensidad).
Siempre incluye: nombre del ejercicio, objetivo, parámetros, y variantes."""
    },
    "assistant": {
        "name": "Asistente Rápido",
        "model": ("openai", "gpt-4o-mini"),
        "emoji": "⚡",
        "specialty": "Respuestas rápidas y coordinación",
        "system_message": """Eres un asistente deportivo rápido y eficiente.
Tu rol es dar respuestas concisas, coordinar información entre expertos, y resolver dudas generales.
Respondes en español de forma breve y clara.
Si la pregunta requiere un experto específico, indícalo."""
    }
}

# Request/Response models
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    expert: Optional[str] = None
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str
    expert: Optional[str] = None  # If None, auto-select or use panel
    athlete_context: Optional[Dict[str, Any]] = None
    history: Optional[List[ChatMessage]] = []

class ExpertResponse(BaseModel):
    expert: str
    name: str
    emoji: str
    response: str
    timestamp: str

class ChatResponse(BaseModel):
    responses: List[ExpertResponse]
    suggested_expert: Optional[str] = None
    panel_discussion: Optional[str] = None

class PlanGenerationRequest(BaseModel):
    athlete_name: str
    sport: str
    level: str  # principiante, intermedio, avanzado, elite
    duration_weeks: int
    main_objective: str
    competitions: Optional[List[Dict[str, str]]] = []
    periodization_model: str = "tradicional"  # tradicional, atr, ondulante
    session_id: str

class GeneratedPlan(BaseModel):
    id: str
    athlete_name: str
    sport: str
    created_at: str
    strategist_plan: str
    analyst_review: str
    exercise_recommendations: str
    summary: str
    macrocycle: Dict[str, Any]
    mesocycles: List[Dict[str, Any]]
    microcycles: List[Dict[str, Any]]


async def get_expert_response(expert_key: str, message: str, context: str = "") -> str:
    """Get response from a specific expert"""
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    
    expert = EXPERTS[expert_key]
    provider, model = expert["model"]
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"train-{expert_key}-{datetime.now().strftime('%Y%m%d')}",
            system_message=expert["system_message"]
        ).with_model(provider, model)
        
        full_message = f"{context}\n\n{message}" if context else message
        user_message = UserMessage(text=full_message)
        
        response = await chat.send_message(user_message)
        return response
        
    except Exception as e:
        return f"Error del experto {expert['name']}: {str(e)}"


def detect_best_expert(message: str) -> str:
    """Detect which expert should handle the message"""
    message_lower = message.lower()
    
    # Keywords for each expert
    strategist_keywords = ["plan", "periodización", "macrociclo", "mesociclo", "microciclo", 
                          "temporada", "fase", "etapa", "ciclo", "programa", "diseñar", "crear plan"]
    analyst_keywords = ["carga", "recuperación", "fatiga", "sobreentrenamiento", "ratio", 
                       "hrv", "rpe", "análisis", "evaluar", "datos", "métricas", "ajustar"]
    exercise_keywords = ["ejercicio", "ejercicios", "sesión", "entrenamiento", "series", 
                        "repeticiones", "técnica", "fuerza", "resistencia", "velocidad", "potencia"]
    
    # Count matches
    strategist_score = sum(1 for kw in strategist_keywords if kw in message_lower)
    analyst_score = sum(1 for kw in analyst_keywords if kw in message_lower)
    exercise_score = sum(1 for kw in exercise_keywords if kw in message_lower)
    
    scores = {
        "strategist": strategist_score,
        "analyst": analyst_score,
        "exercise": exercise_score,
        "assistant": 0
    }
    
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "assistant"


@router.post("/chat", response_model=ChatResponse)
async def chat_with_experts(request: ChatRequest):
    """Chat with AI coaching experts"""
    
    # Build context from athlete data
    context = ""
    if request.athlete_context:
        ctx = request.athlete_context
        context = f"""CONTEXTO DEL ATLETA:
- Nombre: {ctx.get('name', 'No especificado')}
- Deporte: {ctx.get('sport', 'No especificado')}
- Nivel: {ctx.get('level', 'No especificado')}
- Edad: {ctx.get('age', 'No especificada')}
- Objetivos: {ctx.get('objectives', 'No especificados')}
"""
    
    responses = []
    
    if request.expert and request.expert in EXPERTS:
        # Single expert response
        expert_key = request.expert
        response_text = await get_expert_response(expert_key, request.message, context)
        expert = EXPERTS[expert_key]
        
        responses.append(ExpertResponse(
            expert=expert_key,
            name=expert["name"],
            emoji=expert["emoji"],
            response=response_text,
            timestamp=datetime.now().isoformat()
        ))
        
    else:
        # Auto-detect best expert for quick response
        best_expert = detect_best_expert(request.message)
        response_text = await get_expert_response(best_expert, request.message, context)
        expert = EXPERTS[best_expert]
        
        responses.append(ExpertResponse(
            expert=best_expert,
            name=expert["name"],
            emoji=expert["emoji"],
            response=response_text,
            timestamp=datetime.now().isoformat()
        ))
    
    return ChatResponse(
        responses=responses,
        suggested_expert=detect_best_expert(request.message)
    )


@router.post("/panel-discussion")
async def panel_discussion(request: ChatRequest):
    """Get responses from all experts (panel discussion)"""
    
    context = ""
    if request.athlete_context:
        ctx = request.athlete_context
        context = f"""CONTEXTO DEL ATLETA:
- Nombre: {ctx.get('name', 'No especificado')}
- Deporte: {ctx.get('sport', 'No especificado')}
- Nivel: {ctx.get('level', 'No especificado')}
"""
    
    # Get responses from all experts in parallel
    tasks = []
    for expert_key in ["strategist", "analyst", "exercise"]:
        expert = EXPERTS[expert_key]
        prompt = f"Como {expert['name']}, responde brevemente (máximo 3 párrafos) a: {request.message}"
        tasks.append(get_expert_response(expert_key, prompt, context))
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    responses = []
    expert_keys = ["strategist", "analyst", "exercise"]
    
    for i, (expert_key, result) in enumerate(zip(expert_keys, results)):
        expert = EXPERTS[expert_key]
        response_text = result if isinstance(result, str) else f"Error: {str(result)}"
        
        responses.append(ExpertResponse(
            expert=expert_key,
            name=expert["name"],
            emoji=expert["emoji"],
            response=response_text,
            timestamp=datetime.now().isoformat()
        ))
    
    # Generate summary with assistant
    summary_prompt = f"""Resume brevemente las opiniones de los expertos sobre: "{request.message}"
    
Estratega: {results[0][:500] if isinstance(results[0], str) else 'No disponible'}
Analista: {results[1][:500] if isinstance(results[1], str) else 'No disponible'}  
Ejercicios: {results[2][:500] if isinstance(results[2], str) else 'No disponible'}

Da una conclusión integrada en 2-3 oraciones."""

    summary = await get_expert_response("assistant", summary_prompt, "")
    
    return {
        "responses": [r.dict() for r in responses],
        "panel_summary": summary,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/generate-plan", response_model=GeneratedPlan)
async def generate_training_plan(request: PlanGenerationRequest):
    """Generate a complete training plan using all experts"""
    
    context = f"""SOLICITUD DE PLAN:
- Atleta: {request.athlete_name}
- Deporte: {request.sport}
- Nivel: {request.level}
- Duración: {request.duration_weeks} semanas
- Objetivo principal: {request.main_objective}
- Modelo de periodización: {request.periodization_model}
- Competencias: {request.competitions if request.competitions else 'No especificadas'}
"""
    
    # Step 1: Strategist designs the macrostructure
    strategist_prompt = f"""Diseña un plan de periodización {request.periodization_model} para:
{context}

Incluye:
1. División en fases/bloques con duración en semanas
2. Objetivos específicos de cada fase
3. Distribución porcentual de volumen e intensidad por fase
4. Momentos clave (picos de forma, descargas)

Formato estructurado y claro."""

    strategist_response = await get_expert_response("strategist", strategist_prompt, "")
    
    # Step 2: Analyst reviews and adds load recommendations
    analyst_prompt = f"""Revisa este plan de periodización y añade recomendaciones de carga:

PLAN DEL ESTRATEGA:
{strategist_response[:2000]}

Añade:
1. Ratio de carga aguda/crónica recomendado por fase
2. Indicadores de fatiga a monitorear
3. Criterios para ajustar la carga
4. Zonas de riesgo de sobreentrenamiento"""

    analyst_response = await get_expert_response("analyst", analyst_prompt, context)
    
    # Step 3: Exercise specialist adds specific exercises
    exercise_prompt = f"""Para este plan de {request.sport}, nivel {request.level}, recomienda ejercicios:

ESTRUCTURA DEL PLAN:
{strategist_response[:1500]}

Por cada fase del plan, sugiere:
1. 3-5 ejercicios principales con parámetros (series x reps @ %intensidad)
2. Métodos de entrenamiento apropiados
3. Progresión de ejercicios entre fases
4. Ejercicios de prevención de lesiones"""

    exercise_response = await get_expert_response("exercise", exercise_prompt, context)
    
    # Step 4: Assistant creates summary
    summary_prompt = f"""Resume en 3-4 oraciones el plan de entrenamiento para {request.athlete_name}:
- Estrategia: {strategist_response[:500]}
- Análisis: {analyst_response[:500]}
- Ejercicios: {exercise_response[:500]}"""

    summary = await get_expert_response("assistant", summary_prompt, "")
    
    # Build structured plan data
    plan_id = f"plan-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Parse phases from strategist response (simplified)
    num_phases = 4 if request.periodization_model == "tradicional" else 3
    weeks_per_phase = request.duration_weeks // num_phases
    
    phase_names = {
        "tradicional": ["Preparatorio General", "Preparatorio Específico", "Competitivo", "Transición"],
        "atr": ["Acumulación", "Transformación", "Realización"],
        "ondulante": ["Fase 1", "Fase 2", "Fase 3", "Fase 4"]
    }
    
    mesocycles = []
    for i, name in enumerate(phase_names.get(request.periodization_model, phase_names["tradicional"])[:num_phases]):
        mesocycles.append({
            "id": f"meso-{i+1}",
            "name": name,
            "weeks": weeks_per_phase,
            "start_week": i * weeks_per_phase + 1,
            "end_week": (i + 1) * weeks_per_phase,
            "intensity": 60 + (i * 10) if i < num_phases - 1 else 40,
            "volume": 80 - (i * 10) if i < num_phases - 1 else 30
        })
    
    microcycles = []
    for week in range(1, request.duration_weeks + 1):
        cycle_type = "Carga" if week % 4 != 0 else "Recuperación"
        microcycles.append({
            "id": f"micro-{week}",
            "week": week,
            "type": cycle_type,
            "sessions": 5 if cycle_type == "Carga" else 3
        })
    
    return GeneratedPlan(
        id=plan_id,
        athlete_name=request.athlete_name,
        sport=request.sport,
        created_at=datetime.now().isoformat(),
        strategist_plan=strategist_response,
        analyst_review=analyst_response,
        exercise_recommendations=exercise_response,
        summary=summary,
        macrocycle={
            "name": f"Plan {request.periodization_model.title()} - {request.main_objective}",
            "duration_weeks": request.duration_weeks,
            "model": request.periodization_model,
            "objective": request.main_objective,
            "phases": len(mesocycles)
        },
        mesocycles=mesocycles,
        microcycles=microcycles
    )


@router.get("/experts")
async def get_experts():
    """Get list of available experts"""
    return {
        expert_key: {
            "name": expert["name"],
            "emoji": expert["emoji"],
            "specialty": expert["specialty"]
        }
        for expert_key, expert in EXPERTS.items()
    }

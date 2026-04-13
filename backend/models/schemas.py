"""
Modelos Pydantic para el sistema de periodización unificado.
Esquema completo: Plan -> Macro -> Meso -> Micro -> Sesion -> Ejercicio
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import uuid
from datetime import datetime, timezone


# ============ ENUMS ============

class TipoCapacidad(str, Enum):
    FUERZA_MAXIMA = "fuerza_maxima"
    FUERZA_EXPLOSIVA = "fuerza_explosiva"
    FUERZA_RESISTENCIA = "fuerza_resistencia"
    RESISTENCIA_AEROBICA = "resistencia_aerobica"
    RESISTENCIA_ANAEROBICA = "resistencia_anaerobica"
    VELOCIDAD = "velocidad"
    VELOCIDAD_REACCION = "velocidad_reaccion"
    FLEXIBILIDAD = "flexibilidad"
    COORDINACION = "coordinacion"
    AGILIDAD = "agilidad"
    POTENCIA = "potencia"
    EQUILIBRIO = "equilibrio"
    TECNICA = "tecnica"
    TACTICA = "tactica"

class ModeloPeriodizacion(str, Enum):
    TRADITIONAL = "traditional"
    ATR = "atr"
    BLOCKS = "blocks"
    UNDULATING_DAILY = "undulating_daily"
    UNDULATING_WEEKLY = "undulating_weekly"
    PENDULUM = "pendulum"
    CONCURRENT = "concurrent"
    CONJUGATE = "conjugate"
    POLARIZED = "polarized"
    INVERSE = "inverse"
    TACTICAL = "tactical"

class NivelPropagacion(str, Enum):
    EJERCICIO = "ejercicio"
    SESION = "sesion"
    MICRO = "micro"
    MESO = "meso"
    MACRO = "macro"

class NivelCapacidadBloque(str, Enum):
    MACRO = "macro"
    MESO = "meso"
    MICRO = "micro"

class NivelAlerta(str, Enum):
    ERROR = "error"
    ADVERTENCIA = "advertencia"
    INFO = "info"

class TipoAlerta(str, Enum):
    ACWR_ALTO = "acwr_alto"
    ACWR_BAJO = "acwr_bajo"
    VOL_INT_ALTO = "vol_int_alto"
    SIN_DESCARGA = "sin_descarga"
    INTERFERENCIA = "interferencia"
    ORDEN_INCORRECTO = "orden_incorrecto"
    SOBREVOLUMEN = "sobrevolumen"


# ============ MODELOS DE DATOS ============

def gen_id():
    return str(uuid.uuid4())

def now_iso():
    return datetime.now(timezone.utc).isoformat()


class AtletaCreate(BaseModel):
    nombre: str
    edad: int
    peso_kg: float = 70.0
    altura_cm: float = 170.0
    fc_reposo: int = 60
    fc_max: int = 190
    deporte: str = "other"
    nivel: str = "intermedio"

class AtletaDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    coach_id: str = ""
    nombre: str
    edad: int
    peso_kg: float = 70.0
    altura_cm: float = 170.0
    fc_reposo: int = 60
    fc_max: int = 190
    deporte: str = "other"
    nivel: str = "intermedio"
    fecha_registro: str = Field(default_factory=now_iso)


class EjercicioBaseCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    grupo_muscular: str = ""
    patron_movimiento: str = ""
    capacidades_principales: List[str] = []
    equipamiento: str = ""
    nivel_dificultad: int = 1
    video_url: Optional[str] = None
    imagen_url: Optional[str] = None

class EjercicioBaseDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    coach_id: str = ""
    nombre: str
    descripcion: Optional[str] = None
    grupo_muscular: str = ""
    patron_movimiento: str = ""
    capacidades_principales: List[str] = []
    equipamiento: str = ""
    nivel_dificultad: int = 1
    video_url: Optional[str] = None
    imagen_url: Optional[str] = None
    is_public: bool = True
    created_at: str = Field(default_factory=now_iso)


class EjercicioSesionCreate(BaseModel):
    sesion_id: str
    ejercicio_base_id: Optional[str] = None
    nombre: Optional[str] = None
    orden: int = 0
    capacidad_tipo: str = "fuerza_maxima"
    series: int = 3
    repeticiones: int = 10
    peso_kg: float = 0.0
    porcentaje_1RM: float = 0.0
    RPE_ejercicio: float = 0.0
    descanso_seg: int = 90
    tiempo_bajo_tension: float = 0.0
    velocidad_ejecucion: Optional[str] = None
    ROM: Optional[float] = None
    complejidad_coord: Optional[float] = None

class EjercicioSesionDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    sesion_id: str
    ejercicio_base_id: Optional[str] = None
    nombre: Optional[str] = None
    orden: int = 0
    capacidad_tipo: str = "fuerza_maxima"
    series: int = 3
    repeticiones: int = 10
    peso_kg: float = 0.0
    porcentaje_1RM: float = 0.0
    RPE_ejercicio: float = 0.0
    descanso_seg: int = 90
    tiempo_bajo_tension: float = 0.0
    velocidad_ejecucion: Optional[str] = None
    ROM: Optional[float] = None
    complejidad_coord: Optional[float] = None
    tonelaje_calculado: float = 0.0
    vol_relativo: float = 0.0


class SesionCreate(BaseModel):
    microciclo_id: str
    nombre: str = "Sesion"
    fecha: Optional[str] = None
    orden_dia: int = 1
    duracion_minutos: int = 60
    RPE_sesion: float = 0.0
    fc_media: Optional[float] = None
    fc_max_alcanzada: Optional[float] = None
    notas: Optional[str] = None
    completada: bool = False

class SesionDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    microciclo_id: str
    nombre: str = "Sesion"
    fecha: Optional[str] = None
    orden_dia: int = 1
    duracion_minutos: int = 60
    RPE_sesion: float = 0.0
    carga_sesion: float = 0.0
    vol_calculado: float = 0.0
    int_calculado: float = 0.0
    den_calculado: float = 0.0
    fc_media: Optional[float] = None
    fc_max_alcanzada: Optional[float] = None
    TRIMP: float = 0.0
    tonelaje: float = 0.0
    notas: Optional[str] = None
    completada: bool = False


class MicrocicloCreate(BaseModel):
    mesociclo_id: str
    numero_semana: int = 1
    tipo: str = "corriente"
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None

class MicrocicloDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    mesociclo_id: str
    numero_semana: int = 1
    tipo: str = "corriente"
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    vol_calculado: float = 0.0
    int_calculado: float = 0.0
    den_calculado: float = 0.0
    carga_total: float = 0.0
    carga_aguda: float = 0.0
    carga_cronica: float = 0.0
    ACWR: float = 0.0
    tonelaje_kg: float = 0.0
    RPE_promedio: float = 0.0


class MesocicloCreate(BaseModel):
    macrociclo_id: str
    nombre: str = "Mesociclo"
    tipo: str = "basico_desarrollador"
    orden: int = 0
    duracion_semanas: int = 4
    semana_descarga: Optional[int] = None
    reduccion_descarga: float = 0.4
    vol_objetivo: Optional[float] = None
    int_objetivo: Optional[float] = None
    den_objetivo: Optional[float] = None

class MesocicloDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    macrociclo_id: str
    nombre: str = "Mesociclo"
    tipo: str = "basico_desarrollador"
    orden: int = 0
    duracion_semanas: int = 4
    semana_descarga: Optional[int] = None
    reduccion_descarga: float = 0.4
    vol_objetivo: Optional[float] = None
    int_objetivo: Optional[float] = None
    den_objetivo: Optional[float] = None
    vol_calculado: float = 0.0
    int_calculado: float = 0.0
    den_calculado: float = 0.0
    carga_total: float = 0.0
    ACWR: float = 0.0
    tonelaje_kg: float = 0.0
    RPE_promedio: float = 0.0


class MacrocicloCreate(BaseModel):
    plan_id: str
    nombre: str = "Macrociclo"
    tipo: str = "prep_general"
    color: str = "#3B82F6"
    orden: int = 0
    duracion_semanas: int = 12
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    vol_objetivo: Optional[float] = None
    int_objetivo: Optional[float] = None
    den_objetivo: Optional[float] = None

class MacrocicloDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    plan_id: str
    nombre: str = "Macrociclo"
    tipo: str = "prep_general"
    color: str = "#3B82F6"
    orden: int = 0
    duracion_semanas: int = 12
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    vol_objetivo: Optional[float] = None
    int_objetivo: Optional[float] = None
    den_objetivo: Optional[float] = None
    vol_calculado: float = 0.0
    int_calculado: float = 0.0
    den_calculado: float = 0.0
    carga_total: float = 0.0
    ACWR: float = 0.0
    RPE_promedio: float = 0.0
    alerta: Optional[str] = None
    progreso_porcentaje: float = 0.0


class PlanEntrenamientoCreate(BaseModel):
    nombre: str
    modelo_periodizacion: str = "atr"
    deporte: str = "other"
    atleta_id: Optional[str] = None
    duracion_semanas: int = 52
    fecha_inicio: str = ""
    fecha_competicion: Optional[str] = None

class PlanEntrenamientoDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    coach_id: str = ""
    nombre: str
    modelo_periodizacion: str = "atr"
    deporte: str = "other"
    atleta_id: Optional[str] = None
    duracion_semanas: int = 52
    fecha_inicio: str = ""
    fecha_competicion: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class CapacidadPlanCreate(BaseModel):
    plan_id: str
    capacidad_tipo: str
    MEV: float = 0.0
    MAV: float = 0.0
    MRV: float = 0.0

class CapacidadPlanDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    plan_id: str
    capacidad_tipo: str
    MEV: float = 0.0
    MAV: float = 0.0
    MRV: float = 0.0
    series_actuales_semana: float = 0.0


class CapacidadBloqueCreate(BaseModel):
    bloque_id: str
    nivel: str
    capacidad_tipo: str
    vol_objetivo: Optional[float] = None
    int_objetivo: Optional[float] = None

class CapacidadBloqueDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    bloque_id: str
    nivel: str
    capacidad_tipo: str
    vol_objetivo: Optional[float] = None
    int_objetivo: Optional[float] = None
    vol_calculado: float = 0.0
    int_calculado: float = 0.0


class HistoricoCargaCreate(BaseModel):
    atleta_id: str
    fecha: str
    carga_diaria: float
    fuente: Optional[str] = None

class HistoricoCargaDB(BaseModel):
    id: str = Field(default_factory=gen_id)
    atleta_id: str
    fecha: str
    carga_diaria: float
    fuente: Optional[str] = None


class Alerta(BaseModel):
    id: str = Field(default_factory=gen_id)
    plan_id: str
    nivel: str
    bloque_id: str
    tipo: str
    severidad: str = "advertencia"
    mensaje: str = ""
    resuelta: bool = False
    created_at: str = Field(default_factory=now_iso)


# ============ RESPONSE MODELS ============

class MetricasResumen(BaseModel):
    vol_calculado: float = 0.0
    int_calculado: float = 0.0
    den_calculado: float = 0.0
    carga_total: float = 0.0
    tonelaje_kg: float = 0.0
    RPE_promedio: float = 0.0
    ACWR: float = 0.0
    progreso_porcentaje: float = 0.0

class PlanCompletoResponse(BaseModel):
    plan: Dict[str, Any]
    macrociclos: List[Dict[str, Any]]
    mesociclos: List[Dict[str, Any]]
    microciclos: List[Dict[str, Any]]
    sesiones: List[Dict[str, Any]]
    ejercicios: List[Dict[str, Any]]
    capacidades: List[Dict[str, Any]]
    alertas: List[Dict[str, Any]]
    metricas: Dict[str, Any] = {}

class PropagacionResult(BaseModel):
    niveles_actualizados: List[str] = []
    alertas_generadas: List[Dict[str, Any]] = []
    metricas: Dict[str, Any] = {}

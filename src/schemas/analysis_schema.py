from __future__ import annotations

from pydantic import BaseModel, Field


ETHICAL_WARNING = "Este resultado es una alerta para revisión humana, no una acusación automática de fraude."


class Alert(BaseModel):
    regla: str
    detalle: str
    puntos: float


class AIAgentResponse(BaseModel):
    score_ia: float = Field(ge=0, le=100)
    nivel_riesgo_ia: str
    patrones_detectados: list[str]
    inconsistencias: list[str]
    analisis_narrativa: str
    explicacion: str
    recomendacion_revision: str
    advertencia_etica: str = ETHICAL_WARNING


class AnalysisResponse(BaseModel):
    id_siniestro: str
    score_reglas: float
    score_patrones: float
    score_ia: float
    score_final: float
    nivel: str
    alertas: list[Alert]
    patrones_detectados: list[str]
    inconsistencias: list[str]
    analisis_narrativa: str
    explicacion: str
    recomendacion_revision: str
    advertencia_etica: str = ETHICAL_WARNING


class TopRiskResponse(BaseModel):
    total_evaluados: int
    casos: list[AnalysisResponse]


class ProviderAlertSummary(BaseModel):
    proveedor: str
    total_alertas: int
    casos_observados: int
    score_promedio: float
    principales_senales: list[str]


class ExecutiveSummary(BaseModel):
    total_casos: int
    verdes: int
    amarillos: int
    rojos: int
    score_promedio: float
    principales_patrones: list[str]
    proveedores_con_mas_alertas: list[ProviderAlertSummary]
    recomendacion_revision: str
    advertencia_etica: str = ETHICAL_WARNING


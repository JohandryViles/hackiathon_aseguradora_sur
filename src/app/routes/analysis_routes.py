from __future__ import annotations

from fastapi import APIRouter, Body
from fastapi import Query

from src.schemas.analysis_schema import AnalysisResponse
from src.schemas.claim_schema import BatchAnalysisRequest, ClaimInput
from src.services.fraud_analysis_service import FraudAnalysisService


router = APIRouter(prefix="/api/analysis", tags=["analysis"])
service = FraudAnalysisService()


CLAIM_EXAMPLE = {
    "id_siniestro": "SIN-001",
    "id_poliza": "POL-1001",
    "id_asegurado": "ASEG-001",
    "ramo": "Vehiculos",
    "cobertura": "Robo",
    "fecha_ocurrencia": "2026-05-01",
    "fecha_reporte": "2026-05-08",
    "monto_reclamado": 12000,
    "monto_estimado": 7000,
    "monto_pagado": 0,
    "estado": "Reserva",
    "sucursal": "Quito",
    "ciudad": "Quito",
    "descripcion": "El asegurado reporta robo del vehiculo pocos dias despues de contratar la poliza.",
    "documentos_completos": False,
    "beneficiario": "PROV-001",
    "dias_desde_inicio_poliza": 8,
    "dias_desde_fin_poliza": 300,
    "dias_entre_ocurrencia_reporte": 7,
    "historial_siniestros_asegurado": 3,
}


@router.post(
    "/claim",
    response_model=AnalysisResponse,
    summary="Analizar un siniestro individual",
)
def analyze_claim(
    use_ai: bool = Query(default=False, description="Usar OpenAI/LangChain. Por defecto usa analisis local rapido."),
    claim: ClaimInput = Body(
        ...,
        examples=[CLAIM_EXAMPLE],
    )
) -> AnalysisResponse:
    return service.analyze_claim(claim, use_ai=use_ai)


@router.post(
    "/batch",
    response_model=list[AnalysisResponse],
    summary="Analizar varios siniestros",
)
def analyze_batch(
    use_ai: bool = Query(default=False, description="Usar OpenAI/LangChain. Por defecto usa analisis local rapido."),
    request: BatchAnalysisRequest = Body(
        ...,
        examples=[{"claims": [CLAIM_EXAMPLE]}],
    )
) -> list[AnalysisResponse]:
    return service.analyze_batch(request.claims, use_ai=use_ai)


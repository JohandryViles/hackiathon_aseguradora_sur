from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.schemas.analysis_schema import AnalysisResponse, ExecutiveSummary, ProviderAlertSummary, TopRiskResponse
from src.services.fraud_analysis_service import FraudAnalysisService


router = APIRouter(prefix="/api/agent", tags=["agent"])
service = FraudAnalysisService()


@router.get(
    "/top-risk",
    response_model=TopRiskResponse,
    summary="Consultar los casos de mayor riesgo",
)
def top_risk(limit: int = Query(default=10, ge=1, le=50)) -> TopRiskResponse:
    return service.top_risk(limit=limit)


@router.get(
    "/explain/{claim_id}",
    response_model=AnalysisResponse,
    summary="Explicar un siniestro especifico",
)
def explain_claim(claim_id: str) -> AnalysisResponse:
    analysis = service.explain_claim(claim_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"No se encontro el siniestro {claim_id}")
    return analysis


@router.get(
    "/providers-alerts",
    response_model=list[ProviderAlertSummary],
    summary="Consultar proveedores con mas alertas",
)
def providers_alerts(limit: int = Query(default=10, ge=1, le=50)) -> list[ProviderAlertSummary]:
    return service.providers_alerts(limit=limit)


@router.get(
    "/executive-summary",
    response_model=ExecutiveSummary,
    summary="Generar resumen ejecutivo",
)
def executive_summary() -> ExecutiveSummary:
    return service.executive_summary()


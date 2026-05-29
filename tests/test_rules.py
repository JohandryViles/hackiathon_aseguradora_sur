from src.rules.fraud_rules import evaluate_business_rules
from src.schemas.claim_schema import ClaimInput
from src.scoring.risk_score import classify_score, combine_scores
from src.services.fraud_analysis_service import FraudAnalysisService


def test_business_rules_score_expected_alerts() -> None:
    claim = ClaimInput(
        id_siniestro="SIN-TEST",
        monto_reclamado=12000,
        monto_estimado=7000,
        documentos_completos=False,
        dias_desde_inicio_poliza=8,
        dias_entre_ocurrencia_reporte=7,
        historial_siniestros_asegurado=3,
        provider_observed_cases=3,
        similitud_narrativa=0.86,
    )

    score, alerts = evaluate_business_rules(claim)

    assert score == 44
    assert classify_score(score) == "Amarillo"
    assert [alert.regla for alert in alerts] == [
        "Reclamo cercano al inicio de vigencia",
        "Reporte tardio",
        "Alta frecuencia de reclamos del asegurado",
        "Documentos incompletos",
        "Beneficiario o proveedor recurrente",
        "Monto reclamado atipico",
        "Narrativas similares",
    ]


def test_hybrid_score_formula() -> None:
    assert combine_scores(score_reglas=25, score_patrones=60, score_ia=75) == 46.25


def test_analysis_service_returns_human_review_language() -> None:
    claim = ClaimInput(
        id_siniestro="SIN-IA",
        monto_reclamado=12000,
        monto_estimado=7000,
        descripcion="Robo reportado pocos dias despues de contratar la poliza.",
        documentos_completos=False,
        dias_desde_inicio_poliza=8,
        dias_entre_ocurrencia_reporte=7,
        historial_siniestros_asegurado=3,
    )

    response = FraudAnalysisService().analyze_claim(claim, use_ai=False)

    assert response.advertencia_etica
    assert "revisión humana" in response.explicacion
    assert response.nivel in {"Verde", "Amarillo", "Rojo"}

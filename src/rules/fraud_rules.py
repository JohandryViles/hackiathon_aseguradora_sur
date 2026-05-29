from __future__ import annotations

from src.schemas.analysis_schema import Alert
from src.schemas.claim_schema import ClaimInput
from src.scoring.risk_score import clamp_score


def _add(alerts: list[Alert], regla: str, detalle: str, puntos: float) -> float:
    alerts.append(Alert(regla=regla, detalle=detalle, puntos=puntos))
    return puntos


def evaluate_business_rules(claim: ClaimInput) -> tuple[float, list[Alert]]:
    alerts: list[Alert] = []
    score = 0.0

    days_from_start = claim.dias_desde_inicio_poliza
    if days_from_start is not None:
        if days_from_start <= 10:
            score += _add(
                alerts,
                "Reclamo cercano al inicio de vigencia",
                "El siniestro ocurrio dentro de los primeros 10 dias de la poliza; es una posible señal de riesgo.",
                8,
            )
        elif days_from_start <= 30:
            score += _add(
                alerts,
                "Reclamo cercano al inicio de vigencia",
                "El siniestro ocurrio entre 11 y 30 dias desde el inicio de vigencia.",
                4,
            )

    report_delay = claim.dias_entre_ocurrencia_reporte
    if report_delay is not None:
        if report_delay > 7:
            score += _add(
                alerts,
                "Reporte tardio",
                "El evento fue reportado despues de 7 dias; requiere revisión humana.",
                5,
            )
        elif report_delay >= 4:
            score += _add(
                alerts,
                "Reporte tardio",
                "El evento fue reportado entre 4 y 7 dias despues de la ocurrencia.",
                3,
            )

    previous_claims = claim.historial_siniestros_asegurado or 0
    if previous_claims >= 3:
        score += _add(
            alerts,
            "Alta frecuencia de reclamos del asegurado",
            "El asegurado registra 3 o mas siniestros; caso priorizado para análisis.",
            8,
        )
    elif previous_claims == 2:
        score += _add(
            alerts,
            "Alta frecuencia de reclamos del asegurado",
            "El asegurado registra 2 siniestros previos.",
            4,
        )

    if claim.documentos_completos is False or claim.documentos_faltantes:
        missing = ", ".join(claim.documentos_faltantes) if claim.documentos_faltantes else "documentos obligatorios"
        score += _add(
            alerts,
            "Documentos incompletos",
            f"Faltan {missing}; alerta preventiva para validacion documental.",
            4,
        )

    document_points = 0.0
    if claim.documentos_inconsistentes:
        document_points += 10
    if claim.documentos_ilegibles:
        document_points = max(document_points, 6)
    if document_points:
        score += _add(
            alerts,
            "Documentos inconsistentes",
            "Hay fechas incoherentes, valores distintos o documentos ilegibles; requiere revisión humana.",
            min(document_points, 10),
        )

    provider_cases = claim.provider_observed_cases or 0
    provider_watchlist = claim.proveedor_en_lista_restrictiva
    if provider_watchlist is None and claim.contexto_proveedor:
        provider_watchlist = bool(claim.contexto_proveedor.get("en_lista_restrictiva"))

    if provider_watchlist:
        score += _add(
            alerts,
            "Beneficiario o proveedor recurrente",
            "El proveedor aparece en lista restrictiva; es una posible señal de riesgo.",
            10,
        )
    elif provider_cases > 2:
        score += _add(
            alerts,
            "Beneficiario o proveedor recurrente",
            "El proveedor aparece en mas de 2 casos observados; patrón atípico para revision.",
            5,
        )

    estimated = claim.monto_estimado or 0
    if estimated > 0 and claim.monto_reclamado > estimated * 1.5:
        score += _add(
            alerts,
            "Monto reclamado atipico",
            "El monto reclamado supera 1.5 veces el monto estimado; alerta preventiva.",
            8,
        )

    if claim.suma_asegurada and claim.suma_asegurada > 0:
        ratio = claim.monto_reclamado / claim.suma_asegurada
        if ratio >= 0.95:
            score += _add(
                alerts,
                "Monto cercano a suma asegurada",
                "El monto reclamado esta muy cerca de la suma asegurada; posible señal de riesgo.",
                5,
            )

    similarity = claim.similitud_narrativa
    if similarity is not None:
        normalized_similarity = similarity / 100 if similarity > 1 else similarity
        if normalized_similarity > 0.85:
            score += _add(
                alerts,
                "Narrativas similares",
                "La narrativa supera 85% de similitud con otros reclamos; patrón atípico.",
                8,
            )
        elif normalized_similarity >= 0.70:
            score += _add(
                alerts,
                "Narrativas similares",
                "La narrativa tiene entre 70% y 84% de similitud con otros reclamos.",
                4,
            )

    return clamp_score(score), alerts


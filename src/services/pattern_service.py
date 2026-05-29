from __future__ import annotations

from dataclasses import dataclass, field

from src.schemas.claim_schema import ClaimInput
from src.scoring.risk_score import clamp_score
from src.services.data_service import DataService


@dataclass
class PatternResult:
    score: float
    patrones_detectados: list[str] = field(default_factory=list)
    inconsistencias: list[str] = field(default_factory=list)


class PatternService:
    def __init__(self, data_service: DataService | None = None) -> None:
        self.data_service = data_service or DataService()

    def analyze(self, claim: ClaimInput) -> PatternResult:
        score = 0.0
        patterns: list[str] = []
        inconsistencies: list[str] = []

        branch_average = self.data_service.branch_average_amount(claim.ramo)
        if branch_average and claim.monto_reclamado > branch_average * 1.6:
            score += 25
            patterns.append(
                "Monto reclamado supera ampliamente el promedio del ramo; patrón atípico y alerta preventiva."
            )

        if claim.monto_estimado and claim.monto_estimado > 0:
            ratio = claim.monto_reclamado / claim.monto_estimado
            if ratio > 1.5:
                score += 20
                inconsistencies.append(
                    "Monto reclamado mayor a 1.5 veces el monto estimado; requiere revisión humana."
                )
            elif ratio > 1.25:
                score += 10
                patterns.append("Monto reclamado moderadamente superior al estimado.")

        if claim.suma_asegurada and claim.suma_asegurada > 0:
            insured_ratio = claim.monto_reclamado / claim.suma_asegurada
            if insured_ratio >= 0.95:
                score += 15
                patterns.append("Monto cercano a suma asegurada; posible señal de riesgo.")

        provider_cases = claim.provider_observed_cases or 0
        if claim.proveedor_en_lista_restrictiva:
            score += 25
            inconsistencies.append("Proveedor en lista restrictiva; caso priorizado para análisis.")
        elif provider_cases > 2:
            score += 12
            patterns.append("Proveedor recurrente en mas de 2 casos observados.")

        previous_claims = claim.historial_siniestros_asegurado or 0
        if previous_claims >= 3:
            score += 15
            patterns.append("Historial de asegurado con alta frecuencia de siniestros.")
        elif previous_claims == 2:
            score += 8
            patterns.append("Historial de asegurado con frecuencia moderada de siniestros.")

        similarity = claim.similitud_narrativa
        if similarity is not None:
            normalized_similarity = similarity / 100 if similarity > 1 else similarity
            if normalized_similarity > 0.85:
                score += 18
                patterns.append("Narrativa con similitud superior a 85%; patrón atípico.")
            elif normalized_similarity >= 0.70:
                score += 9
                patterns.append("Narrativa con similitud entre 70% y 84%.")

        for observation in claim.documentos_observaciones:
            if observation:
                score += 10
                inconsistencies.append(f"Señales documentales extraidas: {observation}")

        if claim.documentos_inconsistentes:
            score += 15
            inconsistencies.append("Documentos marcados como inconsistentes o ilegibles.")

        if not patterns and not inconsistencies:
            patterns.append("No se detectaron patrones atipicos relevantes frente al dataset disponible.")

        return PatternResult(
            score=clamp_score(score),
            patrones_detectados=patterns,
            inconsistencias=inconsistencies,
        )


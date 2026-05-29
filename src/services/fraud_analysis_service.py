from __future__ import annotations

from collections import Counter, defaultdict

from src.ai_agent.claims_agent import ClaimsAgent
from src.rules.fraud_rules import evaluate_business_rules
from src.schemas.analysis_schema import (
    AnalysisResponse,
    ExecutiveSummary,
    ProviderAlertSummary,
    TopRiskResponse,
)
from src.schemas.claim_schema import ClaimInput
from src.scoring.risk_score import classify_score, combine_scores
from src.services.data_service import DataService
from src.services.pattern_service import PatternService


class FraudAnalysisService:
    def __init__(
        self,
        data_service: DataService | None = None,
        pattern_service: PatternService | None = None,
        claims_agent: ClaimsAgent | None = None,
    ) -> None:
        self.data_service = data_service or DataService()
        self.pattern_service = pattern_service or PatternService(self.data_service)
        self.claims_agent = claims_agent or ClaimsAgent()

    def analyze_claim(self, claim: ClaimInput, use_ai: bool = True) -> AnalysisResponse:
        score_reglas, alerts = evaluate_business_rules(claim)
        pattern_result = self.pattern_service.analyze(claim)
        ai_result = self.claims_agent.analyze(
            claim,
            score_reglas,
            alerts,
            pattern_result,
            force_local=not use_ai,
        )
        score_final = combine_scores(score_reglas, pattern_result.score, ai_result.score_ia)
        nivel = classify_score(score_final)

        explanation = ai_result.explicacion
        if "posible señal de riesgo" not in explanation.lower() and score_final > 40:
            explanation = f"{explanation} El resultado se interpreta como posible señal de riesgo."

        return AnalysisResponse(
            id_siniestro=claim.id_siniestro,
            score_reglas=score_reglas,
            score_patrones=pattern_result.score,
            score_ia=ai_result.score_ia,
            score_final=score_final,
            nivel=nivel,
            alertas=alerts,
            patrones_detectados=ai_result.patrones_detectados,
            inconsistencias=ai_result.inconsistencias,
            analisis_narrativa=ai_result.analisis_narrativa,
            explicacion=explanation,
            recomendacion_revision=ai_result.recomendacion_revision,
            advertencia_etica=ai_result.advertencia_etica,
        )

    def analyze_batch(self, claims: list[ClaimInput]) -> list[AnalysisResponse]:
        return [self.analyze_claim(claim) for claim in claims]

    def analyze_dataset(self, limit: int | None = None, use_ai: bool = False) -> list[AnalysisResponse]:
        claims = self.data_service.list_claims(limit=limit)
        return [self.analyze_claim(claim, use_ai=use_ai) for claim in claims]

    def top_risk(self, limit: int = 10) -> TopRiskResponse:
        analyses = self.analyze_dataset(use_ai=False)
        sorted_cases = sorted(analyses, key=lambda item: item.score_final, reverse=True)[:limit]
        return TopRiskResponse(total_evaluados=len(analyses), casos=sorted_cases)

    def explain_claim(self, claim_id: str) -> AnalysisResponse | None:
        claim = self.data_service.find_claim(claim_id)
        if not claim:
            return None
        return self.analyze_claim(claim)

    def providers_alerts(self, limit: int = 10) -> list[ProviderAlertSummary]:
        claims = self.data_service.list_claims()
        grouped: dict[str, list[AnalysisResponse]] = defaultdict(list)
        for claim in claims:
            provider = claim.provider_id or "SIN_PROVEEDOR"
            grouped[provider].append(self.analyze_claim(claim, use_ai=False))

        summaries: list[ProviderAlertSummary] = []
        for provider, analyses in grouped.items():
            flagged = [item for item in analyses if item.nivel in {"Amarillo", "Rojo"} or item.alertas]
            if not flagged:
                continue
            signal_counter: Counter[str] = Counter()
            for analysis in flagged:
                signal_counter.update(alert.regla for alert in analysis.alertas)
                signal_counter.update(analysis.patrones_detectados[:2])
            summaries.append(
                ProviderAlertSummary(
                    proveedor=provider,
                    total_alertas=sum(len(item.alertas) + len(item.inconsistencias) for item in flagged),
                    casos_observados=len(flagged),
                    score_promedio=round(sum(item.score_final for item in flagged) / len(flagged), 2),
                    principales_senales=[item for item, _ in signal_counter.most_common(5)],
                )
            )

        return sorted(summaries, key=lambda item: (item.score_promedio, item.total_alertas), reverse=True)[:limit]

    def executive_summary(self) -> ExecutiveSummary:
        analyses = self.analyze_dataset(use_ai=False)
        if not analyses:
            return ExecutiveSummary(
                total_casos=0,
                verdes=0,
                amarillos=0,
                rojos=0,
                score_promedio=0,
                principales_patrones=[],
                proveedores_con_mas_alertas=[],
                recomendacion_revision="Cargar datos sinteticos o CSV antes de generar un resumen ejecutivo.",
            )

        pattern_counter: Counter[str] = Counter()
        for analysis in analyses:
            pattern_counter.update(analysis.patrones_detectados[:3])
            pattern_counter.update(analysis.inconsistencias[:3])

        return ExecutiveSummary(
            total_casos=len(analyses),
            verdes=sum(1 for item in analyses if item.nivel == "Verde"),
            amarillos=sum(1 for item in analyses if item.nivel == "Amarillo"),
            rojos=sum(1 for item in analyses if item.nivel == "Rojo"),
            score_promedio=round(sum(item.score_final for item in analyses) / len(analyses), 2),
            principales_patrones=[item for item, _ in pattern_counter.most_common(8)],
            proveedores_con_mas_alertas=self.providers_alerts(limit=5),
            recomendacion_revision=(
                "Priorizar casos rojos y amarillos, validar documentos, fechas, proveedor, montos y narrativa. "
                "El resumen es una alerta preventiva y requiere revisión humana."
            ),
        )


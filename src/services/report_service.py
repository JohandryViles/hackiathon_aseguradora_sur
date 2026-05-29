from __future__ import annotations

from src.schemas.analysis_schema import AnalysisResponse


def compact_case_summary(analysis: AnalysisResponse) -> dict[str, object]:
    return {
        "id_siniestro": analysis.id_siniestro,
        "nivel": analysis.nivel,
        "score_final": analysis.score_final,
        "principales_alertas": [alert.regla for alert in analysis.alertas[:5]],
        "recomendacion_revision": analysis.recomendacion_revision,
        "advertencia_etica": analysis.advertencia_etica,
    }


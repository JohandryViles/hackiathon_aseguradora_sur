from __future__ import annotations


def clamp_score(value: float) -> float:
    return max(0.0, min(100.0, round(float(value), 2)))


def classify_score(score: float) -> str:
    if score <= 40:
        return "Verde"
    if score <= 75:
        return "Amarillo"
    return "Rojo"


def classify_ai_score(score: float) -> str:
    if score <= 40:
        return "bajo"
    if score <= 75:
        return "medio"
    if score <= 90:
        return "alto"
    return "critico"


def combine_scores(score_reglas: float, score_patrones: float, score_ia: float) -> float:
    # Requested hybrid weighting: rules carry the most trust, patterns and API model support the review.
    return clamp_score(score_reglas * 0.50 + score_patrones * 0.25 + score_ia * 0.25)


from __future__ import annotations

import json
import os
import re
from typing import Any

from dotenv import load_dotenv

from src.ai_agent.prompts import SYSTEM_PROMPT
from src.schemas.analysis_schema import AIAgentResponse, Alert, ETHICAL_WARNING
from src.schemas.claim_schema import ClaimInput
from src.scoring.risk_score import classify_ai_score, clamp_score
from src.services.pattern_service import PatternResult


load_dotenv()


BANNED_REPLACEMENTS = {
    "fraude confirmado": "posible señal de riesgo",
    "cliente fraudulento": "caso con patrón atípico",
    "rechazar siniestro": "derivar a revisión humana",
    "culpable": "requiere revisión humana",
    "acusación": "alerta preventiva",
}


def _safe_text(value: str) -> str:
    safe = value
    for banned, replacement in BANNED_REPLACEMENTS.items():
        safe = re.sub(banned, replacement, safe, flags=re.IGNORECASE)
    return safe


def _extract_json(text: str) -> dict[str, Any] | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


class ClaimsAgent:
    def __init__(self) -> None:
        self.enabled = os.getenv("AI_ENABLED", "true").lower() in {"1", "true", "yes", "si"}
        self.model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
        self.api_key = os.getenv("OPENAI_API_KEY")

    def analyze(
        self,
        claim: ClaimInput,
        score_reglas: float,
        alerts: list[Alert],
        pattern_result: PatternResult,
        force_local: bool = False,
    ) -> AIAgentResponse:
        if force_local or not self.enabled or not self.api_key:
            return self._fallback_response(claim, score_reglas, pattern_result)

        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(
                model=self.model,
                temperature=0,
                api_key=self.api_key,
                model_kwargs={"response_format": {"type": "json_object"}},
            )
            payload = {
                "siniestro": claim.model_dump(mode="json"),
                "score_reglas": score_reglas,
                "reglas_activadas": [alert.model_dump() for alert in alerts],
                "score_patrones": pattern_result.score,
                "patrones_detectados": pattern_result.patrones_detectados,
                "inconsistencias": pattern_result.inconsistencias,
            }
            response = llm.invoke(
                [
                    SystemMessage(content=SYSTEM_PROMPT),
                    HumanMessage(
                        content=(
                            "Analiza este caso y devuelve solo JSON valido. "
                            "Evalua datos del siniestro, narrativa, proveedor, asegurado, documentos y promedios.\n"
                            f"{json.dumps(payload, ensure_ascii=False)}"
                        )
                    ),
                ]
            )
            parsed = _extract_json(str(response.content))
            if parsed:
                return self._validated_response(parsed, claim, score_reglas, pattern_result)
        except Exception:
            return self._fallback_response(claim, score_reglas, pattern_result)

        return self._fallback_response(claim, score_reglas, pattern_result)

    def _validated_response(
        self,
        payload: dict[str, Any],
        claim: ClaimInput,
        score_reglas: float,
        pattern_result: PatternResult,
    ) -> AIAgentResponse:
        fallback = self._fallback_response(claim, score_reglas, pattern_result)
        score_ia = clamp_score(payload.get("score_ia", fallback.score_ia))
        data = {
            "score_ia": score_ia,
            "nivel_riesgo_ia": payload.get("nivel_riesgo_ia") or classify_ai_score(score_ia),
            "patrones_detectados": payload.get("patrones_detectados") or fallback.patrones_detectados,
            "inconsistencias": payload.get("inconsistencias") or fallback.inconsistencias,
            "analisis_narrativa": payload.get("analisis_narrativa") or fallback.analisis_narrativa,
            "explicacion": payload.get("explicacion") or fallback.explicacion,
            "recomendacion_revision": payload.get("recomendacion_revision") or fallback.recomendacion_revision,
            "advertencia_etica": ETHICAL_WARNING,
        }
        for key in ("analisis_narrativa", "explicacion", "recomendacion_revision"):
            data[key] = _safe_text(str(data[key]))
        return AIAgentResponse.model_validate(data)

    def _fallback_response(
        self,
        claim: ClaimInput,
        score_reglas: float,
        pattern_result: PatternResult,
    ) -> AIAgentResponse:
        score_ia = clamp_score(score_reglas * 0.6 + pattern_result.score * 0.4)
        narrative = claim.descripcion or "No se recibio narrativa del reclamo."
        return AIAgentResponse(
            score_ia=score_ia,
            nivel_riesgo_ia=classify_ai_score(score_ia),
            patrones_detectados=pattern_result.patrones_detectados,
            inconsistencias=pattern_result.inconsistencias,
            analisis_narrativa=(
                "La narrativa disponible se interpreta como contexto de apoyo. "
                f"Resumen: {narrative[:280]}"
            ),
            explicacion=(
                "El caso presenta posibles señales de riesgo segun reglas y patrones disponibles; "
                "requiere revisión humana antes de cualquier decision operativa."
            ),
            recomendacion_revision=(
                "Validar documentos, fechas, proveedor, historial del asegurado, montos y coherencia de la narrativa."
            ),
            advertencia_etica=ETHICAL_WARNING,
        )

from __future__ import annotations

import math
import re
import unicodedata
from functools import cached_property
from pathlib import Path
from typing import Any

import pandas as pd

from src.schemas.claim_schema import ClaimInput


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_IMPORT_DIR = ROOT / "data" / "import_ready" / "evento"
DEFAULT_SYNTHETIC_DATASET = ROOT / "data" / "synthetic" / "claims_training.csv"


def normalize_key(value: object) -> str:
    text = str(value).lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


def first_value(row: dict[str, Any], aliases: list[str], default: Any = None) -> Any:
    normalized_row = {normalize_key(key): value for key, value in row.items()}
    for alias in aliases:
        key = normalize_key(alias)
        if key in normalized_row and not is_empty(normalized_row[key]):
            return normalized_row[key]
    return default


def is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    return str(value).strip() == ""


def to_bool(value: Any, default: bool | None = None) -> bool | None:
    if value is None or is_empty(value):
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, int | float):
        return value > 0
    text = str(value).strip().lower()
    if text in {"true", "1", "si", "sí", "yes", "y"}:
        return True
    if text in {"false", "0", "no", "n"}:
        return False
    return default


def to_float(value: Any, default: float | None = None) -> float | None:
    if value is None or is_empty(value):
        return default
    if isinstance(value, int | float):
        return float(value)
    cleaned = str(value).replace("$", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return default


def to_int(value: Any, default: int | None = None) -> int | None:
    parsed = to_float(value)
    if parsed is None:
        return default
    return int(round(parsed))


def to_text(value: Any, default: str | None = None) -> str | None:
    if value is None or is_empty(value):
        return default
    return str(value).strip()


class DataService:
    def __init__(
        self,
        import_claims_path: Path = DEFAULT_IMPORT_DIR / "01_siniestros_import.csv",
        providers_path: Path = DEFAULT_IMPORT_DIR / "04_proveedores_import.csv",
        synthetic_path: Path = DEFAULT_SYNTHETIC_DATASET,
    ) -> None:
        self.import_claims_path = import_claims_path
        self.providers_path = providers_path
        self.synthetic_path = synthetic_path

    @cached_property
    def claims_frame(self) -> pd.DataFrame:
        if self.import_claims_path.exists():
            return pd.read_csv(self.import_claims_path)
        if self.synthetic_path.exists():
            return pd.read_csv(self.synthetic_path)
        return pd.DataFrame()

    @cached_property
    def providers_frame(self) -> pd.DataFrame:
        if self.providers_path.exists():
            return pd.read_csv(self.providers_path)
        return pd.DataFrame()

    def list_claims(self, limit: int | None = None) -> list[ClaimInput]:
        frame = self.claims_frame
        if frame.empty:
            return []
        records = frame.head(limit).to_dict(orient="records") if limit else frame.to_dict(orient="records")
        return [self.row_to_claim(record) for record in records]

    def find_claim(self, claim_id: str) -> ClaimInput | None:
        for claim in self.list_claims():
            if claim.id_siniestro == claim_id:
                return claim
        return None

    def provider_context(self, provider_id: str | None) -> dict[str, Any]:
        if not provider_id or self.providers_frame.empty:
            return {}
        frame = self.providers_frame
        normalized_columns = {normalize_key(column): column for column in frame.columns}
        id_column = normalized_columns.get("id_proveedor")
        if not id_column:
            return {}
        matches = frame[frame[id_column].astype(str) == provider_id]
        if matches.empty:
            return {}
        row = matches.iloc[0].to_dict()
        return {
            "id_proveedor": provider_id,
            "tipo": first_value(row, ["tipo"]),
            "ciudad": first_value(row, ["ciudad"]),
            "reclamos_asociados": to_int(first_value(row, ["reclamos_asociados"]), 0),
            "monto_promedio_reclamado": to_float(first_value(row, ["monto_promedio_reclamado"]), 0),
            "en_lista_restrictiva": to_bool(first_value(row, ["lista_restrictiva", "en_lista_restrictiva"]), False),
        }

    def branch_average_amount(self, ramo: str | None) -> float | None:
        if not ramo or self.claims_frame.empty:
            return None
        frame = self.claims_frame
        columns = {normalize_key(column): column for column in frame.columns}
        ramo_column = columns.get("ramo") or columns.get("line_of_business")
        amount_column = columns.get("monto_reclamado") or columns.get("claim_amount")
        if not ramo_column or not amount_column:
            return None
        matches = frame[frame[ramo_column].astype(str).str.lower() == ramo.lower()]
        if matches.empty:
            return None
        values = pd.to_numeric(matches[amount_column], errors="coerce").dropna()
        if values.empty:
            return None
        return float(values.mean())

    def row_to_claim(self, row: dict[str, Any]) -> ClaimInput:
        provider_id = to_text(first_value(row, ["id_proveedor", "provider_id", "beneficiario"]))
        provider_context = self.provider_context(provider_id)
        source_flags = to_text(first_value(row, ["source_pdf_flags"]), "") or ""

        documentos_inconsistentes = to_bool(first_value(row, ["documentos_inconsistentes"]), False)
        if source_flags:
            documentos_inconsistentes = True

        claim_data = {
            "id_siniestro": to_text(first_value(row, ["id_siniestro", "claim_id"]), "SIN-DESCONOCIDO"),
            "id_poliza": to_text(first_value(row, ["id_poliza", "policy_id"])),
            "id_asegurado": to_text(first_value(row, ["id_asegurado", "insured_id", "customer_id"])),
            "ramo": to_text(first_value(row, ["ramo", "line_of_business"])),
            "cobertura": to_text(first_value(row, ["cobertura", "coverage", "claim_type"])),
            "fecha_ocurrencia": first_value(row, ["fecha_ocurrencia", "occurred_at"]),
            "fecha_reporte": first_value(row, ["fecha_reporte", "submitted_at"]),
            "monto_reclamado": to_float(first_value(row, ["monto_reclamado", "claim_amount"]), 0) or 0,
            "monto_estimado": to_float(first_value(row, ["monto_estimado", "estimated_damage_amount"])),
            "monto_pagado": to_float(first_value(row, ["monto_pagado", "paid_amount"])),
            "estado": to_text(first_value(row, ["estado", "claim_status"])),
            "sucursal": to_text(first_value(row, ["sucursal", "branch"])),
            "ciudad": to_text(first_value(row, ["ciudad", "city", "sucursal"])),
            "descripcion": to_text(first_value(row, ["descripcion", "report_narrative", "description"])),
            "documentos_completos": to_bool(first_value(row, ["documentos_completos", "documents_complete"]), True),
            "documentos_inconsistentes": documentos_inconsistentes,
            "documentos_observaciones": [source_flags] if source_flags else [],
            "beneficiario": provider_id,
            "id_proveedor": provider_id,
            "proveedor_en_lista_restrictiva": bool(provider_context.get("en_lista_restrictiva", False))
            or to_bool(first_value(row, ["lista_restrictiva", "provider_watchlist"]), False),
            "provider_observed_cases": to_int(
                first_value(row, ["provider_observed_cases", "reclamos_asociados"]),
                int(provider_context.get("reclamos_asociados", 0) or 0),
            ),
            "dias_desde_inicio_poliza": to_int(first_value(row, ["dias_desde_inicio_poliza", "days_since_policy_start"])),
            "dias_desde_fin_poliza": to_int(first_value(row, ["dias_desde_fin_poliza", "daysUntilPolicyEnd", "days_until_policy_end"])),
            "dias_entre_ocurrencia_reporte": to_int(
                first_value(row, ["dias_entre_ocurrencia_reporte", "days_between_occurrence_report"])
            ),
            "historial_siniestros_asegurado": to_int(
                first_value(row, ["historial_siniestros_asegurado", "incidents_last_12_months"]),
                0,
            ),
            "suma_asegurada": to_float(first_value(row, ["suma_asegurada", "sum_insured"])),
            "similitud_narrativa": to_float(first_value(row, ["similitud_narrativa", "narrative_similarity_max"])),
            "contexto_proveedor": provider_context,
        }
        return ClaimInput.model_validate(claim_data)


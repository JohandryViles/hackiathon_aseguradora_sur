from __future__ import annotations

import argparse
import re
import unicodedata
from pathlib import Path

import pandas as pd
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path(r"C:\Users\Usuario\Desktop\2026-01\Data set documentos evento")
DEFAULT_OUTPUT = ROOT / "data" / "import_ready" / "evento"
WORKBOOK_NAME = "Evento Datasets_Sinteticos_Fraude_500_v2.xlsx"


def normalize_key(value: object) -> str:
    text = str(value).lower().replace(".pdf", "")
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", text)


def find_column(frame: pd.DataFrame, name: str) -> str:
    target = normalize_key(name)
    for column in frame.columns:
        if normalize_key(column) == target:
            return column
    raise KeyError(f"Column not found: {name}")


def yes_no_to_bool(value: object) -> bool:
    text = str(value).strip().lower()
    return text in {"si", "sí", "true", "1", "yes"}


def clean_number(value: object, default: float = 0) -> float:
    if value is None or pd.isna(value):
        return default
    if isinstance(value, int | float):
        return float(value)
    text = str(value).strip().replace("$", "").replace(",", "")
    try:
        return float(text)
    except ValueError:
        return default


def iso_date(value: object) -> str:
    if value is None or pd.isna(value):
        return "2026-01-01"
    return pd.to_datetime(value).date().isoformat()


def pdf_text(path: Path) -> str:
    try:
        return "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
    except Exception:
        return ""


def discover_pdfs(source_dir: Path) -> dict[str, Path]:
    return {normalize_key(path.stem): path for path in source_dir.rglob("*.pdf")}


def find_pdf(pdf_index: dict[str, Path], name: object) -> Path | None:
    wanted = normalize_key(name)
    if not wanted:
        return None
    if wanted in pdf_index:
        return pdf_index[wanted]
    for key, path in pdf_index.items():
        if wanted in key or key in wanted:
            return path
    return None


def extract_pdf_signals(path: Path | None, claim_amount: float | None = None, excel_plate: str | None = None) -> list[str]:
    if not path:
        return []

    flat = re.sub(r"\s+", " ", pdf_text(path))
    compact = flat.replace(" ", "").upper()
    signals: list[str] = []

    if re.search(r"RUC:\s*123456789\s*-\s*INV[ÁA]LIDO", flat, re.IGNORECASE) or "RUC:123456789-INV" in compact:
        signals.append("RUC invalido")
    if "DOCUMENTOALTERADO" in compact or "DOCUMENTOSALTERADOS" in compact:
        signals.append("Documento alterado")

    case_match = re.search(r"Caso:\s*([^|\n]+)", flat, re.IGNORECASE)
    if case_match:
        case_label = case_match.group(1).strip()
        if "fraude" in normalize_key(case_label):
            signals.append("Caso PDF: Fraude")
        elif "inconsistente" in normalize_key(case_label):
            signals.append("Caso PDF: Inconsistente")

    total_match = re.search(r"TOTAL\s*A\s*PAGAR\s*\$?\s*([0-9.,]+)", flat, re.IGNORECASE)
    if total_match and claim_amount is not None:
        total = clean_number(total_match.group(1))
        if abs(total - claim_amount) > 1:
            signals.append(f"Total factura {total:.2f} distinto a monto reclamado {claim_amount:.2f}")

    plate_match = re.search(r"Placa:?\s*([A-Z]{2,4}-\d{3,4})", flat)
    if plate_match and excel_plate:
        pdf_plate = plate_match.group(1)
        if pdf_plate != excel_plate:
            signals.append(f"Placa PDF {pdf_plate} distinta a Excel {excel_plate}")

    if re.search(r"sin denuncia policial formal previa|sin denuncia policial previa", flat, re.IGNORECASE):
        signals.append("Parte indica sin denuncia policial previa")
    if re.search(r"no existen testigos|sin testigos", flat, re.IGNORECASE):
        signals.append("Sin testigos")
    return signals


def build_evento_imports(source_dir: Path, output_dir: Path) -> None:
    workbook = source_dir / WORKBOOK_NAME
    if not workbook.exists():
        raise FileNotFoundError(f"No existe el Excel esperado: {workbook}")

    output_dir.mkdir(parents=True, exist_ok=True)

    siniestros = pd.read_excel(workbook, sheet_name="1_Siniestros")
    polizas = pd.read_excel(workbook, sheet_name="2_Polizas")
    asegurados = pd.read_excel(workbook, sheet_name="3_Asegurados")
    proveedores = pd.read_excel(workbook, sheet_name="4_Proveedores")
    documentos = pd.read_excel(workbook, sheet_name="5_Documentos")

    pdf_index = discover_pdfs(source_dir)

    sin_claim_col = find_column(siniestros, "ID Siniestro")
    sin_plate_col = find_column(siniestros, "Placa Vehiculo Asegurado")
    sin_amount_col = find_column(siniestros, "Monto Reclamado")
    sin_report_col = find_column(siniestros, "Fecha Reporte")
    sin_docs_col = find_column(siniestros, "Docs Completos")

    doc_claim_col = find_column(documentos, "ID Siniestro")
    doc_name_col = find_column(documentos, "Nombre Archivo PDF")

    pdf_signals_by_claim: dict[str, list[str]] = {}
    claim_lookup = {str(row[sin_claim_col]): row for _, row in siniestros.iterrows()}

    for _, row in documentos[documentos[doc_name_col].notna()].iterrows():
        claim_id = str(row[doc_claim_col])
        claim = claim_lookup.get(claim_id)
        claim_amount = clean_number(claim[sin_amount_col]) if claim is not None else None
        excel_plate = str(claim[sin_plate_col]) if claim is not None and pd.notna(claim[sin_plate_col]) else None
        pdf_path = find_pdf(pdf_index, row[doc_name_col])
        signals = extract_pdf_signals(pdf_path, claim_amount, excel_plate)
        if signals:
            pdf_signals_by_claim.setdefault(claim_id, []).extend(signals)

    provider_col = find_column(proveedores, "ID Proveedor")
    provider_claims_col = find_column(proveedores, "N Siniestros Asociados")
    provider_claims = {
        str(row[provider_col]): clean_number(row[provider_claims_col])
        for _, row in proveedores.iterrows()
    }

    claims_out = pd.DataFrame(
        {
            "id_siniestro": siniestros[find_column(siniestros, "ID Siniestro")],
            "id_poliza": siniestros[find_column(siniestros, "ID Poliza")],
            "id_asegurado": siniestros[find_column(siniestros, "ID Asegurado")],
            "ramo": siniestros[find_column(siniestros, "Ramo")],
            "placa_hash": siniestros[sin_plate_col],
            "cobertura": siniestros[find_column(siniestros, "Cobertura")],
            "fecha_ocurrencia": siniestros[find_column(siniestros, "Fecha Ocurrencia")].map(iso_date),
            "fecha_reporte": siniestros[sin_report_col].map(iso_date),
            "dias_entre_ocurrencia_reporte": siniestros[find_column(siniestros, "Dias Ocurr Reporte")],
            "monto_reclamado": siniestros[sin_amount_col],
            "monto_estimado": siniestros[find_column(siniestros, "Monto Estimado")],
            "monto_pagado": siniestros[find_column(siniestros, "Monto Pagado")],
            "estado": siniestros[find_column(siniestros, "Estado")],
            "sucursal": siniestros[find_column(siniestros, "Sucursal")],
            "id_proveedor": siniestros[find_column(siniestros, "ID Proveedor")],
            "descripcion": siniestros[find_column(siniestros, "Descripcion del Evento")],
            "documentos_completos": siniestros[sin_docs_col].map(yes_no_to_bool),
            "missing_critical_document": siniestros[sin_docs_col].map(lambda value: not yes_no_to_bool(value)),
            "documentos_inconsistentes": siniestros[sin_claim_col].map(
                lambda claim_id: len(pdf_signals_by_claim.get(str(claim_id), [])) > 0
            ),
            "lista_restrictiva": siniestros[find_column(siniestros, "Prov Lista Restrictiva")].map(yes_no_to_bool),
            "dias_desde_inicio_poliza": siniestros[find_column(siniestros, "Dias desde Inicio Poliza")],
            "daysUntilPolicyEnd": siniestros[find_column(siniestros, "Dias hasta Fin Poliza")],
            "historial_siniestros_asegurado": siniestros[find_column(siniestros, "N Reclamos Previos Asegurado")],
            "suma_asegurada": siniestros[find_column(siniestros, "Suma Asegurada")],
            "similitud_narrativa": siniestros[find_column(siniestros, "Similitud Narrativa Max")],
            "provider_observed_cases": siniestros[find_column(siniestros, "ID Proveedor")].map(provider_claims).fillna(0),
            "source_pdf_flags": siniestros[sin_claim_col].map(
                lambda claim_id: " | ".join(sorted(set(pdf_signals_by_claim.get(str(claim_id), []))))
            ),
        }
    )

    insured_city = {
        str(row[find_column(asegurados, "ID Asegurado")]): row[find_column(asegurados, "Ciudad")]
        for _, row in asegurados.iterrows()
    }
    policies_out = pd.DataFrame(
        {
            "id_poliza": polizas[find_column(polizas, "ID Poliza")],
            "id_asegurado": polizas[find_column(polizas, "ID Asegurado")],
            "ramo": polizas[find_column(polizas, "Ramo")],
            "fecha_inicio": polizas[find_column(polizas, "Fecha Inicio")].map(iso_date),
            "fecha_fin": polizas[find_column(polizas, "Fecha Fin")].map(iso_date),
            "prima": polizas[find_column(polizas, "Prima Anual")],
            "suma_asegurada": polizas[find_column(polizas, "Suma Asegurada")],
            "deducible": 500,
            "canal_venta": polizas[find_column(polizas, "Canal Venta")],
            "ciudad": polizas[find_column(polizas, "ID Asegurado")].map(insured_city).fillna("Quito"),
            "estado_poliza": polizas[find_column(polizas, "Estado Poliza")],
        }
    )

    risk_score_by_profile = {"Bajo": 760, "Medio": 650, "Alto": 520}
    insureds_out = pd.DataFrame(
        {
            "id_asegurado": asegurados[find_column(asegurados, "ID Asegurado")],
            "segmento": asegurados[find_column(asegurados, "Segmento")],
            "antiguedad_meses": asegurados[find_column(asegurados, "Antiguedad anos")].map(lambda value: int(clean_number(value) * 12)),
            "ciudad": asegurados[find_column(asegurados, "Ciudad")],
            "numero_polizas": asegurados[find_column(asegurados, "N Polizas Activas")],
            "reclamos_ultimos_12_meses": asegurados[find_column(asegurados, "N Reclamos Ultimos 12 Meses")],
            "mora_actual": False,
            "score_cliente_simulado": asegurados[find_column(asegurados, "Perfil Riesgo Historico")].map(
                lambda value: risk_score_by_profile.get(str(value), 650)
            ),
        }
    )

    avg_amount_col = find_column(proveedores, "Promedio Monto")
    fallback_avg_col = "Unnamed: 8" if "Unnamed: 8" in proveedores.columns else avg_amount_col
    providers_out = pd.DataFrame(
        {
            "id_proveedor": proveedores[provider_col],
            "tipo": proveedores[find_column(proveedores, "Tipo")],
            "ciudad": proveedores[find_column(proveedores, "Ciudad")],
            "reclamos_asociados": proveedores[provider_claims_col],
            "monto_promedio_reclamado": proveedores.apply(
                lambda row: clean_number(row[avg_amount_col], clean_number(row[fallback_avg_col], 0)),
                axis=1,
            ),
            "porcentaje_de_casos_observados": proveedores[provider_claims_col].map(lambda value: round(clean_number(value) / 500, 4)),
            "antiguedad": proveedores[provider_claims_col].map(lambda value: int(24 + clean_number(value) * 2)),
            "lista_restrictiva": proveedores[find_column(proveedores, "En Lista Restrictiva")].map(yes_no_to_bool),
        }
    )

    doc_id_col = find_column(documentos, "ID Documento")
    doc_type_col = find_column(documentos, "Tipo Documento")
    documents_rows = []
    for _, row in documentos.iterrows():
        claim_id = str(row[doc_claim_col])
        claim = claim_lookup.get(claim_id)
        pdf_path = find_pdf(pdf_index, row[doc_name_col]) if pd.notna(row[doc_name_col]) else None
        claim_amount = clean_number(claim[sin_amount_col]) if claim is not None else None
        excel_plate = str(claim[sin_plate_col]) if claim is not None and pd.notna(claim[sin_plate_col]) else None
        signals = extract_pdf_signals(pdf_path, claim_amount, excel_plate)
        observation_parts = []
        if pd.notna(row[doc_name_col]):
            observation_parts.append(f"Archivo: {row[doc_name_col]}")
        if signals:
            observation_parts.append("Alertas: " + " | ".join(signals))
        documents_rows.append(
            {
                "id_documento": row[doc_id_col],
                "id_siniestro": claim_id,
                "tipo_documento": row[doc_type_col],
                "entregado": True,
                "legible": True,
                "fecha_emision": iso_date(claim[sin_report_col] if claim is not None else None),
                "inconsistencia_detectada": bool(signals),
                "observacion": " - ".join(observation_parts),
            }
        )
    documents_out = pd.DataFrame(documents_rows)

    outputs = {
        "01_siniestros_import.csv": claims_out,
        "02_polizas_import.csv": policies_out,
        "03_asegurados_import.csv": insureds_out,
        "04_proveedores_import.csv": providers_out,
        "05_documentos_import.csv": documents_out,
    }
    for filename, frame in outputs.items():
        frame.to_csv(output_dir / filename, index=False, encoding="utf-8-sig")

    print(f"Archivos generados en: {output_dir}")
    for filename, frame in outputs.items():
        print(f"- {filename}: {len(frame)} filas")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare Evento Excel/PDF data as CSV files for the app import page.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    build_evento_imports(args.source, args.output)


if __name__ == "__main__":
    main()

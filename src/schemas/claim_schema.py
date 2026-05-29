from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ClaimInput(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id_siniestro: str = Field(..., examples=["SIN-001"])
    id_poliza: str | None = Field(default=None, examples=["POL-1001"])
    id_asegurado: str | None = Field(default=None, examples=["ASEG-001"])
    ramo: str | None = Field(default=None, examples=["Vehiculos"])
    cobertura: str | None = Field(default=None, examples=["Robo"])
    fecha_ocurrencia: date | None = None
    fecha_reporte: date | None = None
    monto_reclamado: float = Field(..., ge=0, examples=[12000])
    monto_estimado: float | None = Field(default=None, ge=0, examples=[7000])
    monto_pagado: float | None = Field(default=None, ge=0, examples=[0])
    estado: str | None = Field(default=None, examples=["Reserva"])
    sucursal: str | None = Field(default=None, examples=["Quito"])
    ciudad: str | None = Field(default=None, examples=["Quito"])
    descripcion: str | None = Field(default=None, examples=["Robo del vehiculo pocos dias despues de contratar la poliza."])
    documentos_completos: bool | None = Field(default=None, examples=[False])
    documentos_inconsistentes: bool | None = Field(default=None, examples=[False])
    documentos_ilegibles: bool | None = Field(default=None, examples=[False])
    beneficiario: str | None = Field(default=None, examples=["PROV-001"])
    id_proveedor: str | None = Field(default=None, examples=["PROV-001"])
    proveedor_en_lista_restrictiva: bool | None = Field(default=None, examples=[False])
    provider_observed_cases: int | None = Field(default=None, ge=0, examples=[3])
    dias_desde_inicio_poliza: int | None = Field(default=None, ge=0, examples=[8])
    dias_desde_fin_poliza: int | None = Field(default=None, ge=0, examples=[300])
    dias_entre_ocurrencia_reporte: int | None = Field(default=None, ge=0, examples=[7])
    historial_siniestros_asegurado: int | None = Field(default=None, ge=0, examples=[3])
    suma_asegurada: float | None = Field(default=None, ge=0, examples=[20000])
    similitud_narrativa: float | None = Field(default=None, ge=0, examples=[0.88])
    contexto_asegurado: dict[str, Any] | None = None
    contexto_proveedor: dict[str, Any] | None = None
    documentos_faltantes: list[str] = Field(default_factory=list)
    documentos_observaciones: list[str] = Field(default_factory=list)

    @property
    def provider_id(self) -> str | None:
        return self.id_proveedor or self.beneficiario


class BatchAnalysisRequest(BaseModel):
    claims: list[ClaimInput] = Field(..., min_length=1)


class ClaimLookup(BaseModel):
    id_siniestro: str
    claim: ClaimInput


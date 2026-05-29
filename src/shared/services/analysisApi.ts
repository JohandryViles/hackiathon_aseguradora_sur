import type { ExportableClaim } from "@/shared/types/claims";

const API_BASE_URL =
	import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";
export const AI_ANALYSIS_STORAGE_KEY = "aseguradora-sur-ai-analysis-results-v1";

export type Alert = {
	regla: string;
	detalle: string;
	puntos: number;
};

export type AnalysisResult = {
	id_siniestro: string;
	score_reglas: number;
	score_patrones: number;
	score_ia: number;
	score_final: number;
	nivel: "Verde" | "Amarillo" | "Rojo" | string;
	alertas: Alert[];
	patrones_detectados: string[];
	inconsistencias: string[];
	analisis_narrativa: string;
	explicacion: string;
	recomendacion_revision: string;
	advertencia_etica: string;
};

export type ClaimForAnalysis = ExportableClaim & {
	policyId?: string;
	coverage?: string;
	claimType?: string;
	lineOfBusiness?: string;
	branch?: string;
	estimatedDamageAmount?: number;
	paidAmount?: number;
	claimStatus?: string;
	sumInsured?: number;
	incidentsLast12Months?: number;
	incidentsLast18Months?: number;
	daysSincePolicyStart?: number;
	daysUntilPolicyEnd?: number;
	daysBetweenOccurrenceReport?: number;
	occurredAt?: number;
	submittedAt?: number;
	documentsComplete?: boolean;
	documentsInconsistent?: boolean;
	missingCriticalDocument?: boolean;
	providerObservedCases?: number;
	providerInWatchlist?: boolean;
	narrativeSimilarityMax?: number;
	reportNarrative?: string;
};

type ClaimAnalysisPayload = Record<string, unknown>;
type RawClaimRow = Record<string, unknown>;

function normalizeFieldName(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function readRowField(row: RawClaimRow, aliases: string[]) {
	for (const alias of aliases) {
		if (alias in row) return row[alias];
	}

	const normalizedAliases = new Set(aliases.map(normalizeFieldName));
	for (const [key, value] of Object.entries(row)) {
		if (normalizedAliases.has(normalizeFieldName(key))) return value;
	}

	return undefined;
}

function textValue(value: unknown) {
	if (value === null || value === undefined || value === "") return undefined;
	return String(value);
}

function numberValue(value: unknown) {
	if (value === null || value === undefined || value === "") return undefined;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	const parsed = Number(String(value).replace(",", "."));
	return Number.isFinite(parsed) ? parsed : undefined;
}

function booleanValue(value: unknown) {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value !== 0;
	if (typeof value !== "string") return undefined;
	const normalized = value.trim().toLowerCase();
	if (["true", "1", "si", "sí", "yes", "y"].includes(normalized)) return true;
	if (["false", "0", "no", "n"].includes(normalized)) return false;
	return undefined;
}

function dateValue(value: unknown) {
	if (value === null || value === undefined || value === "") return undefined;
	if (typeof value === "number" && Number.isFinite(value)) {
		const timestamp = value > 10_000_000_000 ? value : value * 1000;
		return new Date(timestamp).toISOString().slice(0, 10);
	}
	const parsed = new Date(String(value));
	if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
	return String(value).slice(0, 10);
}

function dateFromTimestamp(value?: number) {
	if (typeof value !== "number" || Number.isNaN(value)) return undefined;
	return new Date(value).toISOString().slice(0, 10);
}

function ramoLabel(value?: string) {
	const labels: Record<string, string> = {
		vehicles: "Vehiculos",
		health: "Salud",
		life: "Vida",
		home: "Hogar",
		general: "General",
	};
	return value ? (labels[value] ?? value) : undefined;
}

function buildAnalysisPayload(claim: ClaimForAnalysis): ClaimAnalysisPayload {
	return {
		id_siniestro: claim.claimNumber,
		id_poliza: claim.policyId,
		id_asegurado: claim.customerId,
		ramo: ramoLabel(claim.lineOfBusiness),
		cobertura: claim.coverage ?? claim.claimType,
		fecha_ocurrencia: dateFromTimestamp(claim.occurredAt),
		fecha_reporte: dateFromTimestamp(claim.submittedAt),
		monto_reclamado: claim.claimAmount,
		monto_estimado: claim.estimatedDamageAmount ?? claim.claimAmount,
		monto_pagado: claim.paidAmount ?? 0,
		estado: claim.claimStatus,
		sucursal: claim.branch ?? claim.locationRegion,
		ciudad: claim.locationRegion,
		descripcion:
			claim.reportNarrative ??
			claim.anomalyFlags[0] ??
			"Caso enviado desde la bandeja de siniestros para analisis IA.",
		documentos_completos:
			claim.documentsComplete ?? !(claim.missingCriticalDocument ?? false),
		documentos_inconsistentes: claim.documentsInconsistent ?? false,
		beneficiario: claim.providerId,
		id_proveedor: claim.providerId,
		proveedor_en_lista_restrictiva: claim.providerInWatchlist ?? false,
		provider_observed_cases: claim.providerObservedCases,
		dias_desde_inicio_poliza: claim.daysSincePolicyStart,
		dias_desde_fin_poliza: claim.daysUntilPolicyEnd,
		dias_entre_ocurrencia_reporte: claim.daysBetweenOccurrenceReport,
		historial_siniestros_asegurado:
			claim.incidentsLast18Months ?? claim.incidentsLast12Months,
		suma_asegurada: claim.sumInsured,
		similitud_narrativa: claim.narrativeSimilarityMax,
		contexto_asegurado: {
			id_asegurado: claim.customerId,
			score_actual: claim.riskScore,
			nivel_actual: claim.riskLevel,
		},
		contexto_proveedor: {
			id_proveedor: claim.providerId,
			casos_observados: claim.providerObservedCases,
			en_lista_restrictiva: claim.providerInWatchlist ?? false,
		},
		documentos_faltantes: claim.missingCriticalDocument
			? ["documento critico obligatorio"]
			: [],
		documentos_observaciones: claim.anomalyFlags,
	};
}

function buildImportedClaimPayload(row: RawClaimRow): ClaimAnalysisPayload {
	const idSiniestro =
		textValue(
			readRowField(row, ["id_siniestro", "claimNumber", "claim_id", "id"]),
		) ?? "SIN-DESCONOCIDO";
	const providerId = textValue(
		readRowField(row, [
			"id_proveedor",
			"beneficiario",
			"providerId",
			"provider_id",
			"beneficiary_id",
		]),
	);
	const montoReclamado =
		numberValue(
			readRowField(row, [
				"monto_reclamado",
				"claimAmount",
				"claim_amount",
				"amount",
				"total_claim_amount",
			]),
		) ?? 0;
	const montoEstimado =
		numberValue(
			readRowField(row, [
				"monto_estimado",
				"estimatedDamageAmount",
				"estimated_damage_amount",
				"estimated_amount",
			]),
		) ?? montoReclamado;

	return {
		id_siniestro: idSiniestro,
		id_poliza: textValue(
			readRowField(row, ["id_poliza", "policyId", "policy_id"]),
		),
		id_asegurado: textValue(
			readRowField(row, [
				"id_asegurado",
				"customerId",
				"customer_id",
				"insured_id",
			]),
		),
		ramo: textValue(
			readRowField(row, ["ramo", "lineOfBusiness", "line_of_business"]),
		),
		cobertura: textValue(
			readRowField(row, ["cobertura", "coverage", "claimType", "claim_type"]),
		),
		fecha_ocurrencia: dateValue(
			readRowField(row, [
				"fecha_ocurrencia",
				"occurredAt",
				"occurred_at",
				"loss_date",
			]),
		),
		fecha_reporte: dateValue(
			readRowField(row, [
				"fecha_reporte",
				"submittedAt",
				"submitted_at",
				"report_date",
			]),
		),
		monto_reclamado: montoReclamado,
		monto_estimado: montoEstimado,
		monto_pagado:
			numberValue(
				readRowField(row, ["monto_pagado", "paidAmount", "paid_amount"]),
			) ?? 0,
		estado: textValue(
			readRowField(row, ["estado", "claimStatus", "claim_status"]),
		),
		sucursal: textValue(readRowField(row, ["sucursal", "branch"])),
		ciudad: textValue(
			readRowField(row, ["ciudad", "locationRegion", "region", "city"]),
		),
		descripcion:
			textValue(
				readRowField(row, [
					"descripcion",
					"reportNarrative",
					"report_narrative",
					"description",
					"narrativa",
				]),
			) ?? "Caso importado para analisis IA.",
		documentos_completos:
			booleanValue(
				readRowField(row, [
					"documentos_completos",
					"documentsComplete",
					"documents_complete",
				]),
			) ?? true,
		documentos_inconsistentes:
			booleanValue(
				readRowField(row, [
					"documentos_inconsistentes",
					"documentsInconsistent",
					"documents_inconsistent",
				]),
			) ?? false,
		beneficiario: providerId,
		id_proveedor: providerId,
		proveedor_en_lista_restrictiva:
			booleanValue(
				readRowField(row, [
					"proveedor_en_lista_restrictiva",
					"providerInWatchlist",
					"provider_in_watchlist",
					"lista_restrictiva",
				]),
			) ?? false,
		provider_observed_cases: numberValue(
			readRowField(row, ["provider_observed_cases", "providerObservedCases"]),
		),
		dias_desde_inicio_poliza: numberValue(
			readRowField(row, ["dias_desde_inicio_poliza", "daysSincePolicyStart"]),
		),
		dias_desde_fin_poliza: numberValue(
			readRowField(row, ["dias_desde_fin_poliza", "daysUntilPolicyEnd"]),
		),
		dias_entre_ocurrencia_reporte: numberValue(
			readRowField(row, [
				"dias_entre_ocurrencia_reporte",
				"daysBetweenOccurrenceReport",
			]),
		),
		historial_siniestros_asegurado: numberValue(
			readRowField(row, [
				"historial_siniestros_asegurado",
				"incidentsLast12Months",
				"incidents_last_12_months",
				"prior_claims",
			]),
		),
		suma_asegurada: numberValue(
			readRowField(row, ["suma_asegurada", "sumInsured", "sum_insured"]),
		),
		similitud_narrativa: numberValue(
			readRowField(row, ["similitud_narrativa", "narrativeSimilarityMax"]),
		),
		contexto_asegurado: {},
		contexto_proveedor: {
			id_proveedor: providerId,
		},
		documentos_faltantes: booleanValue(
			readRowField(row, [
				"missingCriticalDocument",
				"missing_critical_document",
			]),
		)
			? ["documento critico obligatorio"]
			: [],
		documentos_observaciones: [],
	};
}

async function postClaimAnalysis(
	payload: ClaimAnalysisPayload,
): Promise<AnalysisResult> {
	const response = await fetch(`${API_BASE_URL}/api/analysis/claim`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const detail = await response.text();
		throw new Error(
			`FastAPI respondio ${response.status}: ${detail || response.statusText}`,
		);
	}

	return response.json() as Promise<AnalysisResult>;
}

export async function analyzeClaimWithAi(
	claim: ClaimForAnalysis,
): Promise<AnalysisResult> {
	return postClaimAnalysis(buildAnalysisPayload(claim));
}

export async function analyzeImportedClaimRowWithAi(
	row: RawClaimRow,
): Promise<AnalysisResult> {
	return postClaimAnalysis(buildImportedClaimPayload(row));
}

export function loadStoredAiAnalysisResults(): Record<string, AnalysisResult> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(AI_ANALYSIS_STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Record<string, AnalysisResult>) : {};
	} catch {
		return {};
	}
}

export function saveStoredAiAnalysisResults(
	resultsByClaim: Record<string, AnalysisResult>,
) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			AI_ANALYSIS_STORAGE_KEY,
			JSON.stringify(resultsByClaim),
		);
	} catch {
		return;
	}
}

export function mergeStoredAiAnalysisResults(results: AnalysisResult[]) {
	const current = loadStoredAiAnalysisResults();
	for (const result of results) {
		current[result.id_siniestro] = result;
	}
	saveStoredAiAnalysisResults(current);
}

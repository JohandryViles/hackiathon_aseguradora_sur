import type { ExportableClaim } from "@/shared/types/claims";

function escapeCsv(value: unknown) {
	const text = String(value ?? "");
	if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
	return text;
}

export function exportClaimsCsv(claims: ExportableClaim[]) {
	const header = [
		"claimNumber",
		"customerId",
		"providerId",
		"city",
		"claimAmount",
		"mlScore",
		"ruleRiskScore",
		"riskScore",
		"riskLevel",
		"anomalyFlags",
		"recommendedAction",
	];
	const rows = claims.map((claim) =>
		[
			claim.claimNumber,
			claim.customerId,
			claim.providerId ?? "",
			claim.locationRegion,
			claim.claimAmount,
			claim.mlScore ?? "",
			claim.ruleRiskScore,
			claim.riskScore,
			claim.riskLevel,
			claim.anomalyFlags.join(" | "),
			claim.recommendedAction,
		]
			.map(escapeCsv)
			.join(","),
	);
	const csv = [header.join(","), ...rows].join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "reporte_siniestros_riesgo.csv";
	link.click();
	URL.revokeObjectURL(url);
}

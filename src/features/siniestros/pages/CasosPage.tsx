import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	ArrowLeft,
	Bot,
	BrainCircuit,
	ClipboardList,
	Download,
	Loader2,
	Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PriorityGroup } from "@/features/siniestros/components/PriorityGroup";
import { riskPillStyles } from "@/shared/constants/riskStyles";
import {
	type AnalysisResult,
	analyzeClaimWithAi,
	type ClaimForAnalysis,
	loadStoredAiAnalysisResults,
	saveStoredAiAnalysisResults,
} from "@/shared/services/analysisApi";
import { api } from "@/shared/services/convexApi";
import { exportClaimsCsv } from "@/shared/services/exportCsv";
import type { RiskFilter } from "@/shared/types/claims";
import { formatNumber } from "@/shared/utils/formatNumber";
import { riskLevelText } from "@/shared/utils/riskLevelText";

type AiRunState = {
	status: "idle" | "running" | "completed" | "completed_with_errors" | "error";
	processed: number;
	total: number;
	currentClaim?: string;
	error?: string;
};

function riskLevelFromAnalysis(nivel?: string): "green" | "yellow" | "red" {
	if (nivel === "Rojo") return "red";
	if (nivel === "Amarillo") return "yellow";
	return "green";
}

export function CasosPage() {
	const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
	const [search, setSearch] = useState("");
	const [aiRun, setAiRun] = useState<AiRunState>({
		status: "idle",
		processed: 0,
		total: 0,
	});
	const [aiResultsLoaded, setAiResultsLoaded] = useState(false);
	const [aiResultsByClaim, setAiResultsByClaim] = useState<
		Record<string, AnalysisResult>
	>({});
	const [aiErrorsByClaim, setAiErrorsByClaim] = useState<
		Record<string, string>
	>({});

	useEffect(() => {
		setAiResultsByClaim(loadStoredAiAnalysisResults());
		setAiResultsLoaded(true);
	}, []);

	useEffect(() => {
		if (!aiResultsLoaded) return;
		saveStoredAiAnalysisResults(aiResultsByClaim);
	}, [aiResultsByClaim, aiResultsLoaded]);

	const allClaims = useQuery(api.claims.listWithRisk, { limit: 200 });
	const tableClaims = useQuery(api.claims.listWithRisk, {
		riskLevel: riskFilter === "all" ? undefined : riskFilter,
		search: search.trim() ? search.trim() : undefined,
		limit: 200,
	});

	const processedClaims = allClaims ?? [];
	const currentClaims = tableClaims ?? [];

	const topRedClaims = useMemo(
		() =>
			processedClaims
				.filter((claim) => claim.riskLevel === "red")
				.sort((a, b) => b.riskScore - a.riskScore)
				.slice(0, 5),
		[processedClaims],
	);
	const topYellowClaims = useMemo(
		() =>
			processedClaims
				.filter((claim) => claim.riskLevel === "yellow")
				.sort((a, b) => b.riskScore - a.riskScore)
				.slice(0, 5),
		[processedClaims],
	);

	const analyzedCount = Object.keys(aiResultsByClaim).length;
	const failedCount = Object.keys(aiErrorsByClaim).length;
	const analysisProgress =
		aiRun.total > 0 ? Math.round((aiRun.processed / aiRun.total) * 100) : 0;

	const onAnalyzeVisibleClaims = async () => {
		const claimsToAnalyze = currentClaims as ClaimForAnalysis[];
		if (claimsToAnalyze.length === 0 || aiRun.status === "running") return;

		setAiErrorsByClaim({});
		setAiRun({
			status: "running",
			processed: 0,
			total: claimsToAnalyze.length,
			currentClaim: claimsToAnalyze[0]?.claimNumber,
		});

		let errors = 0;

		for (const [index, claim] of claimsToAnalyze.entries()) {
			setAiRun((current) => ({
				...current,
				currentClaim: claim.claimNumber,
				processed: index,
			}));

			try {
				const result = await analyzeClaimWithAi(claim);
				setAiResultsByClaim((current) => ({
					...current,
					[claim.claimNumber]: result,
				}));
			} catch (error) {
				errors += 1;
				setAiErrorsByClaim((current) => ({
					...current,
					[claim.claimNumber]:
						error instanceof Error
							? error.message
							: "No fue posible analizar el caso con IA.",
				}));
			}

			setAiRun((current) => ({
				...current,
				processed: index + 1,
			}));
		}

		setAiRun({
			status: errors > 0 ? "completed_with_errors" : "completed",
			processed: claimsToAnalyze.length,
			total: claimsToAnalyze.length,
			error:
				errors > 0
					? `${errors} caso${errors === 1 ? "" : "s"} no se pudo analizar.`
					: undefined,
		});
	};

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8 dark:bg-slate-950 dark:text-slate-100">
			<div className="mx-auto max-w-7xl space-y-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Link
						className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
						to="/"
					>
						<ArrowLeft aria-hidden size={16} />
						Volver al dashboard
					</Link>
					<div className="flex flex-wrap gap-2">
						<button
							className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
							disabled={
								currentClaims.length === 0 || aiRun.status === "running"
							}
							onClick={onAnalyzeVisibleClaims}
							title="Analiza los casos visibles uno por uno usando FastAPI e IA."
							type="button"
						>
							{aiRun.status === "running" ? (
								<Loader2 aria-hidden className="animate-spin" size={16} />
							) : (
								<BrainCircuit aria-hidden size={16} />
							)}
							{aiRun.status === "running"
								? "Analizando"
								: "Analizar visibles con IA"}
						</button>
						<button
							className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
							disabled={processedClaims.length === 0}
							onClick={() => exportClaimsCsv(processedClaims)}
							type="button"
						>
							<Download aria-hidden size={16} />
							Exportar
						</button>
					</div>
				</div>

				<header className="border-b border-slate-200 pb-5 dark:border-slate-800">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
						<ClipboardList aria-hidden size={15} />
						Bandeja antifraude
					</div>
					<h1 className="mt-1 text-2xl font-bold tracking-tight">
						Casos procesados
					</h1>
					<p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
						Visualiza todos los siniestros procesados y su clasificacion de
						riesgo: verde, amarillo o rojo.
					</p>
				</header>

				<div className="grid gap-4 xl:grid-cols-2">
					<PriorityGroup
						claims={topRedClaims}
						color="red"
						emptyText="Sin casos rojos procesados todavia."
						title="Prioridad urgente"
					/>
					<PriorityGroup
						claims={topYellowClaims}
						color="yellow"
						emptyText="Sin casos amarillos procesados todavia."
						title="Prioridad"
					/>
				</div>

				<section className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
					<div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between dark:border-slate-800">
						<label className="relative min-w-64 flex-1">
							<Search
								aria-hidden
								className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
								size={16}
							/>
							<input
								className="h-10 w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Buscar claim, cliente, proveedor, tipo o ciudad"
								type="text"
								value={search}
							/>
						</label>
						<select
							className="h-10 rounded-md border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
							onChange={(event) =>
								setRiskFilter(event.target.value as RiskFilter)
							}
							value={riskFilter}
						>
							<option value="all">Todos los riesgos</option>
							<option value="green">Bajo</option>
							<option value="yellow">Medio</option>
							<option value="red">Alto</option>
						</select>
					</div>
					{aiRun.status !== "idle" || analyzedCount > 0 || failedCount > 0 ? (
						<div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div className="flex min-w-0 items-start gap-3">
									<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
										<Bot aria-hidden size={17} />
									</div>
									<div className="min-w-0">
										<p className="text-sm font-semibold">
											Verificacion IA de casos visibles
										</p>
										<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
											{aiRun.status === "running"
												? `Procesando ${aiRun.currentClaim ?? "caso actual"} (${aiRun.processed}/${aiRun.total}).`
												: `Analizados: ${analyzedCount}. Errores: ${failedCount}.`}
										</p>
										{aiRun.error ? (
											<p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
												{aiRun.error}
											</p>
										) : null}
									</div>
								</div>
								<div className="w-full max-w-sm">
									<div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
										<span>{analysisProgress}%</span>
										<span>
											{aiRun.processed}/{aiRun.total}
										</span>
									</div>
									<div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
										<div
											className="h-full rounded-full bg-slate-950 transition-all duration-300 dark:bg-slate-100"
											style={{ width: `${analysisProgress}%` }}
										/>
									</div>
								</div>
							</div>
						</div>
					) : null}
					<div className="overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-slate-100 text-left text-slate-600 dark:bg-slate-800 dark:text-slate-300">
								<tr>
									<th className="px-4 py-3 font-medium">Claim</th>
									<th className="px-4 py-3 font-medium">Cliente</th>
									<th className="px-4 py-3 font-medium">Proveedor</th>
									<th className="px-4 py-3 font-medium">Monto</th>
									<th className="px-4 py-3 font-medium">IA</th>
									<th className="px-4 py-3 font-medium">Reglas</th>
									<th className="px-4 py-3 font-medium">Final</th>
									<th className="px-4 py-3 font-medium">Nivel</th>
									<th className="px-4 py-3 font-medium">Alertas</th>
								</tr>
							</thead>
							<tbody>
								{currentClaims.map((claim) => {
									const aiResult = aiResultsByClaim[claim.claimNumber];
									const aiError = aiErrorsByClaim[claim.claimNumber];
									const displayRiskLevel = aiResult
										? riskLevelFromAnalysis(aiResult.nivel)
										: claim.riskLevel;
									const alertText = aiResult
										? [
												...aiResult.alertas
													.slice(0, 2)
													.map((alert) => alert.regla),
												...aiResult.patrones_detectados.slice(0, 1),
											].join(" | ") || aiResult.explicacion
										: claim.anomalyFlags.length > 0
											? claim.anomalyFlags.slice(0, 2).join(" | ")
											: "Sin alertas relevantes";

									return (
										<tr
											className="border-t border-slate-100 align-top hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
											key={claim._id}
										>
											<td className="px-4 py-3 font-medium">
												{claim.claimNumber}
											</td>
											<td className="px-4 py-3">{claim.customerId}</td>
											<td className="px-4 py-3">{claim.providerId ?? "-"}</td>
											<td className="px-4 py-3">
												${formatNumber(claim.claimAmount)}
											</td>
											<td className="px-4 py-3">
												<div className="space-y-1">
													<p className="font-semibold">
														{aiResult
															? Math.round(aiResult.score_ia)
															: (claim.mlScore ?? "-")}
													</p>
													<p className="text-[11px] text-slate-500 dark:text-slate-400">
														{aiResult
															? "Analizado IA"
															: aiError
																? "Error IA"
																: "Pendiente IA"}
													</p>
												</div>
											</td>
											<td className="px-4 py-3">
												{aiResult
													? Math.round(aiResult.score_reglas)
													: claim.ruleRiskScore}
											</td>
											<td className="px-4 py-3 font-semibold">
												{aiResult
													? aiResult.score_final.toFixed(2)
													: claim.riskScore}
											</td>
											<td className="px-4 py-3">
												<span
													className={`rounded-full px-2 py-1 text-xs font-semibold ${riskPillStyles[displayRiskLevel]}`}
												>
													{aiResult
														? aiResult.nivel
														: riskLevelText(claim.riskLevel)}
												</span>
											</td>
											<td className="max-w-sm px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
												{aiError ? (
													<span className="text-rose-700 dark:text-rose-300">
														{aiError}
													</span>
												) : (
													alertText
												)}
											</td>
										</tr>
									);
								})}
								{tableClaims && currentClaims.length === 0 ? (
									<tr>
										<td
											className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-300"
											colSpan={9}
										>
											No hay resultados para el filtro actual.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</div>
	);
}

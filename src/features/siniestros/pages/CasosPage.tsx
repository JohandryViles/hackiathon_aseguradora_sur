import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowLeft, ClipboardList, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PriorityGroup } from "@/features/siniestros/components/PriorityGroup";
import { api } from "@/shared/services/convexApi";
import { exportClaimsCsv } from "@/shared/services/exportCsv";
import { riskLevelText } from "@/shared/utils/riskLevelText";
import { formatNumber } from "@/shared/utils/formatNumber";
import { riskPillStyles } from "@/shared/constants/riskStyles";
import type { RiskFilter } from "@/shared/types/claims";

export function CasosPage() {
	const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
	const [search, setSearch] = useState("");

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
								{currentClaims.map((claim) => (
									<tr
										className="border-t border-slate-100 align-top hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
										key={claim._id}
									>
										<td className="px-4 py-3 font-medium">
											{claim.claimNumber}
										</td>
										<td className="px-4 py-3">{claim.customerId}</td>
										<td className="px-4 py-3">
											{claim.providerId ?? "-"}
										</td>
										<td className="px-4 py-3">
											${formatNumber(claim.claimAmount)}
										</td>
										<td className="px-4 py-3">{claim.mlScore ?? "-"}</td>
										<td className="px-4 py-3">{claim.ruleRiskScore}</td>
										<td className="px-4 py-3 font-semibold">{claim.riskScore}</td>
										<td className="px-4 py-3">
											<span
												className={`rounded-full px-2 py-1 text-xs font-semibold ${riskPillStyles[claim.riskLevel]}`}
											>
												{riskLevelText(claim.riskLevel)}
											</span>
										</td>
										<td className="max-w-sm px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
											{claim.anomalyFlags.length > 0
												? claim.anomalyFlags.slice(0, 2).join(" | ")
												: "Sin alertas relevantes"}
										</td>
									</tr>
								))}
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

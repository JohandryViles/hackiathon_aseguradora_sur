import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	AlertTriangle,
	BarChart3,
	Bot,
	Brain,
	CheckCircle2,
	ClipboardList,
	Database,
	Download,
	FileCheck2,
	FileText,
	Gauge,
	LayoutDashboard,
	RefreshCcw,
	Search,
	Send,
	ShieldCheck,
	Upload,
} from "lucide-react";
import { type ComponentType, useMemo, useState } from "react";

import { api } from "../../convex/_generated/api";
import { type PayloadFormat, parsePayload } from "../lib/importPayload";

export const Route = createFileRoute("/")({ component: Home });

type RiskFilter = "all" | "green" | "yellow" | "red";
type IconComponent = ComponentType<{ className?: string; size?: number }>;

type ExportableClaim = {
	claimNumber: string;
	customerId: string;
	providerId?: string;
	locationRegion: string;
	claimAmount: number;
	mlScore: number | null;
	ruleRiskScore: number;
	riskScore: number;
	riskLevel: string;
	anomalyFlags: string[];
	recommendedAction: string;
};

const navItems: Array<{ href: string; label: string; icon: IconComponent }> = [
	{ href: "#resumen", label: "Resumen", icon: LayoutDashboard },
	{ href: "#modelo", label: "Modelo IA", icon: Brain },
	{ href: "#importar", label: "Datos", icon: Database },
	{ href: "#casos", label: "Casos", icon: ClipboardList },
	{ href: "#agente", label: "Agente", icon: Bot },
	{ href: "#entregables", label: "Entregables", icon: FileCheck2 },
];

const quickQuestions = [
	"10 casos de mayor riesgo",
	"proveedores con mas alertas",
	"ciudades con mayor concentracion",
	"documentos faltantes",
	"resumen ejecutivo",
];

function escapeCsv(value: unknown) {
	const text = String(value ?? "");
	if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
	return text;
}

function downloadCasesCsv(claims: ExportableClaim[]) {
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

function Home() {
	const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
	const [search, setSearch] = useState("");
	const [nlQuestion, setNlQuestion] = useState("");
	const [submittedQuestion, setSubmittedQuestion] = useState("");
	const [isSeeding, setIsSeeding] = useState(false);
	const [payloadFormat, setPayloadFormat] = useState<PayloadFormat>("json");
	const [publicPayload, setPublicPayload] = useState("");
	const [datasetName, setDatasetName] = useState("public-claims");
	const [importFeedback, setImportFeedback] = useState<{
		inserted: number;
		skipped: number;
		errors: string[];
	} | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const [isImporting, setIsImporting] = useState(false);

	const summary = useQuery(api.claims.getSummary, {});
	const claims = useQuery(api.claims.listWithRisk, {
		riskLevel: riskFilter === "all" ? undefined : riskFilter,
		search: search.trim() ? search.trim() : undefined,
		limit: 80,
	});
	const assistantResponse = useQuery(
		api.claims.askAnalystAssistant,
		submittedQuestion.trim() ? { question: submittedQuestion } : "skip",
	);
	const seedData = useMutation(api.claims.seedSyntheticData);
	const importPublicClaims = useMutation(api.claims.importPublicClaims);
	const currentClaims = claims ?? [];

	const riskPillStyles = useMemo(
		() => ({
			green: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
			yellow: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
			red: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
		}),
		[],
	);

	const onSeedData = async (force = false) => {
		try {
			setIsSeeding(true);
			await seedData({ force });
		} finally {
			setIsSeeding(false);
		}
	};

	const onAsk = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmittedQuestion(nlQuestion.trim());
	};

	const askQuickQuestion = (question: string) => {
		setNlQuestion(question);
		setSubmittedQuestion(question);
	};

	const onImportPublic = async () => {
		try {
			setImportError(null);
			setImportFeedback(null);
			setIsImporting(true);
			const rows = parsePayload(payloadFormat, publicPayload);
			if (rows.length === 0) {
				setImportError("No se detectaron filas para importar");
				return;
			}
			const result = await importPublicClaims({
				datasetName: datasetName.trim() || undefined,
				rows,
			});
			setImportFeedback({
				inserted: result.inserted,
				skipped: result.skipped,
				errors: result.errors,
			});
		} catch (error) {
			setImportError(
				error instanceof Error
					? error.message
					: "No fue posible importar los datos",
			);
		} finally {
			setIsImporting(false);
		}
	};

	const loadExamplePayload = () => {
		setPayloadFormat("json");
		setPublicPayload(`[
  {
    "claim_id": "PUB-001",
    "policy_id": "P-7782",
    "customer_id": "CUST-9001",
    "provider_id": "PROV-EXT-01",
    "claim_amount": 11250,
    "estimated_damage_amount": 6500,
    "claim_type": "theft",
    "incidents_last_18_months": 3,
    "days_since_policy_start": 12,
    "dias_entre_ocurrencia_reporte": 6,
    "region": "Quito",
    "report_channel": "callcenter",
    "incident_date": "2026-04-29T23:14:00Z",
    "documentos_inconsistentes": true,
    "provider_observed_cases": 5,
    "fraud_probability": 0.82,
    "description": "Vehiculo sustraido en zona urbana con denuncia tardia."
  },
  {
    "claim_id": "PUB-002",
    "policy_id": "P-7783",
    "customer_id": "CUST-9012",
    "claim_amount": 2400,
    "estimated_damage_amount": 2600,
    "claim_type": "collision",
    "incidents_last_12_months": 0,
    "days_since_policy_start": 390,
    "region": "Guayaquil",
    "report_channel": "app",
    "incident_date": "2026-04-10T16:00:00Z",
    "description": "Colision leve con danos de pintura."
  }
]`);
	};

	return (
		<div className="min-h-screen bg-slate-50 text-slate-950">
			<div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
				<Sidebar />

				<main className="min-w-0">
					<div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
						<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
									Reto Aseguradora del Sur
								</p>
								<h1 className="text-2xl font-bold tracking-tight">
									Detector IA de Posibles Fraudes en Siniestros
								</h1>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<button
									className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
									disabled={isSeeding}
									onClick={() => onSeedData(false)}
									type="button"
								>
									<Database aria-hidden size={16} />
									{isSeeding ? "Cargando..." : "Cargar datos"}
								</button>
								<button
									className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-100"
									disabled={isSeeding}
									onClick={() => onSeedData(true)}
									type="button"
								>
									<RefreshCcw aria-hidden size={16} />
									Regenerar demo
								</button>
								<button
									className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium disabled:cursor-not-allowed disabled:bg-slate-100"
									disabled={currentClaims.length === 0}
									onClick={() => downloadCasesCsv(currentClaims)}
									type="button"
								>
									<Download aria-hidden size={16} />
									Exportar
								</button>
							</div>
						</div>
					</div>

					<div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
						<nav className="flex gap-2 overflow-x-auto">
							{navItems.map((item) => (
								<a
									className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
									href={item.href}
									key={item.href}
								>
									<item.icon aria-hidden size={15} />
									{item.label}
								</a>
							))}
						</nav>
					</div>

					<div className="space-y-8 px-4 py-6 md:px-8">
						<section className="space-y-4" id="resumen">
							<SectionHeader
								icon={Gauge}
								kicker="Resumen operativo"
								title="Prioriza casos para revision humana"
								description="Score hibrido con modelo scikit-learn y reglas explicables. El resultado es una alerta, no una acusacion."
							/>

							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
								<MetricCard
									icon={ClipboardList}
									label="Total siniestros"
									value={summary?.total ?? 0}
								/>
								<MetricCard
									icon={Gauge}
									label="Score promedio"
									value={summary?.averageRiskScore ?? 0}
								/>
								<MetricCard
									icon={Brain}
									label="Score ML promedio"
									value={summary?.averageMlRiskScore ?? 0}
								/>
								<MetricCard
									icon={ShieldCheck}
									label="Ahorro simulado"
									value={summary?.estimatedSavingsOpportunity ?? 0}
									money
								/>
							</div>

							<div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
								<div className="grid gap-4 md:grid-cols-3">
									<RiskCard
										color="red"
										label="Rojo"
										value={summary?.byLevel?.red ?? 0}
									/>
									<RiskCard
										color="yellow"
										label="Amarillo"
										value={summary?.byLevel?.yellow ?? 0}
									/>
									<RiskCard
										color="green"
										label="Verde"
										value={summary?.byLevel?.green ?? 0}
									/>
								</div>

								<div className="rounded-lg border border-slate-200 bg-white p-4">
									<div className="flex items-center justify-between gap-3">
										<div>
											<h2 className="font-semibold">
												Concentracion de alertas
											</h2>
											<p className="text-sm text-slate-600">
												Top de proveedores, ciudades y coberturas con casos no
												verdes.
											</p>
										</div>
										<BarChart3 className="text-slate-400" size={20} />
									</div>
									<div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
										<TopList
											title="Proveedores"
											items={summary?.topProviders ?? []}
										/>
										<TopList
											title="Ciudades"
											items={summary?.topCities ?? []}
										/>
										<TopList
											title="Coberturas"
											items={summary?.topLines ?? []}
										/>
									</div>
								</div>
							</div>
						</section>

						<section className="space-y-4" id="modelo">
							<SectionHeader
								icon={Brain}
								kicker="Modelo y trazabilidad"
								title="IA supervisada + reglas del negocio"
								description="El prototipo usa RandomForestClassifier entrenado con datos sinteticos y combina su probabilidad con alertas explicables."
							/>
							<div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
								<div className="rounded-lg border border-slate-200 bg-white p-4">
									<div className="grid gap-3 text-sm md:grid-cols-3">
										<InfoLine
											label="Version"
											value={
												summary?.modelVersion ?? "sklearn-random-forest-v1"
											}
										/>
										<InfoLine label="Precision" value="0.9306" />
										<InfoLine label="Recall" value="0.9853" />
										<InfoLine label="F1-score" value="0.9571" />
										<InfoLine label="ROC-AUC" value="0.9980" />
										<InfoLine
											label="Docs criticos"
											value={summary?.criticalDocumentsMissing ?? 0}
										/>
									</div>
								</div>

								<div className="rounded-lg border border-slate-200 bg-white p-4">
									<h2 className="font-semibold">Modelo de datos demo</h2>
									<div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
										<InfoLine
											label="Polizas"
											value={summary?.dataModelCounts?.policies ?? 0}
										/>
										<InfoLine
											label="Asegurados"
											value={summary?.dataModelCounts?.insureds ?? 0}
										/>
										<InfoLine
											label="Vehiculos"
											value={summary?.dataModelCounts?.vehicles ?? 0}
										/>
										<InfoLine
											label="Proveedores"
											value={summary?.dataModelCounts?.providers ?? 0}
										/>
										<InfoLine
											label="Documentos"
											value={summary?.dataModelCounts?.documents ?? 0}
										/>
										<InfoLine
											label="Publicos"
											value={summary?.bySource?.public ?? 0}
										/>
									</div>
								</div>
							</div>
						</section>

						<section className="space-y-4" id="importar">
							<SectionHeader
								icon={Upload}
								kicker="Ingestion"
								title="Carga datos publicos o registros puntuados"
								description="Acepta JSON o CSV con columnas del reto. Si incluye fraud_probability, el dashboard usa esa probabilidad como score ML."
							/>
							<div className="rounded-lg border border-slate-200 bg-white p-4">
								<div className="grid gap-3 md:grid-cols-[220px_1fr_150px_auto]">
									<input
										className="h-10 rounded-md border border-slate-300 px-3 text-sm"
										onChange={(event) => setDatasetName(event.target.value)}
										placeholder="Nombre dataset"
										type="text"
										value={datasetName}
									/>
									<select
										className="h-10 rounded-md border border-slate-300 px-3 text-sm"
										onChange={(event) =>
											setPayloadFormat(event.target.value as PayloadFormat)
										}
										value={payloadFormat}
									>
										<option value="json">Formato JSON</option>
										<option value="csv">Formato CSV</option>
									</select>
									<button
										className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
										disabled={isImporting}
										onClick={onImportPublic}
										type="button"
									>
										<Upload aria-hidden size={16} />
										{isImporting ? "Importando..." : "Importar"}
									</button>
									<button
										className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium"
										onClick={loadExamplePayload}
										type="button"
									>
										<FileText aria-hidden size={16} />
										Ejemplo
									</button>
								</div>

								<textarea
									className="mt-3 min-h-44 w-full rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-slate-500 focus:bg-white"
									onChange={(event) => setPublicPayload(event.target.value)}
									placeholder={
										payloadFormat === "json"
											? '[{"claim_amount": 1200, "claim_type": "collision"}]'
											: "claim_amount,claim_type,customer_id\n1200,collision,CUST-1"
									}
									value={publicPayload}
								/>

								{importError ? (
									<p className="mt-2 text-sm text-rose-700">{importError}</p>
								) : null}
								{importFeedback ? (
									<div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
										<p>
											Importacion completada: {importFeedback.inserted}{" "}
											insertados / {importFeedback.skipped} omitidos.
										</p>
										{importFeedback.errors.length > 0 ? (
											<p className="mt-1 text-xs">
												Advertencias: {importFeedback.errors.join(" | ")}
											</p>
										) : null}
									</div>
								) : null}
							</div>
						</section>

						<section className="space-y-4" id="casos">
							<SectionHeader
								icon={ClipboardList}
								kicker="Bandeja antifraude"
								title="Casos priorizados"
								description="Filtra, busca y exporta la cola de revision. Cada caso muestra score ML, score de reglas y explicacion."
							/>
							<div className="rounded-lg border border-slate-200 bg-white">
								<div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
									<label className="relative min-w-64 flex-1">
										<Search
											aria-hidden
											className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
											size={16}
										/>
										<input
											className="h-10 w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500"
											onChange={(event) => setSearch(event.target.value)}
											placeholder="Buscar claim, cliente, proveedor, tipo o ciudad"
											type="text"
											value={search}
										/>
									</label>
									<select
										className="h-10 rounded-md border border-slate-300 px-3 text-sm"
										onChange={(event) =>
											setRiskFilter(event.target.value as RiskFilter)
										}
										value={riskFilter}
									>
										<option value="all">Todos los riesgos</option>
										<option value="green">Verde</option>
										<option value="yellow">Amarillo</option>
										<option value="red">Rojo</option>
									</select>
								</div>
								<div className="overflow-x-auto">
									<table className="min-w-full text-sm">
										<thead className="bg-slate-100 text-left text-slate-600">
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
													className="border-t border-slate-100 align-top hover:bg-slate-50"
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
														${claim.claimAmount.toLocaleString("en-US")}
													</td>
													<td className="px-4 py-3">{claim.mlScore ?? "-"}</td>
													<td className="px-4 py-3">{claim.ruleRiskScore}</td>
													<td className="px-4 py-3 font-semibold">
														{claim.riskScore}
													</td>
													<td className="px-4 py-3">
														<span
															className={`rounded-full px-2 py-1 text-xs font-semibold ${riskPillStyles[claim.riskLevel]}`}
														>
															{claim.riskLevel}
														</span>
													</td>
													<td className="max-w-sm px-4 py-3 text-xs text-slate-700">
														{claim.anomalyFlags.length > 0
															? claim.anomalyFlags.slice(0, 2).join(" | ")
															: "Sin alertas relevantes"}
													</td>
												</tr>
											))}
											{claims && currentClaims.length === 0 ? (
												<tr>
													<td
														className="px-4 py-10 text-center text-sm text-slate-600"
														colSpan={9}
													>
														No hay resultados para el filtro actual.
													</td>
												</tr>
											) : null}
										</tbody>
									</table>
								</div>
							</div>
						</section>

						<section className="space-y-4" id="agente">
							<SectionHeader
								icon={Bot}
								kicker="Consultas"
								title="Agente para analistas"
								description="Responde preguntas frecuentes sobre riesgo, proveedores, ciudades, documentos, clientes y resumen ejecutivo."
							/>
							<div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
								<div className="rounded-lg border border-slate-200 bg-white p-4">
									<form className="space-y-3" onSubmit={onAsk}>
										<input
											className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
											onChange={(event) => setNlQuestion(event.target.value)}
											placeholder="Ej: por que CLM-00001 fue marcado"
											type="text"
											value={nlQuestion}
										/>
										<button
											className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-indigo-700 px-3 text-sm font-medium text-white"
											type="submit"
										>
											<Send aria-hidden size={16} />
											Consultar
										</button>
									</form>
									<div className="mt-4 flex flex-wrap gap-2">
										{quickQuestions.map((question) => (
											<button
												className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
												key={question}
												onClick={() => askQuickQuestion(question)}
												type="button"
											>
												{question}
											</button>
										))}
									</div>
								</div>

								<div className="rounded-lg border border-slate-200 bg-white p-4">
									<h2 className="font-semibold">Respuesta</h2>
									{assistantResponse ? (
										<div className="mt-3 space-y-3">
											<p className="text-sm text-slate-800">
												{assistantResponse.answer}
											</p>
											<div className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-950">
												<strong>Siguiente accion:</strong>{" "}
												{assistantResponse.recommendedAction}
											</div>
											{assistantResponse.claims.length > 0 ? (
												<ul className="grid gap-2 text-sm md:grid-cols-2">
													{assistantResponse.claims.slice(0, 6).map((claim) => (
														<li
															className="rounded-md border border-slate-200 p-3"
															key={claim._id}
														>
															<p className="font-semibold">
																{claim.claimNumber}
															</p>
															<p className="text-xs text-slate-600">
																Score {claim.riskScore} - {claim.riskLevel}
															</p>
														</li>
													))}
												</ul>
											) : null}
										</div>
									) : (
										<p className="mt-3 text-sm text-slate-600">
											Selecciona una pregunta rapida o escribe una consulta para
											obtener casos relacionados.
										</p>
									)}
								</div>
							</div>
						</section>

						<section className="space-y-4" id="entregables">
							<SectionHeader
								icon={FileCheck2}
								kicker="Entrega"
								title="Checklist del reto"
								description="Componentes que ya quedaron plasmados en codigo, datos y documentacion."
							/>
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								<Deliverable
									label="Modelo scikit-learn"
									path="models/fraud_model.joblib"
								/>
								<Deliverable
									label="Metricas del modelo"
									path="models/model_metrics.json"
								/>
								<Deliverable
									label="Dataset sintetico"
									path="data/synthetic/claims_training.csv"
								/>
								<Deliverable label="Arquitectura" path="docs/arquitectura.md" />
								<Deliverable
									label="Modelo de datos"
									path="docs/modelo_datos.md"
								/>
								<Deliverable
									label="Reglas de negocio"
									path="docs/reglas_negocio.md"
								/>
								<Deliverable label="Uso de IA" path="docs/uso_ia.md" />
								<Deliverable label="Limitaciones" path="docs/limitaciones.md" />
								<Deliverable
									label="Pitch"
									path="presentation/pitch_outline.md"
								/>
							</div>
						</section>
					</div>
				</main>
			</div>
		</div>
	);
}

function Sidebar() {
	return (
		<aside className="hidden border-r border-slate-200 bg-white lg:block">
			<div className="sticky top-0 flex h-screen flex-col p-5">
				<div className="flex items-center gap-3 border-b border-slate-200 pb-5">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
						<ShieldCheck aria-hidden size={20} />
					</div>
					<div>
						<p className="text-sm font-bold">Aseguradora del Sur</p>
						<p className="text-xs text-slate-500">Analisis de siniestros</p>
					</div>
				</div>

				<nav className="mt-6 space-y-1">
					{navItems.map((item) => (
						<a
							className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
							href={item.href}
							key={item.href}
						>
							<item.icon aria-hidden size={17} />
							{item.label}
						</a>
					))}
				</nav>

				<div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<AlertTriangle aria-hidden className="text-amber-600" size={16} />
						Importante
					</div>
					<p className="mt-2 text-xs leading-5 text-slate-600">
						Detector de Posibles Fraudes en Siniestros usando Inteligencia Artificial
					</p>
				</div>
			</div>
		</aside>
	);
}

function SectionHeader({
	icon: Icon,
	kicker,
	title,
	description,
}: {
	icon: IconComponent;
	kicker: string;
	title: string;
	description: string;
}) {
	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
			<div>
				<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
					<Icon aria-hidden size={15} />
					{kicker}
				</div>
				<h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
				<p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
			</div>
		</div>
	);
}

function MetricCard({
	icon: Icon,
	label,
	value,
	money,
}: {
	icon: IconComponent;
	label: string;
	value: number;
	money?: boolean;
}) {
	return (
		<article className="rounded-lg border border-slate-200 bg-white p-4">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					{label}
				</p>
				<Icon aria-hidden className="text-slate-400" size={18} />
			</div>
			<p className="mt-3 text-2xl font-bold">
				{money ? "$" : ""}
				{value.toLocaleString("en-US")}
			</p>
		</article>
	);
}

function RiskCard({
	color,
	label,
	value,
}: {
	color: "red" | "yellow" | "green";
	label: string;
	value: number;
}) {
	const styles = {
		red: "border-rose-200 bg-rose-50 text-rose-900",
		yellow: "border-amber-200 bg-amber-50 text-amber-900",
		green: "border-emerald-200 bg-emerald-50 text-emerald-900",
	};

	return (
		<article className={`rounded-lg border p-4 ${styles[color]}`}>
			<p className="text-xs font-semibold uppercase tracking-wide">
				Riesgo {label}
			</p>
			<p className="mt-3 text-3xl font-bold">{value.toLocaleString("en-US")}</p>
		</article>
	);
}

function InfoLine({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-md bg-slate-50 p-3">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
				{label}
			</p>
			<p className="mt-1 truncate font-semibold">
				{value.toLocaleString("en-US")}
			</p>
		</div>
	);
}

function TopList({
	title,
	items,
}: {
	title: string;
	items: Array<{ label: string; count: number }>;
}) {
	return (
		<div>
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
				{title}
			</p>
			<ul className="mt-2 space-y-1">
				{items.map((item) => (
					<li className="flex justify-between gap-2" key={item.label}>
						<span className="truncate">{item.label}</span>
						<strong>{item.count}</strong>
					</li>
				))}
				{items.length === 0 ? (
					<li className="text-slate-500">Sin datos</li>
				) : null}
			</ul>
		</div>
	);
}

function Deliverable({ label, path }: { label: string; path: string }) {
	return (
		<div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
			<CheckCircle2 aria-hidden className="mt-0.5 text-emerald-600" size={18} />
			<div className="min-w-0">
				<p className="font-semibold">{label}</p>
				<p className="mt-1 truncate font-mono text-xs text-slate-500">{path}</p>
			</div>
		</div>
	);
}

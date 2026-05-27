import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	AlertTriangle,
	BarChart3,
	Bot,
	Brain,
	ClipboardList,
	Download,
	Gauge,
	LayoutDashboard,
	Moon,
	Send,
	ShieldCheck,
	Sun,
	Upload,
} from "lucide-react";
import { type ComponentType, useEffect, useState } from "react";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({ component: Home });

type IconComponent = ComponentType<{ className?: string; size?: number }>;

type ExportableClaim = {
	_id?: string;
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
	{ href: "/ML_AGENTE", label: "ML + Agente", icon: Brain },
	{ href: "#modelo", label: "Datos demo", icon: Gauge },
	{ href: "/casos", label: "Casos", icon: ClipboardList },
	{ href: "#agente", label: "Agente", icon: Bot },
];

const quickQuestions = [
	"10 casos de mayor riesgo",
	"proveedores con mas alertas",
	"ciudades con mayor concentracion",
	"documentos faltantes",
	"resumen ejecutivo",
];

function riskLevelText(level: string) {
	if (level === "red") return "Alto";
	if (level === "yellow") return "Medio";
	if (level === "green") return "Bajo";
	return level;
}

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
	const [nlQuestion, setNlQuestion] = useState("");
	const [submittedQuestion, setSubmittedQuestion] = useState("");
	const [isDarkMode, setIsDarkMode] = useState(false);

	useEffect(() => {
		const storedTheme = window.localStorage.getItem("theme");
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;
		const initialIsDark = storedTheme
			? storedTheme === "dark"
			: prefersDark;
		setIsDarkMode(initialIsDark);
		document.documentElement.classList.toggle("dark", initialIsDark);
	}, []);

	const summary = useQuery(api.claims.getSummary, {});
	const exportClaims = useQuery(api.claims.listWithRisk, { limit: 200 });
	const assistantResponse = useQuery(
		api.claims.askAnalystAssistant,
		submittedQuestion.trim() ? { question: submittedQuestion } : "skip",
	);
	const currentClaims = exportClaims ?? [];
	const recentRedClaims = currentClaims
		.filter((claim) => claim.riskLevel === "red")
		.slice(0, 5);
	const recentYellowClaims = currentClaims
		.filter((claim) => claim.riskLevel === "yellow")
		.slice(0, 5);

	const onAsk = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmittedQuestion(nlQuestion.trim());
	};

	const askQuickQuestion = (question: string) => {
		setNlQuestion(question);
		setSubmittedQuestion(question);
	};

	const toggleTheme = () => {
		setIsDarkMode((prev) => {
			const next = !prev;
			document.documentElement.classList.toggle("dark", next);
			window.localStorage.setItem("theme", next ? "dark" : "light");
			return next;
		});
	};

	return (
		<div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100 dark:[background-image:radial-gradient(1200px_600px_at_10%_-10%,rgba(56,189,248,0.12),transparent),radial-gradient(1200px_600px_at_90%_10%,rgba(59,130,246,0.10),transparent)]">
			<div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
				<Sidebar />

				<main className="min-w-0">
					<div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8 dark:border-slate-800 dark:bg-slate-950/80">
						<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
									Aseguradora del Sur
								</p>
								<h1 className="text-2xl font-bold tracking-tight">
									Deteccion de posibles fraudes en siniestros con IA
								</h1>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Link
									className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-slate-800"
									to="/importacion_csv"
								>
									<Upload aria-hidden size={16} />
									Importacion
								</Link>
								<button
									className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
									disabled={currentClaims.length === 0}
									onClick={() => downloadCasesCsv(currentClaims)}
									type="button"
								>
									<Download aria-hidden size={16} />
									Exportar
								</button>
								<button
									aria-label={
										isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
									}
									className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
									onClick={toggleTheme}
									type="button"
								>
									{isDarkMode ? (
										<Sun aria-hidden size={18} />
									) : (
										<Moon aria-hidden size={18} />
									)}
								</button>
							</div>
						</div>
					</div>

					<div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden dark:border-slate-800 dark:bg-slate-950">
						<nav className="flex gap-2 overflow-x-auto">
							{navItems.map((item) => (
								<a
									className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50"
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
										label="Rojo Alto"
										value={summary?.byLevel?.red ?? 0}
									/>
									<RiskCard
										color="yellow"
										label="Amarillo Medio"
										value={summary?.byLevel?.yellow ?? 0}
									/>
									<RiskCard
										color="green"
										label="Verde Bajo"
										value={summary?.byLevel?.green ?? 0}
									/>
								</div>

								<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
									<div className="flex items-center justify-between gap-3">
										<div>
											<h2 className="font-semibold">
												Concentracion de alertas
											</h2>
											<p className="text-sm text-slate-600 dark:text-slate-300">
												Top de proveedores, ciudades y coberturas con casos no
												verdes.
											</p>
										</div>
										<BarChart3 className="text-slate-400 dark:text-slate-500" size={20} />
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

						<section className="space-y-4">
							<SectionHeader
								icon={ClipboardList}
								kicker="Revision"
								title="Ultimos casos por revisar"
								description="Cinco casos recientes en rojo y amarillo para priorizar la revision humana."
							/>
							<div className="grid gap-4 xl:grid-cols-2">
								<PriorityGroup
									claims={recentRedClaims}
									color="red"
									emptyText="Sin casos rojos por revisar."
									title="Prioridad urgente"
								/>
								<PriorityGroup
									claims={recentYellowClaims}
									color="yellow"
									emptyText="Sin casos amarillos por revisar."
									title="Prioridad"
								/>
							</div>
						</section>

						<section className="space-y-4" id="modelo">
							<SectionHeader
								icon={Gauge}
								kicker="Datos demo"
								title="Modelo de datos demo"
								description="Conteo operativo de las tablas cargadas en Convex para alimentar el dashboard y las consultas."
							/>
							<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
								<div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
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
						</section>

						<section className="space-y-4" id="agente">
							<SectionHeader
								icon={Bot}
								kicker="Consultas"
								title="Agente para analistas"
								description="Responde preguntas frecuentes sobre riesgo, proveedores, ciudades, documentos, clientes y resumen ejecutivo."
							/>
							<div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
								<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
									<form className="space-y-3" onSubmit={onAsk}>
										<input
											className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
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
												className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
												key={question}
												onClick={() => askQuickQuestion(question)}
												type="button"
											>
												{question}
											</button>
										))}
									</div>
								</div>

								<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
									<h2 className="font-semibold">Respuesta</h2>
									{assistantResponse ? (
										<div className="mt-3 space-y-3">
											<p className="text-sm text-slate-800 dark:text-slate-200">
												{assistantResponse.answer}
											</p>
											<div className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-950 dark:bg-indigo-900/40 dark:text-indigo-100">
												<strong>Siguiente accion:</strong>{" "}
												{assistantResponse.recommendedAction}
											</div>
											{assistantResponse.claims.length > 0 ? (
												<ul className="grid gap-2 text-sm md:grid-cols-2">
													{assistantResponse.claims.slice(0, 6).map((claim) => (
														<li
															className="rounded-md border border-slate-200 p-3 dark:border-slate-800"
															key={claim._id}
														>
															<p className="font-semibold">
																{claim.claimNumber}
															</p>
															<p className="text-xs text-slate-600 dark:text-slate-300">
																Score {claim.riskScore} - {riskLevelText(claim.riskLevel)}
															</p>
														</li>
													))}
												</ul>
											) : null}
										</div>
									) : (
										<p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
											Selecciona una pregunta rapida o escribe una consulta para
											obtener casos relacionados.
										</p>
									)}
								</div>
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
		<aside className="hidden border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-950">
			<div className="sticky top-0 flex h-screen flex-col p-5">
				<div className="flex items-center gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
						<img
							alt="Logo Aseguradora del Sur"
							className="h-full w-full object-contain"
							src="/Logo_aseguradora.png"
						/>
					</div>
					<div>
						<p className="text-sm font-bold">Aseguradora del Sur</p>
						<p className="text-xs text-slate-500 dark:text-slate-400">Analisis de siniestros</p>
					</div>
				</div>

				<nav className="mt-6 space-y-1">
					{navItems.map((item) => (
						<a
							className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50"
							href={item.href}
							key={item.href}
						>
							<item.icon aria-hidden size={17} />
							{item.label}
						</a>
					))}
				</nav>

				<div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<AlertTriangle aria-hidden className="text-amber-600" size={16} />
						Importante
					</div>
					<p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
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
				<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
					<Icon aria-hidden size={15} />
					{kicker}
				</div>
				<h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
				<p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{description}</p>
			</div>
		</div>
	);
}

function PriorityGroup({
	claims,
	color,
	emptyText,
	title,
}: {
	claims: ExportableClaim[];
	color: "red" | "yellow";
	emptyText: string;
	title: string;
}) {
	const styles = {
		red: {
			container:
				"border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100",
			row: "border-rose-200/80 dark:border-rose-900/60",
		},
		yellow: {
			container:
				"border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100",
			row: "border-amber-200/80 dark:border-amber-900/60",
		},
	};

	return (
		<div className={`rounded-lg border p-4 ${styles[color].container}`}>
			<h3 className="font-semibold">{title}</h3>
			<div className="mt-3 divide-y text-sm">
				{claims.map((claim) => (
					<div className={`grid gap-2 py-3 ${styles[color].row}`} key={claim._id ?? claim.claimNumber}>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="truncate font-semibold">{claim.claimNumber}</p>
								<p className="mt-0.5 text-xs opacity-80">
									{claim.customerId} - {claim.providerId ?? "Sin proveedor"}
								</p>
							</div>
							<div className="text-right">
								<p className="font-bold">{claim.riskScore}</p>
								<p className="text-xs opacity-80">score</p>
							</div>
						</div>
						<p className="text-xs opacity-85">
							{claim.anomalyFlags[0] ?? claim.recommendedAction}
						</p>
					</div>
				))}
				{claims.length === 0 ? (
					<p className="py-4 text-sm opacity-80">{emptyText}</p>
				) : null}
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
		<article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
					{label}
				</p>
				<Icon aria-hidden className="text-slate-400 dark:text-slate-500" size={18} />
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
			<p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
			<p className="mt-3 text-3xl font-bold">{value.toLocaleString("en-US")}</p>
		</article>
	);
}

function InfoLine({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
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
					<li className="text-slate-500 dark:text-slate-400">Sin datos</li>
				) : null}
			</ul>
		</div>
	);
}


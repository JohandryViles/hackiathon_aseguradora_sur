import { Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import {
	ArrowLeft,
	Building2,
	CheckCircle2,
	Clock3,
	Download,
	FileCheck2,
	FileSpreadsheet,
	FileText,
	Loader2,
	PlayCircle,
	ShieldCheck,
	Upload,
	Users,
	Car,
} from "lucide-react";
import { type ChangeEvent, type ComponentType, useRef, useState } from "react";
import { parseCsvRows, parsePayload } from "@/lib/importPayload";
import {
	type AnalysisResult,
	analyzeImportedClaimRowWithAi,
	mergeStoredAiAnalysisResults,
} from "@/shared/services/analysisApi";
import { api } from "@/shared/services/convexApi";

type ImportKey =
	| "claims"
	| "policies"
	| "insureds"
	| "vehicles"
	| "providers"
	| "documents";

type ImportFeedback = {
	inserted: number;
	skipped: number;
	totalReceived: number;
	errors: string[];
	message: string;
};

type ImportState = {
	fileName?: string;
	datasetName?: string;
	rows?: Array<Record<string, unknown>>;
	loading: boolean;
	feedback?: ImportFeedback;
	error?: string;
};

type ImportRunState = {
	running: boolean;
	phase: "idle" | "importing" | "analyzing" | "done";
	processedTables: number;
	totalTables: number;
	processedClaims: number;
	totalClaims: number;
	error?: string;
};

type ImportConfig = {
	key: ImportKey;
	title: string;
	tableName: string;
	icon: ComponentType<{ className?: string; size?: number }>;
	requiredColumns: string[];
};

const templateRows: Record<ImportKey, string[]> = {
	claims: ["SIN-1001", "POL-2001", "CUST-3001", "5200"],
	policies: [
		"POL-2001",
		"CUST-3001",
		"vehicles",
		"2026-01-01",
		"2027-01-01",
		"850",
		"25000",
		"500",
		"broker",
		"Quito",
		"Activa",
	],
	insureds: ["CUST-3001", "Retail", "24", "Quito", "2", "1", "false", "710"],
	vehicles: [
		"VEH-9001",
		"CUST-3001",
		"PLACA-HASH-001",
		"CH-HASH-001",
		"EN-HASH-001",
		"Toyota",
		"Corolla",
		"2020",
	],
	providers: ["PROV-501", "Taller", "Quito", "12", "4300", "0.18", "60"],
	documents: [
		"DOC-8001",
		"SIN-1001",
		"denuncia",
		"true",
		"true",
		"2026-04-30T09:00:00Z",
		"false",
		"Documento valido",
	],
};

function escapeCsvCell(value: string) {
	if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
	return value;
}

function downloadTemplate(config: ImportConfig) {
	const headers = config.requiredColumns;
	const sample = templateRows[config.key] ?? headers.map(() => "");
	const csv = `${headers.map(escapeCsvCell).join(",")}\n${sample
		.map(escapeCsvCell)
		.join(",")}\n`;
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `plantilla_${config.tableName}.csv`;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

const importConfigs: ImportConfig[] = [
	{
		key: "claims",
		title: "Siniestros",
		tableName: "claims",
		icon: ShieldCheck,
		requiredColumns: [
			"id_siniestro",
			"id_poliza",
			"id_asegurado",
			"monto_reclamado",
		],
	},
	{
		key: "policies",
		title: "Polizas",
		tableName: "policies",
		icon: FileText,
		requiredColumns: [
			"id_poliza",
			"id_asegurado",
			"ramo",
			"fecha_inicio",
			"fecha_fin",
			"prima",
			"suma_asegurada",
			"deducible",
			"canal_venta",
			"ciudad",
			"estado_poliza",
		],
	},
	{
		key: "insureds",
		title: "Asegurados",
		tableName: "insureds",
		icon: Users,
		requiredColumns: [
			"id_asegurado",
			"segmento",
			"antiguedad",
			"ciudad",
			"numero_polizas",
			"reclamos_ultimos_12_meses",
			"mora_actual",
			"score_cliente_simulado",
		],
	},
	{
		key: "vehicles",
		title: "Vehiculos",
		tableName: "vehicles",
		icon: Car,
		requiredColumns: [
			"id_vehiculo",
			"id_asegurado",
			"placa_hash",
			"chasis_hash",
			"motor_hash",
			"marca",
			"modelo",
			"anio",
		],
	},
	{
		key: "providers",
		title: "Beneficiarios",
		tableName: "providers",
		icon: Building2,
		requiredColumns: [
			"id_proveedor",
			"tipo",
			"ciudad",
			"reclamos_asociados",
			"monto_promedio_reclamado",
			"porcentaje_de_casos_observados",
			"antiguedad",
		],
	},
	{
		key: "documents",
		title: "Documentos",
		tableName: "claimDocuments",
		icon: FileCheck2,
		requiredColumns: [
			"id_documento",
			"id_siniestro",
			"tipo_documento",
			"entregado",
			"legible",
			"fecha_emision",
			"inconsistencia_detectada",
			"observacion",
		],
	},
];

function createInitialState(): Record<ImportKey, ImportState> {
	return {
		claims: { loading: false },
		policies: { loading: false },
		insureds: { loading: false },
		vehicles: { loading: false },
		providers: { loading: false },
		documents: { loading: false },
	};
}

export function ImportacionCsvPage() {
	const [states, setStates] =
		useState<Record<ImportKey, ImportState>>(createInitialState);
	const [runState, setRunState] = useState<ImportRunState>({
		running: false,
		phase: "idle",
		processedTables: 0,
		totalTables: 0,
		processedClaims: 0,
		totalClaims: 0,
	});
	const importClaims = useMutation(api.claims.importPublicClaims);
	const importPolicies = useMutation(api.claims.importPolicies);
	const importInsureds = useMutation(api.claims.importInsureds);
	const importVehicles = useMutation(api.claims.importVehicles);
	const importProviders = useMutation(api.claims.importProviders);
	const importDocuments = useMutation(api.claims.importClaimDocuments);
	const [jsonImportKey, setJsonImportKey] = useState<ImportKey>("claims");
	const [jsonPayload, setJsonPayload] = useState("");
	const [jsonState, setJsonState] = useState<ImportState>({ loading: false });
	const fileInputRefs = useRef<Record<ImportKey, HTMLInputElement | null>>({
		claims: null,
		policies: null,
		insureds: null,
		vehicles: null,
		providers: null,
		documents: null,
	});

	const updateState = (key: ImportKey, state: Partial<ImportState>) => {
		setStates((current) => ({
			...current,
			[key]: { ...current[key], ...state },
		}));
	};

	const importRows = (
		key: ImportKey,
		rows: Array<Record<string, unknown>>,
		datasetName?: string,
	) => {
		if (key === "claims") {
			return importClaims({ datasetName, rows });
		}
		if (key === "policies") return importPolicies({ rows });
		if (key === "insureds") return importInsureds({ rows });
		if (key === "vehicles") return importVehicles({ rows });
		if (key === "providers") return importProviders({ rows });
		return importDocuments({ rows });
	};

	const onPrepareFile = async (key: ImportKey, file: File) => {
		updateState(key, {
			fileName: file.name,
			datasetName: file.name.replace(/\.[^/.]+$/, ""),
			rows: undefined,
			loading: true,
			error: undefined,
			feedback: undefined,
		});

		try {
			const content = await file.text();
			const rows = parseCsvRows(content);
			if (rows.length === 0) {
				updateState(key, {
					loading: false,
					error: "El CSV no contiene filas para importar.",
				});
				return;
			}

			updateState(key, {
				loading: false,
				rows,
			});
		} catch (error) {
			updateState(key, {
				loading: false,
				error:
					error instanceof Error
						? error.message
						: "No fue posible importar el archivo.",
			});
		}
	};

	const stagedConfigs = importConfigs.filter((config) => {
		const rows = states[config.key].rows;
		return rows && rows.length > 0;
	});
	const stagedRowsTotal = stagedConfigs.reduce(
		(total, config) => total + (states[config.key].rows?.length ?? 0),
		0,
	);
	const canStartImport = stagedConfigs.length > 0 && !runState.running;

	const onStartImportAndAnalysis = async () => {
		if (!canStartImport) return;

		const configsToRun = stagedConfigs;
		const claimRowsForAnalysis: Array<Record<string, unknown>> = [];
		let failedOperations = 0;

		setRunState({
			running: true,
			phase: "importing",
			processedTables: 0,
			totalTables: configsToRun.length,
			processedClaims: 0,
			totalClaims: 0,
		});

		for (const [index, config] of configsToRun.entries()) {
			const rows = states[config.key].rows ?? [];
			if (rows.length === 0) continue;

			updateState(config.key, {
				loading: true,
				error: undefined,
				feedback: undefined,
			});

			try {
				const result = await importRows(
					config.key,
					rows,
					states[config.key].datasetName,
				);

				if (config.key === "claims") {
					claimRowsForAnalysis.push(...rows);
				}

				updateState(config.key, {
					loading: false,
					rows: undefined,
					feedback: {
						inserted: result.inserted,
						skipped: result.skipped,
						totalReceived: result.totalReceived,
						errors: result.errors,
						message: result.message,
					},
				});
			} catch (error) {
				failedOperations += 1;
				updateState(config.key, {
					loading: false,
					error:
						error instanceof Error
							? error.message
							: "No fue posible importar el archivo.",
				});
			}

			setRunState((current) => ({
				...current,
				processedTables: index + 1,
			}));
		}

		if (claimRowsForAnalysis.length > 0) {
			const analysisResults: AnalysisResult[] = [];
			setRunState((current) => ({
				...current,
				phase: "analyzing",
				processedClaims: 0,
				totalClaims: claimRowsForAnalysis.length,
			}));

			for (const [index, row] of claimRowsForAnalysis.entries()) {
				try {
					const result = await analyzeImportedClaimRowWithAi(row);
					analysisResults.push(result);
				} catch {
					failedOperations += 1;
				}

				setRunState((current) => ({
					...current,
					processedClaims: index + 1,
				}));
			}

			if (analysisResults.length > 0) {
				mergeStoredAiAnalysisResults(analysisResults);
			}
		}

		setRunState((current) => ({
			...current,
			running: false,
			phase: "done",
			error:
				failedOperations > 0
					? `${failedOperations} operacion${failedOperations === 1 ? "" : "es"} no se completaron.`
					: undefined,
		}));
	};

	const onImportJson = async () => {
		setJsonState({ loading: true, error: undefined, feedback: undefined });
		try {
			const rows = parsePayload("json", jsonPayload);
			if (rows.length === 0) {
				setJsonState({
					loading: false,
					error: "El JSON no contiene registros para importar.",
				});
				return;
			}

			const result = await importRows(jsonImportKey, rows, "json-import");
			setJsonState({
				loading: false,
				feedback: {
					inserted: result.inserted,
					skipped: result.skipped,
					totalReceived: result.totalReceived,
					errors: result.errors,
					message: result.message,
				},
			});
		} catch (error) {
			setJsonState({
				loading: false,
				error:
					error instanceof Error
						? error.message
						: "No fue posible importar el JSON.",
			});
		}
	};

	const onSelectFile = (
		key: ImportKey,
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file) return;
		void onPrepareFile(key, file);
		event.target.value = "";
	};

	const tableProgress =
		runState.totalTables > 0
			? Math.round((runState.processedTables / runState.totalTables) * 100)
			: 0;
	const analysisProgress =
		runState.totalClaims > 0
			? Math.round((runState.processedClaims / runState.totalClaims) * 100)
			: 0;
	const runLabel = runState.running
		? runState.phase === "analyzing"
			? "Analizando"
			: "Importando"
		: "Empezar";

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8 dark:bg-slate-950 dark:text-slate-100">
			<div className="mx-auto max-w-6xl space-y-6">
				<Link
					className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
					to="/"
				>
					<ArrowLeft aria-hidden size={16} />
					Volver
				</Link>

				<header className="border-b border-slate-200 pb-5 dark:border-slate-800">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
						<FileSpreadsheet aria-hidden size={15} />
						Importacion
					</div>
					<h1 className="mt-1 text-2xl font-bold tracking-tight">
						Importacion CSV por tabla
					</h1>
					<p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
						Prepara archivos independientes y ejecuta la carga con un solo
						inicio controlado.
					</p>
				</header>

				<section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex items-start gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
								{runState.phase === "done" ? (
									<CheckCircle2 aria-hidden size={18} />
								) : (
									<Clock3 aria-hidden size={18} />
								)}
							</div>
							<div>
								<h2 className="text-base font-bold">
									Cola de importacion y analisis
								</h2>
								<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
									{stagedConfigs.length > 0
										? `${stagedConfigs.length} archivo${stagedConfigs.length === 1 ? "" : "s"} preparado${stagedConfigs.length === 1 ? "" : "s"} (${stagedRowsTotal} filas).`
										: runState.phase === "done"
											? "Ejecucion finalizada."
											: "Sin archivos preparados."}
								</p>
								{runState.error ? (
									<p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
										{runState.error}
									</p>
								) : null}
							</div>
						</div>
						<button
							className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
							disabled={!canStartImport}
							onClick={onStartImportAndAnalysis}
							type="button"
						>
							{runState.running ? (
								<Loader2 aria-hidden className="animate-spin" size={17} />
							) : (
								<PlayCircle aria-hidden size={17} />
							)}
							{runLabel}
						</button>
					</div>

					{runState.running || runState.phase === "done" ? (
						<div className="mt-4 grid gap-3 md:grid-cols-2">
							<ProgressLine
								label="Carga"
								percent={tableProgress}
								value={`${runState.processedTables}/${runState.totalTables}`}
							/>
							<ProgressLine
								label="Analisis IA"
								percent={analysisProgress}
								value={`${runState.processedClaims}/${runState.totalClaims}`}
							/>
						</div>
					) : null}
				</section>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{importConfigs.map((config) => (
						<ImportCard
							config={config}
							key={config.key}
							onSelectFile={onSelectFile}
							state={states[config.key]}
							inputRef={(element) => {
								fileInputRefs.current[config.key] = element;
							}}
							onTriggerFile={() => fileInputRefs.current[config.key]?.click()}
							onDownloadTemplate={() => downloadTemplate(config)}
						/>
					))}
				</div>

				<section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
								<FileText aria-hidden size={15} />
								Importar JSON
							</div>
							<h2 className="mt-1 text-lg font-bold">Importar JSON</h2>
							<p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
								Pega un arreglo JSON y selecciona la tabla destino para
								guardarlo en Convex con las mismas validaciones.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<select
								className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
								onChange={(event) =>
									setJsonImportKey(event.target.value as ImportKey)
								}
								value={jsonImportKey}
							>
								{importConfigs.map((config) => (
									<option key={config.key} value={config.key}>
										{config.title}
									</option>
								))}
							</select>
							<button
								className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950"
								disabled={jsonState.loading}
								onClick={onImportJson}
								type="button"
							>
								<Upload aria-hidden size={16} />
								{jsonState.loading ? "Importando" : "Importar JSON"}
							</button>
						</div>
					</div>

					<textarea
						className="mt-4 min-h-44 w-full rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-slate-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
						onChange={(event) => setJsonPayload(event.target.value)}
						placeholder='[{"claim_id":"PUB-001","policy_id":"POL-1","customer_id":"CUST-1","claim_amount":1200}]'
						value={jsonPayload}
					/>

					{jsonState.error ? (
						<p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-100">
							{jsonState.error}
						</p>
					) : null}

					{jsonState.feedback ? (
						<div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
							<p>{jsonState.feedback.message}</p>
							<p className="mt-1 text-xs">
								Insertados: {jsonState.feedback.inserted} | Omitidos:{" "}
								{jsonState.feedback.skipped}
							</p>
							{jsonState.feedback.errors.length > 0 ? (
								<ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
									{jsonState.feedback.errors.map((error) => (
										<li key={error}>{error}</li>
									))}
								</ul>
							) : null}
						</div>
					) : null}
				</section>
			</div>
		</div>
	);
}

type ImportCardProps = {
	config: ImportConfig;
	state: ImportState;
	onSelectFile: (key: ImportKey, event: ChangeEvent<HTMLInputElement>) => void;
	inputRef: (element: HTMLInputElement | null) => void;
	onTriggerFile: () => void;
	onDownloadTemplate: () => void;
};

function ProgressLine({
	label,
	percent,
	value,
}: {
	label: string;
	percent: number;
	value: string;
}) {
	return (
		<div>
			<div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
				<span>{label}</span>
				<span>{value}</span>
			</div>
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
				<div
					className="h-full rounded-full bg-slate-950 transition-all duration-300 dark:bg-slate-100"
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	);
}

function ImportCard({
	config,
	state,
	onSelectFile,
	inputRef,
	onTriggerFile,
	onDownloadTemplate,
}: ImportCardProps) {
	const Icon = config.icon;
	const buttonLabel = state.loading
		? "Procesando"
		: state.rows
			? "Cambiar CSV"
			: "Elegir CSV";

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<Icon aria-hidden className="text-slate-500" size={18} />
					{config.title}
				</div>
				{state.fileName ? (
					<span className="truncate text-xs text-slate-500 dark:text-slate-400">
						{state.fileName}
					</span>
				) : null}
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				<button
					className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900"
					disabled={state.loading}
					onClick={onTriggerFile}
					type="button"
				>
					<Upload aria-hidden size={14} />
					{buttonLabel}
				</button>
				<button
					className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
					onClick={onDownloadTemplate}
					type="button"
				>
					<Download aria-hidden size={14} />
					Plantilla
				</button>
				<input
					hidden
					ref={inputRef}
					onChange={(event) => onSelectFile(config.key, event)}
					type="file"
					accept=".csv"
				/>
			</div>

			{state.rows ? (
				<p className="mt-3 rounded-md bg-sky-50 p-2 text-xs text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
					Listo: {state.rows.length} filas preparadas.
				</p>
			) : null}

			{state.error ? (
				<p className="mt-3 rounded-md bg-rose-50 p-2 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-100">
					{state.error}
				</p>
			) : null}

			{state.feedback ? (
				<div className="mt-3 rounded-md bg-emerald-50 p-2 text-xs text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
					<p>{state.feedback.message}</p>
					<p className="mt-1">
						Insertados: {state.feedback.inserted} | Omitidos:{" "}
						{state.feedback.skipped}
					</p>
					{state.feedback.errors.length > 0 ? (
						<ul className="mt-2 list-disc space-y-1 pl-4">
							{state.feedback.errors.map((error) => (
								<li key={error}>{error}</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	);
}

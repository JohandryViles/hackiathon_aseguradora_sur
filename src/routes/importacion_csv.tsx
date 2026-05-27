import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import {
	ArrowLeft,
	Building2,
	FileCheck2,
	FileSpreadsheet,
	FileText,
	ShieldCheck,
	Upload,
	Users,
} from "lucide-react";
import { type ChangeEvent, type ComponentType, useRef, useState } from "react";

import { api } from "../../convex/_generated/api";
import { parseCsvRows } from "../lib/importPayload";

export const Route = createFileRoute("/importacion_csv")({
	component: ImportacionCsv,
});

type ImportKey =
	| "claims"
	| "policies"
	| "insureds"
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
	loading: boolean;
	feedback?: ImportFeedback;
	error?: string;
};

type ImportConfig = {
	key: ImportKey;
	title: string;
	tableName: string;
	icon: ComponentType<{ className?: string; size?: number }>;
	requiredColumns: string[];
};

const importConfigs: ImportConfig[] = [
	{
		key: "claims",
		title: "Siniestros",
		tableName: "claims",
		icon: ShieldCheck,
		requiredColumns: ["claim_id", "policy_id", "customer_id", "claim_amount"],
	},
	{
		key: "policies",
		title: "Polizas",
		tableName: "policies",
		icon: FileText,
		requiredColumns: ["policy_id", "customer_id"],
	},
	{
		key: "insureds",
		title: "Asegurados",
		tableName: "insureds",
		icon: Users,
		requiredColumns: ["customer_id"],
	},
	{
		key: "providers",
		title: "Beneficiarios",
		tableName: "providers",
		icon: Building2,
		requiredColumns: ["provider_id"],
	},
	{
		key: "documents",
		title: "Documentos",
		tableName: "claimDocuments",
		icon: FileCheck2,
		requiredColumns: ["claim_id", "document_type"],
	},
];

function createInitialState(): Record<ImportKey, ImportState> {
	return {
		claims: { loading: false },
		policies: { loading: false },
		insureds: { loading: false },
		providers: { loading: false },
		documents: { loading: false },
	};
}

function ImportacionCsv() {
	const [states, setStates] = useState<Record<ImportKey, ImportState>>(
		createInitialState,
	);
	const importClaims = useMutation(api.claims.importPublicClaims);
	const importPolicies = useMutation(api.claims.importPolicies);
	const importInsureds = useMutation(api.claims.importInsureds);
	const importProviders = useMutation(api.claims.importProviders);
	const importDocuments = useMutation(api.claims.importClaimDocuments);

	const updateState = (key: ImportKey, state: Partial<ImportState>) => {
		setStates((current) => ({
			...current,
			[key]: { ...current[key], ...state },
		}));
	};

	const onImportFile = async (key: ImportKey, file: File) => {
		updateState(key, {
			fileName: file.name,
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

			const result =
				key === "claims"
					? await importClaims({
							datasetName: file.name.replace(/\.[^/.]+$/, ""),
							rows,
						})
					: key === "policies"
						? await importPolicies({ rows })
						: key === "insureds"
							? await importInsureds({ rows })
							: key === "providers"
								? await importProviders({ rows })
								: await importDocuments({ rows });

			updateState(key, {
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
			updateState(key, {
				loading: false,
				error:
					error instanceof Error
						? error.message
						: "No fue posible importar el archivo.",
			});
		}
	};

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
						Carga archivos independientes para guardar cada grupo de registros
						en su tabla de Convex.
					</p>
				</header>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{importConfigs.map((config) => (
						<ImportCard
							config={config}
							key={config.key}
							onImportFile={onImportFile}
							state={states[config.key]}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function ImportCard({
	config,
	onImportFile,
	state,
}: {
	config: ImportConfig;
	onImportFile: (key: ImportKey, file: File) => Promise<void>;
	state: ImportState;
}) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const Icon = config.icon;

	const onSelected = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		await onImportFile(config.key, file);
		event.target.value = "";
	};

	return (
		<section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
						<Icon aria-hidden size={15} />
						{config.tableName}
					</div>
					<h2 className="mt-1 text-lg font-bold">{config.title}</h2>
				</div>
				<button
					className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950"
					disabled={state.loading}
					onClick={() => inputRef.current?.click()}
					type="button"
				>
					<Upload aria-hidden size={16} />
					{state.loading ? "Importando" : "CSV"}
				</button>
			</div>

			<input
				accept=".csv,text/csv"
				className="hidden"
				onChange={onSelected}
				ref={inputRef}
				type="file"
			/>

			<div className="mt-4 space-y-3 text-sm">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
						Columnas clave
					</p>
					<p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">
						{config.requiredColumns.join(", ")}
					</p>
				</div>

				{state.fileName ? (
					<p className="truncate text-xs text-slate-600 dark:text-slate-300">
						{state.fileName}
					</p>
				) : null}

				{state.error ? (
					<p className="rounded-md bg-rose-50 p-3 text-rose-800 dark:bg-rose-950/50 dark:text-rose-100">
						{state.error}
					</p>
				) : null}

				{state.feedback ? (
					<div className="rounded-md bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
						<p>
							{state.feedback.inserted} insertados / {state.feedback.skipped}{" "}
							omitidos.
						</p>
						<p className="mt-1 text-xs">
							Total recibido: {state.feedback.totalReceived}
						</p>
						{state.feedback.errors.length > 0 ? (
							<p className="mt-1 text-xs">
								{state.feedback.errors.join(" | ")}
							</p>
						) : null}
					</div>
				) : null}
			</div>
		</section>
	);
}

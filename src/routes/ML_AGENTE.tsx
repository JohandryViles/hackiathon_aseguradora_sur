import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	ArrowLeft,
	Bot,
	Brain,
	ClipboardList,
	FileSearch,
	Gauge,
	MessageSquareText,
	ShieldCheck,
} from "lucide-react";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/ML_AGENTE")({
	component: MlAgente,
});

function MlAgente() {
	const summary = useQuery(api.claims.getSummary, {});

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8 dark:bg-slate-950 dark:text-slate-100">
			<div className="mx-auto max-w-6xl space-y-6">
				<Link
					className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
					to="/"
				>
					<ArrowLeft aria-hidden size={16} />
					Volver al dashboard
				</Link>

				<header className="border-b border-slate-200 pb-5 dark:border-slate-800">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
						<Brain aria-hidden size={15} />
						ML + Agente
					</div>
					<h1 className="mt-1 text-2xl font-bold tracking-tight">
						IA supervisada y agente de consultas
					</h1>
					<p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
						Detalle del enfoque hibrido: modelo supervisado, reglas explicables
						y consultas en lenguaje natural para apoyar al analista.
					</p>
				</header>

				<section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
					<div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
						<div className="flex items-center gap-2 text-sm font-semibold">
							<Brain aria-hidden className="text-slate-500" size={18} />
							Modelo supervisado
						</div>
						<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
							El modelo usa RandomForestClassifier entrenado con datos sinteticos.
							Su salida principal es una probabilidad que se convierte en score
							ML para priorizar posibles casos de revision.
						</p>
						<div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
							<InfoBox
								label="Version"
								value={summary?.modelVersion ?? "sklearn-random-forest-v1"}
							/>
							<InfoBox label="Precision" value="0.9306" />
							<InfoBox label="Recall" value="0.9853" />
							<InfoBox label="F1-score" value="0.9571" />
							<InfoBox label="ROC-AUC" value="0.9980" />
							<InfoBox
								label="Score ML promedio"
								value={summary?.averageMlRiskScore ?? 0}
							/>
						</div>
					</div>

					<div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
						<div className="flex items-center gap-2 text-sm font-semibold">
							<Gauge aria-hidden className="text-slate-500" size={18} />
							Score hibrido
						</div>
						<div className="mt-4 rounded-md bg-slate-50 p-4 font-mono text-sm dark:bg-slate-950">
							score_final = 0.55 * ML + 0.45 * reglas
						</div>
						<ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
							<li>ML detecta patrones estadisticos en los siniestros.</li>
							<li>Reglas explican senales de negocio al analista.</li>
							<li>El resultado genera una alerta, no una acusacion.</li>
						</ul>
					</div>
				</section>

				<section className="grid gap-4 lg:grid-cols-3">
					<FeatureCard
						icon={ShieldCheck}
						title="Reglas explicables"
						description="Monto atipico, documentos inconsistentes, proveedor recurrente, vigencia cercana y similitud narrativa."
					/>
					<FeatureCard
						icon={MessageSquareText}
						title="NLP"
						description="La narrativa del siniestro se usa para detectar similitudes y patrones repetidos entre reclamos."
					/>
					<FeatureCard
						icon={Bot}
						title="Agente IA"
						description="El analista puede preguntar por riesgo, proveedores, ciudades, documentos y explicaciones por caso."
					/>
				</section>

				<section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<ClipboardList aria-hidden className="text-slate-500" size={18} />
						Consultas soportadas
					</div>
					<div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
						<QueryExample text="10 casos de mayor riesgo" />
						<QueryExample text="por que CLM-00001 fue marcado" />
						<QueryExample text="proveedores con mas alertas" />
						<QueryExample text="documentos faltantes en casos criticos" />
					</div>
				</section>
			</div>
		</div>
	);
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
				{label}
			</p>
			<p className="mt-1 truncate font-semibold">
				{value.toLocaleString("en-US")}
			</p>
		</div>
	);
}

function FeatureCard({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof Brain;
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
			<Icon aria-hidden className="text-slate-500" size={20} />
			<h2 className="mt-3 font-semibold">{title}</h2>
			<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
				{description}
			</p>
		</div>
	);
}

function QueryExample({ text }: { text: string }) {
	return (
		<div className="flex items-center gap-2 rounded-md bg-slate-50 p-3 dark:bg-slate-950">
			<FileSearch aria-hidden className="shrink-0 text-slate-500" size={16} />
			<span>{text}</span>
		</div>
	);
}

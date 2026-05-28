import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Bot, Gauge } from "lucide-react";

import { AssistantPanel } from "@/features/chat-ia/components/AssistantPanel";
import { useAssistant } from "@/features/chat-ia/hooks/useAssistant";
import { api } from "../../convex/_generated/api";
import { AlertConcentrationCard } from "@/features/dashboard/components/AlertConcentrationCard";
import { InfoLine } from "@/features/dashboard/components/InfoLine";
import { quickQuestions } from "@/features/chat-ia/constants";
import { RecentPrioritySection } from "@/features/dashboard/components/RecentPrioritySection";
import { RiskCard } from "@/features/dashboard/components/RiskCard";
import { SectionHeader } from "@/features/dashboard/components/SectionHeader";
import { Sidebar, navItems } from "@/features/dashboard/components/Sidebar";
import { SummaryMetrics } from "@/features/dashboard/components/SummaryMetrics";
import { TopBar } from "@/features/dashboard/components/TopBar";
import { FriendlyRouteError } from "@/shared/components/FriendlyRouteError";
import { useExportCsv } from "@/shared/hooks/useExportCsv";
import { useTheme } from "@/shared/hooks/useTheme";
import { riskLevelText } from "@/shared/utils/riskLevelText";

export const Route = createFileRoute("/")({
	component: Home,
	errorComponent: FriendlyRouteError,
});

function Home() {
	const {
		nlQuestion,
		setNlQuestion,
		assistantResponse,
		assistantLoading,
		assistantError,
		onAsk,
		askQuickQuestion,
	} = useAssistant();
	const { isDarkMode, toggleTheme } = useTheme();
	const { exportClaimsCsv } = useExportCsv();
	const summary = useQuery(api.claims.getSummary, {});
	const exportClaims = useQuery(api.claims.listWithRisk, { limit: 200 });
	const currentClaims = exportClaims ?? [];
	const recentRedClaims = currentClaims
		.filter((claim) => claim.riskLevel === "red")
		.slice(0, 5);
	const recentYellowClaims = currentClaims
		.filter((claim) => claim.riskLevel === "yellow")
		.slice(0, 5);

	return (
		<div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100 dark:[background-image:radial-gradient(1200px_600px_at_10%_-10%,rgba(56,189,248,0.12),transparent),radial-gradient(1200px_600px_at_90%_10%,rgba(59,130,246,0.10),transparent)]">
			<div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
				<Sidebar />

				<main className="min-w-0">
					<TopBar
						canExport={currentClaims.length > 0}
						isDarkMode={isDarkMode}
						onExport={() => exportClaimsCsv(currentClaims)}
						onToggleTheme={toggleTheme}
					/>

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

							<SummaryMetrics
								total={summary?.total ?? 0}
								averageRiskScore={summary?.averageRiskScore ?? 0}
								averageMlRiskScore={summary?.averageMlRiskScore ?? 0}
								estimatedSavingsOpportunity={summary?.estimatedSavingsOpportunity ?? 0}
							/>

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

								<AlertConcentrationCard
									providers={summary?.topProviders ?? []}
									cities={summary?.topCities ?? []}
									lines={summary?.topLines ?? []}
								/>
							</div>
						</section>

						<RecentPrioritySection
							recentRedClaims={recentRedClaims}
							recentYellowClaims={recentYellowClaims}
						/>

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
							<AssistantPanel
								assistantError={assistantError}
								assistantLoading={assistantLoading}
								assistantResponse={assistantResponse}
								nlQuestion={nlQuestion}
								onAsk={onAsk}
								onQuestionChange={setNlQuestion}
								onQuickQuestion={askQuickQuestion}
								quickQuestions={quickQuestions}
								riskLevelText={riskLevelText}
							/>
						</section>
					</div>
				</main>
			</div>
		</div>
	);
}


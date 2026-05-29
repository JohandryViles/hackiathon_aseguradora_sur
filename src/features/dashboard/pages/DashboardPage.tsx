import { useQuery } from "convex/react";
import { useEffect } from "react";

import { AssistantSection } from "@/features/chat-ia/pages/AssistantSection";
import { useAssistant } from "@/features/chat-ia/hooks/useAssistant";
import { api } from "@/shared/services/convexApi";
import { quickQuestions } from "@/features/chat-ia/constants";
import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { DataModelSection } from "@/features/dashboard/components/DataModelSection";
import { RecentPrioritySection } from "@/features/dashboard/components/RecentPrioritySection";
import { Sidebar } from "@/features/dashboard/components/Sidebar";
import { TopBar } from "@/features/dashboard/components/TopBar";
import { navItems } from "@/shared/constants/navigation";
import { useExportCsv } from "@/shared/hooks/useExportCsv";
import { useTheme } from "@/shared/hooks/useTheme";
import { riskLevelText } from "@/shared/utils/riskLevelText";

export function DashboardPage() {
	const {
		nlQuestion,
		setNlQuestion,
		assistantResponse,
		assistantLoading,
		assistantError,
		onAsk,
	} = useAssistant();
	const { isDarkMode, toggleTheme } = useTheme();
	const { exportClaimsCsv } = useExportCsv();
	const summary = useQuery(api.claims.getSummary, {});
	const exportClaims = useQuery(api.claims.listWithRisk, { limit: 200 });
	const redPriorityClaims = useQuery(api.claims.listWithRisk, {
		riskLevel: "red",
		limit: 5,
	});
	const yellowPriorityClaims = useQuery(api.claims.listWithRisk, {
		riskLevel: "yellow",
		limit: 5,
	});
	const currentClaims = exportClaims ?? [];
	const recentRedClaims = redPriorityClaims ?? [];
	const recentYellowClaims = yellowPriorityClaims ?? [];
	const claimNumbers = [
		...new Set(
			[...currentClaims, ...recentRedClaims, ...recentYellowClaims].map(
				(claim) => claim.claimNumber,
			),
		),
	];

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const reviewQuestion = params.get("review");
		if (reviewQuestion) setNlQuestion(reviewQuestion);
	}, [setNlQuestion]);

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
						<DashboardOverview
							total={summary?.total ?? 0}
							averageRiskScore={summary?.averageRiskScore ?? 0}
							averageMlRiskScore={summary?.averageMlRiskScore ?? 0}
							estimatedSavingsOpportunity={summary?.estimatedSavingsOpportunity ?? 0}
							red={summary?.byLevel?.red ?? 0}
							yellow={summary?.byLevel?.yellow ?? 0}
							green={summary?.byLevel?.green ?? 0}
							providers={summary?.topProviders ?? []}
							cities={summary?.topCities ?? []}
							lines={summary?.topLines ?? []}
						/>

						<RecentPrioritySection
							recentRedClaims={recentRedClaims}
							recentYellowClaims={recentYellowClaims}
						/>

						<DataModelSection
							policies={summary?.dataModelCounts?.policies ?? 0}
							insureds={summary?.dataModelCounts?.insureds ?? 0}
							vehicles={summary?.dataModelCounts?.vehicles ?? 0}
							providers={summary?.dataModelCounts?.providers ?? 0}
							documents={summary?.dataModelCounts?.documents ?? 0}
							publicCount={summary?.bySource?.public ?? 0}
						/>

						<AssistantSection
							assistantError={assistantError}
							assistantLoading={assistantLoading}
							assistantResponse={assistantResponse}
							nlQuestion={nlQuestion}
							onAsk={onAsk}
							onQuestionChange={setNlQuestion}
							quickQuestions={quickQuestions}
							claimNumbers={claimNumbers}
							riskLevelText={riskLevelText}
						/>
					</div>
				</main>
			</div>
		</div>
	);
}

import { Gauge } from "lucide-react";

import { AlertConcentrationCard } from "@/features/dashboard/components/AlertConcentrationCard";
import { RiskSummary } from "@/features/dashboard/components/RiskSummary";
import { SectionHeader } from "@/features/dashboard/components/SectionHeader";
import { SummaryMetrics } from "@/features/dashboard/components/SummaryMetrics";

type DashboardOverviewProps = {
	total: number;
	averageRiskScore: number;
	averageMlRiskScore: number;
	estimatedSavingsOpportunity: number;
	red: number;
	yellow: number;
	green: number;
	providers: Array<{ label: string; count: number }>;
	cities: Array<{ label: string; count: number }>;
	lines: Array<{ label: string; count: number }>;
};

export function DashboardOverview({
	total,
	averageRiskScore,
	averageMlRiskScore,
	estimatedSavingsOpportunity,
	red,
	yellow,
	green,
	providers,
	cities,
	lines,
}: DashboardOverviewProps) {
	return (
		<section className="space-y-4" id="resumen">
			<SectionHeader
				icon={Gauge}
				kicker="Resumen operativo"
				title="Prioriza casos para revision humana"
				description="Score hibrido con modelo scikit-learn y reglas explicables. El resultado es una alerta, no una acusacion."
			/>

			<SummaryMetrics
				total={total}
				averageRiskScore={averageRiskScore}
				averageMlRiskScore={averageMlRiskScore}
				estimatedSavingsOpportunity={estimatedSavingsOpportunity}
			/>

			<div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
				<RiskSummary red={red} yellow={yellow} green={green} />
				<AlertConcentrationCard
					providers={providers}
					cities={cities}
					lines={lines}
				/>
			</div>
		</section>
	);
}

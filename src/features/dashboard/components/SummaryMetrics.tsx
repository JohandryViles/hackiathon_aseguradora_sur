import { Brain, ClipboardList, Gauge, ShieldCheck } from "lucide-react";

import { MetricCard } from "@/features/dashboard/components/MetricCard";

type SummaryMetricsProps = {
	total: number;
	averageRiskScore: number;
	averageMlRiskScore: number;
	estimatedSavingsOpportunity: number;
};

export function SummaryMetrics({
	total,
	averageRiskScore,
	averageMlRiskScore,
	estimatedSavingsOpportunity,
}: SummaryMetricsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<MetricCard icon={ClipboardList} label="Total siniestros" value={total} />
			<MetricCard icon={Gauge} label="Score promedio" value={averageRiskScore} />
			<MetricCard
				icon={Brain}
				label="Score ML promedio"
				value={averageMlRiskScore}
			/>
			<MetricCard
				icon={ShieldCheck}
				label="Ahorro simulado"
				value={estimatedSavingsOpportunity}
				money
			/>
		</div>
	);
}

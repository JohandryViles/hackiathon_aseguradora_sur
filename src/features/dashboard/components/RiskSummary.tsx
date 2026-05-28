import { RiskCard } from "@/features/dashboard/components/RiskCard";

type RiskSummaryProps = {
	red: number;
	yellow: number;
	green: number;
};

export function RiskSummary({ red, yellow, green }: RiskSummaryProps) {
	return (
		<div className="grid gap-4 md:grid-cols-3">
			<RiskCard color="red" label="Alto" value={red} />
			<RiskCard color="yellow" label="Medio" value={yellow} />
			<RiskCard color="green" label="Bajo" value={green} />
		</div>
	);
}

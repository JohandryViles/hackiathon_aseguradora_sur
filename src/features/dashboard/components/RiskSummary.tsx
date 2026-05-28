import { RiskCard } from "@/features/dashboard/components/RiskCard";

type RiskSummaryProps = {
	red: number;
	yellow: number;
	green: number;
};

export function RiskSummary({ red, yellow, green }: RiskSummaryProps) {
	return (
		<div className="grid gap-4 md:grid-cols-3">
			<RiskCard color="red" label="Rojo Alto" value={red} />
			<RiskCard color="yellow" label="Amarillo Medio" value={yellow} />
			<RiskCard color="green" label="Verde Bajo" value={green} />
		</div>
	);
}

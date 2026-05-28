import { formatNumber } from "@/shared/utils/formatNumber";

type RiskCardProps = {
	color: "red" | "yellow" | "green";
	label: string;
	value: number;
};

export function RiskCard({ color, label, value }: RiskCardProps) {
	const styles = {
		red: "border-rose-200 bg-rose-50 text-rose-900",
		yellow: "border-amber-200 bg-amber-50 text-amber-900",
		green: "border-emerald-200 bg-emerald-50 text-emerald-900",
	};

	return (
		<article className={`rounded-lg border p-4 ${styles[color]}`}>
			<p className="text-xs font-semibold uppercase tracking-wide">
				{label}
			</p>
			<p className="mt-3 text-3xl font-bold">
				{formatNumber(value)}
			</p>
		</article>
	);
}

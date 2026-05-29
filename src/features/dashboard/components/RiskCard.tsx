import { formatNumber } from "@/shared/utils/formatNumber";

type RiskCardProps = {
	color: "red" | "yellow" | "green";
	label: string;
	value: number;
};

export function RiskCard({ color, label, value }: RiskCardProps) {
	const styles = {
		red: "border-rose-200/90 bg-rose-50/95 text-rose-900 shadow-sm shadow-rose-200/50 dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-100 dark:shadow-black/20",
		yellow:
			"border-amber-200/90 bg-amber-50/95 text-amber-900 shadow-sm shadow-amber-200/50 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100 dark:shadow-black/20",
		green:
			"border-emerald-200/90 bg-emerald-50/95 text-emerald-900 shadow-sm shadow-emerald-200/50 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100 dark:shadow-black/20",
	};

	return (
		<article
			className={`rounded-xl border p-4 transition-[transform,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-md ${styles[color]}`}
		>
			<p className="text-xs font-semibold uppercase tracking-wide">
				{label}
			</p>
			<p className="mt-3 text-3xl font-bold">
				{formatNumber(value)}
			</p>
		</article>
	);
}

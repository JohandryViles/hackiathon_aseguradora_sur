import { formatNumber } from "@/shared/utils/formatNumber";

type InfoLineProps = {
	label: string;
	value: string | number;
};

export function InfoLine({ label, value }: InfoLineProps) {
	return (
		<div className="rounded-lg border border-slate-200/70 bg-slate-50/95 p-3 shadow-sm shadow-slate-200/40 dark:border-slate-700/70 dark:bg-slate-800/60 dark:shadow-black/15">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
				{label}
			</p>
			<p className="mt-1 truncate font-semibold">
				{formatNumber(value)}
			</p>
		</div>
	);
}

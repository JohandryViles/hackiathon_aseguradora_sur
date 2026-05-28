import { formatNumber } from "@/shared/utils/formatNumber";

type InfoBoxProps = {
	label: string;
	value: string | number;
};

export function InfoBox({ label, value }: InfoBoxProps) {
	return (
		<div className="rounded-md bg-slate-50 p-3 dark:bg-slate-950">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
				{label}
			</p>
			<p className="mt-1 truncate font-semibold">
				{formatNumber(value)}
			</p>
		</div>
	);
}

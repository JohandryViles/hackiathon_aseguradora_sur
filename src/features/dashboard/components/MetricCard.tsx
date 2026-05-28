import { type ComponentType } from "react";

import { formatNumber } from "@/shared/utils/formatNumber";

type IconComponent = ComponentType<{ className?: string; size?: number }>;

type MetricCardProps = {
	icon: IconComponent;
	label: string;
	value: number;
	money?: boolean;
};

export function MetricCard({ icon: Icon, label, value, money }: MetricCardProps) {
	return (
		<article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
			<div className="flex items-center justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
					{label}
				</p>
				<Icon
					aria-hidden
					className="text-slate-400 dark:text-slate-500"
					size={18}
				/>
			</div>
			<p className="mt-3 text-2xl font-bold">
				{money ? "$" : ""}
				{formatNumber(value)}
			</p>
		</article>
	);
}

import type { ComponentType } from "react";

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
		<article className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/60 transition-[transform,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-300/40 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/25 dark:hover:shadow-black/35">
			<div className="flex items-center justify-between gap-3">
				<p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
					{label}
				</p>
				<Icon
					aria-hidden
					className="text-slate-400 dark:text-slate-500"
					size={18}
				/>
			</div>
			<p className="mt-3 break-words text-2xl font-bold leading-tight">
				{money ? "$" : ""}
				{formatNumber(value)}
			</p>
		</article>
	);
}

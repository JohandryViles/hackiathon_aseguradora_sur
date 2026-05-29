import type { ComponentType } from "react";

type IconComponent = ComponentType<{ className?: string; size?: number }>;

type SectionHeaderProps = {
	icon: IconComponent;
	kicker: string;
	title: string;
	description: string;
};

export function SectionHeader({
	icon: Icon,
	kicker,
	title,
	description,
}: SectionHeaderProps) {
	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
			<div>
				<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
					<Icon aria-hidden size={15} />
					{kicker}
				</div>
				<h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
				<p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
					{description}
				</p>
			</div>
		</div>
	);
}

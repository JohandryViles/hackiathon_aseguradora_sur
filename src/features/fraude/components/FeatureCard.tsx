import type { ComponentType } from "react";

const IconBase = "text-slate-500";

type FeatureCardProps = {
	icon: ComponentType<{ className?: string; size?: number }>;
	title: string;
	description: string;
};

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
	return (
		<div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
			<Icon aria-hidden className={IconBase} size={20} />
			<h2 className="mt-3 font-semibold">{title}</h2>
			<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
				{description}
			</p>
		</div>
	);
}

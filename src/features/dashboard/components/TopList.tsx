type TopListProps = {
	title: string;
	items: Array<{ label: string; count: number }>;
};

export function TopList({ title, items }: TopListProps) {
	return (
		<div>
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
				{title}
			</p>
			<ul className="mt-2 space-y-1">
				{items.map((item) => (
					<li className="flex justify-between gap-2" key={item.label}>
						<span className="truncate">{item.label}</span>
						<strong>{item.count}</strong>
					</li>
				))}
				{items.length === 0 ? (
					<li className="text-slate-500 dark:text-slate-400">Sin datos</li>
				) : null}
			</ul>
		</div>
	);
}

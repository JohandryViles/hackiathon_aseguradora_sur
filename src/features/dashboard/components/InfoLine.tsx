type InfoLineProps = {
	label: string;
	value: string | number;
};

export function InfoLine({ label, value }: InfoLineProps) {
	return (
		<div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
			<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
				{label}
			</p>
			<p className="mt-1 truncate font-semibold">
				{value.toLocaleString("en-US")}
			</p>
		</div>
	);
}

type ExportableClaim = {
	_id?: string;
	claimNumber: string;
	customerId: string;
	providerId?: string;
	locationRegion: string;
	claimAmount: number;
	mlScore: number | null;
	ruleRiskScore: number;
	riskScore: number;
	riskLevel: string;
	anomalyFlags: string[];
	recommendedAction: string;
};

type PriorityGroupProps = {
	claims: ExportableClaim[];
	color: "red" | "yellow";
	emptyText: string;
	title: string;
};

export function PriorityGroup({
	claims,
	color,
	emptyText,
	title,
}: PriorityGroupProps) {
	const styles = {
		red: {
			container:
				"border-rose-200/90 bg-rose-50/95 text-rose-950 shadow-sm shadow-rose-200/50 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100 dark:shadow-black/20",
			row: "border-rose-200/80 dark:border-rose-900/60",
		},
		yellow: {
			container:
				"border-amber-200/90 bg-amber-50/95 text-amber-950 shadow-sm shadow-amber-200/50 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100 dark:shadow-black/20",
			row: "border-amber-200/80 dark:border-amber-900/60",
		},
	};

	return (
		<div
			className={`min-w-0 rounded-xl border p-4 transition-[transform,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-md ${styles[color].container}`}
		>
			<h3 className="font-semibold">{title}</h3>
			<div className="mt-3 divide-y text-sm">
				{claims.map((claim) => (
					<div
						className={`grid gap-2 py-3 ${styles[color].row}`}
						key={claim._id ?? claim.claimNumber}
					>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="truncate font-semibold">{claim.claimNumber}</p>
								<p className="mt-0.5 text-xs opacity-80">
									{claim.customerId} - {claim.providerId ?? "Sin proveedor"}
								</p>
							</div>
							<div className="text-right">
								<p className="font-bold">{claim.riskScore}</p>
								<p className="text-xs opacity-80">score</p>
							</div>
						</div>
						<p className="break-words text-xs opacity-85">
							{claim.anomalyFlags[0] ?? claim.recommendedAction}
						</p>
					</div>
				))}
				{claims.length === 0 ? (
					<p className="py-4 text-sm opacity-80">{emptyText}</p>
				) : null}
			</div>
		</div>
	);
}

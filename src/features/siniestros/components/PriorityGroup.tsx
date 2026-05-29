import type { ProcessedClaim } from "@/shared/types/claims";

type PriorityGroupProps = {
	claims: ProcessedClaim[];
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
				"border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-100",
			row: "border-rose-200/80 dark:border-rose-900/60",
		},
		yellow: {
			container:
				"border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100",
			row: "border-amber-200/80 dark:border-amber-900/60",
		},
	};

	return (
		<div className={`min-w-0 rounded-lg border p-4 ${styles[color].container}`}>
			<h2 className="font-semibold">{title}</h2>
			<div className="mt-3 divide-y text-sm">
				{claims.map((claim) => (
					<div
						className={`grid gap-2 py-3 ${styles[color].row}`}
						key={claim._id}
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

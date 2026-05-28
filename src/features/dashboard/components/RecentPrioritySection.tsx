import { ClipboardList } from "lucide-react";

import { PriorityGroup } from "@/features/dashboard/components/PriorityGroup";
import { SectionHeader } from "@/features/dashboard/components/SectionHeader";
import type { ExportableClaim } from "@/shared/types/claims";

type RecentPrioritySectionProps = {
	recentRedClaims: ExportableClaim[];
	recentYellowClaims: ExportableClaim[];
};

export function RecentPrioritySection({
	recentRedClaims,
	recentYellowClaims,
}: RecentPrioritySectionProps) {
	return (
		<section className="space-y-4">
			<SectionHeader
				icon={ClipboardList}
				kicker="Revision"
				title="Ultimos casos por revisar"
				description="Cinco casos recientes en rojo y amarillo para priorizar la revision humana."
			/>
			<div className="grid gap-4 xl:grid-cols-2">
				<PriorityGroup
					claims={recentRedClaims}
					color="red"
					emptyText="Sin casos rojos por revisar."
					title="Prioridad urgente"
				/>
				<PriorityGroup
					claims={recentYellowClaims}
					color="yellow"
					emptyText="Sin casos amarillos por revisar."
					title="Prioridad"
				/>
			</div>
		</section>
	);
}

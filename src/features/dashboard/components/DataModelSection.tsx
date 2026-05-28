import { Gauge } from "lucide-react";

import { InfoLine } from "@/features/dashboard/components/InfoLine";
import { SectionHeader } from "@/features/dashboard/components/SectionHeader";

type DataModelSectionProps = {
	policies: number;
	insureds: number;
	vehicles: number;
	providers: number;
	documents: number;
	publicCount: number;
};

export function DataModelSection({
	policies,
	insureds,
	vehicles,
	providers,
	documents,
	publicCount,
}: DataModelSectionProps) {
	return (
		<section className="space-y-4" id="modelo">
			<SectionHeader
				icon={Gauge}
				kicker="Datos demo"
				title="Modelo de datos demo"
				description="Conteo operativo de las tablas cargadas en Convex para alimentar el dashboard y las consultas."
			/>
			<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
				<div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
					<InfoLine label="Polizas" value={policies} />
					<InfoLine label="Asegurados" value={insureds} />
					<InfoLine label="Vehiculos" value={vehicles} />
					<InfoLine label="Proveedores" value={providers} />
					<InfoLine label="Documentos" value={documents} />
					<InfoLine label="Publicos" value={publicCount} />
				</div>
			</div>
		</section>
	);
}

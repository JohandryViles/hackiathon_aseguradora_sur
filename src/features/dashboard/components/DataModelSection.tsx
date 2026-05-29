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
				kicker="Datos"
				title="Modelo de datos"
				description="Conteo operativo de las tablas cargadas en Convex para alimentar el dashboard y las consultas."
			/>
			<div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-200/60 transition-[transform,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-300/40 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-black/25 dark:hover:shadow-black/35">
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

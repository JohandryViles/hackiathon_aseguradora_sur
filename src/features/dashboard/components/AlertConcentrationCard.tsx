import { BarChart3 } from "lucide-react";

import { TopList } from "@/features/dashboard/components/TopList";

type AlertConcentrationCardProps = {
	providers: Array<{ label: string; count: number }>;
	cities: Array<{ label: string; count: number }>;
	lines: Array<{ label: string; count: number }>;
};

export function AlertConcentrationCard({
	providers,
	cities,
	lines,
}: AlertConcentrationCardProps) {
	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="font-semibold">Concentracion de alertas</h2>
					<p className="text-sm text-slate-600 dark:text-slate-300">
						Top de proveedores, ciudades y coberturas con casos no verdes.
					</p>
				</div>
				<BarChart3 className="text-slate-400 dark:text-slate-500" size={20} />
			</div>
			<div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
				<TopList title="Proveedores" items={providers} />
				<TopList title="Ciudades" items={cities} />
				<TopList title="Coberturas" items={lines} />
			</div>
		</div>
	);
}
